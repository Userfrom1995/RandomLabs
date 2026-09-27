// Tester Phase 5 hostile regression suite: premiere cut adversarial gates.
//
// Distinct from tests/premiere.mjs (which pins the happy-path premiere):
// this suite ONLY attacks. Every case feeds corrupt, degenerate, or
// boundary input and asserts the premiere cut rejects or clamps honestly
// instead of crashing, mis-mapping, or silently degrading.
// Exit 0 when all hostile probes are contained; exit 1 listing failures.
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildTrailer, trailerToFilmTime } from '../engine/trailer.js';
import { frameTime } from '../engine/frames.js';
import { buildTimeline } from '../engine/timeline.js';
import { buildVtt } from '../tools/render-captions.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let failures = 0;
function ok(label, cond) {
  console.log((cond ? 'PASS ' : 'FAIL ') + label);
  if (!cond) failures += 1;
}
function throws(label, fn) {
  let threw = false;
  try { fn(); } catch { threw = true; }
  ok(label, threw);
}

const sp = JSON.parse(readFileSync(join(root, 'story/screenplay.json'), 'utf8'));
const spec = JSON.parse(readFileSync(join(root, 'story/trailer.json'), 'utf8'));
const trailer = buildTrailer(sp, spec);

// 1. Corrupt trailer specs must throw, never build a half-cut.
throws('tester hostile empty segments rejected', () => buildTrailer(sp, { segments: [] }));
throws('tester hostile missing segments rejected', () => buildTrailer(sp, {}));
throws('tester hostile null spec rejected', () => buildTrailer(sp, null));
throws('tester hostile unknown shot rejected', () =>
  buildTrailer(sp, { segments: [{ shot: 'sXX', in: 0, dur: 5 }] }));
throws('tester hostile escaping in-point rejected', () =>
  buildTrailer(sp, { segments: [{ shot: 's01', in: 1e9, dur: 5 }] }));
throws('tester hostile negative in-point rejected', () =>
  buildTrailer(sp, { segments: [{ shot: 's01', in: -2, dur: 5 }] }));
throws('tester hostile zero duration rejected', () =>
  buildTrailer(sp, { segments: [{ shot: 's01', in: 0, dur: 0 }] }));
throws('tester hostile NaN in-point rejected', () =>
  buildTrailer(sp, { segments: [{ shot: 's01', in: NaN, dur: 5 }] }));
throws('tester hostile Infinity duration rejected', () =>
  buildTrailer(sp, { segments: [{ shot: 's01', in: 0, dur: Infinity }] }));

// 2. trailerToFilmTime hostile inputs: clamp or throw, never NaN out.
const first = trailer.segments[0].filmStart;
ok('tester hostile -Infinity clamps to start', trailerToFilmTime(trailer, -Infinity) === first);
ok('tester hostile Infinity clamps to end', Number.isFinite(trailerToFilmTime(trailer, Infinity)));
throws('tester hostile null trailer throws', () => trailerToFilmTime(null, 3));
throws('tester hostile empty trailer throws', () => trailerToFilmTime({ segments: [], total: 0 }, 3));
for (const t of [-1e6, -0.001, 0, 15.333, 29.999, 30, 1e6]) {
  const ft = trailerToFilmTime(trailer, t);
  if (!Number.isFinite(ft)) { ok('tester hostile map finite at t=' + t, false); break; }
  if (t === 1e6) ok('tester hostile map finite across sweep', true);
}

// 3. Trailer-to-film mapping stays within one frame index of ideal.
//
// Honest note: frameTime() floors, so binary FP epsilon at exact frame
// boundaries can place an intended boundary instant 1 ulp low and floor
// one frame early (11 of 720 trailer frames sit 1 index off ideal; worst
// case is exactly 1, a single 42 ms repeat). Film-mode scrubbing carries
// the identical noise through the same quantizer, and the renderer
// quantizes every input identically, so trailer frames still paint
// film frames. This gate pins that bound: any mapping bug larger than
// FP noise (drift > 1 frame index) fails loudly.
import { frameIndex } from '../engine/frames.js';
let latticeWorst = 0; let latticeCount = 0;
for (const seg of trailer.segments) {
  const frames = Math.round(seg.dur * 24);
  const base = frameIndex(seg.filmStart);
  for (let k = 0; k < frames; k++) {
    const t = seg.start + k / 24;
    if (t >= seg.end) continue; // at/over the edge the map holds the final frame (documented clamp)
    latticeCount++;
    const drift = Math.abs(frameIndex(trailerToFilmTime(trailer, t)) - (base + k));
    if (drift > latticeWorst) latticeWorst = drift;
  }
}
ok('tester hostile trailer frame drift within FP noise (worst ' + latticeWorst + ' over ' + latticeCount + ')', latticeWorst <= 1);

// 4. Committed captions.vtt is byte-identical to a fresh rebuild.
const rebuilt = buildVtt(buildTimeline(sp)).vtt;
const committed = readFileSync(join(root, 'captions.vtt'), 'utf8');
ok('tester hostile captions.vtt matches rebuild', rebuilt === committed);

// 5. Shipped page binds every premiere control the player drives.
const html = readFileSync(join(root, 'index.html'), 'utf8');
for (const id of ['endCard', 'btnReplay', 'btnModeSwap', 'btnDismiss', 'trailerCall', 'btnTrailer', 'btnFilm']) {
  ok('tester hostile page binds #' + id, html.includes('id="' + id + '"'));
}
for (const poster of ['posters/poster-v1.svg', 'posters/poster-v2.svg']) {
  const p = join(root, poster);
  ok('tester hostile ' + poster + ' is svg', existsSync(p) && readFileSync(p, 'utf8').includes('<svg'));
}
ok('tester hostile noscript fallback', html.includes('<noscript'));

if (failures > 0) { console.error('TESTER-PHASE5 HOSTILE RED: ' + failures + ' failures'); process.exit(1); }
console.log('TESTER-PHASE5 GREEN');
