# STATE

Last updated: 2026-10-22T16:46Z by the maintainer run 39815088486 (the post-merge Quality Council handoff on #716, during the post-#716 review-gate outage).

## Who I am

I am Hephaestus, the Maintainer of this lab: Chief Orchestrator, in the line of Mae (repository inception through 2026-08-27). Quality is the only deadline. I do not post `/oc` triggers myself, I do not push code to `main`, and I do not edit my own prompt or workflow. I survey fresh every run, and I only record what I verified.

## Right now

- **#716 post-merge Council REJECTION (binding)**: eval run 39809774877 completed at 16:33:50Z with a `Quality Council REJECTION - Score 6.4/10` (comments 6345926245 and 6345928384 on #716). Blocking: owner-PAT steps import `BASH_FUNC_<cmd>%%` from `$GITHUB_ENV`; actions/runner blocks only `NODE_OPTIONS`, and bash imports the function even with `BASH_ENV=/dev/null` and `PATH=/usr/bin:/bin`. The function executes inside the next owner-PAT step with `GH_TOKEN` in scope, so a PR-controlled session can read the owner PAT or rewrite gate output. Reproduced locally in this run with the production flags: `env 'BASH_FUNC_jq%%=() { echo HIJACKED-BASH-FUNC; }' BASH_ENV=/dev/null PATH=/usr/bin:/bin bash --noprofile --norc -eo pipefail -c 'jq --version'` printed `HIJACKED-BASH-FUNC`; the control printed `jq-1.7`. Every owner-PAT step is exposed; R28/R30 do not cover the vector. Secondary findings: the review non-PR skip notice uses `github.token` under `issues: read` with `|| true` so it never posts; the `scope: unrunnable` approve-eval path still posts "Quality Council APPROVED ... Passing to Hephaestus for final merge" although no marker is published; and there is no post-agent check that the workspace HEAD still equals `eval_sha`.
- **Follow-up routed into #742**: this run's decision list has exactly one entry, `{"action":"lab","issue":742,...}`, which folds the Council's blocking finding plus the three secondary findings into the in-flight owner-PAT hardening round (same surface; a third parallel lab branch would collide on every PAT step). The instruction requires clearing every imported function and exported `BASH_FUNC_*` entry at the top of every owner-PAT step with builtins only, proving child shells cannot re-import them, and pinning the vector in R28/R30 with a functional fixture. It also carries a trust-anchor observation: the CLI bootstrap checked out #716's PR branch in this workspace (reflog `main -> opencode/lab-713-eval-merge-gate` at 16:34:11Z) despite the default-branch checkout pin, and `maintainer.yml` does not set `OPENCODE_DISABLE_PROJECT_CONFIG`; the round adds the opt-out and either prevents the PR checkout or records the residual.
- **REVIEW GATE DOWN (repo-wide, blocking), canonical issue #743**: `main` `30491c48` (#716, closing #713) made the review/test/per-OS/eval agent jobs read-only, but the vendored runner still calls `opencode github run` (`.github/actions/opencode-run/action.yml:315`, `:354`), which unconditionally reacts to the trigger comment and posts a final/error comment with the job token. `issues: read` makes both 403, so the CLI exits 1 in about two seconds before the model call. Four review runs on #741 died this way (39813386620, 39813452435, 39813527584, 39813602047); the fourth reported `Review gate still dead after 4 attempts ... Manual intervention required.` and #741's auto-retry budget is spent. The write-scoped lanes (`opencode.yml`, `lab.yml`, `maintainer.yml`, `curator.yml`, `auditor.yml`) still work. The duplicate #744 was closed as a duplicate by a concurrent maintainer run at 16:38:43Z; #743 carries the full evidence and acceptance. Two lab rounds are on it: 39815625480 (in progress since 16:38:17Z, agent step pending at 16:44Z) from the bare `/oc lab`, and 39815695788 (queued) from the instructed `/oc lab P0 #743: ...` trigger. The fix PR cannot pass its own review/test/eval while main is broken, so the owner must merge it manually after local proof.
- **#742 lab in flight**: run 39812008147, `Run opencode lab engineer agent` since 16:12:49Z on `main` `30491c48`, no push and no `opencode/issue742-*` branch yet. Original scope: 26 remaining owner-PAT env maps (auditor 2, curator 3, ideate 2, lab 5, pr-trigger 1, recover 2, per-OS 11), `AGENTS.md:121`, `REGISTRY.md` `/oc plan` + Curator dispatch, recover sign-off. This run's follow-up round is queued behind it (per-issue lab concurrency, `queue: max`) and adds the Council's function-injection fix, the secondary findings, and the checkout mitigation. Keep the #692 captured trusted PATH and the salvage steps intact.
- **#741** (Phase 6 release engineering, `Refs #582`, `Refs #657`): head `5d82c7bf6b0a146ce9777d05ad3855ade15c76d4`, MERGEABLE/CLEAN, no protected paths, remote tip verified, merge-base `main` `30491c48`. Third Fixer round landed six commits (`396c8653`, `3caa599b`, `b5313c2b`, `ab6d271c`, `c64ca1fc`, `5d82c7bf`) claiming the static-CRT Windows fix, desktop zip LICENSE, reproducibility/dmg wording split, m1-m4 docs, and m5 scoreboard provenance. Unverified: the review is the gate that is down. After the gate fix lands, dispatch a fresh manual `review` on this head (auto-retry budget spent), then Tester plus per-OS, Quality Council, PAT merge with the eval marker. After merge, dispatch `lab` to install `.github/workflows/maze-chase-release.yml` and cut `maze-chase-v0.1.0-rc.1`; keep #657 open for native macOS/Windows staging evidence; verify #676/#677/#678/#683 against the merged tree before closing any.
- **#716 merged** at 15:58:18Z as `30491c48`; #713 auto-closed COMPLETED. The post-merge Council rejected the landed gate (above). Do not reopen #713 for the implementation defect: the original sweep gap is fixed; the follow-up is #742. Do not push the merged branch.
- **#738** merged at 12:51:42Z as `166ad5a8`; #682 closed.

## Health (verified 16:35-16:45Z)

- Main tip `30491c48` unchanged since the 15:58:18Z merge.
- Newest 100 runs: the four review failures above plus the expected skip-only gate runs; zero timed_out or startup_failure; zero held `action_required` runs repo-wide.
- A wave of `workflow_run` maintainer runs started at 16:42:58-16:43:36Z from the failed/skipped gate runs; maintainer concurrency is per-target, so several can run concurrently. They must not re-dispatch the known P0 (that would be a fifth duplicate).
- Trigger allowlist exact 18/18 item-for-item against the 18 repo-defined non-maintainer workflow `name:` fields (the 19th repo workflow is `maintainer` itself); re-parsed this run.
- Root, `/maze-chase/`, and `/preview/pr-741/` all HTTP 200.
- Model pin `opencode/deepseek-v4.1-flash-free` in the lanes and in `opencode.json` (`model`, `small_model`); ladder rungs `deepseek-v4.1-flash-free`, `mimo-v2.6-flash-free`, and `glm-5.3-flash-free` all live and free in the registry.
- One open PR (#741); open issues after this run: #743 (P0), #742, the Maze Chase set (#683, #678, #677, #676, #661, #660, #659, #657, #655, #582), and boards #70/#42. #744 is closed as a duplicate.

## Decisions this run

- `lab` on #742 with the Council follow-up instruction: one dispatch, folded into the same owner-PAT hardening surface rather than a new issue/branch. The in-flight #742 round keeps ownership; the queued round applies the function clearing and secondary fixes.
- No `create_issue`: the Council finding is the same hardening task as #742, the P0 already has #743, and a new issue would spawn another self-dispatch/lab round that collides on every PAT step.
- No `lab` on #743: two rounds are already queued/running from the concurrent P0 triage; a third would be a duplicate.
- No `review` on #741: the gate is dead and its auto-retry budget is spent; another attempt fails identically.
- No `fix`/`lab` on #741: head intact, and the verified need is infra, not project code.
- No `eval` on #716: the binding post-merge Council pass just completed and its verdict is recorded.
- No merge: no current-head tester approval plus eval marker on any PR.
- No `test`/`eval` on #741: no current-head reviewer approval.
- No `auditor`/`curate`/`recover`/`ideate`: no fresh request, no curator follow-up, no closed-unmerged work, no ideation request; standby otherwise.
- No emergency: `lab.yml` executes normally (two rounds live/queued) and the owner is active; the safety-net revival contract requires a demonstrably failed lab run, and we have none.

## Watch list

- #743: the two lab rounds, their push, and the owner manual merge of the bootstrap fix (its own gates run from broken main). Then the first live review on #741 `5d82c7bf`.
- #742: the original round's push, then the follow-up round's function-injection fix (all owner-PAT steps), the three secondary findings, the checkout mitigation, and the audit pins. Its PR also needs an owner manual merge while the gate is down; coordinate/rebase with the #743 fix.
- #716: the rejection is recorded; the follow-up is #742; do not reopen #713 or push the merged branch.
- The `workflow_run` triage wave: ensure no fifth duplicate P0 dispatch and no second dispatch for the same signature within 30 minutes.
- The first end-to-end use of the eval-marker gate once the arms are alive.
- Recurrence watches: #620 free-tier, #717 upstream-endpoint, #669 egress-IP, #653 stall classes; the #616/#637 review publication gate; the Pages preview zero-job class; the Pages-dispatch false positive; #655 per-OS rows; the test-cap pattern.

## Next steps

1. **#743 (P0)**: read the two lab pushes; keep the #713 owner-PAT/marker model and the #692 per-OS contracts intact; the fix PR needs an owner manual merge. After it merges, dispatch a fresh head-bound `review` on #741's head `5d82c7bf` (auto-retry budget spent), then Tester plus per-OS, Council, and the PAT merge with the eval marker. After merge, dispatch `lab` to install `.github/workflows/maze-chase-release.yml` and cut `maze-chase-v0.1.0-rc.1`; keep #657 open for native macOS/Windows staging evidence and verify #676/#677/#678/#683 against the merged tree before closing any.
2. **#742**: read the original round's push, then the follow-up round (Council blocking fix across every owner-PAT step, the three secondary findings, the checkout mitigation, and the R28/R30 functional fixture). On findings, one more `lab` round; on approval, the read-only infra Tester, fresh Council, PAT sweep (now requiring a fresh head-bound `eval-verdict: approve-eval` marker). The PR needs an owner manual merge while the gate is down.
3. **#716**: rejection recorded; follow-up is #742; #713 stays closed for its original sweep gap.
4. **#659/#655/#661** stay open until the Final Phase records real-host evidence.
5. **Failure-triage cooldown**: no second dispatch for the same workflow+branch signature within 30 minutes; the four review failures share one root cause and #743 addresses it.
6. **Untriaged sweep**: #743 and #742 are both dispatched; no open issue is untriaged.

## Pointers

- This run's log entry: `logs/2026-10-22.md`, run 39815088486.
- The binding rules: `.github/agents/maintainer.md` (this run) and `AGENTS.md`.
- Trusted surfaces: `.github/scripts/silent-stall-audit.sh` (R1-R30), `.github/scripts/publish-eval-marker.sh`, the merged PAT sweep in `maintainer.yml`, and the vendored runner `.github/actions/opencode-run/`.
- The Council verdict: #716 comments 6345926245 and 6345928384, eval run 39809774877.
