# STATE - Random factory checkpoint
 - **Updated:** 2026-09-04T16:44Z, maintainer run 33896835409 (event `created` on #277 at 16:44:40Z owner audit /oc architect - Folio M4)
 - **Action this run:** Dispatched Architect on #277 for Milestone 4 Modern UX & Direct Canvas Manipulation (owner audit 16:44:40Z, Refs #277, 6 ingestion defects + 4 visual-manipulation mandates, dropzone/OPFS/worker/error-boundary hardening, studio layout, interactive crop/place/forms/bookmarks, zero facades).
 - **Main:** `3d85366d54ac5888cd7f98daf68ef7813b119fac` LIVE (successor to 2c8f48b via Lab Charter `lab: establish Excellence in Craftsmanship Charter`, `git ls-remote origin/main` = 3d85366d, `git ls-tree origin/main` has folio/ + tabula/ + sextant/ + folio/packs/ocr/ 9,941,472 B + folio/packs/office/ 1,516,461 B, progress/277-folio-client-side-pdf-studio.md M1 [x] M2 [x] M3 [x] checklists complete but milestone header M3 [ ] in-progress until Maintainer merges final M4; issue #277 REOPENED OPEN at 16:44:40Z, no PR branches deleted, pages Deploy 33895347728 success on 3d85366d)
 - **Branch retention:** `opencode/issue277-folio-m3` at `e00ad03ebf86f78388fa73dd257d72c319c845b9` MERGED at 2c8f48b (Folio M3 Closes #277, 9 commits, 27 files, NOT orphan merge-base d5a344a, retained per #148), `opencode/issue277-folio-m2` at `aabd77cc` MERGED at d5a344a (Folio M2 Refs #277, 10 files, merge-base 3caf426a NOT orphan, retained), `opencode/issue277-20260904122522` at `a1accc5f` MERGED at 3caf426a (Architect re-plan Refs #277), `opencode/issue277-20260904120709` at `a4b434e` MERGED at 2ae1675d (Folio M1 Refs #277), `opencode/issue282-20260903222718` at `c602b3d` retained (Tabula PR #285 MERGED at 23aeb5ce), `opencode/issue286-20260904084331` at `e318c95` retained (Sextant), no `opencode/issue277-folio-m4` yet (Architect to create).
 - **Folio — Milestone Epic REOPENED for M4 at 3d85366d (2026-09-04T16:44Z):** Issue #277 REOPENED OPEN after M3 merge (owner audit finds 6 ingestion/runtime defects + 4 UI/UX antipatterns). Roadmap: M1 Clean Core & Visual Grid (merged 2ae1675d) -> M2 AcroForms & Vector Markup (merged d5a344a) -> M3 WASM OCR & Converters (merged 2c8f48b, Closes #277, 43/43 suites, packs vendored) -> M4 Modern UX & Direct Canvas Manipulation (Architect dispatched this run, interactive crop/placement, form overlays, outline tree, studio layout, ingestion hardening, Refs #277, zero facades). Feature-matrix `folio/docs/feature-matrix.md` remains binding contract.
 - **Merge capability verified this run:** main = 3d85366d LIVE (is-ancestor 2c8f48b..3d85366d true, `git merge-base origin/main e00ad03e` = d5a344a NOT orphan, `git ls-remote origin/main` = 3d85366d, `gh api repos/Userfrom1995/RandomLabs/contents/folio --ref main` 200, pages Deploy 33895347728 success on 3d85366d, no `workflows permission` rejection, no orphan main, branch retention per #148).

## STANDING OWNER DIRECTIVES (active)
 - **FOLIO M4 AUDIT DIRECTIVE (2026-09-04T16:44Z, supreme, via #277 comment):** Elevate Folio to next-level excellence. 6 ingestion defects (unclickable dropzone `index.html:73`, window drag hazard, stale filepick.value, OPFS SecurityError in incognito `opfs.js:37`, worker path fragility `app.js:233`, unhandled ingestion promise rejections) + 4 UI mandates (eliminate raw coordinate textboxes ext-crop/notexy/shapexy/linkrect/imgxy/fldrect + raw JSON filljson, interactive visual crop/placement on canvas, HTML form overlays, interactive bookmark outline tree, modern studio layout with top bar/collapsible sidebar/centered viewport). Triggered `/oc architect` for M4. Binds Excellence in Craftsmanship Charter (dual-frontier, end-user perspective, no developer-harness textareas).
 - **EXCELLENCE IN CRAFTSMANSHIP CHARTER (2026-09-04T16:28Z, 3d85366d):** Dual-frontier standards ratified (research rigor + polished end-user products, anti-facade invariant, headless visual loop mandatory, tester dual-lens). Folio audit applies this charter to M4.
 - **FOLIO MILESTONE EPIC (2026-09-04T12:04Z, supreme, via #277 + 3caf426a + d5a344a + 2c8f48b -> 3d85366d):** Folio at /folio/ shipped M1-M3 at 2c8f48b but now REOPENED for M4. Feature-matrix at `folio/docs/feature-matrix.md` remains binding, delivery via sequential `Refs #277` milestone PRs with zero facades, milestone PRs exempt from 2/day shipping limit.
 - **CEILING ACCEPTANCE (2026-09-03T19:06Z, supreme, via #130):** Prism finished-at-ceiling (X6b 3.2175/9.6525, M2 1.6% M3 11.5%, 49+ mechanisms rejected). No more Research/Build on #130 or #226.
 - **TABULA SHIPPED (2026-09-04T03:57Z):** Tabula at /tabula/ SHIPPED at 23aeb5ce (PR #285 MERGED). Issue #282 CLOSED, on main 3d85366d lineage.
 - **SEXTANT SHIPPED (2026-09-04T09:52Z):** Sextant at /sextant/ SHIPPED at 1e06b5b (PR #287 MERGED). Issue #286 CLOSED, on main 3d85366d lineage.

## CRITICAL INFRASTRUCTURE STATE
 - **Folio — REOPENED M4 pending Architect at 3d85366d (2026-09-04T16:44Z):** Issue #277 OPEN (reopened by owner audit after M3 Closes #277). Progress `progress/277-folio-client-side-pdf-studio.md` on main still header Status in-progress / Active Milestone M3 Complete ready for review with M1 [x] M2 [x] M3 [ ] (checklists [x] but final milestone box unchecked, file predates M4 audit). Nextitect will update progress to M4 roadmap (ingestion hardening + visual manipulation slices) and keep Status in-progress with Refs #277 until M4 gates pass. Packs still vendored same-origin 9.94 MB + 1.51 MB, core bundle <2 MB intact.
 - **Folio M3 — PR #291 MERGED at 2c8f48b head e00ad03e:** 9 commits over d5a344a - packs OCR/Office vendored same-origin consent-gated + pure core + executors, shell v3. Diff 27 files project-only folio/, zero workflows, NOT orphan merge-base d5a344a, MERGEABLE CLEAN before merge, body Closes #277 correct for M3 but now superseded by M4 Refs #277; branch retained per #148.
 - **Main 3d85366d — Lab Charter MERGED:** PR handling of `3d85366d` via direct push (lab: establish Excellence in Craftsmanship Charter, docs + agent prompts charter codification). Verified `git ls-remote origin/main` = 3d85366d, parent 2c8f48b is-ancestor true, `git ls-tree origin/main:folio` has packs/ocr+office, `git ls-tree origin/main:.github/agents` charter present, pages Deploy 33895347728 success on 3d85366d.
 - **Build guard:** No open PRs (`gh pr list --state open` = []), `gh issue list --state open` = [42 brainstorm, 70 lab-health, 277 Folio M4] (3 open). Last Reviewer 14:59:39Z approve + Tester 15:03:22Z approve-test on PR #291 (43/43) now historical for M3. Next gates for M4: Reviewer 14-checklist (incl. anti-facade + end-user perspective + headless visual loop) + Tester dual-lens (Playwright desktop 1280 + 390px, ingestion error toasts, OPFS fallback, viwer path, drag resilience, dropzone click).
 - **Pages:** Deploy static site `pages.yml` `success` 33895347728 on 3d85366d (folio/tabula/sextant + packs), prior 33887544048/33887434138 success on 2c8f48b, no failure, preview infra intact.

## IN FLIGHT
 - **Folio #277 M4 — Architect DISPATCHED at 3d85366d (Refs #277):** Owner audit 16:44:40Z identifies 6 ingestion + 4 UX gaps; decision `{"action":"architect","issue":277}` dispatched this run. Expect `progress/277-folio-client-side-pdf-studio.md` M4 slices (M4a ingestion hardening, M4b visual crop/placement + form overlays, M4c outline tree + studio layout) with headless visual loop + perf scoreboard (time-to-first-page, 100-page merge, OCR sec/page, bundle sizes) preserved.
 - **Issue #277 — REOPENED OPEN at 3d85366d (2026-09-04T16:44Z):** Was CLOSED SHIPPED at 2c8f48b (15:04Z via PR #291 Closes #277), now OPEN per owner audit directive for M4. Will stay OPEN with `Refs #277` until M4 final slice passes dual-gate and Maintainer merges with `Closes #277` (or final Refs chain close).
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
 Prism ceiling accepted, Tabula + Sextant shipped on 3d85366d lineage, Folio Epic M1 [x] + M2 [x] + M3 [x] checklists shipped at 2c8f48b but REOPENED for M4 at 3d85366d per Excellence Charter audit (dropzone/OPFS/worker/error boundaries + direct canvas manipulation). No open PRs. Architect dispatched on #277 for M4 blueprint (ingestion hardening + visual manipulation + studio layout, headless visual loop mandatory). Next: Architect PR -> Reviewer 14-checklist -> Build M4 slices (Refs #277) -> Reviewer+Tester dual-gate (Playwright screenshots) -> Maintainer merge final M4 with Closes #277 -> Pages deploy verify.

## NEXT-RUN PLAYBOOK
 1. Verify Architect on #277 advances: `gh pr list --state open --json number,headRefName,title,body` shows PR with `folio/docs/` blueprint + `progress/277-folio-client-side-pdf-studio.md` M4 slices, milestone branch `opencode/issue277-folio-m4` or `m1` sub-branch, body `Refs #277`.
 2. Verify issue #277 stays OPEN until Architect + Builder M4 final slice: `gh api issues/277 --jq .state` = open, `git show origin/main:progress/277-folio-client-side-pdf-studio.md | grep -E "M4|Status"` shows in-progress.
 3. Verify no open PRs beyond Architect M4: `gh pr list --state open` = [Architect PR] only, `gh issue list --state open` = [42,70,277].
 4. If Architect stalls 3 days, ping; if Build ready, dispatch `{"action":"build","issue":277}` or `{"action":"continue","pr":N}` per progress. If model/credits error appears, dispatch `lab` to switch to next free vision model (both knobs).

## ISSUES
 - **#130** - CLOSED (ceiling)
 - **#226** - CLOSED (HALTED)
 - **#278** - CLOSED (docs-refresh)
 - **#277** - REOPENED OPEN at 3d85366d for M4 (Folio Epic M1 MERGED 2ae1675d Refs #277, re-plan MERGED 3caf426a Refs #277, M2 MERGED d5a344a Refs #277 10 files, M3 MERGED 2c8f48b Closes #277 27 files 9 commits 43/43, then Lab Charter 3d85366d, now M4 audit 16:44:40Z Refs #277 pending Architect: dropzone/OPFS/worker/error-boundary + visual crop/placement/forms/bookmarks + studio layout)
 - **#279** - CLOSED (Folio v1, MERGED e600927 auxiliary)
 - **#282 Tabula** - CLOSED SHIPPED at 23aeb5ce (on 3d85366d)
 - **#286 Sextant - CLOSED SHIPPED at 1e06b5b (on 3d85366d)**
 - **PR #288 - MERGED at 2ae1675d (Folio M1, Refs #277)**
 - **PR #289 - MERGED at 3caf426a (Architect re-plan, a1accc5f, Reviewer 12:54:08Z + Tester 12:55:41Z, Refs #277, 2 files, blueprint F1-F8)**
 - **PR #290 - MERGED at d5a344a (Folio M2, Refs #277, Reviewer 13:12:23Z + Tester 13:15:44Z aabd77cc 29/29, 10 files, NOT orphan)**
 - **PR #291 - MERGED at 2c8f48b (Folio M3, Closes #277, Reviewer 14:59:39Z + Tester 15:03:22Z e00ad03e 43/43, 27 files, NOT orphan merge-base d5a344a)**
 - **#42 - OPEN** brainstorm (Sextant shipped, Axiom/Plasmid parked, frozen until Folio M4 completes)
 - **#70 - OPEN** lab-health

## OPEN QUESTIONS
 - Will Architect blueprint M4 as sequential vertical slices (ingestion hardening first, then visual manipulation, then studio layout) with zero facades and headless visual loop gates defined?
 - Will Builder execute M4 without reintroducing raw-coordinate textboxes or JSON textareas, replacing each with canvas overlays and form overlays verified by Playwright click/drag?
 - Will Deploy on next M4 merge serve production `/folio/` + packs at 200 with no regression on existing M1-M3 packs?
 - Will next Auditor correctly report 3d85366d charter live and Folio `progress` M4 in-progress (not falsely nominal)?

   - Hephaestus, the Maintainer
<!-- run: 33896835409 -->
