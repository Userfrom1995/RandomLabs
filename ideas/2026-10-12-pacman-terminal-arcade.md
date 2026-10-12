# Pac-Man Terminal Arcade - Architectural Blueprint

- **Issue:** #552
- **Date:** 2026-10-12
- **Track:** Product (End-User Application, terminal game)
- **Stack:** Python 3.11+ (stdlib core, Pillow optional for image backends), Node-free, zero required runtime deps for the guaranteed play path
- **Clean-room rule (binding):** original code, original art, original audio only. No ROMs, no ripped sprites, no copied source, no verbatim timing tables. Mechanics are reimplemented from behavioral descriptions, never pasted.

## Summary

A complete, polished Pac-Man arcade experience that runs directly in the terminal. It targets modern terminals (Kitty, Ghostty, WezTerm, Konsole, iTerm2 3.6+) with the Kitty graphics protocol for sprite-grade visuals, covers Windows Terminal via Sixel, and guarantees a high-quality half-block Unicode plus truecolor fallback that works everywhere including headless CI, `Terminal.app`, and legacy conhost. The game ships all core mechanics (maze, four distinct ghost personalities, power pellets, frightened mode, fruit bonuses, scoring, lives, level progression, tunnel, house exit counters, Elroy stages, authentic movement feel), plus menus, pause/resume, restart, high scores, configurable controls, extra modes, challenges, and visual themes that never compromise the classic core.

## Deliverables

- `pacman/` playable terminal game: `pacman play` runs out of the box on Python 3.11+ with no install step beyond an optional `pip install Pillow` for the image backends.
- Tiered renderer: Kitty backend, Sixel backend, Unicode fallback backend, capability detection with override, auto-degrade on slow frames.
- Deterministic headless engine: pure logic package with seeded RNG, fixed timestep, replay hash, no I/O imports.
- Input, audio, menus, high scores, configurable controls, themes, extra modes.
- Perf scoreboard: FPS per backend, input latency, fallback parity checklist, published in docs and on the Pages hub.
- Docs: `pacman/docs/` (unified product view) plus `pacman/README.md`.
- Pages hub: `pacman/index.html` (play instructions, controls, scoreboard, links into docs). The hub is a documentation and scoreboard surface, not a second game port; the terminal is the play surface.
- Design Council reservation: a `/oc design` pass ships `pacman/docs/design.md` plus `pacman/docs/design-tokens.json` before visual polish is declared done; the Builder implements the chosen direction with real logic.

## Why

Terminal arcade games usually settle for ASCII approximations. Modern terminals can do much better: once-per-run sprite upload with per-frame placement (Kitty), GPU compositing (Ghostty), and synchronized output for tear-free frames. A layered renderer that always works (Unicode baseline) and upgrades where possible (Kitty, then Sixel) delivers a genuinely enjoyable game on every machine while showing what the terminal can do. Python keeps the whole pipeline (engine tests, escape-sequence capture tests, per-OS runners, benchmarks) in one preinstalled language with no native toolchain, so phased builds stay fast and reviewable.

## How It Works

The simulation runs on a tile grid with continuous actor positions. A fixed-timestep accumulator (120 Hz sim, decoupled render at up to 60 fps, game speed tuned for Pac-Man feel around 8 to 12 tiles per second base) advances the deterministic engine. Each tick: read buffered input, update player intent and cornering, update global scatter/chase wave clock, update fright timer, update each ghost (target selection by personality and mode, greedy non-reversing exit at intersections, house logic, tunnel clamp, Elroy override), resolve dot, energizer, fruit, and collision events, emit audio and score events. The renderer diffs the resulting frame buffer against the previous frame and writes only changed cells (Unicode) or changed placements (Kitty), wrapped in synchronized output and the alternate screen. Capability detection picks the best backend at startup; a frame-time watchdog degrades one tier if the terminal cannot keep up. Every advertised flag and menu entry maps to working logic; anything not yet implemented is omitted from the UI entirely.

## Module Breakdown (one coherent system)

- `pacman/src/engine/` (pure, no I/O): `maze.py` (original orthogonal layout, tunnel wrap, dot field generation, walkability queries), `actors.py` (positions, directions, tile-center movement, cornering buffer, reversal rules), `ghosts.py` (four personalities as target functions plus scatter corners, frightened random choice, eyes pathing), `modes.py` (scatter/chase wave clock authored from scratch, fright duration curve, Elroy stages), `tuning.py` (single home for all authored speed, timing, scoring, fruit, counter tables), `game.py` (tick, collisions, lives, level clear, fruit spawn/expire, scoring chains, extra life), `rng.py` (seeded PRNG, 20 lines, in-repo), `replay.py` (input log plus state hash for determinism proofs).
- `pacman/src/render/`: `protocol.py` (tiny `RenderBackend` interface: `init`, `present(fb, dirty)`, `clear`, `shutdown`, all returning strings, never writing stdout directly), `framebuffer.py` (protocol-agnostic cell grid: glyph plus fg/bg plus sprite id), `kitty.py` (atlas transmit once with `a=T`, per-frame `a=p` placements or unicode placeholders, `o=z` quiet, chunked APC, `q=2` quiet mode), `sixel.py` (Pillow rasterize plus quantize, dirty-region emit, capped at 10 fps), `unicode.py` (half-block `▀/▄/█` plus truecolor SGR, cell diff, DEC 2026 sync, alt screen, hidden cursor; the reference backend every other backend must match within one cell), `detect.py` (override flag and env var beats env heuristic beats live query with 100 ms timeout beats safe Unicode default), `atlas.py` (procedural sprite generation: all pixels authored in-repo, shared by Kitty and Sixel; absent Pillow means image backends report unavailable and Unicode carries the game), `diff.py` plus `ansi.py` (cursor addressing, SGR builders).
- `pacman/src/terminal/`: `loop.py` (accumulator, render decoupling, watchdog auto-degrade), `input.py` (raw mode, non-blocking poll, arrows plus WASD plus vim keys, remappable map file, resize handling, sub-50 ms path), `screen.py` (alt screen setup/teardown, graceful restore on crash and Ctrl-C).
- `pacman/src/audio/`: `backend.py` (`AudioBackend` interface: `note`, `sfx(name)`, `tick`, `shutdown`), `null.py` (silent default, never blocks), `bell.py` (optional terminal bell blips), `spawn.py` (non-blocking spawn of `afplay`/`aplay`/PowerShell beep for short WAVs synthesized with stdlib `wave`), `synth.py` (procedural tone generation into WAV bytes, original melodies only). Full-synth fidelity is documented as best on machines with audio players; the game never blocks the loop on audio.
- `pacman/src/shell/`: `menus.py` (title, mode select, pause, resume, restart, game over, level clear flows), `scores.py` (local high-score table with name entry, persisted JSON, anti-tamper hash optional), `config.py` (controls remap, renderer override, theme pick, reduced-flash accessibility toggle, persisted INI/JSON), `cli.py` (honest flags only: `--renderer`, `--theme`, `--level`, `--seed`, `--no-audio`, `--benchmark`, `--record/--replay`).
- `pacman/src/themes/`: `tokens.py` plus theme files (Classic plus at least two original themes, e.g. Neon and Paper; palettes only, maze topology shared). Themes never alter collision or timing.
- `pacman/src/modes_extra/`: challenge variants built on the same engine (e.g. time attack, dot-limited sprint, fright-frenzy score attack), each with its own scoring/ending and menu entry. No variant ships until its rules, HUD, and end screen all work.
- `pacman/tests/`: headless engine suites (fixed-seed replay hashes, wave transition tables, pellet/win/lose invariants, wall-collision fuzz, tick-rate independence 30 Hz vs 120 Hz convergence), renderer suites (byte-capture assertions on `ESC _G`, DCS sixel, `▀`, SGR sequences; backend parity within one cell), input suites (remap loading, buffered-turn behavior), benchmark harness (`--benchmark` emitting FPS per backend plus input latency percentiles into the scoreboard JSON).
- `pacman/docs/` plus hub: unified product docs (controls, renderers, scoring, fruit, themes, scoreboard methodology, support matrix) and `pacman/index.html` hub (play instructions, controls, live scoreboard table, links into docs). Public docs never carry milestone counters or sprint references.

## Key Data Structures and Algorithms

- Maze: compact byte grid (`0` wall, `1` corridor, dot bitmask parallel array), neighbor lookup O(1), A-star only for eyes (tiny grid, bounded); ghosts use greedy Euclidean exit choice O(degree) at intersections.
- Frame buffer: `cols x rows` cell array with dirty-set tracking; diff emit is O(dirty) per frame, typically under 5 ms encode.
- Ghost targeting: pure functions `target(ghost, state) -> tile`; personalities are Leader (player tile), Ambusher (N tiles ahead of mouth), Flanker (pivot vector off Leader), Shy (distance-switched chase/retreat). Scatter corners are four authored fixed targets. Frightened uses seeded RNG turns. All tables in `tuning.py` are authored originals inspired by public behavioral analyses, with provenance comments.
- Determinism: seeded PRNG streams split by subsystem (ghost RNG vs fruit RNG) so visual-only changes never alter simulation hashes.

## Visual and UI Specification (binding, pending Design Council tokens)

- Maze-first composition: maze fills the play area, HUD (score, high, lives, level, fruit pips) above or beside, never overlapping play on the minimum 80x24 surface; larger terminals center the board with theme-colored chrome.
- Entity readability at a glance: player (mouth animation), four ghosts (distinct hues plus shape accents readable for color-blind players), frightened (shared pale face with flash warning), eyes (directional), fruit (original icons), pellets and energizers (pulse animation).
- Motion: smooth tile-center interpolation, buffered turns with corner cut, death and level-clear sequences with fixed beat counts, reduced-flash mode that disables strobing while preserving information.
- Fallback parity: Unicode backend renders the same maze, entities, and HUD layout within one cell of the image backends; the parity checklist in the scoreboard proves it per release.

## Testing Strategy

- Unit plus headless: `pytest` suites for engine determinism, wave tables, fright chains, fruit spawn/expire, house counters, Elroy triggers, tunnel wrap, collision priority (ghost-eat vs death ordering), config validation.
- Escape-sequence capture: backends return strings into `StringIO`; assert Kitty `a=T` once then `a=p`, Sixel DCS framing, Unicode diff minimality; determinism of base64 payloads under pinned Pillow.
- Live terminal verification: Kitty and Ghostty where runners provide them, otherwise headless capture; per-OS runners (Linux, macOS, Windows) cover input methods, audio fallback paths, resize, and Sixel vs Unicode selection; terminal-size matrix (80x24 minimum, 100x30, 120x40, tiny-terminal graceful message).
- Benchmarks: `--benchmark` records FPS per backend, p50/p95 input latency, encode time, and auto-degrade events into `pacman/docs/scoreboard.json`; regressions against the published floor are blocking.
- Baseline parity: the authentic-behavior checklist (personalities, waves, fright, fruit, scoring, tunnel, counters, Elroy) is verified against the spec in this blueprint, not against any copied artifact; each checklist item names its test file and seed.

## Risks and Mitigations

- Ghostty image-subsystem throughput limits: keep atlas small, prefer placements over retransmits, watchdog degrades to Unicode rather than stuttering.
- Sixel re-encode cost: cap at 10 fps, offer `--renderer unicode` on weak machines, document the tradeoff.
- Windows input/audio divergence: single `input.py` abstraction with per-OS readers, audio spawn player per OS, matrix CI on all three runners.
- Pillow absent: image backends self-report unavailable; Unicode always plays; `pip install Pillow` is documented as the one optional upgrade.
- Scope creep into web-playable: explicitly out of scope; Pages is a hub, keeping the build terminal-first and reviewable.

## Evolution Notes for Later Phases

- The architecture supports a future native-audio addon or a Rust render port without engine changes, because the engine is pure and the backend interfaces are string-in/string-out. Those are options, not commitments; no stub flags or menu entries anticipate them.
