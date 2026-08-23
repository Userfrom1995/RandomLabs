# Decision: C2b composite contexts measured rejection on both refinement directions

- **Role:** the Builder
- **Date:** 2026-08-23T20:45:00Z
- **Issue:** #130 (PR #131, blueprint phase C2b)

## Decisions taken this run

1. **C2b was implemented exactly as prescribed and validated OFFLINE first**
   (probe rail before any format change): composite plane coders
   (`encode_plane_tree_composite_v2` / `decode_plane_tree_composite_v2`, exact
   mirrors sharing one causal walk) code model id `leaf * 343 + resdiff`; the
   v2 class priors and shared class states are keyed on the resdiff PART
   (`cx % 343`), so flat streams are bit-for-bit unaffected.
2. **Measured rejection of tree-composite** on the sha-pinned probe images:
   kodim01 payload alone is -67 B vs flat but the serialized model (+230 B)
   makes the total +163 B; kodim13 payload +44 B, total +330 B. Gate B1
   (composite total < flat total, enforced per image) FAILs 2/2. The trial
   gate refuses the format, so production streams stay byte-identical to e1 -
   zero regression by construction, no flag spent.
3. **Fixed activity partition also measured and not adopted**: an even cheaper
   refinement (`activity * 343 + resdiff`, zero side-channel cost since
   activity recomputes causally on both sides) lands -43 B on kodim01 but
   +35 B on kodim13. Mixed sign = no real win; shipping it would be tuning
   noise into the format. Recorded as variant `v2act` in the probe rail for
   the record.
4. **Strategic conclusion recorded:** three independent measurements now agree
   (C1 instrumented oracle ~0.19 percent static ceiling, C2 leaf-only
   rejection, C2b composite rejection): under the v2 zero-flag-first
   binarization with dual-rate class-hierarchy sharing, static context
   refinement adds about nothing that adaptation does not already harvest.
   Context-modeling effort on FLAT planes is exhausted; the MA-tree stays a
   capability for squeezed-band coding (C4/C5 need it) and never fires on
   photos while trials reject. Effort moves to C3 (trial-encoded decisions),
   which the blueprint projects into the M2 window.
5. **Gate hygiene:** probe_backend.sh gained gate B1 plus a third self-check
   case proving B1 can fail ALONE (a gate whose fail-path is not demonstrable
   is worse than no gate). Self-check now proves pass, A1/A2-fail, and
   B1-alone-fail verdicts.

## Evidence

- Durable CSV: `prism/benchmarks/results/2026-08-23-backend-probe.csv`
  (7 variants x 2 images, sha pins verified pre-measurement).
- New unit tests: MatreeComposite.EncodeDecodeBijection,
  MatreeComposite.SingleLeafRoundTrip. Suite 41/41 green, fuzz clean.

- the Builder
