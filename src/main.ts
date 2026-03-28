import {
  createState, resize, updateCamera,
  screenToGrid, getBlockAt, tryMoveBlock, moveBlockToCol,
  applyGravity, findAndClearRows, pushNewRow,
  rowToScreenY, colToScreenX,
  GameState, BlockInfo, GravityMove, ClearedRow,
} from './game';
import { loadAssets, drawFrame, Assets, Particle, AnimData } from './render';

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

// ── Animation state ────────────────────────────────────────────────────────

type AnimPhase = 'idle' | 'falling' | 'clearing' | 'pushing';
let animPhase: AnimPhase = 'idle';
let needsPush = false;

// Fall animation
interface FallAnim {
  blockId: number;
  offset: number;   // px above target (positive → 0)
  velocity: number;  // px/s
}
let falls: FallAnim[] = [];

// Clear particles
let particles: Particle[] = [];

// Push offset (all blocks shift)
let pushAnim = 0;

// Timing
let lastTime = 0;

// ── Animation chain ────────────────────────────────────────────────────────

function startAnimChain(): void {
  needsPush = true;
  doGravityStep();
}

function doGravityStep(): void {
  const moves = applyGravity(state);
  if (moves.length > 0) {
    falls = moves.map(m => ({
      blockId: m.blockId,
      offset: (m.fromRow - m.toRow) * state.cellSize,
      velocity: 50,
    }));
    animPhase = 'falling';
  } else {
    doClearStep();
  }
}

function doClearStep(): void {
  const cleared = findAndClearRows(state);
  if (cleared.length > 0) {
    const cs = state.cellSize;
    particles = [];
    for (const row of cleared) {
      for (const cell of row.cells) {
        particles.push({
          x: colToScreenX(state, cell.col) + cs / 2,
          y: rowToScreenY(state, row.row) + cs / 2,
          shade: cell.shade,
          scale: 1,
          alpha: 1,
          vx: (Math.random() - 0.5) * 300,
          vy: (Math.random() - 0.5) * 150 - 80,
        });
      }
    }
    animPhase = 'clearing';
  } else if (needsPush) {
    needsPush = false;
    doPushStep();
  } else {
    animPhase = 'idle';
  }
}

function doPushStep(): void {
  pushNewRow(state);
  pushAnim = state.cellSize;
  animPhase = 'pushing';
}

// ── Animation update ───────────────────────────────────────────────────────

function updateAnim(dt: number): void {
  if (animPhase === 'falling') {
    const GRAVITY = 6000; // px/s²
    let allDone = true;
    for (const f of falls) {
      if (f.offset <= 0) continue;
      f.velocity += GRAVITY * dt;
      f.offset -= f.velocity * dt;
      if (f.offset <= 0) {
        f.offset = 0;
      } else {
        allDone = false;
      }
    }
    if (allDone) {
      falls = [];
      doClearStep();
    }
  } else if (animPhase === 'clearing') {
    const SPEED = 4; // life per second (~250ms)
    let allDone = true;
    for (const p of particles) {
      if (p.alpha <= 0) continue;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 800 * dt; // gravity on particles
      p.scale = Math.max(0, p.scale - SPEED * dt);
      p.alpha = Math.max(0, p.alpha - SPEED * dt);
      if (p.alpha > 0) allDone = false;
    }
    if (allDone) {
      particles = [];
      doGravityStep(); // cascade: more gravity after clear
    }
  } else if (animPhase === 'pushing') {
    const PUSH_SPEED = state.cellSize * 8; // px/s (~125ms)
    pushAnim -= PUSH_SPEED * dt;
    if (pushAnim <= 0) {
      pushAnim = 0;
      doGravityStep(); // settle after push
    }
  }
}

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
  lastTime = performance.now();
  requestAnimationFrame(loop);
}

// ── Loop ───────────────────────────────────────────────────────────────────

function loop(now: number): void {
  const dt = Math.min((now - lastTime) / 1000, 0.05); // cap at 50ms
  lastTime = now;

  updateAnim(dt);
  updateCamera(state);

  const blockYOffsets = new Map<number, number>();
  for (const f of falls) {
    if (f.offset > 0) blockYOffsets.set(f.blockId, f.offset);
  }

  const anim: AnimData = { blockYOffsets, pushOffset: pushAnim, particles };
  drawFrame(ctx, state, assets, dpr, dragBlock?.id ?? null, anim);
  requestAnimationFrame(loop);
}

window.addEventListener('resize', setupCanvas);

// ── Input ──────────────────────────────────────────────────────────────────

function refreshDragBlock(): void {
  if (!dragBlock) return;
  for (let r = 0; r < state.grid.length; r++) {
    for (let c = 0; c < 8; c++) {
      if (state.grid[r][c]?.blockId === dragBlock.id) {
        dragBlock = getBlockAt(state, c, r);
        return;
      }
    }
  }
  dragBlock = null;
}

function onPointerDown(x: number, y: number): void {
  if (animPhase !== 'idle') return; // block input during animation
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
  if (!dragBlock || animPhase !== 'idle') return;
  const rect = canvas.getBoundingClientRect();
  const cx = x - rect.left;
  const dx = cx - dragStartX;
  const cellsMoved = Math.round(dx / state.cellSize);
  const targetCol = dragOrigLeftCol + cellsMoved;

  const current = getBlockAt(state, dragBlock.cols[0], dragBlock.row);
  if (current && current.cols[0] !== targetCol) {
    moveBlockToCol(state, dragBlock.id, targetCol);
    refreshDragBlock();
    hasMoved = true;
  }
}

function onPointerUp(): void {
  if (dragBlock && hasMoved && animPhase === 'idle') {
    startAnimChain();
  }
  dragBlock = null;
  hasMoved = false;
}

function setupInput(): void {
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    onPointerDown(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    onPointerMove(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: false });

  canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    onPointerUp();
  }, { passive: false });

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

  // Keyboard
  window.addEventListener('keydown', (e) => {
    if (animPhase !== 'idle') return;
    if (e.key === 'ArrowLeft' && dragBlock) {
      if (tryMoveBlock(state, dragBlock.id, -1)) { hasMoved = true; refreshDragBlock(); }
    } else if (e.key === 'ArrowRight' && dragBlock) {
      if (tryMoveBlock(state, dragBlock.id, 1)) { hasMoved = true; refreshDragBlock(); }
    } else if ((e.key === ' ' || e.key === 'Enter') && hasMoved) {
      e.preventDefault();
      startAnimChain();
      dragBlock = null;
      hasMoved = false;
    }
  });
}

init();
