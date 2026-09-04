# 2026-09-04 - Folio M4 - Modern UX & Direct Canvas Manipulation

## Summary

Folio milestone 4 (new final epic milestone, `Refs #277` during work,
`Closes #277` on the verified final PR): answers the owner audit
2026-09-04T16:44:40Z. M1 shipped the clean page engine, M2 native
forms/vector markup, M3 vendored WASM OCR + Office packs. M4 hardens
ingestion (6 defects) and replaces every developer-harness input
(raw-coordinate textboxes, raw-JSON textarea, pipe-delimited bookmark
text) with direct visual manipulation on the canvas, inside a modern
studio layout. Zero facades: every overlay commits through the real
M1/M2 engines; nothing visual is a mock.

## Deliverables

- Ingestion hardening: clickable dropzone, window drag guard, stale
  input reset, OPFS fallback, worker URL resolution, toast error
  boundaries.
- Canvas overlay system: interactive crop bbox + click-to-place /
  drag-to-place for notes, shapes, links, stamps, signatures, images.
- Form overlay: HTML inputs positioned over AcroForm fields
  (generated field-list fallback), bookmark outline tree, studio
  layout (top bar + collapsible sidebar + centered viewport, toasts,
  progress, shortcuts).

## Why

M1-M3 proved every engine is real, but the shell still leaks
developer-harness ergonomics: only the word "choose" opens the picker,
drops outside the zone destroy the session, incognito crashes before
`openDocument`, and users must hand-compute PDF points. The Excellence
Charter (end-user perspective) makes this blocking: a world-class
studio is click-anywhere, drag-anywhere-safe, and place-by-clicking.

## How It Works

- Overlay layer: an absolutely-positioned `#canvaswrap` holds
  `#pagecanvas` plus a transparent `#overlay` div. PDF points map to
  CSS pixels via the pdf.js viewport (`page.getViewport({scale})`
  width/height ratio against the rendered canvas box); one pure
  helper `pdfToCss(rect, pageBox, canvasBox)` in a new
  `src/ui/viewer/overlay.js` (pure math, unit-testable in node).
- Placement state machine: toolbar buttons arm a mode
  (`crop | note | shape | link | stamp | sign | image`), the canvas
  shows a crosshair + live ghost rect, click commits a point placement
  and drag commits a rect placement. Commit paths call the existing
  M1/M2 ops (`placeNote`, `placeShape`, `addLink`, stamp/sign content
  ops, `imgInsert`) with the overlay-derived rect. Crop mode renders
  a draggable bbox (8 handles, pointer events) and commits to the
  existing reversible `crop` op; Burn uses the same bbox.
- Accessibility: overlays are pointer-first; keyboard users nudge the
  active rect with arrows (Shift for 10pt) and commit with Enter.
  Precise numeric fields survive only inside a collapsed
  `<details class="a11y">` per tool, labeled as screen-reader /
  keyboard fallback, never the primary path.
- Forms: `form-ops.js` exposes field geometry (name, type, rect,
  options, value); the overlay renders one HTML input per visible
  field on the current page, positioned via `pdfToCss`. Fill commits
  through the existing `fillForm` engine. When geometry is missing
  (hidden fields), a generated field-list form renders the same
  inputs in a card. The raw `filljson` textarea is removed.
- Bookmarks: the pipe-delimited `bmtext`/`ext-bmtext` textareas are
  replaced by an outline tree (nested `<ul>`, indent/outdent/drop
  reorder via pointer + keyboard, "Add bookmark at current page",
  rename inline). It serializes to the existing bookmark core
  (`setBookmarks`, `splitByBookmarks`).
- Layout: keep all hash routes and op engines untouched; restyle the
  shell only (`index.html` + CSS): slim top action bar (file, sample,
  undo/redo/export, search, zoom), collapsible icon sidebar for tool
  routes, centered document viewport, toast stack (dismissible,
  `role=alert`), determinate progress bar for OCR/pack/batch, `?`
  shortcut sheet (arrows, Ctrl+arrows, Delete, Enter, Esc).
- Ingestion fixes (exact targets): `index.html:73` dropzone gets
  `cursor:pointer`, hover/focus states, and a click listener
  (`dropzone.click() -> filepick.click()`); `app.js` `wire()` adds
  `window dragover/drop preventDefault` guards, resets
  `pick.value=""`/`pickB.value=""` after each read, resolves the
  worker via `new URL('vendor/pdf.worker.mjs', import.meta.url).href`
  (viewer keeps its default), wraps `setFile`/ingest in try/catch
  that shows a dismissible toast (corrupt/encrypted/unsupported) and
  never leaves the statusbar on "Loading..."; `opfs.js:37`
  `writeFile` wraps the OPFS path in try/catch and falls back to
  `mem.set()` on `SecurityError`/`NoModificationAllowedError`.

## Module Breakdown

- `folio/src/ui/viewer/overlay.js` (new, pure + DOM-thin): `pdfToCss`,
  `cssToPdf`, placement-mode controller, bbox handle math. Pure math
  importable in node tests; DOM wiring isolated so tests run headless.
- `folio/index.html`: studio layout, `#canvaswrap` + `#overlay`,
  toast stack, progress bar, outline tree containers, removal of
  `notexy/shapexy/linkrect/imgxy/fldrect/ext-crop/filljson/bmtext/
  ext-bmtext` primary textboxes (a11y `<details>` only).
- `folio/src/ui/shell/app.js`: ingestion guards, overlay wiring,
  form-overlay render, bookmark tree render, toast/progress/shortcut
  shell. No engine changes.
- `folio/src/ui/tools/form-ops.js`: field-geometry export for the
  overlay (no behavior change to fill/flatten).
- `folio/src/platform/storage/opfs.js`: guarded `writeFile` fallback.
- `folio/src/ui/viewer/viewer.js`: expose current page viewport dims
  for `pdfToCss` (small additive export, no render-path change).

## Test Matrix

- node unit: `pdfToCss`/`cssToPdf` roundtrip (portrait + landscape +
  rotated viewports), bbox handle clamp math, bookmark tree
  serialize/indent roundtrip, OPFS-fallback simulation (forced throw
  -> memory write readable), worker URL resolution shape.
- Headless Chromium (Playwright, desktop 1280 + 390px mobile):
  click-anywhere-on-dropzone opens picker; window-level drop outside
  the zone never navigates; re-pick of the same file fires; corrupt
  PDF shows a dismissible toast and the shell stays usable;
  click-to-place note/shape/link and drag-to-place crop produce
  byte-different PDFs whose annotations parse back via pdf.js;
  form overlay fill roundtrips through `fillForm`; screenshots
  reviewed with zero console errors/pageerrors.
- Gates enforce anti-facade: every overlay button must commit bytes
  through a real engine op; any dead control is removed, never
  disabled with "coming soon".

## Milestone slices (single M4 PR, vertical order)

- M4a ingestion hardening (6 fixes + toast system). M4b canvas
  overlay + placement modes + crop bbox. M4c form overlays +
  bookmark tree + studio layout polish. Builder lands slices in
  order with modular commits; Reviewer/Tester gate the whole PR.

- the Architect
