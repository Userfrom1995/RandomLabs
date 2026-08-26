# Prism T1a: the ceiling kill test that closed bucket C1

- **Date:** 2026-08-26
- **Project:** Prism (`prism/`), issue #130, T-series slice Q1 on PR #146
- **What it is:** the first QUAD verdict of the joint locality-context
  program - a pre-registered kill test asking whether spatially local,
  per-group exact distributions are worth their own serialized table cost.
  Answer, measured: no. The gap between the payload gain and the table bill
  is not close.

## The question

Research v3 located one unmeasured mechanism: content-defined conditional
distributions layered ON TOP OF class16 conditioning. The V1 oracle rows
said the conditional structure behind realistic bytes was enormous
(56-74 pct below them). Every earlier experiment had replaced or refined
one axis; nobody had paid for locality itself. T1a prices it exactly:
give every 64x64 (or 128x128) tile of every plane its OWN exact static
model - no clustering, no approximation, the best per-group static stack
it is legal to build - serialize those tables realistically through the
hierarchical 'SBM1' shape (global prior + per-group s16 deltas,
rANS-compressed, CRC32), NET everything per I12, and ask whether the
payload savings clear +2.00 pct median NET over the fresh S4-composition
baseline (T-BASE).

## What was built

- `ClusterMap::group_base` (prism/src/codec/staticmodel.cpp): group ids
  become per-plane (addendum 20.2's "no cross-plane grouping" clause),
  repairing a Q0 defect where all three planes pooled into one tile stack.
  Landed BEFORE any measurement with a binding regression test
  (`GroupKeying.PlanesNeverShareAStack`); the Q0 smoke's pooled rows were
  voided and its CSV regenerated (anchors/T-BASE unchanged bit-for-bit).
- `bench-sandbox --t1a` (prism/src/cli/main.cpp): anchors first, fresh
  in-run T-BASE control ({ADAPT, SPINE} x seven D4c color trials by real
  NET bytes), then CEILING rows over {GS64, GS128} x all trials with
  decode-mirror round trips; TSUM decomposition rows embed base/candidate
  components plus relpct, payload gain and the sole-tables-loss flag so
  the fail clause is auditable from the CSV alone.
- probe_sandbox.sh extensions: T1 schema/NET/fidelity rails, a TSUM
  decomposition cross-check rail (the evaluator re-derives every summary
  figure from raw rows rather than trusting it), T1A/T1B gate readouts
  that never flip exit codes, and `--self-check-t1` proving both verdict
  directions plus five named mutations.
- Pins P-Q1-1..P-Q1-9 (.github/agents/decisions/builder/
  2026-08-26T11-20-00-t1a-ceiling-pins.md) committed before any quad row;
  spec addendum 20 execution note appended after measurement. A `--t1b`
  codebook instrument exists, self-checked, and stayed UNUSED on the quad
  because the pre-registered opener never fired.

## Measured verdict (quad kodim01/kodim13/kodim05/kodim20)

| image | winning arm | tables (B) | payload gain | RELPCT |
|---|---|---|---|---|
| kodim01 | GS128 | 182534 | +1.82 pct | -33.46 pct |
| kodim05 | GS128 | 187931 | +1.31 pct | -32.05 pct |
| kodim13 | GS128 | 190650 | +2.44 pct | -28.57 pct |
| kodim20 | GS128 | 212724 | +3.94 pct | -49.52 pct |

Median RELPCT -32.76 pct vs bar >= +2.00: FAIL. Median payload gain
+2.13 pct vs the +4.00 opener bar: not met. Sole-tables-loss: false on
all four images. Conditional T1b never opens; bucket C1 is
closed-with-numbers under the binding decision tree. All rails green,
determinism byte-exact, wall-clock 47.50x bench-ideal recorded per the A3
precedent (nothing depends on it). Zero container bytes, as everywhere in
the V/S/T programs.

## Why it loses (the honest reading)

Per-group exactness multiplies the table bill: at GS128 with per-plane
groups there are ~72 stacks per image against the spine's ONE pooled
class16 table (~3 KB). Even though each tile's model fits its local
statistics better (the +1.3..+3.9 pct payload gain is real), paying
~180-210 KB of transmitted tables to harvest it is two orders of magnitude
out of balance. This is the same economics that killed KTREE/KGRID (V1)
and the causal property hashers (S3), now measured for EXACT per-group
stacks - there is no clustering trick that recovers a 60x overshoot,
which is precisely why the fail clause demanded a +4 pct payload gain
before letting T1b try. It did not come close.

## Files

- `prism/src/cli/main.cpp` - t1run namespace, --t1a/--t1b drivers
- `prism/src/codec/staticmodel.cpp`, `include/prism/codec/staticmodel.h`
  - per-plane group identity
- `prism/benchmarks/probe_sandbox.sh` - T1 rails, readouts, self-check-t1
- `prism/benchmarks/results/2026-08-26-sandbox-t1a.csv` (+ regenerated t0)
- `progress/130-prism-true-jxl-parity.md` - tracker ledger

- the Builder
