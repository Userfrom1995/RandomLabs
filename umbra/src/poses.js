/**
 * Umbra pose solver: data-driven 2D skeletal rigs for silhouette fighters.
 * Pure math (no DOM), headless golden-tested against fixture hashes.
 *
 * Rig: 11 capsule segments (pelvis, torso, head, upper/lower arms x2,
 * upper/lower legs x2). Coordinates are arena units: x in [-1, 1] across the
 * stage, y in [0, 1] from ground line to top of frame.
 */

export const SEG_NAMES = [
  'pelvis',
  'torso',
  'head',
  'upperArmL',
  'lowerArmL',
  'upperArmR',
  'lowerArmR',
  'upperLegL',
  'lowerLegL',
  'upperLegR',
  'lowerLegR',
];

const TAU = Math.PI * 2;

/**
 * Idle-guard joint angles as a pure function of time and per-fighter phase.
 * M1 exposes the idle pose only; attack/hit/knockdown tracks arrive in M2/M4.
 * @param {number} timeSec presentation clock in seconds
 * @param {number} phase per-fighter phase offset in radians
 * @returns {Record<string, number>} joint angles in radians
 */
export function idleAngles(timeSec, phase) {
  const t = timeSec;
  return {
    bob: 0.006 * Math.sin(TAU * 1.1 * t + phase),
    sway: 0.012 * Math.sin(TAU * 0.55 * t + phase * 0.7),
    lean: 0.05 + 0.03 * Math.sin(TAU * 0.55 * t + phase),
    headTilt: 0.08 * Math.sin(TAU * 0.4 * t + phase * 1.3),
    shoulderF: -0.55 + 0.09 * Math.sin(TAU * 1.1 * t + phase),
    elbowF: -1.15 + 0.1 * Math.sin(TAU * 1.1 * t + phase + 0.6),
    shoulderB: 0.5 + 0.07 * Math.sin(TAU * 1.1 * t + phase + 1.1),
    elbowB: -0.7 + 0.08 * Math.sin(TAU * 1.1 * t + phase + 1.7),
    hipF: 0.22 + 0.03 * Math.sin(TAU * 0.55 * t + phase),
    kneeF: -0.28 + 0.03 * Math.sin(TAU * 1.1 * t + phase),
    hipB: -0.26 + 0.03 * Math.sin(TAU * 0.55 * t + phase + 0.9),
    kneeB: -0.34 + 0.03 * Math.sin(TAU * 1.1 * t + phase + 0.4),
  };
}

/**
 * Forward-kinematics: joint angles to 11 world-space capsule segments.
 * @param {Record<string, number>} a joint angles from idleAngles()
 * @param {{x?: number, groundY?: number, facing?: 1 | -1}} opts root placement
 * @returns {Array<{ax:number, ay:number, bx:number, by:number, w:number, name:string}>}
 */
export function solveRig(a, opts = {}) {
  const x = opts.x ?? 0;
  const groundY = opts.groundY ?? 0.14;
  const f = opts.facing === -1 ? -1 : 1;
  const segs = [];
  const push = (name, ax, ay, bx, by, w) => segs.push({ ax, ay, bx, by, w, name });

  const hipY = groundY + 0.3 + a.bob;
  const sway = a.sway * f;

  // Pelvis: horizontal capsule at the hips.
  push('pelvis', x - 0.045, hipY, x + 0.045, hipY, 0.062);

  // Torso: pelvis to shoulders with forward lean toward the foe.
  const shX = x + sway * 0.5 + f * a.lean * 0.12;
  const shY = hipY + 0.22;
  push('torso', x + sway * 0.3, hipY + 0.01, shX, shY, 0.078);

  // Head: capsule above the shoulders with a slight tilt.
  const hx = shX + f * a.headTilt * 0.1;
  push('head', shX, shY + 0.005, hx, shY + 0.1, 0.088);

  // Arms: shoulder origin, front arm raised in guard, back arm low.
  const arm = (prefix, shoulderAng, elbowAng, upper, fore, w) => {
    const ex = shX + f * Math.sin(shoulderAng) * upper;
    const ey = shY - Math.cos(shoulderAng) * upper + a.bob * 0.5;
    const hx2 = ex + f * Math.sin(shoulderAng + elbowAng) * fore;
    const hy2 = ey - Math.cos(shoulderAng + elbowAng) * fore;
    push(prefix === 'F' ? 'upperArmL' : 'upperArmR', shX, shY - 0.01, ex, ey, w);
    push(
      prefix === 'F' ? 'lowerArmL' : 'lowerArmR',
      ex,
      ey,
      hx2,
      hy2,
      w * 0.82,
    );
  };
  // Facing side is the lead (front) arm.
  if (f === 1) {
    arm('F', a.shoulderF, a.elbowF, 0.13, 0.12, 0.042);
    arm('B', a.shoulderB, a.elbowB, 0.13, 0.12, 0.042);
  } else {
    arm('B', a.shoulderF, a.elbowF, 0.13, 0.12, 0.042);
    arm('F', a.shoulderB, a.elbowB, 0.13, 0.12, 0.042);
  }

  // Legs: hips to feet, front leg forward, back leg trailing.
  const leg = (prefix, hipAng, kneeAng, w) => {
    const kx = x + sway * 0.2 + f * Math.sin(hipAng) * 0.15;
    const ky = hipY - Math.cos(hipAng) * 0.15;
    const fx2 = kx + f * Math.sin(hipAng + kneeAng) * 0.15;
    const fy2 = Math.max(groundY + 0.004, ky - Math.cos(hipAng + kneeAng) * 0.15);
    push(prefix === 'F' ? 'upperLegL' : 'upperLegR', x + sway * 0.2, hipY - 0.01, kx, ky, w);
    push(prefix === 'F' ? 'lowerLegL' : 'lowerLegR', kx, ky, fx2, fy2, w * 0.85);
  };
  if (f === 1) {
    leg('F', a.hipF, a.kneeF, 0.052);
    leg('B', a.hipB, a.kneeB, 0.052);
  } else {
    leg('B', a.hipF, a.kneeF, 0.052);
    leg('F', a.hipB, a.kneeB, 0.052);
  }

  return segs;
}

/**
 * Deterministic FNV-1a hash of a solved rig (quantized to 1e-4).
 * Used for golden pose tests.
 * @param {Array<{ax:number, ay:number, bx:number, by:number, w:number}>} segs
 * @returns {string} 8-char hex hash
 */
export function hashRig(segs) {
  let h = 0x811c9dc5;
  const mix = (n) => {
    h ^= Math.round(n * 10000) & 0xffffffff;
    h = Math.imul(h, 0x01000193);
  };
  for (const s of segs) {
    mix(s.ax);
    mix(s.ay);
    mix(s.bx);
    mix(s.by);
    mix(s.w);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}
