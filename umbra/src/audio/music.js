/**
 * Umbra M5 audio: adaptive-music pattern generator.
 * Pure module: no DOM, no AudioContext, no unseeded randomness. Headless-testable in Node.
 * Patterns derive from a mulberry32 stream seeded ONLY by the arena musicSeed,
 * so intensity changes density and tempo but never the seed.
 * @module umbra/src/audio/music.js
 */

import { ARENAS } from '../arenas.js';
import { mulberry32 } from '../../src/rng.js';

/**
 * Theme ids, one per arena index 0..4 (matches ARENAS order).
 * @type {string[]}
 */
export const THEMES = ARENAS.map((a) => a.id);

/** Valid intensity levels: 0 calm, 1 fight, 2 boss. */
export const INTENSITIES = [0, 1, 2];

/**
 * @typedef {object} MusicPattern
 * @property {number} bpm loop tempo
 * @property {number[]} bass midi per quarter step (32 steps, 0 = rest)
 * @property {number[]} lead midi per 8th step (64 steps, 0 = rest)
 * @property {number[]} hats 0/1 per 8th step (64 steps)
 */

/** Tempo per intensity level. */
const BPM = [96, 116, 136];

/** Note-keep probability per intensity level (boss keeps the full stream). */
const KEEP = [0.34, 0.62, 1.0];

/** Steps per 8-bar loop. */
const BASS_STEPS = 32;
const LEAD_STEPS = 64;
const HAT_STEPS = 64;

/** Minor pentatonic walk used for bass and lead degrees. */
const PENTA = [0, 3, 5, 7, 10, 12, 15, 12, 10, 7, 5, 3];

/**
 * Resolve an arena reference (index or theme id) to an arena index.
 * Unknown values fall back to arena 0.
 * @param {unknown} arena index or theme id
 * @returns {number} arena index 0..4
 */
function resolveArena(arena) {
  if (typeof arena === 'number' && Number.isInteger(arena) && arena >= 0 && arena < ARENAS.length) {
    return arena;
  }
  if (typeof arena === 'string') {
    const i = ARENAS.findIndex((a) => a.id === arena);
    if (i >= 0) return i;
  }
  return 0;
}

/**
 * Normalize intensity to 0, 1, or 2 (defaults to 1 fight).
 * @param {unknown} intensity requested level
 * @returns {0|1|2} valid level
 */
function normIntensity(intensity) {
  if (intensity === 0 || intensity === 1 || intensity === 2) return intensity;
  return 1;
}

/**
 * Build a deterministic 8-bar loop descriptor for an arena and intensity.
 * The rng stream is seeded only by the arena musicSeed; intensity only gates
 * density (keep probability) and tempo, so calm patterns are strict subsets
 * of boss patterns drawn from the same stream.
 * @param {unknown} arena arena index (0..4) or theme id
 * @param {unknown} intensity 0 calm, 1 fight, 2 boss
 * @returns {MusicPattern} loop descriptor
 */
export function themePattern(arena, intensity) {
  const idx = resolveArena(arena);
  const level = normIntensity(intensity);
  const seed = ARENAS[idx].musicSeed >>> 0;
  const rng = mulberry32(seed);
  const keep = KEEP[level];
  const root = 33 + (seed % 12);
  const leadRoot = root + 24;

  const bass = [];
  for (let s = 0; s < BASS_STEPS; s++) {
    const degDraw = rng();
    const keepDraw = rng();
    if (!(keepDraw < keep)) {
      bass.push(0);
      continue;
    }
    const strong = s % 4 === 0;
    const deg = strong ? 0 : PENTA[Math.floor(degDraw * PENTA.length) % PENTA.length];
    bass.push(root + deg);
  }

  const lead = [];
  for (let s = 0; s < LEAD_STEPS; s++) {
    const degDraw = rng();
    const octDraw = rng();
    const keepDraw = rng();
    if (!(keepDraw < keep)) {
      lead.push(0);
      continue;
    }
    const deg = PENTA[Math.floor(degDraw * PENTA.length) % PENTA.length];
    const oct = octDraw < 0.25 ? 12 : 0;
    lead.push(leadRoot + deg + oct);
  }

  const hats = [];
  for (let s = 0; s < HAT_STEPS; s++) {
    hats.push(rng() < keep ? 1 : 0);
  }

  const bpm = BPM[level] + (seed % 5);
  return { bpm, bass, lead, hats };
}

/**
 * Stable string hash of a pattern for tests and caching.
 * @param {MusicPattern} p pattern
 * @returns {string} stable serialization
 */
export function patternHash(p) {
  return JSON.stringify({ bpm: p.bpm, bass: p.bass, lead: p.lead, hats: p.hats });
}
