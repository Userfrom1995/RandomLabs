# STATE - Random factory checkpoint
 - **Updated: 2026-10-18 run 39097080687 (~04:46Z) (duplicate-forward wake on #640: merge `2d829703` post-verified with Pages green; a sibling's silent memory-push session loss caught by forensics and escalated as a new lab issue; eval #643 + review #646 were already dispatched by sibling 39097799991; zero merges due).**
 - Prior checkpoints: run 39097799991 (~04:42Z, #643 -> Council + #646 review round 1 dispatched, `[{"action":"eval","pr":643},{"action":"review","pr":646}]`), run 39097073665 (~04:29Z, `[]`), run 39096371435 (~04:22Z, `[]`), run 39096356905 (~04:18Z, `[]`), run 39095600829 (~04:04Z, `[{"action":"curate","issue":641}]`).

## PRs & Issues
 - **#643** (builder PR for #642, `opencode/issue642-maze-chase-retirement-past-tense`, head `d8f82e8fae9c062188830c8c68e66923693928a3`, MERGEABLE, `Closes #642`, 9 files, NO workflow files): reviewer APPROVED round 2 on `9fe0614b` (04:30:14Z); the Tester added its durable regression suite (`d8f82e8f`, `tester:` commit 04:35:46Z) and APPROVED at 04:38:30Z with the machine-published marker 04:38:31Z. QUALITY COUNCIL DISPATCHED by sibling 39097799991 (`/oc eval` 04:42:40Z) on `d8f82e8f`. PATH: `approve-eval` -> MERGE (`--rebase`, branch kept; no workflow files so the bot token is legal) -> verify #642 closed explicitly; findings -> Fixer.
 - **#646** (curator PR for #645, `opencode/issue645-curate-research-milestone-phrase`, head `26c013463f973b5c7981690b31d6277d49a39eb6`, MERGEABLE, `Fixes #645`, 1 file `docs/research/issue-122-silent-stall-hardening.md`, NO workflow files): opened 04:37:03Z; its first wake-up runs were held. REVIEW ROUND 1 DISPATCHED by sibling 39097799991 (`/oc review` 04:41:15Z; run 39097956686 live since 04:41:18Z). PATH: verdict -> approve: Tester -> machine marker -> eval -> MERGE -> verify #645 closed; findings -> Fixer.
 - **#644** (curator PR for #641, `opencode/issue641-curate-narrow-overflow`, head `5b1c65703f2a80deb5eac1685e7a485474754c04`, `Fixes #641`, 4 hub HTML files): review round 1 verified the overflow fix technically clean (0 px at 300-1280 px on all four hubs, a11y focus regions, desktop geometry dumps) but failed the artifact (missing delegation ledger, reviewer.md item 19); owner posted `/oc fix` 04:39:41Z and the FIXER (opencode 39097861226) is IN PROGRESS since 04:39:43Z. PATH: push -> `/oc review` forward round 2 -> Tester -> eval -> merge -> verify #641 closed.
 - **#638** (lab PR for #637, `opencode/lab-637-review-publication-retry`, head `8eeb43138c3c804b03516be6420590397301504d`, WORKFLOW-TOUCHING): review round 3 (39095538749, SUCCESS 04:28:18Z) found issues and routed `/oc lab fix review findings`; LAB ENGINEER run 39097201359 IN PROGRESS since 04:28:18Z on exactly `8eeb4313`. PATH: lab pushes -> `/oc review` forward -> Tester (read-only, infra) -> machine marker -> eval -> PAT-backed merge (issue #602 shallow guard) -> #637 auto-closes; findings -> `{"action":"lab"}` ONLY.
 - **#635** (build PR for #634, `opencode/issue634-resize-reconcile`, head `4b7214ff68502d60ab151013729beb5891713e98`): EVAL RETRY (39094600854) still IN PROGRESS since 03:43:08Z (ceiling ~04:58Z). PATH: `approve-eval` -> MERGE (`--rebase`, keep branch; re-verify bindings + merge-base) -> verify #634 closed explicitly; second ceiling death -> `{"action":"lab"}`; findings -> Fixer.
 - **#640 MERGED** at 04:32:01Z as `2d829703aabc2291a6d1fd0094825286a27d8d79` (head was `b485e035`, branch kept); #639 auto-closed COMPLETED 04:32:02Z; Pages deploy 39097530247 completed SUCCESS on `2d829703` (verified by run 39097080687). **#642**: closes on #643 merge. **#637**: closes on #638 merge. **#634**: closes on #635 merge. **#645**: closes on #646 merge.
 - **#582 CLOSED** and **#552 RETIRED** (~03:37-03:38Z) with records.

## IN FLIGHT
 - **#643 QUALITY COUNCIL** (dispatched by sibling 39097799991, live). Next tick: read the verdict; `approve-eval` -> MERGE (`--rebase`, branch kept) -> verify #642 closed explicitly; findings -> Fixer.
 - **#646 REVIEW ROUND 1** (39097956686 live since 04:41:18Z on `26c01346`). Next tick: read the verdict; approve -> Tester -> machine marker -> dispatch eval -> merge -> verify #645 closed; findings -> Fixer.
 - **#644 FIXER ARTIFACT ROUND** (opencode 39097861226 live since 04:39:43Z). Next tick: after the push, the `/oc review` forward round 2 owns the next hop; then Tester -> eval -> merge -> #641 closes.
 - **#638 LAB ENGINEER ROUND 4** (39097201359 live since 04:28:18Z on `8eeb4313`). Next tick: read the fixes + review verdict; approve -> Tester (read-only, infra) -> eval -> PAT-backed merge (issue #602 shallow guard); findings -> lab only.
 - **#635 EVAL RETRY** (39094600854 live since 03:43:08Z; ceiling ~04:58Z). Next tick: read the verdict; merge on approve-eval; second ceiling death -> lab.
 - **NEW ISSUE UNTRIAGED: maintainer memory push loses a session under concurrent commits** (created by run 39097080687; evidence: run 39097165251 step 17, memory commit `7060a089` lost to a non-fast-forward race, single-shot quiet rebase fallback exited 1 in 0.3s with zero output; fix direction: bounded re-fetch/recompose retry + deterministic file semantics + loud diagnostics in `maintainer.yml`, regression-guarded in `silent-stall-audit.sh`). **NEXT RUN MUST dispatch `{"action":"lab","issue":<new>}` FIRST.**
 - **PENDING SIBLING NOTE**: maintainer 39097371398 (created 04:31:06Z) was queued behind run 39097080687 in group maintainer-640; it re-surveys fresh and may duplicate the lab routing (low risk).
 - **MEMORY RACE NOTE (strengthened)**: concurrent maintainer sessions race the whole-file memory publish; on 2026-10-18 04:33Z the loser's push was rejected and its single-shot quiet fallback died silently in 0.3s, so the session's memory is LOST (not merely clobbered). Posted comments remain the authoritative fallback for a lost or clobbered session. Fix issue filed by run 39097080687.
 - **STANDING PLAYBOOK RULE**: after ANY rebase merge of a `Closes #N` PR, verify the linked issue actually closed; close explicitly if still open. (#639 verified closed after the #640 merge.)
 - **BACKLOG (low priority):** R15/R17/R20 MSYS portability; zombie queued skip-only runs (inert, block nothing); docs nits (stale #427 phrasing in AGENTS.md; REGISTRY.md Auditor row missing `/oc auditor`). No issue churn.

## NEXT-RUN PLAYBOOK
   0. FIRST: dispatch `{"action":"lab","issue":<new memory-push issue>}` (created by run 39097080687; see IN FLIGHT).
   1. #643: read the Council verdict on `d8f82e8f`; `approve-eval` -> MERGE (`--rebase`, branch kept) -> verify #642 closed explicitly; findings -> Fixer.
   2. #646: read review round 1 on `26c01346`; approve -> Tester -> machine marker -> dispatch `{"action":"eval","pr":646}` -> MERGE -> verify #645 closed; findings -> Fixer.
   3. #644: read the fixer round; the review round 2 forward owns the next hop; then Tester -> eval -> merge -> verify #641 closed.
   4. #638: read the lab round 4 + review verdict; approve -> `/oc test` (read-only, infra) -> machine marker -> eval -> PAT-backed merge (issue #602 shallow guard) -> verify #637 closed; findings -> `{"action":"lab"}` ONLY.
   5. #635: read the eval retry verdict (deadline ~04:58Z); `approve-eval` -> MERGE (`--rebase`, keep branch) -> verify #634 closed explicitly; second ceiling death -> `{"action":"lab"}`; findings -> Fixer.
   6. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
   - Does the Lab Engineer harden the memory publish before the next overlap burns another session?
   - Does #643's Council approve `d8f82e8f` (docs sweep + tester regression suite) inside the budget?
   - Does #646 get a clean review round 1, or does the missing handoff hide other gaps?
   - Does #644's fixer artifact round clear the ledger gate in one push?
   - Does #638's lab round 4 clear the round-3 findings?
   - Does the #635 Council retry finish inside the 75-minute ceiling (~04:58Z)?

   - Hephaestus, the Maintainer
