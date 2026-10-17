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
  run inside R17 itself against the real script under realistic Actions env,
  across all three OS labels, so the audit owns the runtime behavior, not
  just the text form.
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
  asserted, sandbox outside the repo tree) requiring fail-closed behavior on
  the six failure classes above. Round 4 (fresh independent agent): found 11
  audit-green evasions, all closed. P1-P3: the poster could fingerprint the
  scrubbed test env (`GITHUB_ACTIONS`, `MOCK_REPORT`) or the production repo
  slug and exit 0 before posting; the functional test now runs with realistic
  non-credential Actions env and a case.cfg-driven mock (per-case behavior is
  read from a sandbox file, never env), and the poster is statically banned
  from `GITHUB_ACTIONS`/`MOCK_`/production-slug references. P4: a derived
  macOS signoff satisfied the substring grep; each OS case now must be its
  exact literal assignment line, and the functional test covers all three OS
  labels (13 runs). W1-W7: `run: >` folded headers (comments and invocation
  collapse into one comment line), post-step and job-defaults `shell:`
  overrides, a literal `TARGET`, and verify-step weakening (`if: false`,
  `continue-on-error`, renamed id leaving the gates dangling) were all closed
  with exact-form checks. The final R17 enforcement: exact uncommented
  `; then` guard lines; each guard's own block must reach a real `exit 1`
  before its `fi` with no nested `if`; the shared-script invocation must be
  the exact single line at the post step's own indentation; the post step
  must carry the exact name/id/gate/env/token sequence with no
  `continue-on-error`, exactly `run: |`, no shell/working-directory override,
  and the event's TARGET number; the post-step and forward gates must be
  exact whole lines; the arm must carry exactly one Post step and one Forward
  step, the Post step must precede the Forward step, and the forward gate must
  be the line immediately after the forward step's name (round 2: reordering
  or parking the gate line no longer greens the audit); the post run body must
  itself contain the exact invocation; the event-derived `TARGET` env is part
  of the post step's ordered env sequence, not a count-anywhere grep; guard
  failure blocks reject nested loops and function definitions (round-2 note
  N1); arm job defaults (if present) must be exactly
  `run: shell: bash`; the verify step must keep `id: verify-test` and
  `if: always()` with no failure mask or shell override; the arm must carry
  its actor-gate plus post-step `github.token` envs. The final 39-case matrix
  (M1-M11, X1-X7, Y1-Y10, Z1-Z4, P1-P4, W1-W7) trips R17 red on every case
  with the expected sub-flag; the baseline stays 17 passed, 0 failed. V2 (the
  verify step's final `exit 1` swapped for `exit 0`) remains a documented
  review-gated residual boundary: the verify run body cannot be functionally
  executed statically, so arbitrary control-flow edits inside it are caught
  by the review gate, not by this rule; a poster deliberately fingerprinting
  the sandbox path or the mock `gh` itself is likewise review-gated (path
  detection is unbounded static territory, while env-fingerprint detection is
  banned statically and defeated by the realistic functional env).
- Review round 2 (PR #609 finding F1 plus the in-pass recommendations): the
  forward-gate check was anchored to the forward step itself (the exact
  actor-gate + verify + findings-success condition must be the first line
  after the step name), each arm must carry exactly one Post step and one
  Forward step (a parked duplicate forward step trips
  `arm-<os>(forward-step-count=2,want=1)`), and the Post step must precede the
  Forward step (`arm-<os>(post-not-before-forward)`; a pure reorder used to
  green while the forward's findings gate evaluated before the findings step
  ran, so the report posted, the arm concluded green, and no trigger was ever
  forwarded). The post run body must itself contain the exact invocation (a
  comment-only body with the invocation parked in another step trips
  `arm-<os>(post-run-body-modified)`), and the event-derived `TARGET` check
  moved from a count-anywhere grep into the post step's ordered env sequence
  (a literal or relocated TARGET trips `arm-<os>(post-step-sequence-broken)`).
  The guard-block structural check also rejects nested `while`/`for`/`case`/
  `until` and function definitions inside a guard's failure block (round-2
  note N1), and the functional-sandbox comment now states that the realistic
  sandbox slug differs from production in the owner segment (note N3).
- Round-2 verification: `silent-stall-audit.sh` on the checked-out tree
  baseline 17 passed, 0 failed; a compact mutation matrix in a `/tmp` sandbox
  (copy of the tree, audit run per case) 9/9 as expected: F1a post/forward
  reorder, F1b findings clause dropped from the forward gate, F1c parked dead
  duplicate forward gate, H1 comment-only post body with the invocation parked
  in the verify step, H2 TARGET relocated out of the post env, N1 `while` loop
  inside the bot-author guard block, plus the round-1 B3 restore-gate
  dead-code and B4 weakened author comparison re-checked; each trips R17 red
  with its expected sub-flag while the baseline stays green.
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
- Subagent 3 (general; scope: fresh adversarial verification after the Z
  round, in isolated `/tmp` sandbox copies, read-only on the real repo):
  baseline 17/17 and functional-test liveness confirmed (a forced bot author
  and a `trap 'exit 0' EXIT` mutant both trip `functional-` sub-flags); found
  11 audit-green evasions (P1-P4: env/slug fingerprinting and a derived macOS
  signoff; W1-W7: folded `run:` header, post-step and job-defaults `shell:`
  overrides, literal `TARGET`, verify `if: false` / `continue-on-error` /
  renamed id) and confirmed V2 (verify run-body early `exit 0`) as the
  accepted review-gated residual. All P/W findings were closed by the primary
  as recorded above; the final matrix re-run trips on all of them.
- Primary verified itself: read every changed hunk, ran the audit before and
  after the tightening, sandboxed the restore step's three paths, exercised
  the poster's failure matrix, and ran the YAML/`bash -n`/em-dash/clean-tree
  checks before committing.
- Review-fix round (primary, this session): applied B1-B5 and N1, re-ran the
  audit on the committed tree (17 passed, 0 failed), then hardened R17
  through the independent-verifier rounds (X1-X3, then Y1/Y2/Y7-Y10, then
  Z1-Z4, then P1-P4/W1-W7) with exact-line gate assertions, an anchored
  fixed-indentation invocation assertion, a strict post-step sequence check,
  a post-run-body content check with exact `run: |` header and shell-override
  bans, a forward-step masking ban, unsafe job-defaults checks, verify-step
  id/gate/mask assertions, an exact TARGET-env check, exact per-OS signoff
  assignment lines, a poster harness-detection ban, structural guard-block
  `exit 1` checks, and an embedded functional poster test against an
  executable mock `gh` (credential env scrubbed, realistic Actions env,
  case.cfg-driven per-case behavior, interception asserted, sandbox outside
  the repo) covering 13 runs across all three OS labels, and re-ran the final
  39-case mutation matrix in a `/tmp` sandbox (baseline 17/17; every case
  trips R17 red with its expected sub-flag), plus workflow YAML parse,
  `bash -n` on both scripts, `shellcheck` on the poster, the stale-range
  sweep, and the no-em-dash check.
- Review-fix round 2 (primary, this session): applied review finding F1 plus
  the in-pass hardening to R17's forward/post assertions (anchored forward
  gate, step uniqueness and order, invocation required in the post run body,
  `TARGET` inside the post env sequence, nested-control-flow rejection in
  guard blocks, sandbox-slug wording), re-ran the audit on the checked-out
  tree (17 passed, 0 failed) and a compact 9-case mutation matrix in a `/tmp`
  sandbox (baseline plus eight mutations, each red with its expected
  sub-flag), then rebased the branch onto current `main` and re-ran the audit
  plus `bash -n` and the YAML parse on the rebased tree.
- Skills: no skill fits (GitHub Actions lab infrastructure and lab prompts,
  not opencode configuration of this workspace).

## Notes

- Review-gated residual boundary (V2): the verify step's own run body cannot
  be functionally executed statically, so an early `exit 0` inserted into it
  (or arbitrary reshuffling of a step's control flow that still passes every
  exact-form check) is caught by the review gate, not by R17. A poster
  deliberately fingerprinting the functional sandbox path or the mock `gh`
  itself is likewise review-gated (path-based detection is unbounded static
  territory); env-fingerprint detection is banned statically and defeated by
  the realistic functional env. The poster's runtime semantics, by contrast,
  are functionally tested inside R17.
- Residual: the poster trusts the head's copy when a head already carries
  `.github/scripts/post-peros-findings.sh`; a PR that breaks that script in a
  way its own review misses will fail the arm's post step red (fail closed,
  Maintainer triage), which is the intended behavior for infra PRs.
- Accepted review residuals (N2/N3) and round-2 notes: the poster compares
  the re-fetched body byte-exactly, so a GitHub-side whitespace or CRLF
  rewrite would fail the arm red (never green; the Windows prompt mandates
  LF), and the Windows agent `/tmp` path resolution (Git Bash mount vs
  native path) is a pre-existing exposure shared with the decision file and
  prompt-mitigated. Round-2 note N1 (nested loops/functions inside a guard
  block) is closed in the structural guard check; N2 (the functional mock
  ignores the comment id) stays accepted because a poster hardcoding a
  comment id still fails the body comparison red at runtime; N3 wording is
  corrected in the audit comment.
- No workflow file additions or renames, so the maintainer `workflows:`
  allowlist is untouched.

- the Lab Engineer
