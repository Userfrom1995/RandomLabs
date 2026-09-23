/**
 * Umbra M5 tutorial: scripted-onboarding step machine.
 * Pure ES module: no DOM, no Math.random, no Date.now.
 *
 * The shell owns the bout and hands this machine a plain per-tick summary:
 *   { p0x, startX, p0state, eventsSeen, winner }
 * where eventsSeen is an array of fight events
 * ({ t, tick, side, move, damage }, see src/combat/types.js) and winner is
 * 0, 1, -1, or null. Every goal is checkable keyboard-only: no step needs
 * pointer, touch, or mouse input, and nothing here encodes such a need.
 *
 * Goal semantics (trainee is always side 0):
 * - "move":    |p0x - startX| > 0.2
 * - "punch":   a "hit" event by side 0 with move id "jab"
 * - "block":   a "blocked" event where side 0 defended (foe attacked)
 * - "special": a "hit" event by side 0 with the special move id
 * - "dash":    observed p0state "dash"
 * - "win":     bout over with side 0 the winner
 *
 * Engine note: the special CombatInput edge produces move id "uppercut"
 * (see matchesTrigger/selectMove in src/combat/fighter.js), while fight
 * events carry the move id on the "move" field (see src/combat/types.js).
 * Both spellings are accepted ("special"/"uppercut", "move"/"moveId") so
 * the shell can use engine events or hand-built synthetic summaries.
 */

export const TUTORIAL_STEPS = [
  {
    id: 'move',
    title: 'Footwork',
    hint: 'Walk toward or away with your movement keys until the drill clears.',
    goal: 'move',
  },
  {
    id: 'punch',
    title: 'First strike',
    hint: 'Land a jab with your punch key.',
    goal: 'punch',
  },
  {
    id: 'block',
    title: 'Guard',
    hint: 'Hold your block key as the foe strikes to absorb the hit.',
    goal: 'block',
  },
  {
    id: 'special',
    title: 'Special',
    hint: 'Land the special uppercut with your special key.',
    goal: 'special',
  },
  {
    id: 'dash',
    title: 'Dash',
    hint: 'Dash toward or away with your dash key.',
    goal: 'dash',
  },
  {
    id: 'win',
    title: 'Finish the bout',
    hint: 'Win the bout against the trainee foe. Guard, strike, and dash.',
    goal: 'win',
  },
];

/** Move ids that satisfy the punch step (engine id plus alias). */
const PUNCH_MOVES = new Set(['jab']);
/** Move ids that satisfy the special step (engine id plus alias). */
const SPECIAL_MOVES = new Set(['special', 'uppercut']);

/**
 * Read the move id off a fight event, tolerating both the engine "move"
 * field and a "moveId" alias used by synthetic summaries.
 * @param {unknown} e fight event
 * @returns {string|null} move id or null
 */
function eventMove(e) {
  if (e == null || typeof e !== 'object') return null;
  if (typeof e.move === 'string') return e.move;
  if (typeof e.moveId === 'string') return e.moveId;
  return null;
}

/**
 * True when the event is a clean hit landed by the trainee (side 0).
 * An explicit foe side rejects; a missing side defaults to the trainee
 * so hand-built summaries without a side field still count.
 * @param {unknown} e fight event
 * @param {Set<string>} ids accepted move ids
 * @returns {boolean}
 */
function hitByTrainee(e, ids) {
  if (e == null || typeof e !== 'object') return false;
  if (e.t !== 'hit') return false;
  if (e.side !== 0 && e.side != null) return false;
  return ids.has(eventMove(e));
}

/**
 * True when the event shows the trainee defending a blocked strike:
 * the foe (side 1) attacked into the trainee guard, or an explicit
 * defender mark names side 0. An explicit trainee-side attack (side 0
 * hitting the foe guard) never counts.
 * @param {unknown} e fight event
 * @returns {boolean}
 */
function blockedByTrainee(e) {
  if (e == null || typeof e !== 'object') return false;
  if (e.t !== 'blocked') return false;
  if (e.defender === 0) return true;
  if (e.defender === 1) return false;
  if (e.side === 1 || e.side == null) return true;
  return false;
}

/**
 * Check one goal key against a sim summary. Unknown goals and malformed
 * summaries never satisfy (safe no-op, never throws).
 * @param {string} goal goal key from TUTORIAL_STEPS
 * @param {unknown} summary plain sim summary object
 * @returns {boolean} true when the goal is met
 */
export function tutorialGoalMet(goal, summary) {
  if (summary == null || typeof summary !== 'object') return false;
  const events = Array.isArray(summary.eventsSeen) ? summary.eventsSeen : [];
  switch (goal) {
    case 'move': {
      const x = Number(summary.p0x);
      const start = Number(summary.startX);
      if (!Number.isFinite(x) || !Number.isFinite(start)) return false;
      return Math.abs(x - start) > 0.2;
    }
    case 'punch':
      return events.some((e) => hitByTrainee(e, PUNCH_MOVES));
    case 'block':
      return events.some((e) => blockedByTrainee(e));
    case 'special':
      return events.some((e) => hitByTrainee(e, SPECIAL_MOVES));
    case 'dash':
      return summary.p0state === 'dash';
    case 'win':
      return summary.winner === 0;
    default:
      return false;
  }
}

/**
 * Create fresh tutorial state.
 * @returns {{stepIndex:number, done:boolean}} new state at step 0
 */
export function createTutorial() {
  return { stepIndex: 0, done: false };
}

// Last-seen summary signature per tutorial object. A repeat call with a
// byte-identical summary is a no-op (idempotent): only fresh evidence can
// advance the machine. A WeakMap keeps the signature off the state object
// so { stepIndex, done } stays exactly as documented.
const lastSignature = new WeakMap();

/**
 * Advance the tutorial by at most one step when the current goal is met.
 * Idempotent: calling again with an identical summary never advances.
 * Safe: done machines and malformed summaries are no-ops, never throws.
 * @param {{stepIndex:number, done:boolean}} t tutorial state (mutated)
 * @param {unknown} summary plain sim summary object
 * @returns {{stepIndex:number, done:boolean}} the same state object
 */
export function tutorialUpdate(t, summary) {
  if (t == null || typeof t !== 'object') return t;
  if (t.done) return t;
  if (!Number.isInteger(t.stepIndex) || t.stepIndex < 0) t.stepIndex = 0;
  if (t.stepIndex >= TUTORIAL_STEPS.length) {
    t.done = true;
    return t;
  }
  if (summary == null || typeof summary !== 'object') return t;
  const step = TUTORIAL_STEPS[t.stepIndex];
  if (!step || !tutorialGoalMet(step.goal, summary)) return t;
  let sig = null;
  try {
    sig = JSON.stringify(summary);
  } catch {
    sig = null;
  }
  if (sig !== null && lastSignature.get(t) === sig) return t;
  if (sig !== null) lastSignature.set(t, sig);
  t.stepIndex += 1;
  if (t.stepIndex >= TUTORIAL_STEPS.length) t.done = true;
  return t;
}

/**
 * Current prompt for the shell to render.
 * @param {{stepIndex:number, done:boolean}|null|undefined} t tutorial state
 * @returns {{title:string, hint:string, progress:string}} prompt plus "k/6"
 */
export function tutorialPrompt(t) {
  const total = TUTORIAL_STEPS.length;
  const raw = t != null && typeof t === 'object' && Number.isInteger(t.stepIndex) ? t.stepIndex : 0;
  const idx = Math.max(0, Math.min(raw, total));
  const done = (t != null && typeof t === 'object' && t.done === true) || idx >= total;
  if (done) {
    return {
      title: 'Tutorial complete',
      hint: 'Every drill cleared. Take your shadow into versus or story mode.',
      progress: `${total}/${total}`,
    };
  }
  const step = TUTORIAL_STEPS[idx];
  return { title: step.title, hint: step.hint, progress: `${idx + 1}/${total}` };
}
