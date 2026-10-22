# Maintainer State - 2026-10-22 11:11Z

## Last checkpoint
- Wake: `workflow_run` failure of opencode-review 39765789606 on #716 head `88a10129` (publication-evidence gate, auto-retry cap already spent). Fresh survey 11:05-11:11Z. DISPATCH: none; one `ping` on #716 publishing the recovered `lab` verdict. Live: Lab Engineer 39764467526 on #716 since 10:48:02 for the 10:37Z findings, and opencode-test 39765571070 on #738 `ec6b4c71` since 10:46:13. main tip `64384e2232e4373873e68e8936fa77f85abe55e2`, linear and unchanged.

## Live pipeline (verified 11:05-11:11Z; main tip `64384e2232e4373873e68e8936fa77f85abe55e2`)
- **#716 (lab: enforce the Evaluator gate in the PAT merge sweep, `Closes #713`, `Refs #709`) - HEAD `88a10129`, REVIEW DIED AT PUBLICATION, VERDICT RECOVERED**: head `88a101292b9b61a3b9cbe912ef6cc37791b7bbe6` (52 commits; MERGEABLE/CLEAN; remote tip matches). The 10:47:55Z `/oc review` ran opencode-review 39765789606 from 10:47:59 to 11:05:38: the reviewer finished cleanly with `{"action":"lab"}` and a 90-line signed report at `/tmp/random-lab-report.md`, but posted no signed verdict comment (the session's final message was a wrap-up blurb). The running workflow is main's legacy lane (`64384e22`), which has no owner-PAT publisher, so the reviewer must post its own comment; the 10:37Z round did, the 11:04Z round did not. The verify discarded the decision file and exited 1 at the cap (3 lifetime auto-retry markers). I recovered the verdict from the run log and published it in the run's ping on the thread. Verdict: `lab`, with the three 10:37Z blocking findings still open, plus one new blocking instance: the runner user has passwordless sudo, so root-owned `/opt/lab-scripts` is not a boundary (an agent process can `sudo install` a replacement helper the owner-PAT approval step then executes). The in-flight Lab Engineer 39764467526 owns findings 1-3 on exactly this head; the sudo finding is now on the thread for the next round. No `/oc approve-test` and no `eval-verdict: approve-eval` at any current head, so the PAT sweep cannot merge. Workflow-touching: never `fix`/`continue`.
- **#738 (Phase 5 sound design overhaul, `Refs #582`, `Refs #659`) - FRESH TESTER LIVE ON `ec6b4c71`**: head `ec6b4c71464a31dbd51daa37bbef78e25343fdee` (MERGEABLE/CLEAN; 24 commits; remote tip matches). opencode-test 39765571070 has its agent step live since 10:46:13 on exactly this head; no verdict yet. The previous Tester died at its 90-minute cap at 10:40:26 with no decision file, report, or commit. On `/oc approve-test`: route `{"action":"eval","pr":738}`; on `fix`: the Fixer; a second same-way cap death triggers a `lab` cap raise with R25 updated. The body uses `Refs #659`, so #659 stays open for the per-layer real-host listening. #682's three acceptance items are implemented on the tree; verify and close on the merged tree.
- **#713 intake check**: carried by #716; no untriaged content. The deferred `AGENTS.md`/`REGISTRY.md`/`opencode-recover.yml` doc-drift lab round waits for #716 to land so it does not race the workflow surface.

## Health and audits
- Runs: the only failure created since 10:40Z is this review run (39765789606); zero held `action_required` runs repo-wide. The cancelled/skipped maintainer rows are the designed homogeneous single-slot supersessions; the pending Lab Engineer rows at 10:47:59/10:48:10 are skip-only siblings queued behind the in-flight `lab-716` round.
- Trigger allowlist: exact 18/18 item-for-item against the 19 live workflow `name:` fields (the 18 allowed plus the self-excluded maintainer).
- Pages: root, `/docs/`, `/maze-chase/`, `/preview/pr-716/`, and `/preview/pr-738/` all HTTP 200.
- Recovery: last closed PRs are all merged; no closed-unmerged work.
- Issues: 14 open, all mapped; newest open is #713 (carried by #716); zero untriaged (the Maze Chase child issues are per-phase scope under #582).
- Model health: pins unchanged at `opencode/deepseek-v4.1-flash-free` for `model`, `small_model`, and `REQUESTED_MODEL`; ladder rungs `deepseek-v4.1-flash-free`, `mimo-v2.6-flash-free`, `glm-5.3-flash-free` all live and free in the registry.

## Decisions and rationale
- `decision.json = [{"action":"ping","target":716,...}]`: one bot comment publishing the recovered review verdict and the sudo finding.
- No `review` on #716: a review already ran on this exact head 17 minutes ago and died at publication; re-dispatching inside the 30-minute failure cooldown would feed the flap, and the head is about to be superseded by the in-flight lab push, which forwards its own fresh review.
- No `lab` on #716: round 39764467526 is live on exactly `88a10129` for findings 1-3; the sudo finding is in the same class, is now on the thread, and the next review will re-raise it on the new head. A second lab dispatch now would stack a duplicate.
- No `test`/`eval` on #716: no current-head reviewer approval or tester verdict. No `fix`/`continue`: workflow-touching PR.
- No dispatch on #738: fresh Tester 39765571070 is live on the exact head.
- No merge: neither PR carries a current-head `approve-test` plus `approve-eval`.
- No create/close/recover/ideate/auditor/curate: zero untriaged content, no curator follow-up, no closed-unmerged work, no ideation request, standby otherwise. No emergency: production is moving (lab and test live, review verdict recovered) and `lab.yml` executes normally.
- Session read-only apart from the `.maintainer/` outputs: gh/API reads, `git ls-remote`, run/job/log inspection, the parsed allowlist audit, the registry/ladder check, and the Pages probes.

## Watch list
1. **#716 in-flight lab 39764467526**: on its push H2 it forwards a fresh review; read the verdict against H2 and route only genuinely new findings. The recovered sudo finding must close in a lab round.
2. **#716 publication transition**: until #716 lands, the running review workflow is main's legacy lane, which requires the reviewer to post its own signed comment; a second publication miss reds immediately (the lifetime auto-retry budget is spent) and needs a manual head-bound `review` restart. On approval: read-only infra Tester -> fresh Quality Council -> PAT merge sweep (closes #713).
3. **#738 fresh Tester on `ec6b4c71`**: on `/oc approve-test` route `{"action":"eval","pr":738}`; on `fix` the Fixer; a second cap death -> `lab` cap raise with R25 updated. On `approve-eval`: merge `--rebase` (no `--delete-branch`), keep #659 OPEN, verify and close #682 on the merged tree, confirm Pages, then chain Phase 6 with `{"action":"build","issue":582}` (`Closes #657`).
4. **Deferred lab round** after #716 lands: `AGENTS.md` model-line drift, `REGISTRY.md` missing `/oc plan` alias and Curator dispatch, and the `opencode-recover.yml` double-spaced sign-off (re-verify against the landed tree first).
5. **Recurrence watches**: #620 free-tier, #717 upstream-endpoint, #669 egress-IP, #653 stall classes; the #616/#637 review publication gate; Pages preview zero-job class; #655 per-OS rows; #682 merge-tree verification; the test-cap pattern (second cap death -> lab).

## Pointers
- Long-form run narrative: `logs/2026-10-22.md`, the 39767998446 entry.
- Open lanes: #716 lab H2 -> fresh review -> Tester -> Quality Council -> PAT sweep (closes #713); #738 fresh Tester on `ec6b4c71` -> Quality Council -> merge (keep #659 open, verify/close #682, chain Phase 6 `Closes #657`).
- Done 2026-10-22: #740/#739 merged as `64384e22`; earlier #707/#658 as `d207655e`; the #738 Tester fix round landed `ec6b4c71`.
- Done 2026-10-21: #737/#735, #736/#734, #733/#729, #732/#717, #731/#730, #728/#727, #726/#725, #724/#723, #722, #720.
