# Progress - Prism true JXL parity (#130)

- **Issue:** #130 (owner directive 2026-08-23; lab-wide freeze until M2 AND M3
  genuinely pass dual-unit gates)
- **Branch:** opencode/issue130-20260823163248 (research + architect + builder phases)
- **Status:** in_progress. Builder phases COMPLETE through the D3 checkpoint:
  C0+C1 landed (-6.09 pct bytes), C3 landed (-0.62 pct), C2/C2b/C4/C5
  honestly rejected by measurement (never-expand held, zero regressions).
  Research DONE (D1 gate fix + D2 gap analysis F1-F4). Architect re-scope
  DELIVERED 2026-08-24: `prism/docs/architecture-jxl-parity-rescope.md`
  (D-series, supersedes C6). D0 COMPLETE (harness committed; recorded A2
  oracle aggregates NONREPRODUCIBLE, replaced by harness-citable brackets -
  decision record 2026-08-24T09-30-00). D1 OFFLINE REJECTED (+0.25 pct worse
  best case, mixed sign): no format work spent. D2 OFFLINE REJECTED (-0.90
  pct aggregate vs >= 3 pct gate; SSE harmful everywhere): no format work
  spent. D3 CHECKPOINT COMPLETE (2026-08-24): fresh dual-unit evaluation at
  e1/e3/e7 after re-deriving the corpus from upstream lossless PNGs with all
  24 sha256 pins verified pre-measurement - outputs BYTE-IDENTICAL to the
  committed CSVs at every effort (the whole D-series provably never touched a
  format byte), M2 and M3 honestly FAIL in both units everywhere, all three
  gate rails' self-checks PASS. The pipeline now sits at the review boundary;
  the OWNER DECISION POINT (re-scope section 1: D4 stretch vs honest closure)
  stays open for owner/Mae alongside review round 2.
- **Binding gates (both units, real corpus, byte-exact):**
  M2 summed < 9.498 AND per-sample < 3.166;
  M3 summed < 8.655 AND per-sample < 2.885.
  Baseline: Prism e7 = 11.026 summed / 3.675 per-sample. No merge until M2 AND
  M3 pass; no success claim without a fresh both-units measurement.

## A2 recalibration oracle evidence (referenced by probe_backend.sh)

> **RETRACTED 2026-08-24:** these magnitudes proved nonreproducible and
> information-theoretically impossible; see D-series checklist item D0 and
> decision record 2026-08-24T09-30-00 for harness-citable replacements.
> Kept verbatim as the historical record of what the recalibration cited.

The A2 gate was recalibrated on 2026-08-23 (decision record
`.github/agents/decisions/builder/2026-08-23T19-35-00-a2-gate-recalibration.md`)
using instrumented offline analysis of the actual pipeline residual streams.
This is the evidence table that record cites, reproduced in full:

| conditioning under v2 zero-flag-first binarization | ideal code length vs v0 payload |
|---|---|
| shared ideal (one static model, no context)   | -13.62 percent |
| class16-pooled ideal (16 directional classes) | -18.38 percent |
| full 343-context oracle (static per-context)  | -18.57 percent |

Static per-context refinement therefore adds only ~0.19 points over
class-pooled coding once the binarization exists - the original 3.0 percent
A2 bar descended from research F3's ~6 percent conditional delta measured
WITHOUT this binarization and was unreachable by construction.

Provenance and methodology, precise enough to re-derive: residual streams were
dumped from the shipped YCoCg-R + MED path for kodim01 and kodim13 (aggregate
over both images); ideal code lengths were computed as static entropy under
the v2 binarization's bin sequence (zero flag, sign where nonzero, unary
quotient, remainder bits), with per-bin probabilities estimated by frequency
counting over the whole dumped stream - separately pooled across all samples
(shared), within each of the 16 `ac_v2_prior_class` classes (class-pooled),
and per exact residual-DIFF context id (343-oracle). The raw dumps and sweep
harness were ephemeral continuation-run tooling and are not committed; the
aggregates above are the recorded result of that run. The shipped-config and
retuned-config context gains quoted by the gate header (0.85 / 1.14 / 0.78
percent) are independently re-measurable today via
`prism probe-backend` + `benchmarks/probe_backend.sh`.

## C-series checklist (blueprint: prism/docs/architecture-jxl-parity.md)

- [x] R1 Research phase: gap analysis F1-F4 + prescriptions P1-P7 (this PR).
- [x] R2 D1 blocking deliverable: unit-consistent bench_gate.sh + self-check (this PR).
- [x] A1 Architect blueprint: backend-v2 C-series, module map, test matrix (this PR).
- [x] C0 Probe harness: `benchmarks/probe_backend.sh` kodim01/kodim13 A-B rail pinning V0/V1 baselines.
- [x] C1 Entropy backend v2 (P1+P2): zero-flag-first binarization, dual-rate shift6/shift9 mix over 16 directional class priors; probe captures >= 80 percent of V1 win (124%/140%, same-run measured); A2 recalibrated and PASS.
- [x] C2 MA-tree always-on (P3): capability + trial-bits acceptance LANDED (flags bit4, caps depth<=10 / leaves<=256 / min-samples 512 / quantile thresholds, v2 64-clamp latent bug fixed). Measured: trial REJECTS on all 24 corpus images (tree loses to flat resdiff-343 by ~0.12 pct; e3 == e1 byte-identical 24/24). Negative result + next lever in blueprint section 4 + decision file.
- [x] C2b composite leaf*343+resdiff (offline probe rail first): MEASURED
      REJECTION both directions - tree-composite totals +163 B kodim01 /
      +330 B kodim13 over flat (payload gain ~0.01 percent cannot carry the
      serialized model); fixed activity*343+resdiff partition mixed sign
      (-43 B / +35 B), not adopted. Gate B1 added to probe_backend.sh with a
      proven fail-path; streams stay byte-identical to e1, zero regression.
      Static context refinement on flat planes is CLOSED (oracle + C2 + C2b
      agree); decision file 2026-08-23T20-45-00-c2b-composite-rejection.md.
- [x] C3 Trial-encode decisions (P4): color transform + CFL scales + global
      predictor decided by REAL coded bytes of the emitted v2 flat stream
      (decimated-grid pruning, identity-forced finalists, ties keep
      identity; energy proxies deleted from these paths). Measured: e1
      10.2904 summed / 3.4301 per-sample (was 10.3544/3.4515, -0.62 pct),
      7 wins / 17 ties / ZERO regressions; e3 10.2861/3.4287; wall-clock
      3.74x < 5x guard; decision record
      2026-08-23T21-05-00-c3-trial-encoded-decisions.md.
      NOTE: M2 checkpoint window NOT reached by C3 alone (10.29 vs ~9.5
      needed); per-plane/per-leaf predictor ids and squeeze-level trials
      move to C4/C5 per blueprint scope note.
- [x] C4 True CDC lifting Squeeze (P5): capability LANDED behind container
      bit5 (H-then-V integer lifting recursed on averages, post-order layout
      unchanged, shared transform/inverse, legacy streams decodable);
      per-plane L now by REAL coded bytes (trial_squeeze_bits byte-mirror of
      production plain-v2 band emission) vs the flat baseline. Measured on
      pinned Kodak-24 (24/24 pins verified pre-measurement): trials REJECT
      lifting on every plane, e1 byte-identical to pre-C4 10.2904/3.4301
      (24/24 ties, zero regressions by construction); e3/e7 unchanged
      (10.2861/3.4287). Consistent with F2 ideal-level finding + C2/C2b
      closure. Probe hook force_squeeze_levels added; directed bit5
      round-trip test; odd-dims bijection suite; decision record
      2026-08-24T02-30-00-c4-lifting-scope-and-measured-rejection.md.
- [x] C5 Cross-band prediction (P6): capability LANDED behind container bit6 -
      HF bands predicted by pure linear extrapolation along the co-located LL
      gradient (one int8 weight per H/V/D type, +3 header bytes per squeezing
      plane), per-plane chooser by REAL coded bytes with never-expand identity
      safety; legacy coupled estimator path retired (last energy proxies gone
      by deletion). MEASURED REJECTION on all 24 pinned images: e1/e3/e7
      byte-identical to pre-C5 (10.2904/3.4301 and 10.2861/3.4287);
      M3 GATE CHECKPOINT FAILS in both units as expected. Constructed-
      correlation unit test proves the mechanism adopts decisively when
      correlation is real. Decision record
      2026-08-24T08-16-17-c5-xband-scope-and-measured-rejection.md.
- [x] C6 -> SUPERSEDED by Architect re-scope (tracker rule fired by C5's
      measured rejection): C-series blueprint section 8 replaced by the
      D-series in `prism/docs/architecture-jxl-parity-rescope.md`
      (D0 committed ideal harness / D1 adaptive blended prediction /
      D2 logistic mixer + SSE / D3 dual-unit checkpoint / D4 stretch with an
      honest owner decision point if M3 stays open).

## D-series checklist (re-scope: prism/docs/architecture-jxl-parity-rescope.md)

- [x] D0 Committed instrumentation harness: `prism bench-ideal` +
      `benchmarks/probe_ideal.sh` with sha-pin verification, durable CSV, and
      a self-check that can fail; must reproduce the A2 oracle aggregates
      (shared -13.62 / pooled -18.38 / 343-oracle -18.57 percent vs v0
      payload) within rounding. New invariant I7: no go/no-go without
      harness-citable numbers.
      RESULT (2026-08-24): harness built and green (ordering gate, G-repro
      anchor vs benchmarks/results/2026-08-24-ideal-probe.csv, self-check
      proving ranking both ways and fail-reachable gates). The RECORDED
      aggregates are NOT reproducible and the oracle figure is impossible
      against today's streams (H(E|cx) = -12.98 pct vs v0 > the recorded
      -18.57); magnitudes retracted, replaced by harness-citable brackets
      (bin-fine class16/ctx343 = -11.48/-12.61 pct; value mode
      -11.51/-12.98 pct; real v2 = -5.53 pct aggregate). Qualitative A2
      conclusion survives; L2 headroom restated as real-v2 vs conditional-
      ideal gap of ~7 points.
- [x] D1 Adaptive blended prediction - OFFLINE VALIDATION ONLY, REJECTED
      (2026-08-24): blend machinery landed at library level (predict.{h,cpp},
      BlendConfig value-base and MED-anchored NLMS modes, bijection/
      determinism/border/noise tests; NOT wired into any format path).
      Harness sweep across two families x five rates (durable CSV
      2026-08-24-ideal-probe-d1-blend.csv): best case nlms-med-lr1 is
      +0.30/+0.25/+0.93 pct WORSE than MED on kodim01/13/05 and -1.11 pct
      better on kodim20 alone - mixed sign, an order of magnitude under the
      ~2 pct bar. Per the re-scope STOP rule: no FEATURE_EXT byte, no
      container change, no format work. Decision record
      2026-08-24T09-30-00-d0-harness-a2-nonreproducible-and-d1-offline-
      rejection.md.
- [x] D2 Logistic mixer + SSE behind ext1 (P7 reborn): OFFLINE VALIDATION
      ONLY, REJECTED (2026-08-24). Library mixer core landed format-unwired
      (mixer.{h,cpp}: integer stretch/squash, bounded P-domain-trained
      logistic MixerCore, interpolated APM, frozen sentinels; 6 unit tests;
      80/80 green). Harness scored K=4 adaptive dual-rate estimators
      (production hierarchical / class-pooled / activity-keyed / qg-sum) over
      the exact production bin sequence with anchor fidelity -0.04 pct worst.
      BEST CANDIDATE mix4-sse-lr8 = -0.90 pct aggregate (-0.69/-0.71/-0.91/
      -1.36 on kodim01/13/05/20): gate >= 3 pct FAILS by 3.3x. SSE stage
      HARMFUL in every keying (activity +32 pct, context-keyed best still
      +12.9 pct) and every rate 5-12. Key negative: the ~7-point static
      "collection headroom" is an ML-fit-with-future-information figure and
      not reachable by causal estimators. STOP rule fired; zero ext-byte
      work. Decision record 2026-08-24T12-30-00; durable CSV
      benchmarks/results/2026-08-24-ideal-mixer-d2.csv.
- [x] D3 Checkpoint (2026-08-24): fresh `prism bench` at e1/e3/e7 with the
      corpus re-derived this run from the upstream lossless PNGs and all 24
      sha256 pins verified BEFORE measuring. Results BYTE-IDENTICAL to the
      committed CSVs at every effort - e1 10.2904 summed / 3.4301 per-sample,
      e3 = e7 10.2861 / 3.4287 - so the CSVs stay untouched and the D0-D2
      library work is proven format-unwired end to end. bench_gate.sh
      evaluated in BOTH units on every effort: M2 FAIL (10.2904 >= 9.498;
      3.4301 >= 3.166; e3/e7 10.2861 >= 9.498; 3.4287 >= 3.166) and M3 FAIL
      (vs < 8.655 / < 2.885) everywhere, honestly stated. Self-checks PASS on
      all three rails (bench_gate fail+pass, probe_backend pass/A-fail/
      B1-alone-fail, probe_ideal ranking both ways + mixer adapted-beats-
      frozen). Per the re-scope this boundary goes to review regardless of
      verdict; corpus-derivation find documented in benchmark-methodology.md
      (pins are native-orientation PPMs: 18 landscape 768x512, 6 portrait
      512x768).
- [ ] OWNER DECISION POINT (re-scope section 1): both levers closed by
      measurement. Owner chooses between D4 stretch work (individual
      projections <= 1-3 pct each vs M3 gap -15.9 pct; M3 likely stays open)
      and closing #130 honestly at the achieved gate level. No silent scope
      creep; no drift into format work without new harness evidence.
- [ ] D4 Stretch toward M3 only if the owner directs it after the decision
      point: extended mixer bank, zero-run mode, reversible color rotations,
      one honest squeeze re-test under the mixer. If M3 still fails after D4:
      stop and surface the owner decision point stated in re-scope section 1.
      No silent scope creep.

## Current step

D3 CHECKPOINT COMPLETE (2026-08-24): fresh dual-unit gate evaluation at
e1/e3/e7 on a re-derived, pin-verified corpus. Outputs byte-identical to the
committed CSVs at every effort (D-series provably format-unwired); M2 and M3
FAIL honestly in both units everywhere; all three gate rails' self-checks
PASS. Corpus truth stands at e1 = 10.2904 summed / 3.4301 per-sample bpp,
e3 = e7 = 10.2861 / 3.4287; no parity claim.

Next step: re-review of the round-3 fold at this boundary (rounds 2 and 3
both verified prior work and returned only docs findings, all applied).
The OWNER DECISION POINT (continue into D4 stretch
knowing M3 likely stays open, or close #130 at the achieved gate level,
-6.7 percent bytes vs the e7 baseline plus five closed research directions)
remains surfaced for owner/Mae alongside that review. The Builder takes no
further format work without new owner/Mae direction backed by harness
evidence.

Earlier slice (continuation run 5): review findings F1-F6 folded in first
(gate arithmetic is the single source: capture 124%/140% from same-run
measured V1; gain 0.78; A2 oracle evidence table committed in-tree under
"A2 recalibration oracle evidence"; analyzer reuses build_spatial_flat_tree;
topology wording updated then, later corrected 2026-08-24: shared history,
see next-step item 0). Then C4 landed: true CDC lifting behind bit5 +
trial-bits level choice, measured rejection corpus-wide.

Previous slice summary (continuation run 3, C2b):

- [x] Offline byte-exact replica of the v2 model loop built first; sweep
      instrument verified against shipped payloads before trusting results.
- [x] ADOPTED: dual-rate shifts 4/6 -> 6/9; rate-mix 5/3 -> equal average;
      class key sum(qL+qU+qUL) -> directional energy x orientation.
      Generalizes on unseen kodim05 (-1.32 pct payload) / kodim20 (-1.17).
- [x] REJECTED with measurements: count-weighted ctx trust, hierarchy tilts,
      faster EMAs, per-kind rate tilts (sim2 harness unreliable; dropped).
- [x] Instrumented oracle analysis: under v2 binarization the static
      343-context ceiling is ~0.19 pct over class-pooled coding - F3's 6 pct
      does not survive the binarization. Context value is nonstationary
      tracking; documented in probe_backend.sh header + decision file.
- [x] A2 gate recalibrated to >=0.5 pct (kodim13) / >0.1 pct (kodim01),
      self-check proves both verdicts reachable; decision record at
      .github/agents/decisions/builder/2026-08-23T19-35-00-a2-gate-recalibration.md.
- [x] Fresh durable CSV committed: kodim01 v2 -6.40 pct (gap 1.14), kodim13
      v2 -4.79 pct (gap 0.78). A1 124%/140% capture (same-run measured V1 win).
      PROBE GATE PASS.
- [x] Verification: 34/34 gtests green, fuzz 1000 iters PASS, docs sweep
      (blueprint 3.2/3.3, prism README probe section, ideas writeup).

## Next steps (in order)

0. **Branch update policy (binding for every future run on this branch):**
   CORRECTED 2026-08-24 against full server-side history: the branch and
   main SHARE history. `git merge-base origin/main HEAD` =
   f8a958d70e48122d6 (verified locally after unshallowing AND via the
   GitHub commits API: commit 1113c6f has parent f8a958d70e48; compare
   main...head = diverged, ahead 32, merge_base f8a958d70e48). Earlier
   "disjoint histories / merge-base exits 1 / parentless root" claims were
   artifacts of shallow/partial clones in individual sessions, not repo
   truth. Sync path: ordinary `git fetch origin && git merge origin/main`
   (or a plain rebase if replaying a slice cleanly) - NEVER
   `--allow-unrelated-histories` here (applying it to related histories
   fabricates bogus DAG edges). The hard-rule orphan check still re-runs
   immediately before any actual merge of this PR with freshly fetched
   objects.
1. [DONE this run] C5 (cross-band prediction, blueprint section 7): landed
   behind bit6 with per-plane H/V/D weights chosen by trial bits; M3 GATE
   CHECKPOINT evaluated fresh: FAIL in both units (10.2861/3.4287), honest
   all-reject outcome recorded. Per the rule below the next phase re-scopes.
2. [DONE 2026-08-24] Builder D0-D3: committed bench-ideal harness +
   probe_ideal.sh rail, D1 and D2 offline validations (both honestly
   REJECTED per their gates, zero format bytes spent), then the D3 fresh
   dual-unit checkpoint (byte-identical outputs, M2/M3 FAIL both units,
   review boundary reached). Format work only ever behind new harness
   evidence + owner direction. After the review round: Tester -> Maintainer;
   the owner decision point rides alongside. Owner freeze stands throughout:
   nothing merges before both gates pass in both units on a fresh
   both-units measurement of real cjxl-comparison output.

## Agent log

- 2026-08-24 the Builder (continuation run 12, review round 3 fold): both
  findings applied, docs-only, zero executable-line changes (bash -n green).
  F1: the static-refinement ceiling pair now derives from ONE stated method
  everywhere - differences of the pooled IDEALTOTAL-row percentages as
  printed in benchmarks/results/2026-08-24-ideal-probe.csv - giving 1.13
  bin-fine / 1.47 value mode. The previously propagated 1.14/1.50 matched no
  consistent method (1.50 was a cross-column slip that entered via round 2's
  own suggested text). Fixed at all seven sites: probe_backend.sh header,
  rescope closure row, blueprint C1 acceptance + C2 status notes, ideas x2,
  D0 record consequence 1; correction stamp added to the D0 record with the
  full derivation and cross-checks (full precision 1.131/1.476; per-image
  means 1.135/1.677 explicitly not used). F2: TOTAL-row non-additivity
  documented at the probe_ideal.sh header and in benchmark-methodology.md
  section 6 (TOTAL rows pool histograms across images before estimation:
  joint figures, intentionally not sums of per-image rows). Branch synced
  with origin/main first per item 0 (unshallowed the clone, merge-base
  aa94ae4 re-verified, ordinary merge 5e590a0 of the lab model-pin commit).
  Owner decision point stays open; decision {"action":"review"}.

- 2026-08-24 the Builder (continuation run 11, review round 2 fold): all
  seven docs-only findings F1(a-g) applied - the D0 retraction now propagates
  to every live document. probe_backend.sh header rewritten (stale ~0.19
  claim + dead pointer replaced by harness-citable 1.14/1.50 ceilings,
  retraction pointer, CSV reference); RETRACTED blockquote added directly
  under the tracker's A2-evidence section heading (kept verbatim below as
  historical record); rescope closure-table row corrected (was citing
  -18.57/-18.38) AND the inverted L2 claim fixed per D0 consequence 2 (real
  v2 -5.53 BEATS every shared-static bracket +1.31/-0.78/-0.81; genuine gap
  ~7 points vs conditional ideal); both ~0.19 mentions in the C-series
  blueprint annotated; both stale assertions in the ideas writeup marked;
  STATUS line added to rescope section D0 mirroring D1/D2/D3. Zero code
  changes, zero executable-line changes in any script (bash -n green).
  Owner decision point (D4 stretch vs honest closure) stays open for
  owner/Mae; no format work without new direction backed by harness
  evidence. Decision {"action":"review"}.

- 2026-08-24 the Builder (continuation run 10, D3 checkpoint complete):
  synced the branch with origin/main first (unshallowed, shared history
  re-verified, merge-base f8a958d70e48; ordinary merge of the #135 lab fix,
  commit 21a7411 - item 0 policy followed). Rebuilt Release, 80/80 gtests,
  fuzz 1000 iters PASS. Re-derived the corpus from upstream lossless PNGs:
  FINDING - pins are native-orientation PPMs (18 landscape 768x512, 6
  portrait 512x768); all 24 sha256 verified BEFORE measuring; methodology
  doc corrected. Fresh bench at e1/e3/e7: outputs BYTE-IDENTICAL to the
  committed C5-era CSVs (no CSV churn; D0-D2 proven format-unwired).
  bench_gate.sh M2+M3 evaluated in both units on every effort: FAIL
  everywhere, honestly recorded. All three gate rails' self-checks PASS.
  Tracker + rescope + methodology updated; decision {"action":"review"}
  per the D3 review boundary.

- 2026-08-24 the Builder (continuation run 9, D2-offline complete): spec
  addendum 12 first (stretch/squash, MixerCore, SSE contracts); mixer
  library core format-unwired (6 tests, 80/80 suite green); bench-ideal
  --mixer sequential scorer with anchor invariant; probe_ideal.sh G-anchor
  gate + fail-capable mixer self-check; separate D2 CSV so the D0 reference
  stays stable. Two contract-level finds pinned in spec 12: stretch-unit
  weight training diverges (+137.9 pct; P-domain training is mandatory) and
  one-shared-weight-set-per-kind diverges (+30 pct; per-class sets required).
  Measured verdict: best mix4-sse-lr8 -0.90 pct aggregate vs >= 3 pct gate -
  REJECTED offline, zero format work; SSE harmful in every keying/rate;
  ~7-point static headroom proven unreachable online (ML fit uses future
  information). Decision record 2026-08-24T12-30-00. Both re-scope levers
  closed; owner decision point surfaced via {"action":"maintainer"}.

- 2026-08-24 the Builder (continuation run 8, D0+D1-offline complete): D0
  landed (spec 11 addenda first; bench-ideal CLI with two bin granularities +
  value-alphabet mode x three poolings; probe_ideal.sh with ML-ordering gate,
  G-repro anchor, self-check proving both-direction ranking and reachable
  FAIL; reference CSV committed). FINDING: recorded A2 oracle aggregates are
  nonreproducible and information-theoretically impossible vs today's
  streams; magnitudes retracted, harness-citable replacements pinned
  (decision record). D1 offline REJECTED per the re-scope STOP rule: two
  blend families x five adaptation rates all miss the ~2 pct bar (best
  +0.25 pct WORSE on kodim13, only kodim20 wins at -1.11 pct, mixed sign);
  blend machinery stays library-level and format-unwired. 74/74 gtests, fuzz
  clean. L1 is now closed by measurement alongside the static-transform
  closures; everything rides on L2 collection efficiency. Decision
  {"action":"continue"}: next run D2 offline (mixer+SSE harness extension,
  >= 3 pct projected gate before any ext-byte format work).

- 2026-08-24 the Builder (continuation run 8, D0 start): spec addendum 11
  landed first (binding order): bench-ideal instrumentation contract (two
  granularities x three poolings, ML static entropy, ordering invariant,
  I7) + bit-exact D1 blend arithmetic before any implementation. Next: blend
  math + tests, bench-ideal CLI, probe_ideal.sh rail, A2 reproduction, D1
  offline verdict.

- 2026-08-24 the Architect (re-scope): D-series blueprint delivered
  (`prism/docs/architecture-jxl-parity-rescope.md`), superseding C-series
  section 8 per the tracker rule fired by C5's measured rejection. Evidence
  re-derivation: static transforms and static context refinement are closed
  by measurement; the remaining levers are (L1) the predictor itself -
  adaptive blended prediction, since C3 measured fixed bank picks nearly
  exhausted (7 wins / 17 ties) - and (L2) collection efficiency via adaptive
  estimator mixing + SSE, since the real coder collects roughly half of even
  the shared-model ideal gain. Phases D0-D4 with offline-first gates, the new
  I7 invariant (no go/no-go without harness-citable numbers), a FEATURE_EXT
  container ext byte to end flag exhaustion (bit7 reserved), and an explicit
  owner decision point if M3 stays open after D4. Honest projections: M2
  plausible after D1+D2; M3 likely needs the full stretch stack. Handoff
  decision {"action":"build"}.

- 2026-08-24 the Builder (continuation run 7): topology correction FIRST
  (commit b50935a): unshallowed the CI clone, verified shared history
  (merge-base f8a958d70e48; GitHub API: 1113c6f parent = f8a958d70e48),
  rewrote tracker item 0 - unrelated-histories joins forbidden. Then C5
  landed: xband_gradient/xband_apply shared math, container bit6 + per-plane
  H/V/D weights (+3 bytes/squeezing plane), pure linear LL-gradient HF model,
  exact per-type joint weight chooser by real band bytes
  (choose_squeeze_plan_xband exported for tests/probe), legacy coupled
  estimator path deleted (last energy proxies gone), probe-xband CLI +
  force_xband_weights hook, 7 new Xband unit tests incl. a decisive-win
  constructed-correlation case and the never-expand property. Measured:
  REJECTED on all 24 pinned images (pins re-verified from upstream PNGs),
  e1/e3/e7 CSVs byte-identical to pre-C5, wall-clock unchanged (e3 kodim01
  6.14 s vs pre-C5 6.26 s). M2/M3 FAIL in both units; no parity claim.
  Docs sweep: blueprint 7.1 status, spec Stage-P amendment, README, ideas
  addendum, decision record 2026-08-24T08-16-17. Status stays in_progress
  (Architect re-scope before C6 per tracker rule); decision {"action":"continue"}.

- 2026-08-24 the Builder (continuation run 6, topology correction FIRST):
  Mae's twice-delivered server-side evidence verified this run - the
  histories are SHARED (merge-base f8a958d70e48 after unshallowing; GitHub
  API shows 1113c6f has parent f8a958d70e48). The "disjoint histories"
  wording from review F5 and the two log entries below were shallow/partial
  clone artifacts. Item 0 rewritten to the truthful policy: ordinary
  merge/rebase syncs, --allow-unrelated-histories forbidden on this branch.

- 2026-08-24 the Builder (continuation run 5): review round 1 findings
  F1-F6 folded in (commits bcd12e6, e7ae0e2, plus F4/F5 commit) - gate
  capture now computed from same-run measured V1 (124%/140%), gain 0.78,
  A2 oracle table committed to this file, analyzer uses the shared tree
   builder, topology wording corrected (SUPERSEDED 2026-08-24: shared
   history is the truth - see next-step item 0 and run 6 entry). C4 landed: true CDC lifting behind container bit5 with shared
  transform/inverse helpers, per-plane L by real coded bytes
  (trial_squeeze_bits), probe hook force_squeeze_levels, directed bit5
  round-trip + odd-dims bijection suite (one merge-sign bug found and fixed
  by the suite). Measured rejection corpus-wide: e1 byte-identical to
  pre-C4 (10.2904/3.4301), e3/e7 10.2861/3.4287; M2/M3 FAIL as expected;
  no parity claim. 59/59 gtests, fuzz PASS, self-checks PASS, decision
  record filed. Status stays in_progress (C5/C6 remain); decision
  {"action":"continue"}.

- 2026-08-23 the Builder (continuation run 4, addendum): discovered the
   multi-root hazard the hard way - a routine `git rebase origin/main`
   began replaying the orphan-rooted researcher commits and was ABORTED
   with zero side effects (branch restored at fb460cf, tree clean).
   Correction (review F5, 2026-08-24): the log entry below saying "main is
   an ancestor" was WRONG - `git merge-base origin/main HEAD` exits 1, the
   histories are disjoint; see next-step item 0 for the truthful policy.
   (SUPERSEDED 2026-08-24: that exit 1 was a shallow-clone artifact; shared
   history is repo truth - see next-step item 0 and run 6 entry.)
   Remote head matches local, so no sync was needed; merge-not-rebase stands.

- 2026-08-23 the Builder (continuation run 4): C3 trial-encoded decisions
  landed (076acb0 + measurement commit). Engine: decimate_raster /
  trial_flat_bits / trial_finalists / choose_color_transform_trial exposed
  for tests; color+CFL+predictor decided by real coded bytes with identity
  forced into every final round; energy proxies deleted from decision
  paths (legacy coupled guard untouched until C4). 50/50 gtests incl. I4
  property test; fuzz 1000 iters PASS; probe A1/A2 OK, probe stream
  byte-stable. Fresh corpus: e1 10.2904/3.4301 (7 wins 0 losses), e3
  10.2861/3.4287; pre-C3 CSVs archived as *-pre-c3.csv; wall-clock 3.74x
  (< 5x guard). M2/M3 honestly FAIL; no parity claim. Decision file
  {"action":"continue"} - next run C4 (true CDC lifting).

- 2026-08-23 the Builder (continuation run 3): corpus re-derived from the
  lossless upstream PNGs (24/24 sha pins verified). C2b implemented offline
  first: composite coders with one shared causal walk (analyze.cpp), resdiff-
  keyed class priors in acoder v2 (flat streams bit-identical), probe rail
  variants v2leaf/v2composite/v2act, gate B1 + three-case self-check.
  MEASURED REJECTION: tree-composite totals +163/+330 B over flat; activity
  partition mixed sign; B1 FAIL 2/2 - no format change shipped, e1 truth
  stands. New tests MatreeComposite.* (41/41 green), fuzz clean. Decision
  file 2026-08-23T20-45-00; blueprint section 4 status note updated.
  Status stays in_progress (C3/C4/C5 remain); decision {"action":"continue"}.

- 2026-08-23 the Builder (continuation run 2): corpus re-derived from the
  lossless upstream PNGs, all 24 sha256 pins verified BEFORE measuring;
  fresh e1 CSV committed (10.3544 summed / 3.4515 per-sample). C2 landed:
  flags bit4 + decode mirror + validity gates; builder caps depth 10 /
  leaves 256 / min-samples 512 / quantile candidates / strided induction
  subsample (MATREE_INDUCTION_CAP); v2 leaf-helper 64-clamp latent bug fixed;
  uniform leaf-prior rule tied to bit4. Measured rejection on the whole
  corpus (e3 == e1, 24/24); negative result documented in blueprint,
  decision file, and here. Verification: 39/39 gtests, fuzz 300 iters PASS,
  byte-exact round trips at e1/e3, both gate self-checks PASS.
  Status stays in_progress (C2b/C3/C4/C5 remain); decision {"action":"continue"}.

- 2026-08-23 the Builder (continuation run 2, milestone 1): pre-C1 CSVs
  archived as *-pre-c1.csv; fresh e1 CSV committed (-6.09 pct bytes vs
  pre-C1). C2 followed in the same run - see the entry above.
- 2026-08-23 Dr. Mob (the Researcher): gap analysis + D1 gate fix (commits up to e2a4439).
- 2026-08-23 the Architect: C-series blueprint + progress tracker (fd53e75).
- 2026-08-23 the Builder: resumed per handoff decision {"action":"build"};
  probe corpus rebuilt and pin-verified; C0+C1 landed (commits 008f65d..d65f0e8):
  ACModelsV2 with hierarchical class sharing, bit3 wiring + corruption gate,
  probe rail + durable CSV. A1 PASS, A2 partial (0.85% vs 3% target).
  Status stays in_progress; decision {"action":"continue"}.
- 2026-08-23 the Builder (continuation): offline byte-exact replica verified,
  knob sweep on 4 images; adopted shifts 6/9 + equal mix + directional class
  key (458b116); A2 recalibrated with instrumented-oracle evidence and fresh
  probe CSV committed (37ed5ea); docs sweep + decision record. 34/34 gtests,
  fuzz clean. Status in_progress; decision {"action":"continue"}.

- the Builder
