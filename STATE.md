# STATE - Random factory checkpoint
 - **Updated: 2026-10-18 run 39166757039 (the 21:11Z `/oc maintainer` wake on #685; survey 21:11-21:14Z) (F5 amend `7e1788ec` verified clean (tree `d8c35e71` == `a44613e8`, zero closing-keyword matches), review round 3 live 21:11:49Z; #654 lab round 7 pushed `6c8ed8f0` -> review round 11 live 21:12:53Z; #670 lab live on `2aa0bf66`; design retry live (cap ~21:32Z); main tip `713755dc`; Pages GREEN on `713755dc` (39166759224, 21:11:58Z); zero held; failures zero; allowlist exact 18/18; zero dispatch)**
 - Prior checkpoints: run 39166095785 (21:03Z #685 wake; fixer round 1 `a44613e8`), run 39165581626 (20:56Z #670 wake; #687 merged by hand `713755dc`, #686 closed), run 39165526719 (died at provider, the #669 403 class), run 39164167540 (#687 wake), run 39163778334 (#685 wake), run 39162246005 (#654 wake), run 39158916097 (tick), run 39158998538 (#670 wake), run 39156825729 (#654 wake), run 39156804320, run 39156764073, run 39156369277, run 39154978157, run 39152313250, run 39150137794. Older detail in the day logs.
 - MERGED today (re-verified): #687 `713755dc` (20:57:54Z; #686 closed 20:57:55Z), #662 `f5041f32` (18:57:11Z; Phase 1, #582 left open), #667 `fb8b34c1` (16:27:58Z; #665 closed), #664 `16bb395f` (16:05:48Z; #663 closed), #635 `28eacb99`, #652 `f66eca3a`, #651 `672bb8bb`, #649 `ad08112c`, #646 `a9f703ad`, #644 `5d9797f0`, #643 `726f269a`, #640 `2d829703`, #638 `498638fe`. Main tip `713755dc` (ls-remote verified). POST-MERGE PAGES: deploy on `713755dc` SUCCESS 21:11:58Z (39166759224). Nothing pending.

## THE OVERHAUL (primary lane; parent #582; roadmap ON MAIN)
 - **Owner directive**: https://github.com/Userfrom1995/RandomLabs/issues/582#issuecomment-6249701945 (12:05:13Z). Binding asks: (1) real-terminal compatibility matrix incl. Kitty and Ghostty on Linux/macOS/Windows, no unverified compatibility claims; (2) genuinely dynamic full-window terminal layout at any size/aspect; (3) real distributable releases for terminal + desktop on all platforms (RPM/DEB, Windows/macOS installers, automated reproducible pipeline, official release page, install/upgrade/uninstall docs); (4) visual redesign (characters/environments/effects/animation); (5) sound redesign with volume/mute controls; (6) Pages = the complete game with dedicated download/install/docs/compatibility/release subpages; (7) architecture reassessment + full-product verification on real platforms. No completion from compile/CI alone.
 - **Roadmap on main**: `progress/582-maze-chase-overhaul.md` (eight semantic phases; Phase 1 landed via #662, Phase 2 built as PR #685) plus `progress/582-maze-chase-overhaul-findings.md` (the evidence ledger).
 - **THE SEVEN WORKSTREAM SUB-ISSUES (attached to #582; all open)**: #655 terminal compatibility matrix; #656 dynamic terminal layout (Phase 2 shifting to `Refs #656` per the round-1 fixer F1: the real-emulator rows to stay open); #657 release engineering; #658 visual redesign; #659 sound design overhaul; #660 Pages complete game + subpages; #661 architecture reassessment + full-product verification. Roadmap-consumed by their phase PRs; do NOT route them individually.
 - **SECTION C SUB-ISSUES (14, all open, filed 19:00:34-59Z)**: #671 kitty reply loop; #672 Ghostty live kitty probe; #673 re-rasterize at real cell size; #674 resize contract; #675 continuous cell scales; #676 desktop max-pixel freeze; #677 desktop HiDPI; #678 desktop idle CPU; #679 warden facing; #680 fright mask; #681 reduced_flash coverage; #682 audio baseline; #683 release-claims sweep + Windows E2E re-sign gate; #684 min-size copy alignment. Each body carries `Parent: #582`, the phase, the workstream, evidence, acceptance criteria. **ROUTING RULE: phase-consumed tracking items; their phase PRs close them. Do NOT dispatch workers on them individually.** Phase map: Phase 2 = #673/#674/#675/#684 (STAY OPEN with #656 until per-OS real-emulator evidence lands - the F1 rescope), Phase 3 = #671/#672, Phase 4 = #679/#680/#681, Phase 5 = #682, Phase 6 = #676/#677/#678/#683.
 - **Design pass**: retry 39161404347 design job in_progress since 20:32:38Z (60-min cap ~21:32:38Z; sibling mode jobs all skipped); watch for its branch/PR (`docs/design.md` + tokens).

## IN FLIGHT
 - **#685 (head `7e1788ec`, branch `opencode/issue582-20261018200149`, `Refs #582` + `Refs #656`)**: the F5 message-only amend landed 21:11:44Z - tree byte-identical to `a44613e8` (`d8c35e71` on both), closing-keyword sweep over all branch commit bodies + PR title/body clean (my independent check), level with main `713755dc`, MERGEABLE. Review round 3 (39166747827) live on exactly this head since 21:11:49Z. PATH: verdict -> (findings auto-route to `/oc fix`) or approve -> tester -> machine-published `approve-test` -> bot merge -> chain Phase 3 (`{"action":"build","issue":582}` after re-checking the roadmap). **POST-MERGE DISPOSITION (F1 rescope): #656 and #673/#674/#675/#684 stay OPEN until the per-OS testers commit the real-emulator resize rows/captures - do NOT close them at the merge; dispatch the per-OS testers for the Phase-2 emulator rows as the roadmap directs.**
 - **#670 (head `2aa0bf66`, `Closes #668`)**: Lab Engineer 39165686967 live since 20:57:54Z on the round-4 F8 (blocking test-integrity: loader-internal gates on unvaried run-state dimensions). Round-4 queue-of-5 session. On push -> review round 5 -> tester -> PAT sweep -> verify #668 closes (PR body carries `Closes #668`; commit bodies carry no closing keywords).
 - **#654 (head `6c8ed8f0`, `Fixes #653`)**: lab round 7 pushed at 21:12:49Z (`6c8ed8f0` decision, `cb9932a6` docs, `0c294af4` R15 fire-block escalation order + liveness gates + real-grace probe); review round 11 (39166826550) live since 21:12:53Z. On push -> review -> tester. On approve-test -> PAT sweep (workflow-touching) -> verify #653 closes + Pages green -> THEN dispatch `{"action":"lab","issue":669}` (never parallel: same runner files).
 - **#669 (403 abuse-traffic class)**: three occurrences 10-18 (12:26Z Lab Engineer, 16:14Z opencode-test, 20:55Z maintainer death 39165526719); stays sequenced behind #654 (same runner files). Evidence pinged on the issue.
 - **#687 / #686: COMPLETE** (#687 merged `713755dc`; #686 closed 20:57:55Z; branch kept at `2e85ee87`). Nothing outstanding.
 - **Open issues**: #582 (parent, OPEN), #653, #655-#661, #668, #669, #671-#684, boards #70/#42. No untriaged work outside the deliberate Section C cohort.
 - **STANDING PLAYBOOK RULE**: after ANY rebase merge of a `Closes`/`Fixes` #N PR, verify the linked issue actually closed; close explicitly if still open.
 - **STANDING POST-MERGE RULE**: after a merge that advances main, verify Pages success (bot merges emit no workflow events; the hardcoded post-session step dispatches the deploy with the PAT).

## WATCH ITEMS
 - **WATCH - #685 review round 3**: live on `7e1788ec` since 21:11:49Z; findings auto-route to `/oc fix`; approval -> tester gate.
 - **WATCH - #654 review round 11**: live on `6c8ed8f0` since 21:12:53Z; findings -> `/oc lab` auto-route (infra PR); approval -> tester forward.
 - **WATCH - #670 lab round (F8)**: live on `2aa0bf66` since 20:57:54Z (~16 min at the 21:14Z survey); findings -> review round 5; approval -> tester -> PAT sweep.
 - **WATCH - #582 design retry**: 39161404347 live (cap ~21:32:38Z). A second cap-death escalates per the retry ladder.
 - **WATCH - the #669 403 class**: sequenced behind #654; re-check at #654's merge.
 - **WATCH - skip-cohort noise**: the 21:11Z comment cohort spawned the usual per-workflow skip fleet plus sibling maintainer 39166826609 (group `maintainer-654`, live) and one pending skip-bound opencode-review 39166757095. Inert.
 - **WATCH - bot-actor PR-event arm reds (standing, cosmetic)**: pre-#427 class; Owner closed #427/#429 unmerged; standing observation only.
 - **WATCH - sparse schedule**: 5 cron ticks today; covered by comment/PR/failure arms; re-check tomorrow.

## BACKLOG (low priority; do not act unless idle)
 - #670 non-blocking residuals (duplicate-title in-run triage memo; unparseable create stdout; carry any round-5 residuals at the verdict).
 - #654 non-blocking residuals (bounded `tee` wait; `hang_flag` microsecond race; timing-sensitive `idle` increment; the audit script's pre-existing final `exit 0` on failures; carry any round-11 residuals at the verdict).
 - #685 non-blocking residuals (if review round 3 raises any; record them at the verdict).
 - #662 tester non-blocking hardening (crafted-run-dir-only: decompression-bomb cap, crafted-log path escape, basename collisions, malformed meta/events shapes, kitty a=t/a=f uncounted, whitespace-only unverified-reason) + per-phase attribution boundary.
 - #635 Council non-blocking findings; older R15/R17/R20 MSYS portability; zombie queued skip-only runs (inert); docs nits (stale #427 phrasing; REGISTRY.md Auditor row).

## NEXT-RUN PLAYBOOK
   1. #685: watch review round 3 (39166747827) -> on findings `/oc fix` auto; on approval -> tester -> machine approve -> merge -> verify #656 stays OPEN (Refs-only, no auto-close) + #673/#674/#675/#684 stay OPEN (F1 rescope) + Pages green -> chain Phase 3 (`{"action":"build","issue":582}` after checking the roadmap) -> per-OS tester dispatch for the Phase-2 emulator rows.
   2. #654: watch review round 11 (39166826550) -> on findings `/oc lab` auto; on approval -> tester; on approve-test the PAT sweep lands it -> verify #653 closes + Pages green -> THEN dispatch `{"action":"lab","issue":669}`.
   3. #670: watch lab 39165686967 -> push -> review round 5 -> tester -> PAT sweep -> verify #668 closes.
   4. Design: watch 39161404347 (cap ~21:32:38Z) for its branch/PR; route through review -> test -> merge.
   5. Failure triage: correlate first; bot-actor arm reds stay un-dispatched; the 403 class stays sequenced behind #654.
   6. Section C (#671-#684): phase-consumed; no individual routing; disposition-only ticks if self-dispatch wakes arrive.
   7. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
   - Does review round 3 approve the amended `7e1788ec` first try?
   - Does #654's round-11 review clear the R15 healing claims, sending it to the tester?
   - Does the #670 lab round close F8 without opening a new escape family?
   - Does the design retry survive its 60-minute cap and ship `docs/design.md` + tokens before the visual/sound phases?
   - Does the 403 class recur again before #654 lands, and does every occurrence stay followed by a recovered wake?

   - Hephaestus, the Maintainer
