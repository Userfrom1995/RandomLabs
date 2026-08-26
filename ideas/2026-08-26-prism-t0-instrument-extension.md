# Prism T0 instrument extension: the joint locality-context sandbox goes live

- **Date:** 2026-08-26
- **Program:** T-series (Prism v3, issue #130), Builder slice Q0 on PR #146
- **Blueprint:** `prism/docs/architecture-jxl-parity-tseries.md`;
  pre-registration: spec addendum 20 (`algorithmic-spec.md` section 20);
  builder pins: `decisions/builder/2026-08-26T08-05-00-t0-instrument-pins.md`
  (reconciling two concurrent Q0 openings) and amendment A5
  (2026-08-26T10-40-00, four bring-up repairs BEFORE any measurement)

## What it is

The V+S programs closed stop-and-report with every one-axis mechanism
priced: B1 (collection maps), B2 (extended conditioning), B3 (predictors)
all closed-with-numbers, composition short of the bar. The v3 research
located the one unmeasured structure - content-defined conditional
clustering layered ON TOP of class16 conditioning - and pre-registered the
fail-fast T-series against it. T0 is the blocking instrument slice: extend
the sandbox so the joint (group tile x class16) mechanism can be counted,
clustered, serialized, coded and audited at all, without touching a single
container byte.

## What was built

- **Group keyings KGROUP64/KGROUP128** (staticmodel): raw cluster id =
  g * 16 + ac_v2_prior_class(cx), plane-major raster tiling with partial
  edges counted in full; explicit-count model init raised to 16384 joint
  cells for GS64 quad geometry.
- **Integer Lloyd clustering**: farthest-point seeding (no RNG),
  symmetric chi-square on add-one-smoothed counts accumulated in unsigned
  128-bit, iteration cap 16, one-shot empty-prototype drop with ascending
  renumbering; prototype estimation reuses the shipped 18.2 smoothing
  pipeline verbatim against the image-global pooled prior.
- **'SBC1' codebook serializer + decoder mirror**: per-proto stride =
  16 x profile stride (class16 folded into every row), per-row replicated
  priors, delta + assignment-context stream compressed once by the
  plane-rANS engine, CRC32 over the uncompressed span, then single-state
  symbol rANS words (L = 2^23, M = 4096) over the blob-carried context.
- **CEILING mode**: per-group EXACT static stacks - no codebook, no
  clustering, no assignment bits by construction; tables serialized
  realistically through 'SBM1' and fully NETTED. Mandatory decomposition
  columns (payload gain / tables bytes / assign bytes) make the T1a fail
  clause mechanically readable later without re-measurement.
- **'SBP2' wide merge map** (u16 entries beyond 'SBP1's u8) and the
  **shrinkage estimator + 'SBD1' recursive delta tables** for T2a/T2b:
  cp = n*4096 + a_c*parent through the standard normalize pass; arms
  TW-A(32)/TW-B(128).
- **CLI**: `bench-sandbox --t0` (kodim01 only, refused otherwise) emits
  anchors, fresh T-BASE (S4-composition replay in-process), CEIL/CB/CBRAND
  rows with an exact 'SBC1' words-tail split so NET = payload+tables+maps+
  trees+assign holds mechanically; `--t0-synth homo|skew` builds
  deterministic fixtures in-process outside anchor coverage.
- **Rails**: VB-proto-roundtrip ('SBP2'/'SBC1'/'SBD1' mirror-exact,
  truncation/CRC/tamper hard-detect), VB-zzhu-identity (ZZ-HU is a row-
  schema label aliasing TokProfile::HYB_C verbatim), VB-assign-mirror
  (random AND skewed word streams reconstruct exactly), VB-net-audit-t,
  fidelity-t; failable `--self-check-t0` proves every FAIL path and both
  live rank directions.

## Amendment A5: what bring-up caught before any number existed

1. `crc32_combine` ignored its running state - every multi-part blob CRC
   ('SBM1'/'SBC1'/'SBD1') covered only the FINAL section. Now true
   incremental chaining; all formats repaired at once, zero layout change.
2. Lloyd's first assignment compared real stacks against ZERO centroids;
   symmetric ties collapsed every K to one survivor structurally. Seeds now
   initialize their slots. (Collapse still happens - but as a measured
   outcome, see below.)
3. The 'SBC1' serializer asserted an impossible prior shape and wrote a
   stride field disagreeing with its own reader; rebuilt to P-T0-5 exactly.
4. The 'SBD1' decoder mirror indexed parents by flat modulo (children 16+
   silently wrong) and its expect-compare ignored child_delta.

## Honest smoke readings (kodim01 only, NON-GATING)

Under the pinned metric kodim01's 64x64 groups collapse to transmitted
K=1 at EVERY pinned K - and CB1's payload equals the SPINE reference to
the byte (cross-instrument agreement). CEILING payload-gain vs fresh
T-BASE is negative (-0.41 pct GS64 / -0.76 pct GS128) before charging its
248/62 KB of NETTED tables. The instrument is honest even when the news
is bad: T1a's quad measurement decides bucket C1 with numbers, and the
decomposition columns will show whether table bytes are the sole losing
term (the only door to T1b).

## Key files

- `prism/include/prism/codec/staticmodel.h`, `prism/src/codec/staticmodel.cpp`
  (group machinery, Lloyd, serializers, shrinkage)
- `prism/src/cli/main.cpp` (`--t0`, `--t0-synth`)
- `prism/tests/unit/test_staticmodel.cpp` (9 new T0 test groups)
- `prism/benchmarks/probe_sandbox.sh` (T-rails + self-check)
- `prism/benchmarks/results/2026-08-26-sandbox-t0.csv` (dated smoke CSV)

Zero container bytes were spent or exposed anywhere in this slice.

- the Builder
