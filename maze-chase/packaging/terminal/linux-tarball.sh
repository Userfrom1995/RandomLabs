#!/usr/bin/env bash
# Build the terminal release and stage a portable tarball.
#
# Run on a Unix machine (Linux or macOS) with a Rust toolchain:
#   bash maze-chase/packaging/terminal/linux-tarball.sh
#
# Output: dist/maze-chase-terminal-<version>-<os>-<arch>.tar.gz with the
# binary, the install/uninstall scripts, and the launch guide. No system
# dependencies: the terminal
# game only needs crossterm (pure Rust) and a real terminal at runtime.
# The tarball name records the release machine (linux-x86_64,
# darwin-arm64, ...); cross-OS tarballs are never produced. On GNU tar
# hosts the archive is byte-stable across rebuilds from the same commit.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=maze-chase/packaging/common.sh
. "$HERE/../common.sh"

STAGE="$DIST/stage-terminal"
TARBALL="$DIST/maze-chase-terminal-$VERSION-$HOST_OS-$HOST_ARCH.tar.gz"

cargo build --release -p maze-chase-terminal --manifest-path "$ROOT/Cargo.toml"

rm -rf "$STAGE"
mkdir -p "$STAGE"
install -m 0755 "$ROOT/target/release/maze-chase-terminal" "$STAGE/maze-chase-terminal"
install -m 0755 "$HERE/install-linux.sh" "$STAGE/install-linux.sh"
install -m 0755 "$HERE/uninstall-linux.sh" "$STAGE/uninstall-linux.sh"
install -m 0644 "$ROOT/docs/terminal.md" "$STAGE/README-terminal.md"
install -m 0644 "$REPO_ROOT/LICENSE" "$STAGE/LICENSE"

mkdir -p "$DIST"
reproducible_targz "$STAGE" "$TARBALL"
echo "staged: $TARBALL"
echo "sha256: $(sha256_file "$TARBALL")"
tar -tzf "$TARBALL"
"$STAGE/maze-chase-terminal" --version
