// Pointer Lock mouse look (blueprint: unadjustedMovement with bare-call
// fallback, ESC auto-pause plus click-to-recapture overlay, drag fallback).
// Headless delta accumulator is pure and unit-tested; the browser attach
// wrapper guards every DOM call so imports never crash in Node.
export const DEFAULT_SENSITIVITY_DEG_PER_PX = 0.15;

export function createMouseLook(opts = {}) {
  let dx = 0;
  let dy = 0;
  let locked = false;
  let dragging = false;
  const sensitivity = Number.isFinite(opts.sensitivity) ? opts.sensitivity : DEFAULT_SENSITIVITY_DEG_PER_PX;
  return {
    get locked() { return locked; },
    get dragging() { return dragging; },
    setLocked(v) { locked = !!v; },
    setDragging(v) { dragging = !!v; },
    addDelta(x, y) {
      if (Number.isFinite(x)) dx += x;
      if (Number.isFinite(y)) dy += y;
    },
    // Consume accumulated motion once per tick; resets to zero.
    consume() {
      const out = { dx, dy };
      dx = 0; dy = 0;
      return out;
    },
    peek() { return { dx, dy }; },
    get sensitivity() { return sensitivity; },
  };
}

// Convert consumed pixels to vanilla angleturn units (182 units per degree).
export function pixelsToAngleTurn(px, sensitivity = DEFAULT_SENSITIVITY_DEG_PER_PX) {
  if (!Number.isFinite(px) || !Number.isFinite(sensitivity)) return 0;
  return Math.round(px * sensitivity * 182);
}

// Browser wiring. Requests pointer lock on canvas click (first trying
// unadjustedMovement for raw input, falling back to a bare call), accumulates
// movement deltas while locked, supports drag-look fallback when lock is
// unavailable, and routes lock loss to onPauseRequest (ESC auto-pause).
// Returns { state, dispose, isLocked } and never throws without a DOM.
export function attachPointerLock(canvas, mouse, opts = {}) {
  const noop = () => {};
  if (!canvas || typeof canvas.requestPointerLock !== 'function' || typeof document === 'undefined') {
    return { state: mouse, dispose: noop, isLocked: () => !!mouse.locked };
  }
  const onPauseRequest = opts.onPauseRequest || noop;
  const onLockChange = () => {
    const locked = document.pointerLockElement === canvas;
    mouse.setLocked(locked);
    if (typeof opts.onLockChange === 'function') opts.onLockChange(locked);
    if (!locked && (opts.autoPauseOnExit !== false)) onPauseRequest();
  };
  const onMouseMove = (e) => {
    if (mouse.locked) {
      mouse.addDelta(e.movementX || 0, e.movementY || 0);
    } else if (mouse.dragging && opts.dragFallback !== false) {
      mouse.addDelta(e.movementX || 0, 0);
    }
  };
  const onClick = async () => {
    if (mouse.locked) return;
    try {
      const p = canvas.requestPointerLock({ unadjustedMovement: true });
      if (p && typeof p.catch === 'function') await p.catch(() => canvas.requestPointerLock());
    } catch {
      try { canvas.requestPointerLock(); } catch { /* drag fallback stays */ }
    }
  };
  const onDown = () => { if (!mouse.locked) mouse.setDragging(true); };
  const onUp = () => mouse.setDragging(false);
  document.addEventListener('pointerlockchange', onLockChange);
  document.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('click', onClick);
  canvas.addEventListener('mousedown', onDown);
  document.addEventListener('mouseup', onUp);
  return {
    state: mouse,
    isLocked: () => !!mouse.locked,
    dispose() {
      document.removeEventListener('pointerlockchange', onLockChange);
      document.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('click', onClick);
      canvas.removeEventListener('mousedown', onDown);
      document.removeEventListener('mouseup', onUp);
    },
  };
}
