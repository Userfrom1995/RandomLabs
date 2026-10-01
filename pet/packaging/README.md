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

## Download matrix

No binaries are checked into the repo. Build from the recipe above
for your OS, or run from source. Expected results:

| OS | Recipe | Artifact | Notes |
| --- | --- | --- | --- |
| Windows 10/11 | `packaging/build-windows.ps1` | `dist/desktop-pet.exe` | Registry Run key for start at login; notifications render in the speech bubble |
| macOS 13+ | `packaging/build.sh` | `dist/desktop-pet` | LaunchAgent plist for start at login; `osascript` notifications where allowed |
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
- `build.sh` - Linux/macOS build, checksum, and bundle selftest.
- `build-windows.ps1` - Windows build, checksum, and bundle selftest.
