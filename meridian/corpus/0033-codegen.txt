# Glyph-to-code export formats

`glyphforge export` turns a `.gff` font into deterministic, embeddable source
in four flavors - **Kotlin**, **Java**, **C**, and a plain-text table - plus a
Kotlin and a C variant of the compact run-length form. Every generator emits
the same code for the same font every time, so generated files are safe to
commit.

All generated code is self-contained: no imports beyond the standard library,
no external dependencies. The test suite re-parses the emitted arrays and
verifies they rebuild the original pixels, and the shipped artifacts
(`sample/export/`) are compile-checked with `kotlinc` and `javac`.

```
java -jar build/glyphforge.jar export --font sample/fonts/Micro5x7.gff --format kotlin --out sample/export/Micro5x7.kt
java -jar build/glyphforge.jar export --font sample/fonts/Micro5x7.gff --format kotlin --rle --out sample/export/Micro5x7Rle.kt
java -jar build/glyphforge.jar export --font sample/fonts/Micro5x7.gff --format java --out sample/export/Micro5x7.java
java -jar build/glyphforge.jar export --font sample/fonts/Micro5x7.gff --format c --out sample/export/Micro5x7.h
java -jar build/glyphforge.jar export --font sample/fonts/Micro5x7.gff --format c --rle --out sample/export/Micro5x7Rle.h
java -jar build/glyphforge.jar export --font sample/fonts/Micro5x7.gff --format text --out sample/export/Micro5x7.txt
```

## The data model every format shares

Each font exports:

- **Metrics** - `name`, `CELL_WIDTH`, `CELL_HEIGHT`, `BASELINE`,
  `DEFAULT_ADVANCE`, `GLYPH_COUNT`.
- **`CODEPOINTS`** - the character list, sorted by code point.
- **`ADVANCE`** - per-glyph advance widths, parallel to `CODEPOINTS`.
- **`KERN_LEFT` / `KERN_RIGHT` / `KERN_AMOUNT`** - the kerning table, three
  parallel arrays; empty when the font has no pairs. A `kern(a, b)` lookup
  returns the adjustment or 0.
- **`ROWS` / `STREAMS`** - the glyph bitmaps (below), parallel to
  `CODEPOINTS`.

### Bit-packed rows (Kotlin, Java, C)

Each glyph is `cellHeight` rows; each row is one integer holding the pixels of
that row, with column x at bit x (LSB first). The integer width is chosen to
fit the grid: `byte`/`uint8_t` up to 8 columns, `short`/`uint16_t` up to 16,
`int`/`uint32_t` up to 32.

- Kotlin: `val ROWS: Array<IntArray>` plus `rows(c)`, `pixel(c, x, y)`,
  `render(c, on, off)`, `renderText(text, on, off)`.
- Java: `public static final byte[][]/short[][]/int[][] ROWS` plus the same
  helpers. `renderText` is Kotlin-only; Java ships per-glyph `render`.
- C: a `static const` row array per glyph, a `struct glyph { int codepoint;
  uint8_t advance; const <rowType> *rows; }` table, plus `_index`, `_pixel`,
  and `_render` helpers. Guarded by an include guard.

### Compact run-length streams (Kotlin RLE, C RLE)

The `--rle` form stores each glyph as a packed byte stream that is smaller
than the raw row map for typical fonts:

```
byte 0        grid width
byte 1        grid height
per row y:    1 byte run count, then (start, length) byte pairs
```

`packRle`/`unpackRle` in the engine round-trip these streams bit-exactly.
- Kotlin: `val STREAMS: Array<ByteArray>` plus `pixel(c, x, y)` (decodes
  on the fly) and `streamBytes(c)`.
- C: `static const uint8_t streams[][...]` plus `_pixel` decoding helper.

### Text table

`text` is a readable proof sheet: one block per glyph showing the code point,
advance, `#`/`.` art, and the hex row values, followed by the kern pairs.

## Kerning in generated code

All generated code carries the kern table, and the generated Kotlin
`renderText` applies it: each glyph's starting column is the running total of
advances **plus** the kern of the pair it forms with the next character.
Rendered `AV` with a `-1` pair is one column narrower than `AO` without one.

## The HTML specimen page

`glyphforge specimen --font file.gff --out page.html` generates a
self-contained, zero-dependency HTML page - the browser frontend for the
engine:

- The font is embedded as JavaScript data (glyphs, advances, kern pairs).
- A live preview renders any string in **blocks** or **ascii** mode at any
  scale, honoring advances and kerning.
- A gallery shows every glyph with its code point, advance, and a pixel grid.

Open the page directly from disk or serve it anywhere; no network, no build.
The shipped specimen pages are `sample/export/Micro5x7.html` and
`sample/export/Pico3x5.html`.