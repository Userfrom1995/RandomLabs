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
 * @param {{x?: number, groundY?: number, facing?: 1 | -1, rig?: {height?: number, bulk?: number, head?: number, limb?: number}}} opts root placement + silhouette proportions
 * @returns {Array<{ax:number, ay:number, bx:number, by:number, w:number, name:string}>}
 */
export function solveRig(a, opts = {}) {
  const x = opts.x ?? 0;
  const groundY = opts.groundY ?? 0.14;
  const f = opts.facing === -1 ? -1 : 1;
  // Silhouette proportions (M3 roster identity). The identity rig is the
  // exact M1/M2 path: every multiplier is 1, so golden hashes hold.
  const rig = opts.rig && typeof opts.rig === 'object' ? opts.rig : {};
  const H = Number.isFinite(rig.height) ? rig.height : 1;
  const B = Number.isFinite(rig.bulk) ? rig.bulk : 1;
  const HD = Number.isFinite(rig.head) ? rig.head : 1;
  const LM = Number.isFinite(rig.limb) ? rig.limb : 1;
  const segs = [];
  const push = (name, ax, ay, bx, by, w) => segs.push({ ax, ay, bx, by, w, name });

  const hipY = groundY + 0.3 * H + a.bob;
  const sway = a.sway * f;

  // Pelvis: horizontal capsule at the hips.
  push('pelvis', x - 0.045 * B, hipY, x + 0.045 * B, hipY, 0.062 * B);

  // Torso: pelvis to shoulders with forward lean toward the foe.
  const shX = x + sway * 0.5 + f * a.lean * 0.12;
  const shY = hipY + 0.22 * H;
  push('torso', x + sway * 0.3, hipY + 0.01, shX, shY, 0.078 * B);

  // Head: capsule above the shoulders with a slight tilt.
  const hx = shX + f * a.headTilt * 0.1;
  push('head', shX, shY + 0.005, hx, shY + 0.1 * H, 0.088 * HD);

  // Arms: shoulder origin, front arm raised in guard, back arm low.
  const arm = (prefix, shoulderAng, elbowAng, upper, fore, w) => {
    const ex = shX + f * Math.sin(shoulderAng) * upper * LM;
    const ey = shY - Math.cos(shoulderAng) * upper * LM + a.bob * 0.5;
    const hx2 = ex + f * Math.sin(shoulderAng + elbowAng) * fore * LM;
    const hy2 = ey - Math.cos(shoulderAng + elbowAng) * fore * LM;
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
    arm('F', a.shoulderF, a.elbowF, 0.13, 0.12, 0.042 * B);
    arm('B', a.shoulderB, a.elbowB, 0.13, 0.12, 0.042 * B);
  } else {
    arm('B', a.shoulderF, a.elbowF, 0.13, 0.12, 0.042 * B);
    arm('F', a.shoulderB, a.elbowB, 0.13, 0.12, 0.042 * B);
  }

  // Legs: hips to feet, front leg forward, back leg trailing.
  const leg = (prefix, hipAng, kneeAng, w) => {
    const kx = x + sway * 0.2 + f * Math.sin(hipAng) * 0.15 * LM;
    const ky = hipY - Math.cos(hipAng) * 0.15 * LM;
    const fx2 = kx + f * Math.sin(hipAng + kneeAng) * 0.15 * LM;
    const fy2 = Math.max(groundY + 0.004, ky - Math.cos(hipAng + kneeAng) * 0.15);
    push(prefix === 'F' ? 'upperLegL' : 'upperLegR', x + sway * 0.2, hipY - 0.01, kx, ky, w);
    push(prefix === 'F' ? 'lowerLegL' : 'lowerLegR', kx, ky, fx2, fy2, w * 0.85);
  };
  if (f === 1) {
    leg('F', a.hipF, a.kneeF, 0.052 * B);
    leg('B', a.hipB, a.kneeB, 0.052 * B);
  } else {
    leg('B', a.hipF, a.kneeF, 0.052 * B);
    leg('F', a.hipB, a.kneeB, 0.052 * B);
  }

  return segs;
}

/**
 * M2 combat pose tracks: per-state overlays on the idle guard base.
 * All pure functions of (state, moveId, progress, timeSec, phase).
 * progress is 0..1 through the current move or state animation.
 */

/**
 * Strike pose for one attack move at progress p (0 windup, 0.5 contact,
 * 1.0 recover). Returns joint-angle deltas added to the idle base.
 * @param {string|null} moveId move id from the FISTS table (jab/cross/kick/sweep/uppercut)
 * @param {number} p progress 0..1
 * @returns {Record<string, number>} angle deltas in radians
 */
export function attackDeltas(moveId, p) {
  const c = Math.max(0, Math.min(1, Number.isFinite(p) ? p : 0));
  // Strike envelope: rises fast to contact, eases back to guard.
  const strike = c < 0.45 ? c / 0.45 : 1 - (c - 0.45) / 0.55;
  const s = Math.max(0, Math.min(1, strike));
  switch (moveId) {
    case 'jab':
      return { lean: 0.16 * s, shoulderF: -0.9 * s, elbowF: 0.55 * s, sway: 0.02 * s };
    case 'cross':
      return { lean: 0.24 * s, sway: 0.05 * s, shoulderF: -1.0 * s, elbowF: 0.7 * s, shoulderB: -0.3 * s };
    case 'kick':
      return { lean: -0.1 * s, hipF: 1.15 * s, kneeF: 0.9 * s, shoulderB: 0.4 * s, sway: -0.03 * s };
    case 'sweep':
      return { lean: 0.1 * s, bob: -0.09 * s, hipF: 0.95 * s, kneeF: 0.5 * s, hipB: -0.2 * s };
    case 'uppercut':
      return { lean: -0.14 * s, shoulderF: -1.2 * s, elbowF: 0.9 * s, bob: 0.03 * s };
    default:
      return { lean: 0.16 * s, shoulderF: -0.9 * s, elbowF: 0.55 * s };
  }
}

/**
 * Guard/hit/crumple overlays (deltas on the idle base).
 * @param {string} state fighter state
 * @param {number} p progress 0..1 for timed states (hit recoil, knockdown fall)
 * @returns {Record<string, number>} angle deltas in radians
 */
export function stateDeltas(state, p) {
  const c = Math.max(0, Math.min(1, Number.isFinite(p) ? p : 0));
  switch (state) {
    case 'block':
    case 'parry':
      return { shoulderF: -0.35, elbowF: -0.5, shoulderB: 0.35, elbowB: -0.55, lean: 0.1, bob: -0.01 };
    case 'crouch':
      return { bob: -0.1, hipF: 0.5, kneeF: -0.6, hipB: -0.1, kneeB: -0.5, lean: 0.12 };
    case 'hit':
    case 'stun': {
      const r = c < 0.4 ? c / 0.4 : 1 - (c - 0.4) / 0.6;
      return { lean: -0.3 * r, headTilt: -0.25 * r, shoulderF: 0.4 * r, sway: -0.04 * r };
    }
    case 'knockdown':
    case 'down': {
      const f = Math.min(1, c * 1.4);
      return {
        bob: -0.2 * f, lean: -0.55 * f, headTilt: -0.4 * f,
        hipF: 0.9 * f, kneeF: -0.9 * f, hipB: 0.7 * f, kneeB: -0.8 * f,
        shoulderF: 0.8 * f, elbowF: -0.3 * f, shoulderB: 0.9 * f, elbowB: -0.2 * f,
      };
    }
    case 'ko':
      return {
        bob: -0.22, lean: -0.6, headTilt: -0.45,
        hipF: 0.95, kneeF: -0.95, hipB: 0.75, kneeB: -0.85,
        shoulderF: 0.85, elbowF: -0.3, shoulderB: 0.95, elbowB: -0.2,
      };
    case 'walk': {
      const w = Math.sin(c * Math.PI * 2);
      return { hipF: 0.3 * w, kneeF: -0.2 * Math.max(0, w), hipB: -0.3 * w, kneeB: -0.2 * Math.max(0, -w), bob: 0.008 * Math.abs(w) };
    }
    case 'jump':
      return { hipF: 0.7, kneeF: -1.0, hipB: 0.4, kneeB: -0.8, shoulderF: -0.9, shoulderB: 0.7 };
    default:
      return {};
  }
}

/**
 * Full joint angles for a sim fighter: idle base plus the state overlay.
 * M1 callers (idleAngles + solveRig) are untouched; golden hashes hold.
 * @param {{state?: string, moveId?: string|null, moveTick?: number, stateTick?: number}} f sim fighter (or minimal {state})
 * @param {number} timeSec presentation clock in seconds
 * @param {number} phase per-fighter phase offset in radians
 * @param {(id: string|null) => number} [moveLen] total ticks of a move (defaults to 14)
 * @returns {Record<string, number>} joint angles in radians
 */
export function combatAngles(f, timeSec, phase, moveLen) {
  const base = idleAngles(timeSec, phase);
  const out = { ...base };
  const state = (f && f.state) || 'idle';
  const lenOf = typeof moveLen === 'function' ? moveLen : () => 14;
  let delta = {};
  if (state === 'attack') {
    const total = Math.max(1, lenOf(f.moveId) || 14);
    delta = attackDeltas(f.moveId, (f.moveTick || 0) / total);
  } else if (state === 'walk') {
    delta = stateDeltas('walk', ((f.stateTick || 0) % 24) / 24);
  } else if (state === 'hit' || state === 'stun') {
    delta = stateDeltas(state, Math.min(1, (f.stateTick || 0) / 18));
  } else if (state === 'knockdown' || state === 'down') {
    delta = stateDeltas(state, Math.min(1, (f.stateTick || 0) / 20));
  } else {
    delta = stateDeltas(state, 0);
  }
  for (const [k, v] of Object.entries(delta)) {
    out[k] = (out[k] || 0) + v;
  }
  return out;
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
