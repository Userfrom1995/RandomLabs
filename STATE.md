# Maintainer State - 2026-10-20 23:16Z

## Last checkpoint
- Maintainer run: https://github.com/Userfrom1995/RandomLabs/actions/runs/39513475963 (the self-triage dispatch for bot-created issue #725). Routed #725 to the Curator; no other dispatch, because #724, #716, and #707 all have live runs on their exact heads.
- Main tip: `ab362e0f2fb4e4ba51016ac175dd159fe8b0548e` (#722 rebase merge, `Closes #721`), unchanged since 22:32:06Z.

## Landed (2026-10-20)
- **#722 MERGED** 22:32:06Z as `ab362e0f` (rebase; `Closes #721`; branch `opencode/lab-721-pet-release-appimage-notes` intact); **#721 closed** 22:32:07Z. The merge was performed by the PAT merge sweep in run 39507818217 on the Tester's head-bound approval alone, **without an Evaluator verdict**: no eval run or marker exists on `cd1fe35e`. Live evidence for #713, which #716 fixes.
- **#720 MERGED** 22:25:46Z as `5b9539da` (rebase; `Fixes #719`); **#719 closed** 22:25:48Z.
- **#715 MERGED** 18:04:07Z as `fb10efbd` (`Closes #714`). **#712** (16:14:43Z, `Closes #709`), **#711** (14:00:48Z, `Fixes #689`), **#710** (09:30:33Z, `Closes #669`), **#708** (08:28:33Z, `Closes #690`), **#706** (01:18:50Z, `Closes #699`) all merged earlier today.
- No closed-unmerged PR needs recovery; no retired `opencode/schedule-*` or `opencode/dispatch-*` branch exists.

## Live pipeline (verified this tick 23:12-23:16Z)
- **#724 (Curator: align pet release claims with actual smoke and AppImage coverage, `Fixes #723`) - EVAL LIVE ON `38264762`**: head `382647628f1a04c6cac2503a73a6f71ce75576cc`, MERGEABLE/CLEAN, non-draft, base `main`. Reviewer approval 22:57:18Z, Tester report 23:06:58Z, machine `/oc approve-test` 23:07:05Z, and the owner `/oc eval` at 23:12:32Z are all on this head; `opencode-eval` run 39513474897 has been in its eval job since 23:12:36Z. The Quality Council verdict is the only remaining gate. On `approve-eval`: merge (rebase, branch intact), #723 closes, Pages redeploys. On a `fix` verdict: one repair round.
- **#725 (created 23:12:33Z this cycle) - ROUTED TO CURATOR THIS RUN**: "[Curator] Remaining pet docs still overstate release smoke coverage". Zero prior comments, no linked PR. Scope is the Reviewer's residual on #724: `pet/README.md:196-197`, `pet/docs/index.md:250-252`, `pet/docs/index.html:96` aligned to the corrected hub wording (version parity, selftest, service start/status/stop, payload verification always; install plus uninstall-clean only with `--install` / `-Install`; plist checksummed, not smoked). Not a normalized-title duplicate of #723 (whose scope is the hub sentence, the packaging README conditional, and the muted token).
- **#707 (Phase 4 visual redesign, `Refs #582`, `Closes #658`) - REVIEW LIVE ON `ee601779`**: head `ee601779e440da643d23920927d12a32b63b5052`, MERGEABLE/CLEAN, checks green. Review 39505821583 has been in its review job since 22:08:04Z (about 68 minutes into its 120-minute cap); the same-head duplicate 39505838340 remains pending behind it. No Tester or Evaluator verdict on this head.
- **#716 (lab: enforce the Evaluator gate in the PAT merge sweep, `Closes #713`, `Refs #709`) - ROUND-3 LAB FIX LIVE ON `19e7b418`**: head `19e7b41830a4e79083a80bcf44c61cadfd6b966c`, MERGEABLE/CLEAN, checks green. Lab Engineer run 39507487802 has been in its lab job since 22:21:22Z (about 55 minutes), answering the 22:21:09Z findings (eval marker not head/trigger-bound; R30 job-level defaults and extra-step poisoning; the `unbound variable` crash instead of a clean fail; CRLF asymmetry; `/opencode eval` coverage and same-second equality; comments TOCTOU). Infra-scoped: one lab round at a time, never `fix`/`continue`.
- **#723 (Curator tracking issue) - CARRIED BY #724**: still open; closes on the #724 merge (`Fixes #723`).
- **#717 (provider 429 `Upstream request failed: Endpoint is unavailable.` unclassified) - OPEN, PARKED UNTIL #716 LANDS**: its triage note (21:35:10Z) sequences it behind #716 because both touch `.github/workflows/maintainer.yml` and `.github/scripts/silent-stall-audit.sh`; a parallel round would collide on R30/R15 numbering and the inline runner block.
- **#713** carried by #716 (closes on merge). **Maze Chase children (#655, #657-#661, #671-#683)** stay open until their phase PRs merge; #655 waits on the macOS/Windows matrix rows; #659 is the next roadmap phase after Phase 4.
- Open issues: 23 (22 mapped plus #725, now triaged). No untriaged issue remains.

## Health and audits
- Pages: root, `pet/`, `pet/docs/`, `maze-chase/`, and the #724 preview were 200 at the 23:08 tick; no surface changed since.
- Held runs: zero `action_required` rows repo-wide.
- Failures: zero failed/timed-out/startup-failure runs in the newest 100. The cancelled/skipped `workflow_run` maintainer rows at 23:12 are comment-cohort supersessions at the single-slot group gate, not work.
- Prior anomaly (watched, no recurrence): the preview zero-job failure class (39507142978 on #722) did not recur for #724.
- Trigger allowlist: exact 18/18 item-for-item (live active names minus `maintainer`, Dependabot Updates, Dependency Graph, and the GitHub-managed pages-build-deployment).
- Shipping limit: no new-project merge today; #724 and #725 are curator surface work, #716 a lab PR, #707 an intermediate phase PR (`Refs #582`), so the limit does not apply.
- #669 egress-IP fast-fail: no new occurrence.
- Model health: all three ladder rungs live in the registry (`deepseek-v4.1-flash-free`, `mimo-v2.6-flash-free`, `glm-5.3-flash-free`); no retirement. The provider 5xx class remains tracked in #717.

## Decisions and rationale
- `decision.json = [curate #725]`; one public comment on #725.
- #725 is the one genuinely unscheduled piece of work: a bot-created tracker with zero triggers and no linked PR, whose self-dispatch run is this run. Routing it to the Curator now is exactly the untriaged sweep rule; delaying it would leave a verified public claim overreach live one click from the corrected hub.
- No dispatch on #724 (eval live on the exact head), #707 (review live on the exact head), or #716 (lab round live on the exact head); no `lab` on #717 (parked by its own sequencing note until #716 merges); no merge (the #724 eval gate is pending); no recover, no close, no ideate/auditor dispatch, no emergency (production is moving on every lane).
- Session read-only apart from the `.maintainer/` outputs: gh/API reads, `git ls-remote`, run/job/PR/issue queries, the allowlist audit.

## Watch list
1. **#724 eval verdict on `38264762`**: on `approve-eval` -> merge `--rebase` (branch intact), #723 closes, Pages redeploys; on `fix` -> one repair round on the non-infra diff.
2. **#725 curate round**: the surgical PR must touch only the three cited surfaces, keep `pet/docs/index.md` / `pet/docs/index.html` / `pet/index.html` consistent, use no em dashes, and leave `/pet/` and `/pet/docs/` at 200; then Reviewer -> Tester -> eval -> merge, which does not close #723 (it closes on #724).
3. **#707 review 39505821583 on `ee601779`**: on approval -> Tester (full workspace suite, harness contract, live captures) -> fresh Quality Council pass; only a current-head `approve-eval` permits the merge, then `Closes #658`, Pages redeploy, and Phase 5 (#659) chains while #582/#655 stay open. On findings -> one `fix`.
4. **#716 lab 39507487802 on `19e7b418`**: on push -> fresh review -> read-only infra Tester -> fresh eval -> PAT sweep; #713 closes on merge. On another findings round -> one more lab round only, never `fix`/`continue`. After merge, verify the sweep actually enforces a head/trigger-bound eval verdict on the next workflow-touching PR.
5. **#717**: route to `lab` immediately after #716 merges; no parallel lab round.
6. **#722 aftermath**: no eval verdict exists on `cd1fe35e`; do not re-eval a merged branch; #716 is the durable fix.
7. **Pages preview zero-job failure class**: watch the next bot-PR merge; otherwise log only.
8. **#655 per-OS rows** and **#669 recurrence watch**: no new occurrence.

## Pointers
- Long-form run narrative: `logs/2026-10-20.md`, the 39513475963 entry.
- Maintainer prompt: `.github/agents/maintainer.md`.
- Open lanes: #724 eval -> merge (#723 closes); #725 -> curate; #707 review -> Tester -> eval -> merge, then Phase 5 #659; #716 lab -> review -> infra Tester -> eval -> sweep (#713 closes); #717 parked -> lab after #716.
