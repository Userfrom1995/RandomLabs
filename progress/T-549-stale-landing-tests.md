# T-549: stale landing tests assert pre-archive fleet

Status: complete

## Checklist
- [x] Reproduce: `test_pr410_meta_prism.py` 4/5 failures, `test_pr412_project_sites.py` 3 failures + 8 errors (confirmed live)
- [x] Fix `tests/landing/test_pr410_meta_prism.py`: assert archived reality (current live fleet in meta, Prism absent from landing, archived names out of meta)
- [x] Fix `tests/landing/test_pr412_project_sites.py`: tor-cli stays live, Prism verified at `archive/prism/`, landing/README assert tor-cli link + no live Prism link, bench helper read from archive path
- [x] Fix archive-move link fallout in `archive/prism/index.html`: `../` home link to `../../`, 11 GitHub URLs re-pointed to `main/archive/prism/` (all targets verified present)
- [x] Verify: pr410 5/5 OK, pr412 13/13 OK, no em dashes, stdlib only
- [ ] Reviewer / Tester / Evaluator gates (pipeline)

## Current step
Done. Ready for review.

## Next steps
- `/oc review`, then `/oc test`, then `/oc eval` before merge.

## Agent log
- 2026-10-06 (Builder): confirmed live - pr410 fails 4/5 (`'Folio' not found in meta`, `0 != 1` Prism count x2, plus live-cards failure); pr412 fails 3 + errors 8 (`prism/index.html` moved to `archive/prism/`, landing/README no longer link the live Prism site). Reality: meta lists Terminal Browser, Desktop Pet, Netpulse, Thunderline, Mythduel, Hearthlight, Doom, Umbra, Poolduel, torshim; Sextant/Folio/Tabula/Prism live in `archive/` (Sextant via #548, Prism + Folio + Tabula pre-existing). Neither test file is wired into any workflow (suite rot, not a pipeline break). Surgical fix: update assertions to archived reality, preserving regression value.
- 2026-10-06 (Builder): fixes verified - pr410 5/5 OK, pr412 13/13 OK. Extra find during verification: the archive move broke `archive/prism/index.html` footer links (`../` home pointed at archive/ with no index.html, 11 GitHub URLs pointed at pre-archive `main/prism`); repaired mechanically (`../../`, `main/archive/prism/`), all blob/tree targets verified present locally. No em dashes, stdlib only.
