#!/usr/bin/env bash
# Build the terminal release and stage a portable tarball.
#
# Run from anywhere on a Unix machine (Linux or macOS) with a Rust
# toolchain installed:
#   bash maze-chase/packaging/terminal/linux-tarball.sh
#
# Output: dist/maze-chase-terminal-<version>-<os>-<arch>.tar.gz containing
# the binary plus the launch docs. No system dependencies: the terminal
# game only needs crossterm (pure Rust) plus a real terminal at
# runtime. The tarball name records the machine that built it
# (linux-x86_64, darwin-arm64, ...); cross-OS tarballs are not produced,
# build one per release machine instead (see docs/release.md).
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
VERSION="$(grep '^version' "$ROOT/crates/terminal/Cargo.toml" | head -1 | cut -d'"' -f2)"
OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
ARCH="$(uname -m)"
DIST="$ROOT/dist"
STAGE="$DIST/stage-terminal"

cargo build --release -p maze-chase-terminal --manifest-path "$ROOT/Cargo.toml"

rm -rf "$STAGE"
mkdir -p "$STAGE"
cp "$ROOT/target/release/maze-chase-terminal" "$STAGE/" 2>/dev/null \
  || cp "$ROOT/../target/release/maze-chase-terminal" "$STAGE/"
cp "$ROOT/docs/terminal.md" "$STAGE/README-terminal.md"

TARBALL="$DIST/maze-chase-terminal-$VERSION-$OS-$ARCH.tar.gz"
tar -czf "$TARBALL" -C "$STAGE" .
echo "staged: $TARBALL"
tar -tzf "$TARBALL"
"$STAGE/maze-chase-terminal" --version
