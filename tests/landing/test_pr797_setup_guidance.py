"""Regression tests for PR #797 (Fixes #796): first-run setup guidance.

Verifies against the shipped public docs and the shipped setup script:
- README.md and docs/index.md tell a fresh deployer to write the required
  repo secrets and dispatch the Maintainer with a ``bash setup.sh`` command
  carrying both ``--secrets`` and ``--dispatch`` (flag order is irrelevant)
- the docs/index.html quickstart advertises the same combined flag set
- docs/index.md names the real setup modes (bare, --secrets, --dispatch,
  --check) that setup.sh actually implements
- setup.sh, executed with a hermetic mock ``gh``, writes exactly
  OPENCODE_API_KEY and OPENCODE_PAT with ``--secrets`` and dispatches
  ``maintainer.yml`` only with ``--dispatch``
- setup.sh --check, executed on a complete fixture lab, exits 0 and, on an
  incomplete one, exits 1
- the changed documents carry zero em dashes (lab formatting invariant)

Stdlib only, no extra runtime dependencies.
Run: python3 tests/landing/test_pr797_setup_guidance.py
"""
import json
import os
import re
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
README = ROOT / "README.md"
DOCS_MD = ROOT / "docs" / "index.md"
DOCS_HTML = ROOT / "docs" / "index.html"
SETUP = ROOT / "setup.sh"

FIRST_RUN_SECRETS = "write the required repo secrets"
FIRST_RUN_FLAGS = {"--secrets", "--dispatch"}
SETUP_COMMAND_RE = re.compile(
    r"bash setup\.sh(?P<flags>(?:\s+--[a-z][a-z-]*)*)"
)

MOCK_GH = """#!/usr/bin/env python3
import json
import os
import sys

with open(os.environ["MOCK_GH_LOG"], "a", encoding="utf-8") as handle:
    handle.write(json.dumps(sys.argv[1:]) + "\\n")
try:
    sys.stdin.buffer.read()
except Exception:
    pass
"""


def read(path):
    return path.read_text(encoding="utf-8")


def first_run_block(text, anchor):
    rest = text.split(anchor, 1)[1]
    return rest.split("\n- ", 1)[0].split("\n\n", 1)[0]


def setup_command_flags(block):
    normalized = " ".join(block.split())
    match = SETUP_COMMAND_RE.search(normalized)
    if match is None:
        raise AssertionError("no 'bash setup.sh' command in: %r" % block)
    return set(match.group("flags").split())


def required_lab_paths():
    text = read(SETUP)
    paths = []
    for name in ("LAB_FILES", "LAB_WORKFLOWS"):
        match = re.search(r"%s=\((.*?)\n\)" % name, text, re.DOTALL)
        if match is None:
            raise AssertionError("%s array not found in setup.sh" % name)
        paths.extend(re.findall(r'"([^"]+)"', match.group(1)))
    return paths


def make_lab_tree(destination):
    shutil.copy2(SETUP, destination / "setup.sh")
    for relative in required_lab_paths():
        source = ROOT / relative
        target = destination / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        if source.is_dir():
            target.mkdir(exist_ok=True)
        else:
            target.touch()


class FirstRunGuidanceTest(unittest.TestCase):
    def assert_first_run_guidance(self, path, anchor):
        block = first_run_block(read(path), anchor)
        normalized = " ".join(block.split())
        self.assertIn(FIRST_RUN_SECRETS, normalized.lower())
        self.assertEqual(setup_command_flags(block), FIRST_RUN_FLAGS)

    def test_readme_first_run_writes_secrets_and_dispatches(self):
        self.assert_first_run_guidance(README, "**First run:**")

    def test_docs_markdown_first_run_matches_readme(self):
        self.assert_first_run_guidance(DOCS_MD, "**First run**:")

    def test_docs_site_advertises_the_combined_command(self):
        self.assertEqual(setup_command_flags(read(DOCS_HTML)), FIRST_RUN_FLAGS)


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


class SetupScriptBehaviourTest(unittest.TestCase):
    def setUp(self):
        self.tempdir = tempfile.TemporaryDirectory()
        self.addCleanup(self.tempdir.cleanup)
        self.tree = Path(self.tempdir.name) / "lab"
        self.tree.mkdir()
        make_lab_tree(self.tree)
        self.mock_bin = Path(self.tempdir.name) / "bin"
        self.mock_bin.mkdir()
        self.log = Path(self.tempdir.name) / "gh.log"
        gh = self.mock_bin / "gh"
        gh.write_text(MOCK_GH, encoding="utf-8")
        gh.chmod(0o755)

    def run_setup(self, *args):
        env = os.environ.copy()
        env["PATH"] = "%s%s%s" % (self.mock_bin, os.pathsep, env.get("PATH", ""))
        env["GITHUB_REPOSITORY"] = "example/random-labs"
        env["OPENCODE_API_KEY"] = "test-api-key"
        env["OPENCODE_PAT"] = "test-pat"
        env["MOCK_GH_LOG"] = str(self.log)
        return subprocess.run(
            ["bash", str(self.tree / "setup.sh"), *args],
            cwd=self.tree,
            env=env,
            stdin=subprocess.DEVNULL,
            capture_output=True,
            text=True,
            timeout=120,
        )

    def gh_calls(self):
        if not self.log.exists():
            return []
        return [
            json.loads(line)
            for line in self.log.read_text(encoding="utf-8").splitlines()
            if line.strip()
        ]

    def secret_sets(self):
        return [
            call[2]
            for call in self.gh_calls()
            if call[:2] == ["secret", "set"]
        ]

    def dispatches(self):
        return [
            call for call in self.gh_calls() if call[:2] == ["workflow", "run"]
        ]

    def test_flag_matrix_matches_the_documented_combined_command(self):
        expected_dispatch = [
            "workflow",
            "run",
            "maintainer.yml",
            "--repo",
            "example/random-labs",
        ]
        cases = (
            ((), [], []),
            (("--secrets",), ["OPENCODE_API_KEY", "OPENCODE_PAT"], []),
            (("--dispatch",), [], [expected_dispatch]),
            (
                ("--secrets", "--dispatch"),
                ["OPENCODE_API_KEY", "OPENCODE_PAT"],
                [expected_dispatch],
            ),
            (
                ("--dispatch", "--secrets"),
                ["OPENCODE_API_KEY", "OPENCODE_PAT"],
                [expected_dispatch],
            ),
        )
        for args, expected_sets, expected_dispatches in cases:
            with self.subTest(args=args):
                self.log.unlink(missing_ok=True)
                result = self.run_setup(*args)
                self.assertEqual(
                    result.returncode, 0, result.stdout + result.stderr
                )
                self.assertEqual(self.secret_sets(), expected_sets)
                self.assertEqual(self.dispatches(), expected_dispatches)

    def test_check_mode_exits_zero_on_a_complete_lab(self):
        result = self.run_setup("--check")
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertEqual(self.secret_sets(), [])
        self.assertEqual(self.dispatches(), [])

    def test_check_mode_exits_nonzero_on_an_incomplete_lab(self):
        for relative in ("LAB.md", ".github/workflows/pages.yml"):
            with self.subTest(missing=relative):
                self.log.unlink(missing_ok=True)
                path = self.tree / relative
                original = path.read_bytes()
                path.unlink()
                try:
                    result = self.run_setup("--check")
                finally:
                    path.write_bytes(original)
                self.assertEqual(
                    result.returncode, 1, result.stdout + result.stderr
                )
                self.assertIn("MISSING", result.stdout)
                self.assertEqual(self.secret_sets(), [])
                self.assertEqual(self.dispatches(), [])


class HygieneTest(unittest.TestCase):
    def test_changed_docs_have_no_em_dashes(self):
        for path in (README, DOCS_MD, DOCS_HTML):
            with self.subTest(path=path.name):
                self.assertNotIn("\u2014", read(path))


if __name__ == "__main__":
    unittest.main()
