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

Build the one-file binary first (above), then wrap it per OS:

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
```

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

No binaries are checked into the repo. Build from the recipe above
for your OS, or run from source. Expected results:

| OS | Recipe | Artifact | Notes |
| --- | --- | --- | --- |
| Windows 10/11 | `packaging/desktop-pet.iss` | `dist/desktop-pet-setup-1.5.0.exe` | Per-user install, Start Menu entries, optional login task; uninstaller removes app plus autostart, keeps saves |
| Windows 10/11 | `packaging/build-windows.ps1` | `dist/desktop-pet.exe` | Registry Run key for start at login; notifications render in the speech bubble |
| macOS 13+ | `packaging/build-macos.sh` | `dist/DesktopPet-1.5.0.pkg`, `dist/DesktopPet-1.5.0.dmg` | App bundle (tray-friendly, no dock icon); pkg installs the app only, login service via `startup on --service`; `osascript` notifications where allowed |
| macOS 13+ | `packaging/build.sh` | `dist/desktop-pet` | LaunchAgent plist for start at login; `osascript` notifications where allowed |
| Linux (X11/Wayland) | `packaging/build-linux.sh` | `dist/desktop-pet_1.5.0_amd64.deb`, `dist/DesktopPet-1.5.0-x86_64.AppImage` | Desktop entry plus disabled-by-default XDG autostart; `notify-send` notifications where installed |
| Linux (X11/Wayland) | `packaging/build.sh` | `dist/desktop-pet` | XDG autostart entry for start at login; `notify-send` notifications where installed |

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
- `install.sh` / `uninstall.sh` - run-from-source install and clean removal (Linux/macOS).
- `install.ps1` / `uninstall.ps1` - run-from-source install and clean removal (Windows).
