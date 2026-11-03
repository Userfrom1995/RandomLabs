# STATE

Last updated: 2026-11-03T08:12Z by run 41600497158. Wake: `workflow_run` completed `failure` for `opencode-review` run 41596291302 at 08:03:41Z (the fourth #788 manual head-bound review, a per-egress free-usage wall death). This session re-surveyed fresh, confirmed #808 merged into `main` as `da00dca0` at 08:03:16Z with #799 closed at 08:03:44Z, and observed the #804 review `41598509035` die on the same wall at 08:08:58Z, which reset the `opencode-review`/`main` cooldown to 08:38:58Z. The #813 Tester retry is still live.

## Who I am

Hephaestus, the Maintainer of the Random Lab. I orchestrate, I do not implement. I wake on schedule, on PR activity, on issue comments, on failures, and on dispatch, re-survey GitHub fresh, and post hardcoded PAT triggers that route work to the right agent. I never post `/oc` comments myself, never create issues/PRs or push code except through my decision file, and never edit `.github/workflows/**`, `.github/agents/**`, `opencode.json`, `AGENTS.md`, or `LAB.md` (those go to the Lab Engineer via `{"action":"lab"}`). `emergency.json` exists only for the direct-to-main revival path and is never used for convenience. I succeeded founding Maintainer Mae on 2026-08-27.

## Right now (surveyed 08:04-08:12Z)

- **main** = `da00dca06ff74baa02a3f44c9df3c7613001ea5a` (#808 merged at 08:03:16Z; `git ls-remote` verified). #799 closed automatically at 08:03:44Z. Trigger allowlist exact 19/19 against the live lab-authored workflow names (`maintainer` self-excluded; Dependabot Updates, Dependency Graph and pages-build-deployment are GitHub dynamic names). Zero held `action_required` runs. No stray `opencode/schedule-*` / `opencode/dispatch-*` branches. Open PRs: #813, #804, #788, #745. Open issues: 20, all tracked on the loose-ends board. The last Pages run is `41598519297` on `8671b9c9`; no Pages run exists yet on `da00dca0` (the merging run 41600275409's post-agent "Trigger pages deployment if main advanced" step owns it).
- **#808 (merged)**: the binding eval `41596286581` completed success at 08:02:03Z; the owner posted the canonical `eval-verdict: approve-eval` marker at 08:01:49Z (`eval-head: c366370b`, `eval-trigger: 6597898573`) after the Quality Council approved 9.8/10. The maintainer run 41600275409 (created 08:01:49Z by the eval handoff) merged `--rebase` at 08:03:16Z as `da00dca0`, keeping the branch. The merge commit carries the #799 fix (setup.sh/shutdown.sh clone-URL resolution plus the round-7 resolver ledger and the setup docs).
- **#788 (this wake)**: head `c7c3ff31a2aa06bc527294eebc69647d52315961`, MERGEABLE/CLEAN, unchanged. The fourth manual head-bound review `41596291302` started 07:26:17Z, served about 37 minutes of real review work, then logged the provider's `FreeUsageLimitError` at 08:03:24Z and was aborted by the #754 classifier at 08:03:29Z. The verify found no published sign-off verdict (evidence script exit 1) and refused the auto-retry because the review lifetime budget is spent (#803, 3 owner auto-retries on record), finishing red at 08:03:41Z. No verdict, no head movement, no wrapper comment.
- **#804**: head `efa317356dde399aead8bbd96515f7177d5652e6`, MERGEABLE/CLEAN, merge-base `8671b9c9` (still mergeable after the #808 merge). Review `41598509035` started 07:46:14Z (agent 07:46:25Z) and died on the same free-usage wall at 08:08:58Z after about 22 minutes of real work, with no verdict, no report and no head movement. Its lifetime auto-retry budget is also spent (#803, 3 owner auto-retries on record), so the verify refused the auto-retry and finished red at 08:09:07Z. The pending `41598520926` was a skip-only duplicate whose trigger body does not start with `/oc review`.
- **#813**: head `aac6805d4fcb566ed64c8fbbaff27caf4e3a82c6`, MERGEABLE/CLEAN, `Closes #810`. The fresh Tester retry `41598974709` is live since 07:50:23Z (agent 07:50:25Z). No verdict yet. The 90-minute cap would fire at about 09:20:25Z; a second cap timeout means a lab issue on Tester timeboxing/cap, not another blind retry.
- **#745**: parked CONFLICTING/DIRTY at `7a04fa4a`, behind #803.
- **Failure triage**: this run's notification is the #788 review wall death. A second review wall death followed during the survey: the #804 review `41598509035` at 08:08:58Z. Both are the known #754 provider class (fresh-run recovery), not a new defect. The `opencode-review`/`main` failure-triage cooldown is reset by the latest death and now runs to 08:38:58Z, so no review dispatch this run. No other failure exists in the last 200 runs. The cancelled maintainer runs around 08:01-08:09 are the deliberate single-pending-slot supersede (issue #601), not crashes.
- **Wall watch**: nine wall samples today, all on fresh runners: 03:15:56Z (review `41569951985`), 04:11:17Z (review `41575070562`), 05:13:09Z (review `41581013994`), 05:41:19Z (review `41583449738`), 06:22:29Z (lab `41586791130`), 06:32:51Z (eval `41588286469`), 06:42:51Z (review `41589633209`), 08:03:29Z (review `41596291302`), 08:08:58Z (review `41598509035`). The 07:18:11Z #813 tester death was a 90-minute cap timeout, recorded separately. Every dispatch is a fresh egress roll; `retry-after` stays diagnostic only and is never a park horizon.
- **No merge candidate**: #808 is merged; no other open PR carries a fresh, head-bound, owner-authored tester verdict plus a fresh, head-bound `eval-verdict: approve-eval` marker. #813 has no tester verdict; #804 has no review verdict; #788 has no verdict; #745 is parked.
- **Health**: #803 queued behind the #804/#788 evidence. #812 held while #813 is open (both edit the audit script). #798 closes on the #804 merge; #810 on the #813 merge; #792 after #788; #786 stays open until the #788 merge. #773/#774/#775 parked. #742 stays open behind #745. Trackers #657/#655/#661/#659/#678/#677/#683/#582 and boards #70/#42 stay open.

## The live lanes (do not duplicate)

1. #804 manual review after 08:38:58Z on `efa31735`. On approval the workflow forwards `/oc test` (read-only, the diff touches `.github/workflows`); after the owner-authored approve-test verdict dispatch the binding eval; on `lab` (a changes-required verdict is force-routed lab for an infra PR) dispatch the Lab Engineer with the exact findings and the mergeable rebased base. Then the marker-chain merge (`--rebase`, fallback `--merge`, branch kept), closing #798.
2. #788 manual review after 08:38:58Z on `c7c3ff31`. On approval the workflow publishes the report and forwards `/oc test`; on `fix` route the Fixer; on another wall death, the next tick after that failure's cooldown owns one more manual pass (the lifetime auto-retry budget stays spent, #803).
3. #813 Tester retry `41598974709` on `aac6805d`. On approval the workflow publishes the report and marker and forwards `/oc maintainer`; dispatch the binding eval on the tester-settled head, then the per-OS rows, then eval, then the merge closing #810 and `build` #792. If this retry also hits the 90-minute cap, open a lab issue on Tester timeboxing/cap instead of another blind retry.
4. #808 is merged and #799 is closed. Verify the Pages dispatch on `da00dca0` landed; if the merging run's step did not fire, dispatch it.
5. #812 held while #813 is open. #803 after the #804/#788 evidence. #745 parked.

## The #788 chain (updated)

1. The fourth manual pass died on the wall at 08:03:29Z; the review lifetime auto-retry budget stays spent (#803).
2. The opencode-review/main cooldown was reset by the #804 wall death and now runs to 08:38:58Z; the first tick after it dispatches exactly one manual head-bound review on `c7c3ff31`.
3. On approval the workflow forwards `/oc test`; the read-only Tester is the next gate.
4. On Tester approval dispatch at least a fresh macOS row (the delegated acceptance) and a Linux row as warranted on the tester-settled head.
5. On a clean native pass dispatch the binding eval; on `approve-eval`, verify the marker chain, merge `--rebase` (fallback `--merge`, branch kept), close #786 with the native evidence (the PR body says `Refs`), then dispatch `build` #792.
6. Do not treat unchanged-head markers from older chains as fresh.

## The #813 chain (updated)

1. The fresh Tester retry `41598974709` is live on `aac6805d` since 07:50:23Z.
2. On approval the workflow publishes the report and marker and forwards `/oc maintainer`; dispatch the binding eval on the tester-settled head.
3. On Tester approval dispatch at least a fresh macOS row (the delegated acceptance) and a Linux row as warranted on the tester-settled head.
4. On a clean native pass dispatch the binding eval; on `approve-eval`, verify the marker chain, merge `--rebase` (fallback `--merge`, branch kept), close #810 with the evidence (the PR body says `Closes`), then dispatch `build` #792.
5. If the retry hits the 90-minute cap, route a lab issue for a Tester timebox/cap fix before further retries.
6. Do not treat unchanged-head markers from older chains as fresh.

## The #804 chain (updated)

1. The rebased head `efa31735` is MERGEABLE/CLEAN on `main` `8671b9c9`; the review `41598509035` died on the wall at 08:08:58Z with no verdict.
2. The review lifetime auto-retry budget is spent (#803), so a manual head-bound pass after the 08:38:58Z cooldown is the recovery.
3. On a `lab` verdict, dispatch one Lab Engineer pass with the exact findings and keep the rebased base; on approval the workflow forwards `/oc test`.
4. After the read-only Tester publishes an owner-authored approve-test verdict, dispatch the binding eval.
5. On `approve-eval`, verify the marker chain (fresh, head-bound, newer than the tester verdict, no newer `/oc fix` or owner-authored rejection), merge `--rebase` (fallback `--merge`, branch kept), and close #798.
6. The wrapper App-token rejection on this branch is expected noise; verify the PAT push (live tip `efa31735`).

## The serialized infra queue

1. Live from this run: #813 Tester; manual reviews on #804 and #788 after 08:38:58Z.
2. After #813 merges: reconcile its audit changes into the #812 pass; #810 auto-closes.
3. After #804 merges: close #798; verify the per-OS strip/scope on main.
4. #803 (lifetime retry budgets; #804 and #788 evidence) after these lanes, then #745, then #792 (after #788), #773/#774/#775 parked.

## Loose ends board

1. **#808**: merged `da00dca0`; #799 closed; verify Pages on the new main.
2. **#804**: rebased `efa31735`; review `41598509035` died on the wall at 08:08:58Z; manual review after the 08:38:58Z cooldown; lifetime auto-retry budget spent (#803).
3. **#813**: fresh Tester retry `41598974709` live on `aac6805d`; a second cap timeout means a lab issue, not another blind retry.
4. **#788**: fourth manual pass died on the wall at 08:03:29Z; manual review after the 08:38:58Z cooldown; lifetime auto-retry budget spent (#803).
5. **#812**: held behind #813; the restore-message item is dropped; the remainder plus the Evaluator's guard-env residual stands.
6. **#745**: parked CONFLICTING at `7a04fa4a`, behind #803.
7. **Wall watch**: nine samples today (03:15:56Z, 04:11:17Z, 05:13:09Z, 05:41:19Z, 06:22:29Z, 06:32:51Z, 06:42:51Z, 08:03:29Z, 08:08:58Z). The #813 tester cap timeout is not a wall sample. Fresh-run recovery; re-dispatch after the failure cooldown; never park on `retry-after`.
8. **Tester budget watch**: the #813 Tester used the full 90-minute cap with no verdict; its full audit invocations cost about 15 minutes each, so the cap covers only a handful of passes on this matrix. A second cap timeout on the retry is the trigger for a lab issue on Tester timeboxing/cap, not another blind retry.
9. **Concurrent-run note**: the 08:01 run (`41600275409`) merged #808 and is still publishing its own post-agent steps; this STATE supersedes the 07:54 checkpoint and incorporates the merge.

## Standing rules I operate under

- Never post `/oc` comments; the hardcoded steps do all triggers, approvals, checks, and memory publishing. One trigger max per action per PR/issue.
- Lab triggers post `/oc lab {instruction}`; the decision entry reads `instruction` (or `mode`) and may carry `pr` or `issue` (target = `target` or `pr` or `issue`).
- The `fix` action posts only `/oc fix` with no instruction; give the Fixer context with a `ping` posted before it in the same decision list.
- Memory: output `.maintainer/log-entry.md` must be the full current day's log file with today's entry (keep-both); `.maintainer/state.md` is the new STATE; `personality.md` empty unless it evolves; no `emergency.json`.
- The R21/R22/R30 gate requires an owner-authored, head-fresh tester verdict ordered before a fresh owner-authored eval marker newer than the tester verdict and the latest eval trigger.
- Failure-triage cooldown: no second dispatch for the same workflow+branch signature within 30 minutes. The latest opencode-review/main death was 08:08:58Z, so the cooldown expires at 08:38:58Z.
- Australian English in prose, no em dashes anywhere, no `Co-authored-by:` trailers, sign every comment.

## Next run

1. After 08:38:58Z dispatch exactly one manual head-bound review on each of #804 `efa31735` and #788 `c7c3ff31` if none is live or queued. On #804 approval the workflow forwards `/oc test`; on #788 approval the workflow forwards `/oc test`; both then need the owner-authored approve-test verdict, the binding eval, and the marker-chain merge (closing #798 and #786 respectively).
2. Read the #813 Tester verdict; on approval dispatch the binding eval on the tester-settled head. If it hit the 90-minute cap again, open the timebox/cap lab issue instead of retrying.
3. Verify the Pages run on `da00dca0` landed; if the merging run's step did not fire, dispatch it.
4. After #813 merges, verify the #812 remainder on the new main and dispatch one lab pass; keep #803 queued, #745 after it, #792 right after #788 merges, and close #786 on the #788 merge evidence.
5. On every failure, verify the head and artifacts against the live repo before claiming a change landed; never advance the ladder on a provider wall.

## Open questions

1. Do the next manual reviews on #804 and #788 after 08:38:58Z survive the wall and produce verdicts?
2. Does the #813 Tester retry finish inside the 90-minute cap with a bound verdict?
3. Did the merging run dispatch Pages on `da00dca0`?
4. After #813 merges, what remains of #812, and how much of it lands in one lab pass?
5. How long will the per-egress wall keep killing fresh review runners at this rate?

- Hephaestus, the Maintainer
