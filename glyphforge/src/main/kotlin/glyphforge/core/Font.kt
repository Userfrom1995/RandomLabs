package glyphforge.core

/**
 * A pixel font: a uniform grid size (cellWidth x cellHeight), shared metrics,
 * a collection of glyphs keyed by character, and an optional kerning table of
 * per-pair advance adjustments. Every glyph stored in a font must exactly
 * match the font's grid size. The optional per-glyph advance width defaults
 * to [defaultAdvance].
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
    private val kerns = HashMap<Pair<Char, Char>, Int>()

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

    /** The kerning adjustment for the pair (a, b); 0 when no pair is set. */
    fun kern(a: Char, b: Char): Int = kerns[a to b] ?: 0

    /**
     * Sets the kerning adjustment for the pair (a, b): a negative amount pulls
     * [b] left (toward [a]) when rendering, a positive amount pushes it right.
     * The amount is bounded so the pair's effective advance never exceeds the
     * grid; both characters must be drawable.
     */
    fun setKern(a: Char, b: Char, amount: Int) {
        requireDrawable(a)
        requireDrawable(b)
        require(has(a)) { "kern left ${FontIO.cp(a)} is not a glyph in this font" }
        require(has(b)) { "kern right ${FontIO.cp(b)} is not a glyph in this font" }
        require(amount in 1 - cellWidth..cellWidth) {
            "kern for ${FontIO.cp(a)}/${FontIO.cp(b)} must be in ${1 - cellWidth}..$cellWidth, got $amount"
        }
        kerns[a to b] = amount
    }

    /** Removes any kerning adjustment for the pair (a, b). */
    fun removeKern(a: Char, b: Char) {
        kerns.remove(a to b)
    }

    /** All kern pairs sorted by (left, right) code point, for deterministic output. */
    fun kernPairs(): List<Triple<Char, Char, Int>> =
        kerns.entries.map { Triple(it.key.first, it.key.second, it.value) }
            .sortedWith(compareBy({ it.first.code }, { it.second.code }))

    fun kernCount(): Int = kerns.size

    private fun requireDrawable(c: Char) {
        require(!c.isISOControl() && c != '\uFFFF') {
            "unsupported character for a kern pair: U+${c.code.toString(16).uppercase().padStart(4, '0')}"
        }
    }

    fun glyphCount(): Int = glyphs.size

    /** All character codes sorted by code point, for deterministic output. */
    fun chars(): List<Char> = glyphs.keys.sortedBy { it.code }

    /** A deterministic, independent copy of this font. */
    fun copy(): Font {
        val f = Font(name, cellWidth, cellHeight, baseline, defaultAdvance)
        for (c in chars()) f.put(c, glyphs.getValue(c).copy(), advance(c))
        for ((a, b, amount) in kernPairs()) f.setKern(a, b, amount)
        return f
    }

    /** A description of every glyph's bounding box; absent chars map to null. */
    fun boundingBoxes(): Map<Char, Rect?> = chars().associateWith { glyphs.getValue(it).boundingBox() }

    /** Total set pixels across all glyphs. */
    fun totalPixels(): Int = chars().sumOf { glyphs.getValue(it).countSet() }
}