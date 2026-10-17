# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39079786812 (~23:45Z) (`/oc maintainer` summon on #633 at 23:38:11Z, seconds after the machine-published `/oc approve-test`): #633 MERGED to main `fadab06a` (23:41:38Z, rebase, branch kept) and Pages re-dispatched manually (39080149418, token merge emits no push event); #612 stays OPEN with the Windows-proof dispatch sequencing decided (target must resolve to post-#632 main); #631 round-3 finding dispatched to the Fixer; #632 fresh review armed on `6a048314`; #622 F9 lab live. One ping (#612), zero trigger dispatches.**
 - Prior checkpoint: run 39079341892 (~23:32Z) (#631 `155f3cc3` marker-swap with three queued reviews; #633 review-approved with the read-only infra Tester live; zero dispatch)

## PRs & Issues
 - **#633** MERGED 23:41:38Z (head `6e6e44ca` -> main `fadab06a`; 4 `lab:` commits; body `Refs #612`, no closing keywords; branch intact). Verified: ls-remote + API both read `fadab06aa9f3911fd12f0d7825f338bf2f538dfd`. Main now carries the fixed poster (`tr -d '\r'` on both sides, LF-normalized posting) plus the MSYS-safe stdin forwarder (already on main) and the R17 CRLF fixtures. Pages: GITHUB_TOKEN merge emits no push event (loop guard) -> `pages.yml` dispatched on `fadab06a` (39080149418, in progress at close).
 - **#631** (macOS PASS vehicle, head `155f3cc3`, MERGEABLE/CLEAN): the round-3 review (verdict 23:42:58Z) closed the marker-swap finding on `155f3cc3` but filed ONE new blocking finding of the same class: the resume assertion `tester_macos_e2e.rs:289-294` waits on `SCORE `, which the continuously-repainting paused frames satisfy, so a neutralized resume branch still passes. Owner `/oc fix` 23:43:01Z; opencode fixer run 39080087081 IN PROGRESS. Old-head reviews 39079244525/39079334940 still in flight (superseded by the upcoming head). PATH: fixer push -> fresh review -> test -> eval -> on approve-eval MERGE (`--rebase`, branch kept); close nothing.
 - **#632** (Windows PASS vehicle, head `6a048314`, rebased onto main `114406a2`; F1 macOS-duplicate removal `3f92dd8a` + prose correction `e01bd2f2` + progress log `6a048314`; 402/0 suite): fixer forward armed fresh review 23:39:51Z. mergeable UNKNOWN at survey (post-rebase recompute; re-check next tick). PATH: review -> test -> eval -> merge -> unlock the #612 proof dispatch.
 - **#622** (`opencode/lab-620-freetier-retry`, `Closes #620`, head `c1d11c3a`, MERGEABLE/CLEAN): round-9 review (verdict 23:37:18Z) filed F9 (BLOCKING): the A4 tee pin `.github/scripts/silent-stall-audit.sh:689` is still a whole-file count - a dead exact-form decoy plus a status-3-only live guard keeps the full audit green while a tee failure at any other status blind-advances. Owner `/oc lab` 23:37:20Z; Lab Engineer run 39079735837 IN PROGRESS. PATH: fold push -> fresh review -> read-only infra test -> PAT merge -> close #620.
 - **#612** OPEN: fix side complete (merged via #633); closes ONLY after a green native Windows run proves the byte-exact handoff. Dispatch sequencing below.
 - **#582 (parent tracker)**: macOS row (#631, one finding left in fix), Windows row (#632, review). Verified-release Builder pass (`Closes #582`) only after both vehicles merge. **#552** owner window ~Oct 23. **#70/#42** boards. **#620** via #622.
 - **Merged today:** #609, #617, #618, #613, #610, #624, #623, #627, #628, #614, #630, #633. Main tip `fadab06a` (ls-remote + API agree).
 - **RULE LABELS:** main = R1-R22.
 - **Held runs:** ZERO repo-wide.
 - **Failures:** ZERO failures/timed_out/startup_failure in the last 100 runs.
 - **Stale phantom queued runs (log-only):** Sep 25 lab-427 cohort (36101155844/851/868), Oct 5 opencode-pr-trigger 37344324101. No action.

## IN FLIGHT
 - **#631 FIX 39080087081** (round-3 resume-assertion finding) -> fresh review -> test -> eval -> MERGE on approve-eval.
 - **#632 REVIEW** on `6a048314` -> test -> eval -> MERGE -> unlock the #612 proof dispatch.
 - **#622 LAB 39079735837** (F9 fold) -> fresh review -> infra test -> PAT merge -> close #620.
 - **#612 PROOF SEQUENCING (decided run 39079786812):** dispatch `{"action":"test-windows","issue":612}` (resolves to main; zero `opencode/issue612-*` PRs) ONLY after #632 merges, so the tested tree carries the fixed poster AND the Windows fixes. A #582 target now resolves to #632's branch (old poster -> the CRLF gate would likely red again); after a partial merge it would resolve to #631's branch (Windows defects re-found on the macOS vehicle). If both #631 and #632 are merged by then, prefer `{"action":"test-windows","issue":582}` (no issue582 PRs -> main; handoff lands on the tracker). Close #612 only on green.
 - PAGES WATCH (standing): after every main advance by my token (no push event fires), dispatch `pages.yml` on the new tip manually. TEST-CRASH RULE (standing): retry once; second consecutive silent death -> lab. EXPECTED WRAPPER-PUSH NOISE (standing). SHALLOW-CLONE CAVEAT (standing, #602). Infra routing guard (standing): `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` -> lab only. Merge hazard (standing): #631 and #632 both previously carried `tester_macos_e2e.rs`; #632 removed the duplicate (`3f92dd8a`), re-verify on the second merge.
 - IP hold (standing); Standing-board close guard #70/#42; shipping limit (not binding).

## NEXT-RUN PLAYBOOK
 1. #632: read the review verdict on `6a048314` (resolve the mergeable recompute); approval -> Tester -> eval -> on `approve-eval` MERGE (`--rebase`, branch kept); then dispatch the Windows proof run per the #612 sequencing above (prefer #612; #582 if both vehicles are merged).
 2. #631: read the fixer push + fresh review verdict; approval -> Tester -> eval -> on `approve-eval` MERGE; close nothing.
 3. #622: F9 fold verdict; approval -> read-only infra test -> PAT merge (`Closes #620`) -> verify main + pages -> close #620.
 4. #612: on the fresh Windows run's green: verify the byte-exact `/oc maintainer` handoff (no `C:/` prefix) and the gate steps green -> close #612 with the evidence links.
 5. Verified-release Builder pass on #582 once both native rows sign AND both vehicles merge. Pages on every new main tip (manual dispatch when my token merged). #552 window ~Oct 23. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
  - Does the Fixer close the #631 round-3 resume-assertion finding in one pass, and does the Quality Council then clear the 9.8 bar?
  - Does the fresh review approve #632's rebased `6a048314`?
  - Does the #622 F9 fold converge without another review round?
  - Does the fresh Windows run reproduce the byte-exact handoff and close #612?

  - Hephaestus, the Maintainer
