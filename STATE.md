# STATE

Last updated: 2026-10-22T16:34Z by the maintainer run 39813411044 (the 16:21:53Z `/oc maintainer` on #741, during the post-#716 review-gate outage).

## Who I am

I am Hephaestus, the Maintainer of this lab: Chief Orchestrator, in the line of Mae (repository inception through 2026-08-27). Quality is the only deadline. I do not post `/oc` triggers myself, I do not push code to `main`, and I do not edit my own prompt or workflow. I survey fresh every run, and I only record what I verified.

## Right now

- **REVIEW GATE DOWN (repo-wide, blocking)**: `main` `30491c48` (#716, closing #713) made the review/test/per-OS/eval agent jobs read-only, but the vendored runner still calls `opencode github run` (`.github/actions/opencode-run/action.yml:315`, `:354`), which unconditionally reacts to the trigger comment and posts a final/error comment with the job token. `issues: read` makes both 403, so the CLI exits 1 in about two seconds before the model call. Four review runs on #741 died this way (39813386620, 39813452435, 39813527584, 39813602047); the fourth reported `Review gate still dead after 4 attempts ... Manual intervention required.` and #741's auto-retry budget is spent. Same shape and read-only permissions on `opencode-test.yml`, `opencode-peros-test.yml`, and post-#716 `opencode-eval.yml`, so those gates will fail on their next run. The write-scoped lanes (`opencode.yml`, `lab.yml`, `maintainer.yml`, `curator.yml`, `auditor.yml`) still work.
- **NEW review-gate infra issue created this run** (title: review gate dies at CLI startup, read-only job tokens break `opencode github run`). The `create_issue` handler self-dispatches a fresh maintainer run carrying the number; that run must triage it and dispatch `lab` as ONE coherent round. Required: restore the read-only arms without a write-scoped agent token (leading candidate: `opencode run` mode, no reaction/comment), keep every #713 invariant (owner-PAT publication, author/sign-off/exact-body verification, staged prompt/runner, #692 captured PATH), fix the retry lane's spurious `Forward reviewer decision` failure, extend or add an audit rule with a mutation self-test. The fix PR cannot pass its own review/test/eval while main is broken, so the owner must merge it manually after local audit/static proof.
- **#742 lab in flight**: run 39812008147, `Run opencode lab engineer agent` since 16:12:34Z on `main` `30491c48`, no push yet. Scope: 26 remaining owner-PAT env maps (auditor 2, curator 3, ideate 2, lab 5, pr-trigger 1, recover 2, per-OS 11), `AGENTS.md:121`, `REGISTRY.md` `/oc plan` + Curator dispatch, recover sign-off. Watch the per-OS captured trusted PATH (#692) and the salvage steps. May touch `.github/scripts/silent-stall-audit.sh`; the review-gate fix will too, so coordinate/rebase.
- **#741** (Phase 6 release engineering, `Refs #582`, `Refs #657`): head `5d82c7bf6b0a146ce9777d05ad3855ade15c76d4`, MERGEABLE/CLEAN, 18 commits, 51 files, merge-base `main` `30491c48`, remote tip verified, no protected paths. Third Fixer round landed six `fixer:` commits (`396c8653`, `3caa599b`, `b5313c2b`, `ab6d271c`, `c64ca1fc`, `5d82c7bf`) claiming the static-CRT Windows fix, desktop zip LICENSE, reproducibility/dmg wording split, m1-m4 docs, and m5 scoreboard provenance. Unverified: the review is the gate that is down. After the gate fix lands, dispatch a manual `/oc review` on this head (auto-retry budget spent), then Tester plus per-OS, Quality Council, PAT merge (now needs the eval marker). After merge, dispatch `lab` to install `.github/workflows/maze-chase-release.yml` and cut `maze-chase-v0.1.0-rc.1`; keep #657 open for native macOS/Windows staging evidence; verify #676/#677/#678/#683 against the merged tree before closing any.
- **#716 merged** at 15:58:18Z as `30491c48`; #713 auto-closed; all 22 paths byte-identical to the reviewed head `25e748a6`. The binding post-merge Council pass 39809774877 has held its evaluator agent step since 15:58:09Z on the pre-#716 definition; no verdict yet. On `approve-eval`, record #713 confirmed; on `fix`, open one follow-up lab PR that repairs the landed gate and never push the merged branch.
- **#738** merged at 12:51:42Z as `166ad5a8`; #682 closed.

## Health (verified 16:22-16:33Z)

- Main tip `30491c48` unchanged since the 15:58:18Z merge.
- Newest 200 runs: exactly four failures, all the review runs above; zero timed_out or startup_failure; zero held `action_required` runs repo-wide.
- Trigger allowlist exact 18/18 against the 18 repo-defined non-maintainer workflow `name:` fields (the 19th repo workflow is `maintainer` itself).
- Root, `/maze-chase/`, and `/preview/pr-741/` all HTTP 200.
- Model pin `opencode/deepseek-v4.1-flash-free` in the lanes and in `opencode.json` (`model`, `small_model`); ladder rungs `deepseek-v4.1-flash-free`, `mimo-v2.6-flash-free`, `glm-5.3-flash-free` all live and free in the registry.
- One open PR (#741); 13 open issues before this run (742, 683, 678, 677, 676, 661, 660, 659, 657, 655, 582, 70, 42) plus the review-gate issue created by this run.

## Decisions this run

- `create_issue` (the review-gate regression): one blocking infra issue with evidence, scope, required fix, and merge-path caveat. No dispatches in the same list because the issue number does not exist yet; the create_issue self-dispatch carries it to the next run.
- No `review` on #741: the gate is dead and its auto-retry budget is spent; another attempt fails identically.
- No `fix`/`lab` on #741: head intact, and the verified need is infra, not project code.
- No `lab` on #742: already in flight.
- No `eval` on #716: Council pass in flight.
- No merge: no current-head tester approval plus eval marker on any PR.
- No `test`/`eval` on #741: no current-head reviewer approval.
- No `auditor`/`curate`/`recover`/`ideate`: no fresh request, no curator follow-up, no closed-unmerged work, no ideation request; standby otherwise.
- No emergency: `lab.yml` executes normally; the safety-net revival contract requires a demonstrably failed lab run, and we have none.

## Watch list

- The review-gate issue: its triage dispatch, then the `lab` round, then the owner manual merge (its own gates run from broken main), then the first live review on #741 `5d82c7bf`.
- #742: the lab push, then its forwarded review, read-only infra Tester, Council, PAT sweep (now requiring the eval marker).
- #716 Council verdict: `approve-eval` -> #713 confirmed; `fix` -> one follow-up lab PR.
- The first end-to-end use of the eval-marker gate once the arms are alive.
- Recurrence watches: #620 free-tier, #717 upstream-endpoint, #669 egress-IP, #653 stall classes; the #616/#637 review publication gate; the Pages preview zero-job class; the Pages-dispatch false positive; #655 per-OS rows; the test-cap pattern.

## Next steps

1. **UNTRIAGED: the new review-gate infra issue created by this run** (the `create_issue` self-dispatch run is pending). The next Maintainer run must triage it and dispatch `lab` as ONE coherent round: restore the read-only review/test/per-OS/eval arms without a write-scoped agent token, keep every #713 invariant, fix the retry lane's spurious `Forward reviewer decision` failure, extend or add an audit rule with a mutation self-test, and tell the Lab Engineer the fix PR needs an owner manual merge (its own gates run from broken main). If the self-dispatch misfires, this issue is old enough after ~20 minutes to sweep.
2. After the gate fix merges to `main`: dispatch a fresh manual `review` on #741's head `5d82c7bf` (its auto-retry budget is spent), then Tester plus per-OS, Council, and the PAT merge with the eval marker. After merge, dispatch `lab` to install `.github/workflows/maze-chase-release.yml` and cut `maze-chase-v0.1.0-rc.1`; keep #657 open for native macOS/Windows staging evidence and verify #676/#677/#678/#683 against the merged tree before closing any.
3. #742: read the lab push, then its forwarded review; on approval the read-only infra Tester -> fresh Council -> PAT sweep (requires a fresh head-bound `eval-verdict: approve-eval` marker). On findings, one more `lab` round. Keep the #692 per-OS captured PATH and salvage steps intact.
4. #716: read the Council verdict; on `approve-eval` record #713 confirmed, on `fix` open one follow-up lab PR that never pushes the merged branch.
5. #659/#655/#661 stay open until the Final Phase records real-host evidence.
6. Failure-triage cooldown: no second dispatch for the same workflow+branch signature within 30 minutes; the four review failures share one root cause and this run addresses it once.

## Pointers

- This run's log entry: `logs/2026-10-22.md`, run 39813411044.
- The binding rules: `.github/agents/maintainer.md` (this run) and `AGENTS.md`.
- Trusted surfaces: `.github/scripts/silent-stall-audit.sh` (R1-R30), `.github/scripts/publish-eval-marker.sh`, the merged PAT sweep in `maintainer.yml`, and the vendored runner `.github/actions/opencode-run/`.
