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
- [ ] 4. Phase C: security/compress/OCR/convert-core (S1-S2,S5-S6,O1,O6,C1,C3,V1,V5-V9) + corpus gates
- [ ] 5. Phase D: Office pack V3 + fallback V4 + consent manifest wiring (V2 writers)
- [ ] 6. Phase E: Tier 2 then Tier 3 rows, CSP/PWA hardening, T1-T5 scoreboard, Playwright pass, docs

## Current step
Phase B complete and verified (unit 12/12, pdf-lib E2E, pdf.js read-path proof). Next: Phase C (security/compress/OCR/convert-core + corpus gates).

## Next steps
- Builder continue run: Phase C security (AES-256 V=5 encrypt/decrypt + Perms via crypto worker), compress rasterize-per-page profiles on fixed corpus with ratio + searchability gates, OCR pack wiring (consent download, pool, mode-3 layer), convert-core writers (CSV/XLSX tables, DOCX/PPTX assemblers).
- Single branch/PR across `continue` cycles. Cloud AI chat stays excluded per matrix section 8.
- Landing (`index.html`) + README links go in with the final run.

## Agent log
- 2026-09-03 (Builder run 2, Phase B): text-map lines now carry w/h/word boxes (additive). New pure domain: `core/annotate/annotate.js` (quads, hit regions, Bates, bookmarks, RDP ink, link validation), `core/content/edit.js` (find spans, paragraph plan, LCS word diff), `core/content/burnin.js` (inflate/scrub/deflate per-stream, precise per-word blanking, decoded verifier), `core/images/images.js` (fit math, scanner spec, census), `core/forms/forms.js` (field validation, fill coercion, XFA sniff). New executors: annotate-ops (markup/sticky/shapes/ink/stamp/links/Bates/bookmarks+TOC/image watermark/ann list+delete), edit-ops (find-replace/paragraph-edit/N-up/booklet/overlay/compare/bake-markup), image-ops (census/extract/insert/scanner filter), form-ops (describe/fill/create/flatten/XFA), redact-ops (opaque bake + stream scrub + metadata scrub + acceptance). Key result: TRUE burn-in for WinAnsi text (precise hex/literal blanking in inflated streams, same-ref rewrite); pdf.js proof shows redacted words gone and kept words in the same Tj run intact. Known limitation kept honest: Differences-encoded subsets and Identity-H glyph IDs cannot byte-scrub (verifier reports leftovers, UI refuses PASS). Full shell UI wired on all four routes (ink pad canvas included); 81/81 wired IDs resolve. Decision action: continue.

## Agent log
- 2026-09-03 (Researcher run 1): surveyed 9 suites (55+ tools) + pdf-lib/pdf.js primitives; committed matrix (70+ rows, pack + tier per row) and research spec (copyPages primitive, coverage-gated compressor, burn-in redact filter, paragraph-box reflow, PAdES feasibility, mode-3 OCR layer, pack strategy). Decision action: architect.
- 2026-09-03 (Architect run 1): resolved all five open handoff items (route splitting, worker topology with ocr-pool + crypto worker, OPFS/Cache/IDB schema, pack manifest + consent card, Tier 1 Phase A-E plan); wrote blueprint to `ideas/2026-09-03-folio-client-side-pdf-studio.md`. Decision action: build.
- 2026-09-03 (Builder run 1, Phase A): zero-build static scaffold (no bundler; Pages serves directly). Vendored pdf-lib 1.17.1 + pdfjs-dist 4.4.168 same-origin. Shipped headless domain (structural planners + fix-up, text-map, compress profiles + coverage gate, redact filter + acceptance, N-up/booklet, tables + CSV, markdown inference, pack manifest + consent FSM, naming + Perms, pipeline ops) with `folio/tests/core.test.js` 7/7 green; shell (ingest, OPFS/memory, IDB history, viewer, 10-route router, pipeline bar, consent cards, PWA, sample generator); 20+ live tool executors. E2E verified in node against real vendored pdf-lib (sample gen, merge 3+3=6, split ranges, reverse, rotate, watermark, text-to-PDF roundtrips). Honest stubs only: password crypto (Phase C), burn-in redact (Phase B), OCR/Office packs (Phase C/D). Decision action: continue.
