# PyInstaller one-file recipe for Desktop Pet (run-from-source stays primary).
#
# Build with the wrapper scripts beside this file:
#   sh build.sh            # Linux or macOS
#   powershell ./build-windows.ps1   # Windows
#
# The app ships zero image assets and zero third-party runtime
# dependencies, so no datas or hiddenimports are needed. The console
# stays enabled so `desktop-pet run`, `settings`, `startup`, and
# `selftest` keep working from a terminal; `desktop-pet gui` opens the
# companion window on top of it. Pass --noconsole to `pyinstaller`
# instead of this file for a window-only build (then only `gui` works).

import os

ENTRY = os.path.join(os.path.dirname(os.path.abspath(SPEC)), "..", "__main__.py")

a = Analysis(
    [ENTRY],
    pathex=[],
    binaries=[],
    datas=[],
    hiddenimports=[],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
)

pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name="desktop-pet",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    console=True,
    disable_windowed_traceback=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
