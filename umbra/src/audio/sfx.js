/**
 * Umbra M5 audio: SFX descriptor factory.
 * Pure module: no DOM, no AudioContext, no unseeded randomness. Headless-testable in Node.
 * Descriptors are plain JSON-serializable data; engine.js renders them with WebAudio.
 * All synthesis params are deterministic constants; the optional seed param only
 * selects a deterministic noise timbre variant (never unseeded randomness).
 * @module umbra/src/audio/sfx.js
 */

/**
 * Canonical SFX names.
 * @type {string[]}
 */
export const SFX_NAMES = [
  'hit',
  'block',
  'parry',
  'whiff',
  'dash',
  'ko',
  'round',
  'ui',
  'unlock',
  'trial',
  'countdown',
];

/** Max total duration in seconds for any descriptor. */
export const SFX_MAX_DUR = 1.2;

/**
 * @typedef {object} SfxNode
 * @property {'osc'|'noise'} type node kind (oscillator or filtered noise)
 * @property {number} freq start frequency in Hz (filter cutoff for noise)
 * @property {number} freqEnd end frequency in Hz
 * @property {number} dur node duration in seconds
 * @property {number} gain peak gain in 0..1
 * @property {number} at start offset in seconds from descriptor start
 */

/**
 * @typedef {object} SfxDesc
 * @property {string} name canonical name
 * @property {SfxNode[]} nodes synthesis nodes
 * @property {number} dur total duration in seconds (<= 1.2)
 */

/**
 * @typedef {object} SfxOpts
 * @property {number} [seed] integer seed selecting the deterministic noise variant
 */

/**
 * Return fallback when v is not a finite number.
 * @param {number} v value to check
 * @param {number} fallback replacement for non-finite input
 * @returns {number} v when finite, else fallback
 */
function fin(v, fallback) {
  return Number.isFinite(v) ? v : fallback;
}

/**
 * Build an oscillator node.
 * @param {number} freq start Hz
 * @param {number} freqEnd end Hz
 * @param {number} dur seconds
 * @param {number} gain peak 0..1
 * @param {number} at offset seconds
 * @returns {SfxNode} node
 */
function osc(freq, freqEnd, dur, gain, at) {
  return { type: 'osc', freq, freqEnd, dur, gain, at };
}

/**
 * Build a noise node.
 * @param {number} freq start cutoff Hz
 * @param {number} freqEnd end cutoff Hz
 * @param {number} dur seconds
 * @param {number} gain peak 0..1
 * @param {number} at offset seconds
 * @returns {SfxNode} node
 */
function noise(freq, freqEnd, dur, gain, at) {
  return { type: 'noise', freq, freqEnd, dur, gain, at };
}

/**
 * Base node list per canonical name. All constants, no randomness.
 * @param {string} name canonical SFX name
 * @returns {SfxNode[]} base nodes
 */
function baseNodes(name) {
  switch (name) {
    case 'hit':
      return [osc(180, 60, 0.18, 0.9, 0), noise(3200, 900, 0.12, 0.5, 0)];
    case 'block':
      return [osc(320, 140, 0.14, 0.7, 0), noise(2400, 1200, 0.08, 0.35, 0)];
    case 'parry':
      return [
        osc(880, 1320, 0.12, 0.6, 0),
        osc(1320, 1980, 0.16, 0.5, 0.08),
        noise(5000, 3000, 0.1, 0.3, 0),
      ];
    case 'whiff':
      return [noise(800, 3600, 0.22, 0.35, 0)];
    case 'dash':
      return [noise(600, 4200, 0.26, 0.4, 0), osc(140, 320, 0.2, 0.25, 0)];
    case 'ko':
      return [
        osc(160, 40, 0.7, 0.9, 0),
        noise(2500, 200, 0.5, 0.6, 0),
        osc(80, 30, 0.9, 0.7, 0.05),
      ];
    case 'round':
      return [osc(392, 392, 0.2, 0.6, 0), osc(587, 587, 0.3, 0.6, 0.2)];
    case 'unlock':
      return [
        osc(523, 523, 0.15, 0.5, 0),
        osc(659, 659, 0.15, 0.5, 0.15),
        osc(784, 784, 0.25, 0.55, 0.3),
      ];
    case 'trial':
      return [
        osc(330, 330, 0.15, 0.5, 0),
        osc(415, 415, 0.15, 0.5, 0.15),
        osc(554, 554, 0.2, 0.5, 0.3),
        noise(4000, 6000, 0.2, 0.2, 0.5),
      ];
    case 'countdown':
      return [
        osc(440, 440, 0.12, 0.6, 0),
        osc(440, 440, 0.12, 0.6, 0.16),
        osc(880, 880, 0.2, 0.65, 0.32),
      ];
    case 'ui':
    default:
      return [osc(660, 880, 0.09, 0.4, 0)];
  }
}

/** Base total durations per canonical name (all <= 1.2). */
const BASE_DUR = {
  hit: 0.22,
  block: 0.18,
  parry: 0.35,
  whiff: 0.25,
  dash: 0.3,
  ko: 1.0,
  round: 0.6,
  ui: 0.12,
  unlock: 0.8,
  trial: 0.9,
  countdown: 0.6,
};

/**
 * Deterministic noise variant index 0..6 from a seed.
 * @param {unknown} seed seed value
 * @returns {number} variant in 0..6
 */
function variantOf(seed) {
  const s = Number.isFinite(seed) ? seed | 0 : 0;
  return ((s % 7) + 7) % 7;
}

/**
 * Build a plain JSON-serializable SFX descriptor.
 * Unknown names fall back to 'ui'. All numbers are validated finite.
 * The seed param only shifts noise-node cutoffs deterministically.
 * @param {unknown} name requested SFX name
 * @param {SfxOpts} [opts] options ({seed} for noise variant)
 * @returns {SfxDesc} descriptor with dur <= 1.2
 */
export function sfxDesc(name, opts = {}) {
  const canonical = SFX_NAMES.includes(name) ? name : 'ui';
  const seed = opts && Number.isFinite(opts.seed) ? opts.seed : 0;
  const shift = variantOf(seed) - 3;
  const nodes = baseNodes(canonical).map((n) => {
    if (n.type === 'noise') {
      return {
        type: 'noise',
        freq: Math.max(40, n.freq + shift * 23),
        freqEnd: Math.max(40, n.freqEnd + shift * 17),
        dur: n.dur,
        gain: n.gain,
        at: n.at,
      };
    }
    return { type: n.type, freq: n.freq, freqEnd: n.freqEnd, dur: n.dur, gain: n.gain, at: n.at };
  });
  let dur = fin(BASE_DUR[canonical], 0.2);
  dur = Math.min(SFX_MAX_DUR, Math.max(0.05, dur));
  const clean = nodes.map((n) => {
    const at = Math.max(0, fin(n.at, 0));
    const slot = Math.max(0.01, dur - at);
    return {
      type: n.type,
      freq: fin(n.freq, 440),
      freqEnd: fin(n.freqEnd, 440),
      dur: Math.min(Math.max(0.01, fin(n.dur, 0.1)), slot),
      gain: Math.min(1, Math.max(0, fin(n.gain, 0.5))),
      at,
    };
  });
  return { name: canonical, nodes: clean, dur };
}
