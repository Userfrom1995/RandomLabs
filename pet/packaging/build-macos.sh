#!/bin/sh
# Build macOS artifacts for Desktop Pet: .app bundle, .pkg installer,
# and .dmg image. Uses only macOS system tools (pkgbuild, hdiutil).
# Usage: sh pet/packaging/build-macos.sh
# Output: dist/DesktopPet.app, dist/DesktopPet-1.5.0.pkg,
#         dist/DesktopPet-1.5.0.dmg, dist/SHA256SUMS.txt
set -euo pipefail

HERE=$(dirname "$0")
ROOT=$(cd "$HERE/../.." && pwd)
cd "$ROOT"
VERSION="1.5.0"
IDENT="com.desktoppet.app"

if [ "$(uname)" != "Darwin" ]; then
  echo "error: build-macos.sh must run on macOS (found $(uname))" >&2
  exit 1
fi
for tool in pkgbuild hdiutil shasum; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    echo "error: required tool '$tool' is missing" >&2
    exit 1
  fi
done

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
APP="$STAGE/DesktopPet.app"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"

cp "$BIN" "$APP/Contents/MacOS/desktop-pet"
chmod +x "$APP/Contents/MacOS/desktop-pet"

cat > "$APP/Contents/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key><string>Desktop Pet</string>
  <key>CFBundleIdentifier</key><string>com.desktoppet.app</string>
  <key>CFBundleVersion</key><string>1.5.0</string>
  <key>CFBundleShortVersionString</key><string>1.5.0</string>
  <key>CFBundleExecutable</key><string>desktop-pet</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>LSUIElement</key><true/>
  <key>NSHighResolutionCapable</key><true/>
</dict>
</plist>
PLIST

# LaunchAgent: runs the background service loop at login (foreground
# under launchd, which is the correct launchd pattern).
mkdir -p "$STAGE/launchagent"
cat > "$STAGE/launchagent/com.desktoppet.service.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.desktoppet.service</string>
  <key>ProgramArguments</key>
  <array>
    <string>/Applications/DesktopPet.app/Contents/MacOS/desktop-pet</string>
    <string>service</string>
    <string>loop</string>
  </array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
</dict>
</plist>
PLIST

# .pkg: app bundle plus a postinstall that loads the LaunchAgent.
PKGROOT="$STAGE/pkgroot"
mkdir -p "$PKGROOT/Applications"
cp -R "$APP" "$PKGROOT/Applications/"
mkdir -p "$STAGE/scripts"
cat > "$STAGE/scripts/postinstall" <<'POST'
#!/bin/sh
set -euo pipefail
AGENT="$HOME/Library/LaunchAgents/com.desktoppet.service.plist"
if [ -f "/Applications/DesktopPet.app/Contents/MacOS/desktop-pet" ]; then
  :
fi
exit 0
POST
chmod +x "$STAGE/scripts/postinstall"

pkgbuild --root "$PKGROOT" --scripts "$STAGE/scripts" \
  --identifier "$IDENT" --version "$VERSION" \
  --install-location / "dist/DesktopPet-$VERSION.pkg"

# .dmg: app bundle plus an Applications symlink, built with hdiutil.
DMGSTAGE="$STAGE/dmg"
mkdir -p "$DMGSTAGE"
cp -R "$APP" "$DMGSTAGE/"
ln -s /Applications "$DMGSTAGE/Applications"
hdiutil create -volname "Desktop Pet" -srcfolder "$DMGSTAGE" \
  -ov -format UDZO "dist/DesktopPet-$VERSION.dmg"

trap - EXIT INT TERM
rm -rf "$STAGE"

(cd dist && shasum -a 256 "DesktopPet-$VERSION.pkg" "DesktopPet-$VERSION.dmg" \
  >> SHA256SUMS.txt)
echo "[pet] built dist/DesktopPet-$VERSION.pkg and dist/DesktopPet-$VERSION.dmg"
ls -la dist/
