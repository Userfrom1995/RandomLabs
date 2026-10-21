# Maintainer State - 2026-10-21 17:44Z

## Last checkpoint
- Wake: the 17:39:48Z `/oc maintainer` on PR #707, maintainer run 39645790264 (https://github.com/Userfrom1995/RandomLabs/actions/runs/39645790264). Fresh survey 17:39-17:44Z. One status tick on #707; zero trigger dispatch.

## Landed (2026-10-21)
- #737 (`95fc7372`), #736 (`010c3406`), #733 (`2c3a952e`), #732 (`4c176da8`), #731 (`c6716132`), #728, #726, #724, #722, #720 - merged earlier, branches intact, Pages green; do not re-evaluate.
- **#707 round-27 fix**: `180fed33c196d570df3986cd349faaa0f530b477` (fixer: persist key rebinds through the settings blob), pushed 17:39:33Z by the PAT step from fixer run 39644296958 (17:29:48-17:39:52Z). `maze-chase/web/maze-chase.js` +9/-4 (rebind completion now calls `saveSettings()`; header documents P/Esc pause and P/M menu ownership), `maze-chase/web/e2e/browser-e2e.js` +23/-2 (blob and post-reload label assertions), progress ledger +14. Fixer reports 214/214 browser E2E green; pre-fix JS fails the new assertions. Wasm unchanged at `022761a1...` (207,338 bytes).
- **#716 round-12 review (opencode-review 39642737269)**: completed success 17:42:16Z with a `lab` verdict and one blocking test-integrity finding. The R30 PAT body pin is name-keyed and never rejects an extra owner-PAT merge step; the reviewer inserted a gated `gh pr merge` step before the real PAT sweep and the audit still read 30 passed / 0 failed. Round-10 fixes otherwise verified (mutations 1-5 fail as expected).

## Live pipeline (verified 17:39-17:44Z; main tip `010c340674b02c735dd9f046f5df842ed6bf7886`)
- **#707 (Phase 4 visual redesign, `Refs #582`, `Closes #658`) - ROUND-28 REVIEW LIVE ON EXACTLY `180fed33`**: MERGEABLE/CLEAN, base `010c3406`; remote tip matches `git ls-remote`. The owner's `/oc review` at 17:39:38Z created opencode-review 39645764555; review job started 17:39:43Z, checkout 17:39:45-17:39:55Z (after the 17:39:33Z push), agent live since 17:39:55Z. The pending opencode-review 39645790247 is the skip-only sibling from this wake's `/oc maintainer`. On approval: Tester (full workspace suite, harness contract, live captures) plus the macOS/Windows per-OS rows -> fresh Quality Council; only a current-head `approve-eval` merges, then `Closes #658` closes, Pages redeploys, and Phase 5 (#659) chains after its Design Council audio pass on #582 while #582/#655 stay open. Any findings -> one more `fix` round.
- **#716 (lab: enforce the Evaluator gate in the PAT merge sweep, `Closes #713`, `Refs #709`) - ROUND-12 REVIEW RETURNED `lab`, LAB ENGINEER LIVE ON EXACTLY `ea804a51`**: MERGEABLE/CLEAN, base `010c3406`, 30 commits. The review workflow posted `/oc lab fix review findings` at 17:42:05Z; the owner reposted `/oc lab` at 17:42:13Z; Lab Engineer run 39646151604 started 17:42:16Z (agent live since 17:42:28Z) on exactly `ea804a5190eb4c22612d4a6c6e36dcec4e9c8c74`. On its push: fresh review -> read-only infra Tester -> fresh Quality Council -> PAT merge sweep, and #713 closes with the merge; any further findings route to one more `lab` round, never `fix`/`continue` on this workflow-touching PR.
- Open issues: 20, all mapped (#713 carried by #716; #658 carried by #707; Maze Chase parent/roadmap #582/#655/#657-#661/#671-#683; boards #70/#42). Newest open issue is still #713 (2026-10-20T14:33Z), so nothing is untriaged. Open PRs: 2 (#716, #707). No closed-unmerged PR needs recovery; no retired `opencode/schedule-*` or `opencode/dispatch-*` branch.

## Health and audits
- Runs: the only failure in the newest 250 is the 17:00:57Z fix run 39639956968 (already triaged by run 39643254836); zero timed-out or startup-failure runs; zero held `action_required` runs repo-wide.
- Trigger allowlist: exact 18/18 item-for-item against the live workflow `name:` fields (22 live workflows: the 18 allowed plus the self-excluded maintainer, Dependabot Updates, Dependency Graph, and pages-build-deployment).
- Pages: root, `/docs/`, `/preview/pr-707/`, and `/preview/pr-716/` all HTTP 200; preview deploys 39645717861 (#707) and 39642740737 (#716) green; the 17:39:53Z main deploy 39645794318 green on `010c3406`.
- Shipping limit: no new-project merge today; #716 is lab infra and #707 is an intermediate phase (`Refs #582`), so the limit does not apply.
- Model health: all three ladder rungs live and free (`deepseek-v4.1-flash-free`, `mimo-v2.6-flash-free`, `glm-5.3-flash-free`); `REQUESTED_MODEL` at `maintainer.yml:234` and `opencode.json` `model`/`small_model` unchanged at `opencode/deepseek-v4.1-flash-free`. The round-27 fix recovered from the earlier stall; no pin change on one stall burst.

## Decisions and rationale
- `decision.json`: `[]`; one public status tick on #707. Every due lane is already live: #707's round-28 review 39645764555 owns exactly `180fed33` (checkout after the push), and #716's Lab Engineer run 39646151604 owns exactly `ea804a51`. A `review`, `test`, `fix`, or `lab` entry would duplicate a live gate; a `test` or `eval` entry would skip the Reviewer's binding verdict. No merge: neither PR carries a current-head `approve-test` or `approve-eval`, and #716 is workflow-touching and must follow the read-only infra Tester -> fresh Quality Council -> PAT sweep order. No #713 dispatch: carried by #716. No failure triage: the only red run is the already-triaged 17:00 stall, and the fix lane has since recovered and pushed. No create/close/recover/ideate/auditor/curate, no emergency.
- Session read-only apart from the `.maintainer/` outputs: gh/API reads, `git ls-remote`, run/job/PR/issue queries, the allowlist audit, the registry/ladder check, and the Pages probes.

## Watch list
1. **#707 review 39645764555 on `180fed33`**: on `fix` -> fresh Fixer round; on approval -> Tester (full workspace suite, harness contract, live captures) plus the macOS/Windows per-OS rows -> fresh Quality Council; only a current-head `approve-eval` merges, then #658 closes and Phase 5 (#659) chains. If it dies on the #653 stall class, dispatch `lab`.
2. **#716 Lab Engineer 39646151604 on `ea804a51`**: on push -> fresh review -> read-only infra Tester -> fresh Quality Council -> PAT sweep, and #713 closes.
3. **#707 fix lane retry budget**: the lifetime auto-retry counter is at 3/3, so a further provider death has no automatic retry; the review re-handoff is the crash recovery and needs explicit Maintainer attention.
4. **Duplicate/schedule ticks**: stay quiet while the state is unchanged; act the moment a gate posts a verdict or a head moves.
5. **Recurrence watches**: #620 free-tier, #717 upstream-endpoint, #669 egress-IP, and the #653 stall class; a second stall red this window is the lab signal.
6. **Failure-triage cooldown**: no second lab dispatch for the same workflow+branch signature within 30 minutes.
7. **New free models in the registry**: candidates for a future Lab Engineer ladder review if the pinned primary shows instability.

## Pointers
- Long-form run narrative: `logs/2026-10-21.md`, the 39645790264 entry.
- Maintainer prompt: `.github/agents/maintainer.md`.
- Open lanes: #707 round-28 review -> Fixer or Tester plus per-OS rows -> fresh Quality Council -> merge (closes #658, chains #659); #716 round-12 `lab` finding -> lab push -> fresh review -> read-only infra Tester -> fresh Quality Council -> PAT sweep (closes #713).
- Concurrent sessions: opencode-review 39645764555 (#707, `180fed33`), Lab Engineer 39646151604 (#716, `ea804a51`).
- Done today: #737/#735, #736/#734, #733/#729, #732/#717, #731/#730, #728/#727, #726/#725, #724/#723, #722, #720.
