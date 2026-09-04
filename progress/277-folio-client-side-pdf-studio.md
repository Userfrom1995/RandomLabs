# Progress: Folio (fully client-side PDF studio) - Milestone Epic

- **Issue:** #277
- **Branch (M4):** opencode/issue277-20260904164811
- **Status:** complete
- **Active Milestone:** M4 (complete, ready for review)
- **Updated:** 2026-09-04T17:30:00Z

## Milestone roadmap (Autonomous Milestone Epic Protocol, owner directive 2026-09-04)

- [x] **M1: Clean Core & Visual Page Grid (Refs #277, merged as 2ae1675d)**
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
- [x] **M2: Native AcroForms & Vector Markup (this PR, Refs #277)**
  - [x] Ink strokes as real `/Ink` annotation objects (InkList + bbox + RDP).
  - [x] Square/Circle/Line as real annotation objects (not content-burned).
  - [x] Quad-aware bake v2 (Highlight/Underline/StrikeOut/Ink/Square/Circle/Line).
  - [x] Forms roundtrip hardening: create/fill/flatten all 5 kinds, pdf.js verify.
  - [x] UI: ink/shape place annots, bake-all button, subtype delete filter.
- [ ] **M3: Client-Side WASM OCR & Converters (this PR, Refs #277)**
  - [x] Vendored Tesseract WASM (5.1.1 ESM + worker + LSTM core + eng
    best-int, 9,941,472 B under `folio/packs/ocr/`, consent-gated,
    Cache/OPFS cached, progress + cancel).
  - [x] Searchable PDF both directions: scanned-PDF overlay (11/11 words,
    96% conf, 1.2 s/page) + photo-to-PDF (15/15, 96%, 0.7 s).
  - [x] Office pack (mammoth 1.10.0 + SheetJS 0.18.5, 1,516,461 B):
    docx/xlsx to measured PDF, PDF paras to valid .docx, PDF lines to
    valid .xlsx. PPTX omitted (unverified, no stub).

- [ ] **M4: Modern UX & Direct Canvas Manipulation (this PR, Refs #277, final Closes #277)**
  - [x] M4a ingestion hardening: clickable dropzone (`index.html:73`),
    window drag guard, stale input reset, OPFS fallback (`opfs.js:37`),
    worker URL via `import.meta.url`, toast error boundaries.
  - [x] M4 overlay pure core (`viewer/overlay.js`): `pdfToCss`/`cssToPdf`
    roundtrip, drag normalize, 8-handle resize, move clamp,
    mode click-defaults commit, bookmark tree serialize (node 9/9).
  - [x] M4b canvas overlay (`viewer/overlay.js`): crop bbox + click/drag
    place for notes/shapes/links/stamps/signatures/images via M1/M2 ops.
  - [x] M4c form overlays + bookmark outline tree + studio layout
    (top bar, collapsible sidebar, toasts, progress, shortcuts).

## M4 blueprint (Architect, 2026-09-04)

- Blueprint: `ideas/2026-09-04-folio-m4-modern-ux-canvas.md` (overlay
  system, placement state machine, form/bookmark visual layers, studio
  layout, 6 ingestion targets, node + Playwright gates). Raw-coordinate
  primaries removed; numeric fields survive only as labeled a11y
  fallbacks in `<details>`. Single M4 PR, vertical slices M4a-M4c.
  Decision action: build.

## M1 checklist

- [x] purge: 14 files deleted, 8 facades + 9 spec-only controls removed, no disabled stubs remain
- [x] page engine polished: 30+ binary roundtrips green, content verified via external pdf.js parse
- [x] 2 real bugs found by the gates and fixed (embedPdf indices, viewer pdf.mjs path)
- [x] visual grid: live canvas thumbs, drag/kb/touch reorder through the engine, undo verified
- [x] headless visual loop: desktop + mobile screenshots reviewed, figure-margin fix, zero JS errors
- [x] unit 14/14, perf measured (200p merge 54 ms), docs + scoreboard + ideas entry updated

## Current step

M4 slice 3 landed (M4c form overlays positioned over AcroForm geometry
+ generated field list, bookmark outline tree in both routes, studio
shell with collapsible sidebar + shortcut sheet + global keys; node
15/15 + full 58 green, headless zero console errors, in-browser probe
with a live create/describe/fill engine roundtrip green). M4 is
complete. Final milestone PR uses `Closes #277`.

## Agent log

- 2026-09-04 (Builder, M4 slice 3): M4c - `describeFields` geometry
  export in `form-ops.js` (page via widget `P()` ref, rect via
  `getRectangle()`, options/value per kind, null-tolerant for the list
  fallback); tree-edit pure helpers in `overlay.js` (`addBookmarkNode`,
  `removeNode`, `moveNode`, `indentNode`, `outdentNode`); `#formlayer`
  overlay rendering one live HTML input per visible field on the
  current page via `pdfToCss` (change commits that field through the
  real `fillForm`), `#formlist` generated list with `Fill from this
  list`; `bmtext`/`ext-bmtext` textareas removed and replaced by a
  shared outline-tree editor (`#bmtree` + `#bmtree-pages`: inline
  rename, page numbers, up/down/indent/outdent/delete buttons, same-
  level drag reorder) feeding Set/TOC/Split through `treeToRows`;
  `filljson` survives only as a collapsed a11y fallback (id kept);
  studio shell (`wireStudio`: collapsible sidebar, `?` shortcut sheet,
  `v`/`Esc` disarm, `[`/`]` pages, Ctrl+z/y undo/redo, centered
  viewport). Verified: node folio-m4 15/15 (new: geometry roundtrip,
  tree edits, M4c anti-rot gate), full repo 58/58 green, headless boot
  zero console errors (statusbar stall reproduces on main: environment
  artifact), in-browser probe green (overlay math + tree indent +
  create/describe/fill roundtrip). Decision action: review (M4 final,
  Closes #277).

- 2026-09-04 (Builder, M4 slice 2): M4b canvas overlay - `#placetoolbar`
  with 8 armed modes + crosshair + ghost rect + live hint, persistent
  crop bbox (8 resize handles via `resizeBox`, body-drag via `moveBox`,
  arrows/Shift nudge, Enter applies, Esc cancels, `#croprow` Apply/Burn/
  Clear), `commitPlace` dispatching every mode through the real ops
  (`addStickyNote`, `addGeomAnnot`, `addLink` + `parsePlaceTarget`,
  `addStamp`, `signatureStamp`, `insertImage` framed by the drag rect,
  `createField`), overlay cleared on open/page/zoom, toasts on
  commit/error. Raw-coordinate primaries moved into labeled
  `<details class="a11y">` fallbacks (ids preserved: notexy, shapexy,
  linkrect, imgxy, fldrect, ext-crop); filljson/bmtext/ext-bmtext stay
  until the M4c tree replaces them. Fixed `#croprow[hidden]` losing to
  `.row{display:flex}`. Verified: node 12/12 new + 29 + 14 green,
  headless boot zero console errors, in-browser probe
  (`commitRect`/`parsePlaceTarget`/`initViewer` excuted live) green,
  screenshots reviewed. Headless statusbar stall reproduces identically
  on main (environment artifact, not a regression). Decision action:
  continue (M4c).

## M3 checklist

- [x] packs vendored same-origin with manifests (ocr 9,941,472 B, office
  1,516,461 B) + packs/ dir + licenses recorded in pack.json
- [x] OCR engine proven live in headless chromium (15/15 words, conf 95)
  before any UI was wired
- [x] overlay + image searchable paths E2E green with byte verification
  (13/13 download checks), 6 real bugs found by the gates and fixed
- [x] all six Office directions byte-verified (docx/xlsx to PDF, PDF to
  docx/xlsx); td>p table-escape bug found and fixed + regression test
- [x] M1/M2 purge asserts amended for the M3 restoration (real-engine
  proof required, disabled buttons need runtime enablers)
- [x] headless visual loop: #/ocr + #/convert desktop + 390px reviewed,
  zero pageerrors, :disabled styling added
- [x] unit 38/38, README + scoreboard M3 table + ideas entry updated

## Agent log

- 2026-09-04 (Builder, M4 slice 1): M4a ingestion hardening (whole
  dropzone clickable + keyboard, window dragover/drop guard with
  anywhere-drop-to-open, pick/pickB stale reset, worker URL via
  import.meta.url, setFile try/catch with dismissible toast + encrypted
  hint, OPFS SecurityError fallback to memory, determinate batch
  progress) + overlay pure core + #toasts/#batchprog/#canvaswrap/#overlay
  shell scaffold. Verified: node 9/9 new M4 tests, existing 29 + 14
  green, app/viewer/opfs syntax OK. Decision action: continue (M4b/M4c).
- 2026-09-04 (Builder, M3): vendored OCR/Office packs, pure core
  (ocr.js, zip.js, blocks.js, sheets.js), browser executors
  (ocr-ops.js, office-ops.js), #/ocr route + Convert Office card,
  CSP wasm-unsafe-eval, shell v3, typed pack caches v2. Verified: node
  38/38, live Tesseract 100% recall both paths, all Office directions
  byte-green, 13/13 download checks, screenshots reviewed (one
  transient headless flip frame logged, non-reproducible). 6 real bugs
  fixed. Docs: README, scoreboard M3 table, this file, ideas note.
  Decision action: review (final milestone: Closes #277).

## Agent log

- 2026-09-04 (Builder, M2): built Ink/geom annot objects + quad-aware bake
  + choice-fill validation + UI rewiring + real PWA icon. Verified: 33
  annot + 13 forms node roundtrips green, 3 pdf.js external parses green,
  existing suites 14/14 + 7/7, headless chromium desktop/mobile/annotate
  zero console errors with screenshots reviewed. 2 real bugs found by the
  gates and fixed (silent invalid-option select; unscoped PDFLib in bake
  helpers). Docs: README, scoreboard M2 table, this file, ideas note.
  Decision action: review.
- 2026-09-04 (Builder, rebase): PR #290 was CONFLICTING after plan PR #289
  merged to main (3caf426a). Reb clocked only one conflict (this file's
  header/current-step); resolved for M2, replayed 5 commits cleanly onto
  3caf426a. Re-verified: unit suites 21/21 green, fresh pdf-lib smoke
  (text+checkbox+dropdown create/fill/flatten roundtrip, 0 fields after
  flatten), choice-fill option guard confirmed in form-ops.js:42-44.
  Decision action: review.
- 2026-09-04 (Fixer): closed the createField silent-select hole (validate
  value against options in validateFieldDef plus pre-select guards on all
  three choice paths in form-ops.js) and flipped the M2 parent box to [x].
  Verified: core suites 21/21 green, unknown-value defs throw for
  dropdown/list/radio, valid values pass. Decision action: review.

## Next steps

- Merge this plan PR as Refs #277 (never Closes; Closes is reserved for
  the final M3 milestone PR per the blueprint).
- Maintainer dispatches M2 (Native AcroForms + Vector Markup) on a fresh
  milestone branch.

## Prior art (Phase A-E build, superseded where it conflicts with M1)

- Research: feature-parity matrix (`folio/docs/feature-matrix.md`, binding
  contract, unchanged) + spec (`folio/docs/research-spec.md`).
- Architect: blueprint (`ideas/2026-09-03-folio-client-side-pdf-studio.md`,
  including the Milestone Epic re-plan section).
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
- 2026-09-04 (Architect): re-planned #277 as M1/M2/M3 epic per owner
  directive; purge map for 8 facades with file-level targets
  (`ocr-ops.js`, `content-ops.js` white-rect path, regex redact mode,
  `security-ops.js` envelope path, `phaseE-ops.js`
  pdfaStamp/grayscaleStamp/attachNote, office consent + routing UI); M1
  keeps merge/split/rotate/delete/reorder/extract + drag-drop grid; M2
  pdf-lib forms + vector ink; M3 vendored WASM OCR + verified office.
  Decision action: build.
- 2026-09-04 (Fixer): rebased plan PR onto main 2ae1675d (M1 merged),
  kept M1 [x] checked state, preserved ideas 85-line M1/M2/M3 purge-map
  append, corrected Branch field to this PR head.
