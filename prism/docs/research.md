# Prism - Next-Generation Lossless Image Codec (Research Phase)

- **Issue:** #103 (owner directive 2026-08-21)
- **Role:** Dr. Mob, the Researcher
- **Predecessor:** Obsidian (issue #68 / PR #93) - reached **9.5208 bpp** on Kodak
  (PNG 13.05 MET, WebP 9.61 MET, **JPEG XL 8.71 NOT MET**, +0.81 bpp).
- **Mandate:** C++ rewrite supporting all major input formats, outperforming
  JPEG XL on the Kodak dataset, carrying forward every Obsidian lesson.

This document is the **literature review and SOTA survey** that motivates the
Prism algorithmic design (`algorithmic-spec.md`). It is deliberately honest about
what beats JPEG XL and what does not, because Obsidian spent many iterations
rediscovering that a near-optimal per-pixel entropy coder alone cannot cross the
JPEG XL line: the gap is a **redundancy-class** gap (multi-resolution + inter-band
+ meta-adaptive context), not a coder-efficiency gap.

## 1. Why Obsidian plateaued at the JPEG-LS floor

Obsidian's final pipeline (per-pixel causal prediction + context-modeled adaptive
binary rANS, CMARC, already at H(p)+epsilon) measured 9.5208 bpp. Every
Builder-implementable lever was tried and found inert on photographic Kodak:

- CMARC binary range coder (R4): correct, H(p)+epsilon. Necessary, not sufficient.
- Context-tree weighted least-squares predictor (R9-B): **+4.1%** (the single
  biggest gain, 10.0858 -> 9.6678). Real, but capped.
- Residual-DIFF context (R3-A): +0.05 (9.7579 -> 9.7067). Clears JPEG-LS only.
- Subtract-green / cross-channel (R2.1): helps on correlated content, ~2-4%.
- Squeeze + CFL (R10-A/B): 9.6678 -> 9.5208. The first genuinely new
  redundancy class, and the **only** thing that moved the JPEG XL gap.
- Cross-band in-loop predictor over Squeeze HF bands (R11-A): **measured a wash
  (9.5091, +45x encode slowdown)**. Reverted. Root cause: the co-located LL
  reference decorrelates the HF residual only if the *context model* can exploit
  it. Squeeze without MA-tree context modeling buys nothing.
- LZ77 / color cache / run mode: inert on photographic Kodak (the per-pixel
  binary coder already codes near-constant runs near-optimally).

**Conclusion:** the remaining ~0.81 bpp to JPEG XL is won by (a) Squeeze and
(b) a **meta-adaptive (MA-tree) context model** that folds LL + in-band +
sibling-HF + residual-DIFF references into a single adaptive context. These two
must ship together. Prism is built around exactly that.

## 2. State of the art on Kodak lossless

Reported Kodak (24 images, 768x512, 24-bit RGB) mean bits-per-pixel, two
conventions in the literature:

- Per-sample (bits per channel): JPEG XL e7 ~ 2.8-3.1, WebP z9 ~ 3.2-3.4,
  JPEG-LS ~ 3.2-3.3, PNG(optipng) ~ 4.3, FLIF ~ 3.1, MRP/context-mixing ~ 2.6-2.8.
- Summed over 3 channels (the Obsidian harness convention, which reports
  JPEG XL = 8.7062): scale the above by ~3.

The issue's "~3.1 bpp" is the per-sample figure; the harness's 8.71 is the
summed figure. Prism targets **beating JPEG XL under the harness convention
(< 8.71 summed, i.e. < ~2.9 per sample)**, which is exactly the owner's stated
goal of outperforming JPEG XL. (See `benchmark-methodology.md` for the exact
bpp definition Prism will use, so the Architect and Builder stay aligned.)

### What each SOTA codec does that matters

| Codec | Key mechanisms | Kodak (summed bpp) |
|---|---|---|
| PNG / zlib | per-row Paeth + DEFLATE (no context modeling) | ~13.0 |
| JPEG-LS | LOCO-I GAP predictor + context-modeled Golomb-Rice | ~9.71 |
| WebP lossless | per-pixel predictors + LZ77 + color cache + AR-coder | ~9.61 |
| JPEG 2000 | 5/3 integer wavelet + MQ-coder | ~9.58 |
| FLIF | MANIAC trees + CABAC + reversible YCoCg + spatial | ~3.1/sample |
| JPEG XL (modular) | **Squeeze (CDC) + MA-tree context + rANS + LZ** | ~8.71 |
| MRP / context-mixing | PAQ-style CM over many neighborhood models | ~2.6-2.8/sample |

The two mechanisms that actually cross below WebP/JPEG-LS are:

1. **Multi-resolution decorrelation (Squeeze / wavelet):** photographic images
   are smoothest in the low-pass (LL) band; coding LL near-optimally and HF
   residuals as tiny second-differences is the dominant Kodak win.
2. **Meta-adaptive context modeling (MA-tree / MANIAC):** a *learned* decision
   tree maps a rich feature vector (gradients, residual-DIFF class, band
   identity, co-located LL value, sibling band values, activity) to an adaptive
   probability-model context. This is the single biggest differentiator between
   JPEG XL/FLIF (~3.1) and the per-pixel CMARC family (~9.5).

Prism adopts both, plus the issue's requested **learned context mixing (CM with
small mixer / SSE)** and **LZP pre-filtering** as high-effort modes.

## 3. Design conclusions (carried into the spec)

1. **Language = C++** (honest fit vs JPEG XL / WebP; the issue mandate).
2. **Format-agnostic bitstream:** a robust front-end decodes PNG/JPEG/BMP/TIFF/
   WebP/PPM/raw to a canonical planar raster; the codec compresses the raster
   and the decoder emits the canonical raster. Lossless fidelity is defined as
   bit-exact raster equality with the *decoded input* (not the container).
3. **Reversible color decorrelation set** (YCoCg-R, subtract-green, CFL,
   optional 5/3 lifting), auto-selected per image, strict-superset (identity
   always available, so selection never expands).
4. **Squeeze is mandatory**, not optional. Recursively decimate even/odd
   rows/cols; emit sub-bands in post-order (LL before its HF children) so HF
   bands can reference co-located LL.
5. **MA-tree context model is the core Prism differentiator**, shipping together
   with Squeeze. The tree is learned in the analysis pass (greedy entropy
   splitting) and serialized compactly; leaves feed per-context adaptive binary
   models.
6. **Entropy coder = context-modeled rANS** (32-bit, binary decomposition of
   the residual: sign + zero-flag + Rice quotient + remainder), each bin a
   per-context 16-bit probability (JXL-style WNC/CABS adaptation). This is
   provably H(p)+epsilon.
7. **High-effort modes (stretch goals):** (a) logistic **context mixing** with a
   small mixer + SSE on neighbor residuals (MRP route toward < 8.0), and (b)
   **LZP pre-filtering** to kill long textual/structural runs before entropy
   coding. Both behind a never-expand safety net.
8. **Bit-exact invariant** is a hard gate from M0: every commit round-trips
   byte-exact on Kodak and on fuzzed small images, at every effort level.
9. **Benchmark-driven, no rush:** each milestone is a numeric Kodak gate
   recorded as a row. Quality is the only deadline.

## 4. Risk register (honest)

- **Squeeze + MA-tree coupling is the crux.** Obsidian proved Squeeze alone is
  inert. Prism must not repeat that: the MA-tree must include co-located LL and
  sibling-band features, or Squeeze will again buy nothing. The spec (Stage 5)
  makes this explicit.
- **MA-tree learning cost.** Greedy tree construction over 768x512 images must
  be bounded (cap tree depth/leaf count, cache statistics per feature). Encode
  time is explicitly budgeted in the complexity section of the spec.
- **CM mode speed.** Logistic mixing is O(pixels * models) and slow; it is an
  opt-in effort mode, never the default, and never selected by the safety net
  unless it actually shrinks the file.
- **16-bit support.** Kodak is 8-bit, but the front-end accepts 16-bit (PNG/
  TIFF). The reversible transforms and rANS must be bit-depth parametric to
  avoid overflow (YCoCg-R widened to 9/17 bits; Squeeze to 10/18; residuals to
  i32).

## 5. Handoff

Next pipeline step: **Architect** (`/oc architect`). The algorithmic contract is
in `prism/docs/algorithmic-spec.md`; the measurement protocol is in
`prism/docs/benchmark-methodology.md`. The Architect designs the C++ module
layout, the container byte format, the MA-tree serialization, and the build
order that hits M0 (bit-exact) before any optimization.

- Dr. Mob, the Researcher
