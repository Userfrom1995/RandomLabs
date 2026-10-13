"""Tester PR #324 regression suite: Poolduel M5 pagemeta hostile checks.

Locks the M5 page-facts generator contract beyond the builder's own
drift tests: error paths must fail loudly (never invent numbers),
peak selection must ignore null/unmeasurable arms, and regeneration
must be byte-identical (POSIX trailing newline included) so
``repro.sh --pagemeta`` never dirties the tree on its own.

Stdlib only (unittest + json + subprocess + tempfile).
"""

import json
import os
import subprocess
import tempfile
import unittest

from poolduel.harness import pagemeta

ROOT = os.path.join(os.path.dirname(__file__), "..")
REPO = os.path.join(ROOT, "..")
PAGEMETA = os.path.join(ROOT, "results", "pagemeta.json")
M1_MEDIANS = os.path.join(ROOT, "results", "m1", "medians.json")
M2_MEDIANS = os.path.join(ROOT, "results", "m2", "medians.json")

MEASURED = "measured"
NA = "N/A (unsupported)"


def _load(path):
    with open(path) as f:
        return json.load(f)


class TestPagemetaByteReproducibility(unittest.TestCase):
    def _regen_to_temp(self):
        tmp = tempfile.NamedTemporaryFile(
            suffix=".json", delete=False)
        tmp.close()
        rc = pagemeta.main(
            ["--m1", M1_MEDIANS, "--m2", M2_MEDIANS,
             "--out", tmp.name])
        self.assertEqual(rc, 0, "generator failed on committed medians")
        with open(tmp.name, "rb") as f:
            raw = f.read()
        os.unlink(tmp.name)
        return raw

    def test_generator_output_ends_with_newline(self):
        raw = self._regen_to_temp()
        self.assertTrue(raw.endswith(b"\n"),
                        "generator output lacks trailing newline; "
                        "repro.sh --pagemeta strips the committed newline "
                        "on every run (append one after json.dump)")

    def test_regeneration_is_byte_identical(self):
        raw = self._regen_to_temp()
        with open(PAGEMETA, "rb") as f:
            committed = f.read()
        self.assertEqual(raw, committed,
                         "regenerated pagemeta differs byte-wise from "
                         "committed file; run repro.sh --pagemeta and diff")

    def test_committed_pagemeta_ends_with_newline(self):
        with open(PAGEMETA, "rb") as f:
            committed = f.read()
        self.assertTrue(committed.endswith(b"\n"),
                        "committed pagemeta.json lacks trailing newline")


class TestPagemetaHostileInputs(unittest.TestCase):
    def test_empty_m1_raises_never_invents(self):
        with self.assertRaises(ValueError):
            pagemeta.build_pagemeta([], _load(M2_MEDIANS))

    def test_empty_m2_raises_never_invents(self):
        with self.assertRaises(ValueError):
            pagemeta.build_pagemeta(_load(M1_MEDIANS), [])

    def test_nonlist_medians_raise(self):
        with self.assertRaises(ValueError):
            pagemeta.build_pagemeta({"not": "a list"},
                                    _load(M2_MEDIANS))

    def _run_pagemeta(self, args):
        env = dict(os.environ)
        env["PYTHONPATH"] = REPO + os.pathsep + env.get("PYTHONPATH", "")
        return subprocess.run(
            ["python3", "-m", "poolduel.harness.pagemeta"] + args,
            capture_output=True, text=True, cwd=REPO, env=env)

    def test_missing_input_exits_nonzero_without_writing(self):
        tmp = tempfile.NamedTemporaryFile(
            suffix=".json", delete=False)
        tmp.close()
        os.unlink(tmp.name)
        proc = self._run_pagemeta(
            ["--m1", "/nonexistent-m1.json",
             "--m2", os.path.join("poolduel", "results",
                                 "m2", "medians.json"),
             "--out", tmp.name])
        self.assertNotEqual(proc.returncode, 0,
                            "missing input must fail, not invent numbers")
        self.assertFalse(os.path.exists(tmp.name),
                         "failed run must not write output")
        self.assertIn("missing input", proc.stderr)

    def test_corrupt_json_exits_nonzero(self):
        with tempfile.NamedTemporaryFile(
                "w", suffix=".json", delete=False) as f:
            f.write("{not valid json")
            bad = f.name
        tmp = bad + ".out"
        try:
            proc = self._run_pagemeta(
                ["--m1", bad,
                 "--m2", os.path.join("poolduel", "results",
                                     "m2", "medians.json"),
                 "--out", tmp])
            self.assertNotEqual(proc.returncode, 0,
                                "corrupt JSON must fail loudly")
            self.assertIn("unreadable input", proc.stderr)
        finally:
            os.unlink(bad)
            if os.path.exists(tmp):
                os.unlink(tmp)

    def test_peak_ignores_null_tps_arms(self):
        m1 = [
            {"cell_id": "c1", "pooler": "pgbouncer",
             "status": MEASURED, "tps": None},
            {"cell_id": "c2", "pooler": "odyssey",
             "status": MEASURED, "tps": 200},
            {"cell_id": "c3", "pooler": "pgcat",
             "status": MEASURED, "tps": {"median": 100}},
        ]
        m2 = [{"cell_id": "x", "pooler": "pgbouncer",
               "status": NA, "tps": None}]
        meta = pagemeta.build_pagemeta(m1, m2)
        self.assertEqual(meta["m1"]["peak"]["tps"], 200)
        self.assertEqual(meta["m1"]["peak"]["pooler"], "odyssey")

    def test_all_unmeasured_yields_null_peak_not_crash(self):
        m1 = [{"cell_id": "c1", "pooler": "pgbouncer",
               "status": NA, "tps": None}]
        m2 = [{"cell_id": "x", "pooler": "pgbouncer",
               "status": NA, "tps": None}]
        meta = pagemeta.build_pagemeta(m1, m2)
        self.assertIsNone(meta["m1"]["peak"])

    def test_scope_carries_provenance_citations(self):
        meta = pagemeta.build_pagemeta(_load(M1_MEDIANS),
                                       _load(M2_MEDIANS))
        for key in ("warmup", "scale", "pg_build"):
            self.assertIn(key, meta["scope"])
        self.assertIn("warmup_provenance", meta["scope"])
        self.assertIn("test-matrix.md", meta["scope"]["warmup_provenance"])
        self.assertIn("M1:", meta["banner_sentence"])
        self.assertIn("M2:", meta["banner_sentence"])


if __name__ == "__main__":
    unittest.main()
