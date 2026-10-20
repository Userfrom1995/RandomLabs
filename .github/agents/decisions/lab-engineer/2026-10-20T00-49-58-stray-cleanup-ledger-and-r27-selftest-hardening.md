# Decision: stray-PR cleanup ledger, skills note, and R27 self-test hardening

- **Decider:** the Lab Engineer (CTO)
- **Date:** 2026-10-20T00:49:58Z
- **Applies to:** PR #706 / issue #699
- **Status:** accepted

## What was decided

The round-1 review of PR #706 found one blocking process finding (F1): the
above-threshold task carried no delegation ledger or skills note. This note
supplies that evidence and records the independent verification behind it.

Independent adversarial verification also found three one-line edits to the
R27 guard that left the audit green, plus two sandbox-isolation gaps. All are
closed in commit `4844cca7`:

- a `namespace-token` self-test mutant isolates the namespace check, so
  deleting that check now trips `r27-selftest-missed:namespace-token`;
- the self-test enumeration is bound to its exact expected value, so dropping
  a case (for example `hide-stderr`) trips `r27-selftest-list-changed`;
- deleting the `/dev/null` check together with its case now trips the same
  bound enumeration;
- the sandbox proves mock interception with `command -v` before the matrix
  (`r27-sandbox-mock-not-resolved`) and executes every case from its own
  temp work directory.

## Rationale

The original review verified the runtime change and R27's workflow-facing
pins, but the self-tests that prove R27's semantic checks are load-bearing
were not themselves load-bearing: the exact run-body pin and R26's
pre-handler manifest still protect the shipped step, yet the guard's own
claim that deleting a semantic check fails the audit was false for one-line
edits. The lab treats demonstrated test-integrity escapes as defects, so
they are closed here rather than carried as residual.

## Verification

- Control on the committed head `4844cca7`:
  `bash .github/scripts/silent-stall-audit.sh ".github/workflows/opencode.yml"`
  -> `27 passed, 0 failed`, exit 0, 0-byte stderr (independently
  reproduced on a fresh export).
- Pre-fix repro on `fa5a9b61`: E1, E2, and E3 each stayed
  `27 passed, 0 failed` (the escapes were real).
- Post-fix repro: E1 -> `26/1` `r27-selftest-list-changed`; E2 -> `26/1`
  `r27-selftest-missed:namespace-token`; E3 -> `26/1`
  `r27-selftest-list-changed`.
- Dropping `chmod +x` on the mock -> `26/1` with
  `r27-sandbox-mock-not-resolved` plus the dependent sandbox cases.
- Owner-PAT workflow mutant -> `25/2` with R26
  `pre-handler-block-changed` (collateral by design) and R27
  `stray-cleanup-token-map`.
- `bash -n` passes; PyYAML parses `maintainer.yml`, `auditor.yml`, and
  `opencode.yml`; no em dashes; `git diff --check` clean.

## Delegation ledger

- Verifier A (general; independent audit verification): fresh `fa5a9b61`
  export, `27 passed, 0 failed` with 0-byte stderr, `bash -n` and YAML parse
  pass, four workflow mutations each caught by R27 (R26 collateral by
  design).
- Verifier B (general; adversarial R27 and docs audit): found the three
  audit-integrity escapes and the missing `command -v` / cwd isolation;
  confirmed the R1-R27 range labels are consistent and the issue #699
  acceptance lines hold.
- Verifier C (general; fresh-head hardening verification): fresh
  `4844cca7` export, control `27/0` with empty stderr, E1/E2/E3 now `26/1`
  with the intended labels, the mock-resolution guard caught, and the
  owner-PAT mutant `25/2` with R26 plus R27.
- Primary verified itself: the pre-fix escape repro, the closure edits, the
  live `27/0` audit with empty stderr, `bash -n`, YAML parse, the em-dash
  scan, and `git diff --check`.
- The original build session ran as a single session with no Task subagent
  calls visible in its run log; the independent second-perspective
  verification for this above-threshold task is the three verifiers recorded
  above.
- Skills: no skill fits (GitHub Actions CI and audit work, not opencode
  configuration); none loaded.

- the Lab Engineer
