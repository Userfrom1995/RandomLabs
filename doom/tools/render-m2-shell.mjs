// Renders M2 shell proofs headless (node-only): the engine framebuffer after
// an M2 ticcmd drive sequence, written at the two ladder rungs the shell
// serves (desktop 640x400 = 2x nearest-neighbor of the 320x200 core,
// mobile 320x200 = 1x battery-saver rung). Browser compositing (putImageData
// plus WebGL quad plus touch overlay pixels) is UNSUPPORTED_BY_DESIGN in this
// runner (no DOM canvas, GlUnavailable by design); overlay structure stays
// covered by the 48/48 static audit. Writes doom/docs/shell-1440.png,
// doom/docs/shell-390.png, and doom/docs/render-m2.md.
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';
import { buildDemoWad } from './make-demo-wad.mjs';
import { initEngine } from '../src/engine/doomEngine.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function crc32Table() {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
}
const TABLE = crc32Table();
function crc32(bytes) {
  let c = 0xffffffff;
  for (const b of bytes) c = TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), Buffer.from(data)]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function writePNG(path, W, H, rgb) {
  const raw = Buffer.alloc((W * 3 + 1) * H);
  for (let y = 0; y < H; y++) {
    raw[y * (W * 3 + 1)] = 0;
    rgb.copy(raw, y * (W * 3 + 1) + 1, y * W * 3, (y + 1) * W * 3);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; ihdr[9] = 2;
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  writeFileSync(path, png);
  return png.length;
}

// Drive the M2 tic pipeline so the proof frame differs from the M1 static
// spawn frame: run forward, strafe, turn, and fire across 35 ticks (1s).
const eng = await initEngine({ wadBytes: buildDemoWad(), map: 'E1M1' });
for (let t = 0; t < 12; t++) {
  eng.injectTiccmd({ forwardmove: 50, sidemove: 0, angleturn: 0, buttons: 0, weaponSelect: null });
  eng.tickOnce();
}
for (let t = 0; t < 8; t++) {
  eng.injectTiccmd({ forwardmove: 0, sidemove: 40, angleturn: 320, buttons: 0, weaponSelect: null });
  eng.tickOnce();
}
for (let t = 0; t < 15; t++) {
  eng.injectTiccmd({ forwardmove: 25, sidemove: 0, angleturn: -640, buttons: t === 14 ? 1 : 0, weaponSelect: t === 0 ? 3 : null });
  eng.tickOnce();
}
const { data } = eng.__fb;
const pal = eng.__palette;
const p = eng.getPlayer();

function palRGB(ci) {
  return [pal[ci * 3], pal[ci * 3 + 1], pal[ci * 3 + 2]];
}

// Mobile rung: 320x200 1x (battery-saver rung the shell pins on mobile).
const MW = 320, MH = 200;
const mobile = Buffer.alloc(MW * MH * 3);
for (let y = 0; y < MH; y++) {
  for (let x = 0; x < MW; x++) {
    const [r, g, b] = palRGB(data[y * MW + x]);
    mobile[(y * MW + x) * 3] = r;
    mobile[(y * MW + x) * 3 + 1] = g;
    mobile[(y * MW + x) * 3 + 2] = b;
  }
}
// Desktop rung: 640x400 2x nearest-neighbor (ladder top the shell serves).
const DW = 640, DH = 400;
const desktop = Buffer.alloc(DW * DH * 3);
for (let y = 0; y < DH; y++) {
  for (let x = 0; x < DW; x++) {
    const [r, g, b] = palRGB(data[(y >> 1) * MW + (x >> 1)]);
    desktop[(y * DW + x) * 3] = r;
    desktop[(y * DW + x) * 3 + 1] = g;
    desktop[(y * DW + x) * 3 + 2] = b;
  }
}

mkdirSync(join(root, 'docs'), { recursive: true });
const dBytes = writePNG(join(root, 'docs', 'shell-1440.png'), DW, DH, desktop);
const mBytes = writePNG(join(root, 'docs', 'shell-390.png'), MW, MH, mobile);

const md = [
  '# Doom M2 rendered shell proofs (headless)',
  '',
  '- **Updated:** 2026-09-17 (M2 fixer hardening)',
  '- **Tool:** `doom/tools/render-m2-shell.mjs` (node-only, no browser)',
  `- **Scene:** demo E1M1 after a 35-tick M2 ticcmd drive (run 12t, strafe+turn 8t, walk+turn+fire 15t, weapon 3)`,
  `- **Player:** x=${p.x.toFixed(2)} y=${p.y.toFixed(2)} angle=${p.angle.toFixed(2)} weapon=${p.weapon} attacks=${p.attackCount}`,
  `- **Desktop proof:** \`doom/docs/shell-1440.png\` 640x400 2x nearest-neighbor (${dBytes} bytes, ladder top rung)`,
  `- **Mobile proof:** \`doom/docs/shell-390.png\` 320x200 1x (${mBytes} bytes, battery-saver rung)`,
  '- **Not rendered here:** browser compositing (putImageData/WebGL quad pixels), touch-overlay DOM pixels, pause-recapture and remap-table pixels.',
  '  No DOM canvas exists in this runner (GlUnavailable by design, see bench-m2.json glProbe);',
  '  those cells are UNSUPPORTED_BY_DESIGN headless with M5 Playwright ownership, and overlay',
  '  structure stays covered by the 48/48 static audit (`docs/audit-m2.md`).',
  '',
].join('\n');
writeFileSync(join(root, 'docs', 'render-m2.md'), md);
console.log(`M2 shell proofs: shell-1440.png 640x400 (${dBytes} bytes), shell-390.png 320x200 (${mBytes} bytes)`);
console.log(`player x=${p.x.toFixed(2)} y=${p.y.toFixed(2)} angle=${p.angle.toFixed(2)} weapon=${p.weapon} attacks=${p.attackCount}`);
