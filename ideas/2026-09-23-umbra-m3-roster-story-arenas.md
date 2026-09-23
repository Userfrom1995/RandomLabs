# Umbra M3: roster, story, and five arenas (Builder writeup)

Date: 2026-09-23. Issue: #375. Branch: `opencode/issue375-umbra-m3` (PR `Refs #375`).
Milestone: M3 (characters + story + levels) per `progress/375-umbra.md` and the
binding blueprint `ideas/2026-09-22-umbra-shadow-fight-webgpu-combat.md`.

## What was built

Original lore ("The Ashen Veil", five Ember Seals, the Gate of Dusk) with a
17-node story chain: prologue + 5 acts x (intro dialogue, act-guardian fight,
outro dialogue) + epilogue. Roster: 3 playables (Kaito the Ronin starter,
Mira the Duelist, Goran the Bulwark) + 5 enemy archetypes (Echo, Ash, Ruin,
Vex, Dusk), each with distinct silhouette rig, hp, AI temperament/difficulty,
rim accent, and backstory. Five arenas all playable (data existed in M1; M3
wires selection, ambient previews, and HUD naming).

## How it works (key files)

- `umbra/src/roster.js`: pure roster DATA + `validateRoster()` (ids, hp,
  AI refs, rig ranges, accents, ratings, unlock shape). `fighterById()`.
- `umbra/src/story.js`: pure graph + `validateStory()` (chain integrity,
  reachability, no dead ends, roster/arena refs, no em dashes),
  `storyCursor()` / `completeNode()` / `applyStoryUnlocks()` (idempotent).
- `umbra/src/dialogue.js`: pure typewriter model (advance/reveal/next).
- `umbra/src/storage/profile.js`: schema v2 (unlockedFighters with Kaito
  grandfathered, story.completed/current, currency shell for M4).
- `umbra/src/poses.js`: `solveRig()` takes optional `rig` multipliers;
  identity is bit-exact (M1/M2 golden hashes untouched, pinned by test).
- `umbra/src/render/scene.js`: `buildSceneDesc()` takes optional per-side
  `rigs` (presentation-only; sim and hashes never see them).
- `umbra/app.js` + `index.html` + `theme.css`: select screen (locked cards
  name their unlock), story map (done/current/locked), typewriter dialogue
  box over the ambient act arena, versus setup (foes gated by reached acts,
  arenas by unlocks), named bouts with per-side roster hp + enemy AI,
  story win banks progress and continues the tale (Continue button), loss
  earns nothing.
- `umbra/sw.js`: cache `umbra-v3` covering the new modules.

## Why these choices

- Zero engine risk: roster stats apply at bout setup (hp per side, AI
  temperament), which the engine already supports (asymmetric maxHp across
  rounds). No sim fields added, so every M2 determinism golden holds.
- Rigs are presentation-only multipliers, never sim state: silhouettes
  differ per character while replays stay byte-identical.
- Power/speed/technique are display ratings (labeled as such); real
  damage/speed modifiers arrive with M4 weapons. No facade: nothing in the
  UI claims a modifier that is not applied.
- Dialogue has no `aria-live` (keeps the Tester gate2 pin): the box is
  user-paced with a focused Continue button, readable on demand.

## Verification

- 199/199 `node --test umbra/tests/*.mjs` green (26 new M3 tests).
- Headless Chromium (puppeteer-core + system chromium, SwiftShader):
  select/dialogue/fight desktop, select mobile portrait, act-3 story map,
  versus gating; zero pageerrors. Shots in `umbra/docs/shot-m3-*`.
- Scoreboard M3 rows written; G4 pass carried, G3/G5/G6 partial with
  evidence, G1/G2/G7 pending browser/deploy (M5).

## Notes

- Deferred to M4: bosses (phased), 6 weapons + movesets, dojo, shop/loot,
  export/import. Deferred to M5: SFX/music, VFX pass, onboarding, a11y
  audit, measured G1/G2/G7, landing + root README sync.
- Versus `?screen=fight` boot hook keeps M2 defaults (Kaito vs Echo,
  arena 0); full select flow is two clicks away.

- the Builder
