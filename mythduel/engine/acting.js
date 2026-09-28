// Mythduel acting: beat-by-beat combat choreography as pure keyframes.
//
// poseFor(beat, local) is a pure function of the quantized local beat time:
// every joint angle, root shift, weapon state, and impact flag derives from
// authored keyframes interpolated on the 24 fps grid. No wall-clock, no
// Math.random anywhere: particles seed from substreams keyed on the impact
// slot. The canvas paint path (fighters.js) and the headless audit share
// these exact values, so stills and stage agree by construction.
//
// Combat vocabulary covered: advance, overhead strike, high block, impact
// reaction, clinch, traded body blows, knockdown (knee) and rise, back-to-back
// weathering, earned opening withheld, open-handed loosing. One readable
// exchange per beat (legibility rule); impact frames land on the lattice.
import { frameTime } from './frames.js';
import { substream } from './rng.js';
import { boilSlot } from './ink.js';

// Binding impact frames (local beat seconds, all on the 24 fps lattice):
// b03 apex/block, b04 sky crossing, b05 body blows, b06 skyburst peak.
export const IMPACTS = {
  b01: [],
  b02: [],
  b03: [{ t: 6.5, kind: 'spark-spray' }],
  b04: [{ t: 9.0, kind: 'sky-crossing' }],
  b05: [{ t: 6.0, kind: 'body-blow' }, { t: 11.0, kind: 'body-blow' }],
  b06: [{ t: 10.0, kind: 'skyburst-peak' }],
  b07: [{ t: 16.0, kind: 'withheld-touch' }],
  b08: [],
};

function keys(thor, zeus, opts = {}) {
  return { thor, zeus, ...opts };
}

function P(p) {
  return {
    facing: 1,
    crouch: 0.12,
    lean: 0,
    headTilt: 0,
    shoulderL: 0.25,
    elbowL: -0.35,
    shoulderR: 0.35,
    elbowR: -0.5,
    hipL: 0.12,
    kneeL: -0.18,
    hipR: -0.12,
    kneeR: -0.18,
    rootShift: 0,
    lift: 0,
    weapon: 'gripped',
    ...p,
  };
}

// Authored keyframes per beat: [localTime, thorPose, zeusPose, extra].
// Times are lattice-exact halves and integers. Poses carry FK angles plus a
// weapon grip state that mirrors duel.json continuity (grounded, raised,
// high, low, gripped, lowered, dropped).
const KEYFRAMES = {
  b01: [
    [0, P({ weapon: 'grounded', shoulderR: 0.15, elbowR: -0.15, name: 'terms' }), P({ facing: -1, weapon: 'grounded', shoulderL: 0.15, elbowL: -0.15, name: 'terms' }), { name: 'terms' }],
    [8, P({ weapon: 'grounded', lean: 2, headTilt: 0.2, name: 'terms-spoken' }), P({ facing: -1, weapon: 'grounded', lean: -2, headTilt: -0.1, name: 'terms-answer' }), { name: 'terms-spoken' }],
    [14, P({ weapon: 'grounded', crouch: 0.15, name: 'settle' }), P({ facing: -1, weapon: 'grounded', crouch: 0.15, name: 'settle' }), { name: 'settle' }],
  ],
  b02: [
    [0, P({ weapon: 'raised', shoulderR: 0.7, elbowR: -0.6, hipL: 0.2, name: 'circle' }), P({ facing: -1, weapon: 'raised', shoulderL: 0.7, elbowL: -0.6, hipR: -0.2, name: 'circle' }), { name: 'circling' }],
    [9, P({ weapon: 'raised', lean: 6, shoulderR: 1.0, elbowR: -0.4, rootShift: 8, name: 'feint' }), P({ facing: -1, weapon: 'raised', lean: -4, shoulderL: 0.5, name: 'read' }), { name: 'feint' }],
    [16, P({ weapon: 'raised', lean: -3, rootShift: -6, name: 'answer' }), P({ facing: -1, weapon: 'raised', lean: 5, shoulderL: 1.0, rootShift: -8, name: 'feint-answer' }), { name: 'feint-answer' }],
    [21, P({ weapon: 'raised', shoulderR: 0.9, crouch: 0.18, name: 'ranged' }), P({ facing: -1, weapon: 'raised', shoulderL: 0.9, crouch: 0.18, name: 'ranged' }), { name: 'ranged' }],
  ],
  b03: [
    [0, P({ weapon: 'raised', shoulderR: 0.8, elbowR: -0.6, rootShift: 0, name: 'range' }), P({ facing: -1, weapon: 'raised', shoulderL: 0.8, elbowL: -0.6, name: 'brace' }), { name: 'ranging' }],
    [6, P({ weapon: 'raised', shoulderR: 2.6, elbowR: -0.15, lean: 10, crouch: 0.08, rootShift: 26, name: 'apex' }), P({ facing: -1, weapon: 'high', shoulderL: 2.4, elbowL: -0.2, lean: -6, crouch: 0.3, name: 'high-block' }), { name: 'apex-block' }],
    [6.5, P({ weapon: 'low', shoulderR: 0.4, elbowR: -0.5, lean: 12, crouch: 0.22, rootShift: 34, headTilt: 0.3, name: 'impact-react' }), P({ facing: -1, weapon: 'high', shoulderL: 2.2, elbowL: -0.3, lean: -8, crouch: 0.34, name: 'block-hold' }), { name: 'impact', impact: 'spark-spray' }],
    [14, P({ weapon: 'low', shoulderR: 0.3, lean: 8, crouch: 0.25, rootShift: 40, name: 'overextend' }), P({ facing: -1, weapon: 'high', shoulderL: 0.9, name: 'name-it' }), { name: 'overextend' }],
  ],
  b04: [
    [0, P({ weapon: 'low', shoulderR: 0.5, name: 'wager' }), P({ facing: -1, weapon: 'high', shoulderL: 0.9, name: 'wager' }), { name: 'wager' }],
    [3, P({ weapon: 'low', shoulderR: 0.5, name: 'watch' }), P({ facing: -1, weapon: 'thrown', shoulderL: 2.8, elbowL: -0.1, lean: -10, name: 'throw' }), { name: 'zeus-throw', zeusThrown: true }],
    [5, P({ weapon: 'thrown', shoulderR: 2.8, elbowR: -0.1, lean: 10, name: 'throw' }), P({ facing: -1, weapon: 'thrown', shoulderL: 0.6, name: 'bare' }), { name: 'thor-throw', thorThrown: true, zeusThrown: true }],
    [9, P({ weapon: 'thrown', shoulderR: 0.4, headTilt: -0.4, name: 'track-sky' }), P({ facing: -1, weapon: 'thrown', shoulderL: 0.4, headTilt: 0.4, name: 'track-sky' }), { name: 'crossing', thorThrown: true, zeusThrown: true, impact: 'sky-crossing' }],
    [14, P({ weapon: 'gripped', shoulderR: 0.7, elbowR: -0.7, name: 'catch' }), P({ facing: -1, weapon: 'thrown', shoulderL: 0.5, name: 'reach' }), { name: 'thor-catch', zeusThrown: true }],
    [16, P({ weapon: 'gripped', shoulderR: 0.6, name: 'caught' }), P({ facing: -1, weapon: 'gripped', shoulderL: 0.6, elbowL: -0.7, name: 'catch' }), { name: 'both-caught' }],
  ],
  b05: [
    [0, P({ weapon: 'gripped', shoulderR: 0.8, lean: 6, crouch: 0.25, rootShift: 14, name: 'close' }), P({ facing: -1, weapon: 'gripped', shoulderL: 0.8, lean: -6, crouch: 0.25, rootShift: -14, name: 'close' }), { name: 'clinch-close' }],
    [6, P({ weapon: 'gripped', shoulderR: 1.6, elbowR: -0.2, lean: 12, crouch: 0.3, name: 'body-blow' }), P({ facing: -1, weapon: 'gripped', shoulderL: 0.4, lean: -12, headTilt: 0.4, crouch: 0.38, name: 'take-it' }), { name: 'thor-lands', impact: 'body-blow' }],
    [11, P({ weapon: 'gripped', shoulderR: 0.4, lean: -8, headTilt: -0.3, crouch: 0.4, name: 'take-it' }), P({ facing: -1, weapon: 'gripped', shoulderL: 1.6, elbowL: -0.2, lean: -12, crouch: 0.3, name: 'body-blow' }), { name: 'zeus-lands', impact: 'body-blow' }],
    [15, P({ weapon: 'gripped', shoulderR: 0.6, lean: 4, name: 'watch-knee' }), P({ facing: -1, weapon: 'dropped', shoulderL: 0.3, crouch: 0.85, lift: 0, hipL: 0.9, kneeL: -1.4, hipR: 0.7, kneeR: -1.5, lean: -4, name: 'knee' }), { name: 'knee', zeusDropped: true }],
    [19, P({ weapon: 'gripped', shoulderR: 0.5, name: 'carry-cost' }), P({ facing: -1, weapon: 'dropped', shoulderL: 0.5, crouch: 0.35, hipL: 0.2, kneeL: -0.3, hipR: -0.1, kneeR: -0.25, name: 'rise' }), { name: 'rise', zeusDropped: true }],
  ],
  b06: [
    [0, P({ weapon: 'gripped', shoulderR: 0.6, lean: 4, name: 'turn-sky' }), P({ facing: -1, weapon: 'dropped', shoulderL: 0.5, lean: -4, name: 'turn-sky' }), { name: 'turn', zeusDropped: true }],
    [4, P({ facing: 1, weapon: 'grounded', shoulderR: 0.3, crouch: 0.4, lean: 6, headTilt: -0.5, name: 'brace-storm' }), P({ facing: -1, weapon: 'grounded', shoulderL: 0.3, crouch: 0.4, lean: -6, headTilt: 0.5, name: 'brace-storm' }), { name: 'back-to-back' }],
    [10, P({ facing: 1, weapon: 'grounded', shoulderR: 0.4, crouch: 0.5, lean: 8, headTilt: -0.6, name: 'weather-peak' }), P({ facing: -1, weapon: 'grounded', shoulderL: 0.4, crouch: 0.5, lean: -8, headTilt: 0.6, name: 'weather-peak' }), { name: 'skyburst', impact: 'skyburst-peak' }],
    [15, P({ weapon: 'grounded', shoulderR: 0.3, crouch: 0.35, name: 'set-down' }), P({ facing: -1, weapon: 'grounded', shoulderL: 0.3, crouch: 0.35, name: 'set-down' }), { name: 'brace' }],
  ],
  b07: [
    [0, P({ weapon: 'grounded', shoulderR: 0.4, crouch: 0.3, name: 'spent' }), P({ facing: -1, weapon: 'grounded', shoulderL: 0.4, crouch: 0.3, name: 'spent' }), { name: 'spent' }],
    [10, P({ weapon: 'lowered', shoulderR: 0.5, lean: 4, name: 'offered' }), P({ facing: -1, weapon: 'lowered', shoulderL: 1.8, elbowL: -0.2, lean: -8, rootShift: -12, name: 'read-opening' }), { name: 'opening-read' }],
    [16, P({ weapon: 'lowered', shoulderR: 0.4, headTilt: 0.1, name: 'offer-no-defence' }), P({ facing: -1, weapon: 'lowered', shoulderL: 2.0, elbowL: -0.05, lean: -10, rootShift: -16, name: 'held-at-brow' }), { name: 'withheld', impact: 'withheld-touch' }],
    [21, P({ weapon: 'lowered', shoulderR: 0.35, name: 'debt' }), P({ facing: -1, weapon: 'lowered', shoulderL: 1.9, name: 'debt-held' }), { name: 'debt' }],
  ],
  b08: [
    [0, P({ weapon: 'lowered', shoulderR: 0.4, name: 'mercy' }), P({ facing: -1, weapon: 'lowered', shoulderL: 0.4, name: 'mercy' }), { name: 'mercy' }],
    [8, P({ weapon: 'lowered', shoulderR: 2.4, elbowR: -0.1, shoulderL: 2.4, elbowL: -0.1, lean: -2, headTilt: -0.3, name: 'open-raised' }), P({ facing: -1, weapon: 'lowered', shoulderL: 2.4, elbowL: -0.1, shoulderR: 2.4, elbowR: -0.1, lean: 2, headTilt: 0.3, name: 'open-raised' }), { name: 'loosing', openHanded: true }],
    [17, P({ weapon: 'grounded', shoulderR: 0.2, rootShift: -30, name: 'walk-mark' }), P({ facing: -1, weapon: 'grounded', shoulderL: 0.2, rootShift: 30, name: 'walk-mark' }), { name: 'marks' }],
  ],
};

function lerp(a, b, t) {
  return a + (b - a) * t;
}

const NUM_KEYS = ['crouch', 'lean', 'headTilt', 'shoulderL', 'elbowL', 'shoulderR', 'elbowR', 'hipL', 'kneeL', 'hipR', 'kneeR', 'rootShift', 'lift'];

function interpPose(a, b, t) {
  const out = { ...a };
  for (const k of NUM_KEYS) {
    const av = Number.isFinite(a[k]) ? a[k] : 0;
    const bv = Number.isFinite(b[k]) ? b[k] : 0;
    out[k] = lerp(av, bv, t);
  }
  // Discrete fields switch at the midpoint: weapon, facing, name.
  out.weapon = t < 0.5 ? a.weapon : b.weapon;
  out.facing = t < 0.5 ? (a.facing || 1) : (b.facing || 1);
  out.name = t < 0.5 ? a.name : b.name;
  return out;
}

// Pure pose lookup: beat is a duel.json beat, local is seconds in-beat.
export function poseFor(beat, local) {
  const id = beat && beat.id;
  const frames = KEYFRAMES[id];
  if (!frames) throw new Error('no choreography for beat: ' + id);
  const q = frameTime(Math.min(Math.max(Number(local) || 0, 0), beat.dur - 1e-9));
  let i = 0;
  while (i < frames.length - 2 && q >= frames[i + 1][0]) i++;
  const k0 = frames[i];
  const k1 = frames[i + 1];
  const span = Math.max(1e-9, k1[0] - k0[0]);
  const t = Math.min(1, Math.max(0, (q - k0[0]) / span));
  const thor = interpPose(k0[1], k1[1], t);
  const zeusRaw = interpPose(k0[2], k1[2], t);
  const zeus = { ...zeusRaw, facing: -1 };
  // Thor keeps authored facing (b06 back-to-back turns him east); Zeus faces west.
  const extra = t < 0.5 ? (k0[3] || {}) : (k1[3] || {});
  const thorThrown = Boolean(extra.thorThrown);
  const zeusThrown = Boolean(extra.zeusThrown);
  const zeusDropped = Boolean(extra.zeusDropped);
  const openHanded = Boolean(extra.openHanded);
  return {
    beat: id,
    local: q,
    name: extra.name || k0[3].name,
    thor,
    zeus,
    thorThrown,
    zeusThrown,
    zeusDropped,
    openHanded,
    impact: extra.impact || null,
  };
}

export function poseName(beatId, local) {
  const frames = KEYFRAMES[beatId];
  if (!frames) return 'unknown';
  let name = frames[0][3].name;
  for (const [t, , , ex] of frames) {
    if (local >= t - 1e-9) name = ex.name;
  }
  return name;
}

// Impact at (beatId, local): exact-kind or null. Lattice-exact compare.
export function impactAt(beatId, local) {
  const q = frameTime(local);
  for (const m of IMPACTS[beatId] || []) {
    if (Math.abs(q - m.t) < 1e-9) return m.kind;
  }
  return null;
}

// Secondary motion: cloth and hair sway driven by the beat wind vector.
// Deterministic: sinusoidal on quantized t plus a seeded gust flick.
export function clothSway(seed, fighterId, t, wind) {
  const q = frameTime(t);
  const force = wind && Number.isFinite(wind.force) ? wind.force : 0.3;
  const dir = wind && Number.isFinite(wind.dir) ? wind.dir : 270;
  const toEast = Math.cos((dir * Math.PI) / 180);
  const rnd = substream(String(seed), 'cloth|' + fighterId, boilSlot(q));
  const flick = (rnd() - 0.5) * 4 * force;
  return {
    sway: Math.sin(q * 2.1 + (fighterId === 'zeus' ? 1.7 : 0)) * 8 * force + flick,
    lift: Math.sin(q * 1.3) * 3 * force,
    east: toEast,
  };
}

// Impact particles anchored to painted geography: the crossing point for
// spark/sky events, the ground line for dust, the crag crown for skyburst.
// Returns at most 24 particles; positions in stage px when anchors carry
// stage coordinates, else normalized 0-1. Deterministic per impact slot.
export const PARTICLE_BUDGET = 24;

export function impactParticles(seed, beatId, local, anchors = {}) {
  const kind = impactAt(beatId, local);
  if (!kind) return [];
  const slot = Math.round(frameTime(local) * 24);
  const rnd = substream(String(seed), 'particle|' + beatId, slot);
  const n = kind === 'skyburst-peak' ? 24 : kind === 'sky-crossing' ? 18 : kind === 'spark-spray' ? 14 : kind === 'body-blow' ? 10 : 6;
  const cx = Number.isFinite(anchors.crossX) ? anchors.crossX : 480;
  const cy = Number.isFinite(anchors.crossY) ? anchors.crossY : 300;
  const gx = Number.isFinite(anchors.ground) ? anchors.ground : 450;
  const out = [];
  for (let i = 0; i < Math.min(n, PARTICLE_BUDGET); i++) {
    const a = rnd() * Math.PI * 2;
    const sp = kind === 'skyburst-peak' ? 40 + rnd() * 120 : 20 + rnd() * 70;
    const life = 0.3 + rnd() * 0.5;
    const y0 = kind === 'body-blow' ? gx - 60 - rnd() * 60 : kind === 'withheld-touch' ? cy : cy - rnd() * 20;
    out.push({
      kind,
      x: cx + (rnd() - 0.5) * 24,
      y: y0,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - (kind === 'skyburst-peak' ? 60 : 20),
      life,
      size: 1.5 + rnd() * 2.5,
    });
  }
  return out;
}

// Step a particle list forward by dt seconds (paint path only; pure).
export function stepParticles(parts, dt) {
  return parts.map((p) => ({
    ...p,
    x: p.x + p.vx * dt,
    y: p.y + p.vy * dt,
    vy: p.vy + 160 * dt,
    life: p.life - dt,
  })).filter((p) => p.life > 0);
}
