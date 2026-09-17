// Resolution ladder plus battery saver (M2, spec 4.6).
// Ladder: 640x400, 480x300, 320x200, 256x160 emergency. The governor tracks an
// EWMA of frame times and steps down/up at most once per 500 ms (hysteresis:
// separate down/up thresholds so the control never oscillates). Battery saver
// pins the ladder to 320x200 or below; mobile GL flags pick a conservative
// initial step. Pure logic, unit-tested with an injectable clock.
export const LADDER = [
  { w: 640, h: 400, label: '640x400' },
  { w: 480, h: 300, label: '480x300' },
  { w: 320, h: 200, label: '320x200' },
  { w: 256, h: 160, label: '256x160' },
];

export const RES = {
  DOWN_MS: 20.0,
  UP_MS: 9.0,
  MIN_INTERVAL_MS: 500,
  EWMA_ALPHA: 0.12,
};

export function initialStepIndex({ mobile = false, batterySaver = false } = {}) {
  if (batterySaver) return 2;
  if (mobile) return 1;
  return 0;
}

export function createResolutionGovernor(opts = {}) {
  const now = opts.now || (() => (typeof performance !== 'undefined' ? performance.now() : Date.now()));
  let index = Number.isInteger(opts.initial) ? Math.max(0, Math.min(LADDER.length - 1, opts.initial)) : 0;
  let manual = false; // only setManual pins the ladder; initial is a start step
  let batterySaver = !!opts.batterySaver;
  let ewma = 16.667;
  let lastSwitchAt = -Infinity;
  const onChange = opts.onChange || (() => {});
  const cap = () => (batterySaver ? Math.max(index, 2) : index);

  function setIndex(next, t) {
    next = Math.max(0, Math.min(LADDER.length - 1, next));
    if (batterySaver && next < 2) next = 2;
    if (next !== index) {
      index = next;
      lastSwitchAt = t;
      onChange(LADDER[index], index);
    }
  }

  return {
    get index() { return cap(); },
    get size() { return LADDER[cap()]; },
    get ewma() { return ewma; },
    get batterySaver() { return batterySaver; },
    setManual(i) {
      if (!Number.isInteger(i) || i < 0 || i >= LADDER.length) return false;
      manual = true;
      setIndex(i, now());
      return true;
    },
    setAuto() { manual = false; },
    get manual() { return manual; },
    setBatterySaver(v) {
      batterySaver = !!v;
      if (batterySaver && index < 2) setIndex(2, now());
    },
    // Feed one measured frame time (ms). Returns the active size.
    observe(frameMs) {
      if (!Number.isFinite(frameMs) || frameMs < 0) return LADDER[cap()];
      ewma = RES.EWMA_ALPHA * frameMs + (1 - RES.EWMA_ALPHA) * ewma;
      if (manual) return LADDER[cap()];
      const t = now();
      if (t - lastSwitchAt < RES.MIN_INTERVAL_MS) return LADDER[cap()];
      if (ewma > RES.DOWN_MS && index < LADDER.length - 1) setIndex(index + 1, t);
      else if (ewma < RES.UP_MS && index > 0) setIndex(index - 1, t);
      return LADDER[cap()];
    },
  };
}
