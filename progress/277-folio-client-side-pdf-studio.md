# Progress: Folio (fully client-side PDF studio)

- **Issue:** #277
- **Branch:** opencode/issue277-20260903191417
- **Status:** in-progress
- **Updated:** 2026-09-03T00:00:00Z

## Checklist
- [x] research: feature-parity matrix (`folio/docs/feature-matrix.md`) + algorithmic spec (`folio/docs/research-spec.md`)
- [x] architect: blueprint (`ideas/2026-09-03-folio-client-side-pdf-studio.md`) with splitting map, worker topology, OPFS schema, pack manifest + consent UX, Tier 1 plan
- [x] 1. Scaffold `folio/` (Vite + TS + vitest + Playwright, vendored deps, shell router, tokens, PWA shell, root landing link, scoreboard stub)
- [x] 1b. Phase A scaffold (zero-build static variant): vendored pdf-lib 1.17.1 + pdfjs-dist 4.4.168 same-origin, shell router, PWA shell, packs manifests, scoreboard stub. Landing links deferred to final run.
- [x] 2. Phase A core: ingest/OPFS/states/sample (R6,R7), viewer R1, structural P1-P3/P6-P9/P19 + fix-up, pipeline R2
- [x] 3. Phase B: annotate/edit/images/forms core (E1-E4 + E5/E8/E11/E13-E15 bonuses, E6-E7, E9-E10, E12-E14, E17, I1-I3, I5-I6, F1-F4) + redact acceptance (S5)
- [x] 4. Phase C: security/compress/OCR/convert-core (S1-S4 envelope-honest,S6-S9 stamps+specs,O1,O6,C1,C3,V1-V2,V5-V11 core) + corpus gates
- [x] 5. Phase D: Office pack V3 + fallback V4 + consent manifest wiring (V2 writers)
- [ ] 6. Phase E: Tier 2 then Tier 3 rows, CSP/PWA hardening, T1-T5 scoreboard, Playwright pass, docs

## Current step
Phase E step 2 complete and verified (117/117 wired IDs resolve, all modules parse, unit 18/18). Next: Phase E step 3 (CSP/PWA hardening, T1-T5 scoreboard, docs, landing + README links).

## Next steps
- Builder continue run: Phase E (Tier 2/3 rows, CSP/PWA hardening, T1-T5 scoreboard on the fixed corpus, Playwright pass, docs).
- Single branch/PR across `continue` cycles. Cloud AI chat stays excluded per matrix section 8.
- Landing (`index.html`) + README links go in with the final run.

## Agent log
- 2026-09-03 (Builder run 4, Phase D): Office V3 pack + V4 fallback behind one consent card. New pure domain: `core/convert/zip-read.js` (EOCD scan, stored sync extract, async inflate injection), `core/convert/office-fallback.js` (DOCX paragraphs+headings, XLSX shared-strings+sheets, PPTX slides, fidelity banner), `core/convert/office-pack.js` (prompt/fallback/pack routing, job spec, fidelity contract, manifest file+size verify), `platform/packs/loader.js` (cache keys, size/progress/sha helpers). Pack engine `packs/office-engine.js` 0.2.0 (8390 B, sha-pinned in manifest): DOCX tables + bold/italic runs, XLSX sheet names + header rows, PPTX title/body split, print-CSS HTML intermediate. Executors: `officeToPdf` both modes with paginated pdf-lib renderer (slides-as-pages, A4 helper). Shell: real consent accept (fetch + size/sha verify + ESM load), fallback banner, Office file picker + Office-to-PDF button. Real bugs fixed: Phase C ZIP writer flag offset (+8 vs +6) truncated EOCD and set method 2048 (now strict-safe method 0); XLSX cell-attr regex dropped `t=` (lazy-match). Verification: unit 17/17, dual-mode E2E green, 100/100 IDs, all modules parse. Decision action: continue.

## Agent log
- 2026-09-03 (Builder run 3, Phase C): new pure domain `core/crypto/crypto.js` (AES-GCM envelope descriptor, zeroing, JS inspector, ByteRange, INTEGRITY/TRUST verdict), `core/compress/optimize.js` (corpus planner + searchability gate, resave/grayscale/PDF-A/linearize specs), `core/ocr-client/ocr.js` (300 DPI job spec, 72/dpi affine map, mode-3 spec, pool sizing, C3 progress reducer), `core/convert/office.js` (store-only ZIP + CRC32, minimal valid DOCX/XLSX/PPTX, CSV table spec, URL import spec). New executors: security-ops (envelope encrypt/decrypt/rekey via WebCrypto, JS report, signature stamp, cert-sign placeholder with ByteRange), compress-ops (profile-gated compress, browser PNG rasterize for image pages, deferred-never-silent), ocr-ops (pack fetch with progress/cancel, true Tr=3 invisible layer), convert-ops (docx/xlsx/pptx/csv writers, csvToPdf, URL spec). Shell wired on security/compress/OCR/convert routes (97/97 IDs). Reviewer Phase A findings folded: outlines PDFLib param, vendor-shim dead path removed, dead loop removed, TRUE byte-restore undo/redo (cap 20). Honest scopes kept: envelope is not native PDF V=5 (labeled in UI), CMS/PKCS#12 signing Phase E, Tesseract engine Phase D. Decision action: continue.

## Agent log
- 2026-09-03 (Builder run 2, Phase B): text-map lines now carry w/h/word boxes (additive). New pure domain: `core/annotate/annotate.js` (quads, hit regions, Bates, bookmarks, RDP ink, link validation), `core/content/edit.js` (find spans, paragraph plan, LCS word diff), `core/content/burnin.js` (inflate/scrub/deflate per-stream, precise per-word blanking, decoded verifier), `core/images/images.js` (fit math, scanner spec, census), `core/forms/forms.js` (field validation, fill coercion, XFA sniff). New executors: annotate-ops (markup/sticky/shapes/ink/stamp/links/Bates/bookmarks+TOC/image watermark/ann list+delete), edit-ops (find-replace/paragraph-edit/N-up/booklet/overlay/compare/bake-markup), image-ops (census/extract/insert/scanner filter), form-ops (describe/fill/create/flatten/XFA), redact-ops (opaque bake + stream scrub + metadata scrub + acceptance). Key result: TRUE burn-in for WinAnsi text (precise hex/literal blanking in inflated streams, same-ref rewrite); pdf.js proof shows redacted words gone and kept words in the same Tj run intact. Known limitation kept honest: Differences-encoded subsets and Identity-H glyph IDs cannot byte-scrub (verifier reports leftovers, UI refuses PASS). Full shell UI wired on all four routes (ink pad canvas included); 81/81 wired IDs resolve. Decision action: continue.

## Agent log
- 2026-09-03 (Researcher run 1): surveyed 9 suites (55+ tools) + pdf-lib/pdf.js primitives; committed matrix (70+ rows, pack + tier per row) and research spec (copyPages primitive, coverage-gated compressor, burn-in redact filter, paragraph-box reflow, PAdES feasibility, mode-3 OCR layer, pack strategy). Decision action: architect.
- 2026-09-03 (Architect run 1): resolved all five open handoff items (route splitting, worker topology with ocr-pool + crypto worker, OPFS/Cache/IDB schema, pack manifest + consent card, Tier 1 Phase A-E plan); wrote blueprint to `ideas/2026-09-03-folio-client-side-pdf-studio.md`. Decision action: build.
- 2026-09-03 (Builder run 1, Phase A): zero-build static scaffold (no bundler; Pages serves directly). Vendored pdf-lib 1.17.1 + pdfjs-dist 4.4.168 same-origin. Shipped headless domain (structural planners + fix-up, text-map, compress profiles + coverage gate, redact filter + acceptance, N-up/booklet, tables + CSV, markdown inference, pack manifest + consent FSM, naming + Perms, pipeline ops) with `folio/tests/core.test.js` 7/7 green; shell (ingest, OPFS/memory, IDB history, viewer, 10-route router, pipeline bar, consent cards, PWA, sample generator); 20+ live tool executors. E2E verified in node against real vendored pdf-lib (sample gen, merge 3+3=6, split ranges, reverse, rotate, watermark, text-to-PDF roundtrips). Honest stubs only: password crypto (Phase C), burn-in redact (Phase B), OCR/Office packs (Phase C/D). Decision action: continue.
