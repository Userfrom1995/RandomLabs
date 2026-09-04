# Progress: Folio (fully client-side PDF studio) - Milestone Epic

- **Issue:** #277
- **Branch (M1):** opencode/issue277-20260904120709
- **Status:** in-progress
- **Active Milestone:** M1 (Complete, ready for review)
- **Updated:** 2026-09-04T00:00:00Z

## Milestone roadmap (Autonomous Milestone Epic Protocol, owner directive 2026-09-04)

- [x] **M1: Clean Core & Visual Page Grid (this PR, Refs #277)**
  - Purge all 8 stubbed/fake features + UI controls (OCR theater,
    white-box text edit, stream-regex redact, AES envelope, fake PDF/A,
    fake grayscale, Subject attachments, Office dumpers) plus spec-only
    buttons (downsample/PDF-A/linearize notes, cert placeholder +
    validate, deskew check, URL import spec).
  - Polish the working page engine (merge, split, rotate, delete,
    reorder, extract) with binary roundtrips + external-parser content
    verification.
  - Interactive visual drag-and-drop thumbnail grid with live canvas
    previews (click/drag/keyboard/touch-button, true undo).
  - Dynamic verification: Playwright interaction + screenshots
    (desktop 1280 + mobile 390), zero JS errors.
- [ ] **M2: Native AcroForms & Vector Markup (next PR, Refs #277)**
  - Native form fill + flatten (text, checkbox, radio via pdf-lib Form APIs).
  - Native vector annotation layer (freehand ink, highlight, underline, rects).
- [ ] **M3: Client-Side WASM OCR & Converters (later PR, Refs #277)**
  - Vendored Tesseract WASM with real language models (same-origin pack,
    consent-gated, Cache/OPFS cached).
  - Real client-side docx parsing only when verified.

## M1 checklist

- [x] purge: 14 files deleted, 8 facades + 9 spec-only controls removed, no disabled stubs remain
- [x] page engine polished: 30+ binary roundtrips green, content verified via external pdf.js parse
- [x] 2 real bugs found by the gates and fixed (embedPdf indices, viewer pdf.mjs path)
- [x] visual grid: live canvas thumbs, drag/kb/touch reorder through the engine, undo verified
- [x] headless visual loop: desktop + mobile screenshots reviewed, figure-margin fix, zero JS errors
- [x] unit 14/14, perf measured (200p merge 54 ms), docs + scoreboard + ideas entry updated

## Current step

M1 complete on this branch: `folio/` boots in a real browser (first time:
the viewer pdf.mjs import was broken on main), every visible control runs
a real engine op, grid interactions commit through reorderPages with
byte-restore undo. Ready for Reviewer (anti-facade) + Tester (adversarial).

## Next steps

- Reviewer pass on this PR; Fixer addresses findings here.
- Maintainer merges, then dispatches M2 on a fresh milestone branch.

## Prior art (Phase A-E build, superseded where it conflicts with M1)

- Research: feature-parity matrix (`folio/docs/feature-matrix.md`, binding
  contract, unchanged) + spec (`folio/docs/research-spec.md`).
- Architect: blueprint (`ideas/2026-09-03-folio-client-side-pdf-studio.md`).
- Phases A-E built the scaffold, page engine, annotations, security,
  compress, OCR/Office packs, Tier 2/3 rows. M1 kept everything real from
  that build and purged everything that was theater; see the M1 checklist.

## Agent log

- 2026-09-04 (Builder, M1): purged 14 files / 8 facades + 9 spec-only
  controls (index.html, app.js minus 566 lines, security/edit/phaseE/
  convert executors trimmed, crypto/edit/optimize/tier2 core trimmed,
  csvTableSpec moved to textmap/tables.js, bboxIntersects moved to
  annotate.js). Fixed viewer `../../../vendor/pdf.mjs` import (app could
  never boot in a browser before). Fixed embedPdf-without-indices (nup/
  booklet/overlay emitted 1-page garbage). Built visual grid
  (`#pagegrid` live canvas thumbs, `gridDropOrder` pure + tested,
  toolbar + keyboard + DnD, keepSel byte-undo). Verified: unit 14/14,
  node E2E roundtrips + pdf.js content parse green, playwright
  click/kb/drag/touch reorder green with settled opchain + undo, zero JS
  errors desktop + mobile, screenshots reviewed (figure-margin fix),
  200-page merge 54 ms. Docs: README, scoreboard M1 table, this file,
  ideas note. Decision action: review.
