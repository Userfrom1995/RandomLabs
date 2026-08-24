# Prism - Algorithmic Specification

This is the authoritative algorithm contract for Prism, the C++ lossless image
codec. It is the handoff from the Researcher (Dr. Mob) to the Architect. Every
stage below is an integer bijection on the sample domain, so the end-to-end
pipeline is reversible and bit-exact by construction given correct inverse
ordering. Complexity is stated per stage.

Conventions: a sample is an unsigned integer in `[0, 2^B - 1]` (B = 8 or 16).
Planes are stored planar: `plane[c][i]` for channel `c`, raster index `i`. All
arithmetic on samples that can overflow is widened to a signed integer type of
at least `B+2` bits (i16 for B=8, i32 for B=16) and clipped back to `[0, 2^B-1]`
at the boundary of each reversible stage.

## 1. Front-end: format normalization (encoder input only)

The codec bitstream is **format-agnostic**. The encoder ingests any of PNG, JPEG,
BMP, TIFF, WebP, PPM (P6/P5/PPM16), and raw (raw requires width/height/bit-depth
flags), decodes each to a canonical raster via a robust decoder library, and
compresses the raster. The decoder emits the canonical raster; lossless fidelity
is defined as equality between the encoder's decoded input raster and the
decoder's output raster, sample-for-sample.

- Canonical raster: planar, channels in `{1 (gray), 2 (ga), 3 (rgb), 4 (rgba)}`,
  bit-depth B in `{8, 16}`, no interlacing, no color management (the front-end
  applies ICC/profile decoding before handing pixels to the codec so the codec
  sees linearized samples).
- Front-end decoders are treated as untrusted I/O: they never touch the
  bitstream crypto/CRC path. A decode failure is a hard encoder error, not a
  corrupt-stream condition.

## 2. Color decorrelation (Stage C, reversible)

Candidate transforms, each a bijection on the planar raster. The encoder measures
mean absolute residual over the image for each candidate (after a fixed reference
predictor) and selects the cheapest; the choice is mirrored in the header. Every
transform's identity parameter reproduces the input, so selection **never
expands** (strict-superset property).

- **None**: R,G,B,(A) planar as-is.
- **YCoCg-R** (default for color): Y = (R+2G+B)>>2; Cg = G - ((R+B)>>1);
  Co = B - R; round-trip R = Y - (Cg>>1) - (Co>>1); G = Co + R; B = Co + R.
  Widen intermediates to B+1 (9-bit at B=8) to avoid overflow; A untouched.
- **Subtract-green**: R -= G; B -= G (inverse adds back). Often composed with
  YCoCg-R.
- **CFL (chroma-from-luma)**: for each chroma plane `ch` with luma plane `L`,
  encode scale `s in 0..=7`; store `ch' = ch - round(s * L / 8)`; decoder
  restores `ch = ch' + round(s * L / 8)`. Search `s` in analysis minimizing
  summed `|ch'|`. `s=0` is identity.
- **5/3 integer lifting (stretch, R-stage only)**: reversible wavelet
  `d = x - round((a+c)/2); s = a + round((d+b-d_odd)/4)` as an alternative
  single-level decorrelator; never selected unless it beats YCoCg-R+R9 weighted.

Selection space = {None, YCoCg-R, subtract-green, YCoCg-R+subtract-green,
CFL(x each chroma)}; the encoder picks min-MED. Alpha is never transformed.

## 3. Squeeze (Stage S, JPEG XL CDC) - MANDATORY

Recursively transform each 2D plane into sub-bands. One level:

```
split(plane P of size (w,h)):
  LL[i,j] = (P[2i,2j] + P[2i,2j+1] + P[2i+1,2j] + P[2i+1,2j+1]) >> 2
  for each of the 3 difference bands (H/V/D):
     band = P_quad - predicted_from_LL_or_neighbors      // see below
```

The three HF bands use the JXL-style lifting differences (avg of co-located LL
pixels minus the actual sample), which keeps each band in `[-2^B, 2^B]` and
reversible. Apply `L` levels (analysis searches `L in 0..=max_levels(w,h)`,
typically <= 4). **Emit order is post-order: the LL band of a node is emitted
before its three HF children**, so when the decoder reaches an HF band, the
co-located LL samples are already reconstructed (this is what makes the
CrossBand predictor (Stage 4) well-defined).

- Reversibility: each level is an exact linear bijection with integer rounding;
  round-trip is exact because the differences are stored losslessly.
- Complexity: O(pixels). Memory: one extra plane buffer per active level.
- Never-expand: an `L>0` candidate is kept only if it reduces total coded size;
  the safety net compares `L` candidates and keeps the smallest (including `L=0`).

## 4. Prediction (Stage P)

For each sub-band plane, predict sample at `(x,y)` from causal neighbors:
`L = p[x-1,y]`, `T = p[x,y-1]`, `TL = p[x-1,y-1]`, `TR = p[x-1,y+1]`, plus
(co-located LL sample `LLc` for HF bands from Stage 3) and (sibling-band samples
at `(x,y)` when available). Predictor bank:

- `P0` LEFT, `P1` TOP, `P2` TL, `P3` MED (LOCO-I median), `P4` GAP (LOCO-I edge
  average), `P5` gradient `(L+T)/2 + (TR-TL)/4`, `P6` true-motion `L+T-TL`,
  `P7` clamped add/sub variants.
- `PW` Weighted (per-fine-context least-squares, JXL/WebP style): weight vector
  `w = (wL,wT,wTL,wTR,wLL,1)` solved per fine context by normal equations
  `A w = b` (accumulate 6x6 sums over the plane in analysis); predict
  `round((wL*L + wT*T + wTL*TL + wTR*TR + wLL*LLc + bias) >> shift)`. Weights
  quantized to i16; a bias term lets smooth gradients be reproduced exactly.
- **Predictor selection** is per-context (the MA-tree leaf, Stage 5) and/or
  per-band. Since C3 (issue #130, blueprint section 5) the GLOBAL predictor
  is chosen by trial-encoding: all nine ids are pruned on a decimated grid
  by real coded bytes, then the finalists plus MED (identity, I4) are fully
  encoded with the production v2 flat coder; ties keep MED. Energy sums are
  banned from this decision (P4). Per-leaf selection remains a zero-signaled
  extension when a single global predictor wins; otherwise a compact
  per-leaf predictor id is stored in the model.

Residual `e = sample - predict(sample)`, signed, widened to i32.

## 5. Context model (Stage X) - THE PRISM DIFFERENTIATOR (MA-tree)

Instead of a flat gradient context, Prism computes the coding context via a
**learned property tree (MA-tree / MANIAC)**. The tree is built in the analysis
pass and serialized in the model section.

- **Feature vector** `f` at each sample: causal gradient `g = |L-T| + |T-TL| +
  |TL-TR|` (quantized to `QG`), the JPEG-LS residual-DIFF class
  `residual_context(dL,dU,dUl)` (quantized neighbor residuals, <= 365 ids via a
  sign-symmetry LUT), activity class, band identity (LL vs HF, and level),
  co-located LL value class (for HF bands), and sibling-band value class.
- **Tree structure**: a binary decision tree. Each internal node tests a property
  of `f` (e.g. `QG < t`, `band == HF`, `LLc_class == k`). Leaves are the actual
  probability-model contexts. Built greedily: start with one leaf; repeatedly
  split the leaf whose split most reduces estimated residual entropy, subject to
  caps (max depth D, max leaves K). Estimated entropy uses per-leaf residual
  histograms accumulated in analysis.
- **Serialization**: the tree is compact (node = {property id, threshold, left/right
  child}) and stored once per (channel-group, band-class). Decoder rebuilds the
  identical tree from the model section (no online state).
- **Why this wins**: the leaf context folds LL + in-band + sibling-HF + residual-DIFF
  into one adaptive context, which is exactly the redundancy class Obsidian's
  per-pixel CMARC could not reach and which Squeeze alone could not exploit
  (Obsidian R11-A proved Squeeze without this context modeling is inert).

## 6. Entropy coder (Stage E)

Primary backend: **context-modeled rANS** (32-bit state, byte-wise renormalization,
interleaved per-channel or a single stream). Each residual is coded as a binary
decomposition, every bin a per-context adaptive 16-bit probability (JXL-style
WNC/CABS adaptation with a fixed learning rate, clamped to a valid range):

```
encode_residual(e):
  sign = (e < 0); put_bin(sign_model[cx], sign)            // cx = MA-tree leaf
  a = abs(e)
  if a == 0: put_bin(zero_model[cx], 1); return
  put_bin(zero_model[cx], 0)
  k = cx.k                  // per-context Rice shift (EMA of |e|)
  q = a >> k; r = a & ((1<<k)-1)
  encode unary q via quotient_model[cx] (run of q zeros then a one)
  for j in (k-1)..0: put_bin(rem_model[cx][j], (r>>j)&1)   // MSB-first
```

Decoder mirrors exactly. `cx.k` is updated by an integer EMA of `|e|` (mirrored,
so zero signaled bytes). The quotient/remainder/zero/sign models are per-leaf
adaptive binary models with H(p)+epsilon efficiency (the R4 lesson: the binary
coder MUST actually compress; Prism pins a correct carryless range/rANS coder and
ships the mandatory efficiency gate from Obsidian R4).

**High-effort backends (opt-in, never-expand safety net):**
- **CM mode (context mixing):** a small logistic mixer combines 2-4 sub-estimators
  (per-context GR, a spatial prior, and an SSE map on the neighbor residual).
  `p = squash(sum_i w_i * stretch(p_i))` with online logistic updates. This is the
  MRP/PAQ route toward < 8.0 bpp at a large speed cost.
- **LZP pre-filter:** before entropy coding, scan the residual/value stream with
  an LZP (hash of recent context -> predicted symbol; on match emit a flag +
  run length, else a literal). Flags + literals feed the rANS stage. Targets
  long textual/structural runs (the issue's explicit ask).

## 7. Container (Stage H)

```
PRISM magic (4 bytes) | version (u8)
header:
  width (u32 LE), height (u32 LE), bit_depth (u8), num_channels (u8)
  color_transform_id (u8) | cfl_scales[num_chroma] (u8 each, 0 if none)
  squeeze_levels[num_planes] (u8 each, 0 if none)
model section (length-prefixed):
  MA-tree(s) per (group, band-class): serialized nodes
  per-context predictor map (compact; absent if global)
  per-context Rice-shift priors (optional, effort>=4)
  CRC32(model)
payload: per sub-band plane: [len: u32 LE][rans_bytes]
footer: CRC32(header || model || payload)
```

The container is **forward compatible**: unknown transform ids / squeeze levels /
MA-tree shapes are never required to decode an older stream because the encoder
only emits what the decoder of the same version understands; version bump is the
only compatibility lever (no hidden flags that break legacy decode, the Obsidian
lesson from CMARC).

## 8. Complexity budget

- **Encode**: O(pixels * L) squeeze + O(pixels) prediction + O(pixels * E)
  analysis/model search (E = effort, bounded tree build). MA-tree build capped at
  K leaves and depth D so analysis is O(pixels) amortized. Memory O(K) models.
- **Decode**: O(pixels * L) + O(pixels) prediction + O(pixels) entropy. Single
  pass (post-order Squeeze makes HF neighbors available). Memory O(K) + one plane
  buffer per level.
- **Bit-exact invariant**: every stage is an integer bijection; inverse order is
  exact; CRC32 gates corruption. Round-trip must hold at all efforts on Kodak and
  on fuzzed small images. This is the M0 blocker gate.

## 9. Milestone map (benchmark-driven on Kodak)

- **M0 (blocker):** bit-exact round-trip at efforts 0/4/7; determinism;
  corruption rejection. No bpp target.
- **M1:** beat optipng PNG (13.05) and WebP lossless (9.61). (Obsidian already
  proved the coder family clears PNG; Squeeze+CMARC should clear WebP.)
- **M2:** beat JPEG-LS (9.71) and approach JPEG XL.
- **M3 (owner goal):** beat JPEG XL (8.71 harness / ~2.9 per sample). Requires
  Squeeze + MA-tree both landed.
- **M4 (stretch):** CM mode + LZP toward FLIF/MRP territory (< 8.0, near the
  theoretical floor).

Build order: M0 first (scaffold C++ core + rANS + YCoCg-R + MED + single context
+ fuzz gate), then M1 (predictor bank + gradient/residual context + CMARC), then
M2 (weighted predictor + CFL), then M3 (Squeeze + MA-tree, coupled), then M4.

## 10. Addendum 2026-08-23: amendments from the gap analysis (issue #130)

The gap analysis (`research-gap-analysis.md`) measured the corpus and located
the parity gap. The following stage contracts are amended; where an amendment
conflicts with text above, this addendum wins.

- **Stage E (entropy coder):** binarization order becomes `zero-flag -> sign ->
  magnitude`; zeros never pay a sign bin. The 343-context independent-model
  design is retired: per-bin probabilities are initialized from a coarse class
  prior and adapted at dual rates (fast/slow), coded probability = mix of the
  two; or a small logistic mixer over {resdiff, qg, activity} estimators plus
  SSE. Success metric: real-coder context benefit approaches the ~6 percent
  conditional-entropy delta (measured today: 0.9 percent). Naive Rice-k EMA
  quotients are prohibited (probe: backfires).
- **Stage X (MA-tree):** the tree is built ALWAYS on spatial residual features;
  it is never gated behind any Squeeze decision. Caps move to depth <= 10,
  leaves <= 256, continuous thresholds at quantile points, >= 512 samples per
  leaf. Squeeze only adds feature properties (band identity, parent class,
  sibling class). Tree quality is judged by trial-encoded BITS, never by
  L1/log-mean proxies.
- **Stage S (Squeeze):** the decimation scheme (LL = raw subsample) is deleted:
  measured strictly harmful even under ideal coding. Replacement contract: one
  level = horizontal pass `d = a - b; s = b + floor(d/2)` over column pairs,
  then vertical pass over both channels; recurse on the average quadrant;
  post-order emission unchanged. HF ranges stay within +-2^B * levels (widen
  storage as today for deep levels / 16-bit inputs). Per-plane L chosen by
  trial encode in bits.
- **Stage P (prediction):** cross-band prediction for HF bands (parent-gradient
  linear predictor) rejoins the bank once Stage E v2 and Stage X always-on land;
  per-leaf selector as already specified.
- **Stage P amendment (2026-08-24, C5 realization):** the cross-band predictor
  shipped as a band-local pure linear model - `pred = floor(g * w / 16)` with
  `g` the central LL difference along the band's orientation (H/V/D) and one
  int8 weight per type - replacing MED only for planes whose weights are
  nonzero; weight 0 is the exact legacy behavior. Weights are signaled in the
  container header behind flag bit6 (+3 bytes per squeezing plane) and chosen
  per plane by real coded bytes (`choose_squeeze_plan_xband`); no global-bank
  PredId was added because flat planes have no LL domain. Measured on Kodak-24:
  REJECTED on every plane, streams byte-identical to pre-C5; see blueprint
  section 7.1.
- **Gates:** M2 = summed < 9.498 AND per-sample < 3.166; M3 = summed < 8.655
  AND per-sample < 2.885 (both units enforced by `bench_gate.sh --self-check`).

- Dr. Mob, the Researcher

- Dr. Mob, the Researcher
