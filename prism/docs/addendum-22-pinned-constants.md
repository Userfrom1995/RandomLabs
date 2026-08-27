# Spec Addendum 22: Route 3 Pinned Constants

- **Issue:** #130 (Route 3 modular redesign)
- **Date:** 2026-08-27
- **Author:** the Builder
- **Status:** PINNED - all measurement phases (R0-R5) must use these exact values.

All constants below are pinned for the entire R-series. No measurement may
proceed until this addendum is committed. Any deviation requires a new
addendum numbered sequentially.

---

## 1. MA-Tree Parameters

| Constant | Value | Rationale |
|---|---|---|
| `MA_MAX_DEPTH` | 10 | Same as Prism v1; depth > 10 overfits |
| `MA_MIN_SAMPLES_PER_LEAF` | 4096 | Ensures histograms are statistically reliable for 12-bit normalization |
| `MA_MAX_LEAVES` | 256 | Upper bound on cluster count |
| `MA_FEATURE_QG` | enabled | Quantized gradient magnitude |
| `MA_FEATURE_BAND_CLASS` | enabled | Always 0 (single-resolution) in R-series |
| `MA_FEATURE_ACTIVITY` | enabled | 4-level local activity |
| `MA_FEATURE_POSITION` | enabled | Normalized (x,y) coordinates (0..255) |
| `MA_SPLIT_CRITERION` | variance reduction | Entropy-based greedy splitting |

## 2. Histogram Parameters

| Constant | Value | Rationale |
|---|---|---|
| `HIST_ALPHABET_ZFF` | 34 | Zero-flag-first: zero flag, sign, unary quotient, MSB remainder |
| `HIST_ALPHABET_HYB` | computed | T_ESC + ceil(log2(max_residual)) + 1 (varies per image) |
| `HIST_SMOOTH_ALPHA` | 1.0 | Pseudo-count weight |
| `HIST_SMOOTH_R` | 15.0/16.0 | Geometric decay toward pooled prior |
| `HIST_NORMALIZE_BITS` | 12 | Sum = 4096 for ANS coding |
| `HIST_DELTA_CODED` | yes | Hierarchical delta from global prior |

## 3. ANS Parameters

| Constant | Value | Rationale |
|---|---|---|
| `ANS_NUM_STATES` | 16 | Interleaved rANS (same as Prism v1) |
| `ANS_PRECISION` | 12 | Matches histogram normalization |
| `ANS_LIFO` | yes | Interleaved rANS is LIFO by construction |
| `ANS_STATIC_PROBS` | yes | No epsilon-adaptation in R-series |

## 4. Hybrid-Uint Parameters

| Constant | Value | Rationale |
|---|---|---|
| `HYB_T_ESC_R3` | 8 | Escape ladder for R-series (measured in R3) |
| `HYB_SIGN_AFTER_NONZERO` | yes | L-C5 ordering rule |
| `HYB_ZERO_TOKEN` | 0 | Dedicated zero token |
| `HYB_ZIGZAG_FOLD` | yes | Signed -> unsigned mapping |

## 5. Color Transform Parameters

| Constant | Value | Rationale |
|---|---|---|
| `COLOR_XFORM_TRIALS` | {None, YCoCgR, D4c ids 7..11} | Same as Prism v1; trial-selected by real coded bytes |
| `COLOR_XFORM_SELECTION` | trial-encoded | Pass 1 evaluates, Pass 2 uses winner |

## 6. Wire Format

| Constant | Value | Rationale |
|---|---|---|
| `PRISM_CONTAINER_VERSION` | 1 | Backward-compatible extension via MULTIPASS_FLAG |
| `PRISM_MAGIC` | 'P','R','S','M' | Unchanged |
| `MULTIPASS_FLAG` | 0x80 (bit7) | Container carries R3 multi-pass ANS data |
| `R3_MODEL_LOCATION` | after standard model, before payloads | Length-prefixed blob: MA-tree + histograms + cluster IDs |

## 7. R-Series Gate Thresholds

| Gate | Threshold | Consequence |
|---|---|---|
| R0 exit | All VB rails green + spec addendum 22 committed + dated CSV | R1 may proceed |
| R1 primary | FRAME-MULTI median NET >= +5.0% over FRAME-SINGLE | Route 3 architecturally viable |
| R1 sub-gate R1a | payload reduction >= +3.0% | Collection layer improvement confirmed |
| R1 sub-gate R1b | model overhead <= 0.02 bpp per sample | Side-info cost bounded |
| R1 sub-gate R1c | no image regresses > -1.0% | No catastrophic outlier |
| R2 | >= +0.5% NET improvement over R1 winner | MA-tree optimization justified |
| R3 bar (i) | best non-MED >= +1.50% over MED | Predictor lever quantified |
| R4 threshold | projected < 9.35 summed AND < 3.117 per-sample | M2 PASS (2% margin) |
| M2 | summed < 9.498 AND per-sample < 3.166 | Merge gate |
| M3 | summed < 8.655 AND per-sample < 2.885 | Stretch goal |

## 8. Cascade Logic

| Phase | Failure | Consequence |
|---|---|---|
| R0 | Harness broken | Fix and re-run; no verdict until green |
| R1 | < +5.0% NET | Route 3 architecturally infeasible; cascade to Route 1 |
| R4 | Misses M2 | Report with full ledger; owner decides Route 1 or closure |
| R4 | Passes M2 but not M3 | Open R5 reserve; if R5 fails, owner decides |
| R5 | Fails all sub-phases | Full negative ledger; honest closure |

---

- the Builder
