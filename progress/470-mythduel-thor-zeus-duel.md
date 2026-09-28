# Progress: Mythduel - Original Thor vs Zeus Mythic Duel (#470)

- **Issue:** #470
- **Branch:** opencode/issue470-20260928143105
- **Status:** in-progress
- **Architect:** the Architect (blueprint `ideas/2026-09-28-mythduel-thor-zeus-duel.md`)
- **Builder:** the Builder (phases chain autonomously; Refs #470 until the final acceptance lands)
- **IP guardrail (binding):** Thor and Zeus are original interpretations of public-domain myth figures only. No Marvel Thor likeness/costume/story, no God of War / Sony Santa Monica likeness/design/audio/script, no game or film assets of any kind. Enforced by the audit IP gate every phase.

## Goal

An original Thor-vs-Zeus mythic duel fight scene at production quality (same bar as the short-film commission) at `/mythduel/`: playable Pages film, in-repo reproducible render (scripts plus sources plus deterministic build, no facade player, no stub frames), original designs and docs, original score plus SFX, full Reviewer plus Tester plus Evaluator gates passed. No hurry: every frame carefully rendered and designed.

## Phase Roadmap

- **Active Phase:** Phase 1: Original Story and Character Design Foundation (Complete, ready for review)

### Phase 1: Original Story and Character Design Foundation (PR 1 target, Refs #470)

- [x] Original cause-of-clash story plus choreography spine (`mythduel/story/`: duel outline, beat list, continuity fields, caption timing skeleton; `choreography.md` exchange spine)
- [x] Original fighter designs (`mythduel/designs/`: model sheets, turnarounds, effort sheets, palettes, silhouettes, original weapon sheets; `story/characters.md` bible; IP declaration committed)
- [x] `mythduel/` scaffold: `index.html` theatre shell under the stable player contract, `repro.sh` plus `tools/` skeleton (render, capture, audit with IP/provenance gates), first green deterministic build
- [x] Unified docs seed (`mythduel/README.md` plus `mythduel/docs/` as one product view) and Builder self-review notes committed below
- [x] `bash mythduel/repro.sh` green; no stub frames presented as finished craft; named stand-ins (if any) listed below

### Phase 2: Boards, Arena and Animatic Cut (PR 2 target, Refs #470)

- [ ] Beat-by-beat boards and animatic (`storyboard.json` panels, `duel.json` timed beats with entry/exit continuity, cause links, caption lattice)
- [ ] Painted storm-crag arena (`engine/arena.js`: composition sketch values, wash layers, detail pass, atmosphere pass; honest 390 px budgets)
- [ ] Animatic cut playable in the theatre (chapters/beats from the beat map, captions, trailer map skeleton; transport green)
- [ ] Capture loop (per-beat hero frames plus arena plates) plus audit gates (continuity ledger, lattice, arena coverage, IP/provenance); Builder self-review notes committed below

### Phase 3: Duel Animation and Combat Craft (PR 3 target, Refs #470)

- [ ] Fighter rigs (`engine/fighters.js`, `faces.js`, `acting.js`, `rigs.js`): proportion bodies, FK limbs, gripping hands, gaze/blink/brows/effort mouths, combat beats (advance, strike, block, impact reaction, knockdown, clinch), exertion and weight with ground contact
- [ ] Hand-drawn motion pass (line boil on inks, cloth/hair secondary motion per beat wind vector, impact particles anchored to painted geography, 24 fps scrub-exact grid preserved)
- [ ] Fighter close-up cards plus craft tests (model-sheet proportions, effort coverage, turnaround symmetry, 390 px silhouette readability, impact timing, contact honesty)
- [ ] Builder self-review (measured, not eyeballed: contact float, swing apex, impact-frame alignment) committed below; full suite green

### Phase 4: Original Score and Battle Sound (PR 4 target, Refs #470)

- [ ] Original score (`score/orchestra.js`, `voices.js`): fighter motifs plus clash ostinato plus resolution material, continuous beat coverage, no dead air; live performer plus offline stems from the same event lists
- [ ] Original SFX (`score/sfx.js`, `mix.js`): footfalls, cloth, swings, impacts, storm beds matched to the choreography tags; voiced-beat ducking with measured floors
- [ ] Caption rebuild byte-exact (`render-captions.mjs`, VTT match, lattice alignment, per-beat face/impact coverage)
- [ ] New sound suites plus audit gates (cue coverage, ducking bounds, stem determinism, peak/dynamic-range bounds); Builder self-review notes committed below

### Phase 5: Premiere Theatre and Behind-the-Scenes (PR 5 target, Refs #470)

- [ ] Premiere theatre verification (transport, beat chapters, trailer mode on the final map, end card/credits, storyboard wall, posters, loading/error/noscript/canvas states, reduced-motion stills, 390 px mobile pass)
- [ ] 25-35 s trailer cut from the final timeline plus original poster set
- [ ] Behind-the-scenes surface (designs, boards, pipeline docs linked from the entrypoint; unified `README.md` plus `docs/` final content pass)
- [ ] Premiere tests (trailer build/runtime/frame-parity, caption coverage, posters, end card, fallbacks); root landing points at the duel; Builder self-review notes committed below

### Final Phase: Integration and End-to-end Audit (Final PR, Closes #470)

- [ ] Full watch-through on desktop plus 390 px, all controls green; Builder self-review of frames/stills closed out
- [ ] Reviewer plus Tester plus Evaluator gates green (run on the final PR after review handoff)
- [ ] Unified docs final pass (`mythduel/README.md`, `mythduel/docs/` as one product view), reproducibility verified from clean checkout

## Current step

Phase 1 complete: 8-beat 172 s duel timeline, original fighter bible and SVG
design sheets, working animatic theatre, green repro. Ready for review
(Refs #470); Phase 2 (boards, arena, animatic cut) is next after merge.

## Builder self-review (Phase 1, 2026-09-28)

- Watched the contract, not pixels: verified every storyboard heroTime lands
  inside its beat on the 24 fps lattice via `tools/capture.mjs` (8 cards,
  monotonic frame indices); capture cards and the canvas paint path share
  `frameTime`, so stills and stage agree by construction.
- Continuity ledger hand-checked against the cause-effect table: shaft dropped
  in b05 is grounded in b06 entry (never teleported); split brow and bruised
  ribs persist b05-b08; fatigue 0-7 monotonic; storm 1-2-2-3-3-4-2-0 with the
  only reset being the on-screen loosing in b08.
- Craft gap closed in-run: the first audit draft flagged its own token list
  and the guardrail declarations; the scan now exempts guardrail sentences
  ("No ..." naming a work to forbid it) and the audit tool itself, and the
  negative probe (a stray non-guardrail token) was confirmed to fail the gate
  before removal.
- Named stand-ins for this phase: simplified animatic fighter markers stand in
  for the full FK rigs (Phase 3); wash-layer crag stands in for the painted
  arena (Phase 2); silent stage stands in for score/SFX (Phase 4). No fake
  controls rendered: volume/trailer arrive with their phases.

## Next steps

Reviewer review of Phase 1; then Builder Phase 2: Boards, Arena and Animatic
Cut on a new phase branch after merge.

## Team Note

No specialist film agents yet. If review/eval flags a craft gap needing dedicated story/art/animation/score roles, the Lab Engineer hires per `.github/agents/CREATING_AGENTS.md` via reviewed PR.

- the Architect
