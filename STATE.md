# STATE

Last updated: 2026-10-27T20:00Z by run 40573569230 (scheduled tick: the #759 Council eval died on the #754 free-usage wall at 19:37:31Z after substantial evaluator work; the lane is held out the established 30-minute anti-flap cooldown, which expires 20:07:31Z, and the next tick must redraw exactly one `/oc eval` on the unchanged head).

## Who I am

I am Hephaestus, the Maintainer of this lab, successor to Mae (inception through 2026-08-27). I keep the pipeline moving: survey the live repo, load memory, decide, post only through the hardcoded steps. Owner messages are binding and always win.

## Right now (post-survey, 2026-10-27T20:00Z)

- **main** = `0f3ce87582a788514cb3e3a364c82667c1e6d824`: #771 rebase-merged at 18:59:03Z, #770 CLOSED COMPLETED at 18:59:06Z, branch `opencode/issue770-curate-docs-reviewer-claim` intact. Pages production deploy `40566089403` SUCCESS on `0f3ce875`; live docs serve the corrected wording.
- **#759** `opencode/issue582-20261024225156` (Phase 7 game-first Maze Chase site, `Refs #582`, `Closes #660`): head `6fb66832e57c715d29c4111f2b309c2368badaf8`, MERGEABLE/CLEAN, unchanged since the 18:51:17Z push. Reviewer approved `f19b712c`; the Tester approved the current head (owner-authored `/oc approve-test` marker 6450798340 at 18:51:28Z). The only delta `f19b712c..6fb66832` is the 83-line vendored-runner shim, byte-identical to main's copy (blob `833bb262`, SHA-256 `8119d8c8...`), so a rebase merge drops it. Merge-base with main `835280dd`.
- **#759 Council gate** (the binding pre-merge gate): eval run `40565513049` (trigger `/oc eval` 6451021203 at 19:02:35Z) FAILED at 19:37:31Z after 34m48s. The evaluator worked 19:03-19:16, then the provider returned `AI_APICallError` with `statusCode: 429` and `FreeUsageLimitError: Free usage limit reached...` (`retry-after: 17009`); the stream went silent, the #653 watchdog killed attempt 1 at 19:26:46Z, the bounded same-model retry hit the same wall and sat silent, and the second 600s kill at 19:37:26Z ended the run loudly with no decision file. This is the known #754 daily free-usage class (not a deliverable or workflow defect). No verdict, marker, or PR comment was produced. The failure's triage runs at 19:37:39Z were superseded; this tick owns the triage.
- **Cooldown**: the eval failure concluded 19:37:31Z, so the 30-minute anti-flap window expires **20:07:31Z**. The lane is held this run; the 20:16Z tick dispatches exactly one fresh `/oc eval` on the unchanged head.
- **#745** `opencode/lab-742-owner-pat-env-sanitization` head `7a04fa4a`, CONFLICTING/DIRTY, parked post-delivery.
- **Curator**: schedule `40552616354` SUCCESS (opened #770 + #771, both resolved); next cron 00:00Z. **Auditor**: last daily `40447808966` SUCCESS; next daily 00:00Z. **Recover**: `40570744058` SUCCESS at 19:37Z, detect only; nothing stranded.
- **Issues**: 13 open, zero untriaged. #754 the quota tracker (evidence updates only); #742 in flight via #745; #582 plus #683/#678/#677/#661/#660/#659/#655/#657 are the Maze Chase roadmap folded into the Phase Epic (#660 closes with the #759 merge, #582 stays open for the Final Phase); #70/#42 the boards.
- **Health** (verified live this run): allowlist exact 19/19 item-for-item (flow list parsed; only GitHub-managed workflows and the self-excluded `maintainer` outside it). Zero held (`action_required`) runs. The only failed run in the last 100 is the eval above; no failed/timed-out anything else. No stale `opencode/schedule-*`/`opencode/dispatch-*` remote branches. Pages production green on `0f3ce875`.
- **Owner directives active**: delivery-first (message 6358553065: delivery first, no unnecessary infra churn, lab changes only when genuinely necessary to unblock); Pages contrast fix (6349584523); terrain/river textures (6349595081); Browser/PWA smoothness guardrail (6350485765); no extra sweep (6358553065). Last Owner actions: the 18:51:30Z `/oc maintainer` and 19:02:35Z `/oc eval` on #759, then the 19:02:54Z `/oc maintainer`.
- **Known deviations**: the review gate hard-fails on a quota death (correct) but does not classify it (#754); #759's PR-wide review auto-retry cap is exhausted, so every further review needs a manual dispatch; #745 parked/conflicting; the CLI's PR-thread bootstrap re-checkout on issue_comment maintainer runs; the memory-publish keep-both delta duplicates `<!-- run: -->` markers (cosmetic); the test-lane vendored-runner restore commits a tracked `action.yml` modification through the wrapper auto-commit and the test lane does not strip the owner `Co-authored-by` trailer (post-delivery lab batch).

## Decisions this run

`.maintainer/decision.json` = one `ping` on #759 (the status below). `.maintainer/comment.md` empty (schedule run has no target). `.maintainer/personality.md` empty. No `emergency.json`.
- No `eval` #759 this run: the failure concluded 19:37:31Z and the 30-minute anti-flap cooldown (log precedent 2026-10-27 15:54Z) holds the lane to 20:07:31Z; a dispatch now is the flap the cooldown forbids. The next tick redraws one fresh eval on the unchanged head (a new runner also gets a new per-egress-bucket allowance; #754 evidence says the retry-after header is not authoritative).
- No merge: no Council marker; the Tester marker alone is not the merge gate.
- No `review`/`fix`/`test`/`test-linux`/`test-macos`/`test-windows`: #759's approved head is inside the Council gate, the shim is byte-identical to main, and per-OS acceptance belongs to the Final Phase (#683).
- No `lab`: delivery-first directive; #754 is the known provider-side quota class already queued for the post-delivery batch, and the #653 watchdog/retry behaved as designed.
- No `curator`/`auditor`: their schedules own them (both next 00:00Z).
- No `continue`/`architect`/`research`/`design`/`build`: the Final Phase chains immediately after the #759 merge, and only then.
- No `create_issue`/`create_pr`/`recover`/`ideate`: zero untriaged, nothing stranded, no ideation request.

## Callbacks

The hardcoded decision step posts the #759 status ping, which corrects the 19:07:27Z "Council eval is live" claim plainly. No `/oc` trigger this run. The PAT merge sweep sees #759 without a Council marker. Zero held runs to clear. The memory publish appends this 2026-10-27 entry keep-both per #647.

## Next run

1. At or after 20:07:31Z (the 20:16Z tick unless an earlier wake lands): dispatch exactly one `{"action": "eval", "pr": 759}` on head `6fb66832`. If the head moved, re-verify the Tester marker freshness first.
2. On `approve-eval`: verify the marker is owner-authored, head-bound to the current head, newer than the Tester marker and the latest eval trigger, and not superseded by a newer `/oc fix` or rejection; merge head-bound (`gh pr merge 759 --rebase --match-head-commit <head>`, merge fallback only for non-linear history, never `--delete-branch`); verify main's runner file still hashes `8119d8c8...`; close #660; flip Phase 7 in `progress/582-maze-chase-overhaul.md` on main; and immediately chain `{"action": "build", "issue": 582}` for the Final Phase. #582 stays open.
3. On a Council `fix` verdict: dispatch exactly one bounded `/oc fix` on #759 with the verdict's findings.
4. Post-delivery lab batch: the runner-restore tracked-file auto-commit leak plus the test-lane owner-trailer strip, then #754 (quota classifier and fast-fail), the review-gate retry cap (head-bound/time-window counting), the #745 project-config/PR-head-checkout observation, then #745. #769 is done.
5. Keep #683 open for the Final Phase released-artifact re-sign and the Windows terminal matrix; fold #677/#678 into the Final Phase roadmap and close #659/#655 there, not before.

## Open questions

1. Does a fresh eval on a new egress bucket clear the wall, or is the lane held to a later window?
2. Does the Council approve `6fb66832` on this draw, or return a `fix` verdict?
3. Does the auto-committed runner shim affect the Council's infra-scope judgment, even though it is byte-identical to main?
4. After the #759 merge, does the Final Phase build start immediately and carry #655/#661/#582 to the stable `1.0.0` sign-off, including the real per-OS install/upgrade/uninstall round trip and the Windows terminal matrix re-sign (#683)?
5. Does the test-lane restore leak recur on the next Tester run and move a head again before the post-delivery lab fix lands?

- Hephaestus, the Maintainer
