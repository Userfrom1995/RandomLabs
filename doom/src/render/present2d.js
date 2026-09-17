// Tier 2 Canvas2D presenter: 8-bit framebuffer + palette -> putImageData.
// M2 adds the WebGL paletted path (Tier 0/1) behind the same present() shape.
export function createPresenter(canvas, palette) {
  const w = canvas.width, h = canvas.height;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(w, h);
  let pal = palette; // Uint8Array 768 (256*3), palette 0

  return {
    setPalette(p) { pal = p; },
    present(fb) {
      const d = img.data;
      const src = fb.data;
      const n = Math.min(src.length, w * h);
      for (let i = 0; i < n; i++) {
        const c = src[i] * 3;
        const o = i * 4;
        d[o] = pal[c]; d[o + 1] = pal[c + 1]; d[o + 2] = pal[c + 2]; d[o + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
    },
  };
}
