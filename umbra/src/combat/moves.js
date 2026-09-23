/**
 * Umbra M2 FISTS move table: per-move frame data in ticks at 60 Hz.
 * Pure ES module: no DOM, no Math.random, no Date.now.
 *
 * Cancel graph: jab -> cross -> uppercut, kick -> sweep.
 */

/**
 * @typedef {import("./types.js").MoveDef} MoveDef
 */

/** @type {Record<string, MoveDef>} */
export const MOVES = {
  jab: {
    id: "jab",
    startup: 4,
    active: 3,
    recovery: 7,
    range: 0.22,
    damage: 6,
    chip: 1,
    knockback: 0.05,
    stun: 12,
    cancelInto: ["cross"],
    pose: "jab",
    sfx: "punch",
  },
  cross: {
    id: "cross",
    startup: 6,
    active: 3,
    recovery: 10,
    range: 0.24,
    damage: 9,
    chip: 2,
    knockback: 0.08,
    stun: 16,
    cancelInto: ["uppercut"],
    pose: "cross",
    sfx: "punch-heavy",
  },
  kick: {
    id: "kick",
    startup: 8,
    active: 4,
    recovery: 12,
    range: 0.3,
    damage: 11,
    chip: 2,
    knockback: 0.1,
    stun: 18,
    cancelInto: ["sweep"],
    pose: "kick",
    sfx: "kick",
  },
  sweep: {
    id: "sweep",
    startup: 10,
    active: 4,
    recovery: 16,
    range: 0.3,
    damage: 12,
    chip: 2,
    knockback: 0.14,
    stun: 26,
    cancelInto: [],
    pose: "sweep",
    sfx: "sweep",
  },
  uppercut: {
    id: "uppercut",
    startup: 9,
    active: 4,
    recovery: 18,
    range: 0.22,
    damage: 16,
    chip: 3,
    knockback: 0.18,
    stun: 24,
    cancelInto: [],
    pose: "uppercut",
    sfx: "uppercut",
  },
};

/** @type {MoveDef[]} */
export const moveList = Object.values(MOVES);

const isPosInt = (n) => Number.isInteger(n) && n > 0;
const isNonNeg = (n) => typeof n === "number" && Number.isFinite(n) && n >= 0;

/**
 * Check frame-data invariants over a move table.
 * @param {Record<string, MoveDef>} [table] move table to validate (defaults to MOVES)
 * @returns {string[]} invariant violations (empty when the table is valid)
 */
export function validateMoves(table = MOVES) {
  const problems = [];
  if (table == null || typeof table !== "object") return ["move table is not an object"];
  for (const [key, m] of Object.entries(table)) {
    if (m == null || typeof m !== "object") {
      problems.push(`${key}: not an object`);
      continue;
    }
    if (m.id !== key) problems.push(`${key}: id "${m.id}" does not match table key`);
    for (const field of ["startup", "active", "recovery"]) {
      if (!isPosInt(m[field])) problems.push(`${key}: ${field} must be a positive integer, got ${m[field]}`);
    }
    for (const field of ["range", "damage", "chip", "knockback", "stun"]) {
      if (!isNonNeg(m[field])) problems.push(`${key}: ${field} must be >= 0, got ${m[field]}`);
    }
    if (!Array.isArray(m.cancelInto)) {
      problems.push(`${key}: cancelInto must be an array`);
    } else {
      for (const target of m.cancelInto) {
        if (!(target in table)) problems.push(`${key}: cancel target "${target}" does not exist`);
        if (target === key) problems.push(`${key}: cancel target must not be self`);
      }
    }
    if (typeof m.pose !== "string" || m.pose.length === 0) problems.push(`${key}: pose must be a non-empty string`);
    if (typeof m.sfx !== "string" || m.sfx.length === 0) problems.push(`${key}: sfx must be a non-empty string`);
  }
  return problems;
}
