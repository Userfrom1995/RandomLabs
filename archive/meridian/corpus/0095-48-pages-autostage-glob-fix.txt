# Progress — pages.yml auto-stage glob fix

- **Issue:** #48
- **Branch:** opencode/issue48-20260813185239
- **Status:** complete
- **Updated:** 2026-08-13T19:30:00Z

## Checklist
- [x] reproduce the `[: too many arguments` failure locally
- [x] confirm root cause: unquoted glob `.*` in `[ ! "$dir" == .* ]` expands to
      the runner's dotfiles → the `&&` chain fails for every dir → nothing staged
- [x] fix verified on main via owner commit `b3b0a67` (both occurrences)
- [x] validate the merged fix locally (stage loop + preview loop)
- [x] confirm live deploy (run 31733163415, artifact 72.5 KB) serves the web apps
- [x] progress file + resolution note; branch pushed

## Resolution

The bug and its fix for issue #48 landed on `main` first via the owner's
direct commit `b3b0a67` "chore: ban em dashes globally and fix pages
deployment loop" (pushed 2026-08-13 18:54Z), which ran while this build was
being re-dispatched. The commit fixes **both** occurrences, using a
different-but-equivalent approach than the issue's suggestion:

- "Stage site" loop (line ~58): the `[ ! "$dir" == .* ]` check was **removed**
  entirely. Safe: `for dir in */` never produces dotfile matches (bash does
  not glob hidden entries without `dotglob`), so the hidden-dir guard was
  redundant. Verified locally: stages cadence/orrery/rush/shaftcast, skips
  docs/_site/preview.
- "Stage PR previews" loop (line ~106): `[ ! "$dir" == .* ]` → `[[ ! "$dir" == .* ]]`.
  Inside `[[ ]]` the RHS is a pattern, not a pathname expansion, so no
  "too many arguments"; verified locally: stages cadence/orrery/rush/shaftcast,
  skips .github.

No code change is needed from this build: pushing a duplicate of the already
merged fix would only conflict with main. This PR carries the progress file
and closes the issue through the normal review/merge loop.

## Verification

- Deploy on `b3b0a67` (run 31733163415) succeeded; artifact size 6.9 KB → 72.5 KB.
- Live: `/` 200, `/docs/` 200, `/orrery/` 200, `/rush/` 200.
- `/cadence/` and `/shaftcast/` are terminal apps (no `index.html`, no `docs/`)
  so the auto-stage loop correctly has nothing to serve for them — 404 is
  expected, not a regression.

## Next steps
- None — awaiting the Reviewer (factory change → reviewed extra hard).

## Agent log
- 2026-08-13 (build run 2) — reproduced the `[: too many arguments` bug
  locally (3+ dotfiles present → every dir skipped; fixed form stages only
  non-hidden dirs). Applied the issue's fix to both occurrences, then found
  `main` had moved: owner commit `b3b0a67` already merged an equivalent,
  correct fix for both occurrences and deployed it. Rebased onto `b3b0a67`,
  dropped the conflicting duplicate, validated the merged fix locally, and
  confirmed the live deploy serves the web apps. Marked Status: complete.
