# Design: Maze Chase Overhaul

This is the single visual and interaction source of truth for every
publication layer (terminal, desktop, web). It was produced by a full
Design Council deliberation (four rounds: propose, critique, revise,
converge) and supersedes the prior direction in full. Companion machine
file: `design-tokens.json`. The palette hexes that mirror
`crates/assets/src/themes.rs` stay untouched in the `themes` section
until the visual implementation lands them together with the Rust
originals (the mirror test reads the tokens file with substring checks).

Chosen direction: Pondwake (identity), Waylight (interaction), Lantern
Drift (motion). Runner-up: Paper Tailor, Ember Cadence, guided
Waystation.

## User summary

The user is a player in one of three postures:

- SSH tinkerer: plays from a real terminal (Kitty, Ghostty, xterm, sixel
  or legacy cells) in 5 to 15 minute breaks, possibly on a light
  background, sometimes over a slow link.
- Web first-timer: opens the game page in a desktop browser, 2 to 5
  minutes in the first session, decides whether the game is worth
  downloading.
- One-thumb commuter: plays in a mobile browser, 60 to 180 seconds,
  sound usually off, touch only.

Top three tasks for every posture:

1. Start hunting without ceremony: first playable input within two
   interactions and under 2.5 s on any layer.
2. Steer confidently: readable hunters, readable player, honest input
   response, no accidental quits or restarts.
3. See progress acknowledged fast: score feedback, best-score context,
   and a clear next goal at every moment.

## Chosen direction: Pondwake

World and identity. The player is Rill, a young pond frog who wakes at
dusk to eat the day's water beads before the pond goes cold. The four
hunters are pond predators that work the shallows after sundown: a
heron (leader), a pike (ambusher), a snake (flanker), and a dragonfly
(lurker). A sunseed burst of light dazes a predator until the glow
sinks. Clean-room statement: generic pond fauna plus light; nothing
echoes a proprietary maze-chase cast, silhouette, or prop; the eyes
drifting home are a flat bubble overlay, never stalks; bonus icons are
non-fruit found objects.

Rationale. The council chose Pondwake because it is the only direction
that ships a complete identity at every rung of the fidelity ladder
with measured contrast headroom, a frog-versus-predator silhouette
split that survives the legacy 16-color rung, and a light-safe theme
set. Every other direction left at least one rung or one accessibility
gate structurally unresolved (Paper Tailor's fright mask failed the
board-contrast gate on all three themes; its rescue hexes are recorded
below for the exhibit).

## Runner-up: Paper Tailor

Tuck, a folded-paper crane on a night cutting-room floor, hunted by
tailor tools (shears, thimble, spool, awl). The council kept the full
proposal as the runner-up exhibit: its fold-crease art direction and
tool silhouettes passed the clean-room review, but it lost on three
recorded counts. First, its fright mask fill failed fright-versus-wall
contrast on every theme (1.89, 1.87, 1.62 where 3.0 is the gate); the
rescue hexes the council computed (#2C2A38 for the mask body, #2A0D16
for its outline) are preserved here for any future resurrection.
Second, the crane's diagonal wing geometry requires a 21x21-authored
cast to read at all, pricing the legacy rung out of the first
implementation. Third, the tailored-tool hunter set lacks a
light-background-safe theme without a second palette pass. Motion and
UX runner-up halves: Ember Cadence (integer-lattice quantization) and
guided Waystation (ceremony-first onboarding) are described in the
deliberation record with the reasons they lost.

## UX flows: Waylight

Waylight merges the two UX proposals: play-first boot (a directional
key starts the hunt immediately) inside the Waystation information
grammar (three-zone title, description strips, repair cards, exit
discipline).

First run, per layer:

- Terminal: launch, then ONE arrow starts play (2 interactions, under
  1.5 s). The title is an overlay over a live attract board; a hint
  strip names "any direction key starts, H help, S scores, Esc
  settings". Esc at the title is a no-op (accidental-quit prevention);
  quitting is only reachable from the pause hub behind a 1 s confirm.
- Desktop: double-click, then an arrow (2 interactions, under 2 s).
- Web: page open, then any key or a board click (2 interactions,
  playable under 2.5 s on a 10 Mbps link).
- Mobile: tap, then one swipe (2 touches); the D-pad and swipe pad are
  visible whenever touch is present.

Screens and states. Attract (runs behind every non-play surface dimmed
40 percent), title overlay (three zones: live attract board left, menu
with per-item description strip right, warden legend plus goal line
bottom: "clear 445 crumbs; sunseeds turn the hunt"), play HUD (score,
best, wicks, level, dots with completion bar, fright and relish badges,
sound chip; fit at the 62x35 compact floor: the three HUD rows carry
score, wicks, level, the dots completion bar, and the fright and relish
badges while active, while best moves to the pause hub and the scores
screen, the sound chip to pause/help, and the four-sigil warden roster
to pause/help plus the wide-window side panel (96 columns and above,
where best and the sound chip also return); no addition introduces a
fourth HUD row; frame diagnostics hidden by default and reachable from
settings), pause hub (frozen board dimmed 55 percent, actors exempt
from dimming and held at 3:1 or better against the dimmed board; quick
chords M mute, R reduced motion, V reduced flash, C high contrast,
applied live and persisted), how-to-play (pages with scripted live
mini-board demonstrations; Enter from any page starts a hunt), scores,
settings (four tabs: Game, Sound, Access, Controls; live-apply; theme
and difficulty apply next hunt), game over (score, crumbs cleared,
warden-eats, best, rank; name entry on web), too-small card (states
the current size and the floor, run preserved), web loading (three
pulsing crumbs plus a real progress line), audio unlock chip, error
surfaces.

Happy path. Title to play is instant on one directional press. During
play every input gets a visible response within one frame budget: the
player sprite turns, the turn caret moves, the crumb counter ticks.
Pause freezes the engine on key-down before any dim. Resume is a cut
(cells) or a 240 ms fade (desktop and web). Score changes count up only
at 30 Hz or above; below that they snap instantly. Fright entry is a
steady mask change plus a HUD countdown bar; the reversion frame lands
exactly when the bar empties.

Empty states. No scores: "The board is empty. The first hunt claims
rank 1." Fresh config: defaults apply with a one-time welcome line
(Cozy-friendly), never a modal. Fresh browser storage: defaults, sound
locked until a gesture. No gamepad: "connect one and it appears here
live."

Error states, each a repair card naming cause, effect, and a one-key
fix. Corrupt settings: renamed to `.bak` plus an on-screen notice.
Corrupt score rows: skipped with a count. Unwritable config directory:
session-only banner. WASM fetch failure: a card that maps file://,
404, and offline cases to exact fixes. WASM version mismatch: names
both versions. WebAudio blocked: chip that retries on the next
gesture. Framebuffer pixel cap exceeded (desktop): card offering
Reduce window or Fullscreen, never a silent freeze. Forced-tier
garbage: restart guidance without `--tier`.

Hostile input. Key mash: run-start limited to one per 500 ms, menus
coalesce repeat at 10 Hz. Destructive edges (quit, restart, name
confirm): a 300 to 500 ms guard. Resize mid-menu preserves surface and
selection; resize mid-pause repaints the overlay with the board frozen.
Browser Back pushes one history guard so Back pauses instead of
leaving; a second Back within 2 s leaves. Touch: `touch-action: none`
on the board, 44 px minimum targets. Denied localStorage: session-only
chip. Terminal below the floor: too-small card with the run preserved.
Gamepad unplug: auto-pause within 100 ms. SIGINT is trapped into the
quit confirm instead of killing the process mid-run.

Accessibility. Pause is the universal hub; M, R, V, C are bare-key
chords (terminal control chords are consumed by the tty, so the design
deliberately avoids Ctrl combinations). The pure accessibility path is
three interactions (Esc, Settings, Access). Every motion and flash has
a first-class reduced path (below). Achievement toasts teach sunseed,
chain, relish, and spare wick exactly once each; they are pinned to a
HUD row and never cover the board.

Web information architecture. The game page opens directly into the
game: full-viewport board, loader inside the board rectangle, title
overlay, no prose. Downloads, install, docs, compatibility, and
releases are dedicated subpages. The pause hub carries a "Get the
full game" row to the downloads chooser (two questions: surface, then
OS; explicit confirm; never auto-download). Play-to-install is four
interactions. Docs render as HTML with link checks; compatibility
carries the verified matrix with named evidence.

## Visual system: Pondwake

Character sheet. Rill is a squat wide body with heavy haunches and two
dome eyes breaking the top contour (the identity). Legacy cell rung:
one directional glyph per actor on the player color pair; the eye cell
renders over the body cell where the tier allows two rows. 11x11 art:
11 wide by 7 tall with 2 px dome eyes. 21x21 art adds a belly seam, a
throat pulse, and 1 px toe webbing. Animation states: hop 2 frames at
6 fps (6 px squash, 9 px stretch), gulp 3 frames at 12 fps, death-sink
4 frames into a ripple ring then one bubble. Facing: the squat body
rotates badly, so Rill is the one intentional break from the
one-facing rule: three telling glyphs (right, up, down), left derived
by flip; `rotate_cw` stays reserved for overlay cells.

Hunter sheets, silhouette first, read at blocky cell rendering:

- Heron (leader, slate blue, `bram` slot): S-neck above long legs,
  tallest silhouette, folded neck loop; movement personality: direct,
  cuts corners late.
- Pike (ambusher, river green, `kessa` slot): low torpedo with a
  dorsal ridge and underbite jaw; personality: sits and lunges.
- Snake (flanker, coral, `jory` slot): low S-ribbon with a raised head
  loop; personality: shadows and cuts off.
- Dragonfly (lurker, brass amber, `nib` slot): doubled crossbar wings;
  personality: drifts and pounces.

Each hunter carries a shape accent at every rung (heron neck S, pike
dorsal ridge, snake head loop, dragonfly crossbar). Hunter-versus-
hunter color separation is enforced by the existing test (pairwise RGB
euclidean distance 60 or better) and the minimum measured distance is
75.85 (Dusk Pond), 72.62 (Morning Shallows), 95.04 (Moonwake).
Player-versus-hunter separation relies on shape identity (the critique's
shape-accent clause): the frog's squat dome-eyed body plan reads
against all four predator silhouettes even when hue collapses, at the
legacy rung included. Forcing a 3:1 pip-versus-hunter hue pair was
rejected because it collapses the prey and predator moods the palette
encodes; the binding gate stays on hunter pairs (60+) and on the eyes
slot (below).

Frightened state: predators bloat with concentric light rings filled
flat with the theme fright color plus a darker 1 px outline; the mask
fill NEVER uses the eyes slot (separate fill rule), never white. Last
1.5 s: steady-state change plus the HUD countdown bar (spec in motion);
any body pulse is capped at 2 to 3 Hz and eye-sized. Reduced flash:
inner ring held steady plus banner "THE TURN ENDS". Eyes-travel-home:
bubble-orbs with a ripple trail pointing along travel, drawn with the
eyes slot directly on the board, hence the eyes contrast gate (below).
Gate-exit and revive: bubble-up 6 frames at 12 fps; reduced motion
falls back to a 2-frame fade.

Environment. Stone banks with 1 px sculpted floor-facing edges (2 px at
21x21), moss flecks, vertical joints every 2 tiles and offset courses
every 3; water floor with caustic dither at 21x21 only; gatehouse lily
ring with a reed door (a two-state shape change: barred and unbarred);
tunnel as a submerged pipe with a current line and a 2-frame entry
ripple (cells and kitty only; sixel gets a static entry frame); crumbs
are water beads 3x3 with a meniscus ring; sunseeds are resting
fireflies 7x7 with a two-frame halo every 416.7 ms (rung-snapped, see
motion). Bonus set: Lily Charm, Copper Ripple, Reed Flute, Snail
Shell, Dragonfly Wing, Kingfisher Feather (7x7 low, 11x11 high, 1 px
bob). Wall readability: dark themes use bright stone edges on indigo
water; light themes use wet dark stone on pale sand-water; legacy
rungs use `#` walls and `%` interiors on ANSI pairs.

Effects vocabulary. Pickup burst 4 frames of a 3x3 expanding ring on a
66.7 ms grid, one burst per crumb pickup (chained pickups step the same
grid and register as one aggregate flash source); chomp 3 frames at
12 fps as a cheek swell; fright morph 2 frames; death ripple then
bubble (window spec in motion); level clear is one 300 ms sweep of the
board plus a 9x9 lily-crown banner; extra life Golden Lily 6 frames 9x9
at 12 fps; score floaters are desktop/web-only 5x7 numerals rising 8 px
over 500 ms on an opaque plate (plate contrast 4.5:1 or better so float
text over a sunseed never falls below the text gate); terminal floats
stay off (no raster digits in the terminal font stack).

Fidelity ladder rules:

1. Legacy cells: 16 ANSI colors plus terminal palette variance; light
   and dark backgrounds both read; hunters differentiate by boldness
   plus hue pairs (bold blue / green / red / yellow class mappings per
   theme); player is the bright player pair.
2. Truecolor cells plus half-block detail: 24-bit color; actors and
   walls down-sample to 1x2 subcells; half-block wall highlight row.
3. Image tiers (sixel, kitty) plus desktop plus web canvas: the same
   rasterized pixel art everywhere, from the same asset data. Kitty
   transmits the static atlas once (<= 256 KiB) and per-entity
   placements after that; sixel repaints full frames at its own
   cadence. Desktop and web canvas render the same raster at their own
   pixel-per-tile.
4. Web DOM chrome and desktop menu composition: CSS and the 5x7
   desktop font; wordmark "MAZE CHASE" everywhere.

What does not survive every rung (accepted and documented): caustics
and feather barbs below 21x21; ring-bloom depth below 11x11; floaters
below truecolor; per-frame particles on sixel (never shipped there:
static or pre-rendered frames only).

Palettes. All 15 slots, uppercase hex. The three launch themes:

| Slot | Dusk Pond (dark default) | Morning Shallows (light) | Moonwake (high contrast) |
|---|---|---|---|
| bg | #0E1E1C | #F4F7F2 | #06080C |
| wall | #38856F | #2C7A5B | #26A088 |
| wall_inner | #1C4A40 | #A8C9B8 | #0F4A3E |
| crumb | #9FB59B | #7A8A80 | #B9C7D1 |
| sunseed | #F2C14E | #A86408 | #FFD84D |
| pip (Rill) | #7ED957 | #2F9E4F | #6BE86B |
| bram (Heron) | #5F87B8 | #3B5C8F | #5FA8FF |
| kessa (Pike) | #3E9B6E | #1F7A4D | #35D06A |
| jory (Snake) | #F25E4A | #C74A33 | #FF6B4A |
| nib (Dragonfly) | #BE8B2A | #8A6A1C | #FFC93C |
| fright | #C8F2EA | #241238 | #E8FFF8 |
| eyes | #D8F4E8 | #16201D | #E0FFF6 |
| text | #E8F0E6 | #1B2A33 | #F2F7F5 |
| dim_text | #9FB3A6 | #5C6F66 | #A9BFB8 |
| accent | #F0B45A | #B35A2B | #7FE8FF |

Measured metrics (WCAG formula, recomputed by the council):

- text/bg: 14.77 / 13.63 / 18.51 (gate 4.5, all pass)
- wall/bg: 3.89 / 4.81 / 6.17
- fright/bg: 14.20 / 15.95 / 19.17
- fright/wall: 3.65 / 3.32 / 3.11 (gate 3.0, all pass; this gate is
  the fix that retired Paper Tailor)
- eyes/bg: 14.76 / 15.44 / 18.90 (gate 3.0, all pass)
- eyes/wall: 3.79 / 3.21 / 3.06 (gate 3.0, all pass; the eyes slot
  renders directly on the board in the eyes-travel-home state, so both
  bounds are binding)
- hunter pairwise minimum RGB distance: 75.85 / 72.62 / 95.04 (gate
  60, all pass)
- crumb/bg: 7.83 / 3.37 / 11.60; sunseed/bg: 10.25 / 4.33 / 14.49
- background luminance: 0.0111 (dark) / 0.9217 (light) / 0.0024 (dark)

The eye slot fix (dark-on-dark and light-on-light previously at 1.03 to
1.08:1) is the corrected-hex change from the critique: #0B1418,
#F4F1FF, and #0A0E14 are retired.

Legacy 16-color fallback, per theme, hunters as hue pairs with bold
distinction: Dusk Pond hunters
bold blue / green / bold red / yellow; Morning Shallows bold blue /
green / red / yellow; Moonwake bright blue / bold green / bright red /
bold yellow. Wall and interior, crumbs, and sunseeds map to their
nearest ANSI pairs; the fallback keeps all four hunters distinct and
Rill's pair distinct from every hunter pair.

Asset inventory: Rill sheet (11x11 and 21x21, 2/3/4 frames), four
hunter sheets (roam, fright, warning, respawn: 4/2/2/6), bubble eyes
5x5 and 7x7, crumbs 3x3, sunseeds 7x7 (2 frames), bonus icons x6
(7x7 and 11x11), Golden Lily 9x9 (6 frames), wall grammar 16 pieces,
effects 5 clips, firefly swarm 5 frames (level clear, cells and kitty
only).

Typography. Terminal: the terminal's own mono font, box-drawing and
half-block glyphs only; no raster type. Desktop: the shipped 5x7 pixel
font for HUD and menus. Web: system-ui CSS stack; wordmark "MAZE
CHASE" with wide tracking. Product name and crate paths are unchanged.

## Motion spec: Lantern Drift (revised)

Leading language: Lantern Drift, revised into a hybrid. Gameplay
positions interpolate continuously at the finest quantum each layer can
pay for (identity-preserving; half-tile snapping at 17 Hz was measured
by the critic to beat against the 12 fps chomp and read as flicker, so
the cell rung keeps tile-locked actors). Ambient motion is quantized
and rung-snapped; transitions are cuts or band wipes on image tiers and
fades only on desktop and web. Every duration below is stated once in
milliseconds and snapped per rung to whole frames (60/120 Hz) or whole
transmits (30/24/12 Hz); no fractional quantum ever ships.

Engine windows the motion design fits (unchanged engine, presentation
only): player 8.5 tiles/s, hunters 8.16, fright hunters 5.06, eyes
12.24, house exit 4.49; death 1.4 s; level clear 2.0 s; fright
duration 6.0 s falling to 0 by level 11; reversion warning 1.5 s;
relish 9.5 s; spare wick at 10,000.

Per-rung duration table (frame counts exact):

| Element | 60 Hz | 120 Hz | 30 Hz | 24 Hz | 12 Hz |
|---|---|---|---|---|---|
| Chomp phases | 5f each | 10f each | 2/2/3 quanta (233 ms) | 2 quanta each (250 ms) | 1 quantum (250 ms cycle) |
| Fright morph | 15f | 30f | 8 quanta (266.7 ms) | 6 quanta (250 ms) | 3 quanta (250 ms) |
| Death window | 12 + 6x4 + 48f = 1400 ms | 24 + 12x4 + 96f = 1400 ms | 6 + 3x4 + 24 quanta = 1400 ms | 34 quanta (1416.7 ms) | 17 quanta (1416.7 ms) |
| Level clear sweep | 18f (300 ms) | 36f | 9 quanta | 7 quanta (291.7 ms) | 4 quanta (333.3 ms) |
| Banner | 54f (900 ms) | 108f | 27 quanta | 22 quanta (916.7 ms) | 11 quanta (916.7 ms) |
| Sunseed halo | 24f (400 ms) | 48f | 12 quanta | 10 quanta (416.7 ms) | 5 quanta (416.7 ms) |
| Pickup burst | 4f grid (66.7 ms) | 8f | 2 quanta | static 2-state | static 2-state |
| Score count-up | 240 ms | 240 ms | 240 ms | instant (below 30 Hz) | instant (below 30 Hz) |
| Overlay fade | 240 ms | 240 ms | cut | cut | cut |

Easing table (named, no unnamed easings anywhere): drift-in
(0.22, 1, 0.36, 1) for entrances on desktop and web; drift-out
(0.64, 0, 0.78, 0) for exits; drift-sway (0.45, 0.05, 0.55, 0.95) for
ambient loops; drift-settle (0.16, 1, 0.3, 1) for pickups; lantern-q8
(smoothstep quantized to 8 levels) for ambient brightness; linear for
gameplay positions, always: interpolation of engine state is exact and
never eased.

Transition inventory per layer: title to play is an instant cut when
the player presses a direction (play-first); pause, settings, scores,
how-to-play, and game over are cuts on cells, kitty, and sixel, and
240 ms drift-in fades on desktop and web; level clear is the single
300 ms sweep; death is the 1400 ms window; relayout is always a cut
(same-frame repaint, delete-before-place on kitty, clear plus full
frame on sixel). Interruption: input on frame N starts on frame N+1; no
transition ever gates input or the simulation; a resize generation
counter cancels in-flight transition effects and restarts them at the
new size where applicable. Any transition burst on image tiers carries
a one-shot budget of 256 KiB.

Effect and feedback inventory (rung-conditional): chomp loops only
while moving; sunseed halo on the rung-snapped period; fear entry and
exit per the fright warning spec below; hunter readability is carried
by a mandatory facing asymmetry of 2 px or more on every rung, plus a
committed-turn cue that lasts to the next junction: a 7x7 glyph spark
at the turn corner on cells, kitty, desktop, and web, recolored to the
theme text color under fright (never body color), static facing notch
only on sixel. Wisps are cut entirely (they showed history, not
intent). Eyes travel with a 3-frame ripple trail on cells and kitty
(never sixel, never reduced motion). Gate state is a two-state door
shape change (barred and unbarred) plus an optional accent blend pulse
capped at 2 Hz and registered as a flash source. Key press
acknowledgment, focus, and press states render within one frame budget
on every layer; error text never shakes.

Fright warning spec (adopted). Entry is a steady-state change: the mask
fills with the fright color at entry and holds. The primary warning is
the HUD countdown bar: it drains in 30 segments (3 frames per segment
at 60 Hz, 90 frames total for the 1.5 s reversion window) and hits
empty on the exact reversion frame. The bar is grayscale-safe: filled
versus empty segments differ by glyph (block, half-block, dot) and by a
3:1 or better segment contrast, never brightness alone. Optional body
pulse capped at 2 to 3 Hz, eye-sized, registered as a flash source.
Reduced flash: steady hollow mask plus dim_text banner. Reduced motion:
identical to reduced flash, with the bar still draining (it is
information, not decoration).

Death window spec (adopted). 200 ms catch freeze (engine continues;
input swallowed), then 4 clip frames at 100 ms each, then an 800 ms
hold: 1400 ms total. The killer cue for the whole window: the frozen
killer at the contact tile, a static 2 px bracket pointing at it, and
"CAUGHT BY <NAME>" on a pinned HUD row. Input policy: swallowed for
the first 1250 ms; exactly one buffered direction accepted in the final
150 ms; overlay dismiss keys never interrupt the window. Reduced
motion: identical window with the clip frames replaced by two static
silhouette states.

Reduced-flash registry (expanded, all sources): fright warning, death,
sunseed pickup, level clear, extra life, chain pop, chained pickup
bursts (aggregate flash risk), the always-on sunseed halo, tunnel
speed smear and entry ripple, the level-clear wall pulse, the firefly
swarm, idle hunter micro-loops (heron throat pulse, dragonfly wing
loop, snake head sway), the web loader pulse, and attract-board
animation. Reduced-motion registry: score floaters, caustic dither,
firefly swarm, attract board, loader motion, eyes trails, turn sparks,
idle micro-loops. Tests: the render-code registry test fails on any
unlisted brightness call site; a capture test renders 180 frames of the
warning window with reduced flash on and asserts no pixel above 0.85
luminance outside eyes and highlights and adjacent-frame delta of 8 or
less in reduced flash and reduced motion.

Budgets in KiB/s per rung, with the shared skip and degrade contract.
Cells (legacy and truecolor): steady ceiling 64 KiB/s, full-frame
ceiling 48 KiB per frame, degrade to 30 Hz when sustained traffic
exceeds 512 KiB/s for 1 s. Kitty: atlas 256 KiB once; steady placement
traffic ceiling 64 KiB/s (about 150 B per entity move, delete plus
place, on a z-layered base image contract where deletion reveals the
base without repaint); degrade to 15 Hz above 128 KiB/s sustained 1 s.
Sixel: 13.7 KiB per 224x248 transmit (0.253 B/px); 12 Hz is 164 KiB/s
and 24 Hz is 329 KiB/s; hard cap 512 KiB/s with backpressure (a frame
is skipped while a prior write is still in flight past 83.3 ms); at
ppt 12 or higher sixel clamps mover motion to 0.5 tiles per transmitted
frame on the low-density cast, so a mover never aliases further than
that quantum; sixel carries static or pre-rendered frames only, never
per-frame animated particles. Desktop: dirty-rect software framebuffer,
p99 frame 8.3 ms, effects add at most 20 percent fill. Web: 60 fps, at
most one allocation per frame, a flat heap over 60 s; degrade to 30 Hz
only after 10 consecutive frames of 20 ms or more, and the fallback is
visible: the dirty-rect canvas bridge is a launch requirement for the
web release, and until it lands a persistent quality chip says
"degraded renderer" (never silent). Shared contract: a rung degrades
after 1 s above threshold, shows a transient quality chip that pins to
the HUD row after 5 s, and recovers upward after 10 s under threshold.

Resize and input contracts. Resize repaints the same frame with
stale-placement kill (kitty deletes all live placements first; sixel
clears; cells redraw), relayout never animates, and a resize landing
mid-transition or mid-pause repaints to the target state with the
engine frozen. Pause freezes the engine on key-down before any dim.
Input: no transition gates input; terminals filter to key-press events
only (Kitty sends press and release); exactly one input buffer; menu
repeat is 300 ms initial and 80 ms thereafter; rebind consumes exactly
one keydown; Q asks a 1 s confirm; SIGINT opens the quit confirm
instead of terminating.

Tester checks (real hosts, concrete observations):

1. Kitty and Ghostty at a full window: title idle bytes are zero,
   exactly one atlas transmit occurs, placement traffic stays at or
   below 64 KiB/s, P paints within one frame, and quit exits before the
   shell prompt returns (this falsifies the current reply-loop flood).
2. Sixel (xterm VT340) plus kitty through several resizes: exactly one
   board and chrome composition per frame, delete-before-place ordering
   visible in the trace, and sustained fright traffic at or below
   512 KiB/s.
3. Legacy and truecolor cells at the exact 62x35 boundary: a hunter
   crossing changes at most its own rows, sustained traffic at or below
   512 KiB/s, and with reduced flash on, no pixel above 0.85 luminance
   outside eyes and highlights while the fright bar drains to empty on
   the reversion frame in both dark and light terminals.

Named recommendation outside engine scope: the engine's 0.35-tile turn
buffer (about 41 ms) is tight against human timing jitter; the council
routed this to the architecture reassessment tracker as a recorded
recommendation. The layers never fake or hide input latency; the
committed-turn cue exists to make accepted turns legible, not to pad
the buffer.

## Sound identity (binding for the sound overhaul)

One tempo source: a single `TEMPO` constant (no duplicated BPM) at
108 BPM with swung eighths, replacing the 132 BPM value duplicated in
three places. The score is pond at dusk: a soft mallet pluck lead
(triangle with fast decay), water-drop blips, and a reed-flute
counterline; fright is a low rising drone with a pulse, resolved by a
two-note fall; death is a sinking glissando, never a buzzer; clear is
an ascending three-note figure; game over is a low settled cadence.
SFX bank: crumb is a 40 ms soft pluck with slight pitch variation; the
chain is a rising pitch ladder; sunseed is a two-note rise; relish is a
sparkling triad; spare wick is a warm bell. Mix: separate master,
music, and SFX levels plus mute, live-applied with 120 ms fades;
defaults are conservative (music 60 percent, SFX 80 percent); the
terminal BEL chime is default OFF and opt-in; the web audio unlock is
a chip tied to the first gesture. Every audio cue keeps a visual twin
(the existing event-to-cue mapping is the checklist), and no cue
flashes.

## Deliberation record

Round 1 (Propose). Each specialist produced two complete directions.
UX: Wicklight (play-first overlays) and Waystation (guided first
hunt). Visual: Paper Tailor and Pondwake, with full three-theme
palettes and metrics. Motion: Ember Cadence (integer-lattice
quantization) and Lantern Drift (continuous interpolation with
oversampled ambience).

Round 2 (Critique, cross-assigned and adversarial). The UX critic
recomputed every palette number, blocked the Pondwake eyes slot (1.03
to 1.08:1 against the board), blocked the Paper Daylight player at
1.18:1, and dissented on the web 30 Hz fallback shipping silently and
on brightness-only warning cues. The Visual critic proved the Ember
Cadence integer-lattice arithmetic false (fractional quanta at 30 and
12 Hz), ruled the 8-step dissolve undrawable (4 legend chars, 3 paint
colors, no opacity), priced kitty fades as full-board transmits (about
1.6 MiB per fade against a 64 KiB/s budget), flagged the 3x3 caret as
rung-inconsistent, required the kitty z-layered base contract, and
demanded the expanded flash and motion registries. The Motion critic
dissented on guards (frames gating input), the missing degrade
thresholds, the death narrative under reduced motion, and the HUD
roster that cannot fit at 62x35.

Round 3 (Revise). UX revised to Waylight (play-first boot merged with
the Waystation card grammar), answering every critique point, including
the Motion critic's HUD-roster dissent (resolved by fit, not by
shrinking: the 62x35 compact HUD carries the live set and relocates
best, the sound chip, and the warden roster to pause/help and the
wide-window side panel, with no fourth HUD row, stated in the play HUD
description). Visual
revised to Pondwake with corrected palettes (the eyes-slot fixes
shipped in this artifact) and retired Paper Tailor with rescue hexes
recorded. Motion: the revision subagent returned empty twice (recorded
in the delegation ledger); the final motion spec above was composed in
primary context from the recorded critique resolutions, which is why
several fixes (tile-locked cell actors, knots, cuts on image tiers,
the expanded registries, budgets in KiB/s) read as adopted rulings
rather than proposals.

Round 4 (Converge). Unanimity-minus-one: the full package is Pondwake
plus Waylight plus Lantern Drift (revised); the named runner-up package
is Paper Tailor plus Ember Cadence plus guided Waystation. The council
chair broke no tie; the dissent is recorded below.

Delegation ledger (round by round):
- Round 1 (Propose): the UX and motion specialist swarms returned
  (Wicklight plus Waystation; Ember Cadence plus Lantern Drift); the
  visual swarm returned empty twice and was recovered by a split
  parts-A pass plus two palette follow-ups (one of those also returned
  empty once, then succeeded).
- Round 2 (Critique): the UX and visual critic swarms returned; the
  motion critic returned empty twice and succeeded on a leaner third
  prompt; the three verbatim dissents are recorded below.
- Round 3 (Revise): the UX revision returned (Waylight, point-by-point
  responses) and the visual revision returned (Pondwake revised, with
  corrected palettes and the Paper Tailor rescue hexes); the motion
  revision returned empty twice (once in the retry session, once on
  the shipping dispatch) and was composed in primary context from the
  recorded critique resolutions.
- Round 4 (Converge): the chair synthesized in primary context from
  the returned rounds; the final motion spec, the hybrid ruling, and
  the dissent framing are primary-composed because the motion revision
  never returned.
- Primary context verified: the corrected Pondwake palette metrics
  recomputed from the recorded critique constraints (the visual
  revision's hexes were lost when the retry session died in Round 3)
  and the artifact cross-checked against the tokens file.
- Skills: no registry skill matched this run's domains (no opencode
  configuration, agent, or plugin edits); none loaded, per
  delegation.md section 5.

Dissent log. Verbatim dissent from Round 2, condensed to the recorded
positions: the UX specialist dissents on shipping any layer with a
hidden quality downgrade, on any warning cue that survives only as
brightness, and on onboarding that withholds the goal for the sake of
speed; the council accepted all three as binding constraints (visible
quality chip, grayscale-safe bar, legend plus goal line on the title).
The Visual specialist dissents on continuous interpolation claims that
measured sub-tile accuracy cannot support, and on drawing transitions
the glyph grammar cannot express; both were adopted (tile-locked cell
actors, no dissolves on cells). The Motion specialist dissents on
gameplay motion that abandons simulation honesty; the adopted hybrid
keeps exact interpolation on desktop, web, and kitty, and quantizes
only where the medium enforces it. The losing-direction dissent from
round 4 (chair-composed from the specialists' recorded positions,
since the motion revision subagent returned empty twice): "Paper
Tailor should not be discarded as merely second-best: its fold-crease
lighting solves the fright-state silhouette problem at the art level
rather than the palette level, and its tool-signage world gives the
bonus set names that teach the fiction in one glance, a property
Pondwake buys only with the legend line. Ember Cadence's auditable
integer timing should remain the council's fallback if Lantern Drift's
continuous-rung budgets fail their kill criteria on real hosts, and
guided Waystation's first-run walkthrough remains the strongest answer
for total beginners that the play-first boot serves less patiently."
The dissent ships unedited as required.

## Acceptance checklist

The Reviewer and Evaluator can verify each item against this artifact
and the tokens file:

1. `crates/assets/src/themes.rs` mirror test stays green (the legacy
   `themes` section of `design-tokens.json` is untouched until the
   visual implementation lands the Rust values together).
2. Every palette gate recomputed and asserted: text/bg 4.5 or better,
   fright versus wall 3.0 or better, eyes versus bg and eyes versus
   wall 3.0 or better, hunter pairwise distance 60 or better, per
   theme.
3. Fright mask never uses a white fill and never uses the eyes slot;
   both dark and light themes carry a readable mask.
4. Reduced flash covers every listed source and reduced motion covers
   every listed source, with the registry test and the 180-frame
   capture test green.
5. All budgets state in KiB/s with the shared degrade contract, and
   the real-host tester checks above pass on their exact hosts (Kitty
   and Ghostty, xterm sixel, legacy and truecolor cells).
6. First playable input within two interactions on every layer, with
   the empty, error, and hostile-input states above reachable and
   correct.
7. Sound: one tempo source, chime default off, volume and mute
   controls live on every layer, no flashing cues.
8. Single unified product documentation view: no internal progress
   counters, no sprint language, zero em dashes.

- the Design Council
