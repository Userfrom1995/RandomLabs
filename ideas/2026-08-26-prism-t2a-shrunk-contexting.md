# Prism T2a: shrunk fine contexting - the static B2 reopening priced and closed

- **Date:** 2026-08-26 (T-series slice Q2 of the joint locality-context
  program, PR #146, issue #130)
- **Role:** the Builder
- **Status:** measured and CLOSED - T2a FAIL per its verbatim gate (best
  arm median -13.09 pct vs bar >= +0.50); the conditional T2b static
  reopening never opened; flat-16 ships unchanged; zero container bytes.

## What this was

The v3 research's bucket C2 asked the one static question left after S3:
the E0-era oracle margins for fine-grained conditioning (+1.86..+2.95
points of v0) were measured with tables never charged. T2a charged them.
Exactly one mechanism changed vs the class16 spine: every residual-DIFF
context (343 of them) got its own child table shrunk toward its SHIPPED
class16 parent - the pinned addendum 20.3 formula

    p_hat(child bin) = (n_child(bin) + a_c * p_parent_u12(bin)) /
                       (N_child + a_c)

renormalized to exactly 4096 by the standard largest-remainder pass, with
two pre-named arms TW-A (a_c = 32) and TW-B (a_c = 128). Everything else
stayed spine-identical: ZFFCTRL tokenization, MED residuals, B-RANS
payload, all seven D4c color trials swept.

## How the side info stays honest

One 'SBD1' blob per candidate carries the whole refinement: magic, shape,
the 343-entry parent map (the shipped reduction, NOT positional), the 16 x
stride u12 class16 rows raw, and the 343 x stride s16 child-delta stream
compressed once by the plane-rANS engine, CRC32 over the uncompressed
span. The decoder rebuilds each child row against ITS OWN blob-carried
parent - mirror-exact, unit-tested against the positional-modulo
regression. Coding uses ONLY tables rebuilt from the transmitted blob
(P-Q1-5 discipline extended); decode resolves contexts causally under
KFLAT343 from its own history, so maps/trees/assignment bytes are zero by
schema, not by bookkeeping. NET = payload + 'SBD1' bytes, per I12.

## The pins that made it honest

`.github/agents/decisions/builder/2026-08-26T12-30-00-t2a-shrunk-contexting-pins.md`
landed BEFORE any row existed: no budget enforcement on the 343 axis
(shrinkage IS the floor mechanism - enforcing would destroy the very
contexts being priced), parents = the same-run transmitted class16 tables
the baseline literally pays for, baseline = each image's minimum-NET fresh
same-stack class16 spine row, whole-set reporting with no post-hoc
re-selection, evaluator-owned verdicts, and a failable --self-check-t2a
proving both verdict directions plus five named mutations.

## What the quad said

All rails green first (anchors bit-for-bit 4/4, fidelity 56 families
within +0.50 pct, net-audit clean on 112 T2 rows + 8 T2SUM rows,
determinism byte-identical). Then the measurement:

    kodim01  TW-A -14.03 / TW-B -14.05   (T-BASE winner SPINE net 508863)
    kodim05  TW-A -12.16 / TW-B -12.21   (SPINE net 554296)
    kodim13  TW-A -11.20 / TW-B -11.23   (SPINE net 604935)
    kodim20  TW-A -18.35 / TW-B -18.48   (SPINE net 391785)

Winner SHRUNK@TW-A: quad median -13.09 pct vs the >= +0.50 bar. Every arm
regresses on EVERY image. The 'SBD1' blob costs ~80 KB per image - the
343-context delta stream is simply worth far more bytes than the
conditioning it transmits, even shrunk toward parents and rANS-compressed.
This is the same table-economics law V1 (KTREE/KGRID), S3 (causal property
hashes) and T1a (per-group exact stacks) already measured under payable
side info; T2a confirms it holds for the gentlest possible refinement -
one delta layer over tables the decoder already needs.

## Consequences

- The conditional T2b (E0 M-C extended properties, static two-pass) never
  opens: its opener required a T2a PASS. Flat-16 ships unchanged.
- Bucket C2's static branch is priced-and-closed at its gate; combined
  with S3's causal closure, no conditioning refinement has survived
  payable-side-info accounting anywhere in this program.
- Composition candidates for T4 remain {ADAPT control, SPINE (+5.5 pct
  median)} x color trials, pending the T3 predictor x tokenization
  factorial.
- Wall-clock 49.25x bench-ideal recorded per the A3 precedent (structural;
  no verdict depends on it). Zero container bytes spent.

Evidence: `benchmarks/results/2026-08-26-sandbox-t2a.csv` (224 lines),
tracker `progress/130-prism-true-jxl-parity.md`, spec addendum 20
execution notes.

- the Builder
