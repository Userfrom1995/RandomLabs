# Prism endgame research: gap decomposition and the E-series specification

- **Issue:** #130 (owner directive 2026-08-23; dual-unit freeze stands)
- **Role:** the Researcher (Dr. Mob)
- **Trigger:** owner `/oc research` dispatches of 2026-08-25 on the PR #131
  thread, resolving the re-scope's owner decision point INTO the MANIAC-grade
  research program instead of honest closure
- **Inputs:** `architecture-jxl-parity-rescope.md` (D-series, all phases
  closed by measurement), `research-gap-analysis.md` (F1-F4, P1-P7), the seven
  builder decision records under `.github/agents/decisions/builder/`, the
  committed harness reference `benchmarks/results/2026-08-24-ideal-probe.csv`,
  and the tracker corpus truth (e1 = 10.1210 summed / 3.3737 per-sample bpp).
- **Scope of THIS doc:** decompose the remaining gap into harness-measurable
  components, pre-register go/no-go gates for every surviving candidate
  mechanism, and specify the mathematics of each survivor precisely enough
  that the Architect can blueprint without re-deriving anything. This document
  extends the re-scope; it supersedes nothing. Handoff: `{"action":
  "architect"}`.

Units discipline unchanged: every number states its unit; gates compare in
both units via `benchmarks/bench_gate.sh`; no success claim without a fresh
measurement; every go/no-go cites committed-harness rows (I7), now tagged by
gap component (new I8, section 7).

---

## 0. Corpus truth and the arithmetic of the remaining distance

Verified current truth (tracker, dual-unit CSVs, sha pins verified at last
measure):

| quantity | value |
|---|---|
| e1 (current) | 10.1210 summed / 3.3737 per-sample bpp |
| e3 = e7 (current) | 10.1350 / 3.3783 |
| M2 gate | < 9.498 summed AND < 3.166 per-sample |
| M3 gate | < 8.655 summed AND < 2.885 per-sample |
| pre-C1 baseline | 11.026 summed / 3.675 per-sample |

Arithmetic, stated once and used consistently below:

- Progress so far: 1 - 10.1210/11.026 = **8.21 percent bytes** at matched
  comparison of current e1 against the archived e7-era baseline. (The
  tracker's D4 bullet previously printed "-9.1"; corrected there 2026-08-25
  with this derivation stamped.)
- Remaining to M2: 1 - 9.498/10.1210 = **6.15 percent bytes**.
- Remaining to M3: 1 - 8.655/10.1210 = **14.48 percent bytes**.

Anything that cannot credibly sum to -14 percent does not close M3. Section 5
applies exactly this test to every candidate stack.

Harness reference rows (kodim01+kodim13 pooled TOTAL, from the committed
2026-08-24-ideal-probe.csv; all "percent of v0" figures divide by the v0
payload N0 = 1269358 B):

| scoring | bits | bytes | pct of v0 |
|---|---|---|---|
| real adaptive v2 payload | (byte count) | 1199168 | **-5.53** |
| static ideal, shared | 10075266 | 1259408 | -0.78 |
| static ideal, class16-pooled, bin-fine | 8989134 | 1123642 | **-11.48** |
| static ideal, ctx343, bin-fine | 8874291 | 1109286 | -12.61 |
| static ideal, ctx343, value mode | 8836513 | 1104564 | -12.99 |

Two structural facts fall out immediately and drive everything below.

**Fact 1 (binarization is not the bottleneck).** Value-mode vs bin-fine
static ideals differ by only 0.38 points of v0 (-12.99 vs -12.61). The
flag/sign/unary/remainder decomposition costs little statically. Changing the
binarization is therefore not where the missing bytes live, and no E-phase
proposes it.

**Fact 2 (the collection gap is a collector phenomenon on a fixed source).**
D0's methodology scores static entropy on the EXACT bin sequence the
production coder emits, changing nothing but the probabilities (frequency-
counted, pooled). Consequently the spread between real adaptive cost
(-5.53) and the class16 static optimum (-11.48), i.e. **5.95 points of v0**
(= 6.30 percent of current real bytes), is attributable ONLY to how the
collector behaves on a FIXED event stream: transient learning cost,
nonstationarity tracking loss, and per-sample adaptation noise. D2 proved
causal online mixers cannot harvest it; nothing yet has measured HOW the 5.95
splits, and the split determines which legitimate mechanism can attack what.

## 1. What the D-series proved, restated as constraints

Each closed direction becomes a hard constraint on E-series designs:

- C1 (retune) is the ONLY adopted collector-side change in lab history
  (-6.09 pct bytes). It won by better ADAPTATION GEOMETRY (rates, class key),
  not by new information. Consistent with Fact 2.
- D1 rejected per-SAMPLE adaptive blending (two NLMS families x five rates,
  mixed sign, order of magnitude under bar). Constraint: predictor proposals
  whose adaptation operates per-sample at fast rates start with a measured
  presumption against them.
- D2/D4b rejected causal mixer/SSE stacks (best -0.90 pct vs >= 3 pct gate;
  SSE harmful in every keying and rate). Constraint: no new proposal may rely
  on mixing MORE causal estimators of the same information.
- D4a rejected zero-run coding (residual zeros are already cheap under
  zero-flag-first). Constraint: symbol-space reparametrizations of the SAME
  residual stream are dead.
- C2/C2b/C4/C5 rejected every static spatial-transform and spatial-context
  direction. Constraint: no transform work, and any context-tree work must
  condition on dimensions NOT spanned by (position, activity, leaf-id) -
  see section 4.3.
- D4c (color rotations) adopted: source-side modeling CAN clear gates when it
  changes the actual symbol statistics (-1.65 pct bytes). This is the
  template: interventions that change WHAT the stream contains have positive
  lab history; interventions that re-code the same stream causally have a
  perfect negative record.

The strategic conclusion: the remaining program lives in exactly two places -
**(i) shrink the source entropy itself** (better prediction/centering, which
moves every bracket down), and **(ii) acquire distributional knowledge
legitimately** (forward adaptation: information the encoder computes from the
future of the stream and transmits, which no causal collector can match).
Everything else is measured dead.

## 2. Four-component decomposition of the gap (formal definitions)

Fix the production bin-event stream S (after rotations, CFL, MED, v2
binarization) with context ids c in C, |C| = 343, pooled to 16 prior classes.
Define code-length functionals on S:

- `L_ad` : realized adaptive cost (the -5.53 row, byte level).
- `L_stat(K)` : static optimum under pooling K in {shared, class16, ctx343}
  (measured rows above).
- `L_or(K)` : hypothetical adaptive cost with ORACLE INITIALIZATION: each
  adaptive model starts from its stream-frequency optimum instead of generic
  priors, then adapts exactly as production does. Not yet measured; mode M-A
  below.
- `L_prop(P)` : static conditional ideal under an ENRICHED property set P
  (dimensions beyond the resdiff-343 id; mode M-C below).

Gap decomposition, all in points of v0 (divide by N0, multiply by 100):

```
A  learning/transient   := 100 * (L_ad      - L_or(class16)) / N0
B  tracking/locality    := 100 * (L_or(c16) - L_stat(c16))  / N0
C  conditioning-deficit := 100 * (L_stat(c16) - L_prop(P))  / N0     [if positive]
D  binarization         := 100 * (L_stat(c343,fine) - L_stat(c343,value)) / N0
```

Properties of the decomposition:

- A + B = the full 5.95-point real-vs-class16 gap; A + B + C = the
  real-vs-enriched-ideal gap. The split is exhaustive and non-overlapping by
  construction.
- A concentrates in early samples per context (convergence transients) and
  scales with context-switch count times per-switch settling length. It is
  recoverable by ANY scheme that knows good starting statistics: transmitted
  warm-start profiles or frozen tables.
- B measures how much the adaptive tracker (even perfectly initialized) beats
  globally pooled static tables - i.e. genuine temporal drift. Global frozen
  tables CANNOT recover B by definition (they are the static optimum);
  only FINER LOCALITY (per-region tables) buys part of it back, with
  side-info cost growing as regions shrink.
- C measures whether dimensions outside the resdiff-343 id carry conditional
  information about the bins. This is precisely the MANIAC question, and it
  is genuinely OPEN: C2 conditioned on position/activity (coarser than 343),
  and C2b replaced the class pool with leaf ids (still within the same
  information). Neither ever conditioned on PREVIOUS RESIDUAL MAGNITUDES,
  which is what JXL's meta-adaptive tree actually uses. Note the resdiff
  context is built from quantized neighbor PIXEL differences; previous
  residual quotients are new coordinates.
- D is already bounded at 0.38 points (Fact 1); recorded, then ignored.

Conversion for planning: 1.00 point of v0 = 1.06 percent of current real
bytes (factor 1/0.9447). Hard ceilings: E2-family total gain cannot exceed
A + B minus side info; E3 gain cannot exceed C minus model bytes; E1 gain is
NOT bounded by this decomposition at all (it changes S itself) and must be
measured as new-stream brackets versus old-stream brackets.

## 3. Pre-registered measurements M-A, M-B, M-C (blocking, offline-only)

All three extend `prism bench-ideal` / `benchmarks/probe_ideal.sh` following
the established rail pattern: sha-pin verification, durable dated CSV,
self-check that can demonstrably fail, STOP-rule discipline identical to
D1/D2/D4a (zero format bytes until a gate passes). Probe set: the standard
quad kodim01/kodim13/kodim05/kodim20; corpus-wide runs happen only at E4.

### M-A oracle-initialization rows (mode `--orinit`)

Contract: pass 1 computes per-model frequency optima over the whole stream
(per class16 class: zero-flag p, sign skew, unary quotient distribution,
remainder-bit biases - the same statistics the static scorer already
computes); pass 2 runs the PRODUCTION adaptation loop initialized to those
optima and accumulates cost. Offline scorer only; decode-mirroring does not
apply. Output rows `IDEALORINIT` beside the existing rows.

Ordering invariant (extension): for each image and each granularity,
`L_stat(class16) <= L_or(class16) <= L_ad`. Self-check demonstrates a
deliberately corrupted init (inverted sign prior) violates the middle
inequality and FAILS the rail.

### M-B tracking share (derived, no new mode)

Pure arithmetic on M-A rows: `B = (L_or - L_stat)/N0`. Reported per image and
pooled, with the TOTAL-row joint-estimation caveat (methodology section 6)
restated in the CSV header.

### M-C property-conditioned ceilings (mode `--props LIST`)

Property vector, all decoder-computable at each sample (uses only
already-coded neighbors):

```
qW = min(q_East, 7)   qN = min(q_North, 7)        # signed residual quotients
qNW = min(q_NWest, 7) qNE = min(q_NEast, 7)       # of already-coded residuals
gb = 8*bucket(g_N) + bucket(g_W)                   # CALIC-style gradient pair
pl = plane id (0..2)
P  = (qW, qN, qNW, qNE, gb, pl)
```

Poolings to score: (i) class16 x qW x qN (cheap first cut); (ii) class16 x
(qW,qN,qNW,qNE) hashed to <= 4096 cells with min-count 64, cells under the
count floor falling back to their class16 marginal (guarantees monotone
non-increasing code length versus the class16 row, keeping the ordering
gate meaningful); (iii) full-P hash capped at 16384 cells, same floor.
Output rows `IDEALPROP`.

**MANIAC viability gate (binding):** pooled-TOTAL `L_prop(ii)` must beat
`L_stat(ctx343)` by at least **1.5 points of v0**, AND the per-image margin
must be at least **1.0 points on BOTH probe images individually** (no
single-image dependence). Pass => E3 enters development. Fail => MANIAC is
declared DEAD ON THIS BINARIZATION with the committed CSV as evidence, and
the closure recommendation in section 6 fires with the number attached.

Interpretation guard: the class16 -> ctx343 precedent is 1.13 points. If
rich properties cannot at least clearly exceed THAT, a tree cannot pay for
its own serialization - hence the bar sits ABOVE the known static-refinement
ceiling, not at it.

## 4. Intervention specifications

### 4.1 E1: CALIC-class predictor refinement (attacks the source)

Mechanism, deliberately distinct from the rejected D1 families: per-CONTEXT
slow aggregation instead of per-SAMPLE fast tracking.

- (a) Bias cancellation. Maintain `b[ctx]` over 64 gradient-pair cells
  (`bucket(g_N), bucket(g_W)`, thresholds pinned in the spec addendum,
  scaled by bit depth). Predict `pred' = med + round(b[ctx])`; residual
  `E' = actual - pred'` enters v2 unchanged. Update after decoding:
  `b[ctx] <- clamp(b[ctx] + sgn-adjusted exponential mean of err, -Bmax,
  +Bmax)` with the shift constant and `Bmax = 2^(BD-3)` pinned pre-registered
  (D4c discipline: constants in the algorithmic-spec addendum BEFORE any
  measurement). Every input is a decoded sample: mirror-exact by
  construction.
- (b) Gradient-adjusted scaling (secondary, behind the same never-expand
  trial): per-cell multiplicative correction on the prediction magnitude
  from a small rational grid, same slow per-context update law.

Why D1's rejection does not transfer: an EMA tracked per sample carries
steady-state excess variance on the order of `lambda * sigma^2 / 2`, while a
per-context mean estimated from `n(ctx)` samples carries `sigma^2 / n(ctx)`;
with cell populations in the thousands the context statistic is
orders-of-magnitude steadier, and it estimates exactly the quantity bias
cancellation needs (the conditional center). Additionally, D1's own CSV
shows kodim20 at -1.11 pct: signal exists where texture suits; the family's
failure mode was estimator noise, not proven absence of signal. Honest
counter-hypothesis, stated up front: MED on rotation-decorrelated planes may
already sit near the conditional center, making (a) small. The harness
arbitrates: E1's gate is a bracket DROP of at least **1.5 points of v0
aggregate on the probe quad**, measured by re-scoring NEW streams (E1
residuals) against OLD-stream rows; else STOP and record the negative.

### 4.2 E2: forward-adaptive collection (attacks A, partly B)

Legitimate future-information use, in ascending complexity. Both steps ride
the existing FEATURE_EXT byte (ext2 = FROZEN_TABLES; ext3 reserved for
step 2).

- **Step 1, per-image frozen tables (primary).** Encoder pass 1 computes
  class16-pooled per-bin frequency tables over the whole image (counts
  normalized to sum 2^12; serialization: per class, per bin, 16-bit delta
  from a shared shape prior). Blob compressed by the v2 coder itself and
  transmitted ahead of the payload. Payload coded by the SAME binary acoder
  in a new FROZEN mode: probability looked up per bin, adaptation updates
  disabled, hierarchy mixing disabled (pure lookup; simplest possible
  decode mirror). Side-info budget formula pinned in the addendum; expected
  order 1-2 KB compressed for 16 classes (exact figure measured, never
  assumed).
  Attack surface: recovers A only (section 2). Gate: simulated NET gain
  (payload delta PLUS blob bytes) >= **1.5 percent aggregate on the probe
  quad**, computed at the TOTAL-row level with the non-additivity caveat;
  else STOP. M-A's A-share must exceed the gate before any container work
  starts - if A < 1.5 points, step 1 is DOA by arithmetic and skips straight
  to recording that fact.
- **Step 2, region-frozen refinement (conditional).** Only if M-B shows
  B >= 2 points: per-region (192 x 128) table deltas quantized against the
  image-level tables. Incremental gate >= **1.0 point of v0 net** on the
  probe quad. Diminishing returns documented in advance: temporal drift
  INSIDE a region stays unrecovered, and shrinking regions raises side-info
  quadratically in count.
- Implementation alternative noted for the Architect (not a separate bet):
  an interleaved rANS backend achieves identical code lengths from the same
  tables with better throughput. Mathematically equivalent; deferred to
  implementation review.

### 4.3 E3: MANIAC tree over rich properties (attacks C; strictly conditional)

Enters development ONLY on an M-C gate pass. Design constraints inherited
from the lab's negatives:

- The tree refines the POOLING of adaptive estimators; it never replaces the
  exact causal resdiff-343 id (C2b's leaf*343 composite is retained inside
  each leaf). New information comes exclusively from previously-coded
  residual quotients q(.) at W/N/NW/NE and the gradient bucket pair - the
  dimensions M-C validated.
- Reuse `matree_builder` machinery: depth <= 12, leaves <= 256,
  min-samples 512, octile-quantile split candidates, strided induction
  subsample; determinism and bijection tests carried over.
- Adoption: strict-win-only per plane, never-expand identity; serialized
  tree + per-leaf model deltas must stay under 50 percent of the measured
  payload gain on EVERY probe image (the C2 lesson: model bytes sink totals
  that look like payload wins).
- Honest prior: JXL ships exactly this machinery and wins with it on photo
  content; our binarization and class hierarchy differ, and the lab has five
  measured rejections in neighboring territory. M-C exists precisely so the
  sixth attempt is not blind.

### 4.4 E4: checkpoint

Fresh dual-unit corpus measure (sha pins verified, CSV committed,
bench_gate.sh in both units) after whatever adopts. Verdicts feed the
decision tree in section 6 with measured components attached: A/B/C shares,
E1 bracket drop, E2 net, E3 net.

## 5. Gate arithmetic and honest projections (before any measurement)

Needed from current truth: M2 -6.15 percent bytes; M3 -14.48 percent.

Component ceilings (points of v0; multiply by 1.06 for percent-of-real):

- E2 family hard cap: A + B <= 5.95 points (= 6.30 percent of real bytes),
  realistically 30-60 percent capture net of side info => **1.9 to 3.8
  percent of real bytes**. Even perfection here cannot approach M3 alone.
- E3 hard cap: C (unmeasured; precedent 1.13 points for a WEAKER dimension
  set; gate demands > 1.5) => **0 to 1.6 percent of real bytes** realistic.
- E1: unbounded by this decomposition (changes the source); literature
  anchor CALIC-vs-JPEG-LS class deltas 3-8 percent on continuous tone,
  discounted for our existing trial-selected predictors and D4c rotations =>
  **1.5 to 3.5 percent of real bytes** if its gate passes at all.

Best-case adopting stack: roughly **4 to 9 percent of real bytes**, landing
the corpus near **9.3 to 9.7 summed**: M2 plausible, M3 (8.655) out of reach
in the base case. Stated plainly per the no-silent-scope-creep contract: the
expected endgame remains honest closure at the achieved level, upgraded ONLY
if M-A/M-B/M-C return extraordinary values (A + B near the full 5.95, or C
above 3 points). The measurements in section 3 exist to find that out for
approximately the cost of one Builder slice, before any format byte is spent.

## 6. Decision tree to the owner point

| measurement outcome | consequence |
|---|---|
| M-C fails its gate AND A < 1.5 points | MANIAC and E2 both DOA by arithmetic; recommend closing #130 at the achieved level with the full negative ledger |
| M-C fails, A >= 1.5, E1 gate passes | E1 + E2-step1 proceed; projected landing inside M2 range; M3 declared unreachable within the architecture unless E1 overdelivers |
| M-C passes | E3 joins the stack; re-run section 5 arithmetic with measured C before committing format work |
| all gates fail | close honestly; the ledger is the deliverable |

Every row keeps the freeze intact: nothing merges without M2 AND M3 passing
both units, and no partial result is ever worded as parity.

## 7. Invariants

I1-I7 carry over verbatim from the blueprint and re-scope. Added:

- **I8 (component tagging):** every E-phase go/no-go row names the gap
  component (A/B/C/source) it measures; a gate argued from untagged or
  ephemeral numbers is void (extends I7).
- **I9 (side-info accounting):** every E2/E3 evaluation reports payload and
  transmitted/model bytes JOINTLY at the TOTAL-row level; payload-only wins
  are not wins (C2/C2b institutionalized).

## 8. Complexity and state budgets

All mechanisms O(1) per sample. Two-pass encoding re-reads the frame but adds
no second frame buffer; histogram state <= 16 classes x <= 33 bins x 4 B
(~2 KB) per image, per-region sets bounded by region count. Wall-clock
guards: E1 <= 1.5x, E2 <= 2.0x, E3 tree build <= 0.5 s/image, all inside the
standing 5x phase guard with peak RSS logged per I6.

- Dr. Mob, the Researcher
