# Decision: Per-OS findings-report file contract, posted and verified by the workflow, with audit rule R17

- **Decider:** the Lab Engineer (CTO)
- **Date:** 2026-10-17T14:40:00Z
- **Applies to:** issue #608 (per-OS tester findings report silently lost when the arm creates a PR)
- **Status:** accepted

## What was decided

The per-OS arms no longer depend on the opencode session's final message for
the findings report. Each arm session must write the COMPLETE signed report
to `/tmp/random-lab-findings.md`; the fail-closed verify step requires it
alongside the decision file (a missing artifact fails the run, exactly like
the decision-file guard); the shared script
`.github/scripts/post-peros-findings.sh` validates the report (non-empty, last
non-blank line is the arm's exact sign-off), posts it on the target with
`github.token` so it is authored by `github-actions[bot]`, re-fetches the
posted comment by id, and verifies authorship, the sign-off tail, and the
exact body; the decision forward is gated on that step's success, so an
unverified report can never conclude an arm green. The same shape applies to
all three arms (Linux, macOS, Windows), and the three tester prompts carry
the contract. Because per-OS arms check out PR heads that may predate the
poster, the existing issue #430 restore step now restores the poster from the
run's own workflow commit exactly as it does the vendored runner. Audit rule
R17 regression-guards the whole contract, including the older-head restore.

## Root cause

The wrapper posts the session's final message as a comment only when no PR is
created; a PR-creating run turns the final message into the PR body instead.
The macOS arm report (run 39036858261, PR #606, issue #582) existed only as
an intermediate session message and survived only in the run log, and the
Maintainer had to recover it by hand. A contract that depends on what the
opencode CLI does with the final message is not a contract; the report now
lives in a file the workflow owns end to end.

## Alternatives considered

1. Mechanically require the report to be the final message and verify a
   findings comment exists afterward. Rejected: a PR-creating run still turns
   the final message into the PR body, so the run would need post-hoc
   recovery; the file contract removes the dependency entirely.
2. Inline the posting/verification logic in each of the three arms. Rejected:
   triplication of security-sensitive verification; one shared script keeps a
   single audited implementation (R17 asserts it).
3. Enforce em dashes or report formatting inside the poster. Rejected as out
   of scope: an unsigned report fails closed, formatting is the prompt's job.

## Verification

- Static: all workflows parse (`yaml.safe_load`); `bash -n` on the poster and
  the audit script; all 24 `run:` blocks of `opencode-peros-test.yml`
  extracted and `bash -n` clean; `shellcheck` clean on the poster.
- Functional: poster exercised against a mocked `gh` across 25 cases; all
  failure paths (missing/empty/unsigned report, unknown OS, non-numeric
  target, post failure, missing id, re-fetch failure, wrong author, wrong
  tail, body mismatch) exit 1; only the verified path exits 0.
- Restore step: sandboxed against an old head lacking the poster (restored
  from the workflow commit, exclude entry written) and a head where the
  poster is absent from both sources (fails closed).
- Audit: `silent-stall-audit.sh` baseline 17 passed, 0 failed; mutation
  matrix M1 (clear removed), M2 (post step removed), M3 (poster restore
  removed), M4 (findings requirement removed from verify), M5 (pre-post
  sign-off validation removed), M6 (forward gate removed) each trips R17 red
  with the expected sub-flag. M4/M5 were found blind by the independent
  verifier and R17 was tightened before merge.
- Static consistency: no `R1-R16` labels remain; no remaining instruction to
  agents to post their own findings comment; the three restore-step bodies
  are byte-identical; no em dashes in the changed files.

## Delegation ledger

- Subagent 1 (general; scope: adversarial verification of the contract in
  /tmp copies, read-only on the real repo): baseline 17/17; mutation matrix
  M1/M2/M3/M6 red, M4/M5 blind (audit checks too weak), all 24 run blocks
  `bash -n` clean, poster adversarially reviewed over 25 mocked cases, static
  consistency clean. Its D1/D2 findings were fixed by tightening R17 (exact
  findings-requirement line per arm, pre-post sign-off validation marker),
  and M4/M5 then re-ran red with the expected sub-flags; D3 hardening (exact
  `need_poster` condition plus archive line) was also applied.
- Primary verified itself: read every changed hunk, ran the audit before and
  after the tightening, sandboxed the restore step's three paths, exercised
  the poster's failure matrix, and ran the YAML/`bash -n`/em-dash/clean-tree
  checks before committing.
- Skills: no skill fits (GitHub Actions lab infrastructure and lab prompts,
  not opencode configuration of this workspace).

## Notes

- Residual: the poster trusts the head's copy when a head already carries
  `.github/scripts/post-peros-findings.sh`; a PR that breaks that script in a
  way its own review misses will fail the arm's post step red (fail closed,
  Maintainer triage), which is the intended behavior for infra PRs.
- No workflow file additions or renames, so the maintainer `workflows:`
  allowlist is untouched.

- the Lab Engineer
