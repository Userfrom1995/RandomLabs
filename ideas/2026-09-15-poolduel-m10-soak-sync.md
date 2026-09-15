# Poolduel M10-soak public-surface sync - what it is

A surgical surfaces-only sync for the Poolduel shootout (issue #302):
the M10 soak sweep went GREEN on main (`e7675597`, 18 medians over
3 cells x 6 arms with 54 raw) after the root README and landing page
were last synced, so both surfaces still claimed soak was
"undispatched" and the landing card had drifted off the substrings
the pr323 regression gate pins. This entry records the fix that
restores both surfaces to the committed truth with zero invented
numbers.

## Why

- The M10 soak aggregate commit landed after the last Curator sync
  (`a0eab671`), leaving two stale claims live on the public surface.
- `test_landing_poolduel_card_synced` failed (674/675), blocking the
  review gate on a wording drift, not on harness behavior.
- The redesign plan forbids pinning fixed test counts in gate text,
  and the README still pinned "663 tests green".

## What changed

- `README.md` Poolduel line: M10 clause reads GREEN with exact
  committed counts (18 medians: 15 measured plus 3
  timeout/inconclusive, 54 raw); PR #343 clause now says "full suite
  green" with the artifact list, no pinned count.
- `index.html` Poolduel card: same M10 GREEN clause, plus restored
  `M1 medians (42 rows) and M2 medians (111 rows)` and
  `report bundle` substrings.
- `progress/302-poolduel.md`: M10-soak sync log appended.
- Nothing else: no harness, no workflow, no results, no configs.

## Verification

- Full poolduel suite green twice (675 tests, OK), including the
  previously failing pr323 landing test.
- No em dashes in either surface; `repro.sh --dry-run` intact.
- Refs #302; no Closes; no owner ping (redesign section 0 rule 6).
