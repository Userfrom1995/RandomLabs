// Mythduel hostile regression suite (Tester, Phase 1, Refs #470).
//
// Red-team probes over the deterministic engine: boundary seeks, corrupt
// payloads, determinism across rebuilds, frame-grid idempotence, caption
// lattice, and continuity-tamper detectability. Pure node, no network, no
// wall-clock: exits 0 green, 1 red with the failing assertion named.
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildTimeline, beatAt, chapterAt, captionAt, formatTime } from '../engine/timeline.js';
import { frameTime, frameIndex, frameCount } from '../engine/frames.js';
import { substream } from '../engine/rng.js';
import { boilOffset } from '../engine/ink.js';
import { grainFlecks } from '../engine/paper.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let failed = 0;
const check = (name, ok, detail = '') => {
  console.log((ok ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' - ' + detail : ''));
  if (!ok) failed++;
};

const duel = JSON.parse(readFileSync(join(root, 'story/duel.json'), 'utf8'));
const tl = buildTimeline(duel);

// 1. Determinism: identical rebuild from a fresh parse.
const tl2 = buildTimeline(JSON.parse(readFileSync(join(root, 'story/duel.json'), 'utf8')));
check('rebuild total stable', tl.total === tl2.total, String(tl.total));
check('rebuild beats stable', JSON.stringify(tl.beats) === JSON.stringify(tl2.beats));

// 2. Boundary seeks never throw, never return null, always land in-range.
for (const t of [-1e9, -5, -0.001, 0, 171.999, 172, 1e9]) {
  let r = null;
  let threw = false;
  try { r = beatAt(tl, t); } catch { threw = true; }
  check('beatAt(' + t + ') resolves', !threw && !!r && !!r.beat, r ? r.beat.id : 'threw');
}
check('beatAt(negative) clamps to b01', beatAt(tl, -5).beat.id === 'b01');
check('beatAt(overflow) clamps to b08', beatAt(tl, 999).beat.id === 'b08');
check('beatAt(NaN) clamps to start', beatAt(tl, NaN).beat.id === 'b01');

// 3. Every beat start resolves to its own beat (exact boundary ownership).
let boundariesOk = true;
for (const b of tl.beats) {
  if (beatAt(tl, b.start).beat.id !== b.id) boundariesOk = false;
}
check('beat-start boundaries exact', boundariesOk);

// 4. Corrupt payloads throw fast with a message (never hang, never null-tl).
for (const [label, bad] of [['null', null], ['empty-obj', {}], ['empty-beats', { beats: [], chapters: [] }], ['no-chapters', { beats: [{ start: 0, dur: 1 }], chapters: [] }]]) {
  let threw = false;
  try { buildTimeline(bad); } catch { threw = true; }
  check('corrupt duel throws (' + label + ')', threw);
}

// 5. Frame grid: idempotent quantization, sane edges, 4128 frames for 172 s.
check('frameTime(NaN) is 0', frameTime(NaN) === 0);
check('frameTime(negative) is 0', frameTime(-1) === 0);
check('frameTime idempotent', (() => {
  for (let t = 0; t < 172; t += 0.37) {
    const q = frameTime(t);
    if (frameTime(q) !== q) return false;
  }
  return true;
})());
check('frameCount(172) is 4128', frameCount(172) === 4128, String(frameCount(172)));
check('frameIndex monotonic', frameIndex(46) > frameIndex(8));

// 6. RNG: 100-draw substream stability across independent handles.
{
  const s1 = substream('mythduel-470-phase1', 'boil|b01', 7);
  const s2 = substream('mythduel-470-phase1', 'boil|b01', 7);
  let same = true;
  for (let i = 0; i < 100; i++) { if (s1() !== s2()) same = false; }
  check('rng 100-draw stable', same);
}

// 7. Scrub-exact paint inputs: same t => same boil and grain.
{
  const o1 = boilOffset(tl.seed, 'THOR', 3.5);
  const o2 = boilOffset(tl.seed, 'THOR', 3.5);
  check('boil scrub-exact', JSON.stringify(o1) === JSON.stringify(o2));
  const g1 = grainFlecks(tl.seed, 'stage', 3.5, 60);
  const g2 = grainFlecks(tl.seed, 'stage', 3.5, 60);
  check('grain scrub-exact', JSON.stringify(g1) === JSON.stringify(g2));
  check('grain count sane', g1.length === 60, String(g1.length));
}

// 8. captionAt hostile: null/empty/far-future never throw, return null.
check('captionAt(null) is null', captionAt(null, 1) === null);
check('captionAt(empty) is null', captionAt({ captions: [] }, 1) === null);
check('captionAt(far-future) is null', captionAt(tl.beats[0], 9999) === null);
check('captionAt finds voiced line', captionAt(tl.beats[0], 2.0)?.who === 'THOR');

// 9. Caption lattice: every cue on the 24 fps grid, inside its beat.
{
  let latticeOk = true;
  for (const b of tl.beats) {
    for (const c of b.captions || []) {
      if (Math.abs(c.t * 24 - Math.round(c.t * 24)) > 1e-9) latticeOk = false;
      if (c.t < 0 || c.t + (c.dur || 4.0) > b.dur + 1e-9) latticeOk = false;
    }
  }
  check('captions lattice-aligned and inside beats', latticeOk);
}

// 10. Continuity-tamper detectability: a mutated entry must mismatch prev exit.
{
  const tampered = JSON.parse(JSON.stringify(duel));
  tampered.beats[2].continuity.entry.thor.fatigue = -5;
  const ttl = buildTimeline(tampered);
  const prev = JSON.stringify(ttl.beats[1].continuity.exit);
  const got = JSON.stringify(ttl.beats[2].continuity.entry);
  check('ledger tamper detectable', prev !== got);
}

// 11. Chapters cover the full runtime end to end.
check('chapterAt(0) is The Challenge', chapterAt(tl, 0).chapter.title === 'The Challenge');
check('chapterAt(end) is Mercy as Strength', chapterAt(tl, 171).chapter.title === 'Mercy as Strength');
check('formatTime(172) is 2:52', formatTime(172) === '2:52');

if (failed) {
  console.error('HOSTILE RED: ' + failed + ' probe(s) failed');
  process.exit(1);
}
console.log('HOSTILE GREEN: all red-team probes pass');
