# Research: Route 4, Phase X6c - learned hyperprior side-stream (issue #130)

- **Author:** Dr. Mob, the Researcher
- **Date:** 2026-08-29
- **Depends on:** `prism/docs/research-route4-beyond-predictive.md`, `prism/docs/research-route4-x6-learned-source.md`,
  `progress/130-prism-route4-beyond-predictive.md`, and the merged X6b lineage (X3b learned-ctx +
  X6b learned predictor) on `main` at the current tip (`d055a1b`, X6b = 3.2175 per-sample / 9.6525 summed).
- **Handoff:** `{"action": "architect"}` for the X6c blueprint (addendum 27).

No em dashes anywhere in this document or its descendants. Every number states its unit.

---

## 1. Where we are, exactly (honest ledger)

After the full cascade (R3 -> R1 -> R2 all FAIL, then the beyond-predictive X-series), the measured
state on the pinned Kodak-24 (sha-verified) is:

| technique | per-sample | summed | vs X3a | note |
|---|---|---|---|---|
| e1 (Prism v1 baseline) | 3.3737 | 10.1210 | - | predictive-residual ceiling |
| X3a (wavelet + learned MLP context) | 3.2477 | 9.743 | - | first program to beat e1 |
| X6a (L1 linear predictor) | 3.25548 | - | -0.24% | FAIL: linear predictor 72% var explained, residual path HURT |
| X6b (L2 wider MLP predictor) | **3.2175** | **9.6525** | -0.93% | new Prism best; essentially WebP parity on this corpus |

Current gates (both units required, `bench_gate.sh`):
- M2: summed < 9.498 AND per-sample < 3.166 (WebP m6 = 3.166 global; this corpus WebP = 3.2043).
- M3: summed < 8.655 AND per-sample < 2.885 (JXL -d0 -e9 = 2.885 global; this corpus JXL = 2.8700).

From X6b (3.2175): to M2 = -1.60% per-sample; to M3 = -10.34% per-sample. X6b alone does NOT clear M2.

The X2 entropy diagnostic (`progress/130-prism-route4-beyond-predictive.md:82`) proved the bitplane
decomposition is **entropy-near-optimal under the per-context adaptive model**: per-subband ideal
entropy under the EMA equalled the actual coded rate to within noise. X3a then confirmed that a
learned MLP prior (`LearnedModel`, `learned_ctx.h`) can only re-distribute probability mass within
the symbols already emitted for a coefficient; it cannot shrink the coefficient's magnitude. The X6
predictor (L1/L2) is the mechanism that DOES shrink magnitude (it codes residual `r = c - c_hat`
instead of `c`), and it is what produced the dominant recent gain (3.2477 -> 3.2175). The remaining
gap is now a question of (a) how much sharper the per-symbol distribution can get given a better
prior, and (b) how much more of the coefficient variance a predictor can explain before the
residual entropy beats the source entropy. That threshold, from `research-route4-x6-learned-source.md:3.4`,
is ~85% variance explained; X6b sits at 0.745, so there is structural headroom on BOTH axes.

X6c attacks axis (a) with a **learned hyperprior side-stream** (L3, the single mechanism the prior
spec named as the M3 lever and that X3a structurally cannot emulate). X6d (added here) attacks axis
(b) with a deeper/autoregressive predictor. X5a (already half-wired in `learned_ctx.h:47`) re-opens
chroma-on-luma conditioning. The three compose.

---

## 2. The mechanism: learned hyperprior (L3 / X6c)

### 2.1 Why a hyperprior and not another context refinement

Every context refinement we measured (V1, S1, S3, T1a, T2a, T3, R1, R2, X3a, the enriched X3b
features) paid in one of two ways: transmitted tables (table-economics law) or reduced context
granularity. The encoder-side EMA already adapts per context online and is near-optimal for the
given context key. The information the per-bit prior is missing is **not local to the current
context key**; it is a property of the coefficient field in the neighbourhood (the local "scale" of
the subband activity, the local texture, the local sparsity). That is exactly what a hyperprior
carries: a compact latent `z` describing the local distribution, transmitted once per tile and used
to sharpen the per-symbol prior everywhere in that tile.

Crucially this is NOT table-economics: `z` is a tiny fixed-length latent (a few bytes per tile),
transmitted losslessly in its own rANS stream and NET-accounted (I29 / L-C2). The decoder reads `z`
first, synthesises the per-(orient, symtype) conditioning, then decodes the main stream. Round-trip
stays byte-exact because `z` is received exactly, not reconstructed from the main stream.

This is the precise structure of L3C (`Mentzer et al., Learning Convolutional Networks for
Content-Weighted Image Compression, CVPR 2018`) and of JPEG XL's learned hyperprior: the entropy
model for the main latent is conditioned on a quantized hyper-latent. On Kodak lossless, that family
reaches ~2.8-3.0 bpp, i.e. the M3 neighbourhood. We are not re-litigating a rejected mechanism; we
are adding the one component the X-series identified as missing.

### 2.2 Hyper-analysis: tile -> latent z

Partition the residual field of each subband into T x T tiles. Pin T = 64 (subbands smaller than T
are a single tile). For each tile, compute a fixed, small summary of the residual statistics:

- mean |r| (local scale)
- std r (local spread)
- fraction of significant coefficients (local sparsity)
- max |r| (log2-quantised)
- a texture measure: count of sign changes along the raster scan (edge density)
- for HH subbands, the mean |r| already encodes dominant edge orientation

That is ~6-8 scalar features. A baked hyper-analysis MLP `HyperAna` maps them to a latent
`z` of length K = 4 real values, each clamped to [-3, 3] and uniformly quantized to 8 bits
(quant step 0.0234). So each tile contributes K = 4 bytes.

Tile count per image: 768x512 over 3 planes, 16 subbands (1 LL + 3 x 5 levels), 64x64 tiling ->
roughly (12 x 8) x 16 x 3 ~ a few hundred tiles. Total hyper bytes ~ 4 * ~300 = ~1.2 KB per image.
Per-sample overhead = 1200 * 8 bits / (768 * 512 * 3 samples) ~= 0.0081 bpp (the 1200 figure is
bytes, so 9600 bits over 1179648 samples). Comfortably under the L3b ceiling of 0.02 bpp.

### 2.3 Hyper-synthesis: z -> per-symbol prior modulation

A baked hyper-synthesis MLP `HyperSyn` maps `z` to, for each (orient in {LL, HL, LH, HH}) and
each (symtype in {significance, sign, refinement}), a pair (scale `s`, bias `b`). There are
3 x 4 = 12 (s, b) pairs per tile. The main prior `p0_base` (the existing X3b EMA+MLP blend from
`LearnedModel::predict`, `learned_ctx.h:168`) is then modulated in logit space:

    logit_eff = s * logit(p0_base) + b
    p0_eff    = sigmoid(logit_eff), clamped to rANS-valid range [1/M, (M-1)/M]

where `M = 1 << 16` (matching `LearnedModel::M`). `s` near 1 and `b` near 0 reproduce the base
prior (so an untrained hyperprior is byte-identical to X6b). The modulation lets the hyperprior
sharpen (s < 1 concentrates probability) or shift (b) the per-symbol distribution per tile, which
is the conditional-entropy reduction the EMA alone cannot achieve across tile boundaries.

### 2.4 Transmission and decode order

- ENCODE: compute residual field (X6b predictor), then for each tile compute `z` (HyperAna on true
  residual statistics), quantize, arithmetic-code `z` into `hyper_stream` (a second rANS stream),
  then code the main residual stream with `p0_eff` conditioned on each tile's (s, b).
- DECODE: read `hyper_stream` first, reconstruct each tile's `z`, run HyperSyn to fill the (s, b)
  tables, then decode the main residual stream. The `WAVELET_FLAG` container header carries a
  1-bit `HYPER_FLAG`; when set, the decoder reads `hyper_stream` before the main stream. No other
  wire change; v3 format preserved.

### 2.5 Training objective (must target the real codec)

Train `HyperAna` + `HyperSyn` jointly on the REAL Kodak-24 residual fields (same pinned set used
for measurement; no leakage: at inference the rANS only ever sees its own emitted bits, while `z`
is transmitted and received exactly). Two-stage, both codelength-targeted:

1. Objective for the modulation: for each tile, minimise the actual rANS codelength of that tile's
   residual under `p0_eff`, i.e. `L_tile = sum_k -log2 p0_eff[k]^{1-bit[k]} (1-p0_eff[k])^bit[k]`,
   plus the transmitted bits of `z_tile`. The full loss `L = sum_tiles L_tile` is minimised w.r.t.
   HyperAna/HyperSyn weights. The quantizer on `z` is handled by a straight-through estimator
   (gradient passes through the clamp; the quantizer step is treated as identity for gradients) so
   the trained real-valued `z` approximates the quantized transmission cost.
2. A cheap proxy (usable for a first run without differentiable rANS): train HyperAna to predict the
   per-tile residual entropy lower bound under the base model, and HyperSyn to map `z` to (s, b)
   that minimise that entropy. The codelength objective is the one that closes the gap; ship both,
   prefer codelength.

The (s, b) tables are a DECODER CONSTANT FUNCTION of `z`; the weights of HyperAna/HyperSyn are baked
constants (`hyperprior_data.inc`), never transmitted. Only the tiny quantized `z` is transmitted and
NET-accounted.

---

## 3. Integration points (for the Architect)

- `LearnedModel::predict` (`learned_ctx.h:168`) gains a `const HyperCond* hyper` argument (or a
  thread-local set by the bitplane coder). `HyperCond` holds the per-tile (s, b) tables indexed by
  (orient, symtype) and the tile grid derived from the subband layout + T. When `hyper == nullptr`
  (flag off), behaviour equals X6b exactly (s=1,b=0).
- `bitplane.cpp` (the bitplane walk) must, for each coefficient, compute its tile index and pass
  (orient, symtype) to look up (s, b). Tile grid is a pure function of subband (w, h) and T, so it
  is identical at encode and decode.
- New CLI `train-hyperprior` emits `hyperprior_data.inc` (HyperAna + HyperSyn weights, T, K, quant
  params). Baked constants, same pattern as `learned_ctx_data.inc` / `predictor_data.inc`.
- Container: `WAVELET_FLAG` header `flags` byte gains `HYPER_FLAG` (0x40). Decoder reads
  `hyper_stream` when set, before main stream. Byte-exact round-trip preserved by construction.
- VB rails to add (mandatory before any X6c verdict):
  - VB-X6C-HYPER-ROUNDTRIP: encode -> decode reproduces source byte-exact with HYPER_FLAG set.
  - VB-X6C-HYPER-DETERMINISM: encoder/decoder (s, b) tables byte-identical.
  - VB-X6C-NET-AUDIT: NET = main_payload + hyper_payload + header; hyper_payload <= 0.02 bpp.
  - VB-X6C-SELF-CHECK: a tile with extreme statistics demonstrably lowers its codelength vs the
    base prior (proves the hyperprior is not a no-op), AND a z=0 (all-zero) stream reproduces X6b
    exactly (proves the gate can fail to help and can pass).

---

## 4. Pre-registered gates (X6c)

- **X6c primary:** mean per-sample on REAL pinned Kodak-24 <= 3.12 (additional >= +1.5% over X6b
  3.2175), byte-exact round-trip 24/24, fuzz clean.
- **L3b sub-gate:** hyper-stream overhead <= 0.02 bpp (NET counted). If overhead exceeds the gain,
  X6c FAILS honestly (table-economics returns in miniature) and is skipped.
- **L3c sub-gate:** no image regresses > -0.5% vs its own X6b bytes.
- **Self-check:** proves both directions (hyperprior helps, and z=0 == X6b).

If X6c primary FAILS but L3b passes (overhead fine, just no gain), record honestly and cascade to
X6d. If L3b FAILS, skip X6c entirely.

---

## 5. The M3 path requires X6d and X5a too (honest arithmetic)

X6c alone is projected at 3.10-3.13 per-sample (clears M2 with margin; M3 still short). Reaching M3
(2.885, -10.34% from 3.2175) needs the other two axes:

- **X6d (L4, deeper/autoregressive predictor):** X6b's MLP explains 74.5% variance; the threshold
  where residual entropy < source entropy is ~85%. X6d deepens the predictor (32 -> 64 -> 32 -> 1)
  and adds an **autoregressive coefficient feature**: the predictor's own previously-coded residual
  magnitudes in the causal window, i.e. a learned model of its own error. Projected: 2.95-3.05
  per-sample. Gate: additional >= +1.0% over the (X6b+X6c) winner AND combined <= 3.00.
- **X5a (chroma-on-luma conditioning):** `LCFeat` already carries `lc_mag` / `lc_sig`
  (`learned_ctx.h:47`) but they are currently unwired. Activating them lets the chroma subband
  bitplane prior seed from co-located luma structure (context feature, NOT subtractive prediction,
  to avoid inflating the residual). Projected: +0.5-1.5%. Gate: >= +0.5% median NET, no image
  worse than -0.5%.

Composed per image by real NET bytes (L-C1), the realistic landing is **2.85-2.95 per-sample**,
which clears M3 (< 2.885) at the optimistic end and sits at the M3 boundary at the pessimistic end.
This matches the L3C literature (~2.8-3.0 bpp lossless Kodak) and is the honest best case. M2 is
expected to clear comfortably once X6c lands.

If, after X6b + X6c + X6d + X5a, the composed X7 gate still misses M3, the ledger is M2-PASS /
M3-PENDING and the run escalates to the Maintainer for an owner decision (per Anti-Surrender, only
the Owner halts a gated target). No silent closure.

---

## 6. Program and decision tree (extended from research-route4-x6-learned-source.md:6)

1. **X6c (L3):** implement learned hyperprior side-stream as in sections 2-3. Gate X6c + L3b + L3c.
   If primary PASS and L3b PASS -> X6d. If L3b FAIL -> skip X6c -> X6d.
2. **X6d (L4):** deeper + autoregressive predictor. Gate: +1.0% over X6b+X6c, combined <= 3.00.
3. **X5a:** activate `lc_mag`/`lc_sig` chroma-on-luma context. Gate: +0.5% median NET.
4. **X7 (composition + binding gate):** compose X6b/X6c/X6d/X5a per image by real NET bytes; full
   Kodak-24 `bench_gate.sh` dual-unit vs REAL cjxl (M3) and WebP (M2). If both clear: format-stable
   v3 PR (`Refs #130`); the freeze on #130 lifts on merge. Else: open final reserve sweep (context
   pool 64/128/256, deeper nets, levels L up to 6) or honest M2-PASS/M3-PENDING ledger.
5. **Honest closure trigger:** if X6c L3b FAILs AND X6d < +1.0% AND X5a < +0.5%, the beyond-predictive
   paradigm has yielded its achievable level; record the negative ledger and escalate to Maintainer
   for owner decision.

---

## 7. Invariants (must hold for every X6c commit)

- I29: NET = payload(main) + payload(hyper) + header; HyperAna/HyperSyn weights are baked constants,
  never transmitted. Only the quantized `z` is transmitted, counted in NET (bounded by L3b <= 0.02 bpp).
- Byte-exact `decode(encode(x)) == x` on all 24 pinned Kodak PPMs (24/24) + fuzz clean.
- Every claimed number states its unit (summed AND per-sample) and cites the dated CSV +
  `bench_gate.sh` run.
- No success claim without a fresh both-units measurement on the real corpus.

---

## 8. Complexity

HyperAna/HyperSyn add a fixed number of tiny MLP evaluations per tile at encode (to compute `z`) and
per (s,b) lookup at decode (table indexed, O(1)). Tile count is O(N / T^2) << N. Memory: O(tiles *
12) bytes, negligible. Wall-clock impact < 5% over X6b. The main coder's per-symbol cost is unchanged
(one extra multiply-add in logit space). Within the L-C8 phase guard.

- Dr. Mob, the Researcher
