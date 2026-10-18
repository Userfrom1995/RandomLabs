# STATE - Random factory checkpoint
 - **Updated: 2026-10-18 run 39088426002 (~02:02Z) (the 01:59:00Z `/oc maintainer` summon on #635: all three round-1 findings applied and force-pushed, review round 2 live on `9a2c90bc`; the #582 release pass live; zero dispatch).**
 - Prior checkpoint: run 39087923668 (~01:53Z, #631 merged as `c672f443`, Pages re-dispatched, #582 release pass dispatched).

## PRs & Issues
 - **#582 (parent tracker, RELEASE PASS LIVE)**: the verified-release Builder pass (opencode 39088154516) IN PROGRESS since 01:54:22Z (build job agent step live at survey). Expect a release PR (`Closes #582`) flipping the `maze-chase/docs/parity.md` native-proof rows to signed and finalizing the release audit. On its merge: take the explicit #552 retirement step (parity doc rule) and verify #582 auto-closed.
 - **#635** (build PR for #634, `opencode/issue634-resize-reconcile`, head `9a2c90bc`, 8 commits, MERGEABLE, `Closes #634`, no workflow files): round-1 review (39087655495, verdict 01:56:07Z) found the PTY harness spawned the child into the test runner's session (outer-terminal size via `/dev/tty`); the Fixer applied all three findings as `beead099` / `b4bf46da` / `9a2c90bc`, rebased and force-pushed 01:58:40Z. Review round 2 (39088419251) LIVE since 01:58:57Z on exactly this head. PATH: verdict -> on approve the forward arms the Tester on the same head -> on the tester machine marker dispatch `{"action":"eval"}` -> on `approve-eval` MERGE (`--rebase`, branch kept) -> #634 auto-closes. Ignore stale verdicts if the head moves.
 - **#631 MERGED 01:51:48Z as `c672f443`** (branch kept at `7879a8da`; `Refs #582`, closed nothing).
 - **#634**: delivered via #635; closes on merge. **#612/#620/#622/#632/#633**: DONE.
 - **#552**: stays open until the #582 release PR merges, then the explicit Maintainer retirement step. Owner window ~Oct 23.
 - **Merged 2026-10-17/18:** #609, #617, #618, #613, #610, #624, #623, #627, #628, #614, #630, #633, #632, #622, #631. Main tip `c672f443`.
 - **RULE LABELS:** main = R1-R22.
 - **Held runs at survey:** 0 repo-wide (`status=action_required` total_count = 0).
 - **Failures:** ZERO in the last 100 runs (the 01:42Z pre-#427 arm has aged out of the window); no action.

## IN FLIGHT
 - **#635 REVIEW ROUND 2 LIVE** (39088419251, started 01:58:57Z) on `9a2c90bc`. Next tick: read the verdict.
 - **#582 RELEASE PASS LIVE** (39088154516, since 01:54:22Z). Next tick: watch for the release PR.
 - **FREE-TIER WATCH (relaxed)**: no recurrence since the 00:55Z blip; treat as stable unless two consecutive arms reject.
 - **PRE-#427 ARM (standing observation)**: the bot-authored-PR `pull_request` arm reds by design (verify-step comment in maintainer.yml); owner closed the preflight workstream (#427 COMPLETED / #429 unmerged). Candidate for a future lab pass; no issue churn now.
 - Sibling concurrency: this run (39088426002) is the only live maintainer session; the live memory branch head (6f8f7b9b) was byte-identical to the bundle; last-commit-wins on memory files.
 - **BACKLOG (low priority):** the audit's R15/R17/R20 functional mock harnesses are Ubuntu-only (MSYS portability FAILs when run manually on Windows; zero production impact). Bundle into a future lab dispatch; do not create issue churn.
 - Zombie queued runs (pre-existing, zero impact): four 2026-09-25/2026-10-05 `queued` leftovers on dead branches (`opencode/lab-427-*`, `opencode/issue532-*`), each in its own group; blocks nothing current.
 - PAGES WATCH (standing): after every main advance by my token (no push event fires), dispatch `pages.yml` on the new tip manually; green on `c672f443` (39088425237). TEST-CRASH RULE (standing): retry once; second consecutive silent death -> lab. EXPECTED WRAPPER-PUSH NOISE (standing). SHALLOW-CLONE CAVEAT (standing, #602). Infra routing guard (standing): `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` -> lab only. #619 sweep guard (standing). #629 marker contract (standing). PAT merge sweep (standing): workflow-file PRs only. TRIGGER-COMMENT SAFETY (standing): bot comments must never contain a space immediately followed by the trigger prefix (opencode.yml's general-job gate is the spaced-prefix contains check); quote markers backticked so the preceding character is never a space.
 - IP hold (standing); Standing-board close guard #70/#42; shipping limit (not binding).

## NEXT-RUN PLAYBOOK
   1. #635: read the round-2 verdict on `9a2c90bc`; on approve the forward arms the Tester on the same head; on the tester machine marker dispatch `{"action":"eval"}`; on `approve-eval` MERGE (`--rebase`, branch kept) and #634 auto-closes. Ignore stale verdicts if the head moves.
   2. #582: watch for the release PR; then review -> Tester -> eval -> merge on `approve-eval`; after merge take the explicit #552 retirement step and verify #582 auto-closed.
   3. Pages on every new main tip (manual dispatch when my token merged). #552 window ~Oct 23. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
  - Does #635 clear review round 2 with the PTY controlling-terminal harness fix verified under a live terminal?
  - Does the #582 release pass produce a complete parity-row ledger and a `Closes #582` PR?
  - Does the #582 release chain (build -> gates -> merge -> #552 retirement) complete in the next few ticks?

  - Hephaestus, the Maintainer
