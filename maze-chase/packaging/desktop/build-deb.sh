#!/usr/bin/env bash
# Build the desktop game as a Debian package.
#
# Run on Debian/Ubuntu (dpkg-deb comes with dpkg):
#   bash maze-chase/packaging/desktop/build-deb.sh
#
# Output: maze-chase/dist/maze-chase-desktop_<version>_<arch>.deb
# Installs the binary, desktop entry, icon, and launch guide under /usr;
# removes cleanly with `sudo apt remove maze-chase-desktop`.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=maze-chase/packaging/common.sh
. "$HERE/../common.sh"

require_command dpkg-deb "install dpkg-dev"
require_command cargo "install the Rust toolchain"

ARCH="$(deb_arch)"
STAGE="$DIST/deb-desktop"
PKG="maze-chase-desktop_${VERSION}_${ARCH}.deb"

cargo build --release -p maze-chase-desktop --manifest-path "$ROOT/Cargo.toml"

rm -rf "$STAGE"
mkdir -p "$STAGE/DEBIAN" \
  "$STAGE/usr/bin" \
  "$STAGE/usr/share/applications" \
  "$STAGE/usr/share/icons/hicolor/11x11/apps" \
  "$STAGE/usr/share/doc/maze-chase-desktop"

install -m 0755 "$ROOT/target/release/maze-chase-desktop" "$STAGE/usr/bin/maze-chase-desktop"
install -m 0644 "$HERE/maze-chase.desktop" "$STAGE/usr/share/applications/maze-chase.desktop"
install -m 0644 "$HERE/maze-chase.xpm" "$STAGE/usr/share/icons/hicolor/11x11/apps/maze-chase.xpm"
install -m 0644 "$ROOT/docs/desktop.md" "$STAGE/usr/share/doc/maze-chase-desktop/README.md"
# MIT requires the copyright notice and permission text in every
# distributed copy, so the deb copyright file is the repository LICENSE
# with a short package header, never a hand-written summary.
{
  printf 'Maze Chase desktop game %s\n\n' "$VERSION"
  cat "$REPO_ROOT/LICENSE"
} >"$STAGE/usr/share/doc/maze-chase-desktop/copyright"
chmod 0644 "$STAGE/usr/share/doc/maze-chase-desktop/copyright"

SIZE="$(du -sk "$STAGE/usr" | awk '{print $1}')"
cat >"$STAGE/DEBIAN/control" <<EOF
Package: maze-chase-desktop
Version: $VERSION
Section: games
Priority: optional
Architecture: $ARCH
Installed-Size: $SIZE
Depends: libasound2, libudev1, libxkbcommon0, libxkbcommon-x11-0
Maintainer: RandomLabs <github-actions[bot]@users.noreply.github.com>
Homepage: https://github.com/Userfrom1995/RandomLabs/tree/main/maze-chase
Description: original desktop maze-chase game
 Maze Chase is an original maze-chase game on a shared deterministic
 Rust engine. The desktop layer is a native windowed and fullscreen
 game with keyboard and gamepad input, menus, help, high scores,
 settings, audio controls, and live resize.
EOF

cat >"$STAGE/DEBIAN/postinst" <<'EOF'
#!/bin/sh
set -e
if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database -q /usr/share/applications || true
fi
if command -v gtk-update-icon-cache >/dev/null 2>&1; then
  gtk-update-icon-cache -q -t -f /usr/share/icons/hicolor || true
fi
exit 0
EOF
cp "$STAGE/DEBIAN/postinst" "$STAGE/DEBIAN/postrm"
chmod 0755 "$STAGE/DEBIAN/postinst" "$STAGE/DEBIAN/postrm"

mkdir -p "$DIST"
rm -f "$DIST/$PKG"
SOURCE_DATE_EPOCH="$SOURCE_DATE_EPOCH" dpkg-deb --root-owner-group --build "$STAGE" "$DIST/$PKG"
echo "staged: $DIST/$PKG"
dpkg-deb --info "$DIST/$PKG" | sed -n '1,14p'
