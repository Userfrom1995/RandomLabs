// DOM touch overlay state (blueprint: Pointer Events per pointerId, 44px
// targets, dynamic-origin joystick, FIRE/USE/strafe/weapon strip/menu,
// coarse-pointer only, safe-area insets, throttled haptics).
// Control contract: the left stick drives forward/back on Y and turn on X
// (single-stick full 360 control); strafe buttons drive sidemove. The state
// machine is headless and unit-tested; buildTouchOverlay wires the DOM.
export const TOUCH = {
  STICK_RADIUS_PX: 56,
  DEADZONE: 0.18,
  BUTTONS: ['fire', 'use', 'strafeL', 'strafeR'],
};

function clampAxis(v) {
  if (!Number.isFinite(v)) return 0;
  return Math.max(-1, Math.min(1, v));
}

export function createTouchState(opts = {}) {
  const radius = Number.isFinite(opts.radius) ? opts.radius : TOUCH.STICK_RADIUS_PX;
  const deadzone = Number.isFinite(opts.deadzone) ? opts.deadzone : TOUCH.DEADZONE;
  const stick = { active: false, id: null, ox: 0, oy: 0, dx: 0, dy: 0 };
  const held = new Set();
  let weapon = null;
  let hapticCount = 0;
  let lastHapticAt = 0;
  return {
    stick,
    get weapon() { return weapon; },
    joystickStart(id, x, y) {
      stick.active = true; stick.id = id;
      stick.ox = x; stick.oy = y; stick.dx = 0; stick.dy = 0;
    },
    joystickMove(id, x, y) {
      if (!stick.active || (id !== undefined && stick.id !== id)) return;
      let dx = (x - stick.ox) / radius;
      let dy = (y - stick.oy) / radius;
      const len = Math.hypot(dx, dy);
      if (len > 1) { dx /= len; dy /= len; }
      stick.dx = clampAxis(dx); stick.dy = clampAxis(dy);
    },
    joystickEnd(id) {
      if (id !== undefined && stick.id !== id) return;
      stick.active = false; stick.id = null; stick.dx = 0; stick.dy = 0;
    },
    press(btn) { if (typeof btn === 'string') held.add(btn); },
    release(btn) { held.delete(btn); },
    held() { return new Set(held); },
    setWeapon(n) {
      const w = Number(n);
      weapon = Number.isFinite(w) ? Math.max(1, Math.min(7, Math.round(w))) : null;
    },
    consumeWeapon() { const w = weapon; weapon = null; return w; },
    // Throttled haptic tick (at most one per 120ms); the DOM layer calls
    // navigator.vibrate only when this returns true.
    hapticTick(nowMs) {
      if (nowMs - lastHapticAt < 120) return false;
      lastHapticAt = nowMs;
      hapticCount++;
      return true;
    },
    get hapticCount() { return hapticCount; },
    // Sample into a normalized ticcmd input sample (see tic.js).
    sample() {
      const shaped = (v) => {
        const a = Math.abs(v) < deadzone ? 0 : (Math.abs(v) - deadzone) / (1 - deadzone);
        return Math.sign(v) * Math.min(1, a);
      };
      const strafe = (held.has('strafeR') ? 1 : 0) - (held.has('strafeL') ? 1 : 0);
      return {
        moveF: 0 - shaped(stick.dy),
        moveS: strafe,
        turn: shaped(stick.dx) + 0,
        run: true,
        attack: held.has('fire'),
        use: held.has('use'),
        weapon,
      };
    },
  };
}

// Coarse-pointer detection for showing the overlay (DOM-guarded).
export function shouldShowTouchOverlay(env = {}) {
  try {
    const mq = env.matchMedia || (typeof window !== 'undefined' ? window.matchMedia : null);
    if (typeof mq === 'function') {
      const thisArg = env.globalThis || env;
      if (mq.call(thisArg, '(pointer: coarse)').matches) return true;
    }
    const nav = env.navigator || (typeof navigator !== 'undefined' ? navigator : null);
    if (nav && Number(nav.maxTouchPoints) > 0) return true;
  } catch { /* fall through */ }
  return false;
}
