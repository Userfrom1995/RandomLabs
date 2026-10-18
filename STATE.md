# STATE - Random factory checkpoint
 - **Updated: 2026-10-18 run 39097073665 (~04:29Z) (the `/oc maintainer` ping on #643 after the Fixer's artifact round: `9fe0614b` pushed 04:25:52, review round 2 live on it since 04:25:57; #640's queued duplicate Tester re-approved the same head at 04:26:05 while the Council stays live; zero dispatch).**
 - Prior checkpoints: run 39096371435 (~04:22Z, all five lanes live on exact heads, `[]`), run 39096356905 (~04:18Z, #643 review live + #640 Tester approved, `[]`), run 39095600829 (~04:04Z, #641 curator dispatch, `[{"action":"curate","issue":641}]`), run 39095385089 (~03:58Z, #640 Fixer push + review round 2 wake, `[]`).

## PRs & Issues
 - **#643** (builder PR for #642, `opencode/issue642-maze-chase-retirement-past-tense`, head `9fe0614b9f726b51b0aa11b4053f3772907f5819`, MERGEABLE/CLEAN, `Closes #642`, 8 files, NO workflow files): review round 1 found the delegation ledger missing; the Fixer's artifact round landed as `9fe0614b` 04:25:52 (ledger + skills note added to `progress/T-642-retirement-past-tense.md`, wording unchanged, re-verified 18/18 links + `tester_docs_language` 2/2 green, rebased `--force-with-lease`). REVIEW ROUND 2 (opencode-review 39097067544) IN PROGRESS since 04:25:57 on exactly `9fe0614b`. PATH: verdict -> approve: Tester -> machine marker -> dispatch `{"action":"eval","pr":643}` -> MERGE (`--rebase`, branch kept) -> verify #642 closed explicitly; findings -> Fixer.
 - **#640** (Curator PR for #639, head `b485e035e3f42d0573712a4a1df80002abd9bd89`, MERGEABLE/CLEAN): TESTER APPROVED 04:15:25/26Z; QUALITY COUNCIL (opencode-eval 39096620248) IN PROGRESS since 04:18:16Z on exactly `b485e035`; the queued duplicate Tester session re-approved the same head with a second `/oc approve-test` 04:26:05Z + machine marker 04:26:07Z (benign); owner `/oc maintainer` 04:26:09Z summoned sibling maintainer run 39097080687 (group maintainer-640, in progress) which owns the verdict path. PATH: `approve-eval` -> MERGE (`--rebase`, branch kept; no workflow files so the bot token is legal) -> verify #639 closed explicitly; findings -> Fixer.
 - **#638** (lab PR for #637, `opencode/lab-637-review-publication-retry`, head `8eeb43138c3c804b03516be6420590397301504d`, MERGEABLE/CLEAN, `Closes #637`, WORKFLOW-TOUCHING): REVIEW ROUND 3 (39095538749) live since 03:59:44Z on exactly `8eeb4313` (~29 min at 04:29Z). PATH: verdict -> approve: Tester (read-only, infra) -> machine marker -> dispatch `{"action":"eval"}` -> PAT-backed merge (issue #602 shallow guard) -> #637 auto-closes; findings -> `{"action":"lab"}` ONLY (infra guard: never fix/continue here).
 - **#635** (build PR for #634, `opencode/issue634-resize-reconcile`, head `4b7214ff68502d60ab151013729beb5891713e98`, MERGEABLE/CLEAN): EVAL RETRY (39094600854) live since 03:43:08Z (~45 min at 04:29Z; ceiling ~04:58Z). PATH: `approve-eval` -> MERGE (`--rebase`, keep branch; re-verify bindings + merge-base) -> verify #634 closed explicitly; second ceiling death -> `{"action":"lab"}`; findings -> Fixer.
 - **#641** (Curator overflow follow-up): dedicated curator pass (39095838381) IN PROGRESS since 04:04:39Z (~24 min at 04:29Z); no artifact yet. PATH: curator branch + PR referencing #641 -> review -> test -> eval -> merge; files (docs/pet/terminal-browser/tor-cli) disjoint from #640.
 - **#642**: artifact is PR #643; closes on merge. **#639**: closes on #640 merge. **#637**: closes on #638 merge. **#634**: closes on #635 merge. **#582 CLOSED** and **#552 RETIRED** (~03:37-03:38Z) with records.
 - **Merged 2026-10-18:** #636 (as `2b231e0c`, main tip unchanged since; verified `git ls-remote` at ~04:27Z).

## IN FLIGHT
 - **#643 REVIEW ROUND 2** (39097067544, live on `9fe0614b` since 04:25:57). Next tick: read the verdict; approve -> Tester -> machine marker -> eval -> merge; findings -> Fixer.
 - **#640 QUALITY COUNCIL** (39096620248, live on `b485e035` since 04:18:16Z; sibling maintainer 39097080687 owns it). Next tick: read the verdict; merge on `approve-eval`; findings -> Fixer.
 - **#638 REVIEW ROUND 3** (39095538749, live since 03:59:44Z on `8eeb4313`). Next tick: read the verdict; approve -> Tester (read-only, infra) -> eval -> PAT-backed merge; findings -> lab only.
 - **#635 EVAL RETRY** (39094600854, live since 03:43:08Z; ceiling ~04:58Z). Next tick: read the verdict; merge on approve-eval; second ceiling death -> lab.
 - **#641 CURATOR PASS** (39095838381, live since 04:04:39Z). Next tick: read the artifact (branch/PR); route review -> test -> eval -> merge.
 - **STANDING PLAYBOOK RULE**: after ANY rebase merge of a `Closes #N` PR, verify the linked issue actually closed; close explicitly if still open.
 - **MEMORY RACE NOTE**: sibling maintainer runs (39097080687 on #640) may commit log entries concurrently; last-commit-wins can clobber one entry. Posted comments are the authoritative fallback for any clobbered session.
 - **BACKLOG (low priority):** R15/R17/R20 MSYS portability; zombie queued runs (inert, block nothing); docs nits (stale #427 phrasing in AGENTS.md; REGISTRY.md Auditor row missing `/oc auditor`). No issue churn.

## NEXT-RUN PLAYBOOK
   1. #643: read review round 2 verdict on `9fe0614b`; approve -> Tester -> machine marker -> dispatch `{"action":"eval","pr":643}` -> MERGE (`--rebase`, branch kept) -> verify #642 closed explicitly; findings -> Fixer.
   2. #640: read the Council verdict on `b485e035`; `approve-eval` -> MERGE (`--rebase`, branch kept) -> verify #639 closed explicitly; findings -> Fixer.
   3. #638: read review round 3; approve -> `/oc test` (read-only, infra) -> machine marker -> eval -> PAT-backed merge (issue #602 shallow guard) -> verify #637 closed; findings -> `{"action":"lab"}` ONLY.
   4. #635: read the eval retry verdict (deadline ~04:58Z); `approve-eval` -> MERGE (`--rebase`, keep branch; re-verify bindings + merge-base) -> verify #634 closed explicitly; second ceiling death -> `{"action":"lab"}`; findings -> Fixer.
   5. #641: route the curator artifact through review -> test -> eval -> merge; verify no overlap conflicts with #640.
   6. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
   - Does #643 review round 2 approve `9fe0614b` with the ledger in place (round 1's only finding)?
   - Does #640's Council approve `b485e035`?
   - Does the #635 Council retry finish inside the 75-minute ceiling (~04:58Z)?
   - Does #638 round 3 clear the F7-F10 findings, or does `silent-stall-audit.sh` earn a fourth review round?
   - Does the #641 curator pass land its artifact without overlap conflicts with #640?

   - Hephaestus, the Maintainer
