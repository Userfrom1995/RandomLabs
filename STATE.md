# STATE

Last updated: 2026-11-17T22:43Z by run 44192141777

(This was a heartbeat wake at 22:39:17Z on main `e5cd250c`. The 18:18 schedule run's trigger step 401ed all four owner-PAT posts at 18:26:13Z, the eighteenth consecutive rejected batch, while its bot-token #70 note, #859 handoff note, and memory commit landed. This run re-posts the same four-item queue as the nineteenth live credential test and posts one #70 incident note through the bot token. Main is `e5cd250c`; `maintainer/logs` is `7c9b4faa2`; production Pages is green; the board invariant, allowlist and model pins hold; no emergency declaration exists or is warranted.)

## TL;DR for the next Hephaestus

- This was a **heartbeat** wake (`44192141777`, 22:39:17Z); the recover arm `44192051141` saw the 18:25Z stamp 253m old and dispatched it per issue #836. Do not treat it as a duplicate trigger.
- **New since the 18:25 entry:** the 18:18 run's four posts 401ed at 18:26:13Z (eighteenth batch); its 18:26:11Z #70 note and 18:26:12Z #859 handoff note landed via the bot token; its memory commit `7c9b4faa2` landed 18:26:08Z. Nothing else moved: no head, no PR, no issue, no owner comment.
- This run's decision list **re-posts the #854 lab, #745 lab, #850 review, and #859 review** as the nineteenth live credential test, plus **one #70 incident note**.
- **Open PRs are five** (#859 still unreviewed); open non-PR issues are 27. #859 is the only lane created after 2026-11-15.
- **Start the next session by reading this run's `Run /oc triggers as owner` step.** If the four posts landed, work them; if they 401ed, the queue stays here and is re-posted on the next wake.
- **Do not re-post the #855/#856/#857/#858 triage notes** without a material change, and do not dispatch two branches on the shared `silent-stall-audit.sh` / `curator.yml` surface at once.

## Who I am

Hephaestus, the Maintainer of this repository. I do not write project code; I keep the pipeline full and the gates honest, and I route every change through the Lab Engineer, reviewer, tester, auditors, curators, and eval. "I'll do it myself" should lose to "route it." I act only when the owner expressly asks or routine triage is due. I use subagents for parallel read-only investigation only when it materially saves time, and the capped 3-8-line delegation ledger is mandatory where required.

## Right now (surveyed 22:39-22:43Z on 2026-11-17)

### GitHub state

- **Main:** `e5cd250c126efa8c86a084b3d72ade3bcf9bdc5b` ("curate: sync Maze Chase release status and correct the Pac-Man retirement claim", Fixes #851; 2026-11-15T06:31:53Z), atop `620bb8d2e` (the #798 lab merge). **`maintainer/logs`:** `7c9b4faa23752e93e587dae7f5e7283b9c5c24a2` ("maintainer: memory update 2026-11-17T18:26Z", 18:26:08Z), the 18:18 schedule run's memory commit.
- **Open PRs (5):** **#859** head `d72d7ac9aa5d08f9c4d35c1dfc1e63cb116571a4`, branch `opencode/issue858-curate-umbra-count-copy`, body `Fixes #858`, files `film/index.html` and `index.html`, MERGEABLE/UNSTABLE, created 16:06:12Z, one bot handoff comment at 18:26:12Z, no reviews, only the GitGuardian check green; #854 head `090452f27c575a31e617bc5c7083c6ee441b0653`, MERGEABLE/UNSTABLE, body `Closes #803`, 6 protected-path files (`.github/scripts/silent-stall-audit.sh`, `opencode.yml`, `opencode-review.yml`, `curator.yml`, `AGENTS.md`, `LAB.md`), branch `opencode/issue803-20261115060707`; #850 head `9c9bf1bd72fb459388d2985656f6f61735147105`, MERGEABLE/CLEAN, body `Closes #848`; #821 head `dce109e4479b3cf2801a1b0127ea98778e58c398`, CLEAN, parked since 2026-11-07; #745 head `7a04fa4a96e1982ac307ca40973fed29379def0b`, CONFLICTING/DIRTY (compare: diverged, 5 ahead / 375 behind main), body with no `Closes` trailer.
- **Open issues (27 non-PR):** #42, #70, #582, #655, #657, #659, #661, #677, #678, #683, #742, #773, #774, #792, #803, #812, #814, #815, #831, #836, #848, #849, #853, #855, #856, #857, and #858 (the Curator issue, linked to PR #859 by `Fixes #858`). No untriaged issue: #858's open linked PR covers it under the review lane.
- **Board invariant holds:** only #70 carries `lab-health` among open issues and only #70 has the exact title `Lab Health & Audit Logs`; #42 is the only other labelled issue (`brainstorm`). #855/#856/#857/#858 deliberately stay unlabelled.
- **Latest comments:** the 22:39:16Z heartbeat marker on #70 is newest; before it the 18:26:12Z #859 handoff note, the 18:26:11Z `### Owner-token incident update, 2026-11-17 18:22Z`, the 14:43:03Z #70 note, the 14:38:08Z heartbeat marker, and the 09:06:09Z #857 triage. No owner comment since 2026-11-15T07:38:09Z. This run's ping adds one #70 note through the bot token.
- **Branch tips:** `git ls-remote` confirmed main `e5cd250c` and `maintainer/logs` `7c9b4faa2`; the PR API confirms #859 `d72d7ac9`, #854 `090452f27`, #850 `9c9bf1bd7`, #745 `7a04fa4a`, #821 `dce109e4`; no new project branch and no recovery due (newest closed PR is #852, merged 11-15).

### Runs, CI and queues

- **This run:** `44192141777`, `workflow_dispatch` heartbeat, 22:39:17Z on `main` `e5cd250c`, in progress at survey close, agent alive.
- **Heartbeat source:** recover `44192051141`, `schedule`, 22:38:42Z, success. Its log says "last real session 253m ago, threshold 90m, issue #836"; it posted the 22:39:16Z board marker and dispatched this run at 22:39:17Z; the 22:39:24Z fan-out `44192160109` skipped.
- **Previous Maintainer:** `44146406934`, `schedule`, 18:18:26-18:26:20Z, success. Its trigger step 401ed all four posts at 18:26:13Z (18th batch); its #70 note landed 18:26:11Z and its #859 note 18:26:12Z; its memory commit `7c9b4faa2` landed 18:26:08Z; its approve sweep printed the #856 fail-open at 18:26:16Z.
- **Curator:** `44116789220`, `schedule`, 15:39:14-16:07Z, success. Created issue #858 at 16:05:53Z and PR #859 at 16:06:12Z; decision `[{"action":"review","pr":859}]`; its review forward 401ed at 16:07:12Z; its approve sweep printed "No held runs remain" (the #856 fail-open). The 6h cadence is platform-throttled but healthy; the next tick is due.
- **Auditor:** `44035127049`, `schedule`, 06:58:21-07:22:51Z, success; daily audit on #70 at 07:22:11Z says "not green" (owner PAT the only blocker; 69 runs, 0 failures/timeouts; models/docs/scripts/setup clean; Pages green) and filed #857. Its forward to #857 401ed at 07:22:46Z. Next daily tick expected ~05:18Z tomorrow.
- **Quota-wall source:** `44050829404` (schedule, 08:55:05-08:57:13Z) died in its agent step at 08:55:40Z with `AI_APICallError: Free usage limit reached`, wrote no decision file, and triggered the one allowed fresh-run recovery (`44051095370`), which succeeded. No new wall since.
- **Failures in the last 60 runs:** none red. Non-green entries are the expected `cancelled` maintainer fan-outs from 2026-11-15T07:38Z, the six held `action_required` runs, and the quota-wall death inside an otherwise-green run; this run is the only in-progress entry.
- **Held (`action_required`) runs (6):** `43690826057` (opencode-pr-trigger), `43690826207` (Deploy static site), `43690826030` (maintainer) on `opencode/issue803-20261115060707`, created 2026-11-15T07:38:12Z; plus `44121917992` (opencode-pr-trigger), `44121917590` (Deploy static site), `44121918001` (maintainer) on `opencode/issue858-curate-umbra-count-copy`, created 2026-11-17T16:06:20Z. Only an owner-PAT approve sweep can clear them.
- **Queued runs:** the same 7 inert historical entries (`42971888736` and siblings from 11-11, `37344324101`, `36101155868`, ...) on long-dead branches; no new queued trigger.
- **Pages:** production `43686637154` green on `e5cd250c` (deployment `7799767158`, 06:42:07Z on 11-15) and the live URL returns 200; #850 preview `43677055969` green on `9c9bf1bd7`; #854 preview `43690826207` and #859 preview `44121917590` are held.
- **Model registry:** 88 models, 11 free (`beam-free`, `deepseek-v4.1-flash-free`, `flint-40b-free`, `glm-5.3-flash-free`, `hy4-flash-free`, `iceman-free`, `inkling-2-small-free`, `longcat-2.5-free`, `mimo-v2.6-flash-free`, `nemotron-3.5-lightning-free`, `nemotron-3.5-super-vl-free`); the pin and `small_model` are `opencode/deepseek-v4.1-flash-free`; all three ladder rungs (`deepseek-v4.1-flash-free`, `mimo-v2.6-flash-free`, `glm-5.3-flash-free`) are live and free; `maintainer.yml:384` `REQUESTED_MODEL` matches. No dispatch.
- **Allowlist:** `maintainer.yml:42` lists 19 workflows; all 20 live workflow `name:` fields extracted this run match exactly those 19 plus the self-excluded `maintainer`. Zero missing, zero extra.
- **Workspace note:** the checkout is the trusted default-branch commit (main `e5cd250c`), working tree clean. No protected-path edits, no model edit (`opencode.json` still pins `opencode/deepseek-v4.1-flash-free` for model and small model), no branch commands, no `emergency.json`. All work is routed through the decision file.

### The owner-token incident (blocking, open)

- **Last confirmed good use:** 2026-11-15T07:38:09-07:38:13Z (the #803 push and the review trigger post).
- **Rejections:** 07:49:33Z (the #745 force-push and the lab forward), 07:53:43Z, 08:19:19Z, 14:05:10Z, 14:18:36Z, 15:37:21Z, 19:56:51Z, 20:38:48Z, 23:52:02Z, 00:25:43Z, 05:13:15Z, 07:23:36Z, 13:52:26Z, 17:20:28Z, 23:18:38Z, 00:56:44Z, 05:15:18Z, 09:06:10Z (the sixteenth batch), 14:43:04Z (the seventeenth batch: lab #854, lab #745, review #850), 07:22:46Z (the Auditor's single forward to #857), 16:07:12Z (the Curator's single review forward to #859), and **18:26:13Z (the eighteenth batch: lab #854, lab #745, review #850, review #859)**. This run's posts are the nineteenth batch.
- The 18:26:16Z approve sweep printed the known #856 fail-open; a bot-token read this run still lists all six held runs as `action_required`.
- A running job's secret context is fixed at job start, so this 22:39 job's re-posts will work only if the Owner refreshed the secret before 22:39:17Z. They fail harmlessly on the tolerant trigger step, and the queue survives here.
- The proactive pings and memory commits use the bot token, so they prove only the bot path. **#855 is the dedicated incident tracker; #70 keeps the rolling ledger.** The fail-loud code work is #856 (approve-held-runs fail-open + all-failed trigger batch reporting + owner-PAT preflight) and #857 (Auditor/Curator decision-forward fail-open).
- **Action for the next session:** test the PAT only through the designed trigger posts or an approve sweep; never print or copy the token. If the posts land, work through the queue; if not, re-record the failure and stand by. The next #70 note is due only after another comparable gap or a real change; this run's 22:42Z note and the 07:22:11Z daily audit are current.

### PR #859 / issue #858 (Curator lane)

- **#858:** "[Curator] Refresh the stale Umbra test count and correct the Hearthlight noscript copy", created 16:05:53Z by the Curator; no labels, no comments. It records the stale `455/455` Umbra card count (`index.html:170`, current suite 470/470) and the reversed "stage above" noscript wording (`film/index.html:22`).
- **#859:** "curate: refresh Umbra test count and fix Hearthlight noscript copy", head `d72d7ac9`, body `Fixes #858`, branch `opencode/issue858-curate-umbra-count-copy`, two public-surface files only. Non-protected paths, so the normal review -> test/OS -> eval -> PAT merge chain applies; no emergency or lab route is needed.
- **State:** one bot handoff comment (18:26:12Z), no reviews, only GitGuardian green; MERGEABLE/UNSTABLE because the Pages/PR-trigger checks are held. The curator's review forward 401ed at 16:07:12Z and this run re-queues the first head-bound review.
- **On merge:** #858 closes via `Fixes #858`; the Curator PR is not a new project, so the daily shipping limit does not apply.

### The #854 round-1 review verdict (lab, report lost)

The reviewer's blocking findings, preserved from `43690826495` (the full signed report is in that run's log):

- **B1:** slice 3 (the #853 silent-deferral guard) is absent, and the body has no `Refs #853`. Required: detect owner/bot deferral comments ("next window", "follows later", "when ... lands") on open PRs with no later dispatch/run in a bounded window; post one deduped re-arm note to #70 with **no trigger token**; resolve the board by exact title `Lab Health & Audit Logs` or the oldest open non-PR lab-health issue; adopt `.github/scripts/health-board.sh` from #850 when it lands (still absent on main `e5cd250c`); fixtures for deferral/no-dispatch, deferral/dispatch, duplicate, and title fallback. Rewrite `Closes #803` to `Refs #803` until all three slices are present, and name "PR #854" in the body prose.
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
- **Triage comment landed** at 09:06:09Z (the 08:57 quota-recovery run); #857 has one comment and no labels. Do not re-ping without a material change.
- **Live evidence:** the curator's 16:07:12Z lost review forward is the exact forward-step class #857 describes, on a fresh PR. Fold it into the #857 fixture set; no new issue.
- **Serialized:** #854's open branch also edits `curator.yml`, and #849/#856 share `silent-stall-audit.sh`; route one lab branch at a time after #854/#850 lands. Keep #857 unlabelled (#70 remains the only board).

### Issues #855/#856 (triaged, unchanged)

- **#855:** the dedicated owner-PAT 401 incident tracker; last owner-PAT success 2026-11-15T07:38:13Z, eighteen Maintainer batches plus the Auditor and Curator single forwards, frozen lanes, six held runs. Owner action is the only unblock: rotate the secret and verify with `gh api user`; the next wake re-tests it. Update #855 after the first successful PAT batch, not before.
- **#856:** `approve-held-runs.sh` turns a 401 into "No held runs remain" because `2>/dev/null` discards the `gh run list` failure and `[ -z "$held" ]` is true; phase 3 never runs. Accepted scope: capture the exit status before testing output, return non-zero so the bot-token notify path runs, never print the success line on a failed read, add the owner-PAT preflight, pin the lines and add 401/empty/approve-failure fixtures to `silent-stall-audit.sh`, and make an all-failed trigger batch loud. Serialized behind #854/#850 on the shared audit surface, alongside #849.
- **No dispatch now:** #855 is Owner-side; #856/#857 would race the live audit branches and their triggers would 401 anyway. They stay open as work orders.

## Live lanes and their next step

- **#859** (new Curator public-surface fix, `Fixes #858`): one fresh head-bound `review` queued on `d72d7ac9` (nineteenth batch). On a clean review, run the normal non-protected sequence (`test` then `eval` then PAT sweep); #858 closes only on merge. Do not merge on the reviewer verdict alone.
- **#854** (protected-path auto-retry scoping, slice 3 + hardening): one `lab` re-queued with the round-1 review list (nineteenth batch). On push: the lab workflow forwards a fresh review; only after a clean verdict does the Tester/eval/PAT sequence apply. Do not merge or close #803 before the guard lands.
- **#850** (owner-PAT pager hardening, `Closes #848`): one fresh head-bound `review` re-queued on `9c9bf1bd7`. When it lands: dispatch `lab` on #849 (owner-PAT helper reads on the 30-row board + `Fixed the bug` without `Fixes` detection), then the #857 forward-step guard and #856, then the #804 residuals, docs gaps, and #814. Fix its `Closes #848` trailer before any merge.
- **#857** (decision-forward fail-open): triaged; add the 16:07:12Z curator evidence to its fixtures; lab branch after #854/#850, one at a time.
- **#849** (owner-PAT helper-read hardening): lands after #850; expanded scope: owner-PAT pagers on the 30-row board read (`gh api --paginate --slurp ... jq flatten`) and allowing `Fixed the bug` without `Fixes`.
- **#856** (approve-held-runs fail-open + all-failed trigger batch reporting + owner-PAT preflight): lands after #854/#850, one lab branch at a time alongside #849/#857 because all touch `silent-stall-audit.sh` and the post-agent PAT surface.
- **#855** (owner-PAT incident tracker): stays open until the Owner rotates the secret and the queue lands; update it after the first successful PAT batch, not before.
- **#848** (premature fix-forward paging): the #850 guard supersedes the older #798-era fix guard; docs in #850 only.
- **#745** (orphaned #798 audit/rebuild + the old #76 Pac-Man scanner): one `lab` rebase retry re-queued (nineteenth batch). The branch has not moved since the 07:49Z lost push. After push: verify with `git ls-remote`, dispatch one forward review, and keep #853 open until the verdict. This PR is a distinct co-consumer of the #803/#853 family, not a leftover; it wants a retitle and `Refs #853`.
- **#821 / #823** (Point of Sale staging, live on Pages): parked by Priya. Do not dispatch. If the Owner wants a name change, one `lab` will do it.
- **Open infra/audit backlog (serialized behind the live lanes):** #803 closes with #854; #853 after the #745 audit verdict; #849/#857/#856 after #850; #848 via #850; then #814 (fix-lane false push), #812 (R11 bypass), #815 (non-hermetic audit), #774/#773 (docs accuracy), #831 (PR-head config), #742 (owner-PAT env), #836 (wall/heartbeat capacity). No new site project is open; do not invent one.
- **Maze Chase standing set:** #582 parent and #655/#657/#659/#661/#677/#678/#683 are slow/frozen; no action unless the Owner asks.
- **Board / health:** #70 is the only board. Every ping ends with the Maintainer sign-off; every escalation names one issue and one concrete next step; no inline trigger tokens anywhere (#775).
- **Eval lane:** route new multi-agent architecture to `eval` only when the Owner asks; no paid runs.

## Serialized queue (re-post these; do not re-decide)

1. `{"action":"lab","pr":854,"instruction":"<the round-1 review findings in the log>"}` - re-posted this run.
2. `{"action":"lab","pr":745,"instruction":"Retry the #745 rebase onto e5cd250c; add Refs #853; no Closes trailer; verify with git ls-remote after the PAT push"}` - re-posted this run.
3. `{"action":"review","pr":850,"head":"9c9bf1bd72fb459388d2985656f6f61735147105"}` - re-posted this run.
4. `{"action":"review","pr":859,"head":"d72d7ac9aa5d08f9c4d35c1dfc1e63cb116571a4"}` - re-posted this run.
5. **Do not duplicate the #855/#856/#857 triage pings** unless a material change occurs (a dispatch, a lane landing, or a new failure class). The #857 triage (09:06:09Z) is current; the 22:42Z #70 note and 07:22:11Z daily audit are the current incident entries.
6. After #854's branch push: the forwarded review; after #850's verdict: `lab` on #849, then #857, then #856; after #850's merge: #804 residuals, docs gaps, #814; after #859's review: `test` then `eval`.

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
11. **Schedule health:** the curator's latest tick was 15:39:14-16:07Z today (`44116789220`) and produced #858/#859; its 6h cadence is platform-throttled but under the ~24h alarm. The auditor ran today 06:58-07:22Z (`44035127049`); the next daily tick is expected around 05:18Z tomorrow. No dispatch.
12. **Quota wall:** the 08:55 schedule run died on the daily free-usage wall; the one fresh-run recovery at 08:57 worked. If the next tick walls again, do not dispatch a same-IP agent; let the next tick/heartbeat re-arm (one attempt is the cap, #820/#836).
13. **Heartbeat path is healthy:** the 22:38:42Z recover tick saw a 253m-old stamp, posted the marker, and dispatched this run. This is expected per #836. The next real session must keep the exact `Last updated:` stamp so the heartbeat does not misfire.
14. **Model registry drift:** now 88 models / 11 free (was 86/11); the free set is unchanged and all three ladder rungs are live/free, so no action; the next weekly model review can consider `longcat-2.5-free` (1M context) and `nemotron-3.5-super-vl-free`.
15. **#859 is the first fresh lane in three days:** do not let it sit untriaged, but do not merge it on #857's fail-open evidence or before the normal review/test/eval chain.

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
- Every incident-scope counter must capture the payload first, never `|| true` after the pipeline, and must treat an unreadable head/enumeration as fail-closed (the #854 review B2/B3 classes). The leak guard and the PAT redaction work is the #798 family; the new code must not regress it. #856/#857 add the same rule for the held-run query and the decision-forward step; the 16:07:12Z curator forward is the latest live instance.
- The delegation ledger is capped at 3-8 lines; it must list the subagents actually used, one line each, plus a skills line. Do not claim delegation that did not happen.
- The reviewer rejects fixes that claim fail-closed while keeping a silent fallback; the docs must state the exact boundary.
- No em dashes in repo files; no direct workflow edits outside a `lab` route.

### Contract and memory

- Output contract each run: `.maintainer/decision.json` (array), `.maintainer/comment.md` (empty unless a target exists), `.maintainer/log-entry.md` (FULL day file: existing bytes + today's entry), `.maintainer/state.md` (this file), `.maintainer/personality.md` only if identity evolved, `.maintainer/emergency.json` only under the failed-lab + halted-production contract.
- The log is append-only; the 2026-11-16 day file closed at 516 lines. Today's 2026-11-17 file carries the 00:51 schedule entry, the 05:07 heartbeat entry, the 08:55 quota-wall marker, the 08:57 quota-recovery entry, the 14:38 heartbeat entry, the 18:18 schedule entry, and this run's entry. The publish step isolates the delta against the materialized baseline and recomposes on a fresh tip with keep-both semantics. Never write a partial day file.
- The log entry must include the state snapshot, decisions + rationale, callbacks, the run link, and open questions. The state must stay honest about what is verified vs expected.
- The memory branch is shared tooling; do not delete or rewrite prior entries.

### Persistent facts

- Main is a single fast-forwardable history; the repo pushes are the owner PAT's job; the orphan guard must never rewrite main.
- The board is #70; its exact title is the resolver anchor; the `lab-health` label is exclusive among open issues. #855 is the incident tracker, not a board.
- The recover arm is the heartbeat source; the maintainer cron is throttled. A stale STATE stamp is the wake signal; a skipped fan-out is not a real session; every real session must carry the exact liveness stamp.
- The free-usage wall is a real class (47m35s queue death on 07:03:41Z on 11-15; the 08:55:40Z death today); one fresh-run attempt is the only re-dispatch, and a same-IP retry must not be dispatched.
- The owner PAT is shared by the maintainer, review, curator, recover, auditor, and lab forward/push steps; one invalid secret explains the whole 401 cluster. Do not confuse it with the bot token.

## Next run

1. Read this run's (`44192141777`) `Run /oc triggers as owner` step. If the four posts landed, do not re-post; work #859's review, #854's forwarded review, #850's review, and #745's push; clear the six held runs with the approve sweep. If they 401ed, the queue above stays and is re-posted as the live credential test on the next wake; the 22:42Z note and 07:22:11Z audit are current.
2. If #859's review starts: on approval, dispatch `test` (then `eval` in a later run), then the PAT merge sweep; #858 closes only on merge.
3. If #854's lab pass pushed: watch the forwarded review; verify B1-B3/H1-H5 and the `Refs #853`/`Closes #803` rewrite. If it died, preserve its decision file and re-dispatch once.
4. If #850's review is live/queued, do not post another; when it completes, route `lab` on #849, then #857, then #856, one branch at a time. Verify the `Closes #848` trailer.
5. If #745's retry pushed, verify with `git ls-remote`, dispatch the fresh review, keep #853 open.
6. Verify the board invariant, allowlist count, model pin, and curator/auditor schedule health; if clean, stand by. Do not invent work. Do not re-post the #855/#856/#857/#858 pings.
7. If a new real failure appears, check for a wall/401 before routing; both are known classes.

## Open questions

1. Did this run's nineteenth batch land? (Four posts: lab #854, lab #745, review #850, review #859; unknown until the trigger step runs after the agent.)
2. When will the Owner rotate the secret? (No owner-PAT success since 2026-11-15T07:38:13Z; the 14:43:04Z seventeenth batch, the 16:07:12Z curator forward, and the 18:26:13Z eighteenth batch say no as of then.)
3. Will the #854 lab pass fit one round, or will the mutation harness plus the three fail-closed classes need a second?
4. Does the #745 branch still merge cleanly onto `e5cd250c`, and is its scope still distinct from #804?
5. Should #849, #856, and #857 be separate sequential lab branches once #850 lands, given they share `silent-stall-audit.sh` and `curator.yml`? (Current plan: one at a time, separate scopes.)
6. Will the curator keep producing PRs on its throttled cadence, and will each one's review forward stay blocked until the Owner rotates the secret? (#859 is the first case.)
7. Will the throttled curator/auditor ticks keep re-arming on their own, and will the Owner take the capacity decision (#836/#831) and the scratch canary?
