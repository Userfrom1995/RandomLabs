# Maze Chase Phase 5: Terminal Publication Layer

First playable layer of the Rust migration (parent #582): a fullscreen
terminal game on the shared engine, installable as `maze-chase-terminal`.

## What was built

New crate `maze-chase/crates/terminal` (0.1.0, one dependency:
crossterm for raw mode/events/resize; everything else std-only and
hand-rolled):

- `layout` - pure canvas fitter: compact 2x1 cells from 62x35, side
  panel on 96+ columns, magnified 4x2 cells on huge rooms, honest
  too-small card, re-computed live on every resize.
- `raster` - shared pixel frame from `Game` state (read-only over the
  engine): beveled walls, dotted crumbs, pulsing sunseeds, relish with
  bob, wardens with fright masks/eyes, Pip with derived facings and
  death clip. Feeds both bitmap tiers so pixels match everywhere.
- `kitty` - hand-rolled PNG (zlib stored blocks, CRC-verified chunks)
  plus base64 plus chunked Kitty transmit-and-display with stable image
  ids; env-gated detection so other terminals never see the escapes;
  Kitty keyboard enhancement pushed on that tier.
- `sixel` - hand-rolled Sixel encoder (palette registers, six-row
  bands, run-length rows) with a DA1 probe request plus conservative
  reply parsing; live probe at startup on a helper thread with a
  250 ms budget.
- `backend` - tier ladder (kitty, sixel, truecolor, legacy) with
  `MAZE_CHASE_TIER` override and a watchdog that drops one tier per
  failure burst and records why (shown on the title screen).
- `unicode` - 24-bit/16-color cell board with facing Pip, letter
  wardens, fright masks, relish diamond, blinking sunseeds.
- `input` - crossterm events to neutral keys through the player's
  keymap to engine headings; Ctrl/Alt combos never leak into gameplay.
- `scores` - machine top-10 (`score | level | mode | date`), corrupt
  lines skipped, parents created on save.
- `chime` - terminal `Audio` sink: BELs for sharp cues, status ticker
  flashes for beats, volumes/mute honored, crumbs silent by design.
- `screens` + `chrome` - pure title/help/scores/settings/key-rebind/
  pause/game-over flows with painted text builders.
- `app` - the session: owns `Game`, routes input to `TickInput`,
  drains events into chime+ticker+tune slots, records scores on game
  over, persists settings, re-fits on resize. No gameplay logic.
- `main` - binary: raw mode plus alternate screen with RAII restore,
  60 fps loop with measured dt, bitmap tiers at 20 fps, synchronized
  output, `--tier`/`--dir`/`--help`/`--version`.

Docs: `docs/terminal.md` (install, launch, controls, tiers, layout,
settings/scores files, Ghostty gap note, troubleshooting), README and
hub status to playable, matrix terminal rows to done.

## Why this shape

- One dependency (crossterm) keeps the terminal shell portable
  (Windows/macOS/Linux raw mode, resize) while pixels, PNG, base64,
  and Sixel stay std-only and fully tested without a TTY.
- Env-gated Kitty plus probe-gated Sixel means no terminal ever sees
  bytes it cannot parse; the watchdog plus title-screen trail make
  every fallback explainable.
- Ghostty plays on truecolor cells (no image protocol): documented as
  a genuine gap with a real fallback, never a silent drop.

## Proof

58 unit + 6 headless integration tests green, workspace fully green,
`maze-chase-verify` 19/19, `--help` smoke, fmt clean, zero clippy
warnings in the new crate. Notable catches: first-run settings save
failed without `create_dir_all` (fixed in app, pinned by the persist
test); fright-mask test first asserted body-fill pixels the mask glyph
never carries (masks use highlight cells); PNG chunk test assumed a
wrong frame split (fixed to 4100-char two-frame case).

## Key files

- `maze-chase/crates/terminal/src/{layout,raster,kitty,sixel,backend,unicode,input,scores,chime,screens,chrome,app,main}.rs`
- `maze-chase/crates/terminal/tests/headless.rs`
- `maze-chase/docs/terminal.md`
