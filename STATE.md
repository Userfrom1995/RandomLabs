# STATE

Last updated: 2026-11-16T17:12Z by run 43915408266

(This was the 17:09Z schedule wake. The 13:47Z heartbeat's three re-posts 401ed at 13:52:26Z, the eleventh consecutive rejected batch, so no lane has moved since the 07:38Z freeze on 11-15. This run's decision list re-posts the same `lab` #854, `lab` #745 and `review` #850 queue as the live credential test; no new issue, PR, failure, or Owner comment appeared, and no new #70 note was posted because the 13:52:25Z note is only 3.3h old and the eleventh 401 is the anticipated branch. Main is `e5cd250c`; `maintainer/logs` is `61e690887`; production Pages is green; the board invariant and allowlist hold; the curator ran clean at 15:08-15:38Z and the scheduled tor-cli CI was green at 15:58-16:00Z; no emergency declaration exists or is warranted.)

## TL;DR for the next Hephaestus

- This was a **schedule** wake (`43915408266`, 17:09:43Z on main `e5cd250c`); no event payload, no quota-wall intake skip.
- **New evidence since the last entry:** the 13:47 run's trigger step 401ed all three posts at 13:52:26.657-660Z (the eleventh consecutive batch). No owner-PAT call has succeeded since 2026-11-15T07:38:13Z.
- This run's decision list **re-posts the same three-item queue**. **No #70 incident note** (the 13:52:25Z note is 3.3h old; no material change) and **no #855/#856 re-ping** (#855 updates after the first successful PAT batch; #856 is serialized behind #854/#850).
- **No new failure, no new PR, no head movement, no owner comment since 07:38:09Z on 11-15.** Held/queued sets unchanged. Main, `maintainer/logs` (`61e690887`) and production Pages are stable. The curator and tor-cli schedules both ran green today.
- **Start the next session by reading this run's `Run /oc triggers as owner` step.** If the three posts landed, do not re-post them and work the lanes. If they 401ed, the queue stays here; re-post as the live credential test and keep the #70 note discipline.
- **Do not re-post the #855/#856 triage pings** without a material change, and do not dispatch two branches on the shared `silent-stall-audit.sh` surface at once.

## Who I am

Hephaestus, the Maintainer of this repository. I do not write project code; I keep the pipeline full and the gates honest, and I route every change through the Lab Engineer, reviewer, tester, auditors, curators, and eval. "I'll do it myself" should lose to "route it." I act only when the owner expressly asks or routine triage is due. I use subagents for parallel read-only investigation only when it materially saves time, and the capped 3-8-line delegation ledger is mandatory where required.

## Right now (surveyed 17:09-17:15Z on 2026-11-16)

### GitHub state

- **Main:** `e5cd250c126efa8c86a084b3d72ade3bcf9bdc5b` ("curate: sync Maze Chase release status and correct the Pac-Man retirement claim", Fixes #851; 2026-11-15T06:31:53Z), atop `620bb8d2e` (the #798 lab merge). **`maintainer/logs`:** `61e690887d9e738af3e3ef249e7b18a01a2d9d78` ("maintainer: memory update 2026-11-16T13:51Z", committed 13:52:00Z), the 13:47 run's memory commit.
- **Open PRs (4):** #854 head `090452f27c575a31e617bc5c7083c6ee441b0653`, MERGEABLE/UNSTABLE, body `Closes #803`, 6 protected-path files (`.github/scripts/silent-stall-audit.sh`, `opencode.yml`, `opencode-review.yml`, `curator.yml`, `AGENTS.md`, `LAB.md`), branch `opencode/issue803-20261115060707`, last comment the 14:18:35Z bot findings ping; #850 head `9c9bf1bd72fb459388d2985656f6f61735147105`, MERGEABLE/CLEAN, body `Closes #848`, last comment the 08:01:35Z bot "queued, not live" note; #745 head `7a04fa4a96e1982ac307ca40973fed29379def0b`, CONFLICTING/DIRTY, body `Refs #742` (no Closes), last comment the 08:01:34Z bot lost-push note; #821 head `dce109e44`, CLEAN, parked since 2026-11-07. No head moved since the 07:15 survey.
- **Open issues (25 non-PR):** #42, #70, #582, #655, #657, #659, #661, #677, #678, #683, #742, #773, #774, #792, #803, #812, #814, #815, #831, #836, #848, #849, #853, #855, #856. No new issue since #856 (2026-11-16T05:41:33Z) and no untriaged issue (both #855 and #856 carry their triage note; the old Maze Chase #677/#678/#659 have no comments but are the intentional standing set).
- **Board invariant:** only #70 carries `lab-health` among open issues, and only #70 has the exact title `Lab Health & Audit Logs`; #42 is the only other labelled issue (`brainstorm`).
- **Latest comments:** the 13:52:25Z `### Owner-token incident update, 2026-11-16 13:50Z` on #70 (bot, no trigger token) is newest; before it the 13:46:46Z heartbeat marker, the 07:23:35Z #856 triage, 07:23:34Z #855 triage, 05:41:52Z Auditor daily audit, and 05:13:14Z incident note. No owner comment since 2026-11-15T07:38:09Z.
- **Branch tips:** `git ls-remote` confirmed main `e5cd250c`, `maintainer/logs` `61e690887`, #854 `090452f27`, #850 `9c9bf1bd7`, #745 `7a04fa4a`, #821 `dce109e4`.

### Runs, CI and queues

- **This run:** `43915408266`, `schedule`, 17:09:43Z, in progress at survey close.
- **Previous Maintainer:** `43879071018`, heartbeat `workflow_dispatch`, 13:46:48-13:52:31Z, success. Its trigger step 401ed all three posts at 13:52:26Z; its approve sweep printed the #856 fail-open "No held runs remain" at 13:52:28Z; its #70 note posted at 13:52:25Z; its memory commit `61e690887` reached `maintainer/logs` at 13:52:00Z.
- **Curator:** `43893149996` (schedule, 15:08:22-15:38:42Z) success with decision `[]`. This is the delayed tick (platform throttling), not a code failure. No dispatch.
- **tor-cli:** `43902377714` (schedule, 15:58:58-16:00:55Z) success; all six jobs green (parser fuzz, cross-compile, three OS build-vet-test, best-effort tor lifecycle). Routine project CI; no triage.
- **Maintainer fan-outs:** `43898585084` (15:38:46Z, from curator) and `43902763039` (16:01:00Z, from tor-cli) both skipped as designed.
- **Auditor:** last daily `43809323905` (schedule, 05:18:03-05:42:36Z) success; next daily tick expected around 05:00Z tomorrow.
- **Failures in the last 40 runs:** none new. The only non-green entry is the 11-15 cancelled maintainer fan-out; the three held `action_required` runs are not failures.
- **Held (`action_required`) runs:** `43690826057` (opencode-pr-trigger), `43690826207` (Deploy static site), `43690826030` (maintainer), all created 2026-11-15T07:38:12Z on `opencode/issue803-20261115060707`. Still held; only an owner-PAT approve sweep can clear them.
- **Queued runs:** 7 inert historical entries (`42971888736` and siblings from 11-11, `37344324101`, `36101155868`, ...) on long-dead branches; no new queued trigger.
- **Pages:** production `43686637154` green on `e5cd250c` (deployment `7799767158`, 06:42:07Z on 11-15); #850 preview `43677055969` green on `9c9bf1bd7`; #854 preview is the held run above.
- **Model registry:** 87 models, 12 free; pin and small model `opencode/deepseek-v4.1-flash-free`; the registry lists ids unprefixed and all three ladder rungs (`deepseek-v4.1-flash-free`, `mimo-v2.6-flash-free`, `glm-5.3-flash-free`) are in the live free set; `maintainer.yml:384` `REQUESTED_MODEL` matches. No dispatch.
- **Allowlist:** `maintainer.yml` lists 19 workflows; the live repo has 20 workflow files, exactly those 19 plus the self-excluded `maintainer` (the three platform-managed workflows are `dynamic/` entries, not files). Zero missing, zero extra.
- **Workspace note:** this is a schedule wake; the checkout is the trusted default-branch commit (main `e5cd250c`). No protected-path edits, no model edit (`opencode.json` still pins `opencode/deepseek-v4.1-flash-free` for model and small model). No emergency file. All work is routed through the decision file.

### The owner-token incident (blocking, open)

- **Last confirmed good use:** 2026-11-15T07:38:09-07:38:13Z (the #803 push and the review trigger post).
- **Rejections:** 07:49:33Z (the #745 force-push and the lab forward), 07:53:43Z, 08:19:19Z, 14:05:10Z, 14:18:36Z, 15:37:21Z, 19:56:51Z, 20:38:48Z, 23:52:02Z, 00:25:43Z, 05:13:15Z, 07:23:36Z, and **13:52:26Z (the eleventh: lab #854, lab #745, review #850)**. The Auditor's #855 records the full chronology and the failed posts.
- A running job's secret context is fixed at job start, so this 17:09 job's re-posts will work only if the Owner refreshed the secret before 17:09:46Z. They fail harmlessly on the tolerant trigger step, and the queue survives here.
- The proactive pings and memory commits use the bot token, so they prove only the bot path. **#855 is the dedicated incident tracker; #70 keeps the rolling ledger.** The fail-loud code work is #856 (approve-held-runs fail-open + all-failed trigger batch reporting + owner-PAT preflight).
- **Action for the next session:** test the PAT only through the designed trigger posts or an approve sweep; never print or copy the token. If the posts land, work through the queue; if not, re-record the failure date and the queue and stand by. Do not post another #70 incident note without a material change or another long interval (the 05:13Z and 13:52Z notes are 8.5h apart; the next note is due only after a comparable gap or a real change).

### The #854 round-1 review verdict (lab, report lost)

The reviewer's blocking findings, preserved from `43690826495` (the full signed report is in that run's log):

- **B1:** slice 3 (the #853 silent-deferral guard) is absent, and the body has no `Refs #853`. Required: detect owner/bot deferral comments ("next window", "follows later", "when ... lands") on open PRs with no later dispatch/run in a bounded window; post one deduped re-arm note to #70 with **no trigger token**; resolve the board by exact title `Lab Health & Audit Logs` or the oldest open non-PR lab-health issue; adopt `.github/scripts/health-board.sh` from #850 when it lands; fixtures for deferral/no-dispatch, deferral/dispatch, duplicate, and title fallback. Rewrite `Closes #803` to `Refs #803` until all three slices are present, and name "PR #854" in the body prose.
- **B2:** head-read fail-open at `opencode.yml:1173,1296,1673`, `opencode-review.yml:686`, `curator.yml:181`: on an HTTP error `gh api` prints an error body, so `scope_since` becomes a non-date and `jq` silently counts 0. Capture the exit status before `jq`; reject empty/error/malformed/future dates.
- **B3:** enumeration fail-open at `opencode.yml:269,566,1183,1300,1681,1964,2286,2607,2928`, `opencode-review.yml:693`, `curator.yml:188`: `|| true` after the pipeline turns an API error into an empty count. Ten counters must capture the payload first and fail closed.
- **H1:** continue/build resolver failures (`opencode.yml:1048-1051,1292-1296`) still fall back to day scope; keep the successful-empty plain-issue day fallback, drop the failure fallback, add `--limit 100`.
- **H2:** no wall-death-after-a-fresh-head R19 fixture.
- **H3:** the continue `heals` and curator `retries` scope wrappers are un-pinned by R20; pin whole bodies and keep a mutation self-test.
- **H4:** the delegation ledger is invalid (no subagents were actually called; the audit script is not a subagent); replace it.
- **H5:** `AGENTS.md:105` and `LAB.md:2340-2342` claim fail-closed behavior that B2/B3 disprove.
- **Minors:** future-dated head-date handling, an HTTP-error-body fixture for the enumeration arm, and the brittle R20 count.

The lab instruction in this run's decision file carries this list, names `PR #854`, and keeps `Closes #803` conditional on all three slices.

### Issues #855/#856 (triaged 07:23Z, unchanged)

- **#855:** the dedicated owner-PAT 401 incident tracker; last owner-PAT success 2026-11-15T07:38:13Z, eleven Maintainer batches, three frozen lanes, three held runs. Owner action is the only unblock: rotate the secret and verify with `gh api user`; the next wake re-tests it. Update #855 after the first successful PAT batch, not before.
- **#856:** `approve-held-runs.sh` turns a 401 into "No held runs remain" because `2>/dev/null` discards the `gh run list` failure and `[ -z "$held" ]` is true; phase 3 never runs. Accepted scope: capture the exit status before testing output, return non-zero so the bot-token notify path runs, never print the success line on a failed read, add the owner-PAT preflight, pin the lines and add 401/empty/approve-failure fixtures to `silent-stall-audit.sh`, and make an all-failed trigger batch loud. Serialized behind #854/#850 (shared audit surface), alongside #849.
- **No dispatch now:** #855 is Owner-side; #856 would race the live audit branches and its trigger would 401 anyway. Both stay open as work orders.

## Live lanes and their next step

- **#854** (protected-path auto-retry scoping, slice 3 + hardening): one `lab` re-queued with the round-1 review list. On push: the lab workflow forwards a fresh review; only after a clean verdict does the Tester/eval/PAT sequence apply. Do not merge or close #803 before the guard lands.
- **#850** (owner-PAT pager hardening, `Closes #848`): one fresh head-bound `review` re-queued on `9c9bf1bd7`. When it lands: dispatch `lab` on #849 (owner-PAT helper reads on the 30-row board + `Fixed the bug` without `Fixes` detection), then the #804 residuals, docs gaps, and #814. Fix its `Closes #848` trailer before any merge.
- **#849** (owner-PAT helper-read hardening): lands after #850; expanded scope: owner-PAT pagers on the 30-row board read (`gh api --paginate --slurp ... jq flatten`) and allowing `Fixed the bug` without `Fixes`.
- **#856** (approve-held-runs fail-open + all-failed trigger batch reporting + owner-PAT preflight): lands after #854/#850, one lab branch at a time alongside #849 because all touch `silent-stall-audit.sh` and the post-agent PAT surface.
- **#855** (owner-PAT incident tracker): stays open until the Owner rotates the secret and the queue lands; update it after the first successful PAT batch, not before.
- **#848** (premature fix-forward paging): the #850 guard supersedes the older #798-era fix guard; docs in #850 only.
- **#745** (orphaned #798 audit/rebuild + the old #76 Pac-Man scanner): one `lab` rebase retry re-queued. The branch has not moved since the 07:49Z lost push. After push: verify with `git ls-remote`, dispatch one forward review, and keep #853 open until the verdict. This PR is a distinct co-consumer of the #803/#853 family, not a leftover; it wants a retitle and `Refs #853`.
- **#821 / #823** (Point of Sale staging, live on Pages): parked by Priya. Do not dispatch. If the Close wants a name change, one `lab` will do it.
- **Open infra/audit backlog (serialized behind the live lanes):** #803 closes with #854; #853 after the #745 audit verdict; #849 and #856 after #850; #848 via #850; then #814 (fix-lane false push), #812 (R11 bypass), #815 (non-hermetic audit), #774/#773 (docs accuracy), #831 (PR-head config), #742 (owner-PAT env), #836 (wall/heartbeat capacity). No new site project is open; do not invent one.
- **Maze Chase standing set:** #582 parent and #655/#657/#659/#661/#677/#678/#683 are slow/frozen; no action unless the Owner asks.
- **Board / health:** #70 is the only board. Every ping ends with the Maintainer sign-off; every escalation names one issue and one concrete next step; no inline trigger tokens anywhere (#775).
- **Eval lane:** route new multi-agent architecture to `eval` only when the Owner asks; no paid runs.

## Serialized queue (re-post these; do not re-decide)

1. `{"action":"lab","pr":854,"instruction":"<the round-1 review findings in today's log>"}`.
2. `{"action":"lab","pr":745,"instruction":"Retry the #745 rebase onto e5cd250c; add Refs #853; no Closes trailer; verify with git ls-remote after the PAT push"}`.
3. `{"action":"review","pr":850,"head":"9c9bf1bd72fb459388d2985656f6f61735147105"}`.
4. **Do not duplicate the #855 or #856 triage pings** unless a material change occurs (a dispatch, a lane landing, or a new failure class). Do not post another #70 incident note without a material change or another long interval; the 13:52Z note is the current incident entry.
5. After #854's branch push: the forwarded review; after #850's verdict: `lab` on #849 then `lab` on #856; after #850's merge: #804 residuals, docs gaps, #814.

**Do not** re-post a trigger whose target already has a live or queued run from the last 30 minutes, and do not post two lab triggers to the same PR in one run (the workflow dedupes by `(action, target)`).

## Loose ends

1. **The owner token is the top blocker** (see above). Only the Owner can rotate it. #855 is the dedicated tracker; the queue and this file are the recovery path.
2. **Held runs `43690826057`, `43690826207`, `43690826030`** on the #854 branch need an owner-PAT approve sweep. The NEXT PAT-healthy recover or maintainer run should clear them. The "No held runs remain" messages are the #856 fail-open, not evidence they cleared.
3. **The 08:19 #854 report** is lost from the PR. The blocking findings are in today's log and the lab instruction; if the lab pass lands, no re-publication is needed, but the next review should verify each item explicitly.
4. **#745 stale bot review:** after the fix-up, delete the older bot review on the exact commit id if it is still present; filter by `commit_id`, not just author.
5. **#850's body** has `Closes #848` (not on a `Refs` trailer). Normalize at merge; do not add a second trailer.
6. **#853's body chronology** says the work was lost and then reimplemented; prepend one sentence "Update: 2026-11-15T06:08Z, the work was reimplemented locally; the ONLY thing left is the push + retry (re-dispatched 07:38Z)" so a cold reader can tell current from history. Only worth a `lab` edit once #745 lands.
7. **#849 scope mismatch:** its premise still quotes the old body text; the expanded scope lives in #850's body. When #850 lands, add the expansion to #849's body first. #856's fail-open criteria are a separate sibling and should not be folded into #849 silently.
8. **The `INFRA-STATUS` block on #70** is stale (10-21) but still factually fine for #70. If a real infra change happens, refresh it in the same post.
9. **Dependabot PRs** remain no-ops: the "all Dependabot PRs" on-ramp only fires for open PRs and none are open.
10. **No merge this run:** no PR carries the full head-fresh Tester plus Evaluator chain; the reviewer verdict alone is not merge authority.
11. **Schedule health:** the 11:23Z curator tick resurfaced late and ran clean at 15:08-15:38Z (`43893149996`); tor-cli's schedule ran clean at 15:58-16:00Z. A tick more than ~24h missing would be a real signal.

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
- The trigger step's 401s are annotations only and the approve sweep fails open on the same 401; a green Maintainer run is not evidence that the queue landed. #856 is the fix work order.

### Review, test, and merge gates

- The reviewer verdict is advisory and does not itself authorize a merge. Merge only when the Tester's owner-authored `/oc approve-test` is head-fresh, no newer `/oc fix` findings exist, and the Evaluator's head-bound `approve-eval` is on the PR. Protected-path PRs merge only through the workflow's PAT merge step.
- Required gate sequence after a successful review on a non-protected PR: `test` (OS chosen by the touched paths) THEN `{"action":"eval"}` THEN a PAT sweep, then the bot verification. Never post a `test` trigger before the review verdict is on the PR, and never post a test/eval pair on the same PR in one run.
- Protected paths (`.github/workflows/**`, `.github/agents/**`, `opencode.json`, `AGENTS.md`, `LAB.md`) require the Lab Engineer route; the Maintainer's PAT step may push only under a valid emergency declaration.
- A green audit is not a merge approval. Deploy keys, workflow names, and mutable actions are pinned and trusted at the default branch; the Tester/PAT gates enforce.

### Audit lane rules (current, from #798 and its reviews)

- `silent-stall-audit.sh` is the mutation harness; R19/R20/R21/R23/R28/R30/R32/R36 are part of the shell parser/classifier guard story. A full run is ~10 minutes; do not accept a partial "fast" run when a real change needs the full harness.
- Every incident-scope counter must capture the payload first, never `|| true` after the pipeline, and must treat an unreadable head/enumeration as fail-closed (the #854 review B2/B3 classes). The leak guard and the PAT redaction work is the #798 family; the new code must not regress it. #856 adds the same rule for the held-run query.
- The delegation ledger is capped at 3-8 lines; it must list the subagents actually used, one line each, plus a skills line. Do not claim delegation that did not happen.
- The reviewer rejects fixes that claim fail-closed while keeping a silent fallback; the docs must state the exact boundary.
- No em dashes in repo files; no direct workflow edits outside a `lab` route.

### Contract and memory

- Output contract each run: `.maintainer/decision.json` (array), `.maintainer/comment.md` (empty unless a target exists), `.maintainer/log-entry.md` (FULL day file: existing bytes + today's entry), `.maintainer/state.md` (this file), `.maintainer/personality.md` only if identity evolved, `.maintainer/emergency.json` only under the failed-lab + halted-production contract.
- The log is append-only; the materialized day file was 54,826 bytes / 344 lines before today's 17:10Z entry. The publish step isolates the delta against the materialized baseline and recomposes on a fresh tip with keep-both semantics. Never write a partial day file.
- The log entry must include the state snapshot, decisions + rationale, callbacks, the run link, and open questions. The state must stay honest about what is verified vs expected.
- The memory branch is shared tooling; do not delete or rewrite prior entries.

### Persistent facts

- Main is a single fast-forwardable history; the repo pushes are the owner PAT's job; the orphan guard must never rewrite main.
- The board is #70; its exact title is the resolver anchor; the `lab-health` label is exclusive among open issues. #855 is the incident tracker, not a board.
- The recover arm is the heartbeat source; the maintainer cron is throttled. A stale STATE stamp is the wake signal; a skipped fan-out is not a real session; every real session must carry the exact liveness stamp.
- The free-usage wall is a real class (47m35s queue death on 07:03:41Z on 11-15); one manual fresh review is the only re-dispatch when the auto-retry budget is spent.
- The owner PAT is shared by the maintainer, review, curator, recover, and lab forward/push steps; one invalid secret explains a whole cluster of 401s. Do not confuse it with the bot token.

## Next run

1. Read this run's (`43915408266`) `Run /oc triggers as owner` step. If the three posts landed, do not re-post; if they 401ed, the queue stays above and is re-posted as the live credential test on the next wake.
2. If #854's lab pass pushed: watch the forwarded review; verify B1-B3/H1-H5 and the `Refs #853`/`Closes #803` rewrite. If it died, preserve its decision file and re-dispatch once.
3. If #850's review is live/queued, do not post another; when it completes, route `lab` on #849, then #856, one branch at a time. Verify the `Closes #848` trailer.
4. If #745's retry pushed, verify with `git ls-remote`, dispatch the fresh review, keep #853 open.
5. Verify the board invariant, allowlist count, model pin, and curator/auditor schedule health; if clean, stand by. Do not invent work. Do not re-post the #855/#856 pings.
6. If a new real failure appears, check for a wall/401 before routing; both are known classes.

## Open questions

1. When will the Owner rotate the secret? (No owner-PAT success since 2026-11-15T07:38:13Z; the 13:52:26Z eleventh batch says no as of then.)
2. Did this run's re-posts land? (Unknown until the trigger step runs after the agent.)
3. Will the #854 lab pass fit one round, or will the mutation harness plus the three fail-closed classes need a second?
4. Does the #745 branch still merge cleanly onto `e5cd250c`, and is its scope still distinct from #804?
5. Should #849 and #856 be one lab branch or two sequential branches once #850 lands, given they share `silent-stall-audit.sh`?
6. Will the Owner take the capacity decision (#836/#831) and the scratch canary, and will the delayed curator ticks keep re-arming on their own?
