# STATE

Last updated: 2026-11-26T11:35Z by run 45810951935

(11:28Z pull_request closed wake on #854: the merge sweep merged the PR on the rebase path at 11:28:46Z, main advanced e4844201 -> de728de5f, #803 auto-closed, Pages deployed the new main and the root returns 200; this run dispatched #812 to resume the serialized queue and pinged the board. #865's review is live on 818de0af3.)

## TL;DR for the next Hephaestus

- **This was the 11:28Z wake (`45810951935`)** summoned by the #854 pull_request closed event. The merge sweep had already merged the PR; this run verified the merge, the #803 auto-close, and the Pages deploy.
- **#854 is merged and archived:** head `d449afb93` is content-identical to main `de728de5f` (11 rebased commits, empty diff); the branch remains at `d449afb93` for archival. #803 closed at 11:28:48Z. Do not re-open or re-review.
- **#812's lab pass is dispatched in this run** (the serialized queue's next item: the R11 same-name decoy bypass in `.github/scripts/silent-stall-audit.sh` plus the LAB.md fold-in). On its push, a fresh review follows; then test, quality, merge. Its branch starts from main `de728de5f`.
- **#865's review is live** on `818de0af3` (run `45810911108`, started 11:28:35Z). On approval, the test gate; on a test marker, the quality gate; on a head-bound quality approval, verify the merge preflight, confirm the PAT sweep merged on the rebase path, and close #864. The thread's auto-retry budget is spent, so a wall death needs a manual re-arm.
- **#865 base:** GitHub reports CLEAN/MERGEABLE against the current main `de728de5f`; its branch predates the #854 merge but has no conflicts.
- **Next gate order:** #865 review -> test -> quality -> merge and close #864; #812 lab -> review -> test -> quality -> merge; then #814, #849, #857, #856, #860, #773, #774, #742.
- **Main `de728de5f`; `maintainer/logs` tip `58f2c392`.** Models 108/10 free; ladder 3/3 live; allowlist 19/19 + maintainer; board resolves `70`; production 200; preview #854 404 (merged); held 0; the seven stale queued runs unchanged.

## Who I am

Hephaestus, the Maintainer of this repository. I do not write project code; I keep the pipeline full and the gates honest, and I route every change through the lab engineer, reviewer, tester, auditors, curators, and eval. "I'll do it myself" should lose to "route it." I act only when the owner expressly asks or routine triage is due.

## Right now (surveyed 11:29-11:34Z on 2026-11-26)

### GitHub state

- **Main:** `de728de5f9e01c43ae5c2e6fc8ea37914b6412a9` (the #854 rebase merge; the 11 commits `a99dd8b30`..`de728de5f` on top of `e4844201`). **`maintainer/logs` tip:** `58f2c392` (11:28Z publish).
- **#854:** MERGED at 11:28:46Z, 11 commits, 8 files +1332/-77; the tree is content-identical to the reviewed/tested head `d449afb93`; the branch is intact. `closingIssuesReferences` -> #803, closed at 11:28:48Z.
- **Open PRs (2):**
  - #865 `818de0af3b72d044d499594c544b14c06d28f504`, CLEAN/MERGEABLE against `de728de5f`, 2 files +275/-16 (`.github/scripts/silent-stall-audit.sh`, `.github/workflows/maintainer.yml`). The #864 fail-closed comment-poster repair plus the R30 idless/mixed/signed hardening. The body carries the ledger, skills note, sign-off, `Closes #864`, and the stray `Closes #865` footer. Review live on this head; no test/quality marker.
  - #821 `dce109e4479b3cf2801a1b0127ea98778e58c398`, CLEAN, Maze Chase Windows compatibility harness (base `86570af1`); untouched since 2026-11-07.
- **Open issues (23 non-PR):** #42, #70, #582, #655, #657, #659, #661, #677, #678, #683, #742, #773, #774, #792, #812, #814, #831, #836, #849, #856, #857, #860, #864. #70 is the only `lab-health` board; #42 is the only `brainstorm` issue; #864 stays open until #865 merges; #803 is closed.
- **Board invariant holds:** `health-board.sh` resolves `70`; only #70 carries `lab-health` and the exact title `Lab Health & Audit Logs`; #42 is the only other labelled issue (`brainstorm`). Newest board note is the 11:28:28Z merge-ready record; this run's ping adds the post-merge record.
- **Latest comments:** the 11:28:15Z decision note, the 11:28:28Z board note, the 11:28:29Z quality-approval note, and the 11:28:30Z `/oc review (head 818de0af3...)` on #865; no human comment after the trigger; no `/oc fix` anywhere.
- **Branch tips:** main `de728de5f`, `maintainer/logs` `58f2c392`, #854 `d449afb9` (archival), #865 `818de0af3`, #821 `dce109e4`, the landed selector branch `opencode/lab-848-shared-health-board-selector` at `c1040c0c` (intact), the #859 branch `opencode/issue858-curate-umbra-count-copy` at `9b862e48` (never delete). No recovery due.
- **Held runs:** 0. **Queued:** the seven known stale runs (2026-09-25 x3, 2026-10-05 x1, 2026-11-11 x3). **In progress:** this run and the #865 review `45810911108`. **Pending:** none.
- **This run:** `45810951935`, `pull_request` closed on #854, created 11:28:50Z; the trusted pre-agent checkout is main `de728de5f`, but the CLI bootstrap left the session tree on the #854 head `d449afb93` (issue #831 behavior), so trusted facts were read from `origin/main`; session tree clean; no protected-path edits; no model edit; no branch commands; no `emergency.json`.

### Runs, CI and queues

- **#854 merge sweep:** merged at 11:28:46Z on the rebase path (no merge commit, no `--delete-branch`); main advanced; #803 auto-closed at 11:28:48Z.
- **Pages:** the push-triggered deploy `45810951787` was cancelled by the pages concurrency group; the workflow_dispatch deploy `45810953211` completed success at 11:29:28Z for `de728de5f`; production root HTTP 200; preview #854 404 (closed).
- **#865 review `45810911108`:** in progress since 11:28:35Z on `818de0af3` (the 11:19Z session's manual re-arm posted at 11:28:30Z).
- **Maintainer close cohort:** the pull_request close event spawned this run plus a cohort of maintainer `workflow_run` runs that skipped/cancelled as the designed concurrency dedupe; the 11:21Z general false-positive handoff run `45809843977` was cancelled.
- **Failures:** none in the last 100 runs; the only recent failure is the 10:31Z review wall death, already re-armed.
- **Model registry:** 108 / 10 free at 11:31Z; pin and `small_model` `opencode/deepseek-v4.1-flash-free`; the three ladder rungs are live; `maintainer.yml` `REQUESTED_MODEL` is the same free pin. No upgrade.
- **Allowlist:** 19 names on `main` plus the self-excluded maintainer = 20 repo-managed; live 23 = those 20 plus Dependabot Updates, Dependency Graph, and pages-build-deployment (GitHub-managed); zero missing, zero extra.

### Live lanes and their next step

- **#812 (R11 audit bypass):** LAB DISPATCHED in this run. On a push, the workflow forwards a fresh review; then test, quality, merge. The fix: scope the R11 extraction to the unique `lab:` job, pin the linkage-guard ordering, add the decoy and ordering mutants, and fold in the LAB.md correction.
- **#865 / #864 (comment-poster fail-closed):** REVIEW LIVE on `818de0af3`. On approval, the test gate; on a test marker, the quality gate; on a head-bound quality approval, verify the merge preflight, confirm the PAT sweep merged on the rebase path, and close #864. The thread's auto-retry budget is spent, so a wall death needs a manual re-arm after the window. The stray `Closes #865` footer is cosmetic; fix body-only if the review flags it, or fold the linkage-guard fix into the #742 remainder.
- **#803:** CLOSED at 11:28:48Z via the #854 merge. All three slices confirmed by the head-bound verdicts. Do not re-open.
- **#814 (fail-open baseline read):** next after #812; includes the three-site resolver `createdAt` addendum, the deferral page-size wording, and the review/test non-blocking observations.
- **#849 (fail-loud hardening):** after #814.
- **#857 / #856 / #860 (fail-loud backlog):** serialized after #849.
- **#773/#774:** the LAB.md read-only-scope contradiction plus the phantom step reference, and the stale `setup.sh --check` roster; parked as the post-delivery batch.
- **#742 remainder (tracker):** open; the candidate lane for the remaining owner-credential steps and follow-ups, including the lab.yml PR-thread linkage guard.
- **#836 (capacity):** open for the Owner capacity decision. No new lab dispatch beyond #812 and #865; the per-egress-IP wall remains the only fix that ends the recurrence.
- **#821 / #792** (Maze Chase Windows harness): parked. Do not dispatch.
- **Maze Chase standing set:** #582 parent and #655/#657/#659/#661/#677/#678/#683 are slow/frozen; no action unless the Owner asks.
- **Board / health:** #70 is the only board. Every ping ends with the Maintainer sign-off; no inline trigger tokens (#775).

## Concurrency and wall coordination

- One draw per lane; no same-pool burst. #812's lab draw and #865's review are the only live lanes.
- **Cooldowns:** the last lab trigger was 10:06:41Z (on #865), so the #812 trigger is lawful; the last review trigger was 11:28:30Z (on #865), so no review dispatch is lawful until 11:58:30Z; the eval lane is closed on #854.
- **Checkpoint rule:** if a lab head advances with partial commits and a pass dies without signalling review, do NOT dispatch a review on that partial head. Only a `review` signal (or an explicitly complete pass) authorizes the review/test/eval chain.
- **Review retry rule:** the review workflow has its bounded auto-retry chain (the #754/#827 rule), but the #865 thread's lifetime budget is spent, so the next wall death needs a Maintainer re-arm, not an auto-retry. Do not dispatch a duplicate while a review run is live or queued.
- **Test rule:** the #854 test approval is archived with the merge; #865 has no test marker yet.
- **Eval retry rule:** the eval lane has no in-workflow auto-retry chain; if a dispatched eval dies on the wall or crashes without a decision, the next Maintainer wake re-arms exactly one fresh eval on the same head after confirming no live or queued eval.
- Do not dispatch #814/#849/#857/#856/#860/#773/#774/#742 until #812's lane is known (merged or verdict); #865 is the one parallel exception because its R30 region and `maintainer.yml` surface do not overlap #812's R11 region.
- Never merge without a head-fresh test marker and a head-bound quality approval. Workflow-touching PRs merge only through the hardened PAT sweep, never from the agent session.
- Do not mention any agent, workflow, model, harness, or tool by name in a PR comment (the code is the only exception). Board notes stay trigger-token-free.

## Serialized queue (re-post only if the lane did not land, the window demonstrably holds, and no live/queued run exists)

1. **#812:** lab dispatched in this run; on a push, review -> test -> quality -> merge. The R11 scoping fix plus the LAB.md fold-in.
2. **#865:** review live on `818de0af3`; then test, then quality, then merge and close #864. Fix the stray `Closes #865` footer body-only if the review does not flag it.
3. `{"action":"lab","issue":814}`: after #812; fail-closed baseline read in the fix lane, add `createdAt` to all three pre-existing resolver `--json` lists, and update the R32 pins in lockstep.
4. `{"action":"lab","issue":849}`: after #814; on a push, the review/test chain; re-arm its wall-killed trigger.
5. `{"action":"lab","issue":857}`: next in the fail-loud backlog after #849.
6. `{"action":"lab","issue":856}`: after #857.
7. `{"action":"lab","issue":860}`: after #856.
8. `{"action":"lab","issue":773}`: after #860; correct the LAB.md read-only scope claim and the phantom step reference; R1-R37 audit and pins in lockstep.
9. `{"action":"lab","issue":774}`: after #773; extend `setup.sh --check` to the full current roster and workflow set.
10. `{"action":"lab","issue":742}`: candidate after the backlog for the remaining owner-credential steps and follow-ups, including the lab.yml PR-thread linkage guard; the tracker stays open until that work lands.

**Do not** re-post a trigger whose target already has a live or queued run from the last 30 minutes.

## Loose ends

1. #812: lab dispatched in this run; verify the trigger posted, watch the pass, and route its push to review.
2. #865: review live on `818de0af3`; the thread's auto-retry budget is spent, so any wall death needs a manual re-arm.
3. #865's body carries a stray `Closes #865` self-link from the lab workflow's linkage guard on a PR thread; `closingIssuesReferences` lists only #864, so it is cosmetic. Fix body-only after the lab cooldown if the review flags it, or fold the guard fix into the #742 remainder.
4. The lab.yml linkage guard is a real workflow defect: on a PR thread it appends `Closes #<PR>` because the trigger number is the PR. It should skip PR threads or use `Refs`. No new issue under the safety net; fold into the #742 remainder or the next lab round.
5. #803 is closed by the #854 merge; #854's branch is intact at `d449afb93`; main is `de728de5f`.
6. The review approved #854 with no blocking finding and listed five non-blocking observations; the test added six more. Fold them into the queued fix-lane hardening pass.
7. The pre-existing resolver sites (`opencode.yml` baseline/phase resolvers and the review linked-PR resolver) still need the `createdAt`/`--limit 100` corrections; all fold into #814 with the pins.
8. The 15:46Z post failure has its tracking issue (#864) and its repair PR (#865). The poster's success line remains untrusted until #865 merges.
9. #853, #848, #815 and #803 are closed; #864 stays open until #865 merges; #831 is bookkeeping only.
10. Pages: production 200 on `de728de5f`; preview #854 404 (closed); the new main deploy is live.
11. #836 stays open for the Owner capacity decision; no new lab dispatch beyond #812 and #865.
12. Model registry drift: 108 / 10 free at 11:31Z; the ladder is 3/3 on main and all three rungs are live. No lab dispatch.
13. #821 stays parked; the Maze Chase standing set is frozen unless the Owner asks.
14. The seven stale queued runs are unchanged; do not cancel or re-dispatch them.
15. Memory: the 2026-11-25 file carries the 02:36Z session, the three run markers, the 05:01Z, 08:05Z, 10:10Z, 10:56Z, 11:12Z, 12:15Z, 12:46Z, 13:11Z quota marker, 15:46Z, 17:07Z, 17:56Z, 18:22Z, 21:12Z, 21:18Z, 21:32Z and 21:49Z sessions/markers; the 2026-11-26 file carries the 00:03Z session, the 00:44Z intake marker, the 03:38Z session, the 04:08Z intake marker, the 08:01Z session, the 08:36Z session, the 08:57Z quota-intake marker, the 09:00Z session, the 09:45Z intake marker, the 10:06Z session, the 10:24Z session, the 11:19Z session, and this 11:28Z session. Append-only, keep-both.
16. Prompt-contract drift (watch only, no new issue): the `maintainer.yml` OUTPUT CONTRACT action list omits `sweep`, `create_issue`, and `create_pr` while the staged prompt documents them; the workflow handles them. Fold into the next lab round.
17. Auditor doc drift (watch only, no new issue): the two stale `longcat-2.5-free` prompt examples remain; the prompts require a fresh registry query before use. Fold into the next lab round.
18. The merged tree carries the R26 canonical manifest in lockstep with `maintainer.yml`; the next lab pass must regenerate it if it edits that file. #865 updates the R26 pre-handler manifest and the R30 poster block SHA; verify on merge.
19. No `emergency.json`: the maintainer workflow is alive, production is serving, and no failed lab attempt is being bypassed.
20. The general job's contains-based matcher fired again on the 2026-11-26 eval approval report (two false-positive notes, one skipped run, one redundant maintainer handoff); watch item for a future lab round, no new issue.
21. **Resolver addendum:** three pre-existing resolver sites remain on the head, `opencode.yml:839` (the baseline resolver the reviewer cited at `:838` on main), `:1162`, and `:1397`; all sort by `.createdAt` without requesting it. Fold all three plus pins into the #814 fix-lane hardening pass.
22. **Design-lane note:** a manual design trigger placed on a PR thread would day-scope there; the designed issue invocation and the phase-completion forward are unaffected. No action now.
23. **Eval recovery watch:** the #854 lane closed with the merge; the next eval dispatch is for the next findings round (#865 or #812).
24. **Test-lane auto-retry gap:** the test workflow has no in-workflow retry chain (unlike review), so every wall death needs a Maintainer re-arm. The eval lane shares the gap. Watch item for the next lab round; no duplicate issue while #836 is open.
25. **Public-surface self-heal cap:** the cap of 1 worked as designed on the last pool-wide wall; fold into the #836 capacity decision if the recurrence grows.
26. **Quota intake behavior:** the intakes skipped the agent and posted the audit note but chained no fresh test or eval; the heartbeat/schedule/issue wake was the only re-arm. This matches the #820/#836 design for maintainer runs; record for the capacity decision.
27. **Intake memory gap:** several quota-intake publishes appended only their run markers and did not refresh STATE.md. Watch whether future intake publishes do the same.
28. **Wall-duration variance:** the last completed #854 quality draw survived about 63 minutes to a verdict, versus 11.5-44 minutes for the wall-killed draws; the mix of work (subagent calls) may draw from the same per-egress bucket. Record for the #836 capacity decision; do not change the single-draw rule.
29. **Comment-poster lane:** #864's repair (#865) executes the real poster against a mock `gh` and fails closed on an empty/unparseable body or exhausted retries; the R30 fixture now covers the idless, mixed-sticky, and signed-ok cases. The trigger poster's non-fatal error path folds into the next lab round.
30. **#865 review observation 4:** whitespace-only `comment.md`/ping is still skipped without failing, and an unparseable `decision.json` still exits 0 if the main comment posts. Out of #864's scope; an Owner follow-up, no new issue.
31. **This run's comment:** the #854 note records the merge, the #803 close, the deploy, the queue resumption with #812, and the live #865 review; it names no agent/workflow/model, carries no trigger token, and ends with the sign-off.

## Standing rules I operate under

### Safety and autonomy

- Never post issue or PR comments directly; the only public artifacts are the files under `.maintainer/`. Never create an issue or PR, never run git commit/push/branch commands, never touch the brain, never `@copilot`, and never spawn a Copilot review. Never mention an agent, workflow, model, harness, or tool by name in a PR comment (the code is the only exception).
- Protected paths: `.github/workflows/**`, `.github/agents/**`, `opencode.json`, `AGENTS.md`, `LAB.md` (also `.github/scripts/` as touching credential wiring). Changing them requires the full review/test/eval chain and a PAT-backed push. The agent-write App token cannot push workflow files, so expect a public push-rejection on the branch; the lab's hardcoded PAT step performs the actual push.
- Unattended runs: an unattended ownerless PR is not consent. Never merge without a head-fresh test marker and a head-bound quality approval, and never bypass branch protection.
- Emergency revival (`emergency.json`) only when the maintainer workflow itself is dead, no maintainer run is pending, and the recover heartbeat has not restored it. Not applicable in this run.

### Trigger and token discipline

- Use only the agent trigger comment formats; correct token, correct target, own line. Never a freeform issue ask.
- The #775 rule: no inline trigger tokens in board notes, pings, or issue bodies. Trigger comments are the only place a token may appear.
- A ping triggers no workflow run; it is for the record and the humans. One ping per target per run.
- Do not claim a wall or lane is clear until multiple runs actually complete; correct false claims in the same thread first.
- Overlapping Maintainer sessions: before re-arming any lane, read the target threads for triggers newer than the loaded memory and treat them as live. A later session must not duplicate an earlier session's dispatches.

### Review, test, and merge gates

- Ship only on green build + CI, complete test suite with no new failures, behavior evidence, responsive accessibility, unified 8px spacing + iconography, and security.
- A failed build or CI is never acceptable just because it was already failing.
- Verify the CI workflow covers the pushed commit and required checks are green. Never merge with an in-flight required check or while the mergeable flag is `UNKNOWN`.
- Required checks only: deploy, test (ubuntu-latest, windows-latest, macos-latest), e2e.
- Merge preference is squash unless the PR's base branch explicitly requires another strategy; the repo's rebase-merge setting is the exception for this lane. The PAT sweep uses rebase then merge fallback with `--match-head-commit`.
- Delete branches only on merge, and only with explicit `--delete-branch`; the standing rule is never `--delete-branch` for the bot PRs.
- Ambiguous-rest notation: the eval/review agent comments carry a machine-readable decision block; read it before acting.
- Follow-up issues belong to the Owner, not the Maintainer.
- Do not dispatch a new project when all 3 project slots are full; record a wishlist item instead.

### Audit lane rules (current, from #798 and its reviews)

- Drive the pipeline but cap the audit loops: each lane gets at most two rounds per target, and max eight workflow triggers per PR or issue per Maintainer run. Fan out only when a leg is wall- or timeout-bound, the PR is freshly pushed, a gate flipped, a review branch awaits merge, CI healed, the PR is reopened, or a human asks. A wall always wins; no same-IP retry.
- The audit checks run in order: every run first confirms main is deployed and the site is reachable; then current-main issues and every open PR's rollup (missing/unknown checks block a merge); touching any protected path makes the branch lab-owned and requires the tester/evaluator chain; a PR with zero agent comments or all-green state is suspect; every check read must come from the PR's actual head, not the base; mergeable `UNKNOWN` waits for GitHub to resolve it; re-read the head immediately before merging; verify the merge conclusion; never cancel an in-flight required check; never `--admin` merge.
- The audit artifact contract: the payload files are `.maintainer/decision.json`, `comment.md`, `log-entry.md`, `state.md`, `personality.md`; `emergency.json` is revival-only. Write them, then stop.
- Liveness: `Last updated: <ISO8601 with minutes> by run <github.run_id>` exactly. Use `date -u`; a stale stamp must not continue.
- The log is append-only and never partial: carry the FULL day file and append; preserve what you found. The publish step hard-gates the six files, scans for leaked PATs/agent names, and recomposes on a fresh tip with keep-both semantics.
- The brain mounts read-only; edit workflows, not the brain. The anti-race retry re-materializes the brain and reapplies the delta on a fresh tip.
- The owner PAT lives in `.env` and is loaded by the hardcoded `pat-commit` step; never print or reference the value, and keep the `.env` gitignored. Unset PATs in agent shells fail closed (#742/agent-hsp).
- No comments: no maintainer text reaches GitHub except the output artifacts. The publish step posts only `comment.md` on the target PR, plus explicit `ping` targets.
- The pipeline hygiene rules: prompt/state numbers stay allowed; no em dashes in repo files; no trigger tokens in pings.

### Contract and memory

- This run is a `pull_request` closed (merged) triage wake on #854; the public artifact is the #854 comment.
- The contract asks for the six files only, and only the artifacts get committed. The memory commit lands after publication; the output artifacts are pushed as a `chore(memory)` commit.
- Attach everything to `maintainer/logs` (rebase onto fresh `origin/main` if it moved, keep-both resolve); never reset, never force push.
- The memory log entry must include the state snapshot (counts, PR heads, failures, base heads), the decisions and rationale, the callbacks that fired, and the open questions, plus the run link.

### Persistent facts

- Protected infra changes only through the lab lane; the agent-write token cannot push workflow files, the domain PAT can.
- The brain is always mounted read-only; the memory files under `.maintainer/memory/` are the only persistent memory I can edit.
- The maintainer must always post a comment as its comment.md artifact or an explicit ping; a silent maintainer is a failure. This run posts the #854 comment and a #70 ping.
- The pipeline is green on main (`de728de5f`; the new-main Pages deployment is live and the root is 200), and the platform is perf-sensitive: multi-agent is the only way to keep the guards intact.
- Free-model provider walls are per-egress IP and sporadic across runners; the wall killed the lab draws at 16:54:13Z, 23:15:37Z, 03:05:44Z, 05:10:20Z, 11:13:26Z, the eval draws at 13:10:30Z, 21:48:51Z, 00:44:09Z, 04:07:07Z, 08:57:22Z and 09:44:22Z, the test draw at 18:44:57Z, the public-surface draw at 21:17:41Z, the review draw at 10:31:16Z, and the auditor/curator draws at 07:15Z/07:21Z, while fresh runners completed the 12:15Z review, 12:46Z test, 16:00-17:08Z eval, 17:23-17:56Z repair pass, 17:56-18:22Z review, 21:12Z heartbeat, the 21:16-21:32Z test, the 00:03Z/03:38Z/08:01Z/08:36Z/09:00Z/10:06Z/10:24Z/11:19Z sessions, the 07:25Z/08:01Z auditor self-heal, the 08:12-08:53Z repair pass, the 09:29-10:06Z review retry, the 10:06-10:24Z lab pass, and the 10:16-11:19Z quality draw. Elapsed time alone is not proof; the fresh-run lottery is the designed recovery, and a single draw is the window test, never a burst.
- The ladder on `main` is 3/3 (`deepseek-v4.1-flash-free`, `mimo-v2.6-flash-free`, `nemotron-3.5-lightning-free`), and the pin and `small_model` are unchanged.
- Owner's protection contract: never cancel required checks; cancelled runs are not green.

## Next run

1. Watch #812's lab pass. On a push, a fresh review follows; then test, quality, merge. If it dies on the wall, no same-pool retry; re-arm after the window on a later wake.
2. Watch the #865 review on `818de0af3`. On approval, the test gate; on a test marker, the quality gate; on a head-bound quality approval, verify the merge preflight, confirm the PAT sweep merged on the rebase path, and close #864. If the review flags the stray `Closes #865` footer, dispatch a body-only lab pass after the cooldown or fold the linkage-guard fix into the #742 remainder.
3. Verify this run's #812 trigger and #70 board note posted; if not, correct them in the next comment.
4. Then the serialized queue: #814 (with the three-site resolver `createdAt` addendum, the deferral page-size wording, and the review/test non-blocking observations), #849, #857, #856, #860, #773, #774, then #742's remainder with the lab.yml PR-thread linkage-guard fix.
5. Keep #836 open for the Owner capacity decision; #831 is bookkeeping only; #848, #853, #815 and #803 are closed; #821 stays parked.
6. Verify the board invariant, allowlist, registry/ladder, live site, held runs, and schedule health; if clean, stand by.

## Open questions

1. Will the #812 lab pass land the R11 scoping fix without a wall death, and will its decoy/ordering mutants prove the pin load-bearing?
2. Will the #865 review approve `818de0af3`, or return findings on the R30 fixture or the stray `Closes #865` footer?
3. Will #812 and #865 merge without a rebase conflict on `.github/scripts/silent-stall-audit.sh` (the R11 and R30 regions are disjoint, and GitHub reports #865 CLEAN/MERGEABLE against the new main)?
4. Does the #854 merge close #803 for good, or will a later regression re-open the incident-scope class?
5. Should the eval/test lanes get a bounded in-workflow retry like review, or stay next-wake re-armed? Known gap; fold into the next lab round or #836.
6. Does the public-surface self-heal cap of 1 remain the right bound after a pool-wide wall? Watch item; no duplicate issue while #836 is open.
7. Should the general workflow's contains-based matcher be fixed in the next lab round? It fired again on the eval approval report and spawned a redundant maintainer handoff.
8. Should #773/#774 stay as separate lab targets, or be folded into the #742 remainder when the backlog clears?
