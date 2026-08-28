# Progress: Route 4 - Beyond-Predictive Paradigm (issue #130)

- **Branch:** `opencode/issue130-20260828063310`
- **Research:** `prism/docs/research-route4-beyond-predictive.md` (Dr. Mob)
- **Blueprint:** `ideas/2026-08-28-prism-route4-beyond-predictive.md`
- **Pinned constants:** `prism/docs/addendum-25-pinned-constants-route4.md`
- **Status:** in-progress
- **Current step:** X0 harness scaffolded and verified. Wavelet lift (Haar/5/3/9/7) + EBCOT bitplane coder + per-context rANS + WAVELET_FLAG container all round-trip losslessly; gtest rails green (206 tests pass). CLI `wavelet`/`dec`/`info` dispatch wired.
- **Next steps:** Proceed to X1 (wavelet decorrelation vs spatial residual sweep) once X0 rails are accepted by the Reviewer.

---

## Milestone Checklist

### X0: Harness Extension (BLOCKING)
- [x] Add `wavelet.h/.cpp`: Haar/5/3/9/7 reversible lift, border extension, subband layout
- [x] Add `bitplane_rans.h/.cpp`: 128-context binary rANS (LIFO-safe fixed prob, reuses rans.cpp core)
- [x] Add `bitplane.h/.cpp`: EBCOT 3-pass coder, parent-aware fixed context (I28), significance state
- [x] Add `wavelet_container.h/.cpp`: wavelet header serialize/parse + payload assembly
- [x] Modify `container.h`: `WAVELET_FLAG` (0x80) flag authority (parallel v1-envelope dispatch)
- [x] Modify `main.cpp` + `CMakeLists.txt`: `wavelet`/`dec`/`info` commands dispatch on WAVELET_FLAG
- [x] VB rail `VB-X-WAVELET-ROUNDTRIP`: encode->decode byte-exact (gtest X0Frame.*)
- [x] VB rail `VB-X-LIFT-FIDELITY`: `lift_inv(lift(x)) == x` for ALL integer inputs (I26) (gtest X0Wavelet.*)
- [x] VB rail `VB-X-ANS-FIDELITY`: rANS bit-exact per context (gtest X0Rans.Roundtrip)
- [x] VB rail `VB-X-NET-AUDIT`: NET = payload + header, zero model tables (frame_wavelet_encode reports net)
- [x] VB rail `VB-X-CONTEXT-DETERMINISM`: encoder/decoder context sequences identical (gtest X0Bitplane.ContextDeterminism)
- [ ] VB rail `VB-X-SELF-CHECK`: proves both verdict directions on pinned quad (deferred to Reviewer pass)
- [x] `addendum-25-pinned-constants-route4.md` already committed (pinned constants source)
- [ ] Dated reference CSV `2026-08-28-sandbox-x0.csv` (deferred; X1 sweep will emit it)
- [x] All X0 rails green (206 tests pass)

### X1: Wavelet Decorrelation vs Spatial Residual (N1)
- [ ] FRAME-SPATIAL vs FRAME-WAVELET under identical bitplane coder
- [ ] Gate: >= +2.0% median NET decorrelation on pinned quad
- [ ] Sub-gate: round-trip byte-exact
- [ ] Commit dated CSV `*-sandbox-x1.csv`

### X2: Bitplane Context vs v1 Baseline (N1+N2, M2 target)
- [ ] FRAME-WAVELET full parent-aware context vs e1 (10.1210 summed)
- [ ] Gate: >= +8.0% median NET vs e1
- [ ] X2a: mean summed < 9.498 AND mean per-sample < 3.166 (M2 both units, quad)
- [ ] X2b: overhead <= 0.002 bpp per sample
- [ ] X2c: no image regresses > -1.0% vs own e1 bytes
- [ ] X2d: decode time <= 3x v1
- [ ] Commit dated CSV `*-sandbox-x2.csv`

### X3: Learned/Augmented Context (N3, M3 target)
- [ ] X3b: enriched adaptive context (run-length, sig-gradient, grandparent); >= +1.5% over X2
- [ ] X3a: neural fixed CNN context IF owner authorizes training corpus; >= +1.5% over X3b
- [ ] If X3a gated out: record honestly per I30 (M2 PASS / M3 PENDING)
- [ ] Commit dated CSV `*-sandbox-x3.csv`

### X4: Composition + Binding Gate (M2 and M3, both units)
- [ ] Compose X-winners per image by real NET bytes (L-C1)
- [ ] Full Kodak-24 (sha-pinned) via `prism bench`
- [ ] `bench_gate.sh` dual-unit vs real cjxl (M3) + WebP (M2)
- [ ] If both clear: format-stable PR (v3 container); else open X5

### X5: Reserve (conditional)
- [ ] X5a: chroma-subband conditioned on luma-subband (N4); >= +1.0% median NET
- [ ] X5b: L up to 6 depth sweep; >= +1.0% median NET
- [ ] X5c: context pool 64/128/256 fixed; >= +1.0% median NET
- [ ] Third strike dies forever

---

## Notes
- v1 production path untouched except the single `WAVELET_FLAG` bit (I26, X0 requirement).
- All gates stated in BOTH units (summed and per-sample) per `bench_gate.sh`.
- No success claim leaves the lab without a fresh both-units measurement.

- the Architect
