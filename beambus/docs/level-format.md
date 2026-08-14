# The `.beam` level format

Beambus levels are plain text scripts. The parser is strict: every directive
must be known, every number well-formed, every enemy reference defined, and
enemy names unique. A parse failure reports a clear error and refuses to load
the level.

## Structure

A level is a sequence of lines. `#` starts a comment when followed by
whitespace or the end of the line (a `#` directly before hex digits is a
color, e.g. `#0b0e14`). Blank lines are ignored. Blocks use inline braces:
`directive { key value key value ... }`.

## Directives

### `name "Level Name"`

The level title, shown in the HUD.

### `background #rrggbb`

The background color of the arena (default `#0b0e14`).

### `player { ... }`

Player tuning. Keys:

| Key | Default | Meaning |
| --- | --- | --- |
| `speed` | 260 | Movement speed in px/s. |
| `fire_rate` | 0.16 | Seconds between shots. |
| `focus_speed` | 0.5 | Fraction of `speed` while focusing (Shift); 0..1. |
| `lives` | 3 | Starting lives. |
| `life_every` | 10000 | Score interval that awards a bonus life; 0 disables it. |
| `bombs` | 0 | Smart bombs the player starts with; 0 disables the mechanic. |

### `enemy <name> { ... }`

Defines an enemy archetype referenced by waves and bosses. Keys:

| Key | Default | Meaning |
| --- | --- | --- |
| `hp` | 1 | Hits to destroy. |
| `speed` | 80 | Fall speed in px/s. |
| `points` | 100 | Score awarded when destroyed. |
| `radius` | 8 | Collision radius (also the sprite size). |
| `fire_rate` | 0.5 | Base shots per second (0 = never fires). |
| `shots` | 1 | Bullets fired per trigger (1 = single aimed shot). |
| `spread` | 0 | Total fan angle in radians for a multi-shot volley, centered on the player. |
| `color` | `#e8594f` | Sprite color. |

Enemy names must be unique within a level.

### `wave { ... }`

Spawns `count` enemies of a kind, one at a time. Keys:

| Key | Default | Meaning |
| --- | --- | --- |
| `at` | 0 | Seconds into the level when spawning begins. |
| `kind` | `grunt` | Name of a defined enemy. |
| `count` | 5 | How many to spawn. |
| `interval` | 0.4 | Seconds between individual spawns. |
| `pattern` | `drift` | Movement pattern (see below). |
| `armed` | `true` | Whether these enemies fire at the player. |

### `boss { ... }`

Spawns a single large enemy at a fixed time. Keys mirror the enemy def plus
`at` (seconds into the level). Bosses always use the `orbit` pattern and always
fire. `shots`/`spread` work exactly as for enemies, so a boss can throw a wide
fan (e.g. `shots 5 spread 1.2`).

| Key | Default | Meaning |
| --- | --- | --- |
| `rage_hp` | 0 | HP fraction (0..1) at which the boss enrages; 0 disables it. |

When the boss drops to or below `rage_hp` of its maximum HP it enters an enrage
phase exactly once: fire rate doubles, the volley gains two bullets, it glows
with a red pulsing aura, and a growling sound plays. The threshold is data, so
a level tunes how long the calm opening half of the fight lasts.

### `powerup { ... }`

Spawns a power-up drop at a fixed time. The drop falls down the arena; the
player picks it up by touching it. Keys:

| Key | Default | Meaning |
| --- | --- | --- |
| `at` | 0 | Seconds into the level when the drop appears. |
| `kind` | `spread` | What the drop grants. |

`kind` currently supports three drop types:

- `spread`: raises the player's fire level by one: single -> twin -> triple
  spread (capped at 3).
- `shield`: equips a one-hit bubble that absorbs the next hit instead of
  costing a life.
- `bomb`: refills one smart-bomb stock (capped at 9), drawn as a pinwheel so
  it reads differently from the other drops at a glance.

Dying resets the fire level to single, so a level can place `spread` drops
along its curve to pace the player's power. A missed drop drifts off the bottom
of the arena.

## Scoring

- **Combo multiplier.** Each enemy destroyed while the player has not taken a
  hit increments a combo counter. The score multiplier climbs by one every five
  consecutive kills, capped at x4 (x2 at 5, x3 at 10, x4 at 15). The HUD shows
  it next to the score. Taking a hit (shield break or death) resets the combo
  to zero.
- **Bonus lives.** With `life_every N` in the player block, the player earns an
  extra life each time the score crosses another multiple of `N`. Setting
  `life_every 0` disables bonus lives.
- **Grazes.** An enemy bullet that passes within a narrow band around the ship
  (but does not hit it) scores `50` points multiplied by the current combo
  multiplier and rings a soft tick. Each bullet grazes at most once. The HUD
  shows the graze count, so a level can encourage risky close dodging.

## Focus mode

Holding Shift (either shift key) puts the ship in focus mode: it moves at
`focus_speed` of its normal speed (default 0.5) for precise dodging through a
bullet wall, the shot pattern tightens (twin shots converge into a beam, the
triple spread narrows to a tight cone), and a cyan reticle marks the ship's
true hitbox. A soft blip sounds on toggle. `focus_speed` is data, so a level
can tune how dramatic the trade-off is.

## Rank

The game scales its difficulty to the player's performance. A rank meter
(0-100, shown in the HUD, colored by heat) rises by 2 for every enemy
destroyed and 1 for every graze, and drops by 25 whenever the player is hit
(shield break or death). At rank 100 enemy fire rate and enemy bullet speed are
1.6x their base values; at rank 0 they are unchanged. The result is a classic
bullet-hell feedback loop: a hot clean run gets harder, while a struggling
player gets a breather. Rank is derived from play, not from the level script,
so it needs no keys - but its effects combine with everything else in the
format, so a dense level pushes rank up faster.

## Smart bombs

With `bombs N` in the player block the player starts with N smart bombs. A bomb
detonates instantly (B/V): every enemy bullet on screen is cleared and every
enemy takes two points of damage, with kills scoring normally through the combo
multiplier. The screen flashes white and the HUD shows the remaining stock.
Setting `bombs 0` (the default) disables the mechanic entirely. Bombs are a
finite resource, so a level places them as a panic button against bullet
walls rather than a primary weapon.

## Movement patterns

| Pattern | Behaviour |
| --- | --- |
| `none` | Fall straight down. |
| `sine` | Fall while oscillating horizontally. |
| `zigzag` | Alternate horizontal direction every 80 px of fall. |
| `swoop` | Arc across the screen in a smooth curve. |
| `drift` | Fall with a slow horizontal sway. |
| `orbit` | Boss sweep: move side to side, hold altitude near the top. |
| `spiral` | Combined horizontal cosine and damped vertical sine. |
| `chase` | Steer onto the player's column while falling - a dive bomber. |

## Example

```text
# Beambus level: "The Drone Swarm"
name "The Drone Swarm"
background #0b0e14

player { speed 260 fire_rate 0.16 lives 3 life_every 10000 }

enemy grunt { hp 1 speed 90  points 100 radius 8  fire_rate 0.5  color #e8594f }
enemy dart  { hp 2 speed 160 points 250 radius 9  fire_rate 1.2  shots 2 spread 0.6 color #7aa2f7 }
enemy tank  { hp 4 speed 60  points 500 radius 12 fire_rate 0.35 color #c3e88d }
boss        { at 45 kind tank hp 80 speed 40 points 5000 radius 24 fire_rate 0.8 shots 3 spread 0.8 rage_hp 0.4 color #ffd23f }

powerup { at 16 kind spread }
powerup { at 22 kind shield }
powerup { at 30 kind spread }
powerup { at 42 kind spread }
powerup { at 46 kind bomb }

wave { at 2  kind grunt count 6  interval 0.4 pattern sine    armed false }
wave { at 8  kind grunt count 8  interval 0.3 pattern zigzag  armed false }
wave { at 14 kind grunt count 10 interval 0.25 pattern sine    armed true }
wave { at 18 kind dart  count 6  interval 0.5 pattern swoop    armed true }
wave { at 32 kind tank  count 5  interval 0.6 pattern drift    armed true }
```

## Errors

The parser rejects: unknown directives, unknown movement patterns, unknown
enemy references, duplicate enemy names, malformed numbers, malformed colors,
unclosed blocks, a missing quoted name, and a level with no enemies. Each
error is a distinct Zig error value, so callers can distinguish "bad number"
from "unknown enemy".