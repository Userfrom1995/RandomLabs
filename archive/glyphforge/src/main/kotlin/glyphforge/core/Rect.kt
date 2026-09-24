package glyphforge.core

/**
 * An axis-aligned rectangle over glyph grid coordinates (in pixels).
 */
data class Rect(val x: Int, val y: Int, val width: Int, val height: Int) {
    val x2: Int get() = x + width - 1
    val y2: Int get() = y + height - 1
    val isEmpty: Boolean get() = width <= 0 || height <= 0
}