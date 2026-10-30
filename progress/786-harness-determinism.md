# 786 - Maze Chase verification harness determinism

Status: complete (Linux verification; macOS acceptance delegated to the macOS tester)
Issue: #786 (Refs #657, #655, #661, #582)
Branch: opencode/issue786-20261030181219
Scope: test harness only. No shipped game, site, or workflow behavior change.

## Defects

- F2: `web/e2e/site-e2e.js` requires `scrollLeft > 0` whenever the nav
  overflows, but macOS Chrome at 390x844 overflows the nav while the active
  Releases pill still fits fully inside it, so `scrollLeft 0` is correct.
- F3: the macOS compat driver captures the title checkpoint after a fixed
  2-second boot wait, so a cold Terminal can record a 0-byte title phase
  (and duplicate pre-render captures) and still sign a pass.
- F4: the documented web E2E flow shares one Chrome across suites, so
  sequential runs contaminate each other and a second `site-e2e` run can
  hit a Node undici assertion.

## Checklist

- [x] Fix the site-e2e nav-pill assertion to require a scroll only when the
      active pill is actually clipped, keeping both overflow shapes covered
      (`web/e2e/nav-pill.js` classifies the measured pill; the 390x844
      assertion branches on `clippedWithoutScroll`, and the 320x568
      re-reveal assertion is unchanged)
- [x] Add a bounded first-output readiness wait to `tools/compat/drive.sh`
      and record it as an event and in the evidence row
      (`--ready-seconds`, default 30; `readiness` / `readiness-timeout`
      events with `waited_ms`, `baseline_bytes`, `first_output_bytes`;
      a timeout skips the title checkpoint and the key-driving session)
- [x] Require the fixed session's checkpoints to be present, non-empty, and
      captured before `collect.py` can sign a pass; a readiness timeout is
      unverified (the gate applies to the transcript drivers `x11` and
      `macos`, with the resize checkpoints required only when
      `geometry.resize_exercised` is true)
- [x] Add a per-script fresh-Chrome web E2E runner and document it
      (`web/e2e/run-browser-e2e.sh`: one Chrome, profile, debug port, and
      Node process per suite; own static server on an ephemeral port;
      documented in `web/e2e/README.md` and `docs/web.md`)
- [x] Add harness unit tests for the nav-pill classification, the collector
      readiness/required-checkpoint gates, and the runner contract
      (`web/e2e/tests/nav-pill.test.js`, `web/e2e/tests/run-browser-e2e.test.js`,
      and the new `TestFixedSessionHonestyGates` / `TestDriveReadiness`
      classes in `tools/compat/tests/test_harness_contract.py`)
- [x] Run the compat unit suite, the new web harness tests, and the live
      Linux Chrome suites; record the results (below)
- [x] Push, open the PR, and hand off for review

## Verification

Linux (2026-10-30, this runner):

- `python3 -m unittest discover -s maze-chase/tools/compat/tests -v`
  -> 66 tests, OK (includes the real drive.sh readiness wait with
  `--driver none`, the fixed-session pass/partial/unverified matrix, and
  the committed evidence bundle checks).
- `node --test maze-chase/web/e2e/tests/*.test.js`
  -> 15 tests, all pass.
- `bash maze-chase/web/e2e/run-browser-e2e.sh site-e2e.js`
  -> `SITE-E2E ALL GREEN: 673 assertions` (includes the 390x844 nav-pill
  invariant and the 320x568 re-reveal assertion).
- `bash maze-chase/web/e2e/run-browser-e2e.sh`
  -> all 5 CDP suites green with a fresh Chrome each
  (`boot-gate-e2e.js`, `browser-e2e.js`, `tester-rebind-lifecycle.js`,
  `tester-audio-e2e.js`, `site-e2e.js`).
- `cargo test -p maze-chase-terminal --test tester_docs_language`
  -> 2 tests, OK.
- `bash -n` and `shellcheck` on `drive.sh` and `run-browser-e2e.sh`
  -> clean.

macOS is not available in this Linux environment. The macOS acceptance
(`site-e2e` at 320x568 and 390x844 with the platform's font metrics, and
a cold compat run waiting for or failing on an empty title checkpoint)
is delegated to the macOS tester arm; the collector's required-checkpoint
and readiness gates are platform-independent and unit-tested.

## Current step

Implementation and Linux verification complete. Handing off for review.

## Next steps

1. Reviewer pass, then the Tester (including the macOS arm) validates the
   live acceptance on macOS Chrome and a cold compat run.
2. Address any findings; keep `Refs #786` until the macOS acceptance is
   proven.

## Agent log

- 2026-10-30 (builder): read the macOS rc.2 report, the current harness
  code, and the prior cross-platform E2E fix. Confirmed all three findings
  are harness-side and that the site nav script intentionally leaves a
  fitting pill unscrolled. Starting with the site-e2e assertion.
- 2026-10-30 (builder): implemented the nav-pill classifier and the
  site-e2e branch, the bounded readiness wait in `drive.sh`, the
  fixed-session required-checkpoint and readiness gates in `collect.py`,
  and the fresh-Chrome runner. Added the Node and Python contract tests
  and updated the harness docs. Linux runs above are green; macOS
  acceptance is delegated to the macOS tester.
