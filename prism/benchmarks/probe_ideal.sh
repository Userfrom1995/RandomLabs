#!/usr/bin/env bash
set -euo pipefail
# D0 instrumentation rail for the D-series (issue #130, re-scope section D0).
#
# Wraps `prism bench-ideal`: dumps the production residual streams (YCoCg-R +
# chosen predictor + resdiff-343 causal contexts) and reports static-entropy
# brackets under the v2 binarization at two bin granularities plus the value-
# alphabet floor, each pooled three ways (shared / class16 / ctx343). All
# percentages are stated against v0 payload bytes. Contract:
# docs/algorithmic-spec.md section 11.1; invariant I7: every offline go/no-go
# projection must be reproducible by THIS harness.
#
# Gates (evaluated on the IDEALTOTAL row for predictor med):
#   G-order  ML monotonicity per granularity and image row:
#            shared >= class16 >= ctx343. A violation means fabricated data
#            or a broken harness - both are hard failures.
#   G-repro  regression anchor: the committed reference CSV row must be
#            reproduced within +-0.05 percentage points per column.
#
# ZRUN gate (D4 item 2, pre-registered BEFORE any corpus measurement):
#   ZR-anchor  every ZRUN row's causal E1 replica of plain v2 (bits_plain)
#              must match the measured v2 payload bytes within +-0.5 percent
#              on real-corpus images (skipped on synthetic ramps - too few
#              bins for byte-level comparison, same rule as G-anchor).
#   ZR-fmt     FORMAT-WORK ELIGIBILITY: aggregate adapt_pct <= -1.0 percent
#              AND no probe image shows adapt_pct > 0 (mixed sign never
#              adopts, per C2b). PASS only opens the door to container work;
#              it is not an acceptance.
# ZRUN CSV semantics mirror the IDEAL note above: TOTAL rows pool run-symbol
# histograms across images before entropy estimation (joint figures, not row
# sums); audit per-image numbers on their own rows.
#
# CSV semantics (read before auditing): TOTAL rows pool frequency histograms
# ACROSS images before entropy estimation (Acc::merge), so IDEALTOTAL columns
# are joint-estimation figures over the pooled streams and are intentionally
# NOT the sum of the per-image rows; audit per-image numbers on their own
# rows.
#
# A2-recalibration correction (2026-08-24, Builder D0): the aggregates
# recorded on 2026-08-23 in progress/130-prism-true-jxl-parity.md
# (shared -13.62 / class16 -18.38 / ctx343-oracle -18.57 percent vs v0) are
# NOT reproducible from the production streams by this committed harness in
# any documented interpretation, and the oracle figure is information-
# theoretically impossible: H(E|context) measured here is -12.98 percent vs
# v0, so no context-conditioned code can reach -18.57. The ephemeral run that
# produced those numbers cannot be audited and its magnitudes are retracted;
# see .github/agents/decisions/builder/2026-08-24T09-30-00-d0-harness-a2-
# nonreproducible.md for the full evidence. The harness-citable reference is
# the committed results CSV in benchmarks/results/.
#
# Corpus discipline: input images are verified against data/kodak.sha256
# BEFORE any measurement; a mismatch is a hard error.
#
# Usage:
#   probe_ideal.sh --image /path/kodim01.ppm --image /path/kodim13.ppm \
#                  [--predictor LIST] [--blend LIST] [--mixer LIST] [--zrun]
#   probe_ideal.sh --self-check
#   probe_ideal.sh --image ... [--build-dir DIR]

IMAGES=()
BUILD_DIR=""
SELF_CHECK=0
PREDICTORS="med"
BLENDS=""
MIXERS=""
ZRUN=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --image) IMAGES+=("$2"); shift 2;;
    --build-dir) BUILD_DIR="$2"; shift 2;;
    --predictor) PREDICTORS="$2"; shift 2;;
    --blend) BLENDS="$2"; shift 2;;
    --mixer) MIXERS="$2"; shift 2;;
    --zrun) ZRUN=1; shift;;
    --self-check) SELF_CHECK=1; shift;;
    *) echo "unknown arg $1"; exit 2;;
  esac
done

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

evaluate() {
  # evaluate IDEAL_CSV [MIXER_CSV] [ZRUN_CSV] -> verdict lines; exits nonzero
  # on gate failure. The three row families carry different headers, so they
  # are parsed from their own files (or skipped entirely).
  python3 - "$1" "${2:-}" "${3:-}" <<'PY'
import csv, sys

lines = open(sys.argv[1]).read().splitlines()
ideal_all = [l for l in lines if l.startswith("IDEAL,") or l.startswith("IDEALTOTAL,")]
if not ideal_all:
    # legacy form: bare header line ("image,predictor,...") + data rows
    ideal_all = [l for l in lines if l.strip()]
if not ideal_all:
    print("IDEAL GATE FAIL (no rows)"); sys.exit(1)
ideal_hdr = ideal_all[0].split(",")
rows = [dict(zip(ideal_hdr, l.split(","))) for l in ideal_all[1:] if l.strip()]
mixers = []
if sys.argv[2] and sys.argv[2] != "":
    mlines = open(sys.argv[2]).read().splitlines()
    mix_all = [l for l in mlines if l.startswith("MIXER,")]
    mix_hdr = mix_all[0].split(",")
    mixers = [dict(zip(mix_hdr, l.split(","))) for l in mix_all[1:]]
if not rows:
    print("IDEAL GATE FAIL (no rows)"); sys.exit(1)

COLS = [("coarse", "coarse_shared", "coarse_class16", "coarse_ctx343"),
        ("fine", "fine_shared", "fine_class16", "fine_ctx343"),
        ("val", "val_shared", "val_class16", "val_ctx343")]

ok = True

def pct(bits, v0):
    return 100.0 * ((bits / 8.0) - v0) / v0

for r in rows:
    v0 = float(r["v0_bytes"])
    if v0 <= 0:
        print(f"G-order FAIL ({r['image']}/{r['predictor']}: bad v0)"); ok = False; continue
    for name, sh, c16, cx in COLS:
        b_sh, b_c16, b_cx = float(r[sh]), float(r[c16]), float(r[cx])
        if not (b_sh >= b_c16 - 1e-6 and b_c16 >= b_cx - 1e-6):
            print(f"G-order FAIL ({r['image']}/{r['predictor']} {name}: "
                  f"{b_sh:.1f} >= {b_c16:.1f} >= {b_cx:.1f} violated)"); ok = False
    line = (f"{r['image']}/{r['predictor']}: v0 {int(v0)} B | "
            f"coarse {pct(float(r['coarse_shared']), v0):+.2f}/{pct(float(r['coarse_class16']), v0):+.2f}/"
            f"{pct(float(r['coarse_ctx343']), v0):+.2f}% | "
            f"fine {pct(float(r['fine_shared']), v0):+.2f}/{pct(float(r['fine_class16']), v0):+.2f}/"
            f"{pct(float(r['fine_ctx343']), v0):+.2f}% | "
            f"val {pct(float(r['val_shared']), v0):+.2f}/{pct(float(r['val_class16']), v0):+.2f}/"
            f"{pct(float(r['val_ctx343']), v0):+.2f}%")
    print(line)

# G-repro: every IDEALTOTAL/med column must match the reference within
# +/-0.05 points of percent-of-v0. Reference = committed results CSV row.
import os
ref_path = os.path.join(os.path.dirname(sys.argv[1]), "..", "results",
                        "2026-08-24-ideal-probe.csv")
if os.path.exists(ref_path):
    ref = None
    for rr in csv.DictReader(open(ref_path)):
        if rr["image"] == "all" and rr["predictor"] == "med":
            ref = rr
    tot = None
    for r in rows:
        if r["image"] == "all" and r["predictor"] == "med":
            tot = r
    if ref and tot:
        if abs(float(tot["v0_bytes"]) - float(ref["v0_bytes"])) > 0.5:
            print("G-repro SKIP (eval image set differs from the committed "
                  "reference pool; per-image rows still gated above)")
        else:
            for _, sh, c16, cx in COLS:
                for col in (sh, c16, cx):
                    a = pct(float(tot[col]), float(tot["v0_bytes"]))
                    b = pct(float(ref[col]), float(ref["v0_bytes"]))
                    if abs(a - b) > 0.05:
                        print(f"G-repro FAIL ({col}: measured {a:+.4f}% vs reference {b:+.4f}%)")
                        ok = False
            if ok:
                print("G-repro OK (ideal brackets match the committed reference)")
    else:
        print("G-repro SKIP (no med total/reference pair)")
else:
        print("G-repro SKIP (reference CSV absent)")

# G-anchor: every MIXER row's replica must reproduce the measured v2 payload
# within +-0.5 percent (spec 12.4). A violation means the sequential scorer
# diverged from encode_residual_v2 and NO mixer number can be trusted.
for r in mixers:
    a = float(r["anchor_pct"])
    if abs(a) > 0.5:
        print(f"G-anchor FAIL ({r['image']}/{r['preset']}: anchor {a:+.4f}% > 0.5%)")
        ok = False
if mixers and ok:
    print(f"G-anchor OK ({len(mixers)} mixer rows within +-0.5 percent of measured v2 bytes)")

zrows = []
if sys.argv[3] and sys.argv[3] != "":
    zlines = open(sys.argv[3]).read().splitlines()
    z_all = [l for l in zlines if l.startswith("ZRUN,") or l.startswith("ZRUNTOTAL,")]
    if z_all:
        z_hdr = z_all[0].split(",")
        zrows = [dict(zip(z_hdr, l.split(","))) for l in z_all[1:] if l.strip()]
for r in zrows:
    if r["image"] == "all":
        continue  # anchor applies per real image; totals carry pooled bits
    v2b = float(r["v2_bytes"])
    a = 100.0 * (float(r["bits_plain"]) / 8.0 - v2b) / v2b
    if abs(a) > 0.5:
        print(f"ZR-anchor FAIL ({r['image']}: plain replica {a:+.4f}% > 0.5%)")
        ok = False
if zrows:
    # ZR-fmt is a DECISION verdict, not a rail-integrity gate: a rejection is
    # a legitimate measured outcome and must not flip the exit code.
    tot = next((r for r in zrows if r["image"] == "all"), None)
    imgs = [r for r in zrows if r["image"] != "all"]
    anchor_ok = not any(
        abs(100.0 * (float(r["bits_plain"]) / 8.0 - float(r["v2_bytes"])) /
            float(r["v2_bytes"])) > 0.5 for r in imgs)
    if tot is not None and imgs and anchor_ok:
        ap = float(tot["adapt_pct"])
        mixed = any(float(r["adapt_pct"]) > 0.0 for r in imgs)
        verdict = (f"ZR-fmt: aggregate adapt {ap:+.4f}% "
                   f"(folded {tot['folded_pct']}% of samples, "
                   f"{tot['nsym']} run symbols)")
        if ap <= -1.0 and not mixed:
            print(verdict + " -> ZR-fmt PASS (format work eligible)")
        else:
            worse = sum(1 for r in imgs if float(r["adapt_pct"]) > 0.0)
            why = []
            if ap > -1.0: why.append("aggregate above the -1.0 pct bar")
            if mixed:
                why.append(f"{worse}/{len(imgs)} probe images above baseline "
                           "(no adoption from a losing subset)")
            print(verdict + " -> ZR-fmt FAIL (" + "; ".join(why) + ")")

sys.exit(0 if ok else 1)
PY
}

make_ramp() {
  # make_ramp FILE dx dy : tiny P6 with sample(x,y) = clamp(x*dx + y*dy)
  python3 - "$1" "$2" "$3" <<'PY'
import sys
f, dx, dy = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
w = h = 96
px = bytearray()
for y in range(h):
    for x in range(w):
        px += bytes([max(0, min(255, x * dx + y * dy)) % 256] * 3)
open(f, "wb").write(b"P6\n%d %d\n255\n" % (w, h) + bytes(px))
PY
}

if [[ "$SELF_CHECK" == "1" ]]; then
  # Prove the rail ranks configurations correctly in BOTH directions (a
  # harness that cannot fail is worse than no harness) and that the evaluator
  # rejects ordering violations.
  TMP="$(mktemp -d)"
  trap 'rm -rf "$TMP"' EXIT
  BIN="${BUILD_DIR:-${ROOT}/../build}/prism"
  if [[ ! -x "$BIN" ]]; then echo "prism binary not found at $BIN"; exit 1; fi
  # cols-const (gradient along y only): LEFT sees identical samples in a row
  # and predicts exactly; TOP sees the full step every row. rows-const: the
  # reverse. The rail must rank BOTH directions correctly or it cannot be
  # trusted to rank anything.
  make_ramp "$TMP/cols_const.ppm" 0 2
  make_ramp "$TMP/rows_const.ppm" 2 0
  "$BIN" bench-ideal "$TMP/cols_const.ppm" --predictor left,top > "$TMP/h.txt"
  "$BIN" bench-ideal "$TMP/rows_const.ppm" --predictor left,top > "$TMP/v.txt"
  bh_l=$(grep '^IDEAL,' "$TMP/h.txt" | grep ',left,' | cut -d, -f8)
  bh_t=$(grep '^IDEAL,' "$TMP/h.txt" | grep ',top,'  | cut -d, -f8)
  bv_l=$(grep '^IDEAL,' "$TMP/v.txt" | grep ',left,' | cut -d, -f8)
  bv_t=$(grep '^IDEAL,' "$TMP/v.txt" | grep ',top,'  | cut -d, -f8)
  ok=1
  python3 -c "import sys; sys.exit(0 if $bh_l * 2 < $bh_t else 1)" || { echo "SELF-CHECK FAIL: cols-const ramp must favor left over top by 2x"; ok=0; }
  python3 -c "import sys; sys.exit(0 if $bv_t * 2 < $bv_l else 1)" || { echo "SELF-CHECK FAIL: rows-const ramp must favor top over left by 2x"; ok=0; }
  # Evaluator ordering gate must reject a fabricated violation...
  printf 'image,predictor,v0_bytes,v2_bytes,coarse_shared,coarse_class16,coarse_ctx343,fine_shared,fine_class16,fine_ctx343,val_shared,val_class16,val_ctx343\n' > "$TMP/bad.csv"
  printf 'all,med,1000000,950000,5000000,4900000,4800000,4900000,4800000,4700000,4000000,3950000,3955000\n' >> "$TMP/bad.csv"
  if evaluate "$TMP/bad.csv" > "$TMP/bad.out" 2>&1; then
    echo "SELF-CHECK FAIL: evaluator accepted an ML-ordering violation"; ok=0
  fi
  grep -q "G-order FAIL" "$TMP/bad.out" || { echo "SELF-CHECK FAIL: no G-order verdict"; ok=0; }
  # ...and accept a consistent known-good row.
  printf 'image,predictor,v0_bytes,v2_bytes,coarse_shared,coarse_class16,coarse_ctx343,fine_shared,fine_class16,fine_ctx343,val_shared,val_class16,val_ctx343\n' > "$TMP/good.csv"
  printf 'all,med,1000000,950000,9000000,8600000,8500000,8800000,8400000,8300000,8700000,8300000,8250000\n' >> "$TMP/good.csv"
  if ! evaluate "$TMP/good.csv" > "$TMP/good.out" 2>&1; then
    echo "SELF-CHECK FAIL: evaluator rejected consistent numbers"; cat "$TMP/good.out"; ok=0
  fi
  [[ "$ok" == "1" ]] && echo "SELF-CHECK PASS: ranking works both ways, gates pass and fail"
  [[ "$ok" == "1" ]] || exit 1
  # D2 self-check: the sequential mixer scorer must rank adapted ABOVE
  # frozen-neutral and ABOVE adversarial on both ramps (a scorer that cannot
  # lose is worse than no scorer). Anchor gating is intentionally NOT applied
  # on ramps: 96x96 inputs carry too few bins for byte-level comparison;
  # the G-anchor gate covers every real-corpus row in evaluate().
  "$BIN" bench-ideal "$TMP/cols_const.ppm" --mixer mix4,mix4-frozen,mix4-adversarial > "$TMP/mh.txt"
  "$BIN" bench-ideal "$TMP/rows_const.ppm" --mixer mix4,mix4-frozen,mix4-adversarial > "$TMP/mv.txt"
  for f in mh mv; do
    # emit "<preset> <bits_sse> <anchor>" triples, then compare orderings
    awk -F, '/^MIXER,/ {printf "%s %s %s\n", $3, $7, $10}' "$TMP/$f.txt" > "$TMP/$f.rows"
    get() { awk -v p="$2" '$1==p {print $2; exit}' "$TMP/$1.rows"; }
    a=$(get "$f" mix4); fr=$(get "$f" mix4-frozen); ad=$(get "$f" mix4-adversarial)
    if [[ -z "$a" || -z "$fr" || -z "$ad" ]]; then
      echo "SELF-CHECK FAIL ($f): missing mixer rows"; ok=0; continue
    fi
    python3 -c "import sys; sys.exit(0 if $a < $fr else 1)" || { echo "SELF-CHECK FAIL ($f): adapted mix must beat frozen"; ok=0; }
    python3 -c "import sys; sys.exit(0 if $a < $ad else 1)" || { echo "SELF-CHECK FAIL ($f): adapted mix must beat adversarial"; ok=0; }
    # Anchor gating is intentionally NOT applied here (see above).
  done
  [[ "$ok" == "1" ]] && echo "MIXER SELF-CHECK PASS: adapted beats frozen and adversarial on both ramps"
  [[ "$ok" == "1" ]] || exit 1
  # D4 zero-run self-check: the scorer must (a) COLLAPSE a flat ramp's zero
  # events into run symbols (the mechanism works), (b) NOT invent a win on
  # noise (adaptive run overhead >= break-even there), and (c) the evaluator
  # must render BOTH ZR-fmt verdicts from CSV rows alone plus bite on a
  # diverged anchor (a verdict that can only say PASS is worse than none).
  # Cost-sign assertions on tiny synthetic ramps are deliberately avoided:
  # at 96x96 the RunFreq learning cost can legitimately dominate either way.
  "$BIN" bench-ideal "$TMP/cols_const.ppm" --zrun > "$TMP/zf.txt"
  zfold=$(awk -F, '/^ZRUN,/ && $2 != "image" {print $3; exit}' "$TMP/zf.txt")
  [[ -n "$zfold" ]] || { echo "SELF-CHECK FAIL: no zrun row"; exit 1; }
  python3 -c "import sys; sys.exit(0 if $zfold > 90 else 1)" || \
    { echo "SELF-CHECK FAIL: flat ramp must fold most zeros into run symbols (got $zfold%)"; ok=0; }
  python3 -c "
import random
random.seed(11)
w = h = 96
px = bytes(random.randrange(256) for _ in range(w*h*3))
open('$TMP/noise_zr.ppm','wb').write(b'P6\n%d %d\n255\n' % (w,h) + px)
" || { echo "SELF-CHECK FAIL: cannot make noise image"; ok=0; }
  zn=$("$BIN" bench-ideal "$TMP/noise_zr.ppm" --zrun 2>/dev/null | awk -F, '/^ZRUN,/ && $2 != "image" {print $10; exit}')
  [[ -n "$zn" ]] || { echo "SELF-CHECK FAIL: no zrun row for noise"; ok=0; }
  python3 -c "import sys; sys.exit(0 if abs($zn) < 1.0 else 1)" || \
    { echo "SELF-CHECK FAIL: scorer must not invent a win on noise (got $zn%)"; ok=0; }
  zhdr='ZRUN,image,folded_pct,nsym,nbreaker,v0_bytes,v2_bytes,bits_plain,bits_adapt,adapt_pct,base_fine_sh,base_fine_cl,base_fine_cx,zr_fine_sh,zr_fine_cl,zr_fine_cx'
  printf '%s\n' "$zhdr" > "$TMP/zwin.csv"
  printf 'ZRUN,all,60.00,10,5,100000,95000,760000.0,700000.0,-7.8947,700000.0,690000.0,680000.0,650000.0,640000.0,630000.0\n' >> "$TMP/zwin.csv"
  printf 'ZRUN,kodimX.ppm,60.00,10,5,100000,95000,760000.0,70000.0,-8.1234,700000.0,690000.0,680000.0,650000.0,640000.0,630000.0\n' >> "$TMP/zwin.csv"
  printf '%s\n' "$zhdr" > "$TMP/zlose.csv"
  printf 'ZRUN,all,1.00,900,800,100000,95000,760000.0,770000.0,+1.3158,700000.0,690000.0,680000.0,750000.0,740000.0,730000.0\n' >> "$TMP/zlose.csv"
  printf 'ZRUN,kodimX.ppm,1.00,900,800,100000,95000,760000.0,77000.0,+1.0753,700000.0,690000.0,680000.0,750000.0,740000.0,730000.0\n' >> "$TMP/zlose.csv"
  printf '%s\n' "$zhdr" > "$TMP/zbad.csv"
  printf 'ZRUN,kodimX.ppm,60.00,10,5,100000,95000,99999999.0,70000.0,-8.1234,700000.0,690000.0,680000.0,650000.0,640000.0,630000.0\n' >> "$TMP/zbad.csv"
  evaluate "$TMP/good.csv" "" "$TMP/zwin.csv" > "$TMP/zwin.out" 2>&1 || true
  evaluate "$TMP/good.csv" "" "$TMP/zlose.csv" > "$TMP/zlose.out" 2>&1 || true
  evaluate "$TMP/good.csv" "" "$TMP/zbad.csv" > "$TMP/zbad.out" 2>&1 || true
  grep -q "ZR-fmt PASS" "$TMP/zwin.out" || { echo "SELF-CHECK FAIL: evaluator must grant ZR-fmt on a winning projection"; cat "$TMP/zwin.out"; ok=0; }
  grep -q "ZR-fmt FAIL" "$TMP/zlose.out" || { echo "SELF-CHECK FAIL: evaluator must refuse ZR-fmt on a losing projection"; cat "$TMP/zlose.out"; ok=0; }
  grep -q "ZR-anchor FAIL" "$TMP/zbad.out" || { echo "SELF-CHECK FAIL: ZR-anchor must reject a diverged replica"; cat "$TMP/zbad.out"; ok=0; }
  [[ "$ok" == "1" ]] && echo "ZRUN SELF-CHECK PASS: events collapse on runs, no invented win on noise, both ZR-fmt verdicts reachable, anchor gate bites"
  [[ "$ok" == "1" ]] || exit 1
  exit 0
fi

if [[ ${#IMAGES[@]} -eq 0 ]]; then
  echo "no --image given"; exit 2
fi

BIN="${BUILD_DIR:-${ROOT}/../build}/prism"
if [[ ! -x "$BIN" ]]; then
  echo "prism binary not found at $BIN (pass --build-dir or build first)"; exit 1
fi

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
OUT_CSV="${ROOT}/benchmarks/results/${STAMP}-ideal-probe.csv"
MIX_CSV="${ROOT}/benchmarks/results/${STAMP}-ideal-mixer-d2.csv"
ZRUN_CSV="${ROOT}/benchmarks/results/${STAMP}-ideal-zrun-d4.csv"
RAW_CSV="$(mktemp)"
MIX_RAW="$(mktemp)"
ZR_RAW="$(mktemp)"
ALL_RAW="$(mktemp)"
ARGS=()
[[ -n "$PREDICTORS" ]] && ARGS+=(--predictor "$PREDICTORS")
[[ -n "$BLENDS" ]] && ARGS+=(--blend "$BLENDS")
[[ -n "$MIXERS" ]] && ARGS+=(--mixer "$MIXERS")
[[ "$ZRUN" == "1" ]] && ARGS+=(--zrun)
"$BIN" bench-ideal "${IMAGES[@]}" "${ARGS[@]}" > "$ALL_RAW"
grep -E '^IDEAL(,|TOTAL)' "$ALL_RAW" > "$RAW_CSV"
if [[ -n "$MIXERS" ]]; then
  grep -E '^MIXER' "$ALL_RAW" > "$MIX_RAW"
  cp "$MIX_RAW" "$MIX_CSV"
fi
if [[ "$ZRUN" == "1" ]]; then
  grep -E '^ZRUN' "$ALL_RAW" > "$ZR_RAW"
  cp "$ZR_RAW" "$ZRUN_CSV"
fi
# In zrun mode the dated ideal-probe CSV is the COMMITTED G-repro reference;
# never clobber it. Evaluate from a side file in the same directory so the
# reference path resolution still finds the committed row.
EVAL_CSV="$OUT_CSV"
if [[ "$ZRUN" == "1" ]]; then
  EVAL_CSV="${ROOT}/benchmarks/results/${STAMP}-ideal-probe-zrun-eval.csv"
  grep -E '^IDEAL(,|TOTAL)' "$ALL_RAW" > "$EVAL_CSV"
else
  cp "$RAW_CSV" "$OUT_CSV"
fi
echo "== ideal-bracket results (${OUT_CSV}) =="
cat "$RAW_CSV"
if [[ -n "$MIXERS" ]]; then
  echo "== D2 mixer results (${MIX_CSV}) =="
  cat "$MIX_CSV"
fi
if [[ "$ZRUN" == "1" ]]; then
  echo "== D4 zero-run projection (${ZRUN_CSV}) =="
  cat "$ZRUN_CSV"
fi

if ! evaluate "$EVAL_CSV" "$MIX_CSV" "$ZR_RAW"; then
  echo "IDEAL GATE FAIL"
  exit 1
fi
echo "IDEAL GATE PASS (ordering + reproducibility)"
