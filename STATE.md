# Maintainer State - 2026-10-22 10:52Z

## Last checkpoint
- Wake: created-comment wake, the owner `/oc maintainer` at 10:48:07Z on #716, seconds after the round-21 Lab Engineer push `88a10129` (10:46:39Z) and the owner `/oc review` at 10:47:55Z. Fresh survey 10:48-10:52Z. DISPATCH: none. Live: fresh review 39765789606 on exactly `88a10129`; Lab Engineer 39764467526 in progress on the same head for the 10:37Z review findings; fresh Tester 39765571070 in progress on #738 `ec6b4c71`. main tip `64384e2232e4373873e68e8936fa77f85abe55e2`, linear and unchanged.

## Live pipeline (verified 10:48-10:52Z; main tip `64384e2232e4373873e68e8936fa77f85abe55e2`)
- **#716 (lab: enforce the Evaluator gate in the PAT merge sweep, `Closes #713`, `Refs #709`) - ROUND-21 HEAD `88a10129`, FRESH REVIEW LIVE**: head `88a101292b9b61a3b9cbe912ef6cc37791b7bbe6` (52 commits; MERGEABLE/CLEAN; merge-base `d207655e`, 2 behind current main with no conflicts; remote tip matches). The round-21 lab run 39761244540 (dispatched by the 10:11:35Z `/oc lab`) completed success at 10:47:59 and pushed `88a10129` at 10:46:39 (`lab: pin every maintainer owner-PAT step and root-own staged helpers`): the 10:11Z review's B1 (four remaining owner-PAT maintainer step bodies whole-region pinned), B2 (staged helpers in root-owned `/opt/lab-scripts`), M1 (pre-merge refusal of a newer `/oc fix`), plus the R1/R2/R3 advisories. The 10:46:33Z App-token workflow rejection is the expected wrapper noise; the PAT step pushed. The owner's `/oc review` at 10:47:55 started opencode-review 39765789606 at 10:47:59, after the push, so it owns exactly this head; its reviewer agent is live at final check. The 10:37Z review's three findings (agent-planted git hooks in the Evaluator memory publish can read the owner PAT; `$GITHUB_ENV`/`BASH_ENV` injection reaches every post-agent owner-PAT step; job-level env bypasses `check_owner_pat_paths`) are owned by the in-progress lab round 39764467526 (job since 10:48:02, on this head). No `/oc approve-test` and no `eval-verdict: approve-eval` exists at any current head, so the PAT sweep cannot merge. Workflow-touching: never `fix`/`continue`.
- **#738 (Phase 5 sound design overhaul, `Refs #582`, `Refs #659`) - FRESH TESTER LIVE ON `ec6b4c71`**: head `ec6b4c71464a31dbd51daa37bbef78e25343fdee` (MERGEABLE/CLEAN; 24 commits; remote tip matches). The previous opencode-test 39753313906 died at its 90-minute agent cap at 10:40:26 with no decision file, report, or commit, so the prior run's dispatch posted `/oc test` at 10:46:08 and opencode-test 39765571070 has its test job live since 10:46:13 on exactly this head. No verdict yet. On `/oc approve-test`: route `{"action":"eval","pr":738}`; on `fix`: the Fixer; a second same-way cap death triggers a `lab` cap raise with R25 updated. The body uses `Refs #659`, so #659 stays open for the per-layer real-host listening. #682's three acceptance items are implemented on the tree; verify and close on the merged tree.
- **#713 intake check**: carried by #716; no untriaged content. The deferred `AGENTS.md`/`REGISTRY.md`/`opencode-recover.yml` doc-drift lab round waits for #716 to land so it does not race the workflow surface.

## Health and audits
- Runs: the only failure in the newest 200 is the already-triaged #738 Tester cap death (39753313906); zero held `action_required` runs repo-wide. The cancelled/skipped maintainer rows are the designed homogeneous single-slot supersessions.
- Trigger allowlist: exact 18/18 item-for-item against the 19 live workflow `name:` fields (the 18 allowed plus the self-excluded maintainer).
- Pages: root, `/docs/`, `/maze-chase/`, `/preview/pr-716/`, and `/preview/pr-738/` all HTTP 200.
- Recovery: last closed PRs are all merged; no closed-unmerged work.
- Issues: 14 open, all mapped; newest open is #713 (carried by #716); zero untriaged (the Maze Chase child issues are per-phase scope under #582).
- Model health: pins unchanged at `opencode/deepseek-v4.1-flash-free` for `model`, `small_model`, and `REQUESTED_MODEL`; ladder rungs `deepseek-v4.1-flash-free`, `mimo-v2.6-flash-free`, `glm-5.3-flash-free` all live and free in the registry.

## Decisions and rationale
- `decision.json = []`; one bot status tick on #716 via `comment.md` (the run target).
- No `review` on #716: opencode-review 39765789606 already owns the exact head `88a10129` and a second dispatch would duplicate it. No `lab` on #716: round 39764467526 is live on the same head for the 10:37Z findings, so a third dispatch would stack a duplicate. No `test`/`eval` on #716: no current-head reviewer approval or tester verdict. No `fix`/`continue`: workflow-touching PR.
- No dispatch on #738: fresh Tester 39765571070 is live on the exact head.
- No merge: neither PR carries a current-head `approve-test` plus `approve-eval`.
- No create/close/recover/ideate/auditor/curate: zero untriaged content, no curator follow-up, no closed-unmerged work, no ideation request, standby otherwise. No emergency: production is moving (review, lab, and test all live) and `lab.yml` executes normally.
- Session read-only apart from the `.maintainer/` outputs: gh/API reads, `git ls-remote`, run/job queries, the compare API, the parsed allowlist audit, the registry/model check, and the Pages probes.

## Watch list
1. **#716 fresh review on `88a10129`**: on approve -> read-only infra Tester -> fresh Quality Council -> PAT merge sweep (closes #713). On findings -> one more `lab` round, never `fix`/`continue`.
2. **#716 lab round 39764467526**: live on `88a10129` for the 10:37Z findings (git hooks, `$GITHUB_ENV`/`BASH_ENV`, job-level env); it will push and forward its own review. Read its verdict against the effective head and route only genuinely new findings.
3. **#738 fresh Tester on `ec6b4c71`**: on `/oc approve-test` route `{"action":"eval","pr":738}`; on `fix` the Fixer; a second cap death (90-minute agent cap under the 120-minute job) -> `lab` cap raise with R25 updated. On `approve-eval`: merge `--rebase` (no `--delete-branch`), keep #659 OPEN, verify and close #682 on the merged tree if satisfied, confirm Pages, then chain Phase 6 with `{"action":"build","issue":582}` (`Closes #657`).
4. **Deferred lab round** after #716 lands: `AGENTS.md` model-line drift, `REGISTRY.md` missing `/oc plan` alias and Curator dispatch, and the `opencode-recover.yml` double-spaced sign-off (re-verify against the landed tree first; some may already be closed).
5. **Recurrence watches**: #620 free-tier, #717 upstream-endpoint, #669 egress-IP, #653 stall classes; the #616/#637 review publication gate; Pages preview zero-job class; #655 per-OS rows; #682 merge-tree verification; the test-cap pattern (second cap death -> lab).

## Pointers
- Long-form run narrative: `logs/2026-10-22.md`, the 39765813439 entry.
- Open lanes: #716 review on `88a10129` -> read-only Tester -> Quality Council -> PAT sweep (closes #713); #738 fresh Tester on `ec6b4c71` -> Quality Council -> merge (keep #659 open, verify/close #682, chain Phase 6 `Closes #657`).
- Done 2026-10-22: #740/#739 merged as `64384e22`; earlier #707/#658 as `d207655e`; the #738 Tester fix round landed `ec6b4c71`.
- Done 2026-10-21: #737/#735, #736/#734, #733/#729, #732/#717, #731/#730, #728/#727, #726/#725, #724/#723, #722, #720.
