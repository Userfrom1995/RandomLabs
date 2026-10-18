# STATE - Random factory checkpoint
 - **Updated: 2026-10-18 run 39158916097 (scheduled tick, survey 19:28-19:38Z) (zero dispatch - every lane owns a live session: #654's Tester returned `lab` at 19:29:47Z (six new R15 escape classes) so the lane re-enters the lab cycle via run 39159029688; #670's lab landed `4669d5bf` by PAT force-push at 19:29:19Z and review round 3 is live on it (39158988030); #582 design session live since 19:01:03Z with the Phase 2 build FIFO-queued behind it in group `opencode-582`; main tip `f5041f32`, Pages GREEN, zero failures/held runs, allowlist exact 18/18, zero untriaged)**
 - Prior checkpoints: run 39156804320 (~19:05-19:08Z, self-triage `/oc maintainer` wake on #684: zero dispatch - roadmap-consumed; every live lane healthy), run 39156825729 (~19:01-19:12Z, the 19:01Z `/oc maintainer` wake on #654: zero dispatch - #654 round-9 approved `16dedc98` with the infra Tester live since 18:52:14Z; #670 lab still live; post-merge playbook verified landed; Pages green verified; Section C numbers recorded), run 39156764073 (~19:00-19:08Z, self-triage on #671: cohort disposition recorded, zero dispatch), run 39156369277 (~18:55-19:05Z, #662 MERGED `f5041f32` at 18:57:11Z; post-merge playbook executed via decisions - 14 Section C create_issue, `design` on #582, Phase 2 `build` on #582), run 39154978157 (~18:37-18:44Z, full review->tester->fix->review cycle on #662; #654 round-8 `lab` verdict; #670 lab live), run 39152313250, run 39150137794, run 39149105288. Older detail in the day logs.
 - MERGED today (re-verified): **#662 `f5041f32` (18:57:11Z; the Phase 1 overhaul PR, rebase, #582 left open)**, #667 `fb8b34c1` (16:27:58Z; #665 closed 16:27:59Z), #664 `16bb395f` (16:05:48Z; #663 closed 16:05:51Z), #635 `28eacb99`, #652 `f66eca3a`, #651 `672bb8bb`, #649 `ad08112c`, #646 `a9f703ad`, #644 `5d9797f0`, #643 `726f269a`, #640 `2d829703`, #638 `498638fe`. Main tip `f5041f32` (ls-remote verified).

## THE OVERHAUL (primary lane; parent #582; roadmap ON MAIN)
 - **Owner directive**: https://github.com/Userfrom1995/RandomLabs/issues/582#issuecomment-6249701945 (12:05:13Z). Binding asks: (1) real-terminal compatibility matrix incl. Kitty and Ghostty on Linux/macOS/Windows, no unverified compatibility claims; (2) genuinely dynamic full-window terminal layout at any size/aspect; (3) real distributable releases for terminal + desktop on all platforms (RPM/DEB, Windows/macOS installers, automated reproducible pipeline, official release page, install/upgrade/uninstall docs); (4) visual redesign (characters/environments/effects/animation); (5) sound redesign with volume/mute controls; (6) Pages = the complete game with dedicated download/install/docs/compatibility/release subpages; (7) architecture reassessment + full-product verification on real platforms. No completion from compile/CI alone.
 - **Roadmap on main**: `progress/582-maze-chase-overhaul.md` (eight semantic phases; Phase 1 landed via #662) plus `progress/582-maze-chase-overhaul-findings.md` (the evidence ledger).
 - **THE SEVEN WORKSTREAM SUB-ISSUES (attached to #582; all open)**: #655 terminal compatibility matrix; #656 dynamic terminal layout; #657 release engineering; #658 visual redesign; #659 sound design overhaul; #660 Pages complete game + subpages; #661 architecture reassessment + full-product verification. Roadmap-consumed by their phase PRs; do NOT route them individually.
 - **SECTION C SUB-ISSUES (14, all open, filed 19:00:34-19:00:59Z by run 39156369277; NUMBERS RECORDED)**: #671 kitty reply loop; #672 Ghostty live kitty probe; #673 re-rasterize at real cell size; #674 resize contract; #675 continuous cell scales; #676 desktop max-pixel freeze; #677 desktop HiDPI; #678 desktop idle CPU; #679 warden facing; #680 fright mask; #681 reduced_flash coverage; #682 audio baseline; #683 release-claims sweep + Windows E2E re-sign gate; #684 min-size copy alignment. Each body carries `Parent: #582`, the phase, the workstream (#655-#661), evidence citations, and acceptance criteria. **ROUTING RULE: phase-consumed tracking items; their phase PRs close them. Do NOT dispatch workers on them individually.** No new self-dispatch wakes this window.
 - **POST-MERGE PLAYBOOK (all verified landed)**: (1) #582 verified open; (2) Section C set = #671-#684; (3) `design` dispatch -> opencode run 39156808919 (design job live since 19:01:03Z, group `opencode-design-582`-equivalent `opencode-582`); (4) Phase 2 `build` dispatch -> opencode run 39156811031 (queued since 19:01:05Z behind the design session in the same per-issue concurrency group; phase "Dynamic Terminal Layout and Full-Window Composition", `Closes #656` per the roadmap).
 - **Pages on `f5041f32` VERIFIED GREEN**: run 39156825550 SUCCESS (19:02:07Z). Standing post-merge check complete.

## IN FLIGHT
 - **#654 (head `16dedc98`, `Fixes #653`)**: infra Tester verdict at 19:29:47Z = `lab` - six new R15 escape classes (F1-F4 blocking test-integrity: watchdog unreachable within any step timeout, unbound TERM-to-KILL grace, weakened silence accumulator via the growth-branch re-arm, unanchored nonzero-MNF grep; F5-F6 low; one pre-existing verify-pin note). The test workflow forwarded `/oc lab` at 19:29:53Z -> Lab Engineer run 39159029688 live since 19:29:56Z. On its forward -> review round 10 -> tester; on eventual `approve-test` -> PAT merge sweep (workflow-touching) -> verify `Fixes #653` closes #653 + Pages green -> THEN dispatch `{"action":"lab","issue":669}` (never parallel with #654).
 - **#670 (head `4669d5bf`, `Closes #668`)**: lab run 39152087560 completed GREEN at 19:29:24Z; the R24 B1-B3 + adversarial fix commit `4669d5bf` (19:28:18Z) was force-pushed by the PAT step at 19:29:19.73Z (`+ 3d618786...4669d5bf`, verified remote tip + PR head). The session's own wrapper push was rejected non-fast-forward (post-rebase) and its raw git output is bot comment 6254169544 - benign, superseded. The forced update woke opencode-pr-trigger 39158989913 -> `/oc maintainer` 19:29:28Z -> sibling maintainer 39158998538. Review round 3 live on `4669d5bf` (39158988030, since 19:29:24Z); the round-2 approval (`3d618786`) is superseded by the rewrite. On push -> review -> tester -> PAT sweep (workflow-touching) -> verify #668 closes.
 - **#669 (403 abuse-traffic class)**: filed; route `lab` ONLY after #654 lands (same runner files).
 - **Design lane (#582)**: Design Council session live (39156808919, started 19:01:03Z, ~35 min at survey); watch for `docs/design.md` + tokens PR, its review, and Phase 4-5 binding.
 - **Phase 2 lane (#582)**: build run 39156811031 (started 19:01:05Z) FIFO-queued behind the design session in group `opencode-582` (`queue: max`); watch for the Builder branch/PR (`opencode/issue582-*`), `Closes #656`, `Refs #582`.
 - **Open issues**: #582 (parent, OPEN), #653, #655-#661, #668, #669, #671-#684, boards #70/#42. No untriaged work outside the deliberate Section C cohort.
 - **STANDING PLAYBOOK RULE**: after ANY rebase merge of a `Closes`/`Fixes` #N PR, verify the linked issue actually closed; close explicitly if still open.
 - **STANDING POST-MERGE RULE**: after a merge that advances main, verify Pages success (bot merges emit no workflow events; the hardcoded post-session step dispatches the deploy with the PAT).

## WATCH ITEMS
 - **WATCH - #654 lab round**: the six new escape classes (F1-F4 blocking); watch run 39159029688 for its forward and whether the fix round stays audit-only.
 - **WATCH - #670 branch rewrite**: history was rebased onto `fb8b34c1` (main's 16:27Z tip, not current `f5041f32`); mergeable=MERGEABLE verified post-rewrite; R21 binds the future tester verdict to the post-push head.
 - **WATCH - #582 design/build serialization**: the Phase 2 build starts only after the design job finishes (same `opencode-582` group by design); watch for branch collisions between the design PR (docs/tokens) and the Phase 2 build PR (both touch `maze-chase/`).
 - **WATCH - concurrent maintainer instances**: this schedule session plus sibling 39158998538 (the #670 push wake); per-target groups, disposition-only posture; the #647 publish contract keeps memories intact.
 - **WATCH - provider 403 abuse-traffic class**: two occurrences today (12:26Z lab, 16:14Z test), both first-call deaths recovered by re-dispatch. Issue #669 covers the fix; route lab after #654.
 - **WATCH - bot-actor PR-event arm reds (standing, cosmetic)**: every bot-authored PR open reds the redundant `pull_request` maintainer arm (CLI refuses `github-actions[bot]`, permission: none); Owner closed #427/#429 unmerged; standing observation only.
 - **WATCH - sparse schedule**: 5 cron ticks today; covered by comment/PR/failure arms; re-check tomorrow.
 - **WATCH - double owner wakes**: absorbed by the single-slot superseding design; watch for a pattern.

## BACKLOG (low priority; do not act unless idle)
 - #662 tester non-blocking hardening (crafted-run-dir-only: decompression-bomb cap, crafted-log path escape, basename collisions, malformed meta/events shapes, kitty a=t/a=f uncounted, whitespace-only unverified-reason) + per-phase attribution boundary.
 - #654 non-blocking residuals (this round's F5-F6 low findings fold in with the F1-F4 fix; pre-existing verify-pin gap noted by the Tester: `maintainer.yml:516` verify `exit 1` -> `exit 0` mutation unbound).
 - #670 non-blocking (duplicate-title in-run triage memo).
 - #635 Council non-blocking findings; older R15/R17/R20 MSYS portability; zombie queued skip-only runs (inert); docs nits (stale #427 phrasing; REGISTRY.md Auditor row).

## NEXT-RUN PLAYBOOK
   1. #654: watch lab 39159029688 -> on its forward, review round 10 -> tester; on eventual machine-published approve -> PAT sweep -> verify #653 closes + Pages green -> THEN dispatch `{"action":"lab","issue":669}`.
   2. #670: watch review round 3 (39158988030) on `4669d5bf` -> tester -> PAT sweep -> verify #668 closes.
   3. #582 lanes: watch the design session (39156808919) and the queued Phase 2 build (39156811031) for their branches/PRs; route them through review -> test -> merge.
   4. Failure triage: correlate first; re-dispatch only when no session is live/queued for the signature. The bot-actor PR-event arm reds stay un-dispatched (standing class).
   5. Section C (#671-#684): phase-consumed; no individual routing; disposition-only ticks if self-dispatch wakes arrive.
   6. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
   - Does the #654 lab round close the six R15 escape classes without opening new ones?
   - Does review round 3 clear `4669d5bf` cleanly after the branch rewrite?
   - Does the Design Council pass on #582 complete before the Phase 2 build, and do the two PRs avoid branch collisions?
   - Do the concurrent maintainer instances (39158998538) stay dispatch-free?
   - Does the schedule density (5 ticks today) hold tomorrow?

   - Hephaestus, the Maintainer
