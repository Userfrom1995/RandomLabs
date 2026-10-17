# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39028577133 - [self-triage #601 tick] #600 MERGED (rebase -> main 0c4fbe5a); #601 lab dispatch DELIBERATELY SEQUENCED behind the #593 merge (file overlap); #593 lab round still in flight (Finding 7 + rebase); #592 fix + Windows arm in flight; #599 review in flight**

## PRs & Issues
 - **PRs:** Open: #599 (docs sweep for #596, head 8c9d619c, CLEAN; review 39028268833 in progress since 11:19:41Z; on approve -> Tester -> merge -> closes #596), #593 (lab ladder for #591, head f2e7f97d, **DIRTY** vs main 0c4fbe5a; lab run 39028125375 in flight since 11:17:25Z on Finding 7 + rebase; expect a further rebase onto 0c4fbe5a since #600 merged mid-round), #592 (macOS vehicle, head b759dff4, CLEAN but RED on the 3 probe tests, body Refs #582; fix 39028021752 in flight since 11:15:44Z; Windows arm 39026429150 running since 11:06:31Z on pre-fix aa6c0750). **#600 MERGED 11:28:47Z (rebase -> main 0c4fbe5a; Refs #593 only, closes nothing; PAT merge step skips it: no workflow files).** Merge ledger 2026-10-17: #600 (11:28:47Z -> 0c4fbe5a), #598 (11:13:20Z -> 9cbc8f5c; closed #597), #595 (10:50:33Z -> d9f44db7), #581. 2026-10-16 ledger in logs/2026-10-16.md.
 - **Issues:** Open: #601 (displacement class, UNTRIAGED - sequenced, see IN FLIGHT), #596 (closes via #599), #591 (via #593 + ladder fold), #582 (native arms), #552 (owner live-terminal confirmation outstanding), #70, #42. #597 closed (via #598), #594 closed (queue proof), #600 merged.
 - **Boards:** #70 lab-health, #42 standing. `workflows:` allowlist self-audit this run: 19 entries vs 19 local non-maintainer workflow files, exact name-set match (platform-generated Dependabot Updates / Dependency Graph / pages-build-deployment correctly absent). No drift.
 - Main tip: 0c4fbe5a (#600 merge). Failure sweep: zero failure/timed_out/startup_failure in the last 100 runs; zero held runs; cancelled/skipped arms all accounted as group supersessions or job-gate skips.

## IN FLIGHT
 - **#601 DISPLACEMENT ISSUE (UNTRIAGED, SEQUENCED):** dispatch `{"action": "lab", "issue": 601}` when the #593 chain reaches main (merge), NOT before: the fix touches opencode.yml, lab.yml, silent-stall-audit.sh, AGENTS.md - the same files #593's open PR keeps rebasing against; a parallel dispatch recreates the #595 churn. ESCAPE HATCH: if #593 shows no merge progress 90 min after its round push, dispatch with an explicit coordination instruction and accept one rebase round. Public triage note posted on #601 this run (run 39028577133).
 - **#593 LAB ROUND (in flight):** lab run 39028125375 since 11:17:25Z - Finding 7 (exit-0 model-resolution anchoring in .github/actions/opencode-run/action.yml + maintainer.yml + R15 assertion) + rebase. NOTE: #600 merged mid-round (main moved 9cbc8f5c -> 0c4fbe5a); if the session rebased onto 9cbc8f5c its push lands CONFLICTING again (overlap files: AGENTS.md, LAB.md, maintainer.md, labengineer.md, docs/index.html, docs/index.md) -> precise lab rebase round; if it fetched fresh main, it rebases clean. Then: forwarded /oc review (watch for displacement by any comment landing while it is pending; re-dispatch if lost) -> read-only infra Tester -> PAT merge step -> close #591, fold the ladder into MODEL-WATCH.
 - **#592 FIX (in flight):** fix run 39028021752 (dispatched 11:15:42Z, predates the Tester verdict 11:18:31Z); its /oc fix auto-forward (39028202649) was displaced by the #601 class. On push verify ALL of: (a) frame-strict probe_ok; (b) non-reply probe bytes replayed on Unix AND Windows; (c) the tester_packaging.rs Unix gate item. Any missing item -> follow-up `fix`. Then review -> test -> eval -> merge (Refs #582) and re-run BOTH native arms in parallel (queue:max proven).
 - **WINDOWS ARM (running):** 39026429150 test-windows since 11:06:31Z on aa6c0750 (pre-fix); report folds into the #592 chain; may surface the packaging gate natively.
 - **#599 REVIEW (in flight):** 39028268833 on 8c9d619c since 11:19:41Z; the fix round resolved both blocking findings and rebased onto d9f44db7. On approve -> Tester -> merge -> closes #596. Watch maze-chase docs overlap with #592 at merge time.
 - **#600 DONE:** merged 11:28:47Z; pages.yml re-triggered by run 39028577133's post-merge step (main advanced during the run; bot-token merges emit no push event).
 - #552: owner live-terminal confirmation outstanding; never auto-close on Refs.
 - TEST-CRASH RULE (standing): a test run dying inside `Run opencode tester` with no decision file and no Tester comment carries zero signal - retry once; a second consecutive silent death on the same PR routes `lab`; never a third test. UNACQUIRED deaths do not count.
 - MODEL-WATCH RULE: deepseek-v4.1-flash-free is the live pin, healthy; if it dies/rate-limits/payment-errors, retry once then route `{"action": "lab"}`. Fold #593's registry ladder into this rule once it merges.
 - DISPLACEMENT HAZARD (until #601's fix lands): any comment landing on a PR while a same-workflow run of its per-issue group is pending can silently cancel it (a skip-only run replaces the one pending slot). Minimize comments on threads with pending forwards; each tick check for lost forwards (#593 review after the round push, #592 review after the fix push) and re-dispatch.
 - Evaluator follow-ups plus all carried Reviewer/Tester/Evaluator advisory nits (through #590) remain queued for a future hardening vehicle.
 - Infra routing guard active: anything touching `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` routes to Lab Engineer (`lab`), never `fix`/`continue`. #592's fix is app code (maze-chase crates); #599 is docs-only.
 - Orphan-main protection holds: verify `git merge-base origin/main <pr-head>` non-empty before every merge. Shipping limit does not apply to docs/lab/intermediate Refs PRs.
 - IP hold (standing): God of War Kratos vs Zeus commission declined on IP grounds; original mythic-duel alternative awaiting owner confirmation.
 - Standing-board close guard: #70 and #42 must never carry `Closes` in a PR body; merge as Refs only.
 - Ambient: two zombie queued runs from 2026-09-25/10-05 (old issue532 / lab-427 branches) sit permanently queued; zero held runs currently.

## NEXT-RUN PLAYBOOK
 1. #593: check head + mergeStateStatus vs 0c4fbe5a; verify Finding 7 landed (action.yml + maintainer.yml exit-0 anchoring + R15). Missing rebase -> precise lab rebase round. Then police the review forward (displaced -> re-dispatch) and the PAT merge step; on merge close #591 and fold the ladder into MODEL-WATCH.
 2. Dispatch `lab` on #601 the moment #593 is merged (escape hatch: no merge progress 90 min after the round push -> dispatch with coordination note).
 3. #592: verify the fix push against all three verdict items (frame-strict probe_ok; non-reply byte replay Unix AND Windows; tester_packaging.rs Unix gate); missing -> follow-up fix. Then review -> test -> eval -> merge; re-run both native arms in parallel.
 4. Read the Windows arm report (39026429150) when it lands; fold Windows-specific defects into the #592 chain.
 5. #599: review verdict -> Tester -> merge -> closes #596.
 6. #552 closes only on owner live-terminal confirmation; never auto-close on `Refs #552`.
 7. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
 - Did #600's merge land before or after #593's rebase step (clean rebase onto 0c4fbe5a vs another conflict round)?
 - Does the #592 fix cover the tester_packaging.rs Unix gate item, or does the displaced Tester verdict item need a follow-up round?
 - Does the Windows arm surface Windows-specific defects beyond the shared probe residuals?
 - Does #599's review clear 8c9d619c?
 - Does the #593 review forward survive the displacement hazard, or does it need a manual re-dispatch?

 - Hephaestus, the Maintainer
