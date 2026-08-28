# Progress - Prism Route 1 Adaptive Backend Refinement (#130)

- **Issue:** #130 (Owner directive 2026-08-27: continue without pause, Route 3 first, cascade to Route 1 then Route 2)
- **Branch:** opencode/issue130-route1-acoder-refinement
- **Status:** in-progress (R1-0 complete, R1-1 FAIL - cascade to R2/R3 per owner directive)
- **Blueprint:** `ideas/2026-08-27-prism-route1-acoder-refinement.md`
- **Research spec:** `prism/docs/research-route1-acoder-refinement.md` (Dr. Mob)
- **Binding gates (both units, real corpus, byte-exact):**
  M2 summed < 9.498 AND per-sample < 3.166;
  M3 summed < 8.655 AND per-sample < 2.885.
  Baseline: Prism e1 = 10.1210 summed / 3.3737 per-sample.
  No merge until M2 AND M3 pass; no success claim without a fresh both-units measurement.

---

## R1-series checklist (blueprint: ideas/2026-08-27-prism-route1-acoder-refinement.md)

### R1-0: Harness Extension (BLOCKING)

- [x] 1. Create new header file: `r1_encoder.h`
- [x] 2. Create new source file: `r1_encoder.cpp`
- [x] 3. Add file to `CMakeLists.txt` under `prism_core`
- [x] 4. Implement `R1Encoder::analyze()`: full v1 features + entropy-based MA-tree
- [x] 5. Implement `R1Encoder::code()`: adaptive coding using ACoderV2
- [x] 6. Implement `R1Encoder::decode()`: recomputes leaf IDs from MA-tree
- [x] 7. Write unit tests for R1 encoder
- [x] 8. VB-R1-ADAPTIVE-ROUNDTRIP: encode -> decode reproduces source byte-exact
- [x] 9. VB-R1-MA-TREE-FIDELITY: transmitted MA-tree decodes correctly
- [x] 10. VB-R1-NET-AUDIT: NET = payload + model overhead on every row
- [x] 11. VB-R1-SELF-CHECK: proves both verdict directions on pinned quad
- [x] 12. Wire `R1Encoder` into `prism.cpp` encode/decode path
- [x] 13. Add `--r1-adaptive` flag to CLI command
- [x] 14. Add `probe-r1-adaptive` and `self-check-r1-adaptive` commands
- [x] 15. Update `probe_sandbox.sh` with R1-adaptive phases
- [x] 16. Run self-check on pinned quad (24/24 PASS)
- [x] 17. Commit spec addendum 23 (ALL pinned constants)
- [x] 18. Commit dated reference CSV

**Exit condition:** all VB rails green + spec addendum 23 committed + dated CSV.

**R1-0 STATUS: COMPLETE** (2026-08-27 - all VB rails green, spec addendum 23 committed, dated CSV committed, probe_sandbox.sh updated with R1-adaptive phases)

### R1-1: Adaptive vs Adaptive Baseline (measures multi-pass benefit)

- [x] 1. Implement FRAME-V1 and FRAME-R1 test frames (probe-r1-adaptive CLI command)
- [x] 2. Sweep K in {16, 32, 64} and effort {3, 5, 7} on pinned quad (9 of 12 combos, K=128 timed out)
- [x] 3. Measure NET on pinned quad (kodim01/05/13/19)
- [x] 4. Check primary gate: FRAME-R1 median NET >= +0.5% over FRAME-V1 -> **FAIL** (best median +2.27% WORSE)
- [x] 5. Check sub-gate R1-1a: model overhead <= 0.005 bpp per sample -> **PASS** (avg 0.0006-0.0010 bpp)
- [x] 6. Check sub-gate R1-1b: no image regresses > -0.5% -> **FAIL** (all 4 images regress +1.3% to +3.3%)
- [x] 7. Check sub-gate R1-1c: decode time <= 1.5x v1 decode time -> **PASS** (ratio 1.06-1.08x)
- [x] 8. Commit results CSV (2026-08-27-r1-1-quad-sweep.csv)
- [x] 9. Run failable self-check (R1-1a, R1-1b, R1-1c all measured)

**Gate: FAIL.** R1-1 primary gate median_delta <= -0.5 not met (best +2.27%). R1-1b FAIL (all images regress). Cascade: multi-pass adaptive offers no gain over v1 single-pass. Per blueprint decision tree: report ledger, owner decides next route.

**Root cause:** R1 adaptive's MA-tree with K=16-128 leaf contexts provides fewer, less discriminative contexts than v1's 343-residual-diff contexts + 16 class priors. The per-leaf adaptive coding cannot compensate for the reduced context granularity, and the MA-tree model blob adds pure overhead (~0.001 bpp). The multi-pass structure itself is not the bottleneck; the context reduction is.

| K | effort | median_delta | worst_delta | avg_model_bpp | decode_ratio |
|---|--------|-------------|-------------|---------------|-------------|
| 16 | 3/5/7 | +2.267 | +3.283 | 0.00063 | 1.077 |
| 32 | 3/5/7 | +2.295 | +3.283 | 0.00093 | 1.077 |
| 64 | 3/5/7 | +2.298 | +3.283 | 0.00095 | 1.077 |

### R1-2: Entropy-based vs Variance-based MA-tree Splitting

- [x] SKIPPED - R1-1 FAIL closes the R1-series per cascade logic. No further R1-2/R1-3/R1-4/R1-5 phases execute.

### R1-3: ResDiff + sibling_class Features (conditional)

- [x] SKIPPED - R1-1 FAIL.

### R1-4: Pre-seeded Adaptive Coding (B1 attack, conditional)

- [x] SKIPPED - R1-1 FAIL.

### R1-5: Composition + Projection + Gate Check

- [x] SKIPPED - R1-1 FAIL.

---

## Cascade Triggers

| Phase | Failure | Consequence |
|---|---|---|
| R1-0 | Harness broken | Fix and re-run; no verdict until green |
| R1-1 | < +0.5% NET | Multi-pass adaptive offers no gain; report ledger, owner decides |
| R1-5 | Misses M2 | Report full ledger; owner decides next route |

---

## Build Log

### 2026-08-27 (Builder): R1-1 measurement - probe-r1-adaptive gate check

- Updated probe-r1-adaptive CLI command with R1-1 gates per spec addendum 23:
  - Primary gate threshold corrected from -5.0 to -0.5 (per blueprint)
  - Added decode timing instrumentation (R1-1c sub-gate)
  - Added per-image worst regression tracking (R1-1b sub-gate)
  - Added aggregate model overhead check (R1-1a sub-gate)
- Ran full K={16,32,64} x effort={3,5,7} sweep on pinned quad (kodim01/05/13/19)
- R1-1 RESULT: **FAIL** - primary gate median_delta=+2.27% (needs <= -0.5%)
- Sub-gates: R1-1a PASS (0.0006-0.001 bpp), R1-1b FAIL (all regress +1.3-3.3%), R1-1c PASS (1.06-1.08x)
- Root cause: K=16-128 MA-tree leaf contexts less discriminative than v1's 343 contexts + 16 class priors
- Cascades per blueprint: R1-2/R1-3/R1-4/R1-5 skipped, report ledger to owner for Route 2 decision
- Committed dated CSV: `prism/benchmarks/results/2026-08-27-r1-1-quad-sweep.csv`

### 2026-08-27 (Builder): R1-0 harness continue - doc fixes + probe_sandbox.sh + dated CSV

- Fixed Reviewer findings 2-4: stale Build Log pending note, ambiguous R1Encoder location, wire format vs MATreeR3::serialize
- Updated `probe_sandbox.sh` with R1-adaptive phases (`--r1-adaptive`, `--self-check-r1-adaptive`)
- Verified self-check-r1-adaptive PASS on pinned quad (4/4, 0.0009 bpp model overhead)
- Committed dated reference CSV: `prism/benchmarks/results/2026-08-27-sandbox-r1-adaptive.csv`
- R1-0 exit conditions: all VB rails green, spec addendum 23 committed, dated CSV committed, byte-exact roundtrip on pinned quad

### 2026-08-27 (Architect): Blueprint created

- Created architectural blueprint: `ideas/2026-08-27-prism-route1-acoder-refinement.md`
- Created progress tracker: `progress/130-prism-route1-acoder-refinement.md`
- Created spec addendum 23: `prism/docs/addendum-23-pinned-constants-route1.md` (pinned constants for R1-series, committed with blueprint)

---

- the Architect