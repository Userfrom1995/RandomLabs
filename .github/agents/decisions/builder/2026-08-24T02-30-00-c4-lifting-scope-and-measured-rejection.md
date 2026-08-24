# Decision: C4 scope - trial mirror config, probe hook, legacy guard deferral

- **Decider:** the Builder
- **Date:** 2026-08-24T02:30:00Z
- **Applies to:** issue #130 / PR #131 (blueprint phase C4, true CDC lifting)
- **Status:** accepted (Builder authority within build scope; Reviewer may veto)

## What was decided

1. **Trial-bits level choice uses a fixed no-band-tree configuration.**
   `trial_squeeze_bits` mirrors prism.cpp `encode_band_generic`'s plain v2
   path under a single-leaf tree (leaf ids identically zero): MED residual
   over the band's own domain, causal features collapsed by the trivial tree,
   v2 coder with default prior init. Rationale: at analyzer time the band
   tree is not final; a consistent A-B under the exact coder family
   production uses is honest, and when no band tree ships (the photo case)
   it is byte-exact with production. The alternative - duplicating the full
   feature walk per candidate L - would triple encode cost for no decision
   difference.
2. **Public probe hook `EncodeOpts::force_squeeze_levels`.** Deterministic
   override of the analyzer's squeeze plan (size must equal channel count,
   levels clamped to max). Needed because trials legitimately reject lifting
   corpus-wide, so no natural input exercises bit5 streams; tests and future
   probe work must be able to pin the plan. Production default stays empty -
   trials decide.
3. **Legacy coupled guard deferred to C5.** The effort>=3 coupled path's
   internal band-tree guard still uses entropy estimates (`estimate_bits`,
   `squeezed_plane_cost`). C4's mandate was transform + L-by-trial-bits; on
   photos the coupled path is inert (trials choose L=0 everywhere), and C5
   replaces per-band selectors wholesale. The guard now consumes lifting
   bands so any stream it could produce stays decodable.
4. **Flag-gate test updated, not weakened.** The old unknown-bit probe used
   0x20, which C4 legitimately names (SQUEEZE_LIFT); it now probes 0x40.

## Evidence trail

- Bijection property suite: random BD8 planes, dims 1..65 odd included, L up
  to max; even-dim deep chains; one-level lift/merge exact-inverse check;
  determinism; average-chain range bound; legacy decimation unchanged; BD16
  never squeezed. One real bug found and fixed during this suite: merge read
  the wrapped-signed hb quadrant without int16 reinterpretation.
- Directed container round-trip: forced plan {1,1,1} emits bit5 and decodes
  byte-exact through production encode+decode.
- Corpus: 24/24 sha pins verified pre-measurement; e1 10.2904/3.4301 =
  byte-identical to pre-C4 (trials reject lifting everywhere, never-expand
  holds); e3 10.2861/3.4287; e7 10.2861/3.4287. Zero regressions by
  construction. M2/M3 honestly still FAIL in both units.
- Fuzz 500 iters PASS after all changes; 59/59 gtests green.

## Consequences

- Static spatial transforms are now closed by measurement at every level
  tried (decimation F2, leaf contexts C2, composites C2b, lifting C4).
  Parity work concentrates on C5 cross-band prediction and C6 CM/SSE.
- If the Reviewer disputes the single-leaf trial mirror, recalibrating the
  gate to full-feature trials is mechanical: swap the mirror inside
  `trial_squeeze_bits` only.

- the Builder
