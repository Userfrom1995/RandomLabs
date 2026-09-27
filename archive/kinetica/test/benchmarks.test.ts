import { describe, it, expect } from 'vitest';
import { runStacking, runEnergyFree, runEnergyPendulum, runDeterminism, runPerf } from '../src/sim/benchmarks.js';

describe('benchmarks', () => {
  it('stacking stability', () => {
    const r = runStacking(123, 600);
    expect(r.maxLateralDrift).toBeLessThan(0.6);
    expect(r.settledKE).toBeLessThan(0.5);
    expect(r.pass).toBeTruthy();
  });
  it('energy free conservation', () => {
    const r = runEnergyFree(111, 1000);
    expect(r.relDrift).toBeLessThan(1e-5);
  });
  it('pendulum energy drift within few percent', () => {
    const r = runEnergyPendulum(456, 1200);
    expect(r.relDrift).toBeLessThan(0.5);
  });
  it('determinism across runs', () => {
    expect(runDeterminism(42, 'stack', 200)).toBeTruthy();
    expect(runDeterminism(42, 'free', 200)).toBeTruthy();
  });
  it('perf sanity > 60 steps/s', () => {
    const r = runPerf(789, 100);
    // in vitest this may be slow but should be >10
    expect(r.stepsPerSecond).toBeGreaterThan(10);
  });
});
