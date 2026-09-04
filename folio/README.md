# Folio: fully client-side PDF studio

Merge, split, organize, compress, annotate, convert, and chain PDF operations
entirely in your browser. No uploads, no server, works offline after first load.

Open: `folio/index.html` (served at `/folio/` on GitHub Pages).

## Why

Server-upload PDF tools tax privacy (documents leave the device) and fail
offline. The browser already contains both halves of a PDF engine: pdf.js
parses and renders any real-world file, pdf-lib rewrites the object graph
losslessly, WebCrypto signs, canvas re-encodes images, WASM OCR reads scans.
Folio fuses them into one studio behind a binding parity contract
(`docs/feature-matrix.md`), a consent-gated pack model that keeps the core
instant, and a pipeline model (upload once, chain ops, undo) that beats
single-tool upload sites on workflow.

## How it works

- Ingest: drag-drop or picker yields File/Blob handles (never base64 in
  memory). Files register in an OPFS workspace (`folio/work/<jobId>/...`)
  with an in-memory fallback; history summaries live in IndexedDB (never
  file bytes, never passwords).
- Read path: vendored pdf.js (`vendor/`, same origin) parses and renders in
  its worker; `getTextContent` feeds the text-map builder (`src/core/textmap/`,
  eps_y = 0.4 x median font size, eps_x = 0.3 x median glyph width, plus
  x-histogram column clustering).
- Structural ops: every page op compiles to `copyPages` index lists
  (keep-set, permutation, chunking) plus O(1) mutations, followed by the
  reference fix-up pass (`src/core/pdf-engine/structural.js`).
- Write path: vendored pdf-lib (`vendor/pdf-lib.min.js`, same origin, no CDN).
- Pipeline: typed op envelopes with undo/redo (`src/core/pipeline/ops.js`).
- Milestone delivery: after the Phase A-E build, issue #277 was reopened
  under the Autonomous Milestone Epic Protocol. Milestone 1 (this branch)
  purged every facade (OCR theater, white-box text edit, stream-regex
  redact, AES envelope, PDF/A + grayscale stamps, Subject attachments,
  Office dumpers, spec-only buttons) and shipped the visual drag-and-drop
  page grid over the polished page engine. OCR and Office return in M3
  with real vendored engines; until then their buttons do not exist.

## Routes (hash router, each runs its own real engine op)

Pages, Compress, Security, Annotate, Edit, Images, Forms, Convert,
Workflow. M1 ships: viewer (pdf.js render + text map + search) with live
canvas page grid (click/drag/keyboard/touch-button reorder, rotate,
duplicate, delete, all with true byte-restore undo); structural backbone
(merge, split ranges/chunks/bookmarks, reverse, delete, odd/even, rotate,
insert, duplicate, extract, reorder, blank, resize, orient, crop +
burn-crop); headers/footers, page numbers, watermarks (text + image),
metadata set/scrub, JS/action inspect + scrub, signature stamp, lossless
optimize + profile-gated compress with corpus searchability gate, GC
rewrite; text-markup annotations (highlight/underline/strikeout with
QuadPoints), sticky notes, shapes, ink pad, stamps, links, Bates, image
watermarks, bookmarks + TOC, annotation list/delete, markup bake; N-up,
booklet, overlay, compare report; image census/extract/insert, scanner
effect, image replace overlay (labeled); AcroForm describe/fill/create/
flatten, XFA detector; PDF to text/markdown/HTML, text to PDF, CSV to
table PDF; info, repair, read-aloud, flatten-all, auto-rename batch,
booklet-ready print path, batch queue with per-file retry.
Cloud AI chat is the only exclusion (matrix section 8).

## Develop

Static only, no build step, no npm needed at runtime:

```sh
python3 -m http.server 8000
# open http://localhost:8000/folio/
node --test folio/tests/
```

Vendored deps (`folio/vendor/`): pdf-lib 1.17.1 UMD min, pdfjs-dist 4.4.168
ESM + worker, copied same-origin so the CSP needs no remote script sources.

## Layout

- `index.html` shell (3-column studio, hash router, consent cards)
- `src/core/` headless domain (structural, textmap, content, compress,
  crypto, forms, convert, pipeline) - unit-tested, no DOM
- `src/platform/` browser services (OPFS/memory storage, IDB history,
  pack manifests, worker clients)
- `src/ui/` shell + viewer + tool executors
- `packs/` consent manifests (byte sizes generated from real bundles)
- `docs/` parity matrix + research spec + architecture + scoreboard
- `tests/` node:test suite (18 groups, zero deps)
