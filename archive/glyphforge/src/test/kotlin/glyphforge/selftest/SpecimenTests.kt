package glyphforge.selftest

import glyphforge.codegen.Specimen
import glyphforge.core.Font
import glyphforge.core.Glyph

object SpecimenTests {
    fun suite(): Suite {
        val s = Suite("Specimen")

        fun kernedFont(): Font {
            val f = Font.create("Tiny", 5, 7, 6, 5)
            val a = Glyph(5, 7)
            a.set(0, 0); a.set(4, 6)
            f.put('A', a, 5)
            f.put('V', Glyph(5, 7), 5)
            f.setKern('A', 'V', -1)
            return f
        }

        s.test("generates a self-contained html page") {
            val html = Specimen.generate(kernedFont())
            Check.isTrue(html.contains("<!doctype html>"), "doctype")
            Check.isTrue(html.contains("Glyphforge</span> specimen"), "branded header")
            Check.isTrue(html.contains("</script>"), "script present")
            Check.isTrue(html.contains("</body>"), "body closed")
            Check.isFalse(html.contains("http://") || html.contains("https://"), "no external links")
        }

        s.test("page title mentions the font name and is overridable") {
            Check.isTrue(Specimen.generate(kernedFont()).contains("<title>Tiny - Glyphforge specimen</title>"), "default title")
            Check.isTrue(Specimen.generate(kernedFont(), "My Special Page").contains("<title>My Special Page</title>"), "custom title")
        }

        s.test("embeds every glyph's codepoint, advance, and row bits") {
            val html = Specimen.generate(kernedFont())
            Check.isTrue(html.contains("c: 65, a: 5, r: [0x01,0x00,0x00,0x00,0x00,0x00,0x10]"), "A glyph data")
            Check.isTrue(html.contains("c: 86, a: 5, r: [0x00,0x00,0x00,0x00,0x00,0x00,0x00]"), "V glyph data")
        }

        s.test("embeds the kern table") {
            val html = Specimen.generate(kernedFont())
            Check.isTrue(html.contains("[ 65, 86, -1 ]"), "kern pair embedded")
            Check.isTrue(html.contains("kernOf"), "kern lookup present")
        }

        s.test("output is deterministic") {
            Check.eq(Specimen.generate(kernedFont()), Specimen.generate(kernedFont()), "identical fonts, identical pages")
        }

        s.test("escapes html in the title") {
            val html = Specimen.generate(kernedFont(), "A <b>& \"quoted\"</b> page")
            Check.isTrue(html.contains("A &lt;b&gt;&amp; &quot;quoted&quot;&lt;/b&gt; page"), "escaped title")
        }

        s.test("an empty font still produces a valid page") {
            val f = Font.create("Blank", 4, 4, 4, 4)
            val html = Specimen.generate(f)
            Check.isTrue(html.contains("0 glyphs, 0 kern pairs"), "empty font summary")
            Check.isTrue(html.contains("glyphs: [\n  ],"), "empty glyph array")
        }

        return s
    }
}