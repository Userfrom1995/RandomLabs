/**
 * Umbra touch overlay state model. DOM-light: pure state plus methods;
 * the overlay (Pointer Events, swipe-up jump, haptics) lives in the app
 * layer. No `document` access at import time; headless-testable.
 */

/** Joystick deflection (px from origin) past which move/crouch quantize. */
export const TOUCH_JOY_THRESHOLD_PX = 12;

/** Minimum gap between navigator.vibrate calls (ms). */
export const VIBRATE_MIN_GAP_MS = 80;

/** Buttons the overlay drives through press()/release(). */
export const TOUCH_BUTTONS = [
  'left',
  'right',
  'crouch',
  'jump',
  'punch',
  'kick',
  'block',
  'special',
];

/**
 * Throttle helper for haptics: true when a vibration may fire now.
 * @param {number|null} lastMs last vibration time (null = never)
 * @param {number} nowMs current time
 */
export function shouldVibrate(lastMs, nowMs) {
  if (lastMs == null) return true;
  return nowMs - lastMs >= VIBRATE_MIN_GAP_MS;
}

/** @returns {object} fresh touch state with press/release/joy/consume methods. */
export function createTouchState() {
  const joy = { active: false, pointerId: null, ox: 0, oy: 0, dx: 0, dy: 0 };
  const heldDirs = new Set();
  let crouchButton = false;

  const st = {
    move: 0,
    crouch: false,
    jumpEdge: false,
    punchEdge: false,
    kickEdge: false,
    blockHeld: false,
    specialEdge: false,
    joy,

    press(btn) {
      if (!TOUCH_BUTTONS.includes(btn)) throw new RangeError(`unknown touch button: ${btn}`);
      switch (btn) {
        case 'left':
        case 'right':
          heldDirs.add(btn);
          break;
        case 'crouch':
          crouchButton = true;
          break;
        case 'block':
          st.blockHeld = true;
          break;
        case 'jump':
          st.jumpEdge = true;
          break;
        case 'punch':
          st.punchEdge = true;
          break;
        case 'kick':
          st.kickEdge = true;
          break;
        case 'special':
          st.specialEdge = true;
          break;
      }
      recompute();
    },

    release(btn) {
      if (!TOUCH_BUTTONS.includes(btn)) throw new RangeError(`unknown touch button: ${btn}`);
      if (btn === 'left' || btn === 'right') heldDirs.delete(btn);
      else if (btn === 'crouch') crouchButton = false;
      else if (btn === 'block') st.blockHeld = false;
      // Edges latch until consumeTick; nothing to release.
      recompute();
    },

    joyStart(id, x, y) {
      joy.active = true;
      joy.pointerId = id;
      joy.ox = x;
      joy.oy = y;
      joy.dx = 0;
      joy.dy = 0;
      recompute();
    },

    joyMove(id, x, y) {
      if (!joy.active || joy.pointerId !== id) return;
      joy.dx = x - joy.ox;
      joy.dy = y - joy.oy;
      recompute();
    },

    joyEnd(id) {
      if (!joy.active || (id !== undefined && joy.pointerId !== id)) return;
      joy.active = false;
      joy.pointerId = null;
      joy.dx = 0;
      joy.dy = 0;
      recompute();
    },

    /** CombatInput for this tick; latched edges clear after consume. */
    consumeTick() {
      const input = {
        move: st.move,
        crouch: st.crouch,
        jump: st.jumpEdge,
        punch: st.punchEdge,
        kick: st.kickEdge,
        block: st.blockHeld,
        special: st.specialEdge,
        dash: 0,
      };
      st.jumpEdge = false;
      st.punchEdge = false;
      st.kickEdge = false;
      st.specialEdge = false;
      return input;
    },
  };

  function recompute() {
    const left = heldDirs.has('left') || joy.dx < -TOUCH_JOY_THRESHOLD_PX;
    const right = heldDirs.has('right') || joy.dx > TOUCH_JOY_THRESHOLD_PX;
    st.move = left === right ? 0 : right ? 1 : -1;
    st.crouch = crouchButton || joy.dy > TOUCH_JOY_THRESHOLD_PX;
  }

  return st;
}
