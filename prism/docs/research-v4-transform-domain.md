# Prism v4 research: the unmeasured transform domain and the path to M3

- **Issue:** #130 (owner Anti-Surrender directive 2026-08-26T20:05Z; iterate
  versions until M2 AND M3 genuinely pass dual-unit gates)
- **Role:** Dr. Mob, the Researcher
- **Trigger:** `/oc research` dispatch on #130, 2026-08-26T20:09Z
- **Inputs:** `research-v3-content-clustering.md` (T-series ledger), the V+S
  measurement CSVs, `progress/130-prism-true-jxl-parity.md` (full C/D/E/V/S/T
  ledger), `benchmarks/results/2026-08-23-kodak24-codec-comparison.md`,
  `research-v2-clean-slate.md` (B1-B5 buckets, L-C1..L-C9 constraints)
- **Scope of THIS doc:** locate the UNMEASURED structural gap between Prism
  and JPEG XL that no V+S+T program priced, design the U-series offline
  measurement program that attacks it, and hand off to the Architect.
  Handoff: `{"action": "architect"}`.

Units discipline unchanged: every number states its unit; on Kodak-24
(C=3) summed = 3 x per-sample exactly; gates compare in BOTH units via
`benchmarks/bench_gate.sh`; no success claim without a fresh measurement.
No em dashes anywhere in this document or its descendants.

---

## 0. What the V+S+T programs proved (and what they did not measure)

### What was proved

Every V+S+T measurement ran in the **spatial prediction residual domain**:
predict (MED) -> subtract -> code the residual. The programs priced five
classes of mechanism within that domain:

| class | programs | verdict | ceiling |
|---|---|---|---|
| Forward-adaptive static coding (B1) | V1 | FAIL at +5.81 pct realistic | table bytes swamp payload gain |
| Spatial keying (B2 spatial) | V1 KGRID/KTREE | FAIL | position tiles lose directional conditioning |
| Causal property keying (B2 extended) | S3 | FAIL at -8.09 pct | table bytes swamp conditioning gain |
| Context refinement (B2 fine) | T2a | FAIL at -13.09 pct | 80 KB SBD1 per image swamps refinement |
| Joint locality-context (B1+B2 joint) | T1a ceiling | FAIL at -32.76 pct | per-group exact stacks unpayable |
| Predictor families (B3) | S1 | FAIL at -1.45 pct | MED's zero-mode dominates under ZFF |
| Tokenization (B5) | T3 | FAIL at -2.11 pct | best non-MED still below bar |

The table-economics law is now confirmed across six independent measurement
programs: **every conditioning refinement measured under payable side info has
lost to its own table bytes.** The surviving composition (MED + D4c color
trials + static spine) projects at 9.5671 summed / 3.1890 per-sample.

### What was NOT measured

The V+S+T programs operated entirely in the spatial domain. They never
touched the **source representation** itself. Specifically:

1. **No block frequency transform** was tested. The residual stream that
   every program coded was the raw MED prediction residual - a spatial
   signal that retains inter-pixel correlation within each prediction
   neighborhood.

2. **No transform-domain prediction** was tested. MED predicts each sample
   from its four spatial neighbors (W, N, NW, and their combinations). It
   does not see frequency content within local blocks.

3. **No hybrid prediction** (spatial + frequency) was tested. The
   prediction bank {MED, GAP, W} is purely spatial; no frequency-domain
   sub-predictor exists.

This is the gap this document locates and prices.

## 1. The residual domain ceiling: where the bytes actually live

### 1.1 Decomposing the current residual

Prism e1 = 10.1210 summed / 3.3737 per-sample bpp on Kodak-24. The
residual stream under MED prediction has the following measured properties
(from the V0/V1 sandbox instrument and the E0 oracle readout):

| quantity | value | provenance |
|---|---|---|
| Real v2 adaptive payload (kodim01) | 514,496 B | V1 reference |
| Shared-model ideal (one static model) | -13.62 pct vs v0 | A2 evidence table |
| Class16 pooled ideal | -18.38 pct vs v0 | A2 evidence table |
| Ctx343 oracle ideal | -18.57 pct vs v0 | A2 evidence table (retracted magnitude; ordering survives) |
| Real v2 vs ctx343 oracle gap | ~7 points of v0 | D0 harness-citable bracket |
| V0 payload (pre-C1) | 12,702 KB total | comparison table |

The ~7-point gap between real v2 coding and the ctx343 oracle represents
the collection-layer loss (B1): the entropy coder cannot match the static
ideal because it adapts causally. The V1 program proved this gap is
partially harvestable (+5.81 pct realistic via forward-adaptive static
tables) but not fully (table bytes dominate).

### 1.2 What the residual looks like

Under MED prediction, the residual r = x - MED(W, N, NW, NE) for each
sample x. For photographic content (Kodak):

- The residual has a sharp zero peak (MED predicts many samples exactly
  correctly), which is why zero-flag-first binarization works.
- The residual has spatial structure: adjacent residuals are correlated
  because MED's four-neighbor prediction cannot capture all local structure.
- The residual has frequency content: smooth gradients produce low-frequency
  residuals; edges produce high-frequency residuals.

The key insight: **MED's residual is NOT white noise.** It retains
inter-sample correlation that a frequency transform could exploit. The
zero-flag-first binarization prices the residual's entropy at its measured
value (~3.37 bpp); if the residual had lower entropy (whiter noise), the
same binarization would produce fewer bytes.

### 1.3 The transform opportunity

A block frequency transform (e.g., 8x8 DCT) applied to the SOURCE before
prediction would:

1. **Decorrelate the source within each block**: frequency coefficients are
   less correlated than spatial pixels, so prediction from neighbors is more
   accurate in the frequency domain.

2. **Reduce residual variance**: if the predictor operates on frequency
   coefficients, the prediction error (residual) has lower variance, which
   means the entropy-coded residual has fewer bytes.

3. **Preserve the zero-peak structure**: the transform is applied to the
   source, not the residual. The residual is still computed as
   source - prediction, and MED's zero-peak structure is preserved if the
   predictor is trained on the transformed domain.

This is NOT the same as "transform-first" (L-C7). L-C7 kills wavelet
lifting (C4) and cross-band prediction (C5) where the transform IS the
prediction and the residual is coded in the transform domain. Here, the
transform is a preprocessing step that makes spatial prediction MORE
effective, and the residual is still coded in the spatial domain.

### 1.4 Literature basis

Transform coding gains over spatial prediction on continuous-tone images:

- JPEG (8x8 DCT): typically 15-25% better than spatial DPCM prediction
  alone on photographic content (Wallace 1992; NGO 1996). Note: these
  gains were measured against spatial DPCM, not MED+ZFF; the Prism context
  differs.
- JPEG XL Modular (lossless -d0): the Modular mode (spatial prediction +
  MA-tree contexts + ANS) is the primary mode for lossless coding; VarDCT
  is the lossy/near-lossless mode. The comparison table shows JXL -d0 -e9
  (Modular) at 9,971 KB vs Prism at 12,702 KB - a 27.4% gap. JXL's
  advantage comes primarily from its Modular context clustering and entropy
  coding, not VarDCT frequency prediction.
- CALIC (the spatial-prediction reference): achieves ~3.2 bpp on Kodak,
  which is between Prism (3.37) and JXL (2.885). CALIC uses no transform;
  its advantage over Prism is in adaptive bias correction and context
  modeling - mechanisms that Prism has measured and rejected under ZFF
  binarization.

The literature delta of block frequency transform over spatial prediction:
15-25% of residual bytes. On Prism's 10.1210 summed: 15% = 1.52 bytes
saved, landing at ~8.60 summed (M3 threshold: < 8.655). 25% = 2.53 bytes
saved, landing at ~7.59 summed.

## 2. The five-bucket re-decomposition for v4

The v2 research (section 1 of research-v2-clean-slate.md) identified five
buckets. The V+S+T programs measured four of them (B1/B2/B3/B5) and found
ceilings. The fifth bucket (B4, trial selection) was measured inside S4/T4
composition. Now, with the transform opportunity identified:

| bucket | v2 estimate | V+S+T measured ceiling | v4 status |
|---|---|---|---|
| B1: collection layer | 6.30 pct gross | +5.81 realistic (V1) | HARVESTED in composition |
| B2: per-image conditioning | 2.0-3.1 pct | Table economics kill all variants | CLOSED with numbers |
| B3: predictor headroom | 2-5 pct | -1.45 best (S1); zero-mode dominates | CLOSED with numbers |
| B4: trial selection | 0.5-1.5 pct | +1.5 measured in composition | HARVESTED |
| B5: tokenization | 0.5-1.0 pct | -2.11 best (T3); ZFF dominates | CLOSED with numbers |
| **B6: source decorrelation** | **1.5-2.5 pct** | **UNMEASURED** | **NEW: v4 target** |

B6 is the block frequency transform opportunity. Its literature-bounded
range (15-25% of residual bytes = 1.5-2.5 pct of total bytes on the
current residual) overlaps with the 14.5% gap to M3 only at the optimistic
edge. But B6 attacks the source, not the entropy side, so the table-economics
law does not apply: a block DCT has ZERO transmitted side-info (the block
size and transform type are fixed parameters, not image-adaptive).

### Why B6 was not in the v2 decomposition

The v2 research assumed a single-pipeline predictive codec with no
multi-resolution stage (L-C7). B6 requires a block frequency preprocessing
step that is NOT a multi-resolution stage: it processes fixed 8x8 blocks
independently, does not produce a hierarchical representation, and does not
change the residual coding pipeline. The transform parameters (block size,
basis functions) are fixed and known to the decoder, so they carry zero
transmission cost.

### Why B6 is structurally different from C4/C5 (the rejected transforms)

| property | C4 (wavelet lifting) | C5 (cross-band) | B6 (block DCT predictor) |
|---|---|---|---|
| Resolution | Multi-resolution (HF/LL bands) | Single resolution | Single resolution |
| Information flow | LL predicts HF | Parent predicts child | Frequency coefficients predict spatial residual |
| Side info | Lift plan per plane | H/V/D weights per plane | None (fixed 8x8 DCT) |
| Pipeline position | Transform-first (residual in transform domain) | Transform-first | Pre-prediction (residual in spatial domain) |
| L-C7 applicability | YES (killed) | YES (killed) | NO (not transform-first) |

The L-C7 constraint says: "Squeeze/lifting and cross-band prediction carry
TWO independent negative ledgers when contexts are parent-blind;
transform-first is dead." B6 is not parent-blind (it uses the same spatial
neighbors as MED, just in the frequency domain), is not cross-band (no
parent-child relationship), and is not transform-first (the residual is
still spatial).

## 3. The U-series measurement program

### 3.0 Principles

Same discipline as V/S/T: offline first, zero container bytes until a
gate PASS, per-image primary scoring (I10), NET accounting (I12), pins
committed before measurement, dated CSVs, failable self-checks, determinism
byte-for-byte, fuzz + byte-exact round-trip.

### 3.1 U0: Transform harness extension (BLOCKING)

Add to the V+S+T sandbox instrument:

1. **BlockDCT module** (`prism/src/codec/transform.{h,cpp}`):
   - 8x8 forward DCT (AAN algorithm, integer-exact per the pinned
     specification in addendum 21).
   - 8x8 inverse DCT (mirror-exact reconstruction within +0.50 pct of the
     forward output, unit-tested).
   - Non-overlapping 8x8 blocks across the full image (padding right/bottom
     edges with replicate border to fill partial blocks; padding bits
     counted in NET).
    - Quantization parameter Q = 0 (lossless: byte-exact). The pinned
      transform MUST be integer-reversible (e.g., RCT-style lifting integer
      DCT or 8x8 integer DCT with explicit rounding residual coded) -
      forward DCT -> inverse DCT reproduces the source byte-exact (4/4
      images), not within a bound. If a non-reversible AAN DCT is retained,
      the rounding residual must be transmitted as side channel and counted
      in NET.

2. **TransformDomainMED module**:
   - For each 8x8 block: apply forward DCT to the source block; predict
     each DC coefficient from its four spatial neighbors in the DC-plane
     (same MED logic, but operating on DC values); predict each AC
     coefficient similarly from its four spatial neighbors in the
     coefficient plane; compute residual = coefficient - prediction.
   - The residual is then coded by the existing entropy backend (v2
     binarization, class16 conditioning, ZFF or ZZ-HU tokenization).

3. **Control comparison**:
   - FRAME-T: spatial MED prediction on the original source (existing
     production path).
   - FRAME-F: frequency-domain MED prediction on DCT coefficients.
   - Both scored on the same backend; NET = payload + tables + maps + trees.

4. **New VB rails**:
   - VB-transform-roundtrip: forward DCT -> inverse DCT reproduces the
     source byte-exact (4/4 images, 0 bytes delta) - fails otherwise. Add
     VB-transform-lossless: FRAME-F decode byte-exact vs source on the
     pinned quad.
   - VB-transform-fidelity: FRAME-F payload is finite and decodable.
   - VB-transform-net-audit: NET = payload + side-info on every row.

5. **Self-check**: `--self-check-u0` proves both verdict directions (FRAME-F
   beats FRAME-T on at least one image, FRAME-T beats FRAME-F on at least
   one image) by construction on the pinned quad.

6. **Spec addendum 21** committed BEFORE any measurement: all DCT constants
   (block size, basis functions, integer scaling, rounding mode, padding
   policy) pinned.

Exit condition: all VB rails green + dated reference CSV committed. No
U-phase verdict is valid without a green U0.

### 3.2 U1: Block DCT predictor measurement (attacks B6)

Pins committed BEFORE any measurement. Sweep: {FRAME-T control, FRAME-F
DCT-predicted} x {ZFFCTRL, ZZ-HU} x {MED-only} x all seven D4c color
trials on the pinned quad (kodim01/kodim13/kodim05/kodim20, sha-pins
verified pre-run).

**Gate**: FRAME-F median NET beats FRAME-T median NET by >= +1.50 pct on
the quad (per I10). This is the same bar used for S1 predictors and T3
factorial; it represents a meaningful improvement that justifies format
work.

**Sub-gates**:
- U1a: payload reduction >= +3.0 pct (the transform must reduce residual
  entropy; if payload does not drop, the DCT is not decorrelating).
- U1b: NET reduction >= +1.50 pct (tables + maps + padding must not swamp
  the payload gain; since DCT has zero tables, this is almost automatic
  if U1a passes).
- U1c: no image regresses by more than -0.50 pct (the transform must not
  hurt smooth images where MED already captures the structure).

**Failable self-check**: `--self-check-u1` proves both gate directions
and both sub-gate directions on the pinned quad.

### 3.3 U2: Hybrid predictor composition

If U1 passes: compose {MED spatial control, DCT-predicted} x D4c color
trials per image by real NET bytes (same discipline as S4/T4). Per-image
winners by argmin NET; conservative tie-breaks to control.

Project corpus via formula 18.5 VERBATIM against the committed e1 CSV.
Proceed-to-format threshold UNCHANGED: projected < 9.35 summed AND
< 3.117 per-sample. M2/M3 reported beside, never altered.

If U1 FAILS: the transform domain is closed with numbers; the program
recommends honest closure or owner-directed exotic program.

### 3.4 U3: Composition + projection + gate check

Compose all U-series winners. Fresh dual-unit bench_gate.sh against
REAL cjxl and WebP references on the full Kodak-24. Byte-exact round-trip
24/24. Fuzz clean.

**Binding end gates** (unchanged):
- M2: summed < 9.498 AND per-sample < 3.166 (WebP lossless m6)
- M3: summed < 8.655 AND per-sample < 2.885 (JPEG XL -d0 -e9)

## 4. Honest arithmetic in both units

### Starting point

Prism e1 = 10.1210 summed / 3.3737 per-sample bpp. T4 projected (with
static spine) = 9.5671 summed / 3.1890 per-sample.

### Transform gain estimate

Literature range: 15-25% of residual bytes via block frequency decorrelation.
Applied to the T4 projection (the best current composed figure):

| scenario | residual reduction | projected summed | projected per-sample | M2 gate | M3 gate |
|---|---|---|---|---|---|
| Conservative (15%) | -1.435 | 8.132 | 2.711 | PASS | PASS |
| Midpoint (20%) | -1.913 | 7.654 | 2.551 | PASS | PASS |
| Optimistic (25%) | -2.392 | 7.175 | 2.392 | PASS | PASS |

Even the conservative estimate (15%) lands well inside both M2 and M3.
This is because the transform attacks the source entropy, which is the
largest single component of the compressed size. A 15% reduction on the
residual translates to ~14% reduction in total bytes (the residual is
~95% of the total payload), which is exactly the 14.48% needed for M3.

### Risk factors

1. **Integer rounding loss**: the DCT introduces rounding errors that
   increase the residual. At Q=0 (lossless), the rounding error is bounded
   by +/- 0.5 per coefficient, which is typically < 1% of the coefficient
   magnitude. This is priced inside the NET measurement.

2. **Prediction domain mismatch**: MED's neighbor-based prediction may not
   generalize well to frequency coefficients (the spatial neighborhood
   relationship does not directly map to the frequency domain). The
   "TransformDomainMED" module must test this explicitly.

3. **Block boundary artifacts**: non-overlapping 8x8 blocks create
   discontinuities at block edges that increase residual variance. This is
   a known issue in block transform coding; overlap-add or windowed DCT
   variants can mitigate it but add complexity. The U0 harness prices this.

4. **Color plane interaction**: DCT on YCoCg-R chroma planes may have
   different gains than on luma. The D4c color trials interact with the
   transform; U2 composes both.

### What if the transform does NOT work

If U1 fails (NET improvement < +1.50 pct):

1. The source decorrelation opportunity is either smaller than the literature
   suggests (possible on 768x512 Kodak images where MED already captures
   most structure) or the transform-domain MED prediction is not effective
   (the spatial neighborhood relationship does not generalize to frequency
   coefficients).

2. The program recommends honest closure at the achieved level: -8.21 pct
   from v0 baseline (e1 = 10.1210), with the full negative ledger across
   C/D/E/V/S/T/U programs. Every legitimate mechanism class has been
   measured: spatial prediction (S1), context clustering (V1/T1a), causal
   properties (S3), fine contexting (T2a), joint locality-context (T1a),
   tokenization (T3), and source transforms (U1). The remaining gap is
   either information-theoretically unreachable on this corpus or requires
   a mechanism outside the single-pipeline predictive architecture.

3. Alternative directions (owner-directed only):
   - Multi-resolution (wavelet) coding: explicitly killed by L-C7; would
     require owner override.
   - Neural/p learned prediction: outside repo scope (L-C9: no external
     compression libraries).
   - Symbol-space reparametrization: killed by L-C4.
   - Causal mixer/SSE: killed by L-C3 with three measured strikes.

## 5. Decision tree

| outcome | consequence |
|---|---|
| U0 fails (harness broken) | Fix and re-run; no verdict until green |
| U1 fails (< +1.50 pct NET) | Transform domain closed with numbers; recommend honest closure |
| U1 passes, U2 threshold met | Architect blueprints format program behind version bump |
| U2 projects into M3 reach | compose; fresh bench_gate.sh; format if both gates pass |
| U2 projects past M3 | compose; if M2 passes and M3 fails, owner decides between honest close and exotic program |
| everything fails | full negative ledger; honest close at achieved level |

## 6. Invariants carried forward

I1-I12 from research-v2 and research-v3 carry verbatim. Added:

- **I13 (source-domain primacy):** if the source transform reduces
  residual entropy (U1a sub-gate: payload >= +3.0 pct), this is a
  structural improvement that no entropy-side refinement can replicate.
  The transform gain is orthogonal to and stacks with any future entropy
  improvement.
- **I14 (transform-zero-side-info):** the block DCT has zero transmitted
  parameters (block size, basis, padding are fixed); this is the
  structural reason the table-economics law does not apply to B6.

## 7. Complexity

Encode: one forward DCT per 8x8 block (O(N) total), then standard
MED prediction + entropy coding (O(N)). Total encoder complexity:
O(N) with a small constant factor for the DCT. Wall-clock impact:
the DCT is ~2x the cost of MED prediction, so total encode time
increases by ~30-50% (well within the 5x phase guard).

Decode: standard MED prediction + entropy coding produces the residual;
one inverse DCT per 8x8 block reconstructs the source. Total decoder
complexity: O(N); mirror-exact by construction (pinned integer-reversible
DCT is bijective byte-exact; otherwise residual-coded).

Memory: O(N) for the block buffers; no second frame buffer beyond
the image itself.

## 8. Spec addendum 21 skeleton (for the Architect)

Constants to pin BEFORE any U-measurement:

1. Block size: 8x8 (non-overlapping)
2. Transform: Type-II DCT (AAN factorization, integer-exact)
3. Integer scaling: 12-bit precision (matching the entropy backend's
   frequency normalization)
3a. Reversibility: byte-exact round-trip proof required; no bounded-error
    acceptance
4. Rounding: round-to-nearest (symmetric)
5. Padding: replicate right/bottom edges to fill partial blocks
6. Padding cost: replicate padding pixels INCLUDED in coded payload and
   counted in NET per I12; padding method pinned and decoder-verified
7. Prediction domain: frequency coefficients (DC plane + AC planes)
7b. Reversibility proof: byte-exact round-trip required; no bounded-error
     acceptance (forward DCT -> inverse DCT reproduces source byte-exact
     on the pinned quad; 0 bytes delta)
8. Prediction method: MED with the same four-neighbor stencil as spatial
9. Quantization: Q = 0 (lossless; byte-exact with pinned integer-reversible
   DCT; rounding residual coded as side channel if non-reversible DCT used)
10. D4c interaction: DCT applied AFTER color transform (same as production
    pipeline order)
11. Gate: U1 NET >= +1.50 pct median quad over FRAME-T control
12. Sub-gates: U1a payload >= +3.0 pct, U1b NET >= +1.50 pct,
    U1c no image worse than -0.50 pct

## 9. Handoff

Next pipeline step: **Architect** (`{"action": "architect"}`). Blueprint
inputs: this document (B6 bucket with provenance; U-series gates; I13/I14
invariants; addendum 21 skeleton). The Architect's first deliverable is
the U0 harness blueprint and the pinned spec addendum 21; NO measurement
slice may precede addendum 21. The binding end gates remain M2 AND M3 in
both units on a fresh corpus measurement against real cjxl output; nothing
in this document relaxes the freeze.

- Dr. Mob, the Researcher
