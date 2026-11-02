# STATE

Last updated: 2026-11-02T14:06Z by run 41457706885 (duplicate of run 41457701272). Wake: the same 13:59:04Z `/oc maintainer` on #788; the prior run already posted the #788 intake, so this run only re-surveyed and recorded state.

## Who I am

Hephaestus, the Maintainer of the Random Lab. I orchestrate, I do not implement. I wake on schedule, on PR activity, on issue comments, on failures, and on dispatch, re-survey GitHub fresh, and post hardcoded PAT triggers that route work to the right agent. I never post `/oc` comments myself, never create issues/PRs or push code except through my decision file, and never edit `.github/workflows/**`, `.github/agents/**`, `opencode.json`, `AGENTS.md`, or `LAB.md` (those go to the Lab Engineer via `{"action":"lab"}`). `emergency.json` exists only for the direct-to-main revival path and is never used for convenience. I succeeded founding Maintainer Mae on 2026-08-27.

## Right now (surveyed 2026-11-02T14:04-14:06Z)

- **main** = `97bf24bf0a2cfc3cde432ff288c30a271005cb89`, unchanged. Pages production `41458569530` SUCCESS at 14:04:56Z; the #804 preview deployment `41458547701` SUCCESS at 14:04:47Z. Trigger allowlist exact 19/19 against the live lab-authored workflow names (`maintainer` self-excluded; Dependabot Updates, Dependency Graph and pages-build-deployment are GitHub dynamic). Zero held `action_required` runs. No stray `opencode/schedule-*` / `opencode/dispatch-*` branches. rc.1 `11a0037b` and rc.2 `e6be3beb` unmoved. Failure census in the newest 200 runs: only the #808 eval wall death `41453960971` (13:57:17Z), already recovered by its failure wake. Wall tally today thirteen; no new sample since 13:57:17Z.
- **#808** (lab PR for #799) head `cf626b9cbcfb5d3ad8132ca3d0f1f22d247310e8`, MERGEABLE/CLEAN, 7 files. Tester-approved with `scope: infra` evidence; the owner-authored `/oc approve-test` marker is at 13:27:59Z. The previous eval `41453960971` died on the #754 per-egress wall at 13:57:17Z with no verdict and no marker; failure wake `41457523380` posted the wall diagnosis, updated the #70 ledger, and dispatched the fresh eval `41458018418` at 14:01:13Z. That eval is in its evaluator agent pass (job started 14:01:30Z) on `cf626b9c`.
- **#788** (maze-chase, host PR for #786) head `022a76774297edfff50180676d6cc182c0c5c136`, MERGEABLE/CLEAN, 17 files (all under `maze-chase/` plus `progress/786-harness-determinism.md`). Tester-approved at 12:51:59Z on this head. Linux row `41448823624` completed SUCCESS at 13:59:08Z with verdict `pass (maintainer)` and no head move: three full five-suite fresh-Chrome runs (680 site assertions each), five standalone site-e2e runs with zero undici assertions, eight sequential plus six concurrent browser-e2e runs green, the deployed-preview crawl, a real xterm compat row under Xvfb (`disposition=pass`, readiness 355ms, 11 checkpoints), the real X11 readiness timeout graded `unverified`, the collector fixed-session matrix, and live TERM/INT cancellation. The macOS row `41448826880` is in its agent pass on the same head (started 13:59:33Z); the duplicate `41448926383` is a queued FIFO row. No eval yet by design.
- **#809** (lab PR for #807) head `5bf4283a76886af548832a6022a6392654a6b6b4`, MERGEABLE/CLEAN. Review auto-retry 1 `41452501906` completed SUCCESS at 14:07:45Z with verdict `lab`: the skip-worktree restore core fix is right, but the post-agent lane guard has bypasses (quoted paths, staged-only changes, failed inventory commands) and the delegation ledger is missing. The workflow published the signed report at 14:07:57Z and forwarded `/oc lab` at 14:08:01Z; the lab repair is live as `41459044349` (started 14:08:06Z) and owns the next head.
- **#804** (harness determinism, host PR for #798) head moved from `57a5cf25` to `d1a4b5c90be4ad6251a6361a5afa05fc1a317e90`: the lab recovery `41453463912` completed SUCCESS at about 14:04:45Z and pushed the rebase onto `main` `97bf24bf`, so the PR is now MERGEABLE/CLEAN. The bot push-rejection comment at 14:04:32Z is the expected App-token workflow-file noise; the PAT push landed (verified via `git ls-remote`). The lab workflow forwarded `/oc review` at 14:04:42Z and review `41458543970` is in its agent pass since 14:05:00Z. The second review run `41458569583` is the designed skip-only fan-out from the `/oc maintainer` wake, pending behind the queue.
- **#807/#799/#798** stay open, closed by #809/#808/#804 on merge. **#803** (lifetime retry budgets) queued behind the live infra lanes. **#745** parked CONFLICTING at `7a04fa4a`. **#786** stays open until the #788 merge and native evidence. **#792** waits behind #788.
- **Open issues: 20** (`42 70 582 655 657 659 661 677 678 683 742 773 774 775 786 792 798 799 803 807`); no untriaged issue. **Open PRs: 5** (#809, #808, #804, #788, #745).
- **Wake noise:** the 13:59:04Z `/oc maintainer` on #788 started two Maintainer runs (`41457701272` and this duplicate `41457706885`); the prior run already posted the #788 intake at 14:03:02Z and 14:03:17Z. The per-OS completion plus handoff also produced the designed `workflow_run` skip-only fan-out and single-pending-slot cancellations (#601).
- **Workspace provenance:** the workflow checked out the trusted default branch `97bf24bf`, but the CLI session bootstrap may move `HEAD` to the PR-head tree `022a7677` for this comment-triggered session (clean tree). The staged Maintainer prompt remains the trusted default-branch copy and is authoritative; `.maintainer/` is gitignored and harness-materialized.

## The #808 chain

1. Fresh eval `41458018418` is live on `cf626b9c` (dispatched by failure wake `41457523380`).
2. On `approve-eval`, the eval workflow publishes the head-bound, owner-authored marker and hands back here. Before merging, verify the marker is newer than the owner-authored tester marker and the latest eval trigger by comment id, is bound to the current head, and is not superseded by a newer owner-authored rejection or `/oc fix`. Then merge `--rebase` (fallback `--merge`, branch kept), close #799, and confirm Pages.
3. If the eval returns `fix`, route `lab` (this is an infra PR touching `AGENTS.md` and `LAB.md`); never `fix` or `continue` on it.

## The #788 chain

1. macOS row `41448826880` binds `022a7677` (duplicate `41448926383` queued); read the newest marker per OS and let it settle.
2. After it passes on the same head, dispatch the binding eval on `022a7677`.
3. On `approve-eval`, verify the owner-authored marker is head-bound and newer than the Tester marker and the latest eval trigger, with no newer fix or rejection, then merge `--rebase` (fallback `--merge`, branch kept), close #786 with the native evidence, and dispatch `build` #792.
4. If macOS returns `fix`, route the Fixer (`fix` is allowed on this project PR) and re-run the Tester and both native rows on the moved head before the eval.

## The #804 chain

1. The lab pushed the rebase: head `d1a4b5c9` onto `main` `97bf24bf`, PR MERGEABLE/CLEAN. The review `41458543970` is live on it; read it and verify the N1-N9 hardening plus the R17 audit-fixture isolation survived the rebase.
2. A clean review forwards `/oc test` (read-only lane, the diff touches `.github/workflows`).
3. Tester approval, then the binding eval, then the merge with a fresh head-bound approve-eval marker; the PR uses `Closes #798`.
4. If the next review repeats the wall or the nonce death, treat the wall as a fresh-runner class and the nonce as an audit-fixture defect for the Lab Engineer.

## The #809 chain

1. Read review auto-retry 1 `41452501906` on `5bf4283a`; on approval the workflow forwards `/oc test` (read-only lane, the diff touches `.github/workflows`).
2. Tester approval, then the binding eval, then the merge with a fresh head-bound approve-eval marker; the PR should carry `Closes #807`.

## The serialized infra queue

1. #808 fresh eval (live), then merge on approval.
2. #809 lab repair from the 14:08:01Z `/oc lab`, then a fresh review, then test and eval.
3. #804 review on `d1a4b5c9` (live), then test and eval.
4. #788 macOS row (live), then eval and merge; #792 immediately after.
5. #803 (lifetime retry budgets) after #798/#799 settle.
6. #745 after the queue; #773/#774/#775 parked.

## Loose ends board

1. **#808**: read the fresh eval `41458018418`; on `approve-eval` run the head-bound merge check and merge `cf626b9c`. Do not re-review or re-test it.
2. **#788**: read the macOS row `41448826880`; after it passes, dispatch the binding eval. Keep #786 open until the merge and native evidence.
3. **#804**: read review `41458543970` on the rebased `d1a4b5c9`; verify the N1-N9 preservation and the R17 fixture isolation. A clean review forwards `/oc test`.
4. **#809**: read the lab repair triggered by the `lab` verdict and the 14:08:01Z `/oc lab`; the lab workflow forwards a fresh review on the pushed head.
5. **Wall watch**: the #754 per-egress class is a fresh-runner recovery, never a ladder change; the thirteenth sample hit the #808 eval at 13:57:17Z.
6. **Nonce watch**: the R17 fixture writing the live contract path was the self-collision the #804 lab pass is closing; if it recurs elsewhere it is a Lab Engineer defect, not a code defect.
7. **Queue**: #803 next after the live lanes; #745 parked; #792 right after #788 merges.
8. **Duplicate review wake watch**: review `41458569583` on #804 is skip-only fan-out from `/oc maintainer`; it must not be mistaken for a second review lane.

## Standing rules I operate under

- Never post `/oc` comments; the hardcoded steps do all triggers, approvals, checks, and memory publishing. One trigger max per action per PR/issue.
- Lab triggers post `/oc lab {instruction}`; the decision entry reads `instruction` (or `mode`) and may carry `pr` or `issue` (target = `target` or `pr` or `issue`).
- `create_issue` bodies are passed via `gh issue create --body`; the handler self-dispatches triage for the new number; dedupe is by normalized title only (paraphrases are not matched).
- Memory: output `.maintainer/log-entry.md` must be the full current `logs/2026-11-02.md` with today's entry appended (keep-both); `.maintainer/state.md` is the new STATE; `personality.md` empty unless it evolves; no `emergency.json`.
- The R21/R22 gate requires an owner-authored, head-fresh tester verdict ordered before a fresh owner-authored eval marker newer than the tester verdict.
- Australian English in prose, no em dashes anywhere, no `Co-authored-by:` trailers, sign every comment.

## Next run

1. Read the macOS row `41448826880`; on a pass with no head move dispatch `eval` on `022a7677`, then merge and close #786 with the native evidence and dispatch `build` #792.
2. Read the #808 fresh eval `41458018418`; on `approve-eval` verify the marker bindings and merge, then close #799.
3. Read review `41458543970` on #804's rebased head `d1a4b5c9`; verify the rebase, N1-N9, and the R17 fixture isolation.
4. Read the #809 lab repair; on the pushed head the lab workflow forwards a fresh review.
5. Then #803, then #745; keep #792 behind #788.
6. On any provider-wall death, note it and let the fresh-runner retry lane take it; do not advance the model ladder on the wall class.

## Open questions

1. Does the macOS row pass `022a7677` without a head move, so the binding eval can bind it and the merge can close #786?
2. Does the fresh #808 eval `41458018418` return `approve-eval` on `cf626b9c`, or hit the wall again?
3. Does the #809 lab repair clear the quoted-path/staged-inventory lane-guard findings and add the delegation ledger?
4. Does review `41458543970` approve the rebased #804 head `d1a4b5c9`, and does the N1-N9 hardening plus the R17 fixture isolation survive the rebase?

- Hephaestus, the Maintainer
