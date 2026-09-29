# Addendum 26 - Pinned Constants: Route 5 Autoregressive rANS (issue #130)

All constants below are FROZEN before any measurement. The Builder is forbidden
to move a gate or re-tune a pinned number to force a pass; measurement reports
the honest number against these pins.

## A. Tokenization (hybrid-uint profile, Route 5)

- `R5_T_ESC = 15` - token escape ladder (token = min(|c|, 15)).
- Token alphabet size `R5_ALPHA = 16` (0 = zero, 1..14 = direct magnitude |c|=1..14,
  15 = escape (|c| >= 15)).
- SIGN bit emitted for every nonzero token (separate binary rANS event, prob 0.5);
  escape magnitude: Elias-gamma of |c| (unary prefix + q raw bits), each bit a
  binary rANS event at fixed prob 0.5. Reverse-emitted so decode recovers
  assembly order (token, sign, gamma...).
- Direct range 15 (vs the initial 8) keeps the common magnitudes inside the
  categorical net and reserves the slow Elias-gamma escape for the rare large tail.

## B. Causal neural net (baked, zero transmitted bytes)

- Input features (normalized 0..1): orient/3, level/5, parent_sig, fc/4, dg/4,
  nbsig/8, nmag/7, pmag/7, ownmag/7, ppos/7(=0), lc_mag/7(=0), lc_sig(=0), level/5.
  (13 features, aligned with the Route-4 `learned_norm` layout; symtype/ppos/ownmag/
  lc_* set 0 - the active signal is orient, level, parent_sig, fc, dg, nbsig, nmag, pmag.)
- Architecture: 13 -> 32 (ReLU) -> 16 (ReLU) -> 16 (softmax logits).
- Output: 16 frequencies summing to M = 2^16, each clamped >= 1.
- Baked weights file: `prism/src/codec/route5_data.inc` (R5TOK_*).
- Net blend lever `R5_BLEND` (default 1.0 = net weight 0.5; EMA pseudocount K
  default 64). Runtime-overridable without rebuild for measurement sweeps.

## C. Adaptive EMA blend (categorical, per fine context)

- Fine context dims: orient(4) * level(6) * parent_sig(2) * fc(5) * dg(5) *
  nmag(8) * ownmag(8) = 76800 pools.
- Per-pool categorical EMA over 16 tokens, blended with net via
  `alpha = n/(n+K)`. Decode replays the SAME update in forward order, so the
  stream round-trips exactly (LIFO handled by reverse emission, as Route 4).

## D. Binding gates (identical to Route 4, dual-unit)

- M2: per-sample < 3.166 bpp AND summed < 9.498 bpp/img (vs WebP m6 3.2043).
- M3: per-sample < 2.885 bpp AND summed < 8.655 bpp/img (vs real JXL -d0 -e9 2.8700).
- Corpus: REAL Kodak-24 (`prism/benchmarks/data/kodak.sha256`, present locally at
  `obsidian/benchmarks/data/kodak/`).
- Invariants preserved: I26 (reversible lift), I27 (no model tables transmitted),
  I29/I31/I32/I33 (zero model bytes), I28 (parent-aware causal context spirit).

## E. Wire / dispatch

- `WaveletHeader.residual_mode` bit 1 (value 2) selects Route 5 (in addition to
  bit 0 = residual). Decode dispatches Route5Coder when bit 1 set; else bitplane.
- CLI: `prism wavelet5 <in.ppm> <out.prsm>` encode/decode; `prism train-route5`
  bakes `route5_data.inc`; `prism bench-route5 --kodak <dir>` measures Kodak-24.

- the Builder
