# STATE - Random factory checkpoint
 - **Updated: 2026-09-27T17:06Z (maintainer run 36335499749, owner /oc maintainer on PR #464 - review dispatched)**

## PRs & Issues
 - **PRs:** #464 OPEN (Architect blueprint for #463, head fa11c532, 1 commit, 2 files) - Reviewer dispatched this run. Zero other open PRs. Main `9f45cf91` LIVE.
 - **Issues:** #463 Hearthlight Reimagined OPEN (blueprint PR #464 in review; build run pending). #450 CLOSED (acceptance proven, run 36335214330). Standing boards open: #70 lab-health, #42 brainstorm.
 - **Boards:** #70 lab-health, #42 brainstorm standing. Trigger-list standing 18/18 PASS (re-verified this run against maintainer.yml: allowlist 18 incl. opencode-recover; 19 live `name:` fields incl. self).

## IN FLIGHT
 - #464 Hearthlight rebuild blueprint: Reviewer dispatched (`/oc review (head fa11c532)` via decision.json) - expect approve or findings. Body trailer `Closes #463` must become `Refs #463` (intermediate phase, #463 stays open).
 - #463 Phase 1 build: opencode BUILD run 36335499811 pending (owner `/oc build this`) - no duplicate dispatched.
 - Post-merge Deploy verification for main tip 9f45cf91: DONE (Deploy success covers the tip, confirmed prior runs).
 - Owner branch `opencode/issue436-gui-detach-and-syswide-fixes` (no new signal, no PR vehicle): tor-cli CI branch-scoped. No dispatch - owner session active, no vehicle, main unaffected.

## NEXT-RUN PLAYBOOK
1. If the Reviewer approves #464 (as Refs #463): merge only on double gate (approve + approve-test + approve-eval); then chain Phase 1 build immediately, never idle.
2. If the Reviewer returns findings on #464: route `fix` on the PR (non-infra diff, fix/continue allowed).
3. If the pending build run 36335499811 pushes Phase 1 work onto the branch: judge whether a fresh review on the new head is needed before merge (stale-verdict rule).
4. If a PR opens from `opencode/issue436-gui-detach-and-syswide-fixes`: route `review` (or `fix` if findings land); Windows Setsid break plus committed binary plus macOS exit-code regression must be resolved before merge.
5. If the branch keeps advancing with no PR and CI stays red: evaluate only, never seize owner work; ping only on the eventual PR/issue, never on closed #436 uninvited.
6. On any new issue/comment/push or workflow_run failure: triage per charter (correlate, cooldown 30m, route review/test/eval/fix/lab/recover/auditor/curate as demanded).
7. Trigger-list re-verify each run.
8. Standing rule unchanged: NEVER assume an `issues: opened` run follows a `create_issue` decision; UNTRIAGED sweep every run (the R13 self-dispatch is proven but defense in depth stays).

## OPEN QUESTIONS
 - Will the Reviewer approve #464 (as Refs #463) or return findings, and will Phase 1 chain cleanly?
 - Can the rebuild meet the higher craft bar (story legibility, human characters, hand-drawn feel) the owner set after #449?
 - What caused the 08:34-11:26Z schedule silence (GitHub cron flake vs misconfig)?
 - Will the Owner open a PR from the `gui-detach-and-syswide-fixes` branch, or land it another way?
 - Probe source of the 2026-09-25 PWNED selfheal payloads (red-team test vs unknown actor) - Auditor flagged for owner-level awareness; no code change needed.

 - Hephaestus, the Maintainer
