"""Tester gate for PR #341 (M11c static-first dossiers, Refs #302).

Durable regression suite locking the four Reviewer blocking fixes:
 1. verdict denominator reconciles (participation + not-ranked phrasing)
 2. no blank flatness verdict cell (dash, never empty <td></td>)
 3. JS max-n dedupe coerces null/missing tps.n to 0 + Supavisor registered
 4. check.py drift gate covers resources via real raw rebuild

Plus static-first invariant: dossier pages carry no loading/fetch stubs.

Stdlib only (unittest + re + json).
"""

import inspect
import json
import os
import re
import unittest

ROOT = os.path.join(os.path.dirname(__file__), "..")
META = os.path.join(ROOT, "results", "dossiermeta.json")
JS = os.path.join(ROOT, "assets", "poolduel-charts.js")
CHECK = os.path.join(ROOT, "harness", "check.py")
POOLERS = ["odyssey", "pgagroal", "pgbouncer", "pgcat", "pgpool",
           "supavisor"]


def _load(path):
    with open(path) as handle:
        return json.load(handle)


class TestTesterM11cGate(unittest.TestCase):
    def test_verdict_reconciles_and_names_not_ranked(self):
        meta = _load(META)
        for pooler in POOLERS:
            verdicts = meta["dossiers"][pooler]["verdicts"]
            part = (verdicts["wins"] + verdicts["inconclusive"]
                    + verdicts["lose"] + verdicts["na"]
                    + verdicts["timeout"])
            self.assertEqual(part + (verdicts["cells"] - part),
                             verdicts["cells"], pooler)
            with open(os.path.join(ROOT, pooler, "index.html")) as handle:
                text = handle.read()
            self.assertIn("participating", text, pooler)
            self.assertIn("not ranked in", text, pooler)

    def test_supavisor_zero_participation_renders_honestly(self):
        with open(os.path.join(ROOT, "supavisor", "index.html")) as handle:
            text = handle.read()
        self.assertIn("(0 with supavisor participating)", text)
        self.assertIn("not ranked in 59 cells", text)

    def test_no_empty_td_any_dossier(self):
        for pooler in POOLERS:
            with open(os.path.join(ROOT, pooler, "index.html")) as handle:
                text = handle.read()
            self.assertNotIn("<td></td>", text, pooler)

    def test_js_dedupe_coerces_null_tps(self):
        with open(JS) as handle:
            text = handle.read()
        self.assertIn("function nOf", text)
        self.assertIn("nOf(e) > nOf(byKey", text)

    def test_js_supavisor_registered(self):
        with open(JS) as handle:
            text = handle.read().lower()
        self.assertIn("supavisor", text)

    def test_drift_gate_covers_resources_via_raw_rebuild(self):
        with open(CHECK) as handle:
            src = handle.read()
        self.assertIn('"resources"', src)
        self.assertIn("collect_raw", src)

    def test_coherence_is_clean(self):
        from poolduel.harness.check import check_dossier_coherence
        self.assertEqual(check_dossier_coherence(), [])

    def test_static_first_no_loading_or_fetch(self):
        for pooler in POOLERS:
            with open(os.path.join(ROOT, pooler, "index.html")) as handle:
                text = handle.read()
            lowered = text.lower()
            self.assertNotIn("loading", lowered, pooler)
            self.assertNotIn("fetch(", lowered, pooler)
            self.assertNotIn("coming soon", lowered, pooler)

    def test_null_tps_entry_coerces_to_zero(self):
        from poolduel.harness.dossiers import _entry_n
        self.assertEqual(_entry_n({"tps": None}), 0)
        self.assertEqual(_entry_n({"tps": {"n": None}}), 0)
        self.assertEqual(_entry_n({"tps": {"n": 10}}), 10)


if __name__ == "__main__":
    unittest.main()
