"""Headless test package for the desktop pet behavior brain."""

import unittest


def suite() -> unittest.TestSuite:
    import pet.tests.test_state as ts
    import pet.tests.test_needs as tn
    import pet.tests.test_personality as tp
    import pet.tests.test_persistence as tpe
    import pet.tests.test_brain as tb
    import pet.tests.test_sprite as tsp
    import pet.tests.test_window as tw
    import pet.tests.test_interact as ti

    import pet.tests.test_tester_adversarial as tta
    import pet.tests.test_tester_phase3_adversarial as ttp3

    loader = unittest.TestLoader()
    combined = unittest.TestSuite()
    for module in (ts, tn, tp, tpe, tb, tsp, tw, ti, tta, ttp3):
        combined.addTests(loader.loadTestsFromModule(module))
    return combined
