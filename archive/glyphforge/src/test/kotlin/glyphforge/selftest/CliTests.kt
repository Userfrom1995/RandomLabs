package glyphforge.selftest

import glyphforge.cli.run
import glyphforge.core.FontIO
import java.io.ByteArrayOutputStream
import java.io.PrintStream
import java.nio.file.Files
import java.nio.file.Path

object CliTests {
    fun suite(): Suite {
        val s = Suite("CLI")

        fun cap(): Triple<ByteArrayOutputStream, ByteArrayOutputStream, PrintStream> {
            val so = ByteArrayOutputStream()
            val se = ByteArrayOutputStream()
            return Triple(so, se, PrintStream(so, true))
        }

        fun tmpDir(): Path = Files.createTempDirectory("glyphforge-cli")

        fun artText(): String = """
            // Micro art
            name=Micro
            cellWidth=5
            cellHeight=7
            baseline=6
            defaultAdvance=5

            U+0041 A
            ..#..
            .#.#.
            #...#
            #####
            #...#
            #...#
            #...#

            U+0020 SPACE
            .....
            .....
            .....
            .....
            .....
            .....
            .....

            U+002E:adv=2 PERIOD
            .....
            .....
            .....
            .....
            .....
            .....
            .....
        """.trimIndent()

        fun runCli(args: List<String>, so: ByteArrayOutputStream, se: ByteArrayOutputStream): Int {
            val out = PrintStream(so, true)
            val err = PrintStream(se, true)
            val code = run(args, out, err)
            out.flush()
            err.flush()
            return code
        }

        s.test("--version prints the version") {
            val (so, se, out) = cap()
            runCli(listOf("--version"), so, se)
            Check.isTrue(so.toString().contains("glyphforge 1.0.0"), "version output")
            Check.eq(0, runCli(listOf("--version"), so, se), "exit 0")
        }

        s.test("unknown command exits 1 with a message") {
            val (so, se, _) = cap()
            Check.eq(1, runCli(listOf("frobnicate"), so, se), "exit 1")
            Check.isTrue(se.toString().contains("unknown command"), "error message")
        }

        s.test("missing required option exits 1") {
            val (so, se, _) = cap()
            Check.eq(1, runCli(listOf("render"), so, se), "exit 1")
            Check.isTrue(se.toString().contains("missing required option --font"), "error message")
        }

        s.test("new creates a valid empty font file") {
            val dir = tmpDir()
            val path = dir.resolve("t.gff").toString()
            val (so, se, _) = cap()
            Check.eq(0, runCli(listOf("new", "--name", "T", "--cell-width", "5", "--cell-height", "7", "--out", path), so, se), "exit 0")
            val font = FontIO.load(Path.of(path))
            Check.eq("T", font.name, "font name")
            Check.eq(5, font.cellWidth, "cell width")
            Check.eq(0, font.glyphCount(), "empty font")
            Files.deleteIfExists(Path.of(path))
            Files.deleteIfExists(dir)
        }

        s.test("new rejects bad dimensions") {
            val (so, se, _) = cap()
            Check.eq(1, runCli(listOf("new", "--name", "T", "--cell-width", "0", "--cell-height", "7", "--out", "/tmp/x.gff"), so, se), "exit 1")
            Check.isTrue(se.toString().contains("cellWidth must be"), "dimension error")
        }

        s.test("import-art autotraces art into a font") {
            val dir = tmpDir()
            val art = dir.resolve("m.art")
            Files.writeString(art, artText())
            val outPath = dir.resolve("m.gff").toString()
            val (so, se, _) = cap()
            Check.eq(0, runCli(listOf("import-art", "--art", art.toString(), "--out", outPath), so, se), "exit 0")
            val font = FontIO.load(Path.of(outPath))
            Check.eq("Micro", font.name, "name from header")
            Check.eq(3, font.glyphCount(), "three glyphs")
            Check.isTrue(font.has('A'), "has A")
            Check.isTrue(font.glyph('A')!!.get(2, 0), "A apex")
            Check.eq(2, font.advance('.'), "period advance overridden")
            Check.eq(5, font.advance('A'), "A default advance")
            Files.deleteIfExists(art)
            Files.deleteIfExists(Path.of(outPath))
            Files.deleteIfExists(dir)
        }

        s.test("import-art overrides the header with CLI flags") {
            val dir = tmpDir()
            val art = dir.resolve("m.art")
            Files.writeString(art, artText())
            val outPath = dir.resolve("m.gff").toString()
            val (so, se, _) = cap()
            Check.eq(0, runCli(listOf("import-art", "--art", art.toString(), "--out", outPath, "--name", "Renamed"), so, se), "exit 0")
            val font = FontIO.load(Path.of(outPath))
            Check.eq("Renamed", font.name, "CLI flag wins")
            Files.deleteIfExists(art)
            Files.deleteIfExists(Path.of(outPath))
            Files.deleteIfExists(dir)
        }

        s.test("render draws known-answer art") {
            val dir = tmpDir()
            val art = dir.resolve("m.art")
            Files.writeString(art, artText())
            val fontPath = dir.resolve("m.gff").toString()
            runCli(listOf("import-art", "--art", art.toString(), "--out", fontPath), ByteArrayOutputStream(), ByteArrayOutputStream())
            val (so, se, _) = cap()
            Check.eq(0, runCli(listOf("render", "--font", fontPath, "--text", "A", "--mode", "ascii", "--scale", "1", "--off", "."), so, se), "exit 0")
            val lines = so.toString().trim().split('\n')
            Check.eq("..#..", lines[0], "A row 0")
            Check.eq("#####", lines[3], "A row 3")
            Check.eq(7, lines.size, "seven rows")
            Files.deleteIfExists(Path.of(fontPath))
            Files.deleteIfExists(art)
            Files.deleteIfExists(dir)
        }

        s.test("render validates scale and mode") {
            val dir = tmpDir()
            val art = dir.resolve("m.art")
            Files.writeString(art, artText())
            val fontPath = dir.resolve("m.gff").toString()
            runCli(listOf("import-art", "--art", art.toString(), "--out", fontPath), ByteArrayOutputStream(), ByteArrayOutputStream())
            val (so, se, _) = cap()
            Check.eq(1, runCli(listOf("render", "--font", fontPath, "--text", "A", "--scale", "0"), so, se), "bad scale")
            Check.eq(1, runCli(listOf("render", "--font", fontPath, "--text", "A", "--mode", "svg"), so, se), "bad mode")
            Files.deleteIfExists(Path.of(fontPath))
            Files.deleteIfExists(art)
            Files.deleteIfExists(dir)
        }

        s.test("export writes Kotlin to stdout and files") {
            val dir = tmpDir()
            val art = dir.resolve("m.art")
            Files.writeString(art, artText())
            val fontPath = dir.resolve("m.gff").toString()
            runCli(listOf("import-art", "--art", art.toString(), "--out", fontPath), ByteArrayOutputStream(), ByteArrayOutputStream())
            val (so, se, _) = cap()
            Check.eq(0, runCli(listOf("export", "--font", fontPath, "--format", "kotlin"), so, se), "exit 0")
            Check.isTrue(so.toString().contains("object Micro"), "kotlin object in stdout")
            val filePath = dir.resolve("out.kt").toString()
            Check.eq(0, runCli(listOf("export", "--font", fontPath, "--format", "kotlin", "--out", filePath), ByteArrayOutputStream(), ByteArrayOutputStream()), "exit 0")
            Check.isTrue(Files.readString(Path.of(filePath)).contains("object Micro"), "file written")
            Files.deleteIfExists(Path.of(filePath))
            Files.deleteIfExists(Path.of(fontPath))
            Files.deleteIfExists(art)
            Files.deleteIfExists(dir)
        }

        s.test("export rejects --rle for text") {
            val dir = tmpDir()
            val art = dir.resolve("m.art")
            Files.writeString(art, artText())
            val fontPath = dir.resolve("m.gff").toString()
            runCli(listOf("import-art", "--art", art.toString(), "--out", fontPath), ByteArrayOutputStream(), ByteArrayOutputStream())
            val (so, se, _) = cap()
            Check.eq(1, runCli(listOf("export", "--font", fontPath, "--format", "text", "--rle"), so, se), "exit 1")
            Check.isTrue(se.toString().contains("--rle is not available"), "error message")
            Files.deleteIfExists(Path.of(fontPath))
            Files.deleteIfExists(art)
            Files.deleteIfExists(dir)
        }

        s.test("validate accepts a good font and rejects a corrupt one") {
            val dir = tmpDir()
            val art = dir.resolve("m.art")
            Files.writeString(art, artText())
            val fontPath = dir.resolve("m.gff").toString()
            runCli(listOf("import-art", "--art", art.toString(), "--out", fontPath), ByteArrayOutputStream(), ByteArrayOutputStream())
            val (so, se, _) = cap()
            Check.eq(0, runCli(listOf("validate", "--font", fontPath), so, se), "valid font")
            Check.isTrue(so.toString().contains("valid:"), "valid message")
            val bad = dir.resolve("bad.gff").toString()
            Files.writeString(Path.of(bad), "GF1\nname=X\ncellWidth=5\ncellHeight=7\nbaseline=6\ndefaultAdvance=5\nglyph:U+0041:adv=5:runs=0:9-10")
            Check.eq(1, runCli(listOf("validate", "--font", bad), so, se), "corrupt font")
            Check.isTrue(se.toString().contains("invalid font"), "error message")
            Files.deleteIfExists(Path.of(bad))
            Files.deleteIfExists(Path.of(fontPath))
            Files.deleteIfExists(art)
            Files.deleteIfExists(dir)
        }

        s.test("dump prints one glyph") {
            val dir = tmpDir()
            val art = dir.resolve("m.art")
            Files.writeString(art, artText())
            val fontPath = dir.resolve("m.gff").toString()
            runCli(listOf("import-art", "--art", art.toString(), "--out", fontPath), ByteArrayOutputStream(), ByteArrayOutputStream())
            val (so, se, _) = cap()
            Check.eq(0, runCli(listOf("dump", "--font", fontPath, "--glyph", "A"), so, se), "exit 0")
            Check.isTrue(so.toString().contains("..#.."), "glyph art")
            Check.isTrue(so.toString().contains("advance 5"), "advance line")
            Files.deleteIfExists(Path.of(fontPath))
            Files.deleteIfExists(art)
            Files.deleteIfExists(dir)
        }

        s.test("info summarizes the font") {
            val dir = tmpDir()
            val art = dir.resolve("m.art")
            Files.writeString(art, artText())
            val fontPath = dir.resolve("m.gff").toString()
            runCli(listOf("import-art", "--art", art.toString(), "--out", fontPath), ByteArrayOutputStream(), ByteArrayOutputStream())
            val (so, se, _) = cap()
            Check.eq(0, runCli(listOf("info", "--font", fontPath), so, se), "exit 0")
            Check.isTrue(so.toString().contains("Micro"), "font name")
            Check.isTrue(so.toString().contains("3 glyphs"), "glyph count")
            val (so2, se2, _) = cap()
            Check.eq(0, runCli(listOf("info", "--font", fontPath, "--glyph", "A"), so2, se2), "exit 0")
            Check.isTrue(so2.toString().contains("bbox"), "glyph metrics")
            Files.deleteIfExists(Path.of(fontPath))
            Files.deleteIfExists(art)
            Files.deleteIfExists(dir)
        }

        s.test("list enumerates glyphs") {
            val dir = tmpDir()
            val art = dir.resolve("m.art")
            Files.writeString(art, artText())
            val fontPath = dir.resolve("m.gff").toString()
            runCli(listOf("import-art", "--art", art.toString(), "--out", fontPath), ByteArrayOutputStream(), ByteArrayOutputStream())
            val (so, se, _) = cap()
            Check.eq(0, runCli(listOf("list", "--font", fontPath), so, se), "exit 0")
            Check.isTrue(so.toString().contains("U+0041"), "A listed")
            Check.isTrue(so.toString().contains("U+002E"), "period listed")
            Files.deleteIfExists(Path.of(fontPath))
            Files.deleteIfExists(art)
            Files.deleteIfExists(dir)
        }

        s.test("edit runs a script and saves the font") {
            val dir = tmpDir()
            val art = dir.resolve("m.art")
            Files.writeString(art, artText())
            val fontPath = dir.resolve("m.gff").toString()
            runCli(listOf("import-art", "--art", art.toString(), "--out", fontPath), ByteArrayOutputStream(), ByteArrayOutputStream())
            val script = dir.resolve("draw.gfs")
            Files.writeString(script, "glyph A\nmove 0 6\nset\nsave\nquit\n")
            val outPath = dir.resolve("out.gff").toString()
            val (so, se, _) = cap()
            Check.eq(0, runCli(listOf("edit", "--font", fontPath, "--script", script.toString(), "--out", outPath), so, se), "exit 0")
            val font = FontIO.load(Path.of(outPath))
            Check.isTrue(font.glyph('A')!!.get(0, 6), "pixel drawn at (0,6)")
            Files.deleteIfExists(script)
            Files.deleteIfExists(Path.of(outPath))
            Files.deleteIfExists(Path.of(fontPath))
            Files.deleteIfExists(art)
            Files.deleteIfExists(dir)
        }

        s.test("edit with a failing script exits 1 but still saves") {
            val dir = tmpDir()
            val art = dir.resolve("m.art")
            Files.writeString(art, artText())
            val fontPath = dir.resolve("m.gff").toString()
            runCli(listOf("import-art", "--art", art.toString(), "--out", fontPath), ByteArrayOutputStream(), ByteArrayOutputStream())
            val script = dir.resolve("bad.gfs")
            Files.writeString(script, "bogus\nset\nquit\n")
            val outPath = dir.resolve("out.gff").toString()
            val (so, se, _) = cap()
            Check.eq(1, runCli(listOf("edit", "--font", fontPath, "--script", script.toString(), "--out", outPath), so, se), "exit 1 on script error")
            val font = FontIO.load(Path.of(outPath))
            Check.isTrue(font.glyph('A')!!.get(0, 0), "edits still applied and saved")
            Files.deleteIfExists(script)
            Files.deleteIfExists(Path.of(outPath))
            Files.deleteIfExists(Path.of(fontPath))
            Files.deleteIfExists(art)
            Files.deleteIfExists(dir)
        }

s.test("edit reports a missing font") {
            val (so, se, _) = cap()
            Check.eq(1, runCli(listOf("edit", "--font", "/nonexistent/x.gff", "--script", "/nonexistent/s.gfs"), so, se), "exit 1")
            Check.isTrue(se.toString().contains("cannot read font"), "font load error")
        }

        s.test("global help lists every command") {
            val (so, se, _) = cap()
            Check.eq(0, runCli(listOf("--help"), so, se), "exit 0")
            for (cmd in listOf("new", "edit", "import-art", "render", "export", "specimen", "info", "list", "validate", "dump")) {
                Check.isTrue(so.toString().contains("  $cmd"), "help lists $cmd")
            }
        }

        s.test("subcommand --help prints usage") {
            val (so, se, _) = cap()
            Check.eq(0, runCli(listOf("render", "--help"), so, se), "exit 0")
            Check.isTrue(so.toString().contains("usage: glyphforge render"), "render usage")
        }

        s.test("load a missing font file fails cleanly") {
            val (so, se, _) = cap()
            Check.eq(1, runCli(listOf("validate", "--font", "/nonexistent/missing.gff"), so, se), "exit 1")
            Check.isTrue(se.toString().contains("cannot read font"), "read error")
        }

        s.test("specimen writes a self-contained html file") {
            val dir = tmpDir()
            val fontPath = dir.resolve("font.gff").toString()
            runCli(listOf("new", "--name", "Spec", "--cell-width", "5", "--cell-height", "7", "--out", fontPath), ByteArrayOutputStream(), ByteArrayOutputStream())
            val outPath = dir.resolve("spec.html").toString()
            val (so, se, _) = cap()
            Check.eq(0, runCli(listOf("specimen", "--font", fontPath, "--out", outPath), so, se), "exit 0")
            val html = Files.readString(Path.of(outPath))
            Check.isTrue(html.contains("<title>Spec - Glyphforge specimen</title>"), "title in output")
            Check.isTrue(html.contains("const FONT = {"), "embedded data")
            Files.deleteIfExists(Path.of(fontPath))
            Files.deleteIfExists(Path.of(outPath))
            Files.deleteIfExists(dir)
        }

        s.test("specimen requires a font") {
            val (so, se, _) = cap()
            Check.eq(1, runCli(listOf("specimen"), so, se), "exit 1")
            Check.isTrue(se.toString().contains("missing required option --font"), "error message")
        }

        return s
    }
}