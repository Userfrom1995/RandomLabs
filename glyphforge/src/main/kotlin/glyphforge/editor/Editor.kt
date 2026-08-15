package glyphforge.editor

import glyphforge.core.Font
import glyphforge.core.Glyph
import glyphforge.core.Raster

/**
 * Commands understood by the headless editor. Every editing action is a value
 * that can be produced from a script line, a TUI key, or a programmatic call,
 * so the editor state machine is fully testable with no display or keyboard.
 */
sealed class Command {
    object Quit : Command()
    object Next : Command()
    object Prev : Command()
    data class Glyph(val c: Char) : Command()
    data class Move(val x: Int, val y: Int) : Command()
    data class Step(val dx: Int, val dy: Int, val n: Int) : Command()
    object Set : Command()
    object Erase : Command()
    object Toggle : Command()
    data class PaintMode(val on: Boolean) : Command()
    object Clear : Command()
    object Invert : Command()
    object MirrorX : Command()
    object MirrorY : Command()
    object RotateCw : Command()
    object RotateCcw : Command()
    data class Shift(val dx: Int, val dy: Int) : Command()
    data class FillRow(val y: Int) : Command()
    data class FillCol(val x: Int) : Command()
    object Autofit : Command()
    object Copy : Command()
    object Cut : Command()
    object Paste : Command()
    object Undo : Command()
    object Redo : Command()
    object Save : Command()
    object Load : Command()
    object Status : Command()
    object Print : Command()
    object Help : Command()
}

/** The outcome of one [Command]; [quit] signals the session should end. */
data class EditorResult(val ok: Boolean, val message: String, val quit: Boolean = false)

/**
 * The headless editor state machine. It owns one working [Glyph] (the glyph
 * currently being edited), a cursor, a paint mode, a clipboard, and bounded
 * undo/redo stacks. All mutations go through [apply]; queries never mutate.
 * The script runner and the ANSI TUI are thin front-ends over the same state.
 */
class Editor(val font: Font, initialChar: Char) {

    var currentChar: Char = initialChar
        private set
    var cursorX: Int = 0
    var cursorY: Int = 0
    var paintOn: Boolean = true

    var clipboard: Glyph? = null
        private set

    /** True when the working glyph differs from the glyph stored in the font. */
    var dirty: Boolean = false
        private set

    private var working: Glyph = loadFromFont(initialChar)
    private val undoStack = ArrayDeque<Glyph>()
    private val redoStack = ArrayDeque<Glyph>()

    companion object {
        const val MAX_UNDO = 64

        fun displayChar(c: Char): String =
            if (c == ' ') "SPACE" else if (c.isISOControl()) "U+${c.code.toString(16).uppercase().padStart(4, '0')}" else "'$c'"

        fun helpText(): String = """
            Commands:
              glyph <c>      jump to glyph c        next / prev      next or previous glyph
              move <x> <y>   absolute cursor        left|right|up|down [n]   move cursor
              set / erase    paint at cursor        toggle           flip pixel at cursor
              mode set|erase switch paint mode       clear            clear the glyph
              invert         flip all pixels        mirrorx / mirrory
              rotate / rotateccw  (square grids)    shift <dx> <dy>
              fillrow <y> / fillcol <x>             autofit          center content in grid
              copy / cut / paste                    undo / redo
              save           write glyph to font    load             reload from font
              status / print                        help / quit
        """.trimIndent()
    }

    private fun loadFromFont(c: Char): Glyph = font.glyph(c)?.copy() ?: Glyph.empty(font.cellWidth, font.cellHeight)

    /** The working glyph; the value it returns must not be mutated directly. */
    fun glyph(): Glyph = working

    fun apply(cmd: Command): EditorResult = when (cmd) {
        is Command.Quit -> EditorResult(true, "bye", quit = true)
        is Command.Next -> switchGlyph(nextOf(currentChar))
        is Command.Prev -> switchGlyph(prevOf(currentChar))
        is Command.Glyph -> switchGlyph(cmd.c)
        is Command.Move -> moveCursor(cmd.x, cmd.y)
        is Command.Step -> stepCursor(cmd.dx, cmd.dy, cmd.n)
        is Command.Set -> paint(true)
        is Command.Erase -> paint(false)
        is Command.Toggle -> toggle()
        is Command.PaintMode -> { paintOn = cmd.on; EditorResult(true, "paint mode: ${if (cmd.on) "set" else "erase"}") }
        is Command.Clear -> mutate("cleared ${displayChar(currentChar)}") { it.clearAll() }
        is Command.Invert -> mutate("inverted ${displayChar(currentChar)}") { g ->
            for (y in 0 until g.height) for (x in 0 until g.width) g.set(x, y, !g.get(x, y))
        }
        is Command.MirrorX -> mutate("mirrored horizontally") { it.mirrorX() }
        is Command.MirrorY -> mutate("mirrored vertically") { it.mirrorY() }
        is Command.RotateCw -> rotate(true)
        is Command.RotateCcw -> rotate(false)
        is Command.Shift -> mutate("shifted by (${cmd.dx},${cmd.dy})") { it.translate(cmd.dx, cmd.dy) }
        is Command.FillRow -> mutate("filled row ${cmd.y}") { g ->
            for (x in 0 until g.width) g.set(x, cmd.y, true)
        }
        is Command.FillCol -> mutate("filled column ${cmd.x}") { g ->
            for (y in 0 until g.height) g.set(cmd.x, y, true)
        }
        is Command.Autofit -> autofit()
        is Command.Copy -> { clipboard = working.copy(); EditorResult(true, "copied ${working.countSet()} px") }
        is Command.Cut -> {
            clipboard = working.copy()
            mutate("cut ${working.countSet()} px") { it.clearAll() }
        }
        is Command.Paste -> paste()
        is Command.Undo -> undo()
        is Command.Redo -> redo()
        is Command.Save -> save()
        is Command.Load -> load()
        is Command.Status -> status()
        is Command.Print -> printGlyph()
        is Command.Help -> EditorResult(true, helpText())
    }

    private fun switchGlyph(c: Char): EditorResult {
        commit()
        currentChar = c
        working = loadFromFont(c)
        cursorX = 0
        cursorY = 0
        undoStack.clear()
        redoStack.clear()
        dirty = false
        return EditorResult(true, "glyph ${displayChar(c)} (${working.countSet()} px)")
    }

    private fun moveCursor(x: Int, y: Int): EditorResult {
        cursorX = x.coerceIn(0, font.cellWidth - 1)
        cursorY = y.coerceIn(0, font.cellHeight - 1)
        return EditorResult(true, "cursor at ($cursorX,$cursorY)")
    }

    private fun stepCursor(dx: Int, dy: Int, n: Int): EditorResult {
        val steps = if (n < 1) 1 else n
        return moveCursor(cursorX + dx * steps, cursorY + dy * steps)
    }

    private fun paint(on: Boolean): EditorResult {
        val before = working.get(cursorX, cursorY)
        if (before == on) return EditorResult(true, "pixel already ${if (on) "on" else "off"}")
        pushUndo()
        working.set(cursorX, cursorY, on)
        dirty = true
        return EditorResult(true, "${if (on) "set" else "erased"} ($cursorX,$cursorY)")
    }

    private fun toggle(): EditorResult {
        pushUndo()
        val on = working.toggle(cursorX, cursorY)
        dirty = true
        return EditorResult(true, "toggled ($cursorX,$cursorY) ${if (on) "on" else "off"}")
    }

    private fun rotate(cw: Boolean): EditorResult {
        if (font.cellWidth != font.cellHeight) {
            return EditorResult(false, "rotate needs a square grid (${font.cellWidth}x${font.cellHeight})")
        }
        pushUndo()
        working = if (cw) working.rotateCW() else working.rotateCCW()
        dirty = true
        return EditorResult(true, "rotated ${if (cw) "CW" else "CCW"}")
    }

    private fun autofit(): EditorResult {
        val box = working.boundingBox() ?: return EditorResult(true, "glyph is empty")
        val dx = (font.cellWidth - box.width) / 2 - box.x
        val dy = (font.cellHeight - box.height) / 2 - box.y
        if (dx == 0 && dy == 0) return EditorResult(true, "already centered")
        pushUndo()
        working.translate(dx, dy)
        dirty = true
        return EditorResult(true, "centered content (shifted $dx,$dy)")
    }

    private fun paste(): EditorResult {
        val clip = clipboard ?: return EditorResult(false, "clipboard is empty")
        pushUndo()
        for (y in 0 until font.cellHeight) {
            for (x in 0 until font.cellWidth) {
                working.set(x, y, clip.get(x, y))
            }
        }
        dirty = true
        return EditorResult(true, "pasted ${clip.countSet()} px")
    }

    private fun mutate(label: String, f: (Glyph) -> Unit): EditorResult {
        pushUndo()
        f(working)
        dirty = true
        return EditorResult(true, label)
    }

    private fun undo(): EditorResult {
        val snapshot = undoStack.removeLastOrNull() ?: return EditorResult(true, "nothing to undo")
        redoStack.addLast(working)
        working = snapshot
        dirty = true
        return EditorResult(true, "undone (${undoStack.size} left)")
    }

    private fun redo(): EditorResult {
        val snapshot = redoStack.removeLastOrNull() ?: return EditorResult(true, "nothing to redo")
        undoStack.addLast(working)
        working = snapshot
        dirty = true
        return EditorResult(true, "redone (${redoStack.size} left)")
    }

    private fun pushUndo() {
        if (undoStack.size >= MAX_UNDO) undoStack.removeFirst()
        undoStack.addLast(working.copy())
        redoStack.clear()
    }

    /** Commits the working glyph into the font (advance width is preserved). */
    fun commit(): EditorResult {
        if (!dirty) return EditorResult(true, "no changes to commit")
        font.put(currentChar, working.copy(), font.advance(currentChar))
        dirty = false
        return EditorResult(true, "saved ${displayChar(currentChar)}")
    }

    private fun save(): EditorResult {
        val r = commit()
        return if (r.ok) EditorResult(true, "saved ${displayChar(currentChar)} (${font.glyphCount()} glyphs in font)") else r
    }

    private fun load(): EditorResult {
        working = loadFromFont(currentChar)
        undoStack.clear()
        redoStack.clear()
        dirty = false
        return EditorResult(true, "reloaded ${displayChar(currentChar)} from font")
    }

    private fun status(): EditorResult {
        val chars = font.chars()
        val idx = chars.indexOf(currentChar)
        val pos = if (idx < 0) "-" else "${idx + 1}/${chars.size}"
        return EditorResult(
            true,
            "glyph ${displayChar(currentChar)} ($pos) grid ${font.cellWidth}x${font.cellHeight} " +
                "cursor ($cursorX,$cursorY) paint ${if (paintOn) "set" else "erase"} " +
                "set=${working.countSet()} runs=${Raster.encodeRows(working).sumOf { it.size }} " +
                "undo=${undoStack.size} redo=${redoStack.size} clipboard=${clipboard?.let { "yes" } ?: "no"} " +
                "dirty=$dirty"
        )
    }

    private fun printGlyph(): EditorResult {
        val sb = StringBuilder()
        for (line in Raster.toArt(working, '#')) sb.append(line).append('\n')
        return EditorResult(true, sb.toString())
    }

    private fun nextOf(c: Char): Char {
        val chars = font.chars()
        if (chars.isEmpty()) return c
        val i = chars.indexOf(c)
        return if (i < 0) chars.first() else chars[(i + 1) % chars.size]
    }

    private fun prevOf(c: Char): Char {
        val chars = font.chars()
        if (chars.isEmpty()) return c
        val i = chars.indexOf(c)
        return if (i < 0) chars.last() else chars[(i - 1 + chars.size) % chars.size]
    }
}