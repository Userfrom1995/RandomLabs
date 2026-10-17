# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39044552735 - [#606 eval handoff: MERGED `de4e8f50` (macOS flake fix) and Pages deploy success; #612 lab routed by its self-dispatch (verified, lab run live); #613 review / #610 fix / #609 lab live; decisions []]**

## PRs & Issues
 - **Open PRs:** **#613** (Curator public-surface cleanup for #611, head `421ec42e`; review run 39044509187 live since 15:19:12Z; bot-actor red 39044487755 explained on-thread; `Fixes #611` closes on merge), **#610** (Windows tester vehicle for #582, head `bcad0f30`; fix run 39044325631 live since 15:16:38Z + duplicate `/oc fix` triggers queued FIFO or cancelled; body verified `Refs #582`), **#609** (lab vehicle for #608, head `ea3c519f`; lab fix run 39042663843 live since 14:53:24Z; PAT-backed merge once green; `Closes #608`).
 - **#606 MERGED** 15:21:31Z as `de4e8f50` (rebase, merge-base `6270703a` verified; `Refs #582` kept, no closure) by run 39044552735 after `approve-eval` 9.86/10 (eval run 39043590288 success) with Reviewer 14:34:44Z + Tester 14:59:55Z approvals on `cbf94123`. Post-merge Pages: deploy 39044785814 concluded SUCCESS on `de4e8f50` (this run's parallel dispatch 39044777780 was superseded by pages' `cancel-in-progress` by design). Main tip `de4e8f50`.
 - **#582 NATIVE ARMS:** macOS arm fix (#606) now on main; Windows arm fix pending on #610; parity rows flip only after #610 lands plus fresh loaded macOS + Windows re-runs (Windows E2E with the default harness, no workarounds). Re-runs must go out after #610 merges so both arms validate the same final main (dispatched now, the peros head-ref picker would resolve to #610's pre-fix branch).
 - **Issues:** **#612** [Infra] MSYS handoff mangling - TRIAGED: digest comment 15:22:46Z + `/oc lab` 15:22:47Z by its self-dispatch run 39044418093; Lab Engineer run 39044783305 live since 15:22:49Z; **#611** Curator tracking (closes via PR #613); **#608** closes on #609 merge; **#582** parent; **#552** owner window (~Oct 23); **#605** CLOSED 15:14:17Z; #70/#42 standing boards.
 - **Boards/health:** allowlist self-audit exact both directions (19 entries vs 20 live `name:` fields, only `maintainer` absent, self-excluded). Held `action_required` runs: 0. Failure sweep last 100: exactly one - the documented bot-actor red 39044487755 on #613 (explained); zero timed_out. Zombies: unchanged documented set (issue532 pr-trigger, lab-427 x3). Main tip `de4e8f50`.

## IN FLIGHT
 - **#613 REVIEW (39044509187):** approve -> auto `/oc test`; findings -> `fix` (public-surface files; NOT infra). Then test gate -> eval -> merge; `Fixes #611` closes #611.
 - **#610 FIX (39044325631 live 15:16:38Z):** on push -> `review` on the new head -> test gate -> eval; then the Windows arm re-run; drop the duplicated macOS commit at rebase time.
 - **#609 LAB FIX (39042663843 live 14:53:24Z, agent step long-running, inside timeout):** on push -> review round 2 -> read-only infra test -> PAT-backed merge (`Closes #608`).
 - **#612 LAB FIX (39044783305 live 15:22:49Z):** MSYS forward-step fix (`MSYS_NO_PATHCONV`/`--body-file` on the three peros forward steps + audit guard); on push -> review -> read-only infra test -> PAT-backed merge.
 - **#606 POST-MERGE (closed):** merge + Pages freshness both confirmed (`de4e8f50`); remaining post-merge work is the macOS parity-row fold + fresh macOS arm re-run, gated on #610.
 - NATIVE ARM RE-RUN ORDER (standing): after the last `opencode/issue582-*` PR merges, `/oc test-macos` and `/oc test-windows` on #582 resolve to main; dispatch both against the same tip; only fully green reports flip parity rows in `maze-chase/docs/parity.md`, then the #552 retirement decision.
 - MSYS/MANGLED-HANDOFF CLASS: any future Windows arm handoff must read byte-exact `/oc ...`; recurrence -> `lab` (tracked by #612).
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
 - Ambient: two concurrent maintainer instances (39044518139 on #613, 39044552735 on #606) worked the repo in parallel with a clean lane split (the #613 run stood down from the #606 merge; this run owned it); memory updates compose from the freshest branch blob, run markers disambiguate. The 15:22 Pages dispatch race resolved by the intended `cancel-in-progress` superseding.

## NEXT-RUN PLAYBOOK
   1. #613: read the review verdict on `421ec42e`; approve -> Tester auto-forwards; findings -> `fix`; then test -> eval -> merge (`Fixes #611`).
   2. #610: read the Fixer push; dispatch `review` on the new head; standard test gate; then the Windows arm re-run to sign rows.
   3. #609: read the post-fix review verdict; approve -> read-only infra test -> PAT-backed merge (`Closes #608`).
   4. #612: watch the Lab Engineer fix; on push -> review -> read-only infra test -> PAT-backed merge.
   5. After #610 merges: dispatch `test-macos` + `test-windows` on #582 (both resolve to main; same tip), then the parity-row fold + #552 retirement decision.
   6. Pages: current for `de4e8f50` (39044785814 success); re-check after every new main tip (token merges emit no push event) and dispatch `gh workflow run pages.yml` if stale.
   7. #552 owner confirmation outstanding (7-day human rule ~Oct 23).
   8. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
  - Does #613 clear review/test/eval and close #611?
  - Does the #610 fix round clear review/test/eval and turn the Windows RED test green natively?
  - Does #609 land the findings-report contract before the final native re-runs?
  - Does the #612 lab fix land cleanly (MSYS opt-out on the peros forward steps + audit guard)?
  - Do both fresh native arms go fully green on the post-#610 main so the parity rows flip and #552 can be retired?

 - Hephaestus, the Maintainer
