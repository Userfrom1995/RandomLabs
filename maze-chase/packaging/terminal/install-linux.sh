#!/usr/bin/env bash
# Install the terminal build into a prefix (default: $HOME/.local).
#
# Usage: install-linux.sh [--prefix DIR] [--tarball FILE]
# With --tarball, installs from a linux-tarball.sh artifact; otherwise
# installs from the local release build plus the in-repo launch docs.
#
# Example:
#   bash maze-chase/packaging/terminal/linux-tarball.sh
#   bash maze-chase/packaging/terminal/install-linux.sh \
#     --tarball maze-chase/dist/maze-chase-terminal-0.1.0-linux-x86_64.tar.gz
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
  trap 'rm -rf "$WORK"' EXIT
  tar -xzf "$TARBALL" -C "$WORK"
fi

# Local mode installs the release binary from the workspace target dir.
LOCAL_BIN="$HERE/../../target/release/maze-chase-terminal"
BIN="$WORK/maze-chase-terminal"
[ -f "$BIN" ] || BIN="$LOCAL_BIN"

mkdir -p "$PREFIX/bin" "$PREFIX/share/doc/maze-chase"

if [ ! -f "$BIN" ]; then
  echo "no maze-chase-terminal binary in $WORK (build first or pass --tarball)" >&2
  exit 1
fi

cp "$BIN" "$PREFIX/bin/maze-chase-terminal"
chmod +x "$PREFIX/bin/maze-chase-terminal"
DOCS="$WORK/README-terminal.md"
[ -f "$DOCS" ] || DOCS="$HERE/../../docs/terminal.md"
[ -f "$DOCS" ] && cp "$DOCS" "$PREFIX/share/doc/maze-chase/README-terminal.md"

echo "installed maze-chase-terminal to $PREFIX/bin"
"$PREFIX/bin/maze-chase-terminal" --version
