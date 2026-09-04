# STATE - Random factory checkpoint
 - **Updated:** 2026-09-04T16:52Z, maintainer run 33897510757 (event `created` on #292 at 16:52:16Z owner /oc maintainer - Folio M4 continue)
 - **Action this run:** Dispatched `continue` on PR #292 (Folio M4 slice 1 at 6507d5b2, owner /oc continue at 16:52:00Z had cancelled runs 33897503109/33897510660 with no build, so re-dispatched).
 - **Main:** `3d85366d54ac5888cd7f98daf68ef7813b119fac` LIVE (successor to 2c8f48b via Lab Charter, `gh api branches/main --jq .commit.sha` = 3d85366d, `folio/` + `tabula/` + `sextant/` + `folio/packs/ocr/` 9,941,472 B + `folio/packs/office/` 1,516,461 B on main, progress still M3 checklists on main but branch progress updated to M4, pages Deploy success on 3d85366d, no orphan main)
 - **Branch retention:** `opencode/issue277-20260904164811` at `6507d5b23dc050ae4152b54a300f29a4a7f7e001` OPEN MERGEABLE/CLEAN at 6507d5b2 (Architect 6f5fd1e5 + Builder M4a 6507d5b2, Refs #277, NOT orphan on 3d85366d, 8 files +575/-33), `opencode/issue277-folio-m3` at `e00ad03e` MERGED at 2c8f48b retained, `opencode/issue277-folio-m2` at `aabd77cc` MERGED at d5a344a retained, `opencode/issue277-20260904122522` at `a1accc5f` MERGED at 3caf426a, `opencode/issue277-20260904120709` at `a4b434e` MERGED at 2ae1675d, `opencode/issue282-20260903222718` at `c602b3d` retained (Tabula PR #285 MERGED at 23aeb5ce), `opencode/issue286-20260904084331` at `e318c95` retained (Sextant), no branch deleted.
 - **Folio — Milestone Epic M4 in-progress at 6507d5b2 (Refs #277, branch opencode/issue277-20260904164811):** Issue #277 OPEN. Roadmap: M1 [x] (2ae1675d) -> M2 [x] (d5a344a) -> M3 [x] checklists (2c8f48b, packs vendored) but milestone header M3 [ ] until M4 closes -> M4 Modern UX & Direct Canvas Manipulation final `Closes #277` (Architect landed 6f5fd1e5 `ideas/2026-09-04-folio-m4-modern-ux-canvas.md` + progress M4 slices M4a/b/c). M4a [x] ingestion hardening + overlay pure core (dropzone clickable, drag guard, stale reset, import.meta.url worker, toast + OPFS fallback, overlay.js pdfToCss/cssToPdf + pageBox/canvasBox, 9/9 + 29 + 14 green) pushed at 6507d5b2; M4b [ ] canvas overlay (crop/place via M1/M2 ops) + M4c [ ] form overlays/bookmark tree/studio layout pending on this branch. Zero facades: raw-coordinate primaries removed except a11y <details> fallbacks.
 - **Merge capability verified this run:** main = 3d85366d LIVE (`gh api branches/main` = 3d85366d, `gh pr view 292 --json mergeable` = MERGEABLE CLEAN, `gh pr view 292 --json headRefOid` = 6507d5b2 on base main), branch head 6507d5b2 parent 6f5fd1e5 shares history with main (Architect rebased on 3d85366d before Blueprint), no `workflows permission` rejection (Folio docs-only diff project folio/), no orphan main, pages Deploy pending next main bump.

## STANDING OWNER DIRECTIVES (active)
 - **FOLIO M4 AUDIT DIRECTIVE (2026-09-04T16:44Z, supreme, via #277 comment):** 6 ingestion defects (unclickable dropzone index.html:73, window drag hazard, stale filepick.value, OPFS SecurityError in incognito opfs.js:37, worker path fragility app.js:233, unhandled ingestion promise rejections) + 4 UI mandates (eliminate raw coordinate textboxes + raw JSON filljson, interactive visual crop/placement on canvas, HTML form overlays, interactive bookmark outline tree, modern studio layout). Triggered /oc architect for M4. Binds Excellence in Craftsmanship Charter.
 - **EXCELLENCE IN CRAFTSMANSHIP CHARTER (2026-09-04T16:28Z, 3d85366d):** Dual-frontier standards ratified (research rigor + polished end-user products, anti-facade invariant, headless visual loop mandatory, tester dual-lens). Folio M4 applies this charter.
 - **FOLIO MILESTONE EPIC (2026-09-04T12:04Z, supreme, via #277 + 3caf426a + d5a344a + 2c8f48b -> 3d85366d):** Folio at /folio/ shipped M1-M3 but REOPENED for M4. Feature-matrix at `folio/docs/feature-matrix.md` remains binding, delivery via sequential `Refs #277` milestone PRs with zero facades, milestone PRs exempt from 2/day shipping limit. Final M4 PR uses `Closes #277`.
 - **CEILING ACCEPTANCE (2026-09-03T19:06Z, supreme, via #130):** Prism finished-at-ceiling (X6b 3.2175/9.6525, M2 1.6% M3 11.5%, 49+ mechanisms rejected). No more Research/Build on #130 or #226.
 - **TABULA SHIPPED (2026-09-04T03:57Z):** Tabula at /tabula/ SHIPPED at 23aeb5ce (PR #285 MERGED). Issue #282 CLOSED, on main 3d85366d lineage.
 - **SEXTANT SHIPPED (2026-09-04T09:52Z):** Sextant at /sextant/ SHIPPED at 1e06b5b (PR #287 MERGED). Issue #286 CLOSED, on main 3d85366d lineage.

## CRITICAL INFRASTRUCTURE STATE
 - **Folio M4 — PR #292 OPEN MERGEABLE/CLEAN at 6507d5b2 (Refs #277, branch opencode/issue277-20260904164811):** Architect 6f5fd1e5 blueprint + Builder M4a 6507d5b2 ingestion hardening + overlay pure core + shell scaffold. Progress on branch `progress/277-folio-client-side-pdf-studio.md` now tracks M4 (M4a [x], M4b [ ], M4c [ ]) as new final milestone. Build guard: folio-m4.test.js 9/9 green + existing 29 + 14 green verified by Builder comment; full headless visual loop + Playwright gates pending M4b/c. Body `Refs #277` correct (intermediate, Closes reserved for final M4). No workflow touches, so GITHUB_TOKEN merge allowed after dual-gate but PAT safe.
 - **Folio M3 — PR #291 MERGED at 2c8f48b head e00ad03e:** 9 commits over d5a344a - packs OCR/Office vendored same-origin, shell v3, 27 files project-only folio/, NOT orphan, MERGEABLE CLEAN before merge, body Closes #277 superseded by M4 Refs.
 - **Main 3d85366d — Lab Charter MERGED:** PR handling of 3d85366d via direct push (lab: establish Excellence in Craftsmanship Charter). Verified via gh api branches/main = 3d85366d, parent 2c8f48b is-ancestor true, git ls-tree origin/main:folio has packs/ocr+office, .github/agents charter present, pages Deploy success on 3d85366d.
 - **Build guard:** 1 open PR (`gh pr list --state open` = [292] at 6507d5b2), `gh issue list --state open` = [42 brainstorm, 70 lab-health, 277 Folio M4] (3 open). Last Reviewer 14:59:39Z + Tester 15:03:22Z on PR #291 now historical. Next gates for M4 after M4b/c land: Reviewer 14-checklist (incl. anti-facade + end-user perspective + headless visual loop) + Tester dual-lens (Playwright desktop 1280 + 390px, ingestion error toasts, OPFS fallback, viewer path, drag resilience, dropzone click, overlay commit through real M1/M2 ops).
 - **Pages:** Deploy static site `pages.yml` success on 3d85366d (folio/tabula/sextant + packs), preview /preview/pr-292/ deploying for this PR (action_required staged, PAT terminal sweep will approve), prior success 33895347728 on 3d85366d.

## IN FLIGHT
 - **Folio #277 M4 — Builder IN-PROGRESS on PR #292 at 6507d5b2 (Refs #277):** Architect dispatched 33896835409 -> blueprint merged as commit 6f5fd1e5 on branch -> Builder dispatched via /oc build this (run 33897129059 success architect + 33897266126 success build) -> M4a landed at 6507d5b2 with decision `{"action":"continue"}`. Owner /oc continue at 16:52:00Z triggered runs 33897503109/33897510660 both `cancelled` (no M4b progress). This run re-dispatches `{"action":"continue","pr":292}` (head 6507d5b2) for M4b canvas overlay (crop bbox + click/drag place for notes/shapes/links/stamps via M1/M2 ops) + M4c form overlays/bookmark tree/studio layout. Progress on branch shows Current step: M4 slice 1 landed, Builder continues M4b then M4c on this branch, final milestone PR uses Closes #277.
 - **Issue #277 — OPEN at 3d85366d (M4 in-progress):** Was CLOSED at 2c8f48b via PR #291 Closes #277, REOPENED at 16:44:40Z for M4. Stays OPEN with `Refs #277` until M4 final slice passes dual-gate and Maintainer merges with `Closes #277`.
 - **PR #292 — OPEN at 6507d5b2 — continue dispatched this run:** Body `Refs #277` (intermediate), head 6507d5b2 MERGEABLE/CLEAN NOT orphan, diff 8 files +575/-33 project-only folio/ + ideas/ + progress/, preview live. Awaiting Builder M4b/c completion, then Reviewer+Tester dual-gate.
 - **Issue #130 - CLOSED completed 2026-09-03T19:11Z (finished-at-ceiling)**
 - **Issue #226 - CLOSED completed (HALTED)**
 - **Issue #282 Tabula - CLOSED SHIPPED at 23aeb5ce (on 3d85366d)**
 - **Issue #286 Sextant - CLOSED SHIPPED at 1e06b5b (on 3d85366d)**
 - **PR #288 - MERGED at 2ae1675d (Folio M1, Refs #277)**
 - **PR #289 - MERGED at 3caf426a (Architect re-plan, Refs #277)**
 - **PR #290 - MERGED at d5a344a (Folio M2, Refs #277)**
 - **PR #291 - MERGED at 2c8f48b (Folio M3, Closes #277, 43/43, NOT orphan)**
 - **Brainstorm #42 - OPEN (frozen until Folio M4 completes, candidates Axiom/Plasmid parked)**
 - **Lab Health #70 - OPEN nominal**
 - **Issue #279 - CLOSED (Folio v1, MERGED e600927 auxiliary)**

## PIPELINE POSITION
 Prism ceiling accepted, Tabula + Sextant shipped on 3d85366d lineage, Folio Epic M1 [x] + M2 [x] + M3 [x] checklists shipped but REOPENED for M4 at 3d85366d per Excellence Charter audit. Architect completed 6f5fd1e5, Builder M4a done at 6507d5b2 on PR #292 (Refs #277). This run re-dispatched `continue` on PR #292 after cancelled continue triggers — pipeline advancing to M4b (placement-mode DOM wiring committing through M1/M2 ops) then M4c (form overlays, bookmark tree, studio layout) on same branch. Next: Builder M4b/c slices -> Reviewer 14-checklist + Tester dual-lens (Playwright screenshots, anti-facade commits) -> Maintainer merges PR #292 successor with `Closes #277` -> Pages deploy verify on new main.

## NEXT-RUN PLAYBOOK
 1. Verify Builder `continue` on PR #292 advances: `gh pr view 292 --json headRefOid,mergeable,state` head should advance beyond 6507d5b2 (M4b commits for crop/place via M1/M2 ops), `gh api repos/Userfrom1995/RandomLabs/contents/progress/277-folio-client-side-pdf-studio.md?ref=opencode/issue277-20260904164811 --jq .content | base64 -d | grep -E "M4b|M4c"` shows [x] progress, `gh pr list --state open` = [292] only.
 2. Verify issue #277 stays OPEN until final M4 slice: `gh api issues/277 --jq .state` = open, `progress` on main still in-progress until final merge (branch progress is source of truth for M4b/c).
 3. If Builder stalls 3 days, ping; if Builder completes M4b/c, dispatch `{"action":"review","pr":292}` for dual-gate (anti-facade + end-user perspective). If model/credits error appears, dispatch `lab` to switch to next free vision model (both knobs per AGENTS.md Two-Knob awareness).
 4. Verify no duplicate continue spam: only one `continue` should be in_progress/queued (cancel-in-progress false holds queue); if second maintainer run at 33897521257 also dispatches, it will queue harmlessly.

## ISSUES
 - **#130** - CLOSED (ceiling)
 - **#226** - CLOSED (HALTED)
 - **#278** - CLOSED (docs-refresh)
 - **#277** - OPEN for M4 (M1 MERGED 2ae1675d Refs #277, re-plan MERGED 3caf426a, M2 MERGED d5a344a, M3 MERGED 2c8f48b Closes #277 then REOPENED at 3d85366d for M4; Architect 6f5fd1e5 + Builder M4a 6507d5b2 on PR #292 at 6507d5b2 Refs #277, M4b/c pending)
 - **#279** - CLOSED (Folio v1, MERGED e600927 auxiliary)
 - **#282 Tabula** - CLOSED SHIPPED at 23aeb5ce (on 3d85366d)
 - **#286 Sextant - CLOSED SHIPPED at 1e06b5b (on 3d85366d)**
 - **PR #288 - MERGED at 2ae1675d (Folio M1, Refs #277)**
 - **PR #289 - MERGED at 3caf426a (Architect re-plan, a1accc5f, Reviewer 12:54:08Z + Tester 12:55:41Z, Refs #277, 2 files)**
 - **PR #290 - MERGED at d5a344a (Folio M2, Refs #277, Reviewer 13:12:23Z + Tester 13:15:44Z aabd77cc 29/29, 10 files, NOT orphan)**
 - **PR #291 - MERGED at 2c8f48b (Folio M3, Closes #277, Reviewer 14:59:39Z + Tester 15:03:22Z e00ad03e 43/43, 27 files, NOT orphan merge-base d5a344a)**
 - **PR #292 - OPEN at 6507d5b23dc050ae4152b54a300f29a4a7f7e001 (Folio M4 Architect 6f5fd1e5 + Builder M4a 6507d5b2, Refs #277, 8 files, MERGEABLE/CLEAN, preview live, continue dispatched 33897510757)**
 - **#42 - OPEN** brainstorm (frozen until Folio M4 completes)
 - **#70 - OPEN** lab-health

## OPEN QUESTIONS
 - Will Builder M4b complete crop bbox + click/drag place for all 5 placement modes committing through real M1/M2 ops without reintroducing raw-coordinate textboxes (only a11y <details> fallbacks)?
 - Will M4c form overlays + bookmark outline tree + studio layout (top bar/collapsible sidebar/centered viewport) pass anti-facade gate where every control commits bytes (verified via Playwright click/drag)?
 - Will Deploy on final M4 merge serve production `/folio/` + packs at 200 with no regression on M1-M3 (OCR/Office) packs?
 - Will next Auditor correctly report 3d85366d -> 6507d5b2 progression and Folio `progress` M4 in-progress (not falsely nominal)?

   - Hephaestus, the Maintainer
<!-- run: 33897510757 -->
