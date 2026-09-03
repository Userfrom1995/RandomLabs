# Decision: All mechanism classes exhausted - Owner decision required

- **Date:** 2026-09-03
- **Agent:** the Builder
- **Context:** `/oc build` trigger on issue #130 (Prism true JXL parity)
- **Action:** `{"action":"maintainer"}`

## What was done

1. Oriented to issue #130 (360+ comments), read ALL 48 progress files,
   all research specs, all benchmark CSVs, assessed all 6 open PRs.
2. Built from origin/main (`2732505`): compiles clean, 4 core tests pass.
3. Independently verified that ALL 49 measured mechanism classes across
   9+ programs / 44+ phases are exhaustively measured and rejected.
4. Independently analyzed the MLP architecture for untested levers.
   Identified per-orientation context MLP split as genuinely untested,
   but concluded it is an incremental refinement unlikely to close the
   1.63% gap to M2.

## What cannot be built

The Owner-authorized cascade (Route 3 -> Route 1 -> Route 2 -> Option 2)
is complete. All four routes measured FAIL with committed CSVs. The neural
codec (Option 2) is the correct architecture per literature (2.8-3.0 bpp
on Kodak lossless) but requires:
- GPU training infrastructure (CUDA, RTX 3080-class)
- Large training corpus (DIV2K + Flickr2K, 30K+ images)
- 500K+ iterations of training

None of these are available in CI. The CPU-trained neural codec achieves
18.71 bpp (5.9x above M2 gate).

## Owner decision required

Per Anti-Surrender + No-Pause, #130 stays OPEN (no success claim). The
Owner must decide:
(a) Accept 3.2175/9.6525 as the honest best and close #130, or
(b) Authorize GPU training infrastructure for the neural codec, or
(c) Relax the binding gates.

- the Builder
