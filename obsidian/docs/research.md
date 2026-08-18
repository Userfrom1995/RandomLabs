# Obsidian - Research: lossless image compression competitive with JPEG XL / WebP

- **Issue:** #68
- **Author:** Dr. Mob, the Researcher
- **Date:** 2026-08-17

This document is the literature review and quantitative landscape for the
Obsidian codec. Companion documents: the algorithmic specification
(`docs/algorithmic-spec.md`) and the benchmark protocol
(`docs/benchmark-methodology.md`).

---

## 1. Problem statement

Design, implement, and iteratively improve a **lossless** image-compression
codec that competes with established codecs: JPEG XL (modular lossless mode),
WebP (lossless mode), and the conventional family (PNG, JPEG-LS, JPEG 2000
lossless). Success is measured on the **Kodak image dataset** (24 true-color
images, 768x512, 24-bit RGB), using **bits per pixel (bpp)** as the primary
metric, with bit-exact round-trip fidelity as a hard requirement.

The emphasis is on *practical* codecs: competitive compression at usable
encode/decode speed. The extreme-compression regime (MRP, PAQ-family context
mixing) is documented as a stretch goal and a lower-bound reference, not as
the primary target.

## 2. Literature review

### 2.1 The pipeline every modern lossless codec shares

A lossless image codec is a cascade of lossless stages:

1. **Spatial prediction**: predict each pixel from already-decoded neighbors,
   keep the residual.
2. **Transform / decorrelation**: reversibly remove inter-channel (color) and
   structural redundancy.
3. **Context modeling**: partition residuals into contexts so that the
   conditional residual distribution within each context is sharply peaked.
4. **Entropy coding**: code the residual symbols near their conditional
   entropy, using Huffman, Golomb/Rice, arithmetic coding, or ANS.

Compression quality is determined by stages 1-3; stage 4 determines how close
we get to the entropy of the conditioned residual stream. This taxonomy is
stated repeatedly in the JPEG-LS (LOCO-I), CALIC, FLIF, and JPEG XL
literature, and confirmed by the JPEG XL white paper 2.0: "Prediction is run
using a pixel-by-pixel decorrelator without side information, including a
parametrized self-correcting weighted ensemble of predictors. Context modeling
includes specialised static models and powerful meta-adaptive models that take
local error into account, with a signalled tree structure and predictor
selection per context."

### 2.2 Predictors

- **PNG filters** (RFC 2083): five fixed filters (None, Sub, Up, Average,
  Paeth) selected per scanline. Weak: a single filter per row cannot adapt to
  local structure.
- **MED (median edge detector)**, JPEG-LS (LOCO-I): `min(a,b) if c >= max(a,b);
  max(a,b) if c <= min(a,b); a+b-c otherwise`. Robust, near-optimal on
  photographic content at very low complexity.
- **GAP (gradient-adjusted predictor)**, from CALIC: a threshold-controlled
  blend of left/top/diagonal values based on local gradient magnitudes. A 2024
  study (Mamedov, University of Western Ontario) substituted GAP for the
  gradient predictor inside JPEG XL's modular mode and measured improved
  lossless rates on DIV2K for images with flat-color regions and strong,
  well-defined edges, confirming GAP remains a competitive building block.
- **Multiple predictors per pixel**: JPEG XL modular mode combines a bank of
  simple predictors with a parameterized **self-correcting weighted predictor**
  (an ensemble of up to four sub-predictors whose weights and max-error
  bookkeeping adapt to the local region). Predictor selection is context-driven,
  on a per-pixel basis. This is the key reason JPEG XL lossless leads the
  practical codecs.
- **MRP (multiple regression prediction)** uses per-context least-squares
  regression over a neighborhood: the strongest predictors available, at
  prohibitive speed.

### 2.3 Color decorrelation

- **YCoCg / reversible color transform (RCT)**: integer, exactly invertible
  transforms. JPEG XL's modular mode uses RCT variants; JPEG 2000 uses its own
  reversible 5/3-based RCT. For photographic RGB, a good reversible
  luma/chroma split reduces residual entropy substantially versus coding RGB
  independently.
- **WebP lossless** uses a spatial transform (13 predictors) plus a reversible
  color transform and a palette/color-cache transform.
- Cross-channel prediction (predict chroma from luma) is another option; keep
  as a candidate.

### 2.4 Context modeling

- **JPEG-LS**: quantizes three local gradients `(g1,g2,g3)` into a bounded set
  of contexts with a symmetry-reduction mapping, then codes the residual with a
  context-adaptive Golomb-Rice coder.
- **FLIF (Free Lossless Image Format)**: *MANIAC* (Meta-Adaptive Near-zero
  Integer Arithmetic Coding): decision trees over local properties signal the
  context AND the interpolating predictor, learned per image, coded into the
  stream. Interlaced coding (encode a low-resolution version first, refine with
  residuals) gives FLIF very strong contexts.
- **JPEG XL modular**: combines a **meta-adaptive (MA) tree** (a signaled
  decision tree over "properties", such as neighborhood sample values, position,
  and the predictor's max_error) with **static entropy distributions** learned
  in an encoding pass. The MA tree selects both the predictor and the context
  per pixel. Histogram sharing between tree leaves avoids redundant tables.
  Per the Cloudinary modular-mode explainer (Sneyers, 2024): "in JPEG XL the
  context model itself can also be adapted to the specific image data that is
  being encoded, hence it's called meta-adaptive context modeling." Static
  distributions give JPEG XL a decode-speed advantage over FLIF's fully
  adaptive arithmetic coder, while keeping the flexibility of MA trees.
- **CALIC** uses a large context set with gradient modeling plus a
  complementary error-feedback model.

### 2.5 Entropy coders

- **Huffman** (PNG/DEFLATE, WebP lossless): integral bits per symbol; cannot
  spend less than 1 bit on the most probable symbol. WebP's near-90%-zero
  contexts pay a measurable penalty (approximately 0.5 bit per zero symbol).
- **Golomb-Rice** (JPEG-LS): context-adaptive parameter `k`; excellent for
  peaked, one-sided-geometric residual distributions; near-optimal for that
  model class at negligible cost.
- **Arithmetic coding** (FLIF, CALIC): fractional bits, adaptive probability
  estimation. FLIF paid a decode-speed penalty for fully adaptive
  distributions.
- **ANS - asymmetric numeral systems** (JPEG XL rANS, plus tANS variants in
  LOCO-ANS and QLIC): fractional bits with Huffman-like table speed; near the
  Shannon limit while decoding in simple table lookups. This is the modern
  sweet spot: *rANS with static tables learned per context* is what makes JPEG
  XL lossless both compact and fast. JPEG XL's ANS/Huffman variants also handle
  the pathological singleton histogram (a symbol with 100% probability) at
  asymptotically zero bits per residual, an important edge case for a
  from-scratch implementation to replicate.
- **Context mixing** (PAQ family, MRP, BBB): logistic/linear mixing of
  probability estimates from many contexts, often with a binary arithmetic
  coder. The strongest compressors known for natural images, but orders of
  magnitude slower.

### 2.6 Practical summary of the design space

| Codec | Predictor scheme | Context model | Entropy coder | Notes |
|---|---|---|---|---|
| PNG | 5 fixed filters / row | none (per-row) | DEFLATE (Huffman+LZ77) | slow to compress, weak density |
| JPEG-LS | MED | quantized gradients + symmetry | Golomb-Rice per context | fast, strong for its complexity |
| WebP lossless | 13 predictors / block | fixed context map + color cache | custom Huffman | beats PNG by ~20%+ |
| FLIF | interpolating + MANIAC tree | MANIAC (meta-adaptive) | adaptive arithmetic | SOTA 2016-2021, superseded by JXL |
| JPEG XL (modular) | predictor bank + self-correcting weighted | MA tree + static per-context tables | rANS (or prefix) | current practical SOTA |

### 2.7 State of the art on Kodak (literature values)

Kodak average, in bits per pixel (24 images, 768x512). Exact numbers vary by
tool version and encoding effort; ranges are from the referenced studies and
public benchmarks.

| Codec | Kodak average (bpp) | Source / note |
|---|---|---|
| PNG (optimized, optipng/pngcrush) | ~4.2 | DEFLATE is the floor; optipng -o7 near best |
| JPEG 2000 lossless | ~3.8 | 5/3 reversible wavelet |
| JPEG-LS | ~3.7 | CharLS |
| CALIC | ~3.7 | classic context-based |
| WebP lossless | ~3.4-3.5 | libwebp 1.x, method 6 |
| FLIF | ~3.1 | interlaced MANIAC |
| JPEG XL lossless (modular) | ~3.1-3.3 | libjxl, effort 7/9 |
| MRP / context-mixing | ~2.6-2.8 | impractical speed, lower bound |

Independent confirmation:
- Barina (Brno University of Technology, 2021), "Comparison of Lossless Image
  Formats", measured on photographic, illustrative, and scanned-page datasets
  that FLIF was the most efficient lossless format closely followed by JPEG XL,
  with WebP 2 third. FLIF's lead (e.g. 9.32 vs 9.43 bpp on the Photos dataset)
  is small and comes at a heavy decode-speed cost; JPEG XL supersedes it.
- The independent aggregate benchmark (WangXuan95/Image-Compression-Benchmark,
  2024, across CLIC2021+LPCB+GDCC2020+UCID+ImgInfo+GDCC) reports JPEG XL
  (-q100 -e5) as smallest, WebP lossless (m5) ~7.5% larger, optipng PNG ~28%
  larger, JPEG-LS ~29% larger. JPEG XL's lead is consistent with the per-image
  Kodak literature above.

The honest read: a *practical* codec that beats WebP decisively and lands
within ~5-10% of JPEG XL lossless is a genuinely competitive result. Matching
or beating JPEG XL itself requires replicating its two signature ideas:
per-pixel context-driven predictor selection (the self-correcting weighted
predictor + MA-tree-style context assignment) and rANS entropy coding over
per-context (static) tables.

## 3. Technical conclusions for the Obsidian design

1. **Predictor quality is the biggest lever.** PNG-to-JPEG-XL gap on Kodak
   (roughly 4.2 to 3.2 bpp, about 25%) comes mostly from prediction plus
   context modeling. A good predictor bank plus per-context selection is
   mandatory; a single fixed predictor cannot compete.

2. **rANS is the right entropy coder for the practical target.** It delivers
   fractional-bit coding (unlike Huffman in WebP), decodes fast (unlike FLIF's
   adaptive arithmetic), and is simple to implement from scratch. It is the
   only entropy coder in the practical set that does not structurally cap
   compression.

3. **Reversible color transform pays for itself on photographic content.**
   A YCoCg-R-style transform is a few integer ops per pixel and typically
   worth several percent on Kodak.

4. **Context count must be bounded and densities must stay high.** ~200-400
   contexts per channel with 12-bit adaptive/static tables is the right
   operating point. Too many contexts on a 768x512 image means sparse
   statistics and model cost; too few means poor conditioning.

5. **The realistic milestones, in order (rebased on the measured PCD0992
   baseline of 2026-08-18, not the literature-only numbers):**
    - **M0 (blocker): fix the entropy stage.** The first measured Obsidian row
      (effort 4) lands at **27.82 bpp, i.e. 1.16x raw RGB** (24.00 bpp) because
      the per-context 512-symbol adaptive rANS never specializes on a 768x512
      image and codes every residual at ~9 bits. This is a design defect in the
      entropy coder, not in prediction. It is diagnosed rigorously and fixed in
      `docs/entropy-analysis.md` (replace the 512-symbol adaptive rANS with
      per-context adaptive Golomb-Rice).
    - M1: beat WebP lossless (9.61 bpp) AND optipng PNG (13.05 bpp) on Kodak.
      Achievable with Golomb-Rice + the existing predictor bank + per-context
      predictor selection + YCoCg-R (expected ~9.5-10.0 bpp).
    - M2: approach JPEG XL (needs self-correcting weighted predictor and
      per-context predictor selection to actually reduce size; target <= ~9.6
      bpp, within ~10% of JPEG XL's 8.71).
    - M3: match or beat JPEG XL (<= 8.71 bpp) at high effort (needs a
      capped-and-escaped static rANS, or squeeze/interlacing, plus tuning).
    - Stretch: context mixing (MRP-class) as a separate slow mode, only after
      M3 is achieved.

   The benchmark "bpp" column is total bits per image pixel (all channels); the
   literature values in section 2.7 are per channel (x3 = the totals above), so
   there is no measurement contradiction. The discrepancy between the old
   milestone list and reality is the entropy-coder expansion, now understood.

6. **The direction is clearly viable.** The gap between a from-scratch
   implementation of known-good building blocks (predictor bank + RCT +
   context modeling + rANS) and the practical state of the art is small, and
   every block is well-understood published science. The risk is in
   engineering effort and in matching JPEG XL's tuned constants, not in
   fundamental feasibility.

## 4. What we will not do (scope guards)

- No lossy mode in phase 1. Obsidian is lossless until the lossless target is
  met.
- No dependence on external compression libraries: entropy coding, transforms,
  and prediction are implemented from scratch (only generic OS I/O and
  standard library).
- No closed datasets: all benchmarking is on Kodak plus optional secondary
  sets (e.g., the benchmark suite's extra sets) for generalization checks.

## 5. Next step

The algorithmic specification (predictor bank, context definition, rANS
constants, format layout, pseudo-code, complexity analysis) is in
`docs/algorithmic-spec.md`. The measurement protocol is in
`docs/benchmark-methodology.md`. Handoff to the Architect.

---

## 6. Interim diagnosis (2026-08-18)

After the first end-to-end build (effort 4) produced a Kodak mean of **27.82 bpp**
(1.16x raw), a root-cause analysis was performed. The finding: the entropy-coding
stage, not the prediction/transform/context stages, is the defect. A per-context
adaptive rANS over a 512-symbol alphabet with single-unit frequency updates cannot
specialize its tables on a 768x512 image (each of the 285 contexts receives only
~4138 symbols, far fewer than the ~2048 increments needed to make the dominant
residual symbol cheap), so symbols are coded at the uniform ~9-bit start cost,
which exceeds the 8-bit raw pixel and expands the file. The rigorous proof, the
no-expansion requirement, and the corrected designs (per-context adaptive
Golomb-Rice for M1; capped-and-escaped static rANS for M2/M3) are in
`docs/entropy-analysis.md`. The prediction bank, YCoCg-R transform, gradient
context model, and container/CRC are correct and are preserved.

- Dr. Mob, the Researcher