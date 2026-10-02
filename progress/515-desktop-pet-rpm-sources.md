# Progress - Desktop Pet Follow-up: RPM SOURCES Layout Repair (issue #515)

- **Issue:** #515 (pet-release maiden re-run 37076887677 on 396a8368: macos plus windows green, ubuntu red at rpmbuild `%install` with `install: cannot stat SOURCES/desktop-pet`)
- **Branch:** opencode/issue515-20261002232350
- **Status:** complete (ready for review)
- **Scope:** project-code only (`pet/packaging/build-rpm.sh`, `pet/tests/test_tester_release_track.py`, plus `progress/`). No `.github/workflows/` touches. After review/test/eval pass, the pet-release maiden re-run follows per the issue acceptance gates.

## Checklist

- [x] Root cause: `build-rpm.sh` staged payloads under versioned `SOURCES/desktop-pet-$VERSION/`, while `desktop-pet.rpm.spec` reads them flat as `%{_sourcedir}/<name>`; rpmbuild `%install` therefore missed every file
- [x] Fix: stage flat under `SOURCES/` (`SRCDIR="$STAGE/rpmbuild/SOURCES"`) with a comment citing run 37076887677, so spec paths resolve
- [x] Regression test `test_rpm_sources_layout_matches_spec` in `TestRpmRecipe`: asserts all four spec `%{_sourcedir}/` names, rejects the versioned-subdir pattern in the script, pins the flat `SRCDIR=` line
- [x] Gates green: `TestRpmRecipe` 4 OK; full `discover -s pet/tests -t .` 598 OK; `python -m pet selftest` 527 OK plus SELFTEST PASS; `bash -n` on edited sh passes; staging simulation proves flat layout resolves; `git diff --check` clean; zero em dashes

## Agent Log

- **2026-10-02, Builder:** Found the ubuntu-only failure in the latest maiden re-run (macos/windows already green after the frozen-entry repair): the versioned SOURCES subdir never matched the spec. Applied the flat-staging fix plus the parity regression test, verified the full suite green. Refs #515. Handing to the Reviewer; release maiden re-run follows after merge.
