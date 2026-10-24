#!/usr/bin/env bash
# Build the Linux desktop release and stage a portable tarball.
#
# Output: dist/maze-chase-desktop-<version>-linux-<arch>.tar.gz containing
# the binary, the install/uninstall scripts, the .desktop entry, the XPM
# icon, and the launch guide.
#
# System needs (Debian/Ubuntu): sudo apt-get install libasound2-dev
# libudev-dev (build-time ALSA headers for rodio, udev headers for
# gamepad input) plus libxkbcommon0 and
# libxkbcommon-x11-0 (winit runtime). No other system packages.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=maze-chase/packaging/common.sh
. "$HERE/../common.sh"

STAGE="$DIST/stage-desktop"
TARBALL="$DIST/maze-chase-desktop-$VERSION-$HOST_OS-$HOST_ARCH.tar.gz"

cargo build --release --locked -p maze-chase-desktop --manifest-path "$ROOT/Cargo.toml"

rm -rf "$STAGE"
mkdir -p "$STAGE"
install -m 0755 "$ROOT/target/release/maze-chase-desktop" "$STAGE/maze-chase-desktop"
install -m 0755 "$HERE/install-linux.sh" "$STAGE/install-linux.sh"
install -m 0755 "$HERE/uninstall-linux.sh" "$STAGE/uninstall-linux.sh"
install -m 0644 "$HERE/maze-chase.desktop" "$STAGE/maze-chase.desktop"
install -m 0644 "$HERE/maze-chase.xpm" "$STAGE/maze-chase.xpm"
install -m 0644 "$ROOT/docs/desktop.md" "$STAGE/README-desktop.md"
install -m 0644 "$REPO_ROOT/LICENSE" "$STAGE/LICENSE"

mkdir -p "$DIST"
reproducible_targz "$STAGE" "$TARBALL"
echo "staged: $TARBALL"
echo "sha256: $(sha256_file "$TARBALL")"
tar -tzf "$TARBALL"
