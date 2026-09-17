// Paletted upload strategy (M2, spec 4.5).
// Tier 0 (WebGL2): single-channel R8 texture holding 8-bit indices, palette
// applied in-shader. 64 KB per frame at 320x200, UNPACK_ALIGNMENT 1.
// Tier 1 (WebGL1, no R8): CPU-expand to RGBA once per frame and upload the
// 256 KB RGBA texture. Tier 2+: Canvas2D presenter (see present2d.js).
export const UNPACK_ALIGNMENT = 1;
export const UPLOAD_FORMATS = ['r8', 'rgba', 'cpu'];

// Pure capability decision, unit-tested: webgl2 first, then webgl, else cpu.
export function chooseUploadFormat(caps = {}) {
  if (caps.webgl2 || caps.hasWebGL2) return 'r8';
  if (caps.webgl || caps.hasWebGL1) return 'rgba';
  return 'cpu';
}

// CPU expansion shared by the RGBA fallback path: 8-bit indices + 768-byte
// palette (256x3) to opaque RGBA. Out-of-range indices clamp to 0.
export function expandToRGBA(fbData, palette) {
  const n = fbData.length;
  const out = new Uint8ClampedArray(n * 4);
  for (let i = 0; i < n; i++) {
    let c = fbData[i];
    if (c < 0 || c > 255) c = 0;
    const p = c * 3;
    const o = i * 4;
    out[o] = palette[p];
    out[o + 1] = palette[p + 1];
    out[o + 2] = palette[p + 2];
    out[o + 3] = 255;
  }
  return out;
}

// Byte cost of one uploaded frame at 320x200 for the scoreboard (H2 input).
export function frameBytes(format, width = 320, height = 200) {
  if (format === 'r8') return width * height;
  if (format === 'rgba') return width * height * 4;
  return 0;
}
