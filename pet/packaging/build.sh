#!/bin/sh
# Build a one-file Desktop Pet binary on Linux or macOS.
# Usage: sh pet/packaging/build.sh [--noconsole]
# Output: dist/desktop-pet plus dist/SHA256SUMS.txt
set -eu

HERE=$(dirname "$0")
ROOT=$(cd "$HERE/../.." && pwd)
cd "$ROOT"

if ! command -v python3 >/dev/null 2>&1; then
  echo "error: python3 is required (3.10 or newer)" >&2
  exit 1
fi
python3 -c "import sys; raise SystemExit(0 if sys.version_info >= (3, 10) else 1)" \
  || { echo "error: Python 3.10 or newer is required" >&2; exit 1; }

if ! python3 -c "import PyInstaller" >/dev/null 2>&1; then
  echo "[pet] installing pyinstaller into this Python..."
  python3 -m pip install --quiet pyinstaller
fi

EXTRA=""
if [ "${1:-}" = "--noconsole" ]; then
  EXTRA="--noconsole"
  echo "[pet] window-only build requested (only 'gui' will work)"
fi

python3 -m PyInstaller --clean --noconfirm $EXTRA pet/packaging/desktop-pet.spec

BIN="dist/desktop-pet"
if [ ! -f "$BIN" ]; then
  echo "error: expected $BIN was not produced" >&2
  exit 1
fi

if command -v shasum >/dev/null 2>&1; then
  (cd dist && shasum -a 256 desktop-pet > SHA256SUMS.txt)
elif command -v sha256sum >/dev/null 2>&1; then
  (cd dist && sha256sum desktop-pet > SHA256SUMS.txt)
else
  echo "[pet] no shasum/sha256sum found, skipping checksums"
fi

if ! "$BIN" selftest >/dev/null; then
  echo "error: bundle selftest failed" >&2
  exit 1
fi
echo "[pet] selftest passed on the bundle"
echo "[pet] built $BIN"
ls -la dist/
