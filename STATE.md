# Maintainer State - 2026-10-21 06:30Z

## Last checkpoint
- Maintainer run https://github.com/Userfrom1995/RandomLabs/actions/runs/39555339171, the 06:25:42Z `/oc maintainer` machine handoff after the #732 Tester approval. **Zero dispatch**: the Tester verdict is operative on the current head and this run's PAT merge sweep is due to land #732 (workflow-touching); #716 and #729 stay sequenced after that landing; #707's Fixer is live; no failure to triage.

## Landed (2026-10-21)
- **#731 MERGED** 04:28:03Z as `c6716132` (rebase; `Fixes #730`; branch `opencode/issue730-curate-public-docs-refresh` intact). **#730 closed** 04:28:29Z. Pages deploy 39544265574 succeeded; root, `docs/`, `pet/`, `maze-chase/` 200.
- **#728 MERGED** 00:49:54Z as `8cbaecc7` (`Fixes #727`, #727 closed), **#726 MERGED** 00:13:27Z (`Fixes #725`, #725 closed), **#724 MERGED** 23:58:35Z (`af55fa02`, #723 closed), **#722 MERGED** 22:32Z, **#720 MERGED** 22:25Z - branches intact, Pages green, do not re-evaluate.

## Live pipeline (verified 06:26-06:30Z)
- **#732 (lab: classify the upstream-endpoint 429, `Fixes #717`) - TESTER APPROVED, PAT SWEEP DUE THIS RUN**: head `e244a5698324c231948adf0cd233a8e75230ac22`, base `c6716132`, MERGEABLE/CLEAN, non-draft. Tester run 39550541141 completed success; the signed `/oc approve-test` at 06:25:33Z and the workflow's machine-published first-line marker at 06:25:40Z both postdate the 05:23:19Z head force-push, with no `/oc fix` after them, so the head-bound approval is valid. The workflow-touching PAT sweep (runs after this session) merges it on current main; eval enforcement in that sweep is the #713 gap carried by #716. On the merge: #717 closes, then #716 resumes with the R30 forward-block pin rebased onto the merged base, and #729 ships with the stale-wording cleanup.
- **#707 (Phase 4 visual redesign, `Refs #582`, `Closes #658`) - FIXER LIVE**: head `f68cf7ae474b2e890bd2fadeb08a1cdafa133cea`, MERGEABLE/CLEAN, non-draft. Fix run 39552303006 has been in its fix job since 05:55:20Z (about 33 minutes at this checkpoint, inside its 120-minute agent cap and 180-minute job cap). The five binding blockers: (1) web Help/Scores/Settings/Game Over/Error panels below the fold at 390x844 and 1440x900; (2) mobile HUD overflow because `aside#hud dl` outranks `#hud dl`; (3) the design-mandated dots completion bar missing on all three layers (and no terminal relish badge / third HUD row); (4) terminal fright meter width-scaled instead of 30 glyph-distinct segments with a test that blesses the deviation; (5) the real-terminal capture matrix predates `f68cf7ae` (`14b939d9`/`e938ce5a`). Should-fix: FPS diagnostics visible by default, "445 crumbs" vs the fresh HUD's 448 dots, compact terminal title card not board-left/menu-right. On the fix push -> fresh review -> Tester -> fresh Quality Council pass; only a current-head `approve-eval` permits the merge, then #658 closes and Phase 5 (#659) starts after its Design Council audio pass on #582.
- **#716 (lab: enforce the Evaluator gate in the PAT merge sweep, `Closes #713`, `Refs #709`) - PAUSED BEHIND #732**: head `5eedd58ef56b50a6f62985b3b9ec081dbe800288`, MERGEABLE/CLEAN, non-draft. Round-4 R30 finding unchanged: whole-region pin the eval-forward run block in `silent-stall-audit.sh` mirroring `r30_expected_post_block`. No lab run is live on the branch; resume only after #732 lands, rebased onto those changes.
- **#729 (Auditor REGISTRY drift) - QUEUED BEHIND #732**: after #732 lands, dispatch `{"action": "lab", "issue": 729}` to extend the Auditor row's trigger cell to `schedule` · `workflow_dispatch` · the comment trigger, and batch in the removal of the stale "~14 days" wording at `LAB.md:1486/1491` and `setup.sh:142`.
- Open issues: 22, all mapped (#729 queued, #717 carried by #732, #713 carried by #716, the Maze Chase parent/roadmap set, the two boards). Zero untriaged.
- **Maze Chase children (#655, #657-#661, #671-#683)** stay open until their phase PRs merge; #655 waits on the macOS/Windows matrix rows and #659 is the next roadmap phase after Phase 4.

## Health and audits
- Runs: zero failed, timed-out, startup-failure, or held `action_required` runs in the newest 120 (the cancelled/skipped rows are the documented concurrency and `workflow_run` fan-out cohort).
- Trigger allowlist: exact 18/18 item-for-item against the live workflow `name:` fields under `.github/workflows/` (22 live workflow names minus maintainer self, the two Dependabot entries, and `pages-build-deployment`).
- Pages: root, `docs/`, and previews `pr-732` and `pr-707` all 200.
- Shipping limit: no new-project merge today; #731 was a docs lab PR, #732/#716 are lab PRs, and #707 is an intermediate phase PR (`Refs #582`), so the limit does not apply.
- #669 egress-IP fast-fail: no new occurrence (the #717 class is a distinguishable provider 429).
- Model health: all three ladder rungs live and free (`deepseek-v4.1-flash-free`, `mimo-v2.6-flash-free`, `glm-5.3-flash-free`); `REQUESTED_MODEL` and `opencode.json` `model`/`small_model` unchanged.
- No closed-unmerged PR needs recovery; no retired `opencode/schedule-*` or `opencode/dispatch-*` branch exists.

## Decisions and rationale
- `decision.json = []`; one public comment on #732. The one due pipeline action this wake was already in flight: the Tester approved on the exact current head and the workflow-touching PAT sweep is the merge lane on current main (LAB.md:171: the sweep enforces the tester verdict; eval enforcement is tracked in #713 and landed by #716). Dispatching `/oc eval` here would race that sweep, which merges at the end of this same run, leaving the Council auditing an already-merged head; the documented sequencing is Tester -> machine marker -> PAT sweep for workflow-touching infra PRs. No #716/#729 dispatch this run either: triggers post before the merge sweep, so a lab run would branch off a base that does not yet contain #732; both resume on the post-merge wake.
- No create/close/recover/ideate/auditor/curate dispatch. No emergency: production is moving on every lane.
- Session read-only apart from the `.maintainer/` outputs: gh/API reads, `git ls-remote`, run/job/PR/issue queries, the allowlist audit, and Pages checks.

## Watch list
1. **#732 PAT sweep merge**: verify the landed `main` commit, #717 closed, and the Pages redeploy; then dispatch #716 lab with the R30 forward-block pin rebased onto the merged base, and #729 lab with the REGISTRY row plus the stale-wording batch.
2. **#707 fix round** on `f68cf7ae`: the Fixer pushes the presentation-contract fixes and the re-run terminal evidence; then fresh review -> Tester -> fresh Quality Council pass. Watch that the art direction is not regressed and that the capture matrix is re-executed at the shipped terminal code commit, not just re-labeled. Only a current-head `approve-eval` permits the merge.
3. **#716 repair**: resume only after #732; on the fix push -> review -> read-only infra Tester -> fresh eval -> PAT sweep; #713 closes with the merge.
4. **#717 recurrence watch**: the class has at least ten deaths; the fix is not live until #732 merges.
5. **Tester evidence-path class**: no repeat; watch for a repeat, then lab.
6. **Pages preview zero-job failure class**: watch the next bot-PR merge; otherwise log only. **#655 per-OS rows** and **#669 recurrence**: no new occurrence.
7. **Failure triage cooldown**: no second dispatch for the same workflow+branch signature within 30 minutes of a failure; no failure to triage at this checkpoint.

## Pointers
- Long-form run narrative: `logs/2026-10-21.md`, the 39555339171 entry.
- Maintainer prompt: `.github/agents/maintainer.md`.
- Open lanes: #732 sweep -> #717 closes -> #716 repair + #729 batch; #707 fix -> review -> test -> eval (closes #658); #731/#730, #728/#727, #726/#725, #724/#723, #722, #720 done.
- Concurrent sessions: the #707 fix run 39552303006 and the post-approval `workflow_run` fan-out cohort; sibling maintainer fan-out may overlap. State is last-writer-wins; the day log is keep-both.
