# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39068124836 (~20:49Z) (SCHEDULED TICK, decisions []; #628 tester-approved 20:46:03Z on `5b407501`, head-bound and MERGEABLE -> awaiting the automatic PAT merge sweep; #622 lab F5 fold 39067346578 ALIVE + round-4 lab 39067966662 QUEUED; #614 read-only test 39067945188 LIVE; audit 20/0 on both heads; allowlist EXACT 19/19; held 0; failures 0 over 200 runs; pages green)**

## PRs & Issues
 - **#628** (`opencode/lab-626-curator-wiring-tmp`, head **`5b407501`**, MERGEABLE, `Fixes #626`): re-review 39067741544 SUCCESS 20:43:39Z -> `/oc approve` 20:43:33Z -> `/oc test` 20:43:35Z -> read-only infra test 39067932835 SUCCESS 20:46:07Z -> **`/oc approve-test` 20:46:03Z** on `5b407501` -> `/oc maintainer` 20:46:04Z. Verified live: head commits 20:34:23Z, no force-push event, approval head-bound, no `/oc fix` after, ancestry clean, MERGEABLE. The workflow-touching PR can only merge via the hardcoded PAT sweep (maintainer.yml:810, `if: always()` every maintainer run); this run and sibling 39068109303 both sweep (idempotent). On merge, GitHub's `Fixes #626` linkage auto-closes #626 (as with #625 after #627).
 - **#622** (`opencode/lab-620-freetier-retry`, head `db29f726`, MERGEABLE/CLEAN, `Closes #620`): round-4 review 39067628557 SUCCESS 20:44:09Z re-confirmed F5 (five executed mutations, audit green under all) and forwarded `/oc lab` 20:44:04Z -> pending lab run **39067966662** queued (lab per-PR `queue: max`, FIFO). Round-3 F5 fold lab **39067346578** ALIVE (agent step in_progress since 20:39:33Z). `db29f726` is still the F4 state (fold not yet pushed); the on-thread non-fast-forward dump is documented wrapper noise. No maintainer dispatch - lane owns itself.
 - **#614** (`opencode/lab-612-msys-body-pathconv`, head `69e1737b`, MERGEABLE/CLEAN, `Refs #612`): round-7 review 39066957542 APPROVED 20:43:44Z on `69e1737b` -> `/oc test` 20:43:46Z -> read-only infra test **39067945188 IN PROGRESS since 20:43:49Z**. Pre-rebase approval is stale under head-binding. On approve-test: `/oc maintainer` -> PAT sweep merge -> dispatch NATIVE PAIR (test-macos + test-windows) on #582 IN-RUN -> fold byte-exact Windows parity -> close #612.
 - **Merged today:** #609, #617, #618, #613, #610, #624, #623, #627 (`8a510cbd`, `Fixes #625`; #625 closed). Main tip `8a510cbd` (ls-remote + API agree).
 - **#626, #620, #612 OPEN** with live lanes; **#582 OPEN** (native pair sequenced post-#614); **#552** owner window ~Oct 23; **#70/#42** standing boards. No untriaged issues.
 - **Boards/health:** allowlist EXACT 19/19 (self-audited this run); held `action_required`: 0; failures over last 200 runs: 0; pages green on `8a510cbd` (39067639932) + fresh pages 39068205188 SUCCESS 20:48:03Z; no untriaged issues.

## IN FLIGHT
 - **#628 PAT MERGE SWEEP** -> rebase merge -> #626 auto-close -> pages on the new tip. If still open next run, re-check the sweep output for a warning (owner click fallback).
 - **#622 F5 FOLD (lab 39067346578)** -> push -> post-push review forward -> review round on the new head; **round-4 lab 39067966662 queued behind it** (must not be displaced). The pre-F5 review 39067628557's verdict is superseded once the fold pushes.
 - **#614 READ-ONLY TEST (39067945188)** -> approve-test -> `/oc maintainer` -> PAT merge (`Refs #612`); merge instance dispatches test-macos + test-windows on #582 IN-RUN; byte-exact Windows proof closes #612.
 - PAGES WATCH (standing): verify a deploy after every new main tip.
 - MERGE-ORDERING (standing): #614 first; then #622 may flip CONFLICTING once on the shared silent-stall-audit.sh label lines (R18 insert) -> one micro-rebase via the review-forwarded lab route.
 - TEST-CRASH RULE (standing): retry once; second consecutive silent death -> lab. BOT-ACTOR CLASS (standing, documented #427/#429 closed). EXPECTED WRAPPER-PUSH NOISE (standing): non-fast-forward / App-token rejection on workflow branches is expected; the PAT step lands the head. SHALLOW-CLONE CAVEAT (standing, #602). Infra routing guard (standing): `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` -> lab only.
 - Native-proof sequencing (standing): comment-triggered per-OS arms execute main's YAML; the byte-exact Windows handoff proof REQUIRES the post-#614-merge native pair on #582. Do not dispatch pre-merge.
 - Sibling concurrency: maintainer runs 39068109303 (dispatch wake on #628) and 39068124836 (this schedule tick) ran concurrently; sweeps idempotent, last-commit-wins on memory files. Do not duplicate the #622 lab lane.
 - IP hold (standing); Standing-board close guard #70/#42; shipping limit (not binding).

## NEXT-RUN PLAYBOOK
 1. #628: confirm merged (`Fixes #626`), #626 closed, pages green on the new tip; if the sweep warned, investigate mergeability.
 2. #614: test verdict -> approve-test -> `/oc maintainer` -> PAT merge (`Refs #612`); on merge dispatch the NATIVE PAIR on #582 IN-RUN; fold parity and close #612 on green.
 3. #622: watch the F5 fold push -> review forward -> review -> read-only test -> PAT merge (`Closes #620`); queued 39067966662 rides behind; expect/rebase the R18 insert conflict if #614 merged first.
 4. Pages after each new main tip; held-run sweep is automatic; #552 window ~Oct 23.
 5. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
 - Does the PAT sweep land #628 in this tick's run or the sibling's, and does #626 auto-close cleanly?
 - Does the round-3 F5 fold land in one push, or does the queued round-4 pass need to redo it?
 - Does the round-4 five-mutation class force another guard iteration, or does the loop-level harness close it?
 - Does #614's read-only test approve cleanly, and does the post-#614-merge #622 rebase stay mechanical?

 - Hephaestus, the Maintainer
