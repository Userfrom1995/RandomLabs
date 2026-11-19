# STATE

Last updated: 2026-11-19T13:10Z by run 44528405829

(This was an `issue_comment` wake on PR #859 at 12:55:26Z. The headline is the **end of the owner-token incident**: at 12:52-12:55Z the Owner dispatched maintainer twice, the nine held `action_required` runs were approved and all nine completed green, and the restored `opencode-pr-trigger` arms posted owner wakes on #862/#859/#854 through `secrets.OPENCODE_PAT`. Production redeployed at 12:55:32Z on `e5cd250c` and Pages returns 200. The first post-restoration batch then landed at 13:02:40-46Z from a sibling global session: reviews #862/#859/#850 and labs #854/#745/#836. At 13:10Z all three reviews and the #854/#745 lab sessions are in progress; #836's lab session died on the provider free-usage wall; a duplicate #862 review is queued. #855 is closed with the recovery evidence. Main is `e5cd250c`; `maintainer/logs` is `837b7dffa`; no held runs remain; the board invariant and allowlist hold; the ladder rung 3 is still dead; no emergency declaration exists or is warranted.)

## TL;DR for the next Hephaestus

- **The owner credential is restored and the first batch landed.** Confirmed by `opencode-pr-trigger` run logs using `secrets.OPENCODE_PAT` at 12:54:10Z, 12:55:23Z, and 12:55:26Z; the nine held runs completed success; the queue triggers posted at 13:02:40-46Z. Do not re-describe the 401 freeze as current.
- **The queue is live:** review runs in progress on #862 `fe190ad0e`, #859 `d72d7ac9`, #850 `9c9bf1bd7`; lab runs in progress on #854 and #745. Do not re-post any of them. A duplicate #862 review trigger is queued (from a parallel session).
- **#836's lab run** (`44529581523`) died on the provider daily free-usage wall at 13:02:50Z. Do not dispatch a same-IP agent; re-arm the ladder item after the allowance resets.
- **#855 is closed.** The credential incident is over; #856/#857/#860 remain open as code work orders.
- **Next gate:** on a clean review of #859 or #862, dispatch `test`, then `eval` in a later run, then the PAT merge sweep. #858/#861 close only on merge.
- **Do not re-post the #855/#856/#857 pings** without a material change; do not dispatch two branches on the shared `silent-stall-audit.sh` / `curator.yml` / `opencode-review.yml` surface at once.

## Who I am

Hephaestus, the Maintainer of this repository. I do not write project code; I keep the pipeline full and the gates honest, and I route every change through the Lab Engineer, reviewer, tester, auditors, curators, and eval. "I'll do it myself" should lose to "route it." I act only when the owner expressly asks or routine triage is due. I use subagents for parallel read-only investigation only when it materially saves time, and the capped 3-8-line delegation ledger is mandatory where required.

## Right now (surveyed 12:56-13:02Z on 2026-11-19)

### GitHub state

- **Main:** `e5cd250c126efa8c86a084b3d72ade3bcf9bdc5b` ("curate: sync Maze Chase release status and correct the Pac-Man retirement claim", Fixes #851; 2026-11-15T06:31:53Z), atop `620bb8d2e` (the #798 lab merge). **`maintainer/logs`:** `837b7dffaf08e46108714adc7cd371bc3d32d62b` ("maintainer: memory update 2026-11-19T10:55Z", 10:55:46Z), the 10:45 heartbeat run's memory commit; below it `159ea2fa5` (04:34:54Z), `fb196c667` (02:47:40Z), and `7b32d9f6c` (11-18 23:39:20Z).
- **Open PRs (6):** #862 head `fe190ad0ea200725d460273d83720d84e9a451ad`, branch `opencode/issue861-curate-netpulse-theme-copy`, body `Fixes #861`, two copy-only HTML edits (1+/1- each), MERGEABLE/CLEAN, 0 reviews, owner wake + preview at 12:54:10/12:54:18Z; #859 head `d72d7ac9aa5d08f9c4d35c1dfc1e63cb116571a4`, branch `opencode/issue858-curate-umbra-count-copy`, body `Fixes #858`, two copy-only HTML edits, MERGEABLE/CLEAN, 2 bot comments plus the 12:55:22Z owner wake and 12:55:25Z preview, 0 reviews; #854 head `090452f27c575a31e617bc5c7083c6ee441b0653`, branch `opencode/issue803-20261115060707`, body `Closes #803`, 6 protected-path files, MERGEABLE/CLEAN, 3 comments plus the 12:55:26Z owner wake and 12:55:28Z preview, 0 reviews; #850 head `9c9bf1bd72fb459388d2985656f6f61735147105`, branch `opencode/lab-848-shared-health-board-selector`, body `Closes #848`, MERGEABLE/CLEAN, 49 comments, 0 reviews; #821 head `dce109e4479b3cf2801a1b0127ea98778e58c398`, CLEAN, parked since 2026-11-07, 50 comments; #745 head `7a04fa4a96e1982ac307ca40973fed29379def0b`, branch `opencode/lab-742-owner-pat-env-sanitization`, CONFLICTING/DIRTY (diverged, 5 ahead / 375 behind main), no `Closes` trailer, 67 comments, 0 reviews. No head moved on the five older PRs.
- **Open issues (28 non-PR):** #42, #70, #582, #655, #657, #659, #661, #677, #678, #683, #742, #773, #774, #792, #803, #812, #814, #815, #831, #836, #848, #849, #853, #856, #857, #858, #860, #861. **#855 was closed at 13:09Z** with the recovery evidence. No issue since #861 (07:34:11Z). After this run no untriaged issue remains: #858 is covered by open PR #859, #861 by #862, #860 carries its 10:55:49Z triage, #856/#857 carry their triage; #659/#677/#678 are the known 10-18 Maze Chase standing set under #582.
- **Board invariant holds:** only #70 carries `lab-health` among open issues and only #70 has the exact title `Lab Health & Audit Logs`; #42 is the only other labelled issue (`brainstorm`). #855/#856/#857/#858/#860/#861 deliberately stay unlabelled.
- **Latest comments at survey time:** the 12:55:28Z #854 preview is newest; then the owner wakes and previews for #862/#859 (12:54:10-12:55:25Z), the 10:55:50Z #70 note, the 10:55:49Z #860 triage, and the 10:45:53Z heartbeat marker. No new human prose comment; the Owner's intervention is the wakes plus the manual dispatches.
- **Branch tips:** `gh api` confirms main `e5cd250c` and `maintainer/logs` `837b7dffa`; the PR API resolves #862 `fe190ad0e`, #859 `d72d7ac9`, #854 `090452f27`, #850 `9c9bf1bd7`, #745 `7a04fa4a`, #821 `dce109e4`; no new project branch and no recovery due (newest closed PR is #852, merged 11-15).

### Runs, CI and queues

- **This run:** `44528405829`, `issue_comment` 12:55:26Z on `main` `e5cd250c`, in progress at survey close; notification payload `ISSUE: 859`, `COMMENT_AUTHOR: Userfrom1995`. The in-session checkout is the PR #859 head (CLI bootstrap for this wake class); the trusted prompt and workflow scripts came from the default branch.
- **Owner intervention (the unblock):** two manual `maintainer` dispatches at 12:52:50Z (`44527997595`, in progress) and 12:53:18Z (`44528070035`, pending behind the first in the `maintainer-global` group), both actor `Userfrom1995`. Then all nine held runs were approved and completed success: `43690826057`/`43690826207`/`43690826030` (#803 branch), `44121917992`/`44121917590`/`44121918001` (#858 branch), `44480682663`/`44480682570`/`44480682694` (#862 branch). The pr-trigger arms posted owner wakes (12:54:10Z #862, 12:55:23Z #859, 12:55:26Z #854); the Pages arms posted previews and production deployment `7913694516` is green at 12:55:32Z.
- **Sibling maintainer sessions:** `44528214502` (#862 wake) posted a review #862 trigger at 13:04:24Z (duplicate) plus its #70 note and #862 comment; `44528414321` (#854 wake) and the global dispatches also decided. The first full batch came from the global session at 13:02:40-46Z. Concurrency groups key on the event issue number, so the PR wakes run concurrently; only the global group is single-slot. The cross-session duplicate is the observed cost.
- **First post-restoration batch (13:02:40-46Z):** review #862 `fe190ad0e` (13:02:40Z), review #859 `d72d7ac9` (13:02:41Z), review #850 `9c9bf1bd7` (13:02:42Z), lab #854 (13:02:44Z), lab #745 (13:02:45Z), lab #836 (13:02:46Z). Review runs `44529563614` (#862), `44529567916` (#859), and `44529568915` (#850) are in progress; lab runs `44529574302` (#854) and `44529576796` (#745) are in progress; lab `44529581523` (#836) failed on the provider free-usage wall at 13:02:50Z and the quota intake posted on #70 at 13:04:10Z. The duplicate review #862 trigger queued `44529850597` (pending).
- **Previous Maintainer:** `44508670731`, `workflow_dispatch` heartbeat, 10:45:55-10:55:53Z, success. Its trigger step 401ed all six posts at 10:55:51Z (29th consecutive rejected batch); its 10:55:50Z #70 note, 10:55:49Z #860 triage, and memory commit `837b7dffa` landed on the bot token; its approve sweep printed "No held runs remain" (the #856 fail-open, though the runs were genuinely cleared later).
- **Auditor:** `44471789577`, `schedule`, 06:23:18-06:51:15Z, success; filed #860 at 06:48:19Z, posted the daily audit on #70 at 06:50:21Z, and its handoff forward 401ed at 06:51:09Z (the #857 fail-open, third live instance). Next daily tick expected ~06:00Z tomorrow.
- **Curator:** `44477742504`, `schedule`, 07:11:50-07:35:50Z, success; filed #861 at 07:34:11Z and opened PR #862 at 07:34:35Z, then both review forwards 401ed at 07:35:46Z; its approve sweep printed `PR #862 gone (poll 1)` and "No held runs remain" (the #856 capture-before-test fail-opens). Next 6h tick due ~13:11Z.
- **Review/lab/test/eval lanes:** no `opencode-review`, `Lab Engineer`, `opencode-test`, `opencode-eval`, or `opencode-peros-test` run has started since 2026-11-16T00:00Z. This run's queue is the first chance to restart them.
- **Failures in the recent window:** none failure/timed_out/startup_failure. The non-green entries are the expected skipped/cancelled maintainer fan-outs fired by the owner wakes and the 12:52-12:53 dispatches.
- **Held (`action_required`) runs:** **none** (was nine).
- **Queued runs:** the same inert historical entries on long-dead branches; no new queued trigger from the fleet yet.
- **Pages:** production deployment `7913694516` green at 12:55:32Z on `e5cd250c`; https://userfrom1995.github.io/RandomLabs/ returns 200; #862/#859/#854 previews green; #850 preview `43677055969` green on `9c9bf1bd7`.
- **Model registry:** **92 models, 12 free** at 12:56Z (`beam-free`, `deepseek-v4.1-flash-free`, `flint-40b-free`, `hy4-flash-free`, `iceman-free`, `inkling-2-small-free`, `jev-1.13-free`, `longcat-2.5-free`, `mimo-v2.6-flash-free`, `nemotron-3.5-lightning-free`, `nemotron-3.5-super-vl-free`, `tidepool-alpha-free`). `glm-5.3` and `glm-5.3-flash` are listed but paid; `glm-5.3-flash-free` is absent, so ladder rung 3 is dead. The pin and `small_model` are `opencode/deepseek-v4.1-flash-free` (live) and rung 2 `mimo-v2.6-flash-free` is live, so the ladder is 2/3.
- **Allowlist:** `maintainer.yml:42` lists 19 workflows; all 20 live workflow `name:` fields match those 19 plus the self-excluded `maintainer`. Zero missing, zero extra.
- **Workspace note:** the in-session checkout is the PR #859 head (expected), working tree clean relative to that head. No protected-path edits, no model edit (`opencode.json` still pins deepseek for model and small model), no branch commands, no `emergency.json`. All work is routed through the decision file.

### The owner-token incident (RESOLVED 12:52-12:55Z, #855 CLOSED 13:09Z)

- **Last confirmed good use before the freeze:** 2026-11-15T07:38:09-07:38:13Z. The freeze lasted four days and produced 29 rejected maintainer batches plus several Auditor/Curator single-forward rejections, all `gh: Bad credentials (HTTP 401)`.
- **Recovery evidence:** at 12:52-12:55Z the Owner dispatched maintainer twice and approved the nine held runs; all nine completed success. The three `opencode-pr-trigger` run logs show `GH_TOKEN: ***` from `secrets.OPENCODE_PAT` and successful comment API calls at 12:54:10Z, 12:55:23Z, and 12:55:26Z. The held `Deploy static site` arms then published previews and production. This is a genuine owner-PAT write, not a GITHUB_TOKEN path.
- **Implication:** a running job's secret context is fixed at job start; this run (started 12:55:26Z) and the sibling sessions (12:52-12:55Z) all started after the refresh, so their trigger steps should have the fresh secret.
- **Tracker:** #855 is **closed** at 13:09Z with the recovery and batch evidence. #70 remains the rolling ledger. The fail-loud code work (#856 approve-held-runs fail-open, #857 decision-forward fail-open, #860 review-lane unreadable state, #849 helper reads) remains valid and is serialized behind the live lanes.

### Model-ladder retirement (open, queued)

- **Finding:** `opencode/glm-5.3-flash-free`, the third rung in `.github/actions/opencode-run/model-ladder.txt`, is absent from the live registry. Verified with a fresh read at 12:56Z: 92 models / 12 free; only the paid `glm-5.3` and `glm-5.3-flash` are listed; `glm-5.3-flash-free` is gone.
- **Impact:** none while the pin (`opencode/deepseek-v4.1-flash-free`) and rung 2 (`opencode/mimo-v2.6-flash-free`) are live and free. The ladder must nevertheless stay fully live (issue #591 contract, audit R6).
- **Action:** one `{"action":"lab","issue":836}` posted this run: replace rung 3 with a live free model, preferably `opencode/nemotron-3.5-lightning-free` (verify `longcat-2.5-free`, `beam-free`, `jev-1.13-free`), keep every rung `-free`, do not touch the pin or `small_model`, re-run the resolver and the ladder audit. Fold in the auditor-flagged stale glm examples in `maintainer.md:333`/`labengineer.md:78` and the `maintainer.yml:581` envelope omission.
- **Target choice:** #836 is the open model/capacity resilience umbrella; #591 is closed. Disjoint file, so it does not race #854/#850.

### PR #859 / issue #858 (Curator lane, notified target)

- **#858:** stale `455/455` Umbra card count (`index.html:170`, current suite 470/470) and reversed "stage above" noscript wording (`film/index.html:22`).
- **#859:** "curate: refresh Umbra test count and fix Hearthlight noscript copy", head `d72d7ac9`, body `Fixes #858`, two 1+/1- public-surface edits. The diff was re-read this run and both changes are correct. MERGEABLE/CLEAN, 2 bot comments, 0 reviews.
- **State:** the head-bound review on `d72d7ac9` was posted at 13:02:41Z and review run `44529567916` is in progress. On a clean review: `test` then `eval` then the PAT merge sweep; #858 closes only on merge. Not a new project, so the daily shipping limit does not apply. Do not re-post the review.

### PR #862 / issue #861 (Curator lane, new)

- **#861:** false absolute "Nothing is uploaded." footer (`netpulse/index.html:316`) and stale `Theme 1/1` static label (`maze-chase/index.html:359`) against the shipped three-theme engine.
- **#862:** "curate: qualify the Netpulse upload claim and sync the Maze Chase theme label", head `fe190ad0e`, body `Fixes #861`, two 1+/1- public-surface edits. Non-protected, so the normal review -> test/OS -> eval -> PAT merge chain applies. 0 reviews; the 07:35:46Z curator forward 401ed.
- **State:** the head-bound review on `fe190ad0e` was posted at 13:02:40Z and review run `44529563614` is in progress; a second trigger from a sibling session queued `44529850597`. Do not re-post. #861 closes only on merge.

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

### Issues #855/#856/#857/#860 (triaged, unchanged scope plus new evidence)

- **#855:** the dedicated owner-PAT 401 incident tracker. **Resolved and closed at 13:09Z** with the recovery and first-batch evidence; do not reopen it for wall or lane failures.
- **#856:** `approve-held-runs.sh` turns a 401 into "No held runs remain" because `2>/dev/null` discards the `gh run list` failure and `[ -z "$held" ]` is true. The curator's 07:35:46Z `PR #862 gone (poll 1)` is the phase-1 sibling (`head_sha=$(gh pr view ... 2>/dev/null)` treats the 401 as a deleted PR). Accepted scope: capture exit status before testing output, return non-zero so the notify path runs, never print success on a failed read, add the owner-PAT preflight, pin the lines, add 401/empty/approve-failure/PR-gone fixtures, make an all-failed trigger batch loud. Serialized behind #854/#850 on the shared audit surface, alongside #849.
- **#857:** the Auditor/Curator decision-forward fail-open; `auditor.yml:193,195,198` and `curator.yml:234,242,247` wrap the handoff post in `|| echo`, so a 401 leaves the run green. Live instances: 06:51:09Z (Auditor), 07:35:46Z (Curator, two posts), plus the earlier 16:07:12Z and 00:07:42Z. Fix: capture each post status, fail the step, avoid the subshell, reuse #856's preflight and #850's board selector, pin 401/success/absent-decision/board-error fixtures.
- **#860:** `opencode-review.yml:456` (publisher) and `:581` (verify) treat an unreadable `live_state` as a genuine close, and the verify path sets `skip_forward=true`. Accepted scope is in the 10:55:49Z triage: clean-skip only on positive `CLOSED`/`MERGED`; bot-token read-only probe; never `skip_forward=true` on unreadable; 401/empty/CLOSED/OPEN fixtures; reuse #856's preflight. Serialized after #854/#850 on the shared `opencode-review.yml` surface.
- **No dispatch now** for #856/#857/#860: all touch protected paths that #854/#850 already edit; one lab branch at a time. They stay open as work orders.

## Live lanes and their next step

- **#859** (Curator fix, `Fixes #858`): head-bound review on `d72d7ac9` is **live** (run `44529567916`). On a clean review: `test` then `eval` then the PAT sweep; #858 closes only on merge. Do not merge on the reviewer verdict alone.
- **#862** (Curator fix, `Fixes #861`): head-bound review on `fe190ad0e` is **live** (run `44529563614`; duplicate `44529850597` pending). Same normal non-protected sequence on a clean verdict; #861 closes only on merge.
- **#850** (owner-PAT pager hardening, `Closes #848`): head-bound review on `9c9bf1bd7` is **live** (run `44529568915`). When it lands: dispatch `lab` on #849, then #857, then #856, then #860, one branch at a time. Fix its `Closes #848` trailer before any merge.
- **#854** (protected-path auto-retry scoping, slice 3 + hardening): lab session `44529574302` is **in progress** with the round-1 list. On push: the lab workflow forwards a fresh review; only after a clean verdict does the Tester/eval/PAT sequence apply. Do not merge or close #803 before the guard lands.
- **#745** (orphaned #798 audit/rebuild + the old #76 Pac-Man scanner): lab rebase retry `44529576796` is **in progress**. After push: verify with `git ls-remote`, dispatch one forward review, keep #853 open until the verdict. Wants a retitle and `Refs #853`.
- **#836** (model/wall capacity umbrella): the lab run died on the provider daily free-usage wall at 13:02:50Z. Re-arm the ladder item after the allowance resets; do not dispatch a same-IP agent. On push: a fresh review, then the protected-path PAT merge sweep. Do not change the pin or `small_model`; only the rung.
- **#821 / #823** (Point of Sale staging, live on Pages): parked by Priya. Do not dispatch. If the Owner wants a name change, one `lab` will do it.
- **Open infra/audit backlog (serialized behind the live lanes):** #803 closes with #854; #853 after the #745 audit verdict; #849/#857/#856/#860 after #850; #848 via #850; then #814 (fix-lane false push), #812 (R11 bypass), #815 (non-hermetic audit), #774/#773 (docs accuracy), #831 (PR-head config), #742 (owner-PAT env), #836 (wall/heartbeat capacity plus the ladder rung). No new site project is open; do not invent one.
- **Maze Chase standing set:** #582 parent and #655/#657/#659/#661/#677/#678/#683 are slow/frozen; no action unless the Owner asks.
- **Board / health:** #70 is the only board. Every ping ends with the Maintainer sign-off; every escalation names one issue and one concrete next step; no inline trigger tokens anywhere (#775).
- **Eval lane:** route new multi-agent architecture to `eval` only when the Owner asks; no paid runs.

## Serialized queue (ALL SIX LANDED at 13:02:40-46Z; do not re-post)

1. `review #859 head d72d7ac9` - posted 13:02:41Z, run `44529567916` in progress.
2. `review #862 head fe190ad0e` - posted 13:02:40Z, run `44529563614` in progress; duplicate `44529850597` pending.
3. `review #850 head 9c9bf1bd7` - posted 13:02:42Z, run `44529568915` in progress.
4. `lab #854` with the round-1 findings - posted 13:02:44Z, run `44529574302` in progress.
5. `lab #745` rebase retry - posted 13:02:45Z, run `44529576796` in progress.
6. `lab #836` ladder rung - posted 13:02:46Z, run `44529581523` failed on the free-usage wall at 13:02:50Z. **Re-arm this one after the allowance resets; it is the only queue item that still needs a dispatch.**
7. **Do not duplicate the #855/#856/#857 pings** unless a material change occurs. The 13:0x #70 notes (12:02:38 owner-restore, 13:04:10 quota intake, 13:04:22 owner-activity, 13:09 batch-outcome) are current.
8. After #854's branch push: the forwarded review; after #850's verdict: `lab` on #849, then #857, then #856, then #860; after #850's merge: #804 residuals, docs gaps, #814; after #859's or #862's review: `test` then `eval`; after #836's ladder push: verify three live free rungs; after #745's push: one fresh review.

**Do not** re-post a trigger whose target already has a live or queued run or the same head-bound review comment, and do not post two lab triggers to the same PR in one run (the workflow dedupes by `(action, target)` within a run only).

## Loose ends

1. **Credential recovery is complete:** the first post-restoration batch landed at 13:02:40-46Z and #855 is closed with the evidence. Do not reopen it for wall or lane failures; use #836/#70.
2. **Held runs:** none. If any reappear, the approve sweep (now PAT-healthy) should clear them; the fail-open messages in #856 are still not evidence either way until its fix lands.
3. **Sibling sessions:** the anticipated duplicate happened - `44528214502` posted a second review #862 trigger at 13:04:24Z, which queued `44529850597`. Duplicates queue FIFO; do not cancel or re-post. Later sessions must dedupe against the 13:0x comments.
4. **The 08:19 #854 report** is lost from the PR. The blocking findings are in this log and the lab instruction; the next review must verify each item explicitly.
5. **#745 stale bot review:** after the fix-up, delete the older bot review on the exact commit id if it is still present; filter by `commit_id`, not just author.
6. **#850's body** has `Closes #848` (not on a `Refs` trailer). Normalize at merge; do not add a second trailer.
7. **#853's body chronology** says the work was lost and then reimplemented; prepend one sentence "Update: 2026-11-15T06:08Z, the work was reimplemented locally; the ONLY thing left is the push + retry (re-dispatched 07:38Z)" so a cold reader can tell current from history. Only worth a `lab` edit once #745 lands.
8. **#849 scope mismatch:** its premise still quotes the old body text; the expanded scope lives in #850's body. When #850 lands, add the expansion to #849's body first. #856's fail-open criteria are a separate sibling and should not be folded into #849 silently; #857 and #860 are further siblings on the forward and review-lane surfaces.
9. **The `INFRA-STATUS` block on #70** is stale (10-21) but still factually fine for #70. If a real infra change happens, refresh it in the same post.
10. **Dependabot PRs** remain no-ops: the "all Dependabot PRs" on-ramp only fires for open PRs and none are open.
11. **No merge this run:** no PR carries the full head-fresh Tester plus Evaluator chain; #862/#859/#850 have no review, #854 has no verdict after its latest head, and #745 is dirty.
12. **Curator tick:** the next 6h tick is due ~13:11Z; do not dispatch a manual curator run unless the gap passes ~16h or a tick crashes.
13. **Auditor schedule:** the next daily tick is expected ~06:00Z tomorrow. No dispatch.
14. **Quota wall:** the lab #836 run `44529581523` died on the daily free-usage wall at 13:02:50Z (the quota intake posted on #70 at 13:04:10Z). The other five batch runs are progressing. Do not dispatch a same-IP agent for a wall death; re-arm #836 after the allowance resets (one attempt is the cap, #820/#836).
15. **Heartbeat path:** the recover arm is still the liveness source; a stale `Last updated` stamp wakes it. This real session must keep the exact stamp so the heartbeat does not misfire.
16. **Model registry drift:** now 92 models / 12 free; `glm-5.3-flash-free` retired (paid glm ids exist) and rung 3 is dead; the pin and rung 2 are live; rung 3 is queued to #836. `jev-1.13-free` remains an untested alternative; `tidepool-alpha-free` is the 1M option; `beam-free` and `nemotron-3.5-lightning-free` are the more durable choices.
17. **The ladder is 2/3 until #836 lands:** no production impact while the pin and rung 2 are live. Its first lab attempt hit the wall, so the item is queued for the next allowance window; do not lose it.
18. **Maintainer cron throttling:** the 20-minute schedule has been heavily throttled; the recover heartbeat covers the gaps. The capacity decision belongs to #836/#831, not a manual dispatch.
19. **Stale prompt examples:** `maintainer.md:333` and `labengineer.md:78` still list the retired glm id, and `maintainer.yml:581` omits design-ux/visual/motion. Folded into the #836 lab instruction; no new issue.
20. **#855 is closed** at 13:09Z with the recovery evidence; the remaining work orders are #856/#857/#860 (code) and #836 (wall/ladder), not credential work.

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
- Escape hatch: "if the token is dead, the queue is the test; do not attempt credential workarounds." Do not restate an incident on every issue; keep the detailed record on #855/#70 and the log.
- Never include a trigger token in a ping body (#775). The memory branch and the log may quote decisions, but public pings must not carry `eval-verdict:` markers or `/oc` tokens.
- The trigger step only dedupes within a run; cross-session duplicates are possible. Survey comments before re-posting, and never post two lab triggers to the same PR in one run.

### Review, test, and merge gates

- The reviewer verdict is advisory and does not itself authorize a merge. Merge only when the Tester's owner-authored `/oc approve-test` is head-fresh, no newer `/oc fix` findings exist, and the Evaluator's head-bound `approve-eval` is on the PR. Protected-path PRs merge only through the workflow's PAT merge step.
- Required gate sequence after a successful review on a non-protected PR: `test` (OS chosen by the touched paths) THEN `{"action":"eval"}` THEN a PAT sweep, then the bot verification. Never post a `test` trigger before the review verdict is on the PR, and never post a test/eval pair on the same PR in one run.
- Protected paths (`.github/workflows/**`, `.github/agents/**`, `opencode.json`, `AGENTS.md`, `LAB.md`) require the Lab Engineer route; the Maintainer's PAT step may push only under a valid emergency declaration.
- A green audit is not a merge approval. Deploy keys, workflow names, and mutable actions are pinned and trusted at the default branch; the Tester/PAT gates enforce.

### Audit lane rules (current, from #798 and its reviews)

- `silent-stall-audit.sh` is the mutation harness; R19/R20/R21/R23/R28/R30/R32/R36 are part of the shell parser/classifier guard story. A full run is ~10 minutes; do not accept a partial "fast" run when a real change needs the full harness.
- Every incident-scope counter must capture the payload first, never `|| true` after the pipeline, and must treat an unreadable head/enumeration as fail-closed (the #854 review B2/B3 classes; the #856 phase-1/#860 review-lane instances are the same rule). The leak guard and the PAT redaction work is the #798 family; the new code must not regress it. #856/#857/#860 add the same rule for the held-run query, the decision-forward step, and the review state read.
- The delegation ledger is capped at 3-8 lines; it must list the subagents actually used, one line each, plus a skills line. Do not claim delegation that did not happen.
- The reviewer rejects fixes that claim fail-closed while keeping a silent fallback; the docs must state the exact boundary.
- No em dashes in repo files; no direct workflow edits outside a `lab` route.

### Contract and memory

- Output contract each run: `.maintainer/decision.json` (array), `.maintainer/comment.md` (empty unless a target exists), `.maintainer/log-entry.md` (FULL day file: existing bytes + today's entry), `.maintainer/state.md` (this file), `.maintainer/personality.md` only if identity evolved, `.maintainer/emergency.json` only under the failed-lab + halted-production contract.
- The log is append-only; the 2026-11-16 day file closed at 516 lines, the 2026-11-17 at 526 lines, the 2026-11-18 at 718 lines, and the 2026-11-19 file carries the 02:39, 04:29, 10:45, and 12:55 entries. The publish step isolates the delta against the materialized baseline and recomposes on a fresh tip with keep-both semantics. Never write a partial day file.
- The log entry must include the state snapshot, decisions + rationale, callbacks, the run link, and open questions. The state must stay honest about what is verified vs expected.
- The memory branch is shared tooling; do not delete or rewrite prior entries.

### Persistent facts

- Main is a single fast-forwardable history; the repo pushes are the owner PAT's job; the orphan guard must never rewrite main.
- The board is #70; its exact title is the resolver anchor; the `lab-health` label is exclusive among open issues. #855 is the incident tracker, not a board.
- The recover arm is the heartbeat source; the maintainer cron is throttled. A stale STATE stamp is the wake signal; a skipped fan-out is not a real session; every real session must carry the exact liveness stamp.
- The free-usage wall is a real class (47m35s queue death at 07:03:41Z on 11-15; the 08:55:40Z death on 11-17); one fresh-run attempt is the only re-dispatch, and a same-IP retry must not be dispatched.
- The owner PAT is shared by the maintainer, review, curator, recover, auditor, and lab forward/push steps; it was rejected from 2026-11-15T07:38Z until the 2026-11-19T12:52-12:55Z recovery. Do not confuse it with the bot token.
- The model ladder must have three live `-free` rungs; a retired rung is a routine `lab` item, not an emergency.

## Next run

1. The six queue triggers already landed at 13:02:40-46Z. Do NOT re-post them. Check the review/lab runs and route on their verdicts.
2. When #859's or #862's review completes: on approval, dispatch `test` (then `eval` in a later run), then the PAT merge sweep; #858/#861 close only on merge.
3. When #850's review completes, route `lab` on #849, then #857, then #856, then #860, one branch at a time. Verify the `Closes #848` trailer.
4. If #854's lab pass pushed: watch the forwarded review; verify B1-B3/H1-H5 and the `Refs #853`/`Closes #803` rewrite. If it died, preserve its decision file and re-dispatch once.
5. #836's lab run died on the wall before pushing. After the free-usage allowance resets, re-arm the ladder item once (its instruction is in the 13:09 #70 note and the prior decision); verify the replacement rung is live and free and the ladder has three live rungs.
6. If #745's retry pushed: verify with `git ls-remote`, dispatch the fresh review, keep #853 open.
7. #855 is closed; do not reopen it. Keep #70 as the rolling ledger and #856/#857/#860 as the code work orders.
8. Verify the board invariant, allowlist count, model registry/ladder, Pages, and curator/auditor schedule health; if clean, stand by. Do not invent work. Do not re-post the #855/#856/#857 pings.
9. If a new real failure appears, check for a wall/401 before routing; both are known classes.

## Open questions

1. Will the three review runs and the #854/#745 lab runs complete cleanly, or will the free-usage wall claim more of them? (The credential itself is proven; #836 already died on the wall.)
2. How many duplicate runs will the parallel sessions leave behind? (The first known duplicate is review #862 `44529850597`; duplicates queue FIFO and are harmless but costly.)
3. Will #850's round-5 review still pass after four frozen days, or will it find new drift?
4. Will the #854 lab pass fit one round, or will the mutation harness plus the three fail-closed classes need a second?
5. Does the #745 branch still merge cleanly onto `e5cd250c`, and is its scope still distinct from #804?
6. Which free model becomes ladder rung 3: `nemotron-3.5-lightning-free`, `beam-free`, `jev-1.13-free`, `longcat-2.5-free` (1M context), or `tidepool-alpha-free`?
7. When will the daily free-usage allowance reset enough to re-arm #836, and will the throttled maintainer cron resume a normal cadence without the recover heartbeat?
