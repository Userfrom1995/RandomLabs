# Prism v3 research program: pricing the joint locality-context prize

- **Issue:** #130 (owner directive 2026-08-23; clean-slate authorization and
  kickoff 2026-08-25; fresh `/oc research` dispatch 2026-08-26T06:59Z after
  the V+S programs closed stop-and-report)
- **Role:** Dr. Mob, the Researcher
- **Inputs:** `research-v2-clean-slate.md` (buckets B1-B5, constraints
  L-C1..L-C9, reopenings R-1..R-4), `architecture-jxl-parity-vseries.md` and
  `architecture-jxl-parity-sourcepivot.md` plus spec addenda 17 and 19, the
  four dated sandbox CSVs (`2026-08-25-sandbox-v1/s1/s3/s4.csv`), the E0
  CSVs, `progress/130-prism-true-jxl-parity.md`, and
  `prism/src/codec/staticmodel.cpp` + `include/prism/codec/staticmodel.h`
  as committed on PR #145.
- **Scope of THIS doc:** post-mortem the completed V+S measurement program
  with numbers, locate where the REMAINING gap lives after everything that
  honestly failed, and pre-register the T-series program that prices each
  surviving mechanism cheaply and in order. Handoff: `{"action": "architect"}`.

Units discipline unchanged: every number states its unit; on Kodak-24
(C=3) summed = 3 x per-sample exactly; gates compare BOTH units via
`benchmarks/bench_gate.sh`; no success claim without a fresh measurement.
No em dashes anywhere in this document or its descendants.

---

## 0. Where the lab stands after V+S (and why the halt was correct)

The owner asked "why is it halted?" (2026-08-26T06:32Z). Answer: the halt is
the pre-registered stop-and-report outcome, not a stall and not a lost run.
Every gate fired exactly as pinned BEFORE any measurement; all six VB rails
were green on every slice; zero container bytes were spent across the whole
V+S program. The ledger:

| quantity | value | unit / provenance |
|---|---|---|
| Prism v1 committed corpus truth (e1) | 10.1210 summed / 3.3737 per-sample bpp | `2026-08-25-prism-e1.csv` |
| Composed S4 projection (SPINE + color trials) | 9.5638 summed / 3.1879 per-sample bpp | projection 18.5 verbatim, quad median +5.5054 pct |
| M2 gate (WebP m6) | < 9.498 summed AND < 3.166 per-sample | issue #130, dual-unit |
| M3 gate (JXL -d0 -e9, binding) | < 8.655 summed AND < 2.885 per-sample | issue #130, dual-unit |
| further reduction needed from the S4 projection to M2 | 0.69 pct of bytes | both units agree |
| further reduction needed from the S4 projection to M3 | 9.50 pct of bytes | both units agree |

What the V+S programs established, each with committed numbers:

- **B1 (collection layer) partially harvested:** forward-adaptive STATIC
  global class16 tables beat causal adaptive coding by +5.92 / +6.08 /
  +5.69 / +3.20 pct per image (median +5.81, V1b, all side info NETTED);
  color-trial selection carries another ~1.5 pct to both frames (S4). This
  ~5.5 pct is real, measured, and currently stranded on PR #145 because the
  composed projection misses the pre-registered proceed-to-format bar
  (< 9.35 summed / < 3.117 per-sample).
- **Spatial keyings failed AS IMPLEMENTED:** position tiles (KGRID128,
  128 px tiles, kodim01 resolves to 24 raw clusters) NET +12.55 pct WORSE
  than global flat16 on kodim01; learned property trees (KTREE) gained
  -0.85 pct of payload but paid 15,117 B of tree serialization for a NET
  loss of +1.51 pct.
- **B2 (extended conditioning) closed for the CAUSAL family:** SX-G k=64
  median -8.09 pct, SX-FULL k=256 median -16.62 (every variant regresses on
  every image); mechanism recorded: transmitted side info outguns the
  conditioning gain, and causal estimation noise grows as contexts multiply.
  The E0 per-image STATIC margins (+2.67 / +1.86 / +2.87 / +2.95 points of
  v0) were never disputed - they were never re-tested under static scoring
  with payable tables.
- **B3 (predictors) closed UNDER ZFF:** GAP median -2.61, W ensemble -1.45
  in the gating static frame; GAP -1.68 / W -0.42 beside in the adaptive
  frame; nothing approaches the +1.50 bar in either framing. The closure
  wording itself scopes the verdict: no framing rescues directional
  predictors *under the zero-flag-first binarization*.
- **B5 (tokenization) demoted, not closed:** F3's 3.4 to 5.1 pct swing
  proves the entropy stage's shape matters; the proposed symmetric hybrid
  uint tokenization (v2 spec stage 3) was never built.
- **D1 (unit-consistent gate) is done and stays done:** `bench_gate.sh`
  prints and compares BOTH units with a demonstrably failable self-check;
  merged to main in PR #131. Acceptance criterion 1 of issue #130 remains
  satisfied; nothing here touches it.

## 1. The decisive instrumentation finding: the two axes were never combined

Reading the committed instrument (`staticmodel.cpp`, `ClusterMap::raw_at`)
settles what each V1/S3 keying actually tested:

- KGRID128 returns `(y / 128) * tiles_x + (x / 128)` - the cluster id
  depends ONLY on position and REPLACES the directional context entirely.
  Every sample inside a tile shares ONE distribution regardless of its
  gradient class. Its payload collapse (574,707 B vs 511,463 B flat16
  payload on kodim01, +12.4 pct) is exactly what discarding directional
  conditioning costs; the experiment measured "locality INSTEAD OF context",
  never "locality ON TOP OF context".
- KTREE refines ONLY the context axis (leaf id = f(context)), pooling
  spatially distant samples; its payload gain was real but small and its
  serialization was expensive.
- The ORACLE rows assign per-sample ids that likewise replace all
  conditioning; their size (NET 221,779 flat-keyed / 177,754 gridded /
  132,961 treed vs 508,737 realistic spine best on kodim01, i.e. the
  oracle sits 56.4 / 65.1 / 73.9 pct below realistic bytes) is an UPPER
  BOUND on replacement-style maps, not on refinement-style schemes.
- S3's property hashings are again pure context-axis refinements scored
  causally.

Consequence: **the joint structure - spatially local, forward-adapted,
content-defined distributions layered ON TOP OF the shipped class16
conditioning - has never been measured by anyone in this lab.** It is
precisely the mechanism JPEG XL's modular mode ships (per-group adapted
histograms clustered into a small codebook, assignment map transmitted,
tables delta-coded against shared priors). The oracle rows say the
conditional structure is enormous; the failed rows say the naive ways of
expressing it are unaffordable. The honest open question is the price of
the JOINT expression, and it is measurable offline for a few hundred lines
of instrument extension.

## 2. The surviving buckets (T-buckets), each with provenance and confound

### C1. Content-defined conditional clustering (attacks the joint prize)

Mechanism: keep the shipped class16 event keying; partition the image into
groups G_j (pinned sizes 64x64 and 128x128 pixels); in encoder pass 1 count
each group's conditional table stack X_j = { n_j,c(t) } over classes c and
tokens t; build a SMALL codebook of prototype stacks by deterministic
Lloyd clustering in a pinned metric (symmetric chi-square on alpha-smoothed
counts, alpha = 1, pinned seed and iteration cap); transmit K prototype
stacks as quantized deltas toward the image-global pooled tables (the
hierarchical 'SBP1'-style path already exists) plus an entropy-coded
assignment word m_j per group; code each group's events under its assigned
prototype stack. Decoder: O(N) lookups, mirrors counts-based merges exactly.

Why it can succeed where the relatives failed (I11 confound arguments):
- vs KGRID128: content-adaptive boundaries instead of arbitrary position
  cuts, and it REFINES class16 rather than replacing it;
- vs KTREE: prototypes are histograms (cheap fixed-shape payloads delta-
  coded toward priors), not serialized trees (15 KB blobs);
- vs S3 causal property hashing: two-pass FORWARD statistics have zero
  online estimation noise, and sharing via a small codebook keeps table
  bytes bounded while S3 paid full tables per raw cluster;
- vs E2 (global pools): prototypes are LOCAL (group-level) stacks, exactly
  the locality E0 proved the adaptive advantage lives in.

Planning range: +1.0 to +4.0 pct of current bytes NET beyond the composed
spine baseline; bounded above by the unmeasured joint oracle, priced FIRST
by the T1a ceiling test below before any clustering machinery is built.

### C2. Affordable fine contexting (makes B2's static margins payable)

Two committed facts make this bucket live: (a) flat343 payload BEATS
flat16 payload on kodim01 (506,399 vs 511,463 B, -0.99 pct) but its raw
58,227 B tables bury it (+9.74 pct NET) - the conditioning is real, the
table economics kill it; (b) E0's extended-property margins (+1.86 to
+2.95 points of v0 per image under static ideal scoring) are the same story
one level up. Mechanism: shrinkage estimation p_hat = (n + a_c * parent) /
(N + a_c) with pinned a_c schedules, quantized child deltas serialized
recursively toward coarse parents, decoder mirror exact. Confound vs S3
(I11): S3 scored CAUSAL adaptive keying with full-cost tables; C2 scores
STATIC forward counting with shrinkage-shared tables and per-image primacy
(I10). Planning range: +0.3 to +2.0 pct NET depending on how much of the
E0 margin survives payable tables.

### C3. Joint predictor-tokenization trial (closes B3/B5 permanently)

S1's own resolution scopes the predictor closure to the ZFF binarization,
and F3 measured tokenization swings of 3.4 to 5.1 pct: predictor worth and
token shape are coupled, and every prior test held one side fixed. Mechanism:
a closed factorial trial {MED control, GAP, W ensemble} x {ZFF control,
ZZ-HU symmetric zigzag hybrid-uint with a dedicated zero token} scored NET
on the quad. Bars in section 3. Third-strike accounting applies to GAP/W;
the error-feedback canary rides exactly once on the winner. Planning range:
0 to +1.5 pct; possibly zero - which is precisely why it must be priced
once and never reopened again.

### C4. Reserve: reversible squeeze with parent properties

Unchanged from V5/S5 terms (L-C7): opens only if T4 projects inside M3
reach but short of it; third strike dies forever.

Not reopened under any label: causal mixers/SSE (L-C3), run modes and
symbol-space reparametrizations of peaked-zero streams (L-C4), energy
proxies (L-C1), parent-blind transforms (L-C7).

## 3. Pre-registered T-series program (offline first, fail-fast order)

Probe quad unchanged (kodim01/kodim13/kodim05/kodim20, sha-pins verified
before any run). PRIMARY scoring per I10 (per-image medians/minima; pooled
rows diagnostic). All NET figures per I12 (payload + tables + maps + trees
jointly). Constants land in spec addendum 20 (Architect slice 1) BEFORE any
measurement; pins committed before any measurement; dated CSVs named
`2026-MM-DD-sandbox-t<phase>.csv`; zero container bytes until T4 passes.

- **T0 Instrument extension (blocking):** group partition layer; per-group
  counting; explicit group->prototype resolution; prototype estimation with
  pinned smoothing/shrinkage; hierarchical delta table serializer +
  decoder mirror; CEILING mode (per-group exact stacks, tables realistically
  serialized and NETTED, no assignment bits by construction); ZZ-HU
  tokenization profile; corrupt-injection and ranking-provable self-checks
  proving both verdict directions; determinism byte-for-byte; fidelity
  within +0.50 pct on spine reference rows; net-audit over every new row
  family. No T-phase verdict is valid without a green T0.
- **T1a Ceiling (cheap kill test, runs FIRST):** per-GROUP EXACT static
  stacks under the C1 machinery with tables paid at realistic serialization.
  Gate: >= +2.00 pct median NET beyond the composed SPINE baseline measured
  fresh in-run. Fail => bucket C1 closed-with-numbers (its own ceiling is
  unpayable); T1b opens ONLY if the recorded decomposition shows payload
  gain >= +4.00 pct median with table bytes as the sole losing term (then a
  small codebook that slashes table bytes is exactly the remaining chance).
- **T1b Content-defined codebook (conditional on T1a):** K in {4, 8, 16, 24}
  prototypes; assignment words coded by the same backend; tables as
  quantized deltas toward global pools. Gates: retain >= half of the best
  measured T1a payload gain NET, floor >= +1.00 pct median NET beyond the
  same baseline; both must hold on the quad median.
- **T2a Shrunk fine contexting:** class16 -> class343 refinement under
  shrinkage + recursive delta tables. Gate: >= +0.50 pct median NET vs the
  same-stack class16 baseline fresh in-run.
- **T2b Extended-property static reopening (conditional on T2a machinery):**
  the E0 M-C property vector under static two-pass scoring with T2a table
  economics, per-image primary. Gate: >= +1.50 pct median NET. Second
  failure closes B2's static branch with numbers, permanently.
- **T3 Joint predictor-tokenization factorial:** bars: (i) best non-MED
  family >= +1.50 pct median NET over MED under ITS winning tokenization,
  else GAP and W take their THIRD AND FINAL strike; (ii) tokenization main
  effect recorded in both directions as the F3 cross-check. T3b bias-
  feedback canary rides once on the winner (>= +0.50 pct median, no image
  worse than -0.25 pct; second strike permanent).
- **T4 Composition + projection:** compose the spine baseline with every
  winner decided per image by REAL NET bytes (L-C1, ties conservative);
  project the corpus via formula 18.5 VERBATIM against the committed e1
  CSV. Proceed-to-format threshold UNCHANGED: projected < 9.35 summed AND
  < 3.117 per-sample. M2/M3 reported beside, never altered (owner standing
  order). Portrait-class handling inherited from P-S4 behind an explicit
  INHERITED marker.
- **T5 Reserve:** identical trigger to S5 (projected summed < 8.8316 AND
  per-sample < 2.9438 while failing the format bar); one-shot
  squeeze-with-parent-properties, >= +2.00 pct median NET or third-strike
  death (L-C7).

STOP-rule discipline verbatim: any gate failure records the negative in the
tracker the same day and moves budget; discarded bring-up runs are discarded
wholesale with no surviving numbers; wall-clock logged per the A3 precedent
(no verdict depends on it); fuzz + byte-exact round-trip always; final PR
judged ONLY by `bench_gate.sh` in both units on a fresh corpus measurement
against REAL cjxl and WebP references (M2 AND M3), exactly as the freeze
demands.

## 4. Decision tree

| outcome | consequence |
|---|---|
| T1a fails without a payable decomposition | C1 closed-with-numbers; program continues at T2/T3 |
| T1b fails its retention or floor gate | C1 closed; the +5.5 pct spine stays the harvested share |
| T2a/T2b fail | B2 closed permanently in causal AND static form |
| T3 fails both bars | B3/B5 closed permanently; MED + ZFF ship forever |
| T4 threshold met | Architect blueprints the format program behind a version bump |
| T4 projects into M3 reach | open the T5 reserve once; recompose; then format |
| everything fails | stop-and-report with the full ledger; recommend honest close or an owner-directed exotic program |

## 5. Honest arithmetic in both units

Starting point: composed projection 9.5638 summed / 3.1879 per-sample.
Planning ranges (midpoints): C1 +1.0..4.0 (+2.0), C2a +0.3..1.0 (+0.5),
C2b 0..2.0 (+0.8), C3 0..1.5 (+0.3). Midpoint landing: about 9.23 summed /
3.077 per-sample - past the proceed-to-format bar (< 9.35 / < 3.117) and
past M2 (< 9.498 / < 3.166) with modest room. Optimistic edges land about
8.95 summed / 2.983 per-sample - still short of M3 (< 8.655 / < 2.885)
unless the T5 reserve ALSO pays. Stated plainly: **this program makes M2
genuinely plausible and prices every remaining legitimate bit source, but
M3 remains at risk and nothing here relaxes it.** The freeze stands until
both gates pass dual-unit on a fresh measurement.

## 6. Complexity

Encoder: pass 1 counting is O(N) per trial; trials are bounded by the
effort ladder; Lloyd iterations O(G x K x alphabet) with G <= N/4096,
K <= 24 - negligible next to counting. Decoder: O(N) with table lookups;
memory O(K x classes x alphabet + window). All mechanisms O(1) amortized
per sample; decode stays mirror-exact by construction (transmitted
prototypes and assignment words only).

## 7. Handoff

Next pipeline step: **Architect** (`{"action": "architect"}`). Blueprint
inputs: this document; the V+S ledgers and CSVs listed in the header;
addenda 17/19 as formatting precedent. First deliverables: spec addendum 20
skeleton with every pinned constant slot (group sizes, K set, metric,
alpha, a_c schedules, delta bit schedule, ZZ-HU parameters, all T-gates
verbatim) and the T0 harness blueprint with its failable self-check list.
NO measurement slice may precede addendum 20. The binding end gates remain
M2 AND M3 in both units on a fresh corpus measurement against real codec
output; nothing in this document relaxes the freeze or the standing rule
that no success claim leaves the lab without a reproducible measurement
stated in both units.

- Dr. Mob, the Researcher
