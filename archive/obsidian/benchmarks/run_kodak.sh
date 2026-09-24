#!/usr/bin/env bash
# run_kodak.sh - the Obsidian Kodak benchmark harness.
#
# Protocol (see docs/benchmark-methodology.md):
#   1. Verify the pinned toolchain is present (skips missing codecs).
#   2. Fidelity gate: every image must round-trip bit-exact through Obsidian
#      and through each present reference codec (decode -> cmp).
#   3. Encode/decode every image with Obsidian (given effort) and the present
#      reference codecs, recording bytes, bpp, encode ms, decode ms.
#   4. Emit results/<date>-<version>.csv and a human-readable summary.
#
# Usage:
#   bash benchmarks/run_kodak.sh [--effort N] [--version V] [--out FILE]
# No interactive input. Non-zero exit if any fidelity gate fails.
set -uo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
DATA_DIR="$HERE/data/kodak"
RESULTS_DIR="$HERE/results"
TMP_DIR="$HERE/tmp"
TOOLS_DIR="$HERE/tools"

EFFORT=4
VERSION="v1"
OUT_FILE=""

while [ $# -gt 0 ]; do
  case "$1" in
    --effort) EFFORT="$2"; shift 2 ;;
    --version) VERSION="$2"; shift 2 ;;
    --out) OUT_FILE="$2"; shift 2 ;;
    *) echo "run_kodak.sh: unknown option $1" >&2; exit 2 ;;
  esac
done

if [ -z "$OUT_FILE" ]; then
  TODAY="$(date +%Y-%m-%d)"
  OUT_FILE="$RESULTS_DIR/${TODAY}-${VERSION}.csv"
fi

mkdir -p "$RESULTS_DIR" "$TMP_DIR"

# --- locate the Obsidian CLI -------------------------------------------------
if [ -n "${OBSIDIAN_BIN:-}" ] && [ -x "$OBSIDIAN_BIN" ]; then
  OBSIDIAN="$OBSIDIAN_BIN"
elif [ -x "$HERE/../target/release/obsidian_cli" ]; then
  OBSIDIAN="$HERE/../target/release/obsidian_cli"
else
  OBSIDIAN="obsidian_cli"
fi

# --- locate tools ------------------------------------------------------------
have() { command -v "$1" >/dev/null 2>&1 || [ -x "$TOOLS_DIR/$1" ]; }
tool() { if command -v "$1" >/dev/null 2>&1; then command -v "$1"; elif [ -x "$TOOLS_DIR/$1" ]; then echo "$TOOLS_DIR/$1"; else echo ""; fi; }

CJXL="$(tool cjxl)"; DJXL="$(tool djxl)"
CWEBP="$(tool cwebp)"; DWEBP="$(tool dwebp)"
OPTIPNG="$(tool optipng)"; PNGCRUSH="$(tool pngcrush)"
CONVERT="$(tool convert)"
CJLS="$(tool cjls)"
CHARLS_LIB="${CHARLS_LIB:-}"

# --- verify data manifest ----------------------------------------------------
echo "==> verifying Kodak data manifest"
if ! (cd "$HERE" && sha256sum -c data/kodak.sha256 >/dev/null 2>&1); then
  echo "run_kodak.sh: Kodak PPMs do not match kodak.sha256" >&2
  exit 1
fi

IMAGES=("$DATA_DIR"/*.ppm)
if [ "${#IMAGES[@]}" -eq 0 ]; then
  echo "run_kodak.sh: no PPM images in $DATA_DIR" >&2
  exit 1
fi

# --- collect tool versions ---------------------------------------------------
versions() {
  local v="obsidian-effort${EFFORT}"
  [ -n "$CJXL" ] && v="$v,cjxl=$("$CJXL" --version 2>&1 | head -1 | tr ' ' '_')"
  [ -n "$CWEBP" ] && v="$v,cwebp=$("$CWEBP" -version 2>&1 | head -1)"
  [ -n "$OPTIPNG" ] && v="$v,optipng=$("$OPTIPNG" --version 2>&1 | head -1 | sed 's/OptiPNG //')"
  [ -n "$PNGCRUSH" ] && v="$v,pngcrush=$("$PNGCRUSH" -version 2>&1 | head -1)"
  [ -n "$CONVERT" ] && v="$v,imagemagick=$("$CONVERT" -version 2>&1 | head -1 | sed 's/^Version: //')"
  [ -n "$CJLS" ] && v="$v,cjls=charls-2.4.2"
  echo "$v"
}
TOOLVER="$(versions)"

# --- helpers -----------------------------------------------------------------
csv_row() { # image codec bytes bpp enc_ms dec_ms
  printf "%s,%s,%s,%.4f,%.2f,%.2f\n" "$1" "$2" "$3" "$4" "$5" "$6"
}

area() { # <ppm> -> pixels
  awk 'NR==2 {print $1*$2}' "$1"
}

# --- fidelity + measure one codec on one image ------------------------------
# Each function: prints CSV row on success, returns nonzero on fidelity fail.
run_obsidian() {
  local ppm="$1" name="$2" a; a="$(area "$ppm")"
  local json out
  json="$("$OBSIDIAN" roundtrip --effort "$EFFORT" --json "$ppm" 2>/dev/null)" || { echo "obsidian encode failed on $name" >&2; return 1; }
  local bytes enc_ms dec_ms
  bytes="$(echo "$json" | sed -n 's/.*"bytes":\([0-9]*\).*/\1/p')"
  enc_ms="$(echo "$json" | sed -n 's/.*"encode_ms":\([0-9.]*\).*/\1/p')"
  dec_ms="$(echo "$json" | sed -n 's/.*"decode_ms":\([0-9.]*\).*/\1/p')"
  [ -n "$bytes" ] || { echo "obsidian parse failed on $name" >&2; return 1; }
  bpp="$(awk -v b="$bytes" -v a="$a" 'BEGIN{printf "%.4f", 8*b/a}')"
  csv_row "$name" "obsidian-e${EFFORT}" "$bytes" "$bpp" "$enc_ms" "$dec_ms"
}

run_jxl() {
  local ppm="$1" name="$2" a; a="$(area "$ppm")"
  local enc_ms dec_ms t0 t1 t2
  t0=$(date +%s%N)
  "$CJXL" -d 0 -e 7 --lossless_jpeg=0 "$ppm" "$TMP_DIR/$name.jxl" >/dev/null 2>&1 || return 1
  t1=$(date +%s%N); enc_ms=$(awk -v a="$t0" -v b="$t1" 'BEGIN{printf "%.2f", (b-a)/1e6}')
  "$DJXL" "$TMP_DIR/$name.jxl" "$TMP_DIR/$name-rt.ppm" >/dev/null 2>&1 || return 1
  cmp -s "$ppm" "$TMP_DIR/$name-rt.ppm" || { echo "JXL fidelity FAIL on $name" >&2; return 1; }
  t2=$(date +%s%N); dec_ms=$(awk -v a="$t1" -v b="$t2" 'BEGIN{printf "%.2f", (b-a)/1e6}')
  local bytes; bytes=$(stat -c%s "$TMP_DIR/$name.jxl")
  local bpp; bpp=$(awk -v b="$bytes" -v a="$a" 'BEGIN{printf "%.4f", 8*b/a}')
  csv_row "$name" "jxl" "$bytes" "$bpp" "$enc_ms" "$dec_ms"
}

run_webp() {
  local ppm="$1" name="$2" a; a="$(area "$ppm")"
  local enc_ms dec_ms t0 t1 t2
  t0=$(date +%s%N)
  "$CWEBP" -lossless -z 9 -m 6 "$ppm" -o "$TMP_DIR/$name.webp" >/dev/null 2>&1 || return 1
  t1=$(date +%s%N); enc_ms=$(awk -v a="$t0" -v b="$t1" 'BEGIN{printf "%.2f", (b-a)/1e6}')
  "$DWEBP" -ppm "$TMP_DIR/$name.webp" -o "$TMP_DIR/$name-rt.ppm" >/dev/null 2>&1 || return 1
  cmp -s "$ppm" "$TMP_DIR/$name-rt.ppm" || { echo "WebP fidelity FAIL on $name" >&2; return 1; }
  t2=$(date +%s%N); dec_ms=$(awk -v a="$t1" -v b="$t2" 'BEGIN{printf "%.2f", (b-a)/1e6}')
  local bytes; bytes=$(stat -c%s "$TMP_DIR/$name.webp")
  local bpp; bpp=$(awk -v b="$bytes" -v a="$a" 'BEGIN{printf "%.4f", 8*b/a}')
  csv_row "$name" "webp" "$bytes" "$bpp" "$enc_ms" "$dec_ms"
}

run_png() {
  local ppm="$1" name="$2" a; a="$(area "$ppm")"
  local enc_ms dec_ms t0 t1 t2
  "$CONVERT" "$ppm" -strip -depth 8 "$TMP_DIR/$name.png" || return 1
  t0=$(date +%s%N)
  if [ -n "$OPTIPNG" ]; then
    "$OPTIPNG" -o7 -strip all "$TMP_DIR/$name.png" >/dev/null 2>&1
  fi
  t1=$(date +%s%N); enc_ms=$(awk -v a="$t0" -v b="$t1" 'BEGIN{printf "%.2f", (b-a)/1e6}')
  "$CONVERT" "$TMP_DIR/$name.png" -depth 8 -endian MSB "$TMP_DIR/$name-rt.ppm" || return 1
  cmp -s "$ppm" "$TMP_DIR/$name-rt.ppm" || { echo "PNG fidelity FAIL on $name" >&2; return 1; }
  t2=$(date +%s%N); dec_ms=$(awk -v a="$t1" -v b="$t2" 'BEGIN{printf "%.2f", (b-a)/1e6}')
  local bytes; bytes=$(stat -c%s "$TMP_DIR/$name.png")
  local bpp; bpp=$(awk -v b="$bytes" -v a="$a" 'BEGIN{printf "%.4f", 8*b/a}')
  csv_row "$name" "png-optipng" "$bytes" "$bpp" "$enc_ms" "$dec_ms"

  if [ -n "$PNGCRUSH" ]; then
    t0=$(date +%s%N)
    "$PNGCRUSH" -brute -reduce "$TMP_DIR/$name.png" "$TMP_DIR/$name-cr.png" >/dev/null 2>&1 || true
    t1=$(date +%s%N); enc_ms=$(awk -v a="$t0" -v b="$t1" 'BEGIN{printf "%.2f", (b-a)/1e6}')
    if [ -f "$TMP_DIR/$name-cr.png" ]; then
      "$CONVERT" "$TMP_DIR/$name-cr.png" -depth 8 -endian MSB "$TMP_DIR/$name-cr-rt.ppm" || return 1
      cmp -s "$ppm" "$TMP_DIR/$name-cr-rt.ppm" || { echo "PNG-crush fidelity FAIL on $name" >&2; return 1; }
      t2=$(date +%s%N); dec_ms=$(awk -v a="$t1" -v b="$t2" 'BEGIN{printf "%.2f", (b-a)/1e6}')
      bytes=$(stat -c%s "$TMP_DIR/$name-cr.png")
      bpp=$(awk -v b="$bytes" -v a="$a" 'BEGIN{printf "%.4f", 8*b/a}')
      csv_row "$name" "png-pngcrush" "$bytes" "$bpp" "$enc_ms" "$dec_ms"
    fi
  fi
}

run_j2k() {
  local ppm="$1" name="$2" a; a="$(area "$ppm")"
  local enc_ms dec_ms t0 t1 t2
  t0=$(date +%s%N)
  "$CONVERT" "$ppm" -compress Lossless "$TMP_DIR/$name.jp2" || return 1
  t1=$(date +%s%N); enc_ms=$(awk -v a="$t0" -v b="$t1" 'BEGIN{printf "%.2f", (b-a)/1e6}')
  "$CONVERT" "$TMP_DIR/$name.jp2" -depth 8 -endian MSB "$TMP_DIR/$name-rt.ppm" || return 1
  cmp -s "$ppm" "$TMP_DIR/$name-rt.ppm" || { echo "JP2 fidelity FAIL on $name" >&2; return 1; }
  t2=$(date +%s%N); dec_ms=$(awk -v a="$t1" -v b="$t2" 'BEGIN{printf "%.2f", (b-a)/1e6}')
  local bytes; bytes=$(stat -c%s "$TMP_DIR/$name.jp2")
  local bpp; bpp=$(awk -v b="$bytes" -v a="$a" 'BEGIN{printf "%.4f", 8*b/a}')
  csv_row "$name" "j2k" "$bytes" "$bpp" "$enc_ms" "$dec_ms"
}

run_jls() {
  local ppm="$1" name="$2" a; a="$(area "$ppm")"
  local enc_ms dec_ms t0 t1 t2
  t0=$(date +%s%N)
  "$CJLS" encode "$ppm" "$TMP_DIR/$name.jls" >/dev/null 2>&1 || return 1
  t1=$(date +%s%N); enc_ms=$(awk -v a="$t0" -v b="$t1" 'BEGIN{printf "%.2f", (b-a)/1e6}')
  "$CJLS" decode "$TMP_DIR/$name.jls" "$TMP_DIR/$name-rt.ppm" >/dev/null 2>&1 || return 1
  cmp -s "$ppm" "$TMP_DIR/$name-rt.ppm" || { echo "JLS fidelity FAIL on $name" >&2; return 1; }
  t2=$(date +%s%N); dec_ms=$(awk -v a="$t1" -v b="$t2" 'BEGIN{printf "%.2f", (b-a)/1e6}')
  local bytes; bytes=$(stat -c%s "$TMP_DIR/$name.jls")
  local bpp; bpp=$(awk -v b="$bytes" -v a="$a" 'BEGIN{printf "%.4f", 8*b/a}')
  csv_row "$name" "jls" "$bytes" "$bpp" "$enc_ms" "$dec_ms"
}

# --- main loop ---------------------------------------------------------------
echo "==> fidelity gates + encoding (effort $EFFORT, $TOOLVER)"
echo "image,codec,bytes,bpp,enc_ms,dec_ms" > "$OUT_FILE"

declare -a RUNNERS=()
RUNNERS+=("obsidian")
[ -n "$CJXL" ] && RUNNERS+=(jxl)
[ -n "$CWEBP" ] && RUNNERS+=(webp)
[ -n "$OPTIPNG" ] && RUNNERS+=(png)
[ -n "$CONVERT" ] && RUNNERS+=(j2k)
[ -n "$CJLS" ] && RUNNERS+=(jls)

echo "codecs: ${RUNNERS[*]}"
failures=0
for img in "${IMAGES[@]}"; do
  name="$(basename "$img" .ppm)"
  for codec in "${RUNNERS[@]}"; do
    row="$(run_$codec "$img" "$name")" || { failures=$((failures+1)); continue; }
    echo "$row" >> "$OUT_FILE"
  done
done

if [ "$failures" -gt 0 ]; then
  echo "run_kodak.sh: $failures fidelity/encoding failure(s); version NOT valid" >&2
  exit 1
fi

echo "==> results written to $OUT_FILE"
cat "$OUT_FILE"
exit 0