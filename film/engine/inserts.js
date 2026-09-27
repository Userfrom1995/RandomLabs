// Hearthlight chart-insert close-up craft (Final Phase).
//
// Shots s03 and s07 are overhead chart inserts: no full bodies walk these
// frames, the hands ARE the acting. This module is their executable hand
// and prop choreography, drawn at close-up scale with real fingers, cuffs,
// and beat-driven props, in the same ink language as the body rigs.
//
//   s03 (Sparks that will not catch): Nia's blackened hand works a
//     spark-striker beside the dead lantern. Two attempts across the shot
//     (lift, strike, dying sparks), never a third: she stops trying to fix
//     things alone, which is why s04 runs to Yara.
//   s07 (Two marks on the chart): Yara's older hand enters from frame
//     right and her finger traces the cliff path from the washed-out
//     bridge to the station circle while Nia's charcoal follows behind.
//     The trace reveals progressively with shot progress.
//
// All geometry is width-relative (fractions of W/H) so the inserts stage
// identically at 960 px and 390 px. All randomness rides seeded substreams
// keyed to the boil lattice, so scrubbing freezes identically. No
// Math.random, no wall clock.
import { substream } from './rng.js';
import { inkStroke, boilSlot } from './ink.js';
import { modelFor } from './humans.js';

// Insert spec per shot id. Hands name the close-up hands on screen;
// striker/lanternDark arm the s03 props; attempts are [p0, p1] windows in
// shot progress; trace arms the s07 progressive path reveal.
export const CHART_INSERTS = {
  s03: {
    hands: ['nia'],
    striker: true,
    lanternDark: true,
    attempts: [[0.12, 0.34], [0.52, 0.74]],
    trace: false,
  },
  s07: {
    hands: ['nia', 'yara'],
    striker: false,
    lanternDark: false,
    attempts: [],
    trace: true,
  },
};

export function chartInsertFor(shotId) {
  if (typeof shotId !== 'string' || shotId.length === 0) {
    throw new Error('no chart insert for garbage shot id');
  }
  return CHART_INSERTS[shotId] || null;
}

// Attempt state for striker shots: null when idle, otherwise the attempt
// index and its 0..1 phase (lift through the first half, strike through
// the second, sparks at the seam).
export function attemptAt(spec, p) {
  if (!spec || !spec.attempts) return null;
  for (let i = 0; i < spec.attempts.length; i++) {
    const [p0, p1] = spec.attempts[i];
    if (p >= p0 && p < p1) return { index: i, phase: (p - p0) / (p1 - p0) };
  }
  return null;
}

// Yara's trace reveal fraction: the finger lands at p 0.28, the path is
// fully traced by p 0.78, then both hands hold on the station circle.
export function traceAt(p) {
  if (p <= 0.28) return 0;
  if (p >= 0.78) return 1;
  return (p - 0.28) / 0.5;
}

// Shared chart geography, normalized to the chart rect (x 0..1 maps to
// W*0.14..W*0.86, y 0..1 maps to H*0.10..H*0.90). The paint draws every
// mark faint (old ink); the s07 trace overdraws the cliff path solid up
// to the reveal fraction. Exported pure so tests pin the geography and
// the paint and the insert can never drift apart.
export function chartMarks() {
  return {
    // The gorge: a zigzag cleft running down the right half.
    gorge: [
      [0.60, 0.18], [0.64, 0.30], [0.58, 0.42], [0.63, 0.55],
      [0.59, 0.68], [0.62, 0.82],
    ],
    // The washed-out bridge: crossed out where the gorge pinches.
    bridge: { x: 0.605, y: 0.55, label: 'the old bridge' },
    // The cliff path: dashed escape from the bridge to the station.
    cliffPath: [
      [0.605, 0.55], [0.54, 0.60], [0.47, 0.58], [0.40, 0.62],
      [0.33, 0.60], [0.27, 0.62],
    ],
    // The station circle with the two waiting children.
    station: { x: 0.22, y: 0.62, r: 0.075, children: [[0.205, 0.615], [0.235, 0.625]] },
    // Nia's two charcoal marks: the hill road start and the mid-path vow.
    twoMarks: [[0.16, 0.30], [0.44, 0.585]],
  };
}

// Point along a normalized polyline at fraction f (0..1), in chart space.
export function polyPoint(pts, f) {
  const c = Math.min(1, Math.max(0, f));
  const segs = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i][0] - pts[i - 1][0];
    const dy = pts[i][1] - pts[i - 1][1];
    const len = Math.hypot(dx, dy);
    segs.push(len);
    total += len;
  }
  let want = c * total;
  for (let i = 1; i < pts.length; i++) {
    if (want <= segs[i - 1] || i === pts.length - 1) {
      const k = segs[i - 1] === 0 ? 0 : want / segs[i - 1];
      return [
        pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * k,
        pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * k,
      ];
    }
    want -= segs[i - 1];
  }
  return pts[pts.length - 1].slice();
}

function chartXY(W, H, nx, ny) {
  return [W * (0.14 + nx * 0.72), H * (0.10 + ny * 0.80)];
}

// Pure finger geometry for one close-up hand: knuckle/mid/tip points per
// finger plus the thumb tip, in frame px. Shared by the painter and the
// s07 anchor math so Yara's index lands exactly on the trace tip. Exported
// pure for the craft tests.
export function handGeometry(x, y, size, angle, fingers) {
  const dx = Math.cos(angle); const dy = Math.sin(angle);
  const px = -dy; const py = dx;
  const spread = fingers === 'point' ? [0, 0.10, -0.12, -0.26] : [0.30, 0.12, -0.10, -0.30];
  const curl = fingers === 'grip' ? 0.55 : fingers === 'point' ? 0.12 : 0.30;
  const len = fingers === 'point' ? [1.05, 0.42, 0.40, 0.34] : [0.78, 0.85, 0.80, 0.62];
  const out = [];
  for (let f = 0; f < 4; f++) {
    const kx = x + dx * size * 0.45 + px * size * spread[f] * 2.2;
    const ky = y + dy * size * 0.45 + py * size * spread[f] * 2.2;
    const fa = angle + spread[f] * (fingers === 'point' && f === 0 ? 0.4 : 1);
    const fdx = Math.cos(fa); const fdy = Math.sin(fa);
    const mx = kx + fdx * size * len[f] * 0.55;
    const my = ky + fdy * size * len[f] * 0.55;
    const ex = mx + (fdx * (1 - curl) + px * curl * 0.7) * size * len[f] * 0.5;
    const ey = my + (fdy * (1 - curl) + py * curl * 0.7) * size * len[f] * 0.5;
    out.push({ k: [kx, ky], m: [mx, my], tip: [ex, ey] });
  }
  const tx = x - px * size * 0.34; const ty = y - py * size * 0.34;
  const ta = angle - 0.9;
  out.push({ thumb: [tx + Math.cos(ta) * size * 0.5, ty + Math.sin(ta) * size * 0.5] });
  return out;
}
// One close-up hand: skin-filled palm wedge, four tapered fingers with a
// mid-joint curl, a thumb, and an inked rim on the double-pass stroke.
// fingers: 'grip' (curled around charcoal/striker), 'point' (index
// extended, rest folded: Yara tracing), 'rest' (relaxed curl: Nia in s07).
// blackened darkens the working fingertips (Nia after the failed strikes).
function drawCloseHand(ctx, o) {
  const { x, y, size, angle, skin, ink, boil } = o;
  const inkW = Math.max(1, size * 0.045);
  const dx = Math.cos(angle); const dy = Math.sin(angle);
  const px = -dy; const py = dx;
  // Cuff at the wrist: costume identity at close-up scale.
  const cuff = o.cuff;
  if (cuff) {
    const wx = x - dx * size * 1.05; const wy = y - dy * size * 1.05;
    ctx.fillStyle = cuff;
    ctx.beginPath();
    ctx.moveTo(wx + px * size * 0.52, wy + py * size * 0.52);
    ctx.lineTo(wx - dx * size * 0.5 + px * size * 0.46, wy - dy * size * 0.5 + py * size * 0.46);
    ctx.lineTo(wx - dx * size * 0.5 - px * size * 0.46, wy - dy * size * 0.5 - py * size * 0.46);
    ctx.lineTo(wx - px * size * 0.52, wy - py * size * 0.52);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(wx + px * size * 0.52, wy + py * size * 0.52);
    ctx.lineTo(wx - px * size * 0.52, wy - py * size * 0.52);
    inkStroke(ctx, ink, inkW, boil, 0.3);
  }
  // Palm wedge.
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.moveTo(x - dx * size * 0.55 + px * size * 0.42, y - dy * size * 0.55 + py * size * 0.42);
  ctx.quadraticCurveTo(x + px * size * 0.55, y + py * size * 0.55,
    x + dx * size * 0.45 + px * size * 0.34, y + dy * size * 0.45 + py * size * 0.34);
  ctx.lineTo(x + dx * size * 0.45 - px * size * 0.34, y + dy * size * 0.45 - py * size * 0.34);
  ctx.quadraticCurveTo(x - px * size * 0.55, y - py * size * 0.55,
    x - dx * size * 0.55 - px * size * 0.42, y - dy * size * 0.55 - py * size * 0.42);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - dx * size * 0.55 + px * size * 0.42, y - dy * size * 0.55 + py * size * 0.42);
  ctx.quadraticCurveTo(x + px * size * 0.55, y + py * size * 0.55,
    x + dx * size * 0.45 + px * size * 0.34, y + dy * size * 0.45 + py * size * 0.34);
  inkStroke(ctx, ink, inkW, boil, 0.3);
  // Fingers from the knuckle arc (geometry shared with the s07 anchor).
  const geo = handGeometry(x, y, size, angle, o.fingers);
  for (let f = 0; f < 4; f++) {
    const [kx, ky] = geo[f].k;
    const [mx, my] = geo[f].m;
    const [ex, ey] = geo[f].tip;
    const wide = f === 0 && o.fingers === 'point' ? 0.11 : 0.13;
    ctx.strokeStyle = skin;
    ctx.lineWidth = Math.max(1, size * wide);
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(kx, ky); ctx.lineTo(mx, my); ctx.lineTo(ex, ey); ctx.stroke();
    ctx.strokeStyle = ink;
    ctx.lineWidth = Math.max(0.8, inkW * 0.6);
    ctx.beginPath(); ctx.moveTo(kx, ky); ctx.lineTo(mx, my); ctx.lineTo(ex, ey); ctx.stroke();
    if (o.blackened && (f === 0 || f === 1)) {
      ctx.fillStyle = 'rgba(30,22,16,0.75)';
      ctx.beginPath(); ctx.arc(ex, ey, Math.max(1, size * 0.07), 0, 7); ctx.fill();
    }
  }
  // Thumb from the palm side.
  const tx = x - px * size * 0.34; const ty = y - py * size * 0.34;
  const ta = angle - 0.9;
  const tex = tx + Math.cos(ta) * size * 0.5; const tey = ty + Math.sin(ta) * size * 0.5;
  ctx.strokeStyle = skin;
  ctx.lineWidth = Math.max(1, size * 0.13);
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tex, tey); ctx.stroke();
  ctx.strokeStyle = ink;
  ctx.lineWidth = Math.max(0.8, inkW * 0.6);
  ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tex, tey); ctx.stroke();
  if (o.blackened) {
    ctx.fillStyle = 'rgba(30,22,16,0.75)';
    ctx.beginPath(); ctx.arc(tex, tey, Math.max(1, size * 0.07), 0, 7); ctx.fill();
  }
}

// Dead lantern for s03: the same hill-road lantern silhouette as the lit
// rows elsewhere, but cold glass, no glow, tipped where Nia set it down.
function drawDeadLantern(ctx, x, y, s, ink, boil) {
  const w = s * 0.42;
  ctx.fillStyle = '#14101a';
  ctx.beginPath();
  ctx.moveTo(x - w, y - s * 0.4);
  ctx.lineTo(x - w * 0.7, y - s * 0.62);
  ctx.lineTo(x + w * 0.7, y - s * 0.62);
  ctx.lineTo(x + w, y - s * 0.4);
  ctx.lineTo(x + w * 0.8, y + s * 0.5);
  ctx.lineTo(x - w * 0.8, y + s * 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - w, y - s * 0.4);
  ctx.lineTo(x - w * 0.7, y - s * 0.62);
  ctx.lineTo(x + w * 0.7, y - s * 0.62);
  ctx.lineTo(x + w, y - s * 0.4);
  ctx.lineTo(x + w * 0.8, y + s * 0.5);
  ctx.lineTo(x - w * 0.8, y + s * 0.5);
  ctx.closePath();
  inkStroke(ctx, ink, Math.max(1, s * 0.05), boil, 0.3);
  // Cold crossbar: the dead wick, never lit in this shot.
  ctx.strokeStyle = ink;
  ctx.lineWidth = Math.max(0.8, s * 0.04);
  ctx.beginPath(); ctx.moveTo(x - w * 0.5, y); ctx.lineTo(x + w * 0.5, y); ctx.stroke();
}

// Failing sparks at the striker seam: short seeded strokes that live and
// die inside one boil slot, so the attempt reads as effort, not magic.
function drawSparks(ctx, seed, shotId, t, x, y, H, ink) {
  const r = substream(seed, 'insert-sparks|' + shotId, boilSlot(t));
  const n = 4;
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (r() - 0.5) * 2.2;
    const len = H * (0.02 + r() * 0.035);
    ctx.strokeStyle = i === 0 ? '#ffb54d' : 'rgba(255,150,60,0.55)';
    ctx.lineWidth = Math.max(0.8, H * 0.004);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
    ctx.stroke();
  }
}

// Blocking for one insert instant: every hand anchor, prop, and beat
// flag the painter needs, as pure data of (shot, frame size, progress).
// Exported pure so the craft tests pin the acting without parsing pixels:
// Yara starts off-frame and her fingertip lands on the trace tip, Nia's
// striker lifts only inside attempt windows, sparks only at the seam.
export function insertActors(shotId, W, H, p, local) {
  const spec = chartInsertFor(shotId);
  if (!spec) return null;
  const size = H * 0.17;
  if (shotId === 's03') {
    const att = attemptAt(spec, p);
    const hx = W * (0.18 + p * 0.44);
    const hy = H * (0.5 - Math.sin(p * Math.PI) * 0.14);
    let lift = 0;
    if (att) {
      lift = att.phase < 0.5
        ? Math.sin((att.phase / 0.5) * Math.PI * 0.5) * H * 0.06
        : (1 - Math.sin(((att.phase - 0.5) / 0.5) * Math.PI * 0.5)) * H * 0.06;
    }
    return {
      nia: { x: hx, y: hy - lift, size, angle: 0.5, fingers: att ? 'grip' : 'rest' },
      yara: null,
      lantern: { x: W * 0.075, y: H * 0.62, s: H * 0.11 },
      strikerGripped: !!att,
      sparkAt: att && att.phase > 0.42 && att.phase < 0.62
        ? { x: hx + size * 0.75, y: hy - lift - size * 0.45 }
        : null,
      traceF: 0,
    };
  }
  const f = traceAt(p);
  const marks = chartMarks();
  const path = marks.cliffPath;
  const cxy = (nx, ny) => [W * (0.14 + nx * 0.72), H * (0.10 + ny * 0.80)];
  const [tipX, tipY] = cxy(...polyPoint(path, Math.max(f, 0.001)));
  const hs = size * 0.92;
  const probe = handGeometry(0, 0, hs, -1.1, 'point')[0].tip;
  // Entry runs p 0.04..0.28 on a smoothstep: fully off-frame (a full hand
  // past the edge) until the trace begins, then gliding onto the bridge.
  const raw = Math.min(1, Math.max(0, (p - 0.04) / 0.24));
  const ease = raw * raw * (3 - 2 * raw);
  const wantX = tipX - probe[0];
  const wantY = tipY - probe[1];
  const offX = W + hs * 1.8;
  const offY = H * 0.72;
  const [mx, my] = cxy(...marks.twoMarks[1]);
  return {
    nia: {
      x: mx - size * (1.6 - f * 0.5),
      y: my + size * 1.35 + Math.sin(local * 1.3) * size * 0.05,
      size: size * 0.95, angle: 0.9, fingers: 'grip',
    },
    yara: {
      x: offX + (wantX - offX) * ease,
      y: offY + (wantY - offY) * ease,
      size: hs, angle: -1.1, fingers: 'point',
    },
    lantern: null,
    strikerGripped: false,
    sparkAt: null,
    traceF: f,
  };
}

// The chart-insert close-up for one instant. Replaces the old sliding
// disc with acted hands and beat props; pure in (spec, geometry, time).
export function drawChartInsert(ctx, seed, shot, pal, W, H, t, p, local, boil) {
  const spec = chartInsertFor(shot.id);
  if (!spec) return;
  const marks = chartMarks();
  const ink = pal.ink;
  const size = H * 0.17;
  const actors = insertActors(shot.id, W, H, p, local);
  if (shot.id === 's03') {
    const nia = modelFor('nia');
    const att = attemptAt(spec, p);
    const hx = actors.nia.x; const hy = actors.nia.y;
    // Dead lantern keeps the failure company at the chart edge.
    drawDeadLantern(ctx, actors.lantern.x, actors.lantern.y, actors.lantern.s, ink, boil);
    // Striker: gripped during attempts, resting on the chart between.
    const gx = hx + size * 0.5; const gy = hy - size * 0.2;
    if (actors.strikerGripped) {
      ctx.strokeStyle = '#3a3a40';
      ctx.lineWidth = Math.max(1, size * 0.07);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(gx - size * 0.35, gy + size * 0.3);
      ctx.lineTo(gx + size * 0.25, gy - size * 0.25);
      ctx.stroke();
      ctx.strokeStyle = ink;
      ctx.lineWidth = Math.max(0.8, size * 0.03);
      ctx.beginPath();
      ctx.moveTo(gx - size * 0.35, gy + size * 0.3);
      ctx.lineTo(gx + size * 0.25, gy - size * 0.25);
      ctx.stroke();
    } else {
      ctx.strokeStyle = '#3a3a40';
      ctx.lineWidth = Math.max(1, size * 0.06);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(hx + size * 0.9, hy + size * 0.75);
      ctx.lineTo(hx + size * 1.5, hy + size * 0.55);
      ctx.stroke();
    }
    drawCloseHand(ctx, {
      x: hx, y: hy, size, angle: 0.5,
      skin: nia.skin, ink, boil,
      cuff: nia.cloak, fingers: actors.nia.fingers, blackened: true,
    });
    // Ribbon thread at Nia's wrist: the storm-ribbon knot rides with her.
    ctx.strokeStyle = '#cfd6e4';
    ctx.lineWidth = Math.max(0.8, size * 0.03);
    ctx.beginPath();
    ctx.arc(hx - Math.cos(0.5) * size * 1.28, hy - Math.sin(0.5) * size * 1.28,
      size * 0.12, 0, 7);
    ctx.stroke();
    // Sparks live only at the strike seam of each attempt.
    if (actors.sparkAt) {
      drawSparks(ctx, seed, shot.id, t, actors.sparkAt.x, actors.sparkAt.y, H, ink);
    }
  } else if (shot.id === 's07') {
    const nia = modelFor('nia');
    const yara = modelFor('yara');
    const f = actors.traceF;
    // Solid charcoal overdraw of the cliff path up to the reveal.
    const path = marks.cliffPath;
    const upto = Math.max(2, Math.ceil(f * (path.length - 1)) + 1);
    if (f > 0) {
      ctx.strokeStyle = '#100c08';
      ctx.lineWidth = Math.max(1, H * 0.006);
      ctx.lineCap = 'round';
      ctx.beginPath();
      const [sx, sy] = chartXY(W, H, path[0][0], path[0][1]);
      ctx.moveTo(sx, sy);
      for (let i = 1; i < upto && i < path.length; i++) {
        const [qx, qy] = chartXY(W, H, path[i][0], path[i][1]);
        ctx.lineTo(qx, qy);
      }
      if (f < 1) {
        const [exx, eyy] = chartXY(W, H, ...polyPoint(path, f));
        ctx.lineTo(exx, eyy);
      }
      ctx.stroke();
    }
    // Yara's hand enters from frame right; her index rides the trace tip
    // (the anchor in insertActors inverts handGeometry exactly).
    drawCloseHand(ctx, {
      x: actors.yara.x, y: actors.yara.y, size: actors.yara.size, angle: -1.1,
      skin: yara.skin, ink, boil,
      cuff: yara.shawl, fingers: 'point', blackened: false,
    });
    // Nia's charcoal follows a hand behind, resting near the second mark.
    const nx = actors.nia.x; const ny = actors.nia.y;
    ctx.strokeStyle = '#100c08';
    ctx.lineWidth = Math.max(1, size * 0.09);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(nx + size * 0.55, ny - size * 0.1);
    ctx.lineTo(nx + size * 0.95, ny - size * 0.45);
    ctx.stroke();
    drawCloseHand(ctx, {
      x: nx, y: ny, size: actors.nia.size, angle: 0.9,
      skin: nia.skin, ink, boil,
      cuff: nia.cloak, fingers: 'grip', blackened: false,
    });
    ctx.strokeStyle = '#cfd6e4';
    ctx.lineWidth = Math.max(0.8, size * 0.03);
    ctx.beginPath();
    ctx.arc(nx - Math.cos(0.9) * size * 1.22, ny - Math.sin(0.9) * size * 1.22,
      size * 0.12, 0, 7);
    ctx.stroke();
  }
}
