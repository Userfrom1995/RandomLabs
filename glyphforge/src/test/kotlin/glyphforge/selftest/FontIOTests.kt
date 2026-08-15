package glyphforge.selftest

import glyphforge.core.Font
import glyphforge.core.FontIO
import glyphforge.core.Glyph
import java.nio.file.Files
import java.nio.file.Path

object FontIOTests {
    fun suite(): Suite {
        val s = Suite("FontIO")

        fun sampleFont(): Font {
            val f = Font.create("Test", 5, 7, 6, 5)
            val a = Glyph(5, 7)
            a.set(1, 0); a.set(2, 0); a.set(0, 1); a.set(4, 6)
            f.put('A', a, 5)
            val space = Glyph(5, 7)
            f.put(' ', space, 3)
            return f
        }

        s.test("write produces canonical deterministic text") {
            val text = FontIO.write(sampleFont())
            Check.eq("GF1", text.lineSequence().first(), "magic header")
            Check.isTrue(text.contains("name=Test"), "name line")
            Check.isTrue(text.contains("cellWidth=5"), "cellWidth")
            Check.isTrue(text.contains("cellHeight=7"), "cellHeight")
            Check.isTrue(text.contains("baseline=6"), "baseline")
            Check.isTrue(text.contains("defaultAdvance=5"), "defaultAdvance")
            Check.isTrue(text.contains("glyph:U+0020:adv=3:runs=-"), "space glyph with advance 3")
            Check.isTrue(text.contains("glyph:U+0041:adv=5:runs=0:1-2;1:0-0;6:4-4"), "A glyph runs")
            Check.eq(text, FontIO.write(sampleFont()), "deterministic output")
        }

        s.test("parse round trips a font") {
            val font = sampleFont()
            val parsed = FontIO.parse(FontIO.write(font))
            Check.eq(font.name, parsed.name, "name")
            Check.eq(font.cellWidth, parsed.cellWidth, "cellWidth")
            Check.eq(font.cellHeight, parsed.cellHeight, "cellHeight")
            Check.eq(font.baseline, parsed.baseline, "baseline")
            Check.eq(font.defaultAdvance, parsed.defaultAdvance, "defaultAdvance")
            Check.eq(font.glyphCount(), parsed.glyphCount(), "glyph count")
            Check.glyphEq(font.glyph('A')!!, parsed.glyph('A')!!, "A glyph")
            Check.glyphEq(font.glyph(' ')!!, parsed.glyph(' ')!!, "space glyph")
            Check.eq(3, parsed.advance(' '), "space advance")
        }

        s.test("glyphs come back sorted by code point") {
            val f = Font.create("T", 5, 7, 6, 5)
            f.put('Z', Glyph(5, 7), 5)
            f.put('A', Glyph(5, 7), 5)
            f.put('m', Glyph(5, 7), 5)
            val parsed = FontIO.parse(FontIO.write(f))
            Check.eq(listOf('A', 'Z', 'm'), parsed.chars(), "sorted by code point")
        }

        s.test("empty font round trips") {
            val f = Font.create("Empty", 5, 7, 6, 5)
            val parsed = FontIO.parse(FontIO.write(f))
            Check.eq(0, parsed.glyphCount(), "no glyphs")
        }

        s.test("parse rejects malformed files with line numbers") {
            val cases = listOf(
                "name=T\ncellWidth=5\ncellHeight=7\nbaseline=6\n" to "defaultAdvance",
                "GF1\nname=T\ncellWidth=5\ncellHeight=7\nbaseline=6\ndefaultAdvance=5\nbogus=1" to "unknown directive",
                "GF1\nname=T\ncellWidth=5\ncellHeight=7\nbaseline=6\ndefaultAdvance=99" to "must be in 1..5",
                "GF1\nname=T\ncellWidth=5\ncellHeight=7\nbaseline=6\ndefaultAdvance=5\nname=U" to "duplicate key",
                "GF1\nname=T\ncellWidth=x\ncellHeight=7\nbaseline=6\ndefaultAdvance=5" to "not an integer",
                "GF1\ncellWidth=5\ncellHeight=7\nbaseline=6\ndefaultAdvance=5" to "missing required key 'name'",
                "GF1\nname=T\ncellWidth=33\ncellHeight=7\nbaseline=6\ndefaultAdvance=5" to "cellWidth must be",
                "GF1\nname=T\ncellWidth=5\ncellHeight=7\nbaseline=6\ndefaultAdvance=5\nglyph:U+0041:adv=5:runs=0:0-9" to "out of range",
                "GF1\nname=T\ncellWidth=5\ncellHeight=7\nbaseline=6\ndefaultAdvance=5\nglyph:U+0041:adv=5:runs=0:1-2\nglyph:U+0041:adv=5:runs=1:1-2" to "duplicate glyph",
                "GF1\nname=T\ncellWidth=5\ncellHeight=7\nbaseline=6\ndefaultAdvance=5\nglyph:U+0041:adv=9:runs=-" to "out of range 0..5",
                "GF1\nname=T\ncellWidth=5\ncellHeight=7\nbaseline=6\ndefaultAdvance=5\nglyph:U+0000:adv=5:runs=-" to "code point",
                "GF1\nname=T\ncellWidth=5\ncellHeight=7\nbaseline=6\ndefaultAdvance=5\nglyph:Z:adv=5:runs=-" to "bad code point",
                "GF1\nname=T\ncellWidth=5\ncellHeight=7\nbaseline=6\ndefaultAdvance=5\nglyph:U+0041:adv=5:runs=0:1-2,2-3" to "overlaps",
            )
            for ((text, expected) in cases) {
                Check.throws("reject: $expected", expected) { FontIO.parse(text) }
            }
        }

        s.test("parse reports the offending line number") {
            try {
                FontIO.parse("GF1\nname=T\ncellWidth=5\ncellHeight=7\nbaseline=6\ndefaultAdvance=5\nbogus=1")
                Check.isTrue(false, "should have thrown")
            } catch (e: FontIO.FontFormatException) {
                Check.eq(7, e.line, "error reported on line 7")
            }
        }

        s.test("save and load to disk round trip") {
            val dir = Files.createTempDirectory("gff-test")
            val path = dir.resolve("font.gff")
            FontIO.save(sampleFont(), path)
            val loaded = FontIO.load(path)
            Check.glyphEq(sampleFont().glyph('A')!!, loaded.glyph('A')!!, "disk round trip")
            Check.eq(sampleFont().name, loaded.name, "disk name")
            Files.deleteIfExists(path)
            Files.deleteIfExists(dir)
        }

        s.test("load reports a missing file") {
            Check.throws("missing file") { FontIO.load(Path.of("/nonexistent/x.gff")) }
        }

        s.test("comments and blank lines are tolerated") {
            val text = """
                # a comment
                GF1

                name=Test
                cellWidth=5
                cellHeight=7
                baseline=6
                defaultAdvance=5
                # another comment
                glyph:U+0041:adv=5:runs=0:1-2;6:4-4
            """.trimIndent()
            val parsed = FontIO.parse(text)
            Check.eq(1, parsed.glyphCount(), "one glyph parsed")
            Check.isTrue(parsed.has('A'), "has A")
        }

        s.test("unicode code points above ASCII round trip") {
            val f = Font.create("U", 8, 8, 8, 8)
            val g = Glyph(8, 8)
            g.set(1, 1)
            f.put('Ω', g, 8)
            val parsed = FontIO.parse(FontIO.write(f))
            Check.isTrue(parsed.has('Ω'), "omega preserved")
            Check.glyphEq(g, parsed.glyph('Ω')!!, "omega glyph")
        }

        return s
    }
}