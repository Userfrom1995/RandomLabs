# Prism - M1..M4 Optimization-Loop Blueprint (Architect handoff for #117)

- **Issue:** #117 (continuation of #103, M0 merged via PR #104 / 35a2d68)
- **Role:** the Architect
- **Companion docs:** `architecture.md` (container + module layout + B0-B4 done),
  `algorithmic-spec.md` (Stage C/S/P/X/E math), `benchmark-methodology.md`
  (Kodak protocol + numeric gates), `research.md` (SOTA survey + R11-A lesson).
- **Scope of THIS doc:** the benchmark-driven optimization loop B5..B10 that must
  clear M1 (WebP 9.61), M2 (JPEG-LS 9.71), M3 (JPEG XL 8.71 - owner goal), and
  stretch M4 (< 8.0). It fixes the exact interfaces, the coupling guard that makes
  Squeeze non-inert, and the one correctness risk that deferred M0's adaptive
  models.

This document is **architecture only**: interfaces, data structures, algorithmic
invariants, and milestone acceptance. No function bodies.

---

## 0. The one correctness risk from M0 (and how B5 resolves it)

M0 shipped a **true 32-bit rANS** with *fixed* per-bin probabilities and
Elias-gamma magnitude coding, because the M0 Builder found that a *running
adaptive* model cannot round-trip rANS: rANS is a LIFO stack, the decoder pops
symbols in **reverse** order, so an adaptive model whose state depends on the
**prefix** (symbols already coded) desyncs on decode. Concretely, when the
decoder pops symbol `s_{n-1}` first, its model is the initial state, but the
encoder coded `s_{n-1}` with the model *after* seeing `s_0..s_{n-2}`. Mismatch.

**Architectural decision (binding for B5):** introduce a second entropy backend,
a **forward-adaptive binary arithmetic/range coder (`acoder.h`)** that is FIFO
(the decoder reads symbols in the same order the encoder wrote them), used for
all per-context adaptive modeling (B5+). The existing rANS backend is retained
for the static M0 path and any band explicitly flagged static. Both backends are
provably H(p)+epsilon (the Obsidian R4 gate). The container `flags` byte gains a
per-payload backend selector so the decoder knows which coder to drive.

This is the cleanest correct fix: adaptive context modeling is inherently
prefix-dependent, and only a FIFO coder mirrors the encoder's model state at
every symbol index. It costs no format breakage (new flag bit) and removes the
M0 adaptive deferral entirely.

```cpp
// include/prism/codec/acoder.h  (NEW, FIFO adaptive backend)
namespace prism::codec {
class AEncoder {                 // 32-bit range coder, carry handling
public:
    void put_bin(u16& prob, bool bit);          // prob = 16-bit adaptive state (WNC/CABS)
    void encode_residual(Models& m, int cx, i32 e); // same 4-model decomposition as rANS
    void flush_and_emit(std::vector<u8>& out);
};
class ADecoder {
public:
    bool    get_bin(u16& prob);
    i32     decode_residual(Models& m, int cx);
    void    init(span<const u8> band);
};
}
```

Both `Rans*` and `A*` backends satisfy the same `EntropyBackend` concept so
Stage E stays backend-agnostic:

```cpp
struct EntropyBackend {
    void (*put_bin)(void* st, u16& prob, bool bit);
    void (*enc_res)(void* st, Models& m, int cx, i32 e);
    void (*flush)(void* st, std::vector<u8>& out);
};
```

---

## 1. Build order (B5..B10) - the optimization loop

Each step is a commit, must keep the working tree green (gtest 23/23 + `prism
fuzz --iters 1000` + corruption reject) BEFORE the next, and must record a dated
Kodak CSV row (`prism/benchmarks/results/YYYY-MM-DD-prism-e<N>.csv`) when it
changes bpp. Best-known state entering this loop: **11.120 bpp** (B5.17, branch
`opencode/117-prism-m1-m4-optimization`). No round limit overrides the merge gate.

### B5 - Predictor bank + residual-DIFF context  (M1: < 13.05 PNG AND < 9.61 WebP)

- Wire the `acoder.h` FIFO backend (Section 0). Per-context adaptive 16-bit
  probabilities with JXL WNC/CABS learning rate, clamped to the open valid
  interval. Unit test: iid Bernoulli(p) stream coded length approaches H(p)
  within epsilon (R4 gate, now on the adaptive backend).
- Predictor bank `P0..P7` from `algorithmic-spec.md` Section 4, plus the per-fine
  context **weighted least-squares predictor `PW`** (6x6 normal-equation
  accumulation over the plane in analysis; weights quantized i16; bias term).
- **Per-plane predictor selection** (already scaffolded in `analyze.h`
  `predictor_mode` / `per_leaf_pred`) made live: analysis measures summed
  residual energy per candidate and stores the cheapest; zero signaled bytes when
  a single global predictor wins.
- **Residual-DIFF context (JPEG-LS `residual_context(dL,dU,dUl)`):** quantized
  neighbor residual class (<= 365 ids via the sign-symmetry LUT) becomes the
  primary context feature feeding the adaptive models. This is the R3-A win
  (+~0.05) and the seed feature for B7's MA-tree.
- **Activity class** (local variance bucket) added as a context feature.
- Gate: `prism bench --effort 1 --kodak DIR` mean_summed < 9.61 AND < 13.05 on
  real Kodak, byte-exact round-trip for all 24.

### B6 - CFL + 5/3 lifting + 16-bit widening  (M2: < 9.71 JPEG-LS)

- **CFL (chroma-from-luma):** `ch' = ch - round(s * L / 8)`, `s in 0..7` searched
  per chroma plane by summed `|ch'|`; `s=0` identity (strict-superset, never
  expands). Already modeled in `AnalyzeResult.cfl_scales`; make the encode/decode
  path apply it and mirror `s` in the header.
- **5/3 integer lifting** as an alternative single-level decorrelator
  (`algorithmic-spec.md` Section 2); opted into the color-transform search space
  only when it beats YCoCg-R + `PW`. Never selected unless it shrinks bytes.
- **16-bit widening:** all reversible stages (YCoCg-R to B+1, Squeeze to B+2,
  residuals to i32) parameterized on bit-depth so BD16 inputs cannot overflow.
  Add a `prism fuzz` dimension for 16-bit PPM/raw.
- Gate: `prism bench --effort 2 --kodak DIR` mean_summed < 9.71, byte-exact.

### B7 - Squeeze + MA-tree coupled  (M3: < 8.71 JPEG XL - THE CRUX)

This is the owner goal and the Obsidian R11-A trap. **Squeeze alone is inert;
it buys bytes ONLY when the context model can exploit the co-located LL and
sibling-HF references.** Therefore B7 lands Squeeze and the MA-tree **as one
atomic commit pair**, never separately, and is gated by the R11-A guard below.

- **Squeeze (Stage S):** JXL CDC, `L` levels searched `0..=max_levels(w,h)`
  (typically <= 4). Each level is an exact linear bijection; emit **post-order**
  (LL before its three HF children) per `architecture.md` Section 5 so co-located
  LL is available to HF predictors and to the MA-tree `llc_class` feature.
- **MA-tree (Stage X):** greedy entropy-split decision tree over the `Feature`
  vector (`algorithmic-spec.md` Section 5), capped at depth `D` and leaves `K`,
  serialized per (channel-group, band-class) as in `architecture.md` Section 4.
- **Mandatory coupling features (`llc_class` + `sibling_class`):** the MA-tree
  feature vector MUST include, for every HF sample, the co-located LL value class
  (`llc_class`) and the sibling-band value class (`sibling_class`). These are the
  features that make the HF residual exploitable. The tree's split candidate set
  includes property ids 2 (`llc_class < T`) and 4 (`sibling_class < T`).
- **Predictor map coupling:** per-leaf predictor id (from B5's bank) is stored in
  the model (`per_leaf_pred`) and applied at decode; the CrossBand predictor
  references co-located LL (`LLc`) for HF bands.
- **R11-A guard (binding, non-negotiable):** before the Squeeze+MA-tree path is
  accepted by the Builder's own check, the build MUST demonstrate on real Kodak
  that enabling Squeeze *with* `llc_class`/`sibling_class` yields a strictly
  smaller mean_summed than (a) Squeeze with the context model disabled and (b)
  no-Squeeze baseline. If the coupled path does not beat the no-Squeeze baseline
  by a margin, the commit is rejected by the Builder (do not merge inert Squeeze).
  Record the three numbers in the dated CSV.
- Gate: `prism bench --effort 3 --kodak DIR` mean_summed < 8.71 AND R11-A guard
  satisfied, byte-exact for all 24.

### B8 - CM + LZP never-expand net  (M4 stretch: < 8.0)

- **CM (context mixing):** small logistic mixer combining 2-4 sub-estimators
  (per-context GR, a spatial prior, an SSE map on neighbor residual), online
  logistic updates, `effort >= 4`. Wrapped around the adaptive backend.
- **LZP pre-filter:** hash of recent context -> predicted symbol; on match emit
  flag + run length, else literal; fed into the entropy stage. `effort >= 7`.
- **Never-expand safety net (binding):** the encoder codes the band with and
  without each extra backend and keeps the smaller file; CM/LZP are selected only
  when they actually shrink bytes. `flags` bit0 (CM) / bit1 (LZP) record the
  per-payload choice. A unit test asserts that feeding a worst-case (already
  incompressible random) band never grows beyond the plain backend size.
- Gate (stretch): `prsm bench --effort 7 --kodak DIR` mean_summed < 8.0.

### B9 - Front-end completeness

- WebP/TIFF decoders behind `PRISM_WITH_WEBP` / `PRISM_WITH_TIFF` CMake options
  (libwebp, libtiff). ICC linearization before codec sees pixels. Full
  format matrix added to `fuzz_gate.sh`.

### B10 - Real Kodak harness (already provisioned, keep wired)

- `prism/benchmarks/data/kodak/` PPMs SHA256-pinned in `kodak.sha256`.
  `run_kodak.sh --effort N` + `bench_gate.sh` enforce the numeric gates. CSVs
  committed durably; no synthetic CSV may substitute. `aggregate.py` prints the
  milestone curve across dated CSVs.

---

## 2. Interface deltas the Builder must implement

```cpp
// include/prism/codec/acoder.h            (NEW, Section 0)
// include/prism/codec/squeeze.h           add: search_levels(r, effort) -> vector<u8>
// include/prism/codec/matree.h            add: feature includes llc_class + sibling_class
// include/prism/codec/predict.h           add: PW weighted predictor + 6x6 accumulators
// include/prism/codec/container.h         flags gains backend selector per payload
// include/prism/codec/cm.h  lzp.h         opt-in backends (B8)
// src/cli/main.cpp                        `prism bench --effort N --kodak DIR`
```

`Feature` (from `architecture.md` Section 2) is unchanged in shape but B7 fills
`llc_class` and `sibling_class` for HF bands; `analyze.h` `AnalyzeResult` gains
`squeeze_levels` (already present) and the MA-tree `trees` already carries the
serialized groups.

---

## 3. Milestone acceptance (binding, real Kodak only)

| Gate | Target (summed bpp) | Reference | Loop step |
|---|---|---|---|
| M0 | round-trip exact | - | B0-B4 (DONE, must stay green) |
| M1 | < 13.05 AND < 9.61 | PNG / WebP | B5 |
| M2 | < 9.71 | JPEG-LS | B6 |
| M3 | < 8.71 + R11-A guard | JPEG XL | B7 |
| M4 | < 8.0 (stretch) | CM/LZP | B8 |

**Merge gate (owner override, not an iteration limit):** PR is NOT merged until
M0 (23/23 gtest + `prism fuzz --iters 1000` + corruption reject + real-image
byte-exact for all 24) AND M1 + M2 + M3 pass bit-exactly on the real Kodak
corpus, with durable CSV + SHA256 evidence and no synthetic CSV. Quality is the
only deadline.

---

## 4. Complexity & risk (carried)

- Encode O(pixels * L) squeeze + O(pixels) predict + O(pixels * E) analysis;
  MA-tree build capped at K leaves / depth D so analysis amortized O(pixels).
- Decode single pass, O(pixels * L) + O(pixels). Memory O(K) + one plane buffer
  per Squeeze level.
- **Risk:** Squeeze+MA-tree coupling is the crux (R11-A). Mitigated by the
  mandatory `llc_class`/`sibling_class` features + the R11-A guard.
- **Risk:** CM/LZP speed. Both opt-in and never-expand; any single-image encode
  > 5x prior best at same effort is flagged by `aggregate.py`.

- the Architect
