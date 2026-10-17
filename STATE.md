# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39028723587 - [#600 MERGED by the concurrent #601 self-dispatch (0c4fbe5a, pages redeployed); #601 triaged with lab deliberately held behind #593; #593/#599/#592 all rebased and under review. Decisions `[]`]**

## PRs & Issues
 - **PRs:** Open: #593 (model ladder for #591, head 49e91814 rebased onto 0c4fbe5a, CLEAN/MERGEABLE; review 39029072421 in progress -> read-only infra Tester -> PAT merge -> closes #591), #599 (docs sweep for #596, head a3294b79 (one-word count fix), MERGEABLE/UNSTABLE; re-review 39029191568 in progress), #592 (macOS vehicle, head 7e2d03a7 (both probe-window findings repaired + rebased, PTY pins preserved), CLEAN/MERGEABLE; review 39029200626 in progress, Windows arm 39026429150 still running on pre-fix aa6c0750). Merge ledger 2026-10-17: **#600 (0c4fbe5a, lab harness-isolation post-mortem, Refs #593)**, #598 (9cbc8f5c, closed #597), #595 (d9f44db7), #581 (curator). 2026-10-16 ledger in logs/2026-10-16.md.
 - **Issues:** Open: #601 (infra pending-run displacement class; triaged 11:31:28Z, **lab dispatch deliberately held until #593 merges**, escape hatch ~13:02Z if no merge progress), #596 (closes via #599), #591 (via #593), #582 (native arms in flight), #552 (owner live-terminal confirmation outstanding), #70 lab-health, #42 brainstorm. No untriaged issues.
 - **Boards:** #70 lab-health, #42 standing. `workflows:` allowlist: 19 entries vs 19 live non-maintainer workflow `name:` fields, exact set match re-verified this run. No drift. Zero `action_required` held runs at close (11:32-11:33 batch swept clean by concurrent maintainer runs).
 - Main tip: 0c4fbe5a (#600 merge). Its Pages deploy 39029031803 succeeded.

## IN FLIGHT
 - **#593 REVIEW ROUND (real review is the running one):** lab run 39028125375 completed success: rebased onto 0c4fbe5a, head now 49e91814, CLEAN/MERGEABLE. Review 39029072421 in progress since 11:32:11 (created by the `/oc review` forward at 11:32:08). The pending review 39029080682 (created 11:32:18 by the `/oc maintainer` comment) is a skip-only no-op; harmless. The non-fast-forward wrapper push-rejection comment at 11:32:03 is expected wrapper noise of the same family as the #600 doctrine (the PAT-backed step owns the rebased force-push); remote tip verified. On approve -> read-only infra Tester -> PAT merge -> close #591, fold the ladder into MODEL-WATCH.
 - **#599 RE-REVIEW:** head a3294b79 (fixer fixed the one-word count error at `umbra/docs/scoreboard.md:20`); review 39029191568 in progress since 11:34:02. On approve -> Tester -> merge -> closes #596.
 - **#592 REVIEW ROUND:** fixer pushed 7e2d03a7 (framed-DA1-only reply detection; captured keys decoded through the normal input path; Tester's b759dff4 PTY pins preserved; rebased onto current main). Report 11:33:53Z; review 39029200626 in progress. WINDOWS ARM 39026429150 still running on the pre-fix head aa6c0750; its findings fold into the next round. When review is green: re-run macOS + Windows arms on the fixed head (parallel safe, queue:max proven), then test -> eval -> merge after gates (body `Refs #582`).
 - **#601 HELD LAB DISPATCH (deliberate sequencing):** the fix touches `opencode.yml`, `lab.yml`, `silent-stall-audit.sh`, `AGENTS.md` - #593's live file set. Dispatch lab the moment #593 merges; escape hatch ~13:02Z (90 min after the 11:32 round push) with an explicit coordination instruction.
 - TEST-CRASH RULE (standing): a test run dying inside `Run opencode tester` with no decision file and no Tester comment carries zero signal - retry once; a second consecutive silent death on the same PR routes `lab`; never a third test. UNACQUIRED deaths do not count.
 - MODEL-WATCH RULE: deepseek-v4.1-flash-free is the live pin and proved healthy across every lane today; #593 hardens the ladder for the exit-0 false-fire (F7) before it merges.
 - HOLLOW-GREEN WATCH: on main pre-#593, a maintainer/opencode Model-not-found death can conclude green (open until #593 merges).
 - PENDING-RUN DISPLACEMENT (issue #601, live class until fixed): any comment landing on a PR while a same-workflow run is pending in its per-issue group silently cancels the pending run. Interim mitigation: displaced forwards are caught on the next maintainer tick and re-dispatched. The #593 `/oc review` and #592 `/oc fix` cancellation incidents are the recorded evidence.
 - Evaluator follow-ups plus all carried Reviewer/Tester/Evaluator advisory nits (through #590) remain queued for a future hardening vehicle.
 - Evaluator/gate calibration unchanged: docs-class merges on Reviewer + Tester approve-test; product/research/phase deliverables require the binding approve-eval. Test-only Tester commits do not void a review gate.
 - Infra routing guard active: any `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` work routes to Lab Engineer (`lab`), never `fix`/`continue`. #592's fix is app code (maze-chase crates), so `fix` is correct there.
 - Orphan-main protection holds: verify `git merge-base origin/main <pr-head>` non-empty before every merge. Shipping limit does not apply to intermediate Refs phases, docs, or lab PRs.
 - IP hold (standing): God of War Kratos vs Zeus commission declined on IP grounds; original mythic-duel alternative awaiting owner confirmation.
 - Standing-board close guard: #70 and #42 must never carry `Closes` in a PR body; merge as Refs only.
 - Expected wrapper-push noise (doctrine live on main via #600): on workflow-touching branches the CLI wrapper's end-of-session App-token rejection is expected; verify the PAT push and admit it, no post-mortem for it alone. A non-fast-forward wrapper rejection after a rebase falls in the same family.
 - Ambient: maintainer runs stacked from the 11:34 comment fan-out (39029080733, 39029210305, 39029210470 in progress at survey); per-target groups are independent; duplicate near-identical status comments are expected and harmless.

## NEXT-RUN PLAYBOOK
 1. #593: review verdict on 49e91814 -> findings back to lab; approve -> read-only infra Tester -> PAT merge -> close #591 -> then dispatch lab on #601 (or at the ~13:02Z escape hatch).
 2. #599: review verdict on a3294b79 -> Tester -> merge -> closes #596.
 3. #592: review verdict on 7e2d03a7 -> if green, re-run macOS + Windows arms on the fixed head -> test -> eval -> merge after gates (Refs #582).
 4. #601: dispatch lab the moment #593 merges (or at the escape hatch) with the coordination instruction.
 5. #552 closes only on owner live-terminal confirmation; never auto-close on `Refs #552`.
 6. Standby on all other fronts (no auto-ideate).

## OPEN QUESTIONS
 - Does #593's rebased head clear review without new findings?
 - Does #599's a3294b79 clear re-review?
 - Does #592's fixed head 7e2d03a7 clear review, and do the re-run macOS/Windows arms go green?
 - Does the #601 lab dispatch wait out #593's merge, or does the ~13:02Z escape hatch fire?
 - Owner live-terminal confirmation on #552 still outstanding.

 - Hephaestus, the Maintainer
