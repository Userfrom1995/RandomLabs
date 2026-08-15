package glyphforge.selftest

import glyphforge.core.Font
import glyphforge.core.Glyph
import glyphforge.core.RenderMode
import glyphforge.core.Renderer

object RendererTests {
    fun suite(): Suite {
        val s = Suite("Renderer")

        /** A 3x3 font: 'A' is a filled triangle, 'B' a filled 2x2 block. */
        fun font(): Font {
            val f = Font.create("Tiny", 3, 3, 3, 3)
            val a = Glyph(3, 3)
            a.set(1, 0)
            a.set(0, 1); a.set(1, 1); a.set(2, 1)
            a.set(1, 2)
            f.put('A', a, 3)
            val b = Glyph(3, 3)
            b.set(0, 0); b.set(1, 0)
            b.set(0, 1); b.set(1, 1)
            f.put('B', b, 2)
            f.put(' ', Glyph(3, 3), 1)
            return f
        }

        s.test("known-answer ASCII render") {
            val rows = Renderer.render(font(), "A", RenderMode.ASCII, 1, onChar = '#', offChar = '.')
            Check.eq(listOf(".#.", "###", ".#."), rows, "A art")
        }

        s.test("multiple chars compose left to right with advance widths") {
            val rows = Renderer.render(font(), "AB", RenderMode.ASCII, 1, onChar = '#', offChar = '.')
            // A (adv 3) then B (adv 2): row 0 = ".#." + "##" => ".#.##"
            Check.eq(listOf(".#.##", "#####", ".#..."), rows, "AB composed")
        }

        s.test("undefined characters render as blank of default advance") {
            val rows = Renderer.render(font(), "A~", RenderMode.ASCII, 1, onChar = '#', offChar = '.')
            // A adv 3 + undefined adv default 3 => ".#." + "..."
            Check.eq(listOf(".#....", "###...", ".#...."), rows, "undefined char blank")
        }

        s.test("newlines produce separate row groups") {
            val rows = Renderer.render(font(), "A\nA", RenderMode.ASCII, 1, onChar = '#', offChar = '.')
            Check.eq(listOf(".#.", "###", ".#.", ".#.", "###", ".#."), rows, "two lines")
        }

        s.test("scale repeats pixels") {
            val rows = Renderer.render(font(), "A", RenderMode.ASCII, 2, onChar = '#', offChar = '.')
            Check.eq(listOf("..##..", "..##..", "######", "######", "..##..", "..##.."), rows, "scaled 2x")
        }

        s.test("scale 1 blocks mode uses solid characters") {
            val rows = Renderer.render(font(), "A", RenderMode.BLOCKS, 1)
            Check.eq(listOf(" █ ", "███", " █ "), rows, "block art")
        }

        s.test("ansi mode embeds escape codes and resets") {
            val rows = Renderer.render(font(), "A", RenderMode.ANSI, 1)
            Check.isTrue(rows[0].contains("\u001B["), "escape code present")
            Check.isTrue(rows[0].contains(Renderer.ANSI_RESET), "reset present")
        }

        s.test("empty string renders nothing") {
            Check.eq(emptyList<String>(), Renderer.render(font(), "", RenderMode.ASCII, 1), "no rows")
        }

        s.test("space advance is honored") {
            val rows = Renderer.render(font(), "B B", RenderMode.ASCII, 1)
            // B adv 2 + space adv 1 + B adv 2 => "## ##"
            Check.eq(listOf("## ##", "## ##", "     "), rows, "space gaps")
        }

        s.test("scale is validated") {
            Check.throws("scale 0 rejected") { Renderer.render(font(), "A", RenderMode.ASCII, 0) }
        }

        s.test("render mode parsing") {
            Check.eq(RenderMode.ASCII, RenderMode.parse("ascii"), "ascii")
            Check.eq(RenderMode.BLOCKS, RenderMode.parse("blocks"), "blocks")
            Check.eq(RenderMode.ANSI, RenderMode.parse("ansi"), "ansi")
            Check.throws("unknown mode") { RenderMode.parse("svg") }
        }

        s.test("custom on/off characters") {
            val rows = Renderer.render(font(), "A", RenderMode.ASCII, 1, onChar = '@', offChar = '.')
            Check.eq(listOf(".@.", "@@@", ".@."), rows, "custom chars")
        }

        return s
    }
}