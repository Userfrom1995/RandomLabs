# STATE

Last updated: 2026-11-19T13:02Z by run 44528214502

(This was an `issue_comment` wake: the Owner posted `/oc maintainer` on PR #862 at 12:54:10Z. The Owner re-engaged at 12:52-12:55Z after the 10:45 run's trigger step 401ed all six posts at 10:55:51Z (twenty-ninth batch): two manual maintainer dispatches, `/oc maintainer` on #862/#859/#854 in sequence, and manual release of the held #862 and #858 branch runs (all completed green; previews deployed; all three PRs now CLEAN). Five maintainer sessions are running in parallel (two global dispatches, three per-PR comment wakes). This run scopes itself to its target: one head-bound review on #862 plus one #70 ledger note, leaving #859/#854 and the global queue to the sibling sessions to avoid a five-way trigger stampede. Main is `e5cd250c`; `maintainer/logs` is `837b7dffa`; one held run remains; the board invariant and allowlist hold; no emergency declaration exists or is warranted.)

## TL;DR for the next Hephaestus

- The Owner is active again. Since 12:52Z they dispatched maintainer twice and summoned it on #862, #859, and #854; they also released the held CI runs on the #858 and #862 branches. All three PRs are now CLEAN/MERGEABLE with live previews.
- The 10:45 heartbeat run's trigger step 401ed all six posts at 10:55:51Z (twenty-ninth consecutive batch). Last confirmed owner-PAT success remains 2026-11-15T07:38:09Z. The next trigger step (this run and the four siblings) is the thirtieth live credential test.
- Five maintainer sessions are in flight at once: `44527997595` (manual dispatch, in progress), `44528070035` (manual dispatch, pending), `44528214502` (this run, #862), `44528405829` (#854), `44528414321` (#859). Each writes its own decision list and posts its own triggers.
- This run's decision list is only `review #862 head fe190ad0e` plus one #70 ledger note. The sibling runs own #859 and #854; the two global dispatches own the standing queue (#850 review, #745 lab, #836 lab). If a sibling dies, the next wake re-posts its item from this file.
- **Start the next session by reading the trigger steps of the five runs above.** If the 30th batch landed, work the lanes; if it 401ed, the queue stays here and on #855.
- One held run remains: `43690826030` (maintainer on `opencode/issue803-20261115060707`). Only an owner-PAT approve sweep clears it.

## Who I am

Hephaestus, the Maintainer of this repository. I do not write project code; I keep the pipeline full and the gates honest, and I route every change through the Lab Engineer, reviewer, tester, auditors, curators, and eval. "I'll do it myself" should lose to "route it." I act only when the owner expressly asks or routine triage is due. I use subagents for parallel read-only investigation only when it materially saves time, and the capped 3-8-line delegation ledger is mandatory where required.

## Right now (surveyed 12:55-13:00Z on 2026-11-19)

### GitHub state

- **Main:** `e5cd250c126efa8c86a084b3d72ade3bcf9bdc5b` ("curate: sync Maze Chase release status and correct the Pac-Man retirement claim", Fixes #851; 2026-11-15T06:31:53Z), atop `620bb8d2e` (the #798 lab merge). **`maintainer/logs`:** `837b7dffa` ("maintainer: memory update 2026-11-19T10:55Z", 10:55:46Z), the 10:45 run's memory commit; below it `159ea2fa5` (04:34:54Z) and `fb196c667` (02:47:40Z).
- **Open PRs (6):** **#862** head `fe190ad0ea200725d460273d83720d84e9a451ad`, branch `opencode/issue861-curate-netpulse-theme-copy`, body `Fixes #861`, files `maze-chase/index.html` and `netpulse/index.html` (1+/1- each), now **CLEAN/MERGEABLE**, 2 comments (the Owner's 12:54:10Z `/oc maintainer` and the 12:54:18Z preview), 0 reviews; **#859** head `d72d7ac9aa5d08f9c4d35c1dfc1e63cb116571a4`, body `Fixes #858`, now **CLEAN/MERGEABLE**, 4 comments (handoff, 00:07:31Z curator audit, Owner's 12:55:22Z `/oc maintainer`, 12:55:25Z preview), 0 reviews; **#854** head `090452f27c575a31e617bc5c7083c6ee441b0653`, body `Closes #803`, 6 protected-path files, now **CLEAN/MERGEABLE**, 5 comments (the 08:19Z review handoff, the 14:18:35Z round-1 verdict, the Owner's 12:55:26Z `/oc maintainer`, 12:55:28Z preview), 0 reviews; **#850** head `9c9bf1bd72fb459388d2985656f6f61735147105`, CLEAN/MERGEABLE, body `Closes #848`, 49 comments, 0 reviews; **#821** head `dce109e4479b3cf2801a1b0127ea98778e58c398`, CLEAN, parked since 2026-11-07, 50 comments; **#745** head `7a04fa4a96e1982ac307ca40973fed29379def0b`, branch `opencode/lab-742-owner-pat-env-sanitization`, CONFLICTING/DIRTY (5 ahead / 375 behind main), no `Closes` trailer, 67 comments, 0 reviews. No PR head moved since 10:55.
- **Open issues (29 non-PR):** #42, #70, #582, #655, #657, #659, #661, #677, #678, #683, #742, #773, #774, #792, #803, #812, #814, #815, #831, #836, #848, #849, #853, #855, #856, #857, #858, #860, and #861. No new issue since #861 (07:34:11Z). No untriaged issue remains; #659/#677/#678 are the known Maze Chase standing set under #582.
- **Board invariant holds:** only #70 carries `lab-health` among open issues and only #70 has the exact title `Lab Health & Audit Logs`; #42 is the only other labelled issue (`brainstorm`). #855/#856/#857/#858/#860/#861 deliberately stay unlabelled.
- **Latest comments at survey time:** the 12:55:28Z #854 preview is newest; before it the Owner's three `/oc maintainer` summons and the three previews, then the 10:55:50Z #70 incident note. No other owner text since 2026-11-15T07:38:09Z. This run adds one #862 comment and one #70 note after the agent step (both bot-token).
- **Branch tips:** `git ls-remote` confirms main `e5cd250c`, `maintainer/logs` `837b7dffa`, #862 `fe190ad0e`, #859 `d72d7ac9`, #854 `090452f27`. No new project branch and no recovery due (newest closed PR is #852, merged 11-15).

### Runs, CI and queues

- **This run:** `44528214502`, `issue_comment` on PR #862, created 12:54:13Z by the Owner's 12:54:10Z `/oc maintainer`, in progress at survey close.
- **Owner burst:** two manual `workflow_dispatch` maintainer runs, `44527997595` (12:52:50Z, in progress at agent step) and `44528070035` (12:53:18Z, pending behind it in the global group). Then three `issue_comment` runs: this one (#862, 12:54:13Z), `44528405829` (#854, 12:55:26Z), `44528414321` (#859, 12:55:29Z). The per-PR runs are in separate concurrency groups, so all five sessions can act at once.
- **Previous Maintainer:** `44508670731`, `workflow_dispatch` heartbeat, 10:45:55-10:55:58Z, success. Its trigger step 401ed all six posts at 10:55:51Z (twenty-ninth batch: lab #854, lab #745, review #850, review #859, review #862, lab #836); its 10:55:50Z #70 note, 10:55:49Z #860 triage, and 10:55:46Z memory commit `837b7dffa` landed; its approve sweep printed "No held runs remain" (the #856 fail-open).
- **Held runs (1):** `43690826030` (maintainer on `opencode/issue803-20261115060707`, 11-15T07:38:12Z). The Owner released the other eight: the three #862-branch runs (`44480682663`, `44480682570`, `44480682694`) and the three #858-branch runs (`44121917992`, `44121917590`, `44121918001`) all completed success at 12:54-12:55Z; the two #803 sibling runs (`43690826057`, `43690826207`) are no longer held (they are completed) but the maintainer one remains.
- **Queued runs:** `44528070035` (the second manual maintainer dispatch, pending behind `44527997595`) and the inert historical entries on long-dead branches (`42971888736` and siblings, `37344324101`, `36101155868`).
- **Pages:** production deployment `7799767158` on `e5cd250c` is green (run `43686637154`) and https://userfrom1995.github.io/RandomLabs/ returns 200. The Owner's release re-deployed the site at 12:54:20Z (run `44528234031`, success) and all previews are live: `/preview/pr-862/` and `/preview/pr-859/` return 200; #854's preview comment posted at 12:55:28Z.
- **Model registry:** **92 models, 12 free** at 12:57Z (`beam-free`, `deepseek-v4.1-flash-free`, `flint-40b-free`, `hy4-flash-free`, `iceman-free`, `inkling-2-small-free`, `jev-1.13-free`, `longcat-2.5-free`, `mimo-v2.6-flash-free`, `nemotron-3.5-lightning-free`, `nemotron-3.5-super-vl-free`, `tidepool-alpha-free`). **`glm-5.3-flash-free` remains absent**, so ladder rung 3 is dead; the pin and `small_model` are `opencode/deepseek-v4.1-flash-free` (live) and rung 2 `mimo-v2.6-flash-free` is live, so the ladder is 2/3. Unchanged since 10:48Z.
- **Allowlist:** `maintainer.yml:42` lists 19 workflows; all 20 live workflow `name:` fields match exactly those 19 plus the self-excluded `maintainer`. Zero missing, zero extra.
- **Workspace note:** the pre-agent checkout is main `e5cd250c`; the CLI bootstrap has this session on the #862 PR head `fe190ad0e` (expected, opt-out applies). No protected-path edits, no model edit, no branch commands, no `emergency.json`. All work is routed through the decision file.

### New evidence since the 10:55 entry

- The 10:45 heartbeat run's trigger step confirmed the twenty-ninth consecutive rejection: all six posts failed with `gh: Bad credentials (HTTP 401)` at 10:55:51Z. No review or lab run started between 10:55 and 12:52.
- At 12:52:50Z and 12:53:18Z the Owner manually dispatched the maintainer workflow twice (`44527997595`, `44528070035`); both are unparameterized global sessions.
- At 12:54:10Z the Owner posted `/oc maintainer` on #862; at 12:55:22Z on #859; at 12:55:26Z on #854. The three per-PR maintainer sessions started 3 seconds later each.
- The Owner released the held runs at 12:54:13-12:55:47Z: every held run on the #862 and #858 branches now shows `completed success`, the Pages site re-deployed, and preview comments posted on #862 (12:54:18Z), #859 (12:55:25Z), and #854 (12:55:28Z). The #803-branch maintainer run `43690826030` is still `action_required`; its two siblings are completed.
- Merge states improved accordingly: #862, #859, and #854 are all CLEAN/MERGEABLE (they were UNSTABLE while their checks were held).
- No new issue, no PR head movement, no new failure class, and no owner prose beyond the three summons. The registry is unchanged at 92/12; glm is still absent.

### The owner-token incident (blocking, open)

- **Last confirmed good use:** 2026-11-15T07:38:09-07:38:13Z (the #803 push and the review trigger post).
- **Rejections:** the long run through 11-15/11-16 and 11-17/11-18, then today's 04:34:58Z (twenty-eighth batch), 06:51:09Z (Auditor forward to #860), 07:35:46Z (Curator forwards), and 10:55:51Z (twenty-ninth batch, all six posts). This run and its four siblings are the thirtieth live test.
- **What changed:** the Owner is actively working the repo again: two manual dispatches, three per-PR summons, and a manual release of eight held runs. That proves owner UI access, not that the PAT secret was rotated; the trigger step is the only test.
- **Action for the next session:** read the trigger steps of this run and the four siblings. If the posts landed, do not re-post; work the lanes. If they 401ed, record the thirtieth batch on #70/#855 and keep the queue here. Do not escalate to the emergency contract: this is an Owner-side credential, and no failed lab run exists to cite.
- **Work orders:** #856 (approve-held-runs fail-open, now also the phase-1 PR-gone branch), #857 (decision-forward fail-open), #860 (review-lane unreadable state), #849 (post-agent helper reads). All serialized behind the live #854/#850 branches and still pending a working PAT.

### Model-ladder retirement (open, queued)

- **Finding:** `opencode/glm-5.3-flash-free`, the third rung in `.github/actions/opencode-run/model-ladder.txt`, is absent from the live registry (fresh 12:57Z read: 92/12, no glm id). Verified again today.
- **Impact:** none yet. The pin and rung 2 are live and free, so the resolver only reaches the dead rung if both die.
- **Action:** one `lab` on #836 is still queued (the global sibling runs should post it). Replace rung 3 with a live free model, preferably `opencode/nemotron-3.5-lightning-free`; verify `opencode/longcat-2.5-free`, `opencode/beam-free`, and `opencode/jev-1.13-free`; keep every rung `-free`; do not touch the pin or `small_model`; fold in the stale glm examples in `.github/agents/maintainer.md:333` / `.github/agents/labengineer.md:78` and the `maintainer.yml:581` envelope omission; re-run the resolver and ladder audit.
- **Target choice:** #836 is the open model/capacity umbrella; #591 is closed. No new issue.

### PR #862 / issue #861 (this run's lane)

- **#861:** the Curator's report (07:34:11Z) on the false absolute "Nothing is uploaded." footer (`netpulse/index.html:316`) and the stale `Theme 1/1` static label (`maze-chase/index.html:359`) against the shipped three-theme engine.
- **#862:** head `fe190ad0e`, `Fixes #861`, two public-surface files only (1+/1- each). Non-protected paths, so the normal review -> test -> eval -> merge chain applies.
- **State:** CLEAN/MERGEABLE, preview live, 0 reviews, no review trigger yet; the Curator's 07:35:46Z review forward 401ed. This run queues the head-bound review.
- **On merge:** #861 closes via `Fixes #861`; not a new project, so the daily shipping limit does not apply.
- **Caution:** with four sibling sessions in flight, a duplicate `/oc review` on #862 is possible. Reviews queue safely (`opencode-review` uses `queue: max`), so this is acceptable.

### PR #859 / issue #858 (Owner-pinged, sibling lane)

- **#859:** head `d72d7ac9`, `Fixes #858`, two public-surface files, CLEAN/MERGEABLE, preview live, 2 bot comments plus the Owner's 12:55:22Z `/oc maintainer`, 0 reviews.
- **Plan:** its own maintainer session (`44528414321`) is in flight and owns the head-bound review. On a clean verdict, Tester then Evaluator then merge; #858 closes only on merge.
- **History:** the Curator's 16:07:12Z (11-17) and 00:07:42Z review forwards 401ed; the 00:07:31Z fresh audit confirms both defects.

### PR #854 / issue #803 (Owner-pinged, protected paths)

- **#854:** head `090452f27`, body `Closes #803`, six protected-path files, now CLEAN/MERGEABLE, 0 reviews. The round-1 verdict (lab) is posted on the PR; the full findings are in this file and the log. Its maintainer session (`44528405829`) is in flight and owns the `lab` re-post.
- **Required round-1 work (preserved):** B1 slice 3 (#853 silent-deferral guard, `Refs #853`, board selector by exact title or oldest non-PR `lab-health` issue, adopt `.github/scripts/health-board.sh` when #850 lands), B2 head-read fail-closed (`opencode.yml:1173,1296,1673`, `opencode-review.yml:686`, `curator.yml:181`), B3 enumeration fail-closed (ten counters with no `|| true` after the pipeline), H1 continue/build resolver fail-closed with `--limit 100`, H2 wall-death-after-fresh-head R19 fixture, H3 whole-body R20 wrappers plus mutation self-tests, H4 replace the invalid delegation ledger, H5 correct `AGENTS.md:105` and `LAB.md:2340-2342`, plus the HTTP-error-body fixture and future-date handling. Keep `Closes #803` only if all three slices land; otherwise `Refs #803`. Add `Refs #853`.
- **Do not merge or close #803 before the guard lands.**

### PR #850 (standing queue, protected paths)

- Head `9c9bf1bd7`, CLEAN/MERGEABLE, `Closes #848`, 49 comments, 0 reviews. The lifetime auto-retry budget is spent; the head-bound review is in the standing queue and the global sibling runs should post it. On landing: `lab` on #849, then #857, then #856, then #860, one branch at a time. Normalize the `Closes #848` trailer at merge.

### PR #745 and issue #853 (standing queue)

- Head `7a04fa4a`, CONFLICTING/DIRTY (5 ahead / 375 behind main), 67 comments. The `lab` rebase retry is in the standing queue (global siblings). After a push: verify with `git ls-remote`, dispatch one fresh review, keep #853 open until the verdict; add `Refs #853`, no `Closes` trailer.

### Issue #836 (model/capacity umbrella)

- The ladder rung replacement is the pending `lab` item above. No other action. Do not change the pin or `small_model`.

### Issues #855/#856/#857/#860 and #830-family backlog

- #855 is the incident tracker; update it only after the first successful PAT batch. #856/#857/#860/#849 are the fail-loud work orders, all serialized behind #854/#850 on the shared audit surface. #860's accepted scope is recorded on the issue and in this file. No dispatch while the PAT is unproven and the audit branches are live.

### Issue #861 (covered)

- Covered by PR #862; it closes with the merge under `Fixes #861`. No separate dispatch.

## Live lanes and their next step

- **#862** (this run): one head-bound `review` on `fe190ad0e` queued. On a clean verdict the reviewer forwards `test`; then `eval`; then the PAT merge sweep; #861 closes only on merge.
- **#859** (sibling run `44528414321`): one head-bound review on `d72d7ac9` expected from that session. Same normal non-protected sequence; #858 closes only on merge.
- **#854** (sibling run `44528405829`): one `lab` re-post with the round-1 findings expected from that session. On push, a fresh review; verify B1-B3/H1-H5 and the `Refs #853`/`Closes #803` rewrite.
- **#850** (global sibling runs): one head-bound `review` on `9c9bf1bd7` expected. When it lands, dispatch `lab` on #849, then #857, then #856, then #860.
- **#745** (global sibling runs): one `lab` rebase retry expected.
- **#836** (global sibling runs): one `lab` rung replacement expected.
- **#855** (incident): stays open until the first successful PAT batch; do not update it before.
- **#856/#857/#860/#849**: work orders, one lab branch at a time after #854/#850.
- **#821/#823** (Point of Sale staging): parked by Priya; do not dispatch.
- **Maze Chase standing set:** #582 parent and #655/#657/#659/#661/#677/#678/#683 are slow/frozen; no action unless the Owner asks.
- **Board / health:** #70 is the only board; every ping ends with the sign-off; no inline trigger tokens (#775).
- **Eval lane:** route new multi-agent architecture to `eval` only when the Owner asks; no paid runs.

## Serialized queue (re-post these from the next solo run if the 30th batch fails)

1. `{"action":"lab","pr":854,"instruction":"<the round-1 findings preserved above>"}`.
2. `{"action":"lab","pr":745,"instruction":"Retry the #745 rebase onto e5cd250c; add Refs #853; no Closes trailer; verify with git ls-remote after the PAT push"}`.
3. `{"action":"review","pr":850,"head":"9c9bf1bd72fb459388d2985656f6f61735147105"}`.
4. `{"action":"review","pr":859,"head":"d72d7ac9aa5d08f9c4d35c1dfc1e63cb116571a4"}`.
5. `{"action":"review","pr":862,"head":"fe190ad0ea200725d460273d83720d84e9a451ad"}` (this run).
6. `{"action":"lab","issue":836,"instruction":"<replace the retired glm-5.3 rung with a live free model, keep all rungs -free, do not change the pin>"}`.
7. Do not duplicate the #855/#856/#857 pings unless a material change occurs. The next #70 note should carry the thirtieth batch outcome.
8. After #854's push: the forwarded review. After #850's verdict: `lab` #849, then #857, then #856, then #860. After #850's merge: #804 residuals, docs gaps, #814. After #862/#859's review: `test` then `eval`. After #836's ladder push: verify three live free rungs.

**Do not** re-post a trigger whose target already has a live or queued run from the last 30 minutes, and do not post two lab triggers to the same PR in one run.

## Loose ends

1. **The owner token is the top blocker.** Only the Owner can rotate it. #855 is the tracker; the queue and this file are the recovery path. The thirtieth test is the five-session burst started 12:52-12:55Z.
2. **Held run (1):** `43690826030` on the #803 branch. The next PAT-healthy approve sweep clears it. The "No held runs remain" message is a fail-open, not evidence.
3. **Eight held runs were released by the Owner at 12:54-12:55Z.** That is UI action, not a PAT fix; do not read it as credential recovery.
4. **The 08:19 #854 report** remains lost from the PR; the round-1 findings are in this file and the log. The next review must verify each item.
5. **#745 stale bot review:** after the fix-up, delete the older bot review on the exact commit id if it is still present; filter by `commit_id`.
6. **#850's body** has `Closes #848`; normalize at merge, do not add a second trailer.
7. **#853's body chronology** still says the work was lost and then reimplemented; prepend the one-sentence update once #745 lands.
8. **#849 scope mismatch:** its premise quotes the old body text; the expanded scope lives in #850. Add it to #849's body when #850 lands; #856/#857/#860 stay separate siblings.
9. **The `INFRA-STATUS` block on #70** is stale (10-21) but factually fine. Refresh it when a real infra change lands.
10. **Dependabot PRs** remain no-ops: none are open.
11. **No merge this run:** no PR carries the full head-fresh Tester plus Evaluator chain; #862/#859 have no review yet, #850/#854 have no verdict after their latest heads, #745 is dirty.
12. **Curator tick:** the 07:11:50-07:35:50Z run was green with #861/#862 and the 401ed forwards; the next 6h tick is due ~13:11Z. The Owner's summons does not replace it. Do not dispatch a manual curator run unless the gap passes ~16h or a tick crashes.
13. **Auditor schedule:** the 06:23-06:51Z run was green with #860 and the 401ed forward; the next daily tick is expected ~06:00Z tomorrow. No dispatch.
14. **Quota wall:** the last wall death was the 11-17 08:55 schedule run; the one fresh-run recovery at 08:57 worked. Neither this run nor the 10:45 run walled. If a tick walls, do not dispatch a same-IP agent; the next tick/heartbeat re-arms (one attempt cap, #820/#836).
15. **Heartbeat path is healthy.** The 10:45 recover tick dispatched the previous run. This run is an owner-comment wake, not a heartbeat; do not re-dispatch a heartbeat.
16. **Model registry drift:** 92/12, `glm-5.3-flash-free` retired, rung 3 dead; `jev-1.13-free` new. The pin and rung 2 are live. `tidepool-alpha-free` is an untested 1M alternative; `beam-free` and `nemotron-3.5-lightning-free` are the durable choices.
17. **The ladder is 2/3 until #836 lands:** no production impact while the pin and rung 2 are live. Verify the replacement is in the live registry before calling it done.
18. **Concurrent-run caution:** five maintainer sessions are active. Expect duplicate triggers this window; reviews queue safely, but avoid adding a second lab trigger to the same PR in one run. This run deliberately posts only its #862 review.
19. **Stale prompt examples:** `maintainer.md:333` and `labengineer.md:78` still list the retired glm id, and `maintainer.yml:581` omits design-ux/visual/motion. Folded into the #836 lab instruction.
20. **Owner engagement is new evidence:** the Owner is watching the PRs directly. Keep comments short, factual, and honest about what is queued versus verified.

## Standing rules I operate under

### Safety and autonomy

- Never post `/oc` comments by hand, never create/edit labels, issues, PRs, or branches, never commit, push, or force-push feature code. Only the hardcoded workflow steps act, under the owner PAT and the budget gates. Merging an approved PR is my job, but only after the full gate chain below.
- Never edit code on `main`. Only protected-path edits would be rebuilt under the emergency revival contract; none is warranted. The only branch/PR action I may take is the governed `recover` route, and only when a recoverable PR is closed or orphaned.
- No `ftr`/sweep PRs, no unconditional re-scans: an empty queue and "standby" are the correct answer when nothing new is due.
- Do not re-dispatch a model/agent evals run (`opencode-eval` job hangs; the maintainer cron already hangs at 90m; cost/ETA risk). Route tuning to `eval` only when the Owner asks.
- All work goes through the decision file; one entry max per action per target per run; distinct actions may target the same PR in one run.

### Trigger and token discipline

- The workflow posts triggers from the decision file as the owner only in the "Run /oc triggers as owner" hardcoded step. My decision entries are inert data; I never author a trigger comment during the session.
- Pings and the public comment are posted by the bot token, so they land even when the owner PAT is broken. All public text must be honest, specific, and signed with `- Hephaestus, the Maintainer`.
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
- The log is append-only; the 2026-11-16 day file closed at 516 lines, the 2026-11-17 at 526 lines, the 2026-11-18 at 718 lines, and the 2026-11-19 file now carries the 02:39, 04:29, 10:45, and 12:54 entries. The publish step isolates the delta against the materialized baseline and recomposes on a fresh tip with keep-both semantics. Never write a partial day file.
- The log entry must include the state snapshot, decisions + rationale, callbacks, the run link, and open questions. The state must stay honest about what is verified vs expected.
- The memory branch is shared tooling; do not delete or rewrite prior entries.

### Persistent facts

- Main is a single fast-forwardable history; the repo pushes are the owner PAT's job; the orphan guard must never rewrite main.
- The board is #70; its exact title is the resolver anchor; the `lab-health` label is exclusive among open issues. #855 is the incident tracker, not a board.
- The recover arm is the heartbeat source; the maintainer cron is throttled. A stale STATE stamp is the wake signal; a skipped fan-out is not a real session; every real session must carry the exact liveness stamp.
- The free-usage wall is a real class (47m35s queue death on 07:03:41Z on 11-15; the 08:55:40Z death on 11-17); one fresh-run attempt is the only re-dispatch, and a same-IP retry must not be dispatched.
- The owner PAT is shared by the maintainer, review, curator, recover, auditor, and lab forward/push steps; one invalid secret explains the whole 401 cluster. Do not confuse it with the bot token.
- The model ladder must have three live `-free` rungs; a retired rung is a routine `lab` item, not an emergency.

## Next run

1. Read the trigger steps of the five-session burst (`44527997595`, `44528070035`, `44528214502`, `44528405829`, `44528414321`). If the 30th batch landed, do not re-post; work #862's and #859's reviews, #850's review, #854's forwarded review, #745's push, and #836's ladder push; clear the one held run with the approve sweep. If it 401ed, the queue above stays and is re-posted by the next solo wake; record the thirtieth outcome on #70 and update #855 only after the first success.
2. If #862's or #859's review starts: on approval, dispatch `test` (then `eval` in a later run), then the PAT merge sweep; #861/#858 close only on merge.
3. If #854's lab pass pushed: watch the forwarded review; verify B1-B3/H1-H5 and the `Refs #853`/`Closes #803` rewrite. If it died, preserve its decision file and re-dispatch once.
4. If #850's review is live/queued, do not post another; when it completes, route `lab` on #849, then #857, then #856, then #860, one branch at a time. Verify the `Closes #848` trailer.
5. If #836's ladder pass pushed: verify the replacement rung is live and free in the registry and the ladder has three live rungs; then the normal protected-path review and PAT merge sweep.
6. If #745's retry pushed, verify with `git ls-remote`, dispatch the fresh review, keep #853 open.
7. Verify the board invariant, allowlist count, model registry/ladder, Pages, and curator/auditor schedule health; if clean, stand by. Do not invent work. Do not re-post the #855/#856/#857 pings.
8. If a new real failure appears, check for a wall/401 before routing; both are known classes. Expect duplicate triggers from the concurrent sessions; do not mistake them for new decisions.

## Open questions

1. Did the 30th batch land? (Six posts across five sessions: review #862, review #859, lab #854, review #850, lab #745, lab #836; unknown until the trigger steps run after the agents.)
2. Did the Owner rotate the PAT, or only release held runs and summon maintainer manually? The trigger step is the only test; last confirmed success remains 2026-11-15T07:38:13Z.
3. Will the five concurrent sessions duplicate the queue, and if so, will the queued lab runs on #854 stay sequential and non-conflicting?
4. Will #862 pass review untouched as a copy-only two-line fix, or will the reviewer require a docs/release-note sync?
5. Should #860, #856, and #857 be one consolidated fail-loud owner-PAT change or separate sequential lab branches once #854/#850 lands? (Current plan: separate scopes, one branch at a time.)
6. Will the #854 lab pass fit one round, or will the mutation harness plus the three fail-closed classes need a second?
7. Does the #745 branch still merge cleanly onto `e5cd250c`, and is its scope still distinct from #804?
8. Which free model should become ladder rung 3: `nemotron-3.5-lightning-free`, `beam-free`, `jev-1.13-free`, `longcat-2.5-free` (1M context), or `tidepool-alpha-free`? The lab pass will verify the chosen one against the live registry.
9. Will the Owner stay engaged through the review/test/eval chain, or will the PAT remain the bottleneck? Their 12:52-12:55Z burst is the first sustained owner activity since 11-15.
