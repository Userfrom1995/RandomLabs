# Maintainer State - 2026-10-22 01:08Z

## Last checkpoint
- Wake: `workflow_run` failure of Lab Engineer run 39687355238 (round 15 on #716, branch main, sha `010c3406`); maintainer run 39703474548, fresh survey 01:04-01:08Z. ONE DISPATCH: `lab` on #716, because the round-15 session hit the 150-minute agent cap at 01:03:46Z with no decision file and no push (branch tip still `71722c56`).

## Live pipeline (verified 01:04-01:08Z; main tip `d207655e0f863dc0c3f40db25ba3c7583088deac`)
- **#716 (lab: enforce the Evaluator gate in the PAT merge sweep, `Closes #713`, `Refs #709`) - NEW LAB ROUND DISPATCHED**: 36 commits, MERGEABLE/CLEAN, head `71722c5649f35fcddb42383f2f8491c707bbd587` (unchanged since the 22:22:10Z round-14 push). Round-15 run 39687355238 (22:33:30-01:03:49Z) died at the 150-minute agent cap with no decision and no push; the verify step redded correctly and strip/push stayed disabled. The new `/oc lab` dispatch (this run) carries the timeout context, a `main@d207655e` rebase, finding 4 only, and an early-push/streaming instruction. Round-14 findings 1-3 are closed; finding 4 remains blocking: the tester, per-OS, and review agents still execute PR code with `issues: write` and `github.token`, and the eval/test decision and evidence files are writable by that code. Never `fix`/`continue` on this workflow-touching PR.
- **#738 (Phase 5 sound design overhaul, `Refs #582`, `Closes #659`) - FIXER LIVE ON `7dc7c047`**: head `7dc7c047037de069711d7b5271ec9595e8790b37`, 35 files +1688/-720, MERGEABLE/CLEAN. The review verdict at 00:46:11Z requested fixes (web music stop/loop transitions, web mix normalization, documented MSRV, desktop/terminal/docs/tests); the owner forwarded `/oc fix` at 00:46:19Z and opencode run 39701694959 has its `fix` job live since 00:46:24Z. On approval the normal review -> Tester -> binding Quality Council -> PAT merge chain follows; the merge closes #659, keeps #582 open, and the merged tree should be checked against #682's three acceptance items.

## Health and audits
- Runs: exactly one red in the newest 200 (the lab cap timeout, now triaged by this run's lab dispatch). The cancelled maintainer `workflow_run` rows are the designed homogeneous single-pending-slot supersessions.
- Held runs: exactly 0.
- Trigger allowlist: exact 18/18 item-for-item against the live workflow `name:` fields (19 file workflows: the 18 allowed plus the self-excluded maintainer).
- Pages: deploy 39698125958 completed success at 00:11:27Z on `d207655e`; probes root, `/maze-chase/`, `/preview/pr-738/`, and `/preview/pr-716/` all HTTP 200.
- Shipping limit: no new-project merge today; #738 is an intermediate phase PR (`Refs #582`), so the limit does not apply.
- Curator: last scheduled run green and added no PR or issue, so no curate follow-up is due.
- Issues: 19 open, all mapped (#713 carried by #716; Maze Chase parent/roadmap set #582/#655/#657-#661/#671-#683; boards #70/#42). Newest open issue is still #713 (2026-10-20T14:33:12Z), so nothing is untriaged. #682's three acceptance items are implemented on #738.
- Model health: pins unchanged at `opencode/deepseek-v4.1-flash-free` for `model`, `small_model`, and `REQUESTED_MODEL`; the ladder is unchanged; no model dispatch.

## Decisions and rationale
- `decision.json`: one `lab` on #716 with the round-15 timeout context, the main@d207655e rebase, the finding-4 scope, and the early-push/streaming instruction. Rationale: no live lab session after the cap death, the last lab dispatch was 22:33:27Z (outside the 30-minute cooldown), and the PR is blocked on finding 4.
- No `review`/`test`/`eval` on #716 (head has not moved; the lab must push first). No `fix`/`continue` on #716 (workflow-touching PR). No `fix` on #738 (the owner-forwarded Fixer 39701694959 owns the head). No merge (neither PR has a current-head `approve-test` plus `approve-eval`). No create/close/recover/ideate/auditor/curate. No emergency (production is moving; this is a single cap timeout, not a broken `lab.yml`).

## Watch list
1. **#716 new lab round**: when it pushes, get a fresh review on the new head (or confirm its own forward), then read-only infra Tester -> fresh Quality Council -> PAT sweep. If it dies at the cap again, split finding 4 into two lab rounds instead of raising the cap.
2. **#738 Fixer 39701694959**: read the push, then review -> Tester -> Quality Council -> merge (close #659, verify and likely close #682, chain Phase 6 `Closes #657`).
3. **#716 review loop**: 15 rounds and counting; hold the line on no `fix`/`continue` on workflow files.
4. **Recurrence watches**: #620 free-tier, #717 upstream-endpoint, #669 egress-IP, and #653 stall classes; Pages preview zero-job class; #655 per-OS rows.
5. **Failure-triage cooldown**: no second lab dispatch for the same workflow+branch signature within 30 minutes.

## Pointers
- Long-form run narrative: `logs/2026-10-22.md`, the 39703474548 entry.
- Open lanes: #738 fix -> review/test/eval/merge (closes #659, then Phase 6); #716 lab -> fresh review -> read-only infra Tester -> Quality Council -> PAT sweep (closes #713).
- Concurrent sessions: #738 fixer 39701694959; the new #716 lab round dispatched by this run.
- Done 2026-10-21: #707/#658 merged as `d207655e`; Phase 5 build run 39693541186 success and opened #738; #737/#735, #736/#734, #733/#729, #732/#717, #731/#730, #728/#727, #726/#725, #724/#723, #722, #720.
