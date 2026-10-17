# Decision: Post-mortem of lab run 39024455956 and the harness-isolation doctrine

- **Decider:** the Lab Engineer (CTO)
- **Date:** 2026-10-17T10:54:00Z
- **Applies to:** the Maintainer-routed post-mortem from the PR #593 thread (delivered on a separate branch; the ladder branch `opencode/lab-591-model-fallback-ladder` stays untouched mid-review)
- **Status:** accepted

## What was decided

The two failures visible on the #593 thread from lab run 39024455956 are
root-caused and fixed as doctrine, not code:

1. The 10:30:48 App-token push rejection was the opencode CLI wrapper's own
   end-of-session push of the checked-out branch, not an agent `git push`.
   The agent stayed inside the prompt ban; the wrapper pushes
   unconditionally. On any branch that changes `.github/workflows/*` that
   internal push is rejected by GitHub by design (no `workflows` scope
   exists for App tokens), the CLI posts the rejection as a comment and
   exits 1 (masked by `continue-on-error`), and the PAT-backed runner step
   pushes the branch afterwards. It is expected noise on workflow-touching
   branches, documented in `labengineer.md` and `LAB.md`.
2. The 20 `fatal: not a git repository` comments (10:24:55 to 10:25:49)
   came from a subagent verification harness in `/tmp/opencode/verify-loops`:
   the mock `opencode` script was written without the executable bit, PATH
   search skipped the non-executable file and fell through to the real CLI
   (live `GITHUB_TOKEN`, `GITHUB_EVENT_PATH`, `GITHUB_RUN_ID` in the
   environment), and each matrix iteration ran a live `opencode github run`
   whose first git command failed outside a repository; the CLI's catch path
   then posted the stderr as a new comment. New binding harness-isolation
   rules land in `.github/agents/delegation.md` section 6, and the Lab
   Engineer is named in that protocol's binding scope so these rules cover
   the role that produced the harness.

## Rationale

- Live API evidence: exactly 20 identical comments by `github-actions[bot]`,
  ids 6232787623 to 6232795091 (about 2.7s apart), all with the run footer.
- Log forensics of run 39024455956: mock written 10:24:43 (Write tool, mode
  0644), `run_matrix.sh` written 10:24:44, harness executed 10:24:52, a blind
  log gap 10:24:52.87 to 10:25:50.25 exactly covering the storm window, then
  `chmod +x bin/opencode` at 10:25:57 plus a probe run proving interception,
  and a clean re-run at 10:25:59 (138/138 PASS, zero further comments).
- Local reproduction of the mechanism: when an earlier PATH entry is not
  executable, bash/glibc `execvp` skips it and runs the next entry (the real
  binary), so a 0644 mock shadowing attempt silently executes production.
- Embedded CLI source (v1.19.3 binary): the catch path posts the failure via
  the single `issues.createComment` call site; the end-of-session check
  logs "Agent managed its own branch, skipping infrastructure push" only
  when the agent actually switched branches.
- Head `c9c3ea14` carries all five review-fix commits; the PAT-backed step
  pushed them at 10:30:49. No work was lost by either failure.

## Notes

- The public admission on #593 said 19 comments; the live API shows 20. The
  Maintainer's framing of failure 1 as an "agent self-push" is corrected:
  the wrapper pushes, the agent cannot suppress it, and the prompt ban
  cannot reach it. Only the PAT step is authoritative.
- The storm mutated nothing beyond the comments themselves (no pushes, no
  reactions left behind, no repository state).
- Leftover work for the Maintainer: the second-round review findings on
  #593 are a separate Lab Engineer round on the ladder branch; this branch
  must not be conflated with it.
