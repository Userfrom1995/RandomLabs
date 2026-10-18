# STATE - Random factory checkpoint
 - **Updated: 2026-10-18 run 39166095785 (the 21:03Z `/oc maintainer` wake on #685; survey 21:03-21:06Z) (fixer round 1 landed `a44613e8` on #685 (6 commits, clean rebase on `713755dc`), review round 2 live since 21:03:08Z; #654 lab live on `a6a6a73e`; #670 lab live on `2aa0bf66`; design retry live (cap ~21:32Z); main tip `713755dc`; Pages deploy on `713755dc` in flight; zero held; allowlist exact 18/18; zero dispatch)**
 - Prior checkpoints: run 39165581626 (20:56Z #670 wake; #687 merged by hand `713755dc`, #686 closed), run 39165526719 (died at provider, the #669 403 class), run 39164167540 (#687 wake), run 39163778334 (#685 wake), run 39162246005 (#654 wake), run 39158916097 (tick), run 39158998538 (#670 wake), run 39156825729 (#654 wake), run 39156804320, run 39156764073, run 39156369277, run 39154978157, run 39152313250, run 39150137794. Older detail in the day logs.
 - MERGED today (re-verified): #687 `713755dc` (20:57:54Z; #686 closed 20:57:55Z), #662 `f5041f32` (18:57:11Z; Phase 1, #582 left open), #667 `fb8b34c1` (16:27:58Z; #665 closed), #664 `16bb395f` (16:05:48Z; #663 closed), #635 `28eacb99`, #652 `f66eca3a`, #651 `672bb8bb`, #649 `ad08112c`, #646 `a9f703ad`, #644 `5d9797f0`, #643 `726f269a`, #640 `2d829703`, #638 `498638fe`. Main tip `713755dc` (ls-remote verified). POST-MERGE PAGES: workflow_dispatch deploy on `713755dc` in_progress since 21:03:13Z (the previous run's post-session step); verify green next run.

## THE OVERHAUL (primary lane; parent #582; roadmap ON MAIN)
 - **Owner directive**: https://github.com/Userfrom1995/RandomLabs/issues/582#issuecomment-6249701945 (12:05:13Z). Binding asks: (1) real-terminal compatibility matrix incl. Kitty and Ghostty on Linux/macOS/Windows, no unverified compatibility claims; (2) genuinely dynamic full-window terminal layout at any size/aspect; (3) real distributable releases for terminal + desktop on all platforms (RPM/DEB, Windows/macOS installers, automated reproducible pipeline, official release page, install/upgrade/uninstall docs); (4) visual redesign (characters/environments/effects/animation); (5) sound redesign with volume/mute controls; (6) Pages = the complete game with dedicated download/install/docs/compatibility/release subpages; (7) architecture reassessment + full-product verification on real platforms. No completion from compile/CI alone.
 - **Roadmap on main**: `progress/582-maze-chase-overhaul.md` (eight semantic phases; Phase 1 landed via #662, Phase 2 built as PR #685) plus `progress/582-maze-chase-overhaul-findings.md` (the evidence ledger).
 - **THE SEVEN WORKSTREAM SUB-ISSUES (attached to #582; all open)**: #655 terminal compatibility matrix; #656 dynamic terminal layout (Phase 2 shifting to `Refs #656` per the round-1 fixer F1: the real-emulator rows stay open for the per-OS testers); #657 release engineering; #658 visual redesign; #659 sound design overhaul; #660 Pages complete game + subpages; #661 architecture reassessment + full-product verification. Roadmap-consumed by their phase PRs; do NOT route them individually.
 - **SECTION C SUB-ISSUES (14, all open, filed 19:00:34-59Z)**: #671 kitty reply loop; #672 Ghostty live kitty probe; #673 re-rasterize at real cell size; #674 resize contract; #675 continuous cell scales; #676 desktop max-pixel freeze; #677 desktop HiDPI; #678 desktop idle CPU; #679 warden facing; #680 fright mask; #681 reduced_flash coverage; #682 audio baseline; #683 release-claims sweep + Windows E2E re-sign gate; #684 min-size copy alignment. Each body carries `Parent: #582`, the phase, the workstream, evidence, acceptance criteria. **ROUTING RULE: phase-consumed tracking items; their phase PRs close them. Do NOT dispatch workers on them individually.** Phase map: Phase 2 = #673/#674/#675/#684; Phase 3 = #671/#672; Phase 4 = #679/#680/#681; Phase 5 = #682; Phase 6 = #676/#677/#678/#683.
 - **Design pass**: retry 39161404347 in_progress (job start 20:32:38Z; 60-min cap ~21:32Z); watch for its branch/PR (`docs/design.md` + tokens).

## IN FLIGHT
 - **#685 (head `a44613e8`, branch `opencode/issue582-20261018200149`, `Refs #582` + `Refs #656`)**: fixer round 1 landed 21:01:26Z - six modular `fixer:` commits on the branch cleanly rebased onto main `713755dc` (compare API: 10 ahead, 0 behind; MERGEABLE): F1 closing-label scoping (title/body/progress annotation), F2 too-small-path Kitty `delete_all_escape` + the new PTY shrink test, F3 test rename + `(4,4) -> (2,2)` contrast pin, F4 `Geometry::new` doc link, plus the four nits (marker comment, raster clamp honesty + docs, `fresh=false` success arm, `compute_with` sanity routing). Review round 2 live on exactly this head since 21:03:08Z (39166083045). PATH: reviewer verdict -> (findings auto-route to `/oc fix`) or approve -> tester -> machine-published `approve-test` -> bot merge -> verify `Closes #656` closes + explicitly close #673/#674/#675/#684 + Pages green -> chain Phase 3 build on #582 (check the roadmap first).
 - **#670 (head `2aa0bf66`, `Closes #668`)**: Lab Engineer 39165686967 live since 20:57:54Z on the round-4 F8 (blocking test-integrity: loader-internal gates on unvaried run-state dimensions). On push -> review round 5 -> tester -> PAT sweep -> verify #668 closes.
 - **#654 (head `a6a6a73e`, `Fixes #653`)**: Lab Engineer 39164783934 live since 20:45:47Z on the tester-round-7 R15 healing findings. On push -> review -> tester. On approve-test -> PAT sweep (workflow-touching) -> verify #653 closes + Pages green -> THEN dispatch `{"action":"lab","issue":669}` (never parallel: same runner files).
 - **#669 (403 abuse-traffic class)**: three occurrences 10-18 (12:26Z Lab Engineer, 16:14Z opencode-test, 20:55Z maintainer death 39165526719); stays sequenced behind #654 (same runner files). Evidence pinged on the issue by the previous run.
 - **#687 / #686: COMPLETE** (#687 merged `713755dc`; #686 closed 20:57:55Z; branch kept at `2e85ee87`). Nothing outstanding.
 - **Open issues**: #582 (parent, OPEN), #653, #655-#661, #668, #669, #671-#684, boards #70/#42. No untriaged work outside the deliberate Section C cohort.
 - **STANDING PLAYBOOK RULE**: after ANY rebase merge of a `Closes`/`Fixes` #N PR, verify the linked issue actually closed; close explicitly if still open.
 - **STANDING POST-MERGE RULE**: after a merge that advances main, verify Pages success (bot merges emit no workflow events; the hardcoded post-session step dispatches the deploy with the PAT).

## WATCH ITEMS
 - **WATCH - Pages on `713755dc`**: deploy in progress since 21:03:13Z; verify green next run.
 - **WATCH - #685 review round 2**: live on `a44613e8` since 21:03:08Z; findings auto-route to `/oc fix`; post-merge closures #673/#674/#675/#684 are body-claimed but NOT keyword-linked - close them explicitly after merge.
 - **WATCH - #670 lab round (F8)**: live on `2aa0bf66`; findings -> review round 5; approval -> tester -> PAT sweep.
 - **WATCH - #654 lab round (R15 healing)**: live on `a6a6a73e`; on push -> review -> tester; #653 closes only on merge.
 - **WATCH - #582 design retry**: 39161404347 live (job start 20:32:38Z; cap ~21:32Z). A second cap-death escalates per the retry ladder.
 - **WATCH - the #669 403 class**: sequenced behind #654; re-check at #654's merge.
 - **WATCH - skip-cohort noise**: the 21:03:12Z `/oc maintainer` comment spawned the usual per-workflow skip fleet plus one skip-bound opencode-review 39166095762 (pending, will skip at the gate). Inert.
 - **WATCH - bot-actor PR-event arm reds (standing, cosmetic)**: pre-#427 class; Owner closed #427/#429 unmerged; standing observation only.
 - **WATCH - sparse schedule**: 5 cron ticks today; covered by comment/PR/failure arms; re-check tomorrow.

## BACKLOG (low priority; do not act unless idle)
 - #670 non-blocking residuals (duplicate-title in-run triage memo; unparseable create stdout; carry any round-5 residuals at the verdict).
 - #654 non-blocking residuals (bounded `tee` wait; `hang_flag` microsecond race; timing-sensitive `idle` increment; the audit script's pre-existing final `exit 0` on failures).
 - #685 non-blocking residuals (if review round 2 raises any; record them at the verdict).
 - #662 tester non-blocking hardening (crafted-run-dir-only: decompression-bomb cap, crafted-log path escape, basename collisions, malformed meta/events shapes, kitty a=t/a=f uncounted, whitespace-only unverified-reason) + per-phase attribution boundary.
 - #635 Council non-blocking findings; older R15/R17/R20 MSYS portability; zombie queued skip-only runs (inert); docs nits (stale #427 phrasing; REGISTRY.md Auditor row).

## NEXT-RUN PLAYBOOK
   1. Verify Pages green on `713755dc` (post-merge standing rule).
   2. #685: watch review round 2 (39166083045) -> on findings `/oc fix` auto; on approval -> tester -> machine approve -> merge -> verify #656 closed + close #673/#674/#675/#684 + Pages green -> chain Phase 3 (`{"action":"build","issue":582}` after checking the roadmap).
   3. #670: watch lab 39165686967 -> push -> review round 5 -> tester -> PAT sweep -> verify #668 closes.
   4. #654: watch lab 39164783934 -> review -> tester; on approve-test the PAT sweep lands it -> verify #653 closes + Pages green -> THEN dispatch `{"action":"lab","issue":669}`.
   5. Design: watch 39161404347 (cap ~21:32Z) for its branch/PR; route through review -> test -> merge.
   6. Failure triage: correlate first; bot-actor arm reds stay un-dispatched; the 403 class stays sequenced behind #654.
   7. Section C (#671-#684): phase-consumed; no individual routing; disposition-only ticks if self-dispatch wakes arrive.
   8. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
   - Does #685's review round 2 approve `a44613e8` first try, or draw a third round?
   - Does the #670 lab round close F8 without opening a new escape family?
   - Does the #654 lab round finally clear the R15 healing claims, unblocking #669?
   - Does the design retry survive its 60-minute cap and ship `docs/design.md` + tokens before the visual/sound phases?
   - Does the 403 class recur again before #654 lands, and does every occurrence stay followed by a recovered wake?

   - Hephaestus, the Maintainer
