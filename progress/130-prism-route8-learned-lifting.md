# Progress: Route 8 - Learned Nonlinear Lifting Transform (issue #130)

- **Branch:** `opencode/issue130-20260829224322`
- **PR:** (to be (re)opened) `Refs #130`
- **Research spec:** `prism/docs/research-route8-learned-lift.md` (Dr. Mob, the Researcher, pending)
- **Precedent:** X6b floor 3.2442/9.7326 (full real Kodak-24, this run). R6-A/B/C/D (transmitted
  histograms) FAIL. R7 (in-subband predictor) FAIL (+14.5%). X3a/X3b/R6-A MLP context at ceiling.
  All context/predictor levers exhausted. The remaining gap to M2 (3.166/9.498) is ~2.5% on the
  RESIDUAL ENTROPY after the integer wavelet, i.e. a TRANSFORM problem.
- **Status:** BUILT + MEASURED. Route 8 implemented as a learned nonlinear (piecewise-constant)
  lifting corrector, byte-exact round-trip verified on all 24 Kodak images. **MEASUREMENT:
  R8-1 REGRESS** (trained predict offsets => 3.4711 per-sample, +4.7% vs the 3.2442 LeGall floor).
  The lever is exhausted for this design; the LeGall 5/3 fallback remains the floor.

## Milestone Checklist

### D0: Scaffold + wire Learned filter  [DONE]
- [x] `WaveletFilter::Learned = 3` + `X_FILTER_ID_LEARNED` in `include/prism/codec/wavelet.h`
- [x] `LearnedLift` struct (16 predict + 16 update int16 contexts); `learned_lift()` /
      `set_learned_lift()`; baked `src/codec/wavelet_lift_data.inc` (all-zero = LeGall fallback)
- [x] `forward_learned` / `inverse_learned` in `wavelet.cpp`: identical structure to Le Gall 5/3
      with a per-context integer offset added to the linear predict base. Exactly reversible
      (invariant I26) for every integer input; with zero offsets bit-identical to LeGall 5/3.
- [x] `lift1d`/`unlift1d` dispatch on `Learned`; `filter_to_id`/`id_to_filter` updated.

### D1: Trainer  [DONE]
- [x] `prism train-lift --kodak DIR --levels N`: runs the real 2D multilevel lift with collection
      active, accumulates per-context prediction/udpate residuals, fits each LUT offset by least
      squares (mean residual per context), bakes `wavelet_lift_data.inc`. Loaded at `main()` start.

### D2: CLI wiring  [DONE]
- [x] `bench-x --filter 3` and `wavelet --filter 3` accept the Learned filter.

### D3: Measurement + gates  [MEASURED - R8-1 REGRESS]
- Ground truth this run on FULL real Kodak-24 (`bench-x --filter 1 --levels 5`, LeGall 5/3,
  EMA context, no hyperprior): **mean 3.2442 per-sample / 9.7326 summed** (consistent with the
  lab's prior X6b floor). M2 needs <3.166/<9.498; M3 needs <2.885/<8.655. Both FAIL.
- `bench-x --filter 3` with trained predict offsets (+/-4, update forced to 0):
  **3.4711 per-sample / 10.4136 summed -> REGRESS +4.7%**. ROUNDTRIP byte-exact on all 24.
- R8-1 on held-out proxy (kodim02/07/13/21): 3.4711 vs 3.3132 LeGall (+4.8%). Same regression.

## Why Route 8 learned lifting regresses (honest diagnosis)

The PREDICT step (`odd - predict`) codes a true residual, so a per-context mean correction should
centre it and cut entropy. The UPDATE step (`even + predict`) produces the LOW-PASS band, NOT a
residual; offsetting it scrambles the LL and explodes bytes (first attempt: upd_lut up to 312 ->
5.83/sample). With update forced to 0 and predict regularised (count >= 2000, clamped +/-4) it
still regresses +4.7%:

1. **Single global LUT is misapplied across decomposition levels.** The same 16-context corrector
   is applied at every level, but even/odd statistics change with level; the mean correction fitted
   over all levels is wrong per level, so deeper levels are mis-corrected.
2. **Predict correction propagates a context-dependent shift into the low-pass band.** Changing
   `out_odd` shifts `out_even = even + (out_odd[k-1]+out_odd[k])/2`; the LL (the dominant-energy
   band) becomes less spatially smooth and less compressible than the tiny detail-band saving.

A per-level LUT would partially fix (1) but not (2); the structural coupling of predict->update in
this 1D lifting means any nonlinear predict correction trades LL compactness for detail savings and
loses. This rules out the *learned-lifting* family as the M2/M3 lever.

## Binding gates (units mandatory)
- M2: summed < 9.498 AND per-sample < 3.166 (vs real WebP m6 3.166)
- M3: summed < 8.655 AND per-sample < 2.885 (vs real cjxl -d0 -e9 2.885)
- `bench_gate.sh` dual-unit check is the only acceptance authority. `Refs #130` (never `Closes #130`
  while gates remain open).

## Cascade / recommendation
All owner-authorized routes are now exhausted as M2/M3 levers on this architecture:
- R6-A/B/C/D (JXL-Modular transmitted histograms): FAIL (EMA already subsumes the static tree).
- R7 (in-subband predictor): FAIL (+14.5%).
- R8 (learned lifting, this run): REGRESS (+4.7%).
- R1/R2 (prior cascade, already measured FAIL): adaptive multi-pass +1.8-2.3%, hybrid-uint +1.8%.
- X3a/X3b/R6-A MLP context: at ceiling (~3.2459, worse than EMA 3.2442).

The honest floor is 3.2442/9.7326. The ONLY remaining lever that can plausibly close ~2.5% is a
FULL learned nonlinear transform (a small neural network codec applied in the transform domain, NOT
a linear/piecewise lifting correction) or a complete JXL-style modular redesign with a learned
nonlinear predictor + transmitted tree. That is a major research/build effort beyond a single
incremental route and needs a fresh owner-authorized issue/phase.

- the Builder
