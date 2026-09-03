// Folio bundled sample PDF generator (R7): builds a 3-page PDF with pdf-lib
// so every route has content before the user uploads anything.
export async function buildSamplePdf(PDFLib) {
  const { PDFDocument, StandardFonts, rgb } = PDFLib;
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const pages = [
    { title: "Folio sample report", body: "Folio is a fully client-side PDF studio. All bytes stay on this device. This first page exercises the text map: headings, paragraphs, and a small table of tools.", table: [["Tool", "Pack", "Tier"], ["Merge", "CORE", "1"], ["OCR", "OCR-PACK", "1"], ["Office", "OFFICE-PACK", "1"]] },
    { title: "Second page: columns and lists", body: "Left column talks about compression profiles low medium high extreme. Right column lists annotation shapes rectangle ellipse line arrow polygon.", table: [["Profile", "DPI", "Quality"], ["low", "150", "0.7"], ["medium", "110", "0.55"], ["high", "80", "0.4"]] },
    { title: "Third page: pipeline", body: "Upload once, chain operations, undo and redo. Batch queue fans one operation across many files. Export writes to OPFS output plus a download link.", table: [["Step", "Store", "Undo"], ["merge", "op-pipeline", "yes"], ["redact", "content filter", "yes"]] },
  ];
  for (const p of pages) {
    const page = doc.addPage([595, 842]);
    page.drawText(p.title, { x: 56, y: 780, size: 22, font: bold, color: rgb(0.1, 0.12, 0.2) });
    const words = p.body.split(" ");
    let line = "";
    let y = 740;
    for (const w of words) {
      const trial = line ? line + " " + w : w;
      if (font.widthOfTextAtSize(trial, 12) > 480 && line) {
        page.drawText(line, { x: 56, y, size: 12, font });
        y -= 18;
        line = w;
      } else line = trial;
    }
    if (line) page.drawText(line, { x: 56, y, size: 12, font });
    y -= 30;
    for (const row of p.table) {
      page.drawText(row.join("   |   "), { x: 56, y, size: 10, font });
      y -= 16;
    }
    page.drawText("Folio sample - page " + (doc.getPageCount()), { x: 56, y: 50, size: 9, font, color: rgb(0.5, 0.5, 0.55) });
  }
  doc.setTitle("Folio sample report");
  doc.setProducer("Folio sample generator");
  return doc.save();
}
