import { createState, resize, updateCamera, moveActive, confirmPiece, GameState } from './game';
import { loadAssets, drawFrame, Assets } from './render';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

let dpr = 1;
let state: GameState;
let assets: Assets;

// ── Canvas Setup ───────────────────────────────────────────────────────────

function setupCanvas(): void {
  dpr = window.devicePixelRatio || 1;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  if (state) resize(state, vw, vh);

  const w = state?.canvasW ?? vw;
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

// ── Game Loop ──────────────────────────────────────────────────────────────

function loop(): void {
  updateCamera(state);
  drawFrame(ctx, state, assets, dpr, canvas);
  requestAnimationFrame(loop);
}

// ── Resize ─────────────────────────────────────────────────────────────────

window.addEventListener('resize', setupCanvas);

// ── Input ──────────────────────────────────────────────────────────────────

function setupInput(): void {
  let touchX = 0;
  let touchY = 0;

  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    touchX = e.touches[0].clientX;
    touchY = e.touches[0].clientY;
  }, { passive: false });

  canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    const t = e.changedTouches[0];
    const dx = t.clientX - touchX;
    const dy = t.clientY - touchY;
    const rect = canvas.getBoundingClientRect();
    const x = t.clientX - rect.left;

    if (Math.abs(dx) > 30 && Math.abs(dx) > Math.abs(dy)) {
      // Swipe horizontal → move
      moveActive(state, dx > 0 ? 1 : -1);
    } else if (dy > 40) {
      // Swipe down → confirm
      confirmPiece(state);
    } else {
      // Tap: left third → left, right third → right, middle → confirm
      const third = state.canvasW / 3;
      if (x < third) moveActive(state, -1);
      else if (x > third * 2) moveActive(state, 1);
      else confirmPiece(state);
    }
  }, { passive: false });

  // Mouse (desktop)
  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const third = state.canvasW / 3;
    if (x < third) moveActive(state, -1);
    else if (x > third * 2) moveActive(state, 1);
    else confirmPiece(state);
  });

  // Keyboard (desktop)
  window.addEventListener('keydown', (e) => {
    switch (e.key) {
      case 'ArrowLeft':
        moveActive(state, -1);
        break;
      case 'ArrowRight':
        moveActive(state, 1);
        break;
      case ' ':
      case 'ArrowDown':
      case 'Enter':
        e.preventDefault();
        confirmPiece(state);
        break;
    }
  });
}

init();
