// Mythduel deterministic RNG: mulberry32 with string-seeded substreams.
// Same seed + same stream id => identical sequence on every run, in browser
// and node alike. No wall-clock, no Math.random anywhere in the render path.
export function hashSeed(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

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

// Independent deterministic substream for (masterSeed, streamId, frameSlot).
// frameSlot quantizes time-varying jitter: pass Math.floor(t * 12) for the
// 2s ink-boil cadence so boil is scrub-exact.
export function substream(masterSeed, streamId, frameSlot) {
  return mulberry32(hashSeed(masterSeed + '|' + streamId + '|' + frameSlot));
}
