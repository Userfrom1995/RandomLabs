# Progress - Prism Route 1 Adaptive Backend Refinement (#130)

- **Issue:** #130 (Owner directive 2026-08-27: continue without pause, Route 3 first, cascade to Route 1 then Route 2)
- **Branch:** opencode/issue130-route1-acoder-refinement
- **Status:** in-progress (R1-0 harness extension pending)
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

- [ ] 1. Create new header file: `r1_encoder.h`
- [ ] 2. Create new source file: `r1_encoder.cpp`
- [ ] 3. Add file to `CMakeLists.txt` under `prism_core`
- [ ] 4. Implement `R1Encoder::analyze()`: full v1 features + entropy-based MA-tree
- [ ] 5. Implement `R1Encoder::code()`: adaptive coding using ACoderV2
- [ ] 6. Implement `R1Encoder::decode()`: recomputes leaf IDs from MA-tree
- [ ] 7. Write unit tests for R1 encoder
- [ ] 8. VB-R1-ADAPTIVE-ROUNDTRIP: encode -> decode reproduces source byte-exact
- [ ] 9. VB-R1-MA-TREE-FIDELITY: transmitted MA-tree decodes correctly
- [ ] 10. VB-R1-NET-AUDIT: NET = payload + model overhead on every row
- [ ] 11. VB-R1-SELF-CHECK: proves both verdict directions on pinned quad
- [ ] 12. Wire `R1Encoder` into `prism.cpp` encode/decode path
- [ ] 13. Add `--r1-adaptive` flag to CLI command
- [ ] 14. Add `probe-r1-adaptive` and `self-check-r1-adaptive` commands
- [ ] 15. Update `probe_sandbox.sh` with R1-adaptive phases
- [ ] 16. Run self-check on pinned quad
- [ ] 17. Commit spec addendum 23 (ALL pinned constants)
- [ ] 18. Commit dated reference CSV

**Exit condition:** all VB rails green + spec addendum 23 committed + dated CSV.

**R1-0 STATUS: PENDING** (2026-08-27)

### R1-1: Adaptive vs Adaptive Baseline (measures multi-pass benefit)

- [ ] 1. Implement FRAME-V1 and FRAME-R1 test frames
- [ ] 2. Sweep K in {16, 32, 64, 128} and effort {3, 5, 7}
- [ ] 3. Measure NET on pinned quad
- [ ] 4. Check primary gate: FRAME-R1 median NET >= +0.5% over FRAME-V1
- [ ] 5. Check sub-gate R1-1a: model overhead <= 0.005 bpp per sample
- [ ] 6. Check sub-gate R1-1b: no image regresses > -0.5%
- [ ] 7. Check sub-gate R1-1c: decode time <= 1.5x v1 decode time
- [ ] 8. Commit results CSV
- [ ] 9. Run failable self-check

**Gate:** >= +0.5% NET improvement. **Fail:** multi-pass adaptive offers no gain.

### R1-2: Entropy-based vs Variance-based MA-tree Splitting

- [ ] 1. Sweep splitting criterion on winning K
- [ ] 2. Check gate: >= +0.3% NET improvement over R1-1 winner
- [ ] 3. Commit results CSV

**Gate:** >= +0.3% NET. **Fail:** use variance-based splitting.

### R1-3: ResDiff + sibling_class Features (conditional)

- [ ] 1. Add res_diff and sibling_class features to MA-tree
- [ ] 2. Check gate: >= +0.3% NET improvement over R1-2 winner
- [ ] 3. Commit results CSV

**Gate:** >= +0.3% NET. **Fail:** use QG+band_class+activity+position only.

### R1-4: Pre-seeded Adaptive Coding (B1 attack, conditional)

- [ ] 1. Measure pre-seeded adaptive coding vs cold-start
- [ ] 2. Check gate: >= +0.1% NET improvement
- [ ] 3. Commit results CSV

**Gate:** >= +0.1% NET. **Fail:** cold-start is sufficient.

### R1-5: Composition + Projection + Gate Check

- [ ] 1. Compose all R1-series winners per image by real NET bytes
- [ ] 2. Project corpus via formula 18.5 VERBATIM against committed e1 CSV
- [ ] 3. Check threshold: projected < 9.35 summed AND < 3.117 per-sample
- [ ] 4. If threshold met: blueprint format program behind version bump
- [ ] 5. Fresh dual-unit `bench_gate.sh` against REAL cjxl and WebP on full Kodak-24
- [ ] 6. Byte-exact 24/24. Fuzz clean.

**Threshold:** < 9.35 summed / < 3.117 per-sample (2% margin under M2).

---

## Cascade Triggers

| Phase | Failure | Consequence |
|---|---|---|
| R1-0 | Harness broken | Fix and re-run; no verdict until green |
| R1-1 | < +0.5% NET | Multi-pass adaptive offers no gain; report ledger, owner decides |
| R1-5 | Misses M2 | Report full ledger; owner decides next route |

---

## Build Log

### 2026-08-27 (Architect): Blueprint created

- Created architectural blueprint: `ideas/2026-08-27-prism-route1-acoder-refinement.md`
- Created progress tracker: `progress/130-prism-route1-acoder-refinement.md`
- Spec addendum 23 pending (will be created by Builder in R1-0)

---

- the Architect