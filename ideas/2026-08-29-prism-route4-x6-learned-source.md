# Architectural Blueprint: Route 4, Phase X6 - Learned Source-Entropy Attack

- **Issue:** #130 (Owner directive 2026-08-28T06:24:38Z: Option 2, Exotic
  Beyond-Predictive Paradigm; continue without pause until M2 and M3 pass)
- **Research spec:** `prism/docs/research-route4-x6-learned-source.md` (Dr. Mob, the Researcher, PR #168)
- **Predecessor blueprint:** `ideas/2026-08-28-prism-route4-beyond-predictive.md`
- **Progress tracker:** `progress/130-prism-route4-beyond-predictive.md`
- **Pinned constants:** `prism/docs/addendum-25-pinned-constants-route4.md`
- **Role:** the Architect
- **Date:** 2026-08-29
- **Scope:** Blueprint for the X6 measurement program (X6a L1 predictor, X6b L2
  context, X6c L3 hyperprior, X7 binding gate). This is the sole remaining lever
  toward M2/M3 once the per-context bitplane model is entropy-near-optimal (X2
  entropy diagnostic, `progress/130-prism-route4-beyond-predictive.md:82`). The
  X3a learned context MLP (3.2477/9.743) is retained and STACKED under the new
  levers; nothing in X6 removes the v1 production path beyond the single
  `WAVELET_FLAG` bit plus the new `RESIDUAL_FLAG` header field.

---

## 1. Summary

The X2 entropy diagnostic proved the bitplane coder is entropy-near-optimal under
its per-context adaptive model: per-subband ideal entropy under the EMA equals the
actual coded rate to within noise. X3a added a learned MLP prior that sharpens one
binary probability per symbol but cannot remove a coefficient magnitude bit (it
only re-distributes probability mass within the symbols already emitted for `c`).
The remaining gap to M2 (3.166) / M3 (2.885) is therefore a **source-entropy** gap,
not a context-granularity gap: no mechanism that merely re-weights the bits of a
fixed coefficient `c` can shrink its magnitude.

X6 attacks the source directly with three stacked levers:

- **L1 (dominant, X6a):** a learned *wavelet-domain coefficient predictor*.
  Code `r = c - c_hat` (the residual) instead of `c`. `c_hat` is a baked MLP/conv
  regression over a causal window of already-reconstructed coefficients. Because
  `c_hat` is evaluated only from already-coded information, no predictor state is
  transmitted (invariant I29) and the round-trip stays byte-exact. This removes
  magnitude bits outright - the proven mechanism of L3C / Ballé hyperprior codecs.
- **L2 (X6b, merge of X3b):** a richer context MLP applied to the *residual* coder,
  widening `LearnedModel` from 10->16->1 to 24->64->32->1 with neighbour-magnitude
  aggregates, cross-orientation sibling magnitudes, and local subband variance.
  Incremental (+0.5 to +1.0%), stacks on top of L1.
- **L3 (X6c, reserve, the M3 lever):** a learned *hyperprior* side-stream - a tiny
  second rANS stream carrying a quantised latent `z` (<= 0.02 bpp) that sharpens the
  per-symbol prior `p0`. The one place where "transmitted model" is allowed, bounded
  by the spirit of I29 (hyper bytes counted in NET).

**Honest arithmetic (from X3a 3.2477/9.743):**
- L1 alone (predictor explaining ~0.4-0.6 of coefficient variance): projected
  2.95-3.10 per-sample -> **M2 plausible**.
- L1+L2+L3: projected 2.80-2.95 per-sample -> **M3 at risk but within reach**.
- M3 is the hard gate; nothing relaxes it or the lab freeze (brainstorm #42 frozen
  until M2/M3 genuinely pass).

---

## 2. Core Architectural Decision: residual pre-pass + unchanged bitplane coder

To reuse the already-verified, byte-exact bitplane machinery (X0 VB rails, X3a
model) and avoid restructuring the EBCOT 3-pass coder, X6a codes the residual field
through the EXISTING `BitplaneCoder` rather than rewriting it bitplane-by-bitplane
with the predictor inline.

Define `reconstructed(c)` for an original coefficient `c` as `c_hat + r` where `r`
is its residual and `c_hat` its predictor output. The predictor is a pure function
of `reconstructed()` values of coefficients that are STRICTLY EARLIER in the
*coding-major* order (coarse-to-fine subband order `coding_order`, then raster scan
within a subband). Earlier coefficients are fully reconstructed by definition, so
`c_hat` is computable at both encode and decode from already-decoded state only.

### 2.1 Encode pipeline (FRAME-WAVELET-RESIDUAL)

1. **Lift** every plane (unchanged `WaveletLift::forward`), giving subbands `S`.
2. **Residual pre-pass** (`CoefficientPredictor::build_residuals`): walk subbands in
   `coding_order`, coefficients in raster order. For coefficient `ci` in subband
   `si`, compute `c_hat = predictor.predict(field, si, x, y)` from the already
   reconstructed coefficients (`field` holds `c_hat + r` for earlier coeffs; at this
   point `r` is the known original residual, so `reconstructed = c` for them). Store
   `r = c - c_hat` into a parallel residual subband set `R`. (The predictor reads
   `c`, never `r`, for neighbours - see section 2.4 for why this is symmetric.)
3. **Code `R`** with the existing `BitplaneCoder::encode(R)` (bitplane-major,
   significance/sign/refinement, `LearnedModel` with L2 features). Returns the rANS
   payload as before. NET = payload + header; `RESIDUAL_FLAG` set in the header.

### 2.2 Decode pipeline (mirror-exact)

1. Parse header; if `RESIDUAL_FLAG` set, decode the residual field `R` via
   `BitplaneCoder::decode` (unchanged, gives exact `r` for every coefficient).
2. **Reconstruction post-pass** (`CoefficientPredictor::reconstruct`): walk subbands
   in `coding_order`, coefficients in raster order. For coefficient `ci`, compute
   `c_hat = predictor.predict(field, si, x, y)` from `field` (which already holds
   `reconstructed = c_hat_nb + r_nb` for earlier neighbours, because step 2 of this
   same pass already ran for them). Set `field[ci] = c_hat + r[ci]`. This is the exact
   inverse of the encode pre-pass: every earlier neighbour's `reconstructed` value is
   the true `c`, so `c_hat` matches encode exactly, and `c_hat + r == c`.
3. **Inverse lift** (`WaveletLift::inverse`) -> plane -> YCoCg-R inverse -> raster.

Byte-exactness: `R` is coded byte-exact by the existing coder; reconstruction is
exact integer addition. `decode(encode(x)) == x` holds for all 24 pinned Kodak PPMs
exactly as X0/X3a proved, with the predictor adding zero transmitted bytes.

### 2.3 Causal dependency and sibling/parent availability

`coding_order` emits LL (level 0) first, then for each level L = 1..maxlevel the
orientations in order HL(1), LH(2), HH(3). Therefore:
- Parent subband of any detail band is coarser and FULLY reconstructed before the
  child (parent map `build_parent_map` is satisfied).
- Within a level, LH sees HL (already done), HH sees HL and LH (already done). The
  predictor MAY use the already-coded sibling orientations for detail bands.
- Same-subband neighbours earlier in raster order are fully reconstructed.

The predictor window (section 2.4) is limited to these causally-available sources,
so encode and decode compute identical `c_hat` with no side info.

### 2.4 Predictor interface and features

```cpp
// Learned wavelet-domain coefficient predictor (X6a / L1).
// Pure function of already-reconstructed coefficients; weights baked, zero bytes.
struct CoefficientPredictor {
    // Predict c_hat (integer) for coefficient (x,y) in subband `si`.
    // `recon` holds reconstructed coefficients (c_hat + r) for ALL subbands;
    // the predictor reads only entries that are strictly earlier in coding-major
    // order, which are guaranteed fully reconstructed. `w`/`h` are the current
    // subband dims; `parent`/`pw`/`ph` index the parent subband in `recon`.
    int32_t predict(const std::vector<std::vector<int32_t>>& recon,
                    int si, int x, int y, int w, int h,
                    int pidx, int pw, int ph) const;

    // Offline sample collection (coefficient-major order), for training.
    // Emits one PredictSample{features, target=c, already_reconstructed_neighbours}
    // per coefficient; the trainer mirrors predict()'s window exactly.
    static void collect_samples(const std::vector<Subband>& subbands,
                                std::vector<PredictSample>& out);

    // Baked weights (generated by `prism train-predictor`).
    const PredictWeights& weights() const;
};
```

Predictor window (all from `recon`, causal only):
- 3x3 same-subband neighbourhood of reconstructed coefficients (raster-causal: the
  4-connected up/left and the two diagonals above; mirror at borders since lift is
  mirror-symmetric, the encoder uses the same mirrored padding).
- parent coefficient `recon[pidx][(y>>1)*pw + (x>>1)]`.
- the two already-coded same-level sibling orientations (HL/LH/HH cross-channel
  correlation) at the same (x,y) when available.
- (NOT the coefficient's own value - that is what we predict.)

The predictor is a small fully-convolutional net (two conv layers + 1x1) or a
flattened 24->64->32->1 MLP on the window, regressing the RAW integer coefficient
`c_hat` (not a probability). Weights baked into `predictor_data.inc` (mirror of
`learned_ctx_data.inc`). Integer output via round; straight-through gradient for the
training objective (section 3.1).

---

## 3. Module Breakdown

### 3.1 New / modified files

| File | Change |
|---|---|
| `include/prism/codec/predictor.h` | NEW: `CoefficientPredictor`, `PredictSample`, `PredictWeights`. |
| `src/codec/predictor.cpp` | NEW: causal-window predict + `collect_samples`; reuses baked `predictor_data.inc`. |
| `src/codec/predictor_data.inc` | NEW (baked weights; neutral zeros pre-training, like `learned_ctx_data.inc`). |
| `include/prism/codec/wavelet_container.h` | Add `uint8_t residual_mode` field to `WaveletHeader` (`RESIDUAL_FLAG`, bit0). |
| `src/codec/wavelet_container.cpp` | Serialize/parse `residual_mode`; the payload stays the bitplane rANS stream. NET unchanged when residual_mode=0. |
| `src/codec/wavelet.cpp` | Add `frame_wavelet_encode_residual` / `frame_wavelet_decode_residual` (pre-pass + existing `BitplaneCoder::encode` + post-pass), threaded through `frame_wavelet_encode` when `residual_mode` set. |
| `src/cli/main.cpp` | Add `--residual` flag + `train-predictor` command + `--x6a/--x6b/--x6c` harness hooks. |
| `src/codec/learned_ctx.h` | L2: widen `LCFeat` to 24 fields; widen `LearnedModel` MLP (24->64->32->1); add neighbour-magnitude aggregates + sibling magnitudes + local subband variance. |
| `src/codec/learned_ctx.cpp` | L2: new feature normalisation + 64-hidden MLP forward; new `learned_ctx_data.inc` layout. |
| `src/codec/learned_ctx_data.inc` | L2: regenerated 24->64->32->1 weights. |
| `src/codec/bitplane.cpp` | UNCHANGED except it now consumes the residual field `R` (already a `Subband` vector) - no structural edit needed for L1; L2 affects `LearnedModel` only. |
| `tests/unit/test_predictor.cpp` | NEW: predictor causal determinism + byte-exact pre/post-pass round-trip. |
| `tests/unit/test_bitplane.cpp` | EXTEND: `VB-X-RESIDUAL-ROUNDTRIP` (decode(encode_residual(x)) == x). |
| `benchmarks/probe_sandbox.sh` / `prism bench-x` | Add `--x6a/--x6b/--x6c` sweep + L1 sub-gate (residual top-bitplane count < coefficient top-bitplane count). |

### 3.2 Training pipeline (L1, must target the real codec)

`prism train-predictor` runs offline in the build environment (the X3a run already
proved the real Kodak-24 PPMs are available there via `kodak.sha256`; the research
sandbox egress block does NOT apply to the build squad). Per-coefficient sample
built by `CoefficientPredictor::collect_samples` in coding-major order. Two objectives,
shipped in order:

1. **MSE proxy (initial):** `L_mse = mean((c - round(c_hat_float))^2)`. Cheap, no
   differentiable rANS needed. Produces a working predictor immediately.
2. **Codelength objective (fine-tune):** `L_cl = sum_k -log2 p0[k]^(1-bit[k]) *
   (1-p0[k])^bit[k]` where `r = c - round(c_hat_float)` is run through the ACTUAL
   `BitplaneCoder` to get `(bits, p0)`, and the straight-through estimator passes the
   rounding gradient. This minimises the metric the gate measures.

**Honesty / leakage:** train and measure on the same pinned Kodak-24 is the
established lab convention (X3a did this and was accepted under I29/I30 because the
rANS sees only its own emitted bits at inference). To strengthen the claim, L1
PRIMARY uses **leave-one-out (LOO):** train on 23 images, evaluate on the held-out
24th, repeated for each. Full-Kodak training is the fallback if LOO cost is
prohibitive. The leakage caveat is stated in the commit and the comparison row.

**L3 training (X6c, reserve):** a tiny analysis net reads already-coded residual
statistics per tile/subband, emits quantised latent `z`; a baked hyper-decoder turns
`z` into per-(tile,subband) distribution parameters that condition `p0`. Trained
jointly with L1+L2. Overhead sub-gate L3b bounds `z` bytes to <= 0.02 bpp.

### 3.3 Wire format (additive, format-stable only at X7)

Rides the v1 envelope (as X0 did). `WaveletHeader.residual_mode` (1 byte) added; when
set, the payload is the bitplane rANS stream of the residual field `R` and decode
applies the post-pass. L3 adds `hyper_bytes` length + a second rANS stream appended to
the payload; both counted in NET (I29). No v1 production byte changes when
`WAVELET_FLAG` is clear.

### 3.4 Invariants (carry I25-I30; add I31)

- **I25** beyond-predictive primacy.
- **I26** reversible lift (`lift_inv(lift(x)) == x`).
- **I27** no transmitted tables (fixed context function, online-adapted) - holds for L2.
- **I28** parent-aware context.
- **I29** baked-in learned model = 0 per-image NET (L1 predictor weights + L2 MLP
  baked; L3 hyper-stream bounded <= 0.02 bpp and counted in NET).
- **I30** honest M3 reporting.
- **I31** residual predictor is a pure causal function of already-reconstructed
  coefficients; `decode(encode(x)) == x` byte-exact on all 24 pinned Kodak PPMs with
  `RESIDUAL_FLAG` set, proven by `VB-X-RESIDUAL-ROUNDTRIP` before any X6 measurement.

---

## 4. X6 Measurement Program & Pre-registered Gates

### 4.1 X6a (L1 predictor) - PRIMARY lever
- Harness: `prism bench-x --residual --kodak <REAL_KODAK>` codes `R`, compares to
  X3a baseline 3.2477/9.743 in BOTH units on full Kodak-24.
- **L1 primary gate:** mean per-sample <= 3.10 (>= +4.5% NET over X3a 3.2477),
  byte-exact round-trip 24/24, fuzz clean.
- **L1 sub-gate:** mean of residual top-bitplane count < mean of coefficient
  top-bitplane count (proves the predictor actually shrinks source magnitude, not
  just re-weights symbols).
- **L1 sub-gate:** no image regresses > -1.0% vs its own X3a bytes.
- If L1 < +2.0%: record honestly; do not proceed to L3 alone; cascade to L2/L3 combo.

### 4.2 X6b (L2 richer context MLP on the residual coder)
- Widen `LearnedModel` to 24->64->32->1 with enriched features; re-measure.
- **L2 gate:** additional >= +1.0% over X6a winner (applied to residual coder so it
  stacks on L1).

### 4.3 X6c (L3 learned hyperprior side-stream) - reserve, M3 lever
- **L3 primary gate:** additional >= +1.0% over X6b AND combined <= 2.95 per-sample.
- **L3b sub-gate:** hyper-stream overhead <= 0.02 bpp (NET counted).
- If L3 overhead > gain: L3 FAILS honestly (do not bury in table bytes).

### 4.4 X7 (binding dual-unit gate)
- Compose X6a/X6b/X6c winners per image by real NET bytes (L-C1).
- Full Kodak-24 (`prism bench --kodak`) judged ONLY by `bench_gate.sh` in BOTH units
  vs REAL cjxl (M3: < 8.655 summed / < 2.885 per-sample) and REAL WebP (M2:
  < 9.498 summed / < 3.166 per-sample).
- Clears M2 only: open reserve / record M2-PASS/M3-PENDING.
- Clears BOTH: format-stable v3 PR (`Refs #130`); freeze lifts on merge.
- Misses M2: full negative ledger + Anti-Surrender re-examination, not silent close.

### 4.5 Honest closure trigger
If L1 < +2.0% AND L3 fails its overhead sub-gate, the beyond-predictive paradigm has
yielded its achievable level; record the negative ledger and escalate to Maintainer
for owner decision (only the Owner halts a gated target).

---

## 5. Frontend / Visual Demonstration Layer

Carry the X0 bitplane explorer (`prism/frontend/`); extend it with a **residual view**:
toggle between rendering the original subband reconstruction and the residual field `R`,
so the magnitude-shrink of L1 is visually verifiable (the residual atlas should be far
sparser than the coefficient atlas). A CLI `prism dump-wavelet --residual <img>` emits a
PNG atlas of `R` per subband. Read-only specimen; does not alter the codec path.

---

## 6. Complexity

- Encode: lift O(N) + residual pre-pass O(N) (small conv/MLP per coefficient) +
  bitplane O(N) symbols. Predictor inference is a few dozen flops per coefficient;
  wall-clock ~2-4x v1, within L-C8 5x guard. Decode: symmetric post-pass O(N).
- Memory: O(subband sizes) + baked weights (a few KB). No transmitted tables (except
  bounded L3 hyper-stream).
- L3 hyperprior adds one small analysis/synthesis net + a second rANS stream.

---

## 7. VB Rails (X6 additions)

| Rail | What it proves |
|---|---|
| `VB-X-RESIDUAL-ROUNDTRIP` | `decode_residual(encode_residual(x)) == x` byte-exact on all 24 pinned PPMs |
| `VB-X-PREDICTOR-DETERMINISM` | encoder and decoder predict() identical `c_hat` for every coefficient (causal window) |
| `VB-X-NET-AUDIT-RESIDUAL` | NET = payload + header (+ bounded L3 hyper) with `RESIDUAL_FLAG` set |
| `VB-X-L1-SHRINK` | residual top-bitplane mean < coefficient top-bitplane mean (L1 sub-gate, automated) |

---

## 8. Test Matrix

| Test | File | Proves |
|---|---|---|
| `test_predictor.cpp` | NEW | causal determinism + byte-exact pre/post-pass |
| `test_bitplane.cpp` | EXTEND | `VB-X-RESIDUAL-ROUNDTRIP` |
| `test_wavelet_container.cpp` | EXTEND | `residual_mode` parse/serialize + NET audit |
| `benchmarks/probe_sandbox.sh --x6a/--x6b/--x6c` | NEW | each X6 phase harness + L1 sub-gate |
| `benchmarks/bench_gate.sh` | Existing | final dual-unit M2/M3 gate |

---

## 9. Decision Tree

| Outcome | Consequence |
|---|---|
| X6a pre-pass harness broken | Fix and re-run; no verdict until `VB-X-RESIDUAL-ROUNDTRIP` green |
| X6a L1 < +2.0% | record honestly; combine with L2/L3 before closure call |
| X6a L1 >= +4.5% (M2 plausible) | proceed to X6b |
| X6b >= +1.0% over X6a | proceed to X6c |
| X6c L3b overhead <= 0.02 bpp AND combined <= 2.95 | proceed to X7 |
| X7 clears M2 only | open reserve / M2-PASS/M3-PENDING |
| X7 clears M2 AND M3 | format-stable PR; `Refs #130`; freeze lifts on merge |
| everything fails | full negative ledger; Anti-Surrender re-examination, not silent close |

---

## 10. Deliverables Checklist

- [ ] `ideas/2026-08-29-prism-route4-x6-learned-source.md` (this blueprint, addendum 26)
- [ ] `progress/130-prism-route4-beyond-predictive.md` (X6 milestones appended)
- [ ] `predictor.h/.cpp` + `predictor_data.inc` (L1 causal coefficient predictor)
- [ ] `WaveletHeader.residual_mode` field + container serialize/parse
- [ ] `frame_wavelet_encode_residual` / `frame_wavelet_decode_residual`
- [ ] `train-predictor` CLI (MSE proxy + codelength fine-tune, LOO primary)
- [ ] L2: widen `LearnedModel` to 24->64->32->1 + enrich `LCFeat`
- [ ] L3 (reserve): hyperprior side-stream, bounded <= 0.02 bpp in NET
- [ ] X6a/b/c harness + gates; dated CSVs `2026-08-29-x6a-*.csv` etc.
- [ ] X7 full Kodak-24 dual-unit `bench_gate.sh` (M2 AND M3 vs real cjxl/WebP)
- [ ] Frontend residual atlas + explorer toggle

---

- the Architect
