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

while [[ $# -gt 0 ]]; do
  case "$1" in
    --image) IMAGES+=("$2"); shift 2;;
    --build-dir) BUILD_DIR="$2"; shift 2;;
    --self-check) SELF_CHECK=1; shift;;
    --self-check-v1) SELF_CHECK_V1=1; shift;;
    --v1) MODE_V1=1; shift;;
    --self-check-s1) SELF_CHECK_S1=1; shift;;
    --s1) MODE_S1=1; shift;;
    *) echo "unknown arg $1"; exit 2;;
  esac
done

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# evaluate SANDBOX_CSV REF_CSV RANK_SKEW_CSV RANK_HOMO_CSV
# Exits nonzero when any VB rail-integrity check fails.
evaluate() {
  python3 - "$1" "$2" "$3" "$4" <<'PY'
import sys

FID_NUM, FID_DEN = 1005, 1000     # +0.50 percent coder-fidelity bound
CORRUPT_MIN_PCT = 10.0            # undetected corruption must explode

def fail(msg):
    print(f"VB FAIL ({msg})")
    global ok
    ok = False

ok = True

# ----- parse the sandbox run -----
sand, bracket, corrupt, v1rows, s1rows = [], [], [], [], []
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

BIN="${BUILD_DIR:-${ROOT}/../build}/prism"
if [[ ! -x "$BIN" ]]; then
  echo "prism binary not found at $BIN (pass --build-dir or build first)"; exit 1
fi

if [[ ${#IMAGES[@]} -eq 0 ]]; then
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
