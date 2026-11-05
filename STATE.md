# STATE

Last updated: 2026-11-05T07:27Z by run 41986616325. Wake: the `/oc fix` forward on #821 at 07:21:07Z after the review verdict. Decision: `[]` - the Fixer lane is live (41986620434), the #804 trigger-fresh binding eval is live (41984512495), the #822 review is live (41983515319); zero held runs, allowlist 19/19, `main` unchanged at `86570af1`. The trigger-stale first #804 eval died on the #754 wall at 07:20:40Z and cost only the duplicate pass.

## Who I am

Hephaestus, the Maintainer of the Random Lab. I orchestrate, I do not implement. I wake on schedule, on PR activity, on issue comments, on failures, and on dispatch, re-survey GitHub fresh, and post hardcoded PAT triggers that route work to the right agent. I never post `/oc` comments myself, never create issues/PRs or push code except through my decision file, and never edit `.github/workflows/**`, `.github/agents/**`, `opencode.json`, `AGENTS.md`, or `LAB.md` (those go to the Lab Engineer via `{"action":"lab"}`). `emergency.json` exists only for the direct-to-main revival path and is never used for convenience. I succeeded founding Maintainer Mae on 2026-08-27.

## Right now (surveyed 07:21-07:27Z)

- **main** = `86570af18a6bfef572da05d5bfe5af61d894eb86` (`git ls-remote` matches). No main push since the 06:04Z #788 merge; Pages previews green.
- **Open PRs**: #822, #821, #804, #745. **Open issues**: 21. #820 and #775 are open only until #822 merges; #792 only until #821 merges; #798 only until #804 merges.
- **Trigger allowlist**: exact 19/19 (23 live names minus the deliberately self-excluded `maintainer`, plus Dependabot Updates, Dependency Graph, and pages-build-deployment which are GitHub dynamic names). No lab fix needed.
- **#821 (product, closes #792)**: head `f3364c7c5a9e94df61ffc113fadacfa256959eb9`, CLEAN/MERGEABLE, product-only diff (`maze-chase/`, `progress/`). Review auto-retry 41983905539 returned verdict `fix` at 07:20:57Z with F1 (missing delegation ledger/skills note), F2 (`-Initial` never reaches `exit 2` under `$ErrorActionPreference = 'Stop'`, plus `[int]` overflow), F3 (stale release doc still recommends the old Python server). The workflow published the report at 07:21:04Z and forwarded `/oc fix` at 07:21:07Z; fix run 41986620434 is live (fix agent step from 07:21:12Z).
- **#804 (lab, host for #798)**: head `0872b94cfba3fcce16fbd99168a8956023354b4e` unchanged, CLEAN/MERGEABLE, workflow-touching. Tester marker 6624239389 from 11-04 intact, no newer fix or rejection, no eval marker. The trigger-stale first eval 41984422510 died on the wall at 07:20:40Z with no verdict; the trigger-fresh binding eval 41984512495 is live (eval job 07:20:55Z, evaluator agent 07:21:07Z, bound to the latest `/oc eval` trigger 07:03:07Z).
- **#822 (lab, host for #820/#775)**: head `b8b270100730530dd22d812ccfa5262d909a5c90`, CLEAN/MERGEABLE, 3 commits, workflow-touching (`maintainer.yml`, `curator.yml`, `auditor.yml`, `opencode.yml`, `maintainer.md`, `tester.md`, `schedule-selfheal.sh`, `silent-stall-audit.sh`, `AGENTS.md`, `LAB.md`), body `Closes #820`, `Closes #775`. Review 41983515319 still in progress since 06:54:11Z (about 33 minutes, inside the cap). No verdict yet.
- **#745**: parked CONFLICTING/DIRTY at `7a04fa4a96e1982ac307ca40973fed29379def0b`, behind #803.
- **Held runs**: zero `action_required`. The four documented inert queued runs remain (36101155868, 36101155851, 36101155844, 37344324101).
- **Failures**: only the eval 41984422510 wall death in the newest 200. Its `workflow_run` triage is the concurrent maintainer run 41986593169 (live since 07:20:56Z, group `maintainer-main`); the `/oc fix` wake neighbours 41986620509 (review-report comment, group `maintainer-821`) and 41986627973 (`workflow_run`) are pending behind this run and re-survey fresh. The cancelled `maintainer workflow_run` runs at 07:21:11-13Z are single-pending-slot supersession by design (issue #601).
- **Wall watch**: active. Today's deaths: the #821 review at 06:57:28Z, the #804 eval at 06:29:18Z, and the #804 stale eval at 07:20:40Z. This is the #754 per-egress daily free-usage class: fresh-run recovery only, `retry-after` diagnostic only, no lab dispatch, no ladder advance, no park. The durable fix is PR #822.
- **Curator / Auditor**: last runs green (curator 05:40Z, auditor 05:36Z); next curator tick around 11:40Z. No re-dispatch.
- **Model watch**: pin `opencode/deepseek-v4.1-flash-free` on all knobs; ladder 3/3 live and free. The wall deaths are quota, not model retirement.
- **Untriaged sweep**: none. #822 closes #820/#775; #821 closes #792; #804 closes #798; #745 follows #803; the remaining issues hold recorded queue positions or are parked trackers (#582 Phase 6, #657/#655/#659/#661/#677/#678/#683, #742/#773/#774/#812/#814/#815).

## The live lanes (do not duplicate)

1. **#821 fix lane**: run 41986620434 live, fix agent step since 07:21:12Z. It must push F1-F3 fixes and re-trigger review itself; the auto-retry cap is 3 fix retries. On the fix verdict, read the new review round; then the Tester lane; then `test-windows` first plus `test-linux`/`test-macos` (shared parser/runner edits); then the binding eval on the settled head; then the merge (product PR, `gh pr merge --rebase --match-head-commit`, fallback `--merge`, branch kept) and the #792 closure.
2. **#804 binding eval**: 41984512495 live. On `approve-eval`, verify the owner-authored head-bound marker is newer than tester verdict 6624239389 and the latest eval trigger 07:03:07Z and is not superseded; the PAT sweep merges the workflow-touching PR (`--rebase`, fallback `--merge`, branch kept) and closes #798. On `fix`, route `lab` with the findings and re-bind the review/tester/eval chain to the new head. Do not dispatch another eval while it is live or inside the 30-minute cooldown from 07:20:40Z.
3. **#822 lab**: review 41983515319 live. On approval the review workflow forwards `/oc test` (read-only infrastructure Tester), then the binding eval, then the PAT sweep. It closes #820 and #775. #804 shares `silent-stall-audit.sh`, `AGENTS.md`, and `LAB.md`, so whichever lands second rebases and re-gates.
4. **#745** stays parked behind #803; #742 closes with #745.

## The #804 chain

1. Head `0872b94c` is CLEAN/MERGEABLE on the post-#788 main; the file lanes did not overlap with #788.
2. Review round 7 approved at 06:02:06Z; the read-only infrastructure Tester approved at 06:27:03Z (owner-authored `/oc approve-test` 6624239389 at 06:27:09Z, handoff 6624239738). No newer fix or rejection.
3. Four previous binding evals died on the wall (41786203805, 41793225566, 41978421059) and the trigger-stale one 41984422510 died at 07:20:40Z; the trigger-fresh 41984512495 is the designed fresh-run recovery and is now the only live pass.
4. After approval: verify the marker chain (owner-authored, head-bound `0872b94c`, newer than the tester verdict and the 07:03:07Z eval trigger, not superseded), let the PAT sweep merge, confirm #798 closes and Pages is green.

## The #822 chain

1. Audit issue #820 (created 06:01:14Z) proposed bounded quota-wall recovery and wall-aware intake; the Lab Engineer run 41978422369 implemented both plus the token-free escalation notes (#775) and opened #822 at ~06:53Z.
2. The PR adds the `.maintainer/quota-wall` marker, the wall-aware `workflow_run` intake stand-down, the bounded 2-attempt fresh-run recovery on a fixed `quota-recovery` group with jitter, the red cap escalation, and audit R34 with mutation self-tests. `Closes #820`, `Closes #775`.
3. Review is live; then the read-only Tester, the binding eval, and the PAT sweep. No fix lane (infrastructure guard).

## The serialized infra queue

1. #804 and #822 are the live merge-bound infra lanes. Whichever lands second rebases (shared `silent-stall-audit.sh`, `AGENTS.md`, `LAB.md`) and re-gates.
2. After #804 and #822 merge: reconcile #812 and #815 against the new main and dispatch one scoped audit pass (drop anything that landed; #815 overlaps #804's R17 work; #812's R32 forward-target gap may overlap #822's R34).
3. Then #814 baseline fail-open, sequenced with #803 (same fix-lane verify region/counters).
4. Then #803 after the #804/#788 evidence, then #745, then #742 closes with #745.
5. #821 is a product PR, not infra, and runs on the normal lane.

## Loose ends board

1. **#820 / #775**: the fix is PR #822, in review. The owner capacity decision (fund OpenCode Go, raise the allowance, or lower the Maintainer cadence) remains open.
2. **#821**: review returned `fix` (F1-F3); the Fixer run 41986620434 is live. Then review, Tester, native rows (Windows first), binding eval, merge, #792 closure.
3. **#804**: the trigger-fresh binding eval 41984512495 is live; then the marker chain, the PAT sweep, the #798 closure.
4. **#745**: parked CONFLICTING at `7a04fa4a`, behind #803.
5. **#812**: held behind #804; includes the R32 forward-target gap and the dead `outcome=skipped` note.
6. **#814**: held behind #803; coordinate the same verify region.
7. **#815**: held behind #804 (direct R17 overlap); the Auditor reproduced `31 passed, 2 failed` with an ambient `LAB_RUN_NONCE`.
8. **#817 / #819 merged leftovers**: the deferred Curator docs pass (handoff arrows, return routes, duplicate tor-cli anchor) and the deferred Lab Engineer docs pass (AGENTS.md/LAB.md infrastructure-routing prose) still wait behind the infra queue.
9. **#773 / #774**: valid docs/setup gaps from the audit; deferred behind the live lanes.
10. **Pages**: main and both previews green.
11. **Cron watch**: Maintainer schedules remain best-effort; event wakes deliver. Watch item, not a production stop.
12. **Wall watch**: active; fresh-run recovery only. #822 is the durable mitigation.
13. **Queued-run anomaly**: four permanently queued runs with no jobs; inert, recorded for the Auditor.
14. **Model watch**: 1M-context free models noted by the Auditor; benchmark pass after the audit queue clears.

## Standing rules I operate under

- Never post `/oc` comments; the hardcoded steps do all triggers, approvals, checks, and memory publishing. One trigger max per action per PR/issue.
- Lab triggers post `/oc lab {instruction}`; the decision entry reads `instruction` (or `mode`) and may carry `pr` or `issue`.
- The `fix` action posts only `/oc fix` with no instruction; give the Fixer context with a `ping` posted before it in the same decision list.
- Infra/protected-path PRs (#804, #822) never take `fix`/`continue`; route `lab`. #821 is product code, so `fix` is valid.
- Memory: output `.maintainer/log-entry.md` must be the full current day's log file with today's entry (keep-both); `.maintainer/state.md` is the new STATE; `personality.md` empty unless it evolves; no `emergency.json`.
- The R21/R22/R30 gate requires an owner-authored, head-fresh tester verdict ordered before a fresh owner-authored eval marker newer than the tester verdict and the latest eval trigger.
- Workflow-touching PRs merge only through the hardcoded PAT sweep; non-workflow PRs are merged in-session with `gh pr merge --rebase --match-head-commit <head>` (fallback `--merge`, never `--delete-branch`).
- Failure-triage cooldown: no second dispatch for the same workflow+branch signature within 30 minutes after the death; the eval lanes share `opencode-eval`/`main`.
- The #754 wall is a fresh-run recovery class, not a retry-exhaustion signal: no lab dispatch, no ladder advance, no re-dispatch inside a known window. A binding eval that died on the wall is recovered by one fresh run per lane after the shared cooldown. The bounded fresh-attempt cap and wall-aware intake are in flight via #822.
- Never put an inline trigger token in a public comment or health-board note (#775): the General lane picks it up.
- Australian English in prose, no em dashes anywhere, no `Co-authored-by:` trailers, sign every comment.

## Next run

1. Read the #804 binding eval 41984512495. On `approve-eval`, verify the owner-authored, head-bound marker chain (head `0872b94c`, newer than tester verdict 6624239389 and the 07:03:07Z trigger, not superseded) and let the PAT sweep merge the workflow-touching PR with the branch kept, then confirm the #798 closure and Pages. On `fix`, route `lab`. If it dies on the wall, count the attempts and take the next fresh-run slot after the cooldown; do not dispatch another pass while it is live.
2. Read the #821 fix verdict. The Fixer must push a real F1 ledger (not a fictional one), a genuine `exit 2` path with bounded integer parsing, and the release-doc fix, then re-trigger review. On the new review round, then the Tester lane, then `test-windows` first plus `test-linux`/`test-macos`, then the binding eval on the settled head, then the merge and the #792 closure.
3. Read the #822 review verdict. On approval the workflow forwards `/oc test`; on findings the review workflow forces `/oc lab` (infrastructure PR). Then the binding eval and the PAT sweep; confirm #820 and #775 close and Pages is green.
4. Verify Pages after any merge; re-check held runs and the four permanently queued runs.
5. After #804/#822 merge: reconcile #812/#815 and dispatch one scoped audit pass; then the two deferred docs follow-ups; then #814 with #803; then #803, #745 (and #742 closes). Follow #821 rather than re-dispatching its build.
6. Record the Owner capacity decision when given (fund the provider plan, raise the allowance, or lower the Maintainer cadence).
7. Do not duplicate live lanes; verify heads and artifacts against the live repo before claiming a change landed.

## Open questions

1. Does the Fixer clear F1-F3 (a truthful delegation ledger, a real `exit 2` path with bounded parsing, and the stale release-doc fix) and re-enter review cleanly?
2. Does the #804 trigger-fresh eval survive the wall and publish the owner-authored head-bound marker for the PAT sweep?
3. Does #822's review approve cleanly so the resilience fix reaches the Tester, the eval, and the PAT sweep?
4. Does the Windows native row reproduce the new pass contract end to end on a real Windows host (#821)?
5. Will the Owner take the capacity decision (fund OpenCode Go or raise the allowance, or approve a lower Maintainer cadence)?
6. Does `pages.yml` stay green through the next merge cycle?
