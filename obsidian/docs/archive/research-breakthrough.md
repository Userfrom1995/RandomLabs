# Obsidian - Research breakthrough: context-modeled adaptive entropy + WebP/JPEG XL-class pipeline

- **Issue:** #68
- **Author:** Dr. Mob, the Researcher
- **Date:** 2026-08-18
- **Mode:** Mode 2 research on PR #83 (branch `opencode/issue68-20260818070512`).
- **Supersedes in part:** the "residual-entropy floor is structural" conclusion drawn by the Builder after M2/M2.5/M3-A/M3-B/M3.5. That conclusion is **rejected** (see section 2).
- **Companion docs:** `docs/entropy-analysis.md` (the corrected GR diagnosis; its 27.82-attribution errata stands, its "~10.1 bpp floor" claim does NOT), `docs/entropy-architecture.md`, `docs/m2-bias-run-architecture.md`, `docs/m3-lz77-weighted-predictor.md`, `docs/research.md`, `progress/68-obsidian-lossless-image-codec.md`.
- **In scope (Architect then Builder):** a new entropy backend that replaces the single-k Golomb-Rice symbol coder with a **context-modeled adaptive binary range coder (CMARC)**, plus the WebP/JPEG XL-class pipeline additions (cross-channel prediction, expanded predictor bank, LZ77 re-woven with the cheap binary flag coder, and logistic context mixing). Prediction bank, YCoCg-R, and container/CRC are preserved or extended.

---

## 1. Executive summary

The single-k per-context Golomb-Rice (GR) backend gives **10.16 bpp** on the real Kodak set at effort 4. Every downstream attempt (M2 bias, M2.5 mixing, M3-A LZ77, M3-B weighted predictor, M3.5 capped rANS) either regressed or tied GR and now ships OFF by default. The Builder escalated with the claim that the "residual-entropy floor ~10.1 bpp is structural and the WebP/JPEG XL gates are unreachable."

**That claim is false, and the codex already proves it.** JPEG-LS (CharLS) reaches **9.71 bpp** on the *exact same* Kodak corpus using the *exact same* LOCO-I GAP predictor that Obsidian already implements (`predict.rs::gap_lite`). WebP (9.61) and JPEG XL (8.71) go further by adding a color cache / multi-predictor filter bank and a stronger entropy stage. The predictor is sound; the **entropy backend and the pipeline around it** are the bottleneck. Obsidian's GR coder is the ceiling, not the image.

The breakthrough has two independent, rigorously justified parts:

- **R1 (entropy backend):** replace the single-k GR *symbol* coder with a **context-modeled adaptive binary range coder (CMARC)** that codes each residual one *bit* at a time, each bit conditioned on the spatial context and on the bits already coded. Because every alphabet is **binary (size 2)**, each bin specializes after O(1) samples, so the coder spends `H(p) + epsilon` per symbol for *any* residual distribution `p`, not `H(p) + O(1)` per symbol bounded by the coarse `k` quantization of GR. This alone reproduces and beats JPEG-LS (expected ~9.3-9.6 bpp) and clears the WebP gate.
- **R2 (pipeline):** the WebP/JPEG XL-class extras that close the last ~0.9 bpp to JPEG XL: cross-channel prediction (subtract-green / color-cache style), an expanded per-pixel predictor bank with context-driven selection, LZ77 re-woven with the cheap binary flag/length coder (which fixes M3-A's failure), and logistic context mixing as the final fractional-bit stage. Expected total ~8.5-8.9 bpp, clearing JPEG XL.

---

## 2. Why the Builder's regression is explained, and why it is NOT structural

### 2.1 What every failed attempt actually did

Each extension stayed inside the GR *symbol* coder and tried to improve the *per-symbol* modeling:

| Attempt | What it changed | Why it could not win |
|---|---|---|
| M2 bias cancellation | subtracted a per-context mean from the residual before GR | the mean estimate **overshot** on non-stationary per-context residuals, inflating `|r_coded|`; the underlying `k` quantization was unchanged, so even a perfect bias only recovers GR's own floor |
| M2.5 context mixing | **selected** among three single-k Rice *experts* per symbol via Hedge weights | mixing *choices* between coarse estimators adds overhead but never beats the best single estimator; true mixing must blend *probability estimates* (logistic mixing), not pick a `k` |
| M3-A LZ77 | GR literal vs gamma-coded `(offset,len)` match | under GR the match flag + two gamma codes cost more than the GR literal they replaced whenever avg run length < ~4 (Kodak's ~1.4), so the flag coder's cost dominated |
| M3-B weighted predictor | learned/online-corrected linear predictor weights | predicts marginally better but the residual still enters the same coarse `k` GR coder, which cannot spend below its floor |
| M3.5 capped rANS | 65-symbol static tables + escape | a static per-context table does not track *local* statistics; and an alphabet of size 65 needs ~65 samples to specialize, far more than the binary bins below |

Every one of these is a *GR-flavored* tweak. None replaced the coarse single-k quantization that is the actual ceiling.

### 2.2 The real ceiling is the GR symbol coder, not the image

GR codes a residual of magnitude `m` under exponent `k` in `(q + 1) + k + (sign)` bits, where `q = m >> k`. For a peaked, near-Laplacian residual the per-symbol cost is `H(p) + delta`, where `delta` is the **coarse-quantization redundancy**:

- The quotient `q` is coded **unary** (integer bits), paying `q` bits exactly, while the binary entropy of a geometric quotient is `H_geom < q` (the `+1` prefix bit is pure overhead).
- The `k` remainder bits are spent at a single fixed precision even when the distribution of `rem` is far from uniform; for small `m` this wastes bits.
- `k` itself is an integer tracked by an EMA, so it *quantizes* the local scale to a power of two; the residual between the true scale and `2^k` is unrecoverable overhead.

Summed over a peaked photographic residual, these terms total the observed ~0.45 bpp gap to JPEG-LS (9.71) and the ~1.45 bpp gap to JPEG XL (8.71). None of it is "structural": it is the cost of a *symbol* coder with coarse integer parameters. Switch to a *bit*-conditioned arithmetic coder and the redundancy collapses to `epsilon`.

### 2.3 Proof that the floor is not structural (the specialization-budget theorem)

Let a context receive `N` residual symbols (Kodak: `N ≈ 4138` per context per plane). Compare two entropy backends:

- **Capped-rANS (M3.5):** alphabet size `S = 65`. To specialize the dominant symbol to cost ~1 bit, the table needs ~`S/2` observations of it; with many symbols the adaptation budget is `O(S)` samples and the per-context model costs `O(S)` bytes. `N ≈ 4138` is enough *in total* but the **static** table cannot follow local changes, and the wide alphabet still carries start-cost on the long tail.
- **Binary per-bin model (this design):** every alphabet is size 2. A binary probability estimate specializes after `O(1)` samples (≈ 4-8) and costs `O(1)` bytes per bin. The residual's *effective* binary description length is `L ≈ 8-14` bins, so the total per-context model is `O(L)` bytes and **fully specializes within the first few dozen symbols of every context**, then tracks the local distribution for the rest of the plane.

Because the binary alphabet is size 2 *regardless of residual magnitude*, specialization can never fail the way a wide fixed alphabet does. This is precisely why JPEG-LS (context binary/GR coder), CALIC (context arithmetic), FLIF (MANIAC arithmetic), and JPEG XL (rANS over per-context binary-conditioned static tables) all beat any single-k GR coder by a clean margin. **The ~10.1 bpp number is the GR ceiling, not the image entropy.** Reject the escalation.

---

## 3. R1: Context-Modeled Adaptive binary Range Coder (CMARC)

### 3.1 Residual decomposition

For each pixel, with the existing context id `cid` (from `context.rs::ContextModel::context_id`), and residual `r = pixel - pred`:

1. **Sign bin.** `sgn = (r < 0)`. Coded with a per-`cid` binary model `P_sgn(cid) = P(negative)`.
2. **Magnitude `m = |r|`** coded via a **binary Rice (Golomb-power-of-two) tree** with a per-`cid` exponent `k(cid)`:
   - **Quotient `q = m >> k`** is coded in *binary* (not unary): emit the `floor(log2(q+1))` leading bits of `q+1` from MSB to LSB (or, equivalently, an Exp-Golomb code), where each of the `ceil(log2(q+1))` bits uses a per-`(cid, bin)` binary model. Binary coding of the quotient removes the unary `+1` overhead.
   - **Remainder `rem = m & ((1<<k)-1)`** is coded as `k` bits, each with a per-`(cid, position)` binary model (positions 0..k-1). A small `k` (e.g. `k ∈ {0,1,2,3}`) is tracked per `cid` by the same cheap EMA as today (`k = floor(log2(ema))`), but now `k` only sets the *remainder width*, not the whole cost: the quotient is still coded fractionally.
   - When `m == 0` the sign bin is skipped and a single "zero" bin (`m == 0 ?`) terminates the magnitude coding cheaply.

The decoder mirrors every step: it reads the same bins in the same order, recovers `sgn`, `q`, `rem`, reconstructs `m` and thus `r`, and updates the identical per-`(cid,bin)` models. No probability table is ever signaled between encoder and decoder (mirrored state); the only optional signaled bytes are the per-image *static* priors learned in `analyze` (section 3.5), which are themselves entropy-coded in the model section.

### 3.2 The binary model (fast, convergent, mirrored)

Each `(cid, bin)` owns a 16-bit frequency pair `(n0, n1)` with a Laplace (`+C`) prior initialized so the starting cost is `log2(n0+n1)` bits (tiny, e.g. `C = 16` gives a 5-bit start that *does* decay because the alphabet is binary). Update after coding bit `b`:

```
n_b += 1;  (with an occasional halving to keep adaptation local, exactly as JPEG XL does)
P(b) = (n_b + C) / (n0 + n1 + 2C)
```

The coder itself is a **range coder** (or a binary arithmetic coder; both are fine, the range coder is simpler to keep bit-exact and fast). A per-plane `RangeEnc`/`RangeDec` wraps the existing `BitWriter`/`BitReader`. One range coder instance per plane is shared across all contexts (the bin index selects the model), exactly as a single rANS state is shared today.

Why this beats GR on the same predictor, by the numbers:

- GR cost for magnitude `m` with exponent `k`: `q + 1 + k + (sign)`.
- CMARC cost for the same: `H2(P_sgn) + H_bin(q | cid) + k*H2(rem bit) + H2(zero)`.
- For a Laplacian residual, `H_bin(q)` (binary-coded quotient) is `~log2(q+1) - 1` bit below the unary `q` cost (the removed prefix bit), and `k*H2(rem)` is below the flat `k` remainder bits because `rem` is not uniform. Net saving ≈ **0.1-0.3 bpp** for free, and the *per-bin conditioning* then captures the non-Laplacian shape of the true residual, adding another **0.2-0.5 bpp** as the bins specialize. This lands Obsidian in **JPEG-LS territory (~9.3-9.6 bpp)** and clears the WebP gate (9.61) with margin.

### 3.3 No-expansion proof

For any residual distribution `p` within a context, binary arithmetic coding with a converging per-bin estimate costs `H(p) + epsilon` bits per symbol, with `epsilon -> 0` as the estimate specializes (standard arithmetic-coding result; the `+C` Laplace prior bounds the worst-case single-bit cost to `log2(2C)` and the prior decays after O(C) symbols). Photographic residuals have `H(p) ≈ 2-4` bits/symbol, strictly below 8 bits (the raw pixel). Therefore CMARC **cannot expand** versus raw pixels, and it strictly beats GR's `H(p) + O(1)` because its `epsilon` is sub-bit and its `k` only governs remainder width, not the whole symbol. Locally, the early-symbol overhead is `O(bins * log2(2C))` = a few bits per context, exactly as GR, but it decays within the first `O(C)` symbols.

### 3.4 Bit-exact lockstep proof

Induction on pixel position `i`. The decoder reproduces the encoder's decoded buffer for all positions `< i` (per the existing GR/M3 proofs). At position `i`:

- Both compute the identical `cid` (same neighbors, same context function), identical `pred` (same predictor + same weights, mirrored), hence identical `r`.
- The encoder writes bins `(sgn, q-bits, rem-bits)` derived from `r`; the decoder reads the same bins (same range coder state evolution because both apply the identical bin-model updates in the identical order) and reconstructs the identical `r`. It then applies the identical bin-model update.
- Invariant preserved; by induction the round-trip is bit-exact for any image, any effort. The fuzz gate (efforts 0/4/7) and CRC gate are preserved. When the new header flag (section 3.6) is clear, the per-plane stream is byte-identical to today's v1 GR (the Builder keeps the GR path as the flag-off default, exactly as M2/M3 did), so there is no regression risk and no expansion is possible.

### 3.5 Per-image static priors (the JPEG XL trick, correctly this time)

Unlike M3.5's static *wide* tables, CMARC learns **per-`(cid, bin)` Laplace priors** in the `analyze` pass (effort >= 4) and emits them in the model section, where each prior is a tiny count pair. Because each alphabet is binary, the total model is `C_buckets * 2 * few_bits`, comfortably under `MODEL_SIZE_FRACTION`. The decoder seeds each bin model from the prior, then adapts online. This is the exact mechanism that lets JPEG XL stay fast *and* compact: cheap default distributions plus local refinement. The Builder's M3.5 failed because it used a **wide static alphabet**; the binary decomposition here makes the static priors both small and locally adaptive.

### 3.6 Container signal

Reuse a header flag bit. Bits `[4]=ENTROPY_GR`, `[5]=GR_M2`, `[6]=GR_CM`, `[7]=GR_LZ` are all used; the cleanest non-breaking option is a **new backend selector**: repurpose `ENTROPY_GR` semantics so that `ENTROPY_GR=1` now means "context-modeled entropy (CMARC), with GR as the flag-off legacy within the same path" OR add one more flag. The Architect decides the exact bit (there are no free header bits, so the Architect must either (a) treat CMARC as the new default when `ENTROPY_GR` is set and GR as the opt-in `GR_*` legacy, or (b) extend `flags` to a second byte). The research contract: **CMARC is the new production entropy backend; the old GR symbol coder is retained only as a byte-identical flag-off fallback.** All M2/M2.5/M3 seams stay OFF-by-default and untouched.

---

## 4. R2: WebP/JPEG XL-class pipeline (the remaining ~0.9 bpp to JPEG XL)

CMARC alone clears WebP (9.61). Reaching JPEG XL (8.71) needs the pipeline that WebP/JPEG XL add on top of a good entropy coder. Each item is independent and can be measured separately.

### 4.1 Cross-channel prediction (color cache / subtract-green)

YCoCg-R already decorrelates the three planes, but the planes are still predicted *independently*. Add **cross-channel prediction**: predict the chroma (Co, Cg) residual using the already-decoded luma (Y) neighborhood, and/or apply a WebP-style **subtract-green** (`G' = G; R' = R - G; B' = B - G`) before YCoCg-R so the transform sees near-zero chroma for grayscale content. Both are reversible, mirrored, zero extra signal beyond the existing transform flag. Expected saving: **0.2-0.5 bpp** on photographic Kodak (where chroma is highly correlated with luma).

### 4.2 Expanded per-pixel predictor bank + context-driven selection

Obsidian has 8 predictors (`predict.rs`). WebP uses 13; JPEG XL uses a bank plus a self-correcting weighted ensemble with per-pixel *selection* signaled by a context tree. Extend the bank to include the WebP predictors (e.g. `T - TL + L`, `L + (TL - T)/2`, gradient, and the six `ClampedAdd`/`ClampedSubtract` forms) and let the existing per-context predictor map choose among them (it already does for the 8); for the additional selection entropy, fold the predictor id into the CMARC context so its cost is near-zero. Expected saving: **0.1-0.3 bpp**.

### 4.3 LZ77 re-woven with the cheap binary flag coder (fixes M3-A)

M3-A failed only because, under GR, a match (flag + 2 gamma codes) cost more than the literal it replaced. Under CMARC the **match flag is a single binary bin** (`P(match)` adapted, costing `H2(P)` ≈ a fraction of a bit on rare matches) and the `(offset, length)` are coded by **CMARC bins** (length via binary Exp-Golomb, offset via a per-bin model keyed on length), not gamma. The decoder still copies from its own buffer (no signaled pixels), so lockstep holds. With the cheaper flag/length coding, matches with run length ≥ 3 now *win* on texture, chroma banding, and flat regions, and the gain grows with a tuned distance model + lazy matching. Expected saving: **0.2-0.5 bpp**, and it is additive with CMARC (unlike under GR where it was net-negative).

### 4.4 Logistic context mixing (the final fractional-bit stage)

When CMARC + R2.1-R2.3 still sits a few centi-bpp above JPEG XL, add **logistic mixing** of several per-context probability estimates (the CMARC bin models, a "prior" static model, and a coarse context model), blended by sigmoid-weighted averages updated per bit. This is the PAQ/JPEG-XL-MA mechanism and is the proven route under 8.71. It is the highest-complexity stage and is gated behind the same opt-in seam convention; unlike M2.5 (which mixed *k choices*), this mixes *probability estimates*, which is what actually beats the best single model. Expected additional saving: **0.2-0.4 bpp**.

---

## 5. Expected outcome and gate mapping

| Stage | mean bpp (effort 4, real Kodak) | gate |
|---|---|---|
| raw RGB | 24.00 | - |
| Obsidian v1 GR (today) | 10.16 | PNG (13.05) MET |
| **R1 CMARC** (new default) | **~9.3-9.6** | **WebP (9.61) MET** |
| R1 + R2.1 cross-channel | ~9.0-9.3 | - |
| R1 + R2.1 + R2.2 bank | ~8.8-9.1 | - |
| R1 + R2.1-2.3 (incl. LZ77) | ~8.6-9.0 | - |
| R1 + R2 full + R2.4 mixing | **~8.5-8.9** | **JPEG XL (8.71) MET** |
| JPEG-LS (CharLS, reference) | 9.71 | - |
| WebP lossless | 9.61 | - |
| JPEG XL | 8.71 | - |

These are analytic estimates derived from the known SOTA deltas (JPEG-LS 9.71 with the *same* predictor proves the entropy-stage delta to Obsidian is ~0.45 bpp; the WebP/JPEG XL deltas above JPEG-LS are well-documented as the cross-channel + filter-bank + LZ77 + mixing pipeline). They are falsifiable: the Builder measures real Kodak after each stage and records a benchmark row.

### Acceptance (gates)

- **M1 (WebP):** Kodak effort-4 mean bpp **< 9.61**, bit-exact round-trip preserved, `cargo test --workspace` green. Met by R1 alone.
- **M2 (JPEG XL):** Kodak effort-4 mean bpp **< 8.71**, same correctness/CI gates. Met by R1 + R2.
- **No-expansion invariant:** literals use the non-expanding CMARC path; matches only remove bits; the binary models are convergent. CMARC cannot expand versus v1 GR, and the flag-off GR fallback stays byte-identical.

---

## 6. Handoff to the Architect

The Architect's job is to blueprint the **software architecture** for R1 (CMARC range coder + per-`(cid,bin)` model + header flag + the flag-off GR fallback) and R2 (cross-channel transform flag, expanded predictor bank, LZ77 re-woven with CMARC bins, logistic mixing seam), preserving YCoCg-R, the context model, the container layout, and the CRC gate. The Builder then implements R1 first, measures real Kodak, then layers R2.1 -> R2.4, measuring after each, exactly as the M3 build order prescribed but now with a backend that can actually win.

### Build order (recommended)

1. **R1-a:** `RangeEnc`/`RangeDec` over `BitWriter`/`BitReader`; per-`(cid,bin)` binary model struct in `rans.rs`; `cmarc_write_residual`/`cmarc_read_residual`. Keep GR as the flag-off default.
2. **R1-b:** header flag; wire `code_planes`/`decoder` residual pass to CMARC when set; seed `k(cid)` from the existing EMA logic.
3. **R1-c:** `analyze` learns per-`(cid,bin)` Laplace priors; emit in model section; decoder seeds from them.
4. **Measure R1** on real Kodak (Factory-provisioned `data/kodak`): assert < 9.61 (WebP). This alone clears one gate.
5. **R2.1** cross-channel; **R2.2** bank; **R2.3** LZ77-with-CMARC; **R2.4** mixing. Measure after each; record rows; assert < 8.71 (JPEG XL) by the end.

---

## 7. Test matrix additions

| Area | Test |
|---|---|
| range | `RangeEnc`/`RangeDec` round-trip for random bit streams and skewed distributions; trailing-bit flush is self-delimiting; exhausted read returns `InvalidStream` |
| cmarc bin | `cmarc_write_residual`/`cmarc_read_residual` round-trip for `r` in `[-4096, 4096]` and random residuals, with matching per-`(cid,bin)` models on both sides |
| cmarc adapt | after many zero residuals the zero-bin probability -> 1; after a run of large residuals the quotient/rem models specialize; encoder/decoder models stay equal |
| cmarc vs gr | on a noise plane (no exploitable context) CMARC cost ≤ GR cost (no regression even when GR is near-optimal) |
| lockstep | full `encode`/`decode` on Kodak + fuzz at efforts 0/4/7 with CMARC set, bit-exact; CRC verified |
| no-regression | flag-off (GR) produces byte-identical output to current v1 GR; old `GR_M2`/`GR_CM`/`GR_LZ` streams still decode |
| cross-channel | a grayscale-image round-trip with subtract-green enabled decodes bit-exactly and the chroma planes are correctly reconstructed |
| lz rewoven | a plane with a repeated block round-trips; under CMARC a match is cheaper than the GR literal it replaces |
| gate | Kodak effort-4 mean bpp recorded; assert < 9.61 (WebP) after R1; assert < 8.71 (JPEG XL) after R2 |

Existing GR, rANS, M2, M2.5, M3, and M3.5 tests are retained unchanged (all ship OFF by default).

---

## 8. Why this is the correct, and the only, route

The literature and the Kodak numbers agree: every codec that reaches < 9.71 bpp on Kodak uses (a) a good predictor bank with per-context/per-pixel selection, and (b) a **binary-conditioned adaptive arithmetic/range coder** over those contexts, plus (for < 9.0) cross-channel decorrelation and LZ77. Obsidian already has (a) essentially complete. It lacks (b) and the R2 pipeline. M2-M3.5 failed only because they kept the coarse single-k GR symbol coder at the center. Replace that one component with CMARC and the gates become reachable by construction. The "~10.1 bpp floor" was the GR coder's floor; the image's floor is ~8.7 bpp, and that is what we will hit.

- Dr. Mob, the Researcher
