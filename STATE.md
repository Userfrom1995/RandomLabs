# STATE - Random factory checkpoint
 - **Updated:** 2026-09-04T13:00Z, maintainer run 33875285676 (event `created` on PR #289, owner `/oc maintainer` — MERGED 289 at 3caf426a, dispatched M2)
 - **Action this run:** Merged PR #289 `a1accc5f` -> `3caf426ac90e65b9d9cbc6f86a2b56b6ba7e7ceb` via `gh pr merge 289 --rebase` (Refs #277, 2 files, dual-gate Reviewer 12:54:08Z + Tester 12:55:41Z, NOT orphan merge-base 2ae1675d, plan-only, F1-F8 purge map preserved, M1 [x] kept). Verified `git ls-remote origin/main` = 3caf426a, NOT orphan.
 - **Main:** `3caf426ac90e65b9d9cbc6f86a2b56b6ba7e7ceb` LIVE (NOT orphan, `git ls-remote origin/main` = 3caf426a, `gh api branches/main` = 3caf426a, successor to 2ae1675d via rebase of PR #289, contains `sextant/` + `tabula/` + `folio/` + `folio/tests/tester-m1-regression` + `ideas/2026-09-03-folio-client-side-pdf-studio.md` Milestone Epic re-plan (F1-F8), verified `git ls-tree origin/main` has folio/ and .gitignore node_modules/ but zero tracked node_modules, Deploy on 2ae1675 33875151413 success, Deploy on 3caf426 pending push trigger)
 - **Branch retention:** `opencode/issue277-20260904120709` at `a4b434e` MERGED at 2ae1675 (Folio M1 Refs #277, 6 commits, 38 files, merge-base 4ae6a172, 0 node_modules), `opencode/issue277-20260904122522` at `a1accc5f` MERGED at 3caf426a (Architect re-plan Refs #277, 2 files, merge-base 2ae1675d, F1-F8 purge map, progress M1 [x] kept), `opencode/issue277-folio-m2` at `c2b3d94` OPEN (M2 start progress retargeted, 1 commit, merge-base 2ae1675d, 1 behind 3caf426a, will rebase), `opencode/issue282-20260903222718` at `c602b3d` retained (Tabula PR #285 MERGED at 23aeb5ce), `opencode/issue286-20260904084331` at `a81a914` retained (Sextant PR #287 MERGED at 1e06b5b), `opencode/issue277-20260903191417` at `fba96f3` retained (Folio v1 PR #279 MERGED at e600927->1e06b5b lineage), no PR branches deleted.

## STANDING OWNER DIRECTIVES (active)
 - **CEILING ACCEPTANCE (2026-09-03T19:06Z, supreme, via #130):** Accepting the ceiling and closing Prism as finished-at-ceiling (X6b 3.2175/9.6525, M2 1.6% M3 11.5%, 49+ mechanisms rejected). No more Research/Build on #130 or #226.
 - **FOLIO MILESTONE EPIC (2026-09-04T12:04Z, supreme, via #277 + 2ae1675):** Folio at /folio/ REOPENED as Autonomous Milestone Epic (supersedes 2026-09-03 shipped). Roadmap: M1 Clean Core & Visual Page Grid (purge 8 stubs, merge/split/rotate/delete/reorder/extract, drag-drop grid, Playwright + parser roundtrips) -> M2 AcroForms + Vector Markup -> M3 WASM OCR + Converters. Anti-Facade Guard enforced (no mock buttons, white-box or regex tricks). Protocol live in LAB.md/AGENTS.md/.github/agents, main at 3caf426a (progress M1 [x] complete, blueprint F1-F8 on main).
 - **TABULA SHIPPED (2026-09-04T03:57Z):** Tabula at /tabula/ SHIPPED at 23aeb5ce (PR #285 MERGED, dual-gate). Issue #282 CLOSED, on main 3caf426a lineage, daily 1/2 on 2026-09-04.
 - **SEXTANT SHIPPED (2026-09-04T09:52Z):** Sextant at /sextant/ SHIPPED at 1e06b5b (PR #287 MERGED, dual-gate, Closes #286). Issue #286 CLOSED, on main 3caf426a lineage, daily 2/2 on 2026-09-04 - milestone PRs exempt per 4ae6a172.
 - **HALT NEURAL TRACK (2026-09-02T10:39:54Z, supreme):** Do not pursue neural path for M2/M3.
 - **SEXTANT NEXT (2026-09-04T04:02Z):** Sextant C# GIS picked from Ideator 04:02:10Z batch — now SHIPPED at 1e06b5b. Parked: Axiom, Plasmid + long list.

## MERGE CAPABILITY (verified this run)
 - main = `3caf426ac90e65b9d9cbc6f86a2b56b6ba7e7ceb` LIVE (NOT orphan, merge-base 2ae1675d ancestor via b0461a8->9b0d41e->23aeb5ce->b5347d2->1e06b5b->4ae6a172->2ae1675d->3caf426a chain, `git ls-remote` = 3caf426a, successor via rebase of PR #289 2 files, `git ls-tree origin/main` has sextant/ + tabula/ + folio/ + ideas purge map)
 - PR #289 `a1accc5f` MERGED at 3caf426a (NOT orphan, merge-base 2ae1675d, 2 files ideas 85-line purge-map F1-F8 + progress M1 [x] kept, body Refs #277 correct, dual-gate 12:54:08Z 16-checklist + 12:55:41Z approve-test)
 - PR #288 `a4b434e` MERGED at 2ae1675d (NOT orphan, merge-base 4ae6a172, 6 commits, 38 files 0 node_modules, body Refs #277 correct, dual-gate re-verified)
 - No `workflows permission` rejection, no orphan main, `recover/287` tag retained, `opencode/issue277-folio-m2` at c2b3d94 1 behind 3caf426a but NOT orphan (merge-base 2ae1675d).

## CRITICAL INFRASTRUCTURE STATE
 - **Folio — Milestone Epic M1+M2 plan SHIPPED at 3caf426a (2026-09-04T13:00Z):** Issue #277 OPEN, PR #289 `a1accc5f` MERGED at 3caf426a as Refs #277 (2 files, blueprint F1-F8 8-facade file-level purge map, progress M1 [x] Complete merged as 2ae1675d preserved). Progress `progress/277-folio-client-side-pdf-studio.md` on main Status in-progress M1 [x] Complete ready for M2, M3 queued.
 - **Folio M2 NEXT — BUILD DISPATCHED at 3caf426a:** Branch `opencode/issue277-folio-m2` at `c2b3d94` OPEN (builder: start Folio M2 progress retargeted 15+10, M2 Active, merge-base 2ae1675d, 1 behind 3caf426a will rebase). Dispatched `{"action":"build","issue":277}` to continue M2 (AcroForms + Vector Markup: Ink/Square/Circle/Line as real annot objects, quad-aware bake v2, forms roundtrip hardening 5 kinds, UI bake-all + subtype delete filter). Exempt from 2/day cap (milestone PR).
 - **Sextant — SHIPPED at 1e06b5b (now on 3caf426a):** Issue #286 CLOSED, `sextant/` live on main 3caf426a.
 - **Tabula — SHIPPED at 23aeb5ce (now on 3caf426a):** Issue #282 CLOSED, `tabula/` live on main 3caf426a.
 - **Build guard:** `opencode-review` 33875140161 approve on a1accc5f + `opencode-test` 33875214896 approve-test on a1accc5f (plan-only), `maintainer` 33875285676 this run merged 289, next `opencode` build pending on #277, `cancel-in-progress: false` holding, no orphan.
 - **Pages:** Deploy on main 2ae1675 33875151413 success, Deploy on PR 289 a1accc5 33875131834 success (preview /preview/pr-289/ live). Deploy on 3caf426a auto-trigger via push (pull_request closed trigger + push branches main); will verify next run and `gh workflow run pages.yml --ref main` if missing, preview promotion to production `/folio/` without node_modules.

## IN FLIGHT
 - **Folio #277/PR #289 - ARCHITECT RE-PLAN MERGED at 3caf426a:** CLOSED-MERGED at a1accc5f (Refs #277, 2 files, Reviewer 12:54:08Z 16-checklist + Tester 12:55:41Z approve-test, Fixer rebase kept M1 [x], no workflow touches, merged via rebase)
 - **Folio #277 M2 NEXT — IN BUILD on opencode/issue277-folio-m2:** Branch c2b3d94 progress M2 in-progress, dispatched build on #277 (Refs #277, pdf-lib Form + vector ink, vendored WASM consent gates, 0 stubs)
 - **Issue #130 - CLOSED completed 2026-09-03T19:11Z (finished-at-ceiling)**
 - **Issue #226 - CLOSED completed (HALTED)**
 - **Issue #282 Tabula - CLOSED SHIPPED at 23aeb5ce (on 3caf426a)**
 - **Issue #286 Sextant - CLOSED SHIPPED at 1e06b5b (on 3caf426a)**
 - **PR #288 - MERGED at 2ae1675d (Folio M1, Refs #277, anti-facade dual-gate re-verified)**
 - **PR #289 - MERGED at 3caf426a (Folio M1/M2/M3 re-plan, Refs #277, dual-gate plan-only, blueprint F1-F8)**
 - **Brainstorm #42 - OPEN (Axiom + Plasmid parked, frozen until Folio epic completes M3)**
 - **Lab Health #70 - OPEN nominal**
 - **Issue #279 - CLOSED (Folio v1, MERGED e600927, auxiliary to #277 epic, no action)**

## PIPELINE POSITION
 Prism ceiling accepted, Tabula + Sextant shipped on 3caf426a (folio/ live), Folio Epic M1 SHIPPED at 2ae1675d + re-plan MERGED at 3caf426a (M1 [x] preserved, F1-F8 purge map F1-F8 on main, 0 node_modules). Tester 33875214896 approve-test on a1accc5f allowed merge as Refs #277. Now auto-chaining M2 AcroForms + Vector Markup on opencode/issue277-folio-m2 (branch c2b3d94 progress M2, 1 behind 3caf426a). Next: Builder continues M2 with real annot objects + quad-aware bake + forms roundtrip, then Reviewer anti-facade + Tester adversarial (unit + Playwright 1280+390 zero JS errors) before Refs #277 merge -> M3.

## NEXT-RUN PLAYBOOK
 1. Verify Deploy on 3caf426a via `gh run list --workflow pages.yml` + `git ls-tree origin/main` has folio/tabula/sextant and 0 node_modules; if missing trigger `gh workflow run pages.yml --ref main`.
 2. Verify Builder on #277 continues `opencode/issue277-folio-m2` (rebase onto 3caf426a, pdf-lib Form APIs for 5 kinds, Ink/Square/Circle/Line as real annot objects via pdfLib.PDFAnnotation subtype, RDP simplify only in ink path, QuadPoints for Highlight/Underline/StrikeOut/Ink/Square/Circle/Line, no content-burn, no white-box, no workflow touches), `git merge-base origin/main <M2-head>` exists (NOT orphan).
 3. After M2 PR opens, Reviewer 16-checklist anti-facade (F1-F8 purge map, zero stubs, zero disabled controls, embedPdf indices real, viewer pdf.mjs path real, gridDropOrder pure + reorderPages byte-restore) + Tester adversarial (unit 14/14 + M2 suites, node E2E roundtrips + pdf.js content parse, Playwright desktop+mobile zero JS errors, bake/delete/filter) before Refs #277 merge.
 4. After M2 merges, auto-chain M3 WASM OCR via `{"action":"build","issue":277}` until `Closes #277`.

## ISSUES
 - **#130** - CLOSED (ceiling)
 - **#226** - CLOSED (HALTED)
 - **#278** - CLOSED (docs-refresh)
 - **#277** - OPEN REOPENED MILESTONE EPIC at 3caf426a (Folio M1 MERGED 2ae1675d Refs #277 38 files, re-plan MERGED 3caf426a Refs #277 2 files F1-F8, M2 in build on folio-m2 c2b3d94)
 - **#279** - CLOSED (Folio v1, MERGED e600927 auxiliary, no action)
 - **#282 Tabula** - CLOSED SHIPPED at 23aeb5ce (on 3caf426a)
 - **#286 Sextant - CLOSED SHIPPED at 1e06b5b (on 3caf426a)**
 - **PR #288 - MERGED at 2ae1675d (Folio M1, Refs #277, dual-gate re-verified, pollution purged)**
 - **PR #289 - MERGED at 3caf426a (Architect re-plan, a1accc5f, Reviewer 12:54:08Z + Tester 12:55:41Z, Refs #277, 2 files, blueprint F1-F8)**
 - **#42 - OPEN** brainstorm (Sextant shipped, Axiom/Plasmid parked, frozen until Folio epic)
 - **#70 - OPEN** lab-health

## OPEN QUESTIONS
 - Will Deploy on 3caf426a succeed via push trigger and serve `/folio/` + `/tabula/` + `preview/pr-289/` promotion without node_modules?
 - Will Builder on folio-m2 rebase onto 3caf426a cleanly and implement Ink/Square/Circle/Line as real annot objects + quad-aware bake v2 + forms 5-kind roundtrip without stubs, passing Reviewer anti-facade?
 - Will M2 pass Tester adversarial (unit + Playwright 1280+390 zero JS errors, bake/delete) before Refs #277 merge -> auto-chain M3 WASM until Closes #277?

   - Hephaestus, the Maintainer
<!-- run: 33875285676 -->
