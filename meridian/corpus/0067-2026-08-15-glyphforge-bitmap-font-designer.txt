# Glyphforge: a bitmap font designer and glyph-to-code tool in Kotlin

**Glyphforge** is the factory's first Kotlin project and first font/tooling
project: a dependency-light bitmap font designer that runs in the terminal.
You draw a pixel font glyph by glyph on a terminal grid, the tool autotraces
your pixels into a compact run-length raster font file (`.gff`), and it can
export the whole font as embeddable code (Kotlin, Java, C header, or plain
text) that retro projects drop straight into their source. A headless
renderer turns any string into ASCII art or block art so the font can be
seen before it ships.

## What it is

- **A terminal pixel-font editor.** An ANSI TUI lets you draw and edit glyphs
  on a live grid: place, erase, toggle, a movable cursor, undo/redo,
  copy/paste, mirror, rotate, shift, clear, invert, crop, and glyph-to-glyph
  navigation (type a letter to jump to that glyph). The whole editing core is
  a headless state machine driven by a tiny scripted command language, so the
  exact same editing session runs interactively in a TTY or driven by a
  script or piped stdin with zero display.
- **Autotrace to a compact raster format.** Each glyph grid is automatically
  traced into sorted run-length rows (the compact raster), stored in a plain
  text, diffable, strictly validated `.gff` font file that round-trips
  bit-exactly. `glyphforge validate` is a real file-format linter.
- **Glyph-to-code export.** Deterministic generators emit a font as Kotlin
  source, a Java class, a C header (byte arrays + a lookup table + a pixel
  getter), or a readable text table. The generated arrays are re-parsed and
  verified to rebuild the original pixels in the test suite.
- **Kerning.** Fonts carry a per-pair advance-adjustment table (`.gff`
  `kern:` lines), applied by the renderer, the generated Kotlin `renderText`,
  and the browser specimen page, so proportional fonts sit tight where they
  should.
- **A headless renderer.** `glyphforge render` draws any text (with newlines)
  in `ascii`, `blocks`, or `ansi` modes at any integer scale, so a font can
  be proofed, diffed, and piped without ever opening an editor.
- **An HTML specimen frontend.** `glyphforge specimen` generates a
  self-contained, zero-dependency HTML page that previews any string in the
  browser (blocks or ascii, any scale, kerning-aware) plus a glyph gallery.
  It is the browser frontend for the headless engine.
- **Real artifacts.** The repo ships a full 5x7 pixel font covering all 95
  printable ASCII characters, hand-drawn in ASCII art and autotraced into a
  `.gff` font file plus generated Kotlin/Java/C/Java-script export code and an
  HTML specimen page; a compact 3x5 font with digits and letters demonstrates
  smaller sizes.

## Why it fits

A brand-new language (Kotlin, first in the factory) and a completely
untouched domain (fonts and glyph tooling). Fonts are the hidden backbone of
games, terminal apps, and embedded displays, and this turns pixel art into a
real, reusable, embeddable artifact rather than a one-off demo. No overlap
with anything in `ideas/`.

## Name origin

"Glyphforge" - a forge where glyphs are hammered out: pixel-by-pixel font
crafting that produces a usable artifact.