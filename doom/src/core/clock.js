// Fixed-step clock: rAF driver + 35 Hz accumulator (spec 4.4).
// step = 28.571ms; acc += min(dt,100ms); cap 3 steps per frame; render every
// frame with alpha = acc/step. Clock source is performance.now(), never Date.
export const TIC_STEP_MS = 1000 / 35;
export const MAX_STEPS = 3;
export const MAX_DT_MS = 100;

export function nowMs() {
  if (typeof performance !== 'undefined' && performance.now) return performance.now();
  return Date.now();
}

// Pure step function for determinism tests: __test.accumulatorStep hook.
export function accumulatorStep(state, dtMs) {
  const dt = Math.min(Math.max(dtMs, 0), MAX_DT_MS);
  state.acc += dt;
  let steps = 0;
  while (state.acc >= TIC_STEP_MS && steps < MAX_STEPS) {
    state.acc -= TIC_STEP_MS;
    steps++;
  }
  const alpha = state.acc / TIC_STEP_MS;
  return { steps, alpha };
}

export function createClock() {
  return { acc: 0, last: 0, running: false };
}
