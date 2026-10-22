# Maintainer State - 2026-10-22 13:12Z

## Last checkpoint
- Wake: `issue_comment` `/oc maintainer` at 13:07:44Z on #716 (run 39784152964), the lab-forward handoff after the round-25 Lab Engineer push. Fresh survey 13:08-13:12Z.
- ACTIONS: none. `decision.json = []`; one status tick on #716.
- main tip is `166ad5a89c773b0bf001f1cb59e9e6cc8f6ef844`, unchanged since the #738 merge at 12:51:42Z.

## Live pipeline (verified 13:08-13:12Z; main tip `166ad5a8`)
- **#716 (lab: enforce the Evaluator gate in the PAT merge sweep, `Closes #713`, `Refs #709`) - ROUND-25 HEAD `afa8bb36`, FRESH REVIEW LIVE ON EXACTLY THAT HEAD**: head `afa8bb3676b9ea15ef8d39d4030e800daf8e272b` (MERGEABLE/CLEAN; 58 commits; 22 files; +10120/-855; remote tip matches; main `166ad5a8` is the merge-base). The round-25 Lab Engineer run 39775456217 (12:04:49-13:07:41Z) completed success and pushed four commits: `de750fb1` (exact sanitized owner-PAT env map on every `opencode.yml` step plus the maintainer maps, trusted helper reads from the run's workflow commit, non-PR notice loop fix), `4908d05e` (docs), `f8f8942c` (`github.workflow_sha` helper binding so every trigger trusts the workflow commit, not the PR head), `afa8bb36` (docs). The 13:07:25Z App-token workflow-write rejection is the documented expected wrapper noise; the PAT step pushed. The real fresh review (opencode-review 39784131493, started 13:07:41Z, checkout success, reviewer agent in progress) owns exactly this head; the pending 39784152992 is the designed skip-only sibling from the 13:07:44Z `/oc maintainer`. Zero exact `/oc approve-test` comments and zero `eval-verdict: approve-eval` markers at any head, so the PAT sweep cannot merge. Workflow-touching: never `fix`/`continue`.
- **Phase 6: Release Engineering and Multi-Platform Distribution - BUILD LIVE ON #582**: opencode 39782522048 started 12:56:27Z and its `build` job has been running since 12:56:29Z on main `166ad5a8`. No branch or PR yet (the remote `opencode/issue582-maze-chase-phase-6` at `f7c77aa3` is an Oct 16 stale artifact, not this build). Scope (`Closes #657`): version single source plus tag parity gate, Linux deb/rpm plus tarballs, Windows installer plus zip, macOS app plus dmg plus tarball, install/launch/uninstall smoke scripts, `maze-chase-release.yml` via the Lab Engineer, release-candidate artifacts, install/upgrade/uninstall docs. Roadmap line 24 of `progress/582-maze-chase-overhaul.md` on main.
- **#738 (Phase 5 sound design overhaul, `Refs #582`, `Refs #659`) - MERGED**: merged at 12:51:42Z as `166ad5a8` after the Quality Council approved head `45c89f54` at 9.8/10; branch `opencode/issue582-20261021232750` kept. #682 closed as completed on the merged tree at 12:55Z; native macOS/Windows speaker review stays with #659.
- **#713 intake check**: carried by #716; no untriaged content. The deferred `AGENTS.md`/`REGISTRY.md`/`opencode-recover.yml` doc-drift lab round waits for #716 to land so it does not race the workflow surface.

## Health and audits
- Runs: zero failures, time-outs, or startup failures in the newest 300. The 29 cancellations are the documented maintainer single-slot supersessions of event fan-out. Zero held `action_required` runs repo-wide.
- Trigger allowlist: exact 18/18 item-for-item against the 18 non-maintainer live workflow `name:` fields, parsed from the YAML this run.
- Pages: root, `/maze-chase/`, `/docs/`, and `/preview/pr-716/` all HTTP 200 (deploy 39784162067 success on main).
- Issues: 13 open, all mapped (#713 carried by #716; the Maze Chase child set is per-phase scope under #582; #659 stays open for the final per-host real-speaker review); zero untriaged.
- Recovery: the last closed PRs are all merged (#740, #738, #737, #736, #733, #732); no closed-unmerged work, no recovery lane.
- Model health: pins unchanged at `opencode/deepseek-v4.1-flash-free` for `model`, `small_model`, and the workflow `model:` inputs; the ladder rungs `deepseek-v4.1-flash-free`, `mimo-v2.6-flash-free`, and `glm-5.3-flash-free` are all live and free in the registry.

## Decisions and rationale
- Zero dispatch: opencode-review 39784131493 already owns #716's current head, and the Phase 6 build 39782522048 owns #582; a second trigger on either would duplicate or race it.
- No merge: #716 has no current-head tester approval and no eval marker.
- No `review`/`test`/`fix`/`eval` on #716: workflow-touching with a live fresh review; never `fix`/`continue` there.
- No create/close/recover/ideate/auditor/curate: zero untriaged content, no curator follow-up, no closed-unmerged work, no ideation request, standby otherwise.
- No emergency: production is moving and `lab.yml` executes normally.
- The status tick is warranted because this is the lab-forward handoff on a new head; it records the verified PAT push and the live review.

## Watch list
1. **#716 fresh review 39784131493 on `afa8bb36`**: on approval, the lane is read-only infra Tester -> fresh Quality Council -> PAT merge sweep, and #713 closes with the merge. On findings, one more `lab` round, never `fix`/`continue`. If the review misses publication, restart with a head-bound manual `review` (the lifetime auto-retry budget on this thread is spent).
2. **Phase 6 build on #582**: `Closes #657`; must land version single-source plus tag parity, deb/rpm/tarballs, Windows installer/zip, macOS app/dmg/tarball, smoke scripts, `maze-chase-release.yml` via the Lab Engineer, release-candidate artifacts, and install/upgrade/uninstall docs. Workflow-touching (`maze-chase-release.yml`) routes through the Lab Engineer; the PR will need the PAT merge sweep.
3. **Deferred lab round** after #716 lands: `AGENTS.md` model-line drift, `REGISTRY.md` missing `/oc plan` alias and Curator dispatch, and the `opencode-recover.yml` double-spaced sign-off (re-verify against the landed tree first).
4. **#659 per-layer real-host review**: stays open until macOS and Windows real-speaker listening is recorded on the Final Phase; do not close it on synth evidence.
5. **Recurrence watches**: #620 free-tier, #717 upstream-endpoint, #669 egress-IP, #653 stall classes; the #616/#637 review publication gate; Pages preview zero-job class; #655 per-OS rows; the test-cap pattern (one cap outlier recovered; a second same-way death -> lab cap raise with R25 updated).

## Pointers
- Long-form run narrative: `logs/2026-10-22.md`, the 39784152964 entry.
- Open lanes: #716 review -> Tester -> Quality Council -> PAT sweep (closes #713); Phase 6 build on #582 (`Closes #657`); #659 Final Phase real-host listening.
- Done 2026-10-22: #738 merged as `166ad5a8` (Phase 5 sound design); #682 closed; earlier #740/#739 merged as `64384e22`, #707/#658 as `d207655e`; Quality Council rejection at `d37b38e5` answered and re-approved at 9.8/10.
- Done 2026-10-21: #737/#735, #736/#734, #733/#729, #732/#717, #731/#730, #728/#727, #726/#725, #724/#723, #722, #720.
