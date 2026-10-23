#!/usr/bin/env bash
# Build, package, smoke, and checksum every Linux release artifact.
#
#   bash maze-chase/packaging/release/stage-linux.sh
#
# Outputs in maze-chase/dist/:
#   maze-chase-terminal-<version>-linux-<arch>.tar.gz
#   maze-chase-desktop-<version>-linux-<arch>.tar.gz
#   maze-chase-terminal_<version>_<debarch>.deb
#   maze-chase-desktop_<version>_<debarch>.deb
#   maze-chase-terminal-<version>-1.<rpmarch>.rpm
#   maze-chase-desktop-<version>-1.<rpmarch>.rpm
#   SHA256SUMS.txt
#
# System needs: cargo, dpkg-dev, rpm-build, cpio, tar. The Ubuntu
# release job installs libasound2-dev and libudev-dev for the desktop
# build.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=maze-chase/packaging/common.sh
. "$HERE/../common.sh"

PKG="$ROOT/packaging"

bash "$PKG/terminal/linux-tarball.sh"
bash "$PKG/desktop/linux-tarball.sh"
bash "$PKG/terminal/build-deb.sh"
bash "$PKG/desktop/build-deb.sh"
bash "$PKG/terminal/build-rpm.sh"
bash "$PKG/desktop/build-rpm.sh"

TERMINAL_TAR="$DIST/maze-chase-terminal-$VERSION-$HOST_OS-$HOST_ARCH.tar.gz"
DESKTOP_TAR="$DIST/maze-chase-desktop-$VERSION-$HOST_OS-$HOST_ARCH.tar.gz"
TERMINAL_DEB="$DIST/maze-chase-terminal_${VERSION}_$(deb_arch).deb"
DESKTOP_DEB="$DIST/maze-chase-desktop_${VERSION}_$(deb_arch).deb"
# Name the RPM by the architecture this host builds: a stale
# same-version package for another architecture must never be picked by
# a directory-order glob.
TERMINAL_RPM="$DIST/maze-chase-terminal-$VERSION-1.$(rpm_arch).rpm"
DESKTOP_RPM="$DIST/maze-chase-desktop-$VERSION-1.$(rpm_arch).rpm"

ARTIFACTS=("$TERMINAL_TAR" "$DESKTOP_TAR" "$TERMINAL_DEB" "$DESKTOP_DEB" "$TERMINAL_RPM" "$DESKTOP_RPM")
for artifact in "${ARTIFACTS[@]}"; do
  [ -f "$artifact" ] || {
    echo "missing staged artifact: $artifact" >&2
    exit 1
  }
done

bash "$HERE/smoke-linux.sh" \
  --deb "$TERMINAL_DEB" --deb "$DESKTOP_DEB" \
  --rpm "$TERMINAL_RPM" --rpm "$DESKTOP_RPM" \
  --tarball "$TERMINAL_TAR" --tarball "$DESKTOP_TAR"

NAMES=()
for artifact in "${ARTIFACTS[@]}"; do
  NAMES+=("$(basename "$artifact")")
done
write_checksums "$DIST" "${NAMES[@]}"
cat "$DIST/SHA256SUMS.txt"
