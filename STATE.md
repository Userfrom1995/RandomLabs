# STATE - Random factory checkpoint
 - **Updated: 2026-10-19 run 39176252419 (the 23:22Z `/oc maintainer` PR-created wake on #691; fresh survey 00:00-00:12Z). ZERO DISPATCH: every lane self-owns a live session. #688 design pass MERGED `3357ea79` (23:28:51Z, tester-gated by a sibling) and Phase 3 was chained on #582 (build 39176865984 live since 23:31:17Z). #691 (the #656 fix build) round-1 review = fix (F1 docs-guard red, F2 false 444/0 claim, F3 rebase onto main, F4-F7 folds); workflow forwarded `/oc fix` 23:49:00Z; Fixer 39178079415 live since 23:49:04Z. #670 review round 7 live (39177280212, 23:37:13Z on `8366ad2e`); #654 review round 13 live (39176605033, 23:27:38Z on `4fb5c35e`); macOS arm 39170578536 still in flight. main tip `3357ea79`; allowlist exact 18/18; Pages green (23:35:13Z); 2 held runs (#670 branch, usual bot-push class) swept by this run; no untriaged issues.**
 - Prior checkpoints: run 39175247625 (23:08Z #670 tick; all lanes live, zero dispatch), run 39173288133 (22:40Z #654 wake), run 39172986905 (22:36Z #656 Linux verdict; F1/F2 accepted, build dispatched), run 39172194418 (22:25Z #688 review round 2), run 39170230657 (21:59Z #685 merged `c32b6a4f`), 39167038487, 39165581626, 39164167540, 39163778334, 39162246005, 39158916097, 39156825729, 39156369277, 39154978157, 39152313250. Older detail in the day logs.
 - MERGED today (re-verified): **#688 `3357ea79` (23:28:51Z; Design Council pass, tester-gated; #582 stays open)**, #685 `c32b6a4f` (21:59:50Z; Phase 2 construction; #656/#673/#674/#675/#684 left OPEN under the fix lane), #687 `713755dc` (20:57:54Z; #686 closed), #662 `f5041f32` (18:57:11Z; Phase 1), #667 `fb8b34c1`, #664, #635, #652, #651, #649, #646, #644, #643, #640, #638. Main tip `3357ea79` (ls-remote verified).

## THE OVERHAUL (primary lane; parent #582; roadmap ON MAIN)
 - **Owner directive**: https://github.com/Userfrom1995/RandomLabs/issues/582#issuecomment-6249701945 (12:05:13Z). Binding asks: (1) real-terminal compatibility matrix incl. Kitty and Ghostty on Linux/macOS/Windows, no unverified claims; (2) genuinely dynamic full-window terminal layout at any size/aspect; (3) real distributable releases for terminal + desktop on all platforms; (4) visual redesign; (5) sound redesign with volume/mute; (6) Pages = complete game with download/install/docs/compatibility/release subpages; (7) architecture reassessment + full-product verification on real platforms.
 - **Roadmap on main**: `progress/582-maze-chase-overhaul.md` (eight semantic phases; Phase 1 via #662, Phase 2 via #685 `c32b6a4f`, Phase 3 = terminal render pipeline and compatibility proof - BUILD LIVE on #582). Findings ledger: `progress/582-maze-chase-overhaul-findings.md`.
 - **DESIGN PASS MERGED - docs BINDING**: #688 landed `3357ea79` with `maze-chase/docs/design.md` (35KB) + `design-tokens.json` (Pondwake identity, Waylight UX, Lantern Drift motion). These are BINDING for Phase 4 (visual, #658/#679/#680/#681) and Phase 5 (sound, #659/#682); Phase 3 (render pipeline) proceeds without them.
 - **#691 - THE #656 FIX BUILD (PR open, head `b5a5b85f`, branch `opencode/issue656-20261018224059`)**: round-1 review verdict `fix` (23:48:58Z). Blocking F1 (committed `tester_docs_language` guard reds at HEAD: `scoreboard.md:207` "Phase 2"), F2 (the "444/0 green" claims false at HEAD: 443/1; re-measure after rebase in all four places), F3 (CONFLICTING vs main `3357ea79`: take main's `design-tokens.json`; keep main's design entries in the progress ledger). F4 (blueprint order contradiction), F5/F6 (overclaim, stale header), F7 doc nits. Fixer 39178079415 live since 23:49:04Z. `Refs #656`: closes nothing.
 - **#656 stays open** with #673/#674/#675/#684 until committed sweep/goldens + per-OS real-emulator evidence on the fixed build.
 - **THE SEVEN WORKSTREAM SUB-ISSUES (attached to #582; all open)**: #655 compatibility matrix; #656 dynamic layout (construction merged; fix PR #691 in fix); #657 release engineering; #658 visual redesign; #659 sound; #660 Pages complete game; #661 architecture reassessment. Phase-consumed: do NOT route individually.
 - **SECTION C SUB-ISSUES (14, all open)**: #671 kitty reply loop; #672 Ghostty live probe; #673 re-rasterize at real cell size; #674 resize contract; #675 continuous cell scales; #676 desktop max-pixel freeze; #677 HiDPI; #678 idle CPU; #679 warden facing; #680 fright mask; #681 reduced_flash; #682 audio baseline; #683 release-claims sweep; #684 min-size copy. Phase map: Phase 2 = #673/#674/#675/#684 (fix in #691), Phase 3 = #671/#672 (build live), Phase 4 = #679/#680/#681, Phase 5 = #682, Phase 6 = #676/#677/#678/#683.
 - **BUILDER SEQUENCING RULE (21:57Z, verified)**: chain a phase (`{"action":"build","issue":582}`) ONLY when no `opencode/issue582-*` PR is open. Phase 3 was chained correctly at 23:31:15Z (no phase PR was open); do NOT re-dispatch while the Phase 3 build's PR exists or while #691 is mid-fix on its own `opencode/issue656-*` branch.

## IN FLIGHT
 - **#691 Fixer (opencode 39178079415, live since 23:49:04Z on `b5a5b85f`)**: on push -> auto `/oc review` round 2 -> on approve -> tester -> eval -> merge lane. The head MUST move (F3 rebase).
 - **#654 review round 13 (39176605033, live since 23:27:38Z on `4fb5c35e` = remote tip)**: on approve -> tester -> PAT sweep (workflow-touching) -> verify #653 closes + Pages -> THEN dispatch `{"action":"lab","issue":669}`. On findings -> lab auto-forward.
 - **#670 review round 7 (39177280212, live since 23:37:13Z on `8366ad2e` = remote tip)**: round-7 lab fix = F12 setup-region exact-text pin + scenarios s28-s30. On approve -> tester -> PAT sweep -> verify #668 closes + Pages; on findings -> lab auto-forward.
 - **Phase 3 build (opencode 39176865984, live since 23:31:17Z on #582)**: on push -> PR (`opencode/issue582-*`) -> review -> tester -> per-OS arms on the render pipeline.
 - **macOS per-OS arm (39170578536, test-macos since 22:36:44Z on the pre-fix `c32b6a4f`)**: report folds into the #656/#691 lane; rerun per-OS on the fixed build after #691 lands.
 - **Sequenced lab lanes**: #669 (behind #654), then #689, then #690 (one at a time; shared opencode.yml/runner surfaces).
 - **Open issues**: #582 (parent, OPEN), #653, #655-#661, #668, #669, #671-#684, #689, #690, boards #70/#42. No untriaged work.
 - **STANDING PLAYBOOK RULE**: after ANY rebase merge of a `Closes`/`Fixes` #N PR, verify the linked issue actually closed; close explicitly if still open.
 - **STANDING POST-MERGE RULE**: after a merge that advances main, verify Pages success (bot merges emit no workflow events; the hardcoded post-session step dispatches the deploy with the PAT). Latest deploy 39177141410 SUCCESS 23:35:13Z on `3357ea79`.

## WATCH ITEMS
 - **WATCH - #691 Fixer**: head `b5a5b85f` must move via the rebase; round 2 binds to the new head. F1/F2 are gate-honesty items - a fix that only edits the claim numbers instead of the code is a re-fail.
 - **WATCH - #654 round 13**: review 39176605033 mid-session; #669 gated behind.
 - **WATCH - #670 round 7**: review 39177280212 mid-session (runner queue is heavy; correlate timestamps before suspecting a stall).
 - **WATCH - Phase 3 build**: must create `opencode/issue582-*` PR referencing #582 with roadmap Phase 3 scope; the path to Phase 4 (visual) is gated on design docs (now on main, binding).
 - **WATCH - macOS arm**: 39170578536 ~95 min in; long macOS emulator runs are normal; fold, do not duplicate.
 - **WATCH - #689/#690**: untriaged by design; route lab ONLY after #654 and #670 land; one at a time.
 - **WATCH - bot-actor PR-event arm reds (owner-accepted, do not dispatch)**: the Owner closed #427 (COMPLETED) and its fix PR #429 (unmerged) on 2026-09-25; `maintainer.yml`'s verify-step comment documents this arm as redundant. Do not re-file; revisit only if the Owner reopens.
 - **WATCH - pending skip-only runs**: the maintainer fan-out arms (23:37/23:49/23:59) are skip-only or cancelled-by-design supersessions, inert.
 - **WATCH - held runs**: 2 held at survey (#670 branch, bot-push class); this run's hardcoded approval sweep clears them; re-check next survey.

## BACKLOG (low priority; do not act unless idle)
 - #691 residuals from the review (F4-F7 nits; optional non-blockers: `board_is_centered_and_inside` asserts; `cw=6` golden; 143x64 comment) - carry at the round-2 verdict.
 - #670 non-blocking residuals (duplicate-title triage memo; unparseable create stdout; carry any round-7 residuals at the verdict).
 - #654 non-blocking residuals (bounded `tee` wait; `hang_flag` microsecond race; timing-sensitive `idle` increment; audit script's pre-existing final `exit 0`; carry any round-13 residuals at the verdict).
 - #656 residuals to carry into the #691 review: docs overclaim + test-coverage gap (`board_is_centered_and_inside` never asserted centering/coverage; hostile 300x120 misses the short-wide cap).
 - #685 residuals: fixed test-side flakes on main; Phase 3 note (menu/pause overlay over live Kitty placement) is #671 class.
 - #662 tester non-blocking hardening (crafted-run-dir-only: decompression-bomb cap, path escape, basename collisions, malformed meta/events, kitty a=t/a=f uncounted, whitespace-only unverified-reason) + per-phase attribution boundary.
 - Design lane observation for #689/#690: design auto-retry counter is per-target (retry-target migration resets the budget); the design forward lands `/oc build this` on the newest phase PR rather than the parent issue (#690's subject).
 - #635 Council non-blocking findings; older R15/R17/R20 MSYS portability; zombie queued skip-only runs (inert); docs nits (stale #427 phrasing in maintainer.yml - the issue is closed, so the comment's "until it lands" is misleading; REGISTRY.md Auditor row).

## NEXT-RUN PLAYBOOK
   1. #691: Fixer push -> auto `/oc review` round 2 -> on approve -> tester -> eval -> merge; verify F1 guard green + honest tallies + rebase took main's design-token keys; nothing on `b5a5b85f`.
   2. #654: round-13 verdict -> on approve -> tester -> PAT sweep -> verify #653 closes + Pages green -> THEN dispatch `{"action":"lab","issue":669}`.
   3. #670: round-7 verdict -> on approve -> tester -> PAT sweep -> verify #668 closes + Pages green.
   4. Phase 3 build: collect the `opencode/issue582-*` PR -> review -> tester -> per-OS arms; when #691 lands, re-run per-OS verification on the fixed terminal build (linux + macos + windows) before closing #673/#674/#675/#684 + #656.
   5. macOS arm: fold the 39170578536 report into the #656/#691 lane (its target predates the fix; rerun is mandatory for closure evidence).
   6. #689 then #690 (one at a time): only after #654 AND #670 land -> `{"action":"lab","issue":689}`, then `{"action":"lab","issue":690}`.
   7. Failure triage: correlate first; bot-actor arm reds stay un-dispatched (owner-closed #427/#429); the 403 class stays sequenced behind #654.
   8. Section C (#671-#684): phase-consumed; no individual routing.
   9. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
   - Does the #691 Fixer clear F1-F3 in one round (docs guard green, honest tallies, clean rebase onto `3357ea79`)?
   - Does round 13 bind the #654 R15 class and unblock #669?
   - Does round 7 clear the #670 F12 hardening without a new escape family?
   - Does the Phase 3 build land a coherent render-pipeline PR without colliding with #691's lane?
   - Does the macOS arm report add findings beyond the Linux F1/F2/F3 already in fix?

   - Hephaestus, the Maintainer
