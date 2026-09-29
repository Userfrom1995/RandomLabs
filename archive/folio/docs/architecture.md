# Folio architecture (build record)

Pointer: the binding blueprint is
`ideas/2026-09-03-folio-client-side-pdf-studio.md` (the Architect).
The binding parity contract is `docs/feature-matrix.md`; the algorithmic
foundations are `docs/research-spec.md`. This file records what the Builder
actually shipped per phase.

## Phase A (scaffold + shell + read + structural backbone) - this run

- Zero-build static app: `index.html` shell + ES-module `src/` tree, served
  directly by GitHub Pages (no bundler, no runtime npm, no CDN).
- Same-origin vendoring: `vendor/pdf-lib.min.js` (525 KB, ~207 KB gzip),
  `vendor/pdf.mjs` (~123 KB gzip) + `vendor/pdf.worker.mjs`. Initial payload
  stays near the 1-2 MB budget; OCR/Office engines stay out of the core.
- Domain shipped headless with tests (`tests/core.test.js`, 7/7 green):
  structural planners + fix-up pass, text-map (line sort, column clustering,
  paragraphs, reading order), compress profiles + coverage gate, redact
  filter + acceptance helper, N-up/booklet math, table finder + CSV,
  markdown inference, pack manifest parser + consent state machine,
  auto-rename + Perms flags, op pipeline (apply/undo/redo).
- Shell shipped: drag-drop ingest, OPFS/memory workspace, IDB history
  (summaries only), pdf.js viewer (zoom, search, thumbnails, page modes via
  strip), hash router with 10 tool routes, pipeline bar with undo/redo/export,
  consent cards (OCR/Office, honest Phase-A placeholders over live fallbacks),
  PWA manifest + service worker (shell + lazy worker cached; pack caches fill
  only after consent), sample-PDF generator so every route has content.
- Tool executors live for: merge, split (ranges/chunks), delete, odd/even,
  reverse, rotate, insert, duplicate, lossless optimize, metadata scrub,
  header/footer, page numbers, watermark, metadata edit, page-to-PNG,
  images-to-PDF, PDF-to-text/markdown/html, text-to-PDF, info census,
  tolerant repair re-save, read-aloud TTS.
- Deliberately NOT faked: password crypto (pdf-lib cannot encrypt; ships in
  Phase C via a real crypto path), burn-in redact (Phase B content-stream
  filter; overlay-only redaction is refused by design), OCR engine and
  Office renderer (Phase C/D packs; consent UX already live).

## Scoreboard stub

See `docs/scoreboard.md`. T1-T5 measured on the fixed corpus from Phase C on.
