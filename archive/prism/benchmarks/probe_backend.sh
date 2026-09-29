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
#   v2leaf   C2 leaf-only tree contexts + serialized tree bytes (per image)
#   v2composite C2b composite leaf*343+resdiff contexts + tree bytes (per image)
#
# The tree variants build exactly the model production would
# (build_spatial_flat_tree) and count the serialized model ONCE per image, so
# v2 vs v2composite is an end-to-end fair comparison (never-expand accounting).
#
# Sizes are payload-only (no container overhead) and directly comparable to
# the research probe numbers in docs/research-gap-analysis.md F3.
#
# Acceptance (architecture-jxl-parity.md section 3.3), evaluated per image in
# BOTH raw bytes and percent - no unit mixing:
#   A1: v2 captures >= 80 percent of the V1 win, where the V1 win is measured
#       in the SAME run from the v1 row (no hand-pinned constants).
#   A2: removing context information from v2 must cost real bytes: context
#       gain (v2shared - v2) >= 0.5 percent of v0 on kodim13 and > 0.1 percent
#       of v0 on kodim01.
#   B1 (C2b, enforced when measured): v2composite < v2 on every image -
#       the tree must refine the causal context profitably or it does not
#       ship (trial-bits acceptance applied at probe level).
#
# A2 recalibration record (2026-08-23 gate; magnitudes CORRECTED 2026-08-24,
# see .github/agents/decisions/builder/2026-08-24T09-30-00-d0-harness-a2-
# nonreproducible-and-d1-offline-rejection.md): the original 3 percent target
# predates the v2 binarization. The originally recorded oracle aggregates
# (-13.62/-18.38/-18.57) were NONREPRODUCIBLE and impossible against the
# measured H(E|cx) floor; harness-citable static-refinement ceiling is
# 1.13 points (bin-fine class16 -> ctx343) / 1.47 points (value mode),
# computed by ONE method: differences of the pooled TOTAL-row percentages
# in benchmarks/results/2026-08-24-ideal-probe.csv; the rest of measured
# context benefit is nonstationary tracking. The A2 gate
# itself (real coder gain 0.5/0.1 percent) is unaffected. Brackets: that
# CSV via probe_ideal.sh.
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
VARIANTS="v0,v1,v1shared,v2,v2shared,v2leaf,v2composite,v2act"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --image) IMAGES+=("$2"); shift 2;;
    --build-dir) BUILD_DIR="$2"; shift 2;;
    --skip-gates) SKIP_GATES=1; shift;;
    --self-check) SELF_CHECK=1; shift;;
    --variants) VARIANTS="$2"; shift 2;;
    *) echo "unknown arg $1"; exit 2;;
  esac
done

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

evaluate() {
  # evaluate RESULTS_CSV -> prints verdict lines, exits nonzero on gate fail.
  # A1 capture is computed from the MEASURED v1 win in the same CSV, so the
  # gate's arithmetic and every prose claim share one source (no hand-pinned
  # rounded constants).
  # C2b gate (B1): when the tree variants are present, the composite
  # leaf*343+resdiff coding INCLUDING serialized tree bytes must beat flat
  # v2 on every image measured - the trial-bits acceptance applied at probe
  # level. A composite row without a win is a FAIL, never a shrug.
  python3 - "$1" <<'PY'
import csv, sys
rows = list(csv.DictReader(open(sys.argv[1])))
if not rows:
    print("PROBE GATE FAIL (no results)"); sys.exit(1)

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
    cap = (-v2_pct) / (-v1_pct) * 100.0 if v1_pct < 0 else 0.0
    print(line + f" | captures {cap:.0f}% of measured V1 win")
    # A1: at least 80 percent of the same-run V1 win, in percent-of-percent so
    # both sides share one unit.
    if cap < 80.0:
        print(f"A1 FAIL ({img}): captured {cap:.0f}% < 80% of measured V1 win {v1_pct:.2f}%"); ok = False
    else:
        print(f"A1 OK ({img})")
    # A2: context benefit, recalibrated to the instrumented ceiling (see the
    # recalibration record in this file's header). Enforced on both probe
    # images: a firm bar where the oracle says value exists (kodim13) and a
    # strictly-positive check elsewhere.
    if img == "kodim13.ppm":
        if gain_pct < 0.5:
            print(f"A2 FAIL (kodim13): context gain {gain_pct:.2f}% < 0.50% target"); ok = False
        else:
            print(f"A2 OK (kodim13)")
    elif img == "kodim01.ppm":
        if gain_pct <= 0.1:
            print(f"A2 FAIL (kodim01): context gain {gain_pct:.2f}% <= 0.10% floor"); ok = False
        else:
            print(f"A2 OK (kodim01)")
    # B1 (C2b): composite refinement must beat flat v2 including model bytes.
    if "v2composite" in vars_:
        comp = int(vars_["v2composite"]["bytes"])
        d_flat = 100.0 * (comp - v2) / v0
        leaf_note = ""
        if "v2leaf" in vars_:
            leaf = int(vars_["v2leaf"]["bytes"])
            leaf_note = f" | v2leaf {100.0 * (leaf - v0) / v0:+.2f}%"
        print(f"{img}: v2composite {comp} B ({d_flat:+.2f}% of v0 vs flat){leaf_note}")
        if comp < v2:
            print(f"B1 OK ({img}): composite beats flat by {v2 - comp} B")
        else:
            print(f"B1 FAIL ({img}): composite {comp} >= flat v2 {v2}"); ok = False

sys.exit(0 if ok else 1)
PY
}

if [[ "$SELF_CHECK" == "1" ]]; then
  # Prove the evaluator can PASS and can FAIL; a gate that cannot fail is
  # worse than no gate (same principle as bench_gate.sh --self-check).
  TMP="$(mktemp -d)"
  trap 'rm -rf "$TMP"' EXIT
  printf 'image,variant,bytes,delta_vs_v0_pct\n' > "$TMP/pass.csv"
  # Synthetic evaluator test: rows are the real measured retuned-config
  # numbers; the v2shared values are raised so A2's context-gain bars are also
  # met, proving the evaluator recognizes a fully passing state.
  cat >> "$TMP/pass.csv" <<'CSV'
kodim01.ppm,v0,584218,0.000000
kodim01.ppm,v1,554087,-5.157494
kodim01.ppm,v2,546852,-6.395900
kodim01.ppm,v2shared,560000,-4.145600
kodim01.ppm,v2leaf,547902,-6.215600
kodim01.ppm,v2composite,545800,-6.573400
kodim13.ppm,v0,685140,0.000000
kodim13.ppm,v1,661698,-3.421495
kodim13.ppm,v2,652316,-4.790850
kodim13.ppm,v2shared,663000,-3.229400
kodim13.ppm,v2leaf,653500,-4.612900
kodim13.ppm,v2composite,651000,-4.977300
CSV
  cp "$TMP/pass.csv" "$TMP/fail_a.csv"
  cp "$TMP/pass.csv" "$TMP/fail_b.csv"
  # fail_a breaks A1 (kodim01 v2 nearly equal to v0) and A2 (kodim13
  # v2shared pulled down to v2); all other numbers stay passing.
  sed -i 's/kodim01.ppm,v2,546852,-6.395900/kodim01.ppm,v2,584000,-0.037314/' "$TMP/fail_a.csv"
  sed -i 's/kodim13.ppm,v2shared,663000,-3.229400/kodim13.ppm,v2shared,652500,-4.758800/' "$TMP/fail_a.csv"
  # fail_b breaks ONLY B1: kodim13 composite raised above flat v2 while every
  # A-gate number stays passing - proving B1 can fail on its own.
  sed -i 's/kodim13.ppm,v2composite,651000,-4.977300/kodim13.ppm,v2composite,653000,-4.686600/' "$TMP/fail_b.csv"
  echo "== self-check 1: known-good numbers must PASS all gates =="
  if ! evaluate "$TMP/pass.csv"; then
    echo "SELF-CHECK FAIL: evaluator rejected known-good numbers"; exit 1
  fi
  echo "== self-check 2: broken A1/A2 must FAIL =="
  if evaluate "$TMP/fail_a.csv" > "$TMP/bad_a.out" 2>&1; then
    echo "SELF-CHECK FAIL: evaluator accepted inflated v0 (robustness hole)"; exit 1
  fi
  grep -E "^A[12] FAIL" "$TMP/bad_a.out"
  echo "== self-check 3: broken B1 alone must FAIL =="
  if evaluate "$TMP/fail_b.csv" > "$TMP/bad_b.out" 2>&1; then
    echo "SELF-CHECK FAIL: evaluator accepted a losing composite (B1 hole)"; exit 1
  fi
  grep "^B1 FAIL" "$TMP/bad_b.out"
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
  "$BIN" probe-backend "$IMG" --variants "$VARIANTS" | grep '^RESULT,' | sed 's/^RESULT,//' >> "$RAW_CSV"
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
