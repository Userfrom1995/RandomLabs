# Decision: path-normalize the R15 invocation-uniqueness count (round-24 review fix)

- **Decider:** the Lab Engineer (CTO)
- **Date:** 2026-10-19T21:10:00Z
- **Applies to:** PR #654 / issue #653
- **Status:** accepted

## Finding (review round 24, blocking)

The round-23 uniqueness clause in `outcome_source_hits` counted only the
exact string `./.github/actions/opencode-run`. The Actions runner
normalizes paths, so `./.github/actions/opencode-run/.` is the same
directory but a different string, and it was invisible to the count. A
two-step mutant on a fresh `6c9dedcb` export kept the audit at 25 passed
/ 0 failed while hollow-greening the general verify:

1. the real general runner got `id: opencode_agent` and the slash-dotted
   `uses: ./.github/actions/opencode-run/.` spelling,
2. a decoy step carrying the pinned name, `id: opencode`, the exact
   `if`/`continue-on-error`/`timeout-minutes`, and the canonical `uses`
   was inserted before the verify.

The verify then read the decoy's outcome while the real agent ran
unverified behind `continue-on-error: true`.

## What was decided

1. `outcome_source_hits` counts invocations by path-normalized path
   (`os.path.normpath`), so `.../opencode-run/.` and equivalent
   dot-segment spellings are the same invocation as the canonical path.
   The source-attribute branch stays exact (stricter) and keeps its early
   `return hits`, so the `uses-changed` self-test label is unchanged.
2. The outcome-source self-test matrix gains a
   `duplicate-invocation-slashed` fixture (the decoy fixture's second
   runner spelled `./.github/actions/opencode-run/.`) expecting
   `verify-outcome-source-runner-not-unique`, so the clause cannot be
   narrowed back to an exact-string count.
3. Doc wording: `AGENTS.md` and `LAB.md` now state the path-normalized
   count and the issue #696 actor-gate exception for the runner-step
   conditional (round 24 allows exactly one condition on the Maintainer
   runner, the exact shared actor-write gate form).

## Evidence

All runs on fresh exports, one mutation per export, `bash
.github/scripts/silent-stall-audit.sh`.

- Control on the fixed workspace tree: 25 passed / 0 failed, 0-byte
  stderr.
- The reviewer's exact mutant on the pre-fix script: 25 passed / 0
  failed, 0-byte stderr (escape reproduced).
- The same mutant on the fixed script: 24 passed / 1 failed, R15 the only
  failing rule, `opencode.yml(verify-outcome-source-runner-not-unique)`,
  0-byte stderr.
- Self-test non-vacuity: reverting only the normalized count in the fixed
  script fails exactly
  `behavioral(tree,verify-outcome-source-self-test:duplicate-invocation-slashed)`
  (24/1, R15 only), proving the new fixture is load-bearing.

## Documentation

- `AGENTS.md` #653 entry: the uniqueness clause now says "counted by
  path-normalized path, so `.../opencode-run/.` and equivalent
  dot-segment spellings are the same invocation"; the extracted-runner
  clause now names the issue #696 gate exception instead of an absolute
  "no conditional gate".
- `LAB.md` #653 section: the same two corrections at the matching
  sentences.
- PR #654 body: round-24 review-fix bullet (via `gh pr edit`).

## Delegation ledger

- Independent verifier subagent (general, fresh `/tmp` exports, own
  mutation applier, read-only workspace): reproduced the reviewer's
  escape on the pre-fix script and its catch on the fixed script,
  re-ran the control (25/0, 0-byte stderr), and mutation-proved the new
  self-test fixture by reverting the normalized count.
- Independent hygiene subagent (general, read-only): scope, em dashes,
  secrets, workflow routing, `bash -n`/YAML parse, mode bits, commit
  hygiene, and doc consistency categories.
- Primary authored the fix, ran the control, both mutant directions, and
  the self-test non-vacuity run before delegating; wrote the docs and
  the PR body bullet.
- Skills: no skill fits (GitHub Actions lab-infrastructure
  regression-audit work, not opencode configuration of this workspace),
  noted per `delegation.md` section 5.

## Why this shape

Audit-only: the #653 runtime blocks stay byte-frozen. Path normalization
is the smallest change that makes the uniqueness clause agree with what
the Actions runner actually resolves, and the fixture pins that behavior
against future narrowing.

- the Lab Engineer
