# Prism: three lever closures - blend-mux, palette, R7 pin (issue #130)

- **Date:** 2026-09-03. **Author:** the Builder. **Type:** negative-ledger measurement note.
- **Question:** with the 8-way real-only oracle mux closed at 3.20325/9.60975
  (M2 FAIL +1.18%), do per-image blend tuning, a global palette mode, or Route 7
  offer any remaining headroom?

## 1. Per-image blend mux: killed by measurement

kodim19 (most blend-sensitive quad image) blend sweep, `bench-x --residual`,
LeGall 5/3, levels 5, pure EMA. Durable:
`prism/benchmarks/results/2026-09-03-blend-sweep-kodim19.csv`.
0.0: 483221; 0.2: 484399 (+0.24%); 0.4: 488502 (+1.09%); 0.6: 494561 (+2.35%);
0.8: 502809 (+4.05%); 1.0: 514264 (+6.42%). Monotone walls, optimum at the
baked default. No 24-image extension warranted.

## 2. Global palette: killed by arithmetic (unbuilt, correctly)

Exact unique-RGB census on pinned Kodak-24 (8-bit, 768x512 or 512x768):

| image | unique | top256 | top64 | top16 | best |
|---|---|---|---|---|---|
| kodim01 | 19182 | 28.3% | 12.0% | 4.5% | 0.90% |
| kodim02 | 13452 | 60.1% | 37.1% | 16.8% | 1.55% |
| kodim03 | 34871 | 39.0% | 20.7% | 9.7% | 0.89% |
| kodim04 | 31716 | 16.7% | 6.3% | 2.5% | 0.82% |
| kodim05 | 63558 | 16.9% | 8.2% | 3.3% | 0.75% |
| kodim06 | 25964 | 21.2% | 10.3% | 4.9% | 0.79% |
| kodim07 | 37552 | 39.9% | 22.3% | 10.3% | 1.03% |
| kodim08 | 45558 | 13.6% | 7.1% | 4.4% | 1.73% |
| kodim09 | 24106 | 42.1% | 18.1% | 6.3% | 0.99% |
| kodim10 | 21537 | 22.4% | 9.2% | 3.9% | 0.90% |
| kodim11 | 34473 | 33.7% | 22.6% | 16.4% | 2.06% |
| kodim12 | 25567 | 35.5% | 18.9% | 7.5% | 0.82% |
| kodim13 | 39784 | 10.5% | 4.6% | 2.5% | 0.87% |
| kodim14 | 55117 | 19.9% | 8.3% | 3.3% | 0.88% |
| kodim15 | 44576 | 29.8% | 13.8% | 5.8% | 1.10% |
| kodim16 | 14096 | 30.9% | 13.5% | 4.7% | 0.84% |
| kodim17 | 19815 | 32.2% | 16.6% | 8.3% | 1.10% |
| kodim18 | 57415 | 17.9% | 7.6% | 3.4% | 0.36% |
| kodim19 | 24807 | 25.3% | 9.9% | 3.2% | 0.24% |
| kodim20 | 24470 | 53.4% | 44.3% | 25.4% | 12.60% |
| kodim21 | 29317 | 29.4% | 15.0% | 5.8% | 0.47% |
| kodim22 | 53351 | 14.0% | 6.3% | 2.3% | 0.20% |
| kodim23 | 72079 | 15.8% | 7.7% | 3.1% | 0.32% |
| kodim24 | 42351 | 20.3% | 11.2% | 7.0% | 4.86% |

Escape-flag cost (1 bit/pixel = ~49KB/image, ~+10%) exceeds median-case palette
savings (~36KB) before table bytes: NET WORSE ~+2.7%. Best single image
(kodim20) yields ~+0.17% corpus-wide, 7x below the 1.18% gap. Not built, with
reason - consistent with JXL itself rarely selecting palette on photos.

## 3. R7 rejection pinned in the test suite

`R7.HeldOutVsBaseline` fired on main with corpus present (+15.0% median
re-confirmed vs +14.5% recorded; base drift +0.03% from the blend-default flip).
The promotion guard for a rejected route became a pinned rejection
(`EXPECT_GT(median, 5.0)`) in `prism/tests/unit/test_r7.cpp`: fails loudly on
any behavior change either way, forcing joint pin+ledger updates on rework.
No encoder behavior changed; no gate relaxed.

## Standing

Floor ~3.22/9.65, oracle ceiling 3.20325, M2 needs 3.166 (1.18% below oracle),
M3 needs 2.885. Owner question (a)/(b)/(c) unchanged. Refs #130 only.

- the Builder
