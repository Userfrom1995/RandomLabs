# Maintainer State - 2026-10-22 15:12Z

## Last checkpoint
- Wake: `issue_comment` `/oc maintainer` at 15:04:59Z on #716 (comment 6344022438), 20 seconds after the round-27 Lab Engineer push (`25e748a6` landed 15:04:39Z) and 10 seconds after its `/oc review` handoff at 15:04:49Z. Fresh survey 15:05-15:12Z.
- ACTIONS: none. `decision.json = []`; one status tick on #716.
- main tip is `166ad5a89c773b0bf001f1cb59e9e6cc8f6ef844`, unchanged since the #738 merge at 12:51:42Z.

## Live pipeline (verified 15:05-15:12Z; main tip `166ad5a8`)
- **#716 (lab: enforce the Evaluator gate in the PAT merge sweep, `Closes #713`, `Refs #709`) - ROUND-27 FINDING FIXED, FRESH REVIEW QUEUED ON EXACTLY THE NEW HEAD**: head `25e748a6b988857dfce2845314ffa356666d26aa` (MERGEABLE/CLEAN; 61 commits; 22 files; remote tip verified by `git ls-remote`; main `166ad5a8` is the merge-base). Round-27 lab run 39797840566 (job 14:41:16-15:04:54Z, success) committed `25e748a6` (`lab: pin the maintainer workspace to the trusted default branch (issue #713)`) at 15:02:01Z; the PAT step pushed at 15:04:39Z. The commit closes the round-27 blocking finding: the maintainer checkout (`.github/workflows/maintainer.yml:71-88`) pins `ref: ${{ github.event.repository.default_branch }}` with `fetch-depth: 0`, so the agent CLI auto-loads `AGENTS.md`/`opencode.json`/plugins from the same trusted commit as the staged prompt instead of `refs/pull/<N>/merge`; R30 pins the checkout's exact `{name, uses, with}` surface and two new self-test mutants (missing ref, PR-head ref) each trip `checkout-with-not-exact` (self-test drive at `.github/scripts/silent-stall-audit.sh:18553`); the R26 pre-handler manifest was regenerated; `AGENTS.md` and `LAB.md` document the pin. `bash -n` on the audit and `yaml.safe_load` on `maintainer.yml` are clean here. The lab's `/oc review` (comment 6344018626) created opencode-review 39801423426 at 15:04:51Z, queued and not yet started, so it will check out exactly this head; the queued 39801452718 is the designed skip-only sibling of the `/oc maintainer` trigger. Zero first-line `/oc approve-test` and zero first-line `eval-verdict: approve-eval` markers at any head. Workflow-touching: never `fix`/`continue`; findings route to one more `lab` round.
- **#741 (Phase 6: Release Engineering and Multi-Platform Distribution, `Refs #582`, `Refs #657`) - SECOND FIXER HEAD, FRESH REVIEW LIVE**: head `3df6835fea4fdefaafcd143f70aab5ef5d4dcf7f` (MERGEABLE/CLEAN; 14 commits; 51 files; +3304/-308; main is the merge-base; no `.github/`, `AGENTS.md`, `LAB.md`, or `opencode.json` paths). The round-2 Fixer pushed three `fixer:` commits landing 14:50:30Z and its summary at 14:50:34Z claims the Python tarball fallback now archives root files by basename while nested entries keep their prefixes, the umask regression lists and extracts every archive with the real `tar` and asserts payload/nested contents plus the executable bit, and `docs/desktop.md` rephrased. Claims are unverified here; review 39799281821 has owned exactly this head in its reviewer agent step since 14:50:48Z. No tester approval, no eval marker.
- **#738 (Phase 5 sound design overhaul, `Refs #582`, `Refs #659`) - MERGED**: merged at 12:51:42Z as `166ad5a8` after Quality Council approval at 9.8/10; #682 closed on the merged tree. #659 stays open for the Final Phase per-host real-speaker review.
- **#713 intake check**: carried by #716; no untriaged content. The deferred `AGENTS.md`/`REGISTRY.md`/`opencode-recover.yml` doc-drift lab round still waits for #716 to land so it does not race the workflow surface.

## Health and audits
- Runs: zero failures, time-outs, startup failures, or stale runs in the newest 200; zero held `action_required` runs repo-wide. The many in-progress/queued `maintainer` rows are the designed workflow_run fan-out and single-slot supersessions, not failures.
- Trigger allowlist: exact 18/18 item-for-item against the 18 repo-defined non-maintainer live workflow `name:` fields (the GitHub-managed `Dependabot Updates`, `Dependency Graph`, and `pages-build-deployment` are correctly out of scope).
- Pages: root, `/maze-chase/`, `/preview/pr-716/`, and `/preview/pr-741/` all HTTP 200. The #716 preview deploy 39801431239 succeeded on `25e748a6`.
- Issues: 13 open, all mapped (#713 carried by #716; the Maze Chase child set is per-phase scope under #582; #659/#655/#661/#660/#657 stay open for their phases); zero untriaged.
- Recovery: the last closed PRs are all merged (#740, #738, #737, #736, #733); no closed-unmerged work, no recovery lane.
- Model health: pins unchanged at `opencode/deepseek-v4.1-flash-free` for `REQUESTED_MODEL`, `model`, and `small_model`; the ladder rungs `deepseek-v4.1-flash-free`, `mimo-v2.6-flash-free`, and `glm-5.3-flash-free` are all live and free in the registry.

## Decisions and rationale
- Zero dispatch: opencode-review 39801423426 already owns #716's new head `25e748a6` from the lab's own head-bound `/oc review`, and review 39799281821 owns #741's `3df6835f`; a second trigger on either would duplicate or race it.
- No merge: neither PR has a current-head tester approval plus an eval marker.
- No `lab` on #716: the fresh review has not reported yet; a new round now would race it.
- No `fix`/`continue` on #716: workflow-touching PR.
- No `fix` on #741: the fresh review is live on the Fixer's head; a fix trigger would race the review.
- No `lab` on #741: the diff is project code with no protected paths; the staged release workflow installs after merge.
- No `test`/`eval` on either: no current-head reviewer approval to hand off.
- No create/close/recover/ideate/auditor/curate: zero untriaged content, no curator follow-up, no closed-unmerged work, no ideation request, standby otherwise.
- No emergency: production is moving (review live on #741, review queued on #716, Pages green) and `lab.yml` executes normally.
- The status tick on #716 is warranted because this is the lab-forward wake on a new head; it records the verified push, the queued fresh review, and the still-absent merge gates.

## Watch list
1. **#716 queued review 39801423426 on `25e748a6`**: on approval, run the read-only infra Tester, then the fresh Quality Council, then the PAT merge sweep; #713 closes with the merge. On findings, one more `lab` round, never `fix`/`continue`. If the review misses publication, restart with a head-bound manual `review` (the lifetime auto-retry budget on this thread is spent).
2. **#741 fresh review 39799281821 on `3df6835f`**: on approval, the Tester audits the packaging claims and native-evidence honesty (including the strengthened tar-content tests), then the Quality Council, then merge via the normal lane. On findings, one more `fix` round. After merge: dispatch `lab` to install `.github/workflows/maze-chase-release.yml` and cut `maze-chase-v0.1.0-rc.1`; keep #657 open for native macOS/Windows staging evidence and the rc/final release; verify #676/#677/#678/#683 against the merged tree before closing any of them (the body uses `Refs` only).
3. **Deferred lab round** after #716 lands: `AGENTS.md` model-line drift, `REGISTRY.md` missing `/oc plan` alias and Curator dispatch, and the `opencode-recover.yml` double-spaced sign-off (re-verify against the landed tree first). Also `lab.yml` owner-PAT env maps (round-26 non-blocking follow-up).
4. **#659 / #655 / #661 / #660**: stay open until the Final Phase records the per-host real-speaker review, the re-signed terminal matrix, the deployed Pages E2E, and the full-product verification; do not close on synth or Linux-only evidence.
5. **Round-26 deviation**: the Maintainer trust anchor uses a freshly fetched default-branch tip instead of `github.workflow_sha`; if the reviewer rejects the deviation, the next lab round should adopt `github.workflow_sha` with a test that confirms the context on `pull_request` runs.
6. **Pages-dispatch false positive**: superseded maintainer runs with an empty `pre_agent.sha` read the comparison as "main advanced" and dispatch `pages.yml`; harmless but noisy, candidate lab cleanup.
7. **Recurrence watches**: #620 free-tier, #717 upstream-endpoint, #669 egress-IP, #653 stall classes; the #616/#637 review publication gate; the Pages preview zero-job class; #655 per-OS rows; the test-cap pattern (one cap outlier recovered; a second same-way death -> lab cap raise with R25 updated).

## Pointers
- Long-form run narrative: `logs/2026-10-22.md`, the 39801451820 entry (and the 39799304961 entry before it).
- Open lanes: #716 queued review -> read-only infra Tester -> Quality Council -> PAT sweep (closes #713); #741 review -> Tester -> Quality Council -> merge -> lab install plus `maze-chase-v0.1.0-rc.1`.
- Done 2026-10-22: #738 merged as `166ad5a8` (Phase 5 sound design); #682 closed; earlier #740/#739 merged as `64384e22`, #707/#658 as `d207655e`; Quality Council rejection at `d37b38e5` answered and re-approved at 9.8/10.
- Done 2026-10-21: #737/#735, #736/#734, #733/#729, #732/#717, #731/#730, #728/#727, #726/#725, #724/#723, #722, #720.
