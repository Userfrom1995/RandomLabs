// Mythduel paper: deterministic grain flecks for the painted feel.
//
// grainFlecks(seed, streamId, t, n) returns n deterministic fleck positions in
// normalized stage space [0,1]x[0,1] for the current boil slot, so grain is
// scrub-exact like the ink boil. The player draws a subset per frame; the
// audit pins determinism by comparing two calls at the same t.
import { substream } from './rng.js';
import { boilSlot } from './ink.js';

export function grainFlecks(seed, streamId, t, n = 40) {
  const slot = boilSlot(t);
  const rnd = substream(seed, 'grain|' + streamId, slot);
  const flecks = [];
  for (let i = 0; i < n; i++) {
    flecks.push({ x: rnd(), y: rnd(), r: 0.4 + rnd() * 1.1, a: 0.03 + rnd() * 0.05 });
  }
  return flecks;
}
