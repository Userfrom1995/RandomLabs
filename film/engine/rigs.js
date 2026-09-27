// Hearthlight keyframed vector rigs: Nia, Yara, Tam, Lumi (human leads).
//
// Model-sheet parameters live in film/story/characters.md; bodies are the
// executable form in humans.js (proportion FK limbs, hands, costume) and
// faces.js (gaze/blink, brows, phoneme mouths, expression blender). Each
// rig here is staging: acting pose per shot plus face state from the
// dialogue lattice, delegated to the human engine. Ruel's creature rig is
// retained as a demoted supporting appearance (one shot); the placeholder
// cloak-blob bodies are retired: every lead now stands on two jointed
// legs with weight, exertion, and secondary motion from acting.js.
//
// Inbetweening is eased (easeInOut), never linear. All outlines go through
// the ink engine (double-pass hand-inked stroke, face-safe boil on heads).
// Pure functions of their arguments: same pose renders identical marks.
import { inkStroke } from './ink.js';
import { drawHuman } from './humans.js';
import { phonemeFor, speechNod } from './faces.js';

export function clamp01(k) {
  const n = Number(k);
  if (Number.isNaN(n)) return 0;
  return Math.min(1, Math.max(0, n));
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

// Eyelid blink: a 0.12 s dip every 3.7 s of shot-local time, offset per
// shot so the cast never blinks in creepy unison. Deterministic, scrub
// exact, frozen open under reduced motion (callers pass local pinned).
// Non-finite local (hostile seek) reads as eyes open.
export function blinkAt(local) {
  if (!Number.isFinite(local) || local < 0) return 1;
  const cyc = (local + 1.3) % 3.7;
  return cyc < 0.12 ? 0.15 : 1;
}

// Acting pose for a shot: which keyframes are live and how far between
// them the performance sits. Every shot of the screenplay carries a
// deliberate beat here (travel energy, kneel, gesture, stillness, flame),
// keyed by the screenplay's own shot ids. Shot ids are the screenplay's own.
export function poseFor(shot, p, local) {
  const id = shot.id;
  const travel = {
    s02: 0.35, s04: 1.0, s05: 0.1, s08: 0.25, s09: 0.6, s10: 0.2,
    s12: 0.0, s13: 0.5, s15: 0.8, s16: 0.85, s19: 0.25, s20: 0.15,
  };
  const stride = travel[id] || 0;
  const kneel = id === 's17' ? easeInOut((p - 0.35) / 0.4)
    : id === 's06' ? 0.55 * easeInOut(p * 2)
    : id === 's11' ? 0.4
    : id === 's14' ? 0.55
    : id === 's19' ? 0.15 * Math.sin(p * Math.PI)
    : 0;
  const armRaise = id === 's17' ? easeInOut((p - 0.3) / 0.45)
    : id === 's02' ? 0.5 + 0.2 * Math.sin(local * 1.2)
    : id === 's05' ? 0.4 + 0.25 * Math.sin(local * 1.4)
    : id === 's03' ? 0.25 + 0.2 * Math.sin(local * 1.1)
    : id === 's06' ? 0.55 * easeInOut(p * 2)
    : id === 's07' ? 0.45
    : id === 's08' ? 0.35 + 0.15 * Math.sin(local * 2)
    : id === 's10' ? 0.25
    : id === 's13' ? 0.5
    : id === 's14' ? 0.3
    : id === 's19' ? 0.5
    : id === 's20' ? 0.12
    : 0.12;
  const stillness = id === 's14' ? 1
    : id === 's13' ? 0.4
    : id === 's03' ? 0.3
    : id === 's07' ? 0.2
    : 0;
  const hasLantern = shot.act >= 2 && shot.cast.includes('nia');
  const flame = id === 's14' ? 0.12 + 0.08 * Math.sin(local * 9)
    : id === 's17' ? 0.3 + 0.7 * easeInOut((p - 0.4) / 0.4)
    : id === 's06' ? 0.2 + 0.6 * easeInOut((p - 0.3) / 0.4)
    : id === 's13' ? 0.55 + 0.15 * Math.sin(local * 7)
    : id === 's15' ? 0.5 + 0.3 * Math.sin(local * 3)
    : id === 's19' ? 1.0
    : id === 's20' ? 1.0
    : hasLantern ? 0.85 + 0.15 * Math.sin(local * 3)
    : 0;
  const knot = (id === 's06' || id === 's08') ? Math.sin(p * Math.PI)
    : id === 's07' ? 0.5
    : id === 's05' ? 0.3 * Math.sin(p * Math.PI)
    : id === 's19' ? 0.4 * Math.sin(p * Math.PI)
    : 0;
  const tread = id === 's12' ? 1 : id === 's16' ? 0.7 : id === 's15' ? 0.6 : id === 's13' ? 0.4 : 0;
  // Tam: the ferryman's son. Strides with the party, oar yoked until the
  // gorge; belays the traverse in s12 (arm high, stride planted), carries
  // Lumi up the storm slope (s13 back-carry, arms loaded, stride halved).
  const tamTravel = { s09: 0.6, s10: 0.2, s11: 0.15, s12: 0.3, s13: 0.45, s15: 0.8, s16: 0.85, s19: 0.25, s20: 0.15 };
  const tamStride = tamTravel[id] || 0;
  const tamArm = id === 's12' ? 0.85
    : id === 's13' ? 0.6
    : id === 's17' ? 0.5
    : id === 's19' ? 0.5
    : id === 's10' ? 0.3
    : 0.12;
  const tamCarry = id === 's13' || id === 's14' ? 'arms' : 'none';
  const tamOar = id === 's10' || id === 's11' || id === 's12';
  // Lumi: the truth-teller, 8, bound ankle. Carried for half the crossing
  // (no stride of her own), walking with a souvenir stick in the coda.
  const lumiStride = id === 's19' ? 0.25 : id === 's10' || id === 's11' ? 0.15 : 0;
  const lumiCarry = id === 's13' ? 'back' : id === 's14' ? 'arms' : id === 's19' ? 'stick' : 'none';
  const lumiStill = id === 's14' ? 0.8 : 0;
  return {
    nia: { stride, lean: stride * 0.12, kneel, armRaise, stillness, hasLantern, flame, blink: blinkAt(local) },
    yara: { knot, blink: blinkAt(local + 1.9) },
    tam: {
      stride: tamStride, lean: tamStride * 0.12, kneel: 0, armRaise: tamArm,
      stillness: 0, carry: tamCarry, oar: tamOar, blink: blinkAt(local + 0.7),
    },
    lumi: {
      stride: lumiStride, lean: lumiStride * 0.1, kneel: 0, armRaise: 0.2,
      stillness: lumiStill, carry: lumiCarry, oar: false, blink: blinkAt(local + 2.6),
    },
    ruel: {
      tread,
      wag: id === 's11' ? beat(p, 0.65, 0.09) : 0,
      ear: id === 's11' ? beat(p, 0.3, 0.05) : 0,
      wake: id === 's10' ? easeInOut(p * 2.5) : 1,
      // Ruel's single line (s12) plays in the body: head up, ears perked.
      speak: speakFor(shot, 'RUEL', local),
    },
  };
}

// Creature line delivery: Ruel speaks exactly one captioned line (s12) and
// has no human face rig, so his delivery plays in the body. speakFor
// returns 0..1 across a caption window with 0.3 s attack/release: the head
// lifts, the ears perk, the ember eyes widen on his words, then settle.
export function lineWindow(shot, who) {
  const lines = (shot && Array.isArray(shot.captions)) ? shot.captions : [];
  for (const c of lines) {
    if (c.who === who) return [c.t, c.t + (c.dur || 4.5)];
  }
  return null;
}

export function speakFor(shot, who, local) {
  const w = lineWindow(shot, who);
  if (!w || !Number.isFinite(local)) return 0;
  const edge = 0.3;
  if (local < w[0] - edge || local > w[1] + edge) return 0;
  if (local < w[0]) return (local - (w[0] - edge)) / edge;
  if (local > w[1]) return 1 - (local - w[1]) / edge;
  return 1;
}

// Face state for a lead at a shot instant: the active dialogue line drives
// emotion and viseme when the speaker matches; otherwise the bible beat
// for the shot plays. Speaker tags are the screenplay's own (NIA, YARA,
// TAM, LUMI; NARRATOR is a caption voice, never staged).
const WHO = { NIA: 'nia', YARA: 'yara', TAM: 'tam', LUMI: 'lumi' };

const BEAT_FACE = {
  s01: { nia: 'guilt', yara: 'calm', tam: 'fear', lumi: 'wonder' },
  s02: { nia: 'fear', yara: 'grief', tam: 'fear', lumi: 'fear' },
  s03: { nia: 'determination', yara: 'calm', tam: 'neutral', lumi: 'neutral' },
  s04: { nia: 'grief', yara: 'grief', tam: 'fear', lumi: 'fear' },
  s05: { nia: 'shame', yara: 'resolve', tam: 'neutral', lumi: 'neutral' },
  s06: { nia: 'hope', yara: 'tenderness', tam: 'neutral', lumi: 'neutral' },
  s07: { nia: 'resolve', yara: 'calm', tam: 'neutral', lumi: 'neutral' },
  s08: { nia: 'resolve', yara: 'tenderness', tam: 'neutral', lumi: 'neutral' },
  s09: { nia: 'joy', yara: 'calm', tam: 'hope', lumi: 'wonder' },
  s10: { nia: 'hope', yara: 'calm', tam: 'fear', lumi: 'wonder' },
  s11: { nia: 'resolve', yara: 'calm', tam: 'shame', lumi: 'resolve' },
  s12: { nia: 'determination', yara: 'calm', tam: 'fear', lumi: 'resolve' },
  s13: { nia: 'determination', yara: 'calm', tam: 'grief', lumi: 'exhaustion' },
  s14: { nia: 'grief', yara: 'calm', tam: 'grief', lumi: 'exhaustion' },
  s15: { nia: 'hope', yara: 'calm', tam: 'wonder', lumi: 'wonder' },
  s16: { nia: 'exhaustion', yara: 'calm', tam: 'fear', lumi: 'exhaustion' },
  s17: { nia: 'awe', yara: 'calm', tam: 'awe', lumi: 'joy' },
  s18: { nia: 'joy', yara: 'tenderness', tam: 'joy', lumi: 'joy' },
  s19: { nia: 'relief', yara: 'tenderness', tam: 'relief', lumi: 'joy' },
  s20: { nia: 'calm', yara: 'calm', tam: 'calm', lumi: 'joy' },
};

export function faceFor(shot, who, local) {
  const lines = (shot && Array.isArray(shot.captions)) ? shot.captions : [];
  for (const c of lines) {
    const dur = c.dur || 4.5;
    if (local >= c.t && local < c.t + dur && WHO[c.who] === who) {
      return { emotion: c.emotion || 'neutral', phoneme: phonemeFor(c.line, local - c.t), nod: speechNod(c.line, local - c.t) };
    }
  }
  const beat = BEAT_FACE[shot ? shot.id : ''] || {};
  return { emotion: beat[who] || 'neutral', phoneme: 'REST', nod: 0 };
}

// Shared delegate: pose P plus acting A onto a proportion body. Face-safe
// boil keeps the head still enough to act; the body keeps full boil.
function humanDelegate(ctx, pal, name, x, y, h, P, extra, windK, boil, faceBoil, walkT, local, shot) {
  const face = faceFor(shot, name, local);
  drawHuman(ctx, pal, name, x, y, h, {
    stride: P.stride || 0,
    lean: P.lean || 0,
    kneel: P.kneel || 0,
    armRaise: P.armRaise || 0,
    stillness: P.stillness || 0,
    windK,
    boil,
    faceBoil: faceBoil || boil,
    walkT,
    weight: (extra && extra.weight) || 0,
    exertion: (extra && extra.exertion) || 0,
    secondary: (extra && extra.secondary) || null,
    carry: P.carry || (extra && extra.carry) || 'none',
    oar: P.oar !== undefined ? P.oar : (extra && extra.oar),
    knot: (P && P.knot) || (extra && extra.knot) || 0,
    lantern: (extra && extra.lantern) || null,
    face: { emotion: face.emotion, phoneme: face.phoneme, blink: P.blink, nod: face.nod },
  });
}

export function drawNiaAtWalk(ctx, pal, x, y, h, P, windK, boil, walkT = 0, extra = null, shot = null) {
  const faceBoil = boil && boil.face ? boil.face : boil;
  const t = typeof walkT === 'number' ? walkT : 0;
  humanDelegate(ctx, pal, 'nia', x, y, h, P, {
    weight: (extra && extra.weight) || 0,
    exertion: (extra && extra.exertion) || 0,
    secondary: (extra && extra.secondary) || null,
    lantern: P.hasLantern ? { flame: P.flame || 0 } : null,
  }, windK, boil, faceBoil, t, t, shot || extraShot(extra, walkT));
}

// Yara boils slow: her lines re-seed at half rate, so she reads calmer
// than Nia in the same frame. The caller passes the slow boil offset.
export function drawYara(ctx, pal, x, y, h, pose, boil, walkT = 0, extra = null, shot = null) {
  const faceBoil = boil && boil.face ? boil.face : boil;
  const t = typeof walkT === 'number' ? walkT : 0;
  humanDelegate(ctx, pal, 'yara', x, y, h, {
    stride: 0, lean: 0, kneel: 0, armRaise: 0, stillness: 0, blink: pose && pose.blink,
    knot: (pose && pose.knot) || 0,
  }, { weight: 0, exertion: 0, secondary: (extra && extra.secondary) || null }, 0.15, boil, faceBoil, t, t, shot || extraShot(extra, walkT));
}

// Tam, the ferryman's son: long-limbed, oar yoked until the gorge.
export function drawTam(ctx, pal, x, y, h, P, windK, boil, walkT = 0, extra = null, shot = null) {
  const faceBoil = boil && boil.face ? boil.face : boil;
  const t = typeof walkT === 'number' ? walkT : 0;
  humanDelegate(ctx, pal, 'tam', x, y, h, P, {
    weight: (extra && extra.weight) || 0,
    exertion: (extra && extra.exertion) || 0,
    secondary: (extra && extra.secondary) || null,
  }, windK, boil, faceBoil, t, t, shot || extraShot(extra, walkT));
}

// Lumi, the truth-teller: smallest of the party, carried half the crossing.
export function drawLumi(ctx, pal, x, y, h, P, windK, boil, walkT = 0, extra = null, shot = null) {
  const faceBoil = boil && boil.face ? boil.face : boil;
  const t = typeof walkT === 'number' ? walkT : 0;
  humanDelegate(ctx, pal, 'lumi', x, y, h, P, {
    weight: (extra && extra.weight) || 0,
    exertion: (extra && extra.exertion) || 0,
    secondary: (extra && extra.secondary) || null,
  }, windK, boil, faceBoil, t, t, shot || extraShot(extra, walkT));
}

// The draw wrappers accept (walkT, extra, shot): older callers pass only
// walkT, newer staging passes the acting state and the shot. When the shot
// arrives inside `extra` (staging shorthand), unwrap it here.
function extraShot(extra, walkT) {
  if (extra && extra.shot) return extra.shot;
  if (walkT && typeof walkT === 'object' && walkT.shot) return walkT.shot;
  return null;
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
  // head, low and heavy, lifting as he wakes - and lifting further to speak
  const speak = P.speak || 0;
  const lift = wake * h * 0.1 + speak * h * 0.08;
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
  // ember eyes, opening with the wake beat - wider on his spoken line
  ctx.fillStyle = pal.lantern;
  ctx.beginPath(); ctx.arc(L * 0.58, -h * 0.62 - lift, h * 0.045 * (0.2 + 0.8 * wake) * (1 + speak * 0.5), 0, 7); ctx.fill();
  // ears: all emotion lives here; one flick in s11, perked through his s12 line
  const flick = (P.ear || 0) * 0.7;
  for (const s of [-1, 1]) {
    const ex = L * 0.34 + s * h * 0.1;
    const tw = s > 0 ? flick : flick * 0.4;
    ctx.fillStyle = '#4a4038';
    // speak perks the ears upright: the silhouette answers his line.
    ctx.beginPath();
    ctx.ellipse(ex, -h * 0.95 - lift - tw * h * 0.2 - speak * h * 0.06, h * 0.09, h * 0.16, s * 0.4 - tw, 0, 7);
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
