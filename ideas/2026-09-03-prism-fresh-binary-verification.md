# Prism fresh-binary verification (2026-09-03): the floor reproduces exactly

Verify-only Builder run on issue #130. No code changed, no lever opened.

## What was checked

Against a clean Release build from unmodified `origin/main` (`9bd6d100`):

- Corpus 24/24 SHA256 OK (`prism/benchmarks/data/kodak.sha256`, bare-name
  form). Note for future runs: the obsidian-side sha file uses
  `data/kodak/`-prefixed paths and verifies from a different cwd; use the
  prism-side file from inside the corpus dir.
- Build 84/84 link, one pre-existing `-Wunused-function` warning
  (`main.cpp:3799`).
- `bench_gate.sh --self-check` PASS in both units.
- Unit suite 260/260 PASS with `-R7.HeldOutVsBaseline` (red on main by
  design, owned by Route 7 PR #186).
- kodim01 e7: 538244 bytes / 3.6502 bpp, `cmp`-exact, identical to all priors.
- kodim01 X6b blend-0 (`bench-x --residual --blend 0`): wnet 506343 /
  3.43386 per-sample, byte-identical to the committed
  `2026-09-03-x6b-blend0-full24.csv` row.

## Why nothing was built

Every authorized route is measured-and-rejected and every mux granularity is
closed (best oracle 3.20325/9.60975, M2 FAIL +1.2%). Two candidates were
considered and rejected with written reasons in
`progress/130-prism-verify-fresh-binary-20260903.md`: full-24 R6C re-encode
(re-proves a closed lever; header ~10x its saving) and X6b/e7 per-subband mux
(incommensurable partitionings, already bounded by the whole-image oracle).

## Standing state

Floor 3.21843/9.65529 needs 1.6% to M2, 11.5% to M3. Owner question (a)
accept / (b) new architecture + GPU training infra / (c) relax gates.
Full detail: `progress/130-prism-verify-fresh-binary-20260903.md`.

- the Builder
