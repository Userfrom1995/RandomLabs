# Maze Chase: reproducible build and release guide

One set of instructions that rebuilds every shippable artifact from a
clean checkout: the engine checks, all three publication layers, every
packaging script, and the committed WebAssembly blob. Follow this file
top to bottom on a fresh machine and you get the release. The verified
release executed these steps on Linux, macOS, and Windows; the measured
record lives in [scoreboard.md](scoreboard.md) and the signed parity
gate in [parity.md](parity.md).

## Toolchain

- Stable Rust 1.85 or newer (`rustc --version`). The workspace uses
  edition 2021 with no pinned nightly features.
- For the browser build: `rustup target add wasm32-unknown-unknown`.
- For the browser E2E: Node 18+ (no npm packages) plus a headless
  chromium; serving uses `python3 -m http.server` (`python -m
  http.server` on Windows).
- System libraries:
  - **Linux**: `sudo apt-get install libasound2-dev libudev-dev`
    (build-time ALSA headers for desktop audio, udev headers for
    gamepad input) plus `libxkbcommon0 libxkbcommon-x11-0` (winit
    runtime; most distributions already ship them). The terminal
    game and the engine need nothing beyond
    the Rust toolchain on any OS.
  - **Windows / macOS**: nothing beyond the Rust toolchain.

## Verify the engine first

From `maze-chase/`:

```sh
cargo test --workspace
cargo run --bin maze-chase-verify
```

`cargo test` runs every crate suite (engine, assets, audio, config,
terminal, desktop, web, including golden replay hashes and headless
integration tests). `maze-chase-verify` runs the 19-row deterministic
harness, ending with `verify: 19/19 checks passed` plus the measured
`perf-headless` tick cost. Both must be fully green before packaging;
the [feature matrix](feature-matrix.md) and the
[scoreboard](scoreboard.md) record the expected results.

`cargo fmt --check` must be clean; `cargo clippy --workspace` must
introduce no new warnings (six pre-existing engine lints from clippy
1.99 are documented in the scoreboard and left untouched).

## Build each layer

```sh
cd maze-chase
cargo build --release -p maze-chase-terminal   # terminal game
cargo build --release -p maze-chase-desktop     # desktop GUI
cargo build --release --target wasm32-unknown-unknown -p maze-chase-web
cp target/wasm32-unknown-unknown/release/maze_chase_web.wasm web/maze-chase.wasm
```

The committed `web/maze-chase.wasm` is byte-reproducible from that
exact command on stock stable Rust (no `wasm-bindgen`, zero imports);
the page gates on the bridge ABI version and fails loudly on the
error card instead of misbehaving on a mismatch. Play it by serving
the directory over http (`python3 -m http.server 8931`, or
`python -m http.server 8931` on Windows, inside `maze-chase/`, then
open `play.html`); browsers refuse `.wasm` over `file://`.

Smoke each binary:

```sh
./target/release/maze-chase-terminal --version
./target/release/maze-chase-desktop --version
node web/e2e/wasm-smoke.js
node web/e2e/tester-regression.js
```

## Packaging matrix

Every script is runnable from the repo root (`RandomLabs/`) and stages
into `maze-chase/dist/` (git-ignored scratch, never committed).

| Layer | OS | Script | Artifact |
|---|---|---|---|
| Terminal | Linux / macOS (build on the release machine; the name records it) | `maze-chase/packaging/terminal/linux-tarball.sh` | `dist/maze-chase-terminal-0.1.0-<os>-<arch>.tar.gz` (binary + launch docs) |
| Terminal | any Unix | `maze-chase/packaging/terminal/install-linux.sh [--tarball FILE] [--prefix DIR]` | installs to `$HOME/.local` by default, ends with a `--version` probe |
| Terminal | Windows | `cargo install --path maze-chase/crates/terminal` (documented fallback; crossterm is portable, no script yet) | `%CARGO_HOME%/bin/maze-chase-terminal.exe` |
| Desktop | Linux | `maze-chase/packaging/desktop/linux-tarball.sh` + `install-linux.sh [--tarball FILE] [--prefix DIR]` | `dist/maze-chase-desktop-0.1.0-linux-x86_64.tar.gz` (binary, `.desktop`, XPM icon, launch docs) |
| Desktop | Windows (run on Windows) | `maze-chase/packaging/desktop/windows-zip.ps1` | `dist/maze-chase-desktop-0.1.0-windows-x86_64.zip` (`.exe` + launch docs) |
| Desktop | macOS (run on a Mac) | `maze-chase/packaging/desktop/macos-app.sh` | `dist/Maze Chase.app` (bundle + `Info.plist`; unsigned, right-click Open on first launch) |
| Browser | any (GitHub Pages serves `main`) | commit `web/maze-chase.wasm` built by the command above | live at `maze-chase/play.html` with `play.html` + `web/maze-chase.js` |

Per-OS artifacts must be built on their own OS: a Linux runner cannot
produce the Windows zip or the macOS bundle, and no cross-OS tarball
is ever relabeled. Release from three machines (or three CI runners),
one row each, and record the measured results in the scoreboard.

## Versions

- Engine `0.3.0`; assets, audio, config, terminal, desktop, web each
  `0.1.0` (see each `crates/*/Cargo.toml`). `Cargo.lock` is committed,
  so a clean checkout resolves identical dependency versions.
- The tarball names carry the crate version read from `Cargo.toml` at
  stage time; the browser page carries the bridge ABI version
  (`mc_version() == 1`).

## Clean-checkout release checklist

1. Fresh `git clone`, toolchain plus system libraries above.
2. `cargo test --workspace` green, `maze-chase-verify` 19/19 green.
3. The three layer builds above, all four smoke probes green.
4. Stage every applicable packaging row on its native OS.
5. Re-run the per-layer E2E (terminal headless, desktop headless plus
   `--probe`, node smoke plus browser CDP) and append the measured
   numbers to the [scoreboard](scoreboard.md).
6. Confirm the [feature matrix](feature-matrix.md) cross-cutting rows
   and the [parity checklist](parity.md) that gated the #552 Python
   reference retirement (a separate, explicit step: nothing in
   `pacman/` is touched by any packaging script here).
