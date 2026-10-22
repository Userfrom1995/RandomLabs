#!/usr/bin/env bash
# Verify macOS package payloads on the machine that built them.
#
# Usage:
#   smoke-macos.sh [--app DIR]... [--dmg FILE]... [--tarball FILE]... [--probe]
#
# Checks the bundle identifier, executable, and version in Info.plist,
# launches the bundled binary with --version, mounts disk images, and
# extracts tarballs. --probe additionally drives a real windowed frame
# through --probe 1 (requires an Aqua session), which the release
# pipeline passes on the macOS runner.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=maze-chase/packaging/common.sh
. "$HERE/../common.sh"

APPS=()
DMGS=()
TARBALLS=()
PROBE=0
while [ $# -gt 0 ]; do
  case "$1" in
    --app) APPS+=("$2"); shift 2 ;;
    --dmg) DMGS+=("$2"); shift 2 ;;
    --tarball) TARBALLS+=("$2"); shift 2 ;;
    --probe) PROBE=1; shift ;;
    *) echo "unknown argument: $1" >&2; exit 2 ;;
  esac
done

if [ ${#APPS[@]} -eq 0 ] && [ ${#DMGS[@]} -eq 0 ] && [ ${#TARBALLS[@]} -eq 0 ]; then
  echo "nothing to smoke (pass --app, --dmg, or --tarball)" >&2
  exit 2
fi

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

check_app() {
  local app="$1" label="$2"
  [ -d "$app" ] || {
    echo "smoke: missing app bundle $app" >&2
    exit 1
  }
  local exe="$app/Contents/MacOS/maze-chase-desktop"
  [ -x "$exe" ] || {
    echo "smoke: $label has no executable" >&2
    exit 1
  }
  /usr/libexec/PlistBuddy -c "Print :CFBundleIdentifier" "$app/Contents/Info.plist" |
    grep -qx 'games.mazechase.desktop'
  /usr/libexec/PlistBuddy -c "Print :CFBundleShortVersionString" "$app/Contents/Info.plist" |
    grep -qx "$VERSION"
  local out
  out="$("$exe" --version 2>&1)"
  case "$out" in
    *"$VERSION"*) echo "smoke: $label --version -> $out" ;;
    *)
      echo "smoke: $label reports '$out', expected $VERSION" >&2
      exit 1
      ;;
  esac
  if [ "$PROBE" -eq 1 ]; then
    "$exe" --no-pad --probe 1 "$WORK/probe.ppm"
    [ -s "$WORK/probe.ppm" ] || {
      echo "smoke: $label probe wrote no screenshot" >&2
      exit 1
    }
    echo "smoke: $label probe wrote $(wc -c <"$WORK/probe.ppm") bytes"
  fi
}

for app in "${APPS[@]+"${APPS[@]}"}"; do
  check_app "$app" "$app"
done

for dmg in "${DMGS[@]+"${DMGS[@]}"}"; do
  [ -f "$dmg" ] || {
    echo "smoke: missing dmg $dmg" >&2
    exit 1
  }
  mount="$WORK/mnt-$(basename "$dmg")"
  mkdir -p "$mount"
  hdiutil attach "$dmg" -nobrowse -readonly -mountpoint "$mount" >/dev/null
  trap 'hdiutil detach "$mount" >/dev/null 2>&1 || true; rm -rf "$WORK"' EXIT
  check_app "$mount/Maze Chase.app" "$dmg"
  hdiutil detach "$mount" >/dev/null
  trap 'rm -rf "$WORK"' EXIT
  echo "smoke: ok $dmg"
done

for tarball in "${TARBALLS[@]+"${TARBALLS[@]}"}"; do
  [ -f "$tarball" ] || {
    echo "smoke: missing tarball $tarball" >&2
    exit 1
  }
  unpack="$WORK/tar-$(basename "$tarball")"
  mkdir -p "$unpack"
  tar -xzf "$tarball" -C "$unpack"
  check_app "$unpack/Maze Chase.app" "$tarball"
  echo "smoke: ok $tarball"
done
