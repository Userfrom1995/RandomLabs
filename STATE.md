# STATE - Random factory checkpoint
 - **Updated:** 2026-09-04T22:14Z, maintainer run 33924656500 (event `schedule` at 22:14:26Z - standby verification)
 - **Action this run:** Standby verification — main 0944bb63 LIVE (Folio M4 Closes #277 SHIPPED, Tabula 23aeb5ce + Sextant 1e06b5b on lineage, pages Deploy success), 0 open PRs, 2 open issues (42 brainstorm, 70 lab-health). No dispatch — lab standby per charter (no auto-ideation).
 - **Main:** `0944bb63a20db02f1c24a7076d543d28d8fc9de8` LIVE (successor to 3d85366d via rebase, `gh api branches/main --jq .commit.sha` = 0944bb63, `git merge-base origin/main 3d85366d` = 3d85366d NOT orphan, `folio/` + `tabula/` + `sextant/` + `folio/packs/ocr/` + `folio/packs/office/` on main, 9 commits over 3d85366d: 4199da17 + 6ef43827 + de6be23a + 1bd121bc + c7af6d87 + 9d632732 + c6ef9e43 + 6639df3c + 0944bb63, pages Deploy success on 0944bb63 verified 17:15:47Z + 17:16:52Z)
 - **Branch retention:** `opencode/issue277-20260904164811` at `bf67b253cabac01dadaa2b0322b1eddb1fb08651` MERGED at 0944bb63 retained (Architect 4199da17 + Builder M4a 6ef43827 + Builder M4b de6be23a..9d632732 + Builder M4c c6ef9e43..6639df3c + Tester bf67b253, Closes #277, NOT orphan on 3d85366d, 10 files modified/added, preview /preview/pr-292/ deployed), `opencode/issue277-folio-m3` at `e00ad03e` MERGED at 2c8f48b retained, `opencode/issue277-folio-m2` at `aabd77cc` MERGED at d5a344a retained, `opencode/issue286-20260904084331` at `1e06b5b3` MERGED at 1e06b5b retained (25 commits researcher->tester, Sextant shipped), no branch deleted.

## STANDING OWNER DIRECTIVES (active)
 - **FOLIO M4 AUDIT DIRECTIVE (2026-09-04T16:44Z, supreme, via #277 comment):** 6 ingestion defects + 4 UI mandates — RESOLVED at 0944bb63 (whole dropzone clickable + window drag guard + stale filepick reset + OPFS SecurityError fallback + import.meta.url worker + setFile toast; overlay system pdfToCss/cssToPdf pure math, placement toolbar 8 modes, persistent crop bbox, form overlays, bookmark outline tree, studio layout). Anti-facade gates passed.
 - **EXCELLENCE IN CRAFTSMANSHIP CHARTER (2026-09-04T16:28Z, 3d85366d -> 0944bb63):** Dual-frontier standards ratified and verified on M4 (anti-facade invariant, headless visual loop, dual-lens Tester).
 - **FOLIO MILESTONE EPIC (2026-09-04T12:04Z, supreme, via #277 + 3caf426a + d5a344a + 2c8f48b -> 3d85366d -> 0944bb63):** Folio at /folio/ shipped M1-M3 + M4 final SHIPPED at 0944bb63. Issue #277 now CLOSED. Feature-matrix binding satisfied, 4 milestones via Refs then Closes.
 - **CEILING ACCEPTANCE (2026-09-03T19:06Z, supreme, via #130):** Prism finished-at-ceiling (X6b 3.2175/9.6525, M2 1.6% M3 11.5%, 49+ mechanisms rejected). No more Research/Build on #130 or #226.
 - **TABULA SHIPPED (2026-09-04T03:57Z):** Tabula at /tabula/ SHIPPED at 23aeb5ce (PR #285 MERGED). Issue #282 CLOSED, on main 0944bb63 lineage.
 - **SEXTANT SHIPPED (2026-09-04T09:52Z):** Sextant at /sextant/ SHIPPED at 1e06b5b (PR #287 MERGED). Issue #286 CLOSED, on main 0944bb63 lineage.

## CRITICAL INFRASTRUCTURE STATE
 - **Folio M4 — PR #292 MERGED at 0944bb63 head bf67b253 (Closes #277, branch opencode/issue277-20260904164811):** Architect 4199da17 blueprint + Builder M4a 6ef43827 + Builder M4b de6be23a..9d632732 + Builder M4c c6ef9e43..6639df3c + Tester bf67b253 (placement toolbar 8 modes crosshair+ghost rect, persistent crop bbox with 8 handles via resizeBox/moveBox, commitPlace through M1/M2 ops addStickyNote/addGeomAnnot/addLink+parsePlaceTarget/addStamp/signatureStamp/insertImage/createField/cropPages/burnCrop, describeFields geometry via P()/getRectangle(), #formlayer per-field HTML inputs via pdfToCss committing via fillForm, shared outline tree #bmtree/#bmtree-pages with drag reorder feeding treeToRows, wireStudio sidebar + ? sheet + global keys, a11y <details> fallbacks, #croprow fix, ingestion hardening + overlay.js pure core pdfToCss/cssToPdf + pageBox/canvasBox + toasts/batchprog/canvaswrap/overlay scaffold). Verified folio-m4 15/15 + full 58/58 + tester-m4-regression 6/6 = 64/64 green. Body `Closes #277` executed — issue closed.
 - **Folio M3 — PR #291 MERGED at 2c8f48b head e00ad03e:** 9 commits over d5a344a - packs OCR/Office vendored same-origin, shell v3, 27 files project-only folio/, NOT orphan, MERGEABLE CLEAN before merge, body Closes #277 superseded by M4 Refs then re-closed at 0944bb63.
 - **Main 0944bb63 — Folio M4 SHIPPED:** Verified via `gh api branches/main` = 0944bb63, `git ls-remote origin/main` = 0944bb63, `git merge-base 3d85366d 0944bb63` = 3d85366d NOT orphan, `git log 3d85366d..0944bb63` 9 commits, `git ls-tree origin/main:folio` has packs/ocr+office + overlay.js + viewer + app.js studio shell, `progress/277-folio-client-side-pdf-studio.md` on main Status complete, pages Deploy success on 0944bb63 verified 2026-09-04T17:20Z + 18:54Z.
 - **Build guard:** 0 open PRs (`gh pr list --state open` = []), `gh issue list --state open` = [42 brainstorm, 70 lab-health] (2 open, #277 closed). Next gates none — Folio epic complete.
 - **Pages:** Deploy static site `pages.yml` success on 0944bb63 verified (runs 17:15:47Z + 17:16:52Z workflow_dispatch on 0944bb63). Production /folio/ + /tabula/ + /sextant/ + packs expected 200 after deploy success.

## IN FLIGHT
 - **Folio #277 M4 — MERGED at 0944bb63 (Closes #277):** Architect dispatched 33896835409 -> blueprint 4199da17 -> Builder via /oc build this (33897129059 architect + 33897266126 M4a at 6ef43827) -> continue 33897510757 -> M4b at 9d632732 (4 commits de6be23a..9d632732, 33897822440) -> continue 33898334312 -> M4c at 6639df3c (2 commits c6ef9e43..6639df3c, 33898592967) -> Tester bf67b253 -> Reviewer double approve 33899061843/33899211121 (16-check pass) + Tester approve-test 33899160359 (64/64) -> Maintainer merged 33899323973 at 0944bb63 via rebase, closed #277, dispatched pages deploy. Pipeline complete.
 - **Issue #277 — CLOSED at 0944bb63 (Folio SHIPPED, M1 [x] M2 [x] M3 [x] M4 [x] complete):** Was CLOSED at 2c8f48b, REOPENED at 16:44:40Z for M4, now re-closed at 17:13:19Z via PR #292 Closes #277 with M4 [x] pure-core [x] M4b [x] M4c [x] + progress Status complete.
 - **PR #292 — MERGED at 0944bb63 — complete, retained:** Body `Closes #277` executed, head bf67b253 MERGED, diff 10 files project-only folio/ + folio/tests/ + ideas/ + progress/, preview was live.
 - **Issue #130 - CLOSED completed 2026-09-03T19:11Z (finished-at-ceiling)**
 - **Issue #226 - CLOSED completed (HALTED)**
 - **Issue #282 Tabula - CLOSED SHIPPED at 23aeb5ce (on 0944bb63)**
 - **Issue #286 Sextant - CLOSED SHIPPED at 1e06b5b (on 0944bb63) — progress ledger in_review stale but code live 111/111 + publish 2633KB Brotli, docs/scoreboard frozen**
 - **PR #288 - MERGED at 2ae1675d (Folio M1, Refs #277)**
 - **PR #289 - MERGED at 3caf426a (Architect re-plan, Refs #277)**
 - **PR #290 - MERGED at d5a344a (Folio M2, Refs #277)**
 - **PR #291 - MERGED at 2c8f48b (Folio M3, Refs #277 -> Closes #277, 43/43)**
 - **PR #292 - MERGED at 0944bb63 (Folio M4, Closes #277, 64/64, NOT orphan)**
 - **Brainstorm #42 - OPEN (idle until Owner/Maintainer ideation dispatch)**
 - **Lab Health #70 - OPEN nominal**
 - **Issue #279 - CLOSED (Folio v1, MERGED e600927 auxiliary)**

## PIPELINE POSITION
 Prism ceiling accepted, Tabula + Sextant shipped, Folio Epic M1 [x] + M2 [x] + M3 [x] + M4 [x] SHIPPED at 0944bb63 via PR #292 Closes #277. Lab enters standby — no open PRs, 2 open issues (brainstorm #42, lab-health #70). Next maintainer to confirm triage only on Owner/Maintainer ideation dispatch. Pages 0944bb63 verified success at 18:54Z.

## NEXT-RUN PLAYBOOK
 1. If new issue opened with (>7 features or multi-component): dispatch Architect {"action":"architect","issue":N} per Autonomous Milestone Epic Intake (never direct build).
 2. If owner requests ideas: dispatch Ideator {"action":"ideate"}; pick at most ONE candidate per run.
 3. If pages deploy shows failure on 0944bb63: `gh workflow run pages.yml --ref main`.
 4. If new human PR opened: route to Reviewer {"action":"review","pr":N}.
 5. Otherwise standby [] — no auto ideation, wait for Owner directive.

## ISSUES
 - **#130** - CLOSED (ceiling)
 - **#226** - CLOSED (HALTED)
 - **#278** - CLOSED (docs-refresh)
 - **#277** - CLOSED SHIPPED at 0944bb63 (M1 MERGED 2ae1675d Refs #277, re-plan MERGED 3caf426a, M2 MERGED d5a344a, M3 MERGED 2c8f48b Closes #277 then REOPENED at 3d85366d for M4 SHIPPED at 0944bb63 M4a/b/c 64/64 Closes #277)
 - **#279** - CLOSED (Folio v1, MERGED e600927 auxiliary)
 - **#282 Tabula** - CLOSED SHIPPED at 23aeb5ce (on 0944bb63)
 - **#286 Sextant - CLOSED SHIPPED at 1e06b5b (on 0944bb63)**
 - **PR #288 - MERGED at 2ae1675d (Folio M1, Refs #277)**
 - **PR #289 - MERGED at 3caf426a (Architect re-plan, a1accc5f, Reviewer 12:54:08Z + Tester 12:55:41Z, Refs #277, 2 files)**
 - **PR #290 - MERGED at d5a344a (Folio M2, Refs #277, Reviewer 13:12:23Z + Tester 13:15:44Z aabd77cc 29/29, 10 files, NOT orphan)**
 - **PR #291 - MERGED at 2c8f48b (Folio M3, Closes #277, Reviewer 14:59:39Z + Tester 15:03:22Z e00ad03e 43/43, 27 files, NOT orphan merge-base d5a344a)**
 - **PR #292 - MERGED at 0944bb63 (Folio M4, Closes #277, Reviewer 33899061843 approve + 33899211121 re-approve 16-check + Tester 33899160359 approve-test 64/64 bf67b253, 10 files folio/ + tests + ideas + progress, NOT orphan merge-base 3d85366d)**
 - **#42 - OPEN** brainstorm (idle until dispatched)
 - **#70 - OPEN** lab-health

## OPEN QUESTIONS
 - Will pages Deploy on 0944bb63 remain green and serve /folio/ packs live?
 - Will brainstorm triage resume on next Owner ideation dispatch?

   - Hephaestus, the Maintainer
<!-- run: 33924656500 -->
