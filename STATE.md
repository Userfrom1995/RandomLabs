# STATE

Last updated: 2026-10-29T06:11Z by run 40826894815 (issue_comment `/oc maintainer` after the fix push: re-review live on #777 head 4069199b; no dispatch, no merge).

## Who I am

I am Hephaestus, the Maintainer of this lab, successor to Mae (inception through 2026-08-27). I keep the pipeline moving: survey the live repo, load memory, decide, post only through the hardcoded steps. Owner messages are binding and always win.

## Right now (post-survey, 2026-10-29T06:11Z)

- **main** = `c8ac7d02a013858052f5a2b57b77a85e543a4480` (unchanged; `gh api commits/main` and `git ls-remote origin main` both match).
- **#777 (Curator)**: `curate: correct the archived codec summaries and scope the website rule (Fixes #776)`, OPEN, non-draft, MERGEABLE/CLEAN, head `4069199b8fd6504da5961bd6edc70cce20d4c12f`, 3 commits, 2 files +5/-5, no code/workflow/agent paths; merge-base `c8ac7d02`, 0 behind and 3 ahead. The Fixer applied both review findings on `4069199b` (Obsidian row now `20-predictor bank and context-modeled adaptive entropy (CMARC, with Golomb-Rice as fallback)`; the off-by-default, never-selected MA-tree-lite seam removed; PR body Obsidian bullet corrected, skills line and 3-to-5-word ledger scopes added). Re-review run `40826879273` is in progress since 06:03:00Z (agent step began 06:03:15Z) on this head; it is the Fixer's hardcoded `/oc review` `6489279408`. The queued `opencode-review` `40826894615` is the normal skip-only fan-out from the `/oc maintainer` comment, not a second review. No new comment since the previous Maintainer summary `6489308889` at 06:05:02Z. No Tester marker, no `eval-verdict:` marker, no merge.
- **#776 (Curator tracking issue)**: OPEN, zero comments; fixed by #777 (`Fixes #776`), closes on merge. Triaged.
- **#772** (Final Phase: released-artifact verification and product sign-off, `Refs #582`, `Refs #655`, `Refs #661`, `Refs #683`): OPEN, non-draft, MERGEABLE/CLEAN, head `75fe4f51b65c4623f15a55ae4c78c321e61e2709`, unchanged. The owner-authored Tester marker `6459780188` at 03:20:02Z still binds this head; latest eval trigger `6485543381` at 01:42:27Z; no `eval-verdict:` marker and no newer `/oc fix` handoff. The heavy Council gate stays reset-gated to exactly one head-bound draw at or after 2026-10-30T00:03:14Z. Newest thread comment is the 02:24:40Z fifth-death ledger; no Owner response to the provider-lever escalation.
- **Council gate: #772 held until 2026-10-30T00:03:14Z.** Five consecutive #754 free-usage deaths; the Curator schedule death of the same class recovered on a fresh runner via its bounded self-heal, so the retry-after is per-runner-egress or rolling, not a global account lock. Lighter sessions on fresh runners are serving; the heavy final-phase #772 draw stays reset-gated.
- **Curator**: the 06:00Z schedule tick had not been delivered by 06:11Z (GitHub scheduling pressure; the delayed 00:00Z tick landed at 04:51:33Z). Last schedule run `40820084328` is green via its bounded self-heal handoff, whose retry `40824860174` opened #777. The schedule owns the next tick; no redraw from here.
- **Auditor**: daily schedule `40819746432` green; report posted on #70 at 05:05:54Z. It confirms the five #754 quota deaths, zero held runs, all model pins and ladder rungs live and free, and proposes no model switch (the quota wall, not model choice, is the constraint).
- **#775** (`[Audit] Machine escalation comments with an inline /oc trigger spawn a false General session`): verified accurate against `c8ac7d02`; parked post-delivery (minimal fix: separate first-line trigger comment plus the line-anchored general-gate tightening and an audit fixture).
- **#745** (`opencode/lab-742-owner-pat-env-sanitization`, head `7a04fa4a96e1982ac307ca40973fed29379def0b`): CONFLICTING/DIRTY, unchanged since 2026-10-23, parked post-delivery.
- **#773/#774** (Auditor LAB.md and setup.sh findings): verified accurate and non-blocking; parked in the post-delivery lab batch. **#754** is the tracked quota class, post-delivery.
- **Post-delivery note**: the #777 review flagged (non-blocking) that `.github/agents/builder.md:96` and `.github/agents/architect.md:94` still use unqualified "EVERY project directory" language that the corrected CONTRIBUTING rule now scopes to current projects; alignment belongs to the Lab Engineer in a separate infra PR. The reviewer's Prism precision note is non-blocking (the current row is supported as a design summary) and the fixer correctly left it.
- **Health** (verified live this run): trigger allowlist exact 19/19 against the live active workflow names (23 active minus the GitHub-managed `Dependabot Updates`, `Dependency Graph`, `pages-build-deployment` and the self-excluded `maintainer`). Zero held (`action_required`) runs. No stale `opencode/schedule-*`/`opencode/dispatch-*` remote branches. Pages production root, `maze-chase/`, `/preview/pr-777/`, and `/preview/pr-772/` all HTTP 200. Last 100 workflow runs: zero failures, timeouts, or startup failures.
- **Issues**: 16 open, all triaged. #582 is the active Phase Epic with #772 in the Council lane; #655/#657/#659/#661/#677/#678/#683 are folded into the Final Phase scope; #742 via #745, #754, #773, #774 and #775 stay post-delivery; #70/#42 are the boards; #776 is fixed by #777. Zero untriaged.
- **Deliverable artifacts**: `maze-chase-v0.1.0-rc.1` (pre-release, 2026-10-25) remains the terminal artifact under test; the stable `maze-chase-v1.0.0` is still gated on the Council approval and the native per-OS rows.
- **Owner directives active**: delivery-first (6358553065: delivery first, no unnecessary infra churn, lab changes only when genuinely necessary to unblock); Pages contrast fix (6349584523); terrain/river textures (6349595081); Browser/PWA smoothness guardrail (6350485765); no extra sweep (6358553065).
- **Known deviations**: the #754 provider wall has hit the heavy evaluator five times and the Curator once; lighter sessions on fresh runners are currently serving. The general-arm false activation is tracked as #775 (verified, parked). #745 parked/conflicting; the memory-publish keep-both delta duplicates `<!-- run: -->` markers (cosmetic); maintainer cron ticks are hours apart under GitHub scheduling pressure.

## Decisions this run

`.maintainer/decision.json` = `[]`. `.maintainer/comment.md` empty. `.maintainer/personality.md` unchanged. No `emergency.json`.
- No `review`: re-review `40826879273` is live on #777 head `4069199b` from the Fixer's hardcoded `/oc review`; a duplicate would queue a second full review.
- No `test`/per-OS: the review workflow auto-forwards `/oc test` on approval (or `/oc fix` on findings); the per-OS lanes are for the Maze Chase artifacts after #772 merges.
- No `eval`: no Tester marker on #777 yet; #772's heavy gate stays reset-gated (exactly one head-bound draw at or after 2026-10-30T00:03:14Z).
- No `merge`: no owner-authored, head-bound `eval-verdict: approve-eval` marker on #777 or #772.
- No `fix`/`continue`: the fix landed green and #777 is not an infra branch.
- No `curate`/`auditor`: their schedules own them; the Curator 06:00Z tick is pending delivery and the Auditor completed its daily pass.
- No `lab`: #775/#754/#773/#774/#745 stay parked post-delivery under the delivery-first directive; nothing in this wake is a delivery blocker.
- No `ping`: the thread already carries the fixer summary and the previous Maintainer status; a repeat would be noise.
- No `create_issue`/`create_pr`/`recover`/`ideate`: zero untriaged, nothing stranded, no ideation request.

## Callbacks

The hardcoded comment step has nothing to post (empty comment.md). The PAT merge sweep sees no eval marker on #777 or #772 (and #745 conflicting), so it does not merge. The approve-held-runs sweep has zero held runs to clear. The "Trigger pages deployment if main advanced" step has nothing new to deploy (main unchanged; the preview deploy already ran). The memory publish appends this 2026-10-29 entry keep-both per #647.

## Next run

1. Read the re-review outcome on `4069199b`. A clean verdict makes the workflow post `/oc test`; findings make it post `/oc fix`. Either way the pipeline moves without a Maintainer dispatch.
2. When the Tester approves #777, draw exactly one head-bound docs Council eval promptly: the lane is serving lighter sessions on fresh runners and the docs eval is light (~16 minutes on #771/#757), so it does not consume the post-reset #772 allowance. If that draw dies on the quota class, hold to the reset like #772.
3. Verify the #777 eval marker when it lands (owner-authored, `eval-head` equal to the then-current head, `eval-trigger` equal to the latest eval trigger, newer than the Tester marker, not superseded by a newer fix handoff or rejection). Then verify the merge-base and merge head-bound (`gh pr merge 777 --rebase --match-head-commit <head>`, merge fallback only for non-linear history, never `--delete-branch`); `Fixes #776` closes #776; watch the Pages deploy.
4. #772: no Owner response to the provider-lever escalation; hold the heavy Council gate until 2026-10-30T00:03:14Z, then draw exactly one head-bound eval. If it dies short again, treat the free lane as structurally insufficient: no further redraws without the Owner's lever.
5. Curator 06:00Z tick: let it run; triage a #754-class death, not a redraw.
6. Post-delivery lab batch unchanged, with the builder/architect prompt alignment note appended and #775 after #754: the runner-restore tracked-file auto-commit leak plus the test-lane owner-trailer strip, then #754 (quota classifier and fast-fail), then #775 (separate first-line escalation trigger plus the line-anchored general-gate tightening and its audit fixture), the builder/architect "EVERY project directory" alignment, the review-gate retry cap (head-bound/time-window counting), the #745 project-config/PR-head-checkout observation, then #773 and #774, then #745.
7. After the #772 merge, dispatch the macOS and Windows per-OS lanes on #772 against the published rc.1 artifacts (terminal matrix re-sign, desktop install/launch/uninstall including the HiDPI and idle-CPU proofs that close #677/#678, real-speaker review), then coordinate the stable `maze-chase-v1.0.0` cut and close #655/#661/#683/#582 only when every row is signed. Keep #657/#659/#677/#678 folded into the Final Phase scope until their acceptance criteria are met.

## Open questions

1. Does the re-review approve `4069199b` cleanly, or does a new finding surface on the corrected catalog row or the rewritten PR body?
2. Does the Tester approve #777, and does the light docs Council draw complete on the currently serving free lane before the 2026-10-30T00:03:14Z reset?
3. Does the Owner provide the provider lever (OpenCode Go or credits) for #772, and if so, on which lane/model?
4. If the lever is declined, does a reset-gated heavy draw ever complete the #772 Council gate, or is the free lane structurally insufficient for the final-phase deliverable?
5. After the #772 merge, do the macOS and Windows lanes sign the rc.1 rows on the first pass, or surface native-host defects?
6. Does the stable `maze-chase-v1.0.0` tag land through the existing `maze-chase-v*` pipeline without a workflow change?
7. Does the delayed 06:00Z Curator tick land and stay green, or die on the #754 class and self-heal once?

- Hephaestus, the Maintainer
