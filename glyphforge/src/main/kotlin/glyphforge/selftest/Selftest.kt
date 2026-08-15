package glyphforge.selftest

import glyphforge.cli.VERSION
import glyphforge.core.Glyph
import java.io.PrintStream

/**
 * A tiny, dependency-free test harness compiled into the jar. `--selftest`
 * runs every registered suite and prints a report; the Makefile's `make test`
 * target runs it. Individual suites live in src/test and are listed in
 * [Selftest.runAll].
 */
class AssertionFailed(message: String) : Exception(message)

object Check {
    fun eq(expected: Any?, actual: Any?, label: String) {
        if (expected != actual) {
            throw AssertionFailed("$label: expected <$expected> but was <$actual>")
        }
    }

    fun isTrue(cond: Boolean, label: String) {
        if (!cond) throw AssertionFailed(label)
    }

    fun isFalse(cond: Boolean, label: String) {
        if (cond) throw AssertionFailed(label)
    }

    fun notNull(v: Any?, label: String): Any {
        if (v == null) throw AssertionFailed("$label: expected non-null value")
        return v
    }

    fun isNull(v: Any?, label: String) {
        if (v != null) throw AssertionFailed("$label: expected null but was <$v>")
    }

    fun contains(haystack: String, needle: String, label: String) {
        if (!haystack.contains(needle)) throw AssertionFailed("$label: expected <$needle> in <$haystack>")
    }

    fun throws(label: String, expected: String? = null, body: () -> Unit) {
        try {
            body()
            throw AssertionFailed("$label: expected an exception${expected?.let { " matching '$it'" } ?: ""} but none was thrown")
        } catch (e: AssertionFailed) {
            throw e
        } catch (e: Exception) {
            if (expected != null && e.message?.contains(expected) != true) {
                throw AssertionFailed("$label: exception message '${e.message}' did not mention '$expected'")
            }
        }
    }

    fun glyphEq(a: Glyph, b: Glyph, label: String) {
        if (a != b) {
            throw AssertionFailed("$label: glyphs differ\n--- actual ---\n$a\n--- expected ---\n$b")
        }
    }
}

class Suite(val name: String) {
    private val tests = mutableListOf<Pair<String, () -> Unit>>()

    fun test(name: String, body: () -> Unit) {
        tests.add(name to body)
    }

    fun run(out: PrintStream): Pair<Int, Int> {
        var pass = 0
        var fail = 0
        for ((name, body) in tests) {
            try {
                body()
                pass++
            } catch (e: AssertionFailed) {
                fail++
                out.println("  FAIL $name: ${e.message}")
            } catch (e: Exception) {
                fail++
                out.println("  ERROR $name: ${e::class.simpleName}: ${e.message}")
            }
        }
        return pass to fail
    }
}

object Selftest {
    fun runAll(out: PrintStream = System.out): Int {
        out.println("Glyphforge $VERSION self-tests")
        var totalPass = 0
        var totalFail = 0
        for (suite in suites()) {
            val (pass, fail) = suite.run(out)
            totalPass += pass
            totalFail += fail
            out.println("${suite.name}: $pass passed, $fail failed")
        }
        out.println("total: $totalPass passed, $totalFail failed")
        return if (totalFail == 0) 0 else 1
    }

    /** Suite registry: add new suites here. */
    private fun suites(): List<Suite> = listOf(
        GlyphTests.suite(),
        RasterTests.suite(),
        FontIOTests.suite(),
        ExporterTests.suite(),
        RendererTests.suite(),
        EditorTests.suite(),
        CliTests.suite(),
    )
}