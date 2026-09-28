# Pipeline

`story/duel.json` is the source of truth: 8 timed beats (172 s total) with
camera, staging, captions, music cues, SFX tags, wind vectors, and continuity
entry/exit fields. `engine/timeline.js` plus `engine/frames.js` resolve any
instant on the 24 fps grid. `engine/arena.js` paints the storm-crag in four
passes (composition, washes, detail, atmosphere) from authored per-beat values
and seeded tables. `engine/rigs.js` holds the FK proportion bodies (Thor 7.0
heads, Zeus 7.4 heads, binding shoulder and hip ratios), `engine/acting.js`
holds the beat-by-beat choreography keyframes with lattice-exact impacts and
wind-driven cloth sway plus geography-anchored particles, `engine/faces.js`
holds gaze/blink/brows/effort mouths, and `engine/fighters.js` paints the
rigs with gripping hands, tremor, wounds, thrown-weapon flights, and impact
bursts. `player/player.js` paints the stage from the same pure
functions the node tools use, so canvas, audit, and capture cards agree.

Boards live in `story/storyboard.json`: eight hero panels with shots,
entry/exit staging, and cause links that must mirror `duel.json` exactly.
`story/trailer.json` holds the trailer cut map (7 windows, 30 s total, every
edge on the lattice inside its beat); `engine/trailer.js` maps the trailer
clock back onto duel time, so trailer mode paints through the same
`paintStage` and every trailer frame is pixel-identical to its duel frame.
`tools/capture.mjs` exports hero cards, arena plates (facet checksums pin the geography headless), and fighter close-up
cards (pose names, foot contacts, silhouette reads, impact lists);
`tools/render.mjs`
prints the stills manifest with plate and trailer totals, and
`tools/render-posters.mjs` paints the three deterministic premiere posters
(`designs/posters/`: key art plus both fighter sheets) from the duel seed.

Reproduction: `bash mythduel/repro.sh` runs the binding audit
(`tools/audit.mjs`: runtime, contiguity, chapter coverage, continuity ledger,
wound/fatigue monotonicity, caption lattice, motif and SFX coverage, timeline
resolution, RNG determinism, provenance, IP token scan, designs, storyboard
hero times, board/duel agreement, shot lattice and hero anchoring, trailer
resolution, arena grades/determinism/budgets/plates, rig proportions,
turnaround symmetry, silhouette reads, contact honesty, impact timing, combat
poses, fighter determinism and paint budgets, score coverage and dead-air
check, SFX tag map with the honest hush, voice/generator coverage, audio
sync and bounds, stem rebuild match, duck floors, master bounds, live/offline
 phrase parity, captions rebuild, theatre wiring, trailer plan and
 frame parity, trailer caption coverage, poster rebuild match, premiere
 markup and player hooks, behind-the-scenes surface, root landing,
 frame-step transport and keyboard map, card keyboard access, full stage
 sweep, public-docs unity), the smoke suite, the
animatic suite, the combat suite, the sound suite, the premiere suite, the final
integration suite, the audio render pipeline,
the capture and render tools,
and a byte-exact captions rebuild check.

Sound is generated, never recorded: `score/themes.js` holds the four original
motif rows, `score/orchestra.js` turns the beat cue map into a deterministic
note-event list (march tempi, storm-graded beat rides, resolving closing
notes that ring to each beat edge), `score/voices.js` renders six original
synth voices offline, `score/sfx.js` maps every choreography tag to one of
eighteen procedural foley generators, `score/duck.js` holds the voiced-line
duck envelope shared by both buses, `score/mix.js` places everything on the
master timeline and writes the soft-limited master plus per-bus stems, and
`score/live-audio.js` performs the same event lists live in the theatre
through WebAudio. `tools/render-audio.mjs` refreshes the committed JSON stems
(`score/score-events.json`, `score/sfx-events.json`) and renders the WAV
master plus stems with a checksum manifest into `dist/audio/` (gitignored
build artifacts: WAVs are never committed).
