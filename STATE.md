# STATE - Random factory checkpoint
 - **Updated: 2026-09-27T11:41Z (maintainer run 36316461570, owner /oc maintainer on PR #451 - standby, reviewer findings in, builder fixing)**

## PRs & Issues
 - **PRs:** #451 OPEN (Hearthlight for #449, head now 53a1001d, branch `opencode/issue449-20260927113051`, 3 commits: `81cd7829` architect blueprint + `5fb96000` builder story package + `53a1001d` builder animatic engine). Reviewer verdict landed (run 36316293483 success): NO approval, 4 blocking findings. Body still says `Closes #449` (line 9) - must become `Refs #449`.
 - **Issues:** #450 stall-hardening (OPEN, Lab Engineer run 36316294238 in_progress); #449 short-film tracking (OPEN, Phase 1 build producing on the PR branch); standing boards open: #70 lab-health, #42 brainstorm.
 - **Boards:** #70 lab-health, #42 brainstorm standing. **Main 78f3b333 LIVE.** Trigger-list 18/18 PASS.

## IN FLIGHT
 - PR #451 review: opencode-review run 36316293483 completed success with blocking findings (theatre shell, docs hub, pipeline skeleton, body trailer); queued duplicate 36316306513 skipped. Verdict covered head 5fb96000; branch has since advanced to 53a1001d, so a FRESH review on the new head is required before any merge - never merge on a stale verdict.
 - PR #451 build/fix: Builder run 36316101056 in_progress (owner's `/oc continue` 11:38:43Z); already pushed 53a1001d (engine: rng, timeline, sketch renderer, motif score). No separate `fix` dispatched (would duplicate on the same branch). Live branch check: film/index.html, film/README.md, film/tools/render.mjs all still absent - findings 2-4 open.
 - Stall-hardening #450: Lab Engineer run 36316294238 in_progress. No duplicate dispatched.
 - opencode run 36316461689 pending (11:39:56 batch, likely GENERAL for the `/oc maintainer` text) - harmless, left alone.
 - Owner branch `opencode/issue436-gui-detach-and-syswide-fixes` still at d905397a (no new signal, no PR vehicle): tor-cli CI still red branch-scoped. No dispatch - owner session active, no vehicle, main unaffected.
 - Post-merge pages verification DONE: Deploy run 36305874865 succeeded on 78f3b333 (2026-09-27T08:20:14Z).

## NEXT-RUN PLAYBOOK
1. When the Builder pushes again or run 36316101056 completes: route a fresh `review` on the latest head of #451 (stale-verdict rule). Do NOT merge on the 5fb96000 verdict.
2. When a fresh Reviewer posts `/oc approve` on the latest head (no later `/oc fix`): merge with `--rebase` (trailer corrected to `Refs #449`, keep #449 open), verify main advanced, confirm Deploy success on the new tip, then IMMEDIATELY chain the next phase (`build`/`continue` on 449) - never halt on an intermediate PR.
3. When the Reviewer posts new `/oc fix` findings: route `fix` on 451 ONLY if no builder/fixer run is in flight on the branch (same-repo bot PR; no infra files in diff so `fix` is safe, not `lab`).
4. When the Lab Engineer opens a PR for #450: route `review` on it (infra PR - never `fix`/`continue` on it per the routing guard; further infra work goes `lab`).
5. If a PR opens from `opencode/issue436-gui-detach-and-syswide-fixes`: route `review` (or `fix` if findings land); Windows Setsid break plus committed binary plus macOS exit-code regression must be resolved before merge.
6. If the branch keeps advancing with no PR and CI stays red: evaluate only, never seize owner work; ping only on the eventual PR/issue, never on closed #436 uninvited.
7. On any new issue/comment/push or workflow_run failure: triage per charter (correlate, cooldown 30m, route review/test/eval/fix/lab/recover/auditor/curate as demanded).
8. Trigger-list re-verify each run.
9. NEVER assume an `issues: opened` run will follow a `create_issue` decision (bot-created content suppresses it). After creating an issue, either chain the next dispatch via a dispatched follow-up or mark it UNTRIAGED in STATE.md until routed.

## OPEN QUESTIONS
 - Will the Builder close all four reviewer findings (theatre shell, docs hub, pipeline skeleton, body trailer) and complete the six Phase 1 boxes?
 - Will the fresh review on the post-verdict head approve #451 (as Refs #449) or return new findings?
 - After merge, will the next phase chain cleanly via build/continue on #449?
 - Will the Lab Engineer land the create_issue self-follow-up so this stall class is gone?
 - What caused the 08:34-11:26Z schedule silence (GitHub cron flake vs misconfig)?
 - Will the Owner open a PR from the `gui-detach-and-syswide-fixes` branch, or land it another way?
 - Probe source of the 2026-09-25 PWNED selfheal payloads (red-team test vs unknown actor) - Auditor flagged for owner-level awareness; no code change needed.

 - Hephaestus, the Maintainer
