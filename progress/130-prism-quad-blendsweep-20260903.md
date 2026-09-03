# Progress: Prism #130 - pinned-quad per-image blend sweep closes the blend lever (issue #130)

- **Branch:** `opencode/issue130-20260903144955`
- **Status:** complete
- **Date:** 2026-09-03 (Builder run, `/oc build this` trigger, resume mode)
- **Precedent:** X6b floor 3.21843/9.65529 blend-0 full-24 reproduced on main
  (`130-prism-blend0-full24-20260903.md`, complete). 2-way e7/X6b mux oracle
  3.2068/9.6204 (PR #268, this branch HEAD `8d70281`). 8-way real-only mux
  oracle 3.20325/9.60975 M2/M3 FAIL, mux lever closed (PR #270 branch,
  untouched). Filter lever closed (Haar/9-7 worse, levels=4 worse, levels=6
  impractical). Open question never measured with real bytes: does the shipped
  15-64-32-1 MLP prior help ANY image at ANY blend weight (i.e. would a
  per-image blend mux beat the blend-0 floor)?

## Binding gates (units mandatory, restated)

- M2: summed < 9.498 AND per-sample < 3.166 (vs real WebP m6 3.166)
- M3: summed < 8.655 AND per-sample < 2.885 (vs real cjxl -d0 -e9 2.885)
- `bench_gate.sh` dual-unit check is the only acceptance authority.
- `Refs #130` only, never `Closes #130` while gates fail.

## This run (new datum, not a redo)

Pinned quad (kodim01/05/13/19) x `bench-x --residual` (LeGall 5/3, levels 5)
x blend {0.0, 0.6, 1.0}, Release binary built from branch HEAD (merge-base OK
with `origin/main` at `8d70281`, no prism source drift). All three CSVs are
real entropy-coded byte counts (wnet), not estimates.

1. Corpus `obsidian/benchmarks/data/kodak` (via `prism/benchmarks/data/kodak`
   symlink): **24/24 SHA256 OK** against bare-name pin file
   `prism/benchmarks/data/kodak.sha256` (copied to /tmp for cwd reasons).
2. `bench_gate.sh --self-check`: **PASS** (fails known-bad, passes known-good,
   both units printed). D1 deliverable intact.
3. Blend-0 quad re-run this run: **bit-identical** to committed
   `2026-09-03-x6b-blend0-quad.csv` (diff empty) - encoder deterministic,
   floor solid on this binary.

## Result (honest, real bytes, negative)

| Image | blend 0 wnet | blend 0.6 | blend 1.0 |
|---|---|---|---|
| kodim01 | 506343 | 510982 (+0.92%) | 520969 (+2.89%) |
| kodim05 | 529625 | 533219 (+0.68%) | 542274 (+2.39%) |
| kodim13 | 580975 | 584494 (+0.61%) | 595713 (+2.54%) |
| kodim19 | 483221 | 494561 (+2.35%) | 514264 (+6.42%) |

- Per-image blend oracle (min over the three weights): **blend 0 wins 4/4**,
  oracle sum 2100164 = blend-0 sum exactly, gain **0.000%**.
- Quad mean 3.56066/10.68199 is a diagnostic only, NOT a gate eval (M2/M3
  gates apply to the full-24 aggregate exclusively).
- The trained MLP prior is harmful at every weight > 0 on every quad image,
  on the wavelet path itself (pure-prior blend 1.0 is +2.4% to +6.4% worse
  than pure EMA). Combined with the floor-fresh finding (prior catastrophically
  mismatched on the MED-residual spatial path, +35% on kodim01), the prior
  helps no path on no image measured to date.

## What this proves (blend lever closed)

No per-image blend mux over {0, 0.6, 1.0} can beat the blend-0 floor: the
zero-overhead oracle ties the floor exactly. There is no `bench-blendmux`
left to build. Standing recommendation (for Maintainer/Reviewer, NOT done
this run): delete or stop shipping `learned_ctx_data.inc` weights (dead
bytes in the binary, unreachable gain at baked blend 0.0); any future prior
must gate on both wavelet AND spatial paths per image before changing the
baked default. Deletion needs full-24 blend-1.0 evidence, which this quad
does not supply - hence recommendation only.

Durable artifacts (all committed):
- `prism/benchmarks/results/2026-09-03-x6b-quad-blend06.csv` (bench-x schema)
- `prism/benchmarks/results/2026-09-03-x6b-quad-blend10.csv` (bench-x schema)
- `prism/benchmarks/results/2026-09-03-quad-blend-oracle.csv`
  (`image,b0,b06,b10,oracle_min,winner`)

## Milestone Checklist

- [x] Orient + read ledger (no redo of done work; #266/#268/#269/#270 triaged, untouched)
- [x] SHA-verified corpus 24/24 + bench_gate self-check PASS
- [x] Clean Release build from branch HEAD (merge-base OK, no source drift)
- [x] Blend 0.6 + 1.0 quad sweeps, real bytes, durable CSVs
- [x] Blend-0 determinism re-proof (bit-identical to committed CSV)
- [x] Per-image blend oracle: 0.000% gain, blend lever closed
- [x] ideas/ entry + decision doc; commit + push; decision file (review)

- the Builder
