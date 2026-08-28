# Glyphforge

A bitmap font designer and glyph-to-code tool written in **Kotlin** - the
lab's first Kotlin project and its first font/tooling project. Draw a
pixel font in a terminal grid, autotrace it to a compact raster font file
(`.gff`), and export usable glyph maps (Kotlin, Java, C header, or text) that
retro projects can embed directly. A headless renderer proofs any string in
ASCII art, block art, or ANSI color at any scale.

- **Terminal pixel-font editor** - an ANSI TUI with a live grid: place,
  erase, toggle, cursor movement, undo/redo, copy/paste, mirror, rotate,
  shift, crop, invert, and jump-between-glyphs. The editing core is a
  headless state machine with a scripted command language, so the same
  session runs interactively, from a script, or piped over stdin.
- **Autotrace to a compact raster** - every glyph grid is traced into sorted
  run-length rows and stored in a plain-text, diffable, strictly validated
  `.gff` font file that round-trips bit-exactly.
- **Kerning** - fonts carry a per-pair advance-adjustment table
  (`kern A V -1`), applied by the renderer, the generated Kotlin `renderText`,
  and the browser specimen page.
- **Glyph-to-code export** - deterministic generators emit the font as Kotlin
  source, a Java class, a C header, or a readable text table; the test suite
  re-parses the generated arrays and rebuilds the original pixels.
- **Headless renderer** - `glyphforge render` draws text in `ascii`,
  `blocks`, or `ansi` modes at any integer scale.
- **HTML specimen page** - `glyphforge specimen` generates a self-contained,
  zero-dependency page that previews any string in the browser with the exact
  engine semantics (kerning-aware, blocks or ascii, any scale), plus a glyph
  gallery. The shipped pages: [Micro5x7.html](sample/export/Micro5x7.html)
  and [Pico3x5.html](sample/export/Pico3x5.html).
- **Real artifacts** - the repo ships a full hand-drawn 5x7 pixel font over
  all 95 printable ASCII characters (as a `.gff` plus generated Kotlin, Java,
  and C code and an HTML specimen) and a compact 3x5 font with digits and
  letters.

## Build

```sh
make            # builds build/glyphforge.jar with the system kotlinc (no deps)
make test       # builds and runs the full self-test suite
make clean
```

Requires `kotlinc` (any 1.9+ / 2.x) and a JRE 17+. No external libraries.

## Quick start

```sh
# Render text with the shipped 5x7 font
java -jar build/glyphforge.jar render --font sample/fonts/micro5x7.gff --text "Hello, Glyphforge!" --mode blocks --scale 2

# Same font, ASCII art
java -jar build/glyphforge.jar render --font sample/fonts/micro5x7.gff --text "Retro 5x7" --mode ascii

# Inspect a font
java -jar build/glyphforge.jar info --font sample/fonts/micro5x7.gff
java -jar build/glyphforge.jar dump --font sample/fonts/micro5x7.gff --glyph A

# Export embeddable code
java -jar build/glyphforge.jar export --font sample/fonts/micro5x7.gff --format kotlin --out sample/export/Micro5x7Font.kt

# Generate an interactive HTML specimen page
java -jar build/glyphforge.jar specimen --font sample/fonts/micro5x7.gff --out /tmp/Micro5x7.html

# Autotrace ASCII art into a new font file
java -jar build/glyphforge.jar import-art --art sample/art/micro5x7.art --out /tmp/my.gff

# Edit a font headlessly via scripted commands (draw, kern, save)
java -jar build/glyphforge.jar edit --font sample/fonts/micro5x7.gff --script sample/scripts/demo.gfs --out /tmp/demo.gff

# Interactive editor (TTY only)
java -jar build/glyphforge.jar edit --font sample/fonts/micro5x7.gff
```

## Commands

| Command | Purpose |
| --- | --- |
| `new` | create a new empty `.gff` font template |
| `edit` | edit a glyph (interactive TUI, or scripted via `--script`/stdin) |
| `import-art` | autotrace `.`/`#` ASCII-art glyphs into a `.gff` font |
| `render` | draw text with a font (ascii/blocks/ansi, any scale) |
| `export` | generate Kotlin/Java/C/text code for a font |
| `specimen` | generate an interactive HTML specimen page |
| `info` | font metadata + per-glyph metrics (bounds, density, symmetry) |
| `list` | list all glyphs with code points and run counts |
| `validate` | lint a `.gff` file, exit non-zero on any problem |
| `dump` | print one glyph as ASCII art |

Every command is non-interactive: all input comes from args/flags/files, and
a missing required value is a clear error with a non-zero exit.

## How it works

1. **Glyphs** are bit-packed grids (`IntArray` rows, 1-32 cells wide, any
   height) with a full editing API: set/clear/toggle, translate, mirror,
   rotate, crop, invert, bounding box.
2. **Autotrace** (`Raster`) turns a grid into sorted run-length rows - the
   compact raster - and back, bit-exactly.
3. **The `.gff` format** stores each glyph's runs on one line with code point
   and advance width, plus optional `kern:` lines for kerning pairs; it is
   plain text, deterministic, and strictly validated (magic, dimensions, char
   range, run bounds, row monotonicity).
4. **Exporters** emit deterministic, embeddable code in four flavors plus the
   RLE variants; the test suite parses the emitted arrays back and compares
   pixels.
5. **The editor** is a headless state machine (grid + cursor + undo/redo +
   clipboard + glyph selection + kern commands); the ANSI TUI and the script
   runner are just two front-ends to it.
6. **The renderer** composes glyphs into lines and lines into pages, honoring
   per-glyph advance widths and kerning pairs, and defaulting undefined
   characters to a space.
7. **The specimen page** embeds the font as JavaScript and runs the same
   compose-and-paint math in the browser.

## Project layout

```
glyphforge/
  Makefile
  src/main/kotlin/glyphforge/
    core/     Glyph, Rect, Font, Raster (autotrace), FontIO (.gff), Metrics, Renderer
    codegen/  Exporter (kotlin, java, c, text), Specimen (HTML page)
    editor/   Editor state machine, script parser/runner, ANSI TUI
    cli/      Main + argument parsing for all subcommands
  src/test/kotlin/glyphforge/   the self-test suites (compiled into the jar)
  sample/
    art/      micro5x7.art (95 glyphs as ASCII art) and pico3x5.art
    fonts/    the generated .gff font files
    export/   generated embeddable code + HTML specimen pages
    scripts/  demo and kern editor scripts
  README.md
  docs/
    index.md / index.html   documentation site
    format.md               the .gff format specification
    codegen.md              the export formats
```

## Documentation

- [docs/](docs/) - full documentation site
- [docs/format.md](docs/format.md) - the `.gff` font file format
- [docs/codegen.md](docs/codegen.md) - the code export formats

## Development

```sh
make test
```

The self-test suite (a zero-dependency Kotlin harness compiled into the jar)
covers glyph operations, RLE autotrace round-trips, `.gff` save/load
round-trips, validation errors, and kerning pairs, every exporter (generated
arrays rebuild the original pixels, kern tables included), the HTML specimen
page (deterministic, embeds the exact font data), the renderer (known-answer
output at multiple scales, kerning known-answers), the editor state machine
(scripted sessions, undo/redo, clipboard, kern commands), and the full CLI
surface including error handling and exit codes. 135 tests in total.