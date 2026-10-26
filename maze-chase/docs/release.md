# Maze Chase: reproducible build, packaging, and release guide

One set of instructions that rebuilds and ships every artifact from a
clean checkout: the engine checks, all three layers, the native
packages, and the committed WebAssembly blob. The version comes from one
place, and a release tag can never publish software built from a
different version.

The Linux packaging and smoke rows were executed on the release
container for this tree. The installed
`.github/workflows/maze-chase-release.yml` then built and smoke-tested
the Linux, Windows, and macOS rows in release run
[40161835683](https://github.com/Userfrom1995/RandomLabs/actions/runs/40161835683),
which published the unsigned `maze-chase-v0.1.0-rc.1` prerelease. The
measured record lives in [scoreboard.md](scoreboard.md) and the signed
parity gate in [parity.md](parity.md).

## Toolchain

- Stable Rust 1.89 or newer (`rustc --version`). The workspace uses
  edition 2021 with no pinned nightly features; the locked dependency
  graph requires 1.89 for the desktop layer. The release pipeline pins
  Rust 1.99.0 for every native job (the toolchain that produced the
  committed WebAssembly bytes), and the release build, test, and
  verifier commands use `--locked` so `Cargo.lock` is enforced.
- For the browser build: `rustup target add wasm32-unknown-unknown`.
- For the browser E2E: Node 22+ (the CDP harnesses use the built-in
  WebSocket; no npm packages) plus a headless chromium; serving uses
  `python3 -m http.server` (`python -m http.server` on Windows).
- Debian/Ubuntu packaging: `dpkg-dev`, `rpm`, `rpm2cpio`, `cpio`, plus
  `libasound2-dev` and `libudev-dev` for the desktop build, and
  `libxkbcommon-x11-0` so the Xvfb-gated windowed probe can load winit's
  XKB backend. Fedora/RHEL hosts only need the `rpm-build` equivalent of
  the RPM tools.
- macOS packaging: `hdiutil` (part of macOS) and the Xcode command line
  tools. Windows packaging: Inno Setup 6.3 or newer (`iscc.exe`; the
  installer uses `x64compatible`), installed by the release job.
- No cross-OS relabeling is allowed: the Windows zip and installer are
  built on Windows, the app and dmg on macOS, and the deb/rpm on the
  matching Linux architecture; the tarballs are built on the host named
  in the artifact.

## Verify the engine first

From `maze-chase/`:

```sh
cargo test --workspace --locked
cargo run --release --locked --bin maze-chase-verify
```

`cargo test` runs every crate suite (engine, assets, audio, config,
terminal, desktop, web, including golden replay hashes and headless
integration tests). `maze-chase-verify` runs the 19-row deterministic
harness, ending with `verify: 19/19 checks passed` plus the measured
`perf-headless` tick cost. Both must be fully green before packaging;
the [feature matrix](feature-matrix.md) and the
[scoreboard](scoreboard.md) record the expected results.

`cargo fmt --check` must be clean; `cargo clippy --workspace` must
introduce no new warnings (the pre-existing engine lints are documented
in the scoreboard and left untouched).

## Version and tag contract

`maze-chase/Cargo.toml` owns the version:

```toml
[workspace.package]
version = "0.1.0"
edition = "2021"
license = "MIT"
```

Every crate inherits it with `version.workspace = true`,
`edition.workspace = true`, and `license.workspace = true`. Packaging
scripts read the workspace version, so the binary, the package
metadata, the archive names, and the docs cannot drift.

A release tag is exactly `maze-chase-v<workspace version>`; a candidate
adds a numeric suffix such as `maze-chase-v0.1.0-rc.1`. Before any
build, the pipeline runs:

```sh
# tag ref (release)
bash maze-chase/packaging/release/check-tag.sh "$GITHUB_REF_NAME"
# branch dispatch (non-release)
bash maze-chase/packaging/release/check-tag.sh "$GITHUB_REF_NAME" --allow-branch
```

The gate fails closed on a mismatch, accepts the `-rc.N` form only
against the same workspace version, and treats a branch ref as a
non-release (a dispatch build is not a tag, so it must pass
`--allow-branch`). Never move or reuse a published tag.

## Build each layer

```sh
cd maze-chase
cargo build --release --locked -p maze-chase-terminal   # terminal game
cargo build --release --locked -p maze-chase-desktop     # desktop GUI
cargo build --release --locked --target wasm32-unknown-unknown -p maze-chase-web
cp target/wasm32-unknown-unknown/release/maze_chase_web.wasm web/maze-chase.wasm
```

The committed `web/maze-chase.wasm` is byte-reproducible from that
exact command with the recorded toolchain (Rust 1.99.0, rustc commit
`b940084d7eb6a299eb4bfeb8e34901bc051e7ac4`, which the artifact embeds;
no `wasm-bindgen`, zero imports). It is 212,472 bytes with sha256
`d6dd16bf8038ae5cbde4a81209e4835391dd4ace8a5e3eb1ef37d6b191c62ac0`,
and a second clean build reproduces the same bytes.
`packaging/release/check-wasm.sh` rebuilds it in a scratch target
directory and fails closed if the committed bytes differ. A different stable
release may produce different bytes. The page gates on the bridge ABI
version and fails loudly on the error card instead of misbehaving on a
mismatch. Play it by serving the directory over http
(`python3 -m http.server 8931`, or `python -m http.server 8931` on
Windows, inside `maze-chase/`, then open `index.html`); browsers refuse
`.wasm` over `file://`.

Smoke each binary:

```sh
./target/release/maze-chase-terminal --version
./target/release/maze-chase-desktop --version
node web/e2e/wasm-smoke.js
node web/e2e/tester-regression.js
```

## Artifact matrix

Every script runs from `maze-chase/` and stages into `dist/`
(git-ignored scratch, never committed). The `<version>` in every name is
the workspace version. The version segment in RPM names is `1.<arch>`
because it is `<version>-1.<arch>.rpm` on disk.

| Layer | OS | Command (native host) | Artifact |
|---|---|---|---|
| Terminal | Linux | `packaging/terminal/build-deb.sh` | `dist/maze-chase-terminal_<version>_<debarch>.deb` |
| Terminal | Linux | `packaging/terminal/build-rpm.sh` | `dist/maze-chase-terminal-<version>-1.<rpmarch>.rpm` |
| Terminal | Linux or macOS | `packaging/terminal/linux-tarball.sh` / `macos-tarball.sh` | `dist/maze-chase-terminal-<version>-<os>-<arch>.tar.gz` |
| Terminal | Windows | `packaging/terminal/windows-zip.ps1` | `dist/maze-chase-terminal-<version>-windows-x86_64.zip` |
| Desktop | Linux | `packaging/desktop/build-deb.sh` | `dist/maze-chase-desktop_<version>_<debarch>.deb` |
| Desktop | Linux | `packaging/desktop/build-rpm.sh` | `dist/maze-chase-desktop-<version>-1.<rpmarch>.rpm` |
| Desktop | Linux or macOS | `packaging/desktop/linux-tarball.sh` / `macos-tarball.sh` | `dist/maze-chase-desktop-<version>-<os>-<arch>.tar.gz` |
| Desktop | Windows | `packaging/desktop/windows-zip.ps1` | `dist/maze-chase-desktop-<version>-windows-x86_64.zip` |
| Desktop | Windows | `packaging/desktop/windows-installer.ps1` | `dist/maze-chase-desktop-<version>-windows-x86_64-setup.exe` |
| Desktop | macOS | `packaging/desktop/macos-app.sh` | `dist/Maze Chase.app` |
| Desktop | macOS | `packaging/desktop/macos-dmg.sh` | `dist/maze-chase-desktop-<version>-macos-<arch>.dmg` |
| Browser | any (Pages serves `main`) | the wasm command above | live at `maze-chase/index.html` |

The tar archives and Windows zips are deterministic. The tarballs are
created with `SOURCE_DATE_EPOCH` (the release job uses the commit
timestamp), sorted entry order, fixed owner and modes (the stage
directory mode is pinned so the caller's umask cannot leak into the
archive), and no gzip timestamp. GNU tar does this directly on Linux;
macOS falls back to a Python `tarfile` writer with the same pins, and a
host with neither tool fails loudly instead of publishing an unpinned
archive. The Windows zips sort their entries and stamp each one with
`SOURCE_DATE_EPOCH`. The macOS disk image is not byte-reproducible
because `hdiutil` records image metadata, so the release publishes its
SHA-256 instead of claiming identical rebuilds. Rebuilding a host's
tarballs or zips twice on the same commit in the same toolchain
environment produces byte-identical archives; the checksum manifest
verifies the published bytes.

`packaging/release/stage-linux.sh` builds, smokes, and checksums all six
Linux artifacts at once and reports `SHA256SUMS.txt`.
`stage-macos.sh [--probe]` and `stage-windows.ps1 [-Install] [-Probe]`
do the same for their natives. Their smoke harnesses are the contract:
`smoke-linux.sh` unpacks each deb/rpm and runs the binary from the
payload, installs and uninstalls the tarballs, and checks `--version`
and `--help`; `smoke-macos.sh` checks the bundle's `Info.plist`,
version, dmg mount, and tarball; `smoke-windows.ps1` extracts the zips,
runs the binaries, and, with `-Install`, silently installs the setup,
launches the installed binary, uninstalls, and confirms the files are
gone. `-Probe` / `--probe` additionally drives one real windowed frame
where the runner provides a display.

## Install, upgrade, uninstall

### Linux, terminal

Debian/Ubuntu:

```sh
sudo dpkg -i maze-chase-terminal_<version>_<debarch>.deb
maze-chase-terminal --version
sudo apt-get remove maze-chase-terminal
```

Fedora/RHEL:

```sh
sudo rpm -i maze-chase-terminal-<version>-1.<rpmarch>.rpm
maze-chase-terminal --version
sudo rpm -e maze-chase-terminal
```

Upgrade with `sudo dpkg -i <newer deb>` or `sudo rpm -U <newer rpm>`.
The tarball path needs no root for the default per-user install; the
system-wide option is explicit about `sudo`:

```sh
mkdir maze-chase-terminal && tar -xzf maze-chase-terminal-<version>-linux-<arch>.tar.gz -C maze-chase-terminal
cd maze-chase-terminal
./install-linux.sh                                  # $HOME/.local, prints the --version probe
sudo ./install-linux.sh --prefix /opt/maze-chase    # system-wide
./uninstall-linux.sh                                # removes the $HOME/.local install
sudo ./uninstall-linux.sh --prefix /opt/maze-chase  # removes the /opt install
```

### Linux, desktop

```sh
sudo dpkg -i maze-chase-desktop_<version>_<debarch>.deb
# or: sudo rpm -i maze-chase-desktop-<version>-1.<rpmarch>.rpm
maze-chase-desktop --version
sudo apt-get remove maze-chase-desktop   # or: sudo rpm -e maze-chase-desktop
```

The desktop package installs `/usr/bin/maze-chase-desktop`, the desktop
entry, and the icon, and its removal scripts refresh the desktop and
icon caches. The tarball installs per-user with the same
`install-linux.sh` / `uninstall-linux.sh` pair.

### macOS, desktop

Open the dmg and drag `Maze Chase.app` to Applications, or extract the
tarball and copy `Maze Chase.app` there. The app is unsigned, so the
first launch needs a right-click Open (or System Settings, Privacy &
Security, Open Anyway). Upgrade by replacing the app; uninstall by
moving it to the Bin. Letting macOS keep its settings is normal; remove
`~/.maze-chase` to clear progress and settings.

### macOS, terminal

Extract the terminal tarball and run its `install-linux.sh` (the script
is portable to macOS) or run the binary in place. Remove the installed
binary and launch doc with `uninstall-linux.sh`, adding
`--purge-config` to remove saved settings.

### Windows, desktop

Run `maze-chase-desktop-<version>-windows-x86_64-setup.exe`. The
installer is per-user, asks for no administrator rights, and offers
Start Menu and optional desktop shortcuts. Upgrade by running the newer
setup over the old install; uninstall from Settings > Apps (the setup
registers a standard uninstaller). The zip is the portable option:
extract it and run
`maze-chase-desktop.exe`; delete the folder to remove it. SmartScreen
may warn because the binary is unsigned: choose More info, then Run
anyway.

### Windows, terminal

Extract `maze-chase-terminal-<version>-windows-x86_64.zip` and run
`maze-chase-terminal.exe`, or `cargo install --path maze-chase/crates/terminal`
from a checkout. Delete the extracted folder to uninstall.

### Clearing settings

Both layers keep settings and scores in `~/.maze-chase` (`$HOME` on
Linux and macOS, `%USERPROFILE%\.maze-chase` on Windows). The uninstall
scripts only remove launchers and programs unless `--purge-config` is
passed, and the Windows installer keeps user data on uninstall by
default so an upgrade or reinstall keeps progress.

## Release pipeline

`packaging/release/maze-chase-release.yml` is the workflow source (the
Lab Engineer installs it as `.github/workflows/maze-chase-release.yml`).
It runs on a `maze-chase-v*` tag or manual dispatch:

1. Each native job installs and pins Rust 1.99.0, checks tag/version
   parity, installs its packaging tools, runs
   `cargo test --workspace --locked` plus `maze-chase-verify`, and
   stages its host's artifacts. The Linux job also rebuilds the
   committed wasm and fails if the bytes differ.
2. The smoke scripts run on the same host; Windows does a real silent
   install, launch, and uninstall, and macOS drives a real frame with
   `--probe`.
3. Each job records `rustc --version`, `cargo --version`, and its
   runner image in `dist/toolchain-<os>.txt`, then uploads its payloads
   and `SHA256SUMS.txt`.
4. The publish job downloads every payload, folds the per-host
   toolchain records into the release notes, removes the records and
   per-host manifests, re-hashes the complete set into one
   `SHA256SUMS.txt`, and creates the GitHub Release (prerelease for
   `-rc.N` tags). A dispatch build refreshes
   `maze-chase-v<version>-rc.1` only when that tag already points at
   the tested commit; a tag build publishes that exact tag. A dispatch
   on a newer commit must cut the next `-rc.N` tag.

Verify a download with:

```sh
sha256sum -c SHA256SUMS.txt          # Linux
shasum -a 256 -c SHA256SUMS.txt      # macOS
Get-FileHash -Algorithm SHA256 <file> # Windows PowerShell
```

The release notes state the unsigned status. Windows SmartScreen and
macOS Gatekeeper warnings are expected; they are not a signature claim.

### Candidate and stable releases

The 0.1.0 candidate is tagged `maze-chase-v0.1.0-rc.1` and published as
an unsigned prerelease from release run
[40161835683](https://github.com/Userfrom1995/RandomLabs/actions/runs/40161835683).
Before the stable release, re-run every per-OS install, upgrade, and
uninstall row against those artifacts and re-sign the terminal matrix.
Then bump the workspace version to `1.0.0` and cut
`maze-chase-v1.0.0` as a stable release. No stable tag is cut while a
binding check is open.

## Clean-checkout release checklist

1. Fresh `git clone`, toolchain plus system libraries above.
2. `cargo test --workspace --locked` green, `maze-chase-verify` 19/19 green.
3. The three layer builds above, all four smoke probes green.
4. Tag parity passes for the intended tag.
5. Stage every applicable packaging row on its native OS and run its
   smoke harness; keep each host's `SHA256SUMS.txt`.
6. Re-run the per-layer E2E (terminal headless, desktop headless plus
   `--probe`, node smoke plus browser CDP) and append the measured
   numbers to the [scoreboard](scoreboard.md).
7. Confirm the [feature matrix](feature-matrix.md) cross-cutting rows
   and the [parity checklist](parity.md) that gated the #552 Python
   reference retirement (a separate, explicit step: nothing in
   `pacman/` is touched by any packaging script here).
