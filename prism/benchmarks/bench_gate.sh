#!/usr/bin/env bash
set -euo pipefail
# bench_gate.sh: verifies milestone bpp gates on real Kodak
# Usage: ./bench_gate.sh --effort N --kodak DIR [--gate m1|m2|m3|m4]
EFFORT=0
KODAK=""
GATE="m1"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --effort) EFFORT="$2"; shift 2;;
    --kodak) KODAK="$2"; shift 2;;
    --gate) GATE="$2"; shift 2;;
    *) echo "unknown $1"; exit 2;;
  esac
done
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
if [[ -z "$KODAK" ]]; then KODAK="${ROOT}/benchmarks/data/kodak"; fi
OUT=$(mktemp)
# Run kodak and capture mean_summed
"${ROOT}/benchmarks/run_kodak.sh" --effort "$EFFORT" --kodak "$KODAK" 2>&1 | tee "$OUT"
MEAN=$(grep -oP 'mean_bpp_summed=\K[0-9.]+' "$OUT" | tail -1)
echo "gate=$GATE mean_summed=$MEAN"
case "$GATE" in
  m1) TARGET=13.05; TARGET2=9.61; if python3 -c "import sys; sys.exit(0 if $MEAN < $TARGET2 else 1)"; then echo "M1 WebP gate PASS ($MEAN < $TARGET2)"; else echo "M1 WebP gate FAIL ($MEAN >= $TARGET2)"; exit 1; fi;;
  m2) TARGET=9.71; if python3 -c "import sys; sys.exit(0 if $MEAN < $TARGET else 1)"; then echo "M2 gate PASS"; else echo "M2 FAIL"; exit 1; fi;;
  m3) TARGET=8.71; if python3 -c "import sys; sys.exit(0 if $MEAN < $TARGET else 1)"; then echo "M3 JXL gate PASS"; else echo "M3 JXL gate FAIL"; exit 1; fi;;
  m4) TARGET=8.0; if python3 -c "import sys; sys.exit(0 if $MEAN < $TARGET else 1)"; then echo "M4 PASS"; else echo "M4 FAIL"; exit 1; fi;;
  *) echo "unknown gate $GATE"; exit 2;;
esac
