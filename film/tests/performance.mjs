// Hearthlight performance tests (Builder, Phase 3: Full Animation Performance).
// Run: node film/tests/performance.mjs - exit non-zero on any failure.
// Gates: 24 fps frame lock, frame-exact scrub, weather determinism +
// reduced-motion freeze, full-shot acting beats, eased camera (pinned
// behaviorally), 240-frame no-throw sweep, capture with frame indices.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildTimeline } from '../engine/timeline.js';
import { FRAME_FPS, frameTime, frameIndex, frameCount } from '../engine/frames.js';
import { renderAnimatic } from '../engine/animatic.js';
import { PARTICLE_FIELDS, particleFieldFor, drawParticles } from '../engine/particles.js';
import { easeInOut, blinkAt, poseFor } from '../engine/rigs.js';

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

const sha = (s) => createHash('sha256').update(s).digest('hex');
const sp = JSON.parse(readFileSync(join(root, 'story/screenplay.json'), 'utf8'));
const tl = buildTimeline(sp);

function renderHash(t, reducedMotion, width = 960) {
  const { ctx, log } = makeRecorder();
  renderAnimatic(ctx, tl, t, { width, height: 540, reducedMotion });
  return sha(JSON.stringify(log));
}

// 24 fps frame lock: grid pins, hostile input clamps, frame budget exact.
ok('frame rate is 24 fps', FRAME_FPS === 24);
ok('frameTime pins within a frame', frameTime(10.0) === frameTime(10.01));
ok('frameTime advances across frames', frameTime(10.0) !== frameTime(10.0 + 1 / 24));
ok('frameTime clamps hostile input', frameTime(NaN) === 0 && frameTime(Infinity) === 0 && frameTime(-3) === 0);
ok('frame budget exact', frameCount(270) === 6480 && frameIndex(269.999) === 6479);

// Frame-exact scrub: same frame index => identical draw stream, whether the
// call comes from playback timing or a seek landing mid-frame.
ok('renderer frame-exact (same frame)', renderHash(10.0, false) === renderHash(10.01, false));
ok('renderer advances frame to frame', renderHash(115.0, false) !== renderHash(115.0 + 1 / 24, false));
ok('renderer frame-exact under reduced motion', renderHash(42.25, true) === renderHash(42.26, true));
// Sensitivity is real: distinct seconds never collide.
ok('renderer sensitive across seconds', renderHash(10.0, false) !== renderHash(11.0, false));

// Weather: deterministic, frozen under reduced motion, alive otherwise.
function particleLog(shotId, t, reduced) {
  const shot = tl.shots.find((s) => s.id === shotId);
  const { ctx, log } = makeRecorder();
  drawParticles(ctx, String(tl.seed), shot, 960, 540, t, 0.5, 0.4, { x: 0, y: 0 }, reduced);
  return JSON.stringify(log);
}
ok('particles deterministic', particleLog('s13', 175.0, false) === particleLog('s13', 175.0, false));
ok('particles frozen under reduced motion',
  particleLog('s13', 175.0, true) === particleLog('s13', 178.0, true));
ok('particles alive in motion', particleLog('s13', 175.0, false) !== particleLog('s13', 176.0, false));
{
  const stormShot = tl.shots.find((s) => s.id === 's13');
  const rec = makeRecorder();
  drawParticles(rec.ctx, String(tl.seed), stormShot, 960, 540, 175.0, 0.5, 0.6, { x: 0, y: 0 }, false);
  const liveStrokes = rec.log.filter((e) => e[0] === 'stroke').length;
  const rec2 = makeRecorder();
  drawParticles(rec2.ctx, String(tl.seed), stormShot, 960, 540, 175.0, 0.5, 0.6, { x: 0, y: 0 }, true);
  const stillStrokes = rec2.log.filter((e) => e[0] === 'stroke').length;
  ok('storm streaks live, ticks when still', liveStrokes > 10 && stillStrokes === 0,
    liveStrokes + '/' + stillStrokes);
}
// Every background owns a weather field, and no field is orphaned.
{
  const usedBgs = [...new Set(tl.shots.map((s) => s.bg))].sort();
  ok('particle fields cover all screenplay bgs',
    usedBgs.every((b) => b in PARTICLE_FIELDS), usedBgs.join(','));
  ok('particle fields have no orphans',
    Object.keys(PARTICLE_FIELDS).every((b) => usedBgs.includes(b)));
  let fieldsOk = true;
  for (const s of tl.shots) {
    try { particleFieldFor(s); } catch { fieldsOk = false; }
  }
  ok('particleFieldFor resolves every shot', fieldsOk);
  let hostile = false;
  try { particleFieldFor({ bg: 'no-such-place' }); } catch (e) { hostile = /no particle field/.test(e.message); }
  ok('particleFieldFor throws guarded error', hostile);
}

// Acting: every shot carries a deliberate beat, all values bounded.
ok('blink dips then opens', blinkAt(2.4) === 0.15 && blinkAt(0.05) === 1);
ok('blink guards hostile local', blinkAt(NaN) === 1 && blinkAt(-1) === 1);
{
  let posesOk = true; let blinkOk = true;
  for (const s of tl.shots) {
    const pose = poseFor(s, 0.5, s.dur / 2);
    for (const v of [pose.nia.stride, pose.nia.lean, pose.nia.kneel, pose.nia.armRaise,
      pose.nia.stillness, pose.nia.flame, pose.yara.knot, pose.ruel.tread,
      pose.ruel.wag, pose.ruel.ear, pose.ruel.wake]) {
      if (!Number.isFinite(v) || v < -0.51 || v > 1.51) posesOk = false;
    }
    for (const b of [pose.nia.blink, pose.yara.blink]) {
      if (b !== 1 && b !== 0.15) blinkOk = false;
    }
  }
  ok('poses bounded on all 20 shots', posesOk);
  ok('blink rides every pose', blinkOk);
}
{
  const byId = (id) => tl.shots.find((s) => s.id === id);
  ok('s13 braced stride, storm tread', poseFor(byId('s13'), 0.5, 6).nia.stride === 0.5 &&
    poseFor(byId('s13'), 0.5, 6).ruel.tread === 0.4);
  ok('s15/s16 climb tread eased up', poseFor(byId('s15'), 0.5, 6).ruel.tread === 0.6 &&
    poseFor(byId('s16'), 0.5, 6).ruel.tread === 0.7);
  ok('s06 kneel receive ramps', poseFor(byId('s06'), 0.05, 1).nia.kneel < poseFor(byId('s06'), 0.9, 13).nia.kneel);
  ok('s19/s20 flame steady full', poseFor(byId('s19'), 0.5, 6).nia.flame === 1 &&
    poseFor(byId('s20'), 0.5, 6).nia.flame === 1);
  ok('yara knot beats set', poseFor(byId('s05'), 0.5, 7).yara.knot > 0 &&
    poseFor(byId('s07'), 0.5, 7).yara.knot === 0.5 &&
    poseFor(byId('s19'), 0.5, 6).yara.knot > 0);
}

// Camera easing, pinned behaviorally: the first scale call of a push-in at
// quarter progress must equal the eased zoom, never the linear one.
{
  const s = tl.shots.find((x) => x.id === 's01');
  const { ctx, log } = makeRecorder();
  renderAnimatic(ctx, tl, s.start + s.dur * 0.25, { width: 960, height: 540 });
  const scale = log.find((e) => e[0] === 'scale');
  const z = scale ? scale[1] : NaN;
  const eased = 1 + easeInOut(0.25) * 0.12;
  ok('push-in eases (not linear)', Math.abs(z - eased) < 1e-6 && Math.abs(z - 1.03) > 1e-4,
    'z=' + z);
}

// 240-frame sweep: every shot at start/mid/end, motion on/off, 960 + 390 px.
{
  let sweepOk = true; let count = 0;
  for (const s of tl.shots) {
    for (const k of [0.02, 0.5, 0.98]) {
      for (const reduced of [false, true]) {
        for (const width of [960, 390]) {
          try {
            const { ctx } = makeRecorder();
            renderAnimatic(ctx, tl, s.start + s.dur * k, { width, height: Math.round(width * 9 / 16), reducedMotion: reduced });
            count++;
          } catch { sweepOk = false; }
        }
      }
    }
  }
  ok('240-frame sweep renders without throws', sweepOk, count + ' frames');
}

// Capture loop re-pins with frame indices, byte-identical run to run.
execFileSync('node', [join(root, 'tools/capture.mjs')], { stdio: 'pipe' });
const first = readFileSync(join(root, 'dist/capture/heroes.json'));
execFileSync('node', [join(root, 'tools/capture.mjs')], { stdio: 'pipe' });
const second = readFileSync(join(root, 'dist/capture/heroes.json'));
ok('capture byte-identical run to run', first.equals(second));
{
  const heroes = JSON.parse(first.toString());
  const ids = Object.keys(heroes.frames);
  ok('capture covers all 20 shots', ids.length === 20);
  ok('capture records frame indices', ids.every((id) => Number.isInteger(heroes.frames[id].frame)));
}

// No em dashes in Phase 3 sources.
{
  const sources = ['index.html', 'player/player.js', 'player/gallery.js', 'player/player.css',
    'engine/animatic.js', 'engine/frames.js', 'engine/particles.js', 'engine/ink.js',
    'engine/paper.js', 'engine/backgrounds.js', 'engine/rigs.js',
    'tools/capture.mjs', 'tools/audit.mjs', 'tests/performance.mjs'];
  const dashy = sources.filter((f) => existsSync(join(root, f)) &&
    readFileSync(join(root, f), 'utf8').includes(String.fromCharCode(8212)));
  ok('no em dashes', dashy.length === 0, dashy.join(','));
}

if (failures) { console.error('PERFORMANCE RED: ' + failures + ' failures'); process.exit(1); }
console.log('PERFORMANCE GREEN');
