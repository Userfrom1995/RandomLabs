# Prism T-series blueprint: the joint locality-context program (Architect handoff for #130)

- **Issue:** #130 (fresh research dispatch 2026-08-26T06:59Z after the V+S
  programs closed stop-and-report; owner standing order 2026-08-25T21:53Z
  reaffirmed 2026-08-26T07:12Z: autonomous pivots, M2/M3 dual-unit gates
  the ONLY invariant)
- **Role:** the Architect
- **Trigger:** `/oc architect` on PR #146 after Dr. Mob delivered
  `research-v3-content-clustering.md` (T-buckets C1-C4, pre-registered
  T-series gates, decision tree) and handed off `{"action":"architect"}`.
- **Inputs:** `research-v3-content-clustering.md` (primary), the V+S
  evidence chain now carried on this branch (bench-sandbox instrument,
  addenda 18/19, four dated sandbox CSVs, builder decision records,
  tracker V/S ledger), corpus truth e1 = 10.1210 summed / 3.3737
  per-sample bpp, and the composed S4 projection 9.5638 / 3.1879.
- **Scope of THIS doc:** turn the v3 research into a buildable, ordered,
  gated program whose FIRST deliverables are spec addendum 20 (every
  constant that can be pinned before measurement) and the T0 instrument
  extension. NO T-phase measurement may precede addendum 20.

Units discipline unchanged: every number states its unit; RELPCT =
per-image-median relative NET percent per I10 with NET = payload + tables
+ maps + trees + codebooks per I12; final judgment stays bench_gate.sh in
both units against real cjxl output on a fresh corpus measure; no success
claim without a fresh measurement.

---

## 0. Program state and the stacking resolution

The V+S programs ended exactly as pre-registered: S4 FAIL stop-and-report
(projected 9.5638 summed / 3.1879 per-sample vs < 9.35 / < 3.117), buckets
B1/B2/B3 closed-with-numbers, B4 measured inside composition (~+1.5 pct to
both sides), B5 demoted, zero container bytes spent anywhere. The v3
research located what nobody measured: the JOINT structure - spatially
local, forward-adapted, content-defined distributions layered ON TOP OF
class16 conditioning. Every failed experiment replaced or refined ONE axis;
the oracle rows say the conditional structure behind both is enormous
(56.4-73.9 pct below realistic bytes on kodim01).

**Stacking (binding build fact):** the T-instrument extends the sandbox
code that lives on PR #145 (`opencode/issue130-20260825153143`, head
7600377). That branch is orphan-rooted, so an unrelated-histories merge
would leave two roots GitHub cannot merge later. Resolution executed by
this Architect phase: a labeled snapshot import commit brought #145's full
tree state onto THIS branch as an ordinary commit (provenance in its
message), keeping one linear history rooted at main. Consequences:

- All T-work happens HERE, on PR #146. Nothing pushes to #145 anymore.
- PR #145 stays OPEN untouched as the standalone evidence chain; once this
  content ships through #146, #145's diff vs main becomes empty and it
  closes cleanly with credit intact.
- Every V+S artifact referenced below (addenda 18/19, CSVs, rails,
  decision records) is present in THIS branch's working tree from slice
  Q0 onward.

## 1. Build spine: addendum 20 first, then T0 blocking, everything else strictly conditional

### Spec addendum 20 lands FIRST (algorithmic-spec.md section 20)

All constants pinned before any measurement: the T-BASE control
definition and fresh-in-run baseline rule, group partition geometry, the
Lloyd clustering metric/init/caps, 'SBC1' codebook serialization shape,
assignment-word coding, CEILING mode definition with mandatory
decomposition columns, shrinkage schedules and 'SBD1' recursive delta
tables, ZZ-HU tokenization identity, all T-gates VERBATIM from the
research, CSV naming, and reserved slots. No constant may be tuned after
a measurement has been seen; deviations are numbered amendments BEFORE
the affected measurement or they never happen.

### T0: instrument extension (offline-only, BLOCKING, first slice)

Everything already built and validated is REUSED, not rebuilt: tokenize /
staticmodel / predict modules, ClusterMap resolution, backends, the six
VB rails with fail-capable self-checks, pins-before-measurement order,
dated one-file-per-phase CSVs, zero-container-bytes-until-T4-PASS.

New machinery, all FORMAT-UNWIRED:

- **GroupPartition** - per-plane raster tiling at the pinned sizes
  GS64/GS128; partial edge groups counted fully; group id = plane-major
  raster order. Per-group pass-1 counting produces each group's
  conditional stack X_j over (class16 class, bin kind, key).
- **Integer Lloyd clustering** - deterministic farthest-point seeding (no
  RNG), symmetric chi-square metric on alpha=1 smoothed counts in 16.16
  fixed point, iteration cap 16, empty-prototype drop with ascending
  renumbering. Prototype estimation smooths each cluster's pooled counts
  through the EXISTING 18.2 pipeline (pseudo-count 32, r = 15/16,
  normalize to 4096) toward the image-global pooled prior.
- **'SBC1' codebook serializer + decoder mirror** - global prior tables,
  then per-prototype s16 deltas, delta stream compressed once by the
  plane-rANS engine, CRC32 over uncompressed bytes, expect-match tamper
  surface; assignment-word table appended (single context, 4096-normalized),
  words coded by B-RANS in raster group order and NETTED always.
- **CEILING mode** - per-group EXACT static stacks under the same
  machinery, tables realistically serialized hierarchically and NETTED,
  no assignment bits BY CONSTRUCTION; mandatory decomposition columns
  (payload gain / tables bytes / assign bytes) so the T1a fail clause is
  mechanically readable.
- **Shrinkage estimator + 'SBD1'** - class343 child tables shrunk toward
  their shipped class16 parent pool, quantized s16 recursive deltas,
  decoder mirror exact.
- **ZZ-HU** - identity alias: TokProfile::HYB_C reused VERBATIM (addendum
  18.3 ladder ESC-C); zero new tokenization code; renamed in row schemas
  only so T3 verdicts read cleanly.

Rails extension: every new row family passes all six VB rails PLUS the
new T-rails before any verdict line prints:

- VB-proto-roundtrip: 'SBC1'/'SBD1' blobs decode mirror-exact;
  truncation/CRC/tamper hard-detect.
- VB-assign-mirror: decoder-side assignment reconstruction equals encoder
  words on random AND skewed fixtures.
- VB-net-audit-t: serializer audit == blob length on codebook rows; NET
  identity holds including decomposition columns.
- Failable `--self-check-t0`: corrupt injections bite; ranking fixtures
  reachable in BOTH directions (a skewed group must beat random
  assignment; a constant image must collapse to K=1 at near-zero
  assignment cost); every T-verdict line proven flippable via mutated
  fixtures.

No T-phase verdict is valid without a green T0. The T0 dated CSV carries
rails + anchor reproductions + DIAGNOSTIC smoke rows on kodim01 ONLY,
explicitly marked non-gating; quad verdict numbers start at T1a.

## 2. The phases as buildable units

### T1a ceiling kill test (runs FIRST, cheap)

Per-GROUP EXACT stacks, tables paid at realistic serialization, gate >=
+2.00 pct median NET beyond T-BASE measured fresh in-run. FAIL closes C1
unless the recorded decomposition shows payload gain >= +4.00 pct median
with table bytes as the SOLE losing term - then and only then T1b opens.

### T1b content-defined codebook (conditional)

K in {4, 8, 16, 24}, all four measured (the set IS the trial matrix; the
best-by-median-NET is reported as the winner and never re-selected).
Gates: retain >= half of the best measured T1a PAYLOAD gain NET, floor >=
+1.00 pct median NET beyond the same T-BASE; both on the quad median.
Assignment words and prototype deltas fully NETTED per I12.

### T2a shrunk fine contexting

Class16 -> class343 refinement under shrinkage with the pinned a_c arms;
gate >= +0.50 pct median NET vs the same-stack class16 baseline fresh
in-run. FAIL => flat-16 ships unchanged.

### T2b extended-property static reopening (conditional on T2a)

The E0 M-C property vector (addendum 14.2 poolings ii and iii) under
STATIC two-pass scoring with T2a table economics, per-image primary.
Gate: >= +1.50 pct median NET. Second failure closes B2's static branch
with numbers, permanently.

### T3 joint predictor-tokenization factorial (+ T3b canary)

{MED control, GAP, W ensemble} x {ZFFCTRL control, ZZ-HU} scored NET on
the quad. Bars verbatim: (i) best non-MED family >= +1.50 pct median NET
over MED under ITS winning tokenization, else GAP and W take their THIRD
AND FINAL strike; (ii) tokenization main effect recorded in both
directions as the F3 cross-check. T3b bias-feedback canary rides exactly
once on the winner under the 14.3 constants (>= +0.50 pct median, no
image worse than -0.25 pct; second strike permanent).

### T4 composition + projection

Compose the spine baseline with every winner decided PER IMAGE by REAL
NET bytes (L-C1, ties conservative); candidates include the adaptive
control so composed NET is non-regressing vs e1 BY CONSTRUCTION on the
quad. Projection formula 18.5 VERBATIM against the committed e1 CSV;
threshold UNCHANGED: projected < 9.35 summed AND < 3.117 per-sample =>
proceed-to-format handoff (a NEW Architect session blueprints the format
program behind a version bump). Portrait-class handling inherits P-S4
behind the explicit INHERITED marker. M2/M3 reported beside, never
altered.

### T5 reserve

Identical trigger to S5 (projected summed < 8.8316 AND per-sample <
2.9438 while failing the format bar): one-shot squeeze-with-parent-
properties, >= +2.00 pct median NET or third-strike death (L-C7).

Carried verbatim from the ledger: L-C1..L-C9 bind every phase; I10/I11/
I12 apply throughout; C1..C4 reopenings keep their written confound
arguments; nothing reopens causal mixers/SSE, run modes and symbol-space
reparametrizations of peaked-zero streams, energy proxies, or parent-blind
transforms. The V+S verdicts are permanent history under I10's
no-post-hoc-bar rule; this program builds around their numbers, never
re-grades them.

## 3. Module map additions

```text
src/codec/staticmodel.cpp            [T0] GroupPartition (GS64/GS128 tiles),
                                     per-group counting stacks, integer Lloyd
                                     clustering, prototype estimation,
                                     'SBC1' codebook serializer/mirror,
                                     CEILING mode serialization,
                                     shrinkage estimator + 'SBD1',
                                     assignment-word coder hook
include/prism/codec/staticmodel.h    [T0] interfaces above
src/cli/main.cpp                     [T0..T4] bench-sandbox --t0/--t1a/--t1b/
                                     --t2a/--t2b/--t3/--t4 modes
src/codec/predict.cpp                [reuse] GAP/W families per 18.4 + A4/A4b
                                     verbatim; NO new predictor math
src/codec/tokenize.cpp               [reuse] HYB_C doubles as ZZ-HU; NO changes
benchmarks/probe_sandbox.sh          [T0..] T-rails + verdict readouts (never
                                     flip exit codes except VB-*) +
                                     failable --self-check-t0
tests/unit/test_staticmodel.cpp      [T0] Lloyd determinism/tie-break/drop,
                                     'SBC1'/'SBD1' round-trip + tamper,
                                     assignment mirror, shrinkage identities,
                                     ceiling decomposition NET identity
docs/algorithmic-spec.md             [FIRST] section 20 = addendum 20 (this run)
```

No container/container-header/acoder-production changes exist anywhere in
this program until a T4 threshold PASS; that boundary IS the design. The
frozen bench-ideal instrument and its committed CSVs remain anchor-only.

## 4. Test matrix additions

| Layer | Gate |
|---|---|
| Lloyd unit (T1) | byte-identical outputs across runs; farthest-point init tie-breaks = lowest index; drop+renumber legal; K > G clamps to G |
| Codebook round-trip (T1) | 'SBC1' decode == encode incl. assignment table; truncation/CRC hard-detect; expect-match fires on tamper |
| Assignment mirror (T1) | decoder reconstruction equals encoder words on random + skewed fixtures; wrong word flips decode detectably (corrupt rail) |
| Shrinkage unit (T2) | a_c -> 0 limit reproduces parent entry; child ML reproduces unshrunk counts; normalization sum exactly 4096; decoder mirror step-equal |
| Ceiling unit (T1a) | payload + tables == NET exactly; no assignment term exists |
| Sandbox harness | rails green on EVERY new row family before any verdict line; --self-check-t0 proves FAIL paths both directions; determinism byte-exact re-run |
| Corpus | sha-pinned quad verified BEFORE any measurement; fuzz + byte-exact round-trip on the shipped codec untouched; bench_gate.sh remains the only final judge |

## 5. Risk register additions

- **Double-count recurrence:** assignment words are side info that also
  reshape payload; net-audit extends to every codebook row (serializer
  audit == blob length) so I12 cannot silently leak.
- **Oracle-envy:** the joint oracle upper bound stays diagnostic-only;
  T1a pays REAL serialized tables and is the only admissible C1 bar.
- **Post-hoc K selection:** forbidden; the K set is measured whole and
  reported whole. Per-image selection happens only inside T4 composition
  by real bytes.
- **Cross-run baselines:** forbidden; T-BASE is re-measured fresh in-run
  for every phase and every comparison cites same-run rows.
- **Portrait extrapolation:** inherited INHERITED marker handling from
  P-S4; landscape-only projection reported beside.
- **Scope creep toward format work:** module map contains no container
  edits by construction; a PR touching container files before a T4 PASS
  is rejectable on sight by the Reviewer.
- **Re-litigating V/S verdicts:** forbidden; the ledgers stay visible
  forever and no bar fired in V+S may be re-graded here (I10).

## 6. State and complexity budgets

Encoder: pass-1 counting O(N) per trial; Lloyd O(G x K x bins x iters)
with G <= N/4096, K <= 24, iters <= 16 - negligible next to counting;
shrinkage O(bins x contexts). Decoder: O(N) lookups plus mirror-exact
table reconstruction; decode stays mirror-by-construction (transmitted
prototypes and assignment words only). Memory: prototype tables bounded
by 24 x 16 x stride u16 (~120 KB worst case), streamed otherwise; peak
RSS logged per I6; wall-clock logged per the A3 precedent (no verdict
depends on it).

## 7. Builder slicing (continuation granularity)

- Slice Q0 (blocking): T0 instrument extension + rails + self-checks +
  DIAGNOSTIC smoke CSV (kodim01 only, non-gating) + tracker/log updates.
  Handoff continue.
- Slice Q1: T1a quad kill test + mandatory decomposition readout;
  conditional T1b in the same slice iff the decomposition clause opens
  it. Dated CSVs + verdicts the same day.
- Slice Q2: T2a (+ T2b iff machinery green and T2a passed). Dated CSVs +
  verdicts.
- Slice Q3: T3 factorial + T3b canary-on-winner. Dated CSVs + verdicts.
- Slice Q4: T4 composition + projection vs the committed e1 CSV; T5
  reserve only per its trigger clause; stop-or-proceed recorded.
- Every slice: pins BEFORE measurement, dated CSV, tracker checklist +
  agent log, honest verdict wording, all rails green first, zero
  container bytes until T4 passes.

## 8. Decision tree (binding, verbatim from the research)

| outcome | consequence |
|---|---|
| T1a fails without a payable decomposition | C1 closed-with-numbers; program continues at T2/T3 |
| T1b fails its retention or floor gate | C1 closed; the +5.5 pct spine stays the harvested share |
| T2a/T2b fail | B2 closed permanently in causal AND static form |
| T3 fails both bars | B3/B5 closed permanently; MED + ZFF ship forever |
| T4 threshold met | Architect blueprints the format program behind a version bump |
| T4 projects into M3 reach | open the T5 reserve once; recompose; then format |
| everything fails | stop-and-report with the full ledger; recommend honest close or an owner-directed exotic program |

Every row keeps the owner freeze intact: nothing merges without M2 AND
M3 passing in BOTH units on a fresh reproducible dual-unit measurement
against real cjxl output; no partial result is ever worded as parity.
The gates are invariant by standing order; only the architecture serves
them.

## 9. Honest projections (restated so no continuation rediscovers optimism)

Starting point: composed projection 9.5638 summed / 3.1879 per-sample.
Planning-range midpoints (C1 +2.0, C2a +0.5, C2b +0.8, C3 +0.3) land
about 9.23 summed / 3.077 per-sample: past the proceed-to-format bar and
past M2 (< 9.498 / < 3.166) with modest room. Optimistic edges land about
8.95 / 2.983 - still short of M3 (< 8.655 / < 2.885) unless the T5
reserve ALSO pays. Stated plainly: this program makes M2 genuinely
plausible and prices every remaining legitimate bit source, but M3
remains at risk and nothing here relaxes it. The freeze stands until
both gates pass dual-unit on a fresh measurement. Failure costs one
slice per bucket and ZERO format bytes unless T4 passes - the ordering
IS the safety property.

---

Merge gate unchanged (owner freeze + standing order): M2 AND M3 genuinely
pass dual-unit on a fresh reproducible measurement, decode byte-exact
24/24, fuzz clean, CSV + comparison-table row updated. Invariants I1-I12
apply; L-C1..L-C9 bind; the V+S ledgers remain permanent history.

- the Architect
