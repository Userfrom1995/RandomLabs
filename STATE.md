# STATE - Random factory checkpoint
 - **Updated: 2026-09-27T17:25Z (maintainer run 36336758205, owner /oc review + /oc maintainer on PR #464 - standby, fixer landed, fresh review in flight)**

## PRs & Issues
 - **PRs:** #464 OPEN (Hearthlight rebuild Phase 1, head 56e9ca16761563275e70b90967a54860527b76fb, branch `opencode/issue463-20260927170115`, 20 files, body Refs #463, mergeable MERGEABLE / CLEAN, base 9f45cf91 = main tip, direct child) - Fresh Reviewer run 36336758336 pending (owner /oc review 17:23:20Z). Zero other open PRs. Main `9f45cf91` LIVE.
 - **Issues:** #463 Hearthlight Reimagined OPEN (Phase 1 built on #464, fixer landed, awaiting fresh review gate). Standing boards open: #70 lab-health, #42 brainstorm.
 - **Boards:** #70 lab-health, #42 brainstorm standing. Trigger-list standing 18/18 PASS (re-verified this run: allowlist 18 excl. self vs 19 live workflow names incl. self).

## IN FLIGHT
 - #464 Phase 1 review: opencode-review run 36336758336 pending (17:23:2x batch on head 56e9ca16) - expect approve or findings. Prior approve (1a57a9e9) stale; Tester blocking SyntaxError finding + Fixer re-quote landed in between.
 - Post-merge Deploy verification for main tip 9f45cf91: DONE (prior runs).
 - Owner branch `opencode/issue436-gui-detach-and-syswide-fixes` (no new signal, no PR vehicle): tor-cli CI branch-scoped. No dispatch - evaluation only, main unaffected.

## NEXT-RUN PLAYBOOK
1. If the Reviewer approves #464 on 56e9ca16: route `test` (Tester), then Evaluator `eval` on approve-test; merge only on triple gate (approve + approve-test + approve-eval) as Refs #463, then chain Phase 2 immediately, never idle.
2. If the Reviewer returns findings on #464: route `fix` on the PR (non-infra diff, fix/continue allowed).
3. If the branch advances again before verdict: judge stale-verdict (fresh review on latest head before merge).
4. If a PR opens from `opencode/issue436-gui-detach-and-syswide-fixes`: route `review` (or `fix` if findings land).
5. On any new issue/comment/push or workflow_run failure: triage per charter (correlate, cooldown 30m, route review/test/eval/fix/lab/recover/auditor/curate as demanded).
6. Trigger-list re-verify each run.
7. Standing rule unchanged: UNTRIAGED sweep every run.

## OPEN QUESTIONS
 - Will the Reviewer approve Phase 1 on 56e9ca16 or return findings, and will test plus eval pass?
 - Can the rebuild meet the higher craft bar (story legibility, human characters, hand-drawn feel) the owner set after #449?
 - What caused the 08:34-11:26Z schedule silence (GitHub cron flake vs misconfig)?
 - Will the Owner open a PR from the `gui-detach-and-syswide-fixes` branch, or land it another way?
 - Probe source of the 2026-09-25 PWNED selfheal payloads (red-team test vs unknown actor) - Auditor flagged for owner-level awareness; no code change needed.

 - Hephaestus, the Maintainer
