"""Regression tests for issue #825 (fixed by PR #833): archived README links.

Verifies against the shipped documentation:
- every relative markdown link and image target in archive/*/README.md resolves
- no archived README keeps a retired https://userfrom1995.github.io/Random/ URL
  (the archive is not deployed by pages.yml, so those hosted links 404)
- the repaired docs/ and ideas/ links in the arpeggio, automatarium, and
  homunculus READMEs point at the repository-root directories
- the granite and orrery LICENSE links point at the repository-root LICENSE
- the orrery and rush run, open, and test paths name files that actually exist
  after the archive move

Stdlib only, no extra runtime dependencies.
Run: python3 tests/landing/test_pr833_archive_readme_links.py
"""
import re
import unittest
from pathlib import Path
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parents[2]
ARCHIVE = ROOT / "archive"
README_GLOB = "*/README.md"
RETIRED_HOST = "userfrom1995.github.io/Random/"

INLINE_LINK_RE = re.compile(r"!?\[[^\]]*\]\(\s*(<[^>]+>|[^)\s]+)(?:\s+[^)]*)?\)")
EXTERNAL_PREFIXES = ("http://", "https://", "mailto:", "tel:", "data:")

FIXED_LINKS = {
    "arpeggio": (
        "../../docs/",
        "../../ideas/2026-08-08-arpeggio-markov-melody-composer.md",
    ),
    "automatarium": (
        "../../docs/",
        "../../ideas/2026-08-08-automatarium-cellular-automata.md",
    ),
    "homunculus": (
        "../../docs/",
        "../../ideas/2026-08-08-homunculus-genetic-algorithm.md",
    ),
    "granite": ("../../LICENSE",),
    "orrery": ("../../LICENSE",),
}

COMMAND_PATHS = {
    "orrery": ("archive/orrery", "archive/orrery/index.html"),
    "rush": (
        "archive/rush/index.html",
        "archive/rush/logic.js",
        "archive/rush/logic.test.js",
    ),
}

OLD_ORRERY_PATH_RE = re.compile(r"^cd orrery$", re.MULTILINE)
OLD_ORRERY_OPEN_RE = re.compile(r"(?<!archive/)orrery/index\.html")
OLD_RUSH_PATH_RE = re.compile(r"(?<!archive/)rush/logic(?:\.test)?\.js")


def read(path):
    return path.read_text(encoding="utf-8")


def archive_readmes():
    return sorted(ARCHIVE.glob(README_GLOB))


def relative_targets(text):
    for match in INLINE_LINK_RE.finditer(text):
        target = match.group(1).strip()
        if target.startswith("<") and target.endswith(">"):
            target = target[1:-1].strip()
        if not target or target.startswith(EXTERNAL_PREFIXES):
            continue
        path_part = unquote(target.split("#", 1)[0])
        if not path_part:
            continue
        yield target, path_part


class ArchivedReadmeLinksTest(unittest.TestCase):
    def test_every_relative_link_resolves(self):
        readmes = archive_readmes()
        self.assertTrue(readmes, "no archive README files found")
        missing = []
        for readme in readmes:
            for target, path_part in relative_targets(read(readme)):
                if path_part.startswith("/"):
                    resolved = ROOT / path_part.lstrip("/")
                else:
                    resolved = (readme.parent / path_part).resolve()
                if not resolved.exists():
                    missing.append(f"{readme.relative_to(ROOT)}: {target}")
        self.assertEqual(missing, [], f"missing relative targets: {missing}")

    def test_no_retired_hosted_urls_remain(self):
        offenders = [
            str(readme.relative_to(ROOT))
            for readme in archive_readmes()
            if RETIRED_HOST in read(readme)
        ]
        self.assertEqual(offenders, [], f"retired hosted URLs in {offenders}")

    def test_repaired_further_reading_links_are_root_relative(self):
        for project, targets in FIXED_LINKS.items():
            readme = ARCHIVE / project / "README.md"
            text = read(readme)
            for target in targets:
                with self.subTest(project=project, target=target):
                    self.assertIn(
                        f"]({target})",
                        text,
                        f"{project}/README.md must link {target}",
                    )
                    path = target.split("#", 1)[0]
                    self.assertTrue(
                        (readme.parent / path).resolve().exists(),
                        f"{target} does not resolve from {project}/README.md",
                    )

    def test_orrery_points_at_the_archived_layout(self):
        readme = ARCHIVE / "orrery" / "README.md"
        text = read(readme)
        for path in COMMAND_PATHS["orrery"]:
            with self.subTest(path=path):
                self.assertIn(path, text)
                self.assertTrue(
                    (ROOT / path).exists(), f"{path} is missing from the tree"
                )
        self.assertNotRegex(text, OLD_ORRERY_PATH_RE, "stale `cd orrery` remains")
        self.assertNotRegex(
            text, OLD_ORRERY_OPEN_RE, "stale `orrery/index.html` path remains"
        )
        self.assertNotIn(
            "userfrom1995.github.io/Random/orrery/",
            text,
            "the retired hosted orrery URL must not return",
        )

    def test_rush_points_at_the_archived_layout(self):
        readme = ARCHIVE / "rush" / "README.md"
        text = read(readme)
        for path in COMMAND_PATHS["rush"]:
            with self.subTest(path=path):
                self.assertIn(path, text)
                self.assertTrue(
                    (ROOT / path).is_file(), f"{path} is missing from the tree"
                )
        self.assertIn("node --test archive/rush/logic.test.js", text)
        self.assertIn("'/archive/rush/index.html?debug='", text)
        self.assertNotRegex(text, OLD_RUSH_PATH_RE, "stale `rush/logic*` path remains")
        self.assertNotIn(
            "file://' + process.cwd() + '/rush/index.html",
            text,
            "the Playwright smoke test must use the archived path",
        )
        self.assertNotIn(
            "userfrom1995.github.io/Random/rush/",
            text,
            "the retired hosted rush URL must not return",
        )


if __name__ == "__main__":
    unittest.main()
