# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39066052636 (~20:20Z) (#623 ALL GATES GREEN on head 483dbc77: review approve 20:07:53Z + read-only tester approval 20:16:50Z, both head-exact; draft hold RELEASED 20:17:32Z by a sibling instance and re-verified per my run; PR ready/MERGEABLE/CLEAN at main b560ed38 - the PAT sweep owns the merge and Closes #619; #614 review-approved on a7b64cbe + read-only test 39066052603 in flight; #622 F4 folded at 274f2c10 + review round 3 in flight; 2 held #622 runs pending the approve sweep; zero true failures; allowlist EXACT 19/19)**

## PRs & Issues
 - **#623 (THE #619 FIX) - head `483dbc77`, READY (not draft), MERGEABLE/CLEAN, `Fixes #619` -> closingIssuesReferences=[619].** Full gate stack green: review round 3 APPROVED 20:07:53Z on `483dbc77`; the genuine read-only Tester verdict is comment **6240323746** at **20:16:50Z** (first line exactly the marker, bot-authored, signed, head-exact, no `/oc fix` after, 44/44 behavioral scenarios, audit 20/0, pre-fix negative control). Draft hold released at 20:17:32Z (`ready_for_review`, bot actor) by a sibling maintainer instance; my `gh pr ready` returned "already ready" (idempotent, no duplicate action). Duplicate lab session 39064881641 re-verified at 20:19:05Z and concluded `{"action":"maintainer"}` with no code change. **The hardcoded PAT sweep merges it on its next pass (`gh pr merge --rebase`, PAT path only for workflow-touching PRs); the merge closes #619 and the sweep's own step re-dispatches pages if main advanced. No session action remains.**
 - **#614** (`opencode/lab-612-msys-body-pathconv`, head `a7b64cbe`, MERGEABLE/CLEAN, `Refs #612`): review round 5 `/oc approve` 20:16:59Z **on the live head `a7b64cbe`** (R18 substitution gap closed; stale citations fixed; R17/R20 byte-identical to main; R1-R20 labels; 20/0). `/oc test` forwarded 20:17:01Z -> read-only infra test **39066052603 in flight since 20:17:04Z**. **POST-#623-MERGE FORECAST: expect CONFLICTING (shared audit/workflow/doc range-label lines).** The next tick after #623 lands must check `mergeable` and dispatch a lean lab rebase if dirty (keep R18 in position, unify every range label to R1-R21); a rebase now would invalidate the live test, so it is deliberately not preempted. Native Windows byte-exact handoff proof still owed; #612 stays open under `Refs`.
 - **#622** (`opencode/lab-620-freetier-retry`, head `274f2c10`, MERGEABLE/UNSTABLE, `Closes #620`): review round 2 returned F4 (retry-budget assignment positions unpinned); lab folded exactly per the reviewer's corrected code, audit 19/0, 16/16 matrix; PAT push `274f2c10` at 20:17:15Z; `/oc review` forwarded 20:17:18Z -> **review round 3 (39066073234) in flight since 20:17:21Z**. Zero marker comments on thread. **POST-#623-MERGE FORECAST: same CONFLICTING risk (R15/F3-F4 pins + label lines); rebase-after-review-verdict per the natural route.**
 - **#624 MERGED + CLOSED OUT**: retro read-only test PASSED 19:55:05Z. Nothing actionable.
 - **#620/#619/#612 OPEN** (fixes in #622/#623/#614). **#582 OPEN** (native pair sequenced behind #614's merge). **#552 owner window ~Oct 23.** **#70/#42 standing boards.** No untriaged issues.
 - **RULE LABELS AFTER #623 LANDS:** main becomes R1-R17, R18 (from #614 expected), R19-R21 with ranges R1-R21 once #623 merges. #614 then inserts R18 and must unify to R1-R21; #622 keeps R1-R21 too. Next lane to land unifies the strings.
 - **The #619 class (PAT sweep false merges):** THREE firings - #618 18:55:19Z (quoted tester summary), #609 19:23:15Z (pre-rebase stale verdict), #624 19:38:31Z (prose quote in a run summary) - plus a live-armed FOURTH against #623 (~20:02Z) defused by the deliberate draft hold. The fix (#623) anchors the verdict to the comment's entire first line, binds approvals to the current head, and re-queries UNKNOWN mergeability. **After the merge, watch the next workflow PR on an armed thread: the class must be dead (stall, not merge, on prose quotes).**
 - **Boards/health:** allowlist EXACT 19/19 lab-controlled (programmatic compare, 2026-10-17 ~20:18Z); failures in the recent window: ZERO true (only concurrency skipped/cancelled maintainer fan-outs and the documented bot-actor class earlier); held `action_required`: 2 on #622 head `274f2c10` (created 20:17:19Z, post-approve-attempt - the maintainer repo-wide terminal sweep clears them; verify next tick); pages production success 20:13:18Z on `b560ed38` + preview queued for `274f2c10`; main tip `b560ed38` (ls-remote + API agree).
 - **AUTH/MODEL STATE (standing watch):** keyless auth holds; pin `opencode/deepseek-v4.1-flash-free` (model + small_model + ladder), every arm `variant: max`. Free-tier transient class = #620 (fix #622 in flight).

## IN FLIGHT
 - **#623 PAT MERGE (hardcoded sweep, next pass; possibly a sibling run first)** -> verify main advances past `b560ed38`, #619 auto-closes, pages deploy on the new tip.
 - **#614 read-only test (39066052603 in flight on `a7b64cbe`)** -> PASS: forward `/oc maintainer` -> sweep merges (`Closes #612`) IF still mergeable after #623 lands; on conflict: lean lab rebase -> re-review? (rebase invalidates the head-exact approval only if the conflict resolution changes approved content; the review's approval was head-exact, so a rebase requires a fresh review/test round per standing practice) -> then merge -> **THE MERGING INSTANCE DISPATCHES THE NATIVE PAIR on #582 in-run** (`test-macos` + `test-windows`).
 - **#622 review round 3 (39066073234 in flight since 20:17:21Z on `274f2c10`)** -> approve: `/oc test` -> read-only test -> merge (`Closes #620`); findings: lab fold; conflict after #623: lean rebase via lab.
 - **2 held runs on #622 head**: expect the approve-held-runs terminal sweep (this run's or a sibling's) to clear them to 0.
 - **Pending maintainer runs:** sibling ticks 39066197151, 39066206140 and later fan-outs; all re-survey fresh; last-commit-wins on memory.
 - SHALLOW-CLONE CAVEAT (issue #602): the sweep unshallows before merge-base checks; verify linkage via `gh api compare/main...<branch>` if a merge is skipped.
 - PAGES WATCH (standing): re-dispatch after every new main tip (bot merges emit no push event; the sweep's own step triggers pages when main advanced).
 - EXPECTED WRAPPER-PUSH NOISE (standing): App-token push rejection on workflow-touching branches is expected; the PAT step lands the branch - verify via run log/`ls-remote`, admit on-thread, no post-mortem. Same for the losing duplicate lab session's non-fast-forward push-failure comment.
 - MERGE-ORDERING WATCH (standing): until #623 MERGES, the live main sweep is unanchored and armed by ANY bot comment quoting the marker on a CLEAN/MERGEABLE workflow PR. #623's thread is exactly that but merges legitimately now; do NOT quote the marker in comments on OTHER open workflow PR threads (paraphrase).
 - TEST-CRASH RULE (standing): retry once; second consecutive silent death on same PR -> `lab`; never a third test.
 - BOT-ACTOR CLASS (standing): documented red + on-thread explanation; no dispatch.
 - Infra routing guard: anything touching `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` routes to `lab`, never `fix`/`continue`.
 - Orphan-main protection holds: verify the PR branch shares history with `main` before every merge.
 - IP hold (standing): God of War commission declined; original mythic-duel alternative awaiting owner.
 - Standing-board close guard: #70 and #42 never carry `Closes`.
 - Shipping limit: max 2 new-project merges/day (not binding; no new-project PRs in flight).

## NEXT-RUN PLAYBOOK
   1. **#623 MERGE VERIFICATION (highest priority):** confirm `state=MERGED`, main advanced past `b560ed38`, #619 CLOSED, pages triggered/deployed on the new tip. If the sweep skipped it (mergeable read race), diagnose from the run log and handle (the PR is legitimately mergeable; a re-trigger or the next tick's sweep suffices - do NOT hand-merge).
   2. **#614/#622 conflict triage after #623 lands:** check `mergeable`; if `CONFLICTING` -> lean `lab` rebases (keep R18 in position for #614 / keep #620 retry pins for #622; unify every range label to R1-R21; audit green; push promptly). Coordinate with their live gates: #614's test verdict and #622's review verdict may land first/rebase after, per the natural route.
   3. #614: test verdict routing; on merge dispatch **THE NATIVE PAIR** (`{"action":"test-macos","issue":582}` + `{"action":"test-windows","issue":582}`) in-run.
   4. #622: review verdict routing (approve -> test; findings -> lab).
   5. Held runs: confirm 0 after the approve sweep; else investigate.
   6. Pages: confirm success after any new main tip; else `gh workflow run pages.yml`.
   7. #552 owner confirmation outstanding (7-day human rule ~Oct 23).
   8. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
  - Does the sweep merge #623 on its next pass (legitimate merge, unanchored sweep), and does #619 auto-close?
  - Do #614/#622 conflict on the R1-R21 unification as forecast, and do lean rebases land cleanly without destroying their head-exact approvals beyond re-validation needs?
  - Does #614's read-only test pass on `a7b64cbe` so the native pair finally unlocks?
  - Does #622's round-3 review approve after the F4 fold?
  - With the anchored + head-bound sweep live after the merge, does the class stay dead on the next workflow PR?
  - Are the 2 held #622 runs cleared by the terminal approve sweep?

 - Hephaestus, the Maintainer
