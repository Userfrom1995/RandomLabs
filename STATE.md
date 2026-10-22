# Maintainer State - 2026-10-22 11:34Z

## Last checkpoint
- Wake: `created` issue_comment `/oc maintainer` on #738 at 11:26:41Z, seconds behind the owner's 11:26:29Z `/oc review` and the Fixer's doc-only push `45c89f545` at 11:26:22Z for the Tester's fix round. Fresh survey 11:26-11:34Z. DISPATCH: none; one status tick on #738. Live: opencode-review 39770601282 on #738 `45c89f545` since 11:26:34, and Lab Engineer 39764467526 on #716 `88a10129` since 10:48:03. main tip `64384e2232e4373873e68e8936fa77f85abe55e2`, linear and unchanged.

## Live pipeline (verified 11:26-11:34Z; main tip `64384e2232e4373873e68e8936fa77f85abe55e2`)
- **#738 (Phase 5 sound design overhaul, `Refs #582`, `Refs #659`) - TESTER-FIX HEAD `45c89f545`, FRESH REVIEW LIVE ON IT**: head `45c89f5459728840a4babdfb8e12300b57c20980` (MERGEABLE/CLEAN; 25 commits; 41 files; remote tip matches; main is an ancestor). The Fixer's doc-only commit updates `docs/scoreboard.md` to 279 browser assertions (the Tester's only required fix at 11:17Z). opencode-review 39770601282 has its review job live on exactly this head since 11:26:34Z; no verdict yet. Committed wasm re-verified independently at this head: 212,438 bytes, sha256 `5bcceec8356d8659d53405c593df744ba3c980c8b31582358313a53f5a2f72db`. The PR body is current (594 tests across 63 targets, 279 browser assertions, 17 tester-audio checks, 0.2 us/tick, `Refs #659`), so #659 stays OPEN for the per-layer real-host listening. #682's three acceptance items are implemented on the tree; verify and close on the merged tree.
- **#716 (lab: enforce the Evaluator gate in the PAT merge sweep, `Closes #713`, `Refs #709`) - HEAD `88a10129` STABLE, SECOND LAB ROUND LIVE**: head `88a101292b9b61a3b9cbe912ef6cc37791b7bbe6` (MERGEABLE/CLEAN; 52 commits; remote tip matches). Lab Engineer 39764467526 has been in its agent step since 10:48:03 (inside its 150-minute cap under the 180-minute job) for the 10:37Z review's three blocking findings (git hooks in owner-PAT steps; `$GITHUB_ENV`/`BASH_ENV` injection; job-level env bypassing `check_owner_pat_paths`) plus the sudo instance of the same owner-PAT-reachability class recovered from the 11:05Z publication miss. It will push and forward its own fresh review; the pending Lab Engineer rows 39765789636/39765813457 are skip-only siblings. No `/oc approve-test` and no `eval-verdict: approve-eval` at any current head, so the PAT sweep cannot merge. Workflow-touching: never `fix`/`continue`.
- **#713 intake check**: carried by #716; no untriaged content. The deferred `AGENTS.md`/`REGISTRY.md`/`opencode-recover.yml` doc-drift lab round waits for #716 to land so it does not race the workflow surface.

## Health and audits
- Runs: the only failure in the newest 120 is the 10:47Z opencode-review 39765789606 on #716 (publication miss; verdict recovered and published at 11:14Z). Zero held `action_required` runs repo-wide. The cancelled/skipped maintainer rows are the designed homogeneous single-slot supersessions; the 11:26 fan-out skip rows are non-trigger siblings.
- Trigger allowlist: exact 18/18 item-for-item against the 19 live workflow `name:` fields (the 18 allowed plus the self-excluded maintainer).
- Pages: root, `/docs/`, `/maze-chase/`, `/preview/pr-738/`, and `/preview/pr-716/` all HTTP 200.
- Recovery: last 8 closed PRs are all merged; no closed-unmerged work.
- Issues: 14 open, all mapped; newest open is #713 (carried by #716); zero untriaged (the Maze Chase child issues are per-phase scope under #582).
- Model health: pins unchanged at `opencode/deepseek-v4.1-flash-free` for `model`, `small_model`, and `REQUESTED_MODEL`; ladder rungs `deepseek-v4.1-flash-free`, `mimo-v2.6-flash-free`, `glm-5.3-flash-free` all live and free in the registry.

## Decisions and rationale
- `decision.json = []` plus one status tick on #738: the first maintainer handoff on the Tester-fix head; it records the verified wasm and the gate order.
- No `review` on #738: opencode-review 39770601282 is live on exactly `45c89f545`.
- No `test` on #738: the fresh review must report first; the review workflow forwards `/oc test` on approval.
- No `fix`/`eval`/merge on #738: no current-head reviewer approval, tester approval, or eval verdict on `45c89f545`.
- No `lab` on #716: round 39764467526 is live on exactly `88a10129`; a duplicate would stack.
- No `review` on #716: the in-flight lab push will forward its own fresh review, and the 10:47Z review died at publication on this exact head inside the 30-minute failure cooldown.
- No `test`/`eval` on #716: workflow-touching with no current-head tester approval. No `fix`/`continue`: workflow-touching PR.
- No create/close/recover/ideate/auditor/curate: zero untriaged content, no curator follow-up, no closed-unmerged work, no ideation request, standby otherwise. No emergency: production is moving and `lab.yml` executes normally.
- Session read-only apart from the `.maintainer/` outputs: gh/API reads, `git ls-remote`, run/job queries, the parsed allowlist audit, the registry/ladder check, an independent wasm download and hash, and the Pages probes.

## Watch list
1. **#738 review on `45c89f545`**: on approval the workflow forwards `/oc test`; the Tester must re-run the 320x480 and 390 mixer/chip geometry plus the full suite and live entrypoints. On a current-head `approve-test`, route `{"action":"eval","pr":738}`. On a current-head `approve-eval`: merge `--rebase` (no `--delete-branch`), keep #659 OPEN, verify and close #682 on the merged tree if satisfied, confirm Pages, then chain Phase 6 with `{"action":"build","issue":582}` (`Closes #657`). A second same-way Tester cap death -> `lab` cap raise with R25 updated.
2. **#716 in-flight lab 39764467526**: on its push H3 it forwards a fresh review; read the verdict against H3 and route only genuinely new findings. If the review misses publication again, restart with a head-bound manual `review` (the lifetime auto-retry budget is spent). On approval: read-only infra Tester -> fresh Quality Council -> PAT merge sweep (closes #713).
3. **Deferred lab round** after #716 lands: `AGENTS.md` model-line drift, `REGISTRY.md` missing `/oc plan` alias and Curator dispatch, and the `opencode-recover.yml` double-spaced sign-off (re-verify against the landed tree first).
4. **Recurrence watches**: #620 free-tier, #717 upstream-endpoint, #669 egress-IP, #653 stall classes; the #616/#637 review publication gate; Pages preview zero-job class; #655 per-OS rows; #682 merge-tree verification; the test-cap pattern (second cap death -> lab).

## Pointers
- Long-form run narrative: `logs/2026-10-22.md`, the 39770625450 entry.
- Open lanes: #738 review on `45c89f545` -> Tester -> Quality Council -> merge (keep #659 open, verify/close #682, chain Phase 6 `Closes #657`); #716 lab H3 -> fresh review -> Tester -> Quality Council -> PAT sweep (closes #713).
- Done 2026-10-22: #740/#739 merged as `64384e22`; earlier #707/#658 as `d207655e`; #738 Tester rounds at `ec6b4c71` and the doc-only `45c89f545`.
- Done 2026-10-21: #737/#735, #736/#734, #733/#729, #732/#717, #731/#730, #728/#727, #726/#725, #724/#723, #722, #720.
