# Maintainer State - 2026-10-21 04:31Z

## Last checkpoint
- Maintainer run https://github.com/Userfrom1995/RandomLabs/actions/runs/39544074507, the `approve-eval` handoff on #731. **Merged #731** (`--rebase`) as `c6716132d77b7dc769dd6ee05cb15f89deae396b` at 04:28:03Z and **closed #730** at 04:28:29Z; branch left intact. Dispatched `pages.yml` (the bot-token merge emitted no `push` event) and run 39544265574 succeeded; production `/docs/` 200 with the stale "first ~14 days" qualifier gone. Zero decision entries; no dispatch due.

## Landed (2026-10-21)
- **#731 MERGED** 04:28:03Z as `c6716132` (rebase; `Fixes #730`; branch `opencode/issue730-curate-public-docs-refresh` intact). **#730 closed** 04:28:29Z. Pages deploy 39544265574 succeeded on `c6716132`; root, `docs/`, `pet/`, `maze-chase/` 200 and the stale qualifier is absent from production docs. Docs-only lab PR, shipping limit does not apply.
- **#728 MERGED** 00:49:54Z as `8cbaecc7` (`Fixes #727`, #727 closed), **#726 MERGED** 00:13:27Z (`Fixes #725`, #725 closed), **#724 MERGED** 23:58:35Z (`af55fa02`, #723 closed), **#722 MERGED** 22:32Z, **#720 MERGED** 22:25Z - branches intact, Pages green, do not re-evaluate.

## Live pipeline (verified 04:26-04:31Z)
- **#707 (Phase 4 visual redesign, `Refs #582`, `Closes #658`) - TESTER APPROVED, EVAL LIVE**: head `f68cf7ae474b2e890bd2fadeb08a1cdafa133cea`, MERGEABLE/CLEAN, non-draft. Review 39537136654 approved at 03:57:37Z on exactly this head. Tester run 39541423452 (started 03:57:51Z) finished success at 04:24:09Z: signed `/oc approve-test` at 04:23:56Z (live terminal PTY, byte-identical desktop probe, shipped-wasm browser E2E), evidence at the exact contract path, and the workflow machine-published the first-line marker at 04:24:04Z. Sibling maintainer run 39543832783 dispatched `/oc eval` at 04:27:20Z; opencode-eval 39544141690 is in its eval job. On `approve-eval` -> merge (`--rebase`, branch intact, not workflow-touching), close #658, verify Pages, then Phase 5 (#659, sound design) after a binding Design Council audio pass on #582; #582/#655 stay open. On `fix` -> Fixer with the exact findings, then review -> Tester -> fresh eval before merge.
- **#717 (provider 429 `Upstream request failed: Endpoint is unavailable.` unclassified) - FOURTH BOUNDED LAB ROUND LIVE**: owner `/oc lab` landed at 03:57:21Z; Lab Engineer 39541387762 has been in its agent step since 03:57:26Z (about 34 minutes at the final check, inside the 150/180 caps). Scope: add the exact terminal form to the transient-HTTP detectors in BOTH runner paths (`.github/actions/opencode-run/action.yml` and the `maintainer.yml` inline copy) with tail and column-0 anchoring and the pipefail-safe wrap, one bounded same-model retry on both exit shapes, independent capped budgets, #669 semantics untouched, focused R15 coverage, and an early push once coherent. No PR yet.
- **#716 (lab: enforce the Evaluator gate in the PAT merge sweep, `Closes #713`, `Refs #709`) - PAUSED BEHIND #717**: head `5eedd58ef56b50a6f62985b3b9ec081dbe800288`, MERGEABLE/CLEAN, non-draft. Round-4 R30 finding unchanged: whole-region pin the eval-forward run block in `silent-stall-audit.sh` mirroring `r30_expected_post_block`, because a decoy `eval-verdict` marker can escape the current extraction. No lab run is live on the branch; it resumes immediately after #717 lands, rebased onto those changes.
- **#729 (Auditor REGISTRY drift) - QUEUED BEHIND #717, PAIRED WITH THE STALE-WORDING FOLLOW-UP**: after #717 lands, dispatch `{"action": "lab", "issue": 729}` to extend the Auditor row's trigger cell to `schedule` · `workflow_dispatch` · the comment trigger, and batch in the removal of the stale "~14 days" wording at `LAB.md:1486/1491` and `setup.sh:142`.
- Open issues: 22, all mapped (#729 queued, #717 live lab lane, #713 carried by #716, the Maze Chase set, the two boards). Zero untriaged.
- **Maze Chase children (#655, #657-#661, #671-#683)** stay open until their phase PRs merge; #655 waits on the macOS/Windows matrix rows and #659 is the next roadmap phase after Phase 4. #671 remains the consumed child noted in earlier entries.

## Health and audits
- Runs: zero failed or timed-out runs in the recent list; zero held `action_required` runs repo-wide. The maintainer cancelled/skipped rows around the comment bursts are the documented concurrency and `workflow_run` fan-out cohort.
- Trigger allowlist: exact 18/18 item-for-item against the live workflow `name:` fields under `.github/workflows/` (19 files, maintainer self-excluded).
- Pages: root, `docs/`, `pet/`, `maze-chase/`, and previews `pr-707` and `pr-716` all 200. Latest deploy 39544265574 succeeded on `c6716132`; production docs serves the refreshed copy.
- Shipping limit: no new-project merge today; #731 was a docs lab PR, #716 is a lab PR, and #707 is an intermediate phase PR (`Refs #582`), so the limit does not apply.
- #669 egress-IP fast-fail: no new occurrence (the #717 class is a distinguishable provider 429).
- Model health: all three ladder rungs live and free (`deepseek-v4.1-flash-free`, `mimo-v2.6-flash-free`, `glm-5.3-flash-free`); `REQUESTED_MODEL` at `maintainer.yml:234` and `opencode.json` `model`/`small_model` unchanged.
- No closed-unmerged PR needs recovery; no retired `opencode/schedule-*` or `opencode/dispatch-*` branch exists.

## Decisions and rationale
- `decision.json = []`. The only work owed this run was the merge, which the Maintainer performs directly: #731 had a current-head operative `approve-test` and a current-head `approve-eval`, no newer findings, and a clean orphan check (merge-base `8cbaecc7`), so it landed.
- No dispatch: #707's Quality Council pass just started in sibling run 39543832783, #717's Lab Engineer is still executing, #716 is paused by design, #729 is queued behind #717.
- No create/close (other than the linked #730)/recover/ideate/auditor/curate dispatch. No emergency: production is moving on every lane.
- Session read-only apart from the `.maintainer/` outputs: gh/API reads, `git ls-remote`, run/job/PR/issue queries, the allowlist audit, the merge, the stale #730 close, the Pages dispatch, and Pages/registry checks.

## Watch list
1. **#707 eval 39544141690** on `f68cf7ae`: on `approve-eval` -> merge (`--rebase`, branch intact), close #658 via `Closes`, verify Pages redeploys, then Phase 5 (#659) after its Design Council audio pass on #582; #582/#655 stay open. On `fix` -> route the Fixer with the exact findings, then review -> Tester -> fresh eval before merge.
2. **#717 lab round 39541387762**: on the PR it opens -> review -> read-only infra Tester -> fresh Quality Council pass -> PAT merge sweep; then #716 resumes with the R30 forward-block pin and a rebase onto the #717 changes, and #729 ships with the `LAB.md:1486/1491` / `setup.sh:142` stale-wording cleanup. If this fourth round dies before pushing, keep routing through lab (no emergency while production moves).
3. **#716 repair**: resume only after #717; on the fix push -> review -> read-only infra Tester -> fresh eval -> PAT sweep; #713 closes with the merge. Do not retry it into the unclassified 429 while #717 is live.
4. **#717 recurrence watch**: the class has at least ten deaths; any new death before the fix lands re-confirms the priority.
5. **Tester evidence-path class**: the `/tmp/opencode/live-run-evidence.json` miss was corrected by the retry writing the exact contract path; watch for a repeat, then lab.
6. **Pages preview zero-job failure class**: watch the next bot-PR merge; otherwise log only. **#655 per-OS rows** and **#669 recurrence**: no new occurrence.
7. **Failure triage cooldown**: no second dispatch for the same workflow+branch signature within 30 minutes of a failure; no failure to triage at this checkpoint.

## Pointers
- Long-form run narrative: `logs/2026-10-21.md`, the 39544074507 entry.
- Maintainer prompt: `.github/agents/maintainer.md`.
- Open lanes: #707 eval -> merge (closes #658); #717 lab round -> PR -> review -> infra test -> eval -> sweep; #716 repair after #717; #729 + stale-wording cleanup after #717; #731/#730, #728/#727, #726/#725, #724/#723, #722, #720 done.
- Concurrent sessions: the #707 eval and the #717 Lab Engineer are the live lanes; sibling maintainer fan-out may overlap. State is last-writer-wins; the day log is keep-both.
