// Mythduel Phase 3 combat red-team suite (Tester, Phase 3, Refs #470).
//
// Hostile probes over the duel-animation craft that the Builder suite does
// not pin: clamped hostile locals, unknown-beat throws, extreme FK angles,
// full-beat mirror coverage, particle budgets/decay/anchoring on every
// authored impact, tremor/cloth/face clamping, weapon-flight honesty windows,
// lifted-foot contacts, scrub-exact quantization, and render-path purity over
// the wider combat surface (engines + player + tools). Pure node, no network,
// no wall-clock: exits 0 green, 1 red with the failing assertion named.
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildTimeline } from '../engine/timeline.js';
import { frameTime } from '../engine/frames.js';
import { jointPositions, mirrorJoints, limbLengths } from '../engine/rigs.js';
import { poseFor, impactAt, IMPACTS, clothSway, impactParticles, stepParticles, PARTICLE_BUDGET } from '../engine/acting.js';
import { faceState, effortForBeat } from '../engine/faces.js';
import { contactAt, tremorAmp, paintFighterRig, weaponFlight } from '../engine/fighters.js';
import { compositionFor } from '../engine/arena.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let failed = 0;
const check = (name, ok, detail = '') => {
  console.log((ok ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' - ' + detail : ''));
  if (!ok) failed++;
};

const duel = JSON.parse(readFileSync(join(root, 'story/duel.json'), 'utf8'));
const tl = buildTimeline(duel);
const finite = (v) => Number.isFinite(v);

// 1. Hostile locals clamp inside the beat, never throw, never leak outside.
{
  let ok = true;
  for (const b of tl.beats) {
    for (const hostile of [-1e9, -5, -0.001, NaN, Infinity, b.dur, b.dur + 9, 1e9]) {
      try {
        const p = poseFor(b, hostile);
        if (!(p.local >= 0 && p.local < b.dur)) ok = false;
        if (!p.thor || !p.zeus) ok = false;
      } catch { ok = false; }
    }
  }
  check('poseFor clamps hostile locals', ok, '8 beats x 8 hostiles');
}

// 2. Unknown beats throw loudly with a message.
{
  let ok = true;
  for (const bad of [{ id: 'b99', dur: 10 }, { id: 'ares', dur: 5 }, { id: '', dur: 5 }, null, {}]) {
    try { poseFor(bad, 1); ok = false; } catch (e) { if (!e || !e.message) ok = false; }
  }
  check('poseFor throws on unknown beats', ok, '5 corrupt ids');
  let rigThrew = false;
  try { jointPositions('ares', {}, 0, 0); } catch { rigThrew = true; }
  check('jointPositions throws on unknown rig', rigThrew);
}

// 3. Extreme FK angles stay finite (no NaN joints under hostile but finite
// poses); NaN/Infinity inputs must not throw (NaN propagation is allowed,
// hangs and crashes are not).
{
  const extremes = [
    { shoulderR: Math.PI, elbowR: -Math.PI, shoulderL: -Math.PI, elbowL: Math.PI },
    { crouch: 2.0, lean: 40, headTilt: 2, rootShift: 400 },
    { hipL: Math.PI, kneeL: -Math.PI, hipR: -Math.PI, kneeR: Math.PI, lift: 50 },
  ];
  let ok = true;
  for (const rig of ['thor', 'zeus']) {
    for (const ex of extremes) {
      try {
        const j = jointPositions(rig, { facing: 1, ...ex }, 480, 440);
        for (const pt of [j.root, j.hips, j.chest, j.head, j.armR.hand, j.armL.hand, j.legR.foot, j.legL.foot]) {
          if (!finite(pt.x) || !finite(pt.y)) ok = false;
        }
      } catch { ok = false; }
    }
    // Corrupt numeric inputs: must return (even with NaN) rather than throw.
    try { jointPositions(rig, { facing: 1, shoulderR: NaN, crouch: Infinity, lean: -Infinity }, 480, 440); }
    catch { ok = false; }
  }
  check('extreme FK poses stay finite', ok, '2 rigs x 3 hostiles + corrupt no-throw');
}

// 4. Double-mirror exact over every beat mid (full coverage, both rigs).
{
  let ok = true;
  for (const rig of ['thor', 'zeus']) {
    for (const b of tl.beats) {
      const pose = poseFor(b, b.dur / 2).thor;
      const j = jointPositions(rig, { ...pose, facing: 1 }, 480, 440);
      const back = mirrorJoints(mirrorJoints(j, 480), 480);
      for (const k of ['root', 'hips', 'chest', 'head']) {
        if (Math.abs(back[k].x - j[k].x) > 1e-9 || Math.abs(back[k].y - j[k].y) > 1e-9) ok = false;
      }
      if (back.facing !== 1) ok = false;
    }
  }
  check('double-mirror exact all beats', ok, '2 rigs x 8 beats');
}

// 5. Particles: every authored impact budgeted, anchored, finite,
// deterministic; silent instants emit nothing.
{
  let ok = true;
  let worst = 0;
  for (const [bid, marks] of Object.entries(IMPACTS)) {
    const beat = tl.beats.find((b) => b.id === bid);
    const comp = compositionFor(bid);
    for (const m of marks) {
      const a = impactParticles(tl.seed, bid, m.t, { crossX: 480, crossY: comp.ground - 110, ground: comp.ground });
      const b2 = impactParticles(tl.seed, bid, m.t, { crossX: 480, crossY: comp.ground - 110, ground: comp.ground });
      worst = Math.max(worst, a.length);
      if (a.length === 0 || a.length > PARTICLE_BUDGET) ok = false;
      if (JSON.stringify(a) !== JSON.stringify(b2)) ok = false;
      for (const p of a) {
        if (!finite(p.x) || !finite(p.y) || !finite(p.vx) || !finite(p.vy) || !finite(p.life)) ok = false;
        if (Math.abs(p.x - 480) > 60) ok = false;
      }
      void beat;
    }
  }
  check('all impacts budgeted and anchored', ok, 'worst ' + worst + '/' + PARTICLE_BUDGET);
  check('unknown beat emits nothing', impactParticles(tl.seed, 'b99', 3, {}).length === 0);
  check('off-impact instants emit nothing',
    impactParticles(tl.seed, 'b03', 1.0, {}).length === 0 &&
    impactParticles(tl.seed, 'b05', 0.5, {}).length === 0, 'between marks');
  check('impactAt off-mark is null', impactAt('b05', 6.5) === null && impactAt('b99', 1) === null, 'gap+unknown');
}

// 6. stepParticles integrates forward, applies gravity, expires the dead.
{
  const one = [{ kind: 'spark-spray', x: 0, y: 0, vx: 10, vy: 0, life: 1, size: 2 }];
  const stepped = stepParticles(one, 0.1);
  check('step advances x', Math.abs(stepped[0].x - 1) < 1e-9, stepped[0].x.toFixed(3));
  check('gravity pulls vy down-field', stepped[0].vy > 0, stepped[0].vy.toFixed(1));
  check('life decays', stepped[0].life < 1, stepped[0].life.toFixed(2));
  check('dead particles filtered', stepParticles(one, 5).length === 0, 'expired');
  check('empty in, empty out', stepParticles([], 0.5).length === 0);
}

// 7. Tremor clamps hostile fatigue and rises monotonically to the 1.4 cap.
{
  check('tremor clamps hostile fatigue',
    tremorAmp(-5) === 0 && tremorAmp(NaN) === 0 && tremorAmp(Infinity) === 1.4 && tremorAmp(99) === 1.4,
    'neg/NaN/huge');
  let mono = tremorAmp(0) === 0;
  for (let f = 1; f <= 7; f++) { if (!(tremorAmp(f) > tremorAmp(f - 1))) mono = false; }
  check('tremor monotonic to 1.4px cap', mono && tremorAmp(7) === 1.4, String(tremorAmp(7)));
}

// 8. Cloth sway finite under hostile wind, deterministic per slot.
{
  const winds = [null, {}, { force: NaN, dir: NaN }, { force: 5, dir: 720 }, { force: -2, dir: -90 }];
  let ok = true;
  for (const w of winds) {
    const s = clothSway(tl.seed, 'thor', 46, w);
    if (!finite(s.sway) || !finite(s.lift) || !finite(s.east)) ok = false;
  }
  const s1 = clothSway(tl.seed, 'zeus', 46, tl.beats[3].wind);
  const s2 = clothSway(tl.seed, 'zeus', 46, tl.beats[3].wind);
  check('cloth finite under hostile wind', ok, '5 hostile winds');
  check('cloth deterministic per slot', JSON.stringify(s1) === JSON.stringify(s2));
}

// 9. Faces clamp hostile effort, stay bounded and deterministic.
{
  let ok = true;
  for (const e of [-3, NaN, Infinity, 99]) {
    const f = faceState(tl.seed, 'thor', 46, e, 1);
    if (!(f.effort >= 0 && f.effort <= 1 && f.mouthOpen >= 0 && f.mouthOpen <= 1)) ok = false;
    if (!finite(f.gaze.x) || !finite(f.gaze.y) || !finite(f.brow)) ok = false;
  }
  const a = faceState(tl.seed, 'zeus', 100, 0.8, -1);
  const b = faceState(tl.seed, 'zeus', 100, 0.8, -1);
  check('faces clamp hostile effort', ok, 'neg/NaN/huge');
  check('faces deterministic per slot', JSON.stringify(a) === JSON.stringify(b));
  check('zeus gaze faces west', a.gaze.x < 0, a.gaze.x.toFixed(2));
  check('brow rises with effort',
    faceState(tl.seed, 'thor', 46, 1, 1).brow > faceState(tl.seed, 'thor', 46, 0, 1).brow, 'slope');
}

// 10. Effort fields finite everywhere; null/unknown beats fail safe.
{
  let ok = true;
  for (const b of tl.beats) {
    for (const lt of [0, b.dur / 2, b.dur - 0.05]) {
      const e = effortForBeat(b, lt);
      if (!finite(e) || e < 0 || e > 1) ok = false;
    }
  }
  check('effort finite on all beats', ok, '8 beats x 3 samples');
  check('effort fails safe', finite(effortForBeat(null, 1)) && finite(effortForBeat({ id: 'b99' }, 1)), 'null+unknown');
}

// 11. Weapon flights honest: grounded outside the wager, airborne and finite
// at the crossing, deterministic.
{
  check('flights grounded outside wager',
    weaponFlight(tl.beats[0], 4, 'thor', 307, 653, 452) === null &&
    weaponFlight(tl.beats[7], 4, 'zeus', 300, 660, 452) === null, 'b01/b08 quiet');
  const b04 = tl.beats.find((b) => b.id === 'b04');
  const tF = weaponFlight(b04, 9, 'thor', 422, 538, 452);
  const zF = weaponFlight(b04, 9, 'zeus', 422, 538, 452);
  check('crossing airborne both', tF !== null && zF !== null, 'b04@9s');
  check('flight positions finite', tF && finite(tF.x) && finite(tF.y), tF ? tF.x.toFixed(1) + ',' + tF.y.toFixed(1) : 'null');
  check('flights deterministic',
    JSON.stringify(tF) === JSON.stringify(weaponFlight(b04, 9, 'thor', 422, 538, 452)), 'stable');
}

// 12. Contacts: soles stay planted through the whole bout (the b05 knee
// take is authored as a deep crouch with lift 0, so honesty means 0/0 even
// there); hips drop under the kneel.
{
  const b05 = tl.beats.find((b) => b.id === 'b05');
  const knee = poseFor(b05, 15);
  const kneel = contactAt('zeus', knee.zeus, 450);
  const b01 = tl.beats[0];
  const planted = contactAt('thor', poseFor(b01, 1).thor, 452);
  check('planted soles read 0', Math.abs(planted.left) < 1e-9 && Math.abs(planted.right) < 1e-9,
    planted.left + '/' + planted.right);
  check('knee-take keeps honest contacts', Math.abs(kneel.left) <= 1.5 && Math.abs(kneel.right) <= 1.5,
    kneel.left + '/' + kneel.right);
  const standHips = jointPositions('zeus', { ...poseFor(b05, 0).zeus, facing: -1 }, 480, 450).hips.y;
  const kneelHips = jointPositions('zeus', { ...knee.zeus, facing: -1 }, 480, 450).hips.y;
  check('kneel drops the hips', kneelHips > standHips, standHips.toFixed(1) + '->' + kneelHips.toFixed(1));
  const neutral = contactAt('thor', {}, 440);
  check('neutral contact finite', finite(neutral.left) && finite(neutral.right), neutral.left + '/' + neutral.right);
}

// 13. Scrub-exact: off-lattice locals quantize to the grid lookup.
{
  let ok = true;
  for (const b of tl.beats) {
    const off = b.dur / 2 + 0.017;
    const a = JSON.stringify(poseFor(b, off));
    const c = JSON.stringify(poseFor(b, frameTime(off)));
    if (a !== c) ok = false;
  }
  check('poseFor scrub-exact off-lattice', ok, '8 beats quantized');
}

// 14. Render-path purity over the wider combat surface.
{
  const files = ['engine/rigs.js', 'engine/faces.js', 'engine/acting.js', 'engine/fighters.js',
    'engine/arena.js', 'player/player.js', 'player/gallery.js', 'tools/capture.mjs', 'tools/render.mjs'];
  const raw = files.map((f) => readFileSync(join(root, f), 'utf8')).join('\n');
  const src = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/.*$/gm, '$1');
  check('no Math.random on combat surface', !src.includes('Math.random'));
  check('no Date.now on combat surface', !src.includes('Date.now'));
  check('no performance.now on combat surface', !src.includes('performance.now'));
}

// 15. Hostile paint path: extreme fatigue never throws, call counts stable.
{
  const stubCtx = () => {
    const calls = { count: 0 };
    const grad = { addColorStop() { calls.count++; } };
    return new Proxy({ calls }, {
      get(t, k) {
        if (k === 'calls') return t.calls;
        if (k === 'createLinearGradient' || k === 'createRadialGradient') return () => grad;
        if (k === 'measureText') return () => ({ width: 0 });
        if (k === 'canvas') return undefined;
        if (typeof k === 'string') return (...a) => { t.calls.count++; };
        return undefined;
      },
      set(t, k, v) { t[k] = v; return true; },
    });
  };
  let ok = true;
  const b = tl.beats[4];
  const comp = compositionFor(b.id);
  for (const fatigue of [-5, NaN, 99]) {
    try {
      const c1 = stubCtx();
      paintFighterRig(c1, tl.seed, b.start + 6, b, 'thor', 0.44, comp.ground, b.wind, fatigue);
      const c2 = stubCtx();
      paintFighterRig(c2, tl.seed, b.start + 6, b, 'thor', 0.44, comp.ground, b.wind, fatigue);
      if (c1.calls.count !== c2.calls.count || c1.calls.count <= 0) ok = false;
    } catch { ok = false; }
  }
  check('hostile fatigue paints stable', ok, 'neg/NaN/huge');
  void limbLengths;
}

if (failed) {
  console.error('TESTER PHASE3 REDTEAM RED: ' + failed + ' probe(s) failed');
  process.exit(1);
}
console.log('TESTER PHASE3 REDTEAM GREEN: combat red-team probes verify headless');
