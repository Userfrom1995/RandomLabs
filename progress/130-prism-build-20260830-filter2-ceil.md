# Progress: Prism #130 - Build Run: Filter-2 Measurement + Ceiling Confirmation (issue #130)

- **Branch:** `opencode/issue130-20260830032214`
- **PR:** (continuation) `Refs #130`
- **Status:** in-progress (measurement complete; escalating for from-scratch redesign authorization; gates NOT met)
- **Date:** 2026-08-30 (Builder run)
- **Precedent:** Routes C/D/E/V/S/T/U/R1/R2/R3/R6-A..D/R7/R8/R9 + X-series all measured and
  rejected (ledger in `progress/130-prism-true-jxl-parity.md`, `130-prism-r6c-trained-retest.md`,
  `130-prism-fair-r6-measurement.md`). Production floor X6b = 3.2442/9.7326 (full real Kodak-24,
  `frame_wavelet_encode`, LeGall 5/3, EMA+MLP bitplane context, no hyperprior). M2 needs
  <3.166/<9.498; M3 needs <2.885/<8.655. Both FAIL.

## This run (Builder, 2026-08-30)

Built `prism` (Release, tests off) from current `origin/main` (commit `a299e99`). Reproduced the
baseline and closed two previously-inconclusive levers with real measurements on the SHA-verified
Kodak PPMs (linked from `obsidian/benchmarks/data/kodak`).

### 1. Baseline reproduced (trust-but-verify)
`bench-x --filter 1 --levels 5 --effort 5` on the pinned 4-image proxy (kodim01/05/13/19):
- mean per-sample **3.59118**; summed **10.7735** (byte-exact round-trip).
- Matches `progress/130-prism-fair-r6-measurement.md` exactly. Confirms the X6b floor (full-24
  3.2442/9.7326) is real and reproduced on this run's binary.

### 2. `filter=2` (reversible 9/7) genuinely WORSE - lever now closed with data
Prior dismissals of filter=2 were **speed-based only** (">120s for 4 imgs"), never a bpp measurement.
Measured it properly on a 2-image proxy (kodim01/13), effort 7:
- filter=2: mean per-sample **3.99601**; summed **11.988** (vs 5/3's 3.717/11.150 on same images).
- **+11.2% worse** than LeGall 5/3. The reversible 9/7 is not a free win; 5/3 is the better integer
  wavelet for this lossless codec. This lever is now measured, not assumed.

### 3. Effort parameter has ZERO effect - floor is structural, not a tuning miss
kodim01 on filter=1/levels=5: effort 5 -> 10.41750 bytes; effort 7 -> 10.41750 bytes (identical).
The encoder-side search yields no better configuration at higher effort, confirming the 3.2442 ceiling
is structural (entropy of the EMA-modeled residual), not an un-exhausted tuning knob.

## Honest ledger state (all owner-authorized routes + this run's two closures)

Best achievable on real Kodak-24: **3.2442/9.7326** (X6b). Every single-pipeline mechanism class,
and now both wavelet-filter choices, have been measured and rejected:
- Spatial/predictive v1 e1 3.3737; wavelet+bitplane X6b 3.2442 (floor).
- R6-A/B/C/D transmitted histograms / property tree: FAIL vs EMA.
- R7 in-subband predictor +14.5%; R8 learned lifting +4.7%; R9 tree-quant EMA neutral.
- R1/R2 adaptive multi-pass +1.8-2.3%; R3 MA-tree FAIL; Route 4 X-series context exhausted.
- X6c hyperprior doubly exhausted; filter=2 (9/7) **this run +11.2%**; effort search **no-op**.
- Gates: M2 <9.498/<3.166 (FAIL, ~2.4% short on bytes); M3 <8.655/<2.885 (FAIL, ~14% short).

## Diagnosis (consistent across all prior runs)
The gap to M2/M3 does NOT live in the context model (EMA is optimal and effort-invariant), the
quantizer (entropy-near-optimal), or the wavelet filter (5/3 best, 9/7 worse). It lives in the
COEFFICIENT PREDICTOR/TRANSFORM energy: JPEG XL wins because its residuals after a far stronger
predictor are simple enough that a coarse transmitted histogram becomes the dominant model. Our
residuals are already tightly modeled by the EMA, so no context-side refinement can help.

## Recommendation / escalation (decision required)
Per Anti-Surrender + No-Pause, #130 stays OPEN (no success claim). The only remaining path is a
**from-scratch codec** - a genuinely better coefficient predictor/transform (e.g. JXL-style adaptive
spatial predictor, or a learned nonlinear transform) with the transmitted histogram as the PRIMARY
model from the start - which is a major multi-day research->architect->build effort that, per the
blueprints and the Maintainer's own prior statements, requires a **NEW dedicated issue + owner
authorization** (one issue per task; the from-scratch redesign is beyond an incremental route).

This run therefore escalates to the Maintainer to (a) open that new issue and dispatch the
research->architect->build cycle, or (b) accept the honest 3.2442/9.7326 ceiling and close #130.
Continuing to bolt incremental mechanisms onto the current EMA decoder will not pass the gates.

- the Builder
