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
[41080938033](https://github.com/Userfrom1995/RandomLabs/actions/runs/41080938033),
which published the `maze-chase-v0.1.0-rc.2` prerelease with 13 assets.
The terminal and Windows binaries are unsigned; the macOS app is ad-hoc
signed, passes `codesign --verify --deep --strict`, and is not notarized.
The measured record lives in [scoreboard.md](scoreboard.md) and the signed
parity gate in [parity.md](parity.md).

## Toolchain

- Stable Rust 1.89 or newer (`rustc --version`). The workspace uses
  edition 2021 with no pinned nightly features; the locked dependency
  graph requires 1.89 for the desktop layer. The release pipeline pins
  Rust 1.99.0 for every native job (the toolchain that produced the
  committed WebAssembly bytes), and the release build, test, and
  verifier commands use `--locked` so `Cargo.lock` is enforced. The Linux
  job runs on Ubuntu 24.04, so the deb/rpm binaries are built against
  glibc 2.39 and declare that floor; the supported distribution list is
  Ubuntu 24.04+, Debian 13+, Fedora 40+, and RHEL 10+.
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
adds a numeric suffix such as `maze-chase-v0.1.0-rc.2`. Before any
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
because it is `<version>-1.<arch>.rpm` on disk; the RPM `Release` field
stays `1` for every candidate of the same workspace version, so the
release workflow's `<version>-1.<arch>.rpm` glob keeps matching. The deb
and rpm control metadata both declare the glibc 2.39 floor, and the
desktop packages declare their display runtime libraries. Candidate RPMs
of the same workspace version share the `0.1.0-1` NEVRA; see
[Install, upgrade, uninstall](#install-upgrade-uninstall).

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
payload, asserts the glibc floor and the desktop X11 dependency
metadata, installs and uninstalls the tarballs, and checks `--version`
and `--help`; `smoke-macos.sh` checks the bundle's `Info.plist`,
version, dmg mount, and tarball; `smoke-windows.ps1` extracts the zips,
runs the binaries, and, with `-Install`, silently installs the setup,
launches the installed binary, uninstalls, and confirms the files are
gone. `-Probe` / `--probe` additionally drives one real windowed frame
where the runner provides a display.

## Install, upgrade, uninstall

### Linux distribution floor

The Linux binaries are built on Ubuntu 24.04 against glibc 2.39, and
every package declares that floor. Supported hosts are Ubuntu 24.04+,
Debian 13+, Fedora 40+, and RHEL 10+. RHEL/Rocky 9 (glibc 2.34) and
Debian 12 / Ubuntu 22.04 (glibc 2.36/2.35) are below the floor and are
not supported: the RPM refuses to install, and the DEB declares
`libc6 (>= 2.39)` so a resolving install refuses. Forcing the package
past that check is not supported: on RHEL/Rocky 9 the binary aborts with
a missing `GLIBC_2.35` symbol, and on Debian 12 / Ubuntu 22.04 it starts
with a weak-version `GLIBC_2.39` warning but is still outside the
verified floor. Install the
deb with `apt` and the rpm with `dnf` so their declared dependencies
resolve:

```sh
sudo apt install ./maze-chase-terminal_<version>_<debarch>.deb    # Debian/Ubuntu
sudo dnf install ./maze-chase-terminal-<version>-1.<rpmarch>.rpm  # Fedora/RHEL
```

### Linux, terminal

Debian/Ubuntu:

```sh
sudo apt install ./maze-chase-terminal_<version>_<debarch>.deb
maze-chase-terminal --version
sudo apt remove maze-chase-terminal
```

If a previous `sudo dpkg -i` reported missing dependencies, complete it
with `sudo apt-get -f install` instead of forcing the package.

Fedora/RHEL:

```sh
sudo dnf install ./maze-chase-terminal-<version>-1.<rpmarch>.rpm
maze-chase-terminal --version
sudo dnf remove maze-chase-terminal
```

Upgrade a deb with `sudo apt install ./<newer deb>` (add `--reinstall`
when apt already considers the same version current) and an rpm with
`sudo dnf install ./<newer rpm>`. The RPM keeps `Release: 1`, so every
candidate of the same workspace version shares the `0.1.0-1` NEVRA:
replacing one candidate with another needs `sudo dnf reinstall
./<newer rpm>` or `sudo rpm -U --replacepkgs <newer rpm>`. A bare
`sudo rpm -U` refuses an identical NEVRA and leaves the old binary in
place. A newer workspace version (the stable cut) upgrades normally.

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
sudo apt install ./maze-chase-desktop_<version>_<debarch>.deb
# or: sudo dnf install ./maze-chase-desktop-<version>-1.<rpmarch>.rpm
maze-chase-desktop --version
sudo apt remove maze-chase-desktop   # or: sudo dnf remove maze-chase-desktop
```

`apt`/`dnf` resolve the declared runtime dependencies: ALSA, udev,
xkbcommon including the X11 backend, and the X11 and Wayland libraries
winit loads (`libxcursor1 libxrandr2 libxi6 libxinerama1 libx11-xcb1
libwayland-client0` on Debian/Ubuntu; `libXcursor libXrandr libXi
libXinerama libX11-xcb libwayland-client` on Fedora/RHEL). Install with
the resolving command so a minimal system gets them; `dpkg -i` and
`rpm -i` do not pull dependencies. The desktop package installs
`/usr/bin/maze-chase-desktop`, the desktop entry, and the icon, and its
removal scripts refresh the desktop and icon caches. The tarball installs
per-user with the same `install-linux.sh` / `uninstall-linux.sh` pair;
its runtime needs are the same list, and the glibc 2.39 floor above
applies. Candidate-to-candidate RPM replacement follows the same
`dnf reinstall` / `rpm -U --replacepkgs` rule as the terminal package.

### macOS, desktop

Open the dmg and drag `Maze Chase.app` to Applications, or extract the
tarball and copy `Maze Chase.app` there. The rc.2 app bundle is ad-hoc
signed and passes `codesign --verify --deep --strict`, so a quarantined
download shows the unidentified-developer dialog, not the damaged-app
dialog. It is not notarized and has no Apple Developer ID. On macOS 15
and later, approve it in System Settings > Privacy & Security >
Security > Open Anyway; a right-click Open can still end at the Not
Opened dialog with `Done`. The earlier rc.1 app is unchanged at tag
`11a0037b`; it fails code-signature verification and opens as damaged,
so install rc.2 instead. The desktop guide (`docs/desktop.md`) is copied
into the dmg and tarball as `README-desktop.md`; the published rc.2 asset
is immutable, so the corrected text ships in the next candidate. Upgrade
by replacing the app; uninstall by moving it to the Bin. Letting macOS
keep its settings is normal; remove `~/.maze-chase` to clear progress
and settings.

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
   `-rc.N` tags). A tag build publishes that exact tag. A dispatch
   build always cuts a fresh candidate: it takes the optional `rc`
   input, or picks the next unused `maze-chase-v<version>-rc.N` tag, so
   an existing candidate is never republished at a different commit.

Verify a download with:

```sh
sha256sum -c SHA256SUMS.txt          # Linux
shasum -a 256 -c SHA256SUMS.txt      # macOS
Get-FileHash -Algorithm SHA256 <file> # Windows PowerShell
```

The release notes for candidates cut by this pipeline state the signing
status: the terminal and Windows binaries are unsigned, and the macOS app
bundle is ad-hoc signed. The rc.2 notes state the ad-hoc signature and the
unidentified-developer (not damaged-app) outcome; the fuller
`codesign --verify --deep --strict` and not-notarized wording ships with
the next candidate. The published rc.1 release predates the ad-hoc signing
step, so its notes still describe an unsigned app; its macOS app fails
code-signature verification and opens as damaged, so install rc.2 instead.
The first-launch SmartScreen and
unidentified-developer prompts are expected; they are not a signature
claim. On macOS 15 and later, approve the app in System Settings >
Privacy & Security > Security > Open Anyway.

### Candidate and stable releases

The 0.1.0 candidate is tagged `maze-chase-v0.1.0-rc.2` and published as
a prerelease with 13 assets from release run
[41080938033](https://github.com/Userfrom1995/RandomLabs/actions/runs/41080938033).
The earlier rc.1 candidate is unchanged at tag commit `11a0037b`; its
macOS app fails code-signature verification and opens as damaged. Every
later repair candidate is cut as a new tag: a branch dispatch of
the release pipeline takes an optional `rc` input, or picks the next
unused `maze-chase-v0.1.0-rc.N` tag, so a published candidate is never
republished at a different commit. Before the stable release, re-run
every per-OS install, upgrade, and uninstall row against those artifacts
and re-sign the terminal matrix. Then bump the workspace version to
`1.0.0` and cut `maze-chase-v1.0.0` as a stable release. No stable tag
is cut while a binding check is open.

### Published-artifact verification (Linux)

On 2026-10-28 the published rc.1 assets were exercised on Ubuntu 24.04.5
LTS (Linux 6.17.0-1022-azure x86_64). The terminal compatibility matrix
was re-signed on the release terminal binary (SHA-256
`9f6cd45a440e37ddf22f9072a9991e7047284b7a04d7effa55e2ff3387b83c83`)
from tag commit `11a0037b`; all eight rows pass with
`build.sources_dirty: false`, and the measured numbers live in the
[terminal compatibility matrix](terminal-compat.md).

- The `.deb` packages install, report `0.1.0`, run a real PTY session,
  preserve settings across reinstall, and remove their binaries.
- The `.rpm` packages do the same inside a Fedora 41 container,
  including a `dnf reinstall` that keeps the settings file and a
  `dnf remove` that leaves user data in place.
- The tarballs install through the shipped `install-linux.sh --prefix`,
  reinstall over themselves without changing the binary or settings,
  and uninstall through `uninstall-linux.sh`.
- The packaged desktop binary renders a 1100x760 P6 frame under Xvfb
  on Debian and Fedora with
  `xvfb-run -a maze-chase-desktop --no-pad --probe 30 <out.ppm>` run
  from the unpacked package, and audio captured from the release
  binary through a PulseAudio null sink carries both the title music
  and gameplay effects. Those captures are transient host artifacts,
  not committed files; the committed `desktop-probe.ppm` and
  `desktop-gameplay.ppm` are current-tree reference captures for the
  desktop E2E, not rc.1 run evidence.
- The deployed Pages game passed 661 site assertions and 279 browser
  assertions against the production URL, with zero console errors. The
  commands are in the [release scoreboard](scoreboard.md); their
  console output was transient and is not committed, and the committed
  harnesses re-run the same commands.

At the time of that rc.1 pass, the macOS and Windows per-OS rows and the
real-speaker review remained open. The stable tag therefore stays gated.

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
