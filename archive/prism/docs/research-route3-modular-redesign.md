# Research: Route 3 - JXL-style Modular redesign

- **Issue:** #130 (Owner directive 2026-08-27T08:19:10Z: continue without
  pause, Route 3 first, cascade to Route 1 then Route 2)
- **Role:** Dr. Mob, the Researcher
- **Trigger:** `/oc research` dispatch on #130, 2026-08-27T08:19Z (Maintainer
  cascade after Owner authorization)
- **Inputs:** all prior research specs (negative ledger, v2-clean-slate,
  v3-content-clustering, v4-transform-domain), all measurement CSVs under
  `prism/benchmarks/results/`, `progress/130-prism-true-jxl-parity.md`,
  `progress/130-prism-v4-transform.md`, and the Builder decision records.
- **Scope of THIS doc:** the complete research specification for Route 3
  (JXL-style Modular redesign). This is the architectural redesign that
  attacks the fundamental structural gap between Prism and JPEG XL, not an
  incremental improvement. Handoff: `{"action":"architect"}`.

Units discipline unchanged: every number states its unit; on Kodak-24
(C=3) summed = 3 x per-sample exactly; gates compare BOTH units via
`benchmarks/bench_gate.sh`; no success claim without a fresh measurement.
No em dashes anywhere in this document or its descendants.

---

## 0. Why Route 3 is the correct first choice

### 0.1 The structural diagnosis

After seven measurement programs (28 phases, 18 rejected with committed
numbers), the lab has located the gap to JPEG XL with precision:

| gap bucket | size (% of current bytes) | measured ceiling | status |
|---|---|---|---|
| B1: collection layer (adaptive cost) | 6.30% gross, 2.5-4.5% realistic | +5.81% realistic (V1b) | partially harvested; table-economics capped |
| B2: per-image conditioning | 2.0-3.1% gross, 1.5-2.5% realistic | per-image +1.86..+2.95 pts; pooled 1.33 < 1.5 bar | real but unpayable under current tokenization |
| B3: predictor headroom | 2-5% literature | -1.45% best (S1 W) | CLOSED under ZFF binarization |
| B5: tokenization | 0.5-1.0% | -2.11% best (T3) | CLOSED under ZFF |
| B6: source decorrelation | 1.5-2.5% | +20.32% WORSE (U1) | CLOSED (domain mismatch) |

**The table-economics law**: every conditioning refinement measured under
payable side-info has lost to its own table bytes. This is confirmed across
seven independent programs (V1, S1, S3, T1a, T2a, T3, U1). The mechanism
is structural: at Kodak image sizes (768x512 = 393,216 samples per plane),
the transmitted side-info for any content-adaptive structure exceeds the
entropy reduction it buys.

### 0.2 Why single-pass cannot reach M3

The e1 corpus truth is 10.1210 summed / 3.3737 per-sample bpp. The M3
gate is < 8.655 summed / < 2.885 per-sample. The gap is 14.48% of
current bytes.

In a single-pass architecture with online adaptation:
- Every context refinement costs table bytes (measured: V1b +5.81% payload,
  -NET; T1a -32.76% NET; T2a -13.09% NET; T3 -2.11% NET)
- The zero-flag-first binarization makes predictor improvements
  structurally incompatible (E1 +19.85 pts worse; S1 -1.45% best)
- Source transforms fail due to domain mismatch (U1 +20.32% worse)

No unmeasured mechanism class remains in the single-pipeline design space.

### 0.3 What JXL Modular actually does differently

JPEG XL Modular mode achieves 8.655 summed / 2.885 per-sample on the
same Kodak-24 corpus. Its advantage is architectural, not incremental:

1. **Multi-pass encoding**: Pass 1 analyzes the image (counts residuals per
   context per cluster). Pass 2 codes with pre-computed optimal tables.
   The analysis pass is O(N) and costs ZERO bits in the stream.

2. **MA-tree context clustering**: The image is partitioned into ~30-80
   clusters per image by a binary decision tree over spatial features.
   Each cluster gets its own adapted histogram. The tree is transmitted
   as compact side-info (~200-500 bytes for 30-80 leaves).

3. **Transmitted histograms**: Per-cluster histograms are delta-coded
   against a global prior and transmitted as ~12-bit normalized
   distributions. Total histogram bytes: typically 2-5 KB per image for
   30-80 clusters with alphabet ~34 tokens.

4. **ANS entropy coding**: Asymmetric numeral systems with static
   probabilities derived from the transmitted histograms. This is
   fundamentally more efficient than online adaptation because:
   - Zero transient learning cost (B1 eliminated)
   - Zero nonstationarity tracking loss
   - Zero per-sample estimation noise

### 0.4 The critical insight: table economics disappear

In Prism's single-pass architecture, every context refinement costs table
bytes because the tables must be transmitted. In JXL's multi-pass
architecture, the histograms are transmitted as part of the format, and
the "table cost" is amortized over the entire cluster. For a cluster with
4096+ samples and an alphabet of ~34 tokens, the 12-bit histogram
contributes ~34 x 12 = 408 bits = 51 bytes per cluster. For 50 clusters
that is 2,550 bytes = 0.0066 bpp per sample. This is negligible compared
to the entropy reduction from content-adaptive distributions.

**This is why Route 3 is structurally different from every prior attempt.**
V1/T1a/T2a tried to add clustering to a single-pass architecture and
paid table bytes for every refinement. Route 3 builds clustering INTO the
architecture by making the analysis pass a separate, non-coded step.

### 0.5 Cascade logic

Route 3 is the first choice because:
- It attacks the fundamental architectural gap (single-pass vs multi-pass)
- It is the only path with a literature-proven track record to M3
- It eliminates the table-economics law by construction

If Route 3 fails (e.g., the histogram transmission overhead exceeds the
entropy gain, or the MA-tree serialization is too expensive), the cascade
is:
- **Route 1** (fallback): multi-pass with transmitted histograms + static
  ANS + MA-tree clustering, but retaining Prism's residual pipeline
  (MED prediction, ZFF binarization) instead of a full redesign
- **Route 2** (final fallback): hybrid-uint binarization to remove the ZFF
  pathology, reopening predictor headroom (B3)

---

## 1. The Route 3 architecture

### 1.1 High-level pipeline

```
ENCODE:
  Pass 1 (analysis, O(N)):
    1. Apply color transform (trial-selected from D4c family)
    2. Compute MED prediction residuals
    3. Build MA-tree over spatial features (QG, band_class, activity)
    4. Partition samples into K clusters (K ~ 30-80)
    5. Count residual histograms per cluster (alphabet ~34 tokens)
    6. Smooth histograms toward geometric prior
    7. Score candidate cluster counts by real ANS bytes (trial-encoded)

  Pass 2 (coding, O(N)):
    1. Re-apply color transform (same as pass 1)
    2. Re-compute MED prediction residuals (same as pass 1)
    3. Resolve MA-tree cluster assignment per sample
    4. Code residual with ANS using cluster-specific static probabilities
    5. Transmit: header + MA-tree + delta-coded histograms + ANS-coded payload

DECODE:
  Single pass, O(N):
    1. Parse header, MA-tree, histograms
    2. For each sample: resolve cluster from MA-tree, decode residual with
       ANS using cluster-specific probabilities, apply inverse prediction
       and inverse color transform
```

### 1.2 Color transform

Inherited unchanged from Prism v1: YCoCg-R reversible, with D4c rotation
trials (ids 7..11). Trial-selected by real coded bytes in pass 1. The
transform is applied BEFORE the analysis pass so that residuals are
computed in the transform domain.

### 1.3 Prediction

MED (median edge detector) with the same four-neighbor stencil (W, N, NW,
and NE combination). The prediction is applied to the color-transformed
source. The residual r = x - MED(W, N, NW, NE) is the signal coded by
the entropy backend.

Why MED and not a more sophisticated predictor: the S1 measurements
proved that GAP/W families regress under zero-flag-first binarization
(S1: -1.45% best). Under static ANS coding, predictor headroom may
reopen (the ZFF pathology disappears), but this is a measured question
for the R-series program. MED is the safe starting point; predictor
improvement is a separated measurement (R3 phase).

### 1.4 MA-tree context clustering

The MA-tree (MANIAC-style binary decision tree) maps each sample's feature
vector to a cluster id (0..K-1). Features:

| feature | description | source |
|---|---|---|
| QG | Quantized gradient magnitude (causal neighbors) | Same as Prism v1 MA-tree |
| band_class | 0=LL, 1..3=HF (H/V/D), level in high bits | Always 0 (single-resolution) |
| activity | 4-level local activity (gradient thresholds) | Same as Prism v1 |
| position_y, position_x | Normalized coordinates (0..255) | NEW: enables spatially varying clusters |

Tree parameters:
- Max depth: 10 (same as Prism v1)
- Min samples per leaf: 4096 (same as Prism v1; ensures histograms are
  statistically reliable for 12-bit normalization)
- Max leaves: 256 (same as Prism v1)
- Split criterion: real ANS bytes (trial-encoded, same as C1/P4 rule)

The tree is built in pass 1 and transmitted as compact side-info. The
transmission format is:
- Node count (u16)
- For each internal node: property_id (u8) + threshold (u16)
- For each leaf: cluster_id (u16)

Estimated tree size: for K=50 leaves, ~50 internal nodes, each 3 bytes
= 150 bytes for the tree, plus 100 bytes for leaf mapping = 250 bytes.
This is NEGligible compared to the histogram savings.

### 1.5 Histogram estimation and transmission

Per-cluster histograms:
- Alphabet size: ~34 tokens (same as Prism v1 zero-flag-first: zero flag,
  sign bit, unary quotient, remainder bits; or a new tokenization - see
  R3 phase)
- Counting: pass 1 counts occurrences of each token in each cluster
- Smoothing: pseudo-count geometric smoothing (alpha=1, r=15/16) toward
  image-global pooled histogram
- Normalization: 12-bit (sum = 4096) for ANS coding

Transmission format (hierarchical delta coding):
1. Image-global pooled histogram: 34 x 12 = 408 bits = 51 bytes (raw)
2. Per-cluster delta from global: encode the DIFFERENCE between each
   cluster's histogram and the global prior. Since most clusters are
   similar to the global, the deltas are small and compress well.
3. Use the same ANS coder to code the deltas (self-referential but
   decodable: the global is coded with a uniform prior, then deltas
   are coded with the global as context).

Estimated histogram overhead:
- K=50 clusters, alphabet=34, 12-bit deltas
- Per-cluster delta: ~34 x 8 = 272 bits = 34 bytes (average, assuming
  small deltas)
- Total: 50 x 34 = 1,700 bytes = 0.0043 bpp per sample
- Plus global: 51 bytes
- Total: ~1,751 bytes = 0.0045 bpp

This is an order of magnitude smaller than what V1/T1a/T2a paid for
tables (V1b: +5.81% of v0; T1a: 182-213 KB per-group tables).

### 1.6 Entropy coding: ANS with static probabilities

Asymmetric numeral systems (ANS) with per-cluster static probabilities
derived from the transmitted histograms. This replaces Prism's online-
adaptive binary range coder (ACoderV2).

Why ANS:
- Zero transient learning cost (B1 eliminated entirely)
- Table-lookup coding: each symbol is coded in O(1) amortized
- Static probabilities: no adaptation noise, no estimation lag
- Proven in JXL Modular, FSE (zstd), and other modern codecs

ANS implementation:
- Interleaved rANS (same as Prism's existing `rans.h` infrastructure)
- 16 states interleaved (same as Prism v1)
- Per-cluster probability tables (34 symbols, 12-bit normalized)
- Decoder: table lookup, O(1) per symbol
- Encoder: reverse table, O(1) per symbol (or bit-by-bit fallback)

### 1.7 New tokenization (replacing ZFF)

The zero-flag-first binarization is incompatible with ANS coding because
ZFF is a binary entropy stage designed for online adaptation. Under static
ANS, a different tokenization is needed.

Proposed tokenization (hybrid-uint, analogous to JXL):
- Residual r is folded via signed-minimum-redundancy mapping to u >= 0
- Token t = min(u, T_ESC) with dedicated ZERO token (t=0)
- Escaped magnitudes carry raw bits below a pinned escape ladder
- Alphabet size: T_ESC + ceil(log2(max_residual)) + 1

This is the tokenization that was proposed in research-v2 (section 3,
stage 3) but never built because the single-pass architecture could not
support it. Under multi-pass with transmitted histograms, the token
economics change completely: the token distribution is estimated in pass 1
and transmitted, so the "table cost" of a larger alphabet is paid once
per cluster (negligible) rather than per-sample (expensive under online
adaptation).

### 1.8 Wire format (version 2)

```
PRISM v2 Container Layout (all integers little-endian):
=====================================================
[PRSM magic]          4 bytes: 'P','R','S','M'
[version]             1 byte:  = 2
[width]               4 bytes: u32 LE
[height]              4 bytes: u32 LE
[bit_depth]           1 byte:  8 or 16
[num_channels]        1 byte:  1..4
[color_transform_id]  1 byte:  (same as v1)
[flags]               1 byte:  (new flags)
[effort]              0..7     1 byte
[reserved]            (padding for future use)

MODEL SECTION (new in v2):
  [num_clusters]      u16 LE  (K, typically 30-80)
  [ma_tree_blob]      variable: serialized MA-tree (nodes + leaf mapping)
  [histogram_blob]    variable: hierarchical delta-coded histograms:
                      [global_prior: 34 x u12 packed]
                      [per-cluster deltas: K x (variable-length coded)]

PAYLOAD:
  [payload_len]       u32 LE  (total payload bytes)
  [payload_bytes]     payload_len bytes of ANS-coded residuals
                      (per-cluster coding, interleaved rANS)

FOOTER:
  [crc32_all]         u32 LE (over header + model + payload)
```

Estimated total overhead per image:
- Header: ~20 bytes (negligible)
- MA-tree: ~250 bytes (for K=50)
- Histograms: ~1,751 bytes (for K=50, alphabet=34)
- Total model overhead: ~2,021 bytes = 0.0051 bpp per sample
- This is FIXED per image, independent of content

---

## 2. Byte budget analysis: where the 14.48% gap lives

### 2.1 The B1 bucket: eliminated by architecture

In Prism v1, the collection layer (B1) costs ~6.30% of current bytes.
This is the transient learning cost, nonstationarity tracking loss, and
per-sample estimation noise of the online-adaptive entropy coder.

Under Route 3's multi-pass architecture:
- Pass 1 computes exact counts (zero estimation noise)
- Histograms are transmitted (zero adaptation cost)
- ANS codes with static probabilities (zero tracking loss)

**B1 is eliminated by construction.** The 6.30% gross / 2.5-4.5% realistic
bucket becomes 0% overhead. This is the single largest structural gain.

### 2.2 The B2 bucket: partially recovered

In Prism v1, per-image conditioning (B2) was measured at +1.86..+2.95
points of v0 per image but was unpayable under table economics.

Under Route 3:
- The MA-tree provides per-cluster conditioning (each cluster has its own
  histogram, which is a form of content-adaptive conditioning)
- The histogram transmission cost is ~0.0051 bpp per sample, which is
  negligible compared to the ~2.0-3.1% gross B2 bucket
- The E0 per-image margins (+1.86..+2.95 pts) should be partially
  recoverable through MA-tree clustering

Estimated recovery: 1.5-2.5% of current bytes (same as the realistic
ceiling from the E0 readout, but now with affordable transmission).

### 2.3 The B3/B5 buckets: reopened under new tokenization

Under ZFF binarization, predictor headroom (B3) and tokenization (B5)
were CLOSED. Under static ANS with hybrid-uint tokenization:
- The zero-mode pricing pathology disappears (ANS prices each symbol by
  its actual probability, not by a binary decomposition)
- Predictor improvements that shift mass off zero mode are no longer
  penalized
- GAP/W families may now be competitive (the confound from E1/S1 is removed)

This is a MEASURED question for the R3 phase. The R3 factorial trial
{MED, GAP, W} x {hybrid-uint, ZFF-control} under static ANS will price
this exactly. Expected range: 0-3% depending on whether the predictor
improvement survives the new tokenization.

### 2.4 The B6 bucket: orthogonal and stackable

Source decorrelation (B6) was measured at +20.32% WORSE under U1, but
that was a frequency-domain prediction test. Under Route 3, the
source remains in the spatial domain (MED prediction). B6 is orthogonal
and could be stacked later if Route 3 passes M2 but not M3.

### 2.5 Honest arithmetic

| bucket | v1 ceiling | Route 3 estimate | confidence |
|---|---|---|---|
| B1 (collection layer) | +5.81% realistic | eliminated (~6.30% recovery) | HIGH (architectural) |
| B2 (per-image conditioning) | +1.86..+2.95 pts/pool | +1.5-2.5% recovery | MEDIUM (MA-tree provides clustering) |
| B3 (predictor headroom) | -1.45% (CLOSED under ZFF) | 0-3% (REOPENED under ANS) | LOW (measured in R3) |
| B5 (tokenization) | -2.11% (CLOSED under ZFF) | 0-1% (new alphabet) | LOW (measured in R3) |
| **Total estimated** | | **~7.8-11.8% recovery** | |
| **Projected from e1** | | **~9.0-9.4 summed** | |

Starting from e1 = 10.1210 summed:
- Conservative (B1 + partial B2): 10.1210 x (1 - 0.078) = 9.33 summed
- Optimistic (B1 + B2 + some B3): 10.1210 x (1 - 0.118) = 8.93 summed

M2 gate: < 9.498 summed. Conservative lands at 9.33. **M2 PASS expected.**
M3 gate: < 8.655 summed. Optimistic lands at 8.93. **M3 at risk but
within reach if B3 delivers near its optimistic edge.**

The critical difference from all prior attempts: **B1 is eliminated by
architecture, not by measurement.** Every prior program tried to HARVEST
B1 through incremental table refinements and paid more in table bytes
than they gained. Route 3 removes B1 entirely by not adapting online.

---

## 3. The R-series measurement program

### 3.1 Principles

Same discipline as V/S/T/U:
- Offline first, zero container bytes until a gate passes
- Per-image primary scoring (I10)
- NET accounting (I12): payload + model overhead jointly
- Pins committed before measurement
- Dated CSVs named `2026-MM-DD-sandbox-r<phase>.csv`
- Failable self-checks
- Determinism byte-for-byte
- Fuzz + byte-exact round-trip always
- Final PR judged ONLY by `bench_gate.sh` in both units on fresh corpus

### 3.2 Phases

**R0: Harness extension (BLOCKING)**

Extend the V+S+T sandbox instrument with multi-pass infrastructure:
1. Two-pass encoder skeleton (pass 1: analysis, pass 2: coding)
2. MA-tree builder that outputs cluster assignments (not context ids)
3. Per-cluster histogram accumulator (34-symbol alphabet)
4. Histogram smoothing (pseudo-count geometric toward pooled prior)
5. Hierarchical delta histogram serializer + deserializer
6. ANS static-probability coder/decoder (interleaved rANS, 16 states)
7. Hybrid-uint tokenization profile (replacing ZFF)
8. New VB rails:
   - VB-multi-pass-roundtrip: encode->decode reproduces source byte-exact
   - VB-histogram-fidelity: transmitted histograms decode correctly
   - VB-ans-fidelity: ANS coding/decoding is bit-exact
   - VB-net-audit: NET = payload + model overhead on every row
9. Self-check: proves both verdict directions on pinned quad
10. Spec addendum 22 committed BEFORE any measurement: all constants pinned
    (tree depth cap, min samples per leaf, alphabet size, smoothing
    parameters, ANS state count, hybrid-uint escape ladder)

Exit condition: all VB rails green + dated reference CSV committed.
No R-phase verdict is valid without a green R0.

**R1: Multi-pass vs single-pass baseline (attacks B1)**

Measure the multi-pass architecture against the v1 single-pass baseline
on the pinned quad:
- FRAME-SINGLE: Prism v1 single-pass (existing production path)
- FRAME-MULTI: Route 3 multi-pass with MA-tree clustering + transmitted
  histograms + ANS coding, using the SAME predictor (MED) and SAME color
  transform (D4c trials from v1)

Parameters: K in {16, 32, 64, 128} clusters, effort levels 3/5/7.

**Gate**: FRAME-MULTI median NET beats FRAME-SINGLE median NET by
>= +5.0% on the quad (per I10). This is the B1 bucket: the collection
layer improvement from multi-pass should be substantial because it
eliminates the entire online adaptation cost.

**Sub-gates**:
- R1a: payload reduction >= +3.0% (the static ANS must be more efficient
  than online-adaptive coding)
- R1b: model overhead <= 0.02 bpp per sample (histograms + tree must be
  affordable)
- R1c: no image regresses by more than -1.0% (the clustering must not
  hurt smooth images)

**Failable self-check**: proves both gate directions on pinned quad.

**R2: MA-tree parameter optimization**

If R1 passes: sweep MA-tree parameters on the winning K:
- Tree depth: {5, 7, 10, 12}
- Min samples per leaf: {2048, 4096, 8192}
- Feature set: {QG+activity, QG+activity+position, full}

Gate: best configuration beats R1 winner by >= +0.5% median NET.
Fail: use R1 winner parameters.

**R3: Predictor-tokenization factorial (attacks B3+B5)**

Factorial trial: {MED control, GAP, W ensemble} x {hybrid-uint, ZFF
control under ANS} scored NET on the quad.

Bars (same as T3 but under the NEW multi-pass architecture):
- (i) Best non-MED family >= +1.50% median NET over MED under its
  winning tokenization, else GAP and W take third strike
- (ii) Tokenization main effect recorded

**R4: Composition + projection + gate check**

Compose all R-series winners per image by real NET bytes (L-C1). Project
corpus via formula 18.5 VERBATIM against the committed e1 CSV.

Proceed-to-format threshold: projected < 9.35 summed AND < 3.117
per-sample (2% margin under M2).

If threshold met: Architect blueprints the format program behind version
bump. Fresh dual-unit `bench_gate.sh` against REAL cjxl and WebP on full
Kodak-24. Byte-exact 24/24. Fuzz clean.

**R5: Reserve (only if R4 projects inside M3 reach but short of it)**

One-shot reserve mechanisms (each is a separate sub-phase with its own
gate):
- R5a: cross-band prediction from decoded LL to HF bands (parent-property
  conditioned; opens L-C7 reserve)
- R5b: extended predictor bank under ANS (GAP/W with max-error feedback;
  opens B3 fully)
- R5c: larger alphabet tokens (T_ESC = 8/16/32) to capture more of the
  residual distribution

Each gate: >= +1.0% median NET, no image worse than -0.5%. Third strike
dies forever.

### 3.3 Cascade triggers

If any R-phase fails its gate:
- R1 fails: Route 3 architecturally infeasible; cascade to Route 1
  (multi-pass with transmitted histograms but retaining Prism's residual
  pipeline) immediately
- R1 passes but R4 misses M2: report with full ledger; owner decides
  between Route 1 and honest closure
- R4 passes M2 but not M3: open R5 reserve; if R5 also fails, report
  with full ledger; owner decides between Route 1 and honest closure

### 3.4 Complexity

Encode: two O(N) passes (analysis + coding) + trial encodes (bounded by
effort ladder). Wall-clock: ~2x v1 encode (second pass is pure coding,
analysis pass is pure counting; both are O(N) with small constants).

Decode: O(N) with table lookups (ANS state transitions are O(1) per
symbol). Memory: O(K x alphabet + window), K <= 256, alphabet <= ~50
tokens.

All mechanisms O(1) amortized per sample. Decode stays mirror-exact by
construction: every adaptive element is either transmitted (histograms,
tree) or decoder-computable (cluster assignments from tree).

---

## 4. Invariants carried forward

I1-I14 from research-v2/v3/v4 carry verbatim. Added:

- **I15 (multi-pass primacy):** Route 3 requires a two-pass encoder.
  The analysis pass must produce identical cluster assignments and
  histograms as the coding pass would expect; determinism byte-for-byte
  is enforced by construction (same code path for both passes).

- **I16 (histogram affordability):** Total model overhead (tree +
  histograms) must not exceed 0.02 bpp per sample on the pinned quad.
  If overhead exceeds this bar, the clustering is too fine and K must
  be reduced.

- **I17 (ANS static-probability fidelity):** The ANS coder must produce
  bit-exact output for a given static probability table. No epsilon-
  adaptation or dynamic mixing is permitted in the R-series; this is
  measured separately.

---

## 5. Decision tree

| outcome | consequence |
|---|---|
| R0 fails (harness broken) | Fix and re-run; no verdict until green |
| R1 fails (< +5.0% NET) | Route 3 architecturally infeasible; cascade to Route 1 |
| R1 passes, R4 threshold met | Architect blueprints format program behind version bump |
| R4 projects into M3 reach | open R5 reserve once; recompose; then format |
| R4 passes M2 but not M3 | owner decides: Route 1 or honest closure |
| everything fails | full negative ledger; honest closure at achieved level |

---

## 6. What Route 3 is NOT

Route 3 is NOT:
- An incremental improvement on Prism v1 (it replaces the entropy backend)
- A neural/learned codec (L-C9: no external libraries)
- A multi-resolution wavelet codec (L-C7: not transform-first)
- A copy of JXL (it is a different codec with similar architectural
  principles; the specifics differ)

Route 3 IS:
- A clean-slate redesign of Prism's entropy backend
- A multi-pass architecture with transmitted histograms
- An ANS-coded codec with static probabilities
- The architectural path to M3 that the research recommends

---

## 7. Handoff

Next pipeline step: **Architect** (`{"action":"architect"}`). Blueprint
inputs: this document (Route 3 architecture; R-series gates; I15-I17
invariants; addendum 22 skeleton; wire format v2). The Architect's first
deliverables:
1. Spec addendum 22 with ALL pinned constants (tree depth cap, min samples,
   alphabet size, smoothing params, ANS state count, hybrid-uint escape
   ladder, all R-gates verbatim)
2. R0 harness blueprint with failable self-check list
3. Wire format v2 specification (byte-level)

NO measurement slice may precede addendum 22. The binding end gates
remain M2 AND M3 in both units on a fresh corpus measurement against real
cjxl output; nothing in this document relaxes the freeze or the standing
rule that no success claim leaves the lab without a reproducible
measurement stated in both units.

Handoff decision: `{"action":"architect"}`.

- Dr. Mob, the Researcher
