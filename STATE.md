# STATE - Random factory checkpoint
 - **Updated: 2026-09-25T02:00Z (maintainer run 36083964033 schedule, main f1412e9 LIVE Deploy green 01:12:06Z, PR #421 12112fc Lab in_progress 01:54:04Z, PR #419 5485477 Lab in_progress 01:49:57Z, PR #412 24726b review pending 01:11:49Z, PR #413 19065d review pending 00:48:55Z, 18/18 PASS, two-knob mimo-v2.6-flash-free free)**
 - **PR #421:** `opencode/lab-70-review-restore-guard` head `12112fc437855b87df6e4b3a846aff92c2690b6d` MERGEABLE CLEAN (3 commits, Closes #420 Refs #70). Reviewer completed fix verdict at 01:54Z (run 36080664766): 2 blocking - (1) residual rewind via `git pull --ff-only`/`reset --hard` fast-forwarding local ref onto external commit (repro `c757671` → `8e4f86e` revert, `LAB.md:448-450` invariant false), (2) PAT-bearing script injection via `branch="${{ steps.pr-info.outputs.head_ref }}"` in `env: GH_TOKEN=OPENCODE_PAT` step (plus 4 siblings in `opencode-peros-test.yml:98,193,291` and `opencode-test.yml:149`). Lab Engineer dispatched via Owner `/oc lab` at 01:54:04Z - **in_progress** (pre-push hook marker in `RUNNER_TEMP`, env-lift BRANCH/RECORDED/CHECKOUT_OID/REPO, R7 tighten to require marker+lease+no bare force, LAB.md reword). Next: lab lands fix → re-review on 12112fc+N, then merge via PAT (infra).
 - **PR #419:** `opencode/lab-417-pages-symlink-boundary` head `54854770092a96c64c08249083c9797360d9daf5` MERGEABLE CLEAN (Closes #417, 2 commits). Two-pass escaping symlink strip: Reviewer blocking at 00:51:51Z (in-site directory `docs/up -> ../docs` + `preview/pr-N/docs/root -> .` + cross-cycle `a/d1 <-> b/d2` survive `"$site_root"/*` keep and make `tar --dereference --hard-dereference` SIGSEGV 139 / timeout). Lab dispatched at 01:49:57Z - **in_progress** (pass1 boundary strip + pass2 dir-cycle detection via `ep/et` frontier walks, idempotent). Next: lab success → re-review → hostile-fixture Tester.
 - **PR #412:** `opencode/issue411-curate-tor-cli-site` head `24726b6c4eab57e74417767ac3d1f8a4aaa73068` MERGEABLE CLEAN (Fixes #411). Restored `9842ba14` (13 fixer) + 5 round-four commits rebased onto `f1412e9`, remote == local verified. Deploy success 01:10:23Z on `24726b6`. Reviews pending `01:11:49Z` in_progress + `01:11:58Z` pending (fresh verdict on restored head). Next: on approve → Tester/Evaluator, on fix → Fixer (no workflows touch).
 - **PR #413:** `opencode/issue387-20260924212038` head `19065d0b7d74bc110b3cc232d3c6fa8fc3655a6c` MERGEABLE CLEAN (Refs #387 Phase 1: Diagnostics and Honesty Surface). Reviews pending `00:48:55Z` in_progress + `00:56:50Z` pending. Note: `issue #387` now CLOSED per `gh issue view 387 --json state` (Tor CLI epic closed after M5 merges), PR remains Refs #387 - awaiting Reviewer guidance on whether to retarget or close. Next: Reviewer verdict → Fixer/Tester.
 - **Main f1412e9 LIVE:** `git ls-remote == f1412e9`, Deploy green 01:12:06Z (plus 01:10:23Z on #412, 01:07:55Z on #421), 18/18 trigger-list PASS (workflows: auditor, Deploy, Lab Engineer, opencode-review, opencode-pr-trigger, opencode-test, opencode-peros-test, ideate, opencode, opencode-recover, poolduel-m1/m2/m9/m10-soak, postformer-cpu-train, curator, opencode-eval, tor-cli), two-knob `mimo-v2.6-flash-free`/`mimo-v2.6-flash-free` free, no silent stall.

## STANDING OWNER DIRECTIVES (active)
 - GUI HANG DIRECTIVE (2026-09-24), CLI IMPROVEMENT DIRECTIVE v2, WEBSITE DIRECTIVE, MODEL SWITCH to mimo-v2.6-flash-free free f1412e9, DOCUMENTATION INVARIANT, TOR CLI DIRECTIVE, EXCELLENCE CHARTER.

## CRITICAL INFRASTRUCTURE STATE
 - Main f1412e9 LIVE verified. opencode-review.yml hardening has 2 residual blockers (R7 + injection) now under Lab repair 01:54:04Z; pages.yml hardening under Lab repair 01:49:57Z. Trigger-list 18/18 PASS. PR #412 restore verified. Issue #387 CLOSED (unexpected vs STATE) - needs triage after reviews.

## IN FLIGHT
 - PR #421 Lab in_progress 12112fc (Reviewer fix 01:54Z, owner lab queued)
 - PR #419 Lab in_progress 5485477 (Reviewer fix 00:51:51Z)
 - PR #412 review pending/in_progress 24726b (restored, awaiting verdict)
 - PR #413 review pending/in_progress 19065d (Refs #387 but issue closed)

## PIPELINE POSITION
 Doom M1..M5 COMPLETE -> Tor CLI M1..M5 MERGED -> Lab prompt-align MERGED d25e1e70 -> PR #416 MERGED f1412e9 -> PR #412 curate restored 24726b + PR #413 Phase1 + PR #419 two-pass + PR #421 restore-guard (both Lab repairs) all in flight, issue #387 closed

## NEXT-RUN PLAYBOOK
 1. Watch Lab Engineer on #421 12112fc and #419 5485477 - on success verify head == N+1, re-dispatch Reviewer (`review` with new head). No duplicate lab while in_progress (30m cooldown).
 2. Watch Reviewer on #412 24726b and #413 19065d - on approve → Tester/Evaluator or PAT merge; on fix → Fixer (412/413) with `lab` only if workflow-touching.
 3. Triage issue #387 CLOSED vs PR #413 Refs #387: if Reviewer closes or retargets, follow; do not reopen without cause.
 4. No trigger-list lab (18/18 PASS), no model switch (mimo-v2.6-flash-free free healthy).

## ISSUES
 - #420 OPEN opencode-review restore rewind (PR #421 Closes, Lab repair in_progress)
 - #417 OPEN Pages escaping symlink (PR #419 Closes, Lab repair in_progress)
 - #411 OPEN Curator sites (PR #412 Fixes, review pending)
 - #387 CLOSED Tor CLI epic (PR #413 Refs but issue closed - pending Reviewer disposition)
 - #70 OPEN lab-health
 - #42 OPEN brainstorm

## OPEN QUESTIONS
 - Will Lab fix on #421 pass R7 + injection checks (marker in RUNNER_TEMP, env-lift, lease, bare-force regex, LAB.md reword, sibling workflow fixes)?
 - Will Lab two-pass on #419 eliminate SIGSEGV cycle without regressing valid in-site links?
 - Will Reviewer approve restored #412 24726b round-four and #413 Phase1?
 - Why was #387 closed while Phase 1 PR #413 still open Refs #387 - is epic complete or did close race the Phase Epic?

   - Hephaestus, the Maintainer
