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

## 11. Addendum 2026-08-24: D-series instrumentation and prediction contracts

Amendments from the Architect re-scope (`architecture-jxl-parity-rescope.md`).
Where this addendum conflicts with text above, this addendum wins.

### 11.1 bench-ideal instrumentation contract (D0, invariant I7)

`prism bench-ideal <image>... [--predictor LIST] [--blend LIST]` is the
committed offline harness. It dumps the production residual streams (YCoCg-R
planes, the chosen predictor, resdiff-343 causal contexts computed from the
residual history exactly as `acoder_encode_plane_v2` does) and reports:

- `v0_bytes`: legacy backend payload on the same streams
  (`acoder_encode_plane`, 343 contexts). All percentages are stated against
  this baseline, matching research F3/F4 convention.
- `v2_bytes`: backend v2 payload (`acoder_encode_plane_v2`, 343 contexts).
- Static-entropy brackets under the v2 binarization sequence (zero flag, sign
  where nonzero, unary quotient, MSB-first remainder), at TWO model
  granularities:
  - **coarse**: four bin kinds (zero, sign, q, rem) crossed with the pooling
    level - this mirrors the real coder's model structure exactly.
  - **fine**: quotient bins additionally conditioned on the unary depth k at
    which they occur; remainder bits conditioned on (magnitude level L,
    position from MSB). Zero/sign bins are unchanged. Finer conditioning can
    only reduce total length.
  and THREE pooling levels: shared (one pool over everything), class16
  (`ac_v2_prior_class`), ctx343 (exact residual-DIFF id).

Code lengths are maximum-likelihood static entropy: probabilities are the
empirical bin frequencies of the measured stream itself, and each observed bin
contributes `-log2(observed frequency)`. Because ML fitting on the same data
is monotone under partition refinement, `shared >= class16 >= ctx343` must
hold per granularity; the harness evaluator enforces this ordering as an
internal consistency gate (a violation is a harness bug or fabricated data).

**Invariant I7**: every offline go/no-go projection used by a D-phase decision
must be reproducible by this committed harness on the pinned corpus. Ephemeral
numbers are not evidence.

### 11.2 Stage P amendment: adaptive blended prediction (D1 candidate)

Per-sample integer blend over K=4 causal bases, fully decoder-computable, zero
signaling. Borders follow Stage P conventions (missing neighbor = 0):

```
bases (plane-value domain): b0 = L, b1 = T, b2 = TL, b3 = L + T - TL
weights w0..w3: int32 fixed-point, unit = 1/65536
init w_k = 16384 (quarter scale); clamp range [0, 131072]
prediction: dot = sum_k w_k * b_k        (int64)
            pred = (dot + 32768) >> 16   (arithmetic shift = floor((dot+32768)/2^16))
error:      err = sample - pred          (int64)
normalizer: E   = sum_k b_k * b_k        (int64)
update (NLMS, one division total):
            den  = (E >> 11) + 1
            w_k += (err * b_k << 5) / den   (int64 product shifted left 5,
                                             division truncates toward zero)
            clamp w_k to [0, 131072] after each update
The shift pair satisfies lr_shift(5) + energy_shift(11) = frac_bits(16), so
the effective adaptation step is mu = 2^(5+11-16) = 1/32 of the exact NLMS
solution - stable by the standard NLMS bound (mu < 2) and never a no-op: the
increment is computed BEFORE any right-shift truncation can swallow it.

**Anchored mode** (`med_anchor = true`): bases become `{MED, L-TL, T-TL,
TR-TL}` with weights initialized `{65536, 0, 0, 0}` so the first prediction is
exactly plain MED (identity at init); the MED base weight stays FIXED and only
the three correction weights adapt. Clamp range widens to [-65536, 196608]
because gradient bases are signed. This family was measured as the strongest
adaptive-prediction candidate and still failed the offline gate (see the D1
verdict in progress/130-prism-true-jxl-parity.md).

residual:   e = sample - pred feeds the unchanged Stage E/X pipeline
```

All arithmetic is mirrored exactly on the decode side; the weight state is
pure function of the decoded history (I2-safe, zero side channel). Complexity
is O(1) per sample (about four 64-bit products plus one division); worst-case
intermediates fit int64 (|w| <= 2^17, |b| <= 2^16, |dot| <= 2^35). The
identity path (this predictor NOT selected) is byte-exact legacy behavior via
the usual never-expand trial; a disabled blend never touches any byte.

Offline gate before ANY container/format work (re-scope section D1): the
committed bench-ideal harness must project >= ~2 percent payload reduction vs
MED on kodim01/kodim13 and confirm the direction on unseen kodim05/kodim20.
Below that bar the mechanism is rejected-and-recorded like C2/C4/C5.

## 12. Addendum 2026-08-24: D2 logistic mixer + SSE contracts

Amendments for re-scope phase D2 (collection efficiency, L2). Where this
addendum conflicts with text above, this addendum wins. Library core:
`include/prism/codec/mixer.h` + `src/codec/mixer.cpp` (format-unwired until
the offline gate passes); harness wiring lives in the bench-ideal CLI.

### 12.1 Stretch/squash pair (integer-only, platform-independent)

The mixer operates in a signed log-odds domain so products replace divisions:

```
p12 = clamp(p16 >> 4, 1, 4094)        // 12-bit probability of P(bit == 0)
d    = stretch(p12) in [-2047, 2047]  // round(log2(p / (4096 - p)))
p12' = squash(d)                      // exact piecewise-linear inverse
p16' = clamp(squash(d) << 4, 1, 65534)
```

`squash` is the classic 33-entry integer table over d in [-2047, 2047]
(entries t[0..32] = 1, 2, 3, 6, 10, 16, 27, 45, 73, 120, 194, 310, 488, 747,
1101, 1546, 2047, 2549, 2994, 3348, 3607, 3785, 3901, 3975, 4024, 4050,
4068, 4079, 4085, 4089, 4092, 4093, 4094): w = d & 127; i = (d >> 7) + 16;
return (t[i]*(128 - w) + t[i+1]*w + 64) >> 7. `stretch` is its inverse,
built once by the standard sweep: pi = 0; for x in [-2047..2047]:
v = squash(x); for j in [pi..v]: st[j] = x; pi = v + 1; then st[j] = 2047 for
the remaining tail. The pair round-trips within 3 p12 steps (worst case on
the steepest mid-curve segment); both are pure platform-independent integer
functions (mirrored constants, I2). The p16 -> p12 -> p16 quantization is
bounded and one-directional per bin, which keeps offline projections honest
at a few hundredths of a percent - safe for a go/no-go gate.

### 12.2 MixerCore (K inputs, bounded adapted weights)

State per bin kind (zero/sign/q/rem each own one mixer):

```
weights w_k: int32 fixed-point 16.16; init 16384 (sum of K = 1.0);
             clamp range [-131072, 786432] (-2x .. +12x) after every update
forward:     dot   = sum_k w_k * st_k            (int64)
             s_mix = clamp(dot >> 16, -2047, 2047)   (arithmetic shift)
train:       p12_mix = squash(s_mix)
             err    = bit ? -p12_mix : (4095 - p12_mix)   // P-domain
             w_k   += (int32)((err * st_k) >> (20 - lr_shift))
             (logistic-loss gradient in PROBABILITY units, lpaq-style:
             a correct prediction contributes near-zero error, which keeps
             the common-mode weight sum near its init scale; training against
             stretch-unit targets instead amplifies probabilities and was
             measured diverging - kodim01 plane 0 +137.9 percent - and is
             therefore prohibited by this contract. int64 product;
             arithmetic shift; lr_shift default 6)
```

### 12.3 SSE stage (one interpolated APM)

One stage mapping (quantized s_mix, coarse class) back to a stretch value:

```
classes:    coarse causal activity buckets 0..S-1 (default S = 4), the same
            bucket function Stage X already computes from decoded neighbors
slots:      u = s_mix + 2047 in [0, 4094]; j = u >> 7 (0..31);
            frac = u & 127; table T[c][j], int64 in 16.16 stretch units,
            33 slots per class, identity init T[c][j] = ((j*128 - 2047) << 16)
read:       s_out = clamp((T[c][j]*(128 - frac) + T[c][j+1]*frac) >> 23,
                          -2047, 2047)
train:      T[c][j] += ((target << 16) - T[c][j]) >> sse_rate_shift
            (target as above; sse_rate_shift default 5; clamp to
            +/-(2047 << 16)); only slot j updates
final prob: p16_coded = p16_from_squash(s_out); cost = -log2(P(observed bit))
```

When SSE is disabled, s_out = s_mix. State budget per plane and kind:
K weights + S*33 int64 slots = under 600 words; reset per plane on both
sides. The coded probability is ALWAYS the post-SSE p16; every constant here
is mirrored exactly on the decode side if the format ever adopts it.

### 12.4 Offline estimator family (harness wiring, K=4)

All four estimators are dual-rate adaptive models (`ac_v2_adapt`, shifts
6/9) over their OWN key spaces, one state set per bin kind, initialized from
the compile-time class priors where the key carries resdiff semantics and
from the neutral midpoint otherwise:

```
E1 production: exact hierarchical v2 estimate (ctx@cx mixed 8/8 with cls),
               the probability production codes with today (baseline anchor)
E2 classpool : standalone dual-rate over the 16 ac_v2_prior_class classes
E3 activity  : dual-rate over the 4 coarse activity buckets (uniform init)
E4 qg-sum    : dual-rate over min(qL+qU+qUL, 14) buckets (uniform init);
               the demoted C1 sum-key returns as one mixer member
```

Each estimator adapts on every observed bin. The walk, bin order, contexts,
and borders mirror `encode_residual_v2` exactly (zero flag, sign, unary
quotient, MSB-first remainder). Cost accounting: bits = sum of
-log2(p16_coded as P(bit)) over all bins; baseline bits_v2 sums the E1 path
in the same pass. Anchor invariant: bits_v2/8 must reproduce the measured
v2 payload bytes within +-0.5 percent (replica fidelity; enforced by the
probe_ideal.sh evaluator on every MIXER row).

### 12.5 Harness contract extension (I7)

`prism bench-ideal ... [--mixer PRESET-LIST]` emits `MIXER` rows (per image)
and `MIXERTOTAL` rows (aggregated): nbins, bits_v2, bits_mix (no SSE),
bits_mixsse, v2_bytes, v0_bytes, anchor percent, and deltas versus bits_v2.
Presets: mix4 (lr 6), mix4-sse (default), rate sweeps mix4-sse-lr4..lr8,
mix4-frozen (weights frozen at neutral init - adaptation ablation),
mix4-adversarial (frozen weights all on E4 - fail-case); a negative rate
shift (-1) freezes the respective adaptation stage by contract. D2 go/no-go gate:
bits_mixsse below bits_v2 by >= 3.0 percent on pinned kodim01 AND kodim13,
direction confirmed on unseen kodim05/kodim20. Below the bar: STOP rule,
negative recorded, owner decision point surfaced (re-scope section 1).
Self-check additions: adapted must beat frozen AND adversarial on synthetic
ramps, and every MIXER row's anchor must hold within +-0.5 percent.

## 13. Addendum 2026-08-24: D4c reversible color rotation contracts

Lever (re-scope section D4 item 3): per-image color decorrelation beyond the
shipped YCoCg-R family, decided by trial bits IF AND ONLY IF offline evidence
clears the pre-registered gate below. This addendum is written BEFORE any
measurement (binding order, I7): the gate is fixed now, not after seeing
numbers. Expectation stated by the Architect: small, <= 1 percent.

### 13.1 Rotation family (integer-exact, decoder-computable)

All candidates operate on BD8 RGB rasters with channels in [0,255] and store
u16 planes using the same bias/mask discipline as shipped YCoCg-R
(bias 512 for signed chroma-like planes; plane 0 needs no bias, see range
proof). Candidates are identified by the ordered roles (a, b, c) fed to the
YCoCg-R butterfly:

    Co = a - c
    t  = c + (Co >> 1)        // arithmetic shift, floor semantics
    Cg = b - t
    Y  = t + (Cg >> 1)
    stored planes: (Y, Cg + 512, Co + 512)

Range containment for ANY role assignment of [0,255] channels: t is
floor((a+c)/2) up to +-1 rounding, so t in [0,255]; Cg = b - t in [-255,255];
Y = t + ((b - t) >> 1) lies between b and t inclusive, so Y in [0,255]
(bias-free storage is exact); Co in [-255,255]. The inverse is the shipped
YCoCg-R inverse with roles read back in the same order. Candidate ids:

| id | name    | (a, b, c) | note |
|----|---------|-----------|------|
| 0  | ycocgr  | (R, G, B) | shipped transform; anchor equivalence required |
| 1  | rct-grb | (G, R, B) | |
| 2  | rct-gbr | (G, B, R) | |
| 3  | rct-rbg | (R, B, G) | |
| 4  | rct-brg | (B, R, G) | |
| 5  | rct-bgr | (B, G, R) | |
| 6  | loco    | special   | JPEG-LS/CALIC family, see below |

loco stores planes (G, U + 512, V + 512) with U = R - G and
V = B - ((R + G) >> 1); inverse: G' = plane0, R' = G' + U,
B' = V + ((R' + G') >> 1), exact under floor semantics.

id 0 MUST be byte-equivalent to `apply_color(r, ColorTransform::YCoCgR)`
(tested); the harness baseline stays that shipped call, not id 0's own path,
so any drift breaks loudly. Plane permutations are NOT candidates: planes are
coded independently, so a pure permutation costs identical bytes by
construction - only genuine re-mixings qualify. CFL stays OUT of the A-B
(production disables it whenever a YCoCg-family transform wins in analyze;
comparing base transforms alone is the fair design).

### 13.2 Offline scoring contract (harness wiring)

`prism bench-ideal ... [--color LIST]`: each named color mode extends the
IDEAL row family as predictor names `<pred>@<mode>` (base rows keep their
legacy names, so existing CSVs and the G-repro anchor stay stable). For each
(image, mode): transformed raster -> per-plane MED residual streams ->
measured v0/v2 payload bytes (real coder output, additive across images) plus
the static brackets at all three poolings. `--blend` and `--color` are
mutually exclusive (error). MIXER/ZRUN passes always score the production
YCoCg-R stream regardless of `--color`; no candidate mode feeds any format
path in this phase.

### 13.3 Pre-registered gates (fixed before measurement)

Evaluated by probe_ideal.sh from IDEAL rows alone:

- CR-rank (self-check, synthetic): constructed images must rank BOTH ways -
  an image with variation confined to R (G = B = 0) must make loco beat
  ycocgr on measured v2 bytes (G stays constant there, while every butterfly
  plane moves), and the channel-swapped twin (variation confined to G,
  R = B = 0) must make ycocgr beat loco (Co collapses to zero). A rail that
  can only ever say "baseline wins" cannot be trusted to rank anything.
- CR-anchor: id 0 rows must equal the shipped baseline rows byte-for-byte on
  v0/v2 columns (drift means the family diverged from the shipped transform).
- CR-fmt (FORMAT-WORK ELIGIBILITY, decision verdict like ZR-fmt - a
  rejection is a legitimate outcome and must not flip the exit code):
  aggregate v2 payload delta <= -0.5 percent vs the shipped baseline over the
  probe image set AND no probe image above baseline (mixed sign never adopts,
  per C2b precedent). Rationale for the bar: production adoption costs extra
  trial encodes per image and possibly signal bits; the Architect's own
  expectation ceiling is <= 1 percent, so a sub-0.5-percent aggregate cannot
  carry its own cost. PASS only opens the door to container/trial wiring;
  it is not an acceptance.

### 13.4 STATUS (2026-08-24, Builder D4c): offline PASS, ADOPTED with a
redesigned never-expand stage

Verdicts: CR-fmt PASS for loco (-4.3582 pct aggregate v2), rct-gbr/rct-rbg
(-2.42), rct-grb/rct-brg (-0.69); rct-bgr FAILed (+0.0001, mixed sign) and is
excluded everywhere. CR-anchor held (med@ycocgr == shipped baseline,
byte-for-byte). Independent cross-check (separate implementation, different
cost model) confirmed the direction on all four probe images. Adoption:
container ids 7..11 in the existing full-byte field (zero signaling cost),
BD8 RGB only, CFL-excluded like YCoCg-R, unknown ids a hard decode error.
WIRING LESSON, measured twice: trialing rotations inside
choose_color_transform_trial (MED-flat metric) regressed kodim18 +0.25 pct of
final file size - that metric cannot see the anchor's CFL composition or its
predictor-bank fit. Final design: choose_color_transform_trial keeps its
exact legacy behavior; stage 2 runs at the END of analyze() under the
anchor's DECIDED predictor, against the anchor's PRODUCTION flat cost,
strict-win-only adoption, predictor re-trial on the adopted raster.
Corpus: 22 wins / 2 ties / ZERO regressions at e1/e3/e7; e1 = 10.1210 summed
/ 3.3737 per-sample bpp (-1.646 pct bytes vs pre-D4c), e3 = e7 = 10.1350 /
3.3783 (-1.469). Evidence: benchmarks/results/2026-08-24-prism-e*.csv +
*-pre-d4c.csv archives; decision record
2026-08-24T21-45-00-d4c-color-rotation-adoption.md.

## 14. Addendum 2026-08-25: E-series measurement constants (E0, written BEFORE any measurement)

Binding order (blueprint `architecture-jxl-parity-eseries.md` section 1):
every constant below was fixed before the first ORINIT/PROP row existed.
No constant may be tuned after a measurement has been seen. Where this
addendum conflicts with text above, this addendum wins.

All E0 scoring rides `prism bench-ideal` on the production streams (shipped
YCoCg-R + trial-decided predictor, resdiff-343 causal contexts, v2
binarization), extending the D0 rail pattern: sha-pin verification, durable
dated CSV in its OWN file (the 2026-08-24 reference CSV stays untouched),
self-checks that can demonstrably fail, and I7/I8/I9 discipline.

### 14.1 M-A oracle initialization (`--orinit`)

Pass 1 accumulates per-(bin kind, class16 class) frequencies of every emitted
bin over the image's full plane set (the same statistics the static scorer's
coarse/class16 pooling computes; no new statistics machinery). Pass 2 replays
the identical bin sequence through the PRODUCTION adaptation loop - dual-rate
shifts AC_V2_FAST_SHIFT/AC_V2_SLOW_SHIFT (6/9), equal rate mix, 8/8 hierarchy
- initialized at those optima:

- INIT VALUE: for bin kind k and class c with counts (n0, n1),
  p_init = round(65536 * n0 / (n0 + n1)) when n0 + n1 > 0, clamped to
  [1, 65534]; slots whose class saw NO events of that kind keep their
  compile-time prior table value. p_init estimates P(bit == 0) under the
  established convention.
- SCOPE OF THE WARM START (pinned interpretation of "initialized at those
  optima"): BOTH the per-context states and the shared class states start at
  their CLASS's optimum (fast and slow states both). This is exactly the
  knowledge shape E2 step 1 can transmit (class-level tables), so A is
  directly the frozen-table-recoverable learning share. Per-context optimum
  initialization is NOT scored: it transmits information no cheap scheme can
  carry, and would only shrink A optimistically.
- REPLAY FIDELITY: fresh model state per plane (production scoping); cost
  computed with the exact production probability (mix2 of mix(ctx-fast,ctx-
  slow) and mix(cls-fast,cls-slow)); adaptation applied after every bin
  exactly as `v2_put` does. The cost is fractional bits (arithmetic-coder
  estimate); bytes quoted as bits/8.
- Output rows: `ORINIT,image,nbins,bits_orinit,v0_bytes,v2_bytes` and pooled
  `ORINITTOTAL,all,...`. TOTAL rows sum bits and bytes across images (the
  replay is sequential per image, so TOTAL is additive, NOT a joint entropy
  estimate - stated here because other TOTAL rows are joint).
- CORRUPTION KNOB (`--orinit-corrupt`, self-check ONLY, never a measurement
  mode): EVERY bin kind's init is set to its ANTI-optimum
  (65536 - p_init, clamped) AND adaptation is disabled during the replay
  (pure anti-table lookup). The blueprint sketched "inverted sign prior";
  measurement showed inverting only that kind moves total cost by ~0.02
  points of v0 (sign priors are near-even), so it could never trip the
  0.05-point gate and the check would have been dead code. Generalizing the
  injection to all four kinds is STRICTER and keeps the proof of failability
  honest; recorded in decision record 2026-08-25T12-00-00.

### 14.2 M-C property-conditioned ceilings (`--props i[,ii][,iii]`)

Property vector, all decoder-computable at each sample from already-coded
data (missing neighbor => quotient 0 / gradient term 0):

    q(r)   := 0 if r == 0, else sign(r) * floor(log2(|r|)), |q| clamped to 7
              (range -7..+7)
    qW,qN,
    qNW,qNE := q() of the already-coded residual QUOTIENTS west/north/
              northwest/northeast
    gN     := P[N] - P[NW], gW := P[W] - P[NW]   (decoded pixels)
    bucket(g) := count of thresholds strictly below |g|, capped at 7, with
              thresholds {0,1,2,4,8,16,32} scaled by s = 2^(BD-8)
              (BD8: {0,1,2,4,8,16,32}; BD16: x256)
    gb     := 8*bucket(gN) + bucket(gW)                (0..63)
    pl     := plane id (0..2)

Poolings (cell = conditioning key for every fine bin):

- (i) `i`   : dense key cls*225 + (qW+7)*15 + (qN+7); <= 3600 cells, no hash.
- (ii) `ii` : raw = ((((cls*15 + qW+7)*15 + qN+7)*15 + qNW+7)*15 + qNE+7);
              cell = raw mod 4096 (pre-registered modulo hash, no mixing).
- (iii)`iii`: raw = (((((( pl*16 + cls)*64 + gb)*15 + qW+7)*15 + qN+7)*15 +
              qNW+7)*15 + qNE+7); cell = raw mod 16384.

Scoring contract: bins are conditioned at BIN-FINE granularity (unary depth /
remainder position keys exactly as the static fine brackets), each fine key
jointly with the property cell. COUNT FLOOR: a cell whose TOTAL observed bin
count < 64 scores ALL its bins from the class16-pooled fine-bin marginal
model (cell-level fallback, pre-registered; guarantees PC-mono by the ML
argument per (cell, fine-key) group). `fallback_share` = fraction of bins
scored via fallback. Cells are capped by construction (modulus); the row's
`cells` column reports OBSERVED distinct cells for audit.

Output rows: `PROP,image,pooling,L_bits,L_bytes,pct_of_v0,cells,fallback_share`
plus pooled-histogram `PROPTOTAL,all,...` rows (joint estimation, NOT row
sums - same caveat as IDEALTOTAL).

### 14.3 Gates (fixed now; OA/PC are rail integrity, MC/BIAS/FT/RT are decision verdicts)

Evaluated by probe_ideal.sh; tolerance everywhere = 0.05 points of v0 (the
single G-repro tolerance governs all rails).

- OA-order: for every image row and the TOTAL row,
  pct(L_stat(class16, fine)) <= pct(L_or) <= pct(L_ad) + tol. Gross violation
  = broken harness or fabricated data; hard failure.
- OA-corrupt (self-check): the corrupted-sign replay must VIOLATE the middle
  inequality (pct(L_or_corrupt) > pct(L_ad) + tol) and the evaluator must
  render FAIL; injection rows must render both verdicts.
- PC-mono: pct(L_prop(ii|iii)) <= pct(L_stat(class16, fine)) + 1e-9 on every
  image row and TOTAL. Violation = harness bug; hard failure.
- MC-viability (MANIAC viability, decision verdict): pooled-TOTAL
  pct(L_prop(ii)) must beat pct(L_stat(ctx343, fine)) by >= 1.5 points of v0,
  AND the margin >= 1.0 points of v0 individually on kodim01 AND kodim13.
  PASS opens E3 development and nothing else; FAIL declares MANIAC dead ON
  THIS BINARIZATION with the committed CSV as evidence.
- BIAS-fmt (E1, future): aggregate bracket drop >= 1.5 points of v0 on the
  probe quad vs old-stream rows AND no probe image above its own baseline
  bracket (mixed sign never adopts). BiasModel constants pinned NOW:
  b[64] over gradient-pair cells (bucket(gN), bucket(gW), thresholds per
  14.2); prediction pred' = med + round(b[ctx]); post-decode update
  b[ctx] <- clamp(b[ctx] + floor_div(err', 2^BIAS_SHIFT), -Bmax, +Bmax) with
  BIAS_SHIFT = 6 and Bmax = 2^(BD-3) (BD8: 32); err' = actual - pred' (the
  bias-corrected residual). floor_div uses explicit floor semantics.
- FT-fmt (E2 step 1, future): NET gain = payload delta PLUS blob bytes
  >= 1.5 percent aggregate on the probe quad at TOTAL-row level (I9 joint
  accounting). Table normalization sum = 2^12; serialization = per class,
  per bin, 16-bit deltas from a shared shape prior; blob compressed by the
  v2 coder itself; CRC32 over uncompressed table bytes; exact blob budget
  MEASURED at implementation, never assumed. Precondition arithmetic: E2
  step 1 is DOA-by-arithmetic unless the M-A readout's A-share > 1.5 points
  of v0 (number recorded either way, no container work otherwise).
- RT-fmt (E2 step 2, future): incremental >= 1.0 point of v0 NET, strictly
  conditional on M-B's B >= 2 points of v0; region size 192x128 first,
  shrink-once allowed, twice is not.

### 14.4 Share definitions used by the tracker readout (points of v0)

    pct_ad        = 100*(v2_bytes - v0)/v0            (real coder, TOTAL)
    pct_or        = 100*(bits_orinit/8 - v0)/v0
    pct_c16_fine  = IDEALTOTAL med fine_class16 pct
    pct_cx_fine   = IDEALTOTAL med fine_ctx343  pct
    A = pct_ad - pct_or                             (learning/warm-start share)
    B = pct_or - pct_c16_fine                       (tracking share, bin-fine
                                                     anchor per research Fact 2)
    C(x) = pct_c16_fine - pct(PROPTOTAL x)          (conditioning deficit)
    B_coarse = pct_or - coarse_class16 pct          (collector-pure tracking,
                                                     transparency column: the
                                                     bin-fine anchor includes
                                                     the fine-structure gain,
                                                     which class-level tables
                                                     cannot recover)

A + B = the real-vs-class16 gap (research Fact 2's 5.95-point figure);
A gates E2 step 1; C(ii) margins gate E3; B gates E2 step 2.

## 15. STATUS (2026-08-25, Builder E0): E0 measured; verdicts recorded

Rails all green (OA-order 4/4 images; corrupt injection violates by +47 to
+60 pct of v0 everywhere; PC-mono 15/15 rows; determinism byte-exact).
Measured shares on the pinned quad (pooled TOTAL, points of v0):
A = 0.073 -> E2 step-1 DOA-by-arithmetic; B = 5.12 vs the bin-fine anchor
with B_coarse = -0.91 (collector-pure tracking negative: adaptive already
beats same-structure static pooling); MC-viability FAIL as pre-registered -
pooled margin(ii vs ctx343-fine) = 1.33 < 1.5 while every individual image
clears (kodim01 +2.67, kodim13 +1.86, kodim05 +2.87, kodim20 +2.95; pooled
scoring is a joint estimate whose shared cells suffer mixture interference,
and pooled(iii) even collapses below pooled(ii)). MANIAC is DEAD ON THIS
BINARIZATION per the gate; the anomaly is recorded as information for the
owner, not grounds to re-litigate a pre-registered bar. Named tree row:
"M-C fails AND A < 1.5" - everything rides on E1's BIAS-fmt gate; if that
fails too, #130 closes honestly at the achieved level. Evidence CSVs:
benchmarks/results/2026-08-25-ideal-{orinit,corrupt,props}-e0.csv +
2026-08-25-ideal-probe-e0-eval.csv. Zero format bytes spent. Full readout:
progress/130-prism-true-jxl-parity.md E-series checklist.

## 16. Addendum 2026-08-25: E1 constants (mechanism b + gate interpretation,
##     written BEFORE any measurement)

Binding order (E-series blueprint section 1, same discipline as addendum 14):
every constant below was fixed before the first `med@bias` row existed. No
constant may be tuned after a measurement has been seen. Addendum 14.3
already pins mechanism (a); this addendum pins the secondary mechanism (b)
("gradient-adjusted multiplicative correction", research endgame section
4.1) and the single reading of the BIAS-fmt gate text.

### 16.1 Mechanism (b): per-cell multiplicative gain

State `G[64]`, int64 fixed point 16.16, init 65536 (exact unity, so a fresh
model corrects nothing until its cell has evidence); clamp range
[G_MIN, G_MAX] = [32768, 131072] (0.5x .. 2.0x, generous bounds like
BlendConfig's w_min/w_max). Same 64 gradient-pair cells as (a):
ctx = 8*bucket(gN) + bucket(gW), buckets per addendum 14.2.

Prediction chain (order pinned):

    pred'  = med + b[ctx]                      (mechanism a, integer; b[]
                                               stays integral because the
                                               update adds floor_div terms)
    pred'' = sym_round(pred' * G[ctx])         where
             sym_round(v) = (v >= 0)
               ?  (( v * G[ctx] + 32768) >> 16)
               : -((-v * G[ctx] + 32768) >> 16)    (round half away from
               zero on magnitude, symmetric, no platform-dependent rounding)

Coded residual: E = actual - pred'' when the gain is active, else
actual - pred'. Updates after decode, ORDER PINNED (b first, then G), both
computed from err = actual - pred_final:

    b[ctx] <- clamp(b[ctx] + floor_div(err, 64), -Bmax, +Bmax)
              [addendum 14.3: BIAS_SHIFT 6, Bmax 2^(BD-3)]
    den    = (|pred'| >> ENERGY_SHIFT) + 1      ENERGY_SHIFT = 4
    G[ctx] <- clamp(G[ctx] + floor_div(err << LR_SHIFT, den),
                    G_MIN, G_MAX)               LR_SHIFT = 9

floor_div uses explicit floor semantics everywhere (quotient rounded toward
negative infinity), never platform division truncation. Every input is
decoded history (I2 mirror-exact); all arithmetic int64. Fresh model state
per plane (production scoping, same as ORINIT replay fidelity).

### 16.2 Gate interpretation (pinned now, before any measurement)

- DECISION BRACKET: the fine_ctx343 static-entropy column (points of v0),
  the same anchor every other E-series verdict uses (MC margins). Aggregate
  figure = pooled IDEALTOTAL row; per-image figures = per-image IDEAL rows.
- BIAS-fmt PASS (per candidate mode): pct_drop = pct_old(ctx343-fine) -
  pct_new(ctx343-fine) >= 1.5 points of v0 on the pooled TOTAL row, AND no
  probe image's own ctx343-fine percentage above its baseline value.
  Candidates: `med@bias` (a only) and `med@biasgain` (a+b). Adoption
  preference pre-registered: `med@bias` if it passes; else `med@biasgain`
  if it passes (blueprint: "(a)+(b) clears -> adopt both"); if both pass,
  the simpler (a) alone adopts. A rejection is a legitimate measured
  outcome and never flips the exit code.
- BIAS-anchor (rail integrity, flips exit code): `med@biasoff` rows equal
  the plain `med` shipped-baseline rows BYTE-FOR-BYTE on v0_bytes and
  v2_bytes (per-image and TOTAL). The off configuration applies no
  correction AND performs no updates, so identity proves the whole new
  walk (buckets, border rules, state plumbing) is inert when disabled -
  exactly the CR-anchor pattern.
- Real-coder payload deltas (v2_bytes) of every candidate are REPORTED in
  the verdict line as diagnostics; they decide nothing in this offline
  slice (format wiring runs its own production-flat trial behind the
  never-expand rule in a LATER slice, only on a gate PASS).
- Self-check obligations (fail-capable rails): determinism on a real pinned
  image; a constructed stream where corrections DEMONSTRABLY FIRE
  (med@bias rows differ from med@biasoff); evaluator renders both BIAS-fmt
  verdicts plus a biting BIAS-anchor from CSV rows alone.
  IMPLEMENTATION NOTE: the originally sketched "constructed image where
  bias MUST win" was analyzed and deliberately weakened to
  corrections-fire: for periodic constructions the 64-cell keying provably
  mixes cliff and plateau populations at exactly offsetting duty cycles
  (anti-diagonal cliffs fix b* at the value where net gain is zero), so no
  honest synthetic guarantee of a WIN exists; performance verdicts are the
  gate's job on real pinned images, not the self-check's.

- the Builder

## 17. STATUS (2026-08-25, Builder E1+E4): E-series complete; #130 closes

E1 ran exactly as pre-registered (addendum 16 constants fixed before any
measurement) and FAILED its BIAS-fmt gate by an order of magnitude: ctx343-
fine bracket WORSE by 19.85 points of v0 aggregate for the additive table
(payload +70.2 percent of the shipped stream) and worse by 16.33 points
with the gain stage (+21.7 percent); all four probe images regressed;
BIAS-anchor held byte-for-byte, so the verdict is trustworthy, not a
plumbing artifact. Mechanistic finding: under zero-flag-first binarization,
MED's exact-zero residual peak is priced below its conditional-entropy
worth - mean-seeking corrections necessarily spread mass off the mode and
lose bits. E4 checkpoint: fresh corpus measure at e1/e3/e7 byte-identical
to the D4c-era CSVs (D0-E1 work proven format-unwired end to end);
e1 = 10.1210 summed / 3.3737 per-sample bpp, e3 = e7 = 10.1350 / 3.3783;
M2/M3 FAIL in both units. Final decision-tree row executed: row 1, final
clause - #130 closes honestly at the achieved level (-8.21 pct bytes from
the 11.026 baseline). Evidence: benchmarks/results/2026-08-25-ideal-bias-
e1.csv + 2026-08-25-prism-e{1,3,7}.csv; decision record
2026-08-25T12-30-00-e1-offline-rejection-and-honest-closure.md.

- the Builder

## 18. Addendum 2026-08-25 (registered as "spec addendum 17"): V-series
##     pre-registration for the v2 clean-slate sandbox, written BEFORE any
##     measurement

Binding order (V-series blueprint section 1, same discipline as addenda 14
and 16): every constant below was fixed before the first `bench-sandbox`
row existed and before any predictor replay ran. Section numbering follows
this file's sequence (15 and 17 are STATUS records); the research handoff
name "spec addendum 17" maps to THIS section. No constant may be tuned
after a measurement has been seen; a deviation requires a numbered amendment
BEFORE the affected measurement or it never happens.

### 18.0 Scope

Applies to `prism bench-sandbox` (the V0 spine) and all V-phase offline
scoring on the probe quad kodim01/kodim13/kodim05/kodim20 with sha-pins
verified before ANY measurement (`benchmarks/data/kodak.sha256`). Zero
container/format bytes until a V4 PASS (standing rule).

### 18.1 Gate reading and units (pinned now)

- PRIMARY gate figure (I10): RELPCT = 100 * (net_ctrl - net_cand) /
  net_ctrl computed PER IMAGE from joint NET bytes (payload + tables +
  maps + trees; I12), then MEDIAN over the quad. Per-image min and max are
  reported beside every median; pooled TOTAL rows are diagnostics only.
- CONTROL definitions (pinned per phase): V1 control = fresh production
  ACModelsV2 replay of the shipped ZFFCTRL profile on the same residual
  stream (equals committed e1-era rows under VB-anchor-adapt). V2 control =
  MED family scored under the V1-winning configuration. V2b/V3 controls =
  the V2 winner / best-flat keying respectively, same backend throughout
  each comparison.
- Unit conversion for reporting only: percent-of-current-bytes =
  points-of-v0 / 0.9447 (factor 1.06, research section 1).
- A gate rejection is a legitimate measured outcome and never flips the
  exit code; rail-integrity checks (VB-*) DO flip exit codes.

### 18.2 V0 constants

- VB-anchor tolerance policy: anchor rails require BIT-FOR-BIT equality of
  bits columns against committed reference rows (no rounding slack; ideal
  lengths and adaptive replays are deterministic integers).
- VB-coder-fidelity bound: B-RANS and B-BAC(static) total bytes <=
  1.005 x their own B-IDEAL row per image (+0.50 percent).
- VB-corrupt threshold: any injected corruption that does not hard-detect
  must inflate cost by > +10 percent vs the clean row AND flag a round-trip
  mismatch; silent pass => rail failure.
- Model smoothing prior (per cluster, per bin type): c'(bin) = c(bin) +
  PSEUDO where PSEUDO = 32 counts total distributed geometrically over
  quotient bins with ratio r = 15/16 falling away from zero, uniformly over
  remainder-bit bins below the escape point, and evenly over sign and ZERO
  tokens. Normalization sum exactly 2^12 = 4096 (floor_div redistribution,
  largest-remainder assignment, deterministic order = ascending bin id).
- Cluster caps and floors: K_MAX = 256 clusters; MIN_SAMPLES_PER_CLUSTER =
  4096 (clusters under the floor merge into their nearest sibling by
  ascending id order until legal); grid tile default 128x128 pixels;
  KTREE inherits matree_builder caps depth <= 10, leaves <= 256,
  octile-quantile split candidates, strided induction subsample.
- Table serialization shape: image-level prior tables first, then
  per-cluster tables as 16-bit deltas from the prior, delta stream
  compressed recursively by the same backend; CRC32 over the uncompressed
  table bytes; map/tree blobs length-prefixed; ALL side-info counted in
  every NET figure.
- Determinism: integer-only arithmetic everywhere in the sandbox (no FP in
  scoring paths); fixed iteration orders (raster samples, ascending ids);
  two runs on the same inputs produce byte-identical CSVs.

### 18.3 Tokenization ladders (HYB profiles; pinned now)

Fold r via zigzag to u >= 0. Tokens: t = 0 exclusively for r = 0 (ZERO
token, cheapest symbol in every table); t = u for 0 < u < T_ESC; t = T_ESC
escapes. Escaped magnitude m = u - T_ESC > 0 coded as q = bit_length(m) - 1
emitted unary over a dedicated escape-context bin sequence, then the low q
bits of m raw (m >= 1 guaranteed). Ladders:

| profile | T_ESC | escape contexts |
|---|---|---|
| ESC-A | 4 | one shared unary context |
| ESC-B | 8 | per-token escape context (T_ESC separate unary contexts) |
| ESC-C | 16 | per-token escape context |

ZFFCTRL is the shipped zero-flag-first sequence (anchor control; F3
precedent). Sign bit emitted immediately after each nonzero token; no
sign-before-zero ordering may ever appear (L-C5).

### 18.4 V2 predictor mathematics (pinned before ANY V2 measurement)

All predictors causal (decoded history only), raster order, border rule =
replicated edge (production rule), state reset per plane, clamp outputs to
[0, 2^BD - 1], all arithmetic int64.

- MED control: exact production definition (section 4 of this spec).
- GAP (reduced classic, integer-exact):
      dh = |W - NW| + |N - NW| + |NE - N|
      dv = |NW - W| + |N - NW| + |N - NE|
      t80 = 80 << (BD - 8);  t32 = 32 << (BD - 8)
      if   dv - dh > t80: pred = N
      elif dh - dv > t80: pred = W
      else:
        num = 2*W + 2*N + NE - NW
        dhat = sym_round_div(num, 4)          (half away from zero)
        if   dh - dv > t32: dhat = sym_round_div(dhat + W, 2)
        elif dv - dh > t32: dhat = sym_round_div(dhat + N, 2)
        pred = dhat
- W ensemble (weighted sub-predictor pool, JXL-class, integer-exact):
      sub-predictors p_i, i in {W, N, NW, TE}, TE = W + N - NW (clamped)
      weights w_i int64 16.16, init 65536 each, clamp [16384, 1048576]
      pred = sym_round_div(sum_i w_i * p_i, sum_i w_i)
      update AFTER coding err = actual - pred, ORDER PINNED i = W,N,NW,TE:
        w_i <- clamp(w_i + floor_div(err * (p_i - pred), 512), 16384,
                     1048576)
- Max-error feedback property (context property only, never modifies
  prediction): e_max_prev = max_i |actual - p_i| of the PREVIOUS sample,
  bucketed [0,1,2,3,4-5,6-7,8-11,12-15,16-23,24-31,32-63,64+]; usable as
  an extra keying coordinate from V2 scoring onward.
- Scoring contract: each family's stream scored BOTH as static-ideal
  lengths AND real backend bytes under the V1-winning configuration; the
  gate reads REAL NET bytes; both columns reported.

### 18.5 V4 projection formula (pinned now)

    proj_bytes(img) = e1_bytes(img) * (1 - relpct_composed(img)/100)

with e1_bytes(img) taken verbatim from the committed
`benchmarks/results/2026-08-25-prism-e1.csv` per-image payload+model bytes
and relpct_composed measured on the quad under the composed winner stack;
quad relpct applies corpus-wide per image class (landscape/portrait medians
reported separately). Threshold: projected summed < 9.35 bpp AND projected
per-sample < 3.117 bpp => proceed-to-format. Below: stop-and-report.

### 18.6 Reserved slots (must land as numbered amendments BEFORE the named phase's first CSV)

- After V1: winning backend/tokenization/keying identity + wall-clock budget.
- Before V2b (only if opened): per-cluster bias-table shape confirmation
  (defaults inherit addendum 14.3 shifts unless amended).
- Before V3: frozen extended-property list + tree feature set.
- Before V5 (only if opened): squeeze parent-property conditioning constants.

STATUS 2026-08-25 (V-series slice 2 readout): V1 measured on the pinned quad
(`benchmarks/results/2026-08-25-sandbox-v1.csv`; pins verified pre-measure;
structural readings in decisions/builder/2026-08-25T21-30-00 BEFORE it):
V1a oracle bound PASS (+74.60 pct best median, freebie-dominated - reported
map_rep exceeds the explained gain), V1b realistic maps FAIL (best median
+5.81 pct, ZFFCTRL x KFLAT16 with every side-info byte NETTED, vs retention
bar +37.30). Overall V1 FAIL => STOP rule fired per decision tree row 1.
NO winning configuration is reserved for later phases and no wall-clock
budget transfers forward; V2/V3/V4 do not open without an owner-directed
pivot decision. Zero container bytes were spent at any point.

## 19. Addendum 2026-08-25 (registered as "spec addendum 19"): source-side-
##     only pivot (S-series) pre-registration, written BEFORE any
##     S-measurement

Authority: owner authorization 2026-08-25T21:53:15Z on PR #145 (V1 STOP
acknowledged; source-side-only pivot, or any architecture the Architect
deems necessary, authorized; the M2/M3 dual-unit gates are the single
invariant and may never be lifted, bypassed, or altered) and Mae's `/oc
architect` dispatch on PR #145. Blueprint:
`architecture-jxl-parity-sourcepivot.md`. Binding order unchanged: every
constant below is fixed before the first S-row exists; deviations require a
numbered amendment BEFORE the affected measurement or they never happen.

### 19.1 Reserved-slot resolution (fills the slots 18.6 opened)

- After-V1 slot: NO winning backend/tokenization/keying exists (V1 STOP at
  head 3bc11dd). Wall-clock accounting: amendment A3 precedent stands -
  structural instrument multipliers are recorded beside every phase and NO
  gate depends on wall-clock.
- Before-S2 slot: bias-table shape inherits addendum 14.3 defaults unless a
  numbered amendment lands before S2 opens.
- Before-S3 slot: frozen extended-property list pinned in 19.4; tree feature
  set = NONE (spatial maps/trees excluded from S3 by V1's measured evidence).
- Before-S5 slot: squeeze parent-property conditioning constants inherit the
  Obsidian-shared bijection-tested variant; must be amended numerically
  before S5 opens.

### 19.2 S-controls (pinned now)

- FRAME-A (adaptive): production ACModelsV2 replay over the phase's residual
  stream under ZFFCTRL; equals the committed e1-era rows under
  VB-anchor-adapt (bit-for-bit bound).
- FRAME-S (static spine): ZFFCTRL x B-RANS x KFLAT16-static-spine with ALL
  side-info NETTED (tables + merge map); the measured V1b best-realistic
  family re-instrumented as a control, re-measured fresh each run.
- Every CSV row carries frame=A|S; comparisons are valid WITHIN a frame
  only; cross-frame comparisons are invalid and rejectable on sight.

### 19.3 Dual-frame scoring contract (pinned now)

FRAME-S is PRIMARY and gating for S1 and S3 verdicts. FRAME-A deltas are
REPORTED beside every row (they answer what the shipped adaptive coder
gains) but never gate any verdict inside this program.

### 19.4 Frozen extended-property list (S3)

P_ext = {qW, qN, qNW, qNE quotient buckets with octile edges computed per
image from the causal stream (no future-sample leakage), bucketed CALIC
gradient magnitudes gbW/gbN, plane id, optional e_max_prev bucket per 18.4}.
Flat hash into K <= 256 clusters; 4096-sample floor binding; NO spatial
maps or trees anywhere in S3.

### 19.5 S-gates (pinned now; I10 per-image medians primary throughout)

- S1 PREDICTORS: families {MED control, GAP, W} per the 18.4 mathematics
  verbatim; best non-MED family >= +1.5 RELPCT median quad in FRAME-S vs
  same-frame MED => PASS; FAIL => MED ships in both frames, B3 closed with
  numbers.
- S2 CANARY (opens ONLY on an S1 PASS): >= +0.5 RELPCT median AND no image
  regressing more than 0.25 pct in the frame(s) where the winner passed;
  second strike closes bias feedback FOREVER.
- S3 PROPERTIES: >= +1.5 RELPCT median quad in FRAME-S vs the same-stack
  best-flat-16 baseline (control includes adopted S1/S2 winners so the gate
  reads the property extension's marginal value); FAIL => flat-16 ships,
  B2 closed with numbers.
- S4 COMPOSITION: candidates {adaptive control, static spine, spine + S1
  winner, + S2 if passed, + S3 if passed} x D4c color-transform trials,
  decided strictly by real NET bytes per image (L-C1; the adaptive control
  in the candidate set makes composed NET non-regressing vs e1 BY
  CONSTRUCTION on the quad). Projection formula 18.5 VERBATIM against the
  committed e1 CSV, landscape/portrait class medians reported separately.
  Threshold: projected < 9.35 summed AND < 3.117 per-sample => proceed-to-
  format handoff; else stop-and-report. Zero container bytes until this
  threshold PASSES.
- S5 RESERVE: opens ONLY if S4 projects inside M3 reach but short of it;
  strict gate >= 2.0 RELPCT median NET or the lever dies with its third
  strike; never opened otherwise (L-C7).

### 19.6 CSV naming

`benchmarks/results/YYYY-MM-DD-sandbox-s{1,2,3}.csv` (+ `-s4`, `-s5` if
opened); one file per phase so earlier references stay stable.

### 19.7 STATUS

Written 2026-08-25 BEFORE any S-row exists. The V1 STOP verdict stands
recorded permanently; the static-table mechanism enters the S-program as a
freshly-controlled component candidate under these pins, not as a V1 PASS.

- the Architect
