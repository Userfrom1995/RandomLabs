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
- Phase 2: Dynamic Terminal Layout and Full-Window Composition: [x] geometry model with cell pixel size (`crates/terminal/src/geometry.rs`; TIOCGWINSZ pixel fields on Unix, console font on Windows, nominal 8x16 fallback), [x] pure layout solver (2..8 x 1..4 scale grid at the 2x1 compact floor with coverage-first selection; side panel, HUD band, hint-only by fit; exact 62x35 card; golden plans 200x60 -> 7x1 and 62x80 -> 2x2), [x] bounded centered image rendering at the real pixel geometry (raster fit to the board's pixel box; image footprint mapped through the window pixels, so Kitty never stretches and the Sixel raster stays inside the board's pixel box whenever the box can host the 6-ppt legibility floor, and absurdly tiny pixel windows keep the documented floor and may overflow; 8-ppt nominal fallback), [x] continuous cell-tier scales (`unicode::fit_width`/`center_rows` at any scale), [x] resize contract with same-frame repaint and stale-placement kill (`ESC[2J` plus Kitty delete-all in the new frame; pinned by `tests/plan_contract.rs`), [x] tier-aware too-small card (reads `layout.min_cols/min_rows`; exact 62x35 boundary pinned), [ ] real-emulator resize proof on Linux and macOS (the PTY proof landed with this PR; the real rows are per-OS tester work, no emulator exists on the build machine) (PR 2 target, Refs #582, Refs #656)
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
layout is now a pure continuous solver (the 2..8 x 1..4 scale grid
picked coverage-first; side panel, then HUD band, then hint-only chrome
by fit; one exact 62x35 card), the cell tier renders at any scale, the
bitmap tiers rasterize at the detected real cell pixel size (raster fit
to the board's pixel box, image on a centered footprint) with the
proven 8-ppt nominal fallback, a live resize clears the screen and
repaints in the same frame (the Kitty tier deletes every live placement
first), and `MAZE_CHASE_TRACE` writes the JSONL machine trace the
harness collector ingests. The Linux Tester's real-PTY round on the
dynamic-layout build returned three blocking findings (F1: the solver
scan; F2: Sixel placement; F3: Kitty footprint); all three are fixed on
this follow-up branch with committed tests. The reviewer's second round
then enforced the 2x1 compact floor on the pixel path (1-column scales
no longer win the chrome tie-break; the 80x63 / 8x6 case is pinned),
reconciled the scoring and raster claims across the blueprint, the
terminal doc, and the module header, restored the dated solver record
to its pre-fix wording, and tightened the squareness guard. A Quality
Council pass then scoped the terminal doc's coverage claim to the
measured sweep floor (280/1000 at 399x62) and its Sixel bounding
guarantee to the documented 6-ppt legibility-floor exception.
Re-measured on the final tree with the Tester's committed live-golden
suite included: workspace suite 451 passed, 0 failed across 47 test
binaries plus 7 doc-test suites, `maze-chase-verify` 19/19 with the
`23c17f89734e` golden intact, clippy back to the pre-existing warnings
from `main` (none from this branch's files). The
real-emulator resize rows (Linux kitty/Ghostty/xterm, macOS) are the
one open Phase 2 checklist item and stay with the per-OS testers: no
emulator is installed on the build machine. Next: Phase 3 (terminal
render pipeline and compatibility proof).

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
- 2026-10-18 (Design Council): ran the full four-round deliberation
  (`/oc design` on #582 across three dispatches: run 39156808919 timed
  out in Round 4 synthesis after Round 3 had completed, the auto-retry
  run 39161404347 died mid-Round-3 with the motion revision pending,
  and the shipping dispatch 39168334922 composed the final motion spec
  and wrote the artifact) and shipped the binding direction:
  `maze-chase/docs/design.md` plus `design-tokens.json` now carry
  Pondwake identity (Rill the pond frog; heron, pike, snake, dragonfly
  hunters; Dusk Pond, Morning Shallows, Moonwake themes with every
  contrast gate recomputed and passing, eyes-slot fix included),
  Waylight interaction (play-first boot inside the Waystation card
  grammar), and Lantern Drift motion (revised hybrid: continuous
  positions on image, desktop, and web tiers; tile-locked cell actors;
  cuts on image tiers; expanded reduced-flash and reduced-motion
  registries; budgets in KiB/s with a shared degrade contract). The
  runner-up (Paper Tailor plus Ember Cadence plus guided Waystation)
  ships as the recorded exhibit with its rescue hexes, and the full
  dissent log and delegation ledger are in the artifact. Binding for
  the visual and sound phases: the Builder implements this direction,
  never re-authors it. Delegation ledger (round by round): Round 1
  propose (three specialist swarms, two directions each; the visual
  swarm empty twice, recovered by a split parts-A pass plus palette
  follow-ups, one of which also returned empty once); Round 2 critique
  (three cross-assigned critic swarms; the motion critic empty twice,
  succeeded on a leaner third prompt); Round 3 revise (the UX and
  visual revisions returned; the motion revision empty twice, so the
  motion revisions are primary-composed from the recorded critique
  resolutions); Round 4 converge (primary synthesis; the final motion
  spec primary-composed); primary context recomputed the corrected
  palette metrics and cross-checked the artifact against the tokens;
  all other swarms returned; no registry skill matched this run's
  domains, none loaded, per `delegation.md` section 5.
  - the Design Council
- 2026-10-18 (fixer, design review round 1 on PR #688): applied all
  nine findings from the Reviewer's round 1 (F1-F9). Corrected the
  engine windows to the warden-cruise fractions (fright hunters 5.06,
  eyes 12.24, house exit 4.49, re-derived from `tuning.rs` and
  `ghosts.rs`); moved the Moonwake fright fill to #E8FFF8 so the
  "never white" rule holds (recomputed 19.17 on bg and 3.11 on wall,
  all gates pass); aligned the token companion with the artifact
  (Pondwake shape accents, retired `reduced_flash_replaces` in favor
  of the single motion registry, 62x35 floor, blink key removed,
  0.10 s death clip, 0.24 s overlay fade, refreshed notes); answered
  the Round 2 HUD-roster critique with the compact-floor fit (best and
  the sound chip relocate, no fourth HUD row); dropped the false ANSI
  mapping reference; scoped checklist item 5 to the real hosts;
  unified the pickup burst at 4 frames on the 66.7 ms grid; completed
  the delegation ledger round by round; corrected the dispatch
  chronology. Delegation ledger: three verification subagents fanned
  out (engine-window and floor re-derivation returned all five speed
  windows PASS; independent palette recomputation returned every
  metric and gate exact; artifact contract audit returned the F1-F9
  matrix PASS). Primary context applied every edit, re-ran
  `tokens_mirror_theme_palettes` and the CRLF byte test green, and
  verified the tokens `themes` section byte-identical. - the Fixer
- 2026-10-18 (fixer, design test round T1-T3 on PR #688): applied the
  Tester's findings. T1 (blocking): reworded the two lines that carried
  the word "milestone" (`design.md:161` "Milestone toasts" to
  "Achievement toasts"; `:633` to "no internal progress counters") so
  `cargo test -p maze-chase-terminal --test tester_docs_language` is
  green again; the guard itself is untouched. T2: the sunseed halo
  prose now states the rung-snapped period (400 ms base; 416.7 ms at
  the 24/12 Hz snap), matching the per-rung table and
  `durations_ms.sunseed_halo`. T3: the reduced-motion registry prose
  now carries the ninth source (overlay fades on desktop and web,
  which become cuts), matching `motion_lantern_drift.reduced_motion`,
  and the transition inventory states the same rule; no token change,
  so the `themes` section stays byte-identical. Delegation ledger: two
  verification subagents fanned out (docs-language guard sweep;
  T2/T3 contract consistency); the guard sweep returned both tests
  green and zero residue across all 18 scanned files with a positive
  control, and the contract pass returned the halo arithmetic exact,
  the registries at 9/9 reduced-motion and 14/14 reduced-flash, the
  rule statement present, and the tokens file unmodified. Primary
  context applied every edit and re-ran the docs-language guard green.
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
  `cargo test --workspace --no-fail-fast` (desktop E2E under Xvfb):
  446 passed, 0 failed across 46 test binaries plus 7 doc-test suites;
  `cargo fmt --all --check` clean; clippy back to the pre-existing
  warnings from `main` only, none from this branch's files;
  `maze-chase-verify` 19/19 with the `23c17f89734e` golden intact.
  Delegation ledger: two subagent missions ran against the
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
- 2026-10-19 (fixer, Phase 2 review round 1 on PR #691): applied the
  Reviewer's round-1 findings on the tester-round build. F1: the
  follow-up scoreboard section's "Phase 2" phase counter was reworded
  to "the dynamic-layout build" so the committed docs-language guard
  passes again. F2: the workspace gates were re-run on the rebased tip
  and the observed 446 passed / 0 failed across 46 test binaries plus
  7 doc-test suites written into all four claim sites (the scoreboard,
  the findings-ledger evidence paragraph, this log, and the PR body).
  F3: rebased onto main's design-council pass (`3357ea79`), taking
  main's `design-tokens.json` and keeping main's design entries in this
  log. F4: the blueprint's sibling candidate-scoring sentence aligned
  with the implemented comparator. F5/F6/F7: the progress overclaim
  qualified to the documented 6-ppt floor exception, the stale
  current-step header re-measured, and the doc nits folded in
  (terminal tie-break line, paragraph break, parity row, spacing,
  subagent-mission count). Optional hardening applied too (centering
  asserts on `board_is_centered_and_inside`, the `cw=6` golden, the
  corrected 143x64 tie comment). No delegation: a prescribed-findings
  pass with file:line corrections and named re-measurements needed no
  open-ended investigation, so no subagent missions were launched; the
  primary re-ran the full gates itself. Skills: no registry skill
  matched this run's domains; none loaded, per `delegation.md` section
  5.
  - the Fixer
- 2026-10-19 (fixer, Phase 2 review round 2 on PR #691): applied the
  Reviewer's round-2 findings. F1: the blueprint's remaining scoring
  sentence now states the implemented comparator order. F2: the
  terminal doc no longer claims a large window gets an upscaled capped
  raster (the cap bounds encode cost, not the on-screen scale; the
  capped raster draws at native size on the centered footprint). F3:
  the no-pixel-report behavior is now stated per tier in the layout
  header and the public doc (Kitty stretches the nominal 8-ppt raster
  across the board box; Sixel paints it at natural size from the board
  origin). F4: the solver now enforces the 2x1 compact floor on the
  pixel path (1-column scales are skipped; with 8x6 cells at 80x63 a
  1x2 side-panel plan used to tie the 2x2 minimal plan on coverage and
  squareness and win the chrome tie-break), pinned by
  `layout::tests::pixel_path_never_drops_below_the_compact_floor` plus
  `cell_cols >= 2` asserts in both coverage sweeps, with the grid
  wording moved to 2..8 x 1..4 in the module header, the terminal doc,
  the feature matrix, and this log. F5: the dated scoreboard record was
  restored to its pre-fix solver wording (the follow-up section carries
  the fixed description). F6: the squareness guard is now strict
  (`<`, so the 8x3 regression it names can actually fail it). F7:
  recorded by the two entries here. Optional hardening: the
  `Layout::image` doc notes the floor clamp case and
  `PixelGeometry::window_px` filters zero-sized reports exactly like the
  solver does. The round's independent audit also caught the last
  same-class leftover (`feature-matrix.md`'s browser row still said
  "mirrors the terminal raster at 8 ppt"; now the shared 8-ppt
  reference raster), folded in. Verification on the final tree:
  `cargo test --workspace --no-fail-fast` under Xvfb 447 passed / 0
  failed across 46 test binaries plus 7 doc-test suites (the new floor
  pin included), `maze-chase-verify` 19/19 with the `23c17f89734e`
  golden intact, `cargo fmt --all --check` clean, clippy only the
  pre-existing engine style lints plus the design-token test's
  suggestion lints from `main`, none from this branch's files.
  Delegation ledger: two subagent missions ran in parallel against the
  finished change. (1) `explore` stale-claim audit: returned zero
  remaining contradictions (the two intentional historical "1..8"
  records identified by name), zero em/en dashes across the touched
  files, and the feature-matrix leftover fixed above. (2) `general`
  mirror-solver verification: a Python mirror plus a read-only Rust
  harness re-derived all 18 expected plans exact (every checked-in
  golden plus the 80x63 floor counterexample), swept 29,154 nominal and
  pixel-path windows with zero floor violations and the same 280/1000
  minimum at 399x62, and proved the floor skip load-bearing (without it
  the 1x2 plan returns). Primary context applied every edit, re-read
  each changed hunk, verified the Sixel/Kitty render path first-hand in
  `main.rs`, and ran all gates itself. Skills: no registry skill
  matched this run's domains (no opencode configuration, agent, or
  plugin edits); none loaded, per `delegation.md` section 5.
  - the Fixer
- 2026-10-19 (fixer, Phase 2 Quality Council round on PR #691):
  applied the Evaluator's two scoped doc-accuracy findings. E1: the
  terminal doc's coverage absolute ("never strands most of the window
  as dead space") now states the measured behavior (wide-short and tall
  rooms reach their scales instead of a single derived diagonal; the
  measured sweep floor is 280/1000 at 399x62). E2: the Sixel bounding
  guarantee is scoped to every window that can host the 6-ppt
  legibility floor, matching the paragraph's own documented exception.
  Refreshed the four claim sites (the scoreboard follow-up section, the
  findings evidence paragraph, the current-step summary above, and the
  PR body) to the tester-head tally, re-measured on this tree:
  451 passed / 0 failed across 47 test binaries plus 7 doc-test
  suites. No delegation: a two-sentence scoped-wording pass with named
  replacement text needed no open-ended investigation, so no subagent
  missions were launched; the primary applied the edits and re-ran the
  full workspace suite under Xvfb itself. Skills: no registry skill
  matched this run's domains; none loaded, per `delegation.md` section
  5.
  - the Fixer
- 2026-10-19 (fixer, Phase 2 review round 3 on PR #691): applied the
  Reviewer's round-3 finding. F1: the three needless borrows in the
  Tester's live-golden suite (`tester_layout_goldens_live.rs`'s
  `(&mut s.pty.master).write_all(...)` calls in the animation soak) are
  dropped, so `cargo clippy --workspace --all-targets` reports only
  main's pre-existing warnings (the engine style lints plus the
  design-token test's suggestions) and the four claim sites stand as
  written. The two builder commits the Reviewer flagged for bare-bot
  attribution (`ed1b15fb`, `b23591d2`) were re-authored to the
  `The Builder` persona in the same pass (metadata only; content
  byte-identical). No delegation: a three-token prescribed deletion
  with the file already open is below the delegation threshold; the
  primary applied the edit and re-ran the live golden suite (4/4), the
  full workspace suite under Xvfb (451 passed / 0 failed across 47
  test binaries plus 7 doc-test suites), `maze-chase-verify` 19/19 with
  the `23c17f89734e` golden intact, `cargo fmt --all --check`, and
  clippy itself. Skills: no registry skill matched this run's domains;
  none loaded, per `delegation.md` section 5.
  - the Fixer
