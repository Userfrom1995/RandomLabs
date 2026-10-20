#!/usr/bin/env python3
"""Tester Phase 6 regression pins for the #714 Thunderline lead sheet fix.

Durable black-box pins over the committed artifact and its generator:

- the served lead sheet carries the responsive viewport meta and the
  inline favicon, so a 390 px mobile viewport lays out at 390 px;
- `tools/export_score.py` emits exactly the committed sheet (generator and
  artifact cannot drift apart again);
- `player/audio/preview.json` pins the committed sheet hash, so the
  provenance gate stays green.

Never touches production logic. Run:
python3 thunderline/tests/test_tester_phase6.py
"""

import hashlib
import json
import os
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, os.path.join(ROOT, "tools"))

from export_score import build_sheet, load_score  # noqa: E402

SHEET = os.path.join(ROOT, "player", "audio", "sheet.html")
PREVIEW = os.path.join(ROOT, "player", "audio", "preview.json")
VIEWPORT = '<meta name="viewport" content="width=device-width, initial-scale=1">'
ICON = '<link rel="icon" href="data:,">'


class LeadSheetArtifactPins(unittest.TestCase):
    def setUp(self):
        with open(SHEET, encoding="utf-8") as f:
            self.sheet = f.read()

    def test_responsive_viewport_meta(self):
        self.assertEqual(self.sheet.count(VIEWPORT), 1,
                         "viewport meta missing or duplicated")
        head_start = self.sheet.index("<head>")
        head_end = self.sheet.index("</head>")
        self.assertTrue(head_start < self.sheet.index(VIEWPORT) < head_end,
                        "viewport meta must live inside <head>")

    def test_inline_favicon_avoids_404(self):
        self.assertEqual(self.sheet.count(ICON), 1,
                         "inline favicon missing or duplicated")
        head_start = self.sheet.index("<head>")
        head_end = self.sheet.index("</head>")
        self.assertTrue(head_start < self.sheet.index(ICON) < head_end,
                        "inline favicon must live inside <head>")

    def test_sheet_identity(self):
        self.assertIn("<title>Thunderline - lead sheet</title>", self.sheet)
        self.assertIn("<h1>Thunderline</h1>", self.sheet)


class GeneratorParityPins(unittest.TestCase):
    def test_generator_emits_committed_sheet(self):
        generated = build_sheet(load_score())
        with open(SHEET, "rb") as f:
            committed = f.read()
        self.assertEqual(generated.encode("utf-8"), committed,
                         "export_score.py drifted from the committed sheet")

    def test_generator_emits_viewport_and_icon(self):
        generated = build_sheet(load_score())
        self.assertEqual(generated.count(VIEWPORT), 1,
                         "generator must emit exactly one viewport meta")
        self.assertEqual(generated.count(ICON), 1,
                         "generator must emit exactly one inline favicon")
        head_start = generated.index("<head>")
        head_end = generated.index("</head>")
        self.assertTrue(head_start < generated.index(VIEWPORT) < head_end,
                        "generator viewport meta must live inside <head>")
        self.assertTrue(head_start < generated.index(ICON) < head_end,
                        "generator inline favicon must live inside <head>")


class ProvenancePins(unittest.TestCase):
    def test_preview_manifest_pins_committed_sheet_hash(self):
        with open(PREVIEW, encoding="utf-8") as f:
            manifest = json.load(f)
        with open(SHEET, "rb") as f:
            digest = hashlib.sha256(f.read()).hexdigest()
        self.assertEqual(manifest["files"]["sheet.html"], digest,
                         "preview.json still pins a stale sheet hash")

    def test_every_manifest_entry_matches_committed_file(self):
        with open(PREVIEW, encoding="utf-8") as f:
            manifest = json.load(f)
        for rel, expected in manifest["files"].items():
            with open(os.path.join(ROOT, "player", "audio", rel), "rb") as f:
                self.assertEqual(hashlib.sha256(f.read()).hexdigest(),
                                 expected, "hash drift: %s" % rel)


if __name__ == "__main__":
    unittest.main()
