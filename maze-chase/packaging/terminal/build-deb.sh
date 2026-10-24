#!/usr/bin/env bash
# Build the terminal game as a Debian package.
#
# Run on Debian/Ubuntu (dpkg-deb comes with dpkg):
#   bash maze-chase/packaging/terminal/build-deb.sh
#
# Output: maze-chase/dist/maze-chase-terminal_<version>_<arch>.deb
# Installs /usr/bin/maze-chase-terminal plus the launch guide; removes
# cleanly with `sudo apt remove maze-chase-terminal`.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=maze-chase/packaging/common.sh
. "$HERE/../common.sh"

require_command dpkg-deb "install dpkg-dev"
require_command cargo "install the Rust toolchain"

ARCH="$(deb_arch)"
STAGE="$DIST/deb-terminal"
PKG="maze-chase-terminal_${VERSION}_${ARCH}.deb"

cargo build --release --locked -p maze-chase-terminal --manifest-path "$ROOT/Cargo.toml"

rm -rf "$STAGE"
mkdir -p "$STAGE/DEBIAN" \
  "$STAGE/usr/bin" \
  "$STAGE/usr/share/doc/maze-chase-terminal"

install -m 0755 "$ROOT/target/release/maze-chase-terminal" "$STAGE/usr/bin/maze-chase-terminal"
install -m 0644 "$ROOT/docs/terminal.md" "$STAGE/usr/share/doc/maze-chase-terminal/README.md"
# MIT requires the copyright notice and permission text in every
# distributed copy, so the deb copyright file is the repository LICENSE
# with a short package header, never a hand-written summary.
{
  printf 'Maze Chase terminal game %s\n\n' "$VERSION"
  cat "$REPO_ROOT/LICENSE"
} >"$STAGE/usr/share/doc/maze-chase-terminal/copyright"
chmod 0644 "$STAGE/usr/share/doc/maze-chase-terminal/copyright"

SIZE="$(du -sk "$STAGE/usr" | awk '{print $1}')"
cat >"$STAGE/DEBIAN/control" <<EOF
Package: maze-chase-terminal
Version: $VERSION
Section: games
Priority: optional
Architecture: $ARCH
Installed-Size: $SIZE
Maintainer: RandomLabs <github-actions[bot]@users.noreply.github.com>
Homepage: https://github.com/Userfrom1995/RandomLabs/tree/main/maze-chase
Description: original fullscreen terminal maze-chase game
 Maze Chase is an original maze-chase game on a shared deterministic
 Rust engine. The terminal layer renders the full hunt in the whole
 terminal window with Kitty graphics, Sixel, 24-bit cells, or 16-color
 cells, detects capabilities at launch, and degrades safely. It ships
 menus, help, high scores, settings, key rebinding, and live resize.
EOF

cat >"$STAGE/DEBIAN/postinst" <<'EOF'
#!/bin/sh
set -e
if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database -q /usr/share/applications || true
fi
exit 0
EOF
cp "$STAGE/DEBIAN/postinst" "$STAGE/DEBIAN/postrm"
chmod 0755 "$STAGE/DEBIAN/postinst" "$STAGE/DEBIAN/postrm"

mkdir -p "$DIST"
rm -f "$DIST/$PKG"
SOURCE_DATE_EPOCH="$SOURCE_DATE_EPOCH" dpkg-deb --root-owner-group --build "$STAGE" "$DIST/$PKG"
echo "staged: $DIST/$PKG"
dpkg-deb --info "$DIST/$PKG" | sed -n '1,12p'
