# Pipeline

`story/duel.json` is the source of truth: 8 timed beats (172 s total) with
camera, staging, captions, music cues, SFX tags, wind vectors, and continuity
entry/exit fields. `engine/timeline.js` plus `engine/frames.js` resolve any
instant on the 24 fps grid. `engine/arena.js` paints the storm-crag in four
passes (composition, washes, detail, atmosphere) from authored per-beat values
and seeded tables, and `player/player.js` paints the stage from the same pure
functions the node tools use, so canvas, audit, and capture cards agree.

Boards live in `story/storyboard.json`: eight hero panels with shots,
entry/exit staging, and cause links that must mirror `duel.json` exactly.
`story/trailer.json` holds the trailer skeleton (cuts with in/out times on the
lattice, inside their beats). `tools/capture.mjs` exports hero cards plus
arena plates (facet checksums pin the geography headless); `tools/render.mjs`
prints the stills manifest with plate and trailer totals.

Reproduction: `bash mythduel/repro.sh` runs the binding audit
(`tools/audit.mjs`: runtime, contiguity, chapter coverage, continuity ledger,
wound/fatigue monotonicity, caption lattice, motif and SFX coverage, timeline
resolution, RNG determinism, provenance, IP token scan, designs, storyboard
hero times, board/duel agreement, shot lattice and hero anchoring, trailer
resolution, arena grades/determinism/budgets/plates, captions rebuild, theatre
wiring), the smoke suite, the animatic suite, the capture and render tools,
and a byte-exact captions rebuild check.
