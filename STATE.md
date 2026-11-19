# STATE

Last updated: 2026-11-19T13:02Z by run 44527997595

(This was a global `workflow_dispatch` run at 12:52:50Z with an empty event payload, one of two dispatched 28 seconds apart; run 44528070035 is the pending single-slot follow-up. The headline is that the owner PAT is BACK: the approved `opencode-pr-trigger` run posted `/oc maintainer` as the owner at 12:54:10Z, all nine held runs were approved and completed green by 12:55:28Z, and Pages redeployed at 12:55:30Z. The 10:45Z run's 29th batch had still 401ed all six posts at 10:55:51Z, so the secret was restored between 10:55Z and 12:54Z. This run posts the 30th batch and updates #855.)

## TL;DR for the next Hephaestus

- **The owner-token incident is resolving, verification pending.** First successful owner-PAT post since 2026-11-15T07:38:13Z landed at **12:54:10Z** (opencode-pr-trigger `/oc maintainer` on #862), then #859 at 12:55:22Z and #854 at 12:55:26Z. The 29th Maintainer batch had 401ed at 10:55:51Z.
- **All nine held runs are cleared:** the #803, #858, and #862 branch runs were approved and completed success between 12:53:56Z and 12:55:28Z; production Pages redeployed successfully at 12:55:30Z.
- **All four live PRs are now CLEAN/MERGEABLE:** #862 (`fe190ad0e`), #859 (`d72d7ac9`), #854 (`090452f27`), #850 (`9c9bf1bd7`); #745 remains DIRTY; #821 is parked.
- **This run posts the 30th batch:** review #862, #859, #850; lab #854 (full round-1 findings), lab #745 (rebase), lab #836 (ladder rung). Plus #70 ledger and #855 incident pings.
- **Three concurrent per-PR Maintainer runs are in progress** (`44528214502` #862, `44528405829` #859, `44528414321` #854), summoned by the PAT posts; they may duplicate some trigger targets. The next run must verify what actually landed and must NOT blindly re-post.
- **Start the next session by reading this run's `Run /oc triggers as owner` step** (30th batch). If it landed, work the reviews/labs; if it 401ed again, the restoration evidence is wrong and the incident continues.
- Model registry unchanged: 92 models / 12 free; `glm-5.3-flash-free` still absent, so ladder rung 3 is dead and #836 stays queued. Pin and rung 2 are live.

## Who I am

Hephaestus, the Maintainer of this repository. I do not write project code; I keep the pipeline full and the gates honest, and I route every change through the Lab Engineer, reviewer, tester, auditors, curators, and eval. "I'll do it myself" should lose to "route it." I act only when the owner expressly asks or routine triage is due. I use subagents for parallel read-only investigation only when it materially saves time, and the capped 3-8-line delegation ledger is mandatory where required.

## Right now (surveyed 12:53-13:00Z on 2026-11-19)

### GitHub state

- **Main:** `e5cd250c126efa8c86a084b3d72ade3bcf9bdc5b` ("curate: sync Maze Chase release status and correct the Pac-Man retirement claim", Fixes #851; 2026-11-15T06:31:53Z). **`maintainer/logs`:** `837b7dffaf08e46108714adc7cd371bc3d32d62b`, the 10:55Z memory update from run 44508670731.
- **Open PRs (6):** #862 head `fe190ad0ea200725d460273d83720d84e9a451ad`, body `Fixes #861`, two copy-only HTML files, now CLEAN/MERGEABLE, 2 comments (owner `/oc maintainer` 12:54:10Z, preview 12:54:18Z), 0 reviews; #859 head `d72d7ac9aa5d08f9c4d35c1dfc1e63cb116571a4`, body `Fixes #858`, CLEAN, 3 comments (18:26:12Z handoff, 00:07:31Z fresh audit, owner `/oc maintainer` 12:55:22Z), 0 reviews; #854 head `090452f27c575a31e617bc5c7083c6ee441b0653`, body `Closes #803`, 6 protected-path files, CLEAN, 4 comments (round-1 verdict 08:19Z, owner `/oc maintainer` 12:55:26Z, preview), 0 reviews; #850 head `9c9bf1bd72fb459388d2985656f6f61735147105`, body `Closes #848`, CLEAN, 49 comments, 0 reviews; #821 head `dce109e4479b3cf2801a1b0127ea98778e58c398`, CLEAN, parked Point of Sale PR; #745 head `7a04fa4a96e1982ac307ca40973fed29379def0b`, CONFLICTING/DIRTY (5 ahead / 375 behind main), 67 comments, 0 reviews. No head moved today.
- **Open issues (29 non-PR):** #42, #70, #582, #655, #657, #659, #661, #677, #678, #683, #742, #773, #774, #792, #803, #812, #814, #815, #831, #836, #848, #849, #853, #855, #856, #857, #858, #860, #861. No untriaged issue: #860 was triaged at 10:55:49Z, #861 is covered by PR #862, #858 by #859. #659/#677/#678 are the known frozen Maze Chase set under #582.
- **Board invariant holds:** only #70 carries `lab-health` among open issues and only #70 has the exact title `Lab Health & Audit Logs`; #42 is the only other labelled issue (`brainstorm`). #855/#856/#857/#858/#860/#861 deliberately stay unlabelled.
- **Latest comments:** this run's two pings (#70, #855) will be newest; before them the 10:55:50Z #70 note, the 10:55:49Z #860 triage, and the 12:54-12:55Z owner `/oc maintainer` posts from opencode-pr-trigger plus preview comments.
- **Branch tips:** `git ls-remote` confirms main `e5cd250c` and `maintainer/logs` `837b7dff`; no new project branch and no recovery due (newest closed PR is #852, merged 11-15).

### The owner-token restoration (new, decisive)

- **First successful owner-PAT use since 2026-11-15T07:38:13Z:** `opencode-pr-trigger` run `44480682663` (the 07:34Z held run, approved at ~12:53:50Z) posted `/oc maintainer` on #862 at 12:54:10Z with `GH_TOKEN: secrets.OPENCODE_PAT`; its step completed success at 12:54:12Z. The same workflow then posted #859 at 12:55:22Z (`44121917992` approved) and #854 at 12:55:26Z (`43690826057` approved).
- **The 29th batch is the last known 401:** run `44508670731`'s trigger step failed all six posts at 10:55:51Z (`gh: Bad credentials (HTTP 401)`): lab #854, lab #745, review #850, review #859, review #862, lab #836. Therefore the secret was refreshed between 10:55:51Z and 12:54:10Z.
- **All nine held runs cleared:** `43690826057/43690826207/43690826030` (#803 branch), `44121917992/44121917590/44121918001` (#858 branch), and `44480682663/44480682570/44480682694` (#862 branch) all completed success between 12:53:56Z and 12:55:28Z. The `Deploy static site to GitHub Pages` dispatch `44528416059` also succeeded at 12:55:30Z.
- **Previews:** https://userfrom1995.github.io/RandomLabs/preview/pr-854/, /pr-859/, /pr-862/ all return 200; production root returns 200.
- **This run's 30th batch** is the Maintainer-side confirmation. If it lands, close #855 next run and update #70 with the resolution; if it 401s, the incident persists and the restoration evidence was external-only.

### Runs, CI and queues

- **This run:** `44527997595`, `workflow_dispatch` (empty payload), started 12:52:50Z on `main` `e5cd250c`; agent step started 12:53:07Z. A second global dispatch `44528070035` (12:53:18Z) is pending behind this run in the `maintainer-global` single-slot group.
- **Concurrent per-PR Maintainer runs (all in progress at survey close):** `44528214502` for #862 (12:54:13Z), `44528405829` for #859 (12:55:26Z), `44528414321` for #854 (12:55:29Z), each summoned by the PAT `/oc maintainer` posts. They survey the same state and may post overlapping reviews/lab triggers; the next run must not treat duplicates as new work.
- **Held runs:** none. The nine former `action_required` runs are all green now.
- **Queued runs:** the same inert historical entries on long-dead branches; no new queued trigger.
- **Failures:** none failure/timed_out/startup_failure in the recent window. Non-green entries are skipped/cancelled Maintainer fan-outs from the run approvals, expected by design.
- **Pages:** production deployment at 12:55:30Z succeeded; root and all three PR previews return 200.
- **Model registry:** **92 models, 12 free** at 12:57Z (`beam-free`, `deepseek-v4.1-flash-free`, `flint-40b-free`, `hy4-flash-free`, `iceman-free`, `inkling-2-small-free`, `jev-1.13-free`, `longcat-2.5-free`, `mimo-v2.6-flash-free`, `nemotron-3.5-lightning-free`, `nemotron-3.5-super-vl-free`, `tidepool-alpha-free`). `glm-5.3-flash-free` remains absent, so ladder rung 3 is dead; `opencode.json` pins `opencode/deepseek-v4.1-flash-free` for model and small model, rung 2 `mimo-v2.6-flash-free` is live, so the ladder is 2/3.
- **Allowlist:** `maintainer.yml:42` lists 19 workflows; 23 live `name:` fields include the 3 GitHub-managed ones (`Dependabot Updates`, `Dependency Graph`, `pages-build-deployment`), leaving the 19 allowlist entries plus the self-excluded `maintainer`. Zero missing, zero extra.
- **Workspace note:** checkout is the trusted default-branch commit (main `e5cd250c`), working tree clean at start. No protected-path edits, no model edit, no branch commands, no `emergency.json`.

### PR #862 / issue #861 (Curator lane, live)

- **#862:** "curate: qualify the Netpulse upload claim and sync the Maze Chase theme label", head `fe190ad0e`, body `Fixes #861`, branch `opencode/issue861-curate-netpulse-theme-copy`, two public-surface files only (1+/1- each). Non-protected paths; normal review -> test -> eval -> PAT merge chain. The owner `/oc maintainer` at 12:54:10Z summoned run `44528214502`; this run also posts a head-bound review as the 30th batch.
- **On merge:** #861 closes via `Fixes #861`; not a new project, so the daily shipping limit does not apply. Do not merge on the reviewer verdict alone.

### PR #859 / issue #858 (Curator lane, live)

- **#859:** "curate: refresh Umbra test count and fix Hearthlight noscript copy", head `d72d7ac9`, body `Fixes #858`, branch `opencode/issue858-curate-umbra-count-copy`, two public-surface files only. The 00:07:31Z fresh curator audit confirms both defects still exist on main. The owner `/oc maintainer` at 12:55:22Z summoned run `44528405829`; this run also posts a head-bound review.
- **On merge:** #858 closes via `Fixes #858`; not a new project.

### PR #854 / issue #803 (protected-path lab lane, live)

- **#854:** slice 3 plus hardening; head `090452f27`, branch `opencode/issue803-20261115060707`, 6 protected-path files, body still `Closes #803`. The round-1 report is lost from the PR but preserved in this memory; the lab instruction carries the full B1-B3/H1-H5 list and the `Closes #803`/`Refs #853` condition.
- **The owner `/oc maintainer` at 12:55:26Z summoned run `44528414321`; this run also posts the lab instruction.** On a lab push: the lab workflow forwards one fresh review; verify each finding explicitly before test/eval. Do not merge or close #803 until all three slices land. `health-board.sh` is still absent on main `e5cd250c`.

### PR #850 / issue #848 (protected-path lab lane, live)

- **#850:** "lab: unify the Lab Health board selector and anchor trusted reads", head `9c9bf1bd7`, body `Closes #848`, CLEAN. One fresh head-bound review is posted this run. When it lands: dispatch `lab` on #849, then #857, then #856, then #860, one branch at a time on the shared audit surface. Fix the `Closes #848` trailer at merge.

### PR #745 (orphaned audit/rebuild, live)

- Head `7a04fa4a`, branch `opencode/lab-742-owner-pat-env-sanitization`, CONFLICTING/DIRTY (5 ahead / 375 behind main). One `lab` rebase retry is posted with `Refs #853`, no `Closes` trailer, and a post-push `git ls-remote` verification. Keep #853 open until the verdict.

### Issue #836 (model/wall capacity umbrella)

- Ladder rung 3 `opencode/glm-5.3-flash-free` is retired; one `lab` item is posted to replace it with a live free rung, plus the stale glm prompt examples and the `maintainer.yml:581` action-list omission. No production impact while the pin and rung 2 are live. Not an emergency.

### Issues #855/#856/#857/#860 (owner-PAT family)

- **#855:** incident tracker. A resolution update is posted this run (first successful PAT post at 12:54:10Z; the 30th batch is the confirmation). Close it next run after the 30th batch and the trigger outcomes are verified.
- **#856:** `approve-held-runs.sh` fail-open on unreadable reads (repo-wide sweep plus phase-1 `PR #862 gone`). Scope unchanged; work order serialized behind #854/#850.
- **#857:** Auditor/Curator decision-forward fail-open. Scope unchanged; work order serialized behind #854/#850.
- **#860:** review-lane unreadable state treated as closed. Triaged at 10:55:49Z; lab branch after the live #854/#850 lanes clear.
- Do not dispatch #849/#856/#857/#860 yet: they share `opencode-review.yml`/`curator.yml`/`silent-stall-audit.sh` with the live lanes, and one branch at a time is the rule.

## Live lanes and their next step

- **#862** (Curator public-surface fix, `Fixes #861`): head-bound review queued on `fe190ad0e` (30th batch) plus the per-PR Maintainer run. On a clean review: `test` (then `eval` in a later run), then the PAT merge sweep; #861 closes only on merge.
- **#859** (Curator public-surface fix, `Fixes #858`): head-bound review queued on `d72d7ac9` plus the per-PR Maintainer run. Same normal sequence; #858 closes only on merge.
- **#854** (protected-path slice 3 + hardening): lab instruction queued (30th batch) plus the per-PR Maintainer run. On push: watch the forwarded review, verify B1-B3/H1-H5 and the `Refs #853`/`Closes #803` rewrite.
- **#850** (owner-PAT pager hardening, `Closes #848`): head-bound review queued on `9c9bf1bd7`. When it lands: `lab` on #849, then #857, then #856, then #860, one branch at a time.
- **#836** (model/wall capacity): lab item queued to replace rung 3. After a push: verify the replacement is live and free and the ladder has three live rungs; then the normal protected-path review and PAT merge sweep.
- **#745** (orphaned #798 audit/rebuild): lab rebase queued. After a push: verify with `git ls-remote`, dispatch one fresh review, keep #853 open; delete the older bot review on the exact commit id if it is still present.
- **#821 / #823** (Point of Sale staging, live on Pages): parked by Priya. Do not dispatch.
- **Open infra/audit backlog (serialized behind the live lanes):** #803 closes with #854; #853 after #745's verdict; #849/#857/#856/#860 after #850; #848 via #850; then #814, #812, #815, #774/#773, #831, #742. No new site project is open; do not invent one.
- **Maze Chase standing set:** #582 parent and #655/#657/#659/#661/#677/#678/#683 are slow/frozen; no action unless the Owner asks.
- **Board / health:** #70 is the only board. Every ping ends with the Maintainer sign-off; no inline trigger tokens anywhere (#775).
- **Eval lane:** route new multi-agent architecture to `eval` only when the Owner asks; no paid runs.

## Concurrent-run coordination (new, important)

- At survey close there are **four live Maintainer runs**: this global run `44527997595`, the per-PR runs `44528214502` (#862), `44528405829` (#859), `44528414321` (#854), and the pending global `44528070035`.
- This run posts the full queue to unblock all lanes now. The per-PR runs may post the same reviews/lab for their own target; treat a duplicated `/oc review (head X)` or `/oc lab` on the same PR as a concurrency artifact, not new work.
- Next run: read the actual comments and workflow runs first. Do NOT re-post a review whose head already carries a `/oc review (head X)` from today, and do not post a second lab trigger on a PR that already has a live/queued lab run.
- Memory publishes are keep-both/recomposed on a fresh tip; no memory entry may be deleted.

## Serialized queue (re-post these only if they did not land)

1. `{"action":"review","pr":862,"head":"fe190ad0ea200725d460273d83720d84e9a451ad"}` - posted this run.
2. `{"action":"review","pr":859,"head":"d72d7ac9aa5d08f9c4d35c1dfc1e63cb116571a4"}` - posted this run.
3. `{"action":"review","pr":850,"head":"9c9bf1bd72fb459388d2985656f6f61735147105"}` - posted this run.
4. `{"action":"lab","pr":854,"instruction":"<the round-1 review findings in this log>"}` - posted this run.
5. `{"action":"lab","pr":745,"instruction":"<rebase onto e5cd250c, Refs #853, verify with git ls-remote>"}` - posted this run.
6. `{"action":"lab","issue":836,"instruction":"<replace the retired glm-5.3 rung with a live free model, keep all rungs -free, do not change the pin>"}` - posted this run.
7. **Do not duplicate the #855/#856/#857 pings** unless a material change occurs; #855 has this run's resolution update, #70 has the ledger note.
8. After #850's verdict: `lab` on #849, then #857, then #856, then #860; after #850's merge: #804 residuals, docs gaps, #814; after #862's review: `test` then `eval`; after #859's review: `test` then `eval`; after #836's ladder push: verify three live free rungs; after #745's push: verify `git ls-remote` and dispatch one review.

**Do not** re-post a trigger whose target already has a live or queued run from the last 30 minutes, and do not post two lab triggers to the same PR in one run (the workflow dedupes by `(action, target)`).

## Loose ends

1. **Verify the 30th batch first.** This run's trigger step is the Maintainer-side confirmation of the PAT restoration. If it landed, the incident is resolved (close #855 next run). If it 401ed, the external PAT posts were a fluke and the queue stays.
2. **Nine held runs are cleared** (`43690826057`, `43690826207`, `43690826030`, `44121917992`, `44121917590`, `44121918001`, `44480682663`, `44480682570`, `44480682694`); do not post another approve sweep for them.
3. **Duplicate-watch:** the three per-PR Maintainer runs may add their own triggers on #862/#859/#854. Verify comments/run queues before any re-post.
4. **The 08:19 #854 report** is lost from the PR but preserved in memory; the lab instruction carries it.
5. **#745 stale bot review:** after the fix-up, delete the older bot review on the exact commit id if it is still present; filter by `commit_id`, not just author.
6. **#850's body** has `Closes #848`; normalize at merge, do not add a second trailer.
7. **#853's body chronology** needs one prepended "Update: ..." sentence once #745 lands.
8. **#849 scope mismatch:** its premise quotes the old body text; the expanded scope lives in #850's body. When #850 lands, add the expansion to #849's body first. #856/#857/#860 are separate siblings.
9. **The `INFRA-STATUS` block on #70** is stale (10-21) but still factually fine for #70. If a real infra change happens, refresh it in the same post.
10. **No merge this run:** no PR carries the full head-fresh Tester plus Evaluator chain.
11. **Curator tick:** the next 6h tick is due ~13:11Z; do not dispatch a manual curator run unless it crashes or the gap passes ~16h.
12. **Auditor schedule:** the next daily tick is expected ~06:00Z tomorrow. No dispatch.
13. **Quota wall:** no wall death today. Do not dispatch a same-IP agent for a wall failure; one fresh-run attempt is the cap (#820/#836).
14. **Heartbeat:** this is not a heartbeat run. The recover arm's last tick was 10:45Z; the next is expected ~18:4xZ. Keep the exact `Last updated:` stamp.
15. **Model registry drift:** 92 models / 12 free; `glm-5.3-flash-free` retired and rung 3 is dead; `jev-1.13-free` is live. #836 is the fix lane.
16. **The ladder is 2/3 until #836 lands:** no production impact while the pin and rung 2 are live.
17. **Stale prompt examples:** `maintainer.md:333` and `labengineer.md:78` still list the retired glm id, and `maintainer.yml:581` omits design-ux/visual/motion; folded into the #836 lab instruction.
18. **Maintainer cron throttling:** the 20-minute schedule has large gaps; the recover heartbeat and manual dispatches are the liveness paths (#836/#831).

## Standing rules I operate under

### Safety and autonomy

- Never post `/oc` comments by hand, never create/edit labels, issues, PRs, or branches, never commit, push, or force-push feature code. Only the hardcoded workflow steps act, under the owner PAT and the budget gates. Merging an approved PR is my job, but only after the full gate chain below.
- Never edit code on `main`. Only protected-path edits would be rebuilt under the emergency revival contract; none is warranted. The only branch/PR action I may take is the governed `recover` route, and only when a recoverable PR is closed or orphaned.
- No `ftr`/sweep PRs, no unconditional re-scans: an empty queue and "standby" are the correct answer when nothing new is due.
- Do not re-dispatch a model/agent evals run; route tuning to `eval` only when the Owner asks.
- All work goes through the decision file; one entry max per action per target per run; distinct actions may target the same PR in one run.

### Trigger and token discipline

- The workflow posts triggers from the decision file as the owner only in the "Run /oc triggers as owner" hardcoded step. My decision entries are inert data; I never author a trigger comment during the session.
- Pings and the public comment are posted by the bot token. All public text must be honest, specific, and signed with `- Hephaestus, the Maintainer`.
- Escape hatch: "if the token is dead, the queue is the test; do not attempt credential workarounds." Do not restate the incident on every issue; keep the detailed incident on #855/#70 and the log.
- Never include a trigger token in a ping body (#775). The memory branch and the log may quote decisions, but public pings must not carry `eval-verdict:` markers or `/oc` tokens.
- The trigger step's 401s are annotations only and the approve sweep fails open on the same 401; a green Maintainer run is not evidence that the queue landed. #856/#857/#860 are the fix work orders.

### Review, test, and merge gates

- The reviewer verdict is advisory and does not itself authorize a merge. Merge only when the Tester's owner-authored `/oc approve-test` is head-fresh, no newer `/oc fix` findings exist, and the Evaluator's head-bound `approve-eval` is on the PR. Protected-path PRs merge only through the workflow's PAT merge step.
- Required gate sequence after a successful review on a non-protected PR: `test` (OS chosen by the touched paths) THEN `{"action":"eval"}` THEN a PAT sweep, then the bot verification. Never post a `test` trigger before the review verdict is on the PR, and never post a test/eval pair on the same PR in one run.
- Protected paths (`.github/workflows/**`, `.github/agents/**`, `opencode.json`, `AGENTS.md`, `LAB.md`) require the Lab Engineer route; the Maintainer's PAT step may push only under a valid emergency declaration.
- A green audit is not a merge approval. Deploy keys, workflow names, and mutable actions are pinned and trusted at the default branch; the Tester/PAT gates enforce.

### Audit lane rules (current, from #798 and its reviews)

- `silent-stall-audit.sh` is the mutation harness; R19/R20/R21/R23/R28/R30/R32/R36 are part of the shell parser/classifier guard story. A full run is ~10 minutes; do not accept a partial "fast" run when a real change needs the full harness.
- Every incident-scope counter must capture the payload first, never `|| true` after the pipeline, and must treat an unreadable head/enumeration as fail-closed (the #854 review B2/B3 classes; the #856 phase-1/#860 review-lane instances are the same rule). The leak guard and the PAT redaction work is the #798 family; the new code must not regress it.
- The delegation ledger is capped at 3-8 lines; it must list the subagents actually used, one line each, plus a skills line. Do not claim delegation that did not happen.
- The reviewer rejects fixes that claim fail-closed while keeping a silent fallback; the docs must state the exact boundary.
- No em dashes in repo files; no direct workflow edits outside a `lab` route.

### Contract and memory

- Output contract each run: `.maintainer/decision.json` (array), `.maintainer/comment.md` (empty unless a target exists), `.maintainer/log-entry.md` (FULL day file: existing bytes + today's entry), `.maintainer/state.md` (this file), `.maintainer/personality.md` only if identity evolved, `.maintainer/emergency.json` only under the failed-lab + halted-production contract.
- The log is append-only; the 2026-11-16 day file closed at 516 lines, the 2026-11-17 at 526, the 2026-11-18 at 718, and the 2026-11-19 file now carries the 02:39, 04:29, 10:45, and 13:00 entries. The publish step isolates the delta against the materialized baseline and recomposes on a fresh tip with keep-both semantics. Never write a partial day file.
- The log entry must include the state snapshot, decisions + rationale, callbacks, the run link, and open questions. The state must stay honest about what is verified vs expected.
- The memory branch is shared tooling; do not delete or rewrite prior entries.

### Persistent facts

- Main is a single fast-forwardable history; the repo pushes are the owner PAT's job; the orphan guard must never rewrite main.
- The board is #70; its exact title is the resolver anchor; the `lab-health` label is exclusive among open issues. #855 is the incident tracker, not a board.
- The recover arm is the heartbeat source; the maintainer cron is throttled. A stale STATE stamp is the wake signal; a skipped fan-out is not a real session; every real session must carry the exact liveness stamp.
- The free-usage wall is a real class (47m35s queue death on 07:03:41Z on 11-15; the 08:55:40Z death on 11-17); one fresh-run attempt is the only re-dispatch, and a same-IP retry must not be dispatched.
- The owner PAT is shared by the maintainer, review, curator, recover, auditor, and lab forward/push steps; the 2026-11-15 to 2026-11-19 outage was one invalid secret. Do not confuse it with the bot token.
- The model ladder must have three live `-free` rungs; a retired rung is a routine `lab` item, not an emergency.

## Next run

1. Read this run's (`44527997595`) `Run /oc triggers as owner` step and the three per-PR Maintainer runs' comments. If the six posts landed, do not re-post; work the reviews (#862, #859, #850), the lab passes (#854, #745, #836), and the forwarded review after #854 pushes. If they 401ed (30th batch), the restoration was external-only; re-record and stand by.
2. If the 30th batch landed: close #855 with the resolution, post one #70 closure note only if it adds new facts, and update #856/#857/#860 triage comments to note the credential is no longer the blocker (their code defects remain).
3. If #862's or #859's review starts: on approval dispatch `test` (then `eval` in a later run), then the PAT merge sweep; #861/#858 close only on merge. Never merge on the reviewer verdict alone.
4. If #854's lab pass pushed: watch the forwarded review; verify B1-B3/H1-H5 and the `Refs #853`/`Closes #803` rewrite.
5. If #850's review is live/queued, do not post another; when it completes, route `lab` on #849, then #857, then #856, then #860, one branch at a time. Verify the `Closes #848` trailer.
6. If #836's ladder pass pushed: verify the replacement rung is live and free and the ladder has three live rungs; then the normal protected-path review and PAT merge sweep.
7. If #745's retry pushed, verify with `git ls-remote`, dispatch the fresh review, keep #853 open.
8. Verify the board invariant, allowlist count, model registry/ladder, Pages, and curator/auditor schedule health; if clean, stand by. Do not invent work and do not duplicate the #855/#856/#857 pings.
9. If a new real failure appears, check for a wall/401 before routing; both are known classes.

## Open questions

1. Did this run's 30th batch land? (Six posts: review #862/#859/#850, lab #854/#745/#836; unknown until the trigger step runs after the agent.)
2. Did the secret change between 10:55:51Z and 12:54:10Z, and was the Owner also the one who approved the nine held runs at ~12:53:50Z? The evidence says yes; the next batch confirms it.
3. How many duplicate triggers did the three per-PR Maintainer runs post, and did the opencode-review/lab concurrency absorb them cleanly?
4. Will #862 and #859 pass review untouched as copy-only fixes, or will the reviewer require docs/release-note sync?
5. Should #860, #856, and #857 be one consolidated fail-loud owner-PAT change or separate sequential lab branches once #854/#850 lands? (Current plan: separate scopes, one branch at a time.)
6. Will the #854 lab pass fit one round, or will the mutation harness plus the three fail-closed classes need a second?
7. Does the #745 branch still merge cleanly onto `e5cd250c`, and is its scope still distinct from #804?
8. Which free model should become ladder rung 3: `nemotron-3.5-lightning-free`, `beam-free`, `jev-1.13-free`, `longcat-2.5-free` (1M context), or `tidepool-alpha-free`? The lab pass will verify the chosen one against the live registry.
