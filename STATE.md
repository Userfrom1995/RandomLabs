# STATE - Random factory checkpoint
 - **Updated: 2026-10-18 run 39176555729 (23:26Z `/oc maintainer` notify wake on #688; fresh survey 23:27-23:32Z). #688 MERGED `3357ea79` 23:28:51Z (design pass + tester gate suite now BINDING for Phases 4/5); Phase 3 CHAINED (`{"action":"build","issue":582}`). All other lanes self-driving, zero extra dispatch. main tip `3357ea79`.**
 - Prior checkpoints: run 39175247625 (23:08Z #670 wake; all lanes live), run 39175234735 (23:08Z #688 sibling tick), run 39173288133 (22:40Z #654 wake), run 39172986905 (22:36Z #656 Linux verdict), run 39172194418 (22:25Z #688 fixer-push wake), run 39170230657 (21:59Z #685 wake), run 39170220217 (21:59Z #690 self-triage tick), run 39170095489 (21:59Z approve-test wake: #685 merged `c32b6a4f`), run 39169173722 (21:44Z design-PR #688 self-dispatch wake), run 39167038487 (21:15Z #654 wake), run 39165581626 (20:56Z #687 merged `713755dc`), 39165526719 (died at provider, the #669 403 class), 39164167540, 39163778334, 39162246005, 39158916097, 39156825729, 39156369277, 39154978157, 39152313250. Older detail in the day logs.
 - MERGED today (re-verified): **#688 `3357ea79` (23:28:51Z; design pass, Refs-only, closes nothing)**, #685 `c32b6a4f` (21:59:50Z; Phase 2), #687 `713755dc` (20:57:54Z), #662 `f5041f32` (18:57:11Z; Phase 1), #667 `fb8b34c1` (16:27:58Z), #664 `16bb395f`, #635 `28eacb99`, #652 `f66eca3a`, #651 `672bb8bb`, #649 `ad08112c`, #646 `a9f703ad`, #644 `5d9797f0`, #643 `726f269a`, #640 `2d829703`, #638 `498638fe`. Main tip `3357ea79` (ls-remote verified).

## THE OVERHAUL (primary lane; parent #582; roadmap ON MAIN)
 - **Owner directive**: https://github.com/Userfrom1995/RandomLabs/issues/582#issuecomment-6249701945 (12:05:13Z). Binding asks: (1) real-terminal compatibility matrix incl. Kitty and Ghostty on Linux/macOS/Windows, no unverified compatibility claims; (2) genuinely dynamic full-window terminal layout at any size/aspect; (3) real distributable releases for terminal + desktop on all platforms (RPM/DEB, Windows/macOS installers, automated reproducible pipeline, official release page, install/upgrade/uninstall docs); (4) visual redesign (characters/environments/effects/animation); (5) sound redesign with volume/mute controls; (6) Pages = the complete game with dedicated download/install/docs/compatibility/release subpages; (7) architecture reassessment + full-product verification on real platforms. No completion from compile/CI alone.
 - **Roadmap on main**: `progress/582-maze-chase-overhaul.md` (eight semantic phases; Phase 1 landed via #662, Phase 2 landed via #685 `c32b6a4f`, design pass landed via #688 `3357ea79`). Findings ledger: `progress/582-maze-chase-overhaul-findings.md`.
 - **DESIGN PASS MERGED `3357ea79` (23:28:51Z)**: `maze-chase/docs/design.md` (Pondwake identity, Waylight UX, Lantern Drift motion) + `design-tokens.json` + the tester's durable `tester_design_token_gates.rs` suite are now on main and BINDING for Phases 4 (visual: #679/#680/#681) and 5 (sound: #682). Chain of record: council shipped -> review rounds 1-3 (F1-F9 + re-verify, approved `fc619db7` 23:15:08Z) -> tester gate (T1-T3 fixed; approved `dbe4f6cd` 23:26:49Z with the new palette-gate suite) -> merged this run. No issues closed (Refs #582/#658/#659/#660).
 - **PHASE 3 CHAINED (this run's dispatch)**: `{"action":"build","issue":582}` posted to start Phase 3 (#671 kitty reply loop; #672 Ghostty live kitty probe) against the now-binding design. Watch for the opencode run -> `opencode/issue582-*` branch -> PR -> review -> tester.
 - **#691 (the #656 fix build's PR - OPEN, under review)**: branch `opencode/issue656-20261018224059`, head `b5a5b85f`, body = F1 (scan the documented 1..8 x 1..4 scale grid; golden plans pinned at 200x60 and 62x80), F2 (scale/center the sixel raster inside its cell box), F3 (square raster in kitty) + committed sweep/golden tests. Review round 1 (39176241242) live since 23:22:26Z. Layer-stays-layer: terminal crate only.
 - **THE SEVEN WORKSTREAM SUB-ISSUES (attached to #582; all open)**: #655 terminal compatibility matrix; #656 dynamic terminal layout (STAYS OPEN with #673/#674/#675/#684 until per-OS real-emulator evidence lands; fix PR #691 under review); #657 release engineering; #658 visual redesign (design binding now); #659 sound design overhaul; #660 Pages complete game + subpages; #661 architecture reassessment + full-product verification. Roadmap-consumed by their phase PRs; do NOT route them individually (except #656's live fix lane above).
 - **SECTION C SUB-ISSUES (14, all open, filed 19:00:34-59Z)**: #671 kitty reply loop (Phase 3 - now chained); #672 Ghostty live kitty probe (Phase 3); #673 re-rasterize at real cell size; #674 resize contract; #675 continuous cell scales (all three Phase 2, fix under #691 review); #676 desktop max-pixel freeze; #677 desktop HiDPI; #678 desktop idle CPU (Phase 6); #679 warden facing; #680 fright mask; #681 reduced_flash coverage (Phase 4); #682 audio baseline (Phase 5); #683 release-claims sweep + Windows E2E re-sign gate (Phase 6); #684 min-size copy alignment (Phase 2, fix under #691 review). ROUTING RULE: phase-consumed; their phase PRs close them.
 - **BUILDER SEQUENCING RULE (21:57Z)**: chain a phase (`{"action":"build","issue":582}`) ONLY when no `opencode/issue582-*` PR is open (the mis-fire class of #690). Satisfied at this tick -> Phase 3 chained. The #656 fix lane on `opencode/issue656-*` is clear of this class.

## IN FLIGHT
 - **#691 review round 1 (39176241242, live since 23:22:26Z on `b5a5b85f`)**: on `/oc approve` -> tester -> then per-OS re-verification arms; on `/oc fix` -> fixer; on findings forward -> fix loop. Do not duplicate-dispatch review.
 - **#670 lab round 7 (39175886140, live since 23:17:27Z on `34fea8e1`)**: round-6 review posted findings at 23:17:22Z (auto-routed `/oc lab`); on push -> review round 7 -> on approve -> tester -> PAT sweep (workflow-touching) -> verify #668 closes.
 - **#654 review round 13 (39176605033, live since 23:27:38Z on `4fb5c35e`)**: round-13 lab fix pushed 23:27:33Z, `/oc review` 23:27:35Z. On approve -> tester -> PAT sweep -> verify #653 closes -> THEN dispatch `{"action":"lab","issue":669}`.
 - **#656 macOS per-OS arm (39170578536, test-macos in progress since 22:36:44Z)**: slow agent session, not stuck; folds into the #691 lane when it lands.
 - **Phase 3 build (dispatched this run via #582)**: watch for the run -> branch -> PR.
 - **Sequenced lab lanes**: #669 (behind #654), then #689, then #690 (one at a time; shared opencode.yml/runner surfaces).
 - **Open issues**: #582 (parent, OPEN), #653, #655-#661, #668, #669, #671-#684, #689, #690, boards #70/#42. No other untriaged work.
 - **STANDING PLAYBOOK RULE**: after ANY rebase merge of a `Closes`/`Fixes` #N PR, verify the linked issue actually closed; close explicitly if still open.
 - **STANDING POST-MERGE RULE**: after a merge that advances main, verify Pages success (bot merges emit no workflow events; the hardcoded post-session step dispatches the deploy with the PAT). Latest deploy 39176622491 SUCCESS 23:27:53Z on `c32b6a4f`; verify the `3357ea79` deploy next run.

## WATCH ITEMS
 - **WATCH - Phase 3 build**: the newly chained `{"action":"build","issue":582}`; confirm the run starts, binds `opencode/issue582-*`, and opens a PR; re-check the sequencing rule before any later chain.
 - **WATCH - #691 round 1**: the reviewer gages F1-F3 + committed tests on `b5a5b85f`; on approve the tester gate follows; per-OS re-verification arms after.
 - **WATCH - #670 round 7**: lab run mid-session on `34fea8e1`; head must stay until push -> review round 7.
 - **WATCH - #654 round 13**: review live on `4fb5c35e` (fresh lab push); #669 gated behind.
 - **WATCH - #656 macOS arm**: 39170578536 (test-macos since 22:36:44Z); if still hung next tick (~90+ min), consider a re-dispatch of the macos arm.
 - **WATCH - #689/#690**: untriaged by design; route lab ONLY after #654 and #670 land; one at a time.
 - **WATCH - bot-actor PR-event arm reds (standing, cosmetic)**: pre-#427 class; 39176205547 fired on #691's bot-created PR push (un-dispatched, no triage consequence - maintainer is self-excluded).
 - **WATCH - pending skip-only runs**: the 23:26:55Z and 23:27:38Z comment fan-outs - all skip-only by trigger gate, inert.
 - **WATCH - maintainer single-slot cancellations**: the 23:27:5xZ cancelled maintainer runs are workflow_run-event supersessions by design (newest re-surveys fresh), not failures.

## BACKLOG (low priority; do not act unless idle)
 - #670 non-blocking residuals (duplicate-title in-run triage memo; unparseable create stdout; carry any round-6/7 residuals at the verdict).
 - #654 non-blocking residuals (bounded `tee` wait; `hang_flag` microsecond race; timing-sensitive `idle` increment; the audit script's pre-existing final `exit 0` on failures; carry any round-12/13 residuals at the verdict).
 - #656 residuals from the Linux report to carry into #691's review: docs overclaim (terminal.md:128-131, feature-matrix.md:47, layout.rs:3-7) and the test-coverage gap (`board_is_centered_and_inside` never asserts centering/coverage; the hostile widest-short case 300x120 misses the short-wide cap).
 - #688 post-merge nontrivial note for Phases 4/5: the gate accent blend pulse and fright body pulse say "registered as a flash source" without a named 14-registry entry; map or enroll explicitly at implementation (render-code registry test will surface them).
 - #685 non-blocking residuals: none in-scope; the Phase 3 note (menu/pause overlay over a live Kitty placement) is #671 scope.
 - #662 tester non-blocking hardening (crafted-run-dir-only: decompression-bomb cap, crafted-log path escape, basename collisions, malformed meta/events shapes, kitty a=t/a=f uncounted, whitespace-only unverified-reason) + per-phase attribution boundary.
 - Design lane observation for #689/#690: the design auto-retry counter is per-target (retry-target migration resets the effective budget); the design forward lands `/oc build this` on the newest phase PR rather than the parent issue (#690's own subject).
 - #635 Council non-blocking findings; older R15/R17/R20 MSYS portability; zombie queued skip-only runs (inert); docs nits (stale #427 phrasing; REGISTRY.md Auditor row).

## NEXT-RUN PLAYBOOK
   1. Phase 3: confirm the chained build started and binds `opencode/issue582-*`; if the build misfired (no run within ~30 min), re-dispatch `{"action":"build","issue":582}`.
   2. #691: round-1 verdict -> on approve -> tester -> per-OS re-verification arms (linux + macos) on the fix head; fold the macOS arm report into the lane; close #673/#674/#675/#684 + #656 only on committed sweep/golden + real-emulator evidence.
   3. #670: lab round-7 push -> review round 7 -> on approve -> tester -> PAT sweep -> verify #668 closes + Pages; on findings -> lab (auto).
   4. #654: round-13 verdict -> on approve -> tester -> PAT sweep -> verify #653 closes -> THEN dispatch `{"action":"lab","issue":669}`.
   5. Lab order after #654 AND #670: #689 then #690 (one at a time).
   6. Verify Pages green on `3357ea79` (post-session dispatch); if missing, `{"action":"sweep","workflow":"pages","ref":"main"}`.
   7. Failure triage: correlate first; bot-actor arm reds stay un-dispatched.
   8. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
   - Does the Phase 3 build land #671/#672 cleanly against the binding design and without re-binding to a stale PR?
   - Does review round 1 clear #691 (F1-F3 + committed tests), and does the macOS arm fold cleanly into that lane?
   - Does the #670 round-7 lab fix clear the round-6 findings, unblocking approval and the PAT sweep to close #668?
   - Does the #654 round-13 fix bind the R15 class, unblocking #669?
   - Does the `3357ea79` Pages deploy go green on the next tick?

   - Hephaestus, the Maintainer
