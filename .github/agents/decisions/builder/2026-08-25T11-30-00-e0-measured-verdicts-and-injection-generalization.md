# E0 measured: A-share kills E2, MC-viability fails as pre-registered; corruption injection generalized

- **Date:** 2026-08-25
- **Role:** the Builder
- **Issue:** #130 (E-series, blueprint `prism/docs/architecture-jxl-parity-eseries.md`)
- **Trigger:** blueprint next-step item 4 - execute E0 exactly as sliced,
  spec addendum 14 first, readout before any intervention or format byte.

## What ran (binding order held)

1. Spec addendum 14 committed BEFORE any measurement existed: orinit init
   law, property vector + poolings + count floor, all gate constants, share
   definitions. No constant changed after a measurement was seen.
2. Harness modes `bench-ideal --orinit / --orinit-corrupt / --props i,ii,iii`
   with ORINIT/ORINITCORRUPT/PROP row families, probe_ideal.sh rails
   (OA-order / OA-corrupt / PC-mono / MC-viability), fail-capable self-checks.
3. Measured on the pinned quad kodim01/13/05/20 (sha256 verified before
   measuring). Durable CSVs:
   `benchmarks/results/2026-08-25-ideal-orinit-e0.csv`,
   `2026-08-25-ideal-corrupt-e0.csv`, `2026-08-25-ideal-props-e0.csv`,
   joint rows in `2026-08-25-ideal-probe-e0-eval.csv`.

## Measured verdicts (all points of v0, pooled TOTAL)

| quantity | value | consequence |
|---|---|---|
| pct_ad (real coder) | -5.709 | reference |
| pct_or (oracle init) | -5.781 | |
| stat(class16, fine) | -10.90 | bin-fine anchor |
| stat(ctx343, fine) | -12.03 | MC comparator |
| **A** = ad - or | **0.073** | **E2 step-1 DOA-by-arithmetic** (< 1.5) |
| B = or - c16(fine) | 5.12 | step-2 precondition formally met |
| B_coarse = or - coarse16 | **-0.91** | collector-pure tracking NEGATIVE |
| MC margin(ii), pooled | **1.33 < 1.5** | **MC-viability FAIL** |
| MC margins per image | 2.67 / 1.86 / 2.87 / 2.95 | all clear |

Named decision-tree row (blueprint section 7, row 1): "M-C fails AND
A < 1.5 points" -> MANIAC and E2 both dead by arithmetic/gate; if E1's gate
also fails, close #130 honestly at the achieved level; if E1 passes, E1
alone proceeds then E4 decides.

## Decisions taken inside pre-registered scope

1. **OA-corrupt injection generalized (recorded deviation from the
   blueprint's letter).** The blueprint sketched "inverted sign prior at
   init". Measurement showed sign priors are so near-even that inverting
   only that kind moves total cost ~0.02 points of v0 - it could never trip
   the 0.05-point tolerance, making the self-check dead code (a gate that
   cannot fail is worse than no gate). The shipped injection sets EVERY
   kind's init to its anti-optimum with adaptation frozen: violations of
   +47 to +60 pct vs the real coder on all four images. STRICTER, not
   weaker; spec addendum 14.1 documents it.
2. **Self-check live portion runs on real pinned kodim05, not synthetic
   ramps.** Discovered while building the self-check: on degenerate ramps
   the class16-pooled optimum is WORSE than the compile-time priors (bimodal
   classes: flat contexts pooled with edge contexts), so the OA mid-
   inequality legitimately fails there. Synthetic streams say nothing about
   the harness; kodim05 exercises the real contract. Recorded so nobody
   "fixes" this back to ramps.

## Anomaly recorded as information, NOT grounds for re-litigation

The MC-viability FAIL is driven entirely by the POOLED clause: every single
image clears the 1.5-point bar individually (kodim01 +2.67, kodim13 +1.86,
kodim05 +2.87, kodim20 +2.95). Pooled scoring pools cell histograms across
images before estimation (joint figure); shared property cells suffer
mixture interference between images' distinct quotient statistics - visible
extremely in pooling (iii), where every image beats its own (ii) yet pooled
(iii) (-11.81) collapses BELOW pooled (ii) (-13.36). The risk register
anticipated exactly this moment ("between the precedent and the bar: the
gate fails as designed; re-litigating after seeing the measurement is
forbidden"). The gate verdict stands: MANIAC DEAD ON THIS BINARIZATION. The
per-image numbers are recorded here and in the tracker for the Maintainer
and owner because a per-image-adaptive tree (the only kind a real coder
could build) would live in the per-image world - if anyone ever wants to
reopen this, it requires a NEW pre-registered gate defined on per-image
margins with model-byte accounting, decided by the owner BEFORE any
measurement. This builder neither requests nor recommends that reopening.

## E2 status note (both steps)

Step 1: DOA-by-arithmetic, number attached (A = 0.073 << 1.5). No blob
format designed, FEATURE_EXT byte NOT wired, ext registry untouched.
Step 2's formal precondition (B >= 2 on the pre-registered bin-fine anchor)
is numerically met (B = 5.12), but the pinned B_coarse transparency column
(-0.91) shows that share is static fine-structure gain, which no static
table - global or regional - can recover by mechanism against an adaptive
coder that already beats same-structure static pooling. Step 2 is treated
as closed-by-mechanism unless a future stream change (an adopted E1) moves
the brackets. RT-fmt would measure reality anyway if anyone disagrees.

## Consequence for build order

Next slice: E1 offline validation ONLY (BiasModel behind addendum 14.3's
pinned constants; BIAS-anchor byte-equality; BIAS-fmt gate >= 1.5 points
aggregate bracket drop, no mixed sign). PASS -> format wiring behind the
never-expand trial in a later slice. FAIL -> honest closure of #130 at the
achieved level with the full negative ledger, E4 checkpoint, review
boundary. Handoff decision {"action":"continue"}.

- the Builder
