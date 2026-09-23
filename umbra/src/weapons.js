/**
 * Umbra M4 weapons: six weapon defs plus one tuned move table per weapon.
 * Pure ES module: no DOM, no Math.random, no Date.now.
 *
 * The fists table carries the same content as the canonical MOVES object
 * but is owned (deep-copied) by this module, so a console write through
 * WEAPON_TABLES.fists can never desync the M2-tested sim path. Every
 * table is deep-frozen, and movesForWeapon hands out a mutable deep copy,
 * so callers can never pollute the canonicals. The bout owns a frozen
 * copy via copyMoves, as before.
 */

import { MOVES, validateMoves } from './combat/moves.js';

/**
 * @typedef {object} WeaponTrail
 * @property {[number, number, number]} color trail tint as [r, g, b] floats 0..1
 * @property {number} width trail ribbon width in arena units (0 exclusive to 0.1 inclusive)
 */

/**
 * @typedef {object} WeaponDef
 * @property {string} id unique weapon id (one of WEAPON_IDS)
 * @property {string} name display name
 * @property {string} epithet short title
 * @property {string} lore one original sentence of flavor text
 * @property {number} price shop price (non-negative integer)
 * @property {WeaponTrail} trail presentation trail style
 * @property {number} length reach in arena units (float 0..0.5)
 * @property {null} unlock availability rule (null means starter or shop item)
 */

/**
 * @typedef {import('./combat/types.js').MoveDef} MoveDef
 */

/** Canonical weapon ids in display order. */
export const WEAPON_IDS = ['fists', 'sword', 'nunchaku', 'spear', 'staff', 'daggers'];

/** Canonical move ids every weapon table must carry exactly. */
const MOVE_IDS = ['jab', 'cross', 'kick', 'sweep', 'uppercut'];

/** Canonical pose names every move must reference. */
const POSE_IDS = ['jab', 'cross', 'kick', 'sweep', 'uppercut'];

/** @type {WeaponDef[]} */
export const WEAPONS = [
  {
    id: 'fists',
    name: 'Fists',
    epithet: 'the Bare Hands',
    lore: 'Wraps worn thin by a hundred practice bouts still remember every block they ever caught.',
    price: 0,
    trail: { color: [0.9, 0.9, 0.9], width: 0.012 },
    length: 0.06,
    unlock: null,
  },
  {
    id: 'sword',
    name: 'Sword',
    epithet: 'the Bright Oath',
    lore: 'A forge folded blade that sings once when drawn and answers every duel with the same bright note.',
    price: 350,
    trail: { color: [0.45, 0.75, 1.0], width: 0.02 },
    length: 0.34,
    unlock: null,
  },
  {
    id: 'nunchaku',
    name: 'Nunchaku',
    epithet: 'the Twin Echo',
    lore: 'Twin oak rods joined by a short chain that turns each blocked strike into a faster return.',
    price: 450,
    trail: { color: [1.0, 0.6, 0.2], width: 0.016 },
    length: 0.3,
    unlock: null,
  },
  {
    id: 'spear',
    name: 'Spear',
    epithet: 'the Long Watch',
    lore: 'A long ash shaft tipped with dusk steel that keeps the foe at the far edge of the circle.',
    price: 550,
    trail: { color: [0.55, 1.0, 0.6], width: 0.012 },
    length: 0.46,
    unlock: null,
  },
  {
    id: 'staff',
    name: 'Staff',
    epithet: 'the Even Branch',
    lore: 'A seasoned bo staff balanced for wide sweeps that control the ground around its bearer.',
    price: 250,
    trail: { color: [0.75, 0.5, 1.0], width: 0.016 },
    length: 0.4,
    unlock: null,
  },
  {
    id: 'daggers',
    name: 'Daggers',
    epithet: 'the Quick Pair',
    lore: 'A pair of short ember knives made for quick close cuts that trade reach for speed.',
    price: 150,
    trail: { color: [1.0, 0.3, 0.35], width: 0.01 },
    length: 0.16,
    unlock: null,
  },
];

/**
 * Deep-copy a move table (moves plus their cancelInto arrays).
 * @param {Record<string, MoveDef>} table source table
 * @returns {Record<string, MoveDef>} mutable owned copy
 */
function copyTable(table) {
  const out = {};
  for (const [key, m] of Object.entries(table)) {
    out[key] = { ...m, cancelInto: Array.isArray(m?.cancelInto) ? [...m.cancelInto] : [] };
  }
  return out;
}

/**
 * Deep-freeze a move table in place (each move object, then the table).
 * @param {Record<string, MoveDef>} table table to freeze
 * @returns {Record<string, MoveDef>} the same table, frozen
 */
function freezeTable(table) {
  for (const m of Object.values(table)) {
    if (m && typeof m === 'object') {
      if (Array.isArray(m.cancelInto)) Object.freeze(m.cancelInto);
      Object.freeze(m);
    }
  }
  return Object.freeze(table);
}

/** @type {Record<string, Record<string, MoveDef>>} */
export const WEAPON_TABLES = {
  fists: copyTable(MOVES),
  sword: {
    jab: {
      id: 'jab',
      startup: 5,
      active: 3,
      recovery: 9,
      range: 0.26,
      damage: 8,
      chip: 2,
      knockback: 0.07,
      stun: 14,
      cancelInto: ['cross'],
      pose: 'jab',
      sfx: 'sword-swing',
    },
    cross: {
      id: 'cross',
      startup: 7,
      active: 3,
      recovery: 12,
      range: 0.28,
      damage: 12,
      chip: 2,
      knockback: 0.1,
      stun: 18,
      cancelInto: ['uppercut'],
      pose: 'cross',
      sfx: 'sword-slash',
    },
    kick: {
      id: 'kick',
      startup: 9,
      active: 4,
      recovery: 14,
      range: 0.32,
      damage: 13,
      chip: 3,
      knockback: 0.12,
      stun: 20,
      cancelInto: ['sweep'],
      pose: 'kick',
      sfx: 'sword-kick',
    },
    sweep: {
      id: 'sweep',
      startup: 11,
      active: 4,
      recovery: 18,
      range: 0.34,
      damage: 14,
      chip: 3,
      knockback: 0.16,
      stun: 28,
      cancelInto: [],
      pose: 'sweep',
      sfx: 'sword-sweep',
    },
    uppercut: {
      id: 'uppercut',
      startup: 10,
      active: 4,
      recovery: 20,
      range: 0.26,
      damage: 22,
      chip: 4,
      knockback: 0.2,
      stun: 26,
      cancelInto: [],
      pose: 'uppercut',
      sfx: 'sword-uppercut',
    },
  },
  nunchaku: {
    jab: {
      id: 'jab',
      startup: 3,
      active: 2,
      recovery: 5,
      range: 0.2,
      damage: 5,
      chip: 1,
      knockback: 0.04,
      stun: 10,
      cancelInto: ['cross', 'kick'],
      pose: 'jab',
      sfx: 'nunchaku-snap',
    },
    cross: {
      id: 'cross',
      startup: 5,
      active: 2,
      recovery: 7,
      range: 0.22,
      damage: 8,
      chip: 1,
      knockback: 0.06,
      stun: 14,
      cancelInto: ['uppercut', 'kick'],
      pose: 'cross',
      sfx: 'nunchaku-spin',
    },
    kick: {
      id: 'kick',
      startup: 6,
      active: 3,
      recovery: 9,
      range: 0.28,
      damage: 10,
      chip: 2,
      knockback: 0.08,
      stun: 16,
      cancelInto: ['sweep', 'cross'],
      pose: 'kick',
      sfx: 'nunchaku-kick',
    },
    sweep: {
      id: 'sweep',
      startup: 9,
      active: 3,
      recovery: 13,
      range: 0.28,
      damage: 11,
      chip: 2,
      knockback: 0.12,
      stun: 22,
      cancelInto: [],
      pose: 'sweep',
      sfx: 'nunchaku-sweep',
    },
    uppercut: {
      id: 'uppercut',
      startup: 8,
      active: 3,
      recovery: 15,
      range: 0.2,
      damage: 14,
      chip: 2,
      knockback: 0.15,
      stun: 22,
      cancelInto: ['sweep'],
      pose: 'uppercut',
      sfx: 'nunchaku-rising',
    },
  },
  spear: {
    jab: {
      id: 'jab',
      startup: 6,
      active: 3,
      recovery: 10,
      range: 0.3,
      damage: 7,
      chip: 1,
      knockback: 0.07,
      stun: 14,
      cancelInto: ['cross'],
      pose: 'jab',
      sfx: 'spear-thrust',
    },
    cross: {
      id: 'cross',
      startup: 8,
      active: 3,
      recovery: 13,
      range: 0.32,
      damage: 10,
      chip: 2,
      knockback: 0.11,
      stun: 18,
      cancelInto: ['uppercut'],
      pose: 'cross',
      sfx: 'spear-poke',
    },
    kick: {
      id: 'kick',
      startup: 10,
      active: 4,
      recovery: 15,
      range: 0.44,
      damage: 12,
      chip: 2,
      knockback: 0.14,
      stun: 20,
      cancelInto: ['sweep'],
      pose: 'kick',
      sfx: 'spear-kick',
    },
    sweep: {
      id: 'sweep',
      startup: 13,
      active: 4,
      recovery: 19,
      range: 0.46,
      damage: 13,
      chip: 2,
      knockback: 0.18,
      stun: 28,
      cancelInto: [],
      pose: 'sweep',
      sfx: 'spear-sweep',
    },
    uppercut: {
      id: 'uppercut',
      startup: 11,
      active: 4,
      recovery: 21,
      range: 0.3,
      damage: 18,
      chip: 3,
      knockback: 0.22,
      stun: 26,
      cancelInto: [],
      pose: 'uppercut',
      sfx: 'spear-rising',
    },
  },
  staff: {
    jab: {
      id: 'jab',
      startup: 4,
      active: 3,
      recovery: 8,
      range: 0.28,
      damage: 6,
      chip: 1,
      knockback: 0.06,
      stun: 13,
      cancelInto: ['cross'],
      pose: 'jab',
      sfx: 'staff-tap',
    },
    cross: {
      id: 'cross',
      startup: 6,
      active: 3,
      recovery: 11,
      range: 0.3,
      damage: 9,
      chip: 2,
      knockback: 0.09,
      stun: 17,
      cancelInto: ['uppercut'],
      pose: 'cross',
      sfx: 'staff-strike',
    },
    kick: {
      id: 'kick',
      startup: 8,
      active: 4,
      recovery: 13,
      range: 0.38,
      damage: 11,
      chip: 2,
      knockback: 0.11,
      stun: 19,
      cancelInto: ['sweep'],
      pose: 'kick',
      sfx: 'staff-kick',
    },
    sweep: {
      id: 'sweep',
      startup: 10,
      active: 4,
      recovery: 17,
      range: 0.4,
      damage: 15,
      chip: 3,
      knockback: 0.16,
      stun: 28,
      cancelInto: [],
      pose: 'sweep',
      sfx: 'staff-sweep',
    },
    uppercut: {
      id: 'uppercut',
      startup: 9,
      active: 4,
      recovery: 19,
      range: 0.28,
      damage: 17,
      chip: 3,
      knockback: 0.19,
      stun: 25,
      cancelInto: [],
      pose: 'uppercut',
      sfx: 'staff-rising',
    },
  },
  daggers: {
    jab: {
      id: 'jab',
      startup: 3,
      active: 2,
      recovery: 5,
      range: 0.16,
      damage: 4,
      chip: 1,
      knockback: 0.03,
      stun: 10,
      cancelInto: ['cross'],
      pose: 'jab',
      sfx: 'dagger-slash',
    },
    cross: {
      id: 'cross',
      startup: 5,
      active: 2,
      recovery: 7,
      range: 0.18,
      damage: 6,
      chip: 1,
      knockback: 0.05,
      stun: 12,
      cancelInto: ['uppercut'],
      pose: 'cross',
      sfx: 'dagger-stab',
    },
    kick: {
      id: 'kick',
      startup: 6,
      active: 3,
      recovery: 9,
      range: 0.22,
      damage: 8,
      chip: 1,
      knockback: 0.07,
      stun: 14,
      cancelInto: ['sweep'],
      pose: 'kick',
      sfx: 'dagger-kick',
    },
    sweep: {
      id: 'sweep',
      startup: 8,
      active: 3,
      recovery: 12,
      range: 0.22,
      damage: 9,
      chip: 1,
      knockback: 0.1,
      stun: 20,
      cancelInto: [],
      pose: 'sweep',
      sfx: 'dagger-sweep',
    },
    uppercut: {
      id: 'uppercut',
      startup: 7,
      active: 3,
      recovery: 14,
      range: 0.16,
      damage: 11,
      chip: 2,
      knockback: 0.12,
      stun: 20,
      cancelInto: [],
      pose: 'uppercut',
      sfx: 'dagger-rising',
    },
  },
};

/**
 * Look up a weapon def by id.
 * @param {unknown} id weapon id
 * @returns {WeaponDef|null} def or null when the id is not a known string
 */
export function weaponById(id) {
  try {
    if (typeof id !== 'string') return null;
    return WEAPONS.find((w) => w.id === id) || null;
  } catch {
    return null;
  }
}

for (const table of Object.values(WEAPON_TABLES)) freezeTable(table);
Object.freeze(WEAPON_TABLES);

/**
 * Look up the move table for a weapon id. Always returns a fresh mutable
 * deep copy (falling back to a fists copy for unknown ids), so callers
 * can never mutate the frozen canonicals.
 * @param {unknown} id weapon id
 * @returns {Record<string, MoveDef>} owned copy of the table for the id
 */
export function movesForWeapon(id) {
  try {
    const table = typeof id === 'string' ? WEAPON_TABLES[id] : null;
    if (table != null && typeof table === 'object') return copyTable(table);
    return copyTable(WEAPON_TABLES.fists);
  } catch {
    return copyTable(WEAPON_TABLES.fists);
  }
}

const isPrice = (n) => Number.isInteger(n) && n >= 0;
const isUnit = (n) => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1;
const isLength = (n) => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 0.5;

/**
 * Validate weapon defs and their move tables.
 * @param {WeaponDef[]} [defs] weapon defs to check (defaults to WEAPONS)
 * @param {Record<string, Record<string, MoveDef>>} [tables] tables to check (defaults to WEAPON_TABLES)
 * @returns {string[]} violations (empty when valid)
 */
export function validateWeapons(defs = WEAPONS, tables = WEAPON_TABLES) {
  const problems = [];
  try {
    if (!Array.isArray(defs)) {
      problems.push('defs must be an array');
    } else {
      const seen = new Set();
      for (const def of defs) {
        const tag = 'weapon:' + ((def && def.id) || '?');
        if (def == null || typeof def !== 'object') {
          problems.push(tag + ': not an object');
          continue;
        }
        if (typeof def.id !== 'string' || def.id.length === 0) {
          problems.push(tag + ': id must be a non-empty string');
        } else if (seen.has(def.id)) {
          problems.push(tag + ': duplicate id ' + def.id);
        } else {
          seen.add(def.id);
          if (!WEAPON_IDS.includes(def.id)) {
            problems.push(tag + ': unknown id ' + def.id);
          }
        }
        for (const field of ['name', 'epithet', 'lore']) {
          if (typeof def[field] !== 'string' || def[field].length === 0) {
            problems.push(tag + ': ' + field + ' must be a non-empty string');
          }
        }
        if (!isPrice(def.price)) {
          problems.push(tag + ': price must be a non-negative integer, got ' + String(def.price));
        }
        const trail = def.trail;
        if (trail == null || typeof trail !== 'object') {
          problems.push(tag + ': trail must be an object');
        } else {
          const color = trail.color;
          if (!Array.isArray(color) || color.length !== 3 || !color.every(isUnit)) {
            problems.push(tag + ': trail.color must be [r,g,b] in 0..1');
          }
          if (typeof trail.width !== 'number' || !Number.isFinite(trail.width) || trail.width <= 0 || trail.width > 0.1) {
            problems.push(tag + ': trail.width must be in arena units 0..0.1, got ' + String(trail.width));
          }
        }
        if (!isLength(def.length)) {
          problems.push(tag + ': length must be 0..0.5, got ' + String(def.length));
        }
        if (def.unlock !== null) {
          problems.push(tag + ': unlock must be null');
        }
      }
      for (const id of WEAPON_IDS) {
        if (!seen.has(id)) {
          problems.push('missing weapon def ' + id);
        }
      }
    }
    if (tables == null || typeof tables !== 'object') {
      problems.push('tables must be an object');
    } else {
      for (const id of WEAPON_IDS) {
        if (!(id in tables)) {
          problems.push('missing weapon table ' + id);
        }
      }
      for (const key of Object.keys(tables)) {
        if (!WEAPON_IDS.includes(key)) {
          problems.push('unexpected weapon table ' + key);
        }
      }
      for (const id of WEAPON_IDS) {
        if (!(id in tables)) continue;
        const table = tables[id];
        if (table == null || typeof table !== 'object') {
          problems.push(id + ': table is not an object');
          continue;
        }
        for (const m of MOVE_IDS) {
          if (!(m in table)) {
            problems.push(id + ': missing move ' + m);
          }
        }
        for (const key of Object.keys(table)) {
          if (!MOVE_IDS.includes(key)) {
            problems.push(id + ': unexpected move ' + key);
          }
        }
        for (const p of validateMoves(table)) {
          problems.push(id + ': ' + p);
        }
        for (const m of MOVE_IDS) {
          const mv = table[m];
          if (mv != null && typeof mv === 'object' && !POSE_IDS.includes(mv.pose)) {
            problems.push(id + '.' + m + ': pose must be one of ' + POSE_IDS.join(','));
          }
        }
      }
    }
  } catch {
    problems.push('validateWeapons crashed on hostile input');
  }
  return problems;
}
