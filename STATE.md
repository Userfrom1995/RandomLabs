# STATE

Last updated: 2026-11-05T07:00Z by run 41980742985. Wake: `workflow_run` failure of `opencode-eval` 41978421059 (the #804 binding eval) on `main`. The eval died at 06:29:13Z on the #754 daily free-usage wall (`FreeUsageLimitError`, HTTP 429, retry-after 66530s) with no verdict and no marker; the quota detector fast-failed without consuming a retry. Recovery: one fresh evaluator pass dispatched on #804 after the 06:59:13Z cooldown by this run's hardcoded trigger, with a signed #804 ping. Meanwhile the #820 Lab Engineer run 41978422369 completed success at 06:54Z and opened PR #822.

## Who I am

Hephaestus, the Maintainer of the Random Lab. I orchestrate, I do not implement. I wake on schedule, on PR activity, on issue comments, on failures, and on dispatch, re-survey GitHub fresh, and post hardcoded PAT triggers that route work to the right agent. I never post `/oc` comments myself, never create issues/PRs or push code except through my decision file, and never edit `.github/workflows/**`, `.github/agents/**`, `opencode.json`, `AGENTS.md`, or `LAB.md` (those go to the Lab Engineer via `{"action":"lab"}`). `emergency.json` exists only for the direct-to-main revival path and is never used for convenience. I succeeded founding Maintainer Mae on 2026-08-27.

## Right now (surveyed 06:30-07:00Z)

- **main** = `86570af18a6bfef572da05d5bfe5af61d894eb86` (`git ls-remote` matches, unchanged since the #788 merge). Pages deploy 41978432604 green at 06:09:01Z; #821 preview 41980323105 green at 06:26:38Z.
- **Open PRs**: #822 (new), #821, #804, #745. **Open issues**: 21.
- **#822 (new, lab)**: "lab: recover the Maintainer from the provider daily free-usage wall (#820, #775)", head `b8b270100730530dd22d812ccfa5262d909a5c90`, opened 06:54:04Z by Lab Engineer run 41978422369 (which completed success at 06:54Z). Workflow-touching: `.github/agents/maintainer.md`, `.github/agents/tester.md`, `.github/scripts/schedule-selfheal.sh`, `.github/scripts/silent-stall-audit.sh`, `.github/workflows/{auditor,curator,maintainer,opencode}.yml`, `AGENTS.md`, `LAB.md`. Body `Closes #820`, `Closes #775`. Implements quota-wall marker + wall-aware intake stand-down + bounded fresh-run recovery (cap 2, fixed `quota-recovery` group, 30-60s jitter) + red cap escalation + token-free #775 notes + audit R34. Review run 41983515319 is live from the lab's `/oc review` forward at 06:54:06Z.
- **#821 (this morning's build)**: head `f3364c7c5a9e94df61ffc113fadacfa256959eb9`, CLEAN/MERGEABLE, 6 `builder:` commits, 21 files, all under `maze-chase/` and `progress/` (not workflow-touching), body `Closes #792`. Review run 41980291044 completed at 06:57:50Z without a published verdict, so the review workflow's crash-parity posted `/oc review (auto-retry 1)` at 06:57:44Z; the retry review lane is live. No Maintainer dispatch needed.
- **#804** (host PR for #798): head `0872b94cfba3fcce16fbd99168a8956023354b4e`, CLEAN/MERGEABLE, 18 commits, workflow-touching. Tester chain intact: review 41781473170 approved, Tester 41782903974 approved, owner marker 6624239389 at 06:27:09Z on 11-04, handoff 6624239738. The binding eval 41978421059 died on the wall at 06:29:13Z; **a fresh `/oc eval` was dispatched at ~07:00Z by this run** after the 30-minute cooldown. No newer fix or rejection.
- **#745**: parked CONFLICTING/DIRTY at `7a04fa4a96e1982ac307ca40973fed29379def0b`, behind #803.
- **Failures**: only the eval wall death 41978421059 today. The last Maintainer wall death remains 41939685577 at 00:13:13Z; the 12-death outage documented in #820 ended there. No structural failure in the window.
- **Duplicate wake**: run 41980339320 (the second `/oc maintainer` trigger on #821 at 06:25:39Z) completed success at 06:34:20Z with `Decision []`, a #821 note, and an explicit deferral of the #804 fresh-run recovery to this failure-triage run.
- **Trigger allowlist**: exact 19/19 (20 repo workflow names minus the deliberately self-excluded `maintainer`). No workflow needs a lab fix.
- **Held runs**: zero `action_required`. The four documented inert queued runs remain (36101155868, 36101155851, 36101155844, 37344324101).
- **Curator / Auditor**: last runs green (curator 05:40Z, auditor 05:36Z); next curator tick due around 11:40Z.
- **Model watch**: pin `opencode/deepseek-v4.1-flash-free` on all knobs; ladder 3/3 live and free; the only provider class in the window is the #754 daily free-usage wall, which is per egress IP.

## The live lanes (do not duplicate)

1. **#804 fresh eval (~07:00Z)**: on `approve-eval`, verify the owner-authored, head-bound (`0872b94c`) eval marker is newer than the tester verdict and the latest eval trigger and is not superseded; the hardcoded PAT sweep then merges the workflow-touching PR (`--rebase`, fallback `--merge`, branch kept) and #798 closes. On `fix`, route `lab` (infrastructure guard) with the findings and re-bind the chain.
2. **#822 review (41983515319)**: on approval, the workflow forwards `/oc test`; then the Tester, then the binding eval, then the PAT sweep merge and the #820/#775 closures. On findings, the workflow forwards `/oc fix`, but #822 is infrastructure, so any fix loop must be stopped and rerouted to `lab`.
3. **#821 review retry (`/oc review (auto-retry 1)`, posted 06:57:44Z)**: on approval the workflow forwards `/oc test`; on findings `/oc fix` (product PR, valid). After the tester settles, dispatch the native rows (`test-windows` first, plus `test-linux`/`test-macos`), then the binding eval, then merge and close #792.
4. **#820 / #775**: owned by PR #822; the issue closures happen on merge.
5. **#745**: parked behind #803.

## Lane interaction (important)

- #804 and #822 both edit `.github/scripts/silent-stall-audit.sh`. Whichever merges first forces a rebase on the other, which invalidates its head-bound review/tester/eval markers and requires a re-gate. #804 is fully gated except its eval, so merging #804 first is the cheaper order; #822 is early in its chain (review just started), so a rebase there costs only a review re-run. If #822 merges first, #804 must be rebased by the Lab Engineer (workflow-touching, no fix/continue) and the whole chain re-run.

## The serialized infra queue

1. #804 is the live infra lane until its fresh eval verdict; #822 is the exceptional parallel lane (the resilience fix for the wall). #822 is workflow-touching and cannot take fix/continue.
2. After #804 and #822: reconcile #812 and #815 against the new main and dispatch one scoped audit pass (drop anything that landed; #815 overlaps #804's R17 work).
3. Then the two deferred docs follow-ups (#817/#819 residuals: the handoff-arrow and failure-routing prose), the deferred self-heal quota-park issue, and the #775 unpark (unless #822 closes it).
4. Then #814 baseline fail-open, sequenced with #803 (same fix-lane verify region/counters).
5. Then #803 after the #804/#788 evidence, then #745, then #742 closes with #745.
6. #821 is a product PR, not infra, and runs on the normal lane.

## Loose ends board

1. **#817 merged** `251c81a5`; #816 closed. Non-blocking follow-ups: explicit `Curator -> Reviewer` and `Auditor / Maintainer -> Reviewer` handoff arrows, the `tests fail` and Evaluator-rejected return routes, the duplicate tor-cli Website anchor masked by `.first`, and the module docstring wording. Defer a scoped Curator docs pass until #804/#822 merge.
2. **#819 merged** `eccd93d7`; #818 closed. Evaluator advisory: pre-existing prose at `AGENTS.md:125,131` and `LAB.md:870-871,884` still implies `/oc fix` for failure routing without the `/oc lab` override. Defer a scoped Lab Engineer pass until #804/#822 merge.
3. **#788 merged** `86570af1`; #786 closed completed with both native rows and the 9.8/10 Evaluator verdict. Pages verified green.
4. **#804**: tester-approved `0872b94c`; fresh eval dispatched at ~07:00Z after the wall death; then the marker, the PAT sweep, and the #798 closure.
5. **#822**: lab PR live for #820/#775; review 41983515319 live; then the normal infra gate. Expect a rebase if #804 lands first.
6. **#821**: build PR live; review auto-retry 1 live; tester, native rows, eval follow.
7. **#745**: parked CONFLICTING at `7a04fa4a`, behind #803.
8. **#812**: held behind #804; includes the R32 forward-target gap and the dead `outcome=skipped` note.
9. **#814**: held behind #803; coordinate the same verify region.
10. **#815**: held behind #804 (direct R17 overlap); the Auditor reproduced `31 passed, 2 failed` with an ambient `LAB_RUN_NONCE`.
11. **Pages**: `86570af1` green; #821 preview current on `f3364c7c`; #822 preview will follow its push.
12. **Cron watch**: Maintainer schedules remain best-effort (6 to 8 hours in practice). Event wakes deliver; #822's bounded recovery is the durable mitigation.
13. **Wall watch**: the #754 wall re-hit the #804 eval at 06:29:13Z (retry-after 66530s on that egress IP). Fresh-run recovery only; `retry-after` stays diagnostic; one fresh pass per lane after the 30-minute cooldown; if it dies again, stand down and wait on #822.
14. **Queued-run anomaly**: four permanently queued runs with no jobs; inert, recorded for the Auditor.
15. **Model watch**: 1M-context free models noted by the Auditor; benchmark pass after the audit queue clears.
16. **#775**: folded into #822; closes on merge if the token-free notes land.
17. **#773 / #774**: valid docs/setup gaps from the audit; deferred behind the live lanes.

## Standing rules I operate under

- Never post `/oc` comments; the hardcoded steps do all triggers, approvals, checks, and memory publishing. One trigger max per action per PR/issue.
- Lab triggers post `/oc lab {instruction}`; the decision entry reads `instruction` (or `mode`) and may carry `pr` or `issue`.
- The `fix` action posts only `/oc fix` with no instruction; give the Fixer context with a `ping` posted before it in the same decision list.
- Infra/protected-path PRs (#804, #822) never take `fix`/`continue`; route `lab`. #821 is product code, so `fix` is valid if the review finds issues.
- Memory: output `.maintainer/log-entry.md` must be the full current day's log file with today's entry (keep-both); `.maintainer/state.md` is the new STATE; `personality.md` empty unless it evolves; no `emergency.json`.
- The R21/R22/R30 gate requires an owner-authored, head-fresh tester verdict ordered before a fresh owner-authored eval marker newer than the tester verdict and the latest eval trigger.
- Workflow-touching PRs merge only through the hardcoded PAT sweep; non-workflow PRs are merged in-session with `gh pr merge --rebase --match-head-commit <head>` (fallback `--merge`, never `--delete-branch`).
- Failure-triage cooldown: no second dispatch for the same workflow+branch signature within 30 minutes after the death; the eval lanes share `opencode-eval`/`main`.
- The #754 wall is a fresh-run recovery class, not a retry-exhaustion signal: no lab dispatch, no ladder advance, no re-dispatch inside the cooldown. A binding eval that died on the wall gets one fresh run per lane after the shared cooldown; a second death stands down pending #822. The bounded fresh-attempt cap and wall-aware intake land with #822.
- Never put an inline trigger token in a public comment or health-board note (#775): the General lane picks it up.
- Australian English in prose, no em dashes anywhere, no `Co-authored-by:` trailers, sign every comment.

## Next run

1. Read the fresh #804 eval verdict on `0872b94c`. On `approve-eval`, verify the owner-authored head-bound marker chain (marker newer than tester verdict 6624239389 and the new eval trigger, not superseded by a newer owner rejection) and let the PAT sweep merge with the branch kept; confirm the #798 closure and Pages. On `fix`, route `lab` with the findings. If the fresh eval died on the wall again, stand down, log the second fresh-attempt death, and wait on #822 rather than dispatch a third immediate attempt.
2. Read the #822 review verdict on `b8b27010`. On approval the workflow forwards `/oc test`; do not duplicate. On findings, ensure the route is `lab`, never `fix`/`continue` (workflow-touching). Expect a rebase if #804 merged first.
3. Read the #821 review auto-retry verdict on `f3364c7c`. On approval the workflow forwards `/oc test`; then after the Tester settles dispatch `test-windows` first plus `test-linux`/`test-macos`, then sequence the binding eval on the settled head. On findings the workflow forwards `/oc fix`.
4. After any merge, verify Pages and re-check the four queued runs.
5. After #804/#822: reconcile #812/#815, the deferred docs follow-ups, the #775 unpark (unless #822 closed it), the self-heal quota-park issue, #814 with #803, #803, #745 (and #742 closes).
6. Record the Owner capacity decision when given (fund the provider plan, raise the allowance, or lower the Maintainer cadence).
7. Do not duplicate live lanes; verify heads and artifacts against the live repo before claiming a change landed.

## Open questions

1. Does the fresh #804 eval survive the wall on a new runner, unlocking the PAT sweep and the #798 closure?
2. Does #804 or #822 merge first, and does the shared audit conflict force a rebase and full re-gate on the other?
3. Does #822's review approve cleanly, and does its R34 hardening hold under the Reviewer's adversarial pass?
4. Does the #821 review auto-retry publish a verdict, and does the Windows native row reproduce the new pass contract end to end?
5. Will the Owner take the capacity decision (fund OpenCode Go, raise the allowance, or approve a lower Maintainer cadence)?
6. Does `pages.yml` stay green through the next merge cycle?
