# Prism - JXL-Parity Backend-v2 Blueprint (Architect handoff for #130)

- **Issue:** #130 (owner directive 2026-08-23; supersedes the closed M1-M4 claim of PR #121)
- **Role:** the Architect
- **Inputs:** `research-gap-analysis.md` (findings F1-F4, prescriptions P1-P7,
  projections), `algorithmic-spec.md` Section 10 addendum (amended Stage E/X/S/P
  contracts, wins on conflict), `benchmark-methodology.md` (dual-unit gates),
  `architecture-m1-m4.md` (the B-series this continues), D1 gate fix in
  `benchmarks/bench_gate.sh` (shipped in this PR).
- **Scope of THIS doc:** the C-series build phases that take Prism from
  11.026 summed / 3.675 per-sample to the binding M3 gate (< 8.655 summed AND
  < 2.885 per-sample) with M2 (< 9.498 / < 3.166) as the mid-course checkpoint.
  It fixes module boundaries, data structures, interface contracts, decision
  policy, and per-milestone acceptance. No function bodies.

This document is **architecture only**. Where it conflicts with older docs, the
`algorithmic-spec.md` Section 10 addendum and then this doc win (newest first).

---

## 0. Strategy: collection efficiency first, transform second

The research located the gap precisely:

- F1: everything above effort 1 is dead code on photos (Squeeze L=0 fallback,
  empty MA-tree); Prism today is a plain MED + flat-context coder.
- F2: shipped Stage-S is decimation, strictly harmful even under ideal coding;
  a true-lift pyramid with strawman contexts also loses. Transform-first was
  the wrong order.
- F3: the backend wastes 10-27 percent of the file; sign-before-zero costs
  3.4-5.1 percent; resdiff-343 harvests only 0.9 percent of a ~6 percent
  conditional-entropy delta (adaptation dilution).
- F4: M2 AND M3 both sit inside the ideal-coder bracket of TODAY's residuals
  (8.01-9.94 summed). The information already exists; we fail to collect it.

Therefore the build order is exactly what Dr. Mob recommended:

1. **C1: entropy backend v2** (P1 rebinarization + P2 shared/dual-rate
   adaptation) as one vertical slice, bit-exact, fuzz-gated, measured on
   kodim01 + kodim13 before the full corpus.
2. **C2: MA-tree always-on** (P3) - context modeling is never again gated
   behind a transform decision.
3. **C3: trial-encode decisions** (P4) - every analyzer choice is made in
   measured BITS via cheap real encodes; the entire L1/log-mean proxy class is
   deleted.
4. Re-measure. Checkpoint: M2 window.
5. **C4: true CDC lifting Squeeze** (P5) replaces decimation Stage-S.
6. Re-measure. **C5: cross-band prediction** (P6) rejoins once contexts work.
7. Re-measure. Checkpoint: M3 gate.
8. **C6: CM/SSE stretch** (P7) toward M4 < 8.0, never-expand.

Each C-step is one or more commits, keeps the tree green (23/23 gtest +
`prism fuzz --iters 1000` + corruption rejection + byte-exact Kodak round-trip)
BEFORE the next step, and records a dated durable CSV when it changes bytes.

---

## 1. Binding invariants (all C-steps)

- **I1 Bit-exactness:** every stage stays an integer bijection;
  decode(encode(x)) == x sample-for-sample at all efforts on Kodak-24 and the
  fuzz matrix. The FIFO property of `acoder.h` is what makes adaptive models
  legal; nothing may reintroduce a LIFO/adaptive mix.
- **I2 Decoder mirror:** any encoder-side model constant (adaptation shifts,
  mixing weights, prior tables) is compiled into BOTH sides or signaled in the
  header. Zero side channels. Unknown `flags` bits are a hard decode error
  (corruption gate).
- **I3 Legacy compatibility:** the v1 path (flags bit2, current binarization)
  remains decodable for streams already committed in results CSVs. New streams
  set flags bit3 = ACODER_V2. Version bump only if header layout changes.
- **I4 Never-expand by construction:** every candidate decision (transform,
  predictor, squeeze level, tree accept, CM/LZP) is decided by trial-encoded
  total bytes including model bytes; the identity candidate is always in the
  search set, so no decision can enlarge the output vs its own baseline.
- **I5 Units discipline:** every claimed number states its unit; gates compare
  in both units via `benchmarks/bench_gate.sh` (which must keep passing
  `--self-check`). No success claim without a fresh measurement.
- **I6 Speed guard:** wall-clock and peak-RSS stay in the bench log; any
  single-image encode > 5x the prior best at equal effort is a regression
  (methodology Section 6, the Obsidian R11-A trap).

---

## 2. Module map (real files, real contracts)

```text
include/prism/codec/acoder.h        + src/codec/acoder.cpp     [C1] binarization order, dual-rate models, prior init
include/prism/codec/matree_builder.h+ src/codec/matree_builder.cpp [C2] new caps, quantile splits, always-on API
include/prism/codec/matree.h        + src/codec/matree.cpp     [C2] PropId extension, serialization versioning
src/codec/analyze.cpp               [C2/C3/C4] decision engine rewrite: trial bits everywhere
src/codec/squeeze.h                 + src/codec/squeeze.cpp    [C4] CDC lifting replacement
include/prism/codec/predict.h       + src/codec/predict.cpp    [C5] XBand parent-gradient predictor
src/prism.cpp                       [C1..C6] encode/decode plumbing, candidate trials, flag dispatch
include/prism/codec/container.h     + src/codec/container.cpp  [C1/C2] flags bit3, model serialization extensions
tests/unit/*                        [each C] bijection + determinism + probe-pin tests
benchmarks/probe_backend.sh         [C1] kodim01/kodim13 A-B harness (v1 vs v2 payload sizes)
```

---

## 3. C1: Entropy backend v2 (P1 + P2)

### 3.1 Binarization reordering (P1)

Residual decomposition becomes strictly `zero-flag -> sign -> magnitude`.
Zeros (28.2 percent of kodim01 samples) never touch a sign bin. Magnitude
stays unary quotient + MSB-first remainder bits over the per-context Rice
shift k (integer EMA of |e|, mirrored, zero signaled bytes - unchanged).
Naive Rice-k EMA quotients remain PROHIBITED (probe V2/V4 backfired).

Decoder mirrors the order exactly; the change is format-visible, hence bit3.

### 3.2 Statistical sharing: dual-rate adaptation over class priors (P2)

Adaptation dilution (F3) is fixed by hierarchy, not by more contexts:

```cpp
// include/prism/codec/acoder.h  (interface sketch only)
struct BinModelV2 {                 // one bin type, all contexts
    std::vector<uint16_t> p_fast;   // adapted shift 4 (fast EMA)
    std::vector<uint16_t> p_slow;   // adapted shift 6 (slow EMA)
};
struct ACModelsV2 {
    BinModelV2 zero, sign, q, rem;  // indexed [context]
    void init_from_priors(const uint16_t* zero_tab, ...); // code-constant tables
    uint16_t mixed(int cx, BinModelV2& m) const;          // (5*p_fast + 3*p_slow) >> 3
};
uint16_t prior_for(uint8_t prior_class, uint8_t bin_kind); // N_PRIORS = 16 entries/kind
```

- Context id STAYS `residual_diff_context(dL,dU,dUL)` in 0..342 (decoder can
  recompute it causally). What changes: each of the 343 model sets is
  INITIALIZED from a coarse prior class (activity/qg bucket, 16 classes) and
  adapts at two rates; the coded probability is the integer mix above.
  Weights (5,3) and shifts (4,6) are constants mirrored on both sides (I2).
- Prior tables are compile-time constants tuned OFFLINE against the probe
  harness (legal: they are codec constants, not data-dependent state).
- The v1 single-rate path stays selectable for legacy streams (I3).

### 3.3 Acceptance

- Probe: `benchmarks/probe_backend.sh` reports kodim01 and kodim13 payload
  deltas; v2 must capture >= 80 percent of the measured V1 win (-5.1 percent /
  -3.4 percent) AND beat V0's context-inertness (the 0.9 percent V3 delta must
  grow toward the ~6 percent oracle delta; target >= 3 percent on kodim13).
- Corpus: full Kodak-24 byte-exact; projected landing zone ~10.0-10.7 summed
  (~3.34-3.57 per-sample). Honest: P1+P2 alone does NOT clear M2 (research
  projection); do not claim it.
- Unit: bijection round-trip on adversarial alphabets (all-zero plane, max
  magnitude, alternating signs, random seeds x1000); H(p)+epsilon efficiency
  gate retained.

---

## 4. C2: MA-tree always-on (P3)

### 4.1 Contract changes

- `analyze()` builds the greedy property tree on SPATIAL residual features for
  every plane at effort >= 3, ALWAYS - including when squeeze levels are all 0
  (i.e., on photos, which is the point). The `evalGuard` hasLevels requirement
  is deleted; the only acceptance test is trial-bits (C3): tree total
  (payload + serialized tree bytes) < flat-total.
- New caps (`MatreeBuildParams`): max_depth 4 -> 10, max_leaves 16 -> 256,
  min_samples_per_leaf 512 (replaces the implicit fixed 32), split thresholds
  chosen at QUANTILE POINTS of the feature distribution (bounded candidate
  set, deterministic tie-break by (gain, prop id, threshold)).
- Squeeze, when active later (C4), merely APPENDS features (band identity,
  parent class, sibling class) to the vector; it can never disable the tree.
- PropId enum gains values without renumbering existing ones; tree
  serialization carries a small version nibble so old models parse (I3).

### 4.2 Acceptance

- Determinism: same image -> identical tree bytes (hash pinned in unit test).
- Overfit guard: tree acceptance includes model bytes; leaves <= 256 and the
  min-samples rule keep model_len bounded (budget checked in container).
- Corpus checkpoint after C2+C3: research projects the spatial-headroom
  harvest lands near 9.3-9.6 summed (3.10-3.20 per-sample) - the M2 window
  (< 9.498 / < 3.166). If C2 alone crosses M2, record it; M2 is a checkpoint,
  not the merge gate.

---

## 5. C3: Trial-encode decisions (P4)

### 5.1 Decision engine

Every proxy (`estimate_bits`, `leaf_bits` log-mean, `squeezed_plane_cost`,
`raster_cost_med` energy sums) is retired from DECISIONS (they may remain as
pruning heuristics ONLY where labeled non-binding). Decisions now compare real
`AEncoder` outputs:

- color transform + CFL scales: trial-encode each finalist plan on a
  subsampled grid (every 4th row/col) for pruning, full encode for finalists.
- predictor selection: per-plane and per-leaf ids by coded bits, not energy.
- squeeze levels per plane (C4): L in 0..maxL by coded band totals.
- tree accept/reject: tree total vs flat total, both fully encoded.
- CM/LZP candidates (existing B8 plumbing): unchanged principle, now fed by
  the same engine.

Effort ladder maps to candidate budgets so e7 explores more, e1 stays fast:
e1 = v2 flat only; e2 = + always-on tree; e3 = + transform/CFL/predictor
trials; e4 = + squeeze-level trials + CM/LZP candidates; e7 = full budget.
Legacy efforts 0-3 remain valid streams via flags (I3).

### 5.2 Acceptance

- No decision can regress vs its own baseline (I4 verified by a unit test that
  asserts candidate sets always contain the identity).
- Encode time budget: full-corpus wall-clock recorded; 5x guard (I6).

---

## 6. C4: True CDC lifting Squeeze (P5)

### 6.1 Replacement contract (per spec addendum)

One level = horizontal pass `d = a - b; s = b + floor(d/2)` over column pairs,
then vertical pass over both channels; recurse on the average quadrant only;
post-order emission preserved (LL first, HF children after). HF ranges stay
within +-2^B * levels; widened storage (u16 planes, i32 math) as today for
deep levels and BD16 inputs. Odd dimensions handled by the existing edge
policy (documented in squeeze.cpp; property-tested).

`SqueezeResult` layout (post-order bands, band_class coding) is UNCHANGED -
prism.cpp multi-band plumbing needs no structural change, only the transform
math and its inverse swap underneath.

Per-plane L chosen by trial encode (C3 engine), never by energy proxies.

### 6.2 Acceptance

- Bijection property tests: random planes, odd dims 1..65, BD8 and BD16, L up
  to max_levels; inverse exactness is the blocker.
- Research expectation to BEAT (honest bar): true-lift pyramid with strawman
  contexts measured 10.629 summed ideal; our C1+C2 backend must land BELOW
  the decimation baseline it replaces on the same corpus, else C4 is rejected
  (R11-A spirit: measure or it did not happen).
- Corpus checkpoint: combined C4+backend moves toward the M3 bracket; final
  judgment waits for C5.

---

## 7. C5: Cross-band prediction (P6)

Once per-leaf models actually adapt (C1/C2 landed):

- Predictor bank extension: `PredId::XBAND` predicts an HF sample from the
  co-located LL gradient (linear extrapolation along the parent gradient,
  quantized weights, causal within post-order availability). Per-leaf selector
  as specified in algorithmic-spec Section 4; evaluated only when the plane's
  chosen L > 0.
- Features available to the tree gain parent-class properties (band identity
  already added in C4's feature append).

Acceptance: corpus must improve vs C4 state on >= 20 of 24 images (no
single-image regression beyond noise without a compensating corpus win);
byte-exactness unaffected.

Checkpoint: **M3 gate** - fresh `prism bench --kodak` run,
`bench_gate.sh --gate-summed 8.655 --gate-per-sample 2.885`, both-unit PASS,
durable CSV + updated codec-comparison table row committed. Literature anchor
says attainable (FLIF/MANIAC ~9.3, JXL modular 8.65) with ZERO slack for
estimator bugs - which C3 removed by construction.

---

## 8. C6: CM/SSE stretch (P7, M4)

Logistic mixer over {resdiff-prior estimator, qg estimator, activity
estimator} + SSE map on neighbor-residual class, wrapped around the v2 leaf
backend behind the existing never-expand trial net (B8 plumbing reused). LZP
unchanged. Target < 8.0 summed / < 2.667 per-sample. This phase is optional
for issue #130 closure; M3 is the binding gate.

---

## 9. Test matrix (cumulative, per milestone)

| Layer | Gate |
|---|---|
| Unit gtest | bijections (binarization, lifting, CFL, color), tree determinism, mix() bounds, identity-candidate invariant |
| Fuzz | `prism fuzz --iters 1000` incl. forced flags bit2+bit3, odd dims, BD16 |
| Corruption | byte-flip in v2 payload/model -> CRC32 reject, never garbage |
| Probe | kodim01+kodim13 payload deltas vs pinned V0/V1 baselines (both units) |
| Corpus | Kodak-24 SHA-pinned, byte-exact, durable CSV committed, bench_gate both units + --self-check |
| Speed | wall-clock + peak-RSS logged, 5x single-image regression flagged |

Merge gate (binding, owner freeze): M2 AND M3 genuinely pass in both units on
a fresh reproducible measurement of the real cjxl-comparison corpus, decode
byte-exact 24/24, fuzz clean, CSV + comparison-table row updated. Nothing
merges earlier; partial wins are recorded honestly in progress/, never
claimed as parity.

---

## 10. Risk register

- **Dual-rate mis-tuning oscillates like naive Rice-k:** tune offline on the
  probe harness FIRST; pin constants; keep v1 flag path during transition.
- **Tree overfit / model bloat:** min-samples 512 + leaves cap + model bytes
  inside the trial-bits decision.
- **Trial-encode cost explosion:** subsampled-grid pruning then finalist full
  encodes; effort-budgeted candidate sets; 5x speed guard.
- **Lifting overflow on BD16/deep levels:** widening rules pinned; property
  tests at max levels and max magnitudes.
- **Estimator-bug recurrence:** banned proxy class deleted from decision
  paths; Reviewer should grep for their return in any acceptance branch.

- the Architect
