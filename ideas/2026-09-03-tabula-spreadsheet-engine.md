# Tabula: from-scratch spreadsheet engine in Swift (architectural blueprint)

Date: 2026-09-03. Issue: #282. Research input: `docs/research/issue-282-tabula-spreadsheet.md` (binding: formula grammar, coercion table, error precedence, DFS cycle detection, Kahn minimal recalc, four correctness proofs, per-function denotational semantics, A1/R1C1 laws, structural-edit and copy/paste/fill laws, storage invariants, section 12 test and perf gates). This blueprint resolves every handoff item in research section 14 into packages, interfaces, build order, and acceptance gates.

## Summary

Tabula is a static-only spreadsheet hosted at `/tabula/index.html` (GitHub Pages, no backend, offline after first load). A pure-Swift calculation core (`TabulaCore`, zero JS imports, SwiftPM-tested with `swift test`) owns the lexer, parser, AST, value domain, references, dependency graph, evaluator plus function library, workbook model, structural edits, fill laws, and CSV/JSON codecs. A thin `TabulaBridge` module (the only place JavaScriptKit appears) ships batched dirty-range snapshots per frame. A zero-build static web UI (`tabula/web/`, canvas grid, formula bar, inspector, format panels, sort/filter views, SVG charts, OPFS storage, sample workbook) renders read-only snapshots and never computes values. One branch and one PR carry the whole technique across continuous `continue` cycles: Phase 0 de-risks the SwiftWasm toolchain, then Phases A through E build core, functions, grid, storage/charts, and hardening in dependency order.

## Deliverables (what the Builder ships on this milestone)

- `tabula/` static app: `index.html` entry, `manifest.webmanifest`, `sw.js` service worker (offline scope `/tabula/`), `Package.swift` plus `Sources/TabulaCore/`, `Sources/TabulaBridge/`, `Tests/TabulaCoreTests/`, `web/` (zero-build static JS plus canvas UI, calls only the Bridge batch API), `assets/` (icons, sample workbook generator output), `docs/` (architecture pointer, `proofs.md` carrying research section 5 theorems, `semantics.md` carrying coercion plus error-precedence plus function tables, `scoreboard.md` with measured perf numbers).
- `tabula/docs/` retained proofs: the four correctness theorems (topological fixpoint, cycle soundness/completeness, minimal-equals-full, error monotonicity) copied in slimmed form from research section 5, plus the normative coercion table (4.3) and error precedence order (4.4) as testable contracts.
- Headless determinism: `swift test` green on Linux with fixed `todaySerial`, seeded RNG only where specified, no wall-clock reads in Core except the injectable clock.
- Sample workbook bundled covering every function family, one displayed `#CYCLE!`, one conditional-format rule, one chart per type (bar, line, pie).
- Root `index.html` landing entry for Tabula (preview card linking to `/tabula/`), without removing the Random landing page or breaking `pages.yml` PR previews.
- Single PR across `continue` cycles; never split scaffolding and engine and UI into separate PRs.

## Why

Spreadsheets are the most-used programming environment on earth, yet the recalculation graph that keeps a thousand formulas consistent is a black box. Tabula opens it: every formula is a traceable graph edge, every recalculation is a topological sweep the inspector can step through, every chart is a live view of the grid. Swift is a fresh factory language and its WASM target makes a genuinely impressive Pages-hostable demo, while the deterministic formula core stays headlessly testable on Linux. The top correctness risk is semantic drift across dozens of small decisions (coercions, error precedence, range folding, date serials, sort stability), so this blueprint pins exactly one correct behavior per case and binds it to a test.

## How It Works

1. Entry: user opens `/tabula/index.html`. The shell loads the WASM core (carton bundle) or, if WASM is unavailable, runs the same Core semantics through the verified fallback path (Phase 0 decision, documented in `tabula/docs/architecture.md`). OPFS snapshot loads first, else the bundled sample, else an empty workbook.
2. Edit: grid edit or formula-bar commit produces a source-text change. Core parses (`parseFormula` per research 3.4), rebuilds the AST, re-extracts precedents, updates forward plus reverse adjacency, and runs `recalc(editSet)`: dirty closure over dependent edges (BFS following precedent-to-dependent direction) union volatile cells, Kahn topological sort restricted to the dirty subgraph, single evaluation pass in emitted order, unemitted residue marked `#CYCLE!` with the recorded cycle path.
3. Frame transfer: Bridge ships one batched snapshot per recalc (dirty addresses plus values plus error codes as typed arrays or compact JSON, never per-cell JS round-trips inside the hot loop). UI repaints only visible cells, re-evaluates conditional-format rules for visible cells, and re-renders charts from the snapshot.
4. Views: sorting/filtering reorder a view index (stable sort, hidden sets); underlying addresses stay stable so refs never taint (documented difference from Excel, surfaced in user docs). Freeze panes, resize, and formatting write style records only and never trigger recalc (entry-time text-vs-number coercion is an edit, not a format).
5. Storage: formulas persist as source text in canonical JSON (ASTs rebuild on load; parse errors on load become per-cell `#VALUE!`, load never fails). CSV export writes computed values (General rendering, ISO dates); CSV import parses number-or-text, never formulas unless the user confirms formula mode (injection guard). OPFS autosaves debounced JSON snapshots; quota failure degrades to in-memory with a visible indicator.

## Module Breakdown (domain decoupled from presentation)

Domain (`Sources/TabulaCore/`, pure Swift, zero JS, `swift test` on Linux):

- `Lexer.swift`: token kinds per research 3.3, maximal munch, greedy-but-validated cell-ref recognition, single-pass O(n), `ErrorTok` with position.
- `Parser.swift`: recursive descent, one token lookahead, precedence comparison < `&` < additive < multiplicative < power (right-assoc) < unary < postfix `%` < primary; `-2^2 = -4`, `2^3^2 = 512`; `%` parses to `/100` with round-trip reprint.
- `AST.swift`: `Expr` enum (`Num`, `Str`, `Bool`, `Ref`, `Range`, `Name`, `Call`, `Unary`, `Binary`, `Percent`, `ArrayConst`, `ErrLit`), `CellRef` with `colAbs/rowAbs/r1c1` flags plus `resolve(host:)`, `precedents(host:)`, `toFormulaString()` with round-trip invariant `parse(print(parse(s))) == parse(s)`.
- `Value.swift`: `Value` enum (`Num(Double)`, `Str`, `Bool`, `Err(ErrorCode)`, `Blank`), `toNumber/toString/toBool` per normative table 4.3, error precedence `#CYCLE! > #REF! > #DIV/0! > #NAME? > #VALUE! > #N/A > #NUM!` per 4.4.
- `Ref.swift`: bijective base-26 column codec, A1/R1C1 parse, absolute/relative resolution per 8.1, range normalization, cross-sheet resolution (case-insensitive, missing sheet is `#REF!` with sticky taint), named-range map.
- `Graph.swift`: sparse adjacency (forward plus reverse), iterative DFS with WHITE/GRAY/BLACK colors (no recursion, deep chains must not overflow), cycle-path recording, `#CYCLE!` taint over members plus transitive dependents, Kahn restricted to the dirty subgraph, dirty closure BFS, volatile union, topological-rank metadata for the inspector.
- `Eval.swift`: `eval(expr, env, todaySerial)` per section 6, strict except lazy `IF`, short-circuit `AND`/`OR`, catch-all `IFERROR` plus `#N/A`-only `IFNA`, range top-left rule in scalar position, deterministic row-major folds, injectable clock, no RNG in v1 core.
- `BuiltinMath.swift`, `BuiltinText.swift`, `BuiltinLookup.swift`, `BuiltinDate.swift`, `BuiltinLogic.swift`: denotational semantics per research section 7 (SUM/AVERAGE/MIN/MAX/COUNT family with range-text skipping, ROUND half away from zero, MOD sign follows divisor, VLOOKUP/HLOOKUP/INDEX/MATCH/CHOOSE error codes, serial date model epoch 1899-12-30 with Lotus bug pinned, TODAY volatile, DATEDIF units, IF/AND/OR/NOT/IFERROR/IFNA/IS* predicates).
- `Workbook.swift`: sheets, sparse grid (`Map<Addr, Cell>`), names, structural edits as pure functions per 8.3 (delete taint sticky, shift-after-span, range clamp-or-taint, sheet-delete taint), copy/paste translation and fill laws per 8.4 (relative axes translate, absolute stay, series detection, pure preview function), CSV/JSON codecs per section 11, version-gated migrations.
- `Clock.swift`: injectable `todaySerial`; Core never calls platform calendar APIs.
- `Series.swift`: fill-handle series detection (constant step, trailing-number text increment, else copy) as a pure function of block plus vector.
- `Format.swift`: opaque style records (number, currency, percent, date ISO default, text with leading-quote force, fill, borders, alignment, fonts); format application O(1), never triggers recalc.

Bridge (`Sources/TabulaBridge/`, only module that imports JavaScriptKit):

- `Bridge.swift`: batch API only. `pushEdits([Edit]) -> DirtyBatch`, `pullSnapshot() -> [CellView]`, `dirtyRanges() -> [RangeRect]`, error-code strings. No per-cell JS calls inside recalc. Typed-array or compact-JSON batches; exact wire shape pinned in Phase 0 and recorded in `tabula/docs/architecture.md`.

Presentation (`tabula/web/`, zero-build static JS plus CSS plus canvas, calls Bridge only):

- `grid.js` (virtualized canvas renderer, visible-window only, O(visible) per frame, freeze panes, resize handles, 60 fps pan target), `editor.js` (cell editing plus formula bar with error positions), `inspector.js` (precedents/dependents list, cycle path display, topological rank), `format.js` (formatter panels), `views.js` (sort/filter view index, stable sort, hidden sets), `charts.js` (bar/line/pie SVG re-rendered from snapshot on recalc), `storage.js` (OPFS, clipboard TSV plus JSON, file pickers, quota-degraded indicator), `sample.js` (bundled sample workbook loader).
- `styles.css` design tokens (`--tabula-bg`, `--tabula-surface`, `--tabula-ink`, `--tabula-accent`, `--tabula-error`), desktop grid plus formula bar plus inspector layout, mobile single-column with bottom sheet, focus paths plus live regions, empty/loading/error/onboarding states per view.

Public interface sketch (binding shapes; Builder expands in Swift):

```swift
struct Addr: Hashable { var sheet: Int; var col: Int; var row: Int }
enum Value { case num(Double); case str(String); case bool(Bool); case err(ErrorCode); case blank }
enum ErrorCode { case div0, ref, cycle, value, name, na, num }
struct CellRef { var sheet: Int?; var col: Int; var row: Int; var colAbs: Bool; var rowAbs: Bool; var r1c1: Bool }
indirect enum Expr { case num(Double); case str(String); case bool(Bool); case ref(CellRef); case range(lo: CellRef, hi: CellRef); case name(String); case call(fn: String, args: [Expr]); case unary(op: UnOp, e: Expr); case binary(op: BinOp, l: Expr, r: Expr); case percent(Expr); case arrayConst(rows: [[Expr]]); case errLit(ErrorCode) }
func parseFormula(_ source: String) -> Result<Expr, ParseError>
func recalc(editSet: Set<Addr>) -> [Addr: Value]
```

## SwiftWasm build (binding)

- Toolchain: Swift 6.3 (present in CI image, verified this run), carton builder, JavaScriptKit 0.35.x pinned in `Package.swift` (Builder records the exact resolved version; patch bumps allowed, minor bumps need a note in architecture.md).
- Packages: `TabulaCore` (no JS dependency), `TabulaBridge` (depends on JavaScriptKit and TabulaCore), reverse dependency rule UI -> Bridge -> Core; Core never imports Bridge or UI; recalc hot loop stays in WASM linear memory.
- Artifact: carton bundle emitted under `tabula/web/wasm/` (or `tabula/dist/` copied to `web/`), loaded by `index.html`; Pages serves `/tabula/` statically; service worker caches shell plus bundle plus sample for offline reuse.
- Phase 0 gate (blocking): `swift test` green for at least the lexer plus value-coercion suites AND `carton build` hello-grid rendering one cell through Bridge batch transfer. If the WASM toolchain blocks after a timeboxed attempt (record hours in progress file), the headless SwiftPM core still lands as the shippable artifact with a documented thin-bundle fallback, and the UI depth is rescoped rather than faking WASM. No silent fallback: the decision and evidence go in `tabula/docs/architecture.md`.

## Grid virtualization (binding)

- Canvas renderer paints only the visible window plus a small overscan; row/column sizes cached in arrays; scroll is O(visible) DOM/canvas ops with zero recalc.
- Freeze panes split the viewport into up to four synchronized quadrants sharing the same snapshot source.
- Conditional-format rules evaluate lazily for visible cells only (full-grid evaluation on export); rule formulas reuse the parser/evaluator with host set per member cell; cap 64 rules per sheet.
- Frame budget: 60 fps pan over a 100k-row sheet on desktop; Bridge ships dirty ranges, never full-grid snapshots, on edit recalc.

## Test Matrix (binding, mirrors research section 12)

- Parser round-trip: corpus of valid formulas plus generated expressions, fuzz set of at least 1000 cases, AST equality `parse(print(parse(s))) == parse(s)`.
- Evaluator oracle: hand-computed table of at least 300 cases covering every function in research section 7, every coercion cell in 4.3, every error-precedence pair in 4.4, and the tricky identities (`-2^2 = -4`, `2^3^2 = 512`, `MOD` sign, `ROUND` half-away, `VLOOKUP`/`MATCH` miss, `DATE` overflow, `DATEDIF` remainders).
- Graph invariants (seeded, randomized): precedent-extraction soundness via instrumented evaluator cross-check; range-folding equivalence (interval storage vs naive expansion); cycle soundness/completeness (self, 2-cycle, range self-inclusion, long-chain closure; taint exactly members plus dependents); Kahn validity (order respects all edges; residue equals DFS-tainted set).
- Minimal vs full recalc agreement: random edit sequences (value, formula, structural) over random workbooks; minimal snapshot equals full snapshot cell-for-cell including error codes.
- Structural edit laws: identity edit is identity; delete-then-undo restores sources; paste translation commutes with resolve for relative axes with absolute axes fixed.
- Storage round-trips: CSV field-wise idempotence `export(import(export(w))) == export(w)`; JSON save/load preserves values, formats, names, views; malformed inputs degrade to per-cell errors, never loader crashes.
- Determinism: same workbook plus edit script plus `todaySerial` plus seed yields byte-identical JSON snapshots across runs and across native vs WASM core (float rendering pinned to one implementation).
- Visual (Playwright or equivalent screenshots): serve `tabula/`, capture grid, formula bar error state, inspector with cycle path, conditional-format rule, each chart type, at desktop (1280x800) and mobile (390x844); fail on overflow, overlap, or contrast regressions.

## Performance budgets (binding, research 12.7)

- 10k-cell recalc: chain plus fan-out workbook (5000-chain depth plus 5000 dependents on one source, mixed SUM/IF/VLOOKUP) under 1 s on a desktop core in WASM; headless Swift native proxy under 250 ms during development. Report cold full-recalc and single-cell-edit minimal-recalc separately. This gate blocks merge.
- Parse throughput: at least 50k formula parses/s (native proxy) on the fuzz-corpus average length.
- Grid scroll: 60 fps pan over 100k-row sheet, zero recalc on scroll.
- Memory: sparse storage; empty 1M-row sheet under 5 MB overhead; graph edges about 2 words per precedent edge.

## Milestones (Builder checklist seed, single PR, continuous continue cycles)

- [ ] 0. De-risk: `Package.swift` plus `TabulaCore` skeleton plus one `swift test` suite green plus `carton build` hello-grid through Bridge batch transfer; pin JavaScriptKit version; record fallback decision if needed.
- [ ] 1. Core domain: Lexer, Parser, AST, Value plus coercions, Ref (A1/R1C1, ranges, cross-sheet, names), Graph (DFS cycles, Kahn, dirty closure, volatile), Eval plus Clock.
- [ ] 2. Function library plus oracle table: Math, Text, Lookup, Date, Logic per section 7 semantics; all 300+ oracle cases green.
- [ ] 3. Workbook plus laws: sheets, names, structural edits, copy/paste/fill, CSV/JSON codecs; property suites for graph invariants, minimal-vs-full, edit laws, round-trips green; 10k-cell perf proxy recorded.
- [ ] 4. Bridge plus grid UI: batch wire shape pinned, virtualized canvas grid, editor plus formula bar, inspector (precedents/dependents, cycle path, topo rank), format panels, sort/filter views, freeze panes, resize, copy/paste/fill wiring.
- [ ] 5. Storage plus charts plus sample: OPFS, clipboard, CSV/JSON UI, bar/line/pie live charts, sample workbook, `tabula/docs/` proofs plus semantics plus scoreboard, landing link, PWA offline, Playwright pass, full perf gate.
- Current step: Ready for initial build. Next steps: Builder proves Phase 0 on this branch, then implements Phases 1 through 5 in order, updating `progress/282-tabula-spreadsheet-engine.md` per phase; single PR across `continue` cycles.

## Explicit v2 deferrals (scope stays closed)

Spill arrays, XLOOKUP, SPLIT, INDIRECT, RAND/RANDBETWEEN (plus seeding), locale collation, grapheme-cluster LEN, time-of-day NOW (TODAY date-only is v1), true Excel intersection (v1 uses top-left rule, documented). Each deferred item is documented in user docs as deferred, never half-implemented.

- the Architect
