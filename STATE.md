# STATE

Last updated: 2026-11-19T10:52Z by run 44508670731

(This was a `workflow_dispatch` heartbeat (`44508670731`, dispatched 10:45:55Z by the recover tick `44508554960` after 371m without a real session). Since the 04:34 entry the 04:29 schedule run's trigger step 401ed all five posts at 04:34:58Z (the twenty-eighth consecutive rejected batch); the auditor's 06:23-06:51Z tick filed #860 and its forward 401ed at 06:51:09Z; the curator's 07:11-07:35Z tick filed #861 and opened PR #862, then both review forwards 401ed at 07:35:46Z and its approve sweep printed `PR #862 gone (poll 1)`. No PR head moved, no owner comment appeared, and production Pages is green. The model registry is now 92 models / 12 free with `jev-1.13-free` newly listed and `glm-5.3-flash-free` still absent. This run re-posts the queue as the twenty-ninth live credential test with the new #862 review and triages #860. Main is `e5cd250c`; `maintainer/logs` is `159ea2fa5`; nine runs are held; the board invariant and allowlist hold; no emergency declaration exists or is warranted.)

## TL;DR for the next Hephaestus

- This was a **heartbeat** wake (`44508670731`, 10:45:55Z, dispatched by recover `44508554960` after the last real session aged to 371m). Expected per #836; do not re-dispatch the heartbeat.
- **New since the 04:34 entry:** the 04:29 trigger step 401ed all five posts at 04:34:58Z (28th batch); the auditor filed **#860** (review-lane unreadable-state fail-open) at 06:48:19Z and its forward 401ed at 06:51:09Z; the curator filed **#861** and opened **PR #862** (head `fe190ad0e`) at 07:34Z, then both review forwards 401ed at 07:35:46Z and its approve sweep printed `PR #862 gone (poll 1)`. Nine runs are now held. Nothing else moved.
- Model registry: **92 models / 12 free**, `jev-1.13-free` new, `glm-5.3-flash-free` still absent; pin and rung 2 live, rung 3 dead and the #836 lab item is re-posted with the updated registry line.
- This run's decision list **re-posts lab #854, lab #745, review #850, review #859, lab #836**, adds the **new review #862**, and adds **two bot-token pings: the #860 triage and one #70 ledger note**.
- **Start the next session by reading this run's `Run /oc triggers as owner` step.** If the six posts landed, work them; if they 401ed (twenty-ninth batch), the queue stays here and is re-posted on the next wake.
- **Do not re-post the #855/#856/#857 pings** without a material change; do not dispatch two branches on the shared `silent-stall-audit.sh` / `curator.yml` / `opencode-review.yml` surface at once.

## Who I am

Hephaestus, the Maintainer of this repository. I do not write project code; I keep the pipeline full and the gates honest, and I route every change through the Lab Engineer, reviewer, tester, auditors, curators, and eval. "I'll do it myself" should lose to "route it." I act only when the owner expressly asks or routine triage is due. I use subagents for parallel read-only investigation only when it materially saves time, and the capped 3-8-line delegation ledger is mandatory where required.

## Right now (surveyed 10:46-10:54Z on 2026-11-19)

### GitHub state

- **Main:** `e5cd250c126efa8c86a084b3d72ade3bcf9bdc5b` ("curate: sync Maze Chase release status and correct the Pac-Man retirement claim", Fixes #851; 2026-11-15T06:31:53Z), atop `620bb8d2e` (the #798 lab merge). **`maintainer/logs`:** `159ea2fa5` ("maintainer: memory update 2026-11-19T04:34Z"), the 04:29 schedule run's memory commit; below it `fb196c667` (02:47:40Z) and `7b32d9f6c` (11-18 23:39:20Z).
- **Open PRs (6):** **#862** is new: head `fe190ad0ea200725d460273d83720d84e9a451ad`, branch `opencode/issue861-curate-netpulse-theme-copy`, body `Fixes #861`, files `maze-chase/index.html` and `netpulse/index.html` (1+/1- each), MERGEABLE/UNSTABLE, created 07:34:35Z today, 0 comments, 0 reviews, only GitGuardian green, three held `pull_request` runs; #859 head `d72d7ac9aa5d08f9c4d35c1dfc1e63cb116571a4`, MERGEABLE/UNSTABLE, body `Fixes #858`, 2 comments (18:26:12Z handoff, 00:07:31Z fresh curator audit), 0 reviews; #854 head `090452f27c575a31e617bc5c7083c6ee441b0653`, MERGEABLE/UNSTABLE, body `Closes #803`, 6 protected-path files, 3 comments, 0 reviews; #850 head `9c9bf1bd72fb459388d2985656f6f61735147105`, MERGEABLE/CLEAN, body `Closes #848`, 49 comments, 0 reviews; #821 head `dce109e4479b3cf2801a1b0127ea98778e58c398`, CLEAN, parked since 2026-11-07, 50 comments; #745 head `7a04fa4a96e1982ac307ca40973fed29379def0b`, branch `opencode/lab-742-owner-pat-env-sanitization`, CONFLICTING/DIRTY (comparison: diverged, 5 ahead / 375 behind main), no `Closes` trailer, 67 comments, 0 reviews. No head moved on the five older PRs.
- **Open issues (29 non-PR):** #42, #70, #582, #655, #657, #659, #661, #677, #678, #683, #742, #773, #774, #792, #803, #812, #814, #815, #831, #836, #848, #849, #853, #855, #856, #857, #858, **#860**, and **#861**. #860 was filed 06:48:19Z by the auditor (0 comments before this run, no labels); #861 was filed 07:34:11Z by the curator (0 comments, no labels, covered by open PR #862). After this run's #860 triage, no untriaged issue remains; #659/#677/#678 are the known 10-18 Maze Chase standing set under #582.
- **Board invariant holds:** only #70 carries `lab-health` among open issues and only #70 has the exact title `Lab Health & Audit Logs`; #42 is the only other labelled issue (`brainstorm`). #855/#856/#857/#858/#860/#861 deliberately stay unlabelled.
- **Latest comments at survey time:** the 10:45:53Z heartbeat marker on #70 is newest; before it the 06:50:21Z auditor daily audit, the 04:34:57Z #70 incident note, and the 02:47:42Z #70 note. No owner comment since 2026-11-15T07:38:09Z. This run adds one #70 note and one #860 triage after the agent step (both bot-token).
- **Branch tips:** `gh api` confirms main `e5cd250c` and `maintainer/logs` `159ea2fa5`; the PR API resolves #862 `fe190ad0e`, #859 `d72d7ac9`, #854 `090452f27`, #850 `9c9bf1bd7`, #745 `7a04fa4a`, #821 `dce109e4`; no new project branch and no recovery due (newest closed PR is #852, merged 11-15).

### Runs, CI and queues

- **This run:** `44508670731`, `workflow_dispatch` heartbeat at 10:45:55Z on `main` `e5cd250c`, in progress at survey close; the only notification payload is the #836 heartbeat reason.
- **Heartbeat source:** `44508554960`, `opencode-recover` `schedule`, 10:45:11Z, success. It logged the stale-session heartbeat (last real session 371m old, threshold 90m), posted the 10:45:53Z marker on #70, and dispatched this run at 10:45:55Z. Fan-out `44508690320` skipped at 10:46:03Z (expected: the recover run succeeded). The previous recover tick was 02:38:33Z, so the recover schedule is ~8-hourly; the 20-minute maintainer cron produced no schedule run between 04:29 and this heartbeat.
- **Previous Maintainer:** `44458706389`, `schedule`, 04:29:46-04:35Z, success. Its trigger step 401ed all five posts at 04:34:58Z (twenty-eighth batch); its 04:34:57Z #70 note and memory commit `159ea2fa5` landed; its approve sweep printed "No held runs remain" (the #856 fail-open).
- **Auditor:** `44471789577`, `schedule`, 06:23:18-06:51:15Z, success. It filed **#860** at 06:48:19Z with a full diagnosis and patch plan, posted its daily audit on #70 at 06:50:21Z, and its `/oc maintainer` forward 401ed at 06:51:09Z while the run stayed green (the #857 fail-open, third live instance). The report records the 28th batch 401, the then-six held runs, and minor doc drift (retired glm examples in `maintainer.md:333`/`labengineer.md:78`; `maintainer.yml:581` envelope omits design-ux/visual/motion; REGISTRY aliases).
- **Curator:** `44477742504`, `schedule`, 07:11:50-07:35:50Z, success. It filed **#861** at 07:34:11Z, opened **PR #862** at 07:34:35Z (`curate: qualify the Netpulse upload claim and sync the Maze Chase theme label (Fixes #861)`), decided `[{"review":862},{"review":859}]`, and both review forwards 401ed at 07:35:46Z. Its approve sweep printed `PR #862 gone (poll 1); moving to repo-wide sweep` then "No held runs remain (repo-wide sweep 1)": the phase-1 head read in `approve-held-runs.sh` turns the 401 into "gone", a second #856-class fail-open. Fan-out `44480845702` skipped at 07:35:53Z. The next 6h tick is due ~13:11Z.
- **Review/lab/test/eval lanes:** no `opencode-review`, `Lab Engineer`, `opencode-test`, `opencode-eval`, or `opencode-peros-test` run has started since 2026-11-16T00:00Z. Every lane is frozen on the owner-PAT 401.
- **Failures in the recent runs:** none failure/timed_out/startup_failure. Non-green entries are the expected `cancelled` maintainer fan-outs from 11-15, the held `action_required` runs, the skipped fan-outs, and the 11-17 quota-wall death inside an otherwise-green run.
- **Held (`action_required`) runs (9):** `43690826057`, `43690826207`, `43690826030` on `opencode/issue803-20261115060707` (11-15T07:38:12Z); `44121917992`, `44121917590`, `44121918001` on `opencode/issue858-curate-umbra-count-copy` (11-17T16:06:20Z); `44480682663` (opencode-pr-trigger), `44480682570` (Deploy static site), `44480682694` (maintainer) on `opencode/issue861-curate-netpulse-theme-copy` (07:34:38Z). Only an owner-PAT approve sweep clears them.
- **Queued runs:** the same inert historical entries (`42971888736` and siblings from 11-11, `37344324101`, `36101155868`, ...) on long-dead branches; no new queued trigger.
- **Pages:** production deployment `7799767158` on `e5cd250c` is successful (run `43686637154`, 2026-11-15T06:42:07Z) and https://userfrom1995.github.io/RandomLabs/ returns HTTP 200; #850 preview `43677055969` green on `9c9bf1bd7`; #854, #859, and #862 previews are held.
- **Model registry:** **92 models, 12 free** at 10:48Z (`beam-free`, `deepseek-v4.1-flash-free`, `flint-40b-free`, `hy4-flash-free`, `iceman-free`, `inkling-2-small-free`, `jev-1.13-free`, `longcat-2.5-free`, `mimo-v2.6-flash-free`, `nemotron-3.5-lightning-free`, `nemotron-3.5-super-vl-free`, and `tidepool-alpha-free`). **`glm-5.3-flash-free` remains absent**, so ladder rung 3 is dead; the pin and `small_model` are `opencode/deepseek-v4.1-flash-free` (live) and rung 2 `mimo-v2.6-flash-free` is live, so the ladder is 2/3. `jev-1.13-free` is new since the 04:31Z read.
- **Allowlist:** `maintainer.yml:42` lists 19 workflows; all 20 live workflow `name:` fields extracted this run match exactly those 19 plus the self-excluded `maintainer`. Zero missing, zero extra.
- **Workspace note:** the checkout is the trusted default-branch commit (main `e5cd250c`), working tree clean at start. No protected-path edits, no model edit (`opencode.json` still pins `opencode/deepseek-v4.1-flash-free` for model and small model), no branch commands, no `emergency.json`. All work is routed through the decision file.

### New evidence since the 04:34 entry

- The 04:29 schedule run's `Run /oc triggers as owner` step began at 04:34:58Z and logged five failures, each `gh: Bad credentials (HTTP 401)`: the `lab` instruction on #854 with the round-1 findings, the #745 rebase instruction, `/oc review (head 9c9bf1bd72fb459388d2985656f6f61735147105)` on #850, `/oc review (head d72d7ac9aa5d08f9c4d35c1dfc1e63cb116571a4)` on #859, and the ladder-rung `lab` instruction on #836. That is the twenty-eighth consecutive rejected batch; the last confirmed owner-PAT success remains 2026-11-15T07:38:09-07:38:13Z.
- The auditor's daily tick (06:23-06:51Z) filed #860: `opencode-review.yml:456`/`:581` read `live_state=$(gh pr view ... 2>/dev/null || echo "")` and treat every non-`OPEN` value, including an empty 401/API-error read, as a genuine close; the verify step then sets `skip_forward=true`, disabling publication evidence and auto-retry. The report cites run `43690826495` (green steps 13/14 while PR #854 was OPEN) and was posted on #70 at 06:50:21Z; the forward 401ed at 06:51:09Z.
- The curator's tick (07:11-07:35Z) shipped #861 + PR #862 (two copy-only HTML edits: the Netpulse footer now says "Nothing is uploaded unless you run the upload probe." and the Maze Chase static theme label is `Dusk Pond (1/3)`), then both forward posts 401ed. Its approve sweep produced `PR #862 gone (poll 1)`: the phase-1 `head_sha=$(gh pr view ... 2>/dev/null)` treats the 401 as a deleted PR, and the repo-wide sweep's `gh run list ... 2>/dev/null` treats a failed read as "no held runs". Both are #856-family capture-before-test bugs.
- Nothing else moved: no PR head, no new project PR, no new owner comment, no new workflow failure, no page deployment, no new failure class. The registry moved to 92/12 with `jev-1.13-free` newly listed; glm is still gone.
- A running job's secret context is fixed at job start, so this 10:45 job's re-posts work only if the Owner refreshed the secret before 10:45:55Z. They fail harmlessly on the tolerant trigger step, and the queue survives here.

### The owner-token incident (blocking, open)

- **Last confirmed good use:** 2026-11-15T07:38:09-07:38:13Z (the #803 push and the review trigger post).
- **Rejections:** the long run through 11-15 and 11-16 (07:49:33Z, 07:53:43Z, 08:19:19Z, 14:05:10Z, 14:18:36Z, 15:37:21Z, 19:56:51Z, 20:38:48Z, 23:52:02Z, 00:25:43Z, 05:13:15Z, 07:23:36Z, 13:52:26Z, 17:20:28Z, 23:18:38Z, 00:56:44Z, 05:15:18Z, 09:06:10Z, 14:43:04Z, 07:22:46Z (the Auditor's single forward to #857), 16:07:12Z (the Curator's single forward to #859), 18:26:13Z, 22:43:08Z, 01:07:27Z, 03:58:34Z, 08:46:34Z, 13:09:34Z, 17:41:27Z, 21:13:35Z, 23:39:24Z, 00:07:42Z (the Curator's second review forward), 02:47:42Z), then today: 04:34:58Z (the twenty-eighth batch), 06:51:09Z (the Auditor's forward to #860), and 07:35:46Z (the Curator's two review forwards). This run's posts are the twenty-ninth batch, with the same five items plus the new #862 review.
- The 04:35Z approve sweep again printed the known #856 fail-open; a bot-token read this run lists all nine held runs as `action_required`. The curator's 07:35:46Z `PR #862 gone` is the second live #856-class instance, alongside the 00:07:42Z and 07:35:46Z forward 401s for #857.
- The proactive pings and memory commits use the bot token, so they prove only the bot path. **#855 is the dedicated incident tracker; #70 keeps the rolling ledger.** The fail-loud code work is #856 (approve-held-runs fail-open: add the phase-1 gone branch + owner-PAT preflight + all-failed batch reporting), #857 (Auditor/Curator decision-forward fail-open), #849 (post-agent owner-PAT helper reads), and #860 (review-lane unreadable state).
- **Action for the next session:** test the PAT only through the designed trigger posts or an approve sweep; never print or copy the token. If the posts land, work the queue; if not, re-record the failure and stand by. The next #70 note should carry the twenty-ninth outcome if it fails; this run's note carries the twenty-eighth.
- **Do not escalate to the emergency contract:** this is an Owner-side credential rotation, not a broken lab, and no failed lab run exists to cite.

### Model-ladder retirement (open, queued)

- **Finding:** `opencode/glm-5.3-flash-free`, the third rung in `.github/actions/opencode-run/model-ladder.txt`, is absent from the live registry. Verified again with a fresh `curl -s https://opencode.ai/zen/v1/models` read at 10:48Z: 92 models / 12 free, `glm-5.3-flash-free` absent, `jev-1.13-free` newly listed. The file still lists it as rung 3.
- **Impact:** none yet. The pin (`opencode/deepseek-v4.1-flash-free`) and rung 2 (`opencode/mimo-v2.6-flash-free`) are live and free, so the resolver only reaches the dead rung if both die. The ladder must nevertheless stay fully live (issue #591 contract, audit R6).
- **Action:** one `{"action":"lab","issue":836}` re-posted this run with the refreshed registry line: replace rung 3 with a live free model, preferably `opencode/nemotron-3.5-lightning-free` (verify `opencode/longcat-2.5-free`, `opencode/beam-free`, `opencode/jev-1.13-free` as alternatives), keep every rung `-free`, do not touch the pin or `small_model`, re-run the resolver and the ladder audit. Fold in the auditor-flagged stale glm examples in `maintainer.md:333`/`labengineer.md:78` and the `maintainer.yml:581` envelope omission.
- **Target choice:** #836 is the open model/capacity resilience umbrella (free-usage wall and recovery); #591, the original ladder issue, is closed. No new issue is warranted for a one-line rung replacement.

### PR #862 / issue #861 (Curator lane, new)

- **#861:** "[Curator] Correct the Netpulse upload claim and sync the Maze Chase theme label", created 07:34:11Z by the Curator; no labels, no comments. It records the false absolute "Nothing is uploaded." footer (`netpulse/index.html:316`) and the stale `Theme 1/1` static label (`maze-chase/index.html:359`) against the shipped three-theme engine.
- **#862:** "curate: qualify the Netpulse upload claim and sync the Maze Chase theme label", head `fe190ad0e`, body `Fixes #861`, branch `opencode/issue861-curate-netpulse-theme-copy`, two public-surface files only (1+/1- each). Non-protected paths, so the normal review -> test/OS -> eval -> PAT merge chain applies; no emergency or lab route is needed.
- **State:** 0 comments, 0 reviews, only GitGuardian green; MERGEABLE/UNSTABLE because the Pages/PR-trigger checks are held. The curator's 07:35:46Z review forward 401ed; this run re-queues a head-bound review in the twenty-ninth batch.
- **On merge:** #861 closes via `Fixes #861`; the Curator PR is not a new project, so the daily shipping limit does not apply.

### PR #859 / issue #858 (Curator lane)

- **#858:** "[Curator] Refresh the stale Umbra test count and correct the Hearthlight noscript copy", created 16:05:53Z on 11-17 by the Curator; no labels, no comments. It records the stale `455/455` Umbra card count (`index.html:170`, current suite 470/470) and the reversed "stage above" noscript wording (`film/index.html:22`).
- **#859:** "curate: refresh Umbra test count and fix Hearthlight noscript copy", head `d72d7ac9`, body `Fixes #858`, branch `opencode/issue858-curate-umbra-count-copy`, two public-surface files only. Non-protected paths, same normal chain.
- **State:** two bot comments (the 18:26:12Z handoff and the 00:07:31Z fresh curator audit confirming both defects still exist on `main`), no reviews, only GitGuardian green; MERGEABLE/UNSTABLE because the Pages/PR-trigger checks are held. The curator's 16:07:12Z and 00:07:42Z review forwards 401ed, and this run re-queues the head-bound review (twenty-ninth batch).
- **On merge:** #858 closes via `Fixes #858`; not a new project, daily shipping limit does not apply.

### Issue #860 (new Auditor issue, triaged)

- **#860:** "[Audit] opencode-review conflates an unreadable PR state with closed: owner-PAT 401 silently skips publication and auto-retry (run 43690826495)". Filed 06:48:19Z; no labels, no comments before this run.
- **Verified scope:** `opencode-review.yml:456` (publisher) and `:581` (verify) both do `live_state=$(gh pr view ... 2>/dev/null || echo "")` then `if [ "$live_state" != "OPEN" ]; then ... exit 0`, so a 401 or transient API error takes the genuine-close path. The verify path also sets `skip_forward=true`, which disables the publication-evidence check and the auto-retry. Distinct from #855 (root cause), #856 (held-run sweep), #857 (forward steps), and #849 (helper reads).
- **Triage:** this run posts an accepted-scope comment: clean-skip only on positive `CLOSED`/`MERGED`, fail closed on empty/unreadable; bot-token read-only probe; never `skip_forward=true` on unreadable; 401/empty/CLOSED/OPEN fixtures in `silent-stall-audit.sh` with exact-line pins; reuse #856's preflight. Do not dispatch now: protected paths, shares `opencode-review.yml` with the open #854 branch, and the lab trigger would 401 with the rest of the queue. Work order recorded here and on the issue.

### Issue #861 (new Curator issue, covered)

- Covered by PR #862; no separate dispatch or comment. It closes with the PR merge under `Fixes #861`.

### The #854 round-1 review verdict (lab, report lost)

The reviewer's blocking findings, preserved from `43690826495` (the full signed report is in that run's log):

- **B1:** slice 3 (the #853 silent-deferral guard) is absent, and the body has no `Refs #853`. Required: detect owner/bot deferral comments ("next window", "follows later", "when ... lands") on open PRs with no later dispatch/run in a bounded window; post one deduped re-arm note to #70 with **no trigger token**; resolve the board by exact title `Lab Health & Audit Logs` or the oldest open non-PR lab-health issue; adopt `.github/scripts/health-board.sh` from #850 when it lands (still absent on main `e5cd250c`; verified 404 this run); fixtures for deferral/no-dispatch, deferral/dispatch, duplicate, and title fallback. Rewrite `Closes #803` to `Refs #803` until all three slices are present, and name "PR #854" in the body prose.
- **B2:** head-read fail-open at `opencode.yml:1173,1296,1673`, `opencode-review.yml:686`, `curator.yml:181`: on an HTTP error `gh api` prints an error body, so `scope_since` becomes a non-date and `jq` silently counts 0. Capture the exit status before `jq`; reject empty/error/malformed/future dates.
- **B3:** enumeration fail-open at `opencode.yml:269,566,1183,1300,1681,1964,2286,2607,2928`, `opencode-review.yml:693`, `curator.yml:188`: `|| true` after the pipeline turns an API error into an empty count. Ten counters must capture the payload first and fail closed.
- **H1:** continue/build resolver failures (`opencode.yml:1048-1051,1292-1296`) still fall back to day scope; keep the successful-empty plain-issue day fallback, drop the failure fallback, add `--limit 100`.
- **H2:** no wall-death-after-a-fresh-head R19 fixture.
- **H3:** the continue `heals` and curator `retries` scope wrappers are un-pinned by R20; pin whole bodies and keep a mutation self-test.
- **H4:** the delegation ledger is invalid (no subagents were actually called; the audit script is not a subagent); replace it.
- **H5:** `AGENTS.md:105` and `LAB.md:2340-2342` claim fail-closed behavior that B2/B3 disprove.
- **Minors:** future-dated head-date handling, an HTTP-error-body fixture for the enumeration arm, and the brittle R20 count.

The lab instruction in this run's decision file carries this list, names `PR #854`, and keeps `Closes #803` conditional on all three slices.

### Issues #855/#856/#857 (triaged, unchanged scope plus new evidence)

- **#855:** the dedicated owner-PAT 401 incident tracker; last owner-PAT success 2026-11-15T07:38:13Z, twenty-nine Maintainer batches plus the Auditor and three Curator single forwards, frozen lanes, nine held runs. Owner action is the only unblock: rotate the secret and verify with `gh api user`; the next wake re-tests it. Update #855 after the first successful PAT batch, not before.
- **#856:** `approve-held-runs.sh` turns a 401 into "No held runs remain" because `2>/dev/null` discards the `gh run list` failure and `[ -z "$held" ]` is true; phase 3 never runs. **New evidence:** the curator's 07:35:46Z `PR #862 gone (poll 1)` is the phase-1 sibling: `head_sha=$(gh pr view ... 2>/dev/null)` treats the 401 as a deleted PR and breaks to the repo-wide sweep. Accepted scope now includes both branches: capture the exit status before testing output, return non-zero so the bot-token notify path runs, never print success on a failed read, add the owner-PAT preflight, pin the lines, and add 401/empty/approve-failure/PR-gone fixtures to `silent-stall-audit.sh`; make an all-failed trigger batch loud. Serialized behind #854/#850 on the shared audit surface, alongside #849.
- **#857:** the Auditor/Curator decision-forward fail-open; `auditor.yml:193,195,198` and `curator.yml:234,242,247` wrap the handoff post in `|| echo`, so a 401 leaves the run green. Live instances: the Auditor's 06:51:09Z forward to #860 and the Curator's 07:35:46Z forwards to #862/#859 (plus the earlier 16:07:12Z and 00:07:42Z). The fix should capture each post status, fail the step, avoid the subshell, reuse #856's preflight and #850's board selector, and pin 401/success/absent-decision/board-error fixtures in `silent-stall-audit.sh`.
- **No dispatch now:** #855 is Owner-side; #856/#857/#860 would race the live audit branches and their triggers would 401 anyway. They stay open as work orders, one lab branch at a time.

## Live lanes and their next step

- **#862** (Curator public-surface fix, `Fixes #861`): one head-bound `review` queued on `fe190ad0e` (twenty-ninth batch). On a clean review, run the normal non-protected sequence (`test` then `eval` then PAT sweep); #861 closes only on merge. Do not merge on the reviewer verdict alone.
- **#859** (Curator public-surface fix, `Fixes #858`): one head-bound `review` queued on `d72d7ac9` (twenty-ninth batch), reinforced by the curator's 00:07:31Z audit. Same normal non-protected sequence on a clean verdict; #858 closes only on merge.
- **#854** (protected-path auto-retry scoping, slice 3 + hardening): one `lab` re-queued with the round-1 review list (twenty-ninth batch). On push: the lab workflow forwards a fresh review; only after a clean verdict does the Tester/eval/PAT sequence apply. Do not merge or close #803 before the guard lands.
- **#850** (owner-PAT pager hardening, `Closes #848`): one fresh head-bound `review` re-queued on `9c9bf1bd7` (twenty-ninth batch). When it lands: dispatch `lab` on #849 (owner-PAT helper reads), then #857, then #856, then #860, one branch at a time. Fix its `Closes #848` trailer before any merge.
- **#836** (model/wall capacity umbrella): one `lab` re-queued to replace the retired `glm-5.3-flash-free` ladder rung (twenty-ninth batch), with the refreshed registry line and the stale prompt examples. On push: a fresh review, then the protected-path PAT merge sweep. Do not change the pin or `small_model`; only the rung.
- **#860** (review-lane unreadable state): triaged this run; lab branch after the live #854/#850 lanes clear (shares `opencode-review.yml` and `silent-stall-audit.sh`). Add the 07:35:46Z `PR #862 gone` evidence to #856's fixtures.
- **#857** (decision-forward fail-open): triaged; fixtures now include the 06:51:09Z Auditor forward and the 07:35:46Z Curator forwards; lab branch after #854/#850, one at a time.
- **#849** (owner-PAT helper-read hardening): lands after #850; expanded scope: owner-PAT pagers on the 30-row board read (`gh api --paginate --slurp ... jq flatten`) and allowing `Fixed the bug` without `Fixes`.
- **#856** (approve-held-runs fail-open + phase-1 PR-gone fail-open + all-failed trigger batch reporting + owner-PAT preflight): lands after #854/#850, one lab branch at a time alongside #849/#857/#860 because all touch `silent-stall-audit.sh` and the post-agent PAT surface.
- **#855** (owner-PAT incident tracker): stays open until the Owner rotates the secret and the queue lands; update it after the first successful PAT batch, not before.
- **#848** (premature fix-forward paging): the #850 guard supersedes the older #798-era fix guard; docs in #850 only.
- **#745** (orphaned #798 audit/rebuild + the old #76 Pac-Man scanner): one `lab` rebase retry re-queued (twenty-ninth batch). The branch has not moved since the 07:49Z lost push. After push: verify with `git ls-remote`, dispatch one forward review, and keep #853 open until the verdict. This PR is a distinct co-consumer of the #803/#853 family, not a leftover; it wants a retitle and `Refs #853`.
- **#821 / #823** (Point of Sale staging, live on Pages): parked by Priya. Do not dispatch. If the Owner wants a name change, one `lab` will do it.
- **Open infra/audit backlog (serialized behind the live lanes):** #803 closes with #854; #853 after the #745 audit verdict; #849/#857/#856/#860 after #850; #848 via #850; then #814 (fix-lane false push), #812 (R11 bypass), #815 (non-hermetic audit), #774/#773 (docs accuracy), #831 (PR-head config), #742 (owner-PAT env), #836 (wall/heartbeat capacity plus this run's ladder rung). No new site project is open; do not invent one.
- **Maze Chase standing set:** #582 parent and #655/#657/#659/#661/#677/#678/#683 are slow/frozen; no action unless the Owner asks.
- **Board / health:** #70 is the only board. Every ping ends with the Maintainer sign-off; every escalation names one issue and one concrete next step; no inline trigger tokens anywhere (#775).
- **Eval lane:** route new multi-agent architecture to `eval` only when the Owner asks; no paid runs.

## Serialized queue (re-post these; do not re-decide)

1. `{"action":"lab","pr":854,"instruction":"<the round-1 review findings in the log>"}` - re-posted this run.
2. `{"action":"lab","pr":745,"instruction":"Retry the #745 rebase onto e5cd250c; add Refs #853; no Closes trailer; verify with git ls-remote after the PAT push"}` - re-posted this run.
3. `{"action":"review","pr":850,"head":"9c9bf1bd72fb459388d2985656f6f61735147105"}` - re-posted this run.
4. `{"action":"review","pr":859,"head":"d72d7ac9aa5d08f9c4d35c1dfc1e63cb116571a4"}` - re-posted this run.
5. `{"action":"review","pr":862,"head":"fe190ad0ea200725d460273d83720d84e9a451ad"}` - new this run.
6. `{"action":"lab","issue":836,"instruction":"<replace the retired glm-5.3 rung with a live free model, keep all rungs -free, do not change the pin>"}` - re-posted this run.
7. **Do not duplicate the #855/#856/#857 pings** unless a material change occurs (a dispatch, a lane landing, or a new failure class). The #860 triage (this run) and the 10:52Z #70 note are current; the 10:45:53Z heartbeat marker, the 06:50:21Z auditor audit, and the 04:34:57Z note are the prior ledger entries.
8. After #854's branch push: the forwarded review; after #850's verdict: `lab` on #849, then #857, then #856, then #860; after #850's merge: #804 residuals, docs gaps, #814; after #862's review: `test` then `eval`; after #859's review: `test` then `eval`; after #836's ladder push: verify three live free rungs.

**Do not** re-post a trigger whose target already has a live or queued run from the last 30 minutes, and do not post two lab triggers to the same PR in one run (the workflow dedupes by `(action, target)`).

## Loose ends

1. **The owner token is the top blocker** (see above). Only the Owner can rotate it. #855 is the dedicated tracker; the queue and this file are the recovery path.
2. **Held runs (9):** `43690826057`, `43690826207`, `43690826030` on the #803 branch; `44121917992`, `44121917590`, `44121918001` on the #858 branch; `44480682663`, `44480682570`, `44480682694` on the #862 branch. The NEXT PAT-healthy recover or maintainer run should clear all nine. The "No held runs remain" and "PR #862 gone" messages are fail-opens, not evidence they cleared.
3. **The 08:19 #854 report** is lost from the PR. The blocking findings are in the log and the lab instruction; if the lab pass lands, no re-publication is needed, but the next review should verify each item explicitly.
4. **#745 stale bot review:** after the fix-up, delete the older bot review on the exact commit id if it is still present; filter by `commit_id`, not just author.
5. **#850's body** has `Closes #848` (not on a `Refs` trailer). Normalize at merge; do not add a second trailer.
6. **#853's body chronology** says the work was lost and then reimplemented; prepend one sentence "Update: 2026-11-15T06:08Z, the work was reimplemented locally; the ONLY thing left is the push + retry (re-dispatched 07:38Z)" so a cold reader can tell current from history. Only worth a `lab` edit once #745 lands.
7. **#849 scope mismatch:** its premise still quotes the old body text; the expanded scope lives in #850's body. When #850 lands, add the expansion to #849's body first. #856's fail-open criteria are a separate sibling and should not be folded into #849 silently; #857 and #860 are further siblings on the forward and review-lane surfaces.
8. **The `INFRA-STATUS` block on #70** is stale (10-21) but still factually fine for #70. If a real infra change happens, refresh it in the same post.
9. **Dependabot PRs** remain no-ops: the "all Dependabot PRs" on-ramp only fires for open PRs and none are open.
10. **No merge this run:** no PR carries the full head-fresh Tester plus Evaluator chain; #862 and #859 have no review, #850 and #854 have no verdict after their latest heads, and #745 is dirty.
11. **Curator tick:** the 07:11:50-07:35:50Z run was green with #861/#862 and the 401ed forwards; the next 6h tick is due ~13:11Z. Do not dispatch a manual curator run unless the gap passes ~16h or a tick crashes.
12. **Auditor schedule:** the 06:23-06:51Z run was green with #860 and the 401ed forward; the next daily tick is expected ~06:00Z tomorrow. No dispatch.
13. **Quota wall:** the last wall death was the 11-17 08:55 schedule run; the one fresh-run recovery at 08:57 worked. Neither the 21:07 heartbeat nor the 23:34 schedule tick nor the 02:39 heartbeat nor the 04:29 schedule tick nor this 10:45 heartbeat walled. If the next tick walls again, do not dispatch a same-IP agent; let the next tick/heartbeat re-arm (one attempt is the cap, #820/#836).
14. **Heartbeat path is healthy:** the 10:45:11Z recover tick saw the stamp 371m old, posted its marker, and dispatched this run. This is a real session; keep the exact `Last updated:` stamp so the heartbeat does not misfire.
15. **Model registry drift:** now 92 models / 12 free; `glm-5.3-flash-free` retired and rung 3 is dead; `jev-1.13-free` is newly listed. The pin and rung 2 are live; rung 3 is re-queued to #836. `tidepool-alpha-free` remains an untested 1M alternative; `beam-free` and `nemotron-3.5-lightning-free` are the more durable choices. The auditor's "12 free" count now matches the live read.
16. **#862 and #859 are the only fresh lanes in four days:** do not let them sit untriaged, but do not merge on #857/#860 fail-open evidence or before the normal review/test/eval chain.
17. **The ladder is 2/3 until #836 lands:** no production impact while the pin and rung 2 are live, but do not let the dead rung sit past the next successful PAT window; verify the replacement is present in the live registry before calling it done.
18. **Maintainer cron throttling:** the 20-minute schedule produced no run between 04:29 and the 10:45 heartbeat. The heartbeat is the only liveness path during throttle; the scheduled liveness gap belongs to #836/#831, not a manual dispatch.
19. **Stale prompt examples:** `maintainer.md:333` and `labengineer.md:78` still list the retired glm id, and `maintainer.yml:581` omits design-ux/visual/motion. Folded into the #836 lab instruction; no new issue.

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
- Every incident-scope counter must capture the payload first, never `|| true` after the pipeline, and must treat an unreadable head/enumeration as fail-closed (the #854 review B2/B3 classes; the #856 phase-1/#860 review-lane instances are the same rule). The leak guard and the PAT redaction work is the #798 family; the new code must not regress it. #856/#857/#860 add the same rule for the held-run query, the decision-forward step, and the review state read; the 06:51:09Z, 07:35:46Z, and 07:35:46Z live instances are the current evidence.
- The delegation ledger is capped at 3-8 lines; it must list the subagents actually used, one line each, plus a skills line. Do not claim delegation that did not happen.
- The reviewer rejects fixes that claim fail-closed while keeping a silent fallback; the docs must state the exact boundary.
- No em dashes in repo files; no direct workflow edits outside a `lab` route.

### Contract and memory

- Output contract each run: `.maintainer/decision.json` (array), `.maintainer/comment.md` (empty unless a target exists), `.maintainer/log-entry.md` (FULL day file: existing bytes + today's entry), `.maintainer/state.md` (this file), `.maintainer/personality.md` only if identity evolved, `.maintainer/emergency.json` only under the failed-lab + halted-production contract.
- The log is append-only; the 2026-11-16 day file closed at 516 lines, the 2026-11-17 at 526 lines, the 2026-11-18 at 718 lines, and the 2026-11-19 file now carries the 02:39, 04:29, and 10:45 entries (303 lines). The publish step isolates the delta against the materialized baseline and recomposes on a fresh tip with keep-both semantics. Never write a partial day file.
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

1. Read this run's (`44508670731`) `Run /oc triggers as owner` step. If the six posts landed, do not re-post; work #862's and #859's reviews, #850's review, #854's forwarded review, #745's push, and #836's ladder push; clear the nine held runs with the approve sweep. If they 401ed (twenty-ninth batch), the queue above stays and is re-posted as the live credential test on the next wake; this run's 10:52Z note carries the twenty-eighth batch outcome plus the unchanged state, so the next note should carry the twenty-ninth.
2. If #862's or #859's review starts: on approval, dispatch `test` (then `eval` in a later run), then the PAT merge sweep; #861/#858 close only on merge.
3. If #854's lab pass pushed: watch the forwarded review; verify B1-B3/H1-H5 and the `Refs #853`/`Closes #803` rewrite. If it died, preserve its decision file and re-dispatch once.
4. If #850's review is live/queued, do not post another; when it completes, route `lab` on #849, then #857, then #856, then #860, one branch at a time. Verify the `Closes #848` trailer.
5. If #836's ladder pass pushed: verify the replacement rung is live and free in the registry and the ladder has three live rungs; then the normal protected-path review and PAT merge sweep.
6. If #745's retry pushed, verify with `git ls-remote`, dispatch the fresh review, keep #853 open.
7. Verify the board invariant, allowlist count, model registry/ladder, Pages, and curator/auditor schedule health; if clean, stand by. Do not invent work. Do not re-post the #855/#856/#857 pings.
8. If a new real failure appears, check for a wall/401 before routing; both are known classes.

## Open questions

1. Did this run's twenty-ninth batch land? (Six posts: lab #854, lab #745, review #850, review #859, review #862, lab #836; unknown until the trigger step runs after the agent.)
2. When will the Owner rotate the secret? (Last success 2026-11-15T07:38:13Z; the twenty-eighth batch at 04:34:58Z, the auditor's 06:51:09Z forward, and the curator's 07:35:46Z forwards say no as of then.)
3. Will #862 pass review untouched as a copy-only two-line fix, or will the reviewer require a docs/release-note sync?
4. Should #860, #856, and #857 be one consolidated fail-loud owner-PAT change or separate sequential lab branches once #854/#850 lands? (Current plan: separate scopes, one branch at a time on the shared audit surface.)
5. Will the #854 lab pass fit one round, or will the mutation harness plus the three fail-closed classes need a second?
6. Does the #745 branch still merge cleanly onto `e5cd250c`, and is its scope still distinct from #804?
7. Which free model should become ladder rung 3: `nemotron-3.5-lightning-free`, `beam-free`, `jev-1.13-free`, `longcat-2.5-free` (1M context), or `tidepool-alpha-free`? The lab pass will verify the chosen one against the live registry.
8. Will the throttled maintainer cron keep leaving ~6-hour gaps that only the recover heartbeat covers, and will the Owner take the capacity decision (#836/#831) and the scratch canary?
