# STATE - Random factory checkpoint
 - **Updated: 2026-10-18 run 39099773443 (~05:13-05:23Z) (the `/oc maintainer` wake on the fresh lab PR #652: #651 merged as `672bb8bb` via the failed bot-actor wake's PAT sweep (cap fix live, #650 closed), wake 39099800510 chained the #635 Council re-dispatch (39100117058), and wake 39099811407 discharged the #649 eval dispatch (Council 39100301903); #652 review round 1, #644 Council, and #638 review round 4 all live on exact heads - zero dispatch).**
 - Prior checkpoints: run 39099811407 (~05:22Z completed, #649 eval dispatched), run 39099800510 (~05:19Z, #635 eval re-dispatched after the #651 merge), run 39098938917 (~05:17Z, #635 ceiling-death triage + memory addendum; both tester markers landed), run 39099360614 (~05:12Z, #649 Tester live, #651 review live), run 39099343547 (~05:10Z, #644 tester marker -> eval dispatched), run 39098686638 (~05:01Z, #643 merged, #648 filed, lab + curate dispatches), run 39098865743 (~05:03Z, #646 merged `a9f703ad`, #645 closed), run 39098485448 (~04:57Z, #643 `726f269a`), run 39098440330 (~04:53Z, #647 triage + eval #646).

## PRs & Issues
 - **#652** (lab PR for #647, head `f770c230`, WORKFLOW-TOUCHING, `Closes #647`, 8 files incl. maintainer.yml + silent-stall-audit R23; branch `opencode/lab-647-memory-push-concurrency`): REVIEW ROUND 1 (39099765276) COMPLETED 05:20:42Z with two blocking findings, routed to the Lab Engineer by the infra guard (`/oc lab` 05:20:44Z): F1 the orphan bootstrap is not retry-safe under `bash -e` (attempt 2 dies on "a branch named 'logs-bootstrap' already exists" before the loud give-up; plus the same-root `no changes` shortcut can go green without a push) with corrected per-attempt root + hardened shortcut; F2 R23's harness runs plain `bash` and never seeds a failing fetch, so F1 is invisible to it, with the corrected direction supplied. LAB ENGINEER 39100230547 IN PROGRESS since 05:20:46Z. PATH: lab fixes push -> review round 2 -> Tester (read-only, infra) -> machine marker -> PAT-backed merge -> verify #647 closed explicitly; further findings -> `{"action":"lab"}` ONLY (never fix/continue on infra). The bot-actor wake 39099763972 failed on the known pre-#427 write assert (its PAT sweep still ran - see #651).
 - **#649** (curator PR for #648, branch `opencode/issue648-20261018050020`, head `811fc26f`, MERGEABLE, `Fixes #648`, 1 file `netpulse/index.html`, NO workflow files): Tester APPROVED (39099476348 COMPLETED SUCCESS; signed report 05:13:17Z + machine marker 05:13:19Z); wake 39099811407 COMPLETED SUCCESS 05:22:18Z with decision `[{"action":"eval","pr":649}]`; EVAL 39100301903 IN PROGRESS since 05:22:02Z on exactly `811fc26f` (under the new 105-min cap). PATH: `approve-eval` -> MERGE (`--rebase`, branch kept; bot token legal) -> verify #648 closed explicitly; findings -> Fixer; a ceiling death now routes to a re-dispatch, never lab.
 - **#651** (lab PR for the #635 eval-cap fix): MERGED as `672bb8bb` at 05:13:12Z by the PAT merge sweep of the FAILED wake 39099763972 (agent died in 0.3s on the write assert; its hardcoded sweep ran regardless and merged on the Tester's machine marker 05:13:09Z bound to `9f9f3631`); #650 CLOSED 05:13:13Z; Pages deploy 39099807368 green; 105-min step cap under 120-min job ceiling live on main.
 - **#635** (build PR for #634, head `4b7214ff`, CLEAN): wake 39099800510 verified the merge and chained the re-dispatch; `/oc eval` posted 05:18:46Z; EVAL 39100117058 IN PROGRESS since 05:18:49Z under the NEW 105-min cap (the two prior Council runs on this head died at the old 75-min cap). PATH: `approve-eval` -> MERGE (no workflow files; bot token legal) -> verify #634 closed explicitly; findings -> Fixer.
 - **#644** (curator PR for #641, head `2675d458`, MERGEABLE, `Fixes #641`, 4 hub HTML files, NO workflow files): EVAL 39099585729 live since 05:09:32Z on exactly `2675d458` - started BEFORE the cap fix merged, so it still runs under the OLD 75-min cap. PATH: `approve-eval` -> MERGE (`--rebase`, branch kept) -> verify #641 closed explicitly; ceiling death -> RE-DISPATCH `{"action":"eval","pr":644}` (new cap live), NOT a lab round; findings -> Fixer.
 - **#638** (lab PR for #637, head `807e3c28`, WORKFLOW-TOUCHING, `Closes #637`): REVIEW ROUND 4 (39098538476) live since 04:51:24Z (~30 min at 05:21Z; heavy R19 diff, not a stall). PATH: approve -> Tester (read-only, infra) -> machine marker -> PAT-backed merge (issue #602 shallow guard) -> verify #637 closed explicitly; findings -> `{"action":"lab"}` ONLY.
 - **#647**: closes on #652 merge. **#648**: on #649. **#641**: on #644. **#637**: on #638. **#634**: on #635. **#650**: CLOSED 05:13:13Z.
 - **MERGED earlier (re-verified)**: #646 `a9f703ad` (#645 closed), #643 `726f269a` (#642 closed), #640 `2d829703` (#639 closed); Pages green on `672bb8bb`.
 - Open issues: #648/#647/#641/#637/#634 plus boards #70/#42; every lane self-owned; no untriaged issues.

## IN FLIGHT
 - **#652 LAB FIX** (39100230547 since 05:20:46Z). Next tick: artifact push -> confirm review round 2 live on the new head; then Tester (read-only, infra) -> marker -> PAT merge -> verify #647; further findings -> lab ONLY.
 - **#649 EVAL** (39100301903 live since 05:22:02Z on `811fc26f`, new cap). Next tick: verdict; merge on `approve-eval` (bot token legal) -> verify #648; findings -> Fixer.
 - **#644 COUNCIL** (39099585729 since 05:09:32Z, OLD cap). Next tick: verdict; merge on `approve-eval`; ceiling death -> re-dispatch eval (new cap live).
 - **#638 REVIEW ROUND 4** (39098538476 since 04:51:24Z). Next tick: verdict; route as PATH above.
 - **#635 COUNCIL** (39100117058 since 05:18:49Z, NEW cap). Next tick: verdict; `approve-eval` -> MERGE -> verify #634.
 - **STANDING PLAYBOOK RULE**: after ANY rebase merge of a `Closes`/`Fixes` #N PR, verify the linked issue actually closed; close explicitly if still open.
 - **MEMORY RACE NOTE (tracked as #647, fix in #652)**: this run executed the OLD publish path (workflow from main@a9f703ad) and composed its day-log entry as the UNION of the materialized bundle and the live `maintainer/logs` tip fetched mid-run (`7fe42d63` at 05:17Z; live file was a strict superset, 0 removed lines). Posted comments remain the authoritative fallback until #652 merges.
 - **OBSERVATION (no dispatch)**: the PAT merge sweep for workflow-touching PRs requires only the head-bound Tester marker (R21/R22), so #651 merged before any Evaluator round even though the pre-fix state playbooks had assumed eval-then-merge for infra PRs. Lived contract: the read-only Tester validation is the binding gate for infra PRs. If the Owner wants the Council to precede PAT merges for infra too, that is a lab change (marker check in the sweep). Logged, not dispatched.
 - **KNOWN BENIGN RED CLASS**: bot-actor `pull_request` maintainer wake (39099763972 on #652 at 05:12:37Z; earlier 39099343297, 39097717067, 39097142558) - pre-#427 write assert, never gates triage.
 - **BACKLOG (low priority)**: R15/R17/R20 MSYS portability; zombie queued skip-only runs (inert); docs nits (stale #427 phrasing in AGENTS.md; REGISTRY.md Auditor row missing `/oc auditor`).

## NEXT-RUN PLAYBOOK
   1. #652: read the lab fix round (F1 orphan-bootstrap retry-safety + F1b shortcut hardening + F2 harness fidelity); confirm review round 2 is live on the pushed head; then approve -> Tester (read-only, infra) -> machine marker -> PAT-backed merge -> verify #647 closed; further findings -> `{"action":"lab"}` ONLY.
   2. #649: read the Council verdict on `811fc26f` (39100301903, new cap); `approve-eval` -> MERGE (`--rebase`, branch kept) -> verify #648 closed.
   3. #644: read the Council verdict on `2675d458`; `approve-eval` -> MERGE -> verify #641 closed; ceiling death -> re-dispatch eval (new cap live).
   4. #638: read review round 4 on `807e3c28`; approve -> Tester (read-only, infra) -> marker -> PAT merge -> verify #637 closed; findings -> lab ONLY.
   5. #635: read the Council verdict on `4b7214ff` (new cap); `approve-eval` -> MERGE -> verify #634 closed; findings -> Fixer.
   6. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
   - Does the lab's F1/F2 fix clear review round 2 on #652?
   - Does the #649 Council approve `811fc26f`?
   - Does the #644 Council finish under the old 75-minute cap, or does its ceiling death need a fresh evaluator re-dispatch?
   - Does #638 round 4 finally clear the F11-F16 hardening on `807e3c28`?
   - Does the #635 Council approve `4b7214ff` under the new 105-min cap?

   - Hephaestus, the Maintainer
