# Prism V-series blueprint: the v2 clean-slate program (Architect handoff for #130)

- **Issue:** #130 (owner authorized Prism v2 via Mae's kickoff 2026-08-25;
  M2/M3 dual-unit freeze stands; brainstorm board frozen)
- **Role:** the Architect
- **Trigger:** `/oc architect` dispatch on PR #145, 2026-08-25; Dr. Mob
  delivered `research-v2-clean-slate.md` (buckets B1-B5, constraints L-C1..
  L-C9, reopenings R-1..R-4, pre-registered V-series gates) and handed off
  `{"action":"architect"}`.
- **Inputs:** `research-v2-clean-slate.md` (primary: section 3 architecture
  sketch, section 4 V-series gates, section 2 consolidated ledger),
  `architecture-jxl-parity-eseries.md` (the E-series pattern this program
  deliberately reuses), `algorithmic-spec.md` addenda 11-16 (instrumentation,
  mixer, rotation, E-series, bias contracts), the committed harness CSVs
  under `benchmarks/results/`, and corpus truth e1 = 10.1210 summed /
  3.3737 per-sample bpp.
- **Scope of THIS doc:** turn the research specification into a buildable,
  ordered, gated program whose FIRST deliverable is the V0 harness spine -
  a new offline sandbox implementing stages 3-5 of the research architecture
  sketch over arbitrary predictor streams - plus spec addendum 17
  (registered as algorithmic-spec section 18) pinning every constant that
  can be fixed before any measurement. NO measurement slice may precede the
  addendum (established pre-registration discipline).

Units discipline unchanged: every number states its unit; on Kodak-24
(C=3) summed = 3 x per-sample exactly; final judgment stays bench_gate.sh
in both units against real cjxl output; no success claim without a fresh
measurement; every offline go/no-go cites committed-harness rows (I7/I8)
under net accounting extended to maps/tiles/trees (I12).

---

## 0. Where this program stands (evidence state as build constraints)

Carried hard constraints (L-C1..L-C9 bind any v2 architecture): trial
encoding or nothing by REAL bytes; joint payload+side-info accounting; no
causal mixing of same-information estimators; no run-mode reparametrizations
of peaked-zero streams; zero separation cheap in every tokenization; damped
adaptation only; transform-first dead without parent properties; full
process discipline (sha-pins before measuring, dated CSVs, fail-capable
self-checks, addendum before measurement, wall-clock guard, fuzz +
round-trip); from-scratch scope (no external compression libraries).

Reopened set with named confounds (R-1..R-4, rule I11): forward-adaptive
SPATIALLY CLUSTERED static coding (E2 was global pools; E0 proved locality);
weighted-ensemble/GAP prediction (D1 tested fast per-sample NLMS blends only;
the ensemble class adapts multiplicatively at slow rates with max-error
feedback - and its literature anchor is precisely JXL); bias/error feedback
re-tested ONCE under symmetric tokenization as the V2b canary; per-image
scored context trees (E3 died on pooled-joint scoring; I10 now makes
per-image primary).

NOT reopened under any label: causal mixers/SSE, run modes, energy proxies,
parent-blind transforms.

The five buckets and their committed sizes (percent of current real bytes):
B1 collection layer up to 6.30 gross / 2.5-4.5 net realistic; B2 conditioning
margins ~2.0-3.1 gross / 1.5-2.5 net; B3 predictors unmeasurable today,
planning range 2-5 conditional on the entropy stage stopping punishing
center-shifts; B4 trial selection 0.5-1.5; B5 tokenization 0.5-1.0.
Optimistic-edge sum 16.9 > 14.48 required for M3; midpoint ~12-13 clears
M2's 6.15 comfortably. Honest base case recorded by research: M2 PASS
expected, M3 contingent on top-quartile outcomes or the gated V5 reserve.

## 1. Build spine: V0 sandbox first, blocking, everything else strictly conditional

### Spec addendum 17 lands FIRST (algorithmic-spec.md section 18)

All constants pinned before any measurement: gate reading (relative percent
unit, per-image median primacy per I10), anchor tolerances, model smoothing
prior, escape ladders, cluster floors and caps, table serialization shape,
V2 predictor mathematics (GAP + weighted ensemble W, integer-exact), the
V4 projection formula, and the reserved-slot rule for later phase constants.
No constant may be tuned after a measurement has been seen; deviations are
amendments BEFORE measurement or they never happen.

### V0: the sandbox spine (offline-only, BLOCKING, first slice)

A NEW instrument, not another bench-ideal mode. bench-ideal stays frozen as
the v1-era reference instrument (its committed CSVs are anchors); the v2
sandbox gets its own CLI command so neither file format nor flags churn.

New CLI command: `prism bench-sandbox <image>... [modes]`. New library
modules, all FORMAT-UNWIRED (zero container bytes until V4 passes):

- `tokenize.{h,cpp}` - pluggable tokenization profiles over residual planes.
  Profile ZFFCTRL replays the shipped zero-flag-first binarization sequence
  (anchor control). Profile HYB<T_ESC> implements the research stage 3:
  zigzag-fold r to u >= 0, ZERO token t = 0 exclusively for r = 0, token
  t = u for 0 < u < T_ESC, escape token T_ESC followed by unary quotient of
  bit_length(u - T_ESC) - 1 over a dedicated escape context plus the raw low
  bits. Three ladders pinned in the addendum (ESC-A/B/C).
- `staticmodel.{h,cpp}` - clustered-static machinery: pass-1 counting per
  (cluster, bin type), smoothing toward the pinned geometric prior,
  normalization to 2^12, hierarchical serialization (image-level prior then
  per-cluster deltas), CRC32 over uncompressed table bytes, and a NET
  accounting API returning {payload, tables, maps, trees} jointly (I12).
- Backends scored on tokens x clusters:
  B-IDEAL exact static ideal lengths (the oracle bracket bounding all real
  coders); B-RANS interleaved rANS with static per-cluster tables (rans.h
  reuse); B-BAC binary arithmetic with static probabilities, optional
  epsilon-slow adaptation OFF for V0/V1 controls; B-ADAPT production
  ACModelsV2 replay (the real adaptive control, existing helpers).
- Keying providers (pluggable context structure interface): KFLAT16 (v1
  class16 control), KFLAT343 (resdiff control), KGRID(tile), KTREE(caps).
  V0 needs only the two flat controls; grid/tree arrive at V3 but the
  INTERFACE is defined now so nothing is reshaped later.

Rails and gates (pre-registered in addendum 17; evaluated by a new rail
script `probe_sandbox.sh`; a rejection is a legitimate measured outcome and
never flips exit code EXCEPT rail-integrity checks, which do):

- VB-anchor-adapt (rail integrity): B-ADAPT rows reproduce the committed
  bench-ideal med reference rows bit-for-bit on the bits columns, quad.
- VB-anchor-ideal (rail integrity): B-IDEAL rows reproduce the committed
  IDEAL rows bit-for-bit, quad.
- VB-coder-fidelity (rail integrity): B-RANS and B-BAC total bytes within
  +0.50 percent of their own B-IDEAL row per image (proves the new engines
  code near the entropy bound before anything trusts them).
- VB-net-audit (rail integrity): side-info bytes counted twice - serializer
  output length vs an independent incremental counter - must agree exactly
  on every row (I12 made falsifiable).
- VB-corrupt (failability proof): injected corruption (one flipped table
  delta; one flipped map id; truncated tree blob) must hard-detect (CRC /
  length / mismatch) or produce a cost explosion > +10 percent vs the clean
  row AND a round-trip mismatch flag; if ANY injection passes silently the
  rail fails. A self-check that cannot fire is dead code (E0 lesson).
- VB-rank (ranking-provable self-checks): two constructed fixtures - a
  two-half opposite-skew image where clustered-static MUST beat pooled
  static, and a homogeneous image where pooled MUST win or tie - both
  verdicts reachable or the rail is dead.
- VB-determinism (rail integrity): full quad re-run emits byte-identical
  CSVs.

CSV: dated files `YYYY-MM-DD-sandbox-v0.csv` (+ `-v1`, `-v2`, `-v2b`,
`-v3`, `-v4`, `-v5` per phase) under prism/benchmarks/results/, one file per
phase so earlier references stay stable (D2 separation pattern). Every
performance row carries: image, profile id, backend id, keying id,
payload_bytes, table_bytes, map_bytes, tree_bytes, net_bytes, relpct vs the
phase control, points-of-v0 equivalent, unit tags.

V0 exit condition: all rails green, dated reference CSV committed, THEN and
only then V1 scoring may run. No V-phase result is valid without a green V0
(research section 4, binding).

Wall-clock guard: V0 build <= 2.0x the bench-ideal quad time (inside the
standing 5x phase guard; peak RSS logged per I6).

### V1: backend/tokenization (attacks B1 + B5; first decision phase)

Score the EXACT v1 residual streams (production MED path dumps) under:
{ZFFCTRL, HYB-ESC-A, HYB-ESC-B, HYB-ESC-C} x {clustered-static K-grid-128,
K-tree, KFLAT16} backends, PLUS the oracle-map upper bound.

- CONTROL (pinned reading): the v1 real-adaptive baseline = fresh B-ADAPT
  net bytes on ZFFCTRL for the same image (re-measured in-sandbox each run;
  equals the committed e1-era rows per VB-anchor-adapt).
- V1a ORACLE-MAP: per-cluster assignment taken from the true per-sample
  optimum pass (map transmitted FREE in gate arithmetic; map bytes REPORTED
  in a dedicated column so the freebie is always visible). Gate: best
  clustered-static configuration beats CONTROL by >= 2.0 percent relative
  NET, median across the quad (I10 primary; per-image min/max reported;
  pooled TOTAL diagnostic only). Table bytes INCLUDED (never free).
- V1b REALISTIC-MAPS: same configurations with grid/tree maps actually
  serialized and NETTED (I12). Gate: retains >= half the V1a margin NET,
  median across the quad.
- FAIL clause (binding): V1a-or-V1b failure declares bucket B1 unreachable
  in v2 with the committed CSV as evidence; the program pivots source-side-
  only and the owner is informed BEFORE the Architect commits to the pivot
  blueprint (decision tree below).

### V2: predictor families (attacks B3)

New-stream generation by offline causal prediction replay (mirror-exact by
construction: every predictor consumes decoded history only): families
{MED control, GAP, W ensemble} per the addendum 17.3 mathematics, scored as
static-ideal lengths AND real backend bytes under the V1-winning
backend/tokenization/keying. Gate: best non-MED family beats MED by
>= 1.5 percent relative NET median per-image. FAIL => MED ships, B3
recorded closed-with-numbers.

V2b ERROR-FEEDBACK CANARY (one shot): additive per-cluster correction
(addendum 14.3 mechanism-(a) shape transplanted onto the winning symmetric
tokenization) on the V2 winner. Gate: >= 0.5 percent relative NET median
improvement AND no image regressing more than 0.25 percent. Second strike
closes bias feedback FOREVER (R-3's own terms; no third trial exists).

### V3: context structures (attacks B2)

Extended-property clustering under the V1/V2 winners: KFLAT16-extended
(flat hash over the full property vector), KGRID, KTREE (caps inherited
from matree_builder: depth <= 10, leaves <= 256, min-samples floored per
addendum 17) vs the best-flat keying, all NET of model/map/tree bytes.
Gate: >= 1.5 percent relative NET median per-image vs best-flat. FAIL =>
flat keying ships; B2 recorded closed-with-numbers. Per-image margins are
PRIMARY (I10) - this phase exists because pooled scoring killed R-4 in v1.

### V4: composition + projection (the proceed-to-format threshold)

Compose ALL adopted winners (color trial-selection from the inherited D4c
family rides along as stage 1); measure quad NET; project the corpus by the
PINNED formula (addendum 17.5): proj_bytes(img) = e1_bytes(img) x
(1 - relpct_composed(img)/100), summed over the sha-pinned Kodak-24 using
the committed `2026-08-25-prism-e1.csv` per-image bytes as the base.
Threshold (pre-registered by research, restated): projected < 9.35 summed
AND < 3.117 per-sample bpp => proceed to format program. Below threshold:
stop-and-report with the full ledger; zero format bytes were spent
(standing rule honored by construction).

### V5 RESERVE (opens ONLY if V4 projects inside M3 reach but short of it)

One-shot squeeze-with-parent-properties test: HF bands conditioned on
co-located DECODED parent values as properties (Obsidian's bijection-tested
lifting variant shared), strict gate >= 2.0 percent relative NET median or
the lever dies with its third strike. Never opened otherwise (L-C7).

## 2. Module map additions

```text
include/prism/codec/tokenize.h
src/codec/tokenize.cpp                      [V0] ZFFCTRL + HYB ladders, zigzag fold
include/prism/codec/staticmodel.h
src/codec/staticmodel.cpp                   [V0] clustered-static counts, smoothing,
                                            2^12 normalization, hierarchical blob,
                                            CRC32, NET accounting API (I12)
src/cli/main.cpp                            [V0] prism bench-sandbox command + modes
benchmarks/probe_sandbox.sh                 [V0] rails VB-* + phase gates, dated CSVs,
                                            failability self-checks
tests/unit/test_tokenize.cpp                [V0] bijection both directions, ladder edges,
                                            determinism, zero-token exclusivity
tests/unit/test_staticmodel.cpp             [V0] count/normalize/smoothing pins, blob
                                            round-trip, CRC rejection, double-count audit
prism/docs/algorithmic-spec.md              [FIRST] section 18 = spec addendum 17:
                                            every constant pre-registered
src/codec/predict.cpp                       [V2] GAP + W ensemble replay (format-unwired)
tests/unit/test_predict.cpp (extend)        [V2] pinned-arithmetic checks, border rules
```

No container/container-header/acoder-production changes exist anywhere in
this program until a V4 PASS; that boundary IS the design.

## 3. Test matrix additions

| Layer | Gate |
|---|---|
| Tokenize unit | zigzag bijection over dense lattice incl. BD extremes; ZERO-token exclusivity (r=0 never escapes, r!=0 never takes t=0); ladder edge values T_ESC +/- 1; step-exact determinism |
| Staticmodel unit | smoothing/normalization arithmetic matches pinned formulas on hand-checked vectors; serialize/deserialize bijection; corrupted CRC rejected loudly; independent byte counters agree |
| Sandbox harness | probe_sandbox --self-check exercises EVERY VB rail's FAIL path (anchor drift fixture, fidelity-violating coder stub, silent-corruption injection, rank fixtures flipped) - all must demonstrably fail |
| Predictor unit (V2) | GAP/W replay weights == decoder-side weights step-by-step on random planes; clamp bounds; identity when family = MED |
| Corpus | unchanged: sha-pinned Kodak-24 verified BEFORE any measurement; fuzz + byte-exact round-trip on the shipped codec untouched throughout |

## 4. Risk register additions

- **Anchor drift in the new sandbox:** treat as harness bug first (I7);
  never tune numbers to restore an inequality. VB-anchor rails flip exit
  codes precisely so this cannot pass silently.
- **Coder-fidelity borderline (B-RANS slightly over bound):** the +0.50
  percent bound was sized from measured rANS overhead history (M0-era
  efficiency tests); a miss means an implementation defect (flush padding,
  table renormalization), not a wrong constant - fix the engine.
- **Oracle-map wins, realistic maps lose (V1a PASS / V1b FAIL):** the
  pre-declared outcome is partial credit: B1 harvestable only at >= half
  margin with real maps; the V4 composition uses the MEASURED realistic
  number, never the oracle. Temptation to ship oracle arithmetic is
  pre-refused here.
- **V2 winner changes stream statistics mid-program:** V3/V4 rescore the
  control rows under the SAME winners so every gate compares like with
  like; stale cross-phase comparisons are invalid and must not appear in
  verdict lines.
- **Pooled-row seduction:** TOTAL rows pool histograms across images
  (joint estimates, intentionally non-additive); I10 makes per-image
  medians the ONLY gate figure. The E0 anomaly is permanent precedent.
- **Silent scope creep toward format work:** the module map contains no
  container edits by construction; a PR that touches container files
  before a V4 PASS is rejectable on sight by the Reviewer.

## 5. State and complexity budgets

Encode-side sandbox passes are O(N) per configuration; trial breadth bounded
by the effort-ladder rule (each stage's candidates enumerated exhaustively
but independently, compositions only among gate winners). State: per-cluster
tables <= 256 clusters x ~34 tokens x 4 B (~35 KB peak, streamed per plane);
no second frame buffer beyond the image; all mechanisms O(1) amortized per
sample. Wall-clock guards: V0 <= 2.0x quad baseline; V1 <= 3.0x (trial
breadth); V2/V3 <= 2.0x each; all inside the standing 5x phase guard, peak
RSS logged per I6.

## 6. Builder slicing (continuation granularity)

- Slice 1 (V0): spec addendum 17 FIRST (already landed with this blueprint;
  Builder verifies, never retunes); tokenize + staticmodel modules; sandbox
  CLI; probe_sandbox.sh rails + self-checks; dated v0 reference CSVs; all
  six VB rails green. Handoff decision per the tree.
- Slice 2 (V1): tokenization x keying x backend sweep on the pinned quad;
  V1a/V1b verdicts written into the tracker with CSV paths the same day;
  STOP rule fires on miss.
- Slice 3 (V2 [+ V2b if V2 passes]): predictor replay + scoring; verdicts;
  canary only on a V2 PASS.
- Slice 4 (V3): clustering structures; NET verdicts.
- Slice 5 (V4): composition + projection against the pinned threshold;
  stop-and-report or format-program handoff. V5 reserve only per its
  trigger clause.
- Every slice: dated CSV, tracker checklist update, agent log entry, honest
  verdict wording; zero container bytes until V4 passes.

## 7. Decision tree (binding; mirrors research section 5)

| measurement outcome | consequence |
|---|---|
| V1 fails (either sub-gate) | B1 closed-with-numbers; owner informed; Architect re-engaged BEFORE any pivot blueprint commits (source-side-only pivot is the default candidate, M3 unlikely) |
| V1 passes, V2 or V3 fails partially | compose the winners; target M2; M3 stretch documented honestly in the V4 report |
| V4 threshold met (< 9.35 / < 3.117 projected) | Architect blueprints the format program behind a version bump; Builder implements |
| V4 projects into M3 reach but short | V5 reserve opens ONCE; compose; then format program or stop-and-report |
| everything fails | stop-and-report with the full ledger; recommend honest close or owner-directed exotic program |

Every row keeps the freeze intact: nothing merges without M2 AND M3 passing
in BOTH units on a fresh reproducible dual-unit measurement against real
cjxl output; no partial result is ever worded as parity.

## 8. Honest projections (restated so no continuation rediscovers optimism)

Research base case: composed winners land summed ~9.1-9.7 => M2 PASS
expected; M3 requires most buckets near optimistic edges simultaneously or
a V5 payout. The program is ordered so discovering failure costs one slice
per bucket and ZERO format bytes total unless V4 passes.

---

Merge gate unchanged (owner freeze): M2 AND M3 genuinely pass dual-unit on
a fresh reproducible measurement, decode byte-exact 24/24, fuzz clean, CSV
+ comparison-table row updated. Invariants I1-I12 apply; I10 (per-image
primacy), I11 (named structural delta for reopenings), I12 (net accounting
covers maps/tiles/trees) bind from V0 on.

- the Architect
