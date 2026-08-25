# Decision Record: E1 offline rejection and honest closure of #130

- **Agent:** the Builder
- **Timestamp:** 2026-08-25T12:30:00Z
- **Phase:** E-series (E1 validation + E4 checkpoint), issue #130, PR #131
- **Binding inputs:** E-series blueprint section 5/7 (named tree row from E0),
  research endgame spec section 4.1, algorithmic-spec addenda 14.3 + 16

## Decision

E1 bias cancellation was validated OFFLINE ONLY and REJECTED per its
pre-registered BIAS-fmt gate; with E0's verdicts this exhausts the named
decision-tree row's final clause, so #130 closes honestly at the achieved
level. No format byte was spent in E0 or E1 (I7/I8/I9 held throughout).

## What was pre-registered before measurement (spec addendum 16)

Mechanism (a) was already pinned in addendum 14.3. Mechanism (b) constants
were pinned BEFORE any med@bias row existed: G[64] int64 16.16 fixed point,
init 65536 (exact unity), clamp [32768, 131072]; prediction chain
pred' = med + b[ctx], then sym-round-away-from-zero multiplicative gain;
update order b first then G, both from err vs the final prediction;
LR_SHIFT 9, ENERGY_SHIFT 4. The gate's single reading was also pinned there:
decision bracket = ctx343-fine static entropy expressed against the OLD
stream's v0 (baseline reference frame), aggregate on the pooled TOTAL row,
no-regression per image beyond the series tolerance.

## Measured verdict (probe quad, sha256 pins verified pre-measurement)

| candidate | ctx343-fine bracket drop (points of v0) | payload delta | images regressed |
|---|---|---|---|
| med@bias (a) | -19.85 (WORSE) | +70.23 pct | 4/4 |
| med@biasgain (a+b) | -16.33 (WORSE) | +21.66 pct | 4/4 |

Gate required >= +1.5 points drop with no image above its own baseline.
Both candidates FAIL by an order of magnitude; mixed sign everywhere.
BIAS-anchor held byte-for-byte (med@biasoff == shipped MED on v0/v2), so the
result reflects the mechanism, not a plumbing artifact. Evidence:
`prism/benchmarks/results/2026-08-25-ideal-bias-e1.csv`.

## Why it fails (mechanistic reading, recorded for the future)

MED's residual distribution is sharply peaked at exact zero and the v2
zero-flag-first binarization prices that peak far below its conditional-
entropy worth. Bias correction moves predictions toward the conditional
MEAN; any nonzero b spreads residual mass off the MODE, so the zero flag -
the cheapest bin in the format - fires less often. CALIC-class bias
cancellation is structurally incompatible with THIS binarization. The honest
counter-hypothesis from the blueprint ("MED may already sit near the
conditional center") is confirmed in the strongest possible form.

## Scope calls made this slice

1. Unit-test construction honesty: synthetic "clean win" constructions were
   analyzed and abandoned because the 64-cell keying provably mixes
   populations at exactly offsetting duty cycles (e.g., anti-diagonal cliffs:
   fixed point b* = 32 yields zero net gain). The unit tests therefore pin
   the exact arithmetic laws instead, and the live mechanism proof moved to
   the shell self-check (constructed stream where corrections demonstrably
   fire + real-image anchor).
2. CLI mode names aligned to spec vocabulary (biasoff/bias/biasgain ->
   rows med@biasoff/med@bias/med@biasgain) after an initial naming drift.
3. E4 executed in the same slice as E1's rejection rather than yielding a
   run: outputs are byte-stable by construction (nothing format-wired since
   D4c), and the fresh measure proved exactly that - all three CSVs
   byte-identical to the committed D4c-era files. Wall-clock cost ~3 min.

## Consequences

- E-series complete: E0 measured, E1 rejected, E2 DOA-by-arithmetic, E3
  gate-dead, E4 checkpointed. Project status -> complete.
- Final corpus truth (both units): e1 = 10.1210 summed / 3.3737 per-sample;
  e3 = e7 = 10.1350 / 3.3783. M2 FAIL (vs < 9.498 / < 3.166); M3 FAIL
  (vs < 8.655 / < 2.885). Total progress: -8.21 pct bytes from the 11.026
  e7 baseline at e1.
- The owner freeze stands satisfied by closure: nothing was merged under a
  false gate pass; #130's achieved level is documented with every lever
  adopted-and-measured or rejected-by-measurement.
- Future-work pointer recorded in the ideas addendum: attack the code shape
  (binarization/symbol alphabet) first; source/model-side levers are closed
  by this ledger.

- the Builder
