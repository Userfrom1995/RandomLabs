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
