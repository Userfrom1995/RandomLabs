package glyphforge.selftest

import glyphforge.core.Glyph
import glyphforge.core.Raster
import kotlin.random.Random

object RasterTests {
    fun suite(): Suite {
        val s = Suite("Raster")

        s.test("encodeRow merges contiguous pixels") {
            val g = Glyph(8, 1)
            g.set(0, 0); g.set(1, 0); g.set(2, 0); g.set(4, 0); g.set(5, 0)
            val runs = Raster.encodeRow(g.rowBits(0), 8)
            Check.eq(listOf(Raster.Run(0, 2), Raster.Run(4, 5)), runs, "merged runs")
        }

        s.test("encodeRow handles scattered and empty rows") {
            val g = Glyph(8, 3)
            g.set(3, 0); g.set(6, 0)
            Check.eq(listOf(Raster.Run(3, 3), Raster.Run(6, 6)), Raster.encodeRow(g.rowBits(0), 8), "two single-pixel runs")
            Check.eq(emptyList<Raster.Run>(), Raster.encodeRow(g.rowBits(1), 8), "empty row")
        }

        s.test("encodeRows/decodeRows round trip on a known glyph") {
            val g = Glyph(5, 7)
            g.set(0, 0); g.set(1, 0); g.set(2, 1); g.set(4, 6)
            val rows = Raster.encodeRows(g)
            val back = Raster.decodeRows(5, 7, rows)
            Check.glyphEq(g, back, "round trip")
        }

        s.test("encodeRows/decodeRows round trip on random glyphs") {
            val rng = Random(12345)
            for (trial in 0 until 200) {
                val w = rng.nextInt(1, 9)
                val h = rng.nextInt(1, 9)
                val g = Glyph(w, h)
                repeat(rng.nextInt(0, w * h + 1)) {
                    g.set(rng.nextInt(w), rng.nextInt(h), true)
                }
                Check.glyphEq(g, Raster.decodeRows(w, h, Raster.encodeRows(g)), "random glyph $trial")
            }
        }

        s.test("runsToString/parseRuns round trip") {
            val g = Glyph(5, 7)
            g.set(1, 0); g.set(2, 0); g.set(0, 1); g.set(4, 6)
            val text = Raster.runsToString(Raster.encodeRows(g))
            Check.eq("0:1-2;1:0-0;6:4-4", text, "canonical runs text")
            val parsed = Raster.parseRuns(text, 5, 7)
            Check.glyphEq(g, Raster.decodeRows(5, 7, parsed), "text round trip")
        }

        s.test("empty glyph serializes as dash") {
            val g = Glyph(5, 7)
            Check.eq("-", Raster.runsToString(Raster.encodeRows(g)), "empty marker")
            Check.eq(emptyList<Any>(), Raster.parseRuns("-", 5, 7)[0], "dash parses to no runs")
        }

        s.test("parseRuns rejects malformed input") {
            Check.throws("out of range row") { Raster.parseRuns("9:1-2", 5, 7) }
            Check.throws("negative row") { Raster.parseRuns("-1:1-2", 5, 7) }
            Check.throws("out of range column") { Raster.parseRuns("0:4-6", 5, 7) }
            Check.throws("start after end") { Raster.parseRuns("0:3-1", 5, 7) }
            Check.throws("overlapping runs") { Raster.parseRuns("0:1-3,2-5", 5, 7) }
            Check.throws("adjacent runs") { Raster.parseRuns("0:1-3,4-5", 5, 7) }
            Check.throws("duplicate row") { Raster.parseRuns("0:1-1;0:2-2", 5, 7) }
            Check.throws("non-numeric start") { Raster.parseRuns("0:a-2", 5, 7) }
            Check.throws("missing colon") { Raster.parseRuns("01-2", 5, 7) }
            Check.isFalse(Raster.isCanonicalRuns("0:1-3,4-5", 5, 7), "adjacent is not canonical")
            Check.isTrue(Raster.isCanonicalRuns("0:1-2;4:0-4", 5, 7), "canonical accepted")
        }

s.test("toArt/fromArt round trip and validation") {
            val g = Glyph(5, 7)
            g.set(0, 0); g.set(1, 0); g.set(2, 0); g.set(2, 1); g.set(4, 6)
            val art = Raster.toArt(g)
            Check.eq("###..", art[0], "row 0 art")
            Check.eq("..#..", art[1], "row 1 art")
            val back = Raster.fromArt(art, 5, 7)
            Check.glyphEq(g, back, "art round trip")
            Check.throws("wrong row count") { Raster.fromArt(listOf("#####"), 5, 7) }
            Check.throws("wrong column count") { Raster.fromArt(listOf("######"), 5, 1) }
            Check.throws("illegal character") { Raster.fromArt(listOf("##O##"), 5, 1) }
        }

        s.test("rowHex known values") {
            val g = Glyph(8, 2)
            g.setRow(0, 0b00000100) // 0x04
            g.setRow(1, 0b10001010) // 0x8A
            Check.eq(listOf("04", "8a"), Raster.rowHex(g), "row hex lowercase")
            Check.eq("048a", Raster.rowHexString(g), "concatenated hex")
        }

        s.test("rowHex pads to nibbles for narrow glyphs") {
            val g = Glyph(5, 1)
            g.setRow(0, 0b00101)
            Check.eq(listOf("05"), Raster.rowHex(g), "2-digit padded hex")
        }

        s.test("toBytes row-major byte map") {
            val g = Glyph(8, 2)
            g.setRow(0, 0x04)
            g.setRow(1, 0x8A)
            val bytes = Raster.toBytes(g)
            Check.eq(2, bytes.size, "one byte per row")
            Check.eq(4, bytes[0].toInt() and 0xFF, "row 0 byte")
            Check.eq(0x8A, bytes[1].toInt() and 0xFF, "row 1 byte")
        }

        s.test("packRle/unpackRle round trip and compactness") {
            val g = Glyph(5, 7)
            g.set(1, 0); g.set(2, 0); g.set(0, 1); g.set(4, 6)
            val packed = Raster.packRle(g)
            Check.glyphEq(g, Raster.unpackRle(packed), "rle round trip")
            Check.isTrue(packed.size < g.height * 5, "rle stream smaller than raw 5x7 grid")
            Check.eq(g.width, packed[0].toInt() and 0xFF, "width header")
            Check.eq(g.height, packed[1].toInt() and 0xFF, "height header")
        }

        s.test("packRle/unpackRle round trip on random glyphs") {
            val rng = Random(99)
            for (trial in 0 until 100) {
                val w = rng.nextInt(1, 9)
                val h = rng.nextInt(1, 9)
                val g = Glyph(w, h)
                repeat(rng.nextInt(0, w * h + 1)) {
                    g.set(rng.nextInt(w), rng.nextInt(h), true)
                }
                Check.glyphEq(g, Raster.unpackRle(Raster.packRle(g)), "rle random $trial")
            }
        }

        s.test("unpackRle rejects corrupt streams") {
            Check.throws("too short") { Raster.unpackRle(byteArrayOf(5)) }
            Check.throws("bad dimensions") { Raster.unpackRle(byteArrayOf(0, 0)) }
            val bad = byteArrayOf(3, 3, 2, 5, 1, 0, 1) // run start 5 >= width 3
            Check.throws("run out of range") { Raster.unpackRle(bad) }
            val truncated = byteArrayOf(3, 3, 3, 1, 1, 1) // claims 3 runs, has 1
            Check.throws("truncated stream") { Raster.unpackRle(truncated) }
        }

        s.test("runs encode/decode of full rows") {
            val g = Glyph(5, 3)
            g.fillAll()
            val rows = Raster.encodeRows(g)
            Check.eq(listOf(Raster.Run(0, 4)), rows[0], "full row is one run")
            Check.glyphEq(g, Raster.decodeRows(5, 3, rows), "full grid round trip")
        }

        return s
    }
}