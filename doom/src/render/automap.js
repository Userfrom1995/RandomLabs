// M1 software presenter: automap (top-down) projection of decoded map geometry
// into the 8-bit framebuffer. This is a real renderer over real parsed WAD
// data (vertices, linedefs, things, player start); the full 3D BSP column
// rasterizer lands in M2 behind the same framebuffer contract.
import { createFrameBuffer } from './fbView.js';

export const FB_W = 320;
export const FB_H = 200;

export function renderAutomap(fb, geo, paletteIndex = { wall: 31, thing: 175, player: 216, bg: 0 }) {
  const { width, height, data } = fb;
  data.fill(paletteIndex.bg);
  if (!geo || !geo.vertexes || !geo.linedefs) return fb;
  const vs = geo.vertexes;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const v of vs) {
    if (v.x < minX) minX = v.x; if (v.x > maxX) maxX = v.x;
    if (v.y < minY) minY = v.y; if (v.y > maxY) maxY = v.y;
  }
  const spanX = Math.max(1, maxX - minX), spanY = Math.max(1, maxY - minY);
  const margin = 12;
  const scale = Math.min((width - margin * 2) / spanX, (height - margin * 2 - 16) / spanY);
  const ox = (width - spanX * scale) / 2 - minX * scale;
  const oy = (height - 16 - spanY * scale) / 2 - minY * scale;
  const px = (x, y) => [Math.round(ox + x * scale), Math.round(oy + y * scale)];

  const set = (x, y, c) => { if (x >= 0 && x < width && y >= 0 && y < height - 16) data[y * width + x] = c; };
  const line = (x0, y0, x1, y1, c) => {
    const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
    const n = Math.max(dx, dy, 1);
    for (let i = 0; i <= n; i++) set(Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), c);
  };

  for (const L of geo.linedefs) {
    const a = vs[L.v0], b = vs[L.v1];
    if (!a || !b) continue;
    const [x0, y0] = px(a.x, a.y);
    const [x1, y1] = px(b.x, b.y);
    const twoSided = (L.flags & 0x0004) !== 0;
    line(x0, y0, x1, y1, twoSided ? paletteIndex.wall : 47);
  }
  if (geo.things) {
    for (const t of geo.things) {
      const [x, y] = px(t.x, t.y);
      const isPlayer = t.type === 1;
      const c = isPlayer ? paletteIndex.player : paletteIndex.thing;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(x + dx, y + dy, c);
      if (isPlayer) {
        const rad = (t.angle * Math.PI) / 180;
        const [ax, ay] = [x + Math.round(Math.cos(rad) * 8), y + Math.round(Math.sin(rad) * 8)];
        line(x, y, ax, ay, c);
      }
    }
  }
  return fb;
}

export function renderStatusBar(fb, text, paletteIndex = 31) {
  const { width, height, data } = fb;
  for (let y = height - 12; y < height; y++) for (let x = 0; x < width; x++) data[y * width + x] = 0;
  // 3x5 micro-font for A-Z 0-9 :.%-/ and space, drawn as palette index dots.
  const glyphs = MICRO_FONT;
  let cx = 4;
  for (const ch of String(text).toUpperCase()) {
    const g = glyphs[ch] || glyphs[' '];
    for (let gy = 0; gy < 5; gy++) {
      for (let gx = 0; gx < 3; gx++) {
        if (g[gy] & (1 << (2 - gx))) {
          const x = cx + gx, y = height - 10 + gy;
          if (x < width) data[y * width + x] = paletteIndex;
        }
      }
    }
    cx += 4;
    if (cx > width - 4) break;
  }
  return fb;
}

const MICRO_FONT = {
  ' ': [0, 0, 0, 0, 0],
  A: [0b010, 0b101, 0b111, 0b101, 0b101], B: [0b110, 0b101, 0b110, 0b101, 0b110],
  C: [0b011, 0b100, 0b100, 0b100, 0b011], D: [0b110, 0b101, 0b101, 0b101, 0b110],
  E: [0b111, 0b100, 0b110, 0b100, 0b111], F: [0b111, 0b100, 0b110, 0b100, 0b100],
  G: [0b011, 0b100, 0b101, 0b101, 0b011], H: [0b101, 0b101, 0b111, 0b101, 0b101],
  I: [0b111, 0b010, 0b010, 0b010, 0b111], K: [0b101, 0b101, 0b110, 0b101, 0b101],
  L: [0b100, 0b100, 0b100, 0b100, 0b111], M: [0b101, 0b111, 0b111, 0b101, 0b101],
  N: [0b101, 0b111, 0b111, 0b111, 0b101], O: [0b010, 0b101, 0b101, 0b101, 0b010],
  P: [0b110, 0b101, 0b110, 0b100, 0b100], R: [0b110, 0b101, 0b110, 0b101, 0b101],
  S: [0b011, 0b100, 0b010, 0b001, 0b110], T: [0b111, 0b010, 0b010, 0b010, 0b010],
  W: [0b101, 0b101, 0b111, 0b111, 0b101], Y: [0b101, 0b101, 0b010, 0b010, 0b010],
  '0': [0b010, 0b101, 0b101, 0b101, 0b010], '1': [0b010, 0b110, 0b010, 0b010, 0b111],
  '2': [0b110, 0b001, 0b010, 0b100, 0b111], '3': [0b110, 0b001, 0b010, 0b001, 0b110],
  '4': [0b101, 0b101, 0b111, 0b001, 0b001], '5': [0b111, 0b100, 0b110, 0b001, 0b110],
  '6': [0b011, 0b100, 0b110, 0b101, 0b010], '7': [0b111, 0b001, 0b010, 0b010, 0b010],
  '8': [0b010, 0b101, 0b010, 0b101, 0b010], '9': [0b010, 0b101, 0b011, 0b001, 0b110],
  ':': [0, 0b010, 0, 0b010, 0], '.': [0, 0, 0, 0, 0b010], '%': [0b101, 0b001, 0b010, 0b100, 0b101],
  '-': [0, 0, 0b111, 0, 0], '/': [0b001, 0b001, 0b010, 0b100, 0b100],
};

export { createFrameBuffer };
