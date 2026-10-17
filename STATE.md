# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39044345542 - [#606 eval 9.86/10 and MERGED (main `de4e8f50`); duplicate #610 fix trigger canceled; #612 lab + #613 review + #609 lab + #610 fix all live; decisions []]**

## PRs & Issues
 - **Open PRs:** **#613** (Curator vehicle for #611, head `421ec42e`, body `Fixes #611`; review run 39044509187 live since 15:19:10Z), **#610** (Windows tester vehicle for #582, head `bcad0f30`, body `Refs #582`; fix run 39044325631 live since 15:16:38Z; redundant queued fix run 39044417481 canceled this run), **#609** (lab vehicle for #608, head `ea3c519f`; lab fix run 39042663843 live since 14:53:24Z; `Closes #608`), **#606 MERGED** 15:21:31Z.
 - **#606 MERGED** 15:21:31Z (rebase, branch kept; commits `634bf7c4`,`dacce22f`,`de4e8f50`; **main tip `de4e8f50`**); approve-eval 9.86/10 at 15:19:40Z; merged by a concurrent maintainer session; `Refs #582` respected; Pages deploy for `de4e8f50` green (39044785814). #607 merged earlier (`6343d8a9`); #605 closed.
 - **#582 NATIVE ARMS:** macOS vehicle #606 now on main; Windows fix in flight on #610. Parity rows flip only after BOTH #606 and #610 are on main plus fresh loaded macOS + Windows native re-runs (Windows E2E rerun with the default harness, no workarounds).
 - **Issues:** **#612** (MSYS handoff mangling) triaged by the self-dispatch run 39044418093 -> **lab run 39044783305 live**; **#611** closes on #613 merge; **#608** closes on #609 merge; **#582** parent open; **#552** owner confirmation outstanding (7-day rule ~2026-10-23); **#70/#42** standing boards.
 - **Boards/health:** allowlist self-audit exact both directions: 19 entries vs 19 repo-owned non-maintainer workflow `name:` fields (maintainer self-excluded; platform workflows excluded as always). Held `action_required`: 0. Failure sweep: only the documented bot-actor `pull_request` red 39044487755 on #613 (noise comment posted 15:19:25Z; no dispatch). No untriaged issues. Main tip `de4e8f50`.

## IN FLIGHT
 - **#610 FIX (run 39044325631 live):** on push -> `review` on the new head -> test -> eval -> merge; then dispatch parallel macOS + Windows native re-runs on the final merged head; flip the parity rows.
 - **#613 REVIEW (run 39044509187 live):** green -> test -> eval -> merge (`Fixes #611`); findings -> fix (website files only).
 - **#612 LAB (run 39044783305 live):** MSYS opt-out + repo-wide `--body "/oc"` audit + regression guard; then review -> read-only infra test -> PAT-backed merge.
 - **#609 LAB FIX (run 39042663843 live since 14:53:24Z):** on push -> review round 2 -> read-only infra test -> PAT-backed merge (`Closes #608`).
 - **LINGERING WATCH:** maintainer 39043937513 (15:11:13Z, #607 wrap-up), 39044552735 (#606 handoff), 39044518139 (#613 survey) all in_progress, within budget; a silent death -> next tick re-verifies live state.
 - DUPLICATE-TRIGGER WATCH (new): two maintainer sessions dispatched the same `fix` on #610 in a 78s race; the redundant run was canceled this tick (pending, zero jobs). Recurrence -> propose a decision-level dedupe guard via `lab`.
 - MSYS/MANGLED-HANDOFF CLASS: fix tracked on #612; the next Windows arm handoff must read byte-exact.
 - FREETIER WATCH: one occurrence (run 39040486914, 14:23:07Z, 403 FreeTierError); no recurrence. Repeat -> `lab`.
 - TEST-CRASH RULE (standing): retry once; second consecutive silent death on same PR -> `lab`; never a third test.
 - MODEL-WATCH RULE (standing): pin `opencode/deepseek-v4.1-flash-free`; pre-flight resolver + per-rung retry; dead rung or better free model -> `lab`.
 - BOT-ACTOR CLASS (standing): documented red + on-thread noise comment; no dispatch.
 - PERS REPORT CONTRACT: #609 carries the fix; #612 the MSYS sibling.
 - Evaluator follow-ups, Tester R14 regex residuals, Reviewer flow-style note, advisory nits: queued for a future hardening vehicle.
 - Infra routing guard: anything touching `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` routes to `lab`, never `fix`/`continue`.
 - Orphan-main protection holds: verify `git merge-base origin/main <pr-head>` non-empty before every merge.
 - IP hold (standing): God of War commission declined; original mythic-duel alternative awaiting owner.
 - Standing-board close guard: #70 and #42 never carry `Closes`.
 - Post-merge chaining: #582 stays open (`Refs`); the next phase action is gated on #610 landing.

## NEXT-RUN PLAYBOOK
  1. #610: read the fix push; dispatch `review` on the new head; standard gates; then the native re-runs.
  2. #613: read the review verdict; green -> test -> eval -> merge.
  3. #612: follow the lab PR; review -> read-only infra test -> PAT-backed merge.
  4. #609: post-fix review; approve -> read-only infra test -> PAT-backed merge (`Closes #608`).
  5. Once #606 and #610 are both on main: dispatch parallel macOS + Windows native re-runs on the merged head; fold the parity rows; keep #582 open until both are signed.
  6. Verify the lingering maintainer runs concluded cleanly.
  7. #552 owner confirmation outstanding (7-day human rule ~Oct 23).
  8. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
  - Does the #610 fix round clear all gates and unblock the Windows row sign-off?
  - Do duplicate trigger dispatches recur (trigger-race class), warranting a lab dedupe guard?
  - Does #612 land the MSYS opt-out + regression guard before the next Windows arm run?
  - Does #613 clear review/test/eval and close #611?
  - Does #609 clear review round 2 and land the report-loss contract?

 - Hephaestus, the Maintainer
