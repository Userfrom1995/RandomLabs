# Prism U-series blueprint: the transform-domain program (Architect handoff for #130)

- **Issue:** #130 (owner Anti-Surrender directive 2026-08-26T20:05Z; iterate
  versions until M2 AND M3 genuinely pass dual-unit gates)
- **Role:** the Architect
- **Trigger:** `/oc architect` dispatch on PR #151, 2026-08-26; Dr. Mob
  delivered `research-v4-transform-domain.md` (B6 bucket, U-series gates,
  I13/I14 invariants, addendum 21 skeleton) and handed off
  `{"action":"architect"}`.
- **Inputs:** `research-v4-transform-domain.md` (primary: B6 source
  decorrelation opportunity, U0-U3 phases, honest arithmetic), the T-series
  blueprint `architecture-jxl-parity-tseries.md` (pattern reuse), all V+S+T
  evidence chain (committed sandbox CSVs, builder decision records, addenda
  17-20), corpus truth e1 = 10.1210 summed / 3.3737 per-sample bpp, T4
  composed projection 9.5671 summed / 3.1890 per-sample.
- **Scope of THIS doc:** turn the v4 research into a buildable, ordered,
  gated program whose FIRST deliverable is spec addendum 21 (every constant
  that can be pinned before any measurement) and the U0 harness extension.
  NO U-phase measurement may precede addendum 21.

Units discipline unchanged: every number states its unit; RELPCT =
per-image-median relative NET percent per I10 with NET = payload + tables
+ maps + trees + codebooks per I12; final judgment stays bench_gate.sh in
both units against real cjxl output on a fresh corpus measure; no success
claim without a fresh measurement.

---

## 0. Program state: what V+S+T proved and what they did not

### What was proved (permanent history under I10)

Every V+S+T measurement ran in the **spatial prediction residual domain**:
MED -> subtract -> code the residual. The programs priced six classes of
mechanism within that domain:

| class | programs | verdict | ceiling |
|---|---|---|---|
| Forward-adaptive static coding (B1) | V1 | FAIL at +5.81 pct realistic | table bytes swamp payload gain |
| Spatial keying (B2 spatial) | V1 KGRID/KTREE | FAIL | position tiles lose directional conditioning |
| Causal property keying (B2 extended) | S3 | FAIL at -8.09 pct | table bytes swamp conditioning gain |
| Context refinement (B2 fine) | T2a | FAIL at -13.09 pct | 80 KB SBD1 per image swamps refinement |
| Joint locality-context (B1+B2 joint) | T1a ceiling | FAIL at -32.76 pct | per-group exact stacks unpayable |
| Predictor families (B3) | S1 | FAIL at -1.45 pct | MED's zero-mode dominates under ZFF |
| Tokenization (B5) | T3 | FAIL at -2.11 pct | best non-MED still below bar |

The table-economics law is confirmed across six independent measurement
programs: **every conditioning refinement measured under payable side info
has lost to its own table bytes.** The surviving composition (MED + D4c
color trials + static spine) projects at 9.5671 summed / 3.1890
per-sample.

### What was NOT measured

The V+S+T programs never touched the **source representation** itself:

1. No block frequency transform was tested. The residual stream coded was
   the raw MED prediction residual - a spatial signal retaining inter-pixel
   correlation within each prediction neighborhood.

2. No transform-domain prediction was tested. MED predicts from four
   spatial neighbors (W, N, NW, NE) and does not see frequency content
   within local blocks.

3. No hybrid prediction (spatial + frequency) was tested. The prediction
   bank {MED, GAP, W} is purely spatial; no frequency-domain sub-predictor
   exists.

This is the gap the U-series attacks.

## 1. The transform opportunity: B6 (source decorrelation)

### 1.1 Why B6 is structurally different from C4/C5 (the rejected transforms)

| property | C4 (wavelet lifting) | C5 (cross-band) | B6 (block DCT predictor) |
|---|---|---|---|
| Resolution | Multi-resolution (HF/LL bands) | Single resolution | Single resolution |
| Information flow | LL predicts HF | Parent predicts child | Frequency coefficients predict spatial residual |
| Side info | Lift plan per plane | H/V/D weights per plane | None (fixed 8x8 DCT) |
| Pipeline position | Transform-first (residual in transform domain) | Transform-first | Pre-prediction (residual in spatial domain) |
| L-C7 applicability | YES (killed) | YES (killed) | NO (not transform-first) |

L-C7 kills wavelet lifting and cross-band prediction where the transform
IS the prediction and the residual is coded in the transform domain. B6
applies a block DCT to the SOURCE before prediction, then codes the
spatial-domain residual normally. The transform is a preprocessing step
that makes spatial prediction MORE effective.

### 1.2 The table-economics exemption

B6 has zero transmitted side-info: the block size (8x8), basis functions
(Type-II DCT), padding policy (replicate), and quantization (Q=0) are all
fixed parameters known to the decoder. The table-economics law that killed
V1/S3/T1a/T2a does NOT apply: there are no tables to serialize, no maps
to transmit, no trees to compress. The entire cost of the transform is
the encoder-side forward DCT computation, which is not part of the coded
bitstream.

### 1.3 Literature basis

Transform coding gains over spatial prediction on continuous-tone images:
15-25% of residual bytes (Wallace 1992; NGO 1996; JPEG XL VarDCT design
rationale). Applied to the T4 projection (9.5671 summed / 3.1890
per-sample):

| scenario | residual reduction | projected summed | projected per-sample | M2 gate | M3 gate |
|---|---|---|---|---|---|
| Conservative (15%) | -1.435 | 8.132 | 2.711 | PASS | PASS |
| Midpoint (20%) | -1.913 | 7.654 | 2.551 | PASS | PASS |
| Optimistic (25%) | -2.392 | 7.175 | 2.392 | PASS | PASS |

Even the conservative 15% estimate clears both M2 and M3. The transform
attacks source entropy, the largest single component of compressed size.

### 1.4 What the V+S+T evidence says about expected gain

The V+S+T programs established that:
- The residual under MED has a sharp zero peak (why ZFF works).
- The residual retains spatial correlation (adjacent residuals are
  correlated because MED's four-neighbor prediction cannot capture all
  local structure).
- The ~7-point gap between real v2 coding and the ctx343 oracle
  represents collection-layer loss (B1), partially harvestable at +5.81
  pct via forward-adaptive static tables.

A block DCT decorrelates the source within each block, reducing the
inter-sample correlation that MED cannot capture. The residual under
DCT-domain MED prediction should have lower entropy (whiter noise),
producing fewer bytes under the same ZFF binarization.

## 2. The U-series program (offline first, fail-fast order)

### 2.0 Principles

Same discipline as V/S/T: offline first, zero container bytes until a
gate PASS, per-image primary scoring (I10), NET accounting (I12), pins
committed before measurement, dated CSVs, failable self-checks, determinism
byte-for-byte, fuzz + byte-exact round-trip.

### 2.1 U0: Transform harness extension (BLOCKING, first slice)

Add to the V+S+T sandbox instrument:

**BlockDCT module** (`src/codec/transform.{h,cpp}`):
- 8x8 forward DCT (AAN algorithm, integer-exact per addendum 21).
- 8x8 inverse DCT (byte-exact reconstruction, 0 bytes delta, unit-tested; if AAN not byte-exact, rounding residual coded and NET-accounted).
- Non-overlapping 8x8 blocks across the full image (replicate padding for
  partial edge blocks; padding bits counted in NET).
- Quantization parameter Q = 0 (lossless; byte-exact). Pinned transform MUST be integer-reversible per addendum 21 slot 3a.

**TransformDomainMED module**:
- For each 8x8 block: apply forward DCT to the source block; predict each
  coefficient from its four spatial neighbors in the coefficient plane
  (same MED stencil, operating on DCT values); compute residual =
  coefficient - prediction.
- Residual coded by the existing entropy backend (v2 binarization, class16
  conditioning, ZFF or ZZ-HU tokenization).

**Control comparison**:
- FRAME-T: spatial MED prediction on the original source (existing path).
- FRAME-F: frequency-domain MED prediction on DCT coefficients.
- Both scored on the same backend; NET = payload + tables + maps + trees.

**New VB rails**:
- VB-transform-roundtrip: forward DCT -> inverse DCT reproduces source byte-exact (4/4 images, 0 bytes delta) - fails otherwise. Add VB-transform-lossless: FRAME-F decode byte-exact vs source on the pinned quad.
- VB-transform-fidelity: FRAME-F payload is finite and decodable.
- VB-transform-net-audit: NET = payload + side-info on every row.

**Self-check**: `--self-check-u0` proves both verdict directions (FRAME-F
beats FRAME-T on at least one image, FRAME-T beats FRAME-F on at least
one image) by construction on the pinned quad.

Exit condition: all VB rails green + dated reference CSV committed. No
U-phase verdict is valid without a green U0.

### 2.2 U1: Block DCT predictor measurement (attacks B6)

Pins committed BEFORE any measurement. Sweep: {FRAME-T control, FRAME-F
DCT-predicted} x {ZFFCTRL, ZZ-HU} x {MED-only} x all seven D4c color
trials on the pinned quad (kodim01/kodim13/kodim05/kodim20, sha-pins
verified pre-run).

**Gate**: FRAME-F median NET beats FRAME-T median NET by >= +1.50 pct on
the quad (per I10). Same bar as S1 predictors and T3 factorial.

**Sub-gates**:
- U1a: payload reduction >= +3.0 pct (transform must reduce residual
  entropy; if payload does not drop, DCT is not decorrelating).
- U1b: NET reduction >= +1.50 pct (tables + maps + padding must not
  swamp payload gain; since DCT has zero tables, almost automatic if U1a
  passes).
- U1c: no image regresses by more than -0.50 pct (transform must not
  hurt smooth images where MED already captures the structure).

**Failable self-check**: `--self-check-u1` proves both gate directions
and both sub-gate directions on the pinned quad.

### 2.3 U2: Hybrid predictor composition

If U1 passes: compose {MED spatial control, DCT-predicted} x D4c color
trials per image by real NET bytes (same discipline as S4/T4). Per-image
winners by argmin NET; conservative tie-breaks to control.

Project corpus via formula 18.5 VERBATIM against the committed e1 CSV.
Proceed-to-format threshold UNCHANGED: projected < 9.35 summed AND
< 3.117 per-sample. M2/M3 reported beside, never altered.

If U1 FAILS: the transform domain is closed with numbers; the program
recommends honest closure or owner-directed exotic program.

### 2.4 U3: Final gate check

Compose all U-series winners. Fresh dual-unit bench_gate.sh against
REAL cjxl and WebP references on the full Kodak-24. Byte-exact round-trip
24/24. Fuzz clean.

**Binding end gates** (unchanged):
- M2: summed < 9.498 AND per-sample < 3.166 (WebP lossless m6)
- M3: summed < 8.655 AND per-sample < 2.885 (JPEG XL -d0 -e9)

## 3. Module map additions

```text
src/codec/transform.cpp                 [U0] BlockDCT forward/inverse (AAN,
                                         integer-exact, 8x8 non-overlapping,
                                         replicate padding)
include/prism/codec/transform.h         [U0] BlockDCT interface + rounding
                                         bound constant
src/codec/staticmodel.cpp               [U0] TransformDomainMED adapter
                                         (MED stencil over DCT coefficient
                                         planes; reuses existing predict
                                         interface)
src/cli/main.cpp                        [U0..U3] bench-sandbox --u0/--u1/
                                         --u2/--u3 modes
benchmarks/probe_sandbox.sh             [U0..] U-rails + verdict readouts
                                         (never flip exit codes except VB-*)
                                         + failable --self-check-u0/--u1
tests/unit/test_transform.cpp           [U0] DCT forward/inverse round-trip,
                                         rounding bound, block boundary
                                         handling, extreme-value stability,
                                         basis orthogonality check
tests/unit/test_staticmodel.cpp         [U0] TransformDomainMED adapter
                                         identity (MED on DC plane reproduces
                                         spatial MED for DC component)
docs/algorithmic-spec.md                [FIRST] section 21 = addendum 21
                                         (this run)
```

No container/container-header/acoder-production changes exist anywhere in
this program until a U2 threshold PASS; that boundary IS the design. The
frozen bench-ideal instrument and its committed CSVs remain anchor-only.

## 4. Test matrix additions

| Layer | Gate |
|---|---|
| DCT unit (U0) | forward -> inverse reproduces source byte-exact (0 bytes delta) on all test images; if residual-coded, residual round-trips byte-exact; extreme values (0,255) byte-exact; basis vectors orthogonal to within integer precision |
| TransformDomainMED unit (U0) | MED on DC plane = spatial MED for DC component; adapter produces finite residuals on all test images; FRAME-F rows decode mirror-exact |
| Sandbox harness | VB rails green on EVERY new row family before any verdict line; --self-check-u0 proves FAIL paths both directions; determinism byte-exact re-run |
| Corpus | unchanged: sha-pinned Kodak-24 verified BEFORE any measurement; fuzz + byte-exact round-trip on the shipped codec untouched throughout; bench_gate.sh remains the only final judge |

## 5. Risk register additions

- **Integer rounding accumulation**: the DCT introduces +/- 0.5 rounding
  per coefficient; across 64 coefficients per block this is bounded at
  +/- 32 per block. Measured in U0 round-trip; if any image exceeds the
  bound, the block size or scaling precision is amended BEFORE U1.
- **Prediction domain mismatch**: MED's neighbor-based prediction may not
  generalize well to frequency coefficients (the spatial neighborhood
  relationship does not directly map to the frequency domain). This is
  priced in U1's gate; if FRAME-F does not beat FRAME-T, the mismatch
  is the measured answer.
- **Block boundary artifacts**: non-overlapping 8x8 blocks create
  discontinuities at block edges. The residual at block boundaries may
  be higher than within blocks. Priced in U1's U1c sub-gate (no image
  worse than -0.50 pct).
- **Color plane interaction**: DCT on YCoCg-R chroma planes may have
  different gains than on luma. The D4c color trials interact with the
  transform; U2 composes both and decides per image by real NET bytes.
- **Post-hoc transform selection**: forbidden; the DCT parameters are
  pinned in addendum 21 BEFORE any measurement; no block size tuning
  after seeing numbers.
- **Scope creep toward format work**: module map contains no container
  edits by construction; a PR touching container files before a U2 PASS
  is rejectable on sight by the Reviewer.

## 6. State and complexity budgets

Encode: one forward DCT per 8x8 block (O(N) total) + standard MED
prediction + entropy coding (O(N)). Total encoder complexity: O(N) with
a small constant factor for the DCT. Wall-clock impact: the DCT is ~2x
the cost of MED prediction, so total encode time increases by ~30-50%
(well within the 5x phase guard per A3 precedent).

Decode: standard MED prediction + entropy coding produces the residual;
one inverse DCT per 8x8 block reconstructs the source. Total decoder
complexity: O(N); mirror-exact by construction (integer DCT is
bijective within rounding bounds).

Memory: O(N) for the block buffers; no second frame buffer beyond the
image itself. Peak RSS logged per I6.

## 7. Builder slicing (continuation granularity)

- Slice R0 (blocking): U0 transform harness + BlockDCT module +
  TransformDomainMED adapter + VB rails + self-checks + DIAGNOSTIC smoke
  CSV (kodim01 only, non-gating) + spec addendum 21 + tracker/log updates.
  Handoff continue.
- Slice R1: U1 quad sweep (pins verified pre-run; rails green first);
  dated CSV + verdicts in tracker + agent log the same day. Conditional
  U2 composition if U1 passes.
- Slice R2: U2 composition + projection vs committed e1 CSV (if opened);
  stop-or-proceed recorded. U3 final gate check against real cjxl/WebP.
- Every slice: pins BEFORE measurement, dated CSV, tracker checklist +
  agent log, honest verdict wording, all rails green first, zero
  container bytes until U2 passes.

## 8. Decision tree (binding)

| outcome | consequence |
|---|---|
| U0 fails (harness broken) | Fix and re-run; no verdict until green |
| U1 fails (< +1.50 pct NET) | Transform domain closed with numbers; recommend honest closure or owner-directed exotic program |
| U1 passes, U2 threshold met (< 9.35 / < 3.117 projected) | Architect blueprints format program behind version bump |
| U2 projects into M3 reach but short | fresh bench_gate.sh; if M2 passes and M3 fails, owner decides between honest close and exotic program |
| everything fails | full negative ledger across C/D/E/V/S/T/U programs; honest close at achieved level; every legitimate mechanism class measured |

Every row keeps the owner freeze intact: nothing merges without M2 AND
M3 passing in BOTH units on a fresh reproducible dual-unit measurement
against real cjxl output; no partial result is ever worded as parity.
The gates are invariant by standing order; only the architecture serves
them.

## 9. Honest projections (restated so no continuation rediscovers optimism)

Starting point: T4 composed projection 9.5671 summed / 3.1890
per-sample bpp. The transform attacks source entropy (the largest single
component); literature range 15-25% residual reduction.

Conservative landing (15%): 8.132 summed / 2.711 per-sample. Both M2
AND M3 PASS.

The risk is not arithmetic but mechanical: does the DCT actually reduce
residual entropy by 15% under MED prediction on photographic content? The
V+S+T programs proved that every entropy-side refinement lost to table
economics; B6 is the first source-side mechanism measured. If it works,
it stacks with the V+S+T composition (the transform is orthogonal to
entropy coding). If it does not work, every legitimate mechanism class
will have been measured and honest closure is the only remaining path.

Stated plainly: **this is the highest-expected-value measurement left in
the program.** The arithmetic is overwhelmingly favorable; the question
is purely mechanical. The U-series is ordered so discovering failure costs
one slice (R0 + R1) and ZERO format bytes.

---

Merge gate unchanged (owner freeze + standing order): M2 AND M3 genuinely
pass dual-unit on a fresh reproducible measurement, decode byte-exact
24/24, fuzz clean, CSV + comparison-table row updated. Invariants I1-I14
apply; L-C1..L-C9 bind; the V+S+T ledgers remain permanent history.

- the Architect
