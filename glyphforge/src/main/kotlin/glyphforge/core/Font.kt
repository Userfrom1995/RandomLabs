package glyphforge.core

/**
 * A pixel font: a uniform grid size (cellWidth x cellHeight), shared metrics,
 * and a collection of glyphs keyed by character. Every glyph stored in a font
 * must exactly match the font's grid size. The optional per-glyph advance
 * width defaults to [defaultAdvance].
 */
class Font(
    val name: String,
    val cellWidth: Int,
    val cellHeight: Int,
    val baseline: Int,
    val defaultAdvance: Int,
) {

    init {
        require(name.isNotBlank()) { "font name must not be blank" }
        require(cellWidth in 1..Glyph.MAX_WIDTH) {
            "cellWidth must be in 1..${Glyph.MAX_WIDTH}, got $cellWidth"
        }
        require(cellHeight in 1..Glyph.MAX_HEIGHT) {
            "cellHeight must be in 1..${Glyph.MAX_HEIGHT}, got $cellHeight"
        }
        require(baseline in 0..cellHeight) {
            "baseline must be in 0..$cellHeight, got $baseline"
        }
        require(defaultAdvance in 1..cellWidth) {
            "defaultAdvance must be in 1..$cellWidth, got $defaultAdvance"
        }
    }

    private val glyphs = LinkedHashMap<Char, Glyph>()
    private val advances = HashMap<Char, Int>()

    companion object {
        /** An empty font with the given metrics, ready for glyphs. */
        fun create(name: String, cellWidth: Int, cellHeight: Int, baseline: Int = cellHeight, defaultAdvance: Int = cellWidth): Font =
            Font(name, cellWidth, cellHeight, baseline, defaultAdvance)
    }

    fun glyph(c: Char): Glyph? = glyphs[c]

    /** The glyph for [c], or an empty grid of the font's size when absent. */
    fun glyphOrEmpty(c: Char): Glyph = glyphs[c] ?: Glyph.empty(cellWidth, cellHeight)

    /** The advance width for [c], defaulting to [defaultAdvance]. */
    fun advance(c: Char): Int = advances[c] ?: defaultAdvance

    fun has(c: Char): Boolean = glyphs.containsKey(c)

    fun put(c: Char, g: Glyph, advance: Int = defaultAdvance) {
        require(g.width == cellWidth && g.height == cellHeight) {
            "glyph $c is ${g.width}x${g.height} but the font grid is ${cellWidth}x$cellHeight"
        }
        require(!c.isISOControl() && c != '\uFFFF') {
            "unsupported character for a font glyph: U+${c.code.toString(16).uppercase().padStart(4, '0')}"
        }
        require(advance in 0..cellWidth) {
            "advance for $c must be in 0..$cellWidth, got $advance"
        }
        glyphs[c] = g
        advances[c] = advance
    }

    fun remove(c: Char) {
        glyphs.remove(c)
        advances.remove(c)
    }

    fun setAdvance(c: Char, advance: Int) {
        require(advance in 0..cellWidth) { "advance for $c must be in 0..$cellWidth, got $advance" }
        advances[c] = advance
    }

    fun glyphCount(): Int = glyphs.size

    /** All character codes sorted by code point, for deterministic output. */
    fun chars(): List<Char> = glyphs.keys.sortedBy { it.code }

    /** A deterministic, independent copy of this font. */
    fun copy(): Font {
        val f = Font(name, cellWidth, cellHeight, baseline, defaultAdvance)
        for (c in chars()) f.put(c, glyphs.getValue(c).copy(), advance(c))
        return f
    }

    /** A description of every glyph's bounding box; absent chars map to null. */
    fun boundingBoxes(): Map<Char, Rect?> = chars().associateWith { glyphs.getValue(it).boundingBox() }

    /** Total set pixels across all glyphs. */
    fun totalPixels(): Int = chars().sumOf { glyphs.getValue(it).countSet() }
}