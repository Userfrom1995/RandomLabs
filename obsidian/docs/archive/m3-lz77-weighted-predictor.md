# Obsidian - M3 architecture: LZ77 back-references + self-correcting weighted predictor (toward WebP / JPEG XL)

- **Issue:** #68
- **Author:** the Architect
- **Date:** 2026-08-18
- **Mode:** Mode 2 iterative enhancement on PR #83 (branch `opencode/issue68-20260818070512`).
- **Supersedes in part:** the M3 bullets of `obsidian/docs/m2-bias-run-architecture.md` section 6 (which only sketched LZ77 + weighted predictor). This document is the concrete, implementable blueprint.
- **Companion docs:** `docs/entropy-architecture.md` (GR seam, Design A/B), `docs/m2-bias-run-architecture.md` (M2-A/M2-B, dead-zone bias + run mode), `docs/entropy-analysis.md` (residual-entropy floor), `docs/architecture.md`, `progress/68-obsidian-lossless-image-codec.md`.
- **In scope (Builder):** `rans.rs` (binary match-flag coder + match helpers), `encoder.rs` (`code_planes` LZ branch), `decoder.rs` (LZ branch), `header.rs` (one new flag bit), and, for M3-B only, `model.rs` (per-context weighted weights, signaled). Prediction, YCoCg-R, the context model, and the per-context predictor map stay unchanged except that the Weighted predictor gains learned, optionally online-corrected weights. Container length prefixes and CRC are unchanged.

---

## 0. Where we are, and why M2 / M2.5 failed

Real Kodak set, effort 4, bit-exact:

| Stage | mean bpp | gate |
|---|---|---|
| raw RGB | 24.00 | - |
| **Obsidian now (v1 GR)** | **10.16** | PNG (13.05) MET |
| M2 (bias + run) opt-in | 11.14 | regressed vs v1 |
| M2.5 (context mixing) opt-in | ~10.21 | regressed ~0.5% |
| JPEG-LS (CharLS) | 9.71 | - |
| WebP lossless | 9.61 | **PENDING** |
| JPEG XL | 8.71 | **PENDING** |

The Builder proved the residual-entropy floor is real: M2 (bias cancellation) and M2.5 (context mixing) both **regressed** on photographic Kodak and ship OFF by default. The lesson is decisive:

> Per-pixel residual entropy coding (however clever: better `k`, bias, run mode, mixing) is bounded by the *per-pixel* entropy of the residual stream, which on natural images sits at ~10.1 bpp no matter how well we code each symbol. You cannot beat WebP (9.61) or JPEG XL (8.71) by coding residuals better. You must **reduce the residual stream itself** by exploiting two redundancies those codecs exploit and Obsidian currently does not:

1. **Spatial redundancy** (LZ77 back-references): natural images contain repeated pixel neighborhoods (texture, flat regions, chroma banding, periodic structure). A backward match copies already-decoded samples instead of coding a residual, which the GR backend physically cannot do.
2. **Predictor adaptability** (learned weighted predictor): the fixed LOCO-I GAP / MED bank is good but a per-context *learned* linear predictor fits each local texture better, shrinking residuals before entropy coding.

M3 attacks both. M3-A (LZ77) is the primary, high-confidence, **zero-model-bytes** path and is the one most likely to clear WebP. M3-B (self-correcting weighted predictor) is the secondary, signaled-weights path that, together with M3-A, targets JPEG XL.

---

## 1. Container signal: one new header flag

The last reserved flag bit (bits `[0:3]` are channels/transform/palette, `[4]` ENTROPY_GR, `[5]` GR_M2, `[6]` GR_CM; bit `[7]` is free):

```
flags bit 7 (0x80) = GR_LZ
    0  -> GR backend is plain per-context adaptive Rice (v1), or GR_M2 / GR_CM
          if those bits are set; no LZ77 back-references.
    1  -> GR backend adds an LZ77 match layer (M3-A) over the decoded plane,
          and (if M3-B is also built) the Weighted predictor uses learned,
          optionally online-corrected per-context weights.
```

- `Header::gr_lz() -> bool` and `set_gr_lz(bool)` in `header.rs`, mirror of `entropy_gr()` / `gr_m2()` / `gr_cm()`.
- The encoder sets `ENTROPY_GR | GR_LZ` together for effort >= 1 in M3 (effort 0 stays v1 GR; the single global context makes the match coder's flag adaptation trivial and the "one edge column" poisoning case cannot occur, exactly as for M2).
- Decoder routes on `header.gr_lz()` inside the `entropy_gr` branch. Old streams (bit4 only, or bit4+bit5/bit6) decode unchanged. The M3 layers are **additive and mirror-only**: when `GR_LZ` is clear the per-plane stream is byte-identical to v1 GR, so there is no regression risk and no expansion is possible.
- No other container change. The model section, predictor map, transform/palette flags, per-plane length prefixes, and CRC are untouched (except the M3-B per-context weight table, which lives inside the model section and is only emitted when `GR_LZ` + Weighted is used).

---

## 2. M3-A: LZ77 back-references over the decoded plane

### 2.1 Core idea

After the predictor produces a residual and we decide how to code it, we first ask: *is the pixel (and a run of following pixels) already present earlier in this plane's decoded buffer?* If so, we emit a **match token** `(offset, length)` instead of literal residuals. The decoder reconstructs the pixels by copying from its own buffer at `pos - offset` - it needs no match finder and no pixel values in the stream, so it stays bit-exact by induction.

This is exactly how WebP lossless and JPEG XL win ~0.5-1.5 bpp on photographic content: they trade entropy-coded literals for copied samples in already-seen neighborhoods.

### 2.2 Token protocol (per pixel, forward raster order, one plane at a time)

The plane is decoded left-to-right, top-to-bottom. At each undecoded position `i` the encoder/decoder exchange exactly one of:

- **Literal token:** a 1-bit match flag `= 0`, then one GR-coded signed residual (the existing `gr_write_symbol` / `gr_read_symbol` path, with `k`/bias evolving exactly as v1). Reconstructs **one** pixel.
- **Match token:** a 1-bit match flag `= 1`, then `(len, offset)`:
  - `len_minus_min` coded with `write_gamma` / `read_gamma` (parameter-free, mirror-friendly). `len = len_minus_min + MIN_MATCH`, `MIN_MATCH = 3`.
  - `offset` coded with `write_gamma` / `read_gamma` as `offset` in `[1, WINDOW]`. (A future build may add a context-modeled distance coder; gamma is the correct v1 that needs no signaled state.)
  - The decoder then copies `plane[i .. i+len] = plane[i-offset .. i-offset+len]`. **No residual is coded for the `len` matched pixels; no GR state updates for them.**

The match flag itself is coded by a tiny **binary adaptive coder** (section 2.4), not by a GR symbol, so a literal costs `H2(P(match))` bits (≈ a fraction of a bit when matches are rare) rather than a full GR symbol.

### 2.3 Encoder match finder (encode side only)

A deterministic, parameter-free hash-chained match finder over the already-coded buffer:

- `WINDOW = min(32768, width * 8)` samples (bounded so the offset gamma stays small; larger windows help little on 768-wide Kodak). `MIN_MATCH = 3`. `MAX_MATCH = 256` (bounds the copy loop; longer runs just become consecutive matches, which the flag stream handles).
- Hash the 3-sample tuple `(buf[i], buf[i+1], buf[i+2])` into a chain table; for position `i` walk the chain within `WINDOW` and pick the **longest** match with `len >= MIN_MATCH`. (Optional lazy-matching - compare `i` and `i+1` and take the longer - is a drop-in later tuning that costs nothing in the bitstream format.)
- The match finder only *reads* the already-coded buffer, which the decoder reproduces identically, so the chosen `(offset, len)` are always reproducible by the decoder's copy. No match payload is ever signaled.
- When no match of `len >= MIN_MATCH` exists at `i`, emit a literal for pixel `i` and advance `i` by 1. When a match exists, emit the match token and advance `i` by `len`.
- Greedy literal-vs-match decision is the only encode-side choice; it is fully determined by the buffer, so the decoder needs no decision bit beyond the match flag.

### 2.4 Binary match-flag coder (`BinCoder`, add to `rans.rs`)

A compact, carryless binary arithmetic coder over the existing `BitWriter` / `BitReader` (or a dedicated bit buffer). State is a 12-bit probability `p` of `match` (so `P(literal) = 1 - p/4096`), updated per token:

```
// encode flag `bit` (1 = match), probability p in [1, 4095] of match
fn bin_put(bw, &mut p, bit: u32) {
    // bitwise range coder, 12-bit probability, fixed 12-bit precision window
    // (standard WebP/Brotli boolean-coder shape; ~60 lines)
    ...
    // after coding: p = clamp(p + (bit==1 ? +step : -step), 1, 4095)
}
fn bin_get(br, &mut p) -> u32 { /* mirror: identical update */ }
```

Both sides start `p = 64` (strong prior that the next token is a literal) and update identically, so the flag stream is mirrored and never signaled beyond the single `GR_LZ` flag. The coder is O(1) per token and reuses the existing `BitWriter`/`BitReader` flush/finish discipline, so it blends into the existing per-plane length-prefixed stream with no container change.

### 2.5 Bit-exactness and lockstep proof

Induction on pixel position `i`, with the invariant *"the decoder's decoded buffer equals the encoder's decoded buffer for every position `< i`."*

- **Literal:** decoder reads the same GR residual (same `k` because GR adapts only on literals and both sides did so for all prior literals), reconstructs the same pixel. Invariant preserved.
- **Match:** decoder reads the same `(len, offset)`. By the invariant, `plane[i-offset .. i-offset+len]` already equals the encoder's buffer at that offset, so the copy reproduces the encoder's intended pixels exactly. No GR state updates (both sides skip them). Invariant preserved.

Because every coded symbol is either a literal residual (handled by the proven v1 GR path) or an `(offset, len)` tuple (handled by a deterministic copy), the round-trip is exact for any image, at any effort, and the fuzz gate (efforts 0/4/7) and CRC gate are preserved. When `GR_LZ` is clear the branch is never entered, so v1 output is byte-identical.

### 2.6 Why this clears WebP where M2 did not

M2 attacked the *per-symbol* cost (bias, run mode) and found the residual distribution already near its entropy floor - nothing left to take. M3-A attacks the *number of symbols*: a matched pixel contributes ~`(bits_for_flag + bits_for_gamma(offset) + bits_for_gamma(len)) / len` bits amortized, which for `len >= 4` is well below the ~3-6 bits a GR literal costs, and for `len >= 8` is below 1 bit/pixel. Texture, chroma banding, and flat backgrounds - which dominate Kodak's non-information-bearing pixels - are exactly the regions where LZ77 wins. Expect a first-cut gain on the order of 0.3-0.7 bpp (toward / under WebP 9.61), growing with a tuned distance model and lazy matching.

---

## 3. M3-B: self-correcting weighted predictor (secondary, signaled weights)

The current Weighted predictor uses **one per-plane** weight vector chosen from a fixed 16-entry codebook (`model.rs::PlaneModel.weight_index`). M3-B makes the weights **per-context** and **learned**, and optionally **self-correcting at decode time**, shrinking residuals before M3-A's matcher and GR coder see them.

### 3.1 Per-context learned weights (signaled)

During `analyze` (effort >= 4), for every context that selects the Weighted predictor, solve a small least-squares (or a few gradient-descent steps) for the 4 weights `(wl, wt, wtl, wtr)` and `shift` that minimize the training residual magnitude over that context's samples. Quantize each weight to a compact form (e.g. 6-bit signed, `shift` to 3-bit) and store a **per-context weight index** into a per-image learned codebook (mirroring the existing `weight_codebook` slot, now extended per context). The decoder reads the per-context weight and applies `weighted(n, w)` exactly as today.

Model-size guard: with `context_count` up to ~285 and a few bytes per Weighted-using context, the table stays well under `MODEL_SIZE_FRACTION` (the existing model-size guard already falls back to a simpler model if it does not). The per-context weight table lives inside the existing model section (extend `write_model`/`read_model` with a per-plane `(context -> weight_index)` map, emitted only when `GR_LZ` is set and Weighted is used by that plane).

### 3.2 Online self-correction (mirrored, zero extra signal)

After decoding a Weighted-context literal with residual `r`, both sides apply one mirrored stochastic-gradient step to that context's weights:

```
grad_k = sign(r) * neighbor_k        // neighbor in {L, T, TL, TR}
w_k    = clamp(w_k - lr * grad_k, wmin, wmax)   // lr fixed, e.g. 1/16 in Q
```

Because the decoder knows `r` (it just decoded it) and the neighbors (its buffer), it computes the identical update as the encoder, so the weights stay in lockstep with zero signaled bytes beyond the initial per-context table. This is the "self-correcting" property: even a slightly-off initial weight converges to the local optimum as the plane decodes, without the encoder having to signal a better weight.

### 3.3 Scope and risk

M3-B is the higher-risk, higher-model-cost half. The blueprint requires it to be **implemented after M3-A is measured**: if M3-A alone clears WebP (9.61), M3-B is only needed to reach JPEG XL (8.71) and may be gated behind the same `GR_LZ` flag with its own internal `OBSIDIAN_M3_WP` seam (like M2's `OBSIDIAN_M2_BIAS`/`OBSIDIAN_M2_RUN`). If per-context weights blow the model-size budget, fall back to **per-plane** learned weights (one vector per plane, as today but learned via least-squares instead of codebook search) plus the online correction - that already improves over the codebook pick at zero extra model cost.

---

## 4. Builder contract (what changes, minimal, M3-A first)

1. `header.rs`: add `gr_lz()` / `set_gr_lz(bool)` (flags bit 7, 0x80).
2. `rans.rs`:
   - Add `BinCoder` (binary adaptive coder, 12-bit probability) with `bin_put` / `bin_get` over a `BitWriter`/`BitReader` (reuse the existing structs; the match-flag coder may keep its own small bit buffer inside the per-plane `BitWriter`/`BitReader` so literals and flags share one stream).
   - Add match helpers: `write_match` / `read_match` wrapping `write_gamma`/`read_gamma` for `(len_minus_min, offset)` with the `MIN_MATCH` constant. No new entropy primitive beyond `gamma` (already present).
3. `encoder.rs::code_planes` (inside the `entropy_gr` branch, when `gr_lz`):
   - maintain the decoded-plane buffer (we already reconstruct `val` per pixel; keep a copy),
   - run the hash-chain match finder at each position,
   - emit `bin_put(flag)` then either `gr_write_symbol` (literal) or `write_match` (match),
   - set `set_gr_lz(true)` for effort >= 1; false for effort 0.
4. `decoder.rs` residual pass (inside the `entropy_gr && gr_lz` branch):
   - mirror: `bin_get(flag)`; on literal `gr_read_symbol`; on match `read_match` then copy from `plane[pos-offset..]`.
5. (M3-B, after M3-A measured) `model.rs`: per-context learned weights + `OBSIDIAN_M3_WP` seam; `write_model`/`read_model` carry the per-context weight table only when `GR_LZ` + Weighted; `encoder.rs`/`decoder.rs` apply `weighted(n, learned_w)` and the mirrored online correction.

Preserved exactly: YCoCg-R, the predictor bank (except Weighted's weights), the context model + zigzag, the container layout, the per-plane length prefixes, the CRC gate, and the legacy rANS / Design B path. When `GR_LZ` is clear the per-plane stream is byte-identical to v1 GR.

---

## 5. Expected outcome and gates

- **M3 primary gate (this build, M3-A):** mean bpp on Kodak (effort 4) **< 9.61** (WebP). Target ~9.0-9.4 on a first cut; with lazy matching + a tuned distance model, push toward 8.9.
- **M3 secondary gate (M3-A + M3-B):** mean bpp **< 8.71** (JPEG XL). The learned/self-correcting weighted predictor shaves the residual floor further; if it alone is not enough, the still-available **Design B** (capped-and-escaped static rANS with proper per-context context modeling, `entropy-architecture.md` section 7) is the fallback route under 8.71.
- **Acceptance (spec F2 extended):** bit-exact round-trip on Kodak + fuzz set (efforts 0/4/7) must still hold; `cargo test --workspace` green; benchmark row recorded in `benchmarks/results/`.
- **No-expansion invariant:** literals use the proven non-expanding GR path; matches only *remove* bits (they replace literals with a shorter copy descriptor); the flag coder is a convergent binary model. So M3 cannot expand versus v1 GR.

### Honest risk
Photographic Kodak has moderate (not massive) LZ77 matchability: flat regions, chroma, and texture repeat, but smooth gradients do not. Realistic M3-A gain is ~0.3-0.7 bpp, which is enough to clear WebP (gap 0.55) but may land just above JPEG XL (gap 1.45). Reaching JPEG XL reliably needs M3-B *and* possibly Design B. If M3-A measures, say, 9.3 bpp, the WebP gate is met and the PR can be re-evaluated against the owner override (which requires all three gates: PNG already met, WebP met, JPEG XL still open). The roadmap below lists the remaining steps.

---

## 6. Roadmap beyond M3

- **M3.5 - context-modeled rANS / working context mixing (Design B).** The M2.5 mixer regressed because hard expert *selection* adds noise. A real fix is a proper context-modeled entropy backend: cap the GR alphabet (Design B, `entropy-architecture.md` section 7) so static/adaptive rANS tables specialize on small images, then context-model the literals and match tokens together (SSE / small neural mixer). This is the JPEG XL / WebP-class entropy stage and the proven route under 8.71 bpp.
- **M4 - web specimen page + JS mirror (byte-exact) + Playwright/UI verification** (architecture section 15): now that the codec is feature-complete, ship the interactive demonstration layer.
- **M5 - docs:** README, benchmark tables, landing page entries.

Design B (capped/escaped static rANS) remains the structural fallback if the GR + LZ77 path plateaus above JPEG XL.

---

## 7. Test matrix additions

| Area | Test |
|---|---|
| bin | `bin_put`/`bin_get` round-trip for random bit streams and for skewed distributions (prior mostly-0); exhausted read returns `InvalidStream` |
| lz literal | a plane with **no** matchable repeats encodes every pixel as a literal; the bitstream decodes bit-exactly and the GR path is byte-compatible with v1 (flag always 0) |
| lz match | a plane with a repeated block (e.g. `A B C A B C ...`) round-trips; the decoder's copy reproduces the source; `offset`/`len` gamma codes decode correctly |
| lz lockstep | a full `encode`/`decode` round-trip on Kodak + fuzz at efforts 4/7 with `GR_LZ` set, bit-exact; CRC verified |
| lz no-regression | effort 0 (GR_LZ clear) produces byte-identical output to current v1 GR; old GR_M2 / GR_CM streams still decode |
| m3b weights | per-context learned weights: decode with the signaled weights reproduces the analysis-pass residuals bit-exactly; online correction converges and stays mirrored (encoder/decoder weight vectors equal at end of plane) |
| gate | Kodak effort-4 mean bpp recorded; assert < 9.61 (WebP) for M3-A; assert < 8.71 (JPEG XL) once M3-B + Design B land |

Existing GR, rANS, M2, and M2.5 tests are retained unchanged.

---

## 8. Build order for the Builder (M3-A first, measure, then M3-B)

1. `rans.rs`: add `BinCoder` (`bin_put`/`bin_get`), `MIN_MATCH` constant, `write_match`/`read_match` (gamma-based). Keep `write_gamma`/`read_gamma`.
2. `header.rs`: add `gr_lz()` / `set_gr_lz`.
3. `encoder.rs::code_planes`: GR+LZ branch - decoded-plane buffer, hash-chain match finder, `bin_put` flag, literal `gr_write_symbol` / match `write_match`. Set `set_gr_lz(true)` for effort >= 1.
4. `decoder.rs`: mirror the GR+LZ branch (`bin_get`, literal, copy).
5. `cargo test --workspace`; `benchmarks/run_kodak.sh` at effort 4; record the row; confirm < 9.61 (WebP). If met, the WebP gate clears.
6. **Measure before M3-B.** If still above JPEG XL (8.71), implement M3-B (per-context learned weights + `OBSIDIAN_M3_WP` seam + mirrored online correction, model section changes), re-benchmark, and if needed invoke Design B (M3.5) as the final push under 8.71.
7. M4 (web specimen) and M5 (docs) follow once the codec clears the gates.

- the Architect
