// Hearthlight tester hostile suite (Tester, Phase 2: Human Character Animation Craft).
// Run: node film/tests/tester-phase2-humans-hostile.mjs - exit non-zero on failure.
// Red-team cover beyond the builder craft-humans suite: hostile name inputs
// must throw loudly (never silent wrong-output), NaN/Infinity/extreme numerics
// must never crash the stage, blend/phoneme/boil boundaries must clamp, the
// Yara knot must be a real render delta (not a dropped value), and repeated
// renders must be byte-identical.
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildTimeline } from '../engine/timeline.js';
import { renderAnimatic } from '../engine/animatic.js';
import { boilJitterFace, FACE_BOIL_RATIO } from '../engine/ink.js';
import { HUMAN_MODELS, modelFor, drawHuman, turnaroundSymmetry, SHOULDER_X } from '../engine/humans.js';
import { EMOTIONS, PHONEMES, expressionFor, blendExpression, mouthShapeFor, phonemeFor, drawFace } from '../engine/faces.js';
import { PHASES, actFor, secondaryFor } from '../engine/acting.js';
import { poseFor, faceFor, blinkAt } from '../engine/rigs.js';

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
const tl = buildTimeline(sp);
const names = Object.keys(HUMAN_MODELS);
const base = { windK: 0.15, boil: { x: 0, y: 0 }, faceBoil: { x: 0, y: 0 }, walkT: 1.2, face: { emotion: 'tenderness', phoneme: 'REST', blink: 1 } };

// 1. hostile names throw loudly, never silent wrong-output
for (const bad of ['ruel', 'garbage', '', null, undefined, 42, 'NIA', 'nia ']) {
  let mThrow = false, sThrow = false;
  try { modelFor(bad); } catch { mThrow = true; }
  try { turnaroundSymmetry(bad); } catch { sThrow = true; }
  ok('hostile name throws: ' + String(bad), mThrow && sThrow);
}
let eThrow = false;
try { expressionFor('ecstasy'); } catch { eThrow = true; }
ok('hostile emotion throws', eThrow);
let phThrow = false;
try { mouthShapeFor('X'); } catch { phThrow = true; }
ok('hostile phoneme throws', phThrow);
let faceThrow = false;
try { drawFace(makeRecorder().ctx, { cx: 0, cy: 0, r: 40, emotion: 'nope', phoneme: 'A' }); } catch { faceThrow = true; }
ok('drawFace hostile emotion throws', faceThrow);

// 2. hostile numerics never crash the body, the stage, or acting.
// Contract: out-of-contract NaN/Infinity inputs must never throw, hang, or
// corrupt state (NaN may propagate through pure arithmetic, but the call
// must return and repeat deterministically); every finite in-contract input
// must yield finite outputs; Infinity progress clamps to an end phase.
let nanOk = true;
for (const bad of [NaN, Infinity, -Infinity, -5, 1e9]) {
  try {
    for (const n of names) {
      const { ctx } = makeRecorder();
      drawHuman(ctx, {}, n, 100, 200, 120, {
        stride: bad, lean: bad, kneel: bad, armRaise: bad, stillness: bad,
        walkT: bad, windK: bad, weight: bad, exertion: bad, knot: bad,
        boil: { x: 0, y: 0 }, faceBoil: { x: 0, y: 0 },
        face: { emotion: 'calm', phoneme: 'REST', blink: 1 },
      });
    }
    const a1 = actFor({ id: 's12', windK: 0.5, dur: 10 }, bad, bad);
    const a2 = actFor({ id: 's12', windK: 0.5, dur: 10 }, bad, bad);
    if (!PHASES.includes(a1.phase)) nanOk = false;
    // deterministic even off-contract: same garbage in, same result out
    if (JSON.stringify(a1) !== JSON.stringify(a2)) nanOk = false;
    secondaryFor(bad, bad, bad);
  } catch { nanOk = false; }
}
ok('hostile numerics never crash body/acting', nanOk);
ok('infinity progress clamps to end phases',
  actFor({ id: 's12' }, Infinity, 1).phase === 'hold' &&
  actFor({ id: 's12' }, -Infinity, 1).phase === 'anticipation');
let finiteOk = true;
for (const s of tl.shots) {
  for (const p of [0, 0.25, 0.5, 0.75, 1]) {
    const a = actFor(s, p, s.dur * p);
    if (!Number.isFinite(a.exertion) || !Number.isFinite(a.weight)) finiteOk = false;
    const sec = a.secondary;
    if (!Number.isFinite(sec.cloth) || !Number.isFinite(sec.drift) || !Number.isFinite(sec.bounce)) finiteOk = false;
  }
}
ok('finite inputs yield finite acting outputs on all shots', finiteOk);
let stageOk = true;
try {
  for (const t of [-10, NaN, Infinity, tl.total + 999]) {
    const { ctx } = makeRecorder();
    renderAnimatic(ctx, tl, t, { width: 960, height: 540 });
  }
  for (const W of [0, -100, 1, 4000]) {
    const { ctx } = makeRecorder();
    renderAnimatic(ctx, tl, tl.total / 2, { width: W, height: Math.max(1, Math.round(W * 9 / 16)) });
  }
} catch { stageOk = false; }
ok('hostile stage seeks and widths never crash', stageOk);

// 3. boundary clamps: blend k, phoneme seeks, blink seeks
const b0 = blendExpression('fear', 'joy', 0);
const b1 = blendExpression('fear', 'joy', 1);
ok('blend clamps low k', JSON.stringify(blendExpression('fear', 'joy', -2)) === JSON.stringify(b0));
ok('blend clamps high k', JSON.stringify(blendExpression('fear', 'joy', 5)) === JSON.stringify(b1));
ok('blend NaN reads endpoint a (finite face)',
  JSON.stringify(blendExpression('fear', 'joy', NaN)) === JSON.stringify(b0) &&
  Number.isFinite(blendExpression('joy', 'fear', NaN).brow));
ok('blend infinities clamp to endpoints',
  JSON.stringify(blendExpression('fear', 'joy', Infinity)) === JSON.stringify(b1) &&
  JSON.stringify(blendExpression('fear', 'joy', -Infinity)) === JSON.stringify(b0));
ok('blend midpoint interpolates',
  Math.abs(blendExpression('fear', 'joy', 0.5).brow - (b0.brow + b1.brow) / 2) < 1e-12);
ok('phoneme hostile seeks read REST',
  phonemeFor(null, 1) === 'REST' && phonemeFor('hi', -3) === 'REST' &&
  phonemeFor('hi', NaN) === 'REST' && phonemeFor('hi', Infinity) === 'REST');
ok('blink hostile seeks read open', blinkAt(NaN) === 1 && blinkAt(-1) === 1 && blinkAt(Infinity) === 1);
ok('face boil ratio pinned at 0.35', FACE_BOIL_RATIO === 0.35);
ok('face boil frozen under reduced motion',
  boilJitterFace('20260927', 's12', 2.05, true, 2).x === 0);

// 4. knot is a real render delta: knot-0 vs knot-1 differ, ribbon present,
// knot on non-yara ignored, extreme knots bounded
{
  const { ctx: c0, log: l0 } = makeRecorder();
  drawHuman(c0, {}, 'yara', 100, 200, 120, { ...base, knot: 0 });
  const { ctx: c1, log: l1 } = makeRecorder();
  drawHuman(c1, {}, 'yara', 100, 200, 120, { ...base, knot: 1 });
  ok('yara knot-0 vs knot-1 render delta',
    JSON.stringify(l0) !== JSON.stringify(l1) && JSON.stringify(l1).includes('#4a6a9a'));
  const { ctx: cn, log: ln } = makeRecorder();
  drawHuman(cn, {}, 'nia', 100, 200, 120, { ...base, knot: 1 });
  ok('knot ignored on non-yara leads', !JSON.stringify(ln).includes('#4a6a9a'));
  let knotBounded = true;
  try {
    for (const k of [-3, 99]) {
      const { ctx } = makeRecorder();
      drawHuman(ctx, {}, 'yara', 100, 200, 120, { ...base, knot: k });
    }
  } catch { knotBounded = false; }
  ok('extreme knot values render bounded', knotBounded);
  // pose-level threading: s06 knot beat reaches drawYara's stage value
  const s06 = tl.shots.find((s) => s.id === 's06');
  const mid = poseFor(s06, 0.5, s06.dur / 2);
  ok('s06 pose carries nonzero knot', (mid.yara.knot || 0) > 0, String(mid.yara.knot));
}

// 5. symmetry probe measures the rendered shoulder anchors
ok('probe measures SHOULDER_X from the render',
  Math.abs(turnaroundSymmetry('nia').left - SHOULDER_X) < 1e-9);
for (const n of names) {
  const sym = turnaroundSymmetry(n);
  ok('probe symmetric: ' + n, sym.mismatch === 0 && sym.left === sym.right &&
    sym.mismatch === Math.abs(sym.left - sym.right));
}

// 6. lantern flame hostile: missing/zero/negative flame never crashes nia
let lampOk = true;
try {
  for (const flame of [0, -2, NaN, undefined]) {
    const { ctx } = makeRecorder();
    drawHuman(ctx, {}, 'nia', 100, 200, 120, {
      ...base, lantern: flame === undefined ? undefined : { flame },
    });
  }
} catch { lampOk = false; }
ok('hostile lantern flames never crash', lampOk);

// 7. determinism: identical pose renders identical logs at both widths
function renderLog(name, opts) {
  const { ctx, log } = makeRecorder();
  drawHuman(ctx, {}, name, 100, 200, 120, opts);
  return JSON.stringify(log);
}
const detOpts = { stride: 0.6, walkT: 1.7, windK: 0.4, boil: { x: 1, y: -1 }, face: { emotion: 'grief', phoneme: 'O', blink: 1 } };
ok('repeat body renders identical', renderLog('tam', detOpts) === renderLog('tam', detOpts));
function stageLog(t, W) {
  const { ctx, log } = makeRecorder();
  renderAnimatic(ctx, tl, t, { width: W, height: Math.round(W * 9 / 16) });
  return JSON.stringify(log);
}
ok('repeat stage renders identical', stageLog(42.5, 960) === stageLog(42.5, 960));

// 8. dialogue lattice still drives faces after the re-rig
const s14 = tl.shots.find((s) => s.id === 's14');
const line = s14.captions[0];
const ff = faceFor(s14, line.who.toLowerCase(), line.t + 0.5);
ok('face follows active dialogue line',
  ff.emotion === line.emotion && PHONEMES.includes(ff.phoneme), ff.emotion + '/' + ff.phoneme);

if (failures) { console.error('TESTER-PHASE2-HUMANS-HOSTILE RED: ' + failures + ' failures'); process.exit(1); }
console.log('TESTER-PHASE2-HUMANS-HOSTILE GREEN');
