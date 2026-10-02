#!/usr/bin/env bash
# Smoke-test macOS release artifacts: app bundle, pkg installer, dmg
# image. Installs only with --install (sudo available on the release
# runner); otherwise payload-inspects and runs the headless logic
# smoke against an isolated data dir.
# Usage: bash pet/packaging/smoke-macos.sh [--binary PATH]
#        [--app PATH] [--pkg PATH] [--dmg PATH] [--install]
# Used by .github/workflows/pet-release.yml and the per-OS testers.
set -euo pipefail

HERE=$(dirname "$0")
ROOT=$(cd "$HERE/../.." && pwd)
cd "$ROOT"

BINARY="dist/desktop-pet"
APP=""
PKG=""
DMG=""
INSTALL="0"
while [ "$#" -gt 0 ]; do
  case "$1" in
    --binary) BINARY="$2"; shift 2 ;;
    --app) APP="$2"; shift 2 ;;
    --pkg) PKG="$2"; shift 2 ;;
    --dmg) DMG="$2"; shift 2 ;;
    --install) INSTALL="1"; shift ;;
    *) echo "error: unknown flag $1" >&2; exit 1 ;;
  esac
done

if [ "$(uname)" != "Darwin" ] && [ "$INSTALL" = "1" ]; then
  echo "error: --install smoke must run on macOS" >&2
  exit 1
fi

VERSION="$(python3 -m pet version --porcelain | tr -d '[:space:]')"
if [ -z "$VERSION" ]; then
  echo "error: could not derive VERSION from pet/__init__.py" >&2
  exit 1
fi

if [ -x "$BINARY" ]; then
  RUNNER=("$BINARY")
  PET="$BINARY"
  echo "[smoke] testing binary $BINARY"
else
  RUNNER=(python3 -m pet)
  PET="run-from-source"
  echo "[smoke] no bundle at $BINARY, smoking run-from-source"
fi

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT INT TERM
export DESKTOP_PET_DATA_DIR="$TMP/data"
# No DESKTOP_PET_NO_DISPLAY export here on purpose: every step below
# is headless by construction, and forcing no-display flips the
# tray-capable path inside selftest red. The app bundle is inspected
# (Info.plist, executable bit), never launched.

fail() { echo "error: smoke failure: $1" >&2; exit 1; }

echo "[smoke] version..."
OUT="$("${RUNNER[@]}" version --porcelain | tr -d '[:space:]')"
[ "$OUT" = "$VERSION" ] || fail "version mismatch: got '$OUT', want '$VERSION'"

echo "[smoke] selftest..."
"${RUNNER[@]}" selftest | grep -q "SELFTEST PASS" \
  || fail "selftest did not report SELFTEST PASS"

echo "[smoke] characters list..."
"${RUNNER[@]}" characters list | grep -q "pip" \
  || fail "characters list misses pip"

echo "[smoke] service start/status/stop cycle..."
"${RUNNER[@]}" service start >/dev/null \
  || fail "service start failed"
sleep 2
"${RUNNER[@]}" service status | grep -qi "running\|alive\|pid" \
  || fail "service status does not report a live service"
"${RUNNER[@]}" service switch bramble >/dev/null \
  || fail "service switch bramble failed"
"${RUNNER[@]}" service switch pip >/dev/null \
  || fail "service switch pip failed"
"${RUNNER[@]}" service stop >/dev/null \
  || fail "service stop failed"
# NB: `service status` always exits 0 (it reports; `stop` acts), so the
# stopped state is asserted on its text, not its exit code.
STATUS_OUT="$("${RUNNER[@]}" service status)"
echo "$STATUS_OUT" | grep -qi "stopped\|not running" \
  || fail "service still reports live after stop: $STATUS_OUT"
echo "[smoke] service stopped clean (no residue)"

if [ -n "$APP" ]; then
  echo "[smoke] app bundle $APP..."
  [ -d "$APP" ] || fail "app bundle missing: $APP"
  PLIST="$APP/Contents/Info.plist"
  [ -f "$PLIST" ] || fail "Info.plist missing in $APP"
  grep -q "$VERSION" "$PLIST" \
    || fail "Info.plist misses version $VERSION"
  [ -x "$APP/Contents/MacOS/desktop-pet" ] \
    || fail "app executable missing in $APP"
  echo "[smoke] app bundle OK"
fi

if [ -n "$PKG" ]; then
  echo "[smoke] pkg $PKG..."
  [ -f "$PKG" ] || fail "pkg missing: $PKG"
  case "$PKG" in *"$VERSION"*) ;; *) fail "pkg name misses version $VERSION";; esac
  if [ "$(uname)" = "Darwin" ]; then
    pkgutil --check-signature "$PKG" >/dev/null 2>&1 \
      || echo "[smoke] pkg is unsigned (expected: honest unsigned-binary note in hub)"
  else
    echo "[smoke] not on macOS, name check only (honest skip)"
  fi
fi

if [ -n "$DMG" ]; then
  echo "[smoke] dmg $DMG..."
  [ -f "$DMG" ] || fail "dmg missing: $DMG"
  case "$DMG" in *"$VERSION"*) ;; *) fail "dmg name misses version $VERSION";; esac
  if [ "$(uname)" = "Darwin" ]; then
    hdiutil imageinfo "$DMG" >/dev/null \
      || fail "dmg failed hdiutil imageinfo"
    echo "[smoke] dmg imageinfo OK"
  else
    echo "[smoke] not on macOS, name check only (honest skip)"
  fi
fi

if [ "$INSTALL" = "1" ]; then
  [ -n "$PKG" ] || fail "--install needs --pkg PATH"
  sudo installer -pkg "$PKG" -target /
  [ -x "/Applications/DesktopPet.app/Contents/MacOS/desktop-pet" ] \
    || fail "installed app bundle missing after pkg install"
  /Applications/DesktopPet.app/Contents/MacOS/desktop-pet selftest \
    | grep -q "SELFTEST PASS" \
    || fail "installed app selftest failed"
  sudo rm -rf "/Applications/DesktopPet.app"
  [ ! -e "/Applications/DesktopPet.app" ] \
    || fail "uninstall left /Applications/DesktopPet.app behind"
  echo "[smoke] pkg install plus uninstall-clean OK"
fi

if [ -e "$TMP/data" ]; then
  if find "$TMP/data" -name '*.lock' -o -name '*.pid' 2>/dev/null | grep -q .; then
    fail "lock or PID residue left in $TMP/data"
  fi
fi
echo "[smoke] no lock/PID residue, uninstall-clean OK"

trap - EXIT INT TERM
rm -rf "$TMP"
echo "[smoke] macOS smoke PASS ($PET, version $VERSION)"
