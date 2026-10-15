# Pac-Man Wave 2: fullscreen fit, text clarity, level select, packaging

A remediation wave on the Pac-Man terminal arcade (issue #552): the owner
reported shattered/duplicated text, a maze that never fills the window,
less-smooth play, no user level control, and no installable package.

## What was wrong (forensically confirmed)

- The composer magnified the whole 28x34 scene (HUD text included), so at
  2x1 every letter doubled: `SCORE` rendered as `SSCCOORREE`. Captured
  headlessly before the fix.
- Scale capped at 2x1, so a 160x60 window showed a 56x34 maze; the 80x24
  default terminal showed the too-small card instead of playing.
- Smoothness measured fine (steady frames ~50 B via the backend diff
  path, compose+present 77-542 fps headless): the judder was visual, not
  throughput.
- Starting level existed only as a raw CLI flag with no settings, config,
  or discoverability; win-to-next progression already worked.

## What changed

- HUD text rows render at 1x centered over the maze; only the 28x31
  playfield magnifies (fillers keep the glyph, origins carry sprites).
- Scale fills to 4x per axis with an aspect cap (single-tall rows cap at
  2x wide so dashboards dress the sides); short windows play via a 1x
  follow-cam viewport tracking the player down to 28x16.
- Starting level is a first-class setting (screen cycles 1..32, CLI and
  config accept any >= 1 for the endless ramp, deferred to the next run
  like the ruleset, persisted to the config file).
- `pacman/pyproject.toml` ships the game as `pacman-terminal-arcade`
  (`pip install ./pacman`, `pacman-terminal-arcade --play`), verified in
  a clean venv with the full 106-row matrix green from installed code.
- Proof: 10-row `fullscreen` verify section (HUD-once scans, fill pins,
  viewport play/camera/floor, smoothness cap), 475 pytest cases, and a
  7/7 true-pty tour (unicode 100x44/120x50/80x24/160x60, kitty
  100x44/120x50, too-small 20x10) with zero duplicated-letter artifacts
  and symmetric kitty place/erase counts.

Key files: `src/render/scale.py` (fill factors), `src/render/compose.py`
(HUD-split blit, `cam_y`, `paint_viewport`), `src/render/layout.py`
(viewport floor), `src/shell/app.py` (layout-driven size gate),
`src/shell/settings.py` + `config.py` + `cli.py` (level plumbing),
`pacman/pyproject.toml` (packaging).
