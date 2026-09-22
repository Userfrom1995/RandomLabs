/**
 * Umbra G1-G7 binding-gate assertions. Each gate evaluates a measurements
 * object and returns pass=true, pass=false, or pass=null when unmeasured
 * (honest skeleton: never claims green without data).
 */

export const GATE_DEFS = [
  { id: 'G1', name: '60 FPS tier ladder (p95 per tier documented)' },
  { id: 'G2', name: 'TTFF bands (cold broadband/4G, warm)' },
  { id: 'G3', name: 'Input latency edge-to-sim <= 2 ticks' },
  { id: 'G4', name: 'Determinism replay-hash equality' },
  { id: 'G5', name: 'Persistence round-trip' },
  { id: 'G6', name: 'A11y audit (contrast, keyboard-only, reduced motion)' },
  { id: 'G7', name: 'Pages deploy green + offline reload' },
];

/**
 * @param {string} id gate id
 * @param {Record<string, unknown>} m measurements
 * @returns {{id:string, name:string, pass:boolean|null, detail:string}}
 */
export function checkGate(id, m = {}) {
  const name = (GATE_DEFS.find((g) => g.id === id) || {}).name || id;
  switch (id) {
    case 'G1': {
      const p95 = m.p95Ms;
      if (!Number.isFinite(p95)) return { id, name, pass: null, detail: 'unmeasured' };
      return {
        id,
        name,
        pass: p95 <= 16.667,
        detail: `p95 ${Number(p95).toFixed(2)} ms at ${(m.tier ?? '?')}/${(m.res ?? '?')}`,
      };
    }
    case 'G4': {
      if (typeof m.hashA !== 'string' || typeof m.hashB !== 'string') {
        return { id, name, pass: null, detail: 'unmeasured' };
      }
      return {
        id,
        name,
        pass: m.hashA === m.hashB,
        detail: m.hashA === m.hashB ? `hash ${m.hashA} equal` : `${m.hashA} != ${m.hashB}`,
      };
    }
    case 'G5': {
      if (typeof m.roundTrip !== 'boolean') return { id, name, pass: null, detail: 'unmeasured' };
      return { id, name, pass: m.roundTrip, detail: m.roundTrip ? 'round-trip equal' : 'mismatch' };
    }
    default:
      return { id, name, pass: null, detail: 'unmeasured' };
  }
}

/**
 * @param {Record<string, unknown>} m measurements keyed per gate
 * @returns {Array<{id:string, name:string, pass:boolean|null, detail:string}>}
 */
export function checkAllGates(m = {}) {
  return GATE_DEFS.map((g) => checkGate(g.id, m[g.id] || {}));
}
