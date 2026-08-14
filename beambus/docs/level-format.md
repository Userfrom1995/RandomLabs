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
| `lives` | 3 | Starting lives. |

### `enemy <name> { ... }`

Defines an enemy archetype referenced by waves and bosses. Keys:

| Key | Default | Meaning |
| --- | --- | --- |
| `hp` | 1 | Hits to destroy. |
| `speed` | 80 | Fall speed in px/s. |
| `points` | 100 | Score awarded when destroyed. |
| `radius` | 8 | Collision radius (also the sprite size). |
| `fire_rate` | 0.5 | Base shots per second (0 = never fires). |
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
`at` (seconds into the level). Bosses always use the `orbit` pattern, always
fire, and fire a three-way spread at the player.

### `powerup { ... }`

Spawns a power-up drop at a fixed time. The drop falls down the arena; the
player picks it up by touching it. Keys:

| Key | Default | Meaning |
| --- | --- | --- |
| `at` | 0 | Seconds into the level when the drop appears. |
| `kind` | `spread` | What the drop grants. |

`kind` currently supports `spread`, which raises the player's fire level by
one: single -> twin -> triple spread (capped at 3). Dying resets the fire
level to single, so a level can place drops along its curve to pace the
player's power. A missed drop drifts off the bottom of the arena.

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

## Example

```text
# Beambus level: "The Drone Swarm"
name "The Drone Swarm"
background #0b0e14

player { speed 260 fire_rate 0.16 lives 3 }

enemy grunt { hp 1 speed 90  points 100 radius 8  fire_rate 0.5  color #e8594f }
enemy dart  { hp 2 speed 160 points 250 radius 9  fire_rate 1.2  color #7aa2f7 }
enemy tank  { hp 4 speed 60  points 500 radius 12 fire_rate 0.35 color #c3e88d }
boss        { at 45 kind tank hp 80 speed 40 points 5000 radius 24 fire_rate 0.8 color #ffd23f }

powerup { at 16 kind spread }
powerup { at 30 kind spread }
powerup { at 42 kind spread }

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