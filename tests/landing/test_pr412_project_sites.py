"""Regression tests for PR #412 (Fixes #411): the tor-cli and Prism project sites.

Verifies against the shipped artifact (both pages served over HTTP):
- both project pages exist, parse clean, and have zero duplicate ids
- every in-page anchor resolves and every relative link target exists
- every copy button's data-copy payload byte-matches its visible block
- zero em dashes and zero placeholder markers in all PR-touched files
- landing page and README point every completed project at its own site
- CONTRIBUTING.md codifies the every-project-ships-an-index.html rule
- bench_vs_codecs.py imports compare_image_codecs from archive/obsidian
- no external scripts/images (offline-safe pages), a11y table regions present

Stdlib only (html.parser + urllib), no extra runtime dependencies.
Run: python3 tests/landing/test_pr412_project_sites.py
"""
import functools
import http.server
import re
import threading
import unittest
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlparse
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[2]
PAGES = {
    "tor-cli": ROOT / "tor-cli" / "index.html",
    "prism": ROOT / "prism" / "index.html",
}
TOUCHED = [
    ROOT / "CONTRIBUTING.md",
    ROOT / "README.md",
    ROOT / "index.html",
    ROOT / "prism" / "benchmarks" / "bench_vs_codecs.py",
    ROOT / "prism" / "index.html",
    ROOT / "tor-cli" / "index.html",
]


class _StrictParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.errors = []
        self.ids = []
        self.anchors = []       # href="#..."
        self.rel_targets = []   # relative href/src values
        self.external = []      # absolute http(s) href/src values
        self.copy_blocks = []   # (data-copy, visible pre text) per codeblock
        self._block = None      # {"copy": str|None, "pre": list|None, "in_pre": bool}
        self._codeblock_depth = 0
        self._tags = []

    def error(self, message):  # pragma: no cover - html.parser legacy hook
        self.errors.append(message)

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if a.get("id"):
            self.ids.append(a["id"])
        href = a.get("href") or a.get("src")
        if href is not None:
            if href.startswith("#"):
                self.anchors.append(href)
            elif href.startswith(("http://", "https://")):
                self.external.append(href)
            elif not href.startswith(("data:", "mailto:", "javascript:")):
                self.rel_targets.append(href)
        classes = (a.get("class") or "").split()
        if tag == "div" and "codeblock" in classes:
            if self._block is None:
                self._block = {"copy": None, "pre": None, "in_pre": False}
                self._codeblock_depth = 1
            else:
                self._codeblock_depth += 1
        elif self._block is not None:
            if tag == "div":
                self._codeblock_depth += 1
            if tag == "button" and a.get("data-copy") is not None:
                self._block["copy"] = a["data-copy"]
            if tag == "pre" and self._block["pre"] is None:
                self._block["pre"] = []
                self._block["in_pre"] = True

    def handle_endtag(self, tag):
        if self._block is not None:
            if tag == "pre":
                self._block["in_pre"] = False
            if tag == "div":
                self._codeblock_depth -= 1
                if self._codeblock_depth == 0:
                    blk = self._block
                    if blk["copy"] is not None and blk["pre"] is not None:
                        self.copy_blocks.append(
                            (blk["copy"], "".join(blk["pre"]))
                        )
                    self._block = None

    def handle_data(self, data):
        if self._block is not None and self._block["in_pre"] and self._block["pre"] is not None:
            self._block["pre"].append(data)


def parse(path):
    p = _StrictParser()
    p.feed(path.read_text(encoding="utf-8"))
    p.close()
    return p


class PageIntegrity(unittest.TestCase):
    def test_pages_exist_and_parse_clean(self):
        for name, path in PAGES.items():
            self.assertTrue(path.is_file(), f"{name} page missing: {path}")
            src = path.read_text(encoding="utf-8")
            p = parse(path)
            self.assertEqual(p.errors, [], f"{name}: parser errors")
            self.assertNotIn("\u2014", src, f"{name}: em dash present")
            for bad in ("TODO", "FIXME", "lorem ipsum", "coming soon", "PLACEHOLDER"):
                self.assertNotIn(bad, src, f"{name}: placeholder marker {bad!r}")

    def test_no_duplicate_ids_and_anchors_resolve(self):
        for name, path in PAGES.items():
            p = parse(path)
            dupes = {i for i in p.ids if p.ids.count(i) > 1}
            self.assertEqual(dupes, set(), f"{name}: duplicate ids {dupes}")
            for anchor in p.anchors:
                target = anchor[1:]
                self.assertIn(
                    target, p.ids, f"{name}: anchor {anchor} has no target id"
                )

    def test_relative_targets_exist(self):
        for name, path in PAGES.items():
            p = parse(path)
            for rel in p.rel_targets:
                clean = rel.split("#", 1)[0].split("?", 1)[0]
                if not clean:
                    continue
                target = (path.parent / clean).resolve()
                # directory links resolve to index.html on Pages
                if target.is_dir():
                    target = target / "index.html"
                self.assertTrue(
                    target.exists(), f"{name}: relative target missing: {rel}"
                )

    def test_no_external_scripts_or_images(self):
        for name, path in PAGES.items():
            src = path.read_text(encoding="utf-8")
            self.assertNotIn("<script src=", src, f"{name}: external script")
            self.assertNotIn("<img ", src, f"{name}: img tag")
            self.assertNotIn("http://", src, f"{name}: insecure http:// URL")

    def test_copy_payloads_match_visible_blocks(self):
        total = 0
        for name, path in PAGES.items():
            p = parse(path)
            buttons = len(re.findall(r'data-copy="', path.read_text(encoding="utf-8")))
            self.assertEqual(
                buttons, len(p.copy_blocks),
                f"{name}: parsed {len(p.copy_blocks)} copy blocks of {buttons} buttons",
            )
            for i, (payload, visible) in enumerate(p.copy_blocks):
                self.assertEqual(
                    payload, visible,
                    f"{name}: copy block {i} payload != visible text\n"
                    f"payload={payload!r}\nvisible={visible!r}",
                )
                total += 1
        self.assertGreaterEqual(total, 11, "expected 11 copy blocks across both pages")

    def test_a11y_table_regions_and_skip_links(self):
        for name, path in PAGES.items():
            src = path.read_text(encoding="utf-8")
            self.assertIn('class="skip-link" href="#main-content"', src, name)
            self.assertIn('<main id="main-content">', src, name)
            self.assertIn('role="region"', src, f"{name}: table region role")
            self.assertIn('tabindex="0"', src, f"{name}: focusable table region")
            self.assertIn('scope="col"', src, f"{name}: column headers scoped")
            self.assertIn('scope="row"', src, f"{name}: row headers scoped")
            self.assertGreaterEqual(
                src.count('aria-label="'), 1, f"{name}: aria-label on region"
            )


class SiteWiring(unittest.TestCase):
    def test_landing_links_both_project_sites(self):
        src = (ROOT / "index.html").read_text(encoding="utf-8")
        self.assertIn(
            "github.io/RandomLabs/tor-cli/", src, "landing missing torshim site link"
        )
        self.assertIn(
            "github.io/RandomLabs/prism/", src, "landing missing Prism site link"
        )
        self.assertEqual(src.count("Prism"), 1, "Prism must appear exactly once")

    def test_readme_links_both_project_sites(self):
        src = (ROOT / "README.md").read_text(encoding="utf-8")
        self.assertIn(
            "github.io/RandomLabs/tor-cli/", src, "README missing torshim site link"
        )
        self.assertIn(
            "github.io/RandomLabs/prism/", src, "README missing Prism site link"
        )

    def test_contributing_codifies_every_project_site_rule(self):
        src = (ROOT / "CONTRIBUTING.md").read_text(encoding="utf-8")
        self.assertIn("index.html", src, "CONTRIBUTING: no index.html rule")
        self.assertRegex(
            src,
            r"(?i)every project[^\n]*index\.html|index\.html[^\n]*every project",
            "CONTRIBUTING: every-project-ships-a-site rule not codified",
        )
        self.assertIn("Curator", src, "CONTRIBUTING: Curator must audit the rule")

    def test_bench_vs_codecs_imports_archived_obsidian_helper(self):
        src = (ROOT / "prism" / "benchmarks" / "bench_vs_codecs.py").read_text(
            encoding="utf-8"
        )
        self.assertIn("archive", src, "sys.path must point at archive/obsidian")
        self.assertIn("compare_image_codecs", src)
        helper = ROOT / "archive" / "obsidian" / "benchmarks" / "compare_image_codecs.py"
        self.assertTrue(helper.is_file(), f"helper missing at {helper}")
        # the old, broken path must be gone
        self.assertNotRegex(
            src,
            r'parent\.parent\s*/\s*"obsidian"',
            "sys.path still points at the pre-archive obsidian location",
        )

    def test_no_em_dashes_in_touched_files(self):
        for path in TOUCHED:
            src = path.read_text(encoding="utf-8")
            self.assertNotIn("\u2014", src, f"em dash in {path.relative_to(ROOT)}")


class ServedOverHttp(unittest.TestCase):
    def test_both_pages_and_their_local_links_serve_200(self):
        handler = functools.partial(
            http.server.SimpleHTTPRequestHandler, directory=str(ROOT)
        )
        server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        port = server.server_port
        try:
            for name, path in PAGES.items():
                url = f"http://127.0.0.1:{port}/{'/'.join(path.relative_to(ROOT).parts)}"
                with urlopen(url) as resp:
                    self.assertEqual(resp.status, 200, url)
                    body = resp.read().decode("utf-8")
                self.assertEqual(body, path.read_text(encoding="utf-8"))
                # every relative link on the page serves over HTTP
                p = parse(path)
                for rel in p.rel_targets:
                    clean = rel.split("#", 1)[0].split("?", 1)[0]
                    if not clean:
                        continue
                    link = urljoin(url, clean)
                    if urlparse(link).hostname != "127.0.0.1":
                        continue
                    with urlopen(link) as resp2:
                        self.assertEqual(
                            resp2.status, 200, f"{name}: {rel} -> {resp2.status}"
                        )
            # hostile: a missing page is a clean 404, not a hang
            try:
                urlopen(f"http://127.0.0.1:{port}/tor-cli/no-such-page.html")
                self.fail("expected HTTPError 404")
            except Exception as exc:
                self.assertIn("404", str(exc))
        finally:
            server.shutdown()
            thread.join()
            server.server_close()


if __name__ == "__main__":
    unittest.main()
