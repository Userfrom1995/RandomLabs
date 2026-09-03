# Progress: Tabula

- **Issue:** #282
- **Branch:** opencode/issue282-20260903222718
- **PR:** #283
- **Status:** in-progress
- **Updated:** 2026-09-03T23:00:00Z

## Checklist
- [x] research: algorithmic specification (formula grammar, coercion table, error precedence, DFS cycles, Kahn minimal recalc, four proofs, per-function semantics, A1/R1C1 and edit laws, storage invariants, test/perf gates) in `docs/research/issue-282-tabula-spreadsheet.md`
- [x] architect: blueprint and module layout in `ideas/2026-09-03-tabula-spreadsheet-engine.md`
- [x] builder 0: de-risk (`Package.swift`, TabulaCore skeleton, `swift test` 12/12 green, hello-grid shell through Bridge batch shape, JavaScriptKit pin intent + WASM proof plan recorded; `carton build` proof DEFERRED per blueprint escape clause, upstream swift-wasm-6.3-RELEASE + carton 1.1.3 confirmed present)
- [ ] builder 1: core domain (Lexer, Parser, AST, Value, Ref, Graph, Eval, Clock)
- [x] builder 1: core domain (Parser recursive-descent with Excel precedence plus round-trip printer fix, Graph iterative-DFS cycles plus Kahn plus dirty closure plus volatile, Eval strict core plus lazy IF plus short-circuit AND/OR plus IFERROR/IFNA plus IS* plus injectable TODAY, Clock Lotus-bug serials; 30/30 `swift test` green)
- [ ] builder 2: function library plus 300+ oracle cases green
- [x] builder 2: function library (Builtins dispatch plus BuiltinMath/Text/Lookup/Date per section 7 semantics; 317-case hand-computed oracle green; 37/37 `swift test` green)
- [ ] builder 3: workbook plus edit laws plus codecs plus property suites plus 10k-cell proxy number
- [ ] builder 4: bridge plus grid UI (virtualized canvas, editor, inspector, formats, sort/filter views, freeze, resize, copy/paste/fill)
- [ ] builder 5: storage plus charts plus sample plus `tabula/docs/` plus landing link plus PWA plus visual pass plus full perf gate
- [ ] reviewer findings addressed
- [ ] tester approval plus maintainer merge

## Current step
Phase 2 complete: BuiltinMath/Text/Lookup/Date plus dispatch plus 317-case
oracle, 37/37 green.
Next is Phase 3 (Workbook sheets/names/structural edits/copy-paste/fill,
CSV/JSON codecs, property suites for graph invariants plus minimal-vs-full
plus edit laws plus round-trips, 10k-cell perf proxy number).

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
