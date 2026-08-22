# Prism - Optimization Blueprint (M1-M4, Architect handoff for #103)

- **Issue:** #103 (owner directive 2026-08-21)
- **Role:** the Architect
- **Inputs:** `prism/docs/architecture.md` (contract + build order B0-B9),
  `prism/docs/algorithmic-spec.md`, `prism/docs/benchmark-methodology.md`,
  and the M0 codebase on `main` (merged via PR #104).
- **Mandate:** drive the benchmark loop from M0 (bit-exact, no bpp target) to
  M3 (< 8.71 summed bpp vs JPEG XL on real Kodak) and the M4 stretch (< 8.0).
- **This document is the binding contract for B5-B9.** It fixes the interface
  changes, the critical rANS/adaptive-context resolution, the Squeeze + MA-tree
  coupling, the color-stage widening for 16-bit, and the real-Kodak harness wiring.

The M0 contract already shipped: reversible YCoCg-R, true 32-bit rANS with a
FIXED per-bin model (LIFO-safe), PRSM container with `crc32_model`/`crc32_all`,
front-end, CLI, and the fuzz gate. The fixed model was a deliberate M0
simplification; M1 replaces it with causal adaptive models. This document
explains precisely how that is LIFO-safe so the Builder does not re-introduce
the desync the M0 comment warned about.

---

## 1. The rANS / adaptive-context resolution (the M0 blocker, now solved)

`rans.h` currently says a single running adaptive model cannot round-trip rANS
because "the decoder recovers bins in the reverse of the encode order." That
statement is true for a model keyed by *entropy-stream order*, but it does NOT
apply to a model keyed by a **causal spatial context**. This is the single most
important design point for M1, so it is stated precisely:

- rANS decodes bytes in reverse but **emits symbols in forward scan order**.
  After decoding residual `r[i]`, the decoder has already reconstructed
  `r[i-1]`, `r[i-w]`, `r[i-w-1]`, `r[i-w+1]` (the causal neighborhood). The
  encoder scans the same `i = 0..N-1` forward.
- Therefore any probability state that is updated **only from already-emitted
  spatial neighbors** (their values, signs, magnitudes) is computed in the
  *identical order* on both sides. The rANS LIFO only affects the byte packing,
  never the forward symbol/context sequence.
- Concretely: for each sample `i` in raster order, compute the context id
  `cx = tree.eval(feature_i)` (Stage X), index the per-context model
  `models[cx]`, code the bin, then update `models[cx]` with the WNC/CABS
  learning rule. Encoder and decoder replay this identically. **No desync.**

So M1's only change to the entropy path is: replace the single fixed
`RansModel` with a `std::vector<RansModel> models` sized `num_leaves`, plus a
per-context Rice shift `k[cx]` kept as an integer EMA of `|e|` (mirrored, costs
zero signaled bytes, already specified in architecture.md 4.3). The byte-level
rANS (ryg port) is unchanged.

### 1.1 New rANS interface (replaces `rans.h` planes API)

```cpp
namespace prism::codec {

// One 16-bit adaptive binary model (WNC/CABS). prob = P(1) * M, clamped to
// the open interval (MIN_PROB, M - MIN_PROB) so the coder stays H(p)+epsilon.
struct AdaptiveModel {
    uint16_t prob = 32768;
    inline void update(bool bit);           // WNC learning rate
};

// Per-leaf model bank. Indexed by MA-tree leaf_id (0..K-1). For bands that
// have no tree (single-leaf group), K=1 and index 0 is used.
struct ModelBank {
    std::vector<AdaptiveModel> sign;       // P(sign<0)
    std::vector<AdaptiveModel> zero;       // P(residual == 0)
    std::vector<AdaptiveModel> quotient;   // P(next Rice bit == 0)
    std::vector<std::vector<AdaptiveModel>> rem; // rem[cx][j] for j-th remainder bit
    std::vector<int8_t> k;                 // per-leaf Rice shift (EMA of |e|)
    size_t nctx() const { return sign.size(); }
};

// Encode one residual plane with a causal context model. `cx_of(i)` returns the
// leaf id for sample i (from the band's MA-tree, evaluated on its Feature).
void rans_encode_residuals(const std::vector<int32_t>& residuals,
                           const std::vector<uint16_t>& cx_of,
                           ModelBank& models, std::vector<uint8_t>& out);
void rans_decode_residuals(const std::vector<uint8_t>& in, size_t n,
                           const std::vector<uint16_t>& cx_of,
                           ModelBank& models, std::vector<int32_t>& out);

// Raw Bernoulli gate retained for the EfficiencyVsEntropy unit test (fixed prob).
std::vector<uint8_t> rans_encode_bits(const std::vector<uint8_t>&, uint16_t = 32768);
std::vector<uint8_t> rans_decode_bits(const std::vector<uint8_t>&, size_t, uint16_t = 32768);

}
```

The `EfficiencyVsEntropy` test (already passing at M0 with fixed prob) must be
extended: a *per-context* Bernoulli source coded through `ModelBank` must still
approach the sum of per-context entropies within epsilon. This guards the
adaptive path.

---

## 2. M1 - Predictor bank + residual-DIFF context (gate: < PNG 13.05, < WebP 9.61)

### 2.1 Weighted least-squares predictor (P8)

`predict.h` already enumerates `WEIGHTED = 8`. M1 fills it in: fit a 2-tap
(Left, Top) or 3-tap (Left, Top, TL) linear predictor to a local window of
recent residuals via recursive least squares (the JPEG-LS LOCO-I style or the
spec's weighted LS). Store the chosen coefficients implicitly: rather than
signaling 3 floats per context, signal a small integer weight index per
predictor-map leaf (the analysis pass picks the best of a quantized weight set
`{0, 1/4, 1/2, 3/4, 1}` blends). Keep it integer-only so decode is exact.

### 2.2 Residual-DIFF (JPEG-LS) context

The MA-tree `ResDiff` feature (id 3) needs a quantization of the local
gradient context. Implement the standard LOCO-I context:

```
dx = Ra - Rb;            // Ra=left residual, Rb=top residual (0 at borders)
sign = sign(dx);  mag = |dx|;
ctx = (mag <= 2) ? (sign>0 ? mag : mag+3) : (sign>0 ? 6 + min(mag,127)/4 : 12 + min(mag,127)/4);
```

Map this context to a `res_diff` bucket (<= 365 ids per the spec's
sign-symmetry table) used both as the MA-tree `ResDiff` test and, at M1 before
the tree is built, as the direct rANS `cx`. This alone closes most of the gap
to PNG/WebP on natural images.

### 2.3 Analyze changes (M1)

- `analyze()` selects `predictor_mode` and, for `mode=1`, fills
  `per_leaf_pred` with the best predictor per leaf (or per residual-DIFF bucket
  when the tree is still single-leaf).
- Keep `color_transform_id = 0` (None) at M1 unless the BD16 widening in M2
  lands first; the reversible YCoCg-R is verified lossless for BD8 and BD16-but-
  narrowed, so it may be enabled once M2 widening is in.

### 2.4 Acceptance

`prism bench --effort 1 --kodak <DIR>` must produce mean summed bpp < 13.05 and
< 9.61, with `cmp` byte-exact on every image. (Harness wiring is Section 6.)

---

## 3. M2 - CFL + 5/3 lifting + 16-bit widening (gate: < JPEG-LS 9.71)

### 3.1 Color-stage widening (required for correctness)

The M0 YCoCg-R is verified lossless on a dense 8-bit lattice and the BD16 *test
range*, but the transform intermediates (`Cg` reaches ~+/-98301 at BD16) exceed
`u16`. The `Raster` planes are `u16` (`types.h`), so M2 must widen the
color stage:

- Add `ColorStageBuffer`: a planar `std::vector<int32_t>` (one per channel)
  used only inside the color stage, then written back into the `Raster` `u16`
  planes after the modular wrap (`& ((1<<bd)-1)`). Inputs are read widened
  (`int32_t`) from the `u16` planes.
- This satisfies the architecture.md clause "widened to the largest needed
  intermediate" and makes YCoCg-R, subtract-green, CFL, and 5/3 lifting all
  exact at BD16.
- Replace the M0 `bias=512` specialization with the general widened path; keep
  the dense-lattice `Color.YCoCgRDenseRoundtrip` test and add a BD16 exhaustive
  seeded sweep (the test must fail loudly if any value loses info).

### 3.2 CFL (Chroma-from-Luma) and 5/3 lifting

- **CFL:** `chroma_pred = round(alpha * luma_neighborhood_avg)`; `cfl_scales`
  (already in the header as `u8` per chroma plane, range 0..7) selects `alpha`.
  The analyze pass searches scales 0..7 per chroma plane (and the CFL+ combination
  ids 4/5) and keeps the set minimizing residual entropy. Gated by the
  never-expand net.
- **5/3 lifting:** reversible integer wavelet (the JPEG 2000 lossless 5/3):
  `d_n = x_{2n+1} - floor((x_{2n}+x_{2n+2})/2)`,
  `s_n = x_{2n} + floor((d_{n-1}+d_n)/4)`. Apply horizontally then vertically.
  This is an *additional* decorrelation option the analyzer may pick per image;
  it composes with (not replaces) the YCoCg-R stage.

### 3.3 Acceptance

Mean bpp < 9.71 on real Kodak, byte-exact.

---

## 4. M3 - Squeeze + MA-tree coupled (the crux; gate: < JPEG XL 8.71)

This is the owner goal and the Obsidian R11-A lesson: **Squeeze alone is
inert; it must be coupled with the MA-tree context model that consumes
`llc_class` and `sibling_class`.** Both are mandatory and land together.

### 4.1 Squeeze (CDC) implementation

`squeeze.h` currently only supports `levels=0`. M3 implements the multi-level
JXL-style CDC:

- For `L = squeeze_levels[c]` (analyzed, per plane, capped by
  `max_squeeze_levels(w,h)`), repeatedly split each band into LL + H + V + D
  using the integer CDF 5/3 (or the simpler average/difference CDC; pick the one
  the analyzer shows beats the other on Kodak).
- Emit **post-order** exactly as architecture.md Section 5: a node's LL is
  emitted before its three HF children, recursively. `SqueezeResult::bands`
  already stores post-order with `band_class` (0=LL, 1=H, 2=V, 3=D, level in
  high bits).
- The decoder reconstructs bottom-up, so when it reaches an HF band the
  co-located LL samples are available for the CrossBand predictor (Stage P) and
  the `llc_class` / `sibling_class` MA-tree features. **This ordering is what
  makes Squeeze non-inert.**

### 4.2 MA-tree multi-leaf build (analyze)

`MATree` already supports multi-node pre-order serialization with implicit
child pairing. M3 fills the builder:

- **Greedy entropy split:** sample residuals of the band (stride-subsample for
  speed), pick the `PropId`/`threshold` that most reduces predicted coded length
  (using the `Feature` vector: `qg`, `band_class`, `llc_class`, `res_diff`,
  `sibling_class`, `activity`). Cap depth `D` (e.g. 6) and leaves `K` (e.g. 16-32
  per band-class group). Deterministic seed so encode/decode agree.
- Store `MATreeGroup { group_id, band_class, tree }`. `group_id` partitions
  bands by (plane, level tier); `band_class` lets one tree serve all bands of a
  class. The container already carries `num_trees` + per-tree `(group_id,
  band_class)` (architecture.md 3.2).
- `llc_class` (feature id 2) and `sibling_class` (id 4) are **mandatory
  whenever `squeeze_levels[c] > 0`**: the analyzer must include them in the
  candidate split set and the serializer must emit them. (Add an analyze-time
  assertion: if any plane has `levels>0`, at least one tree uses `LlcClass` or
  `SiblingClass`.) This is the explicit defense against the R11-A inertness bug.

### 4.3 Per-leaf predictor map + model bank

- The container's predictor map (architecture.md 3.2.3) already supports
  `predictor_mode=1` with `per_leaf_pred`. M3 fills it: `per_leaf_pred[leaf_id]`
  selects the predictor for samples routed to that leaf.
- The `ModelBank` (Section 1.1) is sized `num_leaves` across all trees and is
  reconstructed decoder-side purely from the serialized trees (no model bytes
  are signaled; the `k` EMA is mirrored). This keeps the model blob tiny.

### 4.4 Decode band-count guard (already fixed at M0)

`prism.cpp:99` already throws on `payloads.size() != expected`; keep it. With
Squeeze the expected count is `sum_c (1 + 3*squeeze_levels[c])`, asserted from
the header.

### 4.5 Acceptance

Mean bpp < 8.71 on **real** Kodak, byte-exact. This is the owner override gate;
no merge until met (Section 6 harness must be real, not synthetic).

---

## 5. M4 - CM + LZP high-effort (stretch: < 8.0, never-expand net)

- **CM (`cm.h`):** logistic mixer + SSE over neighbor residual models, enabled
  when `flags & 1` (effort >= 4). The mixer blends the per-leaf `sign/zero/
  quotient/rem` predictions of the causal neighborhood; SSE refines per
  `qg` bucket. Encoder re-encodes with and without CM and keeps the smaller
  file (never-expand net already specified in architecture.md 6).
- **LZP (`lzp.h`):** effort >= 7, scan the residual/value stream for matches,
  emit flag+run before rANS. Also behind the never-expand net.
- Both are opt-in and must never regress byte-exactness or bpp when disabled.

---

## 6. Real Kodak harness (cross-cutting, required before M3 merge)

The current `run_kodak.sh` skips the `cmp` and the synthetic CSV is a
placeholder. This is blocking per the owner override ("no merge until M3 on real
Kodak"). M1 lands the real harness:

1. **Provision once:** `prism/benchmarks/data/kodak/` holds the 24 Kodak images
   (kodim01..24, 768x512). Their SHA-256 are pinned in the existing
   `kodak.sha256`; `run_kodak.sh` verifies the pin and refuses to run if it
   mismatches (so the dataset is durable, the Obsidian lesson).
2. **Per-image loop:** `prism enc <img> <img>.prism --effort N` then
   `prism dec <img>.prism <img>.dec.ppm`, then `cmp <canonical-input-raster>
   <img>.dec.ppm` -> hard fail on any difference (byte-exact invariant).
3. **bpp:** `sum(bytes) * 8 / sum(pixels*channels)` using the summed convention
   (JXL = 8.71). Append one row to `prism/benchmarks/results/YYYY-MM-DD-eN.csv`:
   `date, effort, mean_bpp, png_met=13.05, webp_met=9.61, jpegls_met=9.71,
   jxl_met=8.71, pass=<bool>`.
4. **Gate script:** `fuzz_gate.sh` already exists; add `bench_gate.sh` that
   exits non-zero unless the milestone bpp target is met for the given effort.
   The Tester runs `bench_gate.sh --effort 4` (M3) before approving.
5. The synthetic `2026-08-21-m0-synthetic.csv` is deleted once real rows exist.

---

## 7. Build order (Builder checklist, M1-first; extends B0-B4)

Each step is a commit, keeps `prism fuzz` + the relevant `prism bench` gate
green, then advances:

- [ ] **B5 Predictor bank + residual-DIFF (M1):** `AdaptiveModel` + `ModelBank`,
      `rans_encode/residuals` with causal `cx_of`, weighted LS predictor,
      LOCO-I residual-DIFF context, extended `EfficiencyVsEntropy` test,
      analyze fills `per_leaf_pred`. Gate: < 13.05 / < 9.61.
- [ ] **B6 CFL + 5/3 + 16-bit widening (M2):** `ColorStageBuffer` int32 widening,
      CFL scales search, 5/3 lifting option, BD16 dense test. Gate: < 9.71.
- [ ] **B7 Squeeze + MA-tree coupled (M3):** CDC multi-level + post-order emit,
      greedy multi-leaf MA-tree build with mandatory `llc_class`/`sibling_class`
      when `levels>0`, per-leaf predictor map + model bank reconstruction.
      Gate: < 8.71 on **real** Kodak.
- [ ] **B8 CM + LZP (M4 stretch):** logistic mixer + SSE, LZP, never-expand net.
      Gate: < 8.0.
- [ ] **B9 Front-end completeness:** WebP/TIFF decoders (CMake options),
      ICC linearization, full format matrix in fuzz gate.
- [ ] **B10 Real Kodak harness:** provision + pin dataset, wire `cmp` + real CSV
      + `bench_gate.sh`. (Lands with B5 but is the M3 merge precondition.)

Owner override preserved: no merge of the M1-M4 work until M0+M1+M2+M3 are met
bit-exactly on real Kodak.

---

## 8. Risk notes

- **LIFO myth:** do not re-introduce "adaptive rANS desyncs." It only desyncs
  for stream-order models; causal spatial models are safe (Section 1). The M0
  fixed-prob was a simplification, not a permanent limit.
- **Inert Squeeze:** the mandatory `llc_class`/`sibling_class` assertion (4.2)
  is the explicit R11-A guard; never ship Squeeze without it.
- **Widening:** BD16 correctness depends entirely on the int32 color stage
  (3.1); the dense-lattice test must cover BD16 exhaustively enough to catch a
  regression.

- the Architect
