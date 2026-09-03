# Progress: Prism #130 - fresh-binary verification, floor re-proof (issue #130)

- **Branch:** `opencode/issue130-20260903185936`
- **Status:** complete (verification only - no new lever; ledger untouched)
- **Date:** 2026-09-03 (Builder run, resume mode - no redo of done work)
- **Base:** `9bd6d100` (= `origin/main` at run start; branch has zero divergence)
- **Precedent:** X6b blend-0 floor 3.21843/9.65529 (`2026-09-03-x6b-blend0-full24.csv`);
  subband mux oracle 3.20664/9.61993 M2 FAIL (full-24, corroborated 2304/2304);
  N-way quad oracle 0.72% stream-bound (PR #275, OPEN). All routes R1-R10/X3/X6
  measured and rejected; mux closed at whole-image 2-way, 8-way, per-plane,
  per-subband 2-way full-24, per-subband N-way quad.

## Binding gates (units mandatory, restated)

- M2: summed < 9.498 AND per-sample < 3.166 (vs real WebP m6 3.166)
- M3: summed < 8.655 AND per-sample < 2.885 (vs real cjxl -d0 -e9 2.885)
- Gates bind the full-24 aggregate only. `Refs #130` only, never `Closes #130`.

## This run (fresh-binary verification, zero production changes)

No source file was modified. Every check below ran against a clean Release
build from unmodified HEAD, so the datum is a pure tree-health + determinism
proof, not a new mechanism measurement.

1. Corpus: `prism/benchmarks/data/kodak` (symlink into obsidian data), 24/24
   SHA256 OK against `prism/benchmarks/data/kodak.sha256` (bare-name form,
   checked from inside the corpus dir; the obsidian-side file uses
   `data/kodak/`-prefixed paths and does NOT verify from that cwd).
2. Clean Release configure + build (Ninja, 4 jobs): 84/84 link, single
   pre-existing `-Wunused-function` warning in `prism/src/cli/main.cpp:3799`
   (`pick_t3_base`), no new warnings.
3. `bench_gate.sh --self-check`: PASS (fails known-bad, passes known-good,
   both units printed). D1 deliverable intact.
4. Unit suite: **260/260 PASS** (`--gtest_filter=-R7.HeldOutVsBaseline`, 188 s).
   The excluded guard is red on unmodified main by design (R7-A ~14% worse
   than X6b on held-out photos; owned by Route 7 PR #186). No gate-gutting.
5. kodim01 e7 spot (`enc --effort 7` / `dec` + `cmp`): **538244 bytes,
   3.6502 bpp, byte-exact**, bit-identical to every prior run. Encoder
   deterministic across binaries.
6. kodim01 X6b blend-0 spot (`bench-x --residual --blend 0`, fresh binary):
   **wnet 506343, 3.43386/10.3016**, byte-identical to the committed
   full-24 floor CSV row. Floor reproduces exactly under a fresh build.

## Deliberately NOT built (written reasons, no redo)

- Full-24 N-way oracle incl. R6C streams: quad already proves the realizable
  mux stays {P0,P2} (R6C header ~19 KB/image is ~10x its stream saving).
  Re-encoding full-24 R6C would cost hours to re-prove a closed lever.
- Per-subband X6b/e7 mux: incommensurable - spatial vs wavelet partitionings
  share no common subband grid, and the whole-image 2-way oracle (3.2068)
  already bounds it above the subband-mux result (3.20664). No instrument
  to build without a shared grid.
- PR #275 (N-way paths + R6B clamp fix) left untouched: OPEN, MERGEABLE,
  owned by the review chain. Duplicating its fix here would conflict.
- Open verify/oracle PRs (#266, #232, #203, #202, #186, #181) untouched.

## Honest state (dual units, unchanged)

| Path | Per-sample | Summed | M2 | M3 |
|---|---|---|---|---|
| X6b blend-0 floor (fresh-binary re-proof) | 3.21843 | 9.65529 | FAIL (+1.6%) | FAIL (+11.5%) |
| Subband-mux oracle {P0,P2} full-24 | 3.20664 | 9.61993 | FAIL (+1.3%) | FAIL |
| 8-way whole-image oracle | 3.20325 | 9.60975 | FAIL (+1.2%) | FAIL |

## Escalation

Per builder.md escalation protocol the next build phase cannot be decided
here: every authorized route is measured-and-rejected and the standing owner
question is unchanged: (a) accept ~3.218/9.655 as the honest best and close
#130, (b) authorize a fundamentally new architecture with GPU + large-corpus
training infrastructure, or (c) relax the binding gates. Per Anti-Surrender +
No-Pause, #130 stays OPEN; `Refs #130` only.

- the Builder
