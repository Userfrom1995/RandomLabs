// Render tiers + capability probe (spec 4.6). M2 implements Tier 0/1 (WebGL
// paletted/RGBA in glQuad.js); Tier 2 is Canvas2D + Wasm framebuffer, Tier 3
// is Canvas2D + pure-JS core at a 30 FPS cap, Tier 4 is emergency 256x160.
// Choice cached in localStorage with manual override (?tier=N or
// window.DOOM_TIER). M1 pins preserved: no GL flags means Tier 2/3 only.
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
  // M2: WebGL tiers resolve when the probe found GL; otherwise Tier 2/3.
  if (caps.hasWebGL2 || caps.webgl2) return 0;
  if (caps.hasWebGL1 || caps.webgl) return 1;
  if (caps.hasWasm) return 2;
  return 3;
}

// Fallback chain when a tier's presenter throws (GL context loss, shader
// failure): step exactly one rung down the ladder per failure.
export function tierForFailure(tier) {
  if (!Number.isInteger(tier)) return 2;
  return Math.min(4, Math.max(0, tier) + 1);
}
