# S4 composition + projection: structural pins before any measurement

- **Role:** the Builder
- **Date:** 2026-08-25 (Builder slice P3 of the S-series pivot, PR #145,
  issue #130)
- **Authority:** spec addendum 19.5 S4 (algorithmic-spec.md section 19) and
  the S-series blueprint (`architecture-jxl-parity-sourcepivot.md`, S4
  section) are binding. This record fixes ONLY the structural readings those
  texts leave open - all BEFORE any `bench-sandbox --s4` row exists (same
  discipline as records 2026-08-25T16-20-00 / 2026-08-25T21-30-00 /
  2026-08-25T22-30-00 / 2026-08-25T23-00-00). No constant here may be
  retuned after a measurement has been seen.

## P-S4-1 Candidate set

S1 FAILED (best non-MED median -1.45 vs bar >= +1.50; MED ships), S2 never
opened (its trigger clause requires an S1 PASS), S3 FAILED (best variant
median -8.09 vs bar >= +1.50; flat-16 ships). Per addendum 19.5 the
composition candidates therefore reduce exactly to:

    ADAPT   the adaptive production control (FRAME-A: per-plane
            acoder_encode_plane_v2 replay over the phase's MED residual
            streams, payload only, zero side info)
    SPINE   the static spine ZFFCTRL x KFLAT16, budget-enforced, every
            side-info byte NETTED (tables + 'SBP1' merge map; I12)

No other candidate exists in this slice; the registered non-blocking
stretch candidate (per-bin-type-class static-vs-adaptive KIND flag) DEFERS
to the format program per its own clause - it is not implemented here and
does not delay this readout.

## P-S4-2 Color trial family (the D4c crossing)

The full offline rotation candidate list `colorrot::kCount = 7`
{ycocgr, rct-grb, rct-gbr, rct-rbg, rct-brg, rct-bgr, loco} applied via
`colorrot::apply(r, id)` - the same library family the production analyzer
trials by real coded bytes since D4c adoption. BD8 RGB-only by contract;
any other input is a hard error, not a skipped trial. Every candidate x
every trial id is measured fresh in-run; no cached or imported color rows.

## P-S4-3 Winner rule (per image)

Winner = argmin NET over ALL measured (candidate, trial) rows of the image.
NET = payload + tables + maps + trees (I12). Tie-break order: ADAPT before
SPINE, then lower trial id - the conservative direction, so a tie can never
manufacture a gain.

## P-S4-4 Control definition and relpct_composed

Per image, ctrl_net = min NET over the ADAPT trial rows (the adaptive
control given the SAME trial freedom as the spine). relpct_composed(img) =
100 * (ctrl_net - win_net) / ctrl_net, which is >= 0 BY CONSTRUCTION on
every image (the control is inside the candidate set). This is the quantity
18.5 names relpct_composed; it is measured against the same instrument on
both sides (pure acoder payloads + NETTED side info, container-free).

## P-S4-5 Gating backend and reference rows

SPINE winner payloads are read from B-RANS rows only (the real coder);
B-IDEAL spine rows exist ONLY as fidelity-rail references and are excluded
from winner selection. ADAPT rows carry zero side info (schema-guarded like
frame-A rows in s1). Round-trip decode checks bind every coded row
(B-ADAPT replay + SPINE B-RANS) as in s1/s3.

## P-S4-6 Anchors first

Every image emits the identical anchor set as s1/s3/v1 BEFORE any S4 row:
SANDBOX B-ADAPT control row (VB-anchor-adapt bit-for-bit guard), BRACKET
row, and the KSHARED/KFLAT16/KFLAT343 B-IDEAL trio (VB-anchor-ideal
counting-path guard) - all under plain YCoCgR so they bind to the committed
reference exactly.

## P-S4-7 Projection classes and the portrait gap

Corpus truth: benchmarks/results/2026-08-25-prism-e1.csv (24 images,
`image,bytes,bpp`, bpp = per-sample convention). Class membership is pinned
by docs/benchmark-methodology.md section 1: portrait =
kodim04/09/10/17/18/19 (512x768), landscape = the other 18 (768x512).
The pinned quad kodim01/05/13/20 is ENTIRELY landscape, so the landscape
class median of the four measured relpcts is well defined but the portrait
class median is UNDEFINED from this quad. Pinned fallback (decided now,
before any number exists): portrait inherits the OVERALL quad median of the
measured relpcts, and every readout line that used it prints an explicit
INHERITED marker; the projection table also reports the landscape-only
projection beside the full-corpus number so the sensitivity is visible. No
post-hoc substitution in either direction is permitted.

## P-S4-8 Thresholds and gate semantics (verbatim 18.5)

proj_bytes(img) = e1_bytes(img) * (1 - relpct_class(img) / 100) for all 24
e1 images; projected mean_summed and mean_per-sample computed over the 24
(summed = 3 x per-sample for this RGB corpus, bench_gate.sh convention).
Threshold: projected summed < 9.35 AND projected per-sample < 3.117 =>
proceed-to-format handoff (a NEW Architect session blueprints the container
program behind a version bump); otherwise stop-and-report with the full
ledger. M2 (<9.498/<3.166) and M3 (<8.655/<2.885) are REPORTED beside the
S4 verdict for context only - they are judged solely by bench_gate.sh in
BOTH units against real cjxl output on a fresh corpus measure and are never
altered here (owner standing order).

## P-S4-9 S5 trigger clause (quantified now, expected non-firing)

Per blueprint decision tree, S5 opens ONCE only if S4 FAILs the 9.35 bar
while landing one reserve-sized step from M3 in BOTH units: projected
summed < 8.655/(1-0.02) = 8.8316 AND projected per-sample < 2.885/(1-0.02)
= 2.9438. Any other outcome closes the program's measurement phases with
stop-and-report.

## P-S4-10 Zero container bytes

No container/header/acoder-production edits exist anywhere in this slice
(module-map boundary intact); every byte accounted for lives in CSV columns
and none in any container, by construction until an S4 threshold PASS.

## P-S4-11 CSV schema and naming

Dated one-file CSV benchmarks/results/YYYY-MM-DD-sandbox-s4.csv (addendum
19.6). Row grammar:

    S4,img,cand,trial,be,payload,tables,maps,trees,net,audit,rt,tbl_bits

cand in {ADAPT,SPINE}; trial = colorrot name; be in {B-ADAPT,B-IDEAL,
B-RANS}. Anchor rows (SANDBOX/BRACKET) keep their existing grammars so the
shared rails evaluate unchanged.

## P-S4-12 Verdicts, failability, determinism, wall-clock

Gate verdict lines never flip exit codes; VB rail-integrity failures DO.
--self-check-s4 must prove the consistent frame green, BOTH S4 verdict
directions reachable from fabricated-but-consistent numbers, and every rail
mutation (fidelity, NET identity, silent round-trip failure, frame-A side-
info leak, nonzero tree column, missing/uncovered e1 reference) firing.
Determinism: byte-identical quad re-run required. Wall-clock logged beside
per amendment A3 precedent (structural multipliers recorded; NO gate
depends on wall-clock); peak RSS noted per I6 where available.

- the Builder
