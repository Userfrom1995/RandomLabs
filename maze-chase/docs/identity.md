# Identity: Naming, Branding, and Maze Authorship

Original identity for the Maze-Chase Rust game. Every name, maze, sprite,
and sound in this project is authored here; nothing is carried over from
any proprietary work. The #552 Python game is a feel reference only.

## Title

**Maze Chase** (binary crates: `maze-chase-term` for the terminal game;
desktop and WASM binaries named per layer in their build phases). A generic
descriptive title: a chase through a maze. Tagline: "Outrun the wardens.
Clear the maze."

## Cast

The player is **Pip**, a hungry courier lantern outrunning the maze
wardens. Four wardens, each with a distinct hunting style and a
color-plus-shape read (shape accents keep them distinguishable for
color-blind players):

| Warden | Style (target function) | Hue | Shape accent |
|---|---|---|---|
| Bram | Leader: targets Pip's tile directly; enrages late-level | ember red | square brow |
| Kessa | Ambusher: targets 4 tiles ahead of Pip's heading | teal | pointed hood |
| Jory | Flanker: mirrors Bram across a pivot 2 tiles ahead of Pip | amber | round helm |
| Nib | Lurker: hunts Pip while far, retreats to corner when close | violet | notched ear |

Scatter corners are the four maze corners, one per warden. Frightened
wardens share a pale mask face with a flash warning in the last 1.5 s;
eaten wardens become directional eyes drifting home to the house door.

Backstory (one paragraph, shown on the title screen): Pip carries light
through the old warren each night while the wardens doze in the gatehouse;
gobbling a sunseed (energizer) turns the tables until the light burns out.
Clear every crumb, mind the tunnel drafts, and do not get caught.

## Terminology allowlist

Pellets are **crumbs**, energizers are **sunseeds**, bonus items are
**relishes** (authored tier icons, values rising with depth), the ghost
house is the **gatehouse**, extra life is a **spare wick**, fright is the
**turn** (as in "turning the tables"). UI copy and code identifiers use
only these terms plus the cast names above.

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
- Sprite and audio authorship (authored 2026-10-16, all
  original hand-authored data in-repo, no external sources):
  `crates/assets/src/sprites.rs` (Pip 11x11 three mouth phases with
  transform-derived facings, four 11x11 wardens with the accents above,
  5x5 eye pairs, fright mask plus hollow flash, crumb/sunseed frames,
  six 7x7 relish icons: emberberry, sunplum, lanternpod, clockpepper,
  harborfig, starmarrow), `crates/assets/src/themes.rs` (Ember Warren,
  Abyss Lantern, Parchment Dawn, all WCAG 4.5+ text contrast),
  `crates/audio/src/score.rs` (five original tunes plus four SFX
  recipes, synthesized locally by layers, no audio files),
  `docs/design.md` plus `docs/design-tokens.json` (visual language,
  palette cross-checked by test).

## Brand marks

Wordmark is plain text ("MAZE CHASE") in the theme font; no logo image
implies any external character. Theme palettes are original (launch theme
plus alternates ship with the Design Council tokens).
