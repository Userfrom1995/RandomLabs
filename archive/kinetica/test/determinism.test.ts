import { describe, it, expect } from 'vitest';
import { simulate } from '../src/sim/headless.js';

describe('determinism', () => {
  it('same seed same checksum', () => {
    const a = simulate(42, 'stack', 200).checksum;
    const b = simulate(42, 'stack', 200).checksum;
    expect(a).toBe(b);
  });
  it('different seed likely differs', () => {
    const a = simulate(42, 'mixed', 100).checksum;
    const b = simulate(99, 'mixed', 100).checksum;
    expect(a).not.toBe(b);
  });
  it('free motion checksum deterministic', () => {
    const a = simulate(7, 'free', 500).checksum;
    const b = simulate(7, 'free', 500).checksum;
    expect(a).toBe(b);
  });
});
