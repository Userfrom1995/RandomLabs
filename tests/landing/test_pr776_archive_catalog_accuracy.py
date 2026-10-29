"""Regression tests for PR #776 (Fixes #776): archived codec summaries and website rule.

Verifies against the shipped documentation:
- archive/README.md has exactly one catalog row per archive directory, every
  directory link resolves to a project directory with a README, and no
  duplicate targets
- the Obsidian row describes the shipped design (20 predictors, CMARC, GR
  fallback) and does not present the off-by-default MA-tree-lite seam as shipped
- the Prism row matches the project's own design statement (Squeeze, MA-tree,
  context-modeled entropy)
- CONTRIBUTING scopes the website rule to current (non-archived) projects,
  exempts archive/, and names both landing pages
- every current project listed in the root README ships an index.html
- the changed docs contain no em dashes

Stdlib only, no extra runtime dependencies.
Run: python3 tests/landing/test_pr776_archive_catalog_accuracy.py
"""
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ARCHIVE = ROOT / "archive"
ARCHIVE_README = ARCHIVE / "README.md"
CONTRIBUTING = ROOT / "CONTRIBUTING.md"
README = ROOT / "README.md"

ROW_RE = re.compile(
    r"^\| \*\*(?P<name>[^*]+)\*\* \|.*\| \[[^\]]+\]\((?P<target>[^)]+)\)\s*\|$"
)
CURRENT_PROJECT_RE = re.compile(r"\(`(?P<dir>[a-z0-9-]+)/`\)")


def read(path):
    return path.read_text(encoding="utf-8")


def catalog_rows():
    rows = []
    for line in read(ARCHIVE_README).splitlines():
        match = ROW_RE.match(line)
        if match:
            rows.append(
                (match.group("name").strip(), match.group("target").rstrip("/"))
            )
    return rows


def current_projects():
    text = read(README)
    current = text.split("## Active Projects", 1)[1].split("## Archived Projects", 1)[0]
    return sorted(set(CURRENT_PROJECT_RE.findall(current)))


def landing_project_links():
    text = read(ROOT / "index.html")
    return sorted(
        set(
            re.findall(
                r"https://userfrom1995\.github\.io/RandomLabs/([a-z0-9-]+)/",
                text,
            )
        )
    )


class ArchiveCatalogTest(unittest.TestCase):
    def test_catalog_covers_every_archive_directory_once(self):
        rows = catalog_rows()
        names = [name for name, _ in rows]
        targets = [target for _, target in rows]
        directories = {path.name for path in ARCHIVE.iterdir() if path.is_dir()}
        self.assertEqual(len(names), len(set(names)), "duplicate archive project names")
        self.assertEqual(len(targets), len(set(targets)), "duplicate archive targets")
        self.assertEqual(set(targets), directories)
        self.assertEqual(len(rows), len(directories), "one catalog row per archive directory")

    def test_every_catalog_link_resolves_to_a_readme(self):
        for name, target in catalog_rows():
            with self.subTest(project=name):
                project = ARCHIVE / target
                self.assertTrue(project.is_dir(), f"{target} is not a directory")
                self.assertTrue(
                    (project / "README.md").is_file(), f"{target}/README.md missing"
                )

    def test_obsidian_row_describes_the_shipped_design(self):
        row_line = next(
            line
            for line in read(ARCHIVE_README).splitlines()
            if line.startswith("| **Obsidian**")
        )
        self.assertRegex(row_line, r"20[- ]predictor", "20-predictor bank missing")
        self.assertIn("CMARC", row_line)
        self.assertRegex(
            row_line,
            r"(?i)Golomb-Rice as (the )?fallback",
            "Golomb-Rice must be named as the fallback",
        )
        self.assertNotIn("8-predictor", row_line)
        if "MA-tree" in row_line:
            self.assertRegex(
                row_line,
                r"(?i)(optional|off by default|experimental|gated)",
                "MA-tree may only appear as an optional/off seam",
            )

    def test_prism_row_matches_the_project_design_statement(self):
        row_line = next(
            line
            for line in read(ARCHIVE_README).splitlines()
            if line.startswith("| **Prism**")
        )
        for needle in ("Squeeze", "JPEG XL CDC", "MA-tree", "context-modeled entropy"):
            self.assertIn(needle, row_line)
        prism_readme = read(ARCHIVE / "prism" / "README.md")
        self.assertIn("coupling", prism_readme.lower())
        self.assertIn("MA-tree", prism_readme)
        self.assertIn("Squeeze", prism_readme)


class ContributingWebsiteRuleTest(unittest.TestCase):
    def test_website_rule_is_scoped_to_current_projects(self):
        text = read(CONTRIBUTING)
        rule_lines = [line for line in text.splitlines() if "ships a website" in line]
        self.assertTrue(rule_lines, "CONTRIBUTING: website rule missing")
        rule = "\n".join(rule_lines)
        self.assertIn("Every current project ships a website", rule)
        self.assertIn("non-archived", rule)
        self.assertIn("archive/", rule)
        self.assertIn("exempt", rule)
        self.assertNotIn("**Every project ships a website.**", text)

    def test_both_landing_pages_are_named(self):
        text = read(CONTRIBUTING)
        self.assertIn("`/index.html`", text)
        self.assertIn("`/docs/index.html`", text)

    def test_every_current_project_ships_an_index(self):
        projects = current_projects()
        self.assertTrue(projects, "no current projects parsed from README.md")
        self.assertEqual(
            set(projects),
            set(landing_project_links()),
            "README current projects and landing-page website links disagree",
        )
        for project in projects:
            with self.subTest(project=project):
                self.assertTrue(
                    (ROOT / project / "index.html").is_file(),
                    f"{project}/index.html missing",
                )


class HygieneTest(unittest.TestCase):
    def test_changed_docs_have_no_em_dashes(self):
        for path in (CONTRIBUTING, ARCHIVE_README):
            with self.subTest(path=path.name):
                self.assertNotIn("\u2014", read(path))


if __name__ == "__main__":
    unittest.main()
