# Ideas: Prism Route 5 - Truly Autoregressive Learned rANS Frontend (issue #130)

## What it is

Route 5 is the final structurally-open entropy frontier for Prism after the
beyond-predictive (Option 2) paradigm was honestly exhausted at **3.2175/sample**
(X6b, Route 4). Where Route 4 still bitplanes each coefficient and codes every
bit with a per-bit adaptive binary rANS, Route 5 replaces the per-bitplane
coder entirely with a **hybrid-uint tokenization coded by a multi-symbol (categorical)
rANS whose per-token distribution is emitted by a baked neural net from a causal
neighbour window**.

This is a *true* autoregressive rANS (not a per-bit coder with a learned
probability): for each coefficient the net answers "what is the full categorical
distribution over tokens {zero, |c|=1..7, escape}?" in one shot, and the rANS
encodes the chosen token near its entropy bound. The escape path falls back to
an Elias-gamma magnitude coded by the same rANS at a fixed 0.5 probability.

## Why it is the only open lever

- The X-series entropy diagnostic proved the bitplane coder is entropy-near-optimal
  for the *bit* domain: no fixed-context refinement moved it.
- X6a/X6b/X6c proved the *source* (coefficient field) is the remaining bits, and a
  learned MLP predictor (X6b) already removes most source entropy via residuals.
- The remaining ~1.6% to M2 lives in the fact that a per-bit adaptive coder must
  re-derive the magnitude distribution from 17 independent bit decisions, each
  starting from a coarse EMA. A single categorical over tokens lets the net model
  the joint magnitude/sign structure directly, exactly as JPEG-XL / L3C-style
  autoregressive models do.

## Design (pinned before measurement: addendum-26)

- **Token alphabet (T_ESC=8, pinned):** token = min(|c|, 8). 0 = zero; 1..7 =
  direct magnitude (a separate SIGN bit follows every nonzero); 8 = escape.
- **Escape:** SIGN bit, then Elias-gamma of |c| (unary prefix + raw bits), all
  coded by the same rANS at fixed 0.5. Escapes are a tiny minority of residuals
  (predictor explains ~74% variance, residuals mostly |r|<8), so the fallback cost
  is negligible.
- **Causal features (LIFO-safe):** 2D-causal neighbour window only - (orient, level,
  parent_sig, 4-connected + diagonal significance counts fc/dg, max neighbour
  magnitude bucket nmag). No rANS-stream-history state, so decode reproduces the
  exact distribution. The net is PURELY a function of already-decoded neighbours.
- **Baked net:** 13-input -> 32 -> 16 -> 9 logits, softmax -> 9 frequencies summing
  to M=2^16. Weights baked into `route5_data.inc` (zero transmitted bytes, I29).
- **Adaptive blend:** a per-fine-context categorical EMA (the Route-4 lesson:
  rare contexts lean on the net, rich contexts converge to the exact per-stream
  EMA) blends with the net prior via a pseudocount K and a global blend lever.
- **Reuse:** `wavelet.*`, `predictor.*` (baked MLP coefficient predictor, residual
  source), `hybrid_uint.*` tokenization shape. Zero model bytes transmitted (I29/
  I31/I32/I33).

## Wire format

Rides the existing WAVELET_FLAG v1 envelope. `WaveletHeader.residual_mode` bit 0 =
residual (predictor), bit 1 = route5 (token rANS instead of bitplane). One rANS
stream per subband, sliceable via `sub_bytes`.

## Decision tree / projected result

- From X6b 3.2175/sample: a correctly-modelled categorical token prior should beat
  the per-bit adaptive EMA. Mid-case -5% = 3.057 clears M2 (3.166); optimistic
  -8% = 2.96 reaches M3 (2.885). If it still misses, the architecture is at its
  honest floor and the issue escalates to the Owner (accept 3.0x as Prism best or
  authorise a full JXL-Modular redesign).

- the Builder

## Final status (2026-08-29, as built)

The design was iterated during implementation; the actually-built and measured
configuration (frozen in addendum-26) differs from the pinned draft above:

- **Token alphabet R5_T_ESC=15, R5_ALPHA=16** (not 8/9). token = min(|c|,15);
  0=zero, 1..14=direct magnitude (separate sign bit for tok>=1 && tok<15),
  15=escape with SIGN + Elias-gamma. Net arch 13->32->16->16 softmax (not ->9).
- **Result (honest, Kodak-24, LeGall53, levels 5, trained net):**
  - mean per-sample = **3.53136 bpp**; mean summed = **10.59408 bpp/img**.
  - FAILS M2 (gates 3.166 / 9.498) and M3 (2.885 / 8.655).
  - ~9.7% **worse** per-sample than Route 4 X6b (3.2175 / 9.6525).
- The net genuinely helped (neutral net = 3.983/sample -> trained = 3.531), but
  the 2D-causal neighbour window alone cannot beat the per-bitplane binary coder:
  a single coarse magnitude context loses the fine per-bit conditioning the
  bitplane EMA exploits. No further cheap lever exists within this design.
- Per Anti-Surrender the gates stay OPEN: `Refs #130`, not closed. Escalation to
  the Owner stands (accept ~3.2x as Prism entropy floor or authorise a JXL-Modular
  level redesign). Full benchmark in `benchmarks/results/2026-08-29-r5-kodak24.csv`.

- the Builder
