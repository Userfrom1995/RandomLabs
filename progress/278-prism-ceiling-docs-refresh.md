# Progress: Prism ceiling docs refresh (issue #278)

- **Branch:** `opencode/issue278-20260903191653`
- **PR:** `Refs #278` (refs #130 for context; #130 itself is closed finished-at-ceiling)
- **Status:** complete (docs-only refresh shipped; no codec work)
- **Scope:** Owner accepted the Prism ceiling at `9bd6d10` on 2026-09-03T19:06Z
  on #130 as finished-at-ceiling. This issue tracks the docs/roster refresh
  only (directive step 3). No codec, workflow, or infra changes.

## Accepted ceiling (binding numbers, from #130 / owner directive)

- Production floor (X6b): 3.2175 per-sample / 9.6525 summed; fresh-binary
  repro 3.21843 / 9.65529.
- M2 (beat WebP): FAIL by ~1.6% (1.63%).
- M3 (beat JPEG XL): FAIL by ~11.5% (11.53%).
- Oracle bounds (unrealizable): 3.161 / 9.483; hybrid mux 3.2068;
  real-only 8-way 3.20325; per-subband mux 3.20664.
- M0 (bit-exact round-trip, fuzz + corruption rejection): DONE.
- 49+ mechanisms measured across 7+ programs; full negative ledger committed
  on main. Refs discipline holds: #130 closed finished-at-ceiling,
  never Closes-as-pass. Branches retained per #148; nothing deleted.

## Checklist

- [x] Orientation: branch/PR state, README/index/prism-docs audit, 404 link survey
- [x] `README.md`: Current Project rewritten (Prism finished-at-ceiling;
      no Helix-live / neural-1.93M claim), lab-docs link fixed to
      `RandomLabs`, ideas/progress refs fixed
- [x] `index.html`: meta description updated, Current card replaced
      (Helix-live stale), Helix moved to Previous, Prism entry updated with
      ceiling numbers, all `github.io/Random/` links fixed to `RandomLabs`
- [x] `prism/README.md`: milestones updated (M0 done, M2/M3 FAIL at ceiling,
      oracle numbers, 49+ mechanisms, #130 closure note)
- [x] `prism/docs/index.md`: closure note added
- [x] Verify: no orphan main, `pages.yml` preview infra untouched, branches
      retained, `git status` clean, decision file written

## Agent log

- 2026-09-03 (Builder): oriented on `opencode/issue278-20260903191653`
  (already the issue branch, at main `9bd6d10`). Surveyed 404s: every
  `userfrom1995.github.io/Random/*` Pages link in `index.html` + `README.md`
  is stale (repo is now `RandomLabs`, so the site serves under
  `.../RandomLabs/`). `README.md:47-54` still advertises Prism as an active
  neural 1.93M build; `index.html` still shows Helix as "Live now" and a
  Prism "Currently in review (PR #104)" entry. Rewriting all three roster
  surfaces plus `prism/README.md` milestones and `prism/docs/index.md`.
- 2026-09-03 (Builder): all edits applied and verified - 4 files modified
  (README.md, index.html, prism/README.md, prism/docs/index.md) + ideas entry
  + this progress file set complete. 17 Pages links fixed to `/RandomLabs/`,
  zero stale `github.io/Random/` remain. `pages.yml`/workflows untouched,
  merge-base with origin/main = 9bd6d10 (not orphan), 222 opencode branches
  retained on remote, model `muse-spark-1.3-contributor-free` free.
