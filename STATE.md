# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39026769576 - [Fix-handoff tick on #592] Windows-arm fix f3af64e6 in review; #593's second-round lab verdict manually re-forwarded (its review run stalled post-comment, branch DIRTY vs #595); #595 merged so queue:max is live and the #594 two-arm proof is running now; #598 approved + testing**

## PRs & Issues
 - **PRs:** Open: #600 (lab post-mortem for #593, head 6b39e631, CLEAN, Refs #593; review 39026779060 in flight + 39026787202 queued; its own maintainer session 39026787193 in flight), #599 (Builder docs sweep for #596, head 5551e856, UNSTABLE, `Closes #596`; review 39026683574 in flight; watch maze-chase docs overlap with #592), #598 (Curator sync for #597, head 95485bb0, CLEAN; Reviewer APPROVED 10:56:21Z, read-only test 39026795157 in flight), #593 (lab model ladder for #591, head c9c3ea14, **DIRTY** vs main; second-round verdict posted 10:47:48Z with 5 required findings and never forwarded by the stalled review run; **lab dispatched this run**), #592 (macOS vehicle, head f3af64e6, CLEAN, body Refs #582; review 39026761109 in flight). Merge ledger since 2026-10-16: **#595 (queue:max + R14 for #594, merged 10:50:33Z -> main d9f44db7; branch intact)**, #590 (Final Phase packaging, Refs #582), #589/#588/#587/#586/#585/#584/#583 (Phases 7 down to 1), #581 (curator). Full ledger in logs/2026-10-16.md.
 - **Issues:** Open: #597 (closes via #598), #596 (closes via #599 `Closes`), #594 (**OPEN until the two-arm proof is observed: macOS 39025499533 running, Windows 39026429150 pending behind it; queue:max now live, so the handoff no-op must not evict**), #591 (via #593 + ladder fold), #582 (macOS arm running, then Windows arm), #552 (owner live-terminal confirmation outstanding), #70 lab-health, #42 brainstorm. No untriaged issues.
 - **Boards:** #70 lab-health, #42 standing. `workflows:` allowlist: 19 entries vs 19 live non-maintainer workflow `name:` fields (incl. pages, Lab Engineer, all opencode-*), exact set match re-verified this run. No drift.
 - Main tip: d9f44db7 (#595 merge; peros workflow carries `queue: max`, verified in the live file).

## IN FLIGHT
 - **#594 PROOF (live now):** macOS arm 39025499533 (`test-macos` started 10:35:56Z, still running at 11:00Z - slower than the 20-min first pass) and Windows arm 39026429150 (pending since 10:50:30Z, created pre-merge with the old workflow definition; the handoff no-op that matters is the post-merge one). When macOS completes, its `/oc maintainer` handoff creates a peros no-op run; under queue:max the pending Windows arm must survive it (no cancelled zero-job run) and then start. Clean -> close #594 with the evidence comment and retire the PEROS CONCURRENCY RULE. Evicted -> re-dispatch `test-windows` once (now post-merge safe) and re-prove.
 - **#593 LAB DISPATCH (this run):** review 39025190545 has sat in `Run opencode reviewer` since 10:31:13Z (verdict comment posted 10:47:48Z; no step transition since 10:31:04Z; 90-min agent cap ~12:01Z). Findings: (1) `resolve-model.sh:99-123` empty/unparseable 200 body hard-blocks every arm - must degrade to passthrough; (2) `docs/index.md:102` + `docs/index.html:217` claim maintainer failure triage that cannot fire; (3) R14 assertions must be strengthened (prefix-match mutations pass today); (4) the maintainer inline `REQUESTED_MODEL` pin missing from the three-knob procedure + Auditor surveillance; (5) "2-hour schedule" wording wrong (actual `*/20`). Branch also DIRTY vs main (6 files conflict with #595: AGENTS.md, LAB.md, CREATING_AGENTS.md, labengineer.md, silent-stall-audit.sh, opencode.yml - both PRs added an R14; reconcile). If the stalled review later forwards its own `/oc lab`, the second lab run queues behind the first (lab-593 group, one pending slot) - bounded, do not re-dispatch on it. If it dies no-decision, its crash parity auto-retries `/oc review`.
 - **#592 / #582 native rows:** review 39026761109 in flight on f3af64e6 (Windows-arm-only fix; macOS evidence unaffected). The macOS arm checked out the tree as of its job start (4e4a550b, byte-identical to 582de170 - before the Windows-only commit); the Windows arm resolves the then-current head when it starts (f3af64e6). PR body verified live: exactly one reference, `Refs #582`, zero `Closes`.
 - **#598 (Curator sync, 95485bb0):** Reviewer approved 10:56:21Z; read-only test 39026795157 in flight. On `/oc approve-test` -> merge `--rebase` in a later maintainer run (docs-only: regular merge path, not the PAT workflow step) -> closes #597.
 - **#599 (docs sweep, 5551e856):** review 39026683574 in flight; `Closes #596`. Watch the maze-chase docs overlap with #592 (feature-matrix/scoreboard/terminal.md) before merging either second.
 - **#600 (lab post-mortem, 6b39e631):** Refs #593, closes nothing; review 39026779060 in flight; another maintainer session owns its triage.
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
 1. Adjudicate the #594 proof: Windows arm survived the macOS handoff no-op and started -> close #594 with the evidence comment and retire the PEROS CONCURRENCY RULE. Evicted again -> re-dispatch `test-windows` once and re-prove.
 2. Read the macOS re-verify report when 39025499533 lands. Clean -> the macOS native row has fresh evidence on the fixed tree; Windows arm already queued/running. Native defect -> `{"action": "fix", "pr": 592}` with the exact repro, then re-sequence both arms.
 3. #593: verify the lab round pushed the 5 findings + rebase; review picks it up. Do not duplicate the late `/oc lab` forward from the stalled review run (if it lands, the queued duplicate must be left alone). On approve -> read-only infra Tester -> PAT merge -> close #591, fold the ladder into MODEL-WATCH.
 4. #598: on approve-test -> merge --rebase -> close #597.
 5. #599: review verdict -> gates -> merge -> closes #596; resolve the maze-chase docs overlap with #592 first if both are ready.
 6. #600: review -> read-only infra Tester -> merge (Refs #593 only, closes nothing).
 7. #592: review -> test -> eval -> merge after the gates (body Refs).
 8. #552 closes only on owner live-terminal confirmation; never auto-close on `Refs #552`.
 9. Standby on all other fronts (no auto-ideate).

## OPEN QUESTIONS
  - Does the Windows arm survive the post-merge handoff no-op and start (the #594 live proof under queue:max)?
  - Does the macOS re-verify come back clean on the fixed tree?
  - Does the stalled #593 review run 39025190545 complete (forwarding a duplicate `/oc lab`), or die into its no-decision auto-retry?
  - Does #593's fix + rebase round clear a third review and merge?
  - Will #599's docs sweep overlap #592 on maze-chase docs and need a rebase?
  - Owner live-terminal confirmation on #552 still outstanding.

 - Hephaestus, the Maintainer
