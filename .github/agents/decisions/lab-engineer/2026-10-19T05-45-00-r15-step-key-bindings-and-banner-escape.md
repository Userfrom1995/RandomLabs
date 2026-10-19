# Review round 16: R15 step-key bindings and banner backtick escape

- Decider: the Lab Engineer (CTO)
- Date: 2026-10-19T05-45-00Z
- Applies to: PR #654 (`opencode/lab-653-provider-stall-retry`, issue #653),
  review round 16 findings F1 (four unbound step-env/step-key classes) and
  F2 (unescaped backticks in both R15 banners), plus the tied same-pass
  corrections (missing skills bullet, stale `R15WATCHEOF` count 44 -> 37,
  `labengineer.md` budget-sharing wording, PR-body matrix claim)
- Status: implemented, pending review round 17

## What was decided

Fix the blocking test-integrity findings from review round 16. The
round-15 step-region scan bound the executing step's `if:` key and its
`shell:` line, but four step-env/step-key classes remained unbound, each
reproduced on a fresh pristine export of HEAD `24cab89e` with the full
audit staying 24 passed / 0 failed:

- F1a: a `HANG_IDLE_SECONDS`/`HANG_POLL_SECONDS` step-env mapping key on
  either runner step. At the production 600/30 defaults the body, the
  defaults, and the clamps all stay audited and green, but the override
  pushes the first watchdog fire past every step timeout, so a stalled
  attempt silently runs to the step timeout again: the exact #653 class.
- F1b: the `if:` scan matched `^[[:space:]]*if[[:space:]]*:` only, so a
  quoted `"if": false` or `'if': false` key passed while skipping the step
  at runtime just the same.
- F1c: the composite runner step had no key-set check beyond `shell:`, so
  a step-level `continue-on-error: true` (a dead attempt would report
  green) or a `timeout-minutes: 1` (REJECT-kills a healthy long retry
  loop) escaped.
- F1d: the Maintainer step pinned `shell: bash` but not its intentional
  `continue-on-error: true` / `timeout-minutes: 60`: deleting the timeout
  (the step falls back to the job-level 75) or flipping the flag was
  invisible.
- F2: both R15 banner strings carried unescaped backticks, so the audit's
  own report executed command substitutions: stderr grew with syntax
  errors and `command not found`, and the rendered banner dropped the
  quoted tokens.
- Same-pass: the fire-region exact-pin note
  (`2026-10-18T22-35-00-...`) lacked its skills bullet, the round-15
  note's `R15WATCHEOF` count said 44 (the literal is 37 normalized
  lines), `labengineer.md` named only the HTTP budget as shared across
  rungs (the stall budget is shared the same way), and the PR body's
  round-15 `zero escapes / 12/12` completeness claim and its `44` count
  were falsified.

Decision: bind the step's whole key set in the guard (step-env override
rejection, action-file step-key rejection, exact Maintainer key lines,
exactly one `shell:` key with the exact `shell: bash` line, quoted `if`
spellings), escape every backtick in the two banners and assert empty
stderr on the control and caught paths, and correct the falsified claims
and the missing skills bullet.

## The fix

- The `if:` regex in the step-region scan is broadened to
  `^[[:space:]]*[\"']?if[\"']?[[:space:]]*:` (optional matching quotes).
  Label unchanged: `behavioral(<file>,run-step-conditional)`.
- New check: neither runner step region may contain a
  `HANG_IDLE_SECONDS`/`HANG_POLL_SECONDS` mapping key (quoted key
  spellings included, the grep is prefix-substring). Label
  `behavioral(<file>,run-step-watchdog-env-override)`.
- Action-file region: `continue-on-error:` is rejected
  (`behavioral(action-file,run-step-continue-on-error)`) and
  `timeout-minutes:` is rejected
  (`behavioral(action-file,run-step-timeout-minutes)`).
- Maintainer region: exactly one `continue-on-error:` key and exactly one
  `timeout-minutes:` key are required, each with the exact line
  `        continue-on-error: true` / `        timeout-minutes: 60`.
  Deleting, altering, quoting, or duplicating either fails closed with
  `behavioral(maintainer.yml,run-step-continue-on-error-not-exact)` /
  `behavioral(maintainer.yml,run-step-timeout-minutes-not-exact)`.
- `shell:` must be exactly one key whose exact line is `shell: bash`
  (new label `behavioral(<file>,run-step-shell-not-exactly-once)`, so a
  second override possibly placed after the auditor's back no longer
  shadows it); the round-15 wrong-interpreter label
  `run-step-shell-not-bash` is unchanged.
- Both R15 banners: every backtick escaped (the already-escaped `2>&1`
  token kept); the "ok"/"bad" descriptions now name the new bindings; the
  matrix asserts 0-byte stderr on the control and on every caught mutant.
- Wording sync: `AGENTS.md` and `LAB.md` #653 sentences name the round-16
  bindings and the banner fix; `labengineer.md` says the HTTP and stall
  budgets are both shared across rungs; the round-15 note's count is
  corrected (44 -> 37) and its status line points here; the fire-region
  note gains its skills bullet; the PR body's round-15 count and its
  completeness claim are corrected and the round-16 bullet is added.

## Evidence

- Control: 24 passed / 0 failed, stderr 0 bytes (fresh full-tree export
  with the working-tree script).
- Primary matrix (fresh full-tree export per mutant, full audit run to
  completion, `xargs -P 3`; every entry caught by R15 alone at 23 passed /
  1 failed, correct label, stderr 0 bytes):
  - `af-hang-idle-env`, `mf-hang-poll-env`, `mf-hang-idle-env-quoted` ->
    `behavioral(<file>,run-step-watchdog-env-override)` (both files,
    quoted key spelling included).
  - `af-quoted-if`, `af-quoted-single-if` ->
    `behavioral(action-file,run-step-conditional)`.
  - `af-continue-on-error` ->
    `behavioral(action-file,run-step-continue-on-error)`;
    `af-timeout-minutes`, `af-timeout-quoted` ->
    `behavioral(action-file,run-step-timeout-minutes)`.
  - `mf-timeout-del` (runner-step timeout deleted) ->
    `behavioral(maintainer.yml,run-step-timeout-minutes-not-exact)`;
    `mf-coe-false` (runner-step true -> false) ->
    `behavioral(maintainer.yml,run-step-continue-on-error-not-exact)`.
  - `af-shell-dup` (second `shell:` key) ->
    `behavioral(action-file,run-step-shell-not-exactly-once)`;
    `af-shell-dash` -> `behavioral(action-file,run-step-shell-not-bash)`
    (round-15 regression control).
  - Regression controls for previously closed classes, both still 23/1
    R15-only: `af-kill-first` (KILL-before-TERM reorder, fire-region
    labels) and `mf-prelude-sleep` (`sleep 1d` in the FIFO prelude,
    `watchdog-prelude-not-exact` plus `run-block-not-exact`).
- Parent escape: the HEAD script on a fresh export plus the reviewer's
  two exemplar mutants (step env + quoted `if`) stays 24 passed /
  0 failed, proving the working-tree delta closes them.
- Independent verifier subagent (general; its own Python applier, fresh
  exports, no reuse of the lead's harness, read-only repo): control 24/0
  with 0-byte stderr; 10/10 mutant cases (both files' watchdog env, both
  quote spellings of `if`, action-file `continue-on-error` and
  `timeout-minutes`, Maintainer timeout deletion and `continue-on-error`
  flipped, second `shell:` key, `shell: dash`) caught R15-only at 23/1
  with the exact expected labels and 0-byte stderr; each mutation
  confirmed landed; both parent-escape trees 24/0 with the 329-byte
  stderr intrinsic to HEAD's unescaped banners (the working-tree fix
  silences it); no assertion failed.
- Hygiene: scope exactly the audit script plus the five docs/notes;
  runtime YAMLs byte-frozen (`action.yml`
  `b69179b9bc00eb95c464bf72d0854905d5ae81b5`, `maintainer.yml`
  `44c1a514c11ce13302fc955e8f9976d2c7ae83fb`); `bash -n` clean; mode
  100755 kept; zero em dashes; no secrets; every removed assertion
  replaced by a strictly stronger check.

## Delegation ledger

- Lead: the Lab Engineer (CTO). Guard implementation (step-region key
  checks, exact Maintainer pins, exactly-one shell pin, banner escape),
  wording sync, note corrections, primary matrix (control, 12 required
  mutants, 2 regression controls, parent-escape reproduction, 3-way
  parallel), PR body update.
- Verification subagent (general; independent applier and exports,
  read-only repo): control 24/0 with 0-byte stderr; 10/10 mutants caught
  R15-only with the expected labels and 0-byte stderr; both parent
  escapes reproduced at 24/0 (329-byte banner stderr on HEAD only); all
  mutations confirmed landed; no assertion failed.
- Skills: no skill fits (in-repo GitHub Actions regression-audit work,
  not opencode configuration of this workspace), noted per
  `delegation.md` section 5.

## Why audit-only

The shipped runtime behavior is unchanged and stays byte-frozen:
`action.yml` = `b69179b9bc00eb95c464bf72d0854905d5ae81b5`; `maintainer.yml` =
`44c1a514c11ce13302fc955e8f9976d2c7ae83fb`. The findings are that the GUARD
failed to bind the executing step's env and keys and that its own banners
corrupted the audit's output, not that the runner is wrong; fixing the
guard, the banners, the falsified claims, and the touched documents is the
smallest complete fix. Changed files:
`.github/scripts/silent-stall-audit.sh`, `AGENTS.md`, `LAB.md`,
`.github/agents/labengineer.md`, the round-15 note, the fire-region
exact-pin note (skills bullet), and this note. Audit script mode kept at
755.

- the Lab Engineer (CTO)
