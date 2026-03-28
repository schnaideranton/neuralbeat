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

function blockColor(blockId: number): { top: string; bot: string; border: string } {
  // Golden angle ensures consecutive blocks get very different hues
  const hue = (blockId * 137.508) % 360;
  const sat = 55 + ((blockId * 73) % 35);   // 55-90%
  const lit = 45 + ((blockId * 53) % 20);   // 45-65%
  return {
    top: `hsl(${hue}, ${sat}%, ${lit + 12}%)`,
    bot: `hsl(${hue}, ${sat}%, ${lit}%)`,
    border: `hsl(${hue}, ${sat - 10}%, ${lit - 12}%)`,
  };
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

  const fontSize = Math.round(cellSize * 0.38);
  ctx.font = `${fontSize}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillText(timeStr, canvasW / 2 + 1, 11);
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.fillText(timeStr, canvasW / 2, 10);

  ctx.restore();
}
