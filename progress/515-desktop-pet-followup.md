# Progress - Desktop Pet Follow-up: Windows Harness Repair plus Eval Fixes

- **Issue:** #515 (follow-up to #504 closed by owner merge of #514 as caf91470)
- **Branch:** opencode/issue515-20261002152607 (continuation after #516 merged as Windows harness follow-up)
- **Status:** complete (ready for review)
- **Scope:** project-code only (pet/tests plus progress/). No `.github/workflows/` touches:
  the release pipeline maiden run is gated on Windows green per the issue
  and routes to the Lab Engineer per the infra guard. The Windows re-run
  (test-windows) follows after review/test/eval pass.

## Checklist

- [x] Windows harness repair: `pid_alive` in
      `pet/tests/test_tester_phase4_service_adversarial.py` no longer calls
      `os.kill(pid, 0)` on Windows (WinError 87); it mirrors the shipped
      `service._is_alive` OpenProcess plus GetExitCodeProcess(STILL_ACTIVE)
      probe on win32, POSIX path unchanged
- [x] Windows harness repair: SIGTERM graceful-save test skips honestly on
      win32 (no POSIX SIGTERM delivery; os.kill there is TerminateProcess)
- [x] Windows harness repair: shell-syntax and unknown-flag tests in
      `pet/tests/test_tester_phase5_adversarial.py` resolve bash via
      `_find_bash()` (Git Bash first, WSL System32 stub rejected) and skip
      honestly when only the stub exists
- [x] Eval fix 1: stray duplicate `</main>` removed from `pet/index.html`
      (single `</main>` remains; parser reports balanced)
- [x] Eval fix 2: unclosed `<p>` closed in `pet/docs/index.html`, Packaging
      section restructured from wall-of-text into a per-OS table plus
      `<pre>` run-from-source and verify blocks mirroring the hub
      (plus minimal table/pre CSS in the docs style block)
- [x] Eval fix 3a: `smoke-windows.ps1` captures both Start-Process exit
      codes via `-PassThru` and fails closed on nonzero
- [x] Eval fix 3b: `smoke-macos.sh` adds a Darwin pkg payload check
      (`xar -tf` Payload archive) and forgets the `com.desktoppet.app`
      receipt with `pkgutil --forget` after uninstall, asserting the
      receipt is gone
- [x] Eval fix 4: `${2:-}` guards with script-style errors for every
      value-taking flag in `smoke-linux.sh` and `smoke-macos.sh`
      (no more raw `set -u` unbound-variable aborts)
- [x] Eval fix 5: example-version disclaimers added to the hub Downloads
      table intro, the docs Packaging intro, and the packaging README
      (examples plus matrix both marked as current-version examples)
- [x] Eval fix 6 (project-code half): `test_tester_release_track.py` gains
      a real YAML-or-structural parse gate (yaml.safe_load when PyYAML is
      present, two-space job-header structure otherwise), a
      cannot-break-the-review-loop trigger gate, a Start-Process
      `-PassThru`/ExitCode marker test, and a pwsh PSParser syntax test
      that runs when PowerShell exists and skips otherwise. The CI half
      (PSScriptAnalyzer/pwsh parse inside pet-release.yml) is Lab Engineer
      work per the infra guard. Minimal-image honest-skip matrix is now
      documented exactly in `packaging/README.md`.
- [x] Gates green on Linux/macOS runner: pet discover 576 OK, selftest
  PASS, bash -n on all packaging sh scripts, hub plus docs HTML parse
  balanced, zero em dashes in the diff
- [x] Windows harness follow-up (7 plain-bash sites, per Windows Tester
  verdict 15:22:56Z run 37025506969): `test_tester_eval515_regression.py`
  (3 sites: linux/macos bare-value plus unknown-flag) and
  `test_tester_release_track.py` (4 sites: rpm parse, smoke parse loop,
  linux live smoke, missing-payload smoke) now resolve bash via the
  proven `_find_bash()` helper (Git Bash first, WSL System32 stub
  rejected, honest skip when only the stub exists), mirroring
  `test_tester_phase5_adversarial.py`. Linux discover still 588 OK,
  zero em dashes in the diff

## Agent Log

- **2026-10-02, Builder:** Applied the six eval findings (project-code
  half) plus the two Windows harness repairs on the #515 branch. Verified:
  discover 576 OK (up from 572: 4 new tests, net of skips), selftest PASS,
  release-track suite 25 OK, phase5 installer suite 5 OK, pid_alive probe
  True on self plus False on dead/bad pids, bare `--binary` now fails
  with `error: --binary needs a value`. Root landing/e2e suites fail
  identically (7 failures, 8 errors, 9 skipped) on pristine main, so those
  are pre-existing and unrelated (no pet references). Refs #515,
  Refs #504, Refs #514. Handing to the Reviewer; after review plus test
  plus eval pass, the Windows re-run and the release pipeline maiden run
  follow (Lab Engineer owns the workflow-side pieces).
- **2026-10-02, Builder (issue #515 continuation branch
  opencode/issue515-20261002152607, after #516 merged):** Routed the 7
  plain-bash call sites through `_find_bash()` in
  `test_tester_eval515_regression.py` (helper added plus 3 call sites)
  and `test_tester_release_track.py` (helper added plus 4 call sites),
  exactly as the Windows Tester prescribed. Verified: targeted 37 OK,
  full discover 588 OK, zero em dashes in the diff. Refs #515. Handing
  to the Reviewer; Windows re-run then release maiden run follow.
