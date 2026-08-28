# Architectural Blueprint: Route 4 - Beyond-Predictive Paradigm

- **Issue:** #130 (Owner directive 2026-08-28T06:24:38Z: proceed with Option 2,
  Exotic Beyond-Predictive Paradigm; lift out of V5 reserve into a first-class
  program)
- **Research spec:** `prism/docs/research-route4-beyond-predictive.md` (Dr. Mob,
  the Researcher)
- **Pinned constants:** `prism/docs/addendum-25-pinned-constants-route4.md`
- **Role:** the Architect
- **Date:** 2026-08-28
- **Scope:** Complete architectural blueprint for the X-series measurement program
  (X0-X5): integer wavelet lifting + bitplane ANS coding with a fixed
  parent-aware context, plus a learned/augmented context augmentation (X3). This
  is a paradigm shift OUT of the predictive-residual domain that every prior
  program (C through U, then R3/R1/R2) exhausted. The v1 production path is
  touched ONLY by a single new flag bit; all new code is isolated behind a
  `FRAME-WAVELET` mode.

---

## 1. Summary

All prior Prism programs stayed inside the predictive-residual domain: predict a
pixel (MED/GAP/W), take the residual, code it as one symbol per pixel under an
online context model. The MED residual floor (~3.37 per-sample) is a conditional
entropy wall no tractable context beats without either paying transmitted-table
bytes (table-economics law) or losing granularity. Route 4 moves the work from the
prediction step to the REPRESENTATION step:

1. **Reversible integer wavelet lift** (multiresolution decorrelation).
2. **Bitplane ANS coding** with an EBCOT-style 3-pass structure and a FIXED
   parent-aware context (spatial orientation tree). Zero transmitted tables, so
   table-economics cannot re-apply.
3. **Learned/augmented context model (X3)** as the M3-closing lever: a fixed
   baked-in neural net (X3a, data-gated) or an enriched adaptive context (X3b,
   data-free fallback).

**Projected outcome (honest arithmetic from e1 = 3.3737 per-sample):**
- X1 + X2 (training-free): ~2.95-3.05 per-sample -> **M2 (3.166) clears with margin**.
- + X3b (free): ~2.88-2.95 -> borderline M3.
- + X3a (neural, corpus): ~2.80-2.90 -> **M3 (2.885) within reach if trained**.

The binding end gate is a fresh dual-unit `bench_gate.sh` on full Kodak-24 against
REAL cjxl and WebP. No measurement precedes addendum 25.

---

## 2. Module Breakdown

### 2.1 X0: Harness Extension (BLOCKING)

All new code lives under `prism/src/codec/`, `prism/include/prism/codec/`, behind
a `WAVELET_FLAG` (bit 7, 0x80). The v1 production path (predict.cpp, rans.cpp,
container.cpp model section) is NOT modified except for flag dispatch.

#### 2.1.1 New Files

| File | Purpose |
|---|---|
| `include/prism/codec/wavelet.h` | Reversible integer wavelet lift (Haar, 5/3, 9/7), per-plane forward/inverse, border extension, subband layout descriptor |
| `include/prism/codec/bitplane.h` | EBCOT-style 3-pass bitplane coder/decoder, parent-aware fixed context function, subband significance state |
| `include/prism/codec/bitplane_rans.h` | Per-context ADAPTIVE binary rANS (128 contexts, EMA shift-5), LIFO-safe via causal context |
| `include/prism/codec/wavelet_container.h` | Wavelet header (filter_id, levels, subband dims) serializer/parser riding the v1 envelope |
| `src/codec/wavelet.cpp` | Lift implementation + inverse, round-trip proven |
| `src/codec/bitplane.cpp` | 3-pass bitplane emit/decode with section-2.1 context |
| `src/codec/bitplane_rans.cpp` | Adaptive context rANS (reuses renorm/flush core of rans.cpp) |
| `src/codec/wavelet_container.cpp` | Wavelet header + payload assembly/disassembly |
| `src/cli/wavelet_bench.cpp` (or extend `main.cpp`) | `bench-sandbox --x0` .. `--x5` measurement commands |
| `tests/unit/test_wavelet.cpp` | Lift reversibility + subband layout |
| `tests/unit/test_bitplane.cpp` | Bitplane round-trip + context determinism |
| `tests/unit/test_bitplane_rans.cpp` | Adaptive rANS bit-exactness + EMA update order |
| `tests/unit/test_wavelet_container.cpp` | Header parse/serialize + CRC32 gate |

#### 2.1.2 Existing Files to Modify

| File | Change |
|---|---|
| `include/prism/codec/container.h` | Add `WAVELET_FLAG` (0x80) and a `wavelet` sub-header struct inside `Container::Header` |
| `src/codec/container.cpp` | On `WAVELET_FLAG`: emit wavelet header (filter_id, levels, subband dims) in place of the standard model section; payload = bitplane rANS stream. Decode mirrors. |
| `src/codec/color.cpp` | Reuse as-is (YCoCg-R + D4c trials), applied BEFORE lift |
| `src/cli/main.cpp` | Add `FRAME-WAVELET` dispatch + `--x0`..`--x5` sandbox commands |
| `CMakeLists.txt` | Add `wavelet.cpp`, `bitplane.cpp`, `bitplane_rans.cpp`, `wavelet_container.cpp` to `prism_core` |
| `benchmarks/probe_sandbox.sh` | Add X-series phases |

#### 2.1.3 Core Data Structures

```cpp
// Reversible integer wavelet lift (per plane, full-image)
struct WaveletLift {
    enum class Filter { Haar = 0, LeGall53 = 1, Reversible97 = 2 };
    struct Params { Filter filter = Filter::LeGall53; int levels = 5; };

    // Forward: plane -> LL + (HL,LH,HH) per level, as int32 subbands.
    // Reversible: integer lifting with rounding; lift_inv(lift(x)) == x for
    // all integer inputs in coded range (I26).
    std::vector<Subband> forward(const std::vector<int32_t>& plane,
                                 const Params& p) const;
    std::vector<int32_t> inverse(const std::vector<Subband>& subbands,
                                 const Params& p) const;

    // VB rail target: returns false on ANY mismatched round-trip pixel.
    bool reversible_for_all_inputs(const Params& p) const;
};

// Subband descriptor (used by header + coder)
struct Subband {
    enum class Orient { LL = 0, HL = 1, LH = 2, HH = 3 };
    Orient orient;
    int level;          // 0 = coarsest LL; 1..L for detail bands
    int w, h;
    std::vector<int32_t> coeffs;   // signed integer coefficients
};

// Bitplane coder: EBCOT-style 3-pass over the significance field.
struct BitplaneCoder {
    // Context function (pinned, I28): fixed, online-adapted, ZERO tables.
    // ctx = ORIENT(2b) + PARENT_STATE(1b) + SIG_COUNT_BUCKET(3b)
    static uint32_t context_id(Orient o, bool parent_sig, int sig_neighbor_count);

    // Encode all subbands, coarse-to-fine, MSB-to-LSB bitplanes.
    std::vector<uint8_t> encode(const std::vector<Subband>& subbands);

    // Decode (mirror-exact): decoder reconstructs each context from already
    // decoded coefficients, so no side info is transmitted.
    std::vector<Subband> decode(const std::vector<uint8_t>& stream,
                                const std::vector<Subband::Orient>& layout);
};

// Per-context adaptive binary rANS (NEW: existing rans.cpp is fixed-prob only).
struct BitplaneRans {
    static constexpr int NUM_CONTEXTS = 128;
    static constexpr int EMA_SHIFT = 5;          // shift-5, same as ACoderV2
    static constexpr uint32_t M = 1u << 16;       // RANS_M, reuse rans.cpp core

    // One adaptive binary model per context. Causal: context derived from
    // already-coded/decoded significance, so encode and decode update in the
    // same order (LIFO-safe).
    struct BinaryModel { uint16_t p0 = M / 2; };  // P(0)*M, EMA-updated
    std::array<BinaryModel, NUM_CONTEXTS> models;

    void encode_bit(uint8_t bit, uint32_t ctx, BitWriter& w);
    uint8_t decode_bit(uint32_t ctx, BitReader& r);
    void update(uint8_t bit, BinaryModel& m);     // EMA shift-5
};
```

#### 2.1.4 Wire Format v3 (in-v1-envelope integration at X0)

To avoid disrupting the v1 production path (requirement: v1 untouched except a
flag), during the X-series the wavelet path rides the existing v1 container:

```
[PRSM magic]        'P','R','S','M'
[version]           1  (envelope preserved)
[width] [height] [bit_depth] [num_channels]
[color_transform_id]
[flags]             bit7 (0x80) = WAVELET_FLAG set
[effort]
... (cfl_scales, squeeze_levels as in v1, ignored when WAVELET_FLAG) ...
[wavelet_header]:   [filter_id u8] [levels u8]
                    for each subband: [orient u8][level u8][w u16][h u16]
[ans_stream]        interleaved rANS of all bitplane symbols (payload)
[crc32_all]
```

The pure v3 container from addendum 25 section 5 becomes the FORMAT-STABLE
target only at X4 (the format-freeze PR). Byte-exact round-trip and CRC32 are
preserved in both representations. `WAVELET_FLAG` bit position: bit 7 (0x80).

#### 2.1.5 VB Rails (Verification Bodies)

| Rail | What it proves |
|---|---|
| `VB-X-WAVELET-ROUNDTRIP` | encode -> decode reproduces source byte-exact |
| `VB-X-LIFT-FIDELITY` | `lift_inv(lift(x)) == x` for ALL integer inputs (I26) |
| `VB-X-ANS-FIDELITY` | adaptive rANS coding/decoding bit-exact for a given context |
| `VB-X-NET-AUDIT` | NET = payload + header on every row (no hidden side info) |
| `VB-X-CONTEXT-DETERMINISM` | encoder and decoder derive identical context sequences |
| `VB-X-SELF-CHECK` | proves both verdict directions on pinned quad |

#### 2.1.6 Exit Conditions for X0

- [ ] All VB rails green
- [ ] Addendum 25 committed BEFORE any measurement
- [ ] Dated reference CSV committed (`prism/benchmarks/results/2026-08-28-sandbox-x0.csv`)
- [ ] Byte-exact round-trip on pinned quad (kodim01/05/13/19)

---

## 3. X-Series Measurement Program

### 3.1 X1: Wavelet Decorrelation vs Spatial Residual (attacks N1)

Hold the CODER constant (bitplane coder for both) and compare:
- FRAME-SPATIAL: v1 MED residuals, coded bitplane-style (control for coder).
- FRAME-WAVELET: wavelet coefficients, coded bitplane-style.

Gate: FRAME-WAVELET median NET beats FRAME-SPATIAL median NET by >= +2.0% on the
pinned quad (decorrelation must reduce coded bytes). Sub-gate: round-trip
byte-exact (I26). Fail: try 9/7 filter; if still fail, report: lifting does not
decorrelate this corpus.

### 3.2 X2: Bitplane Context vs v1 Baseline (attacks N1+N2, targets M2)

Frame: FRAME-WAVELET with the full parent-aware bitplane context vs e1
(10.1210 summed / 3.3737 per-sample) on the pinned quad.

Primary gate (per I10): FRAME-WAVELET median NET beats e1 by >= +8.0%
(10.1210 x 0.92 = 9.31 summed < 9.498 M2 summed; 2% margin).
Sub-gates: X2a (mean summed < 9.498 AND mean per-sample < 3.166, M2 both units on
quad), X2b (overhead <= 0.002 bpp per sample), X2c (no image regresses > -1.0% vs
own e1 bytes), X2d (decode time <= 3x v1). Failable self-check proves both
directions on the quad.

### 3.3 X3: Learned/Augmented Context (attacks N3, targets M3)

Conditioned on X2 passing. Measured in order:
- X3b (enriched adaptive context, data-free): augment the X2 context with
  run-length-of-zeros, significance-gradient, grandparent state; adaptive rANS.
  Gate: median NET >= +1.5% over X2 winner (~3.0 -> ~2.9).
- X3a (neural, ONLY if owner authorizes a training corpus): fixed CNN context
  model, weights baked as a C++ constant header, in-house inference on both ends.
  Gate: median NET >= +1.5% over X3b winner (~2.9 -> ~2.8). If no corpus
  authorized, X3a is SKIPPED; recorded honestly per I30, not hidden.

### 3.4 X4: Composition + Projection + Binding Gate

Compose all X-series winners per image by real NET bytes (L-C1). Run the FULL
Kodak-24 corpus (all 24, sha-pinned) with `prism bench`; judge ONLY by
`bench_gate.sh` in BOTH units against REAL cjxl (M3: < 8.655 summed / < 2.885
per-sample) and REAL WebP (M2: < 9.498 summed / < 3.166 per-sample).
- Clears M2 only: open X5; if X5 also fails or X3a gated out, report
  "M2 PASS / M3 PENDING" (I30).
- Clears BOTH: format-stable PR; Refs #130; freeze lifts on merge.
- Misses M2: full negative ledger; Anti-Surrender re-examination, not silent close.

### 3.5 X5: Reserve (only if X4 inside M3 reach but short)

One-shot reserve mechanisms (each its own gate, >= +1.0% median NET, no image
worse than -0.5%; third strike dies):
- X5a: chroma-subband conditioned on luma-subband (N4 cross-band; satisfies
  L-C7 parent-aware reopening, unlike parent-blind C4/C5).
- X5b: larger decomposition depth sweep (L up to 6) if X2 left margin.
- X5c: context pool size sweep (64/128/256 fixed, no transmitted tables).

---

## 4. Frontend / Visual Demonstration Layer (lab requirement)

Per the lab frontend rule, an algorithm engine must ship a specimen page. For the
beyond-predictive codec the Builder adds a visual demo under `prism/frontend/`:
- A **bitplane explorer** web page (static HTML + Canvas, no framework) that
  loads a compressed v3 bitstream and renders, per subband and per bitplane:
  - the significance map (where bits first become 1) to visualize N1/N2 structure,
  - the reconstruction after decoding up to bitplane b (progressive reveal),
  - a live NET-bytes readout per image vs the e1 baseline bar.
- A CLI `prism dump-wavelet --subbands <img>` emitting a PNG atlas of each
  subband (LL..HH) so the energy-compaction claim (N1) is visually verifiable.

This page is a read-only specimen; it does not alter the codec path.

---

## 5. Complexity

- Encode: color O(N) + lift O(N) + bitplane O(N) symbols each O(1) ANS. Wall-clock
  ~2-4x v1 (lift + multi-pass-per-bitplane scan), within the L-C8 5x phase guard.
- Decode: O(N) with table lookups + fixed lift passes; mirror-exact by
  construction.
- Memory: O(subband sizes + 128 contexts), negligible.
- X3a neural inference: small fixed number of conv ops per symbol; decoded on both
  ends from the same constant weights.

---

## 6. Invariants (I25-I30 carried verbatim from addendum 25)

- **I25** beyond-predictive primacy (pixel predictor not primary mechanism).
- **I26** reversible lift (`lift_inv(lift(x)) == x`) proven by VB rail before any X-phase.
- **I27** no transmitted tables (fixed context function, online-adapted).
- **I28** parent-aware context (L-C7 satisfied, owner-authorized).
- **I29** baked-in learned model = 0 per-image NET.
- **I30** honest M3 reporting when X3a gated out.

---

## 7. Module Map for Builder

### Phase 1: X0 Scaffolding
1. `wavelet.h/.cpp`: lift forward/inverse for Haar/5/3/9/7, border extension,
   subband layout. `reversible_for_all_inputs()` rail.
2. `bitplane_rans.h/.cpp`: 128-context adaptive binary rANS (EMA shift-5),
   reusing rans.cpp renorm/flush core.
3. `bitplane.h/.cpp`: 3-pass coder, pinned context function, significance state.
4. `wavelet_container.h/.cpp`: header serialize/parse + payload assembly.
5. `container.cpp` flag dispatch for `WAVELET_FLAG` (0x80).
6. `main.cpp` + `CMakeLists.txt`: `FRAME-WAVELET` + `--x0`..`--x5`.
7. Unit tests + VB rails (section 2.1.5).

### Phase 2: X0 VB Rails + self-check (blocking)
- All six rails green; dated CSV; addendum 25 committed.

### Phase 3: X1-X3 measurement (per section 3)
- Each phase: implement frame, sweep pinned params, run `bench_gate.sh` self-check,
  commit dated CSV (`2026-MM-DD-sandbox-x<N>.csv`), record honest ledger.

### Phase 4: X4 composition gate + X5 reserve (conditional)
- Full Kodak-24 dual-unit gate; format-stable PR if both M2 and M3 clear.

---

## 8. Test Matrix

| Test | File | Proves |
|---|---|---|
| `test_wavelet.cpp` | New | Lift reversibility + subband layout bijection |
| `test_bitplane.cpp` | New | Bitplane round-trip + context determinism |
| `test_bitplane_rans.cpp` | New | Adaptive rANS bit-exact + EMA order |
| `test_wavelet_container.cpp` | New | Header parse/serialize + CRC32 gate |
| `benchmarks/probe_sandbox.sh --x0..--x5` | New | Each X-phase harness |
| `benchmarks/bench_gate.sh` | Existing | Final dual-unit M2/M3 gate |

---

## 9. Decision Tree

| Outcome | Consequence |
|---|---|
| X0 fails (harness broken) | Fix and re-run; no verdict until green |
| X1 fails (< +2.0% decorrelation) | Try 9/7; if still fail, report: lift does not decorrelate corpus |
| X2 fails (< +8.0% vs e1, or X2a M2 miss) | Report full ledger; owner decides next paradigm |
| X2 passes (M2 on quad) | proceed to X3 |
| X3b passes, X3a gated out | X4 with enriched context; M2 expected, M3 borderline |
| X3a passes (corpus authorized) | X4; M3 expected |
| X4 clears M2 only | open X5; if short, report M2-PASS/M3-PENDING |
| X4 clears M2 AND M3 | format-stable PR; Refs #130; freeze lifts on merge |
| everything fails | full negative ledger; Anti-Surrender re-examination, not silent close |

---

## 10. Deliverables Checklist

- [ ] `prism/docs/addendum-25-pinned-constants-route4.md` (pinned constants, committed BEFORE measurement)
- [ ] `ideas/2026-08-28-prism-route4-beyond-predictive.md` (this blueprint)
- [ ] `progress/130-prism-route4-beyond-predictive.md` (milestone tracker)
- [ ] X0 harness: wavelet lift + bitplane coder + adaptive rANS + container flag
- [ ] X0 VB rails (6) + self-check
- [ ] X1 decorrelation measurement (N1)
- [ ] X2 context measurement (N1+N2, M2 target)
- [ ] X3 learned/augmented context (N3, M3 target)
- [ ] X4 composition + dual-unit gate (M2 and M3)
- [ ] X5 reserve (conditional)
- [ ] Wire format v3 (byte-level) + `FRAME-WAVELET` flag
- [ ] Frontend bitplane explorer + subband atlas

---

- the Architect
