# Clean-Room Log and Legal Guardrails

Binding for the whole Maze-Chase Rust project (issue #582).
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

## Flagged items (all resolved for the verified release)

- **Maze geometry similarity**: resolved. The shipped maze is "Ember
  Warren" (`levels/ember-warren.maze`, first landed at `f37855cf`), an
  original 28x31 layout authored for this project with a tile-by-tile
  difference record and a flood-fill proof in `identity.md` and the
  file header; only the functional anchors (dimensions, tunnel row,
  gatehouse coordinates, start/mouth tiles) coincide with the #552
  reference, as the behavior spec requires.
- **Lookalike sprites and sounds**: resolved. Every sprite is authored
  in-repo from the identity sheet and every sound is synthesized
  in-repo as data (`crates/assets` plus `crates/audio`, first landed at
  `e8da9720`; authorship log in `identity.md`); no external image or
  audio file ships anywhere in the tree. Resemblance stayed a blocking
  review gate through every round, including the final Quality Council
  pass.
- **Cloned data tables**: resolved. Every value in `tuning.rs` carries
  provenance comments and was re-expressed from the behavioral
  contract (`72a52df1`, extended by the ghost-intelligence work at
  `1a464d26`); the #552 numbers were feel references, never
  transcribed.
- **Trademarked terms**: resolved. The naming allowlist in
  `identity.md` governs every identifier, UI string, asset filename,
  doc, and commit message; a tree-wide sweep at release finds the
  banned terms only in this bullet, which names them as forbidden. The
  words "Pac-Man", "Blinky", "Pinky", "Inky", and "Clyde" appear
  nowhere in code, assets, UI copy, or shipped documentation (this
  sentence is the last permitted mention, kept here so future
  contributors know what to avoid).

## Naming rationale

The project title "Maze Chase" is a generic English description of the
genre (chasing through a maze), not a brand. Character names (Pip, Bram,
Kessa, Jory, Nib) are invented diminutives with no external referent; see
`identity.md`. Internal module names (`engine`, `ghosts`, `tuning`,
`verify`) are descriptive engineering terms.

## Release obligations

- Every PR keeps `legal.md` current: new sources appended to the log
  above, new flags added with mitigations, resolved flags marked with the
  resolving commit.
- Asset changes must record the authorship tool and date
  per sprite sheet and per sound bank.
- Replacing assets alone is never assumed to remove all risk; anything
  needing real legal review is flagged here and escalated to the
  Maintainer rather than shipped on assumption.
