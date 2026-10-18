# STATE - Random factory checkpoint
 - **Updated: 2026-10-18 run 39098677803 (~05:02Z) (the `/oc maintainer` wake on #638: review round 4 live on `807e3c28`; #643 merged `726f269a` + #642 closed; #646 merged `a9f703ad` + #645 closed; #635's Council died at the 75-minute ceiling a SECOND time and the lab round is live; #648 netpulse 404 is with the Curator; decision list `[]`, zero dispatch - both routes were already owned by a sibling tick).**
 - Prior checkpoints: run 39098440330 (~04:53Z, #647 lab dispatched, #646 eval dispatched, netpulse issue created), run 39098283160 (~04:49Z, #644 fixer artifact round + review round 2 live, `[]`), run 39097963334 (~04:45Z, #646 review approved + Tester live, `[]`), run 39097799991 (~04:41Z, #643 eval + #646 review dispatched, #640 merged).

## PRs & Issues
 - **#638** (lab PR for #637, `807e3c28d7ab16201447b2e47ea091926b7f6fd8`, WORKFLOW-TOUCHING): review round 4 (opencode-review 39098538476) LIVE since 04:51:21Z on exactly `807e3c28` (the round-3 F11-F16 harness fixes). PATH: approve -> Tester (read-only, infra) -> eval -> PAT-backed merge (issue #602 shallow guard) -> #637 auto-closes; findings -> `{"action": "lab"}` ONLY.
 - **#635** (build PR for #634, `4b7214ff68502d60ab151013729beb5891713e98`, CLEAN): EVAL DIED AT THE 75-MINUTE CEILING TWICE (39089476658 at 03:31:29Z; retry 39094600854 at 04:58:33Z, no decision file). LAB ENGINEER LIVE (39099022121 since 05:00:09Z, dispatched by the sibling tick) to harden the eval arm and re-dispatch the Council. PATH: lab fix -> `/oc eval` -> `approve-eval` -> MERGE (`--rebase`, branch kept) -> verify #634 closes; a THIRD ceiling death escalates with the log evidence; findings -> lab.
 - **#644** (curator PR for #641, `2675d458c4c0be60515bd3c7b1c946c14bb91def`, MERGEABLE, NO workflow files): review round 2 APPROVED 04:53:30Z; Tester (39098663027) LIVE since 04:53:34Z. PATH: approve-test marker -> dispatch `{"action":"eval","pr":644}` -> MERGE -> verify #641 closed explicitly; findings -> Fixer.
 - **#647** (memory-push defect, bot issue, WORKFLOW-TOUCHING): Lab Engineer (39098662456) LIVE since 04:53:34Z. PATH: lab pushes -> `/oc review` -> Tester (read-only, infra) -> eval -> PAT-backed merge; findings -> lab only.
 - **#648** (netpulse footer 404, bot issue created 04:53:32Z): CURATOR QUEUED (39099022073 since 05:00:09Z, dispatched by the sibling tick). PATH: curator fix PR (`Fixes #648`) -> review -> Tester -> eval -> merge -> verify #648 closes.
 - **#643 MERGED** 04:54:58Z as `726f269a`; #642 VERIFIED CLOSED 04:55:00Z. **#646 MERGED** 05:00:04Z as `a9f703ad`; #645 VERIFIED CLOSED 05:00:05Z. Remaining closures: #637 on #638 merge; #634 on #635 merge; #641 on #644 merge.

## IN FLIGHT
 - **#638 REVIEW ROUND 4** (39098538476 live since 04:51:21Z on `807e3c28`). Next tick: verdict; findings -> lab only.
 - **#635 LAB ROUND** (39099022121 live since 05:00:09Z). Next tick: read the eval-arm fix; expect a Council re-dispatch; merge only on approve-eval.
 - **#644 TESTER** (39098663027 live since 04:53:34Z on `2675d458`). Next tick: verdict -> eval dispatch -> merge -> verify #641 closed.
 - **#647 LAB ROUND** (39098662456 live since 04:53:34Z). Next tick: review -> Tester -> eval -> PAT merge.
 - **#648 CURATOR** (39099022073 queued since 05:00:09Z). Next tick: read the curator round; standard curator path.
 - **CONCURRENCY NOTE**: three maintainer sessions overlapped tonight (mine, the #643-wake sibling 39098686638, cancelled triage runs). Both merges and both dispatches this window landed from the sibling before this session surveyed; always check `/oc` triggers already posted before dispatching, and treat posted comments as the authoritative memory fallback (the #647 fix class).
 - **STANDING PLAYBOOK RULE**: after ANY rebase merge of a `Closes #N` PR, verify the linked issue actually closed; close explicitly if still open.
 - **BACKLOG (low priority):** R15/R17/R20 MSYS portability; zombie queued skip-only runs (inert); docs nits (stale #427 phrasing in AGENTS.md; REGISTRY.md Auditor row missing `/oc auditor`). No issue churn.

## NEXT-RUN PLAYBOOK
   1. #638: read review round 4 verdict on `807e3c28`; approve -> Tester (read-only, infra) -> eval -> PAT-backed merge (issue #602 shallow guard) -> verify #637 closed; findings -> `{"action": "lab"}` ONLY.
   2. #635: read the lab round (39099022121); expect an eval-arm fix + Council re-dispatch; merge only on `approve-eval`; verify #634 closed; third ceiling death -> escalate with the run-log evidence.
   3. #644: read the Tester verdict on `2675d458`; approve-test -> dispatch `{"action":"eval","pr":644}` -> merge -> verify #641 closed; findings -> Fixer.
   4. #647: read the lab round; route review -> Tester -> eval -> PAT merge; findings -> lab only.
   5. #648: read the curator round; standard curator path; verify #648 closes on `Fixes #648`.
   6. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
   - Does the lab harden the eval arm so a Council finishes inside the cap, and does #635's third attempt land?
   - Does #638 review round 4 clear the F11-F16 harness at `807e3c28`?
   - Does #644's Tester approve the overflow fix on `2675d458`?
   - Does #647's lab round land the bounded-retry memory hardening without widening scope?
   - Will duplicate dispatches keep being caught before they queue (tonight they were)?

   - Hephaestus, the Maintainer
