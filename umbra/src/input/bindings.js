/**
 * Umbra input bindings v1: versioned, remappable keyboard map.
 * Headless, no DOM. Pure + node-testable.
 *
 * Actions: up, down, left, right, punch, kick, block, special, dash, pause.
 * Values are lists of `e.code` strings (primary first).
 */

export const BINDINGS_VERSION = 1;

/** Canonical action order (also used for deterministic codeToAction). */
export const BINDING_ACTIONS = [
  'up',
  'down',
  'left',
  'right',
  'punch',
  'kick',
  'block',
  'special',
  'dash',
  'pause',
];

/** Human-readable labels for settings UI rendering. */
export const BINDING_LABELS = {
  up: 'Jump / Up',
  down: 'Crouch / Down',
  left: 'Move Left',
  right: 'Move Right',
  punch: 'Punch',
  kick: 'Kick',
  block: 'Block',
  special: 'Special',
  dash: 'Dash',
  pause: 'Pause',
};

/** Frozen v1 defaults: WASD + arrows, JKL attacks, U special, Space dash. */
export const DEFAULT_BINDINGS = Object.freeze({
  up: ['KeyW', 'ArrowUp'],
  down: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  punch: ['KeyJ'],
  kick: ['KeyK'],
  block: ['KeyL'],
  special: ['KeyU'],
  dash: ['Space'],
  pause: ['Escape'],
});

/** @returns {object} deep copy of the v1 defaults (safe to mutate). */
export function defaultBindings() {
  const out = {};
  for (const a of BINDING_ACTIONS) out[a] = [...DEFAULT_BINDINGS[a]];
  return out;
}

/**
 * Validate a bindings table shape.
 * @param {unknown} bindings
 * @returns {string|null} error message or null when valid.
 */
export function validateBindings(bindings) {
  if (!bindings || typeof bindings !== 'object' || Array.isArray(bindings)) {
    return 'bindings must be an object';
  }
  const b = /** @type {Record<string, unknown>} */ (bindings);
  for (const action of BINDING_ACTIONS) {
    const codes = b[action];
    if (!Array.isArray(codes) || codes.length === 0) {
      return `action "${action}" must be a non-empty array of codes`;
    }
    for (const code of codes) {
      if (typeof code !== 'string' || code.length === 0) {
        return `action "${action}" holds an invalid code`;
      }
    }
  }
  // No physical code may live in two actions: duplicates make one keypress
  // drive two intents (e.g. crouch + punch at once).
  const seen = new Map();
  for (const action of BINDING_ACTIONS) {
    for (const code of b[action]) {
      if (seen.has(code)) {
        return `code "${code}" is bound to both "${seen.get(code)}" and "${action}"`;
      }
      seen.set(code, action);
    }
  }
  return null;
}

/**
 * Serialize bindings to a versioned JSON string for persistence.
 * @param {object} bindings
 * @returns {string}
 */
export function serializeBindings(bindings) {
  const err = validateBindings(bindings);
  if (err) throw new TypeError(`cannot serialize invalid bindings: ${err}`);
  return JSON.stringify({ version: BINDINGS_VERSION, bindings });
}

/**
 * Load bindings from a JSON string (or already-parsed object).
 * Version mismatch or shape problems reject with {ok:false, error}.
 * @param {string|unknown} json
 * @returns {{ok:true, bindings:object}|{ok:false, error:string}}
 */
export function loadBindings(json) {
  let parsed = json;
  if (typeof json === 'string') {
    try {
      parsed = JSON.parse(json);
    } catch {
      return { ok: false, error: 'bindings JSON is not parseable' };
    }
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, error: 'bindings document must be an object' };
  }
  const doc = /** @type {any} */ (parsed);
  if (doc.version !== BINDINGS_VERSION) {
    return { ok: false, error: `unsupported bindings version: ${doc.version}` };
  }
  const err = validateBindings(doc.bindings);
  if (err) return { ok: false, error: err };
  const out = {};
  for (const a of BINDING_ACTIONS) out[a] = [...doc.bindings[a]];
  return { ok: true, bindings: out };
}

/**
 * Rebind one action to a code, swapping on conflict: if `code` is already
 * bound to another action, that action loses it and receives the displaced
 * primary code instead, so no code ever lives in two actions afterwards.
 * Pure: returns a new table, never mutates the input.
 * @param {object} bindings
 * @param {string} action
 * @param {string} code e.code string
 * @returns {object} new bindings table
 */
export function rebind(bindings, action, code) {
  const err = validateBindings(bindings);
  if (err) throw new TypeError(`rebind of invalid bindings: ${err}`);
  if (!BINDING_ACTIONS.includes(action)) {
    throw new RangeError(`unknown binding action: ${action}`);
  }
  if (typeof code !== 'string' || code.length === 0) {
    throw new TypeError('rebind code must be a non-empty string');
  }
  const next = {};
  for (const a of BINDING_ACTIONS) next[a] = [...bindings[a]];
  if (next[action].includes(code)) return next;

  const displaced = next[action][0];
  const other = BINDING_ACTIONS.find((a) => a !== action && next[a].includes(code));
  // Strip the code from every other action first: one code, one action.
  for (const a of BINDING_ACTIONS) {
    if (a !== action) next[a] = next[a].filter((c) => c !== code);
  }
  // Target takes the new code as primary, keeping old codes as secondaries.
  next[action] = [code, ...next[action].filter((c) => c !== code)];
  if (other) {
    // The donor lost `code` above; hand it the displaced primary so it
    // stays bound (validateBindings requires non-empty actions).
    next[other] = [displaced, ...next[other]];
  }
  return next;
}
export function rebind(bindings, action, code) {
  const err = validateBindings(bindings);
  if (err) throw new TypeError(`rebind of invalid bindings: ${err}`);
  if (!BINDING_ACTIONS.includes(action)) {
    throw new RangeError(`unknown binding action: ${action}`);
  }
  if (typeof code !== 'string' || code.length === 0) {
    throw new TypeError('rebind code must be a non-empty string');
  }
  const next = {};
  for (const a of BINDING_ACTIONS) next[a] = [...bindings[a]];
  if (next[action].includes(code)) return next;

  const displaced = next[action][0];
  const other = BINDING_ACTIONS.find((a) => a !== action && next[a].includes(code));
  // Strip the code from every other action first: one code, one action.
  for (const a of BINDING_ACTIONS) {
    if (a !== action) next[a] = next[a].filter((c) => c !== code);
  }
  // Target takes the new code as primary, keeping old codes as secondaries.
  next[action] = [code, ...next[action].filter((c) => c !== code)];
  if (other) {
    // The donor lost `code` above; hand it the displaced primary so it
    // stays bound (validateBindings requires non-empty actions).
    next[other] = [displaced, ...next[other]];
  }
  return next;
}

/**
 * Reverse lookup: first action (canonical order) holding `code`, else null.
 * @param {object} bindings
 * @param {string} code
 * @returns {string|null}
 */
export function codeToAction(bindings, code) {
  if (!bindings || typeof bindings !== 'object') return null;
  for (const action of BINDING_ACTIONS) {
    const codes = bindings[action];
    if (Array.isArray(codes) && codes.includes(code)) return action;
  }
  return null;
}

/**
 * UI hook for the settings screen (orchestrator-owned): rows to render.
 * @param {object} bindings
 * @returns {{action:string, label:string, codes:string[]}[]}
 */
export function describeBindings(bindings) {
  const err = validateBindings(bindings);
  if (err) throw new TypeError(`cannot describe invalid bindings: ${err}`);
  return BINDING_ACTIONS.map((action) => ({
    action,
    label: BINDING_LABELS[action],
    codes: [...bindings[action]],
  }));
}
