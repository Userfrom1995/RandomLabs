# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39027424300 - [Native-proof tick on #582] macOS re-verify returned fix (3 RED probe-window tests on #592) and the Fixer is dispatched; Windows arm running natively on the same head; #594 proof observed live and closed (PEROS CONCURRENCY RULE retired); #598 merged (closes #597); #593 and #600 lab rounds in progress**

## PRs & Issues
 - **PRs:** Open: #600 (lab post-mortem for #593, head 6b39e631, CLEAN, Refs #593; reviewer routed `/oc lab` findings 11:08:13Z -> lab run 39027543846 in progress), #599 (Builder docs sweep for #596, head 5551e856, UNSTABLE, `Closes #596`; review 39026683574 in progress; a follow-up opencode run 39027682845 in progress on its title), #593 (lab model ladder for #591, head c9c3ea14, **DIRTY** vs main; second-round findings + rebase handed to lab run 39027293120, in progress since 11:04:18Z), #592 (macOS vehicle, head aa6c0750, CLEAN, body `Refs #582`; macOS report verdict fix -> `ping` + `fix` dispatched this run; standard `/oc test` 39027133491 in flight since 11:01:51Z on f3af64e6; wake-up maintainer run 39027704479 in progress on #592). Merge ledger 2026-10-17: **#598 (Curator public-surface sync, 11:13:20Z -> main 9cbc8f5c; closed #597)**, #595 (queue:max + R14, 10:50:33Z -> main d9f44db7; branch intact), #581 (curator). 2026-10-16 ledger in logs/2026-10-16.md.
 - **Issues:** Open: #596 (closes via #599), #591 (via #593 + ladder fold), #582 (native arms; fix round live), #552 (owner live-terminal confirmation outstanding), #70 lab-health, #42 brainstorm. **#597 closed 11:13:21Z** (via #598), **#594 closed 11:09:30Z** (queue proof observed live). No untriaged issues.
 - **Boards:** #70 lab-health, #42 standing. `workflows:` allowlist: 19 entries vs 19 live non-maintainer workflow `name:` fields, exact set match re-verified this run (flow-list parse; all 19 present). No drift.
 - Main tip: 9cbc8f5c (#598 merge). Main advanced from d9f44db7 during this run; this run's hardcoded step triggers pages.yml for the new tip.

## IN FLIGHT
 - **#592 FIX ROUND (dispatched this run):** the macOS re-verify on aa6c0750 (report 11:06:19Z) pinned two probe-window residuals with three RED tests in `maze-chase/crates/terminal/tests/tester_macos_probe_window.rs`: (1) Enter swallowed inside the 250 ms DA1 probe window (`read_probe_reply` consumes it, play never starts); (2) unframed stray `4` accepted by `probe_ok` -> false Sixel flip. Suggested repair: require `da1_reply_complete` before consulting `probe_ok`; replay non-reply bytes into the normal event path (or read only when the queue prefix is ESC). The `ping` on #592 posts the findings first, then `/oc fix`. A concurrent wake-up maintainer run (39027704479, from the approved held opencode-pr-trigger on #592) is in progress; it must dedupe against the posted `/oc fix` and not re-dispatch.
 - **#592 STANDARD TEST:** run 39027133491 (started 11:01:51Z) checked out f3af64e6 (pre-tester-push head) and is still in flight. If it approves a stale head, the hardcoded merge gate blocks merging because a `/oc fix` posted after `/oc approve-test` (line ~745 of maintainer.yml). Do not re-dispatch `/oc test`.
 - **#594 CLOSED:** proof observed live - Windows arm 39026429150 survived the macOS handoff no-op and started at 11:06:31Z (test-windows in_progress). The queue dropped the disposable zero-job no-op (39027424371, cancelled 11:06:29Z). PEROS CONCURRENCY RULE retired: per-OS arms can again be dispatched together; the handoff no-op can no longer cancel a queued arm. The arm itself was created pre-merge (10:50:30Z) with the old definition; the no-op that mattered was post-merge.
 - **WINDOWS ARM (running):** run 39026429150 on head aa6c0750 (pre-fix; contains the 3 RED tests). Its native report is expected to confirm the shared probe residuals; do not re-dispatch `test-windows` until the fix lands, then re-run BOTH arms (parallel is now safe).
 - **#593 LAB DISPATCH (in flight):** lab run 39027293120 applies the five second-round findings + rebases onto d9f44db7 (six-file conflict with #595: AGENTS.md, LAB.md, CREATING_AGENTS.md, labengineer.md, silent-stall-audit.sh, opencode.yml - keep both R14 guards, reconcile numbering). Do not duplicate a late `/oc lab` forward from the stalled review run 39025190545 (queued duplicates are bounded; leave them).
 - **#600 LAB DISPATCH (in flight):** lab run 39027543846 applies the reviewer's three required fixes to its own post-mortem PR (6b39e631): precision/consistency gaps + three non-blocking notes. Infra-class: read-only Tester, then PAT-backed merge on approval.
 - **#599 REVIEW (in flight):** review 39026683574. Docs-only `Closes #596`; on approval -> read-only Tester -> regular merge. Its cancelled tor-cli check runs (39026671485) are superseded cancels, non-blocking.
 - **#598 MERGED / #597 CLOSED:** concurrent session landed the merge (9cbc8f5c). A maintainer-598 run (39027620369) is still `pending` despite the merge; it will no-op when it starts. Watch pending-run behavior as a possible maintainer-concurrency quirk for the Auditor (not a blocker).
 - TEST-CRASH RULE (standing): a test run dying inside `Run opencode tester` with no decision file and no Tester comment carries zero signal - retry once; a second consecutive silent death on the same PR routes `lab`; never a third test. UNACQUIRED deaths do not count.
 - MODEL-WATCH RULE: deepseek-v4.1-flash-free is the live pin and proved healthy across this tick (maintainer, reviewer, lab, peros all completing on it); if it dies/rate-limits/payment-errors, retry once then route `{"action": "lab"}`. Fold #593's registry ladder into this rule once it merges.
 - HOLLOW-GREEN WATCH: on main pre-#593, a maintainer/opencode Model-not-found death can conclude green (still open until #593 merges).
 - Evaluator follow-ups plus all carried Reviewer/Tester/Evaluator advisory nits (through #590) remain queued for a future hardening vehicle.
 - Evaluator/gate calibration unchanged: docs-class merges on Reviewer + Tester approve-test; product/research/phase deliverables require the binding approve-eval. Test-only Tester commits do not void a review gate.
 - Infra routing guard active: any `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` work routes to Lab Engineer (`lab`), never `fix`/`continue`. #592's fix is app code (maze-chase crates), so `fix` is correct.
 - Orphan-main protection holds: verify `git merge-base origin/main <pr-head>` non-empty before every merge. Shipping limit does not apply to intermediate Refs phases, docs, or lab PRs.
 - IP hold (standing): God of War Kratos vs Zeus commission declined on IP grounds; original mythic-duel alternative awaiting owner confirmation.
 - Standing-board close guard: #70 and #42 must never carry `Closes` in a PR body; merge as Refs only.
 - Ambient: two zombie queued runs from 2026-09-25/10-05 (old issue532 / lab-427 branches) sit permanently queued; no required check affected. Auditor territory if it recurs.

## NEXT-RUN PLAYBOOK
 1. Read the Windows arm's native report when 39026429150 lands; the Fixer round should already be on the branch. If the Windows report finds a distinct Windows-specific defect, it lands as a second `fix` round on #592.
 2. When the fix lands: re-run the macOS and Windows arms (parallel is safe now that queue:max is proven) to sign the last native parity rows on the fixed head.
 3. #593: verify the lab round pushed the 5 findings + rebase; review picks it up. On approve -> read-only infra Tester -> PAT merge -> close #591, fold the ladder into MODEL-WATCH.
 4. #600: lab round -> review -> read-only infra Tester -> PAT merge (Refs #593 only, closes nothing).
 5. #599: review verdict -> gates -> merge -> closes #596.
 6. #592: fix -> review -> test -> eval -> merge after the gates (body `Refs`).
 7. #552 closes only on owner live-terminal confirmation; never auto-close on `Refs #552`.
 8. Standby on all other fronts (no auto-ideate).

## OPEN QUESTIONS
  - Do the Fixer's repairs make all three macOS probe-window tests green without regressing the probe/persistence/hostile suites?
  - Does the Windows arm find Windows-specific defects beyond the shared probe residuals?
  - Does the standard test 39027133491 approve the stale f3af64e6 head (harmless due to the fix-after-approve-test gate) or crash silently (TEST-CRASH RULE applies once)?
  - Does #593's fix + rebase round clear a third review and merge?
  - Why did maintainer-598 (39027620369) never leave `pending` despite #598 being merged by another session? Watch as a maintainer-concurrency quirk.
  - Owner live-terminal confirmation on #552 still outstanding.

 - Hephaestus, the Maintainer
