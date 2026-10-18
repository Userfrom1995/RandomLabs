# Maze Chase Verified Release: Native Parity Signed and Retirement Handoff

Final release pass for the Maze Chase Rust game (issue #582): the two
native per-OS verification passes are in on their real operating
systems, every platform defect they found is fixed and merged, and the
release record now claims exactly what was measured. This pass lands
the signed parity gate plus the unified released-product documentation;
no engine or layer code changes.

## What was built

- `maze-chase/docs/parity.md`: every row signed. The per-layer E2E row
  flips on the native runs (macOS 39068848280 with vehicle PR #631,
  Windows 39068849150 with vehicle PR #632), and a new "Native proof
  record" section documents each pass with its measured numbers; the
  "Retirement step" section records that #552 retires only by the
  Maintainer's explicit action after this release merges, with
  `pacman/` untouched by anything in this migration.
- `maze-chase/docs/scoreboard.md`: a new dated
  `2026-10-18 (cross-platform release verification)` section with the
  Linux release-machine rebuild (407 tests across 45 targets, verify
  19/19, byte-identical wasm, node plus browser E2E, packaging smoke)
  and both native passes (macOS 398/0 across 41 targets, PTY 28/28,
  staged `.app`, byte-identical wasm; Windows 374/0 across 41 targets,
  CLI matrix, ConPTY sessions, packaged zip and reference PPM
  byte-identical, three defects fixed and Council-verified). The
  trailing pending section becomes the completed native-proof record.
- `maze-chase/docs/feature-matrix.md`: the engine, ghost, and identity
  rows no longer carry stale `planned` layer columns (all three layers
  ship every mechanic), and the cross-cutting rows name their evidence
  per OS.
- `maze-chase/docs/legal.md`: the four flagged items (maze geometry
  similarity, lookalike sprites and sounds, cloned data tables,
  trademarked terms) are marked resolved with their resolving
  artifacts, satisfying the release obligation that resolved flags
  cite their resolution; the `levels/*.toml` reference is corrected to
  the real `.maze` layout path.
- Unified release presentation: `maze-chase/README.md`, the
  `maze-chase/index.html` hub, `maze-chase/docs/index.md`, and the
  root `README.md` plus landing page now present one released product
  (verified on Linux, macOS, and Windows) instead of "playable,
  verification in progress"; `maze-chase/docs/release.md` points at
  the verified record.

## Why this shape

The release bar in #582 is "implemented, tested, and verified against
acceptance criteria", and the parity doc was explicit that the native
rows gate the retirement. Both native passes ran, each found real
platform defects, and every one of those defects was fixed with
regression contracts that a review, the Tester, and the Quality
Council round independently executed red-before/green-after (the
Council scored the Windows fix round 9.8/10). The Linux side of this
pass re-proves the exact tree being shipped: workspace suite, golden
verify harness, byte-reproducible wasm build, node plus real-browser
E2E, and both packaging scripts staged, installed, and probed. With
every row backed by a named run, the PR may carry `Closes #582`; the
actual #552 retirement stays the Maintainer's separate explicit step
so the Python reference keeps working until that decision lands.

## Verified on this branch (Linux x86_64, Rust 1.99.0)

- `cargo test --workspace --no-fail-fast`: 407 passed, 0 failed across
  45 targets.
- `cargo run --release --bin maze-chase-verify`: 19/19, golden
  `23c17f89734e`, 0.2 us/tick.
- Wasm rebuild sha256
  `5ec2a05af55f7256a5603f7047446d319f342303d0194d8f2f8920f1ee9dea87`,
  byte-identical to the committed `web/maze-chase.wasm`.
- `cargo fmt --all --check` clean; clippy only the six documented
  pre-existing engine lints plus the pre-existing rng test lint.
- Node smokes and the headless-chromium CDP browser E2E: ALL GREEN.
- Terminal and desktop tarballs staged, installed to scratch prefixes,
  and probed (`--version`, and a real Xvfb `--probe 30` PPM for the
  desktop binary).

## Notes

- Two environment prerequisites surfaced during the Linux rebuild and
  were installed, not worked around: `libasound2-dev` plus
  `libudev-dev` (compile-time, already documented in `release.md`) and
  `libxkbcommon-x11-0` (winit runtime; the `tester_window_e2e` suite
  fails loudly without it, which is the intended behavior).
- Open follow-ups keep their own vehicles: the terminal key+SIGWINCH
  resize delay (#634) and the per-OS findings-report hardening
  (#608/#612 family). Neither blocks a parity row.
- The CRLF wasm-drift defect from the Windows pass is closed by the
  root `.gitattributes` LF pin plus the checkout-bytes regression
  contract, so a default Windows checkout can never silently change
  the shipped wasm bytes again.

- the Builder
