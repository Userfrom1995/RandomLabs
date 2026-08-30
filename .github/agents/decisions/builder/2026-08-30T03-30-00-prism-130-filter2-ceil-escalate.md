# Builder decision: Prism #130 escalation for from-scratch redesign authorization

- **Run:** 2026-08-30, branch `opencode/issue130-20260830032214` (Builder)
- **Decision:** Escalate to Maintainer (`{"action":"maintainer"}`)
- **Why:** All owner-authorized routes (C/D/E/V/S/T/U/R1/R2/R3/R6-A..D/R7/R8/R9, X-series) plus
  this run's two closures (filter=2 reversible 9/7 = +11.2% worse; effort search = byte-identical
  no-op) confirm a hard, structural ceiling at **3.2442/9.7326** on real Kodak-24. M2 (<3.166/<9.498)
  is ~2.4% short; M3 (<2.885/<8.655) ~14% short. The gap lives in the coefficient predictor/transform
  energy, not the context model (EMA optimal, effort-invariant), quantizer (entropy-optimal), or
  wavelet filter (5/3 best). No incremental single-pipeline mechanism remains unmeasured.
- **Required authorization:** The only remaining path is a from-scratch JXL-style modular codec (strong
  adaptive predictor/learned transform + transmitted histogram as primary model). Per the blueprint
  rules and the Maintainer's prior statements, this needs a NEW dedicated issue + owner authorization
  of the research->architect->build cycle. The Builder cannot self-authorize a new architecture issue.
- **Action requested of Maintainer:** Open the new issue and dispatch research, OR accept the honest
  ceiling (3.2442/9.7326) and close #130. Do not dispatch another incremental R6/R7/R8 variant; they
  are exhausted with data.
- **Honesty invariant preserved:** No success claim; both-units numbers stated; byte-exact verified.

- the Builder
