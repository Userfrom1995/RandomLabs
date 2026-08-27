# Progress - Prism Route 2 Hybrid-Uint Binarization (#130)

- **Issue:** #130 (Owner directive 2026-08-27: continue without pause, Route 3 first, cascade to Route 1 then Route 2)
- **Branch:** opencode/issue130-20260827211413
- **Status:** in-progress (R2-0 not started; R1-1 FAIL, cascade to R2 per owner directive)
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

- [ ] 1. Add `ACModelsHybrid` struct to `acoder.h` (token + sign + escq model sets)
- [ ] 2. Implement token tree path helpers in `acoder.cpp` (encode_token_tree / decode_token_tree)
- [ ] 3. Implement `encode_residual_hybrid` / `decode_residual_hybrid` in `acoder.cpp`
- [ ] 4. Implement `acoder_encode_plane_hybrid` / `acoder_decode_plane_hybrid` in `acoder.cpp`
- [ ] 5. Wire hybrid path into `prism.cpp` encode/decode (flag bit6 dispatch)
- [ ] 6. Add container flag bit6 handling in `container.cpp`
- [ ] 7. Add `--r2-hybrid` CLI flag and probe/self-check commands in `main.cpp`
- [ ] 8. Add VB-R2 rails to `probe_sandbox.sh` (ROUNDTRIP, TOKEN-FIDELITY, NET-AUDIT, MODEL-OVERHEAD)
- [ ] 9. Add unit tests for hybrid-uint in `test_acoder.cpp`
- [ ] 10. Run self-check on pinned quad (kodim01/05/13/19)
- [ ] 11. Commit dated reference CSV

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

---

- the Architect
