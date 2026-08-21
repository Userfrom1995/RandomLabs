# Prism - Architecture Blueprint (Architect handoff for #103)

- **Issue:** #103 (owner directive 2026-08-21)
- **Role:** the Architect
- **Input specs:** `prism/docs/research.md`, `prism/docs/algorithmic-spec.md`,
  `prism/docs/benchmark-methodology.md` (Dr. Mob, the Researcher).
- **Mandate:** C++ lossless image codec, format-agnostic front-end, Squeeze +
  MA-tree context model coupled, beat JPEG XL on Kodak (< 8.71 summed bpp) with
  a hard bit-exact round-trip invariant from M0.

This document is the **authoritative build contract** for the Builder. It fixes
the module layout, the exact container byte format, the MA-tree serialization,
the front-end decoder boundary, the public CLI/API, and the build order that
lands M0 (bit-exact, fuzz-gated, deterministic) before any optimization. It
contains interfaces and data structures only; the Builder fills in bodies.

---

## 1. Repository module layout

```
prism/
  CMakeLists.txt                 # top-level: options PRISM_WITH_WEBP / PRISM_WITH_TIFF
  include/prism/
    prism.h                      # public C API + PRISM_VERSION
    types.h                      # Sample, Raster, PlaneView, enums, fixed ints
    bitstream.h                 # BitReader / BitWriter (byte-aligned, LE u32/u16/u8)
    crc32.h                     # CRC32 (IEEE, table-init at first use)
    frontend/
      frontend.h                # Raster decode_to_raster(path, opts)
      stb_image_wrapper.h       # PNG/JPEG/BMP/PPM/TGA/HDR via stb_image
      ppm_raw.h                 # PPM (P5/P6/PPM16) + raw (--w/h/bpp flags)
      webp_dec.h                # libwebp decode (PRISM_WITH_WEBP)
      tiff_dec.h                # libtiff decode (PRISM_WITH_TIFF)
    codec/
      color.h                   # decorrelation set (Stage C)
      squeeze.h                 # CDC, post-order emit (Stage S)
      predict.h                 # predictor bank + weighted LS (Stage P)
      matree.h                  # MA-tree model + serialization (Stage X)
      rans.h                    # 32-bit rANS, binary decomposition (Stage E)
      cm.h                      # logistic context mixing (effort >= 4)
      lzp.h                     # LZP pre-filter (effort >= 7)
      container.h               # encode/decode top-level (Stage H)
      analyze.h                 # analysis pass: transform/squeeze/predictor/MA-tree search
  src/
    codec/*.cpp                 # one .cpp per header above
    frontend/*.cpp
    common/crc32.cpp bitstream.cpp types.cpp
    cli/main.cpp                # prism enc|dec|bench|fuzz
  tests/
    unit/                       # per-module gtest
    fuzz/fuzz_gate.cpp          # randomized round-trip + corruption gate
    roundtrip/roundtrip_kodak.cpp
  benchmarks/
    data/kodak.sha256
    toolchain.md
    fuzz_gate.sh run_kodak.sh aggregate.py results/
```

**Dependency policy.** M0 front-end ships with `stb_image` (vendored, header-only:
PNG/JPEG/BMP/TGA/HDR) plus a hand-written PPM/raw decoder, so the codec builds
with **zero external image deps**. WebP and TIFF decoders are behind
`PRISM_WITH_WEBP` / `PRISM_WITH_TIFF` CMake options (libwebp, libtiff) and land
at M2. The codec core must not `#include` any front-end header; the front-end
only converts to a `Raster` and hands it off.

---

## 2. Core types (`types.h`)

```cpp
namespace prism {

using u8=u8_t; using u16=u16_t; using u32=u32_t; using u64=u64_t;
using i16=i16_t; using i32=i32_t;

enum class BitDepth : u8 { BD8=8, BD16=16 };
enum class Channels : u8 { GRAY=1, GA=2, RGB=3, RGBA=4 };

// A sample is stored widened to the largest needed intermediate so transforms
// never overflow; planar storage, channel-major.
struct Raster {
    BitDepth bd; Channels ch;
    u32 w, h;
    // planes[c] is a contiguous row-major buffer of w*h samples, value range
    // [0, 2^bd-1]. Alpha (last plane when ch>=2) is never transformed.
    std::vector<std::vector<u16>> planes; // u16 holds 8- and 16-bit samples
    // helper: as_i32/c cast accessors with sign/width widening.
};

// Feature vector at a sample, Stage X input (see matree.h).
struct Feature {
    u16 qg;        // quantized gradient magnitude bucket
    u8  band_class; // 0=LL,1..3=HF(H/V/D), plus level in high bits
    u8  llc_class;  // co-located LL value bucket (HF bands only)
    u16 res_diff;   // JPEG-LS residual-DIFF class id (<=365)
    u8  sibling_class;
    u8  activity;
};

}
```

`Raster` is the only currency between front-end and codec. All codec stages take
a `Raster` (planar) and return a `Raster` (planar) so each stage is independently
unit-testable as an integer bijection.

---

## 3. Container byte format (Stage H, binding)

All multi-byte integers are **little-endian**. The stream is byte-aligned except
the entropy payload (rANS) which may end unaligned and is itself self-delimiting
per band. Magic is 4 bytes (the 5-letter "PRISM" is truncated to `PRSM` to fit
the 4-byte field; this is the canonical magic).

### 3.1 Header (fixed layout, no padding)

| Offset | Field | Type | Notes |
|---|---|---|---|
| 0 | magic | 4 bytes | `'P','R','S','M'` (0x50 52 53 4D) |
| 4 | version | u8 | = 1 |
| 5 | width | u32 LE | >= 1 |
| 9 | height | u32 LE | >= 1 |
| 13 | bit_depth | u8 | 8 or 16 |
| 14 | num_channels | u8 | 1,2,3,4 |
| 15 | color_transform_id | u8 | 0 None,1 YCoCg-R,2 subtract-green,3 YCoCg-R+sub-green,4 CFL,5 CFL+others |
| 16 | flags | u8 | bit0 = CM mode, bit1 = LZP pre-filter |
| 17 | effort | u8 | 0..7 (mirror; lets decoder pick backends) |
| 18 | cfl_scales | (num_chroma) x u8 | num_chroma = max(0, num_channels-1); scale 0..7, all 0 if CFL unused |
| 18+num_chroma | squeeze_levels | num_channels x u8 | one u8 per plane, 0..max_levels(w,h) |
| +num_channels | model_len | u32 LE | byte length of the model blob that follows |

### 3.2 Model section (`model_len` bytes)

Emitted with a dedicated `BitWriter` (bit-packed), then **byte-padded** to the
`model_len` boundary (pad bits = 0). Layout inside the blob:

1. `num_trees : u16 LE` (number of MA-trees stored).
2. For each tree `t` in `0..num_trees`: `(group_id : u8, band_class : u8)` then
   the serialized tree (Section 4).
3. Predictor map:
   - `predictor_mode : u8` (0 = global single predictor, 1 = per-leaf map).
   - If 0: `global_pred_id : u8`.
   - If 1: `total_leaves : u32 LE`, then `total_leaves` bytes, one `pred_id : u8`
     per leaf in **global leaf-index order** (leaves are numbered 0..K-1 across
     all trees in emit order).
4. Rice-shift priors (present iff `effort >= 4`, else omitted): a `u8` count of
   contexts that carry a non-default `k`, then for each: `ctx_id : u16 LE`,
   `k : u8`. Default `k = 0` when absent (entropy-adapted EMA overrides anyway).
5. `crc32_model : u32 LE` = CRC32 of bytes [start_of_blob .. here).

### 3.3 Payload

For each plane `c` in `0..num_channels`, and within a plane for each of its
`B(c) = 1 + 3*squeeze_levels[c]` sub-bands in **post-order** (LL of the deepest
already-resolved node first; see Section 5 emit order):

```
[band_len : u32 LE][band_bytes : band_len bytes]
```

`band_bytes` is the rANS (or CM/LZP-post-processed) stream for that band. The
decoder knows `B(c)` from `squeeze_levels[c]`, so the payload needs no count
header; it walks expected band count = `sum_c (1 + 3*squeeze_levels[c])`.

### 3.4 Footer

```
[crc32_all : u32 LE] = CRC32 of (header bytes || model blob bytes || all payload bytes)
```

**Decoding recovery rule:** if `crc32_model` mismatches, reject immediately
(corrupt model). If `crc32_all` mismatches, reject (corrupt payload/header).
Either mismatch is a hard decoder error; the codec never emits a partially
decoded raster. This is the M0 corruption gate.

---

## 4. MA-tree serialization (Stage X)

The MA-tree is a binary decision tree. Internal nodes test a property of the
`Feature` vector; leaves are probability-model contexts fed to rANS. The tree is
built in the analysis pass (greedy entropy split, cap depth `D`, cap leaves `K`)
and serialized **once** per (group, band-class). Decoder rebuilds the identical
tree with zero online state.

### 4.1 Property ids

| id | property | threshold meaning |
|---|---|---|
| 0 | `qg < T` | gradient magnitude bucket threshold |
| 1 | `band_class == T` | T is the band class being tested |
| 2 | `llc_class < T` | co-located LL value bucket (HF only) |
| 3 | `res_diff < T` | residual-DIFF class threshold |
| 4 | `sibling_class < T` | sibling-band value bucket |
| 5 | `activity < T` | local activity class |

Thresholds are `u16`. `qg`/`res_diff` use the LUT-quantized buckets from the
algorithmic spec (residual-DIFF ids <= 365 via sign-symmetry table).

### 4.2 Node record (bit-packed in the model blob)

Pre-order DFS serialization; children are the **next two nodes in traversal
order** (left then right), so no explicit child pointers are stored:

```
for each node in pre-order:
    is_leaf : 1 bit
    if leaf:
        leaf_id : u16      // assigned 0..K-1 in emit order, global across trees
    else:
        prop_id : u8       // 0..5
        threshold : u16
```

Tree header before the node stream (per tree): `max_depth : u8`, `num_leaves : u16`.

This is minimal and exact: a tree with K leaves has exactly `2K-1` nodes; the
decoder reconstructs the full topology by replaying pre-order with the implicit
left/right pairing. Leaf `leaf_id` is the index into the per-leaf predictor map
(Section 3.2.3) and the per-leaf rANS model state.

### 4.3 Leaf context binding

At encode/decode, for each sample the codec computes `Feature f`, walks the tree
from the root applying `prop_id/threshold` tests to reach a leaf, and uses that
leaf's `leaf_id` as `cx` for the rANS models (`sign_model[cx]`, `zero_model[cx]`,
`quotient_model[cx]`, `rem_model[cx][j]`). The per-context Rice shift `cx.k` is an
integer EMA of `|e|`, mirrored between encoder and decoder, so it costs zero
signaled bytes.

---

## 5. Squeeze emit order (Stage S, must match exactly)

Per plane with `L = squeeze_levels[c]` levels, build the sub-band tree, then emit
**post-order**: a node's LL band is emitted before its three HF children (H, V,
D), recursively. For `L=0` the only band is the (un-squeezed) plane itself. The
decoder reconstructs bottom-up so that when it reaches an HF band, the co-located
LL samples are already available for the CrossBand predictor (Stage P) and the
MA-tree `llc_class` feature. This ordering is what makes Squeeze non-inert (the
Obsidian R11-A lesson).

The total band count per plane `B(c) = 1 + 3*L` (each of L levels adds 3 HF
bands; the final LL is the single remaining band). The codec computes expected
bands from the header and asserts the payload supplies exactly that many.

---

## 6. Entropy coder (Stage E) interface

`rans.h` exposes:

```cpp
class RansEncoder {
public:
    void put_bin(u16& prob, bool bit);          // per-context adaptive 16-bit prob (WNC/CABS)
    void encode_residual(Models& m, int leaf_id, i32 e); // sign + zero + Rice q + remainder
    void flush_and_emit(std::vector<u8>& out);  // finalize, byte-align
};
class RansDecoder {
public:
    bool get_bin(u16& prob);
    i32  decode_residual(Models& m, int leaf_id);
    void init(span<const u8> band);
};
```

Four adaptive binary models per leaf: `sign`, `zero`, `quotient` (run of q zeros
then a one), `remainder[k]` (MSB-first). All probabilities are 16-bit, adapted
with the JXL WNC/CABS learning rate, clamped to the valid open interval so the
coder is provably H(p)+epsilon (the Obsidian R4 mandatory efficiency gate). The
Builder must include a unit test asserting the rANS coder round-trips a random
bit stream exactly and that the coded length of iid Bernoulli(p) data approaches
H(p) within epsilon.

CM (`cm.h`) and LZP (`lzp.h`) are opt-in backends gated by `flags`: CM wraps the
per-leaf models with a logistic mixer + SSE on neighbor residuals (effort >= 4);
LZP scans the residual/value stream for matches and emits flag+run before rANS
(effort >= 7). Both are behind the **never-expand safety net**: the encoder
re-encodes with and without the extra backend and keeps the smaller file, so they
are selected only when they actually shrink bytes.

---

## 7. Front-end boundary (`frontend.h`)

```cpp
namespace prism::frontend {
struct DecodeOpts { bool apply_icc = true; }; // linearize via ICC before codec sees pixels
// Returns canonical planar Raster; throws prism::DecodeError on any front-end failure.
// Front-end errors are HARD encoder errors, never a corrupt-stream condition.
Raster decode_to_raster(const std::filesystem::path& in, const DecodeOpts& o = {});
// Suffix dispatch: .png/.jpg/.jpeg/.bmp/.tga/.hdr -> stb_image;
// .ppm/.pgm -> ppm_raw; .webp -> webp_dec (if PRISM_WITH_WEBP);
// .tiff/.tif -> tiff_dec (if PRISM_WITH_TIFF); raw requires --w/--h/--bd flags.
}
```

The encoder: `decode_to_raster` -> `Raster` -> codec `encode(Raster, effort)` ->
container bytes. The decoder: container bytes -> codec `decode` -> `Raster`.
Lossless fidelity = byte-exact equality of the **decoded input raster** (the
front-end output) and the codec output raster. The front-end never touches the
bitstream CRC/crypto path.

---

## 8. Public CLI (`cli/main.cpp`)

```
prism enc <in> <out.prism> [--effort N] [--w H --h W --bd B (raw only)]
prism dec <in.prism> <out.ppm>        # canonical PPM emission
prism bench --effort N --kodak DIR     # run_kodak protocol, writes CSV
prism fuzz                            # fuzz_gate: randomized round-trip + corruption
```

Exit codes: 0 ok, 1 decode/integrity error (corruption rejected), 2 usage.

---

## 9. Build order (Builder checklist, M0-first)

The Builder implements in this exact order; each step is a commit and must keep
the working tree green (unit + fuzz gate) before the next:

- [ ] **B0 Scaffolding:** CMake tree, `types.h`, `bitstream.h`, `crc32.h`,
      `Raster`, `prism.h` C API, `cli/main.cpp` skeleton, gtest wiring.
- [ ] **B1 rANS core (Stage E):** 32-bit rANS encode/decode + 4 binary models +
      efficiency gate unit test (H(p)+epsilon). No transforms yet.
- [ ] **B2 Color + prediction minimal (Stage C/P):** YCoCg-R + MED predictor +
      single global context, residual round-trip unit test.
- [ ] **B3 Container (Stage H):** exact header/model/payload/footer encode+decode
      with CRC32 gates; `prism enc/dec` works end-to-end on a PPM.
- [ ] **B4 Fuzz gate (M0 blocker):** `fuzz_gate.cpp` + `fuzz_gate.sh`: randomized
      1x1..64x64 images, all channel counts, 8/16-bit, efforts 0/4/7 round-trip
      exact; byte-flip corruption rejected. **M0 met = this passes.**
- [ ] **B5 Predictor bank + residual-DIFF context (M1):** P0..P7 + weighted LS +
      JPEG-LS residual-DIFF context; benchmark clears PNG (13.05) + WebP (9.61).
- [ ] **B6 CFL + 5/3 lifting (M2):** reversible decorrelation search; clears
      JPEG-LS (9.71).
- [ ] **B7 Squeeze + MA-tree coupled (M3, the crux):** CDC post-order + MA-tree
      with `llc_class` + `sibling_class` features; clears JPEG XL (8.71). This is
      the owner goal; must not repeat Obsidian R11-A (Squeeze without the context
      model is inert).
- [ ] **B8 CM + LZP high-effort (M4 stretch):** never-expand safety net; target
      < 8.0.
- [ ] **B9 Front-end completeness:** WebP/TIFF decoders (CMake options), ICC
      linearization; full format matrix in fuzz gate.

At every step the Builder runs `prism fuzz` and (where applicable) `prism bench`
and commits the dated CSV row to `prism/benchmarks/results/`. Owner override: no
merge until M0 + M1 + M2 + M3 are met bit-exactly on real Kodak.

---

## 10. Complexity & memory budget (carried from spec)

- Encode: O(pixels * L) squeeze + O(pixels) predict + O(pixels * E) analysis
  (E=effort, MA-tree build capped at K leaves / depth D so amortized O(pixels)).
- Decode: O(pixels * L) + O(pixels) predict + O(pixels) entropy, single pass.
- Memory: O(K) model state + one plane buffer per active Squeeze level.
- Speed guard (Obsidian R11-A lesson): any single-image encode > 5x the prior
  best at the same effort is flagged in `aggregate.py`.

- the Architect
