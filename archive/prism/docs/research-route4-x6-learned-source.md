# Research: Route 4, Phase X6 - learned source-entropy attack (issue #130)

- **Author:** Dr. Mob, the Researcher
- **Date:** 2026-08-29
- **Depends on:** `prism/docs/research-route4-beyond-predictive.md`, `progress/130-prism-route4-beyond-predictive.md`, X3a (merged at `df30077`, 3.2477/9.743 per-sample/summed).
- **Handoff:** `{"action": "architect"}` for the X6 blueprint (addendum 26).

## 1. Where the remaining gap actually lives

The X-series established, and the X2 entropy diagnostic confirmed (`progress/130-prism-route4-beyond-predictive.md:82`), that the bitplane decomposition is **entropy-near-optimal under the per-context adaptive model**: per-subband ideal entropy under the EMA equalled the actual coded rate to within noise. X3a then added a learned MLP prior (`LearnedModel` in `learned_ctx.h`) blended into the per-bit probability, but the gain was only +0.41% per-sample (3.2611 -> 3.2477). The reason is structural, and it is the single most important finding of this research phase:

- `BitplaneCoder::encode` (`bitplane.cpp:188-248`) codes each coefficient `c` bitplane-by-bitplane via SIGNIFICANCE / SIGN / REFINEMENT symbols.
- `LearnedModel::predict` (`learned_ctx.h:128`) returns **one** binary probability `P(bit==0)` per symbol, blended from a per-context EMA and a 10->16->1 MLP.
- The model therefore only **re-distributes probability mass** within the symbols already emitted for `c`. It never reduces the *number* of bits `c` requires, because the coefficient magnitude `|c|` (hence its top bitplane and all refinement bits) is fixed by the transform. The MLP has no path to shrink `|c|` itself.

Consequence: every context-refinement approach (the entire V/S/T/R1/R2 history, plus X3a's fine-context MLP) is capped by the same wall once the per-context model is entropy-near-optimal. The wall is the **source entropy of the wavelet coefficient field**, not the model granularity. To break it you must change the *source* the entropy coder sees, which means a **predictor** (subtract a learned estimate, code the small residual) or a **hyperprior** (send compact side information that sharpens the per-symbol distribution). Both are exactly the mechanisms that separate JPEG XL / VVC from simpler coders, and both are named by the owner's Option-2 directive ("learned neural context models").

This is the same structural insight the U-series found for the DCT (`research-v4-transform-domain.md`): "a fixed transform carries zero side info; the gain is in source entropy, not the entropy-coding side." Here the wavelet already does the linear decorrelation; what is missing is the **nonlinear learned predictor** on the coefficient field and the **learned hyperprior** that L3C / Ballé use to reach ~2.85 bpp lossless on Kodak.

## 2. Honest statement of the binding gates (both units, per `bench_gate.sh`)

- M2: summed < 9.498 AND per-sample < 3.166 (vs WebP m6 = 3.166).
- M3: summed < 8.655 AND per-sample < 2.885 (vs JPEG XL -d0 -e9 = 2.885).
- X3a baseline to beat: 9.743 summed / 3.2477 per-sample.
- To M2 from X3a: -2.49% per-sample. To M3 from X3a: -11.15% per-sample.

## 3. Lever L1 (dominant): learned wavelet-domain coefficient predictor

Replace "code `c`" with "predict `c_hat`, code residual `r = c - c_hat`" using the existing `BitplaneCoder` on `r` instead of `c`. Because the predictor is evaluated from **already-coded coefficients only** (causal window, mirror-symmetric at encode and decode), the round-trip is exact and **no predictor state is transmitted**: NET = payload + header is preserved (invariant I29). The predictor weights are baked constants, exactly like `learned_ctx_data.inc`.

### 3.1 Predictor architecture (baked, inference-time float is already supported by X3a)

Input window for coefficient at `(x,y)` in subband `s` on bitplane pass:
- 3x3 causal same-subband neighbourhood of **reconstructed** coefficients `value` (the `value`/`curmag` maps `bitplane.cpp:342,147` already maintained).
- the parent coefficient `pmag` (already fetched at `bitplane.cpp:104`).
- the two same-level sibling orientations (HL/LH/HH cross-channel correlation), when available.
- the running reconstructed magnitude of self (`ownmag`) and current bitplane index.

A small fully-convolutional net (e.g. two conv layers + 1x1, or a 24->64->32->1 MLP on the flattened window) regresses `c_hat`. We predict the **raw integer coefficient**, not a probability, so the residual `r` is small-lifetime and its bitplane stack is dramatically shorter: if the predictor explains fraction `alpha` of the coefficient variance, residual std scales as `sqrt(1-alpha)`, and the dominant magnitude-bit count drops roughly proportionally.

### 3.2 Training objective (must target the real codec, not MSE)

Train on the real Kodak-24 coefficients (the same pinned set used for measurement, so no leakage: the rANS only ever sees its own emitted bits at inference). For each training coefficient, compute `c_hat` from the causal window, form `r = c - c_hat`, run `r` through the **actual bitplane coder** (reuse `BitplaneCoder` on the residual field), and use the emitted `bits`/`p0` to form the loss
`L = sum_k -log2 p0[k]^{1-bit[k]} * (1-p0[k])^bit[k]` (the true rANS codelength of the residual). Backprop through the (straight-through or differentiable-bypass) quantisation of `c_hat` to integer. This makes the network minimise the metric that the gate actually measures. A purely-MSE objective is an acceptable proxy for an initial run (cheaper, no differentiable rANS needed) but the codelength objective is the one that closes the gap; ship both, prefer codelength.

### 3.3 Why this beats X3a's context MLP

X3a's MLP predicts `P(bit)` and can at best sharpen one binary decision; it cannot remove a magnitude bit. L1's predictor removes magnitude bits outright. On smooth wavelet subbands neighbour magnitudes are highly predictive of a coefficient's magnitude (this is why EBCOT/JPEG2000 context models work at all); a *learned nonlinear* predictor exploits far more of that structure than the hand-tuned significance-count context. This is the proven structure of L3C (`Mentzer et al., "Learning Convolutional Networks for Content-Weighted Image Compression"`, CVPR 2018), whose scale-recursive learned pyramid reaches ~2.8-3.0 bpp lossless on Kodak, i.e. exactly the M3 neighbourhood.

### 3.4 Pre-registered gate (L1)

- L1 primary: median per-sample on REAL pinned Kodak-24 <= 3.10 (>= +4.5% NET over X3a 3.2477), byte-exact round-trip 24/24, fuzz clean.
- L1 sub-gate: residual top-bitplane count mean < coefficient top-bitplane count mean (proves the predictor is actually shrinking source magnitude, not just re-weighting symbols).
- If L1 fails to clear +2.0%: record honestly, do not proceed to L3 alone; cascade to L2/L3 combination or honest closure.

## 4. Lever L2 (merge of X3b): richer context MLP

The current MLP is 10->16->1 with features `symtype, orient, parent_sig, fc, dg, nbsig, nmag, pmag, ownmag, ppos` (`learned_ctx.cpp:37-49`). Expand and enrich:
- Add L1/L2 neighbour-magnitude aggregates (mean and variance of the 8-neighbour reconstructed magnitudes), not just the max (`nmag`).
- Add cross-orientation sibling magnitudes and the local subband variance (texture vs smooth).
- Widen to 24->64->32->1 (still tiny; weights baked, inference float already supported).
- Carry the X3b "stronger prior" blend tuning (K override) into the new net.

L2 is incremental (+0.5 to +1.0% expected) and is the natural companion to L1: L1 shrinks the source, L2 sharpens the per-bit prior on the residual. Apply L2 to the **residual** coder so both levers stack.

## 5. Lever L3 (reserve, the M3 lever): learned hyperprior side-stream

This is the single mechanism that has been *measured* in the literature to reach ~2.85 bpp lossless Kodak and that X3a structurally cannot emulate. A second, tiny rANS stream carries a **quantised latent** `z` produced by a learned analysis of each subband (or tile): a small net reads the already-coded residual field statistics and emits a compact `z` (a few bytes per tile) that the baked hyper-decoder turns into per-(tile, subband) distribution parameters (e.g. a Laplacian scale, or a small set of per-context bias values) which condition the main bitplane prior `p0`. The main coder then sees a far sharper distribution.

- Overhead budget: the hyper-stream MUST stay <= 0.02 bpp (sub-gate L3b) so NET gain holds. This is the one place where "transmitted model" is allowed, and it is bounded by I29's spirit (header/model bytes are counted in NET).
- At decode, `z` is read first, hyper-decoder reconstructs the conditioning, then the main residual stream decodes exactly as before. Round-trip stays byte-exact because `z` is transmitted losslessly in its own rANS stream.
- Risk: if the hyper-stream costs more than it saves on Kodak image sizes (the same table-economics law that killed V1/S3/T1a), L3 FAILS. Pre-register that L3 fails honestly if hyper-overhead > gain; do not bury it in table bytes.

L3 is the dominant M3 lever: L1 alone plausibly reaches M2 (~3.10), and L1+L2+L3 together is the realistic path to M3 (~2.85-2.95).

## 6. Program and pre-registered decision tree

1. **X6a (L1):** implement learned coefficient predictor + residual bitplane path. Gate L1 (>= +4.5% over X3a, byte-exact). If PASS -> X6b.
2. **X6b (L2):** richer context MLP on the residual coder. Gate: additional >= +1.0% over X6a.
3. **X6c (L3):** learned hyperprior side-stream. Gate: additional >= +1.0% over X6b AND hyper-overhead <= 0.02 bpp; combined target <= 2.95 per-sample.
4. **X7 (composition + binding gate):** compose per image by real NET bytes, full Kodak-24 (`prism bench --kodak`), dual-unit `bench_gate.sh` vs REAL cjxl (M3) and WebP (M2). If both clear: format-stable v3 PR (`Refs #130`). Else: open reserve or honest closure.
5. **Honest closure trigger:** if L1 < +2.0% AND L3 fails its overhead sub-gate, the beyond-predictive paradigm has yielded its achievable level; record the negative ledger and escalate to Maintainer for owner decision, per Anti-Surrender (only the Owner halts a gated target).

## 7. Invariants (must hold for every X6 commit)

- I29: NET = payload + header; the predictor/hyperprior weights are baked constants, never transmitted (except the bounded L3 hyper-stream, counted in NET).
- Byte-exact `decode(encode(x)) == x` on all 24 pinned Kodak PPMs (24/24) + fuzz clean.
- Every claimed number states its unit (summed AND per-sample) and cites the dated CSV + `bench_gate.sh` run.
- No success claim without a fresh both-units measurement on the real corpus.

## 8. Honest arithmetic

- X3a: 3.2477 / 9.743.
- L1 alone (predictor explaining ~0.4-0.6 of coefficient variance): projected 2.95-3.10 per-sample -> **M2 plausible**.
- L1+L2+L3 (hyperprior closing the residual distribution gap as in L3C): projected 2.80-2.95 per-sample -> **M3 at risk but within reach**.
- M3 is the hard gate; nothing in X6 relaxes it or the lab freeze (brainstorm #42 frozen until M2/M3 genuinely pass).

- Dr. Mob, the Researcher
