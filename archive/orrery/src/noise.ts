// noise.ts — seeded 2D value noise + fractal brownian motion. Pure functions
// so procedural textures are deterministic (same seed → same planet, and the
// noise math is unit-testable in Node).

/** Deterministic 32-bit PRNG (mulberry32). Returns a function yielding [0,1). */
export const createRng = (seed: number): (() => number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const FADE = (t: number): number => t * t * (3 - 2 * t);

/** Seeded 2D value noise on a [0,1) field. */
export class Noise {
  private readonly perm: Uint8Array;

  constructor(seed: number) {
    const rng = createRng(seed);
    const table = new Uint8Array(256);
    for (let i = 0; i < 256; i++) table[i] = i;
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = table[i];
      table[i] = table[j];
      table[j] = tmp;
    }
    this.perm = table;
  }

  /** Lattice value at integer coordinates, mapped to [0,1). */
  private lattice(x: number, y: number): number {
    return this.perm[(this.perm[x & 255] + y) & 255] / 255;
  }

  /** Single-octave value noise at (x, y), [0,1). */
  value2(x: number, y: number): number {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;
    const u = FADE(xf);
    const v = FADE(yf);
    const a = this.lattice(xi, yi);
    const b = this.lattice(xi + 1, yi);
    const c = this.lattice(xi, yi + 1);
    const d = this.lattice(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }

  /**
   * Fractal Brownian motion: layered value noise. Result is approximately
   * [0,1) (amplitudes normalized; clamped defensively).
   */
  fbm2(x: number, y: number, octaves: number, lacunarity = 2, gain = 0.5): number {
    let amp = 1;
    let freq = 1;
    let sum = 0;
    let norm = 0;
    for (let i = 0; i < octaves; i++) {
      sum += amp * this.value2(x * freq, y * freq);
      norm += amp;
      amp *= gain;
      freq *= lacunarity;
    }
    const out = sum / norm;
    return out < 0 ? 0 : out > 1 ? 1 : out;
  }
}