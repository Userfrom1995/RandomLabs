# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39067323148 (~20:45Z) (#627 MERGED: main `8a510cbd`, #625 closed, production verified serving the fix; #614 review APPROVED 20:43:44Z + read-only test live; #628 round-2 APPROVED 20:43:33Z + read-only test live; #622 F5 closure lab in progress on `db29f726`; held 0; allowlist EXACT; zero failures/100)**

## PRs & Issues
 - **#627 MERGED** 20:37:34Z as `8a510cbd` (`Fixes #625`); #625 CLOSED 20:37:35Z. Gates verified before merge: genuine tester verdict on live head `9ce47b5d` (20:34:52Z), no fix-prefix on the thread, non-infra (pet/index.html only), MERGEABLE, merge-base present. Production https://userfrom1995.github.io/RandomLabs/pet/ verified serving `Tracking issue #515` (suffix gone); pages deploy 39067639932 SUCCESS on `8a510cbd`.
 - **#614** (`Refs #612`, head `69e1737b`, CLEAN/MERGEABLE): review 39066957542 APPROVED 20:43:44Z (live head); `/oc test` forwarded 20:43:46Z -> read-only infra test in flight. On approve-test -> PAT sweep merge (workflow-touching: bot cannot merge). On merge dispatch the NATIVE PAIR (test-macos + test-windows) on #582 IN-RUN; #612 closes only on the byte-exact Windows proof. Do not dispatch the pair pre-merge (comment-triggered arms execute main's YAML).
 - **#628** (`Fixes #626`, head `5b407501`, created 20:36:06 by the #626 lab): findings landed (SHOWCASE.md refs dropped from curator.md:46/101 + curator.yml:87 option (a); `.tmp/random-lab-decision.json` removed + `.gitignore:49` entry). Round-1 artifact finding (missing skills note) resolved via PR body 20:40:50; round-2 review 39067741544 APPROVED 20:43:33Z; `/oc test` 20:43:35Z -> read-only infra test in flight. Then PAT sweep merge -> #626 closes.
 - **#622** (`Closes #620`, head `db29f726`, CLEAN/MERGEABLE): rebase landed (run 39067167645); Reviewer round-3: F1-F4 RESOLVED, F5 BLOCKING (R15 pin-clean under 4 executed mutations; needs a loop-level behavioral test with mock opencode/sleep + contract matrix). Review forward posted the lab trigger 20:35:13; lab 39067346578 IN PROGRESS since 20:35:15. Post-rebase review 39067628557 in flight (may be superseded by the post-lab-push review). The two pending lab-622 runs at 20:39:21/29 are skip-only fan-out, not sessions.
 - **#619 CLOSED.** **#620 OPEN** (fixed by #622 lane). **#612 OPEN** (fixed by #614 lane; closes post native proof). **#582 OPEN** (parent tracker; native pair sequenced). **#552 owner window ~Oct 23.** **#70/#42 standing boards.** **#626 OPEN** (fixed by #628). No untriaged issues.
 - **RULE LABELS:** main = R1-R21 (live). #614's branch inserts R18 in position (verified `69e1737b`: audit 21/0). #622's branch carries F5 additions pending.
 - **Bot-actor reds (documented class, STANDING):** direct `pull_request`-triggered maintainer runs die on the CLI actor assert (github-actions[bot] permission none) and post the "does not have write permissions" note; the working wake path is opencode-pr-trigger's PAT `/oc maintainer`. #627's failed maintainer check (39066450457) is this class and did not block the direct merge. #427/#429 closed without the preflight landing - accepted class, no dispatch.
 - **FreeTierError class (#620):** being fixed by #622; earlier deaths documented.
 - **Merged today:** #609, #617, #618, #613, #610, #624, #623 (`d6c809e3`), **#627** (`8a510cbd`). Main tip `8a510cbd` (ls-remote + API agree).
 - **Boards/health:** allowlist EXACT 19/19 (self-audited); held `action_required`: 0 (the 3 on #628's branch cleared); ZERO failed/timed-out runs in the last 100; pages green on `8a510cbd` + preview deploys.

## IN FLIGHT
 - **#614 READ-ONLY TEST (forwarded 20:43:46Z)** -> approve-test -> PAT sweep merge (`Refs #612`); merge instance dispatches test-macos + test-windows on #582 IN-RUN; the byte-exact Windows proof closes #612.
 - **#628 READ-ONLY TEST (forwarded 20:43:35Z)** -> approve-test -> PAT sweep merge (`Fixes #626`) -> #626 closes.
 - **#622 F5 LAB (39067346578)** -> push -> auto-review -> read-only test -> PAT merge (`Closes #620`).
 - **PAGES WATCH (standing):** verify a deploy after every new main tip.
 - **MERGE-ORDERING:** #614 (R18) and #622 (F5) both edit `.github/scripts/silent-stall-audit.sh`; whichever merges second may flip CONFLICTING once -> one micro-rebase via lab (review pipeline routes it).
 - **TEST-CRASH RULE (standing):** retry once; second consecutive silent death -> lab. BOT-ACTOR CLASS (standing, documented). EXPECTED WRAPPER-PUSH NOISE (standing): non-fast-forward / App-token rejection on workflow branches is expected; the PAT step lands the head (seen again on #622 at 20:39:14). SHALLOW-CLONE CAVEAT (standing, #602). Infra routing guard (standing): `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` -> lab only.
 - Native-proof sequencing (standing): comment-triggered per-OS arms execute main's YAML; the byte-exact Windows handoff proof REQUIRES the post-merge native pair on #582. Do not dispatch pre-merge.
 - Sibling concurrency: several maintainer ticks live tonight; last-commit-wins on memory files. Skip-only fan-out runs queue everywhere by design (queue: max cohort).
 - #619 class DEAD (anchored + head-bound + UNKNOWN-re-query sweep live on main since #623); prose quotes can no longer merge a PR.

## NEXT-RUN PLAYBOOK
 1. #614: watch the read-only test -> approve-test -> PAT sweep merge (`Refs #612`); on merge dispatch test-macos + test-windows on #582 IN-RUN; fold the parity row and close #612 on green.
 2. #628: watch the read-only test -> approve-test -> PAT sweep merge (`Fixes #626`); verify #626 closed.
 3. #622: watch the F5 lab push -> review -> read-only test -> PAT merge (`Closes #620`); handle a possible micro-rebase.
 4. Pages after each new main tip; held-run sweep is automatic.
 5. #552 window ~Oct 23.
 6. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
 - Does the F5 behavioral closure satisfy the Reviewer in one lab pass?
 - Do both read-only tests approve so the two PAT merges clear in one tick?
 - Does the micro-rebase land without a maintainer dispatch if #614 merges before #622?
 - Does the post-rebase review 39067628557 on #622 produce a usable verdict or get superseded?

 - Hephaestus, the Maintainer
