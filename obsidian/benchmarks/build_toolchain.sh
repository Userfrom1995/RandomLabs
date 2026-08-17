#!/usr/bin/env bash
# Build the pinned reference toolchain for the Obsidian Kodak benchmark.
#
# Installs (via apt) the distro codecs and builds the CharLS-based JPEG-LS
# CLI (cjls) from the pinned upstream source. Run once per machine; records
# exact versions in toolchain.md. Non-interactive.
set -euo pipefail

CHARLS_VERSION="2.4.2"
CHARLS_SHA256="d1c2c35664976f1e43fec7764d72755e6a50a80f38eca70fcc7553cad4fe19d9"
TOOLS_DIR="$(cd "$(dirname "$0")" && pwd)/tools"
BUILD_DIR="${TMPDIR:-/tmp}/charls-build"

echo "==> apt: installing distro codecs"
sudo apt-get update -qq
sudo apt-get install -y -qq libjxl-tools webp optipng pngcrush imagemagick \
    build-essential cmake >/dev/null

echo "==> CharLS ${CHARLS_VERSION} (JPEG-LS reference)"
mkdir -p "$TOOLS_DIR"
if [ ! -x "$TOOLS_DIR/cjls" ]; then
  rm -rf "$BUILD_DIR"
  mkdir -p "$BUILD_DIR"
  curl -sL -o "$BUILD_DIR/charls.tar.gz" \
    "https://github.com/team-charls/charls/archive/refs/tags/${CHARLS_VERSION}.tar.gz"
  echo "${CHARLS_SHA256}  $BUILD_DIR/charls.tar.gz" | sha256sum -c - >/dev/null
  tar xzf "$BUILD_DIR/charls.tar.gz" -C "$BUILD_DIR"
  cmake -S "$BUILD_DIR/charls-${CHARLS_VERSION}" -B "$BUILD_DIR/build" \
    -DCMAKE_BUILD_TYPE=Release >/dev/null
  cmake --build "$BUILD_DIR/build" -j"$(nproc)" >/dev/null
  g++ -O2 -std=c++17 -I"$BUILD_DIR/charls-${CHARLS_VERSION}/include" \
      "$TOOLS_DIR/cjls.cpp" -o "$TOOLS_DIR/cjls" \
      -L"$BUILD_DIR/build" -lcharls \
      -Wl,-rpath,"$BUILD_DIR/build"
fi
echo "==> done. Verify with: bash benchmarks/verify_toolchain.sh"
