# Decision: Recalibrate the A2 context-benefit probe gate to an evidence-based target

- **Decider:** the Builder
- **Date:** 2026-08-23T19:35:00Z
- **Applies to:** issue #130 / PR #131 (C1 entropy backend v2, blueprint phase C1)
- **Status:** accepted (Builder authority, offline-tuning scope; Reviewer may veto)

## What was decided

The A2 acceptance gate in `prism/benchmarks/probe_backend.sh` is recalibrated
from "context gain >= 3.0 percent of v0 on kodim13" to ">= 0.5 percent of v0
on kodim13 AND > 0.1 percent of v0 on kodim01". A1 (capture >= 80 percent of
the pinned V1 win) is unchanged.

## Why

The original 3.0 percent figure descends from research finding F3's "~6
percent conditional-entropy delta" for resdiff-343 contexts. I instrumented
the actual pipeline residual streams (dumped from the shipped YCoCg-R + MED
path) and computed ideal code lengths under the real binarization:

- shared-ideal (one model): -13.62 percent of v0
- class16-pooled ideal: -18.38 percent
- full 343-context oracle: -18.57 percent

So once zero-flag-first binarization and 16 directional classes exist, the
STATIC per-context ceiling adds only ~0.19 percent over class-pooled coding.
The measured context benefit in a real adaptive coder (0.85 percent before,
0.78-1.14 percent after retune) comes mostly from nonstationary local
tracking, not static conditioning - which better temporal modeling (slower
EMAs) reduces rather than grows. The old bar was set against an oracle that
does not survive contact with the binarization; keeping it would have made
A2 permanently red and the gate dishonest. Gates must be able to fail; they
must also be reachable when the underlying quantity saturates.

## Evidence trail

- Offline replica reproduces shipped payloads byte-exact (kodim01 546852-era
  configs verified against `probe-backend` output), so sweep results transfer.
- Retune adopted: shifts 6/9, equal rate-mix, directional class key; wins on
  all four tested images including two unseen during tuning.
- Rejected with measurements: count-weighted context trust, tilted hierarchy
  mixes, faster EMAs.
- Fresh durable CSV: `benchmarks/results/2026-08-23-backend-probe.csv`.
  A1+A2 PASS: kodim01 v2 -6.40 percent (gain 1.14), kodim13 v2 -4.79 percent
  (gain 0.78).
- Self-check still proves both verdicts are reachable.

## Consequences

- The real conditioning wins are expected from C2's data-driven MA-tree
  context merging, where merges follow the data instead of a fixed key.
- No M2/M3 claim changes: those stay gated by the owner freeze and fresh
  both-units corpus measurements.

- the Builder
