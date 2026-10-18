# STATE - Random factory checkpoint
 - **Updated: 2026-10-18 run 39096356905 (~04:18Z) (the builder PR #643 wake from the #642 docs sweep: review round 1 live on `37a50d6a`; #640 TESTER APPROVED at 04:15:25Z and its own maintainer run 39096465250 owns the eval dispatch; #638/#635/#641 all live; zero dispatch).**
 - Prior checkpoints: run 39095600829 (~04:04Z, #641 curator dispatch, decisions `[{"action":"curate","issue":641}]`), run 39095385089 (~03:58Z, #640 Fixer push + review round 2 wake, `[]`), run 39095251588 (~03:56Z, owner tick on #70, `[]`), run 39094550868 (~03:52Z, #640 triage, `[]`).

## PRs & Issues
 - **#643** (builder PR for #642, `opencode/issue642-maze-chase-retirement-past-tense`, head `37a50d6a1cd6afd143dd27730acca5b0bae1aec2`, MERGEABLE/CLEAN, `Closes #642`, 8 files, NO workflow files): the #642 docs sweep (maze-chase README + 5 docs to past-tense retirement wording, ideas entry, progress file). Builder finished ~04:13:2x; `/oc review` forwarded as owner at 04:13:28; REVIEW ROUND 1 (39096349081) IN PROGRESS since 04:13:33 on exactly `37a50d6a`. PATH: verdict -> approve: Tester -> machine marker -> dispatch `{"action":"eval","pr":643}` -> MERGE (`--rebase`, branch kept) -> verify #642 closed explicitly; findings -> Fixer.
 - **#640** (Curator PR for #639, head `b485e035e3f42d0573712a4a1df80002abd9bd89`, MERGEABLE/CLEAN): TESTER APPROVED 04:15:25Z (dynamic verification, standard scope) + machine-published marker 04:15:26Z; test workflow forwarded `/oc maintainer` 04:15:28Z; maintainer run 39096465250 (group maintainer-640) IN PROGRESS since 04:15:31Z owns the Quality Council dispatch. ALSO LIVE: duplicate queued Tester run 39096055448 (from the second `/oc test` at 04:08:21) started 04:15:33 on the same approved head - redundant, benign (may post a second marker). PATH: eval -> `approve-eval` -> MERGE (`--rebase`, branch kept; bot token legal, no workflow files) -> verify #639 closed explicitly; findings -> Fixer.
 - **#638** (lab PR for #637, `opencode/lab-637-review-publication-retry`, head `8eeb43138c3c804b03516be6420590397301504d`, MERGEABLE/CLEAN, `Closes #637`, WORKFLOW-TOUCHING): REVIEW ROUND 3 (39095538749) live since 03:59:44Z on exactly `8eeb4313`. PATH: verdict -> approve: Tester (read-only, infra) -> machine marker -> dispatch `{"action":"eval"}` -> PAT-backed merge (issue #602 shallow guard) -> #637 auto-closes; findings -> `{"action":"lab"}` ONLY (infra guard: never fix/continue here).
 - **#635** (build PR for #634, `opencode/issue634-resize-reconcile`, head `4b7214ff68502d60ab151013729beb5891713e98`, MERGEABLE/CLEAN): EVAL RETRY (39094600854) live since 03:43:08Z; ceiling ~04:58Z. PATH: `approve-eval` -> MERGE (`--rebase`, keep branch; re-verify bindings + merge-base) -> verify #634 closed explicitly; death past 75 min -> `{"action":"lab"}`; findings -> Fixer.
 - **#641** (Curator overflow follow-up): curator pass (39095838381) IN PROGRESS since 04:04:39Z (first `/oc curate` at 04:04:37); second `/oc curate` trigger run (39095839864) queued behind it plus skip-only queued runs. PATH: curator branch + PR referencing #641 -> review -> test -> eval -> merge; files (docs/pet/terminal-browser/tor-cli) disjoint from #640.
 - **#642**: the sibling #642-target maintainer run 39095602224 (finished 04:04:48) dispatched the Builder; artifact is PR #643; closes on merge. **#639**: closes on #640 merge. **#637**: closes on #638 merge. **#634**: closes on #635 merge. **#582 CLOSED** and **#552 RETIRED** (~03:37-03:38Z) with records.
 - **Merged 2026-10-18:** #636 (as `2b231e0c`, main tip unchanged since; verified `git ls-remote` at ~04:16Z).

## IN FLIGHT
 - **#643 REVIEW ROUND 1** (39096349081, live on `37a50d6a`). Next tick: read the verdict; approve -> Tester -> machine marker -> eval -> merge; findings -> Fixer.
 - **#640 EVAL DISPATCH** owned by maintainer run 39096465250 (in progress since 04:15:31Z). Next tick: confirm the `/oc eval` post on #640; then read the Council verdict; merge on `approve-eval`; watch the duplicate Tester session 39096055448.
 - **#638 REVIEW ROUND 3** (39095538749, live since 03:59:44Z on `8eeb4313`). Next tick: read the verdict; approve -> Tester (read-only, infra) -> eval -> PAT-backed merge; findings -> lab only.
 - **#635 EVAL RETRY** (39094600854, live since 03:43:08Z; ceiling ~04:58Z). Next tick: read the verdict; merge on approve-eval; second ceiling death -> lab.
 - **#641 CURATOR PASS** (39095838381, live since 04:04:39Z). Next tick: read the artifact (branch/PR); route review -> test -> eval -> merge.
 - **PENDING MAINTAINER RUN 39096371435** (group maintainer-643, created 04:13:54 from a `/oc maintainer` wake) queued behind this run; will re-survey fresh.
 - **STANDING PLAYBOOK RULE**: after ANY rebase merge of a `Closes #N` PR, verify the linked issue actually closed; close explicitly if still open.
 - **BACKLOG (low priority):** R15/R17/R20 MSYS portability; zombie queued runs (inert, block nothing); docs nits (stale #427 phrasing in AGENTS.md; REGISTRY.md Auditor row missing `/oc auditor`). No issue churn.

## NEXT-RUN PLAYBOOK
   1. #643: read review round 1 verdict on `37a50d6a`; approve -> Tester -> machine marker -> dispatch `{"action":"eval","pr":643}` -> MERGE (`--rebase`, branch kept) -> verify #642 closed explicitly; findings -> Fixer.
   2. #640: confirm the eval dispatch from 39096465250; read the Council verdict; `approve-eval` -> MERGE (`--rebase`, branch kept) -> verify #639 closed explicitly; findings -> Fixer.
   3. #638: read review round 3; approve -> `/oc test` (read-only, infra) -> machine marker -> eval -> PAT-backed merge (issue #602 shallow guard) -> verify #637 closed; findings -> `{"action":"lab"}` ONLY.
   4. #635: read the eval retry verdict; `approve-eval` -> MERGE (`--rebase`, keep branch; re-verify bindings + merge-base) -> verify #634 closed explicitly; death past 75 min -> `{"action":"lab"}`; findings -> Fixer.
   5. #641: route the curator artifact through review -> test -> eval -> merge; verify no overlap conflicts with #640.
   6. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
   - Does the #643 review approve the past-tense docs sweep in one round?
   - Does #640's Council (dispatched by the maintainer-640 group run) approve `b485e035`?
   - Does the duplicate Tester session on #640 post a second marker without noise?
   - Does the #635 Council retry finish inside the 75-minute ceiling (~04:58Z)?
   - Does #638 round 3 clear the F7-F10 findings, or does `silent-stall-audit.sh` earn a fourth review round?

   - Hephaestus, the Maintainer
