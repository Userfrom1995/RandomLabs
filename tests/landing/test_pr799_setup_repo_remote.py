"""Regression tests for issue #799: setup/shutdown repo resolution.

A standard ``git clone`` leaves ``.git`` on the origin URL, and the old
greedy capture kept that suffix, so every ``gh --repo`` call targeted a 404
repository. The scripts now strip the suffix for HTTPS and SSH remotes,
keep ``GITHUB_REPOSITORY`` precedence, and warn and continue (instead of
aborting under ``set -euo pipefail``) when the repo cannot be resolved.

Verifies:
- setup.sh resolves HTTPS, SSH, scp-style, and trailing-slash remotes to
  ``owner/repo`` and writes secrets / dispatches against that slug
- GITHUB_REPOSITORY still wins over the origin remote
- a tree with no origin warns and exits 0 in bare, --secrets/--dispatch,
  and --check modes without touching ``gh``
- shutdown.sh --purge targets the suffix-free slug and its --check mode
  survives a missing origin
- the three drifted documents state the real setup modes
- the changed files carry zero em dashes (lab formatting invariant)

Stdlib only, no extra runtime dependencies.
Run: python3 tests/landing/test_pr799_setup_repo_remote.py
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
SETUP = ROOT / "setup.sh"
SHUTDOWN = ROOT / "shutdown.sh"
DOCS_HTML = ROOT / "docs" / "index.html"
AGENTS = ROOT / "AGENTS.md"
LAB = ROOT / "LAB.md"

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

REMOTE_CASES = (
    ("https://github.com/owner/repo.git", "owner/repo"),
    ("git@github.com:owner/repo.git", "owner/repo"),
    ("ssh://git@github.com/owner/repo.git", "owner/repo"),
    ("https://github.com/owner/repo", "owner/repo"),
    ("https://github.com/owner/repo/", "owner/repo"),
)

FIRST_RUN_FLAGS = {"--secrets", "--dispatch"}
SECRET_NAMES = ["OPENCODE_API_KEY", "OPENCODE_PAT"]


def read(path):
    return path.read_text(encoding="utf-8")


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
    shutil.copy2(SHUTDOWN, destination / "shutdown.sh")
    for relative in required_lab_paths():
        source = ROOT / relative
        target = destination / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        if source.is_dir():
            target.mkdir(exist_ok=True)
        else:
            target.touch()


class ScriptSandbox(unittest.TestCase):
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
        self.git("init", "-q")

    def git(self, *args):
        return subprocess.run(
            ["git", *args],
            cwd=self.tree,
            capture_output=True,
            text=True,
            timeout=60,
        )

    def set_origin(self, url):
        self.git("remote", "remove", "origin")
        result = self.git("remote", "add", "origin", url)
        self.assertEqual(result.returncode, 0, result.stderr)

    def run_script(self, script, *args, repo_env=None, stdin=subprocess.DEVNULL):
        env = os.environ.copy()
        env["PATH"] = "%s%s%s" % (self.mock_bin, os.pathsep, env.get("PATH", ""))
        env.pop("GITHUB_REPOSITORY", None)
        if repo_env is not None:
            env["GITHUB_REPOSITORY"] = repo_env
        env["OPENCODE_API_KEY"] = "test-api-key"
        env["OPENCODE_PAT"] = "test-pat"
        env["MOCK_GH_LOG"] = str(self.log)
        return subprocess.run(
            ["bash", str(self.tree / script), *args],
            cwd=self.tree,
            env=env,
            stdin=stdin,
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

    def repo_targets(self):
        targets = []
        for call in self.gh_calls():
            if "--repo" in call:
                targets.append(call[call.index("--repo") + 1])
        return targets

    def secret_sets(self):
        return [
            call[2] for call in self.gh_calls() if call[:2] == ["secret", "set"]
        ]

    def secret_deletes(self):
        return [
            call[2] for call in self.gh_calls() if call[:2] == ["secret", "delete"]
        ]

    def dispatches(self):
        return [
            call for call in self.gh_calls() if call[:2] == ["workflow", "run"]
        ]


class SetupRepoResolutionTest(ScriptSandbox):
    def test_standard_clone_remotes_target_the_suffix_free_slug(self):
        for remote, expected in REMOTE_CASES:
            with self.subTest(remote=remote):
                self.set_origin(remote)
                self.log.unlink(missing_ok=True)
                result = self.run_script("setup.sh", "--secrets", "--dispatch")
                self.assertEqual(
                    result.returncode, 0, result.stdout + result.stderr
                )
                self.assertNotIn("could not determine", result.stdout)
                self.assertEqual(self.repo_targets(), [expected] * 4)
                self.assertEqual(self.secret_sets(), SECRET_NAMES)
                self.assertEqual(len(self.dispatches()), 1)
                self.assertEqual(
                    self.dispatches()[0],
                    ["workflow", "run", "maintainer.yml", "--repo", expected],
                )

    def test_github_repository_keeps_precedence_over_the_remote(self):
        self.set_origin("git@github.com:ignored/remote.git")
        result = self.run_script(
            "setup.sh",
            "--secrets",
            "--dispatch",
            repo_env="example/random-labs",
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertEqual(self.repo_targets(), ["example/random-labs"] * 4)
        self.assertEqual(self.secret_sets(), SECRET_NAMES)
        self.assertEqual(len(self.dispatches()), 1)

    def test_missing_origin_warns_and_continues(self):
        for args in ((), ("--secrets", "--dispatch"), ("--check",)):
            with self.subTest(args=args):
                self.log.unlink(missing_ok=True)
                result = self.run_script("setup.sh", *args)
                self.assertEqual(
                    result.returncode, 0, result.stdout + result.stderr
                )
                self.assertIn("could not determine the GitHub repo", result.stdout)
                self.assertEqual(self.gh_calls(), [])

    def test_unresolvable_origin_warns_and_continues(self):
        self.set_origin(".")
        result = self.run_script("setup.sh", "--secrets", "--dispatch")
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("could not determine the GitHub repo", result.stdout)
        self.assertEqual(self.gh_calls(), [])

    def test_check_mode_reports_a_failing_secret_probe(self):
        self.set_origin("https://github.com/owner/repo.git")
        gh = self.mock_bin / "gh"
        gh.write_text(
            "#!/usr/bin/env bash\n"
            'echo "HTTP 404: Not Found" >&2\n'
            "exit 1\n",
            encoding="utf-8",
        )
        gh.chmod(0o755)
        result = self.run_script("setup.sh", "--check")
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("warning: could not list secrets for owner/repo", result.stdout)


class ShutdownRepoResolutionTest(ScriptSandbox):
    def test_purge_targets_the_suffix_free_slug(self):
        for remote, expected in REMOTE_CASES:
            with self.subTest(remote=remote):
                self.set_origin(remote)
                self.log.unlink(missing_ok=True)
                result = self.run_script("shutdown.sh", "--yes", "--purge")
                self.assertEqual(
                    result.returncode, 0, result.stdout + result.stderr
                )
                self.assertEqual(self.secret_deletes(), SECRET_NAMES)
                self.assertEqual(self.repo_targets(), [expected] * 2)

    def test_check_mode_survives_a_missing_origin(self):
        result = self.run_script("shutdown.sh", "--check")
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("could not determine the GitHub repo", result.stdout)
        self.assertEqual(self.gh_calls(), [])


class DocumentationTruthTest(unittest.TestCase):
    def test_site_quickstart_names_both_secrets_and_dispatch(self):
        text = read(DOCS_HTML)
        quickstart = text.split("bash setup.sh", 1)[0].splitlines()[-1]
        self.assertIn("write the required secrets", quickstart)
        self.assertIn("dispatch the Maintainer once", quickstart)
        command = text.split("bash setup.sh", 1)[1].splitlines()[0]
        self.assertEqual(set(command.split()), FIRST_RUN_FLAGS)

    def test_agents_summary_describes_the_real_bare_mode(self):
        text = " ".join(
            read(AGENTS).split("## Logging & runbooks", 1)[1].split()
        )
        self.assertIn("checks status and prints guided prompts", text)
        self.assertIn("`--secrets` writes the required repo secrets", text)
        self.assertIn("`--dispatch` dispatches the Maintainer once", text)
        self.assertNotIn("validate/setup/secrets/dispatch", text)

    def test_lab_first_run_and_setup_claims_are_accurate(self):
        running = " ".join(read(LAB).split("## Running the lab", 1)[1].split())
        self.assertIn("write the required repo secrets", running)
        self.assertIn("`bash setup.sh --secrets --dispatch`", running)
        self.assertNotIn("creates/verifies everything", running)


class HygieneTest(unittest.TestCase):
    def test_changed_files_have_no_em_dashes(self):
        for path in (SETUP, SHUTDOWN, DOCS_HTML, AGENTS, LAB):
            with self.subTest(path=path.name):
                self.assertNotIn("\u2014", read(path))


if __name__ == "__main__":
    unittest.main()
