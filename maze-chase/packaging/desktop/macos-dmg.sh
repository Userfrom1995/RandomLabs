#!/usr/bin/env bash
# Build the macOS disk image for the desktop game.
#
# Run on macOS:
#   bash maze-chase/packaging/desktop/macos-dmg.sh
#
# Output: dist/maze-chase-desktop-<version>-macos-<arch>.dmg with the
# .app, the launch guide, and the license. The image is unsigned; the
# first launch needs a right-click Open, then Gatekeeper remembers it.
# Disk images are not byte-reproducible (hdiutil records image metadata),
# so the release publishes their SHA-256 instead of claiming identical
# rebuilds.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=maze-chase/packaging/common.sh
. "$HERE/../common.sh"

require_command hdiutil "run on macOS"

bash "$HERE/macos-app.sh"

STAGE="$DIST/stage-dmg"
DMG="$DIST/maze-chase-desktop-$VERSION-$HOST_OS-$HOST_ARCH.dmg"

rm -rf "$STAGE"
mkdir -p "$STAGE"
cp -a "$DIST/Maze Chase.app" "$STAGE/"
install -m 0644 "$ROOT/docs/desktop.md" "$STAGE/README-desktop.md"
install -m 0644 "$REPO_ROOT/LICENSE" "$STAGE/LICENSE"

rm -f "$DMG"
hdiutil create \
  -volname "Maze Chase $VERSION" \
  -srcfolder "$STAGE" \
  -ov -format UDZO \
  "$DMG" >/dev/null
echo "staged: $DMG"
echo "sha256: $(sha256_file "$DMG")"
hdiutil imageinfo "$DMG" | sed -n '1,12p'
