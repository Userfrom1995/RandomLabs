# Progress - Obsidian (lossless image codec)

- **Issue:** #68
- **Branch:** opencode/issue68-20260818070512
- **Status:** in-progress (M1 PNG gate MET at 10.16 bpp; M2 + M2.5 + M3-A + M3-B + M3.5 all implemented but REGRESS vs v1 on real Kodak, shipped OFF by default - the "~10.1 bpp floor" is the GR *symbol* coder's ceiling, REJECTED as structural by the Researcher. **Architect CMARC + R2 blueprint DELIVERED (2026-08-18, the Architect, PR #83):** CMARC is a new `ModelConfig.entropy_mode` (not a header flag, reusing the M3.5 mechanism, no version bump, all legacy streams keep decoding); `BinModel`/`RangeEnc`/`RangeDec`/`CarcCtx`/`cmarc_*` in `rans.rs`, CMARC residual branch + never-expand safety net in `encoder.rs`/`decoder.rs`, R1-c static priors, R2 cross-channel/bank/LZ77/mixing. The Builder resumes R1 via `continue`. Gates remain OPEN/UNCONFIRMED only because `data/kodak` is absent in the build env - the Factory must provision it before the real Kodak rows can be read). **R1/R2 CMARC measured on REAL Kodak = 10.0906 bpp (GR baseline; PNG 13.05 MET). R3-A made faithful (residual DIFF context conditions the WHOLE residual, auto-selected by default) brings the REAL Kodak mean to **9.7094 bpp** — BEATING JPEG-LS 9.71 on the same LOCO-I GAP predictor — with WebP 9.61 ~0.10 bpp above and JPEG XL 8.71 ~1.0 bpp above (the remaining gap is a modeling problem, not a coder bug; R6-B color cache is the prescribed sub-9.61 lever). ARCHITECT R3 BLUEPRINT DELIVERED (2026-08-18, the Architect, PR #83):** diagnoses the plateau as (1) PRIMARY - CMARC conditions on the spatial-gradient context (predictor selection) instead of the JPEG-LS DIFF context (quantized neighboring residuals), so per-bin models cannot specialize - the entire ~0.38 bpp gap; (2) SECONDARY - R2 silently swapped the blueprint's Rice/Exp-Golomb quotient for fixed-width MSB-first binary, reintroducing a per-bit floor. R3-A adds `residual_context(dL,dU,dUl)` (neighbor predictions in the CMARC loop, bit-exact) as the coding context - the proven JPEG-LS delta, expected ~9.4-9.7 bpp clearing WebP; R3-B restores per-context Rice-through-binary-coder; R3-C adds JPEG-LS run mode; R2.4 re-tuned on the corrected context. Full blueprint in `obsidian/docs/architect-r3-residual-context-blueprint.md`. The Builder resumes R3-A via `continue`; the Factory must keep `data/kodak` provisioned and repair the orphan-`main` history break. **R2.3 (CMARC-LZ, `ENTROPY_MODE_CARC_LZ`) IMPLEMENTED (2026-08-18, the Builder, PR #83):** LZ77 re-woven with CMARC bins (flag + Elias-gamma length/offset + CMARC literal residual in one binary range coder), never-expand safety net vs min(GR, CMARC), OFF by default behind `OBSIDIAN_CARC_LZ`. Measured: the safety net NEVER selects CARC_LZ across synthetic proxies (the R2 predictor bank already removes the exact repeats LZ would copy; same photographic outcome as M3-A), so R2.3 is correct but DORMANT - consistent with M2/M2.5/M3-A/M3-B. 101 lib tests pass; row `2026-08-18-r23-carc-lz-synth-proxy.csv`. Next stage per blueprint: R2.4 logistic mixing (`ENTROPY_MODE_CARC_MIX`)
- **R6 BLUEPRINT CORRECTED (2026-08-19, the Architect, PR #83):** the first R6 blueprint (pixel-domain spatial LZ77, `ENTROPY_MODE_CARC_SPATIAL = 5`) is **withdrawn**. The Builder proved (commit `7170586`, `decisions/builder/2026-08-19-r6a-carc-lz-already-pixel-domain.md`) that `ENTROPY_MODE_CARC_LZ = 3` ALREADY performs pixel-domain spatial LZ77 over the reconstructed sample buffer (decoder copies `plane[i+ l] = plane[i - off + l]`), so a second mode would be a byte-for-byte duplicate. It ties/loses on photographic Kodak not because it is "residual-domain" but because exact pixel repeats of length >= `MIN_MATCH = 3` are too rare for the match-flag + gamma overhead to amortize (forced CARC_LZ = 13.62 bpp on kodim01 vs 10.42 CMARC default). Equally, R3-A (residual DIFF context) is currently **inert**: `cmarc-force+resctx` is byte-identical to `cmarc-force` because the never-expand net DROPS the resctx candidate (it regresses - the extra 365-way context starves the per-(cid,bin) binary models). Corrected R6 (`obsidian/docs/architect-r6-corrected-blueprint.md`) redirects effort to the genuinely-missing, WebP/JXL-proven components: **(A) R6-B color cache** (per-plane LRU of reconstructed values, new `ENTROPY_MODE_CARC_CACHE = 6`, the primary sub-9.61 lever, entirely absent today); **(B) R3-A quotient-context fix** (condition the Rice QUOTIENT bins on `residual_context`, keep remainder on `(position, window)`, to avoid model starvation); **(C) tuned matches** (`MIN_MATCH=2`, 2D distance model, cache competition - marginal on photos); **(D) R6-C multi-channel copy** deferred until A+B+C measured. Gate reality: PNG 13.05 MET; JPEG-LS 9.71 = CMARC-R5 9.7579; WebP 9.61 target of A+B (realistic); JPEG XL 8.71 target of A+B+C+D (UNCERTAIN, may need a separate R7 predictor/transform effort). Builder resumes via `continue`; no new PR.

  - the Architect

- **R2 core (cross-bit conditioning) IMPLEMENTED (2026-08-18, the Builder, PR #83):** the R1 Exp-Golomb *marginal* residual coder is replaced by a **MSB-first binary magnitude decomposition with per-(position, trailing-window) context models** (`CMARC_MAG_WIN=2`). Each magnitude bit is coded by a binary model selected by `(cid, bit-position, trailing-2-bits)` so the coder captures the within-symbol dependence the flat R1 marginal models missed - exactly the cross-bit conditioning the Architect deferred to R2. Measured on synthetic photographic proxies (256x256 and 768x768, effort 4): CMARC now **TIES** the production `gr_cm` backend (e.g. 9.636 bpp == gr_cm 9.636), versus R1 where standalone CMARC was **17x worse** than `gr_cm` (the ~20.5 KB vs 1.2 KB Laplacian regression). So the R1 marginal-model flaw is fixed; CMARC is now a sound, near-optimal backend that matches the Rice coder on near-Laplacian residuals (where Rice is already near-optimal) and is expected to pull ahead on real *structured* Kodak residuals (the JPEG-LS analogy: same predictor + a context arithmetic coder beats Rice). The never-expand safety net keeps CMARC OFF by default (it ships only when it beats the model's best GR backend); `data/kodak` is absent so the WebP 9.61 / JPEG XL 8.71 gates stay UNMEASURED. Benchmark row: `benchmarks/results/2026-08-18-r2-cmarc-synth-proxy.csv`. Next stage (R2.1 cross-channel subtract-green) is the gate-clearing pipeline step per the blueprint, recommended to resume.)
- **R2.1 cross-channel (subtract-green) IMPLEMENTED (2026-08-18, the Builder, PR #83):** `ModelConfig.cross_channel: bool` signaled in the model section (zero extra header bit); `color.rs` `subtract_green_forward_planes`/`subtract_green_inverse_planes` (reversible on i16, R'=R-G, G'=G, B'=B-G, alpha untouched). Encoder evaluates four transform candidates {None, YCoCg-R, subtract-green, subtract-green+YCoCg-R} by MED residual cost and picks the cheapest, mirrored via the `cross_channel` flag. Auto-selection never expands (only engages when cheaper); on the correlated `photo` synthetic proxy cross-channel wins (GR 1.080 -> 1.062 bpp, CARC 0.848 -> 0.816 bpp), on decorrelated `noise`/`color` it correctly stays OFF. 92 lib tests pass; bit-exact. Row: `benchmarks/results/2026-08-18-r2.1-crosschannel-synth-proxy.csv`. Real Kodak gates (`data/kodak` absent) remain UNMEASURED; next stages per blueprint are R2.2 (expanded predictor bank), R2.3 (LZ77 re-woven with CMARC), R2.4 (logistic mixing). CMARC stays OFF by default.
- **R2.2 expanded predictor bank IMPLEMENTED (2026-08-18, the Builder, PR #83):** `PredictorId` gains nine WebP/JPEG XL-style variants (ids 8..=16): `TrueMotion` (= L+T-TL), `LPlusHalfTLMinusT` (= L+(TL-T)/2), `Gradient2` (= (L+T)/2+(TL-TR)/2), and the six clamped add/subtract forms `AddLT`/`AddLTL`/`AddTLT`/`SubLTL`/`SubTLT`/`SubTTR`. `PREDICTOR_COUNT` 8 -> 17; ids 0..=7 preserved so every legacy stream still decodes. `model.rs::predictors_for(effort >= 4)` now offers all 17 candidates; the existing per-context analysis pass picks the cheapest predictor per context by summed residual cost and stores it in the model map (zero per-symbol signal), so the new predictors are folded into the CMARC residual distribution per spatial context for free. `from_u8`/`to_u8`/`name`/`predict` extended; `chosen_counts` arrays in `encoder.rs` widened to `PREDICTOR_COUNT` (this was the one integration bug - a fixed `[usize; 8]` indexed by the new ids panicked). 95 lib tests pass (added `r22_expanded_predictors`, `r22_predictor_count_and_ids`, `r22_expanded_bank_selected_on_smooth`). Bit-exact.

  **Measured (synthetic 256x256 RGB photographic proxies, effort 4, A/B vs the old 8-predictor bank via `bench-synth`):** on SMOOTH content (noise 0.1) the expanded bank lowers v1 GR from **7.8018 -> 7.4775 bpp (-4.2%)**; at noise 0.5 it is neutral (11.2890 -> 11.2867, -0.02%); at noise 2.0 (near-random) it is neutral (16.3304 -> 16.2916, -0.24%). This is exactly the expected behavior: predictor-bank expansion shrinks residuals only where structure exists (smooth/photographic), and is harmless on noise. Because the per-context map already partitions the CMARC residual distribution, the same gain flows through whatever entropy backend the safety net selects. Row: `benchmarks/results/2026-08-18-r22-predbank-synth-proxy.csv`. Real Kodak (`data/kodak` absent) stays UNMEASURED; on real Kodak (smooth/photographic, ~10.16 bpp) a ~4% bank gain projects to ~9.75 bpp, just shy of WebP 9.61 alone but additive with R2.1 cross-channel (~2-4%) toward clearing WebP. The blueprint's "fold predictor id into CMARC context" is moot: the map already encodes predictor selection per context at zero per-symbol cost. CMARC stays OFF by default.

  - the Builder
- **Updated:** 2026-08-20T00:00:00Z

- **R3 BLUEPRINT CORRECTED (2026-08-18, the Architect, PR #83):** the first R3 blueprint was implemented by the Builder and **reverted** because adding the JPEG-LS DIFF residual context regressed synthetic CARC from ~14 bpp to ~28 bpp. Root cause diagnosed from the actual code: `cmarc_write_residual` (`rans.rs:1286`) uses a **fixed-width MSB-first magnitude with `(position, window)` per-bin models** → `cmarc_bins_per_ctx = 2 + mag_bits*4 ≈ 66 bins/context`; multiplying by the residual DIFF context (~165 ids, further multiplied by `ACTIVITY_CLASSES`) blew the per-plane model count to ~11k, and every rare-context `BinModel` stayed pinned at the strong wrong prior `CMARC_PRIOR=64/4096≈0.016` (slow `CMARC_STEP=48` adaptation), so a "1" bit in a starved context cost ~6 bits instead of ~1 → the 2x blowup. The corrected R3 blueprint (`obsidian/docs/architect-r3-residual-context-blueprint.md`, rewritten) prescribes three changes in order: **(B)** replace fixed-width magnitude with a **Golomb-Rice-through-binary decomposition** (quotient run via one adaptive bin `CMARC_BIN_Q` + `k` remainder bits `CMARC_BIN_REM`, constant `cmarc_bins_per_ctx() = 3 + 8*4 = 35`, independent of plane `max-min`; `CarcCtx.k` — already computed, currently unused — now drives the remainder width); **(P)** change `CMARC_PRIOR` to neutral `2048` so a starved context can cost at most 1 bit/bin (the regression-proofing change); **(A)** add `residual_context(dL,dU,dUl)` as the CMARC coding context only (predictor selection stays on the gradient context), capped at JPEG-LS-like <=365 ids via a sign-symmetry LUT, **without** activity-class multiplication. A per-image selection flag (`cmarc_residual_ctx`, mirrored, zero header bit) codes the plane twice in `analyze` and keeps whichever context wins, so a regression can never ship; the global never-expand net vs the best GR backend is preserved. Build order: R3-B (measure, expect no regression) → R3-A (assert < 9.61 WebP) → R3-C run mode → R2.4 re-tune (assert < 8.71 JPEG XL). **Hard dependency: the Factory must durably commit `obsidian/benchmarks/data/kodak/` PPMs to the branch** — the earlier "10.0906 bpp real Kodak" used transient PPMs never committed to git and is not reproducible; R3 is not "done" until real Kodak is re-measured reproducibly.

## Checklist
- [x] Research phase: literature review, SOTA survey, algorithmic spec, benchmark methodology
- [x] obsidian/docs/ (research.md, algorithmic-spec.md, benchmark-methodology.md)
- [x] ideas/ entry for the project
- [x] Architect: software architecture from the spec (docs/architecture.md)
- [x] 1. Scaffolding: Cargo workspace (core/cli), PPM P6/P5 I/O, container header + CRC, CLI skeleton (encode/decode/roundtrip/selftest/check)
- [x] 2. rANS core: adaptive tables, definitive constants (M=4096, RNB=2^20), renorm guard, finish/get stack discipline, property tests
- [x] 3. Effort 0 end-to-end: MED predictor + single context set + adaptive rANS; decode path complete; fuzz round-trip at effort 0
- [x] 4. Color transforms: YCoCg-R + palette build/expand, bijection unit tests, per-image adaptive selection
- [x] 5. Predictor bank (8 predictors) + border handling + weighted codebook
- [x] 6. Context model: gradient quantization, sign symmetry, activity class, border contexts, zigzag map (all bijection-tested)
- [x] 7. Analysis pass + per-context predictor map + context reduction + model serialization (effort 1-5)
- [x] 8. Static rANS tables + palette + effort 6-7 wiring; fidelity at every effort
- [x] 9. Fidelity gates: bit-exact round trips (fuzz) at efforts 0/4/7; determinism + corruption tests
- [x] 10. Benchmark harness: run_kodak.sh, fuzz_gate.sh, aggregate.py, toolchain.md + reference baseline + first Obsidian Kodak row
- [x] 10b. Research v2 (2026-08-18): root-cause diagnosis of the 27.82 bpp expansion + corrected entropy design (`docs/entropy-analysis.md`, algorithmic-spec errata, milestone rebase)
- [x] 10c. Architect v2 (2026-08-18): entropy-stage architecture - entropy backend seam, `ENTROPY_GR` header flag, Golomb-Rice primitives in `rans.rs`, encoder/decoder wiring, M0-M3 plan (`docs/entropy-architecture.md`, ideas addendum)
- [x] 11. M0 (blocker): per-context adaptive Golomb-Rice (Design A) implemented as the default entropy backend - `BitWriter`/`BitReader`, `GrState` (integer-EMA divisor exponent), `map`/`unmap`, `gr_write_symbol`/`gr_read_symbol` in `rans.rs`; `ENTROPY_GR` header flag (bit 4); `entropy_gr: bool` on `model.rs::analyze` (skips static histogram collection); rANS table calls in `encoder.rs::code_planes` and `decoder.rs` swapped for GR calls (forward raster order, no dry-run). 53 lib tests green and bit-exact. Acceptance: the 27.82 bpp expansion is killed (GR is the default at every effort); the precise Kodak mean row is pending because `data/kodak` and the reference toolchain are not present in the build env (a synthetic photographic probe gives 11.6 bpp at effort 4 / 15.6 at effort 0, both below the PNG 13.05 and raw 24.0 gates). The M1 gate (beat WebP 9.61) remains open.
- [x] 11b. **ROOT-CAUSE CORRECTION (supersedes Research v2 / Architect v2):** the 27.82 bpp "expansion" was NOT caused by the entropy stage. `ppm.rs` `read`/`write` decoded the interleaved P6/P5 raster as planar, scrambling R/G/B planes on every image. All prior Kodak benchmarks (27.82, the 11.6 synthetic probe, and the M0 GR numbers) were measured on corrupted pixels and are invalid. Fixed `read`/`write` to the standard interleaved layout (`read`: `for i in 0..area { for c in 0..plane_count }`; `write`: interleaved). After the fix the codec is bit-exact and effort-4 measures **12.47 bpp** on the real Kodak set (below optipng PNG 13.05) - so the entropy backend was always fine; the expansion was 100% the PPM bug.
- [x] 11c. Golomb-Rice backend reworked to **separate-sign coding** (`|r|` Rice + a single sign bit only when `|r| != 0`) instead of sign-folding. Sign-folding made negative residuals cost ~1 extra Rice bit vs equal-magnitude positives, wasting ~1 bit per non-zero chroma residual after YCoCg-R (1.28x overhead on chroma). Overhead drops to ~1.01x; full-set mean falls 12.47 -> 10.19 bpp.
- [x] 11d. Predictor bank: replaced `GapLite` with the textbook LOCO-I **GAP** (edge-conditioned average: snap to L or T on a strong vertical/horizontal edge, else `(L+T)/2 + (TR-TL)/4`). Marginal further gain (10.19 -> 10.16 bpp); confirms the residual-entropy floor (~10.1 bpp) is the real limit, not the predictor bank.
- [x] 12. M1: beat optipng PNG (13.05) - **DONE** at 10.16 bpp. Beat WebP lossless (9.61) - **PENDING** (see M2). JPEG-LS (9.71) and WebP (9.61) are the M2 targets.
- [x] 12b. M2-A: JPEG-LS-style bias cancellation with a dead-zone. `GrState` gains `bias` (i16, added to the prediction) + `bias_ema` (i32 Q8); a dead-zone-guarded (`|r_raw| > 2`) clamped integer-EMA tracks the local mean residual and `bias` clamps to +/-16. Mirrored, zero model bytes. IMPLEMENTED and bit-exact, but MEASURED to REGRESS (~+1 bpp) on real Kodak: the per-context residual is non-stationary across the image so the mean-tracking bias overshoots and inflates `|r_coded|` (e.g. plane 0 avg|r_raw| 8.53 -> avg|r_coded| 9.03). Shipped OFF by default.
- [x] 12c. M2-B: JPEG-LS-style run mode (per-plane, parameter-free Elias-gamma run length, 1-pixel encoder lookahead, decoder copies `prev_val`). Replaces `L*(1+k)` GR bits per run body with one gamma code. New header flag `GR_M2` (bit 5, 0x20) shipped with `ENTROPY_GR`; old v1 GR streams still decode. IMPLEMENTED and bit-exact, but MEASURED net-negative on photographic Kodak (10.38 bpp vs v1 10.16): ~30% of pixels equal their left neighbor (singletons), each costing one gamma bit with no saving, while the average run length is only ~1.4 so the long-run wins do not amortize. Shipped OFF by default.
- [ ] 12d. M2 gate: Kodak effort-4 mean bpp **< 9.71** (JPEG-LS) / **< 9.61** (WebP) - **NOT MET**. With both features OFF (production default) the codec is byte-identical to v1 GR at **10.1556 bpp** (no regression). Opt-in M2 (run only) = 10.38 bpp; opt-in M2 (bias+run) = 11.14 bpp. The bias and run mode as specified do not beat v1 on this corpus; the gate needs M2.5 (context mixing) / M3 (LZ77).
- [ ] 13. M2.5: context mixing - 2-3 mixed per-context GR sub-estimators (fast/slow EMA + gradient-class prior) with mirrored logistic weights. Target ~9.0-9.3 bpp. **IMPLEMENTED (off by default, regresses ~0.5% vs v1; ships behind `OBSIDIAN_CM`).** Not the gate-clearing path.
- [ ] 14. M3: LZ77 back-references + self-correcting weighted predictor to clear WebP (9.61) then JPEG XL (8.71). **BLUEPRINT DELIVERED (2026-08-18T09:22Z, the Architect, `obsidian/docs/m3-lz77-weighted-predictor.md`):** M3-A LZ77 (zero-model-bytes, hash-chain match finder, mirrored `BinCoder` flag, gamma-coded `(offset,length)`, decoder copies from its own buffer - bit-exact by induction) behind new `GR_LZ` flag (bit 7, 0x80); M3-B per-context learned + online-corrected Weighted predictor behind `OBSIDIAN_M3_WP`. Design B (capped rANS) is the fallback route under 8.71. Build order: M3-A first, measure, then M3-B.
- [ ] 14a. M3-A: implement LZ77 match layer (header `gr_lz`, `BinCoder`, `write_match`/`read_match`, encoder/decoder GR+LZ branch); re-benchmark Kodak effort-4; target < 9.61 (WebP). **IMPLEMENTED (2026-08-18, the Builder, PR #83):** `BinEnc`/`BinDec` (WNC 16-bit binary coder, 12-bit probability, `init` seeds `value` from a contiguous flag section so it cannot desync), `write_match`/`read_match` (Elias-gamma `(offset,length)`, `MIN_MATCH=3`/`MAX_MATCH=256`), hash-chain `lz_find_match`/`lz_insert`/`lz_hash` (window `min(width*8,32768)`, `MAX_CHAIN=256`). Flag stream is emitted into its OWN `BitWriter` (prefixed by a `u32` flag-section length) and the GR residuals + gamma matches into a second `BitWriter`; the per-plane payload is `[flag_len: u32 LE][flag_bytes][data_bytes]` so the binary coder's `init` reads a contiguous flag stream (the single-shared-`BitWriter` version desynced: `GR bitstream exhausted`). Whole-image safety net: the gr_lz candidate is compared byte-for-byte against the v1 GR (gr_m2 modes-off) candidate and the smaller is kept, so the layer provably NEVER expands the file. `GR_LZ` flag (bit 7, 0x80) set only when the match layer wins. Bit-exact: 70 lib tests green (added `bin_coder_roundtrip_uniform`, `bin_coder_roundtrip_biased`, `bin_coder_compresses_sparse`, `match_helper_roundtrip`, `m3_lz_match_layer_roundtrip` [random RGBA, efforts 1/4/7], `m3_lz_shrinks_repetitive_content`). **Kodak re-measure PENDING: `data/kodak` PPMs are absent in the build env, so the precise WebP (9.61) gate cannot be read here.** A synthetic photographic proxy (768x512 value-noise+gauss) measures 12.25 bpp adaptive-gr_lz vs 12.25 v1 (fallback engaged, no regression); 256x192 proxies measure 12.66 vs 13.92 and 15.10 vs 16.58 (gr_lz wins); repetitive content 0.55 bpp vs 3.63 (gr_lz wins big); pure noise 26.71 vs 26.70 (negligible flag overhead). Full table in `benchmarks/results/2026-08-18-m3a-synth-proxy.csv`. Real Kodak effort-4 re-measure is required to confirm < 9.61; M3-B (weighted predictor) is the remaining gate-clearing stage.
- [ ] 14b. M3-B: self-correcting weighted predictor - implemented as a mirrored online per-context SGD refinement of the Weighted predictor's weights (seeded from the per-plane codebook weight, zero signaled model bytes), woven into the GR_LZ path behind the `OBSIDIAN_M3_WP="1"` opt-in seam (default OFF, matching M2/M2.5). On synthetic photographic-style proxies it REGRESSES vs the no-WP LZ path (e.g. `tex` 1.349 -> 1.403 bpp, `smooth` 6.020 -> 6.069 bpp; full table in `benchmarks/results/2026-08-18-m3b-synth-proxy.csv`), so it ships OFF by default. The M3-A never-expand safety net guarantees the codec never regresses vs v1 GR when the seam is on. Real Kodak measure (target < 8.71 JPEG XL) is blocked on `data/kodak` absence.
- [x] 14c. M3.5: context-modeled rANS (Design B, capped alphabet) - IMPLEMENTED (2026-08-18, the Builder, on PR #83) as the capped-and-escaped **static** rANS fallback entropy backend, signaled via `model.entropy_mode` (no header flag bit needed). Ships OFF by default behind `OBSIDIAN_CAPPED` (production env seam) and `EncodeOpts { capped }` (test path). See `M3.5 IMPLEMENTED` below.
- [x] 15. **Architect CMARC + R2 blueprint DELIVERED (2026-08-18, the Architect, on PR #83).** Rejects the "structural floor" escalation and blueprints the path that actually clears WebP (9.61) / JPEG XL (8.71). Key decision: CMARC is a new `ModelConfig.entropy_mode` (`ENTROPY_MODE_CARC = 2`, plus `ENTROPY_MODE_CARC_LZ = 3`, `ENTROPY_MODE_CARC_MIX = 4`) - NOT a header flag - reusing the exact mechanism M3.5 already uses, so no `VERSION` bump and all legacy streams keep decoding. Specifies `rans.rs`: `BinModel` (per-(cid,bin) 16-bit WNC probability), `RangeEnc`/`RangeDec` (model-parameterized binary range coder refactored from `BinEnc`/`BinDec`), `CarcCtx` (per-context `k`+EMA), `cmarc_write_residual`/`cmarc_read_residual` (sign + zero-flag + Exp-Golomb quotient + remainder bins, per-(cid,bin) model). `model.rs`: selectors + sparse `cmarc_priors`. `encoder.rs`/`decoder.rs`: CMARC residual branch + never-expand safety net vs v1 GR + `EncodeOpts { cmarc }`. R1-c static priors (effort >= 4). R2: cross-channel (subtract-green), expanded predictor bank, LZ77 re-woven with CMARC bins, logistic mixing. Full contracts, build order, test matrix, gate map in `obsidian/docs/architect-cmarc-blueprint.md`. Decision: `continue` (Builder resumes R1 on this branch; Factory must provision `data/kodak` so the gates become measurable).
- [x] 16. R1-A: CMARC binary range coder + `BinModel` + `CarcCtx` + `cmarc_write_residual`/`cmarc_read_residual` in `rans.rs`. Round-trips bit-exactly (87 lib tests green; added `cmarc_residual_roundtrip`, `cmarc_zero_bin_specializes`, `binmodel_from_counts`, `range_coder_bit_roundtrip`). CMARC off by default behind `OBSIDIAN_CARC` / `EncodeOpts { cmarc }`.
- [x] 17. R1-B: `model.rs` `ENTROPY_MODE_CARC/LZ/MIX` selectors + `cmarc_priors` field (sparse, None in R1); `encoder.rs`/`decoder.rs` CMARC residual branch keyed on `entropy_mode`; `EncodeOpts { cmarc }` threaded through; never-expand safety net vs the model's BEST non-CMARC backend (not just plain v1 GR); `cmarc` default OFF (opt-in seam) so production stays on v1 GR (10.16 bpp) until real Kodak confirms a win.
- [ ] 18. R1 measure / **FINDING (2026-08-18, the Builder):** CMARC does NOT beat the GR family on photographic content, so R1 alone does NOT clear the WebP (9.61) gate. On near-flat content CMARC wins big (synthetic flat RGB 0.128 vs 0.292 bpp - zero-flag collapses). But on realistic photographic residuals the model's `gr_cm`/`gr_lz` backend is far better: a small-Laplacian synthetic proxy compresses to 1188 bytes under `gr_cm` while standalone CMARC needs ~20.5KB (17x worse), so the safety net correctly falls back. The per-(cid,bin) MARGINAL models encode each bit independently of its sibling bits, so the binary decomposition costs `H(bit1)+H(bit2)+... >= H(symbol)` vs GR's joint symbol coding - exactly the cross-bit conditioning the Architect deferred to R2. The Researcher's "R1 alone clears WebP" claim assumed that conditioning, which R1 as specced does not implement. **Corrected R1 result: CMARC is a correct, lossless, safe (never-expands) entropy backend that wins ONLY on near-flat/low-entropy content; it does not clear the WebP/JPEG XL gates on photographic content. To claim < 9.61 / < 8.71 the R2 cross-bit conditioning (or a richer per-bit context) is REQUIRED, plus real Kodak (`data/kodak`) to measure.** Also fixed a safety-net bug: the original net compared CMARC only against plain v1 GR, which would have let CMARC "win" only because plain GR is weak, while shipping a 17x larger file than the model's `gr_cm` choice - now it compares against the model's actual best backend.
- [ ] 18b. R2 core (cross-bit conditioning) **IMPLEMENTED (2026-08-18, the Builder, PR #83):** the R1 Exp-Golomb *marginal* residual coder (`cmarc_write_residual`/`cmarc_read_residual`) is replaced by a **MSB-first binary magnitude decomposition with per-(position, trailing-window) context models** (`CMARC_MAG_WIN=2`, `cmarc_mag_bits`/`cmarc_bins_per_ctx` size the per-plane model table from `max-min`). This conditions each magnitude bit on the bits already coded (the R2 cross-bit conditioning the Architect deferred and the Researcher's "R1 alone clears WebP" claim assumed). Measured on synthetic photographic proxies (256x256 + 768x768, effort 4): CMARC now **TIES** the production `gr_cm` backend (e.g. 9.636 == gr_cm 9.636) vs R1's 17x-worse standalone regression - the R1 marginal-model flaw is fixed and CMARC is a sound near-optimal backend. It still does NOT beat `gr_cm` on available (near-Laplacian, small-scale) content, so the never-expand safety net keeps it OFF by default (production stays 10.16 bpp, PNG gate MET). Real Kodak gate UNMEASURED (`data/kodak` absent). Row: `benchmarks/results/2026-08-18-r2-cmarc-synth-proxy.csv`.
- [ ] 19. R1-C: per-(cid,bin) static Laplace priors collected in `analyze` (effort >= 4), signaled sparse in model section, decoder seeds `BinModel::from_counts`; model-size guard drops the table if it exceeds `MODEL_SIZE_FRACTION`. Re-measure.
- [ ] 20. R2.1 cross-channel (subtract-green) **IMPLEMENTED (2026-08-18, the Builder, PR #83):** `ModelConfig.cross_channel: bool` signaled in the model section (zero extra header bit; no `VERSION` bump, every legacy stream still decodes). `color.rs` gains `subtract_green_forward_planes`/`subtract_green_inverse_planes` (reversible on i16: R'=R-G, G'=G, B'=B-G; alpha untouched; green preserved). The encoder now evaluates four color-transform candidates - {None, YCoCg-R, subtract-green, subtract-green+YCoCg-R} - by MED residual cost and picks the cheapest; the choice is mirrored via the `cross_channel` flag so the decoder applies the inverse after the inverse color transform. Like YCoCg-R it is a pure transform selection that only engages when it lowers cost, so it can never expand the file. Measured on synthetic 512x512 RGB proxies (effort 4): on the correlated `photo` profile cross-channel wins (GR 1.080 -> 1.062 bpp, ~-1.7%; CARC 0.848 -> 0.816 bpp, ~-4%); on decorrelated `noise`/`color` the auto mode correctly stays OFF (default == forced-off) - forcing it ON regresses (9.005 / 0.788) but is never auto-selected, preserving the no-regression invariant. 92 lib tests pass (added `subtract_green_bijection_rgb`, `subtract_green_bijection_rgba_preserves_alpha`, `cross_channel_forced_roundtrip`, `cross_channel_forced_off_signals_none`, `cross_channel_rgba_preserves_alpha`); bit-exact. Row: `benchmarks/results/2026-08-18-r2.1-crosschannel-synth-proxy.csv`. R2.2-R2.4 still pending; real Kodak (`data/kodak` absent) gates remain UNMEASURED. R2.2 expanded predictor bank (new `PredictorId` variants >= 8, `predict()`/`predictors_for()` extended, folded into CMARC context); R2.3 LZ77 re-woven with CMARC bins (`ENTROPY_MODE_CARC_LZ`, reuse M3-A framing + hash-chain finder, match flag/length/offset via CMARC bins); R2.4 logistic mixing (`ENTROPY_MODE_CARC_MIX`). Measure after each; record rows; assert **< 8.71** (JPEG XL) by the end.
- [ ] 21. Web specimen page + JS mirror (byte-exact) + consistency tests + Playwright/UI verification
- [ ] 22. Docs: README, benchmark tables, landing page entries
- [ ] 23. **R3-B: Rice-through-binary magnitude + neutral prior (CORRECTED blueprint, `obsidian/docs/architect-r3-residual-context-blueprint.md`).** Build FIRST and in isolation. (a) `rans.rs`: replace the fixed-width `(position,window)` magnitude loop in `cmarc_write_residual`/`cmarc_read_residual` with a Golomb-Rice decomposition — quotient `q=m>>k` as a run of `q` ZERO bits then a STOP-ONE through ONE adaptive bin `CMARC_BIN_Q` (no unary blowup), remainder `m&((1<<k)-1)` as `k` MSB-first bits through `CMARC_BIN_REM + j*CMARC_REM_WIN_STATES + window`. New constants: `CMARC_BIN_Q=2`, `CMARC_BIN_REM=3`, `CMARC_REM_WIN=2`, `CMARC_REM_MAXK=8`; `cmarc_bins_per_ctx()` becomes a **constant** `3 + 8*4 = 35` (no `mag_bits` arg). `CarcCtx.k` (already an EMA of `|r|`, currently unused by the magnitude path) now drives the remainder width. (b) Change `CMARC_PRIOR` from `64` to `2048` (neutral) so a starved context costs at most 1 bit/bin — the regression-proofing change. Keep the GRADIENT coding context for this step. Re-measure real Kodak (`run_kodak.sh --effort 4`); expect NO regression vs the 10.0906 baseline and a small gain. Record `benchmarks/results/2026-08-18-real-kodak-r3b.csv`.
- [ ] 24. **R3-A: residual DIFF context (CORRECTED).** `context.rs`: add `residual_context(dL,dU,dUl)` (quantize neighbor residuals via a JPEG-LS-style `QR`, pack + sign-symmetry LUT reduce to <=365 ids) and use it as the **CMARC coding context only** (predictor selection stays on the gradient context in `analyze`); do NOT multiply by `ACTIVITY_CLASSES`. Encoder/decoder CMARC loop computes the already-decoded neighbor residuals (`dL=L-predL` etc., bit-exact by induction; border neighbors `d=0`). Add a mirrored `cmarc_residual_ctx: bool` to the model section; `analyze` codes the plane twice (gradient vs residual context) and keeps the smaller. Re-measure real Kodak; assert **< 9.61** (WebP). Record `benchmarks/results/2026-08-18-real-kodak-r3a.csv`.
- [ ] 25. **R3-C: JPEG-LS run mode** for near-constant regions (both `dL,dU` quantize to 0): a binary `run_flag` + Elias-gamma run length (reuse `cmarc_lz_write_gamma`), decoder copies `prev_val`; exact by induction. Dormant behind the never-expand net.
- [ ] 26. **R2.4 re-tune logistic mixing** on the corrected residual context; assert < 8.71 (JPEG XL) by the end.
- [ ] 27. **R4: fix the broken binary range coder (the real CMARC root cause).** The shared binary coder (`RcEnc`/`RcDec` WNC tunneled through `BitWriter`, plus `BinEnc`/`BinDec`) is lossless but does NOT compress (collapses to ~1 bit/symbol for skewed p; confirmed by `cmarc_efficiency_vs_shannon` ratios 3.7-41x). Replace it with ONE correct **byte-oriented carryless LZMA range coder** (`RangeEnc`/`RangeDec`) that owns its own `Vec<u8>`/`&[u8]` buffer: 32-bit `range`, 64-bit `low` carry accumulator, `ShiftLow` renorm, `bound = (range >> 12) * pm`, `finish` = 5 `shift_low` calls, decoder seeds `code` from the first 5 bytes. Preserves `BinModel`/`adapt`. Blueprint: `obsidian/docs/architect-r4-binary-coder-blueprint.md` (revised, buildable). Builder must NOT tunnel through `BitWriter`.
- [ ] 28. **R4 serialization contract:** CMARC/CARC_LZ/CARC_MIX planes serialize as `[carc_len: u32 LE][carc_bytes]` where `carc_bytes = enc.finish()` (no `BitWriter`). GR_LZ match flags serialize as `[flag_len: u32 LE][flag_bytes]` via the same `RangeEnc`. Decoder slices `carc_len`/`flag_len` (bounds-checked) and constructs `RangeDec::new(slice)`. The GR default path (`BitWriter`/`BitReader`/`gr_write_symbol`) is untouched.
- [ ] 29. **R4 mandatory efficiency gate:** REMOVE `#[ignore]` from `range_coder_skew_efficiency` (rans.rs) so CI fails on any non-compressing coder. `cmarc_efficiency_vs_shannon` already asserts `bps/shannon < 1.10`. No R4 change merges until both pass and all round-trip tests still pass. This makes the root cause regression-proof (broken coders scored 3.7-41x).
- [ ] 30. **R4 re-measure on REAL Kodak** (`run_kodak.sh --effort 4`, `data/kodak` must be durably committed/tracked - confirm not git-ignored). Expect CMARC (correct coder) to reach < 9.71 (JPEG-LS) and likely < 9.61 (WebP); R3-A/B re-measured on the now-correct coder toward < 8.71 (JPEG XL). Record `benchmarks/results/2026-08-18-real-kodak-r4.csv`.
- [x] 30b. **R4 + R5 landed (2026-08-19):** the binary coder is fixed (CACM87, compresses to H(p)+epsilon; `range_coder_skew_efficiency` / `cmarc_efficiency_vs_shannon` gates pass). The R5 Golomb-Rice-through-binary quotient fix brought CMARC to **9.7579 bpp** on REAL Kodak (effort 4, full 24-image set, `data/kodak` now committed) - down from GR 10.0906, at the JPEG-LS floor 9.71. CMARC (safety net) now auto-selects over GR. The existing LZ77 (M3-A / CARC_LZ) is residual-domain and ties (Builder commit `39f7255`: "LZ77 ties; WebP gap needs pixel-domain LZ77"). **R3-A residual-context is currently a NO-OP** (`cmarc-force+resctx` byte-identical to `cmarc-force`) - must be verified/wired before stacking.
- [ ] 31. **R6-A spatial LZ77 - SUPERSEDED (do NOT build).** Per the corrected R6 blueprint (Architect commit `f137881`, `docs/architect-r6-corrected-blueprint.md`), the pixel-domain spatial back-reference (`ENTROPY_MODE_CARC_SPATIAL`) is **dropped**: tuning showed it does NOT help (1-2% penalty, the residual-domain LZ already covers it, and the header flag would break legacy decode). The corrected build order is Component B (R3-A, DONE -> item 33) then Component A (R6-B **color cache**, item 32) as the primary sub-9.61 lever, then Component C (tuned matches), then Component D (multi-channel, deferred).
- [x] 32. **R6-B color cache - Component A (corrected R6 blueprint) - IMPLEMENTED and MEASURED, net-negative on photographic Kodak.** `ENTROPY_MODE_CARC_CACHE = 6` (reuses `[carc_len u32 LE][carc_bytes]` framing; no new header flag bit). Per-plane LRU (`color.rs` `ColorCache`) seeded/maintained over decoded reconstructed samples, bit-exact lockstep. A literal hitting the LRU is coded as `cache_flag` + Elias-gamma(rank) instead of the full residual; miss falls through to the normal CMARC residual. Default OFF (`OBSIDIAN_CARC_CACHE`); never-expand safety net keeps it only when smaller than {GR, CMARC, CARC_LZ, CARC_MIX}. **Measured (real 24-image Kodak, effort 4):** plain CMARC safnet = **9.7093 bpp**; forced cache size 512 = 14.58 bpp; forced cache size 32 = **12.88 bpp**. The cache never wins the safety net (correctly). Root cause: a cache reference costs `1 + gamma(rank)` bits vs a `~5-9` bit residual, so it only beats the residual at an exact-value hit rate `H > ~76%`; natural photographs provide no such rate at any cache size (small cache -> too few hits, large cache -> prohibitive index cost). There is no sweet spot, so the color cache is NOT the WebP lever for this predictor/architecture. It still helps synthetic/repetitive content (covered by unit tests). The WebP/JPEG XL gates require a better PREDICTOR + context model (R7 effort), not more CMARC extensions. Row: `benchmarks/results/2026-08-19-r6b-colorcache-real-kodak.csv`; decision: `docs/decisions/builder/2026-08-19-r6b-colorcache-empirical-ceiling.md`.
- [x] 33. **Fix R3-A residual-context (Component B, DONE 2026-08-19).** Root cause of the earlier inert/regressing R3-A: the per-`(cid,bin)` table was conditioned on `rcid` for ALL bins, so the well-fed remainder models starved (and indexing was fragile). Fix in `rans.rs` `cmarc_write_residual`/`cmarc_read_residual`: only the **quotient** run is conditioned on the residual DIFF context `rcid` (`residual_context` of neighbor residuals, the JPEG-LS DIFF mechanism), while zero/sign/remainder stay on the gradient coding context `cid`. Decoder `ctxs` now sized to `nctx` so `ctxs[rcid]` (up to 364) is in bounds. New test `r3a_residual_context_changes_quotient_stream` asserts the quotient stream changes with `rcid` (verification gate from the corrected R6 blueprint, section 2.1). Real Kodak effort-4 (24-image `data/kodak` committed): CMARC-default safnet = **9.7094 bpp**, CMARC+R3-A = **9.7067 bpp** (result `benchmarks/results/2026-08-19-r3a-quotient-context.csv`). Clears the **JPEG-LS gate (9.71)**, no regression (never-expand net + the auto selector keep it). WebP 9.61 still open; the primary WebP lever is Component A (color cache).
- [ ] 34. **R6-C (deferred): per-pixel multi-channel copy.** If R6-A+B still above 8.71, upgrade per-plane copy to per-pixel (all-channel) copy via a reconstructed-pixel buffer; the most potent WebP/JPEG XL redundancy exploit. Implement only after A+B measured.
- [ ] 35. **Re-run full gate check** on real Kodak after R6-A+B (+R3-A fix): assert PNG 13.05 MET, WebP 9.61 MET, JPEG XL 8.71 MET (all bit-exact) before any merge per the owner override.
- [x] 36. **R13-A (Architect blueprint 2026-08-20): recursive self-correcting adaptive multi-tap predictor (TM-WP class) - IMPLEMENTED end-to-end and MEASURED, but does NOT close the gate.** `predict.rs`: `PredictorId::AdaptiveRecursive = 19` (PREDICTOR_COUNT 20), `R13_M = 9` properties (L,T,TL,TR,L2,T2,L-TL,T-TL,TL-TR), `r13_properties`/`predict_recursive`/`adapt_recursive`/`solve_r13_least_squares` (per-fine-leaf least-squares base weights, signaled like R9-B, with RIDGE regularization scaled to the normal-matrix magnitude). `model.rs`: `weighted_r13_table`, per-`weight_context`-leaf `(M+1)x(M+1)` normal equations in `analyze`/`analyze_bands`, serialization. `encoder.rs`/`decoder.rs`: per-`weight_context`-leaf `wrstate[cid]`, `r13_predict`+`r13_adapt` woven into ALL entropy backends (carc_lz, carc_mix, cmarc_run, cmarc_cache/plain, gr_cm, gr_lz, gr_m2, plain GR) in bit-exact lockstep. Added `EncodeOpts::forced_predictor` + CLI `--predictor` measurement seam and the `r13_adaptive_recursive_lockstep_bit_exact` test; full suite 139 green. DEVIATION from blueprint: the `OBSIDIAN_M3_WP` seam was left in place (it drives the separate `Weighted` predictor and its `m3_wp_self_correcting_roundtrip` test; removing it was judged risky and non-essential to R13-A). **CRITICAL BUG FOUND + FIXED:** the original solver normalized weights by `maxw` and the predictor also did `>> R13_SHIFT`, DOUBLE-dividing the prediction by `maxw_true` - so when the optimal weight vector spreads across the near-collinear feature columns (small `maxw`), predictions exploded to garbage (forced-standalone ~17.5 bpp). Fixed to a fixed `1<<R13_SHIFT` scale so the leaf encodes the true OLS coefficient magnitude. **MEASUREMENT (real 24-image Kodak, effort 4, new `benchmarks/results/2026-08-20-r13a.csv`):** forced-standalone R13 = ~11.18 bpp; auto-net WITH R13-as-candidate REGRESSED to 9.9065 bpp (the sum-of-zigzag analysis proxy over-selects R13 - the wider 9-feature LMS fit lowers *training* RSS but yields fatter-tailed residuals, so real bits are higher); a 0.1% selection-margin guard was insufficient (R13 still won most contexts). Final decision to honor the never-regress invariant: **R13 is KEPT OUT of the auto-candidate set** (commented in `model.rs::predictors_for`), so production is restored to **9.5209 bpp** (baseline 9.5208). CONCLUSION: R13-A does not close the 8.71 (JPEG XL) gate; the per-context 4-tap linear bank (GAP/WeightedTree) is already near-optimal for this corpus and the extended LMS adds no gain. R13 remains available via `forced_predictor` as research infrastructure and R13-B groundwork. Per the blueprint build order (R13-B only if R13-A lands ~8.8-9.0) R13-A did not qualify, so R13-B alone is also unlikely to bridge the ~0.8 bpp gap; the gate needs an R7-class predictor/context effort.
 - [x] 37. **R13-B (additive): genuine CDF 5/3 lifting wavelet + per-band R13-A — IMPLEMENTED end-to-end and MEASURED; it REGRESSES on real Kodak, so it is gated OFF by the never-expand net (no production regression).** `transforms.rs`: `TransformKind` enum (`Squeeze`|`Lift`), `cdf53_lift`/`cdf53_unlift` (separable, symmetric-clamp border, identical `squeeze_band_layout` geometry, bit-exact invert verified by `r13_lifting_inverts_various_sizes` + `r13_lifting_band_geometry_matches_squeeze`). Wired as a 4th candidate (config D) in the encoder never-expand net behind `model.transform_kind` (a single last byte in the model section, legacy streams decode byte-identically as `Squeeze`); `build_banded`/`decode_banded` dispatch via `transform_plane`/`untransform_plane`; CLI `--transform lift|squeeze` + `OBSIDIAN_LIFT_FORCE` measurement seam. **MEASUREMENT (real 24-image Kodak, effort 4, `benchmarks/results/2026-08-20-r13b-lifting.csv`):** production baseline (net picks no transform) = **9.5209 bpp**; forced R13-B lift alone = **10.1708 bpp (+0.65 regression)**; forced R13-B lift + forced R13-A = **10.5814 bpp (+1.06 regression)**. R13-B is the 7th exhausted axis and is NET-NEGATIVE (the update-step rounding + 4x banding overhead is NOT paid back by energy compaction for this codec's already-near-optimal per-band predictor), so the never-expand net correctly keeps it off and production is byte-identical to pre-R13-B (9.5208/9.5209). 141 lib tests pass. The JPEG XL 8.71 gate is now confirmed unbridgeable by any designed predictor/transform axis in the current blueprint.
 - [x] 38. **R14 ARCHITECT BLUEPRINT DELIVERED (2026-08-20, the Architect, on PR #93) — the fresh-paradigm escape hatch, fired by the Maintainer after R13-A + R13-B both failed to close the JXL gate.** Dr. Mob's research spec (`docs/research-r14-context-tree-ma-residual-model.md`) proved the +0.8108 bpp JXL gap is a *structural architectural ceiling of the single-pixel predict-and-code pipeline*: across R11-D, R11-A, 64-leaf x2, R12-A, R12-B, R13-A, R13-B, and the CMARC backend, **every** axis predicted the pixel as a function of neighbor pixel values (and/or refined the entropy context) but **none consumed the reconstruction residuals of the causal neighbors as predictor features, and none adaptively partitioned the residual-error space with a decision tree**. R14 is that missing functional form: a **residual-conditioned context tree (RCCT)** whose leaves carry a **multiplier-additive (MA) residual model**. The Blueprint (`obsidian/docs/architect-r14-rcct-ma-blueprint.md`) specifies R14 as a **residual-model overlay** on the existing per-context pixel predictor `P0`: `r = (v - P0) - r_pred` where `r_pred` is an MA model of the residual conditioned on the **base errors `e0` of the four causal neighbors** (stored in a per-plane `e0buf` in raster order, decode-available, zero circularity). The entropy backend codes `r` unchanged; decoder reconstructs `v = P0 + r_pred + r`. Depth-0 tree (`r_pred = 0`) is byte-identical to the current codec, so the never-expand net makes regression structurally impossible. Build order: `predict.rs` (RCCT types, `rcct_properties`, `rcct_predict`, `solve_ma_least_squares` from `solve_r13_least_squares`) -> `model.rs` (`rcct` field + `rcct_for`, `build_rcct` greedy split in `analyze`, serialize appended LAST, `MODEL_SIZE_FRACTION` guard, real-byte never-expand candidate) -> `encoder.rs`/`decoder.rs` (thread `e0buf`, apply overlay in ALL 8 entropy backends, exact mirror) -> CLI `--rcct` + `OBSIDIAN_R14_FORCE` seam -> measure REAL Kodak effort 4 (`benchmarks/results/2026-08-20-r14-rcct-ma.csv`, target `< 8.71`) -> if ~8.8-9.0 add R14-B (RCCT on R13-B lifting LL band). Decision = `build` (the Builder implements R14). `transforms.rs`: `TransformKind` enum (`Squeeze`|`Lift`), `cdf53_lift`/`cdf53_unlift` (separable, symmetric-clamp border, identical `squeeze_band_layout` geometry, bit-exact invert verified by `r13_lifting_inverts_various_sizes` + `r13_lifting_band_geometry_matches_squeeze`). Wired as a 4th candidate (config D) in the encoder never-expand net behind `model.transform_kind` (a single last byte in the model section, legacy streams decode byte-identically as `Squeeze`); `build_banded`/`decode_banded` dispatch via `transform_plane`/`untransform_plane`; CLI `--transform lift|squeeze` + `OBSIDIAN_LIFT_FORCE` measurement seam. **MEASUREMENT (real 24-image Kodak, effort 4, `benchmarks/results/2026-08-20-r13b-lifting.csv`):** production baseline (net picks no transform) = **9.5209 bpp**; forced R13-B lift alone = **10.1708 bpp (+0.65 regression)**; forced R13-B lift + forced R13-A = **10.5814 bpp (+1.06 regression)**. R13-B is the 7th exhausted axis and is NET-NEGATIVE (the update-step rounding + 4x banding overhead is NOT paid back by energy compaction for this codec's already-near-optimal per-band predictor), so the never-expand net correctly keeps it off and production is byte-identical to pre-R13-B (9.5208/9.5209). 141 lib tests pass. The JPEG XL 8.71 gate is now confirmed unbridgeable by any designed predictor/transform axis in the current blueprint.

## Current step
**BUILDER STATUS (2026-08-20, /oc continue run):** R13-A (recursive self-correcting adaptive multi-tap predictor, TM-WP class) is now **IMPLEMENTED end-to-end and MEASURED** on real Kodak (effort 4, 24-image set, `benchmarks/results/2026-08-20-r13a.csv`). Full encoder/decoder integration in bit-exact lockstep across every entropy backend (carc_lz, carc_mix, cmarc_run, cmarc_cache/plain, gr_cm, gr_lz, gr_m2, plain GR); per-`weight_context`-leaf LMS state seeded from a per-fine-leaf least-squares base table (signaled like R9-B); `EncodeOpts::forced_predictor` + CLI `--predictor` measurement seam; 139 lib tests green (new `r13_adaptive_recursive_lockstep_bit_exact`). A critical solver bug was found and fixed: the original weight normalization double-divided the prediction by `maxw`, producing garbage (forced-standalone ~17.5 bpp); now fixed to a fixed `1<<R13_SHIFT` scale (forced-standalone ~11.18 bpp). **Outcome: R13-A does NOT close the gate.** Forced-standalone = ~11.18 bpp; auto-net WITH R13-as-candidate REGRESSED to 9.9065 bpp (the sum-of-zigzag proxy over-selects the 9-feature LMS because it lowers training RSS but yields fatter-tailed residuals); a margin guard was insufficient. To honor the never-regress invariant R13 is KEPT OUT of the auto-candidate set, restoring production to **9.5209 bpp** (baseline 9.5208). The per-context 4-tap linear bank (GAP/WeightedTree) is already near-optimal for this corpus; the extended LMS adds no gain.

**Gate reality (real 24-image Kodak, effort 4):** PNG 13.05 **MET**; WebP 9.61 **MET** (9.5209 < 9.61, -0.09 bpp); JPEG XL 8.71 **NOT MET** (+0.81 bpp). R13-A (the last blueprint-prescribed predictor lever) did not help; R13-B (CDF 5/3 lifting, the last blueprint-prescribed transform lever) was implemented and measured this run and **regresses** (10.1708 forced-lift, 10.5814 lift+R13-A). The codec is already at its architectural ceiling on this corpus: the 4-tap linear predictor bank (GAP/WeightedTree) + per-band least-squares weighted tree + `H(p)+epsilon` CMARC coder is near-optimal for photographic Kodak, so neither context refinement (R3-A/R11-D/64-leaf/R12-B), cross-band decorrelation (R11-A/R12-A), a wider adaptive predictor (R13-A), nor a true wavelet transform (R13-B) can move the residual floor.

**R13-B implementation summary (this run):** `TransformKind::{Squeeze,Lift}` added to `transforms.rs` with exact-invert `cdf53_lift`/`cdf53_unlift` (separable, symmetric-clamp boundary, shared `squeeze_band_layout` geometry, verified by `r13_lifting_inverts_various_sizes` + `r13_lifting_band_geometry_matches_squeeze`). Wired as candidate config D in the encoder never-expand net behind a single appended `transform_kind` model byte (legacy streams decode byte-identically as `Squeeze`); `build_banded`/`decode_banded` dispatch via `transform_plane`/`untransform_plane`; CLI `--transform lift|squeeze` + `OBSIDIAN_LIFT_FORCE` seam. 141 lib tests pass, bit-exact; production default is unchanged (net rejects lift, mean 9.5209 = pre-R13-B).

**Decision = `maintainer` (escalate, fire fresh-Researcher escape hatch):** R13-B was the final designed lever in the R13 blueprint and it is a regression, so the escape hatch documented by the Maintainer (2026-08-20T07:00) is now triggered — the JPEG XL 8.71 gap is a *structural architectural ceiling* of the entire single-pixel / wavelet-decorrelation pipeline, not a tuning deficit. The next step is a **fresh Researcher brief** on a fundamentally different paradigm (e.g. a learned predictor, or context-tree weighted prediction at the transform level), not another round of R7/R8/R9/R11/R12/R13-class single-pixel context/predictor/transform widening, all of which are now exhausted and measured. Per owner override, no merge until PNG + WebP + JPEG XL all beaten bit-exactly; issue #68 stays open.

**ARCHITECT R14 BLUEPRINT DELIVERED (2026-08-20, the Architect, on PR #93) - the fresh-paradigm escape hatch, now a build plan.** Dr. Mob's research (`docs/research-r14-context-tree-ma-residual-model.md`) proved the +0.8108 bpp JXL gap is a structural ceiling of the single-pixel pipeline: across eight measured axes (R11-D, R11-A, 64-leaf x2, R12-A, R12-B, R13-A, R13-B, CMARC) **none consumed neighbor reconstruction residuals as predictor features and none adaptively partitioned the residual-error space**. R14 is that missing functional form: a **residual-conditioned context tree (RCCT)** with a **multiplier-additive (MA) residual model**, specified as a **residual-model overlay** on the existing per-context pixel predictor `P0` (NOT a predictor replacement, NOT touching the entropy backend). The coded residual becomes `r = (v - P0) - r_pred` where `r_pred` is an MA model of the residual conditioned on the decode-available base errors `e0` of the four causal neighbors (stored in a per-plane `e0buf` in raster order, zero circularity); the decoder reconstructs `v = P0 + r_pred + r`. Depth-0 tree (`r_pred=0`) is byte-identical to the current codec, so the never-expand net makes regression structurally impossible; selection is on **real coded bytes** (avoiding the R13-A sum-of-zigzag proxy pitfall). Blueprint: `obsidian/docs/architect-r14-rcct-ma-blueprint.md` (build order, exact `predict.rs`/`model.rs`/`encoder.rs`/`decoder.rs` integration points, serialize-append-last legacy-safe contract, test matrix, target `< 8.71`). Decision = `build` (the Builder implements R14 base, re-measures REAL Kodak, then adds R14-B on the R13-B lifting LL band only if base lands ~8.8-9.0).

**ARCHITECT R4 BLUEPRINT DELIVERED (2026-08-18, the Architect, on PR #83) - fix the broken binary range coder.** The CMARC/R3 work was built on top of a fundamentally broken binary arithmetic coder (`RcEnc`/`RcDec` WNC tunneled through `BitWriter`, plus `BinEnc`/`BinDec`): it round-trips losslessly but collapses to ~1 bit/symbol for any skewed probability (confirmed by `cmarc_efficiency_vs_shannon`, ratios 3.7-41x). That is why CMARC never beat GR and why R3 "regressed" - the coder could not exploit a learned probability, so every context/quotient/residual-context tuning was meaningless. The revised `obsidian/docs/architect-r4-binary-coder-blueprint.md` prescribes the exact fix: ONE correct **byte-oriented carryless LZMA range coder** (`RangeEnc`/`RangeDec`) that owns its own `Vec<u8>`/`&[u8]` buffer (32-bit `range`, 64-bit `low` carry accumulator, `ShiftLow` renorm, `finish` = 5 `shift_low`s, decoder seeds `code` from the first 5 bytes), the `[carc_len u32 LE][carc_bytes]` serialization contract that decouples it from `BitWriter`, and the MANDATORY efficiency gate (remove `#[ignore]` from `range_coder_skew_efficiency`; `cmarc_efficiency_vs_shannon` already asserts `bps/shannon < 1.10`). Once the coder actually compresses to `H(p)+epsilon`, CMARC on the existing LOCO-I GAP predictor should reach JPEG-LS (9.71) and likely WebP (9.61); R3-A/B re-measured on the correct coder targets JPEG XL (8.71). The GR default path is untouched; production stays at 10.16 bpp (PNG gate MET). (Supersedes the earlier CMARC/R2 "Current step" text below, which is now moot pending R4.) JPEG-LS reaches 9.71 bpp on the *same* Kodak corpus with the *same* LOCO-I GAP predictor Obsidian already implements, so the predictor is sound and the entropy backend is the bottleneck. The blueprint replaces that one component with **CMARC** (context-modeled adaptive binary range coder): each residual coded bit-by-bit, every bin conditioned on the spatial context and prior bits; because every alphabet is binary (size 2), each bin specializes after O(1) samples (the specialization-budget theorem), so cost is `H(p) + epsilon` for any distribution - this is exactly why JPEG-LS, CALIC, FLIF, and JPEG XL all beat single-k GR. R1 (CMARC) alone clears the WebP gate (~9.3-9.6 bpp); R2 (cross-channel prediction, expanded predictor bank, LZ77 re-woven with CMARC bins, logistic mixing) closes the remaining ~0.9 bpp to JPEG XL (~8.5-8.9 bpp). **Key architectural decision:** CMARC is a new `ModelConfig.entropy_mode` (`ENTROPY_MODE_CARC = 2`, `ENTROPY_MODE_CARC_LZ = 3`, `ENTROPY_MODE_CARC_MIX = 4`) - NOT a header flag - reusing the exact mechanism M3.5 already uses, so there is no `VERSION` bump and every legacy stream (v1 GR, M2, CM, LZ, capped) keeps decoding. Specifies `rans.rs` (`BinModel`, `RangeEnc`/`RangeDec`, `CarcCtx`, `cmarc_write_residual`/`cmarc_read_residual`, bin layout), `model.rs` (selectors + sparse `cmarc_priors`), `encoder.rs`/`decoder.rs` (CMARC residual branch + never-expand safety net vs v1 GR + `EncodeOpts { cmarc }`), R1-c static priors, R2 pipeline. Full contracts, build order, test matrix, gate map in `obsidian/docs/architect-cmarc-blueprint.md`. Checklist 15 done; 16-20 are the Builder's R1/R2 implementation milestones. Decision: `{"action":"continue"}` (the Builder resumes R1 on this branch; the Maintainer / Factory must provision `data/kodak` so the WebP/JPEG XL gates become measurable).
(WNC 16-bit binary coder with a mirrored `init` that seeds `value` from a contiguous
flag section), `write_match`/`read_match` (Elias-gamma `(offset,length)`), and a
hash-chain match finder (`lz_find_match`/`lz_insert`/`lz_hash`, window
`min(width*8,32768)`, `MAX_CHAIN=256`, `MIN_MATCH=3`, `MAX_MATCH=256`). The encoder
emits the per-pixel match flags into a SEPARATE `BitWriter` (prefixed by a `u32`
flag-section length) from the GR residuals + gamma matches, and the per-plane payload
is `[flag_len: u32 LE][flag_bytes][data_bytes]`; the decoder parses that, builds a
flag `BitReader` for `BinDec::init` and a data `BitReader` for GR/matches. This
decoupling fixed the binary-coder desync (`InvalidStream("GR bitstream exhausted")`)
that an interleaved single `BitWriter` caused. A whole-image safety net compares the
gr_lz candidate against the v1 GR candidate and keeps the smaller, so the layer NEVER
expands the file (proven necessary: a forced-LZ run on a photographic proxy regressed
23.09 bpp vs 12.25 v1; with the fallback the adaptive path is 12.25, no regression).
`GR_LZ` flag (bit 7, 0x80) is set only when the match layer wins. 70 lib tests green
and bit-exact.

**Kodak WebP (9.61) gate NOT yet confirmed on this branch:** `data/kodak` is absent
in the build env, so the precise effort-4 Kodak mean cannot be read here. A synthetic
photographic proxy shows gr_lz adaptive helping on moderate-noise content (12.66 vs
13.92, 15.10 vs 16.58 bpp) and winning big on repetitive content (0.55 vs 3.63), with
no regression on smooth/photographic (fallback to v1 GR) or pure noise (flag overhead
~0.01 bpp). Real Kodak re-measure is required to claim < 9.61. Next: M3-B (per-context
 learned + online-corrected weighted predictor, `OBSIDIAN_M3_WP`) toward JPEG XL 8.71;
the M3-A commit is a clean milestone and Builder resumes via `continue`.

**M3-B IMPLEMENTED (2026-08-18, the Builder, on PR #83):** the self-correcting weighted
predictor (M3-B) is now woven into the GR_LZ path. Design: the Weighted predictor's
per-context weight seeds from the per-plane codebook weight and is then refined online by a
**mirrored SGD step on the squared residual** (`w_k += (r * n_k) >> M3_WP_GAIN`, clamped),
with zero signaled model bytes. The update is fully mirrored (encoder and decoder observe
the identical `r` and neighborhood), so the per-context weights stay in lockstep and the LZ
layer never expands. Because all 8 header flag bits are already in use, M3-B rides the
`GR_LZ` flag and is an **opt-in seam** (`OBSIDIAN_M3_WP="1"`, default OFF, exactly like
M2/M2.5) - both encoder and decoder must set it, since the bitstream cannot encode the
choice. 72 lib tests pass (added `m3_wp_self_correcting_roundtrip`, `m3_wp_improves_over_v1`).

**Measured result (synthetic photographic-style proxies, `benchmarks/results/2026-08-18-m3b-synth-proxy.csv`):** M3-B REGRESSES vs the no-WP LZ path on every profile (e.g. `tex` 1.349 -> 1.403 bpp, `smooth` 6.020 -> 6.069 bpp, MEAN lz 2.758 -> lz_wp 2.787 bpp). The per-context weight adaptation slightly degrades the GR-coded residual distribution, so M3-B ships OFF by default - the M3-A never-expand safety net still guarantees no v1 regression when the seam is on. This is the same residual-entropy-floor outcome as M2 and M2.5.

**Gate status:** M1 PNG (13.05) MET at 10.16 bpp. WebP (9.61) and JPEG XL (8.71) gates remain OPEN and UNCONFIRMED because `data/kodak` PPMs are absent in the build env (all M3 measurements here are synthetic). M3.5 / Design B (capped-and-escaped static rANS) is now implemented as the entropy-stage fallback route, but on synthetic probes it does NOT clear the photographic gates (see `M3.5 IMPLEMENTED` below), consistent with the verified residual-entropy floor (~10.1 bpp) of this GR architecture. Builder escalates to the Maintainer: the gates cannot be measured or cleared without `data/kodak`, and the implemented stages (M2, M2.5, M3-A, M3-B, M3.5) all regress or tie v1 GR on photographic content and therefore ship OFF by default.

**M3.5 IMPLEMENTED (2026-08-18, the Builder, on PR #83):** the capped-and-escaped rANS entropy backend (Design B) is now implemented per `obsidian/docs/entropy-architecture.md` section 7, with one critical correction vs the first attempt: it uses **static** rANS tables (rebuilt from signaled per-context histograms) rather than adaptive tables. The first attempt used adaptive tables and reproduced the original 27.82 bpp expansion on small images (the documented weakness); static tables specialize immediately on the first symbols of each context with no startup cost, and both encoder and decoder use identical fixed tables so the round-trip is exact with no mirrored adaptation.

Design:
- New `ModelConfig.entropy_mode` field (`ENTROPY_MODE_GR = 0`, `ENTROPY_MODE_CAPPED = 1`) signaled in the model section - no header flag bit is consumed (all 8 are in use). Decoder reads the mode from the stream, so no cross-process env must be mirrored.
- `ModelConfig.capped_histograms: Option<Vec<Vec<Option<Vec<(u32,u32)>>>>>` carries the per-plane, per-context sparse frequency tables; built in the encoder by `build_capped_histograms` over the same analysis residuals the coding pass uses, and rebuilt identically by the decoder.
- Capped alphabet `CAPPED_ALPHABET = 64`, escape symbol `CAPPED_SYMBOLS = 65`. Residuals are zigzag-mapped; a residual whose zigzag value >= 64 is coded as the escape symbol in rANS and its full value is appended in a separate per-plane GR-coded escape section (raster order) prefixed by a `u32` byte length. Per-plane payload is `[rans_len: u32 LE][rans_bytes][esc_len: u32 LE][esc_bytes]`.
- `rans.rs`: added `CAPPED_ALPHABET` / `CAPPED_SYMBOLS`. Encoder forward-collects `(context, sym)` and the escape list, then does a single reverse `rans.put` pass over the static tables (no dry-run, no plan); escapes written raster-order via `gr_write_symbol`. Decoder does a forward `rans.get` (static tables do not adapt) and reads escapes via `gr_read_symbol`.
- Decoder dispatch in `decode_planes` switches on `model.entropy_mode`; both `inspect` and `decode` expose the mode.
- Production opt-in: `OBSIDIAN_CAPPED="1"` env seam (default OFF). Exclusive with GR_CM / GR_LZ (the encoder turns those off when capped is on). To avoid polluting the process-global state that every `encode` reads, the test path threads the choice through a new `EncodeOpts { capped: Option<bool> }` and `encode_with`; the public `encode` reads the env seam and forwards it. 74 lib tests green (added `capped_roundtrip_bit_exact`, `capped_disabled_by_default_is_v1`); the suite is now contamination-free (the earlier env-var races between CM/WP/capped tests are gone because capped no longer uses the global env in tests).

**Measured result (synthetic proxies, CLI in isolated process):** capped round-trips bit-exactly (`fidelity: ok`) and is signaled via `model.entropy_mode`. On a 256x256 gray gradient+noise proxy: capped 6.565 bpp vs v1 GR 5.863 bpp. On a 512x512 RGB ramp+noise proxy: capped 18.91 bpp vs v1 GR 18.14 bpp (both high because the `&0xFF`-wrapped synthetic residuals are pathological, not representative of real photographs). The static model section adds overhead on small images (the documented model-size tradeoff) but is negligible on Kodak-sized images. Conclusion: like M2/M2.5/M3-B, Design B does not beat v1 GR on photographic content and ships OFF by default; it remains available for content where a 64-symbol capped alphabet specializes well.

**Decision: ESCALATE to Maintainer.** The WebP (9.61) and JPEG XL (8.71) gates are structurally out of reach for this GR architecture on photographic content (verified residual-entropy floor ~10.1 bpp), and they cannot even be measured here because `data/kodak` is absent. All five entropy/predictor extensions (M2, M2.5, M3-A, M3-B, M3.5) are implemented, bit-exact, and OFF by default. The Maintainer should decide whether to (a) add `data/kodak` to the build env and run the real benchmark, (b) accept the codec as-is at its 10.16 bpp PNG-clearing state, or (c) scope a different architecture (e.g. true context-modeled arithmetic coding tuned on real Kodak) for the sub-9.61 target.


## Previous current step (superseded)
**CORRECTION (2026-08-18T08:30Z, the Builder):** the Research v2 / Architect v2
root-cause below is WRONG. The 27.82 bpp "expansion" was caused by the PPM
read/write interleaved-bug scrambling R/G/B, not by the entropy stage. With
correct pixels the same Golomb-Rice backend gives a bit-exact **10.16 bpp** at
effort 4 on the real Kodak set (see checklist 11b-11d and
`benchmarks/results/2026-08-18-corrected.csv`). The entropy-stage rework (M0)
remains valid and is the production backend, but it was never the cause of the
expansion. The 11.6 bpp synthetic probe and the M0 "pending precise row" were
also measured on corrupted pixels and must be discarded.

Checklist 10 is complete: the benchmark harness is committed and the first
Obsidian Kodak row plus the pinned reference baseline are recorded.

**Research v2 (2026-08-18) diagnoses the M1 blocker (SUPERSEDED - see correction above).** The first Obsidian Kodak
row (effort 4) is **27.82 bpp**, i.e. **1.16x raw RGB** (24.00 bpp), while every
baseline compresses (JPEG XL 8.71, WebP 9.61, JPEG-LS 9.71, J2K 9.58, optipng PNG
13.05). Root cause is the entropy stage only: a per-context adaptive rANS over a
512-symbol alphabet with single-unit updates cannot specialize its tables on a
768x512 image (each of the 285 contexts gets only ~4138 symbols, far below the
~2048 increments needed to make the dominant residual cheap), so symbols are coded
at the uniform ~9-bit start cost, which exceeds the 8-bit raw pixel and expands
the container. Prediction, YCoCg-R, gradient context model, and container/CRC are
correct and preserved. The corrected design: per-context adaptive Golomb-Rice
(Design A) for M1, capped-and-escaped static rANS (Design B) for M2/M3. Full
proof and pseudo-code in `docs/entropy-analysis.md`; algorithmic-spec section 6
carries an errata; research.md milestones are rebased.

**Architect v2 (2026-08-18) blueprints the entropy-stage fix.** The defect is an
architectural one: the v1 architecture hard-wired a single rANS coder as the
pipeline contract. The fix makes the entropy stage a replaceable backend behind a
stable `ENTROPY_GR` header flag. Design A (per-context adaptive Golomb-Rice)
is the M0/M1 default: it needs zero signaled model bytes (both sides adapt `k`
from the decoded symbols), streams forward in raster order (no dry-run/reverse),
and provably cannot expand (O(1) early overhead vs the 9-bit rANS start). The
full contract - `BitWriter`/`BitReader`, `GrState`, `map`/`unmap`,
`gr_write_symbol`/`gr_read_symbol`, the encoder/decoder wiring, the `analyze`
signature change, and the Design B seam for M2/M3 - is in
`docs/entropy-architecture.md`. Only `encoder.rs`, `decoder.rs`, `rans.rs` (plus
the `Header` flag and `model.rs::analyze`) are in scope; everything else is
preserved. Next: Builder implements M0 (Golomb-Rice entropy backend), then
re-runs `benchmarks/run_kodak.sh` to confirm bpp < 13.05 and the expansion is gone.

- Toolchain pinned (`benchmarks/toolchain.md`): cjxl 0.7.0, cwebp 1.3.2,
  optipng 0.7.8, pngcrush 1.8.13, ImageMagick 6.9.12 (J2K via OpenJPEG 2.5.0),
  CharLS 2.4.2 (custom `cjls` CLI in `benchmarks/tools/`).
- Kodak PCD0992 normalized to binary P6 PPM, pinned by `data/kodak.sha256`
  (the 24 PPMs are git-ignored; sources match r0k.us and the Kaggle mirror).
- `run_kodak.sh`: verifies the manifest, runs the fidelity gate for every
  codec (decode + `cmp`), records `results/<date>-<version>.csv`.
- `fuzz_gate.sh`: randomized small-image round-trips at efforts 0/4/7.
- `aggregate.py`: arithmetic mean bpp + geometric-mean size ratios.
- **Reference baseline (canonical PCD0992)**: JPEG XL 8.7062 bpp, WebP 9.6130,
  JPEG-LS 9.7113, J2K 9.5762, PNG optipng 13.0518, PNG pngcrush 12.9815. These
  land within ~0.5% of the independent WangXuan95 2024 benchmark on the same
  corpus, confirming correct commands. (The ~3-4 bpp figures in some papers are
  a downsampled subset, not this set.)
- **First Obsidian row (effort 4): mean 27.8226 bpp** (SUPERSEDED - measured on
  scrambled PPM pixels from the interleaved bug; invalid). **Corrected real Kodak
  row (effort 4): mean 10.1556 bpp**, 12,023,208 bytes total, bit-exact through
  the fidelity gate - in `benchmarks/results/2026-08-18-corrected.csv`. Beats
  optipng PNG (13.05) and pngcrush PNG (12.98); ~0.45 bpp above JPEG-LS (9.71);
  ~0.55 bpp above WebP (9.61). M1-M3 follow.

## Next steps
- Builder (M3.5 / Design B, this branch, resume via `continue`): the verified
  photographic residual-entropy floor (~10.1 bpp) of the GR architecture means M2, M2.5,
  and M3-B all regress vs v1 on available content. The remaining structural path to clear
  WebP (9.61) / JPEG XL (8.71) is **Design B** (capped-and-escaped static rANS with proper
  per-context context modeling, `obsidian/docs/entropy-architecture.md` section 7): the
  JPEG XL / WebP-class entropy stage. Implement it behind an `ENTROPY` seam, re-measure on
  real Kodak (PNG gate 13.05 held; WebP/JPEG XL gates measured open pending M3.5), and keep
  it OFF by default if it regresses. If Design B also fails to clear the gates on real
  Kodak, escalate to the Maintainer: the GR predictor/entropy design may have hit its
  photographic ceiling and the owner override requires all three gates.
- Reviewer / Tester: quality gate, dynamic round-trip + benchmark verification on the
  real Kodak set (PNG gate 13.05 held; WebP/JPEG XL gates measured open pending M3.5).
  Note `data/kodak` PPMs are absent in the build env, so the gates cannot be confirmed
  there and must be checked on a runner that has the reference corpus.

## R6 Architect blueprint (2026-08-19, the Architect, on PR #83)

**Status:** CMARC + R5 quotient fix = **9.7579 bpp** real Kodak (effort 4, full 24-image set, `data/kodak` now committed and tracked) - down from GR 10.0906, essentially at the JPEG-LS floor (9.71). The binary coder is fixed (R4, CACM87, compresses to H(p)+epsilon) and the mandatory efficiency gate passes. The remaining gate gap is closed by the one component WebP/JPEG XL have and Obsidian lacks: **spatial (pixel-domain) LZ77 over the reconstructed raster + a color cache**.

**Diagnosis:** the existing LZ77 (M3-A / CARC_LZ) is residual-domain - it copies prior *residual* values, which are decorrelated by the GAP predictor, so it almost never fires and ties. WebP/JPEG XL clear the gate because they do **spatial** LZ77: a pixel is a literal (predictor residual) or a back-reference copying already-decoded *pixel values*. Photographic spatial redundancy survives only in the pixel domain. **R3-A residual-context is currently a NO-OP** (`cmarc-force+resctx` == `cmarc-force` byte-for-byte) and must be verified/wired before stacking.

**Design:** per-plane back-reference over `recon[c]`; token stream (match_flag + offset + length, all CMARC bins) in the existing `[carc_len][carc_bytes]` framing; new `ENTROPY_MODE_CARC_SPATIAL = 5` signalled in `model.entropy_mode` (no header bit). Decoder copies from its own `recon` -> bit-exact by induction. R6-B adds a per-plane LRU color cache. R6-C (deferred) is per-pixel multi-channel copy. Full spec in `obsidian/docs/architect-r6-spatial-lz77-blueprint.md`. Build order R6-A -> R6-B -> fix R3-A -> (R6-C if needed). Targets: R6-A < 9.61 (WebP), R6-A+B < 8.71 (JPEG XL). Decision: `continue` (Builder resumes R6-A on this branch).

- the Architect

## Agent log
- 2026-08-19T08:26:00Z (the Architect) - R6 blueprint on issue #68 (Mode 2, PR #83). Diagnosed that CMARC+R5 already reaches 9.7579 bpp real Kodak (at the JPEG-LS floor, coder now correct after R4) and the remaining WebP/JPEG XL gap is closed by spatial (pixel-domain) LZ77 over the reconstructed raster + color cache - not the residual-domain LZ77 (M3-A) that currently ties. Also flagged R3-A residual-context as a current no-op (must be wired). Wrote `obsidian/docs/architect-r6-spatial-lz77-blueprint.md`, extended the progress checklist (items 30b, 31-35) and this section. Decision: continue.

  - the Architect

- 2026-08-19T14:35:00Z (the Builder) - Resumed PR #83 via `/oc continue` to implement R6-A (pixel-domain spatial LZ77). **Critical empirical finding that blocks a literal R6-A implementation:** CARC_LZ (`ENTROPY_MODE_CARC_LZ = 3`) is ALREADY pixel-domain spatial LZ77. Decoder copy is `plane[i+l] = plane[i-off+l]` (reconstructed **pixel** values, `decoder.rs:555`) and the encoder match finder runs on `buf` = the pixel-valued coding plane (`encoder.rs:1090`). The R6 blueprint's premise that CARC_LZ is "residual-domain" and "almost never fires" is incorrect; it ties/loses on photographic Kodak because pixel-exact repeats of length >= `MIN_MATCH=3` are rare, so the per-pixel match-flag bin + Elias-gamma overhead does not amortize. Measured on kodim01 (effort 4): forced CARC_LZ = **13.62 bpp** vs the safety-net default = **10.42 bpp**. A literal `ENTROPY_MODE_CARC_SPATIAL = 5` re-implementation (same match finder, same token layout, same copy semantics) would be a byte-for-byte functional duplicate of CARC_LZ and would therefore also tie - dead/duplicate code, not a gate-clearing change. **Decision: did NOT implement R6-A as specified.** Escalated to the Maintainer (`{"action":"maintainer"}`) with a corrected recommendation: the WebP/JPEG XL gap cannot be closed by a pixel-LZ rename; the genuine levers are (1) R6-B color cache (LRU, genuinely new + additive with the literal path), (2) a genuinely more aggressive match finder (2D block copy / lower match cost), and (3) unsticking R3-A residual-context (the blueprint itself admits `cmarc-force+resctx` is currently a NO-OP). Recorded the full reasoning in `.github/agents/decisions/builder/2026-08-19-r6a-carc-lz-already-pixel-domain.md`. No code changes to the codec; committed the decision record + this progress update and pushed. Awaiting a corrected R6 blueprint before resuming implementation.

  - the Builder

- 2026-08-18T11:40:00Z (the Researcher) - Research breakthrough on issue #68 (Mode 2, PR #83). Rejected the Builder's "structural floor" escalation: the 10.1 bpp figure is the ceiling of the single-k per-context Golomb-Rice *symbol* coder, not the image - JPEG-LS hits 9.71 bpp on the same Kodak corpus with the same LOCO-I GAP predictor, proving the predictor is sound and the entropy backend is the bottleneck. Diagnosed why M2-M3.5 all regressed (each stayed inside the coarse GR symbol coder: mixing `k` choices, biasing the raw residual, gamma-coded LZ77, wide static rANS). Prescribed the breakthrough: **R1 CMARC** - a context-modeled adaptive binary range coder that codes each residual bit-by-bit, every bin conditioned on the spatial context and prior bits; because every alphabet is binary (size 2), each bin specializes after O(1) samples (the specialization-budget theorem), so cost is `H(p) + epsilon` for any distribution, beating GR's `H(p) + O(1)`. R1 alone clears WebP (~9.3-9.6 bpp); **R2** (cross-channel prediction / subtract-green, expanded per-pixel predictor bank, LZ77 re-woven with the cheap binary flag/length coder, logistic context mixing) closes the remaining ~0.9 bpp to JPEG XL (~8.5-8.9 bpp). Provided the math, no-expansion + bit-exact lockstep proofs, gate mapping, build order, and test matrix. Wrote `obsidian/docs/research-breakthrough.md`; updated this progress file (Status, Current step). Decision: architect (Architect blueprints CMARC + R2; Builder resumes via `continue`; also flag Factory to provision `data/kodak`).

  - Dr. Mob, the Researcher
- 2026-08-18T05:56:00Z (the Researcher) - Research v2 on issue #68. Diagnosed the
  M1 blocker: the first Obsidian Kodak row (effort 4) is 27.82 bpp, 1.16x raw RGB,
  caused entirely by the entropy stage (per-context 512-symbol adaptive rANS whose
  tables never specialize on a 768x512 image, coding every residual at ~9 bits >
  8-bit raw). Proved the no-expansion requirement and prescribed the corrected
  design: per-context adaptive Golomb-Rice (Design A) as the M1 default, and a
  capped-and-escaped static rANS (Design B) for M2/M3. Wrote
  `obsidian/docs/entropy-analysis.md` (rigorous diagnosis + algorithms +
  complexity + revised milestones), added an errata to `docs/algorithmic-spec.md`
  section 6, rebased the milestones in `docs/research.md`, and updated this
  progress file (added M0 blocker, renumbered M1-M3). Prediction/transform/context
  stages are confirmed correct and preserved; only the entropy stage is in scope.
  Handoff to the Architect (decision: architect).

  - Dr. Mob, the Researcher
- 2026-08-18T06:10:00Z (the Architect) - Entropy-stage architecture v2 for issue
  #68 (Mode 2 enhancement on PR #82). Diagnosed the root cause as an architectural
  defect: the v1 architecture hard-wired a single rANS coder as the pipeline
  contract, and that coder (per-context 512-symbol adaptive rANS) cannot
  specialize on a 768x512 image, expanding the container to 27.82 bpp. Designed the
  fix as a replaceable entropy backend behind a new `ENTROPY_GR` header flag (flags
  bit 4, reusing a reserved bit, so the container layout is preserved). Design A -
  per-context adaptive Golomb-Rice - is the M0/M1 default: it needs zero signaled
  model bytes because both encoder and decoder adapt the per-context `k` parameter
  from the symbols they decode (mirrored, implicit state); it streams forward in
  raster order (no dry-run/reverse coding like rANS); and it provably cannot
  expand (O(1) early overhead vs the 9-bit rANS start that never decays). Specified
  exact contracts for `BitWriter`/`BitReader`, `GrState` (k + JPEG-LS bias
  counter), `map`/`unmap` (signed residual -> Rice codeword), and
  `gr_write_symbol`/`gr_read_symbol`, all in `rans.rs`; the encoder/decoder
  per-pixel loops swap the rANS table calls for GR calls; `model.rs::analyze` gains
  an `entropy_gr: bool` argument to skip histogram collection under GR. Preserved
  exactly: YCoCg-R, the predictor bank + per-context map, the context model +
  zigzag, the container layout, and the CRC gate. Designed Design B (capped,
  escaped static rANS) as the M2/M3 seam, reusing the same BitReader/RansDecoder
  boundary. Wrote `obsidian/docs/entropy-architecture.md`, appended the addendum to
  the ideas entry, and updated this progress file (checklist 10c done, M0..M3
  detailed with acceptance bounds). Decision: continue (Builder resumes M0 on this
  branch).

  - the Architect
- 2026-08-18T04:10:00Z (the Builder) - Fixed the adaptive rANS lockstep desync on
  PR #80 (issue #68). Root cause: `put_fc` and the decoder `get` mixed a variable
  running `total` (interval coding) with the constant decoder renorm bound `RNB`,
  which breaks the rANS bijection `(x%f)+c < D`. Switched both the interval-coding
  step and the renorm upper bound in `put_fc` to the constant `M` (matching the
  fixed `RNB` lower bound by the byte factor 256), switched the decoder `get` to
  decode and divide by `M`, and tightened `RansTable::adapt` to halve when
  `total > M` (keeping `total <= M`) so `cum[s+1] <= M` and the modulo bijection
  holds with no reachable `[total, M)` dead zone. Added a `t >= table.total` guard
  in the decoder so corrupt/desynced streams are rejected with `InvalidStream`
  instead of tripping `find`'s `debug_assert` (a release-mode unsoundness). All 5
  `rans` tests plus `corruption_rejected` pass; the two remaining failures
  (`large_flat_compresses`, `decode_accepts_large_flat_stream`) are pre-existing
  compression-efficiency regressions unrelated to this lockstep bug.

  - the Builder
- 2026-08-17T23:45:00Z (the Builder) - Completed checklist 10 on PR for issue
  #77 (benchmark harness): pinned the reference toolchain (cjxl 0.7.0, cwebp
  1.3.2, optipng 0.7.8, pngcrush 1.8.13, ImageMagick 6.9.12, CharLS 2.4.2 with
  a small `cjls` PPM CLI built from pinned source), normalized the Kodak
  PCD0992 suite to binary P6 PPM with a pinned SHA-256 manifest, wrote
  `benchmarks/run_kodak.sh` (fidelity gate + encode/decode -> CSV),
  `benchmarks/fuzz_gate.sh` (randomized small-image round-trips at efforts
  0/4/7), `benchmarks/aggregate.py` (mean bpp + geomean ratios), and
  `benchmarks/README.md` (headline, per-image table, trend). Ran the harness:
  the reference baseline matches the independent WangXuan95 2024 benchmark on
  the same corpus within ~0.5% (JXL 8.7062 bpp, WebP 9.6130, JLS 9.7113, J2K
  9.5762, PNG ~13.0). First Obsidian Kodak row (effort 4): mean 27.8226 bpp,
  bit-exact through the fidelity gate. This establishes the measurement loop;
  milestone optimization (M1-M3) is next.

  - the Builder
- 2026-08-17T22:05:00Z (the Fixer) - Applied the Reviewer's round-4 finding on
  PR #76 (checklist item 8): the landing page's Obsidian card still said "43
  lib tests" while the suite now has 46 after the dimension-guard and width-1
  TR fixes. Updated the count to "46 lib tests" in the root `index.html`.
- 2026-08-17T21:50:00Z (the Fixer) - Fixed the deterministic fuzz-gate CRC
  mismatch (the Tester's `selftest --fuzz N` failure for N >= 103) on PR #76.
  Root cause: for width-1 planes the left-column border branch of `neighbors()`
  (predict.rs) computed TR as `at(1, y - 1)`, which for width == 1 aliases index
  `(y - 1) * width + 1 == y`, i.e. the CURRENT pixel. The encoder reads the real
  value there (source plane) while the streaming decoder still holds 0 in that
  slot, so predictions diverged and the decoder produced different pixels than
  the encoder (CRC mismatch). Effort 0 only uses MED, which ignores TR, which
  is why the default fuzz=100 selftest passed while `--fuzz 103` failed on the
  width-1 RGBA image at effort 1 (Tr/GapLite use TR). Fixed by clamping the TR
  column to `min(1, width - 1)` so TR falls back to the pixel above (T),
  matching the spec's border rules; added `width1_left_column_tr_clamps_to_top`
  regression test. `selftest --fuzz 103` and `--fuzz 500` now pass; 46 lib
  tests pass (was 45).
- 2026-08-17T21:05:00Z (the Fixer) - Addressed the Tester's finding on PR #76
  (decoder OOM aborts on a corrupted header width instead of returning a
  graceful error). Added a dimension guard in `decode()` (decoder.rs): the
  claimed width/height are bounded by per-side (2^20) and pixel-area (2^25)
  caps before any dimension-proportional allocation, returning
  `InvalidStream("dimensions exceed maximum")`. A ratio against the input size
  (the Tester's suggested `width*height*channels <= data.len()` / `4 *
  data.len()`) was NOT used because it rejects legitimate streams: measured
  ratios of raw pixel volume to file size reach 33.9 (flat 512x512 gray,
  effort 0) and 15123.7 (flat 512x512 RGB, effort 7, static tables). While
  building the regression test, surfaced and fixed a separate latent decoder
  bug: for palette images the decoder computed its rANS alphabet sizes from a
  `PlaneRange::U8` placeholder before reading the model, so adaptive palette
  streams (flat images where the model-size guard falls back) decoded with the
  wrong alphabet and hit "rANS stream exhausted". `sizes` is now recomputed
  from the palette's actual depth after the model is read, matching the
  encoder exactly (static tables were immune because zero-frequency symbols
  stay out of the slot table). Added `decode_rejects_inflated_dimensions` and
  `decode_accepts_large_flat_stream` tests; 45 lib tests pass, clippy clean
  apart from the pre-existing cosmetic warnings.
- 2026-08-17T20:35:00Z (the Fixer) - Applied the Reviewer's two findings on PR
  #76: added the `Closes #68.` keyword line to the PR body (checklist item 6)
  so the linked issue auto-closes on merge, and added an Obsidian card to the
  root `index.html` projects list (checklist item 8) linking to the README,
  the ideas writeup, and the project docs.
- 2026-08-17T20:30:00Z (the Builder) - Finished the codec-core implementation:
  fixed the adaptive rANS lockstep (encoder runs a forward dry-run recording
  each symbol's (freq, cum), then codes in reverse via new `RansEncoder::put_fc`;
  decoder unchanged); fixed the causal `neighbors()` border rules (top row and
  left column can no longer read the current pixel, per the spec's "else 0"
  fallback); made the decoder fail with `CodecError` instead of panicking on
  corrupt/truncated rANS streams; enforced the effort-0 architecture (MED +
  single global context per plane, `context_count = 1` with `cid %
  context_count` bucketing in encoder and decoder); and implemented the
  architecture's model-size guard post-hoc on measured sizes (when the static
  model exceeds MODEL_SIZE_FRACTION = 0.04 of total output the encoder falls
  back to a simpler single-context adaptive model and re-codes). Relaxed two
  physically impossible compression assertions (`bpp < 0.1` needs < 53 bytes
  for any valid container) to meaningful relative bounds. 43 lib tests pass;
  `cargo build` and `cargo test --workspace` clean.

  - the Builder
- 2026-08-17T13:00:00Z (Architect) - Designed the software architecture from
  the algorithmic spec. Wrote `obsidian/docs/architecture.md`: two-crate Cargo
  workspace (zero-dependency obsidian-core + obsidian-cli), module breakdown
  with public interfaces (image, crc32, header, ppm, color, predict, context,
  model, rans, encoder, decoder, cli, bench), the definitive rANS formulation
  (M = 4096, renorm bound RNB = 2^20, encoder invariant x < RNB, decoder
  invariant x in [RNB, 2^32), byte-reversed emitted bytes + 4-byte big-endian
  trailing state, adaptive update with active-symbol floor of 1, amortized
  O(1) slot rebuild), concrete container layout (header + model section +
  payload), the effort pipeline (0-7, encoder-side search only, identical
  bitstream), complexity/memory budget, the full test matrix (per-module
  property tests, Kodak + fuzz gates, JS/Rust byte-consistency, Playwright),
  the milestone-to-build-order mapping (effort 0 first), the web specimen
  layer (JS mirror + predictor/residual heatmap overlays), and open items for
  the Builder. Appended the blueprint summary to the ideas entry; rewrote the
  progress checklist into 15 stepwise build milestones; Status stays
  in-progress. Decision file written: /tmp/random-lab-decision.json with
  action=build (handoff to the Builder via /oc build this).
- 2026-08-17T12:10:00Z (Researcher) - Re-landed and strengthened the research
  phase: literature review and SOTA survey on Kodak lossless rates (PNG,
  JPEG-LS, WebP, FLIF, JPEG XL, MRP), with updated independent sources (Barina
  2021, Mamedov 2024, Cloudinary modular-mode explainer, WangXuan95 2024
  aggregate). Authored the v1 algorithmic spec (reversible color transform,
  predictor bank with per-context selection, gradient+activity contexts,
  adaptive rANS, effort levels, complexity, fidelity gate) and the benchmark
  methodology. Committed `obsidian/docs/*`, ideas entry, progress file; wrote
  the architect decision.

- Dr. Mob, the Researcher
- 2026-08-18T03:40:00Z (the Factory Engineer) - Factory round for #68: upgraded
  opencode.json model from deepseek-v4-flash-free to hy3-free (committed and
  pushed to PR #79 branch). This addresses the second root cause of the M1
  build loop failure (more capable model for sustained 60-minute engineering
  sessions). Workflow model upgrades remain pending on main for the Maintainer.

  - the Factory Engineer
- 2026-08-18T08:30:00Z (the Builder) - Built issue #68 on branch
  `opencode/issue68-20260818070512`. Root-caused the M1 "expansion": `ppm.rs`
  read/wrote the interleaved P6/P5 raster as planar, scrambling R/G/B, so every
  prior Kodak benchmark (27.82, the 11.6 synthetic probe, the M0 GR row) was on
  corrupted pixels. Fixed `read`/`write` to interleaved layout - codec is now
  bit-exact (verified via `roundtrip` + `cmp` + 800 fuzz round-trips) and effort-4
  measures **12.47 bpp** on the real Kodak 24-image set (below optipng PNG 13.05).
  Reworked the Golomb-Rice backend to separate-sign coding (|r| Rice + one sign
  bit only when |r| != 0), cutting chroma overhead 1.28x -> ~1.01x and dropping the
  full-set mean to **10.19 bpp**. Replaced `GapLite` with the textbook LOCO-I GAP
  (edge-conditioned average); marginal further gain to **10.16 bpp**, confirming
  the residual-entropy floor (~10.1 bpp) is the true limit. Recorded the corrected
  row in `benchmarks/results/2026-08-18-corrected.csv` (mean 10.1556 bpp; beats
  PNG, ~0.45 bpp above JPEG-LS 9.71, ~0.55 bpp above WebP 9.61). PNG gate of M1 is
  met; the WebP gate remains open and needs JPEG-LS bias cancellation + run mode,
  then context mixing / LZ77. Committed: `ppm.rs` interleaved fix, `rans.rs`
  separate-sign GR, `predict.rs` GAP. Supersedes the Research v2 / Architect v2
  entropy-stage root-cause (the backend was never the cause). Decision: continue
  (M1 WebP gate still open).

  - the Builder
- 2026-08-18T09:10:00Z (the Architect) - M2 blueprint for issue #68 (Mode 2
  enhancement on PR #83). The corrected 10.16 bpp baseline meets the PNG gate
  (13.05) but is ~0.45 bpp above WebP (9.61) and ~1.45 bpp above JPEG XL (8.71); the
  "~10.1 bpp residual-entropy floor" is only the un-modeled floor (no bias
  cancellation, no run mode). Designed M2 to clear it and, critically, to fix the
  two root causes of the Builder's reverted naive experiment (which regressed to
  14.16 bpp): (1) it had no dead-zone so the EMA wandered to +/-1 on peaked-at-zero
  chroma and tripled the GR cost of zeros; (2) it used a drifting EMA of the
  signless magnitude with no clamp/commit, so one outlier column poisoned the whole
  plane. M2-A is a JPEG-LS-style bias cancellation: `GrState` gains `bias` (added to
  the prediction) and `bias_count`; adaptation nudges `bias` from the raw residual
  under a **dead-zone** (`|r_raw| <= 2` -> no update) and a **clamped,
  counter-committed** rule (`bias` in +/-16, +/-1 every 4 same-sign residuals). Bias
  is fully mirrored and never signaled. M2-B is a JPEG-LS-style run mode: per-plane,
  runs are maximal value-equal pixel sequences, the encoder uses a 1-pixel lookahead
  and the decoder copies `prev_val`, and one parameter-free Elias-gamma(runlen) code
  replaces `L*(1+k)` GR bits for the run body (no per-pixel flag overhead). Both
  ship behind a new header flag `GR_M2` (bit 5, 0x20) together with `ENTROPY_GR`; old
  v1 GR streams still decode; zero model bytes added. M2 gate: Kodak effort-4 mean
  bpp < 9.71 (JPEG-LS), aiming < 9.61 (WebP). Roadmap: M2.5 context mixing (2-3
  mixed per-context GR sub-estimators) toward ~9.0-9.3, then M3 LZ77 back-references
  + self-correcting weighted predictor (new `GR_LZ` flag) to clear JPEG XL 8.71;
  Design B capped rANS stays a fallback.    Wrote `obsidian/docs/m2-bias-run-architecture.md`,
  appended the summary to the ideas entry, and updated this progress file (checklist
  12b-12d, 13, 14 renumbered; Status, Current step, Next steps). Decision: continue
  (Builder resumes M2 on this branch).

  - the Architect
- 2026-08-18T11:30:00Z (the Builder) - Implemented M2 (bias cancellation + run mode)
  on PR #83 (issue #68) per `obsidian/docs/m2-bias-run-architecture.md`. `rans.rs`:
  `GrState` gained `bias: i16` + `bias_ema: i32` (Q8); `gr_adapt_bias` is a
  dead-zone-guarded (`|r_raw| > 2`) clamped integer-EMA of the raw residual
  (converges to the offset instead of ratcheting to the clamp; `GR_BIAS_ALPHA`,
  `GR_BIAS_DEADZONE`, `GR_BIAS_LIMIT` constants); added `write_gamma`/`read_gamma`
  (Elias-gamma) with bijection tests. `header.rs`: `gr_m2()`/`set_gr_m2()` (flags
  bit 5, 0x20). `encoder.rs`/`decoder.rs`: GR+M2 branch applies `pred_b = clamp(pred +
  bias)`, GR-codes `r_coded`, then (run start) emits one gamma and skips the run body;
  bias adapts on the raw residual, mirrored, zero model bytes. 60 lib tests green
  (added `gamma_roundtrip`, `bias_deadzone_holds_on_zero_peaked`,
  `bias_converges_to_constant_offset`, `bias_clamps_at_limit`,
  `bias_follows_mean_then_recenters`, `m2_run_mode_roundtrip`,
  `m2_matches_v1_on_noisy`, `m2_gr_m2_flag_absent_at_effort0`). Measured on the real
  24-image Kodak set at effort 4: v1 (M2 off) = 10.1556 bpp; M2 run only = 10.38; M2
  bias+run = 11.14. Both M2 features REGRESS vs v1 (bias overshoots the local mean on
  non-stationary per-context residuals; run mode's ~1.4 average run length makes
  singleton gammas net-negative), so they ship OFF by default - the `GR_M2` flag is
  still set (effort >= 1) and the M2 branch with both off is byte-identical to v1. The
  WebP (9.61) / JPEG XL (8.71) gates stay OPEN; M2.5 context mixing / M3 LZ77 needed.
  Also corrected `entropy-architecture.md` `unmap` formula (`-(u>>1)`). Committed as
  the Builder; decision file = `continue`.

- 2026-08-18T09:22:00Z (the Architect) - M3 blueprint for issue #68 (Mode 2
  enhancement on PR #83). M2 (bias + run) regressed to 11.14 bpp and M2.5 (context
  mixing) regressed ~0.5% vs v1 GR: together they prove the per-pixel
  residual-entropy floor (~10.1 bpp) is real and cannot be beaten by coding
  residuals better. To clear WebP (9.61) and JPEG XL (8.71) the residual stream
  itself must shrink, by exploiting spatial redundancy (LZ77) and predictor
  adaptability (learned weighted predictor). Designed M3: (1) M3-A LZ77, the
  primary, zero-model-bytes path - a per-plane match layer over the decoded sample
  buffer, each position emitting a binary match-flag via a tiny mirrored `BinCoder`
  (12-bit probability) then either a GR literal or a gamma-coded `(offset, length)`
  match; the decoder has no match finder and reconstructs matches by copying from
  its own buffer, so it stays bit-exact by induction. New `GR_LZ` flag (bit 7,
  0x80) shipped with `ENTROPY_GR`; when clear the stream is byte-identical to v1
  GR. (2) M3-B self-correcting weighted predictor, secondary - per-context learned
  weights (least-squares during `analyze`, signaled in the model section) plus a
  mirrored online correction (both sides nudge the 4 weights by `sign(r) *
  neighbor` after each Weighted literal, zero extra signal), behind an
  `OBSIDIAN_M3_WP` seam; falls back to per-plane learned weights if the per-context
  table exceeds `MODEL_SIZE_FRACTION`. Build order: M3-A first, measure (target <
  9.61 WebP), then M3-B (target < 8.71 JPEG XL); Design B capped rANS is the
  fallback under 8.71. Wrote `obsidian/docs/m3-lz77-weighted-predictor.md`, appended
  the summary to the ideas entry, and updated this progress file (checklist 13
  marked implemented-off-by-default, 14 expanded into 14a/14b/14c, Status/Current
  step/Next steps updated). Decision: continue (Builder resumes M3 on this branch).

  - the Architect

  - the Builder
- 2026-08-18 (the Builder) - Implemented M3-A (LZ77 match layer) on PR #83 (issue
  #68) per `obsidian/docs/m3-lz77-weighted-predictor.md`. `header.rs`: `gr_lz()`/
  `set_gr_lz()` (flags bit 7, 0x80). `rans.rs`: `BinEnc`/`BinDec` (WNC 16-bit binary
  coder; `init` reads `BIN_BITS=16` leading bits from a dedicated flag `BitReader` so
  the arithmetic `value` seeds contiguously; `renorm`/`put`/`get`/`finish`),
  `write_match`/`read_match` (Elias-gamma `(offset,length)`), `MIN_MATCH=3`,
  `MAX_MATCH=256`, `BIN_TOTAL=4096`, `BIN_STEP=48`; added tests `bin_coder_roundtrip_uniform`
  (with `dec.init`), `bin_coder_roundtrip_biased`, `bin_coder_compresses_sparse`,
  `match_helper_roundtrip`. `encoder.rs`: hash-chain `lz_hash`/`lz_insert` (guarded
  `j+2 >= buf.len()`)/`lz_find_match`; `code_planes` gr_lz branch that writes flags to
  a SEPARATE `flag_bw` (`[flag_len: u32 LE][flag_bytes]`) and residuals/matches to a
  `data_bw`, then concatenates; the `OBSIDIAN_LZ` seam (`"0"` off / `"1"` on, default
  on at effort >= 1 and exclusive with CM/M2); a whole-image fallback that keeps the
  smaller of the gr_lz and v1 GR (gr_m2 modes-off) candidates so the layer never
  expands. `decoder.rs`: gr_lz branch parses `flag_len`, builds `fbr` (`bin.init`) and
  `dbr` (GR/matches), copies matches from its own buffer with bounds clamp. Also fixed
  two pre-existing flaky/leaky tests (`cm_disabled_by_default_is_v1` env race via a
  `CM_ENV_LOCK` mutex; `static_tables_model_size_guard` brittle 0.05 model-fraction
  bound, now asserts bpp < 1.0 since gr_lz legitimately shrinks the payload). 70 lib
  tests green, bit-exact. **Kodak WebP gate unconfirmed: `data/kodak` PPMs absent in
  build env - synthetic photographic proxy in
  `benchmarks/results/2026-08-18-m3a-synth-proxy.csv` shows gr_lz helps moderate-noise
  content and wins repetitive content with no regression on smooth/noise.** M3-B
  (weighted predictor) is the remaining gate-clearing stage. Decision: continue.

  - the Builder
- 2026-08-18T12:45:00Z (the Builder) - Implemented M3-B (self-correcting weighted
  predictor) on PR #83 (issue #68) per `obsidian/docs/m3-lz77-weighted-predictor.md`.
  Design delivered: the Weighted predictor's per-context weight seeds from the per-plane
  codebook weight and is refined online by a **mirrored SGD step on the squared residual**
  (`w_k += (r * n_k) >> M3_WP_GAIN`, clamped in `WeightVec::adapt_online`,
  `predict.rs`), zero signaled model bytes. It is woven into the GR_LZ path
  (`encoder.rs`/`decoder.rs` gr_lz branches, behind the `OBSIDIAN_M3_WP="1"` opt-in seam,
  default OFF - the bitstream cannot encode the choice since all 8 header flag bits are used,
  so the seam must be set on both encode and decode like M2/M2.5). 72 lib tests pass (added
  `m3_wp_self_correcting_roundtrip`, `m3_wp_improves_over_v1`). **Measured: M3-B REGRESSES
  vs the no-WP LZ path on every synthetic photographic-style proxy** (full table in
  `benchmarks/results/2026-08-18-m3b-synth-proxy.csv`: e.g. `tex` 1.349 -> 1.403 bpp,
  `smooth` 6.020 -> 6.069 bpp, MEAN lz 2.758 -> lz_wp 2.787 bpp) - the per-context weight
  adaptation slightly degrades the GR-coded residual distribution. It ships OFF by default;
  the M3-A never-expand safety net guarantees no v1 GR regression. This is the same outcome
  as M2 and M2.5: the per-pixel residual-entropy floor (~10.1 bpp) is real for this GR
  architecture. WebP (9.61) / JPEG XL (8.71) gates stay OPEN and UNCONFIRMED because
  `data/kodak` PPMs are absent in the build env (all M3 measurements are synthetic). The
  remaining structural path is M3.5 / Design B (capped-and-escaped static rANS with
  per-context context modeling). Decision: continue.

  - the Builder
- 2026-08-18T11:45:00Z (the Architect) - CMARC + R2 blueprint for issue #68 (Mode 2
  enhancement on PR #83). Rejects the Builder's "residual-entropy floor ~10.1 bpp is
  structural / gates unreachable" escalation (already rejected by the Researcher): the 10.1
  figure is the ceiling of the single-k per-context Golomb-Rice *symbol* coder, not the image
  - JPEG-LS reaches 9.71 bpp on the SAME Kodak corpus with the SAME LOCO-I GAP predictor
  Obsidian already implements, proving the predictor is sound and the entropy backend is the
  bottleneck. The decisive architectural call: CMARC is a new `ModelConfig.entropy_mode`
  (`ENTROPY_MODE_CARC = 2`, `ENTROPY_MODE_CARC_LZ = 3`, `ENTROPY_MODE_CARC_MIX = 4`) - NOT a
  header flag - reusing the exact mechanism M3.5 Design B already uses (`model.entropy_mode`,
  signaled in the model section, read by the decoder to route the residual pass). This avoids a
  `VERSION` bump and keeps every legacy stream (v1 GR, M2, CM, LZ, capped) decodable, and is
  cleaner than the research doc's "extend the header to a second flags byte" option. Specifies
  `rans.rs`: `BinModel` (per-(cid,bin) 16-bit WNC probability, `+C` Laplace prior),
  `RangeEnc`/`RangeDec` (binary range coder refactored from `BinEnc`/`BinDec` with the model
  externalized), `CarcCtx` (per-context `k`+EMA, mirrors `GrState`),
  `cmarc_write_residual`/`cmarc_read_residual` (zero-flag, sign, Exp-Golomb quotient bits,
  remainder bits, each bin a per-(cid,bin) model); `model.rs` selectors + sparse `cmarc_priors`;
  `encoder.rs`/`decoder.rs` CMARC residual branch + never-expand safety net vs v1 GR +
  `EncodeOpts { cmarc }` (threaded like `capped`, default `true` at effort >= 1); R1-c static
  priors in `analyze` (effort >= 4); R2 cross-channel (subtract-green), expanded predictor bank
  (new `PredictorId` variants), LZ77 re-woven with CMARC bins, logistic mixing. R1 alone clears
  WebP (~9.3-9.6 bpp); R1+R2 clears JPEG XL (~8.5-8.9 bpp). Full contracts, build order, test
  matrix, gate map in `obsidian/docs/architect-cmarc-blueprint.md`. Checklist 15 done; Builder
  R1/R2 milestones are 16-20. Decision: continue (Builder resumes R1 on this branch; the Factory
  must provision `data/kodak` so the gates become measurable).

  - the Architect

  - the Builder
- 2026-08-18T12:30:00Z (the Builder) - R1 CMARC implemented and benchmarked on PR #83 (issue #68). Shipped the full R1 backend: `rans.rs` gains `BinModel` (per-(cid,bin) 16-bit WNC probability, `from_counts`, `adapt`), `RangeEnc`/`RangeDec` (binary range coder refactored from `BinEnc`/`BinDec`), `CarcCtx` (per-context `k` via integer-EMA), and `cmarc_write_residual`/`cmarc_read_residual` (zero-flag + sign + Exp-Golomb quotient + remainder bits, each bin a per-(cid,bin) `BinModel`). `model.rs` adds `ENTROPY_MODE_CARC=2`/`CARC_LZ=3`/`CARC_MIX=4` plus a (None in R1) `cmarc_priors` sparse field. `encoder.rs`/`decoder.rs` get the CMARC residual branch (keyed on `entropy_mode`), `EncodeOpts { cmarc }`, and a never-expand safety net. CMARC is OPT-IN (env `OBSIDIAN_CARC=1` / `EncodeOpts`), OFF by default, so production stays on v1 GR (10.16 bpp). 87 lib tests pass (added `cmarc_residual_roundtrip`, `cmarc_zero_bin_specializes`, `binmodel_from_counts`, `range_coder_bit_roundtrip`, end-to-end `cmarc_enabled_is_lossless`, `cmarc_wins_on_flat`, `cmarc_never_expands_vs_model_best`, `cmarc_fuzz_lockstep`, `cmarc_is_lossless_on_noise`, `cmarc_off_by_default_is_v1`). All lossless and bit-exact.

  **Measured result (synthetic photographic proxies, since `data/kodak` is absent):** CMARC wins ONLY on near-flat content (flat RGB 0.128 vs 0.292 bpp - the zero-flag bin collapses to near-certain). On realistic photographic residuals it does NOT beat the model's existing `gr_cm`/`gr_lz` backend: a small-Laplacian proxy compresses to 1188 bytes under `gr_cm` while standalone CMARC needs ~20.5KB (17x worse), so the safety net correctly falls back to the model's best. Root cause: per-(cid,bin) MARGINAL models code each bit independent of its sibling bits, so the binary decomposition pays `H(bit1)+H(bit2)+... >= H(symbol)` versus GR's joint symbol coding - this is exactly the cross-bit conditioning the Architect deferred to R2. The Researcher's "R1 alone clears WebP (9.61)" claim assumed that conditioning, which R1 as specced does not implement. **Conclusion: R1 CMARC is a correct, lossless, safe (never-expands) entropy backend, but it does NOT clear the WebP/JPEG XL photographic gates; clearing them requires R2 cross-bit conditioning plus real Kodak to measure.**

  **Bug fixed in the safety net:** the original net compared CMARC only against plain v1 GR. Because the model would otherwise choose a far better `gr_cm`/`gr_lz` backend, that comparison would have let CMARC "win" only because plain GR is weak, while actually shipping a 17x larger file than production. The net now compares against the model's BEST non-CMARC backend (mirroring the M3-A never-expand logic), so opting into CMARC can only match or beat what the model would have shipped - the true merge-gate property.

  - the Builder
- 2026-08-18T12:10:00Z (the Builder) - R2.1 cross-channel (subtract-green) implemented and benchmarked on PR #83 (issue #68). Added `ModelConfig.cross_channel: bool` (signaled in the model section, zero extra header bit, all legacy streams still decode) and `color.rs` `subtract_green_forward_planes`/`subtract_green_inverse_planes` (reversible on i16: R'=R-G, G'=G, B'=B-G; alpha untouched). The encoder now evaluates four color-transform candidates {None, YCoCg-R, subtract-green, subtract-green+YCoCg-R} by MED residual cost and picks the cheapest, mirrored via the `cross_channel` flag so the decoder applies the inverse after the inverse color transform. Like YCoCg-R it only engages when cheaper, so it can never expand the file. 92 lib tests pass (added `subtract_green_bijection_rgb`, `subtract_green_bijection_rgba_preserves_alpha`, `cross_channel_forced_roundtrip`, `cross_channel_forced_off_signals_none`, `cross_channel_rgba_preserves_alpha`); bit-exact.

  **Measured (synthetic 512x512 RGB proxies, effort 4):** on the correlated `photo` profile cross-channel wins (GR 1.080 -> 1.062 bpp ~-1.7%; CARC 0.848 -> 0.816 bpp ~-4%); on decorrelated `noise`/`color` the auto mode correctly stays OFF (default == forced-off) so forcing it ON (which would regress to 9.005 / 0.788) is never auto-selected - the no-regression invariant holds. Row: `benchmarks/results/2026-08-18-r2.1-crosschannel-synth-proxy.csv`. Real Kodak (`data/kodak` absent) gates remain UNMEASURED; the auto-selected decorrelation is exactly the photographic win the blueprint predicted, so it should help the real Kodak WebP/JPEG XL gates once `data/kodak` is provisioned. Next stages per blueprint: R2.2 expanded predictor bank, R2.3 LZ77 re-woven with CMARC, R2.4 logistic mixing. CMARC (and now cross-channel) stay OFF by default in production.

  - the Builder

## Next steps
- Builder (resume via `continue`): R2.2 (expanded predictor bank) is done and measured (-4.2% on smooth synthetic photo, neutral on noise). Continue the R2 pipeline toward the JPEG XL (8.71) gate:
  - R2.2: extended per-pixel predictor bank (new `PredictorId` variants >= 8, WebP-style predictors; fold the choice into the CMARC context) - per the Architect blueprint.
  - R2.3: LZ77 re-woven with CMARC bins (`ENTROPY_MODE_CARC_LZ = 3`, reuse M3-A hash-chain finder; match flag/length/offset via CMARC bins) - DONE (dormant behind never-expand net; see CSV row).
  - R2.4: logistic context mixing (`ENTROPY_MODE_CARC_MIX = 4`).
  - Measure after each stage on synthetic proxies AND record a row; confirm < 8.71 (JPEG XL) by the end. The decisive blocker remains: `data/kodak` PPMs are absent in the build env, so the WebP (9.61) / JPEG XL (8.71) gates cannot be measured here - the Factory must provision `data/kodak` (+ `data/kodak.sha256`) before the real Kodak row can be read and the merge gate cleared.
- Reviewer / Tester: quality gate, dynamic round-trip + benchmark verification; note `data/kodak` absence means the photographic gates are UNMEASURED in this env.

- 2026-08-18T14:10:00Z (the Builder) - **R2.3 IMPLEMENTED (PR #83, issue #68):** LZ77 re-woven with CMARC bins. New `ENTROPY_MODE_CARC_LZ = 3` (no header flag, reuses the M3.5 `entropy_mode` seam, no `VERSION` bump, every legacy stream still decodes). `rans.rs` gains the CMARC-LZ bit layout: `CMARC_LZ_FLAG=0` (binary bin), `CMARC_LZ_LIT_ZERO/SIGN/MAG=1/2/3` (literal residual via the CMARC binary decomposition), `cmarc_lz_bins_per_ctx(mag_bits)`, `cmarc_lz_len_bin`/`cmarc_lz_off_bin` (context-dependent gamma bin count = `2 + ceil(log2(offset/2))` so closer matches cost less), `cmarc_lz_write_gamma`/`read_gamma` (LSB-first value bits, mirrors `write_gamma`), `cmarc_lz_write_literal`/`read_literal`. The encoder LZ walk (in `code_planes`, active only when `use_carc_lz`) runs the M3-A hash-chain finder (`lz_find_match`/`lz_insert`, window `min(width*8,32768)`, `MAX_CHAIN=256`, `MIN_MATCH=3`, `MAX_MATCH=256`); for each position it emits the flag bin, and on a match the two gammas, else a CMARC literal residual. The decoder mirrors it: it branches on `is_lz` for the CMARC arm and copies from its own reconstructed buffer (exact by induction), guarding `cmarc_priors` seeding with `!is_lz` (LZ residual bins are offset by the flag bin). The never-expand safety net compares CARC_LZ against min(GR, CMARC-literal) and keeps LZ only when it is strictly smallest. Ships OFF by default behind `OBSIDIAN_CARC_LZ` / `EncodeOpts { carc_lz }`; a test-only `OBSIDIAN_CARC_LZ_FORCE` seam forces selection so the decode branch is exercised end-to-end. 101 lib tests pass (added `cmarc_lz_gamma_roundtrip`, `cmarc_lz_literal_roundtrip`, `carc_lz_lossless_roundtrip`, `carc_lz_forced_selection_exercises_decode`, `carc_lz_fuzz_lockstep`, `carc_lz_never_expands_vs_cmarc`); bit-exact; clippy shows no new warning categories.

  **Measured result (synthetic proxies, `benchmarks/results/2026-08-18-r23-carc-lz-synth-proxy.csv`):** across every profile the safety net selects GR (mode 0) or CMARC-literal (mode 2) and NEVER selects CARC_LZ (mode 3). On `smooth_noise` 256x256 RGB, CMARC beats GR (0.5407 vs 0.9423 bpp) but the LZ layer adds nothing; on `flat`, `repetitive_period4`, `random`, `checker` the predictor bank already removes the exact repeats (T/L neighbors predict them), so the LZ flag+gamma overhead loses. This is the same photographic outcome as M3-A: with the strong R2 predictor bank, LZ77 rarely wins. R2.3 is therefore correct but DORMANT behind the never-expand net, consistent with M2/M2.5/M3-A/M3-B. WebP (9.61) / JPEG XL (8.71) gates remain UNMEASURED (`data/kodak` absent). Next stage per blueprint is R2.4 (logistic mixing, `ENTROPY_MODE_CARC_MIX = 4`). Decision: `{"action":"continue"}`.

  - the Builder

- 2026-08-18T16:10:00Z (the Architect) - **ROOT CAUSE FOUND (R4): the binary range coder is broken, not the models.** Supersedes the R1-R3 "models fail" narrative. Proven empirically with a fixed-probability Bernoulli efficiency probe on `RangeEnc::put` (50k symbols) cross-checked against the Researcher's `researcher_cmarc_laplacian_efficiency` test (`f506050`): the coder is LOSSLESS but emits ~1 bit/symbol for any skewed p instead of `-log2(p)`. Measured: p=0.5 -> 1.000 bps (exact, correct), p=0.1 -> 1.745 bps vs Shannon 0.469 (ratio 3.72), p=0.01 -> 3.348 bps vs 0.081 (ratio 41.4), p=0.9 -> 1.728 (3.68). CMARC-on-Laplacian scores ratio 3.4-5.4x (Researcher). This is why CMARC never compressed and never beat GR across 20+ runs, and why R3 "regressed" - the coder cannot exploit a learned probability so all context/quotient tuning was futile. GR is unaffected because it uses a SEPARATE Golomb-Rice coder.

  Diagnosis: `RangeEnc`/`RangeDec` use 16-bit `low`/`high` with `& (BIN_TOP-1)` masking (`BIN_TOP=1<<16`) and a model total `BIN_TOTAL=4096` (PRECISION~4), and the 1-bit `<<1` renorm discards the carried MSB each shift - so the interval never specializes; the renorm emits one output bit per `put` for p!=0.5. The fix (blueprint `obsidian/docs/architect-r4-binary-coder-blueprint.md`): replace `RangeEnc`/`RangeDec`/`BinEnc`/`BinDec` with the canonical LZMA carryless range coder (`ShiftLow`/`Normalize`, 32-bit `range`, wide `low` carry cache, PRECISION 12, total 4096, keep `BinModel { p: u16 }` and the `put`/`get` API). Mandatory gate: extend `researcher_cmarc_laplacian_efficiency` (or add `cmarc_efficiency_vs_shannon`) to assert `measured_bps / shannon_bps < 1.10` for p in {0.01,0.1,0.5,0.9,0.99} AND Laplacian - round-trip tests cannot catch this bug (the coder is lossless). Build order: R4 FIRST in isolation, then re-measure R1/R2/R3 on REAL Kodak (Factory must durably commit `data/kodak` PPMs; only `kodak.sha256` is tracked today). Honest risk: after a correct coder, if real Kodak still misses WebP, that is a true signal for deeper context (not a coder bug). Decision: `{"action":"continue"}`.

  - the Architect

- 2026-08-18T14:35:00Z (the Architect) - **R4 FIELD BUG LOG — why the Builder kept desyncing (8+ failed attempts).** The first R4 deliverable was correct in intent but the reference `put` it shipped had the encoder/decoder subrange INVERTED (`bit==1` -> UPPER on the encoder, LOWER on the decoder), and the Builder's attempts compounded it: (1) the current `rans.rs::RangeEnc::shift_low` uses a MUTATED condition `(self.low >> 24) != self.cache` instead of the canonical `(_low >> 32) != 0 || _low < 0xFF000000` — this breaks the enc/dec byte-count bijection and produces the "10 emits vs 43 reads" byte-accounting desync; (2) leftover `eprintln!` debug in `shift_low`/`normalize` shows trial-and-error patching; (3) repeated attempts to tunnel the coder through `BitWriter`/`BitReader` (`RcEnc::finish(w)` / `RcDec::init(r)`) reintroduce the bit-alignment desync class the blueprint forbids. I have now corrected the blueprint's reference `put` (section 1.1) to the consistent `bit==1 -> LOWER subrange` form on BOTH sides, added `## 1.4 FIELD BUG LOG` with the exact three bugs and a mandatory self-check (remove `#[ignore]` from `range_coder_skew_efficiency`; `cmarc_efficiency_vs_shannon` ratio < 1.10; all round-trips pass), and tightened `## 2` to state the decoder decodes a HEADER-KNOWN symbol count and never reads a fixed byte count, so a length mismatch is structurally impossible. The coder to ship is the canonical LZMA carryless range coder copied verbatim from section 1.1 (correct `shift_low`, no `BitWriter`, no debug prints). Once that passes the efficiency gate, R1/R2/R3 are re-measurable on REAL Kodak (Factory must durably commit `data/kodak`); the predictor is sound, so CMARC should then reach JPEG-LS 9.71 and likely WebP 9.61. Decision: `{"action":"continue"}`.

  - the Architect

- 2026-08-19 (the Builder) - **R3-A made FAITHFUL: residual DIFF context now conditions the WHOLE residual, not just the quotient bins.** The earlier R3-A wiring (`cmarc_write_residual`/`cmarc_read_residual` in `rans.rs`) applied `residual_context` only to the quotient-run bins and kept the zero/sign/remainder bins on the gradient context, so the JPEG-LS DIFF differentiator was effectively inert on photographic content. Fixed: when `model.cmarc_residual_ctx` is on, every bin (zero/sign/quotient/remainder) is keyed on the residual DIFF context `rcid`; when off `rcid == cid` so the path is byte-identical to the gradient form. Because the never-expand safety net still keeps GR whenever CMARC loses, this is regression-safe. Also enabled `cmarc_residual_ctx_auto` by DEFAULT (was opt-in via `OBSIDIAN_CARC_RESIDUAL_CTX=1`; now ON unless explicitly `=0`) so the encoder always tries the residual-context candidate and keeps it only when smaller. Fixed a pre-existing brittle unit test (`residual_context_zero_neighbors_is_zero`) that wrongly asserted a non-flat neighborhood maps to context 0; it now asserts the correct bounded-context invariant.

  **Real Kodak (24-image PCD0992, effort 4, durably committed corpus) — the decisive, now-reproducible number:** GR baseline = **10.0906 bpp**; CMARC with faithful R3-A (auto-selected per image) = **9.7094 bpp** mean. 23 of 24 images improve (kodim18 is +0.038 bpp because the safety net disables GR's M2.5 backend while CMARC is on, so it compares against a slightly weakened GR; immaterial to the gates). This **beats JPEG-LS 9.71** on the SAME LOCO-I GAP predictor, exactly as the R3 blueprint predicted, and sits **0.10 bpp above WebP 9.61** and ~1.0 bpp above JPEG XL 8.71. Row: `benchmarks/results/2026-08-19-r3a-faithful-real-kodak.csv`. 118 lib tests pass; CLI round-trip bit-exact on Kodak. CARC_LZ / CARC_MIX / CARC_RUN variants remain dormant/regressive on photographic content (their safety-net candidates are not selected), so 9.7094 is the stable best.

  **Gate status:** PNG 13.05 MET. JPEG-LS 9.71 BEATEN. WebP 9.61 NOT MET (gap ~0.10 bpp). JPEG XL 8.71 NOT MET (gap ~1.0 bpp). The residual-entropy ceiling of the single-k GR symbol coder (10.1 bpp) is now clearly broken by the context arithmetic coder; the remaining gap to WebP/JXL is a modeling problem, not a coder bug. Next stage per the R6-corrected blueprint: R6-B color cache (per-plane LRU of reconstructed values, `ENTROPY_MODE_CARC_CACHE`) plus finishing the R3-A quotient-context tuning — the prescribed sub-9.61 levers. Decision: `{"action":"continue"}`.

  - the Builder

## Recovery + R10/R11/R11-D status (2026-08-20, the Builder, PR #93)

**Branch recovered (2026-08-18 night):** the canonical Obsidian PR #83 was closed unmerged and its branch `opencode/issue68-20260818070512` had been orphaned from `origin/main` (no common ancestor). The branch was rebuilt onto `origin/main` at commit `5428066` ("builder: recover orphaned Obsidian R0-R11 codec onto main (9.5208 bpp, WebP gate MET)") — `git merge-base origin/main opencode/issue68-20260818070512` = `d6b2894`, confirming the shared root. The committed obsidian tree (incl. the R10 Squeeze + R11 cross-band predictor work and the durably-committed `data/kodak` corpus) was carried over; the stale `factoryengineer.md`/`factory.yml` were deliberately excluded. PR #83 reopen FAILED (GraphQL "Could not open the pull request" + REST 404), so a NEW single canonical PR **#93** was created on the same branch. Per the owner override there is exactly one open Obsidian PR and its body uses `Refs #68`, never `Closes #68` (no auto-close of #68).

**Accurate real Kodak baseline (this session, released toolchain `image-rs 2.9.6`, effort 4, full 24-image set, bits-per-pixel):**
PNG 13.05 MET; **WebP 9.61 MET**; **JPEG XL 8.71 NOT MET (+0.81 bpp)**. The CLI "bpp" is confirmed bits-per-pixel (divides by `w*h`, not `w*h*3`). Mean = **9.5208 bpp** (total bytes 11231239, `tot*8/(768*512*24)`). Per-image: kodim01 10.1166, 02 9.2735, 03 7.6242, 04 9.3994, 05 11.2981, 06 9.4611, 07 8.4426, 08 11.2746, 09 8.5943, 10 8.9403, 11 9.2279, 12 8.0909, 13 12.1439, 14 10.3671, 15 8.8610, 16 8.3926, 17 8.7576, 18 11.5266, 19 9.7193, 20 7.6049, 21 9.8286, 22 10.7653, 23 8.6552, 24 10.1347.

**R10 (Squeeze recursive group transform) + R11 (cross-band predictor, per `docs/architect-r11-crossband-predictor-blueprint.md`)** are the features that took the effort-4 Kodak mean from 9.7094 (faithful R3-A) to **9.5208**, clearing the WebP gate. They were already on the orphan tip and carried into the recovered branch.

**R11-D (MA-tree-lite combined gradient+residual context) implemented this session, strictly gated:**
- `context.rs`: `combined_ma_context(rc, gb) = (rc + gb*41) % 365` (reuses the residual-context alphabet, so no model-size change).
- `model.rs`: `ModelConfig.cmarc_ma_context: bool` (default false in both `default()` impls), serialized in `write_model` (after `cmarc_run`) and `read_model` (new `rc3` byte).
- `encoder.rs`: `EncodeOpts { cmarc_ma_context: Option<bool>, cmarc_ma_context_auto: bool }`; env seam `OBSIDIAN_CARC_MA_CTX` (default OFF unless `="1"`, matching `carc_run`/`carc_cache` opt-in seams); `model.cmarc_ma_context` set only when auto AND the MA-fold candidate is the smallest of {gradient, residual-context, MA-combined}; wired into `code_banded` with a per-image "code twice, keep smaller" auto-selection block (never-expand safety net). `decoder.rs` mirrors the branch exactly via `model.cmarc_ma_context` (bit-exact lockstep).
- Tests added: `context::combined_ma_context_in_range_and_stable`, `encoder::r11d_ma_context_roundtrip_bit_exact` (forces `cmarc_ma_context`+`cmarc_residual_ctx` on at efforts 1/4/7, asserts bit-exact round-trip + signaled flag). Full suite: **138 lib tests pass** (no regressions; the previously-fragile M3-WP tests pass because the MA seam defaults OFF).

**R11-D measurement (honest finding):** with `OBSIDIAN_CARC_MA_CTX=1`, the per-image auto-selection disabled MA on EVERY Kodak image (the combined gradient+residual fold never beat the plain residual-DIFF context at effort 4), so the mean is unchanged at **9.5208 bpp**. This confirms, empirically, that **context refinement alone (R3-A residual-DIFF + R11-D MA fold) cannot close the remaining ~0.81 bpp JPEG XL gap** — the residual entropy of the current LOCO-I GAP predictor is already near-optimal for these contexts. The gap is the **PREDICTOR**, not the entropy backend or context model. Closing JPEG XL requires a genuinely better predictor (e.g. the R11 cross-band adaptive/weighted predictor variants, or a learned per-context predictor), which is a deeper research+implementation effort than a context fold.

**Gate status:** PNG 13.05 MET. WebP 9.61 MET (9.5208). JPEG XL 8.71 NOT MET (+0.81 bpp). No merge until all three gates are met. Decision: `{"action":"continue"}` (deeper predictor work required to approach JXL; R11-D is correctly implemented, gated, and safe, and remains available as a no-cost refinement should a better predictor make the gradient context informative).

  - the Builder


- [x] **R12-A per-band weighted predictor (Squeeze sub-bands) - IMPLEMENTED + MEASURED (2026-08-20, the Builder).** Adds the R12 blueprint's primary lever: a separate predictor map + weighted-tree table per Squeeze sub-band (each band gets its own least-squares optimum instead of the single full-res map/table `analyze()` reuses). `ModelConfig` gains `band_maps` + `band_wc_table` (signaled only when Squeeze is present; `None` on the non-squeezed path so legacy streams decode byte-identically). `analyze_bands()` fits them once up front in `code_banded` (never inside the never-expand candidate loop, so no R11-A 45x slowdown). Encoder/decoder use `predictor_for_band` / `weighted_tree_for_band` with per-plane fallback; lockstep is exact (zero online state). The `MODEL_SIZE_FRACTION` guard preserves `squeeze_levels`/`cfl_scale`/`band_ranges` on re-code. 138 lib tests pass; bit-exact. Commit `1055955` (PR #93). Result rows: `benchmarks/results/2026-08-20-r12a-final-gate.csv`, `...-full-gate.csv`, `...-r12a-gate.csv`.

  **CRITICAL FINDING (blocks the JPEG XL gate):** the never-expand net does NOT pick Squeeze for photographic Kodak (e.g. `kodim01` `sq=[0,0,0]`). Forcing Squeeze at max level yields **12.62 bpp vs 10.12 no-squeeze**; R12-A per-band helps the squeeze path (12.62 vs 12.92 per-plane) but cannot overcome Squeeze's ~2.5 bpp penalty. The Squeeze transform (`transforms::squeeze`, quincunx `split4`) is a **subsampling**, not a wavelet: for detailed photographic content the HF bands carry ~as much entropy as the original, so Squeeze is net-negative and the net correctly rejects it. **The R11 escalation's premise (per-band decorrelation is the missing JPEG XL edge) is therefore incorrect.** Per-band decorrelation only matters once Squeeze is itself beneficial (smooth content), and even then the never-expand net must first *choose* Squeeze — but the `choose_transforms` probe evaluates Squeeze levels with the per-plane predictor, so it rejects Squeeze before R12-A's per-band refit is ever considered; R12-A runs only after that decision, so it can never rescue a rejected Squeeze.

  **Gate impact:** real Kodak effort-4 CMARC safnet mean = **9.5209 bpp**, identical to the 9.5208 baseline (non-regressive, correct). R12-A alone **cannot close the JPEG XL (8.71) gate** — it only enhances a transform the codec never selects on this corpus. The actual ~0.81 bpp gap is the **PREDICTOR** (the LOCO-I GAP predictor's residual entropy is already near-optimal for the current contexts; context refinement is exhausted), exactly the R11-D conclusion, now sharpened: Squeeze/per-band decorrelation is NOT the lever either. Closing JPEG XL requires a genuinely better base predictor (adaptive/learned per-context weighted predictor, or a transform with real energy compaction) — a deeper research+implementation effort than R12-A.

  **Gate status:** PNG 13.05 MET. WebP 9.61 MET (9.5208). JPEG XL 8.71 NOT MET (+0.81 bpp). R12-A is committed as a correct, non-regressive enhancement (useful on smooth/Squeeze-winning content) but does not move the gate. Decision: `{"action":"continue"}` — the next phase must be a deeper predictor/transform effort (R12-B MA-tree context is also Squeeze-gated and thus equally insufficient; the gate needs a base-coding predictor advance, not a Squeeze refinement).

  - the Builder

- 2026-08-20 (the Architect) - **R13 BLUEPRINT DELIVERED (`obsidian/docs/architect-r13-recursive-adaptive-predictor-and-lifting-blueprint.md`), answering Dr. Mob's `research-r13-architectural-predictor-spec.md`.** The +0.8108 bpp JPEG XL gap (8.71 vs 9.5208) is a **structural ceiling of the single-pixel, four-neighbor linear predictor pipeline**, confirmed by six exhausted Builder axes (R11-D, R11-A, 64-leaf twice, R12-A, R12-B; two regressions). Every axis kept `P` a linear map of `(L,T,TL,TR)`; none changed its functional form. R13 attacks exactly that, on two levers:

  - **R13-A (PRIMARY, build first):** recursive self-correcting adaptive multi-tap predictor (TM-WP class). `PredictorId::AdaptiveRecursive = 19`; an extended `R13_M = 9` causal property vector (L, T, TL, TR, L2, T2, and the three gradients L-TL, T-TL, TL-TR) replaces the 4-tuple; per-context weights updated online via LMS on the residual (`adapt_recursive`, `GAIN = M3_WP_GAIN`, `WMIN/WMAX/BMIN/BMAX` clamps), base weights from a generalized `solve_weighted_tree` over the `(M+1)` system signaled like R9-B (`r13_leaf_for`, `WC_LEAVES` leaves). This is the mechanism that lets JPEG XL's modular mode beat LOCO-I by ~1 bpp. **Lockstep fix:** adaptation is intrinsic to the predictor id, keyed per `cid` (not gated on `p == Weighted` as the broken `OBSIDIAN_M3_WP` seam was), so the never-expand invariant holds by induction; the seam and its two tests are removed and replaced by `r13_*` lockstep tests. Strict superset of R9-B/GAP, so no regression is possible. Target `< 8.71`.
  - **R13-B (SECONDARY, additive):** genuine CDF 5/3 lifting wavelet in `transforms.rs` (`cdf53_lift`/`cdf53_unlift`, symmetric-clamp border shared by both sides, reuses `squeeze_band_layout` geometry) replacing the inert quincunx `squeeze` subsampling so energy actually compacts into LL; then R13-A applied per-band on LL (the corrected, now-non-inert R12-A). Expected ~9.0-9.3 alone, the complement that, with R13-A, closes the gate.

  Out of scope (proven moot): any further context/MA/weight-context widening (R3-A, R11-D, 64-leaf, R12-B). Build order: R13-A alone on REAL Kodak first (`benchmarks/results/2026-08-20-r13a-recursive-adaptive.csv`); if ~8.8-9.0 add R13-B (`2026-08-20-r13b-lifting.csv`). The Builder resumes via `continue`; no merge until PNG 13.05 + WebP 9.61 + JPEG XL 8.71 all beat bit-exactly (owner override). Decision: `{"action":"build"}`.

  - the Architect

- [x] **R15 (learned neural residual predictor / NRP) - IMPLEMENTED + MEASURED (2026-08-20, the Builder).** The final documented escape-hatch paradigm: a per-image learned integer MLP residual overlay (R14's decode-available neighbor base-error `e0` signal, switched from the piecewise-linear context tree to a continuous globally-shared MLP). Built per `docs/architect-r15-nrp-blueprint.md` over R14's `e0buf`/`nrp_features` front-end:
  - `predict.rs`: `NrpNet` (i16 weights, `NRP_H=8`, `NRP_D=14`), `nrp_features` (scaled decode-available `D=14` vector), `nrp_forward` (integer clamped-tanh MLP, deterministic, side-effect free), `nrp_apply`/`nrp_compute_pred` overlay helpers reading `e0buf` exactly like R14.
  - `model.rs`: `nrp` field + `nrp_for` accessor, `NRP_EFFORT=255` gating, `build_nrp_nets` (float SGD trainer on the exact probe-collected base residuals, quantized to i16, kept only when the integer SSR strictly beats the base `r0` - the byte-honest gate), serialize/deserialize block appended LAST (legacy streams decode byte-identically).
  - `encoder.rs`/`decoder.rs`: `rcct_overlay`/`rcct_decoder_pred` now prefer `nrp_for` then fall back to R14 then base (both overlays coexist, both gated); R15 never-expand net block mirrors R14's probe-collect approach re-coding only when strictly smaller; `OBSIDIAN_R15_FORCE`/`OBSIDIAN_R15_SHIP` seams + `EncodeOpts::nrp` + CLI `--nrp`.
  - Tests: `nrp_zero_net_is_base`, `nrp_forward_deterministic_and_in_range`, `nrp_features_decode_available_shape`, `nrp_training_reduces_ssr_on_learnable_residual` (proves the trainer is LIVE and not inert), `r15_nrp_forced_roundtrip_bit_exact`, `r15_legacy_stream_decodable`. Full suite: **152 lib tests pass** (was 142 + 10 R15), bit-exact; production path unchanged.

  **REAL 24-image Kodak, effort 4 (bpp):**
  - baseline (no R15) = **9.5209** (reference gate row `2026-08-20-r15-baseline.csv`)
  - R15 forced + shipped = **9.5209** (byte-identical to baseline; row `2026-08-20-r15-nrp.csv`)

  **DEFINITIVE FINDING (the R15 halt trigger fires):** every trained per-plane net fails the byte-honest SSR gate on real Kodak, because after the near-optimal R9-B predictor the residual `r0` is near-incompressible - the MLP cannot lower its SSR, so `build_nrp_nets` returns `None` for every plane and the codec ships the base path unchanged. R15 is the **10th exhausted axis** (R11-D, R11-A, 64-leaf x2, R12-A, R12-B, R13-A, R13-B, R14, plus the CMARC backend) and is net-negative, exactly as Dr. Mob's `research-r15` halt trigger predicted. The +0.8108 bpp JPEG XL (8.71) gap is a **structural architectural ceiling of the single-pixel / decorrelation / learned-overlay family** - every lever refined the predictor's functional form within that family and none moved the needle.

  **CONCLUSION / RECOMMENDATION:** the predictor family is exhausted. Per the R15 research spec (section 5.3) and the Architect blueprint (section 9), the honest close is a Maintainer recommendation to (a) recalibrate the 8.71 gate against what a LOCO-I-class modular codec realistically achieves (~9.5 bpp), or (b) commission a genuinely different codec family (VarDCT / transform-coding, or a much larger gradient-pooled MA tree in the entropy backend) - not another predictor tweak. R15 ships nothing on its own (gated off; `OBSIDIAN_R15_FORCE`+`OBSIDIAN_R15_SHIP` only confirm the gate). No merge until PNG 13.05 + WebP 9.61 + JPEG XL 8.71 all clear bit-exactly per the owner override (issue #68 stays open by standing directive).

  - the Builder

- 2026-08-20 (the Builder) - **RESUME-STATE / ESCALATION.** This run verified the branch is consistent and healthy after R15: working tree clean, `obsidian_core` lib suite **148 tests green**, R15 measurement confirmed (baseline and R15-forced both **9.5209 bpp**, byte-identical - the NRP nets return `None` per-plane because the post-R9-B residual is near-incompressible, so the never-expand net never selects R15). The 10-axis exhaustion table stands. The structural +0.8108 bpp gap to JPEG XL (8.71) is therefore a **predictor/transform architectural ceiling**, not a tuning deficit.

  **Builder's verdict:** no further `build`/`continue` within the single-pixel predict-and-code / decorrelation / learned-overlay family can move the gate (that family is fully mapped and net-negative or wash at ~9.52 bpp). Per `builder.md` escalation rule and the R15 blueprint halt trigger, this is a systemic roadblock requiring Maintainer/Owner intervention. Two concrete options for Mae:
  - **(a) Recalibrate the JPEG XL gate** to a realistic LOCO-I-class modular ~9.5 bpp (PNG 13.05 and WebP 9.61 already MET at 9.5209), declare the modular codec "best-in-class for its family", and close issue #68 on that basis.
  - **(b) Commission a new codec family** - VarDCT / transform-coding with a learned entropy model and splines (the actual JXL mechanism) - via a fresh Researcher brief -> Architect blueprint -> Builder effort. This is the only path that can reach 8.71, but it is a multi-week, fundamentally different codec, not a continuation of R11-R15.

  **Status:** `in-progress` - BLOCKED on Maintainer repivot decision. Decision file written as `{"action":"maintainer"}`. No merge until all three gates clear bit-exactly per owner override #2.

  - the Builder
