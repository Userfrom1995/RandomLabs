# 786 - Maze Chase verification harness determinism

Status: in-progress
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

- [ ] Fix the site-e2e nav-pill assertion to require a scroll only when the
      active pill is actually clipped, keeping both overflow shapes covered
- [ ] Add a bounded first-output readiness wait to `tools/compat/drive.sh`
      and record it as an event and in the evidence row
- [ ] Require the fixed session's checkpoints to be present, non-empty, and
      captured before `collect.py` can sign a pass; a readiness timeout is
      unverified
- [ ] Add a per-script fresh-Chrome web E2E runner and document it
- [ ] Add harness unit tests for the nav-pill classification, the collector
      readiness/required-checkpoint gates, and the runner contract
- [ ] Run the compat unit suite, the new web harness tests, and the live
      Linux Chrome suites; record the results
- [ ] Push, open the PR, and hand off for review

## Current step

Orientation complete. Implementing the three harness fixes.

## Next steps

1. Fix site-e2e, drive.sh, and collect.py.
2. Add the fresh-Chrome runner and docs.
3. Update the harness tests and run every suite.
4. Push and open the PR with the Linux evidence.

## Agent log

- 2026-10-30 (builder): read the macOS rc.2 report, the current harness
  code, and the prior cross-platform E2E fix. Confirmed all three findings
  are harness-side and that the site nav script intentionally leaves a
  fitting pill unscrolled. Starting with the site-e2e assertion.
