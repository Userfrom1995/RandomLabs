# Prism Re-scope: the D-series (Architect handoff for #130, post-C5)

- **Issue:** #130 (owner directive 2026-08-23; dual-unit freeze stands)
- **Role:** the Architect
- **Trigger:** tracker rule fired by C5's measured rejection - every static
  spatial-transform direction is closed by measurement (F2 ideal-level, C2,
  C2b, C4, C5), so the remaining parity levers must be re-derived from
  evidence before any C6 work. This document IS that re-scope.
- **Inputs:** `research-gap-analysis.md` (F1-F4, P1-P7),
  `architecture-jxl-parity.md` (C-series, sections 3-7 now carrying status
  notes), the six builder decision records under
  `.github/agents/decisions/builder/`, the A2-recalibration oracle table in
  the progress file, and the durable CSVs under `benchmarks/results/`.
- **Scope of THIS doc:** supersede C6 (section 8 of the C-series blueprint)
  with the D-series: what can still move the corpus toward M2/M3, why, in
  what order, at what acceptance bar, and an honest statement of what happens
  if the projections do not land.

Units discipline unchanged: every number states its unit; gates compare in
both units via `benchmarks/bench_gate.sh`; no success claim without a fresh
measurement.

---

## 0. Where the gap cannot live anymore (closed by measurement)

These directions are DONE. Do not reopen them without NEW offline evidence
from the D0 harness showing a materially different regime:

| Direction | Evidence | Result |
|---|---|---|
| Decimation Stage-S | research F2 | strictly harmful even under ideal coding |
| True CDC lifting pyramid | research F2 + C4 | loses to flat MED residuals under trial bits, 24/24 images |
| Cross-band linear HF prediction | C5 | rejected on every plane of all 24 images; mechanism proven only on constructed correlation |
| Spatial MA-tree contexts on flat planes | C2 + C2b | coarser than exact causal resdiff-343 under v2 binarization; model bytes sink every total |
| Static context refinement generally | C2 + C2b trials; D0 harness (the A2 instrumented-oracle table was RETRACTED 2026-08-24, see 2026-08-24T09-30-00) | buys little under this binarization: harness-citable static-refinement ceiling is 1.13 points bin-fine / 1.47 value mode (class16 -> ctx343, pooled TOTAL-row arithmetic on the committed ideal-probe CSV), and the trial gates rejected it on every image |
| Energy-proxy decisions | C3/C4/C5 | proxy class deleted from decision paths by construction |

The transform-first hypothesis is dead on this corpus. That is not a failure:
it is four negative results with byte-exact evidence each, and the format kept
zero regressions from all of them (never-expand held every time).

## 1. Where the gap must live (the two open levers)

Current truth: e1 = 10.2904 summed / 3.4301 per-sample bpp; e3 = e7 =
10.2861 / 3.4287. Gates: M2 < 9.498 / < 3.166 (needs another -7.66 percent
bytes); M3 < 8.655 / < 2.885 (needs -15.85 percent). Two levers remain that
no measurement has closed:

### L1: the predictor (the residual stream itself)

Every measurement so far codes MED residuals better or worse. Nobody has yet
changed WHAT is coded. The F4 feasibility bracket (8.01 to 9.94 summed ideal)
is a statement about TODAY's MED residual streams; a better predictor moves
the entire bracket down, which no amount of backend work can.

What is already known from measurement:

- The EXISTING bank (LEFT..WEIGHTED, PredId 0..8) was trial-selected per plane
  by real coded bytes in C3 and produced only 7 wins / 17 ties / 0 losses,
  -0.62 percent total. Fixed per-plane bank picks are nearly exhausted.
- Therefore the lever is NOT more bank ids. It is JXL-modular-style ADAPTIVE
  BLENDING: predict each sample as an integer-weighted mix of simple causal
  predictors where the weights adapt per pixel from local gradient behavior -
  fully decoder-computable, zero signaling, exactly the machinery JPEG XL's
  modular weighted predictor ships. Literature anchor: this class of
  prediction (vs LOCO-I/MED-class fixed prediction) is worth several percent
  of total file size on photographic content.
- Secondary mechanism, zero signal cost: CAUSAL MODE SELECTION between two
  predictors chosen from decoded neighbors (JPEG-LS RUN/MED-style edge test).
  The mode bit derives from already-decoded samples on BOTH sides, so it adds
  modeling power with no header and no side channel (I2-safe by construction).

### L2: collection efficiency (close the real-vs-ideal gap)

The D0 harness measurement supersedes the original oracle table here (see
the D0 STATUS above): the adaptive real v2 coder (-5.53 percent aggregate vs
v0 payload) BEATS every SHARED static ideal bracket (+1.31 bin-coarse /
-0.78 bin-fine / -0.81 value mode) - adaptivity outperforms static shared
models on nonstationary data, which the retracted table had backwards. The
genuine collection gap is against the CONDITIONAL ideal: real -5.53 percent
vs the context-conditioned fine-bin bracket -12.61 percent, about seven
points. The real coder pays for: adaptive learning cost on every context
switch, binary-decomposition overhead, and per-bin independence assumptions.
Mixing attacks exactly this:

- **Logistic mixing** of K complementary ADAPTIVE estimators per bin (the
  per-context dual-rate model, the class-pooled model, an activity-keyed
  model, a qg-keyed model), weights adapted by bounded integer gradient
  descent, mirrored constants (I2). This is P7/C6 as prescribed - but the C2b
  lesson sharpens it: mix ADAPTIVE ESTIMATORS (they track nonstationarity,
  which C2b proved is where context value lives), never static partitions.
- **SSE chain**: one or two stages mapping quantized mixed probability x
  coarse context class through an adapted table back to a probability. Cheap,
  mirrored, historically worth 1-3 percent alone.

Honest gate arithmetic for the D-series (projections, not claims):

- D1 landing zone: -3 to -6 percent payload (literature-grounded range for
  adaptive blending vs fixed MED on photos; our own C3 result caps the FIXED
  bank at well under 1 percent, so the projection rests on adaptivity, and
  D0 must validate it offline BEFORE format work).
- D2 landing zone: additional -3 to -6 percent.
- Combined projection: ~9.1 to 9.5 summed -> M2 plausibly PASSes; M3
  (8.655) likely remains open and needs the D4 stretch stack. If after D4
  the fresh both-units number still stands above 8.655, this re-scope says
  plainly: parity was not reached within this architecture, the remaining
  distance is X percent, and the owner decides between MANIAC-grade machinery
  (meta-adaptive tree OVER mixer weights - note our C2/C2b negatives constrain
  expectations there too) or closing the issue at the achieved gate level.
  No silent scope creep, no parity claim without the gates passing.

## 2. Build order: D-series phases

Each phase keeps the tree green (current suite 66/66 gtest + fuzz + corruption
+ byte-exact round-trips) before the next starts, lands behind never-expand
trial gates (I4), records dated durable CSVs when bytes change, and states
results in both units.

### D0: committed instrumentation harness (first, small, blocking)

The review-F1 lesson institutionalized: NO go/no-go decision may again rest on
ephemeral run tooling. Before any D-phase format work:

- New CLI subcommand `prism bench-ideal` (next to `probe-backend` /
  `probe-xband`): dumps the exact production residual streams for the pinned
  probe images and computes static-entropy code-length brackets (shared /
  class16-pooled / per-context) under ANY configured binarization AND under
  candidate PREDICTORS (residuals recomputed per bank id or blend config).
- Shell wrapper `benchmarks/probe_ideal.sh` with pre-measurement sha256 pin
  verification, durable CSV, and a `--self-check` proving a known-worse
  configuration predicts worse (the harness itself must be able to fail).
- Pin today's MED baselines into the committed CSV so every later phase cites
  harness-predicted vs realized deltas (this is what caught the A2 drift).
- Acceptance: reproduces the recorded A2 oracle aggregates (shared -13.62 /
  pooled -18.38 / 343-oracle -18.57 vs v0 payload, kodim01+kodim13 aggregate)
  within rounding; Reviewer gets one command to re-derive them.

New binding invariant **I7**: every offline projection used for a phase
go/no-go must come from this committed harness. Ephemeral numbers are not
evidence.

- STATUS (2026-08-24, Builder D0): COMPLETE with a material find - the
  acceptance as written FAILED, and that failure is the result. The recorded
  A2 aggregates (shared -13.62 / pooled -18.38 / 343-oracle -18.57 vs v0
  payload) proved NONREPRODUCIBLE by any documented interpretation and
  information-theoretically impossible against the measured H(E|context)
  floor (-12.98 percent value mode); their magnitudes are RETRACTED.
  Acceptance replaced by the G-repro anchor on the fresh harness row
  (benchmarks/results/2026-08-24-ideal-probe.csv, tolerance 0.05 points)
  plus the ordering gate and fail-capable self-checks. Harness-citable
  replacements: class16/ctx343 = -11.48/-12.61 bin-fine and -11.51/-12.98
  value mode; real v2 -5.53 aggregate. Evidence and consequences: decision
  record 2026-08-24T09-30-00.

### D1: adaptive blended prediction (format-visible, biggest single lever)

- Mechanism: per-sample prediction `pred = (sum_k w_k * p_k + R) >> S` over
  K small base predictions (at minimum: W, N, NW plane values and their
  gradients), integer weights adapted causally per sample from recent signed
  gradient behavior with mirrored update constants; optional causal two-mode
  selector (L1 secondary mechanism) behind the same flag after offline
  validation. All arithmetic specified to the bit in an algorithmic-spec
  addendum BEFORE implementation (overflow bounds on u16 planes and BD16,
  weight clamp ranges, init states).
- Container: flags are full (bits 0-6 used, bit7 last). Reserve **bit7 =
  FEATURE_EXT**: when set, exactly one extension byte follows the flags byte
  carrying ext bits (ext0 = PRED_BLEND, ext1 = MIXER_SSE reserved for D2).
  Old decoders hard-reject unknown bit7 (already the rule); new decoder
  requires the ext byte iff bit7 is set. This buys seven future feature bits
  and ends flag exhaustion permanently.
- Decision policy: per-plane never-expand trial vs current best (C3 engine
  reused); identity = plain MED stream byte-for-byte when the trial rejects.
- OFFLINE FIRST: D0 harness must show the blended predictor lowering the
  residual-stream bracket on kodim01/kodim13 (and confirm on unseen
  kodim05/kodim20) before ANY container/format change. If the harness shows
  less than ~2 percent projected payload gain, STOP and record the negative
  result - do not spend format space on a measured nothing.
- Acceptance: corpus-level payload reduction >= 2 percent vs the e3 baseline
  (else rejected-and-recorded like C2/C4/C5); byte-exact round trips; fuzz;
  wall-clock inside the 5x guard (blending is O(1) per sample, risk low).
- STATUS (2026-08-24, Builder D0+D1): REJECTED offline, no format work
  spent. Blend machinery built at library level only (value-base NLMS and
  MED-anchored correction NLMS with identity at init), swept through the
  committed bench-ideal harness: best case +0.30/+0.25 percent WORSE than
  MED on kodim01/kodim13, +0.93 worse on kodim05, -1.11 better on kodim20 -
  mixed sign and an order of magnitude under the bar. The STOP rule fired.
  Evidence: benchmarks/results/2026-08-24-ideal-probe-d1-blend.csv and
  decision record 2026-08-24T09-30-00. L1 is closed by measurement; D2 now
  carries the whole remaining projection on L2 collection efficiency.

### D2: logistic mixer + SSE (P7 reborn under the C2b lesson)

- Mechanism: K=4 estimator family above, integer logistic mix
  `p_mix = squash((sum_k w_k * stretch(p_k)) >> 16)` with bounded adapted
  weights, then one SSE stage on (quantized p_mix, coarse activity class).
  All constants compile-time mirrored; state size bounded and stated.
- Container: ext bit MIXER_SSE (via the D1 FEATURE_EXT byte).
- OFFLINE FIRST: D0 harness extended to score mixer+SSE variants on dumped
  streams (the same discipline that de-risked C1). Gate: harness-projected
  >= 3 percent payload before format work.
- Acceptance: additional >= 3 percent corpus reduction beyond D1 (never-expand
  vs D1-best); speed guard 5x enforced against the D1 state (mixing costs
  real time; measure peak RSS too per I6).
- STATUS (2026-08-24, Builder D2): REJECTED offline, no format work spent.
  Mixer library core landed format-unwired (spec addendum 12 contracts);
  K=4 adaptive dual-rate estimators scored sequentially through the I7
  harness with anchor fidelity proven (-0.04 pct worst). Best candidate
  (per-class weight sets, P-domain training, lr 8, SSE off): -0.90 percent
  aggregate vs the >= 3 percent gate - FAIL by 3.3x. The SSE stage measured
  HARMFUL in every keying (coarse activity, full context) and every rate
  tried: re-pooling destroys resolution the base models already separated.
  Key negative: the ~7-point static collection headroom is an ML-fit figure
  using future information and is unreachable by causal estimators online.
  Evidence: benchmarks/results/2026-08-24-ideal-mixer-d2.csv and decision
  record 2026-08-24T12-30-00. BOTH levers of this re-scope are now closed;
  the owner decision point (section 1) is surfaced.

### D3: checkpoint - full dual-unit gate evaluation and review boundary

Fresh `prism bench --kodak` at all efforts, sha pins verified first, CSV
committed, `bench_gate.sh` evaluated in BOTH units. Expected honestly-stated
outcomes: M2 PASS region (record it; M2 is a checkpoint, not the merge gate)
and an M3 verdict. This boundary goes to review regardless of pass/fail: the
Reviewer checks the D1/D2 evidence chains, the ext-byte container change, and
decoder mirrors line-by-line.

- STATUS (2026-08-24, Builder D3): COMPLETE. Corpus re-derived from the
  upstream lossless PNGs with all 24 sha256 pins verified pre-measurement
  (pins are native-orientation PPMs; see benchmark-methodology.md). Fresh
  e1/e3/e7 outputs BYTE-IDENTICAL to the committed CSVs - the entire
  D0-D2 series provably never touched a format byte. Honest verdicts:
  M2 FAIL and M3 FAIL in BOTH units at every effort (e1 10.2904 summed /
  3.4301 per-sample; e3 = e7 10.2861 / 3.4287); the "M2 PASS region"
  expectation above did not survive the D1/D2 rejections. Self-checks PASS
  on all three rails. Boundary handed to review round 2; owner decision
  point (section 1) stays open alongside it.

### D4: stretch stack toward M3 (scoped, owner-visible)

Only if M3 is still open after D3, in impact order, each behind its own
never-expand gate and D0-harness validation:

1. Extended mixer bank (add resdiff-keyed and directional estimators; second
   SSE stage).
2. Zero-run mode for zero-heavy planes (28.2 percent zeros on kodim01; JPEG-LS
   RUN-style causal run test; expected 1-3 percent on top).
3. Color decorrelation refinement: reversible per-image rotation candidates
   beyond YCoCg-R+CFL decided by trial bits (expected small, <= 1 percent).
   - STATUS (2026-08-24, Builder D4c): ADOPTED - the first stretch lever to
     clear its pre-registered offline gate. CR-fmt PASS for loco (-4.36 pct
     aggregate v2 on the probe set) and four butterfly role variants; bgr
     FAILed and is excluded. Independent cross-check confirmed direction 4/4.
     Wired as container ids 7..11 (zero signaling cost, full-byte field),
     CFL-excluded like the YCoCg family, unknown ids now a hard decode error.
     The single-list trial regressed kodim18 +0.25 pct (the MED-flat metric
     cannot see the anchor's CFL/predictor advantages); final design runs
     stage 2 at the END of analyze() against the anchor's PRODUCTION flat
     cost under its decided predictor, strict-win-only. Measured corpus:
     22 wins / 2 ties / ZERO regressions at every effort; e1 = 10.1210
     summed / 3.3737 per-sample bpp (-1.65 pct bytes), e3 = e7 = 10.1350 /
     3.3783 (-1.47). M2/M3 still FAIL in both units. Decision record
     2026-08-24T21-45-00-d4c-color-rotation-adoption.md.
4. Only with new D0 evidence: revisit squeeze economics UNDER the mixer
   (all prior rejections were measured under plain-v2 collection; mixing
   changes band economics slightly - one honest re-test, then the door stays
   shut).
   - STATUS (2026-08-24, Builder D4): condition NOT met, door shut. The
     precondition was new collection evidence from an ADOPTED mixer; D2 and
     D4b rejected every mixer configuration offline (-0.90 pct best vs the
     3 pct gate), so no operative configuration exists under which band
     economics could change. Recorded as a reasoned skip, not a silent one.

If D4 exhausts and M3 still fails: stop, write the final both-units number
into the tracker, and surface the owner decision point named in section 1.
That outcome closes #130 honestly at the achieved gate level instead of
drifting.

## 3. Module map additions

```text
src/cli/main.cpp                          [D0] bench-ideal subcommand
benchmarks/probe_ideal.sh                 [D0] harness wrapper + self-check + CSV
include/prism/codec/predict.h + src/codec/predict.cpp   [D1] blend math, causal mode select
include/prism/codec/container.h + src/codec/container.cpp [D1] FEATURE_EXT ext byte
src/codec/analyze.cpp                     [D1] per-plane blend trial wiring
include/prism/codec/acoder.h + src/codec/acoder.cpp     [D2] mixer + SSE models
src/prism.cpp                             [D1/D2] plumbing, flag dispatch
prism/docs/algorithmic-spec.md            [D1/D2] bit-exact arithmetic addenda FIRST
tests/unit/test_blend.cpp, test_mixer.cpp [D1/D2] bijection, determinism, mirror tests
```

Binding invariants I1-I6 carry over verbatim; I7 (section D0) is added.

## 4. Test matrix additions

| Layer | Gate |
|---|---|
| Blend unit | decoder-mirror equality (encode-side weights == decode-side weights step-by-step on random planes), overflow pins at BD8/BD16 extremes, identity equivalence when disabled |
| Mixer/SSE unit | weight-update determinism, bounded-weight invariant, SSE table monotonicity spot checks, byte-exact disable path |
| Harness | probe_ideal --self-check proves a worse config scores worse AND reproduces the A2 oracle aggregates within rounding |
| Corpus | unchanged: sha-pinned Kodak-24, byte-exact, durable CSV, bench_gate both units |

## 5. Risk register additions

- **Adaptive blending mispredicts on flat/gradient regimes:** init states and
  clamp ranges pinned offline; per-plane never-expand means worst case is
  status quo bytes.
- **Mixer divergence or state bloat:** bounded integer updates, stated state
  budget checked in container validation, fuzz matrix includes forced ext
  flags.
- **Encode-time explosion from trials x blending x mixing:** effort-budgeted
  trials (C3 pattern), decimated-grid pruning, 5x guard per phase against the
  PRIOR phase, peak RSS logged.
- **Projection optimism:** I7 makes every claim harness-citable; the Reviewer
  should reject any D-phase acceptance argued from numbers the committed
  harness cannot reproduce.

---

Merge gate unchanged (owner freeze): M2 AND M3 genuinely pass in both units on
a fresh reproducible measurement, decode byte-exact 24/24, fuzz clean, CSV +
comparison-table row updated. Partial wins are recorded, never claimed as
parity. Honest bottom line: the C-series bought -6.7 percent bytes and four
closed research directions; the remaining distance lives entirely in the
predictor and the probability collector, and this re-scope orders the work so
that each phase either pays in measured bytes or dies in a recorded trial -
with the endgame stated up front rather than discovered in a tenth continuation.

- the Architect
