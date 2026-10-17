# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39044418093 - [#612 MSYS handoff-mangling issue routed to `lab` (self-triage tick); #606 eval APPROVED 9.86/10 with the merge owned by handoff run 39044552735; #613 Curator PR review live; decisions [lab #612]]**

## PRs & Issues
 - **Open PRs:** **#613** (Curator vehicle for #611, head `421ec42e`; body `Fixes #611`; review run 39044509187 live since 15:19:10Z; curator schedule run 39043911837 wrapping up), **#610** (Windows tester vehicle for #582, head `bcad0f30`; fix run 39044325631 in progress since 15:16:38Z; duplicate fix run 39044417481 queued behind it; body carries `Refs #582`), **#606** (macOS tester vehicle for #582, head `cbf94123`; **eval APPROVED 9.86/10** 15:19:40Z; merge owned by handoff run 39044552735 since 15:19:45Z), **#609** (lab vehicle for #608, head `ea3c519f`; lab fix run 39042663843 in progress since 14:53:24Z; PAT-backed merge once green; `Closes #608`).
 - **#607 MERGED** 15:13:02Z as `6343d8a9` (main tip); **#605 CLOSED**. Merger run 39043937513 still in_progress at survey (wrap-up; watch for a timeout red).
 - **#582 NATIVE ARMS:** macOS done (#606 fix, eval APPROVED; merge pending), Windows done natively -> PR #610 (fix live). Parity rows flip only after #606 + #610 land plus fresh macOS + Windows re-runs (Windows E2E rerun with the default harness, no workarounds).
 - **Issues:** **#612 NEW (self-triage target -> `lab` dispatched this run)**: MSYS path conversion mangles the Windows arm handoff (`C:/Program Files/Git/oc maintainer`); fix = `MSYS_NO_PATHCONV`/`--body-file` + repo-wide audit of `gh ... --body` `/oc` sites + regression guard; NOT covered by #609. **#611** closes on #613 merge. **#608** closes on #609 merge. **#582** parent; **#552** owner confirmation outstanding (7-day rule ~2026-10-23); **#70/#42** standing boards.
 - **Boards/health:** allowlist self-audit exact both directions: 19 entries vs 20 live `name:` fields, only `maintainer` absent (self-excluded). Held `action_required`: 0 (3 on #613's branch swept by concurrent runs' PAT steps). Failure sweep last 100: only documented classes (cancelled supersedes, bot-actor red 15:08:56Z explained, Pages cancelled-superseded). Queued zombies: documented set + curator skip-only pendings. Main tip `6343d8a9` ls-remote-verified.

## IN FLIGHT
 - **#612 LAB (dispatched this run):** `/oc lab` on the MSYS handoff defect; expect opt-out + repo-wide audit + regression guard; then review -> read-only infra test -> PAT-backed merge.
 - **#606 MERGE (owned by run 39044552735):** approve-eval landed; handoff run merges `--rebase` (branch kept, no closure, `Refs #582`). Watch: if it dies, the schedule tick or next run merges.
 - **#613 REVIEW (run 39044509187 live):** approve -> test -> eval -> merge (`Fixes #611`); findings -> fix (website files only, not infra).
 - **#610 FIX (run 39044325631 live):** on push -> `review` on the new head -> test -> eval -> merge; then the Windows arm re-run to sign rows. WATCH: duplicate fix run 39044417481 queued (double `/oc fix` residual); if it re-runs the gate chain on an unchanged tree, note it for a future duplicate-trigger guard.
 - **#609 LAB FIX (run 39042663843 live):** on push -> review round 2 -> read-only infra test -> PAT-backed merge (`Closes #608`).
 - PAGES FRESHNESS: deploys 39044345749 + 39044424972 succeeded on main; previews staged for all open PRs; no action.
 - MSYS/MANGLED-HANDOFF CLASS (watch): any future Windows arm handoff comment must read byte-exact; fix tracked on #612.
 - FREETIER WATCH: one occurrence (run 39040486914, 14:23:07Z, 403 FreeTierError); no recurrence. Repeat -> `lab`.
 - TEST-CRASH RULE (standing): retry once; second consecutive silent death on same PR -> `lab`; never a third test.
 - MODEL-WATCH RULE (standing): pin `opencode/deepseek-v4.1-flash-free`; resolver + ladder; dead rung or better free model -> `lab`.
 - BOT-ACTOR CLASS (standing): documented red + on-thread explanation; no dispatch.
 - PERS REPORT CONTRACT: #609 carries the fix; #612 carries the MSYS sibling.
 - Evaluator follow-ups, Tester R14 regex residuals, Reviewer flow-style note, advisory nits: queued for a future hardening vehicle.
 - Infra routing guard: anything touching `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` routes to `lab`, never `fix`/`continue`.
 - Orphan-main protection holds: verify `git merge-base origin/main <pr-head>` non-empty before every merge.
 - IP hold (standing): God of War commission declined; original mythic-duel alternative awaiting owner.
 - Standing-board close guard: #70 and #42 never carry `Closes`.
 - Ambient: 4-5 concurrent maintainer runs 15:11-15:19 (burst fan-out), each on a distinct lane; run 39043937513 lingering in_progress since 15:11 (watch).

## NEXT-RUN PLAYBOOK
  1. #612: verify the lab run is live; absent/dead -> dispatch `lab`; drive its PR to review -> infra test -> PAT merge.
  2. #606: confirm the merge landed from run 39044552735 (rebase, branch kept, `Refs #582`); Pages freshness check.
  3. #613: read the review verdict; on green drive test -> eval -> merge.
  4. #610: read the fix push; dispatch `review` on the new head; standard gates; then the Windows arm re-run.
  5. #609: post-fix review -> read-only infra test -> PAT-backed merge (`Closes #608`).
  6. Watch run 39043937513 lingering; watch the duplicate fix rerun on #610.
  7. #552 owner confirmation outstanding (7-day human rule ~Oct 23).
  8. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
  - Does the lab land the MSYS opt-out + repo-wide audit on #612 before the next Windows arm run?
  - Does #606 merge cleanly from its handoff run?
  - Does #613 clear review/test/eval and close #611?
  - Does the #610 fix round clear all gates and unblock the Windows row sign-off?
  - Does the duplicate fix run on #610 cause a redundant gate chain?

 - Hephaestus, the Maintainer
