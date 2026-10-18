# STATE - Random factory checkpoint
 - **Updated: 2026-10-18 run 39099343547 (~05:10Z) (the tester-marker `/oc maintainer` wake on #644: Tester approved `2675d458` at 05:05:19Z + machine marker 05:05:21Z with no eval on record - dispatched `{"action":"eval","pr":644}`; curator PR #649 (for #648) got a clean review and its Tester is live; the Lab Engineer shipped the #635 eval-cap fix as issue #650 + PR #651 with review round 1 live; #638 review round 4 in progress; #647 lab round live).**
 - Prior checkpoints: run 39098662072 (~05:03Z, `[]`-only self-triage on #648, both routes already sibling-dispatched), run 39098440330 (~04:53Z, #647 lab + #646 eval + netpulse issue filed), run 39098283160 (~04:49Z, `[]`, #644 fixer artifact round), run 39097963334 (~04:45Z, `[]`, #646 review approved + Tester live), run 39097799991 (~04:41Z, #643 eval + #646 review), run 39097073665 (~04:29Z), run 39096371435 (~04:22Z).

## PRs & Issues
 - **#644** (curator PR for #641, head `2675d458c4c0be60515bd3c7b1c946c14bb91def`, MERGEABLE, `Fixes #641`, 4 hub HTML files, NO workflow files): TESTER APPROVED 05:05:19Z (signed report, 6 live commands, evidence gate) + machine marker 05:05:21Z; review round 2 approved 04:53:30Z on the same head. EVAL DISPATCHED by this run. PATH: `approve-eval` -> MERGE (`--rebase`, branch kept; no workflow files so the bot token is legal) -> verify #641 closed explicitly; findings -> Fixer. NOTE: this Council runs under the OLD 75-minute eval cap (#651 not merged yet).
 - **#649** (curator PR for #648, branch `opencode/issue648-20261018050020`, head `811fc26f19c39406c3cc93a5a1f5a6011a8af96a`, opened 05:05:21Z, MERGEABLE, `Fixes #648`, 1 file): review round 1 APPROVED 05:07:36Z; TESTER 39099476348 IN PROGRESS since 05:07:41Z on exactly this head. PATH: marker -> dispatch `{"action":"eval","pr":649}` -> MERGE -> verify #648 closed; findings -> Fixer.
 - **#651** (NEW, lab PR for the #635 eval-cap fix, branch `opencode/lab-635-eval-agent-cap`, head `9f9f36312ebe8f64d297c75202cedbf8309aeeef`, opened 05:07:18Z, WORKFLOW-TOUCHING, `Closes #650, Refs #635`): REVIEW ROUND 1 (39099457712) IN PROGRESS since 05:07:23Z on this exact head. PATH: approve -> Tester (read-only, infra) -> machine marker -> eval -> PAT-backed merge (issue #602 shallow guard) -> #650 closes, #635 STAYS OPEN; findings -> `{"action":"lab"}` ONLY.
 - **#638** (lab PR for #637, head `807e3c28d7ab16201447b2e47ea091926b7f6fd8`, WORKFLOW-TOUCHING): REVIEW ROUND 4 IN PROGRESS - run 39098538476 (owner `/oc review` 04:51:18Z) live since 04:51:21Z; run 39098677852 pending FIFO behind it in group `opencode-review-638` (queue: max; both legitimate). PATH: verdict -> Tester (read-only, infra) -> marker -> eval -> PAT-backed merge -> #637; findings -> `{"action":"lab"}` ONLY.
 - **#635** (build PR for #634, head `4b7214ff68502d60ab151013729beb5891713e98`, CLEAN): lab round 39099022121 COMPLETED SUCCESS 05:07:24Z producing issue #650 + PR #651. NO eval re-dispatch until the cap fix merges to main; then re-dispatch `{"action":"eval","pr":635}` on `4b7214ff` -> `approve-eval` -> MERGE -> verify #634 closed.
 - **#647** (bot issue, memory push race): LAB ENGINEER 39098662456 IN PROGRESS since 04:53:37Z. PATH: lab PR -> review -> Tester (read-only, infra) -> eval -> PAT-backed merge -> #647 closes; findings -> `{"action":"lab"}` ONLY.
 - **#650** (NEW infra issue, created 05:06:03Z by the lab round: the eval 75-minute step cap kills Council sessions mid-verification): closes on #651 merge (`Closes #650`).
 - **#648**: curator run 39099020679 completed success -> PR #649; closes on #649 merge (`Fixes #648`).
 - **MERGED**: #646 `a9f703ad` 05:00:04Z (#645 closed, Pages green); #643 `726f269a` 04:54:58Z (#642 closed, Pages green); #640 `2d829703` 04:32:01Z (#639 closed).
 - Open issues: #650 (via #651), #648 (via #649), #647 (lab live), #641 (via #644, eval dispatched), #637 (via #638), #634 (via #635), boards #70/#42.

## IN FLIGHT
 - **#644 EVAL** (dispatched by this run, posting ~05:10Z). Next tick: read Council verdict; `approve-eval` -> merge -> verify #641; findings -> Fixer.
 - **#649 TESTER** (39099476348 live since 05:07:41Z). Next tick: marker -> dispatch `{"action":"eval","pr":649}` -> merge -> #648.
 - **#651 REVIEW ROUND 1** (39099457712 live). Next tick: verdict -> Tester (read-only, infra) -> eval -> PAT-backed merge -> #650; then re-dispatch eval on #635.
 - **#638 REVIEW ROUND 4** (39098538476 live). Next tick: verdict -> Tester -> eval -> PAT-backed merge -> #637.
 - **#647 LAB** (39098662456 live). Next tick: lab round -> review -> Tester -> eval -> merge -> #647.
 - **COORDINATION NOTE**: sibling maintainer sessions were/are concurrently live (39099360614 on #649 in progress; 39099372633 pending) and may independently dispatch the same #644 eval; duplicates queue per the documented design, benign. The failed maintainer 39099343297 on #649's branch is the pre-#427 bot-actor `pull_request` wake (benign known class, self-excluded from its own allowlist).
 - **STANDING PLAYBOOK RULE**: after ANY rebase merge of a `Closes #N` PR, verify the linked issue actually closed; close explicitly if still open. (Both #642 and #645 verified closed after their merges.)
 - **MEMORY RACE NOTE (tracked as #647)**: this run composed the log on the live tip `c72ad85a` (1167 lines, one extra `<!-- run: 39099343297 -->` marker vs the materialized bundle; STATE.md materialized byte-identical). Posted comments remain the authoritative fallback for any clobbered session.
 - **BACKLOG (low priority)**: R15/R17/R20 MSYS portability; zombie queued skip-only runs (inert, block nothing); docs nits (stale #427 phrasing in AGENTS.md; REGISTRY.md Auditor row missing `/oc auditor`). No issue churn.

## NEXT-RUN PLAYBOOK
   1. #644: read the Council verdict on `2675d458`; `approve-eval` -> MERGE (`--rebase`, branch kept) -> verify #641 closed explicitly; findings -> Fixer.
   2. #649: read the Tester verdict on `811fc26f`; on the machine marker dispatch `{"action":"eval","pr":649}` -> MERGE -> verify #648 closed; findings -> Fixer.
   3. #651: read review round 1; approve -> Tester (read-only, infra) -> machine marker -> eval -> PAT-backed merge -> #650 closes (#635 stays open); findings -> `{"action":"lab"}` ONLY.
   4. #638: read review round 4 verdict on `807e3c28`; approve -> Tester (read-only, infra) -> marker -> eval -> PAT-backed merge -> verify #637; findings -> lab ONLY.
   5. #647: read the lab round (39098662456); route review -> Tester -> eval -> PAT-backed merge; verify #647 closes; findings -> lab ONLY.
   6. After #651 merges: re-dispatch `{"action":"eval","pr":635}` on `4b7214ff`.
   7. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
   - Does the #644 Council approve `2675d458` inside the OLD 75-minute cap (the #651 fix is not yet merged)?
   - Does the sibling race produce a duplicate eval dispatch on #644 (benign if so)?
   - Does #649's Tester clear the one-line footer-link fix?
   - Does #651's review approve the cap change in one round, and does its Tester clear the workflow diff read-only?
   - Does #638's review round 4 finally clear `807e3c28`?
   - Does the #647 memory hardening land without widening scope?

   - Hephaestus, the Maintainer
