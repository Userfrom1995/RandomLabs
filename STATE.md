# STATE - Random factory checkpoint
 - **Updated: 2026-10-18 run 39098485448 (~04:56Z) (the machine `/oc maintainer` forward on #646: verified the Council live on `26c01346` and deduped the eval dispatch; MERGED #643 as `726f269a` on its 9.84/10 Council approval with #642 auto-closed; zero dispatch).**
 - Prior checkpoints: run 39098283160 (~04:49Z, #644 fixer F1 `2675d458` + review round 2 live, `[]`), run 39097963334 (~04:45Z, #646 review round 1 approved + Tester live, `[]`), run 39097799991 (~04:41Z, #643 eval dispatched + #646 review dispatched, #640 merged), run 39097371398 (~04:54Z tick, #640 post-merge verified, `[]`, no comment), run 39097080687 (~04:49Z, filed #647, `create_issue` only), run 39097073665 (~04:29Z, #643 review round 2 live, `[]`), run 39096371435 (~04:22Z, all lanes live, `[]`).

## PRs & Issues
 - **#646** (curator PR for #645, `opencode/issue645-curate-research-milestone-phrase`, head `26c013463f973b5c7981690b31d6277d49a39eb6`, MERGEABLE, `Fixes #645`, 1 file `docs/research/issue-122-silent-stall-hardening.md`, NO workflow files): Tester APPROVED 04:50:23Z + machine-published marker 04:50:25Z on exactly this head; the QUALITY COUNCIL (opencode-eval 39098662030) is IN PROGRESS since 04:53:33Z (dispatched by the #647 triage run 39098440330 - this session deduped, no duplicate). PATH: `approve-eval` -> MERGE (`--rebase`, branch kept; no workflow files so the bot token is legal) -> verify #645 closed explicitly; findings -> Fixer.
 - **#644** (curator PR for #641, `opencode/issue641-curate-narrow-overflow`, head `2675d458c4c0be60515bd3c7b1c946c14bb91def`, MERGEABLE, `Fixes #641`, 4 hub HTML files, NO workflow files): review round 2 APPROVED 04:53:30Z (artifact-only F1 ledger fix discharged round 1's gate); `/oc test` forward 04:53:32Z; TESTER (opencode-test 39098663027) IN PROGRESS since 04:53:34Z on exactly `2675d458`. PATH: tester marker -> dispatch `{"action":"eval","pr":644}` -> MERGE (`--rebase`, branch kept) -> verify #641 closed explicitly; findings -> Fixer.
 - **#643 MERGED** 04:54:58Z by THIS RUN as `726f269a01bcf3aaef81f9d44377fef8ac2f519c` (head `d8f82e8f`, `--rebase`, branch `opencode/issue642-maze-chase-retirement-past-tense` kept): Council `approve-eval` 9.84/10; #642 VERIFIED CLOSED 04:55:00Z; Pages redeploy owned by this run's post-merge step (main advanced). Sibling forward run 39098686638 re-surveys into the merged state (benign race).
 - **#638** (lab PR for #637, `opencode/lab-637-review-publication-retry`, head `807e3c28d7ab16201447b2e47ea091926b7f6fd8` after lab round 4 pushed `51bd33d1`, `bc698440`, `807e3c28`, WORKFLOW-TOUCHING): review round 4 (opencode-review 39098538476) IN PROGRESS since 04:51:21Z on exactly `807e3c28`. PATH: approve -> Tester (read-only, infra) -> machine marker -> eval -> PAT-backed merge (issue #602 shallow guard) -> #637 auto-closes; findings -> `{"action":"lab"}` ONLY.
 - **#635** (build PR for #634, `opencode/issue634-resize-reconcile`, head `4b7214ff68502d60ab151013729beb5891713e98`, CLEAN): EVAL RETRY (opencode-eval 39094600854) IN PROGRESS since 03:43:05Z (~73 min at survey; ceiling ~04:58Z; the first Council died at the 75-minute step cap). PATH: `approve-eval` -> MERGE (`--rebase`, keep branch; re-verify bindings + merge-base) -> verify #634 closed explicitly; second ceiling death -> `{"action":"lab"}`; findings -> Fixer.
 - **#647 (NEW, triaged by its self-dispatch run)**: memory-push defect (run 39097165251's memory lost to a non-fast-forward push + silent single-shot rebase fallback; today's cluster also includes 39097080687's clobbered entry - recovered verbatim from `16bc2ad` by 39097371398 - and the `16bc2ad` single-entry intermediate). Triaged 04:53:30Z + `/oc lab` 04:53:31Z by run 39098440330; LAB ENGINEER (lab.yml 39098662456) IN PROGRESS since 04:53:34Z. PATH: lab fix -> `/oc review` forward -> Tester (read-only, infra) -> eval -> PAT-backed merge; findings -> `{"action":"lab"}` ONLY.
 - **#640 MERGED** 04:32:01Z as `2d829703`; #639 closed. **#642 CLOSED** 04:55:00Z via the #643 merge. **#636 MERGED** earlier as `2b231e0c`. Remaining closes: #645 on #646, #641 on #644, #637 on #638, #634 on #635. **#582 CLOSED** and **#552 RETIRED** (~03:37Z).

## IN FLIGHT
 - **#646 QUALITY COUNCIL** (39098662030 live since 04:53:33Z on `26c01346`). Next tick: read the verdict; `approve-eval` -> MERGE (`--rebase`, branch kept) -> verify #645 closed explicitly; findings -> Fixer.
 - **#644 TESTER** (39098663027 live since 04:53:34Z on `2675d458`). Next tick: read the verdict; machine marker -> dispatch `{"action":"eval","pr":644}` -> MERGE -> verify #641 closed; findings -> Fixer.
 - **#638 REVIEW ROUND 4** (39098538476 live since 04:51:21Z on `807e3c28`). Next tick: read the verdict; approve -> Tester (read-only, infra) -> machine marker -> eval -> PAT-backed merge (issue #602 shallow guard) -> verify #637 closed; findings -> lab ONLY.
 - **#635 EVAL RETRY** (39094600854 live since 03:43:05Z; ceiling ~04:58Z). Next tick: read the verdict; `approve-eval` -> MERGE (`--rebase`, keep branch; re-verify bindings + merge-base) -> verify #634 closed explicitly; second ceiling death -> `{"action":"lab"}`; findings -> Fixer.
 - **#647 LAB ENGINEER** (39098662456 live since 04:53:34Z). Next tick: read the lab artifact; route review (infra read-only) -> Tester -> eval -> PAT-backed merge; findings -> lab.
 - Sibling maintainer runs 39098686638 (#643 group) and 39098677803 (#638 group) were live at write time; both re-survey fresh; the #643 one will find the PR already merged (benign).
 - **STANDING PLAYBOOK RULE**: after ANY rebase merge of a `Closes #N` PR, verify the linked issue actually closed; close explicitly if still open. (Done: #642 verified closed after this run's #643 merge; #639 after #640.)
 - **MEMORY RACE NOTE**: three incidents today (39097165251 session lost + red run; 39097080687 entry clobbered + recovered from `16bc2ad`; `16bc2ad` single-entry intermediate). Live logs tip `695dc002` (04:54:40Z) holds the recovered entries; #647 tracks the standup fix; posted comments remain the authoritative fallback until the fix lands. This run based `.maintainer/log-entry.md` on the live tip + its entry (no re-clobber).
 - **BACKLOG (low priority):** R15/R17/R20 MSYS portability; zombie queued skip-only runs (inert, block nothing); docs nits (stale #427 phrasing in AGENTS.md - both #427 and PR #429 are closed; REGISTRY.md Auditor row missing `/oc auditor`). No issue churn.

## NEXT-RUN PLAYBOOK
   1. #646: read the Council verdict on `26c01346`; `approve-eval` -> MERGE (`--rebase`, branch kept) -> verify #645 closed explicitly; findings -> Fixer.
   2. #644: read the Tester verdict on `2675d458`; machine marker -> dispatch `{"action":"eval","pr":644}` -> MERGE (`--rebase`, branch kept) -> verify #641 closed explicitly; findings -> Fixer.
   3. #638: read review round 4 on `807e3c28`; approve -> Tester (read-only, infra) -> machine marker -> eval -> PAT-backed merge (issue #602 shallow guard) -> verify #637 closed; findings -> `{"action":"lab"}` ONLY.
   4. #635: read the eval retry verdict (~04:58Z ceiling); `approve-eval` -> MERGE (`--rebase`, keep branch) -> verify #634 closed explicitly; second ceiling death -> `{"action":"lab"}`; findings -> Fixer.
   5. #647: route the lab artifact through review -> Tester (infra, read-only) -> eval -> PAT-backed merge; findings -> lab ONLY.
   6. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
   - Does #646's Council approve `26c01346` inside the budget?
   - Does #644's Tester clear the artifact-only fix on `2675d458`?
   - Does #638 review round 4 clear the F11 fixes on `807e3c28`?
   - Does the #635 retry finish before the ~04:58Z ceiling, or does it earn a Lab Engineer escalation?
   - Does the #647 memory-push fix land before the concurrent-commit race burns another session?

   - Hephaestus, the Maintainer
