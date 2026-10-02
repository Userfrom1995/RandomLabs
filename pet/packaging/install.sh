#!/usr/bin/env bash
# Install Desktop Pet from source on Linux or macOS (run-from-source path).
# Verifies Python 3.10+ (plus tkinter for the window), then optionally
# enables launch-at-login through the pet's own startup command.
# Usage: bash pet/packaging/install.sh [--service] [--character ID]
#   --service       point autostart at the background service
#   --character ID  select a starting character
set -euo pipefail

SERVICE="0"
CHARACTER=""
while [ "$#" -gt 0 ]; do
  case "$1" in
    --service) SERVICE="1"; shift ;;
    --character)
      if [ "$#" -lt 2 ] || [ -z "${2:-}" ]; then
        echo "error: --character needs a character id" >&2; exit 1
      fi
      CHARACTER="$2"; shift 2 ;;
    *) echo "error: unknown flag $1 (see pet/packaging/README.md)" >&2; exit 1 ;;
  esac
done

if ! command -v python3 >/dev/null 2>&1; then
  echo "error: python3 is required (3.10 or newer)" >&2
  exit 1
fi
python3 -c "import sys; raise SystemExit(0 if sys.version_info >= (3, 10) else 1)" \
  || { echo "error: Python 3.10 or newer is required" >&2; exit 1; }
if ! python3 -c "import tkinter" >/dev/null 2>&1; then
  echo "[pet] note: tkinter is missing, only headless commands will work" >&2
  echo "[pet] Linux: install your distro python3-tk package for the window" >&2
fi

HERE=$(dirname "$0")
ROOT=$(cd "$HERE/../.." && pwd)
cd "$ROOT"

if ! python3 -m pet selftest >/dev/null; then
  echo "error: pet selftest failed, refusing to install" >&2
  exit 1
fi
echo "[pet] selftest passed"

if [ -n "$CHARACTER" ]; then
  python3 -m pet characters switch "$CHARACTER" || {
    echo "error: unknown character '$CHARACTER'" >&2; exit 1; }
fi

if [ "$SERVICE" = "1" ]; then
  python3 -m pet startup on --service
else
  python3 -m pet startup on
fi
echo "[pet] installed: launch-at-login is on. Run 'python3 -m pet gui' to play."
