# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39068463150 (~20:53Z) (#629 SELF-TRIAGE: publication-shape gap -> `{"action":"lab","issue":629}` dispatched this run; #628 contract-shaped re-test LIVE (39068463210, `/oc test` 20:51:09Z); #614 read-only test LIVE (39067945188); #622 F5 fold LIVE (39067346578) + 3 FIFO lab passes queued; main `8a510cbd`, pages green 20:47:30Z; allowlist EXACT 19/19; held 0; failures 0)**
 - Prior checkpoint: run 39068109303 (~20:50Z) (#628 prose-first verdict diagnosed -> fresh `/oc test`; publication-shape issue filed; #614 review APPROVED -> read-only test live; #622 round-4 F5 blocking -> live F5 lab + queued findings lab)

## PRs & Issues
 - **#629** (`[Infra] opencode-test: prose-first tester verdict silently stalls the PAT sweep`, created 20:51:10Z by the previous run's `create_issue`; self-triage dispatch fired 20:51:11Z -> THIS run): zero comments before this tick. DISPATCHED `{"action":"lab","issue":629}` with the full fix instruction (publication-shape checker mirroring #616's `review-comment-published.sh`, read from the run's own workflow commit; wired into `opencode-test.yml`; fail closed -> existing retry path; R21 untouched; one surgical PR, `Fixes #629`; live repro #628/6240760500 + #614/6240507941). Lane: lab -> review -> read-only test -> PAT merge -> close #629.
 - **#628** (`opencode/lab-626-curator-wiring-tmp`, head **`5b407501`**, MERGEABLE/**UNSTABLE**, `Fixes #626`): all content gates green (review `/oc approve` 20:43:33Z; read-only infra test 39067932835 SUCCESS, evidence scope infra, audit 20/0) BUT the published verdict's first line is prose, so the R21 anchor cannot match. Contract-shaped re-test 39068463210 IN PROGRESS since 20:51:11Z (fresh `/oc test` posted 20:51:09Z). On a valid first-line verdict -> PAT sweep merge (`Fixes #626`) -> close #626. If prose-first recurs -> re-dispatch once more or escalate to the owner for a manual click-merge (every content gate is green). NEVER forge a marker comment.
 - **#614** (`opencode/lab-612-msys-body-pathconv`, head `69e1737b`, MERGEABLE/CLEAN, `Refs #612`): marker-first `/oc approve` 20:43:44Z; read-only infra test 39067945188 IN PROGRESS since 20:43:49Z. On approve-test -> `/oc maintainer` -> PAT sweep merge (`Refs #612` must stay OPEN); the merging instance dispatches the NATIVE PAIR (`test-macos` + `test-windows`) on #582 IN-RUN; byte-exact Windows proof -> close #612 on green.
 - **#622** (`opencode/lab-620-freetier-retry`, head `db29f726`, MERGEABLE/CLEAN, `Closes #620`): F5 loop-level fold lab 39067346578 IN PROGRESS since 20:35:15Z; THREE FIFO-queued lab passes behind it (39067628562 pending 20:39:21Z, 39067638106 pending 20:39:29Z, 39067966662 pending 20:44:06Z) - each will re-inspect the post-fold head; per-PR FIFO keeps one writer at a time. On the fold push: `/oc review` -> read-only test -> PAT sweep merge (`Closes #620`). Head 1 behind main (pet-only divergence `8a510cbd`, disjoint files).
 - **#626, #620, #612 OPEN** with live lanes; **#582** parent tracker (native pair sequenced post-#614); **#552** owner window ~Oct 23; **#70/#42** standing boards.
 - **Merged today:** #609, #617, #618, #613, #610, #624, #623, #627 (`8a510cbd`). Main tip `8a510cbd` (ls-remote + API agree); pages 39068205188 SUCCESS 20:47:30Z on the tip.
 - **RULE LABELS:** main = R1-R17, R19-R21 (20 live rules). #622 matches main. #614 inserts R18 in position -> on merge main gains R18 (R1-R21, 21 live).
 - **TEST-VERDICT-SHAPE WATCH (standing):** the R21 sweep requires the tester verdict comment's ENTIRE first line to be the marker. Until #629's fix lands, a prose-first verdict needs one `/oc test` re-dispatch (never a forged marker comment); a second recurrence can escalate to the owner for a manual click-merge when every content gate is green.
 - **Bot-actor red (documented class, STANDING):** the direct pull_request-triggered maintainer assert posts a permission note; the working wake path is opencode-pr-trigger's PAT `/oc maintainer`.
 - **FreeTierError class (#620):** being fixed by #622.
 - **Stale phantom queued runs (observed, log-only):** Sep 25 lab-427 cohort (36101155844/851/868) and Oct 5 opencode-pr-trigger 37344324101 (issue532 branch) sit pending forever on dead concurrency groups; no blocking effect on any live group. No action.
 - **Boards/health:** allowlist EXACT 19/19 (self-audited this run against live names); held `action_required`: 0; failures over the last 100 runs: 0; no untriaged issues besides #629 (being triaged now).

## IN FLIGHT
 - **#629 LAB (dispatched this run)** -> PR -> review -> read-only test -> PAT merge (`Fixes #629`) -> close.
 - **#628 RE-TEST (39068463210)** -> contract-shaped verdict -> PAT sweep merge (`Fixes #626`) -> close #626; if prose-first recurs, re-dispatch once more or escalate to the owner for a manual click-merge.
 - **#614 READ-ONLY TEST (39067945188)** -> approve-test -> `/oc maintainer` -> PAT merge (`Refs #612`) -> NATIVE PAIR on #582 IN-RUN -> byte-exact Windows proof -> close #612 on green.
 - **#622 F5 FOLD (39067346578)** -> push -> review -> read-only test -> PAT merge (`Closes #620`); the 3 FIFO lab passes re-verify the fold; after #614 merges expect one micro-rebase on the shared audit lines (R18 insert).
 - PAGES WATCH (standing): verify a deploy after every new main tip.
 - MERGE-ORDERING (standing): #614 first; then #622 may flip CONFLICTING once on the shared silent-stall-audit.sh range lines (R18 insert) -> one micro-rebase via the review-forwarded lab route.
 - TEST-CRASH RULE (standing): retry once; second consecutive silent death -> lab. BOT-ACTOR CLASS (standing, documented). EXPECTED WRAPPER-PUSH NOISE (standing): non-fast-forward / App-token rejection on workflow branches is expected; the PAT step lands the head. SHALLOW-CLONE CAVEAT (standing, #602). Infra routing guard (standing): `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` -> lab only.
 - Native-proof sequencing (standing): comment-triggered per-OS arms execute main's YAML; the byte-exact Windows handoff proof REQUIRES the post-#614-merge native pair on #582. Do not dispatch it pre-merge.
 - Sibling concurrency: maintainer supersedes by design; last-commit-wins on memory files.
 - IP hold (standing); Standing-board close guard #70/#42; shipping limit (not binding).

## NEXT-RUN PLAYBOOK
  1. #629: watch the lab PR -> review -> read-only test -> PAT merge (`Fixes #629`); verify the checker fails closed on a mis-shaped verdict and do NOT weaken R21.
  2. #628: watch the re-test -> valid first-line verdict -> PAT sweep merge (`Fixes #626`) -> close #626. If prose-first recurs, re-dispatch once more or escalate to the owner for a manual click-merge (every content gate is green).
  3. #614: read-only test verdict -> approve-test -> PAT merge (`Refs #612`); on merge dispatch `test-macos` + `test-windows` on #582 IN-RUN; fold the byte-exact Windows proof and close #612 on green.
  4. #622: F5 fold push -> review -> read-only test -> PAT merge (`Closes #620`); drain the FIFO lab passes; fold the R18-insert micro-rebase if #614 merged first.
  5. Pages after every new main tip; held-run sweep is automatic; #552 window ~Oct 23.
  6. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
  - Does the #628 re-test publish a contract-shaped verdict, or does the prose-first shape recur before #629's fix lands?
  - Does the lab land the publication-shape checker in one surgical PR, and does it fail closed without touching R21?
  - Does the F5 loop-level harness land in one lab pass, and do the three queued FIFO passes converge or no-op cleanly?
  - Does #614's read-only test approve cleanly on `69e1737b` so the native pair finally unlocks?

  - Hephaestus, the Maintainer
