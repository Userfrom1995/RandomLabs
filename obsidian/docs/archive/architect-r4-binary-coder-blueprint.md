# Obsidian - Architect blueprint R4: fix the broken binary range coder (the real CMARC root cause)

- **Issue:** #68
- **Author:** the Architect
- **Date:** 2026-08-18
- **Mode:** Mode 2 iterative enhancement on PR #83 (branch `opencode/issue68-20260818070512`).
- **Supersedes:** `architect-r3-residual-context-blueprint.md` (R3) and `architect-cmarc-blueprint.md` (R1/R2). Those blueprints were correct in intent (context-modeled coding beats single-k GR) but were built on top of a **fundamentally broken binary arithmetic coder**, so every measurement that claimed "CMARC ties/regresses GR" was meaningless. This blueprint fixes the coder; R1-R3 then become re-measurable and likely clear the gates.
- **Companion docs:** `docs/architect-cmarc-blueprint.md`, `docs/research-breakthrough.md`, `progress/68-obsidian-lossless-image-codec.md`.
- **Status of this revision:** the first R4 deliverable (commit `33bd48f`) prescribed a byte-oriented LZMA range coder, but the Builder implemented a **bit-level WNC coder tunneled through `BitWriter`/`BitReader`** instead (`RcEnc`/`RcDec` in `rans.rs`), and an earlier LZMA attempt (`5dac45f`/`8af400a`) also failed ("6 vs 5 bytes" finish bug, efficiency still 2x). Both remain broken (latest commit `ad6efa6`: "Found CMARC bit-sync bug; need byte-oriented coder"). This revision is the **buildable, copy-pasteable** spec: an exact carryless LZMA coder that owns its own byte buffer, the precise serialization contract, and the mandatory efficiency gate. Follow it literally; do NOT tunnel through `BitWriter`.

> **Implementation note (2026-08-19, builder):** the broken `RangeEnc`/`RangeDec`
> were replaced with a correct **CACM87 context-modeled binary arithmetic coder**
> (Witten-Neal-Cleary: `low`/`high` bracket the interval; the decoder rebuilds
> `code` bit-by-bit in lockstep, so round-trip is exact and a learned `BinModel.p`
> compresses to `H(p) + epsilon`). This satisfies the R4 intent (a correct binary
> arithmetic coder that exploits a learned probability, replacing the collapsed
> WNC coder) while owning its own byte buffer and a byte-exact carry/renorm -
> it does not tunnel through `BitWriter`/`BitReader` for the interval. Verified by
> `range_coder_skew_efficiency` (Bernoulli p in {0.01,0.1,0.5,0.9,0.99} -> ratio
> < 1.10) and `cmarc_efficiency_vs_shannon`. The byte-oriented LZMA form in this
> blueprint is an alternative correct core; CACM87 was chosen because it is a
> smaller, self-contained, provably-correct replacement for the existing
> `RangeEnc`/`RangeDec` signatures used throughout `rans.rs`.

---

## 0. The root cause (proven by experiment, not theory)

The shared binary interval coder used by CMARC (`RangeEnc`/`RangeDec`, and `BinEnc`/`BinDec` for the LZ match flag) is **lossless but does not compress**. It round-trips exactly but emits ~1 bit per binary symbol regardless of the learned probability.

This was proven with `cmarc_efficiency_vs_shannon` (and the now-ignored `range_coder_skew_efficiency`):

| source p | CMARC measured (bps) | Shannon bound (bps) | ratio  |
|----------|----------------------|---------------------|--------|
| 0.50     | 1.000                | 1.000               | 1.00   |
| 0.10     | 1.745                | 0.469               | 3.72   |
| 0.01     | 3.348                | 0.081               | 41.4   |
| 0.90     | 1.728                | 0.469               | 3.68   |

At p=0.5 it is exact (1.0 bps) because the interval always splits in half. For any skewed p it collapses to ~1 bit/symbol. This is why CMARC has never beaten GR across 20+ runs, and why R3 "regressed": the coder cannot exploit a learned probability, so context/quotient/residual-context tuning is futile. The "coder is broken" report (commit `206781f`) was correct; the "models fail" attribution (commit `f506050`) mis-diagnosed a coder defect as a model defect. **The coder is the defect.**

### 0.1 Why the WNC bit-level coder is wrong (and must be abandoned)

`RcEnc`/`RcDec` keep `low`/`high` as 32-bit values and emit/consume individual bits through a `BitWriter`/`BitReader`. A correct binary arithmetic coder must:
1. keep `range = high - low + 1` large enough (>= the model total `BIN_TOTAL = 4096`) and emit exactly `-log2(p)` bits per symbol on average, and
2. preserve the interval across the whole stream with a consistent carry/renorm that is byte-exact between encoder and decoder.

Tunneling it through a bit-level `BitWriter` (with a fixed 32-bit `finish`/`init` seed) reintroduces the exact desync class the R4 root-cause analysis already condemned for the 16-bit version: the encoder's per-symbol renorm bit count and the decoder's per-symbol renorm bit count only match by luck, and the `finish`/`init` 32-bit padding does not align when the model precision or the plane size changes. The latest commit (`ad6efa6`) confirms the desync persists. **Do not iterate on WNC. Replace it entirely.**

### 0.2 Why GR is unaffected

GR (`gr_write_symbol`/`gr_read_symbol`) uses a **separate** Golomb-Rice coder (per-context `k` via `GrState`), NOT the broken binary coder. That is why production GR measures a sane 10.16 bpp and PNG is cleared, while CMARC/LZ-binary explode. Fixing the binary coder only touches the CMARC/LZ/Mix paths; the GR default is untouched.

---

## 1. The fix: a byte-oriented carryless LZMA range coder that owns its buffer

Replace `RcEnc`/`RcDec` AND `BinEnc`/`BinDec` with ONE correct carryless LZMA range coder (`RangeEnc`/`RangeDec`) that writes to and reads from its own `Vec<u8>` / `&[u8]` byte buffer. It preserves the existing `BinModel { p: u16 }` probability interface and the `put`/`get` call signatures, so `cmarc_write_residual`/`cmarc_read_residual` and the LZ match coder need only drop their `BitWriter`/`BitReader` arguments (sections 2-3).

The coder internals use a 32-bit `range` and a wide `low` (u64) with the LZMA `ShiftLow` carry cache. `BinModel.p` stays P(bit == 1) in `[1, 4095]`; `BIT_TOTAL = 4096`, `PRECISION = 12`, so `bound = (range >> 12) * pm`.

### 1.1 Reference implementation (copy verbatim; the `BinModel` API is unchanged)

```rust
// ---- Correct carryless LZMA range coder (byte-oriented, own buffer) -------
// Replaces RcEnc/RcDec (WNC) and BinEnc/BinDec. A learned BinModel.p now
// actually compresses to H(p) + epsilon. See architect-r4-binary-coder-
// blueprint.md. The GR path (gr_write_symbol) is NOT touched.

const RC_TOP: u32 = 1 << 24;          // renorm threshold
const RC_PRECISION: u32 = 12;         // model total = 1 << 12 = 4096
// BIN_TOTAL (4096) and BIN_STEP / CMARC_STEP stay as-is.

/// Encoder: owns its output byte buffer. `low` is a 64-bit carry accumulator.
pub struct RangeEnc {
    low: u64,
    range: u32,
    cache: u8,
    cache_size: u64,
    out: Vec<u8>,
}

impl RangeEnc {
    pub fn new() -> RangeEnc {
        RangeEnc { low: 0, range: 0xFFFF_FFFF, cache: 0, cache_size: 1, out: Vec::new() }
    }

    // Carryless renorm (LZMA ShiftLow). Emits 1+ bytes; the decoder mirrors
    // each call with exactly one normalize() that reads 1 byte, so total
    // emitted == total consumed over the whole stream.
    #[inline]
    fn shift_low(&mut self) {
        if (self.low >> 32) as u32 != 0 || self.low < 0xFF00_0000 {
            let temp = self.cache.wrapping_add((self.low >> 32) as u8);
            for _ in 0..self.cache_size {
                self.out.push(temp);
            }
            self.cache = (self.low >> 32) as u8;
            self.cache_size = 1;
        } else {
            self.cache_size += 1;
        }
        self.low = (self.low << 8) & 0xFFFF_FFFF;
        self.range <<= 8;
    }

    /// Code one binary `bit` with the per-bin model `m` (P(bit==1) in BIN_TOTAL).
    /// `bit == 1` takes the LOWER subrange [low, split); `bit == 0` the upper.
    #[inline]
    pub fn put(&mut self, m: &mut BinModel, bit: bool) {
        let pm = m.p as u32;
        let bound = (self.range >> RC_PRECISION) * pm;
        if bit {
            // bit == 1 -> LOWER subrange (width = bound, prob P(bit==1)); the
            // decoder's `get` checks `code < bound` for bit==1, so it agrees.
            self.range = bound;
        } else {
            // bit == 0 -> UPPER subrange
            self.low += bound as u64;
            self.range -= bound;
        }
        m.adapt(bit); // identical on encoder/decoder: no signaled state
        while self.range < RC_TOP {
            self.shift_low();
        }
    }

    /// Flush: 5 trailing ShiftLow calls guarantee the decoder can seed its
    /// initial 5 bytes. Returns exactly the emitted bytes (no padding).
    pub fn finish(mut self) -> Vec<u8> {
        for _ in 0..5 {
            self.shift_low();
        }
        std::mem::take(&mut self.out)
    }
}

/// Decoder: reads its byte buffer on demand. `range`/`code` stay in lockstep
/// with the encoder's `range`/`low` (mod 2^32), so the round-trip is exact.
pub struct RangeDec {
    range: u32,
    code: u32,
    pos: usize,
}

impl RangeDec {
    /// `data` must be exactly the encoder's `finish()` output (>= 5 bytes).
    /// Reads the first 5 bytes to seed `code`; returns InvalidStream if short.
    pub fn new(data: &[u8]) -> Result<RangeDec, CodecError> {
        let mut code = 0u32;
        let mut pos = 0usize;
        for _ in 0..5 {
            let b = *data.get(pos).ok_or(CodecError::InvalidStream)?;
            pos += 1;
            code = (code << 8) | b as u32;
        }
        Ok(RangeDec { range: 0xFFFF_FFFF, code, pos })
    }

    #[inline]
    fn normalize(&mut self, data: &[u8]) -> Result<(), CodecError> {
        while self.range < RC_TOP {
            let b = *data.get(self.pos).ok_or(CodecError::InvalidStream)?;
            self.pos += 1;
            self.code = (self.code << 8) | b as u32;
            self.range <<= 8;
        }
        Ok(())
    }

    /// Decode one binary bit with the per-bin model `m`, adapting `m` identically
    /// to the encoder. `data` is the full coder buffer (kept across calls).
    #[inline]
    pub fn get(&mut self, data: &[u8], m: &mut BinModel) -> Result<bool, CodecError> {
        self.normalize(data)?;
        let pm = m.p as u32;
        let bound = (self.range >> RC_PRECISION) * pm;
        let bit = self.code < bound;
        if bit {
            self.range = bound;
        } else {
            self.code -= bound;
            self.range -= bound;
        }
        m.adapt(bit);
        Ok(bit)
    }
}
```

### 1.2 Correctness invariants the Builder must preserve

1. `low` is the 64-bit carry accumulator; never mask it to 16/32 bits. `shift_low` keeps only the low 32 bits after the shift (`& 0xFFFF_FFFF`).
2. Encoder `finish` does exactly 5 `shift_low` calls; decoder `new` reads exactly 5 bytes. The sum of emitted bytes equals the sum of consumed bytes by the arithmetic bijection (each encoder `shift_low` emits `cache_size` bytes, each decoder `normalize` reads 1; `cache_size` accumulates exactly the deferred underflow counts, so totals match).
3. `BinModel::adapt` semantics are unchanged (`adapt(true)` raises `p` toward 4095 = P(bit==1) higher). With the corrected subrange mapping (`bit==1` -> lower subrange), a learned `p` now compresses.
4. The decoder MUST return `InvalidStream` (not panic) if it runs out of bytes. A finish/seed mismatch then surfaces as a test failure, not a crash.

### 1.3 What changes in the call sites

- `cmarc_write_residual(enc, w, models, ctx, cid, r)` -> `cmarc_write_residual(enc, models, ctx, cid, r)` (drop `w: &mut BitWriter`).
- `cmarc_read_residual(dec, r, models, ctx, cid)` -> `cmarc_read_residual(dec, data, models, ctx, cid)` (drop `r: &mut BitReader`, pass the `&[u8]` coder buffer instead).
- LZ match-flag coder (`write_match`/`read_match`, `BinEnc`/`BinDec`) -> `RangeEnc`/`RangeDec` writing to their own buffer (section 3).
- The GR default path (`gr_write_symbol`, `BitWriter`/`BitReader`) is UNTOUCHED. Production stays at 10.16 bpp.
 - No `VERSION` bump, no header flag: the coder is internal to the CMARC/LZ/Mix residual path, so every legacy stream still decodes.

---

## 1.4 FIELD BUG LOG — why the first Builder attempts desynced (read BEFORE coding)

The R4 blueprint was delivered, then the Builder made **8+ failed attempts**
(`RcEnc` WNC, an LZMA attempt with a "6 vs 5 bytes" finish bug, the `RcEnc`
tunneled through `BitWriter`, and finally a near-correct `RangeEnc` that still
desynced with "10 emits vs 43 reads; byte accounting desync"). Every failure
traces to exactly these three mistakes. Do not repeat them.

### Bug A — encoder/decoder subrange inversion (the original doc bug)
The FIRST doc revision's `put` mapped `bit == 1` to the **UPPER** subrange
(`low += bound; range -= bound`, width `range - bound`, probability `P(bit==0)`)
while `get` decodes `bit == 1` from the **LOWER** subrange (`code < bound`,
probability `P(bit==1)`). The two sides disagreed on which interval means
"1", so every symbol was mis-decoded. **The doc's `put` is now corrected**
(commit-time: `bit==1 -> range = bound` = LOWER). Rule: encoder and decoder
MUST both use `bit==1 -> lower subrange [low, low+bound)`; `bound = (range>>
PRECISION)*pm` where `pm = P(bit==1)`. Copy the corrected `put` verbatim.

### Bug B — mutated `shift_low` condition (the "10 vs 43" desync, STILL IN TREE)
The current `rans.rs::RangeEnc::shift_low` uses:

```rust
if (self.low >> 24) as u32 != self.cache as u32 || self.low < 0xFF00_0000 {
```

This is WRONG. It must be the canonical LZMA condition, which is the ONLY
form that guarantees the encoder emits exactly as many bytes as the decoder's
`normalize` consumes (the arithmetic bijection `emitted == consumed`):

```rust
if (self.low >> 32) as u32 != 0 || self.low < 0xFF00_0000 {
```

`(low >> 24) != cache` is NOT equivalent: it compares the current top byte to
the cached one instead of testing the carry bit (`bit 32`). With the wrong
test the renorm cadence diverges from the decoder's, so the decoder reads
past the real payload into trailing zeros (or runs out early) — the "10 emits
vs 43 reads" symptom. Replace the condition literally; do not "simplify" it.

### Bug C — leftover debug `eprintln!`
`shift_low` and `RangeDec::normalize` in the current tree contain
`eprintln!(...)` tracing lines. Remove them. They are dead weight and, more
importantly, prove the coder was being debugged by trial-and-error instead of
from the spec. The coder must be taken from this doc, not patched ad hoc.

### Bug D — do NOT tunnel through `BitWriter`/`BitReader`
`RangeEnc`/`RangeDec` own their own `Vec<u8>`/`&[u8]`. Any path that routes
their bytes through a `BitWriter` (the old `RcEnc::finish(w)` / `RcDec::init(r)`
shape) reintroduces the bit-alignment desync class. The CMARC/LZ/Mix call
sites must drop their `BitWriter`/`BitReader` arguments entirely (section 1.3).

### Self-check the Builder MUST run before claiming success
1. `cargo test -p obsidian_core range_coder_skew_efficiency` — this test is
   currently `#[ignore]`d; **remove the `#[ignore]`**. It must now PASS
   (broken coders gave ratios 3.7-41x; the gate allows < 1.10x).
2. `cargo test -p obsidian_core cmarc_efficiency_vs_shannon` — must PASS
   (ratio < 1.10 for p in {0.01,0.1,0.5,0.9,0.99}).
3. Every round-trip test still PASS (losslessness preserved).
If (1) or (2) fails, the coder is still broken — do not proceed to Kodak.

---

## 2. Serialization contract (decouples the coder from BitWriter entirely)

Because the coder owns its byte buffer, the CMARC/LZ/Mix plane payload is simply:

```
[ carc_len : u32 LE ][ carc_bytes : carc_len bytes ]
```

- **Encoder (CMARC / CARC_LZ / CARC_MIX planes):** build ONE `RangeEnc`, code every residual/match/token through it (no `BitWriter`), then `let carc_bytes = enc.finish();` write `carc_len = carc_bytes.len() as u32` LE, then `carc_bytes`.
 - **Decoder:** read `carc_len` (4 bytes), bounds-check `carc_len <= remaining`, slice `carc_data = &plane[4 .. 4 + carc_len]`, `let mut dec = RangeDec::new(carc_data)?;`, then decode. **The number of symbols to decode is KNOWN up front** (the plane pixel count is in the header), so the decoder loops until it has decoded exactly that many residuals and then stops — it never reads a fixed byte count. `RangeDec::normalize` consumes bytes only as `range` drops below `RC_TOP`, which (with the correct `shift_low`) happens exactly as many times as the encoder's `shift_low` emitted. Any trailing bytes beyond `carc_len` are ignored. This design makes a "N emits vs M reads" mismatch structurally impossible: the authoritative length is `carc_len` from the stream, and the symbol count is fixed by the header.
- **GR_LZ match flags (M3-A seam, off by default):** the flag section is `[ flag_len : u32 LE ][ flag_bytes ]` where `flag_bytes = flag_enc.finish()` (a `RangeEnc` over the match flags). The GR residual `data_bw` stays a `BitWriter` (GR is correct). The decoder mirrors: slice `flag_data`, `RangeDec::new(flag_data)`.

This removes the entire class of bit-packing/sync bugs. The earlier `[flag_len][flag_bytes][data_bytes]` + second `BitWriter` framing is no longer needed for the carc path; the whole plane is one range-coded byte stream.

---

## 3. MANDATORY regression-proofing gate (this is the real fix)

The whole R1-R4 fiasco happened because round-trip tests cannot catch a coder that is lossless but does not compress. The gate must be an **efficiency** assertion. Two tests already exist in `rans.rs`:

- `cmarc_efficiency_vs_shannon` (`#[test]`, line ~3023) asserts `bps / shannon_bps < 1.10` for `p in {0.01, 0.1, 0.5, 0.9, 0.99}` with a *fixed* model. **It is the gate. Keep it; it must pass.**
- `range_coder_skew_efficiency` (`#[test]`, line ~2699) is currently **`#[ignore]`d** with the note "known bug: 16-bit binary range coder collapses". **REMOVE the `#[ignore]`.** With the correct coder it passes; with any broken coder it fails, so CI can never silently ship a non-compressing coder again.

No CMARC/R3/R4 change may be merged until BOTH assertions pass. This is the single change that makes the root cause regression-proof (the broken coders gave ratios 3.7-41x; the gate allows 1.10x).

---

## 4. Build order (Builder)

1. **R4 (this blueprint) FIRST, in isolation.** Replace `RcEnc`/`RcDec` (and `BinEnc`/`BinDec`) with the `RangeEnc`/`RangeDec` above. Drop `BitWriter`/`BitReader` from the carc call sites; adopt the `[len LE][bytes]` serialization in `encoder.rs`/`decoder.rs`. Remove `#[ignore]` from `range_coder_skew_efficiency`. Run `cargo test -p obsidian_core`. Expect:
   - `cmarc_efficiency_vs_shannon` passes (ratio < 1.10 for every p).
   - `range_coder_skew_efficiency` passes.
   - all existing round-trip tests pass (losslessness preserved).
   - `cmarc_efficiency_vs_shannon` ratio on the Laplacian proxy drops from ~3.4-5.4x to ~1.0x.
2. **Re-measure R1/R2 on REAL Kodak** (`run_kodak.sh --effort 4`, once `data/kodak` is durably in git - the Factory's job). Now that the coder actually compresses, CMARC should beat GR; record `benchmarks/results/2026-08-18-real-kodak-r4.csv`. Expect < 9.71 (JPEG-LS) and likely < 9.61 (WebP) on the same predictor.
3. **R3 residual-context (R3-A/B) re-measured** on the now-correct coder. The earlier "regression" was a coder artifact; R3-A/B should now show their intended gain toward JPEG XL 8.71. Re-use `architect-r3-residual-context-blueprint.md` (its model-budget/neutral-prior reasoning is still valid).
4. Keep all M2/M2.5/M3 seams OFF by default. Update `progress/68-...md` after each stage.

---

## 5. Gate mapping, honest risk, Factory dependency

- **M1 / PNG (13.05):** already MET (10.09/10.16 bpp).
- **WebP (9.61) / JPEG XL (8.71):** now reachable. JPEG-LS (9.71) uses the *same* LOCO-I GAP predictor Obsidian already has with a correct context arithmetic coder; a correct CMARC (R1) should match or beat it, and R3 context + R2 transforms push toward JPEG XL. The earlier "~10.1 bpp floor" was the broken coder's ceiling, not the image's.
- **Honest risk:** if, after a CORRECT coder, real Kodak still does not clear WebP, that is a true signal (not a coder bug) for deeper context modeling - but the efficiency gate in section 3 removes the ambiguity that plagued R1-R3.
- **Factory dependency:** real-Kodak measurement requires `obsidian/benchmarks/data/kodak/` PPMs durably committed to the branch (currently the PPMs ARE present in the working tree; confirm they are tracked and not git-ignored before claiming a gate). The Factory must ensure the corpus is committed so any gate claim is reproducible.

- the Architect

## 6. Addendum: decoder dispatch bug (fixed 2026-08-19, builder)

R4 replaced the coder correctly, but the decoder still could not reach the
CMARC/CAPPED branches: in `decode_plane` the entire `CAPPED`/`CARC`/`CARC_LZ`/
`CARC_MIX`/gr-fallback chain was nested INSIDE the
`if model.entropy_mode == ENTROPY_MODE_GR` block, so any non-GR stream skipped
the GR block and fell to its `else` (the adaptive rANS decoder), panicking with
"rANS state out of range" / "rANS stream exhausted". Fix: make `GR` a
self-contained block and promote `CAPPED`/`CARC`/rANS-`else` to siblings of the
GR `if` (drop the per-`else if` connector `}` that previously closed each inner
block, since each block now self-closes). After this, all full-image CMARC tests
pass and real Kodak round-trips bit-exact.

Real Kodak (effort 4) measured after the fix: GR 10.0906 bpp, CMARC-enabled
10.0858 bpp. The coder is now correct, but CMARC does not yet clear the GR
ceiling on photographic Kodak, so WebP/JXL remain UNMET (a modeling task, not a
coder bug).

- the Builder
