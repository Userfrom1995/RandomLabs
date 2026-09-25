# STATE - Random factory checkpoint
 - **Updated: 2026-09-25T08:36Z (maintainer run 36113538039, issue_comment on PR #437, main 05bf2d72 LIVE)**

## PRs & Issues
 - **Issue #436 (Owner master directive, OPEN):** Five portions - (1) close strays (keep #70/#42), single-commit revert to `2429c52e8d8a29763e31eaa13271484b8f3837a7`, pins `muse-spark-1.3-contributor-free`; (2) tor-cli research + features + cross-platform; (3) torshim GUI hang fix, real 3-OS testing; (4) per-project website invariant + prompt hardening + audit; (5) tor-cli website via Tester visual + Evaluator. Lab dispatched 08:26Z; Lab delivered prompt-hardening slice as PR #437 (merged 08:34Z as 05bf2d72). Remainder explicitly left for Hephaestus triage by Lab Engineer (Portion 1 destructive, portions 2/3/5 Builder track). Master stays open until all 5 verified.
 - **PR #437:** `opencode/lab-436-torcli-website-test-standard` head `895631f` MERGED 08:34:16Z as `05bf2d72` (Refs #436). Reviewer approve 08:32:15Z, Tester approve-test 08:33:02Z, no later fix findings. Non-orphan (merge-base with main present), MERGEABLE at merge. Branch kept intact per no-delete-branch rule.
 - **PR #433:** `opencode/lab-428-actor-write-gate` head `85b8823` OPEN MERGEABLE (Closes #428). Reviewer approve 08:23:52Z, Tester run 36112697823 - MOOTED, closes under Portion 1.
 - **PR #429:** `opencode/lab-427-actor-permission-preflight` head `ef4770f` OPEN MERGEABLE (Closes #427). Reviewer approve 07:12:05Z + Tester approve-test 07:18:31Z (infra read-only) - MOOTED, closes under Portion 1, will NOT merge despite satisfied gate (Owner overrule recorded in log).
 - **PR #413:** `opencode/issue387-20260924212038` head `19065d` OPEN (Refs #387, stale base) - MOOTED, closes under Portion 1.
 - **Issues:** #436 OPEN master, #435/#434/#428/#427/#425/#422 OPEN - all close as strays under Portion 1 (keep #70 lab-health, #42 brainstorm). #423/#430/#420/#417/#411 CLOSED by earlier merges.
 - **Main 05bf2d72 LIVE:** carve-out verified live at `tester.md:105` via API on ref main; two-knob `muse-spark-1.3-contributor-free` intact (`model` + `small_model`). Deploy on new head NOT yet observed at survey time (latest Deploy runs: PR-branch failure 36113366562 on 895631f at 08:31Z, success 36112820493 on 6dc179c3). Trigger-list 18/18 PASS re-verified this run.

## IN FLIGHT
 - Nothing actively dispatched. Lab slice merged; remainder of #436 awaiting triage decision (no auto-dispatch of destructive revert).

## NEXT-RUN PLAYBOOK
1. Verify Deploy static site to GitHub Pages green on main 05bf2d72 (push event after 08:34:16Z merge). If missing/failed, triage: prose-only md diff cannot break the static build, suspect flakes, re-run via workflow_dispatch if needed.
2. Triage #436 remainder: Portion 1 single-commit revert to 2429c52e is history-destructive (would erase pin commits + 05bf2d72) and Lab declined it unilaterally - needs per-portion sub-issues with explicit scope (pins + carve-out re-applied on top, Deploy green) before any lab dispatch. Do NOT auto-dispatch lab/build on the master issue without that scoping.
3. Investigate PR-branch Deploy failure 36113366562 (pull_request on 895631f, 08:31Z, jobs API empty): if the same failure hits main, treat as P0 infra and dispatch lab.
4. Keep master #436 open until all 5 portions verified. Trigger-list 18/18 re-verify after each main advance.
5. No dispatches on #435/#434/#428/#427/#425/#422 or PRs 433/429/413 (all Portion 1 closures). Standby otherwise.

## OPEN QUESTIONS
 - Will Deploy go green on 05bf2d72, or does the 08:31Z PR-branch Deploy failure foreshadow a main deploy problem?
 - Will Portion 1 proceed as a scoped revert PR (pins + carve-out re-applied, Deploy green) rather than a raw history rewrite?
 - Will portions 2-5 clear Reviewer + Tester (real 3-OS torshim GUI runs) + Evaluator before merging?

 - Hephaestus, the Maintainer
