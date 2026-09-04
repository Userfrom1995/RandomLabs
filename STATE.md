# STATE - Random factory checkpoint
 - **Updated:** 2026-09-04T17:09Z, maintainer run 33899071269 (event `created` on PR #292 at 17:09:32Z owner /oc review - Folio M4 review dispatched)
 - **Action this run:** Dispatched `review` on PR #292 head 21fbcdf7 (Folio M4 complete, owner /oc review at 17:09:32Z matches builder M4c 21fbcdf7 Status complete).
 - **Main:** `3d85366d54ac5888cd7f98daf68ef7813b119fac` LIVE (successor to 2c8f48b via Lab Charter, `gh api branches/main --jq .commit.sha` = 3d85366d, `folio/` + `tabula/` + `sextant/` + `folio/packs/ocr/` 9,941,472 B + `folio/packs/office/` 1,516,461 B on main, progress on main M3 checklist but branch progress M4 complete, pages Deploy success on 3d85366d, no orphan main)
 - **Branch retention:** `opencode/issue277-20260904164811` at `21fbcdf77ce4ce3d3bef26533ff9a0fb2d7727a2` OPEN MERGEABLE/CLEAN at 21fbcdf7 (Architect 6f5fd1e5 + Builder M4a 6507d5b2 + Builder M4b 0f6ce9f6 + Builder M4c 21fbcdf7, Closes #277, NOT orphan on 3d85366d, 9 files modified/added, preview /preview/pr-292/ deploying), `opencode/issue277-folio-m3` at `e00ad03e` MERGED at 2c8f48b retained, `opencode/issue277-folio-m2` at `aabd77cc` MERGED at d5a344a retained, no branch deleted.

## STANDING OWNER DIRECTIVES (active)
 - **FOLIO M4 AUDIT DIRECTIVE (2026-09-04T16:44Z, supreme, via #277 comment):** 6 ingestion defects (unclickable dropzone index.html:73, window drag hazard, stale filepick.value, OPFS SecurityError in incognito opfs.js:37, worker path fragility app.js:233, unhandled ingestion promise rejections) + 4 UI mandates (eliminate raw coordinate textboxes + raw JSON filljson, interactive visual crop/placement on canvas, HTML form overlays, interactive bookmark outline tree, modern studio layout). Triggered /oc architect for M4. Binds Excellence in Craftsmanship Charter.
 - **EXCELLENCE IN CRAFTSMANSHIP CHARTER (2026-09-04T16:28Z, 3d85366d):** Dual-frontier standards ratified (research rigor + polished end-user products, anti-facade invariant, headless visual loop mandatory, tester dual-lens). Folio M4 applies this charter.
 - **FOLIO MILESTONE EPIC (2026-09-04T12:04Z, supreme, via #277 + 3caf426a + d5a344a + 2c8f48b -> 3d85366d):** Folio at /folio/ shipped M1-M3 but REOPENED for M4. Feature-matrix at `folio/docs/feature-matrix.md` remains binding, delivery via sequential `Refs #277` milestone PRs with zero facades, milestone PRs exempt from 2/day shipping limit. Final M4 PR uses `Closes #277`.
 - **CEILING ACCEPTANCE (2026-09-03T19:06Z, supreme, via #130):** Prism finished-at-ceiling (X6b 3.2175/9.6525, M2 1.6% M3 11.5%, 49+ mechanisms rejected). No more Research/Build on #130 or #226.
 - **TABULA SHIPPED (2026-09-04T03:57Z):** Tabula at /tabula/ SHIPPED at 23aeb5ce (PR #285 MERGED). Issue #282 CLOSED, on main 3d85366d lineage.
 - **SEXTANT SHIPPED (2026-09-04T09:52Z):** Sextant at /sextant/ SHIPPED at 1e06b5b (PR #287 MERGED). Issue #286 CLOSED, on main 3d85366d lineage.

## CRITICAL INFRASTRUCTURE STATE
 - **Folio M4 — PR #292 OPEN MERGEABLE/CLEAN at 21fbcdf7 (Closes #277, branch opencode/issue277-20260904164811):** Architect 6f5fd1e5 blueprint + Builder M4a 6507d5b2 + Builder M4b 0f6ce9f6 + Builder M4c 21fbcdf7 (placement toolbar 8 modes, persistent crop bbox with 8 handles via resizeBox/moveBox, commitPlace through M1/M2 ops, form overlays describeFields + #formlayer + #formlist, bookmark outline tree #bmtree/#bmtree-pages with tree-edit helpers, studio shell wireStudio, a11y <details> fallbacks, #croprow fix, ingestion hardening whole dropzone + window drag guard + OPFS fallback + import.meta.url worker + toast boundaries, overlay.js pure core). Progress on branch `progress/277-folio-client-side-pdf-studio.md` now `Status: complete, Active Milestone: M4 (complete, ready for review)` with M4a [x] pure-core [x] M4b [x] M4c [x] as final milestone. Build guard: folio-m4.test.js 15/15 + full 58/58 green verified by Builder comment at 17:09:27Z; headless visual loop + Playwright gates pending Reviewer. Body `Closes #277` correct (final milestone). No workflow touches, so GITHUB_TOKEN merge allowed after dual-gate but PAT safe.
 - **Folio M3 — PR #291 MERGED at 2c8f48b head e00ad03e:** 9 commits over d5a344a - packs OCR/Office vendored same-origin, shell v3, 27 files project-only folio/, NOT orphan, MERGEABLE CLEAN before merge, body Closes #277 superseded by M4 Refs then re-closed.
 - **Main 3d85366d — Lab Charter MERGED:** PR handling of 3d85366d via direct push (lab: establish Excellence in Craftsmanship Charter). Verified via gh api branches/main = 3d85366d, parent 2c8f48b is-ancestor true, git ls-tree origin/main:folio has packs/ocr+office, .github/agents charter present, pages Deploy success on 3d85366d.
 - **Build guard:** 1 open PR (`gh pr list --state open` = [292] at 21fbcdf7), `gh issue list --state open` = [42 brainstorm, 70 lab-health, 277 Folio M4] (3 open). Next gates for M4 after M4c land: Reviewer 14-checklist (incl. anti-facade + end-user perspective + headless visual loop) + Tester dual-lens (Playwright desktop 1280 + 390px, ingestion error toasts, OPFS fallback, viewer path, drag resilience, dropzone keyboard, overlay commit through real M1/M2 ops).
 - **Pages:** Deploy static site `pages.yml` success on 3d85366d (folio/tabula/sextant + packs), preview /preview/pr-292/ deploying for this PR (action_required staged, PAT terminal sweep will approve), prior success 33898306109 on 0f6ce9f6 branch PR trigger.

## IN FLIGHT
 - **Folio #277 M4 — Review DISPATCHED on PR #292 at 21fbcdf7 (Closes #277):** Architect dispatched 33896835409 -> blueprint 6f5fd1e5 -> Builder dispatched via /oc build this (run 33897129059 success architect + 33897266126 success M4a) -> M4a landed at 6507d5b2 -> continue dispatched 33897510757 -> M4b landed at 0f6ce9f6 (run 33897822440 success) -> continue dispatched 33898334312 -> M4c landed at 21fbcdf7 (run 33898592967 success, 2 commits 9455a465..21fbcdf7, 58/58 green, Status complete). Owner /oc review at 17:09:32Z triggered this maintainer run; no prior Reviewer run on 21fbcdf7, so dispatched `{"action":"review","pr":292,"head":"21fbcdf7"}` via decision.json. Pipeline advancing to Reviewer 14-checklist then Tester dual-lens before Maintainer merges with Closes #277.
 - **Issue #277 — OPEN at 3d85366d (M4 ready for review):** Was CLOSED at 2c8f48b via PR #291 Closes #277, REOPENED at 16:44:40Z for M4. Stays OPEN with Closes #277 on PR #292 until final M4 passes dual-gate and Maintainer merges.
 - **PR #292 — OPEN at 21fbcdf7 — review dispatched this run:** Body `Closes #277` (final milestone), head 21fbcdf7 MERGEABLE/CLEAN NOT orphan, diff 9 files project-only folio/ + ideas/ + progress/, preview live. Awaiting Reviewer verdict, then Tester.
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
 Prism ceiling accepted, Tabula + Sextant shipped on 3d85366d lineage, Folio Epic M1 [x] + M2 [x] + M3 [x] shipped but REOPENED for M4 at 3d85366d per Excellence Charter audit. Architect completed 6f5fd1e5, Builder M4a/b/c done at 21fbcdf7 on PR #292 (Closes #277). This run dispatched `review` on PR #292 head 21fbcdf7 after Builder M4c Status complete — pipeline advancing to Reviewer 14-checklist + Tester dual-lens (Playwright screenshots, anti-facade commits) -> Maintainer merges PR #292 successor with `Closes #277` -> Pages deploy verify on new main.
## NEXT-RUN PLAYBOOK
 1. Verify Reviewer on PR #292 head 21fbcdf7: `gh api repos/Userfrom1995/RandomLabs/actions/runs --jq '.workflow_runs[] | select(.name=="opencode-review")'` should show completed success with `/oc approve` or `/oc fix: ...` with file:line. If approve, dispatch Tester `{"action":"test","pr":292}` next run if not auto-forwarded.
 2. Verify issue #277 stays OPEN until final M4 merge: `gh api issues/277 --jq .state` = open, `gh pr view 292 --json body --jq .body` = Closes #277 final milestone, `progress` on branch Status complete.
 3. If Reviewer requests fixes, dispatch `{"action":"fix","pr":292}` with exact file:line citations; if Tester fails, dispatch fix with repro logs. If model/credits error appears, dispatch `lab` to switch to next free vision model (both knobs per Two-Knob awareness).
 4. Verify no duplicate review spam: only one `review` should be in_progress/queued on 21fbcdf7 (cancel-in-progress false holds queue); check `gh run list --limit 20`.

## ISSUES
 - **#130** - CLOSED (ceiling)
 - **#226** - CLOSED (HALTED)
 - **#278** - CLOSED (docs-refresh)
 - **#277** - OPEN for M4 (M1 MERGED 2ae1675d Refs #277, re-plan MERGED 3caf426a, M2 MERGED d5a344a, M3 MERGED 2c8f48b Closes #277 then REOPENED at 3d85366d for M4; Architect 6f5fd1e5 + Builder M4a 6507d5b2 + M4b 0f6ce9f6 + M4c 21fbcdf7 on PR #292 at 21fbcdf7 Closes #277, Status complete, ready for review)
 - **#279** - CLOSED (Folio v1, MERGED e600927 auxiliary)
 - **#282 Tabula** - CLOSED SHIPPED at 23aeb5ce (on 3d85366d)
 - **#286 Sextant - CLOSED SHIPPED at 1e06b5b (on 3d85366d)**
 - **PR #288 - MERGED at 2ae1675d (Folio M1, Refs #277)**
 - **PR #289 - MERGED at 3caf426a (Architect re-plan, a1accc5f, Reviewer 12:54:08Z + Tester 12:55:41Z, Refs #277, 2 files)**
 - **PR #290 - MERGED at d5a344a (Folio M2, Refs #277, Reviewer 13:12:23Z + Tester 13:15:44Z aabd77cc 29/29, 10 files, NOT orphan)**
 - **PR #291 - MERGED at 2c8f48b (Folio M3, Closes #277, Reviewer 14:59:39Z + Tester 15:03:22Z e00ad03e 43/43, 27 files, NOT orphan merge-base d5a344a)**
 - **PR #292 - OPEN at 21fbcdf77ce4ce3d3bef26533ff9a0fb2d7727a2 (Folio M4 Architect 6f5fd1e5 + Builder M4a 6507d5b2 + Builder M4b 0f6ce9f6 + Builder M4c 21fbcdf7, Closes #277, 9 files, MERGEABLE/CLEAN, preview live, review dispatched 33899071269)**
 - **#42 - OPEN** brainstorm (frozen until Folio M4 completes)
 - **#70 - OPEN** lab-health

## OPEN QUESTIONS
 - Will Reviewer approve 21fbcdf7 14-checklist (overlay math roundtrip, placement commits through real M1/M2 ops not theater, a11y details preserved, no raw-coordinate primaries, form overlay per-field fillForm, bookmark tree serialize with drag reorder, studio shell) with headless visual loop?
 - Will Tester dual-lens reproduce 58/58 node + headless Chromium desktop 1280 + 390px zero pageerrors + Playwright drag/resize overlay commits + ingestion toasts + OPFS fallback before final Closes #277 merge?
 - Will Deploy on final M4 merge serve production `/folio/` + packs at 200 with no regression on M1-M3 (OCR/Office) packs?
 - Will next Auditor correctly report 3d85366d -> 21fbcdf7 progression and Folio `progress` M4 Status complete not falsely nominal?

   - Hephaestus, the Maintainer
<!-- run: 33899071269 -->
