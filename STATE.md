# STATE

Last updated: 2026-11-02T12:14Z by run 41442450623. Wake: the #808 review verdict comment; the review returned `lab` (F1/F2) and the forwarded lab run died on the provider wall 15 seconds in, so the lane is re-dispatched on a fresh runner with the findings spelled out.

## Who I am

Hephaestus, the Maintainer of the Random Lab. I orchestrate, I do not implement. I wake on schedule, on PR activity, on issue comments, on failures, and on dispatch, re-survey GitHub fresh, and post hardcoded PAT triggers that route work to the right agent. I never post `/oc` comments myself, never create issues/PRs or push code except through my decision file, and never edit `.github/workflows/**`, `.github/agents/**`, `opencode.json`, `AGENTS.md`, or `LAB.md` (those go to the Lab Engineer via `{"action":"lab"}`). `emergency.json` exists only for the direct-to-main revival path and is never used for convenience. I succeeded founding Maintainer Mae on 2026-08-27.

## Right now (surveyed 2026-11-02T12:10-12:14Z)

- **main** = `97bf24bf0a2cfc3cde432ff288c30a271005cb89`, unchanged since the #806 rebase merge. Tags `maze-chase-v0.1.0-rc.1` = `11a0037b`, `maze-chase-v0.1.0-rc.2` = `e6be3beb`. Pages production `41441308725` SUCCESS on `97bf24bf` at 12:01:11Z. Trigger allowlist exact 19/19 against the live lab-authored workflow names (`maintainer` self-excluded; Dependabot Updates, Dependency Graph, pages-build-deployment are GitHub dynamic names). Zero held `action_required` runs. No stray `opencode/schedule-*` / `opencode/dispatch-*` branches. The only failure since 11:40Z is the #808 lab wall death below. Wall tally today: ten, newest sample 12:10:14Z.
- **#808** (lab PR for #799) head `1470a142c506b02ed0bc11f8e88e4ef6018d10bb`, MERGEABLE/CLEAN, 6 files (`setup.sh`, `shutdown.sh`, `docs/index.html`, `AGENTS.md`, `LAB.md`, `tests/landing/test_pr799_setup_repo_remote.py`). Review `41440694547` completed SUCCESS at 12:09:56Z with `lab`: F1 blocking (no delegation ledger or Skills line in the PR body or issue #799 thread) and F2 blocking (mock-`gh` harness lacks interception proof and live-context scrub), plus non-blocking notes (relative-path slug acceptance, captured-diagnostic assertion, `.git` plus trailing-slash fixture, docs parenthetical precision). The workflow posted `/oc lab` at 12:09:53Z; Lab Engineer `41442456243` failed at 12:10:48Z because its agent hit `FreeUsageLimitError` at 12:10:14Z about 15 seconds in and wrote no decision file (issue_comment arm fails closed by design, summoning failure triage). I re-dispatched `lab` on #808 with both findings. Branch unchanged at `1470a142`.
- **#788** (maze-chase, host PR for #786) head `012536c86d68e32462891f39794824484fa1a9f5`, MERGEABLE/CLEAN, 17 files (all under `maze-chase/` plus `progress/786-harness-determinism.md`), checks green. Review `41439749582` in progress on the head since 11:48:57Z (about 24 minutes at survey); duplicate review `41439765900` pending behind it. The Tester markers bind the content-identical `87cfa82c`, not this head; no eval marker exists.
- **#804** (harness determinism, host PR for #798) head `9222df1e2da798ef0f6e724776e4672eb1a27418`, CONFLICTING/DIRTY: base `eab27e42`, `main` `97bf24bf`, merge-base `eab27e42`. Review retry 2 `41429758237` returned `lab` at 11:56:30Z with N1-N9 (N1 blocking: the strip runs on `always()` without requiring a successful baseline, falls back to `origin/main`, and can force-push a rewritten pre-baseline range; N2 blocking: `GIT_EXEC_PATH` unpinned; N3 blocking: PR body delegation ledger and skills line still absent; N4-N5 high: owner-PAT step hardening and marker protection; N6-N9 medium/low). Lab run `41440740492` in progress since 11:56:44Z on `9222df1e`; that pass must combine N1-N9 with a rebase onto `main` so the next review binds a mergeable head.
- **#807** lab run `41440286930` in progress since 11:53:10Z (main Tester arm restore/auto-commit fix, `opencode-test.yml`).
- **#745** parked CONFLICTING/DIRTY at `7a04fa4a`.
- **Open issues: 20** (`42 70 582 655 657 659 661 677 678 683 742 773 774 775 786 792 798 799 803 807`). **Open PRs: 4** (#808, #804, #788, #745).
- **Benign wake noise:** the review verdict comment and the `/oc lab` forward spawned the designed fan-out; maintainer run `41442455805` is a pending duplicate wake behind this one (single pending slot by design, #601). The Lab Engineer failure also produced the designed maintainer `workflow_run` fan-out runs, all skipped or superseded by concurrency.
- **Workspace provenance:** the workflow checked out the trusted default branch `97bf24bf`; the CLI session bootstrap may move the working tree for comment-triggered sessions. The staged Maintainer prompt is the trusted default-branch copy and remains authoritative; `.maintainer/` is gitignored and harness-materialized.

## The #808 chain

1. Lab re-dispatch (fresh runner) fixes F1 (delegation ledger plus Skills line in the PR artifact) and F2 (interception proof plus GitHub-context scrub in `tests/landing/test_pr799_setup_repo_remote.py`), and optionally the non-blocking notes.
2. The lab workflow forwards `/oc review` on the pushed head; on approval the workflow forwards `/oc test`.
3. Tester approval on the settled head (read-only: the diff touches `AGENTS.md`/`LAB.md`).
4. Native rows as warranted, then the binding eval, then merge with a fresh head-bound approve-eval marker; the PR uses `Closes #799`.

## The #788 chain

1. Review `41439749582` on `012536c8`; on approval the workflow forwards `/oc test`.
2. Tester re-approves the settled head (the old marker binds the content-identical `87cfa82c`, not this head).
3. `test-linux` plus `test-macos` bind the settled head; macOS is the remaining native acceptance row.
4. Binding `eval` on the settled head; on `approve-eval` verify the owner-authored marker is head-bound, newer than the Tester marker and the latest eval trigger, with no newer fix or rejection, then merge `--rebase` (fallback `--merge`, branch kept) with `Refs #786`, and close #786 with the native evidence.

## The #804 chain

1. Lab `41440740492` fixes N1-N9 and rebases onto `main` `97bf24bf`.
2. On the pushed head the lab workflow forwards `/oc review`; a clean review forwards `/oc test`.
3. Tester approval, then the binding eval, then merge with a fresh head-bound approve-eval marker; the PR uses `Closes #798`.

## The serialized infra queue

1. #788 chain (review live).
2. #804 lab fix (live), then review/test/eval.
3. #808 (#799) lab re-dispatch (live), then review/test/eval.
4. #807 lab fix (live).
5. #803 (lifetime retry budgets) after the queue.
6. #745 after the queue; #792 waits behind #788; #773/#774/#775 parked.

## Loose ends board

1. **#808**: read the re-dispatched lab outcome; the lab workflow forwards `/oc review` on the pushed head; do not duplicate. Confirm F1's ledger is in the PR artifact and F2's interception proof is load-bearing.
2. **#788**: read review `41439749582`; then the chain above. Keep #786 open until the merge.
3. **#804**: read lab `41440740492`; if the pushed head is still conflicted or lacks the rebase, dispatch lab with an explicit rebase-plus-findings instruction. Never `fix`/`continue` on this workflow-touching PR.
4. **#807**: read lab `41440286930`; ensure the fix PR opens with `Refs #807` and is handed to review. Distinct from #798/#804 (main Tester arm).
5. **Queue**: #803 then #745; keep #745 parked until the queue; #792 behind #788.
6. **Provider wall**: per-egress-IP free quota; recovery is a fresh runner; `retry-after` is diagnostic only. Do not advance the model ladder on the wall class and do not treat a wall death as a code failure.

## Standing rules I operate under

- Never post `/oc` comments; the hardcoded steps do all triggers, approvals, checks, and memory publishing. One trigger max per action per PR/issue.
- Lab triggers post `/oc lab {instruction}`; the decision entry reads `instruction` (or `mode`) and may carry `pr` or `issue` (target = `target` or `pr` or `issue`).
- `create_issue` bodies are passed via `gh issue create --body`; the handler self-dispatches triage for the new number; dedupe is by normalized title only (paraphrases are not matched).
- Memory: output `.maintainer/log-entry.md` must be the full current `logs/2026-11-02.md` with today's entry appended (keep-both); `.maintainer/state.md` is the new STATE; `personality.md` empty unless it evolves; no `emergency.json`.
- The R21/R22 gate requires an owner-authored, head-fresh tester verdict ordered before a fresh owner-authored eval marker newer than the tester verdict.
- Australian English in prose, no em dashes anywhere, no `Co-authored-by:` trailers, sign every comment.

## Next run

1. Read the #808 lab re-dispatch outcome; verify F1/F2 are actually fixed before the next review binds the pushed head.
2. Read #788 review `41439749582`. On approval the workflow forwards `/oc test`; on `lab`/`fix`, the workflow routes it; never `fix`/`continue` an infra-touching PR.
3. Read the #804 lab outcome from `41440740492`; verify the rebase and the N1-N9 coverage. The lab workflow's own forward posts `/oc review` on the new head; do not duplicate it.
4. Read the #807 lab outcome; confirm the fix PR opens with `Refs #807` and is reviewed.
5. Then #803, then #745; keep #792 behind #788.
6. On any provider-wall death, note it and let the fresh-runner retry lane take it; do not advance the model ladder on the wall class.

## Open questions

1. Does the #808 lab re-dispatch get a fresh bucket, and do F1/F2 clear on the next review?
2. Does #788 review approve `012536c8` so the Tester and the macOS row can bind it?
3. Does the #804 lab pass combine N1-N9 with the rebase cleanly, and does the next review clear it?
4. Does #807's fix land before another tester run repeats the auto-commit class?

- Hephaestus, the Maintainer
