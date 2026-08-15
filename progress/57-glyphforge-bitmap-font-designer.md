# Progress - Glyphforge

- **Issue:** #57
- **Branch:** opencode/57-glyphforge-bitmap-font-designer
- **Status:** in-progress
- **Updated:** 2026-08-15T00:50:00Z

## Checklist
- [x] scaffold project + progress file + ideas entry + branch + Makefile (builds, jar runs, --version/--selftest stubs)
- [x] core: Glyph, Rect, Font, Raster (autotrace RLE), FontIO (.gff), Metrics
- [x] renderer: ascii/blocks/ansi modes, scaling, newline/undefined handling
- [x] codegen: Kotlin/Java/C/text exporters (deterministic, round-trip tested)
- [x] editor: headless state machine + script commands + undo/redo/clipboard
- [x] TUI: ANSI interactive editor frontend (keyboard-driven, no prompts)
- [x] CLI: new/edit/import-art/render/export/info/list/validate/dump + --selftest
- [x] sample fonts: micro5x7 (95 ASCII) + pico3x5, generated .gff + exported code
- [x] tests: full suite green via self-test harness (126 tests)
- [x] iteration/improvement cycle, part 1: kerning pairs (format, renderer, exporters, editor script command, tests)
- [x] iteration/improvement cycle, part 2: HTML specimen page generator (frontend) + sample artifacts
- [ ] docs: README, docs/index.md + index.html, format.md, codegen.md, landing page, root README
- [ ] final push, Status: complete, PR with Closes #57

## Current step
Run 4 finished the mandatory iteration cycle with two shipped
improvements. Part 1: kerning pairs across the whole stack (core Font table,
.gff kern: lines, kerning-aware renderer, kern tables in all six exporters,
editor `kern` script command, 17 tests). Part 2: the HTML specimen frontend -
a new `specimen` command generates a self-contained, zero-dependency HTML
page (embedded font data + a kerning-aware live preview in ascii/blocks modes
at any scale + a glyph gallery), verified headless with node and covered by 7
suite tests + 2 CLI tests; the sample fonts now ship Micro5x7.html and
Pico3x5.html. The sample fonts also gained real kern tables (10 pairs for
micro5x7, 5 for pico3x5) applied through the new editor script commands, and
every code artifact was regenerated and compile-checked (kotlinc + javac);
the generated Kotlin renderText honors kerning. 135/135 tests green. Next:
the docs (README details, docs/index.md + index.html, format.md, codegen.md,
landing page, root README), then the final push.

## Next steps
- Write the docs (README details, docs/index.md + index.html, format.md, codegen.md, landing page, root README).
- Mark Status: complete and push.

## Agent log
- 2026-08-15 (run 1): oriented (builder.md, AGENTS.md, FACTORY.md, README,
  index.html, previous projects roteria/beambus/gambit for conventions),
  verified JDK 17 + kotlinc 2.4.10, created branch
  opencode/57-glyphforge-bitmap-font-designer, scaffolded the project tree
  (core/codegen/editor/cli + tests + sample), Makefile (kotlinc, zero deps),
  README skeleton, .gitignore entry, minimal compiling CLI stub, progress
  file, and ideas entry. Pushed scaffold milestone, opened PR #58.
- 2026-08-15 (run 2): implemented the full engine: core domain (bit-packed
  Glyph with 17 tests, Font, Rect, Raster RLE autotrace + packRle compact
  byte streams, strict .gff FontIO with line-numbered errors, Metrics),
  Renderer (ascii/blocks/ansi, scale, advance, undefined chars), codegen
  exporters (kotlin/java/c/text + kotlin-rle/c-rle, deterministic, arrays
  re-parsed to rebuild original pixels in tests), headless Editor state
  machine + ScriptParser/ScriptRunner + ANSI TermUI frontend, and the full
  CLI (new/edit/import-art/render/export/info/list/validate/dump, --selftest,
  strict arg validation). Fixed bugs found by the suite (art '#' pixel vs
  comment conflict switched to '//', glyph-line colon split, working-glyph
  aliasing on commit, row ordering in canonical runs). 109/109 tests green.
  Pushed milestone.
- 2026-08-15 (run 3): authored the real font artifacts by hand: micro5x7
  (all 95 printable-ASCII glyphs drawn in a 5x7 grid as ASCII art) and
  pico3x5 (space, period, digits, A-Z in a 3x5 grid). import-art generated
  Micro5x7.gff + Pico3x5.gff (both validate), eyeballed renders in blocks
  mode, and exported deterministic code artifacts (Kotlin/Java/C/text, plus
  kotlin-rle and c-rle). Committed sample fonts + exports milestone.
- 2026-08-15 (run 4): iteration cycle part 1 - kerning pairs. Core Font now
  has a validated per-pair kern table (drawable chars, glyphs must exist,
  amount in 1-cellWidth..cellWidth). .gff gained `kern:` lines (canonical
  sorted output, strict line-numbered parsing, duplicate/range/unknown-char
  rejection). Renderer composes glyphs with per-pair offsets (overlap paints
  in order), so kerning shifts text left/right deterministically. All six
  exporters emit kern tables (kotlin/java/c/text + rle variants); generated
  Kotlin renderText became kern-aware with offset-based column painting.
  Editor gained a `kern <c1> <c2> <amount|clear>` script command; Metrics
  summarizes kern count. 17 new tests, 126/126 green. Committed milestone.
- 2026-08-15 (run 4): iteration cycle part 2 - the HTML specimen frontend.
  New `Specimen.kt` generator + `specimen` CLI command emit a self-contained
  zero-dependency HTML page (embedded font data as JS, kerning-aware live
  preview in ascii/blocks modes at any scale, glyph gallery). Verified the
  embedded JS headless with node (AV kerns to 9 cols, AO stays 10); 7 suite
  tests + 2 CLI tests. Generated sample/export/Micro5x7.html and
  Pico3x5.html. Sample fonts gained real kern tables (micro5x7: 10 pairs,
  pico3x5: 5) applied via the new editor kern script commands; all export
  artifacts regenerated and compile-checked (kotlinc + javac); generated
  Kotlin renderText verified kern-aware (AV renders 9 wide). 135/135 green.
  Committed milestone.