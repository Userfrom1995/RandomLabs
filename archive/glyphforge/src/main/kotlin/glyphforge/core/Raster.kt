package glyphforge.core

/**
 * The run-length raster engine: "autotrace". A glyph's pixel grid is traced
 * into a compact, canonical representation (sorted, non-overlapping runs of
 * set pixels per row) and can be decoded back bit-exactly. This is the format
 * that travels through the `.gff` font file and into the code exporters.
 */
object Raster {

    /** An inclusive run of columns [start]..[end] on one row. */
    data class Run(val start: Int, val end: Int) {
        init {
            require(start >= 0 && end >= start) { "invalid run $start-$end" }
        }
        val length: Int get() = end - start + 1
        companion object {
            fun ofLength(start: Int, length: Int): Run = Run(start, start + length - 1)
        }
    }

    /** Encodes one row's set pixels as sorted, merged runs. */
    fun encodeRow(bits: Int, width: Int): List<Run> {
        val runs = mutableListOf<Run>()
        var b = bits and mask(width)
        while (b != 0) {
            val start = Integer.numberOfTrailingZeros(b)
            var run = 0
            while (start + run < width && ((b ushr (start + run)) and 1) == 1) run++
            runs.add(Run(start, start + run - 1))
            val clearMask = if (run >= 32 - start) -1 else ((1 shl run) - 1) shl start
            b = b and clearMask.inv()
        }
        return runs
    }

    /** Encodes a glyph's whole grid, one row's runs per entry. */
    fun encodeRows(g: Glyph): List<List<Run>> {
        val out = ArrayList<List<Run>>(g.height)
        for (y in 0 until g.height) out.add(encodeRow(g.rowBits(y), g.width))
        return out
    }

    /** Decodes per-row runs back into a glyph. Runs are validated on decode. */
    fun decodeRows(width: Int, height: Int, rows: List<List<Run>>): Glyph {
        require(rows.size == height) { "expected $height rows, got ${rows.size}" }
        val g = Glyph(width, height)
        for (y in 0 until height) {
            for (r in rows[y]) {
                if (r.start > r.end) throw IllegalArgumentException("invalid run on row $y: $r")
                if (r.end >= width) throw IllegalArgumentException("run on row $y exceeds glyph width: $r")
                for (x in r.start..r.end) g.set(x, y, true)
            }
        }
        return g
    }

    /**
     * Canonical text form of the runs: `y:s-e,s-e;y:s-e` with an empty glyph
     * rendered as `-`. This is what the `.gff` format stores.
     */
    fun runsToString(rows: List<List<Run>>): String {
        val parts = mutableListOf<String>()
        for ((y, runs) in rows.withIndex()) {
            if (runs.isEmpty()) continue
            parts.add("$y:${runs.joinToString(",") { "${it.start}-${it.end}" }}")
        }
        return if (parts.isEmpty()) "-" else parts.joinToString(";")
    }

    /**
     * Parses the canonical text form back into per-row runs, validating every
     * bound and rejecting non-canonical input (out-of-range columns, rows not
     * in increasing order, overlapping or adjacent runs).
     */
    fun parseRuns(text: String, width: Int, height: Int): List<List<Run>> {
        if (text == "-") return List(height) { emptyList() }
        val byRow = HashMap<Int, MutableList<Run>>()
        var lastRow = -1
        for (rowSpec in text.split(';')) {
            val idx = rowSpec.indexOf(':')
            if (idx <= 0) throw IllegalArgumentException("malformed row spec: '$rowSpec'")
            val y = rowSpec.substring(0, idx).toIntOrNull()
                ?: throw IllegalArgumentException("row index not a number in '$rowSpec'")
            if (y < 0 || y >= height) throw IllegalArgumentException("row index $y out of range 0..${height - 1}")
            if (y <= lastRow) throw IllegalArgumentException("row index $y is not strictly increasing (canonical rows must be ordered)")
            lastRow = y
            val existing = byRow.getOrPut(y) { mutableListOf() }
            for (runSpec in rowSpec.substring(idx + 1).split(',')) {
                if (runSpec.isBlank()) throw IllegalArgumentException("malformed run '$runSpec' in '$rowSpec'")
                val dash = runSpec.indexOf('-')
                if (dash <= 0) throw IllegalArgumentException("run '$runSpec' must be start-end")
                val start = runSpec.substring(0, dash).toIntOrNull()
                    ?: throw IllegalArgumentException("run start not a number in '$runSpec'")
                val end = runSpec.substring(dash + 1).toIntOrNull()
                    ?: throw IllegalArgumentException("run end not a number in '$runSpec'")
                if (start < 0 || start >= width || end < 0 || end >= width || start > end) {
                    throw IllegalArgumentException("run $start-$end on row $y out of range 0..${width - 1}")
                }
                if (existing.isNotEmpty() && start <= existing.last().end) {
                    throw IllegalArgumentException("run $start-$end on row $y overlaps or duplicates the previous run")
                }
                existing.add(Run(start, end))
            }
        }
        val out = ArrayList<List<Run>>(height)
        for (y in 0 until height) {
            val runs = byRow[y] ?: emptyList()
            // rows must be emitted in increasing order for canonical form.
            out.add(runs)
        }
        return out
    }

    /** True when [text] is valid canonical runs for the given grid. */
    fun isCanonicalRuns(text: String, width: Int, height: Int): Boolean =
        try {
            parseRuns(text, width, height)
            true
        } catch (e: IllegalArgumentException) {
            false
        }

    /** Renders the glyph as `#`/`.` ASCII art (top row first). */
    fun toArt(g: Glyph, on: Char = '#', off: Char = '.'): List<String> {
        val out = ArrayList<String>(g.height)
        for (y in 0 until g.height) {
            val sb = StringBuilder(g.width)
            for (x in 0 until g.width) sb.append(if (g.get(x, y)) on else off)
            out.add(sb.toString())
        }
        return out
    }

    /** Renders one glyph row as a string of [on]/[off] characters. */
    fun rowToArt(g: Glyph, y: Int, on: Char = '#', off: Char = '.'): String {
        val sb = StringBuilder(g.width)
        for (x in 0 until g.width) sb.append(if (g.get(x, y)) on else off)
        return sb.toString()
    }

    /**
     * Parses `#`/`.` art lines into a glyph. The lines must be exactly
     * [height] long and every line exactly [width] long; only `#`, `.`, and
     * optional surrounding whitespace are accepted.
     */
    fun fromArt(lines: List<String>, width: Int, height: Int): Glyph {
        val g = Glyph(width, height)
        if (lines.size != height) {
            throw IllegalArgumentException("expected $height art lines, got ${lines.size}")
        }
        for ((y, raw) in lines.withIndex()) {
            val line = raw.trim()
            if (line.length != width) {
                throw IllegalArgumentException("art line $y is ${line.length} chars, expected $width")
            }
            for ((x, ch) in line.withIndex()) {
                when (ch) {
                    '#' -> g.set(x, y, true)
                    '.' -> {}
                    else -> throw IllegalArgumentException("art line $y has unexpected character '$ch' at column $x (use '#' or '.')")
                }
            }
        }
        return g
    }

    /** Each row as a zero-padded lowercase hex string of the row bits. */
    fun rowHex(g: Glyph): List<String> {
        val digits = (g.width + 3) / 4
        return (0 until g.height).map { y ->
            g.rowBits(y).toString(16).padStart(digits, '0')
        }
    }

    /** All rows concatenated into one hex string (for compact exports). */
    fun rowHexString(g: Glyph): String = rowHex(g).joinToString("")

    /** Raw row-major byte map: one byte per row holding the pixel bits. */
    fun toBytes(g: Glyph): ByteArray {
        val out = ByteArray(g.height)
        for (y in 0 until g.height) out[y] = g.rowBits(y).toByte()
        return out
    }

    /**
     * Packs the traced runs into a compact byte stream for embedded export:
     *
     *     byte 0        grid width
     *     byte 1        grid height
     *     per row y:    1 byte run count, then (start, length) per run
     *
     * A typical 5x7 glyph is ~3-6 runs, so this is smaller than the raw pixel
     * map and needs no width in the payload beyond the header.
     */
    fun packRle(g: Glyph): ByteArray {
        val rows = encodeRows(g)
        val total = 2 + rows.sumOf { 1 + it.size * 2 }
        val out = ByteArray(total)
        var i = 0
        out[i++] = g.width.toByte()
        out[i++] = g.height.toByte()
        for (runs in rows) {
            out[i++] = runs.size.toByte()
            for (r in runs) {
                out[i++] = r.start.toByte()
                out[i++] = r.length.toByte()
            }
        }
        return out
    }

    /** Decodes a stream produced by [packRle] back into a glyph. */
    fun unpackRle(bytes: ByteArray): Glyph {
        if (bytes.size < 2) throw IllegalArgumentException("RLE stream too short (${bytes.size} bytes)")
        val width = bytes[0].toInt() and 0xFF
        val height = bytes[1].toInt() and 0xFF
        require(width in 1..Glyph.MAX_WIDTH && height in 1..Glyph.MAX_HEIGHT) {
            "invalid RLE grid ${width}x$height"
        }
        val g = Glyph(width, height)
        var i = 2
        for (y in 0 until height) {
            if (i >= bytes.size) throw IllegalArgumentException("RLE stream truncated at row $y")
            val n = bytes[i++].toInt() and 0xFF
            for (k in 0 until n) {
                if (i + 1 >= bytes.size) throw IllegalArgumentException("RLE stream truncated in row $y run $k")
                val start = bytes[i++].toInt() and 0xFF
                val len = bytes[i++].toInt() and 0xFF
                if (start >= width || len <= 0 || start + len > width) {
                    throw IllegalArgumentException("invalid RLE run start=$start len=$len on row $y (width $width)")
                }
                for (x in start until start + len) g.set(x, y, true)
            }
        }
        if (i != bytes.size) throw IllegalArgumentException("RLE stream has ${bytes.size - i} trailing bytes")
        return g
    }

    private fun mask(width: Int): Int = if (width >= 32) -1 else (1 shl width) - 1
}