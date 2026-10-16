#!/usr/bin/env bash
# Build the macOS desktop release and stage a Maze Chase.app bundle.
#
# Run on a macOS runner (or a Mac dev machine) from the repo root:
#   bash maze-chase/packaging/desktop/macos-app.sh
#
# Output: dist/Maze Chase.app (binary plus Info.plist). No system
# dependencies: rodio uses CoreAudio and winit uses AppKit, both
# without extra installs. First launch may need a right-click Open
# (unsigned build); see docs/desktop.md.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
DIST="$ROOT/dist"
APP="$DIST/Maze Chase.app"

cargo build --release -p maze-chase-desktop --manifest-path "$ROOT/Cargo.toml"

BIN="$ROOT/target/release/maze-chase-desktop"
[ -f "$ROOT/../target/release/maze-chase-desktop" ] && BIN="$ROOT/../target/release/maze-chase-desktop"

rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"
cp "$BIN" "$APP/Contents/MacOS/maze-chase-desktop"
chmod +x "$APP/Contents/MacOS/maze-chase-desktop"
cp "$ROOT/docs/desktop.md" "$APP/Contents/Resources/README-desktop.md"

cat > "$APP/Contents/Info.plist" << 'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key><string>Maze Chase</string>
  <key>CFBundleDisplayName</key><string>Maze Chase</string>
  <key>CFBundleIdentifier</key><string>games.mazechase.desktop</string>
  <key>CFBundleVersion</key><string>0.1.0</string>
  <key>CFBundleShortVersionString</key><string>0.1.0</string>
  <key>CFBundleExecutable</key><string>maze-chase-desktop</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>LSMinimumSystemVersion</key><string>11.0</string>
  <key>NSHighResolutionCapable</key><true/>
</dict>
</plist>
PLIST

echo "staged: $APP"
"$APP/Contents/MacOS/maze-chase-desktop" --version
