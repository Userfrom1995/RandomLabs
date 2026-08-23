# Progress - Prism true JXL parity (#130)

- **Issue:** #130 (owner directive 2026-08-23; lab-wide freeze until M2 AND M3
  genuinely pass dual-unit gates)
- **Branch:** opencode/issue130-20260823163248 (research + architect + builder phases)
- **Status:** in_progress. C0+C1 landed (A1 pass, A2 partial). Research DONE (Dr. Mob, this PR): D1 gate fix shipped
  (`bench_gate.sh` prints both units, `--self-check` proves it can fail), D2 gap
  analysis located the ~21 percent gap (findings F1-F4). Architect blueprint
  DELIVERED: `prism/docs/architecture-jxl-parity.md` (C-series build phases).
  Builder phase STARTED 2026-08-23: C0+C1 vertical slice under way (see log).
- **Binding gates (both units, real corpus, byte-exact):**
  M2 summed < 9.498 AND per-sample < 3.166;
  M3 summed < 8.655 AND per-sample < 2.885.
  Baseline: Prism e7 = 11.026 summed / 3.675 per-sample. No merge until M2 AND
  M3 pass; no success claim without a fresh both-units measurement.

## C-series checklist (blueprint: prism/docs/architecture-jxl-parity.md)

- [x] R1 Research phase: gap analysis F1-F4 + prescriptions P1-P7 (this PR).
- [x] R2 D1 blocking deliverable: unit-consistent bench_gate.sh + self-check (this PR).
- [x] A1 Architect blueprint: backend-v2 C-series, module map, test matrix (this PR).
- [x] C0 Probe harness: `benchmarks/probe_backend.sh` kodim01/kodim13 A-B rail pinning V0/V1 baselines.
- [x] C1 Entropy backend v2 (P1+P2): zero-flag-first binarization, dual-rate shift6/shift9 mix over 16 directional class priors; probe captures >= 80 percent of V1 win (125%/141%); A2 recalibrated and PASS.
- [x] C2 MA-tree always-on (P3): capability + trial-bits acceptance LANDED (flags bit4, caps depth<=10 / leaves<=256 / min-samples 512 / quantile thresholds, v2 64-clamp latent bug fixed). Measured: trial REJECTS on all 24 corpus images (tree loses to flat resdiff-343 by ~0.12 pct; e3 == e1 byte-identical 24/24). Negative result + next lever in blueprint section 4 + decision file.
- [ ] C2b composite leaf*343+resdiff contexts (offline probe rail first): tree REFINES the causal context instead of replacing it.
- [ ] C3 Trial-encode decisions (P4): all proxies retired from decisions; identity candidate always present; effort-budgeted search; M2 checkpoint window ~9.3-9.6 summed.
- [ ] C4 True CDC lifting Squeeze (P5): horizontal then vertical lifting, recurse on averages, post-order preserved; must beat decimation baseline on same corpus.
- [ ] C5 Cross-band prediction (P6): XBAND parent-gradient predictor, per-leaf selector, wins >= 20/24 images; M3 GATE CHECKPOINT.
- [ ] C6 CM/SSE stretch (P7, optional for closure): logistic mixer + SSE behind never-expand net toward < 8.0 summed.

## Current step

Builder continuation run 2 (2026-08-23 ~19:30Z) COMPLETE for this slice.
Milestone 1: fresh both-units Kodak-24 e1 measure LANDED (-6.09 pct bytes vs
pre-C1; table below). Milestone 2: C2 capability + honest rejection LANDED.

| metric | pre-C1 e1 (=e7) | fresh e1 (C1 v2) | delta |
|---|---|---|---|
| summed bpp | 11.0258 | **10.3544** | -6.09% bytes |
| per-sample bpp | 3.6753 | **3.4515** | -6.09% bytes |

Honest status: M2/M3 gates still FAIL in both units as expected
(10.3544 vs 9.498 / 8.655). Pre-change CSVs archived as `*-pre-c1.csv`.

C2 outcome (measured, not assumed): the spatial MA-tree builds fast and
deterministically (kodim01: 41 leaves / depth 10 / 286 B in 0.78 s), but its
leaf contexts lose the trial-bits acceptance to flat residual-DIFF-343 coding
on every corpus image (+1050 B kodim01 with prior init, +1598 B with uniform
init). The trial gate rejects, so emitted streams stay flat: e3 == e1
byte-identical on 24/24 images - zero regression, never-expand holds by
construction. A replace-context partition is strictly coarser than the exact
causal context under this binarization. NEXT LEVER: composite contexts
(leaf refines resdiff), validated offline on the probe rail first (C2b).
Details: blueprint section 4 status note + decision file
.github/agents/decisions/builder/2026-08-23T20-00-00-c2-scope-and-measured-rejection.md.

Previous slice summary (C1 offline retune + A2 recalibration, all PASS):

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
      v2 -4.79 pct (gap 0.78). A1 125%/141% capture. PROBE GATE PASS.
- [x] Verification: 34/34 gtests green, fuzz 1000 iters PASS, docs sweep
      (blueprint 3.2/3.3, prism README probe section, ideas writeup).

## Next steps (in order)

1. [next run] C2b: composite `leaf * 343 + resdiff` contexts with hierarchical
   sharing - validate OFFLINE on the probe rail (extend probe_backend.sh or a
   sim harness) before any format change; ship only on a measured win; the
   trial-bits gate stays the binding acceptance.
2. C3 (trial-encode decisions): retire proxy estimators from decision paths,
   identity candidate always present; M2 checkpoint window (~9.3-9.6 summed).
3. Then C4 (true CDC lifting) -> C5 (cross-band prediction) -> M3 gate ->
   Reviewer -> Tester -> Maintainer merge.
Owner freeze stands throughout: nothing merges before both gates pass.

## Agent log

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
