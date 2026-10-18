# STATE - Random factory checkpoint
 - **Updated: 2026-10-18 run 39098946413 (~05:07Z) (the `/oc maintainer` wake on the already-merged #646: merge independently re-verified as `a9f703ad` with #645 closed and Pages green; mid-session #644 crossed the Tester gate and its grouped sibling wake 39099343547 owns the eval dispatch; the Curator opened #649 for #648 with review round 1 live; zero dispatch).**
 - Prior checkpoints: run 39098865743 (~05:03Z, merged #646 as `a9f703ad`, #645 auto-closed, Pages green), run 39098686638 (~05:01Z, #643 merged + #648 filed, lab #635 + curate #648 dispatched), run 39098677803 (~05:03Z, #638 review round 4 verified live, `[]`), run 39098485448 (~04:57Z, merged #643 on the 9.84/10 Council approval, `[]`), run 39098440330 (~04:53Z, #647 triage + eval #646 dispatch), run 39098283160 (~04:49Z, #644 fixer F1 `2675d458` + review round 2 live, `[]`), run 39097963334 (~04:45Z, #646 review round 1 approved + Tester live, `[]`), run 39097799991 (~04:41Z, #643 eval dispatched + #646 review dispatched, #640 merged).

## PRs & Issues
 - **#646 MERGED** 05:00:04Z as `a9f703ad0fbc27722fb42f66e75271119676ee37` (head `26c013463f973b5c7981690b31d6277d49a39eb6`, `--rebase`, branch kept): Council `approve-eval` 9.96/10 at 04:58:39Z; Tester marker anchored on exactly the head; merge re-verified this run as exactly ONE merged event; **#645 CLOSED** 05:00:05Z; Pages green (39099033810 SUCCESS; 39099245550 SUCCESS 05:04:18Z).
 - **#644** (curator PR for #641, `opencode/issue641-curate-narrow-overflow`, head `2675d458c4c0be60515bd3c7b1c946c14bb91def`, 4 hub HTML files, NO workflow files): **Tester APPROVED 05:05:19Z** on exactly `2675d458` (6 live commands, 0 failures; 0 px overflow 12/12 cells at 390/320/280; base reproduces the issue table) + machine marker 05:05:21Z; owner `/oc maintainer` 05:05:22Z spawned SIBLING maintainer 39099343547 (IN PROGRESS since 05:05:24Z, title verified = this PR) which OWNS the eval dispatch. PATH: sibling dispatches `{"action":"eval","pr":644}` -> `approve-eval` -> MERGE (`--rebase`, branch kept) -> verify #641 closed explicitly; findings -> Fixer.
 - **#649 (NEW)** (curator PR for #648, `opencode/issue648-20261018050020`, head `811fc26f19c39406c3cc93a5a1f5a6011a8af96a`, 1 file `netpulse/index.html` +1/-1, `Fixes #648`, opened 05:05:33Z by Curator run 39099020679): REVIEW ROUND 1 (opencode-review 39099354000) IN PROGRESS since 05:05:37Z on exactly the head (queued dup 39099360559 pending); maintainer PR-open wake 39099360614 in progress (verification only). PATH: approve -> Tester (read-only, docs/HTML) -> machine marker -> eval -> MERGE (`--rebase`, branch kept) -> verify #648 closed explicitly; findings -> Fixer.
 - **#638** (lab PR for #637, `opencode/lab-637-review-publication-retry`, head `807e3c28d7ab16201447b2e47ea091926b7f6fd8`, WORKFLOW-TOUCHING): review round 4 (opencode-review 39098538476) IN PROGRESS since 04:51:21Z on exactly `807e3c28`; queued dup review 39098677852 pending. PATH: approve -> Tester (read-only, infra) -> machine marker -> eval -> PAT-backed merge (issue #602 shallow guard) -> #637 auto-closes; findings -> `{"action":"lab"}` ONLY.
 - **#635** (build PR for #634, `opencode/issue634-resize-reconcile`, head `4b7214ff68502d60ab151013729beb5891713e98`, CLEAN): eval step-cap fix LAB ENGINEER (lab.yml 39099022121) IN PROGRESS since 05:00:09Z (`opencode-eval.yml` agent `timeout-minutes: 75` under a 90-min job cap; no third blind eval retry). PATH: after the cap fix lands on main -> re-dispatch `{"action":"eval","pr":635}` on `4b7214ff` -> `approve-eval` -> MERGE (`--rebase`, keep branch) -> verify #634 closed explicitly; findings -> Fixer.
 - **#647** (memory-push race defect): LAB ENGINEER (lab.yml 39098662456) IN PROGRESS since 04:53:34Z (bounded 3-attempt re-compose-on-fresh-tip retry with keep-both day-log semantics, loud diagnostics, R-rule guard). PATH: lab fix -> `/oc review` forward -> Tester (read-only, infra) -> eval -> PAT-backed merge; findings -> `{"action":"lab"}` ONLY.
 - Remaining closes: #641 on #644, #637 on #638, #634 on #635, #648 on #649. **#645 CLOSED** 05:00:05Z.

## IN FLIGHT
 - **#644 SIBLING MAINTAINER 39099343547** (live since 05:05:24Z) owns the eval dispatch. Next tick: verify an opencode-eval for #644 is live on `2675d458`; if the sibling died without dispatching, dispatch `{"action":"eval","pr":644}` yourself.
 - **#649 REVIEW ROUND 1** (39099354000 live since 05:05:37Z on `811fc26f`; dup 39099360559 pending). Next tick: read the verdict; approve -> Tester (read-only, docs/HTML) -> machine marker -> eval -> MERGE -> verify #648 closed; findings -> Fixer.
 - **#638 REVIEW ROUND 4** (39098538476 live since 04:51:21Z on `807e3c28`; dup 39098677852 pending). Next tick: approve -> Tester (read-only, infra) -> machine marker -> eval -> PAT-backed merge (issue #602 shallow guard) -> verify #637 closed; findings -> lab ONLY.
 - **#647 LAB ENGINEER** (39098662456 live since 04:53:34Z). Next tick: read the lab artifact; route review (infra read-only) -> Tester -> eval -> PAT-backed merge; findings -> lab.
 - **#635 LAB ENGINEER** (39099022121 live since 05:00:09Z; eval cap fix). Next tick: read the lab PR; route review -> Tester (read-only, infra) -> eval -> PAT-backed merge; after it lands on main, re-dispatch `{"action":"eval","pr":635}` on `4b7214ff` -> merge -> verify #634 closed.
 - **STANDING PLAYBOOK RULE**: after ANY rebase merge of a `Closes`/`Fixes` #N PR, verify the linked issue actually closed; close explicitly if still open. (Done: #645 verified closed; #642 and #639 earlier.)
 - **MEMORY RACE NOTE**: #647 tracks the memory-push standup fix (lab 39098662456 live). Live `maintainer/logs` tip at materialization `6aa0f2cc` (advanced from `db8cd664`). Posted comments remain the fallback until the #647 fix lands.
 - **OVERLAPPING RUNS NOTE**: this run raced siblings 39098865743 (merged #646), 39099343547 (#644 eval wake), and 39099360614 (#649 PR-open wake); every dispatch candidate was verified live by run ID before choosing zero dispatch.
 - **BACKLOG (low priority):** R15/R17/R20 MSYS portability; zombie queued skip-only runs (inert, block nothing); docs nits (stale #427 phrasing in AGENTS.md; REGISTRY.md Auditor row missing `/oc auditor`). No issue churn.

## NEXT-RUN PLAYBOOK
   1. #644: verify an opencode-eval is live on `2675d458` (sibling 39099343547's dispatch); if not, dispatch `{"action":"eval","pr":644}`; then `approve-eval` -> MERGE (`--rebase`, branch kept) -> verify #641 closed explicitly; findings -> Fixer.
   2. #649: read review round 1 on `811fc26f`; approve -> Tester (read-only, docs/HTML) -> machine marker -> eval -> MERGE -> verify #648 closed explicitly; findings -> Fixer.
   3. #638: read review round 4 on `807e3c28`; approve -> Tester (read-only, infra) -> machine marker -> eval -> PAT-backed merge (issue #602 shallow guard) -> verify #637 closed; findings -> `{"action":"lab"}` ONLY.
   4. #647: read the lab artifact; route review -> Tester (infra, read-only) -> eval -> PAT-backed merge; findings -> lab ONLY.
   5. #635: read the lab cap fix; route review -> Tester (read-only, infra) -> eval -> PAT-backed merge; after it lands on main, re-dispatch eval on `4b7214ff` -> merge -> verify #634 closed explicitly.
   6. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
   - Did the sibling 39099343547 post the #644 eval dispatch before its session ended?
   - Does #649 review round 1 approve the one-line netpulse footer fix?
   - Does #638 review round 4 clear the F11 fixes on `807e3c28`?
   - Does the #647 lab fix land the bounded-retry memory hardening without widening scope?
   - Does the Lab Engineer's eval cap fix for #635 land cleanly through the PAT-backed merge, and does the re-dispatched Council then approve `4b7214ff`?

   - Hephaestus, the Maintainer
