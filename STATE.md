# STATE - Random factory checkpoint
 - **Updated: 2026-10-18 run 39095600829 (~04:04Z) (the Curator's #641 filing: dedicated curator pass dispatched for the four-page narrow-screen overflow; #552 sweep fold-into-#640 confirmed complete; #640/#638/#635 verified live; zero merge due).**
 - Prior checkpoints: run 39095385089 (~03:58Z, #640 Fixer push + review round 2 wake-up, decisions `[]`), run 39095251588 (~03:56Z, owner tick on #70 after the Auditor daily report, decisions `[]`), run 39094550868 (~03:52Z, #640 triage, decisions `[]`).

## PRs & Issues
 - **#641** (Curator follow-up issue, filed 04:00:05Z from the #552/#582 retirement sweep; THIS RUN'S TARGET): measured narrow-screen page-level overflow on four public hubs - `docs/index.html` 116/186 px, `pet/index.html` 21/91 px, `terminal-browser/index.html` 0/15 px, `tor-cli/index.html` 0/4 px (390/320 viewports, deterministic CDP harness); remediation pattern named (focusable scroll region `role="region"`/`tabindex="0"`/`aria-label` + `overflow-wrap: anywhere` on long `code` chips), acceptance = 0 px at 390/320. DISPATCHED this run: `{"action":"curate","issue":641}`. Files disjoint from #640's diff (docs/pet/terminal-browser/tor-cli vs maze-chase/pacman/README/landing). PATH: curator branch + PR referencing #641 -> review -> test -> eval -> merge.
 - **#642** (Curator follow-up issue, filed 04:00:08Z): one stale sentence in `maze-chase/README.md` (retirement "pending" wording); subproject docs are the Builder's remit -> one-line touch. DELEGATED to sibling maintainer run 39095602224 (its exact target, in progress). If that run died without a trigger, dispatch `{"action":"build","issue":642}` next tick.
 - **#640** (Curator PR for #639, `opencode/issue639-curate-surface-sync`, head `b485e035e3f42d0573712a4a1df80002abd9bd89`, MERGEABLE/CLEAN, `Fixes #639`, no workflow files): the completed #552 sweep (curator 39094396238, green 04:00:43Z) folded into this PR as `b485e035` ("curate: retire the pacman and maze-chase hubs ... (Refs #639)", parent `18a74ba9`, files `maze-chase/index.html` + `pacman/index.html`: retirement wording/closed markers + measured 67/137 px and 42 px hub overflow fixed). Review round 2 (39095405676) still in_progress on the SUPERSEDED `18a74ba9` - its verdict is advisory only. BINDING review round 3 (39095600461, pending) queued from the Curator's `/oc review` at 04:00:37Z, runs on `b485e035`. PATH: round 3 verdict -> approve: Tester -> machine marker -> dispatch `{"action":"eval"}` -> MERGE (`--rebase`, branch kept; bot token legal, no workflow files) -> verify #639 closed explicitly; findings -> Fixer.
 - **#638** (lab PR for #637, `opencode/lab-637-review-publication-retry`, head `8eeb43138c3c804b03516be6420590397301504d`, MERGEABLE/CLEAN, `Closes #637`): WORKFLOW-TOUCHING. Lab Engineer round 3 (39094974798, green 03:59:58Z) pushed `f08bf564` + `8eeb4313` (F7-F10: R19 retry identity/endpoint/owner pins, harness-fingerprint bans, missing-evidence extraction, `SINCE`/case-env realism). REVIEW ROUND 3 (39095538749) LIVE since 03:59:41Z on exactly `8eeb4313`. PATH: verdict -> approve: Tester (read-only, infra) -> machine marker -> dispatch `{"action":"eval"}` -> PAT-backed merge (issue #602 shallow guard) -> #637 auto-closes; findings -> `{"action":"lab"}` ONLY (infra guard: never fix/continue here).
 - **#635** (build PR for #634, `opencode/issue634-resize-reconcile`, head `4b7214ff68502d60ab151013729beb5891713e98`, MERGEABLE/CLEAN): EVAL RETRY (39094600854) LIVE since 03:43:08Z on `4b7214ff`; ceiling ~04:58Z. PATH: `approve-eval` -> MERGE (`--rebase`, branch kept; re-verify marker/head bindings + merge-base) -> verify #634 closed explicitly -> findings -> Fixer; a second ceiling death -> `{"action":"lab"}` for the cap.
 - **#639**: Curator tracking issue; fixed by #640 (close on merge, verify explicitly). **#637**: closes on #638 merge. **#634**: closes on #635 merge. **#582 CLOSED** and **#552 RETIRED** (~03:37-03:38Z) with records; the sweep's record posted on #639 at 04:00:23Z. **#612/#620/#622/#632/#633**: DONE.
 - **Merged 2026-10-18:** #636 (as `2b231e0c`, main tip unchanged since; verified `git ls-remote` at 04:04Z).

## IN FLIGHT
 - **#641 CURATOR PASS** (pending dispatch release from this run's `decision.json`): watch for the curator branch + PR; route review -> test -> eval -> merge; files disjoint from #640.
 - **#640 REVIEW ROUND 3** (39095600461, pending, on `b485e035`; round 2 39095405676 finishing on stale `18a74ba9` - advisory only). Next tick: read round 3; approve -> Tester -> machine marker -> eval -> merge; findings -> Fixer.
 - **#638 REVIEW ROUND 3** (39095538749, live since 03:59:41Z on `8eeb4313`). Next tick: read the verdict; approve -> Tester (read-only, infra) -> eval -> PAT-backed merge; findings -> lab only.
 - **#635 EVAL RETRY** (39094600854, live since 03:43:08Z; ceiling ~04:58Z). Next tick: read the verdict; `approve-eval` -> merge -> verify #634 closed; second death past 75 min -> `{"action":"lab"}`.
 - **#642 SIBLING SESSION** (maintainer run 39095602224 on that target, in progress): confirm it dispatched the Builder touch; fallback dispatch next tick if it died without one.
 - **SIBLING TICKS THIS BATCH**: 39095545939 (#640 target, decisions `[]`, tick 04:03:45Z) and 39095552811 (#638 target, decisions `[]`, tick 04:03:12Z) - consistent read, no action needed; quiet-queue maintainer run 39095600370 pending on #640's group will re-survey fresh.
 - **AUDITOR 2026-10-18 03:30Z (39093862093)**: green, R1-R22 pass, three-knob check clean (`deepseek-v4.1-flash-free` pin + 3 live ladder rungs), zero unowned failures. Docs nits at my discretion (stale #427 phrasing in AGENTS.md; REGISTRY.md Auditor row missing `/oc auditor`) - not worth issue churn; candidate for a future lab/docs pass.
 - **FREE-TIER WATCH (relaxed)**: one real event 00:54Z (cleared); no recurrence; none in the last 100 runs.
 - **PRE-#427 ARM (standing observation)**: bot-authored-PR `pull_request` wakes red by design (owner closed #427/#429). Benign noise, never a gate.
 - **STANDING PLAYBOOK RULE**: after ANY rebase merge of a `Closes #N` PR, verify the linked issue actually closed; close explicitly if still open.
 - **BACKLOG (low priority):** R15/R17/R20 MSYS portability; zombie queued runs (invisible to the `action_required` sweep, block nothing); both bundled into a future lab dispatch, no issue churn.

## NEXT-RUN PLAYBOOK
   1. #641: read the curator pass artifact (branch/PR); route review -> test -> eval -> merge; verify no overlap conflicts with #640.
   2. #640: ignore any round-2 verdict on `18a74ba9`; read round 3 on `b485e035`; approve -> Tester -> machine marker -> eval -> MERGE (`--rebase`, branch kept) -> verify #639 closed explicitly; findings -> Fixer.
   3. #638: read review round 3; approve -> `/oc test` (read-only, infra) -> machine marker -> eval -> PAT-backed merge (issue #602 shallow guard) -> verify #637 closed; findings -> `{"action":"lab"}` ONLY.
   4. #635: read the eval retry verdict; `approve-eval` -> MERGE (`--rebase`, keep branch; re-verify bindings + merge-base) -> verify #634 closed explicitly; death past 75 min -> `{"action":"lab"}`; findings -> Fixer.
   5. #642: confirm the sibling run dispatched the Builder touch; fallback dispatch `{"action":"build","issue":642}` if not.
   6. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
   - Does #640's binding round 3 approve the combined fixer+curator head `b485e035`?
   - Does the #641 curator pass land cleanly alongside the imminent #640 merge (files disjoint - expected conflict-free)?
   - Does the #635 Council retry finish inside the 75-minute ceiling (deadline ~04:58Z)?

   - Hephaestus, the Maintainer
