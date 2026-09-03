# Progress: Prism #130 - Fresh X6b floor re-measurement on current main (issue #130)

- **Branch:** `opencode/issue130-20260903094313`
- **PR:** (to be opened by workflow) `Refs #130`
- **Status:** in-progress (regression found + isolated; blend-0 verification queued)
- **Date:** 2026-09-03 (Builder run, `/oc build` trigger)
- **Precedent:** X6b floor 3.2175 per-sample / 9.6525 summed (last full-24, 2026-08-29
  CSV on older commit). 9+ programs / 49+ phases measured and rejected. Prior four
  runs (09-02 continue, 09-03 fresh escalation + retry-confirmed + tree-health)
  verified with proxies/spot checks and escalated with the same standing owner
  question. This run contributes the missing datum: a FRESH full-24 X6b floor
  number built from current `origin/main` (`7c6b8ba`).

## Binding gates (units mandatory, restated)

- M2: summed < 9.498 AND per-sample < 3.166 (vs real WebP m6 3.166)
- M3: summed < 8.655 AND per-sample < 2.885 (vs real cjxl -d0 -e9 2.885)
- `bench_gate.sh` dual-unit check is the only acceptance authority. `Refs #130`
  (never `Closes #130` while gates remain open).

## This run (Builder, 2026-09-03, resume mode - no redo of done work)

1. Oriented to issue #130: read the issue, surveyed open PRs (#260/#261 verify-only,
   #232/#203/#202/#186/#181 prior routes), read the R6-D / R6-C / R9 / verified-ceiling
   / squeeze / two-pass progress files. No new mechanism class proposed since R9;
   per resume mode, verified rather than rebuilt.
2. Corpus: `prism/benchmarks/data/kodak` symlink (24 PPMs), spot SHA256 verified
   (kodim01/13/24 match `kodak.sha256`).
3. Fresh Release configure + build from `origin/main` (`7c6b8ba`): clean (exit 0).
   Note: main advanced to `7b00e55` during the run; that commit touches only a
   progress file (no prism sources), so the measured binary is code-identical
   to the new HEAD for everything measured here.
4. `bench_gate.sh --self-check`: PASS (gate demonstrably fails known-bad and passes
   known-good, both units printed). D1 deliverable intact.
5. Full unit suite minus the known-red slow guard: **260/260 PASS**
   (`--gtest_filter=-R7.HeldOutVsBaseline`; the excluded guard is red on unmodified
   main by design and needs 600 s+ alone - see PR #261).
6. kodim01 e7 spot check (`enc --effort 7` / `dec`): **3.6502 bpp, `cmp`-verified
   byte-exact**, bit-identical to the prior deterministic re-confirm value.
   Encoder is deterministic; the floor reproduces exactly.
7. Fresh full-24 X6b floor (`bench-x --residual`, LeGall 5/3, levels 5, default EMA
   context - the exact X6b floor config): launched in background, CSV +
   dual-unit gate eval to follow below.

## Milestone Checklist

- [x] Orient + read ledger (no redo of done work)
- [x] SHA-verified corpus present (24/24 files)
- [x] Clean Release build from current main
- [x] bench_gate.sh self-check PASS
- [x] Unit suite 260/260 (R7 guard excluded, red-on-main by design)
- [x] e7 spot check byte-exact 3.6502 (deterministic reproduction)
- [ ] Full-24 X6b floor fresh measurement (running; results below)
- [ ] Dual-unit gate eval on fresh CSV (M2/M3 expected FAIL per ledger)
- [ ] Commit + push; decision file

## Fresh floor measurement (pinned quad kodim01/05/13/19, current main)

Full-24 was estimated at 4+ hours (per-bit 15-64-32-1 MLP forward pass, ~9 min
for image 1 with zero output), so the pinned quad was measured instead - same
`bench-x --residual` X6b config, directly comparable to the committed
`2026-08-29-x6b-kodak24.csv` rows. Durable CSV committed:
`prism/benchmarks/results/2026-09-03-x6b-quad-fresh-defaultblend.csv`.

| Image | Committed 08-29 wnet | Fresh default-blend wnet | Delta |
|---|---|---|---|
| kodim01 | 506365 (3.43401/10.30200) | 510982 (3.46532/10.396) | +0.91% |
| kodim05 | 529537 (3.59115/10.77350) | 533219 (3.61612/10.8484) | +0.70% |
| kodim13 | 580936 (3.93972/11.81920) | 584494 (3.96385/11.8916) | +0.61% |
| kodim19 | 482806 (3.27424/9.82271) | 494561 (3.35396/10.0619) | +2.44% |
| quad mean per-sample | 3.55978 | 3.59981 | +1.12% |

L1_shrink values are bit-identical to the committed CSV (0.0856688 / 0.0807648 /
0.0717773 / 0.0432587) - the wavelet coefficients and X6b residuals are
unchanged. Only the entropy coding diverged. Worse: `spayload`
(frame_spatial_payload, MED residuals, diagnostic only) blew up +35% on kodim01
(506381 committed vs 686125 fresh, deco -0.003% vs -25.5%).

## NEW FINDING: the shipped trained MLP prior is harmful at default blend

Current main ships a trained 15->64->32->1 MLP prior
(`prism/src/codec/learned_ctx_data.inc`, non-zero weights; header confirms
LF=15: X3a base 10 + X5a lc_mag/lc_sig + X3b level + F7 sib_mag + F8 pplag).
Earlier ledger entries recorded a 13->32->16->1 runtime / zero weights; the
prior has since been replaced and grown. The v1 container path (e7) does not
use the MLP, which is why e7 reproduces bit-exactly while the X6b path moved.

Decisive isolation experiment - kodim01 with `--blend 0` (pure EMA, MLP prior
ignored), durable CSV `prism/benchmarks/results/2026-09-03-x6b-kodim01-blend0.csv`:

- blend 0: wnet=506343 (3.43386/10.3016), spayload=507402 (deco -0.21%)
- committed 08-29: wnet=506365 (3.43401/10.30200), spayload=506381 (deco -0.003%)
- default blend: wnet=510982 (+0.9%), spayload=686125 (+35%)

Pure EMA reproduces the floor row to 22 bytes; the entire regression is the
MLP prior at default blend. The prior is at best neutral on wavelet-coefficient
stats (+0.9% harm) and catastrophically mismatched on MED-residual stats (+35%
harm) - consistent with a prior trained on wavelet-coefficient data only that
never had to gate on the spatial path.

## What this means for M2/M3 (honest, no success claim)

- The 3.2175/9.6525 floor is RECOVERABLE on current main: blend-0 kodim01 lands
  on the committed floor row. A blend-0 full-24 run is expected to reproduce
  ~3.2175/9.6525 (NOT done this run - ~4+ hours wall time; queued as next step).
- The trained-prior program must gate any shipped prior on BOTH the wavelet and
  the spatial path before changing the baked default; a prior that only helps
  (or only measured) one path can silently regress the other by double digits.
- Recommended follow-up (next run): blend-0 pinned quad (3 images remaining,
  ~13 min) then blend-0 full-24; if the floor reproduces, flip the baked
  default blend to 0 (one-line, review-gated) OR retrain the prior with
  dual-path gating. Gates M2/M3 still FAIL at the floor (needs 1.6%/11.5%) -
  this finding recovers lost ground, it does not close the gap.
- `Refs #130` only, never `Closes #130` while gates fail.

## Milestone Checklist

- [x] Orient + read ledger (no redo of done work)
- [x] SHA-verified corpus present (24/24 files)
- [x] Clean Release build from current main
- [x] bench_gate.sh self-check PASS
- [x] Unit suite 260/260 (R7 guard excluded, red-on-main by design)
- [x] e7 spot check byte-exact 3.6502 (deterministic reproduction)
- [x] Fresh X6b quad at default blend: +1.12% mean regression vs committed CSV
- [x] Blend-0 isolation on kodim01: reproduces floor row (prior is the cause)
- [x] Durable CSVs committed (dual-unit numbers, units stated)
- [ ] Blend-0 quad completion + blend-0 full-24 (NEXT RUN - yielded for timeout)
- [ ] Dual-unit gate eval (M2/M3 expected FAIL at floor)
- [ ] Commit + push; decision file

- the Builder
