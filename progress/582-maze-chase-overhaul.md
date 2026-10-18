# Progress - Maze-Chase Overhaul: Real-Terminal Polish, Releases, Identity

- **Issue:** #582 (parent vision, reopened 2026-10-18 by the owner directive; the
  migration epic is complete and archived in
  `progress/582-maze-chase-rust-migration.md`)
- **Branch:** opencode/issue582-20261018121223 (this roadmap PR); each phase runs
  on its own `opencode/issue582-overhaul-phase-<n>-<slug>` branch
- **Status:** in-progress
- **Updated:** 2026-10-18
- **Active Phase:** Phase 1: Product Reassessment and Real-Terminal Truth
- **Blueprint:** `ideas/2026-10-18-maze-chase-overhaul.md`
- **Findings ledger:** `progress/582-maze-chase-overhaul-findings.md` (created in
  Phase 1; every reassessment gap lives here until resolved or documented)

## Overhaul Roadmap

- Phase 1: Product Reassessment and Real-Terminal Truth: [x] real-terminal driver harness (`maze-chase/tools/compat/`: `run-linux.sh`, `run-macos.sh`, `run-windows.ps1`, `drive.sh`, `collect.py`, `README.md`), [x] reproduce the Owner's Ghostty and Kitty findings on current main with recorded evidence (kitty reply-loop flood plus input death, Ghostty mis-routing despite its kitty-graphics support; six executed Linux rows in `tools/compat/evidence/`), [x] critical reassessment of engine, layers, and docs claims (four parallel sweeps; Section B of the ledger), [x] findings ledger with every gap (`progress/582-maze-chase-overhaul-findings.md`), [x] honest compatibility matrix scaffold `maze-chase/docs/terminal-compat.md` (executed rows plus named executors for host-pending rows), [x] new sub-issues routed through the Maintainer (proposed set in ledger Section C; filing is the Maintainer's next step) (PR 1 target, Refs #582, Refs #655, Refs #661)
- Phase 2: Dynamic Terminal Layout and Full-Window Composition: [ ] geometry model with cell pixel size, [ ] pure layout solver with proportion-driven chrome blocks, [ ] exact-fit image rendering at the region pixel size, [ ] continuous cell-tier scales, [ ] resize contract with same-frame repaint and stale-placement kill, [ ] tier-aware too-small card, [ ] real-emulator resize proof on Linux and macOS (PR 2 target, Refs #582, Closes #656)
- Phase 3: Terminal Render Pipeline and Compatibility Proof: [ ] bounded live Kitty probe with byte replay (Ghostty enablement), [ ] atlas plus placement composition with full-frame fallback, [ ] dirty-change detection and wall-clock pacing with backpressure, [ ] Sixel path hardening, [ ] protocol-aware watchdog, [ ] `MAZE_CHASE_TRACE` JSONL evidence mode, [ ] kitty and ghostty rows signed on Linux and macOS plus conventional terminals (PR 3 target, Refs #582, Refs #655)
- Phase 4: Visual Identity Redesign: [ ] Design Council direction consumed (dispatched by the Maintainer before this phase), [ ] resolution-aware character and environment art, [ ] effects and animation system, [ ] refreshed themes with accessibility tests green, [ ] all three layers integrated with real captures (PR 4 target, Refs #582, Closes #658)
- Phase 5: Sound Design Overhaul: [ ] new musical score with one BPM source, [ ] soft short effect bank, [ ] mix architecture with fades and safe defaults, [ ] terminal chime policy default-off, [ ] per-layer real-host review and settings round-trip (PR 5 target, Refs #582, Closes #659)
- Phase 6: Release Engineering and Multi-Platform Distribution: [ ] version single source plus tag parity gate, [ ] Linux deb and rpm plus tarballs for both layers, [ ] Windows installer plus zip, [ ] macOS app plus dmg plus tarball, [ ] install/launch/uninstall smoke scripts, [ ] `maze-chase-release.yml` pipeline via the Lab Engineer, [ ] release candidate artifacts on the official Releases page, [ ] install/upgrade/uninstall docs (PR 6 target, Refs #582, Closes #657)
- Phase 7: Game-First Web Experience and Subpages: [ ] `maze-chase/index.html` boots directly into the game with no clutter, [ ] downloads, install, docs, compatibility, releases subpages, [ ] rendered docs on Pages with link checks, [ ] deployed-URL browser E2E including mobile (PR 7 target, Refs #582, Closes #660)
- Final Phase: Full-Product Verification and Release Sign-Off: [ ] full terminal matrix re-signed on the released artifacts, [ ] per-OS install/upgrade/uninstall from release artifacts, [ ] deployed Pages E2E for the game and every subpage, [ ] audio and visual craft evaluated on real captures, [ ] reassessment ledger fully resolved or documented, [ ] stable `maze-chase-v1.0.0` release cut, [ ] hub, README, and docs unified (Final PR, Refs #582, Closes #655, Closes #661, Closes #582)

## Current step

Phase 1 landed. The harness executes real emulator sessions on Linux
(kitty, Ghostty, xterm: six rows, all with committed evidence JSON and
screenshots) and ships the executors for the macOS and Windows arms.
The Owner's Kitty finding is reproduced and root-caused (terminal reply
loop feeds the event loop; measured 58-76 full PNG frames/s and dead
Esc/pause input), the Owner's Ghostty finding is reproduced (Ghostty
speaks kitty graphics; the auto-detect mis-routes it to cells), and the
findings ledger records every reassessment gap with evidence and a
target phase. Doc truth corrections for the false Ghostty claim and the
unqualified "released and verified" copy landed with it. Next: the
Maintainer files the ledger's sub-issue set, then Phase 2 (dynamic
layout and full-window composition) starts fresh from main.

## Next steps

- Builder: implement Phase 1 (PR 1) exactly as scoped; no product fixes, no
  compatibility claims without evidence; every finding names its evidence.
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
  segmentation, protocol counters, and tier observation), executed six
  real Linux rows with committed evidence, ran the strace experiment
  that isolated the kitty reply-loop, ran four reassessment sweeps
  (engine/assets/audio, desktop, web, docs), wrote the findings ledger
  and the honest compatibility matrix, and corrected the false Ghostty
  claim plus the unqualified release copy. No product fixes, per phase
  scope. - the Builder
