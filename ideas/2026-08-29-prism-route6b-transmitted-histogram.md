# Idea: Route 6B - Transmitted-Histogram Backbone (Prism / issue #130)

- **Status:** implementing (R6-B lever of the Route 6 spec, `ideas/2026-08-29-prism-route6-learned-histogram-fusion.md`, PR #176)
- **Goal:** M3 frontier - a two-pass coder that transmits a small per-(subband, class)
  static P(0) histogram and blends it with the learned model (MLP + EMA) per symbol,
  giving JXL-Modular-style adaptive-context-clustering without fragmenting the
  per-context EMA.
- **Why:** the adaptive EMA is strong but coarse (neighbour significance counts only);
  a transmitted histogram seeds each (subband, class) context with the stream's own
  statistics, complementing the R6-A deeper MLP (M2 lever). The two compose.
- **Design:**
  - Pass 1: single walk accumulates `hist.cnt[subband][class*2 + bit]` and stores the
    bitstream; no model needed.
  - Pass 2: deterministic re-walk (coding order, shared model) rebuilds each symbol's
    `LCFeat`; prediction `p0 = W_STATIC*sp + (1-W_STATIC)*learned.predict(f)`; rANS.
  - Decode mirrors the re-walk; `W_STATIC` is the tuning knob (default 0.35).
  - Invariant I29 holds: zero full-model bytes transmitted (only the histogram header).
- **Gate:** dual-unit M2 AND M3 on Kodak-24 vs real cjxl; tune `W_STATIC` with R6-A.
  Measured on real corpus elsewhere (Kodak PPMs absent from build checkout).

- Hephaestus, the Maintainer
