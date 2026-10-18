// Autoplay gate state machine (research spec 5.3). Chrome 66+/71+, Firefox,
// and Safari all start pre-gesture AudioContexts suspended; nothing may
// schedule before state running. Pure: the app wires real AudioContext calls
// around gesture()/running; headless tests assert the machine plus the
// zero-pre-unlock scheduling invariant (H5).
export const UNLOCK_SUSPENDED = 'suspended';
export const UNLOCK_RUNNING = 'running';

export function createAudioUnlock({ policy = 'unknown' } = {}) {
  let state = UNLOCK_SUSPENDED;
  let gestures = 0;
  let scheduledBefore = 0;
  let scheduledAfter = 0;
  return {
    get state() { return state; },
    get gestures() { return gestures; },
    get scheduledBefore() { return scheduledBefore; },
    get scheduledAfter() { return scheduledAfter; },
    // Overlay copy selector: explicit prompt policy or unknown policy shows
    // "click to enable audio"; allowed policy can start quietly on gesture.
    overlayNeeded() {
      return state === UNLOCK_SUSPENDED && policy !== 'allowed';
    },
    canSchedule() {
      return state === UNLOCK_RUNNING;
    },
    // Record a scheduling attempt: returns true when allowed, false when the
    // event must be dropped (counted for the H5 zero-pre-unlock assertion).
    trySchedule() {
      if (state === UNLOCK_RUNNING) {
        scheduledAfter++;
        return true;
      }
      scheduledBefore++;
      return false;
    },
    // Call only from a real user gesture (click/keydown/touchend).
    gesture() {
      gestures++;
      const moved = state !== UNLOCK_RUNNING;
      state = UNLOCK_RUNNING;
      return moved;
    },
    suspend() {
      state = UNLOCK_SUSPENDED;
    },
  };
}
