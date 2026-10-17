# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39066498480 (~20:29Z) (#623 MERGED (main `d6c809e3`), #619 CLOSED, anchored+head-bound sweep verified live; #627 Curator PR review-approved `9ce47b5d` + Tester live; #614 Tester approved but the lab round owns findings+rebase (CONFLICTING); #622 round-3 review in flight (CONFLICTING); #626 sibling triage live; held 0; allowlist EXACT)**

## PRs & Issues
 - **#627 (Curator, `Fixes #625`) - head `9ce47b5d`, MERGEABLE/UNSTABLE (bot-actor red only).** Review approved 20:25:33Z; `/oc test` auto-forwarded 20:25:35Z -> read-only test 39066659045 in progress. On approve-test: agent-side merge `gh pr merge --rebase` (non-workflow PR; branch kept) -> #625 auto-closes -> confirm pages on the new tip. `Fixes #625` linkage verified live (closingIssuesReferences). Bot-actor red 39066450457 explained on-thread by this run.
 - **#614 (lab #612) - head `a7b64cbe`, CONFLICTING/DIRTY.** Review round-5 approve 20:16:59Z + Tester approve 20:27:01Z are both HEAD-STALE (R21 head-binding refuses pre-rebase verdicts; this is the binding working as designed). A queued duplicate review round independently caught the post-#623 conflict (findings 20:26:04Z) and `/oc lab` 20:26:07Z -> Lab Engineer 39066694606 LIVE (owning findings + the mechanical unification rebase). Conflict set (merge-tree verified): silent-stall-audit.sh (2 hunks), opencode.yml, AGENTS.md (LAB.md auto-merges). Required: keep BOTH R18 (numbered position between R17 and R19) and R21; unify live labels to R1-R21; FAILED body + opencode.yml comment name both; keep both AGENTS.md bullets. After its push: fresh review -> read-only infra test -> PAT merge (`Closes #612`). On merge dispatch the NATIVE PAIR on #582 IN-RUN (`test-macos` + `test-windows`; #609 already merged). Do NOT dispatch test-windows pre-merge: per-OS arms run main's YAML and would reproduce the bug, not prove the fix.
 - **#622 (lab #620) - head `274f2c10`, CONFLICTING/DIRTY.** Round-3 review 39066073234 in flight on the pre-#623 head. Conflict with `d6c809e3` (merge-tree verified): `.github/scripts/silent-stall-audit.sh` ONLY (maintainer.yml/AGENTS.md/LAB.md auto-merge). Verdict routing (do not preempt with a duplicate lab dispatch while the route is live): findings -> the workflow's `/oc lab` forward folds + rebases in one pass; approve -> `/oc test` (stale-head test waste accepted) -> the test-handoff instance dispatches the lab rebase. Then review -> test -> PAT merge (`Closes #620`).
 - **#626 (Curator wiring: SHOWCASE.md refs in curator.md/curator.yml + stray `.tmp/random-lab-decision.json` on main).** Sibling maintainer run 39066491498 in progress (target #626); expected route `lab`. No duplicate dispatch.
 - **#623 MERGED** 20:21:52Z -> main `d6c809e3`; #619 CLOSED 20:21:53Z. Anchored + head-bound sweep VERIFIED LIVE on main (maintainer.yml:873-894 anchored first-line tester marker, :919 head-push binding, :922 mergeability re-query on UNKNOWN). Sibling verify run 39066392447 completed success (merge record posted 20:26:54Z). Rule set on main: R1-R17, R19, R20, R21 (header "R1-R21 matrix"); R18 arrives with #614.
 - **Merged today:** #609 -> 8ccab113; #617 -> 0fe01fd3; #618 -> 17e324579; #613 -> c1a27582; #610 -> 5b65c701; #624 -> b560ed38; #623 -> d6c809e3. Main tip `d6c809e3` (ls-remote + API agree).
 - **#620/#612 OPEN** (fixes #622/#614 in flight). **#582 OPEN** (#609 merged; #614 is the last prerequisite; native pair sequenced behind its merge). **#552 owner window ~Oct 23.** **#70/#42 standing boards.** No untriaged issues.
 - **Boards/health:** allowlist EXACT 19/19 (maintainer.yml:38 list vs live non-maintainer non-native names; GitHub-native Dependabot/Dependency Graph/pages-build-deployment + maintainer self-excluded by design). Held `action_required`: 0. Failures in the recent window: ONLY the documented bot-actor red 39066450457 (#627 pull_request arm). Pages: success on `d6c809e3` (39066499572 20:23:22Z workflow_dispatch; 39066403135 20:22:03Z).
 - **AUTH/MODEL STATE (standing watch):** keyless auth holds; pin `opencode/deepseek-v4.1-flash-free` (model + small_model + ladder), every arm `variant: max`. FreeTier transient class = #620 (fix #622).

## IN FLIGHT
 - **#627 READ-ONLY TEST (39066659045)** -> approve-test -> `/oc maintainer` -> agent-side rebase merge (`Fixes #625`). MERGE-ORDERING note expired with #623's merge: the anchored sweep is live, no marker-paraphrase hazard remains.
 - **#614 LAB ROUND (39066694606)** -> push -> fresh review -> read-only test -> PAT merge (`Closes #612`); the head-stale approvals (review 20:16:59Z, test 20:27:01Z) are refused by the head-binding; do not merge on them.
 - **#622 ROUND-3 REVIEW (39066073234)** -> route as above.
 - **#626 SIBLING (39066491498)** -> verify its triage routed lab next tick; if it died without one, dispatch `{"action":"lab","issue":626}`.
 - Pending maintainer runs: 39066659078 (#627 group, from the `/oc test` fan-out), the #614 tester handoff run (~20:27:03Z), and 39066206140 (from the 20:19Z #623 `/oc maintainer`). Single-slot superseding by design; each re-surveys fresh.
 - PAGES WATCH (standing): re-dispatch after every new main tip (bot merges emit no push event).
 - EXPECTED WRAPPER-PUSH NOISE (standing): App-token push rejection on workflow-touching branches is expected; the PAT step lands the branch - verify via run log/`ls-remote`, admit on-thread, no post-mortem.
 - NATIVE-PROOF SEQUENCING (standing): per-OS arms execute main's workflow YAML; the byte-exact Windows handoff proof REQUIRES a post-merge run (native pair on #582). A pre-merge `/oc test-windows` on #614 would reproduce the bug, not prove the fix - do not dispatch it (the #614 tester's recommendation is captured here as post-merge).
 - TEST-CRASH RULE (standing): retry once; second consecutive silent death on same PR -> `lab`; never a third test.
 - BOT-ACTOR CLASS (standing): documented red + on-thread explanation; no dispatch.
 - Infra routing guard: anything touching `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` routes to `lab`, never `fix`/`continue`.
 - Orphan-main protection holds: verify the PR branch shares history with `main` before every merge. Shallow caveat (issue #602): the sweep unshallows before merge-base checks; verify via `gh api compare/main...<branch>` if a merge is skipped.
 - IP hold (standing): God of War commission declined; original mythic-duel alternative awaiting owner.
 - Standing-board close guard: #70 and #42 never carry `Closes`.
 - Shipping limit: max 2 new-project merges/day (not binding; no new-project PRs in flight).

## NEXT-RUN PLAYBOOK
   1. **#627 (first action): read the Tester verdict** - approve-test -> `gh pr merge 627 --rebase` (branch kept; non-workflow PR, agent-side merge; verify #625 auto-closed + pages redeployed). Findings -> the review workflow routes `fix`.
   2. **#614: watch Lab Engineer 39066694606** - verify the push folds the findings AND lands the R1-R21 unification (R18 in position, R19-R21 preserved; `silent-stall-audit.sh` green); a push without the rebase -> precise lab follow-up. Then review -> read-only infra test -> PAT merge (`Closes #612`); on merge dispatch `{"action": "test-macos", "issue": 582}` + `{"action": "test-windows", "issue": 582}` IN-RUN.
   3. **#622: read round-3 review 39066073234** - findings -> expect the workflow's `/oc lab` forward (fold + rebase in one pass); approve -> `/oc test` (then the test-handoff instance must dispatch the lab rebase for the silent-stall-audit.sh conflict); then review -> test -> PAT merge (`Closes #620`).
   4. NATIVE PAIR: after #614 merges, the pair on #582 against the merged tip is the #612 closing proof; green -> fold parity rows + close #582 + #552 retirement decision; defects -> fix with report evidence.
   5. #626: verify the sibling's triage; missing -> `lab`.
   6. Pages: confirm success after any new main tip; else `gh workflow run pages.yml`.
   7. Held runs: sweep is automatic; if any `action_required` survives, ping the owner.
   8. #552 owner confirmation outstanding (7-day human rule ~Oct 23).
   9. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
  - Does #627's read-only test approve and does the one-line merge land (#625 closes)?
  - Does the #614 lab pass land the mechanical R1-R21 unification in one push, and does the fresh review + test clear it?
  - Does #622's round-3 verdict arrive as findings (one-pass fix+rebase) or approve (test-then-rebase waste)?
  - Does the #626 sibling route `lab` cleanly (SHOWCASE.md wording + `.tmp` cleanup)?
  - With #614 merged, does the native pair on #582 go fully green and sign the last parity rows?

 - Hephaestus, the Maintainer
