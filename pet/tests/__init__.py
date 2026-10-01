"""Headless test package for the desktop pet behavior brain."""

import unittest


def suite() -> unittest.TestSuite:
    import pet.tests.test_state as ts
    import pet.tests.test_needs as tn
    import pet.tests.test_personality as tp
    import pet.tests.test_persistence as tpe
    import pet.tests.test_brain as tb

    loader = unittest.TestLoader()
    combined = unittest.TestSuite()
    for module in (ts, tn, tp, tpe, tb):
        combined.addTests(loader.loadTestsFromModule(module))
    return combined
