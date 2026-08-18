# Obsidian - Entropy-stage architecture v2 (Golomb-Rice default)

- **Issue:** #68
- **Author:** the Architect
- **Date:** 2026-08-18
- **Supersedes in part:** `docs/architecture.md` section 6.9 (rANS-only entropy), section 9 (effort table), and the milestone mapping in section 15, for the entropy coding stage only.
- **Companion docs:** `docs/entropy-analysis.md` (researcher diagnosis), `docs/algorithmic-spec.md` (v1 spec, errata in section 6), `docs/research.md` (rebased milestones), `docs/architecture.md` (v1 software architecture).
- **In scope (Builder):** `encoder.rs`, `decoder.rs`, `rans.rs`, plus the container `Header` flag and the `analyze` signature in `model.rs`. Prediction, YCoCg-R, the context model, the per-context predictor map, and the container/CRC remain unchanged.

---

## 1. Problem restated as an architecture defect

The v1 software architecture (`architecture.md` section 3, decision "rANS only") made a single entropy coder the contract for the whole pipeline. That contract is the cause of the measured 27.82 bpp expansion: the adaptive rANS (`RansTable`) needs a wide 512-symbol alphabet and per-context frequency tables to specialize, but on a 768x512 image each of the ~285 contexts receives only ~4138 symbols, far below the ~2048 increments needed to make the dominant residual cheap. Symbols are therefore coded at the ~9-bit start cost, which exceeds the 8-bit raw pixel, so the container grows.

The fix is an architectural one: **the entropy stage must be a replaceable backend behind a stable pin, not a single hard-coded coder.** This document defines that seam and the first backend (Design A, per-context adaptive Golomb-Rice) that the Builder implements for M0/M1.

---

## 2. The entropy backend seam

### 2.1 Container signal: a new header flag

The container layout is preserved. We reuse a previously reserved bit of the header `flags` byte (bits `[4:7]` were reserved per `architecture.md` 6.3):

```
flags bit 4 (0x10) = ENTROPY_GR
    0  -> legacy rANS path (adaptive default; static for Design B at M2/M3)
    1  -> per-context adaptive Golomb-Rice (Design A), the M0/M1 default
```

- `Header::entropy_gr() -> bool` and a `set_entropy_gr(bool)` setter are added in `header.rs`.
- The encoder sets it to `true` for every effort in M0/M1. This is the only container change; the model section, predictor map, transform/palette flags, and CRC are untouched.
- Decoding reads the flag once and routes the per-plane residual pass to the matching backend. Because the flag is in the header, old (rANS) and new (GR) streams stay decodable by the same binary.

### 2.2 Why GR needs zero model bytes

Golomb-Rice is a *forward* streaming coder: both encoder and decoder evolve the per-context parameter `k` from the symbols they see, in raster order. The decoder recovers each residual `r` fully, so it can apply the identical `k`-adaptation the encoder used. Therefore `k` is **never signaled**: it is implicit, mirrored state. The model section keeps only the predictor map, context params, transform, and palette that already exist. The `static_histograms` field is set to `None` for GR (it is only used by the rANS backends), so the model section shrinks.

### 2.3 Module boundary

The per-pixel orchestration (neighbor lookup, context id, predictor selection, residual compute, plane assembly, CRC) stays in `encoder.rs` / `decoder.rs`. The entropy backend lives entirely in `rans.rs` and exposes small primitives. The existing rANS types (`RansEncoder`, `RansDecoder`, `RansTable`) are retained for the legacy path and for Design B (M2/M3); they are not deleted.

---

## 3. Design A: per-context adaptive Golomb-Rice (M0/M1 default)

### 3.1 Signed residual and the JPEG-LS-style mapping

Keep the signed residual `r = pixel - pred` (full plane value range, plain `i32` subtraction, no modulo). Map `r` to a non-negative codeword `u` that folds the sign and preserves the peaked-at-zero distribution:

```
fn map(r: i32) -> u32 {
    if r == 0 { 0 }
    else if r > 0 { (2 * r) as u32 }          // positives -> even
    else { (2 * (-r) as i32 + 1) as u32 }     // negatives -> odd
}
fn unmap(u: u32) -> i32 {
    if u == 0 { 0 }
    else if u & 1 == 0 { (u >> 1) as i32 }
    else { -((u + 1) >> 1) as i32 }
}
```

This is a bijection Z -> N (0->0, +1->2, -1->3, +2->4, -2->5, ...). The entropy stage no longer uses `zigzag`/`unzigzag` for GR (they remain for the rANS path). `map`/`unmap` belong in `rans.rs` as free functions so the encoder and decoder share one definition.

### 3.2 The Rice code

For a per-context integer parameter `k` (0..=15) and codeword `u`:

```
q   = u >> k                 // quotient
rem = u & ((1 << k) - 1)     // remainder, 0 <= rem < 2^k
encode: emit q copies of bit 0, then one bit 1, then rem in k bits
decode: count leading 0 bits -> q (until a 1), read k bits -> rem, u = (q << k) | rem
```

This is the non-truncated Golomb-Rice. It is robust at `k = 0` (a zero residual costs exactly 1 bit: `q=0` -> "1", plus 0 remainder bits), so there is no degenerate "emit nothing" case that the LOCO-I truncation would introduce at `k=0`. The truncated form is a later, optional tuning that saves at most ~1 bit/symbol; it is not required for M1.

Cost for a residual of magnitude `m`: `(m >> k) + 1 + k` bits. For Laplacian residuals this is within ~0.08 bits/symbol of the entropy; for arbitrary `p` it is at most `log2(e) + O(1)` bits/symbol above `H(p)`.

### 3.3 Per-context adaptive `k`

Each context owns a `GrState`:

```rust
pub struct GrState {
    k: u8,       // 0..=GR_MAX_K (15)
    bias: i16,   // signed adaptation accumulator, [-GR_BIAS_LIMIT, GR_BIAS_LIMIT]
}
pub const GR_MAX_K: u8 = 15;
pub const GR_BIAS_LIMIT: i16 = 32;
pub const GR_K_INIT: u8 = 2;   // 2^2 = 4; good warm-up for photographic residuals
```

Update after coding a residual of magnitude `m = |r|`:

```
let err = (m as i32) - (1i32 << self.k);
self.bias += if err > 0 { 1 } else { -1 };
if self.bias >= GR_BIAS_LIMIT { self.k = min(GR_MAX_K, self.k + 1); self.bias = 0; }
else if self.bias <= -GR_BIAS_LIMIT { self.k = self.k.saturating_sub(1); self.bias = 0; }
```

Invariant: the decoder applies the identical update to the identical `GrState` for the identical context, because it recovers `r` before updating. No state is signaled.

An equivalent alternative the Builder may substitute (same observable bitstream contract, choose ONE and pin it): an exponential moving average of `|m|`, `k = clamp(round(log2(ema)), 0, 15)`. The bias-counter form above is the primary recommendation because it is the standard JPEG-LS rule and needs no floating point.

### 3.4 Bit-level I/O (inside `rans.rs`)

Add two small, dependency-free structs. They are the only new I/O the backend needs and they keep the GR output inside the existing per-plane, length-prefixed byte streams.

```rust
pub struct BitWriter {
    buf: Vec<u8>,
    acc: u32,      // bit accumulator
    nbits: u8,     // bits currently in acc (0..=7 on flush; can hold up to 32)
}
impl BitWriter {
    pub fn new() -> Self;
    pub fn write_bit(&mut self, b: bool);
    pub fn write_bits(&mut self, value: u32, n: u8);  // n in 0..=32, LSB-first
    pub fn finish(mut self) -> Vec<u8>;               // flush remaining acc bits (zero-padded), return bytes
}

pub struct BitReader<'a> {
    data: &'a [u8],
    pos: usize,        // current byte index
    acc: u32,
    nbits: u8,         // valid bits remaining in acc
    total_bits: usize, // data.len() * 8
}
impl<'a> BitReader<'a> {
    pub fn new(data: &'a [u8]) -> Self;
    pub fn read_bit(&mut self) -> Result<bool, CodecError>;
    pub fn read_bits(&mut self, n: u8) -> Result<u32, CodecError>; // n in 0..=32
    pub fn bits_remaining(&self) -> usize;
}
```

`read_bit`/`read_bits` return `CodecError::InvalidStream` the moment a read would cross `total_bits`. `finish` zero-pads the trailing byte. The decoder knows the exact symbol count from the header dimensions, so it stops reading after `width*height` symbols; any shortfall is reported as corruption, never a panic.

### 3.5 Public primitives (the Builder's contract)

```rust
pub fn gr_write_symbol(w: &mut BitWriter, st: &mut GrState, r: i32);
pub fn gr_read_symbol(r: &mut BitReader, st: &mut GrState) -> Result<i32, CodecError>;
```

`gr_write_symbol` maps `r` (section 3.1), emits the Rice code for `u` using `st.k`, then calls `st.adapt(|r|)`. `gr_read_symbol` reads the code, `unmap`s to `r`, then calls `st.adapt(|r|)`, returning `r`. Both are O(1).

### 3.6 Encoder wiring (`encoder.rs::code_planes`)

When `entropy_gr` is set (the M0/M1 path):

1. `let mut bw = BitWriter::new();`
2. `let mut gr: Vec<GrState> = (0..model.context_count).map(|_| GrState::new(GR_K_INIT)).collect();`
3. Iterate pixels in **raster (forward) order** (no reverse, no dry-run plan):
   ```
   nb   = neighbors(plane, x, y, w, h)
   cid  = cm.context_id(&nb, x, y) % model.context_count
   pred = predict_clamped(model.predictor(pi, cid), &nb, wv, ranges[pi])
   r    = plane[idx] as i32 - pred
   gr_write_symbol(&mut bw, &mut gr[cid], r)
   ```
4. `streams.push(bw.finish());`
5. The `use_static`/model-size-guard rANS branch is skipped for GR.

The effort-0 single-global-context model (context_count = 1) works unchanged: `gr` has one element.

### 3.7 Decoder wiring (`decoder.rs` residual pass)

When `entropy_gr` is set:

1. `let mut br = BitReader::new(payloads[pi]);`
2. `let mut gr: Vec<GrState> = (0..model.context_count).map(|_| GrState::new(GR_K_INIT)).collect();`
3. Iterate pixels in raster order:
   ```
   nb   = neighbors(&plane, x, y, w, h)
   cid  = cm.context_id(&nb, x, y) % model.context_count
   pred = predict_clamped(model.predictor(pi, cid), &nb, wv, ranges[pi])
   r    = gr_read_symbol(&mut br, &mut gr[cid])?   // Error -> InvalidStream
   plane[idx] = (pred + r) as i16
   ```
4. After the loop, ignore any trailing padding bits; if `br` was exhausted before all pixels decoded, the last `gr_read_symbol` already returned `InvalidStream`.

### 3.8 No-expansion proof (sketch, full proof in `entropy-analysis.md` section 4.4)

For a residual stream with per-symbol entropy `H(p)`, Rice with adaptively chosen `k` codes each symbol in `H(p) + O(1)` bits. The early-symbol overhead is `O(1)` (a couple of bits while `k` warms up over the first ~32 symbols of a context), not the `log2(512) = 9` bits of the rANS start that never decayed. For Kodak residuals `H(p)` is ~2-4 bits/symbol, so the GR cost is ~3-6 bits/symbol, strictly below the 8-bit raw pixel. With ~4138 symbols per context, the `k` bias counter converges within a few dozen symbols and stays converged, so the amortized overhead is bounded and the container cannot expand. This is exactly the requirement the old rANS violated.

---

## 4. Compliance with the "what must NOT change" list

Preserved exactly as the researcher specified (`entropy-analysis.md` section 7):

- YCoCg-R forward/inverse and per-image adaptive selection.
- The predictor bank (8 predictors) and the per-context predictor map.
- The context model (gradient quantization, sign symmetry, activity class, border contexts) and `zigzag` (kept for the rANS path).
- The container layout, the per-plane length prefixes, and the header CRC fidelity gate.

Only `code_planes` (encoder), the residual pass (decoder), and `rans.rs` (new GR primitives + retained rANS) change, plus the `Header` flag and the `analyze` signature (section 5).

---

## 5. `model.rs` change (small, required)

`analyze` currently always collects `static_histograms` at effort >= 6. For GR these are unused and waste an O(n) pass and memory. Add a parameter:

```rust
pub fn analyze(
    planes: &[Vec<i16>], ranges: &[PlaneRange],
    width: usize, height: usize, effort: u8,
    context: &ContextParams, weight_codebook: &[WeightVec],
    entropy_gr: bool,            // NEW
) -> ModelConfig
```

When `entropy_gr` is true, skip the static-histogram collection block (leave `static_histograms = None`). The encoder passes `true` for M0/M1. The `write_model`/`read_model` paths already handle the `None` case, so no serialization change is needed. Call sites in tests must be updated to pass the new argument.

---

## 6. Effort pipeline (revised table)

| effort | analysis pass | predictor map | weights | palette | entropy backend |
|---|---|---|---|---|---|
| 0 | none | fixed MED, single context | none | no | GR (flag set) |
| 1-3 | per-context best predictor | fixed per-context map | none | no | GR (flag set) |
| 4-5 | + weighted codebook search | per-context map incl. Weighted | yes | no | GR (flag set) |
| 6-7 | + palette test | full | yes | yes (measured) | GR (flag set) for M0/M1; capped rANS (Design B) is the M2/M3 upgrade |

The bitstream format stays identical across efforts (effort changes only encoder-side model search), as before.

---

## 7. Design B (M2/M3): capped-and-escaped static rANS

Defined here so the seam is ready; **not** in M0/M1 scope.

1. **Cap the alphabet.** After `map(r)` (section 3.1), cap the codeword at `S` in `[32, 128]` (tune on Kodak); codewords `>= S` use a single escape symbol `S`. With `S = 64` each context needs only ~64 increments to specialize, far below its ~4138 symbol budget, so the static rANS tables now specialize.
2. **Static tables from the analysis pass.** Normalize per-context histograms over `[0, S]` (the escape folded in), signal them in the model section (`static_histograms`, already serialized), decode identically. Per-context model is `64 * 2B = 128B`; `285` contexts ~= 36 KB, under `MODEL_SIZE_FRACTION`.
3. **Escape path.** When the decoder reads the escape symbol, it falls back to a secondary per-context adaptive Golomb-Rice read of the raw `|r|` (and a sign bit), guaranteeing no residual is uncodable and that rare large residuals do not inflate the main table.

The legacy adaptive rANS (512-symbol, single-unit steal) is **retired as the default**; it is the direct cause of the expansion and its slow adaptation cannot be salvaged on images this small without the alphabet cap above. Design B is reached only at effort >= 6 with the `ENTROPY_GR` flag clear and a new `ENTROPY_CAPPED` encoding (a future header bit), routed through the same `BitReader`/`RansDecoder` seam.

---

## 8. Complexity and memory budget (revised)

- Encode/decode: O(1) per symbol (a few integer ops + occasional bit flush). Target >= 200 MB/s single-thread encode and decode, faster than the current rANS table lookups.
- Memory: `O(C)` for the `GrState` arrays (`C` = context_count, ~95-285 per plane; a few hundred bytes) versus the current `O(C * 512 * 2B)` ~= 285 KB of adaptive tables. Row buffers `O(w)` unchanged.
- Model section for GR: a few hundred bytes to a few KiB (no histograms).

---

## 9. Test matrix (entropy backend)

Add to `rans.rs` and `encoder.rs`/`decoder.rs` test modules:

| Area | Test |
|---|---|
| bitio | `write_bits`/`read_bits` round-trip for arbitrary `(value, n)` and random bit streams; `finish` zero-pads; exhausted `read_bit`/`read_bits` return `InvalidStream` |
| gr symbol | `gr_write_symbol`/`gr_read_symbol` round-trip for `r` in `[-2000, 2000]` and random residuals, with matching `GrState` on both sides |
| gr adapt | after many zero residuals `k` stays low; after a run of large residuals `k` increases; both sides converge to identical `k` |
| gr plane | `gr_encode_plane`/`gr_decode_plane` (or the encoder/decoder path) round-trip a plane of random residuals bit-exactly |
| integration | full `encode`/`decode` on Kodak + fuzz set at efforts 0,4,7 with `ENTROPY_GR` set, bit-exact |
| no-expansion (M0 gate) | mean bpp on Kodak < 13.05 (optipng PNG) and < 24.0 (raw); the hard 27.82 failure must be gone |
| M1 gate | mean bpp on Kodak < 9.61 (WebP) AND < 13.05 (PNG) |
| corruption | a truncated GR payload returns `InvalidStream`, never a panic or a silently wrong image (CRC still verified) |

Existing rANS tests (`static_roundtrip`, `adaptive_roundtrip_lockstep`, `uniform_adaptive_efficient`, etc.) are retained for the legacy/Design-B path.

---

## 10. Build order for the Builder (M0 first)

1. `rans.rs`: add `BitWriter`, `BitReader`, `GrState`, `map`/`unmap`, `gr_write_symbol`, `gr_read_symbol`, `GR_*` constants. Keep `RansEncoder`/`RansDecoder`/`RansTable`.
2. `header.rs`: add `entropy_gr()` / `set_entropy_gr(bool)` (bit 4).
3. `model.rs`: add `entropy_gr: bool` to `analyze`; skip histogram collection when true.
4. `encoder.rs`: set the flag; add the GR branch in `code_planes` (forward loop, `BitWriter` + `GrState` vec); drop the rANS/static branch under GR.
5. `decoder.rs`: add the GR branch (forward loop, `BitReader` + `GrState` vec); route on the header flag.
6. Run `cargo test --workspace`; run `benchmarks/run_kodak.sh` at effort 4; confirm the M0 gate (bpp < 13.05).
7. M1: verify per-context predictor selection + YCoCg-R already present reproduce < 9.61; record the benchmark row.

M2/M3 (Design B, or self-correcting weighted predictor) follow as separate, separately-reviewed changes; they reuse this same seam.

- the Architect
