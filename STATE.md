# STATE

Last updated: 2026-11-05T06:34Z by run 41980310929. Wake: owner `/oc maintainer` on the new PR #821 (the #792 build) at 06:25:23Z, with a second identical trigger at 06:25:39Z (run 41980339320 pending behind this one). Intake only: #821's review is already live from the owner's `/oc review`, #804's binding eval is live, #820's Lab Engineer pass is live, so the decision list is empty. `main` is `86570af18a6bfef572da05d5bfe5af61d894eb86`, with its Pages deploy green at 06:09:01Z.

## Who I am

Hephaestus, the Maintainer of the Random Lab. I orchestrate, I do not implement. I wake on schedule, on PR activity, on issue comments, on failures, and on dispatch, re-survey GitHub fresh, and post hardcoded PAT triggers that route work to the right agent. I never post `/oc` comments myself, never create issues/PRs or push code except through my decision file, and never edit `.github/workflows/**`, `.github/agents/**`, `opencode.json`, `AGENTS.md`, or `LAB.md` (those go to the Lab Engineer via `{"action":"lab"}`). `emergency.json` exists only for the direct-to-main revival path and is never used for convenience. I succeeded founding Maintainer Mae on 2026-08-27.

## Right now (surveyed 06:26-06:34Z)

- **main** = `86570af18a6bfef572da05d5bfe5af61d894eb86` (`git ls-remote` matches). Pages deploy 41978432604 completed green at 06:09:01Z on it.
- **Open PRs**: #821 (new), #804, #745. **Open issues**: 21.
- **Trigger allowlist**: exact 19/19 (20 repo workflow names minus the deliberately self-excluded `maintainer`). No workflow needs a lab fix.
- **#821 (this wake)**: "Maze Chase: close the Windows compatibility harness gaps", head `f3364c7c5a9e94df61ffc113fadacfa256959eb9`, 6 `builder:` commits, 21 files (+1215/-116), all under `maze-chase/` and `progress/` (not workflow-touching), CLEAN/MERGEABLE, body `Closes #792`. Based exactly on `86570af1`. Preview deploy 41980323105 green at 06:26:38Z. Owner review run 41980291044 is live (agent step 06:25:19Z); the pending review runs from the preview and `/oc maintainer` comments are skip-only. No Maintainer review dispatch: the owner already triggered `/oc review` at 06:25:13Z.
- **#804** (host PR for #798): head `0872b94cfba3fcce16fbd99168a8956023354b4e`, CLEAN/MERGEABLE, tester-approved chain intact (review 41781473170 approved 06:02:06Z, Tester 41782903974 approved 04:36:01Z on 11-04, owner marker 6624239389 at 06:27:09Z, handoff 6624239738). The fresh binding eval 41978421059 is live (agent step 06:08:27Z) from the `/oc eval` comment 6651092061. No new comments since.
- **#820**: Lab Engineer run 41978422369 is live (agent step 06:08:28Z) implementing proposals 1 and 2 from the 06:08:22Z instruction. No lab PR yet.
- **#745**: parked CONFLICTING/DIRTY at `7a04fa4a96e1982ac307ca40973fed29379def0b`, behind #803.
- **Failures**: last failure remains run 41939685577 at 00:13:13Z (the #754 wall). No new failures since; all post-06:00 runs are green or in progress. The 06:25 maintainer `workflow_run` fan-out runs are skip-only or concurrency-cancelled.
- **Held runs**: zero `action_required`. The four documented inert queued runs remain (36101155868, 36101155851, 36101155844, 37344324101).
- **Curator / Auditor**: last runs green (curator 05:40Z, auditor 05:36Z); the next curator tick is due around 11:40Z; #820 is the Auditor's only new finding.
- **Model watch**: pin `opencode/deepseek-v4.1-flash-free` on all knobs; ladder 3/3 live and free; no Credits/Model-not-found/FreeTier/HTTP deaths in this window.
- **Untriaged sweep**: none. #820 has a live lab lane, #792 has #821, #798 has #804, #742 has #745; #812/#814/#815/#803/#775/#774/#773 hold recorded queue positions; #659/#677/#678 are Phase 6 workstreams of the #582 epic parked behind the live lanes.

## The live lanes (do not duplicate)

1. **#821 review**: run 41980291044 live on `f3364c7c`. On approval the workflow forwards `/oc test`; on findings it forwards `/oc fix` (product PR, not infra). Then the Tester lane, then the native rows (Windows first for this PR) and the binding eval, then the merge (`--rebase --match-head-commit`, fallback `--merge`, branch kept) and the #792 closure.
2. **#804 binding eval**: run 41978421059 live on `0872b94c`. On `approve-eval`, the eval workflow publishes the owner-authored head-bound marker and the maintainer handoff; the hardcoded PAT sweep then merges (workflow-touching PR) and closes #798. On `fix`, route `lab` (infrastructure guard) with the findings and re-bind the review/tester/eval chain to the new head.
3. **#820 lab**: run 41978422369 implements bounded quota-wall recovery plus wall-aware failure-triage intake. Expect a rebase if #804 lands first (shared `silent-stall-audit.sh`, `AGENTS.md`, `LAB.md`). On approval, review/test/eval then merge. Keep #775 in scope for the intake note (no inline trigger token).
4. **#788 / #786**: merged and closed; Pages on `86570af1` verified green. Only triage post-merge failures.
5. **#745** stays parked at `7a04fa4a` behind #803; #742 closes with #745.

## The #821 chain

1. Build PR arrived 06:24:43Z for issue #792 (the four Windows compatibility harness defects: W1 too-small console pass, W2 non-portable compat suite, W3 aborting site E2E crawl, L6 divergent geometry validation).
2. The diff is strictly `maze-chase/` plus `progress/792-windows-compat-harness-gaps.md`; no protected path, so the normal review/test/eval/merge gate applies and the Maintainer may merge in-session after the approved-eval marker.
3. The owner asked for the review directly; review 41980291044 is live. The Tester follows automatically on approval.
4. Per-OS sequencing: dispatch `test-windows` (the load-bearing row, since the PR's contract is Windows-specific), plus `test-linux`/`test-macos` for the shared `run-options.sh` parser and runner edits, after the tester lane settles so a native test commit cannot stale the live review. Then the binding eval on the settled head.
5. On merge: close #792, verify Pages, and confirm the release/Windows E2E follow-ups (#683) still line up.

## The #804 chain

1. Head `0872b94c` is CLEAN/MERGEABLE on the post-#788 main; the file lanes did not overlap with #788.
2. Review round 7 `41781473170` approved at 06:02:06Z; the read-only Tester `41782903974` approved at 04:36:01Z on 11-04 (UTC offset in the run record; the marker chain is by comment id); owner marker 6624239389 at 06:27:09Z on 11-04; handoff 6624239738 at 06:27:10Z. No newer fix or rejection.
3. Two binding evals died on the wall (41786203805, 41793225566); the fresh eval 41978421059 dispatched at 06:08:25Z is the designed recovery.
4. After approval: verify the marker chain (owner-authored, head-bound `0872b94c`, newer than the tester verdict and the latest eval trigger, not superseded), let the PAT sweep merge, confirm #798 closes and Pages is green.

## The #820 chain

1. Audit issue created by the Auditor at 06:01:14Z; the `/oc maintainer` handoff landed at 06:02:08Z.
2. The previous run merged #788 (the immediate unblock), re-dispatched #804's eval, dispatched #792's build, and dispatched the Lab Engineer with proposals 1+2. The public comment asked the Owner for the capacity decision.
3. The lab PR will touch `maintainer.yml` (protected, lab-only) and the silent-stall audit. #804 also edits the audit, so a rebase is expected if #804 merges first.
4. At the lab cap, one loud health-board escalation and a red exit are expected; no inline trigger token in any board note (#775).

## The serialized infra queue

1. #804 is the live infra lane until it merges; #820's lab change is the exceptional parallel lane because it is the resilience fix for the outage and touches a different core file (`maintainer.yml`).
2. After #804 merges: reconcile #812 and #815 against the new main and dispatch one scoped audit pass (drop anything that landed; #815 overlaps #804's R17 work). Then create and dispatch the two deferred docs follow-ups (see the loose ends board).
3. Then #814 baseline fail-open, sequenced with #803 (same fix-lane verify region/counters).
4. Then #803 after the #804/#788 evidence, then #745, then #742 closes with #745.
5. #821 is a product PR, not infra, and runs on the normal lane.
6. Then the new deferred self-heal quota-park issue (loose end 14) and the #775 unpark, unless #820 subsumes them.

## Loose ends board

1. **#817 merged** `251c81a5`; #816 closed. Non-blocking follow-ups recorded by all three gates: explicit `Curator -> Reviewer` and `Auditor / Maintainer -> Reviewer` handoff arrows, the `tests fail` and Evaluator-rejected return routes, the duplicate tor-cli Website anchor masked by `.first`, and the module docstring wording. Defer a scoped Curator docs pass until #804 merges.
2. **#819 merged** `eccd93d7`; #818 closed. The Evaluator's advisory: pre-existing prose at `AGENTS.md:125,131` and `LAB.md:870-871,884` still implies `/oc fix` for failure routing without the `/oc lab` infrastructure override. Defer a scoped Lab Engineer pass until #804 merges.
3. **#788 merged** `86570af1`; #786 closed completed with both native rows and the 9.8/10 Evaluator verdict. Pages on `86570af1` verified green (41978432604, 06:09:01Z). Residual non-blocking notes stay on the PR.
4. **#804**: tester-approved `0872b94c`; fresh binding eval live; then the marker, the PAT sweep and the #798 closure.
5. **#820**: lab live with proposals 1+2; owner capacity decision requested.
6. **#821**: build PR live, review live; native rows and eval follow.
7. **#745**: parked CONFLICTING at `7a04fa4a`, behind #803.
8. **#812**: held behind #804; includes the R32 forward-target gap and the dead `outcome=skipped` note.
9. **#814**: held behind #803; coordinate the same verify region.
10. **#815**: held behind #804 (direct R17 overlap); the Auditor reproduced `31 passed, 2 failed` with an ambient `LAB_RUN_NONCE`.
11. **Pages**: `86570af1` green; the #821 preview is current on `f3364c7c`.
12. **Cron watch**: Maintainer schedules remain best-effort (6 to 8 hours in practice). Event wakes deliver; #820's bounded recovery is the mitigation.
13. **Wall watch**: cleared; last death 00:13:13Z. Fresh-runner recovery only; `retry-after` stays diagnostic.
14. **Queued-run anomaly**: four permanently queued runs with no jobs; inert, recorded for the Auditor.
15. **Model watch**: 1M-context free models noted by the Auditor; benchmark pass after the audit queue clears.
16. **#775**: recurred at 23:22-23:23Z under the wall; folded into the #820 intake fix, still open.
17. **#773 / #774**: valid docs/setup gaps from the audit; deferred behind the live lanes.

## Standing rules I operate under

- Never post `/oc` comments; the hardcoded steps do all triggers, approvals, checks, and memory publishing. One trigger max per action per PR/issue.
- Lab triggers post `/oc lab {instruction}`; the decision entry reads `instruction` (or `mode`) and may carry `pr` or `issue`.
- The `fix` action posts only `/oc fix` with no instruction; give the Fixer context with a `ping` posted before it in the same decision list.
- Infra/protected-path PRs (#804, #820's change) never take `fix`/`continue`; route `lab`. #821 is product code, so `fix` is valid if the review finds issues.
- Memory: output `.maintainer/log-entry.md` must be the full current day's log file with today's entry (keep-both); `.maintainer/state.md` is the new STATE; `personality.md` empty unless it evolves; no `emergency.json`.
- The R21/R22/R30 gate requires an owner-authored, head-fresh tester verdict ordered before a fresh owner-authored eval marker newer than the tester verdict and the latest eval trigger.
- Workflow-touching PRs merge only through the hardcoded PAT sweep; non-workflow PRs are merged in-session with `gh pr merge --rebase --match-head-commit <head>` (fallback `--merge`, never `--delete-branch`).
- Failure-triage cooldown: no second dispatch for the same workflow+branch signature within 30 minutes after the death; the eval lanes share `opencode-eval`/`main`.
- The #754 wall is a fresh-run recovery class, not a retry-exhaustion signal: no lab dispatch, no ladder advance, no re-dispatch inside a known-window. A binding eval that died on the wall is recovered by one fresh run per lane after the shared cooldown. The bounded fresh-attempt cap and wall-aware intake are in flight via #820.
- Never put an inline trigger token in a public comment or health-board note (#775): the General lane picks it up.
- Australian English in prose, no em dashes anywhere, no `Co-authored-by:` trailers, sign every comment.

## Next run

1. Read the #821 review verdict on `f3364c7c`. On approval the workflow forwards `/oc test`; do not duplicate. On findings the workflow forwards `/oc fix` (product PR).
2. On the tester-approval wake for #821, dispatch the native rows: `test-windows` first (the load-bearing row for this PR), plus `test-linux` and `test-macos` for the shared parser/runner edits; sequence the binding eval after the rows settle. A native test commit re-binds the chain, so re-check the head before the eval.
3. Read the #804 binding eval verdict on `0872b94c`. On `approve-eval`, verify the owner-authored head-bound marker chain and let the PAT sweep merge with the branch kept; confirm the #798 closure and Pages. On `fix`, route `lab` with the findings.
4. Watch the #820 lab PR: review, test, eval, merge; expect a rebase if #804 lands first. Ensure the intake note carries no inline trigger token.
5. Verify Pages after any merge; re-check the four permanently queued runs.
6. After #804 merges: reconcile #812/#815 against the new main and dispatch one scoped audit pass; then the two deferred docs follow-ups; then the deferred self-heal quota-park issue and the #775 unpark; then #814 with #803; then #803, #745 (and #742 closes). Follow #821 rather than re-dispatching its build.
7. Record the Owner capacity decision when given (fund the provider plan, raise the allowance, or lower the Maintainer cadence).
8. Do not duplicate live lanes; verify heads and artifacts against the live repo before claiming a change landed.

## Open questions

1. Does #821's review approve cleanly, or does it return findings to the Fixer?
2. Does the Windows native row reproduce the new pass contract end to end on a real Windows host?
3. Does the #804 binding eval complete on this fresh runner, unlocking the PAT sweep and the #798 closure?
4. Can the #820 lab change land without conflicting with #804's edits to the shared audit script and docs?
5. Will the Owner take the capacity decision (fund OpenCode Go or raise the allowance, or approve a lower Maintainer cadence)?
6. Does `pages.yml` stay green through the next merge cycle?
