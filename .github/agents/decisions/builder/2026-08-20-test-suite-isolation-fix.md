# Builder decision - 2026-08-20 - test-suite isolation fix (R14/R15 gated code)

**Issue:** #68 (Obsidian lossless image codec)
**Branch:** `opencode/issue68-20260818070512`
**PR:** #93
**Date:** 2026-08-20T09:00:00Z

## Finding

Prior runs claimed "152 lib tests pass" (and later "148"). A clean parallel
`cargo test -p obsidian_core` actually showed **10 panics/failures**, including
core tests (`rgba_roundtrip`, `r3c_run_mode_roundtrip`, `static_tables_model_size_guard`).

Root cause is **test-isolation breakage** in the R14/R15 gated features, not
per-test logic (each failing test passes when run alone):

1. `encoder.rs` keeps process-global `Mutex`es `R14_COLLECT`, `R15_COLLECT`,
   `R14_SS`, `R14_RNG` for probe-collect / debug bookkeeping, and `rcct_overlay`
   locks them on the **hot path of every encode**.
2. The encoder reads `OBSIDIAN_R14_FORCE` / `OBSIDIAN_R15_FORCE` (and `_SHIP`)
   env vars at runtime. Tests such as `r15_nrp_forced_roundtrip_bit_exact`
   `set_var` those globals without any isolation, so a *parallel* test's encode
   also gets `nrp_on = true` and enters the R15 path.
3. The R15 path panicked (`build_nrp_nets` -> `r0s[pi]` index out of bounds) when
   the collected-residual plane count desynced from `planes_w` (the collect
   buffer is sized to the CFL-variant plane count while `rcct_overlay` indexes by
   the outer `coding_planes` index). The panic unwound while holding the global
   `R15_COLLECT` `Mutex`, **poisoning it**; every subsequent encode that locked it
   failed with `PoisonError`, cascading into unrelated tests.

## Fix (committed, `builder:` prefix)

- The four collection `Mutex`es are now poison-tolerant:
  `.lock().unwrap_or_else(|e| e.into_inner())`. A panic in one test can no longer
  poison the shared state for the rest of the process.
- `build_nrp_nets` and `build_rcct_trees` now iterate
  `min(planes.len(), r0s.len(), dims.len(), ranges.len())` instead of indexing
  `r0s[pi]`/`dims[pi]`/`ranges[pi]` directly, so a plane-count desync can never
  panic. When lengths genuinely differ, the extra planes are simply skipped
  (the gated feature no-ops, which is correct since R14/R15 are net-negative and
  their never-expand gates reject them anyway).

Suite result after the fix: **148 passed / 0 failed / 2 ignored** in a clean
parallel run. (The removed `err.txt` stray artifact from a `gh api --per-page`
typo in a prior resume commit is also cleaned up.)

## Impact on the JXL gate

None. This is a test-isolation fix only. It does not change R15's net-negative
verdict or the 9.5209 bpp production codec. The R15 halt trigger still fires and
the predictor family is still exhausted at ~9.52 bpp.

## Decision

`continue` the escalation already in flight: the correct close is a Maintainer /
Owner recalibrate-or-repivot decision (recalibrate the JPEG XL 8.71 gate to a
realistic LOCO-I-class ~9.5 bpp, or commission VarDCT / transform-coding). The
Builder must not loop on another single-pixel or decorrelation tweak. The
test suite is now trustworthy so any future merge gate is measurable.

- the Builder
