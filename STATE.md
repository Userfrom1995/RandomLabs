# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39026085043 - [Handoff tick] #595 Tester-approved 10:45:01Z; PAT merge sweep lands it this run; Windows arm dispatched on #582 for the #594 two-arm proof; every other lane in flight; allowlist exact match**

## PRs & Issues
 - **PRs:** Open: #599 (Builder docs sweep for #596, head 39f8b69a, WIP "work in progress"; build 39025589665 in flight, its handoff will post review; held runs on it cleared by this run's PAT sweep), #598 (Curator sync, head a3cb6fc1, CLEAN; review 39025270632 in flight), #595 (lab queue:max for #594, head 1988d35c, CLEAN; Tester APPROVED 10:45:01Z; PAT-backed merge sweep lands it this run; branch must stay intact), #593 (lab ladder + loud failure, head c9c3ea14, CLEAN; re-review 39025190545 in flight; lab post-mortem 39025773224 in flight on a NEW branch, barred from touching this one mid-review), #592 (macOS vehicle, head 582de170 = reviewer-verified tree + empty commit; re-review 39025545456 in flight; macOS re-verify 39025499533 in flight, test-macos job running, ETA ~10:56Z). Merge ledger since 2026-10-16: #590 (Final Phase packaging, Refs #582), #589/#588/#587/#586/#585/#584/#583 (Phases 7 down to 1), #581 (curator). Full ledger in logs/2026-10-16.md.
 - **Issues:** Open: #597 (closes via #598), #596 (PR #599 WIP), #594 (**stays open until the two-arm proof: Windows pending behind macOS, survives the post-fix handoff no-op, starts**), #591 (closes via #593 + ladder fold), #582 (macOS arm in flight; Windows arm just dispatched for the proof), #552 (owner live-terminal confirmation outstanding), #70 lab-health, #42 brainstorm. No untriaged issues.
 - **Boards:** #70 lab-health, #42 standing. `workflows:` allowlist: 19 entries vs 19 live non-maintainer workflow `name:` fields (incl. pages, Lab Engineer, all opencode-*), exact set match re-verified this run. No drift.
 - Main tip: aad7ff9a (owner context-window commit). #595's merge will advance it this run.

## IN FLIGHT
 - **#595 (lab peros queue:max, head 1988d35c):** Tester approved 10:45:01Z; PAT-backed merge sweep (maintainer.yml:697, this run) merges it and leaves the branch intact. On merge, main gains `queue: max` on the peros workflow-level group and the standing one-arm-per-tick workaround retires with the #594 proof.
 - **#594 PROOF (dispatched 10:48Z):** `/oc test-windows` on #582 while macOS arm 39025499533 runs: the Windows run should sit pending behind it, then survive the (post-fix) macOS handoff no-op and start after macOS completes. Next run: verify no cancelled zero-job run; Windows started -> close #594 with the evidence. Evicted (merge raced the handoff) -> re-dispatch once post-merge and re-prove.
 - **#592 / #582 native rows:** macOS re-verify 39025499533 ETA ~10:56Z; re-review 39025545456 in flight. PR body already `Refs #582` (verified). Windows arm dispatched this run covers the second native row.
 - **#593 (lab ladder):** re-review 39025190545 in flight (+queued dup). Lab post-mortem 39025773224 (agent self-push App-token rejection + 19-comment error storm) in flight on a new branch for the same issue. On approve -> read-only infra Tester -> PAT-backed merge -> close #591; fold the ladder into MODEL-WATCH.
 - **#598 (Curator sync, a3cb6fc1):** `Fixes #597`; review 39025270632 in flight. Gates -> merge -> closes #597.
 - **#599 (docs sweep, 39f8b69a):** WIP; build 39025589665 in flight; held runs approved by this run's repo-wide sweep. Watch a maze-chase docs overlap with #592/#598 at merge time.
 - TEST-CRASH RULE (standing): a test run dying inside `Run opencode tester` with no decision file and no Tester comment carries zero signal - retry once; a second consecutive silent death on the same PR routes `lab`; never a third test. UNACQUIRED deaths do not count.
 - MODEL-WATCH RULE: deepseek-v4.1-flash-free is the live pin; if it dies/rate-limits/payment-errors, retry once then route `{"action": "lab"}`. Fold #593's registry ladder into this rule once it merges.
 - HOLLOW-GREEN WATCH: on main still pre-#593, a maintainer/opencode Model-not-found death can conclude green; #593 closes this on the maintainer + general arms.
 - Evaluator follow-ups plus all carried Reviewer/Tester/Evaluator advisory nits (through #590) remain queued for a future hardening vehicle.
 - Evaluator/gate calibration unchanged: docs-class merges on Reviewer + Tester approve-test; product/research/phase deliverables require the binding approve-eval. Test-only Tester commits do not void a review gate.
 - Infra routing guard active: any `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` work routes to Lab Engineer (`lab`), never `fix`/`continue`.
 - Orphan-main protection holds: verify `git merge-base origin/main <pr-head>` non-empty before every merge. Shipping limit does not apply to intermediate Refs phases, docs, or lab PRs.
 - IP hold (standing): God of War Kratos vs Zeus commission declined on IP grounds; original mythic-duel alternative awaiting owner confirmation.
 - Standing-board close guard: #70 and #42 must never carry `Closes` in a PR body; merge as Refs only.
 - Ambient: two zombie queued runs from 2026-09-25/10-05 (old issue532 / lab-427 branches) sit permanently queued; no required check affected. Auditor territory if it recurs.

## NEXT-RUN PLAYBOOK
 1. Verify #595 merged (main's peros workflow carries `queue: max`) and adjudicate the #594 proof: Windows run pending->started with no cancelled zero-job run. Clean -> close #594 with the evidence comment and retire the PEROS CONCURRENCY RULE. Evicted -> re-dispatch `test-windows` once (post-merge safe) and re-prove.
 2. #582: read the macOS re-verify report when 39025499533 lands (~10:56Z). Clean -> nothing further (Windows already queued/running). Native defect -> `{"action": "fix", "pr": 592}` with the exact repro, then re-run both arms sequentially.
 3. #593: re-review verdict; approve -> read-only infra Tester -> PAT merge -> close #591, fold ladder into MODEL-WATCH. Read the post-mortem branch/PR when it appears.
 4. #598: gates -> merge -> closes #597.
 5. #592: re-review -> test -> eval -> merge after the gates (body Refs).
 6. #599: watch the build's docs PR + its review; check maze-chase docs overlap vs #592/#598 before merging either.
 7. #552 closes only on owner live-terminal confirmation; never auto-close on `Refs #552`.
 8. Standby on all other fronts (no auto-ideate).

## OPEN QUESTIONS
 - Does the Windows arm survive the post-fix handoff no-op and start (the #594 live proof)?
 - Does the macOS re-verify reproduce zero native defects on 582de170?
 - Does #592's re-review clear it now that its only finding (PR body) is fixed?
 - Does #593's 4-commit fix round clear its re-review, and what does the lab post-mortem conclude?
 - Will #599's docs sweep overlap #592/#598 on maze-chase docs and need a rebase?
 - Owner live-terminal confirmation on #552 still outstanding.

 - Hephaestus, the Maintainer
