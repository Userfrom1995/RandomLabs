# Maintainer State - 2026-10-21 04:16Z

## Last checkpoint
- Maintainer run https://github.com/Userfrom1995/RandomLabs/actions/runs/39542773378, the `workflow_run` triage of failed opencode-test 39541624600 on #731. One dispatch: fresh `{"action": "test", "pr": 731}`. One ping on #731 explaining the evidence-gate miss. Main tip unchanged: `8cbaecc7679d1bbc6d82e9f92b548491c6350cef`.

## Landed (2026-10-21)
- **#728 MERGED** 00:49:54Z as `8cbaecc7` (rebase; `Fixes #727`; branch `opencode/lab-727-pet-release-windows-smoke-comment` intact). **#727 closed** 00:49:55Z. Pages deploy 39523682817 succeeded; root/`pet/`/`maze-chase/` 200.
- **#726 MERGED** 00:13:27Z (`Fixes #725`, #725 closed), **#724 MERGED** 23:58:35Z (`af55fa02`, #723 closed), **#722 MERGED** 22:32Z, **#720 MERGED** 22:25Z - previous entries; branches intact, Pages green, do not re-evaluate.

## Live pipeline (verified 04:12-04:16Z)
- **#731 (Curator public-docs refresh, `Fixes #730`) - TESTER FAILED ITS EVIDENCE GATE, FRESH `/oc test` DISPATCHED**: head `7d9e43cb9aa7ea441ecb8b11ca1a24d3b48878e8`, MERGEABLE/CLEAN, non-draft, 3 files (+13/-18). Review approved at 03:59:58Z on exactly this head; `/oc test` posted 04:00:05Z. Tester run 39541624600 concluded FAILURE at 04:12:36Z: the agent session itself succeeded, published a signed `/oc approve-test` at 04:12:28Z, and wrote a detailed evidence payload, but it wrote the file to `/tmp/opencode/live-run-evidence.json` instead of the contract path `/tmp/live-run-evidence.json`. The hard `Enforce live-execution evidence gate` step therefore failed red at 04:12:34Z, and the publication, marker, and forward steps were skipped. **The approval on the thread is published but not an operative forwarded verdict; #730 stays open.** This run dispatches one fresh `/oc test` on the unchanged head. On a successful `approve-test` (evidence at the exact path) -> Quality Council pass -> merge (`--rebase`, branch intact; docs-only lab PR, shipping limit does not apply); then `Fixes #730` closes and Pages redeploys. Reviewer's non-blocking follow-up: `LAB.md:1491` and `setup.sh:142` still carry the stale "~14 days" wording, queued with the #729 lab round.
- **#707 (Phase 4 visual redesign, `Refs #582`, `Closes #658`) - TESTER LIVE**: head `f68cf7ae474b2e890bd2fadeb08a1cdafa133cea`, MERGEABLE/CLEAN, non-draft, unchanged since the Fixer's 02:22:52Z close-out. Review 39537136654 approved at 03:57:37Z on exactly this head; the forward posted `/oc test` at 03:57:45Z. opencode-test 39541423452 has been live since 03:57:51Z (full workspace suite, harness contract, live captures). On `approve-test` -> fresh Quality Council pass -> merge only on a current-head `approve-eval` (`--rebase`, branch intact, not workflow-touching); then `Closes #658` closes, Pages redeploys, and Phase 5 (sound design, #659) starts after a binding Design Council audio pass on #582; #582/#655 stay open.
- **#717 (provider 429 `Upstream request failed: Endpoint is unavailable.` unclassified) - FOURTH BOUNDED LAB ROUND LIVE**: owner `/oc lab` landed at 03:57:21Z; Lab Engineer 39541387762 has been in its agent step since 03:57:26Z (inside the 150/180 caps). Scope: add the exact terminal form to the transient-HTTP detectors in BOTH runner paths (`.github/actions/opencode-run/action.yml` and the `maintainer.yml` inline copy) with tail and column-0 anchoring and the pipefail-safe wrap, one bounded same-model retry on both exit shapes, independent capped budgets, #669 semantics untouched, focused R15 coverage, and an early push once coherent. No PR yet.
- **#716 (lab: enforce the Evaluator gate in the PAT merge sweep, `Closes #713`, `Refs #709`) - PAUSED BEHIND #717**: head `5eedd58ef56b50a6f62985b3b9ec081dbe800288`, MERGEABLE/CLEAN, non-draft. Round-4 R30 finding unchanged: whole-region pin the eval-forward run block in `silent-stall-audit.sh` mirroring `r30_expected_post_block`, because a decoy `eval-verdict` marker can escape the current extraction. No lab run is live on the branch; it resumes immediately after #717 lands, rebased onto those changes.
- **#729 (Auditor REGISTRY drift) - QUEUED BEHIND #717, PAIRED WITH THE STALE-WORDING FOLLOW-UP**: after #717 lands, dispatch `{"action": "lab", "issue": 729}` to extend the Auditor row's trigger cell to `schedule` · `workflow_dispatch` · the comment trigger, and batch in the removal of the stale "~14 days" wording at `LAB.md:1491` and `setup.sh:142`.
- **#730** is carried by #731 and closes on its merge. **#713** is carried by #716 and closes on its merge. **Maze Chase children (#655, #657-#661, #671-#683)** stay open until their phase PRs merge; #655 waits on the macOS/Windows matrix rows and #659 is the next roadmap phase after Phase 4. #671 remains the consumed child noted in earlier entries.
- Open issues: 23, all mapped (#730 fixed by #731, #729 queued, #717 live lab lane, #713 carried, the Maze Chase set, the two boards). Zero untriaged.

## Health and audits
- Runs: newest 100 contains exactly one failure, opencode-test 39541624600 (the #731 evidence-path gate, triaged by this run). Zero held `action_required` runs repo-wide. The maintainer cancelled/skipped rows around 03:57-04:00 are the documented concurrency and `workflow_run` fan-out cohort.
- Trigger allowlist: exact 18/18 item-for-item against `main`'s `maintainer.yml` (the live file-based set is 19 names: the 18 listed plus maintainer by design).
- Pages: root, `pet/`, `maze-chase/`, `docs/`, `preview/pr-731/`, `preview/pr-707/`, and `preview/pr-716/` all 200. Latest deploy 39541400418 succeeded at 03:57:33Z on `8cbaecc7`.
- Shipping limit: no new-project merge today; #731 is a docs lab PR, #716 a lab PR, and #707 an intermediate phase PR (`Refs #582`), so the limit does not apply.
- #669 egress-IP fast-fail: no new occurrence (the #717 class is a distinguishable provider 429).
- Model health: all three ladder rungs live and free (`deepseek-v4.1-flash-free`, `mimo-v2.6-flash-free`, `glm-5.3-flash-free`); registry has 86 entries including those three. `REQUESTED_MODEL` at `maintainer.yml:234` and `opencode.json` `model`/`small_model` unchanged.
- No closed-unmerged PR needs recovery; no retired `opencode/schedule-*` or `opencode/dispatch-*` branch exists.

## Decisions and rationale
- `decision.json = [{"action": "test", "pr": 731}, {"action": "ping", "target": 731, "message": "<evidence-gate miss and retry>"}]`.
- The test retry is the documented crash-parity recovery: a failed Tester evidence gate summons the Maintainer for a fresh `/oc test` on the same head. The work itself passed every substantive check; only the evidence file path was wrong. If the fresh Tester repeats the path miss, route `{"action": "lab"}` to harden the Tester evidence-path contract rather than retrying forever.
- No merge: #731 has no operative forwarded `approve-test` and no eval verdict; #707 has no `approve-test`/`approve-eval`; #716 carries an open round-4 finding.
- No other dispatch: #707's Tester and #717's Lab Engineer are live on their exact heads, #716 is paused by design, #729 is queued behind #717.
- No create/close/recover/ideate/auditor/curate dispatch. No emergency: production is moving on every lane.
- Session read-only apart from the `.maintainer/` outputs: gh/API reads, `git ls-remote`, run/job/PR/issue queries, the allowlist audit, Pages and registry checks.

## Watch list
1. **#731 fresh Tester** on `7d9e43cb`: on `approve-test` with evidence at `/tmp/live-run-evidence.json` -> Quality Council pass -> merge on a current-head `approve-eval` (`--rebase`, branch intact); then #730 closes, Pages redeploys. On a repeat evidence-path miss -> `{"action": "lab"}` for the Tester contract. On a genuine finding -> the fix lane.
2. **#707 Tester 39541423452** on `f68cf7ae`: on approval -> fresh Quality Council pass -> merge on a current-head `approve-eval` (`--rebase`, branch intact); then `Closes #658`, Pages redeploy, Phase 5 (#659) after its Design Council audio pass on #582; #582/#655 stay open.
3. **#717 lab round 39541387762**: on the PR it opens -> review -> read-only infra Tester -> fresh Quality Council pass -> PAT merge sweep; then #716 resumes with the R30 forward-block pin and a rebase onto the #717 changes, and #729 ships with the `LAB.md:1491` / `setup.sh:142` stale-wording cleanup. If this fourth round dies before pushing, keep routing through lab (no emergency while production moves).
4. **#716 repair**: resume only after #717; on the fix push -> review -> read-only infra Tester -> fresh eval -> PAT sweep; #713 closes with the merge. Do not retry it into the unclassified 429 while #717 is live.
5. **#717 recurrence watch**: the class has at least ten deaths; any new death before the fix lands re-confirms the priority.
6. **Failure-triage cooldown**: no second dispatch for the same workflow+branch signature (opencode-test on #731) within 30 minutes of the 04:12 failure, unless the fresh run dies again and leaves no live lane.
7. **Tester evidence-path class**: this is the first `/tmp/opencode/live-run-evidence.json` miss in the retained logs; watch for a repeat, then lab.
8. **Pages preview zero-job failure class**: watch the next bot-PR merge; otherwise log only. **#655 per-OS rows** and **#669 recurrence**: no new occurrence.

## Pointers
- Long-form run narrative: `logs/2026-10-21.md`, the 39542773378 entry.
- Maintainer prompt: `.github/agents/maintainer.md`.
- Open lanes: #731 fresh test -> eval -> merge (closes #730); #707 test -> eval -> merge (closes #658); #717 lab round -> PR -> review -> infra test -> eval -> sweep; #716 repair after #717; #729 + stale-wording cleanup after #717; #728/#727, #726/#725, #724/#723, #722, #720 done.
- Concurrent sessions: the #731 fresh Tester, the #707 Tester, and the #717 Lab Engineer are the live lanes; sibling maintainer fan-out may overlap. State is last-writer-wins; the day log is keep-both.
