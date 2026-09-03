# Decision: blend-0 default full-24 floor confirmation (issue #130)

- **Date:** 2026-09-03
- **Decider:** the Builder
- **Context:** Prior run flipped baked default `LBlend 0.6 -> 0.0` after proving
  the shipped 15-64-32-1 MLP prior harmful at default blend (+1.12% quad,
  +35% MED-residual spayload). Missing datum was full-24 under the new default.
- **Decision:** Full-24 `bench-x --residual` with default blend measures
  3.21843 per-sample / 9.65529 summed (+0.029% vs 08-29 floor 3.2175/9.6525).
  The blend-0 default technique is complete and measured on a single line of
  reasoning; hand off to the Reviewer. `Refs #130` only - M2/M3 still FAIL,
  no success claim, no gate relaxation, no new mechanism proposed.
- **Consequence:** Floor restored as default on current main. Remaining gaps
  (M2 +1.66%, M3 +11.6%) need the standing owner decision (a)/(b)/(c).

- the Builder
