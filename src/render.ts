import {
  GameState, Piece, getPieceBounds, canPlace,
  gridRowToScreenY, gridColToScreenX, getMaxRow,
} from './game';

// ── Colors ─────────────────────────────────────────────────────────────────

const BLOCK_COLORS: string[] = [
  '',                   // 0 = unused
  '#e8a0bf',           // 1 - soft rose
  '#f4c27f',           // 2 - amber
  '#a8d8a8',           // 3 - sage green
  '#8ecae6',           // 4 - sky blue
  '#b8a9d4',           // 5 - lavender
  '#f4a88a',           // 6 - peach
  '#7ecfb8',           // 7 - mint
];

const BLOCK_BORDERS: string[] = [
  '',
  '#d4809a',
  '#e0a85f',
  '#88b888',
  '#6eb0cc',
  '#9889b8',
  '#d88868',
  '#5cad96',
];

// ── Assets ─────────────────────────────────────────────────────────────────

export interface Assets {
  bg: HTMLImageElement | null;
  blocks: (HTMLImageElement | null)[];
}

export async function loadAssets(): Promise<Assets> {
  const assets: Assets = { bg: null, blocks: [null] };

  // Try loading background
  assets.bg = await tryLoadImage('assets/bg.png');

  // Try loading block PNGs
  for (let i = 1; i <= 7; i++) {
    assets.blocks[i] = await tryLoadImage(`assets/block_${i}.png`);
  }

  return assets;
}

function tryLoadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

// ── Drawing ────────────────────────────────────────────────────────────────

function drawBlock(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, size: number,
  type: number, assets: Assets, alpha: number = 1
): void {
  ctx.globalAlpha = alpha;
  const padding = Math.max(1, size * 0.06);
  const bx = x + padding;
  const by = y + padding;
  const bs = size - padding * 2;
  const radius = Math.max(2, bs * 0.15);

  const blockImg = assets.blocks[type];
  if (blockImg) {
    ctx.drawImage(blockImg, bx, by, bs, bs);
  } else {
    // Fallback: draw colored rounded rect with subtle gradient
    ctx.beginPath();
    roundRect(ctx, bx, by, bs, bs, radius);

    const grad = ctx.createLinearGradient(bx, by, bx, by + bs);
    grad.addColorStop(0, lighten(BLOCK_COLORS[type], 20));
    grad.addColorStop(1, BLOCK_COLORS[type]);
    ctx.fillStyle = grad;
    ctx.fill();

    // Border
    ctx.strokeStyle = BLOCK_BORDERS[type];
    ctx.lineWidth = Math.max(1, size * 0.04);
    ctx.stroke();

    // Shine highlight
    ctx.beginPath();
    roundRect(ctx, bx + bs * 0.1, by + bs * 0.08, bs * 0.35, bs * 0.2, radius * 0.5);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
): void {
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function lighten(hex: string, amount: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.min(255, r + amount)},${Math.min(255, g + amount)},${Math.min(255, b + amount)})`;
}

// ── Main Draw ──────────────────────────────────────────────────────────────

export function drawFrame(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  assets: Assets,
  dpr: number,
): void {
  const w = state.canvasWidth;
  const h = state.canvasHeight;
  const cs = state.cellSize;

  // Clear
  ctx.clearRect(0, 0, w * dpr, h * dpr);
  ctx.save();
  ctx.scale(dpr, dpr);

  // Background
  if (assets.bg) {
    ctx.drawImage(assets.bg, 0, 0, w, h);
  } else {
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#16162a');
    bgGrad.addColorStop(1, '#1a1a3e');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);
  }

  // ── Grid area ──
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, w, state.gridAreaHeight);
  ctx.clip();

  // Grid lines (subtle)
  const startRow = Math.floor(state.cameraY / cs) - 1;
  const endRow = startRow + state.visibleRows + 3;

  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 1;
  for (let c = 0; c <= state.cols; c++) {
    const x = c * cs;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, state.gridAreaHeight);
    ctx.stroke();
  }
  for (let r = startRow; r <= endRow; r++) {
    const y = gridRowToScreenY(state, r);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // Draw bottom line (floor)
  const floorY = gridRowToScreenY(state, -1) + cs;
  if (floorY <= state.gridAreaHeight) {
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, floorY);
    ctx.lineTo(w, floorY);
    ctx.stroke();
  }

  // Placed blocks
  for (const [k, type] of state.grid.entries()) {
    const [cs_str, rs_str] = k.split(',');
    const col = parseInt(cs_str);
    const row = parseInt(rs_str);
    const sy = gridRowToScreenY(state, row);
    if (sy > state.gridAreaHeight + cs || sy < -cs) continue;
    drawBlock(ctx, gridColToScreenX(state, col), sy, cs, type, assets);
  }

  // Ghost preview (dragging piece over grid)
  if (state.dragging) {
    const piece = state.tray[state.dragging.pieceIndex];
    if (piece) {
      const alpha = state.dragging.valid ? 0.5 : 0.25;
      for (const [dc, dr] of piece.cells) {
        const c = state.dragging.gridCol + dc;
        const r = state.dragging.gridRow + dr;
        const sx = gridColToScreenX(state, c);
        const sy = gridRowToScreenY(state, r);
        drawBlock(ctx, sx, sy, cs, piece.type, assets, alpha);
      }
      // Validity indicator
      if (!state.dragging.valid) {
        for (const [dc, dr] of piece.cells) {
          const c = state.dragging.gridCol + dc;
          const r = state.dragging.gridRow + dr;
          const sx = gridColToScreenX(state, c);
          const sy = gridRowToScreenY(state, r);
          ctx.fillStyle = 'rgba(255,80,80,0.2)';
          ctx.fillRect(sx, sy, cs, cs);
        }
      }
    }
  }

  ctx.restore(); // Unclip grid area

  // ── Tray area ──
  const trayTop = state.gridAreaHeight;

  // Tray background
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(0, trayTop, w, state.trayHeight);

  // Separator line
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, trayTop);
  ctx.lineTo(w, trayTop);
  ctx.stroke();

  // Draw 3 tray slots
  const slotWidth = w / 3;
  for (let i = 0; i < 3; i++) {
    const piece = state.tray[i];
    if (!piece) continue;

    // Skip the piece being dragged
    if (state.dragging && state.dragging.pieceIndex === i) continue;

    const bounds = getPieceBounds(piece);
    const pieceDrawSize = Math.min(
      (slotWidth - 16) / bounds.w,
      (state.trayHeight - 16) / bounds.h,
      cs * 0.8
    );

    const slotCenterX = slotWidth * i + slotWidth / 2;
    const slotCenterY = trayTop + state.trayHeight / 2;
    const startX = slotCenterX - (bounds.w * pieceDrawSize) / 2;
    const startY = slotCenterY - (bounds.h * pieceDrawSize) / 2;

    for (const [dc, dr] of piece.cells) {
      drawBlock(ctx, startX + dc * pieceDrawSize, startY + dr * pieceDrawSize,
        pieceDrawSize, piece.type, assets, 0.9);
    }
  }

  // Draw dragged piece at pointer position (if dragging and pointer is in tray area)
  if (state.dragging) {
    const piece = state.tray[state.dragging.pieceIndex];
    if (piece && state.dragging.screenY > state.gridAreaHeight) {
      const bounds = getPieceBounds(piece);
      const drawSize = cs * 0.7;
      const startX = state.dragging.screenX - (bounds.w * drawSize) / 2;
      const startY = state.dragging.screenY - (bounds.h * drawSize) / 2 - cs;
      for (const [dc, dr] of piece.cells) {
        drawBlock(ctx, startX + dc * drawSize, startY + dr * drawSize,
          drawSize, piece.type, assets, 0.7);
      }
    }
  }

  // ── Timer ──
  const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

  ctx.font = `${Math.round(cs * 0.5)}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillText(timeStr, w / 2 + 1, 12 + 1);

  // Text
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillText(timeStr, w / 2, 12);

  ctx.restore();
}

// ── Tray hit-testing ───────────────────────────────────────────────────────

export function hitTestTray(state: GameState, x: number, y: number): number {
  if (y < state.gridAreaHeight) return -1;

  const slotWidth = state.canvasWidth / 3;
  const slotIndex = Math.floor(x / slotWidth);
  if (slotIndex < 0 || slotIndex > 2) return -1;
  if (!state.tray[slotIndex]) return -1;

  return slotIndex;
}
