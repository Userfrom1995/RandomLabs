# STATE - Random factory checkpoint
 - **Updated: 2026-10-18 run 39162246005 (the 20:12Z `/oc maintainer` wake on #654; survey 20:12-20:18Z) (zero dispatch - every lane owns a live session: #654's round-6 lab fix landed `159447ab` + correction `a6a6a73e` by PAT with review round 10 live on the head (39161656439, job started 20:04:48Z); #670's review round 3 returned findings at 20:05:19Z so the Lab Engineer is live again (39161710772, on `4669d5bf`); #582's design session died at its 60-minute cap at 20:01:32Z (no decision file) and its `/oc design (auto-retry 1)` is FIFO-queued behind the live Phase 2 build (39156811031, started 20:01:35Z); main tip `f5041f32`, Pages GREEN, zero failures/held runs, allowlist exact 18/18, zero untriaged)**
 - Prior checkpoints: run 39158916097 (~19:28-19:38Z scheduled tick; zero dispatch - #654 tester returned `lab`, #670 lab landed `4669d5bf`), run 39158998538 (19:29Z `/oc maintainer` wake on #670: lab fix landed, review round 3 live), run 39156825729 (~19:01Z wake on #654: round-9 approved `16dedc98`, infra Tester live), run 39156804320 (self-triage #684), run 39156764073 (self-triage #671), run 39156369277 (#662 MERGED `f5041f32`; post-merge playbook executed), run 39154978157, run 39152313250, run 39150137794. Older detail in the day logs.
 - MERGED today (re-verified): **#662 `f5041f32` (18:57:11Z; the Phase 1 overhaul PR, rebase, #582 left open)**, #667 `fb8b34c1` (16:27:58Z; #665 closed 16:27:59Z), #664 `16bb395f` (16:05:48Z; #663 closed 16:05:51Z), #635 `28eacb99`, #652 `f66eca3a`, #651 `672bb8bb`, #649 `ad08112c`, #646 `a9f703ad`, #644 `5d9797f0`, #643 `726f269a`, #640 `2d829703`, #638 `498638fe`. Main tip `f5041f32` (ls-remote verified).

## THE OVERHAUL (primary lane; parent #582; roadmap ON MAIN)
 - **Owner directive**: https://github.com/Userfrom1995/RandomLabs/issues/582#issuecomment-6249701945 (12:05:13Z). Binding asks: (1) real-terminal compatibility matrix incl. Kitty and Ghostty on Linux/macOS/Windows, no unverified compatibility claims; (2) genuinely dynamic full-window terminal layout at any size/aspect; (3) real distributable releases for terminal + desktop on all platforms (RPM/DEB, Windows/macOS installers, automated reproducible pipeline, official release page, install/upgrade/uninstall docs); (4) visual redesign (characters/environments/effects/animation); (5) sound redesign with volume/mute controls; (6) Pages = the complete game with dedicated download/install/docs/compatibility/release subpages; (7) architecture reassessment + full-product verification on real platforms. No completion from compile/CI alone.
 - **Roadmap on main**: `progress/582-maze-chase-overhaul.md` (eight semantic phases; Phase 1 landed via #662) plus `progress/582-maze-chase-overhaul-findings.md` (the evidence ledger).
 - **THE SEVEN WORKSTREAM SUB-ISSUES (attached to #582; all open)**: #655 terminal compatibility matrix; #656 dynamic terminal layout; #657 release engineering; #658 visual redesign; #659 sound design overhaul; #660 Pages complete game + subpages; #661 architecture reassessment + full-product verification. Roadmap-consumed by their phase PRs; do NOT route them individually.
 - **SECTION C SUB-ISSUES (14, all open, filed 19:00:34-19:00:59Z by run 39156369277; NUMBERS RECORDED)**: #671 kitty reply loop; #672 Ghostty live kitty probe; #673 re-rasterize at real cell size; #674 resize contract; #675 continuous cell scales; #676 desktop max-pixel freeze; #677 desktop HiDPI; #678 desktop idle CPU; #679 warden facing; #680 fright mask; #681 reduced_flash coverage; #682 audio baseline; #683 release-claims sweep + Windows E2E re-sign gate; #684 min-size copy alignment. Each body carries `Parent: #582`, the phase, the workstream (#655-#661), evidence citations, and acceptance criteria. **ROUTING RULE: phase-consumed tracking items; their phase PRs close them. Do NOT dispatch workers on them individually.**
 - **POST-MERGE PLAYBOOK (all verified landed)**: (1) #582 verified open; (2) Section C set = #671-#684; (3) design dispatch -> the design session (39156808919) died at its 60-min cap at 20:01:32Z with no decision file, crash-parity re-queued `/oc design (auto-retry 1)` (39161404347, pending behind the Phase 2 build); (4) Phase 2 `build` dispatch -> run 39156811031 started at 20:01:35Z once the design job released group `opencode-582` (phase "Dynamic Terminal Layout and Full-Window Composition", `Closes #656` per the roadmap).
 - **Pages on `f5041f32` VERIFIED GREEN**: run 39156825550 SUCCESS (19:02:07Z); the 20:12:29Z main deploy (39162247200) also SUCCESS. Standing post-merge check complete.

## IN FLIGHT
 - **#654 (head `a6a6a73e`, `Fixes #653`)**: the round-6 lab fix landed as `159447ab` (R15 exact pins: watchdog defaults 600s/30s, TERM-to-KILL grace + full signal set, post-growth `idle=0` re-arm, unanchored nonzero-MNF grep, `-ge` threshold, success-path `exit 0`, verify `exit 1` pin, plus the `mnf-err-nz` scenario) plus correction `a6a6a73e` (decision-note verifier-scope claim); remote tip = PR head (ls-remote + PR API verified); audit-only, runtime blobs byte-frozen (`b69179b9` / `a85701a2`). Review round 10 live since 20:04:46Z (39161656439, job started 20:04:48Z, after the 20:04:45-47Z push). WATCH: confirm the verdict names `a6a6a73e`; if it names a pre-push head, dispatch a fresh `/oc review`. On approval -> automatic tester forward -> machine-published `/oc approve-test` -> PAT merge sweep (workflow-touching) -> verify `Fixes #653` closes + Pages green -> THEN dispatch `{"action":"lab","issue":669}` (never parallel with #654).
 - **#670 (head `4669d5bf`, `Closes #668`)**: review round 3 (39158988030) concluded 20:05:19Z with `/oc lab fix review findings`; auto-forward posted `/oc lab` 20:05:21Z -> Lab Engineer run 39161710772 live since 20:05:24Z. On its push -> review -> tester -> PAT sweep -> verify #668 closes.
 - **#669 (403 abuse-traffic class)**: filed; route `lab` ONLY after #654 lands (same runner files).
 - **Design lane (#582)**: session 39156808919 died at its 60-minute cap (20:01:32Z, no decision file, run concluded success via the crash-parity path); `/oc design (auto-retry 1)` posted 20:01:28Z -> opencode 39161404347 pending, FIFO behind the Phase 2 build in group `opencode-582`. Watch: a second cap-death escalates to me per the retry ladder.
 - **Phase 2 lane (#582)**: build run 39156811031 live since 20:01:35Z; watch for the Builder branch/PR (`opencode/issue582-*`), `Closes #656`, `Refs #582`. The build runs before the design pass is delivered (terminal-layout phase, not the visual redesign; by the group FIFO design).
 - **Open issues**: #582 (parent, OPEN), #653, #655-#661, #668, #669, #671-#684, boards #70/#42. No untriaged work outside the deliberate Section C cohort.
 - **STANDING PLAYBOOK RULE**: after ANY rebase merge of a `Closes`/`Fixes` #N PR, verify the linked issue actually closed; close explicitly if still open.
 - **STANDING POST-MERGE RULE**: after a merge that advances main, verify Pages success (bot merges emit no workflow events; the hardcoded post-session step dispatches the deploy with the PAT).

## WATCH ITEMS
 - **WATCH - #654 review round 10 head**: the `/oc review` (20:04:44Z) predates the branch push (20:04:45-47Z) by seconds; the review job started 20:04:48Z so checkout should be `a6a6a73e`, but verify the verdict's named head; stale -> fresh `/oc review`.
 - **WATCH - #670 lab round 2**: watch 39161710772 for its forward; on findings -> review; on approval -> tester -> PAT sweep.
 - **WATCH - #582 design retry**: runs only after the Phase 2 build releases group `opencode-582`; if it dies at the cap again, the retry ladder escalates.
 - **WATCH - provider 403 abuse-traffic class**: two occurrences today (12:26Z lab, 16:14Z test), both first-call deaths recovered by re-dispatch. Issue #669 covers the fix; route lab after #654.
 - **WATCH - bot-actor PR-event arm reds (standing, cosmetic)**: every bot-authored PR open reds the redundant `pull_request` maintainer arm (CLI refuses `github-actions[bot]`, permission: none); Owner closed #427/#429 unmerged; standing observation only.
 - **WATCH - sparse schedule**: 5 cron ticks today; covered by comment/PR/failure arms; re-check tomorrow.
 - **WATCH - double owner wakes**: absorbed by the single-slot superseding design; watch for a pattern.

## BACKLOG (low priority; do not act unless idle)
 - #662 tester non-blocking hardening (crafted-run-dir-only: decompression-bomb cap, crafted-log path escape, basename collisions, malformed meta/events shapes, kitty a=t/a=f uncounted, whitespace-only unverified-reason) + per-phase attribution boundary.
 - #654 non-blocking residuals (bounded `tee` wait when a child holds the capture write end; the microsecond `hang_flag`-vs-healthy-completion race; the timing-sensitive `idle=$((idle + hang_idle_seconds))` variant; the audit script's pre-existing final `exit 0` on failures).
 - #670 non-blocking (duplicate-title in-run triage memo).
 - #635 Council non-blocking findings; older R15/R17/R20 MSYS portability; zombie queued skip-only runs (inert); docs nits (stale #427 phrasing; REGISTRY.md Auditor row).

## NEXT-RUN PLAYBOOK
   1. #654: watch round-10 verdict (39161656439) -> findings route lab automatically; on approval the tester forward runs; tester verdict (machine-published) -> PAT sweep -> verify #653 closes + Pages green -> THEN dispatch `{"action":"lab","issue":669}`.
   2. #670: watch lab 39161710772 -> review -> tester -> PAT sweep -> verify #668 closes.
   3. #582 lanes: watch the Phase 2 build (39156811031) and the queued design retry (39161404347) for their branches/PRs; route them through review -> test -> merge.
   4. Failure triage: correlate first; re-dispatch only when no session is live/queued for the signature. The bot-actor PR-event arm reds stay un-dispatched (standing class).
   5. Section C (#671-#684): phase-consumed; no individual routing; disposition-only ticks if self-dispatch wakes arrive.
   6. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
   - Did the round-10 review actually checkout `a6a6a73e`?
   - Does the #670 lab round clear the round-3 findings?
   - Does the design auto-retry survive its cap after the build releases the group, and do the design/Phase 2 PRs avoid branch collisions?
   - Does the schedule density (5 ticks today) hold tomorrow?

   - Hephaestus, the Maintainer
