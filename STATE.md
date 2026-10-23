# STATE

Last updated: 2026-10-23T04:39Z by the maintainer run 39901039834 (the `opencode-pr-trigger` wake on the newly opened PR #750 at 04:34:24Z; fresh survey 04:34-04:39Z).

## Who I am

I am Hephaestus, the Maintainer of this lab: Chief Orchestrator, in the line of Mae (repository inception through 2026-08-27). Quality is the only deadline. I do not post triggers myself, I do not push code to `main`, and I do not edit my own prompt or workflow. I survey fresh every run, and I only record what I verified.

## Right now

- **#743 P0 - #748 IS READY AND STILL AWAITING THE OWNER'S EXPLICIT MERGE AUTHORIZATION; every gated lane remains dead until it lands**: PR #748 (`opencode/lab-743-staged-prompt-permission`, `Refs #743`) carries three commits on `main` `08b8df67` at head `49ad1c3f4a50df8d7c3f006265a8e7039b454ceb`, MERGEABLE/CLEAN, untouched since 22:26Z (remote tip re-confirmed 04:34Z). This run re-read the head through the contents API: the exact `OPENCODE_PERMISSION: '{"external_directory":{"*":"allow"}}'` grant is present once each in `opencode-review.yml`, `opencode-test.yml`, and `opencode-eval.yml`, three times in `opencode-peros-test.yml` (the three per-OS arms), and once in `maintainer.yml` - seven arms total. The 31/31 audit, the strict duplicate-key-rejecting YAML parse, and the `reviewer.md` SHA-256 pin therefore still stand. The PR cannot be gated by the lanes it repairs (they run from `main` `08b8df67`, which lacks the grant), so it needs the same explicit owner authorization path as #747. Its review retry budget is spent 4/4 and the gate is terminal.
- **#750 (NEW, Curator, `Fixes #749`) - CORRECT ONE-LINE FIX, BLOCKED BEHIND #748**: head `e0ce36dbab1c898a3db2b7aef68b6bc6d7afe786`, one commit on `08b8df67`, author The Curator, MERGEABLE/CLEAN. Verified diff: exactly one `README.md` line, literal `*` separators replaced by middle dots, 1 addition / 1 deletion, no other content and no em dashes. The Curator schedule run 39897108925 (03:50:09Z-04:34:29Z, success) filed issue #749 and opened this PR at 04:33:36Z; its decision file was `[{"action":"review","pr":750}]` and its hardcoded owner-PAT step posted `/oc review` at 04:34:15Z (comment 6357458539). The `/oc maintainer` at 04:34:24Z (comment 6357460125) is the standard `opencode-pr-trigger` wake for the new PR, not a human trigger.
- **#750's review gate is dead on arrival**: review run 39901028883 started at 04:34:18Z on `main` `08b8df67`, which still lacks the grant; the session asks for the staged prompt and stalls (the #743 class), two watchdog kills, no verdict, then its own auto-retries. The `/oc maintainer` fan-out also queued review run 39901039749 (pending behind the first; it will skip at the job gate). No duplicate trigger from me. #749 has zero comments and closes on merge.
- **#745 (owner-PAT hardening, `Refs #742`) - CLEAN, DO NOT MERGE YET**: head `6c8c15044ad9a37dbb851867bd740ba17dcdbb87`, one commit on `08b8df67`, MERGEABLE/CLEAN, untouched (remote tip re-confirmed 04:34Z). It adds `OPENCODE_DISABLE_PROJECT_CONFIG: "true"` to the Maintainer arm, so it must not land before #748. After #748 merges: keep the permission line, verify the Maintainer-arm opt-out closes the workspace project-config channel, then ONE fresh head-bound review, the read-only infra Tester, a fresh Council, the PAT sweep; #742 closes on merge.
- **#741 (Phase 6 release engineering, `Refs #582`, `Refs #657`) - BLOCKED ON #748**: head `5d82c7bf6b0a146ce9777d05ad3855ade15c76d4`, MERGEABLE/CLEAN, unchanged since 16:32:44Z (remote tip re-confirmed 04:34Z). After #748 lands: ONE fresh head-bound review (budget spent), then Tester plus per-OS, the Quality Council, the PAT merge with the eval marker, the release-workflow lab dispatch, and the `maze-chase-v0.1.0-rc.1` cut, keeping #657 open.
- **Issues**: 15 open, all mapped: #749 (Curator finding, linked to open PR #750), #743 (P0 lane repair), #742 (until #745 merges), the ten Maze Chase issues (#683/#678/#677/#676/#661/#660/#659/#657/#655/#582), boards #70/#42. Zero untriaged. No closed-unmerged PR needs recovery (the recent closed set is all merged); no retired `opencode/schedule-*` / `opencode/dispatch-*` branch on the remote.
- **Concurrency**: this run 39901039834 is the only real maintainer session in flight; the 04:34:2x-04:34:39Z `workflow_run` maintainer wakes were skip-only or cancelled supersessions under the deliberate single pending slot. The Curator schedule run finished success at 04:34:29Z.

## Health (verified 04:34-04:39Z)

- Main tip `08b8df671157b4cd78d3a1271fbd0627b150069d` via `git ls-remote`, unchanged since 20:45Z. The workspace was checked out to the #750 head `e0ce36db` (parent `08b8df67`) by the opencode PR-session bootstrap; the authoritative Maintainer prompt is the staged `RUNNER_TEMP` copy.
- Open PRs: #750 (`e0ce36db`), #748 (`49ad1c3f`), #745 (`6c8c1504`), #741 (`5d82c7bf`), all MERGEABLE/CLEAN with remote tips matching. Zero held `action_required` runs repo-wide. The only non-success in the last 100 runs is the known #748 retry-3 review (run 39870971015).
- Trigger allowlist in `maintainer.yml`: 18 entries, matching the 18 repo-defined non-maintainer workflow names item-for-item (the 3 live GitHub-managed dynamic workflows are not repo workflows).
- Pages: production 200 on `08b8df67`; preview deploy 39901042966 succeeded at 04:34:28Z for the open-PR artifact; the latest production deploy remains 39865029449 (main unchanged, none due).
- Model pins unchanged and coherent in all three surfaces: `opencode/deepseek-v4.1-flash-free` for `model`, `small_model`, every workflow `model:` input, and the Maintainer's inline `REQUESTED_MODEL`; ladder rungs `deepseek-v4.1-flash-free`, `mimo-v2.6-flash-free`, `glm-5.3-flash-free` all present and free in the live registry (re-queried 04:37Z).

## Empirical notes (important for future runs)

- Bare `/oc maintainer` comments are machine handoffs (workflow PAT steps), not the owner typing: the Auditor, the Curator, `opencode-pr-trigger`, the lab, and the eval workflow all post them. The #747 authorization precedent was the owner's literal sentence on the PR itself (`/oc maintainer, I approve it please merge.`). Never infer consent from a bare trigger.
- The review auto-retry loop posts `/oc review (auto-retry N)` as the owner through the workflow's hardcoded PAT step. Those are machine wakes, never manual replies or merge authorization.
- The retry budget on a review gate is 1 initial + 3 auto-retries; it is fully spent on #748 and now fresh for #750 (but #750 has no grant, so it will burn through the same dead class).
- The #653 watchdog classifies a pending permission ask (no log growth after the ask) as a provider stall. On pre-fix `main` that means two 600s kills per review attempt. The #748 grant removes the ask; do not re-trigger a gated lane before it lands.
- On PR-comment triggers the opencode CLI checks the workspace out to the PR head even when the workflow checkout is pinned to the default branch. The staged Maintainer prompt is unaffected (authoritative copy in `RUNNER_TEMP`), but the project-config channel (`AGENTS.md`/`opencode.json`/plugins) follows the workspace; #745 adds the Maintainer-arm opt-out. Verify that after #745 lands.
- The `opencode-pr-trigger` workflow is what posts `/oc maintainer` when a PR opens or is pushed; expect a maintainer run per new bot PR and do not read it as human intent.
- Do not post repeated "awaiting authorization" comments on #748: the 22:37Z comment already carries the ask. Point at it once from a new PR thread (this run on #750) and leave #748 untouched.
- A scheduled failure wake for `opencode-review` on `main` with a missing decision file is the known #743 signature while #748 is open: stand down, no dispatch, no comment.

## Decisions this run

- No dispatch: `decision.json` is `[]`. #748 is verified and awaits explicit owner authorization; every gated lane still lacks the grant until #748 lands; #750's review is already in flight and doomed by the same lane defect; #745/#741 are blocked behind #748.
- One public comment on #750 (the run target): it records the verified diff, explains why the already-running review will stall on the #743 class, and points at the single unblock (explicit authorization or a Merge click on #748).
- No merge: no tester approval plus eval marker can exist while the lanes are broken, and no explicit owner authorization exists for #748.
- No `review`/`test`/`eval`/per-OS: they run from pre-fix `main` and still hit the ask; #748's budget is spent, #750's review is already running, and #745/#741 are downstream of #748.
- No `lab` duplicate: #748 already carries the complete, verified fix.
- No `fix`/`continue`: every open PR is infrastructure or workflow-touching (routing guard).
- No create/close/recover/ideate/auditor/curate: #749 is the Curator's own issue with a linked open PR, zero untriaged content, no stranded work, no ideation request, and the Curator and Auditor both reported in the last hour.
- No emergency: `lab.yml` executes normally and production is not halted by a failed lab attempt; the repair is a normal routed lab PR, and the remaining blocker is authorization.

## Watch list

- #750: the review gate will burn its 1+3 budget on the #743 class; do not re-trigger before #748 lands. After #748, dispatch a fresh review at `e0ce36db`, then test/eval/merge; #749 closes on merge.
- #748: on explicit owner authorization, verify the head and merge with `--match-head-commit`, branch intact; then confirm `main` carries the grants on all seven arms.
- #748 review gate: terminal at 4/4 attempts; do not re-trigger pre-merge. Post-merge, the first fresh review is the live proof.
- After #748 lands: live per-lane proof (review, test, eval, per-OS) before closing #743; fresh reviews of #750 `e0ce36db`, #741 `5d82c7bf`, and #745 `6c8c1504`.
- #745: keep the permission line, verify the Maintainer-arm opt-out closes the workspace project-config channel, then the full gate chain; #742 closes on merge.
- #741: review -> test -> per-OS -> eval -> PAT merge -> release lab dispatch plus `maze-chase-v0.1.0-rc.1`; #657 open.
- Recurrence watches: #620 free-tier, #717 upstream-endpoint, #669 egress-IP, #653 stall classes (including the permission-ask false positive), the #616/#637 publication gate, the Pages preview zero-job class, #655 per-OS rows, the test-cap pattern.
- Deferred: the merge-capability docs reconciliation; the maintainer wake-displacement finding; a possible lower cap or lab routing for auto-retries on self-repairing infra PRs.

## Next steps

1. **#748**: on the owner's explicit authorization (Merge click or the literal approval sentence), verify the head `49ad1c3f` and merge it with `--match-head-commit`; then confirm `main` carries the grant on all six PR-gated steps plus the Maintainer arm.
2. **#743**: collect the per-lane live evidence (review, test, eval, per-OS) and close only when complete.
3. **#750**: after #748 lands, one fresh head-bound review at `e0ce36db`, then Tester, Council, and the merge; #749 closes on merge.
4. **#741**: one fresh head-bound review after #748 lands; then Tester plus per-OS, Council, PAT merge with the eval marker, release lab dispatch, rc.1.
5. **#745**: after #748, verify/rebase, then the full gate chain; close #742 on merge.
6. **Health**: if a new failure class appears, triage it; the ask class and the terminal review gates are known and owned by #748.

## Pointers

- This run's log entry: `logs/2026-10-23.md`, run 39901039834.
- New this run: PR #750 (head `e0ce36db`), issue #749 (Curator audit finding, zero comments), curator run 39897108925 (decision `[{"action":"review","pr":750}]`, log line 10538), review run 39901028883 (in flight at 04:39Z), preview deploy 39901042966 (success 04:34:28Z).
- Evidence runs: https://github.com/Userfrom1995/RandomLabs/actions/runs/39870971015 (retry-3 review, /tmp ask at 23:30:34Z, watchdog at 23:41:00Z, gate red after 4 attempts), https://github.com/Userfrom1995/RandomLabs/actions/runs/39860286714 (final lab round, pushed `49ad1c3f`), https://github.com/Userfrom1995/RandomLabs/actions/runs/39861295688 (initial pre-fix review).
- Authorization precedent: the #747 literal owner comment 6350814424 (`/oc maintainer, I approve it please merge.`); the merge comment 6352567562 on #748 carries the detailed ask.
- The binding rules: `.github/agents/maintainer.md` (this run) and `AGENTS.md`.
- Trusted surfaces: `.github/scripts/silent-stall-audit.sh` (R1-R31), `.github/scripts/publish-eval-marker.sh`, the PAT sweep in `maintainer.yml`, and `.github/actions/opencode-run/`.
- The #716 Council verdict: #716 comments 6345926245 and 6345928384, eval run 39809774877.
