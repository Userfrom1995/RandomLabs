// Texture composition + palette/colormap/flat/picture readers (spec 3.7).
import { CheckedReader } from './checkedReader.js';
import { WadError } from './errors.js';

export const PLAYPAL_SIZE = 10752; // 14 palettes * 256 * 3
export const COLORMAP_SIZE = 8704; // 34 tables * 256
export const FLAT_SIZE = 4096; // 64x64

export function checkPlaypal(bytes, map = null) {
  if (bytes.length !== PLAYPAL_SIZE) {
    throw new WadError({ code: 'W_MEDIA', lump: 'PLAYPAL', map, offset: 0, expected: `${PLAYPAL_SIZE} bytes`, actual: `${bytes.length}`, severity: 'warning', fallback: 'grayscale fallback palette' });
  }
  return bytes;
}

export function checkColormap(bytes, map = null) {
  if (bytes.length !== COLORMAP_SIZE) {
    throw new WadError({ code: 'W_MEDIA', lump: 'COLORMAP', map, offset: 0, expected: `${COLORMAP_SIZE} bytes`, actual: `${bytes.length}`, severity: 'warning', fallback: 'identity lighting' });
  }
  return bytes;
}

// Grayscale fallback palette (256 entries, RGB triples) when PLAYPAL missing.
export function fallbackPalette() {
  const pal = new Uint8Array(256 * 3);
  for (let i = 0; i < 256; i++) { pal[i * 3] = i; pal[i * 3 + 1] = i; pal[i * 3 + 2] = i; }
  return pal;
}

export function decodePnames(bytes, lump = 'PNAMES', map = null) {
  const r = new CheckedReader(bytes, { lump, map });
  if (bytes.length < 4) throw new WadError({ code: 'W_MEDIA', lump, map, offset: 0, expected: '>= 4 bytes', actual: `${bytes.length}`, severity: 'warning', fallback: 'no patches' });
  const n = r.u32(0);
  if (4 + n * 8 > bytes.length) throw new WadError({ code: 'W_MEDIA', lump, map, offset: 0, expected: `count ${n} inside lump`, actual: `len=${bytes.length}`, severity: 'warning', fallback: 'truncate list' });
  const out = [];
  for (let i = 0; i < n; i++) out.push(r.ascii(4 + i * 8, 8).toUpperCase());
  return out;
}

// TEXTURE1/2 directory: returns Map name -> { width, height, patches: [{ox,oy,index}] }.
// TEXTURE2 overrides TEXTURE1 on same name (caller merges in order).
export function decodeTextureLump(bytes, lump = 'TEXTURE1', map = null) {
  const r = new CheckedReader(bytes, { lump, map });
  const out = new Map();
  if (bytes.length < 4) throw new WadError({ code: 'W_MEDIA', lump, map, offset: 0, expected: '>= 4 bytes', actual: `${bytes.length}`, severity: 'warning', fallback: 'no textures' });
  const n = r.u32(0);
  if (n > 4096) throw new WadError({ code: 'W_MEDIA', lump, map, offset: 0, expected: 'texture count <= 4096', actual: `${n}`, severity: 'warning', fallback: 'truncate' });
  for (let i = 0; i < n; i++) {
    const offPtr = 4 + i * 4;
    if (offPtr + 4 > bytes.length) break;
    const off = r.i32(offPtr);
    if (off < 0 || off + 22 > bytes.length) {
      throw new WadError({ code: 'W_MEDIA', lump, map, offset: offPtr, expected: 'texture header inside lump', actual: `off=${off}`, severity: 'warning', fallback: 'skip texture' });
    }
    const name = r.ascii(off, 8).toUpperCase();
    const width = r.u16(off + 12), height = r.u16(off + 14);
    const npatch = r.u16(off + 20);
    if (width === 0 || height === 0 || width > 4096 || height > 4096) {
      throw new WadError({ code: 'W_MEDIA', lump, map, offset: off, expected: 'sane dimensions', actual: `${width}x${height}`, severity: 'warning', fallback: 'skip texture' });
    }
    const patches = [];
    for (let p = 0; p < npatch; p++) {
      const po = off + 22 + p * 10;
      if (po + 10 > bytes.length) break;
      patches.push({ ox: r.i16(po), oy: r.i16(po + 2), index: r.u16(po + 4) });
    }
    out.set(name, { name, width, height, patches });
  }
  return out;
}

// Software R_GenerateTexture order blit: allocate transparent buffer, decode
// each patch picture in order, blit at (ox,oy) with 255 = transparent skip.
export function composeTexture(tex, patchPixels /* array of {w,h,data} or null */, transparent = 255) {
  const buf = new Uint8Array(tex.width * tex.height).fill(transparent);
  tex.patches.forEach((p) => {
    const pic = patchPixels[p.index];
    if (!pic) return; // missing patch lump: warned upstream, skip
    for (let y = 0; y < pic.h; y++) {
      const ty = y + p.oy;
      if (ty < 0 || ty >= tex.height) continue;
      for (let x = 0; x < pic.w; x++) {
        const tx = x + p.ox;
        if (tx < 0 || tx >= tex.width) continue;
        const px = pic.data[y * pic.w + x];
        if (px === transparent) continue;
        buf[ty * tex.width + tx] = px;
      }
    }
  });
  return buf;
}

// Doom picture format: u16 w,h; i16 left,top; w*u32 column offsets; posts
// (u8 topdelta, length, pad, bytes, pad) terminated by 0xFF. Bounded reader.
export function decodePicture(bytes, lump = 'PICTURE', map = null) {
  const r = new CheckedReader(bytes, { lump, map });
  if (bytes.length < 8) throw new WadError({ code: 'W_MEDIA', lump, map, offset: 0, expected: '>= 8 byte header', actual: `${bytes.length}`, severity: 'warning', fallback: 'blank image' });
  const w = r.u16(0), h = r.u16(2);
  if (w === 0 || h === 0 || w > 4096 || h > 4096) throw new WadError({ code: 'W_MEDIA', lump, map, offset: 0, expected: 'sane picture size', actual: `${w}x${h}`, severity: 'warning', fallback: 'blank image' });
  if (8 + w * 4 > bytes.length) throw new WadError({ code: 'W_MEDIA', lump, map, offset: 8, expected: 'column table inside lump', actual: `w=${w} len=${bytes.length}`, severity: 'warning', fallback: 'blank image' });
  const data = new Uint8Array(w * h).fill(255);
  for (let c = 0; c < w; c++) {
    const coff = r.u32(8 + c * 4);
    if (coff >= bytes.length) throw new WadError({ code: 'W_MEDIA', lump, map, offset: 8 + c * 4, expected: 'column offset inside lump', actual: `col=${c} off=${coff}`, severity: 'warning', fallback: 'skip column' });
    let p = coff;
    let posts = 0;
    for (;;) {
      if (p >= bytes.length) throw new WadError({ code: 'W_MEDIA', lump, map, offset: p, expected: 'post header inside lump', actual: 'overrun', severity: 'warning', fallback: 'end column' });
      const top = bytes[p];
      if (top === 0xff) break;
      if (p + 2 > bytes.length) break;
      const len = bytes[p + 1];
      if (p + 3 + len + 1 > bytes.length) throw new WadError({ code: 'W_MEDIA', lump, map, offset: p, expected: 'post bytes inside lump', actual: `top=${top} len=${len}`, severity: 'warning', fallback: 'end column' });
      for (let i = 0; i < len; i++) {
        const y = top + i;
        if (y >= 0 && y < h) data[y * w + c] = bytes[p + 3 + i];
      }
      p += 3 + len + 1;
      if (++posts > h + 1) throw new WadError({ code: 'W_MEDIA', lump, map, offset: coff, expected: 'bounded post count', actual: `>${h + 1} posts`, severity: 'warning', fallback: 'end column' });
    }
  }
  return { w, h, data };
}

export function checkFlat(bytes, lump = 'FLAT', map = null) {
  if (bytes.length !== FLAT_SIZE) throw new WadError({ code: 'W_MEDIA', lump, map, offset: 0, expected: `${FLAT_SIZE} bytes`, actual: `${bytes.length}`, severity: 'warning', fallback: 'checkerboard fallback flat' });
  return bytes;
}
