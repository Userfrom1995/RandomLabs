# Progress: Prism #130 - e7/X6b per-image hybrid oracle bound (issue #130)

- **Branch:** `opencode/issue130-20260903143542`
- **Status:** complete
- **Date:** 2026-09-03 (Builder run, `/oc build` trigger, resume mode)
- **Precedent:** X6b floor 3.21843/9.65529 reproduced on current main
  (`130-prism-blend0-full24-20260903.md`, Status: complete). Open PRs #266
  (CONFLICTING, unique file `2026-09-03-x6b-full24-defaultblend.csv`) and
  #267 (MERGEABLE, artifact-level proof that #266's CSV is identical modulo
  line endings to main's blend-0 full-24 CSV, wnet sums equal at 11389848).
  Both left untouched (owned by their runs/review chain).

## Binding gates (units mandatory, restated)

- M2: summed < 9.498 AND per-sample < 3.166 (vs real WebP m6 3.166)
- M3: summed < 8.655 AND per-sample < 2.885 (vs real cjxl -d0 -e9 2.885)
- `bench_gate.sh` dual-unit check is the only acceptance authority.
- `Refs #130` only, never `Closes #130` while gates fail.

## This run (Builder, 2026-09-03, resume mode - no redo of done work)

Question never previously measured in the ledger (grep over `progress/` finds
no e7-vs-X6b per-image composition; U2/T4 composed different path pairs on
older pipelines): what does a perfect per-image mux of the two shipped paths
buy? Oracle bound computed arithmetically from committed CSVs only, zero new
encoding compute:

- e7 source: `prism/benchmarks/results/2026-09-03-prism-e7.csv` (v1 spatial
  container, current main)
- X6b source: `prism/benchmarks/results/2026-09-03-x6b-blend0-full24.csv`
  (wavelet LeGall 5/3 levels 5 pure EMA, current main)
- Method: per image `min(e7_bytes, x6b_wnet)`. Pixel base verified this run:
  all 24 PPM headers are 768x512 or 512x768 = 393216 pixels, so
  per-sample bpp = bytes*8/(3*393216) exactly.
- Durable CSV (bench_gate-compatible `image,bytes,bpp` schema + `winner`
  column): `prism/benchmarks/results/2026-09-03-hybrid-e7-x6b-oracle.csv`.

Verification this run (not redone measurement):

- Corpus `prism/benchmarks/data/kodak` symlink: **24/24 SHA256 OK** against
  `prism/benchmarks/data/kodak.sha256` (bare-name pin file).
- `bench_gate.sh --self-check`: **PASS** (fails known-bad, passes known-good,
  both units printed). D1 deliverable intact.

## Result (honest, both units, negative)

- Hybrid oracle total: 11348667 bytes (e7 wins 2/24: kodim03 saves 3943 B,
  kodim20 saves 37238 B; X6b wins the other 22).
- Mean per-sample **3.2068**, mean summed **9.6204**.
- Vs X6b floor (11389848): **-0.3616%**. A real container would add a 24-bit
  path mask (3 bytes total, +0.0000008/sample - immaterial, excluded from the
  CSV which is stated as a pre-mux oracle bound).
- Gate eval (same arithmetic as `bench_gate.sh gate_eval`): **M2 FAIL both
  units** (9.6204 >= 9.498, 3.2068 >= 3.166), **M3 FAIL both units**.
  Remaining from hybrid bound: 1.27% to M2, 10.0% to M3.

Interpretation: the two shipped paths are almost strictly ordered (X6b beats
e7 on 22/24), so even a perfect container-level mux leaves 1.27% to M2. The
gap must come from a better single path, not from muxing the two incumbents.
This closes the "trivial mux" sub-question with a committed number; it is an
oracle bound, NOT a shipped floor (no mux encoder/decoder implemented, none
claimed).

## Milestone Checklist

- [x] Orient + read ledger (no redo of done work; #266/#267 triaged, untouched)
- [x] SHA-verified corpus 24/24 + bench_gate self-check PASS
- [x] Hybrid oracle CSV committed (dual-unit numbers, units stated)
- [x] Gate eval: M2/M3 FAIL as predicted (negative result, fully measured)
- [x] ideas/ entry + decision doc; commit + push; decision file (review)

- the Builder
