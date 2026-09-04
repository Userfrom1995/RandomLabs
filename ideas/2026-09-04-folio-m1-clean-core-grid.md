# Folio M1 - Clean Core & Visual Page Grid

**What it is:** Milestone 1 of the Folio epic (#277) under the Autonomous
Milestone Epic Protocol: a facade purge plus a real visual page organizer
for the fully client-side PDF studio at `/folio/`.

**Why:** The Phase A-E build shipped breadth with theater inside: an OCR
route with no engine, white-box "edits" that left original bytes
extractable, stream-regex "redaction" whose gate could pass while fragments
survived, an AES envelope that is not a PDF password, Producer-flag
"PDF/A" and "grayscale", attachments that never traveled with the file,
and Office dumpers that dropped layout. The Anti-Facade Guard says a clean
UI with rock-solid tools beats 100 buttons with 80 broken. M1 deletes the
theater and polishes what is real.

**How it works (key files):**

- Purge (14 files deleted, ~2250 lines net removed): OCR route/consent/
  engine, white-box find-replace + paragraph cover-retype, burn-in redact
  executor + stream-scrub core, AES envelope + cert placeholder, PDF/A +
  grayscale stamps, Subject attachment registry, all Office writers/packs,
  pack loader/manifest, 9 spec-only buttons. `csvTableSpec` moved to
  `folio/src/core/textmap/tables.js`; `bboxIntersects` moved to
  `folio/src/core/annotate/annotate.js`.
- Page engine (`folio/src/ui/tools/pages-ops.js` + `phaseE-ops.js`): merge,
  split (ranges/chunks/bookmarks), reverse, delete, odd/even, rotate,
  insert, duplicate, extract, reorder, blank, resize, orient, crop +
  burn-crop, flatten-all, GC rewrite. Two genuine bugs fixed:
  `embedPdf` needs explicit indices (else 1-page output), and the viewer
  imported pdf.mjs from a nonexistent path (app never booted in browser).
- Visual grid (`folio/index.html` + `folio/src/ui/shell/app.js`):
  `#pagegrid` renders live pdf.js canvas thumbnails (`renderThumbnail`),
  click previews, HTML5 drag-drop commits through `gridDropOrder` (pure,
  unit-tested) + `reorderPages`, toolbar (rotate/duplicate/move
  left-right/delete) and keyboard (arrows/Ctrl+arrows/Delete) cover touch
  and a11y, selection survives ops via `keepSel`, everything lands in the
  pipeline with byte-restore undo.
- Verification: `node --test folio/tests/` 14/14; node E2E binary
  roundtrips with page-count asserts plus external pdf.js text-content
  asserts (nup keeps all pages, overlay draws B onto A); playwright-core +
  system chromium interaction suite (click/kb/drag/touch reorder, settled
  opchain, undo byte restore, desktop 1280 + mobile 390 screenshots,
  zero JS errors); perf 100+100 merge 54 ms.
- Notes: OCR and Office return in M3 with real vendored engines; the old
  `#/ocr` hash falls back to `#/pages`. `folio/docs/scoreboard.md` carries
  the M1 measurement table.
