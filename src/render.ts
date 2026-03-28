import { GameState, COLS, rowToScreenY, colToScreenX } from './game';

// ── roundRect polyfill ─────────────────────────────────────────────────────

if (!CanvasRenderingContext2D.prototype.roundRect) {
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

// ── Grayscale palette ──────────────────────────────────────────────────────

const SHADES = [
  '',                                                  // 0 unused
  { top: '#e0e0e0', bot: '#c8c8c8', border: '#b8b8b8' }, // 1 lightest
  { top: '#b0b0b0', bot: '#989898', border: '#888888' }, // 2
  { top: '#787878', bot: '#606060', border: '#505050' }, // 3
  { top: '#4a4a4a', bot: '#333333', border: '#282828' }, // 4 darkest
];

// ── Assets ─────────────────────────────────────────────────────────────────

export interface Assets {
  bg: HTMLImageElement | null;
  cells: (HTMLImageElement | null)[];  // cell_1..cell_4
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

// ── Drawing helpers ────────────────────────────────────────────────────────

function drawCell(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, size: number,
  shade: number, assets: Assets,
  highlight: boolean = false,
): void {
  const pad = Math.max(1, size * 0.04);
  const bx = x + pad, by = y + pad, bs = size - pad * 2;
  const rad = Math.max(2, bs * 0.1);

  const img = assets.cells[shade];
  if (img) {
    ctx.drawImage(img, bx, by, bs, bs);
  } else {
    const s = typeof SHADES[shade] === 'object' ? SHADES[shade] : SHADES[1];
    const grad = ctx.createLinearGradient(bx, by, bx, by + bs);
    grad.addColorStop(0, (s as any).top);
    grad.addColorStop(1, (s as any).bot);

    ctx.beginPath();
    ctx.roundRect(bx, by, bs, bs, rad);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = (s as any).border;
    ctx.lineWidth = Math.max(1, size * 0.025);
    ctx.stroke();

    // Subtle shine
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
}

// ── Main draw ──────────────────────────────────────────────────────────────

export function drawFrame(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  assets: Assets,
  dpr: number,
  selectedBlockId: number | null,
): void {
  const { canvasW, canvasH, cellSize, scrollY } = state;

  ctx.clearRect(0, 0, canvasW * dpr, canvasH * dpr);
  ctx.save();
  ctx.scale(dpr, dpr);

  // ── Background ──
  if (assets.bg) {
    ctx.drawImage(assets.bg, 0, 0, canvasW, canvasH);
  } else {
    // Dark checkerboard
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

  // ── Grid lines (very subtle) ──
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
    const sy = rowToScreenY(state, r);
    if (sy > canvasH + cellSize || sy < -cellSize) continue;
    for (let c = 0; c < COLS; c++) {
      const cell = state.grid[r][c];
      if (cell) {
        const isSelected = cell.blockId === selectedBlockId;
        drawCell(ctx, colToScreenX(state, c), sy, cellSize, cell.shade, assets, isSelected);
      }
    }
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
