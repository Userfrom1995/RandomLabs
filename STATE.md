# STATE

Last updated: 2026-11-15T14:17Z by run 43722439447

(This was a heartbeat wake at 14:05:33Z. The owner-PAT secret is still the only blocker: last confirmed good use 07:38:13Z, and the recover arm's owner-PAT approve sweep at 14:05:10Z returned in 72ms with no API, the local 401 path. The 08:19Z #854 review finished with verdict `lab` but its owner-PAT report publication and verdict forward both skipped on the same failure, so the signed report never landed; the blocking findings are in today's log and the new lab instruction. This run re-queued the three lost posts: #854 lab, #745 lab, and #850 review on head `9c9bf1bd7`. Main is `e5cd250c`; production Pages is green; the board invariant holds; no emergency declaration exists or is warranted.)

## TL;DR for the next Hephaestus

- This was a **heartbeat wake** (`workflow_dispatch` run `43722439447`, 14:05:33Z, reason: no real Maintainer session for 90m and no active run, issue #836). The previous real session was 07:49-08:00Z. The 08:19Z and 13:47Z fan-outs were both skipped.
- The **owner-PAT secret is the only blocking incident**, and it is almost certainly still invalid: the recover arm's owner-PAT approve sweep at 14:05:10Z returned in 72ms with no API output, the local 401 path. Last confirmed good use: 07:38:09-07:38:13Z. See the incident section below.
- The **#854 round-1 review** (run `43690826495`) finished at 08:19:23Z with verdict **`lab`**, but its owner-PAT report publication and its lab forward were both skipped because the live PR-state read returned `unknown`. The signed report never landed; the blocking findings are preserved in today's log and in the new lab instruction.
- This run **re-queued** the three lost posts: `lab` on #854 (review findings), `lab` on #745 (rebase retry), `review` on #850 head `9c9bf1bd7`. They are also the live credential test. Because a running job's secret context is fixed at job start, they are expected to 401 too; the queue stays here for the next run after a refresh.
- Bot-token paths (memory commits, pings, heartbeat UI) work. Main is stable at `e5cd250c`, production Pages is green. **No emergency declaration** exists or is warranted.
- **Start the next session by re-posting the queued triggers** from the "Serialized queue" section, then check whether the Owner refreshed the secret. If #854's lab pass lands, verify the review findings before any PAT sequence. If #745's push lands, verify with `git ls-remote` and keep #853 open until the audit verdict.

## Who I am

Hephaestus, the Maintainer of this repository. I do not write project code; I keep the pipeline full and the gates honest, and I route every change through the Lab Engineer, reviewer, tester, auditors, curators, and eval. "I'll do it myself" should lose to "route it." I act only when the owner expressly asks or routine triage is due. I use subagents for parallel read-only investigation only when it materially saves time, and the capped 3-8-line delegation ledger is mandatory where required.

## Right now (surveyed 14:05-14:15Z on 2026-11-15)

### GitHub state

- **Main:** `e5cd250c126efa8c86a084b3d72ade3bcf9bdc5b` ("curate: sync Maze Chase release status and correct the Pac-Man retirement claim", Fixes #851; 06:31:53Z), atop `620bb8d2e` (the #798 lab merge). **`maintainer/logs`:** `8ec6570df4d1627babe9080dfe9f60d1b54e60d3`.
- **Open PRs:** #854 head `090452f27c575a31e617bc5c7083c6ee441b0653`, MERGEABLE/UNSTABLE, closing [803], 6 protected-path files (`.github/scripts/silent-stall-audit.sh`, `opencode.yml`, `opencode-review.yml`, `curator.yml`, `AGENTS.md`, `LAB.md`), branch `opencode/issue803-20261115060707`; #850 head `9c9bf1bd72fb459388d2985656f6f61735147105`, MERGEABLE/CLEAN, closing [848], body has only `Closes #848` and no broken `Closes`-on-`Refs` trailer; #745 head `7a04fa4a96e1982ac307ca40973fed29379def0b`, CONFLICTING/DIRTY, base `e73bd7a25`, 375 behind / 5 ahead of main; #821 parked.
- **Open issues:** #853 open and unlabelled (the #745 orphan audit); #849, #848, #836, #831, #815, #814, #813, #804, #803, #763, #742, #728, #722, #713, #67, #42 open. No untriaged new issue and no other unlabelled open issue besides #853.
- **Board invariant:** only #70 carries `lab-health`, and only #70 has the exact title `Lab Health & Audit Logs`. Latest comments: 08:01:36Z incident note, 14:05:32Z heartbeat marker. Verify at the start of every run; re-home posts to the exact title or the oldest open non-PR lab-health issue.
- **Latest issue comments:** #745 06:08:37Z (bot: work implemented locally, push lost to the 401), #850 06:13:13Z (owner `/oc review (head 9c9bf1bd7...)`), #853 08:01:37Z (bot: lost retry), #70 14:05:32Z (bot heartbeat). **No owner comment since 07:38:09Z.**
- **Branch tips:** confirmed with `git ls-remote` at 14:07Z; #854/#850/#745 heads still match their open PRs. #854: 6 files vs main; #850: 4 files, no `LAB.md`, no `AGENTS.md`.

### Runs, CI and queues

- **Only failure in the last 100 runs:** `43686625196`, the 06:41:55Z manual #850 review, killed after 47m35s at 07:03:41Z on the free-usage wall (issue #754). Published nothing.
- **#854 round-1 review:** `43690826495`, event `issue_comment`, 07:38:13Z -> 08:19:23Z, **success**, verdict **`lab`**. Owner-PAT publication and verdict forward skipped at 08:19:19Z (`state='unknown'`). Bot CLI final message at 08:19:13Z only.
- **Curator:** `43719976714` (schedule, 13:37:43-13:47:32Z) **success**, decision `[]`; it was a schedule arm with `issue_num=""`, so its owner-PAT enumeration never ran and it is **not** a token signal.
- **Recover:** `43722376618` (detect, 14:04:54Z) dispatched this run; the heartbeat marker was posted at 14:05:32Z. The owner-PAT approve step at 14:05:10Z is the fresh token signal (72ms, no API).
- **Maintainer fan-outs:** `43693953143` (08:19:26Z) and `43720844194` (13:47:36Z) both **skipped**. The 20-minute cron is platform-throttled; the recover arm is the independent wake source.
- **Held (`action_required`) runs**, all created 07:38:12Z on `opencode/issue803-20261115060707`: `43690826057` (opencode-pr-trigger), `43690826207` (Deploy static site), `43690826030` (maintainer). Only an owner-PAT approve sweep can clear them; none has run since 08:19Z.
- **Queued runs:** 7 inert historical entries (`42971888736` from 11-11, `37344324101`, `36101155868`, ...) on long-dead branches; no new queued trigger.
- **Pages:** production `43686637154` green on `e5cd250c`; #850 preview green on `9c9bf1bd7`; #854 preview is the held run above; the 08:19:24Z Deploy for the curator commit skipped.

### The owner-token incident (blocking, open)

- **Last confirmed good use:** 07:38:09-07:38:13Z (the #803 push and the review trigger post).
- **Rejections:** 07:49:33Z (`remote: Invalid username or token` on the #745 force-push, and `HTTP 401: Bad credentials` on the lab forward); 07:53:43Z (the 07:43 schedule's #850 review post); 08:19:19Z (the #854 review's owner-PAT PR-state read returned `unknown`, so publication and forward skipped); **14:05:10Z (fresh: the recover arm's approve sweep `gh pr list` returned in 72ms with stderr suppressed and the loop body never ran).**
- A running job's secret context is fixed at job start, so this run's trigger posts are expected to 401. They fail harmlessly (the trigger step is tolerant) and the queue survives here. Only the Owner can refresh the secret. No run can repair it, and none should try.
- The heartbeat dispatch itself uses the bot token, so it proves only the bot path. The 08:19Z bot "Review complete" comment is the CLI final message, not the owner report.
- **Action for the next session:** test the PAT only through the designed trigger posts or an approve sweep; never print or copy the token. If the posts land, work through the queue; if not, re-record the failure date and the queue and stand by.

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

The new `lab` decision on #854 carries this list. It is the intended handoff; the reviewer's own forward was skipped by the token, not declined.

### Model registry and trigger allowlist

- **Registry:** 86 models, 11 free. Pin and small model `opencode/deepseek-v4.1-flash-free`. Ladder: `deepseek-v4.1-flash-free`, `mimo-v2.6-flash-free`, `glm-5.3-flash-free`, all live/free in `opencode models`. No change this run.
- **Allowlist:** `maintainer.yml` lists 19 workflows (auditor, Deploy static site to GitHub Pages, Lab Engineer, opencode-review, opencode-pr-trigger, opencode-test, opencode-peros-test, ideate, opencode, opencode-recover, poolduel-m1, poolduel-m2, poolduel-m9, poolduel-m10-soak, curator, opencode-eval, tor-cli, pet-release, maze-chase-release). The live repo has 23 active names, exactly those 19 plus `maintainer`, `Dependabot Updates`, `Dependency Graph`, and `pages-build-deployment`. **No drift.**

### Workspace note

- This wake is `workflow_dispatch`; the checkout is the trusted default-branch commit. No protected-path edits, no model edit (`opencode.json` still pins `opencode/deepseek-v4.1-flash-free` for model and small model). No emergency file. All work is routed through the decision file.

## Live lanes and their next step

- **#854** (protected-path auto-retry scoping, slice 3 + hardening): one `lab` queued with the round-1 review list. On push: the lab workflow forwards a fresh review; only after a clean verdict does the Tester/eval/PAT sequence apply. Do not merge or close #803 before the guard lands.
- **#850** (owner-PAT pager hardening, `Closes #848`): one fresh head-bound `review` queued on `9c9bf1bd7` (the 06:41 manual run died on the wall; the 07:53 post 401ed). When it lands: dispatch `lab` on #849 (owner-PAT pagers on the 30-row board + `Fixed the bug` without `Fixes` detection), then the #804 residuals, docs gaps, and #814. Fix its `Closes #848` trailer before any merge.
- **#849** (owner-PAT pager false-positive): lands after #850; expanded scope: owner-PAT pagers on the 30-row board read (`gh api --paginate --slurp ... jq flatten`) and allowing `Fixed the bug` without `Fixes`.
- **#848** (premature fix-forward paging): the #850 guard supersedes the older #798-era fix guard; docs in #850 only.
- **#745** (orphaned #798 audit/rebuild + the old #76 Pac-Man scanner): one `lab` rebase retry re-queued. The 06:08 bot comment said work was implemented locally and lost to the push 401; the branch has not moved. After push: verify the force-push, dispatch one forward review, and keep #853 open until the verdict. This PR is a distinct co-consumer of the #803/#853 family, not a leftover; it wants a retitle and `Refs #853`.
- **#821 / #823** (Point of Sale staging, live on Pages): parked by Priya. Do not dispatch. If the Close wants a name change, one `lab` will do it.
- **Site lane:** #818 Putt-Putt landing page, #819 Neon Drift, #820 Stack Tower are closed-but-live (by design). **#814** is the build; **#813** the docs; **#815 / #812** the Overcooked asset packs, with a local variant pending Owner feedback. #804 holds the Overcooked data. #722 / #823 are data-only. Do not invent site projects.
- **#836** heartbeat (open, unlabelled): the recover arm is the wake source; the maintainer cron stays throttled. **#831**: capacity decision, open. **#713**: Overcooked asset PR; **#728 / #742 / #67 / #42**: slow/frozen standing items, no action unless the Owner asks.
- **Board / health:** #70 is the only board. Every ping ends with the Maintainer sign-off; every escalation names one issue and one concrete next step; no inline trigger tokens anywhere (#775).
- **Eval lane:** keep routing new multi-agent architecture to `eval`; `agent-nexus` stays out (evals floor), `agent-polis` in. No paid runs.

## Serialized queue (re-post these; do not re-decide)

1. `{"action":"lab","pr":854,"instruction":"<the round-1 review findings in today's log>"}`.
2. `{"action":"lab","pr":745,"instruction":"Retry the #745 rebase onto e5cd250c; add Refs #853; no Closes trailer; verify with git ls-remote after the PAT push>"}`.
3. `{"action":"review","pr":850,"head":"9c9bf1bd72fb459388d2985656f6f61735147105"}`.
4. Pings: #70 (incident update; already posted this run if the bot path worked) and #854 (verdict preserved; already posted this run if the bot path worked). **Do not duplicate the pings in the very next run if they landed; check the comment tails first.**
5. After #854's branch push: the forwarded review; after #850's verdict: `lab` on #849; after #850's merge: #804 residuals, docs gaps, #814.

**Do not** re-post a trigger whose target already has a live or queued run from the last 30 minutes, and do not post two lab triggers to the same PR in one run (the workflow dedupes by `(action, target)`).

## Loose ends

1. **The owner token is the top blocker** (see above). Only the Owner can refresh it. The queue and this file are the recovery path.
2. **Held runs `43690826057`, `43690826207`, `43690826030`** on the #854 branch need an owner-PAT approve sweep. The NEXT_PAT-healthy recover or maintainer run should clear them.
3. **The 08:19 #854 report** is lost from the PR. The blocking findings are in today's log and the new lab instruction; if the lab pass lands, no re-publication is needed, but the next review should verify each item explicitly.
4. **#745 stale bot review:** after the fix-up, delete the older bot review on the exact commit id if it is still present; filter by `commit_id`, not just author.
5. **#850's body** has `Closes #848` (not on a `Refs` trailer). Normalize at merge; do not add a second trailer.
6. **#853's body chronology** says the work was lost and then reimplemented; prepend one sentence "Update: 2026-11-15T06:08Z, the work was reimplemented locally; the ONLY thing left is the push + retry (re-dispatched 07:38Z)" so a cold reader can tell current from history. Only worth a `lab` edit once #745 lands.
7. **#849 scope mismatch:** its premise still quotes the old body text; the expanded scope lives in #850's body. When #850 lands, add the expansion to #849's body first.
8. **The `INFRA-STATUS` block on #70** is stale (10-21) but still factually fine for #70. If a real infra change happens, refresh it in the same post.
9. **Dependabot PRs** remain no-ops: the "all Dependabot PRs" on-ramp only fires for open PRs and none are open.
10. **No merge authority** is assumed: the reviewer approval is not a formal review; the Owner merges.

## Standing rules I operate under

### Safety and autonomy

- Never post `/oc` comments by hand, never create/edit labels, issues, PRs, or branches, never commit, push, force-push, merge, delete branches, or open PRs. Only the hardcoded workflow steps act, under the owner PAT and the budget gates.
- Never edit code on `main`. Only protected-path edits would be rebuilt under the emergency revival contract; none is warranted. The only branch/PR action I may take is the governed `recover` route, and only when a recoverable PR is closed or orphaned.
- No `ftr`/sweep PRs, no unconditional re-scans: an empty queue and "standby" are the correct answer when nothing new is due.
- Do not re-dispatch a model/agent evals run (`opencode-eval` job hangs; the maintainer cron already hangs at 90m; cost/ETA risk). Route tuning to `eval` only when the Owner asks.
- All work goes through the decision file; one entry max per action per target per run; distinct actions may target the same PR in one run.

### Trigger and token discipline

- The workflow posts triggers from the decision file as the owner only in the "Run /oc triggers as owner" hardcoded step. My decision entries are inert data; I never author a trigger comment during the session.
- Pings and the public comment are posted by the bot token, so they land even when the owner PAT is broken. All public text must be honest, specific, and signed with ` -  Hephaestus, the Maintainer`.
- Escape hatch: "if the token is dead, the queue is the test; do not attempt credential workarounds." Do not restate the incident on every issue; keep the detailed incident on #70 and the log.
- Never include a trigger token in a ping body (#775). The memory branch and the log may quote decisions, but public pings must not carry `eval-verdict:` markers or `/oc` tokens.

### Review, test, and merge gates

- The reviewer verdict is advisory; it is not a GitHub approval and does not merge. Never merge.
- Required gate sequence after a successful review on a non-protected PR: `test` (OS chosen by the touched paths) THEN `{"action":"eval"}` THEN a PAT sweep, then the bot verification. Never post a `test` trigger before the review verdict is on the PR, and never post a test/eval pair on the same PR in one run.
- Protected paths (`.github/workflows/**`, `.github/agents/**`, `opencode.json`, `AGENTS.md`, `LAB.md`) require the Lab Engineer route; the Maintainer's PAT step may push only under a valid emergency declaration.
- A green audit is not a merge approval. Deploy keys, workflow names, and mutable actions are pinned and trusted at the default branch; the Tester/PAT gates enforce.

### Audit lane rules (current, from #798 and its reviews)

- `silent-stall-audit.sh` is the mutation harness; R19/R20/R21/R23/R28/R32 are part of the shell parser/classifier guard story. A full run is ~10 minutes; do not accept a partial "fast" run when a real change needs the full harness.
- Every incident-scope counter must capture the payload first, never `|| true` after the pipeline, and must treat an unreadable head/enumeration as fail-closed (the #854 review B2/B3 classes). The leak guard and the PAT redaction work is the #798 family; the new code must not regress it.
- The delegation ledger is capped at 3-8 lines; it must list the subagents actually used, one line each, plus a skills line. Do not claim delegation that did not happen.
- The reviewer rejects fixes that claim fail-closed while keeping a silent fallback; the docs must state the exact boundary.
- No em dashes in repo files; no direct workflow edits outside a `lab` route.

### Contract and memory

- Output contract each run: `.maintainer/decision.json` (array), `.maintainer/comment.md` (empty unless a target exists), `.maintainer/log-entry.md` (FULL day file: existing bytes + today's entry), `.maintainer/state.md` (this file), `.maintainer/personality.md` only if identity evolved, `.maintainer/emergency.json` only under the failed-lab + halted-production contract.
- The log is append-only; today's file is 1,076 lines / 154,397 bytes before this entry. The publish step isolates the delta against the materialized baseline and recomposes on a fresh tip with keep-both semantics. Never write a partial day file.
- The log entry must include the state snapshot, decisions + rationale, callbacks, the run link, and open questions. The state must stay honest about what is verified vs expected.
- The memory branch is shared tooling; do not delete or rewrite prior entries.

### Persistent facts

- Main is a single fast-forwardable history; the repo pushes are the owner PAT's job; the orphan guard must never rewrite main.
- The board is #70; its exact title is the resolver anchor; the `lab-health` label is exclusive.
- The recover arm is the heartbeat source; the maintainer cron is throttled. A stale STATE stamp is the wake signal; a skipped fan-out is not a real session.
- The free-usage wall is a real class (47m35s queue death on 07:03:41Z); one manual fresh review is the only re-dispatch when the auto-retry budget is spent.
- The owner PAT is shared by the maintainer, review, curator, recover, and lab forward/push steps; one invalid secret explains a whole cluster of 401s. Do not confuse it with the bot token.

## Next run

1. Check the comment tails (#70, #854, #850, #745) for the posts this run queued. If the `lab`/`review` triggers landed, do not re-post; if they 401ed, re-post the queue after any Owner refresh signal.
2. If #854's lab pass pushed: watch the forwarded review; verify B1-B3/H1-H5 and the `Refs #853`/`Closes #803` rewrite. If it died, preserve its decision file and re-dispatch once.
3. If #850's review is live/queued, do not post another; when it completes, route `lab` on #849. Verify the `Closes #848` trailer.
4. If #745's retry pushed, verify with `git ls-remote`, dispatch the fresh review, keep #853 open.
5. Verify the board invariant, allowlist count, and model pin; if clean, stand by. Do not invent work.
6. If a new real failure appears, check for a wall/401 before routing; both are known classes.

## Open questions

1. When will the Owner refresh the secret, and was it already rotated before this job started? (No owner-PAT success since 07:38:13Z; the 14:05:10Z sweep says no.)
2. Will the #854 lab pass fit one round, or will the mutation harness plus the three fail-closed classes need a second?
3. Does the #745 branch still merge cleanly onto `e5cd250c`, and is its scope still distinct from #804?
4. Does #849 still absorb the remaining owner-PAT surfaces when #850 lands, and is its body expansion enough?
5. Will the Owner take the capacity decision (#831) and the scratch canary?
