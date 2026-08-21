# Obsidian - M2 architecture: bias cancellation + run mode (toward WebP / JPEG XL)

- **Issue:** #68
- **Author:** the Architect
- **Date:** 2026-08-18
- **Mode:** Mode 2 iterative enhancement on PR #83 (branch `opencode/issue68-20260818070512`).
- **Supersedes in part:** the naive bias-cancellation experiment logged in `progress/68-obsidian-lossless-image-codec.md` (Builder, 2026-08-18) which regressed to 14.16 bpp. This document is the *corrected* design that fixes both failure modes of that experiment.
- **Companion docs:** `docs/entropy-architecture.md` (GR seam, Design A), `docs/entropy-analysis.md` (root-cause / residual-entropy floor), `docs/architecture.md` (v1 software architecture), `docs/algorithmic-spec.md`, `progress/68-obsidian-lossless-image-codec.md`.
- **In scope (Builder):** `rans.rs` (`GrState` gains a bias field + a run coder), `encoder.rs` (`code_planes`), `decoder.rs` (residual pass), `header.rs` (one new flag bit). Prediction, YCoCg-R, the context model, the per-context predictor map, the container layout, and the CRC are unchanged.

---

## 0. Where we are, and what M2 must do

Current state on the real Kodak set (effort 4, bit-exact):

| Stage | mean bpp | gate |
|---|---|---|
| raw RGB | 24.00 | - |
| **Obsidian now (corrected)** | **10.16** | PNG (13.05) MET |
| JPEG-LS (CharLS) | 9.71 | - |
| WebP lossless | 9.61 | **PENDING** |
| JPEG XL | 8.71 | **PENDING** |

The Builder already proved the current GAP + separate-sign GR + YCoCg-R stack is
sound and the "residual-entropy floor ~10.1 bpp" is simply the *un-modeled* floor:
no bias cancellation and no run mode. M2 removes both limitations.

### Why the Builder's naive experiment failed (root cause of the regression)

The Builder prototyped `coded = e + bias` where `bias` was an **EMA of
`-raw_residual`** mirrored on both sides. It regressed 10.16 -> 14.16 bpp for two
independent reasons, both must be fixed:

1. **No dead-zone.** On the chroma planes (peaked at zero, occasionally +/-1) the
   EMA wandered to +/-1, so a true-zero residual was coded as `-bias` = +/-1,
   tripling its Golomb-Rice cost. A peaked-at-zero distribution must leave the bias
   exactly at zero.
2. **EMA drift / no clamp reset.** An EMA of a zero-mean heavy-tailed residual is
   not a stable estimate; it has no hard saturation and no "commit" threshold, so a
   single outlier column (effort-0 single global context) poisoned every interior
   residual. JPEG-LS uses a *clamped, counter-committed* bias, not an EMA of the
   signless magnitude.

M2 fixes both: a **dead-zone-guarded, clamped, counter-committed bias** (section 2)
plus a **JPEG-LS-style run mode** (section 3) that zeroes the per-run cost.

---

## 1. Container signal: one new header flag

Reuse a still-reserved flag bit (bits `[5:7]` are free per `architecture.md`
6.3). Both new features ship together, gated behind one bit so every prior GR
stream keeps decoding:

```
flags bit 5 (0x20) = GR_M2
    0  -> GR backend is the v1 Design A (plain per-context adaptive Rice, as shipped)
    1  -> GR backend adds per-context bias cancellation (sec 2) AND run mode (sec 3)
```

- `Header::gr_m2() -> bool` and `set_gr_m2(bool)` in `header.rs`, mirror of
  `entropy_gr()`.
- The encoder sets `ENTROPY_GR | GR_M2` together for effort >= 1 in M2; effort 0
  (single global context) stays v1 GR to keep the fuzz-gate cost model trivial and
  avoid the "single context poisons everything" failure (the dead-zone still
  protects it, but we do not need M2 there).
- Decoder routes on `header.gr_m2()` inside the existing `entropy_gr` branch. Old
  v1 GR streams (bit4=1, bit5=0) decode unchanged.

No other container change. The model section, predictor map, transform/palette
flags, and CRC are untouched; bias and run state are fully implicit (mirrored), so
zero model bytes are added.

---

## 2. M2-A: JPEG-LS-style bias cancellation with a dead-zone

### 2.1 State

Extend `GrState` (in `rans.rs`) with two fields; the existing `k`/`ema` for `k`
adaptation is kept exactly as-is:

```rust
pub struct GrState {
    k: u8,            // unchanged: Rice divisor exponent (from EMA of |r_coded|)
    ema: u32,         // unchanged
    bias: i16,        // NEW: added to the prediction before residual compute
    bias_count: i16,  // NEW: nudge accumulator, committed on threshold
}
pub const GR_BIAS_LIMIT: i16 = 16;   // |bias| clamp range
pub const GR_BIAS_DEADZONE: i32 = 2; // |raw residual| <= this: NO bias update
pub const GR_BIAS_STEP: i16 = 4;     // |bias_count| at which a nudge commits
```

All three constants are **fixed and pinned** (not signaled) to preserve the
zero-model-bytes property.

### 2.2 Per-pixel protocol (encoder and decoder are identical)

For each pixel:

```
nb    = neighbors(plane, x, y, w, h)
cid   = cm.context_id(&nb, x, y) % model.context_count
pred  = predict_clamped(model.predictor(pi, cid), &nb, wv, ranges[pi])   // raw GAP/MED
pred_b = clamp_to_range(pred + gr[cid].bias)        // apply CURRENT bias
r_coded = val - pred_b                              // the residual that is GR-coded
gr_write_symbol(&mut bw, &mut gr[cid], r_coded)      // unchanged GR primitive
// --- bias adaptation (uses the RAW residual, never the coded one) ---
r_raw = val - pred                                  // = r_coded + gr[cid].bias
if r_raw.abs() > GR_BIAS_DEADZONE {
    let s = if r_raw > 0 { 1 } else { -1 };         // pred too low -> raise bias
    gr[cid].bias_count += s;
    if gr[cid].bias_count >=  GR_BIAS_STEP { gr[cid].bias = min(LIMIT, gr[cid].bias + 1); gr[cid].bias_count = 0; }
    if gr[cid].bias_count <= -GR_BIAS_STEP { gr[cid].bias = max(-LIMIT, gr[cid].bias - 1); gr[cid].bias_count = 0; }
}
// dead-zone: |r_raw| <= GR_BIAS_DEADZONE -> bias_count and bias untouched
```

The decoder mirrors byte-for-byte: it reconstructs `val = clamp(pred_b + r_coded)`,
which equals the original `val` (see section 2.4 for the bit-exact proof), and then
runs the *identical* bias adaptation on `r_raw = val - pred`. Because both sides
see the same `val` and `pred`, `bias`/`bias_count`/`k` evolve in lockstep. **No
bias value is ever written to the bitstream.**

### 2.3 Why this fixes the two regressions

- **Dead-zone fixes the chroma regression.** Chroma residuals are mostly 0 with
  occasional +/-1. With `GR_BIAS_DEADZONE = 2`, those +/-1 residuals are *below*
  the dead-zone, so the bias is never nudged; it stays exactly 0; a true-zero
  chroma residual is still coded as `0` (cost `1 + k`, not the 3x cost the EMA
  introduced). Where a chroma context genuinely carries a consistent +/-2..+/-16
  offset, the dead-zone lets the bias climb to cancel it, collapsing those
  residuals to 0.
- **Clamped, counter-committed bias fixes the drift/poisoning.** `bias` is bounded
  to +/-16 and only moves by +/-1 every `GR_BIAS_STEP = 4` consistent-sign
  residuals, so a single outlier column cannot yank it; the estimate is stable and
  localizes per context. (Effort-0 single context is excluded from M2, so the
  "one edge column poisons the whole plane" case cannot occur.)

### 2.4 Bit-exactness

`pred_b = clamp(pred + bias)` is computed identically by both sides from identical
inputs. `r_coded = val - pred_b` is an exact integer in `i32`. Reconstruction:
`clamp(pred_b + r_coded) = clamp(val)`. Because `val` itself lies inside the plane
range `[min, max]`, `pred_b + r_coded = pred_b + val - pred_b = val` is already in
range, so the outer clamp is a no-op and the reconstructed value equals the
original exactly. Fuzz gate (efforts 0/4/7) and the CRC gate are preserved.

---

## 3. M2-B: JPEG-LS-style run mode (per-plane, parameter-free)

### 3.1 Motivation

After bias cancellation the dominant waste is **runs of identical pixels** (flat
chroma, smooth luma gradients, constant backgrounds). Under plain GR a zero
residual costs `1 + k` bits *per pixel*. Run mode encodes a whole run of `L`
identical pixels for the cost of **one Elias-gamma(L) code**, with zero per-pixel
GR bits in the run body.

### 3.2 Run definition and the streaming mechanism

A *run* is a maximal sequence of consecutive pixels (in raster order, within a
plane) that share the **same reconstructed value** as the preceding pixel. The run
value is simply the previous reconstructed pixel (`prev_val`); run pixels copy it.

The encoder detects a run with a **1-pixel lookahead** (the decoder needs no
lookahead): at pixel `i`, if `plane[i] == plane[i-1]` it peeks forward to count how
many further pixels equal `plane[i]`; that count is `runlen`. It then emits a
single `gamma(runlen)` code and skips emitting GR bits for all `runlen` pixels. The
decoder, having reconstructed `prev_val`, reads `gamma(runlen)` and copies
`prev_val` for `runlen` pixels (updating its own `prev_val`), then resumes regular
coding. Because `gamma` is a prefix-free, parameter-free universal code
(`runlen >= 1` is encoded as `floor(log2 n)` zeros, a 1, then `n - 2^floor` in that
many bits), both sides decode/encode it identically with no signaled parameter.

### 3.3 Bias interaction

Run pixels are reconstructed by copy; they contribute no residual and **no bias
update** (the bias only tracks regular pixels). Both sides skip the bias update for
run pixels identically, because a run pixel is identified by value-equality the
encoder already knew and the decoder reproduces via the gamma count. This keeps the
per-context bias concentrated on the informative (non-flat) residuals.

### 3.4 Why no per-pixel flag overhead

Unlike a naive "1 flag bit per pixel" scheme (which would tax every non-run luma
pixel by ~1 bpp), run mode here pays **exactly one gamma code per run and nothing
per run body pixel**. Photographic luma, where runs are short, simply does not
enter run mode often; when it does (smooth gradients, skies), the savings are
large. The only added cost over v1 GR is the gamma code at run boundaries, which
is dominated by the eliminated `L * (1 + k)` bits.

### 3.5 Elias gamma primitive (add to `rans.rs`)

```rust
pub fn write_gamma(w: &mut BitWriter, n: u32);          // n >= 1
pub fn read_gamma(r: &mut BitReader) -> Result<u32, CodecError>;
```

Both are O(log n) and reuse the existing `BitWriter`/`BitReader`. `write_gamma`/
`read_gamma` round-trip is unit-tested alongside the GR tests.

---

## 4. Builder contract (what changes, minimal)

1. `header.rs`: add `gr_m2()` / `set_gr_m2(bool)` (flags bit 5, 0x20).
2. `rans.rs`:
   - Extend `GrState` with `bias: i16`, `bias_count: i16` and the three `GR_BIAS_*`
     constants; `GrState::new` seeds `bias = 0`, `bias_count = 0`.
   - Add `write_gamma` / `read_gamma`.
   - `gr_write_symbol` / `gr_read_symbol` are **unchanged** (they still code one
     residual with the current `k`); bias application lives in the per-pixel loop.
3. `encoder.rs::code_planes` (inside the `entropy_gr` branch, when `gr_m2`):
   - per pixel: apply `pred_b = clamp(pred + bias)`, compute `r_coded`,
     `gr_write_symbol`; then run-mode lookahead; then bias adaptation on `r_raw`
     with the dead-zone guard.
   - carry a per-plane `prev_val: i16` and `runlen` accumulator; on a run (value
     equality + lookahead) emit `write_gamma(runlen)` and skip the `runlen` pixels'
     GR coding.
4. `decoder.rs` residual pass (inside the `entropy_gr && gr_m2` branch):
   - mirror: read the gamma run codes, copy `prev_val` for run pixels, otherwise
     `gr_read_symbol` then bias adaptation on `r_raw` with the same dead-zone guard.
5. `encode`/container assembly: set `set_gr_m2(true)` for effort >= 1; `false` for
   effort 0 (and for any legacy v1 GR stream). Keep `entropy_gr(true)`.

Preserved exactly: YCoCg-R, predictor bank + per-context map, context model +
sign symmetry, container layout, length prefixes, CRC. The legacy rANS path and
Design B (`ENTROPY_GR` clear) are untouched.

---

## 5. Expected outcome and gates

- **M2 primary gate (this build):** mean bpp on Kodak (effort 4) **< 9.71**
  (JPEG-LS) and, if run mode lands well, **< 9.61** (WebP). The bias cancellation
  alone should recover the ~0.45 bpp gap to JPEG-LS; run mode is what pushes under
  WebP.
- **Acceptance (spec F2 extended):** bit-exact round-trip on Kodak + fuzz set
  (efforts 0/4/7) must still hold; `cargo test --workspace` green; benchmark row
  recorded in `benchmarks/results/`.
- **No-expansion invariant:** unchanged in spirit: run mode only *removes* bits;
  bias shifts residuals toward zero; both are mirrored, so no expansion is possible
  versus the v1 GR baseline that already beat raw 24 and PNG.

---

## 6. Roadmap beyond M2 (separate, separately-reviewed builds)

- **M2.5 - context mixing (CM) toward ~9.0-9.3 bpp.** Replace the single per-context
  GR estimator with 2-3 sub-estimators per context (fast EMA of `|r|`, slow EMA, and
  a fixed `k = context_gradient_class` prior) and mix their probabilities by recent
  per-sub-estimator prediction error (a small logistic weight updated per symbol).
  This is the MRP/PAQ-lite idea and is the standard way to beat JPEG-LS-class
  coding. Still parameter-free at decode (weights are mirrored).
- **M3 - LZ77 back-references + self-correcting weighted predictor, to clear JPEG XL
  8.71.** (a) Add a secondary match coder: a sliding-window LZ77 pass over the
  decoded-planes buffer emits `(offset, length)` matches for repeating regions
  (textures, flat areas, chroma) using a parameter-free match finder and a
  gamma-coded length; routes behind a new `GR_LZ` flag bit so the bitstream stays
  decodable. This is what WebP and JPEG XL actually use to beat JPEG-LS. (b) Upgrade
  the effort-4 fixed-codebook Weighted predictor to a *self-correcting* variant
  (gradient-descent weights learned per context during the analysis pass, mirrored
  at decode from the signaled weights). Either path alone may clear JPEG XL; both
  together give margin. Design B (capped-and-escaped static rANS,
  `entropy-architecture.md` section 7) remains a fallback route to the same target.

---

## 7. Test matrix additions

| Area | Test |
|---|---|
| bias | per-context `bias` stays 0 on a zero-peaked synthetic chroma plane (dead-zone holds); `bias` converges to a known constant offset on a plane with a constant residual offset |
| bias | full `encode`/`decode` round-trip on Kodak + fuzz at efforts 4/7 with `GR_M2` set, bit-exact |
| gamma | `write_gamma`/`read_gamma` round-trip for `n in 1..4096` and random `n` |
| run | a constant plane (and a plane with long identical runs) round-trips; the bitstream contains exactly one gamma per run, no per-run-body GR bits; bpp drops sharply vs v1 GR |
| no-regression | re-run the Builder's chroma regression scenario: the M2 chroma bpp is <= v1 GR chroma bpp (the naive experiment's 14.16 is not reproduced) |
| gate | Kodak effort-4 mean bpp recorded; assert < 9.71 (JPEG-LS) as the M2 acceptance |

Existing GR and rANS tests are retained unchanged.

---

## 8. Build order for the Builder (M2 first)

1. `rans.rs`: extend `GrState` (bias/bias_count + constants); add `write_gamma`/
   `read_gamma`.
2. `header.rs`: add `gr_m2()` / `set_gr_m2`.
3. `encoder.rs::code_planes`: GR+M2 branch with `pred_b`, dead-zone bias adaptation,
   and the run-mode lookahead + gamma. Set `set_gr_m2(true)` for effort >= 1.
4. `decoder.rs`: mirror the GR+M2 branch.
5. `cargo test --workspace`; `benchmarks/run_kodak.sh` at effort 4; record the row;
   confirm < 9.71.
6. M2.5 (CM) and M3 (LZ77) follow as separate builds reusing this seam.

- the Architect
