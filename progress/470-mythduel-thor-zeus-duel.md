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

- **Active Phase:** Phase 4: Original Score and Battle Sound (in progress, branch `opencode/issue470-mythduel-phase-4`)

### Phase 1: Original Story and Character Design Foundation (PR 1 target, Refs #470)

- [x] Original cause-of-clash story plus choreography spine (`mythduel/story/`: duel outline, beat list, continuity fields, caption timing skeleton; `choreography.md` exchange spine)
- [x] Original fighter designs (`mythduel/designs/`: model sheets, turnarounds, effort sheets, palettes, silhouettes, original weapon sheets; `story/characters.md` bible; IP declaration committed)
- [x] `mythduel/` scaffold: `index.html` theatre shell under the stable player contract, `repro.sh` plus `tools/` skeleton (render, capture, audit with IP/provenance gates), first green deterministic build
- [x] Unified docs seed (`mythduel/README.md` plus `mythduel/docs/` as one product view) and Builder self-review notes committed below
- [x] `bash mythduel/repro.sh` green; no stub frames presented as finished craft; named stand-ins (if any) listed below

### Phase 2: Boards, Arena and Animatic Cut (PR 2 target, Refs #470)

- [x] Beat-by-beat boards and animatic (`storyboard.json` panels, `duel.json` timed beats with entry/exit continuity, cause links, caption lattice)
- [x] Trailer map skeleton (`story/trailer.json`: 30 s across 7 cuts, lattice-aligned, inside beats; cut built by the premiere phase)
- [x] Painted storm-crag arena (`engine/arena.js`: authored per-beat composition, storm-graded wash layers, seeded detail pass, rain/mist/skyburst atmosphere; capped 390 px budgets; wired into the theatre with feet on the ground line)
- [ ] Painted storm-crag arena (`engine/arena.js`: composition sketch values, wash layers, detail pass, atmosphere pass; honest 390 px budgets)
- [x] Animatic cut playable in the theatre (chapters/beats from the beat map, shot lists on the storyboard wall, captions, trailer skeleton in-repo; transport green)
- [x] Capture loop (per-beat hero frames plus arena plates) plus audit gates (board/duel agreement, shot lattice and hero anchoring, trailer resolution, arena grades/determinism/budgets/plates, continuity ledger, IP/provenance); Builder self-review notes committed below

### Phase 3: Duel Animation and Combat Craft (PR 3 target, Refs #470)

- [x] Fighter rigs (`engine/rigs.js`, `engine/faces.js`, `engine/acting.js`, `engine/fighters.js`): proportion bodies (Thor 7.0 heads, Zeus 7.4 heads, drift 0.00 percent), FK limbs, gripping hands with per-grip weapon states, gaze/blink/brows/effort mouths, combat beats (advance, strike, block, impact reaction, clinch, knee and rise, weathering, withheld opening, loosing), exertion tremor scaled by fatigue 0-7 with ground contact honest (0.00 px float at hero frames)
- [x] Hand-drawn motion pass (line boil on every ink segment, cloth/hair secondary motion per beat wind vector, impact particles anchored to painted geography: spark-spray, sky-crossing, body-blow dust, skyburst crown, withheld touch; 24 fps scrub-exact grid preserved, particle budget 24)
- [x] Fighter close-up cards plus craft tests (`captureFighterCards()` in `tools/capture.mjs`: pose names, contacts, silhouette reads, impact lists; `tests/phase3-combat.mjs`: 41 probes green; model-sheet proportions, effort coverage, turnaround symmetry, 390 px silhouette readability with 3.2 px shoulder gap, impact timing, contact honesty)
- [x] Builder self-review (measured, not eyeballed: contact float, swing apex, impact-frame alignment) committed below; full suite green

### Phase 4: Original Score and Battle Sound (PR 4 target, Refs #470)

- [x] Original score (`score/themes.js`, `score/orchestra.js`, `score/voices.js`, `score/live-audio.js`): four original motif rows (thor-row, zeus-row, clash-ostinato, resolution-hymn), per-cue orchestration with march tempi and beat rides, 842-event deterministic list, six original synth voices, continuous beat coverage with resolving closing notes, no dead air; live WebAudio performer plays the same event lists (phrase parity proven)
- [x] Original SFX (`score/sfx.js`, `score/duck.js`, `score/mix.js`): eighteen procedural foley generators voicing every choreography tag, held-beat hush honestly null; voiced-line-first ducking (score floor 0.45, bed floor 0.70) shared by the offline master and the live performer; deterministic WAV master at the 0.89 ceiling plus seven stems
- [x] Caption rebuild byte-exact (`render-captions.mjs`, VTT match, lattice alignment, per-beat face/impact coverage)
- [x] New sound suites plus audit gates (`tests/phase4-sound.mjs`: 60 probes; audit 40 to 48 gates: score coverage, SFX map, voice/generator coverage, audio sync/bounds, stem rebuild match, duck floors, master bounds, live parity); Builder self-review notes committed below

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

Phase 4 complete: original score and battle sound synthesized in-repo,
performed live in the theatre (volume/mute real), rendered offline to a
deterministic WAV master with stems, 48-gate audit plus 60-probe sound suite
green. Ready for review (Refs #470); Phase 5 (premiere theatre and
behind-the-scenes) is next after merge.

## Builder self-review (Phase 4, 2026-09-28)

- Watched the contract, not waveforms: all 874 audio events sit exactly on
  the 24 fps lattice (drift 0.0) inside their own beats; every beat is scored
  from its first frame to its last (closing notes snap to the motif root and
  ring to the beat edge, counts pinned); live performer enumerates exactly
  the offline phrases per line, and the cue-opening pitch matches the master
  to 0.002 Hz.
- Measured mix: full 172 s master renders in about 20 s at 22050 Hz, peak at
  the 0.89 ceiling, rms 0.096, zero non-finite samples; skyburst region
  (0.124) runs more than twice as hot as the loosing (0.055); every stem
  audible (perc lowest at 0.0052, above the 0.001 floor); ducking sits
  exactly on its floors inside voiced lines and fully open outside them.
- Craft gap closed in-run: the WAV header writer first emitted its fields
  out of narrative order (offsets correct, bytes correct); reordered to the
  canonical layout for readability. The fixer-remedies pin moved 40 to 48
  gates with the 8 sound gates.
- Named stand-ins for this phase: trailer cut is still data only, no trailer
  control rendered (premiere work). No fake controls rendered: volume and
  mute arrived with the working performer, disabled only when no
  AudioContext exists.
- IP: all timbres synthesized from seeded oscillators and noise, no samples,
  no quoted rows (all four motif rows differ from every existing lab row);
  no binaries committed (WAVs only in gitignored dist/); guardrail scan
  covers the new sources.

## Builder self-review (Phase 3, 2026-09-28)

- Watched the contract, not pixels: contact float measured 0.00 px worst
  across all 8 hero frames and mid-beat samples (soles on the ground line,
  lifts only where authored); swing apex at b03 local 6.0 with the impact
  reaction keyed exactly on 6.5 (lattice-exact, lookup-verified); all 6
  impacts on the 24 fps lattice and inside their beats; fighter paint headless
  worst case 306 stub calls with stable reruns (control-flow determinism).
- Proportions machine-checked: 0.00 percent drift on both sheets (7.0 vs 7.4
  heads, shoulders 2.1 vs 1.8); turnaround double-mirror exact with hand swap;
  silhouettes distinct at 390 px (hip ratios 1.35 vs 1.15, 3.2 px shoulder
  gap); effort curve calm in verse (b01 0.12) and hot at every impact (b03
  apex 1.0, b06 weathering 0.75); skyburst is the biggest burst (24/24
  budget); b05 shaft lies on the rock, b04 flights airborne only at the
  crossing window, b08 loosing open-handed.
- Craft gap closed in-run: the first fighters.js draft shipped two
  unterminated color strings (caught by the combat suite import, fixed and
  re-verified); weaponFlight lived in the wrong module for the test import
  (moved reference to fighters.js); audit header and fixer-remedies pin
  updated 32 to 40 gates with the 8 combat gates.
- Named stand-ins for this phase: silent stage stands in for score/SFX
  (Phase 4); trailer skeleton is data only, no trailer control rendered
  (premiere work). No fake controls rendered.

## Fixer response (Phase 2 Quality Council remedies, 2026-09-28)

- Painted the hero duel image past flat rectangles: `player.js` fighters are
  now proportion-blocked figures in design colors (beard/haft-hammer vs
  cloak/shaft-bolt), no debug labels; gallery cards carry a palette-and-staging
  mini-scene SVG; the caption band never paints empty (beat-titled fallback,
  non-empty initial HTML).
- Resilience: `capture.mjs`/`render.mjs` fixture loads fail with one-line
  actionable errors via `loadFixture`; `paintArena` throws a typed error on a
  missing context; arena plates now pin all 5 storm grades; audit header states
  the true 32-gate count. Full suite re-verified green.

## Builder self-review (Phase 2, 2026-09-28)

- Watched the contract, not pixels: the stub-canvas exercise runs paintArena
  across all 8 beats at 3 instants each (24 paints, worst case 915 canvas
  calls, call counts stable across reruns, all returns grade/ground-correct);
  capture cards and the canvas paint path share frameTime, so stills and stage
  agree by construction, and plate checksums pin the geography headless.
- Board/duel agreement is machine-checked both directions: panel entry/exit
  pos+weapon+storm must equal the beat continuity fields exactly, cause
  strings must match byte-for-byte, one shot per panel must sit on its hero
  frame, voiced lines must name a committed caption speaker.
- Craft gap closed in-run: the render-path purity probe first matched its own
  comments ("no Math.random" prose tripping the scan); the probe now strips
  comments before scanning, so it checks code, not prose.
- Grades 0-4 all present across the duel (calm only after the on-screen
  loosing in b08); the skyburst fork is the sole grade-gated effect.
  Ranging-to-breaking rain scales 40-160 drops, slanted by the beat wind
  vector; mist and vignette deepen with storm.
- Named stand-ins for this phase: simplified animatic fighter markers stand in
  for the full FK rigs (Phase 3); silent stage stands in for score/SFX
  (Phase 4); the trailer skeleton is data only, no trailer control rendered
  (premiere work). No fake controls rendered.

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

Reviewer review of Phase 4; then Builder Phase 5: Premiere Theatre and
Behind-the-Scenes on a new phase branch after merge.

## Team Note

No specialist film agents yet. If review/eval flags a craft gap needing dedicated story/art/animation/score roles, the Lab Engineer hires per `.github/agents/CREATING_AGENTS.md` via reviewed PR.

- the Architect
