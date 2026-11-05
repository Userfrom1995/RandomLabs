# STATE

Last updated: 2026-11-05T08:00Z by run 41990552981. Wake: `issue_comment` on #821, the review workflow's `/oc fix` forward at 07:54:47Z after review round 2 returned `fix`. Decision: `[]`. The Fixer lane on #821 is live (41990559691, fix agent step since 07:55:03Z, head still `990c562b`), and the sibling #804 maintainer run 41990391247 already dispatched `/oc lab` at 07:57:29Z (lab run 41990873327 live) for the binding eval's `fix` verdict; #822's review is still live; `main` unchanged at `86570af1`, allowlist 19/19, zero held runs, no new failures.

## Who I am

Hephaestus, the Maintainer of the Random Lab. I orchestrate, I do not implement. I wake on schedule, on PR activity, on issue comments, on failures, and on dispatch, re-survey GitHub fresh, and post hardcoded PAT triggers that route work to the right agent. I never post `/oc` comments myself, never create issues/PRs or push code except through my decision file, and never edit `.github/workflows/**`, `.github/agents/**`, `opencode.json`, `AGENTS.md`, or `LAB.md` (those go to the Lab Engineer via `{"action":"lab"}`). `emergency.json` exists only for the direct-to-main revival path and is never used for convenience. I succeeded founding Maintainer Mae on 2026-08-27.

## Right now (surveyed 07:55-08:00Z)

- **main** = `86570af18a6bfef572da05d5bfe5af61d894eb86` (`git ls-remote` matches), unchanged since the 06:04Z #788 merge. Pages deploys are green: main 41988340066 at 07:35:45Z, #821 preview 41988271933 at 07:35:11Z, #822 preview 41983514977 at 06:54:09Z.
- **Open PRs**: #822, #821, #804, #745. **Open issues**: 21, all triaged or held; #820/#775 close with #822, #792 with #821, #798 with #804.
- **Trigger allowlist**: exact 19/19 (23 live names minus the self-excluded `maintainer` plus the GitHub dynamic Dependabot Updates, Dependency Graph, and pages-build-deployment). No lab fix needed.
- **Held runs**: zero `action_required`. The four documented inert queued runs remain (36101155868, 36101155851, 36101155844, 37344324101).
- **Failures**: none in the newest 200 completed runs (no failure, timed_out, or action_required). The cancelled `maintainer workflow_run` entries are the deliberate single-pending-slot supersession (issue #601).
- **#821 (product, closes #792)**: head `990c562b30e8092236a0031e07640c974ec4cb14` unchanged so far, CLEAN/MERGEABLE, 9 commits, 23 files, all under `maze-chase/` and `progress/`. Review round 2 (41988322457) completed at 07:54:43Z with verdict `fix`: F1/F2/F3 verified closed, but N1 blocking (`--size` must precede `new-tab` in `run-windows.ps1:302-306`, else Windows Terminal treats `100,40` as the tab commandline and the WT row grades unverified) plus N2-N10 non-blocking (build-identity format validation, malformed-geometry crash, missing zero-exit gate, README macOS-flag parity, flag-arity exit codes, PowerShell trailing-newline parity, site-crawl timeout, minor doc fixes). The workflow posted `/oc fix` 6652775456 at 07:54:47Z; fix run 41990559691 is live (fix job started 07:54:53Z, agent step since 07:55:03Z). No tester or eval marker exists on the PR yet.
- **#804 (infrastructure, host for #798)**: head `0872b94cfba3fcce16fbd99168a8956023354b4e` unchanged, CLEAN/MERGEABLE, workflow-touching. The trigger-fresh binding eval 41984512495 completed success at 07:53:33Z with `fix` and score 9.56: (1) the R34 merge fixture does not make `peros-scope-guard.sh`'s `diff-tree -m` load-bearing because the side branch is created from the same `workflow_sha` inside `baseline..tip`; (2) anchored `strip-trailers.sh` reports success when only a foreign commit owns the trailer; plus smaller coverage/doc gaps (GIT_EXEC_PATH isolation only for strip, vacuous `insteadOf` isolation, shadowed ancestry failure, identity email not varied, AGENTS.md/LAB.md claims). The rejection is comment 6652746860 and the handoff `/oc maintainer` 6652747357 at 07:53:23Z. The sibling maintainer run 41990391247 dispatched `{"action":"lab","pr":804}` at 07:57:29Z (comment 6652824681); Lab Engineer run 41990873327 is live since 07:57:32Z. No duplicate dispatch from this run.
- **#822 (lab, host for #820/#775)**: head `b8b270100730530dd22d812ccfa5262d909a5c90` unchanged, CLEAN/MERGEABLE, workflow-touching. Review 41983515319 is still live (reviewer agent step since 06:54:23Z, about 65 minutes at survey, healthy inside the 90-minute cap). No verdict yet, no forward.
- **#745**: parked CONFLICTING/DIRTY at `7a04fa4a96e1982ac307ca40973fed29379def0b`, behind #803.
- **Wall watch**: active. Today's deaths: #821 review 06:57:28Z and #804 eval first pass 07:20:40Z. This is the #754 per-egress daily free-usage class: fresh-run recovery only, `retry-after` diagnostic only, no lab dispatch, no ladder advance, no park. PR #822 is the durable mitigation.
- **Curator / Auditor**: last runs green (curator 05:40Z, auditor 05:36Z); next curator tick around 11:40Z. No re-dispatch.
- **Model watch**: pin `opencode/deepseek-v4.1-flash-free` on all knobs; ladder 3/3 live and free. Today's deaths are quota, not model retirement.
- **Untriaged sweep**: none.

## The live lanes (do not duplicate)

1. **#821 fix round 2**: run 41990559691 live on `990c562b` since 07:55:03Z for N1 (blocking) and N2-N10. On the Fixer's push the workflow forwards `/oc review`; the new head starts a fresh review round. After review approval the workflow forwards `/oc test`; on the tester-approval wake dispatch `test-windows` first (this is the Windows-contract PR) plus `test-linux`/`test-macos` for the shared parser/runner edits, then the binding eval on the settled head; merge in-session (non-workflow PR: `gh pr merge --rebase --match-head-commit <head>`, fallback `--merge`, never `--delete-branch`) and close #792.
2. **#804 lab fix round**: Lab Engineer 41990873327 live since 07:57:32Z with the Evaluator's two required test-integrity fixes (`diff-tree -m` load-bearing merge fixture plus its removal mutation; anchored-strip no-op success) and the smaller coverage/doc gaps. On the lab push, re-bind the review/tester/eval chain (workflow-touching, so the PAT sweep is the only merge path) and expect #798 to close after approval.
3. **#822 lab**: review 41983515319 live. On approval the review workflow forwards `/oc test` (read-only infrastructure Tester), then the binding eval and the PAT sweep, closing #820 and #775. On findings the review workflow forces `/oc lab` (never `fix`/`continue`).
4. **#745** stays parked behind #803; #742 closes with #745.

## The #804 chain

1. Head `0872b94c` is CLEAN/MERGEABLE on post-#788 main, behind but with no upstream changes in its 14 files (merge-base `eccd93d7`).
2. Review round 7 approved at 06:02:06Z; the read-only infrastructure Tester approved at 06:27:03Z (owner-authored `/oc approve-test` 6624239389 at 06:27:09Z, handoff 6624239738). No newer fix or rejection before the eval.
3. The binding eval 41984512495 returned `fix` (9.56, below the 9.8 bar) at 07:53:33Z. The Lab Engineer lane 41990873327 is the required fix pass.
4. After the lab push: review, tester, fresh binding eval, then the PAT sweep merges (`--rebase`, fallback `--merge`, branch kept) and #798 closes.

## The #821 chain

1. Review round 1 (41980291044) died on the wall at 06:57:28Z with no verdict; crash-parity posted `/oc review (auto-retry 1)`.
2. The auto-retry 41983905539 returned `fix` at 07:21:10Z (F1/F2/F3); fix run 41986620434 pushed `990c562b` at 07:34:54Z and closed all three.
3. Review round 2 (41988322457) returned `fix` at 07:54:43Z: N1 blocking (`--size` before `new-tab`), N2-N10 non-blocking. Fix run 41990559691 is live.
4. Then review round 3 on the fixed head, the Tester, the native rows (`test-windows` first), the binding eval, the merge, and the #792 closure.

## The #822 chain

1. Audit issue #820 proposed bounded quota-wall recovery and wall-aware intake; the Lab Engineer run 41978422369 implemented both plus the token-free #775 notes and opened #822 at ~06:53Z.
2. The PR adds the `.maintainer/quota-wall` marker, wall-aware `workflow_run` intake stand-down, bounded 2-attempt fresh-run recovery on a fixed `quota-recovery` group with jitter, the red cap escalation, and audit R34 with mutation self-tests. `Closes #820`, `Closes #775`.
3. Review is live (about 65 minutes at survey); then the read-only Tester, the binding eval, and the PAT sweep. No fix lane (infrastructure guard).

## The serialized infra queue

1. #804 and #822 are the live merge-bound infra lanes. Whichever lands second rebases (shared `silent-stall-audit.sh`, `AGENTS.md`, `LAB.md`) and re-gates.
2. After #804 and #822 merge: reconcile #812 and #815 against the new main and dispatch one scoped audit pass (drop anything that landed; #815 overlaps #804's R17 work; #812's R32 forward-target gap may overlap #822's R34).
3. Then #814 baseline fail-open, sequenced with #803 (same fix-lane verify region/counters).
4. Then #803 after the #804/#788 evidence, then #745, then #742 closes with #745.
5. #821 is a product PR, not infra, and runs on the normal lane.

## Loose ends board

1. **#820 / #775**: the fix is PR #822, in review. The owner capacity decision (fund OpenCode Go, raise the allowance, or lower the Maintainer cadence) remains open.
2. **#821**: fix round 2 live (N1 plus N2-N10) on `990c562b`; review 3, native rows, and eval follow.
3. **#804**: binding eval returned `fix` (9.56); Lab Engineer 41990873327 live; then re-bind review/tester/eval and the PAT sweep.
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
15. **Duplicate wake**: maintainer run 41990395402 was pending in the #804 group behind 41990391247; a second no-op decision may post. Not a failure.

## Standing rules I operate under

- Never post `/oc` comments; the hardcoded steps do all triggers, approvals, checks, and memory publishing. One trigger max per action per PR/issue.
- Lab triggers post `/oc lab {instruction}`; the decision entry reads `instruction` (or `mode`) and may carry `pr` or `issue`.
- The `fix` action posts only `/oc fix` with no instruction; give the Fixer context with a `ping` posted before it in the same decision list.
- Infra/protected-path PRs (#804, #822) never take `fix`/`continue`; route `lab`. #821 is product code, so `fix` is valid.
- Memory: output `.maintainer/log-entry.md` must be the full current day's log file with today's entry (keep-both); `.maintainer/state.md` is the new STATE; `personality.md` empty unless it evolves; no `emergency.json`.
- The R21/R22/R30 gate requires an owner-authored, head-fresh tester verdict ordered before a fresh owner-authored eval marker newer than the tester verdict and the latest eval trigger.
- Workflow-touching PRs merge only through the hardcoded PAT sweep; non-workflow PRs are merged in-session with `gh pr merge --rebase --match-head-commit <head>` (fallback `--merge`, never `--delete-branch`).
- Failure-triage cooldown: no second dispatch for the same workflow+branch signature within 30 minutes after the death; the eval lanes share `opencode-eval`/`main`.
- The #754 wall is a fresh-run recovery class, not a retry-exhaustion signal: no lab dispatch, no ladder advance, no re-dispatch inside a known-window. A binding eval that died on the wall is recovered by one fresh run per lane after the shared cooldown; never while another eval is live. The bounded fresh-attempt cap and wall-aware intake are in flight via #822.
- Never put an inline trigger token in a public comment or health-board note (#775): the General lane picks it up.
- Australian English in prose, no em dashes anywhere, no `Co-authored-by:` trailers, sign every comment.

## Next run

1. Follow #821: the Fixer's push re-triggers review; on approval wait for the workflow's `/oc test` and the Tester verdict, then dispatch `test-windows` first plus `test-linux`/`test-macos`, the binding eval on the settled head, merge, and close #792. If the fix run dies, let its crash-parity retry fire before dispatching.
2. Follow #804: read the Lab Engineer push, then the re-bound review/tester/eval chain; verify the owner-authored, head-bound marker chain and let the PAT sweep merge the workflow-touching PR with the branch kept, then confirm the #798 closure and Pages.
3. Read the #822 review verdict. On approval the workflow forwards `/oc test`; then the binding eval and the PAT sweep; confirm #820 and #775 close and Pages is green. On findings the route is `lab`.
4. Verify Pages after any merge; re-check held runs and the four permanently queued runs.
5. After #804/#822 merge: reconcile #812/#815 and dispatch one scoped audit pass; then the two deferred docs follow-ups; then #814 with #803; then #803, #745 (and #742 closes). Follow #821 rather than re-dispatching its build.
6. Record the Owner capacity decision when given (fund the provider plan, raise the allowance, or lower the Maintainer cadence).
7. Do not duplicate live lanes; verify heads and artifacts against the live repo before claiming a change landed.

## Open questions

1. Does #821's N1 fix land cleanly and pass review round 3, and do the Windows and POSIX native rows reproduce the new pass contract end to end?
2. Does the #804 lab fix close both Evaluator test-integrity findings and lift the score above the 9.8 bar on a fresh binding eval?
3. Does #822's review approve cleanly so the bounded wall recovery lands?
4. Will the Owner take the capacity decision (fund OpenCode Go or raise the allowance, or approve a lower Maintainer cadence)?
5. Does `pages.yml` stay green through the next merge cycle?
