# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39044518139 - [#613 Curator PR triage: review live on `421ec42e`; #606 eval-APPROVED 9.86/10 and MERGED (main `de4e8f50`) by the handoff run; #610 fix / #609 lab / #612 self-dispatch all live; decisions []]**

## PRs & Issues
 - **Open PRs:** **#613** (Curator public-surface cleanup for #611, head `421ec42e`; review run 39044509187 live since 15:19:12Z; bot-actor red explained on-thread; `Fixes #611` closes on merge), **#610** (Windows tester vehicle for #582, head `bcad0f30`; fix round run 39044325631 live since 15:16:38Z + 2 queued duplicates FIFO; body verified `Refs #582`), **#609** (lab vehicle for #608, head `ea3c519f`; lab fix run 39042663843 live since 14:53:24Z; PAT-backed merge once green; `Closes #608`).
 - **#606 MERGED** 15:21:31Z (main tip `de4e8f50`, rebase; `Refs #582` kept) by the eval handoff run 39044552735 after `approve-eval` 9.86/10 (eval run 39043590288 success; live PTY 14/14). Post-merge Pages: dispatch 39044785814 in flight on `de4e8f50` (an earlier 15:22:44Z dispatch was superseded by pages' `cancel-in-progress` by design).
 - **#582 NATIVE ARMS:** macOS arm fix (#606) now on main; Windows arm fix pending on #610; parity rows flip only after #610 lands plus fresh loaded macOS + Windows re-runs (Windows E2E with the default harness, no workarounds).
 - **Issues:** **#612** [Infra] MSYS handoff mangling - UNTRIAGED (0 comments), owned by self-dispatch run 39044418093 (in progress since 15:17:56Z; expected to route `lab`; next tick verifies); **#611** Curator tracking (closes via PR #613, no separate triage); **#608** closes on #609 merge; **#582** parent; **#552** owner window (~Oct 23); **#605** CLOSED 15:14:17Z; #70/#42 standing boards.
 - **Boards/health:** allowlist self-audit exact both directions (19 entries vs 20 live `name:` fields, only `maintainer` absent, self-excluded). Held `action_required` runs: 0. Failure sweep last 100: exactly one - the documented bot-actor red 39044487755 on #613 (`pull_request`, explained); zero timed_out. Zombies: unchanged documented set (issue532 pr-trigger, lab-427 x3). Main tip `de4e8f50`.

## IN FLIGHT
 - **#613 REVIEW (39044509187):** approve -> auto `/oc test`; findings -> `fix` (public-surface files; NOT infra). Then test gate -> eval -> merge; `Fixes #611` closes #611.
 - **#610 FIX (39044325631 live 15:16:38Z):** on push -> `review` on the new head -> test gate -> eval; then Windows arm re-run to sign rows; drop the duplicated macOS commit at rebase time.
 - **#609 LAB FIX (39042663843 live 14:53:24Z, ~30 min in, inside timeout):** on push -> review round 2 -> read-only infra test -> PAT-backed merge (`Closes #608`).
 - **#606 POST-MERGE:** Pages deploy 39044785814 on `de4e8f50` in flight; next run confirms its conclusion (failed/absent -> `gh workflow run pages.yml`); plan the macOS parity-row fold + fresh macOS arm re-run after #610 lands.
 - **#612 SELF-DISPATCH (39044418093):** verify it routed `lab`; absent -> dispatch `lab` (MSYS_NO_PATHCONV/`--body-file` on the three peros forward steps + audit).
 - MSYS/MANGLED-HANDOFF CLASS: any future Windows arm handoff must read byte-exact `/oc ...`; recurrence -> `lab` (now tracked by issue #612).
 - FREETIER WATCH: one occurrence (run 39040486914, 14:23:07Z, 403 FreeTierError); no recurrence. Repeat -> `lab`.
 - TEST-CRASH RULE (standing): retry once; second consecutive silent death on same PR -> `lab`; never a third test.
 - MODEL-WATCH RULE (standing): pin `opencode/deepseek-v4.1-flash-free`; resolver + ladder; dead rung or better free model -> `lab`.
 - BOT-ACTOR CLASS (standing): documented red + on-thread explanation; no dispatch.
 - PERS REPORT CONTRACT: #609 carries the fix; until it lands, recover native reports from the arm's run log if missing.
 - Evaluator follow-ups, Tester R14 regex residuals, Reviewer flow-style note, advisory nits: queued for a future hardening vehicle.
 - Infra routing guard: anything touching `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` routes to `lab`, never `fix`/`continue`.
 - Orphan-main protection holds: verify `git merge-base origin/main <pr-head>` non-empty before every merge.
 - IP hold (standing): God of War commission declined; original mythic-duel alternative awaiting owner.
 - Standing-board close guard: #70 and #42 never carry `Closes`.
 - Ambient: maintainer concurrency bursts at 15:19-15:22 (workflow_run fan-out + eval handoff); documented single-slot superseding for `maintainer.yml`, queue:max for the comment cohort. Memory-write ordering left to the hardcoded commit steps; run markers disambiguate.

## NEXT-RUN PLAYBOOK
   1. #613: read the review verdict on `421ec42e`; approve -> Tester auto-forwards; findings -> `fix`; then test -> eval -> merge (`Fixes #611`).
   2. #610: read the Fixer push; dispatch `review` on the new head; standard test gate; then the Windows arm re-run to sign rows.
   3. #609: read the post-fix review verdict; approve -> read-only infra test -> PAT-backed merge (`Closes #608`).
   4. #612: verify the self-dispatch routed `lab`; absent -> dispatch `lab`.
   5. Pages: confirm 39044785814 (`de4e8f50`) concluded success; failed -> re-dispatch `gh workflow run pages.yml`.
   6. #606 post-merge: plan the parity-row fold + fresh macOS arm re-run once #610 lands.
   7. #552 owner confirmation outstanding (7-day human rule ~Oct 23).
   8. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
  - Does #613 clear review/test/eval and close #611?
  - Does the #610 fix round clear review/test/eval and turn the Windows RED test green natively?
  - Does #609 land the findings-report contract before the final native re-runs?
  - Does the #612 self-dispatch route `lab`, or does the next tick have to?
  - Does the post-merge Pages deploy for `de4e8f50` conclude clean?

 - Hephaestus, the Maintainer
