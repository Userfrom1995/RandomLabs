package glyphforge.selftest

import glyphforge.core.Glyph

object GlyphTests {
    fun suite(): Suite {
        val s = Suite("Glyph")

        s.test("set/get/toggle basic operations") {
            val g = Glyph(5, 7)
            Check.isFalse(g.get(2, 3), "initially off")
            g.set(2, 3)
            Check.isTrue(g.get(2, 3), "set on")
            Check.eq(1, g.countSet(), "one pixel set")
            g.toggle(2, 3)
            Check.isFalse(g.get(2, 3), "toggled off")
            Check.eq(0, g.countSet(), "empty again")
            g.set(2, 3, true)
            Check.isTrue(g.get(2, 3), "set(true) on")
            g.set(2, 3, false)
            Check.isFalse(g.get(2, 3), "set(false) off")
        }

        s.test("out-of-range reads are false and writes are no-ops") {
            val g = Glyph(4, 4)
            Check.isFalse(g.get(-1, 0), "negative x")
            Check.isFalse(g.get(4, 0), "past width")
            Check.isFalse(g.get(0, 4), "past height")
            g.set(-1, 0, true)
            g.set(4, 0, true)
            g.set(0, 9, true)
            Check.eq(0, g.countSet(), "nothing set out of range")
        }

        s.test("clearAll, fillAll, isEmpty, isFull") {
            val g = Glyph(8, 5)
            Check.isTrue(g.isEmpty(), "empty")
            Check.isFalse(g.isFull(), "not full")
            g.fillAll()
            Check.isTrue(g.isFull(), "full")
            Check.isFalse(g.isEmpty(), "not empty")
            Check.eq(40, g.countSet(), "40 pixels")
            g.clearAll()
            Check.isTrue(g.isEmpty(), "cleared")
        }

        s.test("copy is independent") {
            val g = Glyph(5, 5)
            g.set(0, 0)
            val c = g.copy()
            c.set(1, 1)
            Check.isFalse(g.get(1, 1), "original unaffected")
            Check.isTrue(c.get(1, 1), "copy changed")
        }

        s.test("boundingBox") {
            val g = Glyph(6, 6)
            Check.isNull(g.boundingBox(), "empty glyph has no box")
            g.set(2, 1)
            g.set(4, 4)
            val box = Check.notNull(g.boundingBox(), "box present") as glyphforge.core.Rect
            Check.eq(2, box.x, "box x")
            Check.eq(1, box.y, "box y")
            Check.eq(3, box.width, "box width")
            Check.eq(4, box.height, "box height")
        }

        s.test("translate clips at the grid edge") {
            val g = Glyph(4, 4)
            g.set(0, 0)
            g.translate(2, 0)
            Check.isTrue(g.get(2, 0), "moved right")
            g.translate(5, 0)
            Check.eq(0, g.countSet(), "shifted fully off the grid")
            g.set(0, 0)
            g.translate(-1, -1)
            Check.eq(0, g.countSet(), "shifted off the top-left corner")
        }

        s.test("mirrorX flips left-right") {
            val g = Glyph(3, 3)
            g.set(0, 0)
            g.mirrorX()
            Check.isTrue(g.get(2, 0), "pixel mirrored to x=2")
            Check.isFalse(g.get(0, 0), "original gone")
        }

        s.test("mirrorY flips top-bottom") {
            val g = Glyph(3, 3)
            g.set(0, 0)
            g.mirrorY()
            Check.isTrue(g.get(0, 2), "pixel mirrored to y=2")
        }

        s.test("rotateCW and rotateCCW are inverse round trips") {
            val g = Glyph(3, 3)
            g.set(0, 0)
            val cw = g.rotateCW()
            Check.isTrue(cw.get(2, 0), "(0,0) rotated CW lands at (2,0)")
            val back = cw.rotateCCW()
            Check.glyphEq(g, back, "cw then ccw returns original")
            val ccw = g.rotateCCW()
            Check.isTrue(ccw.get(0, 2), "(0,0) rotated CCW lands at (0,2)")
        }

        s.test("rotate four times returns the original") {
            val g = Glyph(4, 4)
            g.set(1, 2)
            g.set(3, 0)
            var cur = g
            repeat(4) { cur = cur.rotateCW() }
            Check.glyphEq(g, cur, "4x CW round trip")
        }

        s.test("cropToBounds trims empty margins") {
            val g = Glyph(6, 6)
            g.set(2, 1)
            g.set(4, 4)
            val c = g.cropToBounds()
            Check.eq(3, c.width, "cropped width")
            Check.eq(4, c.height, "cropped height")
            Check.isTrue(c.get(0, 0), "content re-anchored")
            Check.isTrue(c.get(2, 3), "content re-anchored (2)")
        }

        s.test("symmetry detection") {
            val sym = Glyph(5, 5)
            sym.set(0, 0); sym.set(1, 0); sym.set(3, 0); sym.set(4, 0)
            sym.set(1, 1); sym.set(3, 1)
            Check.isTrue(sym.isSymmetricX(), "symmetric X")
            Check.isFalse(sym.isSymmetricY(), "not symmetric Y")
            val v = Glyph(5, 5)
            v.set(0, 0); v.set(1, 0)
            v.set(2, 2)
            v.set(0, 4); v.set(1, 4)
            Check.isTrue(v.isSymmetricY(), "symmetric Y")
            Check.isFalse(v.isSymmetricX(), "not symmetric X")
        }

        s.test("fromRows masks bits beyond the width") {
            val rows = intArrayOf(0x1F, 0xFF, 0x00)
            val g = Glyph.fromRows(5, 3, rows)
            Check.isTrue(g.get(4, 0), "bit 4 on")
            Check.isFalse(g.get(5, 1), "bit 5 masked out")
            Check.eq(10, g.countSet(), "row0 5 bits + row1 5 bits")
        }

        s.test("width and height validation") {
            Check.throws("width 0 rejected") { Glyph(0, 5) }
            Check.throws("width too large rejected") { Glyph(33, 5) }
            Check.throws("height too large rejected") { Glyph(5, 129) }
            Check.throws("height 0 rejected") { Glyph(5, 0) }
        }

        s.test("32-wide grid stores bit 31") {
            val g = Glyph(32, 2)
            g.set(31, 1)
            Check.isTrue(g.get(31, 1), "bit 31 readable")
            Check.eq(1, g.countSet(), "one pixel")
            g.fillAll()
            Check.isTrue(g.isFull(), "full 32x2")
            Check.eq(64, g.countSet(), "64 pixels")
        }

        s.test("rowBits and setRow") {
            val g = Glyph(8, 3)
            g.setRow(1, 0b01001001)
            Check.isTrue(g.get(0, 1), "bit0 row1")
            Check.isTrue(g.get(3, 1), "bit3 row1")
            Check.isTrue(g.get(6, 1), "bit6 row1")
            Check.eq(0b01001001, g.rowBits(1), "rowBits round trip")
            g.setRow(1, 0xFFFF)
            Check.eq(0xFF, g.rowBits(1), "row bits masked to width")
        }

        s.test("width 1 glyph") {
            val g = Glyph(1, 4)
            g.set(0, 1)
            Check.isTrue(g.get(0, 1), "single column pixel")
            Check.isTrue(g.isSymmetricX(), "single column is symmetric")
        }

        return s
    }
}