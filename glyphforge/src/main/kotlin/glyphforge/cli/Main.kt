package glyphforge.cli

const val VERSION = "1.0.0"

fun main(args: Array<String>) {
    if (args.isEmpty()) {
        printHelp()
        return
    }
    when (args[0]) {
        "--version", "-v" -> println("glyphforge $VERSION")
        "--help", "-h", "help" -> printHelp()
        "--selftest" -> runSelftest()
        else -> printHelp()
    }
}

private fun printHelp() {
    println(
        """
        Glyphforge $VERSION - a bitmap font designer and glyph-to-code tool in Kotlin.

        Usage: glyphforge <command> [options]

        Commands:
          new, edit, import-art, render, export, info, list, validate, dump

        Global:
          --version          print version and exit
          --help             print this help
          --selftest         run the full self-test suite and exit

        Run `glyphforge <command> --help` for command-specific help.
        """.trimIndent()
    )
}

private fun runSelftest() {
    println("Glyphforge $VERSION self-test harness")
    println("(scaffold build - test suites land in the next milestone)")
}