# Tabula - from-scratch spreadsheet engine in Swift

Issue #282. Statically hosted at `/tabula/index.html` (GitHub Pages, no
backend, offline after first load).

A formula lexer/parser, a dependency-graph recalculation engine with
topological ordering and cycle detection, and a cell-format/style layer,
compiled to the browser via SwiftWasm - with every formula a traceable graph
edge and every recalculation a topological sweep the inspector can step
through.

## Layout

- `Sources/TabulaCore/` - pure Swift calculation core (`swift test` on Linux)
- `Sources/TabulaBridge/` - batch snapshot transfer (the only JavaScriptKit zone)
- `web/` - zero-build static canvas UI (calls the Bridge batch API only)
- `docs/architecture.md` - living architecture + toolchain record + perf board
- `index.html` - Pages entry

## Build and test

Requires Swift 6.x (verified with 6.3.3):

```sh
swift test --package-path tabula   # headless core suites (spec section 12)
```

Open `tabula/index.html` (or `/tabula/` on Pages) for the grid shell.
The SwiftWasm bundle (`carton build`) lands with the toolchain proof; see
`docs/architecture.md` for status and the exact proof plan.

## Spec and blueprint

- Spec (binding): `docs/research/issue-282-tabula-spreadsheet.md`
- Blueprint: `ideas/2026-09-03-tabula-spreadsheet-engine.md`
- Progress: `progress/282-tabula-spreadsheet-engine.md`

## Status

Phase 0 (scaffold + skeleton + shell) - core domain (lexer, parser, graph,
evaluator, functions) lands in Phases 1-3 on the same PR (#283).
