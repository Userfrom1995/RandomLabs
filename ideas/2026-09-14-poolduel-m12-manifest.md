# Poolduel M12: reproducibility manifest plus red-team pass (Refs #302)

Date: 2026-09-14. Branch: `opencode/issue302-20260914114556`.
Milestone: M12 (reproducibility package + red-team, plan sections 11 + 12).

## What was built

The tamper-evident seal over the committed evidence: anyone can now verify
that the published numbers derive from exactly the committed raw corpus,
with zero hand-typed values anywhere in the chain.

- `poolduel/harness/manifest.py` (new): deterministic manifest-hash build.
  Walks `results/m1|m2|m9/raw/*.json` in sorted order (never directory-scan
  order), sha256 per file, single build hash over `relpath + sha` lines.
  Output `results/manifest.json`: build hash
  `4c1bc70...46`, 2239 files (m1 150, m2 319, m9 1770), 5.67 MB vs 500 MB
  budget, all 10 derived-bundle SHAs, sweep-workflow pins (read-only;
  workflows stay Lab scope), corpus policy (raw JSON in git, stdout/stderr
  workdirs as CI artifacts). `--verify` recomputes and fails loudly on any
  mismatch (edited/added/removed raw files change the hash). `--apply`
  splices the fragment into `MANIFEST:meta` markers on the reproducibility
  page (idempotent, rejects unmarked pages).
- `poolduel/docs/digests.md` (new): runner images + action pins with a
  refresh procedure (`manifest.json` wins on disagreement).
- `poolduel/docs/errata.md` (new): errata + verified-by ledger source;
  honestly empty today, drift-checked against the page tables.
- Wiring: `repro.sh --manifest` / `--manifest-verify`, `check.py`
  `check_manifest_coherence` (manifest recompute + page fragment + ledger
  sync + viewport-meta mobile gate), README repro docs, spec-v1 s6 M12 note.
- `poolduel/tests/test_m12_manifest.py` (15 tests): order-independence,
  tamper/add/remove sensitivity, sorted inventory, corpus counts, budget,
  bundle presence, workflow pins, committed-manifest match, fragment
  contents, apply idempotence + unmarked rejection, page markers + viewport,
  ledger sync, check green.

## Why

Plan section 11 requires a deterministic report build from a manifest hash,
pinned digests, corpus SHAs with a size budget, and trust machinery (plan
12.2: challenge flow, errata, verified-by). The reproducibility page already
carried the prose skeleton (runbook, recipe, BibTeX, challenge, empty-honest
tables); what was missing was the machine-checked seal tying the page to
the corpus. That gap is now closed.

## Verification

- Full suite 663 green, zero failures.
- `check.py` rc=0, `--manifest-verify` recompute matches committed hash.
- Page JS `node --check` clean (charts + ui).

## Known gap (not hidden, not claimed)

The M10 soak sweep is staged (`poolduel/ci/poolduel-m10-soak.yml`) but not
dispatched, so soak evidence plus memory-per-1000-idle stay honest absent.
The section-11 full gate (soak present, Tester repro, Tier-2 vision) is not
claimed green; this PR stays `Refs #302` with no `Closes` and no owner
notification (silence rule: notify once when publishable).

- the Builder
