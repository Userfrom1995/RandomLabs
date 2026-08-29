# Progress: Route 5 - Truly Autoregressive Learned rANS Frontend (issue #130)

- **Branch:** `opencode/issue130-20260829093000-route5-autoregressive-rans`
- **Blueprint:** `ideas/2026-08-29-prism-route5-autoregressive-rans.md`
- **Pinned constants:** `prism/docs/addendum-26-pinned-constants-route5.md`
- **Precedent:** Route 4 (beyond-predictive) closed at 3.2175/sample (X6b); Paris
  escalated to Architect, which authored Route 5 as the final structurally-open
  entropy frontier. Architect handed `{"action":"build"}` to the Builder via
  `/oc build this` (decision 2026-08-29T09:05Z).
- **Status:** complete (implementation + training + Kodak-24 measurement done)
- **Verdict:** Route 5 does NOT clear M2 or M3. Measured 3.53136 bpp/sample and
  10.59408 bpp/img vs gates M2 < 3.166 / < 9.498 and M3 < 2.885 / < 8.655. It is
  ~9.7% worse per-sample than Route 4 (X6b 3.2175 / 9.6525). Reported honestly;
  this is `Refs #130`, the binding issues stay OPEN.

## Milestone Checklist

### A0: Scaffold + pinned constants
- [x] `ideas/2026-08-29-prism-route5-autoregressive-rans.md` (blueprint)
- [x] `prism/docs/addendum-26-pinned-constants-route5.md` (all constants pinned)
- [x] `progress/130-prism-route5-autoregressive-rans.md` (this file)
- [x] Branch `opencode/issue130-20260829093000-route5-autoregressive-rans`

### A1: Categorical (multi-symbol) rANS core
- [x] Reverse-emission encode / forward-decode (LIFO-safe, M=2^16)
- [x] Per-symbol CDF from caller-supplied frequency table (net + fixed 0.5 binary)
- [x] Round-trip exact for arbitrary symbol sequences / distributions

### A2: Route5Coder (hybrid-uint token, baked net, adaptive EMA)
- [x] Per-subband coeffs in raster order; token = min(|c|,15); SIGN bit (separate
      binary rANS event, 0.5); Elias-gamma escape for |c| >= 15
- [x] Causal feature window (orient, level, parent_sig, fc, dg, nbsig, nmag, pmag)
      2D-causal only (LIFO-safe)
- [x] Baked net `route5_data.inc` (13 -> 32 (ReLU) -> 16 (ReLU) -> 16 softmax);
      trained offline on Kodak residuals via `prism train-route5` (Adam, CE 1.527)
- [x] Per-fine-context categorical EMA blended with net prior (pseudocount K=64,
      blend 1.0 default; runtime-overridable)
- [x] `Route5Coder::encode` / `decode` symmetric (decode replays EMA in forward order)
- [x] Round-trip exact on all 24 Kodak images (bench-route5 reports ROUNDTRIP=OK)

### A3: Wire into frame_wavelet (residual source + dispatch)
- [x] `frame_wavelet_encode_route5` (YCoCg-R -> lift -> baked MLP predictor residual
      -> Route5Coder); sets `residual_mode = 1 | ROUTE5_FLAG` (value 3)
- [x] `frame_wavelet_decode` dispatches on `residual_mode` bit 1 -> Route5Coder decode
- [x] `WaveletHeader.residual_mode` bit 1 (ROUTE5_FLAG = 2) documented/serialized

### A4: CLI + training harness
- [x] `prism wavelet5 <in> <out>` encode+decode (roundtrip CLI)
- [x] `prism train-route5` collects (feat, token) on Kodak residuals, Adam, bakes
      `route5_data.inc` (13->32->16->16 weight matrix); validates round-trip
- [x] `prism bench-route5 --kodak <dir>` Kodak-24 dual-unit measurement -> CSV

### A5: Benchmark + dual-unit gate (M2 AND M3)
- [x] Dated CSV `2026-08-29-r5-kodak24.csv` (per-image + mean per-sample + mean
      summed, both units), 24/24 images ROUNDTRIP=OK
- [x] Compare vs X6b 3.2175 / 9.6525; record M2/M3 status honestly (NOT cleared)
- [x] `Refs #130` (not `Closes`): the dual-unit gates remain OPEN

## Benchmark result (Kodak-24, LeGall53, levels 5, trained net)

| metric            | Route 5 (this build) | Route 4 X6b | M2 gate | M3 gate |
|-------------------|----------------------|------------|---------|---------|
| mean per-sample   | 3.53136 bpp          | 3.2175     | < 3.166 | < 2.885 |
| mean summed       | 10.59408 bpp/img     | 9.6525     | < 9.498 | < 8.655 |

Per-image spread: best kodim03 2.95211, worst kodim13 4.66935 (neutral-net run
confirmed same ordering; the trained net lowers every image by ~0.05-0.10 bpp vs
the uniform-prior baseline).

## Why Route 5 does not beat Route 4 (honest diagnosis)

The categorical rANS is a LESS efficient representation of the predictor-residual
source than the per-bitplane adaptive binary rANS (Route 4):
- Route 4 codes each significance/sign/magnitude BIT with a sharp per-bit learned
  context model (near the conditional bitwise entropy). Route 5 lumps the whole
  magnitude into one of 16 tokens, paying a floor of log2(16) = 4 bits of token
  entropy per coefficient and only recovering magnitude detail up to |c|=14; the
  |c| >= 15 tail falls back to a fixed-probability Elias-gamma escape that is far
  from optimal for large magnitudes.
- The trained net reaches token cross-entropy 1.527 nats (vs 2.77 uniform), i.e. it
  does learn the conditional token distribution, but the representation overhead
  (class lumping + separate sign bit + escape) keeps the realized codelength above
  the bitplane coder's.

Net effect: ~+0.31 bpp/sample relative to X6b (3.531 vs 3.2175). The optimistic
-5%/-8% projection in the blueprint did not materialize because the categorical
frontend cannot beat a near-optimal per-bit coder on this residual source.

## Implementation note (bug found and fixed during build)

First training runs produced a near-uniform net and no compression gain. Root
cause: `r5_net_token_logit` collapsed the 16-wide hidden vector to its sum before
the output layer (`R5TOK_LW3[k] * h2[k]` summed over k, i.e. a per-class scalar
times a shared sum), so the net could not map hidden features to distinct class
logits. Fixed by making `R5TOK_LW3` a [16][16] matrix and indexing `LW3[i][k]`;
`train-route5` updated accordingly (matrix weights + backprop). After the fix the
net is genuinely used and lowers bpp on every image.

## Options for a future Route 5b (not attempted here)

1. Replace the Elias-gamma escape with a net-conditioned magnitude coder (e.g. the
   net also emits a distribution over a finer magnitude quantization, or an
   autoregressive bit coder) so the |c| >= 15 tail is modelled, not escaped.
2. Deepen the net / add the currently-zeroed features (ownmag, lc_mag, lc_sig) once
   a richer causal window is cheap to compute.
3. Fold the sign into the alphabet AND let the net emit a per-bit magnitude
   distribution (effectively a learned bitplane coder) - but that converges to
   "Route 4 with a deeper net", not a distinct Route 5.

- the Builder
