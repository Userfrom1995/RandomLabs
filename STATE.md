# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39060213240 (#618 merge triage: the PAT sweep merged #618 on a substring false positive at 18:55:19Z before its verdict; review approved retroactively 19:00:08Z and the read-only test is live; #616 closed; #609 conflicts with the new main -> lean lab rebase dispatched; merge-sweep defect filed; main `17e324579`)**

## PRs & Issues
 - **#618** (lab vehicle for #616, head `06e3ab2b`): MERGED 18:55:19Z as `17e324579` - **via a PAT-sweep false positive, not its gate** (the maintainer's own summary comment quoted #609's tester phrase; `maintainer.yml:873` unanchored `contains()` matched; no verdict and no read-only test at merge time). Retroactive review verdict: `/oc approve` 19:00:08Z (R1-R19, 17/0); read-only infra test run 3906054494x live since 19:00:13Z (bookkeeping). `Closes #616` closed 18:55:21Z. The #616 acceptance check (gate fires on the next review-gate death) remains a watch item.
 - **#609** (lab vehicle for #608, head `88cd5bc9`, CONFLICTING with main: 15 ahead / 6 behind): round-3 review approved 18:43:47Z + tester PASS 18:50:48Z on `88cd5bc9`, but the sweep skipped it at 18:55:25Z as `mergeable=UNKNOWN` (post-merge recompute race) and #618's merged R19 changes conflict with its R17. **LEAN LAB REBASE DISPATCHED this run** (keep R17 + R19, unify range strings to R1-R19, audit green, push; no maintainer.yml/lab.yml edits, no API-key re-adds; 60m ceiling still current). Then review round 4 -> read-only infra test -> PAT merge (`Closes #608`). First native-pair prerequisite.
 - **#614** (lab vehicle for #612, head `e561a42a`): lab run 39059539758 LIVE since 18:46:00Z (ceiling ~19:46Z). Its push will also collide with the new main (R18 vs R19) - expect a follow-up lean rebase pass if the agent does not self-rebase. Second native-pair prerequisite.
 - **#617** (product fix for #615, head `23716030`): the tester retry pushed 5 hostile tier-precedence edge regressions at 18:59:36Z and APPROVED at 19:00:28Z (head `23716030`); handoff `/oc maintainer` 19:00:29Z -> sibling maintainer arm 39060571484 (issue_comment, live) owns the `/oc eval` dispatch - **verify an eval run exists next run**. Then approve-eval -> orphan guard -> merge `--rebase` (`Closes #615`). Second provider death -> lab, never a third blind test.
 - **NEW ISSUE this run (merge-sweep false positive):** "[Infra] PAT merge sweep: a bot comment that quotes the tester approval phrase merges an unapproved workflow PR" - UNTRIAGED; the create_issue self-dispatch should route it to `lab`; if no lab dispatch appears by ~19:30Z, dispatch `lab` for it as the highest-priority infra defect (it can false-merge any open workflow PR).
 - **#616 CLOSED** 18:55:21Z via #618. **#608 OPEN** (via #609). **#615 OPEN** (via #617). **#612 OPEN** (via #614). **#582 parent OPEN.** **#552 owner window ~Oct 23.** **#70/#42 standing boards.**
 - **Merged earlier today:** #610 -> `5b65c701`; #613 -> `c1a27582`; #606, #607. Main tip `17e324579` (ls-remote + API agree).
 - **#582 NATIVE ARMS (LAST GATE):** unchanged sequencing behind #609 AND #614 merging; fallback bound unchanged. Only fully green reports flip `maze-chase/docs/parity.md` rows and unlock the #552 retirement decision; `Closes #582` reserved for the verified-complete PR.
 - **Boards/health:** allowlist self-audit exact both directions (19 `workflows:` entries at maintainer.yml:38 vs 19 live non-maintainer workflow names; maintainer self-excluded by design; Dependabot Updates / Dependency Graph / pages-build-deployment GitHub-native). Held runs: 2 PR-freshness holds from the #617 tester push (18:59:43Z) - this run's hardcoded terminal sweep clears them. Failures in the last 200 runs: exactly TWO, both owned - 39059688305 (documented bot-actor class) and 39059437136 (#617 tester FreeTierError, retried and approved). Pages: 39060274560 success 18:56:16Z + 39060640945 success 19:01:22Z on the new tip. Untriaged issues: none besides the new merge-sweep issue above.
 - **AUTH/MODEL STATE (standing watch):** keyless auth holds; pin remains `opencode/deepseek-v4.1-flash-free` (model + small_model + ladder), every arm `variant: max`. **FREE-TIER WATCH:** one occurrence 18:45Z (retried and approved 19:00:28Z); a SECOND provider death on any arm -> `lab` for a transient-error retry policy.
 - **MERGE-SWEEP HAZARD (new, standing):** until the new issue's fix lands, the PAT sweep can false-approve any open workflow PR from any bot comment that quotes the tester phrase. Distrust any sweep approve-test timestamp that does not correspond to an actual tester verdict comment.

## IN FLIGHT
 - **#609 LEAN LAB REBASE (dispatched this run):** rebase `opencode/lab-608-peros-findings-report` onto `17e324579`, keep R17 + R19, unify range strings, audit green, push. Then review round 4 -> read-only infra test -> PAT merge (`Closes #608`).
 - **#614 LAB ROUND (run 39059539758, since 18:46:00Z):** watch for a conflict with the new main on push; if conflicted, lean lab rebase.
 - **#617 EVAL DISPATCH (sibling arm from the 19:00:29Z handoff):** verify an `/oc eval` run exists next run; approve-eval -> merge (`Closes #615`).
 - **#618 READ-ONLY TEST (run 3906054494x, since 19:00:13Z):** bookkeeping on the merged head.
 - **NEW MERGE-SWEEP ISSUE:** verify triage routed it to `lab`.
 - SHALLOW-CLONE CAVEAT (issue #602): this workspace is shallow, so `git merge-base --is-ancestor` can false-negative on valid branches; verify linkage with `gh api repos/.../compare/main...<branch>` and `gh pr view --json mergeable,mergeStateStatus` before merging.
 - PAGES WATCH (standing): re-dispatch after every new main tip (bot merges emit no push event).
 - EXPECTED WRAPPER-PUSH NOISE (standing): App-token push rejection on workflow-touching branches is expected; the PAT step lands the branch - verify via run log/`git ls-remote`, admit on-thread, no post-mortem.
 - TEST-CRASH RULE (standing): retry once; second consecutive silent death on same PR -> `lab`; never a third test.
 - BOT-ACTOR CLASS (standing): documented red + on-thread explanation; no dispatch (vehicle #427 / PR #429 closed unmerged).
 - Infra routing guard: anything touching `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` routes to `lab`, never `fix`/`continue`.
 - Orphan-main protection holds: verify the PR branch shares history with `main` before every merge.
 - IP hold (standing): God of War commission declined; original mythic-duel alternative awaiting owner.
 - Standing-board close guard: #70 and #42 never carry `Closes`.
 - Shipping limit: max 2 new-project merges/day (not binding; no new-project PRs in flight).

## NEXT-RUN PLAYBOOK
   1. Verify the new merge-sweep issue got a lab dispatch (its create_issue self-dispatch); if not, `{"action":"lab","issue":<N>}` - highest-priority infra defect.
   2. #609: watch the rebase push -> review round 4 -> read-only infra test -> PAT merge (`Closes #608`).
   3. #617: confirm `/oc eval` is live; approve-eval -> verify merge-base/orphan guard -> merge `--rebase` (`Closes #615`); findings -> route per findings (fixer for product defects).
   4. #614: lab push -> review -> read-only infra test -> PAT merge (`Closes #612`); conflict with the new main -> lean lab rebase.
   5. NATIVE PAIR (first-action rule): the instance that merges the second of #609/#614 dispatches `{"action":"test-macos","issue":582}` + `{"action":"test-windows","issue":582}` on #582 in-run; fully green -> parity-row fold + #552 decision; defects -> `fix` with the report evidence; if a lane exhausts retries unmerged, dispatch the pair anyway and track that lane separately.
   6. #618 side effects: none actionable (retro gates clean); watch the #616 gate acceptance on the next review-gate death.
   7. Pages: confirm success after any new main tip; else `gh workflow run pages.yml`.
   8. Held runs: sweep is automatic; if any `action_required` survives, investigate and ping the owner if manual approval is needed.
   9. #552 owner confirmation outstanding (7-day human rule ~Oct 23).
  10. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
  - Does the merge-sweep fix land quickly, given it can false-merge any open workflow PR?
  - Does the #609 rebase land cleanly and does `Closes #608` finally close?
  - Does #614's push conflict with the new main, and does its lane close R18?
  - Does #617 clear eval and merge (`Closes #615`), or does the provider hit again?
  - Does the merged #616 gate actually fire on the next review-gate death (its acceptance check)?
  - With both prerequisites merged, do the fresh native arms go fully green on the same tip so the parity rows flip and the #552 retirement decision unlocks?

 - Hephaestus, the Maintainer
