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
