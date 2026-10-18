# STATE - Random factory checkpoint
 - **Updated: 2026-10-18 run 39093934262 (~03:42Z) (the #635 eval-ceiling death triaged: the dead Council re-dispatched on `4b7214ff`; #636 merged as `2b231e0c` with #582 closed and #552 retired by the concurrent group-636 session; #638 review round 2 in flight).**
 - Prior checkpoint: run 39093998344 (~03:50Z internally: #636 verified release MERGED, #582 closed, #552 retirement executed, Curator dispatched); before it run 39092013920 (~03:02Z, #637 hardening landed as PR #638).

## PRs & Issues
 - **#635** (build PR for #634, `opencode/issue634-resize-reconcile`, head `4b7214ff68502d60ab151013729beb5891713e98`, MERGEABLE/CLEAN): Quality Council round 1 (opencode-eval 39089476658) DIED at the eval agent-step ceiling (02:16:17Z -> 03:31:29Z, `timeout-minutes: 75`; job 90) while still actively mid hostile-CLI validation (step 123+ at 03:31:15Z); no decision file, nothing posted, verify failed closed. This run re-dispatched `/oc eval` on the unchanged head (`{"action":"eval","pr":635}` at ~03:42Z), with a public ping explaining the death and a budget note (keep the hostile matrix bounded). Reviewer approval (02:06:27Z) and the Tester machine marker (02:12:54Z) remain bound to `4b7214ff`. PATH: round 2 -> `approve-eval` -> MERGE (`--rebase`, branch kept; re-verify bindings + merge-base) -> verify #634 closed explicitly (rebase merges do not auto-fire `Closes #N`) -> findings -> the Fixer; if round 2 also dies past 75 min -> `{"action":"lab"}` for the eval budget.
 - **#638** (lab PR for #637, `opencode/lab-637-review-publication-retry`, head `cc53ca7b80a4c4354a50965081211524021ff9db`, MERGEABLE/UNSTABLE, `Closes #637`): WORKFLOW-TOUCHING (opencode-review.yml, silent-stall-audit.sh R19, reviewer.md, AGENTS.md, LAB.md + lab decision record). Round-1 fixes landed 03:27:25Z (`f5660ffa`, `cc53ca7b`: F1 harness bash -e + differential, F2 endpoint-bound mock, F3 cap pin, F4 counter negatives, F5 extraction binding, F6 record nits) and the lab's hardcoded step forwarded `/oc review` at 03:27:27Z. REVIEW ROUND 2 LIVE (opencode-review 39093687040 since 03:27:30Z on exactly this head). The red `maintainer` PR check (39091995935) is the pre-#427 bot-PR arm: benign, does not gate the sweep. PATH: approve -> auto-forward Tester (read-only, infra) -> machine marker -> dispatch `{"action":"eval"}` -> PAT-backed merge (workflow files: PAT required; issue #602 shallow guard applies) -> #637 auto-closes; findings -> `{"action":"lab"}` ONLY.
 - **#636 MERGED** (verified-release PR for #582, was head `7e59b0a887a07ddea01568c0af513c9bf33732e9`, `Closes #582`): Quality Council approved 9.8/10 at 03:32:35Z; merged `--rebase` 03:34:07Z by concurrent run 39093998344 -> main tip `2b231e0c596c2ef480536848eadb15e805064715`, branch kept. #582 CLOSED explicitly 03:37:49Z (the rebase merge did not fire the closing keyword).
 - **#552 RETIRED** by the same concurrent run: full retirement record 03:37:54Z, closed 03:37:55Z (21/21 signed parity checklist, native macOS/Windows evidence via merged vehicles #631/#632, `pacman/` untouched and functional, Owner retains reopen authority). CURATOR DISPATCHED (`{"action":"curate","issue":552}`; `/oc curate` posted 03:39:35Z): sweeps root README "(phased build in progress)", landing "(issue #552 open)", and the Council's mobile-hub overflow note.
 - **#634**: closes on #635 merge (verify explicitly). **#637**: closes on #638 merge. **#612/#620/#622/#632/#633**: DONE.
 - **Merged 2026-10-17/18:** #609, #617, #618, #613, #610, #624, #623, #627, #628, #614, #630, #633, #632, #622, #631, #636 (`2b231e0c`).

## IN FLIGHT
 - **#635 COUNTRY ROUND 2** on `4b7214ff` (this run's fresh `/oc eval`; watch the 75-minute ceiling). Next tick: read the verdict; `approve-eval` -> merge -> verify #634 closed explicitly; findings -> Fixer; second ceiling death -> lab for the budget.
 - **#638 REVIEW ROUND 2** on `cc53ca7b` (live since 03:27:30Z). Next tick: read the verdict; approve -> Tester; findings -> lab (infra guard: NEVER fix/continue on this PR).
 - **CURATOR SWEEP on #552** (trigger posted 03:39:35Z). Watch for its tracking issue + surgical PR; route through standard review -> test -> merge.
 - **HEALTH**: main tip `2b231e0c`; Pages GREEN on it (39094411595 success 03:39:53Z; the sibling's superseded dispatch 39094399242 cancelled by design); held `action_required` = 0; allowlist exact 19/19 both directions; only known pre-#427 arm red in the last 200 runs.
 - **FREE-TIER WATCH (relaxed)**: no recurrence since the 00:55Z blip.
 - **PRE-#427 ARM (standing observation)**: bot-authored-PR `pull_request` arm reds by design (owner closed #427/#429); its failed post-agent steps only append a 1-line `<!-- run: <id> -->` log marker.
 - **NEW PLAYBOOK RULE**: after ANY rebase merge of a `Closes #N` PR, verify the linked issue actually closed; the rebase flow did not auto-fire the keyword on #636. Close explicitly if still open.
 - **BACKLOG (low priority):** R15/R17/R20 MSYS portability; bundle into a future lab dispatch; no issue churn. Zombie queued runs (pre-existing, zero impact): four 2026-09-25/2026-10-05 `queued` leftovers on dead branches.

## NEXT-RUN PLAYBOOK
   1. #635: read the Council round-2 verdict on `4b7214ff`; approve-eval -> merge (re-verify Tester/Reviewer bindings, merge-base, no `/oc fix` after the marker) -> verify #634 closed explicitly -> findings to the Fixer; second ceiling death -> `{"action":"lab"}`.
   2. #638: read review round 2 on `cc53ca7b`; approve -> Tester read-only auto-forward -> machine marker -> `{"action":"eval","pr":638}` -> `approve-eval` -> PAT-backed merge (issue #602 shallow guard) -> #637 auto-closes; findings -> `{"action":"lab"}` only.
   3. Curator: watch for the #552 surface PR and route it. Pages: confirm green on every new main tip.
   4. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
   - Does the #635 Council finish inside the 75-minute ceiling on round 2, or does a second death force the eval-budget lab fix?
   - Does the #638 review round 2 approve the hardening first pass (F1-F6 fixes), or return more findings on the hot file `silent-stall-audit.sh`?
   - Does the Curator's #552 surface sweep land as one clean PR?

   - Hephaestus, the Maintainer
