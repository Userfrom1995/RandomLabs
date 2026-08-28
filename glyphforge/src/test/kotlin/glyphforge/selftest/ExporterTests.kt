package glyphforge.selftest

import glyphforge.codegen.ExportFormat
import glyphforge.codegen.Exporter
import glyphforge.core.Font
import glyphforge.core.Glyph
import glyphforge.core.Raster

object ExporterTests {
    fun suite(): Suite {
        val s = Suite("Exporter")

        fun sampleFont(): Font {
            val f = Font.create("Micro", 5, 7, 6, 5)
            val a = Glyph(5, 7)
            a.set(0, 0); a.set(1, 0); a.set(2, 0); a.set(0, 1); a.set(4, 6)
            f.put('A', a, 5)
            val b = Glyph(5, 7)
            b.set(3, 1); b.set(3, 2); b.set(3, 5); b.set(4, 0)
            f.put('B', b, 4)
            f.put(' ', Glyph(5, 7), 3)
            f.put('.', Glyph(5, 7), 2)
            val omega = Glyph(5, 7)
            omega.set(0, 0); omega.set(4, 0); omega.set(1, 1); omega.set(3, 1); omega.set(2, 2)
            f.put('Ω', omega, 5)
            return f
        }

        fun kotlinRowArrays(src: String): List<IntArray> {
            val block = src.substringAfter("= arrayOf(").substringBefore("\n    )")
            val re = Regex("intArrayOf\\(([^)]*)\\)")
            return re.findAll(block).map { m ->
                m.groupValues[1].split(',').filter { it.isNotBlank() }.map { it.trim().removePrefix("0x").toInt(16) }.toIntArray()
            }.toList()
        }

        fun byteArrayBlocks(src: String): List<IntArray> {
            val re = Regex("byteArrayOf\\(([^)]*)\\)")
            return re.findAll(src).map { m ->
                m.groupValues[1].split(',').filter { it.isNotBlank() }.map { it.trim().toInt() }.toIntArray()
            }.toList()
        }

        fun javaRows(src: String): List<IntArray> {
            val block = src.substringAfter("ROWS = {").substringBefore("};")
            val re = Regex("\\{\\s*(0x[0-9A-Fa-f]+(?:\\s*,\\s*0x[0-9A-Fa-f]+)*)\\s*\\}")
            return re.findAll(block).map { m ->
                m.groupValues[1].split(',').map { it.trim().removePrefix("0x").toInt(16) }.toIntArray()
            }.toList()
        }

        fun cRows(src: String): List<IntArray> {
            val re = Regex("static const (?:uint8_t|uint16_t|uint32_t) (\\w+)\\[(\\d+)\\] = \\{ ([^}]+) \\};")
            return re.findAll(src).map { m ->
                m.groupValues[3].split(',').map { it.trim().removePrefix("0x").toInt(16) }.toIntArray()
            }.toList()
        }

        fun rebuild(font: Font, rowSets: List<IntArray>): List<Glyph> {
            val chars = font.chars()
            Check.eq(chars.size, rowSets.size, "one row set per glyph")
            return rowSets.map { rows ->
                Check.eq(font.cellHeight, rows.size, "one row per grid height")
                Glyph.fromRows(font.cellWidth, font.cellHeight, rows)
            }
        }

        s.test("kotlin export rebuilds every glyph from its rows") {
            val font = sampleFont()
            val src = Exporter.export(font, ExportFormat.KOTLIN, rle = false)
            Check.isTrue(src.contains("object Micro"), "object declared")
            Check.isTrue(src.contains("CELL_WIDTH: Int = 5"), "width constant")
            Check.isTrue(src.contains("'A'"), "char literals")
            val rebuilt = rebuild(font, kotlinRowArrays(src))
            for ((i, c) in font.chars().withIndex()) {
                Check.glyphEq(font.glyph(c)!!, rebuilt[i], "kotlin rows for $c")
            }
        }

        s.test("kotlin RLE export rebuilds every glyph") {
            val font = sampleFont()
            val src = Exporter.export(font, ExportFormat.KOTLIN, rle = true)
            Check.isTrue(src.contains("MicroRle"), "Rle object declared")
            Check.isTrue(src.contains("STREAMS"), "streams array")
            val streams = byteArrayBlocks(src)
            val chars = font.chars()
            Check.eq(chars.size, streams.size, "one stream per glyph")
            for ((i, c) in chars.withIndex()) {
                val bytes = streams[i].map { it.toByte() }.toByteArray()
                Check.glyphEq(font.glyph(c)!!, Raster.unpackRle(bytes), "kotlin rle stream for $c")
            }
        }

        s.test("java export rebuilds every glyph") {
            val font = sampleFont()
            val src = Exporter.export(font, ExportFormat.JAVA, rle = false)
            Check.isTrue(src.contains("public final class Micro"), "class declared")
            Check.isTrue(src.contains("ROWS"), "rows array")
            val rebuilt = rebuild(font, javaRows(src))
            for ((i, c) in font.chars().withIndex()) {
                Check.glyphEq(font.glyph(c)!!, rebuilt[i], "java rows for $c")
            }
        }

        s.test("C export rebuilds every glyph") {
            val font = sampleFont()
            val src = Exporter.export(font, ExportFormat.C, rle = false)
            Check.isTrue(src.contains("#define MICRO_CELL_WIDTH  5"), "width define")
            Check.isTrue(src.contains("struct micro_glyph"), "glyph struct")
            Check.isTrue(src.contains("0x03A9"), "omega as hex codepoint")
            val rebuilt = rebuild(font, cRows(src))
            for ((i, c) in font.chars().withIndex()) {
                Check.glyphEq(font.glyph(c)!!, rebuilt[i], "c rows for $c")
            }
        }

        s.test("C RLE export is decodable") {
            val font = sampleFont()
            val src = Exporter.export(font, ExportFormat.C, rle = true)
            Check.isTrue(src.contains("_streams["), "streams table")
            val block = src.substringAfter("micro_streams[").substringBefore("};")
            val re = Regex("\\{\\s*([0-9]+(?:\\s*,\\s*[0-9]+)*)\\s*\\}")
            val streams = re.findAll(block).map { m ->
                m.groupValues[1].split(',').map { it.trim().toInt().toByte() }.toByteArray()
            }.toList()
            val chars = font.chars()
            Check.eq(chars.size, streams.size, "one stream per glyph")
            for ((i, c) in chars.withIndex()) {
                Check.glyphEq(font.glyph(c)!!, Raster.unpackRle(streams[i]), "c rle stream for $c")
            }
        }

        s.test("text export shows every glyph as art") {
            val font = sampleFont()
            val src = Exporter.export(font, ExportFormat.TEXT, rle = false)
            Check.isTrue(src.contains("'A' U+0041 advance 5"), "A header")
            Check.isTrue(src.contains("###.."), "A row 0 art")
            Check.isTrue(src.contains("rows 07"), "hex rows listed")
        }

        s.test("exports are deterministic") {
            val font = sampleFont()
            for (fmt in ExportFormat.values()) {
                val a = Exporter.export(font, fmt, rle = false)
                val b = Exporter.export(font, fmt, rle = false)
                Check.eq(a, b, "deterministic ${fmt.display}")
            }
        }

        s.test("kotlin export with a package emits the package line") {
            val src = Exporter.export(sampleFont(), ExportFormat.KOTLIN, rle = false, packageName = "com.retro.fonts")
            Check.isTrue(src.contains("package com.retro.fonts"), "package emitted")
        }

        s.test("advance values are exported faithfully") {
            val font = sampleFont()
            val src = Exporter.export(font, ExportFormat.KOTLIN, rle = false)
            val adv = Regex("val ADVANCE: IntArray = intArrayOf\\(([^)]*)\\)").find(src)!!.groupValues[1]
            Check.eq(font.chars().joinToString(", ") { font.advance(it).toString() }, adv, "advance list")
        }

        s.test("wide grids use 32-bit rows") {
            val f = Font.create("Wide", 16, 3, 3, 16)
            val g = Glyph(16, 3)
            g.set(15, 2)
            f.put('X', g, 16)
            val kotlin = Exporter.export(f, ExportFormat.KOTLIN, rle = false)
            Check.isTrue(kotlin.contains("0x8000"), "bit 15 as 0x8000")
            val c = Exporter.export(f, ExportFormat.C, rle = false)
            Check.isTrue(c.contains("uint16_t"), "16-bit C row type")
        }

        s.test("char escaping in kotlin export") {
            Check.eq("'\\''", Exporter.ktChar('\''), "single quote")
            Check.eq("'\\\\'", Exporter.ktChar('\\'), "backslash")
            Check.eq("'A'", Exporter.ktChar('A'), "plain char")
        }

        s.test("c char literals escape quotes and backslash") {
            Check.eq("'\\''", Exporter.cChar('\''), "quote")
            Check.eq("'\\\\'", Exporter.cChar('\\'), "backslash")
            Check.eq("'A'", Exporter.cChar('A'), "ascii printable as char literal")
            Check.eq("0x03A9", Exporter.cChar('Ω'), "non-ascii as hex codepoint")
        }

        s.test("export format parsing") {
            Check.eq(ExportFormat.KOTLIN, ExportFormat.parse("kotlin"), "kotlin")
            Check.eq(ExportFormat.C, ExportFormat.parse("c-header"), "c-header")
            Check.throws("unknown format") { ExportFormat.parse("rust") }
        }

        fun kernedFont(): Font {
            val f = Font.create("Kern", 5, 7, 6, 5)
            f.put('A', Glyph(5, 7), 5)
            f.put('V', Glyph(5, 7), 5)
            f.setKern('A', 'V', -1)
            f.setKern('V', 'A', -2)
            return f
        }

        s.test("kotlin export emits the kern table") {
            val src = Exporter.export(kernedFont(), ExportFormat.KOTLIN, rle = false)
            Check.isTrue(src.contains("val KERN_LEFT: CharArray = charArrayOf('A', 'V')"), "kern left chars")
            Check.isTrue(src.contains("val KERN_RIGHT: CharArray = charArrayOf('V', 'A')"), "kern right chars")
            Check.isTrue(src.contains("val KERN_AMOUNT: IntArray = intArrayOf(-1, -2)"), "kern amounts")
            Check.isTrue(src.contains("fun kern(a: Char, b: Char): Int"), "kern lookup")
        }

        s.test("kotlin RLE export emits the kern table") {
            val src = Exporter.export(kernedFont(), ExportFormat.KOTLIN, rle = true)
            Check.isTrue(src.contains("val KERN_LEFT: CharArray = charArrayOf('A', 'V')"), "kern left chars")
            Check.isTrue(src.contains("val KERN_AMOUNT: IntArray = intArrayOf(-1, -2)"), "kern amounts")
        }

        s.test("java export emits the kern table") {
            val src = Exporter.export(kernedFont(), ExportFormat.JAVA, rle = false)
            Check.isTrue(src.contains("public static final char[] KERN_LEFT = { 'A', 'V' };"), "kern left chars")
            Check.isTrue(src.contains("public static final int[] KERN_AMOUNT = { -1, -2 };"), "kern amounts")
            Check.isTrue(src.contains("public static int kern(char a, char b)"), "kern lookup")
        }

        s.test("C export emits the kern table") {
            val src = Exporter.export(kernedFont(), ExportFormat.C, rle = false)
            Check.isTrue(src.contains("#define KERN_KERN_COUNT 2"), "kern count define")
            Check.isTrue(src.contains("kern_kern_left"), "kern left table")
            Check.isTrue(src.contains("{ 'A', 'V' };"), "kern left values")
            Check.isTrue(src.contains("kern_kern_amount"), "kern amount table")
            Check.isTrue(src.contains("{ -1, -2 };"), "kern amounts")
            Check.isTrue(src.contains("static int kern_kern(int a, int b)"), "kern lookup")
        }

        s.test("text export lists kern pairs") {
            val src = Exporter.export(kernedFont(), ExportFormat.TEXT, rle = false)
            Check.isTrue(src.contains("Kerning pairs (left, right, amount):"), "kern section")
            Check.isTrue(src.contains("kern 'A' 'V' -1"), "first pair")
            Check.isTrue(src.contains("kern 'V' 'A' -2"), "second pair")
        }

        s.test("kerned exports are deterministic") {
            val font = kernedFont()
            for (fmt in ExportFormat.values()) {
                Check.eq(
                    Exporter.export(font, fmt, rle = false),
                    Exporter.export(font, fmt, rle = false),
                    "deterministic ${fmt.display}"
                )
            }
        }

        return s
    }
}