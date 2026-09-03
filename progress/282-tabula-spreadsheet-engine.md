# Progress: Tabula

- **Issue:** #282
- **Branch:** opencode/issue282-20260903222718
- **PR:** #283
- **Status:** complete
- **Updated:** 2026-09-04T00:00:00Z

## Checklist
- [x] research: algorithmic specification (formula grammar, coercion table, error precedence, DFS cycles, Kahn minimal recalc, four proofs, per-function semantics, A1/R1C1 and edit laws, storage invariants, test/perf gates) in `docs/research/issue-282-tabula-spreadsheet.md`
- [x] architect: blueprint and module layout in `ideas/2026-09-03-tabula-spreadsheet-engine.md`
- [x] builder 0: de-risk (`Package.swift`, TabulaCore skeleton, `swift test` 12/12 green, hello-grid shell through Bridge batch shape, JavaScriptKit pin intent + WASM proof plan recorded; `carton build` proof DEFERRED per blueprint escape clause, upstream swift-wasm-6.3-RELEASE + carton 1.1.3 confirmed present)
- [ ] builder 1: core domain (Lexer, Parser, AST, Value, Ref, Graph, Eval, Clock)
- [x] builder 1: core domain (Parser recursive-descent with Excel precedence plus round-trip printer fix, Graph iterative-DFS cycles plus Kahn plus dirty closure plus volatile, Eval strict core plus lazy IF plus short-circuit AND/OR plus IFERROR/IFNA plus IS* plus injectable TODAY, Clock Lotus-bug serials; 30/30 `swift test` green)
- [ ] builder 2: function library plus 300+ oracle cases green
- [x] builder 2: function library (Builtins dispatch plus BuiltinMath/Text/Lookup/Date per section 7 semantics; 317-case hand-computed oracle green; 37/37 `swift test` green)
- [ ] builder 3: workbook plus edit laws plus codecs plus property suites plus 10k-cell proxy number
- [x] builder 3: workbook (sheets/names/recalc/structural edits/copy-paste/fill/undo/styles) plus Series fill laws plus Format display plus JSON/CSV/TSV codecs plus 24 property/law suites; 10k-cell proxy full=121ms minimal=82ms (debug, budget 250ms); 61/61 `swift test` green in 0.35s
- [ ] builder 4: bridge plus grid UI (virtualized canvas, editor, inspector, formats, sort/filter views, freeze, resize, copy/paste/fill)
- [x] builder 4: bridge plus grid UI (BridgeSession batch/inspect/sort-filter in Swift, 77/77 green; web fallback engine with Excel-precedence parser plus 60-function library plus graph plus edit laws, virtualized canvas with freeze/resize, editor plus formula bar, inspector with cycle paths, format panels, sort/filter views, clipboard TSV with injection guard, sample workbook)
- [x] builder 5: storage (OPFS autosave plus quota flag plus CSV import plus clipboard TSV) plus charts (live bar/line/pie plus skip-not-plot) plus highlight rule plus `tabula/docs/` (proofs plus semantics plus scoreboard) plus landing links plus versioned PWA plus full perf gate (Swift proxy 136/93ms, fallback 760/739ms, parse 77519/s) plus 74/74 oracle parity
- [ ] reviewer findings addressed
- [ ] tester approval plus maintainer merge

## Current step
Phase 5 complete: all five builder milestones landed on this branch.
77/77 `swift test` green; `node --check` clean on all 11 web modules;
charts plus OPFS plus CSV import plus highlight plus PWA plus docs live;
perf gates pass; 74/74 oracle parity (fixed two fallback defects: date
serials +1, lookup approx flag inverted). Root landing plus README link
Tabula. Ready for review on the same PR.

## Next steps
- Builder Phase 5 on this branch: storage plus charts plus sample plus
  `tabula/docs/` proofs/semantics/scoreboard plus landing link plus PWA
  plus visual pass plus full perf gate.
- Then review on the same PR across `continue` cycles.

## Next steps
- Builder Phase 4 on this branch: bridge plus grid UI (virtualized canvas,
  editor, inspector, formats, sort/filter views, freeze, resize,
  copy/paste/fill).
- Then Phase 5 in order on the same PR across `continue` cycles.

## Next steps
- Builder Phase 3 on this branch: workbook plus edit laws plus codecs plus
  property suites plus 10k-cell proxy number.
- Then Phases 4-5 in order on the same PR across `continue` cycles.
- WASM proof (carton 1.1.3 + swift-wasm-6.3-RELEASE SDK + JavaScriptKit
  0.35.x pin) lands before Phase 4 UI depth; plan in
  `tabula/docs/architecture.md`.
- Single technique, single PR: never split scaffolding and engine and UI into separate PRs.

## Agent log
- 2026-09-03 (Researcher run 1): wrote `docs/research/issue-282-tabula-spreadsheet.md` (grammar, value domain, graph algorithms, proofs, semantics, laws, gates). Decision action: architect.
- 2026-09-03 (Architect run 1): read architect.md, issue #282, and the research spec. Verified Swift 6.3 present in the image. Produced blueprint at `ideas/2026-09-03-tabula-spreadsheet-engine.md` (SwiftPM packages TabulaCore plus TabulaBridge, zero-build static web UI, batch-only Bridge protocol, virtualization budget, binding test matrix and 10k-cell gate, Phase 0 de-risk, v2 deferrals). Wrote this progress file. Decision action: build.
- 2026-09-03 (Builder Phase 0): scaffolded `tabula/` (Package.swift tools 6.0, TabulaCore: TabulaCore/Addr/ErrorCode, TabulaBridge: Bridge/WasmBridge stub, 12 swift-testing tests green on Swift 6.3.3), zero-build shell (index.html, web/app.js rendering DirtyBatch shape via labeled stub, styles, manifest, sw.js; node --check + HTML parse OK), `tabula/docs/architecture.md` (wire shape pinned, toolchain evidence, WASM proof deferred per escape clause after confirming upstream swift-wasm-6.3-RELEASE + carton 1.1.3 exist), README, docs/index.md, builder ideas entry. Decision action: continue (Phase 1 core domain).
- 2026-09-03 (Builder Phase 1a): finished the partial Phase 1 (Lexer/AST/Value/Ref already landed at ec01f5d). Added `Parser.swift` (recursive descent, Excel precedence, sheet-qualified refs, arrays, `LOG10(`-style call-vs-ref rule), `Clock.swift` (injectable today plus Lotus-bug serial/civil math), `Graph.swift` (precedent extraction, iterative DFS cycles with paths and dependent taint, Kahn restricted to dirty, volatile-union closure, deterministic Addr order), `Eval.swift` (strict core, lazy IF, short-circuit AND/OR with prior-error-wins, IFERROR/IFNA, non-propagating IS*, injectable TODAY; non-logic calls stay `#NAME?` for Phase 2 dispatch), `Phase1Tests.swift` (18 suites: round-trip corpus, coercion cells, all 49 error pairs, graph cycle/closure/Kahn, clock anchors). Fixed three latent defects the build exposed: `ErrorCode` missing `Error` conformance (Result Failure), failable `UnicodeScalar` init on UTF-16 units (surrogate-pair decoder), `A$1` lexing split at `$`. 30/30 `swift test` green on Swift 6.3.3. Decision action: continue (Phase 2 function library).
- 2026-09-03 (Builder Phase 2): wrote `Builtins.swift` (BuiltinContext with scalar/range/grid folding plus literal/member split, single dispatch), `BuiltinMath.swift` (SUM family, ROUND/TRUNC half-away with exact negative-n scaling, MOD divisor-sign, SUMPRODUCT), `BuiltinText.swift` (scalar-indexed LEFT/RIGHT/MID, U+0020 TRIM, TEXTJOIN, VALUE, four-pattern TEXT), `BuiltinLookup.swift` (case-insensitive exact keys, binary approx plus MATCH 1/-1, lazy CHOOSE), `BuiltinDate.swift` (DATE overflow normalization, DATEDIF remainders, EDATE/EOMONTH clamping), wired dispatch into `Eval.swift` (lookup params now `@escaping`), `Phase2Tests.swift` (317 hand-computed oracle cases: 52 agg plus 65 scalar plus 6 close plus 61 text plus 60 lookup plus 54 date plus 13 dispatch, plus TODAY/NOW). Fixed two self-caught defects before landing: ROUND/TRUNC negative-n 1-ulp division error (multiply-back path) and MATCH -1 ascending-assumption binary search (binaryLastGE). Two oracle rows were mislabeled by hand (CHOOSE branch index, SUMPRODUCT bool coercion) and corrected, implementation exonerated both times. 37/37 `swift test` green on Swift 6.3.3. Decision action: continue (Phase 3 workbook plus laws).
- 2026-09-03 (Builder Phase 3): wrote `Workbook.swift`, `Series.swift`, `Format.swift`, `Codecs.swift` plus 24 property/law suites; 10k-cell proxy full=121ms minimal=82ms debug; 61/61 green in 0.35s. Decision action: continue (Phase 4 bridge plus grid UI).
- 2026-09-03 (Builder Phase 4a): Swift session layer. Wrote `Sources/TabulaBridge/Session.swift` (BridgeSession: EngineEdit batch apply with one minimal recalc for pure writes, diff-based DirtyBatch with row-run plus vertical-merge coalescing, fullSnapshot, JSON-safe InspectorView, per-sheet SheetView with stable sort honoring the Core total order plus errors-last and filter rules) plus `Sources/TabulaCore/Inspector.swift` (public inspect/topology API). Fixed two self-caught defects the tests exposed: sort ranked strings with numbers (split direction ranks) and descending put text above numbers (direction-specific ranks). `Tests/TabulaCoreTests/Phase4Tests.swift` (16 suites: batches, wire round-trip, coalescing coverage, inspector trace/cycle/parse-error, sort/filter stability). 77/77 green. Decision action: continue (Phase 4b web UI).
- 2026-09-03 (Builder Phase 4b): web UI on the documented fallback engine. Wrote `tabula/web/engine.js` (A1/$ parser with Excel precedence, value domain plus coercion table plus error precedence, 60-function library, iterative-DFS cycles plus Kahn minimal recalc, structural edits with base-only host shift plus single-taint/range-clamp, paste/fill previews, JSON/CSV codecs with injection guard, DirtyBatch producer with coalescing). Fixed two self-caught defects smoke checks exposed: power base bound unary (`-2^2` gave 4) and AND/OR missing short-circuit break. Wrote `grid.js` (virtualized canvas, freeze quadrants, resize, range select), `editor.js` (overlay plus formula bar with parse positions kept), `inspector.js` (trace plus topo rank plus cycle path with jump), `format.js` (recalc-pure style panels), `views.js` (presentation-only sort/filter plus freeze plus structural ops), `storage.js` (clipboard TSV with sidecar formulas inside the app and values-only plus `=`-quoting outside, file save/load), `sample.js` (all families plus one deliberate cycle), rewrote `index.html`/`app.js`/`styles.css` (full shell, keyboard map, sheet tabs, status/batch readout, mobile layout). `node --check` clean on all 9 modules. Decision action: continue (Phase 5 storage plus charts plus docs plus perf gate).
- 2026-09-04 (Builder Phase 5): charts.js (live bar/line/pie, skip-not-plot)
  plus chart-source sample rows plus panel wiring; storage.js OPFS autosave
  plus quota flag plus RFC-4180 CSV import plus formula-mode confirm;
  format.js threshold highlight rule plus grid fillRGB painting; versioned
  sw.js PWA shell plus icon plus manifest; docs/proofs.md plus semantics.md
  plus scoreboard.md; fixed two parity-caught fallback defects (date +1,
  approx inversion); measured gates (Swift 136/93ms, fallback 760/739ms,
  parse 77519/s, parity 74/74); root landing plus READMEs; 77/77 green.
  Status: complete. Decision action: review.
