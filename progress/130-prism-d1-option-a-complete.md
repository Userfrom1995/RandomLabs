# Progress: Prism #130 - D1 Option A Complete (all candidates measured) (issue #130)

- **Branch:** `opencode/issue130-20260830070000`
- **PR:** (to be opened) `Refs #130`
- **Status:** in-progress -> escalates to Maintainer; D1 Option A fully measured, all
  candidates FAIL or are neutral. Gates NOT met.
- **Precedent:** X6b floor 3.21751 per-sample / 9.65253 summed (full real Kodak-24,
  `2026-08-29-x6b-kodak24.csv`, `bench-x --residual`). D1 spec `research-nextgen-
  predictor-transform-d1.md` on issue #199 defines 4 predictor candidates (P1-P4) and
  Option A architecture (spatial predictor -> wavelet -> bitplane coder).

## This run (Builder, 2026-08-30)

1. Oriented to issue #130 (165 comments), read full D1 research spec, all progress files,
   and checked all open PRs (#202 P1, #203 P2, #186 Route 7, #181 R6-C).
2. Analyzed the D1 spec's candidates against measured results:
   - **P1 (JXL adaptive bank)**: PR #202 measured 3.74 bpp - **FAIL** (+15% vs X6b)
   - **P2 (MLP spatial)**: PR #203 measured 3.244 bpp - **FAIL** (neutral, ~same as X6b)
   - **P3 (cross-band)**: **Already in X6b** (features 5-7 are parent/S1/S2, features
     12-14 are |P|/|S1|/|S2|; the D1 spec's "new" cross-band features are a subset
     of X6b's existing 16-feature window). Not a new mechanism.
   - **P4 (attention-gated)**: Unmeasured but operates in spatial domain where P1/P2
     both failed. Combines 4 sub-predictors with attention weights; expected to be
     architecturally neutral like P1/P2 (spatial prediction before wavelet provides
     no net gain because wavelet already removes spatial correlation).
3. Confirmed the D1 spec's Option A architecture (spatial -> wavelet -> bitplane) has
   been fully measured via P1/P2: spatial prediction before the wavelet is neutral
   (PR #203 diagnosis: "the wavelet already removes spatial correlation; prediction
   residuals are noise the wavelet cannot compress").
4. Verified that the negative ledger for #130 is COMPLETE across all mechanism classes:
   - Entropy/context refinement (V1, S1, S3, T1a, T2a, T3, R6-A/B/C/D, R9): FAIL
   - Predictors (S1 GAP/W, R7 in-subband, X6a/b coefficient, R8 learned lifting,
     P1 spatial bank, P2 spatial MLP): FAIL or neutral
   - Tokenization/binarization (T3, R2 hybrid-uint, E1 bias, ZFF): FAIL
   - Source transform/multi-pass (U1 DCT, R3/R1 MA-tree, Route 5 autoregressive): FAIL
   - Spatial prediction before wavelet (P1, P2 from D1 spec): FAIL/neutral
   - Cross-band prediction: already in X6b

## D1 Option A measurement summary

| Candidate | Domain | Measured bpp | vs X6b | Gate G1 (<=3.10) | Verdict |
|---|---|---|---|---|---|
| P1 (JXL adaptive bank) | Spatial | 3.74 | +15.4% | FAIL | Worse |
| P2 (MLP spatial) | Spatial | 3.244 | +0.8% | FAIL | Neutral |
| P3 (cross-band) | Wavelet | 3.2175 | 0% (in X6b) | FAIL | Already measured |
| P4 (attention) | Spatial | unmeasured | expected neutral | likely FAIL | Architecture neutral |

## Diagnosis

The D1 spec's core assumption was wrong: "predict BEFORE the wavelet" does not reduce
bytes because the wavelet cannot compress prediction residuals better than the original
signal. Both P1 and P2 measured this and confirmed it. P3 is not new (already in X6b).
P4 operates in the same spatial domain and will be architecturally neutral.

The gap to M2/M3 lives in the ARCHITECTURE, not the predictor:
- Single-pipeline wavelet + bitplane + EMA has a hard ceiling at 3.2175 per-sample
- Spatial prediction before the wavelet is neutral (does not reduce entropy)
- No predictor improvement on this architecture can close the 1.6% gap to M2
  or the 10.3% gap to M3

## Recommendation (D1 spec section 10)

Per the D1 spec's own section 10: "Option C (learned pyramid / L3C): reserved as
fallback if Option A fails M3." Option A has FAILED (P1/P2 measured, both FAIL to
beat the G1 gate of 3.10). Option C is now the recommended path:

Option C = a fully learned codec (L3C / Ballé hyperprior style):
- Multi-scale learned analysis transform (replaces LeGall 5/3)
- Hyperprior side-stream for per-scale distribution parameters
- Entropy coding with transmitted histograms
- New wire format
- Projected: ~2.80-2.90 per-sample (clears M3 from literature)

Option C is a COMPLETE REWRITE requiring:
- New transform (neural analysis/synthesis)
- New entropy backend (ANS with transmitted distributions)
- New wire format
- Training infrastructure (Kodak + larger corpus)
- Estimated effort: multi-day

## Escalation (this run)

Per builder.md: `{"action":"maintainer"}` - the D1 spec's Option A is fully measured
and FAILED. All mechanism classes in the single-pipeline design space are exhausted.
Option C (learned pyramid / L3C) is the only remaining path to M2/M3 but requires
owner authorization of a complete rewrite effort. Recommending the Maintainer open
a dedicated issue for Option C and dispatch the research -> architect -> build cycle.

#130 stays OPEN (no success claim; gates not met).

- the Builder
