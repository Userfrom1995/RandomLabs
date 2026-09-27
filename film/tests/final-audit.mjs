// Hearthlight final integration audit (Builder, Final Phase).
// Run: node film/tests/final-audit.mjs - exit non-zero on any failure.
// Pins the end-to-end premiere contract in one place: trailer frames land
// exactly on the 24 fps film lattice, the Space shortcut never fights a
// focused button, the full cut meets its binding counts, and a complete
// watch-through sweep (every shot x start/mid/end x desktop/mobile widths
// x reduced-motion on/off) paints without throws or empty frames.
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildTimeline, shotAt } from '../engine/timeline.js';
import { frameTime, frameCount, FRAME_FPS } from '../engine/frames.js';
import { renderAnimatic } from '../engine/animatic.js';
import { buildTrailer, trailerToFilmTime } from '../engine/trailer.js';
import { buildScoreEvents } from '../score/orchestra.js';
import { buildSfxEvents } from '../score/sfx.js';
import { buildVtt } from '../tools/render-captions.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let failures = 0;
const ok = (name, cond, detail = '') => {
  console.log((cond ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' - ' + detail : ''));
  if (!cond) failures++;
};

function makeRecorder() {
  const log = [];
  const norm = (a) => (typeof a === 'number' ? Number(a.toFixed(6)) : String(a));
  const grad = () => ({ addColorStop: (o, c) => { log.push(['addColorStop', norm(o), String(c)]); } });
  const stored = {};
  const ctx = new Proxy({}, {
    get(t, prop) {
      if (typeof prop !== 'string') return undefined;
      if (prop in stored) return stored[prop];
      return (...args) => {
        log.push([prop, ...args.map(norm)]);
        if (prop === 'createLinearGradient' || prop === 'createRadialGradient') return grad();
        return undefined;
      };
    },
    set(t, prop, v) { log.push(['set', prop, norm(v)]); stored[prop] = v; return true; },
  });
  return { ctx, log };
}

const sp = JSON.parse(readFileSync(join(root, 'story/screenplay.json'), 'utf8'));
const trailerSpec = JSON.parse(readFileSync(join(root, 'story/trailer.json'), 'utf8'));
const tl = buildTimeline(sp);
const trailer = buildTrailer(sp, trailerSpec);

// Final cut binding counts.
ok('film runtime exactly 270s', tl.total === 270, tl.total + 's');
ok('film is 6480 frames at 24fps', frameCount(tl.total) === 6480 && FRAME_FPS === 24);
ok('20 shots, 5 acts', tl.shots.length === 20 && tl.acts.length === 5);
ok('trailer exactly 30s in six moments',
  trailer.total === 30 && trailer.segments.length === 6, trailer.total + 's');
const { cues } = buildVtt(tl);
ok('22 caption cues covering every shot', cues.length === 22,
  cues.length + ' cues');
const shotIds = new Set(tl.shots.map((s) => s.id));
ok('every shot captioned',
  tl.shots.every((s) => cues.some((c) => Math.abs(c.start - (s.start + 0.01)) < s.dur + 4.5 &&
    shotAt(tl, Math.min(c.start, tl.total - 1e-3)).shot.id === s.id)) &&
  new Set(cues.map((c) => shotAt(tl, Math.min(c.start, tl.total - 1e-3)).shot.id)).size === 20);
ok('score produces 602 events', buildScoreEvents(tl).length === 602,
  buildScoreEvents(tl).length + ' events');
ok('sfx produces 50 events', buildSfxEvents(tl).length === 50,
  buildSfxEvents(tl).length + ' events');

// Trailer lattice exactness: every trailer frame IS a film frame. All map
// inputs are snapped to the 24 fps grid, so the intended frame index is
// exactly A + k in integers (A = film-start frame, k = offset); float noise
// around the lattice point is fine, landing a whole frame off is not.
import { frameIndex } from '../engine/frames.js';
let indexBad = 0; let parityBad = 0; let startBad = 0;
for (const seg of trailer.segments) {
  if (trailerToFilmTime(trailer, seg.start) !== seg.filmStart) startBad++;
}
const totalFrames = Math.round(trailer.total * FRAME_FPS);
for (let j = 0; j < totalFrames; j++) {
  const t = frameTime(j / FRAME_FPS);
  const ft = trailerToFilmTime(trailer, t);
  const seg = trailer.segments.find((s) => t >= s.start && t < s.end) ||
    trailer.segments[trailer.segments.length - 1];
  const want = frameIndex(seg.filmStart) + Math.round((t - seg.start) * FRAME_FPS);
  if (frameIndex(ft) !== want) indexBad++;
  if (shotAt(tl, ft).shot.id !== seg.shot) parityBad++;
}
ok('trailer segment starts map exactly to film starts', startBad === 0, startBad + ' off');
ok('all 720 trailer frames land on their intended film frame', indexBad === 0,
  indexBad + ' off by a frame of ' + totalFrames);
ok('every trailer frame resolves to its named shot', parityBad === 0, parityBad + ' mismatched');

// Space shortcut never fights a focused button: the keydown handler must
// return early for button targets before preventDefault/toggle.
const playerJs = readFileSync(join(root, 'player/player.js'), 'utf8');
const spaceAt = playerJs.indexOf("e.code === 'Space'");
const toggleAt = playerJs.indexOf('setPlaying(!state.playing)', spaceAt);
const spaceBlock = playerJs.slice(spaceAt, playerJs.indexOf('}', toggleAt) + 1);
ok('Space branch guards focused buttons',
  spaceAt !== -1 && spaceBlock.includes("matches('button')") &&
  spaceBlock.indexOf("matches('button')") < spaceBlock.indexOf('preventDefault'),
  'button guard must precede preventDefault');

// Full watch-through sweep: every shot x start/mid/end x 960/390 px x
// reduced-motion off/on paints a non-empty draw log with no throws.
let painted = 0; let thrown = 0; let empty = 0; let nanBad = 0;
const hasNaN = (log) => log.some((e) => e.some((v) => typeof v === 'number' && Number.isNaN(v)));
for (const s of tl.shots) {
  for (const dt of [1 / 48, s.dur / 2, s.dur - 1 / 48]) {
    for (const w of [960, 390]) {
      for (const rm of [false, true]) {
        try {
          const { ctx, log } = makeRecorder();
          renderAnimatic(ctx, tl, s.start + dt, { width: w, height: Math.round(w * 9 / 16), reducedMotion: rm });
          if (log.length === 0) empty++;
          else if (hasNaN(log)) nanBad++;
          else painted++;
        } catch { thrown++; }
      }
    }
  }
}
ok('watch-through sweep paints 240/240 frames', painted === 240 && thrown === 0 && empty === 0,
  painted + ' painted, ' + thrown + ' throws, ' + empty + ' empty');
ok('no NaN coordinates in any swept frame', nanBad === 0, nanBad + ' bad');

if (failures > 0) { console.error('FINAL-AUDIT RED: ' + failures + ' failures'); process.exit(1); }
console.log('FINAL-AUDIT GREEN');
