# Fixer Report: X3b parent-context symmetry + MLP level feature

- **Issue:** #130 (X3b / X5a route-4 measurement program)
- **PR:** #167 (`opencode/issue130-20260829014156`)
- **Role:** the Fixer
- **Date:** 2026-08-29
- **Trigger:** Reviewer `/oc fix` (findings F1-F6) on head `13c5a0a`

## What the Reviewer flagged

The X3b parent-context activation (shared `LearnedModel` per plane, joint subband
walk with per-subband rANS streams) and the X5a chroma-on-luma plumbing were
correct, but the PR was not merge-ready: the offline trainer's sample collection
was asymmetric with the production encode/decode walk, and the `level` feature was
only used by the online EMA, never by the MLP prior.

## Fixes applied

1. **F2 (BLOCKING) - per-subband bitplane range in training.** `collect_samples`
   and `generate_symbols` (`prism/src/codec/bitplane.cpp`) computed a single
   global `B` across all subbands. The production `encode`/`decode` already use a
   per-subband `sub_maxbits[oi]`. For a plane where LL needs 10 bits and HH needs
   2, training previously emitted 8 extra all-zero significance planes per tiny
   band that encode/decode never emit. Both helpers now compute `sub_maxbits[oi]`
   exactly like `encode` and loop `for (int p = sub_maxbits[oi]-1; p>=0; --p)`.

2. **F2b (BLOCKING) - state indexed by `oi`, not `si`.** Both helpers allocated
   `sig`/`magv`/`curmag`/`sgn`/`topbit` sized `order.size()` and indexed by the
   coding-order position `si`, yet looked up the parent with `sig[pidx]` where
   `pidx` is an original subband index `oi`. That read the wrong subband's map
   whenever `order` was not the identity permutation. State is now indexed by the
   original subband index `oi` (size `NS`), identical to `encode`/`decode`.

3. **F1 (BLOCKING) - `level` now feeds the MLP prior.** `learned_norm`
   (`prism/src/codec/learned_ctx.cpp`) emitted 12 floats; the 13th slot is now
   `out[12] = f.level / 5.0f`. The EMA already separated level via `FB_LEVEL`; the
   MLP was previously blind to it at both train and inference (symmetric, but a
   lost modelling dimension). `LF` is 13; the header declaration was fixed from
   the stale `float out[10]` to `float out[13]` (F3), and the trainer's `FF` is
   13 so weights regenerate at the new width.

4. **F3 (MUST-FIX) - header declaration drift.** `learned_ctx.h` declared
   `learned_norm(..., float out[10])` while the definition used `LF=12` (now 13).
   Synced to `float out[13]`.

5. **F3/diagnostic (SHOULD-FIX) - payload helpers commented.** `frame_wavelet_payload`
   and `frame_spatial_payload` (`wavelet_container.cpp`) still encode each subband
   in isolation (parent/level features zero). Added an explicit comment that they
   are intentionally isolated diagnostics, not the production joint packing used
   by `frame_wavelet_encode` (which is what `bench-x` gates on).

6. **F4 (MUST-FIX) - PR body `Closes #130` -> `Refs #130`.** Performance gates are
   still open, so the issue must not auto-close on merge. Done via `gh pr edit`.

7. **F5/F6 (PROCESS) - ideas + progress.** This file is the ideas writeup; the
   progress file is updated below.

## Re-measurement (real Kodak-24, `blend=0`, `bench-x`)

After retraining (`prism train-learned --kodak` on the canonical 24 PPMs) with the
corrected per-subband collection and the 13-feature MLP:

| metric              | before fix (X5a, `13c5a0a`) | after fixer |
|---------------------|------------------------------|-------------|
| per-sample bpp      | 3.2474                       | **3.24386** |
| summed bpp/img      | 9.7424                       | **9.73159** |
| train BCE           | 0.222944                     | 0.312058    |

The BCE rose because removing the easy all-zero leading significance planes from
small subbands makes the remaining bits genuinely harder to predict; the rate is
marginally better, confirming the fixes made the training distribution match
inference without inventing a win.

Gates (issue #130): M2 needs per-sample <3.166 AND summed <9.498; M3 needs <2.885
AND <8.655. Both still FAIL (M2 gap ~+2.46%, M3 gap ~+12.4%). All Builder-scope
context levers (X2 fixed-context, X3a MLP seed, X3b deeper/wider + level, online
EMA blend, X5a cross-component) are now exhausted at ~3.244. Reaching M2/M3 needs a
fundamentally stronger context model - a Researcher + Architect redesign (e.g. a
convolutional/autoregressive prior or a bitplane value/tokenization change), not a
Builder tweak.

Durable CSV: `prism/benchmarks/results/2026-08-29-fixer-x3b-kodak24.csv`.
All 206 `prism_tests` pass (roundtrip + context determinism intact), confirming
encode/decode symmetry after the indexing fix.

- the Fixer
