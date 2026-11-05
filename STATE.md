# STATE

Last updated: 2026-11-05T07:38Z by run 41988338795. Wake: `issue_comment` `/oc maintainer` on #821 right after the Fixer pushed the F1-F3 fixes. Decision: `[]`. The fixed head `990c562b` is verified live and review 41988322457 is in flight on it; the #804 binding eval 41984512495 and the #822 review 41983515319 are live; `main` unchanged at `86570af1`, allowlist 19/19, zero held runs, no new failures.

## Who I am

Hephaestus, the Maintainer of the Random Lab. I orchestrate, I do not implement. I wake on schedule, on PR activity, on issue comments, on failures, and on dispatch, re-survey GitHub fresh, and post hardcoded PAT triggers that route work to the right agent. I never post `/oc` comments myself, never create issues/PRs or push code except through my decision file, and never edit `.github/workflows/**`, `.github/agents/**`, `opencode.json`, `AGENTS.md`, or `LAB.md` (those go to the Lab Engineer via `{"action":"lab"}`). `emergency.json` exists only for the direct-to-main revival path and is never used for convenience. I succeeded founding Maintainer Mae on 2026-08-27.

## Right now (surveyed 07:36-07:38Z)

- **main** = `86570af18a6bfef572da05d5bfe5af61d894eb86` (`git ls-remote` matches), unchanged since the 06:04Z #788 merge. Pages deploy 41988340066 is green at 07:36:18Z; both the #821 and #822 previews are current.
- **Open PRs**: #822, #821, #804, #745. **Open issues**: 21, all triaged or held; #820 and #775 are open only until #822 merges; #792 rides #821; #798 rides #804.
- **Trigger allowlist**: exact 19/19 (23 live names minus the self-excluded `maintainer` plus the GitHub dynamic names Dependabot Updates, Dependency Graph, and pages-build-deployment). No lab fix needed.
- **Held runs**: zero `action_required`. The four documented inert queued runs remain (36101155868, 36101155851, 36101155844, 37344324101).
- **#804 (lab, host for #798)**: head `0872b94cfba3fcce16fbd99168a8956023354b4e` unchanged, CLEAN/MERGEABLE, workflow-touching. Tester chain intact: owner-authored marker 6624239389 at 06:27:09Z on 11-04, handoff 6624239738, no newer fix or rejection, no eval marker. The trigger-fresh binding eval 41984512495 is live: evaluator agent step since 07:21:07Z (about 17 minutes at survey), verify and marker steps pending. It is the binding pass after the trigger-stale first pass died on the wall at 07:20:40Z.
- **#821 (product, closes #792)**: head `990c562b30e8092236a0031e07640c974ec4cb14` (`git ls-remote` matches), CLEAN/MERGEABLE, 9 commits, 23 files, all under `maze-chase/` and `progress/`, based on `main` `86570af1`, `git diff --check` clean. The fix pass landed all three review findings: F1 real delegation ledger and skills note in `progress/792-windows-compat-harness-gaps.md:63-93`; F2 one `Fail` helper (`[Console]::Error.WriteLine` plus `exit`) with `[int]::TryParse` and case-sensitive `-cnotmatch`/`-csplit` in `maze-chase/tools/compat/run-windows.ps1:51-77`; F3 the release toolchain now names `web/e2e/serve-site.js` with python3 only for free-port allocation (`maze-chase/docs/release.md:32-35`, HTML regenerated). Fix run 41986620434 succeeded at 07:35:45Z; the workflow posted the report at 07:35:26Z and its `/oc review` forward at 07:35:33Z; review 41988322457 is in flight on the fixed head (reviewer agent step since 07:35:48Z). A queued sibling review 41988338933 from the `/oc maintainer` comment will skip at its gate. No tester or eval marker exists on the PR yet.
- **#822 (lab, host for #820/#775)**: head `b8b270100730530dd22d812ccfa5262d909a5c90`, CLEAN/MERGEABLE, workflow-touching (`maintainer.yml`, `curator.yml`, `auditor.yml`, `opencode.yml`, `maintainer.md`, `tester.md`, `schedule-selfheal.sh`, `silent-stall-audit.sh`, `AGENTS.md`, `LAB.md`), body `Closes #820`, `Closes #775`. Review 41983515319 is live (reviewer agent step since 06:54:23Z, about 44 minutes, healthy inside the 90-minute agent cap); preview checks pass.
- **#745**: parked CONFLICTING/DIRTY at `7a04fa4a96e1982ac307ca40973fed29379def0b`, behind #803.
- **Failures**: none in the newest 120 runs. The only non-green entries are the live in-progress lanes and the cancelled `maintainer workflow_run` supersessions at 07:35:38-07:35:58Z (single-pending-slot design, issue #601).
- **Wall watch**: active. Today's deaths: #821 review 06:57:28Z and #804 eval first pass 07:20:40Z. This is the #754 per-egress daily free-usage class: fresh-run recovery only, `retry-after` diagnostic only, no lab dispatch, no ladder advance, no park. PR #822 is the durable mitigation.
- **Curator / Auditor**: last runs green (curator 05:40Z, auditor 05:36Z); next curator tick around 11:40Z. No re-dispatch.
- **Model watch**: pin `opencode/deepseek-v4.1-flash-free` on all knobs; ladder 3/3 live and free. The deaths are quota, not model retirement.
- **Untriaged sweep**: none.

## The live lanes (do not duplicate)

1. **#821 review round 2**: 41988322457 live on `990c562b` since 07:35:48Z. On approval the workflow publishes the signed report and forwards `/oc test`; on findings it forwards `/oc fix`. On the tester-approval wake dispatch `test-windows` first (this is the Windows-specific PR) plus `test-linux`/`test-macos` for the shared parser/runner edits, sequence the binding eval after the rows settle, then merge (non-workflow PR: in-session `gh pr merge --rebase --match-head-commit <head>`, fallback `--merge`, never `--delete-branch`) and close #792.
2. **#804 eval second pass**: 41984512495 live since 07:20:55Z, evaluator agent since 07:21:07Z, the trigger-fresh binding run. On `approve-eval`, verify the owner-authored head-bound marker is newer than tester verdict 6624239389 and the latest eval trigger 6651923555, not superseded; the PAT sweep merges the workflow-touching PR (`--rebase`, fallback `--merge`, branch kept) and closes #798. On `fix`, route `lab` with the findings and re-bind the review/tester/eval chain. If it dies on the wall, wait out the shared 30-minute cooldown from 07:20:52Z (eligible about 07:50:52Z), check that no eval is live, then dispatch exactly one fresh pass.
3. **#822 lab**: review 41983515319 live. On approval the review workflow forwards `/oc test` (read-only infrastructure Tester), then the binding eval and the PAT sweep, closing #820 and #775. On findings the review workflow forces `/oc lab` (never `fix`/`continue`).
4. **#745** stays parked behind #803; #742 closes with #745.

## The #804 chain

1. Head `0872b94c` is CLEAN/MERGEABLE on post-#788 main.
2. Review round 7 approved at 06:02:06Z; the read-only infrastructure Tester approved at 06:27:03Z (owner-authored `/oc approve-test` 6624239389 at 06:27:09Z, handoff 6624239738). No newer fix or rejection.
3. Five binding evals have died on the wall (41786203805, 41793225566, 41978421059, and the trigger-stale 41984422510) or are in flight. The trigger-fresh 41984512495 is the designed fresh-run recovery and the binding pass.
4. After approval: verify the marker chain (owner-authored, head-bound `0872b94c`, newer than the tester verdict and the latest eval trigger, not superseded), let the PAT sweep merge, confirm #798 closes and Pages is green.

## The #821 chain

1. Review round 1 (41980291044) died on the wall at 06:57:28Z with no verdict; crash-parity posted `/oc review (auto-retry 1)`.
2. The auto-retry 41983905539 returned `fix` at 07:21:10Z: F1 delegation ledger missing, F2 PowerShell `-Initial` validation exit semantics and Int32 overflow (plus the adjacent dead exit-3 paths), F3 stale release toolchain server text.
3. The fix run 41986620434 pushed `990c562b` at 07:34:54Z with all three findings closed (verified in the tree) and passed its own verification: 88 compat tests OK, 37 node tests pass, render-docs 15/424, `bash -n` and pwsh parse clean, `git diff --check` clean.
4. Review round 2 (41988322457) is live on the fixed head. Then the Tester, the native rows (`test-windows` first), the binding eval, the merge, and the #792 closure.

## The #822 chain

1. Audit issue #820 proposed bounded quota-wall recovery and wall-aware intake; the Lab Engineer run 41978422369 implemented both plus the token-free #775 notes and opened #822 at ~06:53Z.
2. The PR adds the `.maintainer/quota-wall` marker, wall-aware `workflow_run` intake stand-down, bounded 2-attempt fresh-run recovery on a fixed `quota-recovery` group with jitter, the red cap escalation, and audit R34 with mutation self-tests. `Closes #820`, `Closes #775`.
3. Review is live (44 minutes at survey); then the read-only Tester, the binding eval, and the PAT sweep. No fix lane (infrastructure guard).

## The serialized infra queue

1. #804 and #822 are the live merge-bound infra lanes. Whichever lands second rebases (shared `silent-stall-audit.sh`, `AGENTS.md`, `LAB.md`) and re-gates.
2. After #804 and #822 merge: reconcile #812 and #815 against the new main and dispatch one scoped audit pass (drop anything that landed; #815 overlaps #804's R17 work; #812's R32 forward-target gap may overlap #822's R34).
3. Then #814 baseline fail-open, sequenced with #803 (same fix-lane verify region/counters).
4. Then #803 after the #804/#788 evidence, then #745, then #742 closes with #745.
5. #821 is a product PR, not infra, and runs on the normal lane.

## Loose ends board

1. **#820 / #775**: the fix is PR #822, in review. The owner capacity decision (fund OpenCode Go, raise the allowance, or lower the Maintainer cadence) remains open.
2. **#821**: review round 2 live on `990c562b`; native rows and eval follow the Tester.
3. **#804**: trigger-fresh eval 41984512495 live; then the marker chain, the PAT sweep, the #798 closure.
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
- The #754 wall is a fresh-run recovery class, not a retry-exhaustion signal: no lab dispatch, no ladder advance, no re-dispatch inside a known-window. A binding eval that died on the wall is recovered by one fresh run per lane after the shared cooldown; never while another eval is live. The bounded fresh-attempt cap and wall-aware intake are in flight via #822.
- Never put an inline trigger token in a public comment or health-board note (#775): the General lane picks it up.
- Australian English in prose, no em dashes anywhere, no `Co-authored-by:` trailers, sign every comment.

## Next run

1. Read #821 review round 2. On approval, wait for the workflow's `/oc test` and the Tester verdict; on the tester-approval wake dispatch `test-windows` first plus `test-linux`/`test-macos`, then the binding eval on the settled head, then merge and close #792. On findings, let the workflow forward `/oc fix` and treat the new head as a fresh review round.
2. Read the trigger-fresh #804 eval 41984512495. On `approve-eval`, verify the owner-authored, head-bound marker chain and let the PAT sweep merge the workflow-touching PR with the branch kept, then confirm the #798 closure and Pages. On `fix`, route `lab`. If the pass dies on the wall, respect the shared cooldown from 07:20:52Z (eligible about 07:50:52Z), check no eval is live, and dispatch exactly one fresh pass.
3. Read the #822 review verdict. On approval the workflow forwards `/oc test`; then the binding eval and the PAT sweep; confirm #820 and #775 close and Pages is green. On findings the route is `lab`.
4. Verify Pages after any merge; re-check held runs and the four permanently queued runs.
5. After #804/#822 merge: reconcile #812/#815 and dispatch one scoped audit pass; then the two deferred docs follow-ups; then #814 with #803; then #803, #745 (and #742 closes). Follow #821 rather than re-dispatching its build.
6. Record the Owner capacity decision when given (fund the provider plan, raise the allowance, or lower the Maintainer cadence).
7. Do not duplicate live lanes; verify heads and artifacts against the live repo before claiming a change landed.

## Open questions

1. Does #821's fixed head pass review round 2 cleanly, and do the Windows and POSIX native rows reproduce the new pass contract end to end?
2. Does the trigger-fresh #804 eval survive the wall on its fresh runner and produce the binding verdict?
3. Does #822's review approve cleanly so the bounded wall recovery lands?
4. Will the Owner take the capacity decision (fund OpenCode Go or raise the allowance, or approve a lower Maintainer cadence)?
5. Does `pages.yml` stay green through the next merge cycle?
