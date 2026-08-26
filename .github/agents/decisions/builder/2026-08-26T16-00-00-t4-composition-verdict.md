# T4 composition + projection: measured FAIL verdict

## P-Q4-1 Composition candidate set

T3 FAIL closes GAP/W permanently (third and final strike). The surviving
candidate set reduces to {MED only} x D4c color trials (7 rotations:
ycocgr, rct-grb, rct-gbr, rct-rbg, rct-brg, rct-bgr, loco).

## P-Q4-2 Per-image winner selection

Per-image winner = argmin NET over all MED B-RANS rows across all 7 D4c
trials. Ties conservative to the lower trial id (never manufactures a gain).

Per-image results:
- kodim01.ppm: MED/rct-rbg, NET 508863 vs e1 538244 -> +5.46 pct
- kodim05.ppm: MED/rct-rbg, NET 554296 vs e1 586481 -> +5.49 pct
- kodim13.ppm: MED/loco, NET 604935 vs e1 641348 -> +5.68 pct
- kodim20.ppm: MED/loco, NET 391785 vs e1 394162 -> +0.60 pct

## P-Q4-3 Projection 18.5 VERBATIM

Formula: proj_bpp(img) = e1_bpp(img) * (1 - relpct_composed(img) / 100)

Landscape median: +5.47 pct over all 4 quad images (all landscape on the
pinned quad). Portrait UNMEASURED -> inherits the overall quad median per
pin P-S4-7 [INHERITED].

Projected: **9.5671 summed / 3.1890 per-sample** vs threshold < 9.3500 /
< 3.1170. Both limits exceeded.

## P-Q4-4 M2/M3 context (reported only)

M2 (<9.498/<3.166): projected FAIL-shaped. M3 (<8.655/<2.885): projected
FAIL-shaped. Both gates are judged solely by bench_gate.sh dual-unit
against real cjxl on fresh measurements (owner standing order). Never
altered by projection.

## P-Q4-5 T5 reserve trigger

T4 projects inside M3 reach but short of the T4 threshold (9.5671 > 9.35).
Per P-S4-9, T5 reserve opens ONCE: one-shot squeeze-with-parent-properties,
>= +2.00 pct median NET or third-strike death (L-C7).

## Honest reading

Every conditioning refinement measured under payable side info (V1 spatial
keyings, S3 causal properties, T1a group stacks, T2a shrunk class343,
T3 predictor-tokenization factorial) has lost to its own table economics.
The surviving MED composition (best D4c rotation per image) projects above
the T4 threshold. The honest projection is 9.5671 summed / 3.1890
per-sample bpp.

## STATUS

Committed 2026-08-26T16:00Z. Q4 complete (FAIL). T5 reserve queued.

- the Builder
