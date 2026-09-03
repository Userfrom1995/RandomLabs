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
- [ ] 3. Phase B: annotate/edit/images/forms core (E1-E4,E6-E7,E9-E10,E12-E14,E17,I1-I3,I5,F1,F3) + redact acceptance (S5)
- [ ] 4. Phase C: security/compress/OCR/convert-core (S1-S2,S5-S6,O1,O6,C1,C3,V1,V5-V9) + corpus gates
- [ ] 5. Phase D: Office pack V3 + fallback V4 + consent manifest wiring (V2 writers)
- [ ] 6. Phase E: Tier 2 then Tier 3 rows, CSP/PWA hardening, T1-T5 scoreboard, Playwright pass, docs

## Current step
Phase A complete and verified. Next: Phase B (annotate/edit/images/forms core + burn-in redact).

## Next steps
- Builder continue run: Phase B annotate/edit/images/forms executors (text-markup quads from text map, ink, stamps, links, Bates, paragraph edit + find-replace via content-stream filter, image extract/replace, AcroForm fill/create/flatten) + redact acceptance gate, then Phases C-E per blueprint.
- Single branch/PR across `continue` cycles. Cloud AI chat stays excluded per matrix section 8.
- Landing (`index.html`) + README links go in with the final run.

## Agent log
- 2026-09-03 (Researcher run 1): surveyed 9 suites (55+ tools) + pdf-lib/pdf.js primitives; committed matrix (70+ rows, pack + tier per row) and research spec (copyPages primitive, coverage-gated compressor, burn-in redact filter, paragraph-box reflow, PAdES feasibility, mode-3 OCR layer, pack strategy). Decision action: architect.
- 2026-09-03 (Architect run 1): resolved all five open handoff items (route splitting, worker topology with ocr-pool + crypto worker, OPFS/Cache/IDB schema, pack manifest + consent card, Tier 1 Phase A-E plan); wrote blueprint to `ideas/2026-09-03-folio-client-side-pdf-studio.md`. Decision action: build.
- 2026-09-03 (Builder run 1, Phase A): zero-build static scaffold (no bundler; Pages serves directly). Vendored pdf-lib 1.17.1 + pdfjs-dist 4.4.168 same-origin. Shipped headless domain (structural planners + fix-up, text-map, compress profiles + coverage gate, redact filter + acceptance, N-up/booklet, tables + CSV, markdown inference, pack manifest + consent FSM, naming + Perms, pipeline ops) with `folio/tests/core.test.js` 7/7 green; shell (ingest, OPFS/memory, IDB history, viewer, 10-route router, pipeline bar, consent cards, PWA, sample generator); 20+ live tool executors. E2E verified in node against real vendored pdf-lib (sample gen, merge 3+3=6, split ranges, reverse, rotate, watermark, text-to-PDF roundtrips). Honest stubs only: password crypto (Phase C), burn-in redact (Phase B), OCR/Office packs (Phase C/D). Decision action: continue.
