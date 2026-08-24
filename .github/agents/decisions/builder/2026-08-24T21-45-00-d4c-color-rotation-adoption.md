# D4c scope, adoption design, and the kodim18 never-expand lesson

- **Role:** the Builder
- **Date:** 2026-08-24
- **Context:** re-scope section D4 item 3 (reversible color rotations), the
  last lever of the D4 stretch directed by Mae's dispatch. Offline validation
  per spec section 13 (gates pre-registered before measurement).

## Decisions and their evidence

1. **Candidate family = shipped-butterfly role permutations + one LOCO/CALIC
   mode (spec 13.1).** Plane permutations are excluded by construction (planes
   code independently; a permutation cannot change bytes). Six butterfly role
   assignments plus `loco` were implemented as pure library functions
   (`colorrot`, BD8 RGB only) with dense stratified bijection tests.

2. **Offline verdict (durable CSV
   `benchmarks/results/2026-08-24-ideal-color-d4c.csv`):** CR-fmt PASS for
   loco (-4.3582 pct aggregate v2 over kodim01/13/05/20), rct-gbr/rct-rbg
   (-2.42), rct-grb/rct-brg (-0.69); FAIL for rct-bgr (+0.0001 aggregate,
   3/4 images above baseline) - bgr is excluded everywhere. CR-anchor proved
   med@ycocgr byte-identical to the shipped baseline. An INDEPENDENT
   cross-check (separate python implementation, order-0 adaptive cost model)
   confirmed the direction on all four images (kodim20 -9.96, kodim13 -1.38,
   kodim01 -1.01, kodim05 -0.91 pct).

3. **Adoption scope: five candidates (loco, grb, gbr, brg, rbg) behind
   container ids 7..11.** Full-byte header field already existed, so signaling
   costs zero bytes. Rotations are CFL-excluded like the YCoCg family: the
   offline A-B that earned eligibility measured base transforms alone, so
   production adopts exactly what was measured, nothing stacked on top.
   Unknown color_transform_id is now a hard decode error (invariant I2
   discipline; previously a silent identity fallthrough - latent bug closed).
   `plane_bd_max` treats rotation chroma planes like YCoCg's (1023 window).

4. **THE LESSON - single-list trial regressed kodim18 +0.25 percent.** The
   first wiring put all candidates in one prune/final trial (metric: MED flat
   bits). Corpus result: 23 wins / 1 regression (+1477 B kodim18). Two root
   causes, both invisible to the bare-MED metric: (a) at effort >= 2 the
   anchor could carry CFL scales the candidate side was denied; (b) each
   raster's best predictor-bank pick differs, so MED-flat ranking diverges
   from final-artifact size. A second attempt anchoring the legacy winner
   inside choose_color_transform_trial still regressed identically, proving
   the metric (not the finalist structure) was the defect.

5. **Final design: stage 2 moved to the END of analyze(), competing against
   the anchor's PRODUCTION flat cost.** `choose_color_transform_trial` is
   restored to its exact pre-D4c legacy behavior (its tests pin this). After
   the legacy plan's CFL scales and predictor-bank pick exist, analyze()
   trials the five rotations under that decided predictor: prune on the
   decimated grid, top-3 to full resolution, adoption ONLY on a strict win
   vs the anchor's production-flat cost (ties keep the anchor). On adoption,
   CFL scales zero out and the predictor trial re-runs on the new raster.
   Measured outcome: 22 wins / 2 ties / ZERO regressions at e1, e3 AND e7;
   net corpus delta -1.646 / -1.469 / -1.469 percent bytes.

## Result

Fresh dual-unit truth after adoption: e1 = 10.1210 summed / 3.3737 per-sample
bpp; e3 = e7 = 10.1350 / 3.3783. M2 (< 9.498 / < 3.166) and M3 (< 8.655 /
< 2.885) still FAIL in both units - honestly expected: the whole D4 stretch
moves the corpus ~1.5-1.7 percent while M3 needs another -14.5 percent from
the new baseline. The squeeze-under-mixer re-test (D4 item 4) stays shut: its
precondition was new collection evidence from an ADOPTED mixer, and the mixer
was rejected offline in D2/D4b, so no operative configuration exists to test.

The owner decision point (re-scope section 1) now stands with the complete
D-series evidence: every charted lever is either adopted-and-measured or
rejected-by-measurement, and parity remains ~17 percent away.

- the Builder
