"""Regression tests for issue #861 (fixed by PR #862): public copy accuracy.

Verifies against the shipped sources:
- the Netpulse footer qualifies its privacy claim because the shipped upload
  probe really POSTs a generated payload to a user-configured echo endpoint
- the Netpulse page still ships the upload panel and the empty-endpoint
  fail-closed path that the qualified sentence promises
- the Maze Chase static theme label matches the Rust theme roster and the
  runtime label composition (three themes, Dusk Pond default at 1/3)
- neither changed page keeps the retired "Theme 1/1" label
- every local href/src on both changed pages resolves on disk
- the changed pages contain zero em dashes (lab formatting invariant)

Stdlib only, no extra runtime dependencies.
Run: python3 tests/landing/test_pr862_public_copy_accuracy.py
"""
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
NETPULSE_HTML = ROOT / "netpulse" / "index.html"
NETPULSE_APP = ROOT / "netpulse" / "js" / "app.js"
NETPULSE_PROBES = ROOT / "netpulse" / "js" / "probes.js"
NETPULSE_DOCS = ROOT / "netpulse" / "docs" / "index.md"
MAZE_HTML = ROOT / "maze-chase" / "index.html"
MAZE_JS = ROOT / "maze-chase" / "web" / "maze-chase.js"
MAZE_E2E = ROOT / "maze-chase" / "web" / "e2e" / "browser-e2e.js"
THEMES_RS = ROOT / "maze-chase" / "crates" / "assets" / "src" / "themes.rs"
SETTINGS_RS = ROOT / "maze-chase" / "crates" / "config" / "src" / "settings.rs"

QUALIFIED_CLAIM = "Nothing is uploaded unless you run the upload probe."
PAGES = (NETPULSE_HTML, MAZE_HTML)
LOCAL_TARGET_RE = re.compile(
    r'(?:href|src)\s*=\s*"([^"]+)"', re.IGNORECASE)
EXTERNAL_PREFIXES = ("http://", "https://", "mailto:", "tel:", "data:", "javascript:")


def read(path):
    return path.read_text(encoding="utf-8")


def footer_text(html):
    match = re.search(r"<footer[^>]*>(.*?)</footer>", html, re.DOTALL)
    if not match:
        raise AssertionError("no footer element in netpulse/index.html")
    return " ".join(match.group(1).split())


def theme_roster():
    text = read(THEMES_RS)
    block_re = re.compile(
        r"pub const ([A-Z_]+): Theme = Theme \{(.*?)\n\};", re.DOTALL)
    themes = {}
    for match in block_re.finditer(text):
        body = match.group(2)
        theme_id = re.search(r'id:\s*"([^"]+)"', body)
        name = re.search(r'name:\s*"([^"]+)"', body)
        if theme_id and name:
            themes[match.group(1)] = (theme_id.group(1), name.group(1))
    order_match = re.search(
        r"pub fn all\(\)[^{]*\{\s*\[([^\]]+)\]", text, re.DOTALL)
    if not order_match:
        raise AssertionError("no themes::all() order in themes.rs")
    order = [ref.strip().lstrip("&") for ref in order_match.group(1).split(",") if ref.strip()]
    return [themes[name] for name in order]


def default_theme_id():
    text = read(SETTINGS_RS)
    section = text.split("pub fn for_difficulty", 1)
    if len(section) != 2:
        raise AssertionError("no for_difficulty in settings.rs")
    match = re.search(r'theme:\s*"([^"]+)"', section[1])
    if not match:
        raise AssertionError("no default theme id in for_difficulty")
    return match.group(1)


def static_theme_label():
    match = re.search(
        r'<span id="theme-label">([^<]+)</span>', read(MAZE_HTML))
    if not match:
        raise AssertionError("no theme-label span in maze-chase/index.html")
    return match.group(1).strip()


def local_targets(html_path):
    text = read(html_path)
    for raw in LOCAL_TARGET_RE.findall(text):
        target = raw.strip()
        if not target or target.startswith(EXTERNAL_PREFIXES):
            continue
        target = target.split("#", 1)[0].split("?", 1)[0]
        if not target:
            continue
        resolved = (html_path.parent / target).resolve()
        if target.endswith("/"):
            resolved = resolved / "index.html"
        yield raw, resolved


class NetpulseUploadClaimTest(unittest.TestCase):
    def test_footer_qualifies_the_upload_claim(self):
        footer = footer_text(read(NETPULSE_HTML))
        self.assertIn(QUALIFIED_CLAIM, footer)
        self.assertIsNone(
            re.search(r"Nothing is uploaded\.", footer),
            "footer still carries the absolute upload claim",
        )

    def test_shipped_upload_probe_posts_generated_payload(self):
        probes = read(NETPULSE_PROBES)
        self.assertIn('method: "POST"', probes)
        self.assertIn("body: payload", probes)
        self.assertIn("RANDOM_CHUNK_BYTES", probes)
        self.assertIn("crypto.getRandomValues(", probes)
        self.assertIn("payload.subarray(", probes)
        self.assertIn("runUpload", probes)
        app = read(NETPULSE_APP)
        self.assertIn('document.getElementById("btn-upload")', app)
        self.assertIn("P.runUpload(endpoint, size, 3", app)

    def test_empty_endpoint_fails_closed(self):
        app = read(NETPULSE_APP)
        self.assertIn("No echo endpoint configured", app)
        self.assertIn("Netpulse sends nothing until you do.", app)
        docs = read(NETPULSE_DOCS)
        self.assertIn("16/64/256 KB", docs)


class MazeChaseThemeLabelTest(unittest.TestCase):
    def test_static_label_matches_rust_roster(self):
        roster = theme_roster()
        self.assertEqual(len(roster), 3, "theme roster is no longer three themes")
        first_id, first_name = roster[0]
        self.assertEqual(default_theme_id(), first_id,
                         "default theme id has drifted from the first roster entry")
        self.assertEqual(static_theme_label(), "%s (1/%d)" % (first_name, len(roster)))

    def test_runtime_label_composes_the_same_value(self):
        js = read(MAZE_JS)
        self.assertIn(
            "themeName() + ' (' + (th + 1) + '/' + thc + ')'", js,
            "runtime label composition changed; re-sync the static label")
        self.assertIn("'%s'" % static_theme_label(), read(MAZE_E2E),
                      "shipped E2E no longer asserts the static label")

    def test_retired_label_is_gone(self):
        self.assertNotIn("Theme 1/1", read(MAZE_HTML))


class ChangedPageHygieneTest(unittest.TestCase):
    def test_local_targets_resolve(self):
        for page in PAGES:
            for raw, resolved in local_targets(page):
                with self.subTest(page=str(page), target=raw):
                    self.assertTrue(resolved.is_file(),
                                    "%s -> %s does not exist" % (raw, resolved))

    def test_no_em_dashes(self):
        for page in PAGES:
            with self.subTest(page=str(page)):
                self.assertNotIn("\u2014", read(page))


if __name__ == "__main__":
    unittest.main()
