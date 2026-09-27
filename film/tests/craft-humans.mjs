// Hearthlight Phase 2 craft tests (Builder): human character animation.
// Run: node film/tests/craft-humans.mjs - exit non-zero on any failure.
// Gates: model-sheet proportions match the bible, expression/phoneme sets
// cover the dialogue lattice, turnaround symmetry holds, 390 px silhouettes
// stay distinct, face boil is lattice-locked at reduced amplitude, acting
// beats stay bounded, Tam/Lumi poses chain across the cut, face cards are
// byte-identical run to run.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildTimeline } from '../engine/timeline.js';
import { renderAnimatic } from '../engine/animatic.js';
import { boilJitter, boilJitterFace, FACE_BOIL_RATIO } from '../engine/ink.js';
import { HUMAN_MODELS, modelFor, drawHuman, turnaroundSymmetry, SHOULDER_X } from '../engine/humans.js';
import { EMOTIONS, PHONEMES, FACE_CARDS, expressionFor, blendExpression, mouthShapeFor, phonemeFor, drawFace } from '../engine/faces.js';
import { PHASES, actFor, beatFor, phaseAt, secondaryFor } from '../engine/acting.js';
import { poseFor, faceFor, drawTam, drawLumi, clamp01 } from '../engine/rigs.js';

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

// model sheet matches the bible head-unit heights
ok('models nia 4.5hu', modelFor('nia').hu === 4.5);
ok('models yara 4.0hu', modelFor('yara').hu === 4.0);
ok('models tam 5.5hu tallest', modelFor('tam').hu === 5.5);
ok('models lumi 3.5hu smallest', modelFor('lumi').hu === 3.5);
let throws = false;
try { modelFor('ruel'); } catch { throws = true; }
ok('models reject non-humans', throws);
ok('silhouette props distinct',
  new Set(Object.values(HUMAN_MODELS).map((m) => m.prop)).size === 4,
  Object.values(HUMAN_MODELS).map((m) => m.prop).join(','));

// expression set covers every emotion the dialogue lattice uses
const usedEmotions = [...new Set(tl.shots.flatMap((s) => (s.captions || []).map((c) => c.emotion)))];
ok('expressions cover lattice emotions',
  usedEmotions.every((e) => EMOTIONS.includes(e)), usedEmotions.join(','));
ok('emotion set closed at 17', EMOTIONS.length === 17);
ok('phoneme set closed at 9', PHONEMES.length === 9);
let facesOk = true;
for (const e of EMOTIONS) {
  for (const ph of PHONEMES) {
    try {
      const { ctx } = makeRecorder();
      drawFace(ctx, { cx: 0, cy: 0, r: 40, emotion: e, phoneme: ph, boil: { x: 0, y: 0 } });
    } catch { facesOk = false; }
  }
}
ok('all 153 emotion x phoneme faces render', facesOk);
const bl = blendExpression('fear', 'joy', 0);
ok('blend endpoints exact',
  bl.brow === expressionFor('fear').brow && blendExpression('fear', 'joy', 1).lid === expressionFor('joy').lid);
ok('blend NaN reads endpoint a (finite face)',
  JSON.stringify(blendExpression('fear', 'joy', NaN)) === JSON.stringify(bl));
ok('blend infinities clamp to endpoints',
  JSON.stringify(blendExpression('fear', 'joy', Infinity)) === JSON.stringify(blendExpression('fear', 'joy', 1)) &&
  JSON.stringify(blendExpression('fear', 'joy', -Infinity)) === JSON.stringify(bl));
ok('mouth M/B/F closed, A open',
  mouthShapeFor('M').open < 0.1 && mouthShapeFor('B').open < 0.1 &&
  mouthShapeFor('F').open < 0.2 && mouthShapeFor('A').open > 0.7);
let phonOk = true;
for (const s of tl.shots) {
  for (const c of s.captions || []) {
    const ph = phonemeFor(c.line, 1.0);
    if (!PHONEMES.includes(ph)) phonOk = false;
  }
}
ok('caption visemes stay in set', phonOk);
ok('phoneme REST on empty', phonemeFor('', 1) === 'REST' && phonemeFor(null, 1) === 'REST');
ok('phoneme deterministic', phonemeFor('Do not spend it', 2.0) === phonemeFor('Do not spend it', 2.0));

// turnaround symmetry within the 2% bible tolerance: the probe renders a
// rest pose and measures the shoulder anchors the renderer actually draws
// (not the constant), and rejects non-human names so the gate cannot pass
// on garbage input.
for (const name of Object.keys(HUMAN_MODELS)) {
  const sym = turnaroundSymmetry(name);
  ok('turnaround symmetric: ' + name, sym.mismatch === 0 && sym.left === sym.right);
}
ok('turnaround probe measures the render, not the constant',
  Math.abs(turnaroundSymmetry('nia').left - SHOULDER_X) < 1e-9 &&
  Math.abs(turnaroundSymmetry('tam').right - SHOULDER_X) < 1e-9);
{
  const sym = turnaroundSymmetry('yara');
  ok('turnaround mismatch derived from measured anchors',
    sym.mismatch === Math.abs(sym.left - sym.right) && Number.isFinite(sym.mismatch));
}
let symThrows = false;
try { turnaroundSymmetry('ruel'); } catch { symThrows = true; }
ok('turnaround rejects non-humans', symThrows);
let symGarbage = false;
try { turnaroundSymmetry('garbage'); } catch { symGarbage = true; }
ok('turnaround rejects garbage names', symGarbage);

// yara farewell knot: the beat value reaches the stage (hands converge,
// storm-ribbon tightens) instead of dropping on the floor.
{
  const P = { stride: 0, lean: 0, kneel: 0, armRaise: 0, stillness: 0, blink: 1 };
  const base = { ...P, windK: 0.15, boil: { x: 0, y: 0 }, faceBoil: { x: 0, y: 0 }, walkT: 1.2, face: { emotion: 'tenderness', phoneme: 'REST', blink: 1 } };
  const { ctx: c0, log: l0 } = makeRecorder();
  drawHuman(c0, {}, 'yara', 100, 200, 120, { ...base, knot: 0 });
  const { ctx: c1, log: l1 } = makeRecorder();
  drawHuman(c1, {}, 'yara', 100, 200, 120, { ...base, knot: 1 });
  ok('yara knot beat renders (hands converge, ribbon drawn)',
    JSON.stringify(l0) !== JSON.stringify(l1) && JSON.stringify(l1).includes('#4a6a9a'));
}

// 390 px silhouettes: distinct bodies and costume keys per lead
const bodyLogs = {};
for (const name of Object.keys(HUMAN_MODELS)) {
  const { ctx, log } = makeRecorder();
  const P = { stride: 0.5, lean: 0.05, kneel: 0, armRaise: 0.3, stillness: 0, blink: 1, carry: 'none', oar: true };
  drawHuman(ctx, {}, name, 195, 200, 120, {
    ...P, windK: 0.5, boil: { x: 0, y: 0 }, faceBoil: { x: 0, y: 0 },
    walkT: 1.2, weight: 0.2, exertion: 0.4, face: { emotion: 'resolve', phoneme: 'A', blink: 1 },
  });
  bodyLogs[name] = JSON.stringify(log);
}
const bodyHashes = new Set(Object.values(bodyLogs).map((s) => {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}));
ok('four leads stage distinct bodies', bodyHashes.size === 4, bodyHashes.size + '/4 unique');
ok('costume keys present',
  bodyLogs.nia.includes('#a03a2a') && bodyLogs.yara.includes('#33406a') &&
  bodyLogs.tam.includes('#3a3630') && bodyLogs.lumi.includes('#5a7048'));

// face boil: same lattice slot, scaled amplitude, still under reduced motion
const bBody = boilJitter('20260927', 's12', 2.05, false, 2);
const bFace = boilJitterFace('20260927', 's12', 2.05, false, 2);
ok('face boil ratio pinned', FACE_BOIL_RATIO === 0.35);
ok('face boil lattice-locked and scaled',
  Math.abs(bFace.x - bBody.x * FACE_BOIL_RATIO) < 1e-12 &&
  Math.abs(bFace.y - bBody.y * FACE_BOIL_RATIO) < 1e-12);
ok('face boil still under reduced motion',
  boilJitterFace('20260927', 's12', 2.05, true, 2).x === 0);

// acting beats: four phases reachable, bounded, unknown shots safe
const seen = new Set();
let actsOk = true;
for (const s of tl.shots) {
  for (const p of [0.05, 0.3, 0.55, 0.8, 0.95]) {
    const a = actFor(s, p, s.dur * p);
    seen.add(a.phase);
    if (!PHASES.includes(a.phase) || a.exertion < 0 || a.exertion > 1) actsOk = false;
    if (a.weight < -1.01 || a.weight > 1.01) actsOk = false;
    for (const v of [a.secondary.cloth, a.secondary.drift, a.secondary.bounce]) {
      if (!Number.isFinite(v)) actsOk = false;
    }
  }
}
ok('acting reaches all four phases', seen.size === 4, [...seen].join(','));
ok('acting bounded on all shots', actsOk);
ok('acting safe on unknown shots', actFor({ id: 's99' }, 0.5, 1).phase === 'action');
ok('beat table covers all shots', tl.shots.every((s) => beatFor(s.id) !== undefined));
ok('phase order sane', phaseAt(0.01, beatFor('s12')) === 'anticipation' && phaseAt(0.99, beatFor('s12')) === 'hold');

// off-contract numerics clamp to safe finite defaults (same class as blend)
ok('clamp01 NaN reads 0', clamp01(NaN) === 0);
ok('clamp01 infinities clamp to ends', clamp01(Infinity) === 1 && clamp01(-Infinity) === 0);
let nanActOk = true;
for (const bad of [NaN, Infinity, -Infinity]) {
  const a = actFor({ id: 's12', windK: 0.5, dur: 10 }, bad, bad);
  for (const v of [a.weight, a.exertion, a.secondary.cloth, a.secondary.drift, a.secondary.bounce]) {
    if (!Number.isFinite(v)) nanActOk = false;
  }
  const sec = secondaryFor(bad, bad, bad);
  for (const v of [sec.cloth, sec.drift, sec.bounce]) {
    if (!Number.isFinite(v)) nanActOk = false;
  }
}
ok('acting NaN/Infinity yields finite outputs', nanActOk);
ok('secondary NaN windK defaults to 0.5',
  JSON.stringify(secondaryFor(NaN, 1, 0)) === JSON.stringify(secondaryFor(0.5, 1, 0)));

// Tam and Lumi poses: bounded, story beats where the screenplay needs them
let posesOk = true;
for (const s of tl.shots) {
  const pose = poseFor(s, 0.5, s.dur / 2);
  if (!pose.tam || !pose.lumi) { posesOk = false; continue; }
  for (const v of [pose.tam.stride, pose.tam.armRaise, pose.lumi.stride, pose.lumi.armRaise]) {
    if (!Number.isFinite(v) || v < -0.51 || v > 1.51) posesOk = false;
  }
}
ok('tam/lumi poses bounded on all shots', posesOk);
const byId = (id) => tl.shots.find((s) => s.id === id);
ok('s12 tam belays (arm high, oar yoked)',
  poseFor(byId('s12'), 0.5, 6).tam.armRaise > 0.8 && poseFor(byId('s12'), 0.5, 6).tam.oar === true);
ok('s13 lumi back-carried (no stride)',
  poseFor(byId('s13'), 0.5, 6).lumi.stride === 0 && poseFor(byId('s13'), 0.5, 6).lumi.carry === 'back');
ok('s15 tam drops the oar past the gorge', poseFor(byId('s15'), 0.5, 6).tam.oar === false);
ok('s19 lumi walks with her stick',
  poseFor(byId('s19'), 0.5, 6).lumi.stride > 0 && poseFor(byId('s19'), 0.5, 6).lumi.carry === 'stick');
ok('ruel demoted to one shot', tl.shots.filter((s) => s.cast.includes('ruel')).length === 1);
try {
  const { ctx } = makeRecorder();
  drawTam(ctx, {}, 100, 100, 120, poseFor(byId('s12'), 0.5, 6).tam, 0.5, { x: 0, y: 0 }, 6);
  const { ctx: c2 } = makeRecorder();
  drawLumi(c2, {}, 100, 100, 80, poseFor(byId('s13'), 0.5, 6).lumi, 0.5, { x: 0, y: 0 }, 6);
  ok('tam/lumi draw without throwing', true);
} catch { ok('tam/lumi draw without throwing', false); }

// dialogue drives faces: active line emotion + viseme reach the rig
const s14 = byId('s14');
const firstLine = s14.captions[0];
const ff = faceFor(s14, firstLine.who.toLowerCase(), firstLine.t + 0.5);
ok('face follows active dialogue line',
  ff.emotion === firstLine.emotion && PHONEMES.includes(ff.phoneme), ff.emotion + '/' + ff.phoneme);

// full-stage integration at both widths, scrub-exact
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

// face cards: committed loop output, byte-identical rerun
execFileSync('node', [join(root, 'tools/capture.mjs')], { stdio: 'pipe' });
const first = readFileSync(join(root, 'dist/capture/faces.json'), 'utf8');
execFileSync('node', [join(root, 'tools/capture.mjs')], { stdio: 'pipe' });
const second = readFileSync(join(root, 'dist/capture/faces.json'), 'utf8');
ok('face cards byte-identical run to run', first === second);
const faces = JSON.parse(first);
const cardCount = Object.values(FACE_CARDS).reduce((n, l) => n + l.length, 0);
ok('face cards cover every bible emotion', Object.keys(faces.frames).length === cardCount,
  Object.keys(faces.frames).length + '/' + cardCount);
const faceHashes = new Set(Object.values(faces.frames).map((f) => f.hash));
ok('face cards sensitive (emotions differ)', faceHashes.size === cardCount, faceHashes.size + '/' + cardCount);

// no em dashes in Phase 2 sources
const sources = ['engine/humans.js', 'engine/faces.js', 'engine/acting.js',
  'engine/rigs.js', 'engine/animatic.js', 'engine/ink.js',
  'tools/capture.mjs', 'tests/craft-humans.mjs'];
const dashy = sources.filter((f) => readFileSync(join(root, f), 'utf8').includes('\u2014'));
ok('no em dashes', dashy.length === 0, dashy.join(','));

if (failures) { console.error('CRAFT-HUMANS RED: ' + failures + ' failures'); process.exit(1); }
console.log('CRAFT-HUMANS GREEN');
