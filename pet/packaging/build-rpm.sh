#!/usr/bin/env bash
# Build a Linux .rpm package for Desktop Pet with rpmbuild.
# Usage: bash pet/packaging/build-rpm.sh
# Version is single-sourced from pet/__init__.py: do not literal it here.
# Output: dist/desktop-pet-<version>-1.<arch>.rpm plus an entry in
#         dist/SHA256SUMS.txt
set -euo pipefail

HERE=$(dirname "$0")
ROOT=$(cd "$HERE/../.." && pwd)
cd "$ROOT"
VERSION="$(python3 -m pet version --porcelain | tr -d '[:space:]')"
if [ -z "$VERSION" ]; then
  echo "error: could not derive VERSION from pet/__init__.py" >&2
  exit 1
fi

if [ "$(uname)" != "Linux" ]; then
  echo "error: build-rpm.sh must run on Linux (found $(uname))" >&2
  exit 1
fi
if ! command -v rpmbuild >/dev/null 2>&1; then
  echo "error: rpmbuild is required (install the rpm-build package)" >&2
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
mkdir -p "$STAGE/rpmbuild"/{BUILD,RPMS,SOURCES,SPECS,SRPMS}

# rpmbuild needs a plain directory tree: binary, desktop entries, icon.
SRCDIR="$STAGE/rpmbuild/SOURCES/desktop-pet-$VERSION"
mkdir -p "$SRCDIR"
cp "$BIN" "$SRCDIR/desktop-pet"
chmod 755 "$SRCDIR/desktop-pet"
cp pet/packaging/desktop-pet.svg "$SRCDIR/desktop-pet.svg"

cat > "$SRCDIR/desktop-pet.desktop" <<'DESKTOP'
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
cat > "$SRCDIR/desktop-pet-autostart.desktop" <<'DESKTOP'
[Desktop Entry]
Type=Application
Name=Desktop Pet (background service)
Exec=/usr/bin/desktop-pet service loop
Icon=desktop-pet
X-GNOME-Autostart-enabled=false
Hidden=true
DESKTOP

sed "s/@VERSION@/$VERSION/g" pet/packaging/desktop-pet.rpm.spec \
  > "$STAGE/rpmbuild/SPECS/desktop-pet.spec"

rpmbuild --define "_topdir $STAGE/rpmbuild" -bb \
  "$STAGE/rpmbuild/SPECS/desktop-pet.spec"

RPM=$(find "$STAGE/rpmbuild/RPMS" -name 'desktop-pet-*.rpm' | head -n 1)
if [ -z "${RPM:-}" ]; then
  echo "error: rpmbuild produced no rpm" >&2
  exit 1
fi
cp "$RPM" dist/
RPM_NAME=$(basename "$RPM")

trap - EXIT INT TERM
rm -rf "$STAGE"

if command -v sha256sum >/dev/null 2>&1; then
  if [ -f dist/SHA256SUMS.txt ]; then
    (cd dist && grep -v " $RPM_NAME\$" SHA256SUMS.txt > SHA256SUMS.tmp || true)
    (cd dist && mv SHA256SUMS.tmp SHA256SUMS.txt)
  else
    : > dist/SHA256SUMS.txt
  fi
  (cd dist && sha256sum "$RPM_NAME" >> SHA256SUMS.txt)
fi
echo "[pet] built dist/$RPM_NAME"
ls -la dist/
