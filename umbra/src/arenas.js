/**
 * Umbra arena definitions: pure data (palettes, light, parallax, music seed).
 * M1 renders arena 0 (moonlit temple); arenas 1-4 unlock visually in M3.
 * No DOM, safe to import in Node tests.
 */

/**
 * @typedef {object} ArenaDef
 * @property {string} id
 * @property {string} name
 * @property {[number,number,number]} skyTop linear-space RGB 0..1
 * @property {[number,number,number]} skyBottom
 * @property {[number,number,number]} glow glow disc color
 * @property {[number,number]} glowPos glow disc center in frame UV
 * @property {[number,number,number]} ground
 * @property {[number,number]} ridge ridge silhouette tint multiplier range [dark, light]
 * @property {[number,number]} keyLight rim key-light direction (normalized-ish 2D)
 * @property {[number,number,number]} accent rim-light accent color
 * @property {number} musicSeed generative music seed (M5 audio engine)
 */

/** @type {ArenaDef[]} */
export const ARENAS = [
  {
    id: 'moonlit-temple',
    name: 'Moonlit Temple',
    skyTop: [0.023, 0.031, 0.075],
    skyBottom: [0.1, 0.09, 0.2],
    glow: [0.85, 0.88, 1.0],
    glowPos: [0.72, 0.72],
    ground: [0.03, 0.028, 0.05],
    ridge: [0.05, 0.12],
    keyLight: [0.55, 0.45],
    accent: [0.45, 0.75, 1.0],
    musicSeed: 1001,
  },
  {
    id: 'ember-forge',
    name: 'Ember Forge',
    skyTop: [0.09, 0.02, 0.015],
    skyBottom: [0.32, 0.1, 0.03],
    glow: [1.0, 0.55, 0.2],
    glowPos: [0.5, 0.3],
    ground: [0.07, 0.03, 0.02],
    ridge: [0.06, 0.16],
    keyLight: [-0.5, 0.4],
    accent: [1.0, 0.55, 0.25],
    musicSeed: 2002,
  },
  {
    id: 'storm-bridge',
    name: 'Storm Bridge',
    skyTop: [0.02, 0.05, 0.09],
    skyBottom: [0.12, 0.2, 0.3],
    glow: [0.6, 0.8, 1.0],
    glowPos: [0.28, 0.7],
    ground: [0.025, 0.04, 0.06],
    ridge: [0.05, 0.14],
    keyLight: [0.4, 0.55],
    accent: [0.55, 0.85, 1.0],
    musicSeed: 3003,
  },
  {
    id: 'void-sanctum',
    name: 'Void Sanctum',
    skyTop: [0.03, 0.01, 0.06],
    skyBottom: [0.14, 0.04, 0.22],
    glow: [0.75, 0.4, 1.0],
    glowPos: [0.5, 0.66],
    ground: [0.035, 0.02, 0.055],
    ridge: [0.05, 0.13],
    keyLight: [0.0, 0.6],
    accent: [0.7, 0.45, 1.0],
    musicSeed: 4004,
  },
  {
    id: 'eclipse-rooftop',
    name: 'Eclipse Rooftop',
    skyTop: [0.01, 0.01, 0.02],
    skyBottom: [0.2, 0.08, 0.05],
    glow: [1.0, 0.75, 0.45],
    glowPos: [0.5, 0.62],
    ground: [0.04, 0.035, 0.04],
    ridge: [0.04, 0.11],
    keyLight: [0.3, 0.5],
    accent: [1.0, 0.7, 0.4],
    musicSeed: 5005,
  },
];

/**
 * @param {number} index arena index
 * @returns {ArenaDef} arena def, clamped to arena 0 for unknown indexes
 */
export function arenaAt(index) {
  if (!Number.isInteger(index) || index < 0 || index >= ARENAS.length) return ARENAS[0];
  return ARENAS[index];
}
