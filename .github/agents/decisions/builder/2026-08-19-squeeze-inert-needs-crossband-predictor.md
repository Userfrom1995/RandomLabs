# Decision: Squeeze cannot clear the JPEG XL gate without a cross-band in-loop predictor

- **Decider:** the Builder
- **Date:** 2026-08-19T14:45:00Z
- **Applies to:** issue #68 / PR #83 (Obsidian lossless codec)
- **Status:** proposed

## What was decided
The R10-A Squeeze group transform as implemented on PR #83 cannot help photographic
Kodak and is currently inert (the never-expand safety net discards it because it
expands the file). Reaching the JPEG XL 8.71 bpp gate requires a genuinely
different predictor mechanism - a cross-band / property-tree (MA) in-loop context
model - which is an Architect blueprint, not a Builder tweak. I am escalating to
the Maintainer with this diagnosis rather than shipping ineffective or risky code.

## Rationale
- Measured on kodim01 (768x512 RGB, effort 4): baseline (no Squeeze) = 521727 bytes
  (10.6146 bpp). Forcing Squeeze level 1 = 613018 bytes (Config A, whether CMARC or
  GR) - i.e. Squeeze ADDS ~91 KB. Levels 2/3/4 are worse (up to 637829 bytes). The
  safety net therefore always keeps the no-Squeeze candidate, so Squeeze is inert.
- Root cause: after `squeeze` splits a plane into LL + HL/LH/HH sub-bands, each HF
  band is a decimated grid (its in-band left/up neighbour is TWO original pixels
  away). The HF sample genuinely differs from the LL-band average by up to +/-163
  (real photographic high-frequency content), so the stored HF residual is large.
  Worse, when the HF band is coded by the per-plane in-loop predictor
  (weighted-tree + CMARC), that predictor only sees in-band neighbours (again
  2-away), so it cannot decorrelate the HF band either. I implemented and measured
  a causal HF predictor that blends the LL band with the HF band's own reconstructed
  causal neighbours (the real JPEG XL mechanism): HF band bytes were unchanged
  (~85 KB each) because the blend necessarily dilutes the immediate LL neighbours
  and the 2-away in-band neighbours remain weak. Squeeze fundamentally cannot help
  this codec until the in-loop predictor can reference the LL sub-band sample at the
  same (i,j) - i.e. a cross-band-aware predictor.
- Context: the codec already has the full R1-R10 stack (CMARC at H(p)+epsilon,
  weighted-tree predictor at the JPEG-LS floor, R3-A residual context, R2.1
  cross-channel, R10-B CFL which DOES help ~0.5 bpp). Real Kodak effort-4 best =
  9.5208 bpp: PNG 13.05 MET, WebP 9.61 MET, JPEG XL 8.71 NOT MET (+0.81 bpp).
  Every Builder-stage attempt (R1-R10, including this Squeeze investigation) has
  plateaued at ~9.5-9.7 bpp; the ~0.8 bpp to JPEG XL is the per-pixel CMARC
  pipeline's ceiling without a cross-band/property-tree context model.

## Notes
- CFL (R10-B) is the only R10 component that helps and is kept by the safety net.
  Squeeze, run mode, LZ77, color cache, context mixing all proved inert/regressive
  on photographic Kodak and are correctly inert behind the never-expand net.
- Recommended next blueprint (for the Architect): make the in-loop predictor for HF
  Squeeze sub-bands reference the LL sub-band sample at the same (i,j) (and ideally
  a property-tree / MA context model mixing LL + in-band + sibling-HF references),
  signaled per sub-band, so the group transform actually reduces HF entropy. This is
  the documented JPEG XL lever and the only path I can see to < 8.71 bpp.
- The owner override forbids merge until PNG + WebP + JPEG XL are all beaten
  bit-exactly; that gate remains unmet, so no merge is attempted here.

- the Builder
