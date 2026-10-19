# Progress - Maze-Chase Overhaul: Real-Terminal Polish, Releases, Identity

- **Issue:** #582 (parent vision, reopened 2026-10-18 by the owner directive; the
  migration epic is complete and archived in
  `progress/582-maze-chase-rust-migration.md`)
- **Branch:** opencode/issue582-20261018121223 (this roadmap PR); each phase runs
  on its own `opencode/issue582-overhaul-phase-<n>-<slug>` branch
- **Status:** in-progress
- **Updated:** 2026-10-19
- **Active Phase:** Phase 3: Terminal Render Pipeline and Compatibility Proof
  (Complete, ready for review; macOS matrix rows stay with the per-OS testers)
- **Blueprint:** `ideas/2026-10-18-maze-chase-overhaul.md`
- **Findings ledger:** `progress/582-maze-chase-overhaul-findings.md` (created in
  Phase 1; every reassessment gap lives here until resolved or documented)

## Overhaul Roadmap

- Phase 1: Product Reassessment and Real-Terminal Truth: [x] real-terminal driver harness (`maze-chase/tools/compat/`: `run-linux.sh`, `run-macos.sh`, `run-windows.ps1`, `drive.sh`, `collect.py`, `README.md`), [x] reproduce the Owner's Ghostty and Kitty findings on current main with recorded evidence (kitty reply-loop flood plus input delayed past the session, Ghostty mis-routing despite its kitty-graphics support; eight executed Linux rows in `maze-chase/tools/compat/evidence/`), [x] critical reassessment of engine, layers, and docs claims (four parallel sweeps; Section B of the ledger), [x] findings ledger with every gap (`progress/582-maze-chase-overhaul-findings.md`), [x] honest compatibility matrix scaffold `maze-chase/docs/terminal-compat.md` (executed rows plus named executors for host-pending rows), [ ] new sub-issues routed through the Maintainer (proposed set in ledger Section C; filing is the Maintainer's next step, not done in this PR) (PR 1 target, Refs #582, Refs #655, Refs #661)
- Phase 2: Dynamic Terminal Layout and Full-Window Composition: [x] geometry model with cell pixel size (`crates/terminal/src/geometry.rs`; TIOCGWINSZ pixel fields on Unix, console font on Windows, nominal 8x16 fallback), [x] pure layout solver (2..8 x 1..4 scale grid at the 2x1 compact floor with coverage-first selection; side panel, HUD band, hint-only by fit; exact 62x35 card; golden plans 200x60 -> 7x1 and 62x80 -> 2x2), [x] bounded centered image rendering at the real pixel geometry (raster fit to the board's pixel box; image footprint mapped through the window pixels, so Kitty never stretches and the Sixel raster stays inside the board's pixel box whenever the box can host the 6-ppt legibility floor, and absurdly tiny pixel windows keep the documented floor and may overflow; 8-ppt nominal fallback), [x] continuous cell-tier scales (`unicode::fit_width`/`center_rows` at any scale), [x] resize contract with same-frame repaint and stale-placement kill (`ESC[2J` plus Kitty delete-all in the new frame; pinned by `tests/plan_contract.rs`), [x] tier-aware too-small card (reads `layout.min_cols/min_rows`; exact 62x35 boundary pinned), [ ] real-emulator resize proof on Linux and macOS (the PTY proof landed with this PR; the real rows are per-OS tester work, no emulator exists on the build machine) (PR 2 target, Refs #582, Refs #656)
- Phase 3: Terminal Render Pipeline and Compatibility Proof: [x] bounded live Kitty probe with byte replay plus the Sixel DA1 probe (the probe requires both the transmit and placement replies before it reads a verdict; Ghostty 1.3.1 answers the probe when one is sent, and its rows select the graphics path from `TERM_PROGRAM=ghostty`/`TERM=xterm-ghostty` without probing), [x] atlas plus placement composition with full-frame fallback (static layer and sprite atlas once per change, stable-id placement diffs, single-placement `d=i` deletes, explicit `z` stacking layers, DEFLATE PNG), [x] dirty-change detection and wall-clock pacing with backpressure (visual-change key, per-tier rates, 8 MiB/s byte ceiling, 1 Hz idle keepalive), [x] Sixel path hardening (64-color cap, 2 MiB frame ceiling with smaller-palette retry and an honest `cells-fallback` trace mode), [x] capability-aware probe plus write-path watchdog (`OK`/`ENOENT` replies decide kitty support; `q=2` keeps steady transmits silent, and the watchdog drops a tier after 3 failed frame writes with the reason recorded), [x] `MAZE_CHASE_TRACE` JSONL evidence mode (plan, frame mode/placements/static/atlas/encode time, skips, probe results), [x] kitty and ghostty rows signed on Linux plus conventional terminals (kitty and Ghostty both `kitty-graphics` pass at 21 transmits / 156.1-160.1 KiB per session with sprite visibility proven by capture census; xterm auto partial only for its light-background palette, 7 of 10 captures >=98% white; xterm dark passes on cells; the VT340 sixel rows pass at 140-141 transmits / 3.39-3.41 MiB), [ ] macOS matrix rows signed by the macOS Tester (PR 3 target, Refs #582, Refs #655)
- Phase 4: Visual Identity Redesign: [ ] Design Council direction consumed (dispatched by the Maintainer before this phase), [ ] resolution-aware character and environment art, [ ] effects and animation system, [ ] refreshed themes with accessibility tests green, [ ] all three layers integrated with real captures (PR 4 target, Refs #582, Closes #658)
- Phase 5: Sound Design Overhaul: [ ] new musical score with one BPM source, [ ] soft short effect bank, [ ] mix architecture with fades and safe defaults, [ ] terminal chime policy default-off, [ ] per-layer real-host review and settings round-trip (PR 5 target, Refs #582, Closes #659)
- Phase 6: Release Engineering and Multi-Platform Distribution: [ ] version single source plus tag parity gate, [ ] Linux deb and rpm plus tarballs for both layers, [ ] Windows installer plus zip, [ ] macOS app plus dmg plus tarball, [ ] install/launch/uninstall smoke scripts, [ ] `maze-chase-release.yml` pipeline via the Lab Engineer, [ ] release candidate artifacts on the official Releases page, [ ] install/upgrade/uninstall docs (PR 6 target, Refs #582, Closes #657)
- Phase 7: Game-First Web Experience and Subpages: [ ] `maze-chase/index.html` boots directly into the game with no clutter, [ ] downloads, install, docs, compatibility, releases subpages, [ ] rendered docs on Pages with link checks, [ ] deployed-URL browser E2E including mobile (PR 7 target, Refs #582, Closes #660)
- Final Phase: Full-Product Verification and Release Sign-Off: [ ] full terminal matrix re-signed on the released artifacts, [ ] per-OS install/upgrade/uninstall from release artifacts, [ ] deployed Pages E2E for the game and every subpage, [ ] audio and visual craft evaluated on real captures, [ ] reassessment ledger fully resolved or documented, [ ] stable `maze-chase-v1.0.0` release cut, [ ] hub, README, and docs unified (Final PR, Refs #582, Closes #655, Closes #661, Closes #582)

## Current step

Phase 3 landed on the workflow-bound branch
`opencode/issue582-20261018233137`. The kitty tier boots from a
bounded live probe (200 ms, keys replayed; a verdict is only read once
both the transmit and placement replies arrived) and paints through a
static board layer plus a transparent sprite atlas transmitted with
real DEFLATE PNG, moving stable-id placements each frame with explicit
`z` stacking layers (static 0; sunseeds 1; relish 2; per-warden body
and eyes bands 3..10 in raster paint order; Pip 11), so no terminal's
equal-z tie-breaking can hide the sprites. Steady transmits are silent (`q=2`), so the old
per-transmit `OK` reply loop cannot spin input. Pacing is wall-clock
per tier (30 Hz kitty, 24 Hz sixel, 60 Hz cells) with visual-change
skipping, a 1 Hz idle keepalive, an EWMA byte-rate backpressure delay,
and an 8 MiB/s ceiling. Sixel keeps its full-frame path with a
64-color palette cap and a 2 MiB frame ceiling. Ghostty 1.3.1 answers
the live probe when one is sent (direct pty experiment via
`maze-chase/tools/compat/probe-graphics.py`, 2026-10-19: both replies
recorded), and its rows select `kitty-graphics` from
`TERM_PROGRAM=ghostty` without probing; `MAZE_CHASE_TRACE` records the
plan, probe answers, per-frame mode and counts, encode time, and skips
for the harness.

Measured on this build (all eight Linux rows regenerated 2026-10-19
from the binary at `af1c1496`): kitty 0.32.2 observes
`kitty-graphics` and passes the full session at 21 transmits /
156.1 KiB of PNG payload (the pre-pipeline flood is a historical 1642
transmits / 348.6 MiB, killed), playing 99 frames in 4.79 s (20.7 fps)
at a 5.4 KiB mean frame; Ghostty 1.3.1 passes both rows at 21 /
160.1 KiB, playing 21.7-21.9 fps at a 5.5 KiB mean frame, and its
playing captures carry 402-412 sprite-palette pixels (the earlier
build hid every sprite behind the board on Ghostty: zero sprite
pixels, cause of the explicit-z fix); xterm 390 in VT340 mode passes
at 140 sixel transmits / 3.39 MiB; the default-background xterm row
remains partial only because its light palette leaves 7 of 10 captures
>=98% white. The pause surface now releases the kitty board and atlas
before painting its text menu (collect.py refuses a kitty `pass` when
the paused capture still carries sprite pixels), and bitmap capture
gates reject a playing/resized/refit surface that is >=98% one color.
Workspace tests pass, `maze-chase-verify` 19/19 with golden
`23c17f89734e` intact. The macOS matrix rows are the one open Phase 3
item and stay with the per-OS testers. Next: Phase 4 (visual identity
redesign), gated on the Design Council's direction.

## Next steps

- Builder: Phase 3 (render pipeline and compatibility proof) landed with
  this PR; Phase 4 (visual identity redesign) starts from the merged tip
  once the Design Council direction is binding.
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
- 2026-10-19 (builder, macOS test-portability round on #656): fixed
  the macOS arm's two committed-artifact findings on the #691 merge
  (the product itself passed on macOS). F1: the new geometry unit test
  set `TIOCSWINSZ` on a PTY master with no open slave, which macOS
  rejects with `ENOTTY`; the test now opens the slave (the
  integration harnesses' discipline) and holds both fds in `OwnedFd`.
  F2: `Session::drop`'s unbounded `kill(); wait()` hung forever on
  macOS when the child was killed mid-write to a full PTY master;
  every PTY harness now reaps through a bounded drain-first `reap`
  helper (drain the non-blocking master, `try_wait`, 5 s cap), applied
  to the seven `Drop` harnesses and the four probe/replay suites with
  loose kill sites. No production code touched; Linux behavior
  identical. Verification: `cargo test -p maze-chase-terminal` 165
  passed / 0 failed (the three formerly hanging suites finish in under
  3 s), `cargo fmt --all --check` clean, clippy unchanged from main's
  pre-existing engine warnings. The macOS arm re-runs this fix.
  Delegation ledger: one `general` verification subagent independently
  audited the uncommitted diff against the macOS findings (read-only,
  from the tree itself): it confirmed the geometry test opens the
  slave before the ioctl with both fds owned, enumerated all 16 reap
  sites across the 11 harnesses (each preceded by `kill()`), confirmed
  the two remaining `.wait()` sites are provably safe (the continuous
  reader thread in `tester_macos_e2e` and the Windows piped-stdio
  harness), proved the helper cannot block (O_NONBLOCK masters,
  bounded loop, no panicking path), found no weakened assertion or
  discarded exit status (the only status-consuming wait is untouched),
  and re-ran the full suite independently (165 passed / 0 failed; the
  three formerly hanging suites in 0.31 s / 1.07 s / 2.84 s). It also
  flagged a pre-existing, untouched race: three harnesses call
  `ptsname` without the `PTSNAME_LOCK` guard the others use (left
  as-is, out of this fix's scope). Skills: no registry skill matched
  this run's domains (no opencode configuration, agent, or plugin
  edits); none loaded, per `delegation.md` section 5.
  - the Builder
- 2026-10-19 (fixer, Phase 3 review round 1 on PR #693): applied all
  nine findings (F1-F9) plus the nits. F1: explicit per-layer `z` in
  `place_scaled_escape` (static 0; sunseeds, relish, bodies, eyes, pip
  1..5 in raster paint order) so no terminal's equal-z tie-break can
  hide sprites, backed by the collect.py honesty gate (a
  kitty-graphics pass with placements on the wire now requires a
  playing capture carrying exact sprite-palette pixels, recorded as
  `sprite_visibility`, with the per-capture census in every phase) and
  by regenerated Ghostty rows whose playing captures now carry 528-536
  sprite pixels (was 0). F2: the Kitty probe keeps its APC framing
  (`ReplyKind::Kitty::split` re-frames every reply), `complete`
  requires both replies, and a pipe-driven unit test proves the
  two-OK round trip yields `Some(KittySupport { placements: true })`.
  F3: placement-only deletes are `a=d,d=i,i=,p=`. F4: the tier-change
  edge arms a pending release that is prepended to the next frame
  actually written and survives failed writes; the round's own
  adversarial audit caught the first draft discarding the escapes
  through `out.clear()` before the write, the fix moved them into the
  composed buffer (now `compose_frame`, pinned by
  `leaving_kitty_prepends_the_release_to_the_next_frame`), and a
  real-binary pty run with a non-blocking stdout pipe reproduced the
  release trio landing in the same frame as the first Sixel DCS
  (three runs). F5: `tools/compat/probe-graphics.py` is committed as
  the probe experiment; it records Ghostty 1.3.1 answering both probe
  replies, and the docs now state that finding (the "does not answer"
  claim was false) and that the watchdog strikes only on failed frame
  writes. F6: all eight rows regenerated 2026-10-19 with the table
  rewritten in true binary units (kitty 170.0 KiB, Ghostty 187.2 KiB,
  sixel 3.66 MiB). F7: this entry plus the ledger below; the missing
  Builder Phase 3 entry and ledger are recorded as a process gap (the
  PR body's verification record is the surviving account). F8:
  `frame_key` hashes both settings copies, the rebind capture, and the
  keymap. F9: the Sixel fallback reports `cells-fallback`. Nits:
  atlas/kitty doc strings, the collect.py docstring, and the
  hostile-test `c,r` comments corrected. Delegation ledger: three
  verification subagents fanned out; the code auditor falsified the
  first F4 draft (dead cleanup, fixed) and returned F1-F3/F8/F9 PASS
  with file:line evidence; the number auditor re-derived 61 numeric
  claims from the committed JSONs, found one stale "7 of its 10" (now
  6 of 10) and flagged the RT-3 Phase 1 raster sizes (resolution note
  added); the collector-gate adversary ran 14 crafted scenarios, all
  meeting expectation (exact-palette match only, playing phases only,
  palette/RGB8/RGBA counted, grayscale zero, 16-bit rejected, gate
  scoped to kitty-graphics, census present in downgraded rows) and
  confirmed the probe script exits 2 without a tty. Primary context
  ran the pty downgrade proof, the workspace suite (53 targets green),
  the harness contract suite 13/13, `maze-chase-verify` 19/19, fmt,
  and clippy. Skills: no registry skill matched this run's domains;
  none loaded, per `delegation.md` section 5.
  - the Fixer
- 2026-10-19 (fixer, Phase 3 review round 2 on PR #693): applied
  F10-F11 and folded the non-blocking notes; no rebuttal. F10: the
  kitty `z` layers are now one band per warden (`z::body(i)` = 3 + 2i,
  `z::eyes(i)` = 4 + 2i, Pip 11) at all four placement call sites, so
  the terminal stacking sequence equals `raster::paint_wardens`
  (body_i, eyes_i, body_j, eyes_j) even when two sprite boxes overlap;
  the new `composed_frame_matches_full_raster_with_overlapping_wardens`
  case pins it (reverting to class-wide bands fails it, verified
  empirically). F11: `probe-graphics.py` parses its documented
  `[WINDOW_S] [OUT_PATH]` form (a non-float first argument is the out
  path; a non-positive window exits 3), the docstring usage and
  exit-status line are corrected, and two new harness contract tests
  pin the argument matrix (suite now 15/15). Folded notes: the stale
  static-resend comment and `force_all` repaint in `main.rs` (the
  explicit `z=0` already keeps the static layer beneath every sprite
  placement), the sixel per-transmit figure corrected to 26,292 B
  (3,838,628 / 146), and the PR body refreshed to the regenerated
  numbers and the retracted Ghostty probe claim. Delegation ledger:
  three verification subagents fanned out; the parity fuzzer compared
  6000 randomized configurations across five ppts, three themes, all
  directions/states, fright/flash/dying and fractional overlaps (5714
  with overlapping boxes) with zero mismatches, and proved sensitivity
  (646 of those diverge under the pre-change class-wide bands); the
  probe-contract adversary verified eight invocation scenarios
  including a real pty run and the old-parser failure mode (all PASS);
  the numeric auditor re-derived every body and matrix claim from the
  committed JSONs (all MATCH, including the newly committed 26,292 B
  figure). Primary context applied the edits and re-ran the workspace
  suite (53 targets green), `maze-chase-verify` 19/19 with golden
  `23c17f89734e`, fmt, and clippy (only the six pre-existing engine
  warnings). Skills: no registry skill matched this round; none
  loaded, per `delegation.md` section 5.
  - the Fixer
- 2026-10-19 (fixer, Phase 3 post-evaluation round on PR #693):
  applied E1-E6 plus the rebase; no rebuttal. E1: `ScreenId::Paused` is
  now its own render arm; on a fresh kitty frame it emits delete-all,
  frees the static and atlas image ids, invalidates the renderer, and
  paints only the text panel, so the opaque board can no longer cover
  the menu. The unit test pins the release prefix, zero transmits and
  placements, and the painted PAUSED text; collect.py rejects a
  kitty-graphics `pass` whose paused capture still carries sprite
  pixels (checkpoint-boundary media are accepted only when the paused
  capture has zero sprite pixels and is >=90% one color). E2: every
  Linux row was regenerated from the release binary built at
  `af1c1496`, and the matrix now names that head instead of the false
  z-round provenance. E3: the ack-spin experiment's corroboration table
  was replaced with the four committed rows that re-derive from their
  JSONs (clean exits, 21 kitty transmits, pause paints at 1,193,556 /
  1,393,272 / 4,491,893 bytes and 6,230,878 for truecolor); the old
  flood figures are marked historical and non-re-derivable. E4:
  collect.py computes the dominant-color share, records it per phase,
  and downgrades a kitty/sixel `pass` whose playing, resized, or refit
  capture is >=98% one color; the formerly blank sixel `resized-wide`
  checkpoint now re-derives as 51% one color with 208 sprite pixels.
  E5: both settings and score writers refuse a FIFO with InvalidInput
  before opening (tests create real FIFOs and assert the refusal leaves
  them intact); the crossterm private-CSI stall is documented in
  terminal.md and terminal-compat.md and pinned by a PTY test that
  proves Esc is dead until the completion byte `u` and works after it.
  E6: the kitty_present comment no longer claims Ghostty never answers
  the probe; it states the environment fast path. Rebase: main's new
  centered image footprint (`layout.image`), its live-golden contract,
  and its macOS resize expectations were reconciled with the placement
  pipeline; the three tester suites pass. Evidence: all eight Linux
  rows regenerated (kitty 21 / 156.1 KiB, Ghostty 21 / 160.1 KiB,
  sixel 140 / 3.39 MiB, light xterm 7 of 10 white captures); workspace
  suite 56 targets green, harness contract suite 20/20, `cargo fmt
  --all --check` clean, clippy only the pre-existing engine/design
  warnings, `maze-chase-verify` 19/19 with the `23c17f89734e` golden.
  Delegation ledger: two read-only auditors fanned out; the code
  auditor returned E1/E5/E6 PASS, flagged two missing contract-test
  branches (the paused-media menu acceptance and the sixel resized
  gate) which were added, and flagged the `refit` checkpoint outside
  the blank-board filter (fixed); the numeric auditor re-derived every
  row, session bullet, light-capture count, and ack-spin table entry
  from the JSONs (all MATCH) and flagged the historical 1642 / 348.6
  MiB figures as non-derivable, now qualified as historical in both
  docs. Skills: no registry skill matched this round; none loaded, per
  `delegation.md` section 5.
  - the Fixer
- 2026-10-19 (fixer, Phase 3 review nit on PR #693): refreshed the
  Phase 3 summary's kitty stacking description from the superseded
  class-wide 1..5 order to the live per-warden layout (static 0;
  sunseeds 1; relish 2; per-warden body and eyes bands 3..10 in raster
  paint order; Pip 11). Documentation only; code, tests, and evidence
  are unchanged from the E1-E6 round.
  - the Fixer
- 2026-10-19 (fixer, Phase 3 review round 5 on PR #693): applied
  F12-F14 and the two non-blocking notes; no rebuttal. F12: the
  kitty-graphics paused gate in `collect.py` is now capture-first: a
  paused phase with no new transmits or placements is still inspected,
  and a `pass` is downgraded when the paused capture carries
  sprite-census pixels, has no decodable capture, or is not in the
  `[90%, 100%)` dominant-share band (a 100% flat capture is not proof
  of a menu). The checkpoint-boundary media note remains for accepted
  captures. Contract tests pin the three false negatives, the accepted
  boundary, and the flat-capture case. F13: added the PTY integration
  test `kitty_pause_releases_the_board_and_resume_replaces_it`, which
  waits for a real static placement, pauses, asserts the release trio
  leads the menu with no kitty transmit or placement after it, and
  resumes to assert the board transmit and placement return. F14:
  the Phase 3 checklist now carries the regenerated figures (21
  transmits / 156.1-160.1 KiB, 7 of 10 light captures, 140-141 sixel
  transmits / 3.39-3.41 MiB). Non-blocking: `dominant_share` now
  classifies grayscale at bit depths 1/2/4/8 and gray+alpha (color
  type 4), and fails closed for any decodable shape it cannot classify,
  so a blank capture cannot bypass the E4 gate; `scoreboard.md`
  distinguishes the CI terminal tests from the real-terminal FPS
  measurements. Verification: workspace suite all targets green,
  harness contract suite 26/26, fmt clean, clippy clean for the
  terminal targets (the six pre-existing engine warnings only).
  Delegation ledger: two read-only auditors fanned out. The gate
  auditor executed 19 crafted collector scenarios (all expectations
  met) and re-derived all committed kitty-graphics paused phases
  against the new rule; the PTY adversary proved the pause-release and
  resume-rebuild sensitivities by mutation in a /tmp copy and ran the
  new test 5/5. Primary context applied the edits, ran the full
  workspace suite, the contract suite, fmt, and clippy, and re-ran the
  full kitty PTY suite (7/7).
  - the Fixer
- 2026-10-19 (fixer, Phase 3 review round 6 on PR #693): applied
  F15-F17 and the review nits; no rebuttal. F15: the kitty PTY suite's
  unbounded `stop()` (`kill(); wait()`) is replaced by a bounded,
  drain-first `reap(child, master, out)` matching the issue #656 F2
  contract, at all six call sites; the pipe-pressure test drains into a
  separate buffer so its assertion stream stays clean. F16: the
  live-goldens soak now waits for five painted-frame headers
  (`ESC[?2026h`, one per composed frame) before five placements, so a
  single frame's five placements can no longer satisfy the sustained-run
  wait. F17: the findings ledger's current-state figures re-derive from
  the committed JSONs (kitty 21 transmits / 156.1 KiB and 5.4 KiB mean,
  Ghostty 21 / 160.1 KiB, sixel 140-141 / 3.39-3.41 MiB, rasters
  420x465 and 448x496, 7 of 10 light captures). Nits: the Phase 3
  checklist separates the cell-tier xterm dark row from the Sixel rows;
  the compatibility matrix names the no-decodable-capture refusal;
  `dominant_share` records a downward-truncated four-decimal share so
  rounding cannot cross the 0.90 or 0.98 gates, with boundary tests at
  0.90, 0.8999, and the 0.899975 rounding shape; the paused phase match
  is case-insensitive; the pause arm's redundant `kitty.invalidate()` is
  removed (the screen-change path already invalidates); the resume
  assertion now requires the atlas transmit and a fresh placement, not
  only the board. Verification: workspace suite 56 targets / 481 tests
  passed, `maze-chase-verify` 19/19 with golden `23c17f89734e`, harness
  contract 29/29, fmt clean, clippy adds nothing outside the six
  pre-existing engine warnings. Delegation ledger: two read-only
  auditors fanned out. The PTY auditor re-ran the kitty, goldens, and
  reap-contract suites (13 tests, repeated 5x for the pause/soak) and
  mapped every teardown; the evidence auditor re-derived every changed
  figure and the collector boundary matrix from the committed JSONs and
  the code. Primary context applied the edits, confirmed full history
  and a main-based branch, and ran the full suite, verify, harness
  contract, fmt, and clippy. No registry skill matched this round; none
  loaded.
  - the Fixer
- 2026-10-19 (fixer, Phase 3 review round 7 on PR #693): applied
  F17-residual and F18-F21 plus the review nits; no rebuttal. F18: a
  failed frame write now forces a full repaint (`fresh = true` plus
  `kitty.invalidate()` through `note_failed_frame_write`), because the
  renderer had already committed its diff state while composing a
  frame the terminal never received; a unit test pins the release trio
  and both re-transmits on the recovered frame. F19: `white_share`
  classifies packed 1/2/4-bit grayscale and gray+alpha, so a blank
  capture in those shapes can no longer report 0.0 white and bypass
  the 0.98 light-background gate; contract tests cover all four depths
  for both color types. F20: the pause arm also frees the whole-frame
  fallback image (id 1) when the probe proved graphics without
  placements, pinned by a unit test. F21: the compatibility matrix
  scopes the sprite-census refusal to rows with placements on the
  wire. F17 residual: the findings ledger's kitty/Ghostty method note
  now records the pre-fix partial state and the regenerated clean-exit
  bundles instead of claiming the current rows are partial. Nits: the
  `kitty_present` comment names failed frame writes as the only
  watchdog strike source, and the roadmap's Next steps point Phase 4
  at the merged tip. Verification: workspace suite all targets green,
  harness contract 31/31, fmt clean, clippy adds nothing outside the
  six pre-existing engine warnings.
  - the Fixer
