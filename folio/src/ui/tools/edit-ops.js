// Folio edit executors (M1 scope): N-up, booklet, overlay, compare
// (appends a real word-diff report page), markup bake. Write path is
// pdf-lib. White-box find/replace + paragraph cover-and-retype were purged:
// painting opaque rectangles over live text leaves the original bytes fully
// extractable, so they could never be honest edits.
import { wordDiff, diffStats } from "../../core/content/edit.js";
import { nupLayout, bookletOrder } from "../../core/content/nup.js";

export async function nupPdf(bytes, { n, margin }, PDFLib) {
  const src = await PDFLib.PDFDocument.load(bytes);
  const out = await PDFLib.PDFDocument.create();
  const [pw, ph] = [595, 842];
  const lay = nupLayout(n || 2, pw, ph, margin === undefined ? 18 : margin);
  const emb = await out.embedPdf(src, src.getPageIndices());
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
  const emb = await out.embedPdf(src, src.getPageIndices());
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
  const emb = await base.embedPdf(over, over.getPageIndices());
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
