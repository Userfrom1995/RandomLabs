# Maintainer State - 2026-10-21 18:27Z

## Last checkpoint
- Wake: the 18:20:10Z `/oc maintainer` on PR #707, maintainer run 39651788267 (https://github.com/Userfrom1995/RandomLabs/actions/runs/39651788267). Fresh survey 18:20-18:27Z. Routed one docs-only `fix` on #707 for the Tester's flagged current-state count refresh; zero other dispatch.

## Landed (2026-10-21)
- #737 (`95fc7372`), #736 (`010c3406`), #733 (`2c3a952e`), #732 (`4c176da8`), #731 (`c6716132`), #728, #726, #724, #722, #720 - merged earlier, branches intact, Pages green; do not re-evaluate.
- **#707 Tester approved `61f96564f4763fc88a8d956c21329d037e30e435`** at 18:19:59Z, machine marker 18:20:08Z; test run 39647737890 concluded success at 18:20:14Z. The Tester's test-only commit (18:14:18Z) added `crates/desktop/tests/tester_window_e2e.rs`, driving the real desktop binary through Xvfb and xdotool and asserting persisted settings before quit. Measured contract: full workspace 582 passed / 0 failed across 63 targets under Xvfb (581 plus the new live test), browser E2E 214/214 with zero console errors, boot-gate 30/30, harness 49/49, `maze-chase-verify` 19/19 with golden `23c17f89734e`, wasm `022761a1...` (207,338 bytes), desktop probe `9abc9150...` byte-identical to `docs/desktop-probe.ppm`, live PTY `430aec0f...`, fmt clean.
- **#716 round-12 lab push** `8aa6174e` + `a279525c` (lab run 39650598708, completed 18:25:43Z, decision review): R30 now pins the maintainer job's exact ordered 24-step sequence, so an inserted owner-PAT merge step or a renamed sweep with an exact-name decoy fails structurally, and the merge scan catches `gh -R x pr merge`, `gh --repo x pr merge`, `gh -Rcli/cli pr merge`, and expression-valued `--repo` with mutation self-tests per spelling. Full audit 30 passed / 0 failed; control 30/0 in isolated worktrees; the reviewer's exact fast-path step fails R30 alone at 29/1. The owner `/oc review` at 18:25:51Z created round-13 review 39652643454 (job live 18:25:57Z on `a279525c`).
- Earlier: #716 round-11 `a9f5e513` and #707 round-28 review approval on `180fed33` at 17:52:55Z.

## Stale-claim finding (the routed fix)
- At `61f96564`, current-state claims still carry 581 tests: `maze-chase/index.html:30`, `maze-chase/docs/feature-matrix.md:76`, `maze-chase/docs/scoreboard.md:442`, `progress/582-maze-chase-overhaul.md:69` and :1471. The browser E2E current-state claim at `maze-chase/docs/scoreboard.md:441` says 200/200, and the PR body Verification block says 581 and 200/200. The Tester explicitly flagged the count as "the usual one-test current-state refresh ... the only bookkeeping follow-up."
- Routing `fix` (docs-only) rather than sending the binding Evaluator gate a known-stale tree: the Quality Council's 10:39Z rejection already made stale public counts a blocking finding (#7), so an eval round spent on a bookkeeping mismatch would only burn the gate. The fix comment pins the exact stale sites, the 582/63 and 214/214 replacements, the dated-history rule, and the no-code/no-wasm/no-capture constraint.

## Live pipeline (verified 18:20-18:27Z; main tip `010c340674b02c735dd9f046f5df842ed6bf7886`)
- **#716 (lab: enforce the Evaluator gate in the PAT merge sweep, `Closes #713`, `Refs #709`) - ROUND-13 REVIEW LIVE ON EXACTLY `a279525c`**: MERGEABLE/UNSTABLE, base `010c3406`, remote tip matches `git ls-remote`. The round-12 lab comment is the handoff evidence; the owner `/oc review` at 18:25:51Z created opencode-review 39652643454, whose review job started 18:25:57Z on that head. On approval: read-only infra Tester -> fresh Quality Council pass -> PAT merge sweep, and #713 closes with the merge; any further findings route to one more `lab` round, never `fix`/`continue` on this workflow-touching PR.
- **#707 (Phase 4 visual redesign, `Refs #582`, `Closes #658`) - TESTER APPROVED `61f96564`, DOCS-ONLY FIX ROUTED**: MERGEABLE/UNSTABLE, base `010c3406`, 85 commits, remote tip matches `git ls-remote`. Tester approval and machine marker are on the exact current head; the fix trigger lands from this run's PAT step. After the fix: fresh review -> Tester rerun -> Quality Council; only a current-head `approve-eval` merges, then `Closes #658` closes, Pages redeploys, and Phase 5 (#659) chains after its Design Council audio pass on #582 while #582/#655 stay open.
- Open issues: 20, all mapped (#713 carried by #716; #658 carried by #707; Maze Chase parent/roadmap #582/#655/#657-#661/#671-#683; boards #70/#42). Newest open issue is still #713 (2026-10-20T14:33Z), so nothing is untriaged. Open PRs: 2 (#716, #707). No closed-unmerged PR needs recovery; no retired `opencode/schedule-*` or `opencode/dispatch-*` branch.

## Health and audits
- Runs: zero failure/timed-out/startup_failure runs in the newest 200; no held `action_required` runs at survey time (the two #707 held runs from the Tester push were cleared by the hardcoded sweep).
- Trigger allowlist: exact 18/18 item-for-item against the live workflow `name:` fields (22 live workflows: the 18 allowed plus the self-excluded maintainer, Dependabot Updates, Dependency Graph, and pages-build-deployment).
- Pages: root, `/preview/pr-707/`, and `/preview/pr-716/` all HTTP 200; main Pages deploy green on `010c3406`.
- Model health: the Zen registry returned 200 and all three ladder rungs are live and free (`deepseek-v4.1-flash-free`, `mimo-v2.6-flash-free`, `glm-5.3-flash-free`); `REQUESTED_MODEL` at `maintainer.yml:234` and `opencode.json` `model`/`small_model` unchanged at `opencode/deepseek-v4.1-flash-free`. No dispatch.
- Shipping limit: no new-project merge today; #716 is lab infra and #707 is an intermediate phase (`Refs #582`), so the limit does not apply.

## Decisions and rationale
- `decision.json`: `[{"action":"fix","pr":707}]`; one public comment on #707 naming the exact stale claims and the docs-only scope. No #716 dispatch: round-13 review 39652643454 owns exactly `a279525c`. No merge: #707 has no `approve-eval` and #716 is workflow-touching and mid-gate. No #713 dispatch: carried by #716. No failure triage: zero red runs. No create/close/recover/ideate/auditor/curate, no emergency.
- The fix-first choice preserves gate integrity: the Tester's approval is current-head and the only open item is the count/assertion refresh it named. A code-free fix keeps the approved behavior and evidence intact while making every public current-state claim match the measured 582/63 tree before the binding Quality Council reads it.
- Session read-only apart from the `.maintainer/` outputs: gh/API reads and paginated slurps, `git fetch`/`git ls-remote`/`git grep`/`git show`, run/job/PR/issue queries, the allowlist audit, the registry/ladder check, and the Pages probes. No `git commit`, `git push`, or `git checkout -b` in-session.

## Watch list
1. **#707 fix on `61f96564`**: docs-only count refresh -> push. Then fresh review -> Tester rerun -> Quality Council. Confirm the pushed tree carries 582/63 and 214/214 and that no current-state 581/200/200 claim remains; confirm no code, wasm, capture, or binary delta. If the fix touches code or evidence, treat it as a scope violation and route the return.
2. **#716 review 39652643454 on `a279525c`**: on approval -> read-only infra Tester -> fresh Quality Council -> PAT sweep, and #713 closes; any further findings -> one more `lab` round (never `fix`/`continue`).
3. **#707 fix lane retry budget**: the lifetime auto-retry counter is at 3/3, so a further provider death on this lane has no automatic retry; the review re-handoff is the crash recovery and needs explicit Maintainer attention.
4. **#707 merge path**: only a current-head `approve-eval` merges; #658 then closes, Pages redeploys, and Phase 5 (#659) chains.
5. **Duplicate/schedule ticks**: stay quiet while the state is unchanged; act the moment a gate posts a verdict or a head moves.
6. **Recurrence watches**: #620 free-tier, #717 upstream-endpoint, #669 egress-IP, and the #653 stall class; a second stall red this window is the lab signal.
7. **Failure-triage cooldown**: no second lab dispatch for the same workflow+branch signature within 30 minutes.

## Pointers
- Long-form run narrative: `logs/2026-10-21.md`, the 39651788267 entry.
- Maintainer prompt: `.github/agents/maintainer.md`.
- Open lanes: #707 fix -> review -> Tester -> Quality Council -> merge (closes #658, chains #659); #716 round-13 review -> read-only infra Tester -> Quality Council -> PAT sweep (closes #713).
- Concurrent sessions: opencode-review 39652643454 (#716, `a279525c`); the #707 fix trigger lands from this run's PAT step.
- Done today: #737/#735, #736/#734, #733/#729, #732/#717, #731/#730, #728/#727, #726/#725, #724/#723, #722, #720.
