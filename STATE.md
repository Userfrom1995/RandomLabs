# STATE - Random factory checkpoint
 - **Updated: 2026-09-25T08:26Z (maintainer run 36112859058, workflow_dispatch, main 6dc179c3 LIVE)**

## PRs & Issues
 - **Issue #436 (Owner master directive, OPEN):** Five portions - (1) close strays (keep #70/#42), single-commit revert to `2429c52e8d8a29763e31eaa13271484b8f3837a7`, pins `muse-spark-1.3-contributor-free`; (2) tor-cli research + features + cross-platform; (3) torshim GUI hang fix, real 3-OS testing; (4) per-project website invariant + prompt hardening + audit; (5) tor-cli website via Tester visual + Evaluator. Lab dispatched 08:26Z. Master stays open until all 5 verified.
 - **PR #433:** `opencode/lab-428-actor-write-gate` head `85b8823` OPEN MERGEABLE CLEAN vs 6dc179c3 (Closes #428). Reviewer approve 08:23:52Z, Tester in_progress 36112697823 - MOOTED, closes under Portion 1.
 - **PR #429:** `opencode/lab-427-actor-permission-preflight` head `ef4770f` OPEN MERGEABLE CLEAN vs 6dc179c3 (Closes #427). Reviewer approve 07:12:05Z + Tester approve-test 07:18:31Z (infra read-only) - MOOTED, closes under Portion 1, will NOT merge despite satisfied gate (Owner overrule recorded in log).
 - **PR #413:** `opencode/issue387-20260924212038` head `19065d` OPEN (Refs #387, stale base) - MOOTED, closes under Portion 1.
 - **Issues:** #436 OPEN master (Lab dispatched), #435/#434/#428/#427/#425/#422 OPEN - all close as strays under Portion 1 (keep #70 lab-health, #42 brainstorm). #423/#430/#420/#417/#411 CLOSED by earlier merges.
 - **Main 6dc179c3 LIVE:** `git ls-remote == gh api == 6dc179c3` verified, 18/18 allowlist PASS (auditor, Deploy static site to GitHub Pages, Lab Engineer, opencode-review, opencode-pr-trigger, opencode-test, opencode-peros-test, ideate, opencode, opencode-recover, poolduel-m1/m2/m9/m10-soak, postformer-cpu-train, curator, opencode-eval, tor-cli) + maintainer, two-knob `muse-spark-1.3-contributor-free` free (16 workflow pins + 1 MODEL pin + json pair, zero 1.2/2.6 refs). Deploy success 36112820493 on the push. Prior 1.2 `Model not found` crashes (07:19Z/08:12Z/08:21Z) superseded.

## IN FLIGHT
 - Lab on issue #436 (dispatched 08:26Z, run 36112859058) - Portion 1 first, then 2-5 in sequence with fresh gates.

## NEXT-RUN PLAYBOOK
1. Verify Lab run on #436 started (Lab Engineer run appears, no `Model not found` since pins are 1.3-free). If it crashed or never started, re-dispatch `lab` on #436 once (cooldown 30m); at cap escalate per emergency contract only if production halted.
2. Verify Portion 1: stray PRs/issues closed, revert PR to 2429c52e open with 1.3 pins re-applied, Deploy green. Reviewer + Tester + Evaluator gates apply to the revert and all later merges.
3. Keep master #436 open until all 5 portions verified. Trigger-list 18/18 re-verify after each main advance.
4. No dispatches on #435/#434/#428/#427/#425/#422 or PRs 433/429/413 (all Portion 1 closures). Standby otherwise.

## OPEN QUESTIONS
 - Will Lab Portion 1 land the revert with pins re-applied and Deploy green?
 - Will any stale 1.2 references resurface in the reverted tree (Lab must grep)?
 - Will portions 2-5 clear Reviewer + Tester (real 3-OS GUI runs) + Evaluator before merging?

 - Hephaestus, the Maintainer
