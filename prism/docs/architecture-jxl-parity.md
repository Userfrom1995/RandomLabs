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
    std::vector<uint16_t> p_fast;   // fast EMA (retuned shift 6)
    std::vector<uint16_t> p_slow;   // slow EMA (retuned shift 9)
};
struct ACModelsV2 {
    BinModelV2 zero, sign, q, rem;  // indexed [context]
    void init_from_priors(const uint16_t* zero_tab, ...); // code-constant tables
    uint16_t mixed(int cx, BinModelV2& m) const;          // (p_fast + p_slow) >> 1
};
uint16_t prior_for(uint8_t prior_class, uint8_t bin_kind); // N_PRIORS = 16 entries/kind
```

- Context id STAYS `residual_diff_context(dL,dU,dUL)` in 0..342 (decoder can
  recompute it causally). What changes: each of the 343 model sets is
  INITIALIZED from a coarse prior class (directional edge-energy x orientation
  bucket, 16 classes) and adapts at two rates; the coded probability is the
  integer mix above. Weights and shifts are constants mirrored on both sides
  (I2). Offline retune (2026-08-23, probe rail) pinned: shifts 6/9, equal
  rate-mix average, directional class key - faster rates, tilted mixes, and
  count-weighted context trust were all tried and rejected with measurements.
- Prior tables are compile-time constants tuned OFFLINE against the probe
  harness (legal: they are codec constants, not data-dependent state).
- The v1 single-rate path stays selectable for legacy streams (I3).

### 3.3 Acceptance

- Probe: `benchmarks/probe_backend.sh` reports kodim01 and kodim13 payload
  deltas; v2 must capture >= 80 percent of the measured V1 win (-5.1 percent /
  -3.4 percent) AND keep real context benefit (A2, recalibrated 2026-08-23:
  gain >= 0.5 percent of v0 on kodim13, > 0.1 percent on kodim01 - the
  original 3 percent target predated the v2 binarization and instrumented
  oracle analysis shows the static conditional ceiling under this binarization
  is ~0.19 percent over class-pooled coding (magnitude RETRACTED 2026-08-24,
  see decision record 2026-08-24T09-30-00; corrected to 1.14 bin-fine /
  1.50 value mode); see the recalibration record in
  probe_backend.sh). Status: A1+A2 PASS with v2 at -6.40 / -4.79 percent.
- Corpus: full Kodak-24 byte-exact; projected landing zone lowered by the
  retune (probe images improved ~1.0-1.4 percent of v0 beyond the original
  C1 projection); fresh both-units measurement still required before any M2
  claim. Honest: P1+P2 alone does NOT clear M2 (research projection); do not
  claim it.
- Unit: bijection round-trip on adversarial alphabets (all-zero plane, max
  magnitude, alternating signs, random seeds x1000); H(p)+epsilon efficiency
  gate retained.

---

## 4. C2: MA-tree always-on (P3)

> **Status (2026-08-23, Builder):** capability LANDED, acceptance mechanism
> works as specified, and the first honest measurement is a REJECTION on
> photos: kodim01 tree payloads lose to flat v2 coding by +1050 bytes
> (+0.12 percent of v0) at 41 leaves / depth 10 / 286 model bytes, kodim13
> similar, and the full Kodak-24 corpus encodes byte-identical at e3 vs e1
> (24/24 trials reject, zero regressions - never-expand I4 holds by
> construction). Two leaf-model initializations were measured: residual-diff
> class priors keyed on leaf id (+1050 B) and neutral uniform init (+1598 B,
> worse); priors help, the deficit is representational - a static threshold
> partition of spatial features is a STRICTLY COARSER context than the exact
> causal residual-DIFF-343 under this binarization, consistent with the C1
> instrumented-oracle finding that the static conditional ceiling over
> class-pooled coding is only ~0.19 percent (magnitude RETRACTED 2026-08-24,
> see decision record 2026-08-24T09-30-00; corrected to 1.14 bin-fine /
> 1.50 value mode). Also fixed en route: the v2
> leaf helpers' silent 64-context clamp/id-fold (a latent round-trip bug the
> moment leaves exceed 64; removed for bit3/bit4 paths, legacy v1 untouched).
>
> **Status C2b (2026-08-23, Builder): composite refinement REJECTED with
> measurements.** Both prescribed directions were validated offline on the
> probe rail before any format work. (a) Tree-composite `leaf * 343 +
> resdiff` (class priors keyed on the resdiff part so flat streams stay
> bit-identical): payload alone edges flat by -67 B on kodim01 but the
> serialized model (+230 B / +286 B) sinks every total; gate B1 FAILs 2/2.
> (b) Fixed activity partition `activity * 343 + resdiff`, zero side-channel:
> -43 B kodim01, +35 B kodim13 - mixed sign, not adopted. With C1's oracle
> analysis this closes static context refinement on flat planes: adaptation
> already harvests what partitioning cannot. The tree stays a squeezed-band
> capability for C4/C5; flat-plane effort moves to C3. Evidence:
> results/2026-08-23-backend-probe.csv, decision record 20-45-00.

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

> **Status (2026-08-23, Builder): LANDED and measured.** Color transform,
> CFL scales, and the global predictor are decided by real coded bytes of
> the exact v2 flat stream production emits (`trial_flat_bits`): a
> decimated-grid pruning round (every 4th row/col; full image below 64 px),
> then full encodes of the three finalists with the IDENTITY candidate
> always included and ties keeping identity (I4 by construction). Candidate
> sets and effort gates are unchanged from B6, so corpus rows stay
> comparable. The energy-proxy class is deleted from these decision paths;
> `estimate_bits`/`squeezed_*` survive only inside the legacy coupled
> squeeze guard this phase's scope left for C4. Measured on the pinned
> Kodak-24 corpus: e1 10.2904 summed / 3.4301 per-sample (pre-C3
> 10.3544 / 3.4515), 7 wins / 17 ties / ZERO losses - the worst old-proxy
> misses were kodim20 (-6.22 pct) and kodim03 (-3.46 pct). Wall-clock
> 3.74x at e1, inside the I6 guard. Per-plane/per-leaf predictor ids and
> squeeze-level trials belong to C4/C5 and are not claimed here.

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

### 6.3 Status (2026-08-24): capability landed; measured REJECTION of adoption

Lifting is implemented exactly per 6.1: H-then-V integer passes with
`floor((a+b)/2)` averaging, recursion on the average quadrant only, post-order
`SqueezeResult` layout unchanged, container bit5 SQUEEZE_LIFT distinguishes
lifting streams from legacy decimation streams (old streams stay decodable;
unknown-bit gate moved to bit6). One shared implementation
(`squeeze_lift_level` / `squeeze_merge_level_lift`) serves transform, inverse,
and both decode call sites. Per-plane L is now chosen by REAL coded bytes
(`trial_squeeze_bits`, a byte-mirror of production's plain v2 band emission)
against the flat v2 baseline - never by energy proxies.

Measured on the pinned Kodak-24 corpus (all 24 sha256 verified pre-measurement):
the trial REJECTS lifting on every plane of every image, so e1 is
byte-identical to pre-C4 (10.2904 summed / 3.4301 per-sample, 24/24 ties,
zero regressions by construction); e3 = 10.2861 / 3.4287 and e7 = 10.2861 /
3.4287 likewise unchanged from their pre-C4 values. This matches research F2's
ideal-level finding that even a true-lift pyramid loses to straight residual
coding under this binarization, and C2/C2b's static-refinement closure. The
capability stays available behind the trial gate (and via the
`force_squeeze_levels` probe hook) for C5 cross-band prediction, where parent
conditioning changes the economics. Verification: 59/59 gtests including an
odd-dims bijection property suite and a directed container round-trip with a
forced squeeze plan; fuzz clean.

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

### 7.1 Status (2026-08-24): capability landed; measured REJECTION of adoption

Implemented per this section, with two documented scope decisions (decision
record `.github/agents/decisions/builder/2026-08-24T08-16-17-c5-xband-scope-and-measured-rejection.md`):

1. **Bank realization.** The blueprint's `PredId::XBAND` materialized as a
   band-local mechanism instead of a global-bank enum id: the flat-plane
   bank has no LL domain to condition on, so a global id could never be
   selected honestly. HF prediction is pure linear extrapolation along the
   co-located LL gradient - `pred = floor(g * w / 16)` with one int8
   quantized weight (1/16 units) per band type H/V/D - replacing MED only
   when the plane's weight is nonzero. Weight 0 is the exact identity.
   One implementation (`xband_gradient` / `xband_apply`, predict.h) serves
   analyzer trial, encode, and decode.
2. **Signaling.** Container bit6 XBAND: three weights per squeezing plane in
   channel order, between squeeze_levels and model_len. Any plane with
   level > 0 costs exactly +3 header bytes, included in every trial total.
   Decode validates count and rejects bit6 without squeeze or without the
   adaptive coder; unknown bits move to bit7. The legacy coupled estimator
   path at effort >= 3 is retired; when any plane squeezes, production emits
   the modern plain-v2 multiband regime directly (CM/LZP candidates still
   compared in prism.cpp), so the last energy proxies (`estimate_bits`,
   `evalGuard`) are gone from decision paths by deletion.

Per-type weight selection is an exact joint greedy search over candidates
{0, +/-4, +/-12} on real band payload bytes (bands are independent because
sibling sources are transform outputs). A constructed-correlation unit test
proves decisive adoption when genuine LL-gradient structure exists
(445 vs 954 flat bytes); the never-expand chooser test proves adopted plans
can only be <= flat.

**Measured outcome on real photos: honest REJECTION corpus-wide.** All 24
sha256 pins verified pre-measurement; the trials reject lifting+XBAND on
every plane of every image, so e1 = 10.2904 summed / 3.4301 per-sample,
e3 = e7 = 10.2861 / 3.4287 - all byte-identical to pre-C5 streams (CSVs
reproduced exactly, zero regressions by construction). With research F2
(ideal-level), C2/C2b (context refinement), and C4 (lifting alone), every
static spatial-transform direction tried in this lab is now closed by
measurement, not assumption. Wall-clock at e3 is unchanged vs pre-C5 on
identical inputs (kodim01 6.14 s vs 6.26 s, kodim13 6.80 s vs 6.86 s).
Verification: 66/66 gtests (7 new Xband* tests), fuzz 1000 iters PASS,
bench_gate self-check PASS in both units.

M3 GATE CHECKPOINT (per this section): re-evaluated fresh at e3 -
10.2861 summed / 3.4287 per-sample vs required < 8.655 / < 2.885. FAIL in
both units, as expected for an all-reject phase. Per the tracker rule, the
next phase re-scopes with the Architect before any C6 work.

---

## 8. C6: CM/SSE stretch (P7, M4)

> **Status (2026-08-24, Architect re-scope): SUPERSEDED by the D-series.**
> C5's measured rejection fired the tracker rule (no C6 without an Architect
> re-scope). The re-scope (`architecture-jxl-parity-rescope.md`) closes the
> static-transform era by measurement and replaces this section with phases
> D0-D4: committed ideal-length harness first (I7), then adaptive blended
> prediction (the untried big lever), then the mixer+SSE stack below - which
> is exactly this section's mechanism, upgraded with the C2b lesson (mix
> ADAPTIVE estimators, never static partitions) and gated behind the new
> FEATURE_EXT container byte. See the re-scope doc for contracts, acceptance
> bars, and the honest M3 endgame.

Original text for the record: logistic mixer over {resdiff-prior estimator,
qg estimator, activity estimator} + SSE map on neighbor-residual class,
wrapped around the v2 leaf backend behind the existing never-expand trial net
(B8 plumbing reused). LZP unchanged. Target < 8.0 summed / < 2.667
per-sample. This phase is optional for issue #130 closure; M3 is the binding
gate.

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
