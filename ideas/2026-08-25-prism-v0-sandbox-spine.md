# Prism V0 sandbox spine (bench-sandbox + six VB rails)

- **Date:** 2026-08-25
- **Project:** Prism (issue #130, Prism v2 clean-slate program)
- **What it is:** the V0 measurement instrument of the pre-registered
  V-series: a new offline CLI (`prism bench-sandbox`) plus a rail script
  (`prism/benchmarks/probe_sandbox.sh`) that scores clustered-static coding
  of residual streams under pluggable tokenizations, keyings, and entropy
  backends - entirely FORMAT-UNWIRED (zero container bytes until a V4 PASS).

## Why

The v2 research spec located the gap to JPEG XL in five buckets and ordered
a gated program where every lever is measured offline before any format
byte is spent. That requires an instrument that can price ARBITRARY
architecture candidates against the frozen v1-era references without
touching the shipped codec. bench-ideal stays frozen as that reference;
the sandbox is its successor instrument.

## How it works

- `tokenize.{h,cpp}`: profile ZFFCTRL replays the shipped zero-flag-first
  binarization; profiles HYB-A/B/C implement the research stage 3 ladder
  (zigzag fold, exclusive ZERO token, direct tokens below T_ESC = 4/8/16,
  escape quotient over progressive contexts, unmodeled literal low bits).
- `staticmodel.{h,cpp}`: per-image clustered counting, pinned smoothing
  (pseudo-count 32, r = 15/16), exact 2^12 normalization with support
  floors, cluster floors/caps (K <= 256, 4096 samples), hierarchical blob
  serialization (image prior + per-cluster deltas, delta stream compressed
  once by the plane-rANS engine) protected by CRC32 and length prefixes,
  and joint NET accounting (payload + tables + maps + trees, I12).
- Backends: B-IDEAL exact static ideal lengths (oracle bracket),
  B-RANS interleaved-static rANS (NS=4), B-BAC static binary arithmetic,
  B-ADAPT fresh production replay as the live control.
- Rails (probe_sandbox.sh): bit-for-bit anchors against the committed
  bench-ideal references on both the frozen walk and the sandbox counting
  path; +0.50 pct coder-fidelity bound of each real backend against its own
  B-IDEAL row; double-count side-info audit; corrupt-injection failability
  (CRC / truncation / content mismatch); both-direction clustering rank
  fixtures; byte-identical determinism. `--self-check` proves every rail's
  FAIL path.

## Key findings during the build

- A table-building out-of-bounds spill (TOKEN block past the ZFFCTRL
  stride) silently corrupted every cluster boundary while round-trips stayed
  green - found by chasing an "impossible" fidelity ratio; fixed with a
  regression test BEFORE any measurement landed.
- B-IDEAL must carry the escape ladders' literal low-bit cost or it cannot
  bound the real coders that pay it.
- iid noise images are NOT homogeneous for clustering purposes: MED's
  neighborhood leaks magnitude information into resdiff contexts, so the
  rank fixture uses a constant image where contexts provably carry nothing.

## Evidence

- `prism/benchmarks/results/2026-08-25-sandbox-v0.csv` (dated reference,
  SANDBOX GATE PASS, all rails green on the pinned quad).
- Decision record amendment chain:
  `.github/agents/decisions/builder/2026-08-25T16-20-00-v0-sandbox-structural-pins.md`
  (D1-D15 pins, A1, A2 engine integrity, A3 wall-clock deviation).
- Blueprint: `prism/docs/architecture-jxl-parity-vseries.md`; constants:
  `prism/docs/algorithmic-spec.md` section 18.

- the Builder
