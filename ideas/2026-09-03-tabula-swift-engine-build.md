# Tabula - from-scratch Swift spreadsheet engine (build log)

Date: 2026-09-03. Issue: #282. PR: #283. Name: **Tabula** (board pick
2026-09-03, fresh language Swift via SwiftWasm, fresh category spreadsheet).

## What it is

A from-scratch spreadsheet engine in Swift: formula lexer/parser/AST,
dependency-graph recalculation (iterative DFS cycles, Kahn minimal recalc,
volatile handling), full function library (math, text, lookup, date, logic),
A1/R1C1 + ranges + cross-sheet + named ranges, virtualized canvas grid,
conditional formatting, sort/filter views, CSV/JSON/OPFS storage, live
bar/line/pie charts. Pages-hosted at `/tabula/`, offline after first load.

## Why

Spreadsheets are the most-used programming environment on earth and the
recalc graph is a black box. Tabula opens it: every formula is a graph edge
you can trace, every recalculation a topological sweep you can step through.

## How it works (as of Phase 0)

`TabulaCore` (pure Swift, `swift test`) owns addresses, the column codec,
error codes with precedence, and soon the lexer through evaluator.
`TabulaBridge` ships one `DirtyBatch` JSON snapshot per recalc
(`{seq, ranges, cells}`); the zero-build static shell (`web/app.js`) renders
snapshots on canvas and never computes values. WASM packaging (`carton` +
JavaScriptKit, only in `WasmBridge.swift`) follows the recorded toolchain
proof; until then a labeled stub feeds the shell and Swift is the semantic
authority.

## Key files

- `tabula/Package.swift`, `tabula/Sources/TabulaCore/` (TabulaCore, Addr,
  ErrorCode), `tabula/Sources/TabulaBridge/` (Bridge, WasmBridge),
  `tabula/Tests/TabulaCoreTests/`, `tabula/web/`, `tabula/index.html`,
  `tabula/docs/architecture.md`
- Spec: `docs/research/issue-282-tabula-spreadsheet.md`; blueprint: this
  file's companion `ideas/2026-09-03-tabula-spreadsheet-engine.md`;
  progress: `progress/282-tabula-spreadsheet-engine.md`

## Notes

- Swift 6.3.3 in image; `swift test` 12/12 green at Phase 0.
- carton missing, no SDKs installed; upstream swift-wasm-6.3-RELEASE +
  carton 1.1.3 confirmed, proof deferred per blueprint escape clause.
- Single PR (#283) across `continue` cycles; 10k-cell gate blocks merge.

## Phase 1 (core domain, landed)

Lexer, Parser (recursive descent, Excel precedence, round-trip printer),
AST, Value (normative coercions, General number grammar, total order),
Ref (A1/R1C1, ranges, cross-sheet, names), Graph (iterative-DFS cycles,
Kahn dirty-only, volatile closure), Eval (strict core, lazy IF,
short-circuit AND/OR, IFERROR/IFNA, IS*, injectable TODAY), Clock
(Lotus-bug serials). 30/30 green.

## Phase 2 (function library, landed)

`Builtins.swift` (context, row-major folding with literal/member split,
rectangular grids, dispatch), `BuiltinMath.swift` (SUM family with
literal-coerce/member-skip rule, ROUND half-away with exact negative-n
scaling, MOD divisor-sign, SUMPRODUCT zero-for-text), `BuiltinText.swift`
(scalar-indexed LEFT/RIGHT/MID, U+0020 TRIM, TEXTJOIN, VALUE rejecting
bools, TEXT over four patterns), `BuiltinLookup.swift`
(case-insensitive exact keys, binary approx/MATCH 1/-1, lazy CHOOSE),
`BuiltinDate.swift` (DATE overflow normalization, DATEDIF remainders incl.
MD quirk, EDATE/EOMONTH clamping), `Phase2Tests.swift` (317-case oracle,
all hand-computed). 37/37 green.

## Phase 3 (workbook plus laws, landed)

`Workbook.swift` (sheets, names, minimal/full recalc, structural edits with
base-only host shift plus single-taint/range-clamp, rename-follow,
sheet-delete taint, paste translation, Series-backed fill, undo, recalc-pure
styles), `Series.swift` (fill laws), `Format.swift` (display),
`Codecs.swift` (canonical JSON, CSV/TSV with injection guard), 24
property/law suites. 10k-cell proxy full=121ms minimal=82ms (debug).
61/61 green.

## Phase 4 (bridge plus grid UI, landed)

`Inspector.swift` (public inspect/topology API), `Session.swift`
(BridgeSession batch/diff/inspect/sort-filter), `Phase4Tests.swift`
(16 suites, 77/77 green), plus the full zero-build web UI on the documented
fallback engine (`engine.js`: grammar, coercions, 60 functions, graph,
edit laws, codecs behind the pinned wire): virtualized canvas with
freeze/resize, editor plus formula bar, inspector with cycle paths, format
panels, sort/filter views, clipboard TSV, sample workbook.

## Phase 5 (storage plus charts plus docs plus gates, landed)

`charts.js` (live bar/line/pie SVG over label+value ranges, skip-not-plot
rule, pure view), OPFS debounced autosave with quota-degraded footer flag,
CSV import with formula-mode confirm (injection guard), one threshold
highlight rule evaluated lazily in getCell (grid now paints fillRGB, which
also lights up the format fill picker), versioned PWA shell with icon,
`docs/proofs.md` plus `semantics.md` plus `scoreboard.md`. Parity run
74/74 green and caught two genuine fallback defects (date serials +1,
VLOOKUP/HLOOKUP approx flag inverted), both fixed. Perf: Swift proxy
full=136ms minimal=93ms (debug, budget 250ms); fallback full=760ms
minimal=739ms (budget 1s); parse 77519/s (budget 50k/s). 77/77 green.
Brainstorm improvement beyond the blueprint minimum: the highlight rule
plus fillRGB painting plus chart skip-reporting (gaps named, not hidden).

- the Builder

- the Builder
