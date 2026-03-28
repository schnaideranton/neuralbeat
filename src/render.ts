import { GameState, COLS } from './game';

// ── Colors ─────────────────────────────────────────────────────────────────

const COLORS = [
  '', '#e8a0bf', '#f4c27f', '#a8d8a8', '#8ecae6', '#b8a9d4', '#f4a88a', '#7ecfb8',
];
const BORDERS = [
  '', '#d4809a', '#e0a85f', '#88b888', '#6eb0cc', '#9889b8', '#d88868', '#5cad96',
];

// ── Assets ─────────────────────────────────────────────────────────────────

export interface Assets {
  bg: HTMLImageElement | null;
  blocks: (HTMLImageElement | null)[];
}

export async function loadAssets(): Promise<Assets> {
  const assets: Assets = { bg: null, blocks: [null] };
  assets.bg = await tryLoad('assets/bg.png');
  for (let i = 1; i <= 7; i++) {
    assets.blocks[i] = await tryLoad(`assets/block_${i}.png`);
  }
  return assets;
}

function tryLoad(src: string): Promise<HTMLImageElement | null> {
  return new Promise(r => {
    const img = new Image();
    img.onload = () => r(img);
    img.onerror = () => r(null);
    img.src = src;
  });
}

// ── Block Drawing ──────────────────────────────────────────────────────────

function drawBlock(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, size: number,
  type: number, assets: Assets, alpha = 1,
): void {
  ctx.globalAlpha = alpha;
  const pad = Math.max(1, size * 0.05);
  const bx = x + pad, by = y + pad, bs = size - pad * 2;
  const rad = Math.max(2, bs * 0.12);

  const img = assets.blocks[type];
  if (img) {
    ctx.drawImage(img, bx, by, bs, bs);
  } else {
    const grad = ctx.createLinearGradient(bx, by, bx, by + bs);
    const base = COLORS[type];
    grad.addColorStop(0, lighten(base, 30));
    grad.addColorStop(1, base);

    ctx.beginPath();
    roundRect(ctx, bx, by, bs, bs, rad);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = BORDERS[type];
    ctx.lineWidth = Math.max(1, size * 0.03);
    ctx.stroke();

    // Shine
    ctx.beginPath();
    roundRect(ctx, bx + bs * 0.12, by + bs * 0.08, bs * 0.3, bs * 0.15, rad * 0.4);
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
): void {
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function lighten(hex: string, n: number): string {
  const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + n);
  const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + n);
  const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + n);
  return `rgb(${r},${g},${b})`;
}

// ── Main Draw ──────────────────────────────────────────────────────────────

export function drawFrame(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  assets: Assets,
  dpr: number,
  canvasEl: HTMLCanvasElement,
): void {
  const { canvasW, canvasH, cellSize, gridAreaH, activeAreaH, scrollY } = state;

  ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
  ctx.save();
  ctx.scale(dpr, dpr);

  // ── Background ──
  if (assets.bg) {
    ctx.drawImage(assets.bg, 0, 0, canvasW, canvasH);
  } else {
    const bg = ctx.createLinearGradient(0, 0, 0, canvasH);
    bg.addColorStop(0, '#0f0f23');
    bg.addColorStop(1, '#1a1a3e');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvasW, canvasH);
  }

  // ── Grid area (clipped) ──
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, canvasW, gridAreaH);
  ctx.clip();

  // Subtle grid lines
  ctx.strokeStyle = 'rgba(255,255,255,0.03)';
  ctx.lineWidth = 1;
  for (let c = 1; c < COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(c * cellSize, 0);
    ctx.lineTo(c * cellSize, gridAreaH);
    ctx.stroke();
  }

  // Floor line
  const floorY = gridAreaH + scrollY;
  if (floorY > 0 && floorY <= gridAreaH) {
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, floorY);
    ctx.lineTo(canvasW, floorY);
    ctx.stroke();
  }

  // Placed blocks — row 0 = bottom
  for (let r = 0; r < state.grid.length; r++) {
    const sy = gridAreaH - (r + 1) * cellSize + scrollY;
    if (sy > gridAreaH || sy < -cellSize) continue;
    for (let c = 0; c < COLS; c++) {
      if (state.grid[r][c] !== 0) {
        drawBlock(ctx, c * cellSize, sy, cellSize, state.grid[r][c], assets);
      }
    }
  }

  ctx.restore(); // unclip

  // ── Active piece area ──
  const areaTop = gridAreaH;

  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(0, areaTop, canvasW, activeAreaH);

  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, areaTop);
  ctx.lineTo(canvasW, areaTop);
  ctx.stroke();

  // Active piece
  const pieceY = areaTop + (activeAreaH - cellSize) / 2;
  for (let i = 0; i < state.active.width; i++) {
    drawBlock(ctx, (state.active.col + i) * cellSize, pieceY, cellSize, state.active.type, assets);
  }

  // Subtle left/right indicators
  ctx.fillStyle = 'rgba(255,255,255,0.07)';
  ctx.font = `${Math.round(cellSize * 0.5)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const midY = areaTop + activeAreaH / 2;
  ctx.fillText('◂', cellSize * 0.4, midY);
  ctx.fillText('▸', canvasW - cellSize * 0.4, midY);

  // ── Timer ──
  const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
  const mins = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const secs = String(elapsed % 60).padStart(2, '0');

  ctx.font = `${Math.round(cellSize * 0.4)}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillText(`${mins}:${secs}`, canvasW / 2 + 1, 13);
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fillText(`${mins}:${secs}`, canvasW / 2, 12);

  ctx.restore();
}
