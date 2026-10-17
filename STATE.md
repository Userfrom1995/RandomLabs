# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39062904001 (wake-up tick on #624: the three lab vehicles #622/#623/#624 landed with live reviews; #614 lean rebase live; #622 dirty and deliberately sequenced behind #623; zero failures beyond the two documented bot-actor reds; main `8ccab113`)**

## PRs & Issues
 - **#624** (#621 pagination fix; head `87967fb2`; MERGEABLE/UNSTABLE; body `Closes #621`): review 39062822427 live since 19:31:20Z. Path: review -> read-only infra Tester -> PAT merge. Target of run 39062904001; its red maintainer check (39062821690, bot-actor class) explained on-thread.
 - **#623** (#619 PAT merge anchor + mandatory head-binding + head-stale coverage; head `15b4620c`; MERGEABLE/UNSTABLE; body `Closes #619`): review 39062822518 live since 19:31:20Z. Highest-priority lane: its landing kills the stale-approval merge class AND unlocks #622's rebase. Sibling maintainer run 39062900098 owns the #623 thread.
 - **#622** (#620 transient free-tier retry; head `69ebdc62`; CONFLICTING/DIRTY verified live; body `Closes #620`; base `17e32457`, 22 behind main): review 39062773214 live since 19:30:40Z. REBASE SEQUENCED after #623 lands (hard rule below); sequencing ping posted on-thread.
 - **#614** (#612 msys handoff; head `03f7bd3c`; CONFLICTING): lean rebase Lab Engineer 39062870778 live since 19:31:59Z; then review -> read-only infra Tester -> PAT merge (`Closes #612`); on merge dispatch the NATIVE PAIR in-run.
 - **#609 MERGED** 19:23:15Z (`8ccab113`, PAT identity; #608 closed). Round-4 approved on head; retro read-only test PASS 19:27:29Z on the merged head; independent audit 18/18. Second firing of the #619 class (head-stale approval matched by the unanchored sweep); evidence pinged to #619.
 - **#617 MERGED** 19:20:30Z (`0fe01fd3`; #615 closed 19:21:20Z). **#618** merged 18:55:19Z (false-positive sweep; retro review approve + bookkeeping test done). **#603 merged 12:58:04Z** (`9ef0b89a`; queue:max live on main, verified `opencode.yml:25`). Closed out.
 - **#582 NATIVE ARMS (LAST GATE):** sequenced behind #614 merging (all earlier prerequisites in). The instance that merges #614 dispatches `test-macos` + `test-windows` in-run (parallel is safe; queue:max live). Fully green reports flip `maze-chase/docs/parity.md` rows and unlock the #552 retirement; `Closes #582` reserved for the verified-complete PR.
 - **#552 owner window ~Oct 23. #70/#42 standing boards.** No untriaged issues. #619/#620/#621 stay open until their PRs merge.
 - **RULE NUMBERING (live collision):** main carries R1-R19 (R17 from #608, R19 from #616). #614 claims R18 (unmerged); #623 and #624 BOTH append R20 (different semantics); #622 adds no new rule. The second of #623/#624 to land gets one lean renumber rebase; both PR bodies pre-flag this.
 - **Boards/health:** allowlist EXACT 19/19 both directions (programmatic compare of maintainer.yml:38 vs live non-maintainer workflow `name:` fields; maintainer self-excluded by design); held runs 0; failures since 19:15Z = exactly the two bot-actor `pull_request` maintainer arms on #623 (39062821442) and #624 (39062821690), documented class; Pages 39062903319 success 19:33:02Z on `8ccab113`; main tip `8ccab113` (ls-remote + API agree).
 - **AUTH/MODEL STATE (standing watch):** keyless auth holds; pin `opencode/deepseek-v4.1-flash-free` (model + small_model + ladder), every arm `variant: max`. Transient free-tier retry class = #620 (PR #622 pending).

## IN FLIGHT
 - **#614 LEAN REBASE (39062870778 live since 19:31:59Z):** then review -> read-only infra test -> PAT merge (`Closes #612`); on merge dispatch the NATIVE PAIR in-run.
 - **#624 REVIEW (39062822427 live):** then read-only infra test -> PAT merge (`Closes #621`).
 - **#623 REVIEW (39062822518 live):** then read-only infra test -> PAT merge (`Closes #619`).
 - **#622 REVIEW (39062773214 live on a dirty head):** its rebase stays held until #623 lands.
 - **#622 REBASE SEQUENCING (hard rule):** do NOT dispatch #622's rebase before #623's head-binding fix is live. Rationale: the current PAT sweep matches approve-test unanchored with no head check (`maintainer.yml:873`, fix-check at `:878`), so a rebase push moves the head while a possibly-stale approve-test sits on record and the sweep on any maintainer run could merge the rebased head on the stale verdict (the #619 class; #609's 19:23:15Z merge is the precedent). If #622 clears review+test while dirty, that approval becomes a stale-approval bomb: the rebase must then wait for #623, or carry an explicit fresh-test contract. Do not fork the rebase early; two rebases would be needed otherwise.
 - **MERGE-ORDER EXPECTATION (expected churn, not defects):** whichever of #623/#624 clears its gate second pays one lean renumber rebase (R20 collision); #622 pays one rebase after #623 (fold findings + unify the audit range strings to the live R1-R2x). No Maintainer action can prevent the sibling rebases while the sweep merges gate-clear PRs automatically; absorb them as lean lab passes.
 - SHALLOW-CLONE CAVEAT (issue #602): workspace may be shallow; plain fetches do not deepen it. Verify linkage with `gh api repos/.../compare/main...<branch>` and `gh pr view --json mergeable` before merging.
 - PAGES WATCH (standing): re-dispatch after every new main tip (bot merges emit no push event).
 - EXPECTED WRAPPER-PUSH NOISE (standing): App-token push rejection on workflow-touching branches is expected; the PAT step lands the branch. Admit on-thread, no post-mortem.
 - TEST-CRASH RULE (standing): retry once; second consecutive silent death on same PR -> `lab`; never a third test. Maintainer-arm provider deaths recovered by the re-posted handoff; class -> #620's fix.
 - BOT-ACTOR CLASS (standing): documented red + on-thread explanation; no dispatch (vehicle #427 / PR #429 closed unmerged).
 - Infra routing guard: anything touching `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` routes to `lab`, never `fix`/`continue`.
 - Orphan-main protection holds: verify the PR branch shares history with `main` before every merge.
 - IP hold (standing): God of War commission declined; original mythic-duel alternative awaiting owner.
 - Standing-board close guard: #70 and #42 never carry `Closes`.
 - Shipping limit: max 2 new-project merges/day (not binding; no new-project PRs in flight).

## NEXT-RUN PLAYBOOK
   1. #623: watch review -> read-only infra test -> PAT merge (`Closes #619`); must carry the anchored match + mandatory head-binding + head-stale coverage. Its landing is the sequencing gate for #622 and the end of the stale-approval class.
   2. #624: watch review -> read-only infra test -> PAT merge (`Closes #621`); if it clears after #623, expect one lean renumber rebase first (R20 collision).
   3. #622: once #623 is merged, dispatch the lean rebase (rebase onto current main, fold on-thread findings, unify the audit range strings, push promptly via PAT), then review -> read-only infra test -> PAT merge (`Closes #620`).
   4. #614: watch the lean rebase push -> review -> read-only infra test -> PAT merge (`Closes #612`); on merge dispatch the NATIVE PAIR in-run.
   5. NATIVE PAIR after #614 merges: `test-macos` + `test-windows` on #582 (parallel safe, queue:max live); fully green -> parity-row fold + #552 decision; defects -> `fix` with the report evidence; if a lane exhausts retries unmerged, dispatch the pair anyway and track that lane separately.
   6. Pages: confirm success after any new main tip; else `gh workflow run pages.yml`.
   7. Held runs: sweep is automatic; if any `action_required` survives, investigate and ping the owner if manual approval is needed.
   8. #552 owner confirmation outstanding (7-day human rule ~Oct 23).
   9. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
  - Who/what executed the 19:23:15Z PAT-identity merge (no sweep run visible in the Actions API)? Treat as the accepted #619 class unless new evidence appears.
  - Which of #623/#624 clears its gate first, and does the second's renumber rebase land cleanly?
  - Does #622's review approve a conflicted head (its gates will be stale by design) or return findings that fold into the sequenced rebase?
  - Does #623's head-binding fix land before #622's test could approve (the sequencing deadline for the stale-approval bomb)?
  - With #614 merged, do the fresh native arms go fully green on the same tip so the parity rows flip and the #552 retirement decision unlocks?

 - Hephaestus, the Maintainer
