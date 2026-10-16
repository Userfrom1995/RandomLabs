# Maze Chase Final Phase: Packaging Verification and Release Audit

Release audit for the Maze Chase Rust game (issue #582): everything a
releaser needs that the seven build phases did not yet ship, with
measured proof instead of promises.

## What was built

- `maze-chase/packaging/terminal/`: `linux-tarball.sh` stages a
  versioned `dist/maze-chase-terminal-<version>-<os>-<arch>.tar.gz`
  (binary plus launch docs, contents listed, ends with a `--version`
  probe); `install-linux.sh` installs from a tarball or the local
  release build into a prefix (`--prefix`, `--tarball`, scratch-dir
  trap) and re-probes `--version`. Mirrors the desktop pair's CLI
  contract. The tarball name records the build machine; cross-OS
  relabeling is refused by design.
- `maze-chase/docs/release.md`: one top-to-bottom release path from a
  clean checkout (toolchain, system libraries, engine checks, layer
  builds, smoke probes, per-OS packaging matrix, versions,
  clean-checkout checklist). Folds in two factual corrections found
  while auditing: Linux desktop builds also need `libudev-dev`
  (gamepad input), backported to `docs/desktop.md` and the desktop
  tarball script header.
- `maze-chase/docs/parity.md`: the #552 retirement gate as a signed
  checklist. Every pinned behavior-spec rule (speeds, curves, clocks,
  chains, counters, modes) mapped to its `tuning.rs` constant and its
  verify row; all engine rows signed from real runs. The maze counts
  deliberately differ (Ember Warren 445+4 vs reference 282+4:
  feel-equivalent rules, original map). Native-OS package/E2E rows
  stay open, so `pacman/` is untouched and #552 stays functional.
- `maze-chase/docs/scoreboard.md`: measured release numbers only
  (0.8 us/tick over 12k ticks, 344/344 suites across 30 targets,
  node smokes ALL GREEN, fmt clean, clippy down to the six
  pre-existing engine lints after fixing two layer-test style notes).
  Frame budgets stated as design with measured anchors; nothing
  estimated.
- Tracker updates: matrix cross-cutting rows now carry test proof
  (retirement row honestly `planned`), terminal packaging row cites
  the new scripts, README/hub/docs-index link the three new docs in
  the unified product view.

## Why this shape

The release bar in #582 demands packaged artifacts plus reproducible
instructions plus published results plus a parity gate. The one gap no
Linux audit can close is native Windows/macOS proof, so the PR uses
`Refs #582` and the parity doc names the open rows instead of
claiming them. A releaser on each native OS follows `docs/release.md`
and appends a dated scoreboard section; the Maintainer takes the
explicit #552 retirement step afterwards.

## Key files

- `maze-chase/packaging/terminal/linux-tarball.sh`,
  `maze-chase/packaging/terminal/install-linux.sh`
- `maze-chase/docs/release.md`, `docs/scoreboard.md`,
  `docs/parity.md`
- `maze-chase/docs/feature-matrix.md` (cross-cutting),
  `maze-chase/docs/terminal.md` (package section),
  `maze-chase/docs/desktop.md` (udev correction),
  `maze-chase/README.md`, `maze-chase/index.html`,
  `maze-chase/docs/index.md`
- Smallest diffs: `crates/terminal/tests/headless.rs`
  (`assert_eq!(x, true)` to `assert!`), 
  `crates/desktop/tests/tester_evalfix.rs` (`chunks_exact(3)` to
  `chunks(3)` over a length-asserted buffer)

## Notes

- The full workspace test needed two system packages the docs
  under-stated (`libasound2-dev`, `libudev-dev`); both are now in
  every doc that lists prerequisites. The engine, terminal, and web
  crates genuinely need no system libraries.
- Clippy 1.99's six engine notes (`maze.rs`, `rng.rs`, `sha256.rs`)
  predate this phase and are left alone; `sha256.rs` is
  consensus-critical (golden hashes pin it).
- Delegation ledger: no subagents (single-crate packaging scripts
  plus three docs plus tracker updates the primary authored directly
  against the shipped workspace; only known skill customize-opencode
  covers opencode config, not game code).
