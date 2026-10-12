# STATE - Random factory checkpoint
 - **Updated: 2026-10-12 run 38244077035 - Pac-Man epic PR #553 triaged; owner build already queued, standby**

## PRs & Issues
 - **PRs:** Open: #553 (Architect Phase Epic for #552: ideas/ blueprint + progress/ 6-phase tracker, head 7b47027d on opencode/issue552-20261012113721; owner /oc build this queued as pending opencode run 38244077053; merge must use Refs #552, NOT Closes). MERGED: #551 (Builder #549 delivery, triple-cleared 9.9, merged 16:13:41Z prior day cycle, #549 closed), #550 (Lab Engineer 7th-mandate docs-sync, triple-cleared 9.8, #70 stays open), #548 (Fixes #546 task), #545, #543, #541, #542, #540, #539, #538, #537, #536, #533, #534, #535, #531, #529, #527. CLOSED: #547 (superseded by #548).
 - **Issues:** Open: #70 lab-health, #42 brainstorm standing, #552 Pac-Man tracking (epic delivered via PR #553, Phase 1 build now queued). Closed: #549, #546, #544, #532, #530, #528, #526, #515, #518, #504, #507, #498, #436-GUI-detach-unknown (verify; pending owner direction).
 - **Boards:** #70 lab-health, #42 standing. `workflows:` event allowlist: 19 entries vs 19 live non-maintainer workflow `name:` fields - exact set match verified this run, no drift. `SWEEP_ALLOWLIST` 7-entry unchanged.
 - Design v2 (Harbor Overlay System v2, 3-row drawer) supersedes v1 commentary on #532; PR #536 carried the spec + tokens, now on main.

## IN FLIGHT
 - Pac-Man #552: Architect epic landed as PR #553 (6 semantic phases, Phase 1: Deterministic Engine Core and Maze Foundation active; Design Council pass reserved in tracker before visual polish declared done). Owner /oc build this queued (opencode run 38244077053 pending); Builder will push Phase 1 onto PR #553 branch. Next maintainer run: review gate on #553 once Phase 1 lands (do NOT review while builder is pushing), then phased review/test/eval chain.
 - PR #553 body says `Closes #552` but tracker mandates Refs until final phase: merge MUST keep #552 open; only the final verification phase uses Closes #552.
 - Run 38244046489 note: maintainer pull_request-event run on bot-created PR #553 posted the CLI write-permission denial ("User github-actions[bot] does not have write permissions"). Expected gate behavior on bot-authored PR events, not a failure; no triage, no lab escalation.
 - Main tip 1780edba (owner direct push 2026-10-12, control plane back to ubuntu-latest + poisoned-cache guard; poisoned 189-byte macOS cache entry deleted). Pages deploy covers tip; preview for PR #553 staging.
 - Run sweep: zero new failures (last-30: only cancelled/skipped maintainer workflow_run entries, skipped non-matching issue_comment arms, success pages deploy, plus this in_progress run and the pending opencode build; no failure/timed_out).
 - Rebase-gate rule: a rebase or fix-push that rewrites a gated PR's head voids its gate; fixed head needs Reviewer re-confirmation before merge. Test-only Tester commits (single-file tests/, production untouched) do NOT void the review gate per precedent.
 - Eval-gate calibration note: surgical infra/docs/test-harness fixes may merge on Reviewer approve + Tester approve-test; Evaluator binding gate stays mandatory for product/research/phase deliverables.
 - Eval-crash rule (amended): eval run dying inside `Run evaluator agent` with no decision file and no Quality Council comment carries zero signal - retry eval once (cooldown 30 min same-signature). Second AGENT-STEP silent death routes `lab`, never a third eval. UNACQUIRED deaths do not count; one exception per cooldown window max.
 - Duplicate-eval note: maintainer + owner near-simultaneous eval dispatches settle via per-PR concurrency; stand down when an eval arm is pending/in_progress.
 - Error-dump wart status: 13th recurrence logged; escalation note posted to Owner via ping on #70 (run 37552237432). 8th lab mandate withheld per loop guard - awaiting Owner direction.
 - Evaluator follow-up VERIFIED live on main: `archive/prism/benchmarks/bench_vs_codecs.py:28` sys.path depth bug (resolves to nonexistent `archive/archive/obsidian/benchmarks`). Queued as future Builder/test-hardening vehicle.
 - Workflow warts logged (not yet lab-routed): (1) opencode.yml verify step counts ALL historical auto-retry comments; (2) verify-step branch pattern false-negatives on non-`opencode/issue<N>-*` names. Lab to assess on second consecutive trigger-step failure.
 - Standing-board close guard: #70 must never carry `Closes #70` in a PR body; merge as Refs only.

## NEXT-RUN PLAYBOOK
1. Trigger-list re-verify each run (BOTH allowlists; watch for new workflow drift).
2. Pac-Man: once Phase 1 lands on PR #553, dispatch review (`/oc review`); then test/eval chain per phase; Design Council (`/oc design`) before visual polish declared done (tracker reserves it; owner build order takes precedence for engine phases).
3. Enforce Refs-not-Closes on #553 merge; keep #552 open until final phase.
4. Pages re-confirm only after new merges.
5. Error-dump wart: await Owner direction; do NOT auto-queue an 8th lab mandate.
6. Evaluator follow-up (archived bench helper path + weak assertion) queued for a future hardening vehicle.
7. Council calibration: advisory Desktop Pet audit still pending.
8. Watch: ubuntu-latest agent runs - if hollow-green/silent-stall recurs, the poisoned-cache class is NOT fixed and a lab mandate is warranted.
9. Standing rule: standby on all other fronts (no auto-ideate).

## OPEN QUESTIONS
 - Will the queued Builder deliver Phase 1 cleanly onto PR #553's branch?
 - Architect delivery shape on #552 (Phase Epic roadmap + protocol/AI spikes)? ANSWERED: 6-phase epic + Python 3.11 stdlib core selection, on PR #553.
 - Owner direction on the error-dump wart (escalation posted 2026-10-07; 8th mandate withheld)?
 - Evaluator follow-up hardening vehicle (archived bench helper sys.path depth + weak assertion)?
 - What caused the ~50-min agent-step death in eval run 37362541465?
 - Should the stale `opencode/lab-70-docs-sync` branch be deleted, or kept as archaeology?
 - Should the maintainer trigger poster re-checkout main after in-session merges before reading its own mapping?
 - Opencode verify-step warts: (1) auto-retry counter per-attempt-window vs all-time? (2) branch pattern accepting `opencode/<issue>-*`?
 - What shape will the release pipeline take at publish time going forward?
 - Will the Owner open a PR from the `opencode/issue436-gui-detach-and-syswide-fixes` branch, or land it another way?
 - What caused the 08:34-11:26Z schedule silence on 2026-09-29?
 - Probe source of the 2026-09-25 PWNED selfheal payloads (red-team test vs unknown actor)?

 - Hephaestus, the Maintainer
