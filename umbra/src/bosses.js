/**
 * Umbra M4 bosses: 3 phased boss defs keyed by story enemy id.
 * Pure ES module: no DOM, no Math.random, no Date.now.
 *
 * Mechanics (all deterministic, driven by the bout tick in engine.js):
 * - vex (summoner): every `summon.every` fight ticks a hollow wisp spawns
 *   at the player's position with `summon.fuse` ticks of telegraph, then
 *   strikes its ground zone.
 * - ruin (duelist): every `duel.every` fight ticks the stance flips between
 *   `duel.stances[0]` and `[1]` (AI archetypes owned by combat/ai.js).
 * - dusk (eclipse): once hp falls to `eclipse.enrageAt` fraction the Envoy
 *   deals `eclipse.power` times damage for the rest of the round.
 * Phase index derives from hp fraction ([1/3, 2/3] cuts); crossing a cut
 * emits a `phase` event whose banner comes from phases[i].banner.
 */

import { ARCHETYPES as AI_ARCHETYPES } from './combat/ai.js';

export const BOSS_IDS = ['vex', 'ruin', 'dusk'];

/** Hp fraction cuts: above cuts[0] is phase 0, between is 1, below cuts[1] is 2. */
export const PHASE_CUTS = [0.66, 0.33];

/**
 * @typedef {object} BossPhase
 * @property {string} name phase title
 * @property {string} banner ring banner shown on entering the phase
 */

/**
 * @typedef {object} BossDef
 * @property {string} id boss id (matches the story enemy id)
 * @property {string} name display name
 * @property {string} enemy roster enemy id this boss upgrades
 * @property {string} lore one-paragraph original backstory
 * @property {'summoner'|'duelist'|'eclipse'} mechanic boss mechanic
 * @property {BossPhase[]} phases exactly 3 escalating phases
 * @property {{every:number, fuse:number, range:number, damage:number, chip:number}} [summon]
 * @property {{every:number, stances:[string,string]}} [duel]
 * @property {{enrageAt:number, power:number}} [eclipse]
 */

/** @type {BossDef[]} */
export const BOSSES = [
  {
    id: 'vex',
    name: 'Vex, the Hollow Choir',
    enemy: 'vex',
    mechanic: 'summoner',
    lore: 'Vex hollowed itself to hold a choir of lesser shadows. When it sings, the sanctum answers, and the answers have teeth.',
    phases: [
      { name: 'The Hollow', banner: 'VEX STANDS SILENT' },
      { name: 'The Choir', banner: 'VEX CALLS THE HOLLOW' },
      { name: 'The Silence', banner: 'THE CHOIR SCREAMS AS ONE' },
    ],
    summon: { every: 300, fuse: 90, range: 0.3, damage: 12, chip: 2 },
  },
  {
    id: 'ruin',
    name: 'Ruin, the Twin Storm',
    enemy: 'ruin',
    mechanic: 'duelist',
    lore: 'The herald carries two tempests: one that charges and one that waits. It changes its weather without warning.',
    phases: [
      { name: 'The Gathering', banner: 'RUIN GATHERS THE STORM' },
      { name: 'The Patient Wind', banner: 'RUIN WEARS THE PATIENT WIND' },
      { name: 'The Collision', banner: 'THE TWIN STORMS COLLIDE' },
    ],
    duel: { every: 420, stances: ['brawler', 'zoner'] },
  },
  {
    id: 'dusk',
    name: 'Dusk, the Eclipse Envoy',
    enemy: 'dusk',
    mechanic: 'eclipse',
    lore: 'As the eclipse deepens, the Envoy stops spending strength and starts spending the sun. Wound it and the dark fights back harder.',
    phases: [
      { name: 'The Watching', banner: 'THE ECLIPSE WATCHES' },
      { name: 'The Thinning', banner: 'THE LIGHT THINS' },
      { name: 'The Raging', banner: 'THE ECLIPSE RAGES' },
    ],
    eclipse: { enrageAt: 0.4, power: 1.35 },
  },
];

/**
 * @param {unknown} enemyId roster enemy id
 * @returns {BossDef|null} boss def or null when the enemy is not a boss
 */
export function bossFor(enemyId) {
  if (typeof enemyId !== 'string') return null;
  return BOSSES.find((b) => b.enemy === enemyId) || null;
}

/**
 * Phase index from remaining-hp fraction (hostile-safe: missing defs,
 * misshapen defs, null/undefined hp, NaN, and out-of-range fractions all
 * fall back to phase 0 or clamp to the nearest valid phase; Number(null)
 * coercing to 0 must never read as a near-death phase 2).
 * @param {BossDef|null} def boss def (null or misshapen yields phase 0)
 * @param {unknown} hpFrac remaining hp fraction 0..1
 * @returns {0|1|2} phase index
 */
export function bossPhaseIndex(def, hpFrac) {
  if (def == null || typeof def !== 'object' || Array.isArray(def)) return 0;
  if (typeof def.id !== 'string' || def.id.length === 0) return 0;
  if (!Array.isArray(def.phases) || def.phases.length !== 3) return 0;
  if (hpFrac == null) return 0;
  const f = Number(hpFrac);
  if (!Number.isFinite(f)) return 0;
  if (f > PHASE_CUTS[0]) return 0;
  if (f > PHASE_CUTS[1]) return 1;
  return 2;
}

const isPosInt = (n) => Number.isInteger(n) && n > 0;
const isNonNeg = (n) => typeof n === 'number' && Number.isFinite(n) && n >= 0;

/**
 * Validate the boss table (shape, phase count, mechanic params).
 * @param {BossDef[]} [defs]
 * @returns {string[]} violations (empty when valid)
 */
export function validateBosses(defs = BOSSES) {
  const problems = [];
  if (!Array.isArray(defs)) return ['boss table is not an array'];
  const seen = new Set();
  for (const b of defs) {
    const tag = `boss:${(b && b.id) || '?'}`;
    if (!b || typeof b !== 'object') {
      problems.push(`${tag}: not an object`);
      continue;
    }
    if (typeof b.id !== 'string' || b.id.length === 0) problems.push(`${tag}: id must be a non-empty string`);
    else if (seen.has(b.id)) problems.push(`${tag}: duplicate id "${b.id}"`);
    else seen.add(b.id);
    for (const field of ['name', 'lore']) {
      if (typeof b[field] !== 'string' || b[field].length === 0) problems.push(`${tag}: ${field} must be a non-empty string`);
    }
    if (typeof b.enemy !== 'string' || b.enemy.length === 0) problems.push(`${tag}: enemy must be a non-empty string`);
    if (!['summoner', 'duelist', 'eclipse'].includes(b.mechanic)) {
      problems.push(`${tag}: mechanic must be summoner, duelist, or eclipse`);
    }
    if (!Array.isArray(b.phases) || b.phases.length !== 3) {
      problems.push(`${tag}: phases must be an array of exactly 3`);
    } else {
      for (const p of b.phases) {
        if (!p || typeof p.name !== 'string' || p.name.length === 0) problems.push(`${tag}: phase name must be non-empty`);
        if (!p || typeof p.banner !== 'string' || p.banner.length === 0) problems.push(`${tag}: phase banner must be non-empty`);
      }
    }
    if (b.mechanic === 'summoner') {
      const s = b.summon || {};
      if (!isPosInt(s.every)) problems.push(`${tag}: summon.every must be a positive integer`);
      if (!isPosInt(s.fuse)) problems.push(`${tag}: summon.fuse must be a positive integer`);
      if (isPosInt(s.every) && isPosInt(s.fuse) && s.every <= s.fuse) {
        problems.push(`${tag}: summon.every must exceed summon.fuse or wisps never resolve`);
      }
      if (!isNonNeg(s.range) || s.range <= 0) problems.push(`${tag}: summon.range must be positive`);
      if (!isNonNeg(s.damage)) problems.push(`${tag}: summon.damage must be >= 0`);
      if (!isNonNeg(s.chip)) problems.push(`${tag}: summon.chip must be >= 0`);
    } else if (b.mechanic === 'duelist') {
      const d = b.duel || {};
      if (!isPosInt(d.every)) problems.push(`${tag}: duel.every must be a positive integer`);
      if (!Array.isArray(d.stances) || d.stances.length !== 2 || !d.stances.every((s) => AI_ARCHETYPES.includes(s))) {
        problems.push(`${tag}: duel.stances must be a pair of AI archetypes (${AI_ARCHETYPES.join(', ')})`);
      }
    } else if (b.mechanic === 'eclipse') {
      const e = b.eclipse || {};
      if (!(typeof e.enrageAt === 'number' && Number.isFinite(e.enrageAt) && e.enrageAt > 0 && e.enrageAt < 1)) {
        problems.push(`${tag}: eclipse.enrageAt must be strictly inside 0..1`);
      }
      if (!(typeof e.power === 'number' && Number.isFinite(e.power) && e.power > 1)) {
        problems.push(`${tag}: eclipse.power must be above 1`);
      }
    }
  }
  return problems;
}
