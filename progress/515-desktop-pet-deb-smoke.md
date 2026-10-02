# Progress - Desktop Pet Follow-up: Deb Smoke SIGPIPE Repair (issue #515)

- **Issue:** #515 (pet-release maiden re-run 37078577617 on 37b4c67f:
  macos plus windows green, ubuntu red at `Smoke Linux artifacts` with
  `tar: stdout: write error` plus `error: smoke failure: deb payload
  misses usr/bin/desktop-pet`)
- **Branch:** opencode/issue515-deb-smoke-pipefail
- **Status:** complete (ready for review)
- **Scope:** project-code only (`pet/packaging/smoke-linux.sh`,
  `pet/tests/test_tester_release_track.py`, plus `progress/` and
  `ideas/`). No `.github/workflows/` touches. After review/test/eval
  pass, the pet-release maiden re-run follows per the issue gates.

## Checklist

- [x] Root cause: `smoke-linux.sh` checked the deb payload with
  `dpkg-deb --fsys-tarfile | tar -t | grep -q` under `set -o pipefail`.
  `grep -q` exits on the first match while tar still streams the 27MB
  listing, tar dies with SIGPIPE (`stdout: write error`), and pipefail
  turns that into a pipeline failure, so the check false-negatives on
  a payload that is present. The CI log proves the match happened
  (tar got EPIPE writing the remaining listing lines)
- [x] Fix: capture the listing first
  (`DEB_LIST="$(dpkg-deb --fsys-tarfile | tar -t)"`), then match with
  `[[ "$DEB_LIST" == *"usr/bin/desktop-pet"* ]]` (no pipe, no early
  close, substring covers the `./` tar prefix either way)
- [x] Hazard class proven locally: streaming-producer `| grep -q`
  under pipefail fails 5/5 (rc=141) on a present match, while
  capture-then-`[[ ]]` passes 3/3
- [x] Regression tests in `TestSmokeScripts`: static ban on
  `tar -t | grep`, pins on the captured `DEB_LIST` plus `[[ ]]`
  match, and a live 3000-file tar test proving the fixed shape
  passes and still misses honestly
- [x] Gates green: `TestSmokeScripts` plus full release-track suite
  28 OK; full `discover -s pet/tests -t .` 603 OK;
  `python -m pet selftest` 527 OK plus SELFTEST PASS; `bash -n` on
  edited sh passes; `git diff --check` clean; zero em dashes

## Agent Log

- **2026-10-02, Builder:** Found the ubuntu-only failure in the latest
  maiden re-run (macos/windows green after the frozen-entry plus rpm
  fixes): the deb itself built fine, only the smoke payload check lied.
  Applied the capture-then-match fix plus regression tests, verified
  the full suite green. Refs #515. Handing to the Reviewer; release
  maiden re-run follows after merge.
