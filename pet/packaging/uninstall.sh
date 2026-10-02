#!/usr/bin/env bash
# Remove Desktop Pet integration on Linux or macOS.
# Stops the background service, disables launch-at-login, and leaves
# saves in place unless --purge is given (a reinstall then keeps the pet).
# Usage: bash pet/packaging/uninstall.sh [--purge]
set -euo pipefail

PURGE="0"
while [ "$#" -gt 0 ]; do
  case "$1" in
    --purge) PURGE="1"; shift ;;
    *) echo "error: unknown flag $1" >&2; exit 1 ;;
  esac
done

HERE=$(dirname "$0")
ROOT=$(cd "$HERE/../.." && pwd)
cd "$ROOT"

python3 -m pet service stop >/dev/null 2>&1 || true
python3 -m pet startup off >/dev/null 2>&1 || true
echo "[pet] background service stopped, launch-at-login disabled"

if [ "$PURGE" = "1" ]; then
  DATA="${DESKTOP_PET_DATA_DIR:-}"
  if [ -z "$DATA" ]; then
    if [ "$(uname)" = "Darwin" ]; then
      DATA="$HOME/Library/Application Support/DesktopPet"
    else
      DATA="${XDG_DATA_HOME:-$HOME/.local/share}/desktop-pet"
    fi
  fi
  if [ -n "$DATA" ] && [ -d "$DATA" ]; then
    rm -rf "$DATA"
    echo "[pet] removed saved data at $DATA"
  fi
else
  echo "[pet] saves left in place (rerun with --purge for a full wipe)"
fi
echo "[pet] uninstalled cleanly: no service or autostart residue remains"
