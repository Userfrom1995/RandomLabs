#!/usr/bin/env bash
set -euo pipefail
# V0 sandbox rail for the V-series (issue #130; blueprint
# prism/docs/architecture-jxl-parity-vseries.md section 1 + spec addendum 17
# = algorithmic-spec.md section 18, pre-registered BEFORE any measurement).
#
# Wraps `prism bench-sandbox`: scores the production residual streams
# (YCoCg-R + MED) under tokenization profiles {ZFFCTRL, HYB-A/B/C} x
# keyings {KSHARED, KFLAT16, KFLAT343} x backends {B-IDEAL, B-RANS, B-BAC},
# plus the fresh B-ADAPT production control and the frozen-walk BRACKET
# rows. FORMAT-UNWIRED: every byte this rail accounts for lives in the CSV,
# none in any container (zero container bytes until a V4 PASS).
#
# VB rails (addendum 18.1/18.2; a gate REJECTION of a measured candidate is
# a legitimate outcome and never flips the exit code, but every VB-* rail
# here is RAIL INTEGRITY and DOES flip it):
#   VB-anchor-adapt   SANDBOX ZFFCTRL/B-ADAPT/KPROD payload equals the
#                     committed reference v2 bytes BIT-FOR-BIT per image
#                     and decodes round-trip clean (anchor tolerance
#                     policy: bit-for-bit, no rounding slack).
#   VB-anchor-ideal   BRACKET fine_{shared,class16,ctx343} equals the
#                     committed reference bit-for-bit, AND the sandbox's own
#                     ZFFCTRL/B-IDEAL ml_bits reproduce the same three
#                     reference columns bit-for-bit (the counting path is
#                     anchored, not just the frozen walk).
#   VB-coder-fidelity B-RANS and B-BAC payloads stay within +0.50 percent
#                     of their own B-IDEAL row per image (D10: engine
#                     overhead isolated; the ideal bracket carries RAWBITS
#                     literal cost per amendment A2).
#   VB-net-audit      side-info counted twice (serializer audit counter vs
#                     emitted blob length) agrees exactly on every row,
#                     NET = payload+tables+maps+trees holds on every row,
#                     and every real-backend row decodes round-trip clean.
#   VB-corrupt        every injected corruption (flipped table delta /
#                     truncated blob / tampered content) either hard-detects
#                     or inflates cost > +10 percent WITH a round-trip
#                     mismatch flag; a silent pass fails the rail. Map-id
#                     and tree-blob injections activate with those artifacts
#                     at V3 (pin D8 pre-registration).
#   VB-rank           constructed fixtures rank clustering correctly BOTH
#                     ways: on a two-half opposite-skew image clustered-
#                     static (KFLAT16) must beat pooled (KSHARED) on NET;
#                     on a homogeneous image pooled must win or tie. A rail
#                     that can only say PASS proves nothing (E0 lesson).
#   VB-determinism    the full run executed twice emits byte-identical
#                     output (integer-only scoring paths).
#
# Reference (D12): benchmarks/results/2026-08-25-ideal-probe-e0-eval.csv
# per-image med rows. Measuring any image absent from that reference is a
# hard error - anchors must cover everything measured.
#
# Corpus discipline: inputs verified against data/kodak.sha256 BEFORE any
# measurement. Output: dated benchmarks/results/YYYY-MM-DD-sandbox-v0.csv
# (one file per phase so earlier references stay stable).
#
# Usage:
#   probe_sandbox.sh --image /path/kodim01.ppm [--image ...] [--build-dir DIR]
#   probe_sandbox.sh --self-check [--build-dir DIR]

IMAGES=()
BUILD_DIR=""
SELF_CHECK=0
SELF_CHECK_V1=0
MODE_V1=0
SELF_CHECK_S1=0
MODE_S1=0
SELF_CHECK_S3=0
MODE_S3=0
SELF_CHECK_S4=0
MODE_S4=0
SELF_CHECK_T0=0
MODE_T0=0
SELF_CHECK_T1=0
MODE_T1A=0
MODE_T1B=0
SELF_CHECK_T2A=0
MODE_T2A=0
SELF_CHECK_T3=0
MODE_T3=0
SELF_CHECK_T4=0
MODE_T4=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --image) IMAGES+=("$2"); shift 2;;
    --build-dir) BUILD_DIR="$2"; shift 2;;
    --self-check) SELF_CHECK=1; shift;;
    --self-check-v1) SELF_CHECK_V1=1; shift;;
    --v1) MODE_V1=1; shift;;
    --self-check-s1) SELF_CHECK_S1=1; shift;;
    --s1) MODE_S1=1; shift;;
    --self-check-s3) SELF_CHECK_S3=1; shift;;
    --s3) MODE_S3=1; shift;;
    --self-check-s4) SELF_CHECK_S4=1; shift;;
    --s4) MODE_S4=1; shift;;
    --self-check-t0) SELF_CHECK_T0=1; shift;;
    --t0) MODE_T0=1; shift;;
    --self-check-t1) SELF_CHECK_T1=1; shift;;
    --t1a) MODE_T1A=1; shift;;
    --t1b) MODE_T1B=1; shift;;
    --self-check-t2a) SELF_CHECK_T2A=1; shift;;
    --t2a) MODE_T2A=1; shift;;
    --self-check-t3) SELF_CHECK_T3=1; shift;;
    --t3) MODE_T3=1; shift;;
    --self-check-t4) SELF_CHECK_T4=1; shift;;
    --t4) MODE_T4=1; shift;;
    *) echo "unknown arg $1"; exit 2;;
  esac
done

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# evaluate SANDBOX_CSV REF_CSV RANK_SKEW_CSV RANK_HOMO_CSV [E1_CSV]
# Exits nonzero when any VB rail-integrity check fails.
evaluate() {
  python3 - "$1" "$2" "$3" "$4" "${5:-}" "${6:-}" <<'PY'
import sys

FID_NUM, FID_DEN = 1005, 1000     # +0.50 percent coder-fidelity bound
CORRUPT_MIN_PCT = 10.0            # undetected corruption must explode

def fail(msg):
    print(f"VB FAIL ({msg})")
    global ok
    ok = False

def median(xs):
    s = sorted(xs)
    return s[len(s) // 2] if len(s) % 2 else \
        (s[len(s) // 2 - 1] + s[len(s) // 2]) / 2.0

def _comp(p, t, m_, tr, a):
    return (p, t, m_, tr, a)


def _read_t1a_pg(path):
    # PG (pin P-Q1-6): max over CEIL@* arms of the quad-median
    # payload_pct_gain from the same-run t1a CSV.
    try:
        arms = {}
        for line in open(path):
            f = line.rstrip("\n").split(",")
            if f[0] == "TSUM" and f[2].startswith("CEIL@"):
                arms.setdefault(f[2], []).append(float(f[15]))
        if not arms:
            return None
        return max(median(v) for v in arms.values())
    except OSError:
        return None

ok = True

# ----- parse the sandbox run -----
sand, bracket, corrupt, v1rows, s1rows, s3rows, s4rows = [], [], [], [], \
    [], [], []
t0rows, tproto, tamirror, tzzhu = [], [], [], []
t1rows, tsumrows = [], []
t2rows, t2sumrows = [], []
t3rows, t3brows, t3bsrows, t3cellrows = [], [], [], []
for line in open(sys.argv[1]):
    f = line.rstrip("\n").split(",")
    if f[0] == "SANDBOX":
        sand.append({"img": f[1], "prof": f[2], "be": f[3], "key": f[4],
                     "payload": int(f[5]), "tables": int(f[6]),
                     "maps": int(f[7]), "trees": int(f[8]),
                     "net": int(f[9]), "audit": f[10], "rt": f[11],
                     "tbl": f[12], "ml": f[13]})
    elif f[0] == "BRACKET":
        bracket.append({"img": f[1], "v0": f[2], "v2": f[3],
                        "fs": f[4], "f16": f[5], "fcx": f[6]})
    elif f[0] == "CORRUPT":
        corrupt.append({"img": f[1], "inj": f[2], "det": f[3] == "1",
                        "mis": f[4] == "1", "pct": float(f[5])})
    elif f[0] == "V1":
        v1rows.append({"img": f[1], "prof": f[2], "be": f[3], "key": f[4],
                       "variant": f[5], "payload": int(f[6]),
                       "tables": int(f[7]), "maps": int(f[8]),
                       "trees": int(f[9]), "net": int(f[10]),
                       "audit": f[11], "rt": f[12], "map_rep": int(f[17]),
                       "tree_art": int(f[18])})
    elif f[0] == "S1":
        s1rows.append({"img": f[1], "frame": f[2], "fam": f[3], "be": f[4],
                       "payload": int(f[5]), "tables": int(f[6]),
                       "maps": int(f[7]), "trees": int(f[8]),
                       "net": int(f[9]), "audit": f[10], "rt": f[11]})
    elif f[0] == "S3":
        s3rows.append({"img": f[1], "frame": f[2], "variant": f[3],
                       "kraw": int(f[4]), "be": f[5],
                       "payload": int(f[6]), "tables": int(f[7]),
                       "maps": int(f[8]), "trees": int(f[9]),
                       "net": int(f[10]), "audit": f[11], "rt": f[12]})
    elif f[0] == "S4":
        s4rows.append({"img": f[1], "cand": f[2], "trial": f[3],
                       "be": f[4], "payload": int(f[5]),
                       "tables": int(f[6]), "maps": int(f[7]),
                       "trees": int(f[8]), "net": int(f[9]),
                       "audit": f[10], "rt": f[11]})
    elif f[0] == "T0" and len(f) >= 16:
        t0rows.append({"img": f[1], "cand": f[2], "gs": f[3], "be": f[4],
                       "payload": int(f[5]), "tables": int(f[6]),
                       "maps": int(f[7]), "trees": int(f[8]),
                       "assign": int(f[9]), "net": int(f[10]),
                       "audit": f[11], "rt": f[12], "keff": int(f[14])})
    elif f[0] == "TPROTO":
        tproto.append({"img": f[1], "kind": f[2], "mirror": f[3] == "1",
                       "trunc": f[4] == "1", "crc": f[5] == "1",
                       "tamper": f[6] == "1", "audit": f[7] == "1"})
    elif f[0] == "TAMIRROR":
        tamirror.append({"img": f[1], "fixture": f[2],
                         "nwords": int(f[3]), "rt": f[4] == "1"})
    elif f[0] == "TZZHU":
        tzzhu.append({"img": f[1], "label": f[2], "prof": int(f[3])})
    elif f[0] == "T1" and len(f) >= 17:
        t1rows.append({"img": f[1], "cand": f[2], "trial": f[3],
                       "gs": f[4], "be": f[5], "payload": int(f[6]),
                       "tables": int(f[7]), "maps": int(f[8]),
                       "trees": int(f[9]), "assign": int(f[10]),
                       "net": int(f[11]), "audit": f[12], "rt": f[13],
                       "keff": int(f[15])})
    elif f[0] == "TSUM" and len(f) >= 18:
        tsumrows.append({"img": f[1], "arm": f[2], "bp": int(f[3]),
                         "bt": int(f[4]), "bm": int(f[5]),
                         "btr": int(f[6]), "ba": int(f[7]),
                         "bnet": int(f[8]), "p": int(f[9]),
                         "t": int(f[10]), "m": int(f[11]),
                         "tr": int(f[12]), "a": int(f[13]),
                         "net": int(f[14]), "paygain": float(f[15]),
                         "relpct": float(f[16]), "sole": f[17] == "1"})
    elif f[0] == "T2" and len(f) >= 14:
        t2rows.append({"img": f[1], "cand": f[2], "trial": f[3],
                       "be": f[4], "payload": int(f[5]),
                       "tables": int(f[6]), "maps": int(f[7]),
                       "trees": int(f[8]), "assign": int(f[9]),
                       "net": int(f[10]), "audit": f[11], "rt": f[12]})
    elif f[0] == "T2SUM" and len(f) >= 16:
        t2sumrows.append({"img": f[1], "arm": f[2], "bp": int(f[3]),
                          "bt": int(f[4]), "bm": int(f[5]),
                          "btr": int(f[6]), "ba": int(f[7]),
                          "bnet": int(f[8]), "p": int(f[9]),
                          "t": int(f[10]), "m": int(f[11]),
                          "tr": int(f[12]), "a": int(f[13]),
                          "net": int(f[14]), "relpct": float(f[15])})
    elif f[0] == "T3" and len(f) >= 15:
        t3rows.append({"img": f[1], "fam": f[2], "tok": f[3],
                       "cs": f[4], "be": f[5], "payload": int(f[6]),
                       "tables": int(f[7]), "maps": int(f[8]),
                       "trees": int(f[9]), "assign": int(f[10]),
                       "net": int(f[11]), "audit": f[12], "rt": f[13]})
    elif f[0] == "T3B" and len(f) >= 15:
        t3brows.append({"img": f[1], "arm": f[2], "trial": f[3],
                        "be": f[4], "payload": int(f[5]),
                        "tables": int(f[6]), "maps": int(f[7]),
                        "trees": int(f[8]), "bias": int(f[9]),
                        "assign": int(f[10]), "net": int(f[11]),
                        "audit": f[12], "rt": f[13]})
    elif f[0] == "T3BS" and len(f) >= 11:
        t3bsrows.append({"img": f[1], "arm": f[2],
                         "bp": int(f[3]), "bt": int(f[4]),
                         "bm": int(f[5]), "btr": int(f[6]),
                         "ba": int(f[7]), "bnet": int(f[8]),
                         "cnet": int(f[9]), "relpct": float(f[10])})
    elif f[0] == "T3CELL" and len(f) >= 8:
        t3cellrows.append({"img": f[1], "fam": f[2], "tok": f[3],
                           "trial": int(f[4]), "payload": int(f[5]),
                           "tables": int(f[6]), "net": int(f[7])})
imgs = sorted({r["img"] for r in sand} | {r["img"] for r in bracket})
if not imgs:
    fail("no sandbox rows"); sys.exit(1)

# ----- parse the committed reference -----
ref = {}
for line in open(sys.argv[2]):
    f = line.rstrip("\n").split(",")
    if f[0] == "IDEAL" and f[2] == "med":
        ref[f[1]] = {"v0": f[3], "v2": f[4], "fs": f[8], "f16": f[9],
                     "fcx": f[10]}
uncovered = [i for i in imgs if i not in ref]
if uncovered:
    fail("images not covered by the committed anchor reference: "
         + ",".join(uncovered))

def sand_row(img, prof, be, key):
    for r in sand:
        if (r["img"], r["prof"], r["be"], r["key"]) == (img, prof, be, key):
            return r
    return None

# ----- VB-anchor-adapt -----
n_adapt = 0
for img in imgs:
    if img not in ref:
        continue
    r = sand_row(img, "ZFFCTRL", "B-ADAPT", "KPROD")
    if r is None:
        fail(f"anchor-adapt {img}: no B-ADAPT control row"); continue
    n_adapt += 1
    if r["payload"] != int(ref[img]["v2"]):
        fail(f"anchor-adapt {img}: B-ADAPT payload {r['payload']} != "
             f"committed v2 {ref[img]['v2']}")
    if r["rt"] != "1":
        fail(f"anchor-adapt {img}: control replay failed to round-trip")
if n_adapt:
    print(f"VB-anchor-adapt OK ({n_adapt} images bit-for-bit vs committed v2)")

# ----- VB-anchor-ideal -----
n_ideal = 0
by_img = {b["img"]: b for b in bracket}
for img in imgs:
    if img not in ref:
        continue
    b = by_img.get(img)
    if b is None:
        fail(f"anchor-ideal {img}: no BRACKET row"); continue
    n_ideal += 1
    pairs = [("v0", b["v0"], ref[img]["v0"]),
             ("v2", b["v2"], ref[img]["v2"]),
             ("fine_shared", b["fs"], ref[img]["fs"]),
             ("fine_class16", b["f16"], ref[img]["f16"]),
             ("fine_ctx343", b["fcx"], ref[img]["fcx"])]
    for name, got, want in pairs:
        if got != want:
            fail(f"anchor-ideal {img}: BRACKET {name} {got} != "
                 f"reference {want}")
    for key, col in (("KSHARED", "fs"), ("KFLAT16", "f16"),
                     ("KFLAT343", "fcx")):
        r = sand_row(img, "ZFFCTRL", "B-IDEAL", key)
        if r is None:
            fail(f"anchor-ideal {img}: no ZFFCTRL/B-IDEAL/{key} row")
            continue
        if r["ml"] != ref[img][col]:
            fail(f"anchor-ideal {img}: ml_bits[{key}] {r['ml']} != "
                 f"reference {col} {ref[img][col]}")
if n_ideal:
    print(f"VB-anchor-ideal OK ({n_ideal} images: frozen walk + sandbox "
          f"counting reproduce the committed brackets bit-for-bit)")

# ----- VB-coder-fidelity -----
cfgs = {}
for r in sand:
    if r["be"] == "B-ADAPT":
        continue
    cfgs.setdefault((r["img"], r["prof"], r["key"]), {})[r["be"]] = r
n_fid = 0
for (img, prof, key), bes in sorted(cfgs.items()):
    ideal = bes.get("B-IDEAL")
    if ideal is None:
        fail(f"fidelity {img}/{prof}/{key}: no B-IDEAL row to bound against")
        continue
    limit = (FID_NUM * ideal["payload"]) // FID_DEN + 1
    for be in ("B-RANS", "B-BAC"):
        r = bes.get(be)
        if r is None:
            continue
        n_fid += 1
        if r["payload"] > limit:
            pct = 100.0 * (r["payload"] - ideal["payload"]) / \
                max(1, ideal["payload"])
            fail(f"fidelity {img}/{prof}/{key}/{be}: payload "
                 f"{r['payload']} exceeds {limit} (+{pct:.3f} pct > bound)")
if n_fid:
    print(f"VB-coder-fidelity OK ({n_fid} real-backend rows within "
          f"+{100.0 * (FID_NUM - FID_DEN) / FID_DEN:.2f} pct of their own "
          f"B-IDEAL rows)")

# ----- VB-net-audit (double-count + NET identity + round-trip) -----
bad_audit = bad_net = bad_rt = 0
for r in sand:
    if r["audit"] != "1":
        bad_audit += 1
    if r["net"] != r["payload"] + r["tables"] + r["maps"] + r["trees"]:
        bad_net += 1
    if r["be"] in ("B-RANS", "B-BAC") and r["rt"] != "1":
        bad_rt += 1
if bad_audit or bad_net or bad_rt:
    fail(f"net-audit: {bad_audit} audit disagreements, {bad_net} NET "
         f"identity violations, {bad_rt} round-trip failures")
else:
    print(f"VB-net-audit OK ({len(sand)} rows: serializer audit == blob "
          f"length, NET identity holds, all coded rows decode)")

# ----- VB-corrupt -----
n_cor = 0
for c in corrupt:
    n_cor += 1
    if not (c["det"] or (c["pct"] > CORRUPT_MIN_PCT and c["mis"])):
        fail(f"corrupt {c['img']}/{c['inj']}: passed silently "
             f"(detected={c['det']}, cost {c['pct']:+.2f} pct, "
             f"mismatch={c['mis']})")
if n_cor:
    print(f"VB-corrupt OK ({n_cor} injections: every one hard-detects or "
          f"explodes + mismatches; none pass silently)")

# ----- VB-rank -----
def net_of(path, prof, be, key):
    for line in open(path):
        f = line.rstrip("\n").split(",")
        if f[0] == "SANDBOX" and len(f) > 9 and f[2] == prof and \
           f[3] == be and f[4] == key:
            return int(f[9])
    return None

skew_c = net_of(sys.argv[3], "ZFFCTRL", "B-IDEAL", "KFLAT16") \
    if sys.argv[3] else None
skew_p = net_of(sys.argv[3], "ZFFCTRL", "B-IDEAL", "KSHARED") \
    if sys.argv[3] else None
homo_c = net_of(sys.argv[4], "ZFFCTRL", "B-IDEAL", "KFLAT16") \
    if sys.argv[4] else None
homo_p = net_of(sys.argv[4], "ZFFCTRL", "B-IDEAL", "KSHARED") \
    if sys.argv[4] else None
if sys.argv[3] == "" or sys.argv[4] == "":
    print("VB-rank SKIP (fixture CSVs not supplied)")
elif None in (skew_c, skew_p, homo_c, homo_p):
    fail("rank: fixture rows missing")
else:
    if not skew_c < skew_p:
        fail(f"rank skew fixture: clustered ({skew_c}) must BEAT pooled "
             f"({skew_p}) on NET")
    if not homo_p <= homo_c:
        fail(f"rank homo fixture: pooled ({homo_p}) must win or tie "
             f"clustered ({homo_c})")
    if ok:
        print(f"VB-rank OK (skew: clustered {skew_c} < pooled {skew_p}; "
              f"homo: pooled {homo_p} <= clustered {homo_c})")

# ----- V1 rows: rail integrity (flips exit code) + gates (never do) -----
if v1rows:
    # Fidelity per (img, prof, key, variant): real backends within +0.50
    # percent of their own B-IDEAL row.
    cfgs = {}
    for r in v1rows:
        cfgs.setdefault((r["img"], r["prof"], r["key"], r["variant"]),
                        {})[r["be"]] = r
    n_fid = 0
    for k, bes in sorted(cfgs.items()):
        ideal = bes.get("B-IDEAL")
        if ideal is None:
            fail(f"fidelity {k}: no B-IDEAL row to bound against")
            continue
        limit = (FID_NUM * ideal["payload"]) // FID_DEN + 1
        for be in ("B-RANS", "B-BAC"):
            r = bes.get(be)
            if r is None:
                continue
            n_fid += 1
            if r["payload"] > limit:
                pct = 100.0 * (r["payload"] - ideal["payload"]) / \
                    max(1, ideal["payload"])
                fail(f"fidelity {k}/{be}: payload {r['payload']} exceeds "
                     f"{limit} (+{pct:.3f} pct > bound)")
    if n_fid:
        print(f"VB-coder-fidelity OK ({n_fid} V1 real-backend rows within "
              f"+0.50 pct of their own B-IDEAL rows)")

    bad_audit = bad_net = bad_rt = 0
    for r in v1rows:
        if r["audit"] != "1":
            bad_audit += 1
        if r["net"] != r["payload"] + r["tables"] + r["maps"] + r["trees"]:
            bad_net += 1
        if r["variant"] == "ORACLE" and (r["maps"] != 0 or r["trees"] != 0):
            bad_net += 1     # the freebie must never ride inside NET (V-P5)
        if r["be"] in ("B-RANS", "B-BAC") and r["rt"] != "1":
            bad_rt += 1
    if bad_audit or bad_net or bad_rt:
        fail(f"net-audit(V1): {bad_audit} audit disagreements, "
             f"{bad_net} NET identity/oracle-schema violations, "
             f"{bad_rt} round-trip failures")
    else:
        print(f"VB-net-audit OK ({len(v1rows)} V1 rows: audits agree, NET "
              f"identity holds incl. oracle freebie exclusion, all coded "
              f"rows decode)")

    # ----- gates (pin V-P7; verdict lines only) -----
    ctrl = {}
    for r in sand:
        if r["be"] == "B-ADAPT":
            ctrl[r["img"]] = r["payload"]
    def median(xs):
        s = sorted(xs)
        n = len(s)
        return s[n // 2] if n % 2 else (s[n // 2 - 1] + s[n // 2]) / 2.0
    # Per (variant, prof, key, image): best NET across the backends present
    # (every real backend is already bounded to its own B-IDEAL row by the
    # fidelity rail, so the max is the configuration's honest offering).
    best_net = {}
    for r in v1rows:
        k = (r["variant"], r["prof"], r["key"], r["img"])
        if k not in best_net or r["net"] < best_net[k]:
            best_net[k] = r["net"]
    margins = {}   # (variant, prof, key) -> list of per-image relpct
    for (variant, prof, key, img), net in sorted(best_net.items()):
        if img not in ctrl or ctrl[img] == 0:
            continue
        rel = 100.0 * (ctrl[img] - net) / ctrl[img]
        margins.setdefault((variant, prof, key), []).append((rel, img))
    summary = {}
    for kk, vals in sorted(margins.items()):
        rels = [v for v, _ in vals]
        summary[kk] = {"median": median(rels), "min": min(rels),
                       "max": max(rels), "n": len(vals)}
    print("== V1 GATE READOUT (per-image medians primary per I10; "
          "addendum 18.1; pin V-P7) ==")
    for kk in sorted(summary):
        s = summary[kk]
        print(f"GATE {kk[0]:6s} {kk[1]:8s} {kk[2]:9s} n={s['n']} "
              f"median={s['median']:+.4f} pct min={s['min']:+.4f} "
              f"max={s['max']:+.4f}")
    oracle_meds = [v["median"] for k, v in summary.items()
                   if k[0] == "ORACLE" and v["n"] > 0]
    real_meds = [v["median"] for k, v in summary.items()
                 if k[0] == "REAL" and v["n"] > 0]
    if not oracle_meds or not real_meds:
        print("V1 GATE INCOMPLETE (no rows for one variant)")
    else:
        m_a = max(oracle_meds)
        m_b = max(real_meds)
        best_a = max(((k, v) for k, v in summary.items() if k[0] == "ORACLE"),
                     key=lambda kv: kv[1]["median"])
        best_b = max(((k, v) for k, v in summary.items() if k[0] == "REAL"),
                     key=lambda kv: kv[1]["median"])
        v1a = m_a >= 2.0
        v1b = m_b >= m_a / 2.0
        print(f"V1a ORACLE-MAP: best median {m_a:+.4f} pct "
              f"({best_a[0][1]} x {best_a[0][2]}) vs bar >= +2.0000 pct "
              f"-> {'PASS' if v1a else 'FAIL'}")
        print(f"V1b REALISTIC:  best median {m_b:+.4f} pct "
              f"({best_b[0][1]} x {best_b[0][2]}) vs retention bar >= half "
              f"of V1a ({m_a / 2.0:+.4f}) -> {'PASS' if v1b else 'FAIL'}")
        if v1a and v1b:
            print("V1 VERDICT: PASS - bucket B1 harvestable; proceed to V2 "
                  "(winning configuration recorded in the reserved slot)")
        else:
            print("V1 VERDICT: FAIL - STOP rule fires: bucket B1 declared "
                  "unreachable with this CSV as evidence; owner informed "
                  "before any pivot blueprint (decision tree row 1)")

# ----- S1 rows: rail integrity (flips exit code) + gate (never does) -----
if s1rows:
    # Fidelity per (img, family): FRAME-S B-RANS within +0.50 percent of its
    # own B-IDEAL row.
    cfgs = {}
    for r in s1rows:
        if r["frame"] != "S":
            continue
        cfgs.setdefault((r["img"], r["fam"]), {})[r["be"]] = r
    n_fid = 0
    for k, bes in sorted(cfgs.items()):
        ideal = bes.get("B-IDEAL")
        if ideal is None:
            fail(f"S1 fidelity {k}: no B-IDEAL row to bound against")
            continue
        limit = (FID_NUM * ideal["payload"]) // FID_DEN + 1
        r = bes.get("B-RANS")
        if r is None:
            continue
        n_fid += 1
        if r["payload"] > limit:
            pct = 100.0 * (r["payload"] - ideal["payload"]) / \
                max(1, ideal["payload"])
            fail(f"S1 fidelity {k}: B-RANS payload {r['payload']} exceeds "
                 f"{limit} (+{pct:.3f} pct > bound)")
    if n_fid:
        print(f"VB-coder-fidelity OK ({n_fid} S1 spine rows within +0.50 "
              f"pct of their own B-IDEAL rows)")

    # Net-audit: serializer agreement, NET identity, frame-A schema, and
    # every coded row decodes (frame A replay + spine B-RANS).
    bad_audit = bad_net = bad_rt = bad_schema = 0
    for r in s1rows:
        if r["audit"] != "1":
            bad_audit += 1
        if r["net"] != r["payload"] + r["tables"] + r["maps"] + r["trees"]:
            bad_net += 1
        if r["frame"] == "A" and (r["tables"] or r["maps"] or r["trees"]):
            bad_schema += 1     # adaptive replay carries zero side info
        if r["be"] in ("B-ADAPT", "B-RANS") and r["rt"] != "1":
            bad_rt += 1
    if bad_audit or bad_net or bad_rt or bad_schema:
        fail(f"net-audit(S1): {bad_audit} audit disagreements, "
             f"{bad_net} NET identity violations, {bad_rt} round-trip "
             f"failures, {bad_schema} frame-A schema violations")
    else:
        print(f"VB-net-audit OK ({len(s1rows)} S1 rows: audits agree, NET "
              f"identity holds, adaptive rows carry zero side info, all "
              f"coded rows decode)")

    # ----- gate (addendum 19.5; pins P-S1-9/P-S1-10) -----
    ctrl = {}
    for r in s1rows:
        if r["fam"] != "MED":
            continue
        if r["frame"] == "S" and r["be"] == "B-RANS":
            ctrl[("S", r["img"])] = r["net"]
        if r["frame"] == "A" and r["be"] == "B-ADAPT":
            ctrl[("A", r["img"])] = r["net"]
    def median(xs):
        s = sorted(xs)
        n = len(s)
        return s[n // 2] if n % 2 else (s[n // 2 - 1] + s[n // 2]) / 2.0
    margins = {}
    for r in s1rows:
        if r["fam"] == "MED":
            continue
        if r["frame"] == "S" and r["be"] != "B-RANS":
            continue     # gating backend only inside FRAME-S
        c = ctrl.get((r["frame"], r["img"]))
        if not c:
            continue
        rel = 100.0 * (c - r["net"]) / c
        margins.setdefault((r["frame"], r["fam"]), []).append((rel,
                                                               r["img"]))
    summary = {}
    for kk, vals in sorted(margins.items()):
        rels = [v for v, _ in vals]
        summary[kk] = {"median": median(rels), "min": min(rels),
                       "max": max(rels), "n": len(vals)}
    print("== S1 GATE READOUT (FRAME-S primary/gating; FRAME-A reported "
          "beside, never gates; addendum 19.3/19.5; pin P-S1-9) ==")
    for kk in sorted(summary):
        s = summary[kk]
        print(f"GATE {kk[0]:1s} {kk[1]:4s} n={s['n']} "
              f"median={s['median']:+.4f} pct min={s['min']:+.4f} "
              f"max={s['max']:+.4f}")
    s_fams = sorted({k[1] for k in summary})
    if not s_fams:
        print("S1 GATE INCOMPLETE (no scorable FRAME-S rows; MED control "
              "missing or families absent)")
    else:
        best_fam, best_s = max(
            ((k[1], v["median"]) for k, v in summary.items()
             if k[0] == "S"),
            key=lambda kv: kv[1])
        a_best = max(((v["median"], k[1]) for k, v in summary.items()
                      if k[0] == "A"), default=(0.0, "-"))
        s1_pass = best_s >= 1.5
        print(f"S1 FRAME-S: best non-MED median {best_s:+.4f} pct ({best_fam})"
              f" vs bar >= +1.5000 pct -> {'PASS' if s1_pass else 'FAIL'}")
        print(f"S1 FRAME-A beside: best median {a_best[0]:+.4f} pct "
              f"({a_best[1]}) - reported only, never gates (19.3)")
        if s1_pass:
            print(f"S1 VERDICT: PASS - {best_fam} ships in the spine frame; "
                  f"S2 error-feedback canary OPENS on this winner")
        else:
            print("S1 VERDICT: FAIL - MED ships in both frames; bucket B3 "
                  "closed-with-numbers (dual-frame evidence recorded)")

# ----- S3 rows: rail integrity (flips exit code) + gate (never does) -----
if s3rows:
    # Fidelity per (img, variant, k): B-RANS within +0.50 percent of its own
    # B-IDEAL row.
    cfgs = {}
    for r in s3rows:
        cfgs.setdefault((r["img"], r["variant"], r["kraw"]), {})[r["be"]] = r
    n_fid = 0
    for k, bes in sorted(cfgs.items()):
        ideal = bes.get("B-IDEAL")
        if ideal is None:
            fail(f"S3 fidelity {k}: no B-IDEAL row to bound against")
            continue
        limit = (FID_NUM * ideal["payload"]) // FID_DEN + 1
        r = bes.get("B-RANS")
        if r is None:
            continue
        n_fid += 1
        if r["payload"] > limit:
            pct = 100.0 * (r["payload"] - ideal["payload"]) / \
                max(1, ideal["payload"])
            fail(f"S3 fidelity {k}: B-RANS payload {r['payload']} exceeds "
                 f"{limit} (+{pct:.3f} pct > bound)")
    if n_fid:
        print(f"VB-coder-fidelity OK ({n_fid} S3 rows within +0.50 pct of "
              f"their own B-IDEAL rows)")

    # Net-audit: serializer agreement, NET identity, zero-tree schema (no
    # spatial maps or trees exist anywhere in S3), and every coded row
    # decodes.
    bad_audit = bad_net = bad_rt = bad_schema = 0
    for r in s3rows:
        if r["audit"] != "1":
            bad_audit += 1
        if r["net"] != r["payload"] + r["tables"] + r["maps"] + r["trees"]:
            bad_net += 1
        if r["trees"] != 0:
            bad_schema += 1     # S3 transmits tables + merge map ONLY
        if r["be"] == "B-RANS" and r["rt"] != "1":
            bad_rt += 1
    if bad_audit or bad_net or bad_rt or bad_schema:
        fail(f"net-audit(S3): {bad_audit} audit disagreements, "
             f"{bad_net} NET identity violations, {bad_rt} round-trip "
             f"failures, {bad_schema} nonzero-tree schema violations")
    else:
        print(f"VB-net-audit OK ({len(s3rows)} S3 rows: audits agree, NET "
              f"identity holds, tree columns identically zero, all coded "
              f"rows decode)")

    # ----- gate (addendum 19.5 S3; pins P-S3-9/P-S3-10) -----
    base = {}
    for r in s3rows:
        if r["variant"] != "KFLAT16":
            continue
        base[r["img"], r["be"]] = r["net"]
    def median(xs):
        s = sorted(xs)
        n = len(s)
        return s[n // 2] if n % 2 else (s[n // 2 - 1] + s[n // 2]) / 2.0
    margins = {}
    for r in s3rows:
        if r["variant"] == "KFLAT16" or r["be"] != "B-RANS":
            continue     # gating backend only; baseline itself excluded
        c = base.get((r["img"], "B-RANS"))
        if not c:
            continue
        rel = 100.0 * (c - r["net"]) / c
        margins.setdefault((r["variant"], r["kraw"]), []).append(
            (rel, r["img"]))
    summary = {}
    for kk, vals in sorted(margins.items()):
        rels = [v for v, _ in vals]
        summary[kk] = {"median": median(rels), "min": min(rels),
                       "max": max(rels), "n": len(vals)}
    print("== S3 GATE READOUT (FRAME-S primary/gating vs same-stack "
          "best-flat-16 baseline; addendum 19.5; pin P-S3-9) ==")
    for kk in sorted(summary):
        s = summary[kk]
        print(f"GATE {kk[0]:7s} k={kk[1]:3d} n={s['n']} "
              f"median={s['median']:+.4f} pct min={s['min']:+.4f} "
              f"max={s['max']:+.4f}")
    if not summary:
        print("S3 GATE INCOMPLETE (no scorable property rows or baseline "
              "missing)")
    else:
        best_k, best_s = max(summary.items(), key=lambda kv: kv[1]["median"])
        worst = min(v["min"] for v in summary.values())
        s3_pass = best_s["median"] >= 1.5
        print(f"S3 FRAME-S: best median {best_s['median']:+.4f} pct "
              f"({best_k[0]} k={best_k[1]}) vs bar >= +1.5000 pct -> "
              f"{'PASS' if s3_pass else 'FAIL'}")
        print(f"S3 worst per-image outcome across variants: {worst:+.4f} "
              f"pct (reported beside the median per I10)")
        if s3_pass:
            print(f"S3 VERDICT: PASS - {best_k[0]} k={best_k[1]} joins the "
                  f"S4 composition candidate set as a property winner")
        else:
            print("S3 VERDICT: FAIL - flat-16 keying ships unchanged; "
                  "bucket B2 closed-with-numbers (property evidence "
                  "recorded)")

# ----- S4 rows: rail integrity (flips exit code) + gate (never does) -----
if s4rows:
    # Fidelity per (img, trial): SPINE B-RANS within +0.50 percent of its
    # own B-IDEAL row (pin P-S4-5).
    cfgs = {}
    for r in s4rows:
        if r["cand"] != "SPINE":
            continue
        cfgs.setdefault((r["img"], r["trial"]), {})[r["be"]] = r
    n_fid = 0
    for k, bes in sorted(cfgs.items()):
        ideal = bes.get("B-IDEAL")
        if ideal is None:
            fail(f"S4 fidelity {k}: no B-IDEAL row to bound against")
            continue
        limit = (FID_NUM * ideal["payload"]) // FID_DEN + 1
        rr = bes.get("B-RANS")
        if rr is None:
            continue
        n_fid += 1
        if rr["payload"] > limit:
            pct = 100.0 * (rr["payload"] - ideal["payload"]) / \
                max(1, ideal["payload"])
            fail(f"S4 fidelity {k}: B-RANS payload {rr['payload']} exceeds "
                 f"{limit} (+{pct:.3f} pct > bound)")
    if n_fid:
        print(f"VB-coder-fidelity OK ({n_fid} S4 spine rows within +0.50 "
              f"pct of their own B-IDEAL rows)")

    # Net-audit: serializer agreement, NET identity, candidate schemas
    # (ADAPT rows carry zero side info; SPINE rows transmit tables + merge
    # map only - no trees anywhere in this slice), every coded row decodes.
    bad_audit = bad_net = bad_rt = bad_schema = 0
    for r in s4rows:
        if r["audit"] != "1":
            bad_audit += 1
        if r["net"] != r["payload"] + r["tables"] + r["maps"] + r["trees"]:
            bad_net += 1
        if r["be"] == "B-ADAPT" and (r["tables"] or r["maps"] or
                                     r["trees"]):
            bad_schema += 1     # ADAPT replay carries zero side info
        if r["cand"] == "SPINE" and r["trees"] != 0:
            bad_schema += 1     # KFLAT16 spine transmits no tree artifacts
        if r["be"] == "B-RANS" and r["rt"] != "1":
            bad_rt += 1
    if bad_audit or bad_net or bad_rt or bad_schema:
        fail(f"net-audit(S4): {bad_audit} audit disagreements, "
             f"{bad_net} NET identity violations, {bad_rt} round-trip "
             f"failures, {bad_schema} schema violations")
    else:
        print(f"VB-net-audit OK ({len(s4rows)} S4 rows: audits agree, NET "
              f"identity holds, candidate schemas clean, all coded rows "
              f"decode)")

    # ----- gate (addendum 19.5 S4; pins P-S4-3/P-S4-4/P-S4-7/P-S4-8) -----
    ctrl = {}
    adapt_trial = {}
    spine = {}
    for r in s4rows:
        if r["cand"] == "ADAPT" and r["be"] == "B-ADAPT":
            if r["img"] not in ctrl or r["net"] < ctrl[r["img"]]:
                ctrl[r["img"]] = r["net"]
                adapt_trial[r["img"]] = r["trial"]
        elif r["cand"] == "SPINE" and r["be"] == "B-RANS":
            k = (r["img"], r["trial"])
            if k not in spine or r["net"] < spine[k]:
                spine[k] = r["net"]

    def median(xs):
        s = sorted(xs)
        n = len(s)
        return s[n // 2] if n % 2 else (s[n // 2 - 1] + s[n // 2]) / 2.0

    # Corpus classes pinned by docs/benchmark-methodology.md section 1.
    PORT = {"kodim04.ppm", "kodim09.ppm", "kodim10.ppm", "kodim17.ppm",
            "kodim18.ppm", "kodim19.ppm"}
    composed = {}
    rel_by_class = {"L": [], "P": []}
    print("== S4 COMPOSITION READOUT (winner by real NET bytes per image; "
          "addendum 19.5 S4; pins P-S4-3/P-S4-4) ==")
    for img in sorted(ctrl):
        c = ctrl[img]
        best = None     # (net, trial); strict improvement only, so a tie
        for (img2, trial), net in spine.items():
            if img2 != img:
                continue
            if best is None or net < best[0]:
                best = (net, trial)
        if best is None or c <= best[0]:
            win_net, win_cand, win_trial = c, "ADAPT", adapt_trial[img]
        else:
            win_net, win_cand, win_trial = best[0], "SPINE", best[1]
        rel = 100.0 * (c - win_net) / c
        cls = "P" if img in PORT else "L"
        rel_by_class[cls].append(rel)
        composed[img] = (rel, win_cand, win_trial, c, win_net)
        print(f"COMPOSED {img} winner={win_cand}/{win_trial} ctrl={c} "
              f"net={win_net} relpct={rel:+.4f}")

    if not composed:
        print("S4 GATE INCOMPLETE (no composition rows)")
    elif not rel_by_class["L"]:
        fail("S4 projection needs at least one measured landscape image "
             "(class medians per pin P-S4-7)")
    else:
        med_L = median(rel_by_class["L"])
        med_P = median(rel_by_class["P"]) if rel_by_class["P"] else None
        inherited = med_P is None
        if inherited:
            med_P = median([v for vals in rel_by_class.values()
                            for v in vals])
        inh_txt = (f"; portrait UNMEASURED on this quad -> inherits the "
                   f"overall quad median {med_P:+.4f} pct [INHERITED, pin "
                   f"P-S4-7]") if inherited else ""
        print(f"S4 class medians (I10): landscape {med_L:+.4f} pct over "
              f"{len(rel_by_class['L'])} quad images{inh_txt}")

        e1_path = sys.argv[5] if len(sys.argv) > 5 and sys.argv[5] else ""
        e1 = {}
        try:
            for line in open(e1_path):
                f = line.rstrip("\n").split(",")
                if len(f) >= 3 and f[0] != "image" and f[0]:
                    e1[f[0]] = float(f[2])
        except OSError:
            e1 = {}
        if not e1:
            fail("S4 projection: committed e1 CSV missing or unreadable "
                 f"(got '{e1_path}') - pin P-S4-8 requires it verbatim")
        else:
            proj_ps, land_ps = [], []
            for img in sorted(e1):
                cls = "P" if img in PORT else "L"
                rel = med_P if cls == "P" else med_L
                ps = e1[img] * (1.0 - rel / 100.0)
                proj_ps.append(ps)
                if cls == "L":
                    land_ps.append(ps)
            mean_ps = sum(proj_ps) / len(proj_ps)
            mean_sum = mean_ps * 3     # RGB corpus convention (bench_gate)
            land_sum = 3.0 * sum(land_ps) / len(land_ps)
            s4_pass = mean_sum < 9.35 and mean_ps < 3.117
            m2 = mean_sum < 9.498 and mean_ps < 3.166
            m3 = mean_sum < 8.655 and mean_ps < 2.885
            s5_open = (not s4_pass) and mean_sum < 8.8316 and \
                mean_ps < 2.9438
            print(f"S4 PROJECTION (18.5 verbatim vs committed e1): summed "
                  f"{mean_sum:.4f} vs threshold < 9.3500 | per-sample "
                  f"{mean_ps:.4f} vs threshold < 3.1170")
            print(f"S4 landscape-only projection beside (P-S4-7 "
                  f"sensitivity): summed {land_sum:.4f}")
            print(f"M2 context (<9.498/<3.166): projected "
                  f"{'PASS-shaped' if m2 else 'FAIL'} - REPORTED ONLY; the "
                  f"gates are judged solely by bench_gate.sh dual-unit vs "
                  f"real cjxl (owner standing order)")
            print(f"M3 context (<8.655/<2.885): projected "
                  f"{'PASS-shaped' if m3 else 'FAIL'} - REPORTED ONLY")
            if s4_pass:
                print("S4 VERDICT: PASS - proceed-to-format handoff (a NEW "
                      "Architect session blueprints the container program "
                      "behind a version bump)")
            elif s5_open:
                print("S4 VERDICT: inside-M3-reach-but-short - S5 reserve "
                      "opens ONCE (pin P-S4-9), then compose again")
            else:
                print("S4 VERDICT: FAIL - stop-and-report with the full "
                      "ledger; zero container bytes spent across the whole "
                      "program")

# ----- T0 rows: rail integrity ONLY flips exit codes; every diagnostic
# readout below is NON-GATING (pin P-T0-11). -----
if t0rows or tproto or tamirror or tzzhu:
    # VB-proto-roundtrip: every serializer surface must decode mirror-exact
    # and hard-detect truncation, CRC break and content tamper.
    need = {"SBP2", "SBC1", "SBD1"}
    seen = {}
    for p in tproto:
        seen[p["kind"]] = p
        down = [k for k in ("mirror", "trunc", "crc", "tamper", "audit")
                if not p[k]]
        if down:
            fail(f"proto-roundtrip {p['img']}/{p['kind']}: flags down: "
                 f"{','.join(down)}")
    miss = sorted(need - set(seen))
    if miss:
        fail(f"proto-roundtrip: missing serializer surfaces {miss}")
    elif not [p for p in tproto if not all((p["mirror"], p["trunc"],
                                            p["crc"], p["tamper"],
                                            p["audit"]))]:
        print(f"VB-proto-roundtrip OK ({len(tproto)} surfaces: 'SBP2'/"
              f"'SBC1'/'SBD1' decode mirror-exact; truncation/CRC/tamper "
              f"all hard-detect)")

    # ZZ-HU identity wiring (pin P-T0-12): one echo row with profile id 3.
    if not any(z["prof"] == 3 and z["label"] == "HYB_C" for z in tzzhu):
        fail("zzhu-identity: no TZZHU row echoing HYB_C profile id 3")
    else:
        print("VB-zzhu-identity OK (ZZ-HU = TokProfile::HYB_C reused "
              "verbatim; row-schema label only)")

    # VB-assign-mirror: decoder-side word reconstruction equals encoder
    # words on BOTH fixtures.
    by_fx = {}
    for a in tamirror:
        by_fx.setdefault(a["img"], {})[a["fixture"]] = a
        if not a["rt"]:
            fail(f"assign-mirror {a['img']}/{a['fixture']}: decoded words "
                 f"differ from encoder words")
        if a["nwords"] <= 0:
            fail(f"assign-mirror {a['img']}/{a['fixture']}: empty words")
    n_am_ok = 0
    for img, fx in sorted(by_fx.items()):
        if {"RANDOM", "SKEW"} - set(fx):
            fail(f"assign-mirror {img}: missing fixture(s) "
                 f"{sorted({'RANDOM', 'SKEW'} - set(fx))}")
        elif fx["RANDOM"]["rt"] and fx["SKEW"]["rt"]:
            n_am_ok += 1
    if n_am_ok:
        print(f"VB-assign-mirror OK ({n_am_ok} image(s): random AND skewed "
              f"assignment streams reconstruct exactly)")

    # VB-net-audit-t on cost rows: I12 extended with the assign column,
    # schema per candidate kind.
    bad_audit = bad_net = bad_rt = bad_schema = 0
    for r in t0rows:
        if r["audit"] != "1":
            bad_audit += 1
        if r["net"] != (r["payload"] + r["tables"] + r["maps"] +
                        r["trees"] + r["assign"]):
            bad_net += 1
        if r["be"] == "B-RANS" and r["rt"] != "1":
            bad_rt += 1
        if r["cand"] == "ADAPT" and (r["tables"] or r["maps"] or
                                     r["trees"] or r["assign"]):
            bad_schema += 1     # production replay carries zero side info
        if r["cand"] == "SPINE" and (r["trees"] or r["assign"]):
            bad_schema += 1     # spine transmits tables + 'SBP1' only
        if r["cand"] == "CEIL" and (r["maps"] or r["trees"] or
                                    r["assign"]):
            bad_schema += 1     # ceiling: assignment bits impossible BY
                                # CONSTRUCTION (pin P-T0-6)
        if r["cand"].startswith(("CB", "CBRAND")) and (r["maps"] or
                                                       r["trees"]):
            bad_schema += 1     # codebooks carry tables + words only
        if r["cand"] not in ("ADAPT", "SPINE") and r["keff"] < 1:
            bad_schema += 1     # group machinery must report its K
    if bad_audit or bad_net or bad_rt or bad_schema:
        fail(f"net-audit-t: {bad_audit} audit disagreements, {bad_net} NET "
             f"identity violations, {bad_rt} round-trip failures, "
             f"{bad_schema} schema violations")
    else:
        print(f"VB-net-audit-t OK ({len(t0rows)} T0 rows: audits agree, NET "
              f"identity holds incl. assign column, schemas clean)")

    # Coder fidelity on CEIL/CB families: B-RANS within +0.50 pct of its
    # own B-IDEAL row per (img, cand, gs).
    cfgs = {}
    for r in t0rows:
        if r["be"] not in ("B-IDEAL", "B-RANS"):
            continue
        if r["cand"] in ("ADAPT", "SPINE"):
            continue
        cfgs.setdefault((r["img"], r["cand"], r["gs"]), {})[r["be"]] = r
    n_fid = 0
    for k, bes in sorted(cfgs.items()):
        ideal = bes.get("B-IDEAL")
        rr = bes.get("B-RANS")
        if ideal is None or rr is None:
            continue
        n_fid += 1
        limit = (FID_NUM * ideal["payload"]) // FID_DEN + 1
        if rr["payload"] > limit:
            pct = 100.0 * (rr["payload"] - ideal["payload"]) / \
                max(1, ideal["payload"])
            fail(f"fidelity-t {k}: B-RANS payload {rr['payload']} exceeds "
                 f"{limit} (+{pct:.3f} pct > bound)")
    if n_fid:
        print(f"VB-coder-fidelity-t OK ({n_fid} CEIL/CB rows within +0.50 "
              f"pct of their own B-IDEAL rows)")

    # Real T0 images must sit under the committed anchors (synthetic
    # fixtures never reach this evaluator - pin P-T0-10).
    t0_imgs = {r["img"] for r in t0rows}
    san_imgs = {r["img"] for r in sand}
    for img in sorted(t0_imgs - san_imgs):
        fail(f"t0 anchor coverage: {img} has no SANDBOX anchor row")

    # ---- NON-GATING diagnostic readout (prints, decides nothing) ----
    print("== T0 DIAGNOSTIC READOUT (addendum 20.6; NON-GATING per pin "
          "P-T0-11 - no verdict here opens any phase) ==")
    tb_win = {}
    for r in t0rows:
        if r["cand"] not in ("ADAPT", "SPINE"):
            continue
        if r["be"] not in ("B-ADAPT", "B-RANS"):
            continue
        if r["img"] not in tb_win or r["net"] < tb_win[r["img"]]["net"]:
            tb_win[r["img"]] = r
    for img in sorted(tb_win):
        w = tb_win[img]
        print(f"T-BASE {img}: winner={w['cand']} net={w['net']} "
              f"(fresh S4-composition replay)")
    ceil_rows = [r for r in t0rows if r["cand"] == "CEIL" and
                 r["be"] == "B-RANS"]
    for gs in ("GS64", "GS128"):
        rs = [r for r in ceil_rows if r["gs"] == gs]
        if not rs:
            continue
        gains = []
        for r in rs:
            tb = tb_win.get(r["img"])
            if tb and tb["payload"]:
                gains.append(100.0 * (tb["payload"] - r["payload"]) /
                             tb["payload"])
        if gains:
            print(f"CEILING {gs}: payload-gain median "
                  f"{median(gains):+.4f} pct vs T-BASE payload | tables "
                  f"{rs[0]['tables']} B fully NETTED | assign=0 by "
                  f"construction")
    cb_rows = [r for r in t0rows if r["cand"].startswith("CB") and
               r["be"] == "B-RANS"]
    keffs = sorted({r["keff"] for r in cb_rows})
    for gs in ("GS64", "GS128"):
        fit = [r for r in cb_rows if r["gs"] == gs and
               not r["cand"].startswith("CBRAND")]
        rnd = [r for r in cb_rows if r["gs"] == gs and
               r["cand"].startswith("CBRAND")]
        if fit and rnd:
            bf = min(r["net"] for r in fit)
            br = min(r["net"] for r in rnd)
            print(f"CODEBOOK {gs}: fitted best NET {bf} vs random twin "
                  f"{br} -> fitted {'BEATS' if bf < br else 'LOSES TO'} "
                  f"random (rank direction) | transmitted K observed "
                  f"{sorted({r['keff'] for r in fit})}")
    print(f"T0 smoke complete on {sorted(t0_imgs)}; quad verdict numbers "
          f"start at T1a (K set {keffs if cb_rows else '[]'} observed on "
          f"kodim01)")

# ----- T1 rows (slice Q1; pins P-Q1-2..P-Q1-9): rail integrity flips the
# exit code, gate verdicts never do. -----
if t1rows:
    # VB-net-audit-t on T1 rows: I12 extended identity + per-candidate
    # schema contracts.
    bad_audit = bad_net = bad_rt = bad_schema = 0
    for r in t1rows:
        if r["audit"] != "1":
            bad_audit += 1
        if r["net"] != (r["payload"] + r["tables"] + r["maps"] +
                        r["trees"] + r["assign"]):
            bad_net += 1
        if r["be"] in ("B-RANS", "B-ADAPT") and r["rt"] != "1":
            bad_rt += 1
        if r["cand"] == "ADAPT" and (r["tables"] or r["maps"] or
                                     r["trees"] or r["assign"]):
            bad_schema += 1     # production replay carries zero side info
        if r["cand"] == "SPINE" and (r["trees"] or r["assign"]):
            bad_schema += 1     # spine transmits tables + 'SBP1' only
        if r["cand"] == "CEIL" and (r["maps"] or r["trees"] or
                                    r["assign"]):
            bad_schema += 1     # ceiling: assignment bits impossible BY
                                # CONSTRUCTION (pin P-T0-6)
        if r["cand"].startswith("CB") and (r["maps"] or r["trees"]):
            bad_schema += 1     # codebooks carry tables + words only
        if r["cand"] not in ("ADAPT",) and r["keff"] < 1:
            bad_schema += 1     # every sandbox family reports its K
    if bad_audit or bad_net or bad_rt or bad_schema:
        fail(f"net-audit-t(T1): {bad_audit} audit disagreements, "
             f"{bad_net} NET identity violations, {bad_rt} round-trip "
             f"failures, {bad_schema} schema violations")
    else:
        print(f"VB-net-audit-t OK ({len(t1rows)} T1 rows: audits agree, "
              f"NET identity holds incl. assign column, schemas clean)")

    # Coder fidelity on CEIL/CB families: B-RANS within +0.50 pct of its
    # own B-IDEAL row per (img, cand, gs, trial).
    cfgs = {}
    for r in t1rows:
        if r["be"] not in ("B-IDEAL", "B-RANS"):
            continue
        if r["cand"] in ("ADAPT", "SPINE"):
            continue
        cfgs.setdefault((r["img"], r["cand"], r["gs"], r["trial"]),
                        {})[r["be"]] = r
    n_fid = 0
    for k, bes in sorted(cfgs.items()):
        ideal = bes.get("B-IDEAL")
        rr = bes.get("B-RANS")
        if ideal is None or rr is None:
            continue
        n_fid += 1
        limit = (FID_NUM * ideal["payload"]) // FID_DEN + 1
        if rr["payload"] > limit:
            pct = 100.0 * (rr["payload"] - ideal["payload"]) / \
                max(1, ideal["payload"])
            fail(f"fidelity-t {k}: B-RANS payload {rr['payload']} exceeds "
                 f"{limit} (+{pct:.3f} pct > bound)")
    if n_fid:
        print(f"VB-coder-fidelity-t OK ({n_fid} CEIL/CB families within "
              f"+0.50 pct of their own B-IDEAL rows)")

    # Real T1 images must sit under the committed anchors.
    t1_imgs = {r["img"] for r in t1rows}
    san_imgs = {r["img"] for r in sand}
    for img in sorted(t1_imgs - san_imgs):
        fail(f"t1 anchor coverage: {img} has no SANDBOX anchor row")

    # TSUM decomposition rail (pin P-Q1-8): every summary row must be
    # mechanically re-derived from raw rows - components must match a real
    # candidate B-RANS row and the base winner, NET identity and both
    # derived columns must recompute exactly, and the sole-term flag must
    # equal its pinned boolean form.
    base_rows = {}
    cand_rows = {}
    for r in t1rows:
        if r["cand"] in ("ADAPT", "SPINE") and \
                r["be"] in ("B-ADAPT", "B-RANS"):
            base_rows.setdefault(r["img"], set()).add(
                _comp(r["payload"], r["tables"], r["maps"], r["trees"],
                      r["assign"]))
        elif r["be"] == "B-RANS":
            cand_rows.setdefault((r["img"], r["cand"], r["gs"]),
                                 set()).add(_comp(r["payload"],
                                                  r["tables"], r["maps"],
                                                  r["trees"],
                                                  r["assign"]))
    bad_tsum = 0
    for s in tsumrows:
        if "@" not in s["arm"]:
            bad_tsum += 1
            continue
        cname, gs = s["arm"].split("@", 1)
        ok_row = _comp(s["p"], s["t"], s["m"], s["tr"], s["a"]) in \
            cand_rows.get((s["img"], cname, gs), set())
        ok_base = _comp(s["bp"], s["bt"], s["bm"], s["btr"], s["ba"]) in \
            base_rows.get(s["img"], set())
        net_ok = (s["net"] == s["p"] + s["t"] + s["m"] + s["tr"] +
                  s["a"]) and \
                 (s["bnet"] == s["bp"] + s["bt"] + s["bm"] + s["btr"] +
                  s["ba"])
        dp = s["p"] - s["bp"]
        dt = s["t"] - s["bt"]
        dm = s["m"] - s["bm"]
        dtr = s["tr"] - s["btr"]
        da = s["a"] - s["ba"]
        sole_ok = s["sole"] == ((dt > 0) and (dp <= 0) and (dm == 0) and
                                (dtr == 0) and (da == 0))
        pay_ok = abs(s["paygain"] -
                     (100.0 * (s["bp"] - s["p"]) / s["bp"]
                      if s["bp"] else 0.0)) < 1e-3
        rel_ok = abs(s["relpct"] -
                     (100.0 * (s["bnet"] - s["net"]) / s["bnet"]
                      if s["bnet"] else 0.0)) < 1e-3
        if not (ok_row and ok_base and net_ok and sole_ok and pay_ok and
                rel_ok):
            bad_tsum += 1
    if bad_tsum:
        fail(f"net-audit-t(TSUM): {bad_tsum} decomposition rows failed "
             f"mechanical cross-check against raw T1 rows")
    else:
        print(f"VB-net-audit-t OK ({len(tsumrows)} TSUM rows re-derived "
              f"exactly from raw rows)")

    # ---- T1A gate readout (addendum 20.5 T1a; NON-GATING verdict) ----
    ceil_arms = [s for s in tsumrows if s["arm"].startswith("CEIL@")]
    cb_arms = [s for s in tsumrows if s["arm"].startswith("CB")]
    if ceil_arms and not cb_arms:
        print("== T1A CEILING READOUT (addendum 20.5 T1a; pins "
              "P-Q1-2..P-Q1-4) ==")
        imgs_t1 = sorted({s["img"] for s in ceil_arms})
        per_img = {}
        for img in imgs_t1:
            arms = {s["arm"]: s for s in ceil_arms if s["img"] == img}
            a64 = arms.get("CEIL@GS64")
            a128 = arms.get("CEIL@GS128")
            best = a64 if a64 and (not a128 or a64["net"] <= a128["net"]) \
                else a128
            per_img[img] = best
        for img in imgs_t1:
            b = per_img[img]
            print(f"T1A {img}: arm={b['arm']} relpct={b['relpct']:+.4f} "
                  f"pct | payload gain {b['paygain']:+.4f} pct | tables "
                  f"{b['t']} B vs payload delta {b['p'] - b['bp']:+d} B | "
                  f"sole_tables_loss={str(b['sole']).lower()}")
        relps = [per_img[i]["relpct"] for i in imgs_t1]
        pays = [per_img[i]["paygain"] for i in imgs_t1]
        med_r = median(relps)
        med_p = median(pays)
        sole_all = all(per_img[i]["sole"] for i in imgs_t1)
        pg = max(median([s["paygain"] for s in ceil_arms
                         if s["arm"] == a]) for a in
                 sorted({s["arm"] for s in ceil_arms}))
        print(f"T1A quad median RELPCT {med_r:+.4f} pct (min "
              f"{min(relps):+.4f} / max {max(relps):+.4f}) vs bar >= +2.00 "
              f"| median payload gain {med_p:+.4f} pct (bar >= +4.00 for "
              f"the opener) | sole-tables-loss on ALL images: "
              f"{str(sole_all).lower()} | PG (best arm median payload "
              f"gain) {pg:+.4f} pct")
        t1a_pass = med_r >= 2.0
        opens_t1b = (not t1a_pass) and med_p >= 4.0 and sole_all
        if t1a_pass:
            print("T1A VERDICT: PASS - locality-conditioned ceiling clears "
                  "its bar; C1 harvestable")
        elif opens_t1b:
            print("T1A VERDICT: FAIL - but the recorded decomposition "
                  "shows payload gain >= +4.00 pct with table bytes as the "
                  "SOLE losing term on every image: T1b OPENS (pin "
                  "P-Q1-4)")
        else:
            print("T1A VERDICT: FAIL - bucket C1 closed-with-numbers; no "
                  "payable decomposition, T1b stays CLOSED")

    # ---- T1B gate readout (addendum 20.5 T1b; NON-GATING verdict) ----
    if cb_arms:
        print("== T1B CODEBOOK READOUT (addendum 20.5 T1b; pin P-Q1-6) ==")
        order = [f"CB{k}@{g}" for k in (4, 8, 16, 24)
                 for g in ("GS64", "GS128")]
        configs = [c for c in order if any(s["arm"] == c
                                           for s in cb_arms)]
        stat = {}
        for cfg in configs:
            xs = [s["relpct"] for s in cb_arms if s["arm"] == cfg]
            stat[cfg] = median(xs)
        for cfg in configs:
            print(f"T1B {cfg}: median NET gain {stat[cfg]:+.4f} pct over "
                  f"fresh T-BASE")
        winner = configs[0]
        for cfg in configs[1:]:
            if stat[cfg] > stat[winner]:
                winner = cfg
        win_med = stat[winner]
        t1a_csv = sys.argv[6] if len(sys.argv) > 6 else ""
        pg = _read_t1a_pg(t1a_csv) if t1a_csv else None
        if pg is None:
            fail("T1b readout: same-run t1a CSV missing or unreadable "
                 "(pin P-Q1-6 requires PG from it)")
        else:
            retain_bar = pg / 2.0
            floor_bar = 1.0
            print(f"T1B winner {winner}: median NET gain {win_med:+.4f} "
                  f"pct | gates: retain >= half of T1a PG "
                  f"({retain_bar:+.4f}) AND floor >= +1.00")
            if win_med >= retain_bar and win_med >= floor_bar:
                print("T1B VERDICT: PASS - content-defined codebook joins "
                      "the composition candidate set")
            else:
                print("T1B VERDICT: FAIL - bucket C1 closed; the spine's "
                      "+5.5 pct stays the harvested share")

# ----- T2 rows (slice Q2; pins P-Q2-1..P-Q2-9): rail integrity flips the
# exit code, the T2a gate verdict never does. -----
if t2rows:
    # VB-net-audit-t on T2 rows: identity + 'SBD1'-only schema contracts.
    bad_audit = bad_net = bad_rt = bad_schema = 0
    for r in t2rows:
        if r["audit"] != "1":
            bad_audit += 1
        if r["net"] != (r["payload"] + r["tables"] + r["maps"] +
                        r["trees"] + r["assign"]):
            bad_net += 1
        if r["be"] in ("B-RANS", "B-ADAPT") and r["rt"] != "1":
            bad_rt += 1
        if r["cand"].startswith("SHRUNK") and (r["maps"] or r["trees"] or
                                               r["assign"]):
            bad_schema += 1     # one 'SBD1' blob; zero other side info
    if bad_audit or bad_net or bad_rt or bad_schema:
        fail(f"net-audit-t(T2): {bad_audit} audit disagreements, "
             f"{bad_net} NET identity violations, {bad_rt} round-trip "
             f"failures, {bad_schema} schema violations")
    else:
        print(f"VB-net-audit-t OK ({len(t2rows)} T2 rows: audits agree, "
              f"NET identity holds, shrunk schemas clean)")

    # Coder fidelity on SHRUNK families per (img, cand, trial).
    cfgs = {}
    for r in t2rows:
        if r["be"] not in ("B-IDEAL", "B-RANS"):
            continue
        cfgs.setdefault((r["img"], r["cand"], r["trial"]), {})[r["be"]] = r
    n_fid = 0
    for k, bes in sorted(cfgs.items()):
        ideal = bes.get("B-IDEAL")
        rr = bes.get("B-RANS")
        if ideal is None or rr is None:
            continue
        n_fid += 1
        limit = (FID_NUM * ideal["payload"]) // FID_DEN + 1
        if rr["payload"] > limit:
            pct = 100.0 * (rr["payload"] - ideal["payload"]) / \
                max(1, ideal["payload"])
            fail(f"fidelity-t2 {k}: B-RANS payload {rr['payload']} exceeds "
                 f"{limit} (+{pct:.3f} pct > bound)")
    if n_fid:
        print(f"VB-coder-fidelity-t OK ({n_fid} shrunk families within "
              f"+0.50 pct of their own B-IDEAL rows)")

    # Real T2 images must sit under the committed anchors.
    t2_imgs = {r["img"] for r in t2rows}
    san_imgs = {r["img"] for r in sand}
    for img in sorted(t2_imgs - san_imgs):
        fail(f"t2 anchor coverage: {img} has no SANDBOX anchor row")

    # T2SUM decomposition rail (pin P-Q2-6/P-Q2-8): every summary row's
    # components must match a real shrunk B-RANS row and the real SPINE
    # B-RANS class16 baseline row; NET identities and relpct recompute.
    spine_base = {}
    shrunk_rows = {}
    _arm_cand = {"SHRUNK@TW-A": "SHRUNKA", "SHRUNK@TW-B": "SHRUNKB"}
    for r in t1rows:
        if r["cand"] == "SPINE" and r["be"] == "B-RANS":
            spine_base.setdefault(r["img"], set()).add(
                _comp(r["payload"], r["tables"], r["maps"], r["trees"],
                      r["assign"]))
    for r in t2rows:
        if r["be"] == "B-RANS":
            shrunk_rows.setdefault((r["img"], r["cand"]), set()).add(
                _comp(r["payload"], r["tables"], r["maps"], r["trees"],
                      r["assign"]))
    bad_t2sum = 0
    for s in t2sumrows:
        cname = _arm_cand.get(s["arm"])
        if cname is None:
            bad_t2sum += 1
            continue
        ok_row = _comp(s["p"], s["t"], s["m"], s["tr"], s["a"]) in \
            shrunk_rows.get((s["img"], cname), set())
        ok_base = _comp(s["bp"], s["bt"], s["bm"], s["btr"], s["ba"]) in \
            spine_base.get(s["img"], set())
        net_ok = (s["net"] == s["p"] + s["t"] + s["m"] + s["tr"] +
                  s["a"]) and \
                 (s["bnet"] == s["bp"] + s["bt"] + s["bm"] + s["btr"] +
                  s["ba"])
        rel_ok = abs(s["relpct"] -
                     (100.0 * (s["bnet"] - s["net"]) / s["bnet"]
                      if s["bnet"] else 0.0)) < 1e-3
        if not (ok_row and ok_base and net_ok and rel_ok):
            bad_t2sum += 1
    if bad_t2sum:
        fail(f"net-audit-t(T2SUM): {bad_t2sum} rows failed mechanical "
             f"cross-check against raw T2/T1 rows")
    else:
        print(f"VB-net-audit-t OK ({len(t2sumrows)} T2SUM rows re-derived "
              f"exactly from raw rows)")

# ---- T2A gate readout (addendum 20.5 T2a; NON-GATING verdict) ----
if t2sumrows:
    print("== T2A SHRUNK CONTEXTING READOUT (addendum 20.5 T2a; pins "
          "P-Q2-5..P-Q2-8) ==")
    tb_win = {}
    for r in t1rows:
        if r["cand"] not in ("ADAPT", "SPINE"):
            continue
        if r["be"] not in ("B-ADAPT", "B-RANS"):
            continue
        if r["img"] not in tb_win or r["net"] < tb_win[r["img"]]["net"]:
            tb_win[r["img"]] = r
    arms = ["SHRUNK@TW-A", "SHRUNK@TW-B"]
    stat = {}
    for arm in arms:
        xs = [s["relpct"] for s in t2sumrows if s["arm"] == arm]
        if xs:
            stat[arm] = median(xs)
    imgs_t2 = sorted({s["img"] for s in t2sumrows})
    for img in imgs_t2:
        row = {s["arm"]: s for s in t2sumrows if s["img"] == img}
        parts = ", ".join(
            f"{a.split('@')[1]} {row[a]['relpct']:+.4f} pct"
            for a in arms if a in row)
        tb = tb_win.get(img)
        ctx = f" | T-BASE winner {tb['cand']} net {tb['net']}" if tb else ""
        tabs = min(row[a]["t"] for a in arms if a in row)
        print(f"T2A {img}: {parts} | 'SBD1' tables from {tabs} B{ctx}")
    if stat:
        for a in arms:
            if a in stat:
                xs = [s["relpct"] for s in t2sumrows if s["arm"] == a]
                print(f"T2A {a}: quad median NET gain {stat[a]:+.4f} pct "
                      f"(min {min(xs):+.4f} / max {max(xs):+.4f}) vs "
                      f"same-stack class16 spine")
        winner = sorted(stat.items(), key=lambda kv: (-kv[1],
                                                      kv[0]))[0]
        wm = winner[1]
        print(f"T2A winner {winner[0]}: median {wm:+.4f} pct vs bar "
              f">= +0.50")
        if wm >= 0.5:
            print("T2A VERDICT: PASS - shrunk class343 contexting clears "
                  "its bar; the T2b conditional OPENS")
        else:
            print("T2A VERDICT: FAIL - flat-16 ships unchanged; the T2b "
                  "conditional stays CLOSED")

# ----- T3 rows (slice Q3; pins P-Q3-1..P-Q3-12): rail integrity flips
# the exit code; bar(i) verdict is a measured outcome that never does. -----
if t3rows:
    # VB-net-audit-t on T3 rows: NET identity + round-trip + schema.
    bad_audit = bad_net = bad_rt = 0
    for r in t3rows:
        if r["audit"] != "1":
            bad_audit += 1
        if r["net"] != (r["payload"] + r["tables"] + r["maps"] +
                        r["trees"] + r["assign"]):
            bad_net += 1
        if r["be"] == "B-RANS" and r["rt"] != "1":
            bad_rt += 1
    if bad_audit or bad_net or bad_rt:
        fail(f"net-audit-t(T3): {bad_audit} audit disagreements, "
             f"{bad_net} NET identity violations, {bad_rt} round-trip "
             f"failures")
    else:
        print(f"VB-net-audit-t OK ({len(t3rows)} T3 rows: audits agree, "
              f"NET identity holds, round-trips clean)")

    # Coder fidelity on T3 rows: B-RANS within +0.50 pct of its own
    # B-IDEAL row per (img, fam, tok, cs).
    cfgs = {}
    for r in t3rows:
        if r["be"] not in ("B-IDEAL", "B-RANS"):
            continue
        cfgs.setdefault((r["img"], r["fam"], r["tok"], r["cs"]),
                        {})[r["be"]] = r
    n_fid = 0
    for k, bes in sorted(cfgs.items()):
        ideal = bes.get("B-IDEAL")
        rr = bes.get("B-RANS")
        if ideal is None or rr is None:
            continue
        n_fid += 1
        limit = (FID_NUM * ideal["payload"]) // FID_DEN + 1
        if rr["payload"] > limit:
            pct = 100.0 * (rr["payload"] - ideal["payload"]) / \
                max(1, ideal["payload"])
            fail(f"fidelity-t3 {k}: B-RANS payload {rr['payload']} exceeds "
                 f"{limit} (+{pct:.3f} pct > bound)")
    if n_fid:
        print(f"VB-coder-fidelity-t OK ({n_fid} T3 families within "
              f"+0.50 pct of their own B-IDEAL rows)")

    # Anchor coverage: every T3 image must have a SANDBOX anchor row.
    t3_imgs = {r["img"] for r in t3rows}
    san_imgs = {r["img"] for r in sand}
    for img in sorted(t3_imgs - san_imgs):
        fail(f"t3 anchor coverage: {img} has no SANDBOX anchor row")

    # T3CELL decomposition cross-check (pin P-Q3-8): each T3CELL row's
    # (payload, tables, net) must match the B-RANS row of the same
    # (img, fam, tok, trial_index) from the T3 rows.
    t3_by_key = {}
    for r in t3rows:
        if r["be"] == "B-RANS":
            # Find the matching T3 row index for this trial.
            # T3 rows are ordered: for each (fam, tok) all 7 color trials
            # x 2 backends; the trial index is implicit.
            key = (r["img"], r["fam"], r["tok"])
            t3_by_key.setdefault(key, []).append(r)
    # Build a lookup from (img, fam, tok, trial_idx) -> T3 B-RANS row
    # Note: T3CELL uses "ZZHU" but T3 rows use "HYB-C" for the same
    # profile; normalize to T3 row names for matching.
    _tok_norm = {"ZZHU": "HYB-C"}
    t3_trial_lookup = {}
    for key, rows in t3_by_key.items():
        for idx, r in enumerate(rows):
            t3_trial_lookup[(key[0], key[1], key[2], idx)] = r
    bad_cell = 0
    for c in t3cellrows:
        tok_norm = _tok_norm.get(c["tok"], c["tok"])
        lookup_key = (c["img"], c["fam"], tok_norm, c["trial"])
        found = t3_trial_lookup.get(lookup_key)
        if found is None:
            bad_cell += 1
            continue
        if (c["payload"] != found["payload"] or c["tables"] != found["tables"]
                or c["net"] != found["net"]):
            bad_cell += 1
    if bad_cell:
        fail(f"VB-t3cell-decompose: {bad_cell} T3CELL rows don't match "
             f"their source T3 B-RANS rows")
    else:
        print(f"VB-net-audit-t OK ({len(t3cellrows)} T3CELL rows re-derived "
              f"exactly from source T3 rows)")

# ---- T3 bar(i) gate readout (addendum 20.5 T3; NON-GATING verdict) ----
if t3cellrows:
    print("== T3 FACTORIAL READOUT (addendum 20.5 T3; pins P-Q3-1..P-Q3-12) ==")
    # Per (img, fam, tok) min-trial NET from T3CELL rows.
    cell_net = {}
    for c in t3cellrows:
        cell_net[(c["img"], c["fam"], c["tok"])] = c["net"]

    imgs_t3 = sorted({c["img"] for c in t3cellrows})
    toks = sorted({c["tok"] for c in t3cellrows})
    fams = sorted({c["fam"] for c in t3cellrows})

    # Print per-image min-trial NET table.
    for tok in toks:
        print(f"\n-- tokenization: {tok} --")
        header = f"{'image':<16}" + "".join(f"{f:>12}" for f in fams)
        print(header)
        for img in imgs_t3:
            vals = [cell_net.get((img, f, tok), 0) for f in fams]
            print(f"{img:<16}" + "".join(f"{v:>12}" for v in vals))

    # Bar(i): best non-MED family at winning tokenization vs MED.
    # Winning tokenization = ZFFCTRL (it dominates everywhere per the
    # program history). Best non-MED = max(GAP, W) at ZFFCTRL.
    win_tok = "ZFFCTRL"
    print(f"\n-- bar(i) verdict (tokenization = {win_tok}) --")
    margins = {}
    for img in imgs_t3:
        med_net = cell_net.get((img, "MED", win_tok), 0)
        if med_net == 0:
            continue
        best_nonmed = 0
        best_fam = ""
        for f in fams:
            if f == "MED":
                continue
            n = cell_net.get((img, f, win_tok), 0)
            if n > 0 and (best_nonmed == 0 or n < best_nonmed):
                best_nonmed = n
                best_fam = f
        if best_nonmed == 0:
            continue
        # RELPCT: gain of best-non-MED over MED, as percentage of MED.
        relpct = 100.0 * (med_net - best_nonmed) / med_net
        margins[img] = (relpct, best_fam)
        print(f"{img}: {best_fam}@{win_tok} NET {best_nonmed} vs MED "
              f"NET {med_net} -> margin {relpct:+.4f} pct")

    if margins:
        xs = [v[0] for v in margins.values()]
        med_margin = median(xs)
        print(f"\nT3 bar(i) quad median margin: {med_margin:+.4f} pct "
              f"(min {min(xs):+.4f} / max {max(xs):+.4f}) vs "
              f"bar >= +1.50")
        if med_margin >= 1.5:
            print("T3 bar(i) VERDICT: PASS - best non-MED family clears "
                  "the +1.50 bar; T3b canary rides on the winner")
        else:
            print("T3 bar(i) VERDICT: FAIL - GAP and W take their third "
                  "and final strike; B3/B5 close permanently")
    else:
        print("T3 bar(i) VERDICT: FAIL (no valid margins computed)")

# ---- T3B canary decomposition (NON-GATING) ----
if t3bsrows:
    print("\n== T3B CANARY DECOMPOSITION (addendum 20.5 T3b) ==")
    for s in t3bsrows:
        print(f"{s['img']}: {s['arm']} base NET {s['bnet']} -> "
              f"canary NET {s['cnet']} -> relpct {s['relpct']:+.4f} pct")

# ---- T4 composition + projection (spec 18.5 VERBATIM; pins P-Q3-5
# inherited, P-S4-3/P-S4-4/P-S4-7/P-S4-8) ----
# T4 composes the MED-only spine baseline (GAP/W closed permanently by T3
# FAIL) with per-image winners by real NET bytes across all D4c color
# trials, then projects against the committed e1 CSV.
PORT = {"kodim04.ppm", "kodim09.ppm", "kodim10.ppm", "kodim17.ppm",
        "kodim18.ppm", "kodim19.ppm"}
e1_path = sys.argv[5] if len(sys.argv) > 5 and sys.argv[5] else ""
if t3rows and e1_path:
    e1 = {}
    try:
        for line in open(e1_path):
            f = line.rstrip("\n").split(",")
            if len(f) >= 3 and f[0] != "image" and f[0]:
                e1[f[0]] = (float(f[1]), float(f[2]))  # (bytes, bpp)
    except OSError:
        e1 = {}
    if e1:
        # Per-image: collect MED T3 rows (B-RANS) across all trials.
        med_trials = {}   # img -> list of (net, cs_name)
        for r in t3rows:
            if r.get("fam") == "MED" and r.get("be") == "B-RANS":
                med_trials.setdefault(r["img"], []).append(
                    (r["net"], r.get("cs", "?")))
        # Per-image winner: min NET over all MED trials.
        composed = {}
        rel_by_class = {"L": [], "P": []}
        for img in sorted(e1):
            if img not in med_trials:
                continue
            trials = med_trials[img]
            if not trials:
                continue
            win_net, win_trial = min(trials, key=lambda x: (x[0], x[1]))
            ctrl_bytes, ctrl_bpp = e1[img]
            rel = 100.0 * (ctrl_bytes - win_net) / ctrl_bytes if ctrl_bytes > 0 else 0.0
            cls = "P" if img in PORT else "L"
            rel_by_class[cls].append(rel)
            composed[img] = (rel, win_trial, ctrl_bytes, win_net)
            print(f"T4 COMPOSED {img} winner=MED/{win_trial} ctrl={ctrl_bytes:.0f} "
                  f"net={win_net} relpct={rel:+.4f}")
        if composed:
            print(f"\n== T4 COMPOSITION READOUT (MED-only x D4c; spec 18.5) ==")
            if rel_by_class["L"]:
                med_L = median(rel_by_class["L"])
                med_P_vals = rel_by_class["P"]
                med_P = median(med_P_vals) if med_P_vals else None
                inherited = med_P is None
                if inherited:
                    med_P = median([v for vals in rel_by_class.values()
                                    for v in vals])
                inh_txt = (f"; portrait UNMEASURED on this quad -> inherits "
                           f"the overall quad median {med_P:+.4f} pct "
                           f"[INHERITED, pin P-S4-7]") if inherited else ""
                print(f"T4 class medians (I10): landscape {med_L:+.4f} pct "
                      f"over {len(rel_by_class['L'])} quad images{inh_txt}")
                # Projection 18.5 VERBATIM vs committed e1
                proj_ps = []
                land_ps = []
                for img2 in sorted(e1):
                    cls2 = "P" if img2 in PORT else "L"
                    rel2 = med_P if cls2 == "P" else med_L
                    e1_bpp = e1[img2][1]
                    ps = e1_bpp * (1.0 - rel2 / 100.0)
                    proj_ps.append(ps)
                    if cls2 == "L":
                        land_ps.append(ps)
                mean_ps = sum(proj_ps) / len(proj_ps)
                mean_sum = mean_ps * 3     # RGB corpus convention
                land_sum = 3.0 * sum(land_ps) / len(land_ps) if land_ps else 0
                t4_pass = mean_sum < 9.35 and mean_ps < 3.117
                m2 = mean_sum < 9.498 and mean_ps < 3.166
                m3 = mean_sum < 8.655 and mean_ps < 2.885
                s5_open = (not t4_pass) and mean_sum < 8.8316 and \
                    mean_ps < 2.9438
                print(f"\nT4 PROJECTION (18.5 verbatim vs committed e1): "
                      f"summed {mean_sum:.4f} vs threshold < 9.3500 | "
                      f"per-sample {mean_ps:.4f} vs threshold < 3.1170")
                print(f"T4 landscape-only projection beside (P-S4-7 "
                      f"sensitivity): summed {land_sum:.4f}")
                print(f"M2 context (<9.498/<3.166): projected "
                      f"{'PASS-shaped' if m2 else 'FAIL'} - REPORTED ONLY; "
                      f"the gates are judged solely by bench_gate.sh "
                      f"dual-unit vs real cjxl (owner standing order)")
                print(f"M3 context (<8.655/<2.885): projected "
                      f"{'PASS-shaped' if m3 else 'FAIL'} - REPORTED ONLY")
                if t4_pass:
                    print("T4 VERDICT: PASS - proceed-to-format handoff")
                elif s5_open:
                    print("T4 VERDICT: inside-M3-reach-but-short - S5 "
                          "reserve opens ONCE (pin P-S4-9), then compose "
                          "again")
                else:
                    print("T4 VERDICT: FAIL - stop-and-report with the "
                          "full honest reading above")
            else:
                print("T4 GATE INCOMPLETE (no landscape images measured)")
    else:
        fail("T4 projection: committed e1 CSV missing or unreadable "
             f"(got '{e1_path}') - pin P-S4-8 requires it verbatim")

sys.exit(0 if ok else 1)
PY
}

make_fixture() {
  # make_fixture FILE kind : 192x192 PPM. "skew" = constant left half +
  # uniform-noise right half: context classes separate the two regimes, so
  # clustered-static MUST specialize and win on NET. "homo" = CONSTANT
  # image: every residual is identically zero, so contexts carry zero
  # information and the per-cluster tables are pure overhead - pooled MUST
  # win or tie. (A noise field is NOT homogeneous in this sense: MED's
  # neighbors leak magnitude information into the resdiff contexts even
  # under iid noise, and clustering legitimately wins there - measured.)
  python3 - "$1" "$2" <<'PY'
import random, sys
path, kind = sys.argv[1], sys.argv[2]
w = h = 192
rng = random.Random(20260825)
px = bytearray()
for y in range(h):
    for x in range(w):
        if kind == "skew":
            v = 128 if x < w // 2 else rng.randrange(256)
        else:
            v = 77
        px += bytes((v, v, v))
open(path, "wb").write(b"P6\n%d %d\n255\n" % (w, h) + bytes(px))
PY
}

if [[ "$SELF_CHECK" == "1" ]]; then
  # Prove every VB rail can FAIL (a rail that cannot fire is dead code),
  # prove the ranking fixtures work LIVE in both directions, and prove the
  # corrupt injections bite on a REAL pinned image.
  TMP="$(mktemp -d)"
  trap 'rm -rf "$TMP"' EXIT
  BIN="${BUILD_DIR:-${ROOT}/../build}/prism"
  if [[ ! -x "$BIN" ]]; then echo "prism binary not found at $BIN"; exit 1; fi
  ok=1

  # Live rank fixtures: the mechanism must order correctly in BOTH
  # directions on constructed images.
  make_fixture "$TMP/skew.ppm" skew
  make_fixture "$TMP/homo.ppm" homo
  "$BIN" bench-sandbox "$TMP/skew.ppm" --profile ZFFCTRL \
      --backend B-IDEAL --keying KSHARED,KFLAT16 > "$TMP/skew.csv"
  "$BIN" bench-sandbox "$TMP/homo.ppm" --profile ZFFCTRL \
      --backend B-IDEAL --keying KSHARED,KFLAT16 > "$TMP/homo.csv"
  netof() { awk -F, -v k="$2" '/^SANDBOX,/ && $3=="ZFFCTRL" && $4=="B-IDEAL" && $5==k {print $10; exit}' "$1"; }
  sc=$(netof "$TMP/skew.csv" KFLAT16); sp=$(netof "$TMP/skew.csv" KSHARED)
  hc=$(netof "$TMP/homo.csv" KFLAT16); hp=$(netof "$TMP/homo.csv" KSHARED)
  [[ -n "$sc" && -n "$sp" && -n "$hc" && -n "$hp" ]] || \
    { echo "SELF-CHECK FAIL: rank fixture rows missing"; exit 1; }
  python3 -c "import sys; sys.exit(0 if $sc < $sp else 1)" || \
    { echo "SELF-CHECK FAIL: skew fixture must favor clustered ($sc) over pooled ($sp)"; ok=0; }
  python3 -c "import sys; sys.exit(0 if $hp <= $hc else 1)" || \
    { echo "SELF-CHECK FAIL: homo fixture must favor pooled ($hp) over clustered ($hc)"; ok=0; }

  # Fabricated-consistent fixture frame for evaluator verdict rendering:
  # one image whose rows agree with a fabricated reference, so every FAIL
  # below comes from the named mutation alone.
  REF="$TMP/ref.csv"; SBX="$TMP/sbx.csv"
  mk_good() {
    cat > "$REF" <<'EOF'
IDEAL,image,predictor,v0_bytes,v2_bytes,coarse_shared,coarse_class16,coarse_ctx343,fine_shared,fine_class16,fine_ctx343,val_shared,val_class16,val_ctx343
IDEAL,kodim01.ppm,med,584218,546852,4722327.862,4398985.675,4382483.959,4622834.334,4091650.433,4049089.745,4621241.314,4089773.496,4025422.583
EOF
    cat > "$SBX" <<'EOF'
SANDBOX,kodim01.ppm,ZFFCTRL,B-ADAPT,KPROD,546852,0,0,0,546852,1,1,0.000,0.0000,0.0000,-6.4042
BRACKET,kodim01.ppm,584218,546852,4622834.334,4091650.433,4049089.745,4621241.314,4089773.496,4025422.583
SANDBOX,kodim01.ppm,ZFFCTRL,B-IDEAL,KSHARED,577854,390,0,0,578244,1,1,4622834.334,4622834.334,-5.7841,28.8183
SANDBOX,kodim01.ppm,ZFFCTRL,B-IDEAL,KFLAT16,511456,2814,0,0,514270,1,1,4091650.433,4091650.433,-5.9632,0.0000
SANDBOX,kodim01.ppm,ZFFCTRL,B-IDEAL,KFLAT343,506136,51609,0,0,557745,1,1,4049089.745,4049089.745,-4.5561,0.0000
SANDBOX,kodim01.ppm,ZFFCTRL,B-RANS,KFLAT16,511600,2814,0,0,514414,1,1,4091650.433,4091650.433,-5.9582,0.0000
SANDBOX,kodim01.ppm,ZFFCTRL,B-BAC,KFLAT16,511520,2814,0,0,514334,1,1,4091650.433,4091650.433,-5.9602,0.0000
CORRUPT,kodim01.ppm,table,1,0,0.0000
CORRUPT,kodim01.ppm,trunc,1,0,0.0000
CORRUPT,kodim01.ppm,content,1,1,0.0000
EOF
  }
  # 1. The consistent frame must PASS (verdicts are not vacuous).
  mk_good
  if ! evaluate "$SBX" "$REF" "$TMP/skew.csv" "$TMP/homo.csv" \
      > "$TMP/good.out" 2>&1; then
    echo "SELF-CHECK FAIL: evaluator rejected a consistent frame"; ok=0
  fi
  grep -q "VB-anchor-adapt OK" "$TMP/good.out" || \
    { echo "SELF-CHECK FAIL: no anchor-adapt OK verdict"; ok=0; }
  grep -q "VB-rank OK" "$TMP/good.out" || \
    { echo "SELF-CHECK FAIL: no rank OK verdict"; ok=0; }
  # 2. Anchor drift: one byte off in the B-ADAPT control must fail.
  mk_good; sed -i 's/^SANDBOX,kodim01.ppm,ZFFCTRL,B-ADAPT,KPROD,546852,/SANDBOX,kodim01.ppm,ZFFCTRL,B-ADAPT,KPROD,546853,/' "$SBX"
  if evaluate "$SBX" "$REF" "" "" > "$TMP/a.out" 2>&1; then
    echo "SELF-CHECK FAIL: anchor-adapt accepted a drifted control"; ok=0
  fi
  grep -q "VB FAIL (anchor-adapt" "$TMP/a.out" || \
    { echo "SELF-CHECK FAIL: no anchor-adapt FAIL verdict"; ok=0; }
  # 3. Anchor drift on the ideal bracket (third decimal) must fail.
  mk_good; sed -i 's/4049089\.745,4621241/4049089.746,4621241/' "$SBX"
  if evaluate "$SBX" "$REF" "" "" > "$TMP/b.out" 2>&1; then
    echo "SELF-CHECK FAIL: anchor-ideal accepted a drifted bracket"; ok=0
  fi
  grep -q "VB FAIL (anchor-ideal" "$TMP/b.out" || \
    { echo "SELF-CHECK FAIL: no anchor-ideal FAIL verdict"; ok=0; }
  # 4. A fidelity-violating coder stub must fail the +0.50 pct bound.
  mk_good; sed -i 's/,B-RANS,KFLAT16,511600,/,B-RANS,KFLAT16,522200,/' "$SBX"
  if evaluate "$SBX" "$REF" "" "" > "$TMP/c.out" 2>&1; then
    echo "SELF-CHECK FAIL: fidelity accepted a coder 2 pct over ideal"; ok=0
  fi
  grep -q "VB FAIL (fidelity" "$TMP/c.out" || \
    { echo "SELF-CHECK FAIL: no fidelity FAIL verdict"; ok=0; }
  # 5. A double-count disagreement must fail.
  mk_good; sed -i 's/^SANDBOX,kodim01.ppm,ZFFCTRL,B-BAC,KFLAT16,511520,2814,0,0,514334,1,1/SANDBOX,kodim01.ppm,ZFFCTRL,B-BAC,KFLAT16,511520,2814,0,0,514334,0,1/' "$SBX"
  if evaluate "$SBX" "$REF" "" "" > "$TMP/d.out" 2>&1; then
    echo "SELF-CHECK FAIL: net-audit accepted a double-count mismatch"; ok=0
  fi
  grep -q "VB-net-audit FAIL\|net-audit:" "$TMP/d.out" || \
    { echo "SELF-CHECK FAIL: no net-audit FAIL verdict"; ok=0; }
  # 6. Silent corruption must fail the rail.
  mk_good; sed -i 's/^CORRUPT,kodim01.ppm,content,1,1,0.0000/CORRUPT,kodim01.ppm,content,0,0,0.5000/' "$SBX"
  if evaluate "$SBX" "$REF" "" "" > "$TMP/e.out" 2>&1; then
    echo "SELF-CHECK FAIL: corrupt rail accepted a silent pass"; ok=0
  fi
  grep -q "passed silently" "$TMP/e.out" || \
    { echo "SELF-CHECK FAIL: no corrupt FAIL verdict"; ok=0; }
  # 7. Flipped rank verdicts must fail both ways.
  if evaluate "$SBX" "$REF" "$TMP/homo.csv" "$TMP/skew.csv" \
      > "$TMP/f.out" 2>&1; then
    echo "SELF-CHECK FAIL: rank accepted flipped fixtures"; ok=0
  fi
  grep -q "rank skew fixture" "$TMP/f.out" && \
    grep -q "rank homo fixture" "$TMP/f.out" || \
    { echo "SELF-CHECK FAIL: rank FAIL verdicts missing"; ok=0; }
  # 8. An uncovered image must fail loudly (anchors must span the run).
  mk_good; sed -i 's/kodim01\.ppm/kodim99.ppm/g' "$SBX"
  if evaluate "$SBX" "$REF" "" "" > "$TMP/g.out" 2>&1; then
    echo "SELF-CHECK FAIL: uncovered image slipped through the anchors"; ok=0
  fi
  grep -q "not covered" "$TMP/g.out" || \
    { echo "SELF-CHECK FAIL: no coverage FAIL verdict"; ok=0; }
  # 9. Corrupt injections must bite LIVE on a real pinned image.
  REAL_IMG="${ROOT}/../obsidian/benchmarks/data/kodak/kodim05.ppm"
  WANT="$(grep ' kodim05.ppm$' "${ROOT}/benchmarks/data/kodak.sha256" | awk '{print $1}')"
  GOT="$(sha256sum "$REAL_IMG" | awk '{print $1}')"
  [[ "$WANT" == "$GOT" ]] || { echo "SELF-CHECK FAIL: kodim05 pin mismatch"; exit 1; }
  "$BIN" bench-sandbox "$REAL_IMG" --profile ZFFCTRL --keying KFLAT16 \
      --backend B-RANS --inject table,trunc,content > "$TMP/inj.txt"
  ndetected=$(awk -F, '/^CORRUPT,/ && $4==1' "$TMP/inj.txt" | wc -l)
  [[ "$ndetected" == "3" ]] || \
    { echo "SELF-CHECK FAIL: live injections did not all hard-detect ($ndetected/3)"; ok=0; }
  # 10. Determinism on a real image: identical invocations, identical bytes.
  "$BIN" bench-sandbox "$REAL_IMG" --profile ZFFCTRL --keying KFLAT16 \
      --backend B-RANS > "$TMP/det1.txt"
  "$BIN" bench-sandbox "$REAL_IMG" --profile ZFFCTRL --keying KFLAT16 \
      --backend B-RANS > "$TMP/det2.txt"
  cmp -s "$TMP/det1.txt" "$TMP/det2.txt" || \
    { echo "SELF-CHECK FAIL: bench-sandbox is nondeterministic"; ok=0; }

  [[ "$ok" == "1" ]] && echo "SANDBOX SELF-CHECK PASS: ranking both ways live, all six VB rails demonstrably fail on mutations, injections bite, determinism holds"
  [[ "$ok" == "1" ]] || exit 1
  exit 0
fi

if [[ "$SELF_CHECK_V1" == "1" ]]; then
  # V1-mode failability: the evaluator must reject a consistent frame only
  # when the named mutation is applied (fidelity violation, NET identity
  # break, silent round-trip failure, oracle freebie leaking into NET).
  TMP="$(mktemp -d)"
  trap 'rm -rf "$TMP"' EXIT
  ok=1

  REF="$TMP/ref.csv"; SBX="$TMP/sbx.csv"
  cat > "$REF" <<'EOF'
IDEAL,image,predictor,v0_bytes,v2_bytes,coarse_shared,coarse_class16,coarse_ctx343,fine_shared,fine_class16,fine_ctx343,val_shared,val_class16,val_ctx343
IDEAL,kodim01.ppm,med,584218,546852,4722327.862,4398985.675,4382483.959,4622834.334,4091650.433,4049089.745,4621241.314,4089773.496,4025422.583
EOF
  mk_good_v1() {
    cat > "$SBX" <<'EOF'
SANDBOX,kodim01.ppm,ZFFCTRL,B-ADAPT,KPROD,546852,0,0,0,546852,1,1,0.000,0.0000,0.0000,-6.4042
BRACKET,kodim01.ppm,584218,546852,4622834.334,4091650.433,4049089.745,4621241.314,4089773.496,4025422.583
SANDBOX,kodim01.ppm,ZFFCTRL,B-IDEAL,KSHARED,577854,390,0,0,578244,1,1,4622834.334,4622834.334,-5.7841,28.8183
SANDBOX,kodim01.ppm,ZFFCTRL,B-IDEAL,KFLAT16,511456,2814,0,0,514270,1,1,4091650.433,4091650.433,-5.9632,0.0000
SANDBOX,kodim01.ppm,ZFFCTRL,B-IDEAL,KFLAT343,506136,51609,0,0,557745,1,1,4049089.745,4049089.745,-4.5561,0.0000
V1,kodim01.ppm,HYB-A,B-IDEAL,KGRID128,REAL,300000,600,12,0,300612,1,1,100000.000,0.000,-45.0625,0.0000,0,0
V1,kodim01.ppm,HYB-A,B-RANS,KGRID128,REAL,300900,600,12,0,301512,1,1,100000.000,0.000,-44.7617,0.0000,0,0
V1,kodim01.ppm,HYB-A,B-IDEAL,KGRID128,ORACLE,294000,600,0,0,294600,1,1,100000.000,0.000,-46.1359,0.0000,72000,0
V1,kodim01.ppm,HYB-A,B-RANS,KGRID128,ORACLE,294800,600,0,0,295400,1,1,100000.000,0.000,-45.9640,0.0000,72000,0
EOF
  }

  # 1. Consistent frame passes and produces gate verdicts.
  mk_good_v1
  if ! evaluate "$SBX" "$REF" "" "" > "$TMP/good.out" 2>&1; then
    echo "SELF-CHECK-V1 FAIL: evaluator rejected a consistent frame"; ok=0
  fi
  grep -q "VB-anchor-adapt OK" "$TMP/good.out" || \
    { echo "SELF-CHECK-V1 FAIL: no anchor verdict"; ok=0; }
  grep -q "V1 GATE" "$TMP/good.out" || \
    { echo "SELF-CHECK-V1 FAIL: no gate verdict lines"; ok=0; }
  # 2. Fidelity violation on a V1 row must fail.
  mk_good_v1
  sed -i 's/,B-RANS,KGRID128,REAL,300900,/,B-RANS,KGRID128,REAL,320000,/' "$SBX"
  if evaluate "$SBX" "$REF" "" "" > "$TMP/a.out" 2>&1; then
    echo "SELF-CHECK-V1 FAIL: fidelity accepted +6.4 pct coder"; ok=0
  fi
  grep -q "VB FAIL (fidelity" "$TMP/a.out" || \
    { echo "SELF-CHECK-V1 FAIL: no fidelity FAIL verdict"; ok=0; }
  # 3. NET identity break must fail.
  mk_good_v1
  sed -i 's/,ORACLE,294000,600,0,0,294600,/,ORACLE,294000,600,500,0,294600,/' "$SBX"
  if evaluate "$SBX" "$REF" "" "" > "$TMP/b.out" 2>&1; then
    echo "SELF-CHECK-V1 FAIL: net-audit accepted a broken identity"; ok=0
  fi
  grep -q "net-audit" "$TMP/b.out" || \
    { echo "SELF-CHECK-V1 FAIL: no net-audit FAIL verdict"; ok=0; }
  # 4. Silent round-trip failure must fail.
  mk_good_v1
  sed -i 's/B-RANS,KGRID128,REAL,300900,600,12,0,301512,1,1,/B-RANS,KGRID128,REAL,300900,600,12,0,301512,1,0,/' "$SBX"
  if evaluate "$SBX" "$REF" "" "" > "$TMP/c.out" 2>&1; then
    echo "SELF-CHECK-V1 FAIL: net-audit accepted a failed decode"; ok=0
  fi
  grep -q "net-audit" "$TMP/c.out" || \
    { echo "SELF-CHECK-V1 FAIL: no round-trip FAIL verdict"; ok=0; }
  # 5. Oracle counted-map leakage (maps>0 on an ORACLE row) must fail.
  mk_good_v1
  sed -i 's/,ORACLE,294000,600,0,0,294600,/,ORACLE,294000,600,700,0,295300,/' "$SBX"
  if evaluate "$SBX" "$REF" "" "" > "$TMP/d.out" 2>&1; then
    echo "SELF-CHECK-V1 FAIL: schema accepted oracle map bytes in NET"; ok=0
  fi
  grep -q "net-audit\|oracle" "$TMP/d.out" || \
    { echo "SELF-CHECK-V1 FAIL: no oracle-leak FAIL verdict"; ok=0; }

  [[ "$ok" == "1" ]] && echo "SANDBOX SELF-CHECK-V1 PASS: consistent frame green, fidelity/NET/round-trip/oracle-schema mutations all demonstrably fail"
  [[ "$ok" == "1" ]] || exit 1
  exit 0
fi

if [[ "$SELF_CHECK_S1" == "1" ]]; then
  # S1-mode failability (blueprint section 3): the evaluator must accept a
  # consistent frame and reject each named mutation; the S1 verdict must be
  # reachable in BOTH directions from fabricated-but-consistent numbers.
  TMP="$(mktemp -d)"
  trap 'rm -rf "$TMP"' EXIT
  ok=1

  REF="$TMP/ref.csv"; SBX="$TMP/sbx.csv"
  cat > "$REF" <<'EOF'
IDEAL,image,predictor,v0_bytes,v2_bytes,coarse_shared,coarse_class16,coarse_ctx343,fine_shared,fine_class16,fine_ctx343,val_shared,val_class16,val_ctx343
IDEAL,kodim01.ppm,med,584218,546852,4722327.862,4398985.675,4382483.959,4622834.334,4091650.433,4049089.745,4621241.314,4089773.496,4025422.583
EOF
  mk_good_s1() {
    cat > "$SBX" <<'EOF'
SANDBOX,kodim01.ppm,ZFFCTRL,B-ADAPT,KPROD,546852,0,0,0,546852,1,1,0.000,0.000,0.0000,-6.4042
BRACKET,kodim01.ppm,584218,546852,4622834.334,4091650.433,4049089.745,4621241.314,4089773.496,4025422.583
SANDBOX,kodim01.ppm,ZFFCTRL,B-IDEAL,KSHARED,577854,390,0,0,578244,1,1,4622834.334,4622834.334,-5.7841,28.8183
SANDBOX,kodim01.ppm,ZFFCTRL,B-IDEAL,KFLAT16,511456,2814,0,0,514270,1,1,4091650.433,4091650.433,-5.9632,0.0000
SANDBOX,kodim01.ppm,ZFFCTRL,B-IDEAL,KFLAT343,506136,51609,0,0,557745,1,1,4049089.745,4049089.745,-4.5561,0.0000
S1,kodim01.ppm,A,MED,B-ADAPT,546852,0,0,0,546852,1,1,0.000
S1,kodim01.ppm,S,MED,B-IDEAL,511463,3007,26,0,514496,1,1,4091700.921
S1,kodim01.ppm,S,MED,B-RANS,511589,3007,26,0,514622,1,1,4091700.921
S1,kodim01.ppm,A,GAP,B-ADAPT,580928,0,0,0,580928,1,1,0.000
S1,kodim01.ppm,S,GAP,B-IDEAL,552844,2969,26,0,555839,1,1,4422744.768
S1,kodim01.ppm,S,GAP,B-RANS,552972,2969,26,0,555967,1,1,4422744.768
S1,kodim01.ppm,A,W,B-ADAPT,572107,0,0,0,572107,1,1,0.000
S1,kodim01.ppm,S,W,B-IDEAL,541316,3226,26,0,544568,1,1,4330520.448
S1,kodim01.ppm,S,W,B-RANS,541442,3226,26,0,544694,1,1,4330520.448
EOF
  }

  # 1. The consistent frame passes and renders a FAIL-direction verdict
  #    (these are real measured kodim01 numbers: both families lose).
  mk_good_s1
  if ! evaluate "$SBX" "$REF" "" "" > "$TMP/good.out" 2>&1; then
    echo "SELF-CHECK-S1 FAIL: evaluator rejected a consistent frame"; ok=0
  fi
  grep -q "VB-anchor-adapt OK" "$TMP/good.out" || \
    { echo "SELF-CHECK-S1 FAIL: no anchor verdict"; ok=0; }
  grep -q "S1 GATE READOUT" "$TMP/good.out" || \
    { echo "SELF-CHECK-S1 FAIL: no gate readout"; ok=0; }
  grep -q "S1 VERDICT: FAIL" "$TMP/good.out" || \
    { echo "SELF-CHECK-S1 FAIL: honest losing numbers must render FAIL"; ok=0; }
  # 2. PASS direction reachable: fabricate a spine winner above the bar,
  #    keeping coder fidelity inside its bound (+0.04 pct).
  mk_good_s1
  sed -i 's/S1,kodim01.ppm,S,W,B-IDEAL,541316,3226,26,0,544568,/S1,kodim01.ppm,S,W,B-IDEAL,502000,3226,26,0,505252,/' "$SBX"
  sed -i 's/S1,kodim01.ppm,S,W,B-RANS,541442,3226,26,0,544694,/S1,kodim01.ppm,S,W,B-RANS,502200,3226,26,0,505452,/' "$SBX"
  if ! evaluate "$SBX" "$REF" "" "" > "$TMP/pass.out" 2>&1; then
    echo "SELF-CHECK-S1 FAIL: evaluator rejected the fabricated winner frame"; ok=0
  fi
  grep -q "S1 VERDICT: PASS" "$TMP/pass.out" || \
    { echo "SELF-CHECK-S1 FAIL: +1.78 pct winner must render PASS"; ok=0; }
  # 3. Fidelity violation on an S1 spine row must fail.
  mk_good_s1
  sed -i 's/,B-RANS,541442,3226,/,B-RANS,560000,3226,/' "$SBX"
  if evaluate "$SBX" "$REF" "" "" > "$TMP/a.out" 2>&1; then
    echo "SELF-CHECK-S1 FAIL: fidelity accepted a +3.4 pct coder"; ok=0
  fi
  grep -q "VB FAIL (S1 fidelity" "$TMP/a.out" || \
    { echo "SELF-CHECK-S1 FAIL: no S1 fidelity FAIL verdict"; ok=0; }
  # 4. NET identity break must fail.
  mk_good_s1
  sed -i 's/,B-RANS,511589,3007,26,0,514622,/,B-RANS,511589,3007,26,0,999999,/' "$SBX"
  if evaluate "$SBX" "$REF" "" "" > "$TMP/b.out" 2>&1; then
    echo "SELF-CHECK-S1 FAIL: net-audit accepted a broken identity"; ok=0
  fi
  grep -q "net-audit(S1)" "$TMP/b.out" || \
    { echo "SELF-CHECK-S1 FAIL: no S1 net-audit FAIL verdict"; ok=0; }
  # 5. Silent round-trip failure must fail.
  mk_good_s1
  sed -i 's/S1,kodim01.ppm,S,MED,B-RANS,511589,3007,26,0,514622,1,1,/S1,kodim01.ppm,S,MED,B-RANS,511589,3007,26,0,514622,1,0,/' "$SBX"
  if evaluate "$SBX" "$REF" "" "" > "$TMP/c.out" 2>&1; then
    echo "SELF-CHECK-S1 FAIL: net-audit accepted a failed decode"; ok=0
  fi
  grep -q "net-audit(S1)" "$TMP/c.out" || \
    { echo "SELF-CHECK-S1 FAIL: no S1 round-trip FAIL verdict"; ok=0; }
  # 6. Side info leaking into a FRAME-A row must fail the schema.
  mk_good_s1
  sed -i 's/S1,kodim01.ppm,A,MED,B-ADAPT,546852,0,0,0,546852,/S1,kodim01.ppm,A,MED,B-ADAPT,546852,99,0,0,546951,/' "$SBX"
  if evaluate "$SBX" "$REF" "" "" > "$TMP/d.out" 2>&1; then
    echo "SELF-CHECK-S1 FAIL: schema accepted side info in FRAME-A"; ok=0
  fi
  grep -q "net-audit(S1)" "$TMP/d.out" || \
    { echo "SELF-CHECK-S1 FAIL: no S1 schema FAIL verdict"; ok=0; }

  [[ "$ok" == "1" ]] && echo "SANDBOX SELF-CHECK-S1 PASS: consistent frame green, S1 verdict reachable both ways, fidelity/NET/round-trip/schema mutations all demonstrably fail"
  [[ "$ok" == "1" ]] || exit 1
  exit 0
fi

if [[ "$SELF_CHECK_S3" == "1" ]]; then
  # S3-mode failability (blueprint section 3): the evaluator must accept a
  # consistent frame and reject each named mutation; the S3 verdict must be
  # reachable in BOTH directions from fabricated-but-consistent numbers.
  TMP="$(mktemp -d)"
  trap 'rm -rf "$TMP"' EXIT
  ok=1

  REF="$TMP/ref.csv"; SBX="$TMP/sbx.csv"
  cat > "$REF" <<'EOF'
IDEAL,image,predictor,v0_bytes,v2_bytes,coarse_shared,coarse_class16,coarse_ctx343,fine_shared,fine_class16,fine_ctx343,val_shared,val_class16,val_ctx343
IDEAL,kodim01.ppm,med,584218,546852,4722327.862,4398985.675,4382483.959,4622834.334,4091650.433,4049089.745,4621241.314,4089773.496,4025422.583
EOF
  mk_good_s3() {
    cat > "$SBX" <<'EOF'
SANDBOX,kodim01.ppm,ZFFCTRL,B-ADAPT,KPROD,546852,0,0,0,546852,1,1,0.000,0.000,0.0000,-6.4042
BRACKET,kodim01.ppm,584218,546852,4622834.334,4091650.433,4049089.745,4621241.314,4089773.496,4025422.583
SANDBOX,kodim01.ppm,ZFFCTRL,B-IDEAL,KSHARED,577854,390,0,0,578244,1,1,4622834.334,4622834.334,-5.7841,28.8183
SANDBOX,kodim01.ppm,ZFFCTRL,B-IDEAL,KFLAT16,511456,2814,0,0,514270,1,1,4091650.433,4091650.433,-5.9632,0.0000
SANDBOX,kodim01.ppm,ZFFCTRL,B-IDEAL,KFLAT343,506136,51609,0,0,557745,1,1,4049089.745,4049089.745,-4.5561,0.0000
S3,kodim01.ppm,S,KFLAT16,16,B-IDEAL,511463,3007,26,0,514496,1,1,4091700.921
S3,kodim01.ppm,S,KFLAT16,16,B-RANS,511589,3007,26,0,514622,1,1,4091700.921
S3,kodim01.ppm,S,SX-FULL,64,B-IDEAL,520100,11800,262,0,532162,1,1,4160810.000
S3,kodim01.ppm,S,SX-FULL,64,B-RANS,520300,11800,262,0,532362,1,1,4160810.000
S3,kodim01.ppm,S,SX-FULL,256,B-IDEAL,524900,46200,262,0,571362,1,1,4198820.000
S3,kodim01.ppm,S,SX-FULL,256,B-RANS,525100,46200,262,0,571562,1,1,4198820.000
S3,kodim01.ppm,S,SX-Q,64,B-IDEAL,518000,11800,262,0,530062,1,1,4144030.000
S3,kodim01.ppm,S,SX-Q,64,B-RANS,518200,11800,262,0,530262,1,1,4144030.000
S3,kodim01.ppm,S,SX-Q,256,B-IDEAL,522800,46200,262,0,569262,1,1,4182440.000
S3,kodim01.ppm,S,SX-Q,256,B-RANS,523000,46200,262,0,569462,1,1,4182440.000
S3,kodim01.ppm,S,SX-G,64,B-IDEAL,519000,11800,262,0,531062,1,1,4152420.000
S3,kodim01.ppm,S,SX-G,64,B-RANS,519200,11800,262,0,531262,1,1,4152420.000
S3,kodim01.ppm,S,SX-G,256,B-IDEAL,523800,46200,262,0,570262,1,1,4190430.000
S3,kodim01.ppm,S,SX-G,256,B-RANS,524000,46200,262,0,570462,1,1,4190430.000
S3,kodim01.ppm,S,SX-E,64,B-IDEAL,518600,11800,262,0,530662,1,1,4148520.000
S3,kodim01.ppm,S,SX-E,64,B-RANS,518800,11800,262,0,530862,1,1,4148520.000
S3,kodim01.ppm,S,SX-E,256,B-IDEAL,523400,46200,262,0,569862,1,1,4186530.000
S3,kodim01.ppm,S,SX-E,256,B-RANS,523600,46200,262,0,570062,1,1,4186530.000
EOF
  }

  # 1. The consistent frame passes and renders a FAIL-direction verdict
  #    (honest losing numbers: every property variant is NET-negative).
  mk_good_s3
  if ! evaluate "$SBX" "$REF" "" "" > "$TMP/good.out" 2>&1; then
    echo "SELF-CHECK-S3 FAIL: evaluator rejected a consistent frame"; ok=0
  fi
  grep -q "VB-anchor-adapt OK" "$TMP/good.out" || \
    { echo "SELF-CHECK-S3 FAIL: no anchor verdict"; ok=0; }
  grep -q "S3 GATE READOUT" "$TMP/good.out" || \
    { echo "SELF-CHECK-S3 FAIL: no gate readout"; ok=0; }
  grep -q "S3 VERDICT: FAIL" "$TMP/good.out" || \
    { echo "SELF-CHECK-S3 FAIL: honest losing numbers must render FAIL"; ok=0; }
  # 2. PASS direction reachable: fabricate a property winner above the bar,
  #    keeping coder fidelity inside its bound.
  mk_good_s3
  sed -i 's/S3,kodim01.ppm,S,SX-Q,64,B-IDEAL,518000,11800,262,0,530062,/S3,kodim01.ppm,S,SX-Q,64,B-IDEAL,493800,11800,262,0,505862,/' "$SBX"
  sed -i 's/S3,kodim01.ppm,S,SX-Q,64,B-RANS,518200,11800,262,0,530262,/S3,kodim01.ppm,S,SX-Q,64,B-RANS,494000,11800,262,0,506062,/' "$SBX"
  if ! evaluate "$SBX" "$REF" "" "" > "$TMP/pass.out" 2>&1; then
    echo "SELF-CHECK-S3 FAIL: evaluator rejected the fabricated winner frame"; ok=0
  fi
  grep -q "S3 VERDICT: PASS" "$TMP/pass.out" || \
    { echo "SELF-CHECK-S3 FAIL: +1.66 pct winner must render PASS"; ok=0; }
  # 3. Fidelity violation on an S3 row must fail (+2.6 pct coder).
  mk_good_s3
  sed -i 's/,SX-Q,64,B-RANS,518200,11800,/,SX-Q,64,B-RANS,532000,11800,/' "$SBX"
  if evaluate "$SBX" "$REF" "" "" > "$TMP/a.out" 2>&1; then
    echo "SELF-CHECK-S3 FAIL: fidelity accepted a +2.7 pct coder"; ok=0
  fi
  grep -q "VB FAIL (S3 fidelity" "$TMP/a.out" || \
    { echo "SELF-CHECK-S3 FAIL: no S3 fidelity FAIL verdict"; ok=0; }
  # 4. NET identity break must fail.
  mk_good_s3
  sed -i 's/S3,kodim01.ppm,S,KFLAT16,16,B-RANS,511589,3007,26,0,514622,/S3,kodim01.ppm,S,KFLAT16,16,B-RANS,511589,3007,26,0,999999,/' "$SBX"
  if evaluate "$SBX" "$REF" "" "" > "$TMP/b.out" 2>&1; then
    echo "SELF-CHECK-S3 FAIL: net-audit accepted a broken identity"; ok=0
  fi
  grep -q "net-audit(S3)" "$TMP/b.out" || \
    { echo "SELF-CHECK-S3 FAIL: no S3 net-audit FAIL verdict"; ok=0; }
  # 5. Silent round-trip failure must fail.
  mk_good_s3
  sed -i 's/S3,kodim01.ppm,S,SX-FULL,64,B-RANS,520300,11800,262,0,532362,1,1,/S3,kodim01.ppm,S,SX-FULL,64,B-RANS,520300,11800,262,0,532362,1,0,/' "$SBX"
  if evaluate "$SBX" "$REF" "" "" > "$TMP/c.out" 2>&1; then
    echo "SELF-CHECK-S3 FAIL: net-audit accepted a failed decode"; ok=0
  fi
  grep -q "net-audit(S3)" "$TMP/c.out" || \
    { echo "SELF-CHECK-S3 FAIL: no S3 round-trip FAIL verdict"; ok=0; }
  # 6. A nonzero tree column must fail the schema (NO trees anywhere in S3).
  mk_good_s3
  sed -i 's/S3,kodim01.ppm,S,SX-FULL,64,B-RANS,520300,11800,262,0,532362,1,1,/S3,kodim01.ppm,S,SX-FULL,64,B-RANS,520300,11800,262,99,532461,1,1,/' "$SBX"
  if evaluate "$SBX" "$REF" "" "" > "$TMP/d.out" 2>&1; then
    echo "SELF-CHECK-S3 FAIL: schema accepted tree bytes in an S3 row"; ok=0
  fi
  grep -q "net-audit(S3)" "$TMP/d.out" || \
    { echo "SELF-CHECK-S3 FAIL: no S3 schema FAIL verdict"; ok=0; }

  [[ "$ok" == "1" ]] && echo "SANDBOX SELF-CHECK-S3 PASS: consistent frame green, S3 verdict reachable both ways, fidelity/NET/round-trip/tree-schema mutations all demonstrably fail"
  [[ "$ok" == "1" ]] || exit 1
  exit 0
fi

if [[ "$SELF_CHECK_S4" == "1" ]]; then
  # S4-mode failability (blueprint section 3): the evaluator must accept a
  # consistent frame and reject each named mutation; the S4 verdict must be
  # reachable in BOTH directions from fabricated-but-consistent numbers
  # projected against the REAL committed e1 CSV.
  TMP="$(mktemp -d)"
  trap 'rm -rf "$TMP"' EXIT
  ok=1
  E1="${ROOT}/benchmarks/results/2026-08-25-prism-e1.csv"
  [[ -f "$E1" ]] || { echo "SELF-CHECK-S4 FAIL: committed e1 CSV missing"; exit 1; }

  REF="$TMP/ref.csv"; SBX="$TMP/sbx.csv"
  cat > "$REF" <<'EOF'
IDEAL,image,predictor,v0_bytes,v2_bytes,coarse_shared,coarse_class16,coarse_ctx343,fine_shared,fine_class16,fine_ctx343,val_shared,val_class16,val_ctx343
IDEAL,kodim01.ppm,med,584218,546852,4722327.862,4398985.675,4382483.959,4622834.334,4091650.433,4049089.745,4621241.314,4089773.496,4025422.583
EOF
  mk_good_s4() {
    cat > "$SBX" <<'EOF'
SANDBOX,kodim01.ppm,ZFFCTRL,B-ADAPT,KPROD,546852,0,0,0,546852,1,1,0.000,0.0000,0.0000,-6.4042
BRACKET,kodim01.ppm,584218,546852,4622834.334,4091650.433,4049089.745,4621241.314,4089773.496,4025422.583
SANDBOX,kodim01.ppm,ZFFCTRL,B-IDEAL,KSHARED,577854,390,0,0,578244,1,1,4622834.334,4622834.334,-5.7841,28.8183
SANDBOX,kodim01.ppm,ZFFCTRL,B-IDEAL,KFLAT16,511456,2814,0,0,514270,1,1,4091650.433,4091650.433,-5.9632,0.0000
SANDBOX,kodim01.ppm,ZFFCTRL,B-IDEAL,KFLAT343,506136,51609,0,0,557745,1,1,4049089.745,4049089.745,-4.5561,0.0000
S4,kodim01.ppm,ADAPT,ycocgr,B-ADAPT,546852,0,0,0,546852,1,1,0.000
S4,kodim01.ppm,SPINE,ycocgr,B-IDEAL,511463,3007,26,0,514496,1,1,4091700.921
S4,kodim01.ppm,SPINE,ycocgr,B-RANS,511589,3007,26,0,514622,1,1,4091700.921
S4,kodim01.ppm,ADAPT,rct-grb,B-ADAPT,546852,0,0,0,546852,1,1,0.000
S4,kodim01.ppm,SPINE,rct-grb,B-IDEAL,512100,3010,26,0,515136,1,1,4093600.000
S4,kodim01.ppm,SPINE,rct-grb,B-RANS,512230,3010,26,0,515266,1,1,4093600.000
EOF
  }

  # 1. The consistent frame passes and renders the honest stop-and-report
  #    verdict (real V1-magnitude spine margin ~ +5.89 pct projects ~9.52
  #    summed > 9.35).
  mk_good_s4
  if ! evaluate "$SBX" "$REF" "" "" "$E1" > "$TMP/good.out" 2>&1; then
    echo "SELF-CHECK-S4 FAIL: evaluator rejected a consistent frame"; ok=0
  fi
  grep -q "VB-anchor-adapt OK" "$TMP/good.out" || \
    { echo "SELF-CHECK-S4 FAIL: no anchor verdict"; ok=0; }
  grep -q "S4 COMPOSITION READOUT" "$TMP/good.out" || \
    { echo "SELF-CHECK-S4 FAIL: no composition readout"; ok=0; }
  grep -q "INHERITED" "$TMP/good.out" || \
    { echo "SELF-CHECK-S4 FAIL: portrait inheritance marker missing"; ok=0; }
  grep -q "S4 VERDICT: FAIL - stop-and-report" "$TMP/good.out" || \
    { echo "SELF-CHECK-S4 FAIL: honest modest numbers must render stop-and-report"; ok=0; }
  # 2. PASS direction reachable: fabricate a strong spine winner (+11.63
  #    pct) keeping coder fidelity inside its bound.
  mk_good_s4
  sed -i 's/S4,kodim01.ppm,SPINE,ycocgr,B-IDEAL,511463,3007,26,0,514496,/S4,kodim01.ppm,SPINE,ycocgr,B-IDEAL,480000,3007,26,0,483033,/' "$SBX"
  sed -i 's/S4,kodim01.ppm,SPINE,ycocgr,B-RANS,511589,3007,26,0,514622,/S4,kodim01.ppm,SPINE,ycocgr,B-RANS,480200,3007,26,0,483233,/' "$SBX"
  if ! evaluate "$SBX" "$REF" "" "" "$E1" > "$TMP/pass.out" 2>&1; then
    echo "SELF-CHECK-S4 FAIL: evaluator rejected the fabricated winner frame"; ok=0
  fi
  grep -q "S4 VERDICT: PASS - proceed-to-format handoff" "$TMP/pass.out" || \
    { echo "SELF-CHECK-S4 FAIL: strong winner must render proceed-to-format PASS"; ok=0; }
  # 3. Fidelity violation on an S4 spine row must fail (+1.6 pct coder).
  mk_good_s4
  sed -i 's/,SPINE,ycocgr,B-RANS,511589,3007,/,SPINE,ycocgr,B-RANS,520000,3007,/' "$SBX"
  if evaluate "$SBX" "$REF" "" "" "$E1" > "$TMP/a.out" 2>&1; then
    echo "SELF-CHECK-S4 FAIL: fidelity accepted a +1.6 pct coder"; ok=0
  fi
  grep -q "VB FAIL (S4 fidelity" "$TMP/a.out" || \
    { echo "SELF-CHECK-S4 FAIL: no S4 fidelity FAIL verdict"; ok=0; }
  # 4. NET identity break must fail.
  mk_good_s4
  sed -i 's/,SPINE,ycocgr,B-RANS,511589,3007,26,0,514622,/,SPINE,ycocgr,B-RANS,511589,3007,26,0,999999,/' "$SBX"
  if evaluate "$SBX" "$REF" "" "" "$E1" > "$TMP/b.out" 2>&1; then
    echo "SELF-CHECK-S4 FAIL: net-audit accepted a broken identity"; ok=0
  fi
  grep -q "net-audit(S4)" "$TMP/b.out" || \
    { echo "SELF-CHECK-S4 FAIL: no S4 net-audit FAIL verdict"; ok=0; }
  # 5. Silent round-trip failure must fail.
  mk_good_s4
  sed -i 's/S4,kodim01.ppm,SPINE,ycocgr,B-RANS,511589,3007,26,0,514622,1,1,/S4,kodim01.ppm,SPINE,ycocgr,B-RANS,511589,3007,26,0,514622,1,0,/' "$SBX"
  if evaluate "$SBX" "$REF" "" "" "$E1" > "$TMP/c.out" 2>&1; then
    echo "SELF-CHECK-S4 FAIL: net-audit accepted a failed decode"; ok=0
  fi
  grep -q "net-audit(S4)" "$TMP/c.out" || \
    { echo "SELF-CHECK-S4 FAIL: no S4 round-trip FAIL verdict"; ok=0; }
  # 6. Side info leaking into an ADAPT row must fail the schema.
  mk_good_s4
  sed -i 's/S4,kodim01.ppm,ADAPT,ycocgr,B-ADAPT,546852,0,0,0,546852,/S4,kodim01.ppm,ADAPT,ycocgr,B-ADAPT,546852,99,0,0,546951,/' "$SBX"
  if evaluate "$SBX" "$REF" "" "" "$E1" > "$TMP/d.out" 2>&1; then
    echo "SELF-CHECK-S4 FAIL: schema accepted side info on ADAPT"; ok=0
  fi
  grep -q "net-audit(S4)" "$TMP/d.out" || \
    { echo "SELF-CHECK-S4 FAIL: no S4 schema FAIL verdict"; ok=0; }
  # 7. A nonzero tree column on a SPINE row must fail the schema.
  mk_good_s4
  sed -i 's/S4,kodim01.ppm,SPINE,ycocgr,B-RANS,511589,3007,26,0,514622,1,1,/S4,kodim01.ppm,SPINE,ycocgr,B-RANS,511589,3007,26,99,514721,1,1,/' "$SBX"
  if evaluate "$SBX" "$REF" "" "" "$E1" > "$TMP/e.out" 2>&1; then
    echo "SELF-CHECK-S4 FAIL: schema accepted tree bytes on SPINE"; ok=0
  fi
  grep -q "net-audit(S4)" "$TMP/e.out" || \
    { echo "SELF-CHECK-S4 FAIL: no S4 tree-schema FAIL verdict"; ok=0; }
  # 8. A missing e1 reference must fail loudly (projection needs it).
  mk_good_s4
  if evaluate "$SBX" "$REF" "" "" "$TMP/nonexistent-e1.csv" > "$TMP/f.out" 2>&1; then
    echo "SELF-CHECK-S4 FAIL: projection accepted a missing e1 CSV"; ok=0
  fi
  grep -q "committed e1 CSV missing" "$TMP/f.out" || \
    { echo "SELF-CHECK-S4 FAIL: no missing-e1 FAIL verdict"; ok=0; }

  [[ "$ok" == "1" ]] && echo "SANDBOX SELF-CHECK-S4 PASS: consistent frame green, S4 verdict reachable both ways vs the real committed e1 CSV, fidelity/NET/round-trip/schema/missing-reference mutations all demonstrably fail"
  [[ "$ok" == "1" ]] || exit 1
  exit 0
fi

if [[ "$SELF_CHECK_T0" == "1" ]]; then
  # Prove every T-rail can FAIL and the live fixtures rank BOTH ways
  # (pin P-T0-10/P-T0-11: failable --self-check-t0).
  TMP="$(mktemp -d)"
  trap 'rm -rf "$TMP"' EXIT
  BIN="${BUILD_DIR:-${ROOT}/../build}/prism"
  if [[ ! -x "$BIN" ]]; then echo "prism binary not found at $BIN"; exit 1; fi
  ok=1

  # Live synthetic fixtures (pin P-T0-10: deterministic, in-process,
  # SYNTHETIC-tagged, no anchors). homo must collapse to transmitted K=1
  # at near-zero assignment cost; skew must let fitted beat random.
  "$BIN" bench-sandbox --t0-synth homo > "$TMP/homo.csv" || ok=0
  "$BIN" bench-sandbox --t0-synth skew > "$TMP/skew.csv" || ok=0
  hkeff="$(awk -F, '/^T0,.*CB[0-9]/ {print $15; exit}' "$TMP/homo.csv")"
  hassign="$(awk -F, '/^T0,.*CB[0-9]/ {print $10; exit}' "$TMP/homo.csv")"
  [[ -n "$hkeff" && -n "$hassign" ]] || \
    { echo "SELF-CHECK-T0 FAIL: homo fixture rows missing"; ok=0; }
  python3 -c "import sys; sys.exit(0 if $hkeff == 1 else 1)" 2>/dev/null || \
    { echo "SELF-CHECK-T0 FAIL: constant image must collapse to K=1 (got keff=$hkeff)"; ok=0; }
  python3 -c "import sys; sys.exit(0 if 0 < $hassign <= 64 else 1)" 2>/dev/null || \
    { echo "SELF-CHECK-T0 FAIL: collapse must cost near-zero assignment bytes (got $hassign)"; ok=0; }
  sbest="$(awk -F, '/^T0,synth-skew,CB[0-9]/ {if ($11 < m || m == 0) m = $11} END {print m+0}' "$TMP/skew.csv")"
  srand="$(awk -F, '/^T0,synth-skew,CBRAND/ {if ($11 < m || m == 0) m = $11} END {print m+0}' "$TMP/skew.csv")"
  [[ -n "$sbest" && -n "$srand" && "$sbest" != "0" && "$srand" != "0" ]] || \
    { echo "SELF-CHECK-T0 FAIL: skew fixture rows missing"; ok=0; }
  python3 -c "import sys; sys.exit(0 if $sbest < $srand else 1)" 2>/dev/null || \
    { echo "SELF-CHECK-T0 FAIL: skewed groups must beat random assignment ($sbest vs $srand)"; ok=0; }

  # Fabricated-consistent frame for evaluator mutations (real anchor
  # numbers from the committed reference; realistic T0 magnitudes).
  REF="$TMP/ref.csv"; SBX="$TMP/sbx.csv"
  cat > "$REF" <<'EOF'
IDEAL,image,predictor,v0_bytes,v2_bytes,coarse_shared,coarse_class16,coarse_ctx343,fine_shared,fine_class16,fine_ctx343,val_shared,val_class16,val_ctx343
IDEAL,kodim01.ppm,med,584218,546852,4722327.862,4398985.675,4382483.959,4622834.334,4091650.433,4049089.745,4621241.314,4089773.496,4025422.583
EOF
  mk_good_t0() {
    cat > "$SBX" <<'EOF'
SANDBOX,kodim01.ppm,ZFFCTRL,B-ADAPT,KPROD,546852,0,0,0,546852,1,1,0.000,0.0000,0.0000,-6.4042
BRACKET,kodim01.ppm,584218,546852,4622834.334,4091650.433,4049089.745,4621241.314,4089773.496,4025422.583
SANDBOX,kodim01.ppm,ZFFCTRL,B-IDEAL,KSHARED,577854,390,0,0,578244,1,1,4622834.334,4622834.334,-5.7841,28.8183
SANDBOX,kodim01.ppm,ZFFCTRL,B-IDEAL,KFLAT16,511456,2814,0,0,514270,1,1,4091650.433,4091650.433,-5.9632,0.0000
SANDBOX,kodim01.ppm,ZFFCTRL,B-IDEAL,KFLAT343,506136,51609,0,0,557745,1,1,4049089.745,4049089.745,-4.5561,0.0000
T0,kodim01.ppm,ADAPT,NONE,B-ADAPT,546852,0,0,0,0,546852,1,1,0.000,0,-8.1120
T0,kodim01.ppm,SPINE,NONE,B-IDEAL,511463,3007,26,0,0,514496,1,1,4091700.921,16,-1.1156
T0,kodim01.ppm,SPINE,NONE,B-RANS,511589,3007,26,0,0,514622,1,1,4091700.921,16,-1.1405
T0,kodim01.ppm,CEIL,GS64,B-IDEAL,507751,248430,0,0,0,756181,1,1,4062006.866,96,-0.3818
T0,kodim01.ppm,CEIL,GS64,B-RANS,507882,248430,0,0,0,756312,1,1,4062006.866,96,-0.4077
T0,kodim01.ppm,CEIL,GS128,B-RANS,509653,62777,0,0,0,572430,1,1,4076194.857,24,-0.7578
T0,kodim01.ppm,CB1,GS64,B-IDEAL,511463,3008,0,0,12,514483,1,1,4091700.921,1,-1.1156
T0,kodim01.ppm,CB1,GS64,B-RANS,511589,3008,0,0,12,514609,1,1,4091700.921,1,-1.1405
T0,kodim01.ppm,CBRAND4,GS64,B-RANS,511464,28719,0,0,35,540218,1,1,4090699.029,4,-1.1158
TPROTO,kodim01.ppm,SBP2,1,1,1,1,1
TPROTO,kodim01.ppm,SBC1,1,1,1,1,1
TPROTO,kodim01.ppm,SBD1,1,1,1,1,1
TAMIRROR,kodim01.ppm,RANDOM,96,1
TAMIRROR,kodim01.ppm,SKEW,96,1
TZZHU,kodim01.ppm,HYB_C,3
EOF
  }

  # 1. Consistent frame passes with NON-GATING diagnostics rendered.
  mk_good_t0
  if ! evaluate "$SBX" "$REF" "" "" > "$TMP/good.out" 2>&1; then
    echo "SELF-CHECK-T0 FAIL: evaluator rejected a consistent frame"; ok=0
  fi
  grep -q "VB-anchor-adapt OK" "$TMP/good.out" || \
    { echo "SELF-CHECK-T0 FAIL: no anchor verdict"; ok=0; }
  grep -q "VB-proto-roundtrip OK" "$TMP/good.out" || \
    { echo "SELF-CHECK-T0 FAIL: no proto-roundtrip verdict"; ok=0; }
  grep -q "VB-assign-mirror OK" "$TMP/good.out" || \
    { echo "SELF-CHECK-T0 FAIL: no assign-mirror verdict"; ok=0; }
  grep -q "VB-net-audit-t OK" "$TMP/good.out" || \
    { echo "SELF-CHECK-T0 FAIL: no net-audit-t verdict"; ok=0; }
  grep -q "NON-GATING" "$TMP/good.out" || \
    { echo "SELF-CHECK-T0 FAIL: non-gating marker missing"; ok=0; }

  # 2. NET identity break (incl. the assign column) must fail.
  mk_good_t0
  sed -i 's/T0,kodim01.ppm,CB1,GS64,B-RANS,511589,3008,0,0,12,514609,/T0,kodim01.ppm,CB1,GS64,B-RANS,511589,3008,0,0,12,999999,/' "$SBX"
  if evaluate "$SBX" "$REF" "" "" > "$TMP/a.out" 2>&1; then
    echo "SELF-CHECK-T0 FAIL: net-audit-t accepted a broken identity"; ok=0
  fi
  grep -q "net-audit-t" "$TMP/a.out" || \
    { echo "SELF-CHECK-T0 FAIL: no net-audit-t FAIL verdict"; ok=0; }
  # 3. A downed serializer flag must fail proto-roundtrip.
  mk_good_t0
  sed -i 's/TPROTO,kodim01.ppm,SBC1,1,1,1,1,1/TPROTO,kodim01.ppm,SBC1,1,0,1,1,1/' "$SBX"
  if evaluate "$SBX" "$REF" "" "" > "$TMP/b.out" 2>&1; then
    echo "SELF-CHECK-T0 FAIL: proto-roundtrip accepted trunc-detect=0"; ok=0
  fi
  grep -q "proto-roundtrip" "$TMP/b.out" || \
    { echo "SELF-CHECK-T0 FAIL: no proto FAIL verdict"; ok=0; }
  # 4. Silent assignment mismatch must fail.
  mk_good_t0
  sed -i 's/TAMIRROR,kodim01.ppm,SKEW,96,1/TAMIRROR,kodim01.ppm,SKEW,96,0/' "$SBX"
  if evaluate "$SBX" "$REF" "" "" > "$TMP/c.out" 2>&1; then
    echo "SELF-CHECK-T0 FAIL: assign-mirror accepted a failed decode"; ok=0
  fi
  grep -q "assign-mirror" "$TMP/c.out" || \
    { echo "SELF-CHECK-T0 FAIL: no assign-mirror FAIL verdict"; ok=0; }
  # 5. Assignment bits on a CEILING row are schema-impossible.
  mk_good_t0
  sed -i 's/T0,kodim01.ppm,CEIL,GS64,B-RANS,507882,248430,0,0,0,756312,/T0,kodim01.ppm,CEIL,GS64,B-RANS,507882,248430,0,0,99,756411,/' "$SBX"
  if evaluate "$SBX" "$REF" "" "" > "$TMP/d.out" 2>&1; then
    echo "SELF-CHECK-T0 FAIL: schema accepted assign bits on CEIL"; ok=0
  fi
  grep -q "net-audit-t" "$TMP/d.out" || \
    { echo "SELF-CHECK-T0 FAIL: no schema FAIL verdict"; ok=0; }
  # 6. Coder-fidelity violation on a CB row (+1.6 pct) must fail.
  mk_good_t0
  sed -i 's/T0,kodim01.ppm,CB1,GS64,B-RANS,511589,/T0,kodim01.ppm,CB1,GS64,B-RANS,520000,/' "$SBX"
  sed -i 's/T0,kodim01.ppm,CB1,GS64,B-RANS,520000,3008,0,0,12,514609,/T0,kodim01.ppm,CB1,GS64,B-RANS,520000,3008,0,0,12,523020,/' "$SBX"
  if evaluate "$SBX" "$REF" "" "" > "$TMP/e.out" 2>&1; then
    echo "SELF-CHECK-T0 FAIL: fidelity accepted a +1.6 pct coder"; ok=0
  fi
  grep -q "fidelity-t" "$TMP/e.out" || \
    { echo "SELF-CHECK-T0 FAIL: no fidelity-t FAIL verdict"; ok=0; }
  # 7. Missing ZZ-HU identity wiring must fail.
  mk_good_t0
  sed -i '/^TZZHU,/d' "$SBX"
  if evaluate "$SBX" "$REF" "" "" > "$TMP/f.out" 2>&1; then
    echo "SELF-CHECK-T0 FAIL: zzhu accepted missing identity row"; ok=0
  fi
  grep -q "zzhu-identity" "$TMP/f.out" || \
    { echo "SELF-CHECK-T0 FAIL: no zzhu FAIL verdict"; ok=0; }
  # 8. Missing anchors must fail coverage.
  mk_good_t0
  sed -i '/^BRACKET,/d' "$SBX"
  if evaluate "$SBX" "$REF" "" "" > "$TMP/g.out" 2>&1; then
    echo "SELF-CHECK-T0 FAIL: coverage accepted missing BRACKET"; ok=0
  fi
  grep -q "anchor-ideal\|no BRACKET" "$TMP/g.out" || \
    { echo "SELF-CHECK-T0 FAIL: no anchor FAIL verdict"; ok=0; }

  [[ "$ok" == "1" ]] && echo "SANDBOX SELF-CHECK-T0 PASS: homo collapses to K=1 at near-zero assign cost, skew beats random live, consistent frame green with NON-GATING diagnostics, and identity/proto/assign/schema/fidelity/zzhu/coverage mutations all demonstrably fail"
  [[ "$ok" == "1" ]] || exit 1
  exit 0
fi

if [[ "$SELF_CHECK_T1" == "1" ]]; then
  # T1 failability (pins P-Q1-4/P-Q1-6/P-Q1-9): a fabricated consistent
  # frame must PASS the rails and render an honest losing T1A verdict; the
  # gate must be reachable in BOTH directions; every decomposition,
  # identity, round-trip and schema mutation must flip its named rail.
  TMP="$(mktemp -d)"
  trap 'rm -rf "$TMP"' EXIT
  ok=1
  BIN="${BUILD_DIR:-${ROOT}/../build}/prism"
  if [[ ! -x "$BIN" ]]; then echo "prism binary not found at $BIN"; exit 1; fi

  REF="$TMP/ref.csv"
  cat > "$REF" <<'EOF'
IDEAL,image,predictor,v0_bytes,v2_bytes,coarse_shared,coarse_class16,coarse_ctx343,fine_shared,fine_class16,fine_ctx343,val_shared,val_class16,val_ctx343
IDEAL,kodim01.ppm,med,584218,546852,4722327.862,4398985.675,4382483.959,4622834.334,4091650.433,4049089.745,4621241.314,4089773.496,4025422.583
EOF

  mk_good_t1() {
    cat > "$TMP/sbx.csv" <<'EOF'
SANDBOX,kodim01.ppm,ZFFCTRL,B-ADAPT,KPROD,546852,0,0,0,546852,1,1,0.000,0.000,0.0000,-6.4042
BRACKET,kodim01.ppm,584218,546852,4622834.334,4091650.433,4049089.745,4621241.314,4089773.496,4025422.583
SANDBOX,kodim01.ppm,ZFFCTRL,B-IDEAL,KSHARED,577854,390,0,0,578244,1,1,4622834.334,4622834.334,-5.7841,28.8183
SANDBOX,kodim01.ppm,ZFFCTRL,B-IDEAL,KFLAT16,511456,2814,0,0,514270,1,1,4091650.433,4091650.433,-5.9632,0.0000
SANDBOX,kodim01.ppm,ZFFCTRL,B-IDEAL,KFLAT343,506136,51609,0,0,557745,1,1,4049089.745,4049089.745,-4.5561,0.0000
T1,kodim01.ppm,ADAPT,ycocgr,NONE,B-ADAPT,546852,0,0,0,0,546852,1,1,0.000,0,-6.8898
T1,kodim01.ppm,SPINE,ycocgr,NONE,B-IDEAL,511456,2814,0,0,0,514270,1,1,4091650.433,16,0.0281
T1,kodim01.ppm,SPINE,ycocgr,NONE,B-RANS,511600,2814,0,0,0,514414,1,1,4091650.433,16,0.0000
T1,kodim01.ppm,CEIL,rct-rbg,GS64,B-IDEAL,505000,26000,0,0,0,531000,1,1,4040000.000,288,1.2900
T1,kodim01.ppm,CEIL,rct-rbg,GS64,B-RANS,505300,26000,0,0,0,531300,1,1,4040000.000,288,1.2314
T1,kodim01.ppm,CEIL,rct-rbg,GS128,B-IDEAL,500000,13000,0,0,0,513000,1,1,4000000.000,72,2.2674
T1,kodim01.ppm,CEIL,rct-rbg,GS128,B-RANS,500200,13000,0,0,0,513200,1,1,4000000.000,72,2.2283
TSUM,kodim01.ppm,CEIL@GS64,511600,2814,0,0,0,514414,505300,26000,0,0,0,531300,1.2314,-3.2827,1
TSUM,kodim01.ppm,CEIL@GS128,511600,2814,0,0,0,514414,500200,13000,0,0,0,513200,2.2283,0.2360,1
EOF
  }

  # 1. The consistent losing frame passes every rail and renders the
  #    honest FAIL verdict (median +0.2360 pct vs bar >= +2.00; payload
  #    gains under +4.00 => T1b stays closed).
  mk_good_t1
  if ! evaluate "$TMP/sbx.csv" "$REF" "" "" > "$TMP/good.out" 2>&1; then
    echo "SELF-CHECK-T1 FAIL: evaluator rejected a consistent frame"; ok=0
  fi
  grep -q "T1A VERDICT: FAIL" "$TMP/good.out" || \
    { echo "SELF-CHECK-T1 FAIL: losing frame must render T1A FAIL"; ok=0; }
  grep -q "T1b stays CLOSED" "$TMP/good.out" || \
    { echo "SELF-CHECK-T1 FAIL: sub-bar payload gain must keep T1b closed"; ok=0; }
  grep -q "VB-net-audit-t OK" "$TMP/good.out" || \
    { echo "SELF-CHECK-T1 FAIL: no net-audit-t OK verdict"; ok=0; }

  # 2. PASS direction reachable: lift both ceiling arms above the bar with
  #    component-consistent numbers.
  mk_good_t1
  sed -i 's/,CEIL,rct-rbg,GS64,B-IDEAL,505000,26000,0,0,0,531000,/,CEIL,rct-rbg,GS64,B-IDEAL,480000,26000,0,0,0,506000,/;' "$TMP/sbx.csv"
  sed -i 's/,CEIL,rct-rbg,GS64,B-RANS,505300,26000,0,0,0,531300,1,1,4040000.000,288,1.2314/,CEIL,rct-rbg,GS64,B-RANS,480200,26000,0,0,0,506200,1,1,4040000.000,288,6.1370/' "$TMP/sbx.csv"
  sed -i 's/,CEIL,rct-rbg,GS128,B-IDEAL,500000,13000,0,0,0,513000,/,CEIL,rct-rbg,GS128,B-IDEAL,470000,13000,0,0,0,483000,/;' "$TMP/sbx.csv"
  sed -i 's/,CEIL,rct-rbg,GS128,B-RANS,500200,13000,0,0,0,513200,1,1,4000000.000,72,2.2283/,CEIL,rct-rbg,GS128,B-RANS,470200,13000,0,0,0,483200,1,1,4000000.000,72,8.0927/' "$TMP/sbx.csv"
  sed -i 's/^TSUM,kodim01.ppm,CEIL@GS64,511600,2814,0,0,0,514414,505300,26000,0,0,0,531300,1.2314,-3.2827,1/TSUM,kodim01.ppm,CEIL@GS64,511600,2814,0,0,0,514414,480200,26000,0,0,0,506200,6.1370,1.5968,1/' "$TMP/sbx.csv"
  sed -i 's/^TSUM,kodim01.ppm,CEIL@GS128,511600,2814,0,0,0,514414,500200,13000,0,0,0,513200,2.2283,0.2360,1/TSUM,kodim01.ppm,CEIL@GS128,511600,2814,0,0,0,514414,470200,13000,0,0,0,483200,8.0927,6.0674,1/' "$TMP/sbx.csv"
  if ! evaluate "$TMP/sbx.csv" "$REF" "" "" > "$TMP/pass.out" 2>&1; then
    echo "SELF-CHECK-T1 FAIL: evaluator rejected the fabricated winner frame"; ok=0
  fi
  grep -q "T1A VERDICT: PASS" "$TMP/pass.out" || \
    { echo "SELF-CHECK-T1 FAIL: +6.06 pct ceiling must render T1A PASS"; ok=0; }

  # 3. A sole-term lie must fail the TSUM decomposition rail.
  mk_good_t1
  sed -i 's/^TSUM,kodim01.ppm,CEIL@GS64,511600,2814,0,0,0,514414,505300,26000,0,0,0,531300,1.2314,-3.2827,1/TSUM,kodim01.ppm,CEIL@GS64,511600,2814,0,0,0,514414,505300,26000,0,0,0,531300,1.2314,-3.2827,0/' "$TMP/sbx.csv"
  if evaluate "$TMP/sbx.csv" "$REF" "" "" > "$TMP/a.out" 2>&1; then
    echo "SELF-CHECK-T1 FAIL: TSUM accepted a flipped sole-term flag"; ok=0
  fi
  grep -q "decomposition rows failed" "$TMP/a.out" || \
    { echo "SELF-CHECK-T1 FAIL: no TSUM decomposition FAIL verdict"; ok=0; }

  # 4. A NET identity break on a T1 row must fail.
  mk_good_t1
  sed -i 's/,CEIL,rct-rbg,GS64,B-RANS,505300,26000,0,0,0,531300,/,CEIL,rct-rbg,GS64,B-RANS,505300,26000,0,0,0,531301,/' "$TMP/sbx.csv"
  if evaluate "$TMP/sbx.csv" "$REF" "" "" > "$TMP/b.out" 2>&1; then
    echo "SELF-CHECK-T1 FAIL: net-audit accepted a broken T1 identity"; ok=0
  fi
  grep -q "net-audit-t(T1)" "$TMP/b.out" || \
    { echo "SELF-CHECK-T1 FAIL: no T1 net-audit FAIL verdict"; ok=0; }

  # 5. A silent round-trip failure must fail.
  mk_good_t1
  sed -i 's/,CEIL,rct-rbg,GS64,B-RANS,505300,26000,0,0,0,531300,1,1,/,CEIL,rct-rbg,GS64,B-RANS,505300,26000,0,0,0,531300,1,0,/' "$TMP/sbx.csv"
  if evaluate "$TMP/sbx.csv" "$REF" "" "" > "$TMP/c.out" 2>&1; then
    echo "SELF-CHECK-T1 FAIL: net-audit accepted a failed T1 decode"; ok=0
  fi
  grep -q "net-audit-t(T1)" "$TMP/c.out" || \
    { echo "SELF-CHECK-T1 FAIL: no T1 round-trip FAIL verdict"; ok=0; }

  # 6. Assignment bytes leaking into a CEILING row must fail the schema.
  mk_good_t1
  sed -i 's/,CEIL,rct-rbg,GS64,B-RANS,505300,26000,0,0,0,531300,1,1,/,CEIL,rct-rbg,GS64,B-RANS,505300,26000,0,0,12,531312,1,1,/' "$TMP/sbx.csv"
  if evaluate "$TMP/sbx.csv" "$REF" "" "" > "$TMP/d.out" 2>&1; then
    echo "SELF-CHECK-T1 FAIL: schema accepted assignment bits in CEILING"; ok=0
  fi
  grep -q "net-audit-t(T1)" "$TMP/d.out" || \
    { echo "SELF-CHECK-T1 FAIL: no T1 schema FAIL verdict"; ok=0; }

  # 7. T1b gates reachable both ways, citing PG from the same-run t1a CSV.
  cat > "$TMP/t1a.csv" <<'EOF'
TSUM,kodim01.ppm,CEIL@GS64,511600,2814,0,0,0,514414,505300,26000,0,0,0,531300,1.2314,-3.2827,1
TSUM,kodim01.ppm,CEIL@GS128,511600,2814,0,0,0,514414,500200,13000,0,0,0,513200,2.2283,0.2360,1
EOF
  mkt1b() {
    cat > "$TMP/cbx.csv" <<'EOF'
SANDBOX,kodim01.ppm,ZFFCTRL,B-ADAPT,KPROD,546852,0,0,0,546852,1,1,0.000,0.000,0.0000,-6.4042
BRACKET,kodim01.ppm,584218,546852,4622834.334,4091650.433,4049089.745,4621241.314,4089773.496,4025422.583
SANDBOX,kodim01.ppm,ZFFCTRL,B-IDEAL,KSHARED,577854,390,0,0,578244,1,1,4622834.334,4622834.334,-5.7841,28.8183
SANDBOX,kodim01.ppm,ZFFCTRL,B-IDEAL,KFLAT16,511456,2814,0,0,514270,1,1,4091650.433,4091650.433,-5.9632,0.0000
SANDBOX,kodim01.ppm,ZFFCTRL,B-IDEAL,KFLAT343,506136,51609,0,0,557745,1,1,4049089.745,4049089.745,-4.5561,0.0000
T1,kodim01.ppm,ADAPT,ycocgr,NONE,B-ADAPT,546852,0,0,0,0,546852,1,1,0.000,0,-6.8898
T1,kodim01.ppm,SPINE,ycocgr,NONE,B-IDEAL,511456,2814,0,0,0,514270,1,1,4091650.433,16,0.0281
T1,kodim01.ppm,SPINE,ycocgr,NONE,B-RANS,511600,2814,0,0,0,514414,1,1,4091650.433,16,0.0000
T1,kodim01.ppm,CB8,rct-rbg,GS128,B-IDEAL,503400,2950,0,0,12,506362,1,1,4027000.000,1,1.6028
T1,kodim01.ppm,CB8,rct-rbg,GS128,B-RANS,505800,2950,0,0,12,508762,1,1,4027000.000,1,1.1339
TSUM,kodim01.ppm,CB8@GS128,511600,2814,0,0,0,514414,505800,2950,0,0,12,508762,1.1339,1.0990,0
EOF
  }
  mkt1b
  if ! evaluate "$TMP/cbx.csv" "$REF" "" "" "" "$TMP/t1a.csv" \
      > "$TMP/t1bfail.out" 2>&1; then
    echo "SELF-CHECK-T1 FAIL: evaluator rejected the consistent T1b frame"; ok=0
  fi
  grep -q "T1B VERDICT: FAIL" "$TMP/t1bfail.out" || \
    { echo "SELF-CHECK-T1 FAIL: +1.0990 pct below the retention bar must render T1B FAIL"; ok=0; }
  mkt1b
  sed -i 's/,CB8,rct-rbg,GS128,B-IDEAL,503400,2950,0,0,12,506362,1,1,4027000.000,1,1.6028/,CB8,rct-rbg,GS128,B-IDEAL,498000,2950,0,0,12,500962,1,1,4027000.000,1,2.6583/' "$TMP/cbx.csv"
  sed -i 's/,CB8,rct-rbg,GS128,B-RANS,505800,2950,0,0,12,508762,1,1,4027000.000,1,1.1339/,CB8,rct-rbg,GS128,B-RANS,500000,2950,0,0,12,502962,1,1,4027000.000,1,2.2690/' "$TMP/cbx.csv"
  sed -i 's/^TSUM,kodim01.ppm,CB8@GS128,511600,2814,0,0,0,514414,505800,2950,0,0,12,508762,1.1339,1.0990,0/TSUM,kodim01.ppm,CB8@GS128,511600,2814,0,0,0,514414,500000,2950,0,0,12,502962,2.2674,2.2258,0/' "$TMP/cbx.csv"
  if ! evaluate "$TMP/cbx.csv" "$REF" "" "" "" "$TMP/t1a.csv" \
      > "$TMP/t1bpass.out" 2>&1; then
    echo "SELF-CHECK-T1 FAIL: evaluator rejected the T1b winner frame"; ok=0
  fi
  grep -q "T1B VERDICT: PASS" "$TMP/t1bpass.out" || \
    { echo "SELF-CHECK-T1 FAIL: +2.2258 pct above both bars must render T1B PASS"; ok=0; }

  [[ "$ok" == "1" ]] && echo "SANDBOX SELF-CHECK-T1 PASS: consistent frame green with honest losing verdicts, T1A/T1B gates reachable both directions, decomposition/identity/round-trip/schema mutations all demonstrably fail"
  [[ "$ok" == "1" ]] || exit 1
  exit 0
fi

if [[ "$SELF_CHECK_T2A" == "1" ]]; then
  # T2a failability (pins P-Q2-6..P-Q2-8): a fabricated consistent frame
  # must pass the rails and render an honest losing T2A verdict; the
  # +0.50 bar must be reachable in BOTH directions; NET identity,
  # round-trip, schema and T2SUM decomposition mutations must each flip
  # their named rail.
  TMP="$(mktemp -d)"
  trap 'rm -rf "$TMP"' EXIT
  ok=1
  BIN="${BUILD_DIR:-${ROOT}/../build}/prism"
  if [[ ! -x "$BIN" ]]; then echo "prism binary not found at $BIN"; exit 1; fi

  REF="$TMP/ref.csv"
  cat > "$REF" <<'EOF'
IDEAL,image,predictor,v0_bytes,v2_bytes,coarse_shared,coarse_class16,coarse_ctx343,fine_shared,fine_class16,fine_ctx343,val_shared,val_class16,val_ctx343
IDEAL,kodim01.ppm,med,584218,546852,4722327.862,4398985.675,4382483.959,4622834.334,4091650.433,4049089.745,4621241.314,4089773.496,4025422.583
EOF

  mk_good_t2() {
    cat > "$TMP/sbx.csv" <<'EOF'
SANDBOX,kodim01.ppm,ZFFCTRL,B-ADAPT,KPROD,546852,0,0,0,546852,1,1,0.000,0.000,0.0000,-6.4042
BRACKET,kodim01.ppm,584218,546852,4622834.334,4091650.433,4049089.745,4621241.314,4089773.496,4025422.583
SANDBOX,kodim01.ppm,ZFFCTRL,B-IDEAL,KSHARED,577854,390,0,0,578244,1,1,4622834.334,4622834.334,-5.7841,28.8183
SANDBOX,kodim01.ppm,ZFFCTRL,B-IDEAL,KFLAT16,511456,2814,0,0,514270,1,1,4091650.433,4091650.433,-5.9632,0.0000
SANDBOX,kodim01.ppm,ZFFCTRL,B-IDEAL,KFLAT343,506136,51609,0,0,557745,1,1,4049089.745,4049089.745,-4.5561,0.0000
T1,kodim01.ppm,ADAPT,ycocgr,NONE,B-ADAPT,546852,0,0,0,0,546852,1,1,0.000,0,-6.8898
T1,kodim01.ppm,SPINE,ycocgr,NONE,B-IDEAL,511456,2814,0,0,0,514270,1,1,4091650.433,16,0.0281
T1,kodim01.ppm,SPINE,ycocgr,NONE,B-RANS,511600,2814,0,0,0,514414,1,1,4091650.433,16,0.0000
T2,kodim01.ppm,SHRUNKA,ycocgr,B-IDEAL,512300,2900,0,0,0,515200,1,1,514200.000
T2,kodim01.ppm,SHRUNKA,ycocgr,B-RANS,512500,2900,0,0,0,515400,1,1,514200.000
T2,kodim01.ppm,SHRUNKB,ycocgr,B-IDEAL,512900,2950,0,0,0,515850,1,1,514700.000
T2,kodim01.ppm,SHRUNKB,ycocgr,B-RANS,513000,2950,0,0,0,515950,1,1,514700.000
T2SUM,kodim01.ppm,SHRUNK@TW-A,511600,2814,0,0,0,514414,512500,2900,0,0,0,515400,-0.1917
T2SUM,kodim01.ppm,SHRUNK@TW-B,511600,2814,0,0,0,514414,513000,2950,0,0,0,515950,-0.2986
EOF
  }

  # 1. The consistent losing frame passes every rail and renders the
  #    honest FAIL verdict (best arm median -0.1917 pct vs bar >= +0.50).
  mk_good_t2
  if ! evaluate "$TMP/sbx.csv" "$REF" "" "" > "$TMP/good.out" 2>&1; then
    echo "SELF-CHECK-T2A FAIL: evaluator rejected a consistent frame"; ok=0
  fi
  grep -q "T2A VERDICT: FAIL" "$TMP/good.out" || \
    { echo "SELF-CHECK-T2A FAIL: losing frame must render T2A FAIL"; ok=0; }
  grep -q "flat-16 ships unchanged" "$TMP/good.out" || \
    { echo "SELF-CHECK-T2A FAIL: losing verdict must close the conditional"; ok=0; }
  grep -q "VB-net-audit-t OK" "$TMP/good.out" || \
    { echo "SELF-CHECK-T2A FAIL: no net-audit-t OK verdict"; ok=0; }

  # 2. PASS direction reachable: lift the TW-A arm above the bar with
  #    component-consistent numbers (+1.2663 pct median).
  mk_good_t2
  sed -i 's/,SHRUNKA,ycocgr,B-IDEAL,512300,2900,0,0,0,515200,/,SHRUNKA,ycocgr,B-IDEAL,505000,2900,0,0,0,507900,/;' "$TMP/sbx.csv"
  sed -i 's/,SHRUNKA,ycocgr,B-RANS,512500,2900,0,0,0,515400,1,1,514200.000/,SHRUNKA,ycocgr,B-RANS,505000,2900,0,0,0,507900,1,1,506800.000/' "$TMP/sbx.csv"
  sed -i 's/^T2SUM,kodim01.ppm,SHRUNK@TW-A,511600,2814,0,0,0,514414,512500,2900,0,0,0,515400,-0.1917/T2SUM,kodim01.ppm,SHRUNK@TW-A,511600,2814,0,0,0,514414,505000,2900,0,0,0,507900,1.2663/' "$TMP/sbx.csv"
  if ! evaluate "$TMP/sbx.csv" "$REF" "" "" > "$TMP/pass.out" 2>&1; then
    echo "SELF-CHECK-T2A FAIL: evaluator rejected the fabricated winner frame"; ok=0
  fi
  grep -q "T2A VERDICT: PASS" "$TMP/pass.out" || \
    { echo "SELF-CHECK-T2A FAIL: +1.2663 pct must render T2A PASS"; ok=0; }
  grep -q "T2b conditional OPENS" "$TMP/pass.out" || \
    { echo "SELF-CHECK-T2A FAIL: passing verdict must open the T2b conditional"; ok=0; }

  # 3. A broken T2 NET identity must fail.
  mk_good_t2
  sed -i 's/,SHRUNKA,ycocgr,B-RANS,512500,2900,0,0,0,515400,/,SHRUNKA,ycocgr,B-RANS,512500,2900,0,0,0,515401,/' "$TMP/sbx.csv"
  if evaluate "$TMP/sbx.csv" "$REF" "" "" > "$TMP/a.out" 2>&1; then
    echo "SELF-CHECK-T2A FAIL: net-audit accepted a broken T2 identity"; ok=0
  fi
  grep -q "net-audit-t(T2)" "$TMP/a.out" || \
    { echo "SELF-CHECK-T2A FAIL: no T2 net-audit FAIL verdict"; ok=0; }

  # 4. A silent round-trip failure must fail.
  mk_good_t2
  sed -i 's/,SHRUNKA,ycocgr,B-RANS,512500,2900,0,0,0,515400,1,1,/,SHRUNKA,ycocgr,B-RANS,512500,2900,0,0,0,515400,1,0,/' "$TMP/sbx.csv"
  if evaluate "$TMP/sbx.csv" "$REF" "" "" > "$TMP/b.out" 2>&1; then
    echo "SELF-CHECK-T2A FAIL: net-audit accepted a failed T2 decode"; ok=0
  fi
  grep -q "net-audit-t(T2)" "$TMP/b.out" || \
    { echo "SELF-CHECK-T2A FAIL: no T2 round-trip FAIL verdict"; ok=0; }

  # 5. Side info leaking into a SHRUNK row must fail the schema.
  mk_good_t2
  sed -i 's/,SHRUNKA,ycocgr,B-RANS,512500,2900,0,0,0,515400,1,1,/,SHRUNKA,ycocgr,B-RANS,512500,2900,12,0,0,515412,1,1,/' "$TMP/sbx.csv"
  if evaluate "$TMP/sbx.csv" "$REF" "" "" > "$TMP/c.out" 2>&1; then
    echo "SELF-CHECK-T2A FAIL: schema accepted side info in SHRUNK"; ok=0
  fi
  grep -q "net-audit-t(T2)" "$TMP/c.out" || \
    { echo "SELF-CHECK-T2A FAIL: no T2 schema FAIL verdict"; ok=0; }

  # 6. A T2SUM relpct lie must fail the decomposition rail.
  mk_good_t2
  sed -i 's/^T2SUM,kodim01.ppm,SHRUNK@TW-A,511600,2814,0,0,0,514414,512500,2900,0,0,0,515400,-0.1917/T2SUM,kodim01.ppm,SHRUNK@TW-A,511600,2814,0,0,0,514414,512500,2900,0,0,0,515400,-0.0917/' "$TMP/sbx.csv"
  if evaluate "$TMP/sbx.csv" "$REF" "" "" > "$TMP/d.out" 2>&1; then
    echo "SELF-CHECK-T2A FAIL: T2SUM accepted a relpct lie"; ok=0
  fi
  grep -q "rows failed mechanical" "$TMP/d.out" || \
    { echo "SELF-CHECK-T2A FAIL: no T2SUM decomposition FAIL verdict"; ok=0; }

  # 7. A baseline-component lie must fail the same rail.
  mk_good_t2
  sed -i 's/^T2SUM,kodim01.ppm,SHRUNK@TW-A,511600,2814,0,0,0,514414,/T2SUM,kodim01.ppm,SHRUNK@TW-A,511601,2814,0,0,0,514414,/' "$TMP/sbx.csv"
  if evaluate "$TMP/sbx.csv" "$REF" "" "" > "$TMP/e.out" 2>&1; then
    echo "SELF-CHECK-T2A FAIL: T2SUM accepted a foreign baseline"; ok=0
  fi
  grep -q "rows failed mechanical" "$TMP/e.out" || \
    { echo "SELF-CHECK-T2A FAIL: no T2SUM baseline FAIL verdict"; ok=0; }

  [[ "$ok" == "1" ]] && echo "SANDBOX SELF-CHECK-T2A PASS: consistent frame green with honest losing verdict, gate reachable both directions, identity/round-trip/schema/decomposition mutations all demonstrably fail"
  [[ "$ok" == "1" ]] || exit 1
  exit 0
fi

if [[ "$SELF_CHECK_T3" == "1" ]]; then
  # T3 failability (pins P-Q3-1..P-Q3-12): a fabricated consistent frame
  # must pass the rails and render an honest losing bar(i) verdict; the
  # +1.50 bar must be reachable in BOTH directions; NET identity,
  # round-trip, and T3CELL decomposition mutations must each flip their
  # named rail.
  TMP="$(mktemp -d)"
  trap 'rm -rf "$TMP"' EXIT
  ok=1
  BIN="${BUILD_DIR:-${ROOT}/../build}/prism"
  if [[ ! -x "$BIN" ]]; then echo "prism binary not found at $BIN"; exit 1; fi

  REF="$TMP/ref.csv"
  cat > "$REF" <<'EOF'
IDEAL,image,predictor,v0_bytes,v2_bytes,coarse_shared,coarse_class16,coarse_ctx343,fine_shared,fine_class16,fine_ctx343,val_shared,val_class16,val_ctx343
IDEAL,kodim01.ppm,med,584218,546852,4722327.862,4398985.675,4382483.959,4622834.334,4091650.433,4049089.745,4621241.314,4089773.496,4025422.583
EOF

  mk_good_t3() {
    cat > "$TMP/sbx.csv" <<'EOF'
SANDBOX,kodim01.ppm,ZFFCTRL,B-ADAPT,KPROD,546852,0,0,0,546852,1,1,0.000,0.000,0.0000,-6.4042
BRACKET,kodim01.ppm,584218,546852,4622834.334,4091650.433,4049089.745,4621241.314,4089773.496,4025422.583
SANDBOX,kodim01.ppm,ZFFCTRL,B-IDEAL,KFLAT16,511463,3007,0,0,514470,1,1,4091700.921,4091650.433,5.922,-11.9387
SANDBOX,kodim01.ppm,ZFFCTRL,B-IDEAL,KSHARED,577855,390,0,0,578245,1,1,4622837.474,4622834.334,-5.741,-1.0224
SANDBOX,kodim01.ppm,ZFFCTRL,B-IDEAL,KFLAT343,506136,51609,0,0,557745,1,1,4049089.745,4049089.745,-4.5561,0.0000
T1,kodim01.ppm,ADAPT,ycocgr,NONE,B-ADAPT,546852,0,0,0,0,546852,1,1,0.000,0,-6.8898
T1,kodim01.ppm,SPINE,ycocgr,NONE,B-IDEAL,511456,2814,0,0,0,514270,1,1,4091650.433,16,0.0281
T1,kodim01.ppm,SPINE,ycocgr,NONE,B-RANS,511600,2814,0,0,0,514414,1,1,4091650.433,16,0.0000
T3,kodim01.ppm,MED,ZFFCTRL,ycocgr,B-IDEAL,511463,3007,26,0,0,514496,1,1,4091700.921
T3,kodim01.ppm,MED,ZFFCTRL,ycocgr,B-RANS,511589,3007,26,0,0,514622,1,1,4091700.921
T3,kodim01.ppm,GAP,ZFFCTRL,ycocgr,B-IDEAL,550580,2955,26,0,0,553561,1,1,4422744.768
T3,kodim01.ppm,GAP,ZFFCTRL,ycocgr,B-RANS,550708,2955,26,0,0,553689,1,1,4422744.768
T3,kodim01.ppm,W,ZFFCTRL,ycocgr,B-IDEAL,539198,3176,26,0,0,542400,1,1,4339200.000
T3,kodim01.ppm,W,ZFFCTRL,ycocgr,B-RANS,539326,3176,26,0,0,542528,1,1,4339200.000
T3CELL,kodim01.ppm,MED,ZFFCTRL,0,511589,3007,514622
T3CELL,kodim01.ppm,GAP,ZFFCTRL,0,550708,2955,553689
T3CELL,kodim01.ppm,W,ZFFCTRL,0,539326,3176,542528
EOF
  }

  # 1. The consistent losing frame passes every rail and renders the
  #    honest FAIL verdict (GAP margin -0.7151 pct vs bar >= +1.50).
  mk_good_t3
  if ! evaluate "$TMP/sbx.csv" "$REF" "" "" > "$TMP/good.out" 2>&1; then
    echo "SELF-CHECK-T3 FAIL: evaluator rejected a consistent frame"; ok=0
  fi
  grep -q "T3 bar(i) VERDICT: FAIL" "$TMP/good.out" || \
    { echo "SELF-CHECK-T3 FAIL: losing frame must render T3 bar(i) FAIL"; ok=0; }
  grep -q "third.*final strike" "$TMP/good.out" || \
    { echo "SELF-CHECK-T3 FAIL: FAIL verdict must close B3/B5"; ok=0; }
  grep -q "VB-net-audit-t OK" "$TMP/good.out" || \
    { echo "SELF-CHECK-T3 FAIL: no net-audit-t OK verdict"; ok=0; }

  # 2. PASS direction reachable: lift GAP above the bar with
  #    component-consistent numbers (+1.8849 pct median).
  mk_good_t3
  sed -i 's/,GAP,ZFFCTRL,ycocgr,B-IDEAL,550580,2955,26,0,0,553561,/,GAP,ZFFCTRL,ycocgr,B-IDEAL,501000,2955,26,0,0,503981,/' "$TMP/sbx.csv"
  sed -i 's/,GAP,ZFFCTRL,ycocgr,B-RANS,550708,2955,26,0,0,553689,1,1,4422744.768/,GAP,ZFFCTRL,ycocgr,B-RANS,501128,2955,26,0,0,504109,1,1,4422744.768/' "$TMP/sbx.csv"
  sed -i 's/^T3CELL,kodim01.ppm,GAP,ZFFCTRL,0,550708,2955,553689/T3CELL,kodim01.ppm,GAP,ZFFCTRL,0,501128,2955,504109/' "$TMP/sbx.csv"
  if ! evaluate "$TMP/sbx.csv" "$REF" "" "" > "$TMP/pass.out" 2>&1; then
    echo "SELF-CHECK-T3 FAIL: evaluator rejected the fabricated winner frame"; ok=0
  fi
  grep -q "T3 bar(i) VERDICT: PASS" "$TMP/pass.out" || \
    { echo "SELF-CHECK-T3 FAIL: +1.8849 pct must render T3 bar(i) PASS"; ok=0; }

  # 3. A broken T3 NET identity must fail.
  mk_good_t3
  sed -i 's/,MED,ZFFCTRL,ycocgr,B-RANS,511589,3007,26,0,0,514622,/,MED,ZFFCTRL,ycocgr,B-RANS,511589,3007,26,0,0,514623,/' "$TMP/sbx.csv"
  if evaluate "$TMP/sbx.csv" "$REF" "" "" > "$TMP/a.out" 2>&1; then
    echo "SELF-CHECK-T3 FAIL: net-audit accepted a broken T3 identity"; ok=0
  fi
  grep -q "net-audit-t(T3)" "$TMP/a.out" || \
    { echo "SELF-CHECK-T3 FAIL: no T3 net-audit FAIL verdict"; ok=0; }

  # 4. A silent round-trip failure must fail.
  mk_good_t3
  sed -i 's/,MED,ZFFCTRL,ycocgr,B-RANS,511589,3007,26,0,0,514622,1,1,/,MED,ZFFCTRL,ycocgr,B-RANS,511589,3007,26,0,0,514622,1,0,/' "$TMP/sbx.csv"
  if evaluate "$TMP/sbx.csv" "$REF" "" "" > "$TMP/b.out" 2>&1; then
    echo "SELF-CHECK-T3 FAIL: net-audit accepted a failed T3 decode"; ok=0
  fi
  grep -q "net-audit-t(T3)" "$TMP/b.out" || \
    { echo "SELF-CHECK-T3 FAIL: no T3 round-trip FAIL verdict"; ok=0; }

  # 5. A T3CELL lie must fail the decomposition rail.
  mk_good_t3
  sed -i 's/^T3CELL,kodim01.ppm,GAP,ZFFCTRL,0,550708,2955,553689/T3CELL,kodim01.ppm,GAP,ZFFCTRL,0,550708,2955,999999/' "$TMP/sbx.csv"
  if evaluate "$TMP/sbx.csv" "$REF" "" "" > "$TMP/d.out" 2>&1; then
    echo "SELF-CHECK-T3 FAIL: T3CELL accepted a decomposition lie"; ok=0
  fi
  grep -q "T3CELL.*don't match" "$TMP/d.out" || \
    { echo "SELF-CHECK-T3 FAIL: no T3CELL decomposition FAIL verdict"; ok=0; }

  [[ "$ok" == "1" ]] && echo "SANDBOX SELF-CHECK-T3 PASS: consistent frame green with honest losing verdict, bar(i) reachable both directions, identity/round-trip/decomposition mutations all demonstrably fail"
  [[ "$ok" == "1" ]] || exit 1
  exit 0
fi

BIN="${BUILD_DIR:-${ROOT}/../build}/prism"
if [[ ! -x "$BIN" ]]; then
  echo "prism binary not found at $BIN (pass --build-dir or build first)"; exit 1
fi

if [[ ${#IMAGES[@]} -eq 0 && "$SELF_CHECK_T0" != "1" && "$SELF_CHECK_T3" != "1" && "$MODE_T4" != "1" && "$SELF_CHECK_T4" != "1" ]]; then
  echo "no --image given"; exit 2
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

# ----- T-series slice Q0: the T0 instrument smoke (pins P-T0-10/P-T0-11) -----
if [[ "$MODE_T0" == "1" ]]; then
  STAMP=$(date +%Y-%m-%d)
  OUT_CSV="${ROOT}/benchmarks/results/${STAMP}-sandbox-t0.csv"
  RAW1="$(mktemp)"; RAW2="$(mktemp)"
  trap 'rm -f "$RAW1" "$RAW2"' EXIT

  T0=$(date +%s)
  "$BIN" bench-sandbox --t0 "${IMAGES[@]}" > "$RAW1"
  T1=$(date +%s)
  "$BIN" bench-sandbox --t0 "${IMAGES[@]}" > "$RAW2"
  T2=$(date +%s)
  if ! cmp -s "$RAW1" "$RAW2"; then
    echo "VB-determinism FAIL: t0 re-run diverged"; diff "$RAW1" "$RAW2" | head; exit 1
  fi
  echo "VB-determinism OK (byte-identical re-run)"

  grep -E '^(SANDBOX|BRACKET|T0|TPROTO|TAMIRROR|TZZHU),' "$RAW1" > "$OUT_CSV"

  # Wall-clock accounting per the A3 precedent (pin P-T0-13's structural
  # note): multiplier logged, no measurement depends on it.
  T3=$(date +%s)
  "$BIN" bench-ideal "${IMAGES[@]}" > /dev/null
  T4=$(date +%s)
  SB=$((T2 - T0)); ID=$((T4 - T3))
  echo "== timing: sandbox-t0 ${SB}s (incl. determinism re-run), bench-ideal ${ID}s =="
  if [[ "$ID" -gt 0 ]]; then
    python3 -c "print(f'wall-clock guard: sandbox-t0/re-run = {$SB/$ID:.2f}x bench-ideal (A3 precedent: structural deviation recorded, no measurement depends on it)')"
  fi

  echo "== sandbox T0 results (${OUT_CSV}) =="
  cat "$OUT_CSV"

  REF_CSV="${ROOT}/benchmarks/results/2026-08-25-ideal-probe-e0-eval.csv"
  if [[ ! -f "$REF_CSV" ]]; then
    echo "VB-anchor FAIL: committed reference ${REF_CSV} missing"; exit 1
  fi
  # Rail integrity flips the exit code; every T0 diagnostic is non-gating.
  if ! evaluate "$OUT_CSV" "$REF_CSV" "" ""; then
    echo "SANDBOX GATE FAIL (rail integrity)"
    exit 1
  fi
  echo "SANDBOX GATE PASS (all VB rails + T-rails green; T0 diagnostics above are NON-GATING, quad verdicts start at T1a)"
  exit 0
fi

# ----- V-series slice 2: the V1 measurement flow (pins V-P6/V-P7) -----
if [[ "$MODE_V1" == "1" ]]; then
  STAMP=$(date +%Y-%m-%d)
  OUT_CSV="${ROOT}/benchmarks/results/${STAMP}-sandbox-v1.csv"
  RAW1="$(mktemp)"; RAW2="$(mktemp)"
  RANK_SKEW="$(mktemp)"; RANK_HOMO="$(mktemp)"
  trap 'rm -f "$RAW1" "$RAW2" "$RANK_SKEW" "$RANK_HOMO" \
        "$RANK_SKEW.img" "$RANK_HOMO.img"' EXIT
  make_fixture "${RANK_SKEW}.img" skew
  make_fixture "${RANK_HOMO}.img" homo
  # Ranking fixtures stay LIVE in both directions (same engines code them).
  "$BIN" bench-sandbox "${RANK_SKEW}.img" --profile ZFFCTRL \
    --backend B-IDEAL --keying KSHARED,KFLAT16 > "$RANK_SKEW"
  "$BIN" bench-sandbox "${RANK_HOMO}.img" --profile ZFFCTRL \
    --backend B-IDEAL --keying KSHARED,KFLAT16 > "$RANK_HOMO"

  T0=$(date +%s)
  "$BIN" bench-sandbox --v1 "${IMAGES[@]}" > "$RAW1"
  T1=$(date +%s)
  "$BIN" bench-sandbox --v1 "${IMAGES[@]}" > "$RAW2"
  T2=$(date +%s)
  if ! cmp -s "$RAW1" "$RAW2"; then
    echo "VB-determinism FAIL: quad re-run diverged"; diff "$RAW1" "$RAW2" | head; exit 1
  fi
  echo "VB-determinism OK (byte-identical re-run)"

  grep -E '^(SANDBOX|BRACKET|V1),' "$RAW1" > "$OUT_CSV"

  # Wall-clock accounting per pin V-P8 (structural deviation, amendment A3
  # precedent): ratio logged, no measurement depends on it.
  T3=$(date +%s)
  "$BIN" bench-ideal "${IMAGES[@]}" > /dev/null
  T4=$(date +%s)
  SB=$((T2 - T0)); ID=$((T4 - T3))
  echo "== timing: sandbox-v1 quad ${SB}s (incl. determinism re-run), bench-ideal quad ${ID}s =="
  if [[ "$ID" -gt 0 ]]; then
    python3 -c "print(f'wall-clock guard: sandbox-v1/re-run = {$SB/$ID:.2f}x bench-ideal (V-P8: structural deviation recorded, no measurement depends on it)')"
  fi

  echo "== sandbox V1 results (${OUT_CSV}) =="
  cat "$OUT_CSV"

  REF_CSV="${ROOT}/benchmarks/results/2026-08-25-ideal-probe-e0-eval.csv"
  if [[ ! -f "$REF_CSV" ]]; then
    echo "VB-anchor FAIL: committed reference ${REF_CSV} missing"; exit 1
  fi
  # Gate verdicts NEVER flip the exit code; VB rail-integrity failures DO.
  if ! evaluate "$OUT_CSV" "$REF_CSV" "$RANK_SKEW" "$RANK_HOMO"; then
    echo "SANDBOX GATE FAIL (rail integrity)"
    exit 1
  fi
  echo "SANDBOX GATE PASS (all VB rails green; gate verdicts above are measured outcomes, not rail failures)"
  exit 0
fi

if [[ "$MODE_S1" == "1" ]]; then
  # S-series slice P1 (spec addendum 19; pins P-S1-10/P-S1-11): dual-frame
  # predictor sweep on sha-pinned images; dated one-file CSV; determinism
  # re-run; rank fixtures stay LIVE; anchors re-emitted inside every CSV.
  STAMP=$(date +%Y-%m-%d)
  OUT_CSV="${ROOT}/benchmarks/results/${STAMP}-sandbox-s1.csv"
  RAW1="$(mktemp)"; RAW2="$(mktemp)"
  RANK_SKEW="$(mktemp)"; RANK_HOMO="$(mktemp)"
  trap 'rm -f "$RAW1" "$RAW2" "$RANK_SKEW" "$RANK_HOMO" \
        "$RANK_SKEW.img" "$RANK_HOMO.img"' EXIT
  make_fixture "${RANK_SKEW}.img" skew
  make_fixture "${RANK_HOMO}.img" homo
  "$BIN" bench-sandbox "${RANK_SKEW}.img" --profile ZFFCTRL \
    --backend B-IDEAL --keying KSHARED,KFLAT16 > "$RANK_SKEW"
  "$BIN" bench-sandbox "${RANK_HOMO}.img" --profile ZFFCTRL \
    --backend B-IDEAL --keying KSHARED,KFLAT16 > "$RANK_HOMO"

  T0=$(date +%s)
  "$BIN" bench-sandbox --s1 "${IMAGES[@]}" > "$RAW1"
  T1=$(date +%s)
  "$BIN" bench-sandbox --s1 "${IMAGES[@]}" > "$RAW2"
  T2=$(date +%s)
  if ! cmp -s "$RAW1" "$RAW2"; then
    echo "VB-determinism FAIL: quad re-run diverged"; diff "$RAW1" "$RAW2" | head; exit 1
  fi
  echo "VB-determinism OK (byte-identical re-run)"

  grep -E '^(SANDBOX|BRACKET|S1),' "$RAW1" > "$OUT_CSV"

  # Wall-clock accounting per pin P-S1-11 (A3 precedent): structural
  # multipliers logged beside every phase; NO measurement depends on it.
  T3=$(date +%s)
  "$BIN" bench-ideal "${IMAGES[@]}" > /dev/null
  T4=$(date +%s)
  SB=$((T2 - T0)); ID=$((T4 - T3))
  echo "== timing: sandbox-s1 quad ${SB}s (incl. determinism re-run), bench-ideal quad ${ID}s =="
  if [[ "$ID" -gt 0 ]]; then
    python3 -c "print(f'wall-clock guard: sandbox-s1/re-run = {$SB/$ID:.2f}x bench-ideal (P-S1-11: structural deviation recorded, no measurement depends on it)')"
  fi

  echo "== sandbox S1 results (${OUT_CSV}) =="
  cat "$OUT_CSV"

  REF_CSV="${ROOT}/benchmarks/results/2026-08-25-ideal-probe-e0-eval.csv"
  if [[ ! -f "$REF_CSV" ]]; then
    echo "VB-anchor FAIL: committed reference ${REF_CSV} missing"; exit 1
  fi
  # Gate verdicts NEVER flip the exit code; VB rail-integrity failures DO.
  if ! evaluate "$OUT_CSV" "$REF_CSV" "$RANK_SKEW" "$RANK_HOMO"; then
    echo "SANDBOX GATE FAIL (rail integrity)"
    exit 1
  fi
  echo "SANDBOX GATE PASS (all VB rails green; S1 verdict above is a measured outcome, not a rail failure)"
  exit 0
fi

if [[ "$MODE_S3" == "1" ]]; then
  # S-series slice P2 (spec addendum 19.4/19.5; pins P-S3-10/P-S3-12):
  # extended causal properties sweep on sha-pinned images; dated one-file
  # CSV; determinism re-run; rank fixtures stay LIVE; anchors re-emitted
  # inside every CSV.
  STAMP=$(date +%Y-%m-%d)
  OUT_CSV="${ROOT}/benchmarks/results/${STAMP}-sandbox-s3.csv"
  RAW1="$(mktemp)"; RAW2="$(mktemp)"
  RANK_SKEW="$(mktemp)"; RANK_HOMO="$(mktemp)"
  trap 'rm -f "$RAW1" "$RAW2" "$RANK_SKEW" "$RANK_HOMO" \
        "$RANK_SKEW.img" "$RANK_HOMO.img"' EXIT
  make_fixture "${RANK_SKEW}.img" skew
  make_fixture "${RANK_HOMO}.img" homo
  "$BIN" bench-sandbox "${RANK_SKEW}.img" --profile ZFFCTRL \
    --backend B-IDEAL --keying KSHARED,KFLAT16 > "$RANK_SKEW"
  "$BIN" bench-sandbox "${RANK_HOMO}.img" --profile ZFFCTRL \
    --backend B-IDEAL --keying KSHARED,KFLAT16 > "$RANK_HOMO"

  T0=$(date +%s)
  "$BIN" bench-sandbox --s3 "${IMAGES[@]}" > "$RAW1"
  T1=$(date +%s)
  "$BIN" bench-sandbox --s3 "${IMAGES[@]}" > "$RAW2"
  T2=$(date +%s)
  if ! cmp -s "$RAW1" "$RAW2"; then
    echo "VB-determinism FAIL: quad re-run diverged"; diff "$RAW1" "$RAW2" | head; exit 1
  fi
  echo "VB-determinism OK (byte-identical re-run)"

  grep -E '^(SANDBOX|BRACKET|S3),' "$RAW1" > "$OUT_CSV"

  # Wall-clock accounting per pin P-S3-12 (A3 precedent): structural
  # multipliers logged beside every phase; NO measurement depends on it.
  T3=$(date +%s)
  "$BIN" bench-ideal "${IMAGES[@]}" > /dev/null
  T4=$(date +%s)
  SB=$((T2 - T0)); ID=$((T4 - T3))
  echo "== timing: sandbox-s3 quad ${SB}s (incl. determinism re-run), bench-ideal quad ${ID}s =="
  if [[ "$ID" -gt 0 ]]; then
    python3 -c "print(f'wall-clock guard: sandbox-s3/re-run = {$SB/$ID:.2f}x bench-ideal (P-S3-12: structural deviation recorded, no measurement depends on it)')"
  fi

  echo "== sandbox S3 results (${OUT_CSV}) =="
  cat "$OUT_CSV"

  REF_CSV="${ROOT}/benchmarks/results/2026-08-25-ideal-probe-e0-eval.csv"
  if [[ ! -f "$REF_CSV" ]]; then
    echo "VB-anchor FAIL: committed reference ${REF_CSV} missing"; exit 1
  fi
  # Gate verdicts NEVER flip the exit code; VB rail-integrity failures DO.
  if ! evaluate "$OUT_CSV" "$REF_CSV" "$RANK_SKEW" "$RANK_HOMO"; then
    echo "SANDBOX GATE FAIL (rail integrity)"
    exit 1
  fi
  echo "SANDBOX GATE PASS (all VB rails green; S3 verdict above is a measured outcome, not a rail failure)"
  exit 0
fi

if [[ "$MODE_S4" == "1" ]]; then
  # S-series slice P3 (spec addendum 19.5 S4; pins P-S4-11/P-S4-12):
  # composition + projection on sha-pinned images; dated one-file CSV;
  # determinism re-run; rank fixtures stay LIVE; anchors re-emitted inside
  # every CSV; projection reads the committed e1 CSV verbatim.
  STAMP=$(date +%Y-%m-%d)
  OUT_CSV="${ROOT}/benchmarks/results/${STAMP}-sandbox-s4.csv"
  E1_CSV="${ROOT}/benchmarks/results/2026-08-25-prism-e1.csv"
  RAW1="$(mktemp)"; RAW2="$(mktemp)"
  RANK_SKEW="$(mktemp)"; RANK_HOMO="$(mktemp)"
  trap 'rm -f "$RAW1" "$RAW2" "$RANK_SKEW" "$RANK_HOMO" \
        "$RANK_SKEW.img" "$RANK_HOMO.img"' EXIT
  make_fixture "${RANK_SKEW}.img" skew
  make_fixture "${RANK_HOMO}.img" homo
  "$BIN" bench-sandbox "${RANK_SKEW}.img" --profile ZFFCTRL \
    --backend B-IDEAL --keying KSHARED,KFLAT16 > "$RANK_SKEW"
  "$BIN" bench-sandbox "${RANK_HOMO}.img" --profile ZFFCTRL \
    --backend B-IDEAL --keying KSHARED,KFLAT16 > "$RANK_HOMO"

  T0=$(date +%s)
  "$BIN" bench-sandbox --s4 "${IMAGES[@]}" > "$RAW1"
  T1=$(date +%s)
  "$BIN" bench-sandbox --s4 "${IMAGES[@]}" > "$RAW2"
  T2=$(date +%s)
  if ! cmp -s "$RAW1" "$RAW2"; then
    echo "VB-determinism FAIL: quad re-run diverged"; diff "$RAW1" "$RAW2" | head; exit 1
  fi
  echo "VB-determinism OK (byte-identical re-run)"

  grep -E '^(SANDBOX|BRACKET|S4),' "$RAW1" > "$OUT_CSV"

  # Wall-clock accounting per pin P-S4-12 (A3 precedent): structural
  # multipliers logged beside every phase; NO measurement depends on it.
  T3=$(date +%s)
  "$BIN" bench-ideal "${IMAGES[@]}" > /dev/null
  T4=$(date +%s)
  SB=$((T2 - T0)); ID=$((T4 - T3))
  echo "== timing: sandbox-s4 quad ${SB}s (incl. determinism re-run), bench-ideal quad ${ID}s =="
  if [[ "$ID" -gt 0 ]]; then
    python3 -c "print(f'wall-clock guard: sandbox-s4/re-run = {$SB/$ID:.2f}x bench-ideal (P-S4-12: structural deviation recorded, no measurement depends on it)')"
  fi

  echo "== sandbox S4 results (${OUT_CSV}) =="
  cat "$OUT_CSV"

  REF_CSV="${ROOT}/benchmarks/results/2026-08-25-ideal-probe-e0-eval.csv"
  if [[ ! -f "$REF_CSV" ]]; then
    echo "VB-anchor FAIL: committed reference ${REF_CSV} missing"; exit 1
  fi
  if [[ ! -f "$E1_CSV" ]]; then
    echo "PROJECTION FAIL: committed e1 CSV ${E1_CSV} missing"; exit 1
  fi
  # Gate verdicts NEVER flip the exit code; VB rail-integrity failures DO.
  if ! evaluate "$OUT_CSV" "$REF_CSV" "$RANK_SKEW" "$RANK_HOMO" "$E1_CSV"; then
    echo "SANDBOX GATE FAIL (rail integrity)"
    exit 1
  fi
  echo "SANDBOX GATE PASS (all VB rails green; S4 verdict above is a measured outcome, not a rail failure)"
  exit 0
fi

if [[ "$MODE_T1A" == "1" ]]; then
  # T-series slice Q1 (spec addendum 20.2/20.5; pins P-Q1-1..P-Q1-9):
  # ceiling kill test on sha-pinned images; dated one-file CSV;
  # determinism re-run; rank fixtures stay LIVE; anchors re-emitted inside
  # the CSV; verdicts computed ONLY from same-run rows.
  STAMP=$(date +%Y-%m-%d)
  OUT_CSV="${ROOT}/benchmarks/results/${STAMP}-sandbox-t1a.csv"
  RAW1="$(mktemp)"; RAW2="$(mktemp)"
  RANK_SKEW="$(mktemp)"; RANK_HOMO="$(mktemp)"
  trap 'rm -f "$RAW1" "$RAW2" "$RANK_SKEW" "$RANK_HOMO" \
        "$RANK_SKEW.img" "$RANK_HOMO.img"' EXIT
  make_fixture "${RANK_SKEW}.img" skew
  make_fixture "${RANK_HOMO}.img" homo
  "$BIN" bench-sandbox "${RANK_SKEW}.img" --profile ZFFCTRL \
    --backend B-IDEAL --keying KSHARED,KFLAT16 > "$RANK_SKEW"
  "$BIN" bench-sandbox "${RANK_HOMO}.img" --profile ZFFCTRL \
    --backend B-IDEAL --keying KSHARED,KFLAT16 > "$RANK_HOMO"

  T0=$(date +%s)
  "$BIN" bench-sandbox --t1a "${IMAGES[@]}" > "$RAW1"
  T1=$(date +%s)
  "$BIN" bench-sandbox --t1a "${IMAGES[@]}" > "$RAW2"
  T2=$(date +%s)
  if ! cmp -s "$RAW1" "$RAW2"; then
    echo "VB-determinism FAIL: quad re-run diverged"; diff "$RAW1" "$RAW2" | head; exit 1
  fi
  echo "VB-determinism OK (byte-identical re-run)"

  grep -E '^(SANDBOX|BRACKET|T1|TSUM),' "$RAW1" > "$OUT_CSV"

  T3=$(date +%s)
  "$BIN" bench-ideal "${IMAGES[@]}" > /dev/null
  T4=$(date +%s)
  SB=$((T2 - T0)); ID=$((T4 - T3))
  echo "== timing: sandbox-t1a quad ${SB}s (incl. determinism re-run), bench-ideal quad ${ID}s =="
  if [[ "$ID" -gt 0 ]]; then
    python3 -c "print(f'wall-clock guard: sandbox-t1a/re-run = {$SB/$ID:.2f}x bench-ideal (P-Q1-9/A3 precedent: structural deviation recorded, no measurement depends on it)')"
  fi

  echo "== sandbox T1a results (${OUT_CSV}) =="
  cat "$OUT_CSV"

  REF_CSV="${ROOT}/benchmarks/results/2026-08-25-ideal-probe-e0-eval.csv"
  if [[ ! -f "$REF_CSV" ]]; then
    echo "VB-anchor FAIL: committed reference ${REF_CSV} missing"; exit 1
  fi
  if ! evaluate "$OUT_CSV" "$REF_CSV" "$RANK_SKEW" "$RANK_HOMO"; then
    echo "SANDBOX GATE FAIL (rail integrity)"
    exit 1
  fi
  echo "SANDBOX GATE PASS (all VB rails green; T1a verdict above is a measured outcome, not a rail failure)"
  exit 0
fi

if [[ "$MODE_T1B" == "1" ]]; then
  # T-series slice Q1 conditional phase (spec addendum 20.5 T1b; pin
  # P-Q1-6): whole-K codebook set; PG cited from the SAME-RUN t1a CSV.
  STAMP=$(date +%Y-%m-%d)
  OUT_CSV="${ROOT}/benchmarks/results/${STAMP}-sandbox-t1b.csv"
  T1A_CSV="${T1A_CSV:-${ROOT}/benchmarks/results/${STAMP}-sandbox-t1a.csv}"
  RAW1="$(mktemp)"; RAW2="$(mktemp)"
  RANK_SKEW="$(mktemp)"; RANK_HOMO="$(mktemp)"
  trap 'rm -f "$RAW1" "$RAW2" "$RANK_SKEW" "$RANK_HOMO" \
        "$RANK_SKEW.img" "$RANK_HOMO.img"' EXIT
  make_fixture "${RANK_SKEW}.img" skew
  make_fixture "${RANK_HOMO}.img" homo
  "$BIN" bench-sandbox "${RANK_SKEW}.img" --profile ZFFCTRL \
    --backend B-IDEAL --keying KSHARED,KFLAT16 > "$RANK_SKEW"
  "$BIN" bench-sandbox "${RANK_HOMO}.img" --profile ZFFCTRL \
    --backend B-IDEAL --keying KSHARED,KFLAT16 > "$RANK_HOMO"

  T0=$(date +%s)
  "$BIN" bench-sandbox --t1b "${IMAGES[@]}" > "$RAW1"
  T1=$(date +%s)
  "$BIN" bench-sandbox --t1b "${IMAGES[@]}" > "$RAW2"
  T2=$(date +%s)
  if ! cmp -s "$RAW1" "$RAW2"; then
    echo "VB-determinism FAIL: quad re-run diverged"; diff "$RAW1" "$RAW2" | head; exit 1
  fi
  echo "VB-determinism OK (byte-identical re-run)"

  grep -E '^(SANDBOX|BRACKET|T1|TSUM),' "$RAW1" > "$OUT_CSV"

  T3=$(date +%s)
  "$BIN" bench-ideal "${IMAGES[@]}" > /dev/null
  T4=$(date +%s)
  SB=$((T2 - T0)); ID=$((T4 - T3))
  echo "== timing: sandbox-t1b quad ${SB}s (incl. determinism re-run), bench-ideal quad ${ID}s =="
  if [[ "$ID" -gt 0 ]]; then
    python3 -c "print(f'wall-clock guard: sandbox-t1b/re-run = {$SB/$ID:.2f}x bench-ideal (P-Q1-9/A3 precedent: structural deviation recorded, no measurement depends on it)')"
  fi

  echo "== sandbox T1b results (${OUT_CSV}) =="
  cat "$OUT_CSV"

  REF_CSV="${ROOT}/benchmarks/results/2026-08-25-ideal-probe-e0-eval.csv"
  if [[ ! -f "$REF_CSV" ]]; then
    echo "VB-anchor FAIL: committed reference ${REF_CSV} missing"; exit 1
  fi
  if [[ ! -f "$T1A_CSV" ]]; then
    echo "T1B FAIL: same-run t1a CSV ${T1A_CSV} missing (pin P-Q1-6)"; exit 1
  fi
  if ! evaluate "$OUT_CSV" "$REF_CSV" "$RANK_SKEW" "$RANK_HOMO" "" "$T1A_CSV"; then
    echo "SANDBOX GATE FAIL (rail integrity)"
    exit 1
  fi
  echo "SANDBOX GATE PASS (all VB rails green; T1b verdict above is a measured outcome, not a rail failure)"
  exit 0
fi

if [[ "$MODE_T2A" == "1" ]]; then
  # T-series slice Q2 (spec addendum 20.3/20.5; pins P-Q2-1..P-Q2-9):
  # shrunk fine contexting on sha-pinned images; dated one-file CSV;
  # determinism re-run; rank fixtures stay LIVE; anchors re-emitted inside
  # the CSV; verdicts computed ONLY from same-run rows.
  STAMP=$(date +%Y-%m-%d)
  OUT_CSV="${ROOT}/benchmarks/results/${STAMP}-sandbox-t2a.csv"
  RAW1="$(mktemp)"; RAW2="$(mktemp)"
  RANK_SKEW="$(mktemp)"; RANK_HOMO="$(mktemp)"
  trap 'rm -f "$RAW1" "$RAW2" "$RANK_SKEW" "$RANK_HOMO" \
        "$RANK_SKEW.img" "$RANK_HOMO.img"' EXIT
  make_fixture "${RANK_SKEW}.img" skew
  make_fixture "${RANK_HOMO}.img" homo
  "$BIN" bench-sandbox "${RANK_SKEW}.img" --profile ZFFCTRL \
    --backend B-IDEAL --keying KSHARED,KFLAT16 > "$RANK_SKEW"
  "$BIN" bench-sandbox "${RANK_HOMO}.img" --profile ZFFCTRL \
    --backend B-IDEAL --keying KSHARED,KFLAT16 > "$RANK_HOMO"

  T0=$(date +%s)
  "$BIN" bench-sandbox --t2a "${IMAGES[@]}" > "$RAW1"
  T1=$(date +%s)
  "$BIN" bench-sandbox --t2a "${IMAGES[@]}" > "$RAW2"
  T2=$(date +%s)
  if ! cmp -s "$RAW1" "$RAW2"; then
    echo "VB-determinism FAIL: quad re-run diverged"; diff "$RAW1" "$RAW2" | head; exit 1
  fi
  echo "VB-determinism OK (byte-identical re-run)"

  grep -E '^(SANDBOX|BRACKET|T1|T2|T2SUM),' "$RAW1" > "$OUT_CSV"

  T3=$(date +%s)
  "$BIN" bench-ideal "${IMAGES[@]}" > /dev/null
  T4=$(date +%s)
  SB=$((T2 - T0)); ID=$((T4 - T3))
  echo "== timing: sandbox-t2a quad ${SB}s (incl. determinism re-run), bench-ideal quad ${ID}s =="
  if [[ "$ID" -gt 0 ]]; then
    python3 -c "print(f'wall-clock guard: sandbox-t2a/re-run = {$SB/$ID:.2f}x bench-ideal (P-Q2-9/A3 precedent: structural deviation recorded, no measurement depends on it)')"
  fi

  echo "== sandbox T2a results (${OUT_CSV}) =="
  cat "$OUT_CSV"

  REF_CSV="${ROOT}/benchmarks/results/2026-08-25-ideal-probe-e0-eval.csv"
  if [[ ! -f "$REF_CSV" ]]; then
    echo "VB-anchor FAIL: committed reference ${REF_CSV} missing"; exit 1
  fi
  if ! evaluate "$OUT_CSV" "$REF_CSV" "$RANK_SKEW" "$RANK_HOMO"; then
    echo "SANDBOX GATE FAIL (rail integrity)"
    exit 1
  fi
  echo "SANDBOX GATE PASS (all VB rails green; T2a verdict above is a measured outcome, not a rail failure)"
  exit 0
fi

if [[ "$MODE_T3" == "1" ]]; then
  # T-series slice Q3 (spec addendum 20.4/20.5; pins P-Q3-1..P-Q3-12):
  # joint predictor x tokenization factorial on sha-pinned images; dated
  # one-file CSV; determinism re-run; rank fixtures stay LIVE; anchors
  # re-emitted inside the CSV; verdicts computed ONLY from same-run rows.
  STAMP=$(date +%Y-%m-%d)
  OUT_CSV="${ROOT}/benchmarks/results/${STAMP}-sandbox-t3.csv"
  RAW1="$(mktemp)"; RAW2="$(mktemp)"
  RANK_SKEW="$(mktemp)"; RANK_HOMO="$(mktemp)"
  trap 'rm -f "$RAW1" "$RAW2" "$RANK_SKEW" "$RANK_HOMO" \
        "$RANK_SKEW.img" "$RANK_HOMO.img"' EXIT
  make_fixture "${RANK_SKEW}.img" skew
  make_fixture "${RANK_HOMO}.img" homo
  "$BIN" bench-sandbox "${RANK_SKEW}.img" --profile ZFFCTRL \
    --backend B-IDEAL --keying KSHARED,KFLAT16 > "$RANK_SKEW"
  "$BIN" bench-sandbox "${RANK_HOMO}.img" --profile ZFFCTRL \
    --backend B-IDEAL --keying KSHARED,KFLAT16 > "$RANK_HOMO"

  T0=$(date +%s)
  "$BIN" bench-sandbox --t3 "${IMAGES[@]}" > "$RAW1"
  T1=$(date +%s)
  "$BIN" bench-sandbox --t3 "${IMAGES[@]}" > "$RAW2"
  T2=$(date +%s)
  if ! cmp -s "$RAW1" "$RAW2"; then
    echo "VB-determinism FAIL: t3 re-run diverged"; diff "$RAW1" "$RAW2" | head; exit 1
  fi
  echo "VB-determinism OK (byte-identical re-run)"

  grep -E '^(SANDBOX|BRACKET|T1|T3|T3CELL),' "$RAW1" > "$OUT_CSV"

  T3=$(date +%s)
  "$BIN" bench-ideal "${IMAGES[@]}" > /dev/null
  T4=$(date +%s)
  SB=$((T2 - T0)); ID=$((T4 - T3))
  echo "== timing: sandbox-t3 quad ${SB}s (incl. determinism re-run), bench-ideal ${ID}s =="
  if [[ "$ID" -gt 0 ]]; then
    python3 -c "print(f'wall-clock guard: sandbox-t3/re-run = {$SB/$ID:.2f}x bench-ideal (A3 precedent: structural deviation recorded, no measurement depends on it)')"
  fi

  echo "== sandbox T3 results (${OUT_CSV}) =="
  cat "$OUT_CSV"

  REF_CSV="${ROOT}/benchmarks/results/2026-08-25-ideal-probe-e0-eval.csv"
  if [[ ! -f "$REF_CSV" ]]; then
    echo "VB-anchor FAIL: committed reference ${REF_CSV} missing"; exit 1
  fi
  if ! evaluate "$OUT_CSV" "$REF_CSV" "$RANK_SKEW" "$RANK_HOMO"; then
    echo "SANDBOX GATE FAIL (rail integrity)"
    exit 1
  fi
  echo "SANDBOX GATE PASS (all VB rails green; T3 bar(i) verdict above is a measured outcome, not a rail failure)"
  exit 0
fi

# ----- T-series slice Q4: T4 composition + projection (pins P-Q3-5..P-Q3-12
# inherited, plus 18.5 VERBATIM projection vs committed e1 CSV). -----
if [[ "$MODE_T4" == "1" ]]; then
  # T4 composition: per-image winners by real NET bytes from T3 MED rows
  # (GAP/W closed permanently by T3 FAIL); projection 18.5 VERBATIM vs
  # committed e1 CSV; threshold UNCHANGED < 9.35 summed / < 3.117
  # per-sample; M2/M3 reported beside, never altered; portrait INHERITED
  # marker inherited from P-S4.
  T3_CSV="${ROOT}/benchmarks/results/2026-08-26-sandbox-t3.csv"
  E1_CSV="${ROOT}/benchmarks/results/2026-08-25-prism-e1.csv"
  if [[ ! -f "$T3_CSV" ]]; then
    echo "T4: committed T3 CSV ${T3_CSV} missing"; exit 1
  fi
  if [[ ! -f "$E1_CSV" ]]; then
    echo "T4: committed e1 CSV ${E1_CSV} missing"; exit 1
  fi
  # Feed T3 CSV + e1 CSV to the evaluate function; T4 rails + composition
  # live in the Python evaluator.
  if ! evaluate "$T3_CSV" "${ROOT}/benchmarks/results/2026-08-25-ideal-probe-e0-eval.csv" "" "" "$E1_CSV" > /tmp/t4_eval.out 2>&1; then
    cat /tmp/t4_eval.out
    echo "SANDBOX GATE FAIL (T4 rail integrity)"
    exit 1
  fi
  cat /tmp/t4_eval.out
  echo "SANDBOX GATE PASS (all VB rails green; T4 verdict above is a measured outcome, not a rail failure)"
  exit 0
fi

STAMP=$(date +%Y-%m-%d)
OUT_CSV="${ROOT}/benchmarks/results/${STAMP}-sandbox-v0.csv"
RAW1="$(mktemp)"; RAW2="$(mktemp)"
RANK_SKEW="$(mktemp)"; RANK_HOMO="$(mktemp)"
trap 'rm -f "$RAW1" "$RAW2" "$RANK_SKEW" "$RANK_HOMO" \
      "$RANK_SKEW.img" "$RANK_HOMO.img"' EXIT
make_fixture "${RANK_SKEW}.img" skew
make_fixture "${RANK_HOMO}.img" homo
"$BIN" bench-sandbox "${RANK_SKEW}.img" --profile ZFFCTRL \
  --backend B-IDEAL --keying KSHARED,KFLAT16 > "$RANK_SKEW"
"$BIN" bench-sandbox "${RANK_HOMO}.img" --profile ZFFCTRL \
  --backend B-IDEAL --keying KSHARED,KFLAT16 > "$RANK_HOMO"

T0=$(date +%s)
"$BIN" bench-sandbox "${IMAGES[@]}" > "$RAW1"
T1=$(date +%s)
"$BIN" bench-sandbox "${IMAGES[@]}" > "$RAW2"
T2=$(date +%s)
if ! cmp -s "$RAW1" "$RAW2"; then
  echo "VB-determinism FAIL: quad re-run diverged"; diff "$RAW1" "$RAW2" | head; exit 1
fi
echo "VB-determinism OK (byte-identical re-run)"

grep -E '^(SANDBOX|BRACKET|CORRUPT|SANDBOXTOTAL),' "$RAW1" > "$OUT_CSV"

# Wall-clock guard context (blueprint section 5: V0 <= 2.0x the bench-ideal
# quad time; peak RSS logged per I6 where available).
T3=$(date +%s)
"$BIN" bench-ideal "${IMAGES[@]}" > /dev/null
T4=$(date +%s)
SB=$((T2 - T0)); ID=$((T4 - T3))
echo "== timing: sandbox quad ${SB}s (incl. determinism re-run), bench-ideal quad ${ID}s =="
if [[ "$ID" -gt 0 ]]; then
  python3 -c "print(f'wall-clock guard: sandbox/re-run = {$SB/$ID:.2f}x bench-ideal (bound 2.0x single-run; re-run included by contract)')"
fi

echo "== sandbox V0 results (${OUT_CSV}) =="
cat "$OUT_CSV"

REF_CSV="${ROOT}/benchmarks/results/2026-08-25-ideal-probe-e0-eval.csv"
if [[ ! -f "$REF_CSV" ]]; then
  echo "VB-anchor FAIL: committed reference ${REF_CSV} missing"; exit 1
fi
if ! evaluate "$OUT_CSV" "$REF_CSV" "$RANK_SKEW" "$RANK_HOMO"; then
  echo "SANDBOX GATE FAIL (rail integrity)"
  exit 1
fi
echo "SANDBOX GATE PASS (all VB rails green)"
