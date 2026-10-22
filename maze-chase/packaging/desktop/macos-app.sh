#!/usr/bin/env bash
# Build the macOS desktop release and stage a Maze Chase.app bundle.
#
# Run on a macOS runner (or a Mac dev machine) from the repo root:
#   bash maze-chase/packaging/desktop/macos-app.sh
#
# Output: dist/Maze Chase.app (binary plus Info.plist plus docs). No
# system dependencies: rodio uses CoreAudio and winit uses AppKit, both
# without extra installs. The bundle is unsigned; first launch needs a
# right-click Open, then Gatekeeper remembers it. See docs/desktop.md.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=maze-chase/packaging/common.sh
. "$HERE/../common.sh"

APP="$DIST/Maze Chase.app"

cargo build --release -p maze-chase-desktop --manifest-path "$ROOT/Cargo.toml"

BIN="$ROOT/target/release/maze-chase-desktop"
if [ ! -f "$BIN" ]; then
  echo "missing release binary: $BIN" >&2
  exit 1
fi

rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"
install -m 0755 "$BIN" "$APP/Contents/MacOS/maze-chase-desktop"
install -m 0644 "$ROOT/docs/desktop.md" "$APP/Contents/Resources/README-desktop.md"
install -m 0644 "$REPO_ROOT/LICENSE" "$APP/Contents/Resources/LICENSE"
printf 'APPL????' >"$APP/Contents/PkgInfo"

cat >"$APP/Contents/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key><string>Maze Chase</string>
  <key>CFBundleDisplayName</key><string>Maze Chase</string>
  <key>CFBundleIdentifier</key><string>games.mazechase.desktop</string>
  <key>CFBundleVersion</key><string>$VERSION</string>
  <key>CFBundleShortVersionString</key><string>$VERSION</string>
  <key>CFBundleExecutable</key><string>maze-chase-desktop</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>LSMinimumSystemVersion</key><string>11.0</string>
  <key>NSHighResolutionCapable</key><true/>
</dict>
</plist>
PLIST

echo "staged: $APP"
"$APP/Contents/MacOS/maze-chase-desktop" --version
