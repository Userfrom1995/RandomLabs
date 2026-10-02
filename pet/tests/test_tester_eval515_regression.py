"""Tester-authored regression suite for issue #515 eval fixes (follow-up to #514).

Covers the six project-code eval findings repaired on this branch:
hub/docs HTML structure, smoke fail-closed behavior, arg guards,
example-version disclaimers, and the honest-skip matrix in the
packaging README. Authored by the Tester, stdlib only.
"""

import re
import subprocess
import unittest
from html.parser import HTMLParser
from pathlib import Path

PET = Path(__file__).resolve().parent.parent
HUB = PET / "index.html"
DOCS = PET / "docs" / "index.html"
README = PET / "packaging" / "README.md"
SMOKE_LINUX = PET / "packaging" / "smoke-linux.sh"
SMOKE_MACOS = PET / "packaging" / "smoke-macos.sh"
SMOKE_WIN = PET / "packaging" / "smoke-windows.ps1"


class _BalanceCheck(HTMLParser):
    VOID = frozenset({
        "area", "base", "br", "col", "embed", "hr", "img", "input",
        "link", "meta", "param", "source", "track", "wbr",
    })

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack = []
        self.errors = []

    def handle_starttag(self, tag, attrs):
        if tag not in self.VOID:
            self.stack.append(tag)

    def handle_endtag(self, tag):
        if tag in self.VOID:
            return
        if self.stack and self.stack[-1] == tag:
            self.stack.pop()
        elif tag in self.stack:
            while self.stack and self.stack[-1] != tag:
                self.errors.append(f"unclosed <{self.stack.pop()}> before </{tag}>")
            self.stack.pop()
        else:
            self.errors.append(f"stray </{tag}>")


def _parse(path):
    checker = _BalanceCheck()
    checker.feed(path.read_text(encoding="utf-8"))
    return checker


class TestEval515HtmlStructure(unittest.TestCase):
    def test_hub_has_single_main_close(self):
        text = HUB.read_text(encoding="utf-8")
        self.assertEqual(text.count("</main>"), 1,
                         "hub must carry exactly one </main> (eval fix 1)")
        self.assertEqual(text.count("<main"), 1)

    def test_hub_parses_balanced(self):
        checker = _parse(HUB)
        self.assertEqual(checker.errors, [])
        self.assertEqual(checker.stack, [])

    def test_docs_paragraphs_closed(self):
        text = DOCS.read_text(encoding="utf-8")
        opens = len(re.findall(r"<p[\s>]", text))
        closes = text.count("</p>")
        self.assertEqual(opens, closes,
                         f"docs <p> tags must all be closed ({opens} vs {closes})")

    def test_docs_parses_balanced(self):
        checker = _parse(DOCS)
        self.assertEqual(checker.errors, [])
        self.assertEqual(checker.stack, [])

    def test_docs_packaging_uses_table(self):
        text = DOCS.read_text(encoding="utf-8")
        section = text.split("Packaging", 1)[1]
        self.assertIn("<table>", section)


class TestEval515SmokeHardening(unittest.TestCase):
    def test_linux_bare_value_flag_fails_closed(self):
        proc = subprocess.run(
            ["bash", str(SMOKE_LINUX), "--binary"],
            capture_output=True, text=True, timeout=60,
        )
        self.assertNotEqual(proc.returncode, 0)
        self.assertIn("needs a value", proc.stderr)

    def test_macos_bare_value_flag_fails_closed(self):
        proc = subprocess.run(
            ["bash", str(SMOKE_MACOS), "--pkg"],
            capture_output=True, text=True, timeout=60,
        )
        self.assertNotEqual(proc.returncode, 0)
        self.assertIn("needs a value", proc.stderr)

    def test_macos_pkg_id_matches_builder(self):
        build = (PET / "packaging" / "build-macos.sh").read_text(encoding="utf-8")
        smoke = SMOKE_MACOS.read_text(encoding="utf-8")
        ident = re.search(r'IDENT="([^"]+)"', build) or re.search(r"IDENT='([^']+)'", build)
        self.assertIsNotNone(ident, "build-macos.sh must stamp an IDENT")
        self.assertIn(ident.group(1), smoke,
                      "smoke PKG_ID must match the builder IDENT")

    def test_windows_smoke_surfaces_exit_codes(self):
        text = SMOKE_WIN.read_text(encoding="utf-8")
        self.assertIn("-PassThru", text)
        self.assertIn("ExitCode", text)

    def test_unknown_flag_still_rejected(self):
        proc = subprocess.run(
            ["bash", str(SMOKE_LINUX), "--bogus-flag"],
            capture_output=True, text=True, timeout=60,
        )
        self.assertNotEqual(proc.returncode, 0)
        self.assertIn("unknown flag", proc.stderr)


class TestEval515DocsHonesty(unittest.TestCase):
    def test_readme_documents_honest_skip_matrix(self):
        text = README.read_text(encoding="utf-8")
        self.assertRegex(text, r"(?i)honest.?skip|skip.*honest")

    def test_hub_marks_artifacts_as_examples(self):
        text = HUB.read_text(encoding="utf-8")
        self.assertRegex(text, r"(?i)as an example|example.*version|version.*example")


if __name__ == "__main__":
    unittest.main()
