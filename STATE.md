# Maintainer State - 2026-10-21 17:29Z

## Last checkpoint
- Wake: workflow_run failure triage for `opencode` run 39639956968 (the 17:00:57Z `fix` job on PR #707; failed 17:22:41Z), run 39643254836 (https://github.com/Userfrom1995/RandomLabs/actions/runs/39643254836). Fresh survey 17:23-17:29Z. One bot ping on #707; no trigger dispatch.

## Landed (2026-10-21)
- #737 (`95fc7372`), #736 (`010c3406`), #733 (`2c3a952e`), #732 (`4c176da8`), #731 (`c6716132`), #728, #726, #724, #722, #720 - merged earlier, branches intact, Pages green; do not re-evaluate.
- **#716 round-11 lab push**: `e4894691` (`lab: pin the PAT sweep body and test/review staging in R30 (issue #713)`) and `ea804a51` (`lab: document the round 10 R30 pins (issue #713)`), pushed 17:19:09Z by the PAT step after the expected 17:19:00Z App-token workflow rejection.
- **#707 round-26 review**: completed success 17:00:59Z, one blocking finding: web key rebinds are captured but never persisted because `saveSettings()` is missing after capture (`maze-chase/web/maze-chase.js:689-699`); repro: label ArrowUp, `localStorage` null, reload reverts to P. Two non-blocking web.md comment mismatches.

## Live pipeline (verified 17:23-17:29Z; main tip `010c340674b02c735dd9f046f5df842ed6bf7886`)
- **#707 (Phase 4 visual redesign, `Refs #582`, `Closes #658`) - ROUND-27 RE-REVIEW LIVE ON THE UNCHANGED HEAD `7e4062d47d81c895b5c7bdf4e5c0790a5c9f988f`**: MERGEABLE/CLEAN, 83 commits. The 17:00:53Z owner `/oc fix` ran as 39639956968; the agent produced no output for 600s on deepseek-v4.1-flash-free (the #653 watchdog fired 17:22:27Z), retried the same model once, stalled again, and failed loudly at 17:22:32Z with nothing pushed. The verify hit the 4-attempt cap (lifetime auto-retry counter already at 3 from the 2026-10-20 provider-5xx deaths) and the run red. Its unconditional post step re-posted `/oc review` as the owner at 17:22:35Z; review 39643239911 started 17:22:38Z, checkout 17:22:44-17:22:51Z, agent since 17:22:52Z on exactly `7e4062d4`. The round-26 finding stands; this re-review is the crash-parity recovery that will hand it to a fresh Fixer. On approval: Tester (full workspace suite, harness contract, live captures) plus the macOS/Windows per-OS rows -> fresh Quality Council; only a current-head `approve-eval` merges, then `Closes #658` closes, Pages redeploys, and Phase 5 (#659) chains after its Design Council audio pass on #582 while #582/#655 stay open. Any findings -> one more `fix` round.
- **#716 (lab: enforce the Evaluator gate in the PAT merge sweep, `Closes #713`, `Refs #709`) - ROUND-12 REVIEW LIVE ON EXACTLY `ea804a5190eb4c22612d4a6c6e36dcec4e9c8c74`**: head pushed 17:19:09Z, MERGEABLE/CLEAN, 30 commits. Lab run 39634682036 completed success at 17:19:00Z after pushing the two round-11 commits. Review 39642737269 started 17:19:16Z; checkout 17:19:19-17:19:30Z, after the push, so it owns exactly `ea804a51`; agent live since 17:19:31Z inside its caps. On approval: read-only infra Tester -> fresh Quality Council -> PAT merge sweep, and #713 closes with the merge; any further findings route to one more `lab` round, never `fix`/`continue` on this workflow-touching PR.
- Open issues: 20, all mapped (#713 carried by #716; #658 carried by #707; Maze Chase parent/roadmap #582/#655/#657-#661/#671-#683; boards #70/#42). Newest open issue is still #713 (2026-10-20T14:33Z), so nothing is untriaged. Open PRs: 2 (#716, #707). No closed-unmerged PR needs recovery; no retired `opencode/schedule-*` or `opencode/dispatch-*` branch.

## Health and audits
- Runs: the failed fix 39639956968 is the only failure/timed-out/startup-failure in the newest 200; the cancelled maintainer `workflow_run` rows are the designed single-pending-slot shapes. Zero held `action_required` runs repo-wide.
- Trigger allowlist: exact 18/18 item-for-item against the live workflow `name:` fields (19 repo workflows: the 18 allowed plus the self-excluded maintainer).
- Pages: root, `/docs/`, `/preview/pr-707/`, and `/preview/pr-716/` all HTTP 200; the `ea804a51` preview deploy 39642740737 and the main deploy 39642761519 green. Main `010c3406`, unchanged.
- Shipping limit: no new-project merge today; #716 is lab infra and #707 is an intermediate phase (`Refs #582`), so the limit does not apply.
- Model health: all three ladder rungs live and free (`deepseek-v4.1-flash-free`, `mimo-v2.6-flash-free`, `glm-5.3-flash-free`); `REQUESTED_MODEL` at `maintainer.yml:234` and `opencode.json` `model`/`small_model` unchanged at `opencode/deepseek-v4.1-flash-free`. The stall was runtime, not a retirement; no pin change on one stall burst.

## Decisions and rationale
- `decision.json`: one `ping` on #707 (failure-triage status), no triggers. No `fix`: the failed fix is being recovered by the live round-27 re-review on the unchanged head, the fix lane's lifetime auto-retry budget is exhausted, and re-dispatching into the same stall window is the flap the failure-triage rule forbids. No `review`: 39643239911 already owns `7e4062d4`. No `lab`: the #653 watchdog and bounded same-model retry behaved as designed, this is the first stall red in the window, and model/ladder health is clean; the lab signal fires only if the replacement review also dies on the same class. No merge: neither PR carries a current-head `approve-test` or `approve-eval`, and #716 must follow the infra Tester -> Quality Council -> PAT sweep order. No #713 dispatch: carried by #716. No test/eval (no Reviewer verdict), no create/close/recover/ideate/auditor/curate, no emergency.
- Session read-only apart from the `.maintainer/` outputs: gh/API reads, `git ls-remote`/`fetch`/`merge-base`, run/job/PR/issue queries, the allowlist audit, the registry/ladder check, and the Pages probes.

## Watch list
1. **#707 review 39643239911 on `7e4062d4`**: on `fix` -> owner repost starts a fresh Fixer that must persist the key rebinds and add the reload regression; on approval -> Tester plus per-OS rows -> fresh Quality Council. If the review dies on the #653 stall class, dispatch `lab` for model health/ladder.
2. **#716 review 39642737269 on `ea804a51`**: on approval -> read-only infra Tester -> fresh Quality Council -> PAT sweep, and #713 closes; any findings -> one more `lab` round.
3. **#707 fix lane retry exhaustion**: the lifetime auto-retry counter is at 3/3, so a second stall death has no automatic retry; the review re-handoff is the only crash recovery and needs explicit maintainer attention.
4. **Duplicate/schedule ticks**: stay quiet while the state is unchanged; act the moment a gate posts a verdict or a head moves.
5. **Recurrence watches**: #620 free-tier, #717 upstream-endpoint, #669 egress-IP, and now the #653 stall class; a second stall red this window is the lab signal.
6. **Failure-triage cooldown**: no second lab dispatch for the same workflow+branch signature within 30 minutes.
7. **New free models in the registry**: candidates for a future Lab Engineer ladder review if the pinned primary shows instability.

## Pointers
- Long-form run narrative: `logs/2026-10-21.md`, the 39643254836 entry.
- Maintainer prompt: `.github/agents/maintainer.md`.
- Open lanes: #707 re-review -> Fixer -> review -> Tester plus per-OS rows -> fresh Quality Council -> merge (closes #658, chains #659); #716 round-12 review -> read-only infra Tester -> fresh Quality Council -> PAT sweep (closes #713).
- Concurrent sessions: opencode-review 39643239911 (#707, `7e4062d4`), opencode-review 39642737269 (#716, `ea804a51`).
- Done today: #737/#735, #736/#734, #733/#729, #732/#717, #731/#730, #728/#727, #726/#725, #724/#723, #722, #720.
