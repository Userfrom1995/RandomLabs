#!/usr/bin/env bash
# Build the terminal game as an RPM package for Fedora and compatible
# distributions.
#
# Run on a machine with rpmbuild:
#   bash maze-chase/packaging/terminal/build-rpm.sh
#
# Output: maze-chase/dist/maze-chase-terminal-<version>-1.<arch>.rpm
# Installs /usr/bin/maze-chase-terminal plus the launch guide; removes
# cleanly with `sudo rpm -e maze-chase-terminal`.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=maze-chase/packaging/common.sh
. "$HERE/../common.sh"

require_command rpmbuild "install rpm-build"
require_command cargo "install the Rust toolchain"

ARCH="$(rpm_arch)"
TOPDIR="$DIST/rpmbuild-terminal"
PAYLOAD="$TOPDIR/SOURCES/payload"

cargo build --release -p maze-chase-terminal --manifest-path "$ROOT/Cargo.toml"

rm -rf "$TOPDIR"
mkdir -p "$TOPDIR/SPECS" "$PAYLOAD/usr/bin" "$PAYLOAD/usr/share/doc/maze-chase-terminal"
install -m 0755 "$ROOT/target/release/maze-chase-terminal" "$PAYLOAD/usr/bin/maze-chase-terminal"
install -m 0644 "$ROOT/docs/terminal.md" "$PAYLOAD/usr/share/doc/maze-chase-terminal/README.md"
cat >"$PAYLOAD/usr/share/doc/maze-chase-terminal/copyright" <<EOF
Maze Chase terminal game $VERSION

Copyright (c) RandomLabs contributors. MIT licensed.
Original code, art, audio, names, and mazes; no proprietary assets.
Source: https://github.com/Userfrom1995/RandomLabs/tree/main/maze-chase
EOF

cat >"$TOPDIR/SPECS/maze-chase-terminal.spec" <<EOF
Name:           maze-chase-terminal
Version:        $VERSION
Release:        1%{?dist}
Summary:        Original fullscreen terminal maze-chase game
License:        MIT
URL:            https://github.com/Userfrom1995/RandomLabs/tree/main/maze-chase
BuildArch:      $ARCH

%description
Maze Chase is an original maze-chase game on a shared deterministic Rust
engine. The terminal layer renders the full hunt in the whole terminal
window with Kitty graphics, Sixel, 24-bit cells, or 16-color cells,
detects capabilities at launch, and degrades safely. It ships menus,
help, high scores, settings, key rebinding, and live resize.

%prep

%build

%install
rm -rf %{buildroot}
mkdir -p %{buildroot}
cp -a %{_sourcedir}/payload/. %{buildroot}/

%files
/usr/bin/maze-chase-terminal
/usr/share/doc/maze-chase-terminal/README.md
/usr/share/doc/maze-chase-terminal/copyright

%changelog
* Thu Oct 22 2026 RandomLabs <github-actions[bot]@users.noreply.github.com> - $VERSION-1
- Release build from the tagged workspace.
EOF

SOURCE_DATE_EPOCH="$SOURCE_DATE_EPOCH" rpmbuild -bb \
  --define "_topdir $TOPDIR" \
  --define "use_source_date_epoch_as_buildtime 1" \
  --define "clamp_mtime_to_source_date_epoch 1" \
  "$TOPDIR/SPECS/maze-chase-terminal.spec" >/dev/null

BUILT="$(find "$TOPDIR/RPMS" -name '*.rpm' -type f | head -n 1)"
if [ -z "$BUILT" ]; then
  echo "rpmbuild produced no package" >&2
  exit 1
fi
mkdir -p "$DIST"
cp "$BUILT" "$DIST/"
echo "staged: $DIST/$(basename "$BUILT")"
rpm -qip "$DIST/$(basename "$BUILT")" | sed -n '1,12p'
