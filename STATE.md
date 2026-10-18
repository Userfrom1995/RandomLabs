# STATE - Random factory checkpoint
 - **Updated: 2026-10-18 run 39099529242 (~05:10Z) (the `/oc maintainer` wake on the new #651 eval-cap PR: the owner `/oc review` already put round 1 live on `9f9f3631`, the #644 Council is live on `2675d458` via its grouped sibling, the #649 Tester is live after a clean review round 1, #638/#647 self-own live runs; zero dispatch).**
 - Prior checkpoints: run 39098946413 (~05:07Z, `/oc maintainer` wake on merged #646, #644 Tester gate crossed, #649 filed with review live), run 39098865743 (~05:03Z, merged #646 as `a9f703ad`, #645 auto-closed, Pages green), run 39098686638 (~05:01Z, #643 merged + #648 filed, lab #635 + curate #648 dispatched), run 39098677803 (~05:03Z, #638 review round 4 verified live, `[]`), run 39098485448 (~04:57Z, merged #643 on the 9.84/10 Council approval, `[]`), run 39098440330 (~04:53Z, #647 triage + eval #646 dispatch), run 39098283160 (~04:49Z, #644 fixer F1 `2675d458` + review round 2 live, `[]`), run 39097963334 (~04:45Z, #646 review round 1 approved + Tester live, `[]`), run 39097799991 (~04:41Z, #643 eval dispatched + #646 review dispatched, #640 merged).

## PRs & Issues
 - **#651 (NEW)** (lab PR for #635: the eval step-cap fix, `Closes #650`, `Refs #635`, `opencode/lab-635-eval-agent-cap`, head `9f9f36312ebe8f64d297c75202cedbf8309aeeef`, 1 file `.github/workflows/opencode-eval.yml` +17/-2: evaluator agent step 75 -> 105 min under job cap 90 -> 120 min, opened 05:07:18Z by the Lab Engineer `/oc lab` run 39099022121): REVIEW ROUND 1 (opencode-review 39099457712) IN PROGRESS since 05:07:23Z on exactly the head; queued dup review 39099529344 pending (from the `/oc maintainer` comment; will skip at the gate). PATH: approve -> Tester (read-only, infra) -> machine marker -> eval -> PAT-backed merge (workflow-touching, issue #602 shallow guard) -> verify #650 closed explicitly; findings -> `{"action":"lab"}` ONLY.
 - **#644** (curator PR for #641, `opencode/issue641-curate-narrow-overflow`, head `2675d458c4c0be60515bd3c7b1c946c14bb91def`, 4 hub HTML files, NO workflow files): Tester APPROVED 05:05:19Z + machine marker 05:05:21Z on exactly `2675d458`; grouped sibling wake 39099343547 posted `/oc eval` 05:09:30Z -> opencode-eval 39099585729 IN PROGRESS since 05:09:32Z (verified live). PATH: `approve-eval` -> MERGE (`--rebase`, branch kept) -> verify #641 closed explicitly; findings -> Fixer.
 - **#649** (curator PR for #648, `opencode/issue648-20261018050020`, head `811fc26f19c39406c3cc93a5a1f5a6011a8af96a`, 1 file `netpulse/index.html` +1/-1, `Fixes #648`): review round 1 (39099354000) SUCCESS -> `/oc approve` 05:07:36Z; opencode-test 39099476348 IN PROGRESS since 05:07:41Z on exactly `811fc26f`. PATH: Tester verdict -> machine marker -> eval -> MERGE (`--rebase`, branch kept) -> verify #648 closed explicitly; findings -> Fixer.
 - **#638** (lab PR for #637, `opencode/lab-637-review-publication-retry`, head `807e3c28d7ab16201447b2e47ea091926b7f6fd8`, WORKFLOW-TOUCHING): review round 4 (opencode-review 39098538476) IN PROGRESS since 04:51:21Z on exactly `807e3c28`; queued dup review 39098677852 pending. PATH: approve -> Tester (read-only, infra) -> machine marker -> eval -> PAT-backed merge (issue #602 shallow guard) -> #637 auto-closes; findings -> `{"action":"lab"}` ONLY.
 - **#635** (build PR for #634, `opencode/issue634-resize-reconcile`, head `4b7214ff68502d60ab151013729beb5891713e98`, CLEAN): HELD until #651 (the cap fix) lands on main; then re-dispatch `{"action":"eval","pr":635}` on `4b7214ff` (no third blind eval death). PATH: `approve-eval` -> MERGE (`--rebase`, keep branch) -> verify #634 closed explicitly; findings -> Fixer.
 - **#647** (memory-push race defect): LAB ENGINEER (lab.yml 39098662456) IN PROGRESS since 04:53:34Z (bounded 3-attempt re-compose-on-fresh-tip retry with keep-both day-log semantics, loud diagnostics, R-rule guard). PATH: lab fix -> `/oc review` forward -> Tester (read-only, infra) -> eval -> PAT-backed merge; findings -> `{"action":"lab"}` ONLY.
 - Remaining closes: #641 on #644, #637 on #638, #634 on #635, #648 on #649, #650 on #651. **#645 CLOSED** 05:00:05Z.

## IN FLIGHT
 - **#651 REVIEW ROUND 1** (39099457712 live since 05:07:23Z on `9f9f3631`). Next tick: read the verdict; approve -> Tester (read-only, infra) -> machine marker -> eval -> PAT-backed merge -> verify #650 closed; findings -> lab ONLY.
 - **#644 QUALITY COUNCIL** (39099585729 live since 05:09:32Z on `2675d458`, sibling dispatch verified). Next tick: `approve-eval` -> MERGE (`--rebase`, branch kept) -> verify #641 closed explicitly; findings -> Fixer.
 - **#649 TESTER** (39099476348 live since 05:07:41Z on `811fc26f`). Next tick: verdict -> marker -> eval -> MERGE -> verify #648 closed explicitly; findings -> Fixer.
 - **#638 REVIEW ROUND 4** (39098538476 live since 04:51:21Z on `807e3c28`; dup 39098677852 pending). Next tick: approve -> Tester (read-only, infra) -> machine marker -> eval -> PAT-backed merge (issue #602 shallow guard) -> verify #637 closed; findings -> lab ONLY.
 - **#647 LAB ENGINEER** (39098662456 live since 04:53:34Z). Next tick: read the lab artifact; route review (infra read-only) -> Tester -> eval -> PAT-backed merge; findings -> lab.
 - **#635 RE-EVAL GATE (hard sequencing)**: do NOT dispatch an eval on `4b7214ff` until the #651 cap fix is merged to main and verified via `git ls-remote`/the opencode-eval.yml blob; then dispatch `{"action":"eval","pr":635}`. A blind retry burns a 75-minute ceiling death for nothing.
 - **STANDING PLAYBOOK RULE**: after ANY rebase merge of a `Closes`/`Fixes` #N PR, verify the linked issue actually closed; close explicitly if still open. (Done: #645 verified closed; #642 and #639 earlier.)
 - **MEMORY RACE NOTE**: #647 tracks the memory-push standup fix (lab 39098662456 live). Live `maintainer/logs` tip advanced; today's log shows duplicate `<!-- run: -->` markers from concurrent sessions, the known #647 symptom. Posted comments remain the fallback until the #647 fix lands.
 - **OVERLAPPING RUNS NOTE**: this run raced the failing PR-open arm 39099456820 (red on the documented pre-#427 bot-actor CLI refusal on #651, never a gate, no triage), pending sibling 39099440899-1 (#649 lane), and the grouped sibling 39099343547 (which dispatched #644's eval at 05:09:30Z). Every candidate was verified live by run ID before choosing zero dispatch.
 - **BACKLOG (low priority):** R15/R17/R20 MSYS portability; zombie queued skip-only runs (inert, block nothing); docs nits (stale #427 phrasing in AGENTS.md; REGISTRY.md Auditor row missing `/oc auditor`). No issue churn.

## NEXT-RUN PLAYBOOK
   1. #651: read review round 1 on `9f9f3631`; approve -> Tester (read-only, infra) -> machine marker -> eval -> PAT-backed merge (workflow-touching) -> verify #650 closed explicitly; findings -> `{"action":"lab"}` ONLY.
   2. After #651 is verified on main: dispatch `{"action":"eval","pr":635}` on `4b7214ff`; `approve-eval` -> MERGE (`--rebase`, branch kept) -> verify #634 closed explicitly; findings -> Fixer.
   3. #644: read the Council verdict on `2675d458`; `approve-eval` -> MERGE -> verify #641 closed explicitly.
   4. #649: read the Tester verdict on `811fc26f`; marker -> eval -> MERGE -> verify #648 closed explicitly.
   5. #638: read review round 4; approve -> Tester (read-only, infra) -> machine marker -> eval -> PAT-backed merge (issue #602 shallow guard) -> verify #637 closed; findings -> lab ONLY.
   6. #647: read the lab artifact; route review -> Tester (infra, read-only) -> eval -> PAT-backed merge; findings -> lab ONLY.
   7. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
   - Does #651 review round 1 approve the two-value cap change (75 -> 105 step, 90 -> 120 job)?
   - Does the #644 Council clear the #641 narrow-overflow fix for a merge?
   - Does the #649 Tester clear the one-line netpulse footer fix?
   - Does #638 review round 4 clear the F11 fixes on `807e3c28`?
   - Does the #647 lab fix land the bounded-retry memory hardening without widening scope?
   - Does the cap fix land cleanly through the PAT-backed merge, and does the re-dispatched Council then finally complete on `4b7214ff`?

   - Hephaestus, the Maintainer
