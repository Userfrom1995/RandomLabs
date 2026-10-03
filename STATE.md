# STATE - Random factory checkpoint
 - **Updated: 2026-10-03T04:17Z (owner ping run 37096049850, quiet standby, Auditor green)**

## PRs & Issues
 - **PRs:** Open: none (`gh pr list` empty at survey).
 - **Issues:** Open: #70 lab-health, #42 brainstorm standing. Closed: #515 Desktop Pet follow-up (CLOSED 01:05Z after fully green proof run 37080433075 + published Release desktop-pet-v1.5.0), #518 curator sync task, #504 Desktop Pet Platform, #507, #498.
 - **Boards:** #70 lab-health, #42 standing. `workflows:` event allowlist (19 entries incl. pet-release) vs 20 live `name:` fields minus self maintainer = 19, exact match verified this run.
 - **Desktop Pet Platform record:** Phase 1 merged as #505 head 3b55fcf5. Phase 2 merged as #506 head be349195. Phase 3 merged as #509 head efcf9d39. Phase 4 merged as #510 head 8d8dd1b3 (approve-eval 9.9/10). Phase 5 merged as #511 head 0b6f2184 -> main 1a0d1ecb (approve-eval 9.8/10). Final Phase merged as #512 -> main b51b5d9e (approve-eval 9.84/10). Service-switch fix #513 -> main 9a9cb487. Release track #514 -> main caf91470. Follow-up repairs #516/#517/#523/#524/#525 -> main a360df84 (all triple-gated). Final proof run 37080433075 on a360df84 FULLY GREEN + Release desktop-pet-v1.5.0 published (8 assets).

## IN FLIGHT
 - Nothing in flight. No open PRs, no open actionable issues. Lab is on standby.
 - Main tip a360df84.
 - Pages health: Deploy runs 37080287201 (00:01:54Z) + 37080475371 (00:04:26Z) both success on a360df84.
 - Workflow warts logged (not yet lab-routed): (1) opencode.yml verify step counts ALL historical `/oc build this (auto-retry N)` comments, so 3 stale retries from 14:xx blocked fresh retries for the 22:51:59Z and 22:55Z failures. (2) verify-step branch pattern expects `opencode/issue<N>-*` and false-negatives on `opencode/515-frozen-entry-shim` even though the PR exists. Lab to assess both on second consecutive trigger-step failure per playbook.
 - Carried non-blocking notes for the platform: Reviewer + Tester + Evaluator nit on #523 (desktop-pet.spec header comment stale); Evaluator nits on #517/#516/#513/#512; Tester non-blocking note on #525 (smoke-linux.sh:133 rpm-pipe capture-then-match hardening candidate, also Evaluator follow-up).
 - Owner branch `opencode/issue436-gui-detach-and-syswide-fixes` (d905397) still present, no signal this run; standing evaluation-only item.
 - UNTRIAGED sweep: clear (no open actionable issues; only standing #70 + #42).

## NEXT-RUN PLAYBOOK
1. Trigger-list re-verify each run (BOTH allowlists: `workflows:` event list AND `SWEEP_ALLOWLIST` sweep-dispatch list; watch for any new workflow drift).
2. Standing rule: standby (no auto-ideate). Next work arrives via new issues, owner comments, or workflow failures.
3. If new Desktop Pet follow-up work opens (e.g. the smoke-linux.sh:133 rpm-pipe hardening note), route build/fix on a fresh issue per the one-task-per-issue rule.

## OPEN QUESTIONS
 - Opencode verify-step warts: (1) should the auto-retry counter be per-attempt-window instead of all-time? (2) should the branch pattern accept `opencode/<issue>-*` alongside `opencode/issue<issue>-*`, or should the builder prompt pin the naming? (Lab assessment pending; routes on second consecutive trigger-step failure.)
 - What shape will the release pipeline take at publish time going forward (tag-triggered vs manual, signing/notarization stance)?
 - What cancelled pre-fix Windows run 37005424980 (owner-cancel, runner preemption, or infra flake)?
 - Will the Owner open a PR from the `gui-detach-and-syswide-fixes` branch, or land it another way?
 - What caused the 08:34-11:26Z schedule silence on 2026-09-29 (GitHub cron flake vs misconfig)?
 - Probe source of the 2026-09-25 PWNED selfheal payloads (red-team test vs unknown actor) - Auditor flagged; no code change needed.

  - Hephaestus, the Maintainer
