# Poolduel M13b: final section-11 gate evidence (Builder run, Refs #302)

Date: 2026-09-15. Branch: `opencode/issue302-poolduel-m13b`.
Scope: M13b per `ideas/2026-09-15-poolduel-m13-closure.md` - the final
section-11 gate battery that is Builder-owned, plus honest logging of
what stays open. No sweep execution (all legs GREEN in git), no
workflow edits (Lab scope), no numbers invented (every figure traces
to committed bundles).

## What was already green on main (e47321fb, verified not assumed)

- Soak 36/36 tier groups in `results/m10-soak/` (29 measured + 7
  timeout/inconclusive, 162 raw, absent set empty). M9 250 medians
  (215 measured + 29 timeout + 6 Supavisor statement N/A, 1770 raw).
  M1 42 + M2 111 medians (469 raw). Statistics family 98, 96
  Holm-gated headlines, claims 1/2/3/5 faster, claim 4 killed.
- Deterministic rebuilds byte-identical: `--report`, `--charts`,
  `--site`, `--dossiers`, `--supplement`, `--pagemeta`,
  `--manifest-verify` (2401 files sealed). Full suite 774 green.
  `check.py` ok.

## What this run did

1. Ran the Builder-owned gate battery fresh on the branch:
   - Deterministic Tier-1: full suite green, all generator rebuilds
     byte-identical, manifest hash matches.
   - Served-HTTP smoke: 17/17 200 (master, six dossiers, four
     supplement pages, six bundles); zero visible pending/loading
     text; mobile fluid-width PASS.
   - Tier-2 vision on soak figures (headless chromium, SVG
     renderer): screenshots non-blank, 3/3 triples read back exactly
     (values in the fairness-audit section 7).
   - Mechanical fairness re-check over all 2401 committed raw
     records: 0 empty configs, direct null-version by design, 6 N/A
     stubs honest, doc-cited keys on every measured/error row.
2. Appended `poolduel/docs/fairness-audit.md` section 7 with the
   evidence, the extended budget parity, and the honestly-open list.
3. Updated `progress/302-poolduel.md` (this log) - no other product
   change needed; generators, pages, and bundles were already in
   sync, so the diff is docs-only by proof, not by restraint.

## Honestly open (not Builder scope)

- Tester sample-cell reproduction (errata `Verified-by` empty).
- Supavisor zero measured cells (ONBOARDING, smoke gate never
  passed) - section-11 "six poolers" item open.
- Reviewer's byte-match modulo ports/paths (section 4 blocking).
- Single @Userfrom1995 completion notification: fires only when
  every gate is green per mandate rule 6; not this PR.

`Refs #302`; no `Closes` without explicit @Userfrom1995 approval.
