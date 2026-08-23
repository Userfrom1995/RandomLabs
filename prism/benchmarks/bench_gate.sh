#!/usr/bin/env bash
set -euo pipefail
# bench_gate.sh --effort N --kodak DIR --gate 8.71
EFFORT=0; KODAK=""; GATE=8.71
while [[ $# -gt 0 ]]; do case "$1" in --effort) EFFORT="$2"; shift 2;; --kodak) KODAK="$2"; shift 2;; --gate) GATE="$2"; shift 2;; *) echo "unknown $1"; exit 2;; esac; done
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BUILD="${ROOT}/../build"
BIN="${BUILD}/prism"
if [[ ! -x "$BIN" ]]; then echo "build first"; exit 1; fi
CSV=$(ls -t "${ROOT}/benchmarks/results/"*"-prism-e${EFFORT}.csv" 2>/dev/null | head -n1 || true)
if [[ -z "$CSV" ]]; then
  "${ROOT}/benchmarks/run_kodak.sh" --effort "$EFFORT" ${KODAK:+--kodak "$KODAK"} > /dev/null
  CSV=$(ls -t "${ROOT}/benchmarks/results/"*"-prism-e${EFFORT}.csv" | head -n1)
fi
mean=$(python3 -c "import csv; rows=list(csv.DictReader(open('$CSV'))); print(sum(float(r['bpp']) for r in rows)/len(rows) if rows else 99)")
echo "gate $GATE mean $mean csv $CSV"
python3 -c "import sys; m=float('$mean'); g=float('$GATE'); sys.exit(0 if m<g else 1)" && echo "GATE PASS ($mean < $GATE)" || { echo "GATE FAIL ($mean >= $GATE)"; exit 1; }
