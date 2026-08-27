# Progress - Prism Route 3 Modular Redesign (#130)

- **Issue:** #130 (Owner directive 2026-08-27: Route 3 first, cascade to Route 1
  then Route 2)
- **Branch:** opencode/issue130-route3-modular-redesign
- **Status:** in-progress (R0 harness extension)
- **Blueprint:** `ideas/2026-08-27-prism-route3-modular-redesign.md`
- **Research spec:** `prism/docs/research-route3-modular-redesign.md` (Dr. Mob)
- **Binding gates (both units, real corpus, byte-exact):**
  M2 summed < 9.498 AND per-sample < 3.166;
  M3 summed < 8.655 AND per-sample < 2.885.
  Baseline: Prism e1 = 10.1210 summed / 3.3737 per-sample.
  No merge until M2 AND M3 pass; no success claim without a fresh both-units
  measurement.

---

## R-series checklist (blueprint: ideas/2026-08-27-prism-route3-modular-redesign.md)

### R0: Harness Extension (BLOCKING)

- [ ] 1. Create new header files: `multipass.h`, `ans_static.h`, `hybrid_uint.h`, `histogram.h`
- [ ] 2. Create new source files: `multipass.cpp`, `ans_static.cpp`, `hybrid_uint.cpp`, `histogram.cpp`
- [ ] 3. Add files to `CMakeLists.txt` under `prism_core`
- [ ] 4. Implement `Histogram` class: accumulator, smoothing, normalization
- [ ] 5. Implement `HybridUintProfile`: tokenize/detokenize
- [ ] 6. Implement `ANSStaticModel`: build_from_histograms, encode, decode
- [ ] 7. Implement `MultiPassEncoder::analyze()`: MA-tree + cluster assignment
- [ ] 8. Implement `MultiPassEncoder::code()`: ANS coding with per-cluster tables
- [ ] 9. Implement `HistogramSerializer`: serialize/deserialize
- [ ] 10. Write unit tests for each new module
- [ ] 11. VB-MULTI-PASS-ROUNDTRIP: encode -> decode -> byte-exact
- [ ] 12. VB-HISTOGRAM-FIDELITY: serialize -> deserialize -> compare
- [ ] 13. VB-ANS-FIDELITY: encode -> decode -> bit-exact
- [ ] 14. VB-NET-AUDIT: NET = payload + model overhead on every row
- [ ] 15. VB-SELF-CHECK: prove both verdict directions on pinned quad
- [ ] 16. Wire `MultiPassEncoder` into `prism.cpp` encode/decode path
- [ ] 17. Add `--r0` through `--r5` commands to `main.cpp`
- [ ] 18. Update `probe_sandbox.sh` with R-series phases
- [ ] 19. Run self-check on pinned quad
- [ ] 20. Commit spec addendum 22 (ALL pinned constants)
- [ ] 21. Commit dated reference CSV

**Exit condition:** all VB rails green + spec addendum 22 committed + dated CSV.

### R1: Multi-pass vs Single-pass Baseline (attacks B1)

- [ ] 1. Implement FRAME-SINGLE and FRAME-MULTI test frames
- [ ] 2. Sweep K in {16, 32, 64, 128} and effort {3, 5, 7}
- [ ] 3. Measure NET on pinned quad
- [ ] 4. Check primary gate: FRAME-MULTI median NET >= +5.0% over FRAME-SINGLE
- [ ] 5. Check sub-gate R1a: payload reduction >= +3.0%
- [ ] 6. Check sub-gate R1b: model overhead <= 0.02 bpp per sample
- [ ] 7. Check sub-gate R1c: no image regresses > -1.0%
- [ ] 8. Commit results CSV
- [ ] 9. Run failable self-check

**Gate:** >= +5.0% NET improvement. **Fail:** cascade to Route 1.

### R2: MA-Tree Parameter Optimization

- [ ] 1. Sweep tree depth: {5, 7, 10, 12}
- [ ] 2. Sweep min samples per leaf: {2048, 4096, 8192}
- [ ] 3. Sweep feature set: {QG+activity, QG+activity+position, full}
- [ ] 4. Check gate: >= +0.5% NET improvement over R1 winner
- [ ] 5. Commit results CSV

**Gate:** >= +0.5% NET. **Fail:** use R1 winner parameters.

### R3: Predictor-Tokenization Factorial (attacks B3+B5)

- [ ] 1. Factorial: {MED, GAP, W} x {hybrid-uint, ZFF}
- [ ] 2. Score NET on pinned quad
- [ ] 3. Check bar (i): best non-MED >= +1.50% over MED
- [ ] 4. Check bar (ii): tokenization main effect recorded
- [ ] 5. Commit results CSV

### R4: Composition + Projection + Gate Check

- [ ] 1. Compose all R-series winners per image by real NET bytes
- [ ] 2. Project corpus via formula 18.5 against e1 CSV
- [ ] 3. Check threshold: projected < 9.35 summed AND < 3.117 per-sample
- [ ] 4. If threshold met: blueprint format program
- [ ] 5. If R4 passes M2 but not M3: open R5

**Threshold:** < 9.35 summed / < 3.117 per-sample (2% margin under M2).

### R5: Reserve (conditional)

- [ ] R5a: cross-band prediction (>= +1.0% NET)
- [ ] R5b: extended predictor bank (>= +1.0% NET)
- [ ] R5c: larger alphabet tokens (>= +1.0% NET)
- [ ] Recompose and project

**Only triggered if R4 projects inside M3 reach but short of it.**

---

## Cascade Triggers

| Phase | Failure | Consequence |
|---|---|---|
| R0 | Harness broken | Fix and re-run; no verdict until green |
| R1 | < +5.0% NET | Route 3 architecturally infeasible; cascade to Route 1 |
| R4 | Misses M2 | Report with full ledger; owner decides Route 1 or closure |
| R4 | Passes M2 but not M3 | Open R5 reserve; if R5 fails, owner decides |
| R5 | Fails all sub-phases | Full negative ledger; honest closure |

---

## Current step: Ready for R0 implementation

## Next steps: Builder to scaffold new module files and implement R0 harness extension per blueprint phases 1-3

---

- the Architect
