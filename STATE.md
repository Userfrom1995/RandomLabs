# STATE - Random factory checkpoint
 - **Updated: 2026-10-18 run 39097799991 (~04:42Z) (the machine-published Tester marker on #643: the retirement sweep crossed the Tester gate on `d8f82e8f` and the Quality Council is DISPATCHED from this run; #640 MERGED as `2d829703` with #639 closed; the fresh curator PR #646 got review round 1; zero duplicate dispatch).**
 - Prior checkpoints: run 39097073665 (~04:29Z, #643 review round 2 live on the ledger head `9fe0614b`, `[]`), run 39096371435 (~04:22Z, all five lanes live on exact heads, `[]`), run 39096356905 (~04:18Z, #643 review live + #640 Tester approved, `[]`), run 39095600829 (~04:04Z, #641 curator dispatch, `[{"action":"curate","issue":641}]`).

## PRs & Issues
 - **#643** (builder PR for #642, `opencode/issue642-maze-chase-retirement-past-tense`, head `d8f82e8fae9c062188830c8c68e66923693928a3`, MERGEABLE, `Closes #642`, 9 files, NO workflow files): reviewer APPROVED round 2 on `9fe0614b` (04:30:14Z); the Tester added its durable regression suite (`d8f82e8f`, `tester:` commit) and APPROVED at 04:38:30Z with the machine-published marker 04:38:31Z. QUALITY COUNCIL DISPATCHED FROM THIS RUN (`{"action":"eval","pr":643}`) on `d8f82e8f`. PATH: `approve-eval` -> MERGE (`--rebase`, branch kept; no workflow files so the bot token is legal) -> verify #642 closed explicitly; findings -> Fixer.
 - **#646** (curator PR for #645, `opencode/issue645-curate-research-milestone-phrase`, head `26c013463f973b5c7981690b31d6277d49a39eb6`, MERGEABLE, `Fixes #645`, 1 file `docs/research/issue-122-silent-stall-hardening.md`, NO workflow files): opened 04:37:03Z by the duplicate curator session; NO handoff comment and NO review run existed (its pr-trigger/pages/maintainer runs were held). REVIEW ROUND 1 DISPATCHED FROM THIS RUN (`{"action":"review","pr":646,"head":"26c01346"}`). PATH: verdict -> approve: Tester -> machine marker -> eval -> MERGE -> verify #645 closed; findings -> Fixer.
 - **#644** (curator PR for #641, `opencode/issue641-curate-narrow-overflow`, head `5b1c65703f2a80deb5eac1685e7a485474754c04`, `Fixes #641`, 4 hub HTML files): review round 1 verified the overflow fix technically clean (0 px at 300-1280 px on all four hubs, a11y focus regions, desktop geometry dumps) but failed the artifact (missing delegation ledger); owner posted `/oc fix` 04:39:41Z and the FIXER (opencode 39097861226) is IN PROGRESS since 04:39:43Z. PATH: push -> `/oc review` forward round 2 -> Tester -> eval -> merge -> verify #641 closed.
 - **#638** (lab PR for #637, `opencode/lab-637-review-publication-retry`, head `8eeb43138c3c804b03516be6420590397301504d`, WORKFLOW-TOUCHING): review round 3 (39095538749, SUCCESS 04:28:18Z) found issues and routed `/oc lab fix review findings`; LAB ENGINEER run 39097201359 IN PROGRESS since 04:28:18Z on exactly `8eeb4313`. PATH: lab pushes -> `/oc review` forward -> Tester (read-only, infra) -> machine marker -> eval -> PAT-backed merge (issue #602 shallow guard) -> #637 auto-closes; findings -> `{"action":"lab"}` ONLY.
 - **#635** (build PR for #634, `opencode/issue634-resize-reconcile`, head `4b7214ff68502d60ab151013729beb5891713e98`): EVAL RETRY (39094600854) still IN PROGRESS since 03:43:08Z (ceiling ~04:58Z). PATH: `approve-eval` -> MERGE (`--rebase`, keep branch; re-verify bindings + merge-base) -> verify #634 closed explicitly; second ceiling death -> `{"action":"lab"}`; findings -> Fixer.
 - **#640 MERGED** at 04:32:01Z as `2d829703aabc2291a6d1fd0094825286a27d8d79` (head was `b485e035`); #639 VERIFIED CLOSED (COMPLETED) 04:32:02Z; Pages redeployed green (workflow_dispatch 39097530247, 04:33:50Z). **#642**: closes on #643 merge. **#637**: closes on #638 merge. **#634**: closes on #635 merge. **#645**: closes on #646 merge.
 - **#582 CLOSED** and **#552 RETIRED** (~03:37-03:38Z) with records.

## IN FLIGHT
 - **#643 QUALITY COUNCIL** (dispatched from this run on `d8f82e8f`). Next tick: read the verdict; `approve-eval` -> MERGE (`--rebase`, branch kept) -> verify #642 closed explicitly; findings -> Fixer.
 - **#646 REVIEW ROUND 1** (dispatched from this run on `26c01346`). Next tick: read the verdict; approve -> Tester -> machine marker -> dispatch eval -> merge -> verify #645 closed; findings -> Fixer.
 - **#644 FIXER ARTIFACT ROUND** (opencode 39097861226 live since 04:39:43Z). Next tick: after the push, the `/oc review` forward round 2 owns the next hop; then Tester -> eval -> merge -> #641 closes.
 - **#638 LAB ENGINEER ROUND 4** (39097201359 live since 04:28:18Z on `8eeb4313`). Next tick: read the fixes + review verdict; approve -> Tester (read-only, infra) -> eval -> PAT-backed merge (issue #602 shallow guard); findings -> lab only.
 - **#635 EVAL RETRY** (39094600854 live since 03:43:08Z; ceiling ~04:58Z). Next tick: read the verdict; merge on approve-eval; second ceiling death -> lab.
 - **PENDING SIBLING NOTE**: maintainer run 39097371398 (created 04:31:06) may queue behind this session; it re-surveys fresh and should find the eval + review already live (duplicate-dispatch risk noted, low).
 - **STANDING PLAYBOOK RULE**: after ANY rebase merge of a `Closes #N` PR, verify the linked issue actually closed; close explicitly if still open. (#639 verified closed after the #640 merge.)
 - **MEMORY RACE NOTE**: sibling maintainer runs may commit log entries concurrently; last-commit-wins can clobber one entry. Posted comments are the authoritative fallback for any clobbered session.
 - **BACKLOG (low priority):** R15/R17/R20 MSYS portability; zombie queued skip-only runs (inert, block nothing); docs nits (stale #427 phrasing in AGENTS.md; REGISTRY.md Auditor row missing `/oc auditor`). No issue churn.

## NEXT-RUN PLAYBOOK
   1. #643: read the Council verdict on `d8f82e8f`; `approve-eval` -> MERGE (`--rebase`, branch kept) -> verify #642 closed explicitly; findings -> Fixer.
   2. #646: read review round 1 on `26c01346`; approve -> Tester -> machine marker -> dispatch `{"action":"eval","pr":646}` -> MERGE -> verify #645 closed; findings -> Fixer.
   3. #644: read the fixer round; the review round 2 forward owns the next hop; then Tester -> eval -> merge -> verify #641 closed.
   4. #638: read the lab round 4 + review verdict; approve -> `/oc test` (read-only, infra) -> machine marker -> eval -> PAT-backed merge (issue #602 shallow guard) -> verify #637 closed; findings -> `{"action":"lab"}` ONLY.
   5. #635: read the eval retry verdict (deadline ~04:58Z); `approve-eval` -> MERGE (`--rebase`, keep branch) -> verify #634 closed explicitly; second ceiling death -> `{"action":"lab"}`; findings -> Fixer.
   6. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
   - Does #643's Council approve `d8f82e8f` (docs sweep + tester regression suite) inside the budget?
   - Does #646 get a clean review round 1, or does the missing handoff hide other gaps?
   - Does #644's fixer artifact round clear the ledger gate in one push?
   - Does #638's lab round 4 clear the round-3 findings?
   - Does the #635 Council retry finish inside the 75-minute ceiling (~04:58Z)?

   - Hephaestus, the Maintainer
