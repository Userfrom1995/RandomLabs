# S1 predictor slice: structural pins + amendment A4, before any measurement

- **Role:** the Builder
- **Date:** 2026-08-25 (Builder slice P1 of the S-series pivot, PR #145,
  issue #130)
- **Authority:** spec addendum 19 (algorithmic-spec.md section 19) and the
  S-series blueprint (`architecture-jxl-parity-sourcepivot.md`) are binding;
  every gate constant there (S1 >= +1.5 RELPCT median quad in FRAME-S vs
  same-frame MED; FRAME-A reported never gating; families {MED, GAP, W}) is
  implemented verbatim. This record fixes only the STRUCTURAL readings the
  texts leave open, plus ONE numbered amendment the binding order explicitly
  provides for - all BEFORE any `bench-sandbox --s1` row exists (same
  discipline as addenda 18/19 and records 2026-08-25T16-20-00 /
  2026-08-25T21-30-00). No constant here may be retuned after a measurement
  has been seen.

## P-S1-1 Family mathematics source

18.4 verbatim for everything EXCEPT the two GAP gradient terms repaired by
amendment A4 below. Families: MED control (production definition, spec
section 4), GAP reduced classic, W ensemble over {W, N, NW, TE}. All causal
(decoded/original history only - identical because every stream here is
losslessly reversible), raster order, int64 internal arithmetic.

## P-S1-2 Neighbor derivation = the production convention

The replay derives neighbors exactly as `compute_residuals`
(src/codec/predict.cpp) does, so the MED family reproduces the production
MED stream byte-for-byte (pinned unit test):

- Primaries: L = x>0 ? p[i-1] : 0; T = y>0 ? p[i-w] : 0;
  TL = x>0 && y>0 ? p[i-w-1] : 0; NE = y>0 && x+1<w ? p[i-w+1] : 0.
- Secondaries (needed only by amendment A4's GAP): WW = x>1 ? p[i-2] : L;
  NN = y>1 ? p[i-2w] : T. This IS the "border rule = replicated edge
  (production rule)" of 18.4: a missing farther neighbor replicates the
  nearest available one; missing primaries read 0.

## P-S1-3 AMENDMENT A4: GAP horizontal/vertical gradient pair repaired

The literal 18.4 text is algebraically degenerate:

    dh = |W-NW| + |N-NW| + |NE-N|
    dv = |NW-W| + |N-NW| + |N-NE|

Term-by-term |W-NW| == |NW-W|, |N-NW| == |N-NW|, |NE-N| == |N-NE|, so
dh == dv IDENTICALLY for every sample. Consequences if implemented as
written: both pinned thresholds t80/t32 become provably dead branches, and
GAP degenerates to the constant filter sym_round_div(2W+2N+NE-NW, 4). That
contradicts the same section's own branch structure (it pins t80/t32
semantics) and its replicated-edge border clause, which has effect only if
the farther neighbors WW/NN participate - exactly as in classic CALIC GAP,
whose gradient pair this section transcribes.

Amendment (smallest structural delta restoring the intended semantics):
dh[1] = |W-WW| and dv[2] = |N-NN|. The pair becomes

    dh = |W-WW| + |N-NW| + |NE-N|
    dv = |NW-W| + |N-NN| + |N-NE|

matching classic CALIC; every OTHER pinned constant is untouched (t80 =
80 << (bd-8), t32 = 32 << (bd-8), num = 2W+2N+NE-NW, dhat halving rules,
sym_round_div semantics). Recorded here BEFORE any S-row exists; also noted
in algorithmic-spec.md section 19 STATUS. The V-series never measured V2
predictors (STOP at V1), so no prior measurement is invalidated.

## P-S1-4 sym_round_div

sym_round_div(a, b), b > 0: sign(a) * ((|a| + b/2) div b), integer division
(round half away from zero). Used by GAP (dhat, halving steps) and the W
ensemble normalization.

## P-S1-5 floor_div

floor_div(a, b), b > 0: quotient floored toward negative infinity (not C
truncation). Used only by the W ensemble update.

## P-S1-6 W ensemble state contract

- Sub-predictors p_i in ORDER i = W, N, NW, TE; TE = W + N - NW clamped to
  [0, 2^bd - 1]; W/N/NW are raw neighbor samples (already in range).
- Weights w_i int64 16.16, per-plane state, init 65536 each, clamp
  [16384, 1048576] after every update; fresh init per plane (state reset).
- pred = sym_round_div(sum_i w_i p_i, sum_i w_i), then clamped to
  [0, 2^bd - 1]. THE CLAMPED VALUE IS "pred" everywhere downstream:
  residual = actual - pred and err = actual - pred are the SAME quantity,
  so the decoder updates weights from the decoded residual directly
  (decoder-mirror by construction; step-equality unit test binds it).
- Update AFTER coding each sample, order pinned i = W, N, NW, TE:
  w_i <- clamp(w_i + floor_div(err * (p_i - pred), 512), 16384, 1048576).

## P-S1-7 Bit depth and the prediction domain (AMENDED by A4b)

bd = the raster's bit depth (8 or 16). t80 = 80 << (bd-8);
t32 = 32 << (bd-8).

**Amendment A4b (recorded before any committed S-row):** the 18.4 line
"clamp outputs to [0, 2^BD - 1]" cannot bind this instrument literally.
The sandbox scores residuals of the COLOR-TRANSFORMED planes in production
pipeline order, and those chroma domains legitimately exceed the source BD
(measured on kodim01 at BD8: plane 1 in [477, 548], plane 2 in
[506, 639]) - a literal prediction clamp destroys every chroma prediction
and inflates MED's own FRAME-A payload 2.65x. Production truth, which the
FRAME-A anchor binds bit-for-bit, is that `compute_residuals` applies NO
prediction clamp. Therefore:

- Predictions are UNCLAMPED int64 values in the transformed-plane domain,
  exactly as production computes them; residual = actual - pred.
- The W ensemble's TE sub-predictor clamps to [0, 2^16 - 1] (the uint16
  storage bound; fires only on absurd extrapolation, deterministically on
  both sides).
- Reconstruction is the exact add s = pred + residual with NO post-add
  clamp (mirrored states make it exact; a clamp would corrupt out-of-BD-
  domain chroma reconstruction).
- MED byte-identity vs `compute_residuals(MED)` across ALL planes of real
  transformed images joins the pinned unit tests as the binding check.

The bring-up run that used the literal clamp was discarded wholesale
(V1 ClusterMap precedent); no number from it survives anywhere.

## P-S1-8 Dual-frame rows

- FRAME-A row (per image): payload = SUM over planes of
  acoder_encode_plane_v2(family stream, 343 resdiff contexts); round-trip
  checked via acoder_decode_plane_v2; tables/maps/trees = 0, net = payload,
  audit = 1. For the MED family this row is bit-for-bit bound to the
  committed e1-era bytes by VB-anchor-adapt (the SANDBOX B-ADAPT control
  row re-emitted beside it).
- FRAME-S rows (per image): ZFFCTRL x KFLAT16 static spine, budget-
  enforced with the 'SBP1' merge map NETTED (prepare_keyed_config reused
  unchanged), backends {B-IDEAL reference, B-RANS gating}; NET = payload +
  tables + maps (+ trees = 0) per I12. Fidelity rail: B-RANS payload within
  +0.50 pct of its own B-IDEAL row per image.

## P-S1-9 Gate reading (addendum 19.5 verbatim)

Per image, per frame: RELPCT(family) = 100 * (net_MED - net_family /
net_MED on joint NET bytes; quad MEDIAN primary (I10), min/max reported.
FRAME-S is PRIMARY/gating: S1 PASS iff the best non-MED family median >=
+1.50 pct in FRAME-S. FRAME-A margins are printed beside every verdict and
never gate anything (19.3). Gate/verdict lines NEVER flip exit codes;
VB-* rail-integrity failures DO.

## P-S1-10 CSV schema and anchors

`benchmarks/results/YYYY-MM-DD-sandbox-s1.csv` per 19.6. Row schema:

    S1,img,frame,family,backend,payload,tables,maps,trees,net,audit,rt,tbl_bits

frame in {A,S}; family in {MED,GAP,W}; backend in {B-ADAPT,B-IDEAL,B-RANS}.
Every --s1 run ALSO re-emits the SANDBOX ZFFCTRL/B-ADAPT/KPROD control row
and the BRACKET frozen-walk row per image, so VB-anchor-adapt and
VB-anchor-ideal guard every measurement against the committed reference
exactly as they do in V0/V1 modes.

## P-S1-11 Wall-clock

A3 precedent stands: structural instrument multipliers are logged beside
every phase; NO gate depends on wall-clock.

- the Builder
