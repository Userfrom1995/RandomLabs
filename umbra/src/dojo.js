/**
 * Umbra M4 dojo: combo trials plus frame-data display rows.
 * Pure ES module: no DOM, no Math.random, no Date.now.
 *
 * Trials are checked against a bout event log: the trial sequence must
 * appear as a subsequence of the given side's clean-hit move ids, so any
 * performable order counts (cancels help, but plain consecutive hits pass).
 */

export const MOVE_ORDER = ['jab', 'cross', 'kick', 'sweep', 'uppercut'];

/**
 * @typedef {object} TrialDef
 * @property {string} id unique trial id
 * @property {string} name display name
 * @property {string} hint how to perform it (input words, not codes)
 * @property {string[]} sequence move ids in order
 * @property {number} reward ember paid on first completion
 */

/** @type {TrialDef[]} */
export const TRIALS = [
  {
    id: 'trial-first-blood',
    name: 'First Blood',
    hint: 'Land a single jab.',
    sequence: ['jab'],
    reward: 20,
  },
  {
    id: 'trial-one-two',
    name: 'One Two',
    hint: 'Chain jab into cross with fast punches.',
    sequence: ['jab', 'cross'],
    reward: 30,
  },
  {
    id: 'trial-low-line',
    name: 'Low Line',
    hint: 'Kick, then sweep from a crouch.',
    sequence: ['kick', 'sweep'],
    reward: 40,
  },
  {
    id: 'trial-rising-fang',
    name: 'Rising Fang',
    hint: 'Chain jab into cross, then finish with the special uppercut.',
    sequence: ['jab', 'cross', 'uppercut'],
    reward: 60,
  },
  {
    id: 'trial-sweep-riser',
    name: 'Sweep Riser',
    hint: 'Sweep from a crouch, then catch the recovery with the special.',
    sequence: ['sweep', 'uppercut'],
    reward: 50,
  },
  {
    id: 'trial-storm-mix',
    name: 'Storm Mix',
    hint: 'Mix a kick into fast punches: kick, jab, cross.',
    sequence: ['kick', 'jab', 'cross'],
    reward: 60,
  },
];

/**
 * @param {unknown} id trial id
 * @returns {TrialDef|null} trial or null when unknown
 */
export function trialById(id) {
  if (typeof id !== 'string') return null;
  return TRIALS.find((t) => t.id === id) || null;
}

/**
 * Check a trial against a bout event log. Only clean hits (`t === 'hit'`
 * with a string move) by the given side count, in log order.
 * @param {unknown} trialId trial id
 * @param {Array<{t:string, move:string|null, side:number}>} [events] bout event log
 * @param {0|1} [side] side attempting the trial
 * @returns {{ok:boolean, matched:number, total:number}} subsequence progress
 */
export function checkTrial(trialId, events, side = 0) {
  const trial = trialById(trialId);
  if (!trial) return { ok: false, matched: 0, total: 0 };
  const want = trial.sequence;
  if (!Array.isArray(events)) return { ok: false, matched: 0, total: want.length };
  const s = side === 1 ? 1 : 0;
  let matched = 0;
  for (const e of events) {
    if (matched >= want.length) break;
    if (!e || e.t !== 'hit' || e.side !== s || typeof e.move !== 'string') continue;
    if (e.move === want[matched]) matched += 1;
  }
  return { ok: matched >= want.length, matched, total: want.length };
}

/**
 * Frame-data display rows for a move table (canonical order, only ids
 * present in the table).
 * @param {Record<string, import("./combat/types.js").MoveDef>} [table]
 * @returns {Array<{move:string, startup:number, active:number, recovery:number, total:number, damage:number, range:number}>}
 */
/**
 * Sanitize a frame-data field: only finite numbers survive (Infinity and
 * NaN both coerce to the fallback, so hostile tables cannot leak
 * Infinity into the dojo display or trial math).
 * @param {unknown} value raw field value
 * @returns {number} finite value or 0
 */
function finiteField(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function frameRows(table) {
  if (table == null || typeof table !== 'object') return [];
  const rows = [];
  for (const id of MOVE_ORDER) {
    const m = table[id];
    if (m == null || typeof m !== 'object') continue;
    const startup = finiteField(m.startup);
    const active = finiteField(m.active);
    const recovery = finiteField(m.recovery);
    rows.push({
      move: id,
      startup,
      active,
      recovery,
      total: startup + active + recovery,
      damage: finiteField(m.damage),
      range: finiteField(m.range),
    });
  }
  return rows;
}

/**
 * @param {TrialDef[]} [trials]
 * @returns {string[]} violations (empty when valid)
 */
export function validateDojo(trials = TRIALS) {
  const problems = [];
  if (!Array.isArray(trials) || trials.length === 0) return ['trials must be a non-empty array'];
  const seen = new Set();
  for (const t of trials) {
    const tag = `trial:${(t && t.id) || '?'}`;
    if (!t || typeof t !== 'object') {
      problems.push(`${tag}: not an object`);
      continue;
    }
    if (typeof t.id !== 'string' || t.id.length === 0) problems.push(`${tag}: id must be a non-empty string`);
    else if (seen.has(t.id)) problems.push(`${tag}: duplicate id "${t.id}"`);
    else seen.add(t.id);
    for (const field of ['name', 'hint']) {
      if (typeof t[field] !== 'string' || t[field].length === 0) problems.push(`${tag}: ${field} must be a non-empty string`);
    }
    if (!Array.isArray(t.sequence) || t.sequence.length === 0) {
      problems.push(`${tag}: sequence must be a non-empty array`);
    } else {
      for (const m of t.sequence) {
        if (!MOVE_ORDER.includes(m)) problems.push(`${tag}: sequence move "${m}" is not canonical`);
      }
    }
    if (!Number.isInteger(t.reward) || t.reward < 0) problems.push(`${tag}: reward must be a non-negative integer`);
  }
  return problems;
}
