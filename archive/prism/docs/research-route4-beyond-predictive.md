# Research: Option 2 - Beyond-Predictive Paradigm (integer wavelet lifting + bitplane ANS, with learned context augmentation)

- **Issue:** #130 (Owner directive 2026-08-28T06:24:38Z: continue without pause;
  proceed with Option 2, Exotic Beyond-Predictive Paradigm; dispatch Dr. Mob to
  research learned neural context models OR integer wavelet lifting with bitplane
  ANS coding; model squad upgraded to hy3-free / mimo-v2.5-free)
- **Role:** Dr. Mob, the Researcher
- **Trigger:** `/oc research` dispatch on #130, 2026-08-28T06:32Z (Maintainer
  cascade after Owner authorization of Option 2)
- **Inputs:** the complete negative ledger (`research-complete-negative-ledger.md`),
  all prior specs (v2-clean-slate, v3-content-clustering, v4-transform-domain,
  route3-modular-redesign, route1-acoder-refinement, route2-hybrid-uint), all
  measurement CSVs under `prism/benchmarks/results/`, `progress/130-prism-*`,
  the Builder decision records for R1/R1-1/R2-1 FAILs, and the bound gates in
  `bench_gate.sh`.
- **Scope of THIS doc:** the complete research specification for Option 2, the
  beyond-predictive paradigm. This is a paradigm shift OUT of the single-pipeline
  predictive-residual domain that every prior program (C through U, then
  R3/R1/R2) exhausted. It combines the Owner's two suggested mechanisms into one
  coherent design: integer wavelet lifting for multiresolution decorrelation,
  bitplane ANS coding for the new conditional structure, and a fixed learned
  (neural or enriched) context model as the M3-closing augmentation. Handoff:
  `{"action":"architect"}`.

Units discipline unchanged: every number states its unit; on Kodak-24
(C=3) summed = 3 x per-sample exactly; gates compare BOTH units via
`benchmarks/bench_gate.sh`; no success claim without a fresh measurement.
No em dashes anywhere in this document or its descendants.

---

## 0. Executive summary

All prior attempts stayed inside the **predictive-residual domain**: compute a
per-pixel prediction (MED, GAP, W, ensemble), take the residual, and code it as
a single symbol per pixel under an online-adaptive context model. Prism v1 (e1)
reached 10.1210 summed / 3.3737 per-sample and could not be improved because the
MED residual is itself a near-random, high-entropy scalar whose conditional
entropy floor (given any tractable context) sits around 3.37 bpp. Every richer
context model either (a) cost more in transmitted tables than it saved
(table-economics law: V1, S1, S3, T1a, T2a, T3) or (b) reduced context
granularity and lost to v1's 343-context model (R1/R1-1, R3). Transform-domain
prediction failed for the domain-mismatch reason (U1: +20.32% worse).

**The beyond-predictive paradigm moves the work from the prediction step to the
representation step.** Instead of predicting pixel values, we:

1. Apply a reversible integer wavelet lift (multiresolution decorrelation).
2. Code the wavelet coefficients bitplane-by-bit, where each bit's context is
   the SIGNIFICANCE STATE of a causal neighborhood PLUS the parent coefficient's
   significance state (spatial orientation tree). This context is a *fixed,
   small, online-adapted* function: zero transmitted tables, so the
   table-economics law does not re-apply.
3. Optionally replace the hand-designed significance context with a FIXED,
   baked-in learned model (neural or enriched) that predicts p(bit) from the
   causal region, again with zero per-image side info.

Why this breaks the ceiling where prediction could not: a reversible transform
preserves total entropy but re-partitions it into a representation whose
conditional entropy given a *local tractable context* is far lower than that of
the MED residual. The significance of a detail coefficient is highly predictable
from its parent (which is typically also near-zero); once significant, only the
few significant coefficients carry near-uniform refinement bits. This is exactly
why SPIHT / EBCOT / JPEG 2000 lossless beat scalar predictive coders. It is a
structural gain, not a table-economics illusion, because the context model is
fixed and learned online.

Honest arithmetic from e1 = 3.3737 per-sample:
- X1 + X2 (wavelet + classical bitplane, training-free): ~2.95 to 3.05
  per-sample -> **M2 (3.166) clears with margin**; lands ~2-5% above M3 (2.885).
- X3 (learned/augmented context): ~2.80 to 2.90 per-sample -> **M3 within reach**
  if the learned model is adequately trained.

Cascade: X2 alone targets M2; X3 (data-gated) targets M3. If X3 cannot be
trained (no owner-authorized corpus), we land at M2 and report, per the
Anti-Surrender mandate, for the owner's next decision (obtain a training corpus
or honest-closure-at-M2).

---

## 1. The scientific diagnosis: resolving the entropy-conservation paradox

A reversible (integer, invertible) transform conserves the *joint* Shannon
entropy H of the whole image. A naive reading would conclude "wavelets cannot
reduce entropy, so they cannot help." This reading is wrong and the lab must not
be misled by it. What a practical coder pays is not H(total) but the sum of
conditional entropies -sum_i -log2 p(symbol_i | context_i). The transform changes
which context is available and how informative it is.

### 1.1 MED residual coding (the exhausted domain)

For pixel x with MED predictor p, residual r = x - p. Context = the 343
residual-diff classes + 16 class priors of v1. The coded symbol is the single
scalar r (magnitude + sign). The conditional entropy H(r | 343-context) has a
floor near 3.37 bpp for Kodak: r is a high-entropy scalar (its distribution is
unimodal but wide), and no local context predicts its exact value well. Richer
contexts (more tables) lost to table economics; fewer contexts (R1/R3) lost to
granularity. The signal is simply too random per-symbol.

### 1.2 Wavelet + bitplane coding (the new domain)

After a reversible wavelet lift, each coefficient c lives in a subband. Bitplane
coding processes c bit-by-bit from MSB to LSB. For each bit we condition on:

- The significance state (already 1?) of the 8 spatial neighbors in the same
  subband (spatial context).
- The significance state of the parent coefficient in the next-coarser subband at
  the same spatial location (parent context).
- The subband orientation (LL / HL / LH / HH).

The conditional entropy H(c_bit | neighbor-sig + parent-sig + orientation) is
dramatically lower than H(MED residual | 343-context) for three concrete
reasons:

1. **Energy compaction (N1).** Most detail coefficients are exactly zero or
   tiny. The event "this coefficient is insignificant at this bitplane" is
   highly predictable, giving very low-entropy significance flags.
2. **Parent-child structure (N2).** A coefficient is overwhelmingly likely
   significant only if its parent is significant (and vice versa for
   insignificance). This cross-scale dependency is NOT captured by any
   pixel-domain context model; it is the central win of bitplane coding.
3. **Magnitude refinement is cheap (N3a).** Once a coefficient becomes
   significant, its remaining refinement bits are nearly uniform random, but
   they apply to only the few significant coefficients, so their total entropy
   contribution is small.

The total bytes are lower not because entropy was created or destroyed but
because the *conditional* entropy the coder actually pays is lower. This is the
same principle that makes JPEG 2000 lossless, SPIHT, and EBCOT beat CALIC/JPEG-LS
on natural images.

### 1.3 Why table-economics does NOT re-apply here

Every failed prior refinement paid for *content-adaptive transmitted tables*
(per-group, per-image, per-cluster). In the beyond-predictive design the context
model is a **fixed function** (a small, bounded set of contexts derived from
neighbor/parent significance, or a fixed baked-in neural net). The decoder
recomputes the same context online as it decodes; there are no transmitted
histograms, no MA-tree leaves, no per-cluster tables. This is structurally
identical to v1's 343-context online-adaptive model that already works. The
table-economics law applies to *transmitted content-adaptive side info*, not to
a fixed, learned-offline, zero-per-image-cost context function. This distinction
is the architectural key and is why Route 3/R1 (which transmitted histograms and
MA-trees) failed while this paradigm can succeed.

---

## 2. The paradigm: integer wavelet lifting + bitplane ANS coding

### 2.1 High-level pipeline

```
ENCODE:
  0. Color: YCoCg-R reversible (adopted D4c family, trial-selected by bytes).
  1. Lift: per plane, integer wavelet transform, L levels (e.g. 5).
           Produces LL + (HL, LH, HH) at each level.
  2. Bitplane code each subband, coarse-to-fine, MSB-to-LSB:
     For each bitplane b (from max bit down to 0):
       Pass A (significance propagation): for each INSIGNIFICANT coefficient,
         code significance bit (becomes 1 if it has any bit >= b), context =
         neighbor-sig + parent-sig + orientation. On becoming significant,
         code the sign bit (context = same).
       Pass B (magnitude refinement): for each ALREADY-significant coefficient,
         code the refinement bit at plane b, context = neighbor-sig + orientation.
       Pass C (cleanup): same as A but for coefficients not covered by A's
         causal window; ensures full coverage.
  3. Transmit: tiny header (filter id, L, orientation sizes, color id) only.
     No histograms, no trees, no per-cluster tables.

DECODE (mirror-exact by construction):
  0. Parse header (filter, L, color).
  1. For each subband/bitplane/pass, decode the bit using the SAME context
     (which the decoder reconstructs from already-decoded coefficients),
     apply inverse bitplane, then inverse lift, then inverse color.
```

### 2.2 Color transform (reuse, adopted)

YCoCg-R reversible, with the D4c rotation trials (ids 7..11) selected per image
by real coded bytes (L-C1). Applied BEFORE the lift so the three planes are
decorrelated and each is lifted independently. Chroma subbands can additionally
be conditioned on luma subbands (N4, see section 4) as a later reserve phase.

### 2.3 Integer wavelet lifting (reversible, lossless)

Three candidate filters, all integer-to-integer (lifting scheme), all exactly
reversible (rounding in the lift steps; the inverse lift recovers the exact
integer input):

| filter | description | energy compaction | rounding overhead | role in X1 |
|---|---|---|---|---|
| Haar (2/2) | simplest integer lift | low | none | baseline control |
| Le Gall 5/3 | two lifting steps, integer | good | minimal | PRIMARY (J2K lossless standard) |
| Reversible 9/7 (TS 9/7 / CDF integer) | four lifting steps, integer | best | slightly higher | sweep candidate |

The lift operates on the full plane (not 8x8 blocks), with symmetric
border extension (replicate or reflect). Decomposition levels L in {4, 5, 6}
pinned for the sweep; L = 5 is the default for 768x512 (subbands down to
24x16). The LL subband at the coarsest level is coded first (it holds most
energy and is coded with the same bitplane machinery, context = spatial only
since it has no parent).

Reversibility proof requirement (I26): a round-trip lift.inv(lift(x)) == x must
hold for ALL integer inputs in [0, 255] (and for the coefficient range after
color transform). The Builder must add a VB rail proving this byte-exact for
the chosen filter before any X-phase is valid. This is NOT the U1 trap: U1 used
a NON-reversible 8x8 DCT (|fwd(inv(x))-x| <= 1, explicitly not byte-exact) and
then predicted coefficients in the frequency domain. Here the lift is exactly
reversible and we do NOT predict coefficient values; we code bits with a
significance context. Different transform, different coding, different math.

### 2.4 Bitplane coding with EBCOT-style passes and a fixed adaptive context

The coder visits coefficients in a fixed deterministic order (e.g., raster
within each subband, subbands coarse-to-fine). Each bit is one ANS symbol with
a context derived from a FIXED function of the local significance pattern. The
context function (pinned, I28) is:

```
ctx = ORIENTATION_ID            # 0=LL,1=HL,2=LH,3=HH   (2 bits)
    + PARENT_STATE * 4          # 0/1 (does the parent at same loc exist & is significant)
    + SIG_COUNT_BUCKET * 8      # count of significant 8-neighbors: 0,1,2,3,4+  (3 bits)
```

This yields at most 4 * 2 * 5 = 40 base contexts, plus separate context pools
for sign bits and for refinement bits. We pin a total context pool of 128
(fixed, shared across subbands, extended by orientation offset). Each context
maintains an adaptive probability via the EXISTING interleaved rANS
(`rans.h`) with per-context EMA (shift-5, same as ACoderV2), so no tables are
transmitted and adaptation is online. This directly reuses v1's proven adaptive
backend and respects L-C6 (damping) and L-C5 (the significance/zero event is the
first-class, cheaply-coded symbol).

The three-pass structure (significance propagation, magnitude refinement,
cleanup) is the EBCOT ordering. It is not required for correctness (a single
pass over all bits in MSB-to-LSB order also works); it exists to maximize the
usefulness of the causal context. X2 will measure both orderings; the pinned
default is the three-pass ordering.

### 2.5 ANS backend (reuse, no transmitted tables)

Reuse `prism/src/codec/rans.cpp` (interleaved rANS, 16 states) exactly as v1
uses it, but with the bitplane context model instead of the 343 residual-diff
contexts. Per-context probability tables are adapted online (decoder mirrors
encoder by reconstructing the same context from decoded bits). Zero transmitted
probabilities -> zero table-economics exposure (I27). This is the single most
important structural difference from Route 3 (which transmitted histograms and
paid 2.6x overhead) and from Route 1 (which reduced contexts and lost
granularity).

### 2.6 Wire format (version 3, minimal side info)

```
PRISM v3 Container Layout (little-endian):
[PRSM magic]        4 bytes
[version]           1 byte  = 3
[width]             4 bytes u32
[height]            4 bytes u32
[bit_depth]         1 byte
[num_channels]      1 byte
[color_transform_id]1 byte  (D4c family)
[filter_id]         1 byte  (0=Haar,1=5/3,2=9/7)
[levels]            1 byte  (L)
[flags]             1 byte
[subband_sizes]     variable: for each subband, (w,u16)+(h,u16)  (tiny)
[ans_stream]        variable: interleaved rANS of all bitplane symbols
[crc32]             u32 over all above
```

Estimated header overhead: filter id + levels + subband sizes + color id =
well under 64 bytes per image, i.e. < 0.0002 bpp. No histograms, no trees, no
model blob. This is the structural opposite of Route 3's ~2000-byte model
section. The table-economics law simply has nothing to act on.

---

## 3. The learned context augmentation (Option 2 part B)

The Owner listed "learned neural context models" as one of the two candidate
mechanisms. This section specifies it as the M3-closing augmentation (X3), and
shows why, unlike the failed predictive mechanisms, it is structurally safe.

### 3.1 Core idea: a fixed, baked-in context function

In section 2.4 the bitplane context is a hand-designed fixed function of
neighbor/parent significance. A learned context model replaces (or augments)
this fixed function with a predictor p(bit=1 | causal_region) produced by a
small fixed-topology network or enriched feature extractor. Crucially:

- The network weights are a CONSTANT baked into the decoder binary (serialized
  from an offline training step). They are NOT transmitted per image.
- Therefore per-image NET side info = 0 (L-C2 satisfied: only payload + tiny
  header counted). The decoder and encoder share the constant.
- This is structurally identical to v1's 343-context model (a fixed function),
  just a more powerful one. It does NOT trip table-economics, which only bites
  *transmitted content-adaptive* side info.

### 3.2 Neural implementation and the training-data gate (X3a)

A small autoregressive CNN: input = a causal window of already-decoded
coefficient bits and significance states (and parent state) around the current
coefficient; a few conv layers + a final sigmoid output p(bit=1). Coded with
rANS using that p. The decoder runs the same inference.

**The data gate (honest, binding):** to be better than the hand-designed
context, the net must be trained on a corpus of natural images. The lab's
Kodak-24 is the TEST set; training on it is circular. Therefore X3a requires
owner authorization to fetch a public training corpus (e.g., CLIC, DIV2K, or an
ImageNet subset) at research/training time, train offline in Python, and emit a
C++ constant header of the weights. No external compression library is linked
(L-C9 satisfied: training is an offline research step, the decoder ships only a
constant tensor and in-house inference). If the owner does NOT authorize a
corpus, X3a is SKIPPED and we fall back to X3b.

### 3.3 In-house enriched adaptive context (X3b, data-free fallback)

If X3a is gated out, X3b enriches the hand-designed context (section 2.4)
WITHOUT external data: add fixed (non-learned) features such as
run-length-of-zeros along rows/columns, the local gradient of the significance
field, and the grandparent (two-level-up) state. These are fixed functions of
the decoded neighborhood, learned online via the same adaptive rANS. X3b is
expected to recover part of N3 (learned-context gain) training-free, pushing
from ~3.0 toward ~2.9. It is the default M3 lever if no corpus is authorized.

### 3.4 Why this is NOT a rehash of the failed predictors

S1/GAP/W and E1 tried to change the *pixel predictor* under ZFF and failed
(ZFF pathology + context-granularity). Here the learned model predicts a
*bitplane symbol probability*, not a pixel value, over a multiresolution
representation whose conditional structure is exploitable. The coding backend
is adaptive ANS with a fixed context (safe), not transmitted histograms. The
domain, the symbol, and the economics are all different from every rejected
mechanism.

---

## 4. Where the gap lives in the new paradigm (buckets N1-N4)

Restated from e1 = 3.3737 per-sample. These buckets are NEW (they live in the
beyond-predictive domain, not the predictive-residual domain where B1-B6 were
measured and closed).

| bucket | description | expected gain from e1 | status | training-free? |
|---|---|---|---|---|
| N1 | Subband energy compaction + significance structure (wavelet + bitplane with spatial context) | ~8-11% | primary (X1+X2) | YES |
| N2 | Cross-scale parent-child context (spatial orientation tree) | +2-4% on top of N1 | primary (X2) | YES |
| N3 | Learned/augmented bitplane context model (X3a neural or X3b enriched) | +2-5% | augmentation (X3) | X3b YES; X3a needs corpus |
| N4 | Chroma-subband conditioned on luma-subband (cross-band in transform domain) | +1-2% | reserve (X5) | YES |

Honest arithmetic:

| composition | per-sample | vs M2 (3.166) | vs M3 (2.885) |
|---|---|---|---|
| e1 baseline | 3.3737 | FAIL (+6.15%) | FAIL (+14.48%) |
| X1+X2 (N1+N2) | ~2.95-3.05 | **PASS** | short by ~2-5% |
| + X3b (enriched, free) | ~2.88-2.95 | PASS | borderline |
| + X3a (neural, corpus) | ~2.80-2.90 | PASS | **PASS (if trained)** |

The conservative path (X1+X2, training-free) is expected to clear M2 with
comfortable margin and land within a few percent of M3. X3 is the dedicated
M3-closing lever. The lab must measure, not assume: the binding end gate is the
fresh dual-unit `bench_gate.sh` on full Kodak-24 against REAL cjxl and WebP.

---

## 5. The X-series measurement program

Named the X-series (eXotic beyond-predictive), distinct from the prior
R-series. Discipline identical to V/S/T/U/R:

- Offline first, zero container bytes until a gate passes.
- Per-image primary scoring (I10, carried).
- NET accounting (I12 / L-C2): payload + header jointly; a baked-in model
  contributes ZERO per-image NET (it is a decoder constant).
- Corpus sha-pin verified BEFORE every measurement (L-C8).
- Dated CSVs `2026-MM-DD-sandbox-x<phase>.csv`.
- Failable self-checks proving both directions.
- Determinism byte-for-byte; fuzz + byte-exact round-trip always.
- Final PR judged ONLY by `bench_gate.sh` in both units on fresh full Kodak-24.

### 5.1 Phases

**X0: Harness extension (BLOCKING)**

Extend the codec with the beyond-predictive path, behind a `FRAME-WAVELET`
mode flag, without touching the v1 production path:

1. Reversible integer wavelet lift (Haar, 5/3, 9/7) per plane + inverse, with
   a VB rail proving `lift.inv(lift(x)) == x` for all bytes (I26).
2. Bitplane coder: three-pass (SP/MR/CL) symbol emitter + decoder, context from
   section 2.4 (fixed function, online-adaptive rANS).
3. ANS backend reuse (`rans.cpp`) with the bitplane context pool (128 fixed).
4. Header serializer/parser for format v3 (section 2.6).
5. New VB rails:
   - VB-X-WAVELET-ROUNDTRIP: encode -> decode reproduces source byte-exact.
   - VB-X-LIFT-FIDELITY: lift.inv(lift(x)) == x for all inputs.
   - VB-X-ANS-FIDELITY: ANS coding/decoding bit-exact for a given context.
   - VB-X-NET-AUDIT: NET = payload + header on every row.
6. Self-check: proves both verdict directions on the pinned quad.
7. Spec addendum 25 committed by the Builder BEFORE any measurement: all
   constants pinned (filter candidates, L set, bitplane pass order, context
   function, context pool size, ANS state count, X-gates verbatim).

Exit: all VB rails green + dated reference CSV committed. No X-phase verdict is
valid without a green X0.

**X1: Wavelet decorrelation vs spatial residual (attacks N1)**

Hold the CODER constant (use the bitplane coder for both) and compare:
- FRAME-SPATIAL: v1 MED residuals, coded bitplane-style (control for coder).
- FRAME-WAVELET: wavelet coefficients, coded bitplane-style.

Gate: FRAME-WAVELET median NET beats FRAME-SPATIAL median NET by >= +2.0% on
the pinned quad (the decorrelation must reduce the coded bytes of the coefficient
stream). Sub-gate: round-trip byte-exact (I26). Fail: lifting does not
decorrelate for this corpus; investigate filter (the 9/7 sweep) before
abandoning.

**X2: Bitplane context vs v1 baseline (attacks N1+N2, targets M2)**

Frame: FRAME-WAVELET with the full parent-aware bitplane context (section 2.4)
vs e1 (Prism v1 production, 10.1210 summed / 3.3737 per-sample) on the pinned
quad (kodim01/13/05/19, sha-pinned).

Gate (primary, per I10): FRAME-WAVELET median NET beats e1 by >= +8.0% on the
quad (10.1210 x 0.92 = 9.31 summed < 9.498 M2 summed; this is the M2 target
with a 2% margin).

Sub-gates:
- X2a: mean summed on quad < 9.498 AND mean per-sample < 3.166 (M2 in both
  units on the quad).
- X2b: model/header overhead <= 0.002 bpp per sample (format v3 is tiny; proves
  table-economics does not re-apply).
- X2c: no image regresses by more than -1.0% vs its own e1 bytes (the wavelet
  path must not hurt any image).
- X2d: decode time <= 3x v1 decode time (bitplane + lift is more work but must
  stay practical).

Failable self-check: proves both gate directions on the pinned quad.

**X3: Learned/augmented context (attacks N3, targets M3)**

Conditioned on X2 passing. Two sub-tracks measured in order:
- X3b (enriched adaptive context, data-free): augment the section 2.4 context
  with run-length / significance-gradient / grandparent features; adaptive rANS.
  Gate: median NET >= +1.5% over the X2 winner (pushes ~3.0 -> ~2.9).
- X3a (neural, ONLY if owner authorizes a training corpus): fixed CNN context
  model, weights baked as a constant. Gate: median NET >= +1.5% over the X3b
  winner (pushes ~2.9 -> ~2.8). If no corpus authorized, X3a is SKIPPED and the
  run proceeds with X3b only; this is recorded honestly, not hidden.

Sub-gates for X3: round-trip byte-exact (the baked model is deterministic on
both ends); no image regresses > -0.5% vs the X2 winner.

**X4: Composition + projection + binding gate**

Compose all X-series winners per image by real NET bytes (L-C1). Run the FULL
Kodak-24 corpus (all 24, sha-pinned) with `prism bench` and judge ONLY by
`bench_gate.sh` in BOTH units against REAL cjxl (M3: < 8.655 summed / < 2.885
per-sample) and REAL WebP (M2: < 9.498 summed / < 3.166 per-sample).

- If X4 clears M2 but not M3: open X5 reserve; if X5 also fails or X3a was
  gated out, report full ledger; owner decides (authorize corpus for X3a, or
  honest-closure-at-M2).
- If X4 clears BOTH: proceed to format-stable PR; the freeze on #130 lifts for
  the merged milestone (Refs #130).
- If X4 misses M2: full negative ledger; Anti-Surrender mandate -> re-examine
  assumptions, do NOT silently close.

**X5: Reserve (only if X4 inside M3 reach but short)**

One-shot reserve mechanisms (each its own gate, >= +1.0% median NET, no image
worse than -0.5%; third strike dies):
- X5a: chroma-subband conditioned on luma-subband (N4 cross-band in transform
  domain; this is the parent-aware, transform-domain counterpart that satisfies
  L-C7's "parent-properties included by design" reopening condition, unlike the
  parent-blind C4/C5 rejections).
- X5b: larger decomposition depth sweep (L up to 6) if X2 left margin on the
  table.
- X5c: arithmetic-only refinements to the context pool size (64/128/256 fixed,
  no transmitted tables).

### 5.2 Pinned constants (carried to addendum 25 verbatim before any X-measurement)

- Wavelet filters: {Haar, 5/3, 9/7}. Default primary = 5/3.
- Levels L in {4, 5, 6}. Default = 5.
- Bitplane pass order: {three-pass SP/MR/CL, single-pass MSB-to-LSB}. Default =
  three-pass.
- Context function: ORIENTATION_ID (2b) + PARENT_STATE (1b) + SIG_COUNT_BUCKET
  (3b); separate pools for sign and refinement. Context pool size = 128 fixed.
- ANS: interleaved rANS, 16 states, per-context EMA shift-5 (reuse v1).
- X-gates: X1 >= +2.0% decorrelation; X2 >= +8.0% vs e1 (M2 target); X3 >=
  +1.5% over prior winner; X4 = fresh dual-unit bench_gate.sh (M2 and M3 both
  units). All stated in both units where applicable.

---

## 6. Invariants carried forward and added

I1-I24 from prior specs carry verbatim. Added:

- **I25 (beyond-predictive primacy):** Option 2 moves coding from the
  predictive-residual domain to the wavelet+bitplane domain. The pixel
  predictor (MED/GAP/W) is NOT the primary mechanism; the multiresolution
  representation and its bitplane significance context are.

- **I26 (reversible lift requirement):** The integer wavelet lift MUST satisfy
  lift.inv(lift(x)) == x for ALL integer inputs in the coded range, proven by a
  VB rail before any X-phase. This is mandatory for lossless byte-exact
  round-trip and is the explicit guard against the U1 non-reversible-DCT trap.

- **I27 (no transmitted tables):** The bitplane context model is a FIXED
  function (hand-designed or baked-in learned), adapted online with zero
  transmitted probabilities/trees/histograms. Per-image NET side info is
  limited to the tiny format-v3 header. This is what keeps the table-economics
  law from re-applying.

- **I28 (parent-aware context, L-C7 compliance):** Every coefficient bit is
  conditioned on its parent's significance state (spatial orientation tree). The
  lifting work is therefore NOT parent-blind, directly addressing the failure
  mode that killed C4/C5/Squeeze and satisfying L-C7's reopening condition. The
  Owner directive 2026-08-28T06:24:38Z explicitly authorizes this paradigm,
  lifting it out of the V5 reserve into a first-class program.

- **I29 (learned-model side-info rule):** A baked-in learned context model
  contributes ZERO per-image NET (it is a decoder constant). If a per-image
  transmitted model is ever introduced, it MUST be NET-accounted (L-C2) and the
  table-economics invariant I27 is void for that track.

- **I30 (honest M3 reporting):** If X3a is gated out for lack of a training
  corpus, the X4 result is reported as "M2 PASS / M3 PENDING corpus
  authorization," never as "M3 PASS." No success claim leaves the lab without a
  fresh both-units measurement.

---

## 7. Complexity

Encode: color (O(N)) + lift (O(N)) + bitplane coding (O(N) symbols, each O(1)
ANS). Wall-clock ~2-4x v1 (lift + multi-pass-per-bitplane scanning), within the
L-C8 5x phase guard. Decode: O(N) with table lookups and a fixed number of
lift passes; mirror-exact by construction. Memory: O(subband sizes + 128
contexts), negligible. X3a neural inference adds a small fixed number of conv
operations per symbol; decoded on both ends from the same constant weights.

---

## 8. Decision tree / cascade

| outcome | consequence |
|---|---|
| X0 fails (harness broken) | Fix and re-run; no verdict until green |
| X1 fails (< +2.0% decorrelation) | Try 9/7 filter; if still fail, report: lifting does not decorrelate this corpus |
| X2 fails (< +8.0% vs e1, or X2a M2 miss) | Analyze: if N1/N2 underdeliver, report full ledger; owner decides next paradigm |
| X2 passes (M2 on quad) | proceed to X3 |
| X3b passes, X3a gated out | proceed to X4 with enriched context; M2 expected, M3 borderline |
| X3a passes (corpus authorized) | proceed to X4; M3 expected |
| X4 clears M2 only | open X5; if still short, report M2-PASS/M3-PENDING |
| X4 clears M2 AND M3 | format-stable PR; Refs #130; freeze lifts on merge |
| everything fails | full negative ledger; Anti-Surrender re-examination, not silent close |

---

## 9. Relationship to prior measurements (why this is new, not a re-litigation)

- **U1 (DCT-domain MED, +20.32% worse):** used a NON-reversible 8x8 DCT and
  predicted coefficient VALUES from spatial neighbors (domain mismatch). This
  research uses a REVERSIBLE lift (I26) and codes coefficient BITS with a
  significance context (no value prediction in frequency domain). Different
  transform, different symbol, different coding. Not a re-run of U1.
- **C4/C5 (Squeeze/lifting REJECTED):** the lift output was coded with the
  SAME parent-blind MED-residual + 343-context model, so the multiresolution
  structure was never exploited. This research couples the lift with a
  PARENT-AWARE bitplane context (I28), which is the exact structural delta L-C7
  requires. Not a re-run of C4/C5.
- **Route 3 / Route 1 (transmitted histograms + MA-tree, FAIL):** those paid
  for content-adaptive transmitted side info and hit table-economics (R1:
  +2.27%; R3: 2.6x overhead). This design transmits ZERO histograms/trees
  (I27). Different economics, different outcome class.
- **Route 2 (hybrid-uint, +1.80% worse):** changed only the binarization of the
  MED residual. This research changes the DOMAIN (wavelet) and the CODING
  (bitplane), not the binarization of a residual. Different lever.
- **L-C7:** satisfied (parent-aware by design + owner authorization). **L-C9:**
  satisfied (in-house lift, coder, ANS; learned weights are a constant, no
  external lib). **L-C5:** satisfied (significance/zero is the first-class
  cheap symbol). **L-C4:** not triggered (bitplane coding is not a
  reparametrization of the residual stream). **L-C3:** not triggered (no new
  causal mixer; adaptive rANS is v1's adopted backend).

---

## 10. Handoff

Next pipeline step: **Architect** (`{"action":"architect"}`). Blueprint inputs:
this document (beyond-predictive paradigm; wavelet filters; bitplane passes;
parent-aware fixed context; format v3; X3 learned/augmented context with the
data gate; X-series gates X0-X5; I25-I30 invariants; pinned constants for
addendum 25). The Architect's first deliverables:

1. Spec addendum 25 with ALL pinned constants (filters, L, pass order, context
   function, context pool size, ANS config, X-gates verbatim).
2. X0 harness blueprint with the failable self-check list (lift reversibility
   rail mandatory).
3. Wire format v3 specification (byte-level) and the `FRAME-WAVELET` flag.

NO measurement slice may precede addendum 25. The binding end gates remain M2
AND M3 in both units on a fresh corpus measurement against real cjxl output;
nothing in this document relaxes the freeze or the standing rule that no success
claim leaves the lab without a reproducible measurement stated in both units.

Handoff decision: `{"action":"architect"}`.

- Dr. Mob, the Researcher
