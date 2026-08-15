package glyphforge.selftest

import glyphforge.core.Font
import glyphforge.core.Glyph
import glyphforge.editor.Command
import glyphforge.editor.Editor
import glyphforge.editor.ScriptParser
import glyphforge.editor.ScriptRunner
import java.io.ByteArrayOutputStream
import java.io.PrintStream

object EditorTests {
    fun suite(): Suite {
        val s = Suite("Editor")

        fun font(): Font {
            val f = Font.create("Ed", 5, 7, 6, 5)
            val a = Glyph(5, 7)
            a.set(1, 0); a.set(2, 0); a.set(0, 1); a.set(4, 6)
            f.put('A', a, 5)
            f.put('B', Glyph(5, 7), 5)
            return f
        }

        s.test("paint set/erase/toggle mutate the working glyph") {
            val e = Editor(font(), 'A')
            e.apply(Command.Step(1, 0, 1))
            e.apply(Command.Set)
            Check.isTrue(e.glyph().get(1, 0), "set painted")
            e.apply(Command.Erase)
            Check.isFalse(e.glyph().get(1, 0), "erased")
            e.apply(Command.Toggle)
            Check.isTrue(e.glyph().get(1, 0), "toggled on")
            Check.isTrue(e.dirty, "dirty after edits")
        }

        s.test("save commits the glyph into the font") {
            val f = font()
            val e = Editor(f, 'B')
            e.apply(Command.Step(2, 3, 1))
            e.apply(Command.Set)
            e.apply(Command.Save)
            Check.isTrue(f.glyph('B')!!.get(2, 3), "font glyph updated")
            Check.isFalse(e.dirty, "clean after save")
        }

        s.test("undo and redo restore pixel states") {
            val e = Editor(font(), 'B')
            e.apply(Command.Step(0, 0, 0)) // cursor at 0,0
            e.apply(Command.Set)
            Check.isTrue(e.glyph().get(0, 0), "painted")
            e.apply(Command.Undo)
            Check.isFalse(e.glyph().get(0, 0), "undone")
            e.apply(Command.Redo)
            Check.isTrue(e.glyph().get(0, 0), "redone")
        }

        s.test("copy/cut/paste clipboard") {
            val e = Editor(font(), 'B')
            e.apply(Command.Step(2, 2, 1))
            e.apply(Command.Set)
            e.apply(Command.Copy)
            Check.notNull(e.clipboard, "clipboard set")
            e.apply(Command.Clear)
            Check.isTrue(e.glyph().isEmpty(), "cleared")
            e.apply(Command.Paste)
            Check.isTrue(e.glyph().get(2, 2), "pasted pixel")
            e.apply(Command.Clear)
            e.apply(Command.Paste)
            Check.isTrue(e.glyph().get(2, 2), "paste re-usable")
        }

        s.test("paste with empty clipboard is an error") {
            val e = Editor(font(), 'B')
            val r = e.apply(Command.Paste)
            Check.isFalse(r.ok, "paste fails with no clipboard")
        }

        s.test("glyph switching commits the previous glyph and loads the new one") {
            val f = font()
            val e = Editor(f, 'A')
            e.apply(Command.Step(1, 1, 1))
            e.apply(Command.Set)
            e.apply(Command.Glyph('B'))
            Check.eq('B', e.currentChar, "switched to B")
            Check.isTrue(f.glyph('A')!!.get(1, 1), "A committed automatically on switch")
            e.apply(Command.Glyph('A'))
            Check.isTrue(e.glyph().get(1, 1), "A reloaded from font")
        }

        s.test("next and prev navigate defined glyphs") {
            val e = Editor(font(), 'A')
            e.apply(Command.Next)
            Check.eq('B', e.currentChar, "next is B")
            e.apply(Command.Next)
            Check.eq('A', e.currentChar, "next wraps to A")
            e.apply(Command.Prev)
            Check.eq('B', e.currentChar, "prev is B")
        }

        s.test("mirror, rotate, shift, invert transforms") {
            val e = Editor(font(), 'B')
            e.apply(Command.Step(0, 0, 0))
            e.apply(Command.Set)
            e.apply(Command.MirrorX)
            Check.isTrue(e.glyph().get(4, 0), "mirrored to right edge")
            e.apply(Command.Shift(-4, 0))
            Check.isTrue(e.glyph().get(0, 0), "shifted back to left")
            e.apply(Command.Invert)
            Check.isFalse(e.glyph().get(0, 0), "inverted off")
            Check.isTrue(e.glyph().get(1, 0), "inverted on")
        }

        s.test("rotate rejects non-square grids") {
            val e = Editor(font(), 'B')
            val r = e.apply(Command.RotateCw)
            Check.isFalse(r.ok, "rotate fails on 5x7")
            Check.isTrue(r.message.contains("square"), "mentions square")
        }

        s.test("rotate works on square grids") {
            val f = Font.create("Square", 4, 4, 4, 4)
            f.put('X', Glyph(4, 4), 4)
            val e = Editor(f, 'X')
            e.apply(Command.Step(0, 0, 0))
            e.apply(Command.Set)
            e.apply(Command.RotateCw)
            Check.isTrue(e.glyph().get(3, 0), "(0,0) rotated to (3,0)")
        }

        s.test("autofit centers content") {
            val e = Editor(font(), 'B')
            e.apply(Command.Step(0, 0, 0))
            e.apply(Command.Set)
            e.apply(Command.Autofit)
            // bbox was 1x1 at (0,0); centered: dx=(5-1)/2=2, dy=(7-1)/2=3 -> (2,3)
            Check.isTrue(e.glyph().get(2, 3), "content centered at (2,3)")
        }

        s.test("fillrow and fillcol") {
            val e = Editor(font(), 'B')
            e.apply(Command.FillRow(1))
            for (x in 0 until 5) Check.isTrue(e.glyph().get(x, 1), "row filled")
            e.apply(Command.FillCol(4))
            for (y in 0 until 7) Check.isTrue(e.glyph().get(4, y), "col filled")
        }

        s.test("clear, save, load flow") {
            val f = font()
            val e = Editor(f, 'A')
            e.apply(Command.Step(1, 1, 1))
            e.apply(Command.Set)
            e.apply(Command.Save)
            e.apply(Command.Clear)
            Check.isTrue(e.glyph().isEmpty(), "cleared")
            e.apply(Command.Load)
            Check.isTrue(e.glyph().get(1, 1), "reloaded from font")
        }

        s.test("cursor movement clamps to the grid") {
            val e = Editor(font(), 'A')
            e.apply(Command.Move(100, 100))
            Check.eq(4, e.cursorX, "x clamped")
            Check.eq(6, e.cursorY, "y clamped")
            e.apply(Command.Move(-5, -5))
            Check.eq(0, e.cursorX, "x clamped low")
            Check.eq(0, e.cursorY, "y clamped low")
        }

        s.test("status reports editor state") {
            val e = Editor(font(), 'A')
            val r = e.apply(Command.Status)
            Check.isTrue(r.ok, "status ok")
            Check.isTrue(r.message.contains("glyph 'A'"), "status mentions glyph")
            Check.isTrue(r.message.contains("cursor (0,0)"), "status mentions cursor")
        }

        s.test("print emits glyph art") {
            val e = Editor(font(), 'A')
            val r = e.apply(Command.Print)
            Check.isTrue(r.message.contains("#"), "art has pixels")
            Check.isTrue(r.message.contains("....."), "art has rows")
        }

        s.test("ScriptParser handles the full command vocabulary") {
            val lines = listOf(
                "glyph A", "move 1 2", "left", "right 2", "up", "down 3", "set", "erase",
                "toggle", "mode erase", "mode set", "clear", "invert", "mirrorx", "mirrory",
                "shift 1 0", "fillrow 0", "fillcol 1", "autofit", "copy", "cut", "paste",
                "undo", "redo", "save", "load", "status", "print", "help", "next", "prev", "quit",
            )
            for (line in lines) {
                Check.notNull(ScriptParser.parse(line), "parse: $line")
            }
        }

        s.test("ScriptParser rejects unknown commands and bad arguments") {
            Check.throws("unknown command") { ScriptParser.parse("frobnicate 1") }
            Check.throws("missing char") { ScriptParser.parse("glyph") }
            Check.throws("bad char") { ScriptParser.parse("glyph U+ZZZZ") }
            Check.throws("bad mode") { ScriptParser.parse("mode sideways") }
        }

        s.test("script lines can use U+XXXX and quoted selectors") {
            Check.eq(Command.Glyph('A'), ScriptParser.parse("glyph U+0041"), "hex selector")
            Check.eq(Command.Glyph('A'), ScriptParser.parse("glyph 65"), "decimal selector")
            Check.eq(Command.Glyph('A'), ScriptParser.parse("glyph 'A'"), "quoted selector")
        }

        s.test("a full scripted session draws, saves, and reports errors") {
            val f = font()
            val e = Editor(f, 'A')
            val out = ByteArrayOutputStream()
            val report = ScriptRunner.run(
                e,
                sequenceOf(
                    "# draw a pixel", "set", "right", "set", "save", "status",
                    "frobnicate", "quit",
                ),
                PrintStream(out),
            )
            Check.eq(6, report.commandCount, "six commands ran")
            Check.eq(1, report.errorCount, "one parse error")
            Check.isTrue(out.toString().contains("error: unknown command 'frobnicate'"), "error reported")
            Check.isTrue(out.toString().contains("bye"), "quit reached")
            Check.isTrue(f.glyph('A')!!.get(0, 0) && f.glyph('A')!!.get(1, 0), "glyph saved")
        }

        s.test("quit stops the session early") {
            val e = Editor(font(), 'A')
            val sink = PrintStream(ByteArrayOutputStream())
            val report = ScriptRunner.run(e, sequenceOf("set", "quit", "set"), sink)
            Check.eq(2, report.commandCount, "set + quit")
            Check.isTrue(e.glyph().get(0, 0), "first set applied")
            Check.eq(5, e.glyph().countSet(), "second set never applied (4 initial + 1)")
        }

        s.test("kern command sets and clears pairs on the font") {
            val f = font()
            val e = Editor(f, 'A')
            val r = e.apply(Command.Kern('A', 'B', -1))
            Check.isTrue(r.ok, "kern accepted")
            Check.eq(-1, f.kern('A', 'B'), "pair stored")
            val cleared = e.apply(Command.Kern('A', 'B', 0))
            Check.isTrue(cleared.ok, "clear accepted")
            Check.eq(0, f.kern('A', 'B'), "pair cleared")
        }

        s.test("kern command rejects out-of-range amounts") {
            val e = Editor(font(), 'A')
            val r = e.apply(Command.Kern('A', 'B', -99))
            Check.isFalse(r.ok, "bad kern rejected")
            Check.isTrue((r.message ?: "").contains("kern"), "message explains")
        }

        s.test("script parser reads kern lines") {
            Check.eq(Command.Kern('A', 'V', -1), ScriptParser.parse("kern A V -1"), "set pair")
            Check.eq(Command.Kern('A', 'V', 0), ScriptParser.parse("kern A V clear"), "clear pair")
            Check.throws("bad amount") { ScriptParser.parse("kern A V lots") }
            Check.throws("missing args") { ScriptParser.parse("kern A") }
        }

        return s
    }
}