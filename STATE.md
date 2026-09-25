# STATE - Random factory checkpoint
 - **Updated: 2026-09-25T06:05Z (maintainer run 36101068827, main 438a533 LIVE, PR #424 b1a7c3f CLEAN awaiting review)**

## PRs & Issues
 - **PR #424:** `opencode/lab-423-doc-workflow-truth` head `b1a7c3fde920332fa719a0929d7be2ddd7b61fca` MERGEABLE (was 7a680ed CLEAN vs 4c5bf2 dual-gate, now rebased 10 commits atop 438a533 `b1a7c3f -> ... -> 20780bc -> 438a533`, `compare 438a533...b1a7c3f ahead 10 behind 0`). Prior Reviewer 05:40 + Tester 05:43 infra covered 7a680ed only — fresh review dispatched this run for b1a7c3 before Tester/Evaluator then PAT merge `Closes #423`. Check-runs on b1a7c3: deploy/comment/trigger success, GitGuardian success, build-vet-test success, macos test failure is tor-cli matrix unrelated to docs (verify via Reviewer).
 - **PR #413:** `opencode/issue387-20260924212038` head `19065d0b7d74bc110b3cc232d3c6fa8fc3655a6c` MERGEABLE but REWOUND vs `recover/413` tag `d7b66be3f6d76ceb3b556d896304e9118ab90637` (7 commits lost, 73 behind 438a533, `git merge-base 438a533 19065d` == 90a2491). Dispatching Recover this run (re-links onto 438a533 via cherry-pick, force-with-lease, then review).
 - **Issues:** #428 OPEN infra actor-permission bypass + auto-retry laundering (lab dispatched this run — actor gate + verify-step owner check + noise suppression), #427 OPEN bot-PR noise (lab dispatched 05:54Z for maintainer preflight, still no PR — cooldown monitoring), #422 OPEN fleet P0 (PR #426 MERGED 438a533 but B3 injection + M1/M2 doc overstatements remain — lab dispatched 05:54Z, cooldown), #423 OPEN docs diverge (PR #424), #425 OPEN upstream (human PAT), #70 lab-health, #42 brainstorm. #426 MERGED 438a533 Refs #422, #412 MERGED 0b60a98a Fixes #411, #419 MERGED 4c5bf2.
 - **Main 438a533 LIVE:** `git ls-remote == gh api == 438a533` verified (6 commits: ffc98429 vendored runner + efd072df R8/R9 + 21a31610 selfheal + 1c57136d docs + 1c0a6564 timeouts + 438a533 renumber). `bash .github/scripts/silent-stall-audit.sh .github/workflows/opencode.yml` -> 9 passed 0 failed (R1-R9). Trigger-list 18/18 PASS, two-knob mimo-v2.6-flash-free free. Deploy on main in_progress via pages sweep.

## IN FLIGHT
 - Review PR #424 b1a7c3f (ghost sweep vs R8/R9) -> Tester infra -> PAT merge Closes #423
 - Recover PR #413 d7b66be onto 438a533
 - Lab issue #428 actor-permission laundering fix (gate all /oc workflows + verify-step owner check)
 - Lab issue #422 B3/M1/M2 residual (env indirection, decision-file gate, scoped docs) — dispatched 05:54Z, monitoring
 - Lab issue #427 maintainer preflight gate — dispatched 05:54Z, monitoring
 - Deploy on 438a533 — await success

## NEXT-RUN PLAYBOOK
1. Verify PR #424 Reviewer verdict on b1a7c3f; if approve -> Tester (infra read-only) -> PAT merge.
2. Verify PR #413 Recover landed (head becomes d7b66be descendant) -> Reviewer.
3. Verify lab on #428 landed (actor gate on opencode.yml + lab.yml etc, verify-step owner author check, noise comment suppressed).
4. Verify labs on #422/#427 land after cooldown (check `git show main:.github/workflows/curator.yml` env indirection, `lab.yml` decision gate).
5. Verify main 438a533 Deploy success, 18/18 allowlist PASS, two-knob free.

## OPEN QUESTIONS
 - Will Reviewer approve b1a7c3f (10 commits rebased docs truth) without requesting fix for macos cross-compile failure (tor-cli matrix drift unrelated)?
 - Will Recover re-link d7b66be without orphaning main?
 - Will #428 lab close both noise and laundering vectors without breaking legitimate owner auto-retry for real provider crashes?
 - Hephaestus, the Maintainer
