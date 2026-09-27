# STATE - Random factory checkpoint
 - **Updated: 2026-09-27T17:05Z (maintainer run 36335214330, self-triage on bot-created #463 - architect dispatched, #450 closed on proven acceptance)**

## PRs & Issues
 - **PRs:** Zero open PRs. Main `9f45cf91` LIVE (curate merge Fixes #461; prior Deploy workflow_dispatch success covers the tip).
 - **Issues:** #463 Hearthlight Reimagined (follow-up to #449, bot-created 16:57Z run) OPEN - Architect dispatched this run. #450 stall-hardening CLOSED this run (acceptance proven: this very run IS the self-triage proof). #449 short-film epic CLOSED (owner follow-up verdict answered via #463). Standing boards open: #70 lab-health, #42 brainstorm.
 - **Boards:** #70 lab-health, #42 brainstorm standing. Trigger-list standing 18/18 PASS (re-verified this run against maintainer.yml: allowlist 18 incl. opencode-recover; 19 live `name:` fields incl. self).

## IN FLIGHT
 - #463 Hearthlight Reimagined: Architect dispatched (`/oc architect` via decision.json) - expect Phase Epic roadmap in `progress/` with semantic phase names, then Phase 1 build chain after review. Multi-component rebuild, never direct to Builder.
 - Post-merge Deploy verification for main tip 9f45cf91: DONE (Deploy success 16:43:29Z, confirmed prior runs).
 - Owner branch `opencode/issue436-gui-detach-and-syswide-fixes` (no new signal, no PR vehicle): tor-cli CI branch-scoped. No dispatch - owner session active, no vehicle, main unaffected.

## NEXT-RUN PLAYBOOK
1. If the Architect's Phase Epic PR opens for #463: route `review` on its head (dedupe against existing `/oc review (head ...)` comments); enforce `Refs #463` trailer (intermediate phases never close the parent).
2. After review approval on the epic PR: merge only on double gate (approve + approve-test + approve-eval); then chain Phase 1 build immediately, never idle.
3. If a PR opens from `opencode/issue436-gui-detach-and-syswide-fixes`: route `review` (or `fix` if findings land); Windows Setsid break plus committed binary plus macOS exit-code regression must be resolved before merge.
4. If the branch keeps advancing with no PR and CI stays red: evaluate only, never seize owner work; ping only on the eventual PR/issue, never on closed #436 uninvited.
5. On any new issue/comment/push or workflow_run failure: triage per charter (correlate, cooldown 30m, route review/test/eval/fix/lab/recover/auditor/curate as demanded).
6. Trigger-list re-verify each run.
7. Standing rule unchanged: NEVER assume an `issues: opened` run follows a `create_issue` decision; UNTRIAGED sweep every run (the R13 self-dispatch is proven but defense in depth stays).

## OPEN QUESTIONS
 - Will the Architect's Phase Epic for #463 land with semantic phase names, and will Phase 1 chain cleanly?
 - Can the rebuild meet the higher craft bar (story legibility, human characters, hand-drawn feel) the owner set after #449?
 - What caused the 08:34-11:26Z schedule silence (GitHub cron flake vs misconfig)?
 - Will the Owner open a PR from the `gui-detach-and-syswide-fixes` branch, or land it another way?
 - Probe source of the 2026-09-25 PWNED selfheal payloads (red-team test vs unknown actor) - Auditor flagged for owner-level awareness; no code change needed.

 - Hephaestus, the Maintainer