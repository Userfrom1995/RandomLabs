# Identity: Naming, Branding, and Maze Authorship

Original identity for the Maze-Chase Rust game. Every name, maze, sprite,
and sound in this project is authored here; nothing is carried over from
any proprietary work. The #552 Python game is a feel reference only.

## Title

**Maze Chase** (binary crates: `maze-chase-terminal` for the terminal game;
desktop and WASM binaries named per layer in their build phases). A generic
descriptive title: a chase through a maze. Tagline: "Outrun the wardens.
Clear the maze."

## Cast

The player is **Rill**, a squat pond frog with two dome eyes breaking the
top of the silhouette. Rill crosses the old pond at dusk while four
predators patrol the water. Each hunter reads by shape first and color
second, so the cast survives the legacy cell rung:

| Hunter | Kind | Style (target function) | Hue | Shape accent |
|---|---|---|---|---|
| Bram | heron | Leader: targets Rill's tile directly; enrages late-level | slate blue | S-neck above long legs |
| Kessa | pike | Ambusher: targets 4 tiles ahead of Rill's heading | river green | dorsal ridge and underbite |
| Jory | snake | Flanker: mirrors Bram across a pivot 2 tiles ahead of Rill | coral | raised head loop |
| Nib | dragonfly | Lurker: hunts Rill while far, retreats to a corner when close | brass amber | doubled crossbar wings |

Scatter corners are the four maze corners, one per hunter. Frightened
hunters bloat into concentric rings filled flat with the theme fright
color (never white, never the eyes slot); the last 1.5 s adds a steady
shape change and the HUD countdown, with a hollow warning mask under
reduced flash. Eaten hunters become directional eye bubbles drifting home
to the gatehouse door.

Backstory (one paragraph, shown on the title screen): Rill crosses the
old pond each dusk while the wardens doze in the gatehouse; gobbling a
sunseed dazes them until the glow fades. Clear every crumb, mind the
tunnel drafts, and do not get caught.

## Terminology allowlist

Pellets are **crumbs**, energizers are **sunseeds**, bonus items are
**relishes** (Lily Charm, Copper Ripple, Reed Flute, Snail Shell,
Dragonfly Wing, Kingfisher Feather), the ghost house is the
**gatehouse**, extra life is a **spare wick**, fright is the **turn**
(as in "turning the tables"). UI copy and code identifiers use only
these terms plus the cast names above.

## Visual identity

The shipped direction is **Pondwake** (Waylight interaction, Lantern
Drift motion), recorded with its tokens in `docs/design.md` and
`docs/design-tokens.json`. The three launch themes are **Dusk Pond**
(dark default), **Morning Shallows** (light), and **Moonwake** (high
contrast); all three clear the text, fright, eyes, and hunter-separation
gates in `crates/assets/src/themes.rs`. Settings saved with the earlier
palette ids (`ember-warren`, `abyss-lantern`, `parchment-dawn`) migrate
to the matching Pondwake theme on load.

Rill's 11x11 baseline and 21x21 high-detail sheets carry three mouth phases, three telling facings
(right, up, down; left is the horizontal mirror), and a four-frame
death-sink into a bubble. The hunters use one 11x11 silhouette each,
plus directional 7x7 eye bubbles, a fright mask, and a hollow warning
mask. The environment uses water-bead crumbs, resting-firefly sunseeds
with a two-frame halo, six 7x7 relish icons, a six-frame 9x9 Golden
Lily, a four-frame pickup burst, turn sparks, and a Lantern Drift
level-clear sweep.

## Maze authorship log

- #552 reference maze (28x31, symmetric, tunnel row 14, 282 crumbs plus 4
  sunseeds, gatehouse center): authored in-repo for `pacman/`; used here
  only as a feel and verification reference. NOT copied into this project.
- Rust launch maze "Ember Warren" (`maze-chase/levels/ember-warren.maze`,
  authored 2026-10-16): 28x31, left-right symmetric, tunnel row
  14, gatehouse center with door tiles at columns 13-14, 445 crumbs plus
  4 corner sunseeds, flood fill from (13, 23) reaches all 449 pickups.
  Differs tile-by-tile from the #552 reference in the top pillar rhythm,
  the row-11 cross corridor, the gatehouse flanks, and the south-center
  vault; only the functional anchors (dimensions, tunnel row, gatehouse
  coordinates, start/mouth tiles) coincide, as the behavior spec demands.
  Loaded at compile time via `include_str!` so the engine stays
  dependency-free and WASM-safe.
- Sprite and audio authorship (authored 2026-10-16, refreshed for Pondwake and the sound overhaul; all original hand-authored data in-repo, no external
  sources): `crates/assets/src/sprites.rs` (Rill 11x11 mouth and facings,
  four silhouette-first hunters, 7x7 eye bubbles, ring fright mask plus
  hollow warning mask, water-bead crumbs, firefly sunseeds, six relish
  icons, Golden Lily, pickup burst, turn spark, death sink),
  `crates/assets/src/anim.rs` (Lantern Drift clips and registries),
  `crates/assets/src/themes.rs` (Dusk Pond, Morning Shallows, Moonwake,
  all WCAG 4.5+ text contrast), `crates/audio/src/score.rs` (five
  original multi-track tunes at one 108 BPM source plus a layered SFX bank
  across seven voice families, synthesized locally by layers, no audio files), `docs/design.md` plus `docs/design-tokens.json` (visual
  language, palette cross-checked by test).

## Brand marks

Wordmark is plain text ("MAZE CHASE") in the theme font; no logo image
implies any external character. Theme palettes are original Pondwake
tokens.
