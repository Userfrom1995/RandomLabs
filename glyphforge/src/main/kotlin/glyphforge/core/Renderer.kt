package glyphforge.core

/**
 * The headless text renderer: composes a font's glyphs into lines of text,
 * honoring per-glyph advance widths and defaulting undefined characters to a
 * blank of the default advance. Three output modes cover every proofing use:
 * ASCII art (configurable on/off characters), solid block art, and ANSI 256
 * color block art. Every mode supports an integer scale that repeats each
 * pixel N times horizontally and vertically.
 */
enum class RenderMode(val display: String) {
    ASCII("ascii"),
    BLOCKS("blocks"),
    ANSI("ansi");

    companion object {
        fun parse(s: String): RenderMode = when (s.lowercase()) {
            "ascii" -> ASCII
            "blocks", "block" -> BLOCKS
            "ansi", "color" -> ANSI
            else -> throw IllegalArgumentException("unknown render mode '$s' (use ascii, blocks, or ansi)")
        }
    }
}

object Renderer {

    const val ANSI_RESET = "\u001B[0m"
    const val ANSI_ON = "\u001B[38;5;46m"      // bright green
    const val ANSI_OFF = "\u001B[38;5;238m"    // dim grey

    /**
     * Renders [text] with [font], returning one string per output row.
     * Newlines start a fresh row group. Undefined characters render as blank
     * cells of [font]'s default advance. Kerning pairs (see [Font.kern]) shift
     * each glyph horizontally; overlapping pixels paint in glyph order, so a
     * later glyph wins a column it shares with an earlier one.
     */
    fun render(font: Font, text: String, mode: RenderMode, scale: Int, onChar: Char = '#', offChar: Char = ' '): List<String> {
        require(scale >= 1) { "scale must be >= 1, got $scale" }
        if (text.isEmpty()) return emptyList()
        val rows = mutableListOf<String>()
        val empty = if (mode == RenderMode.ANSI) " " else offChar.toString()
        val h = font.cellHeight
        for (line in text.split('\n')) {
            // Per-glyph starting column = sum of advances plus kerns before it.
            val offsets = IntArray(line.length)
            var col = 0
            for (i in line.indices) {
                offsets[i] = col
                col += font.advance(line[i])
                if (i + 1 < line.length) col += font.kern(line[i], line[i + 1])
            }
            val width = if (line.isEmpty()) 0 else col.coerceAtLeast(1)
            val cols = MutableList(width) { BooleanArray(h) }
            for (i in line.indices) {
                val g = font.glyphOrEmpty(line[i])
                val base = offsets[i]
                val advance = font.advance(line[i])
                for (x in 0 until advance) {
                    val colIdx = base + x
                    if (colIdx < 0 || colIdx >= width) continue
                    for (y in 0 until h) cols[colIdx][y] = g.get(x, y)
                }
            }
            for (sy in 0 until h) {
                val sb = StringBuilder()
                for (colIdx in cols.indices) {
                    repeat(scale) { sb.append(pixelChar(cols[colIdx][sy], mode, onChar, offChar)) }
                }
                if (sb.isEmpty()) sb.append(empty.repeat(scale))
                repeat(scale) { rows.add(sb.toString()) }
            }
        }
        return rows
    }

    private fun pixelChar(on: Boolean, mode: RenderMode, onChar: Char, offChar: Char): String = when (mode) {
        RenderMode.ASCII -> if (on) onChar.toString() else offChar.toString()
        RenderMode.BLOCKS -> if (on) "█" else " "
        RenderMode.ANSI -> if (on) "$ANSI_ON█$ANSI_RESET" else "$ANSI_OFF█$ANSI_RESET"
    }
}