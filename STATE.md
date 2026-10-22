# Maintainer State - 2026-10-22 04:12Z

## Last checkpoint
- Wake: the 04:06:16Z `/oc maintainer` on the new Curator PR #740 (issue 740), ten seconds after the owner `/oc review` at 04:06:07Z and a minute after the Curator run that produced #739/#740. Fresh re-survey 04:07-04:12Z. ZERO DISPATCH: the review approved `2b25f680` at 04:07:21Z and the Tester run 39720603366 is live on exactly that head; #716 and #738 keep their live gates. One status tick posted on #740.

## Live pipeline (verified 04:07-04:12Z; main tip `d207655e0f863dc0c3f40db25ba3c7583088deac` unchanged since the 23:24:16Z #707 merge)
- **#740 (curate: restore the live on-demand triggers in the README roster, `Fixes #739`) - REVIEW APPROVED, TESTER LIVE ON `2b25f680`**: head `2b25f680504d7275da9be0eee9749b7bede743e6` (1 commit, `README.md` +5/-2, MERGEABLE/CLEAN, remote tip matches). The diff only restores `/oc ideate`, `/oc eval`, and `/oc auditor` to the public roster; all three are live triggers (`ideate.yml:32`, `opencode-eval.yml:29`, `auditor.yml:36`) and registered in `REGISTRY.md`. opencode-review 39720476851 (created 04:06:10Z, job 04:06:13Z) approved at 04:07:21Z with no blocking findings; the workflow's `/oc test` forward at 04:07:29Z started opencode-test 39720603366 (test job since 04:07:34Z) on the same head. On `approve-test` the test workflow notifies this maintainer, which routes the Quality Council; only `approve-eval` merges, closing #739.
- **#716 (lab: enforce the Evaluator gate in the PAT merge sweep, `Closes #713`, `Refs #709`) - REVIEW AND B1-B6 LAB BOTH LIVE ON `276f5cf4`**: head `276f5cf4a0a4259a7c0b125a62818f83b03d05df` (41 commits, 22 files +6479/-467, MERGEABLE/CLEAN, remote tip matches). opencode-review 39719350239 has been in its review job since 03:53:51Z; Lab Engineer 39713672590 has been live since 03:53:52Z on the same head. No verdict or push since the 03:59:51Z status tick. Workflow-touching: never `fix`/`continue`.
- **#738 (Phase 5 sound design overhaul, `Refs #582`, `Refs #659`) - REVIEW LIVE ON `8bb24a82`**: head `8bb24a82089e9928e30bd6585cb6f0c315e815b8` (14 commits, 39 files +2541/-767, MERGEABLE/CLEAN, remote tip matches). opencode-review 39718616546 has been in its review job since 03:45:45Z; no verdict yet. Body is current (592 passed across 63 targets, wasm 212,234 bytes / `8bf0b74b...`, `0.1 us/tick` release) and uses `Refs #659`, so #659 stays OPEN.
- **#739 intake check**: the Curator's tracking issue (created 04:04:19Z) is fully carried by #740 (`Fixes #739`); no untriaged content. #713 stays carried by #716. The Maze Chase set is unchanged.
- **Schedules**: curator 39718638611 completed success at 04:06:19Z (it produced #739/#740); auditor 39718307793 completed success at 04:07:21Z. Pending curator/auditor rows from the 04:06 comment events are skip-only queue siblings.

## Health and audits
- Runs: zero failure/timed_out/startup_failure in the newest 200; zero held `action_required` runs repo-wide. The newest green deploys are main 39720493248 on `d207655e` and the #740 preview 39720390250 on `2b25f680`.
- Trigger allowlist: exact 18/18 item-for-item against the 19 live workflow files minus the self-excluded maintainer (parsed set comparison), no missing, no stale.
- Pages: root, `/docs/`, `/maze-chase/`, `/preview/pr-740/`, `/preview/pr-716/`, and `/preview/pr-738/` all HTTP 200 at 04:08Z.
- Recovery: last 10 closed PRs are all merged; no closed-unmerged work.
- Issues: 19 open, all mapped; newest open is #739 (carried by #740); zero untriaged.
- Model health: pins unchanged at `opencode/deepseek-v4.1-flash-free` for `model`, `small_model`, and `REQUESTED_MODEL`; ladder unchanged (`deepseek-v4.1-flash-free`, `mimo-v2.6-flash-free`, `glm-5.3-flash-free`), all three live and free.

## Decisions and rationale
- `decision.json = []` plus one bot status tick on #740. No `review`: the review already approved the current head. No `test`: the review workflow's `/oc test` forward already owns exactly `2b25f680`. No `eval`: no Tester approval yet. No `merge`: #740 has no `approve-test` plus `approve-eval`; #716 and #738 have neither. No `lab`: #716 already has two live lab rounds and no failure. No `fix`/`continue` on #716 (workflow-touching). No create/close/recover/ideate/auditor/curate: zero untriaged content, no curator follow-up, no closed-unmerged work. No emergency: production is moving and `lab.yml` executes normally. Session read-only apart from the `.maintainer/` outputs: gh/API reads, `git ls-remote`, run/job queries, parsed allowlist audit, trigger-filter greps, registry/ladder check, and Pages probes.

## Watch list
1. **#740 Tester**: on `approve-test` dispatch `eval` for the exact head; merge only on `approve-eval`, which closes #739. If findings, route the Fixer.
2. **#716 review and B1-B6 lab**: read the verdict; the lab round will push a new head needing its own fresh review. On a clean current-head review: read-only infra Tester -> fresh Quality Council -> PAT sweep; #713 closes on merge. Never `fix`/`continue`.
3. **#738 review on `8bb24a82`**: on approve confirm the Tester plus the macOS/Windows per-OS rows, then the Quality Council. At merge keep #659 OPEN, verify and close #682 if satisfied, then chain Phase 6 `Closes #657`.
4. **Failure-triage cooldown**: no second lab dispatch for the same workflow+branch signature within 30 minutes.
5. **Recurrence watches**: #620 free-tier, #717 upstream-endpoint, #669 egress-IP, #653 stall classes; Pages preview zero-job class; #655 per-OS rows.

## Pointers
- Long-form run narrative: `logs/2026-10-22.md`, the 39720489686 entry.
- Open lanes: #740 test -> Quality Council -> merge (closes #739); #716 review + B1-B6 lab -> fresh review -> read-only infra Tester -> Quality Council -> PAT sweep (closes #713); #738 review -> Tester/per-OS -> Quality Council -> merge (keep #659 open, verify/close #682, then Phase 6 `Closes #657`).
- Concurrent sessions: opencode-test 39720603366 on #740, opencode-review 39719350239 and Lab Engineer 39713672590 on #716, opencode-review 39718616546 on #738.
- Done 2026-10-21: #707/#658 merged as `d207655e`; #737/#735, #736/#734, #733/#729, #732/#717, #731/#730, #728/#727, #726/#725, #724/#723, #722, #720.
