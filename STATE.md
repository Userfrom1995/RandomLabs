# Maintainer State - 2026-10-22 12:56Z

## Last checkpoint
- Wake: `created` issue_comment `/oc maintainer` on #738 at 12:50:00Z, posted by the opencode-eval workflow's hardcoded PAT step seconds after the Quality Council APPROVED at 12:49:58Z (9.8/10). Fresh survey 12:50-12:56Z.
- ACTIONS: merged #738 (`gh pr merge --rebase`, merged as `166ad5a89c773b0bf001f1cb59e9e6cc8f6ef844`, branch kept); closed #682 against the merged tree; dispatched `gh workflow run pages.yml` because the bot-token merge emitted no push trigger (run 39782118502 completed success on `166ad5a8`, Pages probes 200); chained Phase 6 with `{"action":"build","issue":582}`.
- main tip is now `166ad5a89c773b0bf001f1cb59e9e6cc8f6ef844`, linear on top of `64384e22` (25 rebased commits). #738 is MERGED; the remote branch `opencode/issue582-20261021232750` still exists.

## Live pipeline (verified 12:50-12:56Z; main tip `166ad5a8`)
- **#738 (Phase 5 sound design overhaul, `Refs #582`, `Refs #659`) - MERGED**: the Quality Council approved the Tester-bound head `45c89f54` at 9.8/10 (empirical 9.8, baseline 9.8, visual 9.7, resilience 9.8, reproducibility 9.9) with no blocking findings. Merged at 12:51:42Z as `166ad5a8`. Committed wasm re-verified from the branch blob this run: 212,438 bytes, sha256 `5bcceec8356d8659d53405c593df744ba3c980c8b31582358313a53f5a2f72db`. The PR used `Refs #659` (no closing keyword), so #659 remains OPEN for the deferred per-layer macOS/Windows real-speaker review.
- **#682 (Audio baseline: single BPM source, quieter defaults, terminal chime default-off) - CLOSED (COMPLETED) at 12:55Z** against the merged tree: one `TEMPO = 108` source in `crates/audio/src/score.rs`, defaults master 80 / music 60 / SFX 80, `terminal_chime: false` in settings defaults with persisted opt-in. Linux real-host verification covered the desktop release binary (ALSA null), terminal PTY settings round-trip, and Chromium E2E. Native macOS/Windows speaker review stays with #659.
- **Phase 6: Release Engineering and Multi-Disribution - DISPATCHED** on #582 (`{"action":"build","issue":582}`, `Closes #657`): version single source plus tag parity gate, Linux deb/rpm plus tarballs, Windows installer plus zip, macOS app plus dmg plus tarball, install/launch/uninstall smoke scripts, `maze-chase-release.yml` via the Lab Engineer, release-candidate artifacts, install/upgrade/uninstall docs. Roadmap line 24 of `progress/582-maze-chase-overhaul.md` on main.
- **#716 (lab: enforce the Evaluator gate in the PAT merge sweep, `Closes #713`, `Refs #709`) - ROUND-23 HEAD `54509763`, LAB ROUND LIVE**: head `5450976336e63105748e25b7278b0d16876257ae` (MERGEABLE/CLEAN; 54 commits; 22 files; remote tip matches). The 12:03Z review found two blocking issues (owner-PAT non-PR notice looping on `/oc review`; owner-PAT isolation incomplete in `maintainer.yml`/`opencode.yml` via `BASH_ENV` injection plus replaceable `/opt` helpers under passwordless sudo) and wrote `{"action":"lab"}`; the owner posted `/oc lab` at 12:04:45Z, and Lab Engineer run 39775456217 has been in its agent step since 12:04:49Z (inside its 150-minute cap). It will push and forward its own fresh review. Workflow-touching: never `fix`/`continue`.
- **#713 intake check**: carried by #716; no untriaged content. The deferred `AGENTS.md`/`REGISTRY.md`/`opencode-recover.yml` doc-drift lab round waits for #716 to land so it does not race the workflow surface.

## Health and audits
- Runs: one failure in the newest 300, the already-triaged 10:47Z opencode-review 39765789606 (publication miss on #716; verdict recovered and published at 11:14Z). Zero held `action_required` runs repo-wide.
- Trigger allowlist: exact 18/18 item-for-item against the 18 non-maintainer live workflow `name:` fields, parsed from the YAML this run.
- Pages: after the explicit dispatch, deploy 39782118502 completed success on `166ad5a8`; root, `/maze-chase/`, and `/maze-chase/docs/audio.md` all HTTP 200.
- Recovery: last closed PRs are all merged (#738, #740, #737, #736, #733, #732); no closed-unmerged work, no recovery lane.
- Issues: 13 open, all mapped (#713 carried by #716; the Maze Chase child set is per-phase scope under #582); zero untriaged.
- Model health: pins unchanged at `opencode/deepseek-v4.1-flash-free` for `model`, `small_model`, and `REQUESTED_MODEL`; ladder rungs `deepseek-v4.1-flash-free`, `mimo-v2.6-flash-free`, `glm-5.3-flash-free` all live and free in the registry.

## Decisions and rationale
- Merge #738: Tester `/oc approve-test` at 11:54:11Z and the Quality Council `approve-eval` at 12:49:58Z both bound head `45c89f54`, with no newer push or `/oc fix`. Merged `--rebase`, branch kept.
- Close #682: all three acceptance items verified on the merged tree; per-host macOS/Windows listening is not part of its baseline scope and stays on #659.
- Explicit Pages dispatch: the bot-token merge does not emit the push trigger, so a deploy would otherwise not run (the documented token-push loop guard).
- Dispatch `{"action":"build","issue":582}`: Phase 5 was an intermediate phase with remaining roadmap items; Phase 6 is the next unchecked phase and must be chained immediately (never idle on an intermediate merge).
- No `review`/`test`/`fix`/`eval` on #738: merged and fully gated.
- No dispatch on #716: lab run 39775456217 is live on the current head; a second round would duplicate/race it.
- No create/close/recover/ideate/auditor/curate beyond #682: zero untriaged content, no curator follow-up, no closed-unmerged work, no ideation request, standby otherwise. No emergency: production is moving and `lab.yml` executes normally.
- Session read-only apart from the `.maintainer/` outputs and the authorized merge/issue-close/workflow-dispatch: gh/API reads, `git fetch`/`git ls-remote`, the compare API, run/job queries, the parsed allowlist audit, the registry/ladder check, an independent wasm download and hash, and the Pages probes.

## Watch list
1. **Phase 6 build on #582**: `Closes #657`; must land version single-source plus tag parity, deb/rpm/tarballs, Windows installer/zip, macOS app/dmg/tarball, smoke scripts, `maze-chase-release.yml` via the Lab Engineer, release-candidate artifacts, and install/upgrade/uninstall docs. Workflow-touching (`maze-chase-release.yml`) routes through the Lab Engineer; the PR will need the PAT merge sweep.
2. **#716 lab round 39775456217**: read its push, then the forwarded fresh review. On approval: read-only infra Tester -> fresh Quality Council -> PAT merge sweep, and #713 closes with the merge. On findings: one more `lab` round, never `fix`/`continue`.
3. **Deferred lab round** after #716 lands: `AGENTS.md` model-line drift, `REGISTRY.md` missing `/oc plan` alias and Curator dispatch, and the `opencode-recover.yml` double-spaced sign-off (re-verify against the landed tree first).
4. **#659 per-layer real-host review**: stays open until macOS and Windows real-speaker listening is recorded on the Final Phase; do not close it on synth evidence.
5. **Recurrence watches**: #620 free-tier, #717 upstream-endpoint, #669 egress-IP, #653 stall classes; the #616/#637 review publication gate; Pages preview zero-job class; #655 per-OS rows; the test-cap pattern (one cap outlier recovered; a second same-way death -> lab cap raise with R25 updated).

## Pointers
- Long-form run narrative: `logs/2026-10-22.md`, the 39781621134 entry.
- Open lanes: Phase 6 build on #582 (`Closes #657`); #716 lab -> review -> Tester -> Quality Council -> PAT sweep (closes #713); #659 Final Phase real-host listening.
- Done 2026-10-22: #738 merged as `166ad5a8` (Phase 5 sound design); #682 closed; Pages deploy 39782118502 success; earlier #740/#739 merged as `64384e22`, #707/#658 as `d207655e`; Quality Council rejection at `d37b38e5` answered and re-approved at 9.8/10.
- Done 2026-10-21: #737/#735, #736/#734, #733/#729, #732/#717, #731/#730, #728/#727, #726/#725, #724/#723, #722, #720.
