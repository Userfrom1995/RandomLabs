# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39062550148 (quiet tick: all four open lanes carry live runs; #614's review round 2 routed its CONFLICT to lab (two lab runs in flight, duplicate-trigger artifact), #622/#623/#624 review round 1s live; NEW: R20 numbering collision between #623 and #624 for merge-order watch; zero failures beyond the documented bot-actor class; held 0; allowlist exact; pages fresh; main `8ccab113`)**

## PRs & Issues
 - **#609 MERGED at 19:23:15Z** (rebase; merge commit `8ccab113`; branch kept at `f0d89257`). `Closes #608` auto-closed #608 at 19:23:17Z. Round-4 review approved `f0d89257`; the read-only infra test ran retroactively on the exact merged head and posted `/oc approve-test` PASS at 19:27:29Z. The only ordering caveat (fresh test did not run pre-merge; head-stale pre-rebase PASS on `88cd5bc9` was the sweep's unanchored match) is the second firing of the #619 class and is on record on #619. Closed out; nothing actionable.
 - **#614** (lab vehicle for #612; head `03f7bd3c`, CONFLICTING/DIRTY): review round 2 completed 19:35:31Z - blocking = the conflict against current main (6 files: `tester.md`, `silent-stall-audit.sh`, `auditor.yml`, `opencode.yml`, `AGENTS.md`, `LAB.md`; #616's R19 + #615 landed mid-session); round-2 R18 hardening verified green; non-blocking: R18 misses `$'...'`/`$"..."`/`${x:-...}` slash-body spellings, native Windows byte-exact handoff evidence owed via the per-OS arm. The review's routing posted `/oc lab` at 19:35:44Z. **Two Lab Engineer runs in flight: lean rebase 39062870778 (19:31:59Z) + findings pass 39063143599 (19:35:47Z)** - duplicate-trigger artifact; both carry rebase + keep R18+R19 + labels R1-R19 + fold on-thread findings. Then review round 3 -> read-only infra test -> PAT merge (`Closes #612`); on merge dispatch the NATIVE PAIR in-run.
 - **#622** (fix for #620; head `69ebdc62`, CONFLICTING/DIRTY after the #609 merge): kept R1-R19, guards the bounded free-tier retry inside R15. Review round 1 live (run 39062773214 since 19:30:40Z on the exact current head). Findings -> lab folds + rebases; if approved -> `/oc test` (read-only) then a lean rebase is still needed before the sweep can merge. Then PAT merge (`Closes #620`).
 - **#623** (fix for #619; head `15b4620c`, MERGEABLE/UNSTABLE): adds **R20 "PAT merge approval-binding guard"** (anchored approval match + mandatory head-binding + UNKNOWN re-query + head-stale coverage). Review round 1 live (run 39062822427 since 19:31:20Z). Then review -> read-only infra test -> PAT merge (`Fixes #619`).
 - **#624** (fix for #621; head `87967fb2`, MERGEABLE/UNSTABLE): adds **R20 "paginated comment-read guard"** (paginated slurp enumeration at every cap/gate-count site). Review round 1 live (run 39062822518 since 19:31:20Z). Then review -> read-only infra test -> PAT merge (`Closes #621`).
 - **RULE-NUMBERING COLLISION (watch):** #623 and #624 each number their new rule `R20` with different semantics. Individually MERGEABLE; whichever merges second conflicts on the shared label/position lines and needs a renumber to R21 + leaning rebase. Handle at merge-order time; no preemptive dispatch (both reviews live; findings passes touch the same territory).
 - **Bot-actor reds (documented class):** maintainer `pull_request` runs 39062821442 (#623 branch) + 39062821690 (#624 branch), failed 19:32:33Z at the decision-contract verify step (CLI refuses the bot actor on bot-authored PRs); each posted its "does not have write permissions" note on-thread; the `/oc maintainer` wakes on those PRs have maintainer runs 39062900098 / 39062904001 in flight. No dispatch by standing rule.
 - **#617 MERGED 19:20:30Z** (`0fe01fd3`; Quality Council APPROVED 9.88/10, head-bound; `Closes #615` closed #615). **#618 merged 18:55:19Z** (`Closes #616`, retro review approve 19:00:08Z, read-only test SUCCESS 19:08:25Z). Both closed out.
 - **#612 OPEN** (via #614). **#608 CLOSED** (via #609). **#615 CLOSED** (via #617). **#582 OPEN** (native pair sequenced behind #614). **#552 owner window ~Oct 23.** **#70/#42 standing boards.**
 - **Merged earlier today:** #610 -> `5b65c701`; #613 -> `c1a27582`; #606, #607, #618 -> `17e324579`; #617 -> `0fe01fd3`; #609 -> `8ccab113`. Main tip `8ccab113` (ls-remote + API agree).
 - **#582 NATIVE ARMS (LAST GATE):** sequenced ONLY behind #614 merging. The first action of the instance that merges #614 is dispatching the pair (macOS + Windows). Fully green reports flip `maze-chase/docs/parity.md` rows and unlock the #552 retirement decision; `Closes #582` reserved for the verified-complete PR.
 - **Boards/health:** allowlist EXACT both directions (19 `workflows:` entries at maintainer.yml:38 vs 19 live non-maintainer non-native workflow names; programmatic compare this run); held runs 0; failures since 19:19Z: only the two documented bot-actor reds; Pages success 19:32:26Z on `8ccab113` (run 39062903319); no untriaged issues; no `/oc approve-test` on any open PR (no merges due).
 - **AUTH/MODEL STATE (standing watch):** keyless auth holds; pin `opencode/deepseek-v4.1-flash-free` (model + small_model + ladder), every arm `variant: max`. Free-tier transient class = #620 (fix #622 in review).

## IN FLIGHT
 - **#614 LAB x2 (39062870778 lean rebase + 39063143599 findings):** converge to one rebased head (keep R18+R19, labels R1-R19, audit 18/18); then review round 3 -> read-only infra test -> PAT merge (`Closes #612`); on merge dispatch the NATIVE PAIR in-run.
 - **#622 REVIEW (39062773214):** verdict -> findings: lab folds + rebases; approval: lean rebase then re-review/test -> PAT merge (`Closes #620`).
 - **#623 REVIEW (39062822427) / #624 REVIEW (39062822518):** then read-only infra tests then PAT merges; watch the R20 collision (second to merge needs R21 renumber + rebase).
 - **Maintainer concurrency (by design):** runs 39062900098 / 39062904001 (#623/#624 wakes) and 39063146943 (#614 tick) beside this run; each re-surveys fresh; last-commit-wins on the shared log/state files.
 - SHALLOW-CLONE CAVEAT (issue #602): this workspace is shallow, so `git merge-base --is-ancestor` can false-negative on valid branches; verify linkage with `gh api repos/.../compare/main...<branch>` and `gh pr view --json mergeable,mergeStateStatus` before merging.
 - PAGES WATCH (standing): re-dispatch after every new main tip (bot merges emit no push event).
 - EXPECTED WRAPPER-PUSH NOISE (standing): App-token push rejection on workflow-touching branches is expected; the PAT step lands the branch - verify via run log/`git ls-remote`, admit on-thread, no post-mortem.
 - MERGE-ORDERING WATCH (standing): until #623's R20 approval-binding guard lands, a sweep merge can precede the fresh read-only infra test when only a head-stale approval is on record (#618, #609 precedents). If it happens: run the retro test, log the head, ping #619 with evidence, state honestly.
 - TEST-CRASH RULE (standing): retry once; second consecutive silent death on same PR -> `lab`; never a third test. Maintainer-arm provider deaths: recovered by the re-posted handoff; class -> #620 (fix #622 in review).
 - BOT-ACTOR CLASS (standing): documented red + on-thread explanation; no dispatch (vehicle #427 / PR #429 closed unmerged).
 - Infra routing guard: anything touching `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` routes to `lab`, never `fix`/`continue`.
 - Orphan-main protection holds: verify the PR branch shares history with `main` before every merge.
 - IP hold (standing): God of War commission declined; original mythic-duel alternative awaiting owner.
 - Standing-board close guard: #70 and #42 never carry `Closes`.
 - Shipping limit: max 2 new-project merges/day (not binding; no new-project PRs in flight).

## NEXT-RUN PLAYBOOK
   1. #614: watch both lab runs -> one clean rebased head (R18+R19 kept, labels R1-R19, audit 18/18) -> review round 3 -> read-only infra test -> PAT merge (`Closes #612`); fold review findings if they land; on merge dispatch the NATIVE PAIR in-run.
   2. #622: watch the review -> findings: lab folds + rebases; approval: dispatch the lean rebase then re-review/test -> PAT merge (`Closes #620`).
   3. #623/#624: watch the reviews -> fixes -> read-only infra tests -> PAT merges; the second to merge needs the R20 -> R21 renumber rebase first.
   4. NATIVE PAIR (first-action rule): the instance that merges #614 dispatches `{"action":"test-macos","issue":582}` + `{"action":"test-windows","issue":582}` on #582 in-run; fully green -> parity-row fold + #552 decision; defects -> `fix` with the report evidence; if a lane exhausts retries unmerged, dispatch the pair anyway and track that lane separately.
   5. Pages: confirm success after any new main tip; else `gh workflow run pages.yml`.
   6. Held runs: sweep is automatic; if any `action_required` survives, investigate and ping the owner if manual approval is needed.
   7. #552 owner confirmation outstanding (7-day human rule ~Oct 23).
   8. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
  - Which of #623/#624 merges first, and does the R20 -> R21 renumber rebase land cleanly?
  - Do the two parallel #614 lab runs converge to one clean head or produce push noise (duplicate-trigger artifact)?
  - Does #622's review catch the CONFLICTING state as blocking the way #614's did (routing the rebase through lab)?
  - Does the merged #616 publication gate fire on its first real acceptance case (the next review-gate death)?
  - With #614 merged, do the fresh native arms go fully green on the same tip so the parity rows flip and the #552 retirement decision unlocks?

 - Hephaestus, the Maintainer
