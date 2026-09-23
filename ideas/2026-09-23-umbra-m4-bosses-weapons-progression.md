# Umbra M4: bosses, weapons, shop, and dojo

Date: 2026-09-23. Issue: #375. Milestone 4 of the binding epic
(`ideas/2026-09-22-umbra-shadow-fight-webgpu-combat.md`, tracker
`progress/375-umbra.md`). Intermediate PR, `Refs #375`.

## What was built

M4 turns the combat core into a complete game loop: phased boss fights
with unique mechanics, six wieldable weapons with distinct frame data,
an ember economy with shop and upgrades, profile backup, and a training
dojo with frame-data display and combo trials.

**Bosses** (`src/bosses.js`, pure data + `engine.js` sim hooks): Vex the
summoner (telegraphed hollow wisps spawn at the player's feet every 300
ticks with a 90-tick fuse; dodgeable, blockable for chip, parryable),
Ruin the duelist (stance flips between brawler and zoner AI every 420
ticks, overriding the live AI temperament), Dusk the eclipse (damage
x1.35 once hp falls below 40 percent). Hp-fraction phases (0/1/2 at the
2/3 and 1/3 cuts) emit `phase` events that the shell turns into ring
banners; boss fights open with the boss name banner. Boss mechanics
apply identically in story and versus (same code path). Engine design
keeps M2 goldens byte-identical: per-side `movesB`, `power` scales, and
boss dynamics append `hashState` parts ONLY when active.

**Weapons** (`src/weapons.js`): fists, sword, nunchaku, spear, staff,
daggers. Each weapon ships a full 5-move frame-data table over the
canonical move ids (triggers, cancels, and AI strike bands keep working
unchanged), tuned for feel: spear longest (kick 0.44), daggers fastest
(jab startup 3), sword heaviest (uppercut 22), staff best sweep (15),
nunchaku richest cancel graph. Bouts run per-side tables (player weapon
vs foe fists); movesDigest values are distinct per weapon and pinned by
tests. Weapon trail ribbons (`trail.color/width/length`) render in the
shared SceneDesc: colored strokes on Canvas2D, spare particle slots on
WebGL2/WebGPU (no shader changes).

**Progression** (`src/economy.js`, `src/storage/bundle.js`, profile
additive fields): ember awards (60 win + 15/round + 120 boss bonus +
jackpot every 5th career win), two upgrade tracks (damage x1.08/level,
+12 hp/level, 4 levels, 100/200/300/400 costs), weapon shop (buy/equip),
versioned export/import bundles (atomic, validated, never throws).
PROFILE_VERSION stays 2 (committed Tester suites pin it); migration
fills ownedWeapons/equippedWeapon/upgrades/stats.

**Dojo** (`src/dojo.js` + screen): unresisting 200-hp dummy, 1 round,
live frame-data table for the equipped weapon, 6 combo trials checked
against the bout event log (first completion pays ember immediately).

## Key files

- `src/weapons.js`, `src/bosses.js`, `src/dojo.js`, `src/economy.js`,
  `src/storage/bundle.js` (new pure modules)
- `src/combat/engine.js` (movesB/power/boss + `tableFor`/`sidePower`/
  `freshBoss`), `src/combat/fighter.js` (`dmgScale`), `src/combat/types.js`
- `src/render/scene.js` (`weaponTrail`, per-side tables/weapons) +
  all three renderers draw trails
- `app.js` (shop/dojo/versus-weapon screens, boss banners + stance AI,
  awards, export/import), `index.html` (shop/dojo sections, ember pill),
  `theme.css` (frame table, meta nowrap), `sw.js` (umbra-v4)

## Verification

- 300/300 `node:test` green (73 new M4 assertions: weapons 17, economy
  29, bosses/dojo 8, engine 14, trails 5; M2 golden `e9ef3be3` intact,
  red-team DOM/SW contract green)
- Headless Chromium, zero pageerrors: shop + dojo full-page (Canvas2D),
  spear-trail mid-swing harness (`trails:1:0:7511f013`), mobile portrait
  fight with touch dock, WebGL2 ambient
- One real bug caught by screenshots: subagent trail widths were pixel
  units (screen-filling blob); fixed to arena units + validator cap 0.1
  + scene clamp

## Notes

- AI now plans from the foe's own table (`tableForBout(1)`); previously
  it read side 0's table (identical until M4 weapons).
- Versus foes fight barehanded; bosses keep mechanics in versus too.
- G1/G2/G7 stay pending browser/deploy measurement (M5); G4 pass
  extended (boss + weapon replay equality); G5 partial (export/import
  round-trip covered, browser reload + fault injection left for M5).

- the Builder
