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

// ── Skin types ────────────────────────────────────────────────────────────

export type SkinType = 'primitive' | 'emoji' | 'flags' | 'excel';

export const SKIN_LABELS: Record<SkinType, string> = {
  primitive: 'Primitive',
  emoji: 'Emoji',
  flags: 'Flags',
  excel: 'Excel',
};

export const SKIN_LIST: SkinType[] = ['primitive', 'emoji', 'flags', 'excel'];

// ── Bauhaus palette ───────────────────────────────────────────────────────

const COLORS = [
  '#E53935', '#1E88E5', '#FDD835', '#7B1FA2', '#F4511E',
  '#00ACC1', '#F06292', '#FFFFFF', '#9E9E9E', '#212121',
];

type ShapeType = 'sq-fill' | 'sq-stroke' | 'circle-fill' | 'circle-stroke' | 'x';
const SHAPES: ShapeType[] = ['sq-fill', 'sq-stroke', 'circle-fill', 'circle-stroke', 'x'];

interface BlockStyle { color: string; shape: ShapeType; }

function getBlockStyle(blockId: number): BlockStyle {
  const colorIdx = Math.floor((blockId * 137.508) % COLORS.length);
  const shapeIdx = Math.floor((blockId * 73.137) % SHAPES.length);
  return { color: COLORS[colorIdx], shape: SHAPES[shapeIdx] };
}

// ── Excel palette (pastel, from screenshots) ──────────────────────────────

const EXCEL_COLORS = [
  '#2E7D32', // dark green
  '#4CAF50', // medium green
  '#FFF9C4', // light yellow
  '#FFCC80', // peach/orange
  '#A1887F', // brown/tan
  '#BBDEFB', // light blue
  '#F8BBD0', // pink
  '#D7CCC8', // light brown
  '#C8E6C9', // light green
  '#FFE0B2', // light peach
  '#E1BEE7', // light purple
];

const EXCEL_TEXTS = [
  '#Ref?', 'Split', 'Lock', '/S', '-FormatPaint', '=SUM()', '#N/A',
  'TRUE', 'FALSE', '#DIV/0!', 'VLOOKUP', 'Merge', '#VALUE!',
  '=IF()', '#NAME?', 'Ctrl+Z', '=MAX()', 'Wrap', '$A$1', 'F2',
  'Sort', 'Filter', '=LEN()', 'Paste', 'Bold', '=AVG()', '#NULL!',
];

const COL_HEADERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

function getExcelColor(blockId: number): string {
  return EXCEL_COLORS[Math.floor((blockId * 137.508) % EXCEL_COLORS.length)];
}

function getExcelText(blockId: number): string | null {
  // ~25% of blocks get text
  if ((blockId * 31) % 4 !== 0) return null;
  return EXCEL_TEXTS[Math.floor((blockId * 73.137) % EXCEL_TEXTS.length)];
}

// ── Emoji pool ────────────────────────────────────────────────────────────

const EMOJI = [
  '🍓','🍒','🍑','🍊','🍋','🍌','🍉','🍇','🍈','🍐','🍎','🍏','🥝','🥭','🍍',
  '🥥','🫐','🍅','🌽','🥕','🥒','🌶️','🥑','🧄','🧅','🥦','🥬','🍄','🥜','🌰',
  '🍞','🥐','🧀','🍕','🍔','🍟','🌭','🍿','🧂','🥚','🍳','🧈','🥞','🧇','🥓',
  '🍗','🍖','🌮','🌯','🥙','🧆','🥘','🍝','🍜','🍲','🍛','🍣','🍱','🥟','🍤',
  '🍙','🍚','🍘','🍥','🥮','🍡','🧁','🍰','🎂','🍮','🍭','🍬','🍫','🍩','🍪',
  '🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵',
  '🙈','🙉','🙊','🐔','🐧','🐦','🐤','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄',
  '🐝','🐛','🦋','🐌','🐞','🐜','🦟','🦗','🕷️','🐢','🐍','🦎','🦂','🐙','🦑',
  '🦐','🐠','🐟','🐡','🐬','🦈','🐳','🐋','🐊','🐆','🐅','🦓','🦍','🦧','🐘',
  '🦛','🦏','🐪','🐫','🦒','🦘','🦬','🐃','🦌','🐕','🐈','🐓','🦃','🦚','🦜',
  '🦢','🦩','🕊️','🐇','🦝','🦨','🦡','🦫','🦦','🦥','🐁','🐀','🦔','🐉','🐲',
  '😀','😂','🤣','😊','😇','🥰','😍','🤩','😘','😋','😛','🤪','😎','🤓','🧐',
  '😏','😒','😞','😔','😟','😕','😫','😩','🥺','😢','😭','😤','😠','😡','🤬',
  '😈','👿','💀','☠️','💩','🤡','👹','👺','👻','👽','🤖','🎃','😺','😸','😹',
  '🌞','🌝','🌚','⭐','🌟','💫','✨','⚡','🔥','💥','❄️','🌊','💧','💦','🌈',
  '🎵','🎶','🎸','🥁','🎺','🎷','🎹','🎻','🪗','🎤','🎧','📻','🔔','🔕','🎼',
  '❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗',
  '💖','💘','💝','💟','☮️','✝️','☪️','🕉️','☯️','✡️','🔯','🕎','☸️','⚛️','🛐',
  '🏀','⚽','🏈','⚾','🥎','🎾','🏐','🏉','🥏','🎱','🪀','🏓','🏸','🏒','🥊',
  '⛷️','🏂','🪂','🏋️','🤸','⛹️','🏊','🚴','🧘','🤺','🏇','🎯','🎳','🎮','🕹️',
  '🚗','🚕','🚙','🏎️','🚓','🚑','🚒','🚐','🛻','🚚','🚛','🚜','🛵','🏍️','🚲',
  '🚀','🛸','🛩️','✈️','🚁','⛵','🚢','🛶','🚂','🚃','🚄','🚅','🚆','🚇','🚈',
  '🏠','🏡','🏢','🏣','🏥','🏦','🏨','🏩','🏪','🏫','🏬','🏭','🏯','🏰','💒',
  '🗼','🗽','⛪','🕌','🛕','🕍','⛩️','🕋','⛲','⛺','🌁','🌃','🌉','🌋','🗻',
  '🌵','🌲','🌳','🌴','🪵','🌱','🌿','☘️','🍀','🍁','🍂','🍃','🪺','🪸','🪻',
  '🌷','🌹','🥀','🌺','🌸','🌼','🌻','💐','🪷','🌾','🎋','🎍','🎄','🎑','🎆',
  '👀','👁️','👃','👂','👄','🦷','👅','🧠','🫀','🫁','🦴','👋','🤚','🖐️','✋',
  '🤙','💪','🦾','🖕','✍️','🤳','💅','🦵','🦶','👣','👶','👦','👧','🧑','👱',
  '🎩','🧢','👑','💍','👜','👛','👝','🎒','👓','🕶️','🥽','🧳','🌂','☂️','🧤',
  '🔑','🗝️','🔨','🪓','⛏️','🔧','🪛','🔩','⚙️','🧲','🪜','🧰','🗜️','🔬','🔭',
  '📡','💉','🩸','💊','🩹','🩺','🚪','🪞','🪟','🛏️','🛋️','🪑','🚽','🪠','🚿',
  '🪥','🧴','🧷','🧹','🧺','🧻','🪣','🧯','🛒','🚬','⚰️','🪦','⚱️','🗿','🪬',
];

function getBlockEmoji(blockId: number): string {
  return EMOJI[Math.floor((blockId * 137.508) % EMOJI.length)];
}

// ── Flag emoji pool ───────────────────────────────────────────────────────

const FLAGS = [
  '🏴‍☠️','🏳️‍🌈','🏳️‍⚧️','🇦🇫','🇦🇱','🇩🇿','🇦🇸','🇦🇩','🇦🇴','🇦🇮','🇦🇬','🇦🇷','🇦🇲','🇦🇼','🇦🇺',
  '🇦🇹','🇦🇿','🇧🇸','🇧🇭','🇧🇩','🇧🇧','🇧🇾','🇧🇪','🇧🇿','🇧🇯','🇧🇲','🇧🇹','🇧🇴','🇧🇦','🇧🇼',
  '🇧🇷','🇧🇳','🇧🇬','🇧🇫','🇧🇮','🇰🇭','🇨🇲','🇨🇦','🇨🇻','🇨🇫','🇹🇩','🇨🇱','🇨🇳','🇨🇴','🇰🇲',
  '🇨🇬','🇨🇩','🇨🇷','🇨🇮','🇭🇷','🇨🇺','🇨🇾','🇨🇿','🇩🇰','🇩🇯','🇩🇲','🇩🇴','🇪🇨','🇪🇬','🇸🇻',
  '🇬🇶','🇪🇷','🇪🇪','🇸🇿','🇪🇹','🇫🇯','🇫🇮','🇫🇷','🇬🇦','🇬🇲','🇬🇪','🇩🇪','🇬🇭','🇬🇷','🇬🇩',
  '🇬🇹','🇬🇳','🇬🇼','🇬🇾','🇭🇹','🇭🇳','🇭🇰','🇭🇺','🇮🇸','🇮🇳','🇮🇩','🇮🇷','🇮🇶','🇮🇪','🇮🇱',
  '🇮🇹','🇯🇲','🇯🇵','🇯🇴','🇰🇿','🇰🇪','🇰🇮','🇰🇵','🇰🇷','🇰🇼','🇰🇬','🇱🇦','🇱🇻','🇱🇧','🇱🇸',
  '🇱🇷','🇱🇾','🇱🇮','🇱🇹','🇱🇺','🇲🇴','🇲🇬','🇲🇼','🇲🇾','🇲🇻','🇲🇱','🇲🇹','🇲🇭','🇲🇷','🇲🇺',
  '🇲🇽','🇫🇲','🇲🇩','🇲🇨','🇲🇳','🇲🇪','🇲🇦','🇲🇿','🇲🇲','🇳🇦','🇳🇷','🇳🇵','🇳🇱','🇳🇿','🇳🇮',
  '🇳🇪','🇳🇬','🇲🇰','🇳🇴','🇴🇲','🇵🇰','🇵🇼','🇵🇸','🇵🇦','🇵🇬','🇵🇾','🇵🇪','🇵🇭','🇵🇱','🇵🇹',
  '🇶🇦','🇷🇴','🇷🇺','🇷🇼','🇼🇸','🇸🇲','🇸🇦','🇸🇳','🇷🇸','🇸🇨','🇸🇱','🇸🇬','🇸🇰','🇸🇮','🇸🇧',
  '🇸🇴','🇿🇦','🇪🇸','🇱🇰','🇸🇩','🇸🇷','🇸🇪','🇨🇭','🇸🇾','🇹🇼','🇹🇯','🇹🇿','🇹🇭','🇹🇱','🇹🇬',
  '🇹🇴','🇹🇹','🇹🇳','🇹🇷','🇹🇲','🇹🇻','🇺🇬','🇺🇦','🇦🇪','🇬🇧','🇺🇸','🇺🇾','🇺🇿','🇻🇺','🇻🇪',
  '🇻🇳','🇾🇪','🇿🇲','🇿🇼','🏴󠁧󠁢󠁥󠁮󠁧󠁿','🏴󠁧󠁢󠁳󠁣󠁴󠁿','🏴󠁧󠁢󠁷󠁬󠁳󠁿','🎌','🏁','🚩','🏴',
];

function getBlockFlag(blockId: number): string {
  return FLAGS[Math.floor((blockId * 137.508) % FLAGS.length)];
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
  x: number; y: number; blockId: number; shade: number;
  scale: number; alpha: number; vx: number; vy: number;
}

export interface AnimData {
  blockYOffsets: Map<number, number>;
  pushOffset: number;
  particles: Particle[];
}

// ── Shape drawing (primitive skin) ────────────────────────────────────────

function drawShape(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, size: number,
  style: BlockStyle,
): void {
  const r = size * 0.38;
  const strokeW = size * 0.12;
  ctx.fillStyle = style.color;
  ctx.strokeStyle = style.color;
  ctx.lineWidth = strokeW;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  switch (style.shape) {
    case 'sq-fill': {
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      break;
    }
    case 'sq-stroke': {
      const h = r - strokeW / 2;
      ctx.strokeRect(cx - h, cy - h, h * 2, h * 2);
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
      ctx.moveTo(cx - arm, cy - arm); ctx.lineTo(cx + arm, cy + arm);
      ctx.moveTo(cx + arm, cy - arm); ctx.lineTo(cx - arm, cy + arm);
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
  skin: SkinType,
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
  } else if (skin === 'excel') {
    // Excel-style colored cell
    const color = getExcelColor(blockId);
    ctx.fillStyle = color;
    ctx.fillRect(bx, by, actualSize, actualSize);

    // Thin border
    ctx.strokeStyle = '#b0b0b0';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(bx, by, actualSize, actualSize);

  } else if (skin === 'emoji' || skin === 'flags') {
    // Black cell background
    const pad = actualSize * 0.03;
    ctx.fillStyle = '#0d0d0d';
    ctx.fillRect(bx + pad, by + pad, actualSize - pad * 2, actualSize - pad * 2);

    const ch = skin === 'flags' ? getBlockFlag(blockId) : getBlockEmoji(blockId);
    const fontSize = Math.round(actualSize * 0.72);
    ctx.font = `${fontSize}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ch, bx + actualSize / 2, by + actualSize / 2 + actualSize * 0.04);
  } else {
    // Primitive skin
    const pad = actualSize * 0.04;
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(bx + pad, by + pad, actualSize - pad * 2, actualSize - pad * 2);
    drawShape(ctx, bx + actualSize / 2, by + actualSize / 2, actualSize, getBlockStyle(blockId));
  }

  if (highlight) {
    if (skin === 'excel') {
      ctx.strokeStyle = '#1565C0';
      ctx.lineWidth = Math.max(2, size * 0.05);
      ctx.strokeRect(bx, by, actualSize, actualSize);
    } else {
      const pad = actualSize * 0.04;
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = Math.max(2, size * 0.05);
      ctx.strokeRect(bx + pad, by + pad, actualSize - pad * 2, actualSize - pad * 2);
    }
  }

  ctx.globalAlpha = 1;
}

// ── Timer / menu hit area info ────────────────────────────────────────────

export interface TimerHitArea {
  x: number; y: number; w: number; h: number;
}

export interface MenuHitArea {
  items: { x: number; y: number; w: number; h: number; skin: SkinType }[];
}

let lastTimerHit: TimerHitArea = { x: 0, y: 0, w: 0, h: 0 };
let lastMenuHit: MenuHitArea = { items: [] };

export function getTimerHitArea(): TimerHitArea { return lastTimerHit; }
export function getMenuHitArea(): MenuHitArea { return lastMenuHit; }

// ── Main draw ──────────────────────────────────────────────────────────────

export function drawFrame(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  assets: Assets,
  dpr: number,
  selectedBlockId: number | null,
  anim: AnimData,
  skin: SkinType,
  menuOpen: boolean,
): void {
  const { canvasW, canvasH, cellSize, scrollY } = state;
  const isExcel = skin === 'excel';

  ctx.clearRect(0, 0, canvasW * dpr, canvasH * dpr);
  ctx.save();
  ctx.scale(dpr, dpr);

  // ── Background ──
  if (assets.bg && !isExcel) {
    ctx.drawImage(assets.bg, 0, 0, canvasW, canvasH);
  } else if (isExcel) {
    // White spreadsheet background
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(0, 0, canvasW, canvasH);

    // Excel grid lines
    const cs = cellSize;
    ctx.strokeStyle = '#d0d0d0';
    ctx.lineWidth = 1;
    // Vertical
    for (let c = 0; c <= COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(c * cs, 0);
      ctx.lineTo(c * cs, canvasH);
      ctx.stroke();
    }
    // Horizontal
    const startRow = Math.floor(scrollY / cs);
    const endRow = startRow + state.visibleRows + 2;
    for (let r = startRow; r <= endRow + 1; r++) {
      const sy = canvasH - r * cs + scrollY;
      ctx.beginPath();
      ctx.moveTo(0, sy);
      ctx.lineTo(canvasW, sy);
      ctx.stroke();
    }

    // Row numbers on both sides
    const rowFontSize = Math.round(cs * 0.3);
    ctx.font = `${rowFontSize}px "Segoe UI", Arial, sans-serif`;
    ctx.fillStyle = '#888';
    ctx.textBaseline = 'middle';
    for (let r = startRow; r <= endRow; r++) {
      if (r < 0) continue;
      const sy = canvasH - (r + 0.5) * cs + scrollY;
      if (sy < -cs || sy > canvasH + cs) continue;
      const label = String(r + 1);
      // Left
      ctx.textAlign = 'center';
      ctx.fillText(label, cs * 0.35, sy);
      // Right
      ctx.fillText(label, canvasW - cs * 0.35, sy);
    }

    // Column headers A-H at top (fixed)
    const headerH = cs * 0.7;
    ctx.fillStyle = '#e8e8e8';
    ctx.fillRect(0, 0, canvasW, headerH);
    ctx.strokeStyle = '#c0c0c0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, headerH);
    ctx.lineTo(canvasW, headerH);
    ctx.stroke();

    ctx.font = `600 ${Math.round(cs * 0.35)}px "Segoe UI", Arial, sans-serif`;
    ctx.fillStyle = '#555';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let c = 0; c < COLS; c++) {
      ctx.fillText(COL_HEADERS[c], (c + 0.5) * cs, headerH / 2);
    }
  } else {
    // Dark skins background
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

  if (!isExcel) {
    // Grid lines (dark skins)
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    for (let c = 1; c < COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(c * cellSize, 0);
      ctx.lineTo(c * cellSize, canvasH);
      ctx.stroke();
    }

    // Floor line
    const floorY = canvasH + scrollY;
    if (floorY > 0 && floorY <= canvasH) {
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, floorY);
      ctx.lineTo(canvasW, floorY);
      ctx.stroke();
    }
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
      drawCell(ctx, colToScreenX(state, c), sy, cellSize, cell.shade, cell.blockId, assets, skin, isSelected);
    }
  }

  // ── Particles ──
  for (const p of anim.particles) {
    if (p.alpha <= 0 || p.scale <= 0) continue;
    drawCell(
      ctx,
      p.x - cellSize * p.scale / 2,
      p.y - cellSize * p.scale / 2 + anim.pushOffset,
      cellSize, p.shade, p.blockId, assets, skin,
      false, p.alpha, p.scale,
    );
  }

  // ── Timer + hamburger ──
  const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  const timeStr = h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

  if (isExcel) {
    // Excel-style timer: row 1, light blue left half, light green right half
    const headerH = cellSize * 0.7;
    const timerRowY = headerH;
    const rowH = cellSize;
    const halfW = canvasW / 2;

    // Light blue left (timer)
    ctx.fillStyle = '#d4e8f7';
    ctx.fillRect(0, timerRowY, halfW, rowH);
    // Light green right (SUM)
    ctx.fillStyle = '#d8ecd4';
    ctx.fillRect(halfW, timerRowY, halfW, rowH);
    // Border
    ctx.strokeStyle = '#b0b0b0';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, timerRowY, halfW, rowH);
    ctx.strokeRect(halfW, timerRowY, halfW, rowH);

    const timerFontSize = Math.round(cellSize * 0.4);
    ctx.font = `500 ${timerFontSize}px "Segoe UI", Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#333';
    ctx.fillText(timeStr, halfW / 2, timerRowY + rowH / 2);
    ctx.fillText('≡', halfW - timerFontSize * 0.7, timerRowY + rowH / 2);

    // SUM label
    const sumVal = state.grid.reduce((acc, row) =>
      acc + row.reduce((a, c) => a + (c ? 1 : 0), 0), 0);
    ctx.fillText(`SUM: ${sumVal}`, halfW + halfW / 2, timerRowY + rowH / 2);

    lastTimerHit = {
      x: 0,
      y: timerRowY,
      w: canvasW,
      h: rowH,
    };
  } else {
    // Dark skins timer
    const fontSize = Math.round(cellSize * 0.8);
    const timerY = Math.max(cellSize * 0.6, canvasH - cellSize * 15);
    ctx.font = `600 ${fontSize}px monospace`;
    ctx.textBaseline = 'top';

    const timerMetrics = ctx.measureText(timeStr);
    const timerTextW = timerMetrics.width;
    const hamburgerStr = '≡';
    const hamburgerGap = fontSize * 0.3;
    const totalW = timerTextW + hamburgerGap + fontSize * 0.6;
    const startX = canvasW / 2 - totalW / 2;
    const hamburgerX = startX + timerTextW + hamburgerGap;

    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.textAlign = 'left';
    ctx.fillText(timeStr, startX + 1, timerY + 1);
    ctx.fillText(hamburgerStr, hamburgerX + 1, timerY + 1);

    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillText(timeStr, startX, timerY);
    ctx.fillText(hamburgerStr, hamburgerX, timerY);

    lastTimerHit = {
      x: startX - 10,
      y: timerY - 10,
      w: totalW + 20,
      h: fontSize + 20,
    };
  }

  // ── Dropdown menu ──
  if (menuOpen) {
    const menuFontSize = Math.round(cellSize * 0.45);
    const menuItemH = menuFontSize * 2;
    const menuW = cellSize * 5;
    const menuX = (canvasW - menuW) / 2;
    const menuY = lastTimerHit.y + lastTimerHit.h + 5;

    const menuH = menuItemH * SKIN_LIST.length + 8;
    if (isExcel) {
      ctx.fillStyle = '#f0f0f0';
      ctx.strokeStyle = '#aaa';
    } else {
      ctx.fillStyle = 'rgba(0,0,0,0.9)';
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    }
    ctx.beginPath();
    ctx.roundRect(menuX, menuY, menuW, menuH, 8);
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.stroke();

    lastMenuHit.items = [];
    ctx.font = `500 ${menuFontSize}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < SKIN_LIST.length; i++) {
      const sk = SKIN_LIST[i];
      const itemY = menuY + 4 + i * menuItemH;

      if (sk === skin) {
        ctx.fillStyle = isExcel ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)';
        ctx.fillRect(menuX + 2, itemY, menuW - 4, menuItemH);
      }

      if (isExcel) {
        ctx.fillStyle = sk === skin ? '#222' : '#666';
      } else {
        ctx.fillStyle = sk === skin ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.5)';
      }
      ctx.fillText(SKIN_LABELS[sk], menuX + menuW / 2, itemY + menuItemH / 2);

      lastMenuHit.items.push({
        x: menuX, y: itemY, w: menuW, h: menuItemH, skin: sk,
      });
    }
  } else {
    lastMenuHit.items = [];
  }

  ctx.restore();
}
