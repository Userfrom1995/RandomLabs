// Hearthlight keyframed vector rigs: Nia, Yara, Ruel.
//
// Model-sheet parameters live in film/story/characters.md; this module is
// their executable form. Each rig is drawn from a pose object produced by
// poseFor(shot, p, local): stride energy, lean, bob, kneel, arm raise,
// lantern flame, tail wag, wake beats. Inbetweening is eased (easeInOut),
// never linear, so motion arrives and settles like hand-drawn animation.
//
// All outlines go through the ink engine (double-pass hand-inked stroke).
// Pure functions of their arguments: same pose renders identical marks.
import { inkStroke, inkFill } from './ink.js';

export function clamp01(k) {
  return Math.min(1, Math.max(0, k));
}

export function easeInOut(k) {
  const c = clamp01(k);
  return c * c * (3 - 2 * c);
}

// A bell envelope around centre c with width w (for one-off beats: the
// single tail-wag, the ear flick, the waking eye).
export function beat(p, c, w) {
  const d = (p - c) / w;
  return Math.exp(-d * d);
}

// Acting pose for a shot: which keyframes are live and how far between
// them the performance sits. Shot ids are the screenplay's own.
export function poseFor(shot, p, local) {
  const id = shot.id;
  const travel = { s04: 1.0, s09: 0.6, s12: 0.0, s13: 0.5, s15: 0.8, s16: 0.85 };
  const stride = travel[id] || 0;
  const kneel = id === 's17' ? easeInOut((p - 0.35) / 0.4)
    : id === 's14' ? 0.55
    : 0;
  const armRaise = id === 's17' ? easeInOut((p - 0.3) / 0.45)
    : id === 's05' ? 0.4 + 0.25 * Math.sin(local * 1.4)
    : id === 's03' ? 0.25 + 0.2 * Math.sin(local * 1.1)
    : id === 's14' ? 0.3
    : 0.12;
  const stillness = id === 's14' ? 1 : id === 's13' ? 0.4 : 0;
  const hasLantern = shot.act >= 2 && shot.cast.includes('nia');
  const flame = id === 's14' ? 0.12 + 0.08 * Math.sin(local * 9)
    : id === 's17' ? 0.3 + 0.7 * easeInOut((p - 0.4) / 0.4)
    : id === 's13' ? 0.55 + 0.15 * Math.sin(local * 7)
    : hasLantern ? 0.85 + 0.15 * Math.sin(local * 3)
    : 0;
  return {
    nia: { stride, lean: stride * 0.12, kneel, armRaise, stillness, hasLantern, flame },
    yara: { knot: (id === 's06' || id === 's08') ? Math.sin(p * Math.PI) : 0 },
    ruel: {
      tread: id === 's12' ? 1 : 0,
      wag: id === 's11' ? beat(p, 0.65, 0.09) : 0,
      ear: id === 's11' ? beat(p, 0.3, 0.05) : 0,
      wake: id === 's10' ? easeInOut(p * 2.5) : 1,
    },
  };
}

function cloakPath(ctx, h, belly, sway) {
  ctx.beginPath();
  ctx.moveTo(sway, -h);
  ctx.quadraticCurveTo(-h * 0.34 - belly, -h * 0.45, -h * 0.3 - belly, 0);
  ctx.lineTo(h * 0.3, 0);
  ctx.quadraticCurveTo(h * 0.2, -h * 0.5, sway, -h);
  ctx.closePath();
}

export function drawNiaAtWalk(ctx, pal, x, y, h, P, windK, boil, walkT = 0) {
  const still = 1 - 0.75 * (P.stillness || 0);
  const stride = (P.stride || 0) * still;
  const bob = Math.abs(Math.sin(walkT * 5.2)) * h * 0.05 * stride;
  const kneelDrop = (P.kneel || 0) * h * 0.32;
  const lean = (P.lean || 0) * h + stride * h * 0.04;
  const sway = lean + Math.sin(walkT * 2.6) * h * 0.02 * still;
  const belly = (windK * h * 0.22 + Math.sin(walkT * 5.2 + 1) * h * 0.03 * stride) * still
    + (P.kneel || 0) * h * 0.12;

  ctx.save();
  ctx.translate(x + boil.x, y + boil.y - bob - kneelDrop);
  const inkW = Math.max(1.2, h / 90);
  // boots: alternating stride nubs under the hem
  ctx.fillStyle = '#2c2118';
  for (const s of [-1, 1]) {
    const step = Math.sin(walkT * 5.2 + (s > 0 ? Math.PI : 0)) * h * 0.14 * stride;
    ctx.beginPath();
    ctx.ellipse(s * h * 0.12 + step + sway * 0.4, -h * 0.02, h * 0.09, h * 0.06, 0, 0, 7);
    ctx.fill();
  }
  // cloak with wind belly and kneel spread
  ctx.fillStyle = '#a03a2a';
  cloakPath(ctx, h, belly, sway);
  inkFill(ctx, pal.ink, inkW, boil);
  // patched elbow square (bible detail)
  ctx.fillStyle = '#7c2c1e';
  ctx.fillRect(-h * 0.24 - belly * 0.4 + sway, -h * 0.52, h * 0.12, h * 0.12);
  // head + windswept tuft, always leeward
  ctx.fillStyle = '#e8b98a';
  ctx.beginPath(); ctx.arc(h * 0.02 + sway, -h * 1.12, h * 0.11, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(h * 0.02 + sway, -h * 1.12, h * 0.11, 0, 7);
  inkStroke(ctx, pal.ink, inkW * 0.9, boil, 0.3);
  // amber eyes: single upper-lid line + glint (flame reflected in s14).
  // Fear shows in stillness: the lid line opens wider, never shaking.
  const lidOpen = 1 + 0.35 * (P.stillness || 0);
  ctx.strokeStyle = pal.ink; ctx.lineWidth = Math.max(1, h / 110);
  ctx.beginPath(); ctx.arc(h * 0.02 + sway, -h * 1.12, h * 0.055 * lidOpen, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke();
  if ((P.flame || 0) > 0.05) {
    ctx.fillStyle = '#ffb84d';
    ctx.beginPath(); ctx.arc(h * 0.045 + sway, -h * 1.13, h * 0.014 * (0.5 + P.flame), 0, 7); ctx.fill();
  }
  ctx.strokeStyle = pal.ink; ctx.lineWidth = inkW * 0.8;
  ctx.beginPath();
  ctx.moveTo(-h * 0.06 + sway, -h * 1.2);
  ctx.lineTo(-h * 0.22 - windK * h * 0.2 * still, -h * 1.3);
  ctx.moveTo(-h * 0.02 + sway, -h * 1.23);
  ctx.lineTo(-h * 0.16 - windK * h * 0.2 * still, -h * 1.38);
  ctx.stroke();
  // survey pole with ribbons flying leeward
  ctx.strokeStyle = pal.ink; ctx.lineWidth = inkW;
  ctx.beginPath(); ctx.moveTo(h * 0.42 + sway, 0); ctx.lineTo(h * 0.42 + sway, -h * 1.7); ctx.stroke();
  ctx.strokeStyle = '#d8d2c0'; ctx.lineWidth = Math.max(1, inkW * 0.7);
  for (let i = 0; i < 3; i++) {
    const ry = -h * (1.55 - i * 0.12);
    ctx.beginPath(); ctx.moveTo(h * 0.42 + sway, ry);
    ctx.quadraticCurveTo(h * 0.42 + sway + windK * h * 0.5 * still, ry - h * 0.08, h * 0.42 + sway + windK * h * 0.7 * still, ry);
    ctx.stroke();
  }
  // lantern arm: raised to the cairn in the finale, cupped low in the storm
  if (P.hasLantern) {
    const raise = P.armRaise || 0;
    const lx = -h * 0.45 + sway * 0.5;
    const ly = -h * (0.55 + raise * 0.75);
    ctx.strokeStyle = pal.ink; ctx.lineWidth = inkW * 0.9;
    ctx.beginPath(); ctx.moveTo(-h * 0.1 + sway, -h * 0.7); ctx.lineTo(lx, ly); ctx.stroke();
    const fl = Math.max(0.03, P.flame || 0);
    const flick = 0.85 + 0.15 * Math.sin(walkT * 9 + h);
    const g = ctx.createRadialGradient(lx, ly, 0, lx, ly, 30 * fl + 8);
    g.addColorStop(0, pal.lantern);
    g.addColorStop(1, 'rgba(255,180,77,0)');
    ctx.globalAlpha = 0.65 * flick * Math.min(1, fl + 0.25);
    ctx.fillStyle = g;
    ctx.fillRect(lx - 40, ly - 40, 80, 80);
    ctx.globalAlpha = 1;
    ctx.fillStyle = pal.lantern;
    ctx.beginPath(); ctx.arc(lx, ly, 3.4 * Math.min(1.4, fl + 0.6), 0, 7); ctx.fill();
    ctx.strokeStyle = pal.ink; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(lx, ly - 6); ctx.lineTo(lx, ly - 12); ctx.stroke();
  }
  ctx.restore();
}

// Yara boils slow: her lines re-seed at half rate, so she reads calmer
// than Nia in the same frame. The caller passes the slow boil offset.

export function drawYara(ctx, pal, x, y, h, pose, boil, walkT = 0) {
  const knot = (pose && pose.knot) || 0;
  void walkT;
  ctx.save();
  ctx.translate(x + boil.x, y + boil.y);
  const inkW = Math.max(1.2, h / 90);
  ctx.fillStyle = '#33406a';
  ctx.beginPath();
  ctx.moveTo(-h * 0.3, 0); ctx.lineTo(h * 0.3, 0);
  ctx.lineTo(h * 0.12, -h * 0.9); ctx.quadraticCurveTo(0, -h * 1.05, -h * 0.12, -h * 0.82);
  ctx.closePath();
  inkFill(ctx, pal.ink, inkW, boil);
  // embroidered wind-rose at the back hem (bible detail)
  ctx.strokeStyle = '#8fa0cc'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(-h * 0.14, -h * 0.18, h * 0.05, 0, 7); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-h * 0.19, -h * 0.18); ctx.lineTo(-h * 0.09, -h * 0.18);
  ctx.moveTo(-h * 0.14, -h * 0.23); ctx.lineTo(-h * 0.14, -h * 0.13);
  ctx.stroke();
  ctx.fillStyle = '#d8b894';
  ctx.beginPath(); ctx.arc(-h * 0.05, -h * 0.95, h * 0.1, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(-h * 0.05, -h * 0.95, h * 0.1, 0, 7);
  inkStroke(ctx, pal.ink, inkW * 0.9, boil, 0.3);
  // calm grey eyes under heavy lids
  ctx.strokeStyle = pal.ink; ctx.lineWidth = Math.max(1, h / 110);
  ctx.beginPath(); ctx.arc(-h * 0.05, -h * 0.94, h * 0.05, Math.PI * 0.1, Math.PI * 0.9); ctx.stroke();
  // silver bun with lacquer sticks
  ctx.fillStyle = '#cfcfcf';
  ctx.beginPath(); ctx.arc(-h * 0.14, -h * 1.04, h * 0.045, 0, 7); ctx.fill();
  ctx.strokeStyle = '#8a2a1a'; ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-h * 0.17, -h * 1.07); ctx.lineTo(-h * 0.1, -h * 0.99);
  ctx.moveTo(-h * 0.12, -h * 1.08); ctx.lineTo(-h * 0.06, -h * 1.0);
  ctx.stroke();
  // knotting hands: converge and part with the farewell beat
  const spread = h * 0.1 * (1 - 0.55 * knot);
  ctx.strokeStyle = pal.ink; ctx.lineWidth = inkW * 0.85;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(s * h * 0.16, -h * 0.55);
    ctx.quadraticCurveTo(s * spread, -h * 0.62, s * spread * 0.4, -h * 0.5 - knot * h * 0.06);
    ctx.stroke();
  }
  // storm-ribbon between the hands, knotted tighter as the beat peaks
  ctx.strokeStyle = '#4a6a9a'; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-spread * 0.4, -h * 0.5 - knot * h * 0.06);
  ctx.quadraticCurveTo(0, -h * 0.44 + knot * h * 0.05, spread * 0.4, -h * 0.5 - knot * h * 0.06);
  ctx.stroke();
  // staff by the door side
  ctx.strokeStyle = pal.ink; ctx.lineWidth = inkW;
  ctx.beginPath(); ctx.moveTo(h * 0.45, 0); ctx.lineTo(h * 0.45, -h * 1.5); ctx.stroke();
  ctx.restore();
}

export function drawRuel(ctx, pal, x, y, h, pose, boil, breathT, walkT = 0) {
  const P = pose || { tread: 0, wag: 0, ear: 0, wake: 1 };
  const wake = P.wake === undefined ? 1 : P.wake;
  const sink = (1 - wake) * h * 0.35;
  ctx.save();
  ctx.translate(x + boil.x, y + boil.y + sink);
  const inkW = Math.max(1.6, h / 70);
  const L = h * 3.0;
  // legs with gorge-tread offsets (footfalls on the score downbeats)
  ctx.strokeStyle = pal.ink; ctx.lineWidth = inkW;
  const treadPhase = walkT * 5.6;
  [-L * 0.3, -L * 0.05, L * 0.22, L * 0.4].forEach((lx, i) => {
    const lift = (P.tread ? Math.max(0, Math.sin(treadPhase + i * Math.PI * 0.5)) * h * 0.16 : 0);
    ctx.beginPath(); ctx.moveTo(lx, -h * 0.25); ctx.lineTo(lx, -lift); ctx.stroke();
  });
  // body + hump with moss mantle
  ctx.fillStyle = '#4a4038';
  ctx.beginPath();
  ctx.ellipse(0, -h * 0.7, L / 2, h * 0.62, 0, 0, 7); ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, -h * 0.7, L / 2, h * 0.62, 0, 0, 7);
  inkStroke(ctx, pal.ink, inkW, boil, 0.3);
  ctx.fillStyle = '#5a7048';
  ctx.beginPath();
  ctx.ellipse(-L * 0.1, -h * 1.15, L * 0.28, h * 0.34, 0, Math.PI, 0); ctx.fill();
  // head, low and heavy, lifting as he wakes
  const lift = wake * h * 0.1;
  ctx.fillStyle = '#4a4038';
  ctx.beginPath(); ctx.ellipse(L * 0.52, -h * 0.55 - lift, h * 0.42, h * 0.34, 0.2, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.ellipse(L * 0.52, -h * 0.55 - lift, h * 0.42, h * 0.34, 0.2, 0, 7);
  inkStroke(ctx, pal.ink, inkW, boil, 0.3);
  // chipped left tusk (bible detail)
  ctx.strokeStyle = '#d8d2c0'; ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(L * 0.52 + h * 0.3, -h * 0.38 - lift);
  ctx.quadraticCurveTo(L * 0.52 + h * 0.42, -h * 0.42 - lift, L * 0.52 + h * 0.44, -h * 0.52 - lift);
  ctx.stroke();
  // ember eyes, opening with the wake beat
  ctx.fillStyle = pal.lantern;
  ctx.beginPath(); ctx.arc(L * 0.58, -h * 0.62 - lift, h * 0.045 * (0.2 + 0.8 * wake), 0, 7); ctx.fill();
  // ears: all emotion lives here; one flick in s11
  const flick = (P.ear || 0) * 0.7;
  for (const s of [-1, 1]) {
    const ex = L * 0.34 + s * h * 0.1;
    const tw = s > 0 ? flick : flick * 0.4;
    ctx.fillStyle = '#4a4038';
    ctx.beginPath();
    ctx.ellipse(ex, -h * 0.95 - lift - tw * h * 0.2, h * 0.09, h * 0.16, s * 0.4 - tw, 0, 7);
    ctx.fill(); ctx.strokeStyle = pal.ink; ctx.lineWidth = 1.4; ctx.stroke();
  }
  // lichen antlers: 5 tines a side, asymmetrical
  ctx.strokeStyle = '#b8c49a'; ctx.lineWidth = 1.8;
  for (const sx of [-1, 1]) {
    const bx = -L * 0.1 + sx * L * 0.08;
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + sx * (0.25 + i * 0.16);
      const len = h * (0.5 - Math.abs(i - (sx > 0 ? 1 : 3)) * 0.06);
      ctx.beginPath(); ctx.moveTo(bx, -h * 1.25);
      ctx.lineTo(bx + Math.cos(a) * len, -h * 1.25 + Math.sin(a) * len);
      ctx.stroke();
    }
  }
  // short tail that wags exactly once
  const wagA = 0.5 + (P.wag || 0) * Math.sin(walkT * 11) * 0.9;
  ctx.strokeStyle = pal.ink; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-L * 0.5, -h * 0.7);
  ctx.quadraticCurveTo(-L * 0.5 - h * 0.3, -h * 0.6 + Math.sin(wagA) * h * 0.1, -L * 0.5 - h * 0.42, -h * 0.75 + Math.cos(wagA) * h * 0.12);
  ctx.stroke();
  // breath mist in cold acts
  if (breathT !== null && wake > 0.5) {
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#cfd8e2';
    const bx = L * 0.52 + h * 0.5 + ((breathT % 3) * h * 0.2);
    ctx.beginPath(); ctx.ellipse(bx, -h * 0.5 - lift, h * 0.3, h * 0.14, 0, 0, 7); ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}
