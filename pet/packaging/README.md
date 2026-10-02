# Desktop Pet packaging

Run-from-source (`python -m pet`) is the primary install path on all
three OS families: the runtime is stdlib-only, so there is nothing to
install. The recipes here produce an optional one-file binary for
machines where a double-clickable app is nicer. PyInstaller is a
build-time tool only; it never ships inside the source tree and the
pet itself stays dependency-free.

## Build

Requires Python 3.10 or newer plus tkinter for the `gui` command
(Linux: your distro's `python3-tk` package; Windows and macOS bundle
it with python.org installers).

```sh
# Linux or macOS
sh pet/packaging/build.sh
./dist/desktop-pet selftest
./dist/desktop-pet gui

# Windows (PowerShell)
powershell -ExecutionPolicy Bypass -File pet\packaging\build-windows.ps1
.\dist\desktop-pet.exe selftest
.\dist\desktop-pet.exe gui
```

Each script prints the artifact, writes `dist/SHA256SUMS.txt`, and
runs `selftest` on the finished bundle before declaring success. A
window-only build (no terminal) is available on Linux/macOS with
`sh pet/packaging/build.sh --noconsole`; then only `gui` works.

## Native installers

Build the one-file binary first (above), then wrap it per OS
(version numbers in the examples below show the current release as
an example; every recipe stamps its own version from
`pet/__init__.py`, never a copied literal):

```sh
# Windows installer (needs Inno Setup 6: iscc on PATH, on Windows)
iscc pet\packaging\desktop-pet.iss
# -> dist/desktop-pet-setup-1.5.0.exe

# macOS app plus pkg plus dmg (on macOS)
bash pet/packaging/build-macos.sh
# -> dist/DesktopPet-1.5.0.pkg, dist/DesktopPet-1.5.0.dmg,
#    dist/com.desktoppet.service.plist
# (the pkg installs the app bundle only; enable the login service
# afterwards with `desktop-pet startup on --service`)

# Linux deb plus AppImage (on Linux, needs dpkg-deb;
# appimagetool optional for the AppImage)
bash pet/packaging/build-linux.sh
# -> dist/desktop-pet_1.5.0_amd64.deb
# -> dist/DesktopPet-1.5.0-x86_64.AppImage (when appimagetool exists)

# Linux rpm (on Linux, needs rpmbuild)
bash pet/packaging/build-rpm.sh
# -> dist/desktop-pet-1.5.0-1.<arch>.rpm
# (same staged payload as the deb: binary, desktop entry, icon,
# disabled-by-default XDG autostart)
```

Every recipe derives its version from `pet/__init__.py`
(`python -m pet version --porcelain`) instead of carrying its own
literal; the static gate fails if a second literal appears in any
script. The Windows setup exe additionally takes
`/DMyAppVersion=<version>` on the `iscc` command line
(`build-windows.ps1` passes it automatically after the exe build).

## Release pipeline

`.github/workflows/pet-release.yml` builds all three OS families
natively (Windows exe plus setup, macOS app plus pkg plus dmg, Linux
deb plus AppImage plus rpm), smokes each artifact with the scripts
below, and publishes a versioned GitHub Release
(`desktop-pet-vX.Y.Z`) with every artifact plus a merged
`SHA256SUMS.txt`. Trigger: push a matching tag, or manual dispatch.
The publish job refuses to run when the tag disagrees with
`pet/__init__.py`, so the release version can never drift from the
single source.

## Smoke scripts

`smoke-linux.sh`, `smoke-macos.sh`, and `smoke-windows.ps1` are used
by both the release pipeline and the per-OS testers. Each one runs
the headless logic smoke (`version --porcelain` parity, `selftest`,
`characters list`, a service start/status/switch/stop cycle with
residue checks) against an isolated data dir, then verifies the
just-built packages (control metadata plus payload contents, name
carries the version). Pass `--install` on CI to really install and
uninstall again and assert no autostart or tray residue survives:

```sh
# Linux (root): install the deb and rpm for real, then remove them
sudo bash pet/packaging/smoke-linux.sh --binary dist/desktop-pet \
  --deb dist/desktop-pet_1.5.0_amd64.deb \
  --rpm dist/desktop-pet-1.5.0-1.*.rpm --install

# macOS: inspect app plus pkg plus dmg (install with --install)
bash pet/packaging/smoke-macos.sh --binary dist/desktop-pet \
  --app dist/DesktopPet.app --pkg dist/DesktopPet-1.5.0.pkg \
  --dmg dist/DesktopPet-1.5.0.dmg

# Windows (PowerShell)
powershell -ExecutionPolicy Bypass -File pet\packaging\smoke-windows.ps1 `
  -Binary dist\desktop-pet.exe -Setup dist\desktop-pet-setup-1.5.0.exe
```

All three are fail-closed and headless by construction (no window is
ever opened; installers are payload-inspected unless `--install` /
`-Install` is passed on CI). Where an installer tool is absent they
say so instead of passing silently. The honest-skip matrix is
exact: off macOS the pkg gets a name check only (`pkgutil`, `xar`,
and `hdiutil` are macOS-only); without `dpkg-deb` the deb gets a
name check only; without `rpm` the rpm gets a name check only; a
non-executable AppImage gets an existence check only. On the release
runners (`windows-latest`, `macos-latest`, `ubuntu-latest`) every
tool is present, so every check runs for real.

Every recipe is fail-closed (`set -euo pipefail` or
`$ErrorActionPreference = Stop`), writes checksums, and runs the
bundle `selftest` before declaring success.

## Quick install from source

No binary needed: the runtime is stdlib-only.

```sh
# Linux or macOS
bash pet/packaging/install.sh [--service] [--character ID]
bash pet/packaging/uninstall.sh [--purge]

# Windows (PowerShell)
powershell -ExecutionPolicy Bypass -File pet\packaging\install.ps1 [-Service] [-Character ID]
powershell -ExecutionPolicy Bypass -File pet\packaging\uninstall.ps1 [-Purge]
```

`install` verifies the interpreter, runs `selftest`, and enables
launch-at-login (`--service` points it at the background service).
`uninstall` stops the service and removes autostart, leaving saves in
place unless `--purge` (or `-Purge`) is given.

## Download matrix

Versioned installers are published on GitHub Releases
(`desktop-pet-vX.Y.Z`) by `.github/workflows/pet-release.yml`; no
binaries are checked into the repo. Build from the recipe above
for your OS, or run from source. Expected results (artifact names
show the current version as an example):

| OS | Recipe | Artifact | Notes |
| --- | --- | --- | --- |
| Windows 10/11 | `packaging/desktop-pet.iss` | `dist/desktop-pet-setup-1.5.0.exe` | Per-user install, Start Menu entries, optional login task; uninstaller removes app plus autostart, keeps saves |
| Windows 10/11 | `packaging/build-windows.ps1` | `dist/desktop-pet.exe` | Registry Run key for start at login; notifications render in the speech bubble |
| macOS 13+ | `packaging/build-macos.sh` | `dist/DesktopPet-1.5.0.pkg`, `dist/DesktopPet-1.5.0.dmg` | App bundle (tray-friendly, no dock icon); pkg installs the app only, login service via `startup on --service`; `osascript` notifications where allowed |
| macOS 13+ | `packaging/build.sh` | `dist/desktop-pet` | LaunchAgent plist for start at login; `osascript` notifications where allowed |
| Linux (X11/Wayland) | `packaging/build-linux.sh` | `dist/desktop-pet_1.5.0_amd64.deb`, `dist/DesktopPet-1.5.0-x86_64.AppImage` | Desktop entry plus disabled-by-default XDG autostart; `notify-send` notifications where installed |
| Linux (Fedora/RHEL/openSUSE) | `packaging/build-rpm.sh` | `dist/desktop-pet-1.5.0-1.<arch>.rpm` | Same payload as the deb; `notify-send` notifications where installed |
| Linux (X11/Wayland) | `packaging/build.sh` | `dist/desktop-pet` | XDG autostart entry for start at login; `notify-send` notifications where installed |

Release binaries are unsigned: Windows SmartScreen may warn (More
info plus Run anyway), macOS Gatekeeper needs a right-click plus
Open on first launch, and the AppImage needs `chmod +x`. Verify
every download against the release `SHA256SUMS.txt` before running
it.

Verify any binary you build or receive:

```sh
# Linux/macOS
shasum -a 256 dist/desktop-pet
# Windows (PowerShell)
Get-FileHash .\dist\desktop-pet.exe -Algorithm SHA256
```

Compare the digest against `dist/SHA256SUMS.txt` written by your own
build. The Pages hub links here instead of hosting downloads, so the
matrix can never drift from the recipes.

## Layout

- `desktop-pet.spec` - PyInstaller one-file recipe (console build, zero assets).
- `desktop-pet.iss` - Windows Inno Setup installer (per-user, login task, clean uninstall).
- `desktop-pet.svg` - Pet icon for the Linux desktop entry, deb, and AppImage.
- `build.sh` - Linux/macOS build, checksum, and bundle selftest.
- `build-windows.ps1` - Windows build, checksum, and bundle selftest.
- `build-macos.sh` - macOS app bundle, pkg installer, and dmg image.
- `build-linux.sh` - Linux deb package and AppImage.
- `build-rpm.sh` plus `desktop-pet.rpm.spec` - Linux rpm package.
- `smoke-linux.sh` / `smoke-macos.sh` / `smoke-windows.ps1` - per-OS
  install plus selftest plus service-cycle plus uninstall-clean smoke.
- `install.sh` / `uninstall.sh` - run-from-source install and clean removal (Linux/macOS).
- `install.ps1` / `uninstall.ps1` - run-from-source install and clean removal (Windows).
