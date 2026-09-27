// Hearthlight premiere gates (Phase 5): trailer cut, caption export,
// poster set, end card, and theatre robustness.
// Run: node film/tests/premiere.mjs - exit non-zero on any failure.
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildTimeline, shotAt } from '../engine/timeline.js';
import { frameTime, frameIndex } from '../engine/frames.js';
import { buildTrailer, trailerToFilmTime } from '../engine/trailer.js';
import { renderAnimatic } from '../engine/animatic.js';
import { buildVtt, vttStamp } from '../tools/render-captions.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let failures = 0;
const ok = (name, cond, detail = '') => {
  console.log((cond ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' - ' + detail : ''));
  if (!cond) failures++;
};

function loadJson(rel, label) {
  try {
    return JSON.parse(readFileSync(join(root, rel), 'utf8'));
  } catch (err) {
    console.error(label + ' is corrupt (' + rel + '): ' + err.message);
    process.exit(1);
  }
}

// Silent canvas: the recorder pattern from the capture loop, so the engine
// sweep below runs in node with no browser.
function makeRecorder() {
  const grad = () => ({ addColorStop: () => {} });
  return new Proxy({}, {
    get(t, prop) {
      if (typeof prop !== 'string') return undefined;
      if (prop === 'canvas') return { width: 960, height: 540 };
      return (...args) => {
        if (prop === 'createLinearGradient' || prop === 'createRadialGradient') return grad();
        if (prop === 'measureText') return { width: 10 };
        if (prop === 'getImageData') return { data: [] };
        return undefined;
      };
    },
    set() { return true; },
  });
}

const sp = loadJson('story/screenplay.json', 'story/screenplay.json');
const spec = loadJson('story/trailer.json', 'story/trailer.json');
const tl = buildTimeline(sp);

// trailer cut: shape + runtime gate
let trailer = null;
try {
  trailer = buildTrailer(sp, spec);
  ok('trailer builds', true, trailer.segments.length + ' segments');
} catch (err) {
  ok('trailer builds', false, err.message);
}
if (trailer) {
  ok('trailer runtime 25-35s', trailer.total >= 25 && trailer.total <= 35, trailer.total + 's');
  ok('trailer exactly 30s', trailer.total === 30, trailer.total + 's');
  ok('trailer covers 6 moments', trailer.segments.length === 6);
  // every segment lands inside its named shot
  let inBounds = true;
  for (const seg of trailer.segments) {
    const shot = tl.shots.find((s) => s.id === seg.shot);
    if (!shot || seg.in < 0 || seg.in + seg.dur > shot.dur + 1e-9) inBounds = false;
  }
  ok('trailer segments in shot bounds', inBounds);
  // mapping is contiguous, monotonic, and starts at each film in-point
  let mono = true; let prev = -Infinity; let startsOk = true;
  for (const seg of trailer.segments) {
    if (Math.abs(trailerToFilmTime(trailer, seg.start) - seg.filmStart) > 1e-9) startsOk = false;
  }
  for (let t = 0; t <= trailer.total; t += 0.25) {
    const ft = trailerToFilmTime(trailer, t);
    if (ft < prev - 1e-9) mono = false;
    prev = ft;
  }
  ok('trailer map hits segment in-points', startsOk);
  ok('trailer map monotonic', mono);
  ok('trailer hostile clamp (negative)', trailerToFilmTime(trailer, -99) === trailer.segments[0].filmStart);
  const last = trailer.segments[trailer.segments.length - 1];
  ok('trailer hostile clamp (overshoot)', Math.abs(trailerToFilmTime(trailer, 1e9) - (last.filmEnd - 1e-6)) < 1e-9);
  ok('trailer hostile NaN to start', trailerToFilmTime(trailer, NaN) === trailer.segments[0].filmStart);
  ok('trailer hostile null to start', trailerToFilmTime(trailer, null) === trailer.segments[0].filmStart);
  ok('trailer hostile undefined to start', trailerToFilmTime(trailer, undefined) === trailer.segments[0].filmStart);
  ok('trailer hostile +Infinity holds final frame',
    Math.abs(trailerToFilmTime(trailer, Infinity) - (last.filmEnd - 1e-6)) < 1e-9);
  // frame parity: every mapped trailer frame quantizes into its named shot,
  // so each trailer frame IS the same film frame a film seek would paint.
  let parity = true;
  for (const seg of trailer.segments) {
    for (let k = 0; k < seg.dur * 24; k++) {
      const ft = frameTime(trailerToFilmTime(trailer, seg.start + k / 24));
      if (shotAt(tl, ft).shot.id !== seg.shot) { parity = false; break; }
    }
    if (!parity) break;
  }
  ok('trailer frames are film frames', parity);
  // engine paints every trailer segment boundary without throws,
  // at desktop and 390 px widths, reduced motion on and off.
  let painted = true; let paintedDetail = '';
  try {
    for (const seg of trailer.segments) {
      for (const dt of [0, seg.dur / 2, seg.dur - 1 / 24]) {
        for (const w of [960, 390]) {
          for (const rm of [false, true]) {
            renderAnimatic(makeRecorder(), tl, trailerToFilmTime(trailer, seg.start + dt),
              { width: w, height: Math.round(w * 9 / 16), reducedMotion: rm });
          }
        }
      }
    }
  } catch (err) {
    painted = false; paintedDetail = err.message;
  }
  ok('trailer cut paints (960 + 390px, reduced on/off)', painted, paintedDetail);
  void frameIndex;
}

// caption export: committed vtt matches a rebuild, full shot coverage
const { vtt, cues } = buildVtt(tl);
let committed = null;
try {
  committed = readFileSync(join(root, 'captions.vtt'), 'utf8');
} catch { /* checked below */ }
ok('captions.vtt committed', typeof committed === 'string');
if (committed) ok('committed vtt matches rebuild', committed === vtt, cues.length + ' cues');
const cuedShots = new Set();
let cueBounds = true; let cueOrder = true; let prevEnd = -Infinity;
for (const q of cues) {
  const shot = tl.shots.find((s) => q.start >= s.start - 1e-9 && q.end <= s.end + 1e-9);
  if (!shot) cueBounds = false;
  else cuedShots.add(shot.id);
  if (q.start < prevEnd - 1e-9) cueOrder = false;
  prevEnd = q.end;
}
ok('every shot has a caption cue', tl.shots.every((s) => cuedShots.has(s.id)), cues.length + ' cues');
ok('cue times inside shot bounds', cueBounds);
ok('cues sorted, no overlaps', cueOrder);
ok('vttStamp', vttStamp(0) === '00:00.000' && vttStamp(270) === '04:30.000' && vttStamp(65.25) === '01:05.250');

// poster set: three original posters, all on the wall
ok('poster v1 exists', existsSync(join(root, 'posters/poster-v1.svg')));
ok('poster v2 exists', existsSync(join(root, 'posters/poster-v2.svg')));
ok('poster v3 exists', existsSync(join(root, 'posters/poster-v3.svg')));
const html = readFileSync(join(root, 'index.html'), 'utf8');
ok('poster wall shows all three', html.includes('posters/poster-v1.svg') && html.includes('posters/poster-v2.svg') && html.includes('posters/poster-v3.svg'));
if (trailer) {
  ok('trailer labels match shot titles',
    trailer.segments.every((seg) => {
      const shot = tl.shots.find((s) => s.id === seg.shot);
      return !!shot && seg.label === shot.title;
    }), trailer.segments.map((s) => s.shot + '=' + JSON.stringify(s.label)).join(' '));
}

// premiere theatre surface: end card, trailer cut, fallbacks
for (const id of ['endCard', 'endTitle', 'endMsg', 'endCredits', 'btnReplay', 'btnModeSwap', 'btnDismiss', 'trailerCall', 'btnTrailer', 'btnFilm']) {
  ok('premiere control present: ' + id, html.includes('id="' + id + '"'));
}
ok('noscript fallback', html.includes('<noscript>'));
ok('captions download link', html.includes('captions.vtt'));
const js = readFileSync(join(root, 'player/player.js'), 'utf8');
for (const token of ['filmTimeOf', 'setMode', 'showEndCard', 'hideEndCard', 'trailerToFilmTime', 'END_CREDITS']) {
  ok('premiere wiring: ' + token, js.includes(token));
}
ok('canvas 2d guard', js.includes("getContext('2d')") && js.includes('cannot paint the film'));
ok('trailer failure hides honestly', js.includes('trailerFailed') && js.includes('trailerCall'));
const css = readFileSync(join(root, 'player/player.css'), 'utf8');
ok('end card styled', css.includes('.end-card'));
ok('focus visible styled', css.includes(':focus-visible'));
ok('poster grid styled', css.includes('.poster-grid'));

// no em dashes in new or touched premiere sources
const sources = ['index.html', 'player/player.js', 'player/player.css',
  'engine/trailer.js', 'tools/render-captions.mjs', 'tests/premiere.mjs', 'tools/audit.mjs'];
const dashy = sources.filter((f) => {
  try { return readFileSync(join(root, f), 'utf8').includes('\u2014'); } catch { return false; }
});
ok('no em dashes', dashy.length === 0, dashy.join(','));

if (failures) { console.error('PREMIERE RED: ' + failures + ' failures'); process.exit(1); }
console.log('PREMIERE GREEN');
