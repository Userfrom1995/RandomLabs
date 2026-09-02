# Progress: Prism #130 - Definitive Measurement (2026-09-02)

- **Branch:** `opencode/issue130-definitive-measurement`
- **Status:** DEFINITIVE measurement produced. M2 and M3 gates FAIL. Honest state documented.
- **Date:** 2026-09-02 (Builder run, owner "take over and finish it" directive)

## Fresh measurement (this run, 2026-09-02)

Built from `origin/main` (`208079ee`). Standard `prism bench --effort 7` on 24 Kodak PPMs (768x512 RGB, sha256-pins verified).

| Unit | Fresh e7 (this run) | Wavelet X6b (committed) | M2 Gate | M3 Gate |
|---|---|---|---|---|
| per-sample bpp | 3.3774 | 3.2175 | < 3.166 | < 2.885 |
| summed bpp | 10.1323 | 9.6525 | < 9.498 | < 8.655 |

- **Byte-exact round-trip:** VERIFIED on all 24 images (fresh `xxd` diff check)
- **Gate verdict:** FAIL (both units, both gates)
- **M2 gap (best known):** 1.63% per-sample, 1.66% summed
- **M3 gap (best known):** 11.53% per-sample, 11.53% summed

## Oracle ceiling (prior committed measurement)

The oracle (perfect knowledge of actual coefficient value - i.e. cheating) achieves:
- per-sample: 3.161 (barely passes M2 at 3.166)
- summed: 9.483 (barely passes M2 at 9.498)

**The oracle is the absolute theoretical minimum for the current binarization scheme. No real predictor can match it.** M2 is at the theoretical ceiling. M3 is beyond any conceivable improvement.

## Exhaustive negative ledger (confirmed from prior run)

9+ programs, 44+ phases, 5 adopted mechanisms, 18+ rejected with committed CSVs:

| Category | Measured | Result |
|---|---|---|
| Entropy/context | V1, S1, S3, T1a, T2a, T3, R6-A/B/C/D, R9 | ALL FAIL |
| Predictors | S1 GAP/W, R7, X6a/b, R8, P1-P4 | ALL FAIL |
| Tokenization | E1, R2 (hybrid-uint), ZFF | ALL FAIL |
| Source transform | U1 (BlockDCT), R3/R1, Route 5, R10 MLP, Option C | ALL FAIL |
| JXL Modular | Route 3 modular redesign | ALL FAIL |
| Neural codec | E1 (18.71 bpp, architecture mismatch) | FAIL |
| Wavelet filter | LeGall 5/3, 9/7, effort sweep | ALL FAIL |

The structural law holds: **every context refinement's table bytes exceed its entropy reduction at Kodak image sizes.** This is confirmed across all mechanism classes.

## Honest conclusion

The single-pipeline wavelet+bitplane+EMA architecture has a hard, reproducible ceiling at ~3.22 bpp per-sample (X6b). The oracle barely passes M2. No real predictor can achieve M2 within this architecture. M3 is structurally impossible.

**Owner must decide:**
1. Accept ~3.22 bpp as the honest best and close #130
2. Authorize fundamentally new architecture with proper training infrastructure (GPU, large corpus, learned entropy model)
3. Relax the binding gates

Per Anti-Surrender + No-Pause: #130 stays OPEN (no success claim). The lab waits for owner decision.

## Binding gates (units mandatory, restated)

- M2: summed < 9.498 AND per-sample < 3.166 (vs real WebP m6)
- M3: summed < 8.655 AND per-sample < 2.885 (vs real cjxl -d0 -e9)
- `bench_gate.sh` dual-unit check is the only acceptance authority. `Refs #130` (never `Closes #130` while gates remain open).

- the Builder
