# The `.gff` font file format

`.gff` (Glyphforge Font) is the plain-text, diffable raster font format that
Glyphforge reads and writes. Every glyph is stored in its autotraced compact
run-length form, so the file *is* the compact raster artifact: small, human
readable, and friendly to version control. The parser is strict, and every
error reports the offending line number.

## Goals

- **Compact** - a glyph is stored as sorted runs of set pixels per row, not as
  one character per pixel. A typical 5x7 glyph is a handful of run specs.
- **Diffable** - one line per glyph; two fonts diff meaningfully.
- **Deterministic** - `FontIO.write` emits the same bytes for the same font
  every time (glyphs sorted by code point, kern pairs sorted by pair).
- **Strict** - `glyphforge validate` lints a file and the parser refuses
  malformed input with a `line N:` prefix on every error.

## Structure

A file is a sequence of lines. Blank lines and lines starting with `#`
(comments) are ignored anywhere. The first non-comment line must be the magic
header `GF1`.

```
GF1
name=Micro5x7
cellWidth=5
cellHeight=7
baseline=6
defaultAdvance=5
# glyph count: 95
glyph:U+0020:adv=5:runs=-
glyph:U+0041:adv=5:runs=0:1-4;2:0-4;3:1-3
kern:U+0041:U+0056=-1
```

### Header keys

| Key | Meaning | Required |
| --- | --- | --- |
| `name` | font name, 1-64 chars, no control characters | yes |
| `cellWidth` | grid width in pixels, 1-32 | yes |
| `cellHeight` | grid height in pixels, 1-128 | yes |
| `baseline` | baseline row, `0..cellHeight` | yes |
| `defaultAdvance` | advance used when a glyph has none, `1..cellWidth` | yes |

Every glyph stored in a font must exactly match `cellWidth x cellHeight`.

### Glyph lines

```
glyph:<U+XXXX>:adv=<n>:runs=<run-spec>
```

- `<U+XXXX>` - the code point as `U+` followed by at least four uppercase hex
  digits (e.g. `U+0041`, `U+03A9`). Printable, non-surrogate code points only.
- `adv=<n>` - that glyph's advance width, `0..cellWidth`.
- `<run-spec>` - the autotraced raster, described below.

A code point may appear at most once per file.

### The run spec

The run spec encodes one row's set pixels as sorted, non-overlapping runs and
groups rows in increasing order. Empty rows are omitted.

```
0:1-4;2:0-4;3:1-3
```

means: row 0 has set pixels in columns 1 through 4, row 2 in columns 0 through
4, row 3 in columns 1 through 3. An entirely empty glyph is written as `-`.
Every run must satisfy `0 <= start <= end < cellWidth`; rows must be strictly
increasing and runs must not overlap or touch (the canonical form is merged).

This representation round-trips bit-exactly: `import-art` -> `.gff` ->
`export` -> render reproduces the original pixel grid.

### Kern lines

```
kern:<U+XXXX>:<U+YYYY>=<amount>
```

Adds a kerning adjustment to the pair (left, right): a negative amount pulls
the right glyph left toward the left glyph when rendering, a positive amount
pushes it right.

- Both code points must already exist as glyphs in the file.
- The amount is bounded to `(1 - cellWidth) .. cellWidth`, so a pair can
  tighten almost to zero but never force the advance out of range.
- Each pair may appear at most once.

The renderer and the generated Kotlin `renderText` both honor kern pairs; the
specimen page applies them live in the browser.

## Validation

`glyphforge validate --font file.gff` loads the file through the same strict
parser and exits `0` when it is valid, `1` otherwise. The parser rejects:
missing or duplicate keys, malformed glyph or kern lines, out-of-range metrics,
bad or duplicate code points, run bounds or ordering violations, unknown
directives, and non-integer numbers, each with a `line N:` message.

## Example

```sh
java -jar build/glyphforge.jar validate --font sample/fonts/Micro5x7.gff
java -jar build/glyphforge.jar dump --font sample/fonts/Micro5x7.gff --glyph A
```

The shipped fonts (`sample/fonts/Micro5x7.gff`, `sample/fonts/Pico3x5.gff`)
are canonical examples of the format.