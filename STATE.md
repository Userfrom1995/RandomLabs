# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39026433581 - [Curator sync merged] #598 merged at 11:13:20Z (9cbc8f5c, rebase) after Reviewer + Tester approvals; #597 closed. #595 queue:max verified live on main; #594 closed at 11:09:30Z on the live proof (Windows arm survived + test-windows started 11:06:31Z). #592 mac arm returned a FIX verdict (3 failing regression tests at aa6c0750); every other lane in flight.**

## PRs & Issues
 - **PRs:** Open: #600 (harness-isolation post-mortem for #593, head 6b39e631; review required findings -> lab fix 39027543846 in flight), #599 (docs sweep for #596, head 5551e856; 2 blocking review findings -> fix 39027682845 in flight), #593 (ladder + loud failure, head c9c3ea14, DIRTY over d9f44db7; lab fix round 2 in flight = 39027293120, manual forward of the five round-2 findings + rebase instruction; stalled review run 39025190545 may emit a duplicate forward at its 90-minute timeout ~12:01Z), #592 (macOS vehicle, head aa6c0750 = 3 failing regression tests pushed by the macOS arm's FIX verdict; maintainer 39027704479 in flight owns the next fix dispatch). Merged today: #598 (Curator sync, this run, 11:13:20Z, merge commit 9cbc8f5c), #595 (peros queue:max + R14), #590, #589, #588, #587, #586, #585, #584, #583 (maze-chase phases), #581 (curator). Full ledger in logs/2026-10-16.md.
 - **Issues:** Open: #596 (closes via #599), #591 (closes via #593 + ladder fold), #582 (macOS arm found residuals; fix cycle on #592; Windows arm 39026429150 running on aa6c0750), #552 (owner live-terminal confirmation outstanding), #70 lab-health, #42 brainstorm. Closed today: #597 (via #598, 11:13:21Z), #594 (live proof, 11:09:30Z). No untriaged issues.
 - **Boards:** #70 lab-health, #42 standing. `workflows:` allowlist: 19 entries vs 19 live non-maintainer workflow `name:` fields, exact set match re-verified this run. No drift.
 - Main tip: 9cbc8f5c (the #598 rebase merge, 11:13:20Z). The post-agent PAT step re-triggers Pages on the advance.

## IN FLIGHT
 - **#598 MERGED (95485bb0 -> 9cbc8f5c).** Reviewer round-2 approve 10:56:21Z, Tester approve-test 11:09:27Z, merged 11:13:20Z; branch intact; `Fixes #597` closed #597. Consequences: main advanced; #599's and #592's fixes must rebase over 9cbc8f5c.
 - **#594 CLOSED (live proof).** Windows arm 39026429150 (created pre-merge 10:50:30Z under the old config) survived the 11:06:24Z handoff no-op arrival and started test-windows at 11:06:31Z after macOS completed at 11:06:29Z. Recorded nuance: the no-op itself (39027424371) was cancelled at 11:06:29Z under the final pre-fix run's single-slot semantics during the mixed-config transition. Informational follow-up: the first all-post-fix pairwise dispatch should show zero cancellations at promotion.
 - **#592 (macOS vehicle, aa6c0750):** macOS re-verify returned a FIX verdict at 11:06:19Z: two probe-window residuals reproduced; three failing regression tests pushed (aa6c0750). Maintainer 39027704479 in flight (from `/oc maintainer` 11:10:45Z) owns the fix dispatch; after the fix lands, re-run the native arms pairwise (mac first, then Windows after the mac handoff; queue:max now protects the queued arm).
 - **#593 (ladder, c9c3ea14, DIRTY):** Lab fix round 2 in flight (39027293120, forwarded 11:04:15Z: apply the five round-2 findings + rebase over main). The stalled review run 39025190545 (agent step hung since 10:31Z; findings posted 10:47:48Z) may emit a duplicate `/oc lab` at timeout (~12:01Z); dedupe then. On approve -> read-only infra Tester -> PAT-backed merge -> close #591; fold the ladder into MODEL-WATCH.
 - **#599 (docs sweep for #596, 5551e856):** 2 blocking review findings -> fix 39027682845 in flight. Rebase over 9cbc8f5c when it pushes.
 - **#600 (harness-isolation post-mortem for #593, 6b39e631):** review required findings -> `/oc lab` 39027543846 in flight. Infra PR: on approve the read-only Tester gates, then the PAT-backed merge sweep.
 - **#582:** parent tracker; the Windows arm 39026429150 is running the native test on aa6c0750; native rows remain open (mac arm found new residuals; Windows result pending).
 - TEST-CRASH RULE (standing): a test run dying inside `Run opencode tester` with no decision file and no Tester comment carries zero signal - retry once; a second consecutive silent death on the same PR routes `lab`; never a third test. UNACQUIRED deaths do not count.
 - MODEL-WATCH RULE: deepseek-v4.1-flash-free is the live pin; if it dies/rate-limits/payment-errors, retry once then route `{"action": "lab"}`. Fold #593's registry ladder into this rule once it merges.
 - HOLLOW-GREEN WATCH: on main still pre-#593, a maintainer/opencode Model-not-found death can conclude green; #593 closes this on the maintainer + general arms.
 - Evaluator follow-ups plus all carried Reviewer/Tester/Evaluator advisory nits (through #600) remain queued for a future hardening vehicle. The Curator's carried list (Evaluator in rosters/quickstarts, actor-write-gate.sh in the scripts summary, archive count, project-internal ledger drift, AGENTS/LAB pre-change cadence wording) is noted on #598's merge comment for the next Curator audit or an infra pass.
 - Evaluator/gate calibration unchanged: docs-class merges on Reviewer + Tester approve-test; product/research/phase deliverables require the binding approve-eval. Test-only Tester commits do not void a review gate.
 - Infra routing guard active: any `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` work routes to Lab Engineer (`lab`), never `fix`/`continue`.
 - Orphan-main protection holds: verify `git merge-base origin/main <pr-head>` non-empty before every merge. Shipping limit does not apply to intermediate Refs phases, docs, or lab PRs.
 - IP hold (standing): God of War Kratos vs Zeus commission declined on IP grounds; original mythic-duel alternative awaiting owner confirmation.
 - Standing-board close guard: #70 and #42 must never carry `Closes` in a PR body; merge as Refs only.
 - Ambient: two zombie queued runs from 2026-09-25/10-05 (old issue532 / lab-427 branches) sit permanently queued; no required check affected. Auditor territory if it recurs.

## NEXT-RUN PLAYBOOK
 1. #593: watch the lab fix round (rebase + five findings); dedupe any duplicate `/oc lab` emitted by the stalled review run's timeout (~12:01Z). Approve -> read-only Tester -> PAT merge -> close #591, fold the ladder into MODEL-WATCH.
 2. #592: verify the maintainer run dispatched the fix; after the fixer pushes, dispatch the native re-proof pairwise (mac first; Windows after the mac handoff passes; queue:max now protects the queued arm). Then review -> test -> eval -> merge (body Refs).
 3. #599: fix round -> re-review -> gates -> merge -> closes #596.
 4. #600: lab fix -> re-review (infra: read-only Tester) -> PAT-backed merge.
 5. #582: Windows arm result; fold into the native rows; the epic closes only when the parity rows are proven.
 6. #552 closes only on owner live-terminal confirmation; never auto-close on `Refs #552`.
 7. First all-post-fix pairwise per-OS dispatch: confirm zero cancellations at promotion (formal seal of the #594 nuance).
 8. Standby on all other fronts (no auto-ideate).

## OPEN QUESTIONS
 - Does the stalled #593 review run complete or time out at ~12:01Z with a duplicate `/oc lab` forward?
 - Does the all-post-fix pairwise replay show a fully clean queue (no promotion-time cancellation)?
 - Do the mac-residual fixes on #592 land cleanly and pass both native arms on re-run?
 - Do #599's and #600's fix rounds clear their re-reviews?
 - Owner live-terminal confirmation on #552 still outstanding.

 - Hephaestus, the Maintainer
