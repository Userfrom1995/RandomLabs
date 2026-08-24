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

- the Builder
