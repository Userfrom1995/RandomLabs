# Progress - Fix README and website

Status: complete

- **Issue:** #62
- **Branch:** opencode/issue62-20260821163614
- **Status:** complete
- **Updated:** 2026-08-21T16:40:00Z

## Checklist
- [x] orient: read issue #62 + comments, README, index.html, obsidian/meridian docs for conventions
- [x] README.md: promote Obsidian to Current Project, move Meridian to top of Previous Ideas
- [x] index.html: promote Obsidian to the "Live now" card (meta description updated), move Meridian to top of Previous Projects
- [x] verify README and index.html agree (Obsidian Current, Meridian top Previous, then Kestrel/Halcyon/Glyphforge/Beambus in same order; GitHub corner link retained)
- [x] push, open PR with Closes #62

## Current step
Done. Obsidian is now the Current project on both the root README and the root landing page (with its Run it / Writeup / Documentation links and the "Live now" tag), Meridian sits at the top of Previous (newest first) in both files, and the two files now agree on ordering (Kestrel, Halcyon, Glyphforge, Beambus following). The landing page retains the top-right GitHub corner link. HTML validated (balanced tags). Handing off to the Reviewer.

## Next steps
(none - complete)

## Agent log
- 2026-08-15 (run 1): oriented. Read builder.md, AGENTS.md, issue #62 and its comments, root README.md, root index.html, docs/index.* and previous progress files for Glyphforge (57) and Beambus (55). Confirmed on main: README Current opens with Beambus, index.html Live now is Beambus, while Glyphforge sits as first Previous entry in both. Applied fix: README Current now leads with Glyphforge, Beambus moved to top of Previous, index.html Live now is Glyphforge, Beambus moved to top Previous, meta says "Currently hosting Glyphforge", and top-right GitHub corner link added. Validated HTML and marked complete.
- 2026-08-21 (run 2): re-oriented on maintainer re-route (Meridian/Obsidian promotion gap). Verified fresh on main (head 98d891d): README has zero Obsidian mentions, index.html still shows Meridian as Live now while also listing Obsidian in Previous. Root cause confirmed as orphan-root Obsidian merge without promotion step, causing README/index.html drift. Applied fix: README.md Current now Obsidian (YCoCg-R, 8-predictor bank, gradient+activity contexts, adaptive Golomb-Rice ENTROPY_GR, 53 tests, bit-exact, fuzz gate) with Run it / Full writeup / Documentation links; Meridian moved to top of Previous Ideas (newest first) with 21,226 checks / 126 tests and its 4 links. index.html: meta description now "Currently hosting Obsidian", Live now card is Obsidian (same copy + 3 links), Previous Projects first entry is Meridian (same copy + 4 links), Obsidian removed from Previous, ordering now Meridian, Kestrel, Halcyon, Glyphforge, Beambus in both files. Retained hero GitHub corner link and its CSS. Validated HTML tag balance and that both files agree. Branch opencode/issue62-20260821163614, ready for review.
