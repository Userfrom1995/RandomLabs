// Mythduel faces: gaze, blink, brows, and effort mouths.
//
// Every face is a pure function of (seed, fighterId, quantized t, effort):
// blink slots come from a seeded substream, gaze tracks the foe, brows pitch
// with effort, mouths open on impact exhales. Scrub-exact by construction:
// equal t paints equal pixels. No wall-clock, no Math.random anywhere.
import { substream } from './rng.js';
import { boilSlot } from './ink.js';
import { frameTime } from './frames.js';

export const FACE = {
  blinkRate: 0.06,
  gazeRange: 3.2,
  browBase: 0.12,
  browSlope: 0.5,
};

// Deterministic face state. effort in [0,1]: 0 calm verse-speaking, 1 full
// impact exhale. gazeDir +1 looks east (Thor at the foe), -1 west (Zeus).
export function faceState(seed, fighterId, t, effort, gazeDir = 1) {
  const q = frameTime(t);
  const slot = boilSlot(q);
  const rnd = substream(String(seed), 'face|' + fighterId, slot);
  const blinkRoll = rnd();
  const gazeJitter = (rnd() - 0.5) * 1.2;
  const e = Math.min(Math.max(Number(effort) || 0, 0), 1);
  return {
    t: q,
    slot,
    blink: blinkRoll < FACE.blinkRate,
    gaze: { x: gazeDir * FACE.gazeRange + gazeJitter, y: (rnd() - 0.5) * 1.4 },
    brow: FACE.browBase + e * FACE.browSlope,
    mouthOpen: Math.min(1, e * 1.2),
    effort: e,
  };
}

export function effortForBeat(beat, local) {
  if (!beat) return 0.2;
  const id = beat.id;
  const at = (marks) => {
    let e = 0.15;
    for (const [mt, me, decay] of marks) {
      const dt = local - mt;
      if (dt >= 0) e = Math.max(e, me * Math.exp(-dt / decay));
    }
    return Math.min(1, e + 0.12);
  };
  switch (id) {
    case 'b01': return 0.12;
    case 'b02': return 0.2 + 0.1 * Math.min(1, local / 10);
    case 'b03': return at([[6.0, 1.0, 1.6], [6.5, 0.95, 1.8]]);
    case 'b04': return at([[3.0, 0.8, 2.0], [5.0, 0.8, 2.0], [9.0, 0.9, 1.6], [14.0, 0.7, 2.0]]);
    case 'b05': return at([[6.0, 1.0, 1.4], [11.0, 1.0, 1.4], [15.0, 0.85, 2.2]]);
    case 'b06': return 0.75;
    case 'b07': return local >= 15 && local < 20 ? 0.55 : at([[10.0, 0.7, 2.5], [16.0, 0.6, 3.0]]);
    case 'b08': return 0.25;
    default: return 0.2;
  }
}

// Paint a head-face at (x, y) with head radius r. face is a faceState();
// pal carries { skin, hair, ink }. boil is a small {x,y} ink offset so the
// linework trembles with the 12 fps boil. Beard blocks read Thor; close crop
// reads Zeus (bearded flag selects).
export function paintFace(ctx, x, y, r, face, pal, boil, bearded) {
  const bx = (boil && boil.x) || 0;
  const by = (boil && boil.y) || 0;
  ctx.save();
  ctx.translate(x + bx, y + by);
  ctx.lineWidth = Math.max(1.4, r * 0.12);
  ctx.strokeStyle = pal.ink;
  // Eyes: gaze dots; blink draws lids instead.
  const eo = r * 0.38;
  const ey = -r * 0.05;
  if (face.blink) {
    ctx.beginPath();
    ctx.moveTo(-eo - r * 0.22, ey);
    ctx.lineTo(-eo + r * 0.22, ey);
    ctx.moveTo(eo - r * 0.22, ey);
    ctx.lineTo(eo + r * 0.22, ey);
    ctx.stroke();
  } else {
    ctx.fillStyle = '#10141d';
    ctx.beginPath();
    ctx.arc(-eo + face.gaze.x * 0.4, ey + face.gaze.y * 0.4, r * 0.11, 0, Math.PI * 2);
    ctx.arc(eo + face.gaze.x * 0.4, ey + face.gaze.y * 0.4, r * 0.11, 0, Math.PI * 2);
    ctx.fill();
  }
  // Brows: effort-pitched bars.
  const tilt = face.brow * r * 0.5;
  ctx.beginPath();
  ctx.moveTo(-eo - r * 0.3, ey - r * 0.42 - tilt * 0.4);
  ctx.lineTo(-eo + r * 0.3, ey - r * 0.42 + tilt * 0.4);
  ctx.moveTo(eo - r * 0.3, ey - r * 0.42 + tilt * 0.4);
  ctx.lineTo(eo + r * 0.3, ey - r * 0.42 - tilt * 0.4);
  ctx.stroke();
  // Mouth: effort grimace opens with exertion.
  const mo = face.mouthOpen * r * 0.5;
  ctx.beginPath();
  if (mo < 1.2) {
    ctx.moveTo(-r * 0.3, r * 0.52);
    ctx.lineTo(r * 0.3, r * 0.52);
  } else {
    ctx.ellipse(0, r * 0.55, r * 0.28, mo * 0.55, 0, 0, Math.PI * 2);
  }
  ctx.stroke();
  if (bearded) {
    ctx.fillStyle = pal.hair;
    ctx.fillRect(-r * 0.75, r * 0.35, r * 1.5, r * 0.95);
    ctx.strokeRect(-r * 0.75, r * 0.35, r * 1.5, r * 0.95);
  }
  ctx.restore();
}
