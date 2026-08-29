# Progress: Route 6C - Per-Fine-Context Transmitted Histograms (issue #130)

- **Branch:** `opencode/issue130-20260829181522`
- **Blueprint:** `ideas/2026-08-29-prism-route6c-fine-cluster-histogram.md` (Architect handoff for R6-C)
- **Precedent:** R6-B (`progress/130-prism-route6-r6b-transmitted-histogram.md`, closed +6% loss) and the R6-C research spec (`prism/docs/research-route6c-fine-cluster-histogram.md`, PR #176) + addendum-27 (frozen pins). This build implements R6-C, the M3 lever: transmit ONE histogram PER FINE-CONTEXT CLUSTER (a fixed baked property tree) so the transmitted model is finer than the cold-starting EMA and cannot repeat R6-B's loss.
- **Status:** in-progress
- **Current step:** R6-C0 build + C5 FAIL recorded (binding gate 3.38669 vs X6b 3.2442; w=0 3.443 > gate; w=0.6 +10.6%; root cause structural coarsening + X5a contaminant, per progress lines 38-84). Architect blueprint delivered (`ideas/2026-08-29-prism-route6c-jxl-modular-redesign.md`): R6-C v2 refinement-constrained baked tree (R6-REFINE) superseding the broken R6-C0 coarse quant, plus X5a restoration and the R6-C2 predictor lever for M3.
- **Next steps:** Builder resumes on this branch (`opencode/issue130-20260829181522`) implementing R6-C v2 per the blueprint: (1) `r6c_leaf(f)` replacing `r6c_cluster_id` with `T` split only on `{pmag, lc_mag, lc_sig}` so `r6c_leaf` REFINES `LearnedModel::fine_ctx`; (2) `train-r6c` offline tree (K1=1024) with R6-REFINE guard; (3) restore X5a `luma_mag`/`lmag` threading in `encode_static_r6c`/`frame_wavelet_encode_r6c`; (4) header delta+varans per addendum-27 A/D; (5) `VB-R6C-REFINE` + `VB-R6C-X5A-PARITY` tests. Then `bench-r6c --kodak` + `bench_gate.sh` M2 (per-sample<3.166, summed<9.498). R6-C2 predictor lever gated behind C1 M2 green. PR body `Closes #130` -> `Refs #130` (Maintainer edit, gates unmet).

## Milestone Checklist

### C0: Scaffold + clustering function
- [x] `prism/include/prism/codec/route6c_tree.h`: `r6c_cluster_id(const LCFeat&)`, `r6c_K()`; R6-C0 fixed coarse quantization (K0=648: symtype3*orient4*parent_sig2*fc3*dg3*level3). Plus runtime `r6c_w()`/`set_r6c_w()` blend-weight accessor (default 0.6).
- [x] `R6C_FLAG = 8` in `prism/include/prism/codec/wavelet_container.h`; `WaveletHeader` gains `uint32_t r6c_K` + `std::vector<uint16_t> r6c_p0`.

### C1: Two-pass coder
- [x] `R6CResult`, `R6CAdaptiveModel` (blend `W*sp0[C] + (1-W)*learned.predict(f)`, W default 0.6 frozen, EMA/M/MLP reused exactly), `encode_static_r6c`, `decode_static_r6c` in `bitplane.cpp` (mirror `encode_static`/`decode_static`).
- [x] Pass 1 counts per-cluster `cnt[C][0/1]`; build `sp0[C] = (tot==0)? M/2 : clamp(c0*M/tot)`. Empty clusters neutral (never worse than EMA). The frame pools counts across ALL planes into one IMAGE-GLOBAL r6c_p0 (consistent at encode/decode; see `r6c_global_sp0` + `r6c_accumulate`).

### C2: Frame dispatch + header serialization
- [x] `frame_wavelet_encode_r6c` (X6a residual pre-pass -> `encode_static_r6c`, `residual_mode = 1 | R6C_FLAG`).
- [x] `wavelet_container_encode`/`decode` write/read `uint32 r6c_K` + `r6c_K*uint16 r6c_p0` (raw LE; 4 + 2*K bytes, < 0.02 bpp).
- [x] `frame_wavelet_decode` dispatches `decode_static_r6c` when `R6C_FLAG` set; reuses X6a residual post-pass.

### C3: CLIs
- [x] `prism wavelet-r6c <in> <out> [--filter --levels --k --w]` (mirror `wavelet-r6b`); `--w` overrides blend weight.
- [x] `prism bench-r6c --kodak DIR [--out --filter --levels --k --w]` (dual-unit CSV; feeds `bench_gate.sh`).

### C4: Tests
- [x] `tests/unit/test_r6c.cpp` (VB-R6C-ROUNDTRIP, VB-R6C-SYMMETRY, VB-R6C-CLUSTER); register in `prism/CMakeLists.txt`. Full suite green (217/217).

### C5: Measurement gates
- [ ] R6-C0: median NET <= 3.2442/sample on held-out kodim02/07/17/21; byte-exact 24/24; overhead <= 0.02 bpp.
- [ ] R6-C1: `train-r6c` grows baked tree (K1=1024), W sweep; median <= 3.166/sample AND <= 9.498 summed (M2) on Kodak-24.
- [ ] R6-C2 (if needed): stack X6c `sub_scale` / R6-A deeper MLP for +0.5% over C1.
- [ ] R6-C3: summed <= 8.655 AND per-sample <= 2.885 (M3); byte-exact 24/24, fuzz clean -> format-stable v3 PR `Refs #130`.

## C5 result: R6-C0 FAIL (binding gate, escalate per addendum-27 cascade)

Tester stage (`prism bench-r6c --kodak`, `bench_gate.sh` dual-unit) measured on held-out
Kodak-24, R6C_FLAG=8, r6c_K()=648, header 1.3 KB (< 0.02 bpp OK), round-trip 24/24 byte-exact:

```
w=0.0 (pure learned)   3.44315 bpp/sample   <- best achievable, still > 3.2442 gate
w=0.6 (default)        3.80642 bpp/sample   (+10.6% worse than w=0)
w=1.0 (pure static)    9.71862 bpp/sample   catastrophic
R6-C0 held-out median  3.38669  vs X6b gate 3.2442  -> FAIL
```

addendum-27:66 cascade: "R6-C0 FAIL (median >= 3.2442, cannot beat X6b): the
fine-clustering hypothesis is false (coarsening-into-K still loses to the EMA even at
fine granularity). ESCALATE to Owner/Maintainer. Do NOT re-tune R6C_K/R6C_W to force a pass."

### Root cause (Fixer analysis)
1. STRUCTURAL (the lever cannot help): `r6c_cluster_id(f)` is a COARSENING of the full
   `LCFeat` `f` (route6c_tree.h:36-45 keeps only symtype/orient/parent_sig/fc/dg/level and
   DROPS nmag/pmag/ownmag/ppos). The adaptive `LearnedModel` keys on the FULL ~1.84M-context
   `f`, so the transmitted per-cluster P(0) is COARSER than the EMA's context key. The
   blueprint's premise ("cluster partition at least as fine as the EMA's context key",
   route6c_tree.h:12-17) is therefore NOT realized by R6-C0. Blending a coarser static model
   `W*sp0[C]+(1-W)*learned.predict(f)` into a finer adaptive EMA can only bias the many
   well-conditioned frequent contexts; that is exactly R6-B's +6% failure class. Empty-cluster
   M/2 fallback does not save it because the HURT comes from populated clusters whose cluster
   average diverges from the true per-context P(0).
2. MEASUREMENT CONTAMINANT (separate, not a K/W retune): the R6-C0 residual path drops the
   X5a cross-component luma reference that the X6b baseline path keeps. `frame_wavelet_encode`
   (wavelet_container.cpp:272) passes `luma_mag` to the coder; `frame_wavelet_encode_r6c`
   (wavelet_container.cpp:667) passes `nullptr`, and `encode_static_r6c` passes `nullptr` to
   `learned_features` at bitplane.cpp:1082/1088/1096. So R6-C0's w=0 floor (3.443) is NOT a
   clean pure-learned floor: it also omits X5a luma conditioning that X6b (3.2175) includes,
   and codes the residual r=c-c_hat rather than c. Even after restoring X5a, w=0 can at best
   tie X6b (~3.2175); the transmitted backbone at any w>0 still regresses. Verdict unchanged:
   the per-fine-context transmitted P(0) lever does not beat the adaptive EMA.

### Action taken by Fixer
- Removed the dead `frame_wavelet_encode_r6c(..., int kb, size_t&)` overload
  (wavelet_container.h:128-137) referencing the removed `encode_static_cluster`; only the
  `levels`-only overload (wavelet_container.h:139-148) remains. No behavioural change.
- Did NOT re-tune R6C_K/R6C_W (frozen by addendum-27); did NOT change the blend mechanism
  (would deviate from the frozen blueprint and still cannot pass the gate).
- Escalating to Maintainer per addendum-27:66 cascade so the Owner/Maintainer decides the
  next move (e.g. the full JXL-Modular redesign where the context tree also drives prediction,
  or accept the honest floor). PR body keyword left as `Closes #130` -> must become `Refs #130`
  (gates not met); flagged for Maintainer to edit.

## Implementation notes

- The transmitted model is structurally incapable of being net-worse than the EMA: populated clusters carry the whole-image exact P(0) (better than cold-start EMA for rare contexts); empty clusters get neutral `M/2` so the blend degenerates to pure EMA. This is the exact property R6-B violated (blending a COARSER 12-class model in).
- No learned weights or large tables are transmitted; only the small per-image `r6c_p0` vector (I29 preserved). The EMA, MLP, EBCOT walk, rANS backend, and container envelope are reused unchanged.
- All pins frozen in addendum-27; the Builder must NOT move a gate or re-tune `R6C_K`/`R6C_W` to force a pass.

## Builder agent log (2026-08-29)

- Implemented R6-C0 end to end, mirroring R6-B's two-pass structure but with a
  single image-global per-cluster P(0) backbone instead of the 12-class
  per-subband table. New files: `prism/include/prism/codec/route6c_tree.h`.
- `bitplane.cpp`: added `R6CAdaptiveModel` (blend `W*sp0[C]+(1-W)*learned.predict(f)`,
  W runtime-overridable via `--w`), `encode_static_r6c`, `decode_static_r6c`,
  plus `r6c_global_sp0`/`r6c_accumulate` which POOL the per-cluster (0/1) counts
  across all planes into ONE transmitted `r6c_p0` vector. Pooling is what makes
  encode and decode agree on a single global backbone (each plane's own statistics
  would otherwise diverge between encode and the transmitted vector). This was the
  one correctness trap: the first cut transmitted only plane-0's backbone and
  failed the frame round-trip on multi-channel images; the subband-only test
  passed, which is how it was caught.
- `wavelet_container.cpp`/`h`: `R6C_FLAG=8`, `WaveletHeader.r6c_K/r6c_p0`, header
  serialization (4 + 2*r6c_K bytes), `frame_wavelet_encode_r6c`, and the decode
  dispatch. Reuses X6a residual pre/post-pass and the EBCOT/rANS/container stack.
- CLIs `wavelet-r6c` / `bench-r6c` (with `--w`) added to `main.cpp`; `test_r6c.cpp`
  (ROUNDTRIP / SYMMETRY / CLUSTER) registered in `CMakeLists.txt`.
- Verification: full prism unit suite green (217/217); `wavelet-r6c` round-trips
  and shows the blend helping vs pure-learned (w=0.6 < w=0.0 bpp on a toy image).
  The binding Kodak measurement gate (C5) is NOT run in this session (no Kodak
  corpus present) and is delegated to the Tester stage via `bench_gate.sh`.

- the Builder

## Fixer agent log (2026-08-29)

- Tester gate FAIL (R6-C0 median 3.38669 vs X6b 3.2442; w=0 best 3.44315 > 3.2442; w=0.6
  +10.6%, w=1.0 catastrophic). Per addendum-27:66 cascade R6-C0 FAIL -> ESCALATE, no K/W
  retune. Root cause: (1) `r6c_cluster_id` coarsens `f`, so transmitted per-cluster P(0) is
  COARSER than the EMA context key -> blending only biases frequent contexts (R6-B class
  failure); the blueprint's "finer-or-equal" premise is not realized. (2) R6-C0 residual path
  drops X5a luma conditioning (wavelet_container.cpp:667 `nullptr`, bitplane.cpp:1082/1088/1096
  `nullptr`), so w=0 is not a clean pure-learned floor vs X6b (3.2175).
- Applied safe agreed nit: removed dead `frame_wavelet_encode_r6c(...,int kb,size_t&)` overload
  (wavelet_container.h:128-137). Did NOT retune K/W or change the blend (frozen blueprint; cannot
  pass gate either way). Escalated to Maintainer via decision.json `{"action":"maintainer"}`.
  Flagged PR body `Closes #130` -> `Refs #130` (gates unmet) for Maintainer edit.

- the Fixer

---

## R6-C v2 redesign (Architect blueprint, post-R6-C0-FAIL)

Blueprint: `ideas/2026-08-29-prism-route6c-jxl-modular-redesign.md`. Resumes PR #181 on
branch `opencode/issue130-20260829181522`. Supersedes the broken R6-C0 coarse quant.
Core correction: impose **R6-REFINE** (`fine_ctx(f1)==fine_ctx(f2) => r6c_leaf(f1)==r6c_leaf(f2)`)
by restricting the baked tree `T` to split ONLY on `{pmag, lc_mag, lc_sig}` (the only
LCFeat dims `LearnedModel::fine_ctx` ignores). This makes the transmitted backbone
finer-or-equal to the EMA, so `W=1.0` is the no-worse bound and blending cannot repeat
R6-B/R6-C0's loss. X5a `luma_mag` threading is restored (fixes the w=0 contamination AND
activates the `lc_mag`/`lc_sig` split axes).

### C1: Refinement-constrained backbone (target M2)
- [ ] `prism/include/prism/codec/route6c_tree.h`: `r6c_leaf(const LCFeat&)` replaces `r6c_cluster_id`; `r6c_K()` returns 1024 (R6-C1 pin); `verify_r6c_refinement()`; rewrite false "finer-or-equal" comment to state R6-REFINE.
- [ ] `prism/src/codec/route6c_tree.inc` (NEW, baked, NOT transmitted): decision tree `T`, splits only on `{pmag, lc_mag, lc_sig}`, <= 1024 leaves, `T.leaf(f)` in `[0,1024)`.
- [ ] `prism/src/cli/main.cpp`: `train-r6c` greedy growth over Kodak training subset, R6-REFINE hard guard (reject any split separating equal-`fine_ctx` samples), writes `route6c_tree.inc` + prints proof. Keep `wavelet-r6c`/`bench-r6c`.
- [ ] `prism/src/codec/bitplane.cpp`: `R6CAdaptiveModel::predict` uses `r6c_leaf`; `encode_static_r6c`/`decode_static_r6c` thread `luma_mag`/`lmag`/`lc_mag`/`lc_sig` (remove `nullptr` at R6-C call sites). `R6C_W` default 0.6 frozen, runtime `--w`.
- [ ] `prism/src/codec/wavelet_container.cpp/h`: `frame_wavelet_encode_r6c` passes `luma_mag` (mirror line 272); header serialize/parse = `uint32 K` + `K` delta-coded varans `P(0)` (addendum-27 A/D), replacing raw `4+2*K`.
- [ ] `prism/tests/unit/test_r6c.cpp`: add `VB-R6C-REFINE` + `VB-R6C-X5A-PARITY`; keep ROUNDTRIP/SYMMETRY/CLUSTER. Register in `prism/CMakeLists.txt` if new.

### C2: Tree drives prediction (target M3, gated behind C1 M2)
- [ ] `R6CPredictor[C]` per-leaf linear value-predictor over parent/neighbour/luma reconstructed magnitudes, applied in X6a residual pre-pass when `residual_mode & R6C_FLAG`. Header carries per-leaf coefficients (delta+varans, within 0.02 bpp).

### C5 (re-run gates on v2)
- [ ] R6-C1: median <= 3.166/sample AND <= 9.498 summed (M2) on Kodak-24; byte-exact 24/24; overhead <= 0.02 bpp.
- [ ] R6-C2 (if C1 M2 green): summed <= 8.655 AND per-sample <= 2.885 (M3); byte-exact 24/24, fuzz clean -> format-stable v3 PR `Refs #130`.
- [ ] W-sweep: `W=1.0 >= pure-EMA floor` (no-worse bound restored; R6-C0's catastrophic 9.71 must NOT recur), monotone improvement over `w=0`.

- the Architect
