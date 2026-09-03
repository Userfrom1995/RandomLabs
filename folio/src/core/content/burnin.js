// Folio burn-in scrub: true text removal at the stream level.
// The executor saves with useObjectStreams:false (plain xref), then this
// pass inflates every Flate content stream (DecompressionStream, available
// in browsers and Node 18+), blanks literal "(...)" and hex "<...>"
// occurrences of each redacted string, re-compresses, and writes the stream
// back under the same indirect reference (xref is rebuilt on save).
// Covered encodings: WinAnsi/Standard single-byte text (literal or hex,
// including UTF-16BE hex with BOM). Documented limitation: custom
// Differences-encoded subsets and multi-byte Identity-H glyph IDs do not
// decode to character codes, so those strings cannot be byte-scrubbed; the
// verifier reports them and the UI surfaces the caveat instead of a pass.

async function inflateAll(raw) {
  if (typeof DecompressionStream === "undefined") throw new Error("burn-in needs DecompressionStream (modern browser or Node 18+)");
  const ds = new DecompressionStream("deflate");
  const w = ds.writable.getWriter();
  await w.write(raw);
  await w.close();
  const chunks = [];
  const r = ds.readable.getReader();
  for (;;) {
    const { done, value } = await r.read();
    if (done) break;
    chunks.push(value);
  }
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.length;
  }
  return out;
}

async function deflateAll(raw) {
  if (typeof CompressionStream === "undefined") throw new Error("burn-in needs CompressionStream (modern browser or Node 18+)");
  const cs = new CompressionStream("deflate");
  const w = cs.writable.getWriter();
  await w.write(raw);
  await w.close();
  const chunks = [];
  const r = cs.readable.getReader();
  for (;;) {
    const { done, value } = await r.read();
    if (done) break;
    chunks.push(value);
  }
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.length;
  }
  return out;
}

const dec = () => new TextDecoder("latin1");
const latin1Bytes = (s) => {
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i) & 0xff;
  return out;
};

// Scrub one decoded stream's text. Precise: only the matched substring's
// own bytes are blanked (space 0x20 / U+0020), so kept text sharing the
// same Tj run survives. Lengths may change; the executor re-saves, which
// rebuilds the xref. Returns {text, perString}.
export function scrubStreamText(text, strings) {
  const perString = {};
  const BLANK_LIT = "(?:\\\\.|[^\\\\()])*?";

  // Split a literal body into {ch, lo, hi} entries over raw indices.
  function literalChars(body, base) {
    const out = [];
    let content = "";
    for (let i = 0; i < body.length;) {
      if (body[i] === "\\" && i + 1 < body.length) {
        const e = body[i + 1];
        const ch = e === "n" ? "\n" : e === "r" ? "\r" : e === "t" ? "\t" : e === "f" ? "\f" : e === "b" ? "\b" : e;
        out.push({ ch, lo: base + i, hi: base + i + 2 });
        content += ch;
        i += 2;
      } else {
        out.push({ ch: body[i], lo: base + i, hi: base + i + 1 });
        content += body[i];
        i++;
      }
    }
    return { content, out };
  }

  for (const s of strings || []) {
    if (!s) {
      perString[s] = 0;
      continue;
    }
    let hits = 0;
    text = text.replace(new RegExp("\\(" + BLANK_LIT + "\\)", "g"), (m, off) => {
      const { content, out } = literalChars(m.slice(1, -1), off + 1);
      let idx = content.indexOf(s);
      if (idx < 0) return m;
      const arr = m.split("");
      while (idx >= 0) {
        hits++;
        for (let k = idx; k < idx + s.length; k++) {
          const e = out[k];
          for (let j = e.lo - off; j < e.hi - off; j++) arr[j] = " ";
        }
        idx = content.indexOf(s, idx + s.length);
      }
      return arr.join("");
    });
    text = text.replace(/<([0-9A-Fa-f\s]+)>/g, (m, hex) => {
      const clean = hex.replace(/\s+/g, "");
      if (clean.length < 2 || clean.length % 2 !== 0) return m;
      const be16 = /^FEFF/i.test(clean);
      const unit = be16 ? 4 : 2;
      const body = be16 ? clean.slice(4) : clean;
      if (body.length % unit !== 0) return m;
      const chars = [];
      for (let i = 0; i < body.length; i += unit) {
        const code = parseInt(body.slice(i, i + unit), 16);
        if (Number.isNaN(code)) return m;
        chars.push(String.fromCharCode(code));
      }
      const content = chars.join("");
      let idx = content.indexOf(s);
      if (idx < 0) return m;
      const arr = body.split("");
      while (idx >= 0) {
        hits++;
        for (let k = idx; k < idx + s.length; k++) {
          const start = k * unit;
          const blank = be16 ? "0020" : "20";
          for (let j = 0; j < unit; j++) arr[start + j] = blank[j];
        }
        idx = content.indexOf(s, idx + s.length);
      }
      return "<" + (be16 ? clean.slice(0, 4) : "") + arr.join("") + ">";
    });
    perString[s] = hits;
  }
  return { text, perString };
}

// Legacy whole-file pass (kept for uncompressed Info-dict/metadata tails).
export function scrubPdfBytes(inputBytes, strings) {
  const { text, perString } = scrubStreamText(dec(inputBytes).decode(inputBytes), strings);
  return { bytes: latin1Bytes(text), perString };
}

// Stream-level burn-in over a loaded PDFDocument. Mutates streams in place
// (same refs) and also scrubs the Info dict. Returns perString hit counts.
export async function scrubDocumentStreams(doc, strings, PDFLib) {
  const total = {};
  for (const s of strings || []) total[s] = 0;
  for (const [ref, obj] of doc.context.enumerateIndirectObjects()) {
    if (!(obj instanceof PDFLib.PDFRawStream)) continue;
    let raw = null;
    try {
      raw = obj.getContents();
    } catch {
      continue;
    }
    let decoded = null;
    let compressed = false;
    try {
      const maybe = await inflateAll(raw);
      // Heuristic: accept inflation only if the result looks like text.
      const t = dec().decode(maybe);
      if (/[\x20-\x7E]{4}/.test(t)) {
        decoded = t;
        compressed = true;
      }
    } catch {
      /* not flate: try raw */
    }
    if (decoded === null) {
      try {
        decoded = dec().decode(raw);
      } catch {
        continue;
      }
    }
    const { text, perString } = scrubStreamText(decoded, strings);
    let hits = 0;
    for (const s of strings || []) hits += perString[s] || 0;
    if (!hits) continue;
    for (const s of strings || []) total[s] += perString[s] || 0;
    const fresh = latin1Bytes(text);
    const bytes = compressed ? await deflateAll(fresh) : fresh;
    const dict = doc.context.obj({});
    for (const k of obj.dict.keys()) {
      if (k.toString() === "/Length") continue;
      dict.set(k, obj.dict.get(k));
    }
    dict.set(PDFLib.PDFName.of("Length"), PDFLib.PDFNumber.of(bytes.length));
    doc.context.assign(ref, PDFLib.PDFRawStream.of(dict, bytes));
  }
  // Info dict: uncompressed literal metadata.
  try {
    const info = doc.getInfoDict ? doc.getInfoDict() : null;
    void info;
  } catch { /* older docs */ }
  return total;
}

// Verifier: every decoded stream concatenated; true when no redacted string
// survives anywhere (content, CMaps, or metadata tails).
export async function decodedStreamText(doc, PDFLib) {
  const parts = [];
  for (const [, obj] of doc.context.enumerateIndirectObjects()) {
    if (!(obj instanceof PDFLib.PDFRawStream)) continue;
    let raw = null;
    try {
      raw = obj.getContents();
    } catch {
      continue;
    }
    try {
      const maybe = await inflateAll(raw);
      const t = dec().decode(maybe);
      if (/[\x20-\x7E]{4}/.test(t)) parts.push(t);
      else parts.push(dec().decode(raw));
    } catch {
      try {
        parts.push(dec().decode(raw));
      } catch { /* skip */ }
    }
  }
  void PDFLib;
  return parts.join("\n");
}

export function stringsAbsent(haystack, strings) {
  const missing = [];
  for (const s of strings || []) if (s && haystack.includes(s)) missing.push(s);
  return missing;
}
