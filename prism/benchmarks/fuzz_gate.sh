#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BUILD="${ROOT}/../build"
BIN="${BUILD}/prism"
if [[ ! -x "$BIN" ]]; then
  echo "build prism first"
  exit 1
fi
echo "=== prism fuzz_gate ==="
"$BIN" fuzz --iters 1000
echo "=== fuzz_gate PASS ==="
