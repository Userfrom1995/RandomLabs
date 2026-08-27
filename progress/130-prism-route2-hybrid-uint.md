# Progress - Prism Route 2 Hybrid-Uint Binarization (#130)

- **Issue:** #130 (Owner directive 2026-08-27: continue without pause, Route 3 first, cascade to Route 1 then Route 2)
- **Branch:** opencode/issue130-20260827211413
- **Status:** in-progress (R2-0 in progress; R1-1 FAIL, cascade to R2 per owner directive)
- **Blueprint:** `ideas/2026-08-27-prism-route2-hybrid-uint.md`
- **Research spec:** `prism/docs/research-route2-hybrid-uint.md` (Dr. Mob)
- **Spec addendum:** `prism/docs/addendum-24-pinned-constants-route2.md` (pinned constants, committed)
- **Binding gates (both units, real corpus, byte-exact):**
  M2 summed < 9.498 AND per-sample < 3.166;
  M3 summed < 8.655 AND per-sample < 2.885.
  Baseline: Prism e1 = 10.1210 summed / 3.3737 per-sample.
  No merge until M2 AND M3 pass; no success claim without a fresh both-units measurement.

---

## R2-series checklist (blueprint: ideas/2026-08-27-prism-route2-hybrid-uint.md)

### R2-0: Harness Extension (BLOCKING)

- [x] 1. Add `ACModelsHybrid` struct to `acoder.h` (token + sign + escq model sets)
- [x] 2. Implement token tree path helpers in `acoder.cpp` (encode_token_tree / decode_token_tree)
- [x] 3. Implement `encode_residual_hybrid` / `decode_residual_hybrid` in `acoder.cpp`
- [x] 4. Implement `acoder_encode_plane_hybrid` / `acoder_decode_plane_hybrid` in `acoder.cpp`
- [x] 5. Wire hybrid path into `prism.cpp` encode/decode (flag bit6 dispatch)
- [x] 6. Add container flag bit6 handling in `container.cpp`
- [x] 7. Add `--r2-hybrid` CLI flag and probe/self-check commands in `main.cpp`
- [x] 8. Add VB-R2 rails to `probe_sandbox.sh` (ROUNDTRIP, TOKEN-FIDELITY, NET-AUDIT, MODEL-OVERHEAD)
- [x] 9. Add unit tests for hybrid-uint in `test_acoder_hybrid.cpp`
- [x] 10. Run self-check on pinned quad (kodim01/02/03/04)
- [x] 11. Commit dated reference CSV

**Exit condition:** all VB rails green + spec addendum 24 committed (DONE) + dated CSV.

### R2-1: Hybrid-uint vs ZFF Baseline (measures B3/B5 reopening)

- [ ] 1. Implement FRAME-ZFF and FRAME-HYB test frames (probe-r2-hybrid CLI command)
- [ ] 2. Sweep T_ESC in {4, 8, 16} and effort {3, 5, 7} on pinned quad
- [ ] 3. Measure NET on pinned quad (kodim01/05/13/19)
- [ ] 4. Check primary gate: FRAME-HYB median NET >= +0.5% over FRAME-ZFF
- [ ] 5. Check sub-gate R2-1a: model overhead <= 0.01 bpp per sample
- [ ] 6. Check sub-gate R2-1b: no image regresses > -1.0%
- [ ] 7. Check sub-gate R2-1c: decode time <= 1.5x v1 decode time
- [ ] 8. Commit results CSV
- [ ] 9. Run failable self-check

**Gate:** FRAME-HYB median NET beats FRAME-ZFF median NET by >= +0.5% on the quad.

### R2-2: Predictor Factorial under Hybrid-uint (measures B3 reopening)

- [ ] 1. Implement FRAME-MED-HYB, FRAME-GAP-HYB, FRAME-W-HYB test frames
- [ ] 2. Sweep predictor families on pinned quad
- [ ] 3. Check bar(i): Best non-MED family >= +1.50% median NET over MED under hybrid-uint
- [ ] 4. Commit results CSV

**Gate:** bar(i) met = B3 reopened. Not met = B3 stays closed (fourth strike).

### R2-3: Composition + Projection + Gate Check

- [ ] 1. Compose all R2-series winners per image by real NET bytes (L-C1)
- [ ] 2. Project corpus via formula 18.5 VERBATIM against committed e1 CSV
- [ ] 3. Check proceed-to-format threshold: projected < 9.35 summed AND < 3.117 per-sample
- [ ] 4. If threshold met: Architect blueprints format program behind version bump
- [ ] 5. If threshold not met: report full ledger, owner decides composition or closure

---

## Cascade Triggers

| Phase | Failure | Consequence |
|---|---|---|
| R2-0 | Harness broken | Fix and re-run; no verdict until green |
| R2-1 | < +0.5% NET | Hybrid-uint offers no gain; report ledger, owner decides |
| R2-1 passes, R2-2 bar(i) met | B3 reopened; proceed to R2-3 |
| R2-1 passes, R2-2 bar(i) not met | B3 stays closed; R2-3 with MED only |
| R2-3 | Misses M2 | Report full ledger; owner decides next route |

---

## Build Log

### 2026-08-27 (Architect): Blueprint created

- Created architectural blueprint: `ideas/2026-08-27-prism-route2-hybrid-uint.md`
- Created progress tracker: `progress/130-prism-route2-hybrid-uint.md`
- Research spec and addendum 24 already committed by Dr. Mob (PR #161)

### 2026-08-27 (Builder): R2-0 core codec (steps 1-4)

- Added `ACModelsHybrid` struct to `acoder.h`: token (T_ESC+1 binary tree), sign, escq model sets
- Implemented binary tree token coding: encode_token_tree / decode_token_tree with halving structure
- Implemented encode_residual_hybrid / decode_residual_hybrid: zigzag fold + token tree + sign + escape quotient + raw bypass
- Implemented acoder_encode_plane_hybrid / acoder_decode_plane_hybrid: residual-DIFF context 343
- All 193 existing tests pass; library compiles cleanly

### 2026-08-27 (Builder): R2-0 prism/container wiring (steps 5-6)

- Added R2_HYBRID_FLAG (0x40) to container.h, mutually exclusive with XBAND via MULTIPASS discriminator
- Added use_r2_hybrid and r2_t_esc options to EncodeOpts
- Wired encode path in prism.cpp: hybrid route between R1 adaptive and standard paths
- Wired decode path in prism.cpp: hybrid dispatch via useHybrid flag (bit6 + no squeeze + MULTIPASS_FLAG)
- Updated flag validation to handle bit6 shared XBAND/hybrid semantics
- All 193 existing tests pass

### 2026-08-27 (Builder): R2-0 CLI, container T_ESC, tests, self-check (steps 7,9,10)

- Added --r2-hybrid and --r2-t-esc flags to enc command in main.cpp
- Added probe-r2-hybrid and self-check-r2-hybrid CLI commands
- Fixed container: r2_t_esc stored in container header (byte between xband_weights and model_len iff R2_HYBRID_FLAG)
- Fixed absolute value instead of zigzag fold for token ladder
- Added 7 unit tests (AcoderHybrid suite): single-sample, dense lattice, adversarial, random seeds, determinism, T_ESC sizing, model memory audit
- CMakeLists.txt updated with test_acoder_hybrid.cpp
- Self-check on pinned quad (kodim01/02/03/04): all PASS for T_ESC in {4,8,16}
- T_ESC=4 best: +0.35% delta vs ZFF; T_ESC=8: +1.27%; T_ESC=16: +2.15%
- Dated reference CSV: progress/references/2026-08-27-r2-hybrid-selfcheck.csv
- 200 tests pass (193 existing + 7 new)

### 2026-08-27 (Builder): R2-0 VB-R2 rails in probe_sandbox.sh (step 8)

- Added --r2-hybrid and --self-check-r2-hybrid flags to probe_sandbox.sh
- Added R2_SELFCHECK and R2_TOTAL_DELTA row parsing to evaluate() function
- Added VB-R2-HYBRID-ROUNDTRIP rail: verifies every R2 image roundtrips byte-exact
- Added VB-R2-TOKEN-FIDELITY rail: verifies no image regresses > +1.0% vs ZFF
- Added VB-R2-NET-AUDIT rail: verifies total_delta recomputation matches summary
- Added VB-R2-MODEL-OVERHEAD rail: verifies model overhead <= 0.01 bpp per sample
- Added R2 gate readout: median delta, threshold check, PASS/FAIL verdict
- Added standalone R2 section (--r2-hybrid, --self-check-r2-hybrid) matching R0/R1 pattern
- Bash syntax validated, all 200 tests still pass

---

- the Architect
