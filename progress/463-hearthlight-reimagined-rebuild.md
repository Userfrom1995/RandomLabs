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

- **Active Phase:** Phase 2: Human Character Animation Craft (Complete, ready for review)

### Phase 1: Story Rebuild and Character Design Foundation (PR 1 target, Refs #463)

- [x] Rewritten screenplay (`film/story/screenplay.json`): 5 acts, 270 s, per-shot continuity fields (entry/exit state, cause link, flameIn/flameOut chain), per-line dialogue timing (speaker, lattice in-point, dur out-point, emotion tag)
- [x] Character bible (`film/story/characters.md`) with new human leads Tam (17, ferryman's son) and Lumi (8, truth-teller): model sheets (head-unit proportions), turnarounds, expression sheets, costume/secondary-motion notes; Ruel demoted to one supporting appearance (s12); original identity only
- [x] Continuity ledger + dialogue notes (`film/story/continuity.md`, `film/story/dialogue.md`), regenerated `storyboard.json`, re-cued `music-direction.md` (motif rows retained, cue map rewritten, no dead air)
- [x] Pipeline stays green: audit extended with continuity-ledger and dialogue-lattice gates; `captions.vtt` rebuilt byte-exact (43 cues); `bash film/repro.sh` green; all 15 film test suites green; theatre plays the new story (existing craft visuals as stand-ins; no stub controls)
- [x] Builder self-review: caption-only read follows the plot; first watch-through notes committed below

### Phase 2: Human Character Animation Craft (PR 2 target, Refs #463)

- [x] New `film/engine/humans.js` (proportion bodies, FK limbs, hands, costume) + `film/engine/faces.js` (heads, gaze/blink, brows, phoneme mouth set, expression blender)
- [x] New `film/engine/acting.js` (anticipation/action/reaction/hold beats, weight shifts, exertion, secondary-motion drivers fed by per-shot wind)
- [x] `rigs.js` re-rigged onto human leads (placeholder figures retired; creature rigs demoted to support); face-safe line boil in `ink.js`
- [x] Capture loop extended (face close-up cards per lead per emotion); craft tests pin proportions, expression coverage, turnaround symmetry, 390 px silhouette readability

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

Phase 2 complete: four human leads walk the frame with expressive faces
and eased acting; pipeline green. Ready for review.

## Phase 2 watch-through notes (Builder self-review, 2026-09-27)

- Staging probe: draw-call logs of s05/s12/s13/s19 contain every staged
  lead's costume key (Nia cloak, Yara shawl, Tam vest, Lumi tunic, Ruel
  hide in s12 only) at both 960 and 390 px widths. The party walks: Tam
  belays s12 with the oar yoked, carries Lumi on his back in s13 and she
  rides Nia's arms in s14, then walks the coda with her stick in s19.
- Faces: the active dialogue line plays on its speaker (probe: s14 first
  line emotion reaches the rig with a valid viseme); between lines the
  bible beat holds. All 153 emotion-by-phoneme combinations render without
  throwing; M/B/F close the lips, A opens tall.
- Craft deltas: 18 face cards hashed (5 Nia, 4 Yara, 5 Tam, 4 Lumi), all
  distinct, byte-identical rerun. Face boil is lattice-locked at 0.35x body
  amplitude. Acting reaches all four phases across the cut; exertion peaks
  on the gorge traverse and storm carry.
- Full suite green: repro (audit, smoke, premiere, captions 43 cues),
  craft, craft-humans, performance, smoke, tester phase1/3/4/5, theatre,
  score, determinism, final-audit, regression eval3/4, phase2-live/polish.
- Known stand-ins for Phase 3: backgrounds are still the earlier paint set
  (repaint location by location next); walk cycles have ground contact but
  no location-specific weight pass yet; cloth/hair secondary motion is
  driver-level, full location-anchored pass next.

## Team Note

## Phase 1 watch-through notes (Builder self-review, 2026-09-27)

- Caption-only read of `film/captions.vtt` (43 cues) follows the plot with
  no picture: failure (s01-s04), debt (s05-s08), gorge party (s09-s12),
  choice (s13-s14), wind turn (s15-s16), many flames (s17-s18), knot
  (s19-s20). No line needs the picture to make sense.
- Chain verified by machine: 20/20 continuity ledgers chained
  (flameIn equals previous flameOut: full > faltering > dark > kindled >
  guarded > half > stub > cairn-lit > many), 20/20 cause links naming the
  previous shot, 43/43 dialogue lines on the 24 fps lattice with closed
  speaker/emotion sets, sorted and non-overlapping.
- Capture + render loops paint all 20 hero frames and 55 manifest files
  with no throws; final-audit 240/240 watch-through sweep green on desktop
  and 390 px widths.
- Score/SFX stems byte-identical to the #449 cut (602/602 score events,
  50/50 sfx events): same cue keys, motifs, tempos, timings; only mood
  prose changed. The re-cue is intentionally conservative in Phase 1; Phase
  4 re-anchors SFX to the new action beats and adds dialogue-first ducking.
- Known stand-ins at Phase 1 close (resolved in Phase 2 unless noted):
  the stage drew the earlier rigs, so Tam/Lumi had no bodies yet and Ruel
  still walked shots the new story gives to humans. Phase 2 replaced the
  rigs (this file's Phase 2 notes above); nothing in the theatre pretends
  otherwise.
- Trailer labels re-cut to the new beats; timing untouched, lattice parity
  holds (720/720 frames).

## Next steps

Reviewer (`/oc review`) on Phase 2, then Builder Phase 3: Painted World
and Hand-Drawn Motion (`backgrounds.js` location repaint, motion pass with
grounded cycles and anchored weather, background-plate capture).

## Team Note

No specialist film agents yet. If review/eval flags a craft gap needing dedicated story/art/animation/score roles, the Lab Engineer hires per `.github/agents/CREATING_AGENTS.md` via reviewed PR.

- the Architect
