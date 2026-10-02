# Desktop Pet frozen-bundle entry repair (issue #515)

What: the maiden `pet-release` run failed on all three builders with
`ImportError: attempted relative import with no known parent package`,
because `pet/packaging/desktop-pet.spec` froze `pet/__main__.py`
directly as top-level `__main__`, which has no parent package for its
relative imports.

Why this shape: a minimal `pet/packaging/entry.py` shim (absolute
imports only) is the frozen target, so `pet` stays a proper package
inside the bundle. `pet/__main__.py` also gained a repo-root bootstrap
plus absolute imports, so direct-script runs work too. Two deeper
bundle gaps surfaced when a real one-file binary was built and its
selftest run: the suite spawns `[sys.executable, "-m", "pet", ...]`,
which reaches the bundle verbatim under PyInstaller, so `main()`
drops a frozen `-m pet` prefix; and suite file reads use
`__file__`-derived paths landing in the `_MEI` extract dir, so the
spec bundles the `pet/` tree as data with identical relative layout.

Key files: `pet/packaging/entry.py`, `pet/packaging/desktop-pet.spec`,
`pet/__main__.py`, `pet/packaging/build-windows.ps1` (Stop-safe
PyInstaller probe), `pet/tests/test_tester_final_phase.py`
(TestFrozenEntryShim), `progress/515-desktop-pet-frozen-entry.md`.

Notes: run-from-source stays primary; the bundle selftest (527 tests)
now passes inside a real PyInstaller binary. Verified with an actual
local frozen build, not a simulation. Refs #515.
