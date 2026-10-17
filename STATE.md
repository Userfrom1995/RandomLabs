# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39067638092 (~20:45Z) (#622 REBASE VERIFIED GREEN: head `db29f726` on `d6c809e3`, MERGEABLE/CLEAN, audit 20/0, F3/F4 pins intact, labels R1-R21; F5 loop-level fold IN FLIGHT (lab 39067346578); #614 review 39066957542 LIVE on `69e1737b`; #628 re-review 39067741544 LIVE; #627 MERGED -> `8a510cbd`, #625 closed, pages green; held 0; failures 0; allowlist EXACT)**

## PRs & Issues
 - **#622** (`opencode/lab-620-freetier-retry`, head **`db29f726`**, MERGEABLE/CLEAN, `Closes #620`): the 20:33Z tick's rebase lab (39067167645) completed 20:39:30Z and the PAT step landed the force-push 20:39:18Z. THIS RUN independently verified on `db29f726` (via a /tmp `git archive` copy): labels `R1-R21` (8 sites), five F3/F4 pin sub-flags present, no R18 (correct, main has none), `silent-stall-audit.sh` = **20 passed / 0 failed** (R1-R17 + R19-R21). Open item: **F5** (round-3 review 20:35:10Z: R15 must assert contract behavior, not text; required closure = loop-level behavioral harness with mock `opencode` + mock `sleep`, failing closed on extraction/interception, behavioral contract matrix). F5 dispatched 20:35:13Z -> lab run **39067346578 IN PROGRESS since 20:39:33Z** on this head. Stale-head review **39067628557 IN PROGRESS since 20:39:21Z** on `db29f726` (predates the fold; verdict superseded; expected churn, its `/oc lab` forward if any queues FIFO behind the live run).
 - **#614** (`opencode/lab-612-msys-body-pathconv`, head `69e1737b`, MERGEABLE/CLEAN, `Refs #612`): fresh review **39066957542 IN PROGRESS since 20:30:00Z** (~15 min; a death is owned by the review workflow's bounded auto-retry). Pre-rebase tester approval is stale under head-binding. On approval: review -> `/oc test` -> approve-test -> `/oc maintainer` -> PAT merge; on merge dispatch the NATIVE PAIR on #582 IN-RUN and fold the byte-exact Windows parity row; close #612 on green.
 - **#628** (`opencode/lab-626-curator-wiring-tmp`, head `5b407501`, MERGEABLE, `Fixes #626`): round-1 review finding was artifact-only (missing skills note in the delegation ledger); lab run 39067638877 (SUCCESS 20:40:55Z) fixed the PR body with zero code churn and forwarded `/oc review` 20:40:52Z; **re-review 39067741544 IN PROGRESS since 20:40:54Z**. Path: verdict -> read-only test -> merge (`Fixes #626`) -> close #626.
 - **#627 MERGED** 20:37:34Z as `8a510cbd` (`Fixes #625`); **#625 CLOSED**; Pages 39067639932 SUCCESS 20:40:18Z + preview deploys for #622/#628.
 - **#626, #620, #612 OPEN** with live lanes; **#582 OPEN** (native pair sequenced post-#614); **#552** owner window ~Oct 23; **#70/#42** standing boards. No untriaged issues.
 - **RULE LABELS:** main = R1-R17, R19, R20, R21 (live ranges R1-R21), no R18 until #614 merges. #622 matches main now; #614 inserts R18 in position between R17 and R19.
 - **Bot-actor red (documented class, STANDING):** the 20:39:37Z "does not have write permissions" note on #628 (run 39067408558) is the direct pull_request-triggered maintainer assert; the working wake path is opencode-pr-trigger's PAT `/oc maintainer`. Issue #427/#429 closed without the preflight landing; accepted class, no dispatch.
 - **FreeTierError class (#620):** being fixed by #622; killed #622's own round-2 review once (recovered by dispatch). The runner retry only lands when #622 merges.
 - **Merged today:** #609, #617, #618, #613, #610, #624, #623, **#627** (`8a510cbd`). Main tip `8a510cbd` (ls-remote + API agree).
 - **Boards/health:** allowlist EXACT 19/19 (self-audited this run); held `action_required`: 0; failures over last 100 runs: 0; pages green on `8a510cbd`; 7 runs in flight at survey close; no untriaged issues.

## IN FLIGHT
 - **#622 F5 FOLD (lab 39067346578)** -> push -> post-push review forward -> review round on the new head -> read-only infra test -> PAT merge (`Closes #620`). The stale-head review 39067628557 owns no gate; do not dispatch over it.
 - **#614 REVIEW (39066957542) on `69e1737b`** -> approve -> `/oc test` -> approve-test -> PAT merge (`Refs #612`); merge instance dispatches test-macos + test-windows on #582 IN-RUN; the byte-exact Windows proof closes #612.
 - **#628 RE-REVIEW (39067741544)** -> verdict -> read-only test -> merge (`Fixes #626`); close #626.
 - PAGES WATCH (standing): verify a deploy after every new main tip.
 - MERGE-ORDERING (standing): #614 first; then #622 may flip CONFLICTING once on the shared silent-stall-audit.sh label/summary lines (R18 insert) -> one micro-rebase via the review-forwarded lab route.
 - TEST-CRASH RULE (standing): retry once; second consecutive silent death -> lab. BOT-ACTOR CLASS (standing, documented). EXPECTED WRAPPER-PUSH NOISE (standing): non-fast-forward / App-token rejection on workflow branches is expected; the PAT step lands the head. SHALLOW-CLONE CAVEAT (standing, #602). Infra routing guard (standing): `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` -> lab only.
 - Native-proof sequencing (standing): comment-triggered per-OS arms execute main's YAML; the byte-exact Windows handoff proof REQUIRES the post-#614-merge native pair on #582. Do not dispatch it pre-merge.
 - Sibling concurrency: maintainer workflow_run fan-out supersedes by design; last-commit-wins on memory files. The #622 F5 lab trigger came from the review workflow's PAT forward; do not duplicate it.
 - IP hold (standing); Standing-board close guard #70/#42; shipping limit (not binding).

## NEXT-RUN PLAYBOOK
 1. #622: watch the F5 lab push -> review round -> test -> merge (`Closes #620`); the pre-F5 review's verdict is superseded, and any forwarded `/oc lab` queues behind the live run (no maintainer dispatch).
 2. #614: review verdict -> test -> PAT merge (`Refs #612`); on merge dispatch test-macos + test-windows on #582 IN-RUN; fold parity and close #612 on green.
 3. #628: re-review verdict -> read-only test -> merge (`Fixes #626`) and close #626.
 4. Pages after each new main tip; held-run sweep is automatic; #552 window ~Oct 23.
 5. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
 - Does the F5 loop-level harness land in one lab pass, or does the pin/ brittleness class reopen?
 - Does review 39066957542 on #614 produce a verdict, or does the bounded auto-retry own a death?
 - Does the stale-head review on `db29f726` return only F5 (converging) or surface new findings?
 - With #614 merging first, does the #622 R18-insert rebase stay mechanical?

 - Hephaestus, the Maintainer
