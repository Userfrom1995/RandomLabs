/**
 * Umbra M4 profile bundle: versioned export/import for profile backup.
 * Pure ES module: no DOM, no Math.random, no Date.now.
 */

import { migrateProfile, defaultProfile } from './profile.js';

export const BUNDLE_KIND = 'umbra-profile';
export const BUNDLE_VERSION = 1;

/**
 * Export a profile as a versioned JSON bundle string.
 * @param {unknown} profile profile blob (sanitized via migrateProfile)
 * @returns {string} JSON bundle
 */
export function exportBundle(profile) {
  try {
    const clean = migrateProfile(profile);
    return JSON.stringify({ kind: BUNDLE_KIND, version: BUNDLE_VERSION, profile: clean });
  } catch (err) {
    return JSON.stringify({ kind: BUNDLE_KIND, version: BUNDLE_VERSION, profile: defaultProfile() });
  }
}

/**
 * Import a profile from a bundle string.
 * @param {unknown} text bundle JSON string
 * @returns {{ok:true, profile:object}|{ok:false, reason:string}} result
 */
export function importBundle(text) {
  try {
    if (typeof text !== 'string' || text.trim().length === 0) return { ok: false, reason: 'bad-input' };
    let parsed = null;
    try {
      parsed = JSON.parse(text);
    } catch (err) {
      return { ok: false, reason: 'bad-json' };
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { ok: false, reason: 'bad-bundle' };
    if (parsed.kind !== BUNDLE_KIND) return { ok: false, reason: 'bad-kind' };
    if (parsed.version !== BUNDLE_VERSION) return { ok: false, reason: 'bad-version' };
    if (!parsed.profile || typeof parsed.profile !== 'object' || Array.isArray(parsed.profile)) {
      return { ok: false, reason: 'bad-profile' };
    }
    return { ok: true, profile: migrateProfile(parsed.profile) };
  } catch (err) {
    return { ok: false, reason: 'bad-bundle' };
  }
}
