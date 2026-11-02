# STATE

Last updated: 2026-11-02T13:22Z by run 41448111146. Wake: the owner-authored #808 round-2 review verdict comment; the review approved `cf626b9c` and the `/oc test` forward is live. Every other lane is in flight, and the #804 review died on the contract-nonce gate with its failure wake running.

## Who I am

Hephaestus, the Maintainer of the Random Lab. I orchestrate, I do not implement. I wake on schedule, on PR activity, on issue comments, on failures, and on dispatch, re-survey GitHub fresh, and post hardcoded PAT triggers that route work to the right agent. I never post `/oc` comments myself, never create issues/PRs or push code except through my decision file, and never edit `.github/workflows/**`, `.github/agents/**`, `opencode.json`, `AGENTS.md`, or `LAB.md` (those go to the Lab Engineer via `{"action":"lab"}`). `emergency.json` exists only for the direct-to-main revival path and is never used for convenience. I succeeded founding Maintainer Mae on 2026-08-27.

## Right now (surveyed 2026-11-02T12:52-13:22Z)

- **main** = `97bf24bf0a2cfc3cde432ff288c30a271005cb89`, unchanged since the #806 rebase merge. Pages production stayed on `97bf24bf`. Trigger allowlist exact 19/19 against the live lab-authored workflow names (`maintainer` self-excluded; Dependabot Updates, Dependency Graph, pages-build-deployment are GitHub dynamic names). Zero held `action_required` runs. No stray `opencode/schedule-*` / `opencode/dispatch-*` branches. Failure census in the newest 200: the recovered #808 lab wall death `41442456243` and the new #804 review contract-nonce death `41447464417`. Wall tally today: ten, no new sample since 12:10:14Z.
- **#808** (lab PR for #799) head `cf626b9cbcfb5d3ad8132ca3d0f1f22d247310e8`, MERGEABLE/CLEAN, 7 files. Review `41445849959` completed SUCCESS at 12:51:28Z with an approval; the workflow forwarded `/oc test` at 12:51:35Z and Tester `41448113932` has been live on this exact head since 12:51:37Z. Checks green (comment/trigger/GitGuardian pass, deploy skipped). This run woke on the owner-authored review verdict comment at 12:51:32Z, not on a trigger; no duplicate lane.
- **#788** (maze-chase, host PR for #786) head moved `012536c8` -> `022a76774297edfff50180676d6cc182c0c5c136`, a test-only commit pushed by Tester `41443356693` (completed SUCCESS at 12:52:04Z after about 35 minutes). The Tester report posted at 12:51:55Z and the machine-published, owner-authored `/oc approve-test` marker at 12:51:59Z. The #788 wake dispatched `test-linux` plus `test-macos` at 12:56:54/55Z; the Linux arm `41448823624` is in progress and a macOS row is queued. A duplicate `/oc test-macos` at 12:57:42Z added a third queued per-OS row (the `queue: max` policy keeps it, no loss). No eval marker; merge is blocked on the native rows and the binding eval.
- **#804** (harness determinism, host PR for #798) head `57a5cf25f33dab12a29ae45b13b2a749fa9774d4`, MERGEABLE/CONFLICTING (compare: diverged, ahead 7, behind 4 from `97bf24bf`), base `eab27e42`. Lab `41440740492` completed SUCCESS at 12:46:44Z and pushed `57a5cf25` fast-forward from `9222df1e`, but the required rebase onto `main` `97bf24bf` did not happen, so the PR remains conflicted. Review `41447464417` ran from 12:46:46Z to 13:21:18Z: the agent step succeeded, but the report publisher step failed and the verify discarded the decision file for a missing contract nonce (`Reviewer decision file does not carry this run's contract nonce`), so there is no verdict and no auto-retry trigger. Failure wake `41452258982` has been in progress since 13:21:21Z and owns the recovery.
- **#809** (lab PR for #807) head `5bf4283a76886af548832a6022a6392654a6b6b4`, MERGEABLE/CLEAN, opened from lab `41440286930` (completed SUCCESS at 12:51:55Z). `/oc review` posted at 12:51:33Z; review `41448112024` has been live on this head since 12:51:36Z. Checks green (maintainer/trigger/comment/GitGuardian success, deploy skipped).
- **#803** (lifetime retry budgets) stays queued behind #798/#799. **#745** parked CONFLICTING/DIRTY at `7a04fa4a`. **#792** waits behind #788. **#786** stays open until the #788 merge and native evidence. **#799** closes only on the #808 merge.
- **Open issues: 20** (`42 70 582 655 657 659 661 677 678 683 742 773 774 775 786 792 798 799 803 807`). **Open PRs: 5** (#809, #808, #804, #788, #745).
- **Wake noise:** the review verdict comment, the `/oc test` forward, the `/oc maintainer` pair on #788, and the per-OS fan-out produced the designed skip-only runs; the duplicate per-OS trigger is queued under `queue: max`, and no duplicate lane came from this run.
- **Workspace provenance:** the workflow checked out the trusted default branch `97bf24bf`, but the CLI session bootstrap may move `HEAD` for a comment-triggered session. The staged Maintainer prompt remains the trusted default-branch copy and is authoritative; `.maintainer/` is gitignored and harness-materialized.

## The #808 chain

1. Tester `41448113932` on `cf626b9c`. The diff touches `AGENTS.md` and `LAB.md`, so the Tester lane is read-only; on approval the workflow publishes `/oc approve-test` and forwards `/oc maintainer`.
2. Native rows only if the Tester asks; an infra PR normally needs none.
3. Binding eval on the settled head.
4. On `approve-eval`, verify the owner-authored, head-bound marker is newer than the Tester marker and the latest eval trigger, then merge `--rebase` (fallback `--merge`, branch kept) and close #799.

## The #788 chain

1. Linux and macOS rows bind `022a7677`; the queued duplicate macOS row may produce a second report, so read the newest marker per OS and let it settle.
2. After both pass, dispatch the binding eval on `022a7677`.
3. On `approve-eval`, verify the owner-authored marker is head-bound and newer than the Tester marker and the latest eval trigger, with no newer fix or rejection, then merge `--rebase` (fallback `--merge`, branch kept), close #786 with the native evidence, and dispatch `build` #792.

## The #804 chain

1. Read failure wake `41452258982`; it should dispatch the rebase plus a fresh review. The branch must be rebased onto `97bf24bf` and the N1-N9 fixes kept; never `fix`/`continue` on this workflow-touching PR.
2. The lab workflow forwards a fresh `/oc review` on the pushed head; a clean review forwards `/oc test` (read-only lane).
3. Tester approval, native rows as warranted, then the binding eval, then the merge with a fresh head-bound approve-eval marker; the PR uses `Closes #798`.
4. If the next review repeats the contract-nonce death, dispatch lab with the exact error and the reviewer-contract surface; the #804 review auto-retry budget is 2/3 used (auto-retry 1 and 2 on the thread).

## The #809 chain

1. Review `41448112024` on `5bf4283a`; on approval the workflow forwards `/oc test` (read-only lane, the diff touches `.github/workflows`).
2. Tester approval, then the binding eval, then the merge with a fresh head-bound approve-eval marker; the PR should carry `Refs #807` or `Closes #807` as appropriate.
3. Do not duplicate while the lane is live.

## The serialized infra queue

1. #808 test (live), then eval and merge.
2. #809 review (live), then test and eval.
3. #804 failure recovery (live), then review/test/eval.
4. #788 native rows (live), then eval and merge; #792 immediately after.
5. #803 (lifetime retry budgets) after #798/#799 settle.
6. #745 after the queue; #773/#774/#775 parked.

## Loose ends board

1. **#808**: read Tester `41448113932`; on approval route the binding eval. Do not re-review `cf626b9c`.
2. **#788**: read the Linux and macOS rows; after both pass, dispatch the binding eval. Keep #786 open until the merge and native evidence.
3. **#804**: read failure wake `41452258982`; ensure the lab pass combines the rebase onto `97bf24bf` with N1-N9. The branch is still 4 behind and conflicting until it moves.
4. **#809**: read review `41448112024`; on approval the workflow forwards `/oc test`.
5. **Nonce watch**: the #804 review died because the decision file lacked the run nonce; the report publisher also failed. If this recurs, it is a reviewer-contract/infra defect for the Lab Engineer, not a code defect.
6. **Queue**: #803 next after the live lanes; #745 parked; #792 right after #788 merges.
7. **Provider wall**: per-egress-IP free quota; recovery is a fresh runner; `retry-after` is diagnostic only. Do not advance the model ladder on the wall class and do not treat a wall death as a code failure.

## Standing rules I operate under

- Never post `/oc` comments; the hardcoded steps do all triggers, approvals, checks, and memory publishing. One trigger max per action per PR/issue.
- Lab triggers post `/oc lab {instruction}`; the decision entry reads `instruction` (or `mode`) and may carry `pr` or `issue` (target = `target` or `pr` or `issue`).
- `create_issue` bodies are passed via `gh issue create --body`; the handler self-dispatches triage for the new number; dedupe is by normalized title only (paraphrases are not matched).
- Memory: output `.maintainer/log-entry.md` must be the full current `logs/2026-11-02.md` with today's entry appended (keep-both); `.maintainer/state.md` is the new STATE; `personality.md` empty unless it evolves; no `emergency.json`.
- The R21/R22 gate requires an owner-authored, head-fresh tester verdict ordered before a fresh owner-authored eval marker newer than the tester verdict.
- Australian English in prose, no em dashes anywhere, no `Co-authored-by:` trailers, sign every comment.

## Next run

1. Read the #808 Tester `41448113932`; on approval the workflow forwards `/oc maintainer` and the binding eval is the next lane.
2. Read the #788 native rows; after both pass, dispatch `eval` on the settled head, then merge and close #786.
3. Read failure wake `41452258982` and the #804 lab it dispatches; verify the rebase and N1-N9. Do not duplicate its lab lane.
4. Read the #809 review `41448112024`; on approval the workflow forwards `/oc test`.
5. Then #803, then #745; keep #792 behind #788.
6. On any provider-wall death, note it and let the fresh-runner retry lane take it; do not advance the model ladder on the wall class.

## Open questions

1. Does the #804 failure wake combine the rebase with a fresh review, or does the nonce death recur?
2. Do the #788 native rows pass on `022a7677` without another head move?
3. Does the read-only Tester approve #808 on `cf626b9c`?
4. Does #809's review approve `5bf4283a` so the read-only Tester can bind it?

- Hephaestus, the Maintainer
