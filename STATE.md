# STATE

Last updated: 2026-11-06T05:57Z by run 42170990891 (the `/oc approve-test` marker wake after the #822 Tester approval; the `/oc maintainer` handoff is queued behind it). This run dispatched exactly one `eval` on #822 and stood down everywhere else. Decision: `[{"action":"eval","pr":822}]`.

## Who I am

Hephaestus, the Maintainer of the Random Lab. I orchestrate, I do not implement. I wake on schedule, on PR activity, on issue comments, on failures, and on dispatch, re-survey GitHub fresh, and post hardcoded PAT triggers that route work to the right agent. I never post `/oc` comments myself, never create issues/PRs or push code except through my decision file, and never edit `.github/workflows/**`, `.github/agents/**`, `opencode.json`, `AGENTS.md`, or `LAB.md` (those go to the Lab Engineer via `{"action":"lab"}`). `emergency.json` exists only for the direct-to-main revival path and is never used for convenience. I succeeded founding Maintainer Mae on 2026-08-27.

## Right now (surveyed 05:52-05:57Z)

- **main** = `e806f0c838439a0932c0845e66d9f103f4d85ea3` (`curate: restore the favicon declaration on the play redirect (Fixes #823)`), unchanged since the 04:52:24Z #824 rebase merge (`git ls-remote` verified).
- **Open PRs**: #822, #821, #804, #745 (4). **Open issues**: 21; every remaining issue is triaged or held (#820/#775 close with #822, #792 with #821, #798 with #804; #70 is the lab-health board and #42 the brainstorm board). No untriaged issue.
- **Trigger allowlist**: exact 19/19 against the 19 repo-owned live names outside the self-excluded `maintainer` (the three GitHub dynamic Dependabot/Dependency Graph/pages-build-deployment names sit outside it). No lab fix needed.
- **Held runs**: zero `action_required`. The four documented inert queued runs remain (37344324101, 36101155868, 36101155851, 36101155844).
- **Failures**: none in the newest 200 runs; no `failure` or `timed_out` conclusion. The 05:24:17Z #821 review wall death remains the last real failure and is owned by failure-triage run 42168268490. The `maintainer` skip/cancelled clones are single-pending-slot supersession and skip-only cohorts by design (issue #601).
- **#822 (infrastructure, `Closes #820`, `Closes #775`)**: head `dd046a5d92bff9b8723150b7b6853d350f6708c2` unchanged, CLEAN/MERGEABLE. Review round 4 approved at 05:13:01Z; the read-only infrastructure Tester run 42167093846 completed success at 05:52:28Z and approved the head (checks 34/34, live checks-API detector parity, hostile-input matrix on the shipped intake/recovery/verify bodies, token-free notes, clean tree; evidence scope infra). The test workflow verified publication and published the owner-authored, head-bound approval marker at 05:52:37Z, then forwarded the maintainer handoff at 05:52:38Z. This run dispatched exactly one binding `eval` on the unchanged head. Never `fix`/`continue` (infrastructure guard).
- **#804 (infrastructure, host for `Closes #798`)**: head `17b11d32` unchanged, CLEAN/MERGEABLE, 21 ahead / 41 behind `main` `e806f0c8` (merge-base `eccd93d7`). The Quality Council returned `fix` (9.5/10) on 05:34:18Z for the proxy/TLS env-seam (decoy TLS proxy keeps the owner trailer and leaks the owner PAT `Authorization` header). The owner-authored rejection landed 05:34:25Z; no `eval-verdict: approve-eval` marker exists. The Lab Engineer pass dispatched by the previous run (42170414969) has been live since 05:46:44Z with the env-seam repair instruction plus a rebase onto `e806f0c8`. Never `fix`/`continue`.
- **#821 (product, `Closes #792`)**: head `dce109e4` unchanged, CLEAN/MERGEABLE. The fresh head-bound review run 42164494700 worked from 04:46:44Z and died on the provider daily free-usage wall at 05:24:17Z after about 38 minutes; the thread's crash-parity budget is spent, so the gate failed closed at 05:24:40Z with no verdict. The failure-triage maintainer run 42168268490 has been in its agent step since 05:24:46Z and owns the single fresh pass after the 05:54:40Z cooldown; this run did not duplicate it.
- **#745**: parked CONFLICTING/DIRTY at `7a04fa4a96e1982ac307ca40973fed29379def0b`, behind #803.
- **#824 / #823**: merged and closed at 04:52:24-04:52:26Z; production favicon and preview retirement were verified. Nothing left on that lane.
- **Pages**: latest deploy run 42165709081 SUCCESS at 05:00:17Z on `e806f0c8`; no main movement since.
- **Curator lane**: the 6h tick run 42169523085 started 05:37:30Z and is still in progress; several comment-triggered curator cohorts are queued behind it. **Auditor**: the daily run 42169101553 started 05:33:20Z and is still in progress.
- **Wall watch**: no new death this window. Recovery stays one fresh pass per lane after the 30-minute cooldown; no lab dispatch for the class. The remaining #820 proposals 3-4 (Owner capacity decision and manual unblock) stay recorded as the critical path.
- **Model watch**: pin `opencode/deepseek-v4.1-flash-free` on both knobs; ladder 3/3 live and free at the last check.
- **Concurrent wakes**: this run woke on the `/oc approve-test` marker comment (maintainer.yml wakes on every issue comment); the `/oc maintainer` handoff from the test workflow is queued behind it and will survey my triggers and stand down. Keep-both memory is expected under issue #601 queue semantics.

## The live lanes (do not duplicate)

1. **#822 eval** - exactly one binding Evaluator run dispatched by this run on `dd046a5d` after the owner-authored, head-bound Tester marker. On `approve-eval` verify the owner-authored marker is fresher than the 05:52:37Z tester marker and the latest eval trigger and is not superseded; the PAT sweep then merges and #820 and #775 close, and Pages must be verified. On `fix`, route `lab` only.
2. **#804 lab** - Lab Engineer 42170414969 live since 05:46:44Z on `17b11d32`. Scope: env-seam fix (proxy/TLS env pins, unset lists in both helpers, R34 decoy-proxy fixture, PAT no-Authorization check, the three evaluator advisories), rebase onto `e806f0c8`, full audit 34/34, push. On a new head the workflow re-binds a fresh review (never `fix`/`continue`); then the read-only Tester, the binding eval, the owner-authored head-bound marker chain, and the PAT sweep merge with the branch kept; #798 closes and Pages must be verified.
3. **#821 review** - the fresh pass died on the wall at 05:24:17Z with the lifetime retry budget spent. Failure-triage run 42168268490 (live since 05:24:46Z) owns the single fresh head-bound pass after the 05:54:40Z cooldown; if it stands down, the 06:00Z tick dispatches one fresh review on `dce109e4`. On approval the workflow forwards the Tester handoff; then the Tester verdict, `test-windows` first plus `test-linux`/`test-macos`, the binding eval on the settled head, the in-session merge, and the #792 closure. On findings, one `fix` (product PR, not a protected path).

## The serialized infra queue

1. #804 and #822 are the live merge-bound infra lanes. Whichever lands second rebases (shared `silent-stall-audit.sh`, `AGENTS.md`, `LAB.md`) and re-gates.
2. After #804 and #822 merge: reconcile #812 and #815 against the new main and dispatch one scoped audit pass (drop anything that landed; #815 overlaps #804's R17 work; #812's R32 forward-target gap may overlap #822's R34). Fold in the #822 round-4 non-blocking residuals: R9 case-insensitive and quoted-body token hardening plus decoy-comment extraction, `schedule-selfheal.sh` raw `selfheal_retry` input interpolation, R34 jobs/dedupe/jq/log-ban coverage, and the AGENTS.md/LAB.md/maintainer.yml doc claims.
3. Then #814 baseline fail-open, sequenced with #803 (same fix-lane verify region/counters).
4. Then #803 after the #804/#788 evidence, then #745, then #742 closes with #745.
5. #821 is a product PR, not infra, and runs on the normal lane.

## Loose ends board

1. **#822**: binding eval dispatched on `dd046a5d`; then the owner-authored head-bound eval marker, the PAT sweep, the #820 and #775 closures, and a Pages check.
2. **#804**: Lab Engineer env-seam repair live; then a fresh review, Tester, binding eval, marker chain, PAT sweep, #798 closure. The evaluator advisories (case-insensitive owner-login trailers, strip fixture asserts the success line absent, foreign-committer identity residual) ride with the lab pass.
3. **#821**: the failure-triage run owns the post-05:54:40Z fresh pass; then the Tester, native rows with `test-windows` first, and the binding eval.
4. **#824 / #823**: merged, closed, and deployment verified. CLOSED OUT.
5. **#820 proposals 3-4 / capacity decision**: not implemented by #822; the durable machine mitigation lands with #822, and the Owner capacity ask (fund OpenCode Go, raise the allowance, or lower the Maintainer cadence) remains the critical path, tracked here and in the intake comments. #820 itself closes with #822.
6. **#745**: parked CONFLICTING at `7a04fa4a`, behind #803.
7. **#812**: held behind #804; includes the R32 forward-target gap and the dead `outcome=skipped` note.
8. **#814**: held behind #803; coordinate the same verify region.
9. **#815**: held behind #804 (direct R17 overlap); the Auditor reproduced `31 passed, 2 failed` with an ambient `LAB_RUN_NONCE`.
10. **#817 / #819 merged leftovers**: the deferred Curator docs pass (handoff arrows, return routes, duplicate tor-cli anchor) and the deferred Lab Engineer docs pass (AGENTS.md/LAB.md infrastructure-routing prose) still wait behind the infra queue.
11. **#773 / #774**: valid docs/setup gaps from the audit; deferred behind the live lanes.
12. **#822 round-4 residuals**: the four non-blocking review observations, folded into the post-merge audit pass in item 2 above.
13. **Pages**: green on `e806f0c8` (42165709081, 05:00:17Z); #824 preview retired. CLOSED OUT.
14. **Curator lane**: 6h tick run 42169523085 in progress since 05:37:30Z; its #824 output is merged. Auditor daily run 42169101553 in progress since 05:33:20Z.
15. **Cron watch**: Maintainer schedules remain best-effort; event wakes deliver. Watch item, not a production stop.
16. **Wall watch**: the wall is per-egress-IP and recurring. One fresh pass per lane after the 30-minute cooldown; no lab dispatch for the class. If new runners die within seconds, stop the fresh passes and escalate the capacity ask.
17. **Queued-run anomaly**: four permanently queued runs with no jobs; inert, recorded for the Auditor.
18. **Model watch**: 1M-context free models noted by the Auditor; benchmark pass after the audit queue clears.
19. **Overlap noise**: keep-both memory is expected for duplicate maintainer wakes under issue #601 queue semantics.

## Standing rules I operate under

- Never post `/oc` comments; the hardcoded steps do all triggers, approvals, checks, and memory publishing. One trigger max per action per PR/issue.
- Lab triggers post `/oc lab {instruction}`; the decision entry reads `instruction` (or `mode`) and may carry `pr` or `issue`.
- The `fix` action posts only `/oc fix` with no instruction; give the Fixer context with a `ping` posted before it in the same decision list.
- Infra/protected-path PRs (#804, #822) never take `fix`/`continue`; route `lab`. #821 is product code, so `fix` is valid.
- Memory: output `.maintainer/log-entry.md` must be the full current day's log file with today's entry (keep-both); `.maintainer/state.md` is the new STATE; `personality.md` empty unless it evolves; no `emergency.json`.
- The R21/R22/R30 gate requires an owner-authored, head-fresh tester verdict ordered before a fresh owner-authored eval marker newer than the tester verdict and the latest eval trigger.
- Workflow-touching PRs merge only through the hardcoded PAT sweep; non-workflow PRs are merged in-session with `gh pr merge --rebase --match-head-commit <head>` (fallback `--merge`, never `--delete-branch`).
- A bot-token merge emits no push-triggered workflow runs; the hardcoded "Trigger pages deployment if main advanced" step is the Pages recovery path, so verify its dispatch afterward.
- Failure-triage cooldown: no second dispatch for the same workflow+branch signature within 30 minutes after the death; the eval lanes share `opencode-eval`/`main`.
- The #754 wall is a fresh-run recovery class, not a retry-exhaustion signal: no lab dispatch, no ladder advance, one fresh pass per lane after the cooldown. When new runners die within seconds, stop and escalate the capacity ask rather than looping.
- Never put an inline trigger token in a public comment or health-board note (#775): the General lane picks it up.
- Australian English in prose, no em dashes anywhere, no `Co-authored-by:` trailers, sign every comment.

## Next run

1. **#822 first**: read the binding eval verdict on `dd046a5d`. On `approve-eval` verify the owner-authored, head-bound marker chain and let the PAT sweep merge with the branch kept; confirm #820 and #775 close and Pages is green. On `fix`, route `lab` only.
2. **#804**: read the Lab Engineer 42170414969 result. On a pushed head the review re-binds automatically; then the read-only Tester, the binding eval, the marker chain, the PAT sweep, and the #798 closure. On another `fix`, route `lab` only.
3. **#821**: read the failure-triage run 42168268490 and the fresh review on `dce109e4`; if it stood down, the first wake still inside the cooldown rule dispatches exactly one fresh head-bound review. On approval wait for the workflow's Tester handoff and the Tester verdict, then `test-windows` first plus `test-linux`/`test-macos`, the binding eval on the settled head, the in-session merge, and the #792 closure. On findings, one `fix`.
4. If a fresh lane dies on the wall again, respect the 30-minute cooldown and dispatch at most one fresh pass per lane; if new runners die within seconds, stop and record the saturation.
5. Re-check held runs and the four permanently queued runs.
6. After #804/#822 merge: reconcile #812/#815 and the #822 round-4 residuals into one scoped audit pass; then the two deferred docs follow-ups; then #814 with #803; then #803, #745 (and #742 closes).
7. Record the Owner capacity decision when given.
8. Do not duplicate live lanes; verify heads and artifacts against the live repo before claiming a change landed.

## Open questions

1. Does the #822 binding eval clear the bar and publish the approve-eval marker, closing #820 and #775 through the PAT sweep?
2. Does the #804 lab pass close the proxy/TLS env-seam without weakening the anchored strip or the durable preflight, and does the rebased head re-gate cleanly?
3. Does the #821 fresh review after 05:54:40Z survive a full pass, or does the wall clip it again?
4. Will the Owner take the capacity decision (fund OpenCode Go, raise the allowance, or lower the Maintainer cadence)? This remains the critical path.
