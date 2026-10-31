"""Regression tests for PR #797 (Fixes #796): first-run setup guidance.

Verifies against the shipped public docs and the shipped setup script:
- README.md and docs/index.md tell a fresh deployer to write the required
  repo secrets and dispatch the Maintainer with
  ``bash setup.sh --secrets --dispatch``
- the docs/index.html quickstart advertises the same combined command
- docs/index.md names the real setup modes (bare, --secrets, --dispatch,
  --check) that setup.sh actually implements
- setup.sh still writes OPENCODE_API_KEY and OPENCODE_PAT and still exits 1
  from a read-only --check when the lab files/workflows are incomplete
- the changed documents carry zero em dashes (lab formatting invariant)

Stdlib only, no extra runtime dependencies.
Run: python3 tests/landing/test_pr797_setup_guidance.py
"""
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
README = ROOT / "README.md"
DOCS_MD = ROOT / "docs" / "index.md"
DOCS_HTML = ROOT / "docs" / "index.html"
SETUP = ROOT / "setup.sh"

COMBINED = "bash setup.sh --secrets --dispatch"
FIRST_RUN_SECRETS = "write the required repo secrets"


def read(path):
    return path.read_text(encoding="utf-8")


def first_run_block(text, anchor):
    return text.split(anchor, 1)[1].split("\n\n", 1)[0]


class FirstRunGuidanceTest(unittest.TestCase):
    def test_readme_first_run_writes_secrets_and_dispatches(self):
        block = first_run_block(read(README), "**First run:**")
        normalized = " ".join(block.split())
        self.assertIn(COMBINED, normalized)
        self.assertIn(FIRST_RUN_SECRETS, normalized.lower())
        self.assertNotIn("bash setup.sh --dispatch", normalized)

    def test_docs_markdown_first_run_matches_readme(self):
        block = first_run_block(read(DOCS_MD), "**First run**:")
        normalized = " ".join(block.split())
        self.assertIn(COMBINED, normalized)
        self.assertIn(FIRST_RUN_SECRETS, normalized.lower())
        self.assertNotIn("bash setup.sh --dispatch", normalized)

    def test_docs_site_advertises_the_combined_command(self):
        self.assertIn(COMBINED, read(DOCS_HTML))


class SetupModeSummaryTest(unittest.TestCase):
    def test_docs_summary_names_every_shipped_mode(self):
        text = read(DOCS_MD)
        for mode, description in (
            ("`bash setup.sh`", "check status and guided prompts"),
            ("`--secrets`", "write the required repo secrets"),
            ("`--dispatch`", "first-run dispatch"),
            ("`--check`", "read-only status, exit 0/1"),
        ):
            with self.subTest(mode=mode):
                self.assertIn(mode, text)
                self.assertIn(description, text)

    def test_setup_usage_header_documents_the_same_modes(self):
        header = "\n".join(read(SETUP).splitlines()[:10])
        for mode in ("bash setup.sh", "--secrets", "--dispatch", "--check"):
            with self.subTest(mode=mode):
                self.assertIn(mode, header)

    def test_setup_script_still_writes_both_required_secrets(self):
        text = read(SETUP)
        for name in ("OPENCODE_API_KEY", "OPENCODE_PAT"):
            with self.subTest(name=name):
                self.assertIn(name, text)

    def test_check_mode_still_exits_nonzero_on_incomplete_lab(self):
        text = read(SETUP)
        self.assertIn('[ "$MODE" = "check" ] && exit 1', text)
        self.assertIn('if [ "$ok" -eq 0 ]; then', text)


class HygieneTest(unittest.TestCase):
    def test_changed_docs_have_no_em_dashes(self):
        for path in (README, DOCS_MD, DOCS_HTML):
            with self.subTest(path=path.name):
                self.assertNotIn("\u2014", read(path))


if __name__ == "__main__":
    unittest.main()
