package glyphforge.editor

import java.io.BufferedReader
import java.io.PrintStream

/**
 * Parses one script line into a [Command]. Blank lines, whitespace-only
 * lines, and lines starting with `#` produce null (skipped). A line that
 * names an unknown command or carries bad arguments throws
 * [ScriptException] with a helpful message.
 */
object ScriptParser {

    class ScriptException(message: String) : Exception(message)

    fun parse(line: String): Command? {
        val trimmed = line.trim()
        if (trimmed.isEmpty() || trimmed.startsWith("#")) return null
        val tokens = trimmed.split(Regex("\\s+"))
        val cmd = tokens[0].lowercase()
        val args = tokens.drop(1)
        return when (cmd) {
            "quit", "q", "exit" -> Command.Quit
            "next", "n" -> Command.Next
            "prev", "p" -> Command.Prev
            "glyph", "g", "char" -> Command.Glyph(parseChar(cmd, arg(args, 0)))
            "move", "goto" -> Command.Move(argInt(cmd, arg(args, 0)), argInt(cmd, arg(args, 1)))
            "left", "l" -> Command.Step(-1, 0, argInt(cmd, arg(args, 0), 1))
            "right", "r" -> Command.Step(1, 0, argInt(cmd, arg(args, 0), 1))
            "up", "u" -> Command.Step(0, -1, argInt(cmd, arg(args, 0), 1))
            "down", "d" -> Command.Step(0, 1, argInt(cmd, arg(args, 0), 1))
            "set", "place", "s" -> Command.Set
            "erase", "e", "x" -> Command.Erase
            "toggle", "t" -> Command.Toggle
            "mode", "paint" -> Command.PaintMode(parseMode(cmd, arg(args, 0)))
            "clear", "c" -> Command.Clear
            "invert", "i" -> Command.Invert
            "mirrorx", "mirror-x", "mx", "flipx" -> Command.MirrorX
            "mirrory", "mirror-y", "my", "flipy" -> Command.MirrorY
            "rotate", "rot" -> Command.RotateCw
            "rotateccw", "rotccw" -> Command.RotateCcw
            "shift", "movepixels" -> Command.Shift(argInt(cmd, arg(args, 0)), argInt(cmd, arg(args, 1)))
            "fillrow", "fr" -> Command.FillRow(argInt(cmd, arg(args, 0)))
            "fillcol", "fc" -> Command.FillCol(argInt(cmd, arg(args, 0)))
            "autofit", "center" -> Command.Autofit
            "copy", "cp" -> Command.Copy
            "cut" -> Command.Cut
            "paste", "pv" -> Command.Paste
            "undo", "z" -> Command.Undo
            "redo", "y" -> Command.Redo
            "save", "commit" -> Command.Save
            "load", "reload" -> Command.Load
            "status", "st" -> Command.Status
            "print", "dump" -> Command.Print
            "help", "?" -> Command.Help
            else -> throw ScriptException("unknown command '$cmd'")
        }
    }

    private fun arg(args: List<String>, i: Int): String? = args.getOrNull(i)

    private fun argInt(cmd: String, s: String?, default: Int = 0): Int =
        s?.toIntOrNull() ?: default

    private fun parseChar(cmd: String, s: String?): Char {
        if (s == null || s.isEmpty()) throw ScriptException("$cmd needs a character, e.g. 'glyph A'")
        // Accept a single printable character, a quoted char like 'A', or a
        // U+XXXX / 0xNN / decimal code point.
        if (s.length == 1) return s[0]
        if (s.startsWith("U+") || s.startsWith("u+")) {
            val code = s.substring(2).toIntOrNull(16)
                ?: throw ScriptException("bad code point '$s'")
            if (code !in 0x20..0x10FFFF || code in 0xD800..0xDFFF) throw ScriptException("bad code point '$s'")
            return Char(code)
        }
        if (s.startsWith("0x")) {
            val code = s.substring(2).toIntOrNull(16)
                ?: throw ScriptException("bad code point '$s'")
            return Char(code)
        }
        if (s.length == 3 && s[0] == '\'' && s[2] == '\'') return s[1]
        val code = s.toIntOrNull() ?: throw ScriptException("bad glyph selector '$s'")
        return Char(code)
    }

    private fun parseMode(cmd: String, s: String?): Boolean = when (s?.lowercase()) {
        "set", "draw", "on", "1" -> true
        "erase", "off", "0" -> false
        else -> throw ScriptException("$cmd needs 'set' or 'erase'")
    }
}

/** The outcome of a scripted session: lines executed, errors, and a exit code. */
data class ScriptReport(val commandCount: Int, val errorCount: Int, val lines: List<String>) {
    val ok: Boolean get() = errorCount == 0
}

/**
 * Runs [Command]s line by line against an [Editor], reporting every result to
 * [out]. The session stops on a `quit` command or end of input. Used by the
 * CLI's headless `edit` mode and by tests; the editor itself never reads
 * input, so sessions are fully deterministic.
 */
object ScriptRunner {

    fun run(editor: Editor, lines: Sequence<String>, out: PrintStream = System.out): ScriptReport {
        val reported = mutableListOf<String>()
        var commands = 0
        var errors = 0
        for (raw in lines) {
            val line = raw.trim()
            if (line.isEmpty() || line.startsWith("#")) continue
            val cmd = try {
                ScriptParser.parse(line)
            } catch (e: ScriptParser.ScriptException) {
                errors++
                val msg = "error: ${e.message}"
                out.println(msg)
                reported.add(msg)
                continue
            }
            if (cmd == null) continue
            commands++
            val result = editor.apply(cmd)
            if (result.quit) {
                out.println("bye")
                reported.add("bye")
                return ScriptReport(commands, errors, reported)
            }
            if (result.message.isNotEmpty()) {
                out.println(if (result.ok) "ok: ${result.message}" else "error: ${result.message}")
                if (!result.ok) errors++
                reported.add(result.message)
            }
        }
        return ScriptReport(commands, errors, reported)
    }

    /** Reads all non-comment lines from a reader (convenience for callers). */
    fun linesFrom(reader: BufferedReader): Sequence<String> = sequence {
        while (true) {
            val line = reader.readLine() ?: break
            yield(line)
        }
    }
}