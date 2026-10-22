#!/usr/bin/env bash
# Remove a prefix install made by install-linux.sh.
#
# Usage: uninstall-linux.sh [--prefix DIR] [--purge-config]
# --purge-config also removes ~/.maze-chase (settings, scores, padmap).
set -euo pipefail

PREFIX="$HOME/.local"
PURGE=0

while [ $# -gt 0 ]; do
  case "$1" in
    --prefix) PREFIX="$2"; shift 2 ;;
    --purge-config) PURGE=1; shift ;;
    *) echo "unknown argument: $1" >&2; exit 2 ;;
  esac
done

rm -f "$PREFIX/bin/maze-chase-desktop"
rm -f "$PREFIX/share/applications/maze-chase.desktop"
rm -f "$PREFIX/share/icons/hicolor/11x11/apps/maze-chase.xpm"
rm -f "$PREFIX/share/doc/maze-chase/README-desktop.md"
rmdir "$PREFIX/share/doc/maze-chase" 2>/dev/null || true
if [ "$PURGE" -eq 1 ]; then
  rm -rf "$HOME/.maze-chase"
  echo "removed $HOME/.maze-chase (settings and scores)"
fi
echo "removed maze-chase-desktop from $PREFIX"
