// Mythduel Phase 3 combat suite (Builder, Phase 3, Refs #470).
//
// Headless verification of the duel-animation craft: FK rig proportions,
// turnaround symmetry, silhouette reads, contact honesty, impact lattice,
// effort/face coverage, particle budgets, weapon-flight honesty, fighter-card
// agreement, paint-path execution, and hostile corrupt-input behavior. Pure
// node, no network, no wall-clock: exits 0 green, 1 red with the failing
// assertion named.
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildTimeline } from '../engine/timeline.js';
import { frameTime } from '../engine/frames.js';
import { proportionDrift, silhouetteMetrics, jointPositions, mirrorJoints, limbLengths } from '../engine/rigs.js';
import { poseFor, poseName, impactAt, IMPACTS, clothSway, impactParticles, PARTICLE_BUDGET } from '../engine/acting.js';
import { faceState, effortForBeat } from '../engine/faces.js';
import { contactAt, silhouetteAt, tremorAmp, paintFighterRig, paintWeaponFlight, paintImpactParticles, weaponFlight } from '../engine/fighters.js';
import { compositionFor } from '../engine/arena.js';
import { captureFighterCards } from '../tools/capture.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let failed = 0;
const check = (name, ok, detail = '') => {
  console.log((ok ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' - ' + detail : ''));
  if (!ok) failed++;
};

const duel = JSON.parse(readFileSync(join(root, 'story/duel.json'), 'utf8'));
const board = JSON.parse(readFileSync(join(root, 'story/storyboard.json'), 'utf8'));
const tl = buildTimeline(duel);

// 1. Render-path purity across the combat engines and player.
{
  const raw = ['engine/rigs.js', 'engine/faces.js', 'engine/acting.js', 'engine/fighters.js', 'engine/arena.js', 'player/player.js']
    .map((f) => readFileSync(join(root, f), 'utf8')).join('\n');
  const src = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/.*$/gm, '$1');
  check('no Math.random in combat path', !src.includes('Math.random'));
  check('no Date.now in combat path', !src.includes('Date.now'));
  check('no performance.now in combat path', !src.includes('performance.now'));
}

// 2. Proportions honour the model sheets within 5 percent.
{
  const thor = proportionDrift('thor');
  const zeus = proportionDrift('zeus');
  check('thor proportions within 5pct', thor.ok, (thor.worst * 100).toFixed(2) + '%');
  check('zeus proportions within 5pct', zeus.ok, (zeus.worst * 100).toFixed(2) + '%');
  const lt = limbLengths('thor');
  const lz = limbLengths('zeus');
  check('thor 7.0 heads', Math.abs(lt.height / lt.head - 7.0) < 1e-9, String(lt.height / lt.head));
  check('zeus 7.4 heads', Math.abs(lz.height / lz.head - 7.4) < 1e-9, String(lz.height / lz.head));
  check('shoulder sheets', Math.abs(lt.shoulderWidth / lt.head - 2.1) < 1e-9 && Math.abs(lz.shoulderWidth / lz.head - 1.8) < 1e-9, '2.1 vs 1.8');
}

// 3. Turnaround symmetry: double mirror returns joints, facing flips.
{
  let ok = true;
  for (const rig of ['thor', 'zeus']) {
    for (const b of [tl.beats[0], tl.beats[2], tl.beats[4]]) {
      const pose = poseFor(b, 1).thor;
      const j = jointPositions(rig, { ...pose, facing: 1 }, 480, 440);
      const m = mirrorJoints(j, 480);
      const back = mirrorJoints(m, 480);
      for (const k of ['root', 'hips', 'chest', 'head']) {
        if (Math.abs(back[k].x - j[k].x) > 1e-9 || Math.abs(back[k].y - j[k].y) > 1e-9) ok = false;
      }
      if (m.facing !== -1 || back.facing !== 1) ok = false;
      // Mirror swaps hands: mirrored right hand equals original left.
      if (Math.abs(m.armR.hand.x - (960 - j.armL.hand.x)) > 1e-9) ok = false;
    }
  }
  check('turnaround double-mirror exact', ok);
}

// 4. Silhouette reads apart at 390 px.
{
  const t = silhouetteMetrics('thor');
  const z = silhouetteMetrics('zeus');
  check('binding hip ratios', t.ratio === 1.35 && z.ratio === 1.15, t.ratio + ' vs ' + z.ratio);
  const gap = Math.abs(t.shoulderWidth - z.shoulderWidth) * (390 / 960);
  check('shoulder gap readable at 390px', gap >= 2, gap.toFixed(1) + 'px');
  check('silhouetteAt agrees', silhouetteAt('thor').ratio === 1.35 && silhouetteAt('zeus').ratio === 1.15, 'helpers');
}

// 5. Contact honesty: soles on the ground line at hero frames and mid-beats.
{
  let ok = true;
  let worst = 0;
  for (const p of board.panels) {
    const beat = tl.beats.find((b) => b.id === p.beat);
    const comp = compositionFor(p.beat);
    for (const lt of [frameTime(p.heroTime) - beat.start, beat.dur / 2]) {
      const pose = poseFor(beat, lt);
      for (const [rig, fp] of [['thor', pose.thor], ['zeus', pose.zeus]]) {
        const c = contactAt(rig, fp, comp.ground);
        worst = Math.max(worst, Math.abs(c.left), Math.abs(c.right));
        if (Math.abs(c.left) > 1.5 || Math.abs(c.right) > 1.5) ok = false;
      }
    }
  }
  check('contacts honest across beats', ok, 'worst ' + worst.toFixed(2) + 'px');
}

// 6. Impact lattice: every authored impact on the grid, inside its beat,
// lookup exact, silent beats null.
{
  let ok = true;
  for (const [bid, marks] of Object.entries(IMPACTS)) {
    const beat = tl.beats.find((b) => b.id === bid);
    for (const m of marks) {
      if (Math.abs(m.t * 24 - Math.round(m.t * 24)) > 1e-9) ok = false;
      if (!(m.t >= 0 && m.t < beat.dur)) ok = false;
      if (impactAt(bid, m.t) !== m.kind) ok = false;
    }
  }
  check('impacts lattice-exact and inside beats', ok, '6 impacts');
  check('silent beats carry no impact', impactAt('b01', 4) === null && impactAt('b02', 4) === null && impactAt('b08', 4) === null, 'b01/b02/b08');
  check('withheld touch exact', impactAt('b07', 16) === 'withheld-touch', String(impactAt('b07', 16)));
}

// 7. Effort and faces: calm verse, hot impacts, deterministic blinks.
{
  check('b01 calm faces', effortForBeat(tl.beats[0], 4) < 0.3, String(effortForBeat(tl.beats[0], 4)));
  check('b03 apex hot', effortForBeat(tl.beats[2], 6.2) > 0.6, String(effortForBeat(tl.beats[2], 6.2)));
  check('b06 weathering hot', effortForBeat(tl.beats[5], 10) > 0.6, String(effortForBeat(tl.beats[5], 10)));
  const f1 = faceState(tl.seed, 'thor', 46, 0.8, 1);
  const f2 = faceState(tl.seed, 'thor', 46, 0.8, 1);
  check('faces deterministic', JSON.stringify(f1) === JSON.stringify(f2), 'blink=' + f1.blink);
  check('gaze finite, brows/mouth bounded', Number.isFinite(f1.gaze.x) && f1.brow >= 0 && f1.mouthOpen >= 0 && f1.mouthOpen <= 1, JSON.stringify(f1.gaze));
  check('tremor scales with fatigue', tremorAmp(0) === 0 && tremorAmp(7) > tremorAmp(3) && tremorAmp(3) > tremorAmp(0), tremorAmp(7).toFixed(2) + 'px max');
  const s1 = clothSway(tl.seed, 'thor', 46, tl.beats[2].wind);
  const s2 = clothSway(tl.seed, 'thor', 46, tl.beats[2].wind);
  check('cloth sway deterministic', JSON.stringify(s1) === JSON.stringify(s2), s1.sway.toFixed(2) + 'px');
}

// 8. Particles: budgeted, anchored, deterministic; flights honest.
{
  const parts = impactParticles(tl.seed, 'b03', 6.5, { crossX: 480, crossY: 330, ground: 440 });
  check('spark burst budgeted', parts.length > 0 && parts.length <= PARTICLE_BUDGET, parts.length + ' parts');
  check('sparks anchor near crossing', parts.every((p) => Math.abs(p.x - 480) < 60 && p.y <= 440), 'anchored');
  const sky = impactParticles(tl.seed, 'b06', 10, { crossX: 480, crossY: 300, ground: 458 });
  check('skyburst is the biggest burst', sky.length === PARTICLE_BUDGET, sky.length + ' parts');
  check('particles deterministic', JSON.stringify(parts) === JSON.stringify(impactParticles(tl.seed, 'b03', 6.5, { crossX: 480, crossY: 330, ground: 440 })), 'stable');
  check('silent instants emit nothing', impactParticles(tl.seed, 'b01', 4, {}).length === 0, 'b01 quiet');
  const b04 = tl.beats.find((b) => b.id === 'b04');
  check('crossing airborne both', weaponFlight(b04, 9, 'thor', 422, 538, 452) !== null && weaponFlight(b04, 9, 'zeus', 422, 538, 452) !== null, 'b04@9s');
  check('flights grounded outside wager', weaponFlight(tl.beats[0], 4, 'thor', 307, 653, 452) === null, 'b01 grounded');
  const fl = weaponFlight(b04, 9, 'thor', 422, 538, 452);
  check('flight positions finite', Number.isFinite(fl.x) && Number.isFinite(fl.y), fl.x.toFixed(1) + ',' + fl.y.toFixed(1));
}

// 9. Fighter cards: 8 cards, named poses, honest contacts, impacts listed.
{
  const cards = captureFighterCards();
  check('8 fighter cards', cards.length === 8, cards.length + ' cards');
  let ok = cards.every((c) => c.pose && c.thorPose && c.zeusPose && Number.isFinite(c.thorContact.left));
  check('cards carry poses and contacts', ok);
  const b03 = cards.find((c) => c.beat === 'b03');
  const b05 = cards.find((c) => c.beat === 'b05');
  check('b03 apex pose reads', /apex|impact|overextend/i.test(b03.pose + ' ' + b03.thorPose), b03.pose);
  check('b05 clinch pose reads', /clinch|lands|knee|rise/i.test(b05.pose + ' ' + b05.thorPose + ' ' + b05.zeusPose), b05.pose);
  check('poseName helper agrees', poseName('b03', 6) === 'apex-block', poseName('b03', 6));
}

// 10. Paint path executes headless: stub context over all beats, stable and
// bounded call counts.
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
  let worst = 0;
  for (const b of tl.beats) {
    const comp = compositionFor(b.id);
    for (const lt of [0.5, b.dur / 2, b.dur - 0.05]) {
      const t = b.start + lt;
      const ctx = stubCtx();
      try {
        paintFighterRig(ctx, tl.seed, t, b, 'thor', 0.44, comp.ground, b.wind, b.continuity.exit.thor.fatigue);
        paintFighterRig(ctx, tl.seed, t, b, 'zeus', 0.56, comp.ground, b.wind, b.continuity.exit.zeus.fatigue);
        const fl = weaponFlight(b, lt, 'thor', 422, 538, comp.ground);
        if (fl) paintWeaponFlight(ctx, tl.seed, t, b, lt, 'thor', fl.x, fl.y);
        paintImpactParticles(ctx, tl.seed, t, b, { crossX: 480, crossY: comp.ground - 110, ground: comp.ground });
        const n1 = ctx.calls.count;
        worst = Math.max(worst, n1);
        const ctx2 = stubCtx();
        paintFighterRig(ctx2, tl.seed, t, b, 'thor', 0.44, comp.ground, b.wind, b.continuity.exit.thor.fatigue);
        paintFighterRig(ctx2, tl.seed, t, b, 'zeus', 0.56, comp.ground, b.wind, b.continuity.exit.zeus.fatigue);
        const fl2 = weaponFlight(b, lt, 'thor', 422, 538, comp.ground);
        if (fl2) paintWeaponFlight(ctx2, tl.seed, t, b, lt, 'thor', fl2.x, fl2.y);
        paintImpactParticles(ctx2, tl.seed, t, b, { crossX: 480, crossY: comp.ground - 110, ground: comp.ground });
        if (ctx2.calls.count !== n1) ok = false;
      } catch { ok = false; }
    }
  }
  check('fighter paint runs all beats', ok);
  check('fighter paint bounded and stable', worst > 0 && worst < 6000, String(worst));
}

// 11. Hostile inputs fail loudly, never silently.
{
  let threw = false;
  try { poseFor({ id: 'b99', dur: 10 }, 1); } catch { threw = true; }
  check('poseFor throws on unknown beat', threw);
  threw = false;
  try { jointPositions('ares', {}, 0, 0); } catch { threw = true; }
  check('jointPositions throws on unknown rig', threw);
  const c = contactAt('thor', {}, 440);
  check('contact finite on neutral pose', Number.isFinite(c.left) && Number.isFinite(c.right), c.left + '/' + c.right);
}

if (failed) {
  console.error('PHASE3 RED: ' + failed + ' probe(s) failed');
  process.exit(1);
}
console.log('PHASE3 GREEN: duel animation and combat craft verify headless');
