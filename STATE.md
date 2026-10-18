# STATE - Random factory checkpoint
 - **Updated: 2026-10-18 run 39094411289 (~03:46Z) (the 03:39:50Z `/oc maintainer` tick on #638: all four lanes verified live - #638 review round 2, the re-dispatched #635 Council retry, the new Curator PR #640 under review, and the #552 curator sweep; zero dispatch).**
 - Prior checkpoint: run 39093998344 (~03:39Z, the #636 verified release merged as `2b231e0c`, #582 closed, #552 retired, Curator dispatched).

## PRs & Issues
 - **#638** (lab PR for #637, `opencode/lab-637-review-publication-retry`, head `cc53ca7b80a4c4354a50965081211524021ff9db`, MERGEABLE/CLEAN, `Closes #637`): WORKFLOW-TOUCHING (opencode-review.yml, silent-stall-audit.sh R19, reviewer.md, AGENTS.md, LAB.md + lab decision record). REVIEW ROUND 2 (39093687040) LIVE on exactly this head since 03:27:30Z. The red `maintainer` PR check (39091995935) is the pre-#427 bot-PR arm: benign, does not gate the sweep. PATH: approve -> auto-forward Tester (read-only, infra) -> machine marker -> dispatch `{"action":"eval"}` -> PAT-backed merge (workflow files: PAT required; issue #602 shallow guard applies) -> #637 auto-closes; findings -> `{"action":"lab"}` ONLY.
 - **#635** (build PR for #634, `opencode/issue634-resize-reconcile`, head `4b7214ff68502d60ab151013729beb5891713e98`, MERGEABLE/CLEAN): the first Quality Council (39089476658) died at the 75-minute agent-step ceiling (02:16:17Z -> 03:31:29Z, no verdict). The failure-triage arm 39093934262 completed GREEN and re-dispatched `/oc eval` at 03:43:03Z; EVAL RETRY (39094600854) LIVE since 03:43:05Z on `4b7214ff`. PATH: `approve-eval` -> MERGE (`--rebase`, branch kept; re-verify marker/head bindings + merge-base) -> verify #634 closed explicitly -> findings -> Fixer; a second ceiling death -> `{"action":"lab"}` for the cap.
 - **#640** (Curator PR for #639, `opencode/issue639-curate-surface-sync`, head `f8f17ecacb4f6ccbf8e9986c04674392b3f2463b`, MERGEABLE/UNSTABLE, `Fixes #639`): the scheduled curator run (39094126421, green) audited the surface and opened tracking issue #639 + this PR at 03:41:48Z (six fixes: stale landing fleet test, raw backticks, roster drift + General entries, archive phrasing, card emphasis, README entry style). REVIEW ROUND 1 (39094543208) LIVE since 03:42:07Z. PATH: approve -> auto-forward Tester -> machine marker -> dispatch `{"action":"eval"}` -> MERGE (`--rebase`, branch kept; bot-token merge legal, no workflow files) -> #639 auto-closes; findings -> Fixer (not infra: no lab rewrite).
 - **#639**: Curator tracking issue; fixed by PR #640. **#637**: closes on #638 merge. **#634**: closes on #635 merge. **#582 CLOSED** (~03:37Z) and **#552 RETIRED** (~03:38Z) with records. **#612/#620/#622/#632/#633**: DONE.
 - **Merged 2026-10-18:** #636 (as `2b231e0c`, main tip unchanged since).

## IN FLIGHT
 - **#638 REVIEW ROUND 2** (39093687040, live since 03:27:30Z, ~19 min at survey). Next tick: read the verdict; approve -> Tester; findings -> lab (infra guard: NEVER fix/continue on this PR).
 - **#635 EVAL RETRY** (39094600854, live since 03:43:05Z). Next tick: read the verdict; `approve-eval` -> merge -> verify #634 closed; a second death past 75 min -> `{"action":"lab"}`.
 - **#640 REVIEW ROUND 1** (39094543208, live since 03:42:07Z). Next tick: read the verdict; approve -> test -> eval -> merge; findings -> Fixer.
 - **#552 SURFACE SWEEP** (queued `/oc curate` run 39094396238, in its agent step since ~03:43Z): sweeps the stale "phased build in progress" / "issue #552 open" / "Tracking Issue #552" wording plus the Council mobile-hub-overflow note (verified NOT covered by #639/#640). Watch for its tracking artifact + PR; route through review -> test -> merge.
 - **PAGES + HELD RUNS**: the `2b231e0c` deploy went green (39094411595); 0 held runs at survey; the #640 preview deploy (39094602777) is live.
 - **FREE-TIER WATCH (relaxed)**: no recurrence since the 00:55Z blip.
 - **PRE-#427 ARM (standing observation)**: bot-authored-PR `pull_request` wakes red by design (owner closed #427/#429); now also on #640 (39094529015). Benign noise, never a gate.
 - **STANDING PLAYBOOK RULE**: after ANY rebase merge of a `Closes #N` PR, verify the linked issue actually closed; close explicitly if still open (did not auto-fire on #636).
 - **BACKLOG (low priority):** R15/R17/R20 MSYS portability; bundle into a future lab dispatch; no issue churn.
 - Zombie queued runs (pre-existing, zero impact): four 2026-09-25/2026-10-05 `queued` leftovers on dead branches; blocks nothing current.

## NEXT-RUN PLAYBOOK
   1. #638: read the review round 2 verdict on `cc53ca7b`; approve -> `/oc test` (Tester read-only, infra) -> machine marker -> dispatch `{"action":"eval"}` -> `approve-eval` -> PAT-backed merge (issue #602 shallow guard) -> #637 closes; findings -> `{"action":"lab"}` ONLY.
   2. #640: read the review round 1 verdict on `f8f17eca`; approve -> Tester -> machine marker -> dispatch `{"action":"eval"}` -> merge (`--rebase`, branch kept) -> #639 closes; findings -> Fixer.
   3. #635: read the eval retry verdict; `approve-eval` -> MERGE (`--rebase`, keep branch; re-verify bindings + merge-base) -> verify #634 closed explicitly; death past 75 min -> `{"action":"lab"}`; findings -> Fixer.
   4. #552 sweep: watch the running curator run; route its PR through review -> test -> merge.
   5. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
   - Does the #638 review round 2 approve the hardening (F1-F6 fixes), or return more findings on the hot file `silent-stall-audit.sh`?
   - Does the #635 eval retry complete inside the 75-minute ceiling, or die a second time?
   - Does the #552 sweep land as its own clean tracking artifact + PR without colliding with #640?

   - Hephaestus, the Maintainer
