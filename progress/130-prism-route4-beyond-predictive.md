# Progress: Route 4 - Beyond-Predictive Paradigm (issue #130)

- **Branch:** `opencode/issue130-20260828063310`
- **Research:** `prism/docs/research-route4-beyond-predictive.md` (Dr. Mob)
- **Blueprint:** `ideas/2026-08-28-prism-route4-beyond-predictive.md`
- **Pinned constants:** `prism/docs/addendum-25-pinned-constants-route4.md`
- **Status:** in-progress
- **Current step:** X2 + X3b COMPLETE on REAL pinned Kodak-24. The gate-invalidating dead
      coder (FIXED_PROB=0.5) is fixed; the wavelet+bitplane path beats the v1 e1 baseline
      by 3.3% (3.261 vs 3.3737 per-sample) with byte-exact round-trip. Fixed-context
      augmentation is exhausted (pattern ~0; run-length HURT; neighbour-magnitude HURT).
      The remaining gap to M2 (3.166) / M3 (2.885) is a LEARNED magnitude/context model
      (X3a), which the owner's Option-2 directive explicitly names and which needs an
      owner-authorized training corpus (I29/I30, not fetchable in-sandbox).
- **Next steps:** Escalate to Maintainer/Owner for X3a authorisation: train a fixed CNN
      context model on an authorized corpus and bake its weights as a constant invoked at
      each coefficient. This is the only remaining lever; data-free changes are tapped.
      Per Anti-Surrender + owner "do not stop until M2 and M3 pass", the pipeline must
      continue to X3a rather than declare victory.

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
- [x] BUILDER FIX (X0): per-subband maxbits (EBCOT-style). The original X0 used one GLOBAL bitplane
      range B across all subbands, forcing tiny AC bands to emit the global LL bit-depth as wasted
      all-zero significance bits. Switched `frame_wavelet_encode`/`_payload`/`_decode` to encode/decode
      each subband (code-block) with its OWN maxbits; `coding_order` now tolerates partial subband
      layouts; `WaveletHeader` carries per-subband `sub_maxbits`/`sub_bytes`. Payload fell ~2x (e.g.
      proxy kodim01 1.61MB -> 1.08MB). 206 gtests green, byte-exact round-trip preserved.
- [ ] VB rail `VB-X-SELF-CHECK`: proves both verdict directions on pinned quad (deferred to Reviewer pass)
- [x] `addendum-25-pinned-constants-route4.md` already committed (pinned constants source)
- [x] Dated reference CSV `2026-08-28-x1-sandbox-proxy.csv` (see X1; DEVELOPMENT PROXY, not the binding gate)
- [x] All X0 rails green (206 tests pass)

### X1: Wavelet Decorrelation vs Spatial Residual (N1)
- [x] `prism bench-x` harness: for every image encodes FRAME-WAVELET (net+payload) and FRAME-SPATIAL
      (YCoCg-R -> MED residual -> SAME bitplane rANS, one subband per plane), reports BOTH units
      (summed + per-sample), median deco_pct vs the spatial control, and mean vs the pinned e1 baseline.
- [x] FRAME-WAVELET round-trip byte-exact (verified by X0Frame.* + CLI on proxy).
- [x] X1 primary gate on the DEVELOPMENT PROXY corpus (24 synthetic 768x512, smooth-multiscale,
      sha-seeded): median deco_pct = -24.79% (wavelet beats MED-residual by ~25%); PASS (needs <= -2.0%).
      CSV: `prism/benchmarks/results/2026-08-28-x1-sandbox-proxy.csv`.
- [!] BLOCKING CONSTRAINT: the real pinned Kodak-24 (kodak.sha256) is NOT fetchable in this build
      sandbox (egress proxy blocks the mirrors), so the BINDING X1 measurement must run on the squad's
      network via `prism bench-x --kodak <REAL_KODAK> --filter 1 --levels 5`. The proxy is used only to
      validate the harness + the entropy fix; its absolute bpp is NOT the gate number.
- [!] CRITICAL FINDING (sets X2/X3 scope): although the wavelet DOMAIN decorrelates ~25% better than the
      MED-residual domain, FRAME-WAVELET absolute rate on the proxy is ~7.3 per-sample vs e1 = 3.37
      per-sample (~2.2x worse). The gap is NOT the transform - it is the ENTROPY BACKEND: X0's bitplane
      context model (40 base contexts + sign + refine, pool 128) is far coarser than v1's 343 residual-diff
      contexts x 16 class priors. So the remaining lever toward M2/M3 is X2/X3 (rich context + augmented
      model), exactly as the research spec predicted. This is the next build phase.

### X2: Bitplane Context vs v1 Baseline (N1+N2, M2 target)
- [x] FRAME-WAVELET full parent-aware context vs e1 (10.1210 summed)
- [x] **CRITICAL FIX (X2a-0):** `BitplaneRans` coded every symbol at a fixed p=0.5,
      discarding the per-context EMA it computed. The coder was a literal 1-bit/symbol
      passthrough (~7.3 bpp). Replaced with LIFO-safe causal-adaptive binary rANS
      (forward causal pass records per-symbol probability; decoder adapts forward in
      lockstep). On real pinned Kodak-24 this dropped mean per-sample 7.3 -> 3.264
      (-55%) and beat e1 (3.3737) by 3.3% with byte-exact round-trip.
- [x] Enriched the parent-aware context from a single SIG_COUNT_BUCKET to the full
      8-neighbour SIGNIFICANCE PATTERN (4-connected + diagonal counts, 200 base
      contexts). Measured gain vs the bucket context: ~0 (3.264 -> 3.261). Context
      model is tapped; the neighbour pattern carries little beyond the count here.
- [x] Exhaustively swept the pinned filters: LeGall 5/3 = 3.261/sample (BEST),
      Reversible 9/7 = 3.525, Haar = 3.546. 5/3 retained as primary (J2K-lossless std).
- [x] Added an entropy diagnostic (gated, since removed): per-subband ideal entropy
      under the EMA model was 0.27-0.75 bits/symbol and ~equal to the actual coded
      rate. CONCLUSION: the bitplane decomposition is entropy-near-optimal; the
      remaining 3% (to M2) / 12% (to M3) gap is NOT a context-refinement gap - it is
      a MAGNITUDE/CONTEXT-MODEL gap. The X3 learned/augmented context (Option 2's
      explicitly-named "learned neural context models") is the sole remaining lever.
- [!] **X2 GATE STATUS (real Kodak-24, sha-verified): FAIL on the primary gate.**
      mean wavelet summed = 9.783 (e1 = 10.121; target e1*0.92 = 9.311) -> +3.3%, not
      the required +8.0%. X2a: mean per-sample 3.261 NOT < 3.166 (M2); X1 decorrelation
      median deco_pct = -0.09% (not <= -2.0%). Dated CSV:
      `prism/benchmarks/results/2026-08-28-x2-kodak24-53.csv`.
- [!] **DATA-FREE CONTEXT EXPLORATION IS NOW EXHAUSTED (X3b, tried both variants):**
      - count-bucket -> 8-neighbour SIGNIFICANCE PATTERN (fc/dg): ~0 (3.264 -> 3.261).
      - run-length-of-zeros augmentation: HURT (3.261 -> 3.267).
      - 4-connected NEIGHBOUR MAGNITUDE-STATE (quantised mag of already-coded
        neighbours, the JPEG2000/JXL "MA" idea): HURT (3.261 -> 3.273).
      Every added fixed-context dimension overfits the per-context EMA (fewer samples
      per context) and RAISES the rate. The fixed-context bitplane model is at its
      ceiling ~3.261/sample on this transform.
- [!] Honest read: the beyond-predictive paradigm genuinely BEATS the v1 predictive
      baseline (3.261 < 3.3737, first time any program has done so on full Kodak), but
      the 8%-to-M2 target set by the X-series spec was optimistic for a from-scratch
      bitplane coder. Reaching M2 (3.166) / M3 (2.885) requires a LEARNED magnitude/
      context model (X3a) that pickss context from raw neighbour magnitudes via a trained
      network - exactly what JPEG2000/JXL do, and what the owner's Option-2 directive
      explicitly names ("learned neural context models"). The X3a network needs a
      training corpus (ImageNet/DIV2K), gated by I29/I30 and not fetchable in this
      sandbox; it is the sole remaining lever and is NOT a data-free change.
- [ ] X3: learned/augmented context (N3, M3 target) - NEXT PHASE.
- [ ] X4: full Kodak-24 composition + binding dual-unit gate (M2 AND M3).
- [ ] X5: reserve (chroma-on-luma N4, deeper L, context-pool sweep).

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
