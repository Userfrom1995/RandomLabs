#!/usr/bin/env bash
# Build, package, smoke, and checksum every macOS release artifact.
#
#   bash maze-chase/packaging/release/stage-macos.sh [--probe]
#
# Outputs in maze-chase/dist/:
#   maze-chase-terminal-<version>-macos-<arch>.tar.gz
#   maze-chase-desktop-<version>-macos-<arch>.tar.gz
#   maze-chase-desktop-<version>-macos-<arch>.dmg
#   SHA256SUMS.txt
#
# --probe additionally drives a real windowed frame through --probe 1;
# the release job passes it on the macOS runner. The offered app is
# ad-hoc signed (no Developer ID), so the smoke verifies the bundle
# signature and binary rather than Gatekeeper acceptance.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=maze-chase/packaging/common.sh
. "$HERE/../common.sh"

PROBE=()
while [ $# -gt 0 ]; do
  case "$1" in
    --probe) PROBE=(--probe); shift ;;
    *) echo "unknown argument: $1" >&2; exit 2 ;;
  esac
done

PKG="$ROOT/packaging"

bash "$PKG/terminal/macos-tarball.sh"
bash "$PKG/desktop/macos-tarball.sh"
bash "$PKG/desktop/macos-dmg.sh"

TERMINAL_TAR="$DIST/maze-chase-terminal-$VERSION-macos-$HOST_ARCH.tar.gz"
DESKTOP_TAR="$DIST/maze-chase-desktop-$VERSION-macos-$HOST_ARCH.tar.gz"
DMG="$DIST/maze-chase-desktop-$VERSION-macos-$HOST_ARCH.dmg"
APP="$DIST/Maze Chase.app"

for artifact in "$TERMINAL_TAR" "$DESKTOP_TAR" "$DMG" "$APP"; do
  [ -e "$artifact" ] || {
    echo "missing staged artifact: $artifact" >&2
    exit 1
  }
done

if [ ${#PROBE[@]} -eq 0 ]; then
  bash "$HERE/smoke-macos.sh" \
    --app "$APP" \
    --dmg "$DMG" \
    --tarball "$DESKTOP_TAR" \
    --tarball "$TERMINAL_TAR"
else
  bash "$HERE/smoke-macos.sh" \
    --app "$APP" \
    --dmg "$DMG" \
    --tarball "$DESKTOP_TAR" \
    --tarball "$TERMINAL_TAR" \
    "${PROBE[@]}"
fi

write_checksums "$DIST" \
  "$(basename "$TERMINAL_TAR")" \
  "$(basename "$DESKTOP_TAR")" \
  "$(basename "$DMG")"
cat "$DIST/SHA256SUMS.txt"
