# Spec Addendum 24: Route 2 Hybrid-Uint Pinned Constants

- **Issue:** #130 (Route 2 hybrid-uint binarization)
- **Date:** 2026-08-27
- **Author:** Dr. Mob, the Researcher
- **Status:** PINNED - all measurement phases (R2-0 through R2-3) must use these exact values.

All constants below are pinned for the entire R2-series. No measurement may proceed until this addendum is committed. Any deviation requires a new addendum numbered sequentially.

---

## 1. Hybrid-Uint Token Parameters

| Constant | Value | Rationale |
|---|---|---|
| `R2_T_ESC_CANDIDATES` | {4, 8, 16} | Sweep in R2-1; T_ESC=4 is minimal (5 tokens), T_ESC=16 is generous (17 tokens) |
| `R2_ZIGZAG_FOLD` | (r << 1) ^ (r >> 31) | Standard zigzag mapping from signed to unsigned (pin D13) |
| `R2_ZIGZAG_UNFOLD` | (u >> 1) ^ (-(u & 1)) | Inverse zigzag |
| `R2_ESCAPE_M_OFFSET` | u - T_ESC + 1 | Pin D1: m >= 1 for all escape values |
| `R2_RAW_BITS_HANDLING` | Literal write/read (pin D3) | Raw bits are not adaptive; written as literal bits after escape quotient |

## 2. Adaptive Coding Parameters

| Constant | Value | Rationale |
|---|---|---|
| `R2_ADAPTIVE_CODER` | ACoderV2 | v1's adaptive binary range coder (proven efficient, A-share 0.073) |
| `R2_MODEL_SETS` | token, sign, escq | Three model sets: token (T_ESC+1 alphabet via binary tree), sign (binary), escq (binary continuation) |
| `R2_ADAPTIVE_EMA_ALPHA` | v1 default (shift-5) | Same adaptation rate as v1 |
| `R2_UNIFORM_PRIORS` | false (default), true (R2-1 control) | Uniform prior measured as control in R2-1 |

## 3. Context Model

| Constant | Value | Rationale |
|---|---|---|
| `R2_CONTEXT_COUNT` | 343 | Same as v1 residual-diff contexts (QG x QG x QG quantization) |
| `R2_CLASS_PRIORS` | 16 directional classes | Same as v1 |
| `R2_CONTEXT_COMPUTATION` | residual_diff_context(dL, dU, dUL) | Same as v1: (qL*7 + qU)*7 + qUL, q in 0..6 |

## 4. Wire Format

| Constant | Value | Rationale |
|---|---|---|
| `R2_CONTAINER_VERSION` | 1 | Backward-compatible extension via flag bit |
| `R2_MAGIC` | 'P','R','S','M' | Unchanged |
| `R2_HYBRID_FLAG` | 0x40 (bit6) | Container carries Route 2 hybrid-uint data |
| `R2_MODEL_LOCATION` | In-header (same as v1) | No separate model section; contexts are implicit |

## 5. Binary Tree Token Coding

The token alphabet (T_ESC+1 symbols) is coded via a binary tree of binary decisions:

```
Level 0: is token == 0? (ZERO vs nonzero)
Level 1 (nonzero): is token < mid? (lower half vs upper half)
Level 2: continue halving until leaf
```

For T_ESC=4 (5 tokens: 0,1,2,3,ESC):
- Level 0: 0 vs {1,2,3,ESC} (1 binary decision)
- Level 1: {1,2} vs {3,ESC} (1 binary decision)
- Level 2: 1 vs 2, 3 vs ESC (2 binary decisions)
- Total: 4 binary decisions per token (worst case)

For T_ESC=8 (9 tokens: 0..7,ESC):
- Level 0: 0 vs {1..7,ESC} (1 binary decision)
- Level 1: {1..3,ESC} vs {4..7} (1 binary decision)
- Continue halving...
- Total: 8 binary decisions per token (worst case)

Each binary decision uses its own adapted probability in the context.

## 6. R2-Series Gate Thresholds

| Gate | Threshold | Consequence |
|---|---|---|
| R2-0 exit | All VB rails green + spec addendum 24 committed + dated CSV | R2-1 may proceed |
| R2-1 primary | FRAME-HYB median NET >= +0.5% over FRAME-ZFF | Hybrid-uint offers gain |
| R2-1 sub-gate R2-1a | model overhead <= 0.01 bpp per sample | Token + sign + escq context cost bounded |
| R2-1 sub-gate R2-1b | no image regresses > -1.0% | No catastrophic outlier |
| R2-1 sub-gate R2-1c | decode time <= 1.5x v1 decode time | Wider alphabet binary tree overhead bounded |
| R2-2 bar(i) | Best non-MED family >= +1.50% median NET over MED under hybrid-uint | B3 reopened |
| R2-3 threshold | projected < 9.35 summed AND < 3.117 per-sample | M2 PASS (2% margin) |

## 7. Cascade Logic

| Phase | Failure | Consequence |
|---|---|---|
| R2-0 | Harness broken | Fix and re-run; no verdict until green |
| R2-1 | < +0.5% NET | Hybrid-uint offers no gain; report ledger, owner decides |
| R2-2 bar(i) not met | B3 stays closed under adaptive coding | R2-3 with MED only |
| R2-3 | Misses M2 | Report full ledger; owner decides next route |

---

- Dr. Mob, the Researcher
