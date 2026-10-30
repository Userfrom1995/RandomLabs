# Progress - Maze-Chase Overhaul: Real-Terminal Polish, Releases, Identity

- **Issue:** #582 (parent vision, reopened 2026-10-18 by the owner directive; the
  migration epic is complete and archived in
  `progress/582-maze-chase-rust-migration.md`)
- **Branch:** opencode/issue582-20261018121223 (this roadmap PR); each phase runs
  on its own `opencode/issue582-overhaul-phase-<n>-<slug>` branch
- **Status:** in-progress
- **Updated:** 2026-10-28
- **Active Phase:** Final Phase: Full-Product Verification and Release
  Sign-Off (Linux verification, the deployed site, and the Phase 7
  follow-ups are complete; the release-claims/Windows-E2E ledger row
  (#683) remains open along with the native macOS and Windows rows and
  the stable release cut, and this increment is ready for review)
- **Blueprint:** `ideas/2026-10-18-maze-chase-overhaul.md`
- **Findings ledger:** `progress/582-maze-chase-overhaul-findings.md` (created in
  Phase 1; every reassessment gap lives here until resolved or documented)

## Overhaul Roadmap

- Phase 1: Product Reassessment and Real-Terminal Truth: [x] real-terminal driver harness (`maze-chase/tools/compat/`: `run-linux.sh`, `run-macos.sh`, `run-windows.ps1`, `drive.sh`, `collect.py`, `README.md`), [x] reproduce the Owner's Ghostty and Kitty findings on current main with recorded evidence (kitty reply-loop flood plus input delayed past the session, Ghostty mis-routing despite its kitty-graphics support; eight executed Linux rows in `maze-chase/tools/compat/evidence/`), [x] critical reassessment of engine, layers, and docs claims (four parallel sweeps; Section B of the ledger), [x] findings ledger with every gap (`progress/582-maze-chase-overhaul-findings.md`), [x] honest compatibility matrix scaffold `maze-chase/docs/terminal-compat.md` (executed rows plus named executors for host-pending rows), [ ] new sub-issues routed through the Maintainer (proposed set in ledger Section C; filing is the Maintainer's next step, not done in this PR) (PR 1 target, Refs #582, Refs #655, Refs #661)
- Phase 2: Dynamic Terminal Layout and Full-Window Composition: [x] geometry model with cell pixel size (`crates/terminal/src/geometry.rs`; TIOCGWINSZ pixel fields on Unix, console font on Windows, nominal 8x16 fallback), [x] pure layout solver (2..8 x 1..4 scale grid at the 2x1 compact floor with coverage-first selection; side panel, HUD band, hint-only by fit; exact 62x35 card; golden plans 200x60 -> 7x1 and 62x80 -> 2x2), [x] bounded centered image rendering at the real pixel geometry (raster fit to the board's pixel box; image footprint mapped through the window pixels, so Kitty never stretches and the Sixel raster stays inside the board's pixel box whenever the box can host the 6-ppt legibility floor, and absurdly tiny pixel windows keep the documented floor and may overflow; 8-ppt nominal fallback), [x] continuous cell-tier scales (`unicode::fit_width`/`center_rows` at any scale), [x] resize contract with same-frame repaint and stale-placement kill (`ESC[2J` plus Kitty delete-all in the new frame; pinned by `tests/plan_contract.rs`), [x] tier-aware too-small card (reads `layout.min_cols/min_rows`; exact 62x35 boundary pinned), [ ] real-emulator resize proof on Linux and macOS (the PTY proof landed with this PR; the real rows are per-OS tester work, no emulator exists on the build machine) (PR 2 target, Refs #582, Refs #656)
- Phase 3: Terminal Render Pipeline and Compatibility Proof: [x] bounded live Kitty probe with byte replay plus the Sixel DA1 probe (the probe requires both the transmit and placement replies before it reads a verdict; Ghostty 1.3.1 answers the probe when one is sent, and its rows select the graphics path from `TERM_PROGRAM=ghostty`/`TERM=xterm-ghostty` without probing), [x] atlas plus placement composition with full-frame fallback (static layer and sprite atlas once per change, stable-id placement diffs, single-placement `d=i` deletes, explicit `z` stacking layers, DEFLATE PNG), [x] dirty-change detection and wall-clock pacing with backpressure (visual-change key, per-tier rates, 8 MiB/s byte ceiling, 1 Hz idle keepalive), [x] Sixel path hardening (64-color cap, 2 MiB frame ceiling with smaller-palette retry and an honest `cells-fallback` trace mode), [x] capability-aware probe plus write-path watchdog (`OK`/`ENOENT` replies decide kitty support; `q=2` keeps steady transmits silent, and the watchdog drops a tier after 3 failed frame writes with the reason recorded), [x] `MAZE_CHASE_TRACE` JSONL evidence mode (plan, frame mode/placements/static/atlas/encode time, skips, probe results), [x] kitty and ghostty rows signed on Linux plus conventional terminals (kitty and Ghostty both `kitty-graphics` pass at 21 transmits / 156.1-160.1 KiB per session in the Phase 3 round (pre-Pondwake; the Phase 4 rows are 169.9-175.4 KiB) with sprite visibility proven by capture census; xterm auto and xterm dark both pass on cells, the light row at 6.2% white at worst and 1.7% while playing after the theme-canvas fix; the VT340 sixel rows pass at 140-141 transmits / 3.39-3.41 MiB in the Phase 3 round (Phase 4: 137-138 / 4.25-4.31 MiB), and every row records its generating build commit plus binary SHA-256 in its `build` block), [ ] macOS matrix rows signed by the macOS Tester (PR 3 target, Refs #582, Refs #655)
- Phase 4: Visual Identity Redesign: [x] Design Council direction consumed (dispatched by the Maintainer before this phase), [x] resolution-aware character and environment art, [x] effects and animation system, [x] refreshed themes with accessibility tests green, [x] all three layers integrated with real captures (PR 4 target, Refs #582, Closes #658)
- Phase 5: Sound Design Overhaul: [x] new musical score with one BPM source (`TEMPO = 108`, five multi-track tunes with swung eighths and per-note track lanes), [x] soft short layered effect bank across seven voice families (40 ms crumb pluck with variation, rising warden ladder, sparkling relish triad, spare-wick bell), [x] mix architecture with 120 ms fades and safe defaults (music 60%, SFX 80%, master 80%, peak-normalized buses), [x] terminal chime policy default-off with a persistent Settings row and visual twins independent of mute, [x] per-layer settings round-trip on Linux (desktop synth PCM plus null sink, terminal BEL plus ticker, browser chip plus persisted sliders) with native macOS/Windows speaker review tracked for the Final Phase (PR 5 target, Refs #582, Refs #659)
- Phase 6: Release Engineering and Multi-Platform Distribution: [x] version single source plus tag parity gate (`[workspace.package]` 0.1.0, `packaging/release/check-tag.sh` fail-closed on a tag/version mismatch), [x] Linux deb and rpm plus tarballs for both layers (rebuilt twice byte-identically and smoke-tested on this container), [x] Windows installer plus zip (built and smoke-tested by the native Windows release job in run 40161835683), [x] macOS app plus dmg plus tarball (built and smoke-tested by the native macOS release job in run 40161835683), [x] install/launch/uninstall smoke scripts (`release/smoke-linux.sh` executed; macOS/Windows harnesses authored for their native arms), [x] `maze-chase-release.yml` pipeline installed via the Lab Engineer (source staged at `packaging/release/maze-chase-release.yml`, merged as #758), [x] release candidate artifacts on the official Releases page (`maze-chase-v0.1.0-rc.1` prerelease, published 2026-10-25), [x] install/upgrade/uninstall docs (`docs/release.md` covers both layers on all three OSes, plus upgrade and settings clearing; the release candidate artifacts are now published) (PR 6 target, Refs #582, Refs #657)
- Phase 7: Game-First Web Experience and Subpages: [x] `maze-chase/index.html` boots directly into the game with no clutter (`play.html` redirects with query/hash intact), [x] downloads, install, docs, compatibility, releases subpages with one shared shell and navigation, [x] rendered docs on Pages with a source-freshness marker plus internal link and fragment checks, [x] deployed-URL browser E2E including mobile (`site-e2e.js` ALL GREEN at 157 assertions against the PR #759 Pages preview at 1280x900 and 390x844; PR 7 target, Refs #582, Closes #660)
- Final Phase: Full-Product Verification and Release Sign-Off: [x] Linux terminal matrix re-signed on the released artifacts (all eight rows pass on the rc.1 binary with `sources_dirty: false`), [ ] native macOS and Windows terminal rows re-signed, [x] Linux install/upgrade/uninstall from the released deb, rpm, and tarball artifacts (settings preserved; Fedora 41 rpm flow included), [ ] native macOS and Windows install/upgrade/uninstall from the released artifacts, [x] deployed Pages E2E for the game and every subpage (661 site assertions plus 279 browser assertions, zero console errors), [x] Linux desktop visual probe and release-binary audio capture (title music plus effects; 1100x760 P6 frame under Xvfb), [ ] real-speaker review on native hosts, [x] Phase 7 follow-ups fixed with tests (docs href escaping, release-copy claim paraphrases, mobile nav pill visibility, too-small key guard), [ ] reassessment ledger fully resolved or documented (open: B.13/C.13 tracked by #683), [ ] stable `maze-chase-v1.0.0` release cut, [x] hub, README, and docs unified for this increment (Refs #582), [ ] final release close-out (Closes #655, Closes #661, Closes #582)

## Current step

Phase 7 is merged on `main` as `c8ac7d02` (PR #759, #660 closed); its
four non-blocking follow-ups are the first work of this Final Phase.
This run verifies the published `maze-chase-v0.1.0-rc.1` artifacts
(release run 40161835683, tag commit `11a0037b`) instead of a fresh
local build: the terminal matrix Linux rows are re-signed by driving the
shipped `maze-chase-terminal` tarball binary in real Kitty, Ghostty, and
xterm sessions; the Linux deb, rpm, and tarball install, reinstall, and
uninstall flows run from the published files; the released desktop
binary is probed on a real X display; and the deployed production Pages
site is crawled for the game and every subpage. Every row records the
artifact hash it executed, so no claim rests on a compile or a green CI
run. The macOS and Windows rows still need their native hosts, and the
stable `maze-chase-v1.0.0` tag stays gated on those rows.

The Linux evidence is complete: eight terminal rows re-signed on the
published binary, both deb and rpm install/reinstall/remove flows plus
the tarball scripts, 1100x760 desktop probes on Debian and Fedora, a
release-binary audio capture through a PulseAudio null sink, and the
deployed site E2E at 661 site plus 279 browser assertions. The four
Phase 7 follow-ups are fixed on this branch with tests, and the
compatibility matrix, release guide, scoreboard, and findings ledger
are reconciled to the rc.1 evidence.

## Next steps

- Reviewer and Tester: audit the released-artifact evidence in
  `tools/compat/evidence/`, the Linux package lifecycle log, the deployed
  site E2E results, the four follow-up fixes, and every updated claim.
- Maintainer: after this Final Phase increment merges, dispatch the macOS
  and Windows per-OS testers against the released artifacts (terminal
  matrix re-sign, desktop install/launch/uninstall, speaker review), then
  cut the stable release from the verified head.
- Per-OS testers: sign the macOS and Windows terminal rows and the
  packaged install, upgrade, and uninstall rows from the published
  artifacts; record real-speaker audio evaluation.
- The stable `maze-chase-v1.0.0` release is cut only after those rows are
  signed; #655, #661, #683, and #582 close only on that verified release.

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
  frame the terminal never received. A unit test pins the recovered
  frame's shape, and a PTY test fills a stdout pipe once, waits for the
  new trace `write-error` record, drains before the watchdog's third
  strike, and asserts the release trio plus both image re-transmits on
  the frame that actually lands while the tier stays Kitty. F19:
  `white_share` classifies packed 1/2/4-bit grayscale and gray+alpha,
  so a blank capture in those shapes can no longer report 0.0 white and
  bypass the 0.98 light-background gate; contract tests cover all four
  depths for both color types, including gray-must-be-all-ones cases
  that pin sample order and MSB-first packing. F20: the pause arm also frees the whole-frame
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
- 2026-10-19 (fixer, Phase 3 review round 7 queued verification on PR
  #693): re-verified F17-residual and F18-F21 on `3b439bf8`; all applied.
  Closed the last F20 gap: the sibling full-screen menu arm now also frees
  the whole-frame fallback image id 1 when the probe proved graphics
  without placements, so every full-screen surface releases it, pinned by
  a unit test. No evidence changed (the committed rows exercise the paused
  surface, not the other menus). Verification: workspace suite all targets
  green, harness contract 31/31, verifier 19/19 with golden
  `23c17f89734e`, fmt clean, clippy adds nothing outside the six
  pre-existing engine warnings.
  - the Fixer
- 2026-10-19 (fixer, Phase 3 tester fix round on PR #693): the
  Tester's hostile-startup finding (durable suite `tester_hostile_startup.rs`
  pushed at `f9d3089f`): a FIFO at `settings.txt` or `scores.txt` hung
  the shipped binary before its first frame, because the E5 repair
  guarded only the two writers while both readers still called
  `std::fs::read_to_string` (opening a FIFO read-only blocks in
  `open(2)`). Both readers now refuse a FIFO before opening on unix:
  `persist::load_from` returns defaults plus a notice and
  `scores::load_from` an empty table with one skipped entry, leaving
  the FIFO untouched; unit tests mirror the writer guards, and the
  committed PTY suite passes 3/3 (control plus both FIFO cases).
  `docs/terminal.md` now states the read/write refusal. Verification:
  workspace suite 57 groups / 490 passed / 0 failed, `maze-chase-verify`
  19/19 with golden `23c17f89734e`, harness contract 31/31, fmt clean,
  clippy adds nothing outside the six pre-existing engine warnings.
  - the Fixer
- 2026-10-19 (fixer, Phase 3 evidence-hardening round on PR #693): one
  comprehensive evidence pass after the Quality Council's 9.1/10 (void
  on the moved head) and the Maintainer's routed findings; no rebuttal.
  E1: every row now records its generating build
  (`build.commit`, `build.binary_sha256`, `build.sources_dirty`, wired
  in `run-linux.sh`/`drive.sh` and emitted by `collect.py` with a
  `recorded: false` fallback), and all eight Linux rows were regenerated
  on `97e8865d` with release binary SHA-256 `b5a38ee7...`, so the matrix
  no longer names the unreachable `af1c1496` and no bundle predates the
  later render-path commits. E2: a bitmap-tier (kitty-graphics/sixel)
  `pass` now requires at least one decodable playing capture, pinned by
  contract tests. E3: the forced-tier rows set `pause_select: 1`
  (`drive.sh --pause-select 1`) to move the pause cursor to "Quit to
  title" before the capture, so no two rows of one emulator commit a
  byte-identical paused image; the extra key is in `events.log` and the
  row. E4: the Ghostty probe claim now cites committed raw reply
  captures under `tools/compat/probe-captures/` with exact commands and
  hashes (kitty and Ghostty reply byte-identically because both answer
  the same protocol frames). E5: the misattached `compose_frame` doc
  comment was split from `render_frame`, and the remaining bare
  "Phase 3" counters in terminal source comments became capability
  wording. Fresh figures: kitty 98 frames / 20.6 fps / 21 transmits /
  156.1 KiB; Ghostty 21.6-22.0 fps / 160.1 KiB with 402-412 sprite
  pixels; sixel 141 transmits / 3.41 MiB; light xterm still 7 of 10
  white captures; no paused-capture hashes repeat across rows.
  Verification: workspace suite all green, harness contract 37/37,
  `maze-chase-verify` 19/19 with golden `23c17f89734e`, fmt clean,
  clippy adds nothing outside the six pre-existing engine warnings.
  Delegation ledger: two read-only auditors fanned out. The numeric
  auditor re-derived every doc-quoted figure from the regenerated JSONs
  (83 claims) and found one mismatch (the Ghostty forced-kitty playing
  duration was written 4.76 s against a derived 4.78 s), fixed; the
  adversarial auditor ran the suite (37/37), proved both new gates by
  mutation in `/tmp` copies (deleting the playing gate fails
  `test_bitmap_pass_without_a_playing_capture_is_downgraded`; faking the
  build fallback fails `test_rows_without_build_identity_say_so`),
  proved all eight paused hashes distinct, and confirmed the
  pause-cursor events in the three forced rows' `events.log`. Primary
  context regenerated all eight rows on the real emulators, ran the
  full workspace suite, and committed the probe captures.
  - the Fixer
- 2026-10-19 (fixer, Phase 3 review round 10 on PR #693): applied F22,
  F23, and F24 on `e04d161a`; no rebuttal. F22 (blocking): the collector
  now fails closed when a proposed `pass` transcript never names its
  video tier (`tier_observed: null`), because every bitmap honesty gate
  is keyed on the observed tier and a missing observation would skip all
  of them; a kitty, sixel, or auto run with a decodable playing capture
  but no `VIDEO`/`video tier:` line records `partial` with the reason,
  and the positive twin (tier line present) still passes. F23: an empty
  or partial `build` block (missing, blank, or non-string `commit` or
  `binary_sha256`) now also records `build.recorded: false` with the
  reason, matching the compat README promise; the build-identity test
  covers the absent, empty, partial, and blank shapes. F24: the
  playing-phase gates (blank board, playing capture, sprite census)
  match phase names case-insensitively, pinned by a `Playing`-cased
  checkpoint test. The harness README and `docs/terminal-compat.md` now
  document the tier-observation refusal. Verification: harness contract
  suite 40/40 (three new tests); no Rust or committed evidence changed,
  so the workspace suite, verifier, and bundle gates stand from the
  evidence-hardening round. Delegation ledger (round 10): the round was
  a single-file collector edit with its contract tests and docs, so no
  subagents were dispatched; the primary re-ran the contract suite,
  py_compile, and the em-dash scan itself and exercised the three gate
  shapes with synthetic run directories. No registry skill matched the
  round; none loaded.
  - the Fixer
- 2026-10-19 (fixer, Phase 3 review round 11 on PR #693): applied F25,
  F26, and F27 on `4893c52f`; no rebuttal. F25 (major): the
  tier-observation gate is scoped to transcript-bearing platforms, so
  Windows rows (which carry no pty transcript by design) keep the
  documented process-plus-capture grading instead of being downgraded on
  every pass; the compat README and both `docs/terminal-compat.md`
  occurrences state the Linux/macOS scope, and a Windows-shaped contract
  test pins the pass with no tier-observation note. F26: the blank-board
  gate normalizes the phase name once, so `Refit` and `Resized-Wide`
  captures can no longer skip it; contract tests cover both casings.
  F27: the round-10 and round-11 delegation ledgers are recorded. Folded
  note: a whitespace-only build identity now records `recorded: false`,
  pinned by the extended build-shape test. Verification: harness contract
  suite 43/43; no Rust or committed evidence changed, so the round-10
  workspace suite, verifier, and bundle gates stand. Delegation ledger
  (round 11): two read-only `general` subagents fanned out. The gate
  auditor re-ran the harness suite (43/43), reproduced the Windows pass
  and Linux downgrade shapes plus the cased `Refit` and `Resized-Wide`
  downgrades, and A/B-replayed the pre-fix collector to prove the
  sensitivity; the docs auditor matched every changed statement to the
  code and flagged the paused-gate sentence, now scoped to
  kitty-graphics. Primary context applied the edits, ran the suite and
  py_compile, and verified the diff scope (five files). No registry
  skill matched the round; none loaded.
  - the Fixer
- 2026-10-19 (fixer, Quality Council round on PR #693): applied the
  council's five findings (QC-1 blocking, QC-2 to QC-5) on top of
  `4bef9697`; no rebuttal. QC-1: every painted run now carries the
  theme's own background (the cell tiers no longer suppress a
  background escape equal to the theme bg), so the legacy-cells path
  renders the Ember Warren canvas on terminals with a light default;
  the light xterm row re-derives at 1.7% white in its playing capture
  (6.2% at worst) and now passes, and a Unicode regression test pins
  the emitted `48;2;r;g;b` and ANSI-40 escapes. QC-2: the terminal
  graph states the truth (the title screen always names the tier, the
  wide side panel carries a `VIDEO` line, the narrow top bar and the
  menus do not), and the design ladder rule says the painter carries
  the theme background explicitly. QC-3: the sixel budget in
  `design.md` and `design-tokens.json` is restated from the committed
  VT340 rows (20.9 KiB mean and 25.3 KiB peak per playing transmit;
  the forced row ran 88 transmits in 4.67 s at 18.8 fps, 394 KiB/s;
  31.3 KiB mean per transmit through the resize phases) with the
  shipped backpressure contract (24 Hz target, 1.5x smoothed write
  cost, doubled above an 8 MiB/s flood, 200 ms cap, 2 MiB per-frame
  encoder budget with smaller-palette retry then a cell fallback),
  replacing the stale 13.7 KiB / 12 Hz / 512 KiB/s / 83.3 ms
  estimates that no code implemented. QC-4: `collect.py` now requires
  exactly one paused checkpoint for a kitty-graphics `pass` (zero or
  two or more downgrades to partial with the count in the note) and
  lowers the blank-board bound from 98% to 90% one color; contract
  tests pin both gate shapes and the suite is 47/47. QC-5: the help
  scroll is clamped to the body length minus the viewport
  (`help_scroll_max`), both at render and in the app state on every
  Help key in the catch-all screen arm plus every resize, so Down can
  no longer push the panel past its last line; unit tests cover
  saturation, immediate Up response, and max-equals-render equality.
  Evidence: all eight Linux rows were re-run at the reachable head
  `8f16a3f6` (binary SHA-256
  `9ebf8f4c32d82b62278f5d5920b968b426d6c304b85a9e64e12fd68a46a2d6c4`,
  sources clean) and every row passes, with no duplicate paused
  captures; the compatibility matrix, terminal graph, design ladder,
  sixel budget, tokens, and Ack spin table all re-derive from those
  bundles (a later formatting-only commit, `db0c788e`, collapses one
  long call and changes no behavior, so the bundles keep naming the
  exact build they ran on). Gates on the final tree: 57 suites, 494 passed /
  0 failed; `maze-chase-verify` 19/19 with golden `23c17f89734e`;
  harness contract 47/47; fmt clean; zero clippy warnings in every
  file touched by this round. Delegation ledger (round 12): three
  read-only `general` subagents fanned out. The numeric auditor
  re-derived every quoted figure from the eight bundles (zero
  mismatches across the build identity, per-row notes, budget
  paragraphs, and token fields; all 80 screenshot hashes match and
  the 8 paused captures are pairwise distinct). The adversarial
  verifier ran all five gates and falsified all three fixes
  behaviorally (54 of 54 QC-1 escape checks across the themes with no
  counterexample after a targeted scratch harness; QC-5
  max-equals-render equality plus the saturation tests; real
  collector runs against synthetic directories downgrading the
  0-paused, 2-paused, and 0.95-dominant shapes while 0.8999 passes),
  and it surfaced the one fmt failure, which landed as `db0c788e`.
  The forensic auditor checked bundle identity, dispositions, pause
  uniqueness, light/dark capture equivalence (content pixel-equal
  after cropping the 2-pixel window frame), diff scope, and the
  em-dash scan; its two wording flags (the help video-line sentence
  and the plural sixel-row attribution) were corrected in the docs
  before commit. No registry skill matched the round; none loaded.
  - the Fixer
- 2026-10-19 (fixer, Phase 3 review round 13 on PR #693): applied F28
  and F29 on `8f16a3f6`; no rebuttal. F28 (blocking): the bundles named
  a build commit that the rebase orphaned, so all eight Linux rows were
  re-run at the current reachable head; every bundle now records
  `build.commit` `8f16a3f6a277a7247f11c51c977eb96beaebf33`, binary
  SHA-256 `9ebf8f4c32d82b62278f5d5920b968b426d6c304b85a9e64e12fd68a46a2d6c4`,
  and clean sources. Every quoted figure was re-derived from the new
  bundles and refreshed wherever it moved (kitty 98 frames / 4.77 s /
  20.6 fps; Ghostty 21.8-22.0 fps at a 6.0 KiB mean frame and 406-412
  sprite pixels; sixel 140-141 transmits / 3.39-3.41 MiB, the forced
  row at 88 transmits / 4.67 s / 18.8 fps / 394 KiB/s; transcripts
  8.13, 1.49, 1.49, 4.60, 4.64, and 4.63 MiB) in the compatibility
  matrix, terminal graph, design ladder, sixel budget, tokens, findings
  ledger, and attempt log. The Ack spin corroboration table was
  re-derived from the committed `surfaces` counters and transcripts
  (the QC round had regenerated the bundles without it), and the
  unreachable `d7a410cf` references now name its reachable equivalent
  `db0c788e` (formatting only). F29: the two stale blank-board comments
  now quote the current bitmap-tier playing-family maximum, 0.6427,
  instead of the previous-generation Ghostty resize share 0.7113.
  Verification: harness contract suite 47/47 (including the committed
  bundle hash and build-identity gates); `py_compile` clean; no Rust
  changed, so the workspace suite, verifier, and fmt/clippy gates
  stand. Delegation ledger (round 13): one read-only `general`
  subagent fanned out as the independent numeric auditor; it
  re-derived every edited figure from the eight new bundles, computed
  the 0.6427 playing-family maximum, and confirmed the build identity,
  flagging only figures inside dated earlier-round log entries, which
  remain as historical records. Primary context applied the edits and
  re-derived every figure with a script (all match). No registry skill
  matched the round; none loaded.
  - the Fixer
- 2026-10-19 (fixer, Phase 3 post-QC review round 14 on PR #693): applied
  F30-F34 on `82c707fd`; no rebuttal. F30: the Ack-spin corroboration
  table now carries six data columns per row, so the protocol-traffic
  column is no longer empty; the summary states that the truecolor row
  reaches its pause surface at 7.91 MiB (binary units, not the suggested
  8.30), sends no graphics traffic, and that only the kitty-graphics
  rows send 21 transmits. F31: the Sixel budget sentence distinguishes
  the 20.9 KiB mean payload per playing transmit from the 25.3 KiB peak
  synchronized playing frame (25.2 KiB mean), and the token
  `per_transmit_playing_peak_kib` became `per_playing_frame_peak_kib`
  (25.3) with a matching `per_playing_frame_mean_kib` (25.2). F32: the
  compatibility matrix and harness README now say a forced-tier rerun
  records `pause_select: 1`, not the second executed row of an emulator.
  F33: the left-Kitty release also frees the whole-frame fallback image
  id 1 when the probe proved no placements, pinned by a new unit test
  that also asserts the atlas path never frees it. F34: the provenance
  comment and the README/matrix wording now state that `build.commit`
  is the checkout when the row ran and the binary SHA-256 is
  authoritative under `--skip-build`. A residual pre-fix "hundreds of
  megabytes behind" sentence in the Ack-spin file was corrected to the
  current committed rows. Verification: workspace 57 test groups / 495
  passed / 0 failed; `maze-chase-verify` 19/19 with golden
  `23c17f89734e`; harness contract 47/47; fmt clean; clippy reports
  only the pre-existing engine and design-token-test warnings.
  Delegation ledger (round 14): two read-only `general` subagents fanned
  out. The evidence auditor re-derived every F30/F31 number from the
  committed bundles (all match, including the 7.91 MiB binary-unit
  correction), confirmed the F32 `pause_select` row order, the F34
  wording consistency, and flagged the stale Ack-spin sentence, now
  fixed. The code auditor confirmed F33's guard, predicate, and ordering
  with file:line evidence, ran the targeted bin tests (15/15), and
  proved the new test fails when the free is removed in a /tmp copy.
  Primary context applied the edits, corrected the suggested 8.30 MiB
  to 7.91 MiB, and ran the full workspace suite, verifier, harness
  contract, fmt, and clippy. No registry skill matched the round; none
  loaded.
  - the Fixer
- 2026-10-20 (builder, Phase 4 on `opencode/issue582-20261019234242`):
  implemented the full Pondwake visual system from the binding design:
  Rill 11x11/21x21 with dome eyes and facing set, four hunter
  silhouettes (heron S-neck, pike dorsal ridge, snake head loop,
  dragonfly crossbar), fright masks with a separate eye overlay, 3x3
  crumb beads, 7x7 sunseeds with the 400 ms halo, golden lily, hop,
  gulp, death-sink, pickup burst, fright morph, level-clear sweep, turn
  spark, and the three Pondwake palettes with legacy-id migration. The
  terminal raster and atlas, desktop renderer, and web canvas draw the
  same assets in the same stack order; accessibility and token mirror
  gates are green and the golden replay digest is unchanged.
  Regenerated all eight Linux compatibility rows at code commit
  `90cb9b87` (binary `e5c9a284...`, clean sources), the desktop title
  PPM, and the browser gameplay PNG; `browser-e2e.js` ALL GREEN. Gates:
  workspace 498/498 across 57 targets, harness contract 47/47, verify
  19/19 (`23c17f89734e`), fmt clean, clippy only the pre-existing engine
  lints. Delegation ledger: the phase was implemented in the primary
  context across assets, renderers, config, docs, and captures; no
  registry skill matched and no subagent was dispatched for the initial
  integration pass (the review fix round's ledger is in Current step).
- 2026-10-20 (builder, Phase 4 review fix round at `14b939d9`): closed
  the Reviewer's blocking findings and three delegated audits. Added the
  reachable 21 ppt rung with per-rung Pip scale, restored 11x11 sprite
  scaling at 16-20 ppt, made the cell tier paint cues over Pip,
  suppressed the new-level start floater, stopped the hop during death
  and clearing, freed the Kitty whole-frame image, and clamped score
  floaters. Re-ran 514/514 across 57 targets, harness 47/47, verify
  19/19 (`23c17f89734e`), fmt/clippy, rebuilt the wasm, recaptured the
  browser frame, and re-executed six Linux terminal rows at the new
  commit. Three subagents (docs audit, renderer review, evidence
  recomputation) were launched and their findings verified in the
  primary context; the two Ghostty rows remain pre-fix and are tracked
  for the final per-OS rerun.
  - the Builder
- 2026-10-20 (fixer, Phase 4 review round 3 on `210708f3`): applied the
  Reviewer's F1-F13 findings on PR #707. Aligned the three 21 ppt down
  sheets to the shared baseline, made the Golden Lily's fifth frame
  distinct, moved the pickup burst above Pip in raster/atlas/web, and
  routed warden eyes through one shared mirroring helper in all three
  renderers. Suppressed the sprint-bonus floater at level start and made
  the desktop ticker consume the engine's `level-clear` event name.
  Added the cell-tier level-clear sweep and banner, taught the Kitty
  renderer to track and free the whole-frame fallback image across
  pause, failure, menu, and tier-leave paths, and corrected the stale
  atlas size, PPT comment, and 6 Hz fright wording (shared clock now
  2.5 Hz). Added the missing atlas-fright, raster/web death-boundary, and
  Kitty image-one tests; restored the cursor lookback to 96 and the
  persist-theme fixture to a real theme. Corrected the compatibility
  evidence labels, OS qualification, probe/wasm hashes, and test counts,
  captured the desktop gameplay frame (`docs/desktop-gameplay.ppm`),
  and regenerated the browser gameplay capture. Verification: 525/525
  across 57 targets, verify 19/19 (`23c17f89734e`), fmt and clippy
  clean apart from the documented pre-existing lints, wasm sha256
  `61a72473...`, node smokes and `browser-e2e.js` ALL GREEN. No registry
  skill matched; none loaded.
  - the Fixer
- 2026-10-20 (fixer, Phase 4 review round 5 on `e291265d`): applied the
  Reviewer's B1-B4 and S1-S2 findings on PR #707. The cell tier now holds
  the visible death bubble, the reduced-flash contract selects the hollow
  warning mask across the shared helper and the cell tier, and the relish
  paints under the hunters. The desktop HUD renders the engine
  `level-clear` ticker in place of the static hint line, and score
  floaters use the shared `sprites::DIGITS`. Corrected the wasm size and
  test counts, completed the truncated scoreboard sentence, aligned the
  design and token transition durations with the shipped cuts and snaps,
  and qualified the remaining all-OS parity claims. Verification: 532/532
  across 57 targets, harness 47/47, verify 19/19 (`23c17f89734e`), fmt
  clean, wasm sha256 `47afaaea...`. No registry skill matched; none
  loaded.
  - the Fixer
- 2026-10-20 (fixer, Phase 4 review round 6 on `88ee1467`): applied the
  Reviewer's round-6 findings on PR #707. Every renderer now samples the
  engine animation clock (`Game::elapsed`, `Effects::chomp_phase`), so the
  sunseed halo flips every 200 ms, the relish bob rides the shared 4 s
  phase, and the 12 fps chomp holds an open mouth at rest on terminal,
  desktop, and browser. The terminal and desktop tickers age on a seconds
  clock instead of render frames, the cell-relish test carries a positive
  control, the dead `Clip` API is gone, and the wasm plus every size,
  hash, and toolchain claim is rebuilt and requalified. Verification:
  535/535 across 57 targets, harness 47/47, verify 19/19
  (`23c17f89734e`), fmt clean, wasm sha256 `029352dc...` (202,727 bytes,
  reproduced byte-identically with rustc 1.99.0 commit `b940084d7`),
  node smokes and `browser-e2e.js` ALL GREEN, desktop E2E under Xvfb
  green. No registry skill matched; none loaded. Code commit `470a050f`.
  - the Fixer
- 2026-10-20 (fixer, Phase 4 review round 7 on `6e55644d`): updated
  `maze-chase/docs/web.md` so the verification count reads 50 web tests
  and names the engine-clock sampling suite, matching
  `cargo test -p maze-chase-web -- --list`. Documentation-only change;
  no code, wasm, or evidence was touched.
  - the Fixer
- 2026-10-20 (fixer, Quality Council round on `dd55b7df`): closed the
  eight binding findings on PR #707 while keeping the design of record.
  The terminal and desktop title/pause surfaces now stage the live game
  (dimmed attract board plus a centered card, 55 percent pause dim with
  actors exempt); the browser title is a fixed first-view card with a
  visible Start action and a persistent header Pause control; all layers
  show the 30-segment fright meter only in the final 1.5 s (shape
  differences keep it grayscale-safe) and name "THE TURN ENDS" under
  reduced flash or reduced motion; reduced motion is persisted and gates
  the sunseed halo, effects, and floaters; high contrast selects
  MOONWAKE; asset ladders now carry 5x5 eyes and 11x11 relic icons at
  the reachable rungs. Added atlas reduced-motion parity and chrome
  fright-readout tests, regenerated the desktop title probe, rebuilt the
  wasm, and extended browser E2E to 38 assertions (first-view CTA,
  real clicks, mobile pause, settings persistence). Verification:
  545/545 across 58 targets, harness 47/47, verify 19/19
  (`23c17f89734e`), fmt clean, wasm sha256 `7545da6a...` (206,252
  bytes, reproduced by a second clean build), browser E2E 38/38 green,
  desktop E2E under Xvfb green. No registry skill matched; none loaded.
  - the Fixer
- 2026-10-20 (fixer, Pondwake review round 9 on `bb5670e8`): restored
  the design-of-record three-zone title. Terminal, desktop, and browser
  titles now show a selected-item description, the four-warden legend,
  and the goal line beneath the live attract board. Reduced flash now
  covers every brightness-bearing render call site: pickup burst,
  golden lily, and death hold gate on `reduced_motion || !flash` in
  terminal raster, atlas, and cell tier, the desktop attract board
  forwards the live settings, and the browser renderer matches. Added
  `tester_reduced_flash.rs`, which enumerates every brightness call
  site and proves a 180-frame fright window stays pixel-stable under
  reduced flash and reduced motion, with
  a default-options positive control; `browser-e2e.js` now asserts the
  three title zones (42 assertions). Verification: 549/549 across 59
  targets on the Linux workspace suite, harness 47/47, verify 19/19
  (`23c17f89734e`), fmt clean, wasm sha256 `69d5a55c...` (206,288 bytes,
  second clean build byte-identical), browser E2E 42/42 green, and the
  desktop Xvfb probe recaptured to `dcb33b7d...` (30-frame capture,
  byte-stable on rerun). No registry skill matched; none loaded.
  - the Fixer

- 2026-10-20 (fixer, Pondwake review round 10 on `b2c81dcb`): gated
  browser score floaters on reduced motion. The web renderer now routes
  its floater loop through `paint_floaters(..., reduced_motion)` with the
  same early return as the desktop `render_floaters`, and a behavioral
  test renders a live floater under `Fx::new(true, true)` and asserts it
  is absent (while the default-motion render paints it). The terminal
  reduced-flash registry test still passes unchanged; the web suite is
  now 51 tests and the workspace public count moves to 550 across 59
  targets. Verification on the pushed tree: targeted web and terminal
  suites green, harness 47/47, `maze-chase-verify` 19/19
  (`23c17f89734e`), fmt clean, wasm rebuilt to sha256
  `346ef9b8074e0a69c918d858624887f84694a2357c75de052ca77d47230e519d`
  (206,295 bytes, second clean build byte-identical), node smokes and
  the 42-assertion browser E2E all green. The full workspace suite is the Tester's
  run (this sandbox lacks the ALSA headers for `alsa-sys`). No registry
  skill matched; none loaded.
  - the Fixer

- 2026-10-20 (fixer, Pondwake review round 11 on `a55760e2`): corrected the
  two stale current-state claims in this file. The Current step summary and
  the workspace-gates paragraph now name the shipped wasm
  `346ef9b8...` (206,295 bytes), and the gates paragraph reports the public
  count of 550 across 59 targets with the full rerun explicitly left to the
  Tester, matching `docs/scoreboard.md`. Documentation-only change; no code,
  wasm, or evidence was touched. Single-file fix with the file already open,
  so no subagents were dispatched. No registry skill matched; none loaded.
  - the Fixer

- 2026-10-20 (fixer, Pondwake Tester round on `f00dffdb`): exported the
  missing `mc_fright_segments` bridge entry (`crates/web/src/bridge.rs`),
  so the browser HUD countdown drains instead of throwing inside
  `updateHud`'s swallowing catch. Rebuilt the wasm with the recorded
  Rust 1.99.0 toolchain (rustc commit `b940084d7`) to sha256
  `68e331b279f1a86379b47ce27d172d9e58895835ccfb87c2bede238b77dd1374`
  (206,711 bytes), reproduced byte-identically by a second clean build,
  and refreshed the current-state hash and size claims in `docs/web.md`,
  `docs/release.md`, `docs/feature-matrix.md`, and this file's summary
  and gates paragraphs. `tester-regression.js` (including the new fright
  HUD ABI section) and `wasm-smoke.js` are ALL GREEN. Single-file code
  fix, so no subagents were dispatched. No registry skill matched; none
  loaded.
  - the Fixer

- 2026-10-20 (fixer, Pondwake review round 12 on `ab4cd357`): restored the
  historical evidence rows that a prior docs pass had rewritten to current
  numbers. `docs/scoreboard.md` now records the initial identity delivery at
  `90cb9b87` as 498/57 and the round-6 reviewed head `88ee1467` (code commit
  `470a050f`) as 535/57 with wasm `029352dc...` (202,727 bytes, checked
  against the committed artifact); this file restores 498/57, 514/57,
  525/57, 532/57, and the same round-6 535/57 row, while the Quality Council
  round stays separate at 545/58 and `7545da6a...`. The PR summary now
  qualifies its claims sentence so current-state values match this tree and
  dated rows keep their own measurements. Documentation-only change; no code,
  wasm, or evidence was touched. Single-area docs fix, so no subagents were
  dispatched. No registry skill matched; none loaded.
  - the Fixer

- 2026-10-20 (fixer, Pondwake Tester fright-HUD round on `58902440`): kept
  the fright badge visible for the whole active window in the terminal and
  browser HUDs (desktop already did). `chrome::fright_readout` now returns
  `FRIGHT!` whenever `fright_active()`, and joins the 30-segment `█`/`░`
  meter (or `THE TURN ENDS` under reduced flash) only once
  `fright_flashing()` reaches the final 1.5 s; the browser hides only the
  segment row on a zero-segment read so `#fright-meter` and its badge stay
  visible for the full `fr` window. Updated the terminal unit test to the
  same contract. Verification: `cargo test -p maze-chase-terminal` all
  targets green (including `tester_fright_badge`, 2/2), `cargo fmt --all
  --check` clean, `tester-regression.js` ALL GREEN, and the real
  headless-chromium `browser-e2e.js` ALL GREEN with zero console errors
  (early badge visible, segments hidden; tail segments drain 1..30). Two
  coupled areas (terminal HUD, web HUD), so no subagents were dispatched.
  No registry skill matched; none loaded.
  - the Fixer

- 2026-10-20 (fixer, Tester count round on `e78035c5`): updated the three
  current-state public counts to the Tester's live run at that head.
  `index.html` and `docs/feature-matrix.md` now state 552 tests across 60
  targets, and this file's gates paragraph records 552 across 60 targets
  with the full rerun executed by the Tester at `e78035c57`. The committed
  wasm remains `68e331b2...` (206,711 bytes), matching the other
  current-state claims. Documentation-only change; no code, wasm,
  or evidence was touched. A single-area docs fix with the files already
  open, so no subagents were dispatched. No registry skill matched; none
  loaded.
  - the Fixer

- 2026-10-20 (fixer, Quality Council round on `b6f82a24`): applied the four
  blocking findings from the 9.4/10 rejection. The terminal play path now
  forwards `reduced_motion` through `App::fx()` into the shared `Fx` for the
  bitmap, Sixel-fallback cell, and full-repaint cell paths, and
  `bitmap_png` uses `render_opts`; a live truecolor PTY test seeds
  `reduced_motion = true` and fails on any sunseed halo glyph while the
  motion-enabled control requires one (mutation-verified against the pre-fix
  path). `paint_card` clears a window-clamped one-cell `theme.bg` ring
  before the border, covering both title and pause cards (grid regression
  test). Desktop `stage_center()` now centers the pause card and the compact
  title card over the board instead of the page (board-center unit tests
  plus a paused-frame border test), and `docs/desktop-probe.ppm` was
  recaptured byte-identically under Xvfb. `docs/design.md` now records the
  shipped scope with an accepted-simplifications section (interaction,
  environment, assets, effects/accessibility) and the feature matrix row is
  scoped to shipped art; the reduced-flash registry lists only shipped
  sources. Full workspace rerun: 559 passed / 0 failed across 61 targets,
  `maze-chase-verify` 19/19 (`23c17f89734e`), fmt clean, clippy limited to
  the six pre-existing engine lints; wasm unchanged at `68e331b2...`.
  Delegation ledger (Quality Council round on `b6f82a24`): no subagent
  dispatch was recorded for that round, so the primary context applied
  the four blocking findings directly across the terminal, card, desktop,
  and docs files. Observed output: 559 tests across 61 targets,
  `maze-chase-verify` 19/19 (`23c17f89734e`), wasm unchanged. No registry
  skill matched; none loaded. The omission is recorded here rather than
  reconstructed after the fact.
  - the Fixer

- 2026-10-20 (fixer, Pondwake docs-consistency round on `f51b4dc8`): aligned
  `docs/design.md` with the shipped interactions and effects. The first-run
  terminal row now states that Esc at the title quits, matching
  `crates/terminal/src/app.rs:303-305` and `docs/terminal.md:67`; the happy
  path and transition inventory start play on Enter/Start rather than a
  direction key; reduced flash holds the hollow warning mask returned by
  `anim::fright_mask_id`; and the web loading lines describe the shipped
  `Loading engine...` boot-status line in the title card instead of a
  pulsing-crumb progress line inside the board. Documentation-only change;
  no code, wasm, or evidence was touched. A single-area docs fix with the
  file already open, so no subagents were dispatched. No registry skill
  matched; none loaded.
  - the Fixer

- 2026-10-20 (fixer, Round 14 review on `620b3d32`): applied the three
  blocking findings and four should-fix findings. The compact desktop
  title card now clamps its origin inside the frame with the production
  three-detail menu (`MIN_W x MIN_H` 492x296 regression test across the
  601/602 px boundaries), and the window-floor doc drops the stale
  480x360 claim. The web boot gate now requires `mc_fright_segments`,
  `mc_version` advances to 2 across the bridge, harness, smoke, and
  docs, and the wasm was rebuilt twice byte-identically
  (`ae474117...`, 206,711 bytes); a new `boot-gate-e2e.js` serves
  hand-built stale modules through a page-level fetch override and
  proves both the missing-export and version-skew rejections on the
  error card. The Quality Council round's missing delegation ledger is
  recorded, the high-contrast label now names the effective Moonwake
  theme (browser assertion added), `docs/design.md` and `docs/web.md`
  describe the static fresh title board and the shipped static help and
  Back behavior (no attract demo, no history guard) with the accepted
  simplifications, and the cell tier no longer lets reduced flash gate
  the chomp or turn spark (new behavioral test). Verification:
  `cargo test --workspace --no-fail-fast` 561 passed / 0 failed across
  61 targets under Xvfb, `maze-chase-verify` 19/19 (`23c17f89734e`),
  harness 47/47, fmt clean, clippy only the six pre-existing engine
  lints; `wasm-smoke.js`, `tester-regression.js`, `boot-gate-e2e.js`,
  and the real headless-chromium `browser-e2e.js` are all ALL GREEN.
  Delegation ledger: three `explore` subagents (stale claims audit,
  attract/demo docs audit, boot-gate test design) mapped the ABI/hash
  sites, the stale prose, and a fake-fetch fixture; the primary context
  re-read the edited files, rebuilt and hashed the wasm, and ran every
  test and E2E command above. No registry skill matched; none loaded.
  - the Fixer

- 2026-10-20 (fixer, Round 15 review on `ee601779`): applied all ten
  findings. The terminal fright readout is now width-aware (label plus
  bar scaled to the remaining cells, `TURN ENDS` in reduced flash) and
  both the side panel and 62-column Sprint top bar clip every line, with
  a 170x64/62x35 rendered-rect integration test. The browser title card
  centers below the sticky header through `--header-h`/`--header-half`,
  and browser E2E checks header clearance, centering, and heading hit
  testing at 320x480, 360x640, 375x667, and 390x844. `docs/design.md`
  and `docs/design-tokens.json` now name only shipped effects and the
  complete reduced-flash/reduced-motion source lists. The desktop title
  skips the menu overlay when the window is too small for the three-detail
  card. The pause panel drops the false `aria-modal`, and browser E2E
  proves header Mute stays reachable while paused. QuitToTitle rebuilds
  a fresh board (spawn crumb banked, score 10) on desktop and terminal.
  The web build docs copy the wasm to `web/maze-chase.wasm`, and the
  boot gate requires the new fright/theme/difficulty exports with
  per-group missing-export cases. Test gaps closed: scoped attract-call
  context, two-state death window, hollow fright-mask center, entry-morph
  ID at t=0, and a high-contrast effective-theme browser assertion.
  Verification: full workspace 568 passed / 0 failed across 61 targets
  under Xvfb, harness 47/47, `maze-chase-verify` 19/19 (`23c17f89734e`),
  fmt clean, clippy only the pre-existing engine lint, wasm unchanged
  `ae474117...` (206,711 bytes, ABI 2), and `wasm-smoke.js`,
  `tester-regression.js`, `boot-gate-e2e.js`, and `browser-e2e.js` ALL
  GREEN. No subagents were dispatched; the primary context edited,
  formatted, and ran every gate above. No registry skill matched; none
  loaded.
  - the Fixer

- 2026-10-20 (fixer, Round 16 review on `ddfbb5a6`): closed both
  findings. `docs/design-tokens.json` `accessibility.notes` now records
  the shipped reduced-flash variants (hollow warning mask held, death and
  halo held, pickup bursts cut, level-clear sweep and banner cut, Golden
  Lily held) instead of claiming every source is held steady. The
  terminal reduced-flash banner is back to `THE TURN ENDS` in
  `chrome::fright_readout`, matching desktop and web; the width-aware
  bar still fits the 26-cell side panel (14 + 12) and the 62-column
  Sprint top bar (19 + 14 + 29). Targeted verification: terminal lib 122
  passed and `tester_fright_badge` 3 passed, JSON parses clean. No
  subagents were dispatched; the primary context edited and tested both
  files. No registry skill matched; none loaded.
  - the Fixer

- 2026-10-21 (fixer, Tester selection-accent finding on `23c10464`):
  `paint_panel` now checks `line.trim_start().starts_with("> ")` after
  `chrome::centered` pads the line, so the selected Settings, Help,
  Scores, and Rebind rows paint in `theme.accent` like the title and
  pause selections. The Tester's failing
  `selected_settings_row_uses_the_theme_accent` PTY test and the control
  `title_selection_uses_the_theme_accent` both pass on the shipped
  binary, and the high-contrast repaint/persist and fright-readout width
  tests stay green. Public counts refreshed to 572 tests across 62
  targets in `index.html`, `docs/feature-matrix.md`,
  `docs/scoreboard.md`, and the gates paragraph above. Verification:
  targeted terminal PTY suite green, harness 47/47, verify 19/19
  (`23c17f89734e`), fmt clean, clippy only the documented pre-existing
  engine lints, wasm unchanged `ae474117...` (206,711 bytes), desktop
  probe byte-identical, web E2E scripts green. No subagents were
  dispatched (one-file fix plus count refresh); no registry skill
  matched.
  - the Fixer

- 2026-10-21 (fixer, Quality Council/review fix round on `4af36efc`):
  closed the seven blocking findings and the should-fix list. The compact
  terminal pause hub now carries BEST (`chrome::paused(selected, best)`,
  wired from the score table and live score) and the 56-column band
  abbreviates an active relish badge to `R+1000` instead of dropping it.
  The desktop HUD uses a compact line step below 363 px and omits the
  optional FPS/TUNE rows, so the full stack (fright, relish, game over)
  clears the hint bar at the 492x296 floor, pinned by a rendered-bottom
  test. The web error card keeps its red border at higher specificity;
  browser E2E now asserts header clearance for every screen panel and
  the four-column HUD with fright and relish visible. The compatibility
  matrix and evidence notes were regenerated from the eight committed
  `96dc2be2` JSONs; the pause gate now requires at least four sprite
  pixels, with a near-blank fixture downgraded. The scoreboard names
  `96dc2be2`, current counts read 576/62 with harness 49/49 and wasm
  `022761a1...` (207,338 bytes), and the desktop probe was recaptured
  (`9abc9150...`) for the four-sunseed goal line. Verification: full
  workspace 576 passed / 0 failed across 62 targets under Xvfb, harness
  49/49, `maze-chase-verify` 19/19, fmt clean, clippy only the
  documented pre-existing lints, node smokes and all four web E2E
  scripts green. No subagents were dispatched; the primary context
  edited, formatted, and ran every gate above. No registry skill
  matched; none loaded.
  - the Fixer

- 2026-10-21 (fixer, Tester HUD-floor round on `3b05525c`): the full
  desktop HUD now starts at 365 px instead of 363 px, so the TUNE row no
  longer paints through the bottom hint bar at the switch; the committed
  pixel test pins 363 (compact) and 365 (full). Corrected the
  current-state evidence claims against the committed JSONs: kitty
  169.9-175.4 KiB, VT340 137-138 transmits / 4.25-4.31 MiB, Sixel
  29.7/29.9 KiB and 554 KiB/s, xterm light 1.85% white. Qualified the
  macOS and Windows release rows as pre-Pondwake in `release.md` and
  `docs/index.md`, and refreshed the public count to 578/63. Verification:
  full workspace 578 passed / 0 failed across 63 targets under Xvfb,
  harness 49/49, verify 19/19 (`23c17f89734e`), fmt clean, clippy only
  the documented engine lints, all four web E2E scripts green. No
  subagents were dispatched; no registry skill matched.
  - the Fixer

- 2026-10-21 (fixer, review round 19 evidence consistency on `1a97dfe1`):
  replaced the mixed-round scoreboard paragraph with the committed
  `96dc2be2` record: all eight Linux rows re-executed at that checkout
  (binary `ce3b1f91...`, `sources_dirty=false`), both Ghostty rows
  included, and the playing sprite census range corrected from
  163-271 to 153-217. Dated rows keep their own measurements.
  Verification: compatibility harness 49/49; docs-only change, so the
  existing code/wasm/capture artifacts are unchanged. No subagents were
  dispatched (single-file fix); no registry skill matched.
  - the Fixer

- 2026-10-21 (fixer, review round 20 on `63ed8018`): replaced the
  desktop HUD-floor test with the ink-scanning boundary contract. It
  renders 363 and 364 as compact heights and 365 as the full stack,
  scans all HUD ink (including the accent game-over row) with an empty
  ticker, and asserts the full FPS/TUNE band is active at 365. Mutation
  checks confirm the test fails when the switch is lowered to 364 or
  raised to 366. Restored the 2026-10-16 browser E2E row to its
  release-audit measurement (17 harness assertions, 13/13 green) and
  recorded the current 125/125 run in a separate 2026-10-21 section.
  Verification: the rewritten `tester_hud_floor` test passes and catches
  both switch mutations; `node web/e2e/browser-e2e.js` is 125/125
  `ALL GREEN` with zero console errors; harness 49/49; `cargo fmt
  --all --check` clean. No subagents were dispatched (two focused
  fixes); no registry skill matched.
  - the Fixer

- 2026-10-21 (fixer, review round 21 on `f33d372d`): the title and pause
  cards now use the same scroll-body plus pinned-footer structure as the
  other screen panels, so the first-run Start action and the pause Resume
  action stay inside the viewport at 320-wide and landscape-phone sizes,
  and the title body resets to its top when it reopens. The small-viewport
  browser loop adds 320x568 plus primary-CTA bounds and hit-testing, a
  Help-and-back cycle asserts the title body reopens at scrollTop 0, and a
  new 480x320 pause check covers the clipped-Resume case. Corrected the
  compatibility contract comment to describe its four-sprite-pixel paused
  fixture. Verification: `node web/e2e/browser-e2e.js` 146/146 `ALL GREEN`
  with zero console errors; compatibility harness 49/49; `node --check`
  clean. No subagents were dispatched (two focused files); no registry
  skill matched.
  - the Fixer

- 2026-10-21 (fixer, review round 22 on `7998390d`): the short-landscape
  title and pause cards now cap their panels at the dynamic viewport and
  compress their chrome below 420 px height, so every title and pause
  action stays inside the card and viewport at 480x320, 320x360, and
  568x320, with the headings themselves hit-testable. Every scrolling
  panel body is a labelled focusable region with a visible focus ring,
  ArrowDown scrolls it, and the title body is asserted scrolled before it
  reopens at its top. Terminal and desktop settings name the high-contrast
  theme explicitly, and the desktop pause overlay is skipped when the
  window is too small for the card. Recaptured `docs/web-gameplay.png`
  (1280x757, sha256 `69118e05...`) from the committed wasm `022761a1...`.
  Verification: full workspace 579 passed / 0 failed across 63 targets
  under Xvfb, browser E2E 190/190 `ALL GREEN` with zero console errors,
  harness 49/49, verify 19/19 (`23c17f89734e`), the other three web E2E
  scripts green, fmt clean, clippy only the documented engine lints. No
  subagents were dispatched; no registry skill matched.
  - the Fixer

- 2026-10-21 (fixer, review round 23 on `54f2c0df`): corrected the two
  remaining current-state count claims to the verified 579/63 result:
  `maze-chase/index.html:30` (workspace suite text) and
  `maze-chase/docs/feature-matrix.md:76` (scoreboard row). Dated 578 rows
  in `docs/scoreboard.md` and earlier progress entries keep their own
  measurements. Verification: compatibility harness 49/49; docs-only
  change, so no code, wasm, or capture artifacts changed. No subagents
  were dispatched; no registry skill matched.
  - the Fixer

- 2026-10-21 (fixer, review round 23 focused-control regression on
  `ca5aa182`): restored the web
  keyboard contract from focused controls. P/Esc/M are handled before the
  panel focus guard, P maps to the menu Back action, arrows move focus from
  buttons/body while a focused scroll region keeps native scrolling, and
  blank-name Save now records the Rust-side "Rill" fallback. Desktop
  settings toggles and the Audio mute row return `SettingsCommitted`, so
  the live settings and `settings.txt` update on the press. Corrected the
  kitty and Ghostty evidence numbers, the terminal crate name, the
  death-window decomposition, the turn-spark duration, and the pickup-burst
  wording; removed the stale round-5 ledger from the current step. Test
  hardening: the lives invariant allows the spare wick, the theme token
  check is scoped per theme block, and the dead raster `pip_facing_rows`
  wrapper is gone. Verification: browser E2E 200/200 `ALL GREEN` with zero
  console errors; full workspace 581 tests across 63 targets with 577
  passed and the four desktop window E2E tests sandbox-blocked by missing
  libxkbcommon-x11; harness 49/49; verify 19/19 (`23c17f89734e`);
  wasm-smoke, tester-regression, and boot-gate E2E ALL GREEN; fmt clean;
  clippy only the documented engine lints. Delegation ledger: two explore
  subagents launched (docs-claim verification and web focus-path audit);
  the docs agent returned no usable report, so the primary re-verified
  every number from the committed JSONs and code, and the focus audit's
  in-scope findings were applied and pinned by the new E2E assertions. No
  registry skill matched; none loaded.
  - the Fixer

- 2026-10-21 (fixer, review round 24 on `1f46da37`): bounded the theme
  token check to the primary `themes` map. `tokens_mirror_theme_palettes`
  now asserts each theme marker precedes `pondwake_themes`, slices the
  theme object to its closing brace, and so can no longer be satisfied by
  the duplicate palette map. Mutation-checked: changing
  `themes.dusk-pond.bg` now fails the test, and removing the `themes` map
  reports the map-placement assertion. Verification: targeted assets suite
  and `cargo fmt --all --check` clean. No subagents were dispatched; no
  registry skill matched.
  - the Fixer

- 2026-10-21 (fixer, review round 25 on `2b1f2bd1`): menu key handling
  now dispatches actions instead of hardcoded key ids. Arrows and their
  WASD twins move focus on every menu screen without forwarding a gameplay
  action (a focused scroll region keeps native scrolling), P and Esc
  dispatch the Back button (`mc_press(1)`) so P works after Back leaves
  Escape, and the M shortcut saves settings from both the menu branch and
  the generic dispatch so a keyboard mute survives a reload. The desktop
  Settings/Audio footers name Enter as the toggle key, and `design.md`
  uses the Rill name. E2E now rebinds Pause to ArrowUp through the real
  control and proves a menu ArrowUp only moves focus, rebinds Back off
  Escape and proves P still returns from Help, proves WASD focus, and
  proves the mute blob plus the post-reload state; the existing mute
  toggle assertion is state-independent. Verification: browser E2E
  212/212 `ALL GREEN` with zero console errors; the same block run against
  the pre-fix JS fails the three contract assertions (mutation check);
  `cargo test -p maze-chase-web` 51/51; verify 19/19 (`23c17f89734e`);
  harness 49/49; wasm-smoke, tester-regression, and boot-gate E2E ALL
  GREEN; `cargo fmt --all --check` clean. Full workspace was not rerun
  here because this sandbox lacks the ALSA/libudev headers; the reviewer's
  round-25 run covers it. Wasm is unchanged at `022761a1...` (207,338
  bytes). Full history restored before the force-with-lease push. No
  subagents were dispatched; no registry skill matched.
  - the Fixer

- 2026-10-21 (fixer, review round 27 on `7e4062d4`): a completed key
  rebind now calls `saveSettings()` after updating the Rust keymap and
  labels, so the captured binding lands in the settings blob instead of
  waiting for an unrelated slider or mute change. The unused capture
  node lookup is gone and the harness header describes the live keymap
  ownership. `browser-e2e.js` asserts `bind_pause = Up` in the blob,
  reloads and asserts the `Pause: ArrowUp` label, and clears the persisted
  keymap before the raw-ArrowUp fright route. Mutation check: the same
  E2E block against the pre-fix JS fails both new persistence assertions.
  Verification: browser E2E 214/214 `ALL GREEN` with zero console errors;
  wasm-smoke and tester-regression green; wasm unchanged at `022761a1...`
  (207,338 bytes). No subagents were dispatched; no registry skill matched.
  - the Fixer

- 2026-10-21 (fixer, Tester count refresh on `61f96564`): refreshed the
  current-state counts to the Tester's final full rerun. `index.html`,
  `docs/feature-matrix.md`, and this file's gates paragraph now record 582
  tests across 63 targets and 582 passed / 0 failed (581 plus the new live
  windowed settings-toggle test). `docs/scoreboard.md` gains the dated
  Tester rerun entry, and its round-23 entry keeps its own 581 and 200/200
  measurements as history while pointing at the completed rerun. Current
  browser E2E counts read 214/214. Docs-only: no code, wasm, capture, or
  evidence changed. Verification: documentation cross-check against the
  Tester's signed report; no subagents were dispatched (single-area docs
  refresh); no registry skill matched.
  - the Fixer

- 2026-10-21 (fixer, review round 29 on `c2d04bc5`): an unmapped key
  during a web rebind capture now cancels the Rust-side capture too.
  `onKeyDown` sends `mc_rebind(99)` whenever the pressed key has no web
  key id, so the visible UI and the session capture can no longer diverge
  and the next key (`M`, a movement key) performs its own action instead
  of completing the abandoned capture. `browser-e2e.js` arms the Pause
  row, presses `F1`, asserts the row returns to `Pause: P`, and proves
  `M` still toggles mute and restores it. Verification: browser E2E
  218/218 `ALL GREEN` with zero console errors; the same block against
  the pre-fix harness fails the two mute assertions and the later
  persisted-mute checks (mutation proof); `node --check` clean. No Rust,
  wasm, or capture artifact changed. No subagents were dispatched
  (single-line JS fix plus its E2E assertions); no registry skill
  matched.
  - the Fixer

- 2026-10-21 (fixer, review round 30 on `8461e531`): the web rebind
  capture now cancels on every path that leaves it behind. `syncPanels`
  cancels when the screen leaves Settings, Escape cancels even from a
  focused form control, a touch-pad press cancels instead of completing
  the Rust-side capture, and arming a second row resets the previous
  prompt. The boot contract requires the settings and score exports so
  stale modules fail loudly, and `docs/web.md` records that fixed menu
  shortcuts (P/Esc Back, M mute) take precedence over remapped play
  actions. `browser-e2e.js` gains the four regression blocks (leave
  Settings then move, Escape from `#rng-master`, forced pad, second-row
  prompt) and passes 229/229 `ALL GREEN` with zero console errors; each
  block fails with its fix reverted (mutation proof). Boot-gate E2E
  30/30, wasm-smoke and tester-regression ALL GREEN, `node --check`
  clean. No Rust, wasm, or capture artifact changed. No subagents were
  dispatched (one capture-lifecycle area in the web harness plus its
  E2E and doc note); no registry skill matched.
  - the Fixer

- 2026-10-22 (builder, Phase 5 on `opencode/issue582-20261021232750`):
  replaced the duplicated 132 BPM tunes with one `TEMPO = 108` source and
  five multi-track scores (swung eighths, per-note voice/velocity/track),
  added the seven-voice layered SFX bank, peak-normalized both buses, and
  moved the mix to 80/60/80 with 120 ms fades. The terminal chime is now
  opt-in (`terminal_chime`, default false) with a Settings row, and
  flashes fire before the mute/chime gates. The desktop sink renders
  tracks and layered tones and falls back to a null sink; the browser ABI
  is version 3 with tone, track, and fade queries plus the first-gesture
  unlock chip. Commits: `c9226dd1` (shared score and mix), `67c221ae`
  (terminal chime), `bc63f97b` (desktop sink), `38d7b046` (web ABI,
  harness, wasm, E2E). Verification: `cargo test --workspace` 589 passed
  / 0 failed across 63 targets; verify 19/19 (`23c17f89734e`);
  `perf-headless` 0.8 us/tick; offline PCM 0.154 music / 0.320 SFX at the
  default mix; wasm 212,255 bytes, sha256 `cc7708fa...`, reproducible on a
  second build; wasm-smoke, tester-regression, boot-gate (33), browser
  E2E (234, zero console errors), and rebind lifecycle all green; fmt
  clean; clippy only the six pre-existing engine lints. Native macOS and
  Windows speaker listening remains in the Final Phase. No subagents were
  dispatched; no registry skill matched.
  - the Builder

- 2026-10-22 (fixer, review round on `7dc7c047`): applied the 14
  reviewer findings. The web scheduler now gives every tune a per-job
  output gain, tracks and fades osc nodes on transitions, guards the
  pump against catch-up bursts and zero-length tunes, sends stings to
  their own music-bus output so they no longer stop the loop, and
  normalizes each tune in JS against the 0.32 ceiling with the release
  tail modeled. The unlock path polls the pending music after building
  the context, so the first gesture starts the title instead of losing
  it. Drone is a sine at ratio 0.50 with the documented 80 ms attack,
  1.2 exponential decay, and the envelope now decays to the note end.
  The swing scan skips interleaved lanes and uses an MSRV-1.85-safe
  parity check. The terminal hashes `terminal_chime` into the idle-skip
  key and drops the dead flash queue; the desktop settles saved levels
  before the first tune and routes stings through their own music-bus
  sink. Browser E2E clicks the unlock chip before any trusted key,
  asserts the running context plus title loop, and offline-renders all
  five tunes under the ceiling; headless settings navigation now walks
  six rows to Back; docs, artifact metadata, and the issue references
  are current.
  Delegation ledger: two `general` subagents. One updated the docs
  sweep (voice bank, chime flash wording, feature matrix, index links)
  while the primary implemented code; one performed a read-only web
  audio audit that found the missing 20 ms release tail in the
  normalization model, the untrusted `.click()` unlock, the
  unreachable unlock replay, and stings stopping the loop; all four
  were fixed and the browser harness proves them.
  Verification: `cargo test --workspace` under Xvfb 591 passed / 0
  failed across 63 targets; `maze-chase-verify` 19/19 (`perf-headless`
  0.1 us/tick, golden `23c17f89734e`); `cargo fmt --all --check` clean;
  clippy only the six pre-existing engine lints; wasm 212,234 bytes,
  sha256 `8bf0b74b...`, second build byte-identical; wasm-smoke,
  tester-regression, boot-gate (33), and browser E2E (zero console
  errors) ALL GREEN; `node --check` clean.
  - the Fixer

- 2026-10-22 (fixer, second review round on `bd9df3d1`): applied the
  remaining reviewer findings. The web unlocks with every bus primed
  from the saved master/music/SFX/mute values (nodes start at zero, so
  a muted or low-volume reload never ramps the title from full gain),
  the debug seam exposes the live gain values, and the E2E reloads a
  muted and a low-volume profile and asserts the primed gains before
  audio starts. Web tunes and SFX recipes now normalize through a
  phase-aware sample model at the render sample rate (no blanket 0.5):
  the model also exposed that a future `setValueAtTime` left each
  oscillator on the 440 Hz default for the first render quantum, so
  `playVoice` seeds the frequency before the scheduled start (the
  onset detune and partial phase shift are gone). Offline render seams
  and E2E ceilings cover all five tunes and relish, spare wick, and
  sprint; desktop `scale_to_peak` now truly normalizes every tune and
  recipe to its bus ceiling instead of only attenuating, and its tests
  assert the ceiling is reached. Start/pause/quit E2E assertions pin the old loop
  job stopped and the title job restarted. The mute confirmation cue
  now plays after the new target gain is applied, with a spy-sink test.
  Docs narrow the score/home sentence to shared data, attribute the
  desktop/terminal tests correctly, add an audio row to the parity
  checklist, and update the harness comment to ABI 3. The roadmap Phase
  5 line now uses `Refs #659`; current-step evidence is 592 / 212,234 /
  `8bf0b74b...` / 0.1 us/tick.
  Delegation ledger: primary-only round (the findings were one
  coherent audio-path change set; parallel subagents would have edited
  the same scheduler and E2E files). Skills: no registry skill
  matched.
  Verification: `cargo test --workspace` under Xvfb 592 passed / 0
  failed across 63 targets; `maze-chase-verify` 19/19 (golden
  `23c17f89734e`, `perf-headless` 0.1 us/tick); `cargo fmt --all
  --check` clean; wasm 212,234 bytes, sha256 `8bf0b74b...`, second
  build byte-identical; wasm-smoke, tester-regression, boot-gate (33),
  and browser E2E ALL GREEN with zero console errors; `node --check`
  clean.
  - the Fixer

- 2026-10-22 (fixer, third review round on `ff38bbea`): fixed the warden
  chain normalization leak. `sfxGain` no longer caches a gain across
  plays: every cue renders at the exact pitch that play will use, so the
  chain arm (`mc_sfx_tone_field` pitch up to 8x) and the crumb variation
  each get their own normalization instead of reusing chain 0's. The
  model targets 98.5% of the SFX ceiling, leaving headroom for the
  browser's band-limited Pluck (measured up to 1.2% above the ideal
  sample model), and the offline seam accepts a pitch override so the
  E2E renders chain pitches 2/4/8. The mute confirmation now settles the
  new target before the cue plays on the web as well, with an E2E seam
  recording the scheduled target (AudioParam.value lags a scheduled
  event by one render quantum, so the seam reads the target, not the
  live param). The E2E grows to 247 assertions. Docs drop the unbacked
  sting-routing claim, document the browser SFX headroom, and correct
  the 44.1 kHz model comment.
  Delegation ledger: primary-only round (one scheduler change plus its
  E2E and doc notes; parallel subagents would have edited the same
  files). Skills: no registry skill matched.
  Verification: `cargo test --workspace --no-fail-fast` under Xvfb 592
  passed / 0 failed across 63 targets; `maze-chase-verify` 19/19
  (golden `23c17f89734e`, `perf-headless` 0.7 us/tick debug); `cargo
  fmt --all --check` clean; wasm-smoke, tester-regression, boot-gate
  (33), and browser E2E (247, zero console errors) ALL GREEN. The
  committed wasm is unchanged (212,234 bytes, sha256 `8bf0b74b...`).
  - the Fixer

- 2026-10-22 (fixer, evaluator rejection round on `d37b38e5`): applied
  all five blocking Quality Council findings. The Settings mixer is
  three `.mix-row` grids (label, range, live percent output) instead of
  one wrapping paragraph, with the slider handler and `syncSettingsUI`
  keeping each percent current; the browser harness asserts all three
  rows stay on one line with a visible label and value at 1920x1080,
  1440x900, and 390x844. The unlock chip moved into the title card's
  scroll region after the heading, and the 390x844 E2E now asserts its
  rectangle is fully inside the viewport and hit-testable at its center.
  The web master bus gained a `DynamicsCompressorNode` plus a soft-clip
  `WaveShaperNode`, with `__mcRenderMixPeak` summing four loud recipes
  at a 100/100 mix through the real chain (measured 0.719, under 1.0);
  desktop gained `mix_limit_scale`, which ducks both buses by the
  worst-case active source count, and an offline test sums four SFX,
  a loop, and a sting at 100/100 (raw above 1.0, limited at or below
  1.0). `docs/audio.md` now scopes "never clip" to a recipe and
  documents the summed-output stage. `WebSession` queues `(code, chain)`
  and `poll_cue` restores the snapshot, with a same-tick two-warden test
  asserting 400 Hz then 3200 Hz instead of both resolving the last arm.
  Docs were corrected to the actual evidence state: the parity header
  and retirement note no longer claim every row is signed, the
  scoreboard's native-proof paragraph names the sound row's deferred
  macOS/Windows speaker review, the E2E README lists all six harnesses,
  and Node 22+ is stated for the CDP harnesses. Totals refreshed to 594
  tests across 63 targets, 278 browser assertions, wasm 212,438 bytes,
  sha256 `5bcceec8356d8659d53405c593df744ba3c980c8b31582358313a53f5a2f72db`,
  reproduced by a second build (superseded by the version-unified
  rebuild; `docs/release.md` records the current artifact).
  Delegation ledger: primary-only round (the five findings touched
  shared web audio/session paths and the same harness files, so parallel
  editors would have collided). Skills: no registry skill matched.
  Verification: `cargo test --workspace --no-fail-fast` under Xvfb 594
  passed / 0 failed across 63 targets; `maze-chase-verify` 19/19 (golden
  `23c17f89734e`, `perf-headless` 0.2 us/tick release); `cargo fmt
  --all --check` clean; clippy only the six pre-existing engine lints;
  wasm-smoke, tester-regression, boot-gate (33), browser E2E (278, zero
  console errors), tester-audio (17 checks), and rebind lifecycle ALL
  GREEN; `node --check` clean.
  - the Fixer

- 2026-10-22 (fixer, Tester fix round on `9c7dfa58`): fixed the one
  blocking tester finding and the seven documentation-truthfulness
  corrections. The "Sound is asleep - tap to wake" chip now leads the
  title card's scroll region, above the kicker and heading, so the
  pinned action row can never cover it and the scroll box cannot clip
  it; the Tester's 320x480 assertion passes with the full 44 px
  rectangle on-screen and `elementFromPoint` resolving to the chip (the
  same holds at 320x360, 480x320, and 568x320). Docs now match the
  shipped evidence: the README parity note defers the sound row's
  macOS/Windows real-speaker review, `docs/web.md` records 52 web tests
  plus the chip's title-card placement and points blocked audio at the
  chip instead of the missing-WebAudio HUD note, `docs/audio.md` names
  the persisted 35/45 mix, attributes same-tick warden cues to the web
  session unit test rather than the browser harnesses, and scopes the
  desktop fade assertion (the exact 120 ms lives in the audio and
  config suites). The current-step ledger also drops the dead
  flash-queue wording and moves the browser total to 279 assertions.
  Delegation ledger: primary-only round (one chip layout move plus
  documentation corrections in the same files; parallel subagents
  would have collided). Skills: no registry skill matched.
  Verification: browser E2E 279 assertions ALL GREEN with zero console
  errors; wasm-smoke, tester-regression, boot-gate (33 checks),
  tester-audio (17 checks), and rebind lifecycle ALL GREEN; `cargo fmt
  --all --check` clean; `cargo test` for audio/config/terminal/web/
  engine passed 440 / 0 failed across 49 targets (the desktop crate
  cannot link in this container because the ALSA development headers
  are absent; the Tester's 594 / 0 full-workspace run on this product
  tree stands).
  - the Fixer

- 2026-10-22 (fixer, Tester docs round on `ec6b4c71`): updated the
  scoreboard's browser evidence line from 278 to the shipped 279
  assertions. Re-ran `node web/e2e/browser-e2e.js` against the served
  page and the committed wasm: `E2E: ALL GREEN`, 279 `ok` lines, zero
  console errors. Documentation-only round; no product code changed.
  Delegation ledger: primary-only (a single stale count). Skills: no
  registry skill matched.
  - the Fixer

- 2026-10-22 (builder, Phase 6 release engineering): made the workspace
  version the single source (all seven crates inherit version 0.1.0,
  edition 2021, and MIT) and added the fail-closed tag/version parity
  gate. Added the shared packaging contract (`common.sh`, `common.ps1`),
  real deb and rpm builds for both layers, deterministic tarballs and
  zips, the per-user Inno Setup installer, the macOS app/dmg/tarball
  chain, install/uninstall scripts with `--purge-config`, per-OS smoke
  harnesses, staged native release pipeline source, and the Linux
  stage/reproducibility check. Verification on this container:
  `cargo metadata` refreshed the lock (engine 0.3.0 -> 0.1.0);
  `stage-linux.sh` built all six Linux artifacts and `smoke-linux.sh`
  passed every deb/rpm/tarball check; a second full stage produced
  byte-identical SHA256SUMS. `check-tag.sh` accepts 0.1.0 and its rc
  form, rejects 0.2.0, and reports a branch as no-tag. macOS and
  Windows builds were not run here (`iscc`/`hdiutil` absent) and are
  not claimed.
  Delegation ledger (recorded in the fix round): no subagent record
  exists for this round, so it is recorded as primary-only; the
  delegation threshold plainly applied (independent packaging,
  desktop, and docs units) and not parallelizing them is a process
  gap, not a justified exception. The primary context built every
  script and ran the Linux stage. Skills: no registry skill matched.
  - the Builder

- 2026-10-22 (builder, Phase 6 desktop and docs round): fixed the
  desktop release findings. Frame rendering is bounded to 16.7M pixels
  (an 8K window renders proportionally smaller and is nearest-neighbor
  scaled on presentation, with a one-time stderr reason and a
  `(scaled render)` title suffix instead of a silent freeze), the
  surface starts at the physical inner size and repaints on
  `ScaleFactorChanged` (HiDPI), and the event loop waits on static
  screens while scheduling 16 ms frames only for Playing and `--probe`.
  Added unit tests for the 8K bound, scaled presentation, and frame
  scheduling. Rewrote the release, desktop, terminal, README, hub,
  scoreboard, and feature-matrix claims around the real artifacts,
  checksums, install/upgrade/uninstall, and the unsigned status.
  Verification: `cargo test --workspace` 0 failed (all targets),
  `maze-chase-verify` 19/19 with golden `23c17f89734e`,
  `cargo fmt --all --check` clean, clippy only the six pre-existing
  engine lints; `stage-linux.sh` rebuilt all six artifacts twice with
  byte-identical SHA256SUMS after the desktop change and the license
  additions.
  Delegation ledger: again no subagent record exists, so the round is
  recorded as primary-only; the same threshold applied (desktop idle
  loop, packaging, and docs verification were independent units) and
  not fanning them out is a process gap. The primary context ran the
  desktop tests, fmt, clippy, and the two Linux stages. Skills: no
  registry skill matched.
  - the Builder

- 2026-10-22 (fixer, Phase 6 review round on `5d66637f`): applied every
  reviewer finding. macOS smoke now classifies terminal and desktop
  tarballs; both tarballs ship the install/uninstall scripts and both
  installers fail instead of falling back to a developer build; the
  smoke runs the extracted installers. The tag gate tolerates a CRLF
  manifest, tarball writes pin the stage mode and use GNU tar or a
  deterministic Python fallback (tested under umask 022 and 077, with a
  mutation check proving the test fails without the pins), RPM specs
  drop `%{?dist}`, the desktop RPM requires `systemd-libs` and refreshes
  caches, and the PowerShell epoch clamps to 1980. The release workflow
  binds new tags to `$GITHUB_SHA` and validates any existing tag before
  refresh or create. Desktop pad input moved to a bounded timer,
  `--probe` captures at the bounded render size, audio fades settle on
  slider and mute commits, and the first continuous frame uses
  `FIXED_DT`. Release/matrix/scoreboard claims now match the artifacts
  and the digest table matches the restaged Linux set.
  Verification: `cargo test --workspace` green (89 desktop lib tests
  plus all integration suites, including windowed `--probe` against the
  committed PPM under Xvfb), `maze-chase-verify` 19/19, `cargo fmt
  --check` clean, clippy only the six pre-existing engine lints,
  `stage-linux.sh` rebuilt twice with byte-identical SHA256SUMS, and the
  packaging suite is 13/13.
  Delegation ledger: three read-only general subagents ran in parallel.
  The packaging audit reproduced the installers, tag binding, RPM and
  umask paths and found the first umask test was not load-bearing (fixed
  and mutation-proven) plus the tag-without-release corner (fixed). The
  desktop audit ran the lib and integration suites and reproduced the
  Audio Mute-row fade gap (fixed with a regression test). The docs audit
  checked the digest table with `sha256sum -c`, cross-links, and every
  claim against the tree. The primary context verified every reported
  defect independently, ran the full suites and both Linux stages, and
  owns the final diff. Skills: no registry skill matched.
  - the Fixer

- 2026-10-22 (fixer, Phase 6 re-review round, pre-rebase head): fixed the
  blocking Python tarball fallback defect. The stage-root walk no longer
  `continue`s past its own files, so top-level payloads, guides, and
  licenses are archived; nested entries keep their prefixed names. The
  umask regression test now lists and extracts every archive with the
  real tar, asserts `payload` and `nested/doc.md` are present with the
  right contents, and asserts the executable bit survives, so digest
  equality alone can no longer certify an empty or incomplete archive.
  Rephrased `docs/desktop.md` to state the bounded 16 ms gamepad poll
  instead of claiming an idle window uses no CPU.
  Verification: `cargo test -p maze-chase-terminal --test
  tester_packaging` 13/13, `cargo fmt --all --check` clean, `bash -n`
  clean on the changed script, and the strengthened assertions
  mutation-proven to fail against the old writer.
  Delegation ledger: one read-only general subagent independently
  reproduced the Python fallback (top-level and nested files listed and
  extracted, executable bit intact) and mutation-proved the strengthened
  assertions fail on the buggy writer; it reported no defects. The
  primary context verified the writer, ran the suite and fmt, and owns
  the final diff. Single coupled area (writer plus its test) with a
  one-line doc correction, so no further fan-out was warranted. Skills:
  no registry skill matched.
  - the Fixer

- 2026-10-22 (fixer, Phase 6 third review round, pre-rebase head): applied
  the remaining release-gate findings. Windows release binaries link
  the static MSVC CRT (`common.ps1` appends
  `-C target-feature=+crt-static` and every build path proves it with
  dumpbin), the desktop zip ships `LICENSE`, and the Windows smoke
  checks the license in both zips and the installed tree. The release
  guide separates tarball/zip determinism and states the dmg is not
  byte-reproducible, shows the per-user and system-wide tarball
  install/uninstall pair, points Windows uninstall at Settings > Apps,
  and treats the 0.1.0 candidate as future work; the desktop guide's
  macOS command matches the dmg script, and both layer guides no longer
  present an unpublished release as live. The scoreboard records its
  measured commit, epoch, host, toolchain, and the RPM build-host
  caveat.
  Verification: `cargo test -p maze-chase-terminal --test
  tester_packaging` 15/15 (the static CRT and license assertions were
  mutation-proven to fail on their removal), `cargo fmt --all --check`
  clean, `bash -n` over every packaging script, a pwsh AST parse of the
  changed PowerShell scripts, a mocked dumpbin matrix (clean, dynamic,
  failing status), `stage-linux.sh` twice with byte-identical
  SHA256SUMS at the named commit, and `sha256sum -c` on the staged set.
  Delegation ledger: two read-only general subagents ran in parallel.
  The docs audit checked B1, m1-m5, native claims, shell flags, and em
  dashes against the scripts; it returned PASS for the edits, plus the
  scoreboard input defect and one "launcher" wording defect (both
  fixed). The Windows audit parsed every changed ps1 under pwsh, ran a
  mocked dumpbin matrix plus a stage inheritance check, and found the
  first static assertions comment-satisfiable and the unquoted vswhere
  glob (both fixed; mutation-proven). The primary context verified
  every reported defect, ran the packaging suite, both Linux stages,
  and the manifest check, and owns the final diff. Skills: no registry
  skill matched.
  - the Fixer

- 2026-10-23 (fixer, Phase 6 fourth review round, pre-rebase head): applied
  the two blocking findings plus every major and minor. Every Linux
  package now ships the full MIT license: deb copyright files are the
  repository LICENSE behind a package header and both RPMs install it
  through %license, with the smoke asserting the MIT text. The release
  matrix names `maze-chase/` as its working directory, so the documented
  commands run. Feature-matrix row 78 no longer claims native rows ran.
  `stage-linux.sh` names the RPM by this host's architecture, and
  `common.sh` pins umask 022 so a 077 caller cannot break dpkg-deb.
  The release workflow writes only in the publish job, derives
  prerelease from the tag, corrects the flag on refresh, and removes
  assets outside the verified set; check-tag treats --allow-branch as
  authoritative. The Windows smoke classifies by leaf name, fails closed
  on unknown names, compares the full version line, and quotes the
  installer paths. Fade docs now match the immediate static-screen
  settle, the scoreboard stops claiming gameplay byte-identity, the
  Rust minima match the locked graph, the tarball/Inno/OS wording is
  corrected, and the scoreboard's pre-rebase measured commit was
  `cac1a72b` (the rebase later rebound it to `829885d01`).
  Verification: `xvfb-run -a cargo test --workspace --no-fail-fast`
  green (18/18 packaging tests), `maze-chase-verify` 19/19 with golden
  replay `23c17f89734e`, `cargo fmt --all --check` clean, clippy only
  the six pre-existing engine lints, `cargo +1.85.0 check --locked -p
  maze-chase-terminal` and `cargo +1.89.0 check --locked -p
  maze-chase-desktop` green, `stage-linux.sh` run twice under umask 022
  and 077 with a byte-identical manifest, `sha256sum -c` green, and all
  four package payloads extracted with the MIT text present.
  Delegation ledger: two read-only general subagents ran in parallel.
  The packaging verifier re-ran the payload, umask, tag, workflow,
  PowerShell, and packaging-suite checks and returned PASS on every
  finding; it also surfaced two Linux smoke robustness defects (a
  relative RPM path broke inside the extraction subshell, and package
  classification matched the full path), both fixed and pinned. The
  docs verifier checked the eight documentation findings against the
  scripts, code, and lockfile and returned PASS on all eight. The
  primary context re-verified the matrix commands, native-claim,
  fade, and gameplay wording, both toolchain minima, and the em-dash
  scan, ran the full suites and both stages, and owns the final diff.
  Skills: no registry skill matched.
  - the Fixer

- 2026-10-24 (fixer, Phase 6 fifth review round, pre-rebase head): applied
  the Quality Council rejection. The committed browser artifact was
  stale after the 0.3.0 -> 0.1.0 unification: rebuilt it on the recorded
  Rust 1.99.0 (`b940084d7`) to 212,472 bytes, sha256
  `d6dd16bf8038ae5cbde4a81209e4835391dd4ace8a5e3eb1ef37d6b191c62ac0`,
  and updated every current-artifact claim; the earlier progress entry
  is marked superseded. `packaging/release/check-wasm.sh` now rebuilds
  from source in a scratch target directory with `--locked` and fails
  closed on a byte mismatch, the Linux release job runs it, and a new
  packaging test pins the documented hash/size to the committed bytes.
  The release workflow now pins Rust 1.99.0 in all three native jobs,
  records rustc/cargo plus the runner image in `dist/toolchain-<os>.txt`,
  folds those records into the release notes (failing if any is missing),
  and passes `--locked` on every test, verifier, and packaging build.
  The hub now puts the Play CTA above a short user-facing status block
  (no test counts, commit hashes, or QA labels), and both Linux
  installers validate the payload before creating prefix directories,
  name the tarball in a missing-binary error, and quote the uninstall
  hint. Also corrected the RPM/deb reproducibility wording, the rc
  refresh condition, the clippy count (seven: six library lints plus
  the test-only rng grouping), the scoreboard epoch provenance sentence,
  and added a sorted-checksum mutation test. ALSA absence noise was
  already documented.
  Verification: `xvfb-run -a cargo test --workspace --no-fail-fast`
  620 passed / 0 failed across 63 targets; `maze-chase-verify` 19/19;
  `cargo fmt --all --check` clean; clippy seven pre-existing engine
  warnings; `check-wasm.sh` passes and its stale-detection was
  mutation-proven; `stage-linux.sh` run twice with byte-identical
  SHA256SUMS and `sha256sum -c` green; terminal/desktop tarball
  installs probe `--version`; all packaging scripts pass `bash -n` and
  the PowerShell scripts parse.
  Delegation ledger: two read-only general subagents ran in parallel.
  The artifact/release verifier rebuilt and mutation-tested the wasm
  guard, audited every workflow pin/upload/note/`--locked` path, and
  found two docs contradictions (the deb-reproducibility wording and an
  unlocked verifier command), both fixed and re-tested. The
  hub/installer verifier measured Play at 231px (1920x1080) and 308px
  (390x844) in Chromium, confirmed no QA copy or dead docs links, and
  reproduced the installer ordering, tarball-naming, quoting, and
  valid-archive paths, reporting no defects. The primary context
  rebuilt and hashed the artifact, ran the full suite, verifier,
  formatter, clippy, both staged Linux runs, and the installer probes,
  and owns the final diff. Skills: no registry skill matched.
  - the Fixer

- 2026-10-24 (fixer, Phase 6 sixth review round on `85ff5a19`): applied
  the fifth review's evidence and honesty findings. The hub status now
  separates the built and smoke-tested Linux packages from the Windows
  and macOS artifacts that ship once the release workflow is installed,
  and drops the per-OS QA tracker link; the README carries the same
  distinction. The scoreboard keeps the 2026-10-22 historical values
  (212,438-byte wasm, six lints, 594 tests) and gains a 2026-10-24
  section bound to `85ff5a19` with the rebuilt 212,472-byte wasm, the
  620-test rerun, seven lint warnings, the node/browser smoke results,
  and the current stage digests. The cross-host tarball sentence is
  narrowed to same-host reproducibility, the epoch is labeled the
  author timestamp rather than the committer timestamp, the feature
  matrix reports the 620-test suite, and the release guide shows the
  `--allow-branch` dispatch invocation. Historical progress entries
  drop the unreachable pre-rebase hashes and label the old measured
  commit as pre-rebase.
  Verification: `packaging/release/check-wasm.sh` reproduces the
  committed wasm (212,472 bytes, `d6dd16bf`); `cargo test -p
  maze-chase-terminal --test tester_packaging --locked` 26/26;
  `xvfb-run -a cargo test --workspace --no-fail-fast --locked` 620
  passed / 0 failed across 63 targets; `cargo run --release --locked
  --bin maze-chase-verify` 19/19 with golden replay `23c17f89734e`;
  `cargo fmt --all --check` clean; clippy seven pre-existing engine
  warnings; two `stage-linux.sh` runs with a byte-identical
  `SHA256SUMS.txt` and a green `sha256sum -c`; the node smokes and the
  headless browser E2E green (279 assertions).
  Delegation ledger: two read-only general subagents ran in parallel.
  The docs audit checked every finding against the changed files and
  surfaced the stale `README.md` status sentence (fixed) plus the
  missing round entry (this entry). The evidence audit independently
  rebuilt the wasm, ran two Linux stages with the documented epoch,
  matched all six digests, reran the node and CDP harnesses (33, 279,
  10, and 17 checks), and reproduced the 620-test suite and seven-lint
  count; it found no defects. The primary context made and reviewed
  every edit, ran the packaging and workspace suites, the verifier,
  fmt, clippy, both stages, and the manifest check, and owns the final
  diff. Skills: no registry skill matched.
  - the Fixer


- 2026-10-24 (builder, Phase 7 on `opencode/issue582-20261024225156`): the
  game-first web experience landed. `maze-chase/index.html` is the complete
  playable page with a compact Site menu; `play.html` forwards to it with
  the query and fragment intact; `install.html`, `downloads.html`,
  `compatibility.html`, and `releases.html` carry the secondary detail
  under one `site.css` shell and one navigation, with built Linux rows
  separated from the native rows now published unsigned in the
  `maze-chase-v0.1.0-rc.1` prerelease.
  `tools/site/render-docs.mjs` renders all 15 docs into committed HTML
  pages with a sidebar and source-freshness markers, rewrites markdown
  links, and verifies every internal link and fragment in `--check` mode.
  `tester_site.rs` re-derives every marker in Rust and walks the shipped
  links from disk; the packaging crosslink and docs-language suites moved
  to the new surfaces. `web/e2e/site-e2e.js` checks every page at desktop
  and 390x844, boots the game, starts, pauses, and resumes.
  Verification at that head: `render-docs.mjs --check` 15 docs current with
  398 links; `tester_site` 6/6; `tester_packaging` 27/27; docs-language
  green; local `site-e2e.js` ALL GREEN (156 assertions, six pages); deployed
  preview `site-e2e.js https://userfrom1995.github.io/RandomLabs/preview/pr-759/maze-chase/`
  ALL GREEN (156 assertions, six pages); `browser-e2e.js` ALL GREEN (279
  assertions);
  `xvfb-run -a cargo test --workspace --no-fail-fast --locked` 627 passed
  / 0 failed across 64 targets; `cargo fmt --all --check` clean; clippy
  reports the seven pre-existing engine warnings.
  Delegation ledger: the builder pass ran no read-only subagents; the fixer
  round below records the required independent audits and supersedes the
  six-page assertion line above.
  Skills: no registry skill matched.
  - the Builder

- 2026-10-26 (fixer, release-copy reconciliation on PR #759): reconciled the
  shipped release copy to the published candidate after the Maintainer's
  #683 finding. `releases.html` now names `maze-chase-v0.1.0-rc.1`
  (published 2026-10-25, prerelease), links the release tag and release run
  40161835683, lists the twelve published artifacts plus the combined
  `SHA256SUMS.txt`, and keeps the stable `maze-chase-v1.0.0` tag gated on
  the final checks. `downloads.html` reports the same published candidate in
  the release-status callout, moves the four Windows and macOS rows from
  "Native release job" to "Published (unsigned)", and cites the release and
  run links. The README, release guide, feature matrix, and compatibility
  page now cite the native release jobs and the published prerelease instead
  of "once the release workflow is installed", keeping the #582 and #683
  tracking references and the unsigned and prerelease qualifications. The
  macOS and Windows terminal compatibility rows stay awaiting host and
  unclaimed. Updated the tester copy pins in `tester_site.rs` and
  `tester_packaging.rs` to require the published candidate, run, prerelease,
  unsigned, and #683 facts while rejecting signing and stable-release
  claims. Verification: `node tools/site/render-docs.mjs --check` 15 docs
  current with 398 links; `tester_site` 6/6, `tester_packaging` 27/27,
  `tester_docs_language` 2/2; `cargo fmt --all --check` clean. No rebase was
  performed, per the Maintainer's instruction; no production logic or
  protected path changed. Delegation ledger: the primary context read the
  release and run evidence from the GitHub API, checked every stale copy
  site in the tree, and ran the renderer and suites; no subagent was needed
  for this copy-only change. Skills: no registry skill matched.
  - the Fixer

- 2026-10-26 (fixer, review round F1-F10 on `2c363f7e`): applied the
  reviewer's ten findings. F1/F2/F9: `site.css` now pins `scroll-padding-top`
  for the sticky header, gives the docs grid and cards `min-width: 0`, lets
  long inline code wrap, wraps wide tables in `.table-scroll`, and at mobile
  widths makes the Site menu static and keeps its opened nav inside the
  390px viewport; the docs sidebar scrolls instead of consuming the first
  viewport. F3: `site-e2e.js` discovers all 20 shipped pages (15 rendered docs
  plus five hand-written pages), measures `documentElement.clientWidth`
  instead of `innerWidth`, tracks `Runtime.exceptionThrown`, checks the opened
  `details` nav rect, asserts zero console errors on every page, narrows the
  console allowlist to the exact media-policy notices, and takes the mobile
  screenshot on the game page. F4: `play.html` no longer claims a seed is
  read; `tester_site` asserts the exact query-and-fragment redirect script,
  and `site-e2e` exercises `play.html?seed=abc&view=1#game-main` in the
  browser. F5: the Rust suites share `tests/common/mod.rs`, crawl every same
  page fragment, reject `.md?query` links, derive the page list dynamically,
  and reject the expanded signing and stable-release phrase families while
  requiring the published rc.1 candidate and prerelease wording. F6: the
  renderer rejects unknown flags, renders unsafe schemes inert instead of
  active, escapes inline text exactly once, keeps escaped and in-code pipes
  in one table cell, rejects column mismatches, orphan outputs, project
  escaping links, and missing same-page or cross-page anchors, and keeps
  duplicate heading ids unique. F7: every rendered page carries an
  `output-fnv` body marker that `tester_site` recomputes. F8: corrected the
  release-status copy in this progress entry and the ideas file and recorded
  the delegation below. F10: the PR body was corrected after the push; it no
  longer claims unrun results.
  Verification: `node tools/site/render-docs.mjs --check` 15 docs current
  with 418 internal links; `tester_site` 6/6, `tester_packaging` 27/27,
  `tester_docs_language` 2/2; local `site-e2e.js` ALL GREEN with 650
  assertions (all 20 pages at 1280x900 and 390x844, opened Site menu
  12..378, legacy redirect preserved); `browser-e2e.js` ALL GREEN with 279
  assertions; `macos-case-audit.js` PASS with 568 targets across 21 HTML
  files; `cargo test --workspace --exclude maze-chase-desktop` 507 passed and
  `cargo clippy -p maze-chase-terminal --all-targets` is clean apart from the
  six pre-existing engine warnings (the desktop crate cannot build in this
  container because `alsa.pc` is absent); `cargo fmt --all --check` clean. No
  rebase was performed, per the
  Maintainer's instruction; no production logic or protected path changed.
  Delegation ledger: three independent read-only subagents ran. The mobile
  auditor measured all 20 pages at both viewports (40/40 zero-overflow),
  clicked the Site summary and measured the opened nav at 12..378, and
  checked the docs skip target, tabindex, focus, and 124px scroll padding on
  all 15 docs pages: all PASS. The renderer auditor tested ten cases in a
  throwaway copy (unknown flag, inert schemes, single escaping, unique ids,
  table pipes and mismatch, orphan outputs, path escape, same-page anchor,
  freshness, and stable output-fnv): all PASS, no hole. The Rust auditor ran
  the three suites (35 passed), the case audit, and the renderer check, and
  inspected the link, marker, redirect, and release-copy contracts: F4/F5/F7/F9
  PASS in the working tree. The primary context applied the fixes and ran the
  final browser and cargo commands. Skills: no registry skill matched.
  - the Fixer

- 2026-10-27 (fixer, Tester boot-gate finding on `d7c0c52e`): fixed the
  mobile boot-failure layout. `index.html` now caps the board with
  `max-width: 100%`, `wire()` sizes the canvas before the first frame, and
  `showError()` calls `sizeCanvas()` so a failed wasm boot can never leave
  the intrinsic 640px canvas widening the layout viewport. The Tester's
  boot-gate suite is green at both phone sizes: no horizontal overflow and
  the fixed error card fully inside the viewport (390x844: 12..378;
  320x568: 12..308). Two non-blocking renderer notes were also closed:
  `rewriteHref` rewrites query-suffixed `.md` links (`.md?plain=1` becomes
  `.html?plain=1`), and heading ids reserve the shell's `main` and
  `doc-content` ids so a heading can never collide with the skip target.
  Verification: `node tools/site/render-docs.mjs --check` 15 docs current
  with 418 internal links; `tester_site` 6/6, `tester_packaging` 27/27,
  `tester_docs_language` 2/2; `boot-gate-e2e.js` ALL GREEN (39 assertions
  including both mobile widths); `site-e2e.js` ALL GREEN with 650
  assertions; `browser-e2e.js` ALL GREEN with 279 assertions;
  `macos-case-audit.js` PASS with 568 targets across 21 HTML files. No
  rebase (per the Maintainer's instruction), no protected path, and no
  production game logic changed beyond the canvas sizing entry points.
  - the Fixer

- 2026-10-27 (fixer, Tester short-landscape finding on `5f9f0492`): made the
  opened Site menu reachable on short landscape phones. `site.css` now caps
  `.site-menu > nav` with `max-height: calc(100dvh - 100% - 20px)` (the same
  positioned header that anchors `top: calc(100% + 8px)` supplies the `100%`
  basis) and lets it scroll (`overflow-y: auto`), so six 44px links no longer
  run below a 320px-tall viewport. The Tester's committed landscape block is
  green: at 480x320 the nav is 140..308 and the last link 257..301 after
  scrolling; at 568x320 the nav is 84..308 and the last link 257..301, all
  inside 320. The non-blocking README layout line now names the playable game
  entry point instead of the retired "Pages hub" description. Verification:
  `site-e2e.js` ALL GREEN with 658 assertions (all 20 pages at 1280x900 and
  390x844, plus the game page at 480x320 and 568x320); `boot-gate-e2e.js` ALL
  GREEN with 39 assertions; `browser-e2e.js` ALL GREEN with 279 assertions;
  `node tools/site/render-docs.mjs --check` 15 docs current with 418 internal
  links; `tester_site` 6/6, `tester_packaging` 27/27,
  `tester_docs_language` 2/2; `macos-case-audit.js` PASS with 568 targets
  across 21 HTML files; `cargo fmt --all --check` clean. No rebase (per the
  Maintainer's instruction), no protected path, and no game logic changed.
  - the Fixer

- 2026-10-27 (fixer, follow-up review round on `d496c82d`): corrected the
  landscape menu fix and the remaining copy/contract gaps. Removed the
  `overscroll-behavior: contain` that made the uncapped open menu swallow
  wheel and touch scrolling; the menu scrolls itself only when the cap
  applies and otherwise leaves the page scrollable. Added a `min-width:
  781px` override that subtracts the details element's 16px offset, so the
  cap no longer overshoots the viewport above the mobile breakpoint, and
  corrected the CSS comment. `site-e2e.js` now proves a wheel over the
  uncapped open menu at 390x600 still scrolls the page. The downloads copy
  now states exactly what the release evidence covers (Linux and Windows
  install, launch, and uninstall; macOS bundle, dmg mount, tarball, and a
  real windowed probe) and `Maze Chase.app` is labelled as inside the dmg
  and tarball rather than a standalone asset. `render-docs.mjs` and the
  shared Rust crawler derive the root page list from the directory instead
  of a hardcoded list, so `play.html` and any future page stay covered.
  Verification: `site-e2e.js` ALL GREEN with 661 assertions (658 plus the
  three uncapped-menu wheel assertions) locally and against the deployed
  preview, with the browser cache disabled so a reused asset URL always
  tests the current build; `render-docs.mjs --check` 15 docs current with
  419 internal links (the dynamic root list now includes `play.html`);
  `tester_site` 6/6, `tester_packaging` 27/27,
  `tester_docs_language` 2/2; workspace excluding desktop 507 passed;
  `boot-gate-e2e.js` ALL GREEN with 39 assertions; `browser-e2e.js` ALL
  GREEN with 279 assertions; `macos-case-audit.js` PASS with 568 targets
  across 21 HTML files; `cargo fmt --all --check` was reported clean here
  but actually failed on two `tester_site.rs` assertions until the F1/F2
  repair entry below; the repair ran `cargo fmt --all` and re-checked it
  clean. No rebase (per the Maintainer's instruction), no protected path, and
  no game logic changed.
  Delegation ledger (recorded during the 2026-10-27 F1/F2 repair with live
  read-only audits of this round's output): three read-only general subagents
  ran. The menu auditor ran site-e2e (661 assertions) and measured the opened
  nav plus the 390x600 wheel probe at 480x320, 568x320, and desktop widths:
  PASS. The release-copy auditor verified the rc.1 release, run 40161835683,
  and every copy surface: PASS, no overclaim. The contract auditor exercised
  the dynamic page lists and renderer guards and ran the suites: PASS. The
  primary context re-ran fmt and the final suites. Skills: no registry skill
  matched.
  - the Fixer

- 2026-10-27 (fixer, review F1/F2 on `afba8eb9`): repaired the blocking
  `cargo fmt --all --check` failure (`tester_site.rs` assertion wrapping) by
  running `cargo fmt --all` and re-checking, corrected the false "fmt clean"
  claim in the preceding follow-up entry, and recorded the missing delegation
  ledger there. Verification: `cargo fmt --all --check` exit 0;
  `render-docs.mjs --check` 15 docs current with 419 internal links;
  `tester_site` 6/6, `tester_packaging` 27/27, `tester_docs_language` 2/2.
  No rebase (per the Maintainer's instruction); project test file only.
  - the Fixer

- 2026-10-28 (builder, Final Phase on `opencode/issue582-20261028002308`):
  run started. Scope: re-sign the Linux terminal matrix and the Linux
  install, upgrade, and uninstall rows against the published
  `maze-chase-v0.1.0-rc.1` artifacts (release run 40161835683, tag commit
  `11a0037b`); run the deployed production Pages E2E for the game and every
  subpage; capture and evaluate the shipped visual and audio output; close
  the four Phase 7 follow-ups; and reconcile the findings ledger, release
  guide, and scoreboard. The macOS and Windows rows and the stable release
  cut remain per-OS and Maintainer work. Evidence is written as it lands;
  this entry is updated before the review handoff. - the Builder

- 2026-10-28 (builder, Final Phase evidence and follow-up closure on
  `opencode/issue582-20261028002308`): re-ran and re-signed all eight
  Linux terminal rows on the published rc.1 terminal binary (tag commit
  `11a0037b`, SHA-256 `9f6cd45a...`, `sources_dirty: false`) and
  committed the refreshed bundles and screenshots in `397b72f6`.
  Exercised the published `.deb`, `.rpm`, and tarball install,
  reinstall, and uninstall flows (settings file preserved across every
  reinstall; Fedora 41 rpm flow through `dnf` in a container), probed
  the packaged desktop binary under Xvfb on Debian and Fedora
  (1100x760 P6 frames), and captured title music plus gameplay effects
  from the release binary through a PulseAudio null sink (music peak
  0.1536 / RMS 0.0268; gameplay peak 0.4446 / RMS 0.0503 with 17,698
  samples above 0.2). The deployed production Pages site passed 661
  site assertions and 279 browser assertions with zero console errors.
  Fixed the four Phase 7 follow-ups: escaped docs navigation hrefs in
  `render-docs.mjs`; broadened the release-copy claim checker with a
  paraphrase matrix test; added `site-nav.js` to the four horizontal-nav
  subpages plus a 390px active-pill assertion (site-e2e now 670
  assertions); and ignored gameplay/menu keys while the too-small card
  is up except mute and title-Esc (new app test, plus a terminal doc
  sentence). Verification: `cargo test --workspace --no-fail-fast
  --locked` 631 passed / 0 failed, `tester_site` 7/7,
  `tester_packaging` 27/27, `render-docs.mjs --check` 15 docs current
  with 423 links, `maze-chase-verify` 19/19, `cargo fmt --all --check`
  clean, and site-e2e 670 assertions locally. Reconciled `terminal-compat.md`,
  `release.md`, `scoreboard.md`, and the findings ledger to the rc.1
  evidence. Delegation ledger: four read-only general subagents ran in
  parallel: the terminal key-guard review, the docs/evidence
  re-derivation, the site JS/E2E audit, and the progress/contract
  audit. The terminal audit found no key leak; the evidence audit
  matched all eight bundles to the published digest; the site audit
  found the 390px false-pass; the contract audit found the checklist
  overclaims. The primary context re-derived the rc.1 binary hash from the
  published tarball, ran the terminal crate suite, `maze-chase-verify`
  19/19, the 49 harness-contract tests, and `render-docs.mjs --check`,
  and owns the final diff. Skills: no registry skill matched.
  The macOS and Windows rows and the real-speaker review
  remain open; the stable tag stays gated. - the Builder

- 2026-10-28 (fixer, review round on PR #772 at head `71483395`): applied
  all three blocking findings and the eight non-blocking findings.
  Blocking: recorded the delegation ledger on the final builder entry;
  reworded the active phase and ledger checklist so #683 is tracked as
  open instead of claiming the Final Phase closed it, splitting the
  close-out line from the increment close; and reconciled the findings
  ledger (B.1/B.2/B.4 resolved with Phase 4 evidence, B.13/C.13 open
  under #683, Section I accepted open items). Non-blocking: a resize
  into the too-small card now clears an armed capture, and Back cancels
  an armed capture before the too-small key guard (test expanded across
  menu, play, pause, settings, and capture); the main loop reconciles a
  pending resize before delivering a key in the same batch; the signing
  claim checker now returns the hit as a value for positive and negative
  assertions instead of catching panics; `site-nav.js` re-reveals the
  active pill on resize/orientation change and site-e2e asserts the
  390px Releases pill is scrolled into view plus a 1280 to 390 resize
  case (local run: 673 assertions); `collect.py` attributes each frame
  to the phase containing its opening byte so a frame straddling a
  phase boundary is no longer dropped, with a contract test proving
  phase frame counts sum to the transcript total for every bundle; the
  committed truecolor row's refit phase now carries the straddling frame
  (54 to 55 frames, re-derived mean 43,145 bytes, 33.0 fps; the
  transcript itself is not committed, so the mean is re-derived from the
  phase and leftover byte residuals); `render-docs.mjs` decodes the four
  entities `escapeHtml` can emit in a single pass before resolving
  links; and the scoreboard/release guide now name the desktop probe
  command and qualify the transient frame, audio, and deployed-site
  console captures as uncommitted run artifacts, with the committed
  PPMs identified as current-tree reference captures. Public docs no
  longer defer the sound review to the Final Phase; it stays pending
  native macOS/Windows hosts. Verification: `cargo test -p
  maze-chase-terminal --no-fail-fast --locked` 276 passed / 0 failed,
  `cargo fmt --all --check` clean, `maze-chase-verify` 19/19,
  `test_harness_contract.py` 50/50 including the new frame-count test,
  `render-docs.mjs --check` 15 docs current with 423 links, and local
  site-e2e 673 assertions. Delegation ledger: three read-only explore
  subagents audited the terminal key/resize paths, the site nav/E2E
  evidence, and the docs/evidence reconciliation; the terminal audit
  confirmed the armed-capture gap, the site audit found the
  releases-only false-pass, and the docs audit found the straddling
  frame mismatch. The primary context made every edit, re-derived the
  bundle count, and ran the full verification set. Skills: no registry
  skill matched. The macOS and
  Windows rows and the real-speaker review remain open; the stable tag
  stays gated. - the Fixer

- 2026-10-28 (fixer, second review round on PR #772 at head `c1580c54`):
  applied the blocking public-record correction and the cheap
  non-blocking findings. Blocking: `compatibility.html` now names the
  published `maze-chase-v0.1.0-rc.1` terminal binary from tag commit
  `11a0037b` (SHA-256 `9f6cd45a`) and records that the raw transcript
  stays a host artifact, matching all eight committed evidence bundles;
  the historical scoreboard entry now says its `96dc2be2` bundles were
  superseded by the rc.1 re-sign instead of calling them the current
  capture set.
  Non-blocking: the README parity row now says the real-speaker review
  is pending native hosts; the release-copy claim checker matches
  signing phrases only at a word start (so "unsigned binary" and
  "unsigned release" pass), replaces the bare "now stable" phrase with
  "is now stable", and gains fixtures for "This is an unsigned binary."
  and "This is not now stable."; `site-nav.js` re-reveals the active
  pill on every debounced resize instead of only on width changes; and
  both delegation ledgers now record one result line per subagent. The
  earlier fixer entry's terminal-suite count is corrected to 276.
  Verification: `cargo test -p maze-chase-terminal --no-fail-fast
  --locked` 276 passed / 0 failed, `cargo fmt --all --check` clean,
  `render-docs.mjs --check` 15 docs current with 423 links, and the
  focused `release_claim_checker_catches_paraphrases` test passes.
  Delegation ledger: three read-only general subagents ran in parallel:
  the docs/evidence consistency audit, the claim-checker boundary
  audit, and the progress/ledger audit. The docs audit matched the
  compatibility page, README, and terminal matrix to all eight rc.1
  bundles; the claim-checker audit confirmed the boundary matrix and
  ran the focused test green; the ledger audit confirmed the result
  lines, the 276 count, and no new em dash. The primary context made
  every edit and ran the verification set. Skills: no registry skill
  matched. The macOS and Windows rows and the real-speaker review
  remain open; the stable tag stays gated. - the Fixer

- 2026-10-30 (fixer, macOS Tester fix round on merged `cdac92fb` at
  head `75fe4f51`): applied the blocking packaging defect and the
  macOS-only harness/E2E findings. Blocking: `macos-app.sh` now ad-hoc
  signs the staged app bundle (`codesign --force --deep --sign -`) and
  verifies it, because the linker-signed executable with no
  `CodeResources` made a quarantined download report
  "is damaged and can't be opened" instead of the unidentified-developer
  prompt; `smoke-macos.sh` runs `codesign --verify --deep --strict`
  before uploading; the docs now say the bundle is ad-hoc signed and
  the first launch uses Open Anyway (rc.1 remains the older unsigned
  prerelease). Harness: `run-macos.sh` applies `--initial` in Terminal,
  iTerm2, and Ghostty, and records the commit, portable SHA-256, and
  dirty flag like the Linux arm; `collect.py` records a
  too-small-card-only session as unverified instead of partial
  gameplay. E2E: the site nav overflow assertion is gated on real
  overflow and the resize re-reveal runs at 320x568; the browser fright
  route runs on a controlled 16 ms clock (frame-counted legs and polled
  early/tail windows), the mute cue target is polled, and theme labels
  are awaited before the contrast checks. The installed release
  workflow and the packaging source stay byte-identical; the
  release-note copy and the fresh-candidate dispatch landed on the
  fresh lane #783, so the signing guidance is also in the release
  notes. The published rc.1 rebuild from merged head remains a release
  action. Verification: `cargo test -p maze-chase-terminal --no-fail-fast
  --locked` 277 passed / 0 failed, `cargo fmt --all --check` clean,
  `maze-chase-verify` 19/19, `python3 tools/compat/tests/test_harness_contract.py`
  52/52, `render-docs.mjs --check` 15 docs current with 423 links,
  site E2E 673/673, and browser E2E 279/279 (Linux; the macOS lane
  re-runs its own suite). - the Fixer
