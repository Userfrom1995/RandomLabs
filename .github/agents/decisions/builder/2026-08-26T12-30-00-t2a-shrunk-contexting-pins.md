# T2a shrunk fine contexting (+ conditional T2b): structural pins

- **Role:** the Builder
- **Date:** 2026-08-26 (Builder slice Q2 of the T-series program, PR #146,
  issue #130)
- **Authority:** spec addendum 20 (algorithmic-spec.md sections 20.3/20.5)
  and the T-series blueprint (`architecture-jxl-parity-tseries.md`
  sections 2/7) are binding. Everything below lands BEFORE any
  `bench-sandbox --t2a` row exists; nothing retunes any addendum-20
  constant.

## P-Q2-1 Candidate scope

Shrunk class343 child tables on the spine stack, exactly one mechanism
changed vs the class16 spine: candidates sweep arms {TW-A a_c = 32, TW-B
a_c = 128} (addendum 20.3 verbatim) x ALL SEVEN D4c color trials, keyed
KFLAT343 (cluster == residual-DIFF context id), backend B-RANS for
verdicts; B-IDEAL rows are fidelity-rail diagnostics only and never enter
any winner choice. No predictor work, no tokenization work, no groups, no
assignment bits anywhere.

## P-Q2-2 Parent tables and child counting

Parents = the SAME-RUN fresh class16 config's transmitted tables: counted
through the identical `prepare_keyed_config(ZFFCTRL, KFLAT16)` path the
baseline SPINE row uses (budget-enforced, recounted through 'SBP1',
serialized 'SBM1'), so the candidate's parent entry for context cq is
literally the u12 row the baseline pays for. Child counts pool ALL PLANES
under KFLAT343 with NO cluster-budget enforcement anywhere: shrinkage
toward the parent REPLACES the 4096-sample floor mechanism by design
(an enforced flat343 model would destroy exactly the fine contexts T2a
exists to price). Parents are indexed by the SHIPPED class16 reduction
(`keying_cluster(KFLAT16, cq)` = `ac_v2_prior_class`) per addendum 20.3
verbatim; note the budget merge map is identity on every committed quad
flow (V1/S4 keff = 16 everywhere), and any future corpus where it is not
lands as a numbered amendment BEFORE measurement.

## P-Q2-3 Coding tables == transmitted artifact (P-Q1-5 extended)

The candidate codes ONLY against tables rebuilt from the transmitted
'SBD1' blob: encoder wraps `ShrunkTables::p` as a SmoothedTables with
clusters = 343, and the binding unit test proves the decode-side rebuild
(`deserialize_shrunk`) is step-equal to it AND drives a byte-exact rANS
round-trip. Recount-derived or data-derived rebuilds NEVER produce coding
tables (t0-smoke precedent). Decode resolves contexts causally under
KFLAT343 from its own history - mirror-by-construction, zero maps/trees/
assign by schema.

## P-Q2-4 Baseline reading of the gate (mechanical)

Addendum 20.5: ">= +0.50 pct median NET vs the same-stack class16
baseline fresh in-run". Same-stack = ZFFCTRL x B-RANS x KFLAT16 static
spine measured fresh in this run. Per image the baseline is the
minimum-NET SPINE B-RANS row across the seven trials (first strict
minimum scanning trials ascending). The T-BASE winner ({ADAPT, SPINE},
ties to ADAPT) is ALSO computed and cited beside the readout as context,
but never gates: ADAPT is not same-stack, and the gate's purpose is to
price the class343 refinement against the tables it refines.

    relpct(i) = 100 * (net_cls16(i) - net_cand(i)) / net_cls16(i)

## P-Q2-5 Arm winner, statistic, verdict

Per image per arm the reported row is the first strict minimum NET
scanning trials ascending (ties = lowest color-trial id); arm-vs-arm ties
keep TW-A. Configuration statistic = quad median of the winners' relpct;
T2a PASS iff median >= +0.50 (I10 medians primary; whole set printed
beside, no post-hoc re-selection ever).

## P-Q2-6 CSV schema

`benchmarks/results/2026-08-26-sandbox-t2a.csv`, one file per phase
(addendum 20.6). Row forms:

    T2,img,cand,trial,be,payload,tables,maps,trees,assign,net,audit,
        rt,tbl_bits
    T2SUM,img,arm,bp,bt,bm,btr,ba,bnet,p,t,m,tr,a,net,relpct

cand in {ADAPT, SPINE, SHRUNKA, SHRUNKB}; arm in {SHRUNK@TW-A,
SHRUNK@TW-B}. T2SUM embeds the mandatory decomposition per image so the
gate figure is auditable from the file alone; the evaluator cross-checks
every T2SUM against the raw T2 rows (rail, not trust).

## P-Q2-7 Rails before verdicts

All six VB rails green on the new families BEFORE any verdict line:
anchors bit-for-bit against the committed reference (re-emitted inside
the CSV); VB-proto-roundtrip / VB-assign-mirror / net-audit-t extended to
the T2 row schemas (SHRUNK rows carry zero maps/trees/assign; ADAPT zero
side info; SPINE tables + 'SBP1' only); decode round-trip equality on
EVERY coded row (decode under the TRANSMITTED rebuild); coder fidelity
within +0.50 pct per (img, cand, trial) family; determinism byte-
identical full re-run; quad sha-pins verified pre-run. A gate rejection
never flips the exit code; rail failures always do.

## P-Q2-8 Verdicts live in the evaluator; failability proven

probe_sandbox.sh parses T2/T2SUM rows, recomputes every derived figure,
prints the T2A VERDICT line WITHOUT ever flipping exit codes, and gains
`--self-check-t2a`: a fabricated consistent frame must pass the rails and
render an honest losing verdict, the +0.50 bar must be reachable in BOTH
directions, and named mutations (NET identity break, round-trip lie,
schema leak, TSUM relpct mismatch, base-component mismatch) must each
flip their named rail. Zero container bytes throughout; wall-clock logged
beside the run per the A3 precedent.

## P-Q2-9 Conditional T2b

Opens in THIS slice only if T2a PASSes and the machinery stays green
(blueprint section 7): E0 M-C property poolings ii/iii under STATIC
two-pass scoring with the T2a-winning arm's table economics (addendum
20.3), gate >= +1.50 pct median NET, per-image primary. On a T2a FAIL the
conditional never opens and flat-16 ships unchanged; if T2b later runs
and fails, B2's static branch closes permanently (second failure).

## STATUS

Committed 2026-08-26 BEFORE any T2a row exists. No addendum-20 constant
is retuned anywhere in this record; every reading left open by the
addendum is pinned here first.

- the Builder
