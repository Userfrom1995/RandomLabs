// Folio OCR executors (C1, C3): pack fetch with progress/cancel/retry +
// mode-3 invisible text layer emission (real, via pdf-lib Tr=3 operators).
// The LSTM engine itself is OCR-PACK; applyOcrLayer takes recognized words
// (from the pack, or pasted hOCR in tests) and bakes a searchable layer.
import { OCR_DPI, ocrJobSpec, mode3Spec, poolSize, ocrProgressReducer, HANDWRITING_NOTE } from "../../core/ocr-client/ocr.js";

export { OCR_DPI, ocrJobSpec, mode3Spec, poolSize, ocrProgressReducer, HANDWRITING_NOTE };

// Consent-aware pack fetch with byte progress + cancel + sha check hook.
// fetchImpl/loadPackBytes injected for tests; onCancel via AbortController.
export async function fetchPack(manifest, { onProgress, signal, loadBytes }) {
  if (!manifest || !manifest.files || !manifest.files.length) throw new Error("pack manifest has no files");
  let state = "downloading";
  const chunks = [];
  let done = 0;
  for (const f of manifest.files) {
    if (signal && signal.aborted) {
      state = "idle";
      throw new Error("pack download cancelled");
    }
    const bytes = await loadBytes(f, signal);
    chunks.push({ name: f, bytes });
    done += bytes.length;
    if (onProgress) onProgress({ file: f, done, total: manifest.bytes || done });
  }
  state = "verifying";
  return { state, files: chunks, totalBytes: done };
}

// Bake recognized words as rendering-mode-3 (invisible but extractable)
// text: pagesWords: [{page (0-based), words:[{text,x,y,size}]}] in PDF points
// with y measured from the TOP (pdf.js convention); converted to PDF bottom-origin.
export async function applyOcrLayer(pdfBytes, pagesWords, PDFLib) {
  const doc = await PDFLib.PDFDocument.load(pdfBytes);
  const font = await doc.embedFont(PDFLib.StandardFonts.Helvetica);
  const { PDFOperator, PDFOperatorNames, PDFNumber } = PDFLib;
  let placed = 0;
  for (const pw of pagesWords) {
    const pg = doc.getPage(pw.page);
    const { height } = pg.getSize();
    pg.pushOperators(PDFOperator.of(PDFOperatorNames.SetTextRenderingMode, [PDFNumber.of(3)]));
    for (const w of pw.words || []) {
      if (!w.text) continue;
      pg.drawText(w.text, { x: w.x, y: height - w.y, size: Math.max(4, w.size || 10), font });
      placed++;
    }
    pg.pushOperators(PDFOperator.of(PDFOperatorNames.SetTextRenderingMode, [PDFNumber.of(0)]));
  }
  return { bytes: await doc.save(), placed };
}
