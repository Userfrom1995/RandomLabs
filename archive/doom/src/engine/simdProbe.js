// SIMD/scalar binary probe (spec 4.6): WebAssembly.validate on a SIMD test
// module; loader picks doom-simd.wasm or doom-scalar.wasm. Cached choice with
// manual override via localStorage 'doom-simd' ('on'/'off') or ?simd= query.
// Minimal valid SIMD128 module: (module (func v128.const i32x4 0,0,0,0 drop)).
const SIMD_TEST = new Uint8Array([
  0, 97, 115, 109, 1, 0, 0, 0,
  1, 4, 1, 96, 0, 0,
  3, 2, 1, 0,
  10, 0x17, 1, 0x15, 0, 0xfd, 0x0c,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0x1a, 0x0b,
]);

export function probeSimd(validateFn) {
  try {
    const fn = validateFn || (typeof WebAssembly !== 'undefined' ? WebAssembly.validate.bind(WebAssembly) : null);
    if (!fn) return false;
    return !!fn(SIMD_TEST);
  } catch {
    return false;
  }
}

export function simdOverride() {
  try {
    if (typeof window !== 'undefined') {
      const q = new URLSearchParams(window.location.search).get('simd');
      if (q === 'on') return true;
      if (q === 'off') return false;
      const c = window.localStorage.getItem('doom-simd');
      if (c === 'on') return true;
      if (c === 'off') return false;
    }
  } catch { /* ignore */ }
  return null;
}

export function pickWasmBinary({ simdSupported, override = simdOverride() }) {
  const useSimd = override !== null ? override : simdSupported;
  return useSimd ? 'wasm/doom-simd.wasm' : 'wasm/doom-scalar.wasm';
}
