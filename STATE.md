# STATE - Random factory checkpoint
 - **Updated: 2026-10-18 run 39156804320 (~19:05-19:08Z) (the self-triage `/oc maintainer` wake on bot-created Section C issue #684: zero dispatch - #684 is roadmap-consumed (Parent #582, Phase 2, workstream #656); every live lane verified healthy: #654 infra Tester live since 18:52:14Z (~14 min), #670 lab live since 17:59:38Z (~67 min of 90), #582 design session live since 19:01:03Z and Phase 2 build queued since 19:01:05Z; main tip `f5041f32` (ls-remote), Pages GREEN on it (39156825550); zero failures/held runs in last 100; allowlist exact 18/18; zero untriaged work outside the deliberate Section C cohort)**
 - Prior checkpoints: run 39156825729 (~19:01-19:12Z, the 19:01Z `/oc maintainer` wake on #654: zero dispatch - #654 round-9 approved `16dedc98` with the infra Tester live since 18:52:14Z; #670 lab still live; post-merge playbook verified landed; Pages green verified; Section C numbers recorded), run 39156764073 (~19:00-19:08Z, self-triage on #671: cohort disposition recorded, zero dispatch), run 39156369277 (~18:55-19:05Z, #662 MERGED `f5041f32` at 18:57:11Z; post-merge playbook executed via decisions - 14 Section C create_issue, `design` on #582, Phase 2 `build` on #582), run 39154978157 (~18:37-18:44Z, full review->tester->fix->review cycle on #662; #654 round-8 `lab` verdict; #670 lab live), run 39152313250, run 39150137794, run 39149105288. Older detail in the day logs.
 - MERGED today (re-verified): **#662 `f5041f32` (18:57:11Z; the Phase 1 overhaul PR, rebase, #582 left open)**, #667 `fb8b34c1` (16:27:58Z; #665 closed 16:27:59Z), #664 `16bb395f` (16:05:48Z; #663 closed 16:05:51Z), #635 `28eacb99`, #652 `f66eca3a`, #651 `672bb8bb`, #649 `ad08112c`, #646 `a9f703ad`, #644 `5d9797f0`, #643 `726f269a`, #640 `2d829703`, #638 `498638fe`. Main tip `f5041f32` (ls-remote verified).

## THE OVERHAUL (primary lane; parent #582; roadmap ON MAIN)
 - **Owner directive**: https://github.com/Userfrom1995/RandomLabs/issues/582#issuecomment-6249701945 (12:05:13Z). Binding asks: (1) real-terminal compatibility matrix incl. Kitty and Ghostty on Linux/macOS/Windows, no unverified compatibility claims; (2) genuinely dynamic full-window terminal layout at any size/aspect; (3) real distributable releases for terminal + desktop on all platforms (RPM/DEB, Windows/macOS installers, automated reproducible pipeline, official release page, install/upgrade/uninstall docs); (4) visual redesign (characters/environments/effects/animation); (5) sound redesign with volume/mute controls; (6) Pages = the complete game with dedicated download/install/docs/compatibility/release subpages; (7) architecture reassessment + full-product verification on real platforms. No completion from compile/CI alone.
 - **Roadmap on main**: `progress/582-maze-chase-overhaul.md` (eight semantic phases; Phase 1 landed via #662) plus `progress/582-maze-chase-overhaul-findings.md` (the evidence ledger).
 - **THE SEVEN WORKSTREAM SUB-ISSUES (attached to #582; all open)**: #655 terminal compatibility matrix; #656 dynamic terminal layout; #657 release engineering; #658 visual redesign; #659 sound design overhaul; #660 Pages complete game + subpages; #661 architecture reassessment + full-product verification. Roadmap-consumed by their phase PRs; do NOT route them individually.
 - **SECTION C SUB-ISSUES (14, all open, filed 19:00:34-19:00:59Z by run 39156369277; NUMBERS RECORDED)**: #671 kitty reply loop; #672 Ghostty live kitty probe; #673 re-rasterize at real cell size; #674 resize contract; #675 continuous cell scales; #676 desktop max-pixel freeze; #677 desktop HiDPI; #678 desktop idle CPU; #679 warden facing; #680 fright mask; #681 reduced_flash coverage; #682 audio baseline; #683 release-claims sweep + Windows E2E re-sign gate; #684 min-size copy alignment. Each body carries `Parent: #582`, the phase, the workstream (#655-#661), evidence citations, and acceptance criteria. **ROUTING RULE: phase-consumed tracking items; their phase PRs close them. Do NOT dispatch workers on them individually.** The self-dispatch maintainer runs pinging them are disposition-only ticks (#671 19:04:40Z, #684 19:07Z); watch they stay quiet.
 - **POST-MERGE PLAYBOOK (all verified landed)**: (1) #582 verified open; (2) Section C set = #671-#684; (3) `design` dispatch -> opencode run 39156808919 (design job live since 19:01:03Z, group `opencode-design-582`); (4) Phase 2 `build` dispatch -> opencode run 39156811031 (pending since 19:01:05Z, group `opencode-build-582`; phase "Dynamic Terminal Layout and Full-Window Composition", `Closes #656` per the roadmap).
 - **Pages on `f5041f32` VERIFIED GREEN**: run 39156825550 SUCCESS (19:02:07Z). Standing post-merge check complete.

## IN FLIGHT
 - **#654 (head `16dedc98`, `Fixes #653`)**: review round 9 APPROVED at 18:52:08Z; infra Tester run 39156143436 live on exactly that head since 18:52:14Z (~14 min at this survey; verdict pending). Remote tip `16dedc98`, mergeable=MERGEABLE against `f5041f32`. On the machine-published `approve-test` -> PAT merge sweep (workflow-touching) -> verify `Fixes #653` closes #653 + Pages green -> THEN dispatch `{"action":"lab","issue":669}` (never parallel with #654).
 - **#670 (head `3d618786d8`, `Closes #668`)**: lab run 39152087560 live since 17:59:38Z (~67 min at survey; 90-min agent / 120-min job caps). Test-only R24 escape classes; shipped dedupe handler verified correct end-to-end. On push -> review round 3 -> tester -> PAT sweep (workflow-touching) -> verify #668 closes. If the cap reds, crash-parity summons triage on the next tick.
 - **#669 (403 abuse-traffic class)**: filed; route `lab` ONLY after #654 lands (same runner files).
 - **Design lane (#582)**: Design Council session live (39156808919, started 19:01:03Z); watch for `docs/design.md` + tokens PR, its review, and Phase 4-5 binding.
 - **Phase 2 lane (#582)**: build run 39156811031 pending/running (started 19:01:05Z); watch for the Builder branch/PR (`opencode/issue582-*`), `Closes #656`, `Refs #582`.
 - **Open issues**: #582 (parent, OPEN), #653, #655-#661, #668, #669, #671-#684, boards #70/#42. No untriaged work outside the deliberate Section C cohort.
 - **STANDING PLAYBOOK RULE**: after ANY rebase merge of a `Closes`/`Fixes` #N PR, verify the linked issue actually closed; close explicitly if still open.
 - **STANDING POST-MERGE RULE**: after a merge that advances main, verify Pages success (bot merges emit no workflow events; the hardcoded post-session step dispatches the deploy with the PAT).

## WATCH ITEMS
 - **WATCH - #670 lab duration**: ~67 min at survey; caps bound it and crash parity covers a death.
 - **WATCH - #582 design/build parallel lanes**: design live, Phase 2 build pending behind runner availability; separate concurrency groups (`opencode-design-582` / `opencode-build-582`) by design. Watch for branch collisions between the design PR (docs/tokens) and the Phase 2 build PR (both touch `maze-chase/`).
 - **WATCH - concurrent maintainer instances**: this self-triage wake (#684) plus possible sibling self-dispatches for other Section C issues; disposition-only posture; the #647 publish contract keeps memories intact.
 - **WATCH - provider 403 abuse-traffic class**: two occurrences today (12:26Z lab, 16:14Z test), both first-call deaths recovered by re-dispatch. Issue #669 covers the fix; route lab after #654.
 - **WATCH - bot-actor PR-event arm reds (standing, cosmetic)**: every bot-authored PR open reds the redundant `pull_request` maintainer arm (CLI refuses `github-actions[bot]`, permission: none); Owner closed #427/#429 unmerged; standing observation only.
 - **WATCH - sparse schedule**: 5 cron ticks today; covered by comment/PR/failure arms; re-check tomorrow.
 - **WATCH - double owner wakes**: absorbed by the single-slot superseding design; watch for a pattern.

## BACKLOG (low priority; do not act unless idle)
 - #662 tester non-blocking hardening (crafted-run-dir-only: decompression-bomb cap, crafted-log path escape, basename collisions, malformed meta/events shapes, kitty a=t/a=f uncounted, whitespace-only unverified-reason) + per-phase attribution boundary.
 - #654 non-blocking residuals (R15 PASS-banner backtick cosmetic [fixed round 8]; bounded tee wait; microsecond hang_flag race; `idle+hang_idle_seconds` first-poll variant; audit script final `exit 0`; `LAB.md:199` job-vs-step timeout imprecision).
 - #670 non-blocking (duplicate-title in-run triage memo).
 - #635 Council non-blocking findings; older R15/R17/R20 MSYS portability; zombie queued skip-only runs (inert); docs nits (stale #427 phrasing; REGISTRY.md Auditor row).

## NEXT-RUN PLAYBOOK
   1. #654: watch the infra Tester (live since 18:52:14Z). On machine-published approve -> PAT sweep -> verify #653 closes + Pages green -> THEN dispatch `{"action":"lab","issue":669}`.
   2. #670: watch lab 39152087560 (cap ~20:00Z); on push -> review round 3 -> tester -> PAT sweep -> verify #668 closes.
   3. #582 lanes: watch the design session (39156808919) and the Phase 2 build (39156811031) for their branches/PRs; route them through review -> test -> merge.
   4. Failure triage: correlate first; re-dispatch only when no session is live/queued for the signature. The bot-actor PR-event arm reds stay un-dispatched (standing class).
   5. Section C (#671-#684): phase-consumed; no individual routing; their phase PRs close them. Disposition-only ticks if self-dispatch wakes arrive.
   6. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
   - Does the #654 infra Tester approve and unblock the #669 lab dispatch?
   - Does the #670 lab fix clear review round 3 before its cap and close the #668 lane?
   - Does the Design Council pass on #582 complete (docs/design.md + tokens) well before the Phase 4 build, and does it clear review cleanly?
   - Does Phase 2 start fresh from `main` on a clean branch and land `Closes #656`?
   - Do the concurrent Section C self-dispatch maintainer runs stay quiet (disposition-only)?
   - Does the schedule density (5 ticks today) hold tomorrow?

   - Hephaestus, the Maintainer
