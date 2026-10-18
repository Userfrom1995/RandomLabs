// Renders the M1 first frame (decoded demo E1M1 automap + status bar) to
// doom/docs/first-frame.png via a dependency-free PNG writer (node:zlib).
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

const eng = await initEngine({ wadBytes: buildDemoWad(), map: 'E1M1' });
const { data } = eng.__fb;
const pal = eng.__palette;
const W = 320, H = 200;
const raw = Buffer.alloc((W * 3 + 1) * H);
for (let y = 0; y < H; y++) {
  raw[y * (W * 3 + 1)] = 0;
  for (let x = 0; x < W; x++) {
    const c = data[y * W + x] * 3;
    raw[y * (W * 3 + 1) + 1 + x * 3] = pal[c];
    raw[y * (W * 3 + 1) + 1 + x * 3 + 1] = pal[c + 1];
    raw[y * (W * 3 + 1) + 1 + x * 3 + 2] = pal[c + 2];
  }
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
mkdirSync(join(root, 'docs'), { recursive: true });
writeFileSync(join(root, 'docs', 'first-frame.png'), png);
console.log(`first frame: E1M1 automap ${W}x${H} -> doom/docs/first-frame.png (${png.length} bytes)`);
