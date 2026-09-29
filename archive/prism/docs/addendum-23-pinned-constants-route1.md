# Spec Addendum 23: Route 1 Adaptive Refinement Pinned Constants

- **Issue:** #130 (Route 1 adaptive backend refinement)
- **Date:** 2026-08-27
- **Author:** the Architect
- **Status:** PINNED - all measurement phases (R1-0 through R1-5) must use these exact values.

All constants below are pinned for the entire R1-series. No measurement may proceed until this addendum is committed. Any deviation requires a new addendum numbered sequentially.

---

## 1. MA-Tree Parameters

| Constant | Value | Rationale |
|---|---|---|
| `R1_MA_MAX_DEPTH` | 10 | Same as Prism v1; depth > 10 overfits |
| `R1_MA_MIN_SAMPLES_PER_LEAF` | 4096 | Ensures statistical reliability |
| `R1_MA_MAX_LEAVES` | 256 | Upper bound on cluster count |
| `R1_MA_FEATURE_QG` | enabled | Quantized gradient magnitude |
| `R1_MA_FEATURE_BAND_CLASS` | enabled | Always 0 (single-resolution) in R1-series |
| `R1_MA_FEATURE_ACTIVITY` | enabled | 4-level local activity |
| `R1_MA_FEATURE_POSITION` | enabled | Normalized (x,y) coordinates (0..255) |
| `R1_MA_SPLIT_CRITERION` | histogram entropy | Entropy-based greedy splitting (not variance) |

## 2. Adaptive Coding Parameters

| Constant | Value | Rationale |
|---|---|---|
| `R1_ADAPTIVE_CODER` | ACoderV2 | v1's adaptive range coder with per-leaf probability states |
| `R1_ADAPTIVE_LEAF_CONTEXTS` | per-leaf | Each leaf gets its own adaptive probability model |
| `R1_ADAPTIVE_UNIFORM_PRIORS` | false | Use v1's default class priors (not uniform) |
| `R1_ADAPTIVE_PRESEED` | false (R1-0), true (R1-4) | Pre-seeding measured in R1-4 |
| `R1_ADAPTIVE_EMA_ALPHA` | v1 default | Same as v1's EMA adaptation rate |

## 3. Wire Format

| Constant | Value | Rationale |
|---|---|---|
| `R1_CONTAINER_VERSION` | 1 | Backward-compatible extension via MULTIPASS_FLAG |
| `R1_MAGIC` | 'P','R','S','M' | Unchanged |
| `R1_MULTIPASS_FLAG` | 0x80 (bit7) | Container carries Route 1 multi-pass data |
| `R1_MODEL_LOCATION` | after standard model, before payloads | Length-prefixed blob: MA-tree only (no histograms) |

## 4. R1-Series Gate Thresholds

| Gate | Threshold | Consequence |
|---|---|---|
| R1-0 exit | All VB rails green + spec addendum 23 committed + dated CSV | R1-1 may proceed |
| R1-1 primary | FRAME-R1 median NET >= +0.5% over FRAME-V1 | Multi-pass adaptive offers gain |
| R1-1 sub-gate R1-1a | model overhead <= 0.005 bpp per sample | MA-tree-only side-info cost bounded |
| R1-1 sub-gate R1-1b | no image regresses > -0.5% | No catastrophic outlier |
| R1-1 sub-gate R1-1c | decode time <= 1.5x v1 decode time | MA-tree evaluation overhead bounded |
| R1-2 | >= +0.3% NET improvement over R1-1 winner | Entropy-based splitting justified |
| R1-3 | >= +0.3% NET improvement over R1-2 winner | ResDiff + sibling_class features justified |
| R1-4 | >= +0.1% NET improvement | Pre-seeded adaptive coding justified |
| R1-5 threshold | projected < 9.35 summed AND < 3.117 per-sample | M2 PASS (2% margin) |

## 5. Cascade Logic

| Phase | Failure | Consequence |
|---|---|---|
| R1-0 | Harness broken | Fix and re-run; no verdict until green |
| R1-1 | < +0.5% NET | Multi-pass adaptive offers no gain; report ledger, owner decides |
| R1-5 | Misses M2 | Report full ledger; owner decides next route |

---

- the Architect