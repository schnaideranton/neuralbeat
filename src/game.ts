// ── Types ──────────────────────────────────────────────────────────────────

export interface Piece {
  cells: [number, number][]; // [col, row] offsets from origin
  type: number;              // block type 1-7
}

export interface DragState {
  pieceIndex: number;
  gridCol: number;
  gridRow: number;
  screenX: number;
  screenY: number;
  valid: boolean;
}

export interface GameState {
  grid: Map<string, number>;
  cols: number;
  tray: (Piece | null)[];
  dragging: DragState | null;
  cameraY: number;
  targetCameraY: number;
  startTime: number;
  cellSize: number;
  trayHeight: number;
  gridAreaHeight: number;
  visibleRows: number;
  canvasWidth: number;
  canvasHeight: number;
}

// ── Piece Definitions ──────────────────────────────────────────────────────

const SHAPES: [number, number][][] = [
  // Single
  [[0,0]],
  // Dominoes
  [[0,0],[1,0]],
  [[0,0],[0,1]],
  // Triominoes
  [[0,0],[1,0],[2,0]],
  [[0,0],[0,1],[0,2]],
  [[0,0],[1,0],[0,1]],
  [[0,0],[1,0],[1,1]],
  [[0,0],[0,1],[1,1]],
  [[1,0],[0,1],[1,1]],
  // Tetrominoes
  [[0,0],[1,0],[2,0],[3,0]],
  [[0,0],[0,1],[0,2],[0,3]],
  [[0,0],[1,0],[2,0],[1,1]],      // T
  [[0,0],[1,0],[2,0],[2,1]],      // L
  [[0,0],[1,0],[2,0],[0,1]],      // J
  [[0,0],[1,0],[1,1],[2,1]],      // S
  [[1,0],[2,0],[0,1],[1,1]],      // Z
  [[0,0],[1,0],[0,1],[1,1]],      // O
  // Pentominoes (line)
  [[0,0],[1,0],[2,0],[3,0],[4,0]],
  [[0,0],[0,1],[0,2],[0,3],[0,4]],
];

// ── Helpers ────────────────────────────────────────────────────────────────

function key(c: number, r: number): string {
  return `${c},${r}`;
}

function randInt(max: number): number {
  return Math.floor(Math.random() * max);
}

export function getMaxRow(state: GameState): number {
  let max = -1;
  for (const k of state.grid.keys()) {
    const row = parseInt(k.split(',')[1]);
    if (row > max) max = row;
  }
  return max;
}

export function getPieceBounds(piece: Piece): { w: number; h: number } {
  let maxC = 0, maxR = 0;
  for (const [c, r] of piece.cells) {
    if (c > maxC) maxC = c;
    if (r > maxR) maxR = r;
  }
  return { w: maxC + 1, h: maxR + 1 };
}

// ── Game Functions ─────────────────────────────────────────────────────────

function generatePiece(): Piece {
  const shape = SHAPES[randInt(SHAPES.length)];
  const type = randInt(7) + 1;
  return { cells: shape.map(([c, r]) => [c, r] as [number, number]), type };
}

function refillTray(state: GameState): void {
  const allPlaced = state.tray.every(p => p === null);
  if (allPlaced) {
    state.tray = [generatePiece(), generatePiece(), generatePiece()];
  }
}

export function canPlace(state: GameState, piece: Piece, col: number, row: number): boolean {
  for (const [dc, dr] of piece.cells) {
    const c = col + dc;
    const r = row + dr;
    if (c < 0 || c >= state.cols) return false;
    if (r < 0) return false;
    if (state.grid.has(key(c, r))) return false;
  }
  return true;
}

function clearRows(state: GameState): number {
  let cleared = 0;
  const maxRow = getMaxRow(state);
  if (maxRow < 0) return 0;

  // Find all complete rows
  const completedRows: number[] = [];
  for (let r = 0; r <= maxRow; r++) {
    let full = true;
    for (let c = 0; c < state.cols; c++) {
      if (!state.grid.has(key(c, r))) {
        full = false;
        break;
      }
    }
    if (full) completedRows.push(r);
  }

  if (completedRows.length === 0) return 0;

  // Remove completed rows
  for (const r of completedRows) {
    for (let c = 0; c < state.cols; c++) {
      state.grid.delete(key(c, r));
    }
  }

  // Shift rows down: rebuild grid
  // Collect all remaining cells sorted by row
  const remaining: { c: number; r: number; type: number }[] = [];
  for (const [k, type] of state.grid.entries()) {
    const [cs, rs] = k.split(',');
    remaining.push({ c: parseInt(cs), r: parseInt(rs), type });
  }
  remaining.sort((a, b) => a.r - b.r);

  state.grid.clear();
  for (const cell of remaining) {
    // Count how many cleared rows are below this cell
    let shift = 0;
    for (const cr of completedRows) {
      if (cr < cell.r) shift++;
    }
    state.grid.set(key(cell.c, cell.r - shift), cell.type);
  }

  return completedRows.length;
}

export function placePiece(state: GameState, pieceIndex: number, col: number, row: number): void {
  const piece = state.tray[pieceIndex];
  if (!piece) return;
  if (!canPlace(state, piece, col, row)) return;

  for (const [dc, dr] of piece.cells) {
    state.grid.set(key(col + dc, row + dr), piece.type);
  }

  state.tray[pieceIndex] = null;
  clearRows(state);
  refillTray(state);
}

export function updateCamera(state: GameState): void {
  const maxRow = getMaxRow(state);
  // Target: keep the top of the stack visible with some padding
  const topRowPixel = (maxRow + 3) * state.cellSize;
  const gridArea = state.gridAreaHeight;

  if (topRowPixel > gridArea) {
    state.targetCameraY = topRowPixel - gridArea;
  } else {
    state.targetCameraY = 0;
  }

  // Smooth lerp
  state.cameraY += (state.targetCameraY - state.cameraY) * 0.08;
  if (Math.abs(state.cameraY - state.targetCameraY) < 0.5) {
    state.cameraY = state.targetCameraY;
  }
}

export function createState(canvasWidth: number, canvasHeight: number): GameState {
  const cols = 8;
  const cellSize = Math.floor(canvasWidth / cols);
  const trayHeight = cellSize * 4;
  const gridAreaHeight = canvasHeight - trayHeight;
  const visibleRows = Math.ceil(gridAreaHeight / cellSize);

  const state: GameState = {
    grid: new Map(),
    cols,
    tray: [null, null, null],
    dragging: null,
    cameraY: 0,
    targetCameraY: 0,
    startTime: Date.now(),
    cellSize,
    trayHeight,
    gridAreaHeight,
    visibleRows,
    canvasWidth,
    canvasHeight,
  };

  refillTray(state);
  return state;
}

export function resize(state: GameState, w: number, h: number): void {
  state.cellSize = Math.floor(w / state.cols);
  state.trayHeight = state.cellSize * 4;
  state.gridAreaHeight = h - state.trayHeight;
  state.visibleRows = Math.ceil(state.gridAreaHeight / state.cellSize);
  state.canvasWidth = w;
  state.canvasHeight = h;
}

// Convert screen Y to grid row (row 0 is at the bottom of the grid area)
export function screenToGridRow(state: GameState, screenY: number): number {
  const gridBottom = state.gridAreaHeight;
  const pixelFromBottom = gridBottom - screenY + state.cameraY;
  return Math.floor(pixelFromBottom / state.cellSize);
}

export function screenToGridCol(state: GameState, screenX: number): number {
  return Math.floor(screenX / state.cellSize);
}

// Convert grid row to screen Y (top of the cell)
export function gridRowToScreenY(state: GameState, row: number): number {
  const gridBottom = state.gridAreaHeight;
  return gridBottom - (row + 1) * state.cellSize + state.cameraY;
}

export function gridColToScreenX(state: GameState, col: number): number {
  return col * state.cellSize;
}
