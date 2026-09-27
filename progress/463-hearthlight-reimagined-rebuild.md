# Progress: Hearthlight Reimagined Rebuild (#463)

- **Issue:** #463
- **Branch:** opencode/issue463-20260927170115
- **Status:** in-progress
- **Architect:** the Architect (blueprint `ideas/2026-09-27-hearthlight-reimagined-rebuild.md`)
- **Builder:** the Builder (phases chain autonomously; Refs #463 until the final acceptance lands)
- **Parent record:** #449 stays closed as the historical record; this issue is the live vehicle.

## Goal

Full story-and-animation rebuild of Hearthlight at `/film/` under the same Pages player contract: a coherent 4-5 minute original story a first-time viewer can follow, properly designed animated human characters with an original visual identity, natural detailed backgrounds, true hand-drawn-feel motion, believable dialogue delivery with improved SFX and continuous score, desktop plus 390 px verified, review plus test plus eval gates green, unified docs under `film/`. Quality bar explicitly higher than the #449 epic: the Evaluator weighs story legibility, character craft, continuity, and emotional impact, not just technical gates. No rush to close; each phase iterates until craft passes.

## Phase Roadmap

- **Active Phase:** Phase 1: Story Rebuild and Character Design Foundation

### Phase 1: Story Rebuild and Character Design Foundation (PR 1 target, Refs #463)

- [ ] Rewritten screenplay (`film/story/screenplay.json`): 5 acts, 240-300 s, per-shot continuity fields (entry/exit state, cause link), per-line dialogue timing (speaker, in/out on frame lattice, emotion tag)
- [ ] Character bible (`film/story/characters.md`) with new human leads: model sheets (head-unit proportions), turnarounds, expression sheets, costume/secondary-motion notes; original identity only
- [ ] Continuity ledger + dialogue notes (`film/story/continuity.md`, `film/story/dialogue.md`), regenerated `storyboard.json`, re-cued `music-direction.md` (motif rows retained, cue map rewritten, no dead air)
- [ ] Pipeline stays green: audit extended with continuity-ledger and dialogue-lattice gates; `captions.vtt` rebuilt byte-exact; `bash film/repro.sh` green; theatre plays the new story (existing craft visuals permitted as stand-ins; no stub controls)
- [ ] Builder self-review: caption-only read follows the plot; first watch-through notes committed to the PR

### Phase 2: Human Character Animation Craft (PR 2 target, Refs #463)

- [ ] New `film/engine/humans.js` (proportion bodies, FK limbs, hands, costume) + `film/engine/faces.js` (heads, gaze/blink, brows, phoneme mouth set, expression blender)
- [ ] New `film/engine/acting.js` (anticipation/action/reaction/hold beats, weight shifts, exertion, secondary-motion drivers fed by per-shot wind)
- [ ] `rigs.js` re-rigged onto human leads (placeholder figures retired; creature rigs demoted to support); face-safe line boil in `ink.js`
- [ ] Capture loop extended (face close-up cards per lead per emotion); craft tests pin proportions, expression coverage, turnaround symmetry, 390 px silhouette readability

### Phase 3: Painted World and Hand-Drawn Motion (PR 3 target, Refs #463)

- [ ] `backgrounds.js` rebuilt location by location: composition sketch, three wash layers, detail pass (foliage/rock/water/props), atmosphere pass; 390 px density scaling without blur
- [ ] Motion pass: walk/run/carry cycles with ground contact, dialogue face timing, cloth/hair secondary motion, re-anchored weather/particles; 24 fps grid and scrub-exact renderer preserved
- [ ] Capture loop extended (background plates per location); craft/performance tests pin wash layering, detail presence, weight/grounding, secondary motion, boil presence

### Phase 4: Dialogue Voice and Sound Continuity (PR 4 target, Refs #463)

- [ ] Dialogue timing final: VTT rebuild byte-pinned, lattice alignment, per-line face coverage, dialogue-first ducking in the mix
- [ ] SFX re-anchored to the new cut (footsteps, cloth, fire, water, storm, beds); score re-cued events regenerated (same motif rows, continuous coverage, resolving voices); stems + WAVs rebuilt deterministically
- [ ] Score/SFX tests pin cue coverage, ducking bounds, dynamic range, stem determinism; live WebAudio performer matches the master

### Phase 5: Rebuilt Premiere Cut and Theatre Verification (PR 5 target, Refs #463)

- [ ] 30 s trailer re-cut from the new timeline (`story/trailer.json` + `engine/trailer.js` map on the 24 fps lattice); poster refresh only where the new story demands it
- [ ] Theatre verification: new chapters, trailer mode follows the new map, end card/credits, storyboard wall with new plates, loading/error/empty states, reduced-motion stills, 390 px mobile pass
- [ ] Premiere tests pin trailer build/runtime/frame-parity, caption coverage, posters, end card, fallbacks; root landing + README point at the rebuilt cut

### Final Phase: Integration and End-to-end Audit (Final PR, Closes #463)

- [ ] Full watch-through on desktop + 390 px, all controls green; Builder self-review of frames/stills closed out
- [ ] Reviewer + Tester + Evaluator gates green (Evaluator weighs story legibility, character craft, continuity, emotional impact)
- [ ] Unified docs final pass (`film/README.md`, `film/docs/` as one product view), reproducibility verified from clean checkout

## Current step

Ready for initial build (Phase 1: Story Rebuild and Character Design Foundation)

## Next steps

Builder to implement Phase 1: Story Rebuild and Character Design Foundation with real code and zero stubs

## Team Note

No specialist film agents yet. If review/eval flags a craft gap needing dedicated story/art/animation/score roles, the Lab Engineer hires per `.github/agents/CREATING_AGENTS.md` via reviewed PR.

- the Architect
