# STATE - Random factory checkpoint
 - **Updated: 2026-10-02T23:38Z (maintainer run 37078447273, PR #524 MERGED as 37b4c67f, pet-release proof sweep dispatched)**

## PRs & Issues
 - **PRs:** Open: none (0 open at survey after merge). Closed/merged: #524 rpm SOURCES layout repair on #515 (maintainer-merged 23:38:12Z; rebase, branch kept intact; review approve + test approve-test + eval approve-eval 9.9/10, zero /oc fix after approvals, post-review delta test-only; body Refs #515), #523 frozen-bundle entry repair on #515 (maintainer-merged 23:16:36Z as 396a8368, rebase, branch kept intact; review approve + test approve-test + eval approve-eval 9.9/10, zero /oc fix after approvals, post-review delta test-only; body Refs #515), #522 lab SWEEP_ALLOWLIST fix (owner/PAT-path merged 22:42:17Z as 7e3912fe; Refs #515), #521 stale duplicate of #520 (closed unmerged), #520 lab pet-release parity/publish repair (owner-merged 22:23:46Z as 1ea06480; Refs #515), #519 curator sync (maintainer-merged 22:15:00Z as 1c5fd60d, Fixes #518), #517 Desktop Pet second harness repair (maintainer-merged 15:45:19Z as 54161916; Refs #515), #516 Desktop Pet follow-up repair (maintainer-merged 15:09:39Z as dfcf2949; Refs #515 + Refs #504 + Refs #514), #514 release track (owner-merged 14:22:00Z as caf91470; Refs #515).
 - **Issues:** Open: #515 Desktop Pet follow-up (TRIAGED - proof run 37076887677 on 396a8368 went macOS GREEN + Windows GREEN, Linux red ONLY on the rpmbuild SOURCES path mismatch; frozen-entry repair proven in real binaries; rpm repair PR #524 merged as 37b4c67f, proof re-run sweep dispatching on the repaired main), #70 lab-health, #42 brainstorm standing. Closed: #518 curator sync task, #504 Desktop Pet Platform, #507, #498.
 - **Boards:** #70 lab-health, #42 standing. Trigger-list with the standing split, BOTH verified live on main this run: `workflows:` event allowlist (19 entries incl. pet-release vs 20 live `name:` fields minus self maintainer = 19, exact match) is green; SWEEP_ALLOWLIST carries pet-release - both dispatch gates green.
 - **Desktop Pet Platform record:** Phase 1 merged as #505 head 3b55fcf5. Phase 2 merged as #506 head be349195. Phase 3 merged as #509 head efcf9d39. Phase 4 merged as #510 head 8d8dd1b3 (approve-eval 9.9/10). Phase 5 merged as #511 head 0b6f2184 -> main 1a0d1ecb (approve-eval 9.8/10; 523 selftest green). Final Phase merged as #512 -> main b51b5d9e (approve-eval 9.84/10; 546 green). Service-switch fix merged as #513 -> main 9a9cb487 (review approve + Tester approve-test 551 green + Evaluator approve-eval 9.9/10). Release track merged as #514 -> main caf91470. Follow-up repair merged as #516 -> main dfcf2949. Second harness fix merged as #517 -> main 54161916. Frozen-bundle entry repair merged as #523 -> main 396a8368 (review approve + Tester approve-test + Evaluator approve-eval 9.9/10). Proof run 37076887677 on 396a8368: macOS builder SUCCESS + Windows builder SUCCESS, Linux builder FAILURE only at rpmbuild %install (SOURCES path mismatch; PyInstaller bundle + 527 selftest + .deb all green on the same machine). Rpm SOURCES repair merged as #524 -> main 37b4c67f (review approve + Tester approve-test + Evaluator approve-eval 9.9/10); proof re-run sweep dispatching.
 - **Curator 2026-10-02:** schedule successes 04:37Z + 12:04Z, no new issues opened; sync issue #518 and PR #519 merged. Pages green on 396a8368 at survey (pre-merge); deploy watch for 37b4c67f next run.
 - **Published-packages track:** pet-release.yml repaired via #520 as 1ea06480; sweep gate unblocked via #522 as 7e3912fe. Maiden run 37074448281 FAILED on genuine product defects (repaired by #523 as 396a8368). Proof run 37076887677 on 396a8368 went macOS GREEN + Windows GREEN with Linux red ONLY on the rpm defect (repaired by #524 as 37b4c67f). Zero published artifacts. Proof re-run sweep dispatched on repaired main 37b4c67f this run.

## IN FLIGHT
 - pet-release proof re-run sweep on main 37b4c67f dispatching (this run's decision; owner-credential dispatch so completion summons triage). No other worker in flight on #515.
 - Zero open PRs; main tip 37b4c67f.
 - Pages health: green on 396a8368 at survey; deploy watch for 37b4c67f next run (dispatch workflow_dispatch if missing per post-merge rule).
 - Workflow warts logged (not yet lab-routed): (1) opencode.yml verify step counts ALL historical `/oc build this (auto-retry N)` comments, so 3 stale retries from 14:xx blocked fresh retries for the 22:51:59Z and 22:55Z failures. (2) verify-step branch pattern expects `opencode/issue<N>-*` and false-negatives on `opencode/515-frozen-entry-shim` even though the PR exists. Lab to assess both on second consecutive trigger-step failure per playbook.
 - Carried non-blocking notes for the platform: Reviewer + Tester + Evaluator nit on #523 (desktop-pet.spec header comment still says no datas needed, stale now that the pet/ tree ships as datas); Evaluator nits on #517; Evaluator nits on #516; Evaluator service.py dead load_notice branch nit on #513; Evaluator visual nits on #512; plus earlier #498 lineage items.
 - Owner branch `opencode/issue436-gui-detach-and-syswide-fixes` (d905397) still present, no signal this run; standing evaluation-only item.
 - UNTRIAGED sweep: clear (#515 triaged with proof sweep dispatching; only standing #70 + #42 otherwise).

## NEXT-RUN PLAYBOOK
1. Trigger-list re-verify each run (BOTH allowlists: `workflows:` event list AND `SWEEP_ALLOWLIST` sweep-dispatch list; watch for any new workflow drift).
2. Check pet-release proof-run outcome on main 37b4c67f -> fully green (macOS plus Windows plus Linux rpm) with per-OS smoke plus publish verification means close #515 (clean release plus recorded Windows PASS plus recorded eval approvals); packaging failures route to fix/build (app/harness) or lab (infra) as logs direct.
3. Pages deploy watch for 37b4c67f (dispatch `gh workflow run pages.yml --ref main` if missing per post-merge rule).
4. Standing rule unchanged: standby otherwise (no auto-ideate).

## OPEN QUESTIONS
 - Did the rpm SOURCES repair clear the Linux builder, completing a fully green pet-release run with per-OS smoke + publish?
 - Opencode verify-step warts: (1) should the auto-retry counter be per-attempt-window instead of all-time? (2) should the branch pattern accept `opencode/<issue>-*` alongside `opencode/issue<issue>-*`, or should the builder prompt pin the naming? (Lab assessment pending; routes on second consecutive trigger-step failure.)
 - What shape will the release pipeline take at publish time (tag-triggered vs manual, signing/notarization stance, Releases vs Pages hosting)?
 - What cancelled pre-fix Windows run 37005424980 (owner-cancel, runner preemption, or infra flake)?
 - Will the Owner open a PR from the `gui-detach-and-syswide-fixes` branch, or land it another way?
 - What caused the 08:34-11:26Z schedule silence on 2026-09-29 (GitHub cron flake vs misconfig)?
 - Probe source of the 2026-09-25 PWNED selfheal payloads (red-team test vs unknown actor) - Auditor flagged; no code change needed.

  - Hephaestus, the Maintainer
