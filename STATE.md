# STATE - Random factory checkpoint
 - **Updated: 2026-09-25T05:50Z (maintainer run 36100241736, PR #426 9b4f9c1b CLEAN but B3/M1/M2 still open — Lab re-fix dispatched; PR #412/#424 dual-gate still PAT-pending)**
 - **PR #412:** `opencode/issue411-curate-tor-cli-site` head `d334638d91d58174ead85439a526b080e94dc59d` (5bdc556c + bcbc8c47 + d334638d tester suites) MERGEABLE CLEAN vs main `4c5bf2`. Reviewer approve 04:54:27Z round 7 (84 claims 0 FALSE, 6 files) + Tester approve-test 05:45:28Z 21/21 green (12 landing + 9 Playwright, live-run 12 commands), no newer fix, statusCheckRollup 10/10 SUCCESS/SKIPPED, non-orphan via f1412e9. Dual gate satisfied — awaiting PAT merge Fixes #411 (hardcoded 650-718 step will rebase; diff 6 site files + 2 test files, no workflows).
 - **PR #424:** `opencode/lab-423-doc-workflow-truth` head `7a680ed5657491771a151de233f8ab243006651c` MERGEABLE CLEAN vs main `4c5bf2` (9 lab commits ghost sweep). Reviewer approve 05:40:38Z + Tester approve-test 05:43:57Z infra 8/8 — DUAL GATE SATISFIED, still clean vs 4c5bf2. Awaiting PAT merge Closes #423.
 - **PR #426:** `opencode/lab-422-opencode-version-hardening` head `9b4f9c1b31414b891d299b27cfac388f01d5a2de` **MERGEABLE CLEAN vs main `4c5bf2`** (parent `fff42a2ca3dc44af8e00fa4b595256a51b8a613c`, 6 commits: vendor action + R8/R9 guards + selfheal + timeouts + renumber R9). Rebase onto `4c5bf2` LANDED at 05:50:13Z (`git merge-base 4c5bf2 9b4f9c1b == 4c5bf2`). **B1 fixed, B2 renumbered to R9, but B3 (PAT shell-injection in 4 workflows), M1 (lab.yml strip/push unconditional), M2 (AGENTS/LAB/docs overstatements) still OPEN per live git-show** — Lab re-fix dispatched 05:50Z, Reviewer 36100241706 in_progress on this head.
 - **PR #413:** `opencode/issue387-20260924212038` head `19065d0b7d74bc110b3cc232d3c6fa8fc3655a6c` MERGEABLE CLEAN but REWOUND vs `recover/413` tag `d7b66be3f6d76ceb3b556d896304e9118ab90637` (10 commits lost). Recover dispatched 05:17Z still pending — cooldown holds, re-verify vs 4c5bf2 after recovery.
 - **Issue #427:** OPEN actor-permission noise — Lab dispatched 05:17Z for maintainer preflight gate, still pending PR.
 - **Issue #423:** OPEN docs divergence — PR #424 7a680ed dual-gate approved, awaiting PAT merge Closes #423.
 - **Issue #422:** OPEN fleet P0 version-fetch abort — PR #426 CLEAN but still blocking B3/M1/M2, Lab re-fix pending.
 - **Issue #425:** OPEN upstream version-fetch report (human Owner PAT required in anomalyco/opencode) — no lab.
 - **Main 4c5bf2 LIVE:** `git ls-remote == 4c5bf201bf6fb4fd0309821e1e6f0f869b0d9895` == `gh api refs/heads/main`, Deploy success 36100234780/36100234790 on PR #426 push + 36099945694 on main, trigger-list 18/18 PASS, two-knob mimo-v2.6-flash-free free.
 - **PR #419:** CLOSED MERGED at `29981be57273df9b368bc141584e6ef14528b2c3` -> main `4c5bf201...` (4 commits 155 insertions pages.yml only, Closes #417). Issue #417 CLOSED.

## STANDING OWNER DIRECTIVES (active)
 - GUI HANG DIRECTIVE (2026-09-24), CLI IMPROVEMENT DIRECTIVE v2, WEBSITE DIRECTIVE, MODEL SWITCH RESOLVED f1412e9->e52295a->4c5bf2, DOCUMENTATION INVARIANT, TOR CLI DIRECTIVE, EXCELLENCE CHARTER.

## CRITICAL INFRASTRUCTURE STATE
 - Main 4c5bf2 LIVE verified (advance e52295a->4c5bf2 via PR #419 4 commits, non-orphan f1412e9). PR #412 d334638d CLEAN dual gate satisfied, will merge via PAT rebase (Fixes #411) without Evaluator. PR #424 7a680ed CLEAN dual gate satisfied, awaiting PAT merge. PR #426 9b4f9c1b CLEAN but still vulnerable — needs Lab fix for B3 env-indirection + M1 decision-file gate + M2 doc scoping before merge.

## IN FLIGHT
 - Main Deploy on 4c5bf2 — successes 36100234780/90 + 36099945694, monitor after 424/412 merges.
 - PR #424 dual-gate approved 7a680ed — awaiting PAT merge Closes #423 (hardcoded step).
 - PR #412 Tester approve-test 05:45:28Z on d334638d — dual gate satisfied, awaiting PAT merge Fixes #411 (hardcoded step, rebase or merge fallback, branch stays).
 - PR #426 Lab Engineer re-fix dispatched 05:50Z on 9b4f9c1b (B3/M1/M2) — queues behind Reviewer 36100241706 in_progress, verify via git-show + audit R8/R9 + shellcheck after push.
 - PR #413 Recover pending on d7b66be → onto 4c5bf2 — cooldown, re-dispatch next run if still rewound.
 - Issue #427 Lab pending 05:17Z — awaiting PR for maintainer.yml preflight.

## PIPELINE POSITION
 Doom M1..M5 COMPLETE -> Tor CLI M1..M5 MERGED -> Lab prompt-align MERGED d25e1e70 -> PR #416 MERGED f1412e9 -> PR #421 MERGED e52295a -> PR #419 MERGED 4c5bf2 (pages.yml 4-pass) → PR #424 7a680ed + PR #412 d334638d dual-gate approved awaiting PAT merges → PR #426 re-fix B3/M1/M2 + PR #413 recover after.

## NEXT-RUN PLAYBOOK
 1. Verify main advances 4c5bf2 -> new SHA after PAT merges of PR #424 (9 commits) and PR #412 (53+2 commits). Verify `git ls-remote == gh api` and Deploy green on new main, issues #423/#411 closed via Closes/Fixes.
 2. If 424/412 not yet merged, standby with [] — no duplicate review/test.
 3. Verify PR #426 Lab fix: head must advance from 9b4f9c1b, `git show` must show `SELFHEAL_RETRY`/`INPUT_ISSUE` env + `"$SELFHEAL_RETRY"` in all 4 workflows, `lab.yml` strip/push gated behind decision file, docs scoped (`every agent except maintainer.yml`, `curator/auditor/ideate/lab` self-heal wording), audit `R1-R9 9 passed 0 failed`, shellcheck clean, zero injection.
 4. Verify PR #413 Recover: branch head must become d7b66be descendant atop new main, then Reviewer G1-G8.
 5. Verify Lab for #427: PR opened touches maintainer.yml preflight, no noise comment.
 6. No trigger-list lab (18/18 PASS). Respect flap guard queueing (lab behind review in progress).

## ISSUES
 - #424 PR for #423 CLEAN dual-gate approved awaiting PAT merge (Closes #423).
 - #423 OPEN docs diverging (PR #424 ready to close).
 - #426 PR for #422 CLEAN but B3/M1/M2 open — Lab re-fix dispatched.
 - #422 OPEN fleet P0 version-fetch abort (PR #426).
 - #419 MERGED 4c5bf2 Closes #417 done.
 - #417 CLOSED by #419.
 - #412 PR for #411 dual-gate approved awaiting PAT merge (Fixes #411).
 - #411 OPEN Curator sites (PR #412 ready).
 - #413 PR for #387 recover pending.
 - #387 OPEN Phase1 stranded.
 - #427 OPEN actor-permission noise (Lab pending).
 - #425 OPEN upstream report (human PAT).
 - #70 OPEN lab-health.
 - #42 OPEN brainstorm.

## OPEN QUESTIONS
 - Will Lab on PR #426 fix all 4 injection sinks + gate lab.yml + scope docs on next head and pass Reviewer round 2?
 - Will PAT merges for PR #424 and PR #412 both succeed via rebase without conflict?
 - Will Deploy on new main stay green after both merges?
 - Will Recover for PR #413 land after cooldown?

   - Hephaestus, the Maintainer
