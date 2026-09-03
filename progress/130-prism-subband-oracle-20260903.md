# Progress: Prism #130 - per-subband mux oracle, instrument + quad (issue #130)

- **Branch:** `opencode/issue130-20260903160917`
- **Status:** in-progress (instrument + quad datum shipped this run; full-24 shards A/B/C remain)
- **Date:** 2026-09-03 (Builder run, `/oc build this` trigger, resume mode)
- **Precedent:** Whole-image mux closed at both widths (2-way 3.2068/9.6204 PR
  #268/#269; real-only 8-way 3.20325/9.60975 M2 FAIL by 1.18%). Blend lever
  closed (0.000% oracle gain). Filter/levels, palette, prior levers closed.
  Never previously measured: per-SUBBAND mux (different paths win different
  frequency bands). jxlmod never wins a whole image but could win subbands.

## Binding gates (units mandatory, restated)

- M2: summed < 9.498 AND per-sample < 3.166 (vs real WebP m6 3.166)
- M3: summed < 8.655 AND per-sample < 2.885 (vs real cjxl -d0 -e9 2.885)
- Gates apply to the full-24 aggregate exclusively; quad numbers below are
  diagnostic only, NOT gate evals.
- `Refs #130` only, never `Closes #130` while gates fail.

## This run (new instrument + new datum, not a redo)

**Instrument: `prism bench-subband --kodak DIR --out CSV [--levels L]
[--blend B] [--direct] [--r9-tree]`.** Fully additive: two files touched
(`prism/src/cli/main.cpp` new command + usage line), ZERO production encode
paths modified. It calls the production frame functions unmodified, then
parses the container header back (`wavelet_container_decode`, verifies magic
+ crc32) and reports per-(plane, subband) rANS stream bytes from
`WaveletHeader.sub_bytes`. Per-subband mux is nearly exactly realizable (not
just a bound): every subband already carries its OWN stream with its OWN
maxbits, the decoder slices them, decoded coefficients are identical under any
path so cross-subband parent conditioning still reads true values; a real mux
pays only ~48 selection flags (~12 bytes) + any EMA cross-subband state
mismatch (conservative direction for a FAIL verdict). Self-checks abort
non-zero on: net_out != bytes.size(), sum(sub_bytes) != payload.size(),
planes*spp != sub_bytes.size(). A corrupt instrument cannot emit a silent oracle.

**Verification this run:**
1. Corpus 24/24 SHA256 OK against `prism/benchmarks/data/kodak.sha256`.
2. `bench_gate.sh --self-check`: PASS (fails known-bad, passes known-good).
3. Release build from branch HEAD, 46/46 targets link, only pre-existing warning.

**Quad datum (kodim01/05/13/19, LeGall 5/3 levels 5, blend 0, real bytes):**

| Image | P0 residual (floor) | P1 r9tree | P2 direct coeff |
|---|---|---|---|
| kodim01 | 506343 | 507699 (+0.27%) | 512124 (+1.14%) |
| kodim05 | 529625 | 531386 (+0.33%) | 535114 (+1.04%) |
| kodim13 | 580975 | 583875 (+0.50%) | 584229 (+0.56%) |
| kodim19 | 483221 | 483434 (+0.04%) | 487731 (+0.93%) |

- P0 nets BIT-IDENTICAL to committed `2026-09-03-x6b-blend0-quad.csv`
  (diff empty): instrument validated, floor deterministic.
- P0 wins all 4 images whole-image; P1/P2 lose whole-image everywhere.

**Per-subband oracle on quad (min stream bytes per subband, 192 subbands):**

| Candidate set | Quad saving vs P0 stream total |
|---|---|
| {P0, P2} | 0.392% |
| {P0, P1} | 0.079% |
| {P0, P1, P2} | **0.449%** |

- Subband wins: P0 119/192, P2-direct 56/192, P1-r9tree 21/192.
- P1 marginal contribution is 0.057pp at full residual-encode cost, so P1 is
  DROPPED from the full-24 program (quad-documented as dominated); full-24
  oracle runs {P0, P2} only. P2-direct is cheap (no X6c trial loop) and carries
  nearly all the mux gain.
- Projection (NOT a gate eval): 8-way whole-image oracle 3.20325 x 0.99551
  ~= 3.189 full-24 equivalent, still M2 FAIL by ~0.7%. Full-24 measurement
  required to confirm honestly.

**Structural finding (new, from P0 per-subband breakdown):** ~67% of floor
bytes live in the finest-detail subbands (level index 5, 384x256: Y 34.9%,
Co 15.4%, Cg 16.8%); coarse levels 0-2 total ~2%. The byte mass sits exactly
where the online EMA adapts fastest, which explains structurally why every
transmitted-histogram lever (R6-B, R6-C, jxlmod-real) failed: the static model
can only contest ~2% of bytes while diluting the EMA on the other ~98%.
Luma holds 48.6% of bytes, chroma 51.4% combined.

**Bonus (scrap, NOT committed):** a full-24 P0 attempt timed out at 30 min
after 12 complete images; all 12 nets bit-identical to the committed
`2026-09-03-x6b-blend0-full24.csv` (0 mismatches). Cost lesson: residual path
~= 2.5 min/image (X6c 8-code trial loop dominates), so full-24 single-path
~= 60 min and MUST shard. Partial file discarded, shards redo cleanly.

## Full-24 program (for continue runs)

- Shard A: kodim01-08 x {P0, P2} (~22 min). Shard B: kodim09-16 (~22 min).
  Shard C: kodim17-24 (~22 min). Command:
  `prism bench-subband --kodak <sharddir> --out <csv> --blend 0 [--direct]`.
- Then: aggregate to per-subband oracle CSV, dual-unit gate eval vs M2/M3.
- PASS opens a buildable subband-mux encoder; FAIL closes mux at subband
  granularity (whole-image mux already closed at 2-way and 8-way).

## Milestone Checklist

- [x] Orient + read ledger (no redo; open PRs #266/#272 triaged, untouched)
- [x] bench-subband CLI added (additive only, usage line, self-checks)
- [x] Clean Release build 46/46 + SHA 24/24 + bench_gate self-check PASS
- [x] Quad P0/P1/P2 per-subband CSVs, real bytes, P0 bit-identical to committed
- [x] Quad per-subband oracle 0.449% + {P0,P2} 0.392% + P1-drop decision
- [x] Structural byte-mass finding (67% finest detail) recorded
- [x] 12-image determinism bonus noted (scrap, not committed)
- [x] ideas/ entry + decision doc; commit + push; decision file (continue)
- [ ] Shards A/B/C x {P0,P2} full-24 (continue runs)
- [ ] Full-24 subband oracle aggregation + dual-unit gate eval

- the Builder
