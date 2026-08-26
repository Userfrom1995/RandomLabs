# T5 trigger correction + honest closure of #130

## T5 trigger check (pre-registered gates)

T5 opens ONLY if T4 projects inside M3 reach but short of the format bar:
- T5 trigger: projected summed < 8.8316 AND per-sample < 2.9438 while failing
  the format bar (blueprint section 2, T5 reserve; P-S4-9).
- T4 projection: 9.5671 summed / 3.1890 per-sample.
- Format bar (< 9.35 / < 3.117): FAILS (9.5671 > 9.35).
- T5 trigger: 9.5671 > 8.8316 AND 3.1890 > 2.9438 => **T5 NOT TRIGGERED**.

The decision record 2026-08-26T16-00-00 stated "T4 projects inside M3 reach"
which is factually incorrect: 9.5671 summed is NOT inside M3 reach
(< 8.655 summed per the dual-unit gate, or even < 8.8316 per the
T5 trigger). This is a correction of a Builder error, not a gate change.

## Decision tree execution

The decision tree (architecture-jxl-parity-tseries.md section 7, row 1)
says: "S4 threshold NOT met" => stop-and-report with the full ledger.
T4 (the T-series composition analog of S4) FAILS without triggering T5 =>
row 1 final clause executes: #130 closes honestly at the achieved level.

## Final achieved numbers

- T4 projected corpus: 9.5671 summed / 3.1890 per-sample bpp.
- Threshold: < 9.35 summed / < 3.117 per-sample. Both exceeded.
- M2 (< 9.498 / < 3.166): projected FAIL-shaped.
- M3 (< 8.655 / < 2.885): projected FAIL-shaped.
- Both reported only; final judgment stays bench_gate.sh dual-unit.
- Baseline: e1 = 10.1210 summed / 3.3737 per-sample.
- Total improvement from baseline: -5.18 pct bytes (1 - 9.5671/10.1210
  applied to the projected composed corpus; note this is the COMPOSED
  projection, not a fresh measurement).

## Full negative ledger (T-series program)

- T0: Green. Lloyd collapses kodim01 to K=1; CEILING payload-gain
  negative vs fresh T-BASE.
- T1a: FAIL. RELPCT median -32.76 vs bar >= +2.00. C1 closed-with-numbers;
  T1b never opened.
- T2a: FAIL. Winner -13.09 median vs bar >= +0.50. Conditional T2b never
  opened; flat-16 ships unchanged.
- T3: FAIL. Bar(i) best non-MED W at ZFFCTRL quad median -2.11 vs
  >= +1.50. GAP/W third-and-final strike; B3/B5 close permanently.
  T3b canary never rides.
- T4: FAIL. Projected 9.5671/3.1890 vs < 9.35/3.117. T5 NOT triggered
  (9.5671 > 8.8316).
- T5: Never opened (trigger condition not met).

Every conditioning refinement measured under payable side info (V1 spatial
keyings, S3 causal properties, T1a group stacks, T2a shrunk class343,
T3 predictor-tokenization factorial) has lost to its own table economics.

## STATUS

CORRECTION committed 2026-08-26T18:00Z. T5 trigger error corrected;
#130 closes honestly at the achieved level per the decision tree's final
clause. No T5 work is authorized.

- the Builder
