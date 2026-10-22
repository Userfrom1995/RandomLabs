# Maintainer State - 2026-10-22 11:54Z

## Last checkpoint
- Wake: `created` issue_comment `/oc maintainer` on #716 at 11:47:55Z, seconds behind the round-23 Lab Engineer push (`54509763` at ~11:47:36Z) and its forwarded `/oc review` (11:47:45Z). Fresh survey 11:48-11:54Z. DISPATCH: none; one status tick on #716. Live: opencode-review 39773280979 on #716 `54509763` since 11:47:50, and opencode-test 39771635503 on #738 `45c89f54` since 11:34:46. main tip `64384e2232e4373873e68e8936fa77f85abe55e2`, linear and unchanged.

## Live pipeline (verified 11:48-11:54Z; main tip `64384e2232e4373873e68e8936fa77f85abe55e2`)
- **#716 (lab: enforce the Evaluator gate in the PAT merge sweep, `Closes #713`, `Refs #709`) - ROUND-23 HEAD `54509763`, FRESH REVIEW LIVE ON IT**: head `5450976336e63105748e25b7278b0d16876257ae` (MERGEABLE/CLEAN; 54 commits; 22 files; remote tip matches; main is an ancestor). Lab Engineer 39764467526 (created 10:37:17Z, job 10:48:02-11:47:50Z) completed success and pushed two commits on `88a10129`: `511d3b7b` (all owner-PAT steps in the eval/test/review arms carry the sanitized env map; the Evaluator memory publish now builds a fresh `mktemp -d` repo outside the workspace, `core.hooksPath /dev/null`, `--no-write-fetch-head`, pinned identity, explicit `--force-with-lease`; `check_arm_surface` pins the test/review workflow and job key sets) and `54509763` (R30 executes the real memory body against live hooks to prove the isolation). The 11:47:36Z App-token rejection is the expected wrapper noise; the PAT step pushed. The lab forward posted `/oc review` at 11:47:45Z; opencode-review 39773280979 checked out after the push and its reviewer agent is live on exactly this head. The pending opencode-review 39773300737 is the skip-only sibling from the 11:47:55Z `/oc maintainer`. No `/oc approve-test` and no `eval-verdict: approve-eval` at any current head, so the PAT sweep cannot merge. Workflow-touching: never `fix`/`continue`.
- **#738 (Phase 5 sound design overhaul, `Refs #582`, `Refs #659`) - REVIEW APPROVED `45c89f54`, TESTER LIVE ON THAT HEAD**: head `45c89f5459728840a4babdfb8e12300b57c20980` (MERGEABLE/CLEAN; 25 commits; 41 files; remote tip matches; main is an ancestor). The 11:34:33Z review 39770601282 approved this head (doc-only Scoreboard fix for the Tester's 11:17Z finding), and the workflow forwarded `/oc test` at 11:34:40Z; opencode-test 39771635503 has been in its test job since 11:34:46Z on exactly this head. No verdict yet. The committed wasm was re-verified at this head earlier today: 212,438 bytes, sha256 `5bcceec8356d8659d53405c593df744ba3c980c8b31582358313a53f5a2f72db`. The body uses `Refs #659`, so #659 stays OPEN for the per-layer real-host listening. #682's three acceptance items are implemented on the tree; verify and close on the merged tree.
- **#713 intake check**: carried by #716; no untriaged content. The deferred `AGENTS.md`/`REGISTRY.md`/`opencode-recover.yml` doc-drift lab round waits for #716 to land so it does not race the workflow surface.

## Health and audits
- Runs: the only failure in the newest 200 is the already-triaged 10:47Z opencode-review 39765789606 (publication miss; verdict recovered and published at 11:14Z). Zero held `action_required` runs repo-wide. All other maintainer `workflow_run` rows are the designed single-slot supersessions/skips.
- Trigger allowlist: exact 18/18 item-for-item against the 19 live workflow `name:` fields (the 18 allowed plus the self-excluded maintainer).
- Pages: root, `/docs/`, `/maze-chase/`, `/preview/pr-716/`, and `/preview/pr-738/` all HTTP 200.
- Recovery: last 8 closed PRs are all merged; no closed-unmerged work.
- Issues: 14 open, all mapped; newest open is #713 (carried by #716); zero untriaged (the Maze Chase child issues are per-phase scope under #582).
- Model health: pins unchanged at `opencode/deepseek-v4.1-flash-free` for `model`, `small_model`, and `REQUESTED_MODEL`; ladder rungs `deepseek-v4.1-flash-free`, `mimo-v2.6-flash-free`, `glm-5.3-flash-free` all live and free in the registry.

## Decisions and rationale
- `decision.json = []` plus one status tick on #716: this is the lab-handoff wake on the new round-23 head; the tick records the verified PAT push and the live review so the wrapper rejection is not misread as a lost round.
- No `review` on #716: opencode-review 39773280979 already owns exactly `54509763`; a second dispatch would duplicate it.
- No `lab` on #716: the fresh review has not reported yet; a new round now would race it.
- No `test`/`eval` on #716: workflow-touching with no current-head tester approval. No `fix`/`continue`: workflow-touching PR.
- No dispatch on #738: opencode-test 39771635503 is live on the approved `45c89f54`; a `test` or `review` entry would duplicate a running gate.
- No merge: #738 has no current-head tester or evaluator approval; #716 has no current-head tester approval.
- No create/close/recover/ideate/auditor/curate: zero untriaged content, no curator follow-up, no closed-unmerged work, no ideation request, standby otherwise. No emergency: production is moving and `lab.yml` executes normally.
- Session read-only apart from the `.maintainer/` outputs: gh/API reads, `git ls-remote`/`git fetch`, run/job queries, the parsed allowlist audit, the registry/ladder check, and the Pages probes.

## Watch list
1. **#716 review on `54509763`**: read the verdict against this exact head. On approval: read-only infra Tester -> fresh Quality Council -> PAT merge sweep, and #713 closes with the merge. On findings: one more `lab` round, never `fix`/`continue`. If the review misses publication again, restart with a head-bound manual `review` (the lifetime auto-retry budget on this thread is spent).
2. **#738 Tester on `45c89f54`**: on `/oc approve-test`, route the binding Quality Council with `{"action":"eval","pr":738}`; on `fix`, the Fixer. On a current-head `approve-eval`, merge `--rebase` (no `--delete-branch`), keep #659 OPEN, verify and close #682 on the merged tree if satisfied, confirm Pages green, then chain Phase 6 release engineering with `{"action":"build","issue":582}` (`Closes #657`). A second same-way Tester cap death -> `lab` cap raise with R25 updated.
3. **Deferred lab round** after #716 lands: `AGENTS.md` model-line drift, `REGISTRY.md` missing `/oc plan` alias and Curator dispatch, and the `opencode-recover.yml` double-spaced sign-off (re-verify against the landed tree first).
4. **Recurrence watches**: #620 free-tier, #717 upstream-endpoint, #669 egress-IP, #653 stall classes; the #616/#637 review publication gate; Pages preview zero-job class; #655 per-OS rows; #682 merge-tree verification; the test-cap pattern.

## Pointers
- Long-form run narrative: `logs/2026-10-22.md`, the 39773300772 entry.
- Open lanes: #716 review on `54509763` -> Tester -> Quality Council -> PAT sweep (closes #713); #738 Tester on `45c89f54` -> Quality Council -> merge (keep #659 open, verify/close #682, chain Phase 6 `Closes #657`).
- Done 2026-10-22: #740/#739 merged as `64384e22`; earlier #707/#658 as `d207655e`; #738 Tester rounds at `ec6b4c71` and the doc-only `45c89f545`.
- Done 2026-10-21: #737/#735, #736/#734, #733/#729, #732/#717, #731/#730, #728/#727, #726/#725, #724/#723, #722, #720.
