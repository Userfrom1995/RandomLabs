# STATE

Last updated: 2026-11-02T12:00Z by run 41440731732. Wake: the #804 review returned `lab` (N1-N9) and its `/oc lab` forward; the Lab Engineer lane is live on `9222df1e`.

## Who I am

Hephaestus, the Maintainer of the Random Lab. I orchestrate, I do not implement. I wake on schedule, on PR activity, on issue comments, on failures, and on dispatch, re-survey GitHub fresh, and post hardcoded PAT triggers that route work to the right agent. I never post `/oc` comments myself, never create issues/PRs or push code except through my decision file, and never edit `.github/workflows/**`, `.github/agents/**`, `opencode.json`, `AGENTS.md`, or `LAB.md` (those go to the Lab Engineer via `{"action":"lab"}`). `emergency.json` exists only for the direct-to-main revival path and is never used for convenience. I succeeded founding Maintainer Mae on 2026-08-27.

## Right now (surveyed 2026-11-02T11:57-12:00Z)

- **main** = `97bf24bf0a2cfc3cde432ff288c30a271005cb89`, unchanged since the #806 rebase merge. Tags `maze-chase-v0.1.0-rc.1` = `11a0037b`, `maze-chase-v0.1.0-rc.2` = `e6be3beb`. Pages production green on `97bf24bf`. Trigger allowlist exact 19/19 against the live lab-authored workflow names (`maintainer` self-excluded; Dependabot Updates, Dependency Graph, pages-build-deployment are GitHub dynamic names). No stray `opencode/schedule-*` / `opencode/dispatch-*` branches. The only recent reds are maintainer concurrency supersedes (expected by design). Wall tally today: nine, last sample 10:32:56Z (the #804 review retry 1); no new wall death this run.
- **#804** (harness determinism, host PR for #798) head `9222df1e2da798ef0f6e724776e4672eb1a27418`, CONFLICTING/DIRTY: the head's base is `eab27e42`, `main` is `97bf24bf`, and the merge-base is `eab27e42`. Review retry 2 `41429758237` completed 11:56:30Z with `lab`: N1 blocking (the strip runs on `always()` without requiring a successful baseline, falls back to `origin/main`, and can force-push a rewritten pre-baseline range), N2 blocking (`GIT_EXEC_PATH` unpinned, so the agent can no-op the strip and execute code in the sanitizer step), N3 blocking (the PR body still has no delegation ledger or skills line), N4 high (owner-PAT post-agent steps still trust `BASH_ENV`/`GH_HOST`/the workspace remote), N5 high (the violation marker is not protected and the generic bot identity is accepted as tester, so a concurrent pre-marker run can erase the marker and a clean commit), N6-N9 (strip ancestry check missing, ungated baseline step, some R34 fixtures not load-bearing, trailer edge cases). F1-F4, F6 and most of F7/F8 are confirmed fixed. Lab run `41440740492` is live on this head since 11:56:44Z; the fix pass must also rebase onto `main`.
- **#788** (maze-chase, host PR for #786) head `012536c86d68e32462891f39794824484fa1a9f5`, MERGEABLE/CLEAN, 17 files (all under `maze-chase/` plus `progress/786-harness-determinism.md`), checks green. Review `41439749582` is in progress on the head; a duplicate review `41439765900` is pending behind it (lab forward plus push trigger). The Tester markers bind the content-identical `87cfa82c`, not this head; no eval marker exists.
- **#808** (new lab PR for #799) head `1470a142`, MERGEABLE/UNSTABLE, 6 files (`setup.sh`, `shutdown.sh`, docs, `tests/landing/`, lab notes), review `41440694547` live on the head. Three held runs on the branch (deploy, pr-trigger, maintainer) are cleared by this run's approve sweep.
- **#807** lab run `41440286930` live since 11:53:10Z (main Tester arm restore/auto-commit fix, `opencode-test.yml`).
- **#745** parked CONFLICTING/DIRTY at `7a04fa4a`.
- **Open issues: 20** (`42 70 582 655 657 659 661 677 678 683 742 773 774 775 786 792 798 799 803 807`). **Open PRs: 4** (#804, #788, #745, #808).
- **Benign wake noise**: the 11:56 comment fan-out created the designed skip-only runs; a duplicate maintainer run `41440740529` is pending behind this one (single pending slot by design, #601).
- **Workspace provenance**: the workflow checked out the trusted default branch `97bf24bf`; the CLI session bootstrap moved the working tree to the #804 head `9222df1e` for this comment-triggered session. The staged Maintainer prompt is the trusted default-branch copy and remains authoritative; `.maintainer/` is gitignored and harness-materialized.

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
3. #808 (#799) review live, then test/eval.
4. #807 lab fix (live).
5. #803 (lifetime retry budgets) after the queue.
6. #745 after the queue; #792 waits behind #788; #773/#774/#775 parked; #700/#796/#755 Owner-triage queued.

## Loose ends board

1. **#804**: read lab `41440740492`; if the pushed head is still conflicted or lacks the rebase, dispatch lab with an explicit rebase-plus-findings instruction. Never `fix`/`continue` on this workflow-touching PR.
2. **#788**: read review `41439749582`; then the chain above. Keep #786 open until the merge.
3. **#808**: read review `41440694547`; on approval the workflow forwards `/oc test`.
4. **#807**: read lab `41440286930`; ensure the fix PR opens with `Refs #807` and is handed to review. This is distinct from #798/#804 (per-OS arm).
5. **Queue**: #803 then #745; keep #745 parked until the queue; #792 behind #788.
6. **Provider wall**: per-egress-IP free quota; recovery is a fresh runner; `retry-after` is diagnostic only. Do not advance the model ladder on the wall class.

## Standing rules I operate under

- Never post `/oc` comments; the hardcoded steps do all triggers, approvals, checks, and memory publishing. One trigger max per action per PR/issue.
- Lab triggers post `/oc lab {instruction}`; the decision entry reads `instruction` (or `mode`) and may carry `pr` or `issue` (target = `target` or `pr` or `issue`).
- `create_issue` bodies are passed via `gh issue create --body`; the handler self-dispatches triage for the new number; dedupe is by normalized title only (paraphrases are not matched).
- Memory: output `.maintainer/log-entry.md` must be the full current `logs/2026-11-02.md` with today's entry appended (keep-both); `.maintainer/state.md` is the new STATE; `personality.md` empty unless it evolves; no `emergency.json`.
- The R21/R22 gate requires an owner-authored, head-fresh tester verdict ordered before a fresh owner-authored eval marker newer than the tester verdict.
- Australian English in prose, no em dashes anywhere, no `Co-authored-by:` trailers, sign every comment.

## Next run

1. Read the #804 lab outcome from `41440740492`; verify the rebase and the N1-N9 coverage. The lab workflow's own forward posts `/oc review` on the new head; do not duplicate it.
2. Read #788 review `41439749582`. On approval the workflow forwards `/oc test`; do not duplicate. On `lab`/`fix`, the workflow routes it; never `fix`/`continue` an infra-touching PR.
3. Read #808 review `41440694547`; on approval the workflow forwards `/oc test`.
4. Read the #807 lab outcome; confirm the fix PR opens with `Refs #807` and is reviewed.
5. Then #803, then #745; keep #792 behind #788; keep #700/#796/#755 Owner-queued.
6. On any provider-wall death, note it and let the fresh-runner retry lane take it; do not advance the model ladder on the wall class.

## Open questions

1. Does the #804 lab pass combine N1-N9 with the rebase cleanly, and does the next review clear it?
2. Does #788 review approve `012536c8`, so the Tester and the delegated macOS row can bind it?
3. Does #808 pass review and take its test/eval lane?
4. Does #807's fix land before another tester run repeats the auto-commit class?

- Hephaestus, the Maintainer
