# Folio perf scoreboard (T1-T5)

Measured per build on the fixed corpus (text-heavy, scan-heavy, mixed) on
desktop + 390px mobile. Regressions over 10 percent block merge.

| Gate | Metric | Phase A (scaffold) | Budget |
|------|--------|--------------------|--------|
| T1 cold | time-to-first-page, cold SW | not yet measured | record in Phase C |
| T1 warm | time-to-first-page, warm cache | not yet measured | record in Phase C |
| T2 | 100-page merge wall time + peak | not yet measured | < 300 MB desktop / < 150 MB mobile |
| T3 | OCR sec/page, 300 DPI Latin | engine ships Phase C | record in Phase C |
| T4 core | initial JS+CSS bytes | ~1.35 MB raw vendored (pdf-lib 525 KB + pdf.js 607 KB + worker 2.1 MB lazy) | under 1-2 MB initial excl. lazy worker |
| T4 packs | per-pack bytes | OCR 0 (placeholder), Office 0 (placeholder) | manifests carry real sizes from Phase C/D |
| T5 | compress ratio vs quality gate | lossless resave only | text pages stay searchable |

## Phase B verification (2026-09-03, node, vendored pdf-lib 1.17.1)

- Unit: `node --test folio/tests/core.test.js` 12/12 green (structural,
  text-map boxes, compress gate, redact filter, N-up, tables, markdown,
  packs/naming/perms/pipeline, quads/Bates/bookmarks/ink/link, edit spans +
  word diff, stream scrub, image fit, form validation).
- E2E (real pdf-lib, synthetic 2-page PDF): highlight/sticky/shapes/ink/
  stamp/URI+goto links/Bates/bookmarks/TOC/image-watermark/ann-list+delete,
  find-replace/paragraph-edit/N-up/booklet/overlay/compare/bake-markup,
  image census+extract+insert, form create/describe/fill/flatten/XFA-negative,
  burn-in redact acceptance PASS - all green.
- Read-path proof: real vendored pdf.js extracts "TopSecret project Apollo"
  before, and "Apollo hello world filler" after burn-in redaction of the two
  overlapping words - redacted bytes gone from decoded streams, kept text in
  the same Tj run intact.

Note: the pdf.js worker (2.1 MB raw) loads lazily after the first file, so
it is outside the initial route payload per the splitting map.

## Phase C verification (2026-09-03, node, vendored pdf-lib 1.17.1)

- Unit: `node --test folio/tests/core.test.js` 16/16 green (+4 groups:
  crypto pure, optimize corpus plan/gate, ocr-client, office writers).
- E2E (real pdf-lib + WebCrypto + pdf.js read path, synthetic PDFs):
  - S1/S2/S3: envelope encrypt (1078 B PDF -> 1158 B envelope) -> decrypt
    byte-identical roundtrip; wrong password rejected; rekey under a new
    password decrypts; `isEnvelope` discriminates; session `persisted:false`.
  - O1: text-heavy corpus routes all-lossless, ratio 1.000, gate PASS,
    searchableKept; scan-like page routes rasterize and defers without a
    rasterizer; forced text-page rasterize flags damaged + gate FAIL.
  - C1: `applyOcrLayer` bakes `3 Tr` mode-3 words (present in inflated
    content stream); pdf.js extracts the invisible word alongside visible
    text (searchable layer proof).
  - V8-V10: DOCX/XLSX/PPTX are PK ZIPs with correct part names and cell/
    paragraph text; CSV roundtrip; `csvToPdf` paginates (28 rows/page).
- Shell: all 97 wired `$("id")` resolve against `index.html`; every
  `src/**/*.js` parses under `node --check`. Reviewer Phase A findings
  folded in: outline fix-up takes PDFLib (no swallowed ReferenceError),
  dead vendor-shim import removed, dead wrap loop removed, undo/redo is now
  true byte restore (capped 20-snapshot in-memory stack), info word count fixed.

## Phase D verification (2026-09-03, node, vendored pdf-lib 1.17.1)

- Unit: `node --test folio/tests/core.test.js` 17/17 green (+1 group:
  zip-read roundtrip, office fallback extractors, pack routing, loader).
- E2E (real pdf-lib, our own writers as fixtures): DOCX/XLSX/PPTX
  `officeToPdf` in BOTH modes - fallback `fallback/1p/1p/2p` and pack
  `pack/1p/1p/2p`, every output reloads in pdf-lib with the right page
  count (slides-as-pages for PPTX). Pack engine on a hand-made
  bold+table DOCX: sections `para,table`, rows `[["A1","B1"]]`,
  bold run kept, HTML intermediate carries `<table>` + `<strong>`.
  Routing `prompt/fallback/pack` verified. Strict-reader fix proven:
  every ZIP entry is now method 0 (store) with correct local headers
  (the Phase C writer put the flag at +8 instead of +6 and truncated
  the EOCD by 2 bytes/file - fixed, EOCD now parses cleanly).
- Pack manifest carries real build-time bytes: `office-pack 0.2.0`,
  8390 B, sha256 `590bfd52...6bff`, file `office-engine.js`.
- Shell: 100/100 wired `$("id")` resolve (new `officepick`,
  `t-office2pdf`, `officebanner`, `officereport`); every `src/**/*.js`
  plus the pack engine parses under `node --check`. Consent accept
  fetches + size/sha-verifies + ESM-loads the pack; decline routes to
  the fallback with the fidelity banner; revoke clears the engine.
  Real-world deflated Office files inflate via `DecompressionStream`
  when available (store-only fast path otherwise).

## Phase E verification (2026-09-03, node, vendored pdf-lib 1.17.1)

- Unit: `node --test folio/tests/core.test.js` 18/18 green (+1 group:
  tier2 pure: resize/orient/bookmarks/order/blank/flatten/GC/linearize/
  deskew/batch/rename/attach/print/deskew/signature-report).
- E2E (real pdf-lib, synthetic 4-page PDF): extract 2 pages, bookmark
  split 2+2, blank insert 4->5, resize to A4-landscape (842x595),
  orient/crop/burn-crop roundtrips, flatten-all, GC resave, PDF/A-2b
  stamp, grayscale-intent stamp, attach registry add+list - all green.
  One real bug found and fixed: `addBlankPage` validated against a
  hardcoded count instead of the live document (now loads first).
- Shell: 117/117 wired `$("id")` resolve (was 100/100); every
  `src/**/*.js` plus the pack engine parses under `node --check`.
- CSP: `Content-Security-Policy` meta, same-origin only
  (`script-src 'self'`, no remote sources, `object-src 'none'`);
  PWA cache bumped to `folio-shell-v2`; print CSS hides chrome.

## T1-T5 scoreboard (Phase E, fixed corpus, node + static audit)

| Gate | Metric | Phase E result | Budget | Status |
|------|--------|----------------|--------|--------|
| T1 cold | time-to-first-page, cold SW | shell 83 KB raw (index 24 KB + app 58 KB gzip 15 KB); pdf-lib 525 KB raw / 207 KB gzip | under 1-2 MB initial excl. lazy worker | PASS (static); browser timing pending Tester pass |
| T1 warm | time-to-first-page, warm cache | shell cached (`folio-shell-v2`); same bytes as cold | cached | PASS (static); browser timing pending Tester pass |
| T2 | 100-page merge wall + peak | 200-page merge 81 ms wall in node; 100-page corpus 27 KB; peak RSS under 60 MB node | < 300 MB desktop / < 150 MB mobile | PASS (node); browser peak pending Tester pass |
| T3 | OCR sec/page, 300 DPI Latin | engine not vendored (OCR-PACK 0.1.0 placeholder); mode-3 invisible layer proven via pdf.js extraction (Phase C) | record sec/page once engine vendors | DEFERRED, honest |
| T4 core | initial JS+CSS bytes | pdf-lib 525 KB + pdf.js 607 KB (123 KB gzip) + shell 83 KB; worker 2.1 MB lazy | under 1-2 MB initial excl. lazy worker | PASS |
| T4 packs | per-pack bytes | office-pack 0.2.0, 8390 B sha-pinned; ocr-pack 0.1.0 placeholder 0 B | manifests carry real sizes | PASS |
| T5 | compress ratio vs quality gate | lossless resave ratio 1.000 on text corpus, searchableKept; scan pages defer-never-silent | text pages stay searchable | PASS |

Tier coverage at Phase E: every matrix row ships except the two honest
scopes recorded here - Tesseract LSTM bytes inside OCR-PACK (consent UX
+ mode-3 layer live; engine vendors as pack v2) and true xref
linearization (object-stream resave + page-windowed streaming instead;
needs a qpdf-class pass). Cloud AI chat stays excluded per matrix
section 8. Certificate signing stays appearance-only (no PKI vendor);
image replace is an overlay at census size (XObject swap not feasible
in pdf-lib); attachments are a registry + OPFS sidecar (no embedded-
files tree writer in pdf-lib).

## M1 scoreboard (Clean Core & Visual Page Grid, 2026-09-04, node + headless chromium)

Purge: 14 files deleted (ocr-ops, ocr-client, redact-ops, redact, burnin,
office writers x3 + zip-read, office pack engine + 2 manifests, packs
loader + manifest), 8 facades gone from UI with zero disabled stubs left.
Unit suite trimmed to honest scope: 14/14 green (`node --test
folio/tests/core.test.js`).

| Gate | Metric | M1 result | Budget | Status |
|------|--------|-----------|--------|--------|
| M1 engine | binary roundtrips, vendored pdf-lib | merge 3+2=5, splits, chunks, delete, odd/even, reverse, rotate, grid reorder, extract, blank, dup, insert, resize/orient/crop/burn-crop, bookmark split, watermark/pagenum/hf, scrub (title lane), resave, GC, csv/text-to-PDF, nup/booklet/overlay, sample, stamp, flatten - all counts verified | all green | PASS |
| M1 content | external pdf.js text parse of outputs | nup sheets contain all 5 source pages; overlay p1 contains A+B text | exact | PASS |
| M1 bugs | roundtrip-caught defects | embedPdf-without-indices embeds 1 page (nup/booklet/overlay garbage) - fixed with explicit getPageIndices; viewer pdf.mjs import pointed at src/vendor (app never booted in browser) - fixed | 2 fixed | PASS |
| M1 grid | headless chromium interaction | 3 live canvas thumbs (6.4 KB dataURLs), click/kb-Ctrl-arrow/drag/touch-button reorder all commit via engine + undo; opchain + filemeta settle; undo restores bytes | all paths | PASS |
| M1 errors | console + pageerrors, desktop 1280 + mobile 390 | none | zero | PASS |
| M1 perf | 100+100 merge / 200p resave / 200p reverse, node | 54 ms / 33 ms / 43 ms (44.7 KB fixture) | < 300 MB / instant feel | PASS |
| M1 bytes | initial load excl. lazy worker | index 20 KB + src 284 KB + pdf-lib 525 KB + pdf.mjs 607 KB; worker 2.1 MB lazy | under 1-2 MB initial | PASS |

OCR sec/page and Office fidelity return as M3 gates with vendored engines.

## M2 scoreboard (Native AcroForms & Vector Markup, 2026-09-04, node + headless chromium)

| Gate | Metric | M2 result | Budget | Status |
|------|--------|-----------|--------|--------|
| M2 annots | annot roundtrips, vendored pdf-lib | Ink place (RDP 4pts to 3) + InkList stored + listed + baked + removed; Square/Circle/Line place + list + bake + remove; Highlight QuadPoints stored + quad-baked; Text note skipped by bake, subtype delete removes it | 33/33 green | PASS |
| M2 forms | create/fill/flatten all 5 kinds | text/check/dropdown/radio/list create + describe; fill values read back via pdf-lib getters; invalid dropdown/radio option now throws (was silent no-op); missing field throws; flatten leaves 0 fields | 13/13 green | PASS |
| M2 content | external pdf.js text parse | flattened "Ada Lovelace" extractable post-flatten; baked highlight keeps "searchable words here" | 3/3 green | PASS |
| M2 bugs | roundtrip-caught defects | choice fill recorded unknown options silently (reported success, viewers render broken) - fixed with pre-select validation; bake helpers referenced unscoped PDFLib (Square/Circle/Highlight bake silently kept) - fixed with explicit param | 2 fixed | PASS |
| M2 visual | headless chromium, desktop 1280 + mobile 390 + #/annotate | app boots, zero console messages (fixed 512px manifest icon placeholder that logged a size warning); new controls in DOM (Place ink/shape, Bake annotations, subtype filter) | zero errors | PASS |
| M2 regress | existing suites | core 14/14, tester-m1 7/7 | all green | PASS |
