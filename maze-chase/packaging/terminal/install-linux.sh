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
#     --tarball maze-chase/dist/maze-chase-terminal-<version>-linux-x86_64.tar.gz
#
# Uninstall with uninstall-linux.sh in this directory.
set -euo pipefail

usage() {
  echo "usage: install-linux.sh [--prefix DIR] [--tarball FILE]" >&2
}

PREFIX="$HOME/.local"
TARBALL=""

while [ $# -gt 0 ]; do
  case "$1" in
    --prefix)
      if [ $# -lt 2 ] || [ -z "$2" ]; then usage; exit 2; fi
      PREFIX="$2"; shift 2 ;;
    --tarball)
      if [ $# -lt 2 ] || [ -z "$2" ]; then usage; exit 2; fi
      TARBALL="$2"; shift 2 ;;
    *) usage; echo "unknown argument: $1" >&2; exit 2 ;;
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
# A tarball install never falls back: a malformed archive must fail
# instead of silently installing a developer build.
LOCAL_BIN="$ROOT/target/release/maze-chase-terminal"
BIN="$WORK/maze-chase-terminal"
if [ -z "$TARBALL" ] && [ ! -f "$BIN" ]; then
  BIN="$LOCAL_BIN"
fi

if [ ! -f "$BIN" ]; then
  if [ -n "$TARBALL" ]; then
    echo "no maze-chase-terminal binary in tarball $TARBALL" >&2
  else
    echo "no maze-chase-terminal binary in $WORK (build first, or pass --tarball)" >&2
  fi
  exit 1
fi

mkdir -p "$PREFIX/bin" "$PREFIX/share/doc/maze-chase"

install -m 0755 "$BIN" "$PREFIX/bin/maze-chase-terminal"
DOCS="$WORK/README-terminal.md"
[ -f "$DOCS" ] || DOCS="$ROOT/docs/terminal.md"
[ -f "$DOCS" ] && install -m 0644 "$DOCS" "$PREFIX/share/doc/maze-chase/README-terminal.md"

echo "installed maze-chase-terminal to $PREFIX/bin"
printf 'uninstall: bash %q --prefix %q\n' "$HERE/uninstall-linux.sh" "$PREFIX"
"$PREFIX/bin/maze-chase-terminal" --version
