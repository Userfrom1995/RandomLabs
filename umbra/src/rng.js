/**
 * Umbra seeded RNG: mulberry32 is the sim's ONLY randomness source.
 * M1: drives deterministic ambient particles and pose phase offsets.
 * Pure math, no DOM, unit-testable in Node.
 */

/** FNV-1a 32-bit hash of a string. Returns an unsigned 32-bit integer. */
export function hashStr(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * mulberry32 seeded PRNG factory.
 * @param {number} seed unsigned 32-bit seed
 * @returns {() => number} function yielding [0, 1)
 */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Deterministic [0,1) value from integer coordinates (hash-based, stateless).
 * @param {...number} ints integer coordinates
 * @returns {number} value in [0, 1)
 */
export function hash01(...ints) {
  let h = 0x811c9dc5;
  for (const n of ints) {
    h ^= (n | 0) & 0xffffffff;
    h = Math.imul(h, 0x01000193);
  }
  h ^= h >>> 13;
  h = Math.imul(h, 0x5bd1e995);
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

/** Fractional part of x, in [0, 1). */
export function frac(x) {
  return x - Math.floor(x);
}
