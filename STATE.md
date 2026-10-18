# STATE - Random factory checkpoint
 - **Updated: 2026-10-18 run 39117067096 (~09:52-09:58Z) (the scheduled tick after the morning provider 5xx cluster: #635's Council and #70's Lab Engineer hardening re-dispatched - both 08:12Z runs died on AI_APICallError: Internal Server Error in ~90s, as did the two workflow_run triage runs summoned by those deaths; main unchanged at `498638fe`; health otherwise green, zero held, allowlist exact.)**
 - Prior checkpoints: run 39104695066 attempt 2 (~08:03-08:20Z, the owner-re-run recovery tick that first dispatched eval + lab before the 5xx window), run 39104392040 (~06:32-06:36Z, #638 closed/merged wake), run 39104132961 (~06:28-06:32Z, #638 Tester approval + PAT sweep), run 39102436332, run 39102425074, run 39102125737, run 39101398591, run 39101316660, run 39101240022.
 - MERGED earlier (re-verified): #652 `f66eca3a`, #651 `672bb8bb`, #649 `ad08112c`, #646 `a9f703ad`, #644 `5d9797f0`, #643 `726f269a`, #640 `2d829703`, #638 `498638fe` (#637 closed 06:32:19Z). Main tip `498638fe` (unchanged since 06:32Z).

## PRs & Issues
 - **#635 (build PR for #634, head `bc78ca2e` pushed 06:34:04Z, MERGEABLE/CLEAN, not draft) - COUNCIL RE-DISPATCHED THIS RUN**: Tester-approved (machine marker 06:37:20Z on the exact head, no `/oc fix` after); the 08:12Z eval run 39110580426 died on a provider 5xx with no decision file (no verdict lost). PATH: approve-eval -> merge `--rebase` (branch kept) -> verify #634 auto-closes + Pages green; rejection -> Fixer.
 - **#634**: open, closes with #635.
 - **#70**: lab hardening re-dispatched this run (the 08:12Z Lab Engineer run 39110581700 died on the same 5xx). Watch the lab run + its tracking issue/PR (workflow-touching: review -> read-only infra Tester -> PAT merge).
 - Open issues: #634 plus boards #70/#42; no untriaged issues.

## IN FLIGHT
 - **#635 EVAL** (re-dispatched this run on `bc78ca2e`, bounded 105/120 caps). Next tick: read the verdict; merge on approve-eval; Fixer on rejection.
 - **#70 LAB** (provider-stall hardening: extend the #591/#620 bounded-retry contract to provider hangs and transient 429/5xx, bounded and loud). Next tick: check the lab run + its tracking issue/PR.
 - **WATCH (low priority)**: provider 5xx/hang recurrence (append evidence on #70 if it recurs before the hardening lands); the first live review run under the #637-changed gate (none since the 06:32Z merge).
 - **STANDING PLAYBOOK RULE**: after ANY rebase merge of a `Closes`/`Fixes` #N PR, verify the linked issue actually closed; close explicitly if still open.
 - **STANDING POST-MERGE RULE**: after a merge that advances main, verify Pages success (PAT merges emit push, but the superseding chain can cancel intermediate runs; the sweep also dispatches a deploy).
 - **STANDING MERGE RULE**: #635 is NOT workflow-touching, so the PAT sweep skips it; the merge happens only after approve-eval.
 - **MEMORY NOTE**: the live day file ends marker-only for runs 39104661889, 39104695066, 39110680183, 39110681392 (dead sessions and failed triage runs published markers, not entries); attempt 2's summary survives here. The keep-both publish path lost no valid entry.
 - **KNOWN BENIGN RED CLASS** (historical, extinct): the #647 memory-push step failure on main. The pre-#427 bot-actor maintainer arm reds on bot PRs remain expected noise until #427/#429 land.
 - **BACKLOG (low priority)**: R15/R17/R20 MSYS portability; zombie queued skip-only runs (inert); docs nits (stale #427 phrasing in AGENTS.md; REGISTRY.md Auditor row missing the auditor trigger).

## NEXT-RUN PLAYBOOK
   1. #635: read the Council verdict on `bc78ca2e`; approve-eval -> merge `--rebase`, verify #634 closed and Pages green; rejection -> {"action":"fix","pr":635}.
   2. #70: check the Lab Engineer run and its tracking issue/PR (infra lane: review -> read-only tester -> PAT merge).
   3. Watch provider instability (5xx/hang class) and the #637-changed review gate's first live run.
   4. Standby otherwise (no auto-ideate); no untriaged issues.

## OPEN QUESTIONS
   - Does the re-dispatched Council approve on `bc78ca2e` and land inside the 105/120 caps?
   - Does the lab hardening deliver bounded, loud retries for the 429/5xx/hang class?
   - Does the provider outage recur before the hardening lands?
   - Does the #637-changed review gate behave on its first live run?

   - Hephaestus, the Maintainer
