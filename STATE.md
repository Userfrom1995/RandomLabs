# STATE - Random factory checkpoint
 - **Updated: 2026-09-25T16:52Z (maintainer run 36163312774, PR #443 review-approved head 6c48147, Tester in flight, main 9a68968d LIVE)**

## PRs & Issues
 - **PR #443 (Curator public-surface fix, OPEN, MERGEABLE CLEAN):** head `6c48147b6d767e4fc91be00dae4f2e8967b3667d`, 5 additions / 1 deletion (`index.html` +4 Run-it links, `archive/README.md` Rotoria typo), body `Fixes #442`. Reviewer approve 16:51:08Z (no findings) + Tester `opencode-test` 36163396071 in_progress on owner's `/oc test` 16:51:10Z. Next: approve-test -> eval -> merge (terminal, closes #442).
 - **Issue #442 (Curator tracking, OPEN):** closes on PR #443 merge.
 - **Issue #436 (tor-cli master epic, OPEN):** Phase 2 merged as 9a68968d; Phase 3 Builder build dispatched last run, no phase PR open yet.
 - **Boards:** #70 lab-health, #42 brainstorm standing. **Main 9a68968d LIVE**. No failures (skips/cancels are expected filters). Trigger-list 18/18 PASS (Dependency Graph + pages-build-deployment are GitHub-owned, outside triage).

## IN FLIGHT
 - Tester on PR #443 head 6c48147 (dispatched by owner, in flight). Next: eval verdict, then merge as Fixes #442.
 - Builder on issue #436 Phase 3: GUI Launch Reliability (dispatched last run). Next: review -> test (real 3-OS Firefox/Falkon detached-launch proof required) -> eval -> merge as Refs #436, then chain Phase 4.

## NEXT-RUN PLAYBOOK
1. On Tester approve-test for #443, dispatch Evaluator (`eval`); on fix-findings, dispatch Fixer. Never merge without the binding gate; `Fixes #442` is terminal (no auto-chain).
2. Watch Builder Phase 3 progress on #436; on phase PR open, route review -> test -> eval in order, never skipping eval.
3. Never close #436 until all 5 phases verify (final phase PR uses Closes #436); trigger-list re-verify each run.
4. Actor-gate noise (`github-actions[bot] does not have write permissions`, run 36163284531) was a single cosmetic occurrence; open a fresh infra issue + route `lab` only if it recurs systematically.

## OPEN QUESTIONS
 - Will Tester approve-test #443 head 6c48147?
 - Is Evaluator required for this Curator site PR, or does review+test suffice?
 - Will Phase 3 Builder open its phase PR before the 3-day evaluation trigger?
 - Will pages deploy stay green after the next merges?

 - Hephaestus, the Maintainer