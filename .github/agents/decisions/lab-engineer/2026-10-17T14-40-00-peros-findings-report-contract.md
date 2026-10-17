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
  tail, body mismatch) exit 1; only the verified path exits 0. The same
  failure classes (wrong author, unsigned report, missing report, tampered
  body with an intact sign-off tail, failed post, missing comment id) now
  run inside R17 itself against the real script, so the audit owns the
  runtime behavior, not just the text form.
- Restore step: sandboxed against an old head lacking the poster (restored
  from the workflow commit, exclude entry written) and a head where the
  poster is absent from both sources (fails closed).
- Audit: `silent-stall-audit.sh` baseline 17 passed, 0 failed; mutation
  matrix M1 (clear removed), M2 (post step removed), M3 (poster restore
  gate dead-coded with the archive line intact), M4 (findings requirement
  removed from verify), M5 (pre-post sign-off validation removed), M6
  (forward gate removed) each trips R17 red with the expected sub-flag.
  M4/M5 were found blind by the independent verifier and R17 was tightened
  before merge.
- Review round (PR #609 findings B1-B5): fixed the stale `R1-R16` range in
  the Tester prompt, added the missing R17 line to the `opencode.yml` audit
  enumeration, anchored the R17 poster-restore check to the restore gate
  form (`; then`, which the fetch pre-check's `&&` no longer satisfies),
  anchored the poster's bot-author, post-fetch sign-off, and body-equality
  checks to their exact comparison lines, and added the N1
  belt-and-suspenders per-arm assertions (the arm must carry two
  `GH_TOKEN: ${{ github.token }}` envs so a PAT slipped into the post step
  trips the audit). M3 (poster restore) was upgraded from removal to
  dead-coding the gate with the archive line intact, and M7-M11 were added:
  author comparison weakened, post-fetch sign-off check deleted, body-equality
  check deleted, post-step gate removed, and post-step token swapped to the
  owner PAT; each trips R17 red with the expected sub-flag on the tightened
  guard.
- Independent verification (subagent 2, adversarial): three rounds of
  mutation testing against the tightened R17. Round 1: all 11 review-round
  mutations red, and three blind spots found (X1 gate suffix `&& false`, X2
  guard `exit 1` replaced by a no-op, X3 commented invocation). Round 2:
  X1-X3 closed, but four further silent-capable evasions found (Y1 guard
  condition suffix, Y2 invocation wrapped in a dead conditional, Y7 gate
  parked on another step, Y9 unreachable `exit 1` behind a nested dead
  branch; plus Y6/Y7-style variants). Round 3: Z1 (early `exit 0` injected
  into the post step's run body), Z2 (`continue-on-error` on the forward
  step), Z3 (poster guards wrapped in a dead conditional), and Z4
  (`expected_body` clobbered to the fetched body) were found and all closed:
  the post run body may contain only comments and the exact invocation, the
  forward step must carry no `continue-on-error`, and a functional test now
  executes the real poster against an executable mock `gh` (interception
  asserted, live GitHub env scrubbed, sandbox outside the repo tree)
  requiring fail-closed behavior on the six failure classes above. The final
  R17 enforcement: exact uncommented `; then` guard lines; each guard's own
  block must reach a real `exit 1` before its `fi` with no nested `if`; the
  shared-script invocation must be the exact single line at the post step's
  own indentation; the post step must carry the exact
  name/id/gate/env/token sequence with no `continue-on-error`; the post-step
  and forward gates must be exact whole lines; the arm must carry its
  actor-gate plus post-step `github.token` envs. The final 28-case matrix
  (M1-M11, X1-X7, Y1-Y10, Z1-Z4) trips R17 red on every case with the
  expected sub-flag; the baseline stays 17 passed, 0 failed. V2 (the verify
  step's final `exit 1` swapped for `exit 0`) remains a documented
  review-gated residual boundary: the verify run body cannot be functionally
  executed statically, so arbitrary control-flow edits inside it are caught
  by the review gate, not by this rule.
- Static consistency: no stale `R1-R16` range labels remain (the Tester
  prompt and the `opencode.yml` enumeration were fixed in the review
  round); no remaining instruction to agents to post their own findings
  comment; the three restore-step bodies are byte-identical; no em dashes in
  the changed files.

## Delegation ledger

- Subagent 1 (general; scope: adversarial verification of the contract in
  /tmp copies, read-only on the real repo): baseline 17/17; mutation matrix
  M1/M2/M3/M6 red, M4/M5 blind (audit checks too weak), all 24 run blocks
  `bash -n` clean, poster adversarially reviewed over 25 mocked cases, static
  consistency clean. Its D1/D2 findings were fixed by tightening R17 (exact
  findings-requirement line per arm, pre-post sign-off validation marker),
  and M4/M5 then re-ran red with the expected sub-flags; D3 added the
  poster-restore-gate plus archive-line assertions, and the review round
  (findings B3) showed that gate anchor was also satisfied by the fetch
  pre-check's shared prefix, so it now requires the restore gate's `; then`
  form specifically.
- Subagent 2 (general; scope: independent adversarial re-verification of the
  tightened R17 in fresh /tmp copies, read-only on the real repo): baseline
  17/17; all 11 review-round mutations red with the expected sub-flags;
  `bash -n` clean on both scripts; no em dashes in the three new commits;
  found three additional blind spots (gate-suffix `&& false`, guard `exit 1`
  replaced by a no-op, commented invocation) that were all closed before
  handoff.
- Primary verified itself: read every changed hunk, ran the audit before and
  after the tightening, sandboxed the restore step's three paths, exercised
  the poster's failure matrix, and ran the YAML/`bash -n`/em-dash/clean-tree
  checks before committing.
- Review-fix round (primary, this session): applied B1-B5 and N1, re-ran the
  audit on the committed tree (17 passed, 0 failed), then hardened R17
  through the independent-verifier rounds (X1-X3, then Y1/Y2/Y7-Y10, then
  Z1-Z4) with exact-line gate assertions, an anchored fixed-indentation
  invocation assertion, a strict post-step sequence check, a post-run-body
  content check, a forward `continue-on-error` ban, structural guard-block
  `exit 1` checks, and an embedded functional poster test against an
  executable mock `gh` (env scrubbed, interception asserted, sandbox outside
  the repo), and re-ran the final 28-case mutation matrix in a `/tmp`
  sandbox (baseline 17/17; every case trips R17 red with its expected
  sub-flag), plus workflow YAML parse, `bash -n` on both scripts,
  `shellcheck` on the poster, the stale-range sweep, and the no-em-dash
  check.
- Skills: no skill fits (GitHub Actions lab infrastructure and lab prompts,
  not opencode configuration of this workspace).

## Notes

- Review-gated residual boundary (V2): the verify step's own run body cannot
  be functionally executed statically, so an early `exit 0` inserted into it
  (or arbitrary reshuffling of a step's control flow that still passes every
  exact-form check) is caught by the review gate, not by R17. The poster's
  runtime semantics, by contrast, are now functionally tested inside R17.
- Residual: the poster trusts the head's copy when a head already carries
  `.github/scripts/post-peros-findings.sh`; a PR that breaks that script in a
  way its own review misses will fail the arm's post step red (fail closed,
  Maintainer triage), which is the intended behavior for infra PRs.
- Accepted review residuals (N2/N3): the poster compares the re-fetched body
  byte-exactly, so a GitHub-side whitespace or CRLF rewrite would fail the
  arm red (never green; the Windows prompt mandates LF), and the Windows
  agent `/tmp` path resolution (Git Bash mount vs native path) is a
  pre-existing exposure shared with the decision file and prompt-mitigated.
- No workflow file additions or renames, so the maintainer `workflows:`
  allowlist is untouched.

- the Lab Engineer
