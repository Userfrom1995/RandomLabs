# STATE - Random factory checkpoint
 - **Updated: 2026-10-18 run 39163778334 (the 20:32Z `/oc maintainer` wake on #685; survey 20:32-20:35Z) (zero dispatch - every lane owns a live session: #685's Phase 2 build PR opened 20:32:01Z with review round 1 live on exactly `81dcff32` (39163767735); #654's round-10 approval (20:17:59Z) put the read-only infra Tester live (39162674006, since 20:18:04Z); #670's lab session live since 20:05:24Z (39161710772); #582's design auto-retry started the moment the build released group `opencode-582` (39161404347, design job 20:32:38Z); main tip `f5041f32`, Pages GREEN, zero held, allowlist exact 18/18, zero untriaged)**
 - Prior checkpoints: run 39162246005 (20:12Z wake on #654), run 39158916097 (~19:28Z scheduled tick), run 39158998538 (19:29Z #670 wake), run 39156825729 (19:01Z wake on #654), run 39156804320 (self-triage #684), run 39156764073 (self-triage #671), run 39156369277 (18:55Z: #662 MERGED + post-merge playbook), run 39154978157, run 39152313250, run 39150137794. Older detail in the day logs.
 - MERGED today (re-verified): **#662 `f5041f32` (18:57:11Z; the Phase 1 overhaul PR, rebase, #582 left open)**, #667 `fb8b34c1` (16:27:58Z; #665 closed 16:27:59Z), #664 `16bb395f` (16:05:48Z; #663 closed 16:05:51Z), #635 `28eacb99`, #652 `f66eca3a`, #651 `672bb8bb`, #649 `ad08112c`, #646 `a9f703ad`, #644 `5d9797f0`, #643 `726f269a`, #640 `2d829703`, #638 `498638fe`. Main tip `f5041f32` (ls-remote verified).

## THE OVERHAUL (primary lane; parent #582; roadmap ON MAIN)
 - **Owner directive**: https://github.com/Userfrom1995/RandomLabs/issues/582#issuecomment-6249701945 (12:05:13Z). Binding asks: (1) real-terminal compatibility matrix incl. Kitty and Ghostty on Linux/macOS/Windows, no unverified compatibility claims; (2) genuinely dynamic full-window terminal layout at any size/aspect; (3) real distributable releases for terminal + desktop on all platforms (RPM/DEB, Windows/macOS installers, automated reproducible pipeline, official release page, install/upgrade/uninstall docs); (4) visual redesign (characters/environments/effects/animation); (5) sound redesign with volume/mute controls; (6) Pages = the complete game with dedicated download/install/docs/compatibility/release subpages; (7) architecture reassessment + full-product verification on real platforms. No completion from compile/CI alone.
 - **Roadmap on main**: `progress/582-maze-chase-overhaul.md` (eight semantic phases; Phase 1 landed via #662, Phase 2 now built as PR #685) plus `progress/582-maze-chase-overhaul-findings.md` (the evidence ledger).
 - **THE SEVEN WORKSTREAM SUB-ISSUES (attached to #582; all open)**: #655 terminal compatibility matrix; #656 dynamic terminal layout; #657 release engineering; #658 visual redesign; #659 sound design overhaul; #660 Pages complete game + subpages; #661 architecture reassessment + full-product verification. Roadmap-consumed by their phase PRs; do NOT route them individually.
 - **SECTION C SUB-ISSUES (14, all open, filed 19:00:34-19:00:59Z by run 39156369277; NUMBERS RECORDED)**: #671 kitty reply loop; #672 Ghostty live kitty probe; #673 re-rasterize at real cell size; #674 resize contract; #675 continuous cell scales; #676 desktop max-pixel freeze; #677 desktop HiDPI; #678 desktop idle CPU; #679 warden facing; #680 fright mask; #681 reduced_flash coverage; #682 audio baseline; #683 release-claims sweep + Windows E2E re-sign gate; #684 min-size copy alignment. Each body carries `Parent: #582`, the phase, the workstream (#655-#661), evidence citations, and acceptance criteria. **ROUTING RULE: phase-consumed tracking items; their phase PRs close them. Do NOT dispatch workers on them individually.** Phase map: Phase 2 = #673/#674/#675/#684; Phase 3 = #671/#672; Phase 4 = #679/#680/#681; Phase 5 = #682; Phase 6 = #676/#677/#678/#683.
 - **POST-MERGE PLAYBOOK (all verified landed)**: (1) #582 verified open; (2) Section C set = #671-#684 recorded; (3) design retry live (39161404347, started 20:32:38Z after the build released the group); (4) Phase 2 build completed 20:32:36Z and opened PR #685.
 - **Pages on `f5041f32` VERIFIED GREEN**: run 39163780257 SUCCESS (20:32:34Z); preview on `81dcff32` (39163742454) SUCCESS (20:32:04Z).

## IN FLIGHT
 - **#685 (head `81dcff32`, branch `opencode/issue582-20261018200149`, `Refs #582` + `Closes #656`)**: Phase 2 build PR ("dynamic terminal layout and full-window composition"; 18 files, +1384/-267; geometry detection, continuous layout solver, continuous cell rendering, exact-fit rasters, resize contract, trace mode, PTY contract suite). Body claims resolution of #656 AND Phase-2 children #673/#674/#675/#684 (only #656 is keyword-linked). Review round 1 live since 20:32:23Z (39163767735, job 20:32:25Z, on exactly `81dcff32`). On approve -> auto tester forward -> machine-published `/oc approve-test` -> bot merge (no workflow files) -> verify #656 closed + explicitly close #673/#674/#675/#684 + Pages green -> chain Phase 3 (`{"action":"build","issue":582}` after checking the roadmap).
 - **#654 (head `a6a6a73e`, `Fixes #653`)**: round-10 review APPROVED 20:17:59Z; read-only infra Tester 39162674006 live since 20:18:04Z (job 20:18:07Z) on exactly this head. On machine-published `/oc approve-test` -> PAT merge sweep (workflow-touching) -> verify `Fixes #653` closes + Pages green -> THEN dispatch `{"action":"lab","issue":669}` (never parallel with #654). Runtime blobs byte-frozen (`b69179b9`/`a85701a2` since `78b57e6e`).
 - **#670 (head `4669d5bf`, `Closes #668`)**: lab run 39161710772 live since 20:05:24Z (job 20:05:27Z) on the round-3 review findings. On push -> review round 4 -> tester -> PAT sweep -> verify #668 closes.
 - **#669 (403 abuse-traffic class)**: filed; route `lab` ONLY after #654 lands (same runner files).
 - **Design lane (#582)**: auto-retry 39161404347 STARTED 20:32:38Z (design job in_progress; the other seven mode jobs skipped by design) after the Phase 2 build released group `opencode-582`. Delivers `docs/design.md` + tokens for the visual/sound phases. Watch for its branch/PR; a second cap-death escalates per the retry ladder.
 - **Open issues**: #582 (parent, OPEN), #653, #655-#661, #668, #669, #671-#684, boards #70/#42. No untriaged work outside the deliberate Section C cohort.
 - **STANDING PLAYBOOK RULE**: after ANY rebase merge of a `Closes`/`Fixes` #N PR, verify the linked issue actually closed; close explicitly if still open.
 - **STANDING POST-MERGE RULE**: after a merge that advances main, verify Pages success (bot merges emit no workflow events; the hardcoded post-session step dispatches the deploy with the PAT).

## WATCH ITEMS
 - **WATCH - #685 review round 1**: live on `81dcff32`; findings -> the review workflow auto-routes `/oc fix` (build PR, no workflow files); approval -> auto tester forward.
 - **WATCH - #654 tester**: 39162674006; on approve expect the PAT sweep; on findings the derived cycle restarts (fix -> review -> re-test).
 - **WATCH - #670 lab round 3**: 39161710772; on findings -> review round 4.
 - **WATCH - #582 design retry**: first session died at its 60-minute cap (20:01:32Z); this retry started 20:32:38Z.
 - **WATCH - #685 post-merge closures**: #656 auto-closes via `Closes`; #673/#674/#675/#684 are body-claimed but NOT keyword-linked - close them explicitly after merge if the claimed scope landed (unless review/tester reject it).
 - **WATCH - provider 403 abuse-traffic class**: two occurrences today (12:26Z lab, 16:14Z test); issue #669 covers the fix; route lab after #654.
 - **WATCH - bot-actor PR-event arm reds (standing, cosmetic)**: #685 open red the redundant `pull_request` maintainer arm (39163742461 + the "does not have write permissions" bot comment at 20:32:39Z); CLI refuses `github-actions[bot]` (permission: none); Owner closed #427/#429 unmerged; standing observation only.
 - **WATCH - sparse schedule**: 5 cron ticks today; covered by comment/PR/failure arms; re-check tomorrow.
 - **WATCH - double owner wakes**: absorbed by the single-slot superseding design; watch for a pattern.

## BACKLOG (low priority; do not act unless idle)
 - #685 non-blocking residuals (if the review raises any; record them at the verdict).
 - #654 non-blocking residuals (bounded `tee` wait when a child holds the capture write end; the microsecond `hang_flag`-vs-healthy-completion race; the timing-sensitive `idle=$((idle + hang_idle_seconds))` variant; the audit script's pre-existing final `exit 0` on failures).
 - #670 non-blocking (duplicate-title in-run triage memo).
 - #662 tester non-blocking hardening (crafted-run-dir-only: decompression-bomb cap, crafted-log path escape, basename collisions, malformed meta/events shapes, kitty a=t/a=f uncounted, whitespace-only unverified-reason) + per-phase attribution boundary.
 - #635 Council non-blocking findings; older R15/R17/R20 MSYS portability; zombie queued skip-only runs (inert); docs nits (stale #427 phrasing; REGISTRY.md Auditor row).

## NEXT-RUN PLAYBOOK
   1. #685: watch review round 1 (39163767735) -> findings route automatically to the fixer; on approval tester -> machine-published approve -> merge -> verify #656 closed + close #673/#674/#675/#684 + Pages green -> dispatch Phase 3 build on #582 (check the roadmap's next phase first).
   2. #654: tester verdict -> on approve the PAT sweep lands it -> verify #653 closes + Pages green -> THEN dispatch `{"action":"lab","issue":669}`.
   3. #670: watch lab 39161710772 -> review round 4 -> tester -> PAT sweep -> verify #668 closes.
   4. Design: watch 39161404347 for its branch/PR; route through review -> test -> merge.
   5. Failure triage: correlate first; re-dispatch only when no session is live/queued for the signature. The bot-actor PR-event arm reds stay un-dispatched (standing class).
   6. Section C (#671-#684): phase-consumed; no individual routing; disposition-only ticks if self-dispatch wakes arrive.
   7. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
   - Does the Phase 2 review approve #685 on the first round (430 tests, PTY contract evidence) or draw findings?
   - Does the #654 infra Tester approve, unblocking the #669 lab dispatch?
   - Does the #670 lab round clear its round-3 findings this time?
   - Does the design retry survive its 60-minute cap and ship `docs/design.md` + tokens before the visual/sound phases?
   - Do #673/#674/#675/#684 get closed at #685's merge (Phase-2-consumed; body-claimed but not keyword-linked)?

   - Hephaestus, the Maintainer
