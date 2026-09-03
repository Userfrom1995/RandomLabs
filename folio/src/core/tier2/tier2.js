// Folio Phase E pure domain: Tier 2 + Tier 3 rows (headless, no DOM).
// Covers: P4 split-by-bookmark, P8 reorder validation, P10 blank page,
// P11 resize, P12 orientation, P13 crop burn, P18 flatten-all, O2 linearize
// note, O3 GC spec, O4 downsample spec, O5 grayscale, O7 PDF/A, S7/S8 cert
// scope, E16 attachments, E19 auto-rename batch, I4 replace-image, C2 deskew,
// V12 print spec, R3 batch queue.
export const PAGE_SIZES = {
  A4: { w: 595.28, h: 841.89 },
  Letter: { w: 612, h: 792 },
  Legal: { w: 612, h: 1008 },
  A3: { w: 841.89, h: 1190.55 },
  A5: { w: 419.53, h: 595.28 },
};

export function resizeSpec(sizeName, orientation, fit) {
  const base = PAGE_SIZES[sizeName];
  if (!base) throw new Error("unknown page size: " + sizeName);
  if (!["portrait", "landscape"].includes(orientation)) throw new Error("bad orientation");
  if (!["fit", "fill", "stretch"].includes(fit)) throw new Error("bad fit");
  const w = orientation === "landscape" ? Math.max(base.w, base.h) : Math.min(base.w, base.h);
  const h = orientation === "landscape" ? Math.min(base.w, base.h) : Math.max(base.w, base.h);
  return { sizeName, orientation, fit, w, h };
}

export function orientationPlan(pageCount, orientation) {
  if (!["portrait", "landscape"].includes(orientation)) throw new Error("bad orientation");
  if (!Number.isInteger(pageCount) || pageCount < 0) throw new Error("bad pageCount");
  // Returns per-page rotate flag: landscape pages need 90deg when currently portrait.
  return { orientation, pages: pageCount, rotateIfMismatch: true };
}

// P4: split by bookmarks: bookmarks = [{title, page 1-based}]; returns 0-based ranges.
export function splitByBookmarks(pageCount, bookmarks) {
  if (!Number.isInteger(pageCount) || pageCount < 1) throw new Error("bad pageCount");
  if (!Array.isArray(bookmarks) || !bookmarks.length) throw new Error("no bookmarks");
  const starts = bookmarks.map((b) => {
    if (!b || typeof b.title !== "string" || !b.title.trim()) throw new Error("bookmark needs a title");
    if (!Number.isInteger(b.page) || b.page < 1 || b.page > pageCount) throw new Error("bookmark page out of range: " + b.title);
    return { title: b.title.trim(), start: b.page - 1 };
  }).sort((a, b) => a.start - b.start);
  return starts.map((s, i) => ({
    title: s.title,
    pages: Array.from({ length: (i + 1 < starts.length ? starts[i + 1].start : pageCount) - s.start }, (_, k) => s.start + k),
  }));
}

// P8: reorder from a free-form string "3,1,2" (1-based). Validates permutation.
export function parseOrderString(str, pageCount) {
  const parts = String(str || "").split(/[\s,;]+/).filter(Boolean).map((s) => parseInt(s, 10));
  if (!parts.length) throw new Error("empty order");
  if (parts.some((n) => !Number.isInteger(n) || n < 1 || n > pageCount)) throw new Error("order page out of range");
  if (parts.length !== pageCount) throw new Error("order must list all " + pageCount + " pages exactly once");
  if (new Set(parts).size !== pageCount) throw new Error("order must not repeat pages");
  return parts.map((n) => n - 1);
}

// P10: blank page insert positions.
export function blankInsertPlan(pageCount, at) {
  if (!Number.isInteger(at) || at < 0 || at > pageCount) throw new Error("bad insert position");
  return { at, sizeName: "A4" };
}

// P18: flatten-all = bake markups + flatten form appearances + drop annot refs.
export function flattenPlan(annotCounts) {
  const total = Object.values(annotCounts || {}).reduce((a, b) => a + b, 0);
  return { kinds: Object.keys(annotCounts || {}), total, baked: total, note: "appearances baked into content; annot dicts removed" };
}

// O2 linearize: honest stub - pdf-lib has no linearizer; record intent.
export function linearizeNote() {
  return { status: "not-native", path: "fast-web-view via object-stream resave + IDB/page-windowed streaming; true xref linearization needs a server qpdf pass", writer: "resave" };
}

// O3: GC = full rewrite drops unreferenced objects.
export function gcSpec(beforeBytes, afterBytes) {
  if (!(beforeBytes > 0) || !(afterBytes > 0)) throw new Error("bad byte counts");
  return { before: beforeBytes, after: afterBytes, ratio: afterBytes / beforeBytes, reclaimed: beforeBytes - afterBytes, method: "full rewrite via save (drops unreferenced)" };
}

// O4: downsample target DPI -> scale factor.
export function downsampleSpec(targetDpi) {
  const allowed = [72, 110, 150, 200, 300];
  if (!allowed.includes(targetDpi)) throw new Error("target DPI must be one of " + allowed.join(","));
  return { dpi: targetDpi, scale: targetDpi / 72, method: "pdf.js render at scale + embedJpg re-embed" };
}

// O5: grayscale strength clamp (shared with grayscaleSpec; Phase E alias with page scope).
export function grayscalePlan(pages, strength) {
  const s = Math.max(0, Math.min(2, Number(strength)));
  if (!Number.isFinite(s)) throw new Error("bad strength");
  if (!Array.isArray(pages) || !pages.length) throw new Error("no pages");
  return { pages: [...pages], strength: s, method: "canvas luminance re-encode" };
}

// O7: PDF/A checklist is in optimize.js (pdfaChecklist); Phase E adds conformance record.
export function pdfaRecord(level) {
  if (!["PDF/A-1b", "PDF/A-2b", "PDF/A-3b"].includes(level)) throw new Error("unsupported PDF/A level");
  return { level, embedsFonts: true, stripsTransparency: true, stripsJs: true, writesXmp: true, note: "subset: fonts embedded, JS/actions stripped" };
}

// S7/S8: certificate scope - honest: no PKI vendored; stamp + ByteRange placeholder only.
export function certScope() {
  return {
    sign: "appearance-only placeholder (ByteRange reserved, CMS/PKCS#12 needs Phase E+ PKI vendor)",
    validate: "digest recompute only; chain trust needs vendored certs (out of scope v1)",
  };
}

export function signatureValidateReport(digestOk, chainKnown) {
  if (typeof digestOk !== "boolean") throw new Error("digestOk must be boolean");
  return digestOk
    ? { integrity: "INTACT", trust: chainKnown ? "TRUSTED" : "UNTRUSTED", summary: chainKnown ? "INTACT / TRUSTED" : "INTACT / UNTRUSTED" }
    : { integrity: "TAMPERED", trust: "UNTRUSTED", summary: "TAMPERED / UNTRUSTED" };
}

// E16: attachments registry (name -> bytes length), pure add/extract/delete plans.
export function attachPlan(existing, op, name, byteLength) {
  const names = new Set(existing || []);
  if (op === "add") {
    if (!name || /[/\\]/.test(name)) throw new Error("bad attachment name");
    if (!(byteLength > 0)) throw new Error("empty attachment");
    if (names.has(name)) throw new Error("attachment exists: " + name);
    return { op, name, byteLength };
  }
  if (op === "delete" || op === "extract") {
    if (!names.has(name)) throw new Error("attachment missing: " + name);
    return { op, name };
  }
  throw new Error("unknown attach op");
}

// E19: batch auto-rename over files.
export function batchRename(files, pattern) {
  if (!Array.isArray(files) || !files.length) throw new Error("no files");
  if (typeof pattern !== "string" || !pattern.includes("{")) throw new Error("pattern needs a {token}");
  return files.map((f, i) => ({
    from: f.name,
    to: pattern.replace(/\{(\w+)\}/g, (_, k) => {
      if (k === "name") return f.name.replace(/\.[^.]+$/, "");
      if (k === "index") return String(i + 1);
      if (k === "pages") return String(f.pages || 0);
      if (k === "date") return new Date().toISOString().slice(0, 10);
      return "{" + k + "}";
    }) + (f.name.match(/\.[^.]+$/) || [""])[0],
  }));
}

// I4: replace image = swap XObject bytes (same dims required for pure plan).
export function replaceImagePlan(entry, newBytesLen) {
  if (!entry || !Number.isInteger(entry.index)) throw new Error("bad image entry");
  if (!(newBytesLen > 0)) throw new Error("empty replacement");
  return { index: entry.index, page: entry.page, newBytesLen, note: "XObject swap; dimensions kept from census" };
}

// C2: deskew/orient pre-pass spec (pure; canvas pass runs in browser).
export function deskewSpec(angleDeg, orientApplied) {
  const a = Number(angleDeg);
  if (!Number.isFinite(a) || Math.abs(a) > 45) throw new Error("deskew angle out of range (-45..45)");
  return { angleDeg: a, correct: Math.abs(a) > 0.5, deskew: Math.abs(a) < 5, orientApplied: !!orientApplied, note: Math.abs(a) >= 5 ? "angle over 5deg: flag for manual review" : "auto-deskew under 5deg" };
}

// V12: print spec (system print, booklet-ready).
export function printSpec(pageCount, booklet) {
  if (!Number.isInteger(pageCount) || pageCount < 1) throw new Error("bad pageCount");
  return { pages: pageCount, booklet: !!booklet, method: "same-origin print CSS + iframe", css: "@page { size: A4; margin: 10mm }" };
}

// R3: batch queue - fan one op over many files; per-file retry without abort.
export function batchPlan(fileNames, tool) {
  if (!Array.isArray(fileNames) || !fileNames.length) throw new Error("no files");
  if (!tool) throw new Error("no tool");
  return { tool, queue: fileNames.map((n, i) => ({ id: "batch-" + (i + 1), file: n, status: "queued" })) };
}

export function batchReducer(queue, id, event) {
  return queue.map((j) => {
    if (j.id !== id) return j;
    if (event === "start") return { ...j, status: "running" };
    if (event === "ok") return { ...j, status: "done" };
    if (event === "fail") return { ...j, status: "failed" };
    if (event === "retry") return { ...j, status: "queued" };
    throw new Error("unknown batch event");
  });
}
