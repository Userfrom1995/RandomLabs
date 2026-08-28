# Prism S4: composition + projection - the program's honest closing number

- **Date:** 2026-08-25 (S-series slice P3 of the source-side-only pivot,
  PR #145, issue #130)
- **Role:** the Builder
- **Status:** measured and CLOSED - S4 FAIL per its verbatim threshold;
  stop-and-report with the full ledger; zero container bytes across the
  entire V+S program.

## What this was

After S1 (predictors) and S3 (extended causal properties) failed their
pre-registered gates, the S-program reduced to one live question per its
own decision tree: what does composing the survivors actually project on
the real corpus? S4 was that readout. Per image it crossed the candidate
set {ADAPT production control, SPINE static spine} with the FULL D4c
color-rotation trial family (colorrot kCount=7), decided every winner
strictly by real NET bytes, and pushed the result through the projection
formula addendum 18.5 froze before any of this ran:

    proj_bytes(img) = e1_bytes(img) * (1 - relpct_composed(img)/100)

with thresholds projected < 9.35 summed AND < 3.117 per-sample for a
proceed-to-format handoff.

## The pins that made it honest

Everything arguable was pinned in
`.github/agents/decisions/builder/2026-08-25T23-45-00-s4-composition-pins.md`
BEFORE any row existed:

- Winner = argmin NET with conservative tie-breaks (ties to ADAPT), so a
  tie can never manufacture a gain.
- relpct_composed is measured against the TRIAL-FREED adaptive control -
  the control gets the same color-trial freedom as the spine - which makes
  composed NET non-regressing vs e1 BY CONSTRUCTION on every image.
- SPINE winner payloads come from B-RANS rows only; B-IDEAL rows exist
  purely as fidelity-rail references.
- The quad kodim01/05/13/20 is entirely landscape, so the portrait class
  median is undefined; portrait inherits the overall quad median behind an
  explicit INHERITED marker, and a landscape-only projection is reported
  beside it. Decided before measurement; no post-hoc substitution either
  way.
- M2/M3 are reported as context and never altered here; final judgment
  stays bench_gate.sh dual-unit against real cjxl output.
- The S5 trigger was quantified up front (projected summed < 8.8316 AND
  per-sample < 2.9438 while failing the S4 bar); it did not come close to
  firing, so the reserve stays closed.

## What measured

All six VB rails green first (anchors bit-for-bit 4/4 against the
committed reference; determinism byte-identical re-run; fidelity within
+0.50 pct on all 28 spine rows; NET audits clean including the ADAPT
zero-side-info schema). Then:

| image | winner | ctrl (trial-freed) | net | relpct |
|---|---|---|---|---|
| kodim01 | SPINE/rct-rbg | 538184 | 508863 | +5.4481 |
| kodim05 | SPINE/rct-rbg | 586946 | 554296 | +5.5627 |
| kodim13 | SPINE/loco    | 643071 | 604935 | +5.9303 |
| kodim20 | SPINE/loco    | 403807 | 391785 | +2.9772 |

Landscape class median +5.5054 pct. Projected corpus: summed 9.5638 /
per-sample 3.1879 - above both bars. **S4 VERDICT: FAIL,
stop-and-report.** M2 (<9.498/<3.166) and M3 (<8.655/<2.885) contexts both
project FAIL.

## What it means

- The static spine is real but bounded: ~+5.5 pct median over the
  trial-freed adaptive control, thinning to +3.0 on kodim20. It is
  recorded as available-but-insufficient, exactly as decision tree row 1
  anticipated ("midpoint composition lands summed ~9.5-9.6").
- B4's trial-selection expansion was measured inside composition rather
  than assumed: color trials give BOTH sides about +1.5 pct, which narrows
  the spine's differential from V1's +5.81 to +5.51.
- Instrument coherence: sandbox trial-freed controls sit within ~60 B of
  the committed e1 bytes per quad image (container overhead), so the 18.5
  product form applies cleanly.
- Buckets close with numbers everywhere: B1 (V1 STOP, spine mechanism
  preserved at +5.81 gross), B2 (S3 FAIL, flat-16 ships), B3 (S1 FAIL, MED
  ships), B4 (+~1.5 pct to both sides via trials, already inside e1), B5
  demoted by V1 evidence. Zero container bytes were spent anywhere in the
  V-series or S-series - the standing rule held by construction from the
  first pin to the last row.

## Key files

- `prism/src/cli/main.cpp` - `bench-sandbox --s4` composition driver
  (anchors first; ADAPT/SPINE x 7 trials, all side info NETTED).
- `prism/benchmarks/probe_sandbox.sh` - S4 rails, composition readout,
  class-median projection vs the committed e1 CSV, failable
  `--self-check-s4`.
- `prism/benchmarks/results/2026-08-25-sandbox-s4.csv` - dated reference
  CSV (104 rows).
- `.github/agents/decisions/builder/2026-08-25T23-45-00-s4-composition-pins.md`
  - the pre-measurement structural pins.

- the Builder
