// Hearthlight human character engine (Rebuild Phase 2).
//
// Model-sheet parameters live in film/story/characters.md; this module is
// their executable body form. Each lead is drawn from a proportion body:
// head-unit heights, FK two-segment limbs with knees and elbows, simple
// hands, and costume overlays that double as secondary-motion surfaces
// (cloak belly, shawl drift, sweater drape, topknot bounce).
//
// Heads and faces belong to faces.js; this module places the neck joint
// and delegates the head. Acting beats (weight, exertion, phase) come from
// acting.js via the caller. All drawing is a pure function of arguments:
// same pose renders identical marks. No Math.random, no wall clock.
import { inkStroke, inkFill } from './ink.js';
import { drawFace, PHONEMES } from './faces.js';
import { secondaryFor } from './acting.js';

// Shoulder half-width as a fraction of body height. The renderer and the
// turnaround probe share this constant so they cannot drift apart.
export const SHOULDER_X = 0.12;

// Committed model sheet. Heights in head units (hu); huPx derives per
// render from the ground height h (full body height in px).
export const HUMAN_MODELS = {
  nia: {
    hu: 4.5, skin: '#e8b98a', hair: '#2e2620', eye: '#b4762a',
    costume: 'cloak', cloak: '#a03a2a', patch: '#7c2c1e',
    hairStyle: 'tuft', prop: 'pole',
  },
  yara: {
    hu: 4.0, skin: '#d8b894', hair: '#cfcfcf', eye: '#8a8f96',
    costume: 'shawl', shawl: '#33406a', embroidery: '#8fa0cc',
    hairStyle: 'bun', prop: 'staff',
  },
  tam: {
    hu: 5.5, skin: '#d9a878', hair: '#2a2118', eye: '#4a2e18',
    costume: 'oilskin', vest: '#3a3630', sweater: '#b8a888',
    hairStyle: 'tieback', prop: 'oar',
  },
  lumi: {
    hu: 3.5, skin: '#eab98c', hair: '#6a3a22', eye: '#8a6a1a',
    costume: 'tunic', tunic: '#5a7048', leggings: '#a03a2a',
    binding: '#e8e2d4', hairStyle: 'knots', prop: 'stick',
  },
};

export function modelFor(name) {
  const m = HUMAN_MODELS[name];
  if (!m) throw new Error('no human model for ' + name);
  return m;
}

// Two-segment FK limb: upper from (x1,y1) at ang1 len l1, fore at ang2 len
// l2, joint dot, end point returned for hands/feet placement. Angles in
// radians from straight-down (positive swings forward).
//
// Limb anchor probe: when an array, fkLimb records its start point so the
// turnaround probe can measure the geometry the renderer actually draws
// instead of re-reading the constant.
let limbProbe = null;
export function fkLimb(ctx, x1, y1, l1, a1, l2, a2) {
  if (limbProbe) limbProbe.push({ x: x1, y: y1 });
  const jx = x1 + Math.sin(a1) * l1;
  const jy = y1 + Math.cos(a1) * l1;
  const ex = jx + Math.sin(a2) * l2;
  const ey = jy + Math.cos(a2) * l2;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(jx, jy);
  ctx.lineTo(ex, ey);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(jx, jy, Math.max(1, l1 * 0.07), 0, 7);
  ctx.fill();
  return { jx, jy, ex, ey };
}

// Simple hand: mitten disc plus two finger separations so grips read at
// 390 px without individual knuckles.
export function drawHand(ctx, x, y, r, skin, inkW, boil) {
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 7);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 7);
  inkStroke(ctx, '#2b2118', inkW * 0.7, boil, 0.3);
  ctx.lineWidth = Math.max(0.8, inkW * 0.55);
  ctx.strokeStyle = '#2b2118';
  ctx.beginPath();
  ctx.moveTo(x - r * 0.4, y + r * 0.2);
  ctx.lineTo(x - r * 0.4, y + r * 0.8);
  ctx.moveTo(x + r * 0.3, y + r * 0.2);
  ctx.lineTo(x + r * 0.3, y + r * 0.8);
  ctx.stroke();
}

// Walk-phase leg swing for a stride energy 0..1, opposed per side.
export function legSwing(side, walkT, stride) {
  return Math.sin(walkT * 5.2 + (side > 0 ? Math.PI : 0)) * 0.5 * stride;
}

// Ground-contact gait: each foot plants through a stance share of its
// cycle (fore travelling back under the body at constant speed, lift 0)
// then swings through (lifting over a sine hump back to the front).
// fore is in fractions of body height h (positive is forward), lift in
// fractions of h. Zero stride reads as a planted stand. Pure function of
// (side, walkT, stride): same instant, same feet, scrub-exact.
export const GAIT_STANCE = 0.6;
export const GAIT_FREQ = 5.2 / (Math.PI * 2);

export function footPlant(side, walkT, stride) {
  const s = Number(stride);
  const st = Number.isFinite(s) ? Math.max(0, s) : 0;
  const wt = Number.isFinite(walkT) ? walkT : 0;
  let u = (wt * GAIT_FREQ + (side > 0 ? 0.5 : 0)) % 1;
  if (u < 0) u += 1;
  if (st <= 0) return { fore: 0, lift: 0, planted: true };
  if (u < GAIT_STANCE) {
    const k = u / GAIT_STANCE;
    return { fore: (0.5 - k) * 0.5 * st, lift: 0, planted: true };
  }
  const k = (u - GAIT_STANCE) / (1 - GAIT_STANCE);
  return { fore: (-0.5 + k) * 0.5 * st, lift: Math.sin(k * Math.PI) * 0.12, planted: false };
}

// Gait shaping by exertion: the storm climb runs (faster cadence, higher
// step, harder torso rock) while the coda walks. Off-contract exertion
// (NaN, infinities) clamps to rest so garbage never sprints the cast.
export function gaitFor(exertion) {
  const e = Number(exertion);
  const ex = Number.isFinite(e) ? Math.min(1, Math.max(0, e)) : 0;
  return { cadence: 1 + ex * 0.35, lift: 1 + ex * 0.6, rock: ex };
}

// Full proportion body. (x, y) is the ground point; h is full height px.
// opts: { stride, lean, kneel, armRaise, stillness, windK, boil, faceBoil,
//   walkT, weight (-1..1 lateral shift), exertion, carry, oar, knot,
//   face: { emotion, phoneme, gaze, blink }, lantern: {x,y,flame} | null,
//   seedName }.
export function drawHuman(ctx, pal, name, x, y, h, opts) {
  const o = opts || {};
  const model = modelFor(name);
  const still = 1 - 0.75 * (o.stillness || 0);
  const stride = (o.stride || 0) * still;
  const walkT = o.walkT || 0;
  const windK = o.windK || 0;
  const boil = o.boil || { x: 0, y: 0 };
  const faceBoil = o.faceBoil || boil;
  const ink = (pal && pal.ink) || '#2b2118';
  const inkW = Math.max(1.2, h / 90);
  const weight = o.weight || 0;
  const exert = o.exertion || 0;
  const gait = gaitFor(exert);
  const wT = walkT * gait.cadence;
  const sec = o.secondary || secondaryFor(windK, walkT, exert);
  const kneelDrop = (o.kneel || 0) * h * 0.3;
  // Walk bob stays shallow so planted feet keep their ground contact.
  const bob = Math.abs(Math.sin(wT * 5.2)) * h * 0.02 * stride;
  const lean = ((o.lean || 0) + stride * 0.05 + exert * 0.06) * h;
  // Carry rock: a loaded carrier (Tam's back-carry, Nia's armful) rolls
  // the torso over the stride; the rock scales with exertion.
  const carryRock = (o.carry && o.carry !== 'none')
    ? Math.sin(wT * 5.2) * h * 0.02 * (0.3 + gait.rock) : 0;
  const sway = lean + weight * h * 0.06 + Math.sin(wT * 2.6) * h * 0.014 * still + carryRock;
  const huPx = h / model.hu;

  ctx.save();
  ctx.translate(x + boil.x + sway * 0.3, y + boil.y - bob - kneelDrop);

  const legL = h * 0.34;
  const torsoL = h * 0.34;
  const hipY = -legL;
  const shoY = hipY - torsoL;

  // Legs: ground-contact gait. The stance foot plants (lift 0, fore
  // travelling back under the body); the swing foot lifts over a hump.
  // The knee bends to absorb the plant offset so the stance foot stays on
  // the ground line instead of floating on cosine loss; a contact shadow
  // under each foot fades as the foot leaves the ground.
  ctx.strokeStyle = ink;
  ctx.lineWidth = inkW;
  ctx.fillStyle = ink;
  const legCol = name === 'lumi' ? model.leggings : name === 'tam' ? '#5a5248' : '#2c2118';
  for (const s of [-1, 1]) {
    const plant = footPlant(s, wT, stride);
    const lift = plant.lift * gait.lift;
    // Normalized step height (0 planted .. ~1.6 sprint apex): the thigh
    // swings forward while the knee folds, so the swing foot visibly
    // leaves the ground instead of shuffling through cosine flatness.
    const liftN = lift / 0.12;
    const fold = (o.kneel || 0) * 0.9;
    const bend = Math.abs(plant.fore) * 1.6;
    ctx.strokeStyle = legCol;
    ctx.lineWidth = inkW * 1.15;
    const foot = fkLimb(ctx, s * h * 0.07, hipY, legL * 0.52,
      plant.fore * 2.2 + fold * 0.5 - liftN * 0.25, legL * 0.5,
      plant.fore * 1.2 + fold * 1.1 + bend * 0.5 + liftN * 0.75);
    // boots or wrapped feet
    ctx.fillStyle = name === 'tam' ? '#c8b898' : '#2c2118';
    ctx.beginPath();
    ctx.ellipse(foot.ex, foot.ey - h * 0.015, h * 0.075, h * 0.045, 0, 0, 7);
    ctx.fill();
    const grip = plant.planted ? 1 : Math.max(0, 1 - lift * 6);
    ctx.globalAlpha = 0.22 * grip * (stride > 0 ? 1 : 0.4);
    ctx.fillStyle = '#101018';
    ctx.beginPath();
    ctx.ellipse(foot.ex, -h * 0.005, h * 0.07, h * 0.018, 0, 0, 7);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Torso per costume. The cloak belly rides the acting secondary cloth
  // driver (lagged against the shot wind) instead of raw wind so cloth
  // follows weather with weight; callers without a secondary fall back to
  // the wind-shaped driver built above.
  if (model.costume === 'cloak') {
    const belly = (sec.cloth * h * 0.18 + Math.sin(wT * 5.2 + 1) * h * 0.025 * stride) * still
      + (o.kneel || 0) * h * 0.1 + exert * h * 0.02;
    ctx.fillStyle = model.cloak;
    ctx.beginPath();
    ctx.moveTo(sway * 0.4, shoY - h * 0.02);
    ctx.quadraticCurveTo(-h * 0.3 - belly, shoY + torsoL * 0.55, -h * 0.27 - belly, 0);
    ctx.lineTo(h * 0.27, 0);
    ctx.quadraticCurveTo(h * 0.18, shoY + torsoL * 0.5, sway * 0.4, shoY - h * 0.02);
    ctx.closePath();
    inkFill(ctx, ink, inkW, boil);
    ctx.fillStyle = model.patch;
    ctx.fillRect(-h * 0.21 - belly * 0.4, shoY + torsoL * 0.42, h * 0.1, h * 0.1);
  } else if (model.costume === 'shawl') {
    ctx.fillStyle = model.shawl;
    ctx.beginPath();
    ctx.moveTo(-h * 0.26, 0);
    ctx.lineTo(h * 0.26, 0);
    ctx.lineTo(h * 0.1, shoY);
    ctx.quadraticCurveTo(0, shoY - h * 0.06, -h * 0.1, shoY - h * 0.02);
    ctx.closePath();
    inkFill(ctx, ink, inkW, boil);
    ctx.strokeStyle = model.embroidery;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(-h * 0.12, -h * 0.16, h * 0.045, 0, 7);
    ctx.stroke();
  } else if (model.costume === 'oilskin') {
    // darned sweater torso with rope-burn scoring on the left shoulder
    ctx.fillStyle = model.sweater;
    ctx.beginPath();
    ctx.moveTo(-h * 0.14, hipY);
    ctx.lineTo(h * 0.14, hipY);
    ctx.lineTo(h * 0.11, shoY);
    ctx.lineTo(-h * 0.11, shoY);
    ctx.closePath();
    inkFill(ctx, ink, inkW, boil);
    ctx.strokeStyle = model.sweater === '#b8a888' ? '#8a7a5a' : ink;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-h * 0.1, shoY + torsoL * 0.3);
    ctx.lineTo(h * 0.1, shoY + torsoL * 0.3);
    ctx.moveTo(-h * 0.1, shoY + torsoL * 0.55);
    ctx.lineTo(h * 0.1, shoY + torsoL * 0.55);
    ctx.stroke();
    // oilskin vest panels
    ctx.fillStyle = model.vest;
    for (const s of [-1, 1]) {
      ctx.fillRect(s > 0 ? h * 0.02 : -h * 0.13, shoY, h * 0.11, torsoL * 0.95);
    }
    ctx.strokeStyle = '#c8b898';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-h * 0.13, shoY + h * 0.03);
    ctx.lineTo(-h * 0.06, shoY + h * 0.09);
    ctx.moveTo(-h * 0.13, shoY + h * 0.06);
    ctx.lineTo(-h * 0.06, shoY + h * 0.12);
    ctx.stroke();
  } else {
    // lumi tunic over rust leggings
    ctx.fillStyle = model.tunic;
    ctx.beginPath();
    ctx.moveTo(-h * 0.13, hipY + h * 0.02);
    ctx.lineTo(h * 0.13, hipY + h * 0.02);
    ctx.lineTo(h * 0.1, shoY);
    ctx.lineTo(-h * 0.1, shoY);
    ctx.closePath();
    inkFill(ctx, ink, inkW, boil);
    // white ankle binding on the hurt ankle (reads at any size)
    ctx.fillStyle = model.binding;
    ctx.fillRect(h * 0.03, -h * 0.09, h * 0.07, h * 0.05);
    ctx.strokeStyle = ink;
    ctx.lineWidth = 1;
    ctx.strokeRect(h * 0.03, -h * 0.09, h * 0.07, h * 0.05);
  }

  // Arms: shoulder swing opposes stride; armRaise lifts the lead arm
  // (lantern, belay, carry). Exertion bends elbows. Yara's farewell knot
  // converges both hands toward the storm-ribbon as knot rises 0..1.
  ctx.strokeStyle = ink;
  ctx.fillStyle = ink;
  const raise = o.armRaise || 0;
  const carry = o.carry || 'none';
  const knot = name === 'yara' ? (o.knot || 0) : 0;
  const handPts = [];
  for (const s of [-1, 1]) {
    const lead = s < 0 ? raise : raise * 0.4;
    const swing = -legSwing(s, wT, stride) * 0.8;
    const a1 = swing * 0.6 - lead * 1.5 - exert * 0.15 - s * knot * 0.55;
    const a2 = swing * 0.5 - lead * 0.9 - exert * 0.5 - (carry !== 'none' && s < 0 ? 0.9 : 0) - s * knot * 0.4;
    ctx.lineWidth = inkW * 0.95;
    const hand = fkLimb(ctx, s * h * SHOULDER_X, shoY + h * 0.02, h * 0.17, a1, h * 0.15, a2);
    drawHand(ctx, hand.ex, hand.ey, huPx * 0.22, model.skin, inkW, boil);
    handPts.push(hand);
    // Keeper's lantern: rides in the lead hand from s06 on. The lamp hangs
    // below the hand by its bail arm; glow scales with the flame value so
    // the s14 gutter and s17 kindling read in the light itself.
    if (s < 0 && o.lantern) {
      const fl = Math.max(0.03, o.lantern.flame || 0);
      const lampX = hand.ex;
      const lampY = hand.ey + h * 0.09;
      ctx.strokeStyle = ink;
      ctx.lineWidth = inkW * 0.9;
      ctx.beginPath();
      ctx.moveTo(hand.ex, hand.ey);
      ctx.lineTo(lampX, lampY - h * 0.02);
      ctx.stroke();
      const flick = 0.85 + 0.15 * Math.sin(wT * 9 + h);
      const g = ctx.createRadialGradient(lampX, lampY, 0, lampX, lampY, 30 * fl + 8);
      g.addColorStop(0, (pal && pal.lantern) || '#ffb84d');
      g.addColorStop(1, 'rgba(255,180,77,0)');
      ctx.globalAlpha = 0.65 * flick * Math.min(1, fl + 0.25);
      ctx.fillStyle = g;
      ctx.fillRect(lampX - 40, lampY - 40, 80, 80);
      ctx.globalAlpha = 1;
      ctx.fillStyle = (pal && pal.lantern) || '#ffb84d';
      ctx.beginPath(); ctx.arc(lampX, lampY, 3.4 * Math.min(1.4, fl + 0.6), 0, 7); ctx.fill();
      ctx.strokeStyle = ink; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(lampX, lampY - 6); ctx.lineTo(lampX, lampY - 12); ctx.stroke();
    }
  }

  // Yara's farewell knot: a storm-ribbon strung between the converging
  // hands, pulled tighter as the knot beat peaks.
  if (name === 'yara' && knot > 0 && handPts.length === 2) {
    const spread = Math.abs(handPts[1].ex - handPts[0].ex) / 2;
    const lift = knot * h * 0.06;
    const lx = (handPts[0].ex + handPts[1].ex) / 2;
    const ly = (handPts[0].ey + handPts[1].ey) / 2 - lift * 0.4;
    ctx.strokeStyle = '#4a6a9a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(handPts[0].ex, handPts[0].ey - lift * 0.4);
    ctx.quadraticCurveTo(lx, ly + knot * h * 0.05 - spread * 0.2, handPts[1].ex, handPts[1].ey - lift * 0.4);
    ctx.stroke();
    ctx.strokeStyle = ink;
  }

  // Character prop silhouettes (390 px readability keys).
  ctx.strokeStyle = ink;
  if (model.prop === 'pole') {
    ctx.lineWidth = inkW;
    ctx.beginPath();
    ctx.moveTo(h * 0.4, 0);
    ctx.lineTo(h * 0.4, shoY - h * 0.42);
    ctx.stroke();
    ctx.strokeStyle = '#d8d2c0';
    ctx.lineWidth = Math.max(1, inkW * 0.7);
    for (let i = 0; i < 3; i++) {
      const ry = shoY - h * 0.3 - i * h * 0.1;
      ctx.beginPath();
      ctx.moveTo(h * 0.4, ry);
      ctx.quadraticCurveTo(h * 0.4 + windK * h * 0.45 * still, ry - h * 0.07, h * 0.4 + windK * h * 0.62 * still, ry);
      ctx.stroke();
    }
  } else if (model.prop === 'staff') {
    ctx.lineWidth = inkW;
    ctx.beginPath();
    ctx.moveTo(h * 0.42, 0);
    ctx.lineTo(h * 0.42, shoY - h * 0.32);
    ctx.stroke();
  } else if (model.prop === 'oar' && o.oar !== false) {
    // shoulder yoke: clears the head by half a head-unit in every pose
    const yokeY = shoY - huPx * 1.5;
    ctx.lineWidth = inkW * 1.1;
    ctx.beginPath();
    ctx.moveTo(-h * 0.42, yokeY);
    ctx.lineTo(h * 0.42, yokeY);
    ctx.stroke();
  } else if (model.prop === 'stick' && (o.carry === 'stick' || name === 'lumi')) {
    if (o.carry === 'stick') {
      ctx.lineWidth = inkW * 0.9;
      ctx.beginPath();
      ctx.moveTo(h * 0.3, 0);
      ctx.lineTo(h * 0.34, shoY - h * 0.2);
      ctx.stroke();
    }
  }

  // Head: neck joint at shoY, delegated to the face engine. The nod
  // carries the dialogue emphasis beat; the secondary shapes hair lag.
  const face = o.face || {};
  drawFace(ctx, {
    cx: sway * 0.4,
    cy: shoY - huPx * 0.62,
    r: huPx * 0.5,
    skin: model.skin,
    hair: model.hair,
    eye: model.eye,
    hairStyle: model.hairStyle,
    emotion: face.emotion || 'neutral',
    phoneme: face.phoneme || 'REST',
    gaze: face.gaze || { x: 0, y: 0 },
    blink: face.blink === undefined ? 1 : face.blink,
    nod: face.nod || 0,
    secondary: sec,
    boil: faceBoil,
    inkW,
    windK,
    still,
  });

  ctx.restore();
}

// Turnaround symmetry probe: renders a rest pose through a stub context,
// captures the shoulder anchors the renderer actually passes to fkLimb
// (legs first, then arms), and compares their magnitudes. A one-shoulder
// render regression shows up as a nonzero mismatch. Validates the name
// through modelFor so non-human names throw.
const PROBE_H = 120;
function stubCtx() {
  const grad = { addColorStop() {} };
  return new Proxy({}, {
    get(t, prop) {
      if (typeof prop !== 'string') return undefined;
      if (prop === 'createLinearGradient' || prop === 'createRadialGradient') return () => grad;
      return () => undefined;
    },
    set() { return true; },
  });
}
export function turnaroundSymmetry(name) {
  modelFor(name);
  limbProbe = [];
  try {
    drawHuman(stubCtx(), {}, name, 0, 0, PROBE_H, {
      boil: { x: 0, y: 0 }, faceBoil: { x: 0, y: 0 }, walkT: 0,
      face: { emotion: 'neutral', phoneme: 'REST', blink: 1 },
    });
  } finally {
    const pts = limbProbe;
    limbProbe = null;
    if (!pts || pts.length < 4) throw new Error('symmetry probe captured no arm anchors for ' + name);
    const armL = pts[pts.length - 2];
    const armR = pts[pts.length - 1];
    const left = Math.abs(armL.x) / PROBE_H;
    const right = Math.abs(armR.x) / PROBE_H;
    return { left, right, mismatch: Math.abs(left - right) };
  }
}

export { PHONEMES };
