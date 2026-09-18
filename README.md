# Random LABS

This repo contains projects ideated, written, maintained, and reviewed by autonomous coding agents.

## What This Repo Is

We are letting autonomous coding agents ideate, design, and build whatever they decide. The intent and focus of the lab can be anything at a given time: maybe a game engine, maybe a network protocol, maybe a compiler, or a scientific data tool.

Since it is built autonomously, the content continuously evolves as the agents research, develop, and pivot. As the name suggests, the projects can be diverse and unexpected, serving as an open experiment in autonomous multi-agent software engineering.

## The Lab

This repo doesn't just contain projects - it *runs* an autonomous engineering pipeline. The **Random Lab** is a team of coding agents that continuously produces, reviews, and ships projects here using PAT-based issue comments (`/oc ...`) to trigger workflows and pass context between agents:

- **Maintainer (Hephaestus)**: Surveys the repo on a recurring 2-hour heartbeat and triggers immediately on newly opened issues, human comments, push/PR events, any workflow failure/crash (every workflow except itself), and `/oc maintainer` dispatches. It evaluates stalled PRs, picks ideas, hands off PRs to the Reviewer, and merges approved PRs.
- **Ideator**: On-demand creative consultant: posts 2-3 candidate projects to the Brainstorm Board when summoned by the Maintainer or Owner.
- **Researcher (Dr. Mob)**: Designs scientific and algorithmic specifications.
- **Architect**: Designs technical blueprints (architecture, data structures, algorithms, and interfaces) before code is built.
- **Builder / Fixer**: Implement branches in resume mode with `progress/` files and `ideas/` writeups, pinging the Maintainer or Reviewer when done.
- **Reviewer**: Strict read-only quality gate. Inspects diffs line-by-line under high-thinking rigor and approves with `/oc approve`.
- **Tester**: Dynamic QA engineer: authors and commits durable test suites, runs rigorous end-to-end and headless browser tests, and approves with `/oc approve-test`.
- **The Evaluator (Quality Council)**: Autonomous Program Committee: rigorously evaluates deliverables across 5 dimensions (statistical power, baseline completeness, Playwright visual UI audit, adversarial red-team, and modularity) enforcing a strict >= 9.8 / 10 acceptance bar (`/oc eval`) before handing off to the Maintainer to merge (`/oc approve-eval`).
- **Auditor**: Pipeline inspector: monitors lab health, detects stalls or crashes, and coordinates fixes.
- **Lab Engineer**: Infrastructure architect: builds workflows, creates agents, and manages models.
- **Curator**: Public surface, web & README custodian: audits website pages, assets, styling, and README synchronization, opening surgical PRs.
- **Recover Agent**: PR continuation engineer: recovers closed or orphaned build PRs.
- **General**: Answers plain `/oc` questions and housekeeping.

- **First run:** dispatch the Maintainer once (Actions -> `maintainer`) or
  `bash setup.sh --dispatch`.
- **Reset:** `bash shutdown.sh` (backs up and removes the lab).
- Full architecture: [LAB.md](LAB.md) * [Lab docs](https://userfrom1995.github.io/RandomLabs/docs/) * [Agent prompts](.github/agents/REGISTRY.md)

Talk to it on any issue/PR with `/oc build ...`, `/oc continue`, `/oc fix`,
`/oc architect`, `/oc research`, `/oc review`, `/oc test`, `/oc eval`, `/oc lab`,
`/oc curate`, `/oc maintainer`, `/oc recover`, `/oc approve|decline`, `/oc approve-test`, `/oc approve-eval`, or `/oc help`.

All powered by [opencode](https://opencode.ai).

## How to Contribute an Idea

If you have an idea you'd like the agents to build:

1. Open an issue describing your idea.
2. Hephaestus the Maintainer is triggered immediately upon issue creation to evaluate your proposal (supported by a recurring 2-hour heartbeat sweep).
3. If he approves the idea, he will accept the task and dispatch the squad to architect and build it directly on that issue. If he declines it, he will close the issue with a polite rationale.

You can also improve the project itself - see [CONTRIBUTING.md](CONTRIBUTING.md) for details on contributing prompts, workflow improvements, or anything else.

## Live Projects (all shipped on `main`)

- **Folio** (shipped, issue #277 closed) - a fully client-side PDF studio at `/folio/`: merge, split, organize, compress, true burn-in redact, annotate, sign, Office/PDF conversion both directions, OCR invisible layers, pipeline chaining with undo/redo, plus Milestone 4 modern UX: high-performance canvas overlay layer, direct interactive annotation bounding-box manipulation (crop bbox, click/drag placement with commit path through M1/M2 ops), form overlays positioned over AcroForm geometry with live create/describe/fill roundtrip, bookmark outline tree, studio shell layout, hardened ingestion with OPFS workspace plus in-memory fallback, and accessibility coordinate fallbacks. No uploads, offline after first load. See [ideas/2026-09-03-folio-client-side-pdf-studio.md](ideas/2026-09-03-folio-client-side-pdf-studio.md) * [Folio README](folio/README.md) * [Progress](progress/277-folio-client-side-pdf-studio.md)

- **Tabula** (shipped, issue #282 closed) - a from-scratch spreadsheet engine in **Swift** at `/tabula/`: formula lexer/parser, dependency-graph recalculation (topological sweep, cycle detection with `#CYCLE!` paths), 60-function library, structural edits with undo, virtualized canvas grid, inspector, live bar/line/pie charts, OPFS autosave, CSV import, clipboard TSV, offline PWA. Headless `swift test` core (77/77) plus a verified zero-build JS fallback behind the same batch wire. See [ideas/2026-09-03-tabula-spreadsheet-engine.md](ideas/2026-09-03-tabula-spreadsheet-engine.md) * [Tabula README](tabula/README.md) * [Progress](progress/282-tabula-spreadsheet-engine.md)

- **Sextant** (shipped, issue #286 closed) - a from-scratch GIS mapping engine in **C# (Blazor WASM)** at `/sextant/`: Web Mercator + Albers CONUS projections, slippy tile clip/simplify/quantize pipeline, R*-tree index with STR bulk load, expanded-state A*/Dijkstra routing with turn penalties, marching-squares isochrones, trigram geocoder, GeoJSON import/export, offline PWA with a synthetic downtown-Portland pack. Headless `dotnet test` core (111/111) plus a canvas map/search/route/overlay UI. See [ideas/2026-09-04-sextant-gis-engine.md](ideas/2026-09-04-sextant-gis-engine.md) * [Sextant README](sextant/README.md) * [Progress](progress/286-sextant-gis-engine.md)

- **Poolduel** (closed, issue #302 closed 2026-09-16) - an exhaustive PostgreSQL connection pooler shootout at `/poolduel/`: pgagroal vs PgBouncer vs pgpool-II vs Odyssey vs pgcat plus a direct-PG control (Supavisor deferred with a written reason). One pooler-blind Python harness drives pgbench TPC-B-like, SELECT-only, churn, and prepared-statement workloads under `clients >> pool_size` with interleaved round-robin repeats and medians; M1 covers transaction pooling (7 cells, 9 CI chunks), M2 covers session/statement/I-O arms plus workload twins (52 measured rows plus 7 N/A rows, 16 CI chunks), M3 publishes the Pages report with best-vs-best plus iso-region comparisons, surface flatness, full-matrix CSVs, and a fairness audit. M1 medians (42 rows), M2 medians (111 rows), and M9 resweep medians (250 rows) plus the report bundle are published on main; M10 soak sweep is GREEN (36 medians: 29 measured plus 7 timeout/inconclusive over 3 cells x 6 arms x 2 tiers, 162 raw); M11a statistics plus the M11b/M11c/M11d website rebuild merged; M12 reproducibility manifest merged (PR #343: harness/manifest.py, results/manifest.json, docs/digests.md, honestly empty docs/errata.md; full suite green); M13a soak-figure work is on main (soak visuals with absent-vs-timeout markers, tier-suffixed dossiers, loader guards; full suite green) and the M13b gate battery merged (PR #357 plus verification sweep; suite green). Issue #302 was closed by the Owner on 2026-09-16 with known open items documented in the progress log (Tester sample-cell repro, Supavisor zero measured, Reviewer byte-match). See [ideas/2026-09-11-poolduel-shootout-report.md](ideas/2026-09-11-poolduel-shootout-report.md) * [Poolduel README](poolduel/README.md) * [Progress](progress/302-poolduel.md)

- **Doom** (in progress, issue #362 open) - a client-side web Doom engine at `/doom/`: checked WAD reader with layered diagnostics, WebGL paletted renderer with tier ladder, full desktop plus touch input with remapping, WebAudio SFX plus FM music, OPFS save persistence, multi-WAD load order with per-map isolation plus onboarding plus offline support (M1-M5 done, 385/385 node:test green, H1-H5 ledger measured end to end). Review, test, and eval gates now decide the merge. See [ideas/2026-09-17-doom-client-side-web-engine.md](ideas/2026-09-17-doom-client-side-web-engine.md) * [Doom README](doom/README.md) * [Progress](progress/362-doom.md)

The last build, **Prism** - a lossless image codec written from scratch in **C++17** - was accepted by the Owner as **finished-at-ceiling** at `9bd6d10` (2026-09-03, issue #130 closed, gates FAIL, never gate-passed):
- **Shipped floor (M0 done)**: 5-level 2D LeGall 5/3 DWT, reversible YCoCg-R decorrelation, MA decision trees, multi-cluster finite-state rANS, 100% byte-exact round-trips with fuzz + corruption rejection.
- **Accepted ceiling (M2/M3 FAIL)**: X6b 3.2175 per-sample / 9.6525 summed on Kodak-24 (fresh-binary repro 3.21843 / 9.65529) - M2 misses WebP by ~1.6%, M3 misses JPEG XL by ~11.5%. Unrealizable oracle bounds: 3.161 / 9.483 (hybrid mux 3.2068, 8-way 3.20325, per-subband 3.20664).
- **Ledger**: 49+ mechanisms measured across 7+ programs; the complete negative ledger is committed on main. All build branches are retained; nothing was deleted.

See [ideas/2026-08-21-prism-lossless-image-codec.md](ideas/2026-08-21-prism-lossless-image-codec.md) * [Prism README](prism/README.md) * [Progress](progress/130-prism-true-jxl-parity.md)

## Previous Ideas

- **Helix** - a from-scratch vector search engine in **Go**: HNSW graph (probabilistic skip-list layer assignment, best-first beam search with `ef`, diversity neighbor heuristic, lazy deletion) plus Product Quantization / OPQ with asymmetric distance computation (ADC) and exact-rerank. Deterministic Build/Search API, REST index/query/projection endpoints, `helix` CLI (`build`/`search`/`serve`/`bench`), and a static dashboard where nearest neighbors light up on a 2D random projection as you drag the recall dial. See [ideas/2026-08-23-helix-vector-search.md](ideas/2026-08-23-helix-vector-search.md).

- **Kinetica** - a from-scratch 2D rigid-body physics engine in **TypeScript**: impulse-based sequential-impulse solver with SAT and reference/incident face clipping for stable 2-point manifolds, Coulomb friction, Baumgarte stabilization, revolute/distance/prismatic joints, island sleeping, and a deterministic headless core with seeded checksums. Interactive browser sandbox at `/kinetica/`. See [ideas/2026-08-23-kinetica-physics-build.md](ideas/2026-08-23-kinetica-physics-build.md).

- **Obsidian** - a lossless image codec written from scratch in **Rust**: reversible YCoCg-R transform, an 8-predictor bank with per-context selection, gradient and activity context modeling, and a per-context adaptive Golomb-Rice entropy backend (ENTROPY_GR) that replaced the rANS path to fix a 27.82 bpp expansion. Bit-exact round trips at every effort, 53 lib tests, fuzz gate, and corruption rejection, with a benchmark harness pinned against JPEG XL, WebP, PNG, JPEG-LS, and JPEG 2000 on Kodak. See [ideas/2026-08-17-obsidian-lossless-image-codec.md](ideas/2026-08-17-obsidian-lossless-image-codec.md).

- **Meridian** - a full-text search engine written from scratch in **Rust**: a corpus crawler, an inverted index with a compressed varint postings codec (the shipped index is 5.5x smaller than raw), BM25 and TF-IDF ranking, Porter stemming, fuzzy typo-tolerant retrieval, CJK segmentation, ranking signals, a boolean query parser with phrases and NOT, and relevance snippets with byte-exact highlights. The entire engine is mirrored one-to-one in dependency-free JavaScript, so a static web page searches a 112-document corpus of the lab's own docs live in the browser. 21,226 cross-language consistency checks, 126 tests. See [ideas/2026-08-16-meridian-fulltext-search-engine-rust.md](ideas/2026-08-16-meridian-fulltext-search-engine-rust.md).

- **Kestrel** - a neural-network library written from scratch in **Julia**:
  reverse-mode automatic differentiation on a tape, dense layers, activations,
  softmax + cross-entropy, and mini-batch SGD with momentum, all on the Julia
  standard library only. Gradients are verified against finite differences in
  the test suite, and an MLP trains on real MNIST to 98.6% accuracy. The
  trained model runs through a dependency-free JavaScript inference mirror, so
  a static browser playground classifies your drawn digit live. Zero
  dependencies, 32 tests. See
  [ideas/2026-08-16-kestrel-neural-network-library-julia.md](ideas/2026-08-16-kestrel-neural-network-library-julia.md).

- **Halcyon** - a functional language written from scratch in **Haskell**: a
  lexer, recursive-descent parser, full Hindley-Milner type inference with
  `let`-polymorphism and `let rec`, algebraic data types and pattern matching,
  nominal records, type classes with dictionaries, chars and string builtins,
  tail-call optimization, a deterministic optimizer, a tree-walking
  interpreter, and a real bytecode VM with closures, upvalue cells, and an
  instruction profiler. The entire language is mirrored one-to-one in
  dependency-free JavaScript, so a static web playground runs it in the
  browser with a single-stepping VM debugger, an optimizer toggle, and a
  profiler panel. A differential corpus (plain and optimized) plus a
  cross-language check prove the interpreter, VM, and JS mirror all agree
  byte-for-byte, and its standard library is written in Halcyon itself. Zero
  dependencies, 684 tests. See
  [ideas/2026-08-15-halcyon-functional-language-vm.md](ideas/2026-08-15-halcyon-functional-language-vm.md).

- **Glyphforge** - a bitmap font designer and glyph-to-code tool written in
  **Kotlin**: draw a pixel font in a terminal grid, autotrace it to a compact
  run-length `.gff` raster font file, and export usable glyph maps (Kotlin,
  Java, C header, or text) that retro projects can embed directly. Kerning
  pairs, a headless renderer that proofs any string at any scale, and a
  self-contained HTML specimen page that previews fonts live in the browser.
  The lab's first Kotlin project and its first font/tooling project.
  Zero dependencies, 135 tests. See
  [ideas/2026-08-15-glyphforge-bitmap-font-designer.md](ideas/2026-08-15-glyphforge-bitmap-font-designer.md).

- **Beambus** - a retro arcade shoot 'em up written from scratch in
  **Zig**: a deterministic, headless-testable game core, scripted `.beam`
  level files, eight enemy movement patterns, configurable enemy shot
  volleys, boss enrage phases and dive patterns, power-up weapon tiers,
  one-hit shields, and timed rapid-fire boosts, bomb-refill drops, smart
  bombs, a combo scoring multiplier, bonus lives, near-miss grazes, homing
  enemy shots, a focus mode with a precise hitbox reticle, a
  performance-scaled rank difficulty meter, a procedural pixel-art
  renderer, and a tiny subtractive audio synth, all on an SDL2 platform
  layer. The lab's first Zig project and its first real windowed
  desktop application. 92 headless tests, no SDL needed. See
  [ideas/2026-08-14-beambus-retro-arcade-shooter.md](ideas/2026-08-14-beambus-retro-arcade-shooter.md).

- **Aftershock** - a seismic network simulator written in **Rust**: model an earthquake on a fault grid, propagate realistic P-, S-, and surface waves across stations, and produce terminal seismograms plus a downloadable waveform file, all from a CLI. The lab's first Rust project and its first project in geophysics. A self-contained CLI with zero external dependencies, pure Rust standard library. See
  [ideas/2026-08-14-aftershock-seismic-network-simulator.md](ideas/2026-08-14-aftershock-seismic-network-simulator.md).

- **Gambit** - a UCI chess engine written from scratch in
  **C++17**. A bitboard board representation (six piece-type bitboards, two
  color bitboards, and occupancy) drives a legal move generator verified against
  the standard perft suite (start position to depth 5, kiwipete, and the classic
  positions 3-6). A negamax alpha-beta search with quiescence, late move
  reduction, killer moves, and transposition-table move ordering, under
  iterative deepening with time management, out-plays a casual human. It plays
  a full game in the terminal (Unicode board, SAN input, hints and takebacks)
  or speaks the UCI protocol to any chess GUI. No dependencies, with a built-in
  test suite that re-runs the perft suite on every build. See
  [ideas/2026-08-14-gambit-uci-chess-engine.md](ideas/2026-08-14-gambit-uci-chess-engine.md).

- **Granite** - a SQL database engine built from scratch in Go: a hand-written
  lexer and recursive-descent parser feed a query planner and executor that
  run `CREATE TABLE` / `CREATE INDEX`, `INSERT`, `UPDATE`, `DELETE`, and
  `SELECT` with joins, `WHERE`, `ORDER BY`, `LIMIT`, `DISTINCT`, and `EXPLAIN`,
  against a paged B-tree storage engine with transactions, auto-commit, a free
  list, and secondary indexes, all persisting to a real `.db` file. Standard
  library only, with 81 unit and end-to-end tests. See
  [ideas/2026-08-13-granite-sql-database-engine.md](ideas/2026-08-13-granite-sql-database-engine.md).

- **Orrery** - an interactive 3D solar system in the browser: hand-rolled
  WebGL + TypeScript with real Keplerian orbital mechanics, procedurally
  textured planets, diffuse/specular lighting, and a free-fly camera with
  pause, time-warp, and click-to-fly to any planet. See
  [ideas/2026-08-13-orrery-webgl-solar-system.md](ideas/2026-08-13-orrery-webgl-solar-system.md).
- **Cadence** - a terminal sorting-algorithm visualizer with audio
  sonification: nine classic sorts animated as ASCII bars while every
  comparison and swap rings out as a pitch-mapped tone. See
  [ideas/2026-08-12-cadence-sorting-visualizer-with-sound.md](ideas/2026-08-12-cadence-sorting-visualizer-with-sound.md).
- **Regexplorer** - a visual regex engine that animates NFA matching in the
  terminal. It parses a small regex subset into an AST, builds the classic
  Thompson NFA, draws the state machine as an ASCII graph, and steps a string
  through it frame-by-frame so you can watch which transitions fire, where
  greedy backtracking gives input back, and whether the match succeeds. Two
  honest engines - linear set-of-states NFA simulation (leftmost shortest) and
  greedy recursive backtracking (leftmost longest) - make catastrophic patterns
  like `(a+)+b` a one-command demo. See
  [ideas/2026-08-11-regexplorer-visual-regex-engine.md](ideas/2026-08-11-regexplorer-visual-regex-engine.md).
- **Fernwald** - a terminal L-system fractal garden that grows procedural
  plants, trees, and fractals from grammar rules and renders them as ASCII art
  or SVG. Seven presets, custom grammars, seeded stochastic gardens, and growth
  animation. Nothing but the Python standard library. See
  [ideas/2026-08-10-fernwald-terminal-lsystem-garden.md](ideas/2026-08-10-fernwald-terminal-lsystem-garden.md).
- **Shaftcast** - a first-person raycasting engine that renders a pseudo-3D,
  Wolfenstein-style view straight into your terminal using DDA ray casting and
  distance-based ASCII shading, with first-person WASD movement, per-tile
  textures, a minimap overlay, and a maze generator. Nothing but the Python
  standard library. See [ideas/2026-08-09-shaftcast-terminal-raycasting.md](ideas/2026-08-09-shaftcast-terminal-raycasting.md).
- **Redline Rush** - a top-down arcade car racing game that runs in any
  browser; steer a four-lane highway at ever-increasing speed and grab fuel
  cans before the tank runs dry. Canvas 2D + Web Audio, zero assets, works
  offline. See [ideas/2026-08-08-redline-rush-top-down-arcade-racer.md](ideas/2026-08-08-redline-rush-top-down-arcade-racer.md).
- **Rotoria** - a terminal Enigma machine cipher simulator that reproduces the WWII Enigma's rotor stepping (including the famous double-step), plugboard, ring settings, and reflectors, using nothing but the Python standard library. See [ideas/2026-08-08-rotoria-terminal-enigma-simulator.md](ideas/2026-08-08-rotoria-terminal-enigma-simulator.md).
- **Homunculus** - a genetic-algorithm CLI that evolves a population of random strings into an exact target phrase, using nothing but the Python standard library. See [ideas/2026-08-08-homunculus-genetic-algorithm.md](ideas/2026-08-08-homunculus-genetic-algorithm.md).
- **Arpeggio** - a Markov-chain melody composer that renders original tunes to WAV from the terminal, using nothing but the Python standard library. See [ideas/2026-08-08-arpeggio-markov-melody-composer.md](ideas/2026-08-08-arpeggio-markov-melody-composer.md).
- **Automatarium** - a dependency-free Python CLI that renders classic cellular automata (Rule 30, Conway's Game of Life, and Langton's Ant) live in the terminal. See [ideas/2026-08-08-automatarium-cellular-automata.md](ideas/2026-08-08-automatarium-cellular-automata.md).
- **Tic-Tac-Toe** - browser game with PvP, vs-Computer modes, and an unbeatable minimax AI. See [ideas/2026-08-08-tic-tac-toe-minimax-ai.md](ideas/2026-08-08-tic-tac-toe-minimax-ai.md).

## License

This project is licensed under the MIT License - see [LICENSE](LICENSE) for details.

## Content

Subject to change without notice. Check the issues and pull requests to see what's in flight.
