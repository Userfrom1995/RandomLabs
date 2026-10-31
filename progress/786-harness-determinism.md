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

Linux (2026-10-31, review round 2, this runner):

- `python3 -m unittest discover -s maze-chase/tools/compat/tests -v`
  -> 71 tests, OK (includes the real drive.sh readiness wait with
  `--driver none`, the decimal and bounded `--ready-seconds`
  regressions, the sub-second deadline precision and relative-transcript
  regressions, the stale-transcript regression, the fixed-session
  pass/partial/unverified matrix, and the committed evidence bundle
  checks).
- `node --test maze-chase/web/e2e/tests/*.test.js`
  -> 24 tests, all pass (includes the `--plan` isolation/URL mapping and
  duplicate collapsing, the behavioral INT/TERM cancellation and
  profile-writer cleanup contracts, and the failing-suite cleanup
  contract).
- `bash maze-chase/web/e2e/run-browser-e2e.sh site-e2e.js`
  -> `SITE-E2E ALL GREEN: 673 assertions` (includes the 390x844 nav-pill
  invariant and the 320x568 re-reveal assertion).
- `bash maze-chase/web/e2e/run-browser-e2e.sh`
  -> all 5 CDP suites green with a fresh Chrome each
  (`boot-gate-e2e.js`, `browser-e2e.js`, `tester-rebind-lifecycle.js`,
  `tester-audio-e2e.js`, `site-e2e.js`).
- `node tools/site/render-docs.mjs --check`
  -> 15 docs current; 423 internal links verified.
- `cargo test -p maze-chase-terminal --test tester_site`
  -> 8 tests, OK (includes
  `rendered_docs_are_current_and_marked_with_their_source`).
- `cargo test -p maze-chase-terminal --test tester_docs_language`
  -> 2 tests, OK.
- `bash -n` and `shellcheck` on `drive.sh` and `run-browser-e2e.sh`
  -> clean.

macOS is not available in this Linux environment. The macOS acceptance
(`site-e2e` at 320x568 and 390x844 with the platform's font metrics, and
a cold compat run waiting for or failing on an empty title checkpoint)
is delegated to the macOS tester arm; the collector's required-checkpoint
and readiness gates are platform-independent and unit-tested.

macOS tester round (2026-10-31, this runner):

- `node --test maze-chase/web/e2e/tests/*.test.js` -> 25 tests, all pass.
- `python3 -m unittest discover -s maze-chase/tools/compat/tests` -> 71
  tests, OK.
- `bash maze-chase/web/e2e/run-browser-e2e.sh site-e2e.js`
  -> `SITE-E2E ALL GREEN: 674 assertions` (the link crawl and the asset
  probes now consume every response body, closing the intermittent Node
  24 undici parser assertion the macOS arm reproduced).
- `bash maze-chase/web/e2e/run-browser-e2e.sh`
  -> all 5 CDP suites green with a fresh Chrome each.
- `node tools/site/render-docs.mjs --check`
  -> 15 docs current; 423 internal links verified.
- The rebase onto `origin/main` dropped the stray per-OS commit that
  touched `.github/scripts/post-peros-findings.sh` (its content was
  already on main), so the diff is the 15 harness/docs/progress files
  again.

## Current step

macOS tester findings applied and Linux verification is green. Awaiting
re-review and a re-bound macOS row on the final head.

## Next steps

1. Reviewer re-verification, then the Tester (including the macOS arm)
   validates the live acceptance on macOS Chrome and a cold compat run.
2. Keep `Refs #786` until the macOS acceptance is proven.

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
- 2026-10-30 (fixer): applied review round 1. F2 normalizes
  `--ready-seconds` as decimal (08/010 no longer octal), F3 truncates a
  reused transcript before the readiness baseline, F4 accepts a fully
  visible fitting nav pill at any scroll offset, F5 makes INT/TERM exit
  the runner, F6 adds `--plan` plus behavioral isolation/cleanup tests,
  and F7/minor notes fix the docs, the CDP probe timeout, and the lost
  Chrome log. Regressions cover all of it.
- Delegation (fixer): general (compat harness audit) -> traced
  drive.sh/collect.py and reproduced F2/F3; general (web harness audit)
  -> traced site-e2e/nav-pill/runner and reproduced F4/F5/F6/F7; general
  (process/docs audit) -> confirmed F1, the missing ledger, and the false
  docs claims.
- Primary verified (fixer): read every changed line; ran the 68-test
  compat suite, the 20-test node suite, the live 673-assertion
  site-e2e, and shellcheck/bash -n on both shell harnesses.
- Skills (fixer): no skill fits this harness-only task
  (customize-opencode is for opencode configuration).
- 2026-10-31 (fixer): applied review round 2. B1 regenerated the stale
  rendered docs (`docs/web.html`, `docs/terminal-compat.html`) and added
  `tester_site` plus `render-docs.mjs --check` to the verification list.
  H1 makes the runner cleanup status-safe (kill surviving profile
  writers, bounded removal retries, preserve the suite's exit status).
  M1 backgrounds each suite and forwards INT/TERM to Node and Chrome so a
  hung CDP run is cancellable. M2 uses millisecond readiness arithmetic
  with an 86400-second bound. L1-L3 reject valueless options, collapse a
  duplicated suite argument, and stop `--help` before the shell options.
  L4-L5 scope the readiness claim to Linux/macOS, define `unverified`
  honestly, resolve a relative transcript against the run directory
  (creating its parent), and derive `resize_exercised` from the measured
  resizes with boot geometry recorded before the readiness wait.
- Delegation (fixer round 2): general (compat harness audit) -> traced
  the drive.sh deadline, transcript, and geometry paths and reproduced
  M2/L5; general (web harness audit) -> traced the runner traps, cleanup,
  parsing, and plan paths and reproduced H1/M1/L1-L3; general
  (process/docs audit) -> confirmed B1 and the L4 docs mismatches.
- Primary verified (fixer round 2): read every changed line; ran the
  71-test compat suite, the 24-test node suite, the live 673-assertion
  site-e2e and all five CDP suites, `render-docs.mjs --check`,
  `tester_site` and `tester_docs_language`, and shellcheck/bash -n on
  both shell harnesses.
- Skills (fixer round 2): no skill fits this harness-only task
  (customize-opencode is for opencode configuration).
- 2026-10-31 (fixer): applied the macOS tester round. `site-e2e.js` now
  consumes every HTTP response body (the non-OK and non-fragment link
  branches and the four asset probes), so the intermittent Node 24
  undici `Parser.finish` assertion cannot fire when the static server
  closes the connection. The rebase onto `origin/main` dropped the stray
  per-OS commit that touched `.github/scripts/post-peros-findings.sh`
  (its content was already on main), restoring the harness-only diff.
  Scoped the compat README window wait to X11 and replaced the manual
  shared-Chrome block with a per-suite fresh-profile launch.
- Delegation (fixer round 3): general (site-e2e audit) -> enumerated
  every fetch in the web harnesses and confirmed the link-crawl and
  asset probes were the only unconsumed response bodies; general
  (docs/provenance audit) -> confirmed the dropped infra commit is
  byte-identical to main and checked the two docs claims.
- Primary verified (fixer round 3): ran the 71-test compat suite, the
  25-test node suite, the live 674-assertion site-e2e, all five CDP
  suites, and `render-docs.mjs --check`.
- Skills (fixer round 3): no skill fits this harness-only task
  (customize-opencode is for opencode configuration).
