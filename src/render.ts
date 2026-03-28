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

export type SkinType = 'primitive' | 'emoji' | 'flags';

export const SKIN_LABELS: Record<SkinType, string> = {
  primitive: 'Primitive',
  emoji: 'Emoji',
  flags: 'Flags',
};

export const SKIN_LIST: SkinType[] = ['primitive', 'emoji', 'flags'];

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
  const idx = Math.floor((blockId * 137.508) % EMOJI.length);
  return EMOJI[idx];
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
  const idx = Math.floor((blockId * 137.508) % FLAGS.length);
  return FLAGS[idx];
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
  } else if (skin === 'emoji' || skin === 'flags') {
    // Black cell background
    const pad = actualSize * 0.03;
    ctx.fillStyle = '#0d0d0d';
    ctx.fillRect(bx + pad, by + pad, actualSize - pad * 2, actualSize - pad * 2);

    // Draw emoji/flag centered
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
    const pad = actualSize * 0.04;
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = Math.max(2, size * 0.05);
    ctx.strokeRect(bx + pad, by + pad, actualSize - pad * 2, actualSize - pad * 2);
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

  ctx.clearRect(0, 0, canvasW * dpr, canvasH * dpr);
  ctx.save();
  ctx.scale(dpr, dpr);

  // ── Background ──
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

  const fontSize = Math.round(cellSize * 0.8);
  // Position at ~15th row from bottom so iPhone camera notch doesn't cover it
  const timerY = Math.max(cellSize * 0.6, canvasH - cellSize * 15);
  ctx.font = `600 ${fontSize}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  // Measure timer text
  const timerMetrics = ctx.measureText(timeStr);
  const timerTextW = timerMetrics.width;

  // Hamburger icon (three horizontal bars using ≡)
  const hamburgerStr = '≡';
  const hamburgerGap = fontSize * 0.3;
  const totalW = timerTextW + hamburgerGap + fontSize * 0.6;
  const startX = canvasW / 2 - totalW / 2;
  const timerCenterX = startX + timerTextW / 2;
  const hamburgerX = startX + timerTextW + hamburgerGap;

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.textAlign = 'left';
  ctx.fillText(timeStr, startX + 1, timerY + 1);
  ctx.fillText(hamburgerStr, hamburgerX + 1, timerY + 1);

  // Main text
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fillText(timeStr, startX, timerY);
  ctx.fillText(hamburgerStr, hamburgerX, timerY);

  // Store hit area for the whole timer+hamburger block
  lastTimerHit = {
    x: startX - 10,
    y: timerY - 10,
    w: totalW + 20,
    h: fontSize + 20,
  };

  // ── Dropdown menu ──
  if (menuOpen) {
    const menuFontSize = Math.round(cellSize * 0.45);
    const menuItemH = menuFontSize * 2;
    const menuW = cellSize * 5;
    const menuX = (canvasW - menuW) / 2;
    const menuY = timerY + fontSize + 10;

    // Background
    ctx.fillStyle = 'rgba(0,0,0,0.9)';
    ctx.beginPath();
    ctx.roundRect(menuX, menuY, menuW, menuItemH * SKIN_LIST.length + 8, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();

    lastMenuHit.items = [];
    ctx.font = `500 ${menuFontSize}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < SKIN_LIST.length; i++) {
      const s = SKIN_LIST[i];
      const itemY = menuY + 4 + i * menuItemH;

      // Highlight current skin
      if (s === skin) {
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.fillRect(menuX + 2, itemY, menuW - 4, menuItemH);
      }

      ctx.fillStyle = s === skin ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.5)';
      ctx.fillText(SKIN_LABELS[s], menuX + menuW / 2, itemY + menuItemH / 2);

      lastMenuHit.items.push({
        x: menuX, y: itemY, w: menuW, h: menuItemH, skin: s,
      });
    }
  } else {
    lastMenuHit.items = [];
  }

  ctx.restore();
}
