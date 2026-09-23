/**
 * Umbra profile + config schema with migrations.
 * v1 (M1/M2): config only. v2 (M3): story progress + unlocks
 * (unlockedArenas, unlockedFighters, story.completed/current).
 * M4 economy fields (ownedWeapons, equippedWeapon, upgrades, stats)
 * ride on v2 additively: PROFILE_VERSION stays 2.
 * Pure, no DOM.
 */

export const PROFILE_VERSION = 2;
export const CONFIG_PATH = 'config.json';
export const PROFILE_PATH = 'profile.json';

/**
 * Upper bound on stored ember: bundles that self-grant more clamp here
 * on import, so a hand-edited backup cannot mint unbounded currency.
 */
export const MAX_CURRENCY = 999999;

/** @returns {object} default M1 config */
export function defaultConfig() {
  return {
    version: PROFILE_VERSION,
    tier: 'auto',
    ladderIndex: 1,
    batterySaver: false,
    reducedMotion: false,
  };
}

/** @returns {object} default M3 profile (config + story progression shell) */
export function defaultProfile() {
  return {
    version: PROFILE_VERSION,
    config: defaultConfig(),
    progress: {
      unlockedArenas: [0],
      unlockedFighters: ['kaito'],
      story: { completed: [], current: 'prologue' },
      currency: 0,
      ownedWeapons: ['fists'],
      equippedWeapon: 'fists',
      upgrades: { dmg: 0, hp: 0 },
      stats: { wins: 0, losses: 0, bossWins: 0, trials: [] },
    },
  };
}

/**
 * Migrate any stored blob to the current schema (unknown versions reset
 * to defaults rather than crash).
 * @param {unknown} raw stored value
 * @returns {object} valid v2 profile
 */
export function migrateProfile(raw) {
  const base = defaultProfile();
  if (!raw || typeof raw !== 'object') return base;
  const r = /** @type {any} */ (raw);
  const cfg = { ...base.config };
  if (r.config && typeof r.config === 'object') {
    if (['auto', '0', '1', '2', 0, 1, 2].includes(r.config.tier)) cfg.tier = r.config.tier;
    if (Number.isInteger(r.config.ladderIndex)) {
      cfg.ladderIndex = Math.min(Math.max(r.config.ladderIndex, 0), 3);
    }
    if (typeof r.config.batterySaver === 'boolean') cfg.batterySaver = r.config.batterySaver;
    if (typeof r.config.reducedMotion === 'boolean') cfg.reducedMotion = r.config.reducedMotion;
  }
  const progress = { ...base.progress };
  progress.ownedWeapons = [...base.progress.ownedWeapons];
  progress.upgrades = { ...base.progress.upgrades };
  progress.stats = { ...base.progress.stats, trials: [...base.progress.stats.trials] };
  if (r.progress && typeof r.progress === 'object') {
    if (Array.isArray(r.progress.unlockedArenas)) {
      progress.unlockedArenas = r.progress.unlockedArenas.filter((n) => Number.isInteger(n));
      if (!progress.unlockedArenas.includes(0)) progress.unlockedArenas.unshift(0);
    }
    // v1 profiles predate the fighter roster: every veteran keeps Kaito.
    if (Array.isArray(r.progress.unlockedFighters)) {
      progress.unlockedFighters = r.progress.unlockedFighters.filter((s) => typeof s === 'string');
    }
    if (!progress.unlockedFighters.includes('kaito')) progress.unlockedFighters.unshift('kaito');
    // Story cursor: keep only string ids; the shell rebuilds the live
    // cursor via storyCursor() on every load, so migration just carries
    // the completed list forward (v1 profiles start at the prologue).
    const completed = r.progress.story && Array.isArray(r.progress.story.completed)
      ? r.progress.story.completed.filter((s) => typeof s === 'string')
      : [];
    progress.story = { completed, current: 'prologue' };
    if (completed.length > 0) progress.story.current = completed[completed.length - 1];
    if (Number.isInteger(r.progress.currency) && r.progress.currency >= 0) {
      progress.currency = Math.min(r.progress.currency, MAX_CURRENCY);
    }
    let owned = [...base.progress.ownedWeapons];
    if (Array.isArray(r.progress.ownedWeapons)) {
      owned = r.progress.ownedWeapons.filter((s) => typeof s === 'string' && s.length > 0);
    }
    if (!owned.includes('fists')) owned.unshift('fists');
    progress.ownedWeapons = owned;
    if (typeof r.progress.equippedWeapon === 'string' && owned.includes(r.progress.equippedWeapon)) {
      progress.equippedWeapon = r.progress.equippedWeapon;
    } else {
      progress.equippedWeapon = 'fists';
    }
    const upgrades = { dmg: 0, hp: 0 };
    if (r.progress.upgrades && typeof r.progress.upgrades === 'object') {
      for (const track of ['dmg', 'hp']) {
        const v = r.progress.upgrades[track];
        if (typeof v === 'number' && Number.isFinite(v)) {
          upgrades[track] = Math.min(Math.max(Math.floor(v), 0), 4);
        }
      }
    }
    progress.upgrades = upgrades;
    const stats = { wins: 0, losses: 0, bossWins: 0, trials: [] };
    if (r.progress.stats && typeof r.progress.stats === 'object') {
      for (const key of ['wins', 'losses', 'bossWins']) {
        const v = r.progress.stats[key];
        if (Number.isInteger(v) && v >= 0) stats[key] = v;
      }
      if (Array.isArray(r.progress.stats.trials)) {
        stats.trials = r.progress.stats.trials.filter((s) => typeof s === 'string');
      }
    }
    progress.stats = stats;
  }
  return { version: PROFILE_VERSION, config: cfg, progress };
}

/**
 * @param {import('./provider.js').StorageProvider} provider
 * @returns {Promise<object>} migrated profile (defaults on first run)
 */
export async function loadProfile(provider) {
  const raw = await provider.readJSON(PROFILE_PATH);
  if (raw == null) return defaultProfile();
  return migrateProfile(raw);
}

/**
 * @param {import('./provider.js').StorageProvider} provider
 * @param {object} profile
 * @returns {Promise<void>}
 */
export async function saveProfile(provider, profile) {
  const clean = migrateProfile(profile);
  await provider.writeJSON(PROFILE_PATH, clean);
}
