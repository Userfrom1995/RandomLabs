# Prism Gap Analysis: Where the JPEG XL Parity Gap Actually Lives

- **Issue:** #130 (owner directive 2026-08-23, supersedes the closed M1-M4 claim of PR #121)
- **Role:** Dr. Mob, the Researcher
- **Status:** research phase complete; handoff to Architect at the end of this document
- **Units discipline:** every number below states its unit explicitly.
  `per-sample` = bits per channel sample: `8*bytes/(W*H*C)`.
  `summed` = bits per pixel over all channels: `8*bytes/(W*H)`; on Kodak-24
  (C=3) `summed = 3 * per-sample` exactly.

## 0. Executive summary

Measured on the exact owner corpus (24 PPMs matching
`prism/benchmarks/data/kodak.sha256`, verified before measuring):

| Quantity | per-sample | summed |
|---|---|---|
| Prism e7 today (reproduced bit-identically to the owner table) | 3.675 | 11.026 |
| M2 gate (WebP lossless m6 parity) | < 3.166 | < 9.498 |
| M3 gate (JPEG XL -d0 -e9 parity, binding) | < 2.885 | < 8.655 |

Four findings locate the ~21 percent total-bytes gap (12,702 KB vs 9,971 KB):

1. **F1, the differentiator is dead code on photos.** Efforts 1 through 7
   produce byte-identical payloads on all 24 images; they differ only in the
   stored effort header byte and its CRC footer byte-range. On all 24 images
   the analyzer selects `squeeze_levels=(0,0,0)` and serializes an empty
   single-leaf MA-tree (384 bytes of model blob corpus-wide). Everything that
   separates Prism from a plain MED + context coder never executes.
2. **F2, the shipped Stage-S is not Squeeze.** It is even/odd decimation:
   LL keeps raw subsamples, HF stores three pair-differences. Under ideal
   adaptive coding its bands cost MORE than simply MED-coding the full plane
   (11.74 vs 8.01 summed ideal; see F4 method). The analyzer's L=0 fallback is
   therefore correct given this transform; the transform is what must change.
3. **F3, the entropy backend wastes roughly 10 to 27 percent of the file**
   depending on which oracle bound is used, and its context model is inert in
   practice: switching the real coder from 343 residual-DIFF contexts to a
   single shared context changes output by only about 0.8 percent, while the
   same stream carries about 6 percent of conditional-entropy gain between
   those two models. The information exists; 343 independently-adapting
   binary model sets cannot harvest it (adaptation dilution).
4. **F4, the M3 line sits inside the ideal-coder bracket of today's own
   residuals.** Ideal adaptive coding of the CURRENT pipeline's residual
   streams lands between 8.01 and 9.94 summed (bucketed lower bound and
   exact-alphabet upper bound). JXL's 8.655 lives inside that bracket: parity
   does not require exotic new transforms first; it requires a backend and
   context model that actually collect what the predictors already expose,
   then a true lifting Squeeze to lower the bound further.

## 1. Method

- Corpus: `/tmp` copy of Kodak-Lossless-True-Color-Suite converted to canonical
  PPM; `sha256sum -c prism/benchmarks/data/kodak.sha256` PASS on all 24 files
  before any measurement. This is the identical corpus behind the committed
  comparison table (`prism/benchmarks/results/2026-08-23-kodak24-codec-comparison.md`,
  produced by `bench_vs_codecs.py`, commit f8a958d).
- Reproduction: rebuilt prism at f8a958d, encoded all 24 at effort 7,
  parsed each PRSM container directly. Total 13,005,137 payload bytes +
  384 model bytes + 1,032 container overhead = 12,702 KB, per-sample 3.675,
  summed 11.026 - matches the owner row exactly.
- Oracle estimates are empirical conditional entropies computed in numpy from
  stage-exact replicas (YCoCg-R forward with floor shifts and bias 512, MED
  with zero boundary, residual-DIFF quantizer `(qL*7+qU)*7+qUL`), with
  Krichevsky-Trofimov-style adaptation penalties and folding of contexts under
  24 samples. Bucketed symbols give the optimistic bound; exact 513-symbol
  alphabets give the pessimistic bound. Real codecs land between them.
- Coder-tax measurements use a standalone probe (`coder_probe.cpp` in the
  run workspace, logic copied verbatim from `acoder.cpp`: same `adapt_prob`
  shift-5 update, same range-coder renormalization) executed on dumped
  kodim01/kodim13 residual+context streams. Probe V0 output (571 KB for
  kodim01's three planes) calibrates against the real file (584 KB including
  container), so probe deltas transfer to reality.

## 2. Evidence

### F1: the effort ladder above 1 is inert (byte-level proof)

For all 24 images, `enc --effort 1` and `enc --effort 7` files have equal
lengths and differ in exactly five byte positions: offset 17 (the stored
effort byte) and offsets len-4..len-1 (crc32_all covering it). Payloads are
byte-identical. Container parse across the corpus:

| Field | Value on all 24 images |
|---|---|
| color transform | YCoCg-R (24/24) |
| squeeze levels | (0, 0, 0) (24/24) |
| model blob total | 384 bytes / 24 images (single-leaf tree + predictor id) |

Root cause chain in code: the B7 block in `src/codec/analyze.cpp` decides
Squeeze with an L1-energy proxy (`squeezed_plane_cost`) comparing MED
residual energy of the full plane against decimation-band energies; on photos
this proxy always prefers L=0; `evalGuard` then requires `hasLevels` and
discards the MA-tree entirely, falling back to the flat resdiff-343 coder;
CM/LZP candidate evaluation in `src/prism.cpp` only runs when
`hasSqueeze`. Net effect: e3..e7 features are unreachable on photographic
content, which is the entire benchmark corpus.

### F2: Stage-S as implemented is decimation, not Squeeze

`squeeze_encode_plane` sets LL = top-left subsample and HF = (b-a, c-a, d-a).
There is no averaging, so deeper levels carry undecayed high-frequency
content; the pyramid never becomes progressively smoother the way JPEG XL's
CDC (reversible average/difference lifting) does. Measured ideal-coder costs
(corpus totals; both units stated):

| Scheme (ideal adaptive coding, my feature sets) | per-sample | summed |
|---|---|---|
| Flat plane, order-0 | 2.846 | 8.537 |
| Flat plane, resdiff-343 conditioning | 2.669 | 8.006 |
| Shipped decimation Stage-S, best L | 3.912 | 11.737 |
| True-lift average/diff pyramid L=1, strawman cross-band ctx | 3.543 | 10.629 |
| True-lift pyramid L=2..4, same ctx | 3.610..3.635 | 10.831..10.906 |

Two readings: (a) the decimation scheme is strictly harmful even under ideal
coding, so no estimator fix can make it win - it must be replaced; (b) a true
lifting pyramid with STRAWMAN contexts also fails to beat plain spatial
contexting, confirming and extending Obsidian R11-A: multi-resolution pays
only when the context/mixing machinery is rich enough to exploit parent and
sibling structure. Transform-first was the wrong order; backend-and-context
is the right order.

### F3: entropy backend tax, measured not estimated

Exact-coder probe on kodim01 (three planes, 1,179,648 samples, 28.2 percent
zeros; identical numbers qualitatively on the harder kodim13):

| Variant (probe) | bits | KB | delta vs V0 |
|---|---|---|---|
| V0 shipped: sign-first + Elias-gamma magnitude + per-bit remainder bins, ctx343 | 4,673,830 | 571 | - |
| V1 zero-flag-first ordering, rest identical | 4,432,781 | 541 | **-5.1%** |
| V2 zero-first + naive Rice-k EMA quotient | 4,618,047 | 564 | -1.2% |
| V3 shipped binarization but ONE shared context | 4,713,695 | 575 | +0.9% |
| V4 sign-first + Rice-k | 4,859,097 | 593 | +4.0% |

kodim13 (19.8 percent zeros): V1 saves 3.4 percent; other relations hold.

Conclusions, all measured:

- Sign-before-zero costs 3.4 to 5.1 percent of the file for nothing: zeros pay
  a sign bin whose probability the model cannot separate from nonzero samples
  because the zero-flag has not been coded yet.
- Naive Rice-k EMA backfires (V2/V4); quotient adaptation oscillates. Do not
  ship it; prefer dual-rate adapted distributions or mixing instead.
- The resdiff-343 context set is nearly inert IN THE REAL CODER (V3 vs V0:
  0.9 percent) although the same conditioning carries about 6 percent in
  conditional entropy (order-0 -> ctx343 bucketed oracle: 8.537 -> 8.006
  summed). Cause: 343 independent binary model sets x four bin types adapt at
  shift-5 speed; per-context learning cost consumes the modeling gain.
  The fix class is statistical sharing: coarse-to-fine probability priors,
  dual-rate adaptation (fast+slow mixed), or logistic mixing over a handful of
  estimators with an SSE map. This is precisely the redundancy class
  MANIAC/WNC-style designs monetize and Prism currently does not.

### F4: feasibility bracket for M3

Ideal adaptive coding bounds for the CURRENT pipeline's residual streams:
8.01 summed (bucketed, optimistic) to 9.94 summed (exact alphabet, KT
penalties, pessimistic). The M3 gate 8.655 summed lies inside this bracket;
the M2 gate 9.498 lies inside it as well. Interpretation: the information
needed for both milestones already exists in Prism's own prediction residuals
after YCoCg-R; the engineering problem is collection efficiency, plus a true
lifting Squeeze afterwards to push the bound comfortably below the gates
rather than sitting at their edge.

## 3. Prescription (algorithmic path to true parity)

Priority ordered; each item names the measurable mechanism and its expected
effect class. Items P1-P4 target M2; P1-P6 target M3.

- **P1, rebinarize: zero-flag first.** Order bins `zero -> sign -> magnitude`.
  Zero-cost format change (decoder mirrors), measured 3.4 to 5.1 percent.
- **P2, replace 343 independent model sets with shared/hierarchical
  adaptation.** Concretely: per-bin probability initialized from a coarse
  class prior (e.g. qg or activity), updated with dual rates p_fast (shift 4)
  and p_slow (shift 6), coded probability = mix of the two; alternatively a
  small logistic mixer over {resdiff, qg, activity} estimators plus an SSE map
  on neighbor residuals. Success metric: real-coder context benefit approaches
  the 6 percent oracle delta (currently 0.9).
- **P3, decouple the MA-tree from the Squeeze decision.** Build the greedy
  tree on SPATIAL residual features always (depth up to ~10, leaves up to
  ~256, continuous thresholds chosen at quantile points, min-samples-per-leaf
  ~512 replacing the fixed 32), and let Squeeze merely add band identity +
  parent/sibling properties to the feature vector. Never again gate context
  modeling behind a transform decision.
- **P4, decide transforms by trial encode in BITS.** Any L1/log-mean proxy
  (`estimate_bits`, `leaf_bits`, `squeezed_plane_cost`) misleads; the analyzer
  must measure actual coded bytes per candidate (cheap: reuse the encoder on
  sub-bands). This kills the entire class of estimator bugs institutionalized
  by the old bench_gate.sh.
- **P5, replace Stage-S with reversible average/difference lifting (true CDC).**
  Per level: horizontal pass `d = a - b; s = b + floor(d/2)` on column pairs,
  vertical pass on both channels; recurse on the average quadrant only;
  post-order emission preserved (LL first). HF ranges stay within +-2^B*levels;
  16-bit inputs widen storage as today. L selected per plane by trial encode.
- **P6, cross-band prediction revisited AFTER P2/P3 land.** With working
  per-leaf models, add parent-gradient linear prediction for HF bands
  (predictor bank extension, per-leaf selector). Obsidian R11-A showed this
  is a wash without MA-tree contexts; F2 shows why it stayed a wash here.
- **P7 (M4 stretch), PAQ-style mixing/SSE toward < 8.0 summed**, unchanged
  from the original spec.

Projection honesty: P1+P2 alone recover roughly 4 to 10 percent of bytes
(11.026 summed -> ~10.0-10.6), clearing M1-class targets comfortably but not
M2. M2 requires P3 (harvest the remaining spatial-context headroom, oracle
delta another ~4-6 percent) landing near 9.3-9.6. M3 needs P5+P6 lowering the
information bound itself plus backend efficiency within ~5-8 percent of the
oracle; the literature anchor (FLIF/MANIAC ~9.3 summed on Kodak, JXL modular
8.65) says the combination is attainable, with zero slack for estimator bugs -
which is why D1's fail-proof gate ships first.

## 4. Handoff

Next pipeline step: **Architect** (`/oc architect`). Blueprint inputs:

- This document (findings F1-F4, prescriptions P1-P6 with success metrics).
- `prism/docs/algorithmic-spec.md` sections amended 2026-08-23 (Stage E/X/S
  contracts).
- `prism/docs/benchmark-methodology.md` gate table now restated in BOTH units
  with M2/M3 numeric thresholds from issue #130.
- `prism/benchmarks/bench_gate.sh` rewritten: prints both units on every
  line, compares each gate in its own unit, and carries `--self-check` which
  proves the gate FAILS on known-bad input (acceptance criterion 1 of #130).

Build order recommendation for the Architect: P1+P2 as one vertical slice
(entropy backend v2, bit-exact, fuzz-gated, measured on kodim01+kodim13
first), then P3 (tree always-on), re-measure, then P5 (true CDC) + P4 (trial
encode decisions), re-measure, then P6. No success claim without fresh
both-units numbers from the new gate.

- Dr. Mob, the Researcher
