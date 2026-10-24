#!/usr/bin/env bash
# Rebuild the committed browser artifact from the current sources and fail
# closed when the bytes differ. The committed wasm must be reproducible on
# the recorded toolchain, so a stale web/maze-chase.wasm can never ship.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../common.sh
source "$SCRIPT_DIR/../common.sh"

RECORDED_RUST="1.99.0"
require_command cargo "install the Rust toolchain"
require_command rustc "install the Rust toolchain"
require_command cmp "install diffutils"

current="$(rustc --version | awk '{print $2}')"
if [ "$current" != "$RECORDED_RUST" ]; then
  echo "check-wasm: rustc $current is not the recorded $RECORDED_RUST" >&2
  echo "check-wasm: install it with: rustup toolchain install $RECORDED_RUST --profile minimal" >&2
  exit 1
fi

if command -v rustup >/dev/null 2>&1; then
  if ! rustup target list --installed | grep -qx wasm32-unknown-unknown; then
    echo "check-wasm: wasm32-unknown-unknown is not installed" >&2
    echo "check-wasm: install it with: rustup target add wasm32-unknown-unknown" >&2
    exit 1
  fi
fi

built_dir="$(mktemp -d)"
trap 'rm -rf "$built_dir"' EXIT
CARGO_TARGET_DIR="$built_dir/target" cargo build \
  --release --locked --target wasm32-unknown-unknown \
  -p maze-chase-web --manifest-path "$ROOT/Cargo.toml"

built="$built_dir/target/wasm32-unknown-unknown/release/maze_chase_web.wasm"
committed="$ROOT/web/maze-chase.wasm"
if [ ! -f "$built" ]; then
  echo "check-wasm: expected the build at $built" >&2
  exit 1
fi
if [ ! -f "$committed" ]; then
  echo "check-wasm: missing committed artifact $committed" >&2
  exit 1
fi
if ! cmp -s "$built" "$committed"; then
  echo "check-wasm: committed wasm is stale" >&2
  echo "  built:     $(sha256_file "$built") ($(wc -c < "$built" | tr -d ' ') bytes)" >&2
  echo "  committed: $(sha256_file "$committed") ($(wc -c < "$committed" | tr -d ' ') bytes)" >&2
  echo "  refresh with: cp target/wasm32-unknown-unknown/release/maze_chase_web.wasm web/maze-chase.wasm" >&2
  exit 1
fi
printf 'check-wasm: committed wasm matches a clean rebuild (%s bytes, sha256 %s)\n' \
  "$(wc -c < "$committed" | tr -d ' ')" "$(sha256_file "$committed")"
