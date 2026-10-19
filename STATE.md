# STATE - Random factory checkpoint
 - **Updated: 2026-10-19 run 39179324098 (the 00:07Z `workflow_run` failure triage wake: #656 macOS per-OS arm died at its 90-minute agent cap; fresh survey 00:07-00:25Z). Created NEW INFRA ISSUE for the per-OS agent-cap defect (UNTRIAGED - route lab) + pinged #656. ZERO worker dispatch: every live lane self-owns its session. #691 Fixer 39178079415 live since 23:49:04Z on `b5a5b85f` (must rebase; F3). #654 review round 13 (39176605033) live since 23:27:38Z on `4fb5c35e`. #670 review round 7 (39177280212) live since 23:37:13Z on `8366ad2e`. Phase 3 build 39176865984 live since 23:31:17Z on #582 (no branch push at survey). Sibling maintainer 39179141674 live (the 00:04:46Z `/oc maintainer` wake on #670). main tip `3357ea79`; allowlist exact 18/18; 0 held runs; Pages green (39179196763, 00:06:02Z).**
 - Prior checkpoints: run 39178784232 (00:00Z schedule tick; zero dispatch), run 39176252419 (23:22Z #691 PR-created wake), 39175247625, 39173288133, 39172986905, 39172194418, 39170230657, 39167038487, 39165581626, 39164167540, 39163778334, 39162246005, 39158916097, 39156825729, 39156369277, 39154978157, 39152313250. Older detail in the day logs.
 - MERGED today (re-verified): **#688 `3357ea79` (23:28:51Z; Design Council pass, tester-gated; #582 stays open)**, #685 `c32b6a4f` (21:59:50Z; Phase 2 construction; #656/#673/#674/#675/#684 left OPEN under the fix lane), #687 `713755dc` (20:57:54Z; #686 closed), #662 `f5041f32` (18:57:11Z; Phase 1), #667 `fb8b34c1`, #664, #635, #652, #651, #649, #646, #644, #643, #640, #638. Main tip `3357ea79` (ls-remote verified).

## THE OVERHAUL (primary lane; parent #582; roadmap ON MAIN)
 - **Owner directive**: https://github.com/Userfrom1995/RandomLabs/issues/582#issuecomment-6249701945 (12:05:13Z). Binding asks: (1) real-terminal compatibility matrix incl. Kitty and Ghostty on Linux/macOS/Windows, no unverified claims; (2) genuinely dynamic full-window terminal layout at any size/aspect; (3) real distributable releases for terminal + desktop on all platforms; (4) visual redesign; (5) sound redesign with volume/mute; (6) Pages = complete game with download/install/docs/compatibility/release subpages; (7) architecture reassessment + full-product verification on real platforms.
 - **Roadmap on main**: `progress/582-maze-chase-overhaul.md` (eight semantic phases; Phase 1 via #662, Phase 2 via #685 `c32b6a4f`, Phase 3 = terminal render pipeline and compatibility proof - BUILD LIVE on #582). Findings ledger: `progress/582-maze-chase-overhaul-findings.md`.
 - **DESIGN PASS MERGED - docs BINDING**: #688 landed `3357ea79` with `maze-chase/docs/design.md` (35KB) + `design-tokens.json` (Pondwake identity, Waylight UX, Lantern Drift motion). These are BINDING for Phase 4 (visual, #658/#679/#680/#681) and Phase 5 (sound, #659/#682); Phase 3 (render pipeline) proceeds without them.
 - **#691 - THE #656 FIX BUILD (PR open, head `b5a5b85f`, branch `opencode/issue656-20261018224059`)**: round-1 review verdict `fix` (23:48:58Z). Blocking F1 (committed `tester_docs_language` guard reds at HEAD: `scoreboard.md:207` "Phase 2"), F2 (the "444/0 green" claims false at HEAD: 443/1; re-measure after rebase in all four places), F3 (CONFLICTING vs main `3357ea79`: take main's `design-tokens.json`; keep main's design entries in the progress ledger). F4 (blueprint order contradiction), F5/F6 (overclaim, stale header), F7 doc nits. Fixer 39178079415 live since 23:49:04Z (still live at 00:25Z, ~36 min). `Refs #656`: closes nothing.
 - **#656 stays open** with #673/#674/#675/#684 until committed sweep/goldens + per-OS real-emulator evidence on the fixed build.
 - **PER-OS EVIDENCE STATE (new this run)**: Linux arm passed on the pre-fix `c32b6a4f` (39170577888, ~33 min) and its F1/F2/F3 findings are the #691 subject. **macOS arm 39170578536 DIED at the 90-minute agent-step cap** (`##[error]The action has timed out.` 00:07:06Z; verify failed closed on missing decision-file + findings-report; session was mid kitty/sixel work) - zero report, nothing binds. **NEW INFRA ISSUE (created by this run, number unknown at write time; UNTRIAGED)**: raise the per-OS agent caps (macOS `opencode-peros-test.yml:348`, Windows :556, both 90m under a 120m job) with the artifact gate intact; route `{"action":"lab"}` next run if the self-triage run has not already. **Windows arm has never run on this lane.**
 - **PER-OS RE-RUN RULE (verified)**: rerun all three arms (linux + macos + windows) on the FIXED build after #691 merges to main AND after the cap fix lands; do not re-dispatch the mac arm onto pre-fix main (it would burn ~2.5h and produce stale evidence).
 - **THE SEVEN WORKSTREAM SUB-ISSUES (attached to #582; all open)**: #655 compatibility matrix; #656 dynamic layout (construction merged; fix PR #691 in fix); #657 release engineering; #658 visual redesign; #659 sound; #660 Pages complete game; #661 architecture reassessment. Phase-consumed: do NOT route individually.
 - **SECTION C SUB-ISSUES (14, all open)**: #671 kitty reply loop; #672 Ghostty live probe; #673 re-rasterize at real cell size; #674 resize contract; #675 continuous cell scales; #676 desktop max-pixel freeze; #677 HiDPI; #678 idle CPU; #679 warden facing; #680 fright mask; #681 reduced_flash; #682 audio baseline; #683 release-claims sweep; #684 min-size copy. Phase map: Phase 2 = #673/#674/#675/#684 (fix in #691), Phase 3 = #671/#672 (build live), Phase 4 = #679/#680/#681, Phase 5 = #682, Phase 6 = #676/#677/#678/#683.
 - **BUILDER SEQUENCING RULE (21:57Z, verified)**: chain a phase (`{"action":"build","issue":582}`) ONLY when no `opencode/issue582-*` PR is open. Do NOT re-dispatch while the Phase 3 build's PR exists or while #691 is mid-fix on its own `opencode/issue656-*` branch.

## IN FLIGHT
 - **#691 Fixer (opencode 39178079415, live since 23:49:04Z on `b5a5b85f`)**: on push -> auto review round 2 -> on approve -> tester -> eval -> merge lane. The head MUST move (F3 rebase).
 - **#654 review round 13 (39176605033, live since 23:27:38Z on `4fb5c35e` = remote tip)**: on approve -> tester -> PAT sweep (workflow-touching) -> verify #653 closes + Pages -> THEN dispatch `{"action":"lab","issue":669}`. On findings -> lab auto-forward.
 - **#670 review round 7 (39177280212, live since 23:37:13Z on `8366ad2e` = remote tip)**: round-7 lab fix = F12 setup-region exact-text pin + scenarios s28-s30. On approve -> tester -> PAT sweep -> verify #668 closes + Pages; on findings -> lab auto-forward.
 - **Phase 3 build (opencode 39176865984, live since 23:31:17Z on #582)**: on push -> PR (`opencode/issue582-*`) -> review -> tester -> per-OS arms on the render pipeline.
 - **NEW per-OS cap infra issue (UNTRIAGED; created by run 39179324098)**: route `{"action":"lab","issue":<new>}` next run unless the self-triage run already dispatched it; it must land before the per-OS re-runs.
 - **Sibling maintainer 39179141674 (live since 00:04:52Z)**: the 00:04:46Z `/oc maintainer` wake on #670; it owns that thread's tick.
 - **Sequenced lab lanes**: #669 (behind #654), then #689, then #690 (one at a time; shared opencode.yml/runner surfaces).
 - **Open issues**: #582 (parent, OPEN), #653, #655-#661, #668, #669, #671-#684, #689, #690, boards #70/#42, plus the new per-OS cap issue. No other untriaged work.
 - **STANDING PLAYBOOK RULE**: after ANY rebase merge of a `Closes`/`Fixes` #N PR, verify the linked issue actually closed; close explicitly if still open.
 - **STANDING POST-MERGE RULE**: after a merge that advances main, verify Pages success (bot merges emit no workflow events; the hardcoded post-session step dispatches the deploy with the PAT). Latest deploy 39179196763 SUCCESS 00:06:02Z on `3357ea79`.

## WATCH ITEMS
 - **WATCH - #691 Fixer**: head `b5a5b85f` must move via the rebase; round 2 binds to the new head. F1/F2 are gate-honesty items - a fix that only edits claim numbers is a re-fail.
 - **WATCH - #654 round 13**: review 39176605033 ~58 min in at 00:25Z (heavy rounds run up to ~56 min; correlate timestamps before suspecting a stall); #669 gated behind.
 - **WATCH - #670 round 7**: review 39177280212 ~48 min in; sibling session owns the thread tick.
 - **WATCH - Phase 3 build**: must create `opencode/issue582-*` PR referencing #582 with roadmap Phase 3 scope; the path to Phase 4 (visual) is gated on design docs (now on main, binding). The `opencode/issue582-maze-chase-phase-3..final` and `verified-release` branches are STALE archives (2026-10-16/18 heads, different SHAs) - do not confuse them with today's build.
 - **WATCH - per-OS cap issue**: created bot-side this run; expect its self-triage run (`workflow_dispatch`) and route lab; if not routed by the next schedule tick, dispatch lab explicitly.
 - **WATCH - per-OS reruns**: only after cap fix + #691 merged; dispatch all three (linux + macos + windows) on the fixed build, one thread (the #656 lane or the #691 PR), then fold reports.
 - **WATCH - #689/#690**: untriaged by design; route lab ONLY after #654 and #670 land; one at a time.
 - **WATCH - bot-actor PR-event arm reds (owner-accepted, do not dispatch)**: the Owner closed #427 (COMPLETED) and its fix PR #429 (unmerged) on 2026-09-25; `maintainer.yml`'s verify-step comment documents this arm as redundant. Do not re-file; revisit only if the Owner reopens.
 - **WATCH - pending skip-only runs**: the maintainer fan-out arms (00:04/00:06/00:07) are skip-only, cancelled-by-design, or pending-behind-this-run; inert.

## BACKLOG (low priority; do not act unless idle)
 - #691 residuals from the review (F4-F7 nits; optional non-blockers: `board_is_centered_and_inside` asserts; `cw=6` golden; 143x64 comment) - carry at the round-2 verdict.
 - #670 non-blocking residuals (duplicate-title triage memo; unparseable create stdout; carry any round-7 residuals at the verdict).
 - #654 non-blocking residuals (bounded `tee` wait; `hang_flag` microsecond race; timing-sensitive `idle` increment; audit script's pre-existing final `exit 0`; carry any round-13 residuals at the verdict).
 - #656 residuals to carry into the #691 review: docs overclaim + test-coverage gap (`board_is_centered_and_inside` never asserted centering/coverage; hostile 300x120 misses the short-wide cap).
 - macOS arm session notes worth carrying into the cap-issue lab pass: Terminal.app AX dumps work; kitty needed remote-control plumbing; the 90m budget went to Terminal.app calibration + PTY sweeps before the kitty pass.
 - #685 residuals: fixed test-side flakes on main; Phase 3 note (menu/pause overlay over live Kitty placement) is #671 class.
 - #662 tester non-blocking hardening (crafted-run-dir-only: decompression-bomb cap, path escape, basename collisions, malformed meta/events, kitty a=t/a=f uncounted, whitespace-only unverified-reason) + per-phase attribution boundary.
 - Design lane observation for #689/#690: design auto-retry counter is per-target (retry-target migration resets the budget); the design forward lands `/oc build this` on the newest phase PR rather than the parent issue (#690's subject).
 - #635 Council non-blocking findings; older R15/R17/R20 MSYS portability; zombie queued skip-only runs (inert); docs nits (stale #427 phrasing in maintainer.yml - the issue is closed, so the comment's "until it lands" is misleading; REGISTRY.md Auditor row).

## NEXT-RUN PLAYBOOK
   1. Per-OS cap issue: if the self-triage/next run has not dispatched it, `{"action":"lab","issue":<new>}`; verify the eventual PR raises the macOS/Windows caps with the artifact gate intact.
   2. #691: Fixer push -> auto `/oc review` round 2 -> on approve -> tester -> eval -> merge; verify F1 guard green + honest tallies + rebase took main's design-token keys; nothing on `b5a5b85f`.
   3. #654: round-13 verdict -> on approve -> tester -> PAT sweep -> verify #653 closes + Pages green -> THEN dispatch `{"action":"lab","issue":669}`.
   4. #670: round-7 verdict -> on approve -> tester -> PAT sweep -> verify #668 closes + Pages green; the sibling session owns the current tick.
   5. Phase 3 build: collect the `opencode/issue582-*` PR -> review -> tester -> per-OS arms.
   6. Per-OS re-runs: only after the cap fix AND #691 merged - dispatch test-linux + test-macos + test-windows on the fixed build in one cohort; close #673/#674/#675/#684 + #656 only on committed sweep/goldens + real-emulator evidence.
   7. #689 then #690 (one at a time): only after #654 AND #670 land -> `{"action":"lab","issue":689}`, then `{"action":"lab","issue":690}`.
   8. Failure triage: correlate first; bot-actor arm reds stay un-dispatched (owner-closed #427/#429); the 403 class stays sequenced behind #654.
   9. Section C (#671-#684): phase-consumed; no individual routing.
  10. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
   - Does the Lab Engineer raise the macOS/Windows per-OS caps cleanly without weakening the artifact gate?
   - Does the #691 Fixer clear F1-F3 in one round (docs guard green, honest tallies, clean rebase onto `3357ea79`)?
   - Does round 13 bind the #654 R15 class and unblock #669?
   - Does round 7 clear the #670 F12 hardening without a new escape family?
   - Does the Phase 3 build land a coherent render-pipeline PR without colliding with #691's lane?

   - Hephaestus, the Maintainer
