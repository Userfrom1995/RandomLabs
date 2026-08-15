package glyphforge.cli

import glyphforge.codegen.ExportFormat
import glyphforge.codegen.Exporter
import glyphforge.core.Font
import glyphforge.core.FontIO
import glyphforge.core.Metrics
import glyphforge.core.Raster
import glyphforge.core.RenderMode
import glyphforge.core.Renderer
import glyphforge.editor.Command
import glyphforge.editor.Editor
import glyphforge.editor.ScriptParser
import glyphforge.editor.ScriptRunner
import glyphforge.editor.TermUI
import glyphforge.selftest.Selftest
import java.io.PrintStream
import java.nio.file.Files
import java.nio.file.Path
import kotlin.system.exitProcess

const val VERSION = "1.0.0"

private val OUT = System.out
private val ERR = System.err

fun main(args: Array<String>) {
    val code = run(args.toList(), OUT, ERR)
    if (code != 0) exitProcess(code)
}

fun run(args: List<String>, out: PrintStream, err: PrintStream): Int {
    if (args.isEmpty()) {
        printGlobalHelp(out)
        return 0
    }
    val first = args[0]
    if (first.startsWith("-")) {
        return when (first) {
            "--version", "-v" -> { out.println("glyphforge $VERSION"); 0 }
            "--help", "-h" -> { printGlobalHelp(out); 0 }
            "--selftest" -> Selftest.runAll(out)
            else -> { err.println("glyphforge: unknown option '$first'"); err.println("try 'glyphforge --help'"); 1 }
        }
    }
    val rest = args.drop(1)
    return try {
        val a = Args(rest, out, err)
        when (first) {
            "new" -> cmdNew(a, out, err)
            "edit" -> cmdEdit(a, out, err)
            "import-art" -> cmdImportArt(a, out, err)
            "render" -> cmdRender(a, out, err)
            "export" -> cmdExport(a, out, err)
            "info" -> cmdInfo(a, out, err)
            "list" -> cmdList(a, out, err)
            "validate" -> cmdValidate(a, out, err)
            "dump" -> cmdDump(a, out, err)
            else -> {
                err.println("glyphforge: unknown command '$first'")
                err.println("try 'glyphforge --help'")
                1
            }
        }
    } catch (e: UsageError) {
        err.println("glyphforge: ${e.message}")
        err.println("try 'glyphforge ${rest.firstOrNull() ?: ""} --help'")
        1
    } catch (e: Exception) {
        err.println("glyphforge: ${e.message ?: e.toString()}")
        1
    }
}

// ------------------------------------------------------------------ helpers

class UsageError(message: String) : Exception(message)

private val VALUE_FLAGS = setOf(
    "name", "cell-width", "cell-height", "baseline", "default-advance", "out",
    "art", "font", "glyph", "script", "text", "mode", "scale", "on", "off",
    "format", "package",
)

class Args(tokens: List<String>, val out: PrintStream, val err: PrintStream) {
    private val flags = HashSet<String>()
    private val values = HashMap<String, String>()
    private val positionals = ArrayList<String>()

    init {
        var i = 0
        while (i < tokens.size) {
            val t = tokens[i]
            if (t == "--") {
                positionals.addAll(tokens.drop(i + 1))
                break
            }
            if (t.startsWith("--")) {
                val eq = t.indexOf('=')
                val name = if (eq >= 0) t.substring(2, eq) else t.substring(2)
                if (name in VALUE_FLAGS) {
                    val value = if (eq >= 0) t.substring(eq + 1) else tokens.getOrNull(++i)
                        ?: throw UsageError("option --$name needs a value")
                    values[name] = value
                } else {
                    if (eq >= 0) throw UsageError("option --$name does not take a value")
                    flags.add(name)
                }
            } else {
                positionals.add(t)
            }
            i++
        }
    }

    fun helpRequested(): Boolean = "help" in flags

    fun flag(name: String): Boolean = name in flags

    fun value(name: String): String? = values[name]

    fun valueRequired(name: String): String = values[name] ?: throw UsageError("missing required option --$name")

    fun intValue(name: String, default: Int): Int =
        values[name]?.toIntOrNull() ?: if (values.containsKey(name)) throw UsageError("--$name must be an integer") else default

    fun intRequired(name: String): Int = intValue(name, 0).also {
        if (!values.containsKey(name)) throw UsageError("missing required option --$name")
    }

    fun positionals(): List<String> = positionals

    fun checkNoPositionals() {
        if (positionals.isNotEmpty()) throw UsageError("unexpected argument '${positionals[0]}'")
    }
}

private fun loadFont(path: Path): Font {
    try {
        return FontIO.load(path)
    } catch (e: java.io.IOException) {
        throw UsageError("cannot read font '$path': ${e.message}")
    } catch (e: FontIO.FontFormatException) {
        throw UsageError("invalid font '$path': ${e.message}")
    }
}

private fun writeFileOrStdout(path: String?, content: String, out: PrintStream) {
    if (path == null) {
        out.print(content)
        if (!content.endsWith("\n")) out.println()
    } else {
        Files.writeString(Path.of(path), content)
    }
}

// ------------------------------------------------------------------ commands

private fun cmdNew(a: Args, out: PrintStream, err: PrintStream): Int {
    if (a.helpRequested()) {
        out.println(
            """
            usage: glyphforge new --name <name> --cell-width <w> --cell-height <h> [--baseline <n>] [--default-advance <n>] --out <file>

            Creates a new empty .gff font template. Add glyphs with `edit` or
            `import-art`. Optional metrics default to baseline=cell-height and
            default-advance=cell-width.
            """.trimIndent()
        )
        return 0
    }
    a.checkNoPositionals()
    val name = a.valueRequired("name")
    val w = a.intRequired("cell-width")
    val h = a.intRequired("cell-height")
    val outPath = a.valueRequired("out")
    val baseline = a.intValue("baseline", h)
    val defaultAdvance = a.intValue("default-advance", w)
    val font = try {
        Font.create(name, w, h, baseline, defaultAdvance)
    } catch (e: IllegalArgumentException) {
        throw UsageError(e.message ?: "invalid font metrics")
    }
    FontIO.save(font, Path.of(outPath))
    out.println("created empty font '${font.name}' (${font.cellWidth}x${font.cellHeight}) at $outPath")
    return 0
}

private fun cmdImportArt(a: Args, out: PrintStream, err: PrintStream): Int {
    if (a.helpRequested()) {
        out.println(
            """
            usage: glyphforge import-art --art <file> [--out <file>] [--name <name>] [--cell-width <w>] [--cell-height <h>] [--baseline <n>] [--default-advance <n>]

            Autotraces an ASCII-art glyph file ('.' = off, '#' = on) into a
            compact .gff font. The art file may declare metrics in a header
            (name=, cellWidth=, cellHeight=, baseline=, defaultAdvance=);
            CLI flags override them. Art blocks: a label line (U+XXXX [adv=N])
            followed by cell-height lines of cell-width '#'/'.' characters.
            See sample/art/micro5x7.art for an example.
            """.trimIndent()
        )
        return 0
    }
    a.checkNoPositionals()
    val artPath = Path.of(a.valueRequired("art"))
    if (!Files.exists(artPath)) throw UsageError("no such art file: $artPath")
    val outPath = a.value("out")
    val font = ArtImporter.import(artPath, a)
    if (outPath != null) FontIO.save(font, Path.of(outPath))
    out.println(Metrics.summarize(font))
    if (outPath != null) out.println("wrote $outPath")
    return 0
}

private fun cmdEdit(a: Args, out: PrintStream, err: PrintStream): Int {
    if (a.helpRequested()) {
        out.println(
            """
            usage: glyphforge edit --font <file> [--glyph <c>] [--out <file>] [--script <file>]

            Edits a glyph of a .gff font.
              - With a TTY: interactive ANSI editor (arrows move, space toggles,
                Enter sets, Backspace erases, type a char to edit that glyph,
                Tab next, Ctrl+Z undo, Ctrl+Y redo, Ctrl+S save, q quit+save).
              - With --script <file> or piped stdin: runs a headless command
                script (see `help` inside a session for the command list).
            The font is saved to --out, or back to --font when --out is absent.
            """.trimIndent()
        )
        return 0
    }
    a.checkNoPositionals()
    val fontPath = Path.of(a.valueRequired("font"))
    val font = loadFont(fontPath)
    val outPath = a.value("out") ?: fontPath.toString()
    val initial = a.value("glyph")?.let { parseGlyphSel(it) }
        ?: (if (font.has('A')) 'A' else font.chars().firstOrNull() ?: 'A')
    val editor = Editor(font, initial)

    val script = a.value("script")
    if (script != null) {
        val scriptPath = Path.of(script)
        if (!Files.exists(scriptPath)) throw UsageError("no such script file: $scriptPath")
        val report = ScriptRunner.run(editor, Files.readAllLines(scriptPath).asSequence(), out)
        out.println("script done: ${report.commandCount} commands, ${report.errorCount} errors")
        saveEditor(editor, Path.of(outPath), out)
        return if (report.ok) 0 else 1
    }

    if (System.console() != null) {
        val onSave = { saveEditor(editor, Path.of(outPath), out) }
        TermUI.run(editor, out, onQuit = onSave, onSave = onSave)
        return 0
    }

    // Piped stdin: read a script from stdin, then save.
    val report = ScriptRunner.run(editor, System.`in`.bufferedReader().lineSequence(), out)
    out.println("script done: ${report.commandCount} commands, ${report.errorCount} errors")
    saveEditor(editor, Path.of(outPath), out)
    return if (report.ok) 0 else 1
}

private fun saveEditor(editor: Editor, path: Path, out: PrintStream) {
    val r = editor.commit()
    if (r.ok) {
        FontIO.save(editor.font, path)
        out.println("saved ${editor.font.glyphCount()} glyphs to $path")
    } else {
        out.println("nothing to save")
    }
}

private fun cmdRender(a: Args, out: PrintStream, err: PrintStream): Int {
    if (a.helpRequested()) {
        out.println(
            """
            usage: glyphforge render --font <file> --text <string> [--mode ascii|blocks|ansi] [--scale <n>] [--on <char>] [--off <char>]

            Renders text with a font. --text may be omitted to read from stdin.
            Modes: ascii ('#'/'.'), blocks (solid), ansi (256-color blocks).
            """.trimIndent()
        )
        return 0
    }
    a.checkNoPositionals()
    val font = loadFont(Path.of(a.valueRequired("font")))
    val mode = try {
        RenderMode.parse(a.value("mode") ?: "blocks")
    } catch (e: IllegalArgumentException) {
        throw UsageError(e.message ?: "bad mode")
    }
    val scale = a.intValue("scale", 1)
    if (scale < 1) throw UsageError("--scale must be >= 1")
    val onChar = a.value("on")?.firstOrNull() ?: '#'
    val offChar = a.value("off")?.firstOrNull() ?: ' '
    val text = a.value("text") ?: System.`in`.bufferedReader().readText().trimEnd('\n')
    for (line in Renderer.render(font, text, mode, scale, onChar, offChar)) out.println(line)
    return 0
}

private fun cmdExport(a: Args, out: PrintStream, err: PrintStream): Int {
    if (a.helpRequested()) {
        out.println(
            """
            usage: glyphforge export --font <file> [--format kotlin|java|c|text] [--rle] [--package <name>] [--out <file>]

            Generates embeddable code for a font. kotlin/c accept --rle for the
            compact run-length byte-stream form. --out writes to a file; without
            it the code goes to stdout.
            """.trimIndent()
        )
        return 0
    }
    a.checkNoPositionals()
    val font = loadFont(Path.of(a.valueRequired("font")))
    val format = try {
        ExportFormat.parse(a.value("format") ?: "kotlin")
    } catch (e: IllegalArgumentException) {
        throw UsageError(e.message ?: "bad format")
    }
    val rle = a.flag("rle")
    if (rle && format == ExportFormat.TEXT) throw UsageError("--rle is not available for the text format")
    val code = Exporter.export(font, format, rle, a.value("package"))
    writeFileOrStdout(a.value("out"), code, out)
    return 0
}

private fun cmdInfo(a: Args, out: PrintStream, err: PrintStream): Int {
    if (a.helpRequested()) {
        out.println(
            """
            usage: glyphforge info --font <file> [--glyph <c>]

            Prints font metadata and, with --glyph, that glyph's metrics
            (set pixels, runs, bounding box, density, symmetry).
            """.trimIndent()
        )
        return 0
    }
    a.checkNoPositionals()
    val font = loadFont(Path.of(a.valueRequired("font")))
    out.println(Metrics.summarize(font))
    a.value("glyph")?.let {
        val c = parseGlyphSel(it)
        val g = font.glyphOrEmpty(c)
        out.println("glyph ${Editor.displayChar(c)}: ${Metrics.describe(g)}")
    }
    return 0
}

private fun cmdList(a: Args, out: PrintStream, err: PrintStream): Int {
    if (a.helpRequested()) {
        out.println(
            """
            usage: glyphforge list --font <file>

            Lists every glyph with its code point, advance, set pixels, run
            count, and bounding box.
            """.trimIndent()
        )
        return 0
    }
    a.checkNoPositionals()
    val font = loadFont(Path.of(a.valueRequired("font")))
    if (font.chars().isEmpty()) {
        out.println("(no glyphs)")
        return 0
    }
    out.println("char      code point  advance  pixels  runs  bbox")
    for (c in font.chars()) {
        val g = font.glyph(c)!!
        val box = g.boundingBox()
        val bbox = box?.let { "(${it.x},${it.y})-(${it.x2},${it.y2})" } ?: "empty"
        out.println(
            "${Editor.displayChar(c).padEnd(10)} ${FontIO.cp(c).padEnd(10)} " +
                "${font.advance(c).toString().padStart(6)} ${g.countSet().toString().padStart(6)} " +
                "${Raster.encodeRows(g).sumOf { it.size }.toString().padStart(4)}  $bbox"
        )
    }
    return 0
}

private fun cmdValidate(a: Args, out: PrintStream, err: PrintStream): Int {
    if (a.helpRequested()) {
        out.println(
            """
            usage: glyphforge validate --font <file>

            Lints a .gff font file: strict format, dimensions, code points,
            advances, and run bounds. Exits 0 when valid, 1 otherwise.
            """.trimIndent()
        )
        return 0
    }
    a.checkNoPositionals()
    val path = Path.of(a.valueRequired("font"))
    val font = loadFont(path)
    out.println("valid: ${font.name} (${font.glyphCount()} glyphs, ${font.cellWidth}x${font.cellHeight})")
    return 0
}

private fun cmdDump(a: Args, out: PrintStream, err: PrintStream): Int {
    if (a.helpRequested()) {
        out.println(
            """
            usage: glyphforge dump --font <file> --glyph <c>

            Prints one glyph as '#'/'.' ASCII art.
            """.trimIndent()
        )
        return 0
    }
    a.checkNoPositionals()
    val font = loadFont(Path.of(a.valueRequired("font")))
    val c = parseGlyphSel(a.valueRequired("glyph"))
    val g = font.glyphOrEmpty(c)
    for (line in Raster.toArt(g)) out.println(line)
    out.println("advance ${font.advance(c)}  rows ${Raster.rowHex(g).joinToString(" ")}")
    return 0
}

private fun parseGlyphSel(s: String): Char {
    val t = s.trim()
    if (t.length == 1) return t[0]
    if (t.startsWith("U+") || t.startsWith("u+")) {
        val code = t.substring(2).toIntOrNull(16)
            ?: throw UsageError("bad glyph selector '$s'")
        if (code !in 0x20..0x10FFFF || code in 0xD800..0xDFFF) throw UsageError("bad glyph selector '$s'")
        return Char(code)
    }
    if (t.startsWith("0x")) {
        val code = t.substring(2).toIntOrNull(16) ?: throw UsageError("bad glyph selector '$s'")
        return Char(code)
    }
    val code = t.toIntOrNull() ?: throw UsageError("bad glyph selector '$s' (use a char, U+XXXX, 0xNN, or a decimal code point)")
    if (code !in 0x20..0x10FFFF || code in 0xD800..0xDFFF) throw UsageError("bad glyph selector '$s'")
    return Char(code)
}

// ------------------------------------------------------------------ help

private fun printGlobalHelp(out: PrintStream) {
    out.println(
        """
        Glyphforge $VERSION - a bitmap font designer and glyph-to-code tool in Kotlin.

        Usage: glyphforge <command> [options]

        Commands:
          new          create a new empty .gff font template
          edit         edit a glyph (interactive ANSI editor, or headless --script)
          import-art   autotrace ASCII-art glyphs into a compact .gff font
          render       draw text with a font (ascii / blocks / ansi)
          export       generate embeddable code (kotlin / java / c / text)
          info         font metadata and per-glyph metrics
          list         list all glyphs with metrics
          validate     lint a .gff font file
          dump         print one glyph as ASCII art

        Global:
          --version    print version and exit
          --help       print this help
          --selftest   run the full self-test suite and exit

        Every command is non-interactive: input comes from args, flags, or
        files; a missing required value is a clear error with a non-zero exit.
        Run `glyphforge <command> --help` for command-specific help.
        """.trimIndent()
    )
}

/** Parses an ASCII-art font file (see docs/format.md -> the art section). */
object ArtImporter {

    class ArtException(message: String) : Exception(message)

    fun import(artPath: Path, a: Args): Font {
        val lines = Files.readAllLines(artPath)
        var name: String? = a.value("name")
        var width: Int? = a.value("cell-width")?.toIntOrNull()
        var height: Int? = a.value("cell-height")?.toIntOrNull()
        var baseline: Int? = a.value("baseline")?.toIntOrNull()
        var defaultAdvance: Int? = a.value("default-advance")?.toIntOrNull()

        val glyphSpecs = mutableListOf<Triple<Char, Int, List<String>>>() // (char, advance, art lines)
        var i = 0
        while (i < lines.size) {
            val line = lines[i].trim()
            // Art files use '//' for comments because '#' is a pixel character.
            if (line.isEmpty() || line.startsWith("//")) {
                i++
                continue
            }
            if (line.contains('=') && !line.startsWith("glyph") && glyphSpecs.isEmpty()) {
                val eq = line.indexOf('=')
                val key = line.substring(0, eq)
                val value = line.substring(eq + 1)
                when (key) {
                    "name" -> if (a.value("name") == null) name = value
                    "cellWidth" -> if (a.value("cell-width") == null) width = value.toIntOrNull()
                    "cellHeight" -> if (a.value("cell-height") == null) height = value.toIntOrNull()
                    "baseline" -> if (a.value("baseline") == null) baseline = value.toIntOrNull()
                    "defaultAdvance" -> if (a.value("default-advance") == null) defaultAdvance = value.toIntOrNull()
                    else -> {}
                }
                i++
                continue
            }
            // Glyph label line.
            val (ch, advance) = parseLabel(line)
            val h = height ?: throw ArtException("line ${i + 1}: glyph label before cellHeight is known; set cellHeight in the header or via --cell-height")
            val art = ArrayList<String>()
            var j = i + 1
            while (j < lines.size && art.size < h) {
                val l = lines[j].trim()
                if (l.isEmpty() || l.startsWith("//")) { j++; continue }
                art.add(l)
                j++
            }
            if (art.size < h) throw ArtException("line ${i + 1}: glyph $ch needs $h art rows, found ${art.size}")
            val w = width ?: art.maxOf { it.length }
            if (art.any { it.length != w }) {
                throw ArtException("line ${i + 1}: art rows for $ch must all be $w chars wide")
            }
            glyphSpecs.add(Triple(ch, advance, art))
            i = j
        }

        val n = name ?: "Unnamed"
        val w = width ?: throw ArtException("could not determine cell width (no art rows parsed)")
        val h = height ?: throw ArtException("could not determine cell height")
        val b = baseline ?: h
        val da = defaultAdvance ?: w
        val font = try {
            Font.create(n, w, h, b, da)
        } catch (e: IllegalArgumentException) {
            throw ArtException(e.message ?: "invalid font metrics")
        }
        for ((ch, adv, art) in glyphSpecs) {
            val glyph = try {
                Raster.fromArt(art, w, h)
            } catch (e: IllegalArgumentException) {
                throw ArtException(e.message ?: "bad art for $ch")
            }
            font.put(ch, glyph, if (adv >= 0) adv else da)
        }
        return font
    }

    /** Parses a glyph label: `U+0041 A`, `U+0041:adv=3 A`, `A`, or `A:adv=3`. */
    private fun parseLabel(line: String): Pair<Char, Int> {
        var rest = line
        var advance = -1
        val advIdx = rest.indexOf(":adv=")
        if (advIdx >= 0) {
            val tail = rest.substring(advIdx + 5)
            val num = StringBuilder()
            for (ch in tail) {
                if (ch.isDigit()) num.append(ch) else break
            }
            if (num.isEmpty()) throw ArtException("bad advance in label '$line'")
            advance = num.toString().toInt()
            rest = rest.substring(0, advIdx)
        }
        rest = rest.trim()
        if (rest.startsWith("U+") || rest.startsWith("u+")) {
            val sp = rest.indexOf(' ')
            val cps = if (sp >= 0) rest.substring(0, sp) else rest
            val code = cps.substring(2).toIntOrNull(16)
                ?: throw ArtException("bad code point in label '$line'")
            return Char(code) to advance
        }
        if (rest.isEmpty()) throw ArtException("empty glyph label")
        return rest[0] to advance
    }
}