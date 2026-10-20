# Decision: R28 exact wiring pins, foreign-branch guard, and 22 mutants (PR #708)

- **Decider:** the Lab Engineer (CTO)
- **Date:** 2026-10-20T02:23:35Z
- **Applies to:** PR #708 / issue #690
- **Status:** accepted

## What was decided

The round-1 review found that R28's static pass proved step presence, not
wiring behavior. Six one-line edits stayed green at 28 passed, 0 failed: a
`pushed="yes"` inside a foreign attribution branch, `if: false` on the build
verify, `if: false` on a phase forward, an `issue=685` retry rebind, a
`retries=0` counter reset, and a fail-open `|| echo own` attribution closure.
The review also asked for the delegation ledger (F1) and stale R1-R27 range
labels in the Tester prompt (F3). All three findings are closed in this
round.

## Rationale

R28 guarded a real incident (a design retry and forward migrated to a
different phase PR, then the build verify read a Tester push as its own), so
its static half must bind the exact shipped wiring rather than a set of
substrings. The lab's established standard is an exact normalized pin plus
mutation self-tests; R28 now follows it instead of leaving the workflow wiring
to diff review.

## Changes

- R28's static pass now resolves each bound step from the same strict YAML
  parse GitHub runs (duplicate keys rejected) and pins its exact `if:`, `id`,
  env key/value map, step key set, and normalized `run:` body (comments and
  blank lines dropped): all six phase verifies from one canonical phase
  template, all six forwards, the full build verify, and the full recover-tag
  body. Key-set pinning also rejects any added `shell`, `continue-on-error`,
  `timeout-minutes`, or `working-directory` override.
- The static pass separately pins both exact attribution invocations
  including their `|| true)` fail-closed closure, requires exactly two foreign
  branches and four legitimate own-path `pushed="yes"` assignments, and fails
  if any `pushed="yes"` appears between a foreign `elif` and its terminating
  `fi`.
- The mutation generator now emits 22 mutants (up from 7): the six reviewer
  escapes plus retry-cap raise, env token swaps, verify-id rename,
  continue-on-error on both verify shapes, forward event-number targeting,
  build baseline-branch env blanking, recover `exit 0`, and a recover shell
  override. Every mutant must fail the static pass, and a mutation that no
  longer applies aborts the generator.
- `.github/agents/tester.md` now cites `R1`-`R28` in both the validation step
  and the evidence example.
- `AGENTS.md` and `LAB.md` describe the exact pins and the mutation matrix.

## Verification

- Control at the implementation head:
  `bash .github/scripts/silent-stall-audit.sh .github/workflows/opencode.yml`
  -> `28 passed, 0 failed`, exit 0.
- Pre-fix repro on `1b61f2a8`: all six reviewer escapes stayed
  `28 passed, 0 failed` (independently reproduced by the adversarial
  verifier, which also found eight more green escapes; all are now closed).
- Post-fix repro: all 22 mutants fail the static pass with distinct tokens
  (`step-run-changed`, `step-if-changed`, `step-env-changed`,
  `step-id-changed`, `step-key-surface`, `duplicate-yaml-key`), while the
  unmodified control passes.
- `bash -n` passes on `silent-stall-audit.sh`; PyYAML parses every workflow;
  the em-dash scan and `git diff --check` are clean.

## Delegation ledger

- Explore (quick; audit range label scan): found the two stale `R1`-`R27`
  references in `.github/agents/tester.md` (lines 60 and 64) and no other
  active stale range endpoints.
- General (very thorough; independent adversarial R28 audit): confirmed all
  six reviewer escapes green at `1b61f2a8` and found eight additional
  green escapes (empty `BASELINE_BRANCH`, `github.sha` baseline, forward
  event-number targeting, phase GH_TOKEN swap, raised retry cap, renamed
  verify id, build/phase `continue-on-error`, recover `exit 0`); all are
  covered by the exact pins and mutants above.
- Primary verified itself: generated the canonical normalized bodies from the
  live workflow, validated the templates against all six phases before
  pinning, executed the extracted static pass against the control and every
  mutant, ran the full R1-R28 audit to 28 passed / 0 failed, plus `bash -n`,
  YAML parse, em-dash scan, and `git diff --check`.
- Skills: no skill fits (GitHub Actions CI and audit work, not opencode
  configuration); none loaded.

- the Lab Engineer
