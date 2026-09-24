# Glyphforge

**Glyphforge** is a bitmap font designer and glyph-to-code tool written in
**Kotlin** - the lab's first Kotlin project and its first font/tooling
project. Draw a pixel font in a terminal grid, autotrace it to a compact
raster `.gff` font file, and export usable glyph maps that retro projects can
embed directly. A headless renderer proofs any string at any scale, an HTML
specimen page previews it in the browser, and the whole editing core is a
headless state machine driven by a scripted command language, so everything is
testable without a display.

## What it is

- **Terminal pixel-font editor.** An ANSI TUI with a live grid: place, erase,
  toggle, cursor movement, undo/redo, copy/paste, mirror, rotate, shift, crop,
  invert, and jump between glyphs. The editing core is a headless state
  machine with a scripted command language, so the same session runs
  interactively, from a script, or piped over stdin.
- **Autotrace to a compact raster.** Every glyph grid is traced into sorted
  run-length rows and stored in a plain-text, diffable, strictly validated
  `.gff` font file that round-trips bit-exactly.
- **Kerning.** Fonts carry a per-pair advance-adjustment table. The renderer,
  the generated Kotlin `renderText`, and the specimen page all apply it live.
- **Glyph-to-code export.** Deterministic generators emit the font as Kotlin
  source, a Java class, a C header, a readable text table, and compact
  run-length forms for Kotlin and C.
- **Headless renderer.** `glyphforge render` draws text in `ascii`, `blocks`,
  or `ansi` modes at any integer scale, honoring per-glyph advances and kerns.
- **HTML specimen page.** `glyphforge specimen` emits a self-contained page
  that renders any string in the browser with the exact engine semantics.
- **Real artifacts.** The repo ships a full hand-drawn 5x7 pixel font over all
  95 printable ASCII characters and a compact 3x5 font, each as a `.gff` plus
  generated Kotlin, Java, and C code and a specimen page.

## Using it

Requires `kotlinc` (any 1.9+ / 2.x) and a JRE 17+. No external libraries.

```sh
cd glyphforge
make                 # builds build/glyphforge.jar
make test            # builds and runs the full self-test suite (135 tests)
```

```sh
# Proof text with the shipped 5x7 font
java -jar build/glyphforge.jar render --font sample/fonts/Micro5x7.gff --text "Hello, Glyphforge!" --mode blocks --scale 2

# Inspect a font
java -jar build/glyphforge.jar info --font sample/fonts/Micro5x7.gff
java -jar build/glyphforge.jar dump --font sample/fonts/Micro5x7.gff --glyph A

# Export embeddable code, or an interactive HTML specimen page
java -jar build/glyphforge.jar export --font sample/fonts/Micro5x7.gff --format kotlin --out /tmp/Micro5x7.kt
java -jar build/glyphforge.jar specimen --font sample/fonts/Micro5x7.gff --out /tmp/Micro5x7.html

# Autotrace ASCII art into a new font, then edit it headlessly
java -jar build/glyphforge.jar import-art --art sample/art/micro5x7.art --out /tmp/my.gff
java -jar build/glyphforge.jar edit --font /tmp/my.gff --script sample/scripts/demo.gfs --out /tmp/my-kerned.gff
```

## Commands

| Command | Purpose |
| --- | --- |
| `new` | create a new empty `.gff` font template |
| `edit` | edit a glyph (interactive TUI, or headless via `--script`/stdin) |
| `import-art` | autotrace `.`/`#` ASCII-art glyphs into a `.gff` font |
| `render` | draw text with a font (ascii/blocks/ansi, any scale) |
| `export` | generate Kotlin/Java/C/text code for a font |
| `specimen` | generate an interactive HTML specimen page |
| `info` | font metadata + per-glyph metrics |
| `list` | list all glyphs with code points and run counts |
| `validate` | lint a `.gff` file, exit non-zero on any problem |
| `dump` | print one glyph as ASCII art |

Every command is non-interactive: all input comes from args, flags, or files,
and a missing required value is a clear error with a non-zero exit.

## How it works

1. **Glyphs** are bit-packed grids (`IntArray` rows, 1-32 cells wide, any
   height) with a full editing API: set/clear/toggle, translate, mirror,
   rotate, crop, invert, bounding box.
2. **Autotrace** (`Raster`) turns a grid into sorted run-length rows - the
   compact raster - and back, bit-exactly.
3. **The `.gff` format** stores each glyph's runs on one line with code point
   and advance width, plus optional `kern:` lines; it is plain text,
   deterministic, and strictly validated. See [format.md](format.md).
4. **Kerning** adds per-pair advance adjustments that the renderer and the
   generated code honor.
5. **Exporters** emit deterministic, embeddable code in four flavors plus the
   RLE variants; the test suite parses the emitted arrays back and compares
   pixels. See [codegen.md](codegen.md).
6. **The editor** is a headless state machine (grid + cursor + undo/redo +
   clipboard + glyph selection + kern commands); the ANSI TUI, the script
   runner, and piped stdin are three front-ends to it.
7. **The renderer** composes glyphs into lines with per-glyph advances and
   kerning; the HTML specimen page runs the same math in JavaScript.

## Project layout

```
glyphforge/
  Makefile                      zero-dependency build (kotlinc)
  src/main/kotlin/glyphforge/
    core/     Glyph, Rect, Font, Raster (autotrace), FontIO (.gff), Metrics, Renderer
    codegen/  Exporter (kotlin, java, c, text), Specimen (HTML page)
    editor/   Editor state machine, script parser/runner, ANSI TUI
    cli/      Main + argument parsing for all subcommands
  src/test/kotlin/glyphforge/    the self-test suites (compiled into the jar)
  sample/
    art/      micro5x7.art (95 glyphs as ASCII art) and pico3x5.art
    fonts/    the generated .gff font files
    export/   generated code (Kotlin, Java, C, text) and HTML specimen pages
    scripts/  demo and kern editor scripts
  README.md
  docs/
    index.md / index.html   this site
    format.md               the .gff format specification
    codegen.md              the export formats and the specimen page
```

## Documentation

- [format.md](format.md) - the `.gff` font file format
- [codegen.md](codegen.md) - the code export formats and the HTML specimen page
- [README](../README.md) - quick start and command reference