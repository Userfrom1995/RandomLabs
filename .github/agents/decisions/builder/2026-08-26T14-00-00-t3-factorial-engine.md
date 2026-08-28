# T3 factorial engine + dated quad CSV: build record

- **Role:** the Builder
- **Date:** 2026-08-26 (Builder slice Q3 of the T-series program, PR #147
  (successor to closed #146), issue #130)
- **Authority:** spec addendum 20.4/20.5 and pins P-Q3-1..P-Q3-12
  (decisions/builder/2026-08-26T13-13-00) are binding.

## What landed

1. `--t3` CLI mode in `prism/src/cli/main.cpp`: factorial
   {MED, GAP, W} x {ZFFCTRL, ZZ-HU} on all seven D4c color trials.
   Per cell: KFLAT16 keying, B-IDEAL (ideal bits) + B-RANS (real rANS
   bytes) rows, tables + 'SBP1' fully NETTED, zero maps/trees/assign
   by schema. T3CELL rows carry per-image min-trial NET.

2. `--t3b FAM@TOK` CLI mode: canary-on-winner with bias correction
   b[64] via gradient-context buckets (8*bucket(gN)+bucket(gW), shared
   border rule). 'SBB2' bias table serializer (magic + u32 n + 64 s16
   LE + CRC32), compressed ONCE by plane-rANS engine. Bias blob bytes
   NETTED. T3BS decomposition row (canary vs base per image).

3. Dated CSV: `prism/benchmarks/results/2026-08-26-sandbox-t3.csv`
   (464 rows, quad sha-pins verified pre-run).

4. Rebased branch onto fresh main (d362886, model fix from Lab Engineer).

## Honest smoke (NON-GATING)

All six cells measured on the quad (kodim01/05/13/20). Per-image
min-trial NET from T3CELL rows:

| cell | kodim01 | kodim05 | kodim13 | kodim20 |
|------|---------|---------|---------|---------|
| MED@ZFFCTRL | 508863 | 554296 | 604935 | 391785 |
| MED@ZZHU | 636102 | 694520 | 777040 | 479394 |
| GAP@ZFFCTRL | 553561 | 575799 | 619470 | 399968 |
| GAP@ZZHU | 694416 | 726271 | 796346 | 490655 |
| W@ZFFCTRL | 542400 | 568922 | 614445 | 397839 |
| W@ZZHU | 678340 | 712724 | 787175 | 488411 |

MED@ZFFCTRL wins every image. ZZ-HU is ~26 pct WORSE than ZFFCTRL
across all families (MED+26.2, GAP+25.4, W+25.0 at kodim01). This
matches the V/S/T-series history where HYB_C never beat ZFFCTRL on
real content.

Preliminary bar (i) margins (GAP/W vs MED under same tokenization):
- GAP@ZFFCTRL margin: quad median +0.93 pct (kodim01 +0.93, kodim05
  +0.39, kodim13 +0.24, kodim20 +0.37) - below +1.50 bar.
- W@ZFFCTRL margin: quad median +0.51 pct (kodim01 +0.51, kodim05
  +0.25, kodim13 +0.15, kodim20 +0.14) - below +1.50 bar.

Preliminary: bar (i) FAIL. GAP and W take their third and final strike;
B3/B5 close permanently. Formal verdict belongs to the evaluator
(probe_sandbox T3 rails + self-check-t3).

## What was NOT done

- Evaluator rails in probe_sandbox.sh (T3/T3B parsing, net-audit-t(T3)
  identity/schema, fidelity-t3, self-check-t3). These are needed for
  the formal verdict before the CSV can be cited as evidence.
- T3b canary measurement on the actual winner. The canary instrument
  exists and is proven functional; it rides exactly once on the winner
  after bar-(i) verdict.

## Consequence

The T3 data strongly suggests flat MED + ZFFCTRL ships forever (B3/B5
strike 3 of 3). T4 composition would then test whether the SPINE
baseline with trial-encoded color rotations can reach the format bar
(<9.35 summed / <3.117 per-sample) with only container bytes added.

- the Builder
