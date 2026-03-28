export const COLS = 8;

export interface ActivePiece {
  col: number;
  width: number;
  type: number;
}

export interface GameState {
  grid: number[][];       // grid[row][col], row 0 = bottom. 0=empty, 1-7=type
  active: ActivePiece;
  cellSize: number;
  visibleRows: number;
  canvasW: number;
  canvasH: number;
  activeAreaH: number;
  gridAreaH: number;
  scrollY: number;
  targetScrollY: number;
  startTime: number;
}

// ── Dimensions ─────────────────────────────────────────────────────────────

function calcDimensions(viewW: number, viewH: number) {
  // Phone-like aspect ratio on desktop, full width on mobile
  const canvasW = Math.min(viewW, Math.floor(viewH * 0.52));
  const cellSize = canvasW / COLS;
  const activeAreaH = cellSize * 2;
  const gridAreaH = viewH - activeAreaH;
  const visibleRows = Math.floor(gridAreaH / cellSize);
  return { canvasW, cellSize, activeAreaH, gridAreaH, visibleRows };
}

export function createState(viewW: number, viewH: number): GameState {
  const d = calcDimensions(viewW, viewH);
  return {
    grid: [],
    active: randomPiece(),
    cellSize: d.cellSize,
    visibleRows: d.visibleRows,
    canvasW: d.canvasW,
    canvasH: viewH,
    activeAreaH: d.activeAreaH,
    gridAreaH: d.gridAreaH,
    scrollY: 0,
    targetScrollY: 0,
    startTime: Date.now(),
  };
}

export function resize(state: GameState, viewW: number, viewH: number): void {
  const d = calcDimensions(viewW, viewH);
  state.canvasW = d.canvasW;
  state.canvasH = viewH;
  state.cellSize = d.cellSize;
  state.activeAreaH = d.activeAreaH;
  state.gridAreaH = d.gridAreaH;
  state.visibleRows = d.visibleRows;
}

// ── Pieces ─────────────────────────────────────────────────────────────────

function randomPiece(): ActivePiece {
  const width = 1 + Math.floor(Math.random() * 4); // 1-4
  const type = 1 + Math.floor(Math.random() * 7);  // 1-7
  const col = Math.floor(Math.random() * (COLS - width + 1));
  return { col, width, type };
}

export function moveActive(state: GameState, dir: number): void {
  const newCol = state.active.col + dir;
  if (newCol >= 0 && newCol + state.active.width <= COLS) {
    state.active.col = newCol;
  }
}

export function confirmPiece(state: GameState): void {
  // Create new bottom row with the active piece
  const row = new Array(COLS).fill(0);
  for (let i = 0; i < state.active.width; i++) {
    row[state.active.col + i] = state.active.type;
  }

  // Insert at bottom, pushing everything up
  state.grid.unshift(row);

  applyGravity(state);
  clearRows(state);

  state.active = randomPiece();
}

// ── Gravity ────────────────────────────────────────────────────────────────

function applyGravity(state: GameState): void {
  // Per-column: compact non-empty cells down to the bottom
  for (let c = 0; c < COLS; c++) {
    let write = 0;
    for (let r = 0; r < state.grid.length; r++) {
      if (state.grid[r][c] !== 0) {
        if (r !== write) {
          state.grid[write][c] = state.grid[r][c];
          state.grid[r][c] = 0;
        }
        write++;
      }
    }
  }
}

// ── Row Clearing ───────────────────────────────────────────────────────────

function clearRows(state: GameState): void {
  state.grid = state.grid.filter(row => !row.every(cell => cell !== 0));
}

// ── Camera ─────────────────────────────────────────────────────────────────

export function getStackHeight(state: GameState): number {
  for (let r = state.grid.length - 1; r >= 0; r--) {
    if (state.grid[r].some(c => c !== 0)) return r + 1;
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
