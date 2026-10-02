"""Frozen-bundle entry shim for Desktop Pet (PyInstaller one-file target).

Why this file exists: ``pet/__main__.py`` cannot be frozen directly.
A frozen (or script-run) ``__main__`` has no parent package, so every
relative import in that file raises ``ImportError: attempted relative
import with no known parent package`` (maiden ``pet-release`` run
37074448281 failed all three builders on exactly this). This shim is a
plain module with only absolute imports, so PyInstaller can freeze it
as top-level ``__main__`` while ``pet`` stays a proper package inside
the bundle.

Build scripts point PyInstaller at this file (see
``pet/packaging/desktop-pet.spec``); run-from-source stays primary
(``python -m pet ...``).
"""

import os
import sys

_ROOT = os.path.dirname(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)
del os, sys, _ROOT

from pet.__main__ import main

if __name__ == "__main__":
    raise SystemExit(main())
