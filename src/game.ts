export const COLS = 8;

export interface Cell {
  shade: number;    // 1-4 grayscale tone
  blockId: number;  // groups cells into one movable block
}

export interface GameState {
  grid: (Cell | null)[][];  // grid[row][col], row 0 = bottom
  nextBlockId: number;
  cellSize: number;
  canvasW: number;
  canvasH: number;
  visibleRows: number;
  scrollY: number;
  targetScrollY: number;
  startTime: number;
  recentFills: number[];    // track recent row fill counts to avoid repetition
}

// ── Setup ──────────────────────────────────────────────────────────────────

function calcDimensions(viewW: number, viewH: number) {
  const canvasW = Math.min(viewW, Math.floor(viewH * 0.52));
  const cellSize = canvasW / COLS;
  const visibleRows = Math.floor(viewH / cellSize);
  return { canvasW, cellSize, visibleRows };
}

export function createState(viewW: number, viewH: number): GameState {
  const d = calcDimensions(viewW, viewH);
  const state: GameState = {
    grid: [],
    nextBlockId: 1,
    cellSize: d.cellSize,
    canvasW: d.canvasW,
    canvasH: viewH,
    visibleRows: d.visibleRows,
    scrollY: 0,
    targetScrollY: 0,
    startTime: Date.now(),
    recentFills: [],
  };
  ensureGridSize(state);
  // Start with 3 rows
  for (let i = 0; i < 3; i++) pushNewRow(state);
  settle(state);
  return state;
}

export function resize(state: GameState, viewW: number, viewH: number): void {
  const d = calcDimensions(viewW, viewH);
  state.canvasW = d.canvasW;
  state.canvasH = viewH;
  state.cellSize = d.cellSize;
  state.visibleRows = d.visibleRows;
  ensureGridSize(state);
}

function ensureGridSize(state: GameState): void {
  while (state.grid.length < state.visibleRows + 10) {
    state.grid.push(new Array(COLS).fill(null));
  }
}

// ── Block queries ──────────────────────────────────────────────────────────

export interface BlockInfo {
  id: number;
  row: number;
  cols: number[];
  shade: number;
}

export function getBlockAt(state: GameState, col: number, row: number): BlockInfo | null {
  if (row < 0 || row >= state.grid.length || col < 0 || col >= COLS) return null;
  const cell = state.grid[row][col];
  if (!cell) return null;
  const cols: number[] = [];
  for (let c = 0; c < COLS; c++) {
    const gc = state.grid[row][c];
    if (gc && gc.blockId === cell.blockId) cols.push(c);
  }
  return { id: cell.blockId, row, cols, shade: cell.shade };
}

function getBlockById(state: GameState, blockId: number): BlockInfo | null {
  for (let r = 0; r < state.grid.length; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = state.grid[r][c];
      if (cell && cell.blockId === blockId) return getBlockAt(state, c, r);
    }
  }
  return null;
}

// ── Movement ───────────────────────────────────────────────────────────────

export function tryMoveBlock(state: GameState, blockId: number, dir: number): boolean {
  const block = getBlockById(state, blockId);
  if (!block) return false;

  const newCols = block.cols.map(c => c + dir);
  if (newCols[0] < 0 || newCols[newCols.length - 1] >= COLS) return false;

  // Collision check: only check cells that are NEW positions (not already part of this block)
  for (const nc of newCols) {
    if (!block.cols.includes(nc)) {
      const cell = state.grid[block.row][nc];
      if (cell !== null) return false;
    }
  }

  // Execute move
  const cells = block.cols.map(c => state.grid[block.row][c]!);
  for (const c of block.cols) state.grid[block.row][c] = null;
  for (let i = 0; i < newCols.length; i++) state.grid[block.row][newCols[i]] = cells[i];
  return true;
}

export function moveBlockToCol(state: GameState, blockId: number, targetLeftCol: number): void {
  for (let i = 0; i < COLS; i++) { // safety limit
    const block = getBlockById(state, blockId);
    if (!block) break;
    const currentCol = block.cols[0];
    if (currentCol === targetLeftCol) break;
    const dir = targetLeftCol > currentCol ? 1 : -1;
    if (!tryMoveBlock(state, blockId, dir)) break;
  }
}

// After the player releases the block
export function finalizeMove(state: GameState): void {
  settle(state);
  pushNewRow(state);
  settle(state);
  ensureGridSize(state);
}

// ── Gravity ────────────────────────────────────────────────────────────────

function applyGravity(state: GameState): boolean {
  let moved = false;
  // Collect unique blocks
  const seen = new Set<number>();
  const blocks: { id: number; row: number; cols: number[] }[] = [];

  for (let r = 0; r < state.grid.length; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = state.grid[r][c];
      if (cell && !seen.has(cell.blockId)) {
        seen.add(cell.blockId);
        const cols: number[] = [];
        for (let cc = 0; cc < COLS; cc++) {
          if (state.grid[r][cc]?.blockId === cell.blockId) cols.push(cc);
        }
        blocks.push({ id: cell.blockId, row: r, cols });
      }
    }
  }

  // Sort bottom-first
  blocks.sort((a, b) => a.row - b.row);

  for (const block of blocks) {
    let targetRow = block.row;
    while (targetRow > 0) {
      let canFall = true;
      for (const col of block.cols) {
        const below = state.grid[targetRow - 1][col];
        if (below !== null && below.blockId !== block.id) {
          canFall = false;
          break;
        }
      }
      if (!canFall) break;
      targetRow--;
    }
    if (targetRow !== block.row) {
      const cells = block.cols.map(c => state.grid[block.row][c]!);
      for (const c of block.cols) state.grid[block.row][c] = null;
      for (let i = 0; i < block.cols.length; i++) {
        state.grid[targetRow][block.cols[i]] = cells[i];
      }
      block.row = targetRow;
      moved = true;
    }
  }
  return moved;
}

// ── Row Clearing ───────────────────────────────────────────────────────────

function clearFullRows(state: GameState): number {
  let cleared = 0;
  for (let r = state.grid.length - 1; r >= 0; r--) {
    if (state.grid[r].every(c => c !== null)) {
      state.grid.splice(r, 1);
      cleared++;
    }
  }
  if (cleared > 0) ensureGridSize(state);
  return cleared;
}

function settle(state: GameState): number {
  let total = 0;
  for (let i = 0; i < 50; i++) {
    applyGravity(state);
    const cleared = clearFullRows(state);
    if (cleared === 0) break;
    total += cleared;
  }
  return total;
}

// ── Row Generation (smart algorithm) ───────────────────────────────────────

function pushNewRow(state: GameState): void {
  const stackH = getStackHeight(state);
  const row = generateRow(state, stackH);
  state.grid.unshift(row);
}

function generateRow(state: GameState, stackHeight: number): (Cell | null)[] {
  const row: (Cell | null)[] = new Array(COLS).fill(null);

  // ── Adaptive difficulty ──
  // When stack is tall → fewer filled cells (help the player)
  // When stack is low → more filled cells (add pressure)
  let minFill: number, maxFill: number;
  if (stackHeight > 12) { minFill = 2; maxFill = 4; }
  else if (stackHeight > 8) { minFill = 3; maxFill = 5; }
  else if (stackHeight > 4) { minFill = 4; maxFill = 6; }
  else { minFill = 5; maxFill = 7; }

  let fillTarget = minFill + Math.floor(Math.random() * (maxFill - minFill + 1));

  // Avoid repeating the same fill count 3 times in a row
  if (state.recentFills.length >= 2) {
    const last2 = state.recentFills.slice(-2);
    if (last2[0] === fillTarget && last2[1] === fillTarget) {
      fillTarget = Math.max(minFill, Math.min(maxFill,
        fillTarget + (Math.random() < 0.5 ? 1 : -1)));
    }
  }
  state.recentFills.push(fillTarget);
  if (state.recentFills.length > 10) state.recentFills.shift();

  // ── Generate blocks ──
  let filled = 0;
  let pos = 0;

  while (pos < COLS && filled < fillTarget) {
    const remaining = COLS - pos;
    const need = fillTarget - filled;

    // Gap? (not if we need all remaining space)
    if (need < remaining && Math.random() < 0.3) {
      pos++;
      continue;
    }

    const maxW = Math.min(4, remaining, need);
    const width = 1 + Math.floor(Math.random() * maxW);
    const shade = 1 + Math.floor(Math.random() * 4);

    for (let i = 0; i < width; i++) {
      row[pos + i] = { shade, blockId: state.nextBlockId };
    }
    state.nextBlockId++;
    filled += width;
    pos += width;
  }

  // ── Fairness: try to align gaps with existing gaps above ──
  // Look at the existing bottom row and try to place gaps that help
  // the player complete rows (slight assistance)
  if (state.grid.length > 0 && Math.random() < 0.3) {
    const bottomRow = state.grid[0];
    // Find columns that are empty in the bottom row
    for (let c = 0; c < COLS; c++) {
      if (bottomRow[c] === null && row[c] !== null && Math.random() < 0.2) {
        // Sometimes clear this cell to align the gap
        const cell = row[c];
        if (cell) {
          // Only remove if it doesn't orphan a block (remove entire block)
          const bid = cell.blockId;
          let blockCells = 0;
          for (let cc = 0; cc < COLS; cc++) {
            if (row[cc]?.blockId === bid) blockCells++;
          }
          if (blockCells === 1) {
            row[c] = null;
          }
        }
      }
    }
  }

  return row;
}

// ── Camera ─────────────────────────────────────────────────────────────────

export function getStackHeight(state: GameState): number {
  for (let r = state.grid.length - 1; r >= 0; r--) {
    if (state.grid[r].some(c => c !== null)) return r + 1;
  }
  return 0;
}

export function updateCamera(state: GameState): void {
  const stackH = getStackHeight(state);
  const overflow = stackH - state.visibleRows + 3;
  state.targetScrollY = Math.max(0, overflow * state.cellSize);
  state.scrollY += (state.targetScrollY - state.scrollY) * 0.1;
  if (Math.abs(state.scrollY - state.targetScrollY) < 0.5) {
    state.scrollY = state.targetScrollY;
  }
}

// ── Coordinate conversion ──────────────────────────────────────────────────

export function screenToGrid(
  state: GameState, sx: number, sy: number,
): { col: number; row: number } {
  const col = Math.floor(sx / state.cellSize);
  const row = Math.floor((state.canvasH - sy + state.scrollY) / state.cellSize);
  return { col: Math.max(0, Math.min(COLS - 1, col)), row };
}

export function rowToScreenY(state: GameState, row: number): number {
  return state.canvasH - (row + 1) * state.cellSize + state.scrollY;
}

export function colToScreenX(state: GameState, col: number): number {
  return col * state.cellSize;
}
