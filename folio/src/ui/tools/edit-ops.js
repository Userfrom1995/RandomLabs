// Folio edit executors: find/replace (E7), paragraph edit (E6), N-up,
// booklet, overlay (E6 family via nup math), compare (blueprint route:edit),
// markup bake. Write path is pdf-lib; positions come from the viewer text map.
import { findSpans, paragraphEditPlan, wordDiff, diffStats } from "../../core/content/edit.js";
import { nupLayout, bookletOrder } from "../../core/content/nup.js";

async function coverAndType(doc, PDFLib, pageIdx, cover, rows, size) {
  const p = doc.getPages()[pageIdx];
  p.drawRectangle({ x: cover.x, y: cover.y - 2, width: cover.w, height: cover.h + 4, color: PDFLib.rgb(1, 1, 1) });
  const font = await doc.embedFont(PDFLib.StandardFonts.Helvetica);
  for (const r of rows) p.drawText(r.text, { x: cover.x + 2, y: r.y, size, font });
  return font;
}

export async function findReplace(bytes, { query, replacement, pages }, textMaps, PDFLib) {
  const doc = await PDFLib.PDFDocument.load(bytes);
  const font = await doc.embedFont(PDFLib.StandardFonts.Helvetica);
  let count = 0;
  const targets = pages || doc.getPages().map((_, i) => i);
  for (const pi of targets) {
    const spans = findSpans((textMaps && textMaps[pi]) || [], query);
    for (const s of spans) {
      const p = doc.getPages()[pi];
      p.drawRectangle({ x: s.x - 1, y: s.y - 2, width: s.w + 2, height: s.h + 4, color: PDFLib.rgb(1, 1, 1) });
      let size = s.h || 12;
      const repl = String(replacement === undefined ? "" : replacement);
      while (size > 5 && font.widthOfTextAtSize(repl || " ", size) > s.w) size -= 0.5;
      p.drawText(repl, { x: s.x - 1, y: s.y - 1, size, font });
      count++;
    }
  }
  return { bytes: await doc.save(), count };
}

export async function editParagraph(bytes, { matchText, newText, page }, textMaps, PDFLib) {
  const doc = await PDFLib.PDFDocument.load(bytes);
  const targets = page === undefined ? doc.getPages().map((_, i) => i) : [page];
  let edited = null;
  for (const pi of targets) {
    const lines = (textMaps && textMaps[pi]) || [];
    const line = lines.find((l) => l.text.includes(matchText));
    if (!line) continue;
    const size = line.size || 12;
    // Rough measure for the wrap plan; rows are re-fit with the real font below.
    const measure = (t, s) => t.length * s * 0.5;
    const plan = paragraphEditPlan({ ...line, paraH: line.h }, newText, measure);
    const font = await doc.embedFont(PDFLib.StandardFonts.Helvetica);
    // Re-measure with the real font, shrinking rows to the box width.
    const rows = [];
    for (const r of plan.rows) {
      let t = r.text;
      while (t.length > 1 && font.widthOfTextAtSize(t, size) > (line.w || 400)) t = t.slice(0, -2);
      rows.push({ text: t, y: r.y });
    }
    await coverAndType(doc, PDFLib, pi, plan.cover, rows, size);
    edited = { page: pi, overflow: plan.overflow };
    break;
  }
  if (!edited) throw new Error("edit: no line contains " + JSON.stringify(matchText));
  return { bytes: await doc.save(), ...edited };
}

export async function nupPdf(bytes, { n, margin }, PDFLib) {
  const src = await PDFLib.PDFDocument.load(bytes);
  const out = await PDFLib.PDFDocument.create();
  const [pw, ph] = [595, 842];
  const lay = nupLayout(n || 2, pw, ph, margin === undefined ? 18 : margin);
  const emb = await out.embedPdf(src);
  for (let i = 0; i < emb.length; i += lay.cells.length) {
    const sheet = out.addPage([pw, ph]);
    lay.cells.forEach((c, k) => {
      const ep = emb[i + k];
      if (ep) sheet.drawPage(ep, { x: c.x, y: c.y, width: c.w, height: c.h });
    });
  }
  return out.save();
}

export async function bookletPdf(bytes, PDFLib) {
  const src = await PDFLib.PDFDocument.load(bytes);
  const order = bookletOrder(src.getPageCount());
  const out = await PDFLib.PDFDocument.create();
  const [pw, ph] = [595, 842];
  const emb = await out.embedPdf(src);
  for (const [left, right] of order) {
    const sheet = out.addPage([pw * 2, ph]);
    if (left >= 0 && left < emb.length) sheet.drawPage(emb[left], { x: 0, y: 0, width: pw, height: ph });
    if (right >= 0 && right < emb.length) sheet.drawPage(emb[right], { x: pw, y: 0, width: pw, height: ph });
  }
  return out.save();
}

export async function overlayPdf(baseBytes, overlayBytes, PDFLib) {
  const base = await PDFLib.PDFDocument.load(baseBytes);
  const over = await PDFLib.PDFDocument.load(overlayBytes);
  const emb = await base.embedPdf(over);
  base.getPages().forEach((p, i) => {
    const ep = emb[i % emb.length];
    const { width, height } = p.getSize();
    p.drawPage(ep, { x: 0, y: 0, width, height });
  });
  return base.save();
}

export async function compareDocs(bytesA, bytesB, textsA, textsB, PDFLib) {
  const doc = await PDFLib.PDFDocument.load(bytesA);
  const font = await doc.embedFont(PDFLib.StandardFonts.Helvetica);
  const bold = await doc.embedFont(PDFLib.StandardFonts.HelveticaBold);
  const page = doc.addPage([595, 842]);
  page.drawText("Folio compare report", { x: 56, y: 780, size: 18, font: bold });
  let y = 750;
  let total = { same: 0, del: 0, ins: 0 };
  const n = Math.max(textsA.length, textsB.length);
  for (let i = 0; i < n; i++) {
    const ops = wordDiff(textsA[i] || "", textsB[i] || "");
    const st = diffStats(ops);
    total = { same: total.same + st.same, del: total.del + st.del, ins: total.ins + st.ins };
    if (y < 80) break;
    if (st.del || st.ins) {
      page.drawText("p." + (i + 1) + ": -" + st.del + " +" + st.ins + " words", { x: 56, y, size: 10, font });
      y -= 15;
      for (const o of ops.slice(0, 12)) {
        if (o.op === "same" || y < 80) continue;
        const mark = o.op === "del" ? "- " : "+ ";
        page.drawText((mark + o.text).slice(0, 90), {
          x: 72,
          y,
          size: 9,
          font,
          color: o.op === "del" ? PDFLib.rgb(0.7, 0.15, 0.15) : PDFLib.rgb(0.1, 0.5, 0.2),
        });
        y -= 13;
      }
      y -= 6;
    }
  }
  page.drawText(" totals: " + total.same + " same, " + total.del + " removed, " + total.ins + " added", { x: 56, y: Math.max(40, y), size: 10, font });
  return { bytes: await doc.save(), stats: total };
}

// Bake highlight/underline/strikeout markup into content, then drop annots.
export async function bakeMarkup(bytes, PDFLib) {
  const doc = await PDFLib.PDFDocument.load(bytes);
  let baked = 0;
  for (const p of doc.getPages()) {
    let annots = null;
    try {
      annots = p.node.Annots();
    } catch {
      continue;
    }
    if (!annots) continue;
    try {
      for (let i = annots.size() - 1; i >= 0; i--) {
        const d = doc.context.lookup(annots.get(i));
        let st = "";
        try {
          st = d.get(PDFLib.PDFName.of("Subtype")).toString().slice(1);
        } catch { /* skip */ }
        if (!["Highlight", "Underline", "StrikeOut"].includes(st)) continue;
        try {
          const r = d.get(PDFLib.PDFName.of("Rect"));
          const x1 = r.get(0).asNumber();
          const y1 = r.get(1).asNumber();
          const x2 = r.get(2).asNumber();
          const y2 = r.get(3).asNumber();
          p.drawRectangle({
            x: x1,
            y: y1,
            width: x2 - x1,
            height: y2 - y1,
            color: PDFLib.rgb(1, 1, 0),
            opacity: 0.4,
          });
          annots.remove(i);
          baked++;
        } catch { /* keep annot */ }
      }
    } catch { /* keep going */ }
  }
  return { bytes: await doc.save(), baked };
}
