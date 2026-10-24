"""Regression tests for PR #757 (Fixes #756): README lists the live /oc plan alias.

Verifies against the shipped public README and the live workflow wiring:
- /oc plan and /oc architect both appear exactly once in the README roster
- the architect job accepts both trigger aliases
- every positive /oc trigger wired in .github/workflows is listed in the roster
- retired /oc approve and /oc decline aliases stay out of the roster

Stdlib only, no extra runtime dependencies.
Run: python3 tests/landing/test_pr757_readme_plan_alias.py
"""
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
README = ROOT / "README.md"
WORKFLOWS = ROOT / ".github" / "workflows"
OPENCODE_WORKFLOW = WORKFLOWS / "opencode.yml"
ROSTER_ANCHOR = "Talk to it on any issue/PR with "
LIVE_TRIGGER_PATTERN = re.compile(
    r"(?<!!)startsWith\(github\.event\.comment\.body, '(/oc[^']*)'\)"
)
ARCHITECT_JOB_PATTERN = re.compile(
    r"\n  architect:\n(.*?)(?=\n  [a-z][a-z0-9-]*:\n)", re.DOTALL
)


def read(path):
    return path.read_text(encoding="utf-8")


def roster_tokens():
    block = read(README).split(ROSTER_ANCHOR, 1)[1].split("\n\n", 1)[0]
    tokens = [token.strip() for token in re.findall(r"`(/oc [^`]+)`", block)]
    return [token[:-4].strip() if token.endswith(" ...") else token for token in tokens]


def live_public_triggers():
    triggers = set()
    for path in sorted(WORKFLOWS.glob("*.yml")):
        for match in LIVE_TRIGGER_PATTERN.finditer(read(path)):
            trigger = match.group(1)
            if trigger != "/oc":
                triggers.add(trigger)
    return triggers


class ReadmePlanAliasTest(unittest.TestCase):
    def test_plan_alias_is_listed_beside_architect(self):
        tokens = roster_tokens()
        self.assertEqual(tokens.count("/oc architect"), 1)
        self.assertEqual(tokens.count("/oc plan"), 1)
        self.assertEqual(tokens.index("/oc plan"), tokens.index("/oc architect") + 1)

    def test_architect_job_accepts_both_aliases(self):
        match = ARCHITECT_JOB_PATTERN.search(read(OPENCODE_WORKFLOW))
        self.assertIsNotNone(match, "architect job not found in opencode.yml")
        block = match.group(1)
        self.assertIn("startsWith(github.event.comment.body, '/oc architect')", block)
        self.assertIn("startsWith(github.event.comment.body, '/oc plan')", block)
        self.assertIn('triggered by "/oc architect" or "/oc plan"', block)

    def test_roster_covers_every_live_public_trigger(self):
        missing = sorted(live_public_triggers() - set(roster_tokens()))
        self.assertEqual(missing, [], f"live triggers missing from README: {missing}")

    def test_retired_approval_aliases_stay_out_of_roster(self):
        tokens = set(roster_tokens())
        self.assertNotIn("/oc approve", tokens)
        self.assertNotIn("/oc decline", tokens)
        self.assertNotIn("/oc approve", live_public_triggers())
        self.assertNotIn("/oc decline", live_public_triggers())


if __name__ == "__main__":
    unittest.main()
