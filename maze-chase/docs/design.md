# Design: Maze Chase Visual and Interaction Language

Authored 2026-10-16 (Builder pass; a formal Design Council
review may refine but not contradict it). This is the single visual
source of truth for all three publication layers. Companion machine
file: `design-tokens.json` (theme hex values mirror
`crates/assets/src/themes.rs`, which is cross-checked by test).

## Posture

Pip is a courier lantern, not a disc with a mouth: round warm body,
a little handle on top, light spilling from the mouth wedge. Wardens
are hooded watchers, read first by silhouette, second by hue: Bram's
square brow, Kessa's peaked hood, Jory's round helm, Nib's notched
ear and split hem. Frightened wardens lose their hoods entirely and
wear one shared pale mask; the last 1.5 s hollows the mask at 6 Hz.
Eyes travel alone. Nothing here resembles any proprietary sprite: no
skirted ghosts, no candy eyes on stalks, no fruit bonus icons.

## Glyph system

One legend across every sprite (see `crates/assets/src/sprites.rs`):

- `.` transparent, `#` outline, `o` body fill (actor color), `*` white
  highlight (eyes, sparks, halos).

Actors draw on an 11x11 grid, relish icons on 7x7, sunseeds on 7x7
with a two-frame halo pulse, crumbs on 3x3. Pip ships three mouth
phases (open, mid, closed); layers derive left/up/down by the tested
`flip_horizontal` / `rotate_cw` transforms, so the art store holds one
facing and stays consistent. Death plays four shrinking frames at
0.12 s each, ending in a wisp, never a white flash bomb.

## Color

Three original themes, one per mood, all meeting WCAG text contrast
(4.5+) and pairwise warden separation:

- **Ember Warren** (launch default): charcoal-brown dark, ember-orange
  walls, warm parchment text.
- **Abyss Lantern**: deep-sea dark, signal-blue walls, ice text.
- **Parchment Dawn**: light warm paper for bright rooms and
  high-contrast preference, umber text and walls.

High-contrast mode is Parchment Dawn plus thicker outlines; it is a
presentation switch only and never touches the simulation.

## Motion

Chomp at 12 fps looped; death 4 frames one-shot; fright blink 6 Hz
inside the final 1.5 s; relish bob on a 4 s triangle wave; screen
transitions 0.25 s. Reduced-flash mode (default on Cozy) replaces
every blink and flash with a steady hollow mask plus a text banner.

## Sound

Every engine event has a cue (`crates/audio/src/cue.rs`); one-shots
get synthesized SFX recipes, state changes get tunes. Five original
tunes ship as note data: a bouncy title loop, a driving fright loop,
a descending death sting, an ascending clear jingle, a low game-over
sting. Layers synthesize locally (square/triangle/sine/noise per the
recipe) so there are no audio files to license and nothing to stream.

## Settings and difficulty

Difficulty is honest presets over shipped engine knobs only: Cozy is
Classic from level 1 with reduced flash defaulted on; Standard is
Classic from level 2; Harsh is Sprint (one life, no fright, par
bonus). No hidden modifiers, no per-layer gameplay branches. Keymap
defaults cover arrows plus WASD; rebinds reject cross-action
duplicates. Persistence is a human-readable `key = value` file with
forward-compatible unknown-key warnings.

## Layer rules

Terminal, desktop, and web share this design: same glyphs, same
themes, same motion timings, same audio cues. Layers differ only in
controls, presentation density, and genuine capability fallbacks
(documented per layer, never silent). The HUD keeps score, lives
(wicks), level, fright bar, relish banner, and mode clock on every
layer within three rows or their spatial equivalent.
