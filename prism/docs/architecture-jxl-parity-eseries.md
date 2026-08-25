# Prism E-series blueprint: the endgame program (Architect handoff for #130)

- **Issue:** #130 (owner directive 2026-08-23; dual-unit freeze stands)
- **Role:** the Architect
- **Trigger:** owner resolved the D-series endgame clause into the MANIAC-grade
  research program (research dispatches of 2026-08-25 on the PR thread); Dr.
  Mob delivered the gap decomposition and pre-registered gates; tracker
  next-step item 3 sends the E-series to this blueprint before any Builder
  phase starts.
- **Inputs:** `research-e-series-endgame.md` (primary: decomposition A/B/C/D,
  measurements M-A/M-B/M-C, interventions E1-E4, decision tree),
  `architecture-jxl-parity-rescope.md` (D-series, all phases closed),
  `architecture-jxl-parity.md` (C-series, sections 3-7 carrying status notes),
  the seven builder decision records, the committed harness references under
  `benchmarks/results/`, and the tracker corpus truth (e1 = 10.1210 summed /
  3.3737 per-sample bpp after D4c).
- **Scope of THIS doc:** turn the research specification into a buildable,
  ordered, gated program: what gets built first (measurement, always), which
  module boundaries and container mechanics the interventions use, what each
  acceptance bar is, and what happens in every branch of the outcome space -
  including the honest-closure branch that remains the base case.

Units discipline unchanged: every number states its unit; gates compare in
both units via `benchmarks/bench_gate.sh`; no success claim without a fresh
measurement; every go/no-go cites committed-harness rows tagged by gap
component (I7/I8).

---

## 0. Where this program stands (evidence state, restated as build constraints)

Closed by measurement, do not reopen without NEW harness evidence:

| Direction | Closure evidence |
|---|---|
| Static spatial transforms (decimation, lifting, cross-band) | F2 + C4 + C5 |
| Spatial/static context refinement on flat planes | C2 + C2b; harness ceiling 1.13 points bin-fine / 1.47 value mode |
| Per-sample fast adaptive prediction (NLMS blends) | D1, mixed sign, order of magnitude under bar |
| Causal mixer/SSE stacks | D2 + D4b, best -0.90 pct vs >= 3 pct gate |
| Zero-run symbol reparametrization | D4a, +0.28 pct worse |
| Energy proxies in any decision path | deleted by construction since C3 |

Adopted and in production: backend v2 collector (C1 retune), trial-encoded
decisions (C3), color rotations (D4c). Corpus truth e1 = 10.1210 summed /
3.3737 per-sample; distance to M2 = 6.15 percent bytes, to M3 = 14.48 percent
(research section 0 arithmetic).

Two structural facts drive the whole program (research Facts 1-2):
binarization is NOT the bottleneck (0.38 points value-vs-fine), and the real-
vs-class16 collection gap is exactly 5.95 points of v0 (= 6.30 percent of
current real bytes) on a FIXED event stream. The split of those 5.95 into
learning/transient (A) and tracking (B) is UNMEASURED, and the conditioning
deficit (C) beyond resdiff-343 is UNMEASURED. Everything below exists to
measure those two numbers for the price of one Builder slice, then spend
format bytes only where a pre-registered gate passed.

Binding constraint inherited from lab history: interventions that change WHAT
the stream contains have positive adoption record (D4c); interventions that
re-code the same stream causally have a perfect negative record. E1 changes
the stream (source-side); E2 imports future information legitimately
(forward adaptation); E3 conditions on genuinely NEW coordinates (previously-
coded residual quotients). Each is a different mechanism class from every
rejected family. That is why these three and only these three survive.

## 1. Build spine: E0 measurement first, everything else strictly conditional

### E0: harness extension + M-A / M-B / M-C (blocking, offline-only, first)

Spec addendum 14 lands FIRST (algorithmic-spec.md, D4c discipline): all
constants pre-registered before any measurement - gradient bucket thresholds
scaled by bit depth, quotient clamp range, hash-cell caps and count floors,
frozen-table normalization sum (2^12), delta serialization width (16-bit),
side-info budget formula, bias update shift and Bmax = 2^(BD-3). No constant
may be tuned after a measurement has been seen.

Harness surface (extends `bench-ideal`, follows the established rail
pattern; the IDEAL reference rows and G-repro anchor stay byte-stable):

- Mode `--orinit` (M-A): pass 1 computes per-class16 frequency optima over
  the whole dumped stream (zero-flag p, sign skew, unary quotient
  distribution, remainder biases - the same statistics the static scorer
  already accumulates); pass 2 runs the PRODUCTION adaptation loop (dual-rate
  shifts 6/9, equal mix, 8/8 hierarchy) initialized at those optima and
  accumulates cost on the fixed bin sequence. New CSV row family
  `ORINIT,...` written to its own dated results file so the D0 reference CSV
  stays untouched (the D2 separation pattern).
- Mode `--props LIST` (M-C): causal decoder-computable property vector
  P = (qW, qN, qNW, qNE, gb, pl) from previously-coded residual QUOTIENTS
  (magnitudes clamped to 7) plus the CALIC-style gradient-bucket pair and
  plane id. Three poolings scored: (i) class16 x qW x qN; (ii) class16 x
  (qW,qN,qNW,qNE) hashed to <= 4096 cells, min-count floor 64, cells under
  the floor fall back to their class16 marginal; (iii) full-P hash capped at
  16384 cells, same floor. Row family `PROP,image,pooling,L_bits,L_bytes,
  pct_of_v0,cells,fallback_share`.
- M-B needs no new mode: B = derived from ORINIT minus static class16 rows,
  reported per image and pooled with the TOTAL-row joint-estimation caveat
  restated in the CSV header.

Gates (pre-registered here, evaluated by probe_ideal.sh; a rejection is a
legitimate measured outcome and never flips the exit code):

- **OA-order:** for each image and each granularity,
  L_stat(class16) <= L_or(class16) <= L_ad, tolerance 0.05 points (the same
  single tolerance constant G-repro uses; one number governs all rails).
  Gross violations mean a broken harness or fabricated data - hard failure.
- **OA-corrupt (self-check):** a deliberately inverted sign prior at init
  must violate the middle inequality and FAIL the rail; the harness proves
  it can fail or it is not evidence.
- **PC-mono:** poolings (ii)/(iii) code length <= the class16 static row BY
  CONSTRUCTION (count-floor fallback guarantees it); any violation is a
  harness bug, hard failure.
- **MC-viability (MANIAC viability bar, binding):** pooled-TOTAL L_prop(ii)
  must beat L_stat(ctx343, bin-fine) by >= 1.5 points of v0, AND the margin
  must be >= 1.0 points of v0 individually on BOTH anchor images kodim01 and
  kodim13. Resolution of the research text's "both probe images": the two
  anchors every prior rail gates on; kodim05/kodim20 are confirmation images
  whose margins are REPORTED and become binding later through E3's
  strict-win-only per-plane adoption. Interpretation guard stands: the
  class16-to-ctx343 precedent is 1.13 points, so the bar sits deliberately
  ABOVE the known static-refinement ceiling. PASS opens E3 development and
  nothing else; FAIL declares MANIAC dead ON THIS BINARIZATION with the
  committed CSV as evidence.

E0 exit condition: the measured A, B, C shares (points of v0) are written
into the progress tracker with CSV paths, and the section 7 decision tree
row is NAMED in the tracker before any intervention work starts. Zero format
bytes may be spent before this readout exists (I7/I8).

### E1: CALIC-class bias cancellation (source-side; attacks nothing measured - it moves every bracket)

> **STATUS (2026-08-25, Builder): OFFLINE VALIDATION ONLY, REJECTED.**
> Spec addendum 16 pinned mechanism-(b) constants + the gate's single
> reading BEFORE any measurement. Measured on the pinned quad: med@bias
> ctx343-fine bracket WORSE by 19.85 points of v0 aggregate (payload
> +70.2 pct), med@biasgain worse by 16.33 (+21.7 pct), 4/4 images regressed;
> BIAS-anchor held byte-for-byte. Zero format bytes spent. Mechanism: the
> zero-flag-first binarization prices MED's exact-zero peak below its
> conditional-entropy worth, so mean-seeking corrections spread mass off the
> mode. With E2 DOA-by-arithmetic, E3 gate-dead, and E4 checkpointed
> (byte-identical outputs; M2/M3 honestly FAIL both units), the named tree
> row executed its final clause: #130 closes honestly at the achieved level
> (e1 = 10.1210 summed / 3.3737 per-sample; -8.21 pct bytes total). Decision
> record 2026-08-25T12-30-00.

Module: `BiasModel` in predict.h/cpp. State: `b[64]` over gradient-pair
cells (bucket(g_N), bucket(g_W)); prediction `pred' = med + round(b[ctx])`;
residual E' = actual - pred' enters the v2 coder unchanged; post-decode
update `b[ctx] <- clamp(b[ctx] + sgn-adjusted exponential mean of err,
-Bmax, +Bmax)` with shift and Bmax = 2^(BD-3) exactly as pinned in addendum
14. Every input is a decoded sample: mirror-exact by construction (I2).

Why it is allowed a trial despite D1: per-context aggregation from n(ctx)
samples carries sigma^2/n(ctx) variance against the per-sample EMA's
lambda*sigma^2/2 excess - a different estimator class, and D1's own CSV
shows signal where texture suits (kodim20 -1.11 pct). Honest counter-
hypothesis stays on record: MED on rotation-decorrelated planes may already
sit near the conditional center, making (a) small. The harness arbitrates.

Offline gate **BIAS-fmt** (before any format work): harness mode `--bias`
scores med@bias residual streams against the OLD-stream rows (the --color
rail pattern; BIAS-anchor: bias-off rows equal shipped baseline rows
byte-for-byte). Aggregate bracket drop >= 1.5 points of v0 on the probe
quad AND no image above its baseline bracket (mixed sign never adopts, per
C2b). Secondary mechanism (b) gradient-adjusted multiplicative correction
rides the same trial and the same gate; if (a) alone misses but (a)+(b)
clears, adopt both; neither may wire without the gate.

Format wiring IF the gate passes: per-plane never-expand trial in analyze()
using the trial_flat_bits engine - full production-flat encode with and
without BiasModel, strict win only, identity byte-exact when rejected.
Wall-clock guard 1.5x against the pre-E1 state (inside the standing 5x
phase guard, peak RSS logged per I6).

### E2: forward-adaptive frozen tables (attacks A, partly B; legitimate future information)

Precondition arithmetic (hard, checked before ANY container work): the M-A
readout's A-share must exceed 1.5 points of v0, else step 1 is DOA by
arithmetic and the fact is recorded with the number attached - no blob
format gets designed for a gate that cannot open.

Container mechanics - the FEATURE_EXT byte gets wired HERE, once, by
whichever phase adopts first (E1 needs none; if E1 somehow reaches format
work before E2, it wires the ext byte instead and this section's registry
applies unchanged):

- flags bit7 = FEATURE_EXT: when set, exactly one extension byte follows the
  flags byte. Old decoders already hard-reject unknown bit7; the new decoder
  requires the ext byte iff bit7 is set and hard-rejects unknown ext bits.
- Ext-bit registry (binding, never reassigned): ext0 PRED_BLEND and ext1
  MIXER_SSE are RESERVED-DEAD (D1 and D2/D4b rejected them; the bits stay
  unassigned forever so old experiments can never be half-resurrected);
  ext2 = FROZEN_TABLES (step 1); ext3 = REGION_TABLES (step 2).
- Blob layout (step 1): per class16 class, per bin type (zero, sign, q, rem)
  frequency counts normalized to sum 2^12, serialized as 16-bit deltas from
  a shared shape prior; blob compressed by the v2 coder itself; CRC32 over
  the uncompressed table bytes; transmitted ahead of the payload;
  model_len-style length field accounted in the header. Exact byte budget
  MEASURED at first implementation, never assumed (expected order 1-2 KB
  compressed for 16 classes).
- Decode side: pure-lookup FROZEN mode in the acoder - probability looked up
  per bin, per-sample adaptation disabled, hierarchy mixing disabled. The
  simplest possible decode mirror; bijection tests prove table round-trip
  and corrupted-CRC rejection.

Gate **FT-fmt**: simulated NET gain (payload delta MINUS blob bytes) >= 1.5
percent aggregate on the probe quad, computed at TOTAL-row level with the
non-additivity caveat, jointly reported per I9. Offline simulation comes
from the harness (frozen tables ARE the M-A statistics - the same pass-1
output, so the simulation is nearly free once E0 exists).

Step 2 REGION_TABLES (ext3), strictly conditional: only if M-B shows
B >= 2 points of v0. Per-region (192 x 128) table deltas quantized against
the image-level tables. Gate **RT-fmt**: incremental >= 1.0 point of v0 NET
on the probe quad. Diminishing returns documented in advance: drift INSIDE
a region stays unrecovered and side info grows quadratically with region
count - if the first measured region size misses its gate, shrink-once is
allowed, twice is not.

Implementation alternative noted for implementation review, not a separate
bet: an interleaved rANS backend achieves identical code lengths from the
same tables (mathematically equivalent; prism already ships rans.h).
Deferred - the acoder lookup path is the simplest correct thing first.

Wall-clock guard 2.0x against the pre-E2 state.

### E3: MANIAC tree over rich properties (attacks C; enters development ONLY on an MC-viability PASS)

Design constraints inherited from the lab's five neighboring rejections:

- The tree refines the POOLING of adaptive estimators; it never replaces the
  exact causal resdiff-343 id. Inside each leaf, the leaf id composes with
  the resdiff context (the C2b composite form leaf*343+resdiff, retained);
  the NEW information is exclusively the M-C-validated coordinates:
  previously-coded residual quotients q(.) at W/N/NW/NE and the gradient
  bucket pair. Position/activity-only splits stay dead (C2).
- Reuse matree_builder machinery wholesale: depth <= 12, leaves <= 256,
  min-samples 512, octile-quantile split candidates, strided induction
  subsample, determinism and bijection tests carried over; Feature vector
  gains the quotient/gradient fields.
- Adoption: strict-win-only per plane, never-expand identity; serialized
  tree PLUS per-leaf model deltas must stay under 50 percent of the measured
  payload gain on EVERY probe image (the C2 lesson: model bytes sink totals
  that look like payload wins - I9 applied at adoption time, not just
  evaluation time).
- Honest prior, stated so nobody rediscovers it: JXL ships exactly this
  machinery and wins with it on photo content; our binarization and class
  hierarchy differ, and the lab holds five measured rejections in adjacent
  territory. M-C exists precisely so attempt six is not blind. Tree build
  guard 0.5 s/image.

### E4: checkpoint

Fresh dual-unit corpus measure (corpus re-derived, all 24 sha256 pins
verified BEFORE measuring, CSV committed, bench_gate.sh in both units) after
whatever adopted. Verdicts feed the section 7 tree with measured components
attached: A/B/C shares, E1 bracket drop, E2 net, E3 net. This boundary goes
to review regardless of verdict; the Reviewer checklist gains the E0 gate
definitions, the ext-byte registry, and the I9 joint-accounting rows.

## 2. Module map additions

```text
src/cli/main.cpp                            [E0] bench-ideal --orinit/--props/--bias modes
benchmarks/probe_ideal.sh                   [E0/E1] ORINIT/PROP/BIAS row families, OA/PC/MC/
                                            BIAS gates, corrupt/corrupt self-checks, dated CSVs
include/prism/codec/predict.h
src/codec/predict.cpp                       [E1] BiasModel: b[64], mirrored update, clamps
src/codec/analyze.cpp                       [E1/E3] never-expand trials, tree feature plumbing
include/prism/codec/acoder.h
src/codec/acoder.cpp                        [E2] FROZEN lookup mode (adaptation + hierarchy off)
include/prism/codec/container.h
src/codec/container.cpp                     [E2] FEATURE_EXT byte, ext registry, blob IO + CRC32
include/prism/codec/matree_builder.h
src/codec/matree_builder.cpp                [E3] quotient-property Feature set, depth<=12 caps
src/prism.cpp                               [E1/E2/E3] plumbing, flag dispatch, budget checks
prism/docs/algorithmic-spec.md              [E0 first] addendum 14: every constant pre-registered
tests/unit/test_bias.cpp                    [E1] mirror determinism, clamp bounds BD8/BD16, identity
tests/unit/test_frozen.cpp                  [E2] table bijection, CRC rejection, lookup equivalence
tests/unit/test_matree.cpp (extend)         [E3] new-feature determinism, model-byte cap, never-expand
```

## 3. Test matrix additions

| Layer | Gate |
|---|---|
| Orinit unit | ordering property on synthetic stationary + nonstationary streams; corrupted-init case demonstrably FAILs; fixed-sequence determinism |
| Props unit | fallback monotonicity property (pooling never worse than class16 row); count floor respected; hash-cell cap respected; determinism across runs |
| Bias unit | encoder-side weights == decoder-side weights step-by-step on random planes; overflow pins at BD8/BD16 extremes; byte-exact identity when disabled |
| Frozen unit | serialize/deserialize bijection; corrupted CRC rejected loudly; frozen lookup reproduces the static probabilities it was built from; adaptation-off determinism |
| MANIAC unit (only if E3 opens) | carried-over builder determinism/bijection suite on the new Feature set; strict-win-only never-expand; model-byte cap asserted per image |
| Harness | probe_ideal --self-check covers every new gate's FAIL path (OA-corrupt, PC-mono violation injection, MC margin miss, BIAS-anchor drift) |
| Corpus | unchanged: sha-pinned Kodak-24, byte-exact round trips at every effort, durable CSV, bench_gate.sh both units |

## 4. Risk register additions

- **Oracle-init ordering violated grossly:** treat as harness bug first
  (I7); never hand-tune numbers to restore an inequality. Only a clean
  replica of ACModelsV2 justifies trusting any ORINIT row.
- **MED already centered (E1 measures ~0):** the stated counter-hypothesis;
  an honest sub-point rejection costs one offline slice and closes the
  source lever permanently - that is a deliverable, not a failure.
- **Side-info blowup (E2 step 2):** quadratic region growth documented in
  advance; the RT-fmt incremental gate kills it after at most one shrink.
- **TOTAL-row non-additivity traps:** I9 forces joint payload+side-info
  reporting; per-image rows remain the audit unit (methodology section 6
  restated in every new CSV header).
- **Marginal M-C result (between the 1.13 precedent and the 1.5 bar):** the
  gate fails as designed; MANIAC declared dead on this binarization with
  the number attached. Re-litigating the bar after seeing the measurement is
  forbidden - the bar was pre-registered above the known ceiling precisely
  to make this moment boring.
- **Flag/ext registry accidents:** unknown ext bits hard-reject; reserved-
  dead bits ext0/ext1 assert unreachable in debug builds; fuzz matrix adds
  forced-ext-bit corruption cases.

## 5. State and complexity budgets (carried from research section 8)

All mechanisms O(1) per sample. Two-pass encoding re-reads the frame, adds
no second frame buffer. Histogram state <= 16 classes x <= 33 bins x 4 B
(~2 KB) per image; per-region sets bounded by region count. Wall-clock
guards: E1 <= 1.5x, E2 <= 2.0x, E3 build <= 0.5 s/image - all inside the
standing 5x phase guard, peak RSS logged per I6.

## 6. Builder slicing (continuation granularity)

- Slice 1 (E0): spec addendum 14 FIRST; harness modes + rails + self-checks
  + reference CSVs; run M-A/M-B/M-C on the pinned quad; write measured A/B/C
  shares + named decision-tree row into the tracker; durable dated CSVs.
  Handoff decision per the tree (build continues only into gate-opened
  phases).
- Slice 2+: only gate-passing interventions, one per slice, offline gate
  before format work each time (E1 -> E2 step 1 -> E2 step 2 -> E3 in gate
  order, skipping any DOA-by-arithmetic phase with the number recorded).
- Final slice: E4 checkpoint - fresh dual-unit corpus truth, docs sweep,
  tracker closure paragraph naming the tree row reached, review handoff.

## 7. Decision tree to the owner point (binding; mirrors research section 6)

| measurement outcome | consequence |
|---|---|
| M-C fails AND A < 1.5 points | MANIAC and E2 both DOA by arithmetic; if E1's gate also fails, close #130 honestly at the achieved level with the full negative ledger; if E1 passes, E1 alone proceeds then E4 decides |
| M-C fails, A >= 1.5, E1 gate passes | E1 + E2 step 1 proceed; projected landing inside the M2 range; M3 declared unreachable within this architecture unless E1 overdelivers |
| M-C passes | E3 joins the stack; section 5 arithmetic of the research spec re-run with MEASURED C before any format work commits |
| all gates fail | close honestly; the ledger IS the deliverable |

Every row keeps the freeze intact: nothing merges without M2 AND M3 passing
in both units on a fresh reproducible measurement, and no partial result is
ever worded as parity.

## 8. Honest projections (unchanged from the research base case; restated so no continuation rediscovers optimism)

Best-case adopting stack: roughly 4 to 9 percent of real bytes, landing the
corpus near 9.3 to 9.7 summed - M2 plausible, M3 (8.655) out of reach in the
base case. The expected endgame remains honest closure at the achieved
level, upgraded ONLY if the E0 measurements return extraordinary values
(A + B near the full 5.95 points, or C above 3 points). The program is
ordered so that finding that out costs approximately one Builder slice
before any format byte is spent.

---

Merge gate unchanged (owner freeze): M2 AND M3 genuinely pass in both units
on a fresh reproducible measurement, decode byte-exact 24/24, fuzz clean,
CSV + comparison-table row updated. Partial wins are recorded, never claimed
as parity. Invariants I1-I9 apply; I8 (component-tagged go/no-go rows) and
I9 (joint payload + side-info accounting) are new and binding from E0 on.

- the Architect
