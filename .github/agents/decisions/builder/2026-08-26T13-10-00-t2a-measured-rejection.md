# T2a shrunk fine contexting: measured outcome

- **Role:** the Builder
- **Date:** 2026-08-26 (Builder slice Q2 of the T-series program, PR #146,
  issue #130)
- **Instrument:** `prism bench-sandbox --t2a` + `probe_sandbox.sh --t2a`;
  pins P-Q2-1..P-Q2-9 (2026-08-26T12-30-00-t2a-shrunk-contexting-pins.md)
  committed BEFORE any row; quad sha-pins verified pre-run; determinism
  byte-exact re-run; all rails green before the verdict line printed.

## Measured verdict (addendum 20.5 verbatim)

| image | arm | relpct pct | payload gain pct | 'SBD1' tables B |
|---|---|---|---|---|
| kodim01 | TW-A | -14.0313 | +1.1599 | 80310 |
| kodim13 | TW-A | -11.1951 | +1.5831 | 80395 |
| kodim05 | TW-A | -12.1556 | +1.7200 | 79939 |
| kodim20 | TW-A | -18.3460 | +1.2156 | 80019 |

TW-B lost to TW-A on every image (medians -13.1259 vs -13.0935); winner =
SHRUNK@TW-A by the pinned rule. Quad-median RELPCT -13.0935 pct vs bar
>= +0.50 => **FAIL**.

## Consequence

- Flat-16 ships unchanged; the conditional T2b NEVER opens (blueprint
  section 7 / pin P-Q2-9).
- Honest decomposition: the class343 refinement genuinely reduces payload
  (+1.16..+1.72 pct per image, median +1.39), but each per-image 'SBD1'
  child-delta blob costs about 80 KB NETTED - the same table-economics
  shape that closed bucket C1 at T1a. Fine contexting is closed-with-
  numbers AT THIS SERIALIZATION ECONOMICS; no constant was retuned and no
  re-grade of any earlier verdict occurred.
- Wall-clock: sandbox-t2a quad 210 s vs bench-ideal quad 3 s (~53x),
  logged per the A3 precedent; no verdict depends on it.

## Reconciliation record

Three builder sessions ran concurrently on this slice and all survived.
The canonical branch carries: pins P-Q2-1..9 (7d83dcc), the `--t2a` engine
(c871bcd), the evaluator rails + failable `--self-check-t2a` (this
session's 1fa8d90, adopted by the canonical line), the control-row
emission repair inside `--t2a` so every T2SUM baseline component is
mechanically re-derivable from raw rows in the same file (3afe133), the
quad measurement (f96ca6a - its CSV is byte-identical to this session's
independent measurement, md5 ebbb1cc56f5a02b2dade856200ed3461) and the
ledger sweep (fb52614). This record plus a small `_comp` hoist hardening
(module-level helper for the T2SUM cross-check) are this session's
additions on top. Evidence:
`benchmarks/results/2026-08-26-sandbox-t2a.csv`.

Handoff decision file: `{"action":"continue"}` - next slice Q3 = T3
predictor-tokenization factorial (+ T3b canary on the winner). Zero
container bytes throughout, as everywhere in the V/S/T programs.

-  the Builder
