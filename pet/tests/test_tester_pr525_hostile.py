"""Tester-authored hostile regression suite for PR #525 (Refs #515).

Covers the deb-smoke SIGPIPE repair from the hostile side: the smoke
script must fail closed (nonzero exit) on unknown flags and missing
payloads, must never pipe a streaming tar listing into grep -q, and
the capture-then-match shape must pass on a present payload while
missing honestly on an absent one.
"""

import os
import subprocess
import tempfile
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPO = os.path.dirname(ROOT)
SMOKE = os.path.join(ROOT, "packaging", "smoke-linux.sh")


def _run_smoke(*args, timeout=180):
    return subprocess.run(
        ["bash", SMOKE] + list(args),
        capture_output=True, text=True, timeout=timeout, cwd=REPO)


class TestTesterPr525Hostile(unittest.TestCase):
    def test_unknown_flag_fails_closed(self):
        proc = _run_smoke("--bogus-flag")
        self.assertNotEqual(proc.returncode, 0)
        self.assertIn("unknown flag",
                      (proc.stdout + proc.stderr).lower())

    def test_missing_deb_fails_closed(self):
        proc = _run_smoke(
            "--deb", "/nonexistent/desktop-pet_9.9.9_amd64.deb")
        self.assertNotEqual(proc.returncode, 0)
        self.assertIn("missing",
                      (proc.stdout + proc.stderr).lower())

    def test_no_streaming_tar_into_grep(self):
        with open(SMOKE, encoding="utf-8") as fh:
            text = fh.read()
        self.assertNotIn("tar -t | grep", text)
        self.assertNotIn("tar -tf ", text.replace(
            "tar -tf %s", ""))

    def test_capture_then_match_live(self):
        with tempfile.TemporaryDirectory() as tmp:
            pkg = os.path.join(tmp, "pkg")
            os.makedirs(os.path.join(pkg, "usr", "bin"))
            with open(os.path.join(pkg, "usr", "bin",
                                   "desktop-pet"), "w") as fh:
                fh.write("binary")
            for i in range(500):
                with open(os.path.join(pkg, "f-%04d.txt" % i),
                          "w") as fh:
                    fh.write("doc %d" % i)
            archive = os.path.join(tmp, "data.tar")
            proc = subprocess.run(
                ["tar", "-cf", archive, "-C", pkg, "."],
                capture_output=True, text=True, timeout=60)
            self.assertEqual(proc.returncode, 0, proc.stderr[-500:])
            hit = ('set -o pipefail; LIST="$(tar -tf %s)"; '
                   '[[ "$LIST" == *"usr/bin/desktop-pet"* ]]' % archive)
            proc = subprocess.run(["bash", "-c", hit],
                                  capture_output=True, text=True,
                                  timeout=60)
            self.assertEqual(proc.returncode, 0, proc.stderr[-500:])
            miss = ('set -o pipefail; LIST="$(tar -tf %s)"; '
                    '[[ "$LIST" == *"usr/bin/no-such-binary"* ]]'
                    % archive)
            proc = subprocess.run(["bash", "-c", miss],
                                  capture_output=True, text=True,
                                  timeout=60)
            self.assertNotEqual(proc.returncode, 0)


if __name__ == "__main__":
    unittest.main()
