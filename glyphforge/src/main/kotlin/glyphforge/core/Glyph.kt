package glyphforge.core

/**
 * A single character's pixel grid. Rows are bit-packed into [Int]s, one int
 * per row, with the low bit (bit 0) at column x = 0 and bit (width-1) at
 * column x = width-1. Cells are addressed as (x, y) with x in [0, width) and
 * y in [0, height); x grows right, y grows down.
 *
 * Widths up to [MAX_WIDTH] (32) and heights up to [MAX_HEIGHT] are supported,
 * which comfortably covers every practical pixel font. Values outside the
 * grid are ignored by reads (false) and by writes (no-op), so editor code can
 * move a cursor freely and never needs its own bounds checks.
 */
class Glyph(val width: Int, val height: Int) {

    init {
        require(width in 1..MAX_WIDTH) {
            "glyph width must be in 1..$MAX_WIDTH, got $width"
        }
        require(height in 1..MAX_HEIGHT) {
            "glyph height must be in 1..$MAX_HEIGHT, got $height"
        }
    }

    private val rows = IntArray(height)

    companion object {
        const val MAX_WIDTH = 32
        const val MAX_HEIGHT = 128

        fun empty(width: Int, height: Int): Glyph = Glyph(width, height)

        /** Builds a glyph from a raw row array. Bits above [width] are masked out. */
        fun fromRows(width: Int, height: Int, rows: IntArray): Glyph {
            val g = Glyph(width, height)
            val mask = g.rowMask
            for (y in 0 until height) g.rows[y] = rows[y] and mask
            return g
        }
    }

    private val rowMask: Int get() = if (width >= 32) -1 else (1 shl width) - 1

    /** Reads the pixel at (x, y). Out-of-range reads return false. */
    fun get(x: Int, y: Int): Boolean {
        if (x !in 0 until width || y !in 0 until height) return false
        return (rows[y] ushr x) and 1 == 1
    }

    /** Sets or clears the pixel at (x, y). Out-of-range writes are no-ops. */
    fun set(x: Int, y: Int, on: Boolean = true) {
        if (x !in 0 until width || y !in 0 until height) return
        rows[y] = if (on) rows[y] or (1 shl x) else rows[y] and (1 shl x).inv()
    }

    fun clear(x: Int, y: Int) = set(x, y, false)

    /** Flips the pixel at (x, y); returns true if it ended up on. */
    fun toggle(x: Int, y: Int): Boolean {
        if (x !in 0 until width || y !in 0 until height) return false
        val on = get(x, y)
        set(x, y, !on)
        return !on
    }

    /** Clears every pixel in the grid. */
    fun clearAll() {
        for (y in 0 until height) rows[y] = 0
    }

    /** Sets every pixel in the grid. */
    fun fillAll() {
        val mask = rowMask
        for (y in 0 until height) rows[y] = mask
    }

    fun isEmpty(): Boolean {
        for (y in 0 until height) if (rows[y] != 0) return false
        return true
    }

    fun isFull(): Boolean {
        val mask = rowMask
        for (y in 0 until height) if (rows[y] != mask) return false
        return true
    }

    /** Raw bit-packed bits for one row. */
    fun rowBits(y: Int): Int = rows[y] and rowMask

    /** Overwrites one row with raw bits (masked to the glyph width). */
    fun setRow(y: Int, bits: Int) {
        if (y in 0 until height) rows[y] = bits and rowMask
    }

    /** The number of set pixels in the grid. */
    fun countSet(): Int {
        var n = 0
        for (y in 0 until height) n += Integer.bitCount(rows[y] and rowMask)
        return n
    }

    /** A deep copy of this glyph. */
    fun copy(): Glyph = fromRows(width, height, rows.copyOf())

    /** The bounding box of the set pixels, or null for an empty grid. */
    fun boundingBox(): Rect? {
        var x0 = width
        var y0 = height
        var x1 = -1
        var y1 = -1
        for (y in 0 until height) {
            val bits = rows[y] and rowMask
            if (bits == 0) continue
            if (y < y0) y0 = y
            if (y > y1) y1 = y
            val low = Integer.numberOfTrailingZeros(bits)
            if (low < x0) x0 = low
            val high = 31 - Integer.numberOfLeadingZeros(bits)
            if (high > x1) x1 = high
        }
        return if (x1 < 0) null else Rect(x0, y0, x1 - x0 + 1, y1 - y0 + 1)
    }

    /** The horizontal span of set pixels on one row, or null if the row is empty. */
    fun rowSpan(y: Int): Rect? {
        val bits = rows[y] and rowMask
        if (bits == 0) return null
        return Rect(Integer.numberOfTrailingZeros(bits), y, 31 - Integer.numberOfLeadingZeros(bits) - Integer.numberOfTrailingZeros(bits) + 1, 1)
    }

    /**
     * Shifts all pixels by (dx, dy). Pixels that fall outside the grid are
     * discarded; the grid size is unchanged.
     */
    fun translate(dx: Int, dy: Int) {
        if (dx == 0 && dy == 0) return
        val out = IntArray(height)
        for (y in 0 until height) {
            val bits = rows[y] and rowMask
            if (bits == 0) continue
            var b = bits
            while (b != 0) {
                val x = Integer.numberOfTrailingZeros(b)
                b = b and (b - 1)
                val nx = x + dx
                val ny = y + dy
                if (nx in 0 until width && ny in 0 until height) out[ny] = out[ny] or (1 shl nx)
            }
        }
        for (y in 0 until height) rows[y] = out[y]
    }

    /** Mirrors the glyph horizontally (left-right) in place. */
    fun mirrorX() {
        for (y in 0 until height) {
            val bits = rows[y] and rowMask
            var out = 0
            var b = bits
            while (b != 0) {
                val x = Integer.numberOfTrailingZeros(b)
                b = b and (b - 1)
                out = out or (1 shl (width - 1 - x))
            }
            rows[y] = out
        }
    }

    /** Mirrors the glyph vertically (top-bottom) in place. */
    fun mirrorY() {
        rows.reverse()
    }

    /** Returns true if the glyph is symmetric left-right. */
    fun isSymmetricX(): Boolean {
        val copy = copy()
        copy.mirrorX()
        return this == copy
    }

    /** Returns true if the glyph is symmetric top-bottom. */
    fun isSymmetricY(): Boolean {
        val copy = copy()
        copy.mirrorY()
        return this == copy
    }

    /**
     * Returns a new glyph rotated 90 degrees clockwise. The result is
     * [height] wide and [width] tall. This is a standalone transform; the
     * font editor only exposes it for square grids so cell dimensions stay
     * uniform.
     */
    fun rotateCW(): Glyph {
        val out = Glyph(height, width)
        for (y in 0 until height) {
            val bits = rows[y] and rowMask
            var b = bits
            while (b != 0) {
                val x = Integer.numberOfTrailingZeros(b)
                b = b and (b - 1)
                // (x, y) lands at (height - 1 - y, x) in the new grid.
                out.rows[x] = out.rows[x] or (1 shl (height - 1 - y))
            }
        }
        return out
    }

    /** Returns a new glyph rotated 90 degrees counter-clockwise. */
    fun rotateCCW(): Glyph {
        val out = Glyph(height, width)
        for (y in 0 until height) {
            val bits = rows[y] and rowMask
            var b = bits
            while (b != 0) {
                val x = Integer.numberOfTrailingZeros(b)
                b = b and (b - 1)
                // (x, y) lands at (y, width - 1 - x) in the new grid.
                out.rows[width - 1 - x] = out.rows[width - 1 - x] or (1 shl y)
            }
        }
        return out
    }

    /** Returns a new glyph cropped to its bounding box, or an empty 1x1 glyph. */
    fun cropToBounds(): Glyph {
        val box = boundingBox() ?: return Glyph(1, 1)
        val out = Glyph(box.width, box.height)
        for (y in 0 until box.height) {
            val src = rows[box.y + y] and rowMask
            var b = src ushr box.x
            out.setRow(y, b)
        }
        return out
    }

    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (other !is Glyph) return false
        if (width != other.width || height != other.height) return false
        return rows.contentEquals(other.rows)
    }

    override fun hashCode(): Int {
        var h = 31 * width + height
        h = 31 * h + rows.contentHashCode()
        return h
    }

    override fun toString(): String = "Glyph(${width}x$height, ${countSet()} px set)"
}