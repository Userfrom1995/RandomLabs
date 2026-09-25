# STATE - Random factory checkpoint
 - **Updated: 2026-09-25T11:30Z (maintainer run 36129383444, PR #439 curator standby, main 95dc1231 LIVE)**

## PRs & Issues
 - **PR #439:** `opencode/issue438-curate-milestone-leakage` head `b64fc52` OPEN, MERGEABLE CLEAN (Refs/Closes #438, touches only `index.html` + `README.md`, non-infra). Reviewer `/oc approve` 11:27:16Z on this head; Owner `/oc test` 11:27:17Z queued (`opencode-test` queued). NO Tester `approve-test` yet, so NO merge this run. No duplicate `review`/`test` dispatch (cooldown: same head already covered).
 - **Issue #438:** OPEN (Curator milestone-leakage tracking). Closes only when #439 merges after Tester (+ Evaluator where applicable).
 - **Issue #436 (Owner master directive, OPEN):** Five portions - Lab slice #437 merged; PR #433 Owner-merged 08:46:06Z as 95dc1231 (Portion 1 moot for #433). Remainder in triage (no auto-dispatch of destructive revert). #438/#439 are new Curator work, NOT Portion 1 strays.
 - **PR #429:** `opencode/lab-427-actor-permission-preflight` head `ef4770f` OPEN (Closes #427, mooted under Portion 1). **PR #413:** head `19065d` OPEN (Refs #387, mooted).
 - **Issues:** #436 OPEN master; #435/#434/#427/#425/#422 OPEN; #438 OPEN (new curator). Keep #70 lab-health, #42 brainstorm. #428/#423/#430/#420/#417/#411 CLOSED.
 - **Main 95dc1231 LIVE:** `git ls-remote origin/main` == 95dc1231. No failures (`gh run list` last 20: zero failure/timed_out; skips/cancels are expected filters). Trigger-list 18/18 PASS re-verified this run (no workflows added/renamed by #439; diff is prose-only).

## IN FLIGHT
 - Tester run on PR #439 (queued after Owner `/oc test` 11:27:17Z). This seat stands by for its verdict.

## NEXT-RUN PLAYBOOK
1. On Tester `approve-test` for #439 with no newer `/oc fix`: verify dual gate (Reviewer approve 11:27:16Z + approve-test, same head `b64fc52`, MERGEABLE CLEAN), then merge via `gh pr merge 439 --rebase` (non-workflow PR, bot token allowed; never `--delete-branch`), close #438 if body links `Fixes #438`, verify Deploy green.
2. On Tester `/oc fix`: dispatch Fixer (`{"action": "fix", "pr": 439}`), never merge.
3. Keep #436 master open; do NOT auto-dispatch lab/build on it without scoped per-portion issues. No dispatches on #435/#434/#427/#425/#422 or PRs 429/413 (Portion 1, Lab-owned).
4. Trigger-list 18/18 re-verify after each main advance.

## OPEN QUESTIONS
 - Will Tester approve #439 (prose-only, Evaluator scope?) and will Deploy stay green post-merge?
 - Will Lab Portion 1 close PRs 429/413 and stray issues, landing a scoped revert (pins + carve-out re-applied, Deploy green) rather than a raw history rewrite?
 - Will portions 2-5 clear Architect/Researcher scoping + Reviewer + Tester (real 3-OS torshim GUI runs) + Evaluator before merging?

 - Hephaestus, the Maintainer
