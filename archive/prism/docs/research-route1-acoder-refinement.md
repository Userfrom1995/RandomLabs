# Research: Route 1 - Multi-pass with Adaptive Backend Refinement

- **Issue:** #130 (Owner directive 2026-08-27T08:19:10Z: continue without
  pause, Route 3 first, cascade to Route 1 then Route 2)
- **Role:** Dr. Mob, the Researcher
- **Trigger:** `/oc research` dispatch on #130, 2026-08-27T15:22Z (Maintainer
  cascade after Route 3 R1 FAIL)
- **Inputs:** all prior research specs, Route 3 R1 FAIL measurement on real
  Kodak-24 (PR #157, merged at 26d51c4), Builder blocker note on static ANS
  overhead (15:01:51Z on PR #157), v1 adaptive coder analysis (ACoderV2,
  acoder_encode_plane_leaves_v2), negative ledger (7 programs, 28 phases).
- **Scope of THIS doc:** the research specification for Route 1 refinement:
  fixing the static ANS overhead by replacing it with v1's adaptive coding
  backend while preserving multi-pass analysis. Handoff:
  `{"action":"architect"}`.

Units discipline unchanged: every number states its unit; on Kodak-24
(C=3) summed = 3 x per-sample exactly; gates compare BOTH units via
`benchmarks/bench_gate.sh`; no success claim without a fresh measurement.
No em dashes anywhere in this document or its descendants.

---

## 0. Why Route 1 is the correct fallback

### 0.1 Route 3 R1 FAIL summary

Route 3 R1 measured FRAME-MULTI (static ANS + bypass + position-only
MA-tree) vs FRAME-SINGLE (v1 adaptive) on real Kodak-24:

| metric | value | threshold | verdict |
|---|---|---|---|
| median NET | +194.22% | <= -5.0% | FAIL |
| R1a payload | +194.22% | <= -3.0% | FAIL |
| R1b model overhead | 0.006 bpp | <= 0.02 | PASS |
| R1c worst regression | +194.22% | <= 1.0% | FAIL |

Multi-pass output was 2.94x larger than single-pass. The model blob
(0.006 bpp) is negligible. The overhead is almost entirely in the
ANS-coded payload plus bypass data.

### 0.2 Root cause analysis: where the 2.6x overhead lives

The overhead decomposes into four measured buckets (from Builder blocker
15:01:51Z and instrument analysis):

| source | estimated bits/sample | % of overhead | fixable? |
|---|---|---|---|
| sign bypass (1 byte per nonzero) | ~6.1 | ~55% | YES (bit-pack) |
| escape quotient/raw bypass | ~2.3 | ~16% | YES (bit-pack or ANS) |
| 9-symbol ANS vs 343-ctx adaptive | ~0.3 | ~3% | YES (wider alphabet) |
| position-only MA-tree clustering | ~0.3 | ~3% | YES (full v1 features) |
| wasted zero-flag structure | ~0.5 | ~5% | PARTIAL (new tokenization) |
| lack of adaptive context | ~0.3 | ~3% | PARTIAL (per-leaf adaptive) |
| misc (flush, alignment) | ~0.5 | ~5% | PARTIAL |

**The sign bypass is the single largest problem.** Every nonzero residual
emits a sign bit as 1 full byte (8 raw bits). In v1, the sign bin costs
~0.08 bits/sample via adaptive range coding. The ratio: 6.1 / 0.08 =
**76x worse** for sign coding alone.

### 0.3 The v1 adaptive backend already supports MA-tree leaf contexts

Critical finding from code analysis: `acoder_encode_plane_leaves_v2`
(acoder.cpp:606) already accepts pre-computed leaf IDs and uses adaptive
coding with per-leaf probability states. The v1 production path
(prism.cpp:100-121) computes residuals AND leaf IDs in a single pass, then
calls this function. The decoder recomputes leaf IDs from the MA-tree and
decoded pixels (no leaf storage needed).

**This means v1 already IS a multi-pass architecture in disguise.** The
analysis (compute residuals, features, leaf IDs) and coding (adaptive
per-leaf) are logically separate phases within a single pass. Route 1
can exploit this by making the separation explicit.

### 0.4 Cascade logic

Route 1 is the correct fallback because:
- It retains v1's adaptive coding backend (proven efficient: A-share 0.073)
- It eliminates the static ANS overhead by construction (no bypass data)
- It preserves the MA-tree clustering (per-leaf adaptive models)
- The decoder already supports MA-tree leaf recomputation

If Route 1 fails (e.g., the multi-pass overhead exceeds the coding gain),
the cascade continues to Route 2 (hybrid-uint binarization).

---

## 1. The Route 1 architecture

### 1.1 Design principle: split v1's single pass into two explicit passes

v1's current encoding (prism.cpp:68-121) does everything in one pass:
1. For each sample: compute MED prediction, compute residual
2. Compute feature vector (QG, band_class, activity, res_diff, etc.)
3. Evaluate MA-tree to get leaf ID
4. Encode residual via adaptive per-leaf coding

Route 1 makes this two explicit passes:

```
PASS 1 (analysis, O(N)):
  1. Apply color transform (trial-selected from D4c family)
  2. Compute MED prediction residuals
  3. Build MA-tree over spatial features (full v1 feature set)
  4. Assign cluster/leaf IDs per sample
  5. Optionally: compute optimal parameters (color transform, CFL scales)
  6. Output: MA-tree + per-sample leaf IDs (ephemeral, not transmitted)

PASS 2 (coding, O(N)):
  1. Re-apply color transform (same as pass 1)
  2. Re-compute MED prediction residuals (same as pass 1)
  3. Re-evaluate MA-tree to get leaf IDs (same as pass 1)
  4. Encode residuals via v1's adaptive per-leaf coder (ACoderV2)
  5. Output: header + MA-tree blob + adaptive-coded payload
```

**Key insight:** Pass 2 is EXACTLY v1's `acoder_encode_plane_leaves_v2`
with pre-computed leaf IDs. The coding efficiency is identical to v1
because it uses the same adaptive coder with the same per-leaf probability
states.

### 1.2 What changes vs v1

| aspect | v1 single-pass | Route 1 two-pass |
|---|---|---|
| analysis + coding | interleaved (one pass) | separated (two passes) |
| MA-tree parameters | pre-computed (induction cap 32K) | same (pass 1 builds tree) |
| color transform | trial-encoded (C3, ~4 passes) | pre-determined in pass 1 |
| adaptive coder | ACoderV2 per-leaf | ACoderV2 per-leaf (identical) |
| decoder | recomputes leaf IDs from MA-tree | same (no change) |
| model overhead | MA-tree blob only | MA-tree blob only (same) |
| coding efficiency | near-entropy-optimal | identical to v1 |

### 1.3 What changes vs Route 3 (static ANS)

| aspect | Route 3 (static ANS) | Route 1 (adaptive) |
|---|---|---|
| entropy coding | static ANS per cluster | adaptive range coder per leaf |
| probability model | transmitted histograms | learned online (EMA) |
| bypass data | raw bytes (signs, escapes) | none (all bits coded) |
| sign coding | 1 byte per nonzero (~6 bpp) | adaptive bin (~0.08 bpp) |
| escape coding | raw quotient + raw bits | adaptive binary decomposition |
| model blob | MA-tree + histograms (~0.006 bpp) | MA-tree only (~0.003 bpp) |
| expected overhead | +194% (R1 FAIL) | 0% (same as v1) |

### 1.4 Why this should work

The B1 bucket (collection layer, 6.30% of current bytes) was identified as
the primary gap to JXL. Route 3 attacked B1 by replacing adaptive coding
with static ANS. This failed because the static ANS implementation had
massive bypass overhead.

Route 1 takes a different approach: **keep the adaptive coder but optimize
what it codes.** The multi-pass structure enables:

1. **Pre-computed MA-tree with full v1 features.** Pass 1 builds the tree
   using QG, band_class, activity, res_diff, sibling_class, and position.
   The current Route 1 was restricted to position-only (props 3/4) due to
   decode-time feature recomputation. But v1's decoder already recomputes
   QG and activity causally (prism.cpp:244-251). Route 1 can adopt the
   same pattern.

2. **Optimal color transform selection without trial-encode.** Pass 1 can
   evaluate all D4c candidates by computing residuals under each and
   selecting the one with lowest entropy (a proxy for coded bytes). This
   eliminates the C3 trial-encode overhead (currently ~4x encode at
   effort 5).

3. **Better MA-tree splitting criterion.** The current Route 1 uses
   variance-based splitting (multipass.cpp:265-310), which the Reviewer
   identified as a poor proxy for entropy. Pass 1 can use actual residual
   entropy (histogram-based) as the split criterion, matching v1's
   `build_matree_greedy` (matree_builder.cpp:41-55).

### 1.5 The B1 question

Does Route 1 actually reduce B1? The honest answer: **not directly.**
The adaptive coder still learns online, paying the same warm-start cost.
The A-share measurement (0.073 points) shows the warm-start is tiny.

However, Route 1 enables a **hybrid approach** for B1 reduction:

**Option A: Pre-seeded adaptive coding.** Pass 1 computes per-leaf
histograms. Pass 2 initializes the adaptive coder's EMA states from these
histograms instead of starting at 0.5. This eliminates the warm-start
cost (A-share = 0.073 points). The gain is small but free.

**Option B: Static + adaptive hybrid.** Pass 1 computes per-leaf static
probability tables. Pass 2 codes with a混合 of static ANS (for common
tokens) and adaptive range coding (for rare tokens). This is complex and
measured separately.

**Option C: Accept B1 as-is, attack other buckets.** Route 1's primary
value is NOT B1 reduction. It is enabling better MA-tree clustering (full
features, entropy-based splitting) and eliminating trial-encode overhead.
The B1 attack remains the responsibility of Route 3's static ANS (with
fixed bypass).

---

## 2. The Route 1 measurement program (R1-series)

### 2.1 Phases

**R1-0: Harness extension (BLOCKING)**

Extend the existing Route 1 harness (from PR #157) with:
1. Two-pass encoder using `acoder_encode_plane_leaves_v2` (not static ANS)
2. Full v1 feature set in MA-tree (QG, band_class, activity, position;
   res_diff and sibling_class are deferred to R1-3)
3. Entropy-based MA-tree splitting (histogram entropy, not variance)
4. Causal QG/activity recomputation at decode time (matching prism.cpp
   pattern)
5. New VB rails:
   - VB-R1-ADAPTIVE-ROUNDTRIP: encode -> decode reproduces source
     byte-exact using adaptive per-leaf coding
   - VB-R1-MA-TREE-FIDELITY: transmitted MA-tree decodes correctly
   - VB-R1-NET-AUDIT: NET = payload + model overhead on every row
6. Self-check: proves both verdict directions on pinned quad

Exit condition: all VB rails green + dated reference CSV committed.

**R1-1: Adaptive vs adaptive baseline (measures multi-pass benefit)**

Measure Route 1 (two-pass adaptive) vs v1 (single-pass adaptive) on the
pinned quad:
- FRAME-V1: Prism v1 single-pass (existing production path)
- FRAME-R1: Route 1 two-pass with full v1 features + entropy-based
  MA-tree + adaptive per-leaf coding

Parameters: K in {16, 32, 64, 128} clusters, effort levels 3/5/7.

**Gate**: FRAME-R1 median NET beats FRAME-V1 median NET by >= +0.5%
on the quad. This is a TIGHT gate because both use the same adaptive
coder; the gain comes from better MA-tree clustering and eliminated
trial-encode overhead.

**Sub-gates**:
- R1-1a: model overhead <= 0.005 bpp per sample (MA-tree only, no
  histograms)
- R1-1b: no image regresses by more than -0.5% (the MA-tree must not
  hurt any image)
- R1-1c: decode time <= 1.5x v1 decode time (the MA-tree evaluation
  overhead must be bounded)

**Failable self-check**: proves both gate directions on pinned quad.

**R1-2: Entropy-based vs variance-based MA-tree splitting**

If R1-1 passes: measure entropy-based splitting vs variance-based
splitting on the winning K:
- FRAME-VAR: variance-based splitting (current Route 1)
- FRAME-ENT: histogram-entropy-based splitting (new)

Gate: FRAME-ENT median NET beats FRAME-VAR by >= +0.3%.
Fail: use variance-based splitting.

**R1-3: ResDiff + sibling_class features (conditional)**

If R1-1 passes AND R1-2 passes: add res_diff and sibling_class features
to the MA-tree. These features depend on decoded residuals, so the
decoder must recompute them causally (matching prism.cpp:150-153).

Gate: median NET beats R1-2 winner by >= +0.3%.
Fail: use QG+band_class+activity+position only.

**R1-4: Pre-seeded adaptive coding (B1 attack, conditional)**

If R1-1 passes: measure pre-seeded adaptive coding (pass 1 histograms
initialize EMA states) vs cold-start adaptive coding.

Gate: median NET improvement >= +0.1% (A-share bound: 0.073 points).
Fail: cold-start is sufficient.

**R1-5: Composition + projection + gate check**

Compose all R1-series winners per image by real NET bytes (L-C1).
Project corpus via formula 18.5 VERBATIM against the committed e1 CSV.

Proceed-to-format threshold: projected < 9.35 summed AND < 3.117
per-sample (2% margin under M2).

If threshold met: Architect blueprints the format program behind version
bump. Fresh dual-unit `bench_gate.sh` against REAL cjxl and WebP on full
Kodak-24. Byte-exact 24/24. Fuzz clean.

### 2.2 Honest arithmetic

v1 e1 = 10.1210 summed / 3.3737 per-sample. Both Route 1 and v1 use the
same adaptive coder, so the coding efficiency is identical. The gain from
Route 1 comes from:

| mechanism | expected gain | confidence |
|---|---|---|
| Better MA-tree (full features + entropy split) | +0.3-1.0% | MEDIUM |
| Pre-seeded adaptive (A-share elimination) | +0.07% | HIGH (bounded) |
| Eliminated trial-encode overhead | 0% ratio, 2-4x speed | HIGH |
| **Total expected** | **+0.4-1.1%** | |

Projected from e1: 10.1210 x (1 - 0.011) = 10.01 summed (best case).
M2 gate: < 9.498 summed. **Route 1 alone CANNOT reach M2.** The gain
from better MA-tree clustering is real but small (~1% at best).

**Route 1 is NOT the path to M3.** Its value is:
1. Proving that multi-pass with adaptive coding works (no overhead)
2. Establishing the MA-tree infrastructure for future gains
3. Enabling the hybrid approach (Option A/B in section 1.5)

The path to M2/M3 requires combining Route 1's adaptive backend with
Route 3's static ANS for the parts where static ANS is better (common
tokens) and adaptive coding for the parts where adaptation matters (rare
tokens, nonstationary tracking).

### 2.3 Cascade triggers

| Phase | Failure | Consequence |
|---|---|---|
| R1-0 | Harness broken | Fix and re-run; no verdict until green |
| R1-1 | < +0.5% NET | Route 1 multi-pass offers no gain over v1; report with ledger |
| R1-2 | < +0.3% NET | Use variance-based splitting |
| R1-3 | < +0.3% NET | Use QG+band_class+activity+position only |
| R1-4 | < +0.1% NET | Cold-start is sufficient |
| R1-5 | Misses M2 | Report with full ledger; owner decides next route |

---

## 3. What Route 1 is NOT

Route 1 is NOT:
- A path to M3 (the gain is ~1% at best, 14.48% needed)
- A replacement for Route 3's static ANS (different mechanisms)
- A new entropy coding backend (it uses v1's existing ACoderV2)

Route 1 IS:
- A measurement of whether multi-pass with adaptive coding offers any gain
- An infrastructure investment (MA-tree with full features, entropy splitting)
- A prerequisite for the hybrid approach (adaptive + static ANS)
- A low-risk, high-confidence measurement (same coder as v1, just structured differently)

---

## 4. Invariants carried forward

I1-I17 from research-v2/v3/v4/route3 carry verbatim. Added:

- **I18 (adaptive backend primacy):** Route 1 uses v1's ACoderV2 adaptive
  range coder with per-leaf probability states. No static ANS, no bypass
  data, no transmitted histograms. The coding efficiency must match or
  exceed v1 on every image.

- **I19 (MA-tree feature parity):** The MA-tree in Route 1 uses the same
  feature set as v1's MATree (QG, band_class, activity, position; with
  res_diff and sibling_class added conditionally in R1-3). No feature
  degradation from v1.

- **I20 (decode-time feature recomputation):** Any feature that depends on
  decoded pixels (QG, activity, res_diff, sibling_class) must be
  recomputed causally during decode, matching the existing pattern in
  prism.cpp:244-251. No leaf ID storage in the stream.

---

## 5. Decision tree

| outcome | consequence |
|---|---|
| R1-0 fails (harness broken) | Fix and re-run; no verdict until green |
| R1-1 fails (< +0.5% NET) | Multi-pass adaptive offers no gain; report ledger, owner decides |
| R1-1 passes, R1-5 threshold met | Architect blueprints format program |
| R1-5 passes M2 but not M3 | Report ledger; owner decides Route 3 hybrid or Route 2 |
| R1-5 misses M2 | Report full ledger; owner decides next route |

---

## 6. Handoff

Next pipeline step: **Architect** (`{"action":"architect"}`). Blueprint
inputs: this document (Route 1 architecture; R1-series gates; I18-I20
invariants; addendum 23 skeleton). The Architect's first deliverables:
1. Spec addendum 23 with ALL pinned constants (MA-tree depth cap, min
   samples, feature set, splitting criterion, adaptive seeding params)
2. R1-0 harness blueprint with failable self-check list
3. Wire format v2 addendum (MA-tree-only model section, no histograms)

NO measurement slice may precede addendum 23. The binding end gates
remain M2 AND M3 in both units on a fresh corpus measurement against real
cjxl output; nothing in this document relaxes the freeze or the standing
rule that no success claim leaves the lab without a reproducible
measurement stated in both units.

Handoff decision: `{"action":"architect"}`.

- Dr. Mob, the Researcher
