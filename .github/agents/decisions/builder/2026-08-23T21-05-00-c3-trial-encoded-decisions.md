# C3 scoping decisions: trial-encoded analyzer decisions

- **Date:** 2026-08-23 ~21:05Z
- **Agent:** the Builder
- **Context:** issue #130 continuation, blueprint phase C3
  (architecture-jxl-parity.md section 5). Tracker queue: retire the
  remaining energy proxies from color transform / CFL / global predictor
  decisions.

## Decisions made and why

1. **Reference predictor for transform/CFL trials is MED, fixed.** Every
   candidate in the color and CFL rounds is measured with the same
   reference predictor so the A-B comparison stays fair; the predictor's
   own decision then runs on the winning raster. This mirrors the legacy
   structure (which also used MED energy) with the true metric swapped in.
2. **Sequential greedy order preserved** (color -> CFL -> predictor), not a
   joint search. Joint search over (transform x scales x predictor) would
   multiply trial encodes by ~45x for at most marginal extra gain; the
   blueprint prescribes per-decision trials, and each individual decision
   still can never lose to its own identity candidate.
3. **Identity-forced finalists are the I4 mechanism.** `trial_finalists`
   always promotes the identity candidate (None transform / CFL scale 0 /
   MED) into the final full-encode round and `trial_pick` gives it ties,
   so leaving identity requires strictly beating it. Unit-tested as a
   property (`ColorChoiceNeverLosesToIdentity`), and confirmed in
   production: 7 wins / 17 ties / 0 losses on the corpus.
4. **Pruning grid: every 4th row/col; below 64 px per side the full image
   IS the pruning grid.** Pruning is explicitly non-binding - it only
   chooses which candidates earn a full encode; the decision itself is
   always made on full-resolution coded bytes.
5. **Effort gates unchanged from B6** (e1 color+predictor, e2+ adds CFL).
   Keeping the gates fixed keeps the fresh e1/e3 CSV rows comparable with
   the archived pre-C3 ones; re-laddering efforts per blueprint section
   5.1's long-term sketch belongs to a later slice with its own baseline.
6. **Legacy coupled squeeze guard untouched.** The effort >= 3 path that
   fires only when a squeeze level was chosen (never on photos, research
   F1) still uses `estimate_bits` internally; C4 replaces that whole path
   with true lifting plus per-plane L by trial bits. Deleting it now would
   change non-photo behavior without a replacement, so scope stayed with
   the tracker's list: color + CFL + predictor.
7. **`raster_cost_med` and the dead `encode_band_leaf_for_cost` are
   deleted**, not deprecated, per the estimator-bug-recurrence risk entry:
   the Reviewer should be able to grep for the banned class and find it
   absent from all live decision paths.

## Measured outcome (sha pins verified before measuring)

- e1: 10.2904 summed / 3.4301 per-sample bpp (pre-C3 archives:
  10.3544 / 3.4515), total bytes -0.62 percent; kodim20 -6.22,
  kodim03 -3.46, kodim12 -1.87 percent; zero regressions.
- e3: 10.2861 / 3.4287.
- Wall-clock 37.8 s vs 10.1 s pre-C3 at e1 = 3.74x (< I6's 5x guard);
  e3 52.9 s.
- Verification: 50/50 gtests, fuzz 1000 iters PASS, probe rail A1/A2 OK
  with the probe stream byte-stable against the committed CSV.

M2/M3 remain open under the owner freeze; no parity claim.

- the Builder
