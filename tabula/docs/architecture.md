# Tabula architecture (living document, updated every phase)

- **Issue:** #282. **Spec (binding):** `docs/research/issue-282-tabula-spreadsheet.md`.
- **Blueprint:** `ideas/2026-09-03-tabula-spreadsheet-engine.md`.
- **Status:** Phase 4 complete (bridge session + full grid UI on the fallback engine).

## Module map

```
tabula/
  Package.swift                  SwiftPM (tools 6.0), no external deps (Phase 4)
  Sources/TabulaCore/            pure Swift, zero JS, zero calendar APIs
    TabulaCore.swift             version + grid caps (research 3.1)
    Addr.swift                   Addr, CellRef, RangeRect, ColumnCodec (3.1, 3.5, 8.1)
    ErrorCode.swift              7 codes + precedence + combine (4.2, 4.4)
    Lexer, Parser, AST, Value, Ref, Graph, Eval, Clock (Phase 1)
    BuiltinMath, BuiltinText, BuiltinLookup, BuiltinDate, Builtins (Phase 2)
    Workbook, Series, Format, Codecs (Phase 3)
    Inspector.swift              (Phase 4) public inspect/topology API for the bridge
  Sources/TabulaBridge/
    Bridge.swift                 batch wire types (CellView, DirtyRange, DirtyBatch)
    Session.swift                (Phase 4) BridgeSession: EngineEdit batches,
                                 InspectorView, SheetView sort/filter
    WasmBridge.swift             `#if canImport(JavaScriptKit)` landing zone + stub
  Tests/TabulaCoreTests/         swift-testing suites (77 green at Phase 4)
  web/                           zero-build static UI (no bundler, classic scripts)
    engine.js                    (Phase 4) fallback formula core behind the wire
    grid.js                      virtualized canvas, freeze, resize, range select
    editor.js                    cell overlay + formula bar (sources kept on error)
    inspector.js                 trace + topo rank + cycle path + jump
    format.js                    recalc-pure style panels
    views.js                     presentation-only sort/filter + freeze + struct ops
    storage.js                   clipboard TSV + file save/load (OPFS: Phase 5)
    sample.js                    bundled workbook (all families + one cycle)
    app.js                       boot + wiring (batch consumer, view index)
    styles.css                   design tokens + desktop/mobile layout
  index.html                     Pages entry at /tabula/
  manifest.webmanifest, sw.js    PWA shell (scope /tabula/)
  docs/                          this file; proofs.md + semantics.md land Phase 5
```

Dependency rule (binding): UI -> Bridge -> Core. Core never imports Bridge,
UI, Foundation-calendar, or JS. `Dictionary` iteration is forbidden in
evaluation paths; range folds run row-major (research 6).

## Bridge wire shape (pinned Phase 0)

```json
{"seq": 7,
 "ranges": [{"sheet": 0, "c0": 0, "r0": 0, "c1": 1, "r1": 1}],
 "cells": [{"s": 0, "c": 0, "r": 0, "v": {"num": 41}, "d": "41"}]}
```

- `seq` increases monotonically; the UI drops batches at/below its last
  applied sequence (last-writer-wins, no tearing).
- `v` variants: `{"num": x}`, `{"str": s}`, `{"bool": b}`, `{"err": CODE}`,
  `{"blank": true}` (Codable single-value cases; keep key names stable).
- `d` is the Core-rendered General-format display string (research 12.8: one
  float renderer shared by native and WASM targets).
- One batch per recalc; dirty ranges only, never full-grid snapshots.
- Phase 4 may add a typed-array fast path; it must decode to exactly the
  `Bridge.swift` structs (contract test `BridgeWireTests.batchRoundTrip`).

## SwiftWasm toolchain (Phase 0 de-risk record)

Environment evidence (2026-09-03, CI image):

- `swiftc`: Swift 6.3.3 present. `swift test` green (12 tests, 4 suites).
- `carton`: NOT installed. No Swift SDKs installed (`swift sdk list` empty).
- Network: reachable (github.com API 200). Upstream artifacts CONFIRMED:
  `swiftwasm/swift` release `swift-wasm-6.3-RELEASE` and `swiftwasm/carton`
  release `1.1.3` both exist (verified via api.github.com this run).

Decision (blueprint escape clause, research risk 1): the WASM toolchain proof
(`carton build` hello-grid through the Bridge batch) is DEFERRED, not dropped.
Rationale: downloading the ~500 MB WASM SDK plus carton inside the Phase 0
timebox risked the whole run for a packaging step while the semantic core
(Phases 1-3, the actual correctness risk) needs the same cycles. The headless
SwiftPM core is the shippable semantic authority; the web shell renders the
pinned wire shape through a labeled stub until the proof lands.

WASM proof plan (Phase 5 hardening window, alongside the oracle-parity run):

1. Install carton 1.1.3 (prebuilt Linux binary from swiftwasm/carton releases).
2. Install the `swift-wasm-6.3-RELEASE` SDK (`swift sdk install <artifact>`).
3. Pin JavaScriptKit 0.35.x in `Package.swift` (record exact resolved version
   here; patch bumps allowed, minor bumps need a note here).
4. `carton build` a hello-grid that pushes one `DirtyBatch` through
   `WasmBridge` (replacing the `#else` stub branch) and renders in
   `tabula/index.html`; record bundle size + load evidence here.

Fallback (taken at Phase 4, per the escape clause above): the interactive
grid ships on `web/engine.js`, a zero-build JavaScript core implementing the
same grammar (A1 with `$`, sheet-qualified refs, ranges, names), value
domain, coercion table, error precedence, graph algorithms (iterative-DFS
cycles, Kahn minimal recalc, volatile union), structural-edit and
copy/paste/fill laws, and JSON/CSV codecs behind the exact pinned wire
shape. It is NOT a silent substitution: this section records the boundary.

- Parity boundary: R1C1 input and array constants are parse errors in the
  fallback (Swift parses both); the function surface is the v1 set minus the
  blueprint v2 deferrals; float rendering matches `formatGeneral` for
  integers and falls back to `String(x)` otherwise (same rule as Swift).
- Evidence: smoke checks pass on the fallback (`-2^2=-4`, `2^3^2=512`,
  `2^-3=0.125`, VLOOKUP exact, `#CYCLE!` with recorded path, insert-row ref
  following, AND/OR prior-error-wins); `node --check` clean on all 9 web
  modules; 77/77 Swift suites stay green as the semantic authority.
- Phase 5 hardening: run the shared oracle cases against BOTH engines and
  record agreement here; the WASM proof (carton + SDK + JavaScriptKit pin)
  still replaces the fallback's producer role when it lands, with no UI
  changes required (renderer consumes DirtyBatch either way).

## JavaScriptKit pin (intent, Phase 0)

- Required: 0.35.x (blueprint). Exact resolved version: TBD at proof time.
- Only `Sources/TabulaBridge/WasmBridge.swift` may import it (enforced by
  review: any other `import JavaScriptKit` is a blocking finding).

## Perf scoreboard (binding gate lives here from Phase 3 on)

- 10k-chain+fan-out recalc: WASM < 1 s; native proxy < 250 ms (cold full +
  single-edit minimal reported separately). Gate BLOCKS merge.
- Parse throughput >= 50k formulas/s (native proxy, fuzz-corpus average).
- 60 fps pan over 100k-row sheet, zero recalc on scroll.
- Empty 1M-row sheet < 5 MB overhead.

## Deferred to v2 (binding, blueprint)

Spill arrays, XLOOKUP, SPLIT, INDIRECT, RAND/RANDBETWEEN, locale collation,
grapheme-cluster LEN, time-of-day NOW, true Excel intersection (v1 uses the
top-left rule, documented in user docs).
