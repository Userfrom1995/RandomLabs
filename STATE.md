# STATE

Last updated: 2026-11-19T02:46Z by run 44445869130

(This was a `workflow_dispatch` heartbeat (`44445869130`, 02:39:07Z on `main` `e5cd250c`), dispatched by the recover tick `44445803030` after it saw the last real session 177m old. Since the 23:41 entry the 23:34 schedule run's trigger step 401ed all five queue posts at 23:39:24Z (the twenty-sixth consecutive rejected batch); its 23:39:23Z #70 note and 23:39:20Z memory commit `7b32d9f6c` landed. The curator's overdue tick then ran green 23:59:36-00:07:46Z with a single review decision on #859, posted a fresh audit on #859 at 00:07:31Z, and had its review forward rejected with HTTP 401 at 00:07:42Z while the run stayed green (the #857 fail-open, second live instance). The model registry is unchanged at 89 models / 11 free with `glm-5.3-flash-free` still absent, so ladder rung 3 is still dead. This run re-posts the same five-item queue as the twenty-seventh live credential test and adds one #70 ledger note. Main is `e5cd250c`; `maintainer/logs` is `7b32d9f6c`; production Pages is green; the board invariant and allowlist hold; no emergency declaration exists or is warranted.)

## TL;DR for the next Hephaestus

- This was a **heartbeat** wake (`44445869130`, 02:39:07Z on `main` `e5cd250c`); the notification carries the #836 heartbeat reason.
- **New since the 23:41 entry:** the 23:34 run's trigger step 401ed all five posts at 23:39:24Z (twenty-sixth batch); its 23:39:23Z #70 note and 23:39:20Z memory commit `7b32d9f6c` landed. The curator ran 23:59:36-00:07:46Z, decided a single review on #859, posted the 00:07:31Z fresh audit confirming both defects still exist on main, and its forward 401ed at 00:07:42Z. The registry is unchanged at 89/11 with glm absent. No PR head, issue, owner comment, page deployment, or new failure class moved.
- Model registry: **89 models / 11 free**, `glm-5.3-flash-free` absent; pin and rung 2 live, rung 3 dead and the #836 lab item is re-posted.
- This run's decision list **re-posts the #854 lab, #745 lab, #850 review, #859 review, and #836 lab** as the twenty-seventh live credential test, plus **one #70 ledger note** carrying the twenty-sixth batch and the curator forward 401.
- **Start the next session by reading this run's `Run /oc triggers as owner` step.** If the five posts landed, work them; if they 401ed (twenty-seventh batch), the queue stays here and is re-posted on the next wake.
- **Do not re-post the #855/#856/#857/#859 pings** without a material change, and do not dispatch two branches on the shared `silent-stall-audit.sh` / `curator.yml` surface at once.

## Who I am

Hephaestus, the Maintainer of this repository. I do not write project code; I keep the pipeline full and the gates honest, and I route every change through the Lab Engineer, reviewer, tester, auditors, curators, and eval. "I'll do it myself" should lose to "route it." I act only when the owner expressly asks or routine triage is due. I use subagents for parallel read-only investigation only when it materially saves time, and the capped 3-8-line delegation ledger is mandatory where required.

## Right now (surveyed 02:39-02:44Z on 2026-11-19)

### GitHub state

- **Main:** `e5cd250c126efa8c86a084b3d72ade3bcf9bdc5b` ("curate: sync Maze Chase release status and correct the Pac-Man retirement claim", Fixes #851; 2026-11-15T06:31:53Z), atop `620bb8d2e` (the #798 lab merge). **`maintainer/logs`:** `7b32d9f6cd4f1338ba4a5548df21afb5ccd8c6a4` ("maintainer: memory update 2026-11-18T23:39Z", 23:39:20Z), the 23:34 schedule run's memory commit; below it `0a2b96395` (21:13:32Z), `0a36ec2e1` (17:41:23Z), and `8f0aa39e7` (13:09:31Z).
- **Open PRs (5):** **#859** head `d72d7ac9aa5d08f9c4d35c1dfc1e63cb116571a4`, branch `opencode/issue858-curate-umbra-count-copy`, body `Fixes #858`, files `film/index.html` and `index.html` (1+/1- each), MERGEABLE/UNSTABLE, created 16:06:12Z on 11-17, 2 comments (the 18:26:12Z bot handoff and the 00:07:31Z fresh curator audit confirming both defects still exist on `main` and that this PR is the correct remediation), 0 reviews, only the GitGuardian check green; #854 head `090452f27c575a31e617bc5c7083c6ee441b0653`, MERGEABLE/UNSTABLE, body `Closes #803`, 6 protected-path files (`.github/scripts/silent-stall-audit.sh`, `opencode.yml`, `opencode-review.yml`, `curator.yml`, `AGENTS.md`, `LAB.md`), branch `opencode/issue803-20261115060707`, 3 comments (last the round-1 verdict note at 14:18:35Z on 11-15), 0 reviews; #850 head `9c9bf1bd72fb459388d2985656f6f61735147105`, MERGEABLE/CLEAN, body `Closes #848`, 49 comments (last 11-15 08:01Z), 0 reviews; #821 head `dce109e4479b3cf2801a1b0127ea98778e58c398`, CLEAN, parked since 2026-11-07, 50 comments; #745 head `7a04fa4a96e1982ac307ca40973fed29379def0b`, branch `opencode/lab-742-owner-pat-env-sanitization`, CONFLICTING/DIRTY (compare: diverged, 5 ahead / 375 behind main), body with no `Closes` trailer, 67 comments (last 11-15 08:01Z), 0 reviews. No head moved and no review verdict appeared on any of them.
- **Open issues (27 non-PR):** #42, #70, #582, #655, #657, #659, #661, #677, #678, #683, #742, #773, #774, #792, #803, #812, #814, #815, #831, #836, #848, #849, #853, #855, #856, #857, and #858. No new issue since #858 (16:05:53Z on 11-17). No untriaged issue: #858 has 0 comments but its open linked PR #859 covers it under the review lane; #659/#677/#678 are the known 10-18 Maze Chase standing set under #582.
- **Board invariant holds:** only #70 carries `lab-health` among open issues and only #70 has the exact title `Lab Health & Audit Logs`; #42 is the only other labelled issue (`brainstorm`). #855/#856/#857/#858 deliberately stay unlabelled.
- **Latest comments at survey time:** the 02:39:05Z heartbeat marker is newest; before it the 00:07:31Z curator audit on #859, the 23:39:23Z #70 incident note, the 21:13:34Z #70 note, and the 21:07:50Z heartbeat marker. No owner comment since 2026-11-15T07:38:09Z. This run adds one #70 note after the agent step.
- **Branch tips:** `gh api` confirms main `e5cd250c` and `maintainer/logs` `7b32d9f6c`; the PR API still resolves #859 `d72d7ac9`, #854 `090452f27`, #850 `9c9bf1bd7`, #745 `7a04fa4a`, #821 `dce109e4`; no new project branch and no recovery due (newest closed PR is #852, merged 11-15).

### Runs, CI and queues

- **This run:** `44445869130`, `workflow_dispatch` heartbeat, 02:39:07Z on `main` `e5cd250c`, in progress at survey close; the only notification payload is the #836 heartbeat reason.
- **Heartbeat source:** `44445803030`, `opencode-recover` `schedule`, 02:38:33Z, success. It logged "Maintainer heartbeat is stale (last real session 177m ago, threshold 90m, issue #836)", posted the 02:39:05Z marker, and dispatched this run. No heartbeat dispatch since; expected per #836.
- **Previous Maintainer:** `44421873287`, `schedule`, 23:34:17-23:39:31Z, success. Its trigger step 401ed all five posts at 23:39:24Z (twenty-sixth batch); its 23:39:23Z #70 note and 23:39:20Z memory commit `7b32d9f6c` landed; its approve sweep printed the #856 fail-open.
- **Curator:** `44425336956`, `schedule`, 2026-11-18T23:59:36-2026-11-19T00:07:46Z, success. Decision file `[{"action": "review", "pr": 859}]`; its 00:07:31Z fresh audit on #859 confirms both defects; its forward `HTTP 401: Bad credentials` at 00:07:42Z left the run green (the #857 class); "No held runs remain" is the #856 fail-open. The 8h42m gap from 15:17Z is the shortest observed yet, and the lane is healthy; the next 6h tick is due ~05:59Z.
- **Auditor:** `44250787176`, `schedule`, 2026-11-18T06:21:56-06:43:41Z, success. It posted the 06:43:04Z daily audit on #70: only the known owner-PAT blocker, no new code/model-config/provider-retirement/stall defect, no new issue. Its registry count (88/12) is stale versus the live 89/11 read. The next daily tick is expected ~06:00Z today and is not yet due.
- **Review/lab/test/eval lanes:** no `opencode-review`, `Lab Engineer`, `opencode-test`, `opencode-eval`, or `opencode-peros-test` run has started since 2026-11-16T00:00Z. Every lane is frozen on the owner-PAT 401.
- **Failures in the last 60 runs:** none failure/timed_out/startup_failure. Non-green entries are the expected `cancelled` maintainer fan-outs from 2026-11-15T07:38Z, the six held `action_required` runs, the skipped fan-outs, and the quota-wall death inside an otherwise-green run on 11-17.
- **Held (`action_required`) runs (6):** `43690826057` (opencode-pr-trigger), `43690826207` (Deploy static site), `43690826030` (maintainer) on `opencode/issue803-20261115060707`, created 2026-11-15T07:38:12Z; plus `44121917992` (opencode-pr-trigger), `44121917590` (Deploy static site), `44121918001` (maintainer) on `opencode/issue858-curate-umbra-count-copy`, created 2026-11-17T16:06:20Z. Only an owner-PAT approve sweep can clear them.
- **Queued runs:** the same 7 inert historical entries (`42971888736` and siblings from 11-11, `37344324101`, `36101155868`, ...) on long-dead branches; no new queued trigger.
- **Pages:** production deployment `7799767158` on `e5cd250c` is successful (run `43686637154`, 2026-11-15T06:42:07Z) and https://userfrom1995.github.io/RandomLabs/ returns HTTP 200; #850 preview `43677055969` green on `9c9bf1bd7`; #854 preview `43690826207` and #859 preview `44121917590` are held.
- **Model registry:** **89 models, 11 free** at 02:41Z (`beam-free`, `deepseek-v4.1-flash-free`, `flint-40b-free`, `hy4-flash-free`, `iceman-free`, `inkling-2-small-free`, `longcat-2.5-free`, `mimo-v2.6-flash-free`, `nemotron-3.5-lightning-free`, `nemotron-3.5-super-vl-free`, and `tidepool-alpha-free`). **`glm-5.3-flash-free` remains absent**, so ladder rung 3 is dead; the pin and `small_model` are `opencode/deepseek-v4.1-flash-free` (live) and rung 2 `mimo-v2.6-flash-free` is live, so the ladder is 2/3.
- **Allowlist:** `maintainer.yml:42` lists 19 workflows; all 20 live workflow `name:` fields extracted this run match exactly those 19 plus the self-excluded `maintainer`. Zero missing, zero extra.
- **Workspace note:** the checkout is the trusted default-branch commit (main `e5cd250c`), working tree clean at start. No protected-path edits, no model edit (`opencode.json` still pins `opencode/deepseek-v4.1-flash-free` for model and small model), no branch commands, no `emergency.json`. All work is routed through the decision file.

### New evidence since the 23:41 entry

- The 23:34 schedule run's `Run /oc triggers as owner` step began at 23:39:24Z and logged five failures, each `gh: Bad credentials (HTTP 401)`: the `lab` instruction on #854 with the round-1 findings, the #745 rebase instruction, `/oc review (head 9c9bf1bd72fb459388d2985656f6f61735147105)` on #850, `/oc review (head d72d7ac9aa5d08f9c4d35c1dfc1e63cb116571a4)` on #859, and the ladder-rung `lab` instruction on #836. That is the twenty-sixth consecutive rejected batch; the last confirmed owner-PAT success remains 2026-11-15T07:38:09-07:38:13Z, and no lab or review workflow started after 23:39:24Z.
- The same run's bot-token paths worked: its 23:39:23Z #70 note and 23:39:20Z memory commit `7b32d9f6c`. Its approve sweep printed "No held runs remain" (the #856 fail-open); a bot-token read this run still lists all six held runs as `action_required`.
- The curator's late tick ran 23:59:36-00:07:46Z (run `44425336956`, success). It decided a single review on #859, posted the 00:07:31Z fresh audit confirming both public-surface defects are still present on `main` (470/470 Umbra suite; "stage below" wording), and then its forward 401ed at 00:07:42Z while the run stayed green. That is the #857 decision-forward fail-open with a second live instance; no review started and #859 still has 0 reviews.
- The recover tick ran 02:38:33Z (run `44445803030`, success), saw the last real session 177m old, posted the 02:39:05Z heartbeat marker, and dispatched this run at 02:39:07Z. The 02:39:13Z maintainer fan-out `44445881242` skipped because the recover run succeeded.
- The registry is unchanged at 89/11 with no glm id; `tidepool-alpha-free` is still listed and remains an untested alternative. No PR head moved, no new PR, no new issue, no owner comment, no new page deployment, and no new failure class.
- A running job's secret context is fixed at job start, so this 02:39 job's re-posts work only if the Owner refreshed the secret before 02:39:07Z. They fail harmlessly on the tolerant trigger step, and the queue survives here.

### The owner-token incident (blocking, open)

- **Last confirmed good use:** 2026-11-15T07:38:09-07:38:13Z (the #803 push and the review trigger post).
- **Rejections:** 07:49:33Z (the #745 force-push and the lab forward), 07:53:43Z, 08:19:19Z, 14:05:10Z, 14:18:36Z, 15:37:21Z, 19:56:51Z, 20:38:48Z, 23:52:02Z, 00:25:43Z, 05:13:15Z, 07:23:36Z, 13:52:26Z, 17:20:28Z, 23:18:38Z, 00:56:44Z, 05:15:18Z, 09:06:10Z (the sixteenth batch), 14:43:04Z (the seventeenth batch: lab #854, lab #745, review #850), 07:22:46Z (the Auditor's single forward to #857), 16:07:12Z (the Curator's single review forward to #859), 18:26:13Z (the eighteenth batch: lab #854, lab #745, review #850, review #859), 22:43:08Z (the nineteenth batch), 01:07:27Z (the twentieth batch), 03:58:34Z (the twenty-first batch), 08:46:34Z (the twenty-second batch), 13:09:34Z (the twenty-third batch), 17:41:27Z (the twenty-fourth batch), 21:13:35Z (the twenty-fifth batch), 23:39:24Z (the twenty-sixth batch), and 00:07:42Z (the Curator's second review forward to #859). This run's posts are the twenty-seventh batch, with the same five items.
- The 23:39:27Z approve sweep again printed the known #856 fail-open; a bot-token read this run still lists all six held runs as `action_required`. The curator's 00:07:42Z forward is the second live #857 instance.
- The proactive pings and memory commits use the bot token, so they prove only the bot path. **#855 is the dedicated incident tracker; #70 keeps the rolling ledger.** The fail-loud code work is #856 (approve-held-runs fail-open + all-failed trigger batch reporting + owner-PAT preflight) and #857 (Auditor/Curator decision-forward fail-open).
- **Action for the next session:** test the PAT only through the designed trigger posts or an approve sweep; never print or copy the token. If the posts land, work the queue; if not, re-record the failure and stand by. The next #70 note should carry the twenty-seventh outcome if it fails; this run's note carries the twenty-sixth and the curator's 00:07:42Z forward.
- **Do not escalate to the emergency contract:** this is an Owner-side credential rotation, not a broken lab, and no failed lab run exists to cite.

### Model-ladder retirement (open, queued)

- **Finding:** `opencode/glm-5.3-flash-free`, the third rung in `.github/actions/opencode-run/model-ladder.txt`, is absent from the live registry. Verified again with a fresh `curl -s https://opencode.ai/zen/v1/models` read at 02:41Z: 89 models / 11 free, `glm-5.3-flash-free` absent. The file still lists it as rung 3.
- **Impact:** none yet. The pin (`opencode/deepseek-v4.1-flash-free`) and rung 2 (`opencode/mimo-v2.6-flash-free`) are live and free, so the resolver only reaches the dead rung if both die. The ladder must nevertheless stay fully live (issue #591 contract, audit R6).
- **Action:** one `{"action":"lab","issue":836}` re-posted this run with a refreshed registry line: replace rung 3 with a live free model, preferably `opencode/nemotron-3.5-lightning-free` (verify `opencode/longcat-2.5-free` and `opencode/tidepool-alpha-free` as alternatives), keep every rung `-free`, do not touch the pin or `small_model`, re-run the resolver and the ladder audit. It will 401 under the same PAT until the Owner rotates the secret.
- **Target choice:** #836 is the open model/capacity resilience umbrella (free-usage wall and recovery); #591, the original ladder issue, is closed. No new issue is warranted for a one-line rung replacement.

### PR #859 / issue #858 (Curator lane)

- **#858:** "[Curator] Refresh the stale Umbra test count and correct the Hearthlight noscript copy", created 16:05:53Z on 11-17 by the Curator; no labels, no comments. It records the stale `455/455` Umbra card count (`index.html:170`, current suite 470/470) and the reversed "stage above" noscript wording (`film/index.html:22`).
- **#859:** "curate: refresh Umbra test count and fix Hearthlight noscript copy", head `d72d7ac9`, body `Fixes #858`, branch `opencode/issue858-curate-umbra-count-copy`, two public-surface files only. Non-protected paths, so the normal review -> test/OS -> eval -> PAT merge chain applies; no emergency or lab route is needed.
- **State:** two bot comments (the 18:26:12Z handoff and the 00:07:31Z fresh curator audit confirming both defects still exist on `main` and that this PR is the correct remediation), no reviews, only GitGuardian green; MERGEABLE/UNSTABLE because the Pages/PR-trigger checks are held. The curator's 16:07:12Z and 00:07:42Z review forwards both 401ed, and this run re-queues the head-bound review (twenty-seventh batch).
- **On merge:** #858 closes via `Fixes #858`; the Curator PR is not a new project, so the daily shipping limit does not apply.

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

### Issue #857 (new Auditor issue, triaged)

- **#857:** "Auditor and Curator decision-forward steps swallow owner-PAT 401 and stay green, losing the immediate handoff." Evidence: `auditor.yml:193,195,198` and `curator.yml:234,242,247` wrap the handoff post in `|| echo`, so a 401 (or any post failure) leaves the step and run green; the board lookup also treats an API error as "no board"; the `jq | while` subshell would swallow a plain `exit 1` too. Distinct from #856 (approve-held-runs + Maintainer trigger batch) and #849 (post-agent helper reads). Accepted; the fix should capture each post status, fail the step, avoid the subshell, reuse #856's owner-PAT preflight and #850's board selector, and pin 401/success/absent-decision/board-error fixtures in `silent-stall-audit.sh`.
- **Triage comment landed** at 09:06:09Z on 11-17 (the 08:57 quota-recovery run); #857 has one comment and no labels. Do not re-ping without a material change.
- **Live evidence:** the curator's 16:07:12Z (11-17) and 00:07:42Z (11-19) lost review forwards are the exact forward-step class #857 describes, on a fresh PR. Fold both into the #857 fixture set; no new issue.
- **Serialized:** #854's open branch also edits `curator.yml`, and #849/#856 share `silent-stall-audit.sh`; route one lab branch at a time after #854/#850 lands. Keep #857 unlabelled (#70 remains the only board).

### Issues #855/#856 (triaged, unchanged)

- **#855:** the dedicated owner-PAT 401 incident tracker; last owner-PAT success 2026-11-15T07:38:13Z, twenty-six Maintainer batches plus the Auditor and two Curator single forwards, frozen lanes, six held runs. Owner action is the only unblock: rotate the secret and verify with `gh api user`; the next wake re-tests it. Update #855 after the first successful PAT batch, not before.
- **#856:** `approve-held-runs.sh` turns a 401 into "No held runs remain" because `2>/dev/null` discards the `gh run list` failure and `[ -z "$held" ]` is true; phase 3 never runs. Accepted scope: capture the exit status before testing output, return non-zero so the bot-token notify path runs, never print the success line on a failed read, add the owner-PAT preflight, pin the lines and add 401/empty/approve-failure fixtures to `silent-stall-audit.sh`, and make an all-failed trigger batch loud. Serialized behind #854/#850 on the shared audit surface, alongside #849.
- **No dispatch now:** #855 is Owner-side; #856/#857 would race the live audit branches and their triggers would 401 anyway. They stay open as work orders.

## Live lanes and their next step

- **#859** (Curator public-surface fix, `Fixes #858`): one fresh head-bound `review` queued on `d72d7ac9` (twenty-seventh batch), reinforced by the curator's 00:07:31Z audit. On a clean review, run the normal non-protected sequence (`test` then `eval` then PAT sweep); #858 closes only on merge. Do not merge on the reviewer verdict alone.
- **#854** (protected-path auto-retry scoping, slice 3 + hardening): one `lab` re-queued with the round-1 review list (twenty-seventh batch). On push: the lab workflow forwards a fresh review; only after a clean verdict does the Tester/eval/PAT sequence apply. Do not merge or close #803 before the guard lands.
- **#850** (owner-PAT pager hardening, `Closes #848`): one fresh head-bound `review` re-queued on `9c9bf1bd7` (twenty-seventh batch). When it lands: dispatch `lab` on #849 (owner-PAT helper reads on the 30-row board + `Fixed the bug` without `Fixes` detection), then the #857 forward-step guard and #856, then the #804 residuals, docs gaps, and #814. Fix its `Closes #848` trailer before any merge.
- **#836** (model/wall capacity umbrella): one `lab` re-queued to replace the retired `glm-5.3-flash-free` ladder rung (twenty-seventh batch). On push: a fresh review, then the protected-path PAT merge sweep. Do not change the pin or `small_model`; only the rung.
- **#857** (decision-forward fail-open): triaged; add the 16:07:12Z and 00:07:42Z forward evidence to its fixtures; lab branch after #854/#850, one at a time.
- **#849** (owner-PAT helper-read hardening): lands after #850; expanded scope: owner-PAT pagers on the 30-row board read (`gh api --paginate --slurp ... jq flatten`) and allowing `Fixed the bug` without `Fixes`.
- **#856** (approve-held-runs fail-open + all-failed trigger batch reporting + owner-PAT preflight): lands after #854/#850, one lab branch at a time alongside #849/#857 because all touch `silent-stall-audit.sh` and the post-agent PAT surface.
- **#855** (owner-PAT incident tracker): stays open until the Owner rotates the secret and the queue lands; update it after the first successful PAT batch, not before.
- **#848** (premature fix-forward paging): the #850 guard supersedes the older #798-era fix guard; docs in #850 only.
- **#745** (orphaned #798 audit/rebuild + the old #76 Pac-Man scanner): one `lab` rebase retry re-queued (twenty-seventh batch). The branch has not moved since the 07:49Z lost push. After push: verify with `git ls-remote`, dispatch one forward review, and keep #853 open until the verdict. This PR is a distinct co-consumer of the #803/#853 family, not a leftover; it wants a retitle and `Refs #853`.
- **#821 / #823** (Point of Sale staging, live on Pages): parked by Priya. Do not dispatch. If the Owner wants a name change, one `lab` will do it.
- **Open infra/audit backlog (serialized behind the live lanes):** #803 closes with #854; #853 after the #745 audit verdict; #849/#857/#856 after #850; #848 via #850; then #814 (fix-lane false push), #812 (R11 bypass), #815 (non-hermetic audit), #774/#773 (docs accuracy), #831 (PR-head config), #742 (owner-PAT env), #836 (wall/heartbeat capacity plus this run's ladder rung). No new site project is open; do not invent one.
- **Maze Chase standing set:** #582 parent and #655/#657/#659/#661/#677/#678/#683 are slow/frozen; no action unless the Owner asks.
- **Board / health:** #70 is the only board. Every ping ends with the Maintainer sign-off; every escalation names one issue and one concrete next step; no inline trigger tokens anywhere (#775).
- **Eval lane:** route new multi-agent architecture to `eval` only when the Owner asks; no paid runs.

## Serialized queue (re-post these; do not re-decide)

1. `{"action":"lab","pr":854,"instruction":"<the round-1 review findings in the log>"}` - re-posted this run.
2. `{"action":"lab","pr":745,"instruction":"Retry the #745 rebase onto e5cd250c; add Refs #853; no Closes trailer; verify with git ls-remote after the PAT push"}` - re-posted this run.
3. `{"action":"review","pr":850,"head":"9c9bf1bd72fb459388d2985656f6f61735147105"}` - re-posted this run.
4. `{"action":"review","pr":859,"head":"d72d7ac9aa5d08f9c4d35c1dfc1e63cb116571a4"}` - re-posted this run.
5. `{"action":"lab","issue":836,"instruction":"<replace the retired glm-5.3 rung with a live free model, keep all rungs -free, do not change the pin>"}` - re-posted this run.
6. **Do not duplicate the #855/#856/#857/#859 pings** unless a material change occurs (a dispatch, a lane landing, or a new failure class). The #857 triage (09:06:09Z) is current; the 02:39:05Z heartbeat marker, the 00:07:31Z curator audit, and the 23:39:23Z #70 note are the current ledger entries; this run adds the 02:45Z note carrying the twenty-sixth batch and the curator forward 401.
7. After #854's branch push: the forwarded review; after #850's verdict: `lab` on #849, then #857, then #856; after #850's merge: #804 residuals, docs gaps, #814; after #859's review: `test` then `eval`; after #836's ladder push: verify three live free rungs.

**Do not** re-post a trigger whose target already has a live or queued run from the last 30 minutes, and do not post two lab triggers to the same PR in one run (the workflow dedupes by `(action, target)`).

## Loose ends

1. **The owner token is the top blocker** (see above). Only the Owner can rotate it. #855 is the dedicated tracker; the queue and this file are the recovery path.
2. **Held runs `43690826057`, `43690826207`, `43690826030`** on the #854 branch and **`44121917992`, `44121917590`, `44121918001`** on the #859 branch need an owner-PAT approve sweep. The NEXT PAT-healthy recover or maintainer run should clear all six. The "No held runs remain" messages are the #856 fail-open, not evidence they cleared.
3. **The 08:19 #854 report** is lost from the PR. The blocking findings are in the log and the lab instruction; if the lab pass lands, no re-publication is needed, but the next review should verify each item explicitly.
4. **#745 stale bot review:** after the fix-up, delete the older bot review on the exact commit id if it is still present; filter by `commit_id`, not just author.
5. **#850's body** has `Closes #848` (not on a `Refs` trailer). Normalize at merge; do not add a second trailer.
6. **#853's body chronology** says the work was lost and then reimplemented; prepend one sentence "Update: 2026-11-15T06:08Z, the work was reimplemented locally; the ONLY thing left is the push + retry (re-dispatched 07:38Z)" so a cold reader can tell current from history. Only worth a `lab` edit once #745 lands.
7. **#849 scope mismatch:** its premise still quotes the old body text; the expanded scope lives in #850's body. When #850 lands, add the expansion to #849's body first. #856's fail-open criteria are a separate sibling and should not be folded into #849 silently; #857 is a third sibling on the forward-step surface.
8. **The `INFRA-STATUS` block on #70** is stale (10-21) but still factually fine for #70. If a real infra change happens, refresh it in the same post.
9. **Dependabot PRs** remain no-ops: the "all Dependabot PRs" on-ramp only fires for open PRs and none are open.
10. **No merge this run:** no PR carries the full head-fresh Tester plus Evaluator chain; #850 and #854 have no verdict after their latest heads, #859 has no review, and #745 is dirty.
11. **Curator tick:** the 23:59:36-00:07:46Z run was green with a #859 review decision and a fresh #859 audit; its 00:07:42Z forward 401ed (known owner-PAT). The next 6h tick is due ~05:59Z. Do not dispatch a manual curator run unless the gap passes ~16h or a tick crashes.
12. **Schedule health:** the auditor's latest daily tick is 2026-11-18 06:21-06:43Z (`44250787176`), successful, no new issue; the next is expected ~06:00Z today. The last maintainer heartbeat was `44445803030` at 02:38Z, which dispatched this run; the previous real session was the 23:34 schedule run. No dispatch.
13. **Quota wall:** the last wall death was the 11-17 08:55 schedule run; the one fresh-run recovery at 08:57 worked. Neither the 21:07 heartbeat nor the 23:34 schedule tick nor this 02:39 heartbeat walled. If the next tick walls again, do not dispatch a same-IP agent; let the next tick/heartbeat re-arm (one attempt is the cap, #820/#836).
14. **Heartbeat path is healthy:** the 02:38:33Z recover tick saw the stamp 177m old, posted its marker, and dispatched the 02:39 run. This run is a real session; keep the exact `Last updated:` stamp so the heartbeat does not misfire.
15. **Model registry drift:** still 89 models / 11 free; `glm-5.3-flash-free` retired and rung 3 is dead. `tidepool-alpha-free` remains listed and untested. The pin and rung 2 are live; rung 3 is re-queued to #836. The auditor's 11-18 "12 free" count is stale; use the live read. The next weekly model review can weigh `longcat-2.5-free` (1M context), `nemotron-3.5-super-vl-free`, and `tidepool-alpha-free`.
16. **#859 is the only fresh lane in four days:** do not let it sit untriaged, but do not merge it on #857's fail-open evidence or before the normal review/test/eval chain.
17. **The ladder is 2/3 until #836 lands:** no production impact while the pin and rung 2 are live, but do not let the dead rung sit past the next successful PAT window; verify the replacement is present in the live registry before calling it done.
18. **Curator forward evidence:** the 00:07:42Z `HTTP 401: Bad credentials` on a green run is the second live #857 instance; it belongs in #857's fixture set and shows why the fail-loud work order matters. No new issue; #857 stays the home.

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
- The trigger step's 401s are annotations only and the approve sweep fails open on the same 401; a green Maintainer run is not evidence that the queue landed. #856/#857 are the fix work orders.

### Review, test, and merge gates

- The reviewer verdict is advisory and does not itself authorize a merge. Merge only when the Tester's owner-authored `/oc approve-test` is head-fresh, no newer `/oc fix` findings exist, and the Evaluator's head-bound `approve-eval` is on the PR. Protected-path PRs merge only through the workflow's PAT merge step.
- Required gate sequence after a successful review on a non-protected PR: `test` (OS chosen by the touched paths) THEN `{"action":"eval"}` THEN a PAT sweep, then the bot verification. Never post a `test` trigger before the review verdict is on the PR, and never post a test/eval pair on the same PR in one run.
- Protected paths (`.github/workflows/**`, `.github/agents/**`, `opencode.json`, `AGENTS.md`, `LAB.md`) require the Lab Engineer route; the Maintainer's PAT step may push only under a valid emergency declaration.
- A green audit is not a merge approval. Deploy keys, workflow names, and mutable actions are pinned and trusted at the default branch; the Tester/PAT gates enforce.

### Audit lane rules (current, from #798 and its reviews)

- `silent-stall-audit.sh` is the mutation harness; R19/R20/R21/R23/R28/R30/R32/R36 are part of the shell parser/classifier guard story. A full run is ~10 minutes; do not accept a partial "fast" run when a real change needs the full harness.
- Every incident-scope counter must capture the payload first, never `|| true` after the pipeline, and must treat an unreadable head/enumeration as fail-closed (the #854 review B2/B3 classes). The leak guard and the PAT redaction work is the #798 family; the new code must not regress it. #856/#857 add the same rule for the held-run query and the decision-forward step; the 00:07:42Z curator forward is the latest live instance.
- The delegation ledger is capped at 3-8 lines; it must list the subagents actually used, one line each, plus a skills line. Do not claim delegation that did not happen.
- The reviewer rejects fixes that claim fail-closed while keeping a silent fallback; the docs must state the exact boundary.
- No em dashes in repo files; no direct workflow edits outside a `lab` route.

### Contract and memory

- Output contract each run: `.maintainer/decision.json` (array), `.maintainer/comment.md` (empty unless a target exists), `.maintainer/log-entry.md` (FULL day file: existing bytes + today's entry), `.maintainer/state.md` (this file), `.maintainer/personality.md` only if identity evolved, `.maintainer/emergency.json` only under the failed-lab + halted-production contract.
- The log is append-only; the 2026-11-16 day file closed at 516 lines, the 2026-11-17 at 526 lines, the 2026-11-18 at 718 lines, and the 2026-11-19 file opens with the 02:39 entry. The publish step isolates the delta against the materialized baseline and recomposes on a fresh tip with keep-both semantics. Never write a partial day file.
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

1. Read this run's (`44445869130`) `Run /oc triggers as owner` step. If the five posts landed, do not re-post; work #859's review, #854's forwarded review, #850's review, #836's ladder push, and #745's push; clear the six held runs with the approve sweep. If they 401ed (twenty-seventh batch), the queue above stays and is re-posted as the live credential test on the next wake; the 23:39 note carries the twenty-sixth batch and this run's 02:45 note carries the twenty-sixth outcome plus the curator forward, so the next note should carry the twenty-seventh.
2. If #859's review starts: on approval, dispatch `test` (then `eval` in a later run), then the PAT merge sweep; #858 closes only on merge.
3. If #854's lab pass pushed: watch the forwarded review; verify B1-B3/H1-H5 and the `Refs #853`/`Closes #803` rewrite. If it died, preserve its decision file and re-dispatch once.
4. If #850's review is live/queued, do not post another; when it completes, route `lab` on #849, then #857, then #856, one branch at a time. Verify the `Closes #848` trailer.
5. If #836's ladder pass pushed: verify the replacement rung is live and free in the registry and the ladder has three live rungs; then the normal protected-path review and PAT merge sweep.
6. If #745's retry pushed, verify with `git ls-remote`, dispatch the fresh review, keep #853 open.
7. Verify the board invariant, allowlist count, model registry/ladder, Pages, and curator/auditor schedule health; if clean, stand by. Do not invent work. Do not re-post the #855/#856/#857/#859 pings.
8. If a new real failure appears, check for a wall/401 before routing; both are known classes.

## Open questions

1. Did this run's twenty-seventh batch land? (Five posts: lab #854, lab #745, review #850, review #859, lab #836; unknown until the trigger step runs after the agent.)
2. When will the Owner rotate the secret? (Last success 2026-11-15T07:38:13Z; the twenty-fifth batch at 21:13:35Z, the twenty-sixth at 23:39:24Z, and the curator's 00:07:42Z forward say no as of then.)
3. Will the #854 lab pass fit one round, or will the mutation harness plus the three fail-closed classes need a second?
4. Does the #745 branch still merge cleanly onto `e5cd250c`, and is its scope still distinct from #804?
5. Should #849, #856, and #857 be separate sequential lab branches once #850 lands, given they share `silent-stall-audit.sh` and `curator.yml`? (Current plan: one at a time, separate scopes.)
6. Will the curator's next tick (~05:59Z) arrive inside the observed envelope, and will it decide `[]` or find real drift?
7. Which free model should become ladder rung 3: `nemotron-3.5-lightning-free`, `longcat-2.5-free` (1M context), or `tidepool-alpha-free`? The lab pass will verify the chosen one against the live registry.
8. Will the throttled curator/auditor ticks keep re-arming on their own, and will the Owner take the capacity decision (#836/#831) and the scratch canary?
