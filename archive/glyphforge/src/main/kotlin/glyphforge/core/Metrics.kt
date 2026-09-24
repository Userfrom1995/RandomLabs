package glyphforge.core

/**
 * Read-only statistics over glyphs and fonts, used by the `info` command and
 * by the autotrace pipeline to reason about how compact a glyph's raster is.
 */
object Metrics {

    /** Fraction of the grid that is set, in [0, 1]. */
    fun density(g: Glyph): Double = g.countSet().toDouble() / (g.width * g.height)

    /** Number of runs needed to describe the glyph; 0 for an empty grid. */
    fun runCount(g: Glyph): Int = Raster.encodeRows(g).sumOf { it.size }

    /**
     * Compression ratio of the run-length raster over the raw row-major
     * byte map (rows count as [g.width]/8 rounded up each). A ratio above 1
     * means the traced form is smaller; below 1 means the raw form wins.
     */
    fun compressionRatio(g: Glyph): Double {
        val rawBytes = g.height * ((g.width + 7) / 8)
        val rleBytes = 2 + Raster.encodeRows(g).sumOf { 1 + it.size * 2 }
        return rleBytes.toDouble() / rawBytes.coerceAtLeast(1)
    }

    /** One-line summary of a glyph's statistics. */
    fun describe(g: Glyph): String {
        val box = g.boundingBox()
        val boxText = box?.let { "bbox (${it.x},${it.y})-(${it.x2},${it.y2})" } ?: "empty"
        val sym = when {
            g.isSymmetricX() && g.isSymmetricY() -> "symmetric X+Y"
            g.isSymmetricX() -> "symmetric X"
            g.isSymmetricY() -> "symmetric Y"
            else -> "asymmetric"
        }
        val density = String.format("%.2f", density(g))
        return "grid=${g.width}x${g.height} set=${g.countSet()} runs=${runCount(g)} " +
            "$boxText density=$density $sym"
    }

    /** Human summary of an entire font. */
    fun summarize(font: Font): String {
        val chars = font.chars()
        val empty = chars.count { font.glyph(it)!!.isEmpty() }
        val first = chars.firstOrNull()?.let { "U+${it.code.toString(16).uppercase().padStart(4, '0')}" } ?: "none"
        val last = chars.lastOrNull()?.let { "U+${it.code.toString(16).uppercase().padStart(4, '0')}" } ?: "none"
        val avg = if (chars.isEmpty()) 0.0 else font.totalPixels().toDouble() / chars.size
        return "${font.name}: ${font.cellWidth}x${font.cellHeight} grid, ${chars.size} glyphs " +
            "(range $first..$last, $empty empty), baseline ${font.baseline}, " +
            "default advance ${font.defaultAdvance}, ${font.kernCount()} kern pairs, " +
            "avg ${String.format("%.1f", avg)} px/glyph, " +
            "${font.totalPixels()} total px"
    }
}