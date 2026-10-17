# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39068109303 (~20:50Z) (#628 GENUINE TESTER VERDICT IS PROSE-FIRST -> the R21 anchor can never match it -> fresh `/oc test` re-dispatched this run; systemic publication-shape issue filed; #614 review APPROVED 20:43:44Z -> read-only test 39067945188 LIVE; #622 round-4 review confirmed F5 BLOCKING on the current head -> live F5 lab 39067346578 + queued findings lab 39067966662; main `8a510cbd`, pages green 20:47:30Z; allowlist EXACT 19/19; held 0; failures 0)**

## PRs & Issues
 - **#628** (`opencode/lab-626-curator-wiring-tmp`, head **`5b407501`**, MERGEABLE, `Fixes #626`): gates genuinely green (review `/oc approve` 20:43:33Z; read-only infra test run 39067932835 SUCCESS, evidence scope infra, audit 20/0, verdict comment 6240760500 at 20:46:03Z) BUT the verdict comment's first line is prose (`All green. Posting the decision comment.`), so the R21 anchor (`maintainer.yml:885`) cannot match it and the PAT sweep would skip forever. THIS RUN dispatched `{"action":"test","pr":628}` to re-publish the verdict in contract shape. On the new valid verdict: PAT sweep merge -> `Fixes #626` -> close #626. Do NOT forge a marker comment; the gates are green, only the published shape is wrong.
 - **NEW ISSUE (created this run)**: tester verdict publication-shape gap (prose-first comments stall the sweep; second occurrence tonight after #614's 20:27:01Z verdict). UNTRIAGED: self-dispatch expected; if no lab dispatch appears by the next survey, route `{"action":"lab","issue":<N>}`.
 - **#614** (`opencode/lab-612-msys-body-pathconv`, head `69e1737b`, MERGEABLE/CLEAN, `Refs #612`): review 39066957542 SUCCESS -> `/oc approve` 20:43:44Z (marker first line); `/oc test` forwarded 20:43:46Z; read-only infra test 39067945188 IN PROGRESS since 20:43:49Z. On approve-test -> `/oc maintainer` -> PAT sweep merge (`Refs #612` must stay OPEN); the merging instance dispatches the NATIVE PAIR (`test-macos` + `test-windows`) on #582 IN-RUN.
 - **#622** (`opencode/lab-620-freetier-retry`, head `db29f726`, MERGEABLE/CLEAN, `Closes #620`): round-4 review (comment 6240724375, 20:44:02Z, on the CURRENT head `db29f726`) confirmed F5 BLOCKING with five executed mutations that keep the full audit green (20/0) while breaking the #620 contract; required closure = loop-level behavioral harness (real extracted run blocks + mock `opencode` + mock `sleep`, fail-closed extraction/interception, per-path contract matrix; requirements 1-5 in the review comment) with a stopgap snippet for the cap pins. F5 lab 39067346578 IN PROGRESS since 20:35:15Z; the review-forwarded lab 39067966662 is PENDING (FIFO per-PR queue behind it). On the fold push: `/oc review` -> read-only infra test -> PAT sweep merge. Head is 1 behind main (pet-only divergence `8a510cbd`, disjoint files).
 - **#626, #620, #612 OPEN** with live lanes; **#582** parent tracker (native pair sequenced post-#614); **#552** owner window ~Oct 23; **#70/#42** standing boards.
 - **Merged today:** #609, #617, #618, #613, #610, #624, #623, #627 (`8a510cbd`). Main tip `8a510cbd` (ls-remote + API agree); pages 39068205188 SUCCESS 20:47:30Z on the tip.
 - **RULE LABELS:** main = R1-R17, R19-R21 (20 live rules). #622 matches main. #614 inserts R18 in position -> on merge main gains R18 (R1-R21, 21 live).
 - **TEST-VERDICT-SHAPE WATCH (new, standing):** the R21 sweep requires the tester verdict comment's ENTIRE first line to be the marker. Any prose-first verdict silently stalls workflow PRs. Until the filed systemic fix lands, a prose-first verdict needs one `/oc test` re-dispatch (never a forged marker comment); a second recurrence can escalate to the owner for a manual click-merge when every content gate is green.
 - **Bot-actor red (documented class, STANDING):** the 20:39:37Z note on #628 (run 39067408558) is the direct pull_request-triggered maintainer assert; the working wake path is opencode-pr-trigger's PAT `/oc maintainer`.
 - **FreeTierError class (#620):** being fixed by #622.
 - **Boards/health:** allowlist EXACT 19/19 (self-audited this run); held `action_required`: 0; failures over the last 100 runs: 0; no untriaged issues before this run's new issue.

## IN FLIGHT
 - **#628 RE-TEST (dispatched this run)** -> contract-shaped verdict -> PAT sweep merge (`Fixes #626`) -> close #626; if prose-first recurs, re-dispatch once more or escalate to the owner for a manual click-merge.
 - **#614 READ-ONLY TEST (39067945188)** -> approve-test -> `/oc maintainer` -> PAT merge (`Refs #612`) -> NATIVE PAIR on #582 IN-RUN -> byte-exact Windows proof -> close #612 on green.
 - **#622 F5 FOLD (39067346578)** -> push -> review -> read-only test -> PAT merge (`Closes #620`); queued findings lab 39067966662 processes the same F5 contract; after #614 merges expect one micro-rebase on the shared audit lines (R18 insert).
 - **NEW publication-shape ISSUE** -> self-dispatch triage -> lab -> review -> read-only test -> PAT merge.
 - PAGES WATCH (standing): verify a deploy after every new main tip.
 - MERGE-ORDERING (standing): #614 first; then #622 may flip CONFLICTING once on the shared silent-stall-audit.sh range lines (R18 insert) -> one micro-rebase via the review-forwarded lab route.
 - TEST-CRASH RULE (standing): retry once; second consecutive silent death -> lab. BOT-ACTOR CLASS (standing, documented). EXPECTED WRAPPER-PUSH NOISE (standing): non-fast-forward / App-token rejection on workflow branches is expected; the PAT step lands the head. SHALLOW-CLONE CAVEAT (standing, #602). Infra routing guard (standing): `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` -> lab only.
 - Native-proof sequencing (standing): comment-triggered per-OS arms execute main's YAML; the byte-exact Windows handoff proof REQUIRES the post-#614-merge native pair on #582. Do not dispatch it pre-merge.
 - Sibling concurrency: schedule maintainer run 39068124836 was in flight during this survey; maintainer supersedes by design; last-commit-wins on memory files.
 - IP hold (standing); Standing-board close guard #70/#42; shipping limit (not binding).

## NEXT-RUN PLAYBOOK
 1. #628: watch the re-test -> valid first-line verdict -> PAT sweep merge (`Fixes #626`) -> close #626. If the re-test publishes prose-first again, re-dispatch once more or escalate to the owner for a manual click-merge (every content gate is green).
 2. NEW issue: confirm the self-dispatch triage routed `lab`; else `{"action":"lab","issue":<N>}`.
 3. #614: read-only test verdict -> approve-test -> PAT merge (`Refs #612`); on merge dispatch `test-macos` + `test-windows` on #582 IN-RUN; fold the byte-exact Windows proof and close #612 on green.
 4. #622: F5 fold push -> review -> read-only test -> PAT merge (`Closes #620`); fold the R18-insert micro-rebase if #614 merged first.
 5. Pages after every new main tip; held-run sweep is automatic; #552 window ~Oct 23.
 6. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
 - Does the #628 re-test publish a contract-shaped verdict, or does the prose-first shape recur?
 - Does the filed publication-shape issue get triaged by its self-dispatch, or does the fallback route it?
 - Does the F5 loop-level harness land in one lab pass, closing the third pin-brittleness round?
 - Does #614's read-only test approve cleanly on `69e1737b` so the native pair finally unlocks?

 - Hephaestus, the Maintainer
