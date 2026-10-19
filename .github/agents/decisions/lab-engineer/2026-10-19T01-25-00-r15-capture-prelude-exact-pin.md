# Review round 13: R15 whole-capture-prelude exact pin

- Decider: the Lab Engineer (CTO)
- Date: 2026-10-19T01-25-00Z
- Applies to: PR #654 (`opencode/lab-653-provider-stall-retry`, issue #653),
  review round 13 finding F1
- Status: implemented, pending review round 14

## What was decided

Fix the blocking finding from review round 13. The round-12 whole-subshell
pin extracted from the bare `(` line through the `) &` line, so every line
immediately OUTSIDE that pair (the tee and opencode launches before it, the
`watch_pid` assignment, the oc and tee reaps, the cleanup, and the trailing
`set -e` after it) sat outside the compared region and outside every
behavioral assertion (the harness mocks `sleep` down to 0.2s and keys only
on the expected backoff values, so an inserted unknown real duration is
unobservable). Five one-line `sleep 1d` insertions at that launch/reap path
kept the audit at 23 passed / 0 failed while the watchdog launch, the reap,
or the whole capture pipeline was delayed by a day at the production
defaults, so the bounded retry never happened within any step timeout
(60/75-minute Maintainer, 105-minute eval) and the #653 stall class silently
recurred:

1. before the `(` line, after `oc_pid=$!` (watchdog never starts in time),
2. after the `) &` line (watchdog runs, reap and retry delayed),
3. after `watch_pid=$!` (same, one line later),
4. after `wait "$oc_pid"; status=$?` (tee reap and hang-flag handling
   delayed),
5. before the `tee "$log" < "$fifo" &` launch (the whole capture pipeline
   delayed).

Root cause: the round-12 pin's extraction window was the subshell pair
itself, not the FIFO branch's functional boundary. The `AGENTS.md` /
`LAB.md` sentence claimed the whole watchdog was pinned; it was true only
from the subshell open to its close.

Decision: widen the exact pin to the whole FIFO capture prelude, from the
`if mkfifo` branch line through the branch's closing `set -e`, keep every
existing fire/subshell/liveness pin and label, and scope the docs sentence
to the wider binding. The new region covers the entire FIFO branch body from
its first line to its first `set -e`. Correction (review round 14): this
note originally continued "This is the last line of the one-line-insertion
class", which was wrong. Within the FIFO branch the region left no code line
unbound, but the rest of the run block (the pre-attempt header, the degraded
`else` branch, and the post-`fi` classification/retry/budget logic) was
still insertion-blind; six one-line `sleep 1d` insertions at those sites
kept the audit green (round-14 review F1). The whole-run-block exact pin
landed in review round 14 closes that wider class (see the round-14 note).

## The fix

- The round-12 pin's `r15_watch` extractor now anchors on
  `/^[[:space:]]*if mkfifo .*then[[:space:]]*$/` and exits on the first
  `/^[[:space:]]*set -e[[:space:]]*$/` after it (fail-closed: a missing or
  renamed anchor extracts nothing and fails the exact compare; the branch's
  `set +e` cannot match, and the only exact `set -e` in that span is the
  branch's closing one).
- The normalizer additionally drops comment lines (`grep -vE '^#|^$'`), so
  prelude comment edits cannot brittle-fail the pin; a code line turned into
  a comment still disappears from the sequence and fails.
- The compared literal now spans: `if mkfifo "$fifo" 2>/dev/null; then`,
  `set +e`, the tee launch, the opencode launch, the subshell open, the
  whole watchdog loop, the subshell close, `watch_pid=$!`, both reaps, both
  cleanup kills, both cleanup waits, and `set -e`, nothing else. Failure
  label renamed `watchdog-prelude-not-exact` (the region is no longer just
  the subshell).
- The round-6/7/8/12 pins and labels are unchanged and still fire; the
  subsumed interior pins remain correct.
- `AGENTS.md` and `LAB.md` #653 entries now say the whole FIFO capture
  prelude (the tee and opencode launches, the watchdog subshell, the reap,
  and the cleanup) is whole-region pinned line-exact, so an inserted sleep
  anywhere in the watchdog or at the launch/reap path around it fails the
  audit. The R15 header comment, the PASS summary, and the failure-class
  text name the wider binding and its new failure class honestly.

## Evidence

Control on the modified working tree (tracked-file export): `23 passed,
0 failed`, ~58-60s, deterministic (two runs, plus the verifiers' runs).

Parent escape: the committed HEAD audit script (pre-fix) on the same
sources with insertion 1 in action.yml -> `23 passed, 0 failed`; the
maintainer.yml mirror -> `23 passed, 0 failed`. The escape class is real
and the delta is exactly what closes it.

Primary mutation matrix (fresh copy per mutant, one mutation each, full
audit run to completion; every mutant `22 passed / 1 failed`, R15 the only
failing rule, zero collateral):

| # | Mutation | Result detail |
|---|----------|---------------|
| m1 | `sleep 1d` after `oc_pid=$!` (before the `(`) in action.yml | `action-file(watchdog-prelude-not-exact)` only |
| m2 | `sleep 1d` after `) &` in action.yml | `action-file(watchdog-prelude-not-exact)` only |
| m3 | `sleep 1d` after `watch_pid=$!` in action.yml | `action-file(watchdog-prelude-not-exact)` only |
| m4 | `sleep 1d` after `wait "$oc_pid"; status=$?` in action.yml | `action-file(watchdog-prelude-not-exact)` only |
| m5 | `sleep 1d` before `tee "$log" < "$fifo" &` in action.yml | `action-file(watchdog-prelude-not-exact)` only |
| m6 | `sleep 1d` after the subshell open `(` in action.yml (round-12 regression control) | `action-file(watchdog-prelude-not-exact)` only |
| m7 | `sleep 1d` after `oc_pid=$!` in maintainer.yml (mirror of m1) | `maintainer.yml(watchdog-prelude-not-exact)` only |
| m8 | prelude comment wording edit in action.yml | `23 passed, 0 failed` (comment tolerance, not a false fail) |

Independent verification subagent (general, read-only workspace, own
from-scratch applier, fresh exports under `/tmp/verify654`, provenance
proven): control 23/0 twice, deterministic; all seven mutants m1-m7 caught
22/1, R15-only, with the correct per-file label and the mutant applied
exactly once in each copy; m8 stayed 23/0; both parent escapes reproduced at
23/0; the pin's extraction pipeline on both files yields a non-empty
normalized sequence exactly equal to the expected literal (37 statements,
action.yml lines 270-311, maintainer.yml lines 346-387); one own-applier
artifact (column-0 GNU sed insertion breaking YAML indentation) was
classified as applier error, not a pin defect.

Hygiene subagent (general, read-only, full-diff scan): 9/9 categories PASS:
scope exactly the three modified files; runtime YAMLs byte-identical to HEAD
(`git diff` empty); `bash -n` clean on the audit script and all 27 `run:`
blocks (6 + 21); zero U+2014 em dashes; no secrets or new `${{ }}`
interpolations on added lines; the extracted regions for action.yml and
maintainer.yml are byte-identical to each other
(`sha256 5081bdb7b3c24679b359b2e49bbffee1efbfea6b39fb91351695c38f6ef96015`)
and exactly equal to the decoded pin literal (900/900 chars); docs sentences
describe the whole-prelude binding; every removed line is either superseded
pin/summary text, a comment, or a replaced docs sentence, and nothing else
was loosened; mode stays 100755.

Documented boundaries and accepted tolerances (recorded so they are not
rediscovered as surprises):

- The outer boundary after this fix was the `if mkfifo` branch line and the
  branch's closing `set -e` themselves: a line inserted before the branch or
  after its `set -e` was outside every then-current exact-region pin.
  Superseded by the review-round-14 whole-run-block exact pin (see the
  round-14 note): a line inserted anywhere in the run block, including
  before the branch and after its `set -e`, now fails the audit.
- A line consisting only of an indented `2>/dev/null` is stripped to empty
  and dropped by the normalizer, so the pin cannot see it; a redirect-only
  command is behaviorally a no-op, so this is accepted normalization
  tolerance.
- The suffix-removal probe (`kill -TERM "$oc_pid" 2>/dev/null` -> no
  suffix) is caught by the older fire-block presence pin, not by
  normalization.

## Delegation ledger

- Lead: the Lab Engineer (CTO).
- Guard implementation, docs sync, primary matrix (control, two parent
  escapes, eight mutants) and the committed-tree audit: lead.
- Verification subagent (general; independent mutation campaign on fresh
  exports with its own applier; read-only workspace): full matrix returned,
  zero escapes, zero collateral, extraction exact-match proven.
- Hygiene subagent (general; static full-diff scan, read-only): all nine
  categories PASS, no loosened assertions, no discrepancy.
- Skills: no skill fits (GitHub Actions lab-infrastructure regression-audit
  work, not opencode configuration of this workspace), noted per
  `delegation.md` section 5.

## Why audit-only

The shipped runtime behavior was already correct and stays byte-frozen:
`action.yml` = `b69179b9bc00eb95c464bf72d0854905d5ae81b5`, `maintainer.yml` =
`a85701a23747ce8d81a184ab64f6357507b6134d`, identical to the round-2
verified head `78b57e6e`. The finding is that the GUARD failed to bind the
launch/reap path around the watchdog, not that the watchdog is wrong;
fixing the guard plus the two doc sentences is the smallest complete fix.
Changed files: `.github/scripts/silent-stall-audit.sh`, `AGENTS.md`,
`LAB.md`, and this note. Audit script mode kept at 755.

- the Lab Engineer (CTO)
