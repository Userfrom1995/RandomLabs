#!/usr/bin/env bash
set -euo pipefail
# Bench the neural codec on Kodak-24 and produce a gate-compatible CSV.
#
# Usage:
#   bench-neural.sh --kodak DIR
#
# Output: results/<date>-neural-e1.csv (image,bytes,bpp format)
KODAK=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --kodak) KODAK="$2"; shift 2;;
    *) echo "unknown arg $1"; exit 2;;
  esac
done
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BUILD="${ROOT}/build"
PRISM_BIN="${BUILD}/prism"
if [[ ! -x "$PRISM_BIN" ]]; then
  echo "build prism first: cmake -S prism -B build && cmake --build build -j"
  exit 1
fi
if [[ -z "$KODAK" || ! -d "$KODAK" ]]; then
  echo "kodak dir not found: $KODAK (pass --kodak DIR with 24 PPMs)"
  exit 1
fi
OUTDIR="${ROOT}/benchmarks/results"
mkdir -p "$OUTDIR"
STAMP=$(date +%Y-%m-%d)
CSV="${OUTDIR}/${STAMP}-neural-e1.csv"
echo "image,bytes,bpp" > "$CSV"
total_bytes=0
count=0
for img in "$KODAK"/*.ppm; do
  [[ -f "$img" ]] || continue
  out="/tmp/prism_neural_bench_$(basename "$img").prism"
  "$PRISM_BIN" enc "$img" "$out" --neural > /dev/null 2>&1
  bytes=$(wc -c < "$out")
  w=768; h=512
  read w h < <(head -n 3 "$img" | tail -n 1 | awk '{print $1, $2}')
  bpp=$(python3 -c "print(8*$bytes/($w*$h*3))")
  echo "$(basename "$img"),$bytes,$bpp" >> "$CSV"
  total_bytes=$((total_bytes + bytes))
  count=$((count+1))
done
mean_bpp=$(python3 -c "import csv; rows=list(csv.DictReader(open('$CSV'))); m=sum(float(r['bpp']) for r in rows)/len(rows) if rows else 0; print(m)")
echo "mean_bpp=$mean_bpp over $count images -> $CSV"
cat "$CSV"
