/**
 * Umbra keyboard input (browser) + pure codesToInput helper (headless).
 * Top-level imports are headless-safe; DOM is touched only in attach().
 *
 * Semantics: block is HELD (level). Punch/kick/special/jump/dash are EDGES
 * consumed once per tick by consumeTick(). preventDefault applies to bound
 * game codes only, so page shortcuts outside the map keep working.
 */

import { codeToAction } from './bindings.js';

/**
 * Pure headless mapping from held codes + per-tick edge codes to CombatInput.
 * @param {string[]} codesDown e.code strings currently held
 * @param {string[]} edges e.code strings pressed since last tick
 * @param {object} bindings action -> e.code[] table
 * @returns {{move:-1|0|1, crouch:boolean, jump:boolean, punch:boolean, kick:boolean, block:boolean, special:boolean, dash:-1|0|1}}
 */
export function codesToInput(codesDown, edges, bindings) {
  const down = new Set(Array.isArray(codesDown) ? codesDown : []);
  const edgeActions = new Set();
  for (const code of Array.isArray(edges) ? edges : []) {
    const action = codeToAction(bindings, code);
    if (action) edgeActions.add(action);
  }
  const held = (action) => {
    const codes = bindings && Array.isArray(bindings[action]) ? bindings[action] : [];
    return codes.some((c) => down.has(c));
  };
  const left = held('left');
  const right = held('right');
  const move = left === right ? 0 : right ? 1 : -1;
  const dashEdge = edgeActions.has('dash');
  return {
    move,
    crouch: held('down'),
    jump: edgeActions.has('up'),
    punch: edgeActions.has('punch'),
    kick: edgeActions.has('kick'),
    block: held('block'),
    special: edgeActions.has('special'),
    dash: dashEdge ? (move !== 0 ? move : 1) : 0,
  };
}

/**
 * Browser keyboard driver. Edges queue on keydown (non-repeat) and clear
 * on consumeTick(); held levels read live from the held set.
 * @param {object} bindings action -> e.code[] table
 */
export function createKeyboard(bindings) {
  const state = { held: new Set(), edges: [] };
  let el = null;

  const gameCodes = () => {
    const set = new Set();
    for (const codes of Object.values(bindings || {})) {
      if (Array.isArray(codes)) for (const c of codes) set.add(c);
    }
    return set;
  };

  function onKeyDown(ev) {
    if (!ev || typeof ev.code !== 'string') return;
    if (!gameCodes().has(ev.code)) return;
    if (typeof ev.preventDefault === 'function') ev.preventDefault();
    if (ev.repeat) return;
    state.held.add(ev.code);
    state.edges.push(ev.code);
  }

  function onKeyUp(ev) {
    if (!ev || typeof ev.code !== 'string') return;
    state.held.delete(ev.code);
  }

  return {
    state,
    /** Attach to an element (defaults to document when available). */
    attach(target) {
      if (typeof document === 'undefined' && !target) {
        throw new Error('createKeyboard.attach needs a DOM target');
      }
      el = target || document;
      el.addEventListener('keydown', onKeyDown);
      el.addEventListener('keyup', onKeyUp);
    },
    detach() {
      if (el) {
        el.removeEventListener('keydown', onKeyDown);
        el.removeEventListener('keyup', onKeyUp);
        el = null;
      }
    },
    /** Full CombatInput for this tick; queued edges clear after consume. */
    consumeTick() {
      const input = codesToInput([...state.held], state.edges, bindings);
      state.edges.length = 0;
      return input;
    },
    /** Live held levels only (no edge consumption). */
    heldState() {
      const input = codesToInput([...state.held], [], bindings);
      return { move: input.move, crouch: input.crouch, block: input.block };
    },
  };
}
