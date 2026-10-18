# Progress - Maze-Chase Overhaul: Real-Terminal Polish, Releases, Identity

- **Issue:** #582 (parent vision, reopened 2026-10-18 by the owner directive; the
  migration epic is complete and archived in
  `progress/582-maze-chase-rust-migration.md`)
- **Branch:** opencode/issue582-20261018121223 (this roadmap PR); each phase runs
  on its own `opencode/issue582-overhaul-phase-<n>-<slug>` branch
- **Status:** in-progress
- **Updated:** 2026-10-18
- **Active Phase:** Phase 2: Dynamic Terminal Layout and Full-Window Composition
  (landed; the real-emulator resize proof stays open for the per-OS testers)
- **Blueprint:** `ideas/2026-10-18-maze-chase-overhaul.md`
- **Findings ledger:** `progress/582-maze-chase-overhaul-findings.md` (created in
  Phase 1; every reassessment gap lives here until resolved or documented)

## Overhaul Roadmap

- Phase 1: Product Reassessment and Real-Terminal Truth: [x] real-terminal driver harness (`maze-chase/tools/compat/`: `run-linux.sh`, `run-macos.sh`, `run-windows.ps1`, `drive.sh`, `collect.py`, `README.md`), [x] reproduce the Owner's Ghostty and Kitty findings on current main with recorded evidence (kitty reply-loop flood plus input delayed past the session, Ghostty mis-routing despite its kitty-graphics support; eight executed Linux rows in `maze-chase/tools/compat/evidence/`), [x] critical reassessment of engine, layers, and docs claims (four parallel sweeps; Section B of the ledger), [x] findings ledger with every gap (`progress/582-maze-chase-overhaul-findings.md`), [x] honest compatibility matrix scaffold `maze-chase/docs/terminal-compat.md` (executed rows plus named executors for host-pending rows), [ ] new sub-issues routed through the Maintainer (proposed set in ledger Section C; filing is the Maintainer's next step, not done in this PR) (PR 1 target, Refs #582, Refs #655, Refs #661)
- Phase 2: Dynamic Terminal Layout and Full-Window Composition: [x] geometry model with cell pixel size (`crates/terminal/src/geometry.rs`; TIOCGWINSZ pixel fields on Unix, console font on Windows, nominal 8x16 fallback), [x] pure layout solver (full 1..8 x 1..4 scale grid with coverage-first selection; side panel, HUD band, hint-only by fit; exact 62x35 card; golden plans 200x60 -> 7x1 and 62x80 -> 2x2), [x] bounded centered image rendering at the real pixel geometry (raster fit to the board's pixel box; image footprint mapped through the window pixels, so Kitty never stretches and Sixel never overflows; 8-ppt nominal fallback), [x] continuous cell-tier scales (`unicode::fit_width`/`center_rows` at any scale), [x] resize contract with same-frame repaint and stale-placement kill (`ESC[2J` plus Kitty delete-all in the new frame; pinned by `tests/plan_contract.rs`), [x] tier-aware too-small card (reads `layout.min_cols/min_rows`; exact 62x35 boundary pinned), [ ] real-emulator resize proof on Linux and macOS (the PTY proof landed with this PR; the real rows are per-OS tester work, no emulator exists on the build machine) (PR 2 target, Refs #582, Refs #656)
- Phase 3: Terminal Render Pipeline and Compatibility Proof: [ ] bounded live Kitty probe with byte replay (Ghostty enablement), [ ] atlas plus placement composition with full-frame fallback, [ ] dirty-change detection and wall-clock pacing with backpressure, [ ] Sixel path hardening, [ ] protocol-aware watchdog, [ ] `MAZE_CHASE_TRACE` JSONL evidence mode, [ ] kitty and ghostty rows signed on Linux and macOS plus conventional terminals (PR 3 target, Refs #582, Refs #655)
- Phase 4: Visual Identity Redesign: [ ] Design Council direction consumed (dispatched by the Maintainer before this phase), [ ] resolution-aware character and environment art, [ ] effects and animation system, [ ] refreshed themes with accessibility tests green, [ ] all three layers integrated with real captures (PR 4 target, Refs #582, Closes #658)
- Phase 5: Sound Design Overhaul: [ ] new musical score with one BPM source, [ ] soft short effect bank, [ ] mix architecture with fades and safe defaults, [ ] terminal chime policy default-off, [ ] per-layer real-host review and settings round-trip (PR 5 target, Refs #582, Closes #659)
- Phase 6: Release Engineering and Multi-Platform Distribution: [ ] version single source plus tag parity gate, [ ] Linux deb and rpm plus tarballs for both layers, [ ] Windows installer plus zip, [ ] macOS app plus dmg plus tarball, [ ] install/launch/uninstall smoke scripts, [ ] `maze-chase-release.yml` pipeline via the Lab Engineer, [ ] release candidate artifacts on the official Releases page, [ ] install/upgrade/uninstall docs (PR 6 target, Refs #582, Closes #657)
- Phase 7: Game-First Web Experience and Subpages: [ ] `maze-chase/index.html` boots directly into the game with no clutter, [ ] downloads, install, docs, compatibility, releases subpages, [ ] rendered docs on Pages with link checks, [ ] deployed-URL browser E2E including mobile (PR 7 target, Refs #582, Closes #660)
- Final Phase: Full-Product Verification and Release Sign-Off: [ ] full terminal matrix re-signed on the released artifacts, [ ] per-OS install/upgrade/uninstall from release artifacts, [ ] deployed Pages E2E for the game and every subpage, [ ] audio and visual craft evaluated on real captures, [ ] reassessment ledger fully resolved or documented, [ ] stable `maze-chase-v1.0.0` release cut, [ ] hub, README, and docs unified (Final PR, Refs #582, Closes #655, Closes #661, Closes #582)

## Current step

Phase 2 landed on the workflow-bound branch
`opencode/issue582-20261018200149` (the same mechanic as Phase 1: the
run's push binds to its trigger branch, noted in the PR body). The
layout is now a pure continuous solver (tile scales 1..8 columns by
1..4 rows plus the 2x1 floor; side panel, then HUD band, then hint-only
chrome by fit; one exact 62x35 card), the cell tier renders at any
scale, the bitmap tiers rasterize at the detected real cell pixel size
with the proven 8-ppt nominal fallback, a live resize clears the screen
and repaints in the same frame (the Kitty tier deletes every live
placement first), and `MAZE_CHASE_TRACE` writes the JSONL machine
trace the harness collector ingests. Measured: workspace suite 430
passed, 0 failed across 51 targets, `maze-chase-verify` 19/19 with the
`23c17f89734e` golden intact, clippy back to the pre-existing engine
lints only. The real-emulator resize rows (Linux kitty/Ghostty/xterm,
macOS) are the one open Phase 2 checklist item and stay with the
per-OS testers: no emulator is installed on the build machine. Next:
Phase 3 (terminal render pipeline and compatibility proof).

## Next steps

- Builder: Phase 2 landed with this PR (dynamic layout and full-window
  composition); Phase 3 (render pipeline and compatibility proof) starts
  from the merged tip.
- Maintainer: dispatch the Design Council pass (`/oc design`, specialists as
  needed) after this roadmap lands, timed to complete before Phase 4 build;
  file the Phase 1 findings as linked sub-issues prioritized into the remaining
  phases; keep #582 open until the Final Phase ledger is complete.
- Per-OS testers: Phase 2 (Linux plus macOS emulator proof), Phase 3 (matrix
  signing on all three OSes), Phase 6 (native package install/uninstall), and
  the Final Phase re-verification.
- Every phase PR carries `Refs #582`; closing keywords only as listed in the
  roadmap; the parent closes only on the verified final release.

## Standing notes

- Layer-stays-layer rule: no gameplay logic in layer crates; engine, assets,
  audio, and config change only through their public APIs; a gameplay branch in
  a layer crate is a blocking review finding.
- No compatibility, quality, or distribution claim may exceed its verified
  evidence; every matrix row names its run, trace, or capture; real-terminal
  findings outrank harness results.
- Zero stubs; features planned for later phases must not appear as dummy
  controls earlier; every phase leaves the repo and workflows green.
- Packaging code and docs are Builder work; `.github/workflows/**` changes route
  through the Lab Engineer (`/oc lab`).
- The Design Council's shipped `docs/design.md` plus tokens are binding for
  Phases 4 and 5; the Builder implements, never re-authors the direction.
- Public docs stay a single unified product view: no milestone numbers, no
  sprint language, no em dashes anywhere.
- `pacman/` (#552) remains retired and untouched; the engine determinism
  goldens (`23c17f89734e`) must stay intact through every phase.

## Agent log

- 2026-10-18 (architect): structured the owner-ordered overhaul into this
  eight-phase roadmap from four parallel reconnaissance subagents (terminal
  layout/resize/tier internals; release and packaging surface plus the Desktop
  Pet pipeline precedent; assets/audio/config systems; web hub and Pages
  staging rules). Wrote the unified blueprint
  `ideas/2026-10-18-maze-chase-overhaul.md`: dynamic layout solver with real
  pixel geometry, atlas-plus-placement Kitty pipeline with a bounded live
  probe (Ghostty enablement), resolution-aware identity ladder, rebuilt audio
  content and mix, workspace-version release engineering with deb/rpm/Inno/dmg
  and an automated pipeline, game-first Pages with subpages, and a
  real-terminal evidence pipeline with a JSONL trace. Seven confirmed defect
  classes recorded as Phase 1 seeds. Workstream mapping: #655 and #661 close in
  the Final Phase; #656, #658, #659, #657, #660 close in their own phases.
  Design Council pass reserved for Phases 4-5. Delegation ledger in the
  blueprint. Handoff to Builder for Phase 1. - the Architect
- 2026-10-18 (builder): executed Phase 1 on the PR #662 branch (the
  workflow gate binds this build's push to this PR, so the phase landed
  here instead of the roadmap's fresh-branch naming; noted in the PR
  body). Built the harness (`tools/compat/`: shared session driver,
  Linux runner with Xvfb/llvmpipe and apt/PPA emulator installs, macOS
  and Windows executors, evidence collector with per-phase transcript
  segmentation, protocol counters, and tier observation), executed eight
  real Linux rows with committed evidence, ran the strace experiment
  that isolated the kitty reply-loop, ran four reassessment sweeps
  (engine/assets/audio, desktop, web, docs), wrote the findings ledger
  and the honest compatibility matrix, and corrected the false Ghostty
  claim plus the unqualified release copy. No product fixes, per phase
  scope. - the Builder
- 2026-10-18 (builder delegation ledger, Phase 1): four exploration
  subagents ran in parallel (engine/assets/audio sweep; desktop-layer
  sweep; web-hub sweep; docs-claim sweep). Engine sweep returned the
  warden-facing, fright-mask, audio-default, reduced-flash, and
  minimum-size defects (ledger B.1-5). Desktop sweep returned the
  max-pixel silent freeze, missing scale-factor, idle busy-poll, and
  dev-grade packaging findings (B.6-9). Web sweep returned the
  release-claim and closed-issue copy findings (B.10-13). Docs sweep
  returned the Ghostty capability-gap claim plus the fps and README
  overclaims (B.14-16). Primary context verified every cited file:line
  by direct read (`crates/terminal/src/{backend,layout,raster}.rs`,
  `crates/desktop/src/{frame,window}.rs`, `maze-chase/index.html`,
  `maze-chase/README.md`, `docs/terminal.md`) and produced all
  executable evidence itself: the eight real terminal rows, the strace
  reply-loop experiment, and the reassessment write-up. Skills: no
  registry skill matched this run's domains (no opencode configuration,
  agent, or plugin edits); none loaded, per `delegation.md` section 5.
  - the Builder
- 2026-10-18 (fixer delegation ledger, round-2 findings): three
  verification subagents fanned out in parallel (evidence-number audit;
  stale-claim and leak sweep; Windows-executor adversarial review). The
  number audit re-derived every quoted figure from the committed JSONs
  and returned the 348.6 MiB rounding, the ghostty pause-phase
  attribution, and the plural frame-rate overreach; the sweep returned
  the stale "six rows" counts and the ambiguous ghostty antecedent, and
  a clean bill on em dashes and events.log path normalization (its other
  mentions, including the terminal crate's installable-package wording,
  are backed by the staged tarball plus install script and the matrix
  proof, so they stand); the Windows
  review proved the R1-R2 grading matrix end to end under pwsh and
  returned the nested-notes flattening bug and the generated-runner
  apostrophe gap. Primary context applied every fix and re-ran the
  direct verification itself: `bash -n drive.sh`, `py_compile
  collect.py`, `Parser::ParseFile` on `run-windows.ps1`, the extracted
  grading-block scenario matrix, `Test-PngFile` and `valid_png`
  behavior, a synthetic `collect.py` run, and jq re-derivation of the
  counter tables. Skills: no registry skill matched this run's domains
  (no opencode configuration, agent, or plugin edits); none loaded, per
  `delegation.md` section 5.
  - the Fixer
- 2026-10-18 (fixer delegation ledger, round-3 findings): two
  verification subagents fanned out (doc-truth/copy audit; adversarial
  collector-gate verification). The doc audit confirmed the VT340
  invocation and matrix-executor wording match the committed evidence
  notes exactly and found no residual overclaim in PR-touched files; the
  collector audit reproduced all requested scenarios and surfaced one
  pre-existing hole (white_share classified neither RGBA nor gray+alpha,
  the capture shapes the Windows .NET and macOS arms emit, leaving the
  light-background gate structurally blind there), fixed by classifying
  both by color channels. Primary context ran `py_compile`, `bash -n` on
  all three scripts, the pwsh parser, the synthetic collector matrix,
  drive.sh relative-outdir absolutization, and decoded all 80 committed
  screenshots with the IEND-requiring decoder. Crafted-events-log `..`
  escapes and basename collisions were evaluated and are unreachable
  from driver-written logs. Skills: no registry skill matched this
  run's domains; none loaded, per `delegation.md` section 5.
  - the Fixer
- 2026-10-18 (tester-round follow-up on Phase 1): one blocking defect
  from the Tester's live run: the harness README's bare
  `tools/compat/run-*.sh` commands were committed mode 0644 and failed
  with `Permission denied`. Set the executable bit on `run-linux.sh`,
  `run-macos.sh`, and `drive.sh`; the committed contract suite now
  passes 8/8. Recorded the collector's per-phase attribution boundary
  (frames and chunked kitty payload straddling checkpoint cuts) as a
  comment in `collect.py`; the Tester's crafted-run-dir hardening list
  stays deferred, as scoped. No delegation: single-area mode fix plus
  one comment, below the threshold.
  - the Fixer
- 2026-10-18 (builder, Phase 2): built the geometry detection module, the
  continuous layout solver with fitted chrome, exact-fit raster scaling,
  continuous cell-tier scales, the same-frame resize contract (clear plus
  Kitty delete-all before the repaint), and the `MAZE_CHASE_TRACE` JSONL
  mode; rewrote the pinned layout/unicode tests and added
  `crates/terminal/tests/plan_contract.rs`. Delegation ledger: one
  `general` verification subagent (adversarial pass over layout/unicode/
  geometry invariants plus its own bounded suite run) returned 23 targets
  and 146 tests green and one concrete finding (a zero-sized cell-pixel
  report divides by zero in the public `compute_with`), fixed with an
  input filter and pinned by
  `zero_cell_report_falls_back_to_nominal_without_panicking`; it also
  brute-force-simulated about 800k size and cell combinations with zero
  containment or overlap violations. Primary context ran the full
  workspace suite (430 passed, 0 failed across 51 targets),
  `maze-chase-verify` 19/19, fmt and clippy, and the PTY contract tests
  itself. Skills: no registry skill matched this run's domains (no
  opencode configuration, agent, or plugin edits); none loaded, per
  `delegation.md` section 5.
  - the Builder
- 2026-10-18 (fixer, Phase 2 review round 1): applied the round-1 findings
  on PR #685: the shrink-into-too-small resize path now deletes every live
  Kitty placement in the card's first frame (the same guard as the board
  path), pinned by
  `kitty_shrink_into_too_small_deletes_placements_and_draws_card` in the
  PTY contract suite; `Closes #656` scoped back to `Refs #656` (PR title
  and body, plus the roadmap annotation) until the per-OS real-emulator
  proof lands; the layout footprint test renamed and re-pinned for
  square-cell reports; the broken `Geometry::for_override` doc link
  corrected; `compute_with` now shares the geometry detector's sane cell
  bounds; and the round's nits folded in (resize-race marker comment, the
  ppt clamp documented in `docs/terminal.md`, `fresh` consumed only after
  a successful frame write, the raster clamp comment made honest). No
  rebuttal: every finding was applied as written. Skills: no registry
   skill matched this run's domains; none loaded, per `delegation.md`
   section 5.
   - the Fixer
- 2026-10-18 (builder, Phase 2 tester round on #656): fixed the three
  blocking real-PTY findings from the Linux Tester. F1: the solver now
  scans the full documented 1..8 x 1..4 scale grid (the old derived
  `ch = cw * cell_w / cell_h` diagonal skipped 7x1 and 2x2, stranding
  200x60 at 21.7% coverage and 62x80 at 35.0%) and picks coverage-first
  (ties: squareness, chrome, area, width); goldens pinned at 200x60 ->
  7x1 band and 62x80 -> 2x2 band with a 62..400 x 35..120 coverage
  sweep. F2/F3: `Layout` now carries the board pixel box and a centered
  `image` footprint mapped from the raster's pixel size through the
  detected window pixels; ppt is fit-bounded to the board box, the
  Sixel raster paints from the centered origin (no more hint-line
  overflow or corner-hugging), and the Kitty escape displays at the
  centered footprint (no more 1.4-1.75x stretch). `geometry` gained
  `PixelGeometry`/`detect_pixels()` (window pixels included), the trace
  plan record carries the new fields, and docs were reconciled
  (`docs/terminal.md`, `docs/feature-matrix.md`, `layout.rs` header).
  New committed tests: `golden_plans_pin_the_fixed_scale_grid`,
  `coverage_sweep_never_leaves_rooms_hollow`,
  `window_pixels_map_the_raster_onto_a_centered_footprint`,
  `raster_always_fits_the_board_pixel_box`, the PTY
  `pixel_reports_shape_footprint_and_raster` placement pins, and
  `sixel_raster_paints_centered_inside_its_cell_box`. Verification:
  `cargo test --workspace` green (0 failed; desktop E2E under Xvfb),
  `cargo fmt --all --check` clean, clippy back to the pre-existing
  engine lints only, `maze-chase-verify` 19/19 with the
  `23c17f89734e` golden   intact. Delegation ledger: three subagent missions ran against the
  finished change before commit. (1) `general` adversarial verification:
  brute-forced the solver math against an independently mirrored
  implementation (30,793 plans, 0 mismatches; 0 containment violations
  across 32,801 probes; extreme u16/u32 sizes clean), re-derived the
  comparator, and re-ran the suites; it confirmed no blocking defects
  and flagged two doc-precision issues (the 6-ppt floor can exceed the
  board box only in absurdly tiny pixel windows; footprint aspect
  rounds to within one cell per axis) plus a test-header numbering
  slip. (2) `explore` stale-claim sweep: found the cross-layer doc
  contradictions (terminal README, desktop `render.rs` comment, browser
  parity rows) and the numeric `min_terminal_cells` token still at
  60/36. Every finding was fixed in this run (precision qualifiers,
  cross-layer wording, token alignment, header renumber). Primary
  context implemented the fix, re-derived the golden rects, and ran
  the gates. Skills: no registry skill matched this run's domains (no
  opencode configuration, agent, or plugin edits); none loaded, per
  `delegation.md` section 5.
  - the Builder
