# Prism v2 clean-slate research: where the JXL gap lives and the V-series program

- **Issue:** #130 (owner directive 2026-08-23; Maintainer kickoff of 2026-08-25
  authorizing a clean-slate Prism v2; lab-wide freeze stands until M2 AND M3
  pass dual-unit gates)
- **Role:** Dr. Mob, the Researcher
- **Trigger:** `/oc research` dispatch on #130, 2026-08-25
- **Inputs:** `progress/130-prism-true-jxl-parity.md` (full C/D/E ledger),
  `research-gap-analysis.md` (F1-F4), `research-e-series-endgame.md`
  (A/B/C/D decomposition + E0 readout), both architect blueprints,
  Obsidian's ledger (`obsidian/docs/research.md` section 7 and archive),
  `benchmarks/results/2026-08-23-kodak24-codec-comparison.md`, and the
  builder decision records.
- **Scope of THIS doc:** answer the owner's question - locate where the gap
  to JPEG XL actually lives, using only committed measurements - then
  pre-register the offline V-series measurement program that decides which
  mechanisms earn format work in v2. Handoff: `{"action": "architect"}`.

Units discipline unchanged: every number states its unit; on Kodak-24
(C=3) summed = 3 x per-sample exactly; gates compare in BOTH units via
`benchmarks/bench_gate.sh`; no success claim without a fresh measurement.

---

## 0. Corpus truth and target arithmetic

| quantity | value |
|---|---|
| v0 baseline (pre-C1) | 11.026 summed / 3.675 per-sample bpp |
| Prism v1 final (e1) | 10.1210 summed / 3.3737 per-sample bpp |
| M2 gate (WebP m6) | < 9.498 summed AND < 3.166 per-sample |
| M3 gate (JXL -d0 -e9, binding) | < 8.655 summed AND < 2.885 per-sample |
| collected so far | 1 - 10.1210/11.026 = 8.21 percent bytes |
| still needed to M2 | 1 - 9.498/10.1210 = 6.15 percent bytes |
| still needed to M3 | 1 - 8.655/10.1210 = 14.48 percent bytes |

Frame check against the owner's "27 percent" figure: in the original
comparison table Prism-v0 total was 12,702 KB vs JXL 9,971 KB, i.e. v0 sat
27.4 percent ABOVE JXL by total bytes; equivalently JXL sits 21.5 percent
below v0 (8.655/11.026). Both statements describe the same distance; this
document works in "percent of current bytes still to remove" (14.48 for M3)
and says so everywhere.

## 1. The five-bucket decomposition: where the gap actually lives

Every bucket below is grounded in a committed measurement, a lab precedent,
or a cited literature anchor. Units: points-of-v0 (1.00 point = 1 percent of
the pre-C1 payload N0) converted to percent-of-current-bytes by the factor
1/0.9447 = 1.06 where noted.

### B1. The collection layer: real adaptive cost vs static conditional optimum

MEASURED, the largest single identified bucket. On the exact v1 residual
stream (D0 harness, pooled kodim01+kodim13): real adaptive v2 payload =
-5.53 points of v0 while the class16 bin-fine static optimum = -11.48 and
ctx343 value-mode = -12.99. The spread, roughly 5.95 points of v0 = 6.30
percent of current real bytes, is paid BY the online adaptation process:
transient learning cost, nonstationarity tracking loss, per-sample estimation
noise. v1 proved causal collectors cannot harvest it (D2 mixer best -0.90
percent vs >= 3 gate; D4b worse; E2 oracle-init A-share only 0.073 points;
E0 B_coarse shows adaptive already beats same-structure static pooling).
The ONLY legitimate mechanism left is forward adaptation: encoder-side
statistics computed from the whole image and transmitted - information no
causal collector has. This is exactly what JPEG XL modular does (static
per-context distributions learned in an encoding pass, then ANS-coded) and
what v1's E2 family never correctly implemented (its tables were GLOBAL
class16 pools, structurally blind to locality; E0 proved locality is where
the adaptive win lives).

**Bucket size: up to 6.30 percent of current bytes gross; realistic net
capture after table/map side-info 2.5 to 4.5 percent.**

### B2. Conditioning deficit beyond resdiff-343, scored per-image

MEASURED (E0 M-C readout, durable CSV
`2026-08-25-ideal-props-e0.csv`): enriching the property vector with
previously-coded residual quotients qW/qN/qNW/qNE plus CALIC gradient pair
gb plus plane id yields per-image static margins over ctx343-fine of +2.67 /
+1.86 / +2.87 / +2.95 points of v0 on kodim01/13/05/20 - EVERY individual
image clears the pre-registered 1.5 bar comfortably. The formal M-C verdict
was FAIL only because the pooled-TOTAL joint estimate across the four images
suffered mixture interference (pooled margin 1.33). Production codes ONE
image at a time; the pooled artifact has no physical counterpart. The
per-image margins are real conditional information that v1's flat class16
keying never touches.

**Bucket size: roughly 2.0 to 3.1 percent of current bytes (1.86 to 2.95
points x 1.06), before any predictor coupling; realistic net 1.5 to 2.5
percent after model bytes (I9).**

### B3. Predictor headroom beyond MED

PARTIALLY PROBED, literature-bounded. Every predictor lever v1 tested was
scored through the zero-flag-first binarization whose zero economics price
MED's exact-zero residual mode below its conditional worth; two independent
families backfired through the SAME mechanism (D1 NLMS blends mixed-sign;
E1 bias cancellation WORSE by 19.85/16.33 points of v0 with payload +70.2 /
+21.7 percent - moving predictions toward the conditional mean spreads mass
off the cheap zero mode). Those rejections are confounded at the scoring
layer and do not bound what a better predictor is worth under an entropy
stage without that pathology. Untested families with strong literature
anchors: GAP (CALIC), the JPEG XL self-correcting weighted ensemble
(four sub-predictors, gradient-adapted multiplicative weights, max-error
feedback - slow adaptation geometry, distinct from D1's fast per-sample
NLMS), and simple error feedback under a symmetric tokenization. Literature
delta of these families over MED-class prediction on continuous-tone
material: 3 to 8 percent (CALIC-vs-JPEG-LS class results; Mamedov 2024 GAP
study; JXL white paper design rationale).

**Bucket size: unmeasurable today by construction; planning range 2 to 5
percent of current bytes if and only if the entropy stage stops punishing
center-shifts (V2b explicitly re-tests one bias mechanism as a canary).**

### B4. Whole-configuration trial selection

PRECEDENT-EXTRAPOLATED. C3 trial-encoded decisions (color transform, CFL
scales, global predictor by REAL coded bytes) captured -0.62 percent from a
decision space of three. JPEG XL effort 9 searches a far larger space
(RCT family, predictor configuration, tree shape, cluster counts, group
sizes) with decoder-side cost near zero. v2 inherits the trial-bits
discipline and expands the space.

**Bucket size: 0.5 to 1.5 percent of current bytes.**

### B5. Tokenization and stream-shaping refinements

PRECEDENT-MEASURED in the old frame: F3 showed bin-ordering alone swings
3.4 to 5.1 percent (zero-flag-first win) and naive Rice-k backfires; D4a
showed run-mode symbol-space reparametrizations are dead under peaked-zero
streams. Under a NEW backend these choices re-open, but their expected
magnitudes are smaller once the big buckets are harvested.

**Bucket size: 0.5 to 1.0 percent of current bytes; measured, never
assumed, at V1 time.**

### Sum check and honest arithmetic

Optimistic-edge sum: 6.30 + 3.1 + 5.0 + 1.5 + 1.0 = 16.9 percent of current
bytes > 14.48 required for M3. Midpoint sum: about 12 to 13 percent -
comfortably past M2 (6.15), short of M3. Base-case landing: **summed
9.1 to 9.7 / per-sample 3.03 to 3.23: M2 PASS expected, M3 reachable only
if most buckets deliver near their optimistic edges simultaneously**, or if
the reserve lever (section 5, V5) pays out. Nothing exotic is required
information-theoretically: the identified buckets sum past the target at
their edges, which is why a clean-slate program is justified where v1's
exhausted architecture was not.

## 2. The consolidated ledger: carried constraints vs reopened items

Clean slate does NOT mean selective amnesia. Every prior result maps to
exactly one of: HARD CONSTRAINT (transfers to any architecture),
REOPENED-WITH-CONFOUND (re-testable under a named structural change), or
TEMPLATE (positive pattern to reuse).

### 2.1 Hard constraints (bind v2 regardless of architecture)

- L-C1 Trial encoding or nothing: every reversible decision (transforms,
  predictors, tree shapes, cluster counts) is decided by REAL coded bytes,
  never energy proxies. (C3/P4; the estimator-bug class is extinct.)
- L-C2 Net accounting: payload + tables + maps + trees reported JOINTLY;
  payload-only wins are not wins. (I9; C2/C2b.)
- L-C3 No new causal mixing of same-information estimators: mixers, SSE
  stacks, and their relatives carry three measured strikes. (D2/D4b/F3-V2.)
- L-C4 Symbol-space reparametrizations of a peaked-zero stream (run modes,
  dictionary recodings of residuals) start presumed dead. (D4a; Obsidian
  color-cache/LZ77 inert on photographic Kodak.)
- L-C5 Zero separation must be cheap in any tokenization: sign-before-zero
  cost 3.4 to 5.1 percent (F3); the v2 token stream must isolate the zero
  event first-class.
- L-C6 Adaptation damping: naive Rice-k EMA quotient oscillation (F3-V2/V4)
  forbids under-damped single-rate estimators anywhere in v2.
- L-C7 Squeeze/lifting and cross-band prediction carry TWO independent
  negative ledgers (F2/C4/C5 here; R11/Squeeze/Lift in Obsidian) when
  contexts are parent-blind; transform-first is dead. Any v2 transform work
  enters only as gated reserve (V5), parent-properties included by design
  or not at all.
- L-C8 Process discipline verbatim: sha-pin corpus verification BEFORE
  measuring; durable dated CSVs; self-checks that can demonstrably fail;
  STOP rules fire on missed gates; spec addendum with pinned constants
  BEFORE any measurement; wall-clock <= 5x phase guard; fuzz + byte-exact
  round-trip always.
- L-C9 From-scratch scope: no external compression libraries (repo scope
  guard); everything below is implementable in-house.

### 2.2 Reopened items, each with its written confound argument (rule I11)

- R-1 Forward-adaptive static coding (E2 descendant). CONFOUND: E2's tables
  were global class16 pools on v1's stream; E0 proved the adaptive advantage
  is LOCAL structure (B_coarse = -0.91: adaptive beats same-structure static
  pooling; the fine-grained share needs future information). Structural
  delta in v2: SPATIALLY CLUSTERED static tables (entropy-image/tile or
  MA-tree leaf clusters, dozens to hundreds per image) + transmitted
  distributions + a tokenization chosen for static coding. E2's own closure
  text pre-authorized exactly this reopening condition ("unless a future
  stream change reopens it").
- R-2 Self-correcting weighted prediction and GAP. CONFOUND: D1 tested two
  NLMS blend families at fast per-sample rates; the weighted-ensemble family
  adapts multiplicatively over sub-predictions with slow rates and carries
  max-error feedback - different estimator class, and its literature anchor
  is precisely the codec we must match.
- R-3 Bias/error feedback (E1 descendant). CONFOUND: E1's catastrophic
  regression (+19.85/+16.33 points) is attributable to the zero-mode pricing
  pathology of the v2 binarization; a symmetric hybrid-token tokenization
  has no structural incentive to keep predictions pinned at MED. Re-tested
  ONCE as a small canary gate (V2b); a second strike closes it forever.
- R-4 Per-image learned context structure (MANIAC descendant). CONFOUND:
  E3 died on a POOLED joint statistic that production never faces; per-image
  margins were healthy everywhere (E0 anomaly record). v2 scores viability
  PER-IMAGE primary (new rule I10) with model bytes included.
- NOT REOPENED under any label: causal mixers/SSE (L-C3), run modes
  (L-C4), energy proxies (L-C1), parent-blind transforms (L-C7).

## 3. Candidate architecture family (for the Architect)

A single-pipeline predictive codec; no multi-resolution stage in the base
path (L-C7). Stages:

1. **Color:** trial-selected RCT over the full adopted family (YCoCg-R +
   LOCO rotations, D4c ids), decided by real coded bytes end-to-end.
2. **Prediction:** trial-selected bank {MED control, GAP, self-correcting
   weighted ensemble W over sub-predictors {W,N,NW,TE} with multiplicative
   gradient-adapted weights w_i <- clamp(w_i * exp(-c*|e_i|)), slow rate,
   plus max-error feedback property}, optionally per-cluster selector id.
   Mathematics pinned in spec addendum 17 BEFORE any V2 measurement.
3. **Residual tokenization:** fold residual r via signed-minimum-redundancy
   mapping (zigzag family) to u >= 0; emit token t = min(u, T_ESC) with
   dedicated ZERO token t=0; escaped magnitudes carry ceil(log2)-style raw
   bits below a pinned escape ladder (JXL hybrid-uint analog). Zero event
   first-class (L-C5).
4. **Context/clustering:** properties p = (bucketed gradients gW,gN,gNW,gNE,
   quantized past errors eW,eN,eNW, plane id, coarse position). Structure
   candidates, trial-selected: (a) flat hashed classes (v1-style fallback);
   (b) grid entropy-image tiles mapped to K cluster ids; (c) depth-limited
   MA-tree over p assigning cluster ids (and optionally predictor ids) per
   leaf. Counts floored: min samples per cluster ~4096 so 12-bit frequency
   tables stay statistically sane.
5. **Entropy backend:** per-cluster STATIC distributions estimated in
   encoder pass 1 (counts smoothed toward a geometric prior, normalized to
   2^12), coded by rANS (interleaved) or binary arithmetic with static
   probabilities + optional epsilon-slow adaptation - BOTH scored, winner by
   bytes (L-C1). Tables serialized hierarchically (image-level prior, then
   per-cluster 12-bit deltas) and compressed recursively by the same coder;
   all side-info bytes NETTED (L-C2/I12).
6. **Effort ladder:** encoder-only search breadth over stages 1-5; bitstream
   version bumped; decoders are O(N) table lookups either way.

Decode path stays mirror-exact by construction: every adaptive element is
decoder-computable or transmitted; fuzz + corruption gates unchanged.

## 4. Pre-registered V-series measurement program (offline first)

Probe quad unchanged: kodim01/kodim13/kodim05/kodim20, sha-pins verified
before ANY measurement; corpus-wide numbers only at final checkpoint.
PRIMARY scoring: per-image medians and per-image minimum wins (rule I10);
pooled rows diagnostic only. All gates registered HERE before measurement;
constants land in spec addendum 17 (Builder slice 1) before the first CSV.

- **V0 Harness spine (blocking):** offline sandbox implementing stages 3-5
  over arbitrary predictor streams, with: anchor rails reproducing v1
  reference rows within stated rounding on the OLD stream; corrupt-injection
  failability proofs; ranking-provable self-checks; determinism byte-for-
  byte; dated reference CSVs. No V-phase result is valid without a green V0.
- **V1 Backend/tokenization (attacks B1+B5):** score the EXACT v1 residual
  streams under candidate tokenizations x {clustered-static, real-adaptive
  control}. Sub-gates, all per-image median on the quad:
  V1a oracle-map upper bound (map free) must beat control by >= 2.0 percent
  NET of table bytes at assumed transmission; V1b realistic maps (grid/tree)
  must retain >= half the V1a win NET. Fail => bucket B1 declared
  unreachable in v2 and the program pivots source-side-only (owner informed).
- **V2 Predictor families (attacks B3):** new-stream static-ideal lengths
  under the V1-winning backend, families {MED control, GAP, weighted
  ensemble}; gate: best non-MED beats MED by >= 1.5 percent median per-image.
  Fail => MED stays, B3 recorded closed-with-numbers.
- **V2b Error-feedback canary:** additive per-cluster correction on the V2
  winner; gate: >= 0.5 percent median improvement, no image regressing more
  than 0.25 percent. Second strike => permanent exclusion.
- **V3 Context structures (attacks B2):** extended-property clustering
  (flat vs grid vs tree) vs best-flat classing, NET of model/map bytes;
  gate: >= 1.5 percent median per-image. Fail => flat keying ships.
- **V4 Composition + projection:** compose all winners; measure quad NET;
  project corpus by per-image deltas applied to the committed e1 CSV.
  Proceed-to-format threshold: projected corpus < 9.35 summed AND < 3.117
  per-sample (2 percent margin under M2). Below threshold: stop-and-report
  with the full ledger; no format bytes were spent (standing rule).
- **V5 RESERVE (only if V4 projects inside M3 reach but short of it):**
  one-shot squeeze-with-parent-properties test (HF bands conditioned on
  co-located decoded parent values as properties, lifting shared with
  Obsidian's bijection-tested variant); strict gate >= 2.0 percent median
  NET or the lever dies with its third strike. Never opened otherwise.

STOP-rule discipline identical to D/E phases: any gate failure records the
negative in the tracker the same day and moves budget; zero container bytes
until V4 passes; final PR judged ONLY by bench_gate.sh in both units on the
fresh corpus measure (M2 AND M3), exactly as the freeze demands.

## 5. Decision tree

| outcome | consequence |
|---|---|
| V1 fails | B1 closed; source-side-only pivot; M3 unlikely; owner informed before Architect commits |
| V1 passes, V2/V3 partial | compose winners targeting M2; M3 stretch documented honestly |
| V4 threshold met | Architect blueprints the format program; Builder implements behind version bump |
| V4 projects into M3 reach | open V5 reserve once; compose; then format program |
| everything fails | report with full ledger; recommend honest close or owner-directed exotic program |

## 6. Invariants

I1-I9 carry verbatim (blueprint + rescope + endgame). Added:

- **I10 (per-image primacy):** viability gates score per-image medians/
  minima as PRIMARY because production codes single images; pooled joint
  rows are diagnostics. Registered prospectively; post-hoc bar changes stay
  forbidden (E0 discipline intact).
- **I11 (reopening rule):** a mechanism measured dead under architecture A
  may be re-registered under architecture B only with a written confound
  argument naming the structural delta (section 2.2 satisfies this for
  R-1..R-4); relabeling without delta is forbidden.
- **I12 (net accounting extension):** I9 extends to cluster maps, tiles,
  and tree serialization; every V-row reports payload and side info jointly.

## 7. Complexity and budgets

Encode: two O(N) passes + trial encodes (bounded by effort ladder; wall
clock <= 5x phase guard, peak RSS logged). Decode: O(N) with table lookups;
memory O(K * alphabet + window), K <= 256, alphabet <= ~34 tokens + escapes.
No second frame buffer beyond the image itself. All mechanisms O(1) amortized
per sample.

## 8. Handoff

Next pipeline step: **Architect** (`{"action": "architect"}`). Blueprint
inputs: this document (buckets B1-B5 with provenance; constraints L-C1..
L-C9; reopened set R-1..R-4; architecture sketch section 3; V-series gates
section 4). The Architect's first deliverable is the V0 harness blueprint +
spec addendum 17 skeleton; NO measurement slice may precede addendum 17
(established pre-registration discipline). The binding end gates remain
M2 AND M3 in both units on a fresh corpus measurement against real cjxl
output; nothing in this document relaxes the freeze.

- Dr. Mob, the Researcher
