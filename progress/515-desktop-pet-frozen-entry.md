# Progress - Desktop Pet Follow-up: Frozen-Bundle Entry Repair (issue #515)

- **Issue:** #515 (maiden `pet-release` run 37074448281 failed all three
  builders: `ImportError: attempted relative import with no known parent
  package` from `pet/__main__.py:29`, then `error: bundle selftest failed`)
- **Branch:** opencode/515-frozen-entry-shim
- **Status:** complete (ready for review)
- **Scope:** project-code only (`pet/` plus `progress/`). No
  `.github/workflows/` touches. After review/test/eval pass, the
  `pet-release` maiden re-run follows per the issue acceptance gates.

## Checklist

- [x] Frozen entry shim: new `pet/packaging/entry.py` (absolute imports
  only, calls `pet.__main__.main`); `desktop-pet.spec` ENTRY points at
  the shim with `pathex=[ROOT]` so the `pet` package resolves at build
  time (was: `pet/__main__.py` frozen directly as top-level `__main__`,
  which has no parent package for its relative imports)
- [x] `pet/__main__.py` runs as a direct script too: repo-root bootstrap
  when `__package__` is unset plus all imports converted to absolute
  (`python pet/__main__.py version` now matches `python -m pet version`)
- [x] Frozen `-m pet` tolerance in `main()`: drops a leading
  `["-m", "pet"]` when `sys.frozen` is set, because the suite harness
  (41 call sites) and `service.py` daemon spawn build
  `[sys.executable, "-m", "pet", ...]`, and under PyInstaller
  `sys.executable` is the bundle itself
- [x] Spec bundles the `pet/` tree as data (same relative layout,
  `__pycache__`/`*.pyc` skipped) so frozen `__file__`-derived ROOT paths
  resolve inside `_MEI` exactly as run-from-source
- [x] Stop-safe PyInstaller probe in `build-windows.ps1` (saves and
  restores `$ErrorActionPreference` around the probe so the pip-install
  fallback runs even under `Stop` with PS 7.4+ native-error preference)
- [x] Regression tests in `test_tester_final_phase.py`: spec ENTRY is the
  shim (plus datas present), no relative imports survive in
  `pet/__main__.py`, direct-script and shim runs match package runs
  (skipped when frozen), Stop-safe probe marker
- [x] Packaging README documents the shim, the data bundling, and the
  frozen `-m pet` tolerance
- [x] Gates green: source discover 592 OK; real PyInstaller one-file
  bundle built locally and `./dist/desktop-pet selftest` reports
  527 OK (2 source-only skips) plus SELFTEST PASS; `pwsh` PSParser check
  on the edited ps1 passes; `git diff --check` clean; zero em dashes

## Agent Log

- **2026-10-02, Builder:** Reproduced the maiden-release ImportError
  (`python3 pet/__main__.py version` fails identically). Applied the
  shim plus spec ENTRY plus absolute-import fixes, then built a real
  one-file bundle with PyInstaller and found the second layer: 54 FAILs
  from `-m pet` argv reaching the bundle and 15 ERRORs from
  `__file__`-derived paths under `_MEI`. Fixed both (frozen argv strip,
  datas tree), added regression tests, rebuilt, verified bundle selftest
  green. Refs #515.
