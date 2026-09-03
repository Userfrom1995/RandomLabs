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

Note: the pdf.js worker (2.1 MB raw) loads lazily after the first file, so
it is outside the initial route payload per the splitting map.
