"""Regression tests for PR #410 (Refs #70): landing-page meta + Prism dedup.

Verifies against the shipped artifact (root index.html served over HTTP):
- meta description lists the live fleet (Folio M4 shipped, Tabula, Sextant,
  Doom, Umbra, Poolduel, torshim), not the stale Tor CLI / Umbra-only text
- 'Prism' appears exactly once (Live Projects, Finished at ceiling), with no
  copy left under Previous Projects
- Folio / Tabula / Sextant live cards exist before Previous Projects
- HTML parses with zero errors, zero em dashes (lab formatting invariant)

Stdlib only (html.parser + urllib), no extra runtime dependencies.
Run: python3 tests/landing/test_pr410_meta_prism.py
"""
import http.server
import functools
import re
import threading
import unittest
from html.parser import HTMLParser
from pathlib import Path
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[2]
INDEX = ROOT / "index.html"
FLEET = ["Folio", "Tabula", "Sextant", "Doom", "Umbra", "Poolduel", "torshim"]


class _StrictParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.errors = []

    def error(self, message):  # pragma: no cover - html.parser legacy hook
        self.errors.append(message)


def read_source():
    return INDEX.read_text(encoding="utf-8")


def meta_description(src):
    m = re.search(r'<meta name="description" content="([^"]*)"', src)
    return m.group(1) if m else ""


class LandingPr410(unittest.TestCase):
    def test_meta_lists_live_fleet(self):
        meta = meta_description(read_source())
        for name in FLEET:
            self.assertIn(name, meta, f"meta missing fleet member: {name}")
        self.assertIn("M4 shipped", meta)
        self.assertNotIn("issue #387", meta, "stale Tor CLI-only meta survived")

    def test_prism_exactly_once_outside_previous(self):
        src = read_source()
        self.assertEqual(src.count("Prism"), 1, "Prism must appear exactly once")
        prev = src.split("Previous Projects")[-1]
        self.assertNotIn("Prism", prev, "duplicate Prism copy under Previous Projects")
        live = src.split("Previous Projects")[0]
        self.assertIn("Prism", live)
        self.assertIn("Finished at ceiling", live)
        self.assertIn("9bd6d10", live)

    def test_live_cards_before_previous(self):
        src = read_source()
        prev_pos = src.index("Previous Projects")
        for name in ("Folio", "Tabula", "Sextant"):
            self.assertIn(name, src)
            self.assertLess(src.index(name), prev_pos, f"{name} card not in Live section")

    def test_no_em_dashes_and_parses(self):
        src = read_source()
        self.assertNotIn("\u2014", src)
        parser = _StrictParser()
        parser.feed(src)
        self.assertEqual(parser.errors, [])

    def test_served_live_over_http(self):
        handler = functools.partial(
            http.server.SimpleHTTPRequestHandler, directory=str(ROOT)
        )
        server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            with urlopen(
                f"http://127.0.0.1:{server.server_port}/index.html"
            ) as resp:
                self.assertEqual(resp.status, 200)
                body = resp.read().decode("utf-8")
            self.assertIn(meta_description(read_source()), body)
            self.assertEqual(body.count("Prism"), 1)
            # hostile: missing asset is a clean 404, not a freeze
            try:
                urlopen(f"http://127.0.0.1:{server.server_port}/does-not-exist.html")
                self.fail("expected HTTPError 404")
            except Exception as exc:  # urllib.error.HTTPError
                self.assertIn("404", str(exc))
        finally:
            server.shutdown()
            thread.join()


if __name__ == "__main__":
    unittest.main()
