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
- [ ] C0 Probe harness: `benchmarks/probe_backend.sh` kodim01/kodim13 A-B rail pinning V0/V1 baselines.
- [ ] C1 Entropy backend v2 (P1+P2): zero-flag-first binarization, dual-rate shift4/shift6 mix over 16 class priors; probe captures >= 80 percent of V1 win; landing zone ~10.0-10.7 summed.
- [ ] C2 MA-tree always-on (P3): depth <= 10, leaves <= 256, min-samples 512, quantile thresholds; evalGuard hasLevels deleted; acceptance = trial bits incl. model bytes.
- [ ] C3 Trial-encode decisions (P4): all proxies retired from decisions; identity candidate always present; effort-budgeted search; M2 checkpoint window ~9.3-9.6 summed.
- [ ] C4 True CDC lifting Squeeze (P5): horizontal then vertical lifting, recurse on averages, post-order preserved; must beat decimation baseline on same corpus.
- [ ] C5 Cross-band prediction (P6): XBAND parent-gradient predictor, per-leaf selector, wins >= 20/24 images; M3 GATE CHECKPOINT.
- [ ] C6 CM/SSE stretch (P7, optional for closure): logistic mixer + SSE behind never-expand net toward < 8.0 summed.

## Current step

Builder C0+C1 vertical slice LANDED (run 2026-08-23 ~18:15-19:15Z), C1
acceptance PARTIAL - honest state:

- [x] Probe corpus secured: kodim01/kodim13 PPMs re-derived from lossless
  upstream PNGs, sha256 PASS against `data/kodak.sha256` before measuring.
- [x] C1 core: ACModelsV2 (zero-flag-first binarization; dual-rate shift4/6;
  16 class priors keyed causally on cx; PLUS hierarchical per-class adaptive
  models mixed 8/8 with per-context estimates). v1 path intact.
- [x] Unit tests green (32/32 incl. 9 new AcoderV2 tests); fuzz clean;
  bit3 round-trip byte-exact on real images.
- [x] Flags bit3 = ACODER_V2 wired through container/prism.cpp both sides;
  unknown flag bits are a hard decode error; bit3-without-bit2 rejected.
- [x] C0 probe rail: `prism probe-backend` CLI + `benchmarks/probe_backend.sh`
  (sha pins verified pre-measurement, durable CSV committed,
  A1/A2 gates + --self-check proving pass AND fail verdicts).
- [x] Measured on pinned kodim01/kodim13 (2026-08-23-backend-probe.csv):
  A1 PASS both images (kodim01 v2 -5.18% vs V1 -5.16%, kodim13 v2 -3.45% vs
  -3.42%; captures ~100% of pinned V1 win).
  A2 NOT MET: context gain kodim13 0.85% < 3.00% target (legacy baseline
  was 0.9%). Faster class EMAs tested and rejected (-2.56% regression).

## Next steps (in order)

1. Continue C1 A2 work on fresh run: directional class key for the zero-kind
   (current sum-key collapses edge orientation), then pull P7's logistic
   mixer over {resdiff, qg, activity} forward if still short; every attempt
   re-measured via probe_backend.sh before adoption.
2. Full Kodak-24 re-measure at e1 (corpus re-fetchable from lossless PNGs +
   sha256 verify) -> fresh e1 CSV + bench_gate both-units report.
3. Docs sweep for phase close: prism/README probe section, docs/index links
   (research-gap-analysis.md, architecture-jxl-parity.md).
4. Then C2 (MA-tree always-on) -> C3 (trial-encode decisions) ->
   M2 checkpoint window -> C4 (true CDC lifting) -> C5 (cross-band) ->
   M3 gate -> Reviewer -> Tester -> Maintainer merge.
Owner freeze stands throughout: nothing merges before both gates pass.

## Agent log

- 2026-08-23 Dr. Mob (the Researcher): gap analysis + D1 gate fix (commits up to e2a4439).
- 2026-08-23 the Architect: C-series blueprint + progress tracker (fd53e75).
- 2026-08-23 the Builder: resumed per handoff decision {"action":"build"};
  probe corpus rebuilt and pin-verified; C0+C1 landed (commits 008f65d..d65f0e8):
  ACModelsV2 with hierarchical class sharing, bit3 wiring + corruption gate,
  probe rail + durable CSV. A1 PASS, A2 partial (0.85% vs 3% target).
  Status stays in_progress; decision {"action":"continue"}.

- the Architect
