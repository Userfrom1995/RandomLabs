# STATE - Random factory checkpoint
 - **Updated: 2026-10-18 run 39087923668 (~01:53Z) (the 01:50:23Z `/oc maintainer` summon after the Council approved #631: #631 MERGED as `c672f443`, Pages re-dispatched, the verified-release Builder pass dispatched on #582; zero other dispatch).**
 - Prior checkpoint: run 39087675636 (~01:52Z, #635 build-PR review live).

## PRs & Issues
 - **#582 (parent tracker, RELEASE PASS DISPATCHED this run)**: `{"action":"build","issue":582}` posted as `/oc build this` by the hardcoded PAT step. Both native rows signed (macOS 39068848280 + merged #631; Windows 39082795458 + merged #632), both vehicles merged. Expect a release PR (`Closes #582`) that flips the `maze-chase/docs/parity.md` native-proof rows to signed and finalizes the release audit. On its merge: take the explicit #552 retirement step (parity doc rule) and verify #582 auto-closed.
 - **#635** (build PR for #634, `opencode/issue634-resize-reconcile`, head `3f4c3062`, MERGEABLE/CLEAN, 5 commits, +411/-1, `Closes #634`, no workflow files): review 39087655495 LIVE since 01:45:52Z on exactly this head. PATH: review verdict -> on approve the forward arms the Tester on the same head -> on the tester machine marker dispatch `{"action":"eval"}` -> on `approve-eval` MERGE (`--rebase`, branch kept) -> #634 auto-closes. Ignore stale verdicts if the head moves.
 - **#631 MERGED 01:51:48Z as `c672f443`** (rebased 9-commit replay; branch kept at `7879a8da`; content byte-identical; closed nothing - `Refs #582`).
 - **#634**: delivered via #635; closes on merge. **#612/#620/#622/#632/#633**: DONE.
 - **#552**: stays open until the #582 release PR merges, then the explicit Maintainer retirement step. Owner window ~Oct 23.
 - **Merged 2026-10-17/18:** #609, #617, #618, #613, #610, #624, #623, #627, #628, #614, #630, #633, #632, #622, #631. Main tip `c672f443`.
 - **RULE LABELS:** main = R1-R22.
 - **Held runs at survey:** 0 repo-wide (`status=action_required` total_count = 0).
 - **Failures:** exactly ONE in the last 100 runs: maintainer 39087469440 (01:42:41Z), the documented pre-#427 bot-actor `pull_request` arm on #635's first push; already triaged by the prior tick; no action.

## IN FLIGHT
 - **#582 RELEASE PASS DISPATCHED** (this run). Next tick: watch for the release PR; then the normal gate chain; after merge, the #552 retirement step.
 - **#635 REVIEW LIVE** (39087655495, started 01:45:52Z) on `3f4c3062`. Next tick: read the verdict.
 - **FREE-TIER WATCH (relaxed)**: no recurrence since the 00:55Z blip; treat as stable unless two consecutive arms reject.
 - **PRE-#427 ARM (standing observation)**: the bot-authored-PR `pull_request` arm reds by design (verify-step comment in maintainer.yml); owner closed the preflight workstream (#427 COMPLETED / #429 unmerged). Candidate for a future lab pass; no issue churn now.
 - Sibling concurrency: this run (39087923668) is the only live maintainer session; last-commit-wins on memory files.
 - **BACKLOG (low priority):** the audit's R15/R17/R20 functional mock harnesses are Ubuntu-only (MSYS portability FAILs when run manually on Windows; zero production impact). Bundle into a future lab dispatch; do not create issue churn.
 - PAGES WATCH (standing): after every main advance by my token (no push event fires), dispatch `pages.yml` on the new tip manually. Dispatched 39088015259 on `c672f443` (success). TEST-CRASH RULE (standing): retry once; second consecutive silent death -> lab. EXPECTED WRAPPER-PUSH NOISE (standing). SHALLOW-CLONE CAVEAT (standing, #602). Infra routing guard (standing): `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` -> lab only. #619 sweep guard (standing). #629 marker contract (standing). PAT merge sweep (standing): workflow-file PRs only. TRIGGER-COMMENT SAFETY (standing): bot comments must never contain a space immediately followed by the trigger prefix (opencode.yml's general-job gate is the spaced-prefix contains check); quote markers backticked so the preceding character is never a space.
 - IP hold (standing); Standing-board close guard #70/#42; shipping limit (not binding).

## NEXT-RUN PLAYBOOK
   1. #582: watch for the release PR from the Builder pass; then review -> Tester -> eval -> merge on `approve-eval`; after merge take the explicit #552 retirement step and verify #582 auto-closed.
   2. #635: read the review verdict on `3f4c3062`; on approve the forward arms the Tester on the same head; on the tester machine marker dispatch `{"action":"eval"}`; on `approve-eval` MERGE (`--rebase`, branch kept) and #634 auto-closes. Ignore stale verdicts if the head moves.
   3. Pages on every new main tip (manual dispatch when my token merged). #552 window ~Oct 23. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
  - Does the release pass find every parity row genuinely provable from the two native reports?
  - Does #635 clear review in one round?
  - Does the #582 release chain (build -> gates -> merge -> #552 retirement) complete in the next few ticks?

  - Hephaestus, the Maintainer
