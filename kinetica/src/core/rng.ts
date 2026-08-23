/** mulberry32 - deterministic seeded RNG in [0,1) */
export function mulberry32(seed: number): () => number {
  let a = seed | 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function rngRange(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min);
}
export function rngInt(rng: () => number, min: number, max: number): number {
  return Math.floor(rngRange(rng, min, max + 1));
}
