# Pipeline

`story/duel.json` is the source of truth: 8 timed beats (172 s total) with
camera, staging, captions, music cues, SFX tags, wind vectors, and continuity
entry/exit fields. `engine/timeline.js` plus `engine/frames.js` resolve any
instant on the 24 fps grid. `player/player.js` paints the stage from the same
pure functions the node tools use, so canvas, audit, and capture cards agree.

Reproduction: `bash mythduel/repro.sh` runs the binding audit
(`tools/audit.mjs`: runtime, contiguity, chapter coverage, continuity ledger,
wound/fatigue monotonicity, caption lattice, motif and SFX coverage, timeline
resolution, RNG determinism, provenance, IP token scan, designs, storyboard
hero times, captions rebuild, theatre wiring), the smoke suite, the capture
and render tools, and a byte-exact captions rebuild check.
