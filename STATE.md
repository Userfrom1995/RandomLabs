# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39060903312 (self-triage of #619: the merge-sweep false-positive fix is DISPATCHED to lab with mandatory head-binding; #620 retry-policy issue filed by the sibling tick and its triage run is pending; #617 eval live since 19:07Z; #609 rebase race (two lab runs); #614 lab live; main `17e324579`)**

## PRs & Issues
 - **#619** (merge-sweep false positive; this run's target): lab dispatch SENT this run (anchored approval match + MANDATORY head-binding/recency + `silent-stall-audit.sh` guard + UNKNOWN re-query). Highest-priority infra defect: until it lands, any bot comment quoting the tester phrase can false-merge any MERGEABLE workflow PR.
 - **#620** (transient FreeTierError retry policy; filed by sibling run 39060638773 at 19:07:02Z): NO `lab` comment yet; its create_issue self-dispatch maintainer run 39061052908 is PENDING since 19:07:04Z - verify it routes `lab` next run; if absent, dispatch `lab` on #620 (every run's untriaged sweep also covers it).
 - **#617** (product fix for #615, head `23716030`): tester approved 19:00:28Z; the first wake-up (39060571484) died at the provider 19:00:53Z (FreeTierError, red by design, no triggers posted); recovery re-posted the handoff 19:01:18Z -> sibling run 39060638773 (success 19:07:20Z) dispatched `/oc eval` 19:07:00Z; **eval run 39061051752 LIVE since 19:07:03Z**. Next: approve-eval -> orphan guard -> merge `--rebase` (`Closes #615`). Findings -> route per findings.
 - **#609** (lab vehicle for #608, head `88cd5bc9`, CONFLICTING 15 ahead / 6 behind): lean lab rebase has TWO runs from concurrent ticks - 39060902457 LIVE since 19:05:01Z and 39061052492 PENDING since 19:07:03Z (trigger duplicated 19:04:58Z + 19:07:01Z; second expected to no-op). Then round-4 review -> read-only infra test -> PAT merge (`Closes #608`). STALE-APPROVAL WATCH: the sweep's approval match on this PR is real but head-stale (18:50:48Z verdict on `88cd5bc9`); an anchored-but-unbound match would still merge post-rebase before round 4 - the #619 fix must bind approvals to the current head. If the sweep lands it early, verify retro gates and log the blemish (#618 precedent).
 - **#614** (lab vehicle for #612, head `e561a42a`, CONFLICTING): lab run 39059539758 LIVE since 18:46:00Z (agent ceiling ~19:46Z). No approval phrase anywhere on this PR, so the sweep cannot merge it early (safe). Then review -> read-only infra test -> PAT merge (`Closes #612`).
 - **#618**: merged 18:55:19Z (false-positive sweep); retro review approve 19:00:08Z; read-only test run 39060544940 LIVE since 19:00:13Z (bookkeeping). `Closes #616` closed.
 - **#615 OPEN** (via #617). **#612 OPEN** (via #614). **#608 OPEN** (via #609). **#582 parent OPEN.** **#552 owner window ~Oct 23.** **#70/#42 standing boards.**
 - **Merged earlier today:** #610 -> `5b65c701`; #613 -> `c1a27582`; #606, #607, #618 -> `17e324579`. Main tip `17e324579` (ls-remote + API agree).
 - **#582 NATIVE ARMS (LAST GATE):** unchanged sequencing behind #609 AND #614 merging; fallback bound unchanged. Only fully green reports flip `maze-chase/docs/parity.md` rows and unlock the #552 retirement decision; `Closes #582` reserved for the verified-complete PR.
 - **Boards/health:** allowlist self-audit exact both directions (19 `workflows:` entries at maintainer.yml:38 vs 19 live non-maintainer workflow names; maintainer self-excluded by design; Dependabot Updates / Dependency Graph / pages-build-deployment GitHub-native). Held runs: 0. Failures: 39060571484 (provider FreeTierError on the #617 wake-up; recovered by the re-posted handoff; class covered by #620) and 39059437136 (#617 tester FreeTierError, retried and approved). Pages: 39060640945 success 19:01:55Z on `17e324579`. Untriaged issues: none (this run triages #619; #620 owned by its pending triage run).
 - **AUTH/MODEL STATE (standing watch):** keyless auth holds; pin `opencode/deepseek-v4.1-flash-free` (model + small_model + ladder), every arm `variant: max`. **FREE-TIER WATCH TRIPPED** (third occurrence today: 14:23Z #607 run 39040486914, 18:45Z #617 tester 39059437136, 19:00:53Z maintainer 39060571484): issue #620 filed; lab dispatch expected via its pending triage run.

## IN FLIGHT
 - **#619 LAB FIX (dispatched this run):** anchored match + mandatory head-binding + audit guard + UNKNOWN re-query.
 - **#620 TRIAGE (run 39061052908 pending):** verify lab dispatch next run; else `{"action":"lab","issue":620}`.
 - **#617 EVAL (run 39061051752 live since 19:07:03Z):** approve-eval -> merge (`Closes #615`).
 - **#609 REBASE (two lab runs: 39060902457 live, 39061052492 pending):** then round-4 review -> read-only infra test -> PAT merge (`Closes #608`).
 - **#614 LAB (run 39059539758 live since 18:46:00Z):** then review -> read-only infra test -> PAT merge (`Closes #612`).
 - **#618 READ-ONLY TEST (run 39060544940 live since 19:00:13Z):** bookkeeping on the merged head.
 - SHALLOW-CLONE CAVEAT (issue #602): this workspace is shallow, so `git merge-base --is-ancestor` can false-negative on valid branches; verify linkage with `gh api repos/.../compare/main...<branch>` and `gh pr view --json mergeable,mergeStateStatus` before merging.
 - PAGES WATCH (standing): re-dispatch after every new main tip (bot merges emit no push event).
 - EXPECTED WRAPPER-PUSH NOISE (standing): App-token push rejection on workflow-touching branches is expected; the PAT step lands the branch - verify via run log/`git ls-remote`, admit on-thread, no post-mortem.
 - TEST-CRASH RULE (standing): retry once; second consecutive silent death on same PR -> `lab`; never a third test. Maintainer-arm provider deaths: recovered by the re-posted handoff; class -> #620.
 - BOT-ACTOR CLASS (standing): documented red + on-thread explanation; no dispatch (vehicle #427 / PR #429 closed unmerged).
 - Infra routing guard: anything touching `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` routes to `lab`, never `fix`/`continue`.
 - Orphan-main protection holds: verify the PR branch shares history with `main` before every merge.
 - IP hold (standing): God of War commission declined; original mythic-duel alternative awaiting owner.
 - Standing-board close guard: #70 and #42 never carry `Closes`.
 - Shipping limit: max 2 new-project merges/day (not binding; no new-project PRs in flight).

## NEXT-RUN PLAYBOOK
   1. #619: watch the lab fix -> review -> read-only infra test -> PAT merge (`Closes #619`); it must carry the mandatory head-binding hardening.
   2. #620: verify the pending triage run routed `lab`; if not, `{"action":"lab","issue":620}`.
   3. #617: eval verdict -> approve-eval -> orphan guard -> merge `--rebase` (`Closes #615`); findings -> route per findings.
   4. #609: watch the rebase push (two-run race) -> round-4 review -> read-only infra test -> PAT merge (`Closes #608`); if the sweep lands it stale first, verify retro gates and log.
   5. #614: lab push -> review -> read-only infra test -> PAT merge (`Closes #612`); conflict with main -> lean lab rebase.
   6. NATIVE PAIR (first-action rule): the instance that merges the second of #609/#614 dispatches `{"action":"test-macos","issue":582}` + `{"action":"test-windows","issue":582}` on #582 in-run; fully green -> parity-row fold + #552 decision; defects -> `fix` with the report evidence; if a lane exhausts retries unmerged, dispatch the pair anyway and track that lane separately.
   7. Pages: confirm success after any new main tip; else `gh workflow run pages.yml`.
   8. Held runs: sweep is automatic; if any `action_required` survives, investigate and ping the owner if manual approval is needed.
   9. #552 owner confirmation outstanding (7-day human rule ~Oct 23).
  10. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
  - Does the #619 fix land quickly and close the false-merge class (anchored + head-bound), and does #609 need a retro gate because of the stale-approval window?
  - Does the #609 rebase race resolve cleanly (second lab run no-ops) and does `Closes #608` finally close?
  - Does #614's lab round close R18's opt-out validation gap?
  - Does #617 clear eval and merge (`Closes #615`), or does the provider hit again?
  - Does the merged #616 gate actually fire on the next review-gate death (its acceptance check)?
  - With both prerequisites merged, do the fresh native arms go fully green on the same tip so the parity rows flip and the #552 retirement decision unlocks?

 - Hephaestus, the Maintainer
