import {
  createState, resize, updateCamera,
  screenToGridRow, screenToGridCol,
  canPlace, placePiece, GameState,
} from './game';
import { loadAssets, drawFrame, hitTestTray, Assets } from './render';

// ── Setup ──────────────────────────────────────────────────────────────────

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

let dpr = window.devicePixelRatio || 1;
let state: GameState;
let assets: Assets;

function setupCanvas(): void {
  dpr = window.devicePixelRatio || 1;
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
}

async function init(): Promise<void> {
  setupCanvas();
  assets = await loadAssets();
  state = createState(window.innerWidth, window.innerHeight);
  setupInput();
  requestAnimationFrame(loop);
}

// ── Game Loop ──────────────────────────────────────────────────────────────

function loop(): void {
  updateCamera(state);
  drawFrame(ctx, state, assets, dpr);
  requestAnimationFrame(loop);
}

// ── Resize ─────────────────────────────────────────────────────────────────

window.addEventListener('resize', () => {
  setupCanvas();
  resize(state, window.innerWidth, window.innerHeight);
});

// ── Input ──────────────────────────────────────────────────────────────────

function getXY(e: MouseEvent | Touch): { x: number; y: number } {
  return { x: e.clientX, y: e.clientY };
}

function onPointerDown(x: number, y: number): void {
  const hit = hitTestTray(state, x, y);
  if (hit >= 0) {
    const piece = state.tray[hit]!;
    const gridCol = screenToGridCol(state, x);
    const gridRow = screenToGridRow(state, y);
    state.dragging = {
      pieceIndex: hit,
      gridCol,
      gridRow,
      screenX: x,
      screenY: y,
      valid: canPlace(state, piece, gridCol, gridRow),
    };
  }
}

function onPointerMove(x: number, y: number): void {
  if (!state.dragging) return;

  const piece = state.tray[state.dragging.pieceIndex];
  if (!piece) return;

  // Offset pointer up so piece appears above finger
  const offsetY = y - state.cellSize * 2;
  const gridCol = screenToGridCol(state, x);
  const gridRow = screenToGridRow(state, offsetY);

  state.dragging.gridCol = gridCol;
  state.dragging.gridRow = gridRow;
  state.dragging.screenX = x;
  state.dragging.screenY = y;
  state.dragging.valid = canPlace(state, piece, gridCol, gridRow);
}

function onPointerUp(): void {
  if (!state.dragging) return;

  if (state.dragging.valid) {
    placePiece(state, state.dragging.pieceIndex,
      state.dragging.gridCol, state.dragging.gridRow);
  }

  state.dragging = null;
}

function setupInput(): void {
  // Mouse
  canvas.addEventListener('mousedown', (e) => {
    const { x, y } = getXY(e);
    onPointerDown(x, y);
  });
  canvas.addEventListener('mousemove', (e) => {
    const { x, y } = getXY(e);
    onPointerMove(x, y);
  });
  canvas.addEventListener('mouseup', () => onPointerUp());

  // Touch
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const { x, y } = getXY(e.touches[0]);
    onPointerDown(x, y);
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const { x, y } = getXY(e.touches[0]);
    onPointerMove(x, y);
  }, { passive: false });

  canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    onPointerUp();
  }, { passive: false });
}

// ── Start ──────────────────────────────────────────────────────────────────

init();
