# Clean-Room Log and Legal Guardrails

Binding for every phase of the Maze-Chase Rust migration (issue #582).
The rule is simple: original code, original names, original mazes, original
art, original audio, original branding only. Mechanics are reimplemented
from behavioral descriptions and legitimate public sources, never pasted
from proprietary sources, ROMs, ripped sprites, or copied timing tables.

## Sources consulted (complete log)

1. The in-repo #552 Python game (`pacman/`) as empirical input: ghost
   timing feel, renderer tier practice, layout engine behavior, and the
   verify-matrix discipline. It is behavior to reimplement, not code to
   port: no file from `pacman/` is copied into `maze-chase/`; algorithms
   are rewritten in idiomatic Rust from the behavioral contract in
   `behavior-spec.md`.
2. Public behavioral descriptions of the maze-chase genre (genre-level
   mechanics: four ghosts with distinct chase styles, alternating
   scatter/chase waves, power-pellet fright with escalating chain bonuses,
   dot-counter house exits, tunnel slowdown, endgame pursuer pressure,
   fruit bonuses, escalating levels). No proprietary source code, ROM
   dumps, disassembly, sprite rips, sound rips, or timing tables.
3. Public API documentation of the selected Rust crates (macroquad,
   miniquad, ratatui, crossterm, rodio, wasm-bindgen) for capability
   assessment only; no example game code is vendored.

## Flagged items (must be resolved before release)

- **Maze geometry similarity**: the #552 maze is itself an original
  authored for this repo, so referencing its feel is safe; nevertheless,
  shipping a near-identical 28x31 layout in the Rust game invites
  lookalike comparison. Mitigation: Phase 2 authors fresh original maze
  files (`levels/*.toml`) with their own authorship notes; any geometry
  carried over is documented tile-by-tile with a rationale, never assumed.
- **Lookalike sprites and sounds**: pixel-level resemblance to any
  proprietary character or jingle is rejected at review. Mitigation: all
  sprites are authored in-repo from the identity sheet (`identity.md`);
  all audio is synthesized in-repo; the Reviewer checks resemblance as a
  blocking gate.
- **Cloned data tables**: speed curves, wave clocks, fright durations, and
  scoring chains must be authored originals with provenance comments in
  `tuning.rs`, even where the values rhyme with genre conventions. The
  #552 numbers are feel references, not values to transcribe blindly.
- **Trademarked terms**: no trademarked character names, game titles, or
  brand terms appear in code identifiers, UI copy, asset filenames, docs,
  or commit messages. The naming table in `identity.md` is the allowlist;
  anything else is a blocking finding. In particular, the words
  "Pac-Man", "Blinky", "Pinky", "Inky", and "Clyde" must never appear in
  this project (this very sentence is the last permitted mention, kept
  here so future contributors know what to avoid).

## Naming rationale

The project title "Maze Chase" is a generic English description of the
genre (chasing through a maze), not a brand. Character names (Pip, Bram,
Kessa, Jory, Nib) are invented diminutives with no external referent; see
`identity.md`. Internal module names (`engine`, `ghosts`, `tuning`,
`verify`) are descriptive engineering terms.

## Per-phase obligations

- Every phase PR keeps `legal.md` current: new sources appended to the log
  above, new flags added with mitigations, resolved flags marked with the
  resolving commit.
- Asset-landing phases (Phase 4) must record the authorship tool and date
  per sprite sheet and per sound bank.
- Replacing assets alone is never assumed to remove all risk; anything
  needing real legal review is flagged here and escalated to the
  Maintainer rather than shipped on assumption.
