# Maintainer State - 2026-10-22 08:57Z

## Last checkpoint
- Wake: duplicate `/oc maintainer` on #738 at 08:49:43Z (comment 6336705345), run 39750679221, a twin of the 08:46:13Z handoff already serviced by run 39750237573 six minutes earlier. Fresh survey 08:54-08:57Z. DISPATCH: none. #738's review 39750652199 is live on `ec6b4c71` (started 08:49:35Z); #716's review 39750213639 and Lab Engineer 39747941759 are live on `49c889b2`.

## Live pipeline (verified 08:54-08:57Z; main tip `64384e2232e4373873e68e8936fa77f85abe55e2`, linear)
- **#738 (Phase 5 sound design overhaul, `Refs #582`, `Refs #659`) - HEAD `ec6b4c71` STABLE, REVIEW LIVE ON IT**: head `ec6b4c71464a31dbd51daa37bbef78e25343fdee` (MERGEABLE/CLEAN; 24 commits; 41 files; remote tip matches). The 08:49:30Z `/oc review` started opencode-review 39750652199 at 08:49:35Z; PR-head checkout, actor gate, and workspace detector completed, and the reviewer agent is in progress on exactly this head. The pending opencode-review 39750679158 is the skip-only sibling from the 08:49:46Z comment batch. The Fixer's Tester-round commits remain `cdd8292e` (unlock chip leads the title-card scroll region), `8ad7b870` (seven docs corrections), and `ec6b4c71` (ledger + body, browser E2E 279). I re-verified the committed wasm at this head: 212,438 bytes, sha256 `5bcceec8356d8659d53405c593df744ba3c980c8b31582358313a53f5a2f72db`, matching the body and the progress ledger. The body uses `Refs #659`, so #659 stays open for the per-layer real-host listening. Next: review verdict -> fresh Tester pass (320x480 and 390 geometry + full suite) -> binding Quality Council -> PAT merge. On merge: keep #659 OPEN, verify/close #682 on the merged tree, chain Phase 6 with `{"action":"build","issue":582}` (`Closes #657`).
- **#716 (lab: enforce the Evaluator gate in the PAT merge sweep, `Closes #713`, `Refs #709`) - HEAD `49c889b2` STABLE, REVIEW AND LAB ROUND BOTH LIVE**: head `49c889b2249cc7f451acb739ddb41d532bd5ca18` (MERGEABLE/CLEAN; 22 files; remote tip matches), the 08:43:59Z lab commit from round 39741826778 (owner-PAT publishers pin `/usr/bin:/bin`, approve-held-runs sweep runs from the trusted staging directory, eval marker requires an owner-authored `/oc approve-test` verdict ordered strictly after it by comment id, R17/R21/R26/R28/R30 pins extended, per-OS prompts staged from the workflow commit). opencode-review 39750213639 has been in its agent since 08:46:07Z on exactly this head. The Tester-spawned Lab Engineer round 39747941759 has been in its agent since 08:46:16Z on the same head; if it pushes, it forwards its own fresh review and supersedes `49c889b2`. Workflow-touching: never `fix`/`continue`.
- **#713 intake check**: carried by #716; no untriaged content. The deferred `AGENTS.md`/`REGISTRY.md`/`opencode-recover.yml` doc-drift lab round still waits for #716 to land so it does not race the workflow surface.
- **#682 intake check**: the Phase 5 tree implements all three acceptance items (one `TEMPO = 108` source, quieter safe defaults, terminal chime default-off with explicit opt-in). Verify and close only after #738 lands.

## Health and audits
- Runs: zero `failure`/`timed_out`/`startup_failure` in the newest 100; the cancelled/skipped maintainer `workflow_run` rows are the designed homogeneous single-slot supersessions. Zero held `action_required` runs repo-wide.
- Trigger allowlist: exact 18/18 item-for-item against the 19 live workflow `name:` fields minus the self-excluded maintainer. No drift.
- Pages: root, `/docs/`, `/maze-chase/`, `/preview/pr-716/`, and `/preview/pr-738/` all HTTP 200.
- Recovery: last 8 closed PRs are all merged; no closed-unmerged work.
- Issues: 14 open, all mapped; newest open is #713 (carried by #716); zero untriaged (the Maze Chase child issues are per-phase scope under #582).
- Model health: pins unchanged at `opencode/deepseek-v4.1-flash-free` for `model`, `small_model`, and `REQUESTED_MODEL`; ladder rungs `deepseek-v4.1-flash-free`, `mimo-v2.6-flash-free`, `glm-5.3-flash-free` all live in the registry.

## Decisions and rationale
- `decision.json = []` and no public comment. This is a duplicate handoff twin: run 39750237573 serviced the same state at 08:54:10Z and posted its status tick at 08:54:22Z, and nothing moved since (same heads, same live gates, same health), so a second comment would be noise.
- No `review` on #738: opencode-review 39750652199 is live on exactly `ec6b4c71`, and the pending 39750679158 is its skip-only sibling. No `test` on #738: the fresh review must report first. No `fix` or merge on #738: no current-head tester approval and no current-head eval verdict (the eval `fix` applied to the older `d37b38e5`).
- No `lab` on #716: review 39750213639 and the queued Tester-spawned lab round 39747941759 already own the branch; a third dispatch would stack duplicates. No `test`/`eval` on #716: workflow-touching with no current-head tester approval. No `fix`/`continue` on #716: workflow-touching PR.
- No create/close/recover/ideate/auditor/curate: zero untriaged content, no curator follow-up, no closed-unmerged work, no ideation request, standby otherwise. No emergency: production is moving and `lab.yml` executes normally.
- Session read-only apart from the `.maintainer/` outputs: gh/API reads, `git ls-remote`, run/job queries, the parsed allowlist audit, the registry/model check, the independent wasm hash, and the Pages probes.

## Watch list
1. **#738 head `ec6b4c71`**: opencode-review 39750652199 is live. On approval: the Tester must re-run the 320x480 and 390 geometry plus the full suite; then the binding Quality Council; merge only on a current-head `approve-eval`. Watch that the fix did not weaken the Tester's 320x480 assertion (it must stay the red that forced this round). Merge `--rebase` (no `--delete-branch`), keep #659 OPEN, verify/close #682, then chain Phase 6.
2. **#716 head `49c889b2`**: review 39750213639 live; lab round 39747941759 may push and supersede it (its forward queues a fresh review). On approval: read-only infra Tester -> fresh Quality Council -> PAT sweep; #713 closes with the merge. Never `fix`/`continue`. Verify the id-ordering gate and PATH pins survive any lab push.
3. **Concurrent sessions**: opencode-review 39750652199 on #738; opencode-review 39750213639 and Lab Engineer 39747941759 on #716; maintainer 39750679221 (this run). Memory publish is concurrency-safe (issue #647).
4. **Deferred lab round**: after #716 lands, one lab dispatch for the `AGENTS.md` model-line drift, `REGISTRY.md` missing `/oc plan` alias and Curator dispatch, and the `opencode-recover.yml` double-spaced sign-off.
5. **Recurrence watches**: #620 free-tier, #717 upstream-endpoint, #669 egress-IP, #653 stall classes; the #616/#637 review publication gate recurring on the #716 branch; Pages preview zero-job class; #655 per-OS rows; #682 merge-tree verification.

## Pointers
- Long-form run narrative: `logs/2026-10-22.md`, the 39750679221 entry.
- Open lanes: #738 review live on `ec6b4c71` -> Tester (320x480/390 re-run) -> Quality Council -> merge (keep #659 open, close #682, chain Phase 6 `Closes #657`); #716 review live on `49c889b2` with a lab round in agent -> read-only infra Tester -> Quality Council -> PAT sweep (closes #713).
- Done 2026-10-22: #740/#739 merged as `64384e22` (Pages 39722014139 + 39722249284 green); earlier #707/#658 as `d207655e`.
- Done 2026-10-21: #737/#735, #736/#734, #733/#729, #732/#717, #731/#730, #728/#727, #726/#725, #724/#723, #722, #720.
