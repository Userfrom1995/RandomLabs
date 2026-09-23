/**
 * Umbra M3 roster: 3 playable fighters + 5 enemy archetypes as pure DATA.
 * No DOM, no Math.random, no Date.now. Safe to import in Node tests.
 *
 * Stat contract (all gameplay-affecting fields are consumed by real code):
 * - hp: bout hit points (applied per side at fight setup; the engine
 *   already preserves asymmetric maxHp across rounds).
 * - ai / difficulty: CPU temperament when this character is the opponent
 *   (ARCHETYPES + 0..2 tiers from src/combat/ai.js).
 * - rig: silhouette proportions fed to solveRig() (visual identity).
 * - accent: rim-light tint [r,g,b] 0..1 (presentation identity).
 * - power / speed / technique: 1..5 display ratings shown on the select
 *   screen (flavor; damage/speed modifiers arrive with M4 weapons).
 * - unlock: null (available from the start) or { node } story node id
 *   whose completion unlocks the entry (validated against story.js).
 */

import { ARCHETYPES } from './combat/ai.js';

/**
 * @typedef {object} RigDef
 * @property {number} height vertical scale 0.85..1.15
 * @property {number} bulk width scale 0.8..1.3
 * @property {number} head head capsule scale 0.85..1.2
 * @property {number} limb arm/leg length scale 0.85..1.15
 */

/**
 * @typedef {object} FighterDef
 * @property {string} id unique across playables + enemies
 * @property {string} name display name
 * @property {string} epithet short title
 * @property {string} lore one-paragraph original backstory
 * @property {number} hp bout hit points
 * @property {string} ai AI archetype id
 * @property {0|1|2} difficulty AI difficulty tier
 * @property {RigDef} rig silhouette proportions
 * @property {[number,number,number]} accent rim-light tint
 * @property {{power:number, speed:number, technique:number}} ratings 1..5 display ratings
 * @property {{node:string}|null} unlock story unlock rule (null = starter)
 */

/** Identity rig: solveRig() defaults produce bit-identical output. */
export const IDENTITY_RIG = Object.freeze({ height: 1, bulk: 1, head: 1, limb: 1 });

/** @type {FighterDef[]} */
export const PLAYABLES = [
  {
    id: 'kaito',
    name: 'Kaito',
    epithet: 'the Ronin',
    lore: 'A masterless blade who walked into the Ashen Veil to find the lord he failed. The Veil kept his shadow and gave him a second road: gather the five Ember Seals and close the Gate of Dusk.',
    hp: 100,
    ai: 'brawler',
    difficulty: 1,
    rig: { ...IDENTITY_RIG },
    accent: [0.45, 0.75, 1.0],
    ratings: { power: 3, speed: 3, technique: 3 },
    unlock: null,
  },
  {
    id: 'mira',
    name: 'Mira',
    epithet: 'the Duelist',
    lore: 'A storm-fencer who dueled the lightning and lost only her name. She fights at long measure with needle kicks, and joined Kaito when the Forge fires spelled out her true name in sparks.',
    hp: 85,
    ai: 'zoner',
    difficulty: 1,
    rig: { height: 1.07, bulk: 0.88, head: 0.92, limb: 1.12 },
    accent: [0.55, 1.0, 0.7],
    ratings: { power: 2, speed: 5, technique: 4 },
    unlock: { node: 'a1-outro' },
  },
  {
    id: 'goran',
    name: 'Goran',
    epithet: 'the Bulwark',
    lore: 'A siege-breaker who carried a fallen gate on his back for nine days. The Void hollowed his memories but left his guard unbroken. He lends his wall of a body to whoever stands against the Eclipse.',
    hp: 130,
    ai: 'turtle',
    difficulty: 1,
    rig: { height: 0.94, bulk: 1.26, head: 1.12, limb: 0.9 },
    accent: [1.0, 0.6, 0.25],
    ratings: { power: 5, speed: 2, technique: 3 },
    unlock: { node: 'a3-outro' },
  },
];

/** @type {FighterDef[]} */
export const ENEMIES = [
  {
    id: 'echo',
    name: 'Echo',
    epithet: 'the Reflection',
    lore: 'The first guardian of the Veil: your own shadow, given pride and a guard stance. It knows every move you know, because it learned them from you.',
    hp: 90,
    ai: 'brawler',
    difficulty: 0,
    rig: { height: 1.0, bulk: 0.95, head: 1.0, limb: 1.0 },
    accent: [0.6, 0.65, 0.9],
    ratings: { power: 2, speed: 3, technique: 2 },
    unlock: null,
  },
  {
    id: 'ash',
    name: 'Ash',
    epithet: 'the Forge Hound',
    lore: 'A furnace-spirit that slipped its chains when the Ember Forge went cold. It rushes like a bellows blast and hits like a dropped anvil.',
    hp: 110,
    ai: 'brawler',
    difficulty: 1,
    rig: { height: 0.97, bulk: 1.18, head: 1.05, limb: 0.95 },
    accent: [1.0, 0.5, 0.2],
    ratings: { power: 4, speed: 3, technique: 1 },
    unlock: null,
  },
  {
    id: 'ruin',
    name: 'Ruin',
    epithet: 'the Storm Herald',
    lore: 'Once the bridge-keeper of the high pass, now a trumpet of static and rain. It keeps its distance and lashes out with long, crackling kicks.',
    hp: 115,
    ai: 'zoner',
    difficulty: 1,
    rig: { height: 1.1, bulk: 0.9, head: 0.9, limb: 1.14 },
    accent: [0.5, 0.85, 1.0],
    ratings: { power: 3, speed: 4, technique: 3 },
    unlock: null,
  },
  {
    id: 'vex',
    name: 'Vex',
    epithet: 'the Hollow',
    lore: 'A sanctum monk who meditated until only the guard remained. It barely moves, barely blinks, and punishes everything you try.',
    hp: 120,
    ai: 'turtle',
    difficulty: 2,
    rig: { height: 1.02, bulk: 1.05, head: 0.88, limb: 1.0 },
    accent: [0.7, 0.45, 1.0],
    ratings: { power: 3, speed: 1, technique: 5 },
    unlock: null,
  },
  {
    id: 'dusk',
    name: 'Dusk',
    epithet: 'the Eclipse Envoy',
    lore: 'The Eclipse speaks through this tall shadow, and its terms are simple: kneel, and keep your light. It fights like the end of the day feels.',
    hp: 140,
    ai: 'brawler',
    difficulty: 2,
    rig: { height: 1.12, bulk: 1.08, head: 1.0, limb: 1.08 },
    accent: [1.0, 0.7, 0.4],
    ratings: { power: 5, speed: 4, technique: 4 },
    unlock: null,
  },
];

/**
 * @param {string} id fighter id
 * @returns {FighterDef|null} def or null when unknown
 */
export function fighterById(id) {
  if (typeof id !== 'string') return null;
  return PLAYABLES.find((f) => f.id === id) || ENEMIES.find((f) => f.id === id) || null;
}

const isHp = (n) => Number.isInteger(n) && n >= 1 && n <= 300;
const isUnit = (n) => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1;
const isRating = (n) => Number.isInteger(n) && n >= 1 && n <= 5;
const inRange = (n, lo, hi) => typeof n === 'number' && Number.isFinite(n) && n >= lo && n <= hi;

/**
 * Validate the full roster (shape, ranges, uniqueness, AI refs).
 * Story-node unlock refs are validated in story.js (it owns the graph).
 * @param {FighterDef[]} [playables]
 * @param {FighterDef[]} [enemies]
 * @returns {string[]} violations (empty when valid)
 */
export function validateRoster(playables = PLAYABLES, enemies = ENEMIES) {
  const problems = [];
  if (!Array.isArray(playables) || playables.length === 0) problems.push('playables must be a non-empty array');
  if (!Array.isArray(enemies) || enemies.length === 0) problems.push('enemies must be a non-empty array');
  const seen = new Set();
  for (const [group, list] of [['playable', playables || []], ['enemy', enemies || []]]) {
    for (const f of list) {
      const tag = `${group}:${(f && f.id) || '?'}`;
      if (!f || typeof f !== 'object') {
        problems.push(`${tag}: not an object`);
        continue;
      }
      if (typeof f.id !== 'string' || f.id.length === 0) problems.push(`${tag}: id must be a non-empty string`);
      else if (seen.has(f.id)) problems.push(`${tag}: duplicate id "${f.id}"`);
      else seen.add(f.id);
      for (const field of ['name', 'epithet', 'lore']) {
        if (typeof f[field] !== 'string' || f[field].length === 0) problems.push(`${tag}: ${field} must be a non-empty string`);
      }
      if (!isHp(f.hp)) problems.push(`${tag}: hp must be an integer 1..300, got ${f.hp}`);
      if (!ARCHETYPES.includes(f.ai)) problems.push(`${tag}: ai must be one of ${ARCHETYPES.join(',')}, got ${f.ai}`);
      if (![0, 1, 2].includes(f.difficulty)) problems.push(`${tag}: difficulty must be 0, 1, or 2, got ${f.difficulty}`);
      const rig = f.rig;
      if (!rig || typeof rig !== 'object') problems.push(`${tag}: rig must be an object`);
      else {
        if (!inRange(rig.height, 0.85, 1.15)) problems.push(`${tag}: rig.height out of range`);
        if (!inRange(rig.bulk, 0.8, 1.3)) problems.push(`${tag}: rig.bulk out of range`);
        if (!inRange(rig.head, 0.85, 1.2)) problems.push(`${tag}: rig.head out of range`);
        if (!inRange(rig.limb, 0.85, 1.15)) problems.push(`${tag}: rig.limb out of range`);
      }
      if (!Array.isArray(f.accent) || f.accent.length !== 3 || !f.accent.every(isUnit)) {
        problems.push(`${tag}: accent must be [r,g,b] in 0..1`);
      }
      for (const r of ['power', 'speed', 'technique']) {
        if (!f.ratings || !isRating(f.ratings[r])) problems.push(`${tag}: ratings.${r} must be an integer 1..5`);
      }
      if (f.unlock != null && (typeof f.unlock !== 'object' || typeof f.unlock.node !== 'string')) {
        problems.push(`${tag}: unlock must be null or { node: string }`);
      }
    }
  }
  return problems;
}
