#!/usr/bin/env bash
# Shared packaging helpers: one workspace version, one dist directory,
# host artifact names, reproducible timestamps, and checksum helpers.
#
# Source this file from a packaging script. It must not be executed on
# its own. Every script that reads or writes an artifact goes through
# these helpers so a version bump never leaves a stale name behind.

set -euo pipefail

# dpkg-deb rejects a control directory that inherits a restrictive
# caller umask (0700 is invalid), and generated payload files would
# otherwise vary in mode. One shared pin keeps every package and
# archive independent of the invoking shell.
umask 022

PACKAGING_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$PACKAGING_DIR/.." && pwd)"
DIST="$ROOT/dist"
export DIST
REPO_ROOT="$(cd "$ROOT/.." && pwd)"

# The single version source. Every crate inherits [workspace.package],
# and every artifact name, control file, plist, and installer reads it
# here. A tag/version mismatch fails the release pipeline closed.
workspace_version() {
  awk '
    /^\[workspace\.package\]/ { inside = 1; next }
    /^\[/ { inside = 0 }
    inside && $1 == "version" {
      value = $3
      gsub(/\r/, "", value)
      gsub(/"/, "", value)
      print value
      exit
    }
  ' "$ROOT/Cargo.toml"
}

VERSION="$(workspace_version)"
export VERSION
if [ -z "$VERSION" ]; then
  echo "cannot read [workspace.package] version from $ROOT/Cargo.toml" >&2
  exit 1
fi

host_os() {
  uname -s | tr '[:upper:]' '[:lower:]'
}

# User-facing OS token used in artifact names. Darwin is presented as
# macos so download names match the release notes and install guide.
artifact_os() {
  case "$(host_os)" in
    darwin) echo macos ;;
    *) host_os ;;
  esac
}

# Portable machine names for artifact filenames (not the package
# architecture spellings; deb/rpm builders map these separately).
host_arch() {
  case "$(uname -m)" in
    x86_64 | amd64) echo x86_64 ;;
    aarch64 | arm64) echo arm64 ;;
    *) uname -m ;;
  esac
}

deb_arch() {
  case "$(uname -m)" in
    x86_64 | amd64) echo amd64 ;;
    aarch64 | arm64) echo arm64 ;;
    *) uname -m ;;
  esac
}

rpm_arch() {
  case "$(uname -m)" in
    x86_64 | amd64) echo x86_64 ;;
    aarch64 | arm64) echo aarch64 ;;
    *) uname -m ;;
  esac
}

HOST_OS="$(artifact_os)"
HOST_ARCH="$(host_arch)"
export HOST_OS HOST_ARCH

# Reproducible archives and packages use the tagged commit time. Callers
# may override it; a release pipeline exports the tag commit time.
if [ -z "${SOURCE_DATE_EPOCH:-}" ]; then
  SOURCE_DATE_EPOCH="$(git -C "$REPO_ROOT" log -1 --format=%ct 2>/dev/null || printf '0')"
  export SOURCE_DATE_EPOCH
fi

sha256_file() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1" | awk '{print $1}'
  else
    shasum -a 256 "$1" | awk '{print $1}'
  fi
}

write_checksums() {
  # write_checksums <dir> <file>... writes basename plus digest in
  # sha256sum -c format, sorted by artifact name.
  local dir="$1"
  shift
  (
    cd "$dir"
    : > SHA256SUMS.tmp
    local file
    for file in "$@"; do
      printf '%s  %s\n' "$(sha256_file "$file")" "$file" >> SHA256SUMS.tmp
    done
    LC_ALL=C sort -k2 SHA256SUMS.tmp > SHA256SUMS.txt
    rm -f SHA256SUMS.tmp
  )
}

# Build a byte-stable tar.gz. GNU tar pins every metadata field in one
# pass; macOS hosts (bsdtar) cannot express the same pins, so a small
# Python writer produces the same sorted, fixed-metadata gzip stream.
# A host with neither tool fails loudly: a non-deterministic archive
# must never be quietly published as reproducible.
reproducible_targz() {
  local stage="$1" out="$2"
  rm -f "$out"
  # The top-level entry inherits the stage directory mode; pin it so the
  # caller's umask cannot change the archive bytes.
  chmod 0755 "$stage"
  if tar --version 2>/dev/null | grep -q 'GNU tar'; then
    tar --sort=name \
      --mtime="@${SOURCE_DATE_EPOCH}" \
      --owner=0 --group=0 --numeric-owner \
      --mode='u+rwX,go+rX,go-w' \
      -cf - -C "$stage" . | gzip -9n >"$out"
  elif command -v python3 >/dev/null 2>&1; then
    python3 - "$stage" "$out" "$SOURCE_DATE_EPOCH" <<'PY'
import gzip
import os
import sys
import tarfile

stage, out, epoch = sys.argv[1], sys.argv[2], int(sys.argv[3])
entries = []
for root, dirs, files in os.walk(stage):
    dirs.sort()
    files.sort()
    rel_root = os.path.relpath(root, stage)
    if rel_root == ".":
        entries.append((".", root, True))
    else:
        entries.append((rel_root, root, True))
    for name in files:
        arcname = name if rel_root == "." else os.path.join(rel_root, name)
        entries.append((arcname, os.path.join(root, name), False))
entries.sort(key=lambda entry: entry[0])

with open(out, "wb") as raw:
    with gzip.GzipFile(filename="", mode="wb", fileobj=raw, mtime=0, compresslevel=9) as gz:
        with tarfile.open(fileobj=gz, mode="w", format=tarfile.PAX_FORMAT) as tf:
            for arcname, path, is_dir in entries:
                info = tarfile.TarInfo(arcname)
                info.mtime = epoch
                info.uid = info.gid = 0
                info.uname = info.gname = ""
                if is_dir:
                    info.type = tarfile.DIRTYPE
                    info.mode = 0o755
                    info.size = 0
                    tf.addfile(info)
                else:
                    info.type = tarfile.REGTYPE
                    info.mode = 0o755 if os.stat(path).st_mode & 0o111 else 0o644
                    info.size = os.path.getsize(path)
                    with open(path, "rb") as source:
                        tf.addfile(info, source)
PY
  else
    echo "error: reproducible tarballs need GNU tar or python3" >&2
    return 1
  fi
}

require_command() {
  local name="$1" hint="$2"
  if ! command -v "$name" >/dev/null 2>&1; then
    echo "missing required tool: $name ($hint)" >&2
    exit 1
  fi
}
