#!/usr/bin/env bash
# Install the Linux desktop build into a prefix (default: $HOME/.local).
#
# Usage: install-linux.sh [--prefix DIR] [--tarball FILE]
# With --tarball, installs from a linux-tarball.sh artifact; otherwise
# installs from the local release build plus this directory's files.
#
# Uninstall with uninstall-linux.sh in this directory.
set -euo pipefail

PREFIX="$HOME/.local"
TARBALL=""

while [ $# -gt 0 ]; do
  case "$1" in
    --prefix) PREFIX="$2"; shift 2 ;;
    --tarball) TARBALL="$2"; shift 2 ;;
    *) echo "unknown argument: $1" >&2; exit 2 ;;
  esac
done

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
WORK="$HERE"
if [ -n "$TARBALL" ]; then
  WORK="$(mktemp -d)"
  trap 'rm -rf "$WORK"' EXIT
  tar -xzf "$TARBALL" -C "$WORK"
fi

# Local mode installs the release binary from the workspace target dir.
LOCAL_BIN="$ROOT/target/release/maze-chase-desktop"
BIN="$WORK/maze-chase-desktop"
[ -f "$BIN" ] || BIN="$LOCAL_BIN"

mkdir -p "$PREFIX/bin" "$PREFIX/share/applications" \
  "$PREFIX/share/icons/hicolor/11x11/apps" "$PREFIX/share/doc/maze-chase"

if [ ! -f "$BIN" ]; then
  echo "no maze-chase-desktop binary in $WORK (build first or pass --tarball)" >&2
  exit 1
fi

install -m 0755 "$BIN" "$PREFIX/bin/maze-chase-desktop"
install -m 0644 "$WORK/maze-chase.desktop" "$PREFIX/share/applications/maze-chase.desktop"
install -m 0644 "$WORK/maze-chase.xpm" "$PREFIX/share/icons/hicolor/11x11/apps/maze-chase.xpm"
DOCS="$WORK/README-desktop.md"
[ -f "$DOCS" ] || DOCS="$ROOT/docs/desktop.md"
[ -f "$DOCS" ] && install -m 0644 "$DOCS" "$PREFIX/share/doc/maze-chase/README-desktop.md"

if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database "$PREFIX/share/applications" >/dev/null 2>&1 || true
fi
echo "installed maze-chase-desktop to $PREFIX/bin"
echo "uninstall: bash $HERE/uninstall-linux.sh --prefix $PREFIX"
"$PREFIX/bin/maze-chase-desktop" --version
