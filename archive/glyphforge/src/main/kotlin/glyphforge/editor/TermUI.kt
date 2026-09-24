package glyphforge.editor

import glyphforge.cli.VERSION
import java.io.PrintStream

/**
 * The interactive ANSI terminal editor. It runs only when stdin and stdout
 * are a real TTY (`System.console() != null`), puts the terminal into raw
 * mode via `stty` so keystrokes arrive without pressing Enter, and redraws a
 * live pixel grid after every key. Pixel editing is cursor-driven (arrows,
 * space, Enter, Backspace); typing any printable character jumps to that
 * glyph, so there are no prompts anywhere in the flow.
 *
 * When stdin is not a TTY the CLI falls back to the headless scripted mode,
 * so the exact same editor is fully exercisable without a display.
 */
object TermUI {

    private const val ESC = "\u001B"
    private const val RESET = "$ESC[0m"
    private const val HIDE = "$ESC[?25l"
    private const val SHOW = "$ESC[?25h"
    private const val CLEAR = "$ESC[2J$ESC[H"

    private const val BORDER = "$ESC[36m"
    private const val HEADER = "$ESC[33m"
    private const val MUTED = "$ESC[90m"
    private const val PIX_ON = "$ESC[38;5;46m██$RESET"
    private const val PIX_OFF = "$ESC[38;5;240m  $RESET"
    private const val CUR_ON = "$ESC[48;5;46m  $RESET"
    private const val CUR_OFF = "$ESC[48;5;220m  $RESET"

    private sealed class Key {
        object Up : Key()
        object Down : Key()
        object Left : Key()
        object Right : Key()
        object Next : Key()
        object Prev : Key()
        object Toggle : Key()
        object Set : Key()
        object Erase : Key()
        object Undo : Key()
        object Redo : Key()
        object Save : Key()
        object Help : Key()
        object QuitSave : Key()
        object QuitNoSave : Key()
        data class Glyph(val c: Char) : Key()
        object Unknown : Key()
    }

    /**
     * Runs the interactive session. [onQuit] is invoked when the user quits
     * (so the caller can persist the font); [onSave] on a manual Ctrl+S.
     */
    fun run(editor: Editor, out: PrintStream = System.out, onQuit: () -> Unit, onSave: () -> Unit) {
        if (System.console() == null) {
            out.println("not a TTY: run headless with --script <file> or piped stdin instead")
            return
        }
        val raw = enterRaw()
        try {
            var help = false
            var first = true
            while (true) {
                if (first) {
                    out.print(CLEAR)
                    first = false
                }
                out.print(HIDE)
                redraw(editor, help, out)
                out.flush()
                val key = readKey() ?: break
                when (key) {
                    is Key.Glyph -> { help = false; editor.apply(Command.Glyph(key.c)) }
                    Key.Up -> editor.apply(Command.Step(0, -1, 1))
                    Key.Down -> editor.apply(Command.Step(0, 1, 1))
                    Key.Left -> editor.apply(Command.Step(-1, 0, 1))
                    Key.Right -> editor.apply(Command.Step(1, 0, 1))
                    Key.Next -> editor.apply(Command.Next)
                    Key.Prev -> editor.apply(Command.Prev)
                    Key.Toggle -> editor.apply(Command.Toggle)
                    Key.Set -> editor.apply(Command.Set)
                    Key.Erase -> editor.apply(Command.Erase)
                    Key.Undo -> editor.apply(Command.Undo)
                    Key.Redo -> editor.apply(Command.Redo)
                    Key.Save -> onSave()
                    Key.Help -> help = !help
                    Key.QuitSave -> { onQuit(); break }
                    Key.QuitNoSave -> break
                    Key.Unknown -> {}
                }
            }
        } finally {
            out.print(SHOW)
            out.flush()
            exitRaw()
        }
    }

    private fun redraw(editor: Editor, help: Boolean, out: PrintStream) {
        val g = editor.glyph()
        val w = editor.font.cellWidth
        val h = editor.font.cellHeight
        val chars = editor.font.chars()
        val idx = chars.indexOf(editor.currentChar)
        val pos = if (idx < 0) "-" else "${idx + 1}/${chars.size}"
        val sb = StringBuilder()
        sb.append(CLEAR)
        sb.append("$HEADER  Glyphforge $VERSION$RESET  font $MUTED${editor.font.name}$RESET grid ${w}x${h}\n\n")
        sb.append("  glyph ${Editor.displayChar(editor.currentChar)} ($pos)  cursor ($MUTED${editor.cursorX},${editor.cursorY}$RESET)  paint ${if (editor.paintOn) "set" else "erase"}  ${if (editor.dirty) "$MUTED(modified)$RESET" else ""}\n\n")

        // Top border.
        sb.append("  $BORDER┌$RESET")
        for (x in 0 until w) sb.append("${borderCell(w, x)}$BORDER┬$RESET")
        sb.append("$BORDER┐$RESET\n")

        for (y in 0 until h) {
            sb.append("  $BORDER│$RESET")
            for (x in 0 until w) {
                sb.append(cell(g.get(x, y), editor.cursorX == x && editor.cursorY == y))
                sb.append("$BORDER│$RESET")
            }
            sb.append('\n')
            if (y < h - 1) {
                sb.append("  $BORDER├$RESET")
                for (x in 0 until w) sb.append("$BORDER────$RESET$BORDER┼$RESET")
                sb.append("$BORDER┤$RESET\n")
            }
        }
        sb.append("  $BORDER└$RESET")
        for (x in 0 until w) sb.append("$BORDER────$RESET$BORDER┴$RESET")
        sb.append("$BORDER┘$RESET\n\n")

        if (help) {
            sb.append("$MUTED${Editor.helpText()}$RESET\n")
        } else {
            sb.append("$MUTED  arrows move · space toggle · Enter set · Backspace erase\n")
            sb.append("  type a char to edit that glyph · Tab next · Shift+Tab prev · ? help\n")
            sb.append("  Ctrl+Z undo · Ctrl+Y redo · Ctrl+S save · q quit+save · Q quit$RESET\n")
        }
        out.print(sb.toString())
    }

    private fun borderCell(w: Int, x: Int): String = "$BORDER────$RESET"

    private fun cell(on: Boolean, cursor: Boolean): String = when {
        cursor && on -> CUR_ON
        cursor -> CUR_OFF
        on -> PIX_ON
        else -> PIX_OFF
    }

    private fun readKey(): Key? {
        val b = System.`in`.read()
        if (b < 0) return null
        return when (b) {
            27 -> {
                val b2 = System.`in`.read()
                if (b2 != '['.code) Key.Unknown
                else when (System.`in`.read()) {
                    'A'.code -> Key.Up
                    'B'.code -> Key.Down
                    'C'.code -> Key.Right
                    'D'.code -> Key.Left
                    'Z'.code -> Key.Prev
                    else -> Key.Unknown
                }
            }
            ' '.code -> Key.Toggle
            '\r'.code, '\n'.code -> Key.Set
            0x7F, 0x08 -> Key.Erase
            '\t'.code -> Key.Next
            0x1A -> Key.Undo      // Ctrl+Z
            0x19 -> Key.Redo      // Ctrl+Y
            0x13 -> Key.Save      // Ctrl+S
            0x03 -> Key.QuitNoSave // Ctrl+C
            'q'.code -> Key.QuitSave
            'Q'.code -> Key.QuitNoSave
            '?'.code -> Key.Help
            in 0x20..0x7E -> Key.Glyph(b.toChar())
            else -> Key.Unknown
        }
    }

    private fun enterRaw(): Boolean = runStty("raw -echo")

    private fun exitRaw() {
        runStty("sane")
    }

    private fun runStty(args: String): Boolean = try {
        ProcessBuilder("sh", "-c", "stty $args < /dev/tty").inheritIO().start().waitFor() == 0
    } catch (e: Exception) {
        false
    }
}