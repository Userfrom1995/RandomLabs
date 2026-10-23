# STATE

Last updated: 2026-10-23T08:57Z by the maintainer run 39927524967 (the `workflow_run` failure of the #745 Lab Engineer round 39917686276; fresh survey 08:50-08:57Z).

## Who I am

I am Hephaestus, the Maintainer of this lab: Chief Orchestrator, in the line of Mae (repository inception through 2026-08-27). Quality is the only deadline. I do not post triggers myself, I do not push code to `main`, and I do not edit my own prompt or workflow. I survey fresh every run, and I only record what I verified.

## Right now

- **#745 (owner-PAT hardening, `Refs #742`) - REVIEW RETURNED `lab`; THE LAB ROUND DIED ON THE PROVIDER FREE-USAGE CAP, AND ONE BOUNDED RETRY IS DISPATCHED.** Head `e1cf92763a9b97767fa33e64f8f403886021814d`, one commit on `main` `e73bd7a2`, MERGEABLE/CLEAN, 17 files `+1586/-153`, remote tip unchanged (the failed run pushed nothing). Review run 39911708630 completed success at 07:26:08 with verdict `lab`; the signed report is owner-PAT comment 6359773179 (07:25:51Z) and the hardcoded forward is `/oc lab` comment 6359773804 (07:25:54Z). Lab Engineer run 39917686276 ran 07:26-08:50 and did substantive audit work (patched R17/R28 and reran the audit), but at 08:29:30 the provider returned `AI_APICallError: Free usage limit reached ... FreeUsageLimitError` (HTTP 429); it repeated at 08:39:54/08:40, the #653 watchdog killed the first stall at 08:39:40, retried the same model, killed the second stall at 08:50:21, and the verify step failed red at 08:50:26 with no decision file and no push (crash parity, #591/#422). The `issue_comment` arm has no self-heal; this run dispatches the one bounded retry.
- **The findings the retry must answer** (review comment 6359773179): F1 P0 the function-clearing preamble is bypassable by imported `BASH_FUNC_read`/`BASH_FUNC_builtin`; F2 P0 `SHELLOPTS`/`PS4` can execute before the preamble; F3 P1 `GIT_CONFIG_PARAMETERS`/`GIT_CONFIG` are inherited; F4 P1 R32 fails open on a Python crash and accepts `R32_EXPECTED_TOTAL`; F5 P1 the eval head check is shadowable by `BASH_FUNC_git`; F6 P1 the unrunnable-scope evidence is not latched (TOCTOU into an approval marker); F7 P1 `GH_CONFIG_DIR`, `PYTHONPATH`, and `DYLD_*` are unpinned; F8 P1 the review skip notice needlessly carries the owner PAT; F9 P1 issue #742(b) is not implemented (`AGENTS.md:124` still says "different model"); F10 P1 the PR body lacks the delegation ledger; F11 P1 the audit is not hermetic under an ambient `LAB_RUN_NONCE` (R17/R19 fail); F12/F13 are P2 coverage/bookkeeping.
- **#741 (Phase 6 release engineering, `Refs #582`, `Refs #657`) - FIX RETRY 2 LIVE.** Head `5d82c7bf6b0a146ce9777d05ad3855ade15c76d4`, base `30491c48`, 18 commits, 51 files, MERGEABLE/CLEAN, unchanged since 2026-10-22T16:32:44Z, zero protected paths. The first fix round 39916408652 (07:13:47-08:00:48) died on the same `FreeUsageLimitError` at 07:50:24 with no push; the verify posted `/oc fix (auto-retry 1)` (comment 6360330126, 08:00:50Z) and run 39921663187 started 08:00:54, but it too died on `FreeUsageLimitError` (agent errors from 08:44:31, both #653 stall windows, loud exit at 08:54:56) with no push. The verify posted `/oc fix (auto-retry 2)` (comment 6361234619, 08:54:58Z) and run 39928060449 started 08:55:02; it was in its agent step at 08:58Z. Findings stand: B1 (deb/rpm payloads missing the MIT license text), B2 (release matrix run from the wrong directory), M1-M4, and the nine minors.
- **No merge-ready PR**: zero first-line tester approvals and zero `eval-verdict: approve-eval` markers on #741 and #745.
- **#743 (P0 lane outage)**: the review-lane proof is collected (the #741 review completed end to end on the repaired lane); test/eval/per-OS proofs follow the #741 chain. **#742** closes on #745's merge.
- **Issues**: 14 open, all mapped (#743, #742, the Maze Chase set #683/#678/#677/#676/#661/#660/#659/#657/#655/#582, boards #70/#42). Zero untriaged; no closed-unmerged PR needs recovery; no retired `opencode/schedule-*` / `opencode/dispatch-*` branch on the remote.
- **The owner's delivery directive still governs** (#741 comment 6358553065): delivery first, no unnecessary infra churn. The #745 retry is the owner-prompted PR's own review-mandated round, not new scope.

## Health (verified 08:50-08:57Z)

- Main `e73bd7a2`; #741 `5d82c7bf`; #745 `e1cf9276` (all via `git ls-remote`).
- Open PRs: #741 and #745, both MERGEABLE/CLEAN.
- Zero held `action_required` runs repo-wide; trigger allowlist exact 18/18 item-for-item against the 19 workflow names on `main` (only `maintainer` self-excluded).
- The only failure in the newest 100 runs is Lab Engineer 39917686276 (provider free-usage cap, this run's wake). The other 08:00-08:01 maintainer/lane runs are skipped job gates or cancelled supersessions.
- Pages: root 200, `/maze-chase/` 200, preview `pr-741/` 200, preview `pr-745/` 200.
- Model pins coherent across the three surfaces (`opencode/deepseek-v4.1-flash-free` for `model`, `small_model`, every workflow pin, and the inline `REQUESTED_MODEL`); the three ladder rungs (`deepseek-v4.1-flash-free`, `mimo-v2.6-flash-free`, `glm-5.3-flash-free`) are present and free in the live registry.
- **New provider class observed today**: `FreeUsageLimitError` (429 "Free usage limit reached. Subscribe to OpenCode Go") hit three runs: fix 39916408652 at 07:50:24, lab 39917686276 at 08:29:30, and fix 39921663187 at 08:44:31. It is a per-egress-IP daily free quota (research: all free Zen models share the IP bucket, reset at UTC midnight, a fresh runner gets a fresh IP), NOT a model retirement. The runners do not classify it as a retryable or fast-fail class, so each death costs ~20 minutes of #653 stall windows before the loud failure. The recovery lane is a fresh run (fresh IP), which is why the retries and this maintainer session run while the capped runners died. A model pin change would NOT help; no emergency.
- The 07:33Z watch item stands: maintainer run 39909091719 (the #750 close wake) missed its decision file and red-ed at 07:03; one occurrence, watch only.

## Decisions this run

- `decision.json`: one entry, `{"action": "lab", "pr": 745, "instruction": "<the F1-F11 retry>"}` - the single bounded retry after the provider-cap death.
- No comment: a `workflow_run` wake has no comment target; the retry reason travels inside the owner-posted `/oc lab` trigger.
- No `review`: both PRs' next heads auto-forward their own reviews (the lab retry and the fix retry).
- No `test`/`eval`/per-OS: downstream of a review approval.
- No merge: nothing carries a current-head tester approval plus an eval marker.
- No `fix`/`continue`: #741's fix retry 2 is live (the verify's automatic budget still has one retry after it); #745 is infrastructure under the lab lane (routing guard).
- No create/close/recover/ideate/auditor/curate: zero untriaged content, no stranded work, no ideation request.
- No emergency: `lab.yml` executes normally; the class is provider quota, not a dead pin; changing the free-model pin cannot bypass the per-IP cap; production is not halted (the fix retry and this session run).

## Watch list

- **#745 lab retry**: if it pushes, the thread's review budget is spent, so the next step is one manual head-bound `/oc review (head <sha>)`; then the read-only infrastructure Tester, the Council, the PAT sweep; #742 closes on merge.
- **#741 fix retry 2 (39928060449)**: on push, confirm the new head and the auto-forwarded review; on `approve`, the Tester plus the three per-OS testers, the Council, and the head-bound merge. If it dies without a push, the verify posts auto-retry 3 (the last automatic one); after that the lane needs a manual `/oc fix` with a fresh budget.
- **FreeUsageLimitError class**: two deaths today; if it recurs on the retries, a lab fast-fail classification becomes a candidate (not dispatched now under the delivery-first directive).
- **Maintainer 60-minute contract miss** (39909091719): one occurrence on a duplicate wake; a recurrence is a lab dispatch with the run log.
- **#742/#743**: #742 closes on #745's merge; #743 closes only after live review, test, eval, and per-OS evidence.
- Recurrence watches: #620 free-tier, #717 upstream-endpoint, #669 egress-IP, #653 stall classes, the #616/#637 publication gate, the Pages preview zero-job class, #655 per-OS rows, the test-cap pattern.

## Next steps

1. **#745**: read the lab retry result; on push, one manual head-bound review, then the read-only infrastructure Tester, the Council, the PAT sweep.
2. **#741**: verify the fix retry 2 push and its verification claims, then read the fresh review. On `approve`, confirm `/oc test` starts (Tester plus the three per-OS testers); on `fix`, route the next round; if retry 2 dies, watch retry 3 and be ready to dispatch a manual `/oc fix` after the automatic budget is spent.
3. **#741 merge**: only with a current-head tester approval plus the Evaluator's `approve-eval` marker; merge head-bound, branch intact. Then dispatch `{"action": "lab", "issue": 657}` to install `packaging/release/maze-chase-release.yml` plus the Maintainer routing, and drive the native Linux/macOS/Windows release jobs and `maze-chase-v0.1.0-rc.1`; #657 stays open for the native evidence.
4. **Chain the roadmap**: dispatch Phase 7 (`{"action": "build", "issue": 582}`) once Phase 6 is merged, then the Final Phase per `progress/582-maze-chase-overhaul.md`.
5. **#743**: collect the test/eval/per-OS live evidence and close when complete.
6. **Health**: triage only genuinely new failure classes; do not create new infra issues under the owner's directive.

## Pointers

- This run's log entry: `logs/2026-10-23.md`, run 39927524967.
- The failed #745 lab round: https://github.com/Userfrom1995/RandomLabs/actions/runs/39917686276
- The live #741 fix retry: https://github.com/Userfrom1995/RandomLabs/actions/runs/39921663187
- The #745 review report: comment 6359773179 (07:25:51Z); the forward: comment 6359773804 (07:25:54Z); review run 39911708630.
- The #741 review report: comment 6359590331 (07:13:40Z); the fix forward: comment 6359591267 (07:13:43Z); first fix run 39916408652; retry 1 comment 6360330126; retry 2 comment 6361234619; retry 2 run 39928060449.
- The owner's directive: #741 comment 6358553065 (06:01:42Z); the #745 halt question: #745 comment 6358709459 (06:12:58Z).
- The binding rules: `.github/agents/maintainer.md` (this run) and `AGENTS.md`.
- Trusted surfaces: `.github/scripts/silent-stall-audit.sh` (R1-R32), `.github/scripts/publish-eval-marker.sh`, the PAT sweep in `maintainer.yml`, and `.github/actions/opencode-run/`.
