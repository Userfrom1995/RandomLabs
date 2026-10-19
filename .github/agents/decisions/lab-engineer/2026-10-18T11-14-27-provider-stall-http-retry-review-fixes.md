# Decision: Review-fix round for the #653 provider-stall and 429/5xx retry (PR #654)

- **Decider:** The Lab Engineer (CTO)
- **Date:** 2026-10-18T11:14:27Z
- **Applies to:** PR #654 / issue #653
- **Status:** accepted

## What was decided

All three review findings from the review of PR #654 head 67e449d9 are
applied on the same branch:

- **F1 (blocking):** all three terminal detectors
  (`model_error_terminal`, `freetier_error_terminal`,
  `transient_http_error_terminal`) in both runner paths are wrapped
  `( set +o pipefail; tail -n 40 "$1" | grep -qE "..." )`. Production
  `shell: bash` runs `bash --noprofile --norc -eo pipefail`, and `grep -q`
  exits at the first match while `tail` may still be writing: once the
  40-line window exceeds the 64 KiB pipe buffer, tail takes SIGPIPE and
  pipefail propagates its 141, so a genuine terminal line read as "no
  match" (silent green on the exit-0 path, lost retry on the nonzero path).
- **F2 (blocking, guards F1):** R15 now makes that class observable:
  the detector cases execute under `set -o pipefail`; three
  pipe-buffer-sized fixtures (terminal line first plus 39 lines of ~4088
  bytes, about 160 KiB each) must still match; both behavioral blocks run
  under the exact production shell form
  (`bash --noprofile --norc -eo pipefail`); a new `http-bigwindow` mock
  scenario replays the 160 KiB window end-to-end and must still spend the
  same-model retry; the static tail-scope pins now require the wrapped
  `( set +o pipefail; tail -n 40` shape (count 3 per file).
- **F3 (optional, applied):** both watchdog knobs are clamped to sane
  positive bounds after the non-numeric cases:
  `[ "$hang_poll_seconds" -ge 1 ] 2>/dev/null || hang_poll_seconds=30`,
  `[ "$hang_idle_seconds" -ge 1 ] 2>/dev/null || hang_idle_seconds=600`,
  `[ "$hang_idle_seconds" -le 86400 ] 2>/dev/null || hang_idle_seconds=600`.
  A zero poll interval busy-looped with `idle += 0` (watchdog silently
  disabled) and an overflow value errored on every comparison (watchdog
  never fired); static pins plus a `hang-poll-zero` behavioral scenario
  (with a dedicated mock shape and an explicit post-case reset of the
  override) now guard both.

One harness defect surfaced while landing F2 and was fixed in the same
pass: a finished scenario can leave the watchdog's own poll `sleep`
mid-flight, and its late "end" line was appended into the NEXT scenario's
freshly truncated shared recording file, corrupting exact-count backoff
assertions (observed as `http-then-hang:bad-backoff` right after the new
`hang-poll-zero` scenario, whose clamped poll value is 30). Each scenario
now records attempts and sleeps into per-run unique files, so an orphaned
recorder can only write into the finished run's own files. This hardening
is itself observable: reverting it fails R15.

## Evidence

- Audit: `.github/scripts/silent-stall-audit.sh` reports
  **23 passed / 0 failed** on the fixed tree (deterministic across runs,
  about 20 s).
- The pre-fix tree fails R15 exactly on the F1/F3 classes (measured while
  landing the fix): all three big-window detector cases rc=141 under
  pipefail, the three clamp pins and the wrapped-shape pin missing, the
  behavioral `http-bigwindow` scenario showing one attempt with no 30 s
  backoff, and `hang-poll-zero` timing out (rc=124).
- Independent verifier mutation matrix (fresh `git archive` export under
  `/tmp/opencode/verifier-export`, pristine copies, exact replacement with
  count assertions): control 23/0; every runner-side mutation (the
  per-detector pipefail unwraps in both files, the clamp deletions with and
  without the static shape pins in place, and the combined worst-case
  unwrap) fails R15 with exactly the intended classes and zero false
  negatives; both harness-only shell-form reversions (with fixed runner
  files) still pass, confirming the guard layers; the per-run-files
  reversion fails R15 via the orphan-pollution class, confirming the
  harness hardening is observable.
- Fixture realism (independent reproduction): the three fixtures are
  160320/160412/160328 bytes with the match on line 1; the extracted real
  detectors under `bash --noprofile --norc -eo pipefail` return 0 wrapped
  (6/6 across both files) and 141 unwrapped (6/6).
- Workspace untouched by the verifier: `git status --porcelain` empty.

## Delegation ledger

- Verifier subagent (general; scope: independent R15 mutation matrix):
  exported the committed tree, ran control plus 9 adversarial mutations
  (per-detector unwraps in each file, clamp deletion with and without the
  static pins, harness shell-form reversion with and without the
  detector-case pipefail, per-run-file reversion, and the combined
  worst-case unwrap), reproduced the fixture sizes and the wrapped/unwrapped
  exit codes independently, and confirmed the live workspace clean.
  Result: every mutation caught, no false negatives, no unreproducible
  outcomes.
- Primary verified itself: reproduced the F1 failure mode at detector level
  (unwrapped 141, wrapped 0, under the exact production shell), read every
  changed hunk, ran `bash -n` plus YAML parsing on both runner files, and
  ran the full audit repeatedly on the final tree (23/0).
- Skills: no skill fits (GitHub Actions lab infrastructure, not opencode
  configuration of this workspace).

## Notes

- The combined worst-case mutation showed the behavioral big-window layer
  depends on the harness shell form by construction; when that form is
  reverted with fixed runner files, the static pipefail-safe-shape pins
  still catch every unwrap. Both layers are kept: the pins for cheap,
  relocation-proof element presence; the behavioral matrix for semantics.
- The reviewer's two non-blocking notes (a bounded `tee` wait when a child
  holds the capture write end, and the microsecond `hang_flag`-vs-healthy
  race) are documented residuals shared with the pre-existing pipeline
  shape; neither is a regression from this PR.

- the Lab Engineer
