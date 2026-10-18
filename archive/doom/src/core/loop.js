// rAF loop driver: fixed-step ticks + every-frame render with alpha.
// Input listeners only set flags; each tick consumes them once (M2 wires ticcmd).
import { accumulatorStep, createClock, nowMs } from './clock.js';

export function createLoop({ tick, render, onPause = () => {} }) {
  const clock = createClock();
  let rafId = 0;
  let tickCount = 0;
  let alive = false;

  function frame(t) {
    if (!alive) return;
    const dt = clock.last === 0 ? 0 : t - clock.last;
    clock.last = t;
    const { steps, alpha } = accumulatorStep(clock, dt);
    for (let i = 0; i < steps; i++) { tick(tickCount); tickCount++; }
    render(alpha);
    rafId = requestAnimationFrame(frame);
  }

  return {
    start() {
      if (alive) return;
      alive = true;
      clock.last = 0;
      const raf = globalThis.requestAnimationFrame || ((cb) => setTimeout(() => cb(nowMs()), 16));
      globalThis.requestAnimationFrame = globalThis.requestAnimationFrame || raf;
      rafId = (globalThis.requestAnimationFrame)(frame);
    },
    stop() {
      alive = false;
      if (globalThis.cancelAnimationFrame) globalThis.cancelAnimationFrame(rafId);
      else clearTimeout(rafId);
    },
    pause() { this.stop(); onPause(); },
    get tickCount() { return tickCount; },
    __test: { accumulatorStep, clock },
  };
}
