"""Regression tests for PR #740 (Fixes #739): README on-demand trigger roster.

Verifies against the shipped public README and the live trigger wiring:
- the three restored on-demand triggers appear exactly once in the roster
- the roster covers every /oc trigger registered in REGISTRY.md
- each restored trigger is matched by its own workflow's comment filter
- the roster has no duplicate tokens and the README has no em dashes

Stdlib only, no extra runtime dependencies.
Run: python3 tests/landing/test_pr740_readme_trigger_roster.py
"""
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
README = ROOT / "README.md"
REGISTRY = ROOT / ".github" / "agents" / "REGISTRY.md"
WORKFLOW_FILTERS = {
    "/oc ideate": ROOT / ".github" / "workflows" / "ideate.yml",
    "/oc eval": ROOT / ".github" / "workflows" / "opencode-eval.yml",
    "/oc auditor": ROOT / ".github" / "workflows" / "auditor.yml",
}
ROSTER_ANCHOR = "Talk to it on any issue/PR with "


def read(path):
    return path.read_text(encoding="utf-8")


def roster_tokens():
    block = read(README).split(ROSTER_ANCHOR, 1)[1].split("\n\n", 1)[0]
    tokens = [token.strip() for token in re.findall(r"`(/oc [^`]+)`", block)]
    return [
        token[:-4].strip() if token.endswith(" ...") else token
        for token in tokens
    ]


def registry_tokens():
    return set(re.findall(r"`(/oc [a-z|-]+)`", read(REGISTRY)))


class ReadmeTriggerRosterTest(unittest.TestCase):
    def test_restored_on_demand_triggers_are_listed(self):
        tokens = roster_tokens()
        for trigger in WORKFLOW_FILTERS:
            self.assertEqual(
                tokens.count(trigger),
                1,
                f"{trigger} must appear exactly once in the README roster",
            )

    def test_roster_covers_every_registered_trigger(self):
        missing = sorted(registry_tokens() - set(roster_tokens()))
        self.assertEqual(missing, [], f"registered triggers missing from README: {missing}")

    def test_restored_triggers_are_live_in_their_workflow_filters(self):
        for trigger, path in WORKFLOW_FILTERS.items():
            needle = "startsWith(github.event.comment.body, '%s')" % trigger
            self.assertIn(
                needle,
                read(path),
                f"{path.name} does not accept the {trigger} trigger",
            )

    def test_roster_has_no_duplicate_tokens(self):
        tokens = roster_tokens()
        self.assertEqual(len(tokens), len(set(tokens)))

    def test_readme_has_no_em_dashes(self):
        self.assertNotIn("\u2014", read(README))


if __name__ == "__main__":
    unittest.main()
