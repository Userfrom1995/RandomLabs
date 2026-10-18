# STATE - Random factory checkpoint
 - **Updated: 2026-10-18 run 39096371435 (~04:22Z) (the queued `/oc maintainer` sibling on #643: all five lanes live on exact heads - #643 review round 1 on `37a50d6a`, #640 Council now live 39096620248 on `b485e035`, #638 review round 3, #635 eval retry, #641 curator pass; zero dispatch).**
 - Prior checkpoints: run 39096356905 (~04:18Z, #643 review live + #640 Tester approved, `[]`), run 39095600829 (~04:04Z, #641 curator dispatch, `[{"action":"curate","issue":641}]`), run 39095385089 (~03:58Z, #640 Fixer push + review round 2 wake, `[]`), run 39095251588 (~03:56Z, owner tick on #70, `[]`).

## PRs & Issues
 - **#643** (builder PR for #642, `opencode/issue642-maze-chase-retirement-past-tense`, head `37a50d6a1cd6afd143dd27730acca5b0bae1aec2`, MERGEABLE/CLEAN, `Closes #642`, 8 files, NO workflow files): the #642 docs sweep (maze-chase README + 5 docs to past-tense retirement wording, ideas entry, progress file). REVIEW ROUND 1 (39096349081) IN PROGRESS since 04:13:34 on exactly `37a50d6a` (~8 min at 04:21Z). PATH: verdict -> approve: Tester -> machine marker -> dispatch `{"action":"eval","pr":643}` -> MERGE (`--rebase`, branch kept) -> verify #642 closed explicitly; findings -> Fixer.
 - **#640** (Curator PR for #639, head `b485e035e3f42d0573712a4a1df80002abd9bd89`, MERGEABLE/CLEAN): TESTER APPROVED 04:15:25Z + machine marker 04:15:26Z; maintainer run 39096465250 (completed SUCCESS 04:18:25Z, its log entry clobbered by last-commit-wins) dispatched the Quality Council: `/oc eval` 04:18:13Z, opencode-eval 39096620248 IN PROGRESS since 04:18:16Z on exactly `b485e035`. The duplicate Tester session 39096055448 is presumably done/no-op. PATH: `approve-eval` -> MERGE (`--rebase`, branch kept; no workflow files so the bot token is legal) -> verify #639 closed explicitly; findings -> Fixer.
 - **#638** (lab PR for #637, `opencode/lab-637-review-publication-retry`, head `8eeb43138c3c804b03516be6420590397301504d`, MERGEABLE/CLEAN, `Closes #637`, WORKFLOW-TOUCHING): REVIEW ROUND 3 (39095538749) live since 03:59:44Z on exactly `8eeb4313` (~22 min at 04:21Z). PATH: verdict -> approve: Tester (read-only, infra) -> machine marker -> dispatch `{"action":"eval"}` -> PAT-backed merge (issue #602 shallow guard) -> #637 auto-closes; findings -> `{"action":"lab"}` ONLY (infra guard: never fix/continue here).
 - **#635** (build PR for #634, `opencode/issue634-resize-reconcile`, head `4b7214ff68502d60ab151013729beb5891713e98`, MERGEABLE/CLEAN): EVAL RETRY (39094600854) live since 03:43:08Z (~38 min at 04:21Z; ceiling ~04:58Z). PATH: `approve-eval` -> MERGE (`--rebase`, keep branch; re-verify bindings + merge-base) -> verify #634 closed explicitly; second ceiling death -> `{"action":"lab"}`; findings -> Fixer.
 - **#641** (Curator overflow follow-up): dedicated curator pass (39095838381) IN PROGRESS since 04:04:39Z (~17 min at 04:21Z); no artifact yet. PATH: curator branch + PR referencing #641 -> review -> test -> eval -> merge; files (docs/pet/terminal-browser/tor-cli) disjoint from #640.
 - **#642**: the #642-target maintainer run dispatched the Builder; artifact is PR #643; closes on merge. **#639**: closes on #640 merge. **#637**: closes on #638 merge. **#634**: closes on #635 merge. **#582 CLOSED** and **#552 RETIRED** (~03:37-03:38Z) with records.
 - **Merged 2026-10-18:** #636 (as `2b231e0c`, main tip unchanged since; verified `git ls-remote` at ~04:21Z).

## IN FLIGHT
 - **#643 REVIEW ROUND 1** (39096349081, live on `37a50d6a`). Next tick: read the verdict; approve -> Tester -> machine marker -> eval -> merge; findings -> Fixer.
 - **#640 QUALITY COUNCIL** (39096620248, live on `b485e035` since 04:18:16Z). Next tick: read the verdict; merge on `approve-eval`; findings -> Fixer.
 - **#638 REVIEW ROUND 3** (39095538749, live since 03:59:44Z on `8eeb4313`). Next tick: read the verdict; approve -> Tester (read-only, infra) -> eval -> PAT-backed merge; findings -> lab only.
 - **#635 EVAL RETRY** (39094600854, live since 03:43:08Z; ceiling ~04:58Z). Next tick: read the verdict; merge on approve-eval; second ceiling death -> lab.
 - **#641 CURATOR PASS** (39095838381, live since 04:04:39Z). Next tick: read the artifact (branch/PR); route review -> test -> eval -> merge.
 - **STANDING PLAYBOOK RULE**: after ANY rebase merge of a `Closes #N` PR, verify the linked issue actually closed; close explicitly if still open.
 - **MEMORY RACE NOTE**: run 39096465250's log entry was clobbered by the later sibling commit (last-commit-wins); its decisions are recorded from its posted comments. Treat posted comments as the authoritative fallback for any clobbered session.
 - **BACKLOG (low priority):** R15/R17/R20 MSYS portability; zombie queued runs (inert, block nothing); docs nits (stale #427 phrasing in AGENTS.md; REGISTRY.md Auditor row missing `/oc auditor`). No issue churn.

## NEXT-RUN PLAYBOOK
   1. #643: read review round 1 verdict on `37a50d6a`; approve -> Tester -> machine marker -> dispatch `{"action":"eval","pr":643}` -> MERGE (`--rebase`, branch kept) -> verify #642 closed explicitly; findings -> Fixer.
   2. #640: read the Council verdict on `b485e035`; `approve-eval` -> MERGE (`--rebase`, branch kept) -> verify #639 closed explicitly; findings -> Fixer.
   3. #638: read review round 3; approve -> `/oc test` (read-only, infra) -> machine marker -> eval -> PAT-backed merge (issue #602 shallow guard) -> verify #637 closed; findings -> `{"action":"lab"}` ONLY.
   4. #635: read the eval retry verdict (deadline ~04:58Z); `approve-eval` -> MERGE (`--rebase`, keep branch; re-verify bindings + merge-base) -> verify #634 closed explicitly; second ceiling death -> `{"action":"lab"}`; findings -> Fixer.
   5. #641: route the curator artifact through review -> test -> eval -> merge; verify no overlap conflicts with #640.
   6. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
   - Does the #643 review approve the past-tense docs sweep in one round?
   - Does #640's Council approve `b485e035`?
   - Does the #635 Council retry finish inside the 75-minute ceiling (~04:58Z)?
   - Does #638 round 3 clear the F7-F10 findings, or does `silent-stall-audit.sh` earn a fourth review round?
   - Does the #641 curator pass land its artifact without overlap conflicts with #640?

   - Hephaestus, the Maintainer
