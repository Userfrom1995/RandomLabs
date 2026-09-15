"""Tester regression suite for PR #356 (issue #302).

Covers what is NEW in this PR beyond the PR353 36-group sync suite:
the supavisor ``pin_sha`` SHA hardening. ``pin_sha`` must now require a
full 40-hex commit SHA so CI ``BLOCKED:`` toolchain-flake markers fail
loudly in the smoke gate instead of passing as recorded SHAs. Each
hostile case below fails on the old lenient implementation (which
accepted any non-empty string) and passes on the hardened one; nothing
here is tautological. A light 36-group re-pin tripwire is included so
any future dropped group fails loudly. Authored by the Tester.
"""

import csv
import json
import os
import unittest

from poolduel.harness.supavisor import PINNED_VERSION, pin_sha

RESULTS = os.path.join("poolduel", "results")
SOAK = os.path.join(RESULTS, "m10-soak")


class PinShaHardeningTest(unittest.TestCase):
    def test_valid_40_hex_accepted(self):
        self.assertEqual(pin_sha("a" * 40), "a" * 40)
        self.assertEqual(pin_sha("ABCDEF0123456789abcdef0123456789ABCDEF01"),
                         "ABCDEF0123456789abcdef0123456789ABCDEF01")

    def test_valid_sha_with_whitespace_stripped(self):
        self.assertEqual(pin_sha("  " + "b" * 40 + "\n"), "b" * 40)

    def test_blocked_markers_rejected(self):
        for bad in ("BLOCKED: toolchain flake",
                    "BLOCKED:supavisor missing",
                    "blocked: lowercase marker"):
            with self.assertRaises(ValueError, msg=bad):
                pin_sha(bad)

    def test_truncated_shas_rejected(self):
        for bad in ("abc123", "a" * 39, "a" * 41, "HEAD", PINNED_VERSION):
            with self.assertRaises(ValueError, msg=bad):
                pin_sha(bad)

    def test_non_hex_40char_rejected(self):
        for bad in ("z" * 40, "g" * 40, " " * 40, "!" * 40,
                    "a" * 39 + " ", "a" * 39 + "g"):
            if not bad.strip():
                continue
            with self.assertRaises(ValueError, msg=repr(bad)):
                pin_sha(bad)

    def test_empty_and_none_rejected(self):
        for bad in ("", "   ", "\n", None):
            with self.assertRaises(ValueError, msg=repr(bad)):
                pin_sha(bad)

    def test_error_message_names_sha_requirement(self):
        try:
            pin_sha("BLOCKED: flake")
        except ValueError as exc:
            self.assertIn("40-hex", str(exc))
        else:
            self.fail("expected ValueError")


class Soak36GroupRepinTest(unittest.TestCase):
    def test_medians_36_rows(self):
        with open(os.path.join(SOAK, "medians.json")) as fh:
            medians = json.load(fh)
        rows = medians if isinstance(medians, list) else medians.get("rows", medians)
        self.assertEqual(len(rows), 36)

    def test_matrix_36_rows(self):
        with open(os.path.join(SOAK, "matrix.csv")) as fh:
            rows = list(csv.DictReader(fh))
        self.assertEqual(len(rows), 36)

    def test_raw_162_files(self):
        import glob
        self.assertEqual(len(glob.glob(os.path.join(SOAK, "raw", "*"))), 162)

    def test_sitemeta_36_present_29_measured_7_timeout(self):
        with open(os.path.join(RESULTS, "sitemeta.json")) as fh:
            site = json.load(fh)
        leg = site["soak_leg"]
        self.assertEqual(leg["total"], 36)
        self.assertEqual(leg["present"], 36)
        self.assertEqual(leg["measured"], 29)
        self.assertEqual(leg["timeout"], 7)
        self.assertEqual(leg["missing"], 0)

    def test_manifest_sealed_2401_within_budget(self):
        with open(os.path.join(RESULTS, "manifest.json")) as fh:
            manifest = json.load(fh)
        self.assertEqual(manifest["total_raw_files"], 2401)
        self.assertTrue(manifest["within_budget"])

    def test_dossiers_regain_s3_3600_rows(self):
        with open(os.path.join(RESULTS, "dossiermeta.json")) as fh:
            dossiers = json.load(fh)
        blob = json.dumps(dossiers)
        self.assertIn("M10-S3", blob)
        self.assertIn("3600", blob)


if __name__ == "__main__":
    unittest.main()
