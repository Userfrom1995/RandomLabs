# STATE - Random factory checkpoint
 - **Updated: 2026-10-18 run 39165581626 (the 20:56Z `/oc maintainer` wake on #670; survey 20:56-21:01Z) (#687 MERGED by hand as `713755dc` at 20:57:54Z, #686 closed 20:57:55Z, branch kept; the wake that would have merged it died at the provider with the #669 403 class - third occurrence today, first on the maintainer arm; #670 review round 4 -> F8 -> lab live; #654 lab live; #685 fix live; design retry live; main tip `713755dc`; zero held; allowlist exact 18/18; Pages on `713755dc` dispatched post-session, verify next run)**
 - Prior checkpoints: run 39165526719 (the 20:55Z #687 wake, DIED at the provider, no decision file - the #669 403 class), run 39164167540 (20:37Z wake on #687), run 39163778334 (20:32Z wake on #685), run 39162246005 (20:12Z wake on #654), run 39158916097 (~19:28Z tick), run 39158998538 (19:29Z #670 wake), run 39156825729 (19:01Z wake on #654), run 39156804320, run 39156764073, run 39156369277 (#662 merge + playbook), run 39154978157, run 39152313250, run 39150137794. Older detail in the day logs.
 - MERGED today (re-verified): **#687 `713755dc` (20:57:54Z by this run; #686 closed 20:57:55Z)**, #662 `f5041f32` (18:57:11Z; Phase 1, #582 left open), #667 `fb8b34c1` (16:27:58Z; #665 closed), #664 `16bb395f` (16:05:48Z; #663 closed), #635 `28eacb99`, #652 `f66eca3a`, #651 `672bb8bb`, #649 `ad08112c`, #646 `a9f703ad`, #644 `5d9797f0`, #643 `726f269a`, #640 `2d829703`, #638 `498638fe`. Main tip `713755dc` (ls-remote + single parent `f5041f32` verified). POST-MERGE PAGES: deploy dispatch on `713755dc` fires in this run's post-session hardcoded step (pre-agent sha `f5041f32` != new tip); verify green next run.

## THE OVERHAUL (primary lane; parent #582; roadmap ON MAIN)
 - **Owner directive**: https://github.com/Userfrom1995/RandomLabs/issues/582#issuecomment-6249701945 (12:05:13Z). Binding asks: (1) real-terminal compatibility matrix incl. Kitty and Ghostty on Linux/macOS/Windows, no unverified compatibility claims; (2) genuinely dynamic full-window terminal layout at any size/aspect; (3) real distributable releases for terminal + desktop on all platforms (RPM/DEB, Windows/macOS installers, automated reproducible pipeline, official release page, install/upgrade/uninstall docs); (4) visual redesign (characters/environments/effects/animation); (5) sound redesign with volume/mute controls; (6) Pages = the complete game with dedicated download/install/docs/compatibility/release subpages; (7) architecture reassessment + full-product verification on real platforms. No completion from compile/CI alone.
 - **Roadmap on main**: `progress/582-maze-chase-overhaul.md` (eight semantic phases; Phase 1 landed via #662, Phase 2 built as PR #685) plus `progress/582-maze-chase-overhaul-findings.md` (the evidence ledger).
 - **THE SEVEN WORKSTREAM SUB-ISSUES (attached to #582; all open)**: #655 terminal compatibility matrix; #656 dynamic terminal layout (Phase 2, `Closes #656` on #685); #657 release engineering; #658 visual redesign; #659 sound design overhaul; #660 Pages complete game + subpages; #661 architecture reassessment + full-product verification. Roadmap-consumed by their phase PRs; do NOT route them individually.
 - **SECTION C SUB-ISSUES (14, all open, filed 19:00:34-59Z)**: #671 kitty reply loop; #672 Ghostty live kitty probe; #673 re-rasterize at real cell size; #674 resize contract; #675 continuous cell scales; #676 desktop max-pixel freeze; #677 desktop HiDPI; #678 desktop idle CPU; #679 warden facing; #680 fright mask; #681 reduced_flash coverage; #682 audio baseline; #683 release-claims sweep + Windows E2E re-sign gate; #684 min-size copy alignment. Each body carries `Parent: #582`, the phase, the workstream, evidence, acceptance criteria. **ROUTING RULE: phase-consumed tracking items; their phase PRs close them. Do NOT dispatch workers on them individually.** Phase map: Phase 2 = #673/#674/#675/#684; Phase 3 = #671/#672; Phase 4 = #679/#680/#681; Phase 5 = #682; Phase 6 = #676/#677/#678/#683.
 - **Design pass**: retry 39161404347 in_progress since 20:32:38Z (first session died at its 60-min cap 20:01:32Z); cap ~21:32Z; watch for branch/PR (`docs/design.md` + tokens).

## IN FLIGHT
 - **#670 (head `2aa0bf66`, branch `opencode/lab-668-create-issue-dedupe`, `Closes #668`)**: review round 4 concluded 20:57:49Z with F8 (blocking test-integrity: loader-internal gates on unvaried run-state dimensions); F4-F7 verified closed, shipped handler byte-identical. Lab Engineer 39165686967 live since 20:57:54Z on exactly this head. On push -> review round 5 -> tester -> PAT sweep -> verify #668 closes.
 - **#654 (head `a6a6a73e`, `Fixes #653`)**: tester round 7 concluded 20:45:37Z with `/oc lab` findings (R15 healing claims); Lab Engineer 39164783934 live since 20:45:47Z. On push -> review -> tester. On machine-published approve-test -> PAT merge sweep (workflow-touching) -> verify `Fixes #653` closes + Pages green -> THEN dispatch `{"action":"lab","issue":669}` (never parallel: same runner files).
 - **#685 (head `81dcff32`, branch `opencode/issue582-20261018200149`, `Refs #582` + `Closes #656`)**: review round 1 concluded 20:55:38Z with `/oc fix` findings; fixer opencode 39165534752 live since 20:55:43Z. On push -> review round 2 -> tester -> machine-published approve -> bot merge -> verify #656 closed + explicitly close #673/#674/#675/#684 + Pages green -> chain Phase 3 (`{"action":"build","issue":582}` after checking the roadmap).
 - **#669 (403 abuse-traffic class)**: three occurrences today (12:26Z Lab Engineer, 16:14Z opencode-test, 20:55Z maintainer death on #687); first maintainer-arm death. Route `lab` ONLY after #654 lands (same runner files); the ping posted this run records the new evidence.
 - **#687 / #686: COMPLETE** (#687 merged `713755dc`; #686 closed 20:57:55Z; branch kept at `2e85ee87`). Nothing outstanding.
 - **Open issues**: #582 (parent, OPEN), #653, #655-#661, #668, #669, #671-#684, boards #70/#42. No untriaged work outside the deliberate Section C cohort.
 - **STANDING PLAYBOOK RULE**: after ANY rebase merge of a `Closes`/`Fixes` #N PR, verify the linked issue actually closed; close explicitly if still open.
 - **STANDING POST-MERGE RULE**: after a merge that advances main, verify Pages success (bot merges emit no workflow events; the hardcoded post-session step dispatches the deploy with the PAT).

## WATCH ITEMS
 - **WATCH - Pages on `713755dc`**: dispatched by this run's post-session hardcoded step; verify green next run.
 - **WATCH - the #669 403 class**: now includes the maintainer arm; still sequenced behind #654; re-check at #654's merge.
 - **WATCH - #670 lab round (F8)**: live on `2aa0bf66`; findings -> review round 5; approval -> tester -> PAT sweep.
 - **WATCH - #654 lab round**: live on `a6a6a73e`; on push -> review -> tester; #653 closes only on merge.
 - **WATCH - #685 fix round**: live on `81dcff32`; post-merge closures #673/#674/#675/#684 are body-claimed but NOT keyword-linked - close them explicitly after merge.
 - **WATCH - #582 design retry**: 39161404347 since 20:32:38Z, cap ~21:32Z; a second cap-death escalates per the retry ladder.
 - **WATCH - bot-actor PR-event arm reds (standing, cosmetic)**: #685 39163742461 (20:32Z) and #687 39164084208 (20:36Z) posted the "does not have write permissions" bot comments; CLI refuses `github-actions[bot]`; Owner closed #427/#429 unmerged; standing observation only.
 - **WATCH - pending maintainer 39165687071**: the 20:57:54Z `/oc lab` comment cohort on #670; will skip at its gate or survey fresh with no work.
 - **WATCH - sparse schedule**: 5 cron ticks today; covered by comment/PR/failure arms; re-check tomorrow.

## BACKLOG (low priority; do not act unless idle)
 - #670 non-blocking residuals (duplicate-title in-run triage memo; unparseable create stdout; carry any round-5 residuals at the verdict).
 - #654 non-blocking residuals (bounded `tee` wait; `hang_flag` microsecond race; timing-sensitive `idle` increment; the audit script's pre-existing final `exit 0` on failures).
 - #685 non-blocking residuals (if the review raises any; record them at the verdict).
 - #662 tester non-blocking hardening (crafted-run-dir-only: decompression-bomb cap, crafted-log path escape, basename collisions, malformed meta/events shapes, kitty a=t/a=f uncounted, whitespace-only unverified-reason) + per-phase attribution boundary.
 - #635 Council non-blocking findings; older R15/R17/R20 MSYS portability; zombie queued skip-only runs (inert); docs nits (stale #427 phrasing; REGISTRY.md Auditor row).

## NEXT-RUN PLAYBOOK
   1. Verify Pages green on `713755dc` (post-merge standing rule).
   2. #670: watch lab 39165686967 -> on push review round 5 -> tester -> PAT sweep -> verify #668 closes.
   3. #654: watch lab 39164783934 -> review -> tester; on approve-test the PAT sweep lands it -> verify #653 closes + Pages green -> THEN dispatch `{"action":"lab","issue":669}`.
   4. #685: watch fix 39165534752 -> push -> review round 2 -> tester -> merge -> verify #656 closed + close #673/#674/#675/#684 + Pages green -> chain Phase 3 build on #582 (check the roadmap first).
   5. Design: watch 39161404347 for its branch/PR; route through review -> test -> merge.
   6. Failure triage: correlate first; bot-actor arm reds stay un-dispatched; the 403 class stays sequenced behind #654.
   7. Section C (#671-#684): phase-consumed; no individual routing; disposition-only ticks if self-dispatch wakes arrive.
   8. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
   - Does the #670 lab round close F8 without opening a new escape family?
   - Does the #654 lab round finally clear the R15 healing claims, unblocking #669?
   - Does the #685 fixer clear the round-1 findings in one pass?
   - Does the design retry survive its 60-minute cap and ship `docs/design.md` + tokens before the visual/sound phases?
   - Does the 403 class recur again before #654 lands, and does every occurrence stay followed by a recovered wake?

   - Hephaestus, the Maintainer
