"""Tester hostile regression gate for M12 manifest seal (PR #343, Refs #302).

Independent of builder's test_m12_manifest.py: re-derives the seal from
the committed corpus and attacks it (tamper/add/remove/rename, tampered
or missing committed manifest, page-ledger drift). All read-only except
temp dirs; never mutates the committed corpus.
"""

import copy
import json
import os
import tempfile
import unittest

from poolduel.harness import manifest as manmod

ROOT = os.path.join(os.path.dirname(__file__), "..")
RESULTS = os.path.join(ROOT, "results")
REPO = os.path.join(ROOT, "..")


def _load_committed():
    with open(os.path.join(RESULTS, "manifest.json")) as handle:
        return json.load(handle)


class TesterManifestSealTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.meta = manmod.build_manifest(RESULTS, REPO)
        cls.committed = _load_committed()

    def test_build_hash_format_and_matches_committed(self):
        h = self.meta["build_hash"]
        self.assertEqual(len(h), 64)
        self.assertTrue(all(c in "0123456789abcdef" for c in h))
        self.assertEqual(self.committed["build_hash"], h)
        self.assertEqual(self.committed["total_raw_files"],
                         150 + 319 + 1770 + 156)
        self.assertEqual(self.meta["total_raw_files"],
                         150 + 319 + 1770 + 156)

    def test_tamper_changes_hash(self):
        entries = copy.deepcopy(self.meta["legs"]["m1"]["files"][:3])
        evil = copy.deepcopy(entries)
        evil[0]["sha256"] = "0" * 64
        self.assertNotEqual(manmod.manifest_hash(entries),
                            manmod.manifest_hash(evil))

    def test_rename_changes_hash(self):
        entries = copy.deepcopy(self.meta["legs"]["m1"]["files"][:3])
        evil = copy.deepcopy(entries)
        evil[0]["path"] = "m1/raw/zzz-evil.json"
        self.assertNotEqual(manmod.manifest_hash(entries),
                            manmod.manifest_hash(evil))

    def test_add_remove_changes_hash(self):
        entries = copy.deepcopy(self.meta["legs"]["m1"]["files"][:3])
        self.assertNotEqual(
            manmod.manifest_hash(entries),
            manmod.manifest_hash(entries + [
                {"path": "m1/raw/zzz-new.json",
                 "sha256": "f" * 64, "bytes": 1}]))
        self.assertNotEqual(manmod.manifest_hash(entries),
                            manmod.manifest_hash([]))
        self.assertEqual(len(manmod.manifest_hash([])), 64)

    def test_verify_rejects_tampered_committed_hash(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, "manifest.json")
            evil = copy.deepcopy(self.committed)
            evil["build_hash"] = "0" * 64
            with open(path, "w") as handle:
                json.dump(evil, handle)
            rc = manmod.main(["--results", RESULTS, "--repo", REPO,
                              "--out", path, "--verify"])
            self.assertEqual(rc, 1)

    def test_verify_rejects_missing_committed_file(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, "does-not-exist.json")
            rc = manmod.main(["--results", RESULTS, "--repo", REPO,
                              "--out", path, "--verify"])
            self.assertEqual(rc, 1)

    def test_verify_accepts_committed_manifest(self):
        rc = manmod.main(["--results", RESULTS, "--repo", REPO,
                          "--out", os.path.join(RESULTS, "manifest.json"),
                          "--verify"])
        self.assertEqual(rc, 0)

    def test_fragment_carries_hash_counts_bytes(self):
        fragment = manmod.render_meta_fragment(self.meta)
        self.assertIn(self.meta["build_hash"], fragment)
        self.assertIn('data-raw-files="2395"', fragment)
        self.assertIn('data-raw-bytes="%d"' % self.meta["total_raw_bytes"],
                      fragment)

    def test_page_fragment_matches_committed_hash(self):
        with open(os.path.join(ROOT, "reproducibility",
                               "index.html")) as handle:
            text = handle.read()
        self.assertIn("<!-- MANIFEST:meta:begin -->", text)
        self.assertIn(self.committed["build_hash"], text)

    def test_bundles_present_with_sha(self):
        for bundle in manmod.DERIVED_BUNDLES:
            with self.subTest(bundle=bundle):
                entry = self.meta["bundles"][bundle]
                self.assertTrue(entry["present"])
                self.assertEqual(len(entry["sha256"]), 64)

    def test_budget_invariant(self):
        self.assertTrue(self.meta["within_budget"])
        self.assertLessEqual(self.meta["total_raw_bytes"],
                             self.meta["size_budget_bytes"])
        self.assertEqual(self.meta["size_budget_bytes"], 500 * 1024 * 1024)

    def test_coherence_gate_green(self):
        from poolduel.harness.check import check_manifest_coherence
        self.assertEqual(check_manifest_coherence(), [])


if __name__ == "__main__":
    unittest.main()
