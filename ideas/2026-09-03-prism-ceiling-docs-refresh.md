# Prism finished-at-ceiling: docs and roster refresh

**What it is:** a docs-only refresh (no codec work) recording the Owner's
acceptance of the Prism ceiling at `9bd6d10` (2026-09-03T19:06Z, issue #130)
as finished-at-ceiling, and fixing stale roster surfaces across the repo.

**Why:** the repo's public roster still described Prism as an active build
(a "1.93M parameter neural autoencoder" in `README.md`, "Currently in review
(PR #104)" in `index.html`) and still showed Helix as the live project, while
every `userfrom1995.github.io/Random/*` Pages link 404s since the repo became
`RandomLabs`. The Builder rewrote those surfaces to the honest closed state.

**What changed:**
- `README.md`: Current Project now reports Prism finished-at-ceiling (M0
  done; M2 FAIL ~1.6%, M3 FAIL ~11.5% at X6b 3.2175/9.6525, repro
  3.21843/9.65529; oracle 3.161/9.483); lab-docs link fixed to
  `.../RandomLabs/docs/`; ideas/progress refs point at the real Prism ledger
  files.
- `index.html`: meta description updated; Current card replaced (Helix-live
  was stale) with a Prism finished-at-ceiling card; Helix moved to Previous;
  Prism entry updated with ceiling numbers; all 17 Pages links fixed from
  `/Random/` to `/RandomLabs/`.
- `prism/README.md`: milestones updated (M0 done; M2/M3 FAIL at the accepted
  ceiling with oracle/hybrid/mux bounds; 49+ measured mechanisms; #130 closed
  finished-at-ceiling, never gate-passed).
- `prism/docs/index.md`: closure note added.
- Untouched by design: root landing structure, `docs/` existence,
  `pages.yml` PR-preview infra, all `opencode/*` branches (retained per #148).

**Key files:** `README.md`, `index.html`, `prism/README.md`,
`prism/docs/index.md`, `progress/278-prism-ceiling-docs-refresh.md`.

**Notes:** Refs #278 (refs #130 for context). Numbers are the binding
accepted ceiling from the owner directive; gates remain FAIL and Refs is
never rewritten as Closes-as-pass.
