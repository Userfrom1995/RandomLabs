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

# Frozen entry is the packaging shim (absolute imports only). Freezing
# pet/__main__.py directly breaks: a frozen top-level __main__ has no
# parent package, so its relative imports raise ImportError at startup.
SPEC_DIR = os.path.dirname(os.path.abspath(SPEC))
ROOT = os.path.dirname(os.path.dirname(SPEC_DIR))
ENTRY = os.path.join(SPEC_DIR, "entry.py")


def _data_tree(src_dir, dest_dir):
    """Collect a source tree as PyInstaller datas, skipping caches.

    The bundle selftest runs the same suite as run-from-source, and the
    suite reads repo files (packaging scripts, hub/docs pages, README)
    through paths derived from each test module's __file__. Under
    PyInstaller __file__ points inside the _MEI extract dir, so the
    pet/ tree is bundled as data preserving its repo-relative layout:
    _MEI/pet/... mirrors <repo>/pet/..., and every file read resolves.
    """
    collected = []
    for base, dirs, files in os.walk(src_dir):
        dirs[:] = sorted(d for d in dirs if d != "__pycache__")
        for name in sorted(files):
            if name.endswith((".pyc", ".pyo")):
                continue
            full = os.path.join(base, name)
            rel = os.path.relpath(base, src_dir)
            dest = os.path.join(dest_dir, rel) if rel != "." else dest_dir
            collected.append((full, dest))
    return collected


a = Analysis(
    [ENTRY],
    pathex=[ROOT],
    binaries=[],
    datas=_data_tree(os.path.join(ROOT, "pet"), "pet"),
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
