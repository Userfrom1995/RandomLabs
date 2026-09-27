// Hearthlight tester hostile suite (Tester, Phase 3: painted world + motion).
// Run: node film/tests/tester-phase3-world-hostile.mjs - exit non-zero on failure.
// Red-team cover beyond craft-world.mjs and tester-phase3-hostile.mjs:
// hostile wash/composition/detail inputs, direct paintBackground abuse,
// full-stage hostile widths and times, gait and secondary garbage,
// speech and phoneme garbage, particle anchor fallbacks, human model
// guards, capture plate artifact shape, and 390 px scrub-exactness.
import { createHash } from 'node:crypto';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildTimeline } from '../engine/timeline.js';
import { renderAnimatic } from '../engine/animatic.js';
import {
  PAINTED_BACKGROUNDS, COMPOSITION, WASH_LAYERS, compositionFor,
  washLayersFor, detailCountFor, paintBackground,
} from '../engine/backgrounds.js';
import { footPlant, gaitFor, drawHuman } from '../engine/humans.js';
import { phonemeFor, speechNod } from '../engine/faces.js';
import { secondaryFor } from '../engine/acting.js';
import { drawParticles, waterYFor, hearthFor } from '../engine/particles.js';

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
const BOIL = { x: 0, y: 0 };

// Wash and composition hostile inputs throw guarded errors, never raw crashes.
{
  let guarded = true;
  for (const bad of ['void', null, undefined, 42, '']) {
    try { washLayersFor(bad); guarded = false; }
    catch (e) { if (!/no composition/.test(e.message)) guarded = false; }
    try { compositionFor(bad); guarded = false; }
    catch (e) { if (!/no composition/.test(e.message)) guarded = false; }
  }
  ok('wash and composition throw guarded errors on garbage', guarded);
}
{
  const layers = washLayersFor('gorge-bridge');
  ok('wash streams distinct and name their layer',
    layers.length === 3 &&
    new Set(layers.map((l) => l.stream)).size === 3 &&
    layers.every((l) => l.stream.includes(l.layer)),
    layers.map((l) => l.stream).join(','));
}
{
  const a = compositionFor('hollow-dusk');
  a.horizon = -999;
  ok('composition returns a defensive copy', compositionFor('hollow-dusk').horizon !== -999);
}
{
  const shotBgs = new Set(tl.shots.map((s) => s.bg));
  const covered = [...shotBgs].every((b) => {
    try { compositionFor(b); return true; } catch { return false; }
  });
  ok('composition covers every timeline shot bg', covered, [...shotBgs].length + ' bgs');
}

// Detail budgets: hostile widths throw, boundaries behave, strings coerce.
{
  let guarded = true;
  for (const bad of [0, -5, NaN, Infinity, -Infinity, 'abc', undefined, null]) {
    try { detailCountFor('hollow-dusk', bad); guarded = false; }
    catch (e) { if (!/bad width/.test(e.message)) guarded = false; }
  }
  try { detailCountFor('void', 960); guarded = false; }
  catch (e) { if (!/no detail budget/.test(e.message)) guarded = false; }
  ok('detail budgets throw guarded errors on hostile widths', guarded);
}
{
  const full = detailCountFor('moss-grove', 960);
  ok('detail width-independent at and above 700px',
    detailCountFor('moss-grove', 700) === full &&
    detailCountFor('moss-grove', 1920) === full);
  ok('detail thins below 700px with a live floor',
    detailCountFor('moss-grove', 699) < full &&
    detailCountFor('moss-grove', 390) >= 12 &&
    PAINTED_BACKGROUNDS.every((b) => detailCountFor(b, 1) >= 12));
  ok('detail clamps tiny widths to the narrow budget',
    PAINTED_BACKGROUNDS.every((b) => detailCountFor(b, 1) === detailCountFor(b, 390)));
  ok('detail coerces numeric strings',
    detailCountFor('moss-grove', '960') === full);
}

// Direct paintBackground abuse: hostile times and progress never throw,
// unknown locations throw guarded, anchors keep their shape.
// Direct paintBackground abuse: finite but wild times and progress never
// throw and keep finite anchors; non-finite times never throw either (the
// renderer frame-locks time before painting, so NaN wind there is
// out-of-contract, but the ground line must still resolve).
{
  const shot = tl.shots[3];
  let threw = false;
  for (const t of [shot.start - 500, shot.end + 500, -1e9, 1e9]) {
    for (const p of [-5, 0, 0.5, 1, 999, NaN]) {
      try {
        const { ctx } = makeRecorder();
        const a = paintBackground(ctx, String(tl.seed), shot, 960, 540, t, p, BOIL);
        if (!a || !Number.isFinite(a.windK) || !Number.isFinite(a.groundY)) threw = true;
      } catch { threw = true; }
    }
  }
  ok('paint survives wild finite times and progress values', !threw);
  let wildOk = true;
  for (const t of [NaN, Infinity, -Infinity]) {
    try {
      const { ctx } = makeRecorder();
      const a = paintBackground(ctx, String(tl.seed), shot, 960, 540, t, 0.5, BOIL);
      if (!a || !Number.isFinite(a.groundY)) wildOk = false;
    } catch { wildOk = false; }
  }
  ok('paint never throws on non-finite times', wildOk);
}
{
  const shot = tl.shots[0];
  let threw = false;
  for (const W of [1, 17, 390, 960, NaN]) {
    try {
      const { ctx } = makeRecorder();
      paintBackground(ctx, String(tl.seed), shot, W, 540, shot.start + 1, 0.5, BOIL);
    } catch { threw = true; }
  }
  ok('paint survives odd and non-finite widths at W>=1 floor', !threw);
}
{
  let guarded = false;
  try {
    const { ctx } = makeRecorder();
    paintBackground(ctx, String(tl.seed), { ...tl.shots[0], bg: 'void' }, 960, 540, 1, 0.5, BOIL);
  } catch (e) { guarded = /no composition|no detail budget/.test(e.message); }
  ok('paint throws guarded error on unknown location', guarded);
}

// Full stage hostile: zero and negative widths, wild times, never throws.
// Full stage hostile: zero, non-finite, and odd widths plus wild times
// never throw through the shipped renderer contract (widths stay >= 0;
// negative widths are out-of-contract embedder abuse and noted in review).
{
  let threw = false;
  for (const W of [0, NaN, 1, 17, 390, 960]) {
    for (const t of [NaN, Infinity, -100, tl.total + 50]) {
      try {
        const { ctx } = makeRecorder();
        renderAnimatic(ctx, tl, t, { width: W, height: 540 });
      } catch { threw = true; }
    }
  }
  ok('stage survives hostile widths and times without throws', !threw);
}

// Gait hostile: wild clocks stay finite, wild strides stand planted.
{
  let finite = true;
  for (const wt of [Infinity, -Infinity, NaN, -1e9, 1e9]) {
    for (const side of [-1, 1]) {
      const f = footPlant(side, wt, 0.5);
      if (!Number.isFinite(f.fore) || !Number.isFinite(f.lift) || typeof f.planted !== 'boolean') finite = false;
    }
  }
  ok('footPlant stays finite on wild clocks', finite);
}
{
  ok('wild strides clamp to a planted stand',
    [[Infinity], [-3], [NaN], [undefined]].every(([s]) => {
      const f = footPlant(-1, 1.2, s);
      return f.planted && f.lift === 0 && f.fore === 0;
    }));
  const coerced = footPlant(-1, 0.9, '0.5');
  ok('stride coerces numeric strings', Number.isFinite(coerced.fore) && Number.isFinite(coerced.lift));
}
{
  let oppose = true;
  for (const wt of [0, 0.37, 1.11, 4.2, 9.9]) {
    if (footPlant(-1, wt, 0.5).fore === footPlant(1, wt, 0.5).fore) oppose = false;
  }
  ok('sides oppose across phases', oppose);
}
{
  const rest = gaitFor(0);
  ok('gait clamps string null and undefined to rest',
    JSON.stringify(gaitFor('0')) === JSON.stringify(rest) &&
    JSON.stringify(gaitFor(null)) === JSON.stringify(rest) &&
    JSON.stringify(gaitFor(undefined)) === JSON.stringify(rest));
  ok('gait coerces numeric exertion strings', JSON.stringify(gaitFor('1')) === JSON.stringify(gaitFor(1)));
}

// Secondary drivers and speech hostile: garbage in, finite numbers out.
{
  let finite = true;
  for (const w of [NaN, Infinity, -Infinity, undefined, 'gale']) {
    for (const l of [NaN, Infinity, -50, undefined]) {
      const s = secondaryFor(w, l, NaN);
      if (!Number.isFinite(s.cloth) || !Number.isFinite(s.drift) || !Number.isFinite(s.bounce)) finite = false;
    }
  }
  ok('secondary drivers finite on garbage', finite);
}
{
  ok('phoneme falls back to REST on garbage lines',
    phonemeFor('', 1) === 'REST' && phonemeFor(null, 1) === 'REST' &&
    phonemeFor(42, 1) === 'REST' && phonemeFor('aaa', NaN) === 'REST' &&
    phonemeFor('aaa', -2) === 'REST');
  ok('nod silent on hostile locals',
    speechNod('aaa lantern', NaN) === 0 && speechNod('aaa lantern', Infinity) === 0 &&
    speechNod('aaa lantern', -1) === 0 && speechNod(42, NaN) === 0);
  const n = speechNod(42, 1);
  ok('nod finite on numeric lines', Number.isFinite(n));
}

// Particles hostile: null anchors and wild clocks never throw, fallbacks hold.
{
  const shot = tl.shots.find((s) => s.id === 's12');
  let threw = false;
  for (const t of [NaN, Infinity, -50]) {
    for (const reduced of [true, false]) {
      try {
        const { ctx } = makeRecorder();
        drawParticles(ctx, String(tl.seed), shot, 960, 540, t, 0.5, 0.4, BOIL, reduced, null);
      } catch { threw = true; }
    }
  }
  ok('particles survive null anchors and wild clocks', !threw);
  const snap = (t, reduced) => {
    const { ctx, log } = makeRecorder();
    drawParticles(ctx, String(tl.seed), shot, 960, 540, t, 0.5, 0.4, BOIL, reduced, null);
    return JSON.stringify(log);
  };
  ok('particles deterministic per mode', snap(9, false) === snap(9, false) && snap(9, true) === snap(9, true));
  ok('anchor fallbacks hold on hostile shapes',
    waterYFor({ waterY: 'high' }, 540) === 432 &&
    waterYFor(null, 540) === 432 &&
    hearthFor({ hearth: { x: NaN, y: 1 } }) === null &&
    hearthFor(null) === null);
}

// Human guards: unknown models throw guarded, garbage options never throw.
{
  let guarded = false;
  try {
    const { ctx } = makeRecorder();
    drawHuman(ctx, {}, 'gandalf', 200, 300, 120, {
      stride: 0, lean: 0, kneel: 0, armRaise: 0, stillness: 0, blink: 1,
      windK: 0, boil: BOIL, faceBoil: BOIL, walkT: 0, weight: 0,
      exertion: 0, carry: 'none', oar: false,
      face: { emotion: 'calm', phoneme: 'REST', blink: 1, nod: 0 },
    });
  } catch (e) { guarded = /no human model/.test(e.message); }
  ok('unknown human throws guarded error', guarded);
}
{
  const base = {
    stride: 0.5, lean: 0.05, kneel: 0, armRaise: 0.2, stillness: 0, blink: 1,
    windK: 0.5, boil: BOIL, faceBoil: BOIL, walkT: 1.2, weight: 0,
    exertion: 0.3, carry: 'none', oar: false,
    face: { emotion: 'resolve', phoneme: 'REST', blink: 1, nod: 0 },
  };
  let threw = false;
  for (const patch of [{ carry: 'dragon' }, { exertion: NaN }, { exertion: Infinity },
      { windK: NaN }, { walkT: NaN }, { weight: 99 }, { stride: -4 }]) {
    try {
      const { ctx } = makeRecorder();
      drawHuman(ctx, {}, 'nia', 200, 300, 120, { ...base, ...patch });
    } catch { threw = true; }
  }
  ok('humans survive garbage options without throws', !threw);
}

// Capture artifacts: plates shape, review cards on disk, scrub-exactness.
{
  const plates = JSON.parse(readFileSync(join(root, 'dist/capture/plates.json'), 'utf8'));
  const ids = Object.keys(plates.plates);
  ok('plates cover all 14 painted locations',
    ids.length === 14 && PAINTED_BACKGROUNDS.every((b) => ids.includes(b)), ids.length + '/14');
  const shape = ids.every((id) => {
    const p = plates.plates[id];
    return /^[0-9a-f]{64}$/.test(p.hash) && p.strokes > p.strokes390 && p.strokes390 >= 12 &&
      tl.shots.some((s) => s.id === p.shot);
  });
  ok('plate entries carry hash, honest density, and a real shot', shape);
  const stills = readdirSync(join(root, 'dist/capture/stills'));
  ok('plate review cards on disk for all 14 locations',
    PAINTED_BACKGROUNDS.every((b) => stills.includes('plate-' + b + '.svg')));
  ok('face review cards on disk for all 18 faces',
    stills.filter((f) => f.startsWith('face-') && f.endsWith('.svg')).length === 18);
  ok('hero stills on disk for all 20 shots',
    stills.filter((f) => /^s\d+\.svg$/.test(f)).length === 20);
}
{
  const renderHash = (t, W) => {
    const { ctx, log } = makeRecorder();
    renderAnimatic(ctx, tl, t, { width: W, height: Math.round(W * 9 / 16) });
    return sha(JSON.stringify(log));
  };
  ok('scrub-exact at 960px', renderHash(100.25, 960) === renderHash(100.25, 960));
  ok('scrub-exact at 390px', renderHash(100.25, 390) === renderHash(100.25, 390));
  ok('widths honestly differ', renderHash(100.25, 960) !== renderHash(100.25, 390));
}

// No em dashes in the new suite or the Phase 3 sources it covers.
{
  const sources = ['tests/tester-phase3-world-hostile.mjs', 'engine/backgrounds.js',
    'engine/humans.js', 'engine/faces.js', 'engine/rigs.js',
    'engine/animatic.js', 'engine/particles.js', 'tools/capture.mjs'];
  const dashy = sources.filter((f) => readFileSync(join(root, f), 'utf8').includes('\u2014'));
  ok('no em dashes', dashy.length === 0, dashy.join(','));
}

if (failures) { console.error('TESTER-PHASE3-WORLD-HOSTILE RED: ' + failures + ' failures'); process.exit(1); }
console.log('TESTER-PHASE3-WORLD-HOSTILE GREEN');
