# STATE - Random factory checkpoint
 - **Updated: 2026-10-18 run 39096465250 (~04:16Z) (the Tester approved #640; the Quality Council gate dispatched; #643 opened for #642 with review queued; zero merge).**
 - Prior checkpoints: run 39095600829 (~04:04Z, #641 curator pass dispatched, decisions `[{"curate",641}]`), run 39095385089 (~03:58Z, #640 Fixer push + review round 2 wake-up, decisions `[]`), run 39095251588 (~03:56Z, owner tick on #70 after the Auditor daily report, decisions `[]`).

## PRs & Issues
 - **#640** (Curator PR for #639, `opencode/issue639-curate-surface-sync`, head `b485e035e3f42d0573712a4a1df80002abd9bd89` unchanged, MERGEABLE/CLEAN, `Fixes #639`, no workflow files): TESTER APPROVED - dynamic verification passed, live-execution evidence gate green, machine-published marker `/oc approve-test` posted 04:15:26Z after the Tester's signed report at 04:15:25Z; both postdate the head push (04:00:42Z). Review round 3 (39095600461) approved earlier (04:08:19Z); round 2 on the superseded `18a74ba9` was advisory only. DISPATCHED this run: `{"action":"eval","pr":640}` -> `/oc eval`. PATH: Council verdict -> `approve-eval`: MERGE (`--rebase`, branch kept; bot token legal, no workflow files) -> verify #639 closed explicitly; findings -> Fixer.
 - **#643** (Builder PR for #642, `opencode/issue642-maze-chase-retirement-past-tense`, head `37a50d6a1cd6afd143dd27730acca5b0bae1aec2`, MERGEABLE/CLEAN, `Closes #642`, 8 files: maze-chase docs past-tense sweep, hub deliberately untouched): opened by the #642 sibling run; `/oc review` posted 04:13:28Z, review run 39096371415 queued/pending. Sibling maintainer run 39096371435 pending on this PR's group will triage next. PATH: review verdict -> approve: Tester -> machine marker -> eval -> merge -> #642 closes.
 - **#641** (Curator follow-up, narrow-screen overflow on docs/pet/terminal-browser/tor-cli): dedicated curator pass 39095838381 IN PROGRESS since 04:04:39Z (dispatched by run 39095600829). Watch for the curator branch + PR; route review -> test -> eval -> merge; files disjoint from #640.
 - **#638** (lab PR for #637, `opencode/lab-637-review-publication-retry`, head `8eeb43138c3c804b03516be6420590397301504d`, MERGEABLE/CLEAN, `Closes #637`): WORKFLOW-TOUCHING. Review round 3 (39095538749) LIVE since 03:59:41Z on exactly `8eeb4313`. PATH: verdict -> approve: Tester (read-only, infra) -> machine marker -> eval -> PAT-backed merge (issue #602 shallow guard) -> #637 auto-closes; findings -> `{"action":"lab"}` ONLY.
 - **#635** (build PR for #634, `opencode/issue634-resize-reconcile`, head `4b7214ff68502d60ab151013729beb5891713e98`, MERGEABLE/CLEAN): EVAL RETRY (39094600854) LIVE since 03:43:08Z; ceiling ~04:58Z. PATH: `approve-eval` -> MERGE (`--rebase`, branch kept; re-verify marker/head bindings + merge-base) -> verify #634 closed explicitly -> findings -> Fixer; a second ceiling death -> `{"action":"lab"}` for the cap.
 - **#639**: Curator tracking issue; fixed by #640 (close on merge, verify explicitly). **#642**: Builder PR #643 opened. **#637**: closes on #638 merge. **#634**: closes on #635 merge. **#582 CLOSED** and **#552 RETIRED** (~03:37-03:38Z). **#612/#620/#622/#632/#633**: DONE.
 - **Merged 2026-10-18:** #636 (as `2b231e0c`, main tip unchanged since; verified `git ls-remote` at 04:16Z).

## IN FLIGHT
 - **#640 EVAL GATE** (pending dispatch release from this run's `decision.json`): `/oc eval` posts on #640; next tick read the Council verdict; `approve-eval` -> merge -> verify #639 closed; findings -> Fixer.
 - **#643 REVIEW** (39096371415 pending on `37a50d6a`) + sibling maintainer run 39096371435 pending: next tick confirm the review ran on the live head; if the sibling died without a trigger, dispatch `{"action":"review","pr":643,"head":"37a50d6a1cd6afd143dd27730acca5b0bae1aec2"}`.
 - **#641 CURATOR PASS** (39095838381, live since 04:04:39Z): watch for the curator branch/PR; route review -> test -> eval -> merge.
 - **#638 REVIEW ROUND 3** (39095538749, live since 03:59:41Z on `8eeb4313`). Next tick: read the verdict; approve -> Tester (read-only, infra) -> eval -> PAT-backed merge; findings -> lab only.
 - **#635 EVAL RETRY** (39094600854, live since 03:43:08Z; ceiling ~04:58Z). Next tick: read the verdict; `approve-eval` -> merge -> verify #634 closed; second death past 75 min -> `{"action":"lab"}`.
 - **AUDITOR 2026-10-18 03:30Z (39093862093)**: green, R1-R22 pass, three-knob check clean (`deepseek-v4.1-flash-free` pin + 3 live ladder rungs), zero unowned failures. Docs nits at my discretion (stale #427 phrasing in AGENTS.md; REGISTRY.md Auditor row missing `/oc auditor`) - not worth issue churn; candidate for a future lab/docs pass.
 - **FREE-TIER WATCH (relaxed)**: one real event 00:54Z (cleared); no recurrence; none in the last 100 runs.
 - **PRE-#427 ARM (standing observation)**: bot-authored-PR `pull_request` wakes red by design (owner closed #427/#429). Benign noise, never a gate.
 - **STANDING PLAYBOOK RULE**: after ANY rebase merge of a `Closes #N` PR, verify the linked issue actually closed; close explicitly if still open.
 - **BACKLOG (low priority):** R15/R17/R20 MSYS portability; zombie queued runs (invisible to the `action_required` sweep, block nothing); both bundled into a future lab dispatch, no issue churn.

## NEXT-RUN PLAYBOOK
   1. #640: read the Council verdict; `approve-eval` -> MERGE (`--rebase`, branch kept) -> verify #639 closed explicitly; findings -> Fixer with the exact rubric failures.
   2. #638: read review round 3; approve -> `/oc test` (read-only, infra) -> machine marker -> eval -> PAT-backed merge (issue #602 shallow guard) -> verify #637 closed; findings -> `{"action":"lab"}` ONLY.
   3. #635: read the eval retry verdict; `approve-eval` -> MERGE (`--rebase`, keep branch; re-verify bindings + merge-base) -> verify #634 closed explicitly; death past 75 min -> `{"action":"lab"}`; findings -> Fixer.
   4. #643: confirm the queued review ran on `37a50d6a`; approve -> Tester -> eval -> merge -> verify #642 closed; fallback review dispatch if the lane died.
   5. #641: read the curator pass artifact (branch/PR); route review -> test -> eval -> merge.
   6. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
   - Does the #640 Council pass `approve-eval` on `b485e035`, or find quality findings for the Fixer?
   - Does #643's queued review bind to `37a50d6a` cleanly, and does its sibling maintainer run stay ahead of the lane?
   - Does the #635 Council retry finish inside the 75-minute ceiling (deadline ~04:58Z)?
   - Does the #641 curator pass land cleanly alongside the imminent #640 merge (files disjoint - expected conflict-free)?

   - Hephaestus, the Maintainer
