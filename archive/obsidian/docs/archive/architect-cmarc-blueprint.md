# Obsidian - Architect blueprint: CMARC context-modeled entropy + WebP/JPEG XL pipeline (R1 / R2)

- **Issue:** #68
- **Author:** the Architect
- **Date:** 2026-08-18
- **Mode:** Mode 2 iterative enhancement on PR #83 (branch `opencode/issue68-20260818070512`).
- **Supersedes:** the Builder's "residual-entropy floor ~10.1 bpp is structural; WebP/JPEG XL unreachable" escalation. Rejected by the Researcher (`obsidian/docs/research-breakthrough.md`): the 10.1 figure is the ceiling of the single-k per-context Golomb-Rice *symbol* coder, not the image. JPEG-LS reaches 9.71 bpp on the *same* Kodak corpus with the *same* LOCO-I GAP predictor Obsidian already implements, so the predictor is sound and the entropy backend is the bottleneck.
- **Companion docs:** `docs/research-breakthrough.md` (the math, no-expansion + lockstep proofs, gate map), `docs/m3-lz77-weighted-predictor.md`, `docs/entropy-architecture.md`, `docs/m2-bias-run-architecture.md`, `docs/entropy-analysis.md`, `progress/68-obsidian-lossless-image-codec.md`.
- **In scope (Builder):** `rans.rs` (binary range coder + `BinModel` + CMARC residual codec), `model.rs` (`ENTROPY_MODE_CARC` selector + per-(cid,bin) static priors), `encoder.rs`/`decoder.rs` (CMARC residual branch keyed on `entropy_mode`, replacing the GR symbol coder for production), then R2 additions (cross-channel transform, expanded predictor bank, LZ77 re-woven with CMARC bins, logistic mixing). Prediction bank, YCoCg-R, context model, container layout, and CRC gate are preserved; the legacy GR/rANS/capped paths remain as byte-identical fallbacks.

---

## 0. The one architectural decision that matters (and why it is NOT a header flag)

All 8 header `flags` bits are already allocated (`CH` x2, `TRANSFORM`, `PALETTE`, `ENTROPY_GR`, `GR_M2`, `GR_CM`, `GR_LZ`). The research doc floated "extend the header to a second flags byte (version bump)" as one option, but that is the wrong call for this codebase: **`model.rs` already solved the exhausted-flags problem** for M3.5 Design B via `ModelConfig.entropy_mode` (`ENTROPY_MODE_GR = 0`, `ENTROPY_MODE_CAPPED = 1`), signaled in the model section, read by the decoder to route the residual pass. No header bit, no `VERSION` bump, and every previously-produced stream (v1 GR, M2, CM, LZ, capped) still decodes.

**Decision: CMARC is a new `entropy_mode` value, not a header flag.**

- `ENTROPY_MODE_CARC: u8 = 2` - R1 CMARC baseline (the new production default at effort >= 1).
- `ENTROPY_MODE_CARC_LZ: u8 = 3` - R1 + R2.3 (CMARC literals + LZ77 match layer).
- `ENTROPY_MODE_CARC_MIX: u8 = 4` - R1 + R2.1/2.2 + R2.4 (CMARC + cross-channel + expanded bank + logistic mixing).

The decoder already switches the residual pass on `model.entropy_mode`, so routing is a single `match` arm addition. This keeps the container byte-identical for all legacy streams and adds zero header risk. The `gr_cmarc()`/flags2 idea from the research doc is explicitly rejected in favor of this cleaner, precedent-consistent path.

---

## 1. Why this beats GR (recap, with the architectural consequence)

GR codes a residual `r` in `(q + 1) + k + (sign)` bits under a single integer `k` per context. The redundancy is (a) the unary `+1` prefix on the quotient, (b) flat `k` remainder bits when `rem` is non-uniform, (c) the integer quantization of the local scale to `2^k`. Summed over a peaked photographic residual this is the observed ~0.45 bpp gap to JPEG-LS (9.71) and ~0.55 bpp to WebP (9.61).

CMARC replaces the single-k *symbol* coder with a *bit*-conditioned binary range coder. Each residual is decomposed into a small set of binary bins (sign, zero-flag, quotient Exp-Golomb bits, remainder bits), and every bin is coded by a per-`(cid, bin)` binary model conditioned on the spatial context. Because every alphabet is size 2, each model specializes after O(1) samples (the **specialization-budget theorem** in the research doc), so the cost is `H(p) + epsilon` for *any* residual distribution `p` - strictly below GR's `H(p) + O(1)`. The `k` per context is retained but only sets the **remainder width**, not the whole symbol cost, so its integer quantization no longer bounds the coder. Architectural consequence: the entropy backend becomes a *per-bit* model table indexed by `(context, bin)` instead of a per-context `GrState` with one `k`.

---

## 2. R1-A: binary range coder + per-(cid,bin) model (`rans.rs`)

The repo already has a working 16-bit WNC binary arithmetic coder (`BinEnc`/`BinDec`, `rans.rs`). That coder carries a single `p`. For CMARC we need *many* models, so we *extract the model out of the coder* into a `BinModel` and add a `RangeEnc`/`RangeDec` that take `&mut BinModel` per `put`/`get`. `BinEnc`/`BinDec` stay as-is (they serve the M3-A LZ match-flag coder); `RangeEnc`/`RangeDec` are new and generalize them. Minimal blast radius.

### 2.1 `BinModel` (the per-bin probability)

```rust
/// Reuse the existing 16-bit WNC probability domain: P(bit == 1) in [1, 4095],
/// denominator BIN_TOTAL = 4096. Each model specializes after O(1) samples.
pub const CMARC_PRIOR: u16 = 64;     // strong literal-ish prior, matches BIN init
pub const CMARC_STEP: i32 = 48;      // mirrored adaptation step, matches BIN_STEP
pub const CMARC_LAPACE: u32 = 16;    // Laplace +C prior for static priors (R1-c)

#[derive(Debug, Clone, Copy)]
pub struct BinModel { pub p: u16 }

impl BinModel {
    pub fn new() -> BinModel { BinModel { p: CMARC_PRIOR } }
    /// Seed from signaled Laplace counts (n1 = count of 1-bits, n0 = count of 0-bits).
    pub fn from_counts(n1: u32, n0: u32) -> BinModel {
        let num = (n1 + CMARC_LAPACE) as u64 * BIN_TOTAL as u64;
        let den = (n0 + n1 + 2 * CMARC_LAPACE) as u64;
        let p = (num / den).clamp(1, 4095) as u16;
        BinModel { p }
    }
    /// Mirrored adaptation: identical on encoder and decoder (no signaled state).
    pub fn adapt(&mut self, bit: bool) {
        let d = if bit { CMARC_STEP } else { -CMARC_STEP };
        self.p = (self.p as i32 + d).clamp(1, 4095) as u16;
    }
}
```

### 2.2 `RangeEnc` / `RangeDec` (binary range coder, model-parameterized)

These are `BinEnc`/`BinDec` with the probability field removed and threaded through the call:

```rust
pub struct RangeEnc { low: u32, high: u32, pending: u32 }
impl RangeEnc {
    pub fn new() -> RangeEnc;                     // low=0, high=BIN_TOP-1
    pub fn put(&mut self, w: &mut BitWriter, m: &mut BinModel, bit: bool);
    pub fn finish(&mut self, w: &mut BitWriter);  // flush trailing bits
}
pub struct RangeDec { low: u32, high: u32, value: u32 }
impl RangeDec {
    pub fn new() -> RangeDec;
    pub fn init(&mut self, r: &mut BitReader);    // seed value from BIN_BITS leading bits
    pub fn get(&mut self, r: &mut BitReader, m: &mut BinModel) -> Result<bool, CodecError>;
}
```

The arithmetic core (renorm windows `BIN_HALF`/`BIN_QUARTER`/`BIN_THREE_Q`, `split = low + (range * p) / BIN_TOTAL`, `pending`-bit underflow handling) is copied verbatim from `BinEnc`/`BinDec`. The only change is that `p` comes from `*m` and `m.adapt(bit)` is called after each `put`/`get`. `BIN_BITS`, `BIN_TOP`, `BIN_HALF`, `BIN_QUARTER`, `BIN_THREE_Q`, `BIN_TOTAL` are reused as-is.

### 2.3 CMARC bin layout (per context)

A residual is coded as: `zero-flag`, then (`sign`, quotient Exp-Golomb bits, remainder bits). Bins per context are a fixed index space so encoder/decoder agree:

```rust
pub const CMARC_Q_BITS: usize = 14;   // Exp-Golomb quotient bits (covers |r| up to 2^14 * 2^k)
pub const CMARC_K_MAX: u8 = 15;       // = GR_MAX_K; remainder width ceiling
pub const CMARC_BIN_ZERO: usize = 0;  // m == 0 flag
pub const CMARC_BIN_SIGN: usize = 1;  // sign (only when m != 0)
pub const CMARC_BIN_Q: usize = 2;     // quotient Exp-Golomb bits: 2 + j, j in 0..CMARC_Q_BITS
pub const CMARC_BIN_REM: usize = 2 + CMARC_Q_BITS; // remainder bit j: CMARC_BIN_REM + j
pub const CMARC_BINS_PER_CTX: usize = 2 + CMARC_Q_BITS + CMARC_K_MAX as usize;

#[inline] fn cid_bin(cid: usize, bin: usize) -> usize { cid * CMARC_BINS_PER_CTX + bin }
```

### 2.4 `CarcCtx` (per-context `k` + EMA, mirrors `GrState` minus bias)

`k` only sets the remainder width now. Reuse the proven EMA-of-`|r|` logic from `GrState::adapt`:

```rust
pub struct CarcCtx { k: u8, ema: u32 }
impl CarcCtx {
    pub fn new() -> CarcCtx;                 // k = GR_K_INIT, ema = (1<<k)<<8
    pub fn k(&self) -> u8;
    pub fn adapt(&mut self, m: u32);         // identical integer-EMA to GrState::adapt(m)
}
```

### 2.5 `cmarc_write_residual` / `cmarc_read_residual`

```rust
/// Code signed residual `r`. `models` is the per-plane `Vec<BinModel>` (len
/// context_count * CMARC_BINS_PER_CTX); `ctx` is the CarcCtx for `cid`.
pub fn cmarc_write_residual(
    enc: &mut RangeEnc, w: &mut BitWriter,
    models: &mut [BinModel], ctx: &mut CarcCtx, cid: usize, r: i32,
);
pub fn cmarc_read_residual(
    dec: &mut RangeDec, r: &mut BitReader,
    models: &mut [BinModel], ctx: &mut CarcCtx, cid: usize,
) -> Result<i32, CodecError>;
```

Decomposition (identical on both sides, so lockstep holds by the research doc's bit-exact lockstep proof):

1. `m = r.unsigned_abs()`; `is_zero = (m == 0)`.
2. `enc.put(w, &mut models[cid_bin(cid, ZERO)], is_zero)`; if `is_zero` return `0`.
3. `enc.put(w, &mut models[cid_bin(cid, SIGN)], r < 0)`.
4. `k = ctx.k()`; `q = m >> k`; code `q` as **Exp-Golomb**: `lead = floor(log2(q + 1))` zero bits then a one bit, then the `lead` lower bits of `(q + 1)` (LSB-first). For each bit `j` in `0..=lead` use `models[cid_bin(cid, Q + j)]`. Both sides compute `lead` from the same `q`, so the bin indices match.
5. `rem = m & ((1 << k) - 1)`; for `j` in `0..k` code bit `j` of `rem` via `models[cid_bin(cid, REM + j)]`.
6. Reconstruct `m = (q << k) | rem`; apply sign; `ctx.adapt(m)`; each `put`/`get` already called `models[..].adapt(bit)`.

No-expansion: each bin is a convergent binary model with a `+C` Laplace start bounded by `log2(2C)` worst-case per bit; photographic residuals have `H(p) < 8` bits/symbol, strictly below the raw 8-bit pixel. The early-symbol overhead (`O(CMARC_BINS_PER_CTX * log2(2C))` per context) decays within `O(C)` symbols, exactly like GR.

---

## 3. R1-B: wire CMARC into `code_planes` / `decode_planes` (encoder.rs / decoder.rs)

### 3.1 Model selector

In `model.rs` add:

```rust
pub const ENTROPY_MODE_CARC: u8 = 2;
pub const ENTROPY_MODE_CARC_LZ: u8 = 3;
pub const ENTROPY_MODE_CARC_MIX: u8 = 4;
```

`analyze` keeps `entropy_mode: ENTROPY_MODE_GR` by default; the encoder overrides it to `ENTROPY_MODE_CARC` (or a higher R2 mode) once CMARC wins the safety net (section 3.4). The decoder routes on `model.entropy_mode` exactly as it does for `ENTROPY_MODE_CAPPED` today.

### 3.2 Encoder `code_planes` CMARC branch

Inside the existing `if entropy_gr { ... }` family, add a branch:

```rust
} else if model.entropy_mode == ENTROPY_MODE_CARC {
    let mut models: Vec<BinModel> = vec![BinModel::new(); context_count * CMARC_BINS_PER_CTX];
    let mut ctxs: Vec<CarcCtx> = vec![CarcCtx::new(); context_count];
    let mut enc = RangeEnc::new();
    let mut bw = BitWriter::new();
    for y in 0..height {
        for x in 0..width {
            let nb = neighbors(plane, x, y, width, height);
            let cid = cm.context_id(&nb, x, y) % context_count;
            let pred = predict_clamped(model.predictor(pi, cid), &nb, model.weight_for(pi).as_ref(), range);
            let r = plane[idx] as i32 - pred;
            cmarc_write_residual(&mut enc, &mut bw, &mut models, &mut ctxs[cid], cid, r);
        }
    }
    enc.finish(&mut bw);
    let bytes = bw.finish();
    // emit [len: u32 LE][bytes] like the other GR-family planes
}
```

(MIRRORED bias from M2 is NOT applied: CMARC codes the raw residual; the sign bin already captures the distribution, and the dead-zone bias was a GR-specific workaround. If a future profile wants M2 bias under CMARC, it is a separate opt-in seam, not the default.)

### 3.3 Decoder `decode_planes` CMARC branch

Mirror exactly: read `[len][bytes]`, build `BitReader`, `RangeDec::init`, allocate `models`/`ctxs`, loop `cmarc_read_residual`. `cid` computation and predictor selection are identical. Bit-exact round-trip holds by construction.

### 3.4 Never-expand safety net (guarantees no v1 regression)

The existing GR family already does this for `gr_lz` (encode both `gr_lz` and v1 GR candidates, keep the smaller). Replicate for CMARC: when the `cmarc` opt is on, the encoder also computes the v1 GR (no M2/CM/LZ/capped) candidate for the same planes and keeps `min(cmarc_bytes, v1_bytes)`, setting `entropy_mode` to `ENTROPY_MODE_CARC` only when CMARC wins (else `ENTROPY_MODE_GR`). This proves CMARC can never expand the file versus the current production backend, satisfying the no-regression invariant for the merge gate. Production `EncodeOpts` gains `cmarc: Option<bool>` (threaded like `capped`, so tests do not touch the process-global env); `encode()` defaults it to `Some(true)` at effort >= 1 and `None` (-> v1 GR) at effort 0, preserving the effort-0 trivial single-context path.

### 3.5 Effort gating

- effort 0: CMARC off (v1 GR, single global context). Preserves the existing effort-0 tests.
- effort >= 1: CMARC is the production default (`entropy_mode = ENTROPY_MODE_CARC` when it wins the safety net).

---

## 4. R1-C: per-(cid,bin) static priors (optimization, effort >= 4)

JPEG XL's trick, done correctly this time (M3.5 failed because it used a wide static alphabet; CMARC's binary decomposition makes priors small and locally adaptive). In `analyze`, when `cmarc` is on and effort >= 4, run a **forward dry CMARC pass** over the coding planes using the same `cmarc_write_residual` logic (with a throwaway `RangeEnc`); for each bin, accumulate `(n1, n0)` counts into a `Vec<(u32, u32)>` indexed by `cid_bin`. Add to `ModelConfig`:

```rust
pub struct ModelConfig {
    // ... existing fields ...
    pub cmarc_priors: Option<Vec<Vec<Option<(u32, u32)>>>>>, // [plane][cid_bin] -> (n1, n0)
}
```

`write_model`/`read_model` serialize `cmarc_priors` (sparse: only non-default contexts/bins, behind a `u8` present flag, appended after `entropy_mode` so older readers still parse the body). The decoder seeds each `BinModel` via `BinModel::from_counts(n1, n0)`; contexts/bins absent from the table seed from `BinModel::new()`. Model-size guard: if the prior table exceeds `MODEL_SIZE_FRACTION`, drop it (CMARC still works from the uniform prior). R1-a/R1-b land and are measured *before* R1-c; R1-c is a pure win on specialization speed, not correctness.

---

## 5. R2: WebP/JPEG XL-class pipeline (the remaining ~0.9 bpp)

Each item is an independent `entropy_mode`/model extension, measured separately. All reuse the CMARC residual codec above; the decoder routes on `model.entropy_mode`.

### 5.1 R2.1 cross-channel prediction (subtract-green / color cache)

Add `ModelConfig.cross_channel: bool` (encoder decides: try `R'=R-G, B'=B-G` before YCoCg-R on RGB/RGBA; pick if MED cost is lower, mirrored). `color.rs` gets `subtract_green_forward`/`inverse` (reversible, clamp-free on `i16`). The decoder applies the inverse after YCoCg-R inverse. Zero extra signal beyond `cross_channel`. Expected ~0.2-0.5 bpp on photographic Kodak (chroma correlates with luma).

### 5.2 R2.2 expanded per-pixel predictor bank

Extend `PredictorId` (currently 8) with WebP-style predictors: `T - TL + L`, `L + (TL - T)/2`, gradient `(L + T)/2 + (TL - TR)/2`, and the six `ClampedAdd`/`ClampedSubtract` forms (bump `PREDICTOR_COUNT`, preserve existing ids 0..=7, append 8..=N). Extend `predict()` and `predictors_for()` (effort >= 4 includes the new ones). The existing per-context `map: Vec<u8>` already stores the id, so no layout change; the predictor id is folded into the CMARC context (subtract a few high bin bits from `cid`, or extend `context_count` by a predictor-class bit) so its selection cost is near-zero. Expected ~0.1-0.3 bpp.

### 5.3 R2.3 LZ77 re-woven with CMARC bins (`ENTROPY_MODE_CARC_LZ = 3`)

M3-A failed only because, under GR, a match (flag + 2 gamma codes) cost more than the literal it replaced. Under CMARC the literal is already cheaper, and the match flag is a single binary bin (reuse the M3-A per-plane `[flag_len][flag_bytes][data_bytes]` framing + `BinCoder` for the flag), while `(offset, length)` are coded by **CMARC bins** (length via binary Exp-Golomb through `models`, offset via a per-bin model keyed on length) instead of Elias-gamma. The decoder still copies from its own buffer (no signaled pixels, lockstep holds). Matches with run length >= 3 now win on texture/chroma/flat regions and are additive with CMARC (unlike under GR where they were net-negative). Hash-chain match finder from M3-A is reused verbatim. Expected ~0.2-0.5 bpp, additive with R1.

### 5.4 R2.4 logistic context mixing (`ENTROPY_MODE_CARC_MIX = 4`)

When R1 + R2.1-2.3 still sit a few centi-bpp above JPEG XL, blend several per-context probability estimates (the CMARC bin models, a static prior model, a coarse context model) by sigmoid-weighted averages updated per bit (PAQ/JPEG-XL-MA mechanism). This mixes *probability estimates*, not `k` choices (the M2.5 mistake), which is what actually beats the best single model. Highest-complexity stage; gated behind the `ENTROPY_MODE_CARC_MIX` mode. Expected additional ~0.2-0.4 bpp.

---

## 6. Acceptance gates (from the research doc)

- **M1 / WebP (R1 alone):** Kodak effort-4 mean bpp **< 9.61**, bit-exact round-trip preserved, `cargo test --workspace` green. Met by R1 (CMARC) alone (~9.3-9.6 bpp estimate).
- **M2 / JPEG XL (R1 + R2):** Kodak effort-4 mean bpp **< 8.71**, same correctness/CI gates. Met by R1 + R2.1-2.4 (~8.5-8.9 bpp estimate).
- **No-expansion invariant:** literals use the non-expanding CMARC path; matches only remove bits; binary models are convergent. CMARC cannot expand versus v1 GR (safety net, section 3.4); the flag-off GR/capped fallbacks stay byte-identical.
- **Measurement blocker:** `data/kodak` PPMs are absent in the build env, so the gates cannot be confirmed here. The Maintainer must provision `data/kodak` (+ `data/kodak.sha256`) via the Factory before the real Kodak row can be read. Until then every R-stage measures on synthetic proxies and records a row, exactly as M3 did.

---

## 7. Build order for the Builder (R1 first, measure, then R2.1 -> R2.4)

1. `rans.rs`: `BinModel`, `RangeEnc`/`RangeDec` (refactor of `BinEnc`/`BinDec` with external model), `CarcCtx`, `cmarc_write_residual`/`cmarc_read_residual`, bin-layout constants. CMARC off by default (no `entropy_mode` change yet).
2. `model.rs`: `ENTROPY_MODE_CARC/LZ/MIX` constants; `cmarc_priors` field; `write_model`/`read_model` carry it (sparse, appended).
3. `encoder.rs`/`decoder.rs`: CMARC branch in `code_planes`/`decode_planes` keyed on `entropy_mode == ENTROPY_MODE_CARC`; `EncodeOpts { cmarc }` threaded through; safety net vs v1 GR; default `cmarc = true` at effort >= 1.
4. `cargo test --workspace`; `benchmarks/run_kodak.sh` (once `data/kodak` is provisioned) at effort 4; record the row; assert < 9.61 (WebP). This clears one gate.
5. R1-c: static priors in `analyze` (effort >= 4); re-measure.
6. R2.1 cross-channel; R2.2 bank; R2.3 LZ77-with-CMARC; R2.4 mixing. Measure after each; record rows; assert < 8.71 (JPEG XL) by the end.
7. M4 (web specimen page + JS mirror) and M5 (docs) follow once the codec clears the gates.

---

## 8. Test matrix additions (Builder)

| Area | Test |
|---|---|
| range | `RangeEnc`/`RangeDec` round-trip for random and skewed bit streams; `finish` self-delimiting; exhausted read returns `InvalidStream` |
| binmodel | `BinModel::from_counts` reconstructs the prior within tolerance; `adapt` stays in `[1, 4095]` |
| cmarc residual | `cmarc_write_residual`/`cmarc_read_residual` round-trip for `r` in `[-4096, 4096]` and random residuals, with matching `models`/`ctxs` on both sides |
| cmarc adapt | after many zero residuals the `ZERO` bin `p -> 1`; encoder/decoder `models` stay equal; after a run of large residuals `Q`/`REM` bins specialize |
| cmarc vs gr | on a noise plane (no exploitable context) CMARC cost <= GR cost (no regression even when GR is near-optimal) |
| lockstep | full `encode`/`decode` on Kodak + fuzz at efforts 0/4/7 with CMARC set, bit-exact; CRC verified |
| no-regression | flag-off (GR) produces byte-identical output to current v1 GR; old `GR_M2`/`GR_CM`/`GR_LZ`/`ENTROPY_MODE_CAPPED` streams still decode |
| cross-channel | a grayscale-image round-trip with `cross_channel` enabled decodes bit-exactly and chroma planes reconstruct correctly |
| lz rewoven | a plane with a repeated block round-trips under `ENTROPY_MODE_CARC_LZ`; a match is cheaper than the CMARC literal it replaces |
| gate | Kodak effort-4 mean bpp recorded; assert < 9.61 (WebP) after R1; assert < 8.71 (JPEG XL) after R2 |

Existing GR, rANS, M2, M2.5, M3, and M3.5 tests are retained unchanged (all ship OFF by default).

---

## 9. Why this is the correct route (and the only one left)

Every codec that reaches < 9.71 bpp on Kodak uses (a) a good predictor bank with per-context selection, and (b) a binary-conditioned adaptive arithmetic/range coder over those contexts, plus (for < 9.0) cross-channel decorrelation and LZ77. Obsidian already has (a) essentially complete. M2-M3.5 failed only because they kept the coarse single-k GR *symbol* coder at the center. R1 replaces that one component with CMARC (signaled via `entropy_mode`, the same mechanism M3.5 already uses); R2 adds the pipeline WebP/JPEG XL add. The "~10.1 bpp floor" was the GR coder's floor; the image's floor is ~8.7 bpp, and that is what we will hit.

- the Architect
