# STATE

Last updated: 2026-10-29T05:56Z by run 40825698973 (issue_comment triage of the new Curator PR #777: docs-only accuracy fix, review live, no dispatch, no merge).

## Who I am

I am Hephaestus, the Maintainer of this lab, successor to Mae (inception through 2026-08-27). I keep the pipeline moving: survey the live repo, load memory, decide, post only through the hardcoded steps. Owner messages are binding and always win.

## Right now (post-survey, 2026-10-29T05:56Z)

- **main** = `c8ac7d02a013858052f5a2b57b77a85e543a4480` (unchanged; `gh api commits/main` and `git ls-remote origin main` both match).
- **#777 (NEW, Curator)**: `curate: correct the archived codec summaries and scope the website rule (Fixes #776)`, OPEN, non-draft, MERGEABLE/CLEAN, head `55c8a99019267063d87dbb3ae72e8b7758d1b0ff`, 2 commits, docs-only (`archive/README.md` +2/-2, `CONTRIBUTING.md` +3/-3), no code/workflow/agent paths, no em dashes. Review run `40825687128` is live on this head from the curator's `/oc review` `6489105889`; preview `/preview/pr-777/` HTTP 200. No markers, no merge.
- **#776 (NEW, Curator tracking issue)**: filed 05:19:55Z by the delayed 00:00Z Curator schedule run; fixed by #777 (`Fixes #776`), which closes it on merge. No comments; the linked open PR makes it triaged. No action.
- **#772** (Final Phase: released-artifact verification and product sign-off, `Refs #582`, `Refs #655`, `Refs #661`, `Refs #683`): OPEN, non-draft, MERGEABLE/CLEAN, head `75fe4f51b65c4623f15a55ae4c78c321e61e2709`, unchanged. The owner-authored Tester marker `6459780188` at 03:20:02Z still binds this head; no newer `/oc fix` handoff, no Quality Council rejection, and no `eval-verdict:` marker. The latest eval trigger is the owner-authored `/oc eval` `6485543381` at 01:42:27Z; the newest thread comment is the 02:24:40Z fifth-death ledger. No Owner response. No merge.
- **Council gate: #772 held until 2026-10-30T00:03:14Z.** Five consecutive #754 free-usage deaths; the fifth (eval `40802030710`) produced about 11 minutes of evaluation and its terminal `retry-after` pinned that reset on its runner. New evidence: the Curator schedule run is a sixth death of the same class (05:31:10Z, presenting as a stall, watchdog-killed 05:41:32Z), but its crash-parity retry `40824860174` ran green on a fresh runner 8 minutes later. The retry-after is per-runner-egress or rolling, not a global account lock: lighter sessions on fresh runners are serving. The heavy final-phase #772 draw stays reset-gated; the light #777 docs Council gate can be drawn when its Tester approves.
- **Curator**: the delayed 00:00Z tick `40820084328` died on the quota class after filing #776 and committing the fixes; its one self-heal retry `40824860174` delivered PR #777 green at 05:50:34Z. The 06:00Z tick is due imminently; its schedule owns it.
- **Auditor**: daily schedule `40819746432` green; report posted on #70 at 05:05:54Z.
- **#775** (`[Audit] Machine escalation comments with an inline /oc trigger spawn a false General session`): verified accurate against `c8ac7d02`; parked post-delivery (minimal fix: separate first-line trigger comment plus the line-anchored general-gate tightening and an audit fixture).
- **#745** (`opencode/lab-742-owner-pat-env-sanitization`, head `7a04fa4a96e1982ac307ca40973fed29379def0b`): CONFLICTING/DIRTY, unchanged since 2026-10-23, parked post-delivery.
- **#773/#774** (Auditor LAB.md and setup.sh findings): verified accurate and non-blocking; parked in the post-delivery lab batch. **#754** is the tracked quota class, post-delivery.
- **Health** (verified live this run): trigger allowlist exact 19/19 against the live active workflow names (23 active minus the GitHub-managed `Dependabot Updates`, `Dependency Graph`, `pages-build-deployment` and the self-excluded `maintainer`). Zero held (`action_required`) runs. No stale `opencode/schedule-*`/`opencode/dispatch-*` remote branches. Pages production root, `maze-chase/`, `/preview/pr-777/`, and `/preview/pr-772/` all HTTP 200.
- **Issues**: 16 open, all triaged. #582 is the active Phase Epic with #772 in the Council lane; #655/#657/#659/#661/#677/#678/#683 are folded into the Final Phase scope; #742 via #745, #754, #773, #774 and #775 stay post-delivery; #70/#42 are the boards; #776 is fixed by #777. Zero untriaged.
- **Deliverable artifacts**: `maze-chase-v0.1.0-rc.1` (pre-release, 2026-10-25) remains the terminal artifact under test; the stable `maze-chase-v1.0.0` is still gated on the Council approval and the native per-OS rows.
- **Owner directives active**: delivery-first (6358553065: delivery first, no unnecessary infra churn, lab changes only when genuinely necessary to unblock); Pages contrast fix (6349584523); terrain/river textures (6349595081); Browser/PWA smoothness guardrail (6350485765); no extra sweep (6358553065).
- **Known deviations**: the #754 provider wall has hit the heavy evaluator five times and the Curator once; lighter sessions on fresh runners are currently serving. The general-arm false activation is tracked as #775 (verified, parked). #745 parked/conflicting; the memory-publish keep-both delta duplicates `<!-- run: -->` markers (cosmetic); maintainer cron ticks are hours apart under GitHub scheduling pressure.

## Decisions this run

`.maintainer/decision.json` = `[]`. `.maintainer/comment.md` = the #777 status triage. `.maintainer/personality.md` unchanged. No `emergency.json`.
- No `review`: review run `40825687128` is live on #777 head `55c8a990`; a duplicate would queue a second full review.
- No `test`/per-OS: the Tester lane follows the Reviewer's verdict automatically; the per-OS lanes are for the Maze Chase artifacts after #772 merges.
- No `eval`: no Tester marker on #777 yet; #772's heavy gate stays reset-gated (exactly one head-bound draw at or after 2026-10-30T00:03:14Z).
- No `merge`: no owner-authored, head-bound `eval-verdict: approve-eval` marker on #777 or #772.
- No `curate`/`auditor`: their schedules own them; the Curator just recovered its own run and the Auditor completed its daily pass.
- No `lab`: #775/#754/#773/#774/#745 stay parked post-delivery under the delivery-first directive; nothing in this wake is a delivery blocker.
- No `fix`/`continue`: no review findings yet; #777 is not an infra branch.
- No `ping` on #772: the provider-lever escalation is already posted and unanswered.
- No `create_issue`/`create_pr`/`recover`/`ideate`: zero untriaged, nothing stranded, no ideation request.

## Callbacks

The hardcoded comment step posts the #777 status triage as the bot. The PAT merge sweep sees no eval marker on #777 or #772 (and #745 conflicting), so it does not merge. The approve-held-runs sweep has zero held runs to clear. The "Trigger pages deployment if main advanced" step has nothing new to deploy (main unchanged; the preview deploy already ran). The memory publish appends this 2026-10-29 entry keep-both per #647.

## Next run

1. Watch #777: review `40825687128` on `55c8a990` -> the workflow posts `/oc test` on approval (or `/oc fix` on findings, with its bounded auto-retries). When the Tester approves #777, draw exactly one head-bound docs Council eval promptly: the lane is serving lighter sessions on fresh runners and the docs eval is light (~16 minutes on #771/#757), so it does not consume the post-reset #772 allowance. If that draw dies on the quota class, hold to the reset like #772.
2. Verify the #777 eval marker when it lands (owner-authored, `eval-head` equal to the then-current head, `eval-trigger` equal to the latest eval trigger, newer than the Tester marker, not superseded by a newer fix handoff or rejection). Then verify the merge-base and merge head-bound (`gh pr merge 777 --rebase --match-head-commit <head>`, merge fallback only for non-linear history, never `--delete-branch`); `Fixes #776` closes #776; watch the Pages deploy.
3. #772: no Owner response to the provider-lever escalation; hold the heavy Council gate until 2026-10-30T00:03:14Z, then draw exactly one head-bound eval. If it dies short again, treat the free lane as structurally insufficient: no further redraws without the Owner's lever.
4. Curator 06:00Z tick: let it run; triage a #754-class death, not a redraw. If its cap escalates on #70 with an inline trigger, triage it as #775 evidence.
5. Post-delivery lab batch unchanged, with #775 after #754: the runner-restore tracked-file auto-commit leak plus the test-lane owner-trailer strip, then #754 (quota classifier and fast-fail), then #775 (separate first-line escalation trigger plus the line-anchored general-gate tightening and its audit fixture), the review-gate retry cap (head-bound/time-window counting), the #745 project-config/PR-head-checkout observation, then #773 and #774, then #745.
6. After the #772 merge, dispatch the macOS and Windows per-OS lanes on #772 against the published rc.1 artifacts (terminal matrix re-sign, desktop install/launch/uninstall including the HiDPI and idle-CPU proofs that close #677/#678, real-speaker review), then coordinate the stable `maze-chase-v1.0.0` cut and close #655/#661/#683/#582 only when every row is signed. Keep #657/#659/#677/#678 folded into the Final Phase scope until their acceptance criteria are met.

## Open questions

1. Does #777's review/test/eval lane complete on the currently serving free lane, or does the quota class still bite on a light docs deliverable?
2. Does the #777 docs Council gate succeed before the 2026-10-30T00:03:14Z reset, unblocking #776 without touching the #772 plan?
3. Does the Owner provide the provider lever (OpenCode Go or credits) for #772, and if so, on which lane/model?
4. If the lever is declined, does a reset-gated heavy draw ever complete the #772 Council gate, or is the free lane structurally insufficient for the final-phase deliverable?
5. After the #772 merge, do the macOS and Windows lanes sign the rc.1 rows on the first pass, or surface native-host defects?
6. Does the stable `maze-chase-v1.0.0` tag land through the existing `maze-chase-v*` pipeline without a workflow change?

- Hephaestus, the Maintainer
