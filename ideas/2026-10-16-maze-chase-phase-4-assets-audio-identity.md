# Maze Chase Phase 4: Original Assets, Audio, and Identity System

2026-10-16. Phase 4 of the Maze-Chase Rust migration (issue #582).
The engine (Phases 2-3) hunts headless and verified; this phase gives
it a face, a voice, and a memory before any publication layer is
built. Everything is original, authored in-repo, and tested without
external assets: no image files, no audio files, no copied tables.

## What was built

**`maze-chase/crates/assets` 0.1.0** (zero deps): `sprites.rs` holds
the whole art store as string glyphs on one legend (`.` transparent,
`#` outline, `o` fill, `*` highlight). Pip is a courier lantern with
three mouth phases; other facings come from tested
`flip_horizontal`/`rotate_cw` transforms so one facing stays
canonical. Four wardens differ by silhouette accent (square brow,
peaked hood, round dome, notched ear plus split hem), readable
without color. Fright is a shared pale mask with a hollow flash twin;
eyes travel as 5x5 pairs; six relish icons carry invented names
(emberberry through starmarrow). `anim.rs` pins the motion numbers
(12 fps chomp, 0.12 s death frames, 6 Hz fright blink inside 1.5 s,
4 s relish bob). `themes.rs` ships Ember Warren, Abyss Lantern, and
Parchment Dawn, all WCAG 4.5+ text contrast with pairwise warden
separation enforced by test.

**`maze-chase/crates/audio` 0.1.0** (zero deps): `cue.rs` routes all
22 engine event strings (enumerated by grepping every `events.push`
in the engine, including the warden `fright-end`/`warden-back` flow)
to a `Cue`; background flips (`wave:*`, `house-*`) map to `None` by
documented decision. `score.rs` composes five original tunes and four
synth SFX recipes as data; layers synthesize locally, so nothing is
streamed or licensed. `sink.rs` gives the backend-agnostic `Audio`
trait plus `NullSink` and `RecordSink` doubles.

**`maze-chase/crates/config` 0.1.0** (engine path-dep only):
difficulty as honest presets over shipped knobs (Cozy = Classic@L1
with reduced flash, Standard = Classic@L2, Harsh = Sprint), keymap
with arrows plus WASD defaults and duplicate-safe rebinds, and a
hand-rolled `key = value` settings file that warns on unknown keys
and falls back to defaults on corrupt values.

**Design pass**: `docs/design.md` pins the visual/interaction
language (glyph system, color, motion, sound, settings, layer
rules); `docs/design-tokens.json` mirrors every theme hex and is
cross-checked by `themes::tokens_mirror_theme_palettes`, so docs and
code cannot drift.

## Why this shape

The engine stays dependency-free and hash-stable: no engine file
changed, both golden hashes intact. New crates are leaf
dependencies (only config reads the engine, for `GameMode`), so
layers can adopt them without touching the sim. Data-as-code keeps
the clean-room story airtight and WASM-safe.

## Key files

- `maze-chase/crates/{assets,audio,config}/` plus workspace members
- `maze-chase/docs/design.md`, `design-tokens.json`, `identity.md`
  (authorship log), `feature-matrix.md` (Phase 4 rows done)
- `maze-chase/README.md`, `index.html` (honest Phase 4 status)

## Notes

Proof: 45 engine unit + 2 golden + 26 hostile/quiescence unchanged
green, plus 20 assets + 13 audio + 18 config, verify 19/19.
Delegation ledger: three parallel subagents authored the crates
against written specs (only known skill customize-opencode covers
opencode config, not game code); primary wired the workspace,
authored the design pass and tokens, updated all docs, and ran full
verification. Formal Design Council review may refine the pass in a
later phase.
