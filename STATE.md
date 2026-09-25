# STATE - Random factory checkpoint
 - **Updated: 2026-09-25T00:52Z (maintainer run 36079482457, PR #419 5485477 review pending (two-pass fix landed), PR #412 e3486 REVERTED recover 36079507351 completed=noop, PR #413 d7b66be review pending, main f1412e9 LIVE Deploy green)**
 - **PR #419:** `opencode/lab-417-pages-symlink-boundary` head `54854770092a96c64c08249083c9797360d9daf5` MERGEABLE (2 commits: a3e9be60 + 5485477 two-pass). Reviewer's BLOCKING (in-site dir recursion via docs/up -> ../docs) fixed by Lab 36079046599 success -> Deploy success 36079473239 on PR head, Bash -n clean verified, now awaiting Reviewer verdict on 5485477. Next: on /oc approve -> Tester hostile fixture, on /oc fix -> Lab.
 - **PR #412:** `opencode/issue411-curate-tor-cli-site` remote head `e3486e2694366ab6a28a65b2795bfba896eb7b99` REVERTED vs fetchable `9842ba14e02df19f1887e3910089aeb2466b8662` (13 commits orphaned). Recover 36079507351 completed success but noop (PR still OPEN, so recover script says already open nothing to recover). Branch needs force-push of 9842ba14 via PAT (Fixer or Lab) before 3 blocking +1 major fix. Cooldown holds.
 - **PR #413:** `opencode/issue387-20260924212038` head `d7b66be` review pending.
 - **Main f1412e9 LIVE:** `git ls-remote == f1412e9`, Deploy green, 18/18 trigger-list PASS, two-knob mimo-v2.6-flash-free free, Lab 36079046599 pages fix landed on PR branch, Lab 36078419561 still in_progress on #70.

## STANDING OWNER DIRECTIVES (active)
 - GUI HANG DIRECTIVE (2026-09-24), CLI IMPROVEMENT DIRECTIVE v2, WEBSITE DIRECTIVE, MODEL SWITCH RESOLVED f1412e9, DOCUMENTATION INVARIANT, TOR CLI DIRECTIVE, EXCELLENCE CHARTER.

## CRITICAL INFRASTRUCTURE STATE
 - Main f1412e9 LIVE verified. pages.yml now has two-pass strip on PR branch 5485477 (boundary + dir-cycle detection). Trigger-list 18/18 PASS.

## IN FLIGHT
 - PR #419 review pending on 5485477 (this run dispatched)
 - PR #412 revert pending manual restore (recover noop)
 - PR #413 review pending

## PIPELINE POSITION
 Doom M1..M5 COMPLETE -> Tor CLI M1..M5 MERGED -> Lab prompt-align MERGED d25e1e70 -> PR #416 MERGED f1412e9 -> PR #419 two-pass fix landed 5485477 awaiting review -> PR #412 revert awaiting restore -> PR #413 pending

## NEXT-RUN PLAYBOOK
 1. Watch Reviewer on PR #419 5485477: on approve -> Tester, on fix -> Lab.
 2. Restore PR #412 head to 9842ba14 (force-push via PAT, then fix 3 blocking+1 major).
 3. Watch Reviewer on PR #413 d7b66be.

## ISSUES
 - #417 OPEN Harden Pages escaping (PR #419)
 - #411 OPEN Curator sites (PR #412 Fixes)
 - #70 OPEN lab-health
 - #42 OPEN brainstorm

## OPEN QUESTIONS
 - Will Reviewer approve 5485477 two-pass boundary (8/11 escaping + 4 ancestor links stripped, tar exit 0, idempotent)?
 - Will PR #412 9842ba14 be restored before next Reviewer evaluates e3486 stale?

   - Hephaestus, the Maintainer
