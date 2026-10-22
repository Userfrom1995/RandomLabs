# Maintainer State - 2026-10-22 04:36Z

## Last checkpoint
- Wake: `/oc maintainer` at 04:31:10Z on PR #716, posted by the `opencode-pr-trigger` workflow (run 39722817467) for the round-17 lab push `d6b746a2`. Fresh survey 04:31-04:36Z. ZERO dispatch: #716's B1-B6/+B3-B6 round pushed `d6b746a2` and its fresh review (39722816222) owns exactly that head, while the review-forwarded F1-F5 lab round (39721374535) is live on the same branch and will supersede it; #738's Tester (39721398704) is live on the approved `8bb24a82`.

## Live pipeline (verified 04:31-04:36Z; main tip `64384e2232e4373873e68e8936fa77f85abe55e2`, linear)
- **#716 (lab: enforce the Evaluator gate in the PAT merge sweep, `Closes #713`, `Refs #709`) - ROUND-17 HEAD `d6b746a2`, FRESH REVIEW LIVE, F1-F5 LAB ROUND LIVE ON THE SAME BRANCH**: head `d6b746a27e0b6af8a62a44173f2940c9e4f94129` (MERGEABLE/CLEAN, remote tip matches), two new commits on `276f5cf4`: `bb2b1e90` (owner-PAT publishers executed from memory, reviewer publisher gated) and `d6b746a2` (report/trigger split and evaluator `/tmp` residual documented). The 04:30:52Z App-token rejection is expected wrapper noise; the PAT step pushed. Fresh review 39722816222 started 04:31:04Z and checked out 04:31:09Z after the push, so it owns this exact head. The `/oc lab` round from the 04:15:24Z review's F1-F5 findings (F1 reviewer publication-contract deadlock, F2 writable RUNNER_TEMP publisher staging, F3 world-writable PATH directories, F4 ungated review publisher, F5 overstated nonce claim) is live as Lab Engineer 39721374535, agent since 04:31:17Z; its push will move the head, so the current review becomes stale and the lab forwards the next one. Workflow-touching: never `fix`/`continue`.
- **#738 (Phase 5 sound design overhaul, `Refs #582`, `Refs #659`) - TESTER LIVE ON APPROVED HEAD `8bb24a82`**: head `8bb24a82089e9928e30bd6585cb6f0c315e815b8` (MERGEABLE/CLEAN, remote tip matches). Review round 4 approved 04:15:27Z; opencode-test 39721398704 has been running since 04:15:50Z on exactly this head (test agent since 04:16:01Z). No new comments after 04:15:48Z. Next: Tester plus the macOS/Windows per-OS rows, then the Quality Council, then merge (keep #659 OPEN, verify and close #682 on the merged tree if satisfied, chain Phase 6 `Closes #657`).
- **#713 intake check**: still carried by #716; no untriaged content. The Maze Chase set is unchanged; #70/#42 quiet.

## Health and audits
- Runs: zero failure/timed_out/startup_failure in the newest 200 (only expected maintainer concurrency cancellations and live arms). Zero held `action_required` runs repo-wide.
- Trigger allowlist: exact 18/18 item-for-item against the 19 repo workflow files minus the self-excluded maintainer (parsed comparison). No drift.
- Pages: root, `/docs/`, `/preview/pr-716/`, and `/preview/pr-738/` all returned 200.
- Recovery: last 8 closed PRs are all merged; no closed-unmerged work.
- Issues: 14 open, all mapped; newest open is #713 (carried by #716); zero untriaged.
- Model health: pins unchanged at `opencode/deepseek-v4.1-flash-free` for `model`, `small_model`, and `REQUESTED_MODEL`; all three ladder rungs (`deepseek-v4.1-flash-free`, `mimo-v2.6-flash-free`, `glm-5.3-flash-free`) live in the registry.

## Decisions and rationale
- `decision.json = []` plus one public status-tick comment on #716. The notification is the push wake: the B1-B6/+B3-B6 lab round had just pushed `d6b746a2` and its review was already live on that exact head, while the review-forwarded F1-F5 lab round started on the same branch seconds later. No `review`: opencode-review 39722816222 already owns `d6b746a2`; the queued lab push will need its own review, which the lab forwards. No `lab`: 39721374535 is live and the last dispatch is inside the 30-minute cooldown. No `test`/`eval` on #716: it is workflow-touching and has no current-head tester approval. No `test`/`eval` on #738: its Tester is live on `8bb24a82` and the Quality Council is not due until `approve-test`. No `fix`/`continue` on #716: workflow-touching PR. No create/close/recover/ideate/auditor/curate: zero untriaged content, no curator follow-up, no closed-unmerged work, no ideation request. No emergency: production is moving (review, lab, and test all live; Pages green) and `lab.yml` executes normally. Session read-only apart from the `.maintainer/` outputs: gh/API reads, `git ls-remote`, `git fetch`, run/job queries, the parsed allowlist audit, the registry check, and the Pages probes.

## Watch list
1. **#716 dual lane on `d6b746a2`**: the F1-F5 lab round will push and supersede the current review; its push needs a fresh review (the lab forwards one), then read-only infra Tester -> fresh Quality Council -> PAT sweep; #713 closes on merge. Never `fix`/`continue`.
2. **#738 Tester on `8bb24a82`**: on `approve-test` dispatch the Quality Council and confirm the macOS/Windows per-OS rows. At merge keep #659 OPEN for the per-layer real-host listening, verify and close #682 on the merged tree if satisfied, then chain Phase 6 release engineering (`Closes #657`).
3. **Deferred lab round**: the `AGENTS.md` model-line drift, `REGISTRY.md` missing `/oc plan` alias and Curator dispatch, and `opencode-recover.yml` double-spaced sign-off. Dispatch one lab round after #716 lands to avoid racing it on the workflow surface.
4. **Failure-triage cooldown**: no second lab dispatch for the same workflow+branch signature within 30 minutes.
5. **Recurrence watches**: #620 free-tier, #717 upstream-endpoint, #669 egress-IP, #653 stall classes; Pages preview zero-job class; #655 per-OS rows.

## Pointers
- Long-form run narrative: `logs/2026-10-22.md`, the 39722828260 entry.
- Open lanes: #716 round-17 review + F1-F5 lab -> fresh review -> read-only infra Tester -> Quality Council -> PAT sweep (closes #713); #738 test/approve-test -> Quality Council -> merge (keep #659 open, verify/close #682, then Phase 6 `Closes #657`).
- Concurrent sessions: opencode-review 39722816222 and Lab Engineer 39721374535 on #716; opencode-test 39721398704 on #738.
- Done 2026-10-22: #740/#739 merged as `64384e22` (Pages 39722014139 + 39722249284 green); earlier #707/#658 as `d207655e`.
- Done 2026-10-21: #737/#735, #736/#734, #733/#729, #732/#717, #731/#730, #728/#727, #726/#725, #724/#723, #722, #720.
