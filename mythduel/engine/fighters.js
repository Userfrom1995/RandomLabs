// Mythduel fighters: FK rig paint plus headless craft helpers.
//
// paintFighterRig() draws one fighter from the shared FK joints (rigs.js),
// the choreography pose (acting.js), and the face state (faces.js): proportion
// bodies, gripping hands, gaze/blink/brows/effort mouths, exertion tremor
// scaled by fatigue, wound marks carried from b05, cloth/hair secondary motion
// from the beat wind vector. Feet plant on the arena ground line; lifts (knee
// take, throws) raise exactly one foot by the authored amount.
//
// Scrub-exact: every input is quantized through frameTime() first; every
// jitter comes from seeded substreams keyed on the boil slot. The headless
// helpers (fighterPoseAt, contactAt, silhouetteAt) run in node so the audit
// pins contact honesty, proportions, and silhouette reads without a canvas.
import { frameTime } from './frames.js';
import { boilOffset, boilSlot } from './ink.js';
import { substream } from './rng.js';
import { jointPositions, silhouetteMetrics } from './rigs.js';
import { poseFor, clothSway, impactParticles } from './acting.js';
import { faceState, effortForBeat, paintFace } from './faces.js';

export const FIGHTER_COLORS = {
  thor: { torso: '#a03c2e', cloak: '#3d4c63', legs: '#2a2f38', skin: '#e4d7bd', hair: '#8a5a3c', weaponHead: '#4a4f59', ink: '#141821' },
  zeus: { torso: '#ece7da', cloak: '#2e5f8a', legs: '#565b66', skin: '#dfc9a8', hair: '#cfd2d6', weaponHead: '#b98d3e', ink: '#141821' },
};

export const STAGE_W = 960;

// Wounded from b05 on: order index in the 8-beat spine.
const WOUND_FROM = 4;

export function beatIndex(beatId) {
  return ['b01', 'b02', 'b03', 'b04', 'b05', 'b06', 'b07', 'b08'].indexOf(beatId);
}

export function isWounded(beatId) {
  return beatIndex(beatId) >= WOUND_FROM;
}

// Headless pose lookup shared by paint and audit.
export function fighterPoseAt(beat, local) {
  return poseFor(beat, local);
}

// Contact honesty: sole heights relative to the ground line. Planted feet
// read 0; a lifted foot reads its authored lift. Returns { left, right }.
export function contactAt(fighterId, pose, groundY) {
  const facing = fighterId === 'thor' ? 1 : -1;
  const full = { ...pose, facing: pose.facing || facing };
  const j = jointPositions(fighterId, full, 480, groundY);
  return { left: j.legL.foot.y - groundY, right: j.legR.foot.y - groundY };
}

export function silhouetteAt(fighterId) {
  return silhouetteMetrics(fighterId);
}

// Exertion tremor in px, scaled by fatigue 0-7. Deterministic per boil slot.
export function tremorAmp(fatigue) {
  const f = Math.min(Math.max(Number(fatigue) || 0, 0), 7);
  return (f / 7) * 1.4;
}

function limb(ctx, a, b, w, color, ink, boilA, boilB) {
  ctx.strokeStyle = ink;
  ctx.lineWidth = w + 2.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(a.x + boilA.x, a.y + boilA.y);
  ctx.lineTo(b.x + boilB.x, b.y + boilB.y);
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.beginPath();
  ctx.moveTo(a.x + boilA.x, a.y + boilA.y);
  ctx.lineTo(b.x + boilB.x, b.y + boilB.y);
  ctx.stroke();
}

function weaponInHand(ctx, seed, tQ, hand, fighterId, grip, openHanded, boil) {
  const pal = FIGHTER_COLORS[fighterId];
  const hammer = fighterId === 'thor';
  if (grip === 'thrown' || grip === 'dropped' || openHanded) return;
  const len = hammer ? 64 : 60;
  const ang = hammer ? -0.5 : -0.35;
  const dx = Math.sin(ang) * len;
  const dy = -Math.cos(ang) * len;
  let x0 = hand.x;
  let y0 = hand.y + 6;
  if (grip === 'grounded') {
    // Butt rests on the ground: haft planted beside the fighter.
    x0 = hand.x + (hammer ? 18 : -18);
    y0 = hand.y + 40;
    ctx.save();
    ctx.strokeStyle = '#3a2c1c';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x0 + boil.x, y0 + boil.y);
    ctx.lineTo(x0 + boil.x + dx * 0.3, y0 + boil.y - len * 1.1);
    ctx.stroke();
    drawWeaponHead(ctx, x0 + boil.x + dx * 0.3, y0 + boil.y - len * 1.1, fighterId, pal);
    ctx.restore();
    return;
  }
  ctx.save();
  ctx.strokeStyle = '#3a2c1c';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x0 + boil.x, y0 + boil.y + 20);
  ctx.lineTo(x0 + boil.x + dx, y0 + boil.y + 20 + dy);
  ctx.stroke();
  drawWeaponHead(ctx, x0 + boil.x + dx, y0 + boil.y + 20 + dy, fighterId, pal);
  // Gripping hand: skin mitt over the haft.
  ctx.fillStyle = pal.skin;
  ctx.strokeStyle = pal.ink;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x0 + boil.x + dx * 0.25, y0 + boil.y + 20 + dy * 0.25, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawWeaponHead(ctx, hx, hy, fighterId, pal) {
  ctx.fillStyle = pal.weaponHead;
  ctx.strokeStyle = pal.ink;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  if (fighterId === 'thor') {
    ctx.moveTo(hx - 6, hy - 14);
    ctx.lineTo(hx + 22, hy - 8);
    ctx.lineTo(hx + 22, hy + 14);
    ctx.lineTo(hx - 6, hy + 8);
  } else {
    ctx.moveTo(hx, hy - 22);
    ctx.lineTo(hx + 11, hy);
    ctx.lineTo(hx, hy + 8);
    ctx.lineTo(hx - 11, hy);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

// Full fighter paint. beat is a duel.json beat; tQ must be frame-quantized
// (we quantize defensively); x01 is stage fraction; groundY is stage px;
// wind is the beat wind vector; fatigue 0-7 scales tremor; wounded marks the
// carried costs. Returns the pose name for the caller.
export function paintFighterRig(ctx, seed, t, beat, fighterId, x01, groundY, wind, fatigue = 0) {
  const q = frameTime(t);
  const local = q - beat.start;
  const pose = poseFor(beat, local);
  const fp = fighterId === 'thor' ? pose.thor : pose.zeus;
  const facing = fighterId === 'thor' ? (fp.facing || 1) : -1;
  const full = { ...fp, facing };
  const x = x01 * STAGE_W + full.rootShift;
  const j = jointPositions(fighterId, full, x, groundY);
  const pal = FIGHTER_COLORS[fighterId];
  const slot = boilSlot(q);
  const boilFor = (key) => boilOffset(seed, fighterId + '|' + key, q);
  const trem = tremorAmp(fatigue);
  const tremRnd = substream(String(seed), 'tremor|' + fighterId, slot);
  const tremor = { x: (tremRnd() - 0.5) * 2 * trem, y: (tremRnd() - 0.5) * 2 * trem };
  const sway = clothSway(seed, fighterId, q, wind);

  const jx = (pt, extra = 0) => ({ x: pt.x + tremor.x + extra, y: pt.y + tremor.y });

  // Cloak: wind-blown triangle behind the torso, tip by the sway.
  ctx.save();
  ctx.fillStyle = pal.cloak;
  ctx.strokeStyle = pal.ink;
  ctx.lineWidth = 2.5;
  const cx = j.chest.x - facing * (j.limbs.shoulderHalf + 4);
  ctx.beginPath();
  ctx.moveTo(cx, j.chest.y + 6);
  ctx.lineTo(cx - facing * (22 + sway.sway) + boilFor('cloak').x, groundY - 44 + sway.lift + boilFor('cloak').y);
  ctx.lineTo(cx + facing * 8, groundY - 10);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Legs: thigh then shin, planted soles.
  const broad = fighterId === 'thor';
  const legW = broad ? 13 : 10;
  limb(ctx, jx(j.legL.hip), jx(j.legL.knee), legW, pal.legs, pal.ink, boilFor('legL1'), boilFor('legL2'));
  limb(ctx, jx(j.legL.knee), jx(j.legL.foot), legW * 0.85, pal.skin, pal.ink, boilFor('legL2'), boilFor('legL3'));
  limb(ctx, jx(j.legR.hip), jx(j.legR.knee), legW, pal.legs, pal.ink, boilFor('legR1'), boilFor('legR2'));
  limb(ctx, jx(j.legR.knee), jx(j.legR.foot), legW * 0.85, pal.skin, pal.ink, boilFor('legR2'), boilFor('legR3'));
  // Feet: planted bars on the ground line (lifted foot floats honestly).
  ctx.save();
  ctx.fillStyle = pal.legs;
  ctx.strokeStyle = pal.ink;
  ctx.lineWidth = 2;
  for (const leg of [j.legL, j.legR]) {
    ctx.fillRect(leg.foot.x - 12 + tremor.x, leg.foot.y - 6, 24, 6);
    ctx.strokeRect(leg.foot.x - 12 + tremor.x, leg.foot.y - 6, 24, 6);
  }
  ctx.restore();

  // Torso: broad wedge (Thor) vs narrow column (Zeus).
  ctx.save();
  ctx.fillStyle = pal.torso;
  ctx.strokeStyle = pal.ink;
  ctx.lineWidth = 3;
  const hw = j.limbs.shoulderHalf;
  const hhw = j.limbs.hipHalf;
  ctx.beginPath();
  if (broad) {
    ctx.moveTo(j.hips.x - hhw - 8 + boilFor('torso').x, j.hips.y);
    ctx.lineTo(j.hips.x + hhw + 8 + boilFor('torso').x, j.hips.y);
    ctx.lineTo(j.chest.x + hw + boilFor('torso').x, j.chest.y);
    ctx.lineTo(j.chest.x - hw + boilFor('torso').x, j.chest.y);
  } else {
    ctx.moveTo(j.hips.x - hhw + boilFor('torso').x, j.hips.y);
    ctx.lineTo(j.hips.x + hhw + boilFor('torso').x, j.hips.y);
    ctx.lineTo(j.chest.x + hw * 0.9 + boilFor('torso').x, j.chest.y);
    ctx.lineTo(j.chest.x - hw * 0.9 + boilFor('torso').x, j.chest.y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Zeus rib bruise from b05: dusky patch on the torso flank.
  if (fighterId === 'zeus' && isWounded(beat.id)) {
    ctx.fillStyle = 'rgba(90,70,110,0.55)';
    ctx.fillRect(j.chest.x - hw * 0.4, j.chest.y + 18, hw * 0.7, 22);
  }
  ctx.restore();

  // Arms: rear guard low, weapon arm per choreography.
  limb(ctx, jx(j.armL.shoulder), jx(j.armL.elbow), broad ? 9 : 7.5, pal.skin, pal.ink, boilFor('armL1'), boilFor('armL2'));
  limb(ctx, jx(j.armL.elbow), jx(j.armL.hand), broad ? 8 : 6.5, pal.skin, pal.ink, boilFor('armL2'), boilFor('armL3'));
  limb(ctx, jx(j.armR.shoulder), jx(j.armR.elbow), broad ? 9 : 7.5, pal.skin, pal.ink, boilFor('armR1'), boilFor('armR2'));
  limb(ctx, jx(j.armR.elbow), jx(j.armR.hand), broad ? 8 : 6.5, pal.skin, pal.ink, boilFor('armR2'), boilFor('armR3'));

  // Weapon in the weather hand (right for both; thrown/dropped/open skip).
  const grip = pose.openHanded ? 'open' : fighterId === 'thor'
    ? (pose.thorThrown ? 'thrown' : full.weapon)
    : (pose.zeusThrown ? 'thrown' : pose.zeusDropped ? 'dropped' : full.weapon);
  // Weapon hand: Thor always fights right-handed; Zeus blocks high with the
  // left then places the opening with the right (b07 read/held/debt).
  const hand = fighterId === 'thor'
    ? j.armR.hand
    : (full.weapon === 'high' || pose.name.includes('block') ? j.armL.hand : j.armR.hand);
  weaponInHand(ctx, seed, q, jx(hand), fighterId, grip, pose.openHanded, boilFor('weapon'));

  // Dropped shaft lies honestly on the rock (b05 knee/rise).
  if (fighterId === 'zeus' && pose.zeusDropped) {
    ctx.save();
    ctx.strokeStyle = '#3a2c1c';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    const dx0 = x - facing * 40;
    ctx.beginPath();
    ctx.moveTo(dx0 + boilFor('drop').x, groundY - 4);
    ctx.lineTo(dx0 + 70 + boilFor('drop').x, groundY - 10);
    ctx.stroke();
    drawWeaponHead(ctx, dx0 + 70 + boilFor('drop').x, groundY - 10, fighterId, pal);
    ctx.restore();
  }

  // Head + face: gaze at the foe, blink/brows/mouths by effort.
  const effort = effortForBeat(beat, local);
  const gazeDir = fighterId === 'thor' ? 1 : -1;
  const face = faceState(seed, fighterId, q, effort, gazeDir);
  const hr = j.limbs.head * 0.75;
  ctx.save();
  ctx.fillStyle = pal.skin;
  ctx.strokeStyle = pal.ink;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(j.head.x + boilFor('head').x, j.head.y + boilFor('head').y, hr, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Hair: Thor heavy cap + beard mass; Zeus close crop + trim beard.
  ctx.fillStyle = pal.hair;
  ctx.beginPath();
  ctx.arc(j.head.x + boilFor('head').x, j.head.y + boilFor('head').y - hr * 0.25, hr, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  paintFace(ctx, j.head.x, j.head.y, hr, face, { skin: pal.skin, hair: pal.hair, ink: pal.ink }, boilFor('face'), false);
  if (fighterId === 'thor') {
    ctx.save();
    ctx.fillStyle = pal.hair;
    ctx.strokeStyle = pal.ink;
    ctx.lineWidth = 2;
    ctx.fillRect(j.head.x - hr * 0.7 + boilFor('beard').x, j.head.y + hr * 0.3, hr * 1.4, hr * 0.9);
    ctx.strokeRect(j.head.x - hr * 0.7 + boilFor('beard').x, j.head.y + hr * 0.3, hr * 1.4, hr * 0.9);
    // Split brow from b05: carried wound.
    if (isWounded(beat.id)) {
      ctx.strokeStyle = '#7a1e14';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(j.head.x - hr * 0.5, j.head.y - hr * 0.35);
      ctx.lineTo(j.head.x - hr * 0.1, j.head.y - hr * 0.1);
      ctx.stroke();
    }
    ctx.restore();
  } else if (isWounded(beat.id)) {
    // Zeus trim beard shadows the jaw; brow stays clean.
    ctx.save();
    ctx.fillStyle = 'rgba(207,210,214,0.9)';
    ctx.fillRect(j.head.x - hr * 0.55, j.head.y + hr * 0.45, hr * 1.1, hr * 0.4);
    ctx.restore();
  }

  // Braid (Thor) / himation fringe (Zeus): secondary motion by wind.
  ctx.save();
  ctx.strokeStyle = fighterId === 'thor' ? pal.hair : pal.cloak;
  ctx.lineWidth = fighterId === 'thor' ? 5 : 4;
  ctx.lineCap = 'round';
  const hx0 = j.head.x - facing * hr * 0.8;
  ctx.beginPath();
  ctx.moveTo(hx0, j.head.y);
  ctx.lineTo(hx0 - facing * (14 + sway.sway * 0.8) + boilFor('hair').x, j.head.y + 26 + sway.lift + boilFor('hair').y);
  ctx.stroke();
  ctx.restore();

  return { pose: pose.name, effort, face };
}

// Thrown-weapon flight for the b04 wager: parabolic hand-to-sky-to-hand.
// Returns null when no weapon is airborne at (beat, local).
export function weaponFlight(beat, local, fighterId, thorX, zeusX, groundY) {
  const q = frameTime(local);
  const pose = poseFor(beat, q);
  const airborne = fighterId === 'thor' ? pose.thorThrown : pose.zeusThrown;
  if (beat.id !== 'b04' || !airborne) return null;
  // Flight goes up after the throw keys (3/5) and returns for the catches
  // (14/16): height peaks at the 9 s crossing.
  const peak = 150;
  const up = q < 9 ? (q - (fighterId === 'thor' ? 5 : 3)) / (9 - (fighterId === 'thor' ? 5 : 3)) : 0;
  const down = q >= 9 ? 1 - (q - 9) / ((fighterId === 'thor' ? 14 : 16) - 9) : 1;
  const k = Math.min(1, Math.max(0, q < 9 ? up : down));
  const lane = (fighterId === 'thor' ? -30 : 30) * (1 - k);
  const x = (thorX + zeusX) / 2 + lane;
  const y = groundY - 120 - Math.sin(Math.min(1, Math.max(0, k)) * Math.PI) * peak * 0.5 - k * 40;
  return { x, y, spin: q * 6 };
}

export function paintWeaponFlight(ctx, seed, t, beat, local, fighterId, x, y) {
  const q = frameTime(t);
  void seed;
  void q;
  void local;
  const pal = FIGHTER_COLORS[fighterId];
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((local * 6) % (Math.PI * 2));
  ctx.strokeStyle = '#3a2c1c';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-30, 0);
  ctx.lineTo(30, 0);
  ctx.stroke();
  drawWeaponHead(ctx, 30, 0, fighterId, pal);
  ctx.restore();
}

// Impact particles paint (stage space, scrub-exact stepping from the impact
// frame: age = q - impactT).
export function paintImpactParticles(ctx, seed, t, beat, anchors) {
  const q = frameTime(t);
  const local = q - beat.start;
  return paintAgedParticles(ctx, seed, beat, local, anchors);
}

function paintAgedParticles(ctx, seed, beat, local, anchors) {
  const q = frameTime(beat.start + local);
  void q;
  // Re-derive the governing impact: latest impact frame <= local within life.
  const frames = beat.id === 'b03' ? [6.5] : beat.id === 'b04' ? [9.0] : beat.id === 'b05' ? [6.0, 11.0] : beat.id === 'b06' ? [10.0] : beat.id === 'b07' ? [16.0] : [];
  let base = null;
  for (const f of frames) {
    if (local >= f && local - f < 0.8) base = f;
  }
  if (base === null) return 0;
  const parts = impactParticles(seed, beat.id, base, anchors);
  const dt = local - base;
  let n = 0;
  ctx.save();
  for (const p of parts) {
    const x = p.x + p.vx * dt;
    const y = p.y + p.vy * dt + 80 * dt * dt;
    const alpha = Math.max(0, 1 - dt / p.life);
    if (alpha <= 0) continue;
    ctx.globalAlpha = alpha * (p.kind === 'skyburst-peak' ? 0.9 : 0.8);
    ctx.fillStyle = p.kind === 'body-blow' ? '#c9b48a' : p.kind === 'skyburst-peak' ? '#eef4ff' : '#ffd98a';
    ctx.fillRect(x, y, p.size, p.size);
    n++;
  }
  ctx.restore();
  ctx.globalAlpha = 1;
  return n;
}
