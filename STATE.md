# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39061416489 (self-triage of #621: unpaginated retry/auto-heal cap issue routed to lab; #620 re-routed after its triage run was superseded; #619 fix live; #617 eval live; #609 rebase live; #614 lab live; zero failures, zero held runs; main `17e324579`)**

## PRs & Issues
 - **#621** (unpaginated retry/auto-heal cap enumerations; this run's target): lab dispatch SENT this run (paginated slurp form at every site from the issue body + audit guard red on the mutant; coordinate `silent-stall-audit.sh` rule numbering with the in-flight #619 fix, rebase if needed). Filed by a sibling tick from the #618 gates' follow-ups.
 - **#620** (transient FreeTierError retry policy): its create_issue self-dispatch triage run 39061052908 was CANCELLED at 19:12:04Z (maintainer single-slot superseding) and never routed it; lab dispatch SENT this run (bounded retry once per arm on the anchored terminal error line; persistent rejection fails loudly; no loops).
 - **#619** (merge-sweep false positive; highest-priority infra defect): previous tick's lab decision executed - owner `/oc lab` posted 19:12:38Z; Lab Engineer run 39061463679 LIVE since 19:12:40Z. Must land anchored approval match + MANDATORY head-binding + audit guard + UNKNOWN re-query.
 - **#617** (product fix for #615, head `23716030`, CLEAN): tester approved 19:00:28Z; eval run 39061051752 LIVE since 19:07:03Z. Next: approve-eval -> orphan guard -> merge `--rebase` (`Closes #615`). Findings -> route per findings.
 - **#609** (lab vehicle for #608, head `88cd5bc9`, CONFLICTING 15 ahead / 6 behind): lean rebase run 39060902457 LIVE since 19:05:01Z; duplicate run 39061052492 PENDING since 19:07:03Z (expected to no-op). Then round-4 review -> read-only infra test -> PAT merge (`Closes #608`). STALE-APPROVAL WATCH: the sweep's approval match is a genuine-but-head-stale tester verdict (18:50:48Z on `88cd5bc9`); until #619's fix lands, a post-rebase sweep merge can precede round 4 - retro gates and log if it lands (#618 precedent).
 - **#614** (lab vehicle for #612, head `e561a42a`, CONFLICTING): lab run 39059539758 LIVE since 18:46:00Z (ceiling ~19:46Z). No approval phrase anywhere on the PR (re-verified this tick, paginated), so the sweep cannot merge it early. Then review -> read-only infra test -> PAT merge (`Closes #612`).
 - **#618**: merged 18:55:19Z (false-positive sweep; retro review approve 19:00:08Z; read-only bookkeeping test run 39060544940 completed SUCCESS 19:08:25Z). `Closes #616` closed. Closed out, nothing actionable.
 - **#615 OPEN** (via #617). **#612 OPEN** (via #614). **#608 OPEN** (via #609). **#582 parent OPEN.** **#552 owner window ~Oct 23.** **#70/#42 standing boards.**
 - **Merged earlier today:** #610 -> `5b65c701`; #613 -> `c1a27582`; #606, #607, #618 -> `17e324579`. Main tip `17e324579` (ls-remote verified).
 - **#582 NATIVE ARMS (LAST GATE):** sequencing behind #609 AND #614 merging unchanged; fallback bound unchanged. Only fully green reports flip `maze-chase/docs/parity.md` rows and unlock the #552 retirement decision; `Closes #582` reserved for the verified-complete PR.
 - **Boards/health:** allowlist self-audit exact both directions (19 `workflows:` entries at maintainer.yml:38 vs the 19 live non-maintainer workflow names; maintainer self-excluded by design; Dependabot Updates / Dependency Graph / pages-build-deployment GitHub-native). Held runs: 0. Failures in the recent 100-run window: ZERO (the day's two transient provider deaths sit outside the window and both recovered). Pages: 39060640945 success 19:01:55Z on `17e324579`; no new tip. Untriaged issues: none after this run (triages #621 + #620).
 - **AUTH/MODEL STATE (standing watch):** keyless auth holds; pin `opencode/deepseek-v4.1-flash-free` (model + small_model + ladder), every arm `variant: max`. Free-tier transient class filed as #620 and routed to lab this run.

## IN FLIGHT
 - **#621 LAB FIX (dispatched this run):** paginated slurp enumeration at every listed site + audit guard; rule-numbering coordination with #619.
 - **#620 LAB FIX (dispatched this run):** bounded transient-free-tier retry in the shared composite runner + maintainer inline copy.
 - **#619 LAB FIX (run 39061463679 live since 19:12:40Z):** anchored match + mandatory head-binding + audit guard + UNKNOWN re-query.
 - **#617 EVAL (run 39061051752 live since 19:07:03Z):** approve-eval -> orphan guard -> merge `--rebase` (`Closes #615`).
 - **#609 REBASE (runs 39060902457 live / 39061052492 pending):** then round-4 review -> read-only infra test -> PAT merge (`Closes #608`).
 - **#614 LAB (run 39059539758 live since 18:46:00Z, ceiling ~19:46Z):** then review -> read-only infra test -> PAT merge (`Closes #612`).
 - SHALLOW-CLONE CAVEAT (issue #602): this workspace is shallow, so `git merge-base --is-ancestor` can false-negative on valid branches; verify linkage with `gh api repos/.../compare/main...<branch>` and `gh pr view --json mergeable,mergeStateStatus` before merging.
 - PAGES WATCH (standing): re-dispatch after every new main tip (bot merges emit no push event).
 - EXPECTED WRAPPER-PUSH NOISE (standing): App-token push rejection on workflow-touching branches is expected; the PAT step lands the branch - verify via run log/`git ls-remote`, admit on-thread, no post-mortem.
 - TEST-CRASH RULE (standing): retry once; second consecutive silent death on same PR -> `lab`; never a third test. Maintainer-arm provider deaths: recovered by the re-posted handoff; class -> #620 (dispatched this run).
 - BOT-ACTOR CLASS (standing): documented red + on-thread explanation; no dispatch (vehicle #427 / PR #429 closed unmerged).
 - Infra routing guard: anything touching `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` routes to `lab`, never `fix`/`continue`.
 - Orphan-main protection holds: verify the PR branch shares history with `main` before every merge.
 - IP hold (standing): God of War commission declined; original mythic-duel alternative awaiting owner.
 - Standing-board close guard: #70 and #42 never carry `Closes`.
 - Shipping limit: max 2 new-project merges/day (not binding; no new-project PRs in flight).

## NEXT-RUN PLAYBOOK
   1. #619: watch the lab fix -> review -> read-only infra test -> PAT merge (`Closes #619`); it must carry the mandatory head-binding hardening.
   2. #621: watch the lab fix -> review -> read-only infra test -> PAT merge (`Closes #621`); must carry the paginated form + a red-on-mutant audit guard.
   3. #620: watch the lab fix -> review -> read-only infra test -> PAT merge (`Closes #620`); must stay bounded (no loops) and fail loudly when persistent.
   4. #617: eval verdict -> approve-eval -> orphan guard -> merge `--rebase` (`Closes #615`); findings -> route per findings.
   5. #609: watch the rebase push (two-run race) -> round-4 review -> read-only infra test -> PAT merge (`Closes #608`); if the sweep lands it stale first, verify retro gates and log.
   6. #614: lab push -> review -> read-only infra test -> PAT merge (`Closes #612`); conflict with main -> lean lab rebase.
   7. NATIVE PAIR (first-action rule): the instance that merges the second of #609/#614 dispatches `{"action":"test-macos","issue":582}` + `{"action":"test-windows","issue":582}` on #582 in-run; fully green -> parity-row fold + #552 decision; defects -> `fix` with the report evidence; if a lane exhausts retries unmerged, dispatch the pair anyway and track that lane separately.
   8. Pages: confirm success after any new main tip; else `gh workflow run pages.yml`.
   9. Held runs: sweep is automatic; if any `action_required` survives, investigate and ping the owner if manual approval is needed.
  10. #552 owner confirmation outstanding (7-day human rule ~Oct 23).
  11. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
  - Does the #619 fix land before the #609 rebase lets a stale sweep merge slip through (retro gates if so)?
  - Do the #620/#621 lab lanes land cleanly despite sharing audit-rule territory with #619?
  - Does #614's lab round close R18's opt-out validation gap inside its ceiling?
  - Does #617 clear eval and merge (`Closes #615`), or does the provider hit again?
  - Does the merged #616 gate actually fire on the next review-gate death (its acceptance check)?
  - With both prerequisites merged, do the fresh native arms go fully green on the same tip so the parity rows flip and the #552 retirement decision unlocks?

 - Hephaestus, the Maintainer
