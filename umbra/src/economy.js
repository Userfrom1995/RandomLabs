/**
 * Umbra M4 economy: currency awards, upgrades, shop mutations.
 * Pure ES module: no DOM, no Math.random, no Date.now.
 */

import { weaponById } from './weapons.js';

export const AWARD_WIN = 60;
export const AWARD_ROUND_BONUS = 15;
export const AWARD_LOSS = 15;
export const AWARD_DRAW = 25;
export const AWARD_BOSS_BONUS = 120;
export const JACKPOT_EVERY = 5;
export const JACKPOT_BONUS = 100;

export const UPGRADE_TRACKS = ['dmg', 'hp'];
export const MAX_UPGRADE = 4;

/**
 * Bounds: round bonuses stop accruing past this many rounds, and stored
 * currency never exceeds this cap (bundle airlock clamps on import).
 */
export const MAX_BONUS_ROUNDS = 10;
export const MAX_CURRENCY = 999999;

/**
 * Sanitize a numeric input to a non-negative integer.
 * @param {unknown} value raw value
 * @param {number} fallback used when non-finite
 * @returns {number} non-negative integer
 */
function toNonNegInt(value, fallback = 0) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  const floored = Math.floor(value);
  return floored < 0 ? 0 : floored;
}

/**
 * Compute the currency award for a bout outcome.
 * @param {object} [opts] award options
 * @param {string} [opts.outcome] win/loss/draw (anything else treated as loss)
 * @param {number} [opts.roundsWon] player rounds won
 * @param {boolean} [opts.boss] beaten foe is a boss
 * @param {number} [opts.careerWins] career wins before this bout
 * @returns {{currency:number, jackpot:boolean, parts:{base:number, rounds:number, boss:number, jackpot:number}}}
 */
export function awardFor(opts = {}) {
  try {
    const o = opts && typeof opts === 'object' ? opts : {};
    const outcome = typeof o.outcome === 'string' ? o.outcome : 'loss';
    const roundsWon = Math.min(toNonNegInt(o.roundsWon, 0), MAX_BONUS_ROUNDS);
    const careerWins = toNonNegInt(o.careerWins, 0);
    const boss = !!o.boss;
    if (outcome === 'win') {
      const base = AWARD_WIN;
      const rounds = AWARD_ROUND_BONUS * roundsWon;
      const bossAmt = boss ? AWARD_BOSS_BONUS : 0;
      const jackpot = (careerWins + 1) % JACKPOT_EVERY === 0;
      const jackpotAmt = jackpot ? JACKPOT_BONUS : 0;
      return {
        currency: base + rounds + bossAmt + jackpotAmt,
        jackpot,
        parts: { base, rounds, boss: bossAmt, jackpot: jackpotAmt },
      };
    }
    if (outcome === 'draw') {
      return {
        currency: AWARD_DRAW,
        jackpot: false,
        parts: { base: AWARD_DRAW, rounds: 0, boss: 0, jackpot: 0 },
      };
    }
    return {
      currency: AWARD_LOSS,
      jackpot: false,
      parts: { base: AWARD_LOSS, rounds: 0, boss: 0, jackpot: 0 },
    };
  } catch (err) {
    return {
      currency: AWARD_LOSS,
      jackpot: false,
      parts: { base: AWARD_LOSS, rounds: 0, boss: 0, jackpot: 0 },
    };
  }
}

/**
 * Cost of the next upgrade level.
 * @param {string} track upgrade track id
 * @param {number} level current level
 * @returns {number|null} price or null when maxed/unknown
 */
export function upgradeCost(track, level) {
  try {
    if (!UPGRADE_TRACKS.includes(track)) return null;
    if (typeof level !== 'number' || !Number.isFinite(level)) return null;
    const lv = Math.floor(level);
    if (lv < 0 || lv >= MAX_UPGRADE) return null;
    return 100 * (lv + 1);
  } catch (err) {
    return null;
  }
}

/**
 * Effect of an upgrade track at a level.
 * @param {string} track upgrade track id
 * @param {number} level upgrade level
 * @returns {number|null} multiplier (dmg) or flat hp, null when unknown
 */
export function upgradeEffect(track, level) {
  try {
    if (!UPGRADE_TRACKS.includes(track)) return null;
    let lv = 0;
    if (typeof level === 'number' && Number.isFinite(level)) lv = Math.floor(level);
    if (lv < 0) lv = 0;
    if (lv > MAX_UPGRADE) lv = MAX_UPGRADE;
    if (track === 'dmg') return 1 + 0.08 * lv;
    return 12 * lv;
  } catch (err) {
    return null;
  }
}

/**
 * Read sanitized currency from a profile.
 * @param {unknown} profile profile blob
 * @returns {number|null} currency or null when no progress object
 */
function progressCurrency(profile) {
  const progress = profile && typeof profile === 'object' ? profile.progress : null;
  if (!progress || typeof progress !== 'object') return null;
  if (typeof progress.currency === 'number' && Number.isFinite(progress.currency) && progress.currency >= 0) {
    return Math.min(Math.floor(progress.currency), MAX_CURRENCY);
  }
  return 0;
}

/**
 * Whether the profile can afford a cost.
 * @param {unknown} profile profile blob
 * @param {number} cost price to check
 * @returns {boolean} true when affordable
 */
export function canAfford(profile, cost) {
  try {
    const funds = progressCurrency(profile);
    if (funds == null) return false;
    if (typeof cost !== 'number' || !Number.isFinite(cost) || cost < 0) return false;
    return funds >= cost;
  } catch (err) {
    return false;
  }
}

/**
 * Buy a weapon: deducts currency and records ownership. The charge always
 * comes from the canonical weapon def, never from the caller's price
 * argument: unknown ids fail closed and discounted caller prices are
 * rejected instead of honored.
 * @param {object} profile profile (progress mutated in place)
 * @param {string} weaponId weapon id
 * @param {number} price caller-quoted price (must match the canonical cost)
 * @returns {{ok:boolean, reason:string}} result
 */
export function buyWeapon(profile, weaponId, price) {
  try {
    if (!profile || typeof profile !== 'object') return { ok: false, reason: 'bad-profile' };
    const progress = profile.progress;
    if (!progress || typeof progress !== 'object') return { ok: false, reason: 'bad-profile' };
    const def = weaponById(weaponId);
    if (!def) return { ok: false, reason: 'bad-weapon' };
    if (typeof price !== 'number' || !Number.isFinite(price) || price < 0) return { ok: false, reason: 'bad-price' };
    if (Math.floor(price) !== def.price) return { ok: false, reason: 'bad-price' };
    const cost = def.price;
    if (!Array.isArray(progress.ownedWeapons)) progress.ownedWeapons = ['fists'];
    if (progress.ownedWeapons.includes(weaponId)) return { ok: false, reason: 'owned' };
    let funds = progressCurrency(profile);
    if (funds == null) return { ok: false, reason: 'bad-profile' };
    if (typeof progress.currency !== 'number' || !Number.isFinite(progress.currency) || progress.currency < 0) {
      progress.currency = funds;
    } else {
      progress.currency = Math.floor(progress.currency);
      funds = progress.currency;
    }
    if (funds < cost) return { ok: false, reason: 'funds' };
    progress.currency = funds - cost;
    progress.ownedWeapons.push(weaponId);
    return { ok: true, reason: 'ok' };
  } catch (err) {
    return { ok: false, reason: 'bad-profile' };
  }
}

/**
 * Buy the next upgrade level on a track.
 * @param {object} profile profile (progress mutated in place)
 * @param {string} track upgrade track id
 * @returns {{ok:boolean, reason:string, cost:number|null}} result
 */
export function buyUpgrade(profile, track) {
  try {
    if (!profile || typeof profile !== 'object') return { ok: false, reason: 'bad-profile', cost: null };
    const progress = profile.progress;
    if (!progress || typeof progress !== 'object') return { ok: false, reason: 'bad-profile', cost: null };
    if (!UPGRADE_TRACKS.includes(track)) return { ok: false, reason: 'bad-track', cost: null };
    if (!progress.upgrades || typeof progress.upgrades !== 'object') {
      progress.upgrades = { dmg: 0, hp: 0 };
    }
    let current = progress.upgrades[track];
    if (typeof current === 'number' && Number.isFinite(current)) {
      current = Math.floor(current);
      if (current < 0) current = 0;
      if (current > MAX_UPGRADE) current = MAX_UPGRADE;
    } else {
      current = 0;
    }
    progress.upgrades[track] = current;
    if (current >= MAX_UPGRADE) return { ok: false, reason: 'maxed', cost: null };
    const cost = upgradeCost(track, current);
    if (cost == null) return { ok: false, reason: 'maxed', cost: null };
    let funds = progressCurrency(profile);
    if (funds == null) return { ok: false, reason: 'bad-profile', cost: null };
    if (typeof progress.currency !== 'number' || !Number.isFinite(progress.currency) || progress.currency < 0) {
      progress.currency = funds;
    } else {
      progress.currency = Math.floor(progress.currency);
      funds = progress.currency;
    }
    if (funds < cost) return { ok: false, reason: 'funds', cost };
    progress.currency = funds - cost;
    progress.upgrades[track] = current + 1;
    return { ok: true, reason: 'ok', cost };
  } catch (err) {
    return { ok: false, reason: 'bad-profile', cost: null };
  }
}
