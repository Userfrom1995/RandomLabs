// Desktop keyboard state (headless, no DOM).
// Tracks pressed e.code values and maps them through the active bindings to a
// set of logical actions sampled once per tick. DOM wiring lives in
// attachKeyboard; the state machine itself is unit-testable in Node.
export function createKeyState(bindings) {
  const down = new Set();
  let table = bindings;
  return {
    setBindings(b) { table = b; },
    press(code) { if (typeof code === 'string') down.add(code); },
    release(code) { down.delete(code); },
    clear() { down.clear(); },
    get down() { return new Set(down); },
    actions() {
      const out = new Set();
      if (!table || !table.actions) return out;
      for (const [action, row] of Object.entries(table.actions)) {
        if (row.keys.some((k) => down.has(k))) out.add(action);
      }
      return out;
    },
  };
}

// Sample held actions into a normalized ticcmd input sample (see tic.js).
// Priority: explicit weapon key (lowest slot number wins when several held).
export function sampleToInput(actions) {
  const has = (a) => actions.has(a);
  let weapon = null;
  for (let i = 1; i <= 7; i++) {
    if (has(`weapon${i}`)) { weapon = i; break; }
  }
  const moveF = (has('forward') ? 1 : 0) - (has('back') ? 1 : 0);
  const turn = (has('turnRight') ? 1 : 0) - (has('turnLeft') ? 1 : 0);
  const strafeTurnConflict = has('strafeLeft') || has('strafeRight');
  return {
    moveF,
    moveS: (has('strafeRight') ? 1 : 0) - (has('strafeLeft') ? 1 : 0),
    // Holding strafe converts the turn keys into sidestep (vanilla Doom
    // strafe-on-turn behavior): turn input is suppressed while strafing.
    turn: strafeTurnConflict ? 0 : turn,
    run: has('run'),
    attack: has('fire'),
    use: has('use'),
    weapon,
  };
}

// Browser wiring: forwards keydown/keyup as e.code presses. Game keys get
// preventDefault to stop page scroll; typing in form fields is ignored.
// Returns a detach function. No-op without a DOM target.
export function attachKeyboard(target, keyState, opts = {}) {
  if (!target || typeof target.addEventListener !== 'function') return () => {};
  const gameCodes = new Set(opts.gameCodes || [
    'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space',
    'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE', 'KeyF', 'KeyP',
    'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7',
  ]);
  const isTyping = (e) => {
    const t = e.target;
    return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT');
  };
  const onDown = (e) => {
    if (isTyping(e)) return;
    if (typeof opts.onAnyKey === 'function' && opts.captureNext) return;
    keyState.press(e.code);
    if (gameCodes.has(e.code)) e.preventDefault();
    if (typeof opts.onAction === 'function') opts.onAction(e.code, true);
  };
  const onUp = (e) => {
    keyState.release(e.code);
    if (typeof opts.onAction === 'function') opts.onAction(e.code, false);
  };
  const onBlur = () => keyState.clear();
  target.addEventListener('keydown', onDown);
  target.addEventListener('keyup', onUp);
  if (typeof target.addEventListener === 'function' && target === globalThis.window) {
    globalThis.window.addEventListener('blur', onBlur);
  }
  return () => {
    target.removeEventListener('keydown', onDown);
    target.removeEventListener('keyup', onUp);
    if (target === globalThis.window && typeof globalThis.window.removeEventListener === 'function') {
      globalThis.window.removeEventListener('blur', onBlur);
    }
  };
}
