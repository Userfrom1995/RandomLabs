// Hearthlight Phase 3 craft tests (Builder): painted world and motion.
// Run: node film/tests/craft-world.mjs - exit non-zero on any failure.
// Gates: composition sketch covers every location, three wash layers own
// distinct streams, detail pass is present per plate and scales down
// honestly at 390 px (fewer strokes, same composition), atmosphere runs
// per location, the gait plants stance feet (lift 0) and lifts swing
// feet, exertion runs the climb (cadence/lift up), dialogue nods ride
// open visemes and rest at silence, cloth follows the acting secondary
// drivers, spray rises from the painted water line, plates are
// byte-identical run to run.
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildTimeline } from '../engine/timeline.js';
import { renderAnimatic } from '../engine/animatic.js';
import {
  PAINTED_BACKGROUNDS, COMPOSITION, WASH_LAYERS, compositionFor,
  washLayersFor, detailCountFor, paintBackground,
} from '../engine/backgrounds.js';
import { footPlant, gaitFor, drawHuman } from '../engine/humans.js';
import { speechNod, drawFace } from '../engine/faces.js';
import { secondaryFor } from '../engine/acting.js';
import { faceFor } from '../engine/rigs.js';
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

const sp = JSON.parse(readFileSync(join(root, 'story/screenplay.json'), 'utf8'));
const tl = buildTimeline(sp);

// Composition sketch: every painted location declares horizon, focal,
// light, and an atmosphere kind; horizons sit on the frame.
ok('composition covers all 14 locations',
  PAINTED_BACKGROUNDS.length === 14 &&
  PAINTED_BACKGROUNDS.every((b) => COMPOSITION[b] !== undefined));
let compOk = true;
for (const b of PAINTED_BACKGROUNDS) {
  const c = compositionFor(b);
  if (!(c.horizon > 0.3 && c.horizon <= 1)) compOk = false;
  if (!(c.focal >= 0 && c.focal <= 1 && c.light >= 0 && c.light <= 1)) compOk = false;
  if (typeof c.atmo !== 'string') compOk = false;
}
ok('composition values sane (horizon/focal/light/atmo)', compOk);
let compThrows = false;
try { compositionFor('void'); } catch (e) { compThrows = /no composition/.test(e.message); }
ok('composition throws guarded error on garbage', compThrows);

// Wash layers: exactly three, distinct streams each.
ok('three wash layers', WASH_LAYERS.length === 3, WASH_LAYERS.join(','));
{
  const layers = washLayersFor('hollow-dusk');
  ok('wash layers own distinct streams',
    layers.length === 3 && new Set(layers.map((l) => l.stream)).size === 3,
    layers.map((l) => l.stream).join(','));
}

// Detail budgets: honest scale-down at 390 px, alive floors, guarded.
let budgetOk = true;
for (const b of PAINTED_BACKGROUNDS) {
  const full = detailCountFor(b, 960);
  const narrow = detailCountFor(b, 390);
  if (!(narrow < full && narrow >= 12)) budgetOk = false;
}
ok('detail budgets scale down honestly at 390px', budgetOk);
ok('detail budgets width-independent above 700px',
  PAINTED_BACKGROUNDS.every((b) => detailCountFor(b, 960) === detailCountFor(b, 1920)));
let budgetThrows = false;
try { detailCountFor('void', 960); } catch (e) { budgetThrows = /no detail budget/.test(e.message); }
let widthThrows = false;
try { detailCountFor('hollow-dusk', -5); } catch (e) { widthThrows = /bad width/.test(e.message); }
ok('detail budgets throw guarded errors', budgetThrows && widthThrows);

// Painted plates: every location paints without throwing, carries real
// detail (strokes) and wash gradients; the chart plate is honestly flat
// (paper, no sky gradients); 390 px paints fewer strokes, same paint.
function plateLog(bg, W) {
  const shot = tl.shots.find((s) => s.bg === bg);
  const { ctx, log } = makeRecorder();
  paintBackground(ctx, String(tl.seed), shot, W, Math.round(W * 9 / 16),
    shot.start + shot.dur / 2, 0.5, { x: 0, y: 0 });
  return log;
}
let paintOk = true;
for (const b of PAINTED_BACKGROUNDS) {
  try {
    const log = plateLog(b, 960);
    const strokes = log.filter((e) => e[0] === 'stroke').length;
    const grads = log.filter((e) => e[0] === 'createRadialGradient' || e[0] === 'createLinearGradient').length;
    if (strokes < 40) paintOk = false;
    if (b !== 'chart-table' && grads < 5) paintOk = false;
    const narrow = plateLog(b, 390).filter((e) => e[0] === 'stroke').length;
    if (!(narrow < strokes)) paintOk = false;
  } catch { paintOk = false; }
}
ok('plates carry detail and washes, scale at 390px', paintOk);
// Composition is width-independent: the paint structure (op sequence of
// the sky, ridge, mist, and ground passes, before width-scaled detail)
// matches across widths even as detail thins.
{
  const ops = (W) => plateLog('hollow-dusk', W).slice(0, 60).map((e) => e[0]);
  ok('ridge skeleton identical at 960 and 390', JSON.stringify(ops(960)) === JSON.stringify(ops(390)));
}
// Anchors: the gorge paint reports its water line, the house its hearth,
// nowhere else claims either.
{
  const gorge = tl.shots.find((s) => s.bg === 'gorge-bridge');
  const { ctx: gctx } = makeRecorder();
  const ga = paintBackground(gctx, String(tl.seed), gorge, 960, 540,
    gorge.start + 1, 0.2, { x: 0, y: 0 });
  const house = tl.shots.find((s) => s.bg === 'yara-house');
  const { ctx: hctx } = makeRecorder();
  const ha = paintBackground(hctx, String(tl.seed), house, 960, 540,
    house.start + 1, 0.2, { x: 0, y: 0 });
  ok('gorge anchors water at 0.86H', Math.abs(ga.waterY - 540 * 0.86) < 1e-9);
  ok('house anchors a hearth', !!ha.hearth && ha.hearth.y > 0 && ha.hearth.y < 540);
  ok('ground anchors on the composition horizon',
    Math.abs(ga.groundY - 540 * compositionFor('gorge-bridge').horizon) < 1e-9);
  const dawn = tl.shots.find((s) => s.bg === 'valley-dawn');
  const { ctx: dctx } = makeRecorder();
  const da = paintBackground(dctx, String(tl.seed), dawn, 960, 540,
    dawn.start + 1, 0.2, { x: 0, y: 0 });
  ok('non-water non-house paints claim no anchors', da.waterY === null && da.hearth === null);
}

// Gait: stance feet plant (lift exactly 0, fore travelling back),
// swing feet lift over a hump and return; zero stride stands planted.
{
  let stanceOk = true; let swingSeen = false; let midSwingLift = false;
  for (let k = 0; k < 80; k++) {
    const wt = k / 80 / (5.2 / (Math.PI * 2));
    for (const side of [-1, 1]) {
      const f = footPlant(side, wt, 0.5);
      if (f.planted && f.lift !== 0) stanceOk = false;
      if (!f.planted && f.lift < 0) stanceOk = false;
      if (!f.planted) swingSeen = true;
      if (!f.planted && f.lift > 0.05) midSwingLift = true;
    }
  }
  ok('stance plants, swing lifts', stanceOk && swingSeen && midSwingLift);
  const stand = footPlant(-1, 3.3, 0);
  ok('zero stride stands planted', stand.planted && stand.fore === 0 && stand.lift === 0);
  const fwd = footPlant(-1, 0.05, 0.5);
  const back = footPlant(-1, 0.5, 0.5);
  ok('stance foot travels backward under the body', fwd.fore > back.fore);
  ok('sides oppose', footPlant(-1, 0.3, 0.5).fore !== footPlant(1, 0.3, 0.5).fore);
  ok('hostile stride clamps to stand', footPlant(-1, 1, NaN).planted && footPlant(1, 1, -3).lift === 0);
}
// Gait shaping: exertion runs the climb, rest walks; garbage rests.
{
  const rest = gaitFor(0); const run = gaitFor(1);
  ok('exertion raises cadence and step',
    run.cadence > rest.cadence && run.lift > rest.lift && run.rock > rest.rock,
    JSON.stringify(run));
  ok('rest gait is unity', rest.cadence === 1 && rest.lift === 1 && rest.rock === 0);
  ok('gait clamps garbage to rest',
    JSON.stringify(gaitFor(NaN)) === JSON.stringify(rest) &&
    JSON.stringify(gaitFor(-Infinity)) === JSON.stringify(rest) &&
    JSON.stringify(gaitFor(Infinity)) === JSON.stringify(rest));
}

// Dialogue nod: open visemes nod, closed mouths barely move, silence is 0.
ok('nod silent without a line', speechNod('', 1) === 0 && speechNod(null, 1) === 0 && speechNod('words', NaN) === 0);
{
  const open = Math.abs(speechNod('aaa lantern', 0.1));
  const closed = Math.abs(speechNod('mmm', 0.1));
  ok('open visemes nod harder than closed', open > closed, open.toFixed(4) + ' vs ' + closed.toFixed(4));
  ok('nod bounded to a whisper', Math.abs(speechNod('aaa', 0.77)) <= 0.06);
  ok('nod deterministic', speechNod('the cairn lights', 2.2) === speechNod('the cairn lights', 2.2));
}
// The nod reaches the stage through faceFor on live lines, rests off them.
{
  const s14 = tl.shots.find((s) => s.id === 's14');
  const line = s14.captions[0];
  const live = faceFor(s14, line.who.toLowerCase(), line.t + 0.5);
  const idle = faceFor(s14, 'yara', line.t + 0.5);
  ok('live line carries a nod field', Number.isFinite(live.nod));
  ok('off-line faces rest at nod 0', idle.nod === 0);
  const { ctx, log } = makeRecorder();
  drawFace(ctx, { cx: 0, cy: 0, r: 40, emotion: 'grief', phoneme: 'A', nod: 0.05, boil: { x: 0, y: 0 } });
  const { ctx: c2, log: l2 } = makeRecorder();
  drawFace(c2, { cx: 0, cy: 0, r: 40, emotion: 'grief', phoneme: 'A', nod: 0, boil: { x: 0, y: 0 } });
  ok('nod moves the head on stage', JSON.stringify(log) !== JSON.stringify(l2));
}

// Cloth follows the acting drivers: same pose under different winds paints
// different bellies; the driver is finite on garbage.
{
  const pose = { stride: 0.5, lean: 0.05, kneel: 0, armRaise: 0.2, stillness: 0, blink: 1, carry: 'none', oar: false };
  const calm = (() => {
    const { ctx, log } = makeRecorder();
    drawHuman(ctx, {}, 'nia', 200, 300, 120, {
      ...pose, windK: 0.1, boil: { x: 0, y: 0 }, faceBoil: { x: 0, y: 0 }, walkT: 1.2,
      weight: 0.2, exertion: 0.4, secondary: secondaryFor(0.1, 1.2, 0.4),
      face: { emotion: 'resolve', phoneme: 'A', blink: 1, nod: 0 },
    });
    return JSON.stringify(log);
  })();
  const gale = (() => {
    const { ctx, log } = makeRecorder();
    drawHuman(ctx, {}, 'nia', 200, 300, 120, {
      ...pose, windK: 0.9, boil: { x: 0, y: 0 }, faceBoil: { x: 0, y: 0 }, walkT: 1.2,
      weight: 0.2, exertion: 0.4, secondary: secondaryFor(0.9, 1.2, 0.4),
      face: { emotion: 'resolve', phoneme: 'A', blink: 1, nod: 0 },
    });
    return JSON.stringify(log);
  })();
  ok('cloth answers the wind', calm !== gale);
  const sec = secondaryFor(0.7, 2.5, 0.6);
  ok('secondary drivers finite and wind-shaped',
    Number.isFinite(sec.cloth) && Number.isFinite(sec.drift) && Number.isFinite(sec.bounce) &&
    sec.cloth > secondaryFor(0.1, 2.5, 0.6).cloth);
}
// Contact shadows: striding feet print shadows, planted harder than swing.
{
  const { ctx, log } = makeRecorder();
  drawHuman(ctx, {}, 'nia', 200, 300, 120, {
    stride: 0.6, lean: 0.05, kneel: 0, armRaise: 0.2, stillness: 0, blink: 1,
    windK: 0.5, boil: { x: 0, y: 0 }, faceBoil: { x: 0, y: 0 }, walkT: 1.2,
    weight: 0, exertion: 0.3, carry: 'none', oar: false,
    face: { emotion: 'resolve', phoneme: 'REST', blink: 1, nod: 0 },
  });
  const shadows = log.filter((e) => e[0] === 'ellipse' && e[3] === 8.4);
  ok('contact shadows printed under striding feet', shadows.length >= 1, shadows.length + ' shadows');
}

// Weather re-anchored: gorge spray fills only the painted water band;
// anchor resolution falls back honestly without a painted frame.
{
  const gorge = tl.shots.find((s) => s.id === 's12');
  const { ctx: gctx } = makeRecorder();
  const anchors = paintBackground(gctx, String(tl.seed), gorge, 960, 540,
    gorge.start + 1, 0.2, { x: 0, y: 0 });
  const { ctx, log } = makeRecorder();
  drawParticles(ctx, String(tl.seed), gorge, 960, 540, gorge.start + 2, 0.5, 0.4,
    { x: 0, y: 0 }, false, anchors);
  const ells = log.filter((e) => e[0] === 'ellipse');
  const inBand = ells.every((e) => e[2] >= anchors.waterY - 540 * 0.07 - 1e-6 && e[2] <= anchors.waterY + 1e-6);
  ok('gorge spray lives in the painted water band', ells.length > 5 && inBand, ells.length + ' spray marks');
  ok('anchor fallback without a painted frame', waterYFor(undefined, 540) === 432 && hearthFor(undefined) === null);
  ok('anchor fallback on garbage', waterYFor({ waterY: NaN }, 540) === 432 && hearthFor({ hearth: { x: 1 } }) === null);
}

// Full stage still green at both widths with the new paint and motion.
for (const W of [960, 390]) {
  let stageOk = true;
  try {
    for (const s of tl.shots) {
      const { ctx } = makeRecorder();
      renderAnimatic(ctx, tl, s.start + s.dur / 2, { width: W, height: Math.round(W * 9 / 16) });
    }
  } catch { stageOk = false; }
  ok('stage renders all 20 shots at ' + W + 'px', stageOk);
}

// Plates: committed loop output, byte-identical rerun, 14 locations.
execFileSync('node', [join(root, 'tools/capture.mjs')], { stdio: 'pipe' });
const first = readFileSync(join(root, 'dist/capture/plates.json'), 'utf8');
execFileSync('node', [join(root, 'tools/capture.mjs')], { stdio: 'pipe' });
const second = readFileSync(join(root, 'dist/capture/plates.json'), 'utf8');
ok('plates byte-identical run to run', first === second);
{
  const plates = JSON.parse(first);
  const ids = Object.keys(plates.plates);
  ok('plates cover all 14 locations', ids.length === 14, ids.length + '/14');
  const hashes = new Set(ids.map((id) => plates.plates[id].hash));
  ok('plates sensitive (locations differ)', hashes.size > 10, hashes.size + '/14 unique');
  ok('plates record density pairs',
    ids.every((id) => plates.plates[id].strokes390 < plates.plates[id].strokes));
}

// no em dashes in Phase 3 sources
const sources = ['engine/backgrounds.js', 'engine/humans.js', 'engine/faces.js',
  'engine/rigs.js', 'engine/animatic.js', 'engine/particles.js',
  'tools/capture.mjs', 'tests/craft-world.mjs'];
const dashy = sources.filter((f) => readFileSync(join(root, f), 'utf8').includes('\u2014'));
ok('no em dashes', dashy.length === 0, dashy.join(','));

if (failures) { console.error('CRAFT-WORLD RED: ' + failures + ' failures'); process.exit(1); }
console.log('CRAFT-WORLD GREEN');
