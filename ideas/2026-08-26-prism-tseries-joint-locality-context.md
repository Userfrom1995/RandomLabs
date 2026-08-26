# Prism T-series: pricing the joint locality-context prize (#130)

- **Date:** 2026-08-26
- **Issue:** #130 (fresh research dispatch 2026-08-26T06:59Z after the V+S
  programs closed stop-and-report)
- **Role:** the Architect
- **Blueprint:** `prism/docs/architecture-jxl-parity-tseries.md`
- **Research:** `prism/docs/research-v3-content-clustering.md`
- **Pre-registration:** `algorithmic-spec.md` section 20 (addendum 20)

## Summary

The V+S programs measured every naive expression of spatial structure and
conditioning and rejected each on NET economics - but the v3 research
found the decisive instrumentation fact: KGRID128's cluster id REPLACES
directional context, KTREE refines only context, and the oracle maps
replace everything. The joint structure - content-defined, forward-adapted
distributions layered ON TOP OF class16 conditioning, localized to image
groups - was never measured by anyone. It is exactly JPEG XL modular mode's
histogram-clustering mechanism, and the oracle rows (56.4-73.9 pct below
realistic bytes) say the prize behind it is enormous. The T-series prices
that joint expression cheaply and in fail-fast order, with every gate
pre-registered BEFORE any measurement.

## Deliverables

1. Blueprint `architecture-jxl-parity-tseries.md`: stacking resolution
   (V+S instrument imported onto PR #146 in one linear history), T0
   blocking instrument extension with new failable rails, phases
   T1a/T1b/T2a/T2b/T3(+T3b)/T4/T5 with verbatim gates, module map (zero
   container edits until T4 PASS), test matrix, risk register, slicing,
   binding decision tree, honest projections.
2. Spec addendum 20 BEFORE any measurement: T-BASE fresh-in-run baseline
   rule, group geometry {GS64, GS128}, integer Lloyd metric/init/caps,
   'SBC1' codebook serialization, assignment-word coding, CEILING mode
   with mandatory decomposition columns, shrinkage a_c arms + 'SBD1'
   recursive delta tables, ZZ-HU identity (= HYB_C reused verbatim),
   every T-gate verbatim, CSV naming, reserved slots.
3. Builder slices: Q0 = T0 harness; Q1 = ceiling kill test (+ conditional
   codebook); Q2 = shrunk fine contexting (+ conditional static E0
   reopening); Q3 = joint predictor-tokenization factorial; Q4 =
   composition + corpus projection vs the UNCHANGED < 9.35 / < 3.117 bar.

## Why

Everything else is measured. B1 partially harvested (+5.5 pct spine,
stranded below the composed threshold), B2/B3 closed within their scopes,
B4 inside composition. The only unmeasured mechanism left that the oracle
arithmetic says can pay is the JOINT one - and it costs a few hundred
lines of instrument extension to price honestly. If the per-group-exact
ceiling cannot clear +2.00 pct NET with tables paid realistically, C1
dies cheaply with numbers; if payload survives but tables drown it, a
small delta-coded codebook is precisely the remaining chance, and T1b
tests exactly that. Either way the program ends at a threshold readout
with zero container bytes spent unless it genuinely passes.

## How It Works

Keep the shipped class16 event keying. Partition each plane into pinned
groups; pass 1 counts each group's conditional table stack; deterministic
Lloyd clustering (symmetric chi-square on add-one-smoothed counts, 16.16
fixed point, farthest-point seeding, no RNG) compresses group stacks into
K <= 24 prototype stacks; prototypes transmit as quantized deltas toward
the image-global pooled tables ('SBC1', CRC32, rANS-compressed stream);
each group codes under its assigned prototype via an entropy-coded
assignment word - fully NETTED. The decoder mirrors everything by
construction. T1a first scores the CEILING (per-group exact stacks,
realistically serialized tables, no assignment bits) so the bucket's own
upper bound is priced before any clustering machinery earns trust.
Parallel tracks shrink class343 child tables toward their class16 parents
(T2a), reopen E0's property margins under payable-table static scoring
(T2b), run the closed predictor x tokenization factorial that closes B3/B5
forever either way (T3), then compose per-image winners by real NET bytes
and project the corpus through formula 18.5 verbatim (T4).

## Module Breakdown

- `src/codec/staticmodel.cpp` [T0]: GroupPartition tiling, per-group
  counting stacks, integer Lloyd clustering, 'SBC1' serializer/mirror,
  CEILING serialization, shrinkage + 'SBD1', assignment coder hook.
- `src/cli/main.cpp` [T0-T4]: bench-sandbox --t0/--t1a/--t1b/--t2a/
  --t2b/--t3/--t4 modes over the existing instrument.
- `benchmarks/probe_sandbox.sh` [T0-T4]: VB-proto-roundtrip /
  VB-assign-mirror / net-audit-t rails + verdict readouts + failable
  --self-check-t0.
- Reused unchanged: tokenize (HYB_C doubles as ZZ-HU), predict families
  (18.4 + A4/A4b verbatim), backends, ClusterMap resolution, all six VB
  rails.

## Test Matrix

Lloyd determinism and tie-break unit tests; 'SBC1'/'SBD1' round-trip +
tamper hard-detect; decoder-side assignment mirror equality on random and
skewed fixtures; shrinkage limit identities (a_c -> 0 = parent, child ML =
unshrunk); ceiling decomposition NET identity; rails green before every
verdict line; both-direction self-checks; byte-exact determinism re-runs;
sha-pinned quad before any measurement; fuzz + round-trip untouched;
bench_gate.sh stays the only final judge.

Honest arithmetic: midpoints land about 9.23 summed / 3.077 per-sample -
past the format bar and M2 with modest room; M3 stays at risk and nothing
here relaxes the gates. Failure costs one slice per bucket and ZERO
container bytes.

- the Architect
