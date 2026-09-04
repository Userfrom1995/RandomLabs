# 2026-09-04 - Folio M3 - client-side WASM OCR + Office converters

## What it is

Folio milestone 3 (final epic milestone, `Refs #277` -> `Closes #277`):
the two packs M1 purged as theater return as real vendored engines.
Same-origin on-demand packs, consent-gated (real byte size, progress,
cancel), cached in Cache Storage for offline reuse. Zero stubs: PPTX
and extra OCR languages stay out of the UI entirely.

## How it works

- `folio/packs/ocr/`: tesseract.js 5.1.1 ESM + worker, LSTM core
  (wasm.js glue + wasm), eng best-int model, `pack.json` manifest
  (9,941,472 B). `src/core/ocr/ocr.js` holds the pure math (invisible
  text-layer geometry at 72/dpi, opacity-0 bake, recall scoring);
  `src/ui/tools/ocr-ops.js` does consent/progress/cancel loading,
  worker boot (import.meta-absolute URLs, typed cache Responses),
  pdf.js grayscale raster, overlay + image-to-searchable assembly.
- `folio/packs/office/`: mammoth 1.10.0 + SheetJS 0.18.5 (1,516,461 B).
  `src/core/office/zip.js` is a dependency-free PKZIP reader/writer;
  `blocks.js` tokenizes mammoth HTML (table-aware: cell `<p>` cannot
  escape the table) into blocks rendered by measured pdf-lib layout,
  and assembles valid .docx packages; `sheets.js` renders ruled-table
  PDFs from SheetJS grids.
- Shell: `#/ocr` route (consent card, DPI, image-or-PDF flow, results +
  download), Convert Office card (docx/xlsx to PDF, PDF to docx/xlsx),
  CSP `wasm-unsafe-eval`, shell cache v3, `:disabled` button styling.
- Key files: `folio/src/core/ocr/ocr.js`, `folio/src/core/office/*.js`,
  `folio/src/ui/tools/{ocr,office}-ops.js`, `folio/tests/folio-m3.test.js`.

## Verification

- node: 38/38 green (m3 9/9: pack manifest bytes, layer geometry, zip
  roundtrip, html/table/cell-paragraph parsing, docx + xlsx chains).
- Headless chromium: Tesseract 15/15 words conf 95 on a rendered Latin
  scan; overlay 11/11 at 1.2 s/page; image 15/15 at 0.7 s; all six
  Office directions byte-verified; zero pageerrors; desktop + 390px.
- Six E2E-caught bugs fixed (worker-relative corePath, untyped cache
  MIME, CSP wasm block, blob: script block, td>p table escape, stale SW
  shell). No facades: every new control executes a real engine.

- the Builder
