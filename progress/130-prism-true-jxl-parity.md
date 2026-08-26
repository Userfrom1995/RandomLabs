# Progress - Prism true JXL parity (#130)

- **Issue:** #130 (owner directive 2026-08-23; lab-wide freeze until M2 AND M3
  genuinely pass dual-unit gates)
- **Branch:** opencode/issue130-20260823163248 (research + architect + builder phases)
- **Status:** complete. #130 closes HONESTLY at the achieved level
  2026-08-25 after the full C/D/E program executed with every lever adopted-
  and-measured or rejected-by-measurement. Final corpus truth (E4 fresh
  measure, all 24 pins verified pre-measurement): e1 = 10.1210 summed /
  3.3737 per-sample bpp; e3 = e7 = 10.1350 / 3.3783 - byte-identical to the
  D4c-era CSVs, proving D0-E1 library work stayed format-unwired end to end.
  M2 FAIL both units (vs < 9.498 / < 3.166); M3 FAIL both units (vs < 8.655
  / < 2.885). Total from the 11.026 baseline: -8.21 pct bytes at e1
  (1 - 10.1210/11.026). ADOPTED across the project: C1 entropy backend v2,
  C3 trial-encoded decisions, D4c reversible color rotations. REJECTED BY
  MEASUREMENT with committed evidence: C2/C2b/C4/C5 static transforms and
  context refinement, D1 blended prediction, D2/D4b mixer+SSE, D4a zero-run,
  E2 frozen tables (DOA-by-arithmetic), E3 MANIAC (MC gate), E1 bias
  cancellation (bracket WORSE by 16-20 points; zero-flag economics).
  Full ledger in this file + prism/docs/research-e-series-endgame.md +
  decision records under .github/agents/decisions/builder/.
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
- [x] D4a zero-run mode (Mae-directed first lever): OFFLINE VALIDATION ONLY,
      REJECTED (2026-08-24). Causal JPEG-LS-style run mode scored through the
      I7 harness (`bench-ideal --zrun`, ZRUN CSV + ZR-fmt eligibility gate +
      hard ZR-anchor gate, self-check proving events collapse / no invented
      win / both verdicts reachable). Measured on sha-pinned kodim01/13 plus
      unseen kodim05/20: aggregate adapt +0.28 pct WORSE than plain v2
      (+0.30/+0.16/+0.23/+0.47 per image, 4/4 above baseline); even the
      optimistic STATIC bracket is only -0.24 pct (ctx343 pooled), an order
      of magnitude under the billed 1-3 pct. Mechanism: 190505 of 192000 run
      events carry k=0 (isolated zeros under the MED residual), so run
      symbols mostly re-code what the zero-flag already cheaply codes, and
      RunFreq learning cost eats the rest. STOP rule fired; zero format
      bytes. Evidence: benchmarks/results/2026-08-24-ideal-zrun-d4.csv.
- [x] D4b extended mixer bank: OFFLINE VALIDATION ONLY, REJECTED (2026-08-
      24). K=6 bank (directional dL-dU key + zero-left key estimators) plus
      stacked/cx-keyed second SSE stages wired into the I7 harness as
      mix6/mix6-sse/mix6-sse2/mix6-cxsse presets (mix4 regression verified
      bit-identical after the code_bin refactor). Measured on pinned
      kodim01/13 + unseen kodim05/20: best aggregate bits_mx -0.69 pct -
      WORSE than D2's K=4 mix4-sse-lr8 (-0.90 pct); the added estimators
      subtract value, and every second SSE stage remains harmful (+28 to
      +37 pct). Gate >= 3 pct FAILS by 4.3x; STOP rule fired; zero format
      bytes. Evidence: this run's MIXER rows (durable CSV next slice).
- [x] D4c reversible color rotations: ADOPTED (2026-08-24). Offline gate
      CR-fmt PASSED for loco (-4.3582 pct aggregate v2 on kodim01/13/05/20,
      all 24 corpus pins verified), rct-gbr/rct-rbg (-2.42), rct-grb/rct-brg
      (-0.69); rct-bgr FAILed and is excluded. Independent cross-check
      (separate implementation, different cost model) confirmed direction 4/4.
      Wired as container ids 7..11 (zero signaling cost; unknown ids now a
      hard decode error closing a latent silent-identity bug); rotations are
      CFL-excluded like the YCoCg family. The single-list trial measurably
      regressed kodim18 +0.25 pct (MED-flat metric blind to the anchor's
      CFL/predictor advantages) - final design runs stage 2 at the END of
      analyze() under the anchor's decided predictor vs its production-flat
      cost, strict-win-only. Measured: 22 wins / 2 ties / ZERO regressions
      at e1/e3/e7; e1 = 10.1210 summed / 3.3737 per-sample (-1.646 pct
      bytes), e3 = e7 = 10.1350 / 3.3783 (-1.469). Decision record
      2026-08-24T21-45-00-d4c-color-rotation-adoption.md.
- [x] D4 item 4 (squeeze re-test under the mixer): condition NOT met - the
      precondition was new collection evidence from an ADOPTED mixer and D2/
      D4b rejected every mixer offline; recorded as a reasoned skip.
- [x] OWNER DECISION POINT (re-scope section 1): RESOLVED by Mae's dispatch
      2026-08-24T19:39Z - continue into the D4 stretch knowing M3 likely
      stays open. Levers in flight: zero-run (DONE, rejected above),
      extended mixer bank (DONE, rejected above), reversible color rotations
      (DONE, ADOPTED above), squeeze re-test only with new D0 evidence
      (condition not met, above).
- [x] D4 Stretch COMPLETE (2026-08-24): all four levers closed by
      measurement. M3 still fails after D4, so per the re-scope the final
      both-units numbers are written here and the owner decision point named
      in section 1 is SURFACED: parity stands ~16.9 percent away at e1
      (10.1210 vs < 8.655 summed); the owner decides between MANIAC-grade
      machinery (meta-adaptive tree over mixer weights, with our C2/C2b
      negatives constraining expectations) or closing #130 honestly at the
      achieved level (C-series + D4c = -8.21 pct bytes total from the 11.026
      baseline; CORRECTED 2026-08-25 by the Researcher with the derivation
      1 - 10.1210/11.026 = 8.21 pct; earlier text printed -9.1). No silent
      scope creep.
- [x] OWNER DECISION POINT RESOLVED INTO RESEARCH (2026-08-25): the owner
      dispatched `/oc research` on the PR thread; Dr. Mob delivered the
      endgame specification `prism/docs/research-e-series-endgame.md` -
      four-component decomposition of the remaining gap (A learning /
      B tracking / C conditioning-deficit / D binarization), pre-registered
      harness measurements M-A/M-B/M-C with binding gates (MANIAC viability
      bar: property-conditioned ideal must beat ctx343 by >= 1.5 points of
      v0), and intervention specs E1 CALIC-class per-context bias
      cancellation, E2 forward-adaptive frozen tables (ext-bit container),
      E3 MANIAC tree over previously-coded residual quotients (strictly
      conditional on M-C), E4 checkpoint. Honest base case recorded there:
      best-case stack lands ~9.3-9.7 summed => M2 plausible, M3 likely stays
      open unless measurements surprise upward. Handoff decision
      {"action":"architect"}.

## E-series checklist (blueprint: prism/docs/architecture-jxl-parity-eseries.md)

- [x] E0 Harness modes + M-A/M-B/M-C (blueprint section 1): BLOCKING FIRST.
      Spec addendum 14 lands before any measurement; --orinit/--props modes,
      OA-order/OA-corrupt/PC-mono/MC-viability gates; measured A/B/C shares
      written HERE with CSV paths and the decision-tree row NAMED before any
      intervention work starts (zero format bytes before the readout).
      **DONE 2026-08-25** (spec addendum 14 committed BEFORE any measurement;
      all rails green; durable CSVs under prism/benchmarks/results/):
      - CSVs: `2026-08-25-ideal-orinit-e0.csv` (+ `2026-08-25-ideal-corrupt-e0.csv`
        failability evidence), `2026-08-25-ideal-props-e0.csv`, joint rows in
        `2026-08-25-ideal-probe-e0-eval.csv`. Probe quad sha-pins verified
        pre-measurement; determinism proven byte-for-byte.
      - Rail integrity ALL GREEN: OA-order OK on all four images (e.g. kodim01
        stat_c16 -12.455 <= or -6.465 <= ad -6.396); OA-corrupt injection
        violates everywhere (+47 to +60 pct vs real coder, proving the rail
        can fail); PC-mono OK on 15/15 PROP rows.
      - **Measured shares (pooled TOTAL, points of v0):**
        pct_ad = -5.709; pct_or = -5.781; stat(class16,fine) = -10.90;
        stat(ctx343,fine) = -12.03.
        **A (warm-start/learning) = 0.073 points** -> E2 step-1 is
        DOA-BY-ARITHMETIC (< 1.5 bar; number recorded per blueprint).
        **B (tracking vs bin-fine anchor) = 5.12 points**, BUT the pinned
        transparency column **B_coarse = -0.91 points** (adaptive already
        BEATS same-structure static pooling): the bin-fine B is dominated by
        static fine-structure gain that class-level or region-level tables
        cannot recover by mechanism. E2 as a family is dead absent an E1
        stream change.
        **C margins (pooling ii vs ctx343-fine): pooled-TOTAL margin =
        1.33 points < 1.5 bar -> MC-viability FAIL AS PRE-REGISTERED.**
        Anomaly recorded as information, not grounds for re-litigation
        (forbidden per risk register): every INDIVIDUAL image clears the bar
        comfortably - kodim01 +2.67, kodim13 +1.86 (anchors), kodim05 +2.87,
        kodim20 +2.95 - and pooled scoring is a JOINT estimate across images
        whose shared property cells suffer mixture interference (pooled(iii)
        even collapses BELOW pooled(ii) while every per-image(iii) beats its
        own (ii)).
      - **NAMED DECISION-TREE ROW (blueprint section 7, row 1): "M-C fails
        AND A < 1.5 points" -> MANIAC and E2 both DOA by arithmetic; if E1's
        gate also fails, close #130 honestly at the achieved level with the
        full negative ledger; if E1 passes, E1 alone proceeds then E4
        decides.** M-C verdict: MANIAC DEAD ON THIS BINARIZATION (committed
        CSV is the evidence). The per-image anomaly above is handed to the
        Maintainer/owner as data; changing the pre-registered bar after the
        measurement is forbidden and is NOT requested.
      - Zero format bytes spent (I7/I8/I9 held throughout).
- [x] E2 Frozen tables: precondition arithmetic CHECKED at E0: A-share =
      0.073 points of v0 < 1.5 -> **step 1 DOA-by-arithmetic** (number
      recorded). Step 2's formal precondition (B >= 2 on the bin-fine
      anchor) is numerically met at B = 5.12, but the measured decomposition
      shows that share is structure gain, not recoverable tracking
      (B_coarse = -0.91); treat step 2 as closed-by-mechanism unless a
      future stream change reopens it. FEATURE_EXT byte NOT wired (nothing
      adopted; registry unchanged).
- [x] E3 MANIAC tree over quotient properties: **MC-viability FAIL ->
      development NEVER OPENS on this binarization.** Evidence:
      2026-08-25-ideal-props-e0.csv. Per-image anomaly recorded above for
      the owner's awareness only.
- [x] E1 CALIC-class bias cancellation: OFFLINE VALIDATION ONLY, REJECTED
      (2026-08-25). Spec addendum 16 pinned mechanism-(b) gain constants and
      the gate's single reading BEFORE any measurement. BiasModel library
      (predict.{h,cpp}) + 11 unit tests incl. exact pinned-arithmetic checks;
      `--bias biasoff,bias,biasgain` harness mode with BIAS-anchor
      (byte-equality, held) and fail-capable self-checks. MEASURED VERDICT
      on the pinned quad (sha-pins verified): med@bias ctx343-fine bracket
      WORSE by 19.85 points of v0 aggregate (payload +70.2 pct);
      med@biasgain worse by 16.33 (+21.7 pct); 4/4 images regressed both
      ways. BIAS-fmt FAIL by an order of magnitude; STOP rule fired; zero
      format bytes. Mechanism understood: zero-flag-first binarization
      prices MED's exact-zero residual peak below its conditional-entropy
      worth - moving predictions toward the conditional MEAN spreads mass
      off the MODE. Evidence: benchmarks/results/2026-08-25-ideal-bias-
      e1.csv; decision record 2026-08-25T12-30-00.
- [x] E4 Checkpoint: fresh dual-unit corpus measure at e1/e3/e7, corpus
      pins verified BEFORE measuring, all three CSVs BYTE-IDENTICAL to the
      D4c-era committed files (D0-E1 work proven format-unwired end to end).
      e1 = 10.1210 summed / 3.3737 per-sample; e3 = e7 = 10.1350 / 3.3783.
      bench_gate.sh in BOTH units on e1 and e7: M2 FAIL (10.1210 >= 9.498;
      3.3737 >= 3.166), M3 FAIL (10.1350 >= 8.655; 3.3783 >= 2.885).
      FINAL DECISION-TREE ROW CONFIRMED: row 1 final clause - #130 closes
      honestly at the achieved level with the full negative ledger. Review
      boundary reached; this is the project's closing state.

## Prism v2 clean-slate checklist (authorized by owner via Mae, 2026-08-25)

The merge of PR #131 was ledger preservation only, NOT a parity declaration.
Per the kickoff comment on #130 (2026-08-25T15:31Z): v2 may be an entirely
new architecture family; M2/M3 dual-unit gates unchanged; brainstorm board
stays frozen. Research mandate: study BOTH ledgers (Obsidian + Prism v1)
and locate where the gap lives before any blueprint.

- [x] R-v2 Research phase: gap decomposition into five measured/anchored
      buckets (B1 collection layer up to 6.30 pct of current bytes via
      forward-adaptive clustered static coding; B2 per-image conditioning
      margins 2.0-3.1 pct killed in v1 only by pooled-joint scoring; B3
      predictor headroom 2-5 pct literature-bounded, unmeasurable under
      v1 zero-economics scoring; B4 trial-selection expansion 0.5-1.5;
      B5 tokenization refinements 0.5-1.0) plus the consolidated
      carried/reopened ledger (L-C1..L-C9 constraints, R-1..R-4 reopenings
      each with written confound arguments), the candidate architecture
      family, and the pre-registered offline V-series program (V0 spine,
      V1 backend/tokenization, V2 predictors, V2b bias canary, V3 context
      structures, V4 composition threshold < 9.35 summed projected, V5
      squeeze-with-parent-properties reserve). New invariants I10
      (per-image primacy - ratifies the E0 pooled-scoring anomaly lesson),
      I11 (reopening requires named structural delta), I12 (net accounting
      covers maps/tiles/trees). Spec:
      `prism/docs/research-v2-clean-slate.md`. Honest base case: lands
      summed 9.1-9.7 => M2 PASS expected, M3 only at optimistic edges or
      via V5. Handoff {"action":"architect"}.
- [x] A-v2 Architect phase: V-series blueprint delivered
      (`prism/docs/architecture-jxl-parity-vseries.md`) + spec addendum 17
      (algorithmic-spec.md section 18) committed BEFORE any measurement:
      gate reading pinned (RELPCT per-image medians primary per I10, NET =
      payload+tables+maps+trees per I12), V0 spine fully specified (new
      `prism bench-sandbox` command, tokenize/staticmodel format-unwired
      modules, six VB rails incl. bit-for-bit anchors against the frozen
      bench-ideal references, coder-fidelity bound +0.50 pct, corrupt-
      injection failability, ranking fixtures both directions), tokenization
      ladders ESC-A/B/C (T_ESC 4/8/16), cluster caps K <= 256 with 4096-
      sample floors, smoothing prior (pseudo-count 32, r = 15/16, sum 2^12),
      V2 predictor mathematics integer-exact (reduced GAP thresholds
      t80/t32 scaled by BD; W ensemble over {W,N,NW,TE} with normalized
      16.16 weights, gradient update /512, clamps [16384, 1048576],
      max-error-feedback property buckets), V4 projection formula against
      the committed e1 CSV, and reserved-slot amendments for later phases.
      Builder slicing: slice 1 = V0 rails green + dated CSVs before any V1
      scoring; zero container bytes until a V4 PASS. Handoff {"action":
      "build"}.
- [x] V0 sandbox spine (Builder slice 1; blueprint section 6): COMPLETE
      2026-08-25. tokenize.{h,cpp} + staticmodel.{h,cpp} format-unwired
      (zigzag bijection, ZERO-token exclusivity, ladder edges T_ESC+-1,
      dense round-trips incl. extremes; per-bin smoothing per amendment
      pins A1/D9-D15; hierarchical blob serialization + CRC + length
      prefixes + NET audit; interleaved-static rANS (NS=4) and B-BAC
      round-tripping every profile x keying; cluster floor/cap enforcement).
      `prism bench-sandbox` CLI: config matrix (4 profiles x keyings x 3
      backends + B-ADAPT control), BRACKET rows from the frozen idealbench
      walk, round-trip verification on every real backend row, NET audit
      column, three corruption injections all hard-detecting. ENGINE
      INTEGRITY FIXES (decision-record amendment A2, BEFORE any
      measurement): (1) build_tables' TOKEN block spilled past the ZFFCTRL
      stride and overwrote every cluster boundary's ZERO_FLAG entry with
      4096 - round-trips stayed green only because encoder and decoder
      shared the damage; fixed + regression test. (2) table_ideal_bits now
      carries RAWBITS literal cost so B-IDEAL bounds its real siblings.
      RAILS: `benchmarks/probe_sandbox.sh` LANDED - all six VB rails green
      on the pinned quad: VB-anchor-adapt (B-ADAPT payload bit-for-bit vs
      committed v2 bytes, 4/4 images), VB-anchor-ideal (frozen-walk BRACKET
      AND sandbox counting path both reproduce fine_shared/class16/ctx343
      bit-for-bit, 4/4), VB-coder-fidelity (72 real-backend rows within
      +0.50 pct of their own B-IDEAL rows; measured spread +0.02..+0.03),
      VB-net-audit (112 rows: serializer audit == blob length, NET identity,
      all coded rows decode), VB-corrupt (table/trunc/content injections all
      hard-detect on a real pinned image), VB-rank (skew fixture: clustered
      23169 < pooled 29383 NET; constant-image fixture: pooled 401 <=
      clustered 1628), VB-determinism (byte-identical quad re-run).
      --self-check proves every rail's FAIL path (anchor drift, fidelity
      stub, double-count mismatch, silent corruption, flipped rank fixtures,
      uncovered image) plus live rank/injection/determinism checks.
      REFERENCE CSV COMMITTED:
      benchmarks/results/2026-08-25-sandbox-v0.csv (144 rows: SANDBOX config
      matrix + BRACKET + CORRUPT + SANDBOXTOTAL families). Wall-clock
      deviation recorded honestly as amendment A3 (sandbox coding
      instrument ~21-42x the plain bench-ideal bracket walk; structural to
      the pairing, O(N) per config as blueprinted). Control truth re-verified
      in-sandbox: B-ADAPT quad net = 2272270 == committed e1-era bytes.
      V0 exit condition MET: all rails green + dated reference CSV committed;
      V1 scoring may now run. Zero container bytes by construction.
      Spec addendum 17 verified, never retuned; structural
      disambiguations pinned BEFORE any measurement in
      `.github/agents/decisions/builder/2026-08-25T16-20-00-v0-sandbox-
      structural-pins.md` (escape m = u-T_ESC+1 per the m>=1 guarantee;
      ESC-B/C escape context = min(q, T_ESC-1); raw low bits unmodeled;
      anchor poolings floor-exempt; per-image tables with 18-slot unary
      caps; delta-stream rANS depth 1; TOKEN even pseudo; VB-corrupt map/
      tree injections deferred to V3 artifacts). Deliverables: tokenize +
      staticmodel format-unwired modules, `prism bench-sandbox` CLI,
      interleaved-static rANS extension, probe_sandbox.sh with all six VB
      rails + failable self-checks, dated reference CSVs under
      benchmarks/results/. Zero container bytes by construction.
- [x] V1 measurement slice (Builder slice 2; blueprint section 6 + pins
      V-P1..V-P8 in decisions/builder/2026-08-25T21-30-00, committed BEFORE
      any measurement): COMPLETE 2026-08-25. Machinery: ClusterMap
      resolution layer; KGRID128 tiles; KTREE = greedy context partition
      over qL/qU/qUL ONLY (octile-quantile candidates weighted by per-
      context samples, matree caps depth<=10/leaves<=256 inherited,
      4096-sample floor binding both split sides, fixed scan order, strict
      max gain, DFS preorder leaves); 'SBT1' tree blob and 'SBP1' budget
      merge-map blob so decoders mirror count-based merges exactly; oracle
      pass = per-sample best-cluster assignment under pinned fixed-point
      cost LUTs, single pass, memoized by exact event signature, recount
      WITHOUT enforcement, tables fully transmitted, map FREE but reported.
      Sweep: 4 profiles x 3 keyings x 3 backends x {REAL, ORACLE} x quad =
      288 V1 rows + control/bracket/anchor rows; all six VB rails green on
      the new families (fidelity 192 rows within bound, net-audit 288 rows
      incl. oracle freebie exclusion); --self-check-v1 proves the new fail
      paths; determinism byte-identical; wall-clock 147x bench-ideal
      recorded per V-P8 (A3 precedent).
      MEASURED VERDICT: V1a PASS (+74.60 pct best median, HYB-A x KTREE;
      freebie-dominated - the hypothetical map costs more than the gain it
      explains). V1b FAIL (best median +5.81 pct, ZFFCTRL x KFLAT16 with
      every side-info byte NETTED: tables ~2.9 KB + merge-map 26 B;
      per-image +5.92/+6.08/+5.69/+3.20) vs retention bar half-of-V1a
      (+37.30). **Overall V1 FAIL => STOP rule fired, decision tree row 1:
      bucket B1 closed-with-numbers - harvestable only at ~5.8 pct via
      forward-adaptive static class16 tables, far under the pre-registered
      bar; owner to be informed BEFORE any pivot blueprint commits.**
      Cross-checks: ZFFCTRL/KFLAT16 REAL reproduces the V0 exempt anchors
      after floors+side-info become payable; HYB rows match V0 references.
      The slice's FIRST run was discarded wholesale when a harness bug
      (unset ClusterMap width collapsed every keying to one cluster) was
      caught by cross-instrument agreement checks before any verdict was
      recorded; fix committed separately, no number from that run survives.
      Zero container bytes by construction. Evidence CSV:
      benchmarks/results/2026-08-25-sandbox-v1.csv.
- [x] V-series continuation SUSPENDED at the V1 gate, then RESOLVED by the
      owner 2026-08-25T21:53:15Z on PR #145: STOP acknowledged; the
      source-side-only pivot (or any architecture the Architect deems
      necessary) authorized; NEW STANDING ORDER - future mathematical
      ceilings may be pivoted autonomously without pausing for owner
      permission, and the ONLY hard restriction is that the performance
      gates (M2/M3 vs JPEG XL, WebP, PNG) may never be lifted, bypassed,
      or altered. Mae dispatched `/oc architect` the same hour. The V1
      verdict itself stands recorded permanently as FAIL/STOP under I10's
      no-post-hoc-bar rule; see the S-series checklist below for the
      authorized continuation.

## Prism v2 S-series checklist (source-side-only pivot; owner-authorized
## 2026-08-25T21:53Z)

Program blueprint: `prism/docs/architecture-jxl-parity-sourcepivot.md`;
pre-registration: spec addendum 19 (algorithmic-spec.md section 19),
committed BEFORE any S-measurement. Evidence base: the V1 CSV numbers
(static spine +5.81 pct median quad NET; spatial keyings lose to global
flat tables; HYB ladders lose to ZFFCTRL everywhere). Dual-frame controls
pinned (FRAME-A adaptive replay / FRAME-S static spine); FRAME-S gating;
zero container bytes until an S4 threshold PASS (< 9.35 summed / < 3.117
per-sample projected).

- [x] S-pivot Architect phase (2026-08-25): blueprint + addendum 19 +
      tracker/log updates delivered; reserved slots 18.6 resolved (no V1
      winner; wall-clock per A3 precedent; P_ext frozen; tree features =
      NONE). Handoff {"action":"build"}: Builder slice P1 = S1 predictors.
- [x] S1 predictor families (Builder slice P1; pins P-S1-1..P-S1-11 +
      amendments A4/A4b in decisions/builder/2026-08-25T22-30-00, committed
      BEFORE any measurement): COMPLETE 2026-08-25.
      Machinery: format-unwired causal replay predict.{h,cpp} -
      PredFamily {MED control, GAP reduced classic, W ensemble} per 18.4
      with pinned integer helpers (sym_round_div half-away-from-zero,
      floor_div toward -inf); WEnsemble weights 16.16 init 65536 clamp
      [16384,1048576], /512 gradient updates in pinned W,N,NW,TE order;
      production neighbor derivation bound to compute_residuals(MED)
      byte-for-byte across ALL planes; decoder-mirror step-equality,
      bijection, plane-reset, weight-clamp and BD-scaling unit tests
      (124/124 green).
      AMENDMENT A4 (pre-measurement): 18.4's literal GAP gradient pair is
      algebraically degenerate (dh == dv term-by-term, t80/t32 branches
      unreachable); repaired to the classic CALIC pair dh[1]=|W-WW|,
      dv[2]=|N-NN| - smallest delta restoring the section's own branch
      semantics. AMENDMENT A4b (pre-measurement, bring-up run DISCARDED
      wholesale): the literal "[0,2^BD-1] output clamp" corrupts every
      chroma prediction because YCoCg-R chroma planes legitimately exceed
      the source BD (kodim01 chroma measured in [477,639]); predictions are
      UNCLAMPED in the transformed-plane domain (production parity; MED
      identity is the binding test), TE clamps to [0,2^16-1], reconstruction
      is the exact unclamped add. No number from the clamped bring-up run
      survives (V1 ClusterMap precedent).
      MEASUREMENT (`bench-sandbox --s1`, quad pins verified pre-run; all
      rails green FIRST: VB-anchor-adapt 4/4 bit-for-bit, VB-anchor-ideal
      both frozen walk AND counting path 4/4, net-audit clean incl. frame-A
      zero-side-info schema, rank fixtures live BOTH ways, fidelity within
      +0.50 pct on 12 spine rows, determinism byte-identical re-run):
      **S1 VERDICT: FAIL** per addendum 19.5 - best non-MED family median
      in gating FRAME-S = **-1.45 pct (W)** vs bar >= +1.50; GAP -2.61
      median (min -8.03 max -0.78); W min -5.84 max -0.85: EVERY family
      regresses on EVERY image in the spine frame. FRAME-A beside (never
      gating): GAP -1.68 median (max +0.70), W -0.42 (max +0.27) - nothing
      near the bar in either framing, resolving R-2's zero-economics
      confound honestly: no framing rescues directional predictors under
      the zero-flag-first binarization; MED's exact-zero peak dominates.
      Consequence: MED ships in both frames; bucket B3 closed-with-
      numbers; S2 canary never opens (opens ONLY on an S1 PASS).
      Evidence: benchmarks/results/2026-08-25-sandbox-s1.csv (56 rows).
      Zero container bytes by construction.
- [ ] S2 error-feedback canary: NOT OPENED - its trigger clause requires an
      S1 PASS; S1 FAILED, so the canary is skipped by its own terms (no
      second-strike cost against the bias-feedback budget).
- [x] S3 extended causal properties (attacks B2; pins P-S3-1..P-S3-12 in
      decisions/builder/2026-08-25T23-00-00, committed BEFORE any
      measurement): COMPLETE 2026-08-25. Machinery: incremental causal
      PropHasher over the frozen P_ext list exactly as 19.4 freezes it -
      quotient buckets qW/qN/qNW/qNE via production quant_residual with
      per-image octile edges computed from strictly-past samples
      (prefix-invariant by construction, pinned unit test), gbW/gbN as the
      A4 CALIC gradient pair of the residual stream through the shared
      bias_bucket (bd_shift = bd - 8), raw plane id, e_max_prev per the
      literal 18.4 edge table - mixed by a pinned FNV-1a word mixer into
      k_raw {64, 256} clusters; caps/floors inherited ('SBP1' merge map
      NETTED, decoder mirrors count-based merges); NO spatial maps or trees
      anywhere (tree columns identically zero, schema-guarded). Decode-
      mirror round-trip unit test binds encoder/decoder hash-sequence
      equality (128/128 green).
      MEASUREMENT (`bench-sandbox --s3`, quad pins verified pre-run; rails
      FIRST: VB-anchor-adapt 4/4 bit-for-bit, VB-anchor-ideal frozen walk +
      counting path bit-for-bit, rank fixtures live BOTH ways, fidelity 36
      rows within +0.50 pct, net-audit 72 rows clean incl. zero-tree schema,
      determinism byte-identical re-run): **S3 VERDICT: FAIL** per addendum
      19.5 - best variant median **-8.09 pct** (SX-G k=64) vs bar >= +1.50
      in gating FRAME-S vs the same-stack best-flat-16 baseline measured
      fresh in-run (kodim01 spine B-IDEAL net reproduces the committed V1
      reference 514496 exactly). Every variant regresses on every image:
      SX-G k=64 median -8.09 (min -9.94 max -5.95); SX-FULL k=256 median
      -16.62 (worst per-image -19.40); k=256 table bytes (~40 KB) bury any
      conditioning gain, and even k=64 (~11 KB) never approaches breakeven.
      Mechanism recorded: under I12 NET accounting, extended causal
      property keyings pay more transmitted side info than the conditioning
      they buy at these cluster counts; E0's static-ceiling margins do not
      survive contact with payable tables. Consequence: bucket B2 closed-
      with-numbers; flat-16 keying ships unchanged; S4 composes {adaptive
      control, static spine} x D4c color trials only.
      Evidence: benchmarks/results/2026-08-25-sandbox-s3.csv (92 rows).
      Zero container bytes by construction.
- [x] S4 composition + projection (proceed-to-format threshold): COMPLETE
      2026-08-25. Pins P-S4-1..P-S4-12 committed BEFORE any measurement
      (decisions/builder/2026-08-25T23-45-00-s4-composition-pins.md):
      candidates {ADAPT control, SPINE} x colorrot kCount=7 trials decided
      per image by real NET bytes; winner argmin with conservative
      tie-breaks (ties to ADAPT); relpct_composed vs the TRIAL-FREED
      adaptive control so composed NET is non-regressing vs e1 BY
      CONSTRUCTION; projection via 18.5 VERBATIM against
      2026-08-25-prism-e1.csv; portrait-class handling pinned before
      measurement (quad is all-landscape: portrait inherits the overall
      quad median behind an explicit INHERITED marker, landscape-only
      projection reported beside); stretch KIND flag deferred to the format
      program per its own clause.
      MEASUREMENT (`bench-sandbox --s4`, quad pins verified pre-run; rails
      FIRST: VB-anchor-adapt 4/4 bit-for-bit, VB-anchor-ideal frozen walk +
      counting path bit-for-bit, rank fixtures live BOTH ways, fidelity 28
      spine rows within +0.50 pct, net-audit clean on all rows incl.
      candidate schemas, determinism byte-identical re-run; wall-clock
      26.33x bench-ideal recorded, P-S4-12/A3 precedent): **S4 VERDICT:
      FAIL - stop-and-report** per the verbatim threshold. SPINE won all
      four images but with thin margins over the trial-freed control:
      kodim01 SPINE/rct-rbg +5.4481 pct, kodim05 SPINE/rct-rbg +5.5627,
      kodim13 SPINE/loco +5.9303, kodim20 SPINE/loco +2.9772; landscape
      class median +5.5054 pct (I10). Projected corpus: summed 9.5638 >=
      9.35 AND per-sample 3.1879 >= 3.117 => proceed-to-format threshold
      NOT met. M2 (<9.498/<3.166) and M3 (<8.655/<2.885) context both
      projected FAIL - reported only, never altered (owner standing
      order); final judgment stays bench_gate.sh dual-unit vs real cjxl.
      Honest readings: the trial-freed control itself gains ~1.5 pct from
      color trials (B4 helps both sides, narrowing V1's +5.81 to +5.51);
      kodim20 thins further (+2.98); sandbox controls sit within ~60 B of
      committed e1 bytes (container overhead), validating the instrument
      product form. Decision tree row 1 executed: the spine improvement is
      recorded as available-but-insufficient; S5 trigger clause NOT met
      (projection nowhere near M3 reach), so the reserve stays closed and
      the S-program's measurement phases END here with stop-and-report.
      Evidence: benchmarks/results/2026-08-25-sandbox-s4.csv (104 rows).
      Zero container bytes by construction across the ENTIRE program.
 - [ ] S5 reserve (ONLY if S4 projects inside M3 reach but short): one-shot
       squeeze-with-parent-properties, >= 2.0 median NET or third-strike
       death (L-C7).

## Prism v3 T-series checklist (joint locality-context program; fresh owner
## research dispatch 2026-08-26T06:59Z)

Program blueprint: `prism/docs/architecture-jxl-parity-tseries.md`;
pre-registration: spec addendum 20 (algorithmic-spec.md section 20),
committed BEFORE any T-measurement. Research:
`research-v3-content-clustering.md`. Stacking: the V+S sandbox instrument
was snapshot-imported from PR #145 @ 7600377 onto this branch as a labeled
ordinary commit (linear history rooted at main; #145 stays OPEN untouched
as the standalone evidence chain and closes cleanly once this content
ships). T-BASE control = the S4 composition procedure re-run fresh in-run;
all gates verbatim from research section 3 / addendum 20.5; zero container
bytes until T4 PASS.

- [x] T-pivot Architect phase (2026-08-26): stacking import + blueprint +
      addendum 20 + tracker/log updates delivered. Handoff
      {"action":"build"}: Builder slice Q0 = T0 instrument extension.
- [x] T0 instrument extension (BLOCKING): GroupPartition tiling GS64/GS128,
      per-group counting stacks, integer Lloyd clustering, 'SBC1' codebook
      serializer + assignment words, CEILING mode with decomposition
      columns, shrinkage + 'SBD1', ZZ-HU identity, new rails
      (VB-proto-roundtrip / VB-assign-mirror / net-audit-t) + failable
      --self-check-t0; DIAGNOSTIC smoke CSV on kodim01 only (non-gating).
      DONE 2026-08-26: core bring-up repaired pre-measurement (amendment
      A5), 137/137 tests, all rails + T-rails green, dated smoke CSV
      committed (Lloyd honestly collapses kodim01 to K=1; CEILING
      payload-gain negative vs fresh T-BASE). No T-phase verdict is valid
      without a green T0.
- [ ] T1a ceiling kill test (runs FIRST): per-group exact stacks, tables
      paid realistically; PASS >= +2.00 pct median NET beyond fresh T-BASE;
      FAIL closes C1 unless payload gain >= +4.00 pct median with tables
      the sole losing term (then T1b opens).
- [ ] T1b content-defined codebook (conditional): K in {4,8,16,24} measured
      whole; retain >= half of best T1a payload gain NET AND floor >= +1.00
      pct median NET beyond the same T-BASE.
- [ ] T2a shrunk fine contexting: class16 -> class343 shrinkage, arms
      TW-A/TW-B; PASS >= +0.50 pct median NET vs same-stack class16
      baseline fresh in-run.
- [ ] T2b extended-property static reopening (conditional on T2a): E0 M-C
      poolings ii/iii under static two-pass scoring; PASS >= +1.50 pct
      median NET; second failure closes B2's static branch permanently.
- [ ] T3 joint predictor-tokenization factorial: {MED,GAP,W} x
      {ZFFCTRL,ZZ-HU}; bar (i) best non-MED >= +1.50 median NET under its
      winning tokenization else GAP/W third-and-final strike; bar (ii)
      tokenization main effect both directions. T3b canary once on winner
      (>= +0.50 median, no image worse than -0.25; second strike permanent).
- [ ] T4 composition + projection: per-image winners by real NET bytes x
      color trials; projection 18.5 VERBATIM vs committed e1 CSV; threshold
      UNCHANGED < 9.35 summed / < 3.117 per-sample; M2/M3 reported beside,
      never altered; portrait INHERITED marker inherited from P-S4.
- [ ] T5 reserve (ONLY if T4 projects inside M3 reach but short of it):
      one-shot squeeze-with-parent-properties, >= +2.00 pct median NET or
      third-strike death (L-C7).

## Current step

SLICE Q0 COMPLETE (2026-08-26, Builder): T0 instrument extension DONE -
all rails green + dated diagnostic CSV committed (see agent log and
amendment A5). NEXT: slice Q1 = T1a ceiling kill test per blueprint
section 2 / addendum 20.5 - per-group EXACT static stacks on the QUAD,
tables paid at realistic serialization, T-BASE re-run fresh in-run, gate
>= +2.00 pct median NET beyond T-BASE; FAIL closes C1 unless the recorded
decomposition shows payload gain >= +4.00 pct median with table bytes as
the SOLE losing term (then T1b opens). Honest prior from the smoke: the
pinned chi-square metric collapsed kodim01 to K=1 and CEILING payload-gain
was negative on that image - Q1's quad measurement decides with numbers.
Zero container bytes until a future T4 PASS.

Prior state:

SLICE Q0 IN PROGRESS (2026-08-26, Builder): T0 core landed and
BRING-UP-REPAIRED under the A2/A4b precedent - four defects found by the
new T0 unit suite BEFORE any measurement, each fixed with its regression
test: (1) crc32_combine dropped the running CRC state, so every multi-part
blob ('SBM1'/'SBC1'/'SBD1') carried a CRC over only its final section -
now true incremental chaining; (2) Lloyd's first assignment ran against
UNFILLED zero centroids, letting symmetric ties collapse every K to one
survivor - seed stacks now initialize their prototype slots; (3) the
'SBC1' serializer asserted an impossible prior shape and wrote a stride
field disagreeing with its own pinned layout (P-T0-5: per-proto block =
16 x profile stride, per-row replicated priors) - serializer rebuilt to
the pinned shape; (4) the 'SBD1' decoder mirror indexed parents by a flat
modulo instead of the transmitted parent map (children 16+ silently paired
wrong), and its expect-compare ignored child_delta - both fixed. a_c = 0
is legal per P-T0-8. Unit suite later reconciled to 142/142 (see the
RECONCILED log entry below).
Remaining for Q0: --t0 smoke mode + --t0-synth fixtures in main.cpp,
probe rails VB-proto-roundtrip / VB-assign-mirror / net-audit-t +
failable --self-check-t0, dated diagnostic CSV on kodim01, ledger sweep.

Prior state:

SLICE Q0 OPENED (2026-08-26, Builder): T0 instrument extension in progress.
TWO Builder sessions opened this slice concurrently; pins reconciled BEFORE
any measurement in decisions/builder/2026-08-26T08-05-00-t0-instrument-
pins.md (supersedes exactly the 08-00-00 stack-axis reading back to the
addendum 20.2 verbatim three-index form: class16 INSIDE every group stack,
per-proto stride = 16 x profile stride, joint row ids k*16+c / g*16+c,
KGROUP64/KGROUP128 keyings, 'SBP2' wide merge map; ADOPTS that record's
seeding/drop details, single-state symbol rANS, shrinkage test-limit
reading, 'SBD1'/row-schema/non-gating pins wholesale). Machinery next:
staticmodel T0 core, --t0 smoke mode, tests, probe rails + self-check-t0.

T-SERIES PROGRAM OPENED (2026-08-26): the v3 research located the unmeasured
mechanism - content-defined conditional clustering layered ON TOP OF class16
conditioning, the joint structure every prior experiment replaced or refined
one axis of - and pre-registered the fail-fast T-series against it. The
Architect phase delivered the stacking resolution (V+S instrument imported
from PR #145 @ 7600377 in one labeled commit), the blueprint
(architecture-jxl-parity-tseries.md), and spec addendum 20 with every
constant pinned BEFORE any measurement (group geometry, Lloyd metric/init/
caps, K set, 'SBC1'/'SBD1' serialization, ceiling decomposition, shrinkage
arms, ZZ-HU identity, all gates verbatim). Prior state below:

Prior state:

S4 COMPOSITION MEASURED - FAIL, STOP-AND-REPORT (2026-08-25): the
pre-registered threshold (18.5 verbatim: projected <9.35 summed AND
<3.117 per-sample) rejected the composed program on the pinned quad.
Composition of {adaptive control, static spine} x D4c color trials decided
by real NET bytes put SPINE over ADAPT on all four images (per-image
+5.45/+5.56/+5.93/+2.98 pct vs the trial-freed control; landscape median
+5.51), but the corpus projection lands summed 9.5638 / per-sample 3.1879,
ABOVE both S4 bars. All six VB rails green first (anchors bit-for-bit 4/4;
determinism byte-identical); pins P-S4-1..12 landed BEFORE any measurement;
zero container bytes by construction across the whole V+S program. The
S-program's measurement phases are COMPLETE: buckets B1/B2/B3 closed with
numbers, B4 measured inside composition (+~1.5 pct to both sides), B5
demoted. Per the binding decision tree this is stop-and-report with the
full ledger; the owner/Mae decide any next program (the standing order
makes a future pivot autonomous for Mae, and the gates remain invariant).

Next: handoff {"action":"maintainer"} - Mae routes the stop-and-report to
the owner; no review/test dispatch is warranted on measurement-negative
closure unless Mae directs otherwise; PR #145 stays OPEN with the full
S-series evidence (V0 rails, V1 STOP, S1/S3/S4 verdicts) merge-blocked as
before.

Prior state:

SLICE P3 OPENED (2026-08-25): S4 structural pins P-S4-1..P-S4-12 committed
BEFORE any measurement
(decisions/builder/2026-08-25T23-45-00-s4-composition-pins.md): candidates
{ADAPT control, SPINE} x colorrot kCount=7 trials decided by real NET bytes
per image; winner argmin with conservative tie-breaks; relpct_composed vs
the trial-freed adaptive control (non-regressing vs e1 BY CONSTRUCTION);
projection 18.5 VERBATIM against 2026-08-25-prism-e1.csv with pinned
landscape/portrait class handling (quad is all-landscape; portrait inherits
the overall quad median behind an explicit INHERITED marker, landscape-only
projection reported beside); thresholds <9.35 summed / <3.117 per-sample;
M2/M3 reported beside, never altered; S5 trigger quantified (summed <8.8316
AND per-sample <2.9438 while failing the S4 bar); stretch KIND flag defers
to the format program; zero container bytes.

Prior state:

S3 PROPERTIES MEASURED - FAIL (2026-08-25): the pre-registered gate
(addendum 19.5 S3, FRAME-S primary, same-stack best-flat-16 baseline fresh
in-run) rejected every extended causal property keying on the pinned quad:
best variant median -8.09 pct (SX-G k=64) vs bar >= +1.50; all four
pre-named variants x k_raw {64, 256} regress on ALL FOUR images (worst
per-image -19.40 at SX-FULL k=256). Pins P-S3-1..P-S3-12 landed BEFORE any
measurement (causal octile edges prefix-invariant and unit-tested; A4 CALIC
gradient buckets; literal 18.4 e_max_prev table; pinned FNV-1a mixer);
'SBP1' merge maps NETTED per I12; zero spatial maps/trees by construction.
All six VB rails green on the new row family (anchors bit-for-bit 4/4;
kodim01 spine reproduces the committed V1 reference 514496 exactly);
128/128 unit tests; zero container bytes. Bucket B2 closed-with-numbers.

Next: Builder slice P3 = S4 composition + projection readout against the
committed e1 CSV (threshold < 9.35 summed / < 3.117 per-sample). With S1
and S3 both failed honestly, composition candidates are exactly {adaptive
control, static spine (+5.81 measured)} x D4c color trials, decided per
image by real NET bytes (non-regressing vs e1 BY CONSTRUCTION); projection
via 18.5 VERBATIM with landscape/portrait class medians separate.
Decision tree row 1 is now the live path: midpoint composition ~9.5-9.6
summed > 9.35 => stop-and-report with the full ledger unless measurement
surprises upward; S5 reserve opens ONLY if S4 projects inside M3 reach but
short of it.

Prior state (superseded by the authorization above): V1 GATE READOUT
COMPLETE (2026-08-25): instrument extended and
validated, sweep measured on the pinned quad, verdicts recorded above.
V1b FAILED the pre-registered retention bar => STOP rule fired; bucket B1
closed-with-numbers (~5.8 pct realistic best vs >= 37.30 required
retention). Per the binding decision tree, the OWNER is informed BEFORE
the Architect re-engages for any pivot blueprint (source-side-only pivot
is the default candidate); Mae routes this handoff. No further build
phases are authorized on this program until that decision lands. Zero
format bytes were spent anywhere in the V-series so far.

v1 closure record (2026-08-25): E1's BIAS-fmt gate FAILED by an order of
magnitude (bracket worse by 16-20 points of v0, 4/4 images regressed,
payload +22 to +70 percent) - the zero-flag-first binarization makes
CALIC-style bias cancellation structurally incompatible with this coder.
E4 checkpoint ran fresh and confirms byte-stable outputs and honest dual-
unit gate FAILs. Named decision-tree row executed to its final clause:
**#130 closes honestly at the achieved level.** Final numbers: e1 =
10.1210 summed / 3.3737 per-sample bpp (-8.21 pct bytes from the 11.026
baseline); e3 = e7 = 10.1350 / 3.3783; M2/M3 FAIL both units. Status:
complete - review boundary reached.

D-series closure record (2026-08-24): D4a zero-run REJECTED (+0.28 pct),
D4b extended mixer bank REJECTED (-0.69 vs -0.90), **D4c color rotations
ADOPTED** (22 wins / 2 ties / 0 regressions, -1.65 pct bytes at e1), D4
item 4 condition not met (no adopted mixer). Fresh corpus truth: e1 =
10.1210 summed / 3.3737 per-sample bpp; e3 = e7 = 10.1350 / 3.3783. M2/M3
FAIL in both units; no parity claim.

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

0. **T-series continuation policy (binding for every future run on this
   branch, 2026-08-26):** all T-work happens HERE on PR #146; nothing
   pushes to PR #145 anymore (its tree is fully contained here via the
   labeled snapshot import @ 7600377). Addendum 20 precedes any T-row;
   builder pins land BEFORE each slice's first sweep; dated CSVs one per
   phase; T-BASE re-measured fresh in-run for every comparison; zero
   container bytes until T4 PASS; M2/M3 dual-unit gates invariant.
1. **Slice Q0 (Builder, next):** T0 instrument extension per blueprint
   section 1 - GroupPartition tiling, per-group counting, integer Lloyd,
   'SBC1' + assignment words, CEILING mode with decomposition columns,
   shrinkage + 'SBD1', ZZ-HU identity alias, new rails + failable
   --self-check-t0, DIAGNOSTIC smoke CSV on kodim01 only. Handoff
   continue.
2. Slice Q1: T1a ceiling kill test (+ conditional T1b codebook).
3. Slice Q2: T2a shrunk contexting (+ conditional T2b static reopening).
4. Slice Q3: T3 factorial (+ T3b canary on winner).
5. Slice Q4: T4 composition + projection vs the committed e1 CSV
   (< 9.35 summed / < 3.117 per-sample); T5 reserve only per trigger.

Legacy branch-update policy from the v1 era (superseded in practice by the
stacking note above but kept as hard-won context):

0. **Branch update policy (binding for every future run on this branch):**
   REWRITTEN 2026-08-24 (continuation run 13) after a second topology event.
   Main's history was REWRITTEN server-side at some point after run 12's
   sync: the model-pin commit this branch had merged as fb4c701 exists on
   main as 601caaa (identical tree 9361bfed, different hash), so after a
   full unshallow `git merge-base origin/main HEAD` exits 1 - genuinely
   unrelated NOW, and GitHub reported the PR CONFLICTING. The branch was
   therefore REBUILT per the hard rule: `git checkout -B <branch>
   origin/main`, then all 55 of THIS PROJECT's own commits re-applied one
   by one with `git cherry-pick` (the three old sync merges and their
   old-main side chains dropped; the orphan-rooted researcher commit's
   repo-snapshot noise resolved to origin/main's newer infra files,
   keeping only its real project delta). Content check: rebuilt head vs
   pre-rebuild head differs ONLY in .github/workflows/*.yml +
   opencode.json, where main's newer lab versions win. The earlier
   "shared history" statements in this file and the log below were true
   when written (server-side merge_base f8a958d70e48) and were made false
   by the later rewrite - shallow-clone artifacts caused the FIRST false
   alarm, the main rewrite caused the real severance. Policy now: the
   branch root IS current main, so ordinary `git fetch && git merge
   origin/main` syncs; NEVER `--allow-unrelated-histories`; if merge-base
   fails again on a future run, first `git fetch --unshallow`, and if it
   STILL fails, repeat this rebuild procedure instead of joining
   unrelated histories. The hard-rule orphan check still re-runs
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
3. [DONE 2026-08-25] Architect blueprinted the E-series from
   `prism/docs/research-e-series-endgame.md` ->
   `prism/docs/architecture-jxl-parity-eseries.md`: measurement-first per
   I7/I8/I9 - E0 harness modes (--orinit, --props, --bias scoring) +
   OA-order/OA-corrupt/PC-mono/MC-viability gates BEFORE any format work;
   only gate-passing interventions (E1 bias cancellation, E2 frozen tables
   behind the FEATURE_EXT ext registry with ext2/ext3 and reserved-dead
   ext0/ext1, E3 conditional MANIAC) become build phases; binding decision
   tree back to the owner point (blueprint section 7).
4. [DONE 2026-08-25] Builder executed E0 exactly as sliced in blueprint
   section 6: spec addendum 14 first (every constant pre-registered), then
   harness modes + rails + fail-capable self-checks + dated reference CSVs,
   then the M-A/M-B/M-C readout on kodim01/13/05/20 with A/B/C shares
   written into this tracker's E-series checklist and the decision-tree row
   NAMED. No intervention or format byte was spent before that readout.
5. [DONE 2026-08-25] Builder executed E1 offline validation ONLY: BiasModel
    per addendum 14.3's pinned constants plus addendum 16's pre-registered
    mechanism-(b) constants, `--bias` harness mode, BIAS-anchor held,
    BIAS-fmt gate FAILED by an order of magnitude on the pinned quad ->
    recorded the negative and handed #130 to honest closure with the full
    ledger (tree row 1, final clause). E4 checkpoint ran in the same slice:
    fresh dual-unit corpus measure byte-identical to D4c-era CSVs; M2/M3
    honestly FAIL both units; review boundary reached. PROJECT COMPLETE.
6. [DONE 2026-08-25] V-series ran V0 (rails green) and V1 (STOP fired);
    owner pivot authorization landed 21:53:15Z; Architect delivered the
    S-series blueprint + addendum 19 (see S-series checklist above).
7. [PARTIAL 2026-08-25] Builder slice P1 = S1 predictors: DONE - pins +
      amendments A4/A4b committed pre-measurement; GAP/W replay + tests;
      `bench-sandbox --s1` dual-frame sweep; all six VB rails green; dated
      s1 CSV; verdict FAIL recorded (MED ships, B3 closed-with-numbers).
      Slice P2 = S3 properties: DONE the same day (S2 skipped by its own
      trigger clause) - pins P-S3-1..12 committed pre-measurement, causal
      PropHasher + tests, `bench-sandbox --s3` sweep, all six VB rails
      green, dated s3 CSV, verdict FAIL recorded (flat-16 ships, B2
      closed-with-numbers).
      REMAINING: P3 = S4 composition + projection. Zero container bytes
      until an
      S4 threshold PASS.

## Agent log

- 2026-08-26 the Builder (T-series slice Q0, RECONCILED + COMPLETE): a
  second continuation session landed amendment A-T0-1 (f2c2eae) while
  this one was finishing the same repairs; branches rebased and merged
  without losing either side. Adopted from A-T0-1: the single image-
  global 'SBC1' prior layout (A-T0-1d supersedes this record's per-row
  reading - addendum verbatim wins), the FULL-block Lloyd metric
  (A-T0-1b: class-blind distances would have silently demoted the joint
  mechanism), and the symbol-rANS tail-order repair (A-T0-1e; this
  session's word fixtures were too small to trigger renormalization and
  missed it). Retained from this record: the global crc32_combine chaining
  fix (subsumes A-T0-1f), the child_delta expect surface, a_c = 0, and
  five additional tests. Reconciled state: 142/142 tests; t0 CSV
  regenerated post-reconciliation - CB1 tables = 3008 B vs SPINE's
  3007 B (CB1 IS the spine, measured twice); all rails green;
  --self-check-t0 PASS with updated frame numbers.
- 2026-08-26 the Builder (T-series slice Q0, COMPLETE): T0 instrument
  extension finished on PR #146; T0 exit condition MET - all rails green
  + dated diagnostic CSV committed, T1a may run. (1) Core bring-up under
  the A2/A4b precedent: FOUR defects found by the new unit suite and
  fixed BEFORE any measurement, recorded as amendment A5
  (decisions/builder/2026-08-26T10-40-00-t0-bringup-amendment-a5.md):
  crc32_combine dropped its running state so multi-part blob CRCs covered
  only the final section; Lloyd's first assignment ran against unfilled
  zero centroids collapsing every K to one survivor; the 'SBC1' serializer
  disagreed with its own pinned layout (impossible prior-shape assert,
  wrong stride field); the 'SBD1' decoder mirror indexed parents by flat
  modulo and its expect-compare ignored child_delta. a_c = 0 legalized per
  P-T0-8. 137/137 unit tests (9 new: group geometry hand-checked,
  collapse/separation/determinism, 'SBP2'/'SBC1'/'SBD1' round-trips +
  hard-detect, word-driven decode-mirror payload round-trip). (2) CLI:
  `bench-sandbox --t0` (kodim01-only refusal per P-T0-10) emits anchors +
  fresh T-BASE replay + CEIL/CB/CBRAND rows with mechanical NET
  decomposition ('SBC1' words-tail out-param), plus `--t0-synth homo|skew`
  deterministic fixtures outside anchor coverage. (3) Probe rails:
  VB-proto-roundtrip / VB-zzhu-identity / VB-assign-mirror /
  VB-net-audit-t / fidelity-t + NON-GATING decomposition readout;
  failable --self-check-t0 proves every rail's FAIL path AND both live
  rank directions (homo collapses to transmitted K=1 at 12 assign bytes;
  skew beats its random twin). (4) Dated CSV
  `2026-08-26-sandbox-t0.csv` (kodim01, sha pin verified pre-run,
  byte-identical re-run): honest smoke readings - Lloyd collapses kodim01
  to K=1 at every pinned K under the chi-square metric (CB1 payload ==
  SPINE exactly: cross-instrument agreement), CEILING payload-gain is
  NEGATIVE (-0.41/-0.76 pct vs fresh T-BASE) with tables 248/62 KB NETTED.
  Zero container bytes throughout.
- 2026-08-26 the Builder (T-series slice Q0, IN PROGRESS): T0 instrument
  extension started on PR #146. Structural pins P-T0-1..P-T0-11 committed
  BEFORE any machinery output or measurement
  (decisions/builder/2026-08-26T08-00-00-t0-instrument-pins.md): group
  stacks as SandboxModel rows via explicit maps, Lloyd flattening/init/
  drop details, prototype estimation = build_tables_enforced verbatim,
  'SBC1'/'SBD1' layouts, assignment symbol-rANS (L = 2^23, M = 4096),
  CEILING serialization, shrinkage integer form + test-limit reading,
  diagnostic scope (kodim01 only) + row schemas + synthetic-fixture
  policy, non-gating boundary. Implementation milestones follow.
- 2026-08-26 the Architect (T-series pivot phase): executed the v3
  research handoff on PR #146. (1) Stacking resolution: PR #145's branch
  is orphan-rooted, so instead of an unrelated-histories merge that would
  leave two unmergeable roots, imported the full V+S tree state from
  opencode/issue130-20260825153143 @ 7600377 as ONE labeled snapshot
  commit (provenance in its message; differences kept: decision.json,
  docs/index.md, the v3 research doc). Linear history rooted at main;
  #145 stays OPEN untouched and closes cleanly once this content ships.
  (2) Blueprint `architecture-jxl-parity-tseries.md`: T0 blocking
  instrument extension (GroupPartition GS64/GS128 tiling, per-group
  counting stacks, integer Lloyd clustering with farthest-point seeding,
  'SBC1' codebook serializer + assignment words, CEILING mode with
  mandatory decomposition columns, shrinkage + 'SBD1', ZZ-HU = HYB_C
  identity), new failable rails + --self-check-t0, phases T1a/T1b/T2a/
  T2b/T3+T3b/T4/T5 with the research gates verbatim, module map with zero
  container edits until T4 PASS, test matrix, risk register, slicing
  Q0-Q4, binding decision tree, honest projections. (3) Spec addendum 20
  (section 20) committed BEFORE any T-measurement: every constant slot
  pinned - T-BASE fresh-in-run rule, Lloyd metric/init/caps/drop rules,
  K set {4,8,16,24} measured whole, serialization shapes, a_c arms
  TW-A/TW-B, canary mechanism inheriting 14.3, CSV naming, reserved
  slots. (4) Tracker: T-series checklist opened, current step advanced to
  Builder slice Q0, next steps rewritten for this branch, agent log entry.
  Handoff {"action":"build"}.

- 2026-08-25 the Builder (S4 composition slice, S-series P3): executed the
  program's final measurement slice to its threshold readout. (1) Pins
  P-S4-1..P-S4-12 committed BEFORE any measurement - candidates {ADAPT,
  SPINE} x colorrot kCount=7, winner argmin by real NET bytes with
  conservative tie-breaks (ties to ADAPT), control = trial-freed adaptive
  control (non-regression vs e1 BY CONSTRUCTION), projection 18.5 verbatim,
  portrait-inheritance handling pinned before measurement (quad is
  all-landscape; landscape-only projection reported beside), S5 trigger
  quantified (summed <8.8316 AND per-sample <2.9438 while failing the S4
  bar), stretch KIND flag deferred per its own clause. (2) Machinery:
  `bench-sandbox --s4` composition driver (anchors first under plain
  YCoCgR - trial ycocgr reproduces B-ADAPT bit-for-bit - then ADAPT/SPINE
  rows for every color trial with all side info NETTED); probe_sandbox --s4
  rails + composition readout + class-median projection vs the committed
  e1 CSV + failable `--self-check-s4` proving both verdict directions and
  six mutation classes. All five self-checks green; 128/128 unit tests.
  (3) MEASURED VERDICT: S4 FAIL - stop-and-report. SPINE won all four
  images (+5.45/+5.56/+5.93/+2.98 pct vs trial-freed controls; landscape
  median +5.51), projected corpus summed 9.5638 / per-sample 3.1879 >=
  9.35/3.117 thresholds; M2/M3 context projected FAIL (reported only).
  Honest readings recorded beside the verdict: color trials help both
  sides ~1.5 pct (B4 measured inside composition), kodim20 thins to
  +2.98, sandbox controls within ~60 B of committed e1 bytes. Rails green
  first (anchors 4/4 bit-for-bit, determinism byte-identical); quad pins
  verified pre-run; wall-clock 26.33x logged per A3 precedent; zero
  container bytes across the ENTIRE V+S program. Decision tree row 1
  executed to stop-and-report; S5 trigger NOT met, reserve stays closed.
  Handoff {"action":"maintainer"}: Mae routes the closure to the owner.

- 2026-08-25 the Builder (S3 property slice, S-series P2): executed slice
  P2 to its gate readout. (1) Pins P-S3-1..P-S3-12 committed BEFORE any
  measurement - causal octile edges defined exactly (cum*8 >= total*k,
  deduped, bucket = #{deduped edges <= v}, strictly-past histograms,
  prefix-invariant by construction), gbW/gbN as the A4 CALIC gradient pair
  on the residual stream via the shared bias_bucket, raw plane id, e_max_prev
  per the literal 18.4 edge table, FNV-1a word mixer with disabled
  coordinates skipped entirely, pre-named variants SX-FULL/SX-Q/SX-G/SX-E x
  k_raw {64, 256}. (2) Machinery: incremental PropHasher in staticmodel
  (decoder-mirror by construction - a fresh hasher over decoded history
  reproduces the encoder's cluster sequence; pinned round-trip test through
  'SBP1'), KPROP ClusterMap kind, `bench-sandbox --s3` sweep + baseline
  re-measured fresh in-run; 4 new test groups, 128/128 green. (3)
  MEASURED VERDICT: S3 FAIL - best median -8.09 pct (SX-G k=64) vs >=
  +1.50 bar in gating FRAME-S; every variant regresses on every image;
  NETTED table bytes dominate the conditioning gain at every cluster count.
  B2 closed-with-numbers; flat-16 ships unchanged; S2 stays closed; S4
  composition candidates are {adaptive control, static spine} x D4c
  trials. All six VB rails green first; determinism byte-identical; quad
  pins verified pre-run; kodim01 baseline cross-check = committed V1
  reference exactly. Zero container bytes. Handoff {"action":"continue"}:
  slice P3 = S4 composition + projection.

- 2026-08-25 the Builder (S1 predictor slice, S-series P1): executed slice
  P1 to its gate readout. (1) Pins P-S1-1..P-S1-11 + amendment A4 committed
  BEFORE any measurement - including the find that addendum 18.4's literal
  GAP gradient pair is algebraically degenerate (dh == dv term-by-term;
  t80/t32 provably dead branches), repaired by minimal delta to the classic
  CALIC pair with production replicated-edge WW/NN. (2) Format-unwired
  replay in predict.{h,cpp} + 5 new test groups (124/124): MED byte-identity
  vs production, pinned GAP vectors across all five threshold branches +
  BD-scaling pair, W decoder-mirror step equality, weight clamps, bijection
  on degenerate shapes and offset domains. (3) Bring-up integrity: the first
  quad run was DISCARDED wholesale when cross-checks showed MED's FRAME-A
  payload 2.65x off its own anchor - root cause was 18.4's literal
  "[0,2^BD-1] output clamp" firing on every YCoCg-R chroma sample (measured
  chroma domain [477,639] at BD8); amendment A4b pins unclamped predictions
  (production parity), TE bounded by uint16 storage; no number from that run
  survives. After the fix, MED FRAME-A = committed e1-era bytes bit-for-bit
  and the spine B-IDEAL net reproduces the V1 reference exactly (514496 on
  kodim01). (4) `bench-sandbox --s1` dual-frame sweep + probe rails
  (fidelity/net-audit incl. frame-A zero-side-info schema/S-gate readout)
  + failable --self-check-s1 (verdict proven reachable BOTH ways).
  (5) MEASURED VERDICT: S1 FAIL - best non-MED median -1.45 pct (W) vs
  >= +1.50 bar in gating FRAME-S; all families regress everywhere there;
  R-2's zero-economics confound resolved honestly: no framing rescues
  directional predictors under zero-flag-first binarization. B3 closed-
  with-numbers; S2 never opens; MED ships both frames. Zero container
  bytes. Handoff {"action":"continue"}: slice P2 = S3 extended causal
  properties.

- 2026-08-25 the Architect (S-series pivot): owner authorization received
  via Mae's `/oc architect` dispatch after the V1 STOP. Delivered the pivot
  program in three modular commits: (1) spec addendum 19 FIRST (section 19:
  reserved-slot resolution - no V1 winner exists; FRAME-A/FRAME-S controls;
  dual-frame contract with FRAME-S gating; frozen P_ext property list with
  tree features = NONE; every S-gate; CSV naming) so no S-row may precede
  its pins; (2) the S-series blueprint
  (`prism/docs/architecture-jxl-parity-sourcepivot.md`) turning V1's three
  durable numbers into design constraints: the static spine (+5.81 pct
  median quad NET) is a first-class composition candidate under fresh
  controls, transmitted spatial structure stays closed (KTREE/KGRID lost to
  global flat tables), tokenization stays ZFFCTRL (HYB ladders lost
  everywhere), and phases S1 predictors / S2 canary / S3 causal properties /
  S4 composition-threshold / S5 reserve reuse the validated instrument with
  zero container edits by construction; (3) this tracker + ideas writeup +
  handoff {"action":"build"} for Builder slice P1. Honest arithmetic kept:
  M2 expected, M3 unlikely without near-edge outcomes or S5; gates remain
  the single invariant per the owner's standing order.

- 2026-08-25 the Builder (V1 measurement slice): executed slice 2 to its
  gate readout. (1) Pins V-P1..V-P8 committed BEFORE any measurement
  (grid geometry, context-tree definition, SBT1/SBP1 blob formats, oracle
  cost model, NETTing rules, gate reading, wall-clock accounting). (2)
  Machinery: ClusterMap, KGRID128, KTREE context partition (86 leaves on
  kodim01 - real splits), oracle assignment with fixed-point LUTs and
  signature memoization; seven new unit tests (118/118 green). (3) CLI
  `--v1` sweep + probe rails/gates + `--self-check-v1`; both self-checks
  PASS. (4) Harness integrity: the first quad run was DISCARDED when
  cross-checks showed every keying producing byte-identical payloads -
  root cause was an unset ClusterMap width making all samples resolve as
  position (0,0); fixed and re-measured from scratch (same discipline as
  the V0 TOKEN-spill find: anchors alone could not catch it because they
  bypass ClusterMap). Also fixed a latent V0-era inconsistency by making
  budget merges decoder-visible through the transmitted SBP1 map. (5)
  MEASURED VERDICT: V1a PASS / V1b FAIL => overall V1 FAIL, STOP rule
  fired; best realistic config ZFFCTRL x KFLAT16 at +5.81 pct median NET
  with everything payable included. Zero container bytes. Handoff
  {"action":"maintainer"}: owner informs the pivot decision before any
  Architect re-engagement.

- 2026-08-25 the Builder (V0 completion slice): landed the sandbox spine to
  its exit condition. (1) Engine integrity first: wiring the fidelity
  discipline exposed that build_tables' TOKEN block wrote past the ZFFCTRL
  stride, corrupting every cluster boundary's ZERO_FLAG entry with the
  value 4096 (round-trips green only because both sides shared the damage)
  - fixed with regression test ZffctrlTokenBlockNeverSpillsIntoNeighborBins;
  and table_ideal_bits now carries RAWBITS literal cost so B-IDEAL bounds
  its real siblings (amendment A2, both BEFORE any measurement; kodim05
  spread tightened from +12.7 pct apparent to +0.03 pct actual). Also fixed
  a control-row ptsv0 unsigned-subtraction underflow (printed -3.1e15 on
  any image where v2 beats v0) and aligned its sign to the worse-is-positive
  convention of every other row. (2) `benchmarks/probe_sandbox.sh`: six VB
  rails + fail-capable self-check (every rail's FAIL path demonstrated on
  mutated fixtures; rank proven LIVE both ways - clustered beats pooled on
  a two-half skew fixture, pooled beats clustering on a constant image,
  after discovering iid noise is NOT homogeneous in the context-information
  sense and picking fixtures accordingly); uncovered-image coverage guard.
  (3) Reference measurement on the pinned quad, pins verified pre-run:
  SANDBOX GATE PASS - anchors bit-for-bit 4/4 on BOTH the frozen walk and
  the sandbox counting path, fidelity +0.02..+0.03 pct worst across 72
  real-backend rows, net-audit clean 112 rows, injections all hard-detect,
  determinism byte-exact. Dated CSV committed. Wall-clock deviation recorded
  honestly as amendment A3. Control truth: B-ADAPT quad net = 2272270 ==
  committed e1-era bytes (VB-anchor-adapt). 111/111 unit tests. Zero
  container bytes. Handoff {"action":"continue"} for the V1 measurement
  slice.

- 2026-08-25 the Architect (V-series blueprint): delivered
  `prism/docs/architecture-jxl-parity-vseries.md` turning the clean-slate
  research spec into a gated build program. Key architectural decisions:
  (1) V0 is a NEW instrument - `prism bench-sandbox` with format-unwired
  tokenize/staticmodel modules - so bench-ideal stays frozen as the v1-era
  reference (its CSVs become bit-for-bit anchors VB-anchor-adapt /
  VB-anchor-ideal); (2) six pre-registered VB rails with coder-fidelity
  bound (+0.50 pct vs B-IDEAL), independent double-count side-info audit,
  corrupt-injection failability, and both-direction ranking fixtures; (3)
  gate reading pinned before any measurement: RELPCT per-image medians as
  PRIMARY (I10), NET always payload+tables+maps+trees (I12), oracle-map
  map-freebies visible in a dedicated column but never shipped arithmetic;
  (4) tokenization ladders ESC-A/B/C pinned with zigzag fold + first-class
  ZERO token (L-C5); (5) V2 predictor mathematics fixed integer-exact
  (reduced GAP, W ensemble with normalized weights + gradient update /512)
  so no constant can drift after data is seen; (6) V4 projection formula
  against the committed e1 CSV with thresholds < 9.35 summed / < 3.117
  per-sample; (7) reserved-slot amendment rule for post-V1 constants; (8)
  module map contains zero container edits by construction until a V4 PASS.
  Spec addendum 17 landed as algorithmic-spec.md section 18 (numbering note
  recorded there). Handoff {"action":"build"}: Builder slice 1 = V0 spine,
  all rails green + dated reference CSVs before any scoring.

- 2026-08-25 Dr. Mob (the Researcher, v2 clean-slate mandate): delivered
  `prism/docs/research-v2-clean-slate.md` answering the owner's question -
  the gap to JXL decomposes into five buckets with committed provenance
  (collection layer 6.30 pct gross via measured real-vs-static spread;
  per-image conditioning margins +1.86..+2.95 points of v0 from the E0 CSVs,
  invalidated in v1 only by pooled joint scoring; predictor headroom
  literature-bounded but poisoned by zero-flag economics in every v1 probe;
  trial-selection and tokenization refinements precedent-sized), summing
  past the M3 requirement only at optimistic edges - hence an honest base
  case of M2 PASS with M3 contingent. Consolidated both codecs' ledgers
  into L-C1..L-C9 hard constraints, R-1..R-4 reopenings with written
  confound arguments (forward-adaptive CLUSTERED static coding; weighted-
  ensemble/GAP prediction families distinct from rejected NLMS; bias
  canary under symmetric tokenization; per-image-scored context trees),
  and pre-registered the V-series offline program with binding gates and
  a proceed threshold of < 9.35 summed projected before any format byte.
  New invariants I10/I11/I12. Decision {"action":"architect"}.

- 2026-08-25 the Builder (E1 + E4 closing slice): executed the E-series to
  its end. (1) Spec addendum 16 committed BEFORE any measurement:
  mechanism-(b) gain constants (G[64] 16.16 init unity, clamp [32768,
  131072], LR_SHIFT 9, ENERGY_SHIFT 4, sym-round-away-from-zero, pinned
  update order b->G) and the gate's single reading (decision bracket =
  ctx343-fine in the baseline reference frame). (2) BiasModel library
  (predict.{h,cpp}) with bucket fn single-sourced into build_props' e0_bucket
  (F4 lesson); 11 unit tests including exact pinned-arithmetic checks of
  both update laws - the feedback fixed point (b converges where err drops
  below one quantum), BD8/BD16 clamps, zero-mean bounded cycle; suite green
  98/98. (3) `--bias` harness mode + BIAS-anchor rail gate + BIAS-fmt
  decision gate + fail-capable self-check (determinism on pinned kodim05,
  live anchor byte-equality, corrections-prove-they-fire on a constructed
  stream, both verdicts + anchor bite from CSV fixtures); all six rails'
  self-checks PASS. (4) MEASURED VERDICT: BIAS-fmt FAIL for both candidates,
  4/4 images regressed (add: bracket worse by 19.85 points / payload +70.2
  pct; addgain: worse by 16.33 / +21.7 pct); anchor held byte-for-byte.
  Zero format bytes. (5) E4 checkpoint: fresh corpus measure at e1/e3/e7,
  pins verified pre-measurement, CSVs BYTE-IDENTICAL to D4c era; bench_gate
  both units FAIL as recorded above. (6) Closure ledger written (status
  header, current step, ideas addendum, README, decision record). Status
  complete; handoff {"action":"review"}.

- 2026-08-25 the Builder (E1 slice, in flight): spec addendum 16 committed
  BEFORE any measurement (mechanism-(b) gain constants: G[64] 16.16 init
  unity, clamp [32768,131072], LR_SHIFT 9, ENERGY_SHIFT 4, sym-round-away-
  from-zero chain, pinned update order b->G; gate interpretation pinned:
  decision bracket = fine_ctx343, BIAS-anchor = med@biasoff byte-equality,
  adoption preference add -> addgain). BiasModel library landed in predict.
  {h,cpp} (bucket fn single-sourced with build_props' e0_bucket per the F4
  lesson) + 11 unit tests incl. exact pinned-arithmetic checks of both
  update laws (feedback fixed point, BD8/BD16 clamps, zero-mean bounded
  cycle); suite green 98/98. Harness --bias mode next.

- 2026-08-25 the Builder (E0 measurement slice): executed blueprint section
  6 slice 1 in binding order. (1) Spec addendum 14 committed BEFORE any
  measurement: orinit init law (class16-pooled ML optimum, round+clamp,
  empty slots keep priors, both ctx and cls states at the CLASS optimum =
  exactly the E2-step-1 knowledge shape), props property vector q/gb/pl
  with pre-registered borders, three poolings with modulo hashes and the
  64-count floor, every gate constant, share definitions. (2) Harness:
  `bench-ideal --orinit / --orinit-corrupt / --props i,ii,iii` + ORINIT/
  PROP row families; shared production-replay helpers deduplicated once for
  E0/D2/D4. OA-corrupt injection GENERALIZED from the blueprint's
  "inverted sign" to all-four-kind anti-optimum+frozen: sign-only measured
  ~0.02 points of v0 (near-even skew) and could never trip the 0.05-point
  gate - a self-check that cannot fire is dead code; recorded as a STRICTER
  deviation in spec 14.1 + decision record. Self-checks run on REAL pinned
  kodim05 after discovering degenerate synthetic ramps invert the ordering
  (bimodal classes make tuned priors beat class optima there - recorded).
  (3) Measured quad readout committed; verdicts and named tree row in the
  E-series checklist above; zero format bytes spent. Handoff
  {"action":"continue"} - next slice E1 offline validation only.

- 2026-08-25 the Architect (E-series blueprint): delivered
  `prism/docs/architecture-jxl-parity-eseries.md` per tracker next-step
  item 3, turning Dr. Mob's research spec into a gated build program.
  Key architectural decisions: (1) E0 measurement spine is BLOCKING -
  spec addendum 14 pre-registers every constant before any measurement,
  and the M-A/M-B/M-C readout with named decision-tree row precedes all
  intervention work; (2) resolved the research text's "both probe images"
  ambiguity to the two anchors kodim01+kodim13 (kodim05/20 report and bind
  later via strict-win-only adoption); (3) FEATURE_EXT byte wired ONCE by
  the first adopting phase, with a binding ext registry: ext0/ext1 are
  RESERVED-DEAD forever (D1/D2 rejections), ext2 FROZEN_TABLES, ext3
  REGION_TABLES; (4) E2 step 1 is DOA-by-arithmetic unless A > 1.5 points
  of v0 - checked BEFORE any blob format design; (5) E3 inherits the C2b
  composite inside each leaf and adopts strict-win-only with the model-
  byte cap applied at ADOPTION time (I9); (6) added OA tolerance = the
  G-repro constant (one tolerance governs all rails). Builder slicing in
  blueprint section 6: one measurement slice, then one gate-passing
  intervention per slice, E4 checkpoint + review boundary last. Handoff
  {"action":"build"}.

- 2026-08-25 Dr. Mob (the Researcher, endgame mandate): owner resolved the
  decision point into MANIAC-grade research; delivered
  `prism/docs/research-e-series-endgame.md`. Core results: (1) binarization
  overhead bounded at 0.38 points of v0 (value vs fine static rows) - not
  the bottleneck; (2) the real-vs-class16 collection gap is exactly 5.95
  points of v0 = 6.30 percent of current real bytes, and decomposes by
  construction into A learning + B tracking on a FIXED stream, with C
  (conditioning dimensions beyond resdiff-343 via previously-coded residual
  quotients) genuinely unmeasured - C2/C2b never tested those coordinates;
  (3) pre-registered gates M-A/M-B/M-C with a MANIAC viability bar ABOVE the
  known 1.13-point static-refinement ceiling; (4) intervention specs E1
  (per-context bias cancellation - distinct from rejected per-sample NLMS:
  sigma^2/n(ctx) vs lambda*sigma^2/2 estimator variance), E2 frozen-table
  forward adaptation (attacks A only; hard cap A+B <= 6.30 percent), E3
  conditional tree (strict-win-only, model bytes < 50 percent of gain);
  (5) honest base case: stack lands ~9.3-9.7 summed, M2 plausible, M3 out
  of reach unless measurements surprise. Synced branch with origin/main
  first per item 0 (unshallowed, merge-base 5bc4b9d verified, ordinary
  merge of 9cebba3..c4c3f5f). Corrected the D4 bullet's total-progress
  arithmetic (-9.1 -> -8.21 pct, derivation stamped). Decision
  {"action":"architect"}.

- 2026-08-24 the Builder (continuation run 14, D4c complete - D-series
  closed): synced with origin/main first (unshallowed; merge-base re-verified
  after a shallow-clone exit 1 artifact; ordinary merge of the two lab
  commits). Spec addendum 13 written BEFORE any measurement: rotation family
  (six butterfly role assignments + loco), scoring contract, gates
  pre-registered. Library + rail landed: colorrot:: apply/invert with dense
  stratified bijection tests, bench-ideal --color (med@<mode> rows,
  med@ycocgr anchor rows), CR-anchor/CR-fmt evaluation, four-way COLOR
  self-check; default rows byte-stable vs the committed reference.
  OFFLINE VERDICT: CR-fmt PASS for five candidates (loco best at -4.36 pct
  aggregate v2), bgr FAIL excluded; independent cross-check confirmed 4/4
  directions. FORMAT ADOPTION: ids 7..11, CFL-excluded, unknown-id hard
  error, plane_bd_max windows, force_color probe hook, end-to-end forced
  round-trip + header-id tests. Two measured wiring iterations: single-list
  trial regressed kodim18 +0.25 pct twice (metric defect, not finalist
  structure) -> stage 2 moved to end of analyze() under the anchor's decided
  predictor vs production-flat cost, strict-win-only. FINAL: 22 wins / 2 ties
  / ZERO regressions at e1/e3/e7; e1 = 10.1210 summed / 3.3737 per-sample
  (-1.65 pct bytes), e3 = e7 = 10.1350 / 3.3783 (-1.47); wall-clock e3
  kodim01 8.16 s vs 6.14 s pre-C5 baseline (inside the 5x guard). 87/87
  gtests, fuzz clean, all three rails' self-checks PASS, M2/M3 honestly FAIL
  both units. D-series exhausted; owner decision point surfaced per the
  re-scope endgame clause. Decision record 2026-08-24T21-45-00.

- 2026-08-24 the Builder (continuation run 13, D4a complete): rebuilt the
  branch onto rewritten main (see item 0; PR MERGEABLE again). Then D4a
  zero-run: built `bench-ideal --zrun` (causal JPEG-LS-style run-mode scorer,
  static bracket + adaptive RunFreq estimate over the production MED stream)
  and the ZRUN rail (CSV, pre-registered ZR-fmt eligibility gate, hard
  ZR-anchor replica gate, three-way self-check). Two harness bugs found and
  fixed BY the anchor discipline before any verdict was trusted: folded-zero
  bins adapted with an inverted bit value (anchor showed -5.9 pct drift;
  after the fix the replica matches the mixer anchor to 4 decimals), and the
  evaluator dropped IDEALTOTAL/ZRUNTOTAL rows via prefix filters. Measured
  rejection: +0.28 pct aggregate, 4/4 images worse, static ceiling -0.24 pct
  vs the billed 1-3; STOP rule fired, zero format bytes. 80/80 gtests.
  Decision {"action":"continue"} for D4b/D4c.

- 2026-08-24 the Builder (continuation run 13, D4b complete): K=6 extended
  mixer bank + second SSE stages implemented as harness-only presets;
  mix4 regression bit-identical after refactor (mx -0.5361 kodim01).
  MEASURED REJECTION: -0.69 pct aggregate best (mix6 family) vs D2-best
  -0.90 - the two extra estimators hurt; SSE stacking harmful everywhere
  (kodim01 +34.7/+36.2/+30.3 pct by stage variant). Pre-registered >= 3 pct
  gate fails by 4.3x; zero format bytes; 80/80 gtests. D4c (color
  rotations) queued next; decision {"action":"continue"}.

- 2026-08-24 the Builder (continuation run 13, branch rebuild + D4 start):
  found the PR CONFLICTING; diagnosed with a FULL clone (after
  `git fetch --unshallow`): main's history was rewritten server-side after
  run 12 (fb4c701 = 601caaa by tree), so branch and main were genuinely
  unrelated and plain merge refused. REBUILT the branch per the hard rule:
  checkout -B on origin/main, cherry-picked all 55 project commits in order,
  resolved the orphan-root commit's 28 both-added conflicts to origin/main's
  newer infra (kept the researcher's bench_gate.sh delta), dropped 3 sync
  merges + old-main sides. Verified: rebuilt head vs old head differs ONLY
  in workflows/opencode.json where main is newer; all project content
  byte-identical. Pushed --force-with-lease. Tracker item 0 rewritten with
  the true event chain. D4 stack starts next per Mae's dispatch.

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
