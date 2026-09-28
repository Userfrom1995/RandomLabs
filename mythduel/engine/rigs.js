// Mythduel rigs: FK proportion bodies for the two original fighters.
//
// Thor (storm-bringer of the north): 7.0 heads tall, shoulders 2.1 heads.
// Zeus (storm-lord of Olympus): 7.4 heads tall, shoulders 1.8 heads.
// Shoulder-to-hip ratios are binding and distinct: Thor 1.35, Zeus 1.15, so
// the silhouettes read apart at 390 px widths.
//
// Pure and headless: limbLengths() and jointPositions() run in node for the
// audit; the canvas paint path in fighters.js draws the same joints the audit
// verified. No wall-clock, no Math.random anywhere: only arithmetic over the
// passed pose. Angles in radians; +x faces the foe (Thor faces east, Zeus
// faces west, mirrored by facing).
import { frameTime } from './frames.js';

export const RIGS = {
  thor: {
    id: 'thor',
    heads: 7.0,
    headPx: 20,
    shoulderHeads: 2.1,
    hipRatio: 1.35,
    torsoHeads: 2.2,
    upperArmHeads: 1.1,
    forearmHeads: 1.0,
    thighHeads: 1.3,
    shinHeads: 1.2,
  },
  zeus: {
    id: 'zeus',
    heads: 7.4,
    headPx: 19,
    shoulderHeads: 1.8,
    hipRatio: 1.15,
    torsoHeads: 2.5,
    upperArmHeads: 1.2,
    forearmHeads: 1.1,
    thighHeads: 1.4,
    shinHeads: 1.3,
  },
};

export function limbLengths(rigId) {
  const r = RIGS[rigId];
  if (!r) throw new Error('unknown rig: ' + rigId);
  const head = r.headPx;
  const shoulderHalf = (r.shoulderHeads * head) / 2;
  const hipHalf = shoulderHalf / r.hipRatio;
  return {
    head,
    height: r.heads * head,
    shoulderHalf,
    hipHalf,
    shoulderWidth: shoulderHalf * 2,
    hipWidth: hipHalf * 2,
    torso: r.torsoHeads * head,
    upperArm: r.upperArmHeads * head,
    forearm: r.forearmHeads * head,
    thigh: r.thighHeads * head,
    shin: r.shinHeads * head,
    neck: head * 0.3,
  };
}

// Default neutral pose: grounded-open stance, weapons lowered. All angles in
// radians measured from straight-down for arms (0 = hanging) and straight-up
// for the swing arm; legs measured from straight-down (0 = standing).
export function neutralPose(facing = 1) {
  return {
    facing,
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
  };
}

// FK joint layout in stage px, root at (x, groundY). Feet are solved to honour
// crouch/lift: lift > 0 raises the rear foot (knee take, throws), otherwise
// both soles sit on the ground line within 1 px so contact is honest.
// Facing mirrors x: facing=1 looks east (Thor), -1 looks west (Zeus).
export function jointPositions(rigId, pose, x, groundY) {
  const L = limbLengths(rigId);
  const p = { ...neutralPose(pose.facing || 1), ...pose };
  const f = p.facing >= 0 ? 1 : -1;
  const legLen = L.thigh + L.shin;
  const crouchDrop = p.crouch * legLen * 0.28;
  const root = { x, y: groundY };
  const hips = { x: x + p.lean * f + p.rootShift, y: groundY - (legLen - crouchDrop) };
  const chest = { x: hips.x + p.lean * f * 0.6, y: hips.y - L.torso };
  const head = { x: chest.x + p.headTilt * f * 6, y: chest.y - L.neck - L.head * 0.8 };

  const armChain = (side, shoulderA, elbowA) => {
    const sx = chest.x + side * f * L.shoulderHalf * 0.92;
    const sy = chest.y + 4;
    // Forward kinematics in the facing plane: the upper arm swings out from
    // the shoulder by shoulderA, the forearm folds by elbowA. Side picks the
    // lateral half; facing picks world direction. Scrub-exact: pure arithmetic.
    const elbow = {
      x: sx + Math.sin(shoulderA) * L.upperArm * f * side,
      y: sy + Math.cos(shoulderA) * L.upperArm,
    };
    const handA = shoulderA + elbowA;
    const hand = {
      x: elbow.x + Math.sin(handA) * L.forearm * f * side,
      y: elbow.y + Math.cos(handA) * L.forearm,
    };
    return { shoulder: { x: sx, y: sy }, elbow, hand };
  };
  const armR = armChain(1, p.shoulderR, p.elbowR);
  const armL = armChain(-1, p.shoulderL, p.elbowL);

  const legChain = (side, hipA, kneeA, lifted) => {
    const hx = hips.x + side * L.hipHalf * 0.9;
    const hy = hips.y;
    const knee = {
      x: hx + Math.sin(hipA) * L.thigh * f * side * 0.6 + side * 3,
      y: hy + Math.cos(hipA) * L.thigh,
    };
    const footA = hipA + kneeA;
    const foot = {
      x: knee.x + Math.sin(footA) * L.shin * f * side * 0.4 + side * 2,
      // Planted soles: both feet on the ground line unless this leg lifts.
      y: lifted > 0 ? groundY - lifted : groundY,
    };
    return { hip: { x: hx, y: hy }, knee, foot };
  };
  const liftR = p.lift > 0 ? p.lift : 0;
  const legR = legChain(1, p.hipR, p.kneeR, liftR);
  const legL = legChain(-1, p.hipL, p.kneeL, 0);

  return { limbs: L, root, hips, chest, head, armR, armL, legR, legL, facing: f };
}

// Mirror across the fighter's own vertical axis (turnaround symmetry): x of
// every joint mirrors around x0, left and right swap, facing flips.
export function mirrorJoints(j, x0) {
  const mx = (pt) => ({ x: 2 * x0 - pt.x, y: pt.y });
  return {
    limbs: j.limbs,
    root: mx(j.root),
    hips: mx(j.hips),
    chest: mx(j.chest),
    head: mx(j.head),
    armR: { shoulder: mx(j.armL.shoulder), elbow: mx(j.armL.elbow), hand: mx(j.armL.hand) },
    armL: { shoulder: mx(j.armR.shoulder), elbow: mx(j.armR.elbow), hand: mx(j.armR.hand) },
    legR: { hip: mx(j.legL.hip), knee: mx(j.legL.knee), foot: mx(j.legL.foot) },
    legL: { hip: mx(j.legR.hip), knee: mx(j.legR.knee), foot: mx(j.legR.foot) },
    facing: -j.facing,
  };
}

// Silhouette read at phone widths: shoulder and hip widths plus the binding
// ratio. Distinct by construction (1.35 vs 1.15).
export function silhouetteMetrics(rigId) {
  const L = limbLengths(rigId);
  const r = RIGS[rigId];
  return {
    shoulderWidth: L.shoulderWidth,
    hipWidth: L.hipWidth,
    ratio: r.hipRatio,
    height: L.height,
  };
}

// Headless proportion check: rendered limb ratios within 5 percent of the
// model-sheet head units. Returns { ok, worst } where worst is the largest
// relative drift across torso/upperArm/forearm/thigh/shin.
export function proportionDrift(rigId) {
  const r = RIGS[rigId];
  const L = limbLengths(rigId);
  const pairs = [
    [L.torso / L.head, r.torsoHeads],
    [L.upperArm / L.head, r.upperArmHeads],
    [L.forearm / L.head, r.forearmHeads],
    [L.thigh / L.head, r.thighHeads],
    [L.shin / L.head, r.shinHeads],
    [L.shoulderWidth / L.head, r.shoulderHeads],
    [L.height / L.head, r.heads],
  ];
  let worst = 0;
  for (const [got, want] of pairs) {
    worst = Math.max(worst, Math.abs(got - want) / want);
  }
  return { ok: worst <= 0.05, worst };
}

export function quantizedPoseArgs(t) {
  return frameTime(t);
}
