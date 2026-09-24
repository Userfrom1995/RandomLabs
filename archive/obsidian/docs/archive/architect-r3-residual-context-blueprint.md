# Obsidian - Architect blueprint R3 (CORRECTED): Rice-through-binary magnitude + bounded residual-context conditioning

- **Issue:** #68
- **Author:** the Architect
- **Date:** 2026-08-18
- **Mode:** Mode 2 iterative enhancement on PR #83 (branch `opencode/issue68-20260818070512`).
- **Supersedes:** the earlier `architect-r3-residual-context-blueprint.md` (delivered 13:32Z), which the Builder implemented and then **reverted** because it regressed synthetic CARC from ~14 bpp to ~28 bpp. This document is the corrected design, derived directly from the empirical failure and from reading the actual CMARC code (`rans.rs`, `context.rs`, `encoder.rs`, `decoder.rs`, `model.rs`).
- **Companion docs:** `docs/architect-cmarc-blueprint.md` (R1/R2), `docs/research-breakthrough.md`, `progress/68-obsidian-lossless-image-codec.md`.

---

## 0. Why the first R3 regressed (read this first)

The Builder's revert report named the failure precisely: adding the JPEG-LS DIFF residual context pushed synthetic CARC from ~14 bpp to ~28 bpp. The cause is **not** that residual context is wrong (JPEG-LS uses exactly it and reaches 9.71 bpp on the same Kodak corpus with the same LOCO-I GAP predictor). The cause is a **model-budget blowup interacting with a pathological prior**. Concretely, from the current code:

- `cmarc_write_residual` (`rans.rs:1286`) codes the magnitude as **fixed-width MSB-first binary over `mag_bits` positions, each position split into `CMARC_MAG_STATES = 4` window states** (`rans.rs:1021-1053`). So `cmarc_bins_per_ctx(mag_bits) = 2 + mag_bits * 4`. For an 8-bit plane `mag_bits = 8`, that is **34 bins/context**; the code path even allows up to `CMARC_MAG_BITS_MAX = 16` → **66 bins/context**.
- The residual DIFF context the first R3 added had ~165 distinct ids (`residual_context` packing `ql/qu/qul` 0..=8 + 3 sign bits, then an `RC_LUT.reduce`). Combined with the existing activity multiplication (`rc * ACTIVITY_CLASSES + act`) the coding-context count was pushed well past 165.
- Total per-plane models = `context_count * bins_per_ctx`. With ~165 contexts * 66 bins = **~11,000 models per plane**. Kodak gives ~1.18M residuals/plane, but the DIFF-context distribution is extremely skewed: most of those 11k models are visited only a handful of times.
- Every `BinModel` starts at `CMARC_PRIOR = 64` → `P(bit==1) = 64/4096 ≈ 0.0156` (`rans.rs:974`), and adapts only `CMARC_STEP = 48` per observation (`rans.rs:976,1004-1007`). So a sparsely-visited model whose true bit probability is ~0.5 stays pinned near the prior. Coding a "1" bit there costs `-log2(0.0156) ≈ 6 bits` instead of ~1 bit. That is the 2x blowup: the rare-context models, starved by the 11k-model budget and pinned to a wildly wrong prior, inflate the cost far more than the extra context granularity saves.

Two facts follow, and they dictate the corrected design:

1. **The prior is the killer, not the context count per se.** A neutral prior would cap the worst-case per-bin cost at 1 bit, so a starved context merely fails to compress rather than exploding. The first R3 kept `CMARC_PRIOR = 64`; that must change.
2. **Bounded bins-per-context is what makes many contexts affordable.** The fixed-width magnitude at 66 bins/context is what made 165 contexts untenable. Replacing it with a Rice decomposition cuts bins/context to a small constant (~11-19), so a JPEG-LS-like residual context (<= 365) becomes cheap.

The corrected R3 therefore does **three** things, in this order: (B) Rice-through-binary magnitude with a bounded, constant bin count; (P) neutral binary prior; (A) residual DIFF context capped at JPEG-LS-like count, with NO activity-class multiplication, and a per-image selection flag so a regression can never ship. R3-B is built and measured first (it is safe on its own and isolates the magnitude fix); R3-A is layered on top.

---

## 1. R3-B: Rice-through-binary magnitude (the enabler)

Replace the fixed-width window-conditioned magnitude loop in `cmarc_write_residual` / `cmarc_read_residual` (`rans.rs:1286-1344`) with a **Golomb-Rice decomposition routed through the binary range coder**, exactly as JPEG-LS's regular mode but using CMARC's adaptive `BinModel`s.

Decomposition (identical on encode/decode, lockstep preserved):

```
m = |r|
zero_flag = (m == 0)                      // 1 bin
if zero_flag == 0:
    sign_bit  = (r < 0)                   // 1 bin
    k  = ctx.k()                          // per-context Rice exponent from CarcCtx (EMA of |r|)
    q  = m >> k                           // Rice quotient
    rem = m & ((1u32 << k) - 1)           // Rice remainder, k bits
    // quotient: a run of q ZERO bits then a STOP-ONE, through ONE adaptive bin (CMARC_BIN_Q).
    //   Because the bin is adaptive, after learning the geometric distribution this costs
    //   ~ log2(q+1) - H_geom  (optimal for the quotient). No per-bit floor, no unary blowup.
    for _ in 0..q { enc.put(w, &mut models[cid_bin(cid, bins, CMARC_BIN_Q)], false); }   // 0
    enc.put(w, &mut models[cid_bin(cid, bins, CMARC_BIN_Q)], true);                     // stop 1
    // remainder: k bits MSB-first, each through bin CMARC_BIN_REM + j*W + window
    //   (window = trailing CMARC_REM_WIN remainder bits already coded, the R2 cross-bit conditioning,
    //    now applied to the small remainder instead of the full magnitude).
    for j in 0..k {
        bit = (rem >> (k-1-j)) & 1 == 1
        state = (window & ((1<<CMARC_REM_WIN)-1)) as usize
        enc.put(w, &mut models[cid_bin(cid, bins, CMARC_BIN_REM + j*CMARC_REM_WIN_STATES + state)], bit)
        window = ((window<<1)|bit) & ((1<<CMARC_REM_WIN)-1)
    }
ctx.adapt(m)                              // updates k via the existing EMA (CarcCtx::adapt, rans.rs:1092)
```

`CarcCtx` (`rans.rs:1064`) already tracks `k` from an EMA of `|r|`; the current code **computes `k` but never uses it** (the fixed-width path ignores it). R3-B finally uses it. Because the encoder and decoder compute the identical `r` and evolve the identical EMA, `k` is bit-exact by induction.

### 1.1 New bin layout (constant per plane, independent of `max-min`)

```rust
pub const CMARC_BIN_ZERO: usize = 0;     // unchanged
pub const CMARC_BIN_SIGN: usize = 1;     // unchanged
pub const CMARC_BIN_Q:    usize = 2;     // quotient geometric run (single bin)
pub const CMARC_BIN_REM:  usize = 3;     // first remainder bin

pub const CMARC_REM_WIN: usize = 2;                 // trailing-window width for remainder bits
pub const CMARC_REM_WIN_STATES: usize = 1 << CMARC_REM_WIN;   // = 4
pub const CMARC_REM_MAXK: usize = 8;               // remainder width cap; k clamped to <= 8

pub fn cmarc_bins_per_ctx() -> usize {
    CMARC_BIN_REM + CMARC_REM_MAXK * CMARC_REM_WIN_STATES   // = 3 + 8*4 = 35 (constant)
}
```

`cmarc_mag_bits` is retained only for the LZ literal region (`cmarc_lz_bins_per_ctx` still uses it); the plain CMARC residual path no longer depends on plane `max-min`, so model size is now **constant per context** regardless of bit depth. With residual context capped at 365 (section 3), that is `365 * 35 = 12,775` models/plane — comparable to the failed 11k, **but** with the neutral prior (section 2) the rare-context worst case is bounded to 1 bit/bin instead of 6, so the blowup cannot recur. (If measurement shows 12,775 is still too sparse, drop `CMARC_REM_WIN` to 1 and/or `CMARC_REM_MAXK` to 6; both are one-line tunables.)

### 1.2 Why this is correct and safe

- The quotient run through one adaptive bin is textbook Golomb-Rice: optimal for the geometrically-distributed quotient, no unary blowup (the first R3-B attempt failed only because it coded the quotient as a *literal unary* run with a mis-wired stop; here the stop is an explicit `true` after `q` falses through the same single model).
- The remainder keeps the R2 cross-bit conditioning but only over `k <= 8` bits, so its model count is tiny and it specializes fast.
- No-expansion invariant holds: every bin is a convergent binary model with a `+C` Laplace start bounded by `log2(2C)`; decoding is exact by induction. The never-expand safety net (section 4) is unchanged.

---

## 2. Neutral binary prior (the regression-proofing change)

Change the dynamic `BinModel` default so a starved context can never cost ~6 bits. In `rans.rs`:

```rust
pub const CMARC_PRIOR: u16 = 2048;   // was 64. P(bit==1) = 0.5 neutral.
```

Rationale: with `p = 2048`, the cost of any single bit in a never-adapted (starved) model is exactly `-log2(0.5) = 1 bit`. So a sparse context at worst fails to compress (1 bit/bin, i.e. no gain) instead of exploding to 6 bits/bin. Frequent contexts still adapt within ~30 residuals (step 48 from 2048 toward their true probability) and recover the full saving. This single constant is what makes "many contexts" safe, and it is the substantive difference between this blueprint and the one that regressed.

Optional refinement (only if measurement shows warm-up cost on frequent contexts): keep a per-bin-type initial prior via `BinModel::with_p(p)` — ZERO bin low (~0.15), SIGN/REM neutral (0.5), Q neutral (0.5) — but the global neutral default is sufficient and is what prevents regression. R2's existing fixed-width path also benefits (it is only ever selected by the safety net anyway).

`CMARC_STEP` (48) and `CMARC_LAPLACE` (16, only for the R1-c static priors, untouched) are left as-is. If convergence feels slow after R3-B measurement, bump `CMARC_STEP` to 64 as a one-line tuning change.

---

## 3. R3-A: residual DIFF context (the JPEG-LS delta), correctly bounded

Add `residual_context(d_l, d_u, d_ul)` to `context.rs` and use it as the **CMARC coding context only** (predictor selection stays on the gradient context, unchanged in `analyze`).

### 3.1 Neighbor residuals (encoder and decoder, identical)

In the CMARC coding loop of `code_planes` (`encoder.rs:846-`) and `decode_planes` (`decoder.rs:419-`), for pixel `(x,y)` the causal neighbors `L=(x-1,y)`, `U=(x,y-1)`, `Ul=(x-1,y-1)` are already reconstructed. Compute each neighbor's residual with the **same** per-context predictor map already used for the current pixel:

```rust
let pred_l  = predict_clamped(model.predictor(pi, cid_l),  &nb_l,  w, range);
let pred_u  = predict_clamped(model.predictor(pi, cid_u),  &nb_u,  w, range);
let pred_ul = predict_clamped(model.predictor(pi, cid_ul), &nb_ul, w, range);
let d_l  = (plane[idx_l]  as i32) - pred_l;
let d_u  = (plane[idx_u]  as i32) - pred_u;
let d_ul = (plane[idx_ul] as i32) - pred_ul;
```

Border pixels (x==0 / y==0): missing neighbors contribute `d = 0` (the JPEG-LS neutral state). The decoder reproduces `d_l/d_u/d_ul` bit-exactly by induction (its neighbors equal the encoder's), so the resulting `cid` matches at every pixel. Lockstep preserved.

### 3.2 Quantization + bounded id (no activity multiplication)

Use a compact residual quantization `QR(d)` (mirror of JPEG-LS):

```
QR(d): |d| in 0->0, 1->1, 2..3->2, 4..7->3, 8..15->4, 16..31->5, 32..63->6, 64..127->7, 128+->8
```

Pack into an id and reduce through a sign-symmetry LUT (reuse the `SignSymmetryLut` machinery already in `context.rs`, which maps 729 triples to 365 ids):

```rust
pub fn residual_context(d_l: i32, d_u: i32, d_ul: i32) -> usize {
    let ql  = quantize_residual(d_l);    // 0..=8
    let qu  = quantize_residual(d_u);
    let qul = quantize_residual(d_ul);
    let sl  = (d_l < 0) as usize;
    let su  = (d_u < 0) as usize;
    let sul = (d_ul < 0) as usize;
    RC_LUT.reduce(pack(q1, q2, q3) as usize)   // 0..=364, sign-symmetric
}
```

**Crucial difference from the failed blueprint:** the coding `cid` is *only* `residual_context(...)` (<= 365). Do **not** multiply by `ACTIVITY_CLASSES`. Predictor selection continues to use the gradient/activity context in `analyze` (unchanged). This keeps the context count at JPEG-LS's proven <= 365 instead of the >1000 the first R3 used — that reduction is what, combined with the neutral prior, removes the regression.

### 3.3 Model budget

`365 * 35 = 12,775` models/plane, all in RAM, **zero bytes in the file** (the context is mirrored; only the optional R1-c static priors touch the bitstream, and those are sparse and guarded by `MODEL_SIZE_FRACTION`). No header flag, no `VERSION` bump — the context assembly is internal to the CMARC path, so every legacy stream still decodes.

---

## 4. Safety: never ship a regression

Two independent guards, both preserved/strengthened:

1. **Per-image context selection (new).** Add a mirrored `cmarc_residual_ctx: bool` to the model section (zero extra header bit; signaled like `cross_channel`). In `analyze`, when CMARC is a candidate, the encoder codes the plane **twice** — once with the gradient coding context and once with the residual DIFF context — and keeps the smaller, recording the winner in `cmarc_residual_ctx`. The decoder reads the flag to choose the context computation. This guarantees R3-A can only ship when it actually wins on that image. (If double-encoding in analyze is too slow, the fallback is: always try residual context, but the global net below still catches any regression.)
2. **Global never-expand net (existing).** The encoder already keeps the smaller of {GR, CMARC, CARC_LZ, CARC_MIX} per image and signals the winner via `entropy_mode`. CMARC (gradient or residual context) is selected only when it beats the model's best GR backend. Unchanged.

---

## 5. R3-C (follow-on): JPEG-LS run mode for near-constant regions

When both `QR(d_l)` and `QR(d_u)` quantize to 0 (local neighborhood near-constant), emit a binary `run_flag` + Elias-gamma run length (reuse `cmarc_lz_write_gamma` / `read_gamma`), then copy `prev_val` for the run body (exact by induction). This collapses the per-pixel zero/sign/quotient/remainder cost on flat/low-activity runs and adds margin toward JPEG XL. Dormant behind the never-expand net; add only after R3-A/B are measured.

## 6. R2.4 re-tune (follow-on)

Re-run logistic mixing (`ENTROPY_MODE_CARC_MIX`) on the corrected context. The earlier +3.57 bpp regression was measured on the distorted R2 context; with a correct base context and the neutral prior, the mix should finally have signal to exploit. Re-measure after R3-A/B.

R2.1 (cross-channel) and R2.2 (predictor bank) are unchanged and compose on top: the residual context is computed on the *transformed* planes, so chroma decorrelation flows through automatically.

---

## 7. Build order for the Builder (isolate the two fixes)

1. **R3-B only** (Rice magnitude + neutral prior), keep the *gradient* coding context. Re-measure on real Kodak (`run_kodak.sh --effort 4`). Expect a small gain over the 10.0906 fixed-width baseline and, importantly, **no regression** (neutral prior + bounded bins). Record `benchmarks/results/2026-08-18-real-kodak-r3b.csv`.
2. **R3-A** (residual DIFF context, per-image selection flag). Re-measure; assert `< 9.61` (WebP). This is the JPEG-LS delta and is expected to clear the gate now that the model budget and prior are fixed. Record `benchmarks/results/2026-08-18-real-kodak-r3a.csv`.
3. **R3-C** run mode, then **R2.4** re-tune; assert `< 8.71` (JPEG XL) by the end.
4. Keep all prior M2/M2.5/M3 seams OFF by default. Update `progress/68-...md` after each stage.

---

## 8. Test matrix additions (Builder)

| Area | Test |
|---|---|
| rice decomposition | `cmarc_write_residual`/`cmarc_read_residual` round-trip for `r in [-8192, 8192]` with the new bin layout; encoder/decoder models stay bit-identical |
| rice vs fixed-width | on a Laplacian proxy the Rice decomposition costs `<=` the old fixed-width binary (quotient run removes the per-bit floor) |
| neutral prior bound | a starved context (single visit) codes each bin at `<= 1 bit` (regression-proofing invariant) |
| residual-context | a smooth block and a detailed block produce *different* `cid`s; `residual_context` is sign-symmetric (mirrored LUT); border yields `d=0` |
| neighbor lockstep | encoder/decoder compute identical `d_l/d_u/d_ul` on synthetic Kodak; `cid` equal at every pixel |
| per-image selection | flag selects gradient vs residual context; decoder mirrors; round-trip exact |
| no-regression | flag-off (GR) byte-identical to v1 GR; all legacy streams still decode |
| gate | Kodak effort-4 mean bpp recorded; assert `< 9.61` (WebP) after R3-A/B; assert `< 8.71` (JPEG XL) after R3 + R2.4 |

Existing GR, rANS, M2, M2.5, M3, M3.5, R1, R2.1-R2.4 tests are retained unchanged.

---

## 9. Gate mapping, honest risk, and the Factory dependency

- **M1 / PNG (13.05):** already MET (10.09/10.16 bpp).
- **WebP (9.61):** target of R3-A/B, expected ~9.4-9.7 bpp (JPEG-LS territory, same predictor + context arithmetic coder).
- **JPEG XL (8.71):** target of R3 + R3-C + R2.4.
- **Honest risk:** the first R3 showed residual context can regress when starved; this blueprint removes that mechanism (neutral prior + bounded bins + per-image selection flag), but the *only* trustworthy measurement is on the **real 24-image Kodak set**, which requires `obsidian/benchmarks/data/kodak/` PPMs to be **durably committed to the branch** (the Factory's job — currently only `kodak.sha256` is tracked, and the earlier "10.0906 bpp real Kodak" was measured on transient PPMs that were never committed, so it is not reproducible). **R3 must not be declared done until the Factory lands durable Kodak data and the gates are re-measured reproducibly.** If, after correct implementation, real Kodak still does not clear WebP, that is a true signal to re-engage the Researcher/Architect for a richer marginal/context signal — not a reason to ship a regression.
- **No `VERSION` bump, no header flag:** CMARC uses `model.entropy_mode` (reusing the M3.5 mechanism), so every legacy stream keeps decoding.

- the Architect
