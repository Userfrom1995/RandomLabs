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
- Rust maze set (to be authored in Phase 2 under `maze-chase/levels/`):
  fresh original layouts with per-file authorship notes (author, date,
  design intent, symmetry choice, tunnel placement, gatehouse position).
  Each level file records its crumb count and flood-fill reachability
  proof. At least the launch maze must differ tile-by-tile from the #552
  layout in multiple regions; the diff is reviewed, not assumed.
- Sprite and audio authorship (Phase 4) will append tool plus date per
  sheet and per bank to this log.

## Brand marks

Wordmark is plain text ("MAZE CHASE") in the theme font; no logo image
implies any external character. Theme palettes are original (launch theme
plus alternates ship with the Design Council tokens in Phase 4).
