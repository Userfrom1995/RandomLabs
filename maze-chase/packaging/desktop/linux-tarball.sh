#!/usr/bin/env bash
# Build the Linux desktop release and stage a portable tarball.
#
# Output: dist/maze-chase-desktop-<version>-linux-x86_64.tar.gz containing
# the binary, the .desktop entry, the XPM icon, and the launch docs.
#
# System needs (Debian/Ubuntu): sudo apt-get install libasound2-dev
# (build-time ALSA headers for rodio) plus libxkbcommon0 and
# libxkbcommon-x11-0 (winit runtime). No other system packages.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
VERSION="$(grep '^version' "$ROOT/crates/desktop/Cargo.toml" | head -1 | cut -d'"' -f2)"
DIST="$ROOT/dist"
STAGE="$DIST/stage"

cargo build --release -p maze-chase-desktop --manifest-path "$ROOT/Cargo.toml"

rm -rf "$STAGE"
mkdir -p "$STAGE"
cp "$ROOT/target/release/maze-chase-desktop" "$STAGE/" 2>/dev/null \
  || cp "$ROOT/../target/release/maze-chase-desktop" "$STAGE/"
cp "$HERE/maze-chase.desktop" "$STAGE/"
cp "$HERE/maze-chase.xpm" "$STAGE/"
cp "$ROOT/docs/desktop.md" "$STAGE/README-desktop.md"

TARBALL="$DIST/maze-chase-desktop-$VERSION-linux-x86_64.tar.gz"
tar -czf "$TARBALL" -C "$STAGE" .
echo "staged: $TARBALL"
tar -tzf "$TARBALL"
