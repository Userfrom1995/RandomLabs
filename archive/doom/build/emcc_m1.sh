#!/bin/sh
# M1 doomgeneric Wasm build (SIMD + scalar split, no pthreads).
# Requires Emscripten SDK (emsdk) on PATH. Outputs doom/wasm/doom-simd.wasm
# and doom/wasm/doom-scalar.wasm plus JS glue with same-origin relative paths.
# FORBIDDEN flags (Pages cannot set COOP/COEP, so no threads): -pthread,
# -sUSE_PTHREADS, -sSHARED_MEMORY. This script aborts if they appear.
set -eu

case " $* " in
  *" -pthread "*|*" USE_PTHREADS "*|*"SHARED_MEMORY"*)
    echo "error: pthreads/SharedArrayBuffer forbidden on Pages (no COOP/COEP)" >&2
    exit 1 ;;
esac

if ! command -v emcc >/dev/null 2>&1; then
  echo "error: emcc not found; install emsdk (https://emscripten.org/docs/getting_started/downloads.html)" >&2
  exit 1
fi

SRC="$(dirname "$0")/shim_m1.c"
OUT="$(dirname "$0")/../wasm"
DOOMGENERIC_SRC="${DOOMGENERIC_SRC:-./vendor/doomgeneric}"
mkdir -p "$OUT"

BASE_FLAGS="-O2 -sALLOW_MEMORY_GROWTH=1 -sMODULARIZE=1 -sEXPORT_ES6=1 \
  -sEXPORTED_FUNCTIONS=_main,_doom_getFrameBuffer,_doom_getWidth,_doom_getHeight,_DG_QueueKey \
  -sEXPORTED_RUNTIME_METHODS=wasmMemory \
  -I$DOOMGENERIC_SRC"

# Scalar build (universal fallback).
# shellcheck disable=SC2086
emcc $BASE_FLAGS \
  "$SRC" "$DOOMGENERIC_SRC/doomgeneric/doomgeneric.c" \
  -o "$OUT/doom-scalar.js"

# SIMD build (Tier 0 desktops; loader probes with WebAssembly.validate).
# shellcheck disable=SC2086
emcc $BASE_FLAGS -msimd128 \
  "$SRC" "$DOOMGENERIC_SRC/doomgeneric/doomgeneric.c" \
  -o "$OUT/doom-simd.js"

ls -la "$OUT"
