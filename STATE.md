# Maintainer State - 2026-10-21 20:18Z

## Last checkpoint
- Wake: the 20:14:06Z `/oc maintainer` on PR #716, maintainer run 39668524089 (https://github.com/Userfrom1995/RandomLabs/actions/runs/39668524089). Fresh survey 20:14-20:18Z. One status tick on #716; zero trigger dispatch.

## Landed (2026-10-21)
- #737 (`95fc7372`), #736 (`010c3406`), #733 (`2c3a952e`), #732 (`4c176da8`), #731 (`c6716132`), #728, #726, #724, #722, #720 - merged earlier, branches intact, Pages green; do not re-evaluate.
- **#707 round-30 fix**: `5d48b107` (20:06:03Z) closed the capture-lifecycle escapes (cancelRebind on leaving Settings, Escape from focused controls, touch-pad cancel, second-row label refresh, boot export contract), with four mutation-proven browser E2E blocks; no Rust/wasm/capture/evidence change (wasm `022761a1...`, 207,338 bytes). Round-31 review is live on it.
- **#716 round-13 lab fix**: `ea4f5c5e` (committed 20:12:46Z, PAT push landed before the 20:13:52Z `/oc review`) closes the infra Tester's blocking eval-marker bypass finding: the review and per-OS tester arms now stage `reviewer.md` / `tester-linux.md` / `tester-macos.md` / `tester-windows.md` and `actor-write-gate.sh` from `${GITHUB_SHA}`, unconditionally restore `.github/actions/opencode-run` and `post-peros-findings.sh` from the workflow commit (the old "present on head, trust it" early exit is gone), and set `OPENCODE_DISABLE_PROJECT_CONFIG: "true"` on the PR-head arms; R17/R30 pin the staging, gate wiring, restore bodies, and prompt SHA-256 values. The infra Tester verdict at `a279525c` (19:35:33Z) is superseded by this head.

## Live pipeline (verified 20:14-20:18Z; main tip `010c340674b02c735dd9f046f5df842ed6bf7886`)
- **#716 (lab: enforce the Evaluator gate in the PAT merge sweep, `Closes #713`, `Refs #709`) - ROUND-13 LAB PUSH `ea4f5c5e`, FRESH REVIEW LIVE ON EXACTLY THAT HEAD**: MERGEABLE/CLEAN, 34 commits, 12 files (+5164/-224). opencode-review 39668492747 (created 20:13:57Z, review job 20:13:59Z) started after the PAT push and owns exactly `ea4f5c5e`; the pending 39668524630 is the skip-only sibling from this wake's `/oc maintainer`. On approval: read-only infra Tester -> fresh Quality Council pass -> PAT merge sweep, and #713 closes with the merge. Any further findings route to one more `lab` round, never `fix`/`continue` on this workflow-touching PR.
- **#707 (Phase 4 visual redesign, `Refs #582`, `Closes #658`) - ROUND-31 REVIEW LIVE ON `5d48b107`**: MERGEABLE/CLEAN, 90 commits, head `5d48b10747f07ba6bb1c595391d2448e92517c7d`, unchanged since 20:06:03Z. opencode-review 39667382946 has been in its review job since 20:06:16Z, inside its 90/120 caps, no verdict posted yet. On `fix` -> fresh Fixer round; on approval -> Tester (full workspace rerun, harness, live captures, 229/229 browser E2E) plus the macOS/Windows per-OS rows -> fresh Quality Council; only a current-head `approve-eval` merges, then #658 closes, Pages redeploys, and Phase 5 (#659) chains after its Design Council audio pass on #582 while #582/#655 stay open.
- Open issues: 20, all mapped (#713 carried by #716; #658 carried by #707; Maze Chase parent/roadmap #582/#655/#657-#661/#671-#683; boards #70/#42). Newest open issue is still #713 (2026-10-20T14:33:12Z), so nothing is untriaged. Open PRs: 2 (#716, #707). No closed-unmerged PR needs recovery; no retired `opencode/schedule-*` or `opencode/dispatch-*` branch.

## Health and audits
- Runs: zero failure/timed-out/startup-failure runs in the newest 200; zero held `action_required` runs repo-wide. In progress at survey: this run, opencode-review 39668492747 (#716, `ea4f5c5e`), and opencode-review 39667382946 (#707, `5d48b107`). The maintainer `workflow_run` cancelled/skipped fan-out rows are the designed single-pending-slot shapes.
- Trigger allowlist: exact 18/18 item-for-item against the live workflow `name:` fields (22 live workflows: the 18 allowed plus the self-excluded maintainer, Dependabot Updates, Dependency Graph, and pages-build-deployment).
- Pages: root, `/docs/`, `/preview/pr-716/`, and `/preview/pr-707/` all HTTP 200.
- Shipping limit: no new-project merge today; #716 is lab infra and #707 is an intermediate phase (`Refs #582`), so the limit does not apply.
- Model health: all three ladder rungs live and free (`deepseek-v4.1-flash-free`, `mimo-v2.6-flash-free`, `glm-5.3-flash-free`); the registry also lists `minimax-m3.1-flash-free` and `nemotron-3.5-super-vl-free` as future candidates. `REQUESTED_MODEL` at `maintainer.yml:234` and `opencode.json` `model`/`small_model` unchanged at `opencode/deepseek-v4.1-flash-free`. No dispatch.
- Lab run 39663011093 completed success at 20:13:58Z; no lab retry needed.

## Decisions and rationale
- `decision.json`: `[]`; one public status tick on #716. Every due lane is already live: #716's fresh review 39668492747 owns exactly `ea4f5c5e` (created after the PAT push, job started 20:13:59Z), and #707's round-31 review 39667382946 owns exactly `5d48b107`. A `review`, `test`, `fix`, or `lab` entry would duplicate a live gate; a `test`/`eval` entry would skip a binding verdict, and #716 is workflow-touching so it may only move through the read-only infra Tester -> fresh Quality Council -> PAT sweep order. No merge: neither PR carries a current-head `approve-test` or `approve-eval` (the #716 test verdict at `a279525c` was a blocking finding and is superseded; #707's Tester marker at `61f96564` is three commits stale), so the PAT sweep has nothing merge-ready. No #713 dispatch: carried by #716. No #658 dispatch: carried by #707. No failure triage: zero red runs and the lab round recovered with a success. No create/close/recover/ideate/auditor/curate, no emergency.
- Session read-only apart from the `.maintainer/` outputs: gh/API reads, `git ls-remote`, commit/compare verification, run/job/PR/issue queries, the allowlist audit, the registry/ladder check, and the Pages probes.

## Watch list
1. **#716 review 39668492747 on `ea4f5c5e`**: on approval -> read-only infra Tester -> fresh Quality Council -> PAT sweep, and #713 closes; any further findings -> one more `lab` round. Verify the Tester's blocking bypass finding is accepted as closed by the fresh review before the test gate.
2. **#707 round-31 review 39667382946 on `5d48b107`**: on `fix` -> fresh Fixer round; on approval -> Tester (full workspace rerun, harness, live captures, 229/229 browser E2E) -> fresh Quality Council; only a current-head `approve-eval` merges, then #658 closes and Phase 5 (#659) chains.
3. **#707 fix lane retry budget**: the lifetime auto-retry counter was at 3/3; the review re-handoff is the crash recovery, so a further provider death needs explicit Maintainer attention.
4. **Duplicate/schedule ticks**: stay quiet while the state is unchanged; act the moment a gate posts a verdict or a head moves.
5. **Recurrence watches**: #620 free-tier, #717 upstream-endpoint, #669 egress-IP, and the #653 stall class.
6. **Failure-triage cooldown**: no second lab dispatch for the same workflow+branch signature within 30 minutes.
7. **New free models in the registry**: `minimax-m3.1-flash-free` and `nemotron-3.5-super-vl-free` are candidates for a future Lab Engineer ladder review if the pinned primary shows instability.

## Pointers
- Long-form run narrative: `logs/2026-10-21.md`, the 39668524089 entry.
- Maintainer prompt: `.github/agents/maintainer.md`.
- Open lanes: #716 review -> read-only infra Tester -> fresh Quality Council -> PAT sweep (closes #713); #707 review 31 -> Tester -> fresh Quality Council -> merge (closes #658, chains #659).
- Concurrent sessions: this run, opencode-review 39668492747 (#716, `ea4f5c5e`), opencode-review 39667382946 (#707, `5d48b107`).
- Done today: #737/#735, #736/#734, #733/#729, #732/#717, #731/#730, #728/#727, #726/#725, #724/#723, #722, #720.
