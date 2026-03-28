import {
  createState, resize, updateCamera,
  screenToGrid, getBlockAt, tryMoveBlock, moveBlockToCol,
  finalizeMove, GameState, BlockInfo,
} from './game';
import { loadAssets, drawFrame, Assets } from './render';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

let dpr = 1;
let state: GameState;
let assets: Assets;

// ── Drag state ─────────────────────────────────────────────────────────────

let dragBlock: BlockInfo | null = null;
let dragStartX = 0;
let dragOrigLeftCol = 0;
let hasMoved = false;

// ── Canvas setup ───────────────────────────────────────────────────────────

function setupCanvas(): void {
  dpr = window.devicePixelRatio || 1;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  if (state) resize(state, vw, vh);
  const w = state?.canvasW ?? Math.min(vw, Math.floor(vh * 0.52));
  canvas.width = w * dpr;
  canvas.height = vh * dpr;
  canvas.style.width = w + 'px';
  canvas.style.height = vh + 'px';
}

// ── Init ───────────────────────────────────────────────────────────────────

async function init(): Promise<void> {
  assets = await loadAssets();
  state = createState(window.innerWidth, window.innerHeight);
  setupCanvas();
  setupInput();
  requestAnimationFrame(loop);
}

// ── Loop ───────────────────────────────────────────────────────────────────

function loop(): void {
  updateCamera(state);
  drawFrame(ctx, state, assets, dpr, dragBlock?.id ?? null);
  requestAnimationFrame(loop);
}

window.addEventListener('resize', setupCanvas);

// ── Input ──────────────────────────────────────────────────────────────────

function onPointerDown(x: number, y: number): void {
  const rect = canvas.getBoundingClientRect();
  const cx = x - rect.left;
  const cy = y - rect.top;
  const { col, row } = screenToGrid(state, cx, cy);
  const block = getBlockAt(state, col, row);

  if (block) {
    dragBlock = block;
    dragStartX = cx;
    dragOrigLeftCol = block.cols[0];
    hasMoved = false;
  } else {
    dragBlock = null;
  }
}

function onPointerMove(x: number, y: number): void {
  if (!dragBlock) return;
  const rect = canvas.getBoundingClientRect();
  const cx = x - rect.left;
  const dx = cx - dragStartX;
  const cellsMoved = Math.round(dx / state.cellSize);
  const targetCol = dragOrigLeftCol + cellsMoved;

  if (targetCol !== dragBlock.cols[0]) {
    moveBlockToCol(state, dragBlock.id, targetCol);
    // Refresh block info
    const updated = getBlockAt(state, 0, 0); // dummy, need to re-find
    // Re-find the block
    for (let r = 0; r < state.grid.length; r++) {
      for (let c = 0; c < 8; c++) {
        const cell = state.grid[r][c];
        if (cell && cell.blockId === dragBlock.id) {
          dragBlock = getBlockAt(state, c, r);
          hasMoved = true;
          return;
        }
      }
    }
  }
}

function onPointerUp(): void {
  if (dragBlock && hasMoved) {
    finalizeMove(state);
  }
  dragBlock = null;
  hasMoved = false;
}

function setupInput(): void {
  // ── Touch ──
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const t = e.touches[0];
    onPointerDown(t.clientX, t.clientY);
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const t = e.touches[0];
    onPointerMove(t.clientX, t.clientY);
  }, { passive: false });

  canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    onPointerUp();
  }, { passive: false });

  // ── Mouse ──
  let mouseDown = false;
  canvas.addEventListener('mousedown', (e) => {
    mouseDown = true;
    onPointerDown(e.clientX, e.clientY);
  });
  canvas.addEventListener('mousemove', (e) => {
    if (mouseDown) onPointerMove(e.clientX, e.clientY);
  });
  canvas.addEventListener('mouseup', () => {
    mouseDown = false;
    onPointerUp();
  });

  // ── Keyboard (desktop) ──
  let kbSelectedBlockId: number | null = null;

  window.addEventListener('keydown', (e) => {
    // If no block selected via keyboard, select the bottom-left one
    if (kbSelectedBlockId === null) {
      for (let r = 0; r < state.grid.length; r++) {
        for (let c = 0; c < 8; c++) {
          const cell = state.grid[r][c];
          if (cell) {
            kbSelectedBlockId = cell.blockId;
            dragBlock = getBlockAt(state, c, r);
            return;
          }
        }
      }
      return;
    }

    if (e.key === 'ArrowLeft') {
      if (tryMoveBlock(state, kbSelectedBlockId, -1)) hasMoved = true;
    } else if (e.key === 'ArrowRight') {
      if (tryMoveBlock(state, kbSelectedBlockId, 1)) hasMoved = true;
    } else if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      if (hasMoved) {
        finalizeMove(state);
        hasMoved = false;
      }
      kbSelectedBlockId = null;
      dragBlock = null;
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      // Navigate to another block
      const current = getBlockAt(state, 0, 0); // find current
      // Find next block
      let found = false;
      const dir = e.key === 'ArrowUp' ? 1 : -1;
      for (let r = 0; r < state.grid.length; r++) {
        for (let c = 0; c < 8; c++) {
          const cell = state.grid[r][c];
          if (cell && cell.blockId !== kbSelectedBlockId) {
            kbSelectedBlockId = cell.blockId;
            dragBlock = getBlockAt(state, c, r);
            found = true;
            break;
          }
        }
        if (found) break;
      }
    }
  });
}

init();
