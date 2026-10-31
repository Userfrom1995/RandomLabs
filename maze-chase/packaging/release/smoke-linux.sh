#!/usr/bin/env bash
# Verify Linux package payloads without trusting the build that made them.
#
# Usage:
#   smoke-linux.sh [--deb FILE]... [--rpm FILE]... [--tarball FILE]...
#
# Every input is inspected, extracted into an isolated directory, and
# its binary launched with --version. Tarballs additionally go through
# the install script into a scratch prefix and the uninstall script back
# out. The caller records the pass/fail; a missing input is fatal.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=maze-chase/packaging/common.sh
. "$HERE/../common.sh"

DEBS=()
RPMS=()
TARBALLS=()
while [ $# -gt 0 ]; do
  case "$1" in
    --deb) DEBS+=("$2"); shift 2 ;;
    --rpm) RPMS+=("$2"); shift 2 ;;
    --tarball) TARBALLS+=("$2"); shift 2 ;;
    *) echo "unknown argument: $1" >&2; exit 2 ;;
  esac
done

if [ ${#DEBS[@]} -eq 0 ] && [ ${#RPMS[@]} -eq 0 ] && [ ${#TARBALLS[@]} -eq 0 ]; then
  echo "nothing to smoke (pass --deb, --rpm, or --tarball)" >&2
  exit 2
fi

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

check_version() {
  local binary="$1" name="$2"
  [ -x "$binary" ] || {
    echo "smoke: $name has no executable payload" >&2
    exit 1
  }
  local out
  out="$("$binary" --version 2>&1)"
  case "$out" in
    *"$VERSION"*) echo "smoke: $name --version -> $out" ;;
    *)
      echo "smoke: $name reports '$out', expected version $VERSION" >&2
      exit 1
      ;;
  esac
  "$binary" --help >/dev/null
}

package_name() {
  # Classify by the artifact leaf name: a parent directory containing
  # "terminal" must not relabel a desktop package.
  case "$(basename "$1")" in
    *terminal*) echo terminal ;;
    *desktop*) echo desktop ;;
    *) echo unknown ;;
  esac
}

require_metadata() {
  # require_metadata <field text> <literal> <package> <field>
  local text="$1" literal="$2" package="$3" field="$4"
  printf '%s\n' "$text" | grep -Fq -- "$literal" || {
    echo "smoke: $package $field does not declare '$literal'" >&2
    exit 1
  }
}

check_deb_metadata() {
  local deb="$1" name="$2" depends
  depends="$(dpkg-deb --field "$deb" Depends)"
  # The build host is Ubuntu 24.04 (glibc 2.39); a package that does
  # not carry the floor would install on a host where the binary cannot
  # resolve its GLIBC symbols.
  require_metadata "$depends" "libc6 (>= $GLIBC_FLOOR)" "$deb" "Depends"
  if [ "$name" = desktop ]; then
    # winit's X11 backend dlopens these four libraries; installing the
    # deb through apt must pull them in on a minimal desktop.
    for library in libxcursor1 libxrandr2 libxi6 libxinerama1; do
      require_metadata "$depends" "$library" "$deb" "Depends"
    done
  fi
}

check_rpm_metadata() {
  local rpm="$1" name="$2" requires
  requires="$(rpm -qp --requires "$rpm")"
  require_metadata "$requires" "glibc >= $GLIBC_FLOOR" "$rpm" "Requires"
  if [ "$name" = desktop ]; then
    for library in libXcursor libXrandr libXi libXinerama; do
      require_metadata "$requires" "$library" "$rpm" "Requires"
    done
  fi
}

for deb in "${DEBS[@]+"${DEBS[@]}"}"; do
  require_command dpkg-deb "install dpkg-dev"
  [ -f "$deb" ] || {
    echo "smoke: missing deb $deb" >&2
    exit 1
  }
  name="$(package_name "$deb")"
  [ "$name" != unknown ] || {
    echo "smoke: cannot identify layer from $deb" >&2
    exit 1
  }
  dpkg-deb --info "$deb" | grep -q "Version: $VERSION" || {
    echo "smoke: $deb does not carry version $VERSION" >&2
    exit 1
  }
  check_deb_metadata "$deb" "$name"
  root="$WORK/deb-$name"
  dpkg-deb -x "$deb" "$root"
  check_version "$root/usr/bin/maze-chase-$name" "$deb"
  test -f "$root/usr/share/doc/maze-chase-$name/README.md" || {
    echo "smoke: $deb has no README.md" >&2
    exit 1
  }
  grep -q 'MIT License' "$root/usr/share/doc/maze-chase-$name/copyright" || {
    echo "smoke: $deb has no MIT license text" >&2
    exit 1
  }
  echo "smoke: ok $deb"
done

for rpm in "${RPMS[@]+"${RPMS[@]}"}"; do
  require_command rpm "install rpm"
  require_command rpm2cpio "install rpm2cpio"
  require_command cpio "install cpio"
  [ -f "$rpm" ] || {
    echo "smoke: missing rpm $rpm" >&2
    exit 1
  }
  # The extraction subshell changes directory, so make a relative input
  # absolute before rpm2cpio reads it.
  rpm="$(cd "$(dirname "$rpm")" && pwd)/$(basename "$rpm")"
  name="$(package_name "$rpm")"
  [ "$name" != unknown ] || {
    echo "smoke: cannot identify layer from $rpm" >&2
    exit 1
  }
  rpm -qip "$rpm" | grep -q "Version[[:space:]]*: $VERSION" || {
    echo "smoke: $rpm does not carry version $VERSION" >&2
    exit 1
  }
  check_rpm_metadata "$rpm" "$name"
  root="$WORK/rpm-$name"
  mkdir -p "$root"
  (
    cd "$root"
    rpm2cpio "$rpm" | cpio -idm --quiet
  )
  check_version "$root/usr/bin/maze-chase-$name" "$rpm"
  test -f "$root/usr/share/doc/maze-chase-$name/README.md" || {
    echo "smoke: $rpm has no README.md" >&2
    exit 1
  }
  grep -q 'MIT License' "$root/usr/share/licenses/maze-chase-$name/LICENSE" || {
    echo "smoke: $rpm has no MIT license text" >&2
    exit 1
  }
  echo "smoke: ok $rpm"
done

for tarball in "${TARBALLS[@]+"${TARBALLS[@]}"}"; do
  [ -f "$tarball" ] || {
    echo "smoke: missing tarball $tarball" >&2
    exit 1
  }
  name="$(package_name "$tarball")"
  [ "$name" != unknown ] || {
    echo "smoke: cannot identify layer from $tarball" >&2
    exit 1
  }
  unpack="$WORK/tar-$name"
  prefix="$WORK/prefix-$name"
  mkdir -p "$unpack"
  tar -xzf "$tarball" -C "$unpack"
  check_version "$unpack/maze-chase-$name" "$tarball"
  # Install, launch from the prefix, then uninstall and prove removal.
  # Exercise the installer shipped inside the archive, the path the
  # launch guide tells users to run, not the repository copy.
  [ -x "$unpack/install-linux.sh" ] || {
    echo "smoke: $tarball lacks install-linux.sh" >&2
    exit 1
  }
  ( cd "$unpack" && ./install-linux.sh --prefix "$prefix" ) >/dev/null
  check_version "$prefix/bin/maze-chase-$name" "$tarball installed"
  ( cd "$unpack" && ./uninstall-linux.sh --prefix "$prefix" ) >/dev/null
  [ ! -e "$prefix/bin/maze-chase-$name" ] || {
    echo "smoke: $name uninstall left the binary behind" >&2
    exit 1
  }
  echo "smoke: ok $tarball (install and uninstall round trip)"
done
