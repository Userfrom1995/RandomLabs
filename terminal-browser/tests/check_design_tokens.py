"""Design-token check for the Harbor Overlay System v2 (issue #532).

Asserts docs/design-tokens.json stays in sync with docs/design.md:
chip width budgets, motion ticks, measured contrast ratios, drawer rows,
and hub palette. Run with `python3 check_design_tokens.py` or via pytest.
"""
import json
import os
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TOKENS = os.path.join(ROOT, "docs", "design-tokens.json")


def load_tokens(path=TOKENS):
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


class TestDesignTokens(unittest.TestCase):
    def test_chip_budgets(self):
        chips = load_tokens()["hintChips"]
        self.assertEqual(chips["budgetLe80"], 6)
        self.assertEqual(chips["budget81to120"], 10)
        self.assertEqual(chips["budgetGt120"], 14)

    def test_motion_ticks(self):
        ticks = load_tokens()["motion"]["ticks"]
        self.assertEqual(ticks["T1Ms"], 33)
        self.assertEqual(ticks["T2Ms"], 50)
        self.assertEqual(ticks["T3Ms"], 100)

    def test_contrast_ratios(self):
        colors = load_tokens()["colors"]
        self.assertIn("13.21", colors["body"])
        self.assertIn("9.34", colors["focusRow"])
        self.assertIn("8.69", colors["accentOnChromeBG"])

    def test_drawer_rows(self):
        self.assertEqual(load_tokens()["drawer"]["rows"], 3)

    def test_hub_palette(self):
        hub = load_tokens()["hub"]
        self.assertEqual(hub["bg"], "#0C0E14")
        self.assertEqual(hub["panel"], "#161A24")
        self.assertEqual(hub["ink"], "#E8EAF2")
        self.assertEqual(hub["accent"], "#78C8FF")
        self.assertEqual(hub["warm"], "#FFD178")


if __name__ == "__main__":
    unittest.main()
