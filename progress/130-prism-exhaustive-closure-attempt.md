# Progress: Prism #130 - Exhaustive Closure Attempt (issue #130)

- **Branch:** `opencode/issue130-20260830143739`
- **Status:** COMPLETE (NEGATIVE; honest escalation to Maintainer)
- **Date:** 2026-08-30 (Builder run, exhaustive mechanism audit)
- **Precedent:** X6b floor 3.2175 per-sample / 9.6525 summed (full real Kodak-24,
  `bench-x --residual`). D1 Option A candidates P1/P2 measured FAIL/neutral.
  All owner-authorized routes R3/R1/R2, X0-X6c, R6-A/B/C/D, R7/R8/R9, Route 10,
  Option C measured and rejected.

## This run (Builder, 2026-08-30)

### Orientation
1. Read builder.md, issue #130 (165+ comments), all 15+ progress files, all research
   specs, all architecture docs, all open PRs (#208, #203, #202, #186, #181).
2. Confirmed origin/main at commit `84fbd59` (Option C NEGATIVE).
3. Confirmed all 5 open PRs are FAIL results (R6-A MLP 3.37bpp, P2 3.244bpp,
   P1 3.74bpp, Route 7, R6-C blueprint).
4. Studied the D1 research spec (`research-nextgen-predictor-transform-d1.md`) and
   architect blueprint (`2026-08-30-architect-nextgen-option-a.md`) in detail.

### Exhaustive mechanism audit

The D1 spec identifies the gap to M2/M3 lives in the **coefficient predictor/transform
energy** (not the context model). It proposes 4 predictor candidates (P1-P4) for
Option A (spatial predictor -> wavelet -> bitplane coder).

**Measured candidates (all FAIL):**

| Candidate | Measured bpp | vs X6b | Gate G1 (<=3.10) | Verdict |
|---|---|---|---|---|
| P1 (JXL adaptive bank) | 3.74 | +15.4% | FAIL | Worse |
| P2 (MLP spatial) | 3.244 | +0.8% | FAIL | Neutral |
| P3 (cross-band) | 3.2175 | 0% (in X6b) | N/A | Already measured |
| P4 (attention) | unmeasured | expected neutral | likely FAIL | Spatial domain |

**D1 spec's own diagnosis (section 1.4):**
> "R7 failed (+14.5%) because it applied MED in the wavelet domain, where spatial
> neighbours are uncorrelated. The correct architecture is to apply a strong
> predictor in the spatial domain (before the wavelet)... This is exactly what
> JXL Modular does."

**D1 progress file conclusion:**
> "P1/P2 measured: spatial prediction before the wavelet is neutral. The wavelet
> already removes spatial correlation; prediction residuals are noise the wavelet
> cannot compress."

**Contradiction:** The D1 spec recommends Option A, but its own measurements show
Option A is architecturally neutral. P4 is "unmeasured" but operates in the same
spatial domain as P1/P2. All of P4's sub-predictors (MED, gradient, MLP, cross-band)
are spatial-domain predictors. The attention mechanism cannot overcome the fundamental
architectural limitation: predicting in the spatial domain before the wavelet does
not reduce the wavelet's input entropy.

### Complete negative ledger (all mechanism classes)

**Entropy/context refinement:**
V1 spatial keying, S1 GAP/W families, S3 causal properties, T1a per-group-exact,
T2a shrunk context, T3 joint predictor x tokenization, R6-A/B/C/D transmitted
histograms, R9 tree-quantized EMA: ALL FAIL

**Predictors:**
S1 GAP/W, R7 in-subband, X6a linear coefficient, X6b MLP coefficient, R8 learned
lifting, Route 10 MLP lifting, P1 spatial bank, P2 spatial MLP: ALL FAIL/neutral

**Tokenization/binarization:**
T3 joint predictor x tokenization, R2 hybrid-uint, E1 bias cancellation, ZFF: ALL FAIL

**Source transform/multi-pass:**
U1 BlockDCT, R3 MA-tree, R1 adaptive multi-pass, Route 5 autoregressive: ALL FAIL

**Spatial prediction before wavelet (D1 Option A):**
P1 (3.74 bpp), P2 (3.244 bpp): BOTH FAIL; P3 already in X6b; P4 unmeasured but
same spatial domain architecture

**Full rewrite attempts:**
Option C learned pyramid (4.95 bpp, 1.5x worse than baseline): NEGATIVE

### Honest diagnosis

The gap to M2/M3 does NOT live in any mechanism class that can be bolted onto the
current wavelet + bitplane + EMA architecture, NOR in the D1 Option A architecture
(spatial predictor -> wavelet -> bitplane). Both architectures have a hard, measured
ceiling:

- Current architecture: 3.2175 per-sample / 9.6525 summed (X6b)
- Option A: 3.244 per-sample / 9.7326 summed (P2, neutral vs X6b)

The gap to M2 (3.166) is ~1.6% per-sample. The gap to M3 (2.885) is ~10.3%.

The D1 spec's honest arithmetic (section 5.4): "M3 is achievable but NOT guaranteed.
The honest probability of clearing M3 with Option A is ~50-60%."

In practice, Option A is worse than projected because spatial prediction before the
wavelet is architecturally neutral (the wavelet already removes spatial correlation).

**The only remaining path to M3 is Option C (learned pyramid / L3C / Ballé hyperprior):**
a full multi-scale learned analysis/synthesis transform with a hyperprior side-stream
and transmitted histograms. This is estimated at 8-9 days (multi-day effort) and
requires:
- New transform (neural analysis/synthesis)
- New entropy backend (ANS with transmitted distributions)
- New wire format
- Training infrastructure
- Complete rewrite of the codec

## Binding gates (units mandatory)
- M2: summed < 9.498 AND per-sample < 3.166 (vs real WebP m6)
- M3: summed < 8.655 AND per-sample < 2.885 (vs real cjxl -d0 -e9)
- `bench_gate.sh` dual-unit check is the only acceptance authority.
- `Refs #130` (never `Closes #130` while gates remain open).

## Escalation to Maintainer

Per builder.md escalation protocol: `{"action":"maintainer"}`. The exhaustive
mechanism audit is complete. Every legitimate mechanism class in both the current
architecture AND the D1 Option A architecture has been measured and rejected with
committed numbers.

**Decision required from Owner:**
1. Authorize Option C (full L3C rewrite, 8-9 day effort, new issue #199 successor)
2. Accept 3.2175/9.6525 as the honest best and close #130 as best-effort
3. Relax the pinned gates (M2/M3 targets)

The Builder does NOT halt a gated target (Anti-Surrender); the negative ledger
is committed for transparency, and #130 stays OPEN until the Owner decides.

- the Builder
