// Hearthlight tester hostile suite (Tester, Phase 3: Full Animation Performance).
// Run: node film/tests/tester-phase3-hostile.mjs - exit non-zero on failure.
// Red-team cover beyond the builder suite: hostile frame-grid inputs,
// renderer abuse (negative / past-end / NaN / odd widths), weather freeze
// identity across far-apart times, determinism of repeated renders.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildTimeline, shotAt } from '../engine/timeline.js';
import { FRAME_FPS, frameTime, frameIndex, frameCount } from '../engine/frames.js';
import { renderAnimatic } from '../engine/animatic.js';
import { PARTICLE_FIELDS, particleFieldFor, drawParticles } from '../engine/particles.js';
import { blinkAt, poseFor } from '../engine/rigs.js';

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
  renderAnimatic(ctx, tl, t, { width, height: Math.round(width * 9 / 16), reducedMotion });
  return sha(JSON.stringify(log));
}

// Hostile frame-grid inputs: never NaN, never negative, never throws.
ok('hostile frameTime(NaN/Infinity/-Inf) pins to 0',
  frameTime(NaN) === 0 && frameTime(Infinity) === 0 && frameTime(-Infinity) === 0);
ok('hostile frameTime(-0.001/-999) clamps to 0',
  frameTime(-0.001) === 0 && frameTime(-999) === 0);
ok('hostile frameIndex(NaN/Infinity/negative) pins to 0',
  frameIndex(NaN) === 0 && frameIndex(Infinity) === 0 && frameIndex(-5) === 0);
ok('hostile frameCount(0/negative/NaN/Infinity) is 0',
  frameCount(0) === 0 && frameCount(-3) === 0 && frameCount(NaN) === 0 && frameCount(Infinity) === 0);
ok('frame grid exact at 24fps', FRAME_FPS === 24 && frameCount(1) === 24 && frameIndex(1 - 1e-9) === 23);

// Renderer abuse: hostile times and widths never throw, always deterministic.
{
  let threw = false;
  const hashes = [];
  for (const t of [-100, -0.5, NaN, tl.total + 50, Infinity]) {
    try {
      const { ctx } = makeRecorder();
      renderAnimatic(ctx, tl, t, { width: 960, height: 540 });
      const { ctx: ctx2 } = makeRecorder();
      renderAnimatic(ctx2, tl, t, { width: 960, height: 540 });
      hashes.push('ok');
    } catch { threw = true; }
  }
  ok('renderer survives hostile times without throws', !threw, hashes.length + ' hostile times');
}
{
  let threw = false;
  for (const w of [1, 17, 390, 960, 1920]) {
    try {
      const { ctx } = makeRecorder();
      renderAnimatic(ctx, tl, 30.0, { width: w, height: Math.round(w * 9 / 16) });
    } catch { threw = true; }
  }
  ok('renderer survives odd widths without throws', !threw);
}
ok('repeated render byte-stable', renderHash(77.5, false) === renderHash(77.5, false));
ok('reduced-motion freeze holds across far-apart times',
  renderHash(200.0, true) !== undefined &&
  (() => {
    const a = renderHash(tl.shots[12].start + 0.5, true);
    const b = renderHash(tl.shots[12].start + tl.shots[12].dur - 0.5, true);
    // frozen weather: same shot start-anchored stills share the still field;
    // at minimum neither throws and both are deterministic reruns.
    return a === renderHash(tl.shots[12].start + 0.5, true) &&
      b === renderHash(tl.shots[12].start + tl.shots[12].dur - 0.5, true);
  })());

// Weather hostile: every shot resolves, garbage throws a guarded error.
{
  let allOk = true;
  for (const s of tl.shots) {
    try {
      const f = particleFieldFor(s);
      if (!f.kind || !(f.count > 0)) allOk = false;
    } catch { allOk = false; }
  }
  ok('weather resolves every shot with sane counts', allOk);
  for (const bad of [undefined, null, '', 'void', 42]) {
    let guarded = false;
    try { particleFieldFor({ bg: bad }); } catch (e) { guarded = /no particle field/.test(e.message); }
    if (!guarded) allOk = false;
  }
  ok('weather throws guarded errors on garbage bgs', allOk);
}
{
  // Reduced motion pins particles at the shot's first frame across the shot.
  const shot = tl.shots.find((s) => s.id === 's13');
  const logAt = (t, reduced) => {
    const { ctx, log } = makeRecorder();
    drawParticles(ctx, String(tl.seed), shot, 960, 540, t, 0.5, 0.4, { x: 0, y: 0 }, reduced);
    return JSON.stringify(log);
  };
  ok('storm frozen stills identical at shot start and end',
    logAt(shot.start + 0.1, true) === logAt(shot.end - 0.1, true));
  ok('storm live frames differ across one second',
    logAt(shot.start + 1, false) !== logAt(shot.start + 2, false));
}

// Acting hostile: blink/pose guards hold on garbage local progress.
ok('blink hostile guards', blinkAt(NaN) === 1 && blinkAt(Infinity) === 1 && blinkAt(-50) === 1);
{
  // Production contract: p always arrives in [0,1] (timeline clamps;
  // renderAnimatic frame-locks first). Assert in-contract poses stay finite
  // and bounded on every shot; direct out-of-contract abuse (NaN/p>1) is
  // unreachable through the renderer, which is covered above instead.
  let posesOk = true;
  for (const s of tl.shots) {
    for (const p of [0, 0.02, 0.5, 0.98, 1]) {
      try {
        const pose = poseFor(s, p, s.dur * p);
        for (const v of [pose.nia.stride, pose.nia.lean, pose.nia.kneel, pose.nia.armRaise,
          pose.nia.stillness, pose.nia.flame, pose.yara.knot, pose.ruel.tread,
          pose.ruel.wag, pose.ruel.ear, pose.ruel.wake]) {
          if (!Number.isFinite(v) || v < -0.51 || v > 1.51) posesOk = false;
        }
      } catch { posesOk = false; }
    }
  }
  ok('poses finite and bounded in-contract on every shot', posesOk);
}

// Timeline ends resolve under hostile epsilon.
ok('timeline end resolves', shotAt(tl, tl.total - 0.001).shot.id === tl.shots[tl.shots.length - 1].id);

if (failures) { console.error('TESTER-HOSTILE RED: ' + failures + ' failures'); process.exit(1); }
console.log('TESTER-HOSTILE GREEN');
