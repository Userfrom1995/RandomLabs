// Hearthlight ink engine: the hand-drawn line device.
//
// Two responsibilities, both pure and deterministic:
//   1. boilJitter: the 2s line-boil offset. Jitter re-seeds at 12 fps from
//      the shot substream, so the boil shimmers in motion yet freezes
//      identically when scrubbed. Reduced-motion returns a dead still line.
//   2. inkStroke: a double-pass hand-inked stroke. A soft, slightly offset
//      under-stroke (the bristle drag) plus the crisp main stroke gives
//      lines a calligraphic weight that a single canvas stroke cannot.
//
// Stream ids ('boil|<shot>') are stable since Phase 1 so earlier boil
// behaviour is preserved exactly.
import { substream } from './rng.js';

export const BOIL_FPS = 12;

export function boilSlot(t) {
  return Math.floor(t * BOIL_FPS);
}

export function boilJitter(masterSeed, shotId, t, reducedMotion, amt) {
  if (reducedMotion) return { x: 0, y: 0 };
  const r = substream(masterSeed, 'boil|' + shotId, boilSlot(t));
  return { x: (r() - 0.5) * 2 * amt, y: (r() - 0.5) * 2 * amt };
}

// Yara's stillness device: her lines boil at half rate (6 fps), so she
// reads calmer than Nia even standing in the same frame.
export function boilJitterSlow(masterSeed, shotId, t, reducedMotion, amt) {
  if (reducedMotion) return { x: 0, y: 0 };
  const r = substream(masterSeed, 'boil|' + shotId, Math.floor(t * (BOIL_FPS / 2)));
  return { x: (r() - 0.5) * 2 * amt, y: (r() - 0.5) * 2 * amt };
}

// Trace the current path twice: bristle-drag under-stroke, then the line.
// Caller builds the path (or passes a trace fn that rebuilds it, since a
// path is consumed by stroke on some backends); we stroke the already-built
// current path, offsetting via a save/translate so no path rebuild is needed.
export function inkStroke(ctx, ink, width, boil, dragAlpha = 0.35) {
  ctx.save();
  ctx.translate(boil.x * 0.6 + width * 0.22, boil.y * 0.6 + width * 0.18);
  ctx.strokeStyle = ink;
  ctx.globalAlpha = dragAlpha;
  ctx.lineWidth = width * 1.9;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = ink;
  ctx.globalAlpha = 1;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
}

// Filled ink shape with a hand-inked rim: fill first, then the double-pass
// rim so silhouettes carry line weight even at 390 px widths.
export function inkFill(ctx, ink, width, boil) {
  ctx.fill();
  inkStroke(ctx, ink, width, boil);
}
