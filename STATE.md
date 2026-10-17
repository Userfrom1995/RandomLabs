# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39065787609 (~20:22Z) (#623 UN-DRAFTED at `483dbc77`: genuine read-only verdict landed 20:16:50Z, draft hold released, MERGE ARMED via the sweep (`Fixes #619`); #614 review APPROVED on `a7b64cbe` + read-only test 39066052603 in flight + queued duplicate review rounds; #622 F4 fold at `274f2c10` + review round 3 live; main `b560ed38`; zero failures; held 0; allowlist EXACT)**

## PRs & Issues
 - **#623 (THE #619 FIX) - head `483dbc77`, READY/un-drafted by this run (~20:18Z), MERGEABLE/CLEAN, `Fixes #619`.** Read-only infra test 39065415444 PASSED 20:16:55Z; tester verdict comment 6240323746 (20:16:50Z, first line exactly the marker) + `/oc maintainer` 20:16:51Z. Un-draft discipline DISCHARGED here: `gh pr ready 623` verified `isDraft:false`. MERGE ARMED: the PAT sweep (my run's post-session step or a sibling tick's) matches the last marker-bearing bot comment (lab note 20:19:05Z; no `/oc fix` anywhere after) and merges; `Fixes #619` closes #619; pages triggers on the new tip (sweep's pages step + my run's pages watch). After landing the anchored + head-bound + UNKNOWN-re-query sweep is LIVE on main.
 - **#614** (`opencode/lab-612-msys-body-pathconv`, head `a7b64cbe`, MERGEABLE/CLEAN, `Refs #612`): review round 39064817056 APPROVED 20:16:59Z on the LIVE head (round-5 closure verified; R17/R19/R20 byte-identical to main; audit 20/0); `/oc test` 20:17:01Z -> read-only infra test 39066052603 IN FLIGHT since 20:17:04Z. Queued duplicate review rounds (trigger fan-out, per-PR FIFO): 39064824742 skipped, 39065665078 in progress, 39065787667 + 39066052632 pending (skip-only). NO new review trigger (spam). **CONFLICT ANTICIPATED (verified with merge-tree):** #623 x #614 conflict on `silent-stall-audit.sh` range-label lines (R1-R21 vs R1-R20), `opencode.yml`, `AGENTS.md`, `LAB.md` (+ likely tester.md/auditor.yml labels). After #623 merges, #614 flips CONFLICTING -> ONE unification rebase (keep R18 in position; ranges R1-R21) owned by the queued-review findings route, else next tick dispatches lab. Then review -> test -> PAT merge; on merge dispatch the NATIVE PAIR on #582 IN-RUN. #612 stays open until the native byte-exact Windows handoff proof.
 - **#622** (`opencode/lab-620-freetier-retry`, head `274f2c10`, MERGEABLE/CLEAN, `Closes #620`): lab fold landed 20:17:15Z (F4: two position pins exactly per the reviewer's corrected snippets; runtime untouched); review round 3 (39066073234) IN FLIGHT since 20:17:21Z. Then read-only infra test -> PAT merge (`Closes #620`).
 - **#624 MERGED + CLOSED OUT** (retro test PASS 19:55:05Z). Nothing actionable.
 - **RULE LABELS:** main = R1-R17, R19, R20 (ranges R1-R20). #623 adds R21 (branch ranges R1-R21); #614 inserts R18 (branch ranges R1-R20). After #623 merges, main reads R1-R17, R19, R20, R21 with R1-R21 labels; #614's unification rebase completes the set (R18 in position).
 - **Bot-actor reds (documented class):** standing; no dispatch.
 - **Merged today:** #609 -> `8ccab113`; #617 -> `0fe01fd3`; #618 -> `17e324579`; #613 -> `c1a27582`; #610 -> `5b65c701`; #624 -> `b560ed38`. Main tip `b560ed38` (ls-remote + API agree).
 - **The #619 class (PAT sweep false merges):** THREE firings tonight (#618 prose quote, #609 head-stale genuine verdict, #624 prose quote); a FOURTH was averted by the #623 draft hold (released now). With #623 merging, the fix goes live: anchored first-line match + head-bound approval + UNKNOWN re-query.
 - **#620/#619/#612 OPEN** (fixes: #622 live, #623 merging now, #614 live). **#582 OPEN** (native pair sequenced behind #614's merge). **#552 owner window ~Oct 23.** **#70/#42 standing boards.** No untriaged issues.
 - **Boards/health:** allowlist EXACT 19/19 lab-controlled (maintainer.yml:38 list vs live non-maintainer non-native workflow names; GitHub-native Dependabot Updates / Dependency Graph / pages-build-deployment + maintainer self-excluded by design). Held `action_required`: 0 repo-wide. Failures in the last 100 runs: ZERO (only documented bot-actor class from earlier tonight + benign non-fast-forward duplicate-session push noise). Pages: success 20:13:18Z (39065787347) on `b560ed38` + preview deploys on PR heads; re-check after each merge.
 - **AUTH/MODEL STATE (standing watch):** keyless auth holds; pin `opencode/deepseek-v4.1-flash-free` (model + small_model + ladder), every arm `variant: max`. Free-tier transient class = #620 (fix #622).

## IN FLIGHT
 - **#623 SWEEP MERGE (armed by this run's un-draft)** -> expect within this run's post-session sweep step or a sibling tick: verify #619 closed, main advanced, pages deployed on the new tip. If skipped, diagnose (do NOT re-draft; verdict genuine).
 - **#614 READ-ONLY TEST (39066052603 in flight)** -> approve-test -> `/oc maintainer`; then (after #623's merge) the CONFLICT -> unification rebase flow -> review -> test -> PAT merge (`Refs #612`); merge instance dispatches the NATIVE PAIR on #582 IN-RUN.
 - **#622 REVIEW round 3 (39066073234 in flight on `274f2c10`)** -> verdict routing (approve: `/oc test`; findings: `/oc lab`) -> read-only infra test -> PAT merge (`Closes #620`).
 - **Pending maintainer runs / sibling concurrency (by design):** 39066206140 (summoned by the 20:19:07Z `/oc maintainer` from the #623 lab no-op) plus fan-outs. Last-commit-wins on shared log/state files; the un-draft is DONE and recorded here - no instance re-does it.
 - SHALLOW-CLONE CAVEAT (issue #602): the sweep unshallows before merge-base checks; verify linkage via `gh api compare/main...<branch>` if a merge is skipped.
 - PAGES WATCH (standing): re-dispatch after every new main tip (bot merges emit no push event).
 - EXPECTED WRAPPER-PUSH NOISE (standing): App-token push rejection on workflow-touching branches is expected; the PAT step lands the branch - verify via run log/`ls-remote`, admit on-thread, no post-mortem. Same for the losing duplicate lab session's non-fast-forward push-failure comment.
 - MERGE-ORDERING WATCH (standing, expires with #623's merge): until then the live sweep is the UNANCHORED one on main - never write the literal tester-approval marker phrase in any bot comment on an open workflow PR thread (paraphrase). After the merge the anchored sweep removes the hazard.
 - NATIVE-PROOF SEQUENCING (new, standing): comment-triggered per-OS arms execute main's workflow YAML; the byte-exact Windows handoff proof REQUIRES a post-merge run (native pair on #582). A pre-merge `/oc test-windows` on #614 would reproduce the bug, not prove the fix - do not dispatch it.
 - TEST-CRASH RULE (standing): retry once; second consecutive silent death on same PR -> `lab`; never a third test.
 - BOT-ACTOR CLASS (standing): documented red + on-thread explanation; no dispatch.
 - Infra routing guard: anything touching `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` routes to `lab`, never `fix`/`continue`.
 - Orphan-main protection holds: verify the PR branch shares history with `main` before every merge.
 - IP hold (standing): God of War commission declined; original mythic-duel alternative awaiting owner.
 - Standing-board close guard: #70 and #42 never carry `Closes`.
 - Shipping limit: max 2 new-project merges/day (not binding; no new-project PRs in flight).

## NEXT-RUN PLAYBOOK
   1. **#623 (highest priority): verify the sweep merged it** - #619 closed, main advanced (new tip), pages success on the new tip. If the sweep skipped it (not MERGEABLE, shallow-check quirk), diagnose and re-arm; never re-draft.
   2. **#614:** watch read-only test 39066052603 -> on approve-test, check mergeability: if CONFLICTING (expected after #623), dispatch `{"action":"lab","pr":614}` with the unification instruction (keep R18 in position; ranges R1-R21; `silent-stall-audit.sh` green; do NOT touch maintainer.yml/lab.yml; keyless) UNLESS a lab run from the queued-review route is already live; then review -> test -> PAT merge; on merge dispatch `{"action":"test-macos","issue":582}` + `{"action":"test-windows","issue":582}` IN-RUN.
   3. #622: watch review 39066073234 -> verdict routing -> read-only test -> PAT merge (`Closes #620`).
   4. NATIVE PAIR: the byte-exact Windows `/oc maintainer` from post-merge main is the #612 closing proof; on green fold the parity row and close #612; defects -> fix with report evidence.
   5. Pages: confirm success after any new main tip; else `gh workflow run pages.yml`.
   6. Held runs: sweep is automatic; if any `action_required` survives, investigate and ping the owner if manual approval is needed.
   7. #552 owner confirmation outstanding (7-day human rule ~Oct 23).
   8. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
  - Did the sweep land #623 on this tick, and did #619 close with it?
  - Does #614 flip CONFLICTING exactly on the range lines, and does the queued-review route pick up the unification rebase without a maintainer dispatch?
  - Does #622's round-3 review approve the `274f2c10` fold?
  - With the anchored + head-bound sweep live on main, does the #619 class stay dead under the next workflow PR?

 - Hephaestus, the Maintainer
