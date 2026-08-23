# Decision: C2 scope, uniform leaf-prior rule, measured rejection of the replace-context design

- **Role:** the Builder
- **Date:** 2026-08-23T20:00:00Z
- **Issue:** #130 (PR #131, blueprint phase C2)

## Decisions taken this run

1. **Signaling for tree-on-flat planes:** new container flag bit4
   (`MATREE_FLAT_FLAG`, requires bit2). The decoder cannot infer the coding
   path from `num_leaves > 1` alone because legacy mixed streams (some planes
   squeezed, others flat, one multi-leaf tree) exist; an explicit mirrored bit
   is the only safe contract. Validity gate added: bit4 without bit2 is a
   hard decode error.
2. **Legacy coupled path frozen:** when any plane squeezes at effort >= 3 the
   pre-C2 coupled squeeze+tree behavior is preserved byte-for-byte (old caps
   depth 4 / leaves 16 / min-split 32). C4 replaces that path entirely; until
   then it must not drift.
3. **Leaf contexts use neutral uniform prior init** (32768 midpoint for every
   state) selected by bit4 on both sides. Measured BEFORE adopting as the
   shipped rule: residual-diff class priors keyed on leaf id gave kodim01
   tree payload +1050 B vs flat; uniform init gave +1598 B. Uniform is worse,
   but the rule is tied to bit4 only - legacy squeezed-band streams keep
   prior init and stay decodable, and no photo stream emits bit4 while the
   trial rejects.
4. **Latent bug fix:** removed the silent 64-context clamp/id-fold from the v2
   leaf helpers (`acoder_*_plane_leaves_v2`). With C2 caps allowing 256
   leaves, encode-side folding vs decode-side full ids would have corrupted
   any >64-leaf stream. Legacy v1 helpers keep their clamp (trees were
   <=16 leaves there, so old streams are unaffected).
5. **Measured rejection recorded, not hidden:** on the pinned corpus the
   always-on spatial MA-tree loses its trial-bits acceptance everywhere
   (24/24 images byte-identical at e3 vs e1). Per R11-A (measure or it did
   not happen) the negative result stands in the blueprint status and the
   tracker; the next lever is the composite `leaf * 343 + resdiff` context,
   to be validated offline on the probe rail before any further format work.

## Why this is not dead code

The deliverable of C2 per the blueprint is the always-on CAPABILITY with
trial-bits acceptance ("the evalGuard hasLevels requirement is deleted; the
only acceptance test is trial-bits"), the raised builder caps, quantile split
candidates, min-samples rule, determinism, and the clamp fix. All landed and
tested (39/39 gtests, fuzz clean, both-unit gates green). The acceptance
mechanism doing exactly its job on a losing candidate is the system working.

- the Builder
