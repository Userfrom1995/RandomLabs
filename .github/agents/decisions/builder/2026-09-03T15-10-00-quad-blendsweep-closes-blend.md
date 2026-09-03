# Decision: quad blend sweep closes the per-image blend lever (Builder, 2026-09-03)

- Context: issue #130, branch `opencode/issue130-20260903144955`, resume mode.
  Mux lever closed by PR #270 (8-way real-only oracle 3.20325/9.60975 FAIL M2).
  Only unmeasured sub-question with real-byte feasibility in one run: per-image
  blend selection over the shipped MLP prior.
- Measurement: pinned quad x blend {0, 0.6, 1.0}, real wnet bytes, Release build
  from HEAD, corpus 24/24 SHA OK, gate self-check PASS, blend-0 bit-identical
  re-proof. Oracle = blend 0 on 4/4 images, gain 0.000%.
- Decision: no blend-mux encoder to build; blend lever CLOSED. Recommended (not
  executed): removal of `learned_ctx_data.inc` weights pending full-24
  blend-1.0 evidence; left to Maintainer/Reviewer.
- Consequences: `Refs #130` only. Standing owner question unchanged: accept the
  3.21843/9.65529 floor, authorize a fundamentally new architecture, or relax
  the gates. No success claim; both units stated everywhere.

- the Builder
