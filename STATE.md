# STATE - Random factory checkpoint
 - **Updated: 2026-10-18 run 39169175492 (the 21:44Z `/oc maintainer` wake on #670; survey 21:44-21:53Z) (#670 round-5 lab fix landed `a951eafd` 21:36:39Z + review round 5 live 39168606723 on exactly that head; DESIGN PR #688 OPENED (`8514388b`, `Refs #582`) with its review dispatch owned by the live sibling tick 39169173722; #654 review round 11 APPROVED 21:38:13Z -> infra Tester live 39168727619; #685 tester live since 21:16:45Z; #582 design-implementation BUILD session live 39169164084 since 21:44:25Z; strip-trailers false-red tracker issue filed, sequenced behind #654/#670; main tip `713755dc`; Pages GREEN on `713755dc` (39169175663, 21:44:35Z); zero held; allowlist exact 18/18; zero worker dispatch)**
 - Prior checkpoints: run 39167038487 (21:15Z #654 wake; #685 review 3 approve -> tester), run 39166757039 (21:11Z #685 wake; F5 amend verified), run 39166095785 (21:03Z #685 wake; fixer round 1 `a44613e8`), run 39165581626 (20:56Z #670 wake; #687 merged by hand `713755dc`, #686 closed), run 39165526719 (died at provider, the #669 403 class), run 39164167540 (#687 wake), run 39163778334 (#685 wake), run 39162246005 (#654 wake), run 39158916097 (tick), run 39158998538 (#670 wake), run 39156825729 (#654 wake), run 39156804320, run 39156764073, run 39156369277, run 39154978157, run 39152313250, run 39150137794. Older detail in the day logs.
 - MERGED today (re-verified): #687 `713755dc` (20:57:54Z; #686 closed 20:57:55Z), #662 `f5041f32` (18:57:11Z; Phase 1, #582 left open), #667 `fb8b34c1` (16:27:58Z; #665 closed), #664 `16bb395f` (16:05:48Z; #663 closed), #635 `28eacb99`, #652 `f66eca3a`, #651 `672bb8bb`, #649 `ad08112c`, #646 `a9f703ad`, #644 `5d9797f0`, #643 `726f269a`, #640 `2d829703`, #638 `498638fe`. Main tip `713755dc` (ls-remote verified). POST-MERGE PAGES: deploy on `713755dc` SUCCESS 21:44:35Z (39169175663) and 21:15:41Z (39167039356). Nothing pending.

## THE OVERHAUL (primary lane; parent #582; roadmap ON MAIN)
 - **Owner directive**: https://github.com/Userfrom1995/RandomLabs/issues/582#issuecomment-6249701945 (12:05:13Z). Binding asks: (1) real-terminal compatibility matrix incl. Kitty and Ghostty on Linux/macOS/Windows, no unverified compatibility claims; (2) genuinely dynamic full-window terminal layout at any size/aspect; (3) real distributable releases for terminal + desktop on all platforms (RPM/DEB, Windows/macOS installers, automated reproducible pipeline, official release page, install/upgrade/uninstall docs); (4) visual redesign (characters/environments/effects/animation); (5) sound redesign with volume/mute controls; (6) Pages = the complete game with dedicated download/install/docs/compatibility/release subpages; (7) architecture reassessment + full-product verification on real platforms. No completion from compile/CI alone.
 - **Roadmap on main**: `progress/582-maze-chase-overhaul.md` (eight semantic phases; Phase 1 landed via #662, Phase 2 built as PR #685) plus `progress/582-maze-chase-overhaul-findings.md` (the evidence ledger).
 - **THE SEVEN WORKSTREAM SUB-ISSUES (attached to #582; all open)**: #655 terminal compatibility matrix; #656 dynamic terminal layout (Phase 2 shifting to `Refs #656`; the real-emulator rows stay open); #657 release engineering; #658 visual redesign; #659 sound design overhaul; #660 Pages complete game + subpages; #661 architecture reassessment + full-product verification. Roadmap-consumed by their phase PRs; do NOT route them individually.
 - **SECTION C SUB-ISSUES (14, all open, filed 19:00:34-59Z)**: #671 kitty reply loop; #672 Ghostty live kitty probe; #673 re-rasterize at real cell size; #674 resize contract; #675 continuous cell scales; #676 desktop max-pixel freeze; #677 desktop HiDPI; #678 desktop idle CPU; #679 warden facing; #680 fright mask; #681 reduced_flash coverage; #682 audio baseline; #683 release-claims sweep + Windows E2E re-sign gate; #684 min-size copy alignment. Each body carries `Parent: #582`, the phase, the workstream, evidence, acceptance criteria. **ROUTING RULE: phase-consumed tracking items; their phase PRs close them. Do NOT dispatch workers on them individually.** Phase map: Phase 2 = #673/#674/#675/#684 (STAY OPEN with #656 until per-OS real-emulator evidence lands - the F1 rescope), Phase 3 = #671/#672, Phase 4 = #679/#680/#681, Phase 5 = #682, Phase 6 = #676/#677/#678/#683.
 - **DESIGN PASS RELEASED**: PR #688 OPEN (`opencode/issue582-20261018203251`, head `8514388b`, `Refs #582`/`Refs #658`/`Refs #659`/`Refs #660`, closes nothing): `maze-chase/docs/design.md` (+607/-81), `design-tokens.json` (Pondwake palettes + Lantern Drift registries; legacy `themes` untouched so the `crates/assets/src/themes.rs` mirror test stays green), `progress/582-maze-chase-overhaul.md` (+24). Chosen direction: Pondwake identity + Waylight interaction + Lantern Drift motion (runner-up Paper Tailor recorded with dissent). **Its review dispatch belongs to the live sibling tick 39169173722 (target #688); FALLBACK: if the next tick finds no `/oc review (head 8514388b)` on #688, dispatch it immediately.** PATH: review -> tester -> merge (project docs, not workflow-touching, bot-mergeable).
 - **DESIGN-IMPLEMENTATION BUILD**: the council forward posted `/oc build this` on #685 at 21:44:23Z; opencode BUILD session 39169164084 live since 21:44:25Z implementing the chosen direction; watch for its branch/PR, then route review -> test -> merge.

## IN FLIGHT
 - **#685 (head `7e1788ec`, branch `opencode/issue582-20261018200149`, `Refs #582` + `Refs #656`)**: review round 3 APPROVED 21:16:40Z; the read-only Tester is LIVE on exactly this head since 21:16:45Z (opencode-test 39167119017). No workflow files in the diff -> bot merge on `approve-test`. POST-MERGE DISPOSITION (F1 rescope): #656 and #673/#674/#675/#684 stay OPEN until the per-OS testers commit the real-emulator resize rows/captures; then verify Pages green -> chain Phase 3 (`{"action":"build","issue":582}` after re-checking the roadmap) -> dispatch the per-OS testers for the Phase-2 emulator rows.
 - **#654 (head `6c8ed8f0`, `Fixes #653`)**: review round 11 APPROVED `6c8ed8f0` at 21:38:13Z; `/oc test` auto-forwarded 21:38:20Z; read-only infra Tester LIVE on exactly that head since 21:38:23Z (39168727619). On `approve-test` the PAT sweep (workflow-touching) lands it -> verify #653 closes + Pages green -> THEN dispatch `{"action":"lab","issue":669}` (never parallel: same runner files).
 - **#670 (head `a951eafd`, `Closes #668`)**: round-5 lab fix landed (push event 21:36:39Z; `38d8d87f` guard + `a951eafd` docs/note; remote tip verified via ls-remote). Review round 5 (39168606723) live since 21:36:46Z, started AFTER the push, on exactly this head. On findings -> `/oc lab` auto-route (infra PR). On approve -> tester -> PAT sweep (workflow-touching) -> verify #668 closes (PR body carries `Closes #668`; commit bodies carry no closing keywords).
 - **#688 (head `8514388b`, design PR)**: review dispatch owned by sibling tick 39169173722 (live). Fallback check next tick. Then tester -> merge.
 - **#669 (403 abuse-traffic class)**: three occurrences 10-18 (12:26Z Lab Engineer, 16:14Z opencode-test, 20:55Z maintainer death 39165526719); stays sequenced behind #654 (same runner files), dispatch immediately after #654 lands.
 - **NEW TRACKER ISSUE (filed this run, self-dispatch may be in flight)**: "[Infra] strip-trailers guard false-reds sessions triggered from Refs #N PR threads" - evidence: design run 39168334922 red at the trailer-strip step refusing `opencode/issue582-20261018200149` when the thread was PR #685 (issue.number 685 != branch prefix 582); fail-safe, zero corruption (no owner trailers). **SEQUENCED: dispatch `{"action":"lab","issue":<N>}` only AFTER #654 and #670 land** (shared `silent-stall-audit.sh`); cosmetic noise until then.
 - **#687 / #686: COMPLETE** (#687 merged `713755dc`; #686 closed 20:57:55Z; branch kept at `2e85ee87`). Nothing outstanding.
 - **Open issues**: #582 (parent, OPEN), #653, #655-#661, #668, #669, #671-#684, boards #70/#42, plus the strip-trailers tracker. No untriaged work outside the deliberate Section C cohort.
 - **STANDING PLAYBOOK RULE**: after ANY rebase merge of a `Closes`/`Fixes` #N PR, verify the linked issue actually closed; close explicitly if still open.
 - **STANDING POST-MERGE RULE**: after a merge that advances main, verify Pages success (bot merges emit no workflow events; the hardcoded post-session step dispatches the deploy with the PAT).

## WATCH ITEMS
 - **WATCH - #688 review dispatch (fallback)**: sibling 39169173722 owns it; if the next tick finds no `/oc review (head 8514388b)` on #688, dispatch immediately.
 - **WATCH - #685 tester**: live on `7e1788ec` since 21:16:45Z (39167119017); approve-test -> bot merge -> keep #656/#673/#674/#675/#684 open -> Pages green -> chain Phase 3 + per-OS tester dispatch.
 - **WATCH - #654 tester**: live on `6c8ed8f0` since 21:38:23Z (39168727619); approve-test -> PAT sweep -> #653 closes -> Pages green -> dispatch lab #669.
 - **WATCH - #670 review round 5**: live on `a951eafd` since 21:36:46Z (39168606723); findings -> `/oc lab` auto; approval -> tester -> PAT sweep.
 - **WATCH - #582 design-implementation build**: 39169164084 live since 21:44:25Z; its PR follows review -> test -> merge.
 - **WATCH - the strip-trailers false-red class**: tracker filed; sequence the lab fix AFTER #654/#670.
 - **WATCH - the #669 403 class**: sequenced behind #654; re-check at #654's merge.
 - **WATCH - skip-cohort noise**: each comment spawns the per-workflow skip fleet plus cancelled single-slot maintainer supersessions (by design); inert.
 - **WATCH - bot-actor PR-event arm reds (standing, cosmetic)**: pre-#427 class; Owner closed #427/#429 unmerged; standing observation only.
 - **WATCH - sparse schedule**: comment/PR/failure arms carry the load; re-check tomorrow.

## BACKLOG (low priority; do not act unless idle)
 - Strip-trailers tracker issue: lab fix sequenced after #654/#670.
 - #670 non-blocking residuals (duplicate-title in-run triage memo; unparseable create stdout; carry any round-5 residuals at the verdict).
 - #654 non-blocking residuals (bounded `tee` wait; `hang_flag` microsecond race; timing-sensitive `idle` increment; the audit script's pre-existing final `exit 0` on failures; carry any round-11 residuals at the verdict).
 - #685 non-blocking residuals (if the tester raises any; record them at the verdict); #688 design PR observations at its verdict.
 - #662 tester non-blocking hardening (crafted-run-dir-only: decompression-bomb cap, crafted-log path escape, basename collisions, malformed meta/events shapes, kitty a=t/a=f uncounted, whitespace-only unverified-reason) + per-phase attribution boundary.
 - #635 Council non-blocking findings; older R15/R17/R20 MSYS portability; zombie queued skip-only runs (inert); docs nits (stale #427 phrasing; REGISTRY.md Auditor row).

## NEXT-RUN PLAYBOOK
   1. #688: check for `/oc review (head 8514388b)`; if absent, dispatch `{"action":"review","pr":688,"head":"8514388b9e4e8486bbd76578467f9ef58ee426e3"}`; then tester -> merge.
   2. #654: tester verdict -> on `approve-test` the PAT sweep lands it -> verify #653 closes + Pages green -> THEN dispatch `{"action":"lab","issue":669}`.
   3. #670: round-5 verdict -> findings `/oc lab` auto; approval -> tester -> PAT sweep -> verify #668 closes.
   4. #685: tester verdict -> on approve-test bot merge -> keep #656/#673/#674/#675/#684 open -> Pages green -> chain Phase 3 (`{"action":"build","issue":582}` after checking the roadmap) + per-OS tester dispatch.
   5. #582 build session: watch 39169164084 for its branch/PR; route review -> test -> merge.
   6. Failure triage: correlate first; strip-trailers false red tracked/sequenced; bot-actor arm reds stay un-dispatched; the 403 class stays sequenced behind #654.
   7. Section C (#671-#684): phase-consumed; no individual routing.
   8. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
   - Does the round-5 review clear the F8 hardening, sending #670 to the tester?
   - Does the sibling tick dispatch the #688 review before the next tick (fallback armed)?
   - Does the #654 tester approve first try, and does the PAT sweep land it clean?
   - Does the design-implementation build session open a clean PR, and how does it sequence against #688's merge?
   - Does the 403 class recur before #654 lands, and does every occurrence stay followed by a recovered wake?

   - Hephaestus, the Maintainer
