"""M12 reproducibility-manifest tests (plan sections 11 + 12.2, Refs #302).

The manifest is the tamper-evident seal over the committed raw corpus:
deterministic build hash over sorted paths, size budget, bundle SHAs,
workflow pins, and the reproducibility-page fragment. Any hand edit to a
raw file, or any drift between the page and the ledger, must fail loudly.
"""

import copy
import hashlib
import json
import os
import tempfile
import unittest

from poolduel.harness import manifest as manmod

ROOT = os.path.join(os.path.dirname(__file__), "..")
RESULTS = os.path.join(ROOT, "results")


def _sha256_file(path):
    digest = hashlib.sha256()
    with open(path, "rb") as handle:
        for chunk in iter(lambda: handle.read(65536), b""):
            digest.update(chunk)
    return digest.hexdigest()


class ManifestDeterminismTest(unittest.TestCase):
    def test_hash_ignores_input_order(self):
        entries = [
            {"path": "m9/raw/B.json", "sha256": "b" * 64, "bytes": 2},
            {"path": "m1/raw/A.json", "sha256": "a" * 64, "bytes": 1},
        ]
        self.assertEqual(manmod.manifest_hash(entries),
                         manmod.manifest_hash(list(reversed(entries))))

    def test_hash_changes_on_tamper(self):
        entries = [
            {"path": "m1/raw/A.json", "sha256": "a" * 64, "bytes": 1},
        ]
        tampered = copy.deepcopy(entries)
        tampered[0]["sha256"] = "c" * 64
        self.assertNotEqual(manmod.manifest_hash(entries),
                            manmod.manifest_hash(tampered))

    def test_hash_changes_on_add_or_remove(self):
        entries = [
            {"path": "m1/raw/A.json", "sha256": "a" * 64, "bytes": 1},
        ]
        self.assertNotEqual(
            manmod.manifest_hash(entries),
            manmod.manifest_hash(entries + [
                {"path": "m1/raw/B.json", "sha256": "b" * 64, "bytes": 1},
            ]))
        self.assertNotEqual(manmod.manifest_hash(entries),
                            manmod.manifest_hash([]))

    def test_inventory_sorted_by_relpath(self):
        entries = manmod.inventory_raw(RESULTS, "m1")
        self.assertTrue(len(entries) > 0)
        paths = [e["path"] for e in entries]
        self.assertEqual(paths, sorted(paths))
        for entry in entries:
            self.assertTrue(entry["path"].startswith("m1/raw/"))
            self.assertEqual(len(entry["sha256"]), 64)
            self.assertTrue(entry["bytes"] > 0)


class ManifestContentTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        repo = os.path.join(ROOT, "..")
        cls.meta = manmod.build_manifest(RESULTS, repo)

    def test_counts_match_corpus(self):
        self.assertEqual(self.meta["total_raw_files"], 150 + 319 + 1770)
        self.assertEqual(self.meta["legs"]["m1"]["raw_files"], 150)
        self.assertEqual(self.meta["legs"]["m2"]["raw_files"], 319)
        self.assertEqual(self.meta["legs"]["m9"]["raw_files"], 1770)

    def test_within_size_budget(self):
        self.assertTrue(self.meta["within_budget"])
        self.assertLessEqual(self.meta["total_raw_bytes"],
                             self.meta["size_budget_bytes"])

    def test_all_derived_bundles_present(self):
        for bundle in manmod.DERIVED_BUNDLES:
            with self.subTest(bundle=bundle):
                self.assertTrue(
                    self.meta["bundles"][bundle]["present"],
                    "%s missing from manifest" % bundle)

    def test_workflow_pins_recorded(self):
        for workflow in manmod.SWEEP_WORKFLOWS:
            with self.subTest(workflow=workflow):
                self.assertTrue(
                    self.meta["workflow_pins"][workflow]["present"],
                    "%s missing from manifest" % workflow)

    def test_committed_manifest_matches_recompute(self):
        with open(os.path.join(RESULTS, "manifest.json")) as handle:
            committed = json.load(handle)
        self.assertEqual(committed["build_hash"], self.meta["build_hash"])
        self.assertEqual(committed["total_raw_files"],
                         self.meta["total_raw_files"])

    def test_fragment_carries_hash_and_counts(self):
        fragment = manmod.render_meta_fragment(self.meta)
        self.assertIn(self.meta["build_hash"], fragment)
        self.assertIn('id="manifest-counts"', fragment)
        self.assertIn("results/manifest.json", fragment)

    def test_apply_idempotent(self):
        with tempfile.TemporaryDirectory() as tmp:
            page_dir = os.path.join(tmp, "reproducibility")
            os.makedirs(page_dir)
            with open(os.path.join(ROOT, "reproducibility",
                                   "index.html")) as handle:
                html = handle.read()
            target = os.path.join(page_dir, "index.html")
            with open(target, "w") as handle:
                handle.write(html)
            # Strip the applied fragment to simulate a fresh checkout.
            begin = "<!-- MANIFEST:meta:begin -->"
            end = "<!-- MANIFEST:meta:end -->"
            before, rest = html.split(begin, 1)
            _, after = rest.split(end, 1)
            with open(target, "w") as handle:
                handle.write(before + begin + "\n" + end + after)
            self.assertTrue(manmod.apply_to_page(tmp, self.meta))
            self.assertFalse(manmod.apply_to_page(tmp, self.meta))

    def test_apply_rejects_unmarked_page(self):
        with tempfile.TemporaryDirectory() as tmp:
            page_dir = os.path.join(tmp, "reproducibility")
            os.makedirs(page_dir)
            with open(os.path.join(page_dir, "index.html"), "w") as handle:
                handle.write("<html></html>")
            with self.assertRaises(ValueError):
                manmod.apply_to_page(tmp, self.meta)


class ManifestPageLedgerTest(unittest.TestCase):
    def test_repro_page_markers_and_viewport(self):
        with open(os.path.join(ROOT, "reproducibility",
                               "index.html")) as handle:
            text = handle.read()
        self.assertIn("<!-- MANIFEST:meta:begin -->", text)
        self.assertIn('id="manifest-counts"', text)
        self.assertIn('name="viewport"', text)

    def test_page_tables_match_errata_ledger(self):
        with open(os.path.join(ROOT, "docs", "errata.md")) as handle:
            ledger = handle.read()
        with open(os.path.join(ROOT, "reproducibility",
                               "index.html")) as handle:
            text = handle.read()
        if "No errata filed yet" in ledger:
            self.assertIn("No errata filed yet", text)
        if "No independent re-runs recorded yet" in ledger:
            self.assertIn("No independent re-runs recorded yet", text)

    def test_check_manifest_coherence_green(self):
        from poolduel.harness.check import check_manifest_coherence
        self.assertEqual(check_manifest_coherence(), [])


if __name__ == "__main__":
    unittest.main()
