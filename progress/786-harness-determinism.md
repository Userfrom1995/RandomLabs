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
  sequential runs contaminate each other (boot-gate/rebind failures). A
  separate intermittent `site-e2e` undici assertion came from unconsumed
  HTTP response bodies, now fixed in `site-e2e.js`.

## Checklist

- [x] Fix the site-e2e nav-pill assertion to require a scroll only when the
      active pill is actually clipped, keeping both overflow shapes covered
      (`web/e2e/nav-pill.js` classifies the measured pill; the 390x844
      assertion branches on `clippedWithoutScroll`, and the 320x568
      re-reveal pins the full 320x568 viewport and the nav box
      containment in `site-e2e.js:547-560`)
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

Fixer round 4 verification of the macOS tester round-2 finding
(Linux, 2026-11-01, this runner). These are the fixer's post-fix Linux
runs at `8fbfea38`, not a macOS tester row; the macOS acceptance must be
re-bound to the fixed head.

- `node --test maze-chase/web/e2e/tests/*.test.js` -> 25 tests, all pass.
- `python3 -m unittest discover -s maze-chase/tools/compat/tests` -> 71
  tests, OK.
- `bash maze-chase/web/e2e/run-browser-e2e.sh browser-e2e.js` -> green
  in three consecutive runs; the high-contrast canvas check now waits
  for the requestAnimationFrame repaint instead of sampling the frame
  the HUD label described a tick earlier.
- `bash maze-chase/web/e2e/run-browser-e2e.sh` -> all 5 CDP suites green
  with a fresh Chrome each; `SITE-E2E ALL GREEN: 680 assertions` with
  the 320x568 re-reveal pinned at its real width and height (the crawl
  grew with main's new doc links).
- `node tools/site/render-docs.mjs --check` -> 15 docs current; 424
  internal links verified.
- `bash -n` on `run-browser-e2e.sh` and `git diff --check` -> clean.

Fixer round 5 (2026-11-01, this runner):

- `python3 -m unittest discover -s maze-chase/tools/compat/tests`
  -> 72 tests, OK (includes the relative `--outdir` transcript-path
  regression).
- `node --test maze-chase/web/e2e/tests/*.test.js` -> 26 tests, all
  pass (includes the complete `--help` header regression).
- `bash maze-chase/web/e2e/run-browser-e2e.sh --help` -> prints the
  complete header through "static server and a free debug port)." and
  no `set -euo pipefail`.
- `bash maze-chase/web/e2e/run-browser-e2e.sh site-e2e.js`
  -> `SITE-E2E ALL GREEN: 680 assertions` with a fresh Chrome.
- `bash -n` on `run-linux.sh`, `run-browser-e2e.sh`, and `drive.sh`
  -> clean; `shellcheck -x` on `run-browser-e2e.sh` -> clean
  (`run-linux.sh` keeps its pre-existing SC2015 info at `:99`).
- `git diff --check` -> clean.

Fixer round 6 (2026-11-01, this runner):

- The high-contrast baseline is now an observed frame: the suite samples
  the pre-reset canvas, waits for the Dusk reset repaint
  (`h !== beforeResetHash`), then waits for the high-contrast repaint
  (`h !== duskResetHash`) and uses that frame as `hcHash`. The fixed
  150 ms sample is gone, so a stale pre-reset frame can no longer make
  the clearing check tautological or flake the suite.
- The 320x568 re-reveal uses `navPillScrollState` like the 390x844 and
  430x900 blocks, so a platform whose active pill fits is accepted at
  any scroll offset while the nav-overflow evidence stays pinned.
- `run-browser-e2e.sh` resolves a bare `--chrome`/`CHROME` command name
  through `command -v` (the help and README now state the accepted
  forms); `drive.sh` documents that the `none` driver still runs the
  bounded readiness wait.
- `python3 -m unittest discover -s maze-chase/tools/compat/tests`
  -> 72 tests, OK.
- `node --test maze-chase/web/e2e/tests/*.test.js` -> 26 tests, all pass.
- `bash maze-chase/web/e2e/run-browser-e2e.sh browser-e2e.js`
  -> `E2E: ALL GREEN`.
- `bash maze-chase/web/e2e/run-browser-e2e.sh site-e2e.js`
  -> `SITE-E2E ALL GREEN: 680 assertions`.
- `bash maze-chase/web/e2e/run-browser-e2e.sh`
  -> all 5 CDP suites green with a fresh Chrome each.
- `node tools/site/render-docs.mjs --check` -> 15 docs current; 424
  internal links verified.
- `cargo test -q -p maze-chase-terminal --test tester_site --test
  tester_docs_language` -> 8 and 2 tests, OK.
- `bash -n`, `shellcheck -x`, and `git diff --check` -> clean.

Fixer round 7 (2026-11-02, this runner):

- `TestRunLinuxTranscriptPaths` no longer hardcodes the Linux-only
  `/bin/true` binary or depends on GNU `sha256sum`: the fixture puts
  portable `true`/`sha256sum` stubs on its PATH (macOS ships neither)
  and passes the stub binary by absolute path. The transcript-path
  assertion is unchanged. The fixture itself is portable, but the macOS
  row then found the empty-`env_args` expansion in `run-linux.sh` (see
  round 8), so the suite was not yet green on Darwin at this head.
- `python3 -m unittest discover -s maze-chase/tools/compat/tests`
  -> 72 tests, OK on Linux.
- `node --test maze-chase/web/e2e/tests/*.test.js` -> 27 tests at this
  head, all pass (29 at the current head, after the later Tester
  regressions).
- `git diff --check` -> clean.

Fixer round 8 (2026-11-03, this runner):

- `run-linux.sh` passes its `--env` entries through the bash 3.2 safe
  expansion `${env_args[@]+"${env_args[@]}"}`, so a run without
  `--game-env` no longer aborts under macOS `/bin/bash` 3.2 `set -u`
  before `drive.sh` runs. The transcript-path assertion is unchanged
  and now reaches the code it pins; a source pin in
  `test_harness_contract.py` guards the expansion form on Linux, where
  bash 5 masks the empty-array failure.
- Corrected the round-7 record (the suite was not green on Darwin at
  that head; the node count there was 27, 29 at the current head).
- `web/e2e/README.md` and the runner header now state the
  response-body contract precisely: `site-e2e.js` drains every body,
  including the non-OK link branch, because its local `assert` records
  a failure without aborting the crawl.
- `python3 -m unittest discover -s maze-chase/tools/compat/tests`
  -> 73 tests, OK (includes the new bash-3.2 expansion pin).
- `node --test maze-chase/web/e2e/tests/*.test.js` -> 29 tests, all pass.
- `bash -n` on `run-linux.sh` and `run-browser-e2e.sh` -> clean;
  `shellcheck -x` reports only the pre-existing SC2015 info at
  `run-linux.sh:99`; `git diff --check` -> clean.
- The macOS path cannot be executed on this runner's bash 5, so the
  bash-3.2 behavior is delegated to the macOS row on the fixed head.

## Current step

The macOS tester's second round returned fix on `022a7677`: the
transcript-path regression was deterministically red on Darwin because
`run-linux.sh` expanded an empty `"${env_args[@]}"` under `set -u`,
which macOS bash 3.2 rejects. Fixer round 8 makes that expansion
bash-3.2 safe and corrects the record accuracy the same report flagged
(the round-7 platform claim, the node test count, and the
response-body wording). Awaiting re-review, a re-bound Tester approval,
and a fresh macOS row on the settled head.

## Next steps

1. Reviewer re-verification of the fixed head.
2. The Tester (Linux) and the macOS tester arm re-validate the fixed
   head, including the live macOS Chrome acceptance and a cold compat
   run; the binding Evaluator re-evaluates afterwards.
3. Keep `Refs #786` until the macOS acceptance is re-bound to the fixed
   head and the Evaluator approves.

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
  Scoped the compat README window wait to X11 and rewrote the manual
  two-shell block to launch a fresh profile per suite instead of one
  shared browser; the fallback block remains and points at the runner.
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
- 2026-11-01 (fixer): applied the macOS tester round-2 finding. The
  `browser-e2e.js` high-contrast check now waits on animation frames for
  the board to repaint (bounded at 1.5s) instead of sampling the previous
  frame right after the HUD label settles, and the sibling Moonwake
  equality check waits for the expected render the same way. Pinned the
  320x568 height in the site-e2e re-reveal assertion, and corrected the
  undici attribution in the runner header, the web E2E README, and the
  F4 defect note (that assertion came from unconsumed response bodies,
  not shared Chrome).
- Delegation (fixer round 4): no subagents were needed for this narrow
  round; the primary traced the high-contrast block and the docs claims.
- Primary verified (fixer round 4): read every changed line; ran the
  25-test node suite, the 71-test compat suite, three standalone
  browser-e2e runs, the full five-suite runner, the 680-assertion
  site-e2e, and `render-docs.mjs --check`.
- Skills (fixer round 4): no skill fits this harness-only task
  (customize-opencode is for opencode configuration).
- 2026-11-01 (tester): returned fix on `a9130b0d`. Pushed
  `TestRunLinuxTranscriptPaths` (a relative `--outdir` makes drive.sh
  watch a doubled transcript path) and the `--help` complete-header
  regression; 72 compat / 26 node tests with exactly those two failing.
  F3 flags the stale 678-assertion count and the "unchanged" 320x568
  claim.
- 2026-11-01 (fixer): applied the Tester round. `run-linux.sh`
  canonicalizes a relative `--outdir` before building any run path, so
  drive.sh resolves the same transcript the launch writes.
  `run-browser-e2e.sh` prints its complete comment header up to the
  first non-comment line, removing the fixed line-slice truncation.
  Corrected the round-4 assertion count, the 320x568 checklist claim,
  the round-4 verification label, and the manual-setup wording.
- Delegation (fixer round 5): general (compat relative-outdir) ->
  reproduced the doubled path and returned the canonicalization fix;
  general (web help header) -> replaced the fixed slice, verified the
  complete header; general (progress audit) -> found the round-4 count
  contradiction, the stale "unchanged" claim, and the mislabelled
  verification block.
- Primary verified (fixer round 5): read the full diff; ran the 72-test
  compat suite, the 26-test node suite, the complete `--help` output,
  the live 680-assertion site-e2e, `bash -n`, and `shellcheck` on the
  changed runner.
- Skills (fixer round 5): no skill fits this harness-only task
  (customize-opencode is for opencode configuration).
- 2026-11-01 (fixer): applied review round 6. B1 anchors the
  high-contrast baseline on observed frames: the suite samples the
  pre-reset canvas, waits for the Dusk reset to paint, then waits for
  the high-contrast repaint and uses that frame as `hcHash`, so clearing
  high contrast cannot pass against a stale pre-reset hash. Also used
  `navPillScrollState` for the 320x568 re-reveal, resolved a bare
  `--chrome`/`CHROME` command name through `command -v`, corrected the
  stale undici and help-slice test comments, and documented the `none`
  driver's readiness wait.
- Delegation (fixer round 6): explore (canvas check audit) -> confirmed
  the fixed-sleep baseline made the clearing check tautological and that
  the new waits anchor both frames; explore (runner/docs audit) ->
  confirmed the classifier math, the Chrome path contract, and the test
  comment accuracy.
- Primary verified (fixer round 6): read every changed line; ran the
  72-test compat suite, the 26-test node suite, standalone
  `browser-e2e.js` and `site-e2e.js`, the full five-suite runner,
  `render-docs.mjs --check`, `tester_site`, `tester_docs_language`,
  `bash -n`, `shellcheck`, and `git diff --check`.
- Skills (fixer round 6): no skill fits this harness-only task
  (customize-opencode is for opencode configuration).
- 2026-11-01 (tester): approved `8723172c` on Linux after the full
  fresh-Chrome runner, a real xterm row, and the negative controls;
  pushed the Chrome command-name regression as `8723172c`.
- 2026-11-02 (fixer): applied the macOS tester's first-attempt finding.
  `TestRunLinuxTranscriptPaths` now builds its own portable `true` and
  `sha256sum` stubs and passes the stub binary by absolute path, so the
  transcript-path regression no longer depends on `/bin/true` (absent on
  macOS) or GNU coreutils. The assertion is unchanged.
- Delegation (fixer round 7): no subagents were needed for this
  single-fixture round; the primary reproduced the macOS path and
  re-ran the compat and node suites.
- Primary verified (fixer round 7): ran the 72-test compat suite and the
  27-test node suite; `git diff --check` clean.
- Skills (fixer round 7): no skill fits this harness-only task
  (customize-opencode is for opencode configuration).
- 2026-11-03 (fixer): applied the macOS tester's second-round finding.
  `run-linux.sh` expands `env_args` with the bash 3.2 safe
  `${env_args[@]+"${env_args[@]}"}` form, so a run without `--game-env`
  no longer dies under macOS bash 3.2 `set -u`. Added a source pin for
  that form, and corrected the round-7 platform claim, the stale node
  count (29 at this head), and the response-body wording.
- Delegation (fixer round 8): explore (bash 3.2 array audit) ->
  classified every array expansion in the four harness scripts and
  confirmed the new `+` form; explore (docs/progress audit) -> found
  the stale node count and the false platform claim, and confirmed
  that `site-e2e.js`'s `assert` does not abort, so the non-OK branch
  still drains its body.
- Primary verified (fixer round 8): read every changed line; ran the
  73-test compat suite, the 29-test node suite, `bash -n` on both
  changed shell scripts, `shellcheck -x`, and `git diff --check`.
- Skills (fixer round 8): no skill fits this harness-only task
  (customize-opencode is for opencode configuration).
