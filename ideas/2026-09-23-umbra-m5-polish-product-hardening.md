# Umbra M5: polish plus product hardening (final milestone)

## What was built

M5 closes the Umbra epic (issue #375) as a complete game: everything a
player hears, sees at impact, learns from, and relies on for access.

- **Audio** (`src/audio/`): pure synth SFX descriptors (`sfx.js`, 11
  voices) rendered by a thin WebAudio wrapper (`engine.js`, unlock on
  first gesture, no-op without a context); adaptive 5-arena music
  (`music.js`, mulberry32 patterns, calm/fight/boss intensities);
  persisted mute toggle in settings.
- **VFX** (`src/vfx.js` + shell + all 3 tiers): deterministic bursts
  (spark/dust/ring) expanded to points and drawn as Canvas2D additive
  dots or GPU spare-particle slots; DOM hit-flash overlay plus canvas
  shake, both fully gated off under reduced motion; 45-tick KO slow-mo
  in the fixed-step clock.
- **Tutorial** (`src/tutorial.js` + dojo-gate screen + bout): 6-step
  pure machine (move, jab, block, special, dash, win) against a
  difficulty-0 turtle gatekeeper; graduation banks 25 ember once.
- **Accessibility**: 24-pair contrast audit (2 fixes), focus placement
  plus modal Tab trap, single live region, OS motion default, haptics
  skip under reduced motion, visible phone fighter names.
- **Ledger**: `?bench=N` hook (rAF deltas, render cost, nav timing);
  G1-G7 MEASURED in headless Chromium; SW umbra-v5; 3000-tick fuzz.
- **Surface**: landing card, root README entry, 4 M5 screenshots.

## Why

M1-M4 built engine, content, and systems; M5 makes them feel like a
shipped game (sound, impact, teaching, access) and replaces every
pending gate with a measured number.

## How it works

Fight events fan out in `handleFightEvents`: SFX per kind, haptic
pattern per kind (throttled, motion-gated), contact midpoint cached for
spark enrichment. `frame` computes `fightSparks` (cached enrichment,
40-point cap) into render opts, applies flash/shake overlays, and
scales the clock by `slowMoFor`. Tutorial feeds a sim summary into
`tutorialUpdate` once per tick. Music intensity flips to boss on phase
events; menus play the calm loop once audio unlocks.

## Key files

`umbra/src/audio/{sfx,music,engine}.js`, `umbra/src/vfx.js`,
`umbra/src/input/haptics.js`, `umbra/src/tutorial.js`,
`umbra/app.js` (wiring), `umbra/index.html` (tutorial screen, flash,
prompt, mute), `umbra/theme.css` (contrast, prompt, names),
3 renderers (spark slots), `umbra/sw.js` (v5),
`umbra/tests/{test-audio,test-vfx,test-tutorial,test-m5-integration}.mjs`,
`umbra/docs/scoreboard.md` (M5 MEASURED).

## Notes

- Headless SwiftShader stalls presentation (~100 ms/frame ReadPixels);
  game-side submit cost is what the ledger asserts (0.5-0.6 ms p95).
- Screenshot review caught a real regression (hidden phone names) and
  fixed it before shipping.
- `flashShake` flash/shake were dead values until M5; now consumed by
  the overlay/shake path with the reduced-motion gate the audit demanded.
