"""Regression tests for issue #846 (fixed by PR #847): throttled cadence wording.

Verifies against the shipped public documentation and the shipped schedule:
- the CONTRIBUTING.md idea-intake step carries the same cadence sentence as
  README.md, so the public contribution path no longer presents 20 minutes as
  the effective cadence
- every public cadence surface (README roster, README intake, CONTRIBUTING
  intake, docs/index.md, docs/index.html) declares the 20-minute schedule and
  the platform throttle in the same statement
- no stale "recurring 20-minute heartbeat sweep" phrasing survives on a public
  surface
- maintainer.yml really declares the 20-minute cron the docs describe
- the changed document carries zero em dashes (lab formatting invariant)

Stdlib only, no extra runtime dependencies.
Run: python3 tests/landing/test_pr847_contributing_cadence_parity.py
"""
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
README = ROOT / "README.md"
CONTRIBUTING = ROOT / "CONTRIBUTING.md"
DOCS_MD = ROOT / "docs" / "index.md"
DOCS_HTML = ROOT / "docs" / "index.html"
MAINTAINER = ROOT / ".github" / "workflows" / "maintainer.yml"

DECLARED_RE = re.compile(r"declared(?:\s+every)?\s+20[- ]minutes?", re.IGNORECASE)
THROTTLE_RE = re.compile(r"platform[-\s]+throttl(?:ed|e)", re.IGNORECASE)
STALE_PHRASE = "recurring 20-minute heartbeat sweep"
INTAKE_HEADINGS = {
    README: "## How to Contribute an Idea",
    CONTRIBUTING: "## Proposing an Idea",
}
CADENCE_ANCHORS = {
    README: ["Maintainer (Hephaestus)", "## How to Contribute an Idea"],
    CONTRIBUTING: ["## Proposing an Idea"],
    DOCS_MD: ["The Maintainer (Hephaestus)"],
    DOCS_HTML: ["<h4>Maintainer (Hephaestus)</h4>"],
}


def read(path):
    return path.read_text(encoding="utf-8")


def normalize(text):
    return " ".join(text.split())


def intake_item(path):
    text = read(path)
    section = text.split(INTAKE_HEADINGS[path], 1)[1]
    for line in section.splitlines():
        if line.startswith("2. "):
            return normalize(line[len("2. "):]).replace("**", "")
    raise AssertionError("no intake step 2 in %s" % path)


def cadence_snippet(text, anchor):
    start = text.index(anchor)
    return normalize(text[start:start + 600])


class ContributingCadenceParityTest(unittest.TestCase):
    def test_contributing_intake_matches_readme_intake(self):
        self.assertEqual(
            intake_item(CONTRIBUTING),
            intake_item(README),
            "CONTRIBUTING intake step 2 has drifted from the README wording",
        )

    def test_public_cadence_surfaces_declare_the_throttle(self):
        for path, anchors in CADENCE_ANCHORS.items():
            for anchor in anchors:
                with self.subTest(path=str(path), anchor=anchor):
                    snippet = cadence_snippet(read(path), anchor)
                    self.assertRegex(
                        snippet,
                        DECLARED_RE,
                        "missing the declared 20-minute schedule",
                    )
                    self.assertRegex(
                        snippet,
                        THROTTLE_RE,
                        "missing the platform throttle qualifier",
                    )

    def test_no_stale_effective_20_minute_phrasing(self):
        for path in (README, CONTRIBUTING, DOCS_MD, DOCS_HTML):
            with self.subTest(path=str(path)):
                self.assertNotIn(
                    STALE_PHRASE,
                    normalize(read(path)),
                    "stale wording presents 20 minutes as the effective cadence",
                )

    def test_shipped_schedule_matches_the_declared_20_minutes(self):
        crons = re.findall(r'cron:\s*"([^"]+)"', read(MAINTAINER))
        self.assertIn(
            "*/20 * * * *",
            crons,
            "maintainer.yml no longer declares the 20-minute schedule",
        )

    def test_changed_document_has_no_em_dashes(self):
        self.assertNotIn("\u2014", read(CONTRIBUTING))


if __name__ == "__main__":
    unittest.main()
