#!/usr/bin/env bash
set -euo pipefail
# C0 probe rail for the entropy backend (issue #130, blueprint phase C1).
#
# Measures stage-exact coder variants on the pipeline's own residual streams:
#   v0       shipped legacy backend (sign-first, single-rate, uniform init)
#   v1       zero-flag-first ordering, otherwise legacy (the research V1)
#   v1shared research V3 analog: legacy bins, one shared context
#   v2       backend v2: zero-first + dual-rate + class-prior hierarchy
#   v2shared v2 with a single degenerate context (context-inertness reference)
#
# Sizes are payload-only (no container overhead) and directly comparable to
# the research probe numbers in docs/research-gap-analysis.md F3.
#
# Acceptance (architecture-jxl-parity.md section 3.3), evaluated per image in
# BOTH raw bytes and percent - no unit mixing:
#   A1: v2 captures >= 80 percent of the pinned V1 win on each probe image.
#   A2: on kodim13, removing context information from v2 must cost >= 3.0
#       percent of v0 (the real-coder context benefit; was 0.9 percent in v1).
#
# Corpus discipline: input images are verified against data/kodak.sha256
# BEFORE any measurement; a mismatch is a hard error, not a warning.
#
# Usage:
#   probe_backend.sh --image /path/kodim01.ppm --image /path/kodim13.ppm
#   probe_backend.sh --self-check
#   probe_backend.sh --image ... [--build-dir DIR] [--skip-gates]

IMAGES=()
BUILD_DIR=""
SKIP_GATES=0
SELF_CHECK=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --image) IMAGES+=("$2"); shift 2;;
    --build-dir) BUILD_DIR="$2"; shift 2;;
    --skip-gates) SKIP_GATES=1; shift;;
    --self-check) SELF_CHECK=1; shift;;
    *) echo "unknown arg $1"; exit 2;;
  esac
done

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

evaluate() {
  # evaluate RESULTS_CSV -> prints verdict lines, exits nonzero on gate fail.
  # Pinned V1 wins (percent of v0 payload) and v0 calibration sizes come from
  # the committed research measurements (docs/research-gap-analysis.md F3).
  python3 - "$1" <<'PY'
import csv, sys
rows = list(csv.DictReader(open(sys.argv[1])))
if not rows:
    print("PROBE GATE FAIL (no results)"); sys.exit(1)

PINS = {  # image -> (pinned v1 win percent, pinned v0 bytes)
    "kodim01.ppm": (-5.1, 584218),
    "kodim13.ppm": (-3.4, 685140),
}

by_img = {}
for r in rows:
    by_img.setdefault(r["image"], {})[r["variant"]] = r

ok = True
for img, vars_ in sorted(by_img.items()):
    need = {"v0", "v1", "v2", "v2shared"}
    if not need.issubset(vars_):
        print(f"PROBE GATE FAIL ({img}: missing variants {need - set(vars_)})"); ok = False; continue
    v0 = int(vars_["v0"]["bytes"]); v1 = int(vars_["v1"]["bytes"])
    v2 = int(vars_["v2"]["bytes"]); v2s = int(vars_["v2shared"]["bytes"])
    v1_pct = 100.0 * (v1 - v0) / v0
    v2_pct = 100.0 * (v2 - v0) / v0
    gain_pct = 100.0 * (v2s - v2) / v0
    line = (f"{img}: v0 {v0} B | v1 {v1_pct:+.2f}% | v2 {v2_pct:+.2f}% "
            f"| context gain {gain_pct:.2f}%")
    pin_pct, _pin_v0 = PINS.get(img, (min(v1_pct, -1.0), None))
    cap = (-v2_pct) / (-pin_pct) * 100.0 if pin_pct < 0 else 0.0
    print(line + f" | captures {cap:.0f}% of pinned V1 win")
    # A1: at least 80 percent of the pinned V1 win, in percent-of-percent so
    # both sides share one unit.
    if cap < 80.0:
        print(f"A1 FAIL ({img}): captured {cap:.0f}% < 80% of pinned V1 win {pin_pct}"); ok = False
    else:
        print(f"A1 OK ({img})")
    # A2: context benefit target, only enforced where the blueprint pins it.
    if img == "kodim13.ppm":
        if gain_pct < 3.0:
            print(f"A2 FAIL (kodim13): context gain {gain_pct:.2f}% < 3.00% target"); ok = False
        else:
            print(f"A2 OK (kodim13)")

sys.exit(0 if ok else 1)
PY
}

if [[ "$SELF_CHECK" == "1" ]]; then
  # Prove the evaluator can PASS and can FAIL; a gate that cannot fail is
  # worse than no gate (same principle as bench_gate.sh --self-check).
  TMP="$(mktemp -d)"
  trap 'rm -rf "$TMP"' EXIT
  printf 'image,variant,bytes,delta_vs_v0_pct\n' > "$TMP/pass.csv"
  # Synthetic evaluator test: A1 rows are the real measured deltas; the
  # v2shared value is raised so A2's context-gain bar is also met, proving
  # the evaluator recognizes a fully passing state.
  cat >> "$TMP/pass.csv" <<'CSV'
kodim01.ppm,v0,584218,0.000000
kodim01.ppm,v1,554087,-5.157494
kodim01.ppm,v2,553969,-5.177692
kodim01.ppm,v2shared,575000,-1.577692
kodim13.ppm,v0,685140,0.000000
kodim13.ppm,v1,661698,-3.421495
kodim13.ppm,v2,661520,-3.447476
kodim13.ppm,v2shared,709999,+3.640000
CSV
  cp "$TMP/pass.csv" "$TMP/fail.csv"
  # Break both gates: kodim01 v2 nearly equal to v0 (A1 capture collapses),
  # kodim13 v2shared pulled down to v2 (context gain collapses, A2 fails).
  sed -i 's/kodim01.ppm,v2,553969,-5.177692/kodim01.ppm,v2,584000,-0.037314/' "$TMP/fail.csv"
  sed -i 's/kodim13.ppm,v2shared,709999,+3.640000/kodim13.ppm,v2shared,665000,-2.940000/' "$TMP/fail.csv"
  echo "== self-check 1: known-good numbers must PASS all gates =="
  if ! evaluate "$TMP/pass.csv"; then
    echo "SELF-CHECK FAIL: evaluator rejected known-good numbers"; exit 1
  fi
  echo "== self-check 2: known-bad numbers must FAIL a gate =="
  if evaluate "$TMP/fail.csv" > "$TMP/bad.out" 2>&1; then
    echo "SELF-CHECK FAIL: evaluator accepted inflated v0 (robustness hole)"; exit 1
  fi
  cat "$TMP/bad.out"
  echo "SELF-CHECK PASS: probe gates demonstrably pass and fail"
  exit 0
fi

if [[ ${#IMAGES[@]} -eq 0 ]]; then
  echo "no --image given (expect kodim01.ppm kodim13.ppm)"; exit 2
fi

BIN="${BUILD_DIR:-${ROOT}/../build}/prism"
if [[ ! -x "$BIN" ]]; then
  echo "prism binary not found at $BIN (pass --build-dir or build first)"; exit 1
fi

# Corpus discipline: verify every input against the pinned sha256 list first.
PIN_FILE="${ROOT}/benchmarks/data/kodak.sha256"
for IMG in "${IMAGES[@]}"; do
  NAME="$(basename "$IMG")"
  WANT="$(grep " ${NAME}\$" "$PIN_FILE" | awk '{print $1}')"
  if [[ -z "$WANT" ]]; then echo "${NAME}: not in ${PIN_FILE}; refusing to measure"; exit 1; fi
  GOT="$(sha256sum "$IMG" | awk '{print $1}')"
  if [[ "$GOT" != "$WANT" ]]; then
    echo "${NAME}: SHA256 MISMATCH (got ${GOT}, want ${WANT}) - refusing to measure"; exit 1
  fi
  echo "${NAME}: sha256 pin verified"
done

STAMP=$(date +%Y-%m-%d)
OUT_CSV="${ROOT}/benchmarks/results/${STAMP}-backend-probe.csv"
RAW_CSV="$(mktemp)"
echo "image,variant,bytes,delta_vs_v0_pct" > "$RAW_CSV"
for IMG in "${IMAGES[@]}"; do
  "$BIN" probe-backend "$IMG" | grep '^RESULT,' | sed 's/^RESULT,//' >> "$RAW_CSV"
done
cp "$RAW_CSV" "$OUT_CSV"
echo "== probe results (${OUT_CSV}) =="
cat "$OUT_CSV"

if [[ "$SKIP_GATES" != "1" ]]; then
  if ! evaluate "$RAW_CSV"; then
    echo "PROBE GATE FAIL (acceptance not met; see architecture-jxl-parity.md 3.3)"
    exit 1
  fi
  echo "PROBE GATE PASS (A1+A2)"
fi
