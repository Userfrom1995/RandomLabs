/**
 * Umbra profile + config schema v1 with migrations.
 * M1 persists config only (tier override, resolution, battery saver,
 * reduced motion). Story/economy fields arrive in M3/M4 via migration.
 * Pure, no DOM.
 */

export const PROFILE_VERSION = 1;
export const CONFIG_PATH = 'config.json';
export const PROFILE_PATH = 'profile.json';

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

/** @returns {object} default M1 profile (config + empty progression shell) */
export function defaultProfile() {
  return {
    version: PROFILE_VERSION,
    config: defaultConfig(),
    progress: { unlockedArenas: [0], unlockedFighters: [], currency: 0 },
  };
}

/**
 * Migrate any stored blob to the current schema (unknown versions reset
 * to defaults rather than crash).
 * @param {unknown} raw stored value
 * @returns {object} valid v1 profile
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
  if (r.progress && typeof r.progress === 'object') {
    if (Array.isArray(r.progress.unlockedArenas)) {
      progress.unlockedArenas = r.progress.unlockedArenas.filter((n) => Number.isInteger(n));
      if (!progress.unlockedArenas.includes(0)) progress.unlockedArenas.unshift(0);
    }
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
