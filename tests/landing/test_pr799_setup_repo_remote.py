"""Regression tests for issue #799: setup/shutdown repo resolution.

A standard ``git clone`` leaves ``.git`` on the origin URL, and the old
greedy capture kept that suffix, so every ``gh --repo`` call targeted a 404
repository. The scripts now extract the slug from recognized github.com
origin URLs only, keep ``GITHUB_REPOSITORY`` precedence (in both scripts),
and warn and continue (instead of aborting under ``set -euo pipefail``) when
the repo cannot be resolved.

Verifies:
- setup.sh resolves HTTPS (plain, credentialed, ``.git/``), SSH
  (scp-style, ``ssh://``, with port), git, and trailing-slash remotes to
  ``owner/repo`` and writes secrets / dispatches against exactly that slug
- GITHUB_REPOSITORY still wins over the origin remote
- local paths, ``file://`` remotes, and non-GitHub hosts are rejected and
  never reach ``gh`` in either script (the evaluator's F1 mis-target class)
- a tree with no origin warns and exits 0 in bare, --secrets/--dispatch,
  and --check modes without touching ``gh``
- a failing secret probe warns and surfaces its captured diagnostic
- shutdown.sh --purge targets the suffix-free slug, honors
  GITHUB_REPOSITORY, and its --check mode survives a missing origin
- the four drifted documents state the real setup modes
- the changed files carry zero em dashes (lab formatting invariant)

The mock ``gh`` proves interception before the scenario matrix and every
scenario runs with the live GitHub context scrubbed (delegation.md
section 6), so a PATH fall-through can never touch the real repository.
A dedicated scenario asserts all six scrubbed keys stay out of the child
environment, so removing the scrub cannot pass unnoticed.

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
from unittest import mock

ROOT = Path(__file__).resolve().parents[2]
SETUP = ROOT / "setup.sh"
SHUTDOWN = ROOT / "shutdown.sh"
DOCS_HTML = ROOT / "docs" / "index.html"
DOCS_MD = ROOT / "docs" / "index.md"
AGENTS = ROOT / "AGENTS.md"
LAB = ROOT / "LAB.md"
README = ROOT / "README.md"

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

FAILING_GH = """#!/usr/bin/env python3
import json
import os
import sys

with open(os.environ["MOCK_GH_LOG"], "a", encoding="utf-8") as handle:
    handle.write(json.dumps(sys.argv[1:]) + "\\n")
try:
    sys.stdin.buffer.read()
except Exception:
    pass
sys.stderr.write("HTTP 404: Not Found\\n")
sys.exit(1)
"""

REMOTE_CASES = (
    ("https://github.com/owner/repo.git", "owner/repo"),
    ("git@github.com:owner/repo.git", "owner/repo"),
    ("ssh://git@github.com/owner/repo.git", "owner/repo"),
    ("ssh://git@github.com:22/owner/repo.git", "owner/repo"),
    ("https://x-access-token:secret@github.com/owner/repo.git", "owner/repo"),
    ("git://github.com/owner/repo.git", "owner/repo"),
    ("https://github.com/owner/repo", "owner/repo"),
    ("https://github.com/owner/repo/", "owner/repo"),
    ("https://github.com/owner/repo.git/", "owner/repo"),
)

UNRECOGNIZED_REMOTES = (
    "file:///srv/git/owner/repo.git",
    "https://gitlab.com/owner/repo.git",
    "https://github.com.evil.example/owner/repo.git",
    "https://github.com:22evil/owner/repo.git",
    "../repo",
    "/srv/git/owner/repo.git",
    ".",
)

FIRST_RUN_FLAGS = {"--secrets", "--dispatch"}
SECRET_NAMES = ["OPENCODE_API_KEY", "OPENCODE_PAT"]
SCRUBBED_ENV = (
    "GITHUB_TOKEN",
    "GH_TOKEN",
    "GITHUB_EVENT_PATH",
    "GITHUB_RUN_ID",
    "GITHUB_ACTIONS",
    "GITHUB_REPOSITORY",
)

ENV_PROBE = """#!/usr/bin/env bash
for name in GITHUB_TOKEN GH_TOKEN GITHUB_EVENT_PATH GITHUB_RUN_ID GITHUB_ACTIONS GITHUB_REPOSITORY; do
  if [ -n "${!name:-}" ]; then
    printf '%s=%s\\n' "$name" "${!name}"
  fi
done
"""


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
        self.mock_path = "%s%s%s" % (
            self.mock_bin,
            os.pathsep,
            os.environ.get("PATH", ""),
        )
        self.assertEqual(shutil.which("gh", path=self.mock_path), str(gh))
        probe = subprocess.run(
            ["gh", "interception-probe"],
            cwd=self.tree,
            env={"PATH": self.mock_path, "MOCK_GH_LOG": str(self.log)},
            stdin=subprocess.DEVNULL,
            capture_output=True,
            text=True,
            timeout=60,
        )
        self.assertEqual(probe.returncode, 0, probe.stderr)
        self.assertEqual(self.gh_calls(), [["interception-probe"]])
        self.log.unlink(missing_ok=True)
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
        # Harness isolation (delegation.md section 6): a mock that fails to
        # intercept must fail inert, so the live GitHub context never reaches
        # a scenario that could fall through to the real gh.
        for name in SCRUBBED_ENV:
            env.pop(name, None)
        env["PATH"] = self.mock_path
        # Even a fall-through to a real gh must have no stored auth and must
        # resolve to a host that cannot be reached.
        env["HOME"] = self.tempdir.name
        env["GH_CONFIG_DIR"] = str(Path(self.tempdir.name) / "gh-config")
        env["GH_HOST"] = "github.invalid"
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
                self.assertEqual(
                    self.gh_calls(),
                    [
                        ["secret", "list", "--repo", expected],
                        ["secret", "set", "OPENCODE_API_KEY", "--repo", expected],
                        ["secret", "set", "OPENCODE_PAT", "--repo", expected],
                        ["workflow", "run", "maintainer.yml", "--repo", expected],
                    ],
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
        self.assertEqual(
            self.gh_calls(),
            [
                ["secret", "list", "--repo", "example/random-labs"],
                ["secret", "set", "OPENCODE_API_KEY", "--repo", "example/random-labs"],
                ["secret", "set", "OPENCODE_PAT", "--repo", "example/random-labs"],
                ["workflow", "run", "maintainer.yml", "--repo", "example/random-labs"],
            ],
        )

    def test_malformed_github_repository_warns_and_falls_back(self):
        self.set_origin("https://github.com/owner/repo.git")
        result = self.run_script(
            "setup.sh", "--check", repo_env="../repo"
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("GITHUB_REPOSITORY is not a valid owner/repo slug", result.stdout)
        self.assertEqual(
            self.gh_calls(), [["secret", "list", "--repo", "owner/repo"]]
        )

    def test_unrecognized_remotes_never_target_a_repo(self):
        for remote in UNRECOGNIZED_REMOTES:
            with self.subTest(remote=remote):
                self.set_origin(remote)
                self.log.unlink(missing_ok=True)
                for args in (("--secrets", "--dispatch"), ("--check",)):
                    result = self.run_script("setup.sh", *args)
                    self.assertEqual(
                        result.returncode, 0, result.stdout + result.stderr
                    )
                    self.assertIn(
                        "could not determine the GitHub repo", result.stdout
                    )
                    self.assertEqual(self.gh_calls(), [])

    def test_missing_origin_warns_and_continues(self):
        for args in ((), ("--secrets", "--dispatch"), ("--check",)):
            with self.subTest(args=args):
                self.log.unlink(missing_ok=True)
                result = self.run_script("setup.sh", *args)
                self.assertEqual(
                    result.returncode, 0, result.stdout + result.stderr
                )
                self.assertIn("could not determine the GitHub repo", result.stdout)
                if "--secrets" in args:
                    self.assertIn(
                        "Skipping secrets: the target repo is unresolved",
                        result.stdout,
                    )
                self.assertEqual(self.gh_calls(), [])

    def test_check_mode_reports_a_failing_secret_probe(self):
        self.set_origin("https://github.com/owner/repo.git")
        gh = self.mock_bin / "gh"
        gh.write_text(FAILING_GH, encoding="utf-8")
        gh.chmod(0o755)
        self.assertEqual(shutil.which("gh", path=self.mock_path), str(gh))
        probe = subprocess.run(
            ["gh", "interception-probe"],
            cwd=self.tree,
            env={"PATH": self.mock_path, "MOCK_GH_LOG": str(self.log)},
            stdin=subprocess.DEVNULL,
            capture_output=True,
            text=True,
            timeout=60,
        )
        self.assertEqual(probe.returncode, 1, probe.stdout + probe.stderr)
        self.assertIn("HTTP 404: Not Found", probe.stderr)
        self.log.unlink(missing_ok=True)
        result = self.run_script("setup.sh", "--check")
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn(
            "warning: could not list secrets for owner/repo (check gh auth and repo access).",
            result.stdout,
        )
        self.assertIn("HTTP 404: Not Found", result.stdout)
        self.assertEqual(
            self.gh_calls(), [["secret", "list", "--repo", "owner/repo"]]
        )

    def test_harness_scrubs_the_live_github_context(self):
        probe = self.tree / "env-probe.sh"
        probe.write_text(ENV_PROBE, encoding="utf-8")
        hostile = dict.fromkeys(SCRUBBED_ENV, "canary")
        with mock.patch.dict(os.environ, hostile):
            result = self.run_script("env-probe.sh")
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertEqual(result.stdout, "", result.stdout)


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
                self.assertEqual(
                    self.gh_calls(),
                    [
                        ["secret", "delete", "OPENCODE_API_KEY", "--repo", expected],
                        ["secret", "delete", "OPENCODE_PAT", "--repo", expected],
                    ],
                )

    def test_unrecognized_remotes_never_purge(self):
        for remote in UNRECOGNIZED_REMOTES:
            with self.subTest(remote=remote):
                self.set_origin(remote)
                self.log.unlink(missing_ok=True)
                result = self.run_script("shutdown.sh", "--yes", "--purge")
                self.assertEqual(
                    result.returncode, 0, result.stdout + result.stderr
                )
                self.assertIn("could not determine the GitHub repo", result.stdout)
                self.assertIn("purge will not delete secrets", result.stdout)
                self.assertEqual(self.gh_calls(), [])

    def test_github_repository_override_wins_over_an_unrecognized_origin(self):
        self.set_origin("file:///srv/git/owner/repo.git")
        result = self.run_script(
            "shutdown.sh",
            "--yes",
            "--purge",
            repo_env="example/random-labs",
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertEqual(
            self.gh_calls(),
            [
                ["secret", "delete", "OPENCODE_API_KEY", "--repo", "example/random-labs"],
                ["secret", "delete", "OPENCODE_PAT", "--repo", "example/random-labs"],
            ],
        )

    def test_malformed_github_repository_falls_back_to_the_origin(self):
        self.set_origin("https://github.com/owner/repo.git")
        result = self.run_script(
            "shutdown.sh", "--yes", "--purge", repo_env="../repo"
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("GITHUB_REPOSITORY is not a valid owner/repo slug", result.stdout)
        self.assertEqual(
            self.gh_calls(),
            [
                ["secret", "delete", "OPENCODE_API_KEY", "--repo", "owner/repo"],
                ["secret", "delete", "OPENCODE_PAT", "--repo", "owner/repo"],
            ],
        )

    def test_check_mode_survives_a_missing_origin(self):
        result = self.run_script("shutdown.sh", "--check")
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("could not determine the GitHub repo", result.stdout)
        self.assertNotIn("purge will not delete secrets", result.stdout)
        self.assertEqual(self.gh_calls(), [])


class DocumentationTruthTest(unittest.TestCase):
    def test_site_quickstart_names_both_secrets_and_dispatch(self):
        text = read(DOCS_HTML)
        quickstart = text.split("bash setup.sh", 1)[0].splitlines()[-1]
        self.assertIn("write the required secrets", quickstart)
        self.assertIn("dispatch the Maintainer once", quickstart)
        command = text.split("bash setup.sh", 1)[1].splitlines()[0]
        self.assertEqual(set(command.split()), FIRST_RUN_FLAGS)
        self.assertIn("The Actions tab can dispatch only", text)

    def test_agents_summary_describes_the_real_bare_mode(self):
        text = " ".join(
            read(AGENTS).split("## Logging & runbooks", 1)[1].split()
        )
        self.assertIn("checks status and prints guided prompts", text)
        self.assertIn("`--secrets` writes the required repo secrets", text)
        self.assertIn("`--dispatch` dispatches the Maintainer once", text)
        self.assertIn("`--check` alone is read-only", text)
        self.assertIn("once the lab file checks pass", text)
        self.assertNotIn("validate/setup/secrets/dispatch", text)

    def test_lab_first_run_and_setup_claims_are_accurate(self):
        running = " ".join(read(LAB).split("## Running the lab", 1)[1].split())
        self.assertIn("write the required repo secrets", running)
        self.assertIn("`bash setup.sh --secrets --dispatch`", running)
        self.assertIn("dispatch-only alternative", running)
        self.assertIn("never writes secrets", running)
        self.assertNotIn("creates/verifies everything", running)

    def test_readme_and_docs_markdown_label_the_actions_route_dispatch_only(self):
        for path, anchor in (
            (README, "**First run:**"),
            (DOCS_MD, "**First run**:"),
        ):
            with self.subTest(path=path.name):
                rest = read(path).split(anchor, 1)[1]
                block = " ".join(
                    rest.split("\n- ", 1)[0].split("\n\n", 1)[0].split()
                )
                self.assertIn("write the required repo secrets", block)
                self.assertIn("bash setup.sh --secrets --dispatch", block)
                self.assertIn("dispatch-only", block)


class HygieneTest(unittest.TestCase):
    def test_changed_files_have_no_em_dashes(self):
        paths = [
            SETUP,
            SHUTDOWN,
            DOCS_HTML,
            DOCS_MD,
            AGENTS,
            LAB,
            README,
            Path(__file__).resolve(),
        ]
        decisions = ROOT / ".github" / "agents" / "decisions" / "lab-engineer"
        paths.extend(sorted(decisions.glob("*799-*.md")))
        for path in paths:
            with self.subTest(path=path.name):
                self.assertNotIn("\u2014", read(path))


if __name__ == "__main__":
    unittest.main()
