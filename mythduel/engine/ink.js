// Mythduel ink: deterministic 2s line boil for the hand-drawn feel.
//
// boilOffset(seed, streamId, t) returns a small deterministic 2D offset for
// the 12 fps boil cadence: two render frames share one boil slot, so boil is
// scrub-exact. Magnitude is in canvas units at 960x540 stage space.
import { substream } from './rng.js';

export const BOIL_SLOTS_PER_SEC = 12;
export const BOIL_MAGNITUDE = 1.6;

export function boilSlot(t) {
  if (!Number.isFinite(t) || t < 0) return 0;
  return Math.floor(t * BOIL_SLOTS_PER_SEC);
}

export function boilOffset(seed, streamId, t, magnitude = BOIL_MAGNITUDE) {
  const slot = boilSlot(t);
  const rnd = substream(seed, 'boil|' + streamId, slot);
  const angle = rnd() * Math.PI * 2;
  const radius = rnd() * magnitude;
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius, slot };
}
