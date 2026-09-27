// Hearthlight smoke test (Phase 1): deterministic core invariants.
// Run: node film/tests/smoke.mjs — exit non-zero on any failure.
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hashSeed, mulberry32, substream } from '../engine/rng.js';
import { buildTimeline, shotAt, captionAt, formatTime } from '../engine/timeline.js';
import { motifFor } from '../score/themes.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let failures = 0;
const ok = (name, cond, detail = '') => {
  console.log((cond ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' - ' + detail : ''));
  if (!cond) failures++;
};

ok('hashSeed stable', hashSeed('hearthlight') === hashSeed('hearthlight'));
const r1 = mulberry32(42); const r2 = mulberry32(42);
ok('mulberry32 stable', r1() === r2() && r1() === r2());
ok('substream stable', substream('s', 'boil|s01', 3)() === substream('s', 'boil|s01', 3)());
ok('substream isolated', substream('s', 'boil|s01', 3)() !== substream('s', 'boil|s02', 3)());

const sp = JSON.parse(readFileSync(join(root, 'story/screenplay.json'), 'utf8'));
const tl = buildTimeline(sp);
ok('total runtime 270s', tl.total === 270, tl.total + 's');
ok('formatTime', formatTime(270) === '4:30' && formatTime(65) === '1:05');
const mid = shotAt(tl, 111);
ok('shotAt act boundary', mid.shot.id === 's09', mid.shot.id);
const cap = captionAt(tl.shots[0], 2.5);
ok('caption lookup', cap && cap.who === 'NARRATOR');
ok('no caption before line', captionAt(tl.shots[0], 0.5) === null);
for (const s of tl.shots) motifFor(s.music);
ok('all motifs resolve', true);

if (failures) { console.error('SMOKE RED'); process.exit(1); }
console.log('SMOKE GREEN');
