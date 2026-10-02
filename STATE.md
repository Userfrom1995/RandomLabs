# STATE - Random factory checkpoint
 - **Updated: 2026-10-02T23:35Z (maintainer run 37078295992, PR #524 eval already in flight on head 31d3d3e1, STAND DOWN)**

## PRs & Issues
 - **PRs:** Open: #524 rpm SOURCES layout repair on #515 (head 31d3d3e1 after Tester test-only push, branch `opencode/issue515-20261002232350`, body Refs #515, 4 files; review approve 23:28:46Z + test approve-test 23:33:29Z, zero /oc fix after approvals, eval run 37078295972 pending - dispatched by owner /oc eval 23:34:58Z plus prior maintainer dispatch 23:34:51Z). Closed/merged: #523 frozen-bundle entry repair on #515 (maintainer-merged 23:16:36Z as 396a8368, rebase, branch kept intact; review approve + test approve-test + eval approve-eval 9.9/10, zero /oc fix after approvals, post-review delta test-only; body Refs #515), #522 lab SWEEP_ALLOWLIST fix (owner/PAT-path merged 22:42:17Z as 7e3912fe; Refs #515), #521 stale duplicate of #520 (closed unmerged), #520 lab pet-release parity/publish repair (owner-merged 22:23:46Z as 1ea06480; Refs #515), #519 curator sync (maintainer-merged 22:15:00Z as 1c5fd60d, Fixes #518), #517 Desktop Pet second harness repair (maintainer-merged 15:45:19Z as 54161916; Refs #515), #516 Desktop Pet follow-up repair (maintainer-merged 15:09:39Z as dfcf2949; Refs #515 + Refs #504 + Refs #514), #514 release track (owner-merged 14:22:00Z as caf91470; Refs #515).
 - **Issues:** Open: #515 Desktop Pet follow-up (TRIAGED - proof run 37076887677 on 396a8368 went macOS GREEN + Windows GREEN, Linux red ONLY on the rpmbuild SOURCES path mismatch; frozen-entry repair proven in real binaries; rpm repair PR #524 open awaiting Evaluator verdict), #70 lab-health, #42 brainstorm standing. Closed: #518 curator sync task, #504 Desktop Pet Platform, #507, #498.
 - **Boards:** #70 lab-health, #42 standing. Trigger-list with the standing split, BOTH verified live on main 396a8368 this run: `workflows:` event allowlist (19 entries incl. pet-release vs 20 live `name:` fields minus self maintainer = 19, exact match) is green; SWEEP_ALLOWLIST carries pet-release - both dispatch gates green, the proof-run failure is product-side (rpm script), not dispatch-side.
 - **Desktop Pet Platform record:** Phase 1 merged as #505 head 3b55fcf5. Phase 2 merged as #506 head be349195. Phase 3 merged as #509 head efcf9d39. Phase 4 merged as #510 head 8d8dd1b3 (approve-eval 9.9/10). Phase 5 merged as #511 head 0b6f2184 -> main 1a0d1ecb (approve-eval 9.8/10; 523 selftest green). Final Phase merged as #512 -> main b51b5d9e (approve-eval 9.84/10; 546 green). Service-switch fix merged as #513 -> main 9a9cb487 (review approve + Tester approve-test 551 green + Evaluator approve-eval 9.9/10). Release track merged as #514 -> main caf91470. Follow-up repair merged as #516 -> main dfcf2949. Second harness fix merged as #517 -> main 54161916. Frozen-bundle entry repair merged as #523 -> main 396a8368 (review approve + Tester approve-test + Evaluator approve-eval 9.9/10). Proof run 37076887677 on 396a8368: macOS builder SUCCESS + Windows builder SUCCESS, Linux builder FAILURE only at rpmbuild %install (SOURCES path mismatch; PyInstaller bundle + 527 selftest + .deb all green on the same machine).
 - **Curator 2026-10-02:** schedule successes 04:37Z + 12:04Z, no new issues opened; sync issue #518 and PR #519 merged. Pages green on 396a8368; previews outstanding: #524 (live).
 - **Published-packages track:** pet-release.yml repaired via #520 as 1ea06480; sweep gate unblocked via #522 as 7e3912fe. Maiden run 37074448281 FAILED on genuine product defects (repaired by #523 as 396a8368). Proof run 37076887677 on 396a8368 went macOS GREEN + Windows GREEN with Linux red ONLY on the rpm defect. Zero published artifacts. Rpm repair PR #524 landed 23:26:19Z (flat SOURCES staging + parity regression test); sweep re-runs only after the repair merges.

## IN FLIGHT
 - Evaluator run 37078295972 pending on PR #524 head 31d3d3e1 (owner /oc eval 23:34:58Z plus maintainer eval dispatch 23:34:51Z - same gate, no duplicates). No other worker in flight on #515.
 - One open PR (#524); main tip 396a8368.
 - Pages health: green on 396a8368 at survey; preview live for #524; standing watch continues.
 - Workflow warts logged (not yet lab-routed): (1) opencode.yml verify step counts ALL historical `/oc build this (auto-retry N)` comments, so 3 stale retries from 14:xx blocked fresh retries for the 22:51:59Z and 22:55Z failures. (2) verify-step branch pattern expects `opencode/issue<N>-*` and false-negatives on `opencode/515-frozen-entry-shim` even though the PR exists. Lab to assess both on second consecutive trigger-step failure per playbook.
 - Carried non-blocking notes for the platform: Reviewer + Tester + Evaluator nit on #523 (desktop-pet.spec header comment still says no datas needed, stale now that the pet/ tree ships as datas); Evaluator nits on #517; Evaluator nits on #516; Evaluator service.py dead load_notice branch nit on #513; Evaluator visual nits on #512; plus earlier #498 lineage items.
 - Owner branch `opencode/issue436-gui-detach-and-syswide-fixes` (d905397) still present, no signal this run; standing evaluation-only item.
 - UNTRIAGED sweep: clear (#515 triaged with #524 awaiting eval; only standing #70 + #42 otherwise).

## NEXT-RUN PLAYBOOK
1. Trigger-list re-verify each run (BOTH allowlists: `workflows:` event list AND `SWEEP_ALLOWLIST` sweep-dispatch list; watch for any new workflow drift).
2. Check Evaluator verdict on PR #524 head 31d3d3e1: approve-eval means merge (Refs #515, keep issue open), then re-dispatch the pet-release sweep on main (never re-sweep unrepaired code); quality-failure report routes to fix/architect/lab as directed.
3. Clean release plus recorded Windows PASS plus recorded eval approvals means close #515.
4. Standing rule unchanged: standby otherwise (no auto-ideate).

## OPEN QUESTIONS
 - Evaluator verdict on #524 (rpm SOURCES repair, head 31d3d3e1)?
 - Did the rpm SOURCES repair clear the Linux builder, completing a fully green pet-release run with per-OS smoke + publish?
 - Opencode verify-step warts: (1) should the auto-retry counter be per-attempt-window instead of all-time? (2) should the branch pattern accept `opencode/<issue>-*` alongside `opencode/issue<issue>-*`, or should the builder prompt pin the naming? (Lab assessment pending; routes on second consecutive trigger-step failure.)
 - What shape will the release pipeline take at publish time (tag-triggered vs manual, signing/notarization stance, Releases vs Pages hosting)?
 - What cancelled pre-fix Windows run 37005424980 (owner-cancel, runner preemption, or infra flake)?
 - Will the Owner open a PR from the `gui-detach-and-syswide-fixes` branch, or land it another way?
 - What caused the 08:34-11:26Z schedule silence on 2026-09-29 (GitHub cron flake vs misconfig)?
 - Probe source of the 2026-09-25 PWNED selfheal payloads (red-team test vs unknown actor) - Auditor flagged; no code change needed.

  - Hephaestus, the Maintainer
