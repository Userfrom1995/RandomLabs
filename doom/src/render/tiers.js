// Render tiers + capability probe (spec 4.6). M1 ships Tier 2 (Canvas2D +
// JS core) as the first visible loop; WebGL tiers land in M2. Choice cached
// in localStorage with manual override (?tier=N or window.DOOM_TIER).
export const TIERS = [
  'Tier 0: WebGL2 paletted + Wasm SIMD (M2)',
  'Tier 1: WebGL1 RGBA + Wasm scalar (M2)',
  'Tier 2: Canvas2D + Wasm framebuffer (M1)',
  'Tier 3: Canvas2D + pure-JS core, 30 FPS cap (M1 fallback)',
  'Tier 4: emergency 256x160, no post (M2)',
];

export function probeCapabilities(env = {}) {
  const hasWebGL2 = !!env.webgl2;
  const hasWebGL1 = !!env.webgl;
  const hasWasm = typeof WebAssembly !== 'undefined';
  return { hasWebGL2, hasWebGL1, hasWasm, simd: false };
}

export function resolveTier(caps, override = null) {
  if (override !== null && override >= 0 && override <= 4) return override;
  if (typeof window !== 'undefined') {
    try {
      const q = new URLSearchParams(window.location.search).get('tier');
      if (q !== null && q !== '') return Math.max(0, Math.min(4, parseInt(q, 10) || 0));
      const cached = window.localStorage.getItem('doom-tier');
      if (cached !== null) return Math.max(0, Math.min(4, parseInt(cached, 10) || 0));
    } catch { /* storage blocked: fall through */ }
  }
  // M1: WebGL tiers not yet implemented, so resolve to Tier 2/3.
  if (caps.hasWasm) return 2;
  return 3;
}
