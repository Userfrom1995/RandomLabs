// Hearthlight face engine (Rebuild Phase 2).
//
// Heads, gaze and blink, brows, the phoneme mouth set, and the expression
// blender. Every expression in the audit's closed emotion set renders on
// the phoneme base without breaking dialogue mouth shapes: the blender
// mixes brow/lid/gaze targets while the mouth stays driven by the viseme.
//
// All functions are pure and deterministic. Phoneme timing derives from
// the caption text plus shot-local time, so dialogue faces are scrub-exact.
import { inkStroke } from './ink.js';

export const EMOTIONS = ['awe', 'anger', 'calm', 'fear', 'grief', 'guilt',
  'hope', 'joy', 'resolve', 'shame', 'sorrow', 'tenderness', 'wonder',
  'exhaustion', 'determination', 'relief', 'neutral'];

export const PHONEMES = ['A', 'E', 'I', 'O', 'U', 'M', 'B', 'F', 'REST'];

// Expression targets: brow lift (-1 down .. 1 up), brow pinch (0..1),
// lid openness multiplier, mouth bias (added openness), gaze default.
const EXPRESSIONS = {
  awe: { brow: 0.7, pinch: 0, lid: 1.25, mouthBias: 0.5, gaze: { x: 0, y: -0.4 } },
  anger: { brow: -0.8, pinch: 1, lid: 0.8, mouthBias: 0.1, gaze: { x: 0.3, y: 0 } },
  calm: { brow: 0, pinch: 0, lid: 0.75, mouthBias: 0, gaze: { x: 0, y: 0.1 } },
  fear: { brow: 0.6, pinch: 0.4, lid: 1.35, mouthBias: 0.15, gaze: { x: 0, y: 0 } },
  grief: { brow: -0.4, pinch: 0.7, lid: 0.7, mouthBias: -0.1, gaze: { x: 0, y: 0.3 } },
  guilt: { brow: -0.3, pinch: 0.5, lid: 0.65, mouthBias: -0.05, gaze: { x: -0.3, y: 0.3 } },
  hope: { brow: 0.4, pinch: 0, lid: 1.05, mouthBias: 0.2, gaze: { x: 0, y: -0.2 } },
  joy: { brow: 0.5, pinch: 0, lid: 0.9, mouthBias: 0.45, gaze: { x: 0, y: 0 } },
  resolve: { brow: -0.2, pinch: 0.2, lid: 1, mouthBias: 0.05, gaze: { x: 0.2, y: -0.1 } },
  shame: { brow: -0.2, pinch: 0.3, lid: 0.6, mouthBias: -0.05, gaze: { x: 0, y: 0.5 } },
  sorrow: { brow: -0.5, pinch: 0.6, lid: 0.7, mouthBias: -0.1, gaze: { x: 0, y: 0.2 } },
  tenderness: { brow: 0.2, pinch: 0, lid: 0.7, mouthBias: 0.1, gaze: { x: 0, y: 0.1 } },
  wonder: { brow: 0.8, pinch: 0, lid: 1.3, mouthBias: 0.4, gaze: { x: 0, y: -0.3 } },
  exhaustion: { brow: 0, pinch: 0.1, lid: 0.5, mouthBias: 0, gaze: { x: 0, y: 0.2 } },
  determination: { brow: -0.4, pinch: 0.4, lid: 1.05, mouthBias: 0, gaze: { x: 0.2, y: -0.2 } },
  relief: { brow: 0.3, pinch: 0, lid: 0.85, mouthBias: 0.25, gaze: { x: 0, y: 0 } },
  neutral: { brow: 0, pinch: 0, lid: 1, mouthBias: 0, gaze: { x: 0, y: 0 } },
};

export function expressionFor(emotion) {
  const e = EXPRESSIONS[emotion];
  if (!e) throw new Error('no expression for emotion ' + emotion);
  return { ...e, gaze: { ...e.gaze } };
}

// Blend two expressions by k (0 => a, 1 => b). Gaze blends componentwise.
export function blendExpression(aName, bName, k) {
  const a = expressionFor(aName);
  const b = expressionFor(bName);
  const c = Math.min(1, Math.max(0, k));
  return {
    brow: a.brow + (b.brow - a.brow) * c,
    pinch: a.pinch + (b.pinch - a.pinch) * c,
    lid: a.lid + (b.lid - a.lid) * c,
    mouthBias: a.mouthBias + (b.mouthBias - a.mouthBias) * c,
    gaze: {
      x: a.gaze.x + (b.gaze.x - a.gaze.x) * c,
      y: a.gaze.y + (b.gaze.y - a.gaze.y) * c,
    },
  };
}

// Mouth openness and width per viseme (0..1). M/B/F close the lips;
// A/O open tall; E/I spread wide; REST is a soft closed line.
const MOUTH = {
  A: { open: 0.9, wide: 0.7 }, E: { open: 0.4, wide: 1 }, I: { open: 0.3, wide: 0.9 },
  O: { open: 0.8, wide: 0.45 }, U: { open: 0.5, wide: 0.4 }, M: { open: 0.02, wide: 0.6 },
  B: { open: 0.05, wide: 0.6 }, F: { open: 0.15, wide: 0.55 }, REST: { open: 0.08, wide: 0.55 },
};

export function mouthShapeFor(phoneme) {
  const m = MOUTH[phoneme];
  if (!m) throw new Error('no mouth shape for phoneme ' + phoneme);
  return { ...m };
}

// Deterministic viseme track: map caption characters to phonemes, advance
// at 6 visemes per second of shot-local time. No caption => REST.
const CHAR_VIS = { a: 'A', e: 'E', i: 'I', o: 'O', u: 'U', m: 'M', b: 'B', p: 'B', f: 'F', v: 'F' };

export function phonemeFor(line, local) {
  if (!line || !Number.isFinite(local) || local < 0) return 'REST';
  const seq = [];
  for (const ch of String(line).toLowerCase()) {
    if (CHAR_VIS[ch]) seq.push(CHAR_VIS[ch]);
    else if (ch === ' ') seq.push('REST');
  }
  if (!seq.length) return 'REST';
  return seq[Math.floor(local * 6) % seq.length];
}

// Face close-up cards for the capture loop: per lead, the emotions from
// their bible expression sheet.
export const FACE_CARDS = {
  nia: ['joy', 'fear', 'grief', 'resolve', 'exhaustion'],
  yara: ['calm', 'tenderness', 'resolve', 'grief'],
  tam: ['fear', 'shame', 'grief', 'wonder', 'awe'],
  lumi: ['wonder', 'resolve', 'exhaustion', 'joy'],
};

// Draw a head at (cx, cy) with radius r. spec: { skin, hair, eye,
// hairStyle, emotion, phoneme, gaze {x,y}, blink (0..1 openness), boil
// (face-safe offset), inkW, windK, still }.
export function drawFace(ctx, spec) {
  const cx = spec.cx; const cy = spec.cy; const r = spec.r;
  const boil = spec.boil || { x: 0, y: 0 };
  const ink = '#2b2118';
  const inkW = spec.inkW || 2;
  const exp = expressionFor(spec.emotion || 'neutral');
  const mouth = mouthShapeFor(spec.phoneme || 'REST');
  const blink = spec.blink === undefined ? 1 : spec.blink;
  const gaze = spec.gaze || exp.gaze;
  const windK = spec.windK || 0;
  const still = spec.still === undefined ? 1 : spec.still;

  ctx.save();
  ctx.translate(cx + boil.x, cy + boil.y);

  // hair back mass per style
  ctx.fillStyle = spec.hair || '#2e2620';
  const hs = spec.hairStyle || 'tuft';
  if (hs === 'bun') {
    ctx.beginPath(); ctx.arc(-r * 0.55, -r * 0.75, r * 0.34, 0, 7); ctx.fill();
    ctx.strokeStyle = '#8a2a1a'; ctx.lineWidth = Math.max(1, inkW * 0.6);
    ctx.beginPath();
    ctx.moveTo(-r * 0.65, -r * 0.85); ctx.lineTo(-r * 0.4, -r * 0.6);
    ctx.moveTo(-r * 0.5, -r * 0.9); ctx.lineTo(-r * 0.28, -r * 0.64);
    ctx.stroke();
  } else if (hs === 'tieback') {
    ctx.beginPath(); ctx.arc(0, -r * 0.35, r * 0.72, Math.PI, 0); ctx.fill();
    ctx.fillRect(-r * 0.15, -r * 0.5, r * 0.3, r * 1.1);
  } else if (hs === 'knots') {
    ctx.beginPath(); ctx.arc(0, -r * 0.3, r * 0.68, Math.PI * 0.9, Math.PI * 2.1); ctx.fill();
    const bounce = Math.sin((spec.windK || 0) * 9) * r * 0.06;
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.arc(s * r * 0.55, -r * 0.95 + bounce * s, r * 0.26, 0, 7); ctx.fill();
    }
  } else {
    // tuft: windswept spikes, always leeward
    ctx.beginPath(); ctx.arc(0, -r * 0.25, r * 0.66, Math.PI * 0.85, Math.PI * 2.15); ctx.fill();
    ctx.strokeStyle = spec.hair || '#2e2620';
    ctx.lineWidth = Math.max(1.5, r * 0.12);
    ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const sy = -r * (0.75 + i * 0.18);
      ctx.beginPath();
      ctx.moveTo(-r * 0.25, sy + r * 0.1);
      ctx.lineTo(-r * 0.25 - windK * r * 0.8 * still - r * 0.35, sy);
      ctx.stroke();
    }
  }

  // face disc
  ctx.fillStyle = spec.skin || '#e8b98a';
  ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(0, 0, r, 0, 7);
  inkStroke(ctx, ink, inkW * 0.9, boil, 0.3);

  // eyes: gaze offset, lid rides blink * expression openness
  const lidOpen = Math.max(0.08, exp.lid * blink);
  const gx = (gaze.x || 0) * r * 0.16;
  const gy = (gaze.y || 0) * r * 0.14;
  for (const s of [-1, 1]) {
    const ex = s * r * 0.36 + gx;
    const ey = -r * 0.05 + gy;
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.ellipse(ex, ey, r * 0.2, r * 0.22 * lidOpen, 0, 0, 7); ctx.fill();
    if (lidOpen > 0.25) {
      ctx.fillStyle = spec.eye || '#5a3a1a';
      ctx.beginPath(); ctx.arc(ex, ey + r * 0.02, r * 0.1 * Math.min(1, lidOpen + 0.3), 0, 7); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(ex + r * 0.03, ey - r * 0.02, r * 0.028, 0, 7); ctx.fill();
    }
    ctx.strokeStyle = ink;
    ctx.lineWidth = Math.max(1, inkW * 0.7);
    ctx.beginPath();
    ctx.ellipse(ex, ey, r * 0.2, r * 0.22 * lidOpen, 0, Math.PI * 1.05, Math.PI * 1.95);
    ctx.stroke();
  }

  // brows: lift + pinch per expression
  ctx.strokeStyle = ink;
  ctx.lineWidth = Math.max(1, inkW * 0.75);
  ctx.lineCap = 'round';
  for (const s of [-1, 1]) {
    const lift = exp.brow * r * 0.14 - exp.pinch * r * 0.05;
    const inner = s * r * 0.14 - s * exp.pinch * r * 0.1;
    ctx.beginPath();
    ctx.moveTo(s * r * 0.52, -r * 0.42 + lift);
    ctx.quadraticCurveTo(s * r * 0.33, -r * 0.5 + lift, inner, -r * 0.38 + lift - exp.pinch * r * 0.06);
    ctx.stroke();
  }

  // nose: single short stroke (profile honesty in front view)
  ctx.strokeStyle = ink;
  ctx.lineWidth = Math.max(0.8, inkW * 0.55);
  ctx.beginPath();
  ctx.moveTo(gx * 0.5, r * 0.12);
  ctx.lineTo(gx * 0.5 - r * 0.06, r * 0.3);
  ctx.stroke();

  // mouth: viseme openness/width biased by expression, never broken
  const open = Math.max(0.02, Math.min(1, mouth.open + exp.mouthBias * 0.4));
  const wide = mouth.wide * r * 0.42;
  const mh = open * r * 0.5;
  const my = r * 0.52;
  if (open < 0.12) {
    ctx.strokeStyle = ink;
    ctx.lineWidth = Math.max(1, inkW * 0.7);
    ctx.beginPath();
    ctx.moveTo(-wide, my);
    ctx.quadraticCurveTo(0, my + (exp.mouthBias < 0 ? -r * 0.08 : r * 0.04), wide, my);
    ctx.stroke();
  } else {
    ctx.fillStyle = '#5a2018';
    ctx.beginPath(); ctx.ellipse(0, my, wide, mh * 0.5 + r * 0.03, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(0, my, wide, mh * 0.5 + r * 0.03, 0, 0, 7);
    inkStroke(ctx, ink, inkW * 0.55, boil, 0.3);
  }

  ctx.restore();
}
