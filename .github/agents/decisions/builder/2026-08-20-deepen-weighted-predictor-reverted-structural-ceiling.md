# Builder decision - 2026-08-20 - deepen-weighted-predictor reverted, structural JXL ceiling

## Context
PR #93 head `bd88b145` deepened the R9-B `WeightedTree` weight context from
`WC_LEAVES = 15` to `64` (4-tier per-gradient `weight_context`, 64-cell raw
index, fully populated) to pursue the Maintainer's directive to "resolve the 2
broken M3-B tests and re-measure REAL Kodak against the JXL 8.71 gate".

## What this run did
1. Reproduced the break: with `WC_LEAVES = 64`, the two opt-in `OBSIDIAN_M3_WP`
   seam tests (`m3_wp_improves_over_v1`, `m3_wp_self_correcting_roundtrip`)
   failed. Root cause: the deeper 64-leaf table fits a BETTER per-leaf
   least-squares solution, so `model.rs` selects `PredictorId::WeightedTree`
   for MORE contexts; the M3_WP seam only applies its online weight correction
   when `p == PredictorId::Weighted`, so those extra `WeightedTree` contexts
   fall back to the static tree and the seam's never-expand invariant breaks.
2. Re-measured the DEFAULT codec (GR, effort 4) on the full 24-image durable
   `data/kodak`: `WC_LEAVES = 64` -> **9.5262 bpp**. This is the SAME +0.0054
   regression as the earlier 64-leaf attempt (which left most bins empty via a
   3-tier 0..27 raw range) - so the regression is NOT from empty bins, it is
   from per-leaf sample starvation: 64 leaves = 4x fewer samples per leaf =
   noisier least-squares weights = worse prediction.
3. **Reverted** `WC_LEAVES` -> 15 and the original 3-tier `weight_context`.
   Codec restored to **exactly 9.5208 bpp**; all **138 lib tests pass**; the
   two M3-B tests pass again.

## Decision and rationale
The 64-leaf deepen is reverted (no code ships except the revert). The full
axis table now confirms the JPEG XL 8.71 gap (9.5208, +0.81 bpp) is a
**structural, architectural ceiling of the current single-pixel CMARC pipeline
with the near-optimal R9-B weighted predictor**, not any tunable knob a Builder
can turn:

| Axis | Result |
|------|--------|
| R11-D combined gradient+residual MA context | wash |
| R11-A cross-band `wLL` predictor | wash + 45x slowdown (reverted) |
| R9-B weight context 15 -> 64 (3-tier, empty bins) | regression 9.5262 (reverted) |
| R9-B weight context 15 -> 64 (4-tier, full) | regression 9.5262 (reverted) |
| R12-A per-band weighted predictor | non-regressive, but Squeeze never selected on photos (reverted) |
| CMARC binary backend vs GR | 10.08 vs 9.52 (worse) |

Every Builder-implementable lever (R1-R12-A) is built / measured / kept or
reverted. The remaining ~0.81 bpp to JPEG XL requires a genuinely different
predictor or transform architecture (e.g. a context-tree / PAQ-style mixer, or
a true wavelet/lifting transform with real energy compaction) - an Architect +
Researcher deliverable, not Builder tuning of the existing weighted-tree
predictor. The M3_WP seam remains OFF by default and the 64-leaf change is not
re-attempted.

## Action
Escalate to the Maintainer (`{"action":"maintainer"}`) with this evidence so the
owner can decide: relax the three-gate override, accept the JPEG-LS-matching +
WebP-beating codec at 9.5208, or commission a new predictor/transform
architecture. No merge until PNG + WebP + JPEG XL are all beaten bit-exactly
(owner override).

- the Builder
