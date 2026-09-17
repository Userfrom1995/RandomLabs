// Palette manager (M2): the 256-entry palette uploads to GL exactly once per
// change (version counter), never per frame. Headless logic is unit-tested
// with a fake GL; uploadPaletteGL performs the real texImage2D call.
export const PALETTE_ENTRIES = 256;
export const PALETTE_BYTES = 768;

export function createPaletteManager(initial) {
  let version = 0;
  let uploadedVersion = -1;
  let palette = initial ? new Uint8Array(initial.slice(0, PALETTE_BYTES)) : new Uint8Array(PALETTE_BYTES);
  return {
    get version() { return version; },
    get palette() { return palette; },
    // Returns true when the bytes actually changed (bump version).
    setPalette(next) {
      if (!next || next.length < PALETTE_BYTES) return false;
      let same = true;
      for (let i = 0; i < PALETTE_BYTES; i++) {
        if (palette[i] !== next[i]) { same = false; break; }
      }
      if (same) return false;
      palette = new Uint8Array(next.slice(0, PALETTE_BYTES));
      version++;
      return true;
    },
    needsUpload() { return uploadedVersion !== version; },
    markUploaded() { uploadedVersion = version; },
  };
}

// Upload the 256x1 RGB palette texture. Caller binds texture + sets
// UNPACK_ALIGNMENT 1 first. Throws on GL errors so the app can fall back.
export function uploadPaletteGL(gl, texture, palette) {
  if (!gl || !texture) throw new Error('palette: no GL texture');
  if (!palette || palette.length < PALETTE_BYTES) throw new Error('palette: short bytes');
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(
    gl.TEXTURE_2D, 0, gl.RGB, PALETTE_ENTRIES, 1, 0,
    gl.RGB, gl.UNSIGNED_BYTE, new Uint8Array(palette.buffer, palette.byteOffset, PALETTE_BYTES),
  );
}
