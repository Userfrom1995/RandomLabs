# Stale landing tests updated to archived reality

A surgical test-maintenance fix: two landing regression suites
(`tests/landing/test_pr410_meta_prism.py`, `tests/landing/test_pr412_project_sites.py`)
still asserted the September fleet (Folio, Tabula, Sextant live; Prism with
exactly one landing mention), while the shipped `index.html` had moved on -
Terminal Browser graduated to Previous Projects, Sextant archived via #548,
and Prism/Folio/Tabula preserved under `archive/`. The suites failed 4/5 and
3-failures-plus-8-errors respectively, rotting the suite (neither file is
wired into any workflow, so no pipeline break).

## What changed

- `tests/landing/test_pr410_meta_prism.py`: asserts the current live fleet
  (Terminal Browser, Desktop Pet, Netpulse, Thunderline, Mythduel,
  Hearthlight, Doom, Umbra, Poolduel, torshim) in the meta description,
  asserts archived names (Folio, Tabula, Sextant, Prism) are absent from the
  meta, asserts Prism no longer appears on the landing page at all, and keeps
  the parse-clean / no-em-dash / serve-over-HTTP checks against reality.
- `tests/landing/test_pr412_project_sites.py`: tor-cli remains the live
  project site under test; Prism is verified at its archived home
  (`archive/prism/index.html`, 4 copy blocks) alongside tor-cli (10 copy
  blocks); landing/README assertions check the tor-cli site link is present
  and the live Prism site link is gone; the bench-vs-codecs assertion reads
  `archive/prism/benchmarks/bench_vs_codecs.py` (which already points
  `sys.path` at `archive/obsidian`); a new assertion pins
  `archive/README.md` as Prism's catalog entry.

## Why update instead of remove

Both suites still guard real invariants (meta accuracy, parse cleanliness,
anchor/copy-block integrity, offline-safe pages, every-relative-link-serves).
Deleting them would lose that coverage; re-pointing them at archived reality
keeps the coverage honest.

## Key files

- `tests/landing/test_pr410_meta_prism.py`
- `tests/landing/test_pr412_project_sites.py`
- `progress/T-549-stale-landing-tests.md`

## Notes

- Stdlib only (`html.parser` + `urllib`), no new dependencies.
- Verified green locally before handoff; triple-clear (both files plus a
  full landing-test pass) qualifies this single-fix task for `Closes #549`.
