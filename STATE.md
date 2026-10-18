# STATE - Random factory checkpoint
 - **Updated: 2026-10-18 run 39158998538 (~19:29-19:33Z) (the 19:29Z `/oc maintainer` wake on #670: zero dispatch - #670 lab fix LANDED `4669d5bf` (branch rebased; PAT force-push verified; the non-fast-forward wrapper rejection is force-push-path noise, not lost work) with review round 3 live on exactly that head (39158998711); #654 tester round closed 19:29:58Z with R15 findings, NOT an approval -> `/oc lab` forwarded 19:29:53Z, lab run 39159029688 live on it; #582 design live since 19:01:03Z (~30 min) and Phase 2 build queued since 19:01:05Z (watch the queue latency); main tip `f5041f32`; zero failures/held; allowlist exact 18/18; Pages green on main + #670 preview `4669d5bf`)**
 - Prior checkpoints: run 39156804320 (~19:05-19:08Z, self-triage on #684: cohort disposition, zero dispatch), run 39156825729 (~19:01-19:12Z, the 19:01Z `/oc maintainer` wake on #654: zero dispatch; Section C numbers recorded; post-merge playbook verified), run 39156764073 (~19:00-19:08Z, self-triage on #671: cohort disposition, zero dispatch), run 39156369277 (~18:55-19:05Z, #662 MERGED `f5041f32` at 18:57:11Z; post-merge playbook executed via decisions - 14 Section C create_issue, `design` on #582, Phase 2 `build` on #582), run 39154978157, run 39152313250, run 39150137794, run 39149105288. Older detail in the day logs.
 - MERGED today (re-verified): **#662 `f5041f32` (18:57:11Z; the Phase 1 overhaul PR, rebase, #582 left open)**, #667 `fb8b34c1` (16:27:58Z; #665 closed 16:27:59Z), #664 `16bb395f` (16:05:48Z; #663 closed 16:05:51Z), #635 `28eacb99`, #652 `f66eca3a`, #651 `672bb8bb`, #649 `ad08112c`, #646 `a9f703ad`, #644 `5d9797f0`, #643 `726f269a`, #640 `2d829703`, #638 `498638fe`. Main tip `f5041f32` (ls-remote verified).

## THE OVERHAUL (primary lane; parent #582; roadmap ON MAIN)
 - **Owner directive**: https://github.com/Userfrom1995/RandomLabs/issues/582#issuecomment-6249701945 (12:05:13Z). Binding asks: (1) real-terminal compatibility matrix incl. Kitty and Ghostty on Linux/macOS/Windows, no unverified compatibility claims; (2) genuinely dynamic full-window terminal layout at any size/aspect; (3) real distributable releases for terminal + desktop on all platforms (RPM/DEB, Windows/macOS installers, automated reproducible pipeline, official release page, install/upgrade/uninstall docs); (4) visual redesign (characters/environments/effects/animation); (5) sound redesign with volume/mute controls; (6) Pages = the complete game with dedicated download/install/docs/compatibility/release subpages; (7) architecture reassessment + full-product verification on real platforms. No completion from compile/CI alone.
 - **Roadmap on main**: `progress/582-maze-chase-overhaul.md` (eight semantic phases; Phase 1 landed via #662) plus `progress/582-maze-chase-overhaul-findings.md` (the evidence ledger).
 - **THE SEVEN WORKSTREAM SUB-ISSUES (attached to #582; all open)**: #655 terminal compatibility matrix; #656 dynamic terminal layout; #657 release engineering; #658 visual redesign; #659 sound design overhaul; #660 Pages complete game + subpages; #661 architecture reassessment + full-product verification. Roadmap-consumed by their phase PRs; do NOT route them individually.
 - **SECTION C SUB-ISSUES (14, all open, filed 19:00:34-19:00:59Z; NUMBERS RECORDED)**: #671 kitty reply loop; #672 Ghostty live kitty probe; #673 re-rasterize at real cell size; #674 resize contract; #675 continuous cell scales; #676 desktop max-pixel freeze; #677 desktop HiDPI; #678 desktop idle CPU; #679 warden facing; #680 fright mask; #681 reduced_flash coverage; #682 audio baseline; #683 release-claims sweep + Windows E2E re-sign gate; #684 min-size copy alignment. Each body carries `Parent: #582`, the phase, the workstream (#655-#661), evidence citations, and acceptance criteria. **ROUTING RULE: phase-consumed tracking items; their phase PRs close them. Do NOT dispatch workers on them individually.** The self-dispatch flood from their creation has drained; any further wake is a disposition-only tick.
 - **POST-MERGE PLAYBOOK (all verified landed)**: (1) #582 verified open; (2) Section C set = #671-#684; (3) `design` dispatch -> opencode run 39156808919 (design job live since 19:01:03Z, group `opencode-design-582`); (4) Phase 2 `build` dispatch -> opencode run 39156811031 (queued since 19:01:05Z, group `opencode-build-582`; phase "Dynamic Terminal Layout and Full-Window Composition", `Closes #656` per the roadmap).
 - **Pages on `f5041f32` VERIFIED GREEN**: run 39156825550 SUCCESS (19:02:07Z), re-confirmed by deploy 39158999283 SUCCESS (19:29:31Z). Standing post-merge check complete.

## IN FLIGHT
 - **#670 (head `4669d5bf`, `Closes #668`)**: lab run 39152087560 SUCCESS at 19:29:24Z; the B1-B3 R24 hardening landed (branch rebased; PAT force-pushed `3d618786...4669d5bf` at 19:29:19.731Z; the 19:29:17Z non-fast-forward wrapper rejection is force-push-path noise - remote head verified via ls-remote). Review round 3 (39158998711) queued on exactly that head since 19:29:30Z. On approve -> tester -> on machine-published `approve-test` the PAT merge sweep (workflow-touching) lands it -> verify #668 closes + Pages green. #668 still OPEN.
 - **#654 (head `16dedc98`, `Fixes #653`)**: the read-only infra Tester (39156143436) concluded 19:29:58Z with findings, NOT an approval: four R15 escape classes let semantics-changing one-line mutants stay green (audit-only; runtime bytes identical to the previously verified head). `/oc lab` forwarded 19:29:53Z; lab run 39159029688 live since 19:29:56Z. Path: lab fix -> push -> review -> (re)test -> PAT sweep -> verify `Fixes #653` closes + Pages green. #653 still OPEN.
 - **#669 (403 abuse-traffic class)**: filed; route `lab` ONLY after #654 lands (same runner files; never parallel).
 - **Design lane (#582)**: Design Council session live (39156808919, started 19:01:03Z, ~30+ min); watch for `docs/design.md` + tokens PR, its review, and the Phase 4-5 binding.
 - **Phase 2 lane (#582)**: build run 39156811031 queued since 19:01:05Z (~30 min under post-flood runner load; watch it starts); watch for the Builder branch/PR (`opencode/issue582-*`), `Closes #656`, `Refs #582`.
 - **Open issues**: #582 (parent, OPEN), #653, #655-#661, #668, #669, #671-#684, boards #70/#42. No untriaged work outside the deliberate Section C cohort.
 - **STANDING PLAYBOOK RULE**: after ANY rebase merge of a `Closes`/`Fixes` #N PR, verify the linked issue actually closed; close explicitly if still open.
 - **STANDING POST-MERGE RULE**: after a merge that advances main, verify Pages success (bot merges emit no workflow events; the hardcoded post-session step dispatches the deploy with the PAT).

## WATCH ITEMS
 - **WATCH - wrapper push rejections changed shape on #670**: 17:19:58Z was the App-token workflow-permission rejection; 19:29:17Z was non-fast-forward after the session's own rebase. Both followed by a successful authoritative PAT push (verified each time). If a wrapper rejection ever occurs WITHOUT a subsequent PAT success, stop and escalate lab.
 - **WATCH - #654 R15 round**: audit-only fix expected; verify the lab's push lands and review round 10 runs on the new head. The earlier "one gate from merge" assumption is void.
 - **WATCH - #582 design/build parallel lanes**: design live, Phase 2 build queued ~30 min (post-flood runner load); separate concurrency groups (`opencode-design-582` / `opencode-build-582`) by design. Watch for branch collisions between the design PR (docs/tokens) and the Phase 2 build PR (both touch `maze-chase/`).
 - **WATCH - concurrent maintainer instances**: workflow_run fan-out plus self-dispatches; disposition-only posture; the #647 publish contract keeps memories intact.
 - **WATCH - provider 403 abuse-traffic class**: two occurrences today (12:26Z lab, 16:14Z test), both first-call deaths recovered by re-dispatch. Issue #669 covers the fix; route lab after #654.
 - **WATCH - bot-actor PR-event arm reds (standing, cosmetic)**: every bot-authored PR open reds the redundant `pull_request` maintainer arm (CLI refuses `github-actions[bot]`, permission: none); Owner closed #427/#429 unmerged; standing observation only.
 - **WATCH - sparse schedule**: 5 cron ticks today; covered by comment/PR/failure arms; re-check tomorrow.

## BACKLOG (low priority; do not act unless idle)
 - #662 tester non-blocking hardening (crafted-run-dir-only: decompression-bomb cap, crafted-log path escape, basename collisions, malformed meta/events shapes, kitty a=t/a=f uncounted, whitespace-only unverified-reason) + per-phase attribution boundary.
 - #654 non-blocking residuals (bounded tee wait; microsecond hang_flag race; `idle+hang_idle_seconds` first-poll variant; audit script final `exit 0`; `LAB.md:199` job-vs-step timeout imprecision) plus the new R15 escape-class closure tracked by the live lab round.
 - #670 non-blocking (duplicate-title in-run triage memo; unparseable create-stdout re-create path).
 - R17/R19 `trap ... EXIT` interaction leaks one /tmp dir per audit run (flagged for Maintainer triage in a #670 decision note).
 - #635 Council non-blocking findings; older R15/R17/R20 MSYS portability; zombie queued skip-only runs (inert); docs nits (stale #427 phrasing; REGISTRY.md Auditor row).

## NEXT-RUN PLAYBOOK
   1. #670: watch review round 3 (39158998711) on `4669d5bf`; on approve the Tester follows; on machine-published `approve-test` the PAT sweep lands it -> verify #668 closes + Pages green.
   2. #654: watch lab 39159029688 (the R15 escape classes); on push -> review -> tester; on approve-test the PAT sweep lands it -> verify #653 closes -> THEN dispatch `{"action":"lab","issue":669}`.
   3. #582 lanes: watch the design session (39156808919) and the Phase 2 build (39156811031, queued ~30 min - verify it starts); route their branches/PRs through review -> test -> merge.
   4. Failure triage: correlate first; re-dispatch only when no session is live/queued for the signature. The bot-actor PR-event arm reds and wrapper push rejections stay un-dispatched.
   5. Section C (#671-#684): phase-consumed; no individual routing; disposition-only ticks if self-dispatch wakes arrive.
   6. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
   - Does review round 3 approve `4669d5bf` and close the #668 lane when the tester follows?
   - Does the #654 R15 lab fix clear review and re-test, and does #654 land to unlock the #669 dispatch?
   - Does the Phase 2 build start from the queue, and does the Design Council ship `docs/design.md` + tokens well before the Phase 4 binding?
   - Does the wrapper-push rejection shape (non-fast-forward after rebases) recur, and does every occurrence stay followed by a successful PAT push?
   - Do the concurrent maintainer instances stay quiet (disposition-only)?
   - Does the schedule density (5 ticks today) hold tomorrow?

   - Hephaestus, the Maintainer
