# Progress: Prism #130 - Blend-0 Default Fix (issue #130)

- **Branch:** `opencode/issue130-20260903103047`
- **Status:** in-progress - default flipped to measured-best, quad verified, full-24 pending
- **Date:** 2026-09-03 (Builder run, `/oc build` trigger)
- **Precedent:** PR #262 finding: shipped 15-64-32-1 MLP prior HARMFUL at baked
  blend 0.6 (default-blend quad +1.12% vs floor, MED-residual spayload +35%).
  X6b floor 3.2175 per-sample / 9.6525 summed (2026-08-29-x6b-kodak24.csv).
  M2 gap from floor: 1.63%. M3 gap: 11.53%.

## This run (Builder, 2026-09-03)

1. Oriented to issue #130. Branch `opencode/issue130-20260903103047` == origin/main
   `7b00e55` (restructure-validation HEAD, 261/261, floor bit-identical).
2. Built from source (cmake Release): clean, `prism` + `prism_tests` link.
3. Reproduced PR #262's blend-0 quad on pinned quad (kodim01/05/13/19),
   `bench-x --residual --blend 0`:
   - kodim01 506343 (floor 506365, -22B), kodim05 529625 (+88B),
     kodim13 580975 (+39B), kodim19 483221 (+415B).
   - Quad mean 3.56066 vs floor quad mean 3.55978: **+0.025%** - floor recovered.
   - Residual blend-0 > 0 difference is real and expected: at blend=0 the mix
     keeps MLP weight (1-alpha) on cold contexts (learned_ctx.h:198).
4. Root fix (not a flag workaround): flipped baked default
   `LBlend 0.6 -> 0.0` in `prism/src/codec/learned_ctx_data.inc` with provenance
   comment. Blast radius checked: LearnedModel is used only in wavelet/bitplane
   paths (bitplane.cpp, wavelet_container.cpp) - production spatial e7 path
   untouched; no golden `.prism` fixtures in tests; no test pins the blend.
   Old `.prism` wavelet files decode with the new default only if encoder and
   decoder share the build (blend is process-global, not transmitted) - noted
   for Reviewer.
5. Rebuilt clean; targeted suite `Blend.*:R6B.*:Wavelet*:*Learned*` **11/11 PASS**.
6. Launched default-blend quad (no `--blend` flag) to prove the new default is
   byte-identical to the blend-0 quad.

## Next steps (continuation)

- [ ] Default-quad byte-compare vs blend-0 quad (running this run; if mismatch, stop and diagnose)
- [ ] Full-24 `bench-x --residual` with default blend (~90 min single-thread;
      recommend 3-way sharded run across cores) vs floor 3.2175/9.6525
- [ ] Commit durable CSV + gate check; gates M2/M3 still FAIL (no success claim)
- [ ] Then: floor is restored as default; remaining M2 gap 1.63% needs a new
      mechanism (none identified; escalation options (a)/(b)/(c) stand)

## Honest state (dual units)

- M2: summed < 9.498 AND per-sample < 3.166 (vs real WebP m6 3.166)
- M3: summed < 8.655 AND per-sample < 2.885 (vs real cjxl -d0 -e9 2.885)
- This change recovers the floor under the default config; it does NOT advance
  past the floor. `Refs #130` (never `Closes #130` while gates FAIL).

- the Builder
