# Pac-Man Progression - fruit, honest modes, themes, scores, and saved settings

The arcade loop is complete; this phase makes it a game you return to.
Bonus fruit ripens under the ghost house, four rulesets genuinely change
how you play, three original palettes restyle every backend identically, a
persistent top-10 table remembers your runs, and your keys, theme, and mode
survive between sessions in a validated config file.

## What was built

- `src/engine/fruit.py` - the bonus-fruit state machine: spawns at 70 and
  170 eaten dots on the corridor tile below the ghost house, 9.5 s expiry,
  tier points from tuning (100 up to 5000), pickup by walking over the
  tile. No randomness, so replays stay bit-identical; death or a fresh
  maze clears uneaten fruit. Covered by the extended canonical hash.
- `src/engine/modes.py` - four honest rulesets as pure modifier functions:
  classic (standard loop), time-attack (120 s countdown on a refilling
  maze), sprint (one life, energizers score but never frighten, clear fast
  for a par-time bonus), fright-frenzy (4x fright windows, slower ghosts).
  Unknown names raise; engine, HUD, CLI, and docs all read this module.
- `src/engine/game.py` - mode plumbing: per-mode lives, ghost and player
  speed multipliers, fright duration and availability, sprint clear-to-win
  with bonus, time-attack refill and timeout, recorded game-over reasons
  (defeat, timeout, cleared), fruit spawn/pickup/expiry events, mode plus
  fruit plus timers in the canonical snapshot.
- `src/render/themes.py` - three original palettes (classic, neon, amber)
  as plain RGB role dicts shared by the painter, docs, and tests.
- `src/render/scene.py` - theme plus reduced-flash painting: themed walls,
  dots, player, and ghosts, a fruit glyph, mode clocks (TIME left/elapsed)
  and the active fruit value in the HUD, steady energizers and unflickering
  fright under reduced flash. Same buffer feeds every backend, so parity
  holds on kitty, sixel, and unicode alike.
- `src/shell/scores.py` - persistent top-10 JSON table (XDG data dir,
  `PACMAN_SCORES_FILE` override): corrupt files read as empty, unwritable
  files fail soft, names scrubbed to short uppercase ASCII.
- `src/shell/config.py` - persistent player config (XDG config dir,
  `PACMAN_CONFIG_FILE` override): binds, theme, reduced flash, audio, fps,
  mode, pilot name. Per-field validation on load, so hand edits degrade to
  defaults instead of breaking the game.
- `src/shell/app.py` plus `screens.py` - mode and theme carried from
  settings into the game and painter; title shows mode, theme, and best
  score; game-over headlines name the reason; a name-entry overlay takes
  raw typing (A-Z 0-9, backspace, Enter saves, Esc skips, Ctrl-C quits)
  around the gameplay keymap, reached only when the run qualifies.
- `src/shell/cli.py` plus `audio.py` - `--mode`, `--theme`,
  `--reduced-flash`/`--no-reduced-flash`, `--name`, `--scores`,
  `--modes`, `--themes`, `--levels N`, `--save-config`, `--scores-file`,
  `--config-file`; unset options fall back to the config file. Fruit has
  its own two-note synth voice; `--self-check` reports fruit and reasons.
- `tests/test_phase5.py` - 30 cases: fruit spawn/expiry/pickup, every mode
  rule, ramp sanity to level 25, theme painting with flash steadiness,
  scores and config persistence, name entry, CLI flags. Suite 233 green.

## Key files

- `pacman/src/engine/fruit.py`, `modes.py`, `game.py`, `tuning.py`
- `pacman/src/render/themes.py`, `scene.py`
- `pacman/src/shell/scores.py`, `config.py`, `app.py`, `screens.py`,
  `cli.py`, `audio.py`
- `pacman/tests/test_phase5.py`

## Notes

- `step()` clamps to 0.5 s per call, so timeout tests must loop many small
  steps rather than one giant one; the sprint bonus reads the post-step
  elapsed clock, not the pre-step value.
- `--save-config` with no action saves and exits; with `--play` it saves
  and then plays. A pushed branch with no open PR stalls the pipeline, so
  the PR goes up in the same run as the code.
