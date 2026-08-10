"""Unit and CLI tests for Fernwald.

Run from the repository root with::

    python3 -m unittest discover -s fernwald/tests
"""

import io
import os
import random
import tempfile
import unittest

from fernwald.fernwald import (
    PRESETS,
    _MAX_ITERATIONS,
    ExpansionError,
    FernwaldError,
    GrammarError,
    TurtleError,
    bounding_box,
    build_parser,
    expand,
    export_svg,
    fit_transform,
    interpret,
    parse_grammar,
    read_grammar,
    render_ascii,
    resolve_grammar,
    run,
)


def _cli(args):
    """Run the CLI in-process and return (code, stdout, stderr)."""
    parser = build_parser()
    out = io.StringIO()
    err = io.StringIO()
    code = run(parser.parse_args(args), out=out, err=err)
    return code, out.getvalue(), err.getvalue()


class ExpandTests(unittest.TestCase):
    def test_single_rewrite(self):
        self.assertEqual(expand("A", {"A": ["F[+A][-A]"]}, 1), "F[+A][-A]")

    def test_multiple_iterations(self):
        rules = {"A": ["F[+A][-A]"]}
        result = expand("A", rules, 2)
        self.assertEqual(result, "F[+F[+A][-A]][-F[+A][-A]]")

    def test_zero_iterations_is_axiom(self):
        self.assertEqual(expand("FX", {"X": ["Y"]}, 0), "FX")

    def test_constants_pass_through(self):
        self.assertEqual(expand("F+F", {"F": ["F"]}, 1), "F+F")

    def test_unmatched_symbols_survive(self):
        self.assertEqual(expand("AB", {"A": ["a"]}, 1), "aB")

    def test_stochastic_is_seeded(self):
        rules = {"F": ["FF", "F[+F]", "F[-F]"]}
        first = expand("F", rules, 6, rng=random.Random(7))
        second = expand("F", rules, 6, rng=random.Random(7))
        self.assertEqual(first, second)

    def test_stochastic_can_differ(self):
        rules = {"F": ["F", "FF", "F[+F]"]}
        out = {expand("F", rules, 8, rng=random.Random(n)) for n in range(5)}
        self.assertGreater(len(out), 1)

    def test_preset_determinism_with_seed(self):
        spec = PRESETS["wild"]
        one = expand(spec["axiom"], spec["rules"], spec["iterations"],
                     rng=random.Random(3))
        two = expand(spec["axiom"], spec["rules"], spec["iterations"],
                     rng=random.Random(3))
        self.assertEqual(one, two)

    def test_negative_iterations_rejected(self):
        with self.assertRaises(ValueError):
            expand("F", {}, -1)

    def test_expansion_cap(self):
        with self.assertRaises(ExpansionError):
            expand("F", {"F": ["FFFF"]}, 11)

    def test_iterations_cap(self):
        with self.assertRaises(ExpansionError):
            expand("F", {}, _MAX_ITERATIONS + 1)


class ParseGrammarTests(unittest.TestCase):
    def test_inline_rules(self):
        axiom, rules, angle, iterations = parse_grammar(
            "A: F[+A][-A]", 22.5, None, 5
        )
        self.assertEqual(axiom, "A")
        self.assertEqual(rules, {"A": ["F[+A][-A]"]})
        self.assertEqual(angle, 22.5)
        self.assertEqual(iterations, 5)

    def test_semicolon_separated(self):
        axiom, rules, angle, iterations = parse_grammar(
            "F: F-F++F-F; angle 60; iterations 3", 22.5, "F++F++F", 5
        )
        self.assertEqual(axiom, "F++F++F")
        self.assertEqual(rules, {"F": ["F-F++F-F"]})
        self.assertEqual(angle, 60.0)
        self.assertEqual(iterations, 3)

    def test_directives_and_comments(self):
        text = (
            "# a comment\n"
            "angle 30\n"
            "axiom F\n"
            "iterations 4\n"
            "F: F[+F][-F]F\n"
        )
        axiom, rules, angle, iterations = parse_grammar(text, 25.0, "X", 2)
        self.assertEqual(axiom, "F")
        self.assertEqual(rules, {"F": ["F[+F][-F]F"]})
        self.assertEqual(angle, 30.0)
        self.assertEqual(iterations, 4)

    def test_trailing_comment_on_rule(self):
        axiom, rules, _, _ = parse_grammar("F: FF # grows twice", 22.5, None, 1)
        self.assertEqual(rules, {"F": ["FF"]})
        self.assertEqual(axiom, "F")

    def test_alternatives(self):
        axiom, rules, _, _ = parse_grammar("F: FF | F[+F]", 22.5, None, 1)
        self.assertEqual(rules, {"F": ["FF", "F[+F]"]})
        self.assertEqual(axiom, "F")

    def test_default_axiom_is_first_rule(self):
        axiom, _, _, _ = parse_grammar("B: F[-B]", 22.5, None, 1)
        self.assertEqual(axiom, "B")

    def test_missing_rules_rejected(self):
        with self.assertRaises(GrammarError):
            parse_grammar("angle 30", 22.5, None, 1)

    def test_empty_rhs_rejected(self):
        with self.assertRaises(GrammarError):
            parse_grammar("F:", 22.5, None, 1)

    def test_duplicate_rule_rejected(self):
        with self.assertRaises(GrammarError):
            parse_grammar("F: FF; F: F", 22.5, None, 1)

    def test_reserved_lhs_rejected(self):
        with self.assertRaises(GrammarError):
            parse_grammar("+: FF", 22.5, None, 1)

    def test_unknown_directive_rejected(self):
        with self.assertRaises(GrammarError):
            parse_grammar("axim F", 22.5, None, 1)

    def test_bad_angle_rejected(self):
        with self.assertRaises(GrammarError):
            parse_grammar("angle nope", 22.5, None, 1)
        with self.assertRaises(GrammarError):
            parse_grammar("angle 0", 22.5, None, 1)

    def test_bad_iterations_rejected(self):
        with self.assertRaises(GrammarError):
            parse_grammar("iterations -2", 22.5, None, 1)


class ReadGrammarTests(unittest.TestCase):
    def test_inline_source_returns_itself(self):
        self.assertEqual(read_grammar("A: F[+A]"), "A: F[+A]")

    def test_file_source_is_read(self):
        with tempfile.NamedTemporaryFile("w", suffix=".grow", delete=False) as handle:
            handle.write("angle 30\nA: F[+A]\n")
            path = handle.name
        try:
            self.assertEqual(read_grammar(path), "angle 30\nA: F[+A]\n")
        finally:
            os.unlink(path)

    def test_unreadable_file_rejected(self):
        # A missing file falls back to being treated as an inline grammar,
        # which the parser then rejects because it is not valid grammar text.
        source = read_grammar("/no/such/dir/fern.grow")
        with self.assertRaises(GrammarError):
            parse_grammar(source, 22.5, None, 1)


class InterpretTests(unittest.TestCase):
    def test_square_closes(self):
        segments, tips = interpret("F+F+F+F", 90)
        self.assertEqual(len(segments), 4)
        self.assertEqual((segments[0][0], segments[0][1]), (0.0, 0.0))
        self.assertEqual((segments[-1][2], segments[-1][3]), (0.0, 0.0))

    def test_bracket_push_pop(self):
        segments, tips = interpret("F[F]F", 90)
        self.assertEqual(len(segments), 3)
        # Tip at the popped branch end, and again at the end of the string
        # (heading is restored upward, so both land on (0, 2)).
        self.assertEqual(tips, [(0.0, 2.0), (0.0, 2.0)])

    def test_tip_at_end_of_string(self):
        _, tips = interpret("F", 90)
        self.assertEqual(tips, [(0.0, 1.0)])

    def test_move_without_draw_breaks_tips(self):
        segments, tips = interpret("FfF", 90)
        self.assertEqual(len(segments), 2)
        self.assertEqual((segments[1][0], segments[1][1]), (0.0, 2.0))
        self.assertEqual(tips, [(0.0, 3.0)])

    def test_unbalanced_pop_rejected(self):
        with self.assertRaises(TurtleError):
            interpret("F]", 90)

    def test_unknown_symbols_ignored(self):
        segments, tips = interpret("X[+F]A", 90)
        self.assertEqual(len(segments), 1)
        self.assertEqual(tips, [(-1.0, 0.0)])

    def test_turn_angles(self):
        # Three unit steps turned by 120 degrees close an equilateral triangle.
        segments, tips = interpret("F+F+F", 120)
        end = (segments[-1][2], segments[-1][3])
        self.assertAlmostEqual(end[0], 0.0, places=6)
        self.assertAlmostEqual(end[1], 0.0, places=6)


class BoundingBoxTests(unittest.TestCase):
    def test_box_of_one_segment(self):
        self.assertEqual(bounding_box([(0.0, 0.0, 1.0, 1.0)]), (0.0, 0.0, 1.0, 1.0))

    def test_box_of_many(self):
        box = bounding_box([(0.0, 5.0, 2.0, 1.0), (-3.0, 0.0, 1.0, 4.0)])
        self.assertEqual(box, (-3.0, 0.0, 2.0, 5.0))

    def test_empty_rejected(self):
        with self.assertRaises(FernwaldError):
            bounding_box([])


class FitTransformTests(unittest.TestCase):
    def test_fits_within_grid(self):
        segments = [(0.0, 0.0, 10.0, 10.0)]
        fit = fit_transform(segments, 40, 20, pad=1)
        for x, y in [(0.0, 0.0), (10.0, 10.0), (5.0, 5.0)]:
            c, r = fit(x, y)
            self.assertGreaterEqual(c, 1.0)
            self.assertGreaterEqual(r, 1.0)
            self.assertLessEqual(c, 39.0)
            self.assertLessEqual(r, 19.0)

    def test_y_is_flipped(self):
        segments = [(0.0, 0.0, 1.0, 10.0)]
        fit = fit_transform(segments, 20, 20, pad=1)
        top = fit(0.0, 10.0)
        bottom = fit(0.0, 0.0)
        self.assertLess(top[1], bottom[1])

    def test_single_point_does_not_crash(self):
        segments = [(1.0, 1.0, 1.0, 1.0)]
        fit = fit_transform(segments, 20, 20, pad=1)
        c, r = fit(1.0, 1.0)
        self.assertTrue(0 <= c <= 20 and 0 <= r <= 20)


class RenderAsciiTests(unittest.TestCase):
    def test_dimensions(self):
        segments = [(0.0, 0.0, 0.0, 5.0)]
        art = render_ascii(segments, [], 40, 12, style="line", pad=1)
        lines = art.splitlines()
        self.assertEqual(len(lines), 12)
        self.assertTrue(all(len(line) == 40 for line in lines))

    def test_vertical_line_glyph(self):
        segments = [(0.0, 0.0, 0.0, 5.0)]
        art = render_ascii(segments, [], 40, 12, style="line", pad=1)
        self.assertIn("|", art)

    def test_horizontal_line_glyph(self):
        segments = [(0.0, 0.0, 5.0, 0.0)]
        art = render_ascii(segments, [], 40, 12, style="line", pad=1)
        self.assertIn("-", art)

    def test_tips_drawn(self):
        segments = [(0.0, 0.0, 0.0, 5.0)]
        art = render_ascii(segments, [(0.0, 5.0)], 40, 12, style="line", pad=1)
        self.assertIn("*", art)

    def test_shade_style(self):
        segments = [(0.0, 0.0, 0.0, 5.0), (0.0, 0.0, 5.0, 0.0)]
        art = render_ascii(segments, [], 40, 12, style="shade", pad=1)
        self.assertNotIn("|", art)

    def test_deterministic(self):
        segments = [(0.0, 0.0, 5.0, 5.0)]
        a = render_ascii(segments, [(5.0, 5.0)], 40, 12, style="line", pad=1)
        b = render_ascii(segments, [(5.0, 5.0)], 40, 12, style="line", pad=1)
        self.assertEqual(a, b)

    def test_bad_style_rejected(self):
        with self.assertRaises(ValueError):
            render_ascii([], [], 40, 12, style="bogus")


class ExportSvgTests(unittest.TestCase):
    def test_document_structure(self):
        svg = export_svg([(0.0, 0.0, 1.0, 1.0)], [(1.0, 1.0)])
        self.assertTrue(svg.startswith('<?xml version="1.0"'))
        self.assertIn("<svg ", svg)
        self.assertIn("<path ", svg)
        self.assertTrue(svg.strip().endswith("</svg>"))

    def test_y_is_flipped(self):
        # The 10-unit tall segment spans y=20..780 in a 800px canvas; the top
        # of the drawing (turtle y=10) must land at a smaller SVG y than the
        # bottom (turtle y=0).
        svg = export_svg([(0.0, 0.0, 0.0, 10.0)], [], pad=20)
        self.assertRegex(svg, r"M400 780 L400 20")
        self.assertNotRegex(svg, r"M400 20 L400 780")

    def test_leaf_dots(self):
        tips = [(1.0, 1.0), (2.0, 2.0), (3.0, 3.0)]
        svg = export_svg([(0.0, 0.0, 4.0, 4.0)], tips)
        self.assertEqual(svg.count("<circle"), len(tips))

    def test_no_leaf_dots(self):
        svg = export_svg([(0.0, 0.0, 1.0, 1.0)], [(1.0, 1.0)], leaves=False)
        self.assertEqual(svg.count("<circle"), 0)

    def test_stroke_color(self):
        svg = export_svg([(0.0, 0.0, 1.0, 1.0)], [], stroke="#123456")
        self.assertIn("#123456", svg)


class ResolveGrammarTests(unittest.TestCase):
    def test_default_preset(self):
        parser = build_parser()
        args = parser.parse_args([])
        axiom, rules, angle, iterations = resolve_grammar(args)
        self.assertEqual(axiom, PRESETS["tree"]["axiom"])
        self.assertEqual(angle, PRESETS["tree"]["angle"])

    def test_unknown_preset_rejected(self):
        parser = build_parser()
        args = parser.parse_args(["--preset", "nope"])
        with self.assertRaises(FernwaldError):
            resolve_grammar(args)

    def test_rules_and_preset_conflict(self):
        parser = build_parser()
        args = parser.parse_args(["--preset", "koch", "--rules", "F: FF"])
        with self.assertRaises(FernwaldError):
            resolve_grammar(args)

    def test_inline_rules(self):
        parser = build_parser()
        args = parser.parse_args(["--rules", "A: F[+A][-A]"])
        axiom, rules, angle, iterations = resolve_grammar(args)
        self.assertEqual(axiom, "A")
        self.assertEqual(rules, {"A": ["F[+A][-A]"]})

    def test_overrides_apply(self):
        parser = build_parser()
        args = parser.parse_args(
            ["--preset", "koch", "--axiom", "F++F++F++F", "--angle", "90",
             "--iterations", "2"]
        )
        axiom, _, angle, iterations = resolve_grammar(args)
        self.assertEqual(axiom, "F++F++F++F")
        self.assertEqual(angle, 90.0)
        self.assertEqual(iterations, 2)

    def test_bad_angle_rejected(self):
        parser = build_parser()
        args = parser.parse_args(["--preset", "tree", "--angle", "0"])
        with self.assertRaises(FernwaldError):
            resolve_grammar(args)


class CliTests(unittest.TestCase):
    def test_version(self):
        parser = build_parser()
        with self.assertRaises(SystemExit) as ctx:
            parser.parse_args(["--version"])
        self.assertEqual(ctx.exception.code, 0)

    def test_list_presets(self):
        code, out, err = _cli(["--list-presets"])
        self.assertEqual(code, 0)
        self.assertIn("tree", out)
        self.assertIn("koch", out)

    def test_render_tree(self):
        code, out, err = _cli(["--preset", "tree", "--width", "60", "--height", "20"])
        self.assertEqual(code, 0, err)
        self.assertEqual(len(out.splitlines()), 20)

    def test_svg_output(self):
        code, out, err = _cli(["--preset", "koch", "--svg"])
        self.assertEqual(code, 0, err)
        self.assertTrue(out.lstrip().startswith("<?xml"))

    def test_unknown_preset_error(self):
        code, out, err = _cli(["--preset", "bogus"])
        self.assertEqual(code, 2)
        self.assertIn("error", err)

    def test_animate_svg_conflict(self):
        code, out, err = _cli(["--preset", "tree", "--svg", "--animate"])
        self.assertEqual(code, 2)
        self.assertIn("animate", err)

    def test_seed_reproducibility(self):
        args = ["--preset", "wild", "--seed", "42", "--width", "60", "--height", "20"]
        code_a, out_a, err_a = _cli(args)
        code_b, out_b, err_b = _cli(args)
        self.assertEqual(code_a, 0, err_a)
        self.assertEqual(code_b, 0, err_b)
        self.assertEqual(out_a, out_b)

    def test_seed_changes_output(self):
        a = _cli(["--preset", "wild", "--seed", "1", "--width", "60", "--height", "20"])
        b = _cli(["--preset", "wild", "--seed", "2", "--width", "60", "--height", "20"])
        self.assertNotEqual(a[1], b[1])

    def test_width_clamped(self):
        code, out, err = _cli(["--preset", "tree", "--width", "2", "--height", "2"])
        self.assertEqual(code, 0, err)
        lines = out.splitlines()
        self.assertEqual(len(lines), 4)
        self.assertTrue(all(len(line) == 4 for line in lines))

    def test_inline_rules_cli(self):
        code, out, err = _cli(
            ["--rules", "A: F[+A][-A]", "--angle", "30", "--iterations", "3",
             "--width", "40", "--height", "16"]
        )
        self.assertEqual(code, 0, err)
        self.assertEqual(len(out.splitlines()), 16)

    def test_grammar_file_cli(self):
        with tempfile.NamedTemporaryFile("w", suffix=".grow", delete=False) as handle:
            handle.write("angle 30\naxiom F\niterations 4\nF: F[+F][-F]F\n")
            path = handle.name
        try:
            code, out, err = _cli(
                ["--rules", path, "--width", "40", "--height", "16"]
            )
            self.assertEqual(code, 0, err)
            self.assertEqual(len(out.splitlines()), 16)
        finally:
            os.unlink(path)

    def test_expansion_error_is_reported(self):
        code, out, err = _cli(
            ["--rules", "F: FFF", "--iterations", "14", "--width", "40",
             "--height", "16"]
        )
        self.assertEqual(code, 2)
        self.assertIn("error", err)

    def test_help(self):
        parser = build_parser()
        with self.assertRaises(SystemExit) as ctx:
            parser.parse_args(["--help"])
        self.assertEqual(ctx.exception.code, 0)


if __name__ == "__main__":
    unittest.main()
