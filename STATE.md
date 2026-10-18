# STATE - Random factory checkpoint
 - **Updated: 2026-10-18 run 39092013920 (~03:02Z) (the #637 hardening landed as PR #638 and review round 1 is live on `b25cc0034`; #636 + #635 Quality Councils both in flight; zero dispatch).**
 - Prior checkpoint: run 39091871167 (~03:00Z, Tester approved #636, eval dispatched).

## PRs & Issues
 - **#638** (lab PR for #637, `opencode/lab-637-review-publication-retry`, head `b25cc0034d3524534daac1afc1c9174e222d52a7`, MERGEABLE/UNSTABLE, 6 commits from main tip `c672f443`, `Closes #637`): WORKFLOW-TOUCHING (opencode-review.yml, silent-stall-audit.sh R19, reviewer.md, AGENTS.md, LAB.md + lab decision record) -> review round 1 LIVE (opencode-review 39091996602, review job since 02:59:06Z; armed by the `/oc review` the lab's hardcoded step posted 02:59:01Z). The red `maintainer` PR check is the pre-#427 bot-PR `pull_request` arm (CLI write-permission assert; same class as #636 39088974144 / #635 39087469440): benign, does not gate the sweep. NOTE: the failed arm's post-agent steps still ran (memory-marker commit 11394700: 1-line `<!-- run -->` log append only; no state damage). PATH: review approve -> auto-forward Tester (read-only, infra) -> machine marker -> eval -> PAT-backed merge sweep (workflow files) -> #637 auto-closes; findings -> `{"action":"lab"}` ONLY (never fix/continue on this PR).
 - **#636** (verified-release PR for #582, `opencode/issue582-verified-release`, head `7e59b0a887a07ddea01568c0af513c9bf33732e9`, MERGEABLE/CLEAN, `Closes #582` at body line 3): Tester approved 02:56:41Z + machine marker 02:56:42Z (first-line, bot-authored; bindings verified by run 39091871167). QUALITY COUNCIL LIVE (opencode-eval 39092002749 since 02:59:10Z on the `/oc eval` posted 02:59:08Z). PATH: `approve-eval` -> MERGE (`--rebase`, branch kept; bot-token legal) -> #582 auto-closes -> explicit #552 retirement step; findings -> Fixer.
 - **#635** (build PR for #634, `opencode/issue634-resize-reconcile`, head `4b7214ff68502d60ab151013729beb5891713e98`, MERGEABLE/CLEAN): Quality Council 39089476658 still in its agent step since 02:16:07Z (~48 min at 03:02Z; #631 precedent 16.4 min; 75-minute cap; crash parity covers a death). PATH: `approve-eval` -> MERGE (`--rebase`, branch kept) -> #634 auto-closes; findings -> Fixer; if it dies -> workflow_run triage arm owns the retry.
 - **#634**: closes on #635 merge. **#582**: closes on #636 merge. **#552**: post-release retirement step (parity checklist + explicit record; owner window ~Oct 23). **#637**: closes on #638 merge. **#612/#620/#622/#632/#633**: DONE.
 - **Merged 2026-10-17/18:** #609, #617, #618, #613, #610, #624, #623, #627, #628, #614, #630, #633, #632, #622, #631. Main tip `c672f443` (ls-remote + API verified, unchanged since the 01:51:48Z #631 merge).
 - **RULE LABELS:** main = R1-R22.
 - **Held runs at survey:** 0 (`action_required` total_count 0). **Failures:** ONE in the last 100 = the pre-#427 `pull_request` arm red on #638 (39091995935, expected class).

## IN FLIGHT
 - **#638 REVIEW ROUND 1** on `b25cc0034`. Next tick: read the verdict; approve -> Tester; findings -> lab (infra guard: NEVER fix/continue on this PR).
 - **#636 COUNCIL** on `7e59b0a8`. Next tick: read the verdict; `approve-eval` -> merge -> #552 retirement; findings -> Fixer.
 - **#635 COUNCIL** on `4b7214ff` (~48 min in). Next tick: read the verdict; `approve-eval` -> merge + #634 close; past 75 min / red -> workflow_run triage owns.
 - **FREE-TIER WATCH (relaxed)**: no recurrence since the 00:55Z blip.
 - **PRE-#427 ARM (standing observation)**: bot-authored-PR `pull_request` arm reds by design (owner closed #427/#429). The failed arm still runs post-agent steps; its only memory effect is a 1-line `<!-- run: <id> -->` log marker.
 - **BACKLOG (low priority):** R15/R17/R20 MSYS portability; bundle into a future lab dispatch; no issue churn.
 - Zombie queued runs (pre-existing, zero impact): four 2026-09-25/2026-10-05 `queued` leftovers on dead branches; blocks nothing current.

## NEXT-RUN PLAYBOOK
   1. #638: read the review verdict on `b25cc0034`; approve -> `/oc test` forwards automatically (Tester read-only, infra); then machine marker -> eval -> PAT-backed merge (workflow files: bot token illegal) -> #637 auto-closes. Findings -> `{"action":"lab"}` only (infra guard; never fix/continue).
   2. #636: read the Council verdict on `7e59b0a8`; on `approve-eval` MERGE (`--rebase`, branch kept; re-verify the #619/#629 binding checks and head unchanged) -> take the explicit #552 retirement step and verify #582 auto-closed; on fix route the exact findings.
   3. #635: read the Council verdict on `4b7214ff`; `approve-eval` -> MERGE (`--rebase`, branch kept; re-verify marker/head binding and merge-base) -> #634 auto-closes; findings -> Fixer; if the eval dies, the workflow_run triage arm owns the retry.
   4. Pages on every new main tip. #552 window ~Oct 23. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
   - Does the #638 review approve the hardening first pass, or return fix findings (hot file silent-stall-audit.sh + the workflow retry wiring)?
   - Does the #635 Council clear in one round (and conclude normally after its long agent step), or return findings to the Fixer?
   - Does the #636 Council approve 9.8+ on `7e59b0a8`, or return fix findings?

   - Hephaestus, the Maintainer
