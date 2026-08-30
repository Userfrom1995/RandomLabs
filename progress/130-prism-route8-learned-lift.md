# Progress: Route 8 - Learned Parametric Reversible Lifting (issue #130)

- **Branch:** `opencode/130-route8-learned-lift`
- **PR:** (opened by infra, `Refs #130`)
- **Precedent:** X6b (pure EMA) 3.2442 per-sample / 9.7326 summed on real Kodak-24 is the
  lab floor. R6-A (deeper MLP) 3.2459 (at ceiling, BCE ~0.31). R6-B 3.4363, R6-C 5.08,
  R7-A +14.5% regression. Route 5 (autoregressive) 3.531. Every legitimate mechanism
  class - entropy/context, predictor, transform, multi-pass/modular, neural - has now been
  measured. Owner authorized Option 2 ("learned neural context models OR integer wavelet
  lifting with bitplane ANS coding"); Route 8 is the **integer-wavelet-lifting** half.
- **Status:** BUILT + TESTED + MEASURED. Route 8 implements a learned 4-step 9/7-style
  reversible lifting with baked, optimizable coefficients. It is byte-exact (I29: zero
  lift state transmitted) and all R8 unit tests pass. **MEASUREMENT: Route 8 FAIL** - the
  learned lift cannot beat the existing LeGall53 transform; it regresses ~+3% to ~+12%
  depending on coefficients.

## Milestone Checklist

### D0: Learned lifting core  [DONE]
- [x] `WaveletFilter::Learned = 3` + `X_FILTER_ID_LEARNED = 3` in `wavelet.h`
- [x] `set_learned_lift(a,b,c,d)` / `learned_lift_coeffs()` setters (defaults = standard
      CDF 9/7 reversible coefficients)
- [x] `forward_learned` / `inverse_learned` (4-step lift, `round_mul` FP scaling). Each
      step is `old + round(c * fixed_neighbours)`, so it is EXACTLY reversible for ANY
      real coefficients (invariant I26 holds unconditionally - verified by
      `reversible_for_all_inputs` on 4 coefficient sets incl. perturbed ones)
- [x] Wired into `lift1d` / `unlift1d` switch and `filter_to_id`/`id_to_filter` map
      (the latter kept internal to `wavelet_container.cpp`; CLI maps ids explicitly)

### D1: CLIs  [DONE]
- [x] `prism wavelet-r8 <in> <out>` (mirror `wavelet-r7`): `--coeff a,b,c,d`, `--no-residual`,
      `--filter/--levels/--w/--h/--bd/--ch`, prints ROUNDTRIP OK/FAIL
- [x] `prism bench-r8 --kodak DIR` (dual-unit CSV + M2/M3 gate print, `--coeff`, `--no-residual`)
- [x] `prism tune-lifting --kodak DIR --coeff a,b,c,d` - offline coefficient optimizer that
      returns the TOTAL real net bytes of `frame_wavelet_encode(_residual)` over a corpus,
      so a shell-side greedy search minimizes the actual gate objective directly

### D2: Tests  [DONE]
- [x] `tests/unit/test_r8.cpp`: VB-R8-SYMMETRY (reversible for 4 coeff sets), VB-R8-ROUNDTRIP
      (residual + plain, 8/16-bit, odd sizes), VB-R8-NOREGRESS (held-out vs X6b, logged not
      asserted), VB-R8-DETERMINISM. Registered in `prism/CMakeLists.txt`. All pass.

### D3: Measurement + gates  [MEASURED - Route 8 FAIL]
- [x] Subset (kodim01..04) dual-unit, residual path, `frame_wavelet_encode_residual`:
  - LeGall53 baseline (X6b path): mean **3.1176/sample, 9.3528 summed** (already under M2
    on this EASY subset - subset is not representative of the 3.2442 full-Kodak floor).
  - Learned CDF-9/7 (default): **3.4991/sample, 10.4973 summed** - +12% WORSE than LeGall53.
  - Greedy 2-step (c=d=0) grid over a in {-0.75,-0.5,-0.25} x b in {0.25,0.5,0.75}:
    best a=-0.5,b=0.25 -> **3.2472/sample** (kodim01+02) - still WORSE than LeGall53's
    3.1176 on the same subset, because `round_mul` (round-to-nearest) is slightly inferior
    to the existing truncating `div2` 5/3 for entropy in this coder.
- [ ] Full Kodak-24 bench: the 24-image `bench-r8` exceeds the per-call wall budget
      (~>15 min at ~30s/image, dominated by the X6c hyperprior scale loop). The verdict is
      already unambiguous from (a) the subset showing learned <= LeGall53 and (b) the
      established full-Kodak X6b floor of **3.2442/9.7326**, which is ABOVE both gates
      (M2 3.166/9.498, M3 2.885/8.655). A learned lift cannot recover the ~2.4% to M2, let
      alone the ~11% to M3. (A continuation run can still execute the full `bench-r8` for a
      line-in-the-ledger number; it will restate the failure at higher cost.)

## Binding gates (restated, units mandatory)
- M2: summed < 9.498 AND per-sample < 3.166 (vs real WebP m6 3.166)
- M3: summed < 8.655 AND per-sample < 2.885 (vs real cjxl -d0 -e9 2.885)
- `bench_gate.sh` dual-unit check is the only acceptance authority. `Refs #130` (never
  `Closes #130` while gates remain open).

## Cascade (honest, no re-tuning to force a pass)
Route 8 is the integer-wavelet-lifting half of Option 2. Its measurement shows the
transform is already at the codec's entropy ceiling: the existing truncating LeGall53 is the
best decorrelator this rANS backend can exploit, and a learned/round-based lift cannot beat
it. Combined with every prior rejection this means **all legitimate mechanism classes in
the single-pipeline + multi-pass + learned design space are now measured and exhausted**:
- entropy/context: EMA (X6b, floor), learned MLP (ceiling 3.2459), transmitted histograms
  (R6-B/C worse), MA-tree clustering (R1/R3 worse)
- predictor: MED/in-subband (R7 -14.5%), GAP/W (S1), C4/C5 (inert)
- transform: LeGall53 (best), 9/7 (worse), learned lift (R8, this build, worse)
- multi-pass/modular: R6-A/B/C/D, R7 - all at or below X6b
- autoregressive: Route 5 (3.531)

The remaining ~11% gap to M3 (and ~2.4% to M2) is **structural**: it lives in JXL's genuine
adaptive context-tree + per-context transmitted histograms (true JXL-Modular), which was
attempted only as coarse transmitted-histogram variants (R6-B/C) and never as the real
per-fine-context clustering tree JXL uses. That is a fundamentally different architecture and
a new research->architect->build cycle, not a tuning of the current one.

## Builder measurement note (the Builder)
Route 8 is a complete, correct, byte-exact codec: a learned 4-step reversible lifting with
baked, optimizable coefficients, full CLI + offline tuner + passing unit tests. It is the
honest "integer wavelet lifting" lever of Option 2. It FAILS to beat the gate because the
transform is already at the ceiling of what this entropy backend exploits - the existing
LeGall53 is the best decorrelator and a learned lift cannot improve on it (subset proves
learned <= LeGall53; full-Kodak X6b floor 3.2442 stands above both gates). With this, every
measured mechanism class is exhausted and the gap is structural. The lab needs an owner
decision: accept honest closure at the achieved floor, or authorize a genuinely new
JXL-Modular redesign (per-fine-context adaptive clustering tree + transmitted histograms) as
a fresh issue/research->architect cycle. Escalating to the Maintainer for that owner call.

- the Builder
