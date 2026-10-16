#!/usr/bin/env bash
# Install the Linux desktop build into a prefix (default: $HOME/.local).
#
# Usage: install-linux.sh [--prefix DIR] [--tarball FILE]
# With --tarball, installs from a linux-tarball.sh artifact; otherwise
# installs from the local release build plus this directory's files.
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
WORK="$HERE"
if [ -n "$TARBALL" ]; then
  WORK="$(mktemp -d)"
  tar -xzf "$TARBALL" -C "$WORK"
fi

# Local mode installs the release binary from the workspace target dir.
LOCAL_BIN="$HERE/../../target/release/maze-chase-desktop"
BIN="$WORK/maze-chase-desktop"
[ -f "$BIN" ] || BIN="$LOCAL_BIN"

mkdir -p "$PREFIX/bin" "$PREFIX/share/applications" "$PREFIX/share/icons/hicolor/11x11/apps" "$PREFIX/share/doc/maze-chase"

BIN="$WORK/maze-chase-desktop"
if [ ! -f "$BIN" ]; then
  echo "no maze-chase-desktop binary in $WORK (build first or pass --tarball)" >&2
  exit 1
fi

cp "$BIN" "$PREFIX/bin/maze-chase-desktop"
chmod +x "$PREFIX/bin/maze-chase-desktop"
cp "$WORK/maze-chase.desktop" "$PREFIX/share/applications/maze-chase.desktop"
cp "$WORK/maze-chase.xpm" "$PREFIX/share/icons/hicolor/11x11/apps/maze-chase.xpm"
DOCS="$WORK/README-desktop.md"
[ -f "$DOCS" ] || DOCS="$HERE/../../docs/desktop.md"
[ -f "$DOCS" ] && cp "$DOCS" "$PREFIX/share/doc/maze-chase/README-desktop.md"

update-desktop-database "$PREFIX/share/applications" >/dev/null 2>&1 || true
echo "installed maze-chase-desktop to $PREFIX/bin"
"$PREFIX/bin/maze-chase-desktop" --version
