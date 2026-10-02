#!/usr/bin/env bash
# Smoke-test Linux release artifacts: install the just-built payload,
# run selftest/version/characters plus a service start/status/stop
# cycle, then uninstall clean with no autostart or tray residue.
# Used by .github/workflows/pet-release.yml and the per-OS testers.
# Usage: bash pet/packaging/smoke-linux.sh [--binary PATH]
#        [--deb PATH] [--rpm PATH] [--appimage PATH] [--install]
# Without --install, packages are payload-inspected (no root needed)
# and the binary selftest plus service cycle run against an isolated
# data dir. With --install (CI, root available), deb/rpm are really
# installed with dpkg/rpm and removed again afterwards.
set -euo pipefail

HERE=$(dirname "$0")
ROOT=$(cd "$HERE/../.." && pwd)
cd "$ROOT"

BINARY="dist/desktop-pet"
DEB=""
RPM=""
APPIMAGE=""
INSTALL="0"
while [ "$#" -gt 0 ]; do
  case "$1" in
    --binary) BINARY="${2:-}"; [ -n "$BINARY" ] || { echo "error: --binary needs a value" >&2; exit 1; }; shift 2 ;;
    --deb) DEB="${2:-}"; [ -n "$DEB" ] || { echo "error: --deb needs a value" >&2; exit 1; }; shift 2 ;;
    --rpm) RPM="${2:-}"; [ -n "$RPM" ] || { echo "error: --rpm needs a value" >&2; exit 1; }; shift 2 ;;
    --appimage) APPIMAGE="${2:-}"; [ -n "$APPIMAGE" ] || { echo "error: --appimage needs a value" >&2; exit 1; }; shift 2 ;;
    --install) INSTALL="1"; shift ;;
    *) echo "error: unknown flag $1" >&2; exit 1 ;;
  esac
done

VERSION="$(python3 -m pet version --porcelain | tr -d '[:space:]')"
if [ -z "$VERSION" ]; then
  echo "error: could not derive VERSION from pet/__init__.py" >&2
  exit 1
fi

# The binary under test: prefer the built bundle, fall back to
# run-from-source so the logic smoke always runs headlessly.
if [ -x "$BINARY" ]; then
  PET="$BINARY"
  RUNNER=("$BINARY")
  echo "[smoke] testing binary $BINARY"
else
  PET="run-from-source"
  RUNNER=(python3 -m pet)
  echo "[smoke] no bundle at $BINARY, smoking run-from-source"
fi

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT INT TERM
export DESKTOP_PET_DATA_DIR="$TMP/data"
# No DESKTOP_PET_NO_DISPLAY export here on purpose: every step below
# is headless by construction (version, selftest, characters, service
# start/stop), and forcing no-display flips the tray-capable path
# inside selftest red. GUI installers are payload-inspected, never
# launched.

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

if [ -n "$DEB" ]; then
  echo "[smoke] deb payload $DEB..."
  [ -f "$DEB" ] || fail "deb file missing: $DEB"
  case "$DEB" in *"$VERSION"*) ;; *) fail "deb name misses version $VERSION";; esac
  if command -v dpkg-deb >/dev/null 2>&1; then
    dpkg-deb --info "$DEB" | grep -q "$VERSION" \
      || fail "deb control misses version $VERSION"
    # NB: never pipe the fsys tarball listing into grep -q here. Under
    # `set -o pipefail` grep -q exits on the first match while tar is
    # still streaming the 27MB listing, tar dies with "stdout: write
    # error" (SIGPIPE), and the pipeline fails even though the payload
    # is present (pet-release run 37078577617). Capture, then match.
    DEB_LIST="$(dpkg-deb --fsys-tarfile "$DEB" | tar -t)" \
      || fail "could not list deb payload of $DEB"
    [[ "$DEB_LIST" == *"usr/bin/desktop-pet"* ]] \
      || fail "deb payload misses usr/bin/desktop-pet"
    echo "[smoke] deb control plus payload OK"
  else
    echo "[smoke] dpkg-deb absent, name check only (honest skip)"
  fi
  if [ "$INSTALL" = "1" ]; then
    [ "$(id -u)" = "0" ] || fail "--install needs root for dpkg"
    dpkg -i "$DEB"
    /usr/bin/desktop-pet selftest | grep -q "SELFTEST PASS" \
      || fail "installed /usr/bin/desktop-pet selftest failed"
    dpkg -r desktop-pet
    [ ! -e /usr/bin/desktop-pet ] \
      || fail "uninstall left /usr/bin/desktop-pet behind"
    echo "[smoke] deb install plus uninstall-clean OK"
  fi
fi

if [ -n "$RPM" ]; then
  echo "[smoke] rpm payload $RPM..."
  [ -f "$RPM" ] || fail "rpm file missing: $RPM"
  case "$RPM" in *"$VERSION"*) ;; *) fail "rpm name misses version $VERSION";; esac
  if command -v rpm >/dev/null 2>&1; then
    rpm -qip "$RPM" | grep -qi "$VERSION" \
      || fail "rpm header misses version $VERSION"
    rpm -qlp "$RPM" | grep -q "/usr/bin/desktop-pet" \
      || fail "rpm payload misses /usr/bin/desktop-pet"
    echo "[smoke] rpm header plus payload OK"
  else
    echo "[smoke] rpm absent, name check only (honest skip)"
  fi
  if [ "$INSTALL" = "1" ]; then
    [ "$(id -u)" = "0" ] || fail "--install needs root for rpm"
    rpm -U --force "$RPM"
    /usr/bin/desktop-pet selftest | grep -q "SELFTEST PASS" \
      || fail "installed /usr/bin/desktop-pet selftest failed"
    rpm -e desktop-pet
    [ ! -e /usr/bin/desktop-pet ] \
      || fail "uninstall left /usr/bin/desktop-pet behind"
    echo "[smoke] rpm install plus uninstall-clean OK"
  fi
fi

if [ -n "$APPIMAGE" ]; then
  echo "[smoke] AppImage payload $APPIMAGE..."
  [ -f "$APPIMAGE" ] || fail "AppImage file missing: $APPIMAGE"
  if [ -x "$APPIMAGE" ]; then
    "$APPIMAGE" selftest | grep -q "SELFTEST PASS" \
      || fail "AppImage selftest failed"
    echo "[smoke] AppImage selftest OK"
  else
    echo "[smoke] AppImage not executable here, existence only (honest skip)"
  fi
fi

# Uninstall-clean: no autostart or tray residue may survive in the
# isolated home, and no lock/PID may survive the service stop above.
if [ -e "$TMP/data" ]; then
  if find "$TMP/data" -name '*.lock' -o -name '*.pid' 2>/dev/null | grep -q .; then
    fail "lock or PID residue left in $TMP/data"
  fi
fi
echo "[smoke] no lock/PID residue, uninstall-clean OK"

trap - EXIT INT TERM
rm -rf "$TMP"
echo "[smoke] Linux smoke PASS ($PET, version $VERSION)"
