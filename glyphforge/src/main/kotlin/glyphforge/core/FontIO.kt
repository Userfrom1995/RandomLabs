package glyphforge.core

import java.io.IOException
import java.nio.file.Files
import java.nio.file.Path

/**
 * The `.gff` (Glyphforge Font) file format: a plain-text, diffable, strictly
 * validated serialization of a [Font]. Each glyph is stored in its autotraced
 * compact raster form (run-length rows), so the file doubles as the compact
 * raster font artifact. See `docs/format.md` for the full specification.
 *
 * Canonical form (as written by [write]):
 *
 * ```
 * GF1
 * name=Micro5x7
 * cellWidth=5
 * cellHeight=7
 * baseline=6
 * defaultAdvance=5
 * glyph:U+0041:adv=5:runs=1:1-4;2:0-4;3:1-3
 * glyph:U+0020:adv=5:runs=-
 * kern:U+0041:U+0056=-1
 * ```
 */
object FontIO {

    const val MAGIC = "GF1"
    const val MAX_NAME_LENGTH = 64

    class FontFormatException(message: String, val line: Int? = null) : Exception(
        if (line != null) "font file line $line: $message" else "font file: $message"
    )

    /** Serializes a font to canonical text. */
    fun write(font: Font): String {
        val sb = StringBuilder()
        sb.append(MAGIC).append('\n')
        sb.append("name=").append(font.name).append('\n')
        sb.append("cellWidth=").append(font.cellWidth).append('\n')
        sb.append("cellHeight=").append(font.cellHeight).append('\n')
        sb.append("baseline=").append(font.baseline).append('\n')
        sb.append("defaultAdvance=").append(font.defaultAdvance).append('\n')
        sb.append("# glyph count: ").append(font.glyphCount()).append('\n')
        for (c in font.chars()) {
            val glyph = font.glyph(c)!!
            val runs = Raster.runsToString(Raster.encodeRows(glyph))
            sb.append("glyph:").append(cp(c)).append(":adv=").append(font.advance(c))
                .append(":runs=").append(runs).append('\n')
        }
        if (font.kernCount() > 0) {
            sb.append("# kern pairs: ").append(font.kernCount()).append('\n')
            for ((a, b, amount) in font.kernPairs()) {
                sb.append("kern:").append(cp(a)).append(':').append(cp(b)).append('=').append(amount).append('\n')
            }
        }
        return sb.toString()
    }

    /** Parses canonical (or any valid) `.gff` text into a font. */
    fun parse(text: String): Font {
        var name: String? = null
        var cellWidth: Int? = null
        var cellHeight: Int? = null
        var baseline: Int? = null
        var defaultAdvance: Int? = null
        val glyphLines = mutableListOf<Pair<Int, String>>()
        val kernLines = mutableListOf<Pair<Int, String>>()

        val lines = text.split('\n')
        for ((idx, raw) in lines.withIndex()) {
            val line = raw.trim()
            if (line.isEmpty() || line.startsWith("#")) continue
            val n = idx + 1
            if (line == MAGIC) continue
            if (line.startsWith("glyph:")) {
                glyphLines.add(n to line)
                continue
            }
            if (line.startsWith("kern:")) {
                kernLines.add(n to line)
                continue
            }
            val eq = line.indexOf('=')
            if (eq <= 0) throw FontFormatException("unknown directive '$line'", n)
            val key = line.substring(0, eq)
            val value = line.substring(eq + 1)
            when (key) {
                "name" -> {
                    if (name != null) throw FontFormatException("duplicate key 'name'", n)
                    name = value
                }
                "cellWidth" -> {
                    if (cellWidth != null) throw FontFormatException("duplicate key 'cellWidth'", n)
                    cellWidth = parseIntKey(key, value, n)
                }
                "cellHeight" -> {
                    if (cellHeight != null) throw FontFormatException("duplicate key 'cellHeight'", n)
                    cellHeight = parseIntKey(key, value, n)
                }
                "baseline" -> {
                    if (baseline != null) throw FontFormatException("duplicate key 'baseline'", n)
                    baseline = parseIntKey(key, value, n)
                }
                "defaultAdvance" -> {
                    if (defaultAdvance != null) throw FontFormatException("duplicate key 'defaultAdvance'", n)
                    defaultAdvance = parseIntKey(key, value, n)
                }
                else -> throw FontFormatException("unknown directive '$line'", n)
            }
        }

        val nName = name ?: throw FontFormatException("missing required key 'name'")
        if (nName.isEmpty() || nName.length > MAX_NAME_LENGTH) {
            throw FontFormatException("name must be 1..$MAX_NAME_LENGTH chars, got '${nName.take(20)}'")
        }
        if (nName.any { it.isISOControl() }) throw FontFormatException("name contains control characters")
        val w = cellWidth ?: throw FontFormatException("missing required key 'cellWidth'")
        val h = cellHeight ?: throw FontFormatException("missing required key 'cellHeight'")
        val b = baseline ?: throw FontFormatException("missing required key 'baseline'")
        val adv = defaultAdvance ?: throw FontFormatException("missing required key 'defaultAdvance'")

        val font = try {
            Font(nName, w, h, b, adv)
        } catch (e: IllegalArgumentException) {
            throw FontFormatException(e.message ?: "invalid font metrics")
        }

        for ((n, line) in glyphLines) {
            parseGlyphLine(font, line, n)
        }
        for ((n, line) in kernLines) {
            parseKernLine(font, line, n)
        }
        return font
    }

    private fun parseKernLine(font: Font, line: String, n: Int) {
        // kern:U+0041:U+0056=-1
        val parts = line.split(':', limit = 3)
        if (parts.size != 3) throw FontFormatException("malformed kern line '$line'", n)
        val a = parseCodePoint(parts[1], n, "kern")
        val eq = parts[2].lastIndexOf('=')
        if (eq <= 0) throw FontFormatException("malformed kern line '$line'", n)
        val bText = parts[2].substring(0, eq)
        val b = parseCodePoint(bText, n, "kern")
        val amount = parts[2].substring(eq + 1).toIntOrNull()
            ?: throw FontFormatException("kern $a/$b amount is not an integer: '${parts[2].substring(eq + 1)}'", n)
        if (font.kern(a, b) != 0) throw FontFormatException("duplicate kern pair $a/$b", n)
        try {
            font.setKern(a, b, amount)
        } catch (e: IllegalArgumentException) {
            throw FontFormatException("kern $a/$b ${e.message}", n)
        }
    }

    /** Parses a U+XXXX code-point token used in glyph and kern lines. */
    private fun parseCodePoint(text: String, n: Int, kind: String): Char {
        if (!text.startsWith("U+") || text.length < 4) throw FontFormatException("bad code point '$text' in $kind line", n)
        val code = text.substring(2).toIntOrNull(16)
            ?: throw FontFormatException("bad code point '$text' in $kind line", n)
        if (code < 0x20 || code > 0x10FFFF || code in 0xD800..0xDFFF) {
            throw FontFormatException("code point $text in $kind line out of range (printable, non-surrogate)", n)
        }
        val ch = Char(code)
        if (ch.isISOControl() || ch == '\uFFFF') throw FontFormatException("code point $text in $kind line is not drawable", n)
        return ch
    }

    private fun parseGlyphLine(font: Font, line: String, n: Int) {
        // glyph:U+0041:adv=5:runs=...
        val parts = line.split(':', limit = 4)
        if (parts.size != 4) throw FontFormatException("malformed glyph line '$line'", n)
        val ch = parseCodePoint(parts[1], n, "glyph")
        if (font.has(ch)) throw FontFormatException("duplicate glyph ${parts[1]}", n)

        if (!parts[2].startsWith("adv=")) throw FontFormatException("glyph ${parts[1]} missing advance", n)
        val advance = parts[2].substring(4).toIntOrNull()
            ?: throw FontFormatException("glyph ${parts[1]} bad advance '${parts[2]}'", n)
        if (advance !in 0..font.cellWidth) {
            throw FontFormatException("glyph ${parts[1]} advance $advance out of range 0..${font.cellWidth}", n)
        }

        if (!parts[3].startsWith("runs=")) throw FontFormatException("glyph ${parts[1]} missing runs", n)
        val runsText = parts[3].substring(5)
        val runs = try {
            Raster.parseRuns(runsText, font.cellWidth, font.cellHeight)
        } catch (e: IllegalArgumentException) {
            throw FontFormatException("glyph ${parts[1]} ${e.message}", n)
        }
        val glyph = Raster.decodeRows(font.cellWidth, font.cellHeight, runs)
        font.put(ch, glyph, advance)
    }

    private fun parseIntKey(key: String, value: String, n: Int): Int {
        val v = value.toIntOrNull()
            ?: throw FontFormatException("$key is not an integer: '$value'", n)
        return v
    }

    /** Saves a font to [path], writing to a temp file and moving into place. */
    fun save(font: Font, path: Path) {
        val tmp = path.resolveSibling(path.fileName.toString() + ".tmp")
        try {
            Files.writeString(tmp, write(font))
            try {
                Files.move(tmp, path, java.nio.file.StandardCopyOption.REPLACE_EXISTING)
            } catch (e: IOException) {
                // Some filesystems disallow rename of an open file; fall back to direct write.
                Files.writeString(path, write(font))
                Files.deleteIfExists(tmp)
            }
        } finally {
            Files.deleteIfExists(tmp)
        }
    }

    fun load(path: Path): Font {
        if (!Files.exists(path)) throw IOException("no such file: $path")
        return parse(Files.readString(path))
    }

    /** U+XXXX code-point label with at least four uppercase hex digits. */
    fun cp(c: Char): String = "U+" + c.code.toString(16).uppercase().padStart(4, '0')
}