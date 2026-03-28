import { GameState, COLS, rowToScreenY, colToScreenX } from './game';

// ── roundRect polyfill ─────────────────────────────────────────────────────

if (typeof CanvasRenderingContext2D !== 'undefined' &&
    !CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (
    x: number, y: number, w: number, h: number, r: number | number[],
  ) {
    const rad = typeof r === 'number' ? r : r[0];
    this.moveTo(x + rad, y);
    this.arcTo(x + w, y, x + w, y + h, rad);
    this.arcTo(x + w, y + h, x, y + h, rad);
    this.arcTo(x, y + h, x, y, rad);
    this.arcTo(x, y, x + w, y, rad);
    this.closePath();
  };
}

// ── Random vibrant colors from blockId ─────────────────────────────────────

// Predefined palette: vibrant colors (no greens) + white, gray, black
const PALETTE: { top: string; bot: string; border: string }[] = [
  // Reds
  { top: 'hsl(0,80%,60%)',   bot: 'hsl(0,80%,45%)',   border: 'hsl(0,70%,33%)' },
  { top: 'hsl(10,85%,62%)',  bot: 'hsl(10,85%,48%)',  border: 'hsl(10,75%,36%)' },
  // Oranges
  { top: 'hsl(25,90%,58%)',  bot: 'hsl(25,90%,44%)',  border: 'hsl(25,80%,32%)' },
  { top: 'hsl(38,88%,55%)',  bot: 'hsl(38,88%,42%)',  border: 'hsl(38,78%,30%)' },
  // Yellows
  { top: 'hsl(50,90%,58%)',  bot: 'hsl(50,90%,45%)',  border: 'hsl(50,80%,33%)' },
  { top: 'hsl(60,85%,52%)',  bot: 'hsl(60,85%,40%)',  border: 'hsl(60,75%,28%)' },
  // Blues
  { top: 'hsl(210,80%,60%)', bot: 'hsl(210,80%,46%)', border: 'hsl(210,70%,34%)' },
  { top: 'hsl(230,75%,58%)', bot: 'hsl(230,75%,44%)', border: 'hsl(230,65%,32%)' },
  // Indigo / Violet
  { top: 'hsl(260,70%,62%)', bot: 'hsl(260,70%,48%)', border: 'hsl(260,60%,36%)' },
  { top: 'hsl(280,72%,58%)', bot: 'hsl(280,72%,44%)', border: 'hsl(280,62%,32%)' },
  // Pinks / Magenta
  { top: 'hsl(320,75%,60%)', bot: 'hsl(320,75%,46%)', border: 'hsl(320,65%,34%)' },
  { top: 'hsl(340,80%,58%)', bot: 'hsl(340,80%,44%)', border: 'hsl(340,70%,32%)' },
  // Cyan / Teal (not green)
  { top: 'hsl(190,75%,52%)', bot: 'hsl(190,75%,40%)', border: 'hsl(190,65%,28%)' },
  { top: 'hsl(200,78%,55%)', bot: 'hsl(200,78%,42%)', border: 'hsl(200,68%,30%)' },
  // White
  { top: 'hsl(0,0%,92%)',    bot: 'hsl(0,0%,78%)',    border: 'hsl(0,0%,65%)' },
  // Gray
  { top: 'hsl(0,0%,62%)',    bot: 'hsl(0,0%,48%)',    border: 'hsl(0,0%,36%)' },
  // Dark / Black
  { top: 'hsl(0,0%,35%)',    bot: 'hsl(0,0%,22%)',    border: 'hsl(0,0%,12%)' },
];

function blockColor(blockId: number): { top: string; bot: string; border: string } {
  // Golden angle scramble into palette to keep consecutive blocks different
  const idx = Math.floor((blockId * 137.508) % PALETTE.length);
  return PALETTE[idx];
}

// ── Assets ─────────────────────────────────────────────────────────────────

export interface Assets {
  bg: HTMLImageElement | null;
  cells: (HTMLImageElement | null)[];
}

export async function loadAssets(): Promise<Assets> {
  const assets: Assets = { bg: null, cells: [null] };
  assets.bg = await tryLoad('assets/bg.png');
  for (let i = 1; i <= 4; i++) {
    assets.cells[i] = await tryLoad(`assets/cell_${i}.png`);
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

// ── Animation data ─────────────────────────────────────────────────────────

export interface Particle {
  x: number;
  y: number;
  blockId: number;
  shade: number;
  scale: number;
  alpha: number;
  vx: number;
  vy: number;
}

export interface AnimData {
  blockYOffsets: Map<number, number>; // blockId → px above target
  pushOffset: number;
  particles: Particle[];
}

// ── Drawing ────────────────────────────────────────────────────────────────

function drawCell(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, size: number,
  shade: number, blockId: number, assets: Assets,
  highlight: boolean = false,
  alpha: number = 1,
  scale: number = 1,
): void {
  const pad = Math.max(1, size * 0.04);
  const actualSize = size * scale;
  const offset = (size - actualSize) / 2;
  const bx = x + pad + offset;
  const by = y + pad + offset;
  const bs = actualSize - pad * 2;
  if (bs <= 0) return;
  const rad = Math.max(2, bs * 0.1);

  ctx.globalAlpha = alpha;

  const img = assets.cells[shade];
  if (img) {
    ctx.drawImage(img, bx, by, bs, bs);
  } else {
    const s = blockColor(blockId);
    const grad = ctx.createLinearGradient(bx, by, bx, by + bs);
    grad.addColorStop(0, s.top);
    grad.addColorStop(1, s.bot);

    ctx.beginPath();
    ctx.roundRect(bx, by, bs, bs, rad);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = s.border;
    ctx.lineWidth = Math.max(1, size * 0.025);
    ctx.stroke();

    // Shine
    ctx.beginPath();
    ctx.roundRect(bx + bs * 0.1, by + bs * 0.06, bs * 0.35, bs * 0.15, rad * 0.4);
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fill();
  }

  if (highlight) {
    ctx.beginPath();
    ctx.roundRect(bx - 1, by - 1, bs + 2, bs + 2, rad);
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = Math.max(2, size * 0.05);
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
}

// ── Main draw ──────────────────────────────────────────────────────────────

export function drawFrame(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  assets: Assets,
  dpr: number,
  selectedBlockId: number | null,
  anim: AnimData,
): void {
  const { canvasW, canvasH, cellSize, scrollY } = state;

  ctx.clearRect(0, 0, canvasW * dpr, canvasH * dpr);
  ctx.save();
  ctx.scale(dpr, dpr);

  // ── Background ──
  if (assets.bg) {
    ctx.drawImage(assets.bg, 0, 0, canvasW, canvasH);
  } else {
    const cs = cellSize;
    ctx.fillStyle = '#151525';
    ctx.fillRect(0, 0, canvasW, canvasH);
    const startRow = Math.floor(scrollY / cs);
    const endRow = startRow + state.visibleRows + 2;
    ctx.fillStyle = '#1a1a30';
    for (let r = startRow; r <= endRow; r++) {
      for (let c = 0; c < COLS; c++) {
        if ((r + c) % 2 === 0) {
          const sy = canvasH - (r + 1) * cs + scrollY;
          ctx.fillRect(c * cs, sy, cs, cs);
        }
      }
    }
  }

  // ── Grid lines ──
  ctx.strokeStyle = 'rgba(255,255,255,0.02)';
  ctx.lineWidth = 1;
  for (let c = 1; c < COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(c * cellSize, 0);
    ctx.lineTo(c * cellSize, canvasH);
    ctx.stroke();
  }

  // ── Floor line ──
  const floorY = canvasH + scrollY;
  if (floorY > 0 && floorY <= canvasH) {
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, floorY);
    ctx.lineTo(canvasW, floorY);
    ctx.stroke();
  }

  // ── Blocks ──
  for (let r = 0; r < state.grid.length; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = state.grid[r][c];
      if (!cell) continue;

      const baseY = rowToScreenY(state, r);
      const fallOffset = anim.blockYOffsets.get(cell.blockId) || 0;
      const sy = baseY - fallOffset + anim.pushOffset;

      if (sy > canvasH + cellSize || sy < -cellSize) continue;

      const isSelected = cell.blockId === selectedBlockId;
      drawCell(ctx, colToScreenX(state, c), sy, cellSize, cell.shade, cell.blockId, assets, isSelected);
    }
  }

  // ── Particles (clearing animation) ──
  for (const p of anim.particles) {
    if (p.alpha <= 0 || p.scale <= 0) continue;
    drawCell(
      ctx,
      p.x - cellSize * p.scale / 2,
      p.y - cellSize * p.scale / 2 + anim.pushOffset,
      cellSize, p.shade, p.blockId, assets,
      false, p.alpha, p.scale,
    );
  }

  // ── Timer ──
  const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  const timeStr = h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

  const fontSize = Math.round(cellSize * 0.8);
  const timerY = Math.round(cellSize * 0.6); // safe area for iPhone notch
  ctx.font = `600 ${fontSize}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillText(timeStr, canvasW / 2 + 1, timerY + 1);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fillText(timeStr, canvasW / 2, timerY);

  ctx.restore();
}
