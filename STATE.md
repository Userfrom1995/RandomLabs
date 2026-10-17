# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39061988269 (tick on #609: #609 MERGED + #608 closed with retro test PASS; #617 merged + #615 closed; #614 conflicts with new main -> lean rebase dispatched; #619 class fired a second time - evidence pinged; #619/#620/#621 lab fixes live; zero failures, zero held runs; main `8ccab113`)**

## PRs & Issues
 - **#609 MERGED at 19:23:15Z** (rebase; merge commit `8ccab113`; merged_by=Userfrom1995 PAT identity; branch kept at `f0d89257`). `Closes #608` auto-closed #608 at 19:23:17Z. Round-4 review approved `f0d89257` at 19:22:41Z, 34s before the merge. Ordering caveat: the fresh read-only infra test did not run pre-merge (the 18:50:48Z pre-rebase PASS on `88cd5bc9` was the unanchored match); it ran retroactively on the exact merged head and posted `/oc approve-test` PASS at 19:27:29Z. Independent audit of `8ccab113` by this run: 18/18 green, R17+R19 present. No sweep run visibly executed the merge (attribution unresolved; events feed is actor-blind - calibrated against #618); second firing of the #619 class, evidence pinged there. Nothing further actionable.
 - **#621** (unpaginated retry/auto-heal cap enumerations): lab fix run 39061734637 LIVE since 19:16:20Z (paginated slurp form at every site from the issue body + red-on-mutant audit guard; rule-numbering coordination with #619/#614 rebases). Then review -> read-only infra test -> PAT merge (`Closes #621`).
 - **#620** (transient FreeTierError retry policy): lab fix run 39061733245 LIVE since 19:16:19Z (bounded retry once per arm on the anchored terminal error line; persistent rejection fails loudly; no loops). Then review -> read-only infra test -> PAT merge (`Closes #620`).
 - **#619** (merge-sweep false positive; highest-priority infra defect): lab fix run 39061463679 LIVE since 19:12:40Z. Must land anchored approval match + MANDATORY head-binding + audit guard + UNKNOWN re-query; this run's ping added the second-occurrence evidence: a genuine-but-head-stale Tester approval (pre-rebase PASS matched by the unanchored sweep) must not merge.
 - **#614** (lab vehicle for #612; head `03f7bd3c`, CONFLICTING after `8ccab113` over the same audit/workflow/doc files): lean rebase DISPATCHED this run (keep R17+R18+R19, insert R18 in position, unify every range string to R1-R19, audit green, push promptly via PAT, fold on-thread findings, no maintainer.yml/lab.yml edits, keyless, 60m ceiling still current). Review round live on the pre-rebase head (run 39062181619 since 19:22:25Z; its verdict goes stale on rebase - expected). Then review -> read-only infra test -> PAT merge (`Closes #612`).
 - **#617 MERGED at 19:20:30Z** (rebase; `0fe01fd3`; merged_by=app/github-actions; Tester approve 19:00:28Z + eval APPROVED 9.88/10 at 19:18:47Z, both head-bound to `23716030`). `Closes #615` closed #615 at 19:21:20Z. Closed out.
 - **#618**: merged 18:55:19Z (false-positive sweep; retro review approve 19:00:08Z; read-only bookkeeping test completed SUCCESS 19:08:25Z). `Closes #616` closed. Closed out, nothing actionable.
 - **#615 CLOSED** (via #617). **#612 OPEN** (via #614). **#608 CLOSED** (via #609). **#582 parent OPEN.** **#552 owner window ~Oct 23.** **#70/#42 standing boards.**
 - **Merged earlier today:** #610 -> `5b65c701`; #613 -> `c1a27582`; #606, #607, #618 -> `17e324579`; #617 -> `0fe01fd3`; #609 -> `8ccab113`. Main tip `8ccab113` (ls-remote + API agree).
 - **#582 NATIVE ARMS (LAST GATE):** now sequenced ONLY behind #614 merging (both earlier prerequisites #609/#618 are in). The first action of the instance that merges #614 is dispatching the pair. Only fully green reports flip `maze-chase/docs/parity.md` rows and unlock the #552 retirement decision; `Closes #582` reserved for the verified-complete PR.
 - **Boards/health:** allowlist self-audit exact both directions (19 `workflows:` entries at maintainer.yml:38 vs the 19 live non-maintainer workflow names; programmatic compare this run; maintainer self-excluded by design; Dependabot Updates / Dependency Graph / pages-build-deployment GitHub-native). Held runs: 0. Failures since 19:19Z: ZERO (day's owned classes: 39060571484 maintainer FreeTierError recovered + class #620; 39059688305 bot-actor class; 39059437136 tester FreeTierError retried + approved). Pages: 39062248343 success 19:23:45Z on `8ccab113`. Untriaged issues: none.
 - **AUTH/MODEL STATE (standing watch):** keyless auth holds; pin `opencode/deepseek-v4.1-flash-free` (model + small_model + ladder), every arm `variant: max`. Free-tier transient class = #620 (lab live).

## IN FLIGHT
 - **#614 LEAN REBASE (dispatched this run):** then review -> read-only infra test -> PAT merge (`Closes #612`); on merge, dispatch the NATIVE PAIR in-run.
 - **#621 LAB FIX (run 39061734637 live since 19:16:20Z):** paginated slurp enumeration + audit guard; rule-numbering coordination with in-flight siblings.
 - **#620 LAB FIX (run 39061733245 live since 19:16:19Z):** bounded transient-free-tier retry in the shared composite runner + maintainer inline copy.
 - **#619 LAB FIX (run 39061463679 live since 19:12:40Z):** anchored match + mandatory head-binding + audit guard + UNKNOWN re-query; must also cover the head-stale genuine-approval case.
 - SHALLOW-CLONE CAVEAT (issue #602): this workspace is shallow, so `git merge-base --is-ancestor` can false-negative on valid branches; verify linkage with `gh api repos/.../compare/main...<branch>` and `gh pr view --json mergeable,mergeStateStatus` before merging.
 - PAGES WATCH (standing): re-dispatch after every new main tip (bot merges emit no push event).
 - EXPECTED WRAPPER-PUSH NOISE (standing): App-token push rejection on workflow-touching branches is expected; the PAT step lands the branch - verify via run log/`git ls-remote`, admit on-thread, no post-mortem.
 - MERGE-ORDERING WATCH (standing): until #619's fix lands, a sweep merge can precede the fresh read-only infra test when only a head-stale approval is on record (#618, #609 precedents). If it happens: run the retro test, log the head, ping #619 with evidence, state honestly.
 - TEST-CRASH RULE (standing): retry once; second consecutive silent death on same PR -> `lab`; never a third test. Maintainer-arm provider deaths: recovered by the re-posted handoff; class -> #620 (lab live).
 - BOT-ACTOR CLASS (standing): documented red + on-thread explanation; no dispatch (vehicle #427 / PR #429 closed unmerged).
 - Infra routing guard: anything touching `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` routes to `lab`, never `fix`/`continue`.
 - Orphan-main protection holds: verify the PR branch shares history with `main` before every merge.
 - IP hold (standing): God of War commission declined; original mythic-duel alternative awaiting owner.
 - Standing-board close guard: #70 and #42 never carry `Closes`.
 - Shipping limit: max 2 new-project merges/day (not binding; no new-project PRs in flight).

## NEXT-RUN PLAYBOOK
   1. #614: watch the rebase push -> review round on the new head -> read-only infra test -> PAT merge (`Closes #612`); if the review posts findings, they fold per protocol; on merge dispatch the NATIVE PAIR (#582, both arms) in-run.
   2. #619: watch the lab fix -> review -> read-only infra test -> PAT merge (`Closes #619`); must carry the anchored match + mandatory head-binding + head-stale coverage.
   3. #621: watch the lab fix -> review -> read-only infra test -> PAT merge (`Closes #621`); must carry the paginated form + a red-on-mutant audit guard.
   4. #620: watch the lab fix -> review -> read-only infra test -> PAT merge (`Closes #620`); must stay bounded (no loops) and fail loudly when persistent.
   5. NATIVE PAIR (first-action rule): the instance that merges #614 dispatches `{"action":"test-macos","issue":582}` + `{"action":"test-windows","issue":582}` on #582 in-run; fully green -> parity-row fold + #552 decision; defects -> `fix` with the report evidence; if a lane exhausts retries unmerged, dispatch the pair anyway and track that lane separately.
   6. Pages: confirm success after any new main tip; else `gh workflow run pages.yml`.
   7. Held runs: sweep is automatic; if any `action_required` survives, investigate and ping the owner if manual approval is needed.
   8. #552 owner confirmation outstanding (7-day human rule ~Oct 23).
   9. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
  - Who/what executed the 19:23:15Z PAT-identity merge (no sweep run visible in the Actions API)? Recheck against the next sweep-containing run log; otherwise treat as the accepted #619 class.
  - Does #614's rebase land cleanly and does the native pair finally unlock, or does the shared audit-script territory conflict again?
  - Do the #619/#620/#621 fix runs land cleanly despite all editing audit-rule territory (rule numbering rebases)?
  - Does the merged #616 gate actually fire on the next review-gate death (its acceptance check)?
  - With #614 merged, do the fresh native arms go fully green on the same tip so the parity rows flip and the #552 retirement decision unlocks?

 - Hephaestus, the Maintainer
