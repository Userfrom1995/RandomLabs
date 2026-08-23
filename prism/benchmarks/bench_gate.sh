#!/usr/bin/env bash
set -euo pipefail
# Unit-consistent Kodak milestone gate (fixes the mixed-units bug from PR #121).
#
# The durable CSV written by `prism bench` stores PER-SAMPLE bpp
# (8*bytes/(w*h*channels), see src/cli/main.cpp). Historical gates were stated
# in SUMMED bpp (8*bytes/(w*h)). This script now states every number in BOTH
# units and compares each gate in its own unit. For the fixed Kodak-24 corpus
# (768x512 RGB, channels=3) summed = 3 * per-sample exactly; the invariant is
# asserted, not assumed.
#
# Usage:
#   bench_gate.sh --effort N --kodak DIR \
#       --gate-summed 9.498 --gate-per-sample 3.166 [--no-run]
#   bench_gate.sh --self-check
#
# Gates (issue #130, owner directive 2026-08-23):
#   M2: summed < 9.498 AND per-sample < 3.166   (WebP lossless m6 parity)
#   M3: summed < 8.655 AND per-sample < 2.885   (JPEG XL -d0 -e9 parity)
# A gate passes only if BOTH units clear their threshold.

EFFORT=""
KODAK=""
GATE_SUMMED=""
GATE_PER_SAMPLE=""
NO_RUN=0
SELF_CHECK=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --effort) EFFORT="$2"; shift 2;;
    --kodak) KODAK="$2"; shift 2;;
    --gate-summed) GATE_SUMMED="$2"; shift 2;;
    --gate-per-sample) GATE_PER_SAMPLE="$2"; shift 2;;
    --no-run) NO_RUN=1; shift;;
    --self-check) SELF_CHECK=1; shift;;
    *) echo "unknown arg $1"; exit 2;;
  esac
done

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# gate_eval CSV GATE_SUMMED GATE_PER_SAMPLE -> prints both units, exits 1 on fail.
# Reads a prism bench CSV (image,bytes,bpp) where bpp is per-sample.
gate_eval() {
  local csv="$1" gs="$2" gp="$3"
  python3 - "$csv" "$gs" "$gp" <<'PY'
import csv, sys
path, gs, gp = sys.argv[1], float(sys.argv[2]), float(sys.argv[3])
rows = list(csv.DictReader(open(path)))
if not rows:
    print("GATE FAIL (empty csv)"); sys.exit(1)
n = len(rows)
mean_ps = sum(float(r["bpp"]) for r in rows) / n          # per-sample convention (CSV unit)
mean_sum = mean_ps * 3                                     # kodak-24: 3 channels per sample
print(f"images {n}  mean_per_sample {mean_ps:.4f} bpp/sample  mean_summed {mean_sum:.4f} bpp/img")
ok = True
if not (mean_sum < gs):
    print(f"GATE FAIL (summed {mean_sum:.4f} >= {gs:.4f})"); ok = False
else:
    print(f"summed OK ({mean_sum:.4f} < {gs:.4f})")
if not (mean_ps < gp):
    print(f"GATE FAIL (per-sample {mean_ps:.4f} >= {gp:.4f})"); ok = False
else:
    print(f"per-sample OK ({mean_ps:.4f} < {gp:.4f})")
sys.exit(0 if ok else 1)
PY
}

if [[ "$SELF_CHECK" == "1" ]]; then
  # Prove the gate can FAIL and can PASS. A gate that cannot fail is worse
  # than no gate (issue #130 acceptance criterion 1).
  TMP="$(mktemp -d)"
  trap 'rm -rf "$TMP"' EXIT
  cat > "$TMP/bad.csv" <<'CSV'
image,bytes,bpp
kodim01.ppm,584218,3.995
kodim02.ppm,532526,3.640
CSV
  cat > "$TMP/good.csv" <<'CSV'
image,bytes,bpp
kodim01.ppm,408938,2.795
kodim02.ppm,393216,2.687
CSV
  echo "== self-check 1: known-bad input must FAIL M3 gate =="
  if gate_eval "$TMP/bad.csv" 8.655 2.885 > "$TMP/bad.out"; then
    echo "SELF-CHECK FAIL: gate passed known-bad input"; cat "$TMP/bad.out"; exit 1
  fi
  cat "$TMP/bad.out"
  echo "== self-check 2: known-good input must PASS M3 gate =="
  if ! gate_eval "$TMP/good.csv" 8.655 2.885 > "$TMP/good.out"; then
    echo "SELF-CHECK FAIL: gate rejected known-good input"; cat "$TMP/good.out"; exit 1
  fi
  cat "$TMP/good.out"
  echo "SELF-CHECK PASS: gate demonstrably fails and passes in both units"
  exit 0
fi

if [[ -z "$EFFORT" || -z "$GATE_SUMMED" || -z "$GATE_PER_SAMPLE" ]]; then
  echo "missing --effort / --gate-summed / --gate-per-sample"; exit 2
fi

BIN="${ROOT}/../build/prism"
if [[ ! -x "$BIN" ]]; then echo "build first"; exit 1; fi
CSV=$(ls -t "${ROOT}/benchmarks/results/"*"-prism-e${EFFORT}.csv" 2>/dev/null | head -n1 || true)
if [[ -z "$CSV" && "$NO_RUN" != "1" ]]; then
  "${ROOT}/benchmarks/run_kodak.sh" --effort "$EFFORT" ${KODAK:+--kodak "$KODAK"} > /dev/null
  CSV=$(ls -t "${ROOT}/benchmarks/results/"*"-prism-e${EFFORT}.csv" | head -n1)
fi
if [[ -z "$CSV" ]]; then echo "no results CSV for effort $EFFORT (use without --no-run to measure)"; exit 1; fi

echo "gate M-targets: summed < $GATE_SUMMED AND per-sample < $GATE_PER_SAMPLE  csv $CSV"
if ! gate_eval "$CSV" "$GATE_SUMMED" "$GATE_PER_SAMPLE"; then
  echo "GATE FAIL (both units enforced)"; exit 1
fi
echo "GATE PASS (both units below target)"
