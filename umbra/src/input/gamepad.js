/**
 * Umbra gamepad poll (browser, per tick). Hot-plug tolerant: no gamepad
 * present (or no Gamepad API) yields null. Takes an optional navigator-like
 * so headless tests can inject fakes; no DOM at import time.
 *
 * Standard mapping assumed:
 * - axes[0]: move (left/right), axes[1]: down crouch (past deadzone)
 * - A(0) punch, B(1) kick, X(2) special, Y(3) jump (alt face-button jump)
 * - LB(4)/RB(5) block (held level), LT(6)/RT(7) special (alt triggers)
 * - Start(9) pause (NOT part of CombatInput; app handles it separately),
 *   right-stick press R3(10) dash
 * - Dpad: 14 left / 15 right move, 13 crouch, 12 jump
 *
 * pollGamepad reports button LEVELS for the tick (held A reads true every
 * tick). CombatInput buttons are edges consumed once per tick, so callers
 * must latch edges with createGamepadPoller, which converts punch/kick/
 * special/jump/dash to rising edges and keeps block/crouch/move as levels.
 */

export const GAMEPAD_DEADZONE = 0.35;
export const GAMEPAD_POLL_INDEX = 0;

/** Documented button roles under the standard mapping. */
export const GAMEPAD_MAP = Object.freeze({
  punch: 0,
  kick: 1,
  special: 2,
  jumpAlt: 3,
  block: [4, 5],
  specialAlt: [6, 7],
  pause: 9,
  dash: 10,
  dpadJump: 12,
  dpadCrouch: 13,
  dpadLeft: 14,
  dpadRight: 15,
});

function pressed(btn) {
  if (btn == null) return false;
  if (typeof btn === 'number') return btn > 0.5;
  if (typeof btn === 'object') {
    if (typeof btn.pressed === 'boolean') return btn.pressed;
    if (typeof btn.value === 'number') return btn.value > 0.5;
  }
  return false;
}

/**
 * First connected pad in the navigator list (hot-plug tolerant: any index,
 * not just 0, so a pad that enumerates late is still picked up).
 * @param {object} nav navigator-like with getGamepads()
 * @returns {object|null} first non-null pad or null
 */
export function firstPad(nav) {
  if (!nav || typeof nav.getGamepads !== 'function') return null;
  let pads;
  try {
    pads = nav.getGamepads();
  } catch {
    return null;
  }
  if (!pads) return null;
  for (const pad of pads) {
    if (pad) return pad;
  }
  return null;
}

/**
 * Poll the first connected gamepad for one tick of CombatInput LEVELS.
 * @param {object} [navigatorLike] defaults to globalThis.navigator when present
 * @returns {object|null} CombatInput levels, or null when no gamepad is connected
 */
export function pollGamepad(navigatorLike) {
  const nav =
    navigatorLike !== undefined
      ? navigatorLike
      : typeof navigator !== 'undefined'
        ? navigator
        : null;
  const pad = firstPad(nav);
  if (!pad) return null;

  const axes = Array.isArray(pad.axes) ? pad.axes : [];
  const buttons = pad.buttons || [];
  const axisX = typeof axes[0] === 'number' ? axes[0] : 0;
  const axisY = typeof axes[1] === 'number' ? axes[1] : 0;

  let move = 0;
  if (axisX > GAMEPAD_DEADZONE) move = 1;
  else if (axisX < -GAMEPAD_DEADZONE) move = -1;
  if (pressed(buttons[GAMEPAD_MAP.dpadRight])) move = 1;
  if (pressed(buttons[GAMEPAD_MAP.dpadLeft])) move = -1;
  // Opposing dpad directions cancel, matching keyboard left+right behavior.
  if (pressed(buttons[GAMEPAD_MAP.dpadLeft]) && pressed(buttons[GAMEPAD_MAP.dpadRight])) {
    move = 0;
  }

  const crouch = axisY > GAMEPAD_DEADZONE || pressed(buttons[GAMEPAD_MAP.dpadCrouch]);
  const jump = pressed(buttons[GAMEPAD_MAP.dpadJump]) || pressed(buttons[GAMEPAD_MAP.jumpAlt]);
  const punch = pressed(buttons[GAMEPAD_MAP.punch]);
  const kick = pressed(buttons[GAMEPAD_MAP.kick]);
  const special =
    pressed(buttons[GAMEPAD_MAP.special]) ||
    GAMEPAD_MAP.specialAlt.some((i) => pressed(buttons[i]));
  const block = GAMEPAD_MAP.block.some((i) => pressed(buttons[i]));
  const dashPressed = pressed(buttons[GAMEPAD_MAP.dash]);

  return {
    move,
    crouch,
    jump,
    punch,
    kick,
    block,
    special,
    dash: dashPressed ? (move !== 0 ? move : 1) : 0,
  };
}

/**
 * Stateful per-tick gamepad driver: latches previous button levels so
 * punch/kick/special/jump/dash read as rising edges (a held A fires once,
 * matching the keyboard edge queue). Block/crouch/move stay levels.
 * @returns {{poll:(navLike?:object)=>object|null, reset:()=>void}}
 */
export function createGamepadPoller() {
  const prev = { punch: false, kick: false, special: false, jump: false, dash: false };
  return {
    poll(navigatorLike) {
      const lv = pollGamepad(navigatorLike);
      if (!lv) return null;
      const edge = (key, cur) => {
        const fire = !!cur && !prev[key];
        prev[key] = !!cur;
        return fire;
      };
      const dashNow = lv.dash !== 0;
      const dashFire = dashNow && !prev.dash;
      prev.dash = dashNow;
      return {
        ...lv,
        punch: edge('punch', lv.punch),
        kick: edge('kick', lv.kick),
        special: edge('special', lv.special),
        jump: edge('jump', lv.jump),
        dash: dashFire ? lv.dash : 0,
      };
    },
    /** Forget latched levels (call when leaving pause/screens). */
    reset() {
      prev.punch = prev.kick = prev.special = prev.jump = prev.dash = false;
    },
  };
}
