# Progress: Aftershock

- **Issue:** #53
- **Branch:** opencode/53-aftershock-seismic-simulator
- **Status:** complete
- **Updated:** 2026-08-14T14:50:00Z

## Checklist
- [x] scaffold cargo project + progress file + push + early PR (#54)
- [x] core physics: moment, Wells & Coppersmith rupture scaling, travel times, attenuation
- [x] fault grid model: epicenter, rupture rectangle (strike), station placement
- [x] waveform synthesis: P/S/surface Ricker wavelets + seeded noise
- [x] terminal seismogram rendering with P/S/R arrival markers
- [x] CSV export (wide + long)
- [x] CLI dispatch: simulate / stations / export / check / help / version, full validation
- [x] unit + integration tests, cargo build/test/clippy clean
- [x] README + docs/ (index.md + index.html) + ideas/ entry + landing page update
- [x] final push, Status: complete, PR with Closes #53

## Current step
Build complete. Aftershock 1.0.0 is done: fault-grid earthquake model with
Wells & Coppersmith rupture scaling, P/S/surface propagation with correct
travel times (P-S gap linear in distance), ASCII seismograms with arrival
markers, wide/long CSV export, a hand-rolled dependency-free CLI, 13 built-in
self-checks, and 41 tests. Ready for review.

## Next steps
None. Awaiting review; respond to `/oc fix` findings if any.

## Agent log
- 2026-08-14 (run 1, orientation + scaffold): read builder.md, AGENTS.md,
  FACTORY.md, README, gambit (structure, Makefile, docs layout, ideas file),
  root index.html, and progress/51 conventions. Confirmed no remote PR for
  #53; the local stub branch opencode/issue53-20260814135413 was empty and
  was replaced by opencode/53-aftershock-seismic-simulator at origin/main.
  Designed the module layout (lib.rs + main.rs, rng/physics/model/waveform/
  render/export/cli) and wrote the progress file.
- 2026-08-14 (run 1, core): implemented rng.rs (xorshift64* + SplitMix64 seed
  scramble), physics.rs (Hanks & Kanamori moment, Wells & Coppersmith length/
  width regressions, travel times, P-S gap, 1/d attenuation), and model.rs
  (FaultGrid with strike-rotated rupture rectangle, station placement on
  distinct cells in a distance annulus, arrivals and amplitudes). Fixed a
  GridConfig-vs-grid index bug caught at first build.
- 2026-08-14 (run 1, synthesis + rendering + export): waveform.rs (Ricker
  wavelets for P/S/surface phases plus seeded noise), render.rs (ASCII
  seismograms with P/S/R markers on the zero axis and a time ruler), export.rs
  (wide + long CSV). Debugged a transposed row/column bug in the plot loop
  that drew a vertical line for every trace; the fix maps each time column to
  its amplitude row explicitly and is covered by a render test.
- 2026-08-14 (run 1, CLI): cli.rs with hand-rolled argv parsing (no crates),
  full validation, deterministic seeding, simulate/stations/export/check/help/
  version dispatch, and the 13-check battery. Refactored place_stations into a
  SourceParams struct to satisfy clippy. cargo test (41), cargo clippy (0
  warnings), and cargo fmt all clean.
- 2026-08-14 (run 1, finalize): wrote aftershock/README.md, docs/index.md +
  index.html (no em dashes), ideas/2026-08-14-aftershock-seismic-network-
  simulator.md, promoted Aftershock to current project on the landing page and
  moved Gambit to Previous Projects. Smoke-tested simulate/stations/export/
  check/help/version, edge cases (corner epicenter, station over-subscription
  warning, duration override), and verified seed determinism. Progress flipped
  to complete.