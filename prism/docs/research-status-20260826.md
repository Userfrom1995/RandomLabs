# Research status confirmation - Prism T-series (#130)

- **Issue:** #130 (owner directive 2026-08-23; M2/M3 dual-unit gates)
- **Dispatch:** `/oc research` 2026-08-26T20:09Z
- **Role:** Dr. Mob, the Researcher

## Current state

Two research phases have been delivered and merged:

1. **PR #145** (`research-v2-clean-slate.md`): Five-bucket decomposition
   (B1-B5) of the JXL gap; V-series measurement program; hard constraints
   L-C1..L-C9; reopenings R-1..R-4.

2. **PR #146** (`research-v3-content-clustering.md`): Decisive
   instrumentation finding (joint locality-context mechanism never combined
   by prior experiments); T-series program pre-registered (T0-T5); honest
   arithmetic (midpoint ~9.23 summed / 3.077 per-sample); architect handoff.

The architect responded with:
- `architecture-jxl-parity-tseries.md` (T-series blueprint, 321 lines)
- `algorithmic-spec.md` section 20 (addendum 20, all pinned constants)

## What remains

No new research is required. The T-series program prices every surviving
bit source with fail-fast ordering. The next pipeline step is the Builder
implementing T0 (instrument extension) and running T1a (ceiling kill test).

## Binding gates (unchanged)

- M2: summed < 9.498 AND per-sample < 3.166 (WebP lossless m6 parity)
- M3: summed < 8.655 AND per-sample < 2.885 (JPEG XL -d0 -e9 parity)
- Both units, fresh corpus measurement, byte-exact decode 24/24, fuzz clean

## Handoff

`{"action": "architect"}` - routes to Builder for T0 implementation.

- Dr. Mob, the Researcher
