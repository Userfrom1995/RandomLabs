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
        return font
    }

    private fun parseGlyphLine(font: Font, line: String, n: Int) {
        // glyph:U+0041:adv=5:runs=...
        val parts = line.split(':', limit = 4)
        if (parts.size != 4) throw FontFormatException("malformed glyph line '$line'", n)
        val cp = parts[1]
        if (!cp.startsWith("U+") || cp.length < 4) throw FontFormatException("bad code point '$cp'", n)
        val code = cp.substring(2).toIntOrNull(16)
            ?: throw FontFormatException("bad code point '$cp'", n)
        if (code < 0x20 || code > 0x10FFFF || code in 0xD800..0xDFFF) {
            throw FontFormatException("code point $cp out of range (printable, non-surrogate)", n)
        }
        val ch = Char(code)
        if (ch.isISOControl() || ch == '\uFFFF') throw FontFormatException("code point $cp is not drawable", n)
        if (font.has(ch)) throw FontFormatException("duplicate glyph $cp", n)

        if (!parts[2].startsWith("adv=")) throw FontFormatException("glyph $cp missing advance", n)
        val advance = parts[2].substring(4).toIntOrNull()
            ?: throw FontFormatException("glyph $cp bad advance '${parts[2]}'", n)
        if (advance !in 0..font.cellWidth) {
            throw FontFormatException("glyph $cp advance $advance out of range 0..${font.cellWidth}", n)
        }

        if (!parts[3].startsWith("runs=")) throw FontFormatException("glyph $cp missing runs", n)
        val runsText = parts[3].substring(5)
        val runs = try {
            Raster.parseRuns(runsText, font.cellWidth, font.cellHeight)
        } catch (e: IllegalArgumentException) {
            throw FontFormatException("glyph $cp ${e.message}", n)
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