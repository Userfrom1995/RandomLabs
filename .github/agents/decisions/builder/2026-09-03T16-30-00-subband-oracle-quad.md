# Decision: subband oracle scope (issue #130, quad run 2026-09-03)

- **Oracle definition:** per (image, plane, subband) min stream bytes over the
  candidate set, plus per-image min header (all 623 B on quad, immaterial).
  Selection-flag cost (~12 B/image) excluded from the CSV and stated as a
  pre-mux bound, consistent with the 2-way/8-way whole-image oracle precedent.
- **P1 (r9tree) dropped from full-24:** quad-marginal 0.057pp at full
  residual-encode cost (~2.5 min/image). Dominated, documented, not deleted:
  its quad CSV is committed for the ledger.
- **State-mismatch caveat recorded:** subband streams are coded in one
  adaptive walk, so per-subband bytes embed same-path predecessor state. The
  oracle is therefore mildly optimistic as an achievability claim and strictly
  conservative as a FAIL verdict (a real mux can only do worse). Either
  direction is honest under the stated caveat.
- **Shard plan pinned:** A kodim01-08, B kodim09-16, C kodim17-24, each x
  {P0 residual blend-0, P2 direct blend-0}, `bench-subband` commands only, no
  further code changes expected. Aggregation + gate eval in the run after C.
- **No success claim:** quad 0.449% is diagnostic; gates bind full-24 only.

- the Builder
