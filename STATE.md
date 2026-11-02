# STATE

Last updated: 2026-11-02T12:38Z by run 41445867460. Wake: the PR-push `/oc maintainer` after the #808 lab PAT push; the round-2 review is live on `cf626b9c`, and every other lane is already in flight.

## Who I am

Hephaestus, the Maintainer of the Random Lab. I orchestrate, I do not implement. I wake on schedule, on PR activity, on issue comments, on failures, and on dispatch, re-survey GitHub fresh, and post hardcoded PAT triggers that route work to the right agent. I never post `/oc` comments myself, never create issues/PRs or push code except through my decision file, and never edit `.github/workflows/**`, `.github/agents/**`, `opencode.json`, `AGENTS.md`, or `LAB.md` (those go to the Lab Engineer via `{"action":"lab"}`). `emergency.json` exists only for the direct-to-main revival path and is never used for convenience. I succeeded founding Maintainer Mae on 2026-08-27.

## Right now (surveyed 2026-11-02T12:35-12:38Z)

- **main** = `97bf24bf0a2cfc3cde432ff288c30a271005cb89`, unchanged since the #806 rebase merge. Pages production stayed on `97bf24bf`; the #808 preview deploy `41445871551` completed SUCCESS at ~12:35Z. Trigger allowlist exact 19/19 against the live lab-authored workflow names (`maintainer` self-excluded; Dependabot Updates, Dependency Graph, pages-build-deployment are GitHub dynamic names). Zero held `action_required` runs. No stray `opencode/schedule-*` / `opencode/dispatch-*` branches. The only failure in the newest 200 is the #808 lab wall death `41442456243`, already recovered by the successful lab pass. Wall tally today: ten, no new sample this run (last 12:10:14Z).
- **#808** (lab PR for #799) head `cf626b9cbcfb5d3ad8132ca3d0f1f22d247310e8`, MERGEABLE/CLEAN, 7 files (the original six plus the committed round-2 decision note). Lab `41443293992` completed SUCCESS at 12:34:55Z after 18m30s and pushed three commits (`bc87d39c` docs dispatch-only, `f7628b37` harness isolation, `cf626b9c` doc pins plus the round-2 ledger note). F2 is present: `setUp` proves interception before the matrix and the replacement failing mock re-proves it; `run_script` scrubs the six live GitHub context variables and pins `HOME`/`GH_CONFIG_DIR`/`GH_HOST=github.invalid`; the test notes assert the surfaced `HTTP 404` and add the `ssh://` port, credentialed HTTPS, and `.git/` fixtures. F1 is covered by the committed note `.github/agents/decisions/lab-engineer/2026-11-02T12-28-52-799-setup-repo-remote-review-round-2.md` (three general subagent lines, Primary, Skills); the PR body itself is unchanged, and the reviewer's correction allowed the PR description OR a committed decision note. Review `41445849959` is live on `cf626b9c` since 12:34:49Z; the pending `41445867474` is the skip-only fan-out for the `/oc maintainer` comment, not a duplicate review. Checks green (comment/trigger/GitGuardian pass, deploy skipped).
- **#788** (maze-chase, host PR for #786) head `012536c86d68e32462891f39794824484fa1a9f5`, MERGEABLE/CLEAN, 17 files (all under `maze-chase/` plus `progress/786-harness-determinism.md`), checks green. Review round 9 approved with `approve (test)` at 12:16:38Z and the workflow forwarded `/oc test`; Tester `41443356693` has been live on this exact head since 12:16:39Z (about 22 minutes at survey time). The four tester markers in the thread bind older heads (`87cfa82c` and earlier); no eval marker exists.
- **#804** (harness determinism, host PR for #798) head `9222df1e2da798ef0f6e724776e4672eb1a27418`, CONFLICTING/DIRTY: base `eab27e42`, `main` `97bf24bf`. Lab `41440740492` has been live since 11:56:47Z (about 41 minutes); that pass must combine N1-N9 with a rebase onto `main` so the next review binds a mergeable head.
- **#807** lab `41440286930` has been live since 11:53:13Z (about 45 minutes) on the main Tester arm restore/auto-commit class.
- **#745** parked CONFLICTING/DIRTY at `7a04fa4a`.
- **Open issues: 20** (`42 70 582 655 657 659 661 677 678 683 742 773 774 775 786 792 798 799 803 807`). **Open PRs: 4** (#808, #804, #788, #745).
- **Benign wake noise:** the lab completion, its forwarded `/oc review`, and the PR-push `/oc maintainer` produced the designed skip-only fan-out; the pending review run `41445867474` will skip at the job gate once `41445849959` finishes. Maintainer runs spawned by the same fan-out queue behind this one (single pending slot by design, #601).
- **Workspace provenance:** the workflow checked out the trusted default branch `97bf24bf`, but the CLI session bootstrap moved `HEAD` to the PR head `cf626b9c` for this comment-triggered session (clean tree). The staged Maintainer prompt remains the trusted default-branch copy and is authoritative; `.maintainer/` is gitignored and harness-materialized.

## The #808 chain

1. Review `41445849959` on `cf626b9c`. On approval the workflow forwards `/oc test`.
2. Tester approval on the settled head (read-only lane: the diff touches `AGENTS.md`/`LAB.md`).
3. Native rows as warranted, then the binding eval, then merge with a fresh head-bound approve-eval marker; the PR uses `Closes #799`.

## The #788 chain

1. Tester `41443356693` approves `012536c8` (or pushes a test-only commit and approves the successor).
2. `test-linux` plus `test-macos` bind the settled head; macOS is the delegated acceptance for #786. Do not dispatch them before the Tester settles.
3. Binding `eval` on the settled head.
4. On `approve-eval`, verify the owner-authored marker is head-bound to the current head, newer than the Tester marker and the latest eval trigger, with no newer fix or rejection, then merge `--rebase` (fallback `--merge`, branch kept), close #786 with the native evidence, and dispatch `build` #792.

## The #804 chain

1. Lab `41440740492` fixes N1-N9 and rebases onto `main` `97bf24bf`.
2. On the pushed head the lab workflow forwards `/oc review`; a clean review forwards `/oc test`.
3. Tester approval, then the binding eval, then merge with a fresh head-bound approve-eval marker; the PR uses `Closes #798`.

## The #807 chain

1. Lab `41440286930` fixes the main Tester-arm restore/auto-commit class; the fix PR should carry `Refs #807` or `Closes #807` as appropriate.
2. On the pushed head the lab workflow forwards `/oc review`; then the read-only Tester (the diff touches `.github/workflows`), then the binding eval, then merge.
3. Do not duplicate while the lane is live.

## The serialized infra queue

1. #788 chain (Tester live).
2. #808 review (live), then test/eval.
3. #804 lab (live), then review/test/eval.
4. #807 lab (live), then review/test/eval.
5. #803 (lifetime retry budgets) after these lanes settle.
6. #745 after the queue; #792 immediately after #788 merges; #773/#774/#775 parked.

## Loose ends board

1. **#788**: read Tester `41443356693`; then the chain above. Keep #786 open until the merge and native evidence.
2. **#808**: read review `41445849959`; on approval the workflow forwards `/oc test`. The F1 ledger lives in the committed decision note, not the PR body; do not spend a lane re-adding it.
3. **#804**: read lab `41440740492`; if the pushed head is still conflicted or lacks the rebase, dispatch lab with an explicit rebase-plus-findings instruction. Never `fix`/`continue` on this workflow-touching PR.
4. **#807**: read lab `41440286930`; ensure the fix PR opens with the right issue linkage and is handed to review.
5. **Queue**: #803 next after the live lab lanes; #745 parked until the queue; #792 right after #788 merges.
6. **Provider wall**: per-egress-IP free quota; recovery is a fresh runner; `retry-after` is diagnostic only. Do not advance the model ladder on the wall class and do not treat a wall death as a code failure.

## Standing rules I operate under

- Never post `/oc` comments; the hardcoded steps do all triggers, approvals, checks, and memory publishing. One trigger max per action per PR/issue.
- Lab triggers post `/oc lab {instruction}`; the decision entry reads `instruction` (or `mode`) and may carry `pr` or `issue` (target = `target` or `pr` or `issue`).
- `create_issue` bodies are passed via `gh issue create --body`; the handler self-dispatches triage for the new number; dedupe is by normalized title only (paraphrases are not matched).
- Memory: output `.maintainer/log-entry.md` must be the full current `logs/2026-11-02.md` with today's entry appended (keep-both); `.maintainer/state.md` is the new STATE; `personality.md` empty unless it evolves; no `emergency.json`.
- The R21/R22 gate requires an owner-authored, head-fresh tester verdict ordered before a fresh owner-authored eval marker newer than the tester verdict.
- Australian English in prose, no em dashes anywhere, no `Co-authored-by:` trailers, sign every comment.

## Next run

1. Read review `41445849959` on #808. On approval the workflow forwards `/oc test`; do not dispatch a duplicate.
2. Read Tester `41443356693` on #788. On approval without a head move, dispatch `test-linux` and `test-macos` on the settled head; after both pass, the binding eval; then merge and close #786.
3. Read the #804 lab outcome from `41440740492`; verify the rebase and N1-N9 coverage. Do not duplicate the lab workflow's own `/oc review` forward.
4. Read the #807 lab outcome; confirm the fix PR opens and is reviewed.
5. Then #803, then #745; keep #792 behind #788.
6. On any provider-wall death, note it and let the fresh-runner retry lane take it; do not advance the model ladder on the wall class.

## Open questions

1. Does the review approve `cf626b9c` so the read-only Tester can bind the settled head?
2. Does the #788 Tester approve `012536c8` without moving the head, so the delegated macOS row can bind it?
3. Do the two remaining lab lanes (#804, #807) land clean fixes before the provider wall or their caps?
4. Does #803 get its lab lane once the current infra lanes settle?

- Hephaestus, the Maintainer
