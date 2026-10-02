#!/bin/sh
# Build Linux artifacts for Desktop Pet: a .deb package plus an AppImage.
# Usage: sh pet/packaging/build-linux.sh
# Output: dist/desktop-pet_1.5.0_amd64.deb,
#         dist/DesktopPet-1.5.0-x86_64.AppImage (when appimagetool exists),
#         dist/SHA256SUMS.txt
set -euo pipefail

HERE=$(dirname "$0")
ROOT=$(cd "$HERE/../.." && pwd)
cd "$ROOT"
VERSION="1.5.0"
ARCH="amd64"

if [ "$(uname)" != "Linux" ]; then
  echo "error: build-linux.sh must run on Linux (found $(uname))" >&2
  exit 1
fi
if ! command -v dpkg-deb >/dev/null 2>&1; then
  echo "error: dpkg-deb is required (install the dpkg package)" >&2
  exit 1
fi

BIN="dist/desktop-pet"
if [ ! -f "$BIN" ]; then
  echo "[pet] no bundle yet, building with build.sh first..."
  sh pet/packaging/build.sh
fi
if ! ./"$BIN" selftest >/dev/null; then
  echo "error: bundle selftest failed, refusing to package" >&2
  exit 1
fi

STAGE=$(mktemp -d)
trap 'rm -rf "$STAGE"' EXIT INT TERM
PKG="$STAGE/desktop-pet_${VERSION}_${ARCH}"
mkdir -p "$PKG/DEBIAN" "$PKG/usr/bin" \
  "$PKG/usr/share/applications" "$PKG/usr/share/icons/hicolor/scalable/apps" \
  "$PKG/etc/xdg/autostart"

cat > "$PKG/DEBIAN/control" <<CONTROL
Package: desktop-pet
Version: $VERSION
Section: games
Priority: optional
Architecture: $ARCH
Maintainer: RandomLabs <desktop-pet@example.com>
Description: Desktop Pet companion platform
 Multi-character desktop companions that live over every window,
 with a background service mode, autostart, and creator packs.
CONTROL

cp "$BIN" "$PKG/usr/bin/desktop-pet"
chmod 755 "$PKG/usr/bin/desktop-pet"
cp pet/packaging/desktop-pet.svg \
  "$PKG/usr/share/icons/hicolor/scalable/apps/desktop-pet.svg"

cat > "$PKG/usr/share/applications/desktop-pet.desktop" <<'DESKTOP'
[Desktop Entry]
Type=Application
Name=Desktop Pet
Comment=A multi-character desktop companion
Exec=/usr/bin/desktop-pet gui
Icon=desktop-pet
Categories=Game;Amusement;
Terminal=false
DESKTOP

# XDG autostart entry ships disabled: 'desktop-pet startup on' flips
# the flag when the user opts in.
cat > "$PKG/etc/xdg/autostart/desktop-pet.desktop" <<'DESKTOP'
[Desktop Entry]
Type=Application
Name=Desktop Pet (background service)
Exec=/usr/bin/desktop-pet service loop
Icon=desktop-pet
X-GNOME-Autostart-enabled=false
Hidden=true
DESKTOP

dpkg-deb --build "$PKG" "dist/desktop-pet_${VERSION}_${ARCH}.deb"

# AppImage: needs appimagetool on PATH; otherwise skip honestly.
if command -v appimagetool >/dev/null 2>&1; then
  APPDIR="$STAGE/DesktopPet.AppDir"
  mkdir -p "$APPDIR/usr/bin"
  cp "$BIN" "$APPDIR/usr/bin/desktop-pet"
  cp pet/packaging/desktop-pet.svg "$APPDIR/desktop-pet.svg"
  cat > "$APPDIR/AppRun" <<'RUN'
#!/bin/sh
HERE=$(dirname "$(readlink -f "$0")")
exec "$HERE/usr/bin/desktop-pet" "$@"
RUN
  chmod +x "$APPDIR/AppRun"
  cp "$PKG/usr/share/applications/desktop-pet.desktop" "$APPDIR/"
  (cd "$STAGE" && appimagetool DesktopPet.AppDir \
    "$ROOT/dist/DesktopPet-$VERSION-x86_64.AppImage")
  chmod +x "dist/DesktopPet-$VERSION-x86_64.AppImage"
else
  echo "[pet] appimagetool not found, skipping AppImage (deb is built)"
  echo "[pet] to build it: download appimagetool and rerun this script"
fi

trap - EXIT INT TERM
rm -rf "$STAGE"

if command -v sha256sum >/dev/null 2>&1; then
  (cd dist && sha256sum "desktop-pet_${VERSION}_${ARCH}.deb" \
    DesktopPet-*-x86_64.AppImage 2>/dev/null >> SHA256SUMS.txt || true)
fi
echo "[pet] built dist/desktop-pet_${VERSION}_${ARCH}.deb"
ls -la dist/
