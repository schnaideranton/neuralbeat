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

// ── Bauhaus palette (from reference image) ────────────────────────────────

const COLORS = [
  '#E53935', // red
  '#1E88E5', // blue
  '#FDD835', // yellow
  '#7B1FA2', // purple
  '#F4511E', // orange-red
  '#00ACC1', // cyan
  '#F06292', // pink
  '#FFFFFF', // white
  '#9E9E9E', // gray
  '#212121', // near-black
];

// Shape types: 5 variants
type ShapeType = 'sq-fill' | 'sq-stroke' | 'circle-fill' | 'circle-stroke' | 'x';

const SHAPES: ShapeType[] = ['sq-fill', 'sq-stroke', 'circle-fill', 'circle-stroke', 'x'];

interface BlockStyle {
  color: string;
  shape: ShapeType;
}

// Deterministic style per blockId using golden angle scramble
function getBlockStyle(blockId: number): BlockStyle {
  const colorIdx = Math.floor((blockId * 137.508) % COLORS.length);
  const shapeIdx = Math.floor((blockId * 73.137) % SHAPES.length);
  return { color: COLORS[colorIdx], shape: SHAPES[shapeIdx] };
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
  blockYOffsets: Map<number, number>;
  pushOffset: number;
  particles: Particle[];
}

// ── Shape drawing ─────────────────────────────────────────────────────────

function drawShape(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, size: number,
  style: BlockStyle,
): void {
  const r = size * 0.38; // shape radius within cell
  const strokeW = size * 0.12; // thick stroke for outlines and X

  ctx.fillStyle = style.color;
  ctx.strokeStyle = style.color;
  ctx.lineWidth = strokeW;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  switch (style.shape) {
    case 'sq-fill': {
      const half = r;
      ctx.fillRect(cx - half, cy - half, half * 2, half * 2);
      break;
    }
    case 'sq-stroke': {
      const half = r - strokeW / 2;
      ctx.strokeRect(cx - half, cy - half, half * 2, half * 2);
      break;
    }
    case 'circle-fill': {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'circle-stroke': {
      ctx.beginPath();
      ctx.arc(cx, cy, r - strokeW / 2, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    case 'x': {
      const arm = r * 0.75;
      ctx.beginPath();
      ctx.moveTo(cx - arm, cy - arm);
      ctx.lineTo(cx + arm, cy + arm);
      ctx.moveTo(cx + arm, cy - arm);
      ctx.lineTo(cx - arm, cy + arm);
      ctx.stroke();
      break;
    }
  }
}

// ── Cell drawing ──────────────────────────────────────────────────────────

function drawCell(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, size: number,
  shade: number, blockId: number, assets: Assets,
  highlight: boolean = false,
  alpha: number = 1,
  scale: number = 1,
): void {
  const actualSize = size * scale;
  const offset = (size - actualSize) / 2;
  const bx = x + offset;
  const by = y + offset;
  if (actualSize <= 0) return;

  ctx.globalAlpha = alpha;

  const img = assets.cells[shade];
  if (img) {
    ctx.drawImage(img, bx, by, actualSize, actualSize);
  } else {
    const style = getBlockStyle(blockId);

    // Dark cell background
    const pad = actualSize * 0.04;
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(bx + pad, by + pad, actualSize - pad * 2, actualSize - pad * 2);

    // Draw shape centered in cell
    drawShape(ctx, bx + actualSize / 2, by + actualSize / 2, actualSize, style);
  }

  if (highlight) {
    const pad = actualSize * 0.04;
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = Math.max(2, size * 0.05);
    ctx.strokeRect(bx + pad, by + pad, actualSize - pad * 2, actualSize - pad * 2);
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

  // ── Background: dark with subtle black/dark-gray checkerboard ──
  if (assets.bg) {
    ctx.drawImage(assets.bg, 0, 0, canvasW, canvasH);
  } else {
    const cs = cellSize;
    ctx.fillStyle = '#111111';
    ctx.fillRect(0, 0, canvasW, canvasH);
    const startRow = Math.floor(scrollY / cs);
    const endRow = startRow + state.visibleRows + 2;
    ctx.fillStyle = '#161616';
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
  ctx.strokeStyle = 'rgba(255,255,255,0.03)';
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
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
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
  const timerY = Math.round(cellSize * 0.6);
  ctx.font = `600 ${fontSize}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillText(timeStr, canvasW / 2 + 1, timerY + 1);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fillText(timeStr, canvasW / 2, timerY);

  ctx.restore();
}
