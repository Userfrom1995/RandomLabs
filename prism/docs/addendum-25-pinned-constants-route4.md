# Spec Addendum 25: Route 4 Beyond-Predictive Pinned Constants

- **Issue:** #130 (Owner directive 2026-08-28T06:24:38Z: proceed with Option 2,
  Exotic Beyond-Predictive Paradigm; lift out of V5 reserve into a first-class
  program; model squad upgraded to hy3-free / mimo-v2.5-free)
- **Author:** the Architect (pinned per Researcher handoff `research-route4-beyond-predictive.md`)
- **Status:** PINNED - every X-series phase (X0 through X5) MUST use these exact
  values. No measurement may precede this addendum. Any deviation requires a new
  addendum numbered sequentially (addendum 26+).

All numbers below are carried verbatim from the research spec. No "fresh" value
may be injected at measurement time without a new addendum.

---

## 1. Wavelet Lift Parameters (reversible integer-to-integer)

| Constant | Value | Rationale |
|---|---|---|
| `X_FILTER_CANDIDATES` | {Haar (2/2), Le Gall 5/3, Reversible 9/7} | All integer-lift, exactly invertible |
| `X_FILTER_ID_HAAR` | 0 | Baseline control (low compaction) |
| `X_FILTER_ID_53` | 1 | **PRIMARY** (J2K lossless standard, best balance) |
| `X_FILTER_ID_97` | 2 | Sweep candidate (best compaction, slightly higher rounding overhead) |
| `X_DEFAULT_FILTER` | `X_FILTER_ID_53` | Default primary for X1-X4 |
| `X_LEVELS_CANDIDATES` | {4, 5, 6} | Decomposition depth sweep |
| `X_DEFAULT_LEVELS` | 5 | Default for 768x512 (coarsest subband ~24x16) |
| `X_BORDER_MODE` | symmetric (reflect/replicate) | Lossless lift at plane edges |
| `X_LIFT_DOMAIN` | full plane (NOT 8x8 blocks) | Multiresolution decorrelation, unlike U1 |

### 1.1 Reversibility invariant (I26)

`lift_inv(lift(x)) == x` MUST hold for ALL integer inputs in [0,255] (and for the
full coefficient range after the color transform). Proven by a VB rail
(`VB-X-LIFT-FIDELITY`) before ANY X-phase. This is the explicit guard against the
U1 non-reversible-DCT trap (U1 was |fwd(inv(x))-x| <= 1, explicitly NOT byte-exact).

---

## 2. Bitplane Coding Parameters (EBCOT-style passes)

| Constant | Value | Rationale |
|---|---|---|
| `X_PASS_ORDER_CANDIDATES` | {three-pass SP/MR/CL, single-pass MSB-to-LSB} | Both measured in X2 |
| `X_DEFAULT_PASS_ORDER` | three-pass (Significance Propagation / Magnitude Refinement / Cleanup) | Maximizes causal-context utility |
| `X_PLANE_ORDER` | LL first, then HL/LH/HH coarse-to-fine | LL holds most energy; coded with spatial-only context |
| `X_COEFF_ORDER` | raster scan within each subband | Deterministic, decoder-reconstructable |

### 2.1 Fixed Parent-Aware Context Function (I28, pinned)

```
ctx = ORIENTATION_ID          # 0=LL, 1=HL, 2=LH, 3=HH      (2 bits)
    + PARENT_STATE * 4        # 0/1 (parent at same loc exists & is significant)
    + SIG_COUNT_BUCKET * 8    # count of significant 8-neighbors: 0,1,2,3,4+ (3 bits)
```

- Base contexts: 4 * 2 * 5 = 40.
- Separate context pools for SIGN bits and for REFINEMENT bits.
- `X_CONTEXT_POOL_SIZE` = 128 fixed (shared across subbands, extended by orientation offset).
- This context is a FIXED function: zero transmitted tables, so table-economics
  (I27) does NOT re-apply. L-C7 satisfied: every coefficient bit is conditioned on
  its parent significance (spatial orientation tree).

---

## 3. ANS Backend Parameters (reuse, no transmitted tables)

| Constant | Value | Rationale |
|---|---|---|
| `X_ANS_TYPE` | interleaved rANS, 32-bit | Same family as `src/codec/rans.cpp` |
| `X_ANS_STATES` | 16 | Matches v1 interleaving |
| `X_ANS_PRECISION` | 16 (M = 2^16) | Same denominator as `rans.h` |
| `X_ANS_ADAPTIVE` | per-context EMA, shift-5 | Online adaptation, LIFO-safe via causal context |
| `X_ANS_CONTEXTS` | 128 (context pool) | Indexed by the section 2.1 function |
| `X_NET_SIDEINFO` | payload + format-v3 header ONLY | Baked-in model = decoder constant = 0 per-image NET (I29) |

NOTE: the existing `rans.cpp` ships a FIXED-probability binary rANS
(`RANS_SCALE_BITS=16`, `RESIDUAL_PROB=32768`). The X-series requires a
PER-CONTEXT ADAPTIVE binary rANS (EMA shift-5). The Builder implements
`BitplaneRans` with a 128-entry array of adaptive binary models reusing the same
renorm/flush core; the fixed `rans.cpp` remains the v1 production backend and is
NOT modified by X0 (I26: v1 path untouched).

---

## 4. Color Transform (reuse, adopted)

| Constant | Value | Rationale |
|---|---|---|
| `X_COLOR_IDS` | {None, YCoCg-R, D4c ids 7..11} | Same trial set as v1 (L-C1) |
| `X_COLOR_SELECTION` | trial-encoded by real coded bytes | Applied BEFORE the lift |

---

## 5. Wire Format v3 (minimal side info)

```
PRISM v3 Container Layout (little-endian):
[PRSM magic]         4 bytes
[version]            1 byte  = 3
[width]              4 bytes u32
[height]             4 bytes u32
[bit_depth]          1 byte
[num_channels]       1 byte
[color_transform_id] 1 byte  (D4c family)
[filter_id]          1 byte  (0=Haar,1=5/3,2=9/7)
[levels]             1 byte  (L)
[flags]              1 byte
[subband_sizes]      variable: for each subband, (w,u16)+(h,u16) (tiny)
[ans_stream]         variable: interleaved rANS of all bitplane symbols
[crc32]              u32 over all above
```

- Estimated header overhead: filter id + levels + subband sizes + color id =
  well under 64 bytes/image (< 0.0002 bpp). No histograms, no trees, no model blob.
- X0 integration rule (pragmatic, keeps v1 production path intact): during the
  X-series the wavelet path rides the EXISTING v1 envelope (magic + version field
  preserved) with a new `WAVELET_FLAG` (bit 7) set. When `WAVELET_FLAG` is set,
  the standard model section is replaced by a compact wavelet header
  (filter_id, levels, subband dimension table) and the payload is the bitplane
  rANS stream. The pure v3 container above becomes the FORMAT-STABLE target only
  at X4 (the format-freeze PR). Byte-exact round-trip and CRC32 are preserved in
  both representations.
- `WAVELET_FLAG` bit position: bit 7 (0x80) of the existing flags byte.

---

## 6. X-Series Gates (verbatim thresholds)

| Gate | Threshold | Unit | Consequence |
|---|---|---|---|
| X0 exit | all VB rails green + addendum 25 committed + dated CSV | - | X1 may proceed |
| X1 primary | FRAME-WAVELET median NET beats FRAME-SPATIAL median NET by >= +2.0% (decorrelation) | per I10 | lifting decorrelates corpus |
| X1 sub | round-trip byte-exact (I26) | - | lift is reversible |
| X2 primary | FRAME-WAVELET median NET beats e1 by >= +8.0% (10.1210 x 0.92 = 9.31 summed) | summed & per-sample | M2 target with 2% margin |
| X2a | mean summed < 9.498 AND mean per-sample < 3.166 (M2 both units, quad) | both | M2 on quad |
| X2b | model/header overhead <= 0.002 bpp per sample | bpp | table-economics does not re-apply |
| X2c | no image regresses > -1.0% vs its own e1 bytes | per-image | wavelet path never hurts |
| X2d | decode time <= 3x v1 decode time | wall-clock | practicality |
| X3 (X3b) | median NET >= +1.5% over X2 winner (data-free enriched context) | per I10 | ~3.0 -> ~2.9 |
| X3 (X3a) | median NET >= +1.5% over X3b winner (neural, corpus-gated) | per I10 | ~2.9 -> ~2.8 |
| X4 | fresh dual-unit `bench_gate.sh` on full Kodak-24 vs real cjxl (M3) + WebP (M2) | both units | format-stable PR |
| X5a | chroma-subband conditioned on luma-subband, >= +1.0% median NET, no image < -0.5% | per I10 | N4 reserve |
| X5b | L up to 6 sweep, >= +1.0% median NET | per I10 | depth reserve |
| X5c | context pool 64/128/256 fixed (no tables), >= +1.0% median NET | per I10 | pool reserve |

All gates stated in BOTH units where applicable (summed and per-sample), matching
`benchmarks/bench_gate.sh`. No success claim leaves the lab without a fresh
both-units measurement.

---

## 7. Pinned Quad and Corpus

| Constant | Value | Rationale |
|---|---|---|
| `X_PINNED_QUAD` | kodim01, kodim05, kodim13, kodim19 | sha-pinned, same as prior V/S/T/U/R programs |
| `X_FULL_CORPUS` | full Kodak-24 (all 24, sha-pinned) | X4 final gate only |
| `X_BASELINE_E1` | 10.1210 summed / 3.3737 per-sample | Prism v1 production (X2 control) |
| `X_M2` | < 9.498 summed AND < 3.166 per-sample | WebP lossless m6 parity |
| `X_M3` | < 8.655 summed AND < 2.885 per-sample | JPEG XL -d0 -e9 parity |

---

## 8. Invariants Added (I25-I30)

- **I25 (beyond-predictive primacy):** coding moves from predictive-residual to
  wavelet+bitplane domain; MED/GAP/W pixel predictor is NOT the primary mechanism.
- **I26 (reversible lift):** `lift_inv(lift(x)) == x` for all integer inputs,
  proven by VB rail before any X-phase. Guard against U1 trap.
- **I27 (no transmitted tables):** context model is a FIXED function (hand-designed
  or baked-in learned), adapted online with zero transmitted probabilities/trees.
- **I28 (parent-aware, L-C7):** every coefficient bit conditioned on parent
  significance (spatial orientation tree). Owner-authorized out of V5 reserve.
- **I29 (learned-model side-info rule):** baked-in learned model = 0 per-image NET.
  A transmitted per-image model MUST be NET-accounted and voids I27 for that track.
- **I30 (honest M3 reporting):** if X3a gated out for lack of corpus, X4 is
  reported "M2 PASS / M3 PENDING corpus authorization," never "M3 PASS."

---

## 9. What This Is NOT (anti-re-litigation guard)

- NOT U1 (non-reversible DCT value prediction): reversible lift (I26) + bit coding (no value prediction).
- NOT C4/C5 (parent-blind lift coding): parent-aware bitplane context (I28).
- NOT Route 3 / Route 1 (transmitted histograms / MA-trees): zero transmitted tables (I27).
- NOT Route 2 (residual binarization): changes DOMAIN (wavelet) and CODING (bitplane).

---

- the Architect
