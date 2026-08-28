"""Unit and CLI tests for Regexplorer.

Run from the repository root with::

    python3 -m unittest discover -s regexplorer/tests
"""

import io
import unittest

from regexplorer.regexplorer import (
    Alt,
    Anchor,
    AnyChar,
    CharClass,
    Lit,
    Opt,
    PatternError,
    Plus,
    Seq,
    SimResult,
    Star,
    Tracer,
    _MAX_TEXT_LEN,
    _pattern_str,
    backtrack_simulate,
    build_nfa,
    build_parser,
    compile_pattern,
    nfa_simulate,
    render_ast,
    render_diagram,
    run,
)


def _span_nfa(pattern, text):
    """Return the NFA engine's match span for ``pattern`` on ``text``."""
    tracer = Tracer()
    result = nfa_simulate(build_nfa(compile_pattern(pattern)), text, tracer)
    return result.span if result.ok else None, result


def _span_bt(pattern, text, max_steps=200_000):
    """Return the backtracking engine's span for ``pattern`` on ``text``."""
    tracer = Tracer()
    result = backtrack_simulate(compile_pattern(pattern), text, tracer, max_steps)
    return result.span if result.ok else None, result


def _cli(args):
    """Run the CLI in-process and return (code, stdout, stderr)."""
    parser = build_parser()
    out = io.StringIO()
    err = io.StringIO()
    code = run(parser.parse_args(args), out=out, err=err)
    return code, out.getvalue(), err.getvalue()


# ---------------------------------------------------------------------------
# Parser
# ---------------------------------------------------------------------------


class ParseTests(unittest.TestCase):
    def test_literal(self):
        node = compile_pattern("a")
        self.assertIsInstance(node, Lit)
        self.assertEqual(node.char, "a")

    def test_dot(self):
        self.assertIsInstance(compile_pattern("."), AnyChar)

    def test_anchors(self):
        node = compile_pattern("^abc$")
        self.assertIsInstance(node, Seq)
        self.assertIsInstance(node.parts[0], Anchor)
        self.assertEqual(node.parts[0].kind, "^")
        self.assertIsInstance(node.parts[-1], Anchor)
        self.assertEqual(node.parts[-1].kind, "$")

    def test_group(self):
        node = compile_pattern("(a|b)")
        self.assertIsInstance(node, Alt)
        self.assertEqual(len(node.branches), 2)

    def test_alternation_precedence(self):
        # a|bc parses as Alt(a, Seq(b, c)) - | is the lowest-precedence op.
        node = compile_pattern("a|bc")
        self.assertIsInstance(node, Alt)
        self.assertEqual(len(node.branches), 2)
        self.assertIsInstance(node.branches[1], Seq)

    def test_quantifiers(self):
        self.assertIsInstance(compile_pattern("a*"), Star)
        self.assertIsInstance(compile_pattern("a+"), Plus)
        self.assertIsInstance(compile_pattern("a?"), Opt)
        self.assertIsInstance(compile_pattern("(ab)*"), Star)
        self.assertIsInstance(compile_pattern("a+*"), Star)  # nested, allowed

    def test_character_class(self):
        node = compile_pattern("[a-z0-9_]")
        self.assertIsInstance(node, CharClass)
        self.assertEqual(node.display, "[a-z0-9_]")
        self.assertTrue(node.matcher("q"))
        self.assertTrue(node.matcher("7"))
        self.assertTrue(node.matcher("_"))
        self.assertFalse(node.matcher("Q"))

    def test_negated_class(self):
        node = compile_pattern("[^a-z]")
        self.assertTrue(node.matcher("A"))
        self.assertTrue(node.matcher("1"))
        self.assertFalse(node.matcher("q"))
        self.assertEqual(node.display, "[^a-z]")

    def test_class_leading_bracket_literal(self):
        node = compile_pattern("[]]")
        self.assertIsInstance(node, CharClass)
        self.assertTrue(node.matcher("]"))
        self.assertFalse(node.matcher("a"))

    def test_class_leading_dash(self):
        self.assertTrue(compile_pattern("[-a]").matcher("-"))
        self.assertTrue(compile_pattern("[a-]").matcher("-"))
        self.assertTrue(compile_pattern("[-]").matcher("-"))

    def test_class_escape(self):
        node = compile_pattern("[\\d]")
        self.assertTrue(node.matcher("5"))
        self.assertFalse(node.matcher("a"))
        self.assertTrue(compile_pattern("[\\]]").matcher("]"))

    def test_predefined_classes(self):
        for pattern, yes, no in [
            ("\\d", "5", "a"),
            ("\\w", "_", "-"),
            ("\\s", " ", "a"),
            ("\\D", "a", "5"),
            ("\\W", "-", "a"),
            ("\\S", "a", " "),
        ]:
            node = compile_pattern(pattern)
            self.assertTrue(node.matcher(yes), pattern)
            self.assertFalse(node.matcher(no), pattern)

    def test_single_char_escapes(self):
        self.assertEqual(compile_pattern("\\n").char, "\n")
        self.assertEqual(compile_pattern("\\t").char, "\t")
        self.assertEqual(compile_pattern("\\*").char, "*")
        self.assertEqual(compile_pattern("\\\\").char, "\\")

    def test_pattern_str_roundtrip(self):
        for pattern in ["abc", "a(b|c)*d", "[a-z]+", "^x$", "\\d\\w", "a?b|c+"]:
            self.assertEqual(_pattern_str(compile_pattern(pattern)), pattern)

    def test_bare_metachars_are_literals(self):
        self.assertEqual(compile_pattern("-").char, "-")
        node = compile_pattern("{}")  # braces are plain literals here
        self.assertIsInstance(node, Seq)
        self.assertTrue(all(isinstance(p, Lit) for p in node.parts))

    # -- error cases -------------------------------------------------------

    def test_empty_pattern_rejected(self):
        with self.assertRaises(PatternError):
            compile_pattern("")

    def test_unclosed_group(self):
        with self.assertRaises(PatternError):
            compile_pattern("(ab")

    def test_unmatched_paren(self):
        with self.assertRaises(PatternError):
            compile_pattern("ab)")

    def test_empty_alternative_rejected(self):
        with self.assertRaises(PatternError):
            compile_pattern("a|")
        with self.assertRaises(PatternError):
            compile_pattern("|a")

    def test_empty_group_rejected(self):
        with self.assertRaises(PatternError):
            compile_pattern("()")

    def test_quantifier_without_target(self):
        with self.assertRaises(PatternError):
            compile_pattern("*a")
        with self.assertRaises(PatternError):
            compile_pattern("+")

    def test_unclosed_class(self):
        with self.assertRaises(PatternError):
            compile_pattern("[a-z")

    def test_invalid_range(self):
        with self.assertRaises(PatternError):
            compile_pattern("[z-a]")

    def test_dangling_backslash(self):
        with self.assertRaises(PatternError):
            compile_pattern("abc\\")
        with self.assertRaises(PatternError):
            compile_pattern("[abc\\")

    def test_unknown_escape(self):
        with self.assertRaises(PatternError):
            compile_pattern("\\q")

    def test_overlong_pattern_rejected(self):
        with self.assertRaises(PatternError):
            compile_pattern("a" * 300)


# ---------------------------------------------------------------------------
# NFA construction
# ---------------------------------------------------------------------------


class NfaTests(unittest.TestCase):
    def test_single_literal(self):
        nfa = build_nfa(compile_pattern("a"))
        self.assertEqual(len(nfa.states), 2)
        self.assertNotEqual(nfa.start.id, nfa.accept.id)
        self.assertTrue(nfa.accept.accept)

    def test_all_states_reachable_from_start(self):
        nfa = build_nfa(compile_pattern("a(b|c)*d"))
        reached = {nfa.start.id}
        frontier = [nfa.start.id]
        while frontier:
            sid = frontier.pop()
            for _label, _ls, target in nfa.states[sid].out:
                if target.id not in reached:
                    reached.add(target.id)
                    frontier.append(target.id)
        self.assertEqual(reached, set(range(len(nfa.states))))

    def test_accept_reachable(self):
        nfa = build_nfa(compile_pattern("ab"))
        self.assertEqual(len(nfa.states), 4)
        self.assertEqual(nfa.accept.id, 3)

    def test_epsilon_closure_expands(self):
        # 'a*' has an epsilon skip edge, so the accepting state is reachable
        # from the start without consuming anything (the empty match).
        nfa = build_nfa(compile_pattern("a*"))
        closure = {nfa.start.id}
        frontier = [nfa.start.id]
        while frontier:
            sid = frontier.pop()
            for _label, _ls, target in nfa.states[sid].out:
                if target.id not in closure:
                    closure.add(target.id)
                    frontier.append(target.id)
        self.assertIn(nfa.accept.id, closure)

    def test_star_has_back_edge(self):
        # In 'a*' the child fragment's accept (state 1) loops back to the
        # child fragment's start (state 0) with an epsilon edge.
        nfa = build_nfa(compile_pattern("a*"))
        back = [t.id for _l, _ls, t in nfa.states[1].out if _l is None]
        self.assertIn(0, back)


# ---------------------------------------------------------------------------
# Matching semantics - cases where both engines agree
# ---------------------------------------------------------------------------


class AgreementTests(unittest.TestCase):
    CASES = [
        # (pattern, text, expected span or None)
        ("a", "cat", (1, 2)),
        ("a", "ba", (1, 2)),
        ("a", "bbb", None),
        ("ab", "xaby", (1, 3)),
        ("abc", "xxabcxx", (2, 5)),
        ("^a", "apple", (0, 1)),
        ("^a", "banana", None),
        ("a$", "banana", (5, 6)),
        ("t$", "cat", (2, 3)),
        ("^abc$", "abc", (0, 3)),
        ("^abc$", "abcd", None),
        ("^$", "", (0, 0)),
        ("^$", "a", None),
        ("a.b", "acb", (0, 3)),
        ("a.b", "a\nb", None),
        ("[abc]", "xxb", (2, 3)),
        ("[a-c]", "xd", None),
        ("[^a]", "abc", (1, 2)),
        ("[0-9]", "a7b", (1, 2)),
        ("\\d", "a7b", (1, 2)),
        ("\\w", "a_b", (0, 1)),
        ("\\s", "a b", (1, 2)),
        ("\\D", "a7b", (0, 1)),
        ("a|b", "cat", (1, 2)),
        ("a|b", "zebra", (2, 3)),
        ("(ab)c", "xxabc", (2, 5)),
        ("a+b", "aaab", (0, 4)),
        ("a*b", "aaab", (0, 4)),
        ("a?b", "b", (0, 1)),
        ("a?b", "ab", (0, 2)),
        ("ab|ac", "ac", (0, 2)),
        ("a.c", "aXc", (0, 3)),
        ("^\\d+$", "12345", (0, 5)),
        ("^\\d+$", "12a45", None),
        ("^a*$", "aaa", (0, 3)),
        ("^a*$", "aab", None),
        ("a*", "", (0, 0)),
        ("a?", "b", (0, 0)),
        ("x*", "b", (0, 0)),
        ("a", "", None),
        ("b$|a$", "ab", (1, 2)),
        ("^b|^a", "ab", (0, 1)),
        ("[^0-9]+", "a1b", (0, 1)),
        ("-", "-", (0, 1)),
        ("[\\]]", "]", (0, 1)),
        ("[a-]", "-", (0, 1)),
        ("[]]", "]", (0, 1)),
        ("[a-cx]", "x", (0, 1)),
        ("[^^]", "^", None),
        ("[^^]", "a", (0, 1)),
        ("\\n", "\n", (0, 1)),
        ("\\.", ".", (0, 1)),
        ("a(b|c)*d", "abccbd", (0, 6)),
        ("(a)(b)", "ab", (0, 2)),
        ("a\\\\", "a\\", (0, 2)),
    ]

    def test_nfa_engine(self):
        for pattern, text, expected in self.CASES:
            with self.subTest(pattern=pattern, text=text):
                self.assertEqual(_span_nfa(pattern, text)[0], expected)

    def test_backtrack_engine(self):
        for pattern, text, expected in self.CASES:
            with self.subTest(pattern=pattern, text=text):
                self.assertEqual(_span_bt(pattern, text)[0], expected)


# ---------------------------------------------------------------------------
# The two engines differ by design
# ---------------------------------------------------------------------------


class EngineDifferenceTests(unittest.TestCase):
    """The NFA engine reports the leftmost-shortest match; the backtracking
    engine reports the leftmost-longest (greedy) match. These cases pin down
    the documented difference."""

    CASES = [
        # (pattern, text, nfa span, backtrack span)
        ("a+", "aaab", (0, 1), (0, 3)),
        ("a*", "aaab", (0, 0), (0, 3)),
        ("a(b|c)*", "abccbd", (0, 1), (0, 5)),
        ("[a-c]+", "xxacbd", (2, 3), (2, 5)),
        ("ab|a", "ab", (0, 1), (0, 2)),
        ("(ab)+", "abab", (0, 2), (0, 4)),
        ("x*", "xxxb", (0, 0), (0, 3)),
    ]

    def test_nfa_is_leftmost_shortest(self):
        for pattern, text, nfa_span, _bt_span in self.CASES:
            with self.subTest(pattern=pattern, text=text):
                self.assertEqual(_span_nfa(pattern, text)[0], nfa_span)

    def test_backtrack_is_leftmost_greedy(self):
        for pattern, text, _nfa_span, bt_span in self.CASES:
            with self.subTest(pattern=pattern, text=text):
                self.assertEqual(_span_bt(pattern, text)[0], bt_span)

    def test_catastrophic_abort(self):
        span, result = _span_bt("(a+)+b", "a" * 30, max_steps=1000)
        self.assertIsNone(span)
        self.assertTrue(result.aborted)
        self.assertEqual(result.stats["steps"], 1000)

    def test_nfa_handles_catastrophic_pattern_quickly(self):
        span, result = _span_nfa("(a+)+b", "a" * 30)
        self.assertIsNone(span)
        self.assertFalse(result.aborted)


# ---------------------------------------------------------------------------
# Statistics
# ---------------------------------------------------------------------------


class StatsTests(unittest.TestCase):
    def test_nfa_stats(self):
        _span, result = _span_nfa("a", "ba")
        self.assertEqual(result.stats["steps"], 5)
        self.assertEqual(result.stats["states"], 2)
        self.assertEqual(result.stats["max_active"], 1)

    def test_nfa_stats_for_branching(self):
        _span, result = _span_nfa("a(b|c)*d", "abccbd")
        self.assertEqual(result.stats["states"], 12)
        self.assertGreaterEqual(result.stats["max_active"], 4)

    def test_backtrack_stats(self):
        _span, result = _span_bt("ab|ac", "ac")
        self.assertEqual(result.ok, True)
        self.assertGreater(result.stats["states"], 1)
        self.assertGreaterEqual(result.stats["max_depth"], 3)
        self.assertGreaterEqual(result.stats["steps"], 9)

    def test_no_match_stats(self):
        _span, result = _span_nfa("z", "abc")
        self.assertFalse(result.ok)
        self.assertGreater(result.stats["steps"], 0)


# ---------------------------------------------------------------------------
# Rendering
# ---------------------------------------------------------------------------


class DiagramTests(unittest.TestCase):
    def _diagram(self, pattern, active=frozenset()):
        return render_diagram(build_nfa(compile_pattern(pattern)), active)

    def test_states_and_labels(self):
        art = self._diagram("ab")
        self.assertIn("(0)", art)
        self.assertIn("(1)", art)
        self.assertIn("(3)*", art)
        self.assertIn("→", art)
        self.assertIn("a", art)
        self.assertIn("b", art)
        self.assertIn("ε", art)

    def test_deterministic(self):
        a = self._diagram("a(b|c)*d")
        b = self._diagram("a(b|c)*d")
        self.assertEqual(a, b)

    def test_active_marking(self):
        nfa = build_nfa(compile_pattern("ab"))
        art = render_diagram(nfa, active={1})
        self.assertIn("[1]", art)
        self.assertNotIn("[0]", art)

    def test_complex_pattern_renders(self):
        art = self._diagram("^[a-z]+(b|cd)*x?$")
        self.assertIn("(0)", art)
        self.assertIn("ε", art)

    def test_accept_marker_only_on_accept(self):
        art = self._diagram("ab")
        self.assertIn("(3)*", art)
        self.assertNotIn("(2)*", art)


class AstRenderTests(unittest.TestCase):
    def test_tree_structure(self):
        tree = render_ast(compile_pattern("a(b|c)*"))
        self.assertIn("sequence", tree)
        self.assertIn("star", tree)
        self.assertIn("alternation", tree)
        self.assertIn("'a'", tree)
        self.assertIn("'b'", tree)
        self.assertIn("'c'", tree)

    def test_highlight(self):
        ast = compile_pattern("ab")
        tree = render_ast(ast, highlight=ast.parts[0].id)
        self.assertIn("◀", tree)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


class CliTests(unittest.TestCase):
    def test_quiet_match(self):
        code, out, err = _cli(["--quiet", "a(b|c)*d", "abccbd"])
        self.assertEqual(code, 0, err)
        self.assertEqual(out, "MATCH 0-6\n")

    def test_quiet_no_match(self):
        code, out, _err = _cli(["--quiet", "a", "bbb"])
        self.assertEqual(code, 1)
        self.assertEqual(out, "NO MATCH\n")

    def test_quiet_aborted(self):
        code, out, _err = _cli(
            ["--quiet", "--engine", "backtrack", "(a+)+b", "a" * 30,
             "--max-steps", "100"]
        )
        self.assertEqual(code, 2)
        self.assertEqual(out, "ABORTED 100\n")

    def test_diagram_only(self):
        code, out, err = _cli(["--diagram-only", "ab"])
        self.assertEqual(code, 0, err)
        self.assertIn("(0)", out)
        self.assertIn("(3)*", out)
        self.assertIn("pattern: ab", out)

    def test_quiet_and_diagram_are_exclusive(self):
        parser = build_parser()
        with self.assertRaises(SystemExit) as ctx:
            parser.parse_args(["--quiet", "--diagram-only", "a", "b"])
        self.assertEqual(ctx.exception.code, 2)

    def test_version(self):
        parser = build_parser()
        with self.assertRaises(SystemExit) as ctx:
            parser.parse_args(["--version"])
        self.assertEqual(ctx.exception.code, 0)

    def test_help(self):
        parser = build_parser()
        with self.assertRaises(SystemExit) as ctx:
            parser.parse_args(["--help"])
        self.assertEqual(ctx.exception.code, 0)

    def test_bad_pattern_error(self):
        code, _out, err = _cli(["--quiet", "(", "a"])
        self.assertEqual(code, 2)
        self.assertIn("error", err)

    def test_engine_flag(self):
        code_nfa, out_nfa, _ = _cli(["--quiet", "--engine", "nfa", "a(b|c)*", "abccbd"])
        code_bt, out_bt, _ = _cli(
            ["--quiet", "--engine", "backtrack", "a(b|c)*", "abccbd"]
        )
        self.assertEqual(code_nfa, 0)
        self.assertEqual(code_bt, 0)
        self.assertEqual(out_nfa, "MATCH 0-1\n")
        self.assertEqual(out_bt, "MATCH 0-5\n")

    def test_default_animation_output(self):
        code, out, err = _cli(["a(b|c)*d", "abccbd"])
        self.assertEqual(code, 0, err)
        self.assertIn("ready to match", out)
        self.assertIn("step 0/", out)
        self.assertIn("MATCH 'abccbd'[0:6]", out)
        self.assertIn("stats:", out)

    def test_backtrack_animation_output(self):
        code, out, err = _cli(["--engine", "backtrack", "ab|ac", "ac"])
        self.assertEqual(code, 0, err)
        self.assertIn("alternation", out)
        self.assertIn("◀", out)
        self.assertIn("MATCH 'ac'[0:2]", out)

    def test_empty_input_default(self):
        code, out, _err = _cli(["a*"])
        self.assertEqual(code, 0)
        self.assertIn("MATCH ''[0:0]", out)

    def test_input_too_long_rejected(self):
        code, _out, err = _cli(["a", "x" * (_MAX_TEXT_LEN + 1)])
        self.assertEqual(code, 2)
        self.assertIn("too long", err)

    def test_negative_delay_rejected(self):
        code, _out, err = _cli(["a", "a", "--delay", "-1"])
        self.assertEqual(code, 2)
        self.assertIn("--delay", err)

    def test_zero_max_steps_rejected(self):
        code, _out, err = _cli(["a", "a", "--max-steps", "0"])
        self.assertEqual(code, 2)
        self.assertIn("--max-steps", err)


if __name__ == "__main__":
    unittest.main()
