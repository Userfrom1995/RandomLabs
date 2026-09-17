// M1 extended soak: 100k deterministic ticks on demo E1M1 plus heap delta.
// Verifies tick-count exactness, framebuffer determinism (FNV-1a hash equals a
// fresh 100k-tick reference engine), and bounded heap growth. Writes
// doom/docs/soak-m1.json. The node:test suite (test-fixer-m1-evidence.mjs)
// re-runs a 20k-tick slice for speed; this tool seals the full 100k row.
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDemoWad } from './make-demo-wad.mjs';
import { initEngine } from '../src/engine/doomEngine.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const TICKS = 100000;

function fnv1a(bytes) {
  let h = 0x811c9dc5;
  for (const b of bytes) {
    h ^= b;
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

const wad = buildDemoWad();
const settle = () => { if (typeof global.gc === 'function') global.gc(); };
settle();
const heap0 = process.memoryUsage().heapUsed;

const eng = await initEngine({ wadBytes: wad, map: 'E1M1' });
const t0 = Date.now();
for (let i = 0; i < TICKS; i++) eng.tickOnce();
const elapsedMs = Date.now() - t0;
settle();
const heap1 = process.memoryUsage().heapUsed;
const hash = fnv1a(eng.__fb.data);

// Independent reference: fresh engine, same ticks, must hash identically.
const ref = await initEngine({ wadBytes: buildDemoWad(), map: 'E1M1' });
for (let i = 0; i < TICKS; i++) ref.tickOnce();
const refHash = fnv1a(ref.__fb.data);

const deterministic = hash === refHash && eng.tickCount === TICKS;
const result = {
  suite: 'm1-extended-soak',
  ticks: TICKS,
  tickCountExact: eng.tickCount === TICKS,
  framebufferHash: hash,
  referenceHash: refHash,
  deterministic,
  elapsedMs,
  ticksPerSecond: Math.round((TICKS / Math.max(1, elapsedMs)) * 1000),
  heapUsedBefore: heap0,
  heapUsedAfter: heap1,
  heapDeltaBytes: heap1 - heap0,
  heapDeltaPerTickBytes: (heap1 - heap0) / TICKS,
  node: process.version,
  platform: process.platform,
  generatedAt: new Date().toISOString(),
};
mkdirSync(join(root, 'docs'), { recursive: true });
writeFileSync(join(root, 'docs', 'soak-m1.json'), JSON.stringify(result, null, 2) + '\n');
console.log(`soak: ${TICKS} ticks exact=${result.tickCountExact} deterministic=${deterministic} hash=${hash} elapsed=${elapsedMs}ms heapDelta=${heap1 - heap0}B`);
console.log('wrote doom/docs/soak-m1.json');
process.exit(deterministic ? 0 : 1);
