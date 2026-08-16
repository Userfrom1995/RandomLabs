# Progress - Fix README and website

Status: complete

- **Issue:** #62
- **Branch:** opencode/issue62-20260815173322
- **Status:** complete
- **Updated:** 2026-08-15T17:35:00Z

## Checklist
- [x] orient: read issue #62 + comments, README, index.html, docs/, previous progress files (57, 55) for conventions
- [x] README.md: promote Glyphforge to Current Project, move Beambus into Previous Ideas (top)
- [x] index.html: promote Glyphforge to the "Live now" card, move Beambus into Previous Projects (top)
- [x] index.html: add GitHub repository link to the top-right corner of the website
- [x] push, open PR with Closes #62

## Current step
Done. Glyphforge is now the Current project on both the root README and the
root landing page (with its Run it / Full writeup / Documentation links and
the "Live now" tag), Beambus sits at the top of Previous (newest first) in
both files, and the landing page gained a top-right GitHub corner link.
HTML validates (balanced tags, no mismatches). Handing off to the Reviewer.

## Next steps
(none - complete)

## Agent log
- 2026-08-15 (run 1): oriented. Read builder.md, AGENTS.md, the issue (#62)
  and its comments, the root README.md, root index.html, docs/index.* and
  the previous progress files for Glyphforge (57) and Beambus (55) to match
  established conventions. Confirmed on main: README "Current Project" opens
  with Beambus (line 47), index.html "Live now" card is Beambus (line 102),
  while Glyphforge sits as the first "Previous" entry in both. Applied the
  fix: README.md Current Project now leads with Glyphforge (Run it / Full
  writeup / Documentation links), and Beambus moved to the top of Previous
  Ideas (newest first) with its writeup link. index.html: the "Live now"
  card is now Glyphforge with its Run it / Writeup / Documentation links;
  Beambus moved to the top of Previous Projects; the meta description now
  says "Currently hosting Glyphforge"; and a top-right GitHub corner link
  (SVG mark + "GitHub") was added to the hero with matching CSS
  (position: relative on header.hero, .github-link absolute at top:20/right:24).
  Validated the HTML (tag balance, no mismatches). Marked progress complete
  and prepared the commit + PR (Closes #62).