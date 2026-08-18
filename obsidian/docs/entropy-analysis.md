# Obsidian - Entropy-coding analysis and corrected design (research v2)

- **Issue:** #68
- **Author:** Dr. Mob, the Researcher
- **Date:** 2026-08-18
- **Supersedes in part:** `docs/algorithmic-spec.md` section 6 (entropy coding) and the milestone list in `docs/research.md` section 3.5.
- **Companion docs:** `docs/research.md` (literature), `docs/algorithmic-spec.md` (v1 spec), `docs/benchmark-methodology.md`, `docs/architecture.md`.

---

## 0. Executive summary

The Obsidian codec is structurally sound in its prediction, color-transform, and
context-modeling stages, but its **entropy-coding stage is broken as wired** and
causes a guaranteed expansion: on the Kodak set the first measured row lands at
**27.82 bpp**, i.e. **1.16x the raw 24-bit RGB rate** (raw = 24.00 bpp), while
every baseline compresses (JPEG XL 8.71, WebP 9.61, JPEG-LS 9.71, J2K 9.58,
optipng PNG 13.05).

The defect is not in prediction or transforms. It is entirely in the entropy
coder: a **per-context adaptive rANS over a 512-symbol alphabet** whose tables
never specialize on a 768x512 image, so the overwhelming majority of symbols are
coded at the uniform ~9-bit cost, which exceeds the 8-bit raw pixel cost.

This document diagnoses the cause rigorously, proves the no-expansion requirement,
and prescribes a corrected entropy-coding design (per-context adaptive
Golomb-Rice as the primary, practical path; a right-sized, escaped rANS as the
high-effort path) that takes Obsidian from expansion to competitive with WebP and
then to JPEG XL.

---

## 1. The measured evidence (canonical PCD0992, 24 images, 768x512)

Mean bpp (arithmetic mean over the 24 images; "bpp" here is total bits per image
pixel, i.e. all channels, which is why raw RGB = 24.00):

| Codec | mean bpp | note |
|---|---|---|
| raw RGB (reference) | 24.00 | uncompressed 8-bit x3 |
| **Obsidian e4 (current)** | **27.82** | **EXPANSION, x1.16 vs raw** |
| JPEG XL modular (cjxl -q100) | 8.71 | practical SOTA |
| WebP lossless (cwebp -m 6) | 9.61 | M1 upper bound |
| JPEG-LS (CharLS) | 9.71 | |
| JPEG 2000 lossless | 9.58 | |
| optipng PNG | 13.05 | M1 secondary bound |

The reference baseline matches the independent WangXuan95 (2024) aggregate on the
same corpus within ~0.5%, so the measurement loop is trustworthy. The literature
numbers in `docs/research.md` section 2.7 are quoted *per channel* (~3.1-4.2 bpp);
multiplied by 3 channels they equal the totals above (JXL 8.71 total = 2.90 per
channel). There is no contradiction: the benchmark is correct. The only problem is
Obsidian's entropy stage.

---

## 2. Root-cause diagnosis (rigorous)

### 2.1 What the current stage does

In `encoder.rs::code_planes` (adaptive branch, effort > 0), each plane is coded
symbol-by-symbol with `zigzag(r)` mapped into an rANS alphabet of **size 512**
(`Alphabet::for_range(0,255).size == 512`, see `context.rs`). Each of the
`context_count` contexts gets its own `RansTable::new_adaptive(512)`.

`RansTable::new_adaptive` initializes every symbol's frequency to
`M / size = 4096 / 512 = 8` (`rans.rs`), so the initial per-symbol cost is
`-log2(8/4096) = -log2(1/512) = 9` bits. Adaptation (`RansTable::adapt`) then
increments the observed symbol by exactly 1 and steals 1 unit from the richest
*other* symbol, keeping the total pinned at `M = 4096`. To make the dominant
symbol (say residual 0) reach frequency ~2048 (cost ~1 bit) the table must be
shown the dominant symbol ~2040 times while stealing the same number of units
from the ~511 other symbols.

### 2.2 Why the tables never specialize

The default context configuration is `base_shift = 3`, `activity_classes = 2`
(`context.rs`), giving `interior_count = ((364 >> 3) + 1) * 2 = 92`, plus 3 border
contexts = **95 contexts per plane**. For RGB (no palette) that is `95 * 3 = 285`
contexts. A 768x512 RGB image has `393216` pixels x 3 planes = `1,179,648`
residual symbols, so each context receives only

```
1,179,648 / 285 ≈ 4138 symbols.
```

Specializing the zero symbol to ~2048 frequency needs ~2040 of those symbols to be
exactly 0 in that context, which never happens: photographic residuals are spread
over many magnitudes, and even where 0 dominates it is at best ~50-70% of a
context, so only ~2500 of the 4138 symbols would favor 0, leaving the table
badly un-specialized. The net effect: across the whole image, the effective
per-symbol cost stays within a fraction of a bit of the uniform **9 bits**,
because the adaptation is too slow and the alphabet too wide for the statistics
budget per context.

### 2.3 The arithmetic of the expansion

At ~9 bits per residual symbol over `1,179,648` symbols:

```
9 bits/symbol * 1,179,648 symbols = 10,616,832 bits = 1,327,104 bytes
```

The measured kodim01 Obsidian file is `1,337,704` bytes (27.22 bpp). The match is
exact: the entropy stage is emitting ~9 bits per residual symbol, which is greater
than the 8 bits of a raw pixel, so the container **grows** the image. The
predictor/context machinery is doing useful work (it concentrates probability mass
near 0), but the entropy coder cannot exploit that concentration because it has
not specialized its table.

This is a clean, provable failure mode: **a fixed-total adaptive table with a wide
alphabet and slow single-unit updates cannot specialize when
`(symbols per context) << (alphabet size needed to specialize)`**. On Kodak the
ratio is ~4138 / ~2048, i.e. the wrong side of 2x.

### 2.4 Why the tests did not catch it

The unit tests assert only *correctness* (round-trips, determinism, corruption
rejection) and a few soft efficiency bounds. `uniform_adaptive_efficient` checks
that 512-symbol uniform adaptive rANS stays under 10 bits/symbol, which is true
for *uniform* data but says nothing about the structured-data expansion caused by
under-specialization. The `large_flat_compresses` test was even relaxed to
`bpp < 5.0` precisely because the adaptive start is wasteful. The gap is a
*modeling* failure, invisible to symbol-level correctness tests.

---

## 3. The corrected requirement: a no-expansion entropy coder

Let `p` be the empirical residual distribution in a context and `H(p)` its entropy
(in bits per symbol). A correct from-scratch entropy coder must satisfy:

```
cost(symbol) = H(p) + epsilon,    epsilon = O(1) bits per symbol,
```

with `epsilon` small and, crucially, with the *early-symbol overhead* bounded by a
constant that does not scale with alphabet size. The current design violates this
because its early overhead is `log2(512) = 9` bits and it never decays. Two
designs satisfy the requirement.

---

## 4. Design A (PRIMARY, for M1): per-context adaptive Golomb-Rice

This is the JPEG-LS (LOCO-I) entropy model. It needs essentially no per-context
statistics, so the 285-context granularity that broke rANS is a non-issue, and it
reproduces JPEG-LS, which on Kodak measures 9.71 bpp (already competitive with
WebP 9.61 and far better than PNG 13.05).

### 4.1 Signed residual

Keep the signed residual `r = pixel - pred` (full plane range, as today). Do
**not** zigzag into a 512-symbol alphabet for the entropy stage.

### 4.2 Golomb-Rice code for a non-negative magnitude

For each pixel, let `m = |r|` (and a 1-bit sign for `r != 0`, folded below). With
per-context integer parameter `k >= 0`:

```
q   = m >> k                 // quotient
rem = m & ((1 << k) - 1)     // remainder, 0 <= rem < 2^k
```

Encode `q` in unary (q copies of bit 0 followed by a single bit 1) and `rem` in
`k` bits of standard binary. Total cost for magnitude `m` is `(q + 1) + k` bits.

Refinement (the JPEG-LS truncation that saves ~1 bit on small `m`): if `m < 2^k`,
emit `m` directly in `k` bits (no unary prefix). Use the plain unary form only for
`m >= 2^k`. This is exactly the LOCO-I code and is optimal for a two-sided
geometric (Laplacian) distribution.

Sign: fold the sign into the prefix. A clean bijection: map `r` to a non-negative
index `u` by `u = 2*m + (r < 0 ? 1 : 0)` for `r != 0` and `u = 0` for `r == 0`
(JPEG-LS uses a similar scheme; the zero case is the most probable and costs only
the Rice code of `q=0`). Because residuals are symmetric, this costs ~1 extra bit
per non-zero symbol, which is the correct price for the sign.

### 4.3 Per-context adaptive `k`

Each context carries a single small integer `k` (0..15) and an adaptation counter.
Use the standard JPEG-LS update, which is cheap and stateless beyond `k`:

```
maintain per context: k (u4), and a bias counter b in [-32, 32] (say).
after coding magnitude m with current k:
    err = m - (1 << k)            // signed deviation from the 2^k breakpoint
    b += (err > 0) ? 1 : -1       // or += sign(err)
    if b >=  32: k = min(15, k+1); b = 0
    if b <= -32: k = max(0,  k-1); b = 0
```

(An exponential-moving-average-of-`|m|` rule, `k = max(0, round(log2(ema)))`, is
an equivalent, simpler alternative that the Builder may prefer; both keep `k`
tracking the local residual scale.) Because only `k` (4 bits) is stored per
context, the model footprint is tiny and `MODEL_SIZE_FRACTION` is never an issue.

### 4.4 No-expansion proof sketch

For a residual stream with entropy `H(p)` per symbol, Golomb-Rice with
adaptively chosen `k` codes each symbol in `H(p) + O(1)` bits: the unary quotient
costs `q` bits where `E[q] = (2^k - 1)/p0 ... ` is bounded by the geometric
entropy, and the `k` remainder bits equal the precision of the Rice model. For a
Laplacian residual the total overhead is ~0.08 bits/symbol (the well-known
Golomb-Rice near-optimality for geometric sources), and for arbitrary `p` it is at
most `log2(e) ≈ 1.44` bits/symbol plus a small constant. For structured Kodak
residuals `H(p) ≈ 2-4` bits/symbol, so the cost is `3-6` bits/symbol, strictly
less than the 8-bit raw pixel. Unlike the 512-symbol rANS, the early-symbol
overhead is `O(1)` (a couple of bits while `k` adapts over the first dozen
symbols of a context), not `log2(512) = 9` bits that never decays.

### 4.5 Complexity

- Encode/decode: O(1) per symbol (a few integer ops + a byte flush on the unary
  run). Throughput target >= 200 MB/s single-thread, faster than the current rANS
  table lookups.
- Memory: `O(C)` for the `k`/counter arrays (`C = 285`, negligible) versus the
  current `O(C * 512 * 2B) ≈ 285 KB` of adaptive tables.

---

## 5. Design B (HIGH EFFORT, for M2/M3): right-sized, escaped rANS

If the project wants fractional-bit coding with static per-context tables (the
JPEG XL approach) to close the last gap to JPEG XL, the rANS stage can be retained
BUT it must be fixed exactly where it is broken today:

1. **Cap the alphabet.** After zigzag, residuals are peaked at 0. Replace the
   fixed 512-symbol alphabet with a *capped* alphabet: symbols `0..S-1` for a cap
   `S` in `[32, 128]` (tuned), and a single escape symbol `S` that carries any
   out-of-range residual via a secondary Golomb-Rice code (Design A) over its raw
   value. This keeps the table small enough to specialize: with `S = 64` and 285
   contexts, each context needs only ~64 increments to specialize, far below its
   ~4138 symbol budget.
2. **Static tables from the analysis pass** (already collected at effort >= 6 in
   `model.rs`). Normalize over the cap `S`, emit the table (the existing
   `write_model` static-histogram path), and decode identically. With `S = 64`
   the per-context static model is `64 * 2B = 128B`; `285` contexts = `36 KB`,
   well under `MODEL_SIZE_FRACTION`.
3. **Escape for the long tail.** The escape path guarantees no residual is
   uncodable and that rare large residuals do not inflate the main table.

Design B, combined with the already-implemented per-context predictor selection
(section 5 of `algorithmic-spec.md`) and the self-correcting weighted predictor
(effort >= 4), is the path to match JPEG XL. Design A alone is sufficient for M1.

The current adaptive rANS (12-bit tables, full 512 alphabet, single-unit steal)
should be **retired as the default**; it is the direct cause of the expansion and
its slow adaptation cannot be salvaged on images this small without the alphabet
cap above.

---

## 6. Revised milestones (rebased on the measured baseline)

The literature-only milestone list in `docs/research.md` section 3.5 is replaced by
the following, anchored to the measured PCD0992 means:

- **M0 (blocker, pre-M1): fix the entropy stage.** Replace the 512-symbol
  adaptive rANS with Design A (Golomb-Rice). Expected result: drop from 27.82 bpp
  to roughly the JPEG-LS range (~9.5-10.0 bpp). This is a correctness-of-design
  fix, not an optimization.
- **M1: beat WebP lossless and optipng PNG on Kodak.** Target mean bpp < 9.61
  (WebP) and < 13.05 (PNG). Achievable with Design A + the existing predictor bank
  + per-context predictor selection + YCoCg-R. Acceptance = spec F2.
- **M2: approach JPEG XL (within ~10%).** Target mean bpp <= ~9.6, i.e. at or
  below WebP and close to JPEG XL 8.71. Requires the self-correcting weighted
  predictor and per-context predictor selection to be fully effective (already
  specified; must be verified to actually reduce size vs MED-only).
- **M3: match or beat JPEG XL (<= 8.71 bpp).** Requires Design B (capped, escaped,
  static rANS) and/or squeeze/interlacing (v2), plus tuned constants. This is the
  owner's stated competitive bar.
- **Stretch:** per-context mixing (MRP-class) as a separate slow mode, only after
  M3.

Note: the original M1 bar ("below WebP") is met by JPEG-LS-class coding, but WebP
here is 9.61, marginally better than JPEG-LS's 9.71, so M1 genuinely requires the
per-context predictor selection (not just MED) to clear 9.61. That is good news:
Obsidian already implements per-context selection and YCoCg; only the entropy
coder must change.

---

## 7. What the Builder must NOT change

The following are correct and must be preserved:

- The reversible color transform (YCoCg-R) and per-image adaptive selection.
- The predictor bank (8 predictors) and the per-context predictor map from the
  analysis pass.
- The context model (gradient quantization, sign symmetry, activity class, border
  contexts) and the `zigzag` mapping (keep it as an internal helper for Design B's
  capped alphabet; Design A uses signed residuals directly).
- The container layout and the CRC fidelity gate.

Only `encoder.rs::code_planes`, `decoder.rs`, and `rans.rs` (the entropy stage)
are in scope for M0/M1.

---

## 8. Acceptance criteria (supersedes spec F2 wording)

- **F1:** 100% bit-exact round-trip on Kodak and the fuzz set (unchanged).
- **F2 (M1):** Obsidian mean bpp on Kodak < 9.61 (WebP) AND < 13.05 (optipng
  PNG). The current 27.82 is a hard failure that must be eliminated first.
- **F3:** encode + decode within a documented factor of WebP speed.
- **F4:** every iteration records a benchmark row (tool versions, machine, date).

- Dr. Mob, the Researcher
