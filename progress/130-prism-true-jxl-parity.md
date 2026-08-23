# Progress - Prism true JXL parity (#130)

- **Issue:** #130 (owner directive 2026-08-23; lab-wide freeze until M2 AND M3
  genuinely pass dual-unit gates)
- **Branch:** opencode/issue130-20260823163248 (research + architect phases)
- **Status:** in_progress. Research DONE (Dr. Mob, this PR): D1 gate fix shipped
  (`bench_gate.sh` prints both units, `--self-check` proves it can fail), D2 gap
  analysis located the ~21 percent gap (findings F1-F4). Architect blueprint
  DELIVERED: `prism/docs/architecture-jxl-parity.md` (C-series build phases).
- **Binding gates (both units, real corpus, byte-exact):**
  M2 summed < 9.498 AND per-sample < 3.166;
  M3 summed < 8.655 AND per-sample < 2.885.
  Baseline: Prism e7 = 11.026 summed / 3.675 per-sample. No merge until M2 AND
  M3 pass; no success claim without a fresh both-units measurement.

## C-series checklist (blueprint: prism/docs/architecture-jxl-parity.md)

- [x] R1 Research phase: gap analysis F1-F4 + prescriptions P1-P7 (this PR).
- [x] R2 D1 blocking deliverable: unit-consistent bench_gate.sh + self-check (this PR).
- [x] A1 Architect blueprint: backend-v2 C-series, module map, test matrix (this PR).
- [ ] C0 Probe harness: `benchmarks/probe_backend.sh` kodim01/kodim13 A-B rail pinning V0/V1 baselines.
- [ ] C1 Entropy backend v2 (P1+P2): zero-flag-first binarization, dual-rate shift4/shift6 mix over 16 class priors; probe captures >= 80 percent of V1 win; landing zone ~10.0-10.7 summed.
- [ ] C2 MA-tree always-on (P3): depth <= 10, leaves <= 256, min-samples 512, quantile thresholds; evalGuard hasLevels deleted; acceptance = trial bits incl. model bytes.
- [ ] C3 Trial-encode decisions (P4): all proxies retired from decisions; identity candidate always present; effort-budgeted search; M2 checkpoint window ~9.3-9.6 summed.
- [ ] C4 True CDC lifting Squeeze (P5): horizontal then vertical lifting, recurse on averages, post-order preserved; must beat decimation baseline on same corpus.
- [ ] C5 Cross-band prediction (P6): XBAND parent-gradient predictor, per-leaf selector, wins >= 20/24 images; M3 GATE CHECKPOINT.
- [ ] C6 CM/SSE stretch (P7, optional for closure): logistic mixer + SSE behind never-expand net toward < 8.0 summed.

## Current step

Ready for Builder C0+C1 as one vertical slice: probe harness first, then
backend v2 (acoder.h ACModelsV2, flags bit3), measured on kodim01/kodim13
BEFORE the full corpus. Every milestone keeps 23/23 gtest + fuzz 1000 +
corruption reject + Kodak-24 byte-exact green and commits its durable CSV.

## Next steps

Builder: C0 -> C1 -> re-measure -> C2 -> C3 -> re-measure (M2 checkpoint) ->
C4 -> C5 -> re-measure (M3 gate) -> Reviewer -> Tester -> Maintainer merge.
Owner freeze stands throughout: nothing merges before both gates pass.

- the Architect
