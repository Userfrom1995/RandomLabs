#!/usr/bin/env bash
# Build the desktop game as an RPM package for Fedora and compatible
# distributions.
#
# Run on a machine with rpmbuild:
#   bash maze-chase/packaging/desktop/build-rpm.sh
#
# Output: maze-chase/dist/maze-chase-desktop-<version>-1.<arch>.rpm
# Removes cleanly with `sudo dnf remove maze-chase-desktop`. Release stays
# `1` so the installed release workflow's `-1.<arch>.rpm` artifact glob
# keeps matching; every candidate of the same workspace version therefore
# has the same NEVRA, and candidate-to-candidate replacement is documented
# as `dnf reinstall ./<rpm>` (or `rpm -U --replacepkgs <rpm>`), never bare
# `rpm -U`. The package declares the glibc build floor and the X11 runtime
# libraries winit loads through its display backend.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=maze-chase/packaging/common.sh
. "$HERE/../common.sh"

require_command rpmbuild "install rpm-build"
require_command cargo "install the Rust toolchain"

ARCH="$(rpm_arch)"
TOPDIR="$DIST/rpmbuild-desktop"
PAYLOAD="$TOPDIR/SOURCES/payload"

cargo build --release --locked -p maze-chase-desktop --manifest-path "$ROOT/Cargo.toml"

rm -rf "$TOPDIR"
mkdir -p "$TOPDIR/SPECS" \
  "$PAYLOAD/usr/bin" \
  "$PAYLOAD/usr/share/applications" \
  "$PAYLOAD/usr/share/icons/hicolor/11x11/apps" \
  "$PAYLOAD/usr/share/doc/maze-chase-desktop" \
  "$PAYLOAD/usr/share/licenses/maze-chase-desktop"
install -m 0755 "$ROOT/target/release/maze-chase-desktop" "$PAYLOAD/usr/bin/maze-chase-desktop"
install -m 0644 "$HERE/maze-chase.desktop" "$PAYLOAD/usr/share/applications/maze-chase.desktop"
install -m 0644 "$HERE/maze-chase.xpm" "$PAYLOAD/usr/share/icons/hicolor/11x11/apps/maze-chase.xpm"
install -m 0644 "$ROOT/docs/desktop.md" "$PAYLOAD/usr/share/doc/maze-chase-desktop/README.md"
# MIT requires the copyright notice and permission text in every
# distributed copy; %license keeps the repository LICENSE installed.
install -m 0644 "$REPO_ROOT/LICENSE" \
  "$PAYLOAD/usr/share/licenses/maze-chase-desktop/LICENSE"

cat >"$TOPDIR/SPECS/maze-chase-desktop.spec" <<EOF
Name:           maze-chase-desktop
Version:        $VERSION
Release:        1
Summary:        Original desktop maze-chase game
License:        MIT
URL:            https://github.com/Userfrom1995/RandomLabs/tree/main/maze-chase
BuildArch:      $ARCH
Requires:       alsa-lib
Requires:       libxkbcommon
Requires:       libxkbcommon-x11
Requires:       libXcursor
Requires:       libXrandr
Requires:       libXi
Requires:       libXinerama
Requires:       libX11-xcb
Requires:       libwayland-client
Requires:       systemd-libs
Requires:       glibc >= $GLIBC_FLOOR

%description
Maze Chase is an original maze-chase game on a shared deterministic Rust
engine. The desktop layer is a native windowed and fullscreen game with
keyboard and gamepad input, menus, help, high scores, settings, audio
controls, and live resize.

%prep

%build

%install
rm -rf %{buildroot}
mkdir -p %{buildroot}
cp -a %{_sourcedir}/payload/. %{buildroot}/

%post
if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database /usr/share/applications >/dev/null 2>&1 || :
fi
if command -v gtk-update-icon-cache >/dev/null 2>&1; then
  gtk-update-icon-cache -q /usr/share/icons/hicolor >/dev/null 2>&1 || :
fi

%postun
if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database /usr/share/applications >/dev/null 2>&1 || :
fi
if command -v gtk-update-icon-cache >/dev/null 2>&1; then
  gtk-update-icon-cache -q /usr/share/icons/hicolor >/dev/null 2>&1 || :
fi

%files
/usr/bin/maze-chase-desktop
/usr/share/applications/maze-chase.desktop
/usr/share/icons/hicolor/11x11/apps/maze-chase.xpm
/usr/share/doc/maze-chase-desktop/README.md
%license /usr/share/licenses/maze-chase-desktop/LICENSE

%changelog
* Thu Oct 22 2026 RandomLabs <github-actions[bot]@users.noreply.github.com> - $VERSION-1
- Release build from the tagged workspace.
EOF

SOURCE_DATE_EPOCH="$SOURCE_DATE_EPOCH" rpmbuild -bb \
  --define "_topdir $TOPDIR" \
  --define "use_source_date_epoch_as_buildtime 1" \
  --define "clamp_mtime_to_source_date_epoch 1" \
  "$TOPDIR/SPECS/maze-chase-desktop.spec" >/dev/null

BUILT="$(find "$TOPDIR/RPMS" -name '*.rpm' -type f | head -n 1)"
if [ -z "$BUILT" ]; then
  echo "rpmbuild produced no package" >&2
  exit 1
fi
mkdir -p "$DIST"
cp "$BUILT" "$DIST/"
echo "staged: $DIST/$(basename "$BUILT")"
rpm -qip "$DIST/$(basename "$BUILT")" | sed -n '1,14p'
