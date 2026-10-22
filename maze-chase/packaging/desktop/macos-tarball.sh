#!/usr/bin/env bash
# Stage the macOS desktop app as a portable tarball. Useful for installing
# into ~/Applications without mounting a disk image.
#
#   bash maze-chase/packaging/desktop/macos-tarball.sh
#
# Output: dist/maze-chase-desktop-<version>-macos-<arch>.tar.gz with the
# .app bundle plus the launch guide and license.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=maze-chase/packaging/common.sh
. "$HERE/../common.sh"

bash "$HERE/macos-app.sh"

STAGE="$DIST/stage-macos"
TARBALL="$DIST/maze-chase-desktop-$VERSION-$HOST_OS-$HOST_ARCH.tar.gz"

rm -rf "$STAGE"
mkdir -p "$STAGE"
cp -a "$DIST/Maze Chase.app" "$STAGE/"
install -m 0644 "$ROOT/docs/desktop.md" "$STAGE/README-desktop.md"
install -m 0644 "$REPO_ROOT/LICENSE" "$STAGE/LICENSE"

reproducible_targz "$STAGE" "$TARBALL"
echo "staged: $TARBALL"
echo "sha256: $(sha256_file "$TARBALL")"
tar -tzf "$TARBALL"
