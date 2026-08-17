# Obsidian - Algorithmic specification v1

- **Issue:** #68
- **Author:** Dr. Mob, the Researcher
- **Date:** 2026-08-17
- **Status:** proposal for the Architect

This specification defines Obsidian v1, a lossless image codec for 8-bit
grayscale and RGB(A) images. It is designed to be implemented from scratch
(no third-party compression code), benchmarked against PNG, JPEG-LS, WebP
lossless, FLIF, and JPEG XL lossless on Kodak.

Every transform below is a **bijection on integer arrays**; reversibility
(fidelity) is guaranteed by construction and verified by round-trip tests and
a header checksum.

---

## 1. Notation and conventions

- Pixel channels are integers in `[0, 2^b - 1]`, `b = 8` in v1.
- A channel plane is `I[x][y]`, `x in [0, w)`, `y in [0, h)`.
- Causal neighbors of `I[x][y]` (raster order): `L = I[x-1][y]`,
  `T = I[x][y-1]`, `TL = I[x-1][y-1]`, `TR = I[x+1][y-1]`. Out-of-bounds
  neighbors clamp to the nearest valid pixel; for `y = 0` use
  `T = TL = TR = I[x][0]` when available, else `0`.
- All arithmetic in prediction is integer; residuals are taken
  **modulo `2^b`** so that `decode(encode(I)) == I` regardless of prediction
  magnitude.

---

## 2. Container layout

```
+----------------+-----------+----------------+---------------+---------------+
| 8-byte header  | transforms| predictor model| residual model| rANS payload  |
+----------------+-----------+----------------+---------------+---------------+
```

Header (8 bytes):
- `magic` (4 bytes): ASCII `OBSD`.
- `version` (1 byte): `1`.
- `flags` (1 byte): bits `[0:1]` channels (`0` gray, `1` RGB, `2` RGBA),
  bit `2` color-transform applied, bit `3` palette applied, bits `[4:7]`
  reserved.
- `b` (1 byte): bit depth, `8`.
- `effort` (1 byte): `0..7` trade-off knob (see section 9).

Then `width` (u32), `height` (u32), and the signaled transform/predictor
tables, then the rANS payload (byte stream, remainder bits appended last).

A 32-bit CRC of the raw channel planes is stored in the header so the decoder
can verify bit-exact recovery (cheap insurance; costs 4 bytes).

---

## 3. Reversible color transform

For RGB images a YCoCg-R transform is applied (reversible, from the JPEG 2000
and JPEG XL lineage):

```
Co = R - B
t  = B + (Co >> 1)
Cg = G - t
Y  = t + (Cg >> 1)
```

Inverse (exact):

```
t  = Y - (Cg >> 1)
G  = Cg + t
B  = t - (Co >> 1)
R  = B + Co
```

All values stay in `int` range; the round-trip is bit-exact. `Y` carries the
bulk of the entropy; `Co, Cg` become near-zero-residual planes on photographic
content. Grayscale skips the transform. Alpha (RGBA) is coded as its own plane
with the same residual pipeline.

The encoder computes the coded size with and without the transform (the cost
of the transform is one header bit plus the residual streams) and signals the
cheaper option. This per-image adaptive selection guards against images where
the transform hurts (rare for natural content, possible for synthetic).

Optional **palette transform** (flag bit 3): if the image has `<= 256` distinct
RGB triples and palette mode is cheaper (computed by encoding both), emit the
palette (indexed by `b` bits) followed by an index plane coded by the same
residual pipeline. This is the standard trick from WebP/JPEG XL for
synthetic/graphic content; on Kodak it will normally lose, which is fine, the
selection is measured, not assumed.

---

## 4. Prediction

### 4.1 Predictor bank

A pixel is predicted from causal neighbors by one of:

| id | name | formula |
|----|------|---------|
| 0 | Left | `L` |
| 1 | Top | `T` |
| 2 | TL | `TL` |
| 3 | TR | `TR` |
| 4 | Avg | `(L + T) >> 1` (floor) |
| 5 | MED | JPEG-LS median edge detector |
| 6 | GAP-lite | thresholded gradient blend of `L, T, TL, TR` |
| 7 | WAvg | weighted average with context-signaled integer weights (section 4.3) |

`MED(L, T, TL)`:

```
if TL >= max(L, T): return min(L, T)
if TL <= min(L, T): return max(L, T)
return L + T - TL
```

`GAP-lite` uses the three gradients `dh = abs(L - TL)`, `dv = abs(T - TL)`,
`dd = abs(TR - TL)`, classifies the dominant gradient direction, and returns a
threshold-controlled combination of `L, T, TL, TR` (mirror of CALIC GAP,
details in implementation notes; constants are tuned on Kodak).

### 4.2 Self-correcting weighted predictor (v1.5, effort >= 4)

The strongest single predictor in JPEG XL's arsenal is the self-correcting
weighted ensemble: four sub-predictors, each a weighted sum of neighbors with
per-region learned integer coefficients, plus a running `max_error` statistic
that measures local prediction quality and is itself a context property.

v1 ships the fixed bank above plus a **simplified weighted predictor**: four
integer coefficient vectors `w^k = (wL, wT, wTL, wTR)`, selected by context
(section 5), prediction computed as

```
pred = clamp_round((wL*L + wT*T + wTL*TL + wTR*TR) >> S)
```

with `S` fixed (e.g. `S = 4`) and coefficient vectors from a small signaled
codebook. The full self-correcting variant (online weight adaptation driven by
`max_error`) is the specified v1.5 upgrade and is the M2 milestone.

### 4.3 Predictor selection model

Rather than a fixed predictor per image, the encoder learns a **context to
predictor map**: for each context `c` (section 5), select the predictor id
(and weight vector, if `7`) that minimizes the total coded size (measured in a
first analysis pass). The map is entropy-coded into the stream (at most a few
hundred small integers) and lets the decoder reproduce the exact per-pixel
choice.

Predictor table cost is negligible relative to the residuals it saves; this
per-context selection is the mechanism that reproduces JPEG XL's "predictor
per pixel" advantage without an MA tree in v1.

---

## 5. Context modeling

### 5.1 Local gradients

For each pixel compute the three causal gradients (JPEG-LS style):

```
g1 = T  - L
g2 = L  - TL
g3 = TL - T
```

Quantize each to 9 bins via a symmetric threshold set (e.g. thresholds
`{-16,-4,-1,0,1,4,16}` giving 9 bins `[-,..,+]`), then exploit the sign
symmetry: `Q(-g) = flip(Q(g))`, so the triple `(g1,g2,g3)` and its negation map
to the same context (JPEG-LS reduces 9^3 = 729 to 365 contexts this way).
Base context id = the reduced triple.

### 5.2 Activity / max-error property

Add an **activity class** derived from the magnitude of the local gradients
(or from the predictor's `max_error` in v1.5): quantize `|g1| + |g2| + |g3|`
into 4 classes. Combined context space:

```
context = base(365) * 4 + activity_class   // <= 1460 per channel plane
```

Keep contexts per plane at `<= 256` by a second reduction if the statistics
are sparse (implementation detail; the analysis pass selects the reduction
that minimizes measured cost).

### 5.3 Residual symbol mapping

Residual `r = (pixel - pred) mod 2^b` in `[0, 2^b - 1]`. Map to a non-negative
integer preserving the peaked-at-zero distribution:

```
u = 2*r          if r <= (2^b >> 1)   // even symbols: low values
u = 2*(2^b - r) - 1  otherwise        // odd symbols: mirrored
```

`u` ranges `[0, 2^(b+1) - 1]` (511 for 8-bit). This "zigzag" mapping makes
small-magnitude residuals the most probable symbols, which is what the entropy
coder exploits.

Edge and border pixels get dedicated small context sets (left column, top row,
corners) so their degenerate neighborhoods do not pollute the interior
contexts.

---

## 6. Entropy coding: adaptive rANS

### 6.1 Why rANS

rANS provides fractional-bit coding (like arithmetic coding) with table-based
speed (like Huffman). It is the entropy coder of JPEG XL and LOCO-ANS and is
the natural fit for the peaked per-context residual distributions, where
Huffman is structurally limited to >= 1 bit per zero.

### 6.2 Parameters

- State `x`, 32-bit; renormalization interval `[L, 2^32)` with
  `L = 1 << (32 - RENORM)`; `RENORM` such that a full table symbol never
  underflows (see pseudo-code guard).
- Frequency tables: `TBITS = 12`, so each context has a table of
  `2^12 = 4096` slots with cumulative frequencies summing to `1 << TBITS`.
  Alphabet size `A = 2^(b+1)` (512 for 8-bit), but sparse tables are allowed:
  symbols never observed get frequency 0 and are handled by a scale-escape
  path (details in implementation notes; equivalently, cap the active alphabet
  to symbols seen with a normalized model).
- **Adaptive variant (v1 default)**: frequencies are incremented after each
  observed symbol and renormalized (halve all, drop fractions) when the table
  sum exceeds `1 << TBITS`. This gives per-context online adaptation without
  an analysis pass.
- **Static variant (effort >= 6)**: one analysis pass collects per-context
  histograms; normalized tables are signaled and used identically by encoder
  and decoder; faster decode, slightly better density on large images. Selected
  per image by measured cost.

### 6.3 Encode one symbol `s` with table `(freq, cum, total = 1<<TBITS)`

```
x = x + freq[s] * cum[s]
// renormalize
while x >= L:
    emit x & 0xFF
    x >>= 8
```

Encoding proceeds in **reverse decode order** (symbols are pushed so the
decoder pops them in raster order), the standard ANS stack discipline.

### 6.4 Decode one symbol

```
t = x & (L - 1)
s = table_slot[t]
x = freq[s] * (x >> TBITS) + (t - cum[s])
while x < L:
    x = (x << 8) | read_byte()
```

The decoder is the exact inverse and requires no probability normalization at
decode time (frequencies are updated identically on both sides).

### 6.5 Stream finalization

The encoder writes the trailing state (`x`) as a 4-byte big-endian word and
the byte-reversed emitted bytes; the decoder reverses the procedure. Combined
with the header CRC, a bit-exact round-trip is machine-checkable.

### 6.6 Bit cost bound

For context `c` with empirical distribution `p_c`, rANS achieves per-symbol
cost `H(p_c) + O(1/TBITS)` bits, where `H` is the entropy. This is within
~0.05-0.1% of the Shannon limit, i.e. the entropy coder is effectively a
non-issue once contexts are good.

---

## 7. Coding order

v1 uses **raster order** (top to bottom, left to right) with the causal
neighborhood of section 4. Raster order is simple, deterministic, and
stream-friendly. It forfeits the lower/right context that FLIF-style
interlacing provides; interlacing/squeeze is the specified v2 upgrade (M3
milestone) and is expected to be worth a few percent on noisy high-entropy
content.

---

## 8. Effort levels (encode-time budget, same bitstream for decode)

| effort | behavior |
|--------|----------|
| 0 | single predictor (MED), adaptive rANS, no analysis pass |
| 1-3 | full predictor bank, fixed per-context selection, adaptive rANS |
| 4-5 | + weighted predictor + per-context predictor map (analysis pass) |
| 6-7 | + static rANS tables, optional palette transform, deeper context reduction search |

The bitstream format is identical for all efforts; effort only changes how
the encoder searches the model. Decoder cost is the same.

---

## 9. Complexity analysis

Let `n = w*h` be the number of pixels, `C` the number of contexts per plane
(`<= 256`), `A = 512` the alphabet, `T = 4096` the table size.

- **Encode (effort 4-7)**: analysis pass O(n) plus coding pass O(n); each
  pixel does a constant number of neighbor lookups and one rANS step with a
  table update. Total `O(n)` time.
- **Decode**: single pass, `O(n)` time.
- **Memory**: row buffers `O(w)`; context tables
  `O(C * T)` u16 entries, i.e. at most `256 * 4096 * 2B = 2 MB`; per-context
  predictor map `O(C)`. Decoder needs only the rANS payload + tables.
- **Scalability**: the per-pixel work is a handful of integer ops plus one
  table lookup/update; throughput target >= 100 MB/s on a modern core
  (rANS is branch-light; see JPEG XL and rANS literature).

---

## 10. Fidelity guarantee

1. Every stage is an integer bijection: color transform (section 3), predictor
   residualization modulo `2^b` (section 4), zigzag mapping (section 5.3), and
   rANS (section 6) are all exactly invertible.
2. The test suite must pass a bit-exact round-trip on the entire Kodak set and
   a randomized fuzz set (thousands of random small images, including all-edge,
   all-zero, gradient, and noise images).
3. The header CRC cross-checks decode output; any mismatch is a hard error.

---

## 11. v1 acceptance criteria (for the benchmark methodology doc)

- **F1**: 100% round-trip fidelity on Kodak and fuzz set.
- **F2**: average bpp on Kodak below WebP lossless (method 6) and below
  optipng-optimized PNG.
- **F3**: encode + decode within a reasonable factor (documented) of WebP
  speeds; single-threaded, no SIMD requirement in v1.
- **F4**: every meaningful iteration records a benchmark row (tool versions,
  machine, date) so the improvement curve is traceable.

- Dr. Mob, the Researcher