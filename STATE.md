# STATE - Random factory checkpoint
 - **Updated: 2026-10-18 run 39156764073 (~19:00-19:08Z) (the self-triage dispatch for bot-created issue #671: cohort disposition recorded, zero dispatch; #654 review round 9 approved `16dedc98` at 18:52:08Z and the read-only infra Tester (39156143436) is live in its agent step since 18:52:14Z; #670 lab run 39152087560 still live since 17:59:38Z (~65 min at survey, within the 90/120-min caps); the #662 merge tick fully verified: Pages deploy 39156825550 SUCCESS on `f5041f32` at 19:02:07Z; design lane `/oc design` and Phase 2 build lane `/oc build this` posted on #582 at 19:01:01/02Z with opencode runs live/queued; all 14 Section C issues #671-#684 filed 19:00:34-59Z; zero failures, zero held runs, allowlist 18/18 exact)**
 - Prior checkpoints: run 39156369277 (~18:55-19:05Z, the 18:55Z tester-verdict wake on #662: #662 MERGED `f5041f32` at 18:57:11Z with ancestry + approval binding verified; post-merge playbook executed via the decision list: 14 Section C issues filed, `design` dispatched on #582, Phase 2 chained via `build` on #582; #654 round-9 approved; #670 lab live), run 39154978157 (~18:37-18:44Z), run 39152313250 (~18:03-18:10Z), run 39150137794 (~17:33-17:37Z), run 39149105288 + 39149046885 (~17:19-17:28Z), run 39148285952 (~17:09-17:16Z), run 39146073359 (~16:41-16:48Z). Older detail in the day logs.
 - MERGED today (re-verified): **#662 `f5041f32` (18:57:11Z; the Phase 1 overhaul PR, rebase, #582 left open)**, #667 `fb8b34c1` (16:27:58Z; #665 closed), #664 `16bb395f` (16:05:48Z; #663 closed), #635 `28eacb99`, #652 `f66eca3a`, #651 `672bb8bb`, #649 `ad08112c`, #646 `a9f703ad`, #644 `5d9797f0`, #643 `726f269a`, #640 `2d829703`, #638 `498638fe`. Main tip `f5041f32` as of 19:01Z (ls-remote verified).

## THE OVERHAUL (primary lane; parent #582; roadmap ON MAIN)
 - **Owner directive**: https://github.com/Userfrom1995/RandomLabs/issues/582#issuecomment-6249701945 (12:05:13Z). Binding asks: (1) real-terminal compatibility matrix incl. Kitty and Ghostty on Linux/macOS/Windows, no unverified claims; (2) genuinely dynamic full-window terminal layout at any size/aspect; (3) real distributable releases for terminal + desktop on all platforms (RPM/DEB, Windows/macOS installers, automated reproducible pipeline, official release page, install/upgrade/uninstall docs); (4) visual redesign (characters/environments/effects/animation); (5) sound redesign with volume/mute controls; (6) Pages = the complete game with dedicated download/install/docs/compatibility/release subpages; (7) architecture reassessment + full-product verification on real platforms. No completion from compile/CI alone.
 - **Roadmap on main**: `progress/582-maze-chase-overhaul.md` (eight semantic phases; Phase 1 landed via #662) plus `progress/582-maze-chase-overhaul-findings.md` (the evidence ledger). Phase 1 checklist item "new sub-issues routed through the Maintainer" is now effectively DONE (the 14 Section C issues are filed; a future phase PR may check the box).
 - **THE SEVEN WORKSTREAM SUB-ISSUES (attached to #582; all open)**: #655 terminal compatibility matrix (closes Final Phase); #656 dynamic terminal layout (`Closes` Phase 2); #657 release engineering (Phase 6); #658 visual redesign (Phase 4); #659 sound design overhaul (Phase 5); #660 Pages complete game + subpages (Phase 7); #661 architecture reassessment + full-product verification (Final Phase). Roadmap-consumed by their phase PRs; do NOT route them individually.
 - **SECTION C COHORT (14 tracking issues, filed 19:00:34-59Z by run 39156369277; all OPEN)**: **#671** kitty reply loop (Phase 3), **#672** Ghostty live kitty probe (Phase 3), **#673** re-rasterize at real cell size (Phase 2), **#674** resize contract (Phase 2), **#675** continuous cell scales (Phase 2), **#676** desktop max-pixel freeze (Phase 6), **#677** desktop HiDPI (Phase 6), **#678** desktop idle CPU (Phase 6), **#679** warden facing (Phase 4), **#680** fright mask (Phase 4), **#681** reduced_flash coverage (Phase 4), **#682** audio baseline (Phase 5), **#683** release-claims sweep + Windows E2E re-sign gate (Phase 6/Final), **#684** min-size copy (Phase 2). **ROUTING RULE (binding): roadmap-consumed tracking items; their phase PRs close them. Do NOT dispatch workers on them individually; do NOT post per-issue comments (the single disposition comment lives on #671).**
 - **POST-MERGE PLAYBOOK STATUS (after #662)**: (1) #582 open verified ✓; (2) Section C filed ✓ (#671-#684); (3) `design` dispatched ✓ (19:01:01Z comment; opencode 39156808919 live since 19:01:03Z); (4) Phase 2 chained via `build` ✓ (19:01:02Z comment; opencode 39156811031 queued); (5) Pages green on `f5041f32` ✓ (39156825550 success 19:02:07Z).

## IN FLIGHT
 - **#654 (head `16dedc98`, `Fixes #653`)**: review round 9 APPROVED at 18:52:08Z (round-8 F1 R15 rung-gated MNF-reset fix independently reproduced); `/oc test` forwarded 18:52:12Z; the read-only infra Tester (39156143436) live in its agent step since 18:52:14Z. On machine-published `approve-test` -> PAT merge sweep (workflow-touching) -> verify `Fixes #653` closes #653 + Pages green -> THEN dispatch `{"action":"lab","issue":669}` (never parallel). An owner `/oc maintainer` at 19:01:14Z spawned a concurrent maintainer run 39156825729 which owns that lane's survey/comment.
 - **#670 (head `3d618786d8`, `Closes #668`)**: lab run 39152087560 live since 17:59:38Z (~65 min at 19:05Z; within the 90-min agent / 120-min job caps) on the Tester's three R24 escape classes (test-only; shipped dedupe handler verified correct end-to-end). On the fix push -> review round 3 -> tester -> PAT sweep (workflow-touching) -> verify #668 closes.
 - **#669 (403 abuse-traffic class)**: filed; route `lab` ONLY after #654 lands (same runner files).
 - **Design lane (#582)**: `/oc design` posted 19:01:01Z; opencode run 39156808919 live since 19:01:03Z. Watch for the Design Council session/PR, its review, and a `docs/design.md` + tokens PR.
 - **Phase 2 lane (#582)**: `/oc build this` posted 19:01:02Z; opencode run 39156811031 queued. Watch for the Builder branch/PR (`opencode/issue582-*`), `Closes #656`, `Refs #582`.
 - **Open issues**: #582 (overhaul parent, OPEN), #653, #655-#661, #668, #669, the 14 Section C issues #671-#684, boards #70/#42. No untriaged issues outside the deliberate cohort.
 - **STANDING PLAYBOOK RULE**: after ANY rebase merge of a `Closes`/`Fixes` #N PR, verify the linked issue actually closed; close explicitly if still open.
 - **STANDING POST-MERGE RULE**: after a merge that advances main, verify Pages success (bot merges emit no workflow events; the hardcoded post-session step dispatches the deploy with the PAT).

## WATCH ITEMS
 - **WATCH - provider 403 abuse-traffic class**: two occurrences on 2026-10-18 (12:26Z lab, 16:14Z test), both on the session's FIRST model call seconds in, both recovered only by a fresh re-dispatch onto a new runner. Issue #669 covers the systemic fix; route lab after #654.
 - **WATCH - bot-actor PR-event arm reds (standing, cosmetic)**: every bot-authored PR open reds the redundant `pull_request` maintainer arm (CLI refuses `github-actions[bot]`, permission: none); Owner closed #427/#429 unmerged; standing observation only; no issue churn.
 - **WATCH - sparse schedule**: maintainer cron ticks today were 00:50, 05:33, 09:52, 13:50, 17:09Z (5 of 72); covered by comment/PR/failure arms; re-check tomorrow.
 - **WATCH - owner wakes**: 18:37:07/19Z on #662, 18:55:12Z on #662, 19:01:14Z on #654; single-slot superseding absorbs multiples; watch for a pattern.
 - **WATCH - concurrent maintainer instances**: per-target groups keep them separate; #647 publish contract keeps both memories. This run + 39156825729 (the 19:01:14Z wake on #654) are both live.
 - **WATCH - #670 lab duration**: ~65 min at survey; the 90-min agent / 120-min job caps still bound it; crash parity covers a death.
 - **WATCH - self-triage dispatch flood (new)**: the 14 create_issue self-dispatches collapse into maintainer's single-pending-slot semantics; at most one queued successor surveys fresh. Expected; no action.

## BACKLOG (low priority; do not act unless idle)
 - #662 tester non-blocking hardening (crafted-run-dir-only: decompression-bomb cap, crafted-log path escape, basename collisions, malformed meta/events shapes, kitty a=t/a=f uncounted, whitespace-only unverified-reason).
 - #654 non-blocking residuals (R15 PASS-banner backtick cosmetic; bounded tee wait; microsecond hang_flag race; `idle+hang_idle_seconds` first-poll variant; audit script final `exit 0`; `LAB.md:199` job-vs-step timeout imprecision).
 - #670 non-blocking (duplicate-title in-run triage memo).
 - #635 Council non-blocking findings; older R15/R17/R20 MSYS portability; zombie queued skip-only runs (inert); docs nits (stale #427 phrasing; REGISTRY.md Auditor row).
 - NOTE: the Section C cohort is phase work, NOT backlog: consumed by roadmap phases (see above).

## NEXT-RUN PLAYBOOK
   1. #654: watch the infra Tester (live since 18:52:14Z). On machine-published approve -> PAT sweep -> verify #653 closes + Pages green -> THEN dispatch `{"action":"lab","issue":669}`.
   2. #670: watch lab 39152087560; on push -> review round 3 -> tester -> PAT sweep -> verify #668 closes.
   3. #582 lanes: watch the design session and the Phase 2 build; route their branches/PRs through the normal review -> test -> merge loop.
   4. Section C (#671-#684): roadmap-consumed; no individual dispatch, no per-issue comments.
   5. Failure triage: correlate first; re-dispatch only when no session is live/queued for the signature. The bot-actor PR-event arm reds stay un-dispatched (standing class).
   6. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
   - Does the Design Council pass on #582 complete (docs/design.md + tokens) well before the Phase 4 build, and does it clear review cleanly?
   - Does Phase 2 (Dynamic Terminal Layout) start fresh from `main` on a clean branch and land `Closes #656`?
   - Does the #654 infra Tester produce the machine-published approve and unblock the #669 lab dispatch?
   - Does the #670 lab fix clear review round 3 and close the #668 lane?
   - Do the owner wakes and the self-triage dispatch flood produce any unwanted duplicate work by concurrent instances?
   - Does the schedule density (5 ticks today) hold tomorrow?

   - Hephaestus, the Maintainer
