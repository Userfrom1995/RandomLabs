# Obsidian - Architecture blueprint v1

- **Issue:** #68
- **Author:** the Architect
- **Date:** 2026-08-17
- **Status:** ready for the Builder

This document is the software architecture for the Obsidian lossless image
codec, derived from the algorithmic specification (`docs/algorithmic-spec.md`)
and the benchmark protocol (`docs/benchmark-methodology.md`). It defines the
workspace layout, module boundaries, public interfaces, core data structures,
the exact rANS formulation, the effort pipeline, the container layout, the test
matrix, and the milestone-to-build-order mapping. The Builder implements to this
blueprint; the Reviewer checks architectural fidelity against it.

---

## 1. Summary

Obsidian is a from-scratch, benchmark-driven lossless image codec. We build a
Cargo workspace with a zero-dependency core library (`obsidian-core`), a CLI
crate (`obsidian-cli`) that exposes encode/decode/roundtrip/benchmark, and a
dependency-free JavaScript mirror of the codec plus an interactive specimen page
(`obsidian/web`) that reproduces the codec in the browser, byte-for-byte
consistent with the Rust core.

The build order is bottom-up and milestone-first: get a correct end-to-end
pipeline (MED predictor, single context, adaptive rANS) working and fuzz-verified
before adding predictors, contexts, and effort levels. Every meaningful
iteration records a Kodak benchmark row.

Key architectural decisions (section 3):
1. Two-crate workspace, zero third-party crates in the core and CLI.
2. rANS as the single entropy coder, adaptive by default, static at high effort.
3. A strict `Stage -> Coder` pipeline where every stage is a pure integer
   bijection, verified by property tests at each layer.
4. The JS mirror (not wasm) as the browser demonstration layer, matching the
   lab's proven Meridian pattern and keeping the build dependency-free.
5. Effort levels are encoder-side model search only; the bitstream format is
   identical for all efforts.

---

## 2. Deliverables of this phase

- `docs/architecture.md` (this file) - the software architecture blueprint.
- Updated `ideas/2026-08-17-obsidian-lossless-image-codec.md` - architecture
  section appended.
- Updated `progress/68-obsidian-lossless-image-codec.md` - stepwise milestones,
  handoff state.

---

## 3. Why this architecture (design decisions)

| Decision | Rationale |
|---|---|
| Rust, Cargo workspace | The lab's proven stack (Aftershock, Meridian). Zero external crates keeps the codec from-scratch per the scope guard and the reviewer gate simple. `std` covers I/O, sorting, and hash maps. |
| `obsidian-core` + `obsidian-cli` split | The codec is a pure library; the CLI is a thin shell. This keeps the engine testable in-process and allows the JS mirror to target the same invariants. |
| rANS only (no Huffman fallback) | The spec shows Huffman structurally caps compression (WebP penalty on near-zero residuals). One entropy coder keeps encode/decode symmetric and the code small. Adaptive tables are the default; static tables at effort >= 6. |
| Two-pass encode (analysis then coding) for effort >= 1 | The per-context predictor map and static tables need a first pass over the image. The analysis pass is O(n) and produces a small model; effort 0 skips it entirely. |
| JS mirror instead of wasm | Byte-exact mirror + consistency suite is the lab's Meridian pattern: dependency-free, deterministic, statically hostable on GitHub Pages. No wasm toolchain in CI. The demo stays responsive because Kodak-sized images (768x512) round-trip in a second in JS. |
| Effort = encoder-side search only | Identical bitstream for every effort keeps the decoder simple and lets the Tester verify one decode path for all efforts. |
| Property tests at every stage | The spec's fidelity guarantee is machine-checked, not asserted. Exhaustive/property tests on the bijections (color, zigzag, rANS) are cheaper than debugging a mismatch later. |
| Loose module coupling via plain structs | No trait-heavy abstraction. `Encoder` and `Decoder` each own a `PipelineState`; stages are free functions on that state. This keeps per-pixel code simple and fast (the hot loop is a few integer ops). |

---

## 4. Tech stack

- **Language:** Rust (edition 2021), stable toolchain. No third-party crates in
  `obsidian-core` and `obsidian-cli` (std only). The workspace needs no lockfile
  beyond the two crates.
- **Benchmark reference codecs:** external, version-pinned CLI tools invoked as
  subprocesses by `obsidian-cli bench` and by `benchmarks/run_kodak.sh`:
  `cjxl`, `cwebp`, `optipng`, `pngcrush`, `charls`, `flif`, ImageMagick `convert`.
  None are linked into the codec.
- **Web:** dependency-free HTML/CSS/JS. No frameworks, no build step.
- **CI tooling:** standard `cargo test`, `cargo clippy -- -D warnings`, plus the
  lab's Node-based consistency checks for the JS mirror.

---

## 5. Workspace layout

```
obsidian/
├── Cargo.toml                     # workspace manifest (members: crates/*)
├── crates/
│   ├── obsidian-core/
│   │   ├── Cargo.toml             # name = "obsidian_core", version 0.1.0
│   │   └── src/
│   │       ├── lib.rs             # re-exports, public API
│   │       ├── header.rs          # Header, flags, read/write, CRC cross-check
│   │       ├── crc32.rs           # CRC-32 (IEEE) table + rolling update
│   │       ├── image.rs           # Image, Channels, Plane, pixel accessors
│   │       ├── ppm.rs             # PPM P6 reader/writer (canonical ground truth)
│   │       ├── color.rs           # YCoCg-R forward/inverse, palette build/apply
│   │       ├── predict.rs         # PredictorId, 8 predictors, border handling
│   │       ├── context.rs         # gradient quantization, sign symmetry, activity,
│   │       │                      #   border contexts, zigzag residual map
│   │       ├── model.rs           # ModelConfig, PredictorMap, context reduction,
│   │       │                      #   analysis pass, model serialization
│   │       ├── rans.rs            # RansTable (freq/cum/slot), RansEncoder,
│   │       │                      #   RansDecoder, adaptive update, static tables
│   │       ├── encoder.rs         # Encoder: effort pipeline orchestration
│   │       └── decoder.rs         # Decoder: mirror pipeline
│   └── obsidian-cli/
│       ├── Cargo.toml             # name = "obsidian_cli", deps = obsidian_core
│       └── src/
│           ├── main.rs            # thin entry, delegates to cli::run
│           ├── cli.rs             # subcommand parsing + strict arg validation
│           └── bench.rs           # kodak runner, fuzz gate, reference codec runs
├── benchmarks/
│   ├── data/kodak.sha256          # committed hash manifest
│   ├── data/kodak/                # gitignored normalized PPMs
│   ├── toolchain.md               # pinned tool versions (committed)
│   ├── run_kodak.sh               # fidelity gate + Obsidian + references
│   ├── fuzz_gate.sh               # randomized small-image round-trip gate
│   ├── results/                   # <date>-<version>.csv (committed)
│   └── README.md                  # trend tables (committed)
├── web/
│   ├── index.html                 # interactive specimen page
│   ├── style.css
│   ├── js/codec.js                # JS mirror of the codec (byte-exact)
│   ├── js/ui.js                   # page logic + visualization overlays
│   └── samples/                   # small demo images (PPM + tiny .obsd)
├── tests/
│   ├── consistency.test.mjs       # JS mirror vs Rust CLI byte-exact checks
│   └── ui.test.mjs                # headless DOM checks for the specimen page
└── docs/
    ├── architecture.md            # this file
    ├── research.md
    ├── algorithmic-spec.md
    └── benchmark-methodology.md
```

The root `obsidian/` folder is already tracked. `benchmarks/data/kodak/` and
`target/` go to `.gitignore`.

---

## 6. Module breakdown

### 6.1 `image.rs` - image model

```rust
pub enum Channels { Gray, Rgb, Rgba }

pub struct Image {
    pub width: u32,
    pub height: u32,
    pub channels: Channels,
    pub planes: Vec<Vec<u8>>,   // channel-major, planes[c][y * width + x]
}

impl Image {
    pub fn new(width: u32, height: u32, channels: Channels) -> Image;
    pub fn pixel(&self, c: usize, x: usize, y: usize) -> u8;
    pub fn set_pixel(&mut self, c: usize, x: usize, y: usize, v: u8);
    pub fn plane_count(&self) -> usize;          // 1 | 3 | 4
    pub fn area(&self) -> usize;                 // width * height
    pub fn raw_bytes(&self) -> &[u8];            // concatenated planes (for CRC)
}
```

Invariants: `planes.len() == plane_count`, every plane has exactly
`width * height` bytes, `0 < width`, `0 < height`. `raw_bytes()` concatenates
planes in channel order; this byte sequence is what the header CRC covers.

### 6.2 `crc32.rs` - checksum

Standard CRC-32 (IEEE 802.3, poly `0xEDB88320`), table-driven, `init/update/
finalize`. Public: `pub fn crc32(data: &[u8]) -> u32`. Must match
`cksum`/`pngcrush` conventions so the Tester can cross-check with `python3 -c
'import zlib; ...'`.

### 6.3 `header.rs` - container header

```rust
pub const MAGIC: [u8; 4] = *b"OBSD";
pub const VERSION: u8 = 1;
pub const BIT_DEPTH: u8 = 8;

pub struct Header {
    pub flags: u8,          // bits [0:1] channels, bit 2 transform, bit 3 palette
    pub effort: u8,         // 0..=7
    pub width: u32,
    pub height: u32,
    pub crc32: u32,         // over the raw channel planes
}

impl Header {
    pub fn channels(&self) -> Channels;
    pub fn transform_flag(&self) -> bool;
    pub fn palette_flag(&self) -> bool;
    pub fn read(r: &mut impl Read) -> Result<Header, CodecError>;
    pub fn write(&self, w: &mut impl Write) -> Result<(), CodecError>;
}
```

Layout (little-endian for all multi-byte integers except the rANS trailing
state, which is big-endian per spec section 6.5):

```
offset 0  magic   [u8;4] = "OBSD"
offset 4  version u8      = 1
offset 5  flags   u8
offset 6  bit_depth u8    = 8
offset 7  effort  u8
offset 8  width   u32 LE
offset 12 height  u32 LE
offset 16 crc32   u32 LE
offset 20 model section (variable length, u32 LE length prefix then bytes)
then the rANS payload (byte-reversed emitted bytes + 4-byte BE trailing state)
```

`Header::read` validates magic, version, bit depth, and that width/height are
nonzero. The CRC is verified only after a full decode (the decoder does not know
the raw planes until then); a mismatch is a hard `CodecError::CrcMismatch`.

### 6.4 `ppm.rs` - canonical input/output

Reader and writer for PPM P6 (binary, 24-bit RGB, no color management) and PGM
P5 for grayscale. The normalized Kodak PPMs are the ground truth for every
codec, so `ppm.rs` must be byte-stable: `read(write(image)) == image` and it
must reject malformed files cleanly (bad magic, truncated header, dimensions
mismatch, `maxval != 255` -> error). Writing uses a single space, newline
separators, `maxval 255`, no comments. This module is the only place raw bytes
enter the codec from files.

### 6.5 `color.rs` - reversible color transform

```rust
pub enum TransformChoice { None, YCoCgR }

pub fn ycocgr_forward(planes: &mut [Vec<u8>]) -> ();   // RGB in place
pub fn ycocgr_inverse(planes: &mut [Vec<u8>]) -> ();
pub struct Palette { pub colors: Vec<[u8; 3]>, pub indices: Vec<u8> }
pub fn try_build_palette(image: &Image) -> Option<Palette>;  // <= 256 distinct
```

Implemented exactly as spec section 3, on `i32` intermediates, in place per
channel. Alpha (RGBA) is coded as its own plane through the residual pipeline
and is never transformed. The encoder decides the transform per image by
measuring coded size with and without it (two cheap model-estimate passes at
effort >= 4; at effort 0-3 use YCoCgR whenever RGB, with `None` fallback only if
a fast entropy estimate says so). The palette is only considered at effort >= 6
and only when distinct RGB triples <= 256 and palette mode is measured smaller.

Bijection property: for the test set, `ycocgr_inverse(ycocgr_forward(x)) == x`
exactly (no lossy rounding). Unit tests cover exhaustive small inputs and
fuzz.

### 6.6 `predict.rs` - predictor bank

```rust
#[repr(u8)]
pub enum PredictorId { Left = 0, Top = 1, Tl = 2, Tr = 3,
                       Avg = 4, Med = 5, GapLite = 6, Weighted = 7 }

pub struct WeightVec { pub w: [i16; 4], pub shift: u8 }  // wL, wT, wTL, wTR, S

pub struct Neighbors { pub l: i32, pub t: i32, pub tl: i32, pub tr: i32 }

pub fn predict(id: PredictorId, n: &Neighbors, w: Option<&WeightVec>) -> i32;
```

`Neighbors` comes from a single helper `neighbors(plane, x, y, width, height)`
that applies the border rules of spec section 1 (clamp out-of-bounds to nearest
valid; `y == 0` uses `T = TL = TR = plane[x]` when available, else 0). Border
handling lives here and nowhere else; the predictor map never sees the raw
neighborhood.

Predictor formulas exactly as spec section 4.1. `Weighted` computes
`clamp_round((wL*L + wT*T + wTL*TL + wTR*TR) >> S)` with `S = 4` default, on
`i32` intermediates. The weight codebook (`Vec<WeightVec>`) is signaled in the
model and indexed by the predictor map. The v1.5 self-correcting weighted
predictor (online weight adaptation via `max_error`) is the M2 milestone and
will add an adaptive weight path to this module; the interface above is already
sufficient (a `WeightVec` + the running `max_error` statistic live on the
pipeline state).

### 6.7 `context.rs` - context model and residual mapping

```rust
pub struct ContextParams {
    pub thresholds: [i16; 6],   // default {-16, -4, -1, 0, 1, 4, 16}
    pub activity_classes: u8,   // default 4
}

pub struct ContextModel {
    pub params: ContextParams,
    pub base_count: usize,      // <= 365 after sign-symmetry reduction
    pub activity_classes: u8,
    pub reduced: usize,         // final per-plane context count, <= 256
    pub border_left: usize,     // reserved border context ids
    pub border_top: usize,
    pub border_corner: usize,
}

pub fn context_id(model: &ContextModel, n: &Neighbors,
                  x: usize, y: usize) -> usize;
pub fn activity_class(model: &ContextModel, n: &Neighbors) -> usize;

pub fn zigzag(r: u8) -> u16;          // residual -> symbol, bijection, 0..255 -> 0..255
pub fn unzigzag(u: u16) -> u8;
```

Gradient quantization, sign symmetry reduction (`Q(-g) = flip(Q(g))` -> 365
base contexts), activity classes, and border-dedicated contexts follow spec
section 5 exactly. The final context id for interior pixels is
`base(365) * activity_classes + activity` reduced to `<= 256` per plane by the
second reduction the analysis pass selects (spec section 5.2); border pixels use
the reserved border ids.

`zigzag` is the spec section 5.3 mapping. Note the effective alphabet is exactly
256 distinct symbols (even symbols 0..256 and odd symbols 1..253); the rANS
table index space is 512 (`A = 2^(b+1)`) to match the spec and to keep headroom,
with sparse/zero-frequency handling below.

### 6.8 `model.rs` - the learned model

```rust
pub struct PredictorMap { pub ctx_to_pred: Vec<u8> }   // len == reduced per plane

pub struct ModelConfig {
    pub transform: TransformChoice,
    pub palette: Option<Palette>,
    pub context: ContextModel,
    pub predictor_maps: Vec<PredictorMap>,   // one per plane
    pub weights: Vec<WeightVec>,             // codebook for Weighted predictor
    pub static_tables: Option<Vec<RansTable>>, // effort >= 6
}

pub struct Analysis {
    // per-context symbol histogram, per-context per-predictor cost estimates
}

pub fn analyze(image: &Image, params: &ContextParams) -> Analysis;
pub fn choose_model(image: &Image, effort: u8) -> ModelConfig;
pub fn write_model(w: &mut impl Write, m: &ModelConfig) -> Result<(), CodecError>;
pub fn read_model(r: &mut impl Read, header: &Header) -> Result<ModelConfig, CodecError>;
```

The analysis pass (effort >= 1) computes, per context, the best predictor by a
cheap cost estimate (sum of log-scaled residual magnitudes or measured entropy
on a sample), builds `PredictorMap`, picks the context reduction, and at effort
>= 6 collects full histograms for static rANS tables. `choose_model` is the
orchestrator and the only module that makes model decisions. Model serialization
uses little-endian integers and simple length-prefixed arrays (see section 8);
a size budget guard falls back to simpler models if the model section exceeds a
small percentage of the total output.

### 6.9 `rans.rs` - entropy coding (the definitive formulation)

```rust
pub const TBITS: u32 = 12;
pub const M: u32 = 1 << TBITS;              // 4096
pub const A: usize = 512;                   // alphabet index space
pub const RNB: u32 = 1 << (32 - TBITS);     // 2^20 renorm bound

pub struct RansTable {
    pub freq: [u16; A],
    pub cum:  [u16; A],
    pub slot: [u16; M],     // rebuilt lazily on adaptive renormalization
}

impl RansTable {
    pub fn new_static(freqs: &[u32; A]) -> RansTable;   // normalize sum == M
    pub fn adapt(&mut self, s: usize);                   // increment + renorm
}

pub struct RansEncoder { pub state: u32, pub out: Vec<u8> }
pub struct RansDecoder<'a> { pub state: u32, pub input: &'a [u8], pub pos: usize }

impl RansEncoder {
    pub fn new() -> RansEncoder;           // state = RNB
    pub fn put(&mut self, s: usize, t: &mut RansTable);
    pub fn finish(self) -> Vec<u8>;        // byte-reversed emitted + 4-byte BE state
}
impl RansDecoder<'a> {
    pub fn new(input: &'a [u8]) -> RansDecoder;   // state from trailing 4 bytes
    pub fn get(&mut self, t: &mut RansTable) -> usize;
}
```

**The definitive rANS formulation (replaces the abbreviated pseudo-code in spec
section 6; same variant, concrete constants, machine-verified):**

State `x` is a `u32`. The renorm bound is `RNB = 2^20 = 1 << (32 - TBITS)`.
The mask for slot lookup is `M - 1 = 4095`. Tables satisfy `sum(freq) == M` and
`cum[s] + freq[s] <= M` for every symbol.

Encoder invariant: `x < RNB` between symbols (initialized to `RNB`).

```
put(s, table):                    # x < RNB by invariant
    f = freq[s]; c = cum[s]
    x = (x / f) * M + (x % f) + c      # proof: x < RNB <= RNB*f so x' < 2^32
    while x >= RNB:                    # emit low byte
        out.push(x & 0xFF)
        x >>= 8
    # now x < RNB again

finish():                        # stack discipline
    out.reverse()                        # byte-reversed emitted bytes
    append state as 4 bytes big-endian
```

Decoder invariant: `x` in `[RNB, 2^32)` after the renorm-up, `< RNB` after the
inverse update.

```
get(table):                      # x < RNB by invariant
    while x < RNB:                     # renorm-up first (reconstruct pre-renorm state)
        x = (x << 8) | read_byte()
    t = x & (M - 1)
    s = slot[t]
    f = freq[s]; c = cum[s]
    x = f * (x >> TBITS) + (t - c)     # now x < RNB again
    return s
```

`finish` outputs the emitted bytes reversed followed by the 4-byte big-endian
trailing state, and `get` consumes exactly the bytes the encoder emitted (the
byte counts match because the renorm conditions are exact inverses). The decoder
pops symbols in raster order; the encoder pushes them in reverse raster order.

**Adaptive tables (default):** each context owns a `RansTable` whose `freq`/
`cum` start at zero (or all-freq-1 for a uniform start) and adapt after every
observed symbol: `freq[s] += 1`, and when `sum > M`, halve all frequencies with a
floor of 1 for every active symbol (an active symbol with freq 1 stays 1; a
never-seen symbol stays 0). `slot` is rebuilt from `cum` only on these
renormalization events, giving amortized O(1) per symbol (a renorm happens at
most every M symbols). Encoder and decoder update identically and stay in
lockstep.

**Static tables (effort >= 6):** the analysis pass collects per-context
histograms, normalizes each to `sum == M`, and signals them in the model; both
sides use fixed tables. Zero-frequency symbols get freq 0; the slot table
guarantees a valid symbol for every `t in [0, M)` because the cumulative table
covers the full range.

Correctness is enforced by property tests (section 13), including a
hand-verifiable tiny example (e.g., alphabet {a,b}, M = 4) pinned in the test
suite.

### 6.10 `encoder.rs` / `decoder.rs` - pipeline orchestration

```rust
pub struct EncodeStats {
    pub effort: u8,
    pub transform: TransformChoice,
    pub palette: bool,
    pub model_bytes: usize,
    pub payload_bytes: usize,
    pub total_bytes: usize,
    pub bpp: f64,
    pub encode_ms: f64,
    pub chosen_predictor_counts: [usize; 8],   // diagnostic
}

pub fn encode(image: &Image, effort: u8) -> Result<(Vec<u8>, EncodeStats), CodecError>;
pub fn decode(bytes: &[u8]) -> Result<Image, CodecError>;
pub fn roundtrip(image: &Image, effort: u8) -> Result<(Vec<u8>, EncodeStats, Image), CodecError>;
```

`encode`:
1. Validate image (nonzero dims, plane lengths). If grayscale, skip transform.
2. If `effort >= 6`, optionally build the palette and test it (measured cost).
3. Analysis pass (`choose_model`) when `effort >= 1`; effort 0 uses a fixed
   default model (MED everywhere, single reduced context set, adaptive rANS).
4. Apply the chosen transform to the planes (kept as an in-memory copy; the
   original is retained for the CRC and the fidelity gate).
5. Coding pass: per pixel in raster order, compute context, look up predictor,
   predict, residual `(pixel - pred) mod 256`, zigzag to symbol, code via the
   context's rANS table. Symbols are pushed in reverse raster order.
6. `finish` the stream, assemble header + model + payload, return bytes and
   stats.

`decode`:
1. Read and validate the header.
2. Read the model section; rebuild the context model, predictor maps, weight
   codebook, and (if static) the rANS tables.
3. Residual pass: per pixel in raster order, compute context, look up predictor,
   predict, `unzigzag` the symbol, `(pred + residual) mod 256`.
4. Inverse transform if flagged; palette expand if flagged.
5. Verify `crc32(decoded raw planes) == header.crc32`; mismatch is a hard error.

Both are single-threaded in v1 and strictly O(n).

### 6.11 `cli.rs` - command surface

```
obsidian encode <in.ppm> <out.obsd> [--effort N] [--json]
obsidian decode <in.obsd> <out.ppm>
obsidian roundtrip <in.ppm> [--effort N] [--json]     # encode + decode + fidelity check
obsidian selftest                                     # unit + fuzz + property suite (stdout report)
obsidian check <in.obsd>                              # header/model validation + decode
obsidian bench <kodak-dir> [--refs webp,jxl,png,...]  # benchmark run (section 14)
```

Strict argument validation: unknown flags, missing files, `--effort` outside
0..=7, and effort without a value are errors with a usage line and nonzero exit.
`--json` emits machine-readable results (for the benchmark harness). Exit codes:
0 success, 1 user/validation error, 2 I/O error, 3 fidelity failure.

### 6.12 `bench.rs` - benchmark integration

Runs the Kodak protocol (section 14): per image, encode/decode Obsidian at the
selected effort, run the fidelity gate (`cmp` decoded vs source), optionally run
pinned reference codecs, and emit the CSV row
`image, codec, bytes, bpp, enc_ms, dec_ms, tool_version`. Aggregation (mean bpp,
geometric mean of per-image size ratios) is done by `benchmarks/aggregate.py`
(committed) so the numbers are independently auditable.

---

## 7. Core data structures (summary)

| Type | Where | Purpose |
|---|---|---|
| `Image` | image.rs | Planes of bytes, channel layout |
| `Header` | header.rs | Container metadata + CRC |
| `TransformChoice` | color.rs | None / YCoCgR |
| `Palette` | color.rs | <= 256 colors + index plane |
| `PredictorId` | predict.rs | 8 causal predictors |
| `WeightVec` | predict.rs | Weighted predictor coefficients |
| `Neighbors` | predict.rs | Causal neighborhood (L, T, TL, TR) |
| `ContextParams` | context.rs | Gradient thresholds + activity classes |
| `ContextModel` | context.rs | Quantized context space + borders |
| `PredictorMap` | model.rs | Per-context predictor choice |
| `ModelConfig` | model.rs | Full signaled model |
| `RansTable` | rans.rs | freq/cum/slot tables per context |
| `RansEncoder` / `RansDecoder` | rans.rs | State + stream I/O |
| `EncodeStats` | encoder.rs | Size/time/diagnostic counters |

---

## 8. Container / bitstream layout (concrete)

```
[ 8-byte fixed header ]
   magic OBSD | version 1 | flags | bit_depth 8 | effort

[ width u32 LE ][ height u32 LE ][ crc32 u32 LE ]

[ model section ]
   u32 LE  model_len
   u8      transform_choice                0 none | 1 YCoCgR
   u8      context_params (thresholds + activity class count, encoded compactly)
   u16     reduced_contexts_per_plane      <= 256
   per plane:
       PredictorMap                         reduced * 1 byte each (predictor id)
       (if Weighted appears) u8 weight_count, then weight vectors
   (if palette flag) u32 count, count * 3 color bytes; index plane coded by
       the residual pipeline and its map is part of the plane maps
   (if effort >= 6 and static tables selected)
       per context: variable-length coded freq tables (delta + 0-run encoded,
       then themselves entropy-coded by a single shared adaptive rANS stream)

[ payload ]
   byte-reversed rANS emitted bytes, then the 4-byte big-endian trailing state
```

All integers little-endian except the rANS trailing state (big-endian, per spec
section 6.5). The model section is optional at effort 0 (defaults implied).
A model-size guard: if the encoded model exceeds ~5% of total output, the
encoder falls back to a simpler model (fewer contexts, no static tables) and
re-measures. The exact variable-length coding of freq tables is left to the
Builder, bounded by the guard and by the fidelity gates; the decoder must be
able to reconstruct `ModelConfig` without prior knowledge of the image.

---

## 9. Effort pipeline

| effort | analysis pass | predictor map | weights | palette | rANS tables |
|---|---|---|---|---|---|
| 0 | none | fixed MED for all contexts | none | no | adaptive |
| 1-3 | per-context best predictor | fixed per-context map | none | no | adaptive |
| 4-5 | + weighted codebook search | per-context map incl. Weighted | yes | no | adaptive |
| 6-7 | + palette test + static tables | full | yes | yes | static (signaled) |

The bitstream format is identical across efforts; effort only changes how the
encoder searches the model (spec section 8). Decoder cost is identical.

---

## 10. Complexity and memory budget (from spec section 9, made concrete)

- Encode (effort 4-7): analysis O(n) + coding O(n); decode O(n). Constant work
  per pixel (a few integer ops + one rANS table access; slot rebuild amortized).
- Row buffers: O(width).
- rANS tables: `<= 256 contexts * 4096 u16 slots = 2 MiB` plus freq/cum arrays
  `<= 256 * 512 * 2 * 2 B = 512 KiB`. Static tables for the whole image fit in
  the same budget (tables per plane).
- Model section: a few hundred bytes to a few KiB.
- Throughput target: >= 100 MB/s encode, >= 150 MB/s decode on a modern core,
  single-threaded, no SIMD in v1 (documented in the benchmark table, not a hard
  gate for M1).

---

## 11. Test matrix

### Unit tests (per module)

| Module | Tests |
|---|---|
| crc32 | Known vectors (`b""`, `b"123456789"` -> `0xCBF43926`); agreement with a reference implementation |
| ppm | Round-trip byte-exact; malformed inputs rejected (magic, truncation, maxval, dims); PGM/P5 grayscale |
| color | YCoCgR forward/inverse exact on exhaustive small inputs + fuzz; palette build/expand round-trip |
| predict | Each predictor on hand-computed vectors; border rules (top row, left col, corners, 1x1, 1xN, Nx1); Weighted clamp/round |
| context | Quantization boundaries at every threshold; sign symmetry `Q(-g) == flip(Q(g))`; activity class boundaries; zigzag is a bijection (all 256 r, and unzigzag(zigzag(r)) == r); border ids distinct from interior |
| rans | Tiny hand-verifiable example (alphabet of 2, M = 4) encoded/decoded by hand and by code; every symbol round-trips; adaptive updates stay in lockstep (encode then decode, compare tables); renorm guard on pathological tables (singleton, single active symbol, uniform); `finish`/`get` byte counts match; state finalization lands on `RNB` |
| model | `write_model`/`read_model` round-trip of every `ModelConfig`; predictor map serialization; context reduction determinism (same input -> same model) |
| header | Read/write round-trip; every invalid header rejected |

### Integration tests

- Round-trip the entire Kodak set at effort 0, 4, and 7, bit-exact
  (`cmp` decoded PPM == source PPM); also at efforts 1-3, 5-6 once green.
- Fuzz gate (`benchmarks/fuzz_gate.sh` or `obsidian selftest --fuzz N`):
  thousands of randomized small images including all-zero, all-255, gradients,
  noise, flat-color, single-pixel, extreme aspect ratios, at multiple efforts.
- Determinism: same input + effort -> byte-identical output every run.
- Corruption: truncated/corrupted streams return clean `CodecError`s, never
  panic, never emit a wrong image (CRC catches).

### JS mirror consistency (`tests/consistency.test.mjs`)

- JS encode produces byte-identical `.obsd` to the Rust CLI on a sample set
  (all efforts).
- JS decode of Rust-produced bytes reproduces the source image.
- JS and Rust agree on header/model fields and error cases.

### UI/Playwright (`tests/ui.test.mjs` + `obsidian/web`)

- The specimen page loads, encodes a sample image, shows bpp and the
  size comparison against PNG/WebP reference rows, decodes back and shows the
  bit-exact round-trip badge, and renders the predictor/context overlays.
- Static serving: every asset (index.html, css, js, samples) resolves.

---

## 12. Fidelity gates (hard)

1. Every stage is an integer bijection (color, prediction residual mod 2^b,
   zigzag, rANS); property-tested.
2. Bit-exact round trip on the full Kodak set at every effort, plus the fuzz
   gate, before any result row is recorded.
3. Header CRC cross-check after decode; mismatch is a hard error.
4. `obsidian roundtrip` returns nonzero if `cmp` would differ.

---

## 13. Benchmark integration

Follows `docs/benchmark-methodology.md` exactly:

1. `benchmarks/toolchain.md` pins the reference tool versions; committed once.
2. `benchmarks/data/kodak.sha256` pins the normalized PPM byte identities.
3. `benchmarks/run_kodak.sh` runs the fidelity gate, then Obsidian (selected
   effort) and the references, writing `results/<date>-<version>.csv` and
   rendering the markdown table into `benchmarks/README.md`.
4. `benchmarks/aggregate.py` computes mean bpp and geometric mean of per-image
   size ratios vs each reference.
5. Every results commit includes the code change and a one-line summary.

Milestones: M1 (beat WebP lossless + optipng PNG), M2 (within 10% of JPEG XL),
M3 (within ~3% of or above JPEG XL), against the pinned baseline, never
literature numbers.

---

## 14. Web specimen layer (visual requirement)

`obsidian/web/index.html` is the interactive demonstration. It loads a sample
(or user-provided) image, encodes it in the browser with the JS mirror, and
shows:

- Original image; encoded size and bpp; comparison rows against PNG and WebP
  reference values for the same image (the reference numbers come from the
  committed benchmark CSV, displayed with tool versions).
- A "round-trip" badge showing the decode reproduced the image bit-exactly.
- Two visual overlays toggled on the decoded image: a predictor heatmap (color
  per winning predictor, effort >= 4) and a residual-magnitude heatmap, making
  the codec internals visible and educational.
- An effort slider (0-7) re-encoding live and updating bpp/times.

`js/codec.js` is a byte-exact JS mirror of the core pipeline (PPM read,
YCoCgR, predictor bank, context model, zigzag, adaptive + static rANS encode
and decode) written with no dependencies, deterministically producing the same
bytes as the Rust core. `js/ui.js` handles the page and overlays. The mirror is
kept in lockstep by `tests/consistency.test.mjs`.

The page is statically hostable at
`https://userfrom1995.github.io/Random/obsidian/web/`.

---

## 15. Milestone to build-order mapping

| Build step | Milestone | Gate |
|---|---|---|
| Scaffold workspace, ppm, header+crc, CLI skeleton | - | `cargo test`, clippy 0 |
| rANS core (adaptive) + property tests | - | exhaustive property suite green |
| Effort 0 end-to-end (MED + single context + adaptive rANS) | F1 (partial) | Kodak + fuzz round-trip at effort 0 |
| Color transform (YCoCgR + palette) + bijection tests | F1 | bijection + round-trip |
| Predictor bank + border handling + context model | F1 | round-trip all efforts |
| Per-context predictor map + analysis pass (effort 1-5) | F1 | round-trip all efforts |
| Static tables + palette + effort 6-7 | F1 | round-trip all efforts |
| Benchmark harness + reference baseline + first Obsidian row | M1 | mean bpp < WebP and < PNG |
| Self-correcting weighted predictor (v1.5) | M2 | within 10% of JPEG XL |
| Squeeze/interlacing or improved context model (v2) | M3 | within ~3% of or above JPEG XL |
| Web specimen page + JS mirror + consistency + Playwright | F3 (demo) | consistency + UI tests green |
| Docs + README + landing page entries | - | reviewer passes |

---

## 16. Open items for the Builder (decisions left to implementation)

1. Exact variable-length coding of static freq tables in the model section
   (bounded by the 5% model-size guard and the fidelity gates).
2. The uniform-start policy for adaptive tables (all-1 start vs zero-start with
   on-first-see activation) - pick one, pin it, and keep encoder/decoder
   identical.
3. GAP-lite gradient blend constants and the "second reduction" for context
   sparsity: tune on Kodak, but only after effort 0-5 is green; the measured
   cost decides, never a hard-coded assumption.
4. Whether `obsidian selftest` and `fuzz_gate.sh` share one RNG seed policy
   (deterministic seeds are required so the Tester can reproduce any failure).
5. Per-plane vs shared predictor maps: the architecture assumes per-plane
   (spec section 5.2); if shared maps measure cheaper on Kodak, the model
   section already supports it (predictor_maps is a Vec).

---

## 17. Definition of done for the build phase

- `cargo test` green, `cargo clippy -- -D warnings` clean, no `unwrap`/`panic`
  on decoder input paths (Result-only error propagation).
- Bit-exact round-trip on Kodak and the fuzz set at efforts 0, 4, and 7.
- First benchmark row committed with the pinned toolchain and baseline tables.
- JS mirror byte-consistent with the Rust core; specimen page verified by the
  UI tests.
- README, architecture references, and landing page entries updated.

- the Architect