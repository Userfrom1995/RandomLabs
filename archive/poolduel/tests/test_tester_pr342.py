"""Tester regression gate for PR #342 (M11d supplement pages, Refs #302).

Durable hostile checks beyond the builder's 14 happy-path tests:
generator survives empty/corrupt/null bundles, missing inputs exit 1
without traceback, pages are fully readable with JS stripped (static-first,
pre-rendered meta fragment), supplementmeta SHAs match committed bundles,
and IA lock holds (relative refs only, no Mermaid, no pending/loading).
"""

import hashlib
import os
import re
import unittest

ROOT = os.path.join(os.path.dirname(__file__), "..")
PAGES = ["guide", "architecture", "methodology", "reproducibility"]

from poolduel.harness import supplement as supmod


def _page(name):
    with open(os.path.join(ROOT, name, "index.html")) as handle:
        return handle.read()


class TestTesterPr342GeneratorHostile(unittest.TestCase):
    def test_empty_bundles_yield_zero_counts(self):
        meta = supmod.build_supplementmeta([], [], [], {}, {"a": "b"})
        self.assertEqual(meta["counts"]["m1_total"], 0)
        self.assertEqual(meta["counts"]["m2_total"], 0)
        self.assertEqual(meta["counts"]["m9_total"], 0)

    def test_corrupt_entries_do_not_crash_count(self):
        entries = [{"status": "measured"}, {"status": "N/A: timeout"},
                   {"status": "N/A (no route)"}, {"status": None}, {},
                   None, "str", 123, {"status": "measured "}]
        total, measured, na = supmod._count(entries)
        self.assertEqual(total, len(entries))
        self.assertEqual(measured, 1)
        self.assertEqual(na, 2)

    def test_null_bundle_pins_are_none_not_crash(self):
        meta = supmod.build_supplementmeta(
            [{"status": "measured"}], [], [], None, {})
        self.assertTrue(all(v is None for v in
                            meta["pooler_versions"].values()))

    def test_partial_pins_preserved(self):
        meta = supmod.build_supplementmeta(
            [{"status": "measured"}], [], [],
            {"pooler_versions": {"pgagroal": "1.4"}}, {})
        self.assertEqual(meta["pooler_versions"]["pgagroal"], "1.4")
        self.assertIsNone(meta["pooler_versions"]["pgbouncer"])

    def test_missing_input_returns_1(self):
        rc = supmod.main(["--m1", "/nonexistent/x.json",
                          "--out", "/tmp/tmpsup_pr342.json"])
        self.assertEqual(rc, 1)


class TestTesterPr342StaticFirst(unittest.TestCase):
    def test_meta_prerendered_without_js(self):
        for page in PAGES:
            noscript = re.sub(r"<script.*?</script>", "", _page(page),
                              flags=re.S)
            self.assertIn('id="supplement-counts"', noscript,
                          "%s meta fragment requires JS" % page)
            text = re.sub(r"<[^>]+>", "", noscript).strip()
            self.assertGreater(len(text), 500,
                               "%s thin with JS disabled" % page)

    def test_supplementmeta_shas_match_files(self):
        import json
        with open(os.path.join(ROOT, "results",
                               "supplementmeta.json")) as handle:
            meta = json.load(handle)
        for key, rel in (("m1/medians.json", "results/m1/medians.json"),
                         ("m2/medians.json", "results/m2/medians.json"),
                         ("m9/medians.json", "results/m9/medians.json"),
                         ("report.json", "results/report.json")):
            with open(os.path.join(ROOT, rel), "rb") as handle:
                digest = hashlib.sha256(handle.read()).hexdigest()
            self.assertEqual(meta["sources"][key], digest,
                             "supplementmeta sources[%s] SHA mismatch" % key)

    def test_ia_lock_relative_only_no_mermaid_no_pending(self):
        for page in PAGES:
            html = _page(page)
            for attr in re.findall(r'(?:src|href)="([^"]*)"', html):
                self.assertFalse(
                    attr.startswith("http://")
                    or attr.startswith("https://")
                    or attr.startswith("//"),
                    "%s non-relative ref: %s" % (page, attr))
            self.assertNotIn("mermaid", html.lower())
            flat = re.sub(r"<script.*?</script>", "", html, flags=re.S)
            flat = re.sub(r"<!--.*?-->", "", flat, flags=re.S).lower()
            self.assertNotIn("pending", flat)
            self.assertNotIn("loading", flat)


if __name__ == "__main__":
    unittest.main()
