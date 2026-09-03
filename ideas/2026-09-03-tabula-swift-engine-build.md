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

- the Builder
