// Folio image executors: extract original bytes (I2), insert at
// position/scale/rotate (I3), scanner-effect support (I6-tier3 helper).
// Raster export (I1) and images-to-PDF (I5) already ship via the viewer.
import { censusReport, fitImage } from "../../core/images/images.js";

function filterName(dict, PDFLib) {
  try {
    const f = dict.get(PDFLib.PDFName.of("Filter"));
    if (!f) return "raw";
    const name = Array.isArray(f) ? f[0] : f;
    return (name && name.toString ? name.toString().slice(1) : String(name)) || "raw";
  } catch {
    return "raw";
  }
}

// Best-effort census: per-page XObject image entries with page numbers.
export function censusImages(doc, PDFLib) {
  const entries = [];
  doc.getPages().forEach((page, pi) => {
    let res = null;
    try {
      res = page.node.Resources();
    } catch {
      return;
    }
    if (!res) return;
    let xo = null;
    try {
      xo = res.get(PDFLib.PDFName.of("XObject"));
    } catch {
      return;
    }
    if (!xo) return;
    const dict = xo instanceof PDFLib.PDFDict ? xo : doc.context.lookup(xo);
    if (!dict || !(dict instanceof PDFLib.PDFDict)) return;
    for (const key of dict.keys()) {
      try {
        const ref = dict.get(key);
        const obj = doc.context.lookup(ref);
        if (!(obj instanceof PDFLib.PDFRawStream)) continue;
        const d = obj.dict;
        const sub = d.get(PDFLib.PDFName.of("Subtype"));
        if (!sub || sub.toString() !== "/Image") continue;
        entries.push({
          page: pi,
          name: key.toString().slice(1),
          width: d.get(PDFLib.PDFName.of("Width")).asNumber(),
          height: d.get(PDFLib.PDFName.of("Height")).asNumber(),
          filter: filterName(d, PDFLib),
          ref,
        });
      } catch { /* skip unreadable xobject */ }
    }
  });
  return censusReport(entries.map((e) => ({ ...e, bytes: 0 }))).map((r, i) => ({ ...r, ref: entries[i].ref, name: entries[i].name }));
}

export function extractImageBytes(doc, entry) {
  const stream = doc.context.lookup(entry.ref);
  const raw = stream.getContents ? stream.getContents() : stream.contents || new Uint8Array(0);
  const bytes = raw instanceof Uint8Array ? raw.slice() : new Uint8Array(raw);
  const ext = entry.filter === "DCTDecode" ? "jpg" : entry.filter === "FlateDecode" ? "raw" : "bin";
  return { bytes, ext, width: entry.width, height: entry.height, filter: entry.filter };
}

export async function insertImage(bytes, { page, imageBytes, kind, x, y, maxW, maxH, rot, opacity }, PDFLib) {
  const doc = await PDFLib.PDFDocument.load(bytes);
  const p = doc.getPages()[page || 0];
  if (!p) throw new Error("insert-image: page out of range");
  const img = kind === "png" ? await doc.embedPng(imageBytes) : await doc.embedJpg(imageBytes);
  const size = fitImage(img.width, img.height, maxW || 400, maxH || 400, rot || 0);
  p.drawImage(img, { x: x === undefined ? 56 : x, y: y === undefined ? 400 : y, width: size.w, height: size.h, rotate: PDFLib.degrees(size.rot), opacity });
  return doc.save();
}

// Canvas-domain scanner filter (browser): grain + contrast + slight warmth.
// Runs on a rendered page canvas, returns a PNG data URL for re-embed.
export function scannerFilter(canvas, spec) {
  const ctx = canvas.getContext("2d");
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;
  const { contrast, noise, warmth } = spec;
  let seed = 1234567;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff - 0.5;
  };
  for (let i = 0; i < d.length; i += 4) {
    for (const c of [0, 1, 2]) {
      let v = d[i + c] / 255;
      v = Math.min(1, Math.max(0, (v - 0.5) * contrast + 0.5 + rnd() * (noise / 255)));
      d[i + c] = Math.round(v * 255);
    }
    d[i] = Math.round(Math.min(255, Math.max(0, d[i] + warmth)));
  }
  ctx.putImageData(img, 0, 0);
  return canvas.toDataURL("image/png");
}
