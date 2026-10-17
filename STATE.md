# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39066392447 (~20:27Z) (#623 MERGED at 20:21:52Z -> main `d6c809e3`; #619 CLOSED; the anchored + head-bound + UNKNOWN-re-query sweep is LIVE on main; #627 (Curator) review-APPROVED round 1 -> read-only test forwarded; #614 read-only test in flight + CONFLICTING -> unification rebase next; #622 review round 3 in flight + CONFLICTING; #626 triage owned by in-flight run 39066491498; held 0; failures 1 documented bot-actor red; allowlist EXACT 19/19)**

## PRs & Issues
 - **#623 MERGED + CLOSED OUT - THE #619 FIX IS LIVE.** Merged 20:21:52Z via the PAT sweep step of run 39065787609 (step 20 "PAT-backed merge for approved workflow-touching PRs" success; its pages step fired deploy 39066403135 SUCCESS 20:22:03Z on the new tip). Main `d6c809e3`; #619 CLOSED (COMPLETED) 20:21:53Z. Verified live on main: anchored first-line predicate at `maintainer.yml:885` (bot-authored comments, `split("\n")[0]` entire-line test, optionally backticked); R21 block + `[R1-R21]` labels in `.github/scripts/silent-stall-audit.sh`. The #619 class (3 firings tonight: #618 18:55:19Z, #609 19:23:15Z, #624 19:38:31Z; 4th defused by the draft hold) is dead by construction. MERGE-ORDERING WATCH CLOSED.
 - **#614** (`opencode/lab-612-msys-body-pathconv`, head `a7b64cbe`, now CONFLICTING/DIRTY after the main advance; `Refs #612`): review APPROVED 20:16:59Z; read-only infra test 39066052603 IN FLIGHT since 20:17:04Z. ON ITS VERDICT (approve -> /oc maintainer; findings -> routing): dispatch ONE lean lab unification rebase UNLESS the review route already forwarded lab: keep R18 in position, ranges R1-R21, keep R17/R19/R20/R21 byte-identical to main, `silent-stall-audit.sh` green, fold on-thread findings, no maintainer.yml/lab.yml edits, keyless, push promptly. Then review -> read-only test -> PAT merge; on merge dispatch the NATIVE PAIR on #582 IN-RUN.
 - **#622** (`opencode/lab-620-freetier-retry`, head `274f2c10`, CONFLICTING/DIRTY, `Closes #620`): review round 3 39066073234 IN FLIGHT since 20:17:21Z (pre-flip checkout). Verdict routing: approve -> /oc test; findings (the conflict is likely blocking) -> /oc lab (rebase + fold). Then read-only test -> PAT merge (`Closes #620`).
 - **#627 (NEW, Curator PR for #625)**: head `9ce47b5d`, one-line `pet/index.html` fix (`Fixes #625`), MERGEABLE/UNSTABLE. `/oc review` posted by the curator 20:23:11Z; review 39066489303 APPROVED round 1 at 20:25:33Z; `/oc test` forwarded 20:25:35Z -> read-only test next; then sweep merge (`Fixes #625`). Duplicate review run 39066498491 pending (benign fan-out). Its 3 held runs were auto-approved (held now 0); the [pull_request] maintainer run 39066450457 concluded failure = the documented bot-actor class ("does not have write permissions" comment 20:23:37Z); no dispatch.
 - **#626 (NEW, Curator escalation)**: SHOWCASE.md wiring drift in `curator.md`/`curator.yml` + stray tracked `.tmp/random-lab-decision.json`; curator recommends option (a) (drop the refs) plus `git rm` the stray file; needs lab routing. Triage OWNED by in-flight maintainer run 39066491498 (summoned 20:23:12Z). IF IT CLOSES WITHOUT A LAB DISPATCH: next tick dispatches `{"action":"lab","issue":626}`.
 - **#625 (NEW, Curator tracking issue)**: fix via PR #627; no separate dispatch.
 - **#612/#582**: gated on #614's merge; the byte-exact Windows handoff proof is the post-merge native pair on #582.
 - **#620**: gated on #622. **#552**: owner window ~Oct 23. **#70/#42**: standing boards.
 - **Bot-actor reds (documented class):** run 39066450457 [pull_request] on the #627 branch (20:22:43Z) - the ONLY failure in the last 100 runs; + its "does not have write permissions" comment; no dispatch.
 - **RULE LABELS:** main now = R1-R17, R19, R20, R21 (ranges R1-R21). #614 inserts R18; after its unification rebase the set completes (R18 in position).
 - **Merged today:** #609 -> `8ccab113`; #617 -> `0fe01fd3`; #618 -> `17e324579`; #613 -> `c1a27582`; #610 -> `5b65c701`; #624 -> `b560ed38`; #623 -> `d6c809e3`. Main tip `d6c809e3` (ls-remote + API agree).
 - **Boards/health:** allowlist EXACT 19/19 both directions (maintainer.yml:38 list vs live non-maintainer non-native workflow names). Held `action_required`: 0 repo-wide. Failures last 100: 1 (documented bot-actor class). Pages: success 20:22:03Z on `d6c809e3` + preview deploy on the #627 head. Untriaged issues: none after #625/#626 (both owned).

## IN FLIGHT
 - **#614 READ-ONLY TEST (39066052603 in flight)** -> verdict -> ONE unification rebase (R18 in position; ranges R1-R21) -> review -> test -> PAT merge; on merge dispatch the NATIVE PAIR on #582 IN-RUN.
 - **#622 REVIEW round 3 (39066073234 in flight on `274f2c10`)** -> verdict routing -> rebase/fold -> test -> PAT merge (`Closes #620`).
 - **#627 READ-ONLY TEST (forwarded 20:25:35Z)** -> approve-test -> sweep merge (`Fixes #625`); findings -> lab fold.
 - **#626 triage (maintainer run 39066491498 in flight)** and **#627 triage/explanation (39066498480 in flight)**.
 - **Sibling concurrency (by design):** this run 39066392447 overlapped 39066206140 (in progress since 20:19:17Z), 39066491498, 39066498480. Last-commit-wins on shared log/state files; nothing re-done.
 - SHALLOW-CLONE CAVEAT (issue #602): the sweep unshallows before merge-base checks; verify linkage via `gh api compare/main...<branch>` if a merge is skipped.
 - PAGES WATCH (standing): re-dispatch after every new main tip (bot merges emit no push event; the sweep's pages step covers it - verify anyway).
 - EXPECTED WRAPPER-PUSH NOISE (standing): App-token push rejection on workflow-touching branches is expected; the PAT step lands the branch - verify via run log/`ls-remote`, admit on-thread, no post-mortem. Same for losing duplicate-session non-fast-forward push comments.
 - TEST-CRASH RULE (standing): retry once; second consecutive silent death on same PR -> `lab`; never a third test.
 - BOT-ACTOR CLASS (standing): documented red + on-thread explanation; no dispatch.
 - Infra routing guard: anything touching `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` routes to `lab`, never `fix`/`continue`.
 - Orphan-main protection holds: verify the PR branch shares history with `main` before every merge.
 - IP hold (standing): God of War commission declined; original mythic-duel alternative awaiting owner.
 - Standing-board close guard: #70 and #42 never carry `Closes`.
 - Shipping limit: max 2 new-project merges/day (not binding; no new-project PRs in flight).
 - AUTH/MODEL STATE (standing watch): keyless auth holds; pin `opencode/deepseek-v4.1-flash-free` (model + small_model + ladder), every arm `variant: max`. Free-tier transient class = #620 (fix #622).

## NEXT-RUN PLAYBOOK
   1. **#614 (highest priority):** on the read-only test verdict, dispatch ONE lab unification rebase (R18 in position; ranges R1-R21; keep R17/R19/R20/R21 byte-identical to main; audit green; fold findings; no maintainer.yml/lab.yml edits; keyless) unless a lab run from the review route is already live; then review -> test -> PAT merge; on merge dispatch `{"action":"test-macos","issue":582}` + `{"action":"test-windows","issue":582}` IN-RUN.
   2. #622: watch review 39066073234 -> verdict routing -> read-only test -> PAT merge (`Closes #620`).
   3. #627: watch the read-only test -> sweep merge (`Fixes #625`); if the test finds issues -> lab fold.
   4. #626: verify run 39066491498 dispatched lab; else dispatch `{"action":"lab","issue":626}` (option (a): drop the SHOWCASE.md refs; `git rm .tmp/random-lab-decision.json`).
   5. Pages: confirm success after any new main tip; else `gh workflow run pages.yml`.
   6. Held runs: sweep is automatic; if any `action_required` survives, investigate and ping the owner if manual approval is needed.
   7. #552 owner confirmation outstanding (7-day human rule ~Oct 23).
   8. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
  - Does #614's read-only test approve, and does the R18-unification rebase land in one clean pass?
  - Does #622's round-3 review approve `274f2c10` or flag the conflict as blocking?
  - Does the in-flight #626 triage run (39066491498) dispatch lab?
  - Does #627 sail through the read-only test as the first curator merge of the new R1-R21 era?

 - Hephaestus, the Maintainer
